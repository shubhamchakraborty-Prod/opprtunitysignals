// Compare 62 vs 63: occupation mix, requirement frequencies, employment
// terms, source coverage and missingness, plus the trend refusal rule.
import { app } from '../app.js';
import { esc, $, pct, KIND_LABEL, BASIS_LABEL } from '../ui.js';
import { rolePrevalence, requirementFrequencies, sourceCoverage, requirementTrend } from '../../../src/core/analytics.js';

const bars = (rows, n, purple, label = (r) => r.name) => rows.map((r) => `<div class="barrow"><div class="barlabel"><span>${esc(label(r))}</span><strong>${r.count} <small style="font-weight:400;color:#7a8993">of ${n}</small></strong></div><div class="barline"><div class="barfill ${purple ? 'purple' : ''}" style="width:${n ? (r.count / n) * 100 : 0}%"></div></div></div>`).join('');

function column(sector, records) {
  const prev = rolePrevalence(records, sector);
  const req = requirementFrequencies(records, sector, app.data.asOf);
  const cov = sourceCoverage(records, sector);
  const purple = sector === '63';
  const n = prev.denominator;
  return `<div class="compare-col"><h3>Sector ${sector}<small>${sector === '62' ? 'Office, IT-enabled services and digital operations' : 'Production roles alongside IT-enabled services and business operations'}</small></h3>
  <div style="font-size:12px;color:#677986;margin:13px 0 6px">${n} deduplicated current public signals · ${esc(prev.scope)}</div>
  <div class="section-mini">Occupation groups</div>${bars(prev.rows.map((r) => ({ name: r.family, count: r.count })), n, purple)}
  <div class="section-mini">Most frequent requirements (last ${req.windowDays} days, n=${req.denominator})</div>${bars(req.skills.slice(0, 6), req.denominator, purple)}
  <div class="section-mini">Employment terms stated in adverts <span class="chip grey">not sentiment</span></div>${req.terms.length ? bars(req.terms, req.denominator, purple) : '<p class="need">No night-shift, six-day-week or similar terms recorded.</p>'}
  <div class="section-mini">Source coverage</div>
  <table class="minitable"><tr><th>Source</th><th>Records</th></tr>${cov.platforms.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.count}</td></tr>`).join('')}</table>
  <p class="need" style="margin-top:8px">Page types: ${cov.pageKinds.map((p) => `${esc(KIND_LABEL[p.name] || p.name)} ${p.count}`).join(' · ')}<br/>Location basis: ${cov.locationBasis.map((p) => `${esc(BASIS_LABEL[p.name] || p.name)} ${p.count}`).join(' · ')}<br/>Employer-confirmed: ${cov.employerConfirmed} of ${cov.denominator}</p>
  <div class="section-mini">Missing information</div>
  <table class="minitable"><tr><th>Field</th><th>Stated</th><th>Missing</th></tr>${req.missingness.map((m) => `<tr><td>${esc(m.field)}</td><td>${m.stated} (${pct(m.stated, req.denominator)})</td><td>${m.missing}</td></tr>`).join('')}</table></div>`;
}

export function renderCompare() {
  const records = app.data.records.filter((r) => r.review.state === 'approved');
  const trend = requirementTrend(records);
  $('#compare').innerHTML = `<div class="wide"><h2 class="section-title">Two neighbouring sectors, different role mixes</h2><p class="section-description">This comparison counts the <strong>small sample of public job signals collected for this pilot</strong>. It must not be read as the actual total or share of hiring in either sector. Mirrored posts are counted once; unclear locations and historical posts are excluded.</p>
  <div class="comparison">${column('62', records)}${column('63', records)}</div>
  <div class="insights-compare"><div class="eyebrow">Are requirements rising or falling?</div><h3 style="margin:8px 0 8px;font-size:19px">${trend.status === 'ok' ? esc(trend.message) : 'Insufficient evidence for a trend'}</h3>
  ${trend.status === 'ok' ? `<table class="minitable"><tr><th>Requirement</th><th>Earlier share</th><th>Later share</th></tr>${trend.rows.slice(0, 10).map((r) => `<tr><td>${esc(r.name)}</td><td>${Math.round(r.before * 100)}%</td><td>${Math.round(r.after * 100)}%</td></tr>`).join('')}</table>` : `<p class="need">${esc(trend.message)}</p><ul class="need">${trend.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul><p class="need">A trend is computed only when at least two capture waves use the same sources and method, cover both sectors, and each hold 10 or more records.</p>`}</div>
  <div class="insights-compare"><div class="eyebrow">Planning interpretation</div><h3 style="margin:8px 0 17px;font-size:19px">What could an ITI or workforce planner do with this?</h3><div class="narrative"><div><span class="mini-tag">1 · Observe</span><h4>Identify relevant occupations</h4><p>Document employer, advertised role, location, qualification, experience and whether the listing is recent.</p></div><div><span class="mini-tag">2 · Verify</span><h4>Contact the employer</h4><p>Confirm genuine openings, working conditions and candidate requirements before counting demand.</p></div><div><span class="mini-tag">3 · Plan</span><h4>Match to training supply</h4><p>Only after a verified demand baseline, compare the openings with expected ITI pass-outs and training provision.</p></div></div></div></div>`;
}

app.views.compare = renderCompare;
