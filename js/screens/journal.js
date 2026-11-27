/* ===== Hunt journal ===== */
Screens.journal = { label:'Journal',
  snapshot(t,standId){
    const st=S.stands.find(x=>x.id===standId), lat=st&&st.lat?st.lat:S.location.lat, lon=st&&st.lon?st.lon:S.location.lon;
    const d=new Date(t); d.setHours(0,0,0,0); const day=Astro.day(d.getTime(),lat,lon,S.legalMin,CONFIG.solunar);
    const wx=Weather.at(t), sp=CONFIG.species[S.species]||CONFIG.species.deer, hs=huntScore({t,day,...wx},sp);
    const sol=hs.parts.find(p=>p.k==='solunar'), lt=hs.parts.find(p=>p.k==='light');
    return {score:hs.score, wind:wx.wind, dir:wx.dir!=null?compass(wx.dir):null, temp:wx.temp, pTrend:wx.pTrend, wxSrc:wx.src,
      inSol:sol?sol.v>=.75:false, edge:lt?lt.v>=.7:false, moon:day.moon.name};
  },
  patterns(){
    const L=S.log; if (L.length<3) return '';
    const groups=[
      ['Wind direction', e=>e.dir],
      ['Stand', e=>e.standName],
      ['Barometer', e=>e.pTrend==null?null:e.pTrend<=-.6?'falling':e.pTrend>=.6?'rising':'steady'],
      ['Solunar', e=>e.inSol?'in a period':'between periods'],
      ['Time of day', e=>e.edge?'dawn or dusk':'midday']];
    const rows=groups.map(([name,fn])=>{ const m={}; for (const e of L){ const k=fn(e); if (k==null||k==='') continue; (m[k]=m[k]||[]).push(+e.seen||0); }
      const list=Object.entries(m).map(([k,v])=>({k,n:v.length,avg:v.reduce((a,b)=>a+b,0)/v.length})).sort((a,b)=>b.avg-a.avg);
      if (list.length<2) return ''; const max=Math.max(...list.map(x=>x.avg),1);
      return `<h3 style="font-size:17px;margin:14px 0 6px">${name}</h3>${list.map(x=>`<div class="why" style="grid-template-columns:7.5em minmax(0,1fr) 5.5em;margin-bottom:4px"><span class="small">${esc(x.k)}</span><div class="meter"><i style="width:${Math.round(x.avg/max*100)}%;background:var(--brassbg)"></i></div><span class="tiny muted">${r1(x.avg)} seen · ${x.n} sit${x.n>1?'s':''}</span></div>`).join('')}`; }).join('');
    return rows?`<div class="card"><h3>${ic('book')} What's working for you</h3><p class="small muted" style="margin:4px 0 0">Average animals seen per sit. More sits make this more trustworthy.</p>${rows}</div>`:'';
  },
  render(){
    const L=[...S.log].sort((a,b)=>b.t-a.t), seen=L.reduce((a,e)=>a+(+e.seen||0),0), kills=L.filter(e=>e.harvest).length;
    return `<div class="wrap"><div class="row between"><h1>Hunt journal</h1><button class="brass" id="logbtn" data-log>${ic('plus',18)} Log a sit</button></div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0"><div class="card" style="margin:0;text-align:center"><div class="big">${L.length}</div><div class="small muted">sits</div></div><div class="card" style="margin:0;text-align:center"><div class="big">${L.length?r1(seen/L.length):'0'}</div><div class="small muted">seen per sit</div></div><div class="card" style="margin:0;text-align:center"><div class="big">${kills}</div><div class="small muted">harvested</div></div></div>
      ${this.patterns() || `<p class="small muted">${L.length<3?'Log three sits and Treeline starts showing which winds, stands and conditions produce for you.':'Patterns show up once your sits differ in wind, stand, barometer or time of day.'}</p>`}
      ${L.map(e=>`<div class="card"><div class="hd"><div><h3>${new Date(e.t).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'})} · ${fmtT(e.t)}</h3><div class="small muted">${esc(e.standName||S.location.name)}${e.hours?` · ${e.hours} h`:''}</div></div>${e.harvest?'<span class="badge">Harvest</span>':''}</div>
        <div class="small" style="margin-top:6px"><b>${+e.seen||0}</b> seen · score ${e.score} · ${e.dir?`${Math.round(e.wind)} mph ${e.dir}`:''} · ${e.temp!=null?Math.round(e.temp)+'°F':''} · ${esc(e.moon||'')}</div>
        ${e.notes?`<p class="small muted" style="margin:6px 0 0">${esc(e.notes)}</p>`:''}<div class="row" style="margin-top:8px"><button class="ghost" data-dlog="${e.id}">Delete</button></div></div>`).join('')}</div>`;
  },
  add(){
    const now=new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset()); const local=now.toISOString().slice(0,16);
    const box=openSheet(`<div class="hd"><h2>Log a sit</h2><button class="ghost" data-x>Close</button></div>
      <label for="lg_t">When you started</label><input id="lg_t" type="datetime-local" value="${local}">
      <label for="lg_s">Stand</label><select id="lg_s"><option value="">${esc(S.location.name)}</option>${S.stands.map(st=>`<option value="${st.id}" ${st.id===S.activeStandId?'selected':''}>${esc(st.name)}</option>`).join('')}</select>
      <div class="f2"><div><label for="lg_h">Hours sat</label><input id="lg_h" type="number" step=".5" inputmode="decimal" value="3"></div><div><label for="lg_n">Animals seen</label><input id="lg_n" type="number" inputmode="decimal" value="0"></div></div>
      <label><input type="checkbox" id="lg_k" style="width:22px;min-height:22px"> Harvested</label>
      <label for="lg_no">Notes</label><textarea id="lg_no" placeholder="Two does came in from the creek at 6:50"></textarea>
      <p class="tiny muted">Wind, temperature, barometer, moon and hunt score are filled in automatically from the forecast for that time.</p>
      <button class="pri wide" data-savelog>Save sit</button>`);
    box.querySelector('[data-savelog]').onclick=()=>{ const t=new Date(box.querySelector('#lg_t').value).getTime()||Date.now(), sid=box.querySelector('#lg_s').value, st=S.stands.find(x=>x.id===sid);
      S.log.push({id:uid(), t, standId:sid||null, standName:st?st.name:S.location.name, hours:+box.querySelector('#lg_h').value||'', seen:+box.querySelector('#lg_n').value||0,
        harvest:box.querySelector('#lg_k').checked, notes:box.querySelector('#lg_no').value, ...this.snapshot(t,sid)});
      Store.save(); box.remove(); toast('Sit logged'); go(); };
  },
  bind(){
    $$('[data-log]').forEach(b=>b.onclick=()=>this.add());
    $$('[data-dlog]').forEach(b=>b.onclick=()=>{ if (!b.dataset.sure){ b.dataset.sure=1; b.textContent='Tap again to delete'; return; } S.log=S.log.filter(e=>e.id!==b.dataset.dlog); Store.save(); go(); });
  }
};

