/* ===== Rifle Locker ===== */
Screens.locker = { label:'Locker',
  render(){
    return `<div class="wrap"><div class="row between"><h1>Rifle locker</h1><button class="brass" data-addrifle>${ic('plus',18)} Add rifle</button></div>
      <p class="small muted">The scope is sighted in with the load marked <b>Zero load</b>. Every other load shows the clicks to dial when you switch to it. Tap ${ic('target',16)} to sight in a load.</p>
      ${S.rifles.map(r=>`<div class="card" style="${r.id===S.activeRifleId?'border:2px solid var(--brassbg)':''}">
        <div class="hd"><div><h2>${esc(r.name)}</h2><div class="small muted">${esc(r.caliber)} · ${r.clickValue} ${esc(r.clickUnit)} per click · ${r.zeroYd} yd zero</div></div>
        <div class="row">${r.id===S.activeRifleId?'<span class="badge">In use</span>':`<button data-act="${r.id}">Use</button>`}<button data-editr="${r.id}" aria-label="Edit rifle">${ic('edit',18)}</button></div></div>
        ${r.notes?`<p class="small muted">${esc(r.notes)}</p>`:''}
        ${r.loads.map(l=>{ const c=correction(r,l); return `<div class="load"><div class="hd" style="align-items:flex-start"><div><b>${esc(l.name)}</b> ${l.id===r.zeroLoadId?'<span class="badge">Zero load</span>':''}
          <div class="small muted">${esc(l.kind)} · ${l.grains||'?'} gr · BC ${l.bc||'?'} ${esc(l.model)}${l.kind==='Handload'&&l.powder?` · ${esc(l.powder)} ${esc(l.charge)} gr`:''}</div>
          ${+l.mv>0||+l.mvChrono>0||+l.mvTrued>0?(()=>{ const m=effMV(r,l); return `<div class="small">${ic('arc',16)} <b>${m.v} fps</b> <span class="tiny muted">(${esc(m.src)})</span></div>`; })():''}
          ${l.id!==r.zeroLoadId?`<div class="small" style="margin-top:6px">${ic('scope',16)} Switch to this load: <b>${dirWord(c.up,'UP','DOWN')}${c.right?`, ${dirWord(c.right,'RIGHT','LEFT')}`:''}</b> <span class="tiny muted">(${c.source==='confirmed'?'confirmed at the range':'estimate, confirm with one shot'})</span></div>`:''}</div>
          <div class="row" style="flex-wrap:nowrap">${l.id===r.activeLoadId&&r.id===S.activeRifleId?`<span class="badge" style="background:var(--green2);color:#fff">Selected</span>`:`<button data-sel="${r.id}|${l.id}">Select</button>`}<button data-sight="${r.id}|${l.id}" aria-label="Sight in this load">${ic('target',18)}</button><button data-editl="${r.id}|${l.id}" aria-label="Edit load">${ic('edit',18)}</button></div></div></div>`; }).join('')}
        <div class="row" style="margin-top:8px"><button data-addload="${r.id}">${ic('plus',18)} Add load</button>${S.rifles.length>1?`<button class="ghost" data-delr="${r.id}">Delete rifle</button>`:''}</div></div>`).join('')}
      <div class="warn safety tiny">Handload fields are for your records only. This app never suggests powder charges; use a published load manual.</div></div>`;
  },
  bind(){
    const on=(sel,fn)=>$$(`[${sel}]`).forEach(b=>b.onclick=()=>fn(b.getAttribute(sel)));
    on('data-act',id=>{ S.activeRifleId=id; Store.save(); go(); });
    on('data-sel',v=>{ const [rid,lid]=v.split('|'); S.activeRifleId=rid; S.rifles.find(r=>r.id===rid).activeLoadId=lid; Store.save(); toast('Load selected'); go(); });
    on('data-sight',v=>{ const [rid,lid]=v.split('|'); S.activeRifleId=rid; S.rifles.find(r=>r.id===rid).activeLoadId=lid; Store.save(); location.hash='zero'; });
    on('data-editr',id=>{ const r=S.rifles.find(x=>x.id===id); sheet('Edit rifle',CONFIG.rifleFields,{...r},o=>{ Object.assign(r,o); Store.save(); go(); }); });
    on('data-addrifle',()=>{ const lid=uid(); const r={id:uid(),name:'New rifle',caliber:'',sightIn:1.5,clickUnit:'MOA',clickValue:.25,zeroYd:100,twist:'',notes:'',zeroLoadId:lid,activeLoadId:lid,
      loads:[{id:lid,name:'First load',kind:'Factory',grains:'',bc:'',model:'G1',mv:'',notes:'',fixUp:null,fixRight:null}]};
      sheet('New rifle',CONFIG.rifleFields,r,o=>{ S.rifles.push(o); S.activeRifleId=o.id; Store.save(); go(); }); });
    on('data-editl',v=>{ const [rid,lid]=v.split('|'), r=S.rifles.find(x=>x.id===rid), l=loadOf(r,lid);
      const extra=`<div class="row" style="margin-top:16px">${l.id!==r.zeroLoadId?`<button data-mkzero>Make this the zero load</button>`:''}${r.loads.length>1?`<button class="ghost" data-dell>Delete load</button>`:''}</div>`;
      const box=sheet('Edit load',CONFIG.loadFields,{...l},o=>{ Object.assign(l,o); Store.save(); go(); },extra,PICK_BTN);
      box.addEventListener('click',e=>{
        if (e.target.closest('[data-pickammo]')) ammoPicker(r.caliber, ent=>fillLoadForm(box,ent));
        if (e.target.closest('[data-mkzero]')){ r.zeroLoadId=l.id; r.loads.forEach(x=>{x.fixUp=null;x.fixRight=null;}); Store.save(); box.remove(); toast('Zero load changed'); go(); }
        const d=e.target.closest('[data-dell]'); if (d){ if (d.dataset.sure){ r.loads=r.loads.filter(x=>x.id!==l.id); if (r.zeroLoadId===l.id) r.zeroLoadId=r.loads[0].id; if (r.activeLoadId===l.id) r.activeLoadId=r.loads[0].id; Store.save(); box.remove(); go(); }
          else { d.dataset.sure=1; d.textContent='Tap again to delete'; } } }); });
    on('data-addload',rid=>{ const r=S.rifles.find(x=>x.id===rid);
      const box=sheet('New load',CONFIG.loadFields,{id:uid(),name:'New load',kind:'Factory',grains:'',bc:'',model:'G1',mv:'',notes:'',fixUp:null,fixRight:null},o=>{ r.loads.push(o); Store.save(); go(); },'',PICK_BTN);
      box.addEventListener('click',e=>{ if (e.target.closest('[data-pickammo]')) ammoPicker(r.caliber, ent=>fillLoadForm(box,ent)); }); });
    on('data-delr',id=>{ const b=$(`[data-delr="${id}"]`); if (!b.dataset.sure){ b.dataset.sure=1; b.textContent='Tap again to delete'; return; }
      S.rifles=S.rifles.filter(r=>r.id!==id); S.activeRifleId=S.rifles[0].id; Store.save(); go(); });
  }
};

