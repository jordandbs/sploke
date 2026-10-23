/* Vue : Séances, éditeur de séance et sélecteur d’exercice */
'use strict';
VIEWS.wo=()=>`
  <div class="top"><h1>Séances</h1><button class="btn primary s" data-a="newwo">${ic('plus')}Nouvelle</button></div>
  <p class="mut">Modifie les séances à ta guise : ajoute, retire, remplace et réorganise les exercices.</p>
  ${S.active?`<button class="banner" data-a="resume" style="--wc:${(woById(S.active.workoutId)||{color:'var(--tx)'}).color}"><span class="dot"></span><span class="sp"><b>Séance en cours : ${esc(S.active.name)}</b></span><span class="btn primary s">Reprendre</span></button>`:''}
  <section style="margin-top:16px">${S.workouts.length?S.workouts.map(w=>`
    <div class="card wcard" style="--wc:${w.color}"><div class="row"><h2 class="sp" style="margin:0">${esc(w.name)}</h2>
      <button class="ib" data-a="dupwo" data-id="${w.id}" aria-label="Dupliquer">${ic('copy')}</button>
      <button class="ib dng" data-a="delwo" data-id="${w.id}" aria-label="Supprimer">${ic('trash')}</button></div>
      <div class="exl">${w.items.length?w.items.map(it=>`<div><span>${esc(exName(it.exId))}</span><span class="mut">${it.sets} × ${it.reps}</span></div>`).join(''):'<span class="mut sm">Aucun exercice pour le moment. Ajoute-en depuis la bibliothèque.</span>'}</div>
      <div class="row"><button class="btn primary sp" data-a="start" data-id="${w.id}" ${w.items.length?'':'disabled'}>${ic('play','fill')}Lancer</button><button class="btn" data-a="editwo" data-id="${w.id}">${ic('edit')}Modifier</button></div>
    </div>`).join(''):'<div class="empty">Aucune séance. Crée la première.</div>'}</section>`;

let ED=null;
function openEditor(id){
  const w=id?woById(id):null;
  ED=w?JSON.parse(JSON.stringify(w)):{id:null,name:'',color:COLORS[S.workouts.length%COLORS.length],items:[]};
  const el=modal('',{h:{
    save(){
      ED.name=ED.name.trim();if(!ED.name)return toast('Donne un nom à la séance');
      if(ED.id){const i=S.workouts.findIndex(x=>x.id===ED.id);S.workouts[i]=ED}else{ED.id='w_'+uid();S.workouts.push(ED)}
      save();closeModal(el);render();toast('Séance enregistrée');
    },
    edcol(b){ED.color=b.dataset.c;paint()},
    edmv(b){const i=+b.dataset.i,j=i+(+b.dataset.d);if(j<0||j>=ED.items.length)return;[ED.items[i],ED.items[j]]=[ED.items[j],ED.items[i]];paint()},
    edrm(b){ED.items.splice(+b.dataset.i,1);paint()},
    edn(b){const it=ED.items[+b.dataset.i],k=b.dataset.k;it[k]=Math.max(1,Math.min(k==='sets'?12:100,it[k]+(+b.dataset.d)));paint()},
    edsw(b){const i=+b.dataset.i;pickExercise(id=>{ED.items[i].exId=id;paint()},'Remplacer l’exercice')},
    edadd(){pickExercise(id=>{ED.items.push({exId:id,sets:3,reps:10});paint()},'Ajouter un exercice')}
  }});
  const paint=()=>{
    const sc=el.firstChild.scrollTop;
    el.firstChild.innerHTML=head(ED.id?'Modifier la séance':'Nouvelle séance')+`
    <label for="edn">Nom</label><input id="edn" data-in="edname" value="${esc(ED.name)}" placeholder="Ex. Push, Haut du corps…" maxlength="40">
    <label>Couleur</label><div class="row" style="gap:10px">${COLORS.map(c=>`<button class="swatch ${ED.color===c?'on':''}" style="--c:${c}" data-a="edcol" data-c="${c}" aria-label="Couleur"></button>`).join('')}</div>
    <label>Exercices</label>
    ${ED.items.length?ED.items.map((it,i)=>{const x=exById(it.exId);return `<div class="edit-it">
      <div style="display:flex;flex-direction:column"><button class="ib" style="height:30px" data-a="edmv" data-i="${i}" data-d="-1" aria-label="Monter">${ic('up')}</button><button class="ib" style="height:30px" data-a="edmv" data-i="${i}" data-d="1" aria-label="Descendre">${ic('down')}</button></div>
      <div style="min-width:0"><b>${esc(x?x.name:'Exercice supprimé')}</b><br><span class="mut sm">${esc(x?x.muscle:'À remplacer')}</span></div>
      <div class="row" style="gap:2px"><button class="ib" data-a="edsw" data-i="${i}" aria-label="Remplacer">${ic('swap')}</button><button class="ib dng" data-a="edrm" data-i="${i}" aria-label="Retirer">${ic('trash')}</button></div>
      <span></span><div class="row" style="gap:10px;flex-wrap:wrap">
        <div class="step"><button class="ib" data-a="edn" data-i="${i}" data-k="sets" data-d="-1">${ic('minus')}</button><b>${it.sets}</b><button class="ib" data-a="edn" data-i="${i}" data-k="sets" data-d="1">${ic('plus')}</button></div><span class="mut sm">séries</span>
        <div class="step"><button class="ib" data-a="edn" data-i="${i}" data-k="reps" data-d="-1">${ic('minus')}</button><b>${it.reps}</b><button class="ib" data-a="edn" data-i="${i}" data-k="reps" data-d="1">${ic('plus')}</button></div><span class="mut sm">reps</span></div><span></span>
    </div>`}).join(''):'<div class="empty">Aucun exercice. Ajoute-en depuis la bibliothèque.</div>'}
    <button class="btn block" style="margin-top:12px" data-a="edadd">${ic('plus')}Ajouter un exercice</button>
    <div class="btns"><button class="btn" data-a="close">Annuler</button><button class="btn primary" data-a="save">Enregistrer</button></div>`;
    el.firstChild.scrollTop=sc;
  };
  paint();
}


function pickExercise(cb,title='Choisir un exercice'){
  const L={q:'',m:''};
  const el=modal('',{h:{pick(b){closeModal(el);cb(b.dataset.id)},pkm(b){L.m=L.m===b.dataset.m?'':b.dataset.m;paint()}}});
  const list=()=>{const q=nz(L.q);const r=S.exercises.filter(x=>(!q||nz(x.name+' '+x.muscle).includes(q))&&(!L.m||x.muscle===L.m)).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
    return r.length?r.map(x=>`<button class="exr" data-a="pick" data-id="${x.id}"><span class="sp"><span class="nm">${esc(x.name)}</span><br><span class="mut sm">${esc(x.muscle)} · ${esc(x.equip)}</span></span>${x.fav?`<span class="ib on">${ic('star','fill')}</span>`:''}</button>`).join(''):'<div class="empty">Aucun exercice trouvé.</div>'};
  el._list=()=>{$('#pkl',el).innerHTML=list()};
  const paint=()=>{el.firstChild.innerHTML=head(esc(title))+`<div class="sbox"><span>${ic('search')}</span><input id="pkq" data-in="pkq" placeholder="Rechercher" value="${esc(L.q)}" autocomplete="off"></div>
    <div class="chips" style="margin-top:8px">${MUSCLES.map(m=>`<button class="chip ${L.m===m?'on':''}" data-a="pkm" data-m="${m}">${m}</button>`).join('')}</div><div id="pkl">${list()}</div>`};
  el._L=L;paint();
}

