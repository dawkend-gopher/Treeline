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
const saved = Store.local(); if (saved && saved.rifles && saved.rifles.length) S = upgrade(saved);
Store.pill(); go();
if (!S.onboarded) Wizard.open();
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); UIx.installEvt=e; if (location.hash==='#setup') go(); });
if (!ON_CLAUDE && 'serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
Weather.load().then(()=>{ if (!$('.sheet')) go(); });
Store.connect(remote=>{
  if (remote && remote.rifles && remote.rifles.length && (remote.updated||0) >= (S.updated||0)){
    S=upgrade(remote); Store.saveLocal(S); const w=$('.sheet'); if (w && S.onboarded) w.remove(); go(); }
  else if (S.updated) Store.push();
});
