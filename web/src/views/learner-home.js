// Learners · For you: one screen that answers "what can I do next?" for the
// learner's own profile: jobs open now, the first course to take, where to
// apply, and what is coming nearby.
import { app } from '../app.js';
import { esc, $, artBox, icon } from '../ui.js';
import { profileBar, fitNow } from './learner-profile.js';
import { planCards, adRow } from './learn.js';
import { LEARNER_TYPES } from '../../../src/core/learners.js';

const FIRST_ROUTE = { iti: 'naps', polytechnic: 'nats', college: 'pmis' };

export function renderLearnerHome() {
  const root = $('#lhome');
  const { p, fit } = fitNow();
  const cards = planCards(fit, 3);
  const saa = app.data.saa;
  const first = cards.map((g) => saa.skill_map[g.skills[0]]).find((m) => m && m.fit !== 'none');
  const course = first ? saa.courses.find((c) => c.id === first.courses[0]) : null;
  const courseJobs = first ? cards.find((g) => saa.skill_map[g.skills[0]] === first)?.jobs.size : 0;
  const routes = app.data.demand?.apply_routes || [];
  const route = routes.find((r) => r.id === FIRST_ROUTE[p.type]) || routes.find((r) => r.for.includes(p.type));
  const area = app.area();
  const future = (app.data.market?.future || []).filter((f) => f.area === area).slice(0, 3);
  const T = LEARNER_TYPES[p.type];
  root.innerHTML = `
  <section class="lh-hero">
    <div class="ph-text"><div class="eyebrow">For you</div><h1>Your next step, in three moves</h1><p class="lead">Tell us what you studied once. Every page in this interface then shows jobs, courses and portals for you.</p></div>
    ${artBox('path')}
  </section>
  ${profileBar()}
  <ol class="moves">
    <li class="move"><span class="move-n">1</span><div><div class="eyebrow">Apply now</div><h3>${fit.related.length} job${fit.related.length === 1 ? '' : 's'} fit what you studied</h3><p>${fit.fresh} of them take freshers. Open the list, read the ad, and apply on the employer's page.</p><button class="btn primary" data-action="tab" data-tab="discover">${icon('map')}See jobs for me</button></div></li>
    <li class="move"><span class="move-n">2</span><div><div class="eyebrow">Learn one thing</div><h3>${course ? esc(course.title) : 'No course needed yet'}</h3><p>${course ? `${esc(course.hours)} hours on Swift AI Academy. Opens about ${courseJobs} more job${courseJobs === 1 ? '' : 's'} near you.` : 'Current ads ask for what you already know.'}</p>${course ? `<button class="btn primary" data-action="saa-start" data-course="${esc(course.id)}">${icon('school')}Start learning</button> <button class="btn text" data-action="tab" data-tab="learn">See my full plan</button>` : ''}</div></li>
    <li class="move"><span class="move-n">3</span><div><div class="eyebrow">Register</div><h3>${route ? esc(route.name.split(' - ')[0]) : 'National Career Service'}</h3><p>${route ? esc(route.what.split('. ')[0].replace(/\.$/, '')) + '.' : ''} Free to register.</p>${route ? `<a class="btn primary" href="${esc(route.url)}" target="_blank" rel="noopener">Open the portal${icon('open_in_new')}</a> <button class="btn text" data-action="tab" data-tab="path">All places to apply</button>` : ''}</div></li>
  </ol>
  <div class="grid2">
    <div class="card"><div class="card-head"><h3>Jobs that fit you</h3><small>${esc(T.label)} · ${esc(p.programme.name)}</small></div><div class="card-body">${fit.related.length ? `<ul class="ad-list">${fit.related.slice(0, 4).map((x) => adRow(x.source_id)).join('')}</ul>` : `<ul class="ad-list">${fit.bridges.slice(0, 4).map((b) => adRow(b.source_id, `<div class="note">After a short course in ${esc(b.gaps.join(', '))}</div>`)).join('')}</ul>`}</div></div>
    <div class="card"><div class="card-head"><h3>Coming up near you</h3><small>Announced, not yet hiring</small></div><div class="card-body"><ul class="demand-list">${future.map((f) => `<li><strong>${esc(f.title)}</strong><p class="note">${esc(f.status)}${f.expected ? ` · expected ${esc(f.expected)}` : ''}${f.skills_implied?.length ? ` · will need ${esc(f.skills_implied.slice(0, 3).join(', '))}` : ''}</p></li>`).join('') || '<li class="note">Nothing announced in our list for this area.</li>'}</ul><button class="linkbtn" data-action="tab" data-tab="upcoming">More coming up${icon('arrow_forward')}</button></div></div>
  </div>`;
}

app.views.lhome = renderLearnerHome;
