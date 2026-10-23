/* Utilitaires : helpers, formats de date et icônes SVG */

'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const num=v=>{const n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:NaN};
const p2=n=>String(n).padStart(2,'0');
const isoDay=d=>{d=new Date(d);return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())};
const fmtD=(t,y)=>new Date(t).toLocaleDateString('fr-FR',y?{day:'numeric',month:'short',year:'numeric'}:{day:'numeric',month:'short'});
const fmtDL=t=>new Date(t).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
const nf=(n,d=1)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:d}).format(n);
const mmss=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return (h?h+':'+p2(m):p2(m))+':'+p2(s%60)};
const durLbl=s=>{const m=Math.max(1,Math.round(s/60));return m>=60?Math.floor(m/60)+' h '+p2(m%60):m+' min'};
const dayToTs=ds=>{if(ds===isoDay(Date.now()))return Date.now();const [y,m,d]=ds.split('-').map(Number);return new Date(y,m-1,d,12).getTime()};
const niceStep=r=>{const p=Math.pow(10,Math.floor(Math.log10(r))),f=r/p;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p};
const nz=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

const IC={
 home:'<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 dumbbell:'<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
 book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
 chart:'<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 play:'<path d="M7 4l13 8-13 8z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
 up:'<path d="M6 15l6-6 6 6"/>',down:'<path d="M6 9l6 6 6-6"/>',
 star:'<path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 check:'<path d="M5 12l5 5 9-10"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 reset:'<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/>',
 swap:'<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
 video:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
 skip:'<path d="M5 4l10 8-10 8zM19 5v14"/>',
 dl:'<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>'
};
const ic=(n,cls='')=>`<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]||''}</svg>`;

