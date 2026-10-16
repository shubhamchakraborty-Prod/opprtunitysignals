// Captures one screenshot per tab into docs/screenshots (run: npm run screenshots).
// Uses the API server with the real seed (memory store, nothing persisted).
// Map tiles are blocked so the schematic fallback is shown deterministically.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { startServer, launch, newPage, signIn, ROOT } from '../test/e2e/harness.mjs';

const out = join(ROOT, 'docs/screenshots');
mkdirSync(out, { recursive: true });
const srv = await startServer();
const shot = async (page, path, full = true) => {
  await page.evaluate(() => document.querySelector('#toast')?.classList.add('hide'));
  await page.screenshot({ path, fullPage: full });
};
const browser = await launch();
try {
  const page = await newPage(browser, { skipGuide: false });
  await page.goto(srv.url + '/');
  await page.waitForSelector('#modal:not(.hide)');
  await shot(page, join(out, '00-guided-start.png'), false);
  await page.click('[data-action=guide-skip]');
  await page.waitForTimeout(6500);
  await shot(page, join(out, '01-jobs-map.png'));
  await page.locator('#jobCards .job', { hasText: 'Production Engineer' }).click();
  await page.waitForTimeout(400);
  await shot(page, join(out, '01b-job-detail.png'), false);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const tabs = [['compare', '02-compare-62-and-63'], ['match', '03-match-a-learner'], ['plan', '04-next-steps'], ['voice', '05-workers-views'], ['feeds', '05b-government-data'], ['evidence', '06-sources']];
  for (const [t, name] of tabs) {
    await page.click(`.tab[data-tab=${t}]`);
    await page.waitForTimeout(300);
    await shot(page, join(out, name + '.png'));
  }
  await signIn(page, 'dev-admin-token');
  for (const [t, name] of [['review', '07-review-queue'], ['verify', '08-record-employer-call']]) {
    await page.click(`.tab[data-tab=${t}]`);
    await page.waitForTimeout(500);
    await shot(page, join(out, name + '.png'));
  }
  console.log('Screenshots written to docs/screenshots');
} finally {
  await browser.close();
  srv.stop();
}

