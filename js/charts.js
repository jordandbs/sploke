/* Graphiques SVG sans dépendance */
'use strict';
const chartW=()=>Math.max(280,Math.min(760,innerWidth>=900?innerWidth-380:innerWidth-64));
function lineChart(id,pts,o={}){
  if(!pts.length)return `<div class="empty">${o.empty||'Pas encore de données.'}</div>`;
  const W=chartW(),H=W<480?230:290,m={l:44,r:14,t:14,b:30},col=o.color||'var(--tx)';
  let lo=Math.min(...pts.map(p=>p.v)),hi=Math.max(...pts.map(p=>p.v));
  if(lo===hi){lo-=1;hi+=1}
  const pv=(hi-lo)*.14;lo-=pv;hi+=pv;if(o.zero&&lo<0)lo=0;
  const step=niceStep((hi-lo)/4),y0=Math.floor(lo/step)*step,y1=Math.ceil(hi/step)*step;
  let t0=pts[0].t,t1=pts[pts.length-1].t;if(t0===t1){t0-=864e5;t1+=864e5}
  const X=t=>m.l+(t-t0)/(t1-t0)*(W-m.l-m.r),Y=v=>m.t+(1-(v-y0)/(y1-y0))*(H-m.t-m.b);
  let g='';const n=Math.round((y1-y0)/step);
  for(let i=0;i<=n;i++){const v=y0+i*step,y=Y(v).toFixed(1);g+=`<line class="gl" x1="${m.l}" x2="${W-m.r}" y1="${y}" y2="${y}"/><text class="tl" x="${m.l-7}" y="${+y+4}" text-anchor="end">${nf(v,step<1?1:0)}</text>`}
  const nt=W<480?3:5,yr=(t1-t0)>2.6e10;
  for(let i=0;i<nt;i++){const t=t0+(t1-t0)*i/(nt-1),a=i===0?'start':i===nt-1?'end':'middle';g+=`<text class="tl" x="${X(t).toFixed(1)}" y="${H-8}" text-anchor="${a}">${fmtD(t,yr)}</text>`}
  const line=pts.map((p,i)=>(i?'L':'M')+X(p.t).toFixed(1)+' '+Y(p.v).toFixed(1)).join('');
  const area=`${line}L${X(pts[pts.length-1].t).toFixed(1)} ${H-m.b}L${X(pts[0].t).toFixed(1)} ${H-m.b}Z`;
  let dots='';
  pts.forEach(p=>{const cx=X(p.t).toFixed(1),cy=Y(p.v).toFixed(1);
    dots+=`<circle class="pt" cx="${cx}" cy="${cy}" r="4.5" fill="${col}" data-id="${id}"/><circle class="hit" cx="${cx}" cy="${cy}" r="16" data-a="pt" data-cid="${id}" data-cap="${esc(p.l)}"/>`});
  return `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label||'Graphique')}"><defs><linearGradient id="g${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".28"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>${g}${pts.length>1?`<path d="${area}" fill="url(#g${id})"/>`:''}<path class="ln" d="${line}" stroke="${col}"/>${dots}</svg><div class="cap" id="cap-${id}">${esc(pts[pts.length-1].l)}</div>`;
}
function spark(pts,col){
  if(pts.length<2)return '';
  const W=300,H=64,lo=Math.min(...pts.map(p=>p.v)),hi=Math.max(...pts.map(p=>p.v))||1,r=(hi-lo)||1;
  const t0=pts[0].t,t1=pts[pts.length-1].t||1;
  const d=pts.map((p,i)=>(i?'L':'M')+(4+(p.t-t0)/((t1-t0)||1)*(W-8)).toFixed(1)+' '+(H-6-(p.v-lo)/r*(H-12)).toFixed(1)).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="64" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

