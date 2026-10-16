// Browser acceptance tests (run: npm run test:e2e).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startServer, launch, newPage, signIn, ROOT } from './harness.mjs';

let srv, browser;
before(async () => { srv = await startServer(); browser = await launch(); });
after(async () => { await browser?.close(); srv?.stop(); });

const pins = (page) => page.$$eval('#svgPins g.fpin', (gs) => gs.map((g) => g.getAttribute('aria-label')));
const text = (page, s) => page.textContent(s);

test('AT1 + AT11: sector switch updates counters, list and pins; schematic says not exact', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide');
  await page.waitForSelector('#jobCards .job');
  await page.waitForFunction(() => document.querySelector('#fallback').style.display === 'block' && document.querySelector('#leafletMap').style.display === 'none', null, { timeout: 10000 });
  assert.match(await text(page, '#fallbackBanner'), /not geographically exact/);
  assert.equal(await text(page, '#mCount'), '17');
  const allPins = await pins(page);
  assert.ok(allPins.some((p) => /Sector 62/.test(p)) && allPins.some((p) => /Sector 63/.test(p)));
  await page.click('.seg[data-sector="62"]');
  assert.deepEqual([await text(page, '#mCount'), await text(page, '#m62'), await text(page, '#m63')], ['8', '8', '0']);
  assert.ok((await pins(page)).every((p) => /Sector 62/.test(p)));
  assert.equal(await page.$$eval('#jobCards .job', (x) => x.length), 8);
  await page.click('.seg[data-sector="63"]');
  assert.deepEqual([await text(page, '#mCount'), await text(page, '#m62'), await text(page, '#m63')], ['9', '0', '9']);
  assert.ok((await pins(page)).every((p) => /Sector 63/.test(p)));
  assert.deepEqual(page.errors, []);
});

test('AT3: historical post hidden by default, dated when shown', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide');
  await page.waitForSelector('#jobCards .job');
  assert.ok(!(await text(page, '#jobCards')).includes('Electronics Technician'));
  await page.check('#historic');
  const card = page.locator('#jobCards .job', { hasText: 'Electronics Technician' });
  assert.match(await card.textContent(), /Older signal · Posted c\. 24 Feb 2026/);
  assert.equal(await text(page, '#mCount'), '17', 'historical shown but not counted');
});

test('AT8, AT9, AT10 in the UI', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&tab=voice');
  await page.waitForSelector('#sentimentEmpty');
  assert.match(await text(page, '#sentimentEmpty'), /No measured sentiment available/);
  await page.click('.tab[data-tab=plan]');
  assert.match(await text(page, '#plan'), /Demand coverage\s*verified openings ÷ expected ITI pass-outs\s*Not available/);
  await page.click('.tab[data-tab=discover]');
  await page.click('#jobCards .job >> nth=0');
  const a = page.locator('#detailPanel a', { hasText: 'Open original source' });
  assert.match(await a.getAttribute('href'), /^https:\/\//);
  assert.equal(await a.getAttribute('target'), '_blank');
});

test('AT6 in the UI: verifier submits 3 openings, a second person approves, KPI rises by 3', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide');
  await page.waitForSelector('#jobCards .job');
  await signIn(page, 'dev-verifier-token');
  await page.locator('#jobCards .job', { hasText: 'Production Engineer' }).click();
  await page.click('[data-action=verify-this]');
  await page.fill('#ro0', '3');
  await page.selectOption('#rtr0', 'electronics_mechanic');
  await page.fill('#n0t', 'E2E test note: employer confirmed three openings.');
  await page.click('[data-form=verification] button[type=submit]');
  await page.waitForSelector('.ok-box');
  await page.click('.tab[data-tab=discover]');
  assert.equal(await text(page, '#mConfirmed'), '0');
  assert.match(await text(page, '#mConfirmedSub'), /3 awaiting approval/);
  await signIn(page, 'dev-admin-token');
  await page.click('.tab[data-tab=review]');
  await page.click('[data-action=decide-verification][data-decision=approve]');
  await page.waitForTimeout(300);
  await page.click('.tab[data-tab=discover]');
  assert.equal(await text(page, '#mConfirmed'), '3');
  await page.click('.seg[data-sector="62"]');
  assert.equal(await text(page, '#mConfirmed'), '0');
  assert.deepEqual(page.errors, []);
});

test('offline single-file build works from disk without a server', async () => {
  const page = await newPage(browser);
  await page.goto(pathToFileURL(join(ROOT, 'dist/explorer-offline.html')).href + '?noguide');
  await page.waitForSelector('#jobCards .job');
  assert.match(await text(page, '#modePill'), /offline snapshot/);
  assert.equal(await text(page, '#mCount'), '17');
  assert.deepEqual(page.errors, []);
});
