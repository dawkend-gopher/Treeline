/* Pure math. No screen code. Safe to read; change with care. */
/* ---------- 2. CORE (pure math — no screen code here) ---------- */
const DEG = Math.PI/180, DAY = 864e5, HOUR = 36e5;

/* Sun & moon positions (after the well-known SunCalc formulas). */
const Astro = (() => {
  const e = DEG*23.4397;
  const toDays = t => t/DAY - 0.5 + 2440588 - 2451545;
  const ra  = (l,b) => Math.atan2(Math.sin(l)*Math.cos(e) - Math.tan(b)*Math.sin(e), Math.cos(l));
  const dec = (l,b) => Math.asin(Math.sin(b)*Math.cos(e) + Math.cos(b)*Math.sin(e)*Math.sin(l));
  const alt = (H,phi,d) => Math.asin(Math.sin(phi)*Math.sin(d) + Math.cos(phi)*Math.cos(d)*Math.cos(H));
  const sidereal = (d,lw) => DEG*(280.16 + 360.9856235*d) - lw;
  const wrap = a => { a = (a+Math.PI) % (2*Math.PI); if (a<0) a += 2*Math.PI; return a - Math.PI; };
  function sun(d){ const M=DEG*(357.5291+0.98560028*d);
    const L=M+DEG*(1.9148*Math.sin(M)+0.02*Math.sin(2*M)+0.0003*Math.sin(3*M))+DEG*102.9372+Math.PI;
    return {dec:dec(L,0), ra:ra(L,0)}; }
  function moon(d){ const L=DEG*(218.316+13.176396*d), M=DEG*(134.963+13.064993*d), F=DEG*(93.272+13.229350*d);
    const l=L+DEG*6.289*Math.sin(M), b=DEG*5.128*Math.sin(F);
    return {ra:ra(l,b), dec:dec(l,b), dist:385001-20905*Math.cos(M)}; }
  function pos(body,t,lat,lon){ const d=toDays(t), c=body==='sun'?sun(d):moon(d);
    const H=sidereal(d,-lon*DEG)-c.ra; return {alt:alt(H,lat*DEG,c.dec), H:wrap(H)}; }
  function illum(t){ const d=toDays(t), s=sun(d), m=moon(d), sd=149598000;
    const phi=Math.acos(Math.sin(s.dec)*Math.sin(m.dec)+Math.cos(s.dec)*Math.cos(m.dec)*Math.cos(s.ra-m.ra));
    const inc=Math.atan2(sd*Math.sin(phi), m.dist-sd*Math.cos(phi));
    const ang=Math.atan2(Math.cos(s.dec)*Math.sin(s.ra-m.ra), Math.sin(s.dec)*Math.cos(m.dec)-Math.cos(s.dec)*Math.sin(m.dec)*Math.cos(s.ra-m.ra));
    return {fraction:(1+Math.cos(inc))/2, phase:0.5+0.5*inc*(ang<0?-1:1)/Math.PI}; }
  // Walk through time in 2-minute steps and note rises, sets, overhead and underfoot moments.
  function scan(body,from,to,lat,lon,h0){
    const out=[], step=12e4; let p=pos(body,from,lat,lon), pt=from;
    for (let t=from+step; t<=to; t+=step){
      const c=pos(body,t,lat,lon), a0=p.alt-h0, a1=c.alt-h0;
      if (a0<0 && a1>=0) out.push({type:'rise', t:pt+step*(-a0/(a1-a0))});
      if (a0>=0 && a1<0) out.push({type:'set',  t:pt+step*(a0/(a0-a1))});
      if (p.H<0 && c.H>=0 && p.H>-1) out.push({type:'over', t:pt+step*(-p.H/(c.H-p.H))});
      if (p.H>2 && c.H<-2) out.push({type:'under', t:pt+step/2});
      p=c; pt=t;
    }
    return out;
  }
  function phaseName(p){
    const n=[[.03,'New moon'],[.22,'Waxing crescent'],[.28,'First quarter'],[.47,'Waxing gibbous'],[.53,'Full moon'],[.72,'Waning gibbous'],[.78,'Last quarter'],[.97,'Waning crescent'],[1.01,'New moon']];
    return n.find(x=>p<x[0])[1];
  }
  // Everything for one local day that starts at d0 (local midnight, in ms).
  function day(d0,lat,lon,legalMin,cfg){
    const end=d0+DAY, sunEv=scan('sun',d0,end,lat,lon,-0.833*DEG);
    const sunrise=(sunEv.find(x=>x.type==='rise')||{}).t ?? null, sunset=(sunEv.find(x=>x.type==='set')||{}).t ?? null;
    const mEv=scan('moon',d0-3*HOUR,end+3*HOUR,lat,lon,0.125*DEG);
    const periods=[];
    for (const ev of mEv){
      const major = ev.type==='over'||ev.type==='under', half=(major?cfg.majorMin:cfg.minorMin)*6e4;
      const p={kind:major?'major':'minor', cause:ev.type, t:ev.t, start:ev.t-half, end:ev.t+half};
      if (p.end>d0 && p.start<end) periods.push(p);
    }
    periods.sort((a,b)=>a.start-b.start);
    const moonEv=mEv.filter(x=>x.t>=d0&&x.t<end);
    const il=illum(d0+12*HOUR);
    const pScore=Math.max(0,1-Math.min(Math.abs(il.phase),Math.abs(il.phase-.5),Math.abs(il.phase-1))/.25);
    const overlap=periods.some(p=>[sunrise,sunset].some(s=>s!=null && p.start-HOUR<s && p.end+HOUR>s));
    const rating=Math.min(4,1+Math.round(2*pScore)+(overlap?1:0));
    return {d0, sunrise, sunset,
      legalStart: sunrise!=null ? sunrise-legalMin*6e4 : null,
      legalEnd:   sunset!=null  ? sunset+legalMin*6e4  : null,
      periods, moonEv, moon:{...il, name:phaseName(il.phase)}, rating, overlap};
  }
  return {pos, illum, scan, day, phaseName};
})();

/* Hunt score: each factor returns a value 0..1 and a plain-English reason.
   These are common hunting rules of thumb, not proven science — tune them freely. */
const Factors = {
  light(c,sp){
    const {t,day}=c;
    if (day.sunrise==null||day.sunset==null) return {v:.5,why:'No sunrise data'};
    const legal = t>=day.legalStart && t<=day.legalEnd;
    if (!legal) return sp.night ? {v:.8,why:'Night — hogs move after dark'} : {v:0,why:'Outside legal shooting light'};
    const dm=Math.min(Math.abs(t-day.sunrise),Math.abs(t-day.sunset))/6e4;
    if (sp.morning){ if (t>=day.legalStart && t<=day.sunrise+3*HOUR) return {v:1,why:'Morning — gobbling and strutting time'};
      return {v:.35,why:'Afternoon — birds are quieter'}; }
    if (sp.night && dm>120) return {v:.2,why:'Midday — hogs bed down in heat'};
    if (dm<=60) return {v:1,why:'Within an hour of sunrise or sunset'};
    if (dm<=120) return {v:.7,why:'Close to dawn or dusk'};
    return {v:.3,why:'Midday lull'};
  },
  solunar(c){
    const {t,day}=c, inP=day.periods.find(p=>t>=p.start&&t<=p.end);
    if (inP) return inP.kind==='major' ? {v:1,why:'Inside a major solunar period'} : {v:.75,why:'Inside a minor solunar period'};
    if (day.periods.some(p=>t>=p.start-18e5&&t<=p.end+18e5)) return {v:.4,why:'Near a solunar period'};
    return {v:.1,why:'Between solunar periods'};
  },
  pressure(c){
    const d=c.pTrend, p=c.p;
    if (d==null) return {v:.5,why:'No pressure data'};
    if (d<=-3) return {v:.45,why:'Pressure falling fast — storm close'};
    if (d<=-.6) return {v:.95,why:'Pressure falling — front coming, animals feed'};
    if (d>=.6) return {v:.8,why:'Pressure rising — clearing after a front'};
    return p!=null&&p>=1020 ? {v:.7,why:'Steady high pressure'} : {v:.55,why:'Steady pressure'};
  },
  wind(c,sp){
    const w=c.wind; if (w==null) return {v:.5,why:'No wind data'};
    if (sp.windCurve==='windy'){
      if (w<5) return {v:.3,why:'Calm — ducks sit tight'}; if (w<10) return {v:.6,why:'Light breeze'};
      if (w<=20) return {v:1,why:'Good wind keeps birds flying'}; if (w<=28) return {v:.7,why:'Strong wind'};
      return {v:.4,why:'Very strong wind'};
    }
    if (w<2) return {v:.75,why:'Dead calm — sound carries'}; if (w<=10) return {v:1,why:'Light, steady wind'};
    if (w<=15) return {v:.65,why:'Breezy'}; if (w<=20) return {v:.4,why:'Windy — animals get jumpy'};
    return {v:.15,why:'High wind — animals hole up'};
  },
  temp(c){
    const d=c.tDelta; if (d==null) return {v:.55,why:'No temperature trend'};
    if (d<=-8) return {v:1,why:'Much colder than yesterday'}; if (d<=-3) return {v:.85,why:'Cooler than yesterday'};
    if (d<3) return {v:.6,why:'About the same as yesterday'}; if (d<8) return {v:.4,why:'Warmer than yesterday'};
    return {v:.25,why:'Much warmer than yesterday'};
  },
  rain(c){
    const r=c.rain, pr=c.prob;
    if (r==null&&pr==null) return {v:.7,why:'No rain data'};
    if (r>=.1) return {v:.2,why:'Heavy rain'}; if (r>=.02) return {v:.6,why:'Light rain'};
    if (pr!=null&&pr>=60) return {v:.55,why:'Rain likely'}; return {v:.85,why:'Dry'};
  }
};
const FACTOR_LABELS={light:'Light',solunar:'Solunar',pressure:'Pressure',wind:'Wind',temp:'Temp trend',rain:'Rain'};
function huntScore(ctx,sp){
  let s=0; const parts=[];
  for (const k in sp.w){ const r=Factors[k](ctx,sp); s+=sp.w[k]*r.v; parts.push({k,label:FACTOR_LABELS[k]||k,w:sp.w[k],...r}); }
  const legal = ctx.t>=ctx.day.legalStart && ctx.t<=ctx.day.legalEnd;
  return {score:Math.round(100*s), parts, legal: legal || !!sp.night};
}

/* Exterior ballistics: point-mass solver with standard G1/G7 drag tables. */
const Ballistics = (() => {
  const G1=[[0,.2629],[.05,.2558],[.1,.2487],[.15,.2413],[.2,.2344],[.25,.2278],[.3,.2214],[.35,.2155],[.4,.2104],[.45,.2061],[.5,.2032],[.55,.202],[.6,.2034],[.7,.2165],[.725,.223],[.75,.2313],[.775,.2417],[.8,.2546],[.825,.2706],[.85,.2901],[.875,.3136],[.9,.3415],[.925,.3734],[.95,.4084],[.975,.4448],[1,.4805],[1.025,.5136],[1.05,.5427],[1.075,.5677],[1.1,.5883],[1.125,.6053],[1.15,.6191],[1.2,.6393],[1.25,.6518],[1.3,.6589],[1.35,.6621],[1.4,.6625],[1.45,.6607],[1.5,.6573],[1.55,.6528],[1.6,.6474],[1.65,.6413],[1.7,.6347],[1.75,.628],[1.8,.621],[1.85,.6141],[1.9,.6072],[1.95,.6003],[2,.5934],[2.05,.5867],[2.1,.5804],[2.15,.5743],[2.2,.5685],[2.25,.563],[2.3,.5577],[2.35,.5527],[2.4,.5481],[2.45,.5438],[2.5,.5397],[2.6,.5325],[2.7,.5264],[2.8,.5211],[2.9,.5168],[3,.5133],[3.1,.5105],[3.2,.5084],[3.3,.5067],[3.4,.5054],[3.5,.504],[3.6,.503],[3.7,.5022],[3.8,.5016],[3.9,.501],[4,.5006],[4.2,.4998],[4.4,.4995],[4.6,.4992],[4.8,.499],[5,.4988]];
  const G7=[[0,.1198],[.05,.1197],[.1,.1196],[.15,.1194],[.2,.1193],[.25,.1194],[.3,.1194],[.35,.1194],[.4,.1193],[.45,.1193],[.5,.1194],[.55,.1193],[.6,.1194],[.65,.1197],[.7,.1202],[.725,.1207],[.75,.1215],[.775,.1226],[.8,.1242],[.825,.1266],[.85,.1306],[.875,.1368],[.9,.1464],[.925,.166],[.95,.2054],[.975,.2993],[1,.3803],[1.025,.4015],[1.05,.4043],[1.075,.4034],[1.1,.4014],[1.125,.3987],[1.15,.3955],[1.2,.3884],[1.25,.381],[1.3,.3732],[1.35,.3657],[1.4,.358],[1.5,.344],[1.55,.3376],[1.6,.3315],[1.65,.326],[1.7,.3209],[1.75,.316],[1.8,.3117],[1.85,.3078],[1.9,.3042],[1.95,.301],[2,.298],[2.05,.2951],[2.1,.2922],[2.15,.2892],[2.2,.2864],[2.25,.2835],[2.3,.2807],[2.35,.2779],[2.4,.2752],[2.45,.2725],[2.5,.2697],[2.55,.267],[2.6,.2643],[2.65,.2615],[2.7,.2588],[2.75,.2561],[2.8,.2533],[2.85,.2506],[2.9,.2479],[2.95,.2451],[3,.2424],[3.1,.2368],[3.2,.2313],[3.3,.2258],[3.4,.2205],[3.5,.2154],[3.6,.2106],[3.7,.206],[3.8,.2017],[3.9,.1975],[4,.1935],[4.2,.1861],[4.4,.1793],[4.6,.173],[4.8,.1672],[5,.1618]];
  function cd(tbl,m){ if (m<=tbl[0][0]) return tbl[0][1];
    for (let i=1;i<tbl.length;i++) if (m<=tbl[i][0]){ const [a,ca]=tbl[i-1],[b,cb]=tbl[i]; return ca+(cb-ca)*(m-a)/(b-a); }
    return tbl[tbl.length-1][1]; }
  function atmos(tempF,altFt){ const P=29.92*Math.pow(1-6.8753e-6*altFt,5.2559), T=tempF+459.67;
    return {dens:(P/29.92)*(518.67/T), sound:49.0223*Math.sqrt(T)}; }
  // Fly one bullet. Returns samples at each requested yardage. Distances in feet internally.
  function fly(o,angle,yards){
    const at=atmos(o.tempF,o.altFt), tbl=o.model==='G7'?G7:G1, g=32.174*Math.cos((o.inclineDeg||0)*DEG);
    const want=[...yards].sort((a,b)=>a-b), res=[]; let i=0;
    let x=0,y=-o.sightIn/12,z=0,vx=o.mv*Math.cos(angle),vy=o.mv*Math.sin(angle),vz=0,t=0;
    const wz=-(o.crossMph||0)*1.46667; // wind from the right (+) pushes the bullet left (-)
    while (i<want.length){
      const rx=vx, ry=vy, rz=vz-wz, sp=Math.hypot(rx,ry,rz);
      if (sp<100 || t>10) break;
      const k=at.dens*cd(tbl,sp/at.sound)*2.08551e-4/o.bc, dt=1/sp;
      const px=x,py=y,pz=z,pv=Math.hypot(vx,vy,vz),pt=t;
      vx-=k*sp*rx*dt; vy-=(k*sp*ry+g)*dt; vz-=k*sp*rz*dt;
      x+=vx*dt; y+=vy*dt; z+=vz*dt; t+=dt;
      while (i<want.length && x>=want[i]*3){
        const f=(want[i]*3-px)/(x-px), v=pv+(Math.hypot(vx,vy,vz)-pv)*f;
        res.push({yd:want[i], dropIn:(py+(y-py)*f)*12, driftIn:(pz+(z-pz)*f)*12, v, time:pt+(t-pt)*f}); i++;
      }
    }
    return res;
  }
  // Find the barrel angle that puts the bullet on the line of sight at the zero distance.
  function zeroAngle(o,zeroYd){
    const base={...o,crossMph:0,inclineDeg:0}; let lo=-0.01, hi=0.03;
    for (let n=0;n<40;n++){ const mid=(lo+hi)/2, r=fly(base,mid,[zeroYd])[0];
      if (!r || r.dropIn<0) lo=mid; else hi=mid; }
    return (lo+hi)/2;
  }
  const inPerUnit=(unit,yd)=> unit==='MIL' ? 3.6*yd/100 : 1.0472*yd/100;
  const clicks=(inches,yd,rifle)=> inches/inPerUnit(rifle.clickUnit,yd)/rifle.clickValue;
  function opts(rifle,load,env){ return {mv:+load.mv,bc:+load.bc,model:load.model,sightIn:+rifle.sightIn,
    tempF:+env.tempF,altFt:+env.altFt,inclineDeg:+env.inclineDeg||0,crossMph:crossWind(+env.windMph,+env.windClock)}; }
  // Clock direction: 3 o'clock = from the right, 9 = from the left, 12 = head-on.
  function crossWind(mph,clock){ return mph*Math.sin((clock%12)*30*DEG); }
  // Full range card for a load that is zeroed (or has its correction dialed in).
  function table(rifle,load,env,yards){
    const o=opts(rifle,load,env), a=zeroAngle(o,+rifle.zeroYd);
    return fly(o,a,yards).map(r=>({...r, energy:(+load.grains)*r.v*r.v/450240,
      upClicks:-clicks(r.dropIn,r.yd,rifle), holdUnits:-r.dropIn/inPerUnit(rifle.clickUnit,r.yd),
      windClicks:-clicks(r.driftIn,r.yd,rifle)}));
  }
  // Estimated scope change when you swap from the zero load to another load.
  function swapEstimate(rifle,zeroLoad,load,env){
    const zo=opts(rifle,zeroLoad,{...env,windMph:0,inclineDeg:0}), a=zeroAngle(zo,+rifle.zeroYd);
    const r=fly(opts(rifle,load,{...env,windMph:0,inclineDeg:0}),a,[+rifle.zeroYd])[0];
    if (!r) return null;
    return {inches:r.dropIn, upClicks:-clicks(r.dropIn,+rifle.zeroYd,rifle)};
  }
  return {fly, zeroAngle, table, swapEstimate, clicks, inPerUnit, crossWind, atmos};
})();
