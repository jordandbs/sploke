/* Vue : Statistiques (progression et poids) */
'use strict';
VIEWS.stats=()=>{
  const last=new Map();
  logsDesc().forEach(l=>l.ex.forEach(e=>{if(!last.has(e.exId))last.set(e.exId,e.name||exName(e.exId))}));
  const ids=[...last.keys()];
  if(!ids.includes(ui.stEx))ui.stEx=ids[0]||null;
  let exHtml='';
  if(!ids.length)exHtml=`<div class="empty">Termine ta première séance pour voir la courbe de progression de chaque exercice.</div>`;
  else{
    const hist=exHistory(ui.stEx);
    if(ui.stM==='kg'&&hist.every(h=>h.sets.every(s=>!s.kg)))ui.stM='reps';
    const M=METRICS[ui.stM];
    const pts=hist.map(h=>{const v=M.f(h.sets);return {t:h.ts,v,l:`${fmtD(h.ts,true)} : ${nf(v,1)} ${M.unit} (${h.sets.map(setTxt).join(', ')})`}});
    const first=pts[0],lastp=pts[pts.length-1],ch=pts.length>1&&first.v?((lastp.v-first.v)/first.v*100):null;
    exHtml=`<select data-in="stex" aria-label="Exercice">${ids.map(i=>`<option value="${i}" ${i===ui.stEx?'selected':''}>${esc(last.get(i))}</option>`).join('')}</select>
    <div class="seg" style="margin:10px 0 14px">${Object.entries(METRICS).map(([k,m])=>`<button class="${ui.stM===k?'on':''}" data-a="stm" data-k="${k}">${m.label}</button>`).join('')}</div>
    ${lineChart('ex',pts,{color:'var(--accent)',label:'Progression '+last.get(ui.stEx),zero:ui.stM!=='e1'&&ui.stM!=='kg'})}
    <div class="tiles" style="margin-top:14px;grid-template-columns:repeat(3,1fr)"><div class="tile"><p class="mut sm">Séances</p><div class="v">${hist.length}</div></div><div class="tile"><p class="mut sm">Record</p><div class="v">${nf(Math.max(...pts.map(p=>p.v)),1)}<small> ${M.unit}</small></div></div><div class="tile"><p class="mut sm">Évolution</p><div class="v ${ch>0?'up':ch<0?'dn':''}">${ch==null?'–':(ch>0?'+':'')+nf(ch,0)+' %'}</div></div></div>
    <table style="margin-top:12px"><tr><th>Date</th><th>Séries (kg × reps)</th></tr>${[...hist].reverse().slice(0,8).map(h=>`<tr><td>${esc(fmtD(h.ts,true))}</td><td>${h.sets.map(s=>esc(setTxt(s))).join(' · ')}</td></tr>`).join('')}</table>`;
  }
  const ws=wSorted(),wp=ws.map(w=>({t:w.ts,v:w.kg,l:`${fmtD(w.ts,true)} : ${nf(w.kg)} kg`}));
  const d=ws.length>1?ws[ws.length-1].kg-ws[0].kg:null;
  return `<div class="top"><h1>Statistiques</h1></div>
  <section class="card"><h2>Progression en musculation</h2>${exHtml}</section>
  <section class="card"><h2>Évolution du poids corporel</h2>
    ${lineChart('bw',wp,{color:'#7aa2ff',label:'Poids corporel',empty:'Ajoute ton poids pour suivre ton évolution.'})}
    ${ws.length?`<div class="tiles" style="margin-top:14px;grid-template-columns:repeat(3,1fr)"><div class="tile"><p class="mut sm">Début</p><div class="v">${nf(ws[0].kg)}<small> kg</small></div></div><div class="tile"><p class="mut sm">Actuel</p><div class="v">${nf(ws[ws.length-1].kg)}<small> kg</small></div></div><div class="tile"><p class="mut sm">Écart</p><div class="v ${d>0?'up':d<0?'dn':''}">${d==null?'–':(d>0?'+':'')+nf(d)}<small> kg</small></div></div></div>`:''}
    <div class="row" style="margin-top:14px;align-items:flex-end"><div class="sp"><label for="wKg" style="margin-top:0">Nouveau poids (kg)</label><input id="wKg" inputmode="decimal" placeholder="${ws.length?nf(ws[ws.length-1].kg):'70'}"></div><div class="sp"><label for="wDate" style="margin-top:0">Date</label><input id="wDate" type="date" value="${isoDay(Date.now())}" max="${isoDay(Date.now())}"></div></div>
    <button class="btn primary block" style="margin-top:10px" data-a="addw">Enregistrer la mesure</button>
  </section>`;
};

