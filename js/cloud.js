/* Compte et synchronisation (Supabase). Inactif tant que js/config.js est vide. */
'use strict';
const CFG=window.MUSCU_CONFIG||{};
const CL={sb:null,user:null,busy:false,dirty:false,quiet:false,status:'',step:'',email:'',timer:null};
const cloudOn=()=>!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase);

/* ---------- Correspondance données locales <-> tables ---------- */
const upsertLocal=(arr,o)=>{const i=arr.findIndex(x=>x.id===o.id);if(i>=0)Object.assign(arr[i],o);else arr.push(o)};
const EX_KEYS=['name','muscle','equip','type','desc'];
const exSyncable=x=>{
  if(x.custom||x.fav||x.video)return true;
  const d=DEFAULT_EX.find(e=>e.id===x.id);
  return !!d&&EX_KEYS.some(k=>d[k]!==x[k]);
};
const TABLES=[
  {t:'profiles',conflict:'user_id',noDelete:true,
    list:()=>[{id:'me',row:{name:S.profile.name||'',height_cm:S.profile.height||null,settings:{rest:S.settings.rest,autoRest:!!S.settings.autoRest}}}],
    put(id,r){
      S.profile.name=r.name||'';S.profile.height=r.height_cm||null;if(r.height_cm)S.profile.onboarded=true;
      const st=r.settings||{};if(st.rest)S.settings.rest=st.rest;if(typeof st.autoRest==='boolean')S.settings.autoRest=st.autoRest;
    },
    del(){}},
  {t:'body_weights',conflict:'user_id,id',
    list:()=>S.weights.map(w=>({id:w.id,row:{id:w.id,kg:w.kg,measured_on:w.date,measured_at:new Date(w.ts).toISOString(),deleted:false}})),
    put(id,r){upsertLocal(S.weights,{id,kg:+r.kg,date:r.measured_on,ts:Date.parse(r.measured_at)})},
    del(id){S.weights=S.weights.filter(x=>x.id!==id)}},
  {t:'exercises',conflict:'user_id,id',
    list:()=>S.exercises.filter(exSyncable).map(x=>({id:x.id,row:{id:x.id,name:x.name,muscle:x.muscle,equipment:x.equip,type:x.type,description:x.desc||'',video_url:x.video||'',is_custom:!!x.custom,is_favorite:!!x.fav,deleted:false}})),
    put(id,r){
      const o={id,name:r.name,muscle:r.muscle,equip:r.equipment,type:r.type,desc:r.description||'',video:r.video_url||'',custom:!!r.is_custom,fav:!!r.is_favorite};
      const ex=exById(id);if(ex)Object.assign(ex,o);else if(o.custom)S.exercises.push(o);
    },
    del(id){
      const d=DEFAULT_EX.find(e=>e.id===id);
      if(d){const i=S.exercises.findIndex(e=>e.id===id);if(i>=0)S.exercises[i]=JSON.parse(JSON.stringify(d))}
      else S.exercises=S.exercises.filter(e=>e.id!==id);
    }},
  {t:'workouts',conflict:'user_id,id',
    list:()=>S.workouts.map((w,i)=>({id:w.id,row:{id:w.id,name:w.name,color:w.color,position:i,items:w.items,deleted:false}})),
    put(id,r){
      const o={id,name:r.name,color:r.color,items:Array.isArray(r.items)?r.items:[]};
      const i=S.workouts.findIndex(x=>x.id===id);
      if(i>=0)Object.assign(S.workouts[i],o);else S.workouts.splice(Math.min(r.position||0,S.workouts.length),0,o);
    },
    del(id){S.workouts=S.workouts.filter(x=>x.id!==id)}},
  {t:'sessions',conflict:'user_id,id',
    list:()=>S.logs.map(l=>({id:l.id,row:{id:l.id,workout_id:l.workoutId||null,name:l.name,started_at:new Date(l.start).toISOString(),duration_s:l.duration||0,exercises:l.ex,deleted:false}})),
    put(id,r){upsertLocal(S.logs,{id,workoutId:r.workout_id,name:r.name,start:Date.parse(r.started_at),duration:r.duration_s||0,ex:Array.isArray(r.exercises)?r.exercises:[]})},
    del(id){S.logs=S.logs.filter(x=>x.id!==id)}}
];

/* ---------- Synchronisation ---------- */
async function pushAll(m){
  const uid=CL.user.id;
  for(const T of TABLES){
    const snap=m.snap[T.t]||(m.snap[T.t]={});
    const seen=new Set(),up=[];
    for(const {id,row} of T.list()){seen.add(id);const h=JSON.stringify(row);if(snap[id]!==h)up.push({id,row,h})}
    const tomb=T.noDelete?[]:Object.keys(snap).filter(id=>!seen.has(id));
    for(let i=0;i<up.length;i+=200){
      const part=up.slice(i,i+200);
      const {error}=await CL.sb.from(T.t).upsert(part.map(o=>Object.assign({user_id:uid},o.row)),{onConflict:T.conflict});
      if(error)throw error;
      part.forEach(o=>{snap[o.id]=o.h});
    }
    for(let i=0;i<tomb.length;i+=100){
      const ids=tomb.slice(i,i+100);
      const {error}=await CL.sb.from(T.t).update({deleted:true}).eq('user_id',uid).in('id',ids);
      if(error)throw error;
      ids.forEach(id=>{delete snap[id]});
    }
  }
}
async function pullAll(m){
  let changed=false;
  for(const T of TABLES){
    const snap=m.snap[T.t]||(m.snap[T.t]={}),prev={},touched=[];
    let newest=m.last[T.t]||'';
    let cursor=new Date((newest?Date.parse(newest):0)-2000).toISOString(),op='gt';
    for(;;){
      const {data,error}=await CL.sb.from(T.t).select('*')[op]('updated_at',cursor).order('updated_at',{ascending:true}).limit(500);
      if(error)throw error;
      for(const r of data){
        const id=r.id==null?'me':r.id;
        if(r.deleted){if(id in snap)changed=true;T.del(id);delete snap[id]}
        else{if(!(id in prev))prev[id]=snap[id];T.put(id,r);touched.push(id)}
        if(!newest||Date.parse(r.updated_at)>Date.parse(newest))newest=r.updated_at;
      }
      if(data.length<500)break;
      cursor=data[data.length-1].updated_at;op='gte';
    }
    if(touched.length){
      const cur=new Map(T.list().map(x=>[x.id,x.row]));
      touched.forEach(id=>{const row=cur.get(id);if(!row)return;const h=JSON.stringify(row);if(h!==prev[id])changed=true;snap[id]=h});
    }
    m.last[T.t]=newest||'1970-01-01T00:00:00.000Z';
  }
  return changed;
}
async function syncNow(manual){
  if(!cloudOn()||!CL.user||CL.busy)return;
  if(navigator.onLine===false){setStatus('Hors ligne : synchronisation en attente');return}
  CL.busy=true;setStatus('Synchronisation…');
  const m=S.sync;let changed=false;
  const first=!Object.keys(m.last).length;
  try{
    if(first)changed=await pullAll(m);   /* premier lien : le compte fait foi pour le profil */
    await pushAll(m);
    if(!first)changed=await pullAll(m);
    m.at=Date.now();m.uid=CL.user.id;
    setStatus('');if(manual)toast('Synchronisé');
  }catch(e){
    console.warn('sync',e);
    setStatus(navigator.onLine===false?'Hors ligne : synchronisation en attente':'Échec de la synchronisation : '+(e&&e.message||e));
    if(manual)toast('Échec de la synchronisation');
  }finally{
    CL.quiet=true;save();CL.quiet=false;CL.busy=false;
    if(changed)render();
    if(CL.dirty){CL.dirty=false;scheduleSync()}
  }
}
function scheduleSync(){
  if(!CL.user||CL.quiet)return;
  if(CL.busy){CL.dirty=true;return}
  clearTimeout(CL.timer);CL.timer=setTimeout(()=>syncNow(),600);
}
function statusText(){
  if(CL.status)return CL.status;
  if(S.sync.at)return 'Dernière synchronisation : '+new Date(S.sync.at).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return 'Pas encore synchronisé';
}
function setStatus(t){CL.status=t;const el=$('#cloudStatus');if(el)el.textContent=statusText()}

/* ---------- Compte : nom d'utilisateur + mot de passe ---------- */
/* Supabase authentifie par e-mail : le nom d'utilisateur est converti en adresse technique
   "<nom>@<USER_EMAIL_DOMAIN>" (aucun e-mail n'est jamais envoyé). */
const DOMAIN=CFG.USER_EMAIL_DOMAIN||'muscu.app';
const normUser=u=>String(u||'').trim().toLowerCase();
const validUser=u=>/^[a-z0-9._-]{3,30}$/.test(u);
const userEmail=u=>u+'@'+DOMAIN;
const usernameOf=u=>u?((u.user_metadata&&u.user_metadata.username)||String(u.email||'').split('@')[0]):'';
const authErr=e=>{const m=String(e&&e.message||e);
  if(/Invalid login credentials/i.test(m))return 'Nom d’utilisateur ou mot de passe incorrect';
  if(/already registered|already been registered/i.test(m))return 'Ce nom d’utilisateur est déjà pris';
  if(/invalid/i.test(m)&&/email/i.test(m))return 'Adresse technique refusée par Supabase : change USER_EMAIL_DOMAIN dans js/config.js';
  if(/at least|weak|short/i.test(m))return 'Mot de passe trop court ou trop faible';
  if(/rate limit|too many/i.test(m))return 'Trop de tentatives, réessaie dans un moment';
  if(/fetch|network/i.test(m))return 'Réseau indisponible';
  return m};

let authEl=null,authMode='in',loadEl=null;
function showAuth(){
  document.body.classList.add('gated');
  if(authEl&&authEl.isConnected)return;
  const submit=async b=>{
    const u=normUser($('#aUser',authEl).value),p=$('#aPass',authEl).value;
    if(!validUser(u))return toast('Nom d’utilisateur : 3 à 30 caractères (lettres, chiffres, . _ -)');
    if(!p)return toast('Saisis ton mot de passe');
    if(authMode==='up'){
      if(p.length<8)return toast('Mot de passe : 8 caractères minimum');
      if(p!==$('#aPass2',authEl).value)return toast('Les deux mots de passe sont différents');
    }
    b.disabled=true;
    try{
      if(authMode==='in'){
        const {error}=await CL.sb.auth.signInWithPassword({email:userEmail(u),password:p});
        if(error)toast(authErr(error));
      }else{
        const {data,error}=await CL.sb.auth.signUp({email:userEmail(u),password:p,options:{data:{username:u}}});
        if(error)toast(authErr(error));
        else if(!data.session)toast('Compte créé mais non activé : désactive « Confirm email » dans Supabase (voir README)');
      }
    }finally{b.disabled=false}
  };
  authEl=modal('',{locked:true,h:{
    amode(b){authMode=b.dataset.m;paint()},
    asubmit:submit
  }});
  authEl.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){const b=$('[data-a="asubmit"]',authEl);if(b)submit(b)}});
  const paint=()=>{
    const keep=$('#aUser',authEl)?$('#aUser',authEl).value:'';
    authEl.firstChild.innerHTML=`<h3>Muscu</h3><p class="mut" style="margin-top:4px">${authMode==='in'?'Connecte-toi pour retrouver tes séances sur tous tes appareils.':'Crée ton compte : tes séances et statistiques seront enregistrées en ligne.'}</p>
    <div class="seg" style="margin-top:14px"><button class="${authMode==='in'?'on':''}" data-a="amode" data-m="in">Se connecter</button><button class="${authMode==='up'?'on':''}" data-a="amode" data-m="up">Créer un compte</button></div>
    <label for="aUser">Nom d’utilisateur</label><input id="aUser" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="30" value="${esc(keep)}">
    <label for="aPass">Mot de passe</label><input id="aPass" type="password" autocomplete="${authMode==='in'?'current-password':'new-password'}">
    ${authMode==='up'?`<label for="aPass2">Confirmer le mot de passe</label><input id="aPass2" type="password" autocomplete="new-password">
    <p class="sm mut" style="margin-top:10px">Note bien ton mot de passe : sans adresse e-mail, il ne peut pas être réinitialisé. Tu pourras le changer depuis ton profil.</p>`:''}
    <div class="btns"><button class="btn primary" data-a="asubmit">${authMode==='in'?'Se connecter':'Créer mon compte'}</button></div>`;
  };
  paint();
}
function closeAuth(){if(authEl){const e=authEl;authEl=null;closeModal(e)}}

const pending=()=>{
  const m=S.sync;let n=0;
  for(const T of TABLES){
    const snap=m.snap[T.t]||{},seen=new Set();
    for(const {id,row} of T.list()){seen.add(id);if(snap[id]!==JSON.stringify(row))n++}
    if(!T.noDelete)n+=Object.keys(snap).filter(id=>!seen.has(id)).length;
  }
  return n;
};

/* Entrée dans l'app une fois authentifié : le compte (base de données) est la référence ;
   la copie locale ne sert qu'à l'affichage immédiat et au mode hors ligne. */
async function enterApp(){
  const uid=CL.user.id;
  closeAuth();
  if(S.sync.uid&&S.sync.uid!==uid)S=fresh();            /* jamais de mélange entre deux comptes */
  const firstLink=S.sync.uid!==uid;
  if(firstLink){S.sync={uid,last:{},snap:{},at:0};save()}
  document.body.classList.remove('gated');
  if(firstLink){
    loadEl=modal('<p class="ask">Chargement de tes données…</p>',{locked:true});
    await syncNow();
    const e=loadEl;loadEl=null;closeModal(e);
    startUI();
  }else{startUI();syncNow()}
}
async function cloudStart(){
  const {data}=await CL.sb.auth.getSession();
  const u=data&&data.session&&data.session.user;
  if(u){CL.user=u;await enterApp()}else showAuth();
}
function cloudInit(){
  if(!cloudOn())return;
  CL.sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'muscu.auth'}});
  CL.sb.auth.onAuthStateChange((ev,sess)=>{
    if(ev==='INITIAL_SESSION')return;
    const u=sess&&sess.user||null,was=CL.user;
    if(u){CL.user=u;if(!was||was.id!==u.id)setTimeout(enterApp,0)}
    else if(ev==='SIGNED_OUT'){
      CL.user=null;
      setTimeout(()=>{
        if(CL.wipe){CL.wipe=false;closeSession();S=fresh();save()}     /* déconnexion volontaire : on vide l'appareil */
        $$('#modals .modal').forEach(m=>closeModal(m));
        showAuth();
      },0);
    }
  });
  window.addEventListener('online',()=>syncNow());
  document.addEventListener('visibilitychange',()=>{
    if(!CL.user)return;
    if(document.hidden)syncNow();
    else if(Date.now()-(S.sync.at||0)>60000)syncNow();
  });
}

const CLOUD_ACTIONS={
  csync(){syncNow(true)},
  async cpw(){
    const p=($('#cNew')||{}).value||'';
    if(p.length<8)return toast('Mot de passe : 8 caractères minimum');
    const {error}=await CL.sb.auth.updateUser({password:p});
    if(error)return toast(authErr(error));
    $('#cNew').value='';toast('Mot de passe modifié');
  },
  async cout(){
    if(!await ask('Se déconnecter ? Tes données restent dans ton compte et seront effacées de cet appareil.','Se déconnecter'))return;
    await syncNow();
    if(pending()>0&&!await ask('Certaines modifications n’ont pas pu être envoyées (réseau ?). Se déconnecter maintenant les perdra. Continuer ?','Se déconnecter quand même',true))return;
    CL.wipe=true;await CL.sb.auth.signOut();
  },
  async cdel(){
    if(!await ask('Supprimer ton compte et toutes tes données en ligne ? Cette action est irréversible.','Continuer',true))return;
    if(!await ask('Dernière confirmation : tout sera définitivement effacé.','Supprimer le compte',true))return;
    const {error}=await CL.sb.rpc('delete_my_account');if(error)return toast(authErr(error));
    CL.wipe=true;await CL.sb.auth.signOut();
  }
};

function cloudCard(){
  if(!cloudOn())return `<section class="card"><h2>Compte et synchronisation</h2><p class="sm mut">Mode local : tes données restent sur cet appareil. Pour activer les comptes et la sauvegarde en ligne, renseigne <code>js/config.js</code> (voir le README).</p></section>`;
  if(!CL.user)return '';
  return `<section class="card"><h2>Compte</h2><p>Connecté : <b>${esc(usernameOf(CL.user))}</b></p><p class="sm mut" id="cloudStatus">${esc(statusText())}</p>
    <button class="btn block" style="margin-top:12px" data-a="csync">Synchroniser maintenant</button>
    <label for="cNew">Nouveau mot de passe</label>
    <div class="row"><input id="cNew" type="password" autocomplete="new-password" placeholder="8 caractères minimum"><button class="btn" data-a="cpw">Modifier</button></div>
    <div class="grid2" style="margin-top:14px"><button class="btn" data-a="cout">Se déconnecter</button><button class="btn danger" data-a="cdel">Supprimer le compte</button></div></section>`;
}
