// Government data: health of each tracked government API and its latest figures.
import { app } from '../app.js';
import { esc, $, fmtDate, toast, errorBox, artBox } from '../ui.js';
import { mountSimulation } from './feeds-sim.js';
import { feedSummary } from '../../../src/core/govdata.js';

const ACCESS = { open_api: 'Open API, no key needed', api_key: 'Open API, free key needed', agreement: 'No open API: needs a data-sharing agreement' };
const TONE = { ok: 'ok', warn: 'warn', bad: 'bad', plan: 'plan', old: 'old' };
let lastError = '';
/** @type {{stop:()=>void,start:()=>void}|null} */
let sim = null;

const when = (iso) => (iso ? `${fmtDate(iso)}, ${new Date(iso).toISOString().slice(11, 16)} UTC` : 'Never');
const every = (h) => (h % 24 === 0 ? (h === 24 ? 'Daily' : h === 168 ? 'Weekly' : h === 720 ? 'Monthly' : `Every ${h / 24} days`) : `Every ${h} hours`);

function plainError(e) {
  if (!e) return '';
  if (/could not connect|ENOTFOUND|ECONN|fetch failed|timeout|aborted/i.test(e)) return 'Could not connect to the portal (network rule, or the portal is down).';
  if (/HTTP 401|HTTP 403/.test(e)) return 'The portal refused access. Check the API key.';
  if (/HTTP 404/.test(e)) return 'The portal says this dataset or address does not exist. Check the resource ID.';
  if (/HTTP 5\d\d/.test(e)) return 'The portal had an internal error. It will be retried.';
  return e;
}

function todo(f) {
  switch (f.health.status) {
    case 'needs_key': return `Get a free API key from ${esc(f.portal)} and add it to the server as <span class="mono">${esc(f.key_env)}</span>.`;
    case 'needs_setup': return `${esc(f.setup || 'Add the dataset’s resource ID.')} Server setting: <span class="mono">${esc(f.resource_env)}</span>.`;
    case 'agreement': return esc(f.terms);
    case 'unreachable': return 'Allow the portal’s address in the server’s network settings, or wait if the portal is down.';
    case 'failing': return 'Check the error below. It is retried every hour.';
    case 'stale': return 'Fetching has stopped working. Check the server and the last error.';
    case 'not_run': return 'Will be fetched on the next scheduled check.';
    default: return '';
  }
}

function strip(history) {
  if (!history.length) return '';
  return `<div class="runstrip" aria-label="Last ${history.length} fetches">${history.slice().reverse().map((h) => `<i class="${h.ok ? 'ok' : 'bad'}" title="${esc(when(h.at))}: ${h.ok ? 'success' : 'failed'}"></i>`).join('')}</div>`;
}

function feedCard(f, canSync) {
  const h = f.health;
  return `<div class="card feed"><div class="feed-head"><div><h3>${esc(f.name)}</h3><div class="note">${esc(f.portal)} · ${esc(f.publisher)}</div></div><span class="trust ${TONE[h.tone]}" title="${esc(h.help)}">${esc(h.label)}</span></div>
  <p>${esc(f.what)}</p>
  <dl class="kv">
    <div><dt>Access</dt><dd>${esc(ACCESS[f.access] || f.access)}</dd></div>
    <div><dt>How often we check</dt><dd>${f.access === 'agreement' ? 'Not checked' : every(f.refresh_hours)}</dd></div>
    <div><dt>Last good data</dt><dd>${when(h.last_success)}${h.rows != null ? `<small>${h.rows} rows${h.changed === false ? ', unchanged since the previous fetch' : ''}</small>` : ''}</dd></div>
    <div><dt>Next check</dt><dd>${h.next_due ? when(h.next_due) : '-'}</dd></div>
  </dl>
  ${h.last_error ? `<div class="callout warn"><strong>Last attempt ${esc(when(h.last_attempt))}:</strong> ${esc(plainError(h.last_error))}</div>` : ''}
  ${strip(h.history)}
  ${todo(f) ? `<p class="note"><strong>What is needed:</strong> ${todo(f)}</p>` : ''}
  <div class="actions"><a class="btn small" href="${esc(f.portal_url)}" target="_blank" rel="noopener">Portal ↗</a>${f.docs_url ? `<a class="btn small ghost" href="${esc(f.docs_url)}" target="_blank" rel="noopener">API documentation ↗</a>` : ''}${canSync && f.access !== 'agreement' ? `<button class="btn small" data-action="feed-sync" data-id="${esc(f.id)}">Check now</button>` : ''}</div></div>`;
}

function plfsTable(f) {
  const rows = f.latest.rows.filter((r) => r.value != null);
  if (!rows.length) return '<p class="note">The portal returned no figures for these filters.</p>';
  const inds = [...new Set(rows.map((r) => r.indicator))];
  const periods = [...new Set(rows.map((r) => r.period))].sort().slice(-4);
  const areas = [...new Set(rows.map((r) => r.area))];
  const cell = (ind, area, p) => rows.find((r) => r.indicator === ind && r.area === area && r.period === p)?.value;
  return `<div class="table-scroll"><table class="minitable"><tr><th>Figure</th><th>Area</th>${periods.map((p) => `<th>${esc(p)}</th>`).join('')}</tr>${inds.flatMap((ind) => areas.map((a, i) => `<tr><td>${i === 0 ? esc(ind) : ''}</td><td>${esc(a)}</td>${periods.map((p) => { const v = cell(ind, a, p); return `<td>${v == null ? '-' : esc(v.toFixed(1))}</td>`; }).join('')}</tr>`)).join('')}</table></div>`;
}

function rawTable(f) {
  const rows = f.latest.rows.slice(0, 20).map((r) => r.raw || r);
  if (!rows.length) return '<p class="note">The dataset returned no rows.</p>';
  const cols = Object.keys(rows[0]).slice(0, 6);
  return `<div class="table-scroll"><table class="minitable"><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</table></div>${f.latest.rows.length > 20 ? `<p class="note">Showing 20 of ${f.latest.rows.length} rows.</p>` : ''}`;
}

export async function renderFeeds() {
  const root = $('#feeds');
  root.innerHTML = '<p class="note">Loading government data…</p>';
  let gov;
  try {
    gov = await app.client.govStatus();
  } catch (e) {
    root.innerHTML = errorBox(e);
    return;
  }
  const live = app.client.mode === 'api';
  const canSync = live && app.can('admin:feeds');
  const s = feedSummary(gov.feeds);
  const withData = gov.feeds.filter((f) => f.latest?.rows?.length);
  sim?.stop();
  root.innerHTML = `<div class="section-head">${artBox('feeds')}<div><div class="eyebrow">Government data</div><h2>Live data from government sources</h2><p>The top panel is a simulation of how live feeds would look once keys and agreements are in place. Below it is the real status of every source we track: what works today, and what each one still needs.</p></div></div>
  <div id="simRoot" class="section"></div>
  <div class="divider-title"><h2>Real connection status</h2></div>
  <p class="note" style="margin-top:-8px">We check official government sources on a schedule and show whether each one is working. Figures appear here only after a successful fetch from the portal, with the date we fetched them.</p>
  ${canSync ? '<div class="actions"><button class="btn primary" data-action="feed-sync" data-id="">Check all sources now</button></div>' : ''}${lastError}
  <div class="answers">
    <div class="answer"><span class="label">Sources tracked</span><span class="big">${s.total}</span><span class="sub">MoSPI, data.gov.in, NCS, DGT, e-Shram</span></div>
    <div class="answer ${s.live ? 'good' : ''}"><span class="label">Working now</span><span class="big">${s.live}</span><span class="sub">Fetched on schedule</span></div>
    <div class="answer ${s.attention ? 'wait' : ''}"><span class="label">Need attention</span><span class="big">${s.attention}</span><span class="sub">Failing, unreachable or out of date</span></div>
    <div class="answer"><span class="label">Waiting for access</span><span class="big">${s.setup + s.agreement}</span><span class="sub">${s.setup} need a key or setup · ${s.agreement} need an agreement</span></div>
  </div>
  ${live ? '' : `<div class="callout"><strong>This is a saved copy</strong> taken ${esc(when(gov.generated_at))}. The live server checks the portals every 15 minutes and refreshes each source on its schedule.</div>`}
  ${withData.length ? withData.map((f) => `<div class="card"><div class="card-head"><h3>Latest figures: ${esc(f.name)}</h3><small>Fetched ${esc(when(f.latest.fetched_at))} from ${esc(f.portal)}</small></div><div class="card-body">${f.id.startsWith('mospi') ? plfsTable(f) : rawTable(f)}<p class="note" style="margin-top:8px">Source: ${esc(f.publisher)}. ${esc(f.terms)}</p></div></div>`).join('') : `<div class="empty-state"><span class="trust old">No figures yet</span><h3>No government figures fetched yet</h3><p>As soon as a source below is reachable and set up, its latest figures appear here with the date they were fetched. Nothing is estimated or filled in by hand.</p></div>`}
  <div class="feeds-grid">${gov.feeds.map((f) => feedCard(f, canSync)).join('')}</div>`;
  lastError = '';
  sim = mountSimulation(/** @type {HTMLElement} */ ($('#simRoot')));
}

app.actions['feed-sync'] = async (el) => {
  el.disabled = true;
  el.textContent = 'Checking…';
  try {
    const res = await app.client.govSync(el.dataset.id || null);
    const bad = res.results.filter((r) => r.status === 'error').length;
    toast(bad ? `${bad} source${bad > 1 ? 's' : ''} failed; see details` : 'Sources checked');
  } catch (e) {
    lastError = errorBox(e);
  }
  renderFeeds();
};

app.views.feeds = renderFeeds;
app.leave.feeds = () => sim?.stop();
app.enter.feeds = () => sim?.start();
