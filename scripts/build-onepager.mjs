// Renders docs/DEMO_ONE_PAGER.md into a printable A4 HTML page (docs/demo-one-pager.html)
// using the ConveGenius.AI logo and the app's palette. Minimal Markdown subset.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'docs/DEMO_ONE_PAGER.md'), 'utf8');
const logo = readFileSync(join(root, 'web/assets/convegenius-logo.png')).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const out = [];
const lines = md.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.startsWith('# ')) out.push(`<h1>${inline(l.slice(2))}</h1>`);
  else if (l.startsWith('## ')) out.push(`<h2>${inline(l.slice(3))}</h2>`);
  else if (l.startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
    i--;
    const cells = (r) => r.split('|').slice(1, -1).map((c) => c.trim());
    out.push(`<table><tr>${cells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join('')}</tr>${rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</table>`);
  } else if (/^\d+\. /.test(l)) {
    const items = [];
    while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ''));
    i--;
    out.push(`<ol>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</ol>`);
  } else if (l.trim()) out.push(`<p>${inline(l)}</p>`);
}

writeFileSync(join(root, 'docs/demo-one-pager.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Noida 62/63 Explorer: demonstration note</title>
<style>
@page{size:A4;margin:12mm}
:root{--ink:#192c40;--line:#dce3e6;--teal:#267a72}
body{font-family:Arial,"Helvetica Neue",sans-serif;color:var(--ink);font-size:10.5px;line-height:1.4;margin:0;background:#fff}
.page{max-width:186mm;margin:0 auto;padding:6mm 0}
header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--teal);padding-bottom:6px;margin-bottom:6px}
header img{width:150px}header span{font-size:9px;color:#5b6772;text-transform:uppercase;letter-spacing:.08em}
h1{font-size:17px;margin:6px 0 2px;letter-spacing:-.02em}h2{font-size:11.5px;margin:9px 0 3px;color:var(--teal);text-transform:uppercase;letter-spacing:.05em}
p{margin:3px 0}table{width:100%;border-collapse:collapse;margin:3px 0}th,td{border-bottom:1px solid var(--line);padding:3px 5px;text-align:left;vertical-align:top}th{background:#f3f7f7;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#51636d}
ol{margin:3px 0;padding-left:18px}li{margin:1px 0}
</style></head><body><div class="page"><header><img src="data:image/png;base64,${logo}" alt="ConveGenius.AI logo"/><span>Industry Opportunity Explorer · Noida two-sector pilot</span></header>
${out.join('\n')}</div></body></html>
`);
console.log('Wrote docs/demo-one-pager.html');
