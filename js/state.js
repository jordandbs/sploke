/* État, persistance (localStorage), poids et performances */
'use strict';
const KEY='musculog.v1';
let S;
function fresh(){return {v:1,profile:{name:'',height:null,onboarded:false},weights:[],exercises:JSON.parse(JSON.stringify(DEFAULT_EX)),workouts:DEFAULT_WO(),logs:[],settings:{rest:90,autoRest:true},active:null,sync:{uid:null,last:{},snap:{},at:0}}}
function load(){
  try{const r=localStorage.getItem(KEY);if(r){S=JSON.parse(r)}}catch(e){}
  if(!S||typeof S!=='object')S=fresh();
  const d=fresh();
  S.profile=Object.assign(d.profile,S.profile||{});
  S.settings=Object.assign(d.settings,S.settings||{});
  S.sync=Object.assign(d.sync,S.sync||{});
  if(!S.sync.last||typeof S.sync.last!=='object')S.sync.last={};
  if(!S.sync.snap||typeof S.sync.snap!=='object')S.sync.snap={};
  ['weights','exercises','workouts','logs'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=d[k]});
  S.logs.forEach(l=>{l.ex=(l.ex||[]).filter(e=>e&&Array.isArray(e.sets))});
  if(S.active&&!Array.isArray(S.active.exs))S.active=null;
}
function save(){
  let ok=true;
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){ok=false;toast('Sauvegarde locale impossible : stockage plein ou désactivé')}
  if(typeof scheduleSync==='function')scheduleSync();
  return ok;
}
const exById=id=>S.exercises.find(x=>x.id===id);
const exName=(id,fb)=>(exById(id)||{}).name||fb||'Exercice supprimé';
const woById=id=>S.workouts.find(w=>w.id===id);


const wSorted=()=>[...S.weights].sort((a,b)=>a.ts-b.ts);
const curW=()=>{const w=wSorted();return w[w.length-1]};
function addWeight(kg,ds){S.weights.push({id:uid(),kg,date:ds,ts:dayToTs(ds)});save()}
const logsDesc=()=>[...S.logs].sort((a,b)=>b.start-a.start);
function lastPerf(exId,before=Infinity){
  for(const l of logsDesc()){if(l.start>=before)continue;const e=l.ex.find(x=>x.exId===exId);if(e&&e.sets.length)return {log:l,sets:e.sets}}
  return null;
}
function exHistory(exId){return S.logs.filter(l=>l.ex.some(e=>e.exId===exId)).sort((a,b)=>a.start-b.start).map(l=>({ts:l.start,sets:l.ex.find(e=>e.exId===exId).sets}))}
const bestSet=sets=>sets.reduce((b,s)=>!b||s.kg>b.kg||(s.kg===b.kg&&s.reps>b.reps)?s:b,null);
const setTxt=s=>(s.kg?nf(s.kg,2)+' kg':'PDC')+' × '+s.reps;
const e1rm=(kg,r)=>kg*(1+r/30);
const METRICS={
  kg:{label:'Charge max',unit:'kg',f:s=>Math.max(...s.map(x=>x.kg))},
  e1:{label:'1RM estimé',unit:'kg',f:s=>Math.max(...s.map(x=>e1rm(x.kg,x.reps)))},
  vol:{label:'Volume',unit:'kg',f:s=>s.reduce((a,x)=>a+x.kg*x.reps,0)},
  reps:{label:'Reps max',unit:'reps',f:s=>Math.max(...s.map(x=>x.reps))}
};
const logVolume=l=>l.ex.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+s.kg*s.reps,0),0);
const logSets=l=>l.ex.reduce((a,e)=>a+e.sets.length,0);

