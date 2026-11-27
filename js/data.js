/* ---------- 3. STORE ---------- */
const Store = (() => {
  const KEY=KEYP+'v1'; let ref=null, mode='phone', timer=null, busy=false, again=false, locked=false, warned=false;
  // read() never throws: it reports empty, ok (with the data) or bad (with the raw text, so nothing is lost).
  function read(){ let raw=null; try{ raw=localStorage.getItem(KEY); }catch(e){ return {state:'bad', raw:null}; }
    if (raw==null) return {state:'empty'};
    try{ const o=JSON.parse(raw); if (!o || typeof o!=='object' || Array.isArray(o)) throw 0; return {state:'ok', data:o, raw}; }catch(e){ return {state:'bad', raw}; } }
  const local=()=>{ const r=read(); return r.state==='ok'?r.data:null; };
  const saveLocal=s=>{ if (locked) return; try{ localStorage.setItem(KEY, JSON.stringify(s)); }
    catch(e){ if (!warned){ warned=true; toast('Phone storage is full, so changes may not save. Download a backup in Setup.'); } } };
  async function push(){ if (!ref) return; if (busy){ again=true; return; } busy=true;
    try{ await ref.set({json:JSON.stringify(S), updated:S.updated}); mode='cloud'; }catch(e){ mode='phone'; }
    busy=false; pill(); if (again){ again=false; push(); } }
  function save(){ if (locked) return; S.updated=Date.now(); saveLocal(S); clearTimeout(timer); timer=setTimeout(push,800); }
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
  function pill(){ $('#savePill').textContent = locked ? 'Not saving' : CHANNEL==='dev' ? 'PREVIEW copy' : mode==='cloud' ? 'Saved to your account' : 'Saved on this phone'; }
  return {KEY, read, local, save, saveLocal, connect, push, pill, lock(){ locked=true; clearTimeout(timer); }, get locked(){ return locked; }, get mode(){ return mode; }};
})();

const rifle = () => S.rifles.find(r=>r.id===S.activeRifleId) || S.rifles[0];
const loadOf = (r,id) => r && r.loads.find(l=>l.id===id);
const curLoad = () => { const r=rifle(); return loadOf(r,r.activeLoadId)||r.loads[0]; };
/* Velocity used for all math: trued > chronograph > box adjusted for barrel length. */
function effMV(r,l){ if (+l.mvTrued>0) return {v:+l.mvTrued, src:'trued'}; if (+l.mvChrono>0) return {v:+l.mvChrono, src:'chronograph'};
  const tb=+l.testBarrel||0, b=+r.barrelIn||0; if (tb>0 && b>0 && +l.mv>0) return {v:Math.round(+l.mv-(tb-b)*CONFIG.fpsPerInch), src:`adjusted for ${b}" barrel`};
  return {v:+l.mv, src:'box'}; }
// Load as the math sees it: true velocity, and the G7 BC when there is one (unless turned off in Setup)
const usesG7 = l => S.useG7!==false && +l.bc7>0;
const Lp = (r,l) => ({...l, mv:effMV(r,l).v, ...(usesG7(l)?{model:'G7', bc:+l.bc7}:{})});
/* Reticle holdover: which hash mark to put on the target. */
const reticleOf = r => CONFIG.reticles.find(x=>x.name===r.reticle) || CONFIG.reticles[0];
function holdMarks(r,inches,yd){ const t=reticleOf(r); if (!t.unit || !(yd>0)) return null;
  const units=inches/Ballistics.inPerUnit(t.unit,yd); return {units, marks:units/t.step, unit:t.unit, step:t.step}; }
function marksText(m,dirWord){ if (!m) return ''; const n=Math.abs(m.marks), ord=k=>k+((k%100>=11&&k%100<=13)?'th':({1:'st',2:'nd',3:'rd'}[k%10]||'th'));
  if (n<0.25) return 'Center of the crosshair';
  const lo=Math.floor(n), f=n-lo, unit=`${r1(Math.abs(m.units))} ${m.unit}`;
  if (f<0.2 && lo>0) return `${ord(lo)} mark ${dirWord} (${unit})`;
  if (f>0.8) return `${ord(lo+1)} mark ${dirWord} (${unit})`;
  return lo===0 ? `Just inside the 1st mark ${dirWord} (${unit})` : `Between the ${ord(lo)} and ${ord(lo+1)} marks ${dirWord} (${unit})`; }
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
  const KEY=KEYP+'wx'; let data=null, status='idle';
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
  set('name',AmmoDB.label(e)); set('grains',e.gr); set('bc',e.bc); set('bc7',e.g7||''); set('mv',e.mv); set('model','G1'); set('testBarrel',e.tb||''); set('mvChrono',''); set('notes',AmmoDB.notes(e));
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
  keepSafety(why){ try{ localStorage.setItem(KEYP+'prev', JSON.stringify({why, at:Date.now(), data:S})); }catch(e){} },
  safety(){ try{ return JSON.parse(localStorage.getItem(KEYP+'prev')||'null'); }catch(e){ return null; } },
  undo(){ const p=this.safety(); if (!p) return false; const cur=S; S=upgrade(p.data); try{ localStorage.setItem(KEYP+'prev', JSON.stringify({why:'undo', at:Date.now(), data:cur})); }catch(e){} Store.save(); return true; },
  // Ask Chrome not to clear Treeline's storage when the phone runs low on space.
  async persist(){ try{ if (!navigator.storage||!navigator.storage.persist) return null; if (await navigator.storage.persisted()) return true; return await navigator.storage.persist(); }catch(e){ return null; } }
};

/* ---------- 9. SNAPSHOTS: automatic daily copies (the last 3 days you opened the app) ---------- */
const Snapshots = {
  KEY: KEYP+'snaps', MAX: 3,
  list(){ try{ const a=JSON.parse(localStorage.getItem(this.KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } },
  // Taken at start-up from the data exactly as it was saved, before any update touches it.
  take(data, force){ const a=this.list(); const last=a[0];
    if (!force && last && Date.now()-last.at < 20*HOUR && (+last.data.schema||1)===(+data.schema||1)) return;
    a.unshift({at:Date.now(), app:RELEASE.version, data}); while (a.length>this.MAX) a.pop();
    for (;;){ try{ localStorage.setItem(this.KEY, JSON.stringify(a)); return; }catch(e){ if (a.length<=1) return; a.pop(); } } },
  restore(i){ const s=this.list()[i]; if (!s) return false; Backup.keepSafety('snapshot restore'); S=upgrade(s.data); S.onboarded=true; Store.save(); return true; }
};

/* ---------- 10. RESCUE: shown instead of the app if saved data can't be read. Nothing is ever erased. ---------- */
const Rescue = {
  KEY: KEYP+'rescue',
  keep(raw){ if (raw==null) return; try{ localStorage.setItem(this.KEY, JSON.stringify({at:Date.now(), app:RELEASE.version, raw})); }catch(e){} },
  download(raw){ const blob=new Blob([raw||''],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`treeline-rescue-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); },
  show(kind, raw, err){
    Store.lock(); this.keep(raw); Store.pill(); $('#tabs').innerHTML='';
    const snaps=Snapshots.list();
    const why = kind==='newer' ? `Your data was saved by a <b>newer version</b> of Treeline than the one that just opened (probably an old offline copy). Your data is fine. Connect to the internet and tap <b>Reload</b>.`
      : kind==='crash' ? `Treeline hit a problem while starting up${err?` (<span class="tiny">${esc(String(err.message||err))}</span>)`:''}. Your data has <b>not</b> been changed.`
      : `Treeline couldn't read your saved data. It has <b>not</b> been changed or erased.`;
    $('#view').innerHTML=`<div class="wrap"><h1>Your data is safe</h1>
      <div class="card"><p class="small">${why}</p><p class="small">Saving is paused until you choose what to do, so nothing can be overwritten.</p>
        <div class="row" style="margin-top:12px"><button class="brass" data-rs-reload>Reload</button><button data-rs-dl>Download my data</button></div></div>
      ${snaps.length?`<div class="card"><h3>Go back to a snapshot</h3><p class="small">Treeline keeps a copy from each of the last days you opened it.</p>
        ${snaps.map((x,i)=>`<button class="ghost" style="margin-top:8px" data-rs-snap="${i}">${new Date(x.at).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} · ${arr(x.data.rifles).length} rifle(s), ${arr(x.data.log).length} sit(s)</button>`).join('')}</div>`:''}
      ${kind==='newer'?'':`<div class="card"><h3>Start fresh</h3><p class="small">Only if nothing above works. Your current data stays stored as a rescue copy (and you can download it first), so it can still be recovered.</p>
        <button class="ghost" data-rs-fresh>Start fresh</button></div>`}
      <p class="tiny muted">If this keeps happening, send the downloaded file to whoever gave you Treeline.</p></div>`;
    $('[data-rs-reload]').onclick=()=>location.reload();
    $('[data-rs-dl]').onclick=()=>this.download(raw);
    $$('[data-rs-snap]').forEach(b=>b.onclick=()=>{ const s=snaps[+b.dataset.rsSnap]; try{ localStorage.setItem(Store.KEY, JSON.stringify(s.data)); location.reload(); }catch(e){ toast('Couldn\'t restore that snapshot'); } });
    const f=$('[data-rs-fresh]'); if (f) f.onclick=()=>{ if (f.dataset.sure){ try{ localStorage.removeItem(Store.KEY); }catch(e){} location.reload(); } else { f.dataset.sure=1; f.textContent='Tap again to start fresh'; } };
  }
};
