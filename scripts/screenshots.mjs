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
    if (!document.getElementById('shotcss')) document.head.insertAdjacentHTML('beforeend', '<style id="shotcss">.appbar{position:relative!important;top:0!important}body::before{display:none}.live-toasts{display:none!important}</style>');
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(out, name + '.png'), fullPage: full });
};
const go = async (page, view, tab) => { await page.click(`.aud-tab[data-view=${view}]`); if (tab) await page.click(`#subTabs .tab[data-tab=${tab}]`); await page.waitForTimeout(500); };
const browser = await launch();
try {
  const page = await newPage(browser);
  await page.goto(srv.url + '/');
  await page.waitForSelector('.door');
  await shot(page, '00-home');
  const pages = [
    ['learners', 'lhome', '01-learners-for-you'], ['learners', 'path', '02-learners-where-to-apply'], ['learners', 'learn', '03-learners-skill-plan'], ['learners', 'discover', '04-learners-jobs-for-me'],
    ['institution', 'ihome', '05-institutions-overview'], ['institution', 'trades', '06-institutions-trades-and-programmes'], ['institution', 'plan', '07-institutions-placement-steps'], ['institution', 'institutes', '08-institutions-institutes-nearby'],
    ['institution', 'market', '09-institutions-market'], ['institution', 'compare', '10-institutions-compare-62-and-63'], ['institution', 'regions', '11-institutions-kalyani-and-siliguri'], ['institution', 'voice', '12-institutions-workers-views'],
    ['industry', 'talent', '13-industry-talent-near-you'], ['industry', 'hire', '14-industry-hire-for-a-role'], ['industry', 'apprentice', '15-industry-apprentices-and-interns'], ['industry', 'partner', '16-industry-request-candidates'],
  ];
  for (const [view, t, name] of pages) {
    await go(page, view, t);
    if (t === 'discover') {
      await page.waitForTimeout(5500);
      await shot(page, name);
      await page.locator('#jobCards .job', { hasText: 'Production Engineer' }).click();
      await page.waitForTimeout(400);
      await shot(page, '04b-job-detail', false);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      continue;
    }
    if (t === 'trades') { await page.click('[data-action=trade-open][data-trade="Electrician"]'); await page.waitForTimeout(200); }
    if (t === 'regions') { await page.click('#regionSketch .fpin >> nth=0'); await page.waitForTimeout(200); }
    await shot(page, name);
    if (t === 'regions') await page.selectOption('#location', 'all');
  }
  await signIn(page, 'dev-admin-token');
  for (const [t, name] of [['signals', '17-internal-market-signals'], ['feeds', '18-internal-government-data'], ['match', '19-internal-match-a-learner'], ['evidence', '20-internal-sources'], ['review', '21-internal-review-queue'], ['verify', '22-internal-record-employer-call']]) {
    await go(page, 'internal', t);
    if (t === 'feeds') { await page.waitForTimeout(5500); await page.click('#simToggle'); }
    await shot(page, name);
  }
  console.log('Screenshots written to docs/screenshots');
} finally {
  await browser.close();
  srv.stop();
}
