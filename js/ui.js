/* Interface : toasts, modales, confirmations */
'use strict';
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('on'),2300)}
let zc=100;
function modal(html,o={}){
  const el=document.createElement('div');
  el.className='modal'+(o.full?' full':'');
  el.style.zIndex=o.full?90:++zc;
  el.innerHTML='<div class="sheet">'+html+'</div>';
  el._h=o.h||{};el._onclose=o.onclose;
  if(!o.full&&!o.locked)el.addEventListener('click',e=>{if(e.target===el)closeModal(el)});
  $('#modals').appendChild(el);document.body.classList.add('lock');
  return el;
}
function closeModal(el){if(!el||!el.isConnected)return;el.remove();if(el._onclose)el._onclose();document.body.classList.toggle('lock',!!$('#modals .modal'))}
const head=t=>`<div class="sh"><h3>${t}</h3><button class="ib" data-a="close" aria-label="Fermer">${ic('x')}</button></div>`;
function ask(msg,ok='Confirmer',danger){
  return new Promise(res=>{
    let done=false;const fin=v=>{if(!done){done=true;res(v)}};
    const el=modal(`<p class="ask">${esc(msg)}</p><div class="btns"><button class="btn" data-a="no">Annuler</button><button class="btn ${danger?'danger':'primary'}" data-a="yes">${esc(ok)}</button></div>`,
      {h:{yes:()=>{fin(true);closeModal(el)},no:()=>{fin(false);closeModal(el)}},onclose:()=>fin(false)});
  });
}

