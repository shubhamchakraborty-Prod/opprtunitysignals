// Planning & outreach: which findings justify outreach and which are verified
// enough for ITI planning; demand coverage; management note export.
import { app } from '../app.js';
import { esc, $, toast, errorBox, download } from '../ui.js';
import { planningBoard, TIERS, wageText } from '../../../src/core/decisions.js';
import { demandCoverage, verifiedOpeningsByTrade } from '../../../src/core/analytics.js';
import { TRADES } from '../../../src/core/service.js';
import { filterOpportunities } from '../../../src/core/filters.js';
import { representatives } from '../../../src/core/dedupe.js';

const COL = { planning_ready: 'ready', outreach_priority: 'priority', outreach_optional: 'optional', context_only: 'context' };

export function renderPlan() {
  const approved = app.data.records.filter((r) => r.review.state === 'approved');
  const f = { ...app.state.filters, includeHistorical: true, includeUnclear: true };
  const reps = representatives(filterOpportunities(approved, f));
  const board = planningBoard(reps, app.data.asOf);
  const dc = demandCoverage(verifiedOpeningsByTrade(approved, app.data.asOf), app.data.passouts);
  $('#plan').innerHTML = `<div class="wide" style="max-width:1300px"><h2 class="section-title">What can we act on?</h2><p class="section-description">Each record is sorted by explicit rules. Only employer-confirmed, second-person-approved openings verified within 90 days are ready for ITI planning. Everything else is a reason to call an employer, or context. Uses the Explore filters (${f.sector === 'all' ? 'both sectors' : 'Sector ' + esc(f.sector)}), including older and unclear records so nothing is hidden.</p>
  <div class="board">${Object.keys(TIERS).map((t) => `<div class="board-col ${COL[t]}"><h4>${esc(TIERS[t].label)}</h4><span class="count">${board[t].length} record${board[t].length === 1 ? '' : 's'}</span>${board[t].map(({ r, reasons }) => `<div class="board-item"><strong><a href="#" data-action="open-record" data-id="${esc(r.source_id)}">${esc(r.role_title_raw)}</a></strong>${esc(r.employer_identity || r.recruiter_identity || 'Undisclosed')} · ${r.sector ? 'Sector ' + esc(r.sector) : 'location unclear'} · ${esc(wageText(r.wage))}<p>${esc(reasons.join(' '))}</p></div>`).join('') || '<p class="need">None yet.</p>'}</div>`).join('')}</div>
  <div class="grid2" style="margin-top:14px"><div class="section-panel"><div class="panel-head"><h3>Demand coverage</h3><span class="count">verified openings ÷ expected ITI pass-outs</span></div>
  ${dc.rows.length ? `<table class="minitable"><tr><th>Trade</th><th>Verified openings</th><th>Expected pass-outs</th><th>Coverage</th><th>Why</th></tr>${dc.rows.map((r) => `<tr><td>${esc(r.trade.replace(/_/g, ' '))}</td><td>${r.openings}</td><td>${r.expected_passouts ?? 'Not available'}</td><td><strong>${esc(r.display)}</strong></td><td>${esc(r.reasons.join(' ') || (r.source ? 'Source: ' + r.source : ''))}</td></tr>`).join('')}</table>` : `<p class="need"><strong>Not available.</strong></p><ul class="need">${dc.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`}
  <p class="need">No placeholder denominator is ever used. A ratio appears only when a trade has employer-confirmed openings and an approved pass-out figure for the Gautam Buddh Nagar catchment.</p>
  ${app.can('admin:passouts') ? passoutForm() : ''}</div>
  <div class="section-panel"><div class="panel-head"><h3>Management note</h3><span class="count">Facts · inferences · recommendations</span></div><p class="need">A one-page note for officials: sources, filters, freshness, confidence, what is known and what must be verified. Generated from the current filters.</p><div class="detail-actions" style="margin:8px 0 12px"><button class="btn strong" data-action="note-download">Download note (.md)</button><button class="btn" data-action="note-preview">Preview</button><button class="btn" data-action="register-download">Download source register (.csv)</button></div><div id="notePreview"></div></div></div></div>`;
}

function passoutForm() {
  return `<form class="form" data-form="passouts" style="margin-top:12px"><fieldset><legend>Load an authorised pass-out figure (administrator)</legend><div class="form-grid">
  <div><label for="poTrade">Trade</label><select id="poTrade" name="trade">${TRADES.filter((t) => t !== 'non_iti').map((t) => `<option value="${t}">${t.replace(/_/g, ' ')}</option>`).join('')}</select></div>
  <div><label for="poYear">Year</label><input id="poYear" name="year" type="number" min="2024" max="2035" value="2027"/></div>
  <div><label for="poN">Expected pass-outs</label><input id="poN" name="expected_passouts" type="number" min="0" required/></div>
  <div><label for="poSrc">Source (dataset and owner)</label><input id="poSrc" name="source" required placeholder="e.g. DGT / state directorate dataset, date"/></div>
  </div><div class="hint">Catchment: Gautam Buddh Nagar. Only load figures from an authorised dataset.</div><button class="btn" type="submit" style="margin-top:8px">Save pass-out figure</button></fieldset></form>`;
}

app.actions['note-preview'] = async () => {
  const md = await app.client.managementNote(app.state.filters);
  $('#notePreview').innerHTML = `<div class="note-preview">${esc(md)}</div>`;
};
app.actions['note-download'] = async () => {
  download(`Noida_62_63_management_note_${app.data.asOf}.md`, await app.client.managementNote(app.state.filters), 'text/markdown;charset=utf-8');
};
app.actions['register-download'] = async () => {
  download(`Noida_62_63_source_register_${app.data.asOf}.csv`, await app.client.exportRegister(app.state.filters), 'text/csv;charset=utf-8');
};
app.actions['open-record'] = (el, ev) => {
  ev.preventDefault();
  app.actions.tab({ dataset: { tab: 'discover' } });
  const f = app.state.filters;
  const r = app.data.records.find((x) => x.source_id === el.dataset.id);
  if (r && (r.verification_status === 'historical' || r.verification_status === 'expired')) f.includeHistorical = true;
  if (r && r.geo.scope_status !== 'in_scope') f.includeUnclear = true;
  app.views.syncFilters();
  app.compute();
  app.views.discover();
  app.views.select(el.dataset.id);
  $('#detailPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
app.forms = app.forms || {};
app.forms.passouts = async (form) => {
  const fd = new FormData(form);
  try {
    await app.client.setPassouts([{ trade: fd.get('trade'), catchment: 'Gautam Buddh Nagar', year: Number(fd.get('year')), expected_passouts: Number(fd.get('expected_passouts')), source: String(fd.get('source') || '') }]);
    toast('Pass-out figure saved and logged');
    await app.refresh();
  } catch (e) {
    form.insertAdjacentHTML('afterbegin', errorBox(e));
  }
};

app.views.plan = renderPlan;
