/* Navigation par onglets (hash) et rendu */
'use strict';
const TABS=[['dash','Tableau de bord','Tableau','home'],['wo','Séances','Séances','dumbbell'],['lib','Bibliothèque d’exercices','Exercices','book'],['stats','Statistiques','Stats','chart'],['prof','Profil','Profil','user']];
let tab='dash';
const ui={stEx:null,stM:'kg'};
const VIEWS={};
function renderNav(){
  $('#tabbar').innerHTML=TABS.map(([k,l,s,i])=>`<button class="${tab===k?'on':''}" data-a="go" data-t="${k}" aria-label="${esc(l)}">${ic(i)}<span class="l-short">${s}</span></button>`).join('');
  $('#side').innerHTML=`<div class="logo">${ic('dumbbell')}Muscu</div>`+TABS.map(([k,l,s,i])=>`<button class="${tab===k?'on':''}" data-a="go" data-t="${k}">${ic(i)}<span>${l}</span></button>`).join('');
}
function render(){
  if(!VIEWS[tab])tab='dash';
  renderNav();$('#view').innerHTML=VIEWS[tab]();tick();
}
function routeFromHash(){const h=location.hash.slice(1);tab=VIEWS[h]?h:'dash';render();scrollTo(0,0)}

