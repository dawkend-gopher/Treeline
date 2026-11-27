/* ---------- 3. STORE ---------- */
const Store = (() => {
  const KEY='treeline.v1'; let ref=null, mode='phone', timer=null, busy=false, again=false;
  const local=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } };
  const saveLocal=s=>{ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} };
  async function push(){ if (!ref) return; if (busy){ again=true; return; } busy=true;
    try{ await ref.set({json:JSON.stringify(S), updated:S.updated}); mode='cloud'; }catch(e){ mode='phone'; }
    busy=false; pill(); if (again){ again=false; push(); } }
  function save(){ S.updated=Date.now(); saveLocal(S); clearTimeout(timer); timer=setTimeout(push,800); }
  async function connect(onLoad){
    try{
      if (!window.claude || !claude.use) return;
      const [db,user]=await Promise.all([claude.use('db'), claude.use('user')]);
      if (!db || !user) return; const id=await user.id(); if (!id) return;
      ref=db.doc('data/users/'+id+'/locker'); const snap=await ref.get(); mode='cloud';
      let remote=null; if (snap.exists){ try{ remote=JSON.parse(snap.data().json); }catch(e){} }
      onLoad(remote);
    }catch(e){ mode='phone'; } pill();
  }
  function pill(){ $('#savePill').textContent = mode==='cloud' ? 'Saved to your account' : 'Saved on this phone'; }
  return {local, save, saveLocal, connect, push, pill, get mode(){ return mode; }};
})();

const rifle = () => S.rifles.find(r=>r.id===S.activeRifleId) || S.rifles[0];
const loadOf = (r,id) => r && r.loads.find(l=>l.id===id);
const curLoad = () => { const r=rifle(); return loadOf(r,r.activeLoadId)||r.loads[0]; };
/* Velocity used for all math: trued > chronograph > box adjusted for barrel length. */
function effMV(r,l){ if (+l.mvTrued>0) return {v:+l.mvTrued, src:'trued'}; if (+l.mvChrono>0) return {v:+l.mvChrono, src:'chronograph'};
  const tb=+l.testBarrel||0, b=+r.barrelIn||0; if (tb>0 && b>0 && +l.mv>0) return {v:Math.round(+l.mv-(tb-b)*CONFIG.fpsPerInch), src:`adjusted for ${b}" barrel`};
  return {v:+l.mv, src:'box'}; }
const Lp = (r,l) => ({...l, mv:effMV(r,l).v});
const tbl = (r,l,env,yards) => Ballistics.table(r,Lp(r,l),env,yards);
const DIRS=['N','NE','E','SE','S','SW','W','NW'];
function correction(r,l){
  if (!r || !l || l.id===r.zeroLoadId) return {up:0,right:0,source:'zero'};
  if (l.fixUp!=null) return {up:l.fixUp, right:l.fixRight||0, source:'confirmed'};
  const z=loadOf(r,r.zeroLoadId); const est = z && +z.bc>0 && +l.bc>0 ? Ballistics.swapEstimate(r,Lp(r,z),Lp(r,l),S.env) : null;
  return {up: est?Math.round(est.upClicks):0, right:0, source:'estimate'};
}
const dirWord = (n,pos,neg) => n===0 ? 'No change' : `${n>0?pos:neg} ${Math.abs(n)} click${Math.abs(n)===1?'':'s'}`;

/* ---------- 4. WEATHER ---------- */
const Weather = (() => {
  const KEY='treeline.wx'; let data=null, status='idle';
  async function load(force){
    const {lat,lon}=S.location;
    try{ const c=JSON.parse(localStorage.getItem(KEY)||'null');
      if (c && c.lat===lat && c.lon===lon){ data=c; if (!force && Date.now()-c.at<HOUR){ status='live'; return; } } }catch(e){}
    status='loading';
    try{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,precipitation,precipitation_probability,cloud_cover&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timeformat=unixtime&timezone=GMT&past_days=1&forecast_days=7`;
      const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),8000);
      const j=await (await fetch(url,{signal:ctl.signal})).json(); clearTimeout(tm);
      const h=j.hourly; data={lat,lon,at:Date.now(),t0:h.time[0]*1000, rows:h.time.map((t,i)=>({t:t*1000,temp:h.temperature_2m[i],wind:h.wind_speed_10m[i],gust:h.wind_gusts_10m[i],dir:h.wind_direction_10m[i],p:h.pressure_msl[i],rain:h.precipitation[i],prob:h.precipitation_probability[i],cloud:h.cloud_cover[i]}))};
      try{ localStorage.setItem(KEY,JSON.stringify(data)); }catch(e){}
      status='live';
    }catch(e){ status = data && Date.now()-data.at<DAY ? 'cached' : 'manual'; }
  }
  function at(t){
    if (data && status!=='manual'){
      const i=Math.round((t-data.t0)/HOUR), r=data.rows[i];
      if (r){ const p3=data.rows[i-3], p24=data.rows[i-24];
        return {src:'live', ...r, pTrend:p3?r.p-p3.p:null, tDelta:p24?r.temp-p24.temp:null}; }
    }
    const m=S.manualWx;
    return {src:'manual', temp:+m.temp, wind:+m.wind, dir:DIRS.indexOf(m.dir||'N')*45, p:null,
      pTrend:{falling:-1.5,steady:0,rising:1.5,fast:-4}[m.trend], tDelta:{colder:-6,same:0,warmer:6}[m.vsYesterday],
      rain:{none:0,light:.04,heavy:.15}[m.rain], prob:null};
  }
  return {load, at, get status(){ return status; }};
})();

/* ---------- FACTORY AMMO LIST (ammo.json, loaded only when the picker opens) ---------- */
const AmmoDB = {
  list:null, loading:null,
  load(){ if (this.list) return Promise.resolve(this.list); if (this.loading) return this.loading;
    this.loading=fetch('ammo.json').then(r=>{ if (!r.ok) throw 0; return r.json(); }).then(j=>{ this.list=j; return j; }).catch(e=>{ this.loading=null; throw e; });
    return this.loading; },
  // "308 Winchester", ".308 Win" and "308" all become comparable keys
  key(c){ return String(c||'').toLowerCase().replace(/winchester/g,'win').replace(/remington/g,'rem').replace(/magnum/g,'mag').replace(/creedmoor/g,'cm')
    .replace(/springfield|sprg|spfld/g,'').replace(/[^a-z0-9]/g,''); },
  fits(entryCal,rifleCal){ const a=this.key(entryCal), r=this.key(rifleCal); return !!r && (a===r || a.startsWith(r) || r.startsWith(a)); },
  label(e){ return `${e.b} ${e.l} ${e.gr} gr ${e.bu}`; },
  notes(e){ return `From ${e.b}'s published specs${e.p?` (part ${e.p})`:''}.${e.g7?` G7 BC ${e.g7}.`:''} Source: ${e.s}`; }
};
function ammoPicker(rifleCal, onPick){
  const box=openSheet(`<div class="hd"><h2>Pick your ammo</h2><button class="ghost" data-x>Close</button></div>
    <input id="ap_q" type="search" placeholder="Search: hornady 150, fusion, eld-x" autocomplete="off" style="margin-top:6px">
    <div class="row" style="margin:10px 0" id="ap_opts"></div><div id="ap_list" class="small muted">Loading the list…</div>
    <p class="tiny muted" style="margin-top:12px">Numbers come from each maker's published specs. Your rifle may shoot a little slower than the box says, so true your velocity on the Range card for best results.</p>`);
  let only=true;
  const draw=()=>{ const list=AmmoDB.list, el=box.querySelector('#ap_list'); if (!list) return;
    const fitting=list.filter(e=>AmmoDB.fits(e.c,rifleCal)), useOnly=only && fitting.length>0;
    box.querySelector('#ap_opts').innerHTML = fitting.length ? `<button class="${useOnly?'on':''}" data-only>${useOnly?'Showing':'Show only'} ${esc(rifleCal)}</button>${useOnly?'<button class="ghost" data-all>Show all calibers</button>':''}`
      : `<span class="tiny muted">${rifleCal?`Nothing listed for "${esc(rifleCal)}" yet. Showing all calibers.`:'Showing all calibers.'}</span>`;
    const words=box.querySelector('#ap_q').value.toLowerCase().split(/\s+/).filter(Boolean);
    const hits=(useOnly?fitting:list).filter(e=>{ const h=`${e.b} ${e.l} ${e.c} ${e.gr} ${e.gr}gr ${e.bu} ${e.p||''}`.toLowerCase(); return words.every(w=>h.includes(w)); })
      .sort((a,b)=>a.c.localeCompare(b.c)||a.b.localeCompare(b.b)||a.gr-b.gr);
    el.className='';
    el.innerHTML = hits.length ? hits.slice(0,80).map(e=>`<button class="ammo-row" data-aid="${esc(e.id)}" style="width:100%;justify-content:space-between;text-align:left;margin-bottom:8px;padding:10px 14px;min-height:56px">
        <span><b>${esc(e.b)} ${esc(e.l)}</b><br><span class="small muted">${esc(e.c)} · ${e.gr} gr ${esc(e.bu)}</span></span>
        <span class="small" style="text-align:right;white-space:nowrap">${e.mv} fps<br><span class="muted">BC ${e.bc}</span></span></button>`).join('') + (hits.length>80?`<p class="tiny muted">Showing 80 of ${hits.length}. Type more to narrow it down.</p>`:'')
      : `<p class="small muted">No matches. Try fewer words, or close this and type the numbers from your box.</p>`; };
  box.addEventListener('input',e=>{ if (e.target.id==='ap_q') draw(); });
  box.addEventListener('click',e=>{ if (e.target.closest('[data-only]')){ only=true; draw(); } if (e.target.closest('[data-all]')){ only=false; draw(); }
    const r=e.target.closest('[data-aid]'); if (r){ const ent=AmmoDB.list.find(x=>x.id===r.dataset.aid); box.remove(); onPick(ent); } });
  AmmoDB.load().then(draw).catch(()=>{ box.querySelector('#ap_list').textContent='The ammo list couldn\'t load. Check your signal, or type the numbers from your box.'; });
}
// Fill an open load form from a picked entry
function fillLoadForm(box,e){
  const set=(k,v)=>{ const el=box.querySelector('#f_'+k); if (el && v!=null) el.value=v; };
  set('name',AmmoDB.label(e)); set('grains',e.gr); set('bc',e.bc); set('mv',e.mv); set('model','G1'); set('testBarrel',e.tb||''); set('mvChrono',''); set('notes',AmmoDB.notes(e));
  const k=box.querySelector('#f_kind'); if (k){ k.value='Factory'; k.dispatchEvent(new Event('change',{bubbles:true})); }
  toast('Filled in from the list');
}
const PICK_BTN = `<button type="button" class="brass wide" data-pickammo style="margin:10px 0 4px">Pick from list</button><div class="tiny muted" style="text-align:center">or type the numbers from your box below</div>`;


/* ---------- BACKUPS: your data lives on this phone, so keep a copy ---------- */
const Backup = {
  EVERY_DAYS: 14,                                   // how often to remind you
  hasData(){ return S.stands.length>0 || S.log.length>0 || S.rifles.some(r=>!/^Sample/.test(r.name)); },
  daysSince(){ return S.lastBackup ? Math.floor((Date.now()-S.lastBackup)/DAY) : null; },
  due(){ if (ON_CLAUDE || Store.mode==='cloud' || !this.hasData() || (S.backupSnooze||0)>Date.now()) return false;
    return !S.lastBackup || Date.now()-S.lastBackup > this.EVERY_DAYS*DAY; },
  download(){
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));
    a.download=`treeline-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
    S.lastBackup=Date.now(); Store.save(); toast('Backup saved to Downloads'); },
  // A safety copy is kept before anything that replaces your data, so it can be undone.
  keepSafety(why){ try{ localStorage.setItem('treeline.prev', JSON.stringify({why, at:Date.now(), data:S})); }catch(e){} },
  safety(){ try{ return JSON.parse(localStorage.getItem('treeline.prev')||'null'); }catch(e){ return null; } },
  undo(){ const p=this.safety(); if (!p) return false; const cur=S; S=upgrade(p.data); try{ localStorage.setItem('treeline.prev', JSON.stringify({why:'undo', at:Date.now(), data:cur})); }catch(e){} Store.save(); return true; },
  // Ask Chrome not to clear Treeline's storage when the phone runs low on space.
  async persist(){ try{ if (!navigator.storage||!navigator.storage.persist) return null; if (await navigator.storage.persisted()) return true; return await navigator.storage.persist(); }catch(e){ return null; } }
};
