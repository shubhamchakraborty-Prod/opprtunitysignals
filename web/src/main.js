// Entry point: wire tabs, delegated actions and forms, then load data.
import { app } from './app.js';
import { $, $$, download, errorBox } from './ui.js';
import { createClient } from './client.js';
import { renderExplore, bindFilters, syncFilterControls, fillSuitsOptions, select, closeDetail } from './views/explore.js';
import { initMap, invalidateMap } from './map.js';
import './views/compare.js';
import './views/match.js';
import './views/voice.js';
import './views/plan.js';
import './views/review.js';
import './views/verify.js';
import './views/register.js';
import './views/feeds.js';
import './views/trades.js';
import './views/upcoming.js';
import './views/regions.js';
import { openRoleDialog, openGuide, openHelp, closeModal } from './views/chrome.js';

app.views.discover = renderExplore;
app.views.syncFilters = syncFilterControls;
app.views.select = select;

const TABS = ['discover', 'match', 'trades', 'compare', 'plan', 'upcoming', 'regions', 'feeds', 'voice', 'evidence', 'review', 'verify'];

app.actions.tab = (el) => {
  const tab = el.dataset.tab;
  if (!TABS.includes(tab)) return;
  app.state.tab = tab;
  $$('.tab').forEach((x) => { x.classList.toggle('active', x.dataset.tab === tab); x.setAttribute('aria-selected', String(x.dataset.tab === tab)); });
  $$('.section').forEach((x) => x.classList.toggle('hide', x.id !== tab));
  $('#hero').classList.toggle('compact', tab !== 'discover');
  if (tab !== 'discover' && app.state.selected) closeDetail();
  if (tab === 'discover') invalidateMap();
  else app.views[tab]?.();
  try { history.replaceState(null, '', '#' + tab); } catch { /* sandboxed */ }
};

function wire() {
  $$('.tab').forEach((b) => (b.onclick = () => app.actions.tab(b)));
  $('.tabs').addEventListener('keydown', (e) => {
    const tabs = $$('.tab').filter((t) => !t.hidden);
    const i = tabs.indexOf(/** @type {any} */ (document.activeElement));
    if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    n.focus();
    n.click();
  });
  document.addEventListener('click', (ev) => {
    const el = /** @type {HTMLElement} */ (ev.target).closest('[data-action]');
    if (!el || el.classList.contains('tab')) return;
    const fn = app.actions[el.dataset.action];
    if (fn) fn(el, ev);
  });
  document.addEventListener('keydown', (ev) => {
    const el = /** @type {HTMLElement} */ (ev.target);
    if ((ev.key === 'Enter' || ev.key === ' ') && el.matches?.('[role=button][data-action]') && el.tagName !== 'BUTTON') {
      ev.preventDefault();
      app.actions[el.dataset.action]?.(el, ev);
    }
    if (ev.key === 'Escape') {
      if (!$('#modal').classList.contains('hide')) closeModal();
      else if (app.state.selected || app.state.selectedGroup) closeDetail();
    }
  });
  document.addEventListener('submit', (ev) => {
    const form = /** @type {HTMLFormElement} */ (ev.target);
    const fn = app.forms[form.dataset.form];
    if (fn) {
      ev.preventDefault();
      form.parentElement?.querySelectorAll('.errors').forEach((x) => x.remove());
      fn(form);
    }
  });
  $('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) closeModal(); });
  $('#roleBtn').onclick = openRoleDialog;
  $('#helpBtn').onclick = openHelp;
  $('#exportBtn').onclick = async () => download(`Noida_62_63_job_ads_${app.data.asOf}.csv`, await app.client.exportRegister(app.state.filters), 'text/csv;charset=utf-8');
  bindFilters();
}

async function start() {
  wire();
  const seed = JSON.parse($('#seed').textContent);
  try {
    app.client = await createClient(seed);
    app.data = await app.client.bootstrap();
  } catch (e) {
    $('#main').insertAdjacentHTML('afterbegin', errorBox(e));
    return;
  }
  fillSuitsOptions();
  app.compute();
  app.renderAll();
  initMap();
  const params = new URLSearchParams(location.search);
  const want = params.get('tab') || location.hash.slice(1);
  if (TABS.includes(want)) app.actions.tab({ dataset: { tab: want } });
  if (!app.ls.get('noida-guide-done', false) && !params.has('noguide')) openGuide();
}

start();
