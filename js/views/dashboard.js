/* Vue : Tableau de bord */
'use strict';
const bmiLbl=b=>b<18.5?'Maigreur':b<25?'Corpulence normale':b<30?'Surpoids':'Obésité';
VIEWS.dash=()=>{
  const ws=wSorted(),w=ws[ws.length-1],f=ws[0],h=S.profile.height;
  const bmi=w&&h?w.kg/Math.pow(h/100,2):null;
  const dl=w&&ws.length>1?w.kg-f.kg:null;
  const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);
  const wk=S.logs.filter(l=>l.start>=d.getTime()).length;
  const logs=logsDesc().slice(0,5);
  const seen=new Set(),perfs=[];
  for(const l of logsDesc()){for(const e of l.ex){if(seen.has(e.exId)||!e.sets.length)continue;seen.add(e.exId);
    const prev=lastPerf(e.exId,l.start);perfs.push({e,l,b:bestSet(e.sets),pb:prev?bestSet(prev.sets):null})}
    if(perfs.length>=5)break}
  const a=S.active,aw=a&&woById(a.workoutId);
  return `
  <div class="top"><div><p class="mut">${esc(fmtDL(Date.now()))}</p><h1>Salut${S.profile.name?' '+esc(S.profile.name):''}</h1></div></div>
  ${a?`<button class="banner" data-a="resume" style="--wc:${aw?aw.color:'var(--tx)'}"><span class="dot"></span><span class="sp"><b>Séance en cours : ${esc(a.name)}</b><br><span class="mut sm" id="bchrono">${mmss((Date.now()-a.startedAt)/1000)}</span></span><span class="btn primary s">Reprendre</span></button>`:''}
  <section><h2>Démarrer un entraînement</h2>
    <div class="qs">${S.workouts.map(w=>`<button data-a="start" data-id="${w.id}" style="--wc:${w.color}"><b>${esc(w.name)}</b><span class="mut sm">${w.items.length?w.items.length+' exercice'+(w.items.length>1?'s':''):'Aucun exercice'}</span></button>`).join('')}
    <button data-a="newwo" style="--wc:var(--line)"><b>${ic('plus')}</b><span class="mut sm">Nouvelle séance</span></button></div>
  </section>
  <section class="tiles">
    <div class="tile"><p class="mut sm">Poids actuel</p><div class="v">${w?nf(w.kg)+' <small>kg</small>':'–'}</div>${dl!=null?`<p class="sm ${dl>0?'up':dl<0?'dn':'mut'}">${dl>0?'+':''}${nf(dl)} kg depuis le début</p>`:`<p class="sm mut">${w?fmtD(w.ts,true):'Ajoute ton poids'}</p>`}</div>
    <div class="tile"><p class="mut sm">Taille</p><div class="v">${h?h+' <small>cm</small>':'–'}</div><p class="sm mut">${bmi?'IMC '+nf(bmi)+' · '+bmiLbl(bmi):'Renseigne ta taille'}</p></div>
    <div class="tile"><p class="mut sm">Cette semaine</p><div class="v">${wk} <small>séance${wk>1?'s':''}</small></div><p class="sm mut">depuis lundi</p></div>
    <div class="tile"><p class="mut sm">Au total</p><div class="v">${S.logs.length} <small>séance${S.logs.length>1?'s':''}</small></div><p class="sm mut">${S.logs.length?'dernière le '+fmtD(logs[0].start):'à lancer'}</p></div>
  </section>
  ${ws.length>1?`<section class="card"><div class="row"><h2 class="sp" style="margin:0">Évolution du poids</h2><button class="btn s ghost" data-a="go" data-t="stats">Détails</button></div>${spark(ws.map(x=>({t:x.ts,v:x.kg})),'#7aa2ff')}</section>`:''}
  <section><h2>Dernières séances</h2>
    ${logs.length?`<div class="card list" style="padding:4px 14px">${logs.map(l=>{const w=woById(l.workoutId);return `<button class="li" data-a="logopen" data-id="${l.id}" style="--wc:${w?w.color:'var(--mut)'}"><span class="bar"></span><span class="sp"><b>${esc(l.name)}</b><br><span class="mut sm">${esc(fmtD(l.start,true))}</span></span><span class="sm mut" style="text-align:right">${durLbl(l.duration)}<br>${nf(logVolume(l),0)} kg</span></button>`}).join('')}</div>`:`<div class="empty">Aucune séance enregistrée. Lance un entraînement ci-dessus pour commencer ton historique.</div>`}
  </section>
  <section><h2>Performances récentes</h2>
    ${perfs.length?`<div class="card list" style="padding:4px 14px">${perfs.map(p=>{const dk=p.pb?p.b.kg-p.pb.kg:null,dr=p.pb?p.b.reps-p.pb.reps:null;
      const bd=!p.pb?'<span class="badge">Nouveau</span>':dk>0||(dk===0&&dr>0)?`<span class="badge up">${dk>0?'+'+nf(dk,2)+' kg':'+'+dr+' rep'+(dr>1?'s':'')}</span>`:dk<0||dr<0?`<span class="badge dn">${dk<0?nf(dk,2)+' kg':dr+' rep'+(dr<-1?'s':'')}</span>`:'<span class="badge">Stable</span>';
      return `<div class="li"><span class="sp"><b>${esc(exName(p.e.exId,p.e.name))}</b><br><span class="mut sm">${esc(fmtD(p.l.start))}</span></span><span>${esc(setTxt(p.b))}</span>${bd}</div>`}).join('')}</div>`:`<div class="empty">Tes meilleures séries apparaîtront ici après ta première séance.</div>`}
  </section>`;
};

