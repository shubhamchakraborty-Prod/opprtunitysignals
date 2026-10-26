// Entry point: wire navigation, the location picker, delegated actions and forms, then load data.
import { app } from './app.js';
import { $, $$, download, errorBox } from './ui.js';
import { createClient } from './client.js';
import { renderExplore, bindFilters, syncFilterControls, fillSuitsOptions, select, closeDetail } from './views/explore.js';
import { initMap, invalidateMap } from './map.js';
import { renderNav, viewFor, viewOf, ALL_TABS, VIEWS } from './nav.js';
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
import { setRegion, currentRegion } from './views/regions.js';
import './views/home.js';
import './views/learn.js';
import './views/path.js';
import './views/institutes.js';
import './views/market.js';
import './views/signals.js';
import './views/internal-operations.js';
import './views/future-state-demo.js';
import './views/learner-home.js';
import './views/institution-home.js';
import './views/institution-intelligence.js';
import './views/talent.js';
import './views/industry-workflows.js';
import { openRoleDialog, openHelp, closeModal } from './views/chrome.js';
import { initLive } from './live.js';
import { startTour } from './tour.js';
import { initShowcase } from './showcase/showcase.js';

app.views.discover = renderExplore;
app.views.syncFilters = syncFilterControls;
app.views.select = select;

const REGIONS = ['kalyani', 'siliguri'];

/** Keep the location picker in step with what the page shows. */
export function syncLocation() {
  const sel = /** @type {HTMLSelectElement} */ ($('#location'));
  if (app.state.tab === 'regions') app.state.place = currentRegion();
  else if (['discover', 'compare'].includes(app.state.tab) && REGIONS.includes(app.state.place)) app.state.place = app.state.filters.sector;
  sel.value = app.state.place;
}

app.actions.tab = (el) => {
  const tab = el.dataset.tab;
  if (!ALL_TABS.includes(tab)) return;
  const prev = app.state.tab;
  if (prev !== tab) app.leave[prev]?.();
  app.state.tab = tab;
  app.state.view = viewFor(tab, app.state.view).id;
  app.ls.set('opx-view', app.state.view);
  renderNav();
  $$('.section').forEach((x) => x.classList.toggle('hide', x.id !== tab));
  $('#hero').classList.toggle('compact', tab !== 'discover');
  $('#scorecards').classList.toggle('compact', tab !== 'discover');
  if (tab !== 'discover' && app.state.selected) closeDetail();
  if (tab === 'discover') { app.views.discover(); invalidateMap(); }
  else app.views[tab]?.();
  syncLocation();
  const act = /** @type {HTMLElement|null} */ ($('.sub-tabs .tab.active'));
  if (act) { const bar = /** @type {HTMLElement} */ ($('#subTabs')); bar.scrollLeft = act.offsetLeft - bar.clientWidth / 2 + act.clientWidth / 2; }
  if (prev !== tab) window.scrollTo({ top: 0 });
  try { history.replaceState(null, '', '#' + tab); } catch { /* sandboxed */ }
};

app.actions.view = (el) => {
  const v = viewOf(el.dataset.view);
  app.state.view = v.id;
  app.actions.tab({ dataset: { tab: v.home } });
};


const AREA_PAGES = ['market', 'institutes', 'path', 'home', 'regions', 'lhome', 'ihome', 'idemand', 'ioutreach', 'talent', 'isupply', 'hire', 'apprentice', 'partner'];
function onLocation(v) {
  app.state.place = v;
  if (REGIONS.includes(v)) {
    setRegion(v);
    const hasRegions = viewOf(app.state.view).tabs.some(([t]) => t === 'regions');
    if (!AREA_PAGES.includes(app.state.tab) && hasRegions) app.actions.tab({ dataset: { tab: 'regions' } });
    else if (app.state.tab === 'discover') renderExplore();
    else app.views[app.state.tab]?.();
    return;
  }
  app.state.filters.sector = /** @type {any} */ (v);
  app.compute();
  if (app.state.tab === 'regions') app.actions.tab({ dataset: { tab: 'discover' } });
  else if (app.state.tab === 'discover') renderExplore();
  else app.views[app.state.tab]?.();
}

function wire() {
  $('#audTabs').addEventListener('click', (e) => {
    const v = /** @type {HTMLElement} */ (e.target).closest('.aud-tab');
    if (v) app.actions.view(/** @type {any} */ (v));
  });
  $('#subTabs').addEventListener('click', (e) => {
    const t = /** @type {HTMLElement} */ (e.target).closest('.tab');
    if (t) app.actions.tab(/** @type {any} */ (t));
  });
  for (const [bar, sel] of [['#audTabs', '.aud-tab'], ['#subTabs', '.tab']]) {
    $(bar).addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const tabs = $$(bar + ' ' + sel);
      const i = tabs.indexOf(/** @type {any} */ (document.activeElement));
      if (i < 0) return;
      e.preventDefault();
      tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].focus();
    });
  }
  $('#location').onchange = (e) => onLocation(/** @type {HTMLSelectElement} */ (e.target).value);
  $('#query').addEventListener('focus', () => { if (app.state.tab !== 'discover') app.actions.tab({ dataset: { tab: 'discover' } }); });
  document.addEventListener('click', (ev) => {
    const el = /** @type {HTMLElement} */ (ev.target).closest('[data-action]');
    if (!el) return;
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
    if (ev.key === '/' && !/input|textarea|select/i.test(el.tagName)) { ev.preventDefault(); $('#query').focus(); }
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) app.leave[app.state.tab]?.(); else app.enter[app.state.tab]?.(); });
  $('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) closeModal(); });
  $('#roleBtn').onclick = openRoleDialog;
  $('#helpBtn').onclick = openHelp;
  $('#exportBtn').onclick = async () => download(`Noida_62_63_job_ads_${app.data.asOf}.csv`, await app.client.exportRegister(app.state.filters), 'text/csv;charset=utf-8');
  bindFilters();
}

async function start() {
  app.state.view = app.ls.get('opx-view', 'learners');
  if (!VIEWS.some((v) => v.id === app.state.view)) app.state.view = 'learners';
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
  const want = location.hash.slice(1) || params.get('tab');
  const wantView = params.get('view');
  if (wantView && VIEWS.some((v) => v.id === wantView)) app.state.view = wantView;
  app.actions.tab({ dataset: { tab: ALL_TABS.includes(want) ? want : 'home' } });
  initLive();
  if (params.has('tour')) setTimeout(startTour, 600);
}

if (window.__OPX_SHOWCASE__) initShowcase();
else start();
