/* ===== Range card ===== */
Screens.range = { label:'Range card',
  pickers(r,l){ return `<div class="f2"><div><label>Rifle</label><select data-pick="rifle">${S.rifles.map(x=>`<option value="${x.id}" ${x.id===r.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div><label>Load</label><select data-pick="load">${r.loads.map(x=>`<option value="${x.id}" ${x.id===l.id?'selected':''}>${esc(x.name)}${x.id===r.zeroLoadId?' (zero)':''}</option>`).join('')}</select></div></div>`; },
  render(){
    const r=rifle(), l=curLoad(), e=S.env, c=correction(r,l), ok=+l.bc>0 && +l.mv>0;
    const yards=[]; for (let y=+e.step; y<=+e.max; y+=+e.step) yards.push(y);
    const rows= ok ? tbl(r,l,e,yards) : [];
    UIx.traj = ok ? tbl(r,l,{...e,windMph:0},[...Array(Math.ceil(+e.max/5))].map((_,i)=>(i+1)*5)) : [];
    const u=r.clickUnit, field=(k,lab,st)=>`<div><label for="e_${k}">${lab}</label><input id="e_${k}" data-env="${k}" type="number" inputmode="decimal" step="${st}" value="${esc(e[k])}"></div>`;
    if (+e.viewYd>+e.max) e.viewYd=+e.max;
    return `<div class="wrap"><h1>Range card</h1>${this.pickers(r,l)}
      ${l.id!==r.zeroLoadId?`<div class="warn" style="margin-top:14px">Your scope is zeroed with <b>${esc((loadOf(r,r.zeroLoadId)||{}).name)}</b>. Before shooting this load, dial <b>${dirWord(c.up,'UP','DOWN')}${c.right?`, ${dirWord(c.right,'RIGHT','LEFT')}`:''}</b> (${c.source==='confirmed'?'confirmed':'estimate'}). Everything below assumes that's done.</div>`:''}
      ${ok?`<div class="card" id="scopecard" style="margin-top:14px"><div class="hd"><h3>${ic('scope')} Through the scope</h3>${q('hold')}</div>
        <div class="scopewrap"><svg id="scope" viewBox="-50 -50 100 100" role="img" aria-label="Scope view of a deer at the chosen distance"></svg></div>
        <div style="text-align:center;margin-top:8px"><div class="big" id="sv_main">—</div><div class="small muted" id="sv_sub"></div></div>
        <label for="sv_yd" style="justify-content:space-between">Distance <span id="sv_ydl" class="os" style="font-size:20px">${e.viewYd} yd</span></label>
        <input id="sv_yd" type="range" min="25" max="${e.max}" step="5" value="${e.viewYd}">
        <div class="row between" style="margin-top:6px"><span class="small muted">Scope power ${q('mag')}</span><div class="seg">${[3,6,9].map(m=>`<button class="${+e.mag===m?'on':''}" data-mag="${m}">${m}x</button>`).join('')}</div></div>
        <div class="small" id="sv_marks" style="text-align:center;margin-top:6px;font-weight:600"></div>
        ${reticleOf(r).unit?'':`<div class="tiny muted" style="text-align:center;margin-top:4px">Set your reticle in the Locker (Edit rifle) to see which hash mark to hold on. ${q('reticle')}</div>`}
        <div class="tiny muted" style="margin-top:10px">Wind: ${e.windMph} mph from ${e.windClock} o'clock. The brass dot is where the bullet lands when you hold as shown. The hollow ring is where it would land if you aimed dead-on.</div></div>
      <div class="card" id="trajcard"><div class="hd"><h3>${ic('arc')} Bullet path</h3><button class="brass" data-fire>Fire</button></div>
        <div class="fig" style="height:210px"><svg id="traj" role="img" aria-label="Bullet path chart"></svg></div></div>
      <div class="card"><div class="tablewrap"><table><thead><tr><th>Yards</th><th>Path (in)</th><th>Dial</th><th>Hold ${u}</th>${reticleOf(r).unit?'<th>Marks</th>':''}<th>Wind (in)</th><th>Wind dial</th><th>fps</th><th>ft-lb</th></tr></thead><tbody>
        ${rows.map(x=>{ const up=Math.round(x.upClicks), wd=Math.round(x.windClicks); return `<tr class="${x.yd===+r.zeroYd?'hl':''}"><td><b>${x.yd}</b></td><td>${x.dropIn>0?'+':''}${r1(x.dropIn)}</td><td>${up===0?'—':`${up>0?'UP':'DN'} ${Math.abs(up)}`}</td><td>${r1(Math.abs(x.holdUnits))} ${x.holdUnits>0.05?'high':x.holdUnits<-0.05?'low':''}</td>${reticleOf(r).unit?`<td>${(()=>{ const hm=holdMarks(r,-x.dropIn,x.yd); return hm&&Math.abs(hm.marks)>=.25?`${r1(Math.abs(hm.marks))}${hm.units<0?' above':''}`:'—'; })()}</td>`:''}<td>${r1(Math.abs(x.driftIn))} ${x.driftIn<0?'L':x.driftIn>0?'R':''}</td><td>${wd===0?'—':`${wd>0?'R':'L'} ${Math.abs(wd)}`}</td><td>${Math.round(x.v)}</td><td>${Math.round(x.energy)}</td></tr>`; }).join('')}
      </tbody></table></div><div class="tiny muted" style="margin-top:8px">Path: + means above the crosshair. Dial = clicks so the crosshair is dead-on. Hold = aim that far high or low instead.</div></div>`
      :`<div class="warn" style="margin-top:14px">Add a BC and velocity to this load in the Locker to see where it hits. ${q('bc')}</div>`}
      ${ok?`<div class="card" id="truecard"><div class="hd"><h3>${ic('target')} True your velocity</h3>${q('truing')}</div>
        <p class="small muted" style="margin-top:0">Aim dead-on at a far target (no dialing), then enter where the group landed. Using <b>${effMV(r,l).v} fps</b> (${esc(effMV(r,l).src)}).</p>
        <div class="f2"><div><label for="tr_yd">Distance (yd)</label><input id="tr_yd" type="number" inputmode="decimal" value="${UIx.trYd||300}"></div>
        <div><label for="tr_in">Inches from bullseye</label><input id="tr_in" type="number" step=".25" inputmode="decimal" value="${UIx.trIn||''}" placeholder="12"></div></div>
        <div class="seg" style="margin-top:8px"><button class="${UIx.trDir!=='high'?'on':''}" data-trd="low">Low</button><button class="${UIx.trDir==='high'?'on':''}" data-trd="high">High</button></div>
        <div class="row" style="margin-top:12px"><button class="brass" data-true>Calculate</button>${+l.mvTrued>0?`<button class="ghost" data-untrue>Clear trued speed</button>`:''}</div><div id="trout" class="small" style="margin-top:8px"></div></div>`:''}
      <div class="row" style="margin-bottom:14px"><a href="#zero" style="text-decoration:none"><button>${ic('target',18)} Sight-in helper</button></a>${ok&&!ON_CLAUDE?`<button class="brass" data-card>${ic('arc',18)} Save range card image</button>`:''}</div>
      <div class="card"><h3>${ic('wind')} Conditions</h3><div class="f2">${field('windMph','Wind (mph)',1)}${field('windClock',"From (o'clock)",1)}${field('tempF','Temp (°F)',1)}${field('altFt','Elevation (ft)',50)}${field('inclineDeg','Shot angle (°)',1)}${field('step','Row every (yd)',5)}${field('max','Out to (yd)',25)}</div>
        <div class="tiny muted" style="margin-top:8px">12 o'clock is wind in your face, 3 is from the right, 9 from the left. Use shot angle for tree-stand or hill shots.</div></div></div>`;
  },
  // Crosshair: plain duplex, or thin lines with hash marks spaced by the reticle's value at this distance.
  reticleSVG(r,yd,k){
    const t=reticleOf(r);
    if (!t.unit) return `<g stroke="#111" stroke-width=".5"><line x1="-50" x2="-14" y1="0" y2="0" stroke-width="2.4"/><line x1="14" x2="50" y1="0" y2="0" stroke-width="2.4"/><line y1="-50" y2="-14" x1="0" x2="0" stroke-width="2.4"/><line y1="14" y2="50" x1="0" x2="0" stroke-width="2.4"/><line x1="-14" x2="14" y1="0" y2="0"/><line y1="-14" y2="14" x1="0" x2="0"/></g>`;
    const gap=t.step*Ballistics.inPerUnit(t.unit,yd)*k; let g=`<g stroke="#111" stroke-width=".55"><line x1="-50" x2="50" y1="0" y2="0"/><line y1="-50" y2="50" x1="0" x2="0"/>`;
    // When marks would crowd together at this power/distance, draw every 2nd or 5th one (still counted true).
    const stride=[1,2,5,10].find(s=>gap*s>=1.6)||10, lab=stride*2;
    for (let n=stride; n*gap<48; n+=stride){ const d=n*gap, big=n%lab===0, L=big?3.2:2; g+=`<line x1="${-L}" x2="${L}" y1="${d}" y2="${d}"/><line x1="${-L}" x2="${L}" y1="${-d}" y2="${-d}"/><line y1="${-L}" y2="${L}" x1="${d}" x2="${d}"/><line y1="${-L}" y2="${L}" x1="${-d}" x2="${-d}"/>`;
      if (big && d<44) g+=`<text x="${3.8}" y="${d+1.3}" font-size="3.4" fill="#111" stroke="none">${n}</text>`; }
    return g+'</g>'; },
  // A clean printable dope card for this rifle and load, saved as a picture.
  async card(){
    const r=rifle(), l=curLoad(), e=S.env, t=reticleOf(r), m=effMV(r,l), L=Lp(r,l);
    const yards=[]; for (let y=+e.step; y<=+e.max; y+=+e.step) yards.push(y);
    const rows=tbl(r,l,{...e,windMph:10,windClock:3,inclineDeg:0},yards);
    try{ await document.fonts.ready; }catch(_){}
    const W=1080, rowH=58, top=330, H=top+rows.length*rowH+150, c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
    const F=(w,s,f='Source Sans 3')=>`${w} ${s}px "${f}", sans-serif`;
    const fit=(txt,px,py,w,s,f)=>{ let z=s; do { x.font=F(w,z,f); } while (x.measureText(txt).width>W-px-40 && --z>12); x.fillText(txt,px,py); };
    x.fillStyle='#fbf7ec'; x.fillRect(0,0,W,H); x.fillStyle='#1f3a2b'; x.fillRect(0,0,W,200);
    x.fillStyle='#d8b46a'; fit(r.name,48,92,600,64,'Oswald');
    x.fillStyle='#f4efe3'; fit(l.name,48,140,600,34);
    fit(`${r.caliber||''} · zero ${r.zeroYd} yd · ${m.v} fps · ${L.model} BC ${L.bc} · ${r.clickValue} ${r.clickUnit}/click`,48,180,400,26);
    x.fillStyle='#5e6a62'; fit(`${e.tempF}°F · ${e.altFt} ft elevation · wind columns are for 10 mph from 3 or 9 o'clock`,48,240,400,24);
    const cols=[['Yards',48],['Path',190],['Dial',340],[`Hold ${r.clickUnit}`,500],...(t.unit?[['Marks',690]]:[]),['Wind',t.unit?840:720],['W dial',t.unit?960:900]];
    x.fillStyle='#1f3a2b'; x.font=F(700,26); cols.forEach(([h,px])=>x.fillText(h,px,top-20));
    rows.forEach((q,i)=>{ const y=top+i*rowH; if (i%2===0){ x.fillStyle='#f0eadc'; x.fillRect(32,y,W-64,rowH); }
      if (q.yd===+r.zeroYd){ x.fillStyle='#e8d6a8'; x.fillRect(32,y,W-64,rowH); }
      const up=Math.round(q.upClicks), wd=Math.round(q.windClicks), hm=holdMarks(r,-q.dropIn,q.yd);
      const cells=[`${q.yd}`,`${q.dropIn>0?'+':''}${r1(q.dropIn)}"`,up===0?'—':`${up>0?'UP':'DN'} ${Math.abs(up)}`,`${r1(Math.abs(q.holdUnits))}${q.holdUnits>0.05?' ↑':q.holdUnits<-0.05?' ↓':''}`,
        ...(t.unit?[hm&&Math.abs(hm.marks)>=.25?r1(Math.abs(hm.marks)):'—']:[]),`${r1(Math.abs(q.driftIn))}"`,wd===0?'—':`${Math.abs(wd)}`];
      x.fillStyle='#1b2620'; cells.forEach((v,ci)=>{ x.font=F(ci===0?700:500,32,ci===0?'Oswald':'Source Sans 3'); x.fillText(v,cols[ci][1],y+40); }); });
    x.fillStyle='#5e6a62';
    fit(`Path: + is above the crosshair. Dial = clicks to be dead-on. Hold ↑ = aim high.`,48,H-96,400,22);
    if (t.unit) fit(`Marks = how many hash marks down to hold (${t.name}, true at full power on most scopes).`,48,H-66,400,22);
    x.font=F(400,22); x.fillText(`Treeline · ${new Date().toLocaleDateString()} · Confirm on paper before you hunt.`,48,H-34);
    const blob=await new Promise(res=>c.toBlob(res,'image/png')); const name=`range-card-${(r.name+'-'+l.name).replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.png`;
    const file=new File([blob],name,{type:'image/png'});
    try{ if (navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:'Range card'}); return; } }catch(err){ if (err && err.name==='AbortError') return; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); toast('Range card saved to Downloads');
  },
  scope(){
    const svg=$('#scope'); if (!svg) return; const r=rifle(), l=curLoad(), e=S.env, yd=+e.viewYd;
    const row=tbl(r,l,e,[yd])[0]; if (!row) return;
    const fovIn=(105/+e.mag)*12*yd/100, k=100/fovIn;                // svg units per inch
    const hx=-row.driftIn, hy=-row.dropIn;                          // hold point relative to vitals (inches, y up)
    // view is centered on the crosshair (the hold point); the deer sits offset from it
    const T=`translate(${-hx*k} ${hy*k}) scale(${k})`;
    const up=Math.round(row.upClicks);
    svg.innerHTML=`<defs><clipPath id="lens"><circle r="49"/></clipPath></defs>
      <g clip-path="url(#lens)"><rect x="-50" y="-50" width="100" height="100" fill="var(--paper)"/>
        <g transform="${T}">${Draw.deer()}<circle r="4.5" fill="none" stroke="var(--ox)" stroke-width="${0.8/k*3}" stroke-dasharray="${1.4/k*3} ${1/k*3}"/>
          <circle cx="${row.driftIn}" cy="${-row.dropIn}" r="${Math.max(1.2,2.2/k)}" fill="none" stroke="var(--ink)" stroke-width="${.6/k*2}"/>
          <circle r="${Math.max(1,1.8/k)}" fill="var(--brassbg)" stroke="#1b1708" stroke-width="${.4/k*2}" class="pop"/></g>
        ${this.reticleSVG(r,yd,k)}</g>
      <circle r="49" fill="none" stroke="var(--green)" stroke-width="2"/>`;
    const holdU=Math.abs(row.holdUnits), hIn=Math.abs(row.dropIn);
    $('#sv_main').textContent = hIn<0.75 ? 'Aim dead-on' : `Hold ${r1(hIn)}" ${row.dropIn<0?'high':'low'}`;
    $('#sv_sub').textContent = `${yd} yd · or dial ${up===0?'nothing':`${up>0?'UP':'DOWN'} ${Math.abs(up)} clicks`} (${r1(holdU)} ${r.clickUnit})${Math.abs(row.driftIn)>=0.75?` · wind ${r1(Math.abs(row.driftIn))}" ${row.driftIn<0?'left: hold right':'right: hold left'}`:''}`;
    const hm=holdMarks(r,-row.dropIn,yd), wm=holdMarks(r,-row.driftIn,yd);
    const mt=$('#sv_marks'); if (mt) mt.textContent = hm ? `Reticle: ${marksText(hm, hm.units>0?'below center':'above center')} on the vitals${wm&&Math.abs(wm.marks)>=.25?` · wind: hold ${r1(Math.abs(wm.marks))} marks ${wm.units>0?'right':'left'}`:''}` : '';
    $('#sv_ydl').textContent=`${yd} yd`;
  },
  traj(fire){
    const s=$('#traj'); if (!s||!UIx.traj.length||s.clientWidth<60) return;
    const W=s.clientWidth,H=s.clientHeight,p=36,pts=UIx.traj, maxY=+S.env.max, r=rifle();
    const ys=pts.map(q=>q.dropIn), hi=Math.max(4,...ys), lo=Math.min(-4,...ys);
    const X=y=>p+(y/maxY)*(W-p-12), Y=v=>10+(hi-v)/(hi-lo)*(H-36);
    let g=`<line x1="${p}" x2="${W-12}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--mute)" stroke-dasharray="4 4"/><text x="${W-12}" y="${Y(0)-6}" text-anchor="end" font-size="12" fill="var(--mute)">crosshair</text>`;
    const d=`M${X(0)} ${Y(-r.sightIn)} ${pts.map(q=>`L${X(q.yd)} ${Y(q.dropIn)}`).join(' ')}`;
    g+=`<path id="tpath" d="${d}" fill="none" stroke="var(--green2)" stroke-width="3" stroke-linecap="round"/>`;
    const vx=X(+S.env.viewYd); g+=`<line x1="${vx}" x2="${vx}" y1="6" y2="${H-24}" stroke="var(--brass)" stroke-dasharray="2 3"/>`;
    const zx=X(+r.zeroYd); g+=`<circle cx="${zx}" cy="${Y(0)}" r="5" fill="var(--ink)"/><text x="${zx}" y="${Y(0)+20}" text-anchor="middle" font-size="12" fill="var(--ink)">zero</text>`;
    const tick=W<520?100:50; for (let y=tick;y<=maxY;y+=tick) g+=`<text x="${X(y)}" y="${H-4}" text-anchor="middle" font-size="12" fill="var(--mute)">${y}</text>`;
    for (const v of [Math.round(hi),Math.round(lo)]) g+=`<text x="${p-6}" y="${Y(v)+4}" text-anchor="end" font-size="12" fill="var(--mute)">${v>0?'+':''}${v}"</text>`;
    g+=`<circle id="bul" r="5" fill="var(--brassbg)" stroke="#1b1708" cx="${X(0)}" cy="${Y(-r.sightIn)}" opacity="${fire?1:0}"/>`;
    s.innerHTML=g;
    if (fire){ const path=s.querySelector('#tpath'), b=s.querySelector('#bul'), L=path.getTotalLength(), t0=performance.now(), dur=calm()?1:900;
      const stepF=now=>{ const f=Math.min(1,(now-t0)/dur), pt=path.getPointAtLength(L*f*f*(3-2*f)); b.setAttribute('cx',pt.x); b.setAttribute('cy',pt.y); if (f<1) requestAnimationFrame(stepF); };
      requestAnimationFrame(stepF); }
  },
  bind(){
    $$('[data-env]').forEach(el=>el.onchange=()=>{ S.env[el.dataset.env]=+el.value; if (S.env.step<5) S.env.step=5; if (S.env.max<50) S.env.max=50; Store.save(); go(); });
    $$('[data-pick]').forEach(el=>el.onchange=()=>{ if (el.dataset.pick==='rifle') S.activeRifleId=el.value; else rifle().activeLoadId=el.value; Store.save(); go(); });
    $$('[data-mag]').forEach(b=>b.onclick=()=>{ S.env.mag=+b.dataset.mag; $$('[data-mag]').forEach(x=>x.classList.toggle('on',x===b)); Store.save(); this.scope(); });
    const sl=$('#sv_yd'); if (sl){ sl.oninput=()=>{ S.env.viewYd=+sl.value; this.scope(); this.traj(false); }; sl.onchange=()=>Store.save(); }
    const f=$('[data-fire]'); if (f) f.onclick=()=>this.traj(true);
    const cb=$('[data-card]'); if (cb) cb.onclick=()=>this.card().catch(()=>toast('Couldn\'t make the image'));
    $$('[data-trd]').forEach(b=>b.onclick=()=>{ UIx.trDir=b.dataset.trd; $$('[data-trd]').forEach(x=>x.classList.toggle('on',x===b)); });
    const tb=$('[data-true]'); if (tb) tb.onclick=()=>{ const r=rifle(), l=curLoad(), yd=+$('#tr_yd').value, inch=+$('#tr_in').value; UIx.trYd=yd; UIx.trIn=inch;
      const out=$('#trout'); if (!(yd>+r.zeroYd) || !(inch>=0)){ out.textContent='Enter a distance past your zero and how far the group landed from the bullseye.'; return; }
      const target=(UIx.trDir==='high'?1:-1)*inch, env={...S.env,windMph:0,inclineDeg:0}, base=effMV(r,l).v;
      const pathAt=v=>{ const x=Ballistics.table(r,{...Lp(r,l),mv:v},env,[yd])[0]; return x?x.dropIn:-1e9; };
      let lo=base*.6, hi=base*1.4; if (target<pathAt(lo)||target>pathAt(hi)){ out.textContent='That result is too far from what this load can do. Double-check the BC, the distance and your zero.'; return; }
      for (let n=0;n<40;n++){ const m=(lo+hi)/2; if (pathAt(m)<target) lo=m; else hi=m; }
      const v=Math.round((lo+hi)/2);
      out.innerHTML=`Your load is really doing about <b>${v} fps</b> (${v>=base?'+':''}${v-base} vs. ${base}). <button class="pri" data-savetrue="${v}" style="margin-top:8px">Use ${v} fps</button>`;
      out.querySelector('[data-savetrue]').onclick=()=>{ l.mvTrued=v; Store.save(); toast('Trued velocity saved'); go(); }; };
    const ut=$('[data-untrue]'); if (ut) ut.onclick=()=>{ delete curLoad().mvTrued; Store.save(); go(); };
    this.scope();
    const s=$('#traj'); if (s){ UIx.ro2 && UIx.ro2.disconnect(); UIx.ro2=new ResizeObserver(()=>this.traj(false)); UIx.ro2.observe(s); }
  }
};

