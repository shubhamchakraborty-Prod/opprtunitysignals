// Worker & employer voice. Disabled until attributed, consented interviews
// exist. Advert terms are shown separately and never scored as sentiment.
import { app } from '../app.js';
import { esc, $, toast, errorBox } from '../ui.js';
import { requirementFrequencies } from '../../../src/core/analytics.js';
import { INTERVIEW_THEMES, CONSENT_BASES } from '../../../src/core/constants.js';

export function renderVoice() {
  const s = app.data.sentiment;
  const recs = app.data.records.filter((r) => r.review.state === 'approved');
  const terms = requirementFrequencies(recs, app.state.filters.sector, app.data.asOf);
  const body = s.status === 'ok'
    ? `<div class="section-panel"><div class="panel-head"><h3>${esc(s.message)}</h3><span class="count">Sample sizes: ${s.sampleSizes.map((x) => `${x.count} ${esc(x.group)}`).join(' · ')}</span></div><div class="grid3">${s.themes.map((t) => `<div class="theme-card"><h4>${esc(t.theme.replace('_', ' '))}</h4><div class="need">Mentioned in ${t.mentions} of ${t.of} interviews${t.byGroup.length ? ' (' + t.byGroup.map((g) => `${g.count} ${esc(g.group)}`).join(', ') + ')' : ''}</div>${t.quotes.map((q) => `<div class="quote">“${esc(q.quote)}” <small>- ${esc(q.group)}${q.sector ? ', Sector ' + esc(q.sector) : ''}</small></div>`).join('')}</div>`).join('')}</div><div class="method">${esc(s.method)}</div></div>`
    : `<div class="empty-state" id="sentimentEmpty"><h3>${esc(s.message)}</h3><p>${esc(s.detail)}</p><p>To switch this layer on, the pilot needs: interviews with workers, learners or employers in Sectors 62/63; recorded informed consent (and separate permission to quote); themes coded with the fixed codebook; and approval by an administrator. Results will show sample sizes and representative quotes, never percentages derived from job adverts.</p></div>`;
  $('#voice').innerHTML = `<div class="wide"><h2 class="section-title">What do workers, learners and employers say?</h2><p class="section-description">Aspirations, commute, pay, safety, work hours and retention, taken only from attributed and consented interviews. This is <strong>separate from hiring evidence</strong>: it explains why people take or leave jobs, not how many jobs exist.</p>
  ${body}
  <div class="section-panel" style="margin-top:14px"><div class="panel-head"><h3>Employment terms in adverts (not sentiment)</h3><span class="count">${terms.denominator} recent adverts · ${app.state.filters.sector === 'all' ? 'both sectors' : 'Sector ' + esc(app.state.filters.sector)}</span></div>
  ${terms.terms.length ? `<table class="minitable"><tr><th>Term stated by the advertiser</th><th>Adverts</th><th>Category</th></tr>${terms.terms.map((t) => `<tr><td>${esc(t.name)}</td><td>${t.count} of ${terms.denominator}</td><td>Employment terms</td></tr>`).join('')}</table>` : '<p class="need">No employment terms recorded in the current sector view.</p>'}
  <p class="need">These are conditions written by employers or recruiters. They say nothing about how workers feel about them.</p></div>
  ${adminControls(s)}</div>`;
  bind();
}

function adminControls(s) {
  const parts = [];
  if (app.can('admin:sentiment')) parts.push(`<div class="queue-section"><h3>Sentiment layer setting</h3><p>Currently <strong>${app.data.settings.sentimentEnabled ? 'enabled' : 'disabled'}</strong>. ${s.usable} approved consented interview(s) on file.</p><button class="btn" data-action="toggle-sentiment">${app.data.settings.sentimentEnabled ? 'Disable' : 'Enable'} sentiment layer</button></div>`);
  if (app.can('interview:submit')) {
    parts.push(`<div class="queue-section"><h3>Record a consented interview</h3><p>No names or contact details. Code themes with the fixed codebook. Records stay hidden until an administrator approves them.</p>
    <form class="form" data-form="interview"><div class="form-grid">
    <div><label for="ivType">Source type</label><select id="ivType" name="source_type"><option value="interview">Interview</option><option value="workforce_sentiment">Workforce sentiment session</option></select></div>
    <div><label for="ivGroup">Respondent group</label><select id="ivGroup" name="respondent_group"><option>worker</option><option>learner</option><option>employer</option></select></div>
    <div><label for="ivSector">Sector</label><select id="ivSector" name="sector"><option value="62">62</option><option value="63">63</option></select></div>
    <div><label for="ivDate">Interview date</label><input id="ivDate" type="date" name="interview_date" required/></div>
    <div><label for="ivBasis">Consent basis</label><select id="ivBasis" name="basis">${CONSENT_BASES.map((b) => `<option value="${b}">${b.replace(/_/g, ' ')}</option>`).join('')}</select></div>
    <div><span class="lbl">Consent</span><label class="checkline" style="text-transform:none;letter-spacing:0"><input type="checkbox" name="obtained"/> Informed consent recorded</label><label class="checkline" style="text-transform:none;letter-spacing:0"><input type="checkbox" name="quote_allowed"/> Permission to quote anonymously</label></div>
    ${INTERVIEW_THEMES.map((t) => `<div><label for="th-${t}">${t.replace('_', ' ')} (summary or quote)</label><input id="th-${t}" name="theme_${t}" placeholder="Leave blank if not discussed"/></div>`).join('')}
    </div><div style="margin-top:12px"><button class="btn strong" type="submit">Submit for approval</button></div></form></div>`);
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
