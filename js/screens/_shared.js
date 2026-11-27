/* Shared screen state and helpers. Each screen lives in its own file. */
/* ---------- 6. SCREENS ---------- */
const NAVICON = {forecast:'sun', stands:'tree', range:'arc', journal:'book', locker:'rifle'};
const TABBAR = ['forecast','stands','range','journal','locker'];
const UIx = {dayOff:0, hour:null, holes:[], tScale:8, zmode:'tap'};
function standPick(t){ const w=Weather.at(t); if (w.dir==null||!S.stands.length) return '';
  const lab=compass(w.dir), good=S.stands.filter(x=>(x.goodWinds||[]).includes(lab));
  return `<span>${ic('tree',18)} ${lab} wind: ${good.length?`hunt <b>${esc(good.map(x=>x.name).join(', '))}</b>`:'none of your stands fit'}</span>`; }
const VERDICT = s => s>=75?'Great day to hunt':s>=60?'Good day to hunt':s>=45?'Fair day':'Slow day';

const Screens = {};
