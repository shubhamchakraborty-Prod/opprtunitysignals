// Builds the web app into dist/:
//   dist/index.html             served by the API server (strict CSP, linked assets)
//   dist/explorer-offline.html  single self-contained file (works from disk, no server)
//   dist/vendor/leaflet/        bundled map library (tiles still need internet)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSeed } from '../src/server/seed.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'assets'), { recursive: true });

const res = await build({ entryPoints: [join(root, 'web/src/main.js')], bundle: true, format: 'iife', target: 'es2020', minify: true, write: false, legalComments: 'none' });
const js = res.outputFiles[0].text;
const css = readFileSync(join(root, 'web/styles.css'), 'utf8');
const logo = readFileSync(join(root, 'web/assets/convegenius-logo.png'));
const seed = loadSeed();
const seedJson = JSON.stringify(seed).replace(/</g, '\\u003c');
const tpl = readFileSync(join(root, 'web/index.html'), 'utf8');

const fill = (styles, logoSrc, script) => tpl.replace('<!--STYLES-->', styles).replace('<!--LOGO-->', logoSrc).replace('<!--SEED-->', () => seedJson).replace('<!--SCRIPT-->', () => script);

writeFileSync(join(dist, 'app.js'), js);
writeFileSync(join(dist, 'styles.css'), css);
cpSync(join(root, 'web/assets/convegenius-logo.png'), join(dist, 'assets/convegenius-logo.png'));
writeFileSync(join(dist, 'index.html'), fill('<link rel="stylesheet" href="styles.css"/>', 'assets/convegenius-logo.png', '<script src="app.js"></script>'));
writeFileSync(join(dist, 'explorer-offline.html'), fill(`<style>\n${css}\n</style>`, 'data:image/png;base64,' + logo.toString('base64'), `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`));
// Artifact page for claude.ai: content only (the viewer adds the document skeleton), no street map (tiles are blocked there).
const artifact = fill(`<style>\n${css}\n</style>`, 'data:image/png;base64,' + logo.toString('base64'), `<script>window.__NO_STREET_MAP__='The street map is not available in this viewer.';</script>\n<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`)
  .replace(/<!doctype html>\s*/i, '').replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*/i, '').replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '').replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '')
  .replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
writeFileSync(join(dist, 'artifact.html'), artifact);
cpSync(join(root, 'node_modules/leaflet/dist'), join(dist, 'vendor/leaflet'), { recursive: true, filter: (s) => !s.endsWith('.map') && !s.includes('leaflet-src') });
cpSync(join(root, 'data/templates'), join(dist, 'templates'), { recursive: true });
console.log(`Built dist/ (app.js ${(js.length / 1024).toFixed(0)} KB, offline file ${(readFileSync(join(dist, 'explorer-offline.html')).length / 1024).toFixed(0)} KB)`);
