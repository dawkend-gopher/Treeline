/* ===== Setup ===== */
Screens.setup = { label:'Setup',
  render(){
    const L=S.location;
    return `<div class="wrap"><h1>Setup</h1>
      <div class="card"><h3>${ic('pin')} Hunting spot</h3>
        <label for="s_name">Name</label><input id="s_name" data-loc="name" value="${esc(L.name)}">
        <label for="s_coords">Coordinates</label><input id="s_coords" data-coords value="${L.lat}, ${L.lon}" inputmode="decimal">
        <div class="help">In Google Maps, press and hold your stand, copy the numbers that pop up (like 32.2732, -89.9859), and paste them here.</div>
        <button style="margin-top:12px" data-gps>${ic('pin',18)} Use my phone's location</button></div>
      <div class="card"><h3>${ic('target')} What you're hunting</h3><div class="choice">${Object.entries(CONFIG.species).map(([k,v])=>`<button class="${S.species===k?'on':''}" data-sp="${k}">${esc(v.label)}</button>`).join('')}</div>
        <label for="s_legal">Legal light, minutes before and after ${q('legal')}</label><input id="s_legal" type="number" inputmode="decimal" data-legal value="${S.legalMin}">
        <label for="s_alt">Elevation at your spot (ft)</label><input id="s_alt" type="number" inputmode="decimal" data-alt value="${S.env.altFt}"></div>
      ${ON_CLAUDE?'':`<div class="card"><h3>${ic('rifle')} Install Treeline</h3><p class="small" style="margin-top:4px">Put Treeline on your home screen so it opens like an app and works offline in the woods.</p>
        ${UIx.installEvt?`<button class="brass" data-install>Install app</button>`:`<p class="small muted">In Chrome, tap the ⋮ menu, then <b>Add to Home screen</b> (or <b>Install app</b>). If it's already installed, you're set.</p>`}</div>`}
      <div class="card"><h3>${ic('check')} Help</h3><div class="row"><button data-tours>Replay the guided tours</button><button data-wiz>Run first-time setup again</button></div></div>
      <div class="card"><h3>${ic('gear')} Your data</h3><p class="small">${Store.mode==='cloud'?'Your rifles and settings save to your Claude account and follow you to any device where you open this page.':'Your rifles and settings are saved on this phone only. Copy a backup now and then.'}</p>
        ${ON_CLAUDE?'':`<div class="row" style="margin-bottom:10px"><button class="brass" data-dlfile>Download backup file</button><label class="btnlike" style="margin:0"><input type="file" id="s_file" accept=".json,application/json" style="display:none"><span style="display:inline-flex;min-height:46px;align-items:center;padding:0 18px;border:1px solid var(--line);border-radius:12px;background:var(--panel);cursor:pointer">Restore from file</span></label></div>`}
        <div class="row"><button data-copy>Copy backup</button><button data-restore>Restore from backup</button></div>
        <textarea id="s_backup" style="margin-top:12px" placeholder="Paste a backup here, then tap Restore"></textarea>
        <button class="ghost" style="margin-top:12px" data-reset>Reset to sample data</button></div>
      <div class="card"><h3>How the numbers work</h3><p class="small">Sun, moon and solunar times are calculated on your phone from your coordinates, so they work with no signal. The hunt score blends six factors weighted for your species. Ballistics use a standard drag model (G1/G7) with your BC, velocity, scope height, temperature and elevation. They'll get you on paper fast, but always confirm on paper before you hunt.</p></div></div>`;
  },
  bind(){
    $('[data-loc]').onchange=e=>{ S.location.name=e.target.value; Store.save(); };
    $('[data-coords]').onchange=e=>{ const m=e.target.value.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
      if (!m || Math.abs(+m[1])>90 || Math.abs(+m[2])>180){ toast('Couldn\'t read those coordinates'); return; }
      S.location.lat=+m[1]; S.location.lon=+m[2]; Store.save(); Weather.load(true).then(()=>toast('Location saved')); };
    $('[data-gps]').onclick=()=>{ if (!navigator.geolocation){ toast('Location isn\'t available here'); return; }
      navigator.geolocation.getCurrentPosition(p=>{ S.location.lat=+p.coords.latitude.toFixed(4); S.location.lon=+p.coords.longitude.toFixed(4); Store.save(); Weather.load(true); go(); },
        ()=>toast('Location is blocked here. Paste coordinates instead.'),{timeout:10000}); };
    $$('[data-sp]').forEach(b=>b.onclick=()=>{ S.species=b.dataset.sp; Store.save(); go(); });
    $('[data-legal]').onchange=e=>{ S.legalMin=+e.target.value||0; Store.save(); };
    $('[data-alt]').onchange=e=>{ S.env.altFt=+e.target.value||0; Store.save(); };
    $('[data-tours]').onclick=()=>{ S.tours={}; Store.save(); toast('Tours will play as you open each tab'); };
    $('[data-wiz]').onclick=()=>Wizard.open();
    const ins=$('[data-install]'); if (ins) ins.onclick=async()=>{ const e=UIx.installEvt; UIx.installEvt=null; try{ e.prompt(); await e.userChoice; }catch(_){} go(); };
    const dl=$('[data-dlfile]'); if (dl) dl.onclick=()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));
      a.download=`treeline-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); toast('Backup saved to Downloads'); };
    const fi=$('#s_file'); if (fi) fi.onchange=async()=>{ try{ const o=JSON.parse(await fi.files[0].text()); if (!o.rifles||!o.rifles.length) throw 0; S=upgrade(o); S.onboarded=true; Store.save(); toast('Restored'); go(); }catch(e){ toast('That file isn\'t a Treeline backup'); } };
    $('[data-copy]').onclick=async()=>{ const txt=JSON.stringify(S); $('#s_backup').value=txt;
      try{ await navigator.clipboard.writeText(txt); toast('Backup copied'); }catch(e){ $('#s_backup').select(); toast('Select the text and copy it'); } };
    $('[data-restore]').onclick=()=>{ try{ const o=JSON.parse($('#s_backup').value); if (!o.rifles||!o.rifles.length) throw 0; S=upgrade(o); Store.save(); toast('Restored'); go(); }catch(e){ toast('That backup didn\'t read correctly'); } };
    $('[data-reset]').onclick=e=>{ const b=e.currentTarget; if (!b.dataset.sure){ b.dataset.sure=1; b.textContent='Tap again to erase everything'; return; } S=defaults(); S.onboarded=true; Store.save(); go(); };
  }
};

