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
/** Open a view, then a page in it, the way a person would. */
const go = async (page, view, tab) => { await page.click(`.aud-tab[data-view=${view}]`); if (tab) await page.click(`#subTabs .tab[data-tab=${tab}]`); };

test('AT1 + AT11: sector switch updates counters, list and pins; schematic says not exact', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&tab=discover');
  await page.waitForSelector('#jobCards .job');
  await page.waitForFunction(() => document.querySelector('#fallback').style.display === 'block' && document.querySelector('#leafletMap').style.display === 'none', null, { timeout: 10000 });
  assert.match(await text(page, '#fallbackBanner'), /not geographically exact/);
  assert.equal(await text(page, '#mCount'), '29');
  const allPins = await pins(page);
  assert.ok(allPins.some((p) => /Sector 62/.test(p)) && allPins.some((p) => /Sector 63/.test(p)));
  await page.selectOption('#location', '62');
  assert.deepEqual([await text(page, '#mCount'), await text(page, '#m62'), await text(page, '#m63')], ['10', '10', '0']);
  assert.ok((await pins(page)).every((p) => /Sector 62/.test(p)));
  assert.equal(await page.$$eval('#jobCards .job', (x) => x.length), 10);
  await page.selectOption('#location', '63');
  assert.deepEqual([await text(page, '#mCount'), await text(page, '#m62'), await text(page, '#m63')], ['19', '0', '19']);
  assert.ok((await pins(page)).every((p) => /Sector 63/.test(p)));
  assert.deepEqual(page.errors, []);
});

test('AT3: historical post hidden by default, dated when shown', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&tab=discover');
  await page.waitForSelector('#jobCards .job');
  assert.ok(!(await text(page, '#jobCards')).includes('SMD soldering'));
  await page.click('#moreBtn');
  await page.check('#historic');
  const card = page.locator('#jobCards .job', { hasText: 'SMD soldering' });
  assert.match(await card.textContent(), /Old ad · Feb 2026/);
  await card.click();
  assert.match(await text(page, '#detailPanel'), /Posted around 24 Feb 2026/);
  assert.equal(await text(page, '#mCount'), '29', 'historical shown but not counted');
});

test('learner filter narrows every counter; team tabs hidden from the public', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&tab=discover');
  await page.waitForSelector('#jobCards .job');
  assert.ok(await page.locator('.tab[data-tab=review]').isHidden());
  await page.selectOption('#suits', 'iti_electronics');
  assert.deepEqual([await text(page, '#mCount'), await text(page, '#m62'), await text(page, '#m63')], ['1', '0', '1']);
  assert.equal(await page.$$eval('#jobCards .job', (x) => x.length), 1);
  assert.match(await text(page, '#suitsNote'), /ITI Electronics Mechanic/);
});

test('AT8, AT9, AT10 in the UI', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&tab=voice');
  await page.waitForSelector('#sentimentEmpty');
  assert.match(await text(page, '#sentimentEmpty'), /No measured sentiment available/);
  await page.click('#subTabs .tab[data-tab=plan]');
  assert.match(await text(page, '#plan'), /Are there enough jobs for our ITI learners\?\s*Not available yet/);
  await go(page, 'internal', 'discover');
  await page.click('#jobCards .job >> nth=0');
  const a = page.locator('#detailPanel a', { hasText: 'Open the original ad' });
  assert.match(await a.getAttribute('href'), /^https:\/\//);
  assert.equal(await a.getAttribute('target'), '_blank');
});

test('AT6 in the UI: verifier submits 3 openings, a second person approves, KPI rises by 3', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&tab=discover');
  await page.waitForSelector('#jobCards .job');
  await signIn(page, 'dev-verifier-token');
  await page.locator('#jobCards .job', { hasText: 'Production Engineer' }).click();
  await page.click('[data-action=verify-this]');
  await page.fill('#ro0', '3');
  await page.selectOption('#rtr0', 'electronics_mechanic');
  await page.fill('#n0t', 'E2E test note: employer confirmed three openings.');
  await page.click('[data-form=verification] button[type=submit]');
  await page.waitForSelector('.ok-box');
  await go(page, 'internal', 'discover');
  assert.equal(await text(page, '#mConfirmed'), '0');
  assert.match(await text(page, '#mConfirmedSub'), /3 awaiting approval/);
  await signIn(page, 'dev-admin-token');
  await go(page, 'internal', 'review');
  await page.click('[data-action=decide-verification][data-decision=approve]');
  await page.waitForTimeout(300);
  await go(page, 'internal', 'discover');
  assert.equal(await text(page, '#mConfirmed'), '3');
  await page.selectOption('#location', '62');
  assert.equal(await text(page, '#mConfirmed'), '0');
  assert.deepEqual(page.errors, []);
});

test('ITI trades tab maps the catalogue and shows bridge jobs with courses; map sketch zooms', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&tab=trades');
  await page.waitForSelector('.trade-row');
  await page.click('[data-action=trade-open][data-trade="Electrician"]');
  const t = await text(page, '.trade.open');
  assert.match(t, /Jobs outside the trade a learner could reach/);
  assert.match(t, /Technical Support Engineer/);
  await go(page, 'institution', 'regions');
  await page.waitForSelector('#regionSketch .fpin');
  assert.match(await text(page, '#regions'), /Dabgram|Kalyani Industrial Park/);
  const before = await page.getAttribute('#regionSketch svg', 'viewBox');
  await page.click('#regionSketch .zoom-ctl [data-z=in]');
  assert.notEqual(await page.getAttribute('#regionSketch svg', 'viewBox'), before);
  await page.selectOption('#location', 'siliguri');
  assert.match(await text(page, '#regions'), /Industry around Siliguri/);
  await page.click('#regionSketch .fpin >> nth=0');
  assert.match(await text(page, '#siteDetail'), /Presence, not a vacancy/);
  assert.deepEqual(page.errors, []);
});

test('Government data tab lists every tracked source with an honest status', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&tab=feeds');
  await page.waitForSelector('.feed');
  assert.equal(await page.$$eval('.feed', (x) => x.length), 6);
  const t = await text(page, '#feeds');
  assert.match(t, /No government figures fetched yet/);
  assert.match(t, /Needs API key/);
  assert.match(t, /Needs data-sharing agreement/);
  assert.match(await text(page, '.sim-banner'), /SIMULATION[\s\S]*made up in your browser/);
  await page.waitForSelector('#simStream .ev');
  assert.match(await text(page, '#simHealth'), /National Career Service/);
  await page.click('#simToggle');
  assert.match(await text(page, '#simToggle'), /Play/);
  assert.deepEqual(page.errors, []);
});

test('four separate interfaces: learners, institutions, industry (talent, not jobs) and internal', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide');
  await page.waitForSelector('.door');
  assert.equal(await page.$$eval('.door', (x) => x.length), 4);
  assert.equal(await page.$$eval('.aud-tab', (x) => x.length), 4);
  await page.click('.door[data-view=learners]');
  assert.match(await text(page, '#lhome'), /Your next step, in three moves/);
  await page.click('[data-action=lp-type][data-type=polytechnic]');
  assert.match(await page.$eval('#lpProg', (s) => s.selectedOptions[0].textContent), /Diploma/);
  await page.click('#subTabs .tab[data-tab=learn]');
  assert.match(await text(page, '#learn'), /Your skill plan/);
  await page.click('#subTabs .tab[data-tab=path]');
  assert.match(await text(page, '#path'), /National Apprenticeship Training Scheme|NATS/);
  await go(page, 'industry');
  assert.match(await text(page, '#talent'), /Hire trained people near your site/);
  assert.equal(await page.$$eval('#subTabs .tab[data-tab=discover]', (x) => x.length), 0, 'no job-ads page in the industry interface');
  await page.click('#talent [data-action=hire-role][data-role=support]');
  assert.match(await text(page, '#hire'), /ITI trades[\s\S]*Diplomas[\s\S]*Degrees/);
  await page.click('#subTabs .tab[data-tab=partner]');
  await page.fill('#hrWhen', '2027-01');
  await page.click('[data-form=hire-request] button[type=submit]');
  assert.match(await text(page, '#partner'), /1 saved in this browser/);
  await go(page, 'institution');
  await page.click('[data-action=inst-home-type][data-type=polytechnic]');
  assert.match(await text(page, '#ihome'), /Demand for your programmes/);
  await go(page, 'internal');
  assert.match(await text(page, '#signals'), /Team sign-in needed/, 'internal interface is gated on the live server');
  await signIn(page, 'dev-researcher-token');
  assert.match(await text(page, '#signals'), /What should we build next\?/);
  assert.match(await text(page, '#signals'), /Demand by learner type[\s\S]*Partner leads/);
  assert.match(await text(page, '.matrix'), /NSQF \(NQR\)[\s\S]*NPTEL/);
  assert.deepEqual(page.errors, []);
});

test('learner skill plan links gaps to Swift AI Academy courses; market overview follows the location', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&tab=learn');
  await page.waitForSelector('.plan-step');
  assert.match(await text(page, '.plan-steps'), /Spoken clarity and listening/);
  await page.selectOption('#lpProg', 'Fitter');
  assert.match(await text(page, '#learn'), /Your skill plan/);
  await go(page, 'institution', 'market');
  assert.match(await text(page, '#market'), /2016 to 2026/);
  await page.selectOption('#location', 'kalyani');
  assert.match(await text(page, '#market'), /Kalyani/);
  assert.deepEqual(page.errors, []);
});

test('offline single-file build works from disk without a server', async () => {
  const page = await newPage(browser);
  await page.goto(pathToFileURL(join(ROOT, 'dist/explorer-offline.html')).href + '?noguide&tab=discover');
  await page.waitForSelector('#jobCards .job');
  assert.match(await text(page, '#modePill'), /Offline copy/);
  assert.equal(await text(page, '#mCount'), '29');
  assert.deepEqual(page.errors, []);
});

test('live demo mode is labelled, never changes real counts, and the guided demo can be stopped', async () => {
  const page = await newPage(browser);
  await page.goto(pathToFileURL(join(ROOT, 'dist/explorer-offline.html')).href + '?noguide');
  await page.waitForSelector('#homeLive .hl-feed li');
  assert.match(await text(page, '#livePill'), /Live demo/);
  assert.match(await text(page, '.home-live'), /Demo activity[\s\S]*never changes the real counts/);
  await page.waitForSelector('.live-toast', { timeout: 15000 });
  assert.match(await text(page, '.live-toast'), /Demo/);
  await page.click('#livePill');
  assert.match(await text(page, '#livePill'), /Demo paused/);
  await page.click('[data-action=tour]');
  await page.waitForSelector('#tourBar');
  assert.match(await text(page, '#tourBar'), /Demo · 1 of 9/);
  await page.click('#tourExit');
  assert.equal(await page.$('#tourBar'), null);
  await go(page, 'internal', 'discover');
  assert.equal(await text(page, '#mCount'), '29', 'demo activity never touches real counts');
  assert.deepEqual(page.errors, []);
});


test('mobile navigation offers five destinations and keeps all institution pages reachable', async () => {
  const page = await newPage(browser);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(srv.url + '/?noguide&view=institution&tab=ihome');
  await page.waitForSelector('#mobileNav .mobile-tab');
  assert.equal(await page.locator('#mobileNav .mobile-tab').count(), 5);
  assert.ok(await page.locator('#subTabs').isHidden(), 'desktop secondary tabs are hidden on mobile');
  await page.click('#mobileNav [data-action=mobile-more]');
  assert.ok(await page.locator('#modalTitle').count(), JSON.stringify({ errors: page.errors, modal: await page.locator('#modalBody').innerHTML(), view: await page.locator('html').getAttribute('data-view') }));
  assert.match(await text(page, '#modalTitle'), /More pages/);
  await page.click('#modal [data-action=mobile-more-tab][data-tab=regions]');
  assert.ok(await page.locator('#modal').isHidden());
  assert.match(await text(page, '#regions'), /Kalyani|Siliguri/);
  assert.equal(await page.getAttribute('#mobileNav [data-action=mobile-more]', 'aria-current'), 'page');

  await page.click('.aud-tab[data-view=learners]');
  assert.equal(await page.locator('#mobileNav .mobile-tab').count(), 5);
  assert.equal(await page.locator('#mobileNav [data-action=mobile-more]').count(), 1);
  await page.click('#mobileNav [data-tab=learn]');
  assert.match(await text(page, '#learn'), /Your skill plan/);
  await page.setViewportSize({ width: 1280, height: 800 });
  assert.ok(await page.locator('#mobileNav').isHidden());
  assert.ok(await page.locator('#subTabs .tab[data-tab=learn]').isVisible());
  assert.deepEqual(page.errors, []);
});

test('mobile internal navigation never exposes restricted review and verification pages', async () => {
  const page = await newPage(browser);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(srv.url + '/?noguide&view=internal&tab=signals');
  await page.waitForSelector('#mobileNav .mobile-tab');
  assert.equal(await page.locator('#mobileNav .mobile-tab').count(), 5);
  await page.click('#mobileNav [data-action=mobile-more]');
  assert.equal(await page.locator('#modal [data-tab=review]').count(), 0);
  assert.equal(await page.locator('#modal [data-tab=verify]').count(), 0);
  assert.ok(await page.locator('#modal [data-tab=evidence]').count() > 0, JSON.stringify({ errors: page.errors, modal: await page.locator('#modalBody').innerHTML(), view: await page.locator('html').getAttribute('data-view') }));
  assert.deepEqual(page.errors, []);
});


test('learner profile: explicit local consent, study match and erase', async () => {
  const page = await newPage(browser);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(srv.url + '/?noguide&view=learners&tab=lprofile');
  await page.waitForSelector('#learnerProfileForm');
  assert.equal(await page.locator('#learnerProfileForm [name=consent]').isChecked(), false);
  assert.match(await text(page, '#lprofile'), /No learner details are sent to employers/);
  await page.click('#lprofile [data-action=lp-type][data-type=polytechnic]');
  await page.selectOption('#learnerProfileForm [name=programme]', 'dip-ece');
  await page.selectOption('#learnerProfileForm [name=stage]', 'completed');
  await page.selectOption('#learnerProfileForm [name=year]', '3');
  await page.selectOption('#learnerProfileForm [name=location]', 'siliguri');
  await page.selectOption('#learnerProfileForm [name=language]', 'bn');
  await page.selectOption('#learnerProfileForm [name=relocation]', 'yes');
  await page.selectOption('#learnerProfileForm [name=shift]', 'day');
  await page.click('#learnerProfileForm button[type=submit]');
  assert.equal(await page.locator('#lprofile').isHidden(), false, 'consent is required to save');
  assert.equal(await page.evaluate(() => localStorage.getItem('opx-learner')), null);
  await page.check('#learnerProfileForm [name=consent]');
  await page.click('#learnerProfileForm button[type=submit]');
  assert.match(await text(page, '#lhome'), /Saved only on this device/);
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('opx-learner')));
  assert.equal(saved.programme, 'dip-ece');
  assert.equal(saved.stage, 'completed');
  assert.equal(saved.language, 'bn');
  assert.equal(saved.consent, true);

  await page.click('#lhome [data-tab=lprofile]');
  await page.waitForSelector('#learnerProfileForm');
  assert.equal(await page.inputValue('#learnerProfileForm [name=language]'), 'bn');
  await page.click('#learnerProfileForm [data-action=lp-forget]');
  assert.equal(await page.evaluate(() => localStorage.getItem('opx-learner')), null);
  assert.match(await text(page, '#lprofile'), /I agree to save these preferences/);

  await page.click('.aud-tab[data-view=learners]');
  await page.click('#mobileNav [data-tab=discover]');
  await page.waitForSelector('#jobCards .job');
  await page.click('#jobCards .job >> nth=0');
  assert.match(await text(page, '#detailPanel'), /How this advert relates to your profile/);
  assert.match(await text(page, '#detailPanel'), /not your assessed skills or employer-confirmed eligibility/);
  assert.deepEqual(page.errors, []);
});

test('learner profile editor on desktop retains existing programme selection flow', async () => {
  const page = await newPage(browser);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(srv.url + '/?noguide&view=learners&tab=lhome');
  await page.waitForSelector('#lpProg');
  await page.selectOption('#lpProg', 'Fitter');
  assert.match(await text(page, '#lhome'), /Fitter/);
  await page.click('#lhome .profile-bar [data-tab=lprofile]');
  assert.equal(await page.inputValue('#learnerProfileForm [name=programme]'), 'Fitter');
  await page.click('#subTabs .tab[data-tab=learn]');
  assert.match(await text(page, '#learn'), /Your skill plan/);
  assert.deepEqual(page.errors, []);
});
