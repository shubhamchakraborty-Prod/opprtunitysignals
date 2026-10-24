// Market signals for the Swift team: demand, catalogue coverage, provider coverage and actions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSeed } from '../src/server/seed.js';
import { comparisonBase } from '../src/core/analytics.js';
import { skillSignals, courseDemand, platformSignals, offeringsFor, scanSkill } from '../src/core/signals.js';

const seed = loadSeed();
const ads = comparisonBase(seed.records.filter((r) => r.review.state === 'approved'), 'all');
const rows = skillSignals({ ads, trades: seed.trades.trades, saa: seed.saa, providers: seed.providers });
const row = (s) => rows.find((r) => r.skill === s);

test('demand counts come from current in-scope ads only', () => {
  assert.equal(ads.length, 29);
  assert.equal(row('English communication').demand, 12, '11 name it plus 1 that asks for strong English in the notes');
  assert.ok(rows.every((r) => r.demand <= ads.length && r.fresh <= r.demand));
});

test('each skill gets one action that follows the catalogue and the market', () => {
  assert.equal(row('English communication').action, 'promote', 'taught in CO01');
  assert.equal(row('Customer handling').action, 'extend', 'partly taught');
  assert.equal(row('Computer basics').action, 'build', 'asked for by 4 ads, not in the catalogue');
  assert.equal(row('Soldering').action, 'refer', 'hands-on trade skill');
  assert.equal(row('Python').action, 'watch', 'taught, but no local ad asks for it');
  assert.ok(['curate', 'build'].includes(row('Digital marketing').action));
});

test('provider scan is matched through skill aliases and never invents offerings', () => {
  assert.equal(scanSkill('Typing'), 'Typing and data entry');
  assert.ok(offeringsFor('Excel', seed.providers).length > 0);
  assert.equal(offeringsFor('Excel', null).length, 0);
  for (const o of seed.providers.offerings) {
    assert.ok(o.title && o.provider && o.evidence, 'every offering keeps its title, provider and evidence');
    assert.ok(o.url === null || /^https:\/\//.test(o.url));
  }
  const noScan = skillSignals({ ads, trades: seed.trades.trades, saa: seed.saa, providers: null });
  assert.ok(noScan.every((r) => r.offerings.length === 0));
});

test('course demand and platform signals carry their evidence', () => {
  const cd = courseDemand(ads, seed.saa);
  assert.equal(cd.length, seed.saa.courses.length);
  assert.ok(cd.find((c) => c.id === 'CO01').ads >= 12);
  assert.equal(cd.find((c) => c.id === 'AI03').ads, 0);
  const plat = platformSignals({ ads, saa: seed.saa, regions: seed.regions, announcements: seed.announcements });
  assert.ok(plat.length >= 4 && plat.every((p) => p.title && p.evidence && p.suggestion));
});
