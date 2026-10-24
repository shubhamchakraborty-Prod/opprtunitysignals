// Shared application state and derived data. Views read from here; all
// counters are recomputed from the same core functions the server uses.
import { defaultFilters, filterOpportunities, filterPresence } from '../../src/core/filters.js';
import { representatives } from '../../src/core/dedupe.js';
import { computeKpis } from '../../src/core/analytics.js';
import { matchRecord } from '../../src/core/matching.js';
import { planningBoard } from '../../src/core/decisions.js';

/** At least a third of the named skills. */
export const SOME_OVERLAP = 1 / 3 - 1e-9;

const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage blocked */ } },
};

export const app = {
  /** @type {any} */ client: null,
  /** @type {any} */ data: null,
  state: {
    filters: defaultFilters(),
    selected: null,
    selectedGroup: null,
    tab: 'home',
    view: 'industry',
    /** Location picker value: all | 62 | 63 | kalyani | siliguri */
    place: 'all',
    layers: { approx: true, verified: true, presence: false },
    persona: 'iti_electronics',
    suits: '',
    adjust: {},
    shortlist: ls.get('noida-shortlist', []),
    verifyPrefill: null,
  },
  ls,
  /** @type {Record<string, (el: HTMLElement, ev: Event) => any>} */
  actions: {},
  /** @type {Record<string, (form: HTMLFormElement) => any>} */
  forms: {},
  /** @type {Record<string, any>} */
  views: {},
  /** Called when a page is left or the browser tab is hidden (stop timers). @type {Record<string, () => void>} */
  leave: {},
  /** Called when the browser tab becomes visible again. @type {Record<string, () => void>} */
  enter: {},
  derived: { visible: [], reps: [], kpis: null, presence: [] },

  can(perm) {
    return (this.data?.permissions || []).includes(perm);
  },

  /** Profiles a record may suit: no hard gate failed and at least partial skill overlap. */
  suitsFor(r) {
    const key = r.source_id + '|' + (r.verified_at || '') + '|' + r.verification_status;
    this._suits = this._suits || new Map();
    if (!this._suits.has(key)) this._suits.set(key, (this.data.profiles || []).filter((p) => {
      const m = matchRecord(p, r);
      return m.verdict !== 'gate_not_met' && m.overlap.ratio >= SOME_OVERLAP;
    }).map((p) => p.id));
    return this._suits.get(key);
  },

  /** Area for regional pages: noida_ncr, kalyani or siliguri. */
  area() {
    const p = this.state.place;
    return p === 'kalyani' || p === 'siliguri' ? p : 'noida_ncr';
  },

  profile(id) {
    return (this.data.profiles || []).find((p) => p.id === id) || null;
  },

  compute() {
    const f = this.state.filters;
    const suits = this.state.suits;
    const recs = suits ? this.data.records.filter((r) => this.suitsFor(r).includes(suits)) : this.data.records;
    const visible = filterOpportunities(recs, f);
    const reps = representatives(visible).sort((a, b) => (a.sector || a.geo.claimed_sector || '').localeCompare(b.sector || b.geo.claimed_sector || '') || a.source_id.localeCompare(b.source_id));
    this.derived = {
      visible,
      reps,
      presence: filterPresence(recs, f),
      kpis: computeKpis(recs.filter((r) => r.review.state === 'approved'), f, { asOf: this.data.asOf, pendingVerifications: this.data.pendingVerifications }),
      board: planningBoard(reps, this.data.asOf),
    };
    return this.derived;
  },

  mirrorsOf(r) {
    return this.data.records.filter((x) => x.dedupe_cluster === r.dedupe_cluster && x.source_id !== r.source_id && x.review.state === 'approved');
  },

  async refresh() {
    this.data = await this.client.bootstrap();
    this.compute();
    this.renderAll();
  },

  renderAll() {
    this.views.chrome?.();
    this.views.nav?.();
    this.views.discover?.();
    const v = this.views[this.state.tab];
    if (this.state.tab !== 'discover' && v) v();
  },
};
