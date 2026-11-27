/* ===== Stands ===== */
Screens.stands = { label:'Stands',
  windNow(){ const w=Weather.at(Date.now()); return {dir:w.dir, mph:w.wind, src:w.src}; },
  render(){
    const w=this.windNow();
    const view = ON_CLAUDE ? 'list' : (UIx.standView||'map');
    return `<div class="wrap"><div class="row between"><h1>Stands</h1>${ON_CLAUDE?'':`<div class="seg"><button class="${view==='map'?'on':''}" data-sv="map">${ic('map',18)} Map</button><button class="${view==='list'?'on':''}" data-sv="list">List</button></div>`}</div>
      ${ON_CLAUDE?`<div class="warn small" style="margin:10px 0">Maps, GPS and live weather work in your GitHub version of Treeline.</div>`:''}
      ${view==='map'?this.mapHTML():''}
      ${view==='list'?this.listHTML(w):''}</div>`;
  },
  mapHTML(){
    return `<div id="mapcard"><div class="toolbar"><div class="seg">${Object.entries(CONFIG.maps).map(([k,v])=>`<button class="${S.mapStyle===k?'on':''}" data-ms="${k}">${esc(v.label)}</button>`).join('')}</div></div>
      <div class="mapbox"><div id="map"></div><svg class="cross" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3v9M15 18v9M3 15h9M18 15h9" stroke="#d8b46a" stroke-width="2.5" stroke-linecap="round"/><path d="M15 3v9M15 18v9M3 15h9M18 15h9" stroke="#000" stroke-opacity=".35" stroke-width="5" stroke-linecap="round" style="mix-blend-mode:multiply"/></svg></div>
      <div class="toolbar"><button data-locate>${ic('pin',18)} Locate me</button><button class="${UIx.measure?'on':''}" data-measure>${ic('arc',18)} ${UIx.measure?'Measuring':'Measure'}</button><button class="brass" data-addcenter>${ic('plus',18)} Add stand at crosshair</button></div>
      <div id="mappanel"></div></div>`;
  },
  panel(){ const el=$('#mappanel'); if (!el) return; let h='';
    if (UIx.measure){ h = UIx.mB ? (()=>{ const yd=Math.round(Geo.yards(UIx.mA,UIx.mB)); return `<div class="card"><div class="big">${yd} yd</div><div class="row" style="margin-top:10px"><button class="brass" data-sendyd="${yd}">${ic('scope',18)} Use in the stand</button><button class="ghost" data-mclear>Measure again</button></div></div>`; })()
        : `<div class="card small">${UIx.mA?'Now tap the spot you want to measure to.':'Tap a stand pin (or any spot) to start measuring.'}</div>`; }
    else if (UIx.me){ h+=`<div class="card"><div class="small">You're here (accurate to about ${Math.round(UIx.me.acc*1.09361)} yd).</div><button class="brass" style="margin-top:10px" data-addme>${ic('plus',18)} Drop a stand where I'm standing</button></div>`; }
    const st=S.stands.find(x=>x.id===UIx.selStand);
    if (st && !UIx.measure){ const w=Weather.at(Date.now()), good=w.dir!=null&&(st.goodWinds||[]).includes(compass(w.dir));
      h+=`<div class="card"><div class="hd"><div><h2>${esc(st.name)}</h2><div class="small muted">${st.height?st.height+' ft up · ':''}good winds ${(st.goodWinds||[]).join(', ')||'not set'}</div></div>${w.dir!=null?`<span class="badge" style="${good?'':'background:var(--ox);color:#fff'}">${good?'Good wind now':'Wrong wind now'}</span>`:''}</div>
        ${w.dir!=null?`<p class="small" style="margin:8px 0 0">Wind ${Math.round(w.wind)} mph from ${compass(w.dir)}. The red cone shows where your scent is drifting.</p>`:''}
        <div class="row" style="margin-top:10px"><button data-fcst="${st.id}">${ic('sun',18)} Forecast here</button><button data-edits="${st.id}">${ic('edit',18)} Edit</button></div></div>`; }
    if (!h && !S.stands.length) h=`<div class="card small">Press and hold on the map, or line up the crosshair and tap <b>Add stand at crosshair</b>.</div>`;
    el.innerHTML=h; this.bindPanel(); },
  bindPanel(){
    $$('#mappanel [data-fcst]').forEach(b=>b.onclick=()=>this.forecastHere(b.dataset.fcst));
    $$('#mappanel [data-edits]').forEach(b=>b.onclick=()=>this.edit(S.stands.find(x=>x.id===b.dataset.edits),false));
    const sy=$('[data-sendyd]'); if (sy) sy.onclick=()=>{ Screens.stand.st.yd=Math.max(10,Math.min(600,Math.round(+sy.dataset.sendyd/5)*5)); location.hash='stand'; };
    const mc=$('[data-mclear]'); if (mc) mc.onclick=()=>{ UIx.mA=null; UIx.mB=null; MapKit.draw(); this.panel(); };
    const am=$('[data-addme]'); if (am) am.onclick=()=>this.edit({id:uid(),name:'',lat:+UIx.me.lat.toFixed(5),lon:+UIx.me.lon.toFixed(5),height:'',goodWinds:[],notes:''},true);
  },
  forecastHere(id){ const st=S.stands.find(x=>x.id===id); S.location={name:st.name,lat:st.lat,lon:st.lon}; S.activeStandId=st.id; Store.save(); Weather.load(true); location.hash='forecast'; },
  listHTML(w){
    return `<p class="small muted">Wind right now: <b>${w.dir!=null?`${Math.round(w.mph)} mph from ${compass(w.dir)}`:'unknown'}</b>${w.src==='manual'?' (from the conditions you entered on Forecast)':''}. ${q('scent')}</p>
      <div id="standlist">${S.stands.length?S.stands.map(st=>{ const good=w.dir!=null&&(st.goodWinds||[]).includes(compass(w.dir));
        return `<div class="card"><div class="hd"><div><h2>${esc(st.name)}</h2><div class="small muted">${st.height?`${st.height} ft up · `:''}${st.lat&&st.lon?`${st.lat}, ${st.lon}`:'no coordinates yet'}</div></div>
          ${w.dir!=null?`<span class="badge" style="${good?'':'background:var(--ox);color:#fff'}">${good?'Good wind now':'Wrong wind now'}</span>`:''}</div>
          <svg viewBox="0 0 240 240" style="width:min(100%,260px);display:block;margin:10px auto" role="img" aria-label="Wind and scent diagram for ${esc(st.name)}">${Draw.stand(st,w.dir,w.mph)}</svg>
          <div class="small" style="text-align:center">${w.dir!=null?`Your scent is drifting toward the <b>${DIRS[Math.round(((w.dir+180)%360)/45)%8]}</b>.`:''} Good winds: <b>${(st.goodWinds||[]).join(', ')||'none picked'}</b></div>
          ${st.height?`<div class="small muted" style="text-align:center;margin-top:4px">Shot angle from ${st.height} ft: ${[15,25,40].map(y=>`${Math.round(Math.atan(st.height/(y*3))/DEG)}° at ${y} yd`).join(' · ')}</div>`:''}
          ${st.notes?`<p class="small muted">${esc(st.notes)}</p>`:''}
          <div class="row" style="margin-top:12px">${st.lat&&st.lon&&!ON_CLAUDE?`<button data-onmap="${st.id}">${ic('map',18)} On map</button>`:''}${st.lat&&st.lon?`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(st.lat+','+st.lon)}" target="_blank" rel="noopener" style="text-decoration:none"><button>${ic('map',18)} Map</button></a><button data-fcst="${st.id}">${ic('sun',18)} Forecast here</button>`:''}<button data-edits="${st.id}" aria-label="Edit stand">${ic('edit',18)}</button></div></div>`; }).join('')
      :`<div class="card"><h2>Add your first stand</h2><p class="small muted">Save each stand with the winds it hunts well in. Forecast will then tell you which one fits the day's wind.</p><button class="pri" data-addstand>${ic('plus',18)} Add stand</button></div>`}</div>
      <button class="brass" style="margin-top:4px" data-addstand>${ic('plus',18)} Add stand</button>`;
  },
  edit(st,isNew){
    const box=openSheet(`<div class="hd"><h2>${isNew?'New stand':'Edit stand'}</h2><button class="ghost" data-x>Close</button></div>
      <label for="st_n">Name</label><input id="st_n" value="${esc(st.name)}" placeholder="Creek stand">
      <label for="st_c">Coordinates</label><input id="st_c" inputmode="decimal" value="${st.lat?esc(st.lat+', '+st.lon):''}" placeholder="32.2732, -89.9859"><div class="help">Press and hold the stand in Google Maps, copy the numbers, paste here.</div>
      <label for="st_h">Height (ft)</label><input id="st_h" type="number" inputmode="decimal" value="${esc(st.height)}" placeholder="15">
      <label>Good winds (where the wind comes from) ${q('stand')}</label><div class="choice" style="grid-template-columns:repeat(4,minmax(0,1fr))">${DIRS.map(d=>`<button type="button" class="${(st.goodWinds||[]).includes(d)?'on':''}" data-gw="${d}">${d}</button>`).join('')}</div>
      <label for="st_no">Notes</label><textarea id="st_no" placeholder="Deer come from the bedding area to the east">${esc(st.notes)}</textarea>
      <div class="row" style="margin-top:18px"><button class="pri" data-ss>Save</button>${isNew?'':`<button class="ghost" data-sd>Delete stand</button>`}</div>`);
    const gw=new Set(st.goodWinds||[]);
    box.addEventListener('click',e=>{ const g=e.target.closest('[data-gw]'); if (g){ const d=g.dataset.gw; gw.has(d)?gw.delete(d):gw.add(d); g.classList.toggle('on'); }
      if (e.target.closest('[data-ss]')){ st.name=box.querySelector('#st_n').value||'Stand'; const m=box.querySelector('#st_c').value.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
        if (m && Math.abs(+m[1])<=90 && Math.abs(+m[2])<=180){ st.lat=+m[1]; st.lon=+m[2]; }
        st.height=+box.querySelector('#st_h').value||''; st.notes=box.querySelector('#st_no').value; st.goodWinds=DIRS.filter(d=>gw.has(d));
        if (isNew) S.stands.push(st); UIx.selStand=st.id; Store.save(); box.remove(); go(); }
      const d=e.target.closest('[data-sd]'); if (d){ if (!d.dataset.sure){ d.dataset.sure=1; d.textContent='Tap again to delete'; return; } S.stands=S.stands.filter(x=>x.id!==st.id); Store.save(); box.remove(); go(); } });
  },
  bind(){
    $$('[data-addstand]').forEach(b=>b.onclick=()=>this.edit({id:uid(),name:'',lat:'',lon:'',height:'',goodWinds:[],notes:''},true));
    $$('[data-edits]').forEach(b=>b.onclick=()=>this.edit(S.stands.find(x=>x.id===b.dataset.edits),false));
    $$('[data-fcst]').forEach(b=>b.onclick=()=>this.forecastHere(b.dataset.fcst));
    $$('[data-sv]').forEach(b=>b.onclick=()=>{ UIx.standView=b.dataset.sv; go(); });
    $$('[data-onmap]').forEach(b=>b.onclick=()=>{ const st=S.stands.find(x=>x.id===b.dataset.onmap); UIx.selStand=st.id; UIx.mapView={lat:st.lat,lon:st.lon,z:17}; UIx.standView='map'; go(); });
    $$('[data-ms]').forEach(b=>b.onclick=()=>{ S.mapStyle=b.dataset.ms; Store.save(); go(); });
    const ac=$('[data-addcenter]'); if (ac) ac.onclick=()=>{ if (!MapKit.map){ toast('The map is still loading'); return; } const c=MapKit.map.getCenter(); this.edit({id:uid(),name:'',lat:+c.lat.toFixed(5),lon:+c.lng.toFixed(5),height:'',goodWinds:[],notes:''},true); };
    const ms=$('[data-measure]'); if (ms) ms.onclick=()=>{ UIx.measure=!UIx.measure; UIx.mA=null; UIx.mB=null; const sel=S.stands.find(x=>x.id===UIx.selStand&&x.lat); if (UIx.measure&&sel) UIx.mA=[sel.lat,sel.lon];
      ms.classList.toggle('on',UIx.measure); ms.lastChild.textContent=UIx.measure?' Measuring':' Measure'; MapKit.draw(); this.panel(); };
    const lo=$('[data-locate]'); if (lo) lo.onclick=()=>{ if (!navigator.geolocation){ toast('Location isn\'t available on this device'); return; } lo.lastChild.textContent=' Finding you…';
      navigator.geolocation.getCurrentPosition(p=>{ UIx.me={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy}; lo.lastChild.textContent=' Locate me';
        if (MapKit.map) MapKit.map.setView([UIx.me.lat,UIx.me.lon],Math.max(MapKit.map.getZoom(),17)); MapKit.draw(); this.panel(); },
        ()=>{ lo.lastChild.textContent=' Locate me'; toast('Location was blocked. Allow it in Chrome\'s site settings.'); },{enableHighAccuracy:true,timeout:15000}); };
    if ($('#map')){ MapKit.mount(); this.panel(); }
  }
};

