/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2,9);
const fmtT = t => t==null ? '—' : new Date(t).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
const fmtH = t => new Date(t).toLocaleTimeString([], {hour:'numeric'});
const r1 = n => (Math.round(n*10)/10).toFixed(1);
const compass = d => ['N','NE','E','SE','S','SW','W','NW'][Math.round(d/45)%8];
const midnight = off => { const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+off); return d.getTime(); };
const ON_CLAUDE = !!window.claude || /claude/.test(location.hostname);
const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(msg){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); }

const ICONS = {
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  wind:'<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  cloud:'<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z"/>',
  rain:'<path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 15zM8 21l1-3M12 21l1-3M16 21l1-3"/>',
  temp:'<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/>',
  gauge:'<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  rifle:'<path d="M2 11h14l2-2h4v3l-7 1-1 3h-3l-1-3H2zM6 14l-1 5h3l1-5"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  scope:'<circle cx="12" cy="12" r="8"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  arc:'<path d="M3 18c4-8 10-12 18-12M3 18h18"/>',
  light:'<path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 6V4M4.5 10.5 3 9M19.5 10.5 21 9"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  book:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  tree:'<path d="M12 2 5 13h4l-3 5h12l-3-5h4zM12 18v4"/>',
  map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  pin:'<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>'
};
const ic = (n,s=20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`;
const q = k => `<button type="button" class="q" data-tip="${k}" aria-label="What is ${esc((TIPS[k]||{}).t||k)}?">?</button>`;
const FACTOR_ICON = {light:'light',solunar:'moon',pressure:'gauge',wind:'wind',temp:'temp',rain:'rain'};

/* ---------- default data ---------- */
function defaults(){
  const rid=uid(), a=uid(), b=uid();
  return {v:2, updated:0, onboarded:false, tours:{}, species:'deer', legalMin:CONFIG.legalLightMin, location:{...CONFIG.defaultLocation},
    env:{tempF:55, altFt:300, windMph:10, windClock:3, inclineDeg:0, step:25, max:400, mag:9, viewYd:200},
    manualWx:{temp:50, wind:6, dir:'N', trend:'steady', vsYesterday:'same', rain:'none'},
    stands:[], activeStandId:null, log:[], mapStyle:'sat', lastBackup:0, backupSnooze:0,
    activeRifleId:rid,
    rifles:[{id:rid, name:'Sample deer rifle', caliber:'.308 Win', sightIn:1.5, clickUnit:'MOA', clickValue:.25, zeroYd:100, twist:'1:10',
      notes:'Sample — tap Edit and enter your own rifle.', zeroLoadId:a, activeLoadId:a,
      loads:[{id:a, name:'Sample 150 gr factory', kind:'Factory', grains:150, bc:.4, model:'G1', mv:2820, notes:'Sample numbers — copy BC and velocity from your box.', fixUp:null, fixRight:null},
             {id:b, name:'Sample 165 gr handload', kind:'Handload', grains:165, bc:.435, model:'G1', mv:2650, powder:'', charge:'', primer:'', coal:'', notes:'Sample — enter your own load.', fixUp:null, fixRight:null}]}]};
}
function upgrade(o){ const d=defaults(); const s={...d,...o,env:{...d.env,...(o.env||{})},manualWx:{...d.manualWx,...(o.manualWx||{})},tours:o.tours||{},stands:o.stands||[],log:o.log||[]};
  if (o.onboarded===undefined) s.onboarded = !!o.updated; return s; }
let S = defaults();

