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
  await page.locator('#jobCards .job', { hasText: 'Production Engineer' }).click();
  await shot(page, join(out, '01-explore-opportunities.png'));
  const tabs = [['compare', '02-compare-62-vs-63'], ['match', '03-who-could-fit'], ['voice', '04-worker-employer-voice'], ['plan', '05-planning-and-outreach'], ['evidence', '08-source-register']];
  for (const [t, name] of tabs) {
    await page.click(`.tab[data-tab=${t}]`);
    await page.waitForTimeout(300);
    await shot(page, join(out, name + '.png'));
  }
  await signIn(page, 'dev-admin-token');
  for (const [t, name] of [['review', '06-source-review-queue'], ['verify', '07-employer-verification']]) {
    await page.click(`.tab[data-tab=${t}]`);
    await page.waitForTimeout(500);
    await shot(page, join(out, name + '.png'));
  }
  console.log('Screenshots written to docs/screenshots');
} finally {
  await browser.close();
  srv.stop();
}
