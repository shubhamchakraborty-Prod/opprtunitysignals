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

test('four audience interfaces plus a separate leadership vision demo', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide');
  await page.waitForSelector('.door');
  assert.equal(await page.$$eval('.door', (x) => x.length), 4);
  assert.equal(await page.locator('.aud-tab').count(), 5);
  await page.click('.door[data-view=learners]');
  assert.match(await text(page, '#lhome'), /Your next step, in three moves/);
  await page.click('[data-action=lp-type][data-type=polytechnic]');
  assert.match(await page.$eval('#lpProg', (s) => s.selectedOptions[0].textContent), /Diploma/);
  await page.click('#subTabs .tab[data-tab=learn]');
  assert.match(await text(page, '#learn'), /Your skill plan/);
  await page.click('#subTabs .tab[data-tab=path]');
  assert.match(await text(page, '#path'), /National Apprenticeship Training Scheme|NATS/);
  await go(page, 'industry');
  assert.match(await text(page, '#talent'), /Explore local training institutions/);
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
  assert.match(await text(page, '#iops'), /authorised team role|Research operations/i, 'internal overview is gated on the live server');
  await signIn(page, 'dev-researcher-token');
  await page.waitForSelector('#iops .iro-kpis');
  await page.click('#subTabs .tab[data-tab=signals]');
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

test('institution demand displays source-backed programme analysis on desktop', async () => {
  const page = await newPage(browser);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(srv.url + '/?noguide&view=institution&tab=ihome');
  await page.waitForSelector('.inst-quicklinks');
  await page.click('#ihome [data-tab=idemand]');
  await page.waitForSelector('#instProgrammeSelect');
  assert.match(await text(page, '#idemand'), /Pilot evidence: Noida Sectors 62 and 63/);
  assert.ok(await page.locator('#idemand .inst-chart-row').count() > 0);
  assert.ok(await page.locator('#idemand .inst-source-list a[href^="https://"]').count() > 0);
  assert.match(await text(page, '#idemand'), /not as a placement forecast/);
  await page.click('#idemand [data-action=inst-type-switch][data-type=polytechnic]');
  assert.match(await text(page, '#idemand'), /Polytechnic/);
  assert.ok(await page.locator('#instProgrammeSelect option').count() > 0);
  await page.click('#idemand [data-action=inst-type-switch][data-type=college]');
  assert.match(await text(page, '#idemand'), /College \/ university/);
  assert.deepEqual(page.errors, []);
});

test('institution outreach saves, updates and erases only local planning actions', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&view=institution&tab=ioutreach');
  await page.waitForSelector('#instLeadQuery');
  assert.match(await text(page, '#ioutreach'), /stored only in your browser/);
  assert.ok(await page.locator('#ioutreach .inst-lead').count() > 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('opx-inst-outreach-v1')), null);
  await page.click('#ioutreach [data-action=inst-lead-toggle] >> nth=0');
  assert.equal(await page.locator('#ioutreach .inst-pipeline-item').count(), 1);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('opx-inst-outreach-v1')));
  assert.deepEqual(stored.map((x) => x.stage), ['saved']);
  // Sector filters should not erase a saved lead from another sector.
  await page.selectOption('#location', '62');
  assert.equal(await page.locator('#ioutreach .inst-pipeline-item').count(), 1);
  await page.selectOption('#location', '63');
  assert.equal(await page.locator('#ioutreach .inst-pipeline-item').count(), 1);
  await page.selectOption('#location', 'all');
  await page.selectOption('#ioutreach [data-inst-stage]', 'followup');
  assert.match(await text(page, '#ioutreach'), /Follow-up needed/);
  await page.reload();
  await page.waitForSelector('#instLeadQuery');
  assert.equal(await page.locator('#ioutreach .inst-pipeline-item').count(), 1);
  await page.click('#ioutreach [data-action=inst-clear-outreach]');
  assert.equal(await page.evaluate(() => localStorage.getItem('opx-inst-outreach-v1')), null);
  assert.match(await text(page, '#ioutreach'), /Changing a status here does not verify a vacancy/);
  assert.deepEqual(page.errors, []);
});

test('mobile institution navigation exposes priority screens and region evidence caveats', async () => {
  const page = await newPage(browser);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(srv.url + '/?noguide&view=institution&tab=ihome');
  await page.waitForSelector('#mobileNav .mobile-tab');
  assert.equal(await page.locator('#mobileNav .mobile-tab').count(), 5);
  await page.click('#mobileNav [data-tab=idemand]');
  assert.match(await text(page, '#idemand'), /Programme relevance/);
  await page.selectOption('#location', 'siliguri');
  assert.match(await text(page, '#idemand'), /do not yet have comparable vacancy data/);
  assert.match(await text(page, '#idemand'), /not evidence about your selected region/);
  await page.click('#mobileNav [data-tab=ioutreach]');
  assert.match(await text(page, '#ioutreach'), /Noida figures below are a method demonstration/);
  assert.deepEqual(page.errors, []);
});

test('industry institution supply explorer exposes research counts and regional caveats', async () => {
  const page = await newPage(browser);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(srv.url + '/?noguide&view=industry&tab=isupply');
  await page.waitForSelector('#industryInstituteQuery');
  assert.match(await text(page, '#isupply'), /Where are relevant courses taught/);
  assert.match(await text(page, '#isupply'), /not a count of available candidates/i);
  assert.ok(await page.locator('#isupply .ind-institute').count() > 0);
  await page.click('#isupply [data-action=ind-pool][data-pool=electronics]');
  assert.match(await text(page, '#isupply'), /Institutes may appear in several groups/);
  await page.selectOption('#location', 'kalyani');
  assert.match(await text(page, '#isupply'), /Noida job advertisements and pay data cannot be projected/);
  assert.deepEqual(page.errors, []);
});

test('industry role screen separates indicative qualification coverage from local job ads', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&view=industry&tab=hire');
  await page.waitForFunction(() => document.querySelector('#hire')?.textContent?.includes('Catalogue-based qualification comparisons'));
  assert.match(await text(page, '#hire'), /Catalogue-based qualification comparisons/);
  assert.match(await text(page, '#hire'), /Public advertisements behind this comparison/);
  assert.ok(await page.locator('#hire .ind-evidence-sources a[href^="https://"]').count() > 0);
  await page.selectOption('#location','siliguri');
  assert.match(await text(page, '#hire'), /Comparable regional data unavailable/);
  assert.match(await text(page, '#hire'), /No comparable local advertised-pay evidence available/);
  assert.deepEqual(page.errors, []);
});

test('industry local partnership workflow saves and erases a proposal on mobile', async () => {
  const page = await newPage(browser);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(srv.url + '/?noguide&view=industry&tab=isupply');
  await page.waitForSelector('#industryInstituteQuery');
  assert.equal(await page.locator('#mobileNav .mobile-tab').count(), 5);
  await page.click('#isupply .ind-institute [data-action=ind-plan-institute] >> nth=0');
  assert.equal(await page.locator('#partner').isVisible(), true);
  assert.match(await text(page, '#partner'), /Demo planning mode/);
  const chosen = await page.inputValue('#hrInstitute');
  assert.ok(chosen);
  await page.selectOption('#hrPurpose','apprenticeship');
  await page.fill('#hrN','12');
  await page.fill('#hrWhen','2026-12');
  await page.click('#industryPartnerForm button[type=submit]');
  assert.equal(await page.locator('#partner .ind-plan').count(),1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('opx-industry-partnerships-v1')));
  assert.equal(saved[0].institute,chosen);
  assert.equal(saved[0].purpose,'apprenticeship');
  assert.equal(saved[0].n,12);
  assert.equal(saved[0].stage,'saved');
  assert.match(await text(page, '#partner'), /No institution has been contacted through this platform/);
  await page.selectOption('#partner [data-ind-partner-stage]','contact_planned');
  const updated = await page.evaluate(() => JSON.parse(localStorage.getItem('opx-industry-partnerships-v1')));
  assert.equal(updated[0].stage,'contact_planned');
  await page.reload();
  await page.waitForSelector('#industryPartnerForm');
  assert.equal(await page.locator('#partner .ind-plan').count(),1);
  await page.click('#partner [data-action=hire-clear]');
  assert.equal(await page.evaluate(() => localStorage.getItem('opx-industry-partnerships-v1')),null);
  assert.deepEqual(page.errors, []);
});

test('internal research operations refuse public access and provide actionable authorised queues', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&view=internal&tab=iops');
  await page.waitForSelector('#iops');
  assert.match(await text(page, '#iops'), /require an authorised team role/);
  assert.equal(await page.locator('#iops .iro-kpis').count(),0);
  await signIn(page,'dev-researcher-token');
  await page.waitForSelector('#iops .iro-queue');
  assert.match(await text(page, '#iops'), /Deduplicated nonclosed ads/);
  assert.match(await text(page, '#iops'), /Second-person approval/);
  assert.ok(await page.locator('#iops .iro-queue-row').count()>3);
  await page.click('#iops .iro-queue-row >> nth=0');
  await page.waitForSelector('#review .section-head');
  assert.match(await text(page, '#review'), /Review queue/);
  assert.deepEqual(page.errors,[]);
});

test('internal data quality allows read-only filtering without publishing or verifying ads', async () => {
  const page = await newPage(browser);
  await page.setViewportSize({width:390,height:844});
  await page.goto(srv.url + '/?noguide&view=internal&tab=iquality');
  assert.match(await text(page,'#iquality'),/authorised team role/);
  assert.equal(await page.locator('#iquality .iro-quality-tile').count(),0);
  await signIn(page,'dev-researcher-token');
  await page.waitForSelector('#iquality .iro-quality-tile');
  assert.equal(await page.locator('#mobileNav .mobile-tab').count(),5);
  assert.match(await text(page,'#iquality'),/Deduplicated nonclosed ads/);
  assert.match(await text(page,'#iquality'),/diagnostics only/);
  await page.selectOption('#iroQualityFilter','pay');
  assert.match(await text(page,'#iquality'),/Advertised pay/);
  assert.ok(await page.locator('#iquality .iro-issue').count()>0);
  await page.click('#iquality [data-action=iro-quality-filter][data-filter=stale]');
  assert.equal(await page.inputValue('#iroQualityFilter'),'stale');
  assert.deepEqual(page.errors,[]);
});

test('internal access matrix is read-only; administrator rights are not granted to researchers', async () => {
  const page = await newPage(browser);
  await page.goto(srv.url + '/?noguide&view=internal&tab=iaccess');
  await page.waitForFunction(() => document.querySelector('#iaccess')?.textContent?.includes('authorised team role'));
  assert.match(await text(page,'#iaccess'),/authorised team role/);
  await signIn(page,'dev-researcher-token');
  await page.waitForSelector('#iaccess .iro-access-table');
  assert.match(await text(page,'#iaccess'),/Current role: Researcher/);
  assert.match(await text(page,'#iaccess'),/Approving employer verification|Approve employer verification/);
  assert.match(await text(page,'#iaccess'),/does not grant roles or change access settings/);
  await page.click('#iaccess [data-tab=verify]');
  assert.match(await text(page,'#verify'),/not permitted|team member|for the team/i);
  assert.deepEqual(page.errors,[]);
});

test('future-state intelligence demo displays simulation and explainable confidence', async () => {
  const page = await newPage(browser);
  await page.setViewportSize({width:1366,height:900});
  await page.goto(srv.url + '/?noguide&view=internal&tab=idemo');
  await page.waitForSelector('#idemo .fd-map-art');
  assert.match(await text(page,'#idemo'),/FUTURE-STATE SIMULATION/);
  assert.match(await text(page,'#idemo'),/No external API keys are connected/);
  assert.ok(await page.locator('#idemo .fd-marker').count()>3);
  assert.ok(await page.locator('#idemo .fd-connector-grid article').count()>=8);
  await page.click('#idemo [data-action=fd-select][data-id=DM-001] >> nth=0');
  assert.match(await text(page,'#idemo .fd-evidence-panel'),/Not employer-confirmed/);
  const score=await text(page,'#idemo .fd-evidence-panel');
  assert.match(score,/Why the example is scored this way/);
  await page.click('#idemo [data-action=fd-select][data-id=DM-006] >> nth=0');
  assert.match(await text(page,'#idemo .fd-evidence-panel'),/Unconfirmed social-only claim/);
  await page.click('#idemo .fd-evidence-panel [data-action=fd-persona][data-persona=institution]');
  assert.match(await text(page,'#idemo .fd-persona-result'),/Institution interpretation/);
  await page.click('#idemo [data-action=fd-sync]');
  assert.match(await text(page,'#idemo .fd-sync-status'),/Demo sync #1/);
  assert.deepEqual(page.errors,[]);
});

test('future-state demo region, confidence and source filters remain separate from live data', async () => {
  const page=await newPage(browser);
  await page.setViewportSize({width:390,height:844});
  await page.goto(srv.url + '/?noguide&view=internal&tab=idemo');
  await page.waitForSelector('#fdArea');
  assert.equal(await page.locator('#mobileNav .mobile-tab').count(),5);
  await page.selectOption('#fdArea','kalyani');
  assert.match(await text(page,'#idemo'),/Kalyani/);
  assert.equal(await page.locator('#idemo .fd-marker').count(),3);
  await page.selectOption('#fdCategory','social');
  assert.equal(await page.locator('#idemo .fd-marker').count(),1);
  await page.selectOption('#fdBand',{label:'Very high'});
  assert.equal(await page.locator('#idemo .fd-marker').count(),0);
  assert.match(await text(page,'#idemo'),/No sample records meet/);
  await page.selectOption('#fdBand','all');
  await page.selectOption('#fdCategory','all');
  await page.selectOption('#fdArea','noida');
  assert.ok(await page.locator('#idemo .fd-marker').count()>3);
  assert.match(await text(page,'#idemo'),/This preview uses entirely synthetic/);
  assert.deepEqual(page.errors,[]);
});

test('simple briefing provides three next steps with evidence and useful feedback',async()=>{
 const page=await newPage(browser);
 await page.setViewportSize({width:390,height:844});
 await page.goto(srv.url+'/?noguide&view=internal&tab=idemo');
 await page.waitForSelector('#idemo .engage-brief');
 assert.match(await text(page,'#idemo .engage-brief'),/What matters to you today/);
 assert.equal(await page.locator('#idemo .engage-item').count(),3);
 assert.match(await text(page,'#idemo .engage-brief'),/No endless scrolling/);
 assert.match(await text(page,'#idemo .engage-counter'),/0 \/ 3/);
 await page.click('#idemo .engage-item [data-action=fd-brief-save] >> nth=0');
 assert.match(await text(page,'#idemo .engage-message'),/Saved for this visit/);
 assert.equal(await page.locator('#idemo .engage-item [data-action=fd-brief-save][aria-pressed=true]').count(),1);
 await page.click('#idemo .engage-item [data-action=fd-brief-open] >> nth=0');
 assert.match(await text(page,'#idemo .engage-counter'),/1 \/ 3/);
 assert.match(await text(page,'#idemo .fd-evidence-panel'),/Why the example is scored this way/);
 await page.click('#idemo .engage-item [data-action=fd-brief-hide] >> nth=0');
 assert.equal(await page.locator('#idemo .engage-item').count(),3,'next finite item fills visible slot');
 assert.match(await text(page,'#idemo .engage-message'),/Hidden for this visit/);
 await page.click('#idemo [data-action=fd-brief-restore]');
 assert.equal(await page.locator('#idemo .engage-item').count(),3);
 await page.click('#idemo .engage-roles [data-persona=industry]');
 assert.match(await text(page,'#idemo .engage-item >> nth=0'),/Discover a possible training partner/);
 assert.deepEqual(page.errors,[]);
});

test('learner action-first home shows three honest next steps on mobile',async()=>{
  const page=await newPage(browser);
  await page.setViewportSize({width:390,height:844});
  await page.goto(srv.url+'/?noguide&view=learners&tab=lhome');
  await page.waitForSelector('#lhome .af-home');
  assert.equal(await page.locator('#lhome .af-step').count(),3);
  assert.match(await text(page,'#lhome .af-home'),/Your next three steps/);
  assert.match(await text(page,'#lhome .af-context'),/Noida Sectors 62\/63 sample/);
  await page.click('#lhome .af-step [data-action=af-save] >> nth=0');
  assert.equal(await page.locator('#lhome .af-step [data-action=af-save][aria-pressed=true]').count(),1);
  await page.click('#lhome .af-step [data-action=af-open][data-tab=learn]');
  assert.equal(await page.locator('#learn').isVisible(),true);
  await page.click('#mobileNav [data-tab=lhome]');
  assert.match(await text(page,'#lhome .af-progress'),/1\/3/);
  await page.selectOption('#location','siliguri');
  assert.match(await text(page,'#lhome .af-context'),/no comparable local job-ad coverage/);
  assert.deepEqual(page.errors,[]);
});

test('institution action-first home responds to type and preserves outreach caveats',async()=>{
  const page=await newPage(browser);
  await page.goto(srv.url+'/?noguide&view=institution&tab=ihome');
  await page.waitForSelector('#ihome .af-home');
  assert.equal(await page.locator('#ihome .af-step').count(),3);
  assert.match(await text(page,'#ihome .af-home'),/Three useful decisions/);
  await page.click('#ihome [data-action=inst-home-type][data-type=college]');
  assert.match(await text(page,'#ihome .af-home'),/programmes/);
  await page.click('#ihome .af-step [data-action=af-open][data-tab=ioutreach]');
  assert.equal(await page.locator('#ioutreach').isVisible(),true);
  assert.match(await text(page,'#ioutreach'),/stored only in your browser/);
  assert.deepEqual(page.errors,[]);
});

test('industry action-first home permits dismissal and restoring without implying hiring',async()=>{
  const page=await newPage(browser);
  await page.goto(srv.url+'/?noguide&view=industry&tab=talent');
  await page.waitForSelector('#talent .af-home');
  assert.equal(await page.locator('#talent .af-step').count(),3);
  assert.match(await text(page,'#talent .af-context'),/not verified/);
  await page.click('#talent .af-step [data-action=af-hide] >> nth=0');
  assert.equal(await page.locator('#talent .af-step').count(),2);
  await page.click('#talent [data-action=af-restore]');
  assert.equal(await page.locator('#talent .af-step').count(),3);
  await page.click('#talent .af-step [data-action=af-open][data-tab=partner]');
  assert.equal(await page.locator('#partner').isVisible(),true);
  assert.match(await text(page,'#partner'),/private planning workspace/);
  assert.deepEqual(page.errors,[]);
});

test('leadership vision is one public, self-contained guided product story',async()=>{
  const page=await newPage(browser);
  await page.setViewportSize({width:1440,height:900});
  await page.goto(srv.url+'/?noguide&view=vision&tab=idemo');
  await page.waitForSelector('#vision-tour');
  assert.match(await text(page,'#vision-tour'),/Walk through the complete product vision/);
  assert.match(await text(page,'#idemo'),/FUTURE-STATE SIMULATION/);
  assert.equal(await page.locator('#vision-tour .vision-tour-track button').count(),7);
  assert.equal(await page.locator('.aud-tab').count(),5);
  assert.equal(await page.locator('#vision-tour .vision-tour-count').textContent(),'1 / 7');
  await page.click('#vision-tour [data-action=vision-step][data-step="1"] >> nth=0');
  assert.equal(await page.locator('#vision-tour .vision-tour-count').textContent(),'2 / 7');
  assert.ok(await page.locator('#vision-sources .fd-connector-grid article').count()>7);
  await page.click('#vision-tour [data-action=vision-step][data-step="2"] >> nth=0');
  assert.match(await text(page,'#vision-signals'),/Unified signals/);
  await page.click('#vision-tour [data-action=vision-step][data-step="3"] >> nth=0');
  assert.match(await text(page,'#vision-evidence'),/Unconfirmed social-only claim/);
  await page.click('#vision-tour [data-action=vision-step][data-step="4"] >> nth=0');
  assert.match(await text(page,'#vision-map'),/Illustrative · not to scale/);
  await page.click('#vision-tour [data-action=vision-step][data-step="5"] >> nth=0');
  assert.match(await text(page,'#vision-people'),/Four people, one intelligence foundation/);
  assert.equal(await page.locator('#vision-people .vision-role-grid article').count(),4);
  await page.click('#vision-tour [data-action=vision-step][data-step="6"] >> nth=0');
  assert.match(await text(page,'#vision-pipeline'),/How one signal becomes a decision/);
  await page.click('#vision-tour [data-action=vision-step][data-step="0"] >> nth=0');
  assert.equal(await page.locator('#vision-tour .vision-tour-count').textContent(),'1 / 7');
  assert.deepEqual(page.errors,[]);
});

test('leadership demo enters from home and links to real example roles without showing internal data',async()=>{
  const page=await newPage(browser);
  await page.setViewportSize({width:390,height:844});
  await page.goto(srv.url+'/?noguide&tab=home');
  await page.waitForSelector('.home-hero');
  await page.click('.home-hero [data-view=vision]');
  await page.waitForSelector('#vision-tour');
  assert.equal(await page.locator('#mobileNav .mobile-tab').count(),1);
  assert.match(await text(page,'#idemo'),/No external API keys are connected/);
  await page.click('#vision-people [data-view=learners]');
  await page.waitForSelector('#lhome .af-home');
  assert.equal(await page.locator('#lhome .af-step').count(),3);
  await page.click('.aud-tab[data-view=vision]');
  await page.waitForSelector('#vision-tour');
  assert.match(await text(page,'#idemo .fd-simulation-header'),/entirely synthetic/);
  assert.deepEqual(page.errors,[]);
});
