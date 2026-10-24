// Learner profile and onboarding. Personal details stay in this browser.
// No learner profile is shared with an employer from this prototype.
import { app } from '../app.js';
import { esc, $, icon, toast } from '../ui.js';
import { LEARNER_TYPES, learnerFit, acceptsType } from '../../../src/core/learners.js';
import { comparisonBase } from '../../../src/core/analytics.js';

const KEY = 'opx-learner';
const DEFAULT = { iti: 'Electronics Mechanic', polytechnic: 'dip-ece', college: 'bcom' };
let draft = null;

const STAGES = [
  ['studying', 'Currently studying'],
  ['completed', 'Course completed'],
];
const YEARS = [
  ['1', 'First year'], ['2', 'Second year'], ['3', 'Third year'], ['4', 'Fourth year'],
];
const LANGUAGES = [['en', 'English'], ['hi', 'Hindi'], ['bn', 'Bengali']];
const LOCATIONS = [
  ['noida_ncr', 'Noida / Gautam Buddh Nagar'], ['kalyani', 'Kalyani'], ['siliguri', 'Siliguri'], ['other', 'Somewhere else'],
];
const SHIFTS = [['any', 'Any shift'], ['day', 'Day shifts only'], ['night', 'Night shifts are possible']];
const options = (entries, selected) => entries.map(([v, label]) =>
  `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');

/** A trade (ITI) or a programme (diploma, degree), shaped the same way. */
export function programmeFor(type, id) {
  if (type === 'iti') {
    const t = app.data.trades?.trades.find((x) => x.trade === id);
    return t ? { id: t.trade, name: t.trade, ...t } : null;
  }
  const p = (app.data.programmes?.programmes || []).find((x) => x.id === id && x.type === type);
  return p ? { ...p, trade: p.name } : null;
}

function programmeOptions(type, id) {
  if (type === 'iti') {
    return [...new Set((app.data.trades?.trades || []).map((t) => t.sector))].map((sector) =>
      `<optgroup label="${esc(sector)}">${app.data.trades.trades.filter((t) => t.sector === sector).map((t) =>
        `<option value="${esc(t.trade)}" ${t.trade === id ? 'selected' : ''}>${esc(t.trade)}</option>`).join('')}</optgroup>`).join('');
  }
  return (app.data.programmes?.programmes || []).filter((p) => p.type === type).map((p) =>
    `<option value="${esc(p.id)}" ${p.id === id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
}

export function profile() {
  const stored = app.ls.get(KEY, null);
  const saved = stored?.consent === true && stored?.completed === true ? stored : null;
  const values = draft || saved || (stored && LEARNER_TYPES[stored.type] ? stored : {});
  const type = LEARNER_TYPES[values.type] ? values.type : 'iti';
  const programme = programmeFor(type, values.programme) || programmeFor(type, DEFAULT[type]);
  return {
    type, programme, stage: values.stage === 'completed' ? 'completed' : 'studying',
    year: ['1','2','3','4'].includes(values.year) ? values.year : '1',
    language: LANGUAGES.some(([k]) => k === values.language) ? values.language : 'en',
    location: LOCATIONS.some(([k]) => k === values.location) ? values.location : 'noida_ncr',
    relocation: values.relocation === 'yes' ? 'yes' : 'no',
    shift: SHIFTS.some(([k]) => k === values.shift) ? values.shift : 'any',
    saved: !!saved,
  };
}

/** Quick change is a temporary preview until the learner gives consent. */
export function setProfile(type, id) {
  if (!LEARNER_TYPES[type]) return;
  const old = profile();
  const next = { type, programme: id || DEFAULT[type], stage: old.stage, year: old.year,
    language: old.language, location: old.location, relocation: old.relocation, shift: old.shift };
  draft = next;
  if (old.saved) {
    app.ls.set(KEY, { ...next, consent: true, completed: true });
    draft = null;
  }
  app.views[app.state.tab]?.();
}

export function currentAds() {
  return comparisonBase(app.data.records.filter((r) => r.review.state === 'approved'), 'all');
}

/** Study-based relevance is not hiring eligibility or a confirmed vacancy. */
export function fitNow() {
  const p = profile();
  const ads = currentAds();
  return { p, ads, fit: learnerFit({ type: p.type, programme: p.programme }, ads) };
}

export function profileBar() {
  const p = profile();
  return `<div class="profile-bar" role="group" aria-label="About you">
    <span class="pb-label">I am</span>
    <div class="seg-group" role="group" aria-label="Type of learner">${Object.entries(LEARNER_TYPES).map(([k, t]) =>
      `<button type="button" class="seg ${p.type === k ? 'active' : ''}" data-action="lp-type" data-type="${k}" aria-pressed="${p.type === k}">${esc(t.label)}</button>`).join('')}</div>
    <span class="pb-label">${p.type === 'iti' ? 'in the trade' : 'studying'}</span>
    <label class="screenreader" for="lpProg">${p.type === 'iti' ? 'ITI trade' : 'Programme'}</label>
    <select id="lpProg" class="input">${programmeOptions(p.type, p.programme.id)}</select>
    <button type="button" class="btn outlined small" data-action="tab" data-tab="lprofile">${icon('person')} ${p.saved ? 'Edit my profile' : 'Complete my profile'}</button>
    <span class="note">${p.saved ? 'Saved only on this device' : 'Preview only - not saved'}</span>
  </div>`;
}

/** Form edits are deliberately local until explicit consent. */
export function renderLearnerProfile() {
  const p = profile();
  const root = $('#lprofile');
  root.innerHTML = `<section class="lp-head">
    <div class="eyebrow">Learners · My profile</div>
    <h1>Find opportunities for your background</h1>
    <p>Tell us what you study and what kind of work you can take. Your choices guide opportunity explanations and learning suggestions.</p>
  </section>
  <div class="lp-layout">
    <form id="learnerProfileForm" class="card lp-form" data-form="learner-profile">
      <div class="lp-form-heading"><span class="lp-step">1</span><div><h2>Your education</h2><p>Choose your current course or completed qualification.</p></div></div>
      <div class="lp-fields">
        <fieldset class="lp-type-field"><legend>I am a</legend>
          <div class="seg-group">${Object.entries(LEARNER_TYPES).map(([type, t]) =>
            `<button type="button" class="seg ${p.type === type ? 'active' : ''}" data-action="lp-type" data-type="${type}" aria-pressed="${p.type === type}">${esc(t.label)}</button>`).join('')}</div>
        </fieldset>
        <label class="lp-field">Trade or programme
          <select name="programme" required>${programmeOptions(p.type, p.programme.id)}</select>
        </label>
        <label class="lp-field">Course status
          <select name="stage">${options(STAGES, p.stage)}</select>
        </label>
        <label class="lp-field">Year of study
          <select name="year">${options(YEARS, p.year)}</select>
        </label>
      </div>
      <div class="lp-form-heading"><span class="lp-step">2</span><div><h2>Where and how you want to work</h2><p>Preferences, not proof of eligibility.</p></div></div>
      <div class="lp-fields">
        <label class="lp-field">My location
          <select name="location">${options(LOCATIONS, p.location)}</select>
        </label>
        <label class="lp-field">Preferred language
          <select name="language">${options(LANGUAGES, p.language)}</select>
        </label>
        <label class="lp-field">Relocation
          <select name="relocation">${options([['no','Prefer to stay nearby'],['yes','Open to relocating']], p.relocation)}</select>
        </label>
        <label class="lp-field">Shift preference
          <select name="shift">${options(SHIFTS, p.shift)}</select>
        </label>
      </div>
      <div class="lp-consent">
        <label class="lp-consent-label"><input name="consent" type="checkbox" required ${p.saved ? 'checked' : ''}/>
          <span>I agree to save these preferences in this browser so Opportunity Explorer can personalise my experience. I can erase them at any time.</span>
        </label>
        <p>No learner details are sent to employers. Sharing a profile with an employer would require separate permission. This prototype does not create a learner account.</p>
      </div>
      <div class="lp-actions"><button class="btn primary" type="submit">Save and see my opportunities ${icon('arrow_forward')}</button>
        ${p.saved ? '<button class="btn text" type="button" data-action="lp-forget">Erase saved profile</button>' : ''}</div>
    </form>
    <aside class="lp-side">
      <div class="card lp-preview">
        <div class="eyebrow">Your journey</div><h2>Three things you can do here</h2>
        <ol class="lp-journey"><li><span>01</span><div><strong>Explore relevant roles</strong><p>Read adverts that mention your qualification and skills.</p></div></li>
        <li><span>02</span><div><strong>Check the requirements</strong><p>Understand missing skills, experience and what still needs employer confirmation.</p></div></li>
        <li><span>03</span><div><strong>Choose your next step</strong><p>Compare learning and official application routes.</p></div></li></ol>
      </div>
      <div class="lp-disclosure"><strong>About the evidence</strong><p>The current job-ad sample covers Noida Sectors 62 and 63. Ads are not automatically confirmed vacancies. Kalyani and Siliguri have regional context, but not equivalent live job coverage yet.</p>
      <p>Language preference is stored, but this prototype currently displays the interface in English.</p></div>
    </aside>
  </div>`;
}

/** A specific learner's education and skills explain the opportunity, without promising eligibility. */
export function learnerEvidence(r) {
  const { p, fit } = fitNow();
  const related = fit.related.find((x) => x.source_id === r.source_id);
  const bridge = fit.bridges.find((x) => x.source_id === r.source_id);
  const accepts = acceptsType(r, p.type);
  const qualification = !r.education?.stated ? 'Qualification not stated in the ad'
    : accepts ? 'Your qualification type is mentioned or not excluded' : 'The listed qualification may not match yours';
  const skills = new Set((p.programme?.core_skills || []).map((s) => s.toLowerCase()));
  const matched = (r.skills || []).map((s) => s.name).filter((s) => skills.has(s.toLowerCase()));
  const missing = (r.skills || []).map((s) => s.name).filter((s) => !skills.has(s.toLowerCase()));
  const relevant = related ? 'Related to your studies' : bridge ? 'A possible bridge after more learning' : 'Review the requirements carefully';
  return `<section class="lp-evidence" aria-label="Requirements for your profile">
    <div class="section-label">How this advert relates to your profile</div>
    <strong>${esc(relevant)}</strong>
    <p class="note">${esc(qualification)}. ${p.stage === 'studying' ? 'You are currently studying, so check whether course completion is required.' : 'Check whether the employer requires additional certificates or experience.'}</p>
    <div class="lp-skill-rows"><div><b>Skills mentioned that you may already know</b><p>${esc(matched.join(', ') || 'None explicitly matched in the programme catalogue')}</p></div>
      <div><b>Skills to check or build</b><p>${esc(missing.join(', ') || 'No additional listed skills found')}</p></div></div>
    <p class="note">This is an indicative match based on a programme catalogue, not your assessed skills or employer-confirmed eligibility. The employer decides.</p>
    <button type="button" class="linkbtn" data-action="tab" data-tab="learn">Explore a skill plan ${icon('arrow_forward')}</button>
  </section>`;
}

app.actions['lp-type'] = (el) => setProfile(el.dataset.type, null);
app.actions['lp-forget'] = () => {
  app.ls.del(KEY); draft = null;
  app.views.lprofile();
  toast('Saved profile erased from this browser');
};
app.forms['learner-profile'] = (form) => {
  const fd = new FormData(form);
  if (!fd.has('consent')) { form.querySelector('[name=consent]')?.focus(); return; }
  const old = profile();
  const id = String(fd.get('programme') || '');
  if (!programmeFor(old.type, id)) { toast('Please choose a valid programme'); return; }
  const choice = {
    type: old.type, programme: id, stage: fd.get('stage'), year: fd.get('year'),
    location: fd.get('location'), language: fd.get('language'),
    relocation: fd.get('relocation'), shift: fd.get('shift'),
    completed: true, consent: true,
  };
  // Validate select values, not just the browser's form constraints.
  if (!STAGES.some(([v]) => v === choice.stage) || !YEARS.some(([v]) => v === choice.year)
    || !LOCATIONS.some(([v]) => v === choice.location) || !LANGUAGES.some(([v]) => v === choice.language)
    || !SHIFTS.some(([v]) => v === choice.shift) || !['yes','no'].includes(choice.relocation)) {
    toast('Please check your profile fields'); return;
  }
  app.ls.set(KEY, choice);
  draft = null;
  app.actions.tab({ dataset: { tab: 'lhome' } });
  toast('Profile saved on this device');
};
document.addEventListener('change', (e) => {
  const t = /** @type {HTMLSelectElement} */ (e.target);
  if (t.id === 'lpProg') setProfile(profile().type, t.value);
});
app.views.lprofile = renderLearnerProfile;
