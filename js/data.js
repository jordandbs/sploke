/* Données par défaut : chargées depuis data/*.json */
'use strict';
let MUSCLES=[],EQUIPS=[],TYPES=[],COLORS=[],DEFAULT_EX=[],DEFAULT_WO_DATA=[];
async function loadDefaults(){
  const get=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return r.json()});
  const [cfg,ex,wo]=await Promise.all([get('data/config.json'),get('data/exercises.json'),get('data/workouts.json')]);
  MUSCLES=cfg.muscles;EQUIPS=cfg.equips;TYPES=cfg.types;COLORS=cfg.colors;
  DEFAULT_EX=ex.map(e=>Object.assign({video:'',custom:false,fav:false},e));
  DEFAULT_WO_DATA=wo;
}
const DEFAULT_WO=()=>JSON.parse(JSON.stringify(DEFAULT_WO_DATA));
