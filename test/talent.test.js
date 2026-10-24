// Learner fit for ITI, diploma and degree; talent view for employers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSeed } from '../src/server/seed.js';
import { comparisonBase } from '../src/core/analytics.js';
import { learnerFit, acceptsType, demandByType } from '../src/core/learners.js';
import { ROLES, talentForRole, talentPools, payBenchmark } from '../src/core/talent.js';

const seed = loadSeed();
const ads = comparisonBase(seed.records.filter((r) => r.review.state === 'approved'), 'all');
const prog = (id) => seed.programmes.programmes.find((p) => p.id === id);

test('ads that name no qualification accept every learner type; named ones are respected', () => {
  const diplomaOnly = { education: { stated: true, accepted: ['diploma'] } };
  assert.equal(acceptsType(diplomaOnly, 'iti'), false);
  assert.equal(acceptsType(diplomaOnly, 'polytechnic'), true);
  assert.equal(acceptsType({ education: { stated: false, accepted: [] } }, 'college'), true);
  const d = demandByType(ads);
  assert.equal(d.length, 3);
  assert.ok(d.every((x) => x.ads <= ads.length && x.fresh <= x.ads && x.named <= x.ads));
});

test('every programme and trade gets a fit, and ITI matches the trade catalogue logic', () => {
  for (const p of seed.programmes.programmes) {
    const f = learnerFit({ type: p.type, programme: p }, ads);
    assert.ok(f.related.length + f.bridges.length > 0, p.id);
    for (const [, ids] of f.opens) assert.ok(ids.length > 0);
  }
  const elec = seed.trades.trades.find((t) => t.trade === 'Electrician');
  const f = learnerFit({ type: 'iti', programme: elec }, ads);
  assert.ok(f.related.length >= 1);
  assert.ok(f.opens.some(([s]) => s === 'English communication'));
  assert.ok(learnerFit({ type: 'polytechnic', programme: prog('dip-ece') }, ads).related.length >= 1);
});

test('talent view for a role: fits by background, gaps, pay from ads, institutes nearby', () => {
  const smt = ROLES.find((r) => r.id === 'smt');
  const t = talentForRole(smt, { trades: seed.trades.trades, programmes: seed.programmes.programmes, institutes: seed.demand.institutes, ads, area: 'noida_ncr' });
  assert.equal(t.fits.iti[0].name, 'Electronics Mechanic');
  assert.ok(t.fits.polytechnic.some((f) => f.id === 'dip-ece'));
  assert.ok([...t.fits.iti, ...t.fits.polytechnic, ...t.fits.college].every((f) => f.share >= 0.4));
  assert.ok(t.pay && t.pay.low <= t.pay.median && t.pay.median <= t.pay.high);
  assert.ok(t.institutes.length > 0 && t.institutes.every((i) => i.area === 'noida_ncr'));
  assert.equal(payBenchmark({ families: ['No such family'] }, ads), null, 'no pay shown without ads that state it');
  const pools = talentPools(seed.demand.institutes, 'kalyani');
  assert.ok(pools.every((p) => p.institutes.every((i) => i.area === 'kalyani')));
});
