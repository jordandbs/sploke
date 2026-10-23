/* Vue : Bibliothèque d’exercices (fiches, vidéos YouTube, création) */
'use strict';
const LIB={q:'',m:'',e:'',t:'',fav:false};
const libList=()=>{const q=nz(LIB.q.trim());
  return S.exercises.filter(x=>(!q||nz(x.name+' '+x.muscle+' '+x.equip+' '+x.desc).includes(q))&&(!LIB.m||x.muscle===LIB.m)&&(!LIB.e||x.equip===LIB.e)&&(!LIB.t||x.type===LIB.t)&&(!LIB.fav||x.fav)).sort((a,b)=>a.name.localeCompare(b.name,'fr'))};
const libHtml=()=>{const r=libList();return `<p class="mut sm" style="margin:12px 0 8px">${r.length} exercice${r.length>1?'s':''}</p>`+(r.length?`<div class="exgrid">${r.map(x=>`<div class="exr" style="padding:0"><button class="row sp" data-a="exopen" data-id="${x.id}" style="padding:12px 0 12px 14px;text-align:left"><span class="sp"><span class="nm">${esc(x.name)}</span><br><span class="tags" style="margin-top:5px"><span class="tag">${esc(x.muscle)}</span><span class="tag">${esc(x.equip)}</span><span class="tag">${esc(x.type)}</span></span></span>${x.video?`<span class="mut">${ic('video')}</span>`:''}</button><button class="ib ${x.fav?'on':''}" data-a="fav" data-id="${x.id}" aria-label="Favori" style="margin-right:4px">${ic('star',x.fav?'fill':'')}</button></div>`).join('')}</div>`:'<div class="empty">Aucun exercice ne correspond. Modifie les filtres ou crée ton propre exercice.</div>')};
VIEWS.lib=()=>{
  const opt=(arr,v,l)=>`<option value="">${l}</option>`+arr.map(a=>`<option ${v===a?'selected':''}>${a}</option>`).join('');
  return `<div class="top"><h1>Exercices</h1><button class="btn primary s" data-a="newex">${ic('plus')}Créer</button></div>
  <div class="sbox" style="margin-top:10px"><span>${ic('search')}</span><input data-in="libq" placeholder="Rechercher un exercice" value="${esc(LIB.q)}" autocomplete="off"></div>
  <div class="filters"><select data-in="libm" aria-label="Groupe musculaire">${opt(MUSCLES,LIB.m,'Muscle')}</select><select data-in="libe" aria-label="Matériel">${opt(EQUIPS,LIB.e,'Matériel')}</select><select data-in="libt" aria-label="Type">${opt(TYPES,LIB.t,'Type')}</select></div>
  <div class="chips" style="margin-top:8px"><button class="chip ${LIB.fav?'on':''}" data-a="libfav">${ic('star',LIB.fav?'fill':'')}Favoris</button></div>
  <div id="liblist">${libHtml()}</div>`;
};
function vidId(u){
  u=String(u||'').trim();if(!u)return '';
  if(/^[\w-]{11}$/.test(u))return u;
  const m=u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
  return m?m[1]:'';
}
function videoBlock(x){
  const id=vidId(x.video);
  const q=encodeURIComponent(x.name+' technique exécution');
  if(id)return `<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1" title="Démonstration : ${esc(x.name)}" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
   <p class="sm mut">La vidéo ne se lit pas ? <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Ouvrir sur YouTube</a></p>`;
  return `<div class="novid"><p><b>Pas encore de vidéo</b></p><p class="sm mut" style="margin:4px 0 10px">Trouve une démonstration, copie son lien YouTube puis colle-le ici.</p>
   <a class="btn s block" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">${ic('ext')}Chercher sur YouTube</a>
   <div class="row" style="margin-top:10px"><input id="vidIn" placeholder="https://youtu.be/…" inputmode="url" autocapitalize="off" autocorrect="off"><button class="btn primary s" data-a="savevid" data-id="${x.id}">Intégrer</button></div></div>`;
}
function openExercise(id){
  const x=exById(id);if(!x)return;
  const el=modal('',{h:{
    savevid(b){const v=vidId($('#vidIn',el).value);if(!v)return toast('Lien YouTube invalide');x.video='https://youtu.be/'+v;save();paint();if(tab==='lib')$('#liblist').innerHTML=libHtml()},
    favx(){x.fav=!x.fav;save();paint();refreshLib()},
    addto(){chooseWorkout(x.id)},
    editx(){closeModal(el);exForm(x.id)}
  }});
  const paint=()=>{el.firstChild.innerHTML=head(esc(x.name))+`<div class="tags"><span class="tag">${esc(x.muscle)}</span><span class="tag">${esc(x.equip)}</span><span class="tag">${esc(x.type)}</span></div>
   <p style="margin-top:12px">${esc(x.desc)||'<span class="mut">Pas de description.</span>'}</p>${videoBlock(x)}
   <button class="btn primary block" data-a="addto" style="margin-top:12px">${ic('plus')}Ajouter à une séance</button>
   <div class="grid2" style="margin-top:10px"><button class="btn" data-a="favx">${ic('star',x.fav?'fill':'')}${x.fav?'Retirer des favoris':'Favori'}</button><button class="btn" data-a="editx">${ic('edit')}Modifier</button></div>`};
  paint();
}
function refreshLib(){if(tab==='lib'){const l=$('#liblist');if(l)l.innerHTML=libHtml()}}
function chooseWorkout(exId){
  const el=modal(head('Ajouter à quelle séance ?')+(S.workouts.length?S.workouts.map(w=>`<button class="exr" data-a="cw" data-id="${w.id}" style="border-left:6px solid ${w.color}"><span class="sp nm">${esc(w.name)}</span><span class="mut sm">${w.items.length} exo${w.items.length>1?'s':''}</span></button>`).join(''):'')+
   `<button class="btn block" style="margin-top:12px" data-a="cwn">${ic('plus')}Nouvelle séance</button>`,{h:{
    cw(b){const w=woById(b.dataset.id);if(w.items.some(i=>i.exId===exId)){toast('Déjà dans '+w.name);return}
      w.items.push({exId,sets:3,reps:10});save();closeModal(el);toast('Ajouté à '+w.name);render()},
    cwn(){const w={id:'w_'+uid(),name:'Nouvelle séance',color:COLORS[S.workouts.length%COLORS.length],items:[{exId,sets:3,reps:10}]};S.workouts.push(w);save();closeModal(el);openEditor(w.id)}
  }});
}
function exForm(id){
  const x=id?exById(id):{name:'',muscle:MUSCLES[0],equip:EQUIPS[0],type:TYPES[0],desc:'',video:''};
  const sel=(arr,v,i)=>`<select id="${i}">${arr.map(a=>`<option ${a===v?'selected':''}>${a}</option>`).join('')}</select>`;
  const el=modal(head(id?'Modifier l’exercice':'Nouvel exercice')+`
   <label for="fN">Nom</label><input id="fN" value="${esc(x.name)}" maxlength="60">
   <div class="grid2"><div><label for="fM">Muscle</label>${sel(MUSCLES,x.muscle,'fM')}</div><div><label for="fE">Matériel</label>${sel(EQUIPS,x.equip,'fE')}</div></div>
   <label for="fT">Type</label>${sel(TYPES,x.type,'fT')}
   <label for="fD">Description</label><textarea id="fD" maxlength="500">${esc(x.desc)}</textarea>
   <label for="fV">Lien YouTube (facultatif)</label><input id="fV" value="${esc(x.video)}" placeholder="https://youtu.be/…" inputmode="url" autocapitalize="off" autocorrect="off">
   <div class="btns">${id&&x.custom?'<button class="btn danger" data-a="del">Supprimer</button>':''}<button class="btn primary" data-a="save">Enregistrer</button></div>`,{h:{
    save(){
      const n=$('#fN',el).value.trim();if(!n)return toast('Donne un nom à l’exercice');
      const v=$('#fV',el).value.trim();if(v&&!vidId(v))return toast('Lien YouTube invalide');
      const o=id?x:{id:'c_'+uid(),custom:true,fav:false};
      Object.assign(o,{name:n,muscle:$('#fM',el).value,equip:$('#fE',el).value,type:$('#fT',el).value,desc:$('#fD',el).value.trim(),video:v?'https://youtu.be/'+vidId(v):''});
      if(!id)S.exercises.push(o);save();closeModal(el);render();if(sessEl)renderSession();toast('Exercice enregistré');
    },
    async del(){
      const used=S.workouts.filter(w=>w.items.some(i=>i.exId===id)).length;
      if(!await ask(used?`Cet exercice est utilisé dans ${used} séance(s). Il en sera retiré. Ton historique reste conservé. Supprimer ?`:'Supprimer cet exercice ? Ton historique reste conservé.','Supprimer',true))return;
      S.exercises=S.exercises.filter(e=>e.id!==id);S.workouts.forEach(w=>w.items=w.items.filter(i=>i.exId!==id));save();closeModal(el);render();
    }
  }});
}

