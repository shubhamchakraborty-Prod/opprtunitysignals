// Next steps: what is ready for ITI planning, which employers to call,
// whether there are enough jobs for pass-outs, and the management note.
import { app } from '../app.js';
import { esc, $, toast, errorBox, download, sectorTag } from '../ui.js';
import { planningBoard, wageText } from '../../../src/core/decisions.js';
import { demandCoverage, verifiedOpeningsByTrade } from '../../../src/core/analytics.js';
import { TRADES } from '../../../src/core/service.js';
import { filterOpportunities } from '../../../src/core/filters.js';
import { representatives } from '../../../src/core/dedupe.js';

const COLS = [
  ['planning_ready', 'ready', 'Ready for ITI planning', 'Confirmed by the employer in the last 90 days and approved.'],
  ['outreach_priority', 'priority', 'Call these employers first', 'Entry-level roles linked to an ITI trade.'],
  ['outreach_optional', 'optional', 'Call if time allows', 'Other current ads in the two sectors.'],
  ['context_only', 'context', 'Background only', 'Old, closed or unclear. Do not plan on these.'],
];

export function renderPlan() {
  const approved = app.data.records.filter((r) => r.review.state === 'approved');
  const f = { ...app.state.filters, includeHistorical: true, includeUnclear: true };
  const reps = representatives(filterOpportunities(approved, f));
  const board = planningBoard(reps, app.data.asOf);
  const dc = demandCoverage(verifiedOpeningsByTrade(approved, app.data.asOf), app.data.passouts);
  $('#plan').innerHTML = `<div class="section-head"><div><h2>What should we do next?</h2><p>Every ad is sorted by fixed rules. Only jobs an employer has confirmed, and a second person has approved, are ready for ITI planning. Showing ${f.sector === 'all' ? 'both sectors' : 'Sector ' + esc(f.sector)}, including old and unclear ads so nothing is hidden.</p></div></div>
  <div class="board">${COLS.map(([t, cls, title, desc]) => `<div class="board-col ${cls}"><h4>${esc(title)}</h4><span class="count">${board[t].length} ad${board[t].length === 1 ? '' : 's'} · ${esc(desc)}</span>${board[t].map(({ r, reasons }) => `<div class="board-item"><a href="#" data-action="open-record" data-id="${esc(r.source_id)}">${esc(r.role_title_raw)}</a><span>${esc(r.employer_identity || r.recruiter_identity || 'Employer not named')} · ${esc(wageText(r.wage))}</span><div>${sectorTag(r)}</div><p>${esc(reasons.join(' '))}</p></div>`).join('') || '<p class="note" style="margin-top:8px">Nothing here yet.</p>'}</div>`).join('')}</div>
  <div class="grid2">
  <div class="card card-body" style="display:flex;flex-direction:column;gap:12px"><div><div class="section-label">Are there enough jobs for our ITI learners?</div><h3 style="font-size:19px">${dc.rows.some((r) => r.ratio != null) ? 'Confirmed jobs per expected pass-out' : 'Not available yet'}</h3></div>
  ${dc.rows.length ? `<div class="table-scroll"><table class="minitable"><tr><th>Trade</th><th>Confirmed jobs</th><th>Expected pass-outs</th><th>Jobs per pass-out</th><th>Note</th></tr>${dc.rows.map((r) => `<tr><td>${esc(r.trade.replace(/_/g, ' '))}</td><td>${r.openings}</td><td>${r.expected_passouts ?? 'Not available'}</td><td><strong>${esc(r.display)}</strong></td><td>${esc(r.reasons.join(' ') || (r.source ? 'Source: ' + r.source : ''))}</td></tr>`).join('')}</table></div>` : `<ul style="margin:0;padding-left:18px;color:var(--ink-2)">${dc.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`}
  <p class="note">We never guess the number of pass-outs. A figure appears only when a trade has confirmed jobs and an approved pass-out count for Gautam Buddh Nagar.</p>
  ${app.can('admin:passouts') ? passoutForm() : ''}</div>
  <div class="card card-body" style="display:flex;flex-direction:column;gap:12px"><div><div class="section-label">Share with officials</div><h3 style="font-size:19px">One-page management note</h3></div><p style="color:var(--ink-2)">Lists the sources, filters, how fresh the data is, what is known and what still has to be checked. Built from your current filters.</p><div class="actions"><button class="btn primary" data-action="note-download">Download note</button><button class="btn" data-action="note-preview">Preview</button><button class="btn" data-action="register-download">Download all sources (CSV)</button></div><div id="notePreview"></div></div>
  </div>`;
}

function passoutForm() {
  return `<form class="form" data-form="passouts"><fieldset><legend>Add an approved pass-out figure</legend><div class="form-grid">
  <div><label for="poTrade">Trade</label><select id="poTrade" name="trade">${TRADES.filter((t) => t !== 'non_iti').map((t) => `<option value="${t}">${t.replace(/_/g, ' ')}</option>`).join('')}</select></div>
  <div><label for="poYear">Year</label><input id="poYear" name="year" type="number" min="2024" max="2035" value="2027"/></div>
  <div><label for="poN">Expected pass-outs</label><input id="poN" name="expected_passouts" type="number" min="0" required/></div>
  <div><label for="poSrc">Source</label><input id="poSrc" name="source" required placeholder="Dataset, owner and date"/></div>
  </div><div class="hint">Area: Gautam Buddh Nagar. Use only figures from an authorised dataset.</div><div><button class="btn" type="submit">Save figure</button></div></fieldset></form>`;
}

app.actions['note-preview'] = async () => {
  const md = await app.client.managementNote(app.state.filters);
  $('#notePreview').innerHTML = `<div class="note-preview">${esc(md)}</div><div class="actions" style="margin-top:8px"><button class="btn small" data-action="note-copy">Copy note text</button></div>`;
};
app.actions['note-copy'] = async () => {
  const text = $('#notePreview .note-preview')?.textContent || '';
  try {
    await navigator.clipboard.writeText(text);
    toast('Note copied');
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('#notePreview .note-preview'));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    toast('Text selected. Press Ctrl+C to copy.');
  }
};
app.actions['note-download'] = async () => {
  await download(`Noida_62_63_management_note_${app.data.asOf}.md`, await app.client.managementNote(app.state.filters), 'text/markdown;charset=utf-8');
};
app.actions['register-download'] = async () => {
  await download(`Noida_62_63_source_register_${app.data.asOf}.csv`, await app.client.exportRegister(app.state.filters), 'text/csv;charset=utf-8');
};
app.actions['open-record'] = (el, ev) => {
  ev?.preventDefault();
  const f = app.state.filters;
  const r = app.data.records.find((x) => x.source_id === el.dataset.id);
  if (r && (r.verification_status === 'historical' || r.verification_status === 'expired')) f.includeHistorical = true;
  if (r && r.geo.scope_status !== 'in_scope') f.includeUnclear = true;
  app.state.suits = '';
  app.actions.tab({ dataset: { tab: 'discover' } });
  app.views.syncFilters();
  app.compute();
  app.views.discover();
  app.views.select(el.dataset.id);
};
app.forms.passouts = async (form) => {
  const fd = new FormData(form);
  try {
    await app.client.setPassouts([{ trade: fd.get('trade'), catchment: 'Gautam Buddh Nagar', year: Number(fd.get('year')), expected_passouts: Number(fd.get('expected_passouts')), source: String(fd.get('source') || '') }]);
    toast('Pass-out figure saved');
    await app.refresh();
  } catch (e) {
    form.insertAdjacentHTML('afterbegin', errorBox(e));
  }
};

app.views.plan = renderPlan;
