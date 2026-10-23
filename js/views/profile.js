/* Vue : Profil, historique de poids, sauvegarde, première configuration */
'use strict';
VIEWS.prof=()=>{
  const ws=wSorted(),w=ws[ws.length-1],h=S.profile.height,bmi=w&&h?w.kg/Math.pow(h/100,2):null;
  return `<div class="top"><h1>Profil</h1></div>
  <section class="card"><h2>Informations</h2>
    <label for="pName" style="margin-top:0">Prénom (facultatif)</label><input id="pName" data-ch="name" value="${esc(S.profile.name)}" maxlength="30">
    <label for="pH">Taille (cm)</label><input id="pH" data-ch="height" inputmode="numeric" value="${h||''}" placeholder="175">
    ${bmi?`<p class="sm mut" style="margin-top:10px">IMC actuel : ${nf(bmi)} (${bmiLbl(bmi)})</p>`:''}
    <label for="pRest">Durée de repos par défaut</label>
    <select id="pRest" data-ch="rest">${[30,45,60,90,120,150,180,240,300].map(s=>`<option value="${s}" ${S.settings.rest===s?'selected':''}>${s>=60?Math.floor(s/60)+' min'+(s%60?' '+s%60+' s':''):s+' s'}</option>`).join('')}</select>
    <label class="row" style="margin-top:14px;color:var(--tx)"><input type="checkbox" id="pAuto" data-ch="auto" ${S.settings.autoRest?'checked':''} style="width:22px;min-height:22px"><span>Lancer le repos après chaque série validée</span></label>
  </section>
  <section class="card"><h2>Poids corporel</h2>
    <div class="row" style="align-items:flex-end"><div class="sp"><label for="wKg" style="margin-top:0">Poids (kg)</label><input id="wKg" inputmode="decimal" placeholder="${w?nf(w.kg):'70'}"></div><div class="sp"><label for="wDate" style="margin-top:0">Date</label><input id="wDate" type="date" value="${isoDay(Date.now())}" max="${isoDay(Date.now())}"></div></div>
    <button class="btn primary block" style="margin-top:10px" data-a="addw">Ajouter une mesure</button>
    <p class="sm mut" style="margin:10px 0 0">Chaque mesure est ajoutée à l’historique : les anciennes restent conservées.</p>
    ${ws.length?`<div class="list" style="margin-top:8px">${[...ws].reverse().map(x=>`<div class="li"><span class="sp"><b>${nf(x.kg)} kg</b><br><span class="mut sm">${esc(fmtD(x.ts,true))}</span></span><button class="ib" data-a="editw" data-id="${x.id}" aria-label="Modifier">${ic('edit')}</button><button class="ib dng" data-a="delw" data-id="${x.id}" aria-label="Supprimer">${ic('trash')}</button></div>`).join('')}</div>`:''}
  </section>
  ${typeof cloudCard==='function'?cloudCard():''}
  <section class="card"><h2>Données</h2>
    <p class="sm mut" style="margin-bottom:12px">Tout est enregistré sur cet appareil, dans ce navigateur. Exporte une sauvegarde de temps en temps pour ne rien perdre (changement d’iPhone, nettoyage de Safari…).</p>
    <div class="grid2"><button class="btn" data-a="export">${ic('dl')}Exporter</button><button class="btn" data-a="import">${ic('plus')}Importer</button></div>
    <button class="btn block" style="margin-top:10px" data-a="restore">Restaurer les exercices et séances par défaut</button>
    <button class="btn danger block" style="margin-top:10px" data-a="wipe">Tout effacer</button>
    <input type="file" id="impFile" accept="application/json,.json" hidden>
  </section>`;
};
function weightModal(id){
  const x=S.weights.find(w=>w.id===id);if(!x)return;
  const el=modal(head('Modifier la mesure')+`<label for="eK">Poids (kg)</label><input id="eK" inputmode="decimal" value="${x.kg}"><label for="eD">Date</label><input id="eD" type="date" value="${x.date}" max="${isoDay(Date.now())}"><div class="btns"><button class="btn primary" data-a="save">Enregistrer</button></div>`,{h:{
    save(){const k=num($('#eK',el).value),d=$('#eD',el).value;if(!(k>=20&&k<=400))return toast('Poids invalide');if(!d||d>isoDay(Date.now()))return toast('Date invalide');
      x.kg=Math.round(k*10)/10;x.date=d;x.ts=dayToTs(d);save();closeModal(el);render()}}});
}
function readWeightForm(){
  const k=num($('#wKg').value),d=$('#wDate').value;
  if(!(k>=20&&k<=400)){toast('Entre un poids valide (20 à 400 kg)');return false}
  if(!d||d>isoDay(Date.now())){toast('Choisis une date valide');return false}
  addWeight(Math.round(k*10)/10,d);return true;
}


function onboarding(){
  const el=modal(`<h3>Bienvenue sur Muscu</h3><p class="mut" style="margin-top:4px">Deux informations pour démarrer. Tu pourras les modifier à tout moment dans ton profil.</p>
   <label for="oN">Prénom (facultatif)</label><input id="oN" maxlength="30" autocomplete="given-name" value="${esc(typeof CL!=='undefined'&&CL.user?usernameOf(CL.user):'')}">
   <div class="grid2"><div><label for="oH">Taille (cm)</label><input id="oH" inputmode="numeric" placeholder="175"></div><div><label for="oW">Poids (kg)</label><input id="oW" inputmode="decimal" placeholder="70"></div></div>
   <div class="btns"><button class="btn primary" data-a="go">Commencer</button></div>`,{locked:true,h:{go(){
     const h=num($('#oH',el).value),w=num($('#oW',el).value);
     if(!(h>=100&&h<=250))return toast('Entre une taille entre 100 et 250 cm');
     if(!(w>=20&&w<=400))return toast('Entre un poids entre 20 et 400 kg');
     S.profile.height=Math.round(h);S.profile.name=$('#oN',el).value.trim();S.profile.onboarded=true;
     addWeight(Math.round(w*10)/10,isoDay(Date.now()));save();closeModal(el);render();
   }}});
}

