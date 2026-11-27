/* ---------- 5. DRAWINGS ---------- */
const Draw = {
  // Moon phase disc. f = fraction lit, phase 0..1 (under .5 = waxing, lit on the right).
  moon(f,phase,r){ const k=2*f-1, rx=Math.abs(k)*r;
    return `<circle r="${r}" fill="var(--moonDark)"/><path d="M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx} ${r} 0 0 ${k>0?1:0} 0 ${-r}Z" fill="var(--moonLit)" ${phase<.5?'':'transform="scale(-1,1)"'}/><circle r="${r}" fill="none" stroke="var(--line)"/>`; },
  // 24-hour dial: midnight at the bottom, noon at the top.
  dial(day,size){
    const c=size/2, R=c-26, pt=(h,r)=>{ const a=Math.PI/2+h/24*2*Math.PI; return [c+r*Math.cos(a), c+r*Math.sin(a)]; };
    const hr=t=>Math.max(0,Math.min(24,(t-day.d0)/HOUR));
    const arc=(h1,h2,r)=>{ if (h2-h1<=0) return ''; const [x1,y1]=pt(h1,r),[x2,y2]=pt(h2,r); return `M${x1} ${y1}A${r} ${r} 0 ${h2-h1>12?1:0} 1 ${x2} ${y2}`; };
    let g=`<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="var(--moonDark)" stroke-width="16"/>`;
    if (day.legalStart) g+=`<path d="${arc(hr(day.legalStart),hr(day.legalEnd),R)}" fill="none" stroke="var(--brassbg)" stroke-opacity=".35" stroke-width="16"/>`;
    if (day.sunrise) g+=`<path d="${arc(hr(day.sunrise),hr(day.sunset),R)}" fill="none" stroke="var(--moonLit)" stroke-width="16"/>`;
    for (const p of day.periods) g+=`<path d="${arc(hr(p.start),hr(p.end),R-22)}" fill="none" stroke="var(--brassbg)" stroke-width="${p.kind==='major'?12:7}" stroke-linecap="round" opacity="${p.kind==='major'?1:.7}"/>`;
    for (const [h,l] of [[0,'12a'],[6,'6a'],[12,'12p'],[18,'6p']]){ const [x,y]=pt(h,R+17); g+=`<text x="${x}" y="${y+4}" text-anchor="middle" font-size="12" fill="var(--mute)">${l}</text>`; }
    for (const e of day.moonEv){ const [x,y]=pt(hr(e.t),R-22); g+=`<circle cx="${x}" cy="${y}" r="4" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.5"/>`; }
    if (day.d0<=Date.now() && Date.now()<day.d0+DAY){ const h=hr(Date.now()), [x,y]=pt(h,R+8);
      g+=`<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="var(--blaze)" stroke-width="3" stroke-linecap="round"/>`; }
    g+=`<circle cx="${c}" cy="${c}" r="${R-38}" fill="var(--panel)"/><g transform="translate(${c} ${c-8})">${Draw.moon(day.moon.fraction,day.moon.phase,Math.min(26,R-50))}</g>`;
    g+=`<text x="${c}" y="${c+Math.min(26,R-50)+12}" text-anchor="middle" font-size="13" font-weight="600" fill="var(--ink)">${Math.round(day.moon.fraction*100)}% lit</text>`;
    return g;
  },
  // Turret cap with ticks. The tick group spins; the arrow shows the UP / R direction.
  turret(id,label){
    let t=''; for (let i=0;i<60;i++){ const a=i*6*DEG, L=i%5===0?14:8, r=56;
      t+=`<line x1="${65+Math.sin(a)*r}" y1="${65-Math.cos(a)*r}" x2="${65+Math.sin(a)*(r-L)}" y2="${65-Math.cos(a)*(r-L)}" stroke="#d8b46a" stroke-width="${i%5===0?2:1}"/>`; }
    return `<svg viewBox="0 0 130 130" aria-hidden="true"><circle cx="65" cy="65" r="62" fill="#14261b" stroke="#d8b46a" stroke-width="2"/>
      <g class="tg" id="${id}" style="transform-origin:65px 65px">${t}<circle cx="65" cy="65" r="30" fill="#1f3a2b" stroke="#2f5a43"/><circle cx="65" cy="12" r="4" fill="#ff6b1a"/></g>
      <path d="M65 0v10" stroke="#f4efe3" stroke-width="3"/><text x="65" y="70" text-anchor="middle" font-family="Oswald, Arial Narrow, sans-serif" font-size="16" fill="#f4efe3">${label}</text></svg>`;
  },
  // Simple side-view deer in inches, vitals at (0,0), y up. Returned as SVG in a group you scale.
  deer(){
    return `<g fill="var(--deer)">
      <ellipse cx="9" cy="-4" rx="23" ry="10.5"/>
      <path d="M-11 -8 L-6 -12 L-19 -26 L-26 -22 Z"/>
      <ellipse cx="-27" cy="-25" rx="7.5" ry="4.5" transform="rotate(-12 -27 -25)"/>
      <ellipse cx="-22" cy="-31" rx="1.8" ry="4.2" transform="rotate(20 -22 -31)"/>
      <rect x="-10" y="4" width="3" height="25" rx="1.4"/><rect x="-4" y="4" width="3" height="25" rx="1.4"/>
      <rect x="21" y="2" width="3.2" height="27" rx="1.4"/><rect x="26.5" y="2" width="3.2" height="27" rx="1.4"/>
      <ellipse cx="31.5" cy="-10" rx="2.5" ry="4" fill="var(--moonLit)"/></g>
      <path d="M-24 -29c1-6 5-10 11-10M-19 -35l-1-4M-15 -38l0-4" fill="none" stroke="var(--deer)" stroke-width="1.6" stroke-linecap="round"/>
      <line x1="-60" x2="70" y1="29" y2="29" stroke="var(--green2)" stroke-width=".8" opacity=".6"/>`;
  },
  // Top-down stand diagram: good-wind sectors, wind arrow, scent cone. Compass degrees, north up.
  stand(st,dir,mph){
    const c=120, P=(deg,r)=>[c+r*Math.sin(deg*DEG), c-r*Math.cos(deg*DEG)];
    const sector=(d1,d2,r)=>{ const [x1,y1]=P(d1,r),[x2,y2]=P(d2,r); return `M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}`; };
    let g=`<circle cx="${c}" cy="${c}" r="100" fill="var(--soft)" stroke="var(--line)"/><circle cx="${c}" cy="${c}" r="60" fill="none" stroke="var(--line)" stroke-dasharray="3 4"/>`;
    for (const d of st.goodWinds||[]){ const a=DIRS.indexOf(d)*45; g+=`<path d="${sector(a-21,a+21,100)}" fill="none" stroke="var(--brassbg)" stroke-width="9" stroke-linecap="round"/>`; }
    DIRS.forEach((d,i)=>{ const [x,y]=P(i*45,113); g+=`<text x="${x}" y="${y+4}" text-anchor="middle" font-size="${i%2?10:12}" font-weight="${d==='N'?700:400}" fill="var(--mute)">${d}</text>`; });
    if (dir!=null){ const down=(dir+180)%360, [a1,b1]=P(down-24,96), [a2,b2]=P(down+24,96);
      g+=`<path d="M${c} ${c}L${a1} ${b1}A96 96 0 0 1 ${a2} ${b2}Z" fill="var(--ox)" opacity=".22"/>`;
      const [sx,sy]=P(dir,92), [ex,ey]=P(dir,24), [h1x,h1y]=P(dir-14,38), [h2x,h2y]=P(dir+14,38);
      g+=`<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/><path d="M${ex} ${ey}L${h1x} ${h1y}L${h2x} ${h2y}Z" fill="var(--ink)"/>`;
    }
    g+=`<circle cx="${c}" cy="${c}" r="9" fill="var(--green)" stroke="#d8b46a" stroke-width="2"/>`;
    return g;
  },
  pic(name){
    if (name==='moa') return `<svg viewBox="0 0 320 120" width="100%" role="img" aria-label="One MOA is about 1 inch at 100 yards and 2 inches at 200"><path d="M20 60 L300 30 L300 90Z" fill="var(--soft)" stroke="var(--line)"/><line x1="160" y1="45" x2="160" y2="75" stroke="var(--brass)" stroke-width="3"/><line x1="300" y1="30" x2="300" y2="90" stroke="var(--brass)" stroke-width="3"/><circle cx="20" cy="60" r="5" fill="var(--ink)"/><text x="160" y="100" text-anchor="middle" font-size="13" fill="var(--ink)">100 yd: 1"</text><text x="296" y="110" text-anchor="end" font-size="13" fill="var(--ink)">200 yd: 2"</text></svg>`;
    if (name==='bc') return `<svg viewBox="0 0 320 120" width="100%" role="img" aria-label="A high BC bullet drops less than a low BC bullet"><line x1="10" x2="310" y1="30" y2="30" stroke="var(--line)" stroke-dasharray="4 4"/><path d="M10 34 Q160 18 310 62" fill="none" stroke="var(--green2)" stroke-width="3"/><path d="M10 34 Q160 22 310 100" fill="none" stroke="var(--ox)" stroke-width="3"/><text x="306" y="56" text-anchor="end" font-size="13" fill="var(--green2)">high BC</text><text x="306" y="94" text-anchor="end" font-size="13" fill="var(--ox)">low BC</text></svg>`;
    if (name==='turret') return `<div style="width:150px;margin:0 auto;background:var(--green);border-radius:14px;padding:6px">${Draw.turret('tipT','UP')}</div>`;
    return '';
  }
};

/* ---------- MAP (Leaflet, loaded only when the map is opened) ---------- */
const Geo = {
  dest(lat,lon,brg,m){ return [lat+m*Math.cos(brg*DEG)/111320, lon+m*Math.sin(brg*DEG)/(111320*Math.cos(lat*DEG))]; },
  yards(a,b){ const R=6371000, dLa=(b[0]-a[0])*DEG, dLo=(b[1]-a[1])*DEG;
    const h=Math.sin(dLa/2)**2+Math.cos(a[0]*DEG)*Math.cos(b[0]*DEG)*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(h))*1.09361; }
};
const MapKit = {
  map:null, group:null, loading:null,
  load(){ if (window.L) return Promise.resolve(); if (this.loading) return this.loading;
    this.loading=new Promise((res,rej)=>{ const css=document.createElement('link'); css.rel='stylesheet'; css.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
      const sc=document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; sc.onload=()=>res(); sc.onerror=()=>{ this.loading=null; rej(); }; document.head.appendChild(sc); });
    return this.loading; },
  async mount(){
    const el=$('#map'); if (!el) return;
    try{ await this.load(); }catch(e){ el.innerHTML='<div class="warn" style="margin:16px">The map couldn\'t load. Check your signal and try again.</div>'; return; }
    if (!$('#map')) return;
    if (this.map){ this.map.remove(); this.map=null; }
    const sel=S.stands.find(x=>x.id===UIx.selStand&&x.lat), first=S.stands.find(x=>x.lat);
    const v=UIx.mapView || (sel?{lat:sel.lat,lon:sel.lon,z:17}:first?{lat:first.lat,lon:first.lon,z:16}:{lat:S.location.lat,lon:S.location.lon,z:14});
    const m=this.map=L.map(el,{zoomControl:true}).setView([v.lat,v.lon],v.z);
    const t=CONFIG.maps[S.mapStyle]||CONFIG.maps.sat; L.tileLayer(t.url,t.opt).addTo(m);
    this.group=L.layerGroup().addTo(m);
    m.on('moveend',()=>{ const c=m.getCenter(); UIx.mapView={lat:c.lat,lon:c.lng,z:m.getZoom()}; });
    m.on('contextmenu',e=>{ if (UIx.measure) return; Screens.stands.edit({id:uid(),name:'',lat:+e.latlng.lat.toFixed(5),lon:+e.latlng.lng.toFixed(5),height:'',goodWinds:[],notes:''},true); });
    m.on('click',e=>{ if (!UIx.measure) return; const p=[e.latlng.lat,e.latlng.lng]; if (!UIx.mA||UIx.mB){ UIx.mA=p; UIx.mB=null; } else UIx.mB=p; this.draw(); Screens.stands.panel(); });
    this.draw();
  },
  draw(){
    if (!this.map) return; const g=this.group; g.clearLayers();
    for (const st of S.stands){ if (!st.lat||!st.lon) continue; const isSel=st.id===UIx.selStand;
      const mk=L.marker([st.lat,st.lon],{icon:L.divIcon({className:'pinwrap',html:`<div class="pin ${isSel?'sel':''}"></div><div class="pinlab">${esc(st.name)}</div>`,iconSize:[22,22],iconAnchor:[11,11]})}).addTo(g);
      mk.on('click',ev=>{ L.DomEvent.stopPropagation(ev); if (UIx.measure){ UIx.mA=[st.lat,st.lon]; UIx.mB=null; } else UIx.selStand=isSel?null:st.id; this.draw(); Screens.stands.panel(); }); }
    const st=S.stands.find(x=>x.id===UIx.selStand&&x.lat), w=Weather.at(Date.now());
    if (st && w.dir!=null && !UIx.measure){ const down=(w.dir+180)%360, R=CONFIG.scentConeMeters, cone=[[st.lat,st.lon]];
      for (let a=-24;a<=24;a+=6) cone.push(Geo.dest(st.lat,st.lon,down+a,R));
      L.polygon(cone,{color:'#e08a74',weight:1,fillColor:'#c0492f',fillOpacity:.3,interactive:false}).addTo(g);
      const s0=Geo.dest(st.lat,st.lon,w.dir,R*.9), s1=Geo.dest(st.lat,st.lon,w.dir,R*.18);
      L.polyline([s0,s1],{color:'#f4efe3',weight:5,interactive:false}).addTo(g);
      L.polygon([s1,Geo.dest(st.lat,st.lon,w.dir-12,R*.3),Geo.dest(st.lat,st.lon,w.dir+12,R*.3)],{color:'#f4efe3',weight:1,fillColor:'#f4efe3',fillOpacity:1,interactive:false}).addTo(g); }
    if (UIx.me){ L.circle([UIx.me.lat,UIx.me.lon],{radius:UIx.me.acc,color:'#4a90e2',weight:1,fillOpacity:.12,interactive:false}).addTo(g);
      L.circleMarker([UIx.me.lat,UIx.me.lon],{radius:8,color:'#fff',weight:3,fillColor:'#2f80ed',fillOpacity:1}).addTo(g); }
    if (UIx.measure && UIx.mA){ L.circleMarker(UIx.mA,{radius:6,color:'#d8b46a',weight:3,fillColor:'#1f3a2b',fillOpacity:1}).addTo(g);
      if (UIx.mB){ const yd=Geo.yards(UIx.mA,UIx.mB); L.polyline([UIx.mA,UIx.mB],{color:'#d8b46a',weight:4,dashArray:'8 6'}).addTo(g);
        L.circleMarker(UIx.mB,{radius:6,color:'#d8b46a',weight:3,fillColor:'#ff6b1a',fillOpacity:1}).addTo(g).bindTooltip(`${Math.round(yd)} yd`,{permanent:true,direction:'top',className:'mlabel',offset:[0,-8]}).openTooltip(); } }
  }
};

