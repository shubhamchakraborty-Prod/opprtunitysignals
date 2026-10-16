// Coming up: announced projects that may create work nearby. Announcements and
// projections only; never counted as jobs.
import { app } from '../app.js';
import { esc, $ } from '../ui.js';
import { openTrade } from './trades.js';

export function renderUpcoming() {
  const a = app.data.announcements;
  const items = a?.items || [];
  $('#upcoming').innerHTML = `<div class="section-head"><div><h2>What is coming that could create work?</h2><p>Factories and projects announced in or near Noida. These are announcements, not vacancies. Job numbers are what the company or government said, and are not counted anywhere else on this site.</p></div></div>
  <div class="callout"><strong>How to use this:</strong> contact the companies early about apprenticeships and entry roles, and line up the trades and short courses listed under each project.</div>
  <div class="feeds-grid">${items.map((x) => `<div class="card feed">
    <div class="feed-head"><div><h3>${esc(x.title)}</h3><div class="note">${esc(x.who)} · ${esc(x.sector_area)}</div></div><span class="trust ${/opened|operational/i.test(x.stage) ? 'ok' : /proposal|approved/i.test(x.stage) ? 'old' : 'plan'}">${esc(x.stage.split(';')[0])}</span></div>
    <dl class="kv">
      <div><dt>Where</dt><dd>${esc(x.where)}<small>${esc(x.distance)}</small></dd></div>
      <div><dt>Investment</dt><dd>${esc(x.investment)}</dd></div>
      <div><dt>Jobs announced</dt><dd>${esc(x.jobs_claimed)}<small>Company or government projection, not checked</small></dd></div>
      <div><dt>Stage</dt><dd>${esc(x.stage)}</dd></div>
    </dl>
    <div><div class="section-label">Trades likely to be needed (our reading)</div><div class="badges">${x.trades.map((t) => `<button class="tag linktag" data-action="goto-trade" data-trade="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
    <p class="note"><strong>Next step:</strong> ${esc(x.next_step)}</p>
    <div class="actions">${x.sources.map((s) => `<a class="btn small ghost" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join('')}</div>
  </div>`).join('')}</div>
  <p class="note">${esc(a?.note || '')} Compiled ${esc(a?.compiled_at || '')} from news and government sources.</p>`;
}

app.actions['goto-trade'] = (el) => {
  openTrade(el.dataset.trade);
  app.actions.tab({ dataset: { tab: 'trades' } });
  window.scrollTo({ top: 0 });
};

app.views.upcoming = renderUpcoming;
