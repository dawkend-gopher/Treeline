/* ---------- sheets: forms, tips, coach ---------- */
function openSheet(html){ const box=document.createElement('div'); box.className='sheet'; box.innerHTML=`<div role="dialog">${html}</div>`; document.body.appendChild(box);
  box.addEventListener('click',e=>{ if (e.target===box||e.target.closest('[data-x]')) box.remove(); }); return box; }
function tip(k){ const t=TIPS[k]; if (!t) return;
  const box=openSheet(`<div class="hd"><h2>${esc(t.t)}</h2><button class="ghost" data-x>Close</button></div>${t.pic?`<div style="margin:12px 0">${Draw.pic(t.pic)}</div>`:''}<p>${esc(t.b)}</p><button class="pri wide" data-x>Got it</button>`);
  if (t.pic==='turret' && !calm()) setTimeout(()=>{ const g=box.querySelector('#tipT'); if (g) g.style.transform='rotate(-48deg)'; },250); }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-tip]'); if (b){ e.preventDefault(); tip(b.dataset.tip); } });

function sheet(title, fields, obj, onSave, extra='', top=''){
  const box=document.createElement('div'); box.className='sheet';
  const draw=()=>{ box.innerHTML=`<div role="dialog" aria-label="${esc(title)}"><div class="hd"><h2>${esc(title)}</h2><button class="ghost" data-x>Close</button></div>${top}
    ${fields.filter(f=>!f.when||f.when(obj)).map(f=>`<label for="f_${f.k}">${esc(f.label)}${f.tip?q(f.tip):''}</label>${
      f.type==='select' ? `<select id="f_${f.k}">${f.opts.map(o=>`<option ${obj[f.k]===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`
      : f.type==='textarea' ? `<textarea id="f_${f.k}">${esc(obj[f.k])}</textarea>`
      : `<input id="f_${f.k}" type="${f.type}" ${f.step?`step="${f.step}" inputmode="decimal"`:''} value="${esc(obj[f.k])}">`}${f.help?`<div class="help">${esc(f.help)}</div>`:''}`).join('')}
    ${extra}<div class="row" style="margin-top:18px"><button class="pri" data-save>Save</button><button data-x>Cancel</button></div></div>`; };
  const read=()=>{ for (const f of fields){ const el=box.querySelector('#f_'+f.k); if (!el) continue; obj[f.k]= f.type==='number' ? (el.value===''?'':+el.value) : el.value; } };
  draw(); document.body.appendChild(box);
  box.addEventListener('change',e=>{ if (e.target.tagName==='SELECT'){ read(); draw(); } });
  box.addEventListener('click',e=>{ if (e.target.closest('[data-tip]')) return;
    if (e.target===box||e.target.closest('[data-x]')) box.remove();
    if (e.target.closest('[data-save]')){ read(); onSave(obj); box.remove(); } });
  return box;
}

const Coach = {
  start(tab,force){ const steps=TOURS[tab]||[]; if (!steps.length || (!force && S.tours[tab])) return; this.tab=tab; this.i=0; this.steps=steps; this.show(); },
  clear(){ $$('.spot').forEach(e=>e.classList.remove('spot')); const c=$('.coach'); if (c) c.remove(); },
  show(){ this.clear(); let st=this.steps[this.i], el=st&&$(st.sel); while (st && !el){ this.i++; st=this.steps[this.i]; el=st&&$(st.sel); } if (!el){ this.done(); return; }
    el.classList.add('spot'); el.scrollIntoView({block:'center', behavior:calm()?'auto':'smooth'});
    const c=document.createElement('div'); c.className='coach'; c.setAttribute('role','dialog');
    c.innerHTML=`<div class="dots" style="margin-bottom:10px">${this.steps.map((_,j)=>`<i class="${j===this.i?'on':''}"></i>`).join('')}</div><p style="margin:0 0 12px">${esc(st.text)}</p><div class="row"><button data-next>${this.i<this.steps.length-1?'Next':'Got it'}</button><button class="ghost" data-skip>Skip tour</button></div>`;
    document.body.appendChild(c);
    c.querySelector('[data-next]').onclick=()=>{ this.i++; this.i<this.steps.length ? this.show() : this.done(); };
    c.querySelector('[data-skip]').onclick=()=>this.done(); },
  done(){ this.clear(); S.tours[this.tab]=true; Store.save(); }
};

/* ---------- first-run setup ---------- */
const Wizard = {
  step:0, d:null,
  open(){ const r=rifle(); this.d={name:S.location.name, coords:`${S.location.lat}, ${S.location.lon}`, species:S.species, rname:'', cal:'', unit:'MOA', click:.25, zero:100, sight:1.5, lname:'', grains:'', bc:'', mv:''}; this.step=0;
    this.box=document.createElement('div'); this.box.className='sheet'; document.body.appendChild(this.box); this.draw(); },
  read(){ this.box.querySelectorAll('[data-w]').forEach(el=>{ this.d[el.dataset.w]=el.value; }); },
  draw(){ const d=this.d, s=this.step, chip=(k,v,l)=>`<button type="button" class="${String(d[k])===String(v)?'on':''}" data-wc="${k}|${v}">${l}</button>`;
    const steps=[
      ()=>`<h1>Welcome to Treeline</h1><p class="muted">Four quick questions and you're set. You can change any of it later in Setup.</p>
        <h2 style="margin-top:18px">Where do you hunt?</h2><label for="w1">Name for this spot</label><input id="w1" data-w="name" value="${esc(d.name)}">
        <label for="w2">Coordinates</label><input id="w2" data-w="coords" inputmode="decimal" value="${esc(d.coords)}"><div class="help">In Google Maps, press and hold your stand, copy the numbers that pop up, and paste them here.</div>`,
      ()=>`<h2>What are you after?</h2><p class="muted">This changes how the hunt score weighs wind, light and weather.</p><div class="choice">${Object.entries(CONFIG.species).map(([k,v])=>chip('species',k,esc(v.label))).join('')}</div>`,
      ()=>`<h2>Your rifle</h2><label for="w3">Name</label><input id="w3" data-w="rname" placeholder="Dad's .270" value="${esc(d.rname)}">
        <label for="w4">Caliber</label><input id="w4" data-w="cal" placeholder=".270 Win" value="${esc(d.cal)}">
        <label>Turret clicks ${q('clicks')}</label><div class="chips">${chip('click','0.25','1/4 MOA')}${chip('click','0.125','1/8 MOA')}${chip('click','0.1','0.1 MIL')}</div>
        <label>Zero distance ${q('zero')}</label><div class="chips">${chip('zero',25,'25 yd')}${chip('zero',50,'50 yd')}${chip('zero',100,'100 yd')}${chip('zero',200,'200 yd')}</div>`,
      ()=>`<h2>Your ammo</h2><p class="muted">Pick your box from the list, or type the numbers printed on it. You can skip this and add it later.</p>
        <button type="button" class="brass wide" data-wpick style="margin:6px 0 4px">Pick from list</button>${d.src?`<div class="tiny muted">Filled in from ${esc(d.srcBrand)}'s published specs.</div>`:''}
        <label for="w5">Name</label><input id="w5" data-w="lname" placeholder="Federal 130 gr" value="${esc(d.lname)}">
        <div class="f2"><div><label for="w6">Bullet (gr)</label><input id="w6" data-w="grains" type="number" inputmode="decimal" value="${esc(d.grains)}"></div>
        <div><label for="w7">BC ${q('bc')}</label><input id="w7" data-w="bc" type="number" step=".001" inputmode="decimal" value="${esc(d.bc)}"></div></div>
        <label for="w8">Velocity (fps) ${q('mv')}</label><input id="w8" data-w="mv" type="number" inputmode="decimal" value="${esc(d.mv)}">`
    ];
    this.box.innerHTML=`<div role="dialog" aria-label="First-time setup"><div class="dots" style="margin-bottom:16px">${steps.map((_,j)=>`<i class="${j<=s?'on':''}"></i>`).join('')}</div>${steps[s]()}
      <div class="row" style="margin-top:20px">${s<steps.length-1?`<button class="pri" data-wn>Next</button>`:`<button class="pri" data-wf>Finish</button>`}${s>0?`<button data-wb>Back</button>`:''}<button class="ghost" data-ws>${s===0?'Skip setup':'Skip the rest'}</button></div></div>`;
    this.box.onclick=e=>{ if (e.target.closest('[data-wpick]')){ this.read(); ammoPicker(this.d.cal, ent=>{ Object.assign(this.d,{lname:AmmoDB.label(ent), grains:ent.gr, bc:ent.bc, mv:ent.mv, tb:ent.tb||'', src:AmmoDB.notes(ent), srcBrand:ent.b}); this.draw(); }); return; }
      const c=e.target.closest('[data-wc]'); if (c){ this.read(); const [k,v]=c.dataset.wc.split('|'); this.d[k]=v; if (k==='click') this.d.unit= v==='0.1'?'MIL':'MOA'; this.draw(); return; }
      if (e.target.closest('[data-wn]')){ this.read(); this.step++; this.draw(); }
      if (e.target.closest('[data-wb]')){ this.read(); this.step--; this.draw(); }
      if (e.target.closest('[data-wf]')||e.target.closest('[data-ws]')){ this.read(); this.finish(); } };
  },
  finish(){ const d=this.d; S.location.name=d.name||S.location.name;
    const m=String(d.coords).match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/); if (m && Math.abs(+m[1])<=90 && Math.abs(+m[2])<=180){ S.location.lat=+m[1]; S.location.lon=+m[2]; }
    S.species=d.species;
    if (d.rname.trim()){ const lid=uid(), hasLoad=+d.bc>0&&+d.mv>0;
      const r={id:uid(), name:d.rname.trim(), caliber:d.cal, sightIn:1.5, clickUnit:d.unit, clickValue:+d.click, zeroYd:+d.zero, twist:'', notes:'', zeroLoadId:lid, activeLoadId:lid,
        loads:[{id:lid, name:d.lname||'My load', kind:'Factory', grains:+d.grains||'', bc:hasLoad?+d.bc:'', model:'G1', mv:hasLoad?+d.mv:'', testBarrel:d.tb||'', notes:d.src||'', fixUp:null, fixRight:null}]};
      S.rifles=[r]; S.activeRifleId=r.id; }
    S.onboarded=true; Store.save(); this.box.remove(); Weather.load(true).then(go); go();
  }
};

