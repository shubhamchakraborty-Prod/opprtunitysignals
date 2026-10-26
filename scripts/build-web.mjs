// Builds the web app into dist/:
//   dist/index.html             served by the API server (strict CSP, linked assets)
//   dist/explorer-offline.html  single self-contained file (works from disk, no server)
//   dist/vendor/maplibre/       bundled MapLibre GL (OpenFreeMap tiles still need internet)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSeed } from '../src/server/seed.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'assets'), { recursive: true });

const res = await build({ entryPoints: [join(root, 'web/src/main.js')], bundle: true, supported: { 'top-level-await': false }, format: 'iife', target: 'es2020', minify: true, write: false, legalComments: 'none' });
const js = res.outputFiles[0].text;
const css = readFileSync(join(root, 'web/styles.css'), 'utf8');
const logo = readFileSync(join(root, 'web/assets/convegenius-logo.png'));
const seed = loadSeed();
// Government feeds: embed the last saved snapshot, or the registry status with no fetches yet.
{
  const snapFile = join(root, 'data/gov/snapshot.json');
  if (existsSync(snapFile)) seed.gov = JSON.parse(readFileSync(snapFile, 'utf8'));
  else {
    const { govStatus, loadRegistry } = await import('../src/server/gov/sync.js');
    const { MemoryStore } = await import('../src/core/store-memory.js');
    seed.gov = await govStatus(new MemoryStore({}), loadRegistry(), { env: {} });
  }
}
const seedJson = JSON.stringify(seed).replace(/</g, '\\u003c');
const { ICONS, ART } = await import('../web/src/art.generated.js');
const tpl = readFileSync(join(root, 'web/index.html'), 'utf8')
  .replace(/<!--ICON:([\w-]+)-->/g, (_, n) => ICONS[n] || '')
  .replace(/<!--ART:([\w-]+)-->/g, (_, n) => ART[n] || '');
// Fonts (Google Sans Flex and Google Sans Code, OFL) ship with the app so it works offline.
const FONTS = {
  'google-sans-flex.woff2': 'node_modules/@fontsource-variable/google-sans-flex/files/google-sans-flex-latin-wght-normal.woff2',
  'google-sans-code.woff2': 'node_modules/@fontsource-variable/google-sans-code/files/google-sans-code-latin-wght-normal.woff2',
};
const inlineFonts = (text) => text.replace(/url\("fonts\/([\w-]+\.woff2)"\)/g, (_, f) => `url("data:font/woff2;base64,${readFileSync(join(root, FONTS[f])).toString('base64')}")`);
// Street map provider, chosen at build time (docs/MAPS.md). The key is visible to browsers: restrict it to your domain.
const mapConfig = `<script>window.__MAP_CONFIG__=${JSON.stringify({ provider: process.env.MAP_PROVIDER || 'openfreemap', key: process.env.MAP_API_KEY || '' }).replace(/</g, '\\u003c')};</script>`;

const fill = (styles, logoSrc, script) => tpl.replace('<!--STYLES-->', () => styles).replace('<!--LOGO-->', logoSrc).replace('<!--SEED-->', () => seedJson).replace('<!--SCRIPT-->', () => mapConfig + '\n' + script);
const cssInline = inlineFonts(css);
const showcaseCss = readFileSync(join(root, 'web/styles-showcase.css'), 'utf8');

writeFileSync(join(dist, 'app.js'), js);
writeFileSync(join(dist, 'styles.css'), css);
cpSync(join(root, 'web/assets/convegenius-logo.png'), join(dist, 'assets/convegenius-logo.png'));
writeFileSync(join(dist, 'index.html'), fill('<link rel="stylesheet" href="styles.css"/>', 'assets/convegenius-logo.png', '<script src="app.js"></script>'));
mkdirSync(join(dist, 'fonts'), { recursive: true });
for (const [name, src] of Object.entries(FONTS)) cpSync(join(root, src), join(dist, 'fonts', name));
writeFileSync(join(dist, 'explorer-offline.html'), fill(`<style>\n${cssInline}\n</style>`, 'data:image/png;base64,' + logo.toString('base64'), `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`));

// Primary leadership handover: a fully integrated-looking, fictional, offline product.
// The existing research pilot, assets, screenshots and older guided demo remain in dist.
writeFileSync(join(dist, 'platform-demo.html'), fill(
  '<style>\n' + cssInline + '\n' + showcaseCss + '\n</style>',
  'data:image/png;base64,' + logo.toString('base64'),
  '<script>window.__OPX_SHOWCASE__=true;</script>\n<script>\n' + js.replace(/<\/script/gi, '<\\/script') + '\n</script>'
));
// Artifact page for claude.ai: content only (the viewer adds the document skeleton), no street map (tiles are blocked there).
const artifact = fill(`<style>\n${cssInline}\n</style>`, 'data:image/png;base64,' + logo.toString('base64'), `<script>window.__NO_STREET_MAP__='The street map is not available in this viewer.';</script>\n<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`)
  .replace(/<!doctype html>\s*/i, '').replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*/i, '').replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '').replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '')
  .replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
writeFileSync(join(dist, 'artifact.html'), artifact);
mkdirSync(join(dist, 'vendor/maplibre'), { recursive: true });
for (const f of ['maplibre-gl.js', 'maplibre-gl.css', 'LICENSE.txt']) cpSync(join(root, 'node_modules/maplibre-gl/dist', f), join(dist, 'vendor/maplibre', f));
cpSync(join(root, 'data/templates'), join(dist, 'templates'), { recursive: true });
console.log(`Built dist/ (app.js ${(js.length / 1024).toFixed(0)} KB, offline file ${(readFileSync(join(dist, 'explorer-offline.html')).length / 1024).toFixed(0)} KB)`);
