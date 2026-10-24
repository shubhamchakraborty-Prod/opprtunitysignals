// Compare 62 and 63: type of work, skills asked for, working conditions,
// where the information came from and what the ads leave out.
import { app } from '../app.js';
import { esc, $, pct, familyLabel, KIND_LABEL, BASIS_LABEL, artBox } from '../ui.js';
import { rolePrevalence, requirementFrequencies, sourceCoverage, requirementTrend } from '../../../src/core/analytics.js';

const bars = (rows, n, sector) => `<div class="bars">${rows.map((r) => `<div class="bar-row"><div class="bar-label"><span>${esc(r.name)}</span><strong>${r.count} <small>of ${n}</small></strong></div><div class="bar s${sector}"><i style="width:${n ? (r.count / n) * 100 : 0}%"></i></div></div>`).join('')}</div>`;

function column(sector, records) {
  const prev = rolePrevalence(records, sector);
  const req = requirementFrequencies(records, sector, app.data.asOf);
  const cov = sourceCoverage(records, sector);
  const n = prev.denominator;
  const top = prev.rows[0];
  return `<div class="card sector-col"><div><span class="sector-tag s${sector}">Sector ${sector}</span><h3 style="margin-top:8px">${n} job ads</h3><p class="verdict">${top ? `Most common: <strong>${esc(familyLabel(top.family))}</strong> (${top.count} of ${n}).` : 'No ads collected.'}</p></div>
  <div><div class="section-label">Type of work</div>${bars(prev.rows.map((r) => ({ name: familyLabel(r.family), count: r.count })), n, sector)}</div>
  <div><div class="section-label">Skills asked for most</div>${bars(req.skills.slice(0, 6), req.denominator, sector)}</div>
  <div><div class="section-label">Working conditions written in the ads</div>${req.terms.length ? bars(req.terms, req.denominator, sector) : '<p class="note">No night shifts, six-day weeks or similar terms mentioned.</p>'}<p class="note" style="margin-top:6px">These are the employer’s terms, not what workers think of them.</p></div>
  <div><div class="section-label">What the ads don’t tell us</div><div class="table-scroll"><table class="minitable"><tr><th>Information</th><th>Given in</th><th>Missing from</th></tr>${req.missingness.map((m) => `<tr><td>${esc(m.field)}</td><td>${m.stated} ads (${pct(m.stated, req.denominator)})</td><td>${m.missing}</td></tr>`).join('')}</table></div></div>
  <div><div class="section-label">Where the information came from</div><p class="note">${cov.platforms.map((p) => `${esc(p.name)} ${p.count}`).join(' · ')}<br/>${cov.pageKinds.map((p) => `${p.count} from a ${esc(KIND_LABEL[p.name] || p.name)}`).join(' · ')}<br/>Location: ${cov.locationBasis.map((p) => `${esc(BASIS_LABEL[p.name] || p.name)} (${p.count})`).join(' · ')}<br/>Confirmed by employer: ${cov.employerConfirmed} of ${cov.denominator}</p></div></div>`;
}

export function renderCompare() {
  const records = app.data.records.filter((r) => r.review.state === 'approved');
  const trend = requirementTrend(records);
  $('#compare').innerHTML = `<div class="section-head">${artBox('compare')}<div><h2>How do the two areas differ?</h2><p>Based on the job ads we collected, not on every job in each sector. Repeat ads are counted once. Old ads and ads with unclear locations are left out.</p></div></div>
  <div class="grid2">${column('62', records)}${column('63', records)}</div>
  <div class="card card-body"><div class="section-label">Are skill demands going up or down?</div><h3 style="font-size:19px">${trend.status === 'ok' ? esc(trend.message) : 'Too early to tell'}</h3>
  ${trend.status === 'ok' ? `<div class="table-scroll" style="margin-top:10px"><table class="minitable"><tr><th>Skill</th><th>Earlier</th><th>Later</th></tr>${trend.rows.slice(0, 10).map((r) => `<tr><td>${esc(r.name)}</td><td>${Math.round(r.before * 100)}%</td><td>${Math.round(r.after * 100)}%</td></tr>`).join('')}</table></div>` : `<p style="margin-top:6px;color:var(--ink-2)">We have one round of data so far. A trend needs at least two rounds collected the same way, each with 10 or more ads from both sectors.</p><ul class="note" style="margin:8px 0 0;padding-left:18px">${trend.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`}</div>
  <div class="callout"><strong>How to use this.</strong> 1. Spot the kinds of work that keep appearing. 2. Call those employers to confirm real openings. 3. Only then compare confirmed openings with how many ITI learners will finish each trade.</div>`;
}

app.views.compare = renderCompare;
