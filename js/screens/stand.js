/* ===== In the stand: one big answer, made for cold hands and low light ===== */
Screens.stand = { label:'In the stand',
  st:{yd:100, wind:0, from:'R', angle:false},
  render(){
    const r=rifle(), l=curLoad(), z=this.st, stand=S.stands.find(x=>x.id===S.activeStandId), ok=+l.bc>0&&+l.mv>0;
    const day=Astro.day(midnight(0),S.location.lat,S.location.lon,S.legalMin,CONFIG.solunar), now=Date.now();
    let light=''; if (day.legalStart&&day.legalEnd){ if (now<day.legalStart) light=`Legal light in ${Math.ceil((day.legalStart-now)/6e4)} min`; else if (now<day.legalEnd) light=`Legal light ends in ${Math.floor((day.legalEnd-now)/6e4)} min`; else light='Past legal light'; }
    let main='Add BC and velocity in the Locker', sub='', marks='';
    if (ok){ const ang=z.angle&&stand&&stand.height?-Math.atan(stand.height/(z.yd*3))/DEG:0;
      const x=tbl(r,l,{...S.env,windMph:z.wind,windClock:z.from==='R'?3:9,inclineDeg:ang},[z.yd])[0];
      if (x){ const up=Math.round(x.upClicks); main=Math.abs(x.dropIn)<.75?'DEAD ON':`HOLD ${r1(Math.abs(x.dropIn))}" ${x.dropIn<0?'HIGH':'LOW'}`;
        const hm=holdMarks(r,-x.dropIn,z.yd); if (hm && Math.abs(hm.marks)>=.25) marks=marksText(hm, hm.units>0?'below center':'above center');
        sub=`or dial ${up===0?'nothing':`${up>0?'UP':'DOWN'} ${Math.abs(up)}`}${Math.abs(x.driftIn)>=.75?` · wind: hold ${r1(Math.abs(x.driftIn))}" ${x.driftIn<0?'right':'left'}`:''}${ang?` · ${Math.round(-ang)}° down`:''}`; } }
    const chip=(k,v,lab)=>`<button class="${z[k]===v?'on':''}" data-sd="${k}|${v}">${lab}</button>`;
    return `<div class="wrap" style="text-align:center">
      <div class="row between"><a href="#forecast" style="text-decoration:none"><button class="ghost">Back</button></a><span class="small" style="color:var(--blaze)">${esc(light)}</span></div>
      <div class="small muted" style="margin-top:8px">${esc(r.name)} · ${esc(l.name)}</div>
      <div class="os" style="font-size:clamp(46px,14vw,84px);margin:20px 0 6px;color:#d8b46a">${esc(main)}</div><div class="small" style="min-height:1.5em">${esc(sub)}</div>${marks?`<div class="small" style="margin-top:6px;color:#d8b46a;font-weight:600">Reticle: ${esc(marks)}</div>`:''}
      <div style="display:grid;grid-template-columns:auto auto minmax(0,1fr) auto auto;gap:6px;align-items:center;margin:22px 0 8px"><button style="padding:0 10px" data-step="-25" aria-label="25 yards closer">−25</button><button style="padding:0 12px" data-step="-5" aria-label="5 yards closer">−5</button><div class="os" style="font-size:40px">${z.yd}<span style="font-size:18px"> yd</span></div><button style="padding:0 12px" data-step="5" aria-label="5 yards farther">+5</button><button style="padding:0 10px" data-step="25" aria-label="25 yards farther">+25</button></div>
      <div class="chips" style="justify-content:center">${[25,50,75,100,150,200,250,300].map(y=>chip('yd',y,y)).join('')}</div>
      <div class="small muted" style="margin-top:16px">Wind (mph)</div><div class="chips" style="justify-content:center">${[0,5,10,15,20].map(w=>chip('wind',w,w)).join('')}</div>
      ${z.wind?`<div class="chips" style="justify-content:center;margin-top:6px">${chip('from','L','From left')}${chip('from','R','From right')}</div>`:''}
      ${stand&&stand.height?`<div style="margin-top:14px">${chip('angle',!z.angle,z.angle?`Using ${stand.height} ft stand angle`:`Add ${stand.height} ft stand angle`)}</div>`:''}
      <p class="tiny muted" style="margin-top:22px">Based on your ${r.zeroYd}-yd zero. Confirm on paper before the season.</p></div>`;
  },
  bind(){
    const z=this.st;
    $$('[data-step]').forEach(b=>b.onclick=()=>{ z.yd=Math.max(10,Math.min(600,z.yd+ +b.dataset.step)); go(); });
    $$('[data-sd]').forEach(b=>b.onclick=()=>{ const [k,v]=b.dataset.sd.split('|'); z[k]= k==='from'?v : k==='angle'?v==='true' : +v; go(); });
    try{ if (navigator.wakeLock && !UIx.wl) navigator.wakeLock.request('screen').then(w=>{ UIx.wl=w; w.addEventListener('release',()=>UIx.wl=null); }).catch(()=>{}); }catch(e){}
  }
};

