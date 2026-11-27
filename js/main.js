/* ---------- router: the tab bar is built from the Screens object ---------- */
const ORDER = Object.keys(Screens);
function go(){
  const cur = ORDER.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'forecast';
  $('#tabs').innerHTML = TABBAR.map(k=>`<a href="#${k}" class="${k===cur?'cur':''}" ${k===cur?'aria-current="page"':''}>${ic(NAVICON[k]||'target',24)}${Screens[k].label}</a>`).join('');
  const y=window.scrollY;
  try{ $('#view').innerHTML = Screens[cur].render(); Screens[cur].bind && Screens[cur].bind(); }
  catch(err){ $('#view').innerHTML = `<div class="wrap"><div class="warn">Something broke on this screen: ${esc(err.message)}</div></div>`; console.error(err); }
  if (UIx.lastTab===cur) window.scrollTo(0,y); else window.scrollTo(0,0);
  document.body.classList.toggle('night', cur==='stand');
  if (UIx.lastTab!==cur && S.onboarded && !$('.sheet')) setTimeout(()=>Coach.start(cur),400);
  UIx.lastTab=cur;
}
window.addEventListener('hashchange', ()=>{ Coach.clear(); UIx.hour=null; if (MapKit.map && location.hash!=='#stands'){ MapKit.map.remove(); MapKit.map=null; } go(); });

/* ---------- start ---------- */
/* Start-up never overwrites data it can't read: problems open the Rescue screen instead. */
function boot(){
  const r=Store.read();
  if (r.state==='bad'){ Rescue.show('unreadable', r.raw); return false; }
  if (r.state==='ok'){
    if ((+r.data.schema||1) > SCHEMA){ Rescue.show('newer', r.raw); return false; }
    Snapshots.take(r.data);
    const d=r.data; if (arr(d.rifles).length || arr(d.log).length || arr(d.stands).length){
      const before=+d.schema||1; S=upgrade(d); if (before<SCHEMA) Store.saveLocal(S); }
  }
  Store.pill(); go();
  if (!S.onboarded) Wizard.open();
  else if (S.seenVersion!==RELEASE.version) Release.show();
  return true;
}
const Release = { show(){ S.seenVersion=RELEASE.version; Store.saveLocal(S);
  openSheet(`<h2>Treeline updated to ${esc(RELEASE.version)}</h2><p class="small">All your rifles, stands and journal entries are still here.</p>
    <ul class="small" style="padding-left:20px">${RELEASE.notes.map(n=>`<li style="margin:6px 0">${esc(n)}</li>`).join('')}</ul><button class="pri wide" data-x style="margin-top:10px">Got it</button>`); } };
let booted=false;
try{ booted=boot(); }catch(err){ console.error(err); Rescue.show('crash', Store.read().raw, err); }
if (booted){
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); UIx.installEvt=e; if (location.hash==='#setup') go(); });
if (!ON_CLAUDE) Backup.persist().then(v=>{ UIx.persist=v; if (location.hash==='#setup') go(); });
if (!ON_CLAUDE && 'serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
Weather.load().then(()=>{ if (!$('.sheet') && !Store.locked) go(); });
Store.connect(remote=>{
  if (remote && remote.rifles && remote.rifles.length && (remote.updated||0) >= (S.updated||0)){
    S=upgrade(remote); Store.saveLocal(S); const w=$('.sheet'); if (w && S.onboarded) w.remove(); go(); }
  else if (S.updated) Store.push();
});
}
