/* ===== Forecast ===== */
Screens.forecast = { label:'Forecast',
  compute(off=UIx.dayOff){
    const sp=CONFIG.species[S.species]||CONFIG.species.deer, d0=midnight(off), {lat,lon}=S.location;
    const day=Astro.day(d0,lat,lon,S.legalMin,CONFIG.solunar);
    const hours=[...Array(24)].map((_,h)=>{ const t=d0+h*HOUR+HOUR/2, wx=Weather.at(t); return {h,t,wx,...huntScore({t,day,...wx},sp)}; });
    const now=Date.now(); let best=null, overall=null;
    for (let h=0;h<23;h++){ const a=hours[h],b=hours[h+1]; if (!a.legal||!b.legal) continue;
      const w={s:(a.score+b.score)/2, start:d0+h*HOUR, end:d0+(h+2)*HOUR, h};
      if (!overall||w.s>overall.s) overall=w; if (w.end>now && (!best||w.s>best.s)) best=w; }
    // Best morning and best evening sit (split at solar noon), for the week view.
    const noon=(day.sunrise&&day.sunset)?(day.sunrise+day.sunset)/2:d0+12*HOUR; let am=null, pm=null;
    for (let h=0;h<23;h++){ const a=hours[h],b=hours[h+1]; if (!a.legal||!b.legal) continue;
      const w={s:(a.score+b.score)/2, start:d0+h*HOUR, end:d0+(h+2)*HOUR, h};
      if (w.end<=noon+HOUR){ if (!am||w.s>am.s) am=w; } else if (!pm||w.s>pm.s) pm=w; }
    return {sp,day,hours,best:best||overall,overall,passed:!best&&!!overall,am,pm};
  },
  /* ---------- This week: every day ranked by its best sit ---------- */
  week(){
    const key=[S.species,S.location.lat,S.location.lon,S.legalMin,Weather.status,midnight(0),JSON.stringify(S.manualWx),Math.floor(Date.now()/18e5)].join('|');
    if (UIx.weekKey===key && UIx.weekData) return UIx.weekData;
    const days=[...Array(7)].map((_,i)=>{ const F=i===UIx.dayOff&&UIx.F?UIx.F:this.compute(i), w=F.overall;
      let good=[], watch=[];
      if (w){ const hr=F.hours[w.h+1]||F.hours[w.h];
        const GOOD={solunar:'solunar peak',pressure:'pressure',wind:'calm wind',temp:'cooling'}, BAD={solunar:'weak solunar',pressure:'pressure',wind:'wind',temp:'warm-up',rain:'rain'};
        good=hr.parts.filter(p=>GOOD[p.k]&&p.v>=.75).sort((a,b)=>b.w*b.v-a.w*a.v).map(p=>GOOD[p.k]);
        watch=hr.parts.filter(p=>BAD[p.k]&&p.v<.35&&p.w>=.1).map(p=>BAD[p.k]); }
      return {i, d0:F.day.d0, day:F.day, best:w, am:F.am, pm:F.pm, good, watch}; });
    const ranked=[...days].filter(d=>d.best).sort((a,b)=>b.best.s-a.best.s);
    UIx.weekKey=key; UIx.weekData={days, top:ranked[0]?ranked[0].i:-1, ranks:Object.fromEntries(ranked.map((d,n)=>[d.i,n+1]))};
    return UIx.weekData; },
  weekCard(){
    const W=this.week(), st=Weather.status, sit=w=>w?`${fmtT(w.start)} (<b>${Math.round(w.s)}</b>)`:'';
    const rows=W.days.map(d=>{ const s=d.best?Math.round(d.best.s):0, top=d.i===W.top, label=d.i===0?'Today':d.i===1?'Tomorrow':new Date(d.d0).toLocaleDateString([], {weekday:'long'});
      return `<button class="weekrow ${d.i===UIx.dayOff?'cur':''} ${top?'best':''}" data-day="${d.i}" aria-label="${label}, best hunt score ${s}">
        <svg viewBox="-12 -12 24 24" width="26" height="26" aria-hidden="true">${Draw.moon(d.day.moon.fraction,d.day.moon.phase,10)}</svg>
        <span class="wk-l"><span><b>${label}</b>${top?' <span class="badge" style="background:var(--brassbg);color:var(--ink);display:inline-block">Best day</span>':''}</span>
          <span class="tiny muted">${new Date(d.d0).toLocaleDateString([], {month:'short',day:'numeric'})} ${d.am||d.pm?` · best sits ${[sit(d.am),sit(d.pm)].filter(Boolean).join(', ')}`:''}</span>
          ${d.good.length||d.watch.length?`<span class="tiny">${d.good.length?`<span style="color:var(--green2)">Good ${esc(d.good.slice(0,3).join(', '))}</span>`:''}${d.good.length&&d.watch.length?' · ':''}${d.watch.length?`<span style="color:var(--ox)">Watch ${esc(d.watch.join(', '))}</span>`:''}</span>`:''}</span>
        <span class="wk-s"><span class="wk-bar"><i style="width:${s}%;background:${top?'var(--brassbg)':'var(--green2)'}"></i></span><b>${d.best?s:'—'}</b></span></button>`; }).join('');
    const note = st==='live'||st==='cached' ? 'Weather forecasts get less certain after about 3 days, so re-check later in the week.' : 'Live weather isn\'t loaded, so days are ranked on sun, moon and solunar only, using the conditions you entered.';
    return `<div class="card" id="weekcard"><div class="hd"><h3>${ic('target')} This week</h3><span class="tiny muted">best 2-hour sit each day ${q('score')}</span></div>
      <div class="weeklist">${rows}</div><div class="tiny muted" style="margin-top:8px">Tap a day to plan it. ${esc(note)}</div></div>`; },
  render(){
    const F=this.compute(); UIx.F=F; const {sp,day,hours,best}=F;
    if (UIx.hour==null) UIx.hour = UIx.dayOff===0 ? new Date().getHours() : (best?best.h:6);
    const sel=hours[UIx.hour], st=Weather.status;
    const WK=this.week(); const days=[...Array(7)].map((_,i)=>{ const d=new Date(midnight(i)); return `<button class="${i===UIx.dayOff?'on':''}" data-day="${i}">${i===WK.top?'★ ':''}${i===0?'Today':d.toLocaleDateString([], {weekday:'short', day:'numeric'})}</button>`; }).join('');
    const settle = best ? Math.max(best.start-30*6e4, day.legalStart||best.start) : null;
    const rating=['Poor','Fair','Good','Excellent'][day.rating-1];
    const wxNote = st==='live' ? 'Live forecast from Open-Meteo.' : st==='cached' ? 'Offline: showing the last forecast saved on this phone.' : st==='loading' ? 'Loading forecast…' : 'Live weather can\'t load here, so the score uses the conditions you enter at the bottom.';
    return `<section class="band"><div class="wrap">
      <div class="row between"><span class="muted small">${ic('pin',16)} ${esc(S.location.name)} · ${esc(sp.label)}</span><a href="#setup" class="small" style="color:#d8b46a">Change</a></div>
      <div class="chips" style="margin-top:10px">${days}</div>
      <div class="verdict" id="verdict"><div>
        <h1>${best?(F.passed?'Today\'s best is over':VERDICT(best.s)):'No legal window'}</h1>
        ${best?`<div class="sub"><span>${ic('clock',18)} Be settled by <b>${fmtT(settle)}</b></span><span>${ic('target',18)} Best ${fmtT(best.start)}–${fmtT(best.end)}</span>${standPick(best.start+HOUR)}</div>`:''}
        <div class="row" style="margin-top:14px"><a href="#stand" style="text-decoration:none"><button class="on">${ic('scope',18)} In the stand</button></a></div>
        ${F.passed?`<div class="small muted" style="margin-top:6px">Tap tomorrow above to plan the next hunt.</div>`:''}
      </div><div class="badge-score"><div class="num">${best?Math.round(best.s):'—'}</div><span>hunt score ${q('score')}</span></div></div>
    </div></section>
    <div class="wrap">
      ${Backup.due()?`<div class="card" style="border:2px solid var(--brassbg)"><div class="hd"><h3>${ic('check')} Back up your data</h3></div>
        <p class="small" style="margin:6px 0 12px">Your rifles, stands and journal are saved only on this phone. ${Backup.daysSince()==null?'You haven\'t saved a backup yet.':`Your last backup was ${Backup.daysSince()} days ago.`} One tap saves a copy to Downloads.</p>
        <div class="row"><button class="brass" data-bk>Download backup</button><button class="ghost" data-bksnooze>Remind me in 3 days</button></div></div>`:''}
      ${this.weekCard()}
      <div class="card" id="stripcard"><div class="hd"><h3>${ic('clock')} Hour by hour</h3><span class="tiny muted">tap a bar</span></div>
        <div class="fig"><svg id="strip" role="img" aria-label="Hunt score for each hour"></svg></div>
        <div class="legend"><span><i class="sw" style="background:var(--brassbg)"></i>Best window</span><span><i class="sw" style="background:var(--green2)"></i>Legal light</span><span><i class="sw" style="background:var(--line)"></i>Not legal ${q('legal')}</span><span><i class="sw" style="background:var(--blaze)"></i>Now</span></div>
        <div class="tiny muted" style="margin-top:6px">${esc(wxNote)}</div></div>
      <div class="grid">
        <div class="card"><div class="hd"><h3>${fmtH(sel.t-HOUR/2)} scores ${sel.score}</h3>${sel.legal?'':'<span class="badge" style="background:var(--ox);color:#fff">not legal</span>'}</div>
          <div class="why">${sel.parts.map(p=>`${ic(FACTOR_ICON[p.k])}<div><div class="row between small"><span>${esc(p.label)}${p.k==='solunar'?' '+q('solunar'):p.k==='pressure'?' '+q('pressure'):''}</span></div><div class="meter"><i style="width:${Math.round(p.v*100)}%"></i></div><div class="tiny muted">${esc(p.why)}</div></div><span class="tiny muted">${Math.round(p.w*100)}%</span>`).join('')}</div>
          ${sel.wx.src==='live'?`<dl class="kv small" style="margin-top:14px"><dt>${ic('temp',16)}Temp</dt><dd>${Math.round(sel.wx.temp)}°F</dd><dt>${ic('wind',16)}Wind</dt><dd>${Math.round(sel.wx.wind)} mph from ${compass(sel.wx.dir)}</dd><dt>${ic('gauge',16)}Pressure</dt><dd>${Math.round(sel.wx.p)} hPa${sel.wx.pTrend!=null?` (${sel.wx.pTrend>0?'+':''}${r1(sel.wx.pTrend)})`:''}</dd><dt>${ic('rain',16)}Rain chance</dt><dd>${sel.wx.prob??'—'}%</dd></dl>`:''}
          <div class="tiny muted" style="margin-top:10px">Percent = how much each factor counts for ${esc(sp.label.toLowerCase())}.</div></div>
        <div class="card" id="dialcard"><div class="hd"><h3>${ic('moon')} Moon and solunar</h3>${q('solunar')}</div>
          <svg id="dial" viewBox="0 0 280 280" style="width:min(100%,280px);display:block;margin:0 auto" role="img" aria-label="24-hour dial with daylight and solunar periods">${Draw.dial(day,280)}</svg>
          <div class="small" style="text-align:center;margin:4px 0 12px"><b>${esc(day.moon.name)}</b> · ${rating} solunar day</div>
          <dl class="kv small">${day.periods.map(p=>`<dt>${p.kind==='major'?'Major (moon '+(p.cause==='over'?'overhead':'underfoot')+')':'Minor (moon'+(p.cause==='rise'?'rise':'set')+')'}</dt><dd>${fmtT(p.start)} – ${fmtT(p.end)}</dd>`).join('')||'<dt>No periods today</dt><dd></dd>'}</dl></div>
        <div class="card"><div class="hd"><h3>${ic('light')} Sun and legal light</h3>${q('legal')}</div><dl class="kv">
          <dt>Legal light starts</dt><dd>${fmtT(day.legalStart)}</dd><dt>Sunrise</dt><dd>${fmtT(day.sunrise)}</dd>
          <dt>Sunset</dt><dd>${fmtT(day.sunset)}</dd><dt>Legal light ends</dt><dd>${fmtT(day.legalEnd)}</dd></dl>
          <div class="warn safety tiny" style="margin-top:12px">Using ${S.legalMin} minutes before sunrise and after sunset. Always check your state's rule.</div></div>
      </div>
      ${st==='live'?'':this.manual()}
    </div>`;
  },
  manual(){ const m=S.manualWx, opt=(k,list)=>`<select data-mw="${k}">${list.map(([v,l])=>`<option value="${v}" ${m[k]===v?'selected':''}>${l}</option>`).join('')}</select>`;
    return `<div class="card"><h3>${ic('cloud')} Conditions at your spot</h3><p class="small muted" style="margin-top:4px">Enter what your weather app says. The score updates right away.</p>
      <div class="f2"><div><label>Temperature (°F)</label><input type="number" inputmode="decimal" data-mw="temp" value="${esc(m.temp)}"></div>
      <div><label>Wind (mph)</label><input type="number" inputmode="decimal" data-mw="wind" value="${esc(m.wind)}"></div>
      <div><label>Wind from ${q('scent')}</label>${opt('dir',DIRS.map(d=>[d,d]))}</div>
      <div><label>Barometer ${q('pressure')}</label>${opt('trend',[['falling','Falling'],['fast','Falling fast'],['steady','Steady'],['rising','Rising']])}</div>
      <div><label>Vs. yesterday</label>${opt('vsYesterday',[['colder','Colder'],['same','About the same'],['warmer','Warmer']])}</div>
      <div><label>Rain</label>${opt('rain',[['none','None'],['light','Light'],['heavy','Heavy']])}</div></div>
      <button style="margin-top:14px" data-retry>Try live weather again</button></div>`; },
  bind(){
    const bk=$('[data-bk]'); if (bk) bk.onclick=()=>{ Backup.download(); go(); };
    const bs=$('[data-bksnooze]'); if (bs) bs.onclick=()=>{ S.backupSnooze=Date.now()+3*DAY; Store.save(); go(); };
    $$('[data-day]').forEach(b=>b.onclick=()=>{ const fromList=!!b.closest('#weekcard'); UIx.dayOff=+b.dataset.day; UIx.hour=null; go(); if (fromList) window.scrollTo({top:0,behavior:calm()?'auto':'smooth'}); });
    $$('[data-mw]').forEach(el=>el.onchange=()=>{ S.manualWx[el.dataset.mw]= el.type==='number'?+el.value:el.value; Store.save(); go(); });
    const rt=$('[data-retry]'); if (rt) rt.onclick=async()=>{ rt.textContent='Trying…'; await Weather.load(true); go(); };
    const s=$('#strip'), F=UIx.F; if (!s) return;
    const draw=()=>{ if (s.clientWidth<60) return; const W=s.clientWidth, H=s.clientHeight, pl=4, pb=22, bw=(W-pl*2)/24, d0=F.day.d0, X=t=>pl+(t-d0)/HOUR*bw, narrow=W<520;
      let g='';
      for (const p of F.day.periods){ const a=Math.max(X(p.start),pl), b=Math.min(X(p.end),W-pl); if (b>a) g+=`<rect x="${a}" y="0" width="${b-a}" height="${H-pb}" fill="var(--brassbg)" opacity="${p.kind==='major'?.16:.08}" rx="4"/>`; }
      F.hours.forEach((h,i)=>{ const bh=Math.max(4,(H-pb-12)*h.score/100), x=pl+i*bw+1.5, inBest=F.best && h.t>F.best.start && h.t<F.best.end;
        g+=`<rect x="${x}" y="${H-pb-bh}" width="${bw-3}" height="${bh}" rx="3" fill="${!h.legal?'var(--line)':inBest?'var(--brassbg)':'var(--green2)'}" ${i===UIx.hour?'stroke="var(--ink)" stroke-width="2.5"':''}><title>${fmtH(h.t-HOUR/2)}: ${h.score}</title></rect>`;
        if (i%(narrow?6:3)===0) g+=`<text x="${x}" y="${H-6}" font-size="12" fill="var(--mute)">${fmtH(h.t-HOUR/2)}</text>`; });
      if (UIx.dayOff===0){ const x=X(Date.now()); g+=`<line x1="${x}" x2="${x}" y1="0" y2="${H-pb}" stroke="var(--blaze)" stroke-width="2.5"/>`; }
      s.innerHTML=g; };
    UIx.ro && UIx.ro.disconnect(); UIx.ro=new ResizeObserver(draw); UIx.ro.observe(s);
    s.onclick=e=>{ const r=s.getBoundingClientRect(); UIx.hour=Math.max(0,Math.min(23,Math.floor((e.clientX-r.left-4)/((r.width-8)/24)))); go(); };
  }
};

