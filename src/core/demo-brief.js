// @ts-check
// Human-centred, purpose-driven demo ranking. Not a production recommendation engine.
// All inputs are synthetic, with no user profiling, tracking or inferred vulnerability.
export const DEMO_PEOPLE = Object.freeze([
  ['learner','Learner','Explore roles and skills'],
  ['institution','Institution','Plan training and outreach'],
  ['industry','Industry','Explore roles and institute supply'],
  ['research','Research team','Assess evidence quality'],
]);

const WEIGHTS = {
  learner: {employer_confirmation:5,job_ad:4,training_supply:3,project_announcement:1,social_signal:0},
  institution: {employer_confirmation:5,job_ad:5,training_supply:4,project_announcement:2,social_signal:1},
  industry: {training_supply:5,employer_confirmation:4,job_ad:3,project_announcement:2,social_signal:1},
  research: {social_signal:5,job_ad:4,project_announcement:4,employer_confirmation:3,training_supply:2},
};
const ACTIONS = {
  learner: {
    employer_confirmation:['Explore a possible opening','Check the required qualifications and application route.'],
    job_ad:['Explore a role','Check the requirements; this advertisement is not a verified opening.'],
    training_supply:['Explore learning options','Check course availability directly with the institution.'],
    project_announcement:['See what might change','This is an announcement, not a current job opening.'],
    social_signal:['Read cautiously','A social mention is not a verified vacancy.'],
  },
  institution: {
    employer_confirmation:['Review an employer need','Check whether your programme and cohort could be relevant.'],
    job_ad:['Explore recurring role needs','Look at the skills employers mention before planning outreach.'],
    training_supply:['Compare programme supply','Confirm actual seats and pass-outs before planning.'],
    project_announcement:['Consider future curriculum needs','An announced project does not establish future vacancies.'],
    social_signal:['Review an emerging signal','Verify with employers before changing a programme.'],
  },
  industry: {
    employer_confirmation:['Compare role requirements','Use this role to explore qualified institutions and training needs.'],
    job_ad:['Explore sector requirements','See which skills appear in advertisements.'],
    training_supply:['Discover a possible training partner','Check the courses and available cohorts directly.'],
    project_announcement:['Watch possible market changes','This announcement does not prove hiring demand.'],
    social_signal:['Investigate market discussion','Verify independently before making a hiring decision.'],
  },
  research: {
    employer_confirmation:['Review a confirmed-case example','Inspect verification and second-person approval evidence.'],
    job_ad:['Check source provenance','Look for duplicates, location accuracy and missing fields.'],
    training_supply:['Validate programme records','Check institute sources and how recently they were updated.'],
    project_announcement:['Assess an announcement','Separate investment intent from role-level labour demand.'],
    social_signal:['Triangulate a weak signal','Look for independent evidence before using this in analysis.'],
  },
};

/** Return a finite, predictable, transparent briefing—never an engagement-maximising feed. */
export function demoBrief(signals, persona, limit=3) {
  const weight=WEIGHTS[persona]||WEIGHTS.learner;
  const actions=ACTIONS[persona]||ACTIONS.learner;
  // Mirrored advertisements count once in this finite briefing.
  const clusters=new Set();
  const unique=signals.filter(signal=>{const key=signal.cluster||signal.id;if(clusters.has(key))return false;clusters.add(key);return true;});
  const sorted=unique.map((signal,i)=>({
    signal, i, priority:weight[signal.kind]??0,
    action:actions[signal.kind]??['Inspect evidence','Review the source before making a decision.'],
  })).sort((a,b)=>b.priority-a.priority||a.i-b.i);
  return sorted.slice(0,Math.max(0,Math.min(limit,10))).map(({signal,action})=>({
    id:signal.id,signal,headline:action[0],next:action[1],
    because:'Shown because you chose the '+(DEMO_PEOPLE.find(x=>x[0]===persona)?.[1]||'Learner')+' view and this evidence category supports that task.',
  }));
}
