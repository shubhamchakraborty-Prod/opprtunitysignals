// Shared application state and derived data. Views read from here; all
// counters are recomputed from the same core functions the server uses.
import { defaultFilters, filterOpportunities, filterPresence } from '../../src/core/filters.js';
import { representatives } from '../../src/core/dedupe.js';
import { computeKpis } from '../../src/core/analytics.js';

const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};

export const app = {
  /** @type {any} */ client: null,
  /** @type {any} */ data: null,
  state: {
    filters: defaultFilters(),
    selected: null,
    selectedGroup: null,
    tab: 'discover',
    layers: { approx: true, verified: true, presence: false },
    persona: 'iti_electronics',
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
  derived: { visible: [], reps: [], kpis: null, presence: [] },

  can(perm) {
    return (this.data?.permissions || []).includes(perm);
  },

  compute() {
    const recs = this.data.records;
    const f = this.state.filters;
    const visible = filterOpportunities(recs, f);
    const reps = representatives(visible).sort((a, b) => (a.sector || a.geo.claimed_sector || '').localeCompare(b.sector || b.geo.claimed_sector || '') || a.source_id.localeCompare(b.source_id));
    this.derived = {
      visible,
      reps,
      presence: filterPresence(recs, f),
      kpis: computeKpis(recs.filter((r) => r.review.state === 'approved'), f, { asOf: this.data.asOf, pendingVerifications: this.data.pendingVerifications }),
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
    this.views.discover?.();
    const v = this.views[this.state.tab];
    if (this.state.tab !== 'discover' && v) v();
  },
};
