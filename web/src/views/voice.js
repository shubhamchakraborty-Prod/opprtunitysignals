// Worker & employer voice. Disabled until attributed, consented interviews
// exist. Advert terms are shown separately and never scored as sentiment.
import { app } from '../app.js';
import { esc, $, toast, errorBox, artBox } from '../ui.js';
import { requirementFrequencies } from '../../../src/core/analytics.js';
import { INTERVIEW_THEMES, CONSENT_BASES } from '../../../src/core/constants.js';

export function renderVoice() {
  const s = app.data.sentiment;
  const recs = app.data.records.filter((r) => r.review.state === 'approved');
  const terms = requirementFrequencies(recs, app.state.filters.sector, app.data.asOf);
  const body = s.status === 'ok'
    ? `<div class="card card-body" style="display:flex;flex-direction:column;gap:14px"><div class="section-label">${esc(s.message)}</div><div class="grid3">${s.themes.map((t) => `<div class="theme-card"><h4>${esc(t.theme.replace('_', ' '))}</h4><div class="note">Raised in ${t.mentions} of ${t.of} interviews${t.byGroup.length ? ' (' + t.byGroup.map((g) => `${g.count} ${esc(g.group)}`).join(', ') + ')' : ''}</div>${t.quotes.map((q) => `<div class="quote">“${esc(q.quote)}” <span class="note">${esc(q.group)}${q.sector ? ', Sector ' + esc(q.sector) : ''}</span></div>`).join('')}</div>`).join('')}</div><p class="note">${esc(s.method)}</p></div>`
    : `<div class="empty-state" id="sentimentEmpty"><span class="trust old">Not measured yet</span><h3>${esc(s.message)}</h3><p>We have not interviewed workers, learners or employers yet, so this page shows no opinions. Job ads cannot tell us how people feel about a job.</p><div class="needs"><div><b>Interviews</b>Workers, learners and employers in Sectors 62 and 63</div><div><b>Consent</b>Recorded for every person, with separate permission to quote</div><div><b>Coding</b>Six fixed topics: hopes, commute, pay, safety, hours, staying on</div><div><b>Approval</b>Checked by an administrator before anything appears</div></div></div>`;
  $('#voice').innerHTML = `<div class="section-head">${artBox('voice')}<div><h2>What do workers and employers say?</h2><p>Hopes, commute, pay, safety, working hours and why people stay or leave. Taken only from interviews where people agreed to take part. This is kept apart from the job counts.</p></div></div>
  ${body}
  <div class="card"><div class="card-head"><h3>Working conditions written in the ads</h3><small>${terms.denominator} recent ads · ${app.state.filters.sector === 'all' ? 'both sectors' : 'Sector ' + esc(app.state.filters.sector)}</small></div><div class="card-body" style="display:flex;flex-direction:column;gap:10px">
  ${terms.terms.length ? `<div class="table-scroll"><table class="minitable"><tr><th>Condition</th><th>Ads mentioning it</th></tr>${terms.terms.map((t) => `<tr><td>${esc(t.name)}</td><td>${t.count} of ${terms.denominator}</td></tr>`).join('')}</table></div>` : '<p class="note">No working conditions mentioned in the current area.</p>'}
  <p class="note">These are terms set by employers. They do not tell us what workers think of them.</p></div></div>
  ${adminControls(s)}`;
  bind();
}

function adminControls(s) {
  const parts = [];
  if (app.can('admin:sentiment')) parts.push(`<div class="queue-section"><h3>Sentiment layer setting</h3><p>Currently <strong>${app.data.settings.sentimentEnabled ? 'enabled' : 'disabled'}</strong>. ${s.usable} approved consented interview(s) on file.</p><button class="btn" data-action="toggle-sentiment">${app.data.settings.sentimentEnabled ? 'Disable' : 'Enable'} sentiment layer</button></div>`);
  if (app.can('interview:submit')) {
    parts.push(`<div class="queue-section"><h3>Record an interview</h3><p>No names or contact details. Code themes with the fixed codebook. Records stay hidden until an administrator approves them.</p>
    <form class="form" data-form="interview"><div class="form-grid">
    <div><label for="ivType">Source type</label><select id="ivType" name="source_type"><option value="interview">Interview</option><option value="workforce_sentiment">Workforce sentiment session</option></select></div>
    <div><label for="ivGroup">Respondent group</label><select id="ivGroup" name="respondent_group"><option>worker</option><option>learner</option><option>employer</option></select></div>
    <div><label for="ivSector">Sector</label><select id="ivSector" name="sector"><option value="62">62</option><option value="63">63</option></select></div>
    <div><label for="ivDate">Interview date</label><input id="ivDate" type="date" name="interview_date" required/></div>
    <div><label for="ivBasis">Consent basis</label><select id="ivBasis" name="basis">${CONSENT_BASES.map((b) => `<option value="${b}">${b.replace(/_/g, ' ')}</option>`).join('')}</select></div>
    <div><span class="lbl">Consent</span><label class="checkline" style="text-transform:none;letter-spacing:0"><input type="checkbox" name="obtained"/> Informed consent recorded</label><label class="checkline" style="text-transform:none;letter-spacing:0"><input type="checkbox" name="quote_allowed"/> Permission to quote anonymously</label></div>
    ${INTERVIEW_THEMES.map((t) => `<div><label for="th-${t}">${t.replace('_', ' ')} (summary or quote)</label><input id="th-${t}" name="theme_${t}" placeholder="Leave blank if not discussed"/></div>`).join('')}
    </div><div><button class="btn primary" type="submit">Submit for approval</button></div></form></div>`);
  }
  return parts.join('');
}

function bind() {
  app.actions['toggle-sentiment'] = async () => {
    await app.client.setSentimentEnabled(!app.data.settings.sentimentEnabled);
    toast('Sentiment setting updated');
    await app.refresh();
  };
  app.forms.interview = async (form) => {
    const fd = new FormData(form);
    const themes = INTERVIEW_THEMES.filter((t) => String(fd.get('theme_' + t) || '').trim()).map((t) => ({ theme: t, summary: String(fd.get('theme_' + t)), quote: fd.get('quote_allowed') ? String(fd.get('theme_' + t)) : null }));
    try {
      await app.client.submitInterview({
        source_type: fd.get('source_type'), respondent_group: fd.get('respondent_group'), sector: fd.get('sector'), interview_date: fd.get('interview_date'),
        consent: { obtained: !!fd.get('obtained'), basis: fd.get('basis'), quote_allowed: !!fd.get('quote_allowed') }, themes,
      });
      toast('Interview recorded; awaiting administrator approval');
      await app.refresh();
    } catch (e) {
      form.insertAdjacentHTML('afterbegin', errorBox(e));
    }
  };
}

app.views.voice = renderVoice;
