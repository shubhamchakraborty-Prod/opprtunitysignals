// Captures one screenshot per page into docs/screenshots (run: npm run screenshots).
// Uses the API server with the real seed (memory store, nothing persisted).
// Map tiles are blocked so the schematic fallback is shown deterministically.
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { startServer, launch, newPage, signIn, ROOT } from '../test/e2e/harness.mjs';

const out = join(ROOT, 'docs/screenshots');
mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(join(out, f));
const srv = await startServer();
const shot = async (page, name, full = true) => {
  await page.evaluate(() => {
    document.querySelector('#toast')?.classList.add('hide');
    if (!document.getElementById('shotcss')) document.head.insertAdjacentHTML('beforeend', '<style id="shotcss">.appbar,.sidenav{position:relative!important;top:0!important}body::before{display:none}</style>');
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(out, name + '.png'), fullPage: full });
};
const go = async (page, view, tab) => { await page.click(`.vbtn[data-view=${view}]`); if (tab) await page.click(`#navLinks .tab[data-tab=${tab}]`); await page.waitForTimeout(500); };
const browser = await launch();
try {
  const page = await newPage(browser);
  await page.goto(srv.url + '/');
  await page.waitForSelector('.door');
  await shot(page, '00-home');
  await go(page, 'industry', 'discover');
  await page.waitForTimeout(6000);
  await shot(page, '01-jobs-map');
  await page.locator('#jobCards .job', { hasText: 'Production Engineer' }).click();
  await page.waitForTimeout(400);
  await shot(page, '01b-job-detail', false);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const pages = [
    ['learners', 'path', '02-where-to-apply'], ['learners', 'learn', '03-close-my-skill-gaps'], ['learners', 'match', '04-match-a-learner'],
    ['institution', 'trades', '05-iti-trades-and-skill-gaps'], ['institution', 'plan', '06-next-steps'], ['institution', 'institutes', '07-institutes-nearby'],
    ['industry', 'market', '08-market-overview'], ['industry', 'compare', '09-compare-62-and-63'], ['industry', 'upcoming', '10-coming-up'],
    ['industry', 'regions', '11-kalyani-and-siliguri'], ['industry', 'feeds', '12-government-data'], ['institution', 'voice', '14-workers-views'], ['industry', 'evidence', '15-sources'],
  ];
  for (const [view, t, name] of pages) {
    await go(page, view, t);
    if (t === 'trades') { await page.click('[data-action=trade-open][data-trade="Electrician"]'); await page.waitForTimeout(200); }
    if (t === 'regions') { await page.click('#regionSketch .fpin >> nth=0'); await page.waitForTimeout(200); }
    if (t === 'feeds') { await page.waitForTimeout(5500); await page.click('#simToggle'); }
    await shot(page, name);
  }
  await signIn(page, 'dev-admin-token');
  for (const [view, t, name] of [['internal', 'signals', '13-market-signals'], ['internal', 'review', '16-review-queue'], ['internal', 'verify', '17-record-employer-call']]) {
    await go(page, view, t);
    await shot(page, name);
  }
  console.log('Screenshots written to docs/screenshots');
} finally {
  await browser.close();
  srv.stop();
}
