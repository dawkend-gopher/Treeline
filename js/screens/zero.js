/* ===== Sight-in ===== */
Screens.zero = { label:'Sight-in', st:{yd:100, vIn:0, vDir:'low', hIn:0, hDir:'left'},
  offsets(){ const z=this.st;
    if (UIx.zmode==='tap'){ const h=UIx.holes; if (!h.length) return null;
      return {v:h.reduce((a,p)=>a+p.y,0)/h.length, h:h.reduce((a,p)=>a+p.x,0)/h.length}; }
    return {v:(z.vDir==='high'?1:-1)*(+z.vIn||0), h:(z.hDir==='right'?1:-1)*(+z.hIn||0)}; },
  clicks(o,r){ const yd=+this.st.yd||100; return {up:Math.round(-Ballistics.clicks(o.v,yd,r)), right:Math.round(-Ballistics.clicks(o.h,yd,r))}; },
  render(){
    const r=rifle(), l=curLoad(), z=this.st, isZero=l.id===r.zeroLoadId, base=correction(r,l), o=this.offsets(), c=o?this.clicks(o,r):{up:0,right:0};
    let short=''; if (+l.bc>0 && +l.mv>0){ const t=tbl(r,l,{...S.env,windMph:0,inclineDeg:0},[25,50].filter(y=>y<+r.zeroYd));
      short=t.map(x=>`<dt>At ${x.yd} yd</dt><dd>${r1(Math.abs(x.dropIn))}" ${x.dropIn<0?'low':'high'}</dd>`).join(''); }
    const tog=(k,a,b)=>`<div class="seg" style="margin-top:6px"><button class="${z[k]===a?'on':''}" data-tog="${k}|${a}">${a[0].toUpperCase()+a.slice(1)}</button><button class="${z[k]===b?'on':''}" data-tog="${k}|${b}">${b[0].toUpperCase()+b.slice(1)}</button></div>`;
    return `<div class="wrap"><h1>Sight-in helper</h1>${Screens.range.pickers(r,l)}
      <label for="z_yd">Distance to target (yd)</label><input id="z_yd" data-z="yd" type="number" inputmode="decimal" value="${esc(z.yd)}">
      <div class="card" id="tgtcard" style="margin-top:14px"><div class="hd"><h3>${ic('target')} Where did your shots hit?</h3><div class="seg"><button class="${UIx.zmode==='tap'?'on':''}" data-zm="tap">Tap</button><button class="${UIx.zmode==='type'?'on':''}" data-zm="type">Type</button></div></div>
        ${UIx.zmode==='tap'?`<svg id="tgt" role="img" aria-label="Target. Tap where each shot hit." tabindex="0"></svg>
          <div class="row between" style="margin-top:10px"><span class="small muted" id="tgtinfo">${UIx.holes.length?`${UIx.holes.length} shot${UIx.holes.length>1?'s':''} · group center ${r1(Math.abs(o.v))}" ${o.v<0?'low':'high'}, ${r1(Math.abs(o.h))}" ${o.h<0?'left':'right'}`:'Tap where each bullet hit. Squares are 1 inch.'}</span>
          <div class="row"><div class="seg">${[4,8,12].map(s=>`<button class="${UIx.tScale===s?'on':''}" data-ts="${s}" aria-label="Show ${s*2} inch target">${s*2}"</button>`).join('')}</div><button class="ghost" data-clear>Clear</button></div></div>`
        :`<div class="f2"><div><label for="z_v">Up/down miss (in)</label><input id="z_v" data-z="vIn" type="number" step=".25" inputmode="decimal" value="${esc(z.vIn)}">${tog('vDir','low','high')}</div>
          <div><label for="z_h">Left/right miss (in)</label><input id="z_h" data-z="hIn" type="number" step=".25" inputmode="decimal" value="${esc(z.hIn)}">${tog('hDir','left','right')}</div></div>
          <p class="small muted">Measure from the bullseye to the center of your group.</p>`}</div>
      <div class="dial2" id="turrets">
        <div class="turretbox"><div class="small">Elevation ${q('clicks')}</div>${Draw.turret('tgE','UP')}<div class="big" id="cE">${c.up===0?'Leave it':`${c.up>0?'UP':'DOWN'} ${Math.abs(c.up)}`}</div><div class="small">${c.up===0?'&nbsp;':'clicks'}</div></div>
        <div class="turretbox"><div class="small">Windage</div>${Draw.turret('tgW','R')}<div class="big" id="cW">${c.right===0?'Leave it':`${c.right>0?'RIGHT':'LEFT'} ${Math.abs(c.right)}`}</div><div class="small">${c.right===0?'&nbsp;':'clicks'}</div></div></div>
      <button class="brass wide" style="margin-top:12px" data-show ${o?'':'disabled'}>Show me</button>
      <p class="tiny muted">Turn each turret the way its arrow points (UP or R) to move hits up or right. One click = ${r.clickValue} ${esc(r.clickUnit)} ≈ ${r1(Ballistics.inPerUnit(r.clickUnit,+z.yd||100)*r.clickValue*10)/10}" at ${esc(z.yd)} yd. Then fire one confirming shot.</p>
      <div class="card">${isZero?`<p class="small" style="margin:0">This is your zero load. Once your group sits on the bullseye, you're done.</p>`
        :`<p class="small" style="margin-top:0">This load is ${base.source==='confirmed'?'set to':'estimated at'} <b>${dirWord(base.up,'UP','DOWN')}${base.right?`, ${dirWord(base.right,'RIGHT','LEFT')}`:''}</b> from your zero. If you dialed that and still missed, save the total.</p>
          <button class="pri" data-savefix>Save ${dirWord(base.up+c.up,'UP','DOWN')}${base.right+c.right?`, ${dirWord(base.right+c.right,'RIGHT','LEFT')}`:''}</button>
          <button style="margin-top:8px" data-mkzero>I re-zeroed with this load</button>`}</div>
      ${short?`<div class="card"><h3>${ic('target')} Shortcut: sight in up close</h3><p class="small muted">With a ${r.zeroYd}-yd zero, this load should hit:</p><dl class="kv">${short}</dl></div>`:''}</div>`;
  },
  target(){
    const s=$('#tgt'); if (!s) return; const S2=UIx.tScale, grid=S2>8?2:1;
    let g=`<rect x="${-S2}" y="${-S2}" width="${S2*2}" height="${S2*2}" fill="var(--paper)"/>`;
    for (let v=-S2; v<=S2; v+=grid) g+=`<line x1="${v}" x2="${v}" y1="${-S2}" y2="${S2}" stroke="#7aa08a" stroke-width="${v===0?.06*S2/4:.025*S2/4}" opacity=".7"/><line y1="${v}" y2="${v}" x1="${-S2}" x2="${S2}" stroke="#7aa08a" stroke-width="${v===0?.06*S2/4:.025*S2/4}" opacity=".7"/>`;
    g+=`<circle r="2" fill="#1f3a2b"/><circle r="1" fill="#d8b46a"/><circle r=".35" fill="#1f3a2b"/>`;
    const h=UIx.holes, cx=h.length?h.reduce((a,p)=>a+p.x,0)/h.length:0, cy=h.length?h.reduce((a,p)=>a+p.y,0)/h.length:0, rr=.18*S2/4;
    g+=`<g class="holes" id="holes">${h.map(p=>`<circle class="pop" cx="${p.x}" cy="${-p.y}" r="${rr*1.6}" fill="#2a1a14" stroke="#e9e2cf" stroke-width="${rr*.5}"/>`).join('')}
      ${h.length>1?`<g stroke="var(--ox)" stroke-width="${rr*.6}"><line x1="${cx-rr*3}" x2="${cx+rr*3}" y1="${-cy}" y2="${-cy}"/><line x1="${cx}" x2="${cx}" y1="${-cy-rr*3}" y2="${-cy+rr*3}"/></g>`:''}</g>`;
    s.setAttribute('viewBox',`${-S2} ${-S2} ${S2*2} ${S2*2}`); s.innerHTML=g;
  },
  bind(){
    const z=this.st, r=rifle(), l=curLoad();
    $$('[data-z]').forEach(el=>{ el.oninput=()=>{ z[el.dataset.z]=el.value; }; el.onchange=()=>go(); });
    $$('[data-tog]').forEach(b=>b.onclick=()=>{ const [k,v]=b.dataset.tog.split('|'); z[k]=v; go(); });
    $$('[data-zm]').forEach(b=>b.onclick=()=>{ UIx.zmode=b.dataset.zm; go(); });
    $$('[data-ts]').forEach(b=>b.onclick=()=>{ UIx.tScale=+b.dataset.ts; go(); });
    $$('[data-pick]').forEach(el=>el.onchange=()=>{ if (el.dataset.pick==='rifle') S.activeRifleId=el.value; else rifle().activeLoadId=el.value; Store.save(); go(); });
    const cl=$('[data-clear]'); if (cl) cl.onclick=()=>{ UIx.holes=[]; go(); };
    const s=$('#tgt'); if (s){ this.target();
      s.onclick=e=>{ const pt=s.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const p=pt.matrixTransform(s.getScreenCTM().inverse());
        if (UIx.holes.length>=10) UIx.holes.shift(); UIx.holes.push({x:+p.x.toFixed(2), y:+(-p.y).toFixed(2)}); go(); }; }
    const sh=$('[data-show]'); if (sh) sh.onclick=()=>{ const o=this.offsets(); if (!o) return; const c=this.clicks(o,r), per=360/CONFIG.clicksPerTurn;
      const E=$('#tgE'), W=$('#tgW'); if (E) E.style.transform=`rotate(${-c.up*per}deg)`; if (W) W.style.transform=`rotate(${-c.right*per}deg)`;
      const H=$('#holes'); if (H) H.style.transform=`translate(${-o.h}px, ${o.v}px)`;
      const count=(el,n,pos,neg)=>{ if (!el||n===0) return; const t0=performance.now(), dur=calm()?1:1100;
        const f=now=>{ const k=Math.min(1,(now-t0)/dur); el.textContent=`${n>0?pos:neg} ${Math.round(Math.abs(n)*k)}`; if (k<1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
      count($('#cE'),c.up,'UP','DOWN'); count($('#cW'),c.right,'RIGHT','LEFT');
      $('#turrets').scrollIntoView({block:'center',behavior:calm()?'auto':'smooth'}); };
    const sf=$('[data-savefix]'); if (sf) sf.onclick=()=>{ const o=this.offsets()||{v:0,h:0}, c=this.clicks(o,r), base=correction(r,l);
      l.fixUp=base.up+c.up; l.fixRight=base.right+c.right; z.vIn=0; z.hIn=0; UIx.holes=[]; Store.save(); toast('Saved to the Locker'); go(); };
    const mz=$('[data-mkzero]'); if (mz) mz.onclick=()=>{ r.zeroLoadId=l.id; r.loads.forEach(x=>{x.fixUp=null;x.fixRight=null;}); UIx.holes=[]; Store.save(); toast('Zero load updated'); go(); };
  }
};

