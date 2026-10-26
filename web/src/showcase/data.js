// Synthetic, self-contained demonstration database.
// No connector keys, real employer records, claims of actual hiring or outside calls.
export const AS_OF='26 Oct 2026';
export const GEOGRAPHIES=[
  {id:'noida',label:'Noida 62/63',region:'Uttar Pradesh',sectors:['Sector 62','Sector 63'],center:'Noida'},
  {id:'kalyani',label:'Kalyani',region:'West Bengal',sectors:['Kalyani Industrial Area','Nadia'],center:'Kalyani'},
  {id:'siliguri',label:'Siliguri',region:'West Bengal',sectors:['Siliguri','Bagdogra'],center:'Siliguri'}
];
export const ROLE_FAMILIES=[
 {id:'quality',title:'Quality inspection',sector:'Manufacturing',role:'Quality Inspection Technician',skills:['Quality checks','Measurement','Documentation','Excel'],qualification:'ITI / Diploma',salary:18,change:18,programme:'Fitter'},
 {id:'electronics',title:'Electronics production',sector:'Electronics',role:'Electronics Assembly Associate',skills:['Circuit testing','Soldering','Quality checks','Safety'],qualification:'ITI / Diploma',salary:20,change:24,programme:'Electronics Mechanic'},
 {id:'maintenance',title:'Maintenance',sector:'Manufacturing',role:'Electrical Maintenance Technician',skills:['Electrical wiring','Fault diagnosis','Safety','PLC basics'],qualification:'ITI',salary:22,change:13,programme:'Electrician'},
 {id:'data',title:'Data operations',sector:'IT & Services',role:'Data Operations Analyst',skills:['Excel','SQL','Communication','Data cleaning'],qualification:'Diploma / Degree',salary:29,change:35,programme:'COPA'},
 {id:'customer',title:'Customer operations',sector:'Services',role:'Customer Operations Associate',skills:['Communication','CRM tools','Digital literacy','Excel'],qualification:'Degree / Diploma',salary:21,change:11,programme:'COPA'},
 {id:'logistics',title:'Logistics',sector:'Logistics',role:'Warehouse & Inventory Associate',skills:['Inventory','Excel','Workplace safety','Documentation'],qualification:'ITI / Degree',salary:19,change:16,programme:'Fitter'},
 {id:'hospitality',title:'Hospitality',sector:'Hospitality',role:'Guest Services Associate',skills:['Communication','Customer service','Digital tools','Problem solving'],qualification:'Degree / ITI',salary:18,change:22,programme:'Front Office Assistant'},
 {id:'automation',title:'Automation',sector:'Industrial tech',role:'Junior Automation Technician',skills:['PLC basics','Electrical wiring','Troubleshooting','Documentation'],qualification:'ITI / Diploma',salary:26,change:42,programme:'Electrician'},
 ];
export const PARTNERS={
 noida:['Aster Manufacturing Works','Northline Systems','Cobalt Electronics','Orion Logistics','Sage Digital Services','Helios Industries','BluePeak Operations','Kite Process Labs'],
 kalyani:['Nadia Precision Works','Eastern Controls','Kalyani Service Hub','Riverbend Manufacturing','Vector Instruments','Delta Process Works','Garden State Electronics','Junction Logistics'],
 siliguri:['North Bengal Hospitality','Himalaya Service Hub','Terai Logistics','Foothill Systems','Hillview Operations','Gateway Retail Services','Eastern Guest Services','Northline Warehousing']
};
export const INSTITUTES=[
 {id:'i01',name:'Sector 62 Technical Training Centre',area:'noida',type:'ITI',programmes:['Electrician','Electronics Mechanic','Fitter'],seats:380,completion:2027,readiness:82},
 {id:'i02',name:'Noida Skills Polytechnic',area:'noida',type:'Polytechnic',programmes:['Electrical Engineering','Computer Engineering','Mechanical Engineering'],seats:520,completion:2027,readiness:78},
 {id:'i03',name:'North City College of Applied Studies',area:'noida',type:'College',programmes:['BCA','BSc Data Science','BCom'],seats:740,completion:2027,readiness:85},
 {id:'i04',name:'Sector 63 Industrial Skills Centre',area:'noida',type:'ITI',programmes:['Fitter','Welder','COPA'],seats:310,completion:2027,readiness:74},
 {id:'i05',name:'Kalyani Skills & Technology Institute',area:'kalyani',type:'ITI',programmes:['Electrician','Fitter','COPA'],seats:300,completion:2027,readiness:76},
 {id:'i06',name:'Nadia Polytechnic Centre',area:'kalyani',type:'Polytechnic',programmes:['Mechanical Engineering','Electronics Engineering'],seats:420,completion:2027,readiness:83},
 {id:'i07',name:'Kalyani College of Technology',area:'kalyani',type:'College',programmes:['BCA','BSc Physics','BCom'],seats:610,completion:2027,readiness:79},
 {id:'i08',name:'North Bengal Technical Institute',area:'siliguri',type:'ITI',programmes:['Electrician','Fitter','Front Office Assistant'],seats:340,completion:2027,readiness:80},
 {id:'i09',name:'Siliguri Women’s Skills Centre',area:'siliguri',type:'ITI',programmes:['COPA','Front Office Assistant','Electronics Mechanic'],seats:275,completion:2027,readiness:86},
 {id:'i10',name:'Siliguri Polytechnic Academy',area:'siliguri',type:'Polytechnic',programmes:['Electrical Engineering','Computer Engineering','Civil Engineering'],seats:440,completion:2027,readiness:81},
 {id:'i11',name:'Himalayan Gateway College',area:'siliguri',type:'College',programmes:['BCA','BBA','BCom'],seats:570,completion:2027,readiness:84}
];
export const SOURCE_REGISTRY=[
 {id:'plfs',name:'MoSPI / PLFS',group:'Government',type:'Aggregate employment indicators',cadence:'Quarterly',health:'Healthy',records:421,latency:4,coverage:'State & national'},
 {id:'ogd',name:'Open Government Data',group:'Government',type:'Government open datasets',cadence:'Weekly',health:'Healthy',records:1226,latency:13,coverage:'India / state'},
 {id:'ncs',name:'National Career Service',group:'Government',type:'Job and occupation records',cadence:'Every 6 hours',health:'Healthy',records:1840,latency:8,coverage:'India / state'},
 {id:'skills',name:'Skilling & ITI MIS',group:'Government',type:'Training and pass-out supply',cadence:'Daily',health:'Healthy',records:634,latency:21,coverage:'Selected districts'},
 {id:'portal',name:'Job portal partners',group:'Job portals',type:'Advertised employer requirements',cadence:'Every 3 hours',health:'Healthy',records:3842,latency:6,coverage:'Selected regions'},
 {id:'career',name:'Company career pages',group:'Job portals',type:'Company-origin job postings',cadence:'Every 6 hours',health:'Healthy',records:891,latency:16,coverage:'Selected regions'},
 {id:'staff',name:'Staffing partner feeds',group:'Job portals',type:'Staffing and apprenticeship ads',cadence:'Daily',health:'Healthy',records:528,latency:38,coverage:'Selected regions'},
 {id:'social',name:'Social & company signals',group:'Social & media',type:'Public employer and hiring mentions',cadence:'Every 2 hours',health:'Healthy',records:1137,latency:11,coverage:'Permitted sources'},
 {id:'press',name:'Press & investment signals',group:'Social & media',type:'Investments and sector developments',cadence:'Daily',health:'Healthy',records:284,latency:52,coverage:'Selected states'},
 {id:'direct',name:'Direct employer confirmation',group:'Direct',type:'Employer-verified requirements',cadence:'On confirmation',health:'Healthy',records:64,latency:72,coverage:'Participating employers'},
 {id:'institute',name:'Institution programme feeds',group:'Direct',type:'Training programmes and cohorts',cadence:'Weekly',health:'Healthy',records:412,latency:124,coverage:'Participating institutions'}
];
// Deterministic pseudo-production population. No randomness, no endpoint.
export const SIGNALS=[];
let seq=1;
for(const geo of GEOGRAPHIES){
  for(let j=0;j<ROLE_FAMILIES.length;j++){
    // Three distinct ads in each family, plus a fourth mirrored portal listing.
    for(let k=0;k<3;k++){
      const role=ROLE_FAMILIES[j],employer=PARTNERS[geo.id][(j+k)%8];
      const day=4+((j*3+k*7)%18), wage=role.salary+(k*2),verified=(j+k)%6===0;
      const base={
        id:'OE-'+String(seq++).padStart(4,'0'),area:geo.id,zone:geo.sectors[(j+k)%2],
        employer,role:role.role,title:role.role,roleId:role.id,sector:role.sector,
        kind:verified?'employer_confirmation':'job_ad',source:verified?'Direct employer confirmation':k===1?'Company career pages':'Job portal partners',
        status:verified?'Employer confirmed':'Observed advertisement',
        confidence:verified?92:76+((j+k)%14),
        skill:role.skills,qualification:role.qualification,wage,
        posted:'2026-10-'+String(day).padStart(2,'0'), openings:verified?2+(j%5):null,
        cluster:geo.id+'-'+j+'-'+k,geoPrecision:'area',sourceCount:verified?3:1,
        employerVerified:verified,description:verified?'Employer confirmation recorded and approved in this demonstration.':'Job listing collected and standardised from a simulated source feed.',
        x:geo.id==='noida'?20+((j*11+k*6)%65):geo.id==='kalyani'?19+((j*13+k*5)%62):25+((j*9+k*9)%58),
        y:19+((j*9+k*11)%59)
      };
      SIGNALS.push(base);
      if(k===0 && j%2===0)SIGNALS.push({...base,id:'OE-'+String(seq++).padStart(4,'0'),source:'Staffing partner feeds',kind:'job_ad',status:'Mirrored advertisement',employerVerified:false,openings:null,confidence:72,sourceCount:1,description:'Duplicate portal observation; merged under the same source cluster.'});
    }
    if(j%2===0){
      const role=ROLE_FAMILIES[j];
      SIGNALS.push({id:'OE-'+String(seq++).padStart(4,'0'),area:geo.id,zone:geo.sectors[j%2],role:role.role,title:role.title+' demand discussion',roleId:role.id,sector:role.sector,
        kind:'social_signal',source:'Social & company signals',status:'Emerging mention',employer:PARTNERS[geo.id][j],
        confidence:43+(j%10),skill:role.skills,qualification:role.qualification,wage:null,posted:'2026-10-22',
        openings:null,cluster:geo.id+'-social-'+j,geoPrecision:'region',sourceCount:1,employerVerified:false,
        description:'Unconfirmed social signal; corroboration needed before it contributes to actionable demand.',
        x:31+j*7,y:25+j*5});
    }
  }
  SIGNALS.push({id:'OE-'+String(seq++).padStart(4,'0'),area:geo.id,zone:geo.sectors[0],role:'Investment signal',title:'Industrial expansion announced',roleId:'automation',sector:'Industrial tech',
    kind:'project_announcement',source:'Press & investment signals',status:'Planning announcement',
    employer:PARTNERS[geo.id][3],confidence:58,skill:['Automation','Workforce planning'],qualification:'Not specified',wage:null,
    posted:'2026-10-20',openings:null,cluster:geo.id+'-project',geoPrecision:'region',sourceCount:2,employerVerified:false,
    description:'An announced project is not evidence of actual recruitment or specific open jobs.',x:71,y:58});
}
export const distinct=(items)=>items.filter((x,i,a)=>a.findIndex(y=>y.cluster===x.cluster)===i);
export const LOCATION_LABEL={noida:'Noida Sectors 62/63',kalyani:'Kalyani',siliguri:'Siliguri'};
export const DATE_LABEL='Updated 26 October 2026';
