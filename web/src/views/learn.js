// Learners: pick what you studied, see the jobs here you could do now, the
// skills that open more jobs, and the Swift AI Academy course (or another
// provider) that teaches each one.
import { app } from '../app.js';
import { esc, $, artBox, icon, toast, sectorTag } from '../ui.js';
import { wageText } from '../../../src/core/decisions.js';
import { profileBar, fitNow } from './learner-profile.js';
import { offeringsFor } from '../../../src/core/signals.js';

export function adRow(id, extra = '') {
  const r = app.data.records.find((x) => x.source_id === id);
  if (!r) return '';
  return `<li class="ad-row"><div><a href="#" data-action="open-record" data-id="${esc(id)}">${esc(r.role_title_raw)}</a><div class="note">${esc(r.employer_identity || 'Employer not named')} · ${esc(wageText(r.wage))}</div>${extra}</div>${sectorTag(r)}</li>`;
}

export function courseCard(skills, jobs) {
  const skill = skills[0];
  const saa = app.data.saa;
  const map = saa.skill_map[skill];
  const trade = (saa.trade_skills || []).includes(skill);
  const c = map && map.fit !== 'none' ? saa.courses.find((x) => x.id === map.courses[0]) : null;
  const others = offeringsFor(skill, app.data.providers).slice(0, 2);
  const pname = (id) => app.data.providers?.providers?.find((p) => p.id === id)?.name || id;
  const unlock = `<span class="unlock">${icon('north_east')}Opens ${jobs} job${jobs === 1 ? '' : 's'} here</span>`;
  if (c) {
    const track = saa.tracks.find((t) => t.id === c.track);
    return `<article class="plan-step saa"><div class="ps-head"><div><div class="eyebrow">Learn ${esc(skills.join(', '))}</div><h4>${esc(c.title)}</h4><div class="note">Swift AI Academy · ${esc(track?.name || '')} pathway</div></div>${unlock}</div>
    <div class="ps-facts"><span>${icon('schedule')}${esc(c.hours)} hours</span><span>${icon('school')}${esc(c.level || '')}</span><span>${icon('public')}${esc(c.languages.join(', '))}</span><span>${esc(c.mode || '')}</span></div>
    <p>${esc(c.overview)}</p>${map.fit === 'partial' ? `<p class="note"><strong>Partly covers this skill.</strong> ${esc(map.gap || '')}</p>` : ''}
    <div class="actions"><button class="btn primary small" data-action="saa-start" data-course="${esc(c.id)}">${icon('school')}Start on Swift AI Academy</button>${others.length ? `<details class="disclose"><summary>Other options (${others.length})</summary><ul class="offers">${others.map((o) => `<li><a href="${esc(o.url || '#')}" target="_blank" rel="noopener">${esc(o.title)}</a><span class="note">${esc(pname(o.provider))}${o.cost && o.cost !== 'unknown' ? ' · ' + esc(o.cost) : ''}</span></li>`).join('')}</ul></details>` : ''}</div></article>`;
  }
  return `<article class="plan-step ${trade ? 'trade' : 'other'}"><div class="ps-head"><div><div class="eyebrow">Learn ${esc(skills.join(', '))}</div><h4>${trade ? 'Hands-on trade training' : 'Not on Swift AI Academy yet'}</h4><div class="note">${trade ? 'ITI, NSTI or Sector Skill Council course' : 'Courses from other providers'}</div></div>${unlock}</div>
  ${others.length ? `<ul class="offers">${others.map((o) => `<li><a href="${esc(o.url || '#')}" target="_blank" rel="noopener">${esc(o.title)}</a><span class="note">${esc(pname(o.provider))}${o.nsqf_level != null ? ' · NSQF ' + esc(o.nsqf_level) : ''}${o.cost && o.cost !== 'unknown' ? ' · ' + esc(o.cost) : ''}</span></li>`).join('')}</ul>` : `<p class="note">${esc(app.data.courses?.skills?.[skill]?.course || 'Ask your institute for a short course.')}</p>`}</article>`;
}

/** Skill-plan cards for the current fit: one card per course (skills taught by the same course are grouped). */
export function planCards(fit, max = 6) {
  const keyOf = (s) => { const m = app.data.saa.skill_map[s]; return m && m.fit !== 'none' ? 'saa:' + m.courses[0] : 'ext:' + (offeringsFor(s, app.data.providers).map((o) => o.title).join('|') || s); };
  const groups = new Map();
  for (const [s, ids] of fit.opens) { const k = keyOf(s); if (!groups.has(k)) groups.set(k, { skills: [], jobs: new Set() }); const g = groups.get(k); g.skills.push(s); ids.forEach((j) => g.jobs.add(j)); }
  return [...groups.values()].sort((a, b) => b.jobs.size - a.jobs.size).slice(0, max);
}

export function renderLearn() {
  const root = $('#learn');
  if (!app.data.trades || !app.data.saa) { root.innerHTML = '<p class="note">Course data not loaded.</p>'; return; }
  const { p, fit } = fitNow();
  const cards = planCards(fit);
  const saaIds = [...new Set(cards.flatMap((g) => g.skills).map((s) => app.data.saa.skill_map[s]).filter((m) => m && m.fit !== 'none').map((m) => m.courses[0]))];
  const hours = saaIds.reduce((n, id) => n + (app.data.saa.courses.find((c) => c.id === id)?.hours || 0), 0);
  root.innerHTML = `<div class="section-head">${artBox('learn')}<div><div class="eyebrow">My skill plan</div><h2>Which skills would get you more jobs here?</h2><p>We match what you studied against current job ads in Noida Sectors 62 and 63, then list the short courses that open the most jobs.</p></div></div>
  ${profileBar()}
  <div class="answers">
    <div class="answer"><span class="label">${icon('work')}Jobs that fit what you studied</span><span class="big">${fit.related.length}</span><span class="sub">${fit.fresh} open to freshers</span></div>
    <div class="answer go"><span class="label">${icon('north_east')}More jobs after a short course</span><span class="big">${fit.bridges.length}</span><span class="sub">Open to freshers, outside your field</span></div>
    <div class="answer"><span class="label">${icon('school')}Swift AI Academy courses that help</span><span class="big">${saaIds.length}</span><span class="sub">${hours ? `About ${hours} hours in total` : 'None needed for these jobs'}</span></div>
    <div class="answer"><span class="label">${icon('construction')}What you already know</span><span class="big">${p.programme.core_skills.length}</span><span class="sub">${esc(p.programme.core_skills.slice(0, 3).join(', '))}${p.programme.core_skills.length > 3 ? '…' : ''}</span></div>
  </div>
  <div class="learn-grid">
    <div class="card"><div class="card-head"><h3>Your skill plan</h3><small>Most useful first</small></div><div class="card-body plan-steps">${cards.length ? cards.map((g) => courseCard(g.skills, g.jobs.size)).join('') : '<p class="note">The current ads ask for nothing you have not already learned. Look at Coming up for future work.</p>'}</div></div>
    <div class="region-side">
      <div class="card"><div class="card-head"><h3>Adverts related to your programme</h3><small>${fit.related.length} potentially relevant ads, not confirmed vacancies</small></div><div class="card-body">${fit.related.length ? `<ul class="ad-list">${fit.related.slice(0, 6).map((x) => adRow(x.source_id, x.missing.length ? `<div class="note">Also asks: ${esc(x.missing.join(', '))}</div>` : '')).join('')}</ul>` : '<p class="note">No current ads fit this exactly. The jobs below are reachable with a short course.</p>'}</div></div>
      <div class="card"><div class="card-head"><h3>After a short course</h3><small>${fit.bridges.length} jobs outside your field</small></div><div class="card-body">${fit.bridges.length ? `<ul class="ad-list">${fit.bridges.slice(0, 6).map((b) => adRow(b.source_id, `<div class="note">Add: ${esc(b.gaps.join(', '))}</div>`)).join('')}</ul>` : '<p class="note">None open to freshers in the current sample.</p>'}</div></div>
    </div>
  </div>
  <p class="note">Swift AI Academy course details come from the product document; hours are notional and credits and NSQF levels are still to be confirmed. Other providers come from a web search on 24 Oct 2026; check the provider’s page before enrolling. Diploma and degree skills are typical, not an official syllabus.</p>`;
}

app.actions['saa-start'] = (el) => {
  const c = app.data.saa.courses.find((x) => x.id === el.dataset.course);
  toast(`Demo: this would open “${c?.title}” on Swift AI Academy, with your institute login.`);
};
app.views.learn = renderLearn;
