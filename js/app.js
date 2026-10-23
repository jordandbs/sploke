/* Actions, événements et démarrage */
'use strict';
const A={
  close(b){closeModal(b.closest('.modal'))},
  go(b){const t=b.dataset.t;if(location.hash==='#'+t)render();else location.hash=t},
  start(b){startWorkout(b.dataset.id)},
  resume(){openSession()},
  newwo(){openEditor(null)},
  editwo(b){openEditor(b.dataset.id)},
  dupwo(b){const w=woById(b.dataset.id),c=JSON.parse(JSON.stringify(w));c.id='w_'+uid();c.name+=' (copie)';S.workouts.push(c);save();render();toast('Séance dupliquée')},
  async delwo(b){const w=woById(b.dataset.id);if(await ask(`Supprimer la séance « ${w.name} » ? Ton historique reste conservé.`,'Supprimer',true)){S.workouts=S.workouts.filter(x=>x.id!==w.id);save();render()}},
  logopen(b){const l=S.logs.find(x=>x.id===b.dataset.id);if(l)logModal(l,false)},
  exopen(b){openExercise(b.dataset.id)},
  fav(b){const x=exById(b.dataset.id);x.fav=!x.fav;save();refreshLib()},
  libfav(){LIB.fav=!LIB.fav;render()},
  newex(){exForm(null)},
  pt(b){const id=b.dataset.cid,c=$('#cap-'+id);if(c)c.textContent=b.dataset.cap;
    $$('circle.pt[data-id="'+id+'"]').forEach(x=>x.classList.remove('sel'));const p=b.previousElementSibling;if(p)p.classList.add('sel')},
  stm(b){ui.stM=b.dataset.k;render()},
  addw(){if(readWeightForm()){render();toast('Mesure enregistrée')}},
  editw(b){weightModal(b.dataset.id)},
  async delw(b){if(await ask('Supprimer cette mesure de poids ?','Supprimer',true)){S.weights=S.weights.filter(w=>w.id!==b.dataset.id);save();render()}},
  export(){
    const blob=new Blob([JSON.stringify(Object.assign({},S,{sync:undefined,active:null}),null,1)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download='muscu-sauvegarde-'+isoDay(Date.now())+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
  },
  import(){$('#impFile').click()},
  async restore(){
    if(!await ask('Remettre les exercices par défaut manquants et les séances Push, Pull et Legs d’origine ? Tes autres séances et ton historique sont conservés.','Restaurer'))return;
    DEFAULT_EX.forEach(d=>{if(!exById(d.id))S.exercises.push(JSON.parse(JSON.stringify(d)))});
    DEFAULT_WO().forEach(d=>{const i=S.workouts.findIndex(w=>w.id===d.id);if(i>=0)S.workouts[i]=d;else S.workouts.push(d)});
    save();render();toast('Données par défaut restaurées');
  },
  async wipe(){
    if(!await ask('Effacer définitivement toutes les données de cet appareil (profil, séances, historique, poids) ? Les données de ton compte en ligne ne sont pas touchées.','Tout effacer',true))return;
    if(!await ask('Dernière confirmation : cette action est irréversible.','Oui, tout effacer',true))return;
    try{localStorage.removeItem(KEY)}catch(e){}S=fresh();closeSession();render();onboarding();
  },
  /* séance en cours */
  smin(){closeSession();render()},
  sfin(){finishSession()},
  svid(b){openExercise(b.dataset.id)},
  sdone(b){
    ensureAudio();const a=S.active,x=a.exs[+b.dataset.e],s=x.sets[+b.dataset.s];
    if(s.done){s.done=false}
    else{
      if(!(num(s.reps)>0)){toast('Indique les répétitions effectuées');return}
      if(s.kg===''||isNaN(num(s.kg)))s.kg='0';
      s.done=true;
      if(S.settings.autoRest&&curSet()){R.end=Date.now()+R.dur*1000;R.left=null}
      else if(!curSet()){R.end=null;R.left=null;toast('Toutes les séries sont faites. Tu peux terminer la séance.')}
    }
    save();renderSession();
    const c=$('.srow.cur',sessEl);if(c&&!s.done)c.scrollIntoView({block:'center',behavior:'smooth'});
  },
  saddset(b){const x=S.active.exs[+b.dataset.e],l=x.sets[x.sets.length-1];x.sets.push({kg:l?l.kg:'',reps:l?l.reps:'',done:false});save();renderSession()},
  srmset(b){const x=S.active.exs[+b.dataset.e];if(x.sets.length>1){x.sets.pop();save();renderSession()}},
  async sdelx(b){const x=S.active.exs[+b.dataset.e];if(x.sets.some(s=>s.done)&&!await ask('Retirer cet exercice ? Les séries déjà validées seront perdues.','Retirer',true))return;S.active.exs.splice(+b.dataset.e,1);save();renderSession()},
  saddex(){pickExercise(id=>{S.active.exs.push(makeSx(id,3,10));save();renderSession();$('#sbody').scrollTo({top:1e6,behavior:'smooth'})},'Ajouter à la séance')},
  rtoggle(){R.end?restPause():restStart()},
  rreset(){restReset()},
  rplus(){if(R.end)R.end+=15000;else if(R.left!=null&&R.left>0)R.left+=15000;else R.dur+=15;paintRest()},
  rminus(){if(R.end)R.end=Math.max(Date.now()+1000,R.end-15000);else if(R.left!=null&&R.left>15000)R.left-=15000;else R.dur=Math.max(15,R.dur-15);paintRest()},
  rdur(b){R.dur=+b.dataset.s;S.settings.rest=R.dur;save();restReset()},
  rnext(){restReset();const c=$('.srow.cur',sessEl);if(c){c.scrollIntoView({block:'center',behavior:'smooth'});const i=$('input',c);if(i)i.focus({preventScroll:true})}}
};
Object.assign(A,CLOUD_ACTIONS);
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;
  ensureAudio();
  const m=b.closest('.modal'),a=b.dataset.a,h=(m&&m._h&&m._h[a])||A[a];
  if(h)h(b,e);
});

/* saisie */
const INP={
  sk(el){S.active.exs[+el.dataset.e].sets[+el.dataset.s].kg=el.value;save()},
  sr(el){S.active.exs[+el.dataset.e].sets[+el.dataset.s].reps=el.value;save()},
  edname(el){ED.name=el.value},
  pkq(el){const m=el.closest('.modal');m._L.q=el.value;m._list()},
  libq(el){LIB.q=el.value;refreshLib()},
  libm(el){LIB.m=el.value;refreshLib()},libe(el){LIB.e=el.value;refreshLib()},libt(el){LIB.t=el.value;refreshLib()},
  stex(el){ui.stEx=el.value;render()}
};
document.addEventListener('input',e=>{const el=e.target,k=el.dataset&&el.dataset.in;if(k&&INP[k])INP[k](el)});
const CH={
  name(el){S.profile.name=el.value.trim();save();toast('Enregistré')},
  height(el){const h=num(el.value);if(!(h>=100&&h<=250)){toast('Taille invalide (100 à 250 cm)');el.value=S.profile.height||'';return}S.profile.height=Math.round(h);save();render();toast('Taille enregistrée')},
  rest(el){S.settings.rest=+el.value;R.dur=S.settings.rest;save();toast('Enregistré')},
  auto(el){S.settings.autoRest=el.checked;save()}
};
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset&&el.dataset.ch&&CH[el.dataset.ch])CH[el.dataset.ch](el);
  if(el.id==='impFile'&&el.files[0]){
    const f=el.files[0],r=new FileReader();
    r.onload=async()=>{
      try{const d=JSON.parse(r.result);if(!d||!Array.isArray(d.exercises)||!Array.isArray(d.workouts)||!Array.isArray(d.logs)||!Array.isArray(d.weights))throw 0;
        if(!await ask('Remplacer toutes tes données actuelles par cette sauvegarde ?','Importer',true))return;
        S=d;S.sync=null;load();closeSession();save();render();toast('Sauvegarde importée')}
      catch(err){toast('Fichier de sauvegarde invalide')}
    };r.readAsText(f);el.value='';
  }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const ms=$$('#modals .modal:not(.full)');if(ms.length)closeModal(ms[ms.length-1])}});

let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if((tab==='stats'||tab==='dash')&&!$('#modals .modal:not(.full)')&&!sessEl)render()},250)});
window.addEventListener('hashchange',routeFromHash);


/* Démarrage */
function startUI(){
  routeFromHash();
  if(!S.profile.onboarded&&!S.profile.height)onboarding();
  else if(!S.profile.onboarded){S.profile.onboarded=true;save()}
  if(S.active)openSession();
}
async function init(){
  try{await loadDefaults()}catch(e){
    $('#view').innerHTML='<div class="empty">Impossible de charger les fichiers du dossier <b>data/</b>. Ouvre l’application depuis GitHub Pages ou un serveur local (<code>python3 -m http.server</code>) : un double-clic sur index.html ne suffit pas.</div>';
    return;
  }
  load();
  try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
  R.dur=S.settings.rest;
  cloudInit();
  if(cloudOn())await cloudStart();   /* compte obligatoire : écran de connexion si besoin */
  else startUI();                    /* mode local (js/config.js vide) */
  if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)navigator.serviceWorker.register('sw.js').catch(()=>{});
}
init();
