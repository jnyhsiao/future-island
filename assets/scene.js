/* © 2026 CSGHS YuHsuan Hsiao. All rights reserved. 保留所有權利，未經作者書面同意不得重製、改作或散布。詳見 LICENSE。 */
/* 2D 校園平面圖：裝置跑不動 3D（沒有 WebGL 或 three.js 載入失敗）時才顯示。
   校舍位置與 scene3d.js 相同，取自 OpenStreetMap（© OpenStreetMap 貢獻者）；全部在本機用 SVG 畫出，不載入任何圖檔。 */
(function(){
'use strict';
const canvas=document.getElementById('islandMap'), viewport=document.getElementById('mapViewport');
if(!canvas||!viewport)return;
if(window.__ISLAND_3D__){canvas.remove();return;} // 3D scene is running
const fmt=n=>Number(n.toFixed(1));
// scene units (same as scene3d.js) → SVG; OSM metres → scene units
const S=(x,z)=>[fmt(720+x*20),fmt(318+z*20)];
const M=(x,z)=>[(x-5)/6,(z+17)/6];
const pts=list=>list.map(([x,z])=>S(x,z).join(',')).join(' ');
const ptsM=list=>pts(list.map(([x,z])=>M(x,z)));
const rect=(x0,z0,x1,z1,fill,extra='')=>{const a=S(x0,z0),b=S(x1,z1);return `<rect x="${a[0]}" y="${a[1]}" width="${fmt(b[0]-a[0])}" height="${fmt(b[1]-a[1])}" fill="${fill}" ${extra}/>`;};
const circle=(x,z,r,fill,extra='')=>{const a=S(x,z);return `<circle cx="${a[0]}" cy="${a[1]}" r="${r}" fill="${fill}" ${extra}/>`;};
const label=(x,z,t,size=11,fill='#5a5548',extra='')=>{const a=S(x,z);return `<text x="${a[0]}" y="${a[1]}" text-anchor="middle" dominant-baseline="middle" font-size="${size}" fill="${fill}" font-weight="700" letter-spacing="1" ${extra}>${t}</text>`;};

let svg='<defs><filter id="pinShadow" x="-30%" y="-50%" width="160%" height="220%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#3b624f" flood-opacity=".16"/></filter><pattern id="grass" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#b7cd95"/><path d="M2 6l1-2M6 3l1-2" stroke="#a3bd80" stroke-width="1"/></pattern></defs><g id="mapWorld">';
// city ground, neighbourhood blocks, streets
svg+=rect(-60,-50,60,50,'#dfe2d6');
for(let gx=-42;gx<=42;gx+=6.5)for(let gz=-34;gz<=34;gz+=6.5){if(gx>-24&&gx<21.5&&gz>-19&&gz<21)continue;if((gz>12&&gz<20.5)||(gx>-24&&gx<-15)||(gx>16&&gx<21.5&&gz<16))continue;svg+=rect(gx-2.3,gz-2.3,gx+2.3,gz+2.3,'#d2d3c8','rx="3"');}
svg+=rect(-60,14,60,18.8,'#d9d4c6')+rect(-60,14.8,60,18,'#9a9fa3');for(let x=-58;x<58;x+=2.4)svg+=rect(x,16.35,x+1.2,16.45,'#f2efe4');
svg+=rect(-22.3,-50,-17.3,50,'#d9d4c6')+rect(-21.6,-50,-18,50,'#9a9fa3')+rect(-21.1,-50,-18.5,50,'#c9c7c0','opacity=".85"')+rect(-19.85,-50,-19.75,50,'#f2efe4');
svg+=rect(18.1,-50,19.2,14,'#a9adb0');
svg+=label(-6,17.35,'長安東路二段',12,'#f3f1ea')+label(-19.8,-9,'建國北路・建國高架',11,'#4f5450','writing-mode="vertical-rl" style="writing-mode:vertical-rl;text-orientation:upright"');
// campus lot and fence
svg+=`<polygon points="${pts([[-17.2,-15.5],[17.6,-15.5],[17.6,14],[-13.6,14],[-17.2,10.4]])}" fill="#efeadb" stroke="#b9ae98" stroke-width="3"/>`;
// lawns
svg+=rect(-12.6,9.85,3,13.7,'url(#grass)','rx="6"')+rect(-12.6,7.55,3,8.6,'url(#grass)','rx="4"')+rect(-16.9,-14.9,-15.6,9.6,'url(#grass)','rx="4"');
// paths
const path=(list,w=18)=>`<polyline points="${pts(list)}" fill="none" stroke="#f7f1e2" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
svg+=path([[-15.9,12.7],[-14.6,11.4],[-12.6,9.4],[-9.8,9.25],[2.8,9.2],[4.05,8.3],[4.05,1.1]])+path([[-15.2,10.9],[-15.3,7],[-15.25,-1.2],[-13.6,-2.8],[-8.9,-2.3]],15)+path([[5.8,.6],[8.4,1.5],[10.3,2.1],[10.3,4.6],[10.2,11.4]],15);
// running track with the compass in the middle
(function(){const cx=-1.3,cz=-3.95,h=2.85;const st=r=>{const a=S(cx-h,cz-r),b=S(cx+h,cz-r),c=S(cx+h,cz+r),d=S(cx-h,cz+r),R=r*20;return `M${a[0]} ${a[1]}H${b[0]}A${R} ${R} 0 0 1 ${c[0]} ${c[1]}H${d[0]}A${R} ${R} 0 0 1 ${a[0]} ${a[1]}Z`;};
 svg+=`<path d="${st(3.95)}" fill="#c4694c"/><path d="${st(2.95)}" fill="#9dbd78"/><path d="${st(3.62)}" fill="none" stroke="#f7f1e6" stroke-width="1.2"/><path d="${st(3.28)}" fill="none" stroke="#f7f1e6" stroke-width="1.2"/>`;
 svg+=circle(cx,cz,46,'#e3dab9')+circle(cx,cz,37,'#f3ecd5')+circle(cx,cz,25,'#d9d2b3');const c=S(cx,cz);svg+=`<path d="M${c[0]} ${c[1]-22}L${c[0]+6} ${c[1]}L${c[0]} ${c[1]+22}L${c[0]-6} ${c[1]}Z" fill="#c8613f"/><path d="M${c[0]-22} ${c[1]}L${c[0]} ${c[1]-6}L${c[0]+22} ${c[1]}L${c[0]} ${c[1]+6}Z" fill="#7f9671" opacity=".7"/>`;})();
// courts
[[-15,-14.2,-12.5,-9.2],[-15,-8.7,-12.1,-3.3],[-12.1,-8.7,-9.3,-3.3]].forEach(([a,b,c,d])=>svg+=rect(a,b,c,d,'#8fb0ab','stroke="#f4f1e8" stroke-width="1.5"'));
[[-7.6,-4],[-4,-.3]].forEach(([a,b])=>svg+=rect(6.9,a,8.75,b,'#c9a982','stroke="#f4f1e8" stroke-width="1.5"'));
svg+=label(-13.75,-11.7,'籃球場',10,'#3f5a57')+label(7.82,-2.2,'排球',10,'#6b5236');
// buildings: shadow, roof, name
const B=[
 {n:'逸仙樓',f:[[-72.4,-29.5],[-61,-29.3],[-60.8,14.8],[23.7,14.9],[23.8,26.5],[-72.6,26.1]],c:'#d5bd8f',at:[-4.8,6.3]},
 {n:'中山樓',f:[[69.7,-58.6],[69.7,-2.5],[88.1,-1.8],[88.4,-58.6]],c:'#c97b62',at:[12.35,-2.2]},
 {n:'大禮堂',f:[[35,53.6],[62.6,54.1],[63.6,.5],[35.9,0]],c:'#b9bcb6',at:[7.4,7.3]},
 {n:'',f:[[32,-77.7],[31.9,-71],[41,-70.8],[40.9,-64.9],[87.5,-63.7],[87.6,-76.9]],c:'#c27a63'},
 {n:'',f:[[-35,-68.7],[-64.9,-69.3],[-64,-105.4],[-34.9,-104.9]],c:'#c27a63'},
 {n:'自強樓',f:[[94.5,-93.7],[92.7,-3.3],[105.6,-2.6],[105.8,-93.5]],c:'#c97b62',at:[15.7,-5.5],v:1},
 {n:'科學館',f:[[91.5,-.7],[105.7,-.3],[104.7,56.7],[79.1,56.1],[79.1,33.9],[91.3,21.8]],c:'#7e9aa3',at:[14.5,9.6]},
 {n:'莊敬大樓・圖書館',f:[[-34.9,-104.9],[-35,-78.7],[87.6,-76.9],[87.7,-103.1]],c:'#b56a50',at:[3.6,-12.4]}
];
B.forEach(b=>{svg+=`<polygon points="${ptsM(b.f)}" fill="#6d6a5e" opacity=".22" transform="translate(5 6)"/><polygon points="${ptsM(b.f)}" fill="${b.c}" stroke="#fffaf0" stroke-width="2"/>`;});
B.forEach(b=>{if(!b.n)return;const a=S(...b.at);svg+=`<text x="${a[0]}" y="${a[1]}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="#fffaf0" letter-spacing="1"${b.v?' style="writing-mode:vertical-rl;text-orientation:upright"':''}>${b.n}</text>`;});
// 司令台, flag, gate, co-op stall and tables
svg+=rect(-2.15,2.5,-.15,3.8,'#b56a50','rx="2"')+label(-1.15,3.15,'司令台',9,'#fffaf0');
svg+=`<g transform="translate(${S(-15.4,12.2).join(' ')}) rotate(-45)"><rect x="-27" y="-6" width="9" height="12" fill="#ece8de" stroke="#b3a993"/><rect x="18" y="-6" width="9" height="12" fill="#ece8de" stroke="#b3a993"/><rect x="-27" y="-3" width="54" height="6" fill="#d4cdbf" opacity=".7"/></g>`+label(-13.2,13.2,'校門',10,'#5a5548');
svg+=rect(-13.65,12.6,-12.15,13.7,'#b56a50','rx="2" stroke="#fffaf0" stroke-width="1.5"')+label(-12.9,13.15,'警衛室',8,'#fffaf0');
{const a=S(-13.4,12.15);svg+=circle(-13.4,12.15,5.5,'#2f3e5c')+`<g transform="translate(${a[0]+8} ${a[1]-30})"><rect width="118" height="20" rx="10" fill="#fffdf6" stroke="#d8d2c2"/><text x="59" y="14" text-anchor="middle" font-size="10.5" fill="#2c4a3e">警衛北北：我們現在有外送囉</text></g>`;}
{const a=S(.95,1.75);svg+=circle(.95,1.75,6,'#6a3b2f')+circle(.95,1.65,3.8,'#f6efd4')+`<g transform="translate(${a[0]+9} ${a[1]-26})"><rect width="148" height="20" rx="10" fill="#fffdf6" stroke="#d8d2c2"/><text x="74" y="14" text-anchor="middle" font-size="10.5" fill="#2c4a3e">水水校長：百三傳承．跨代共榮。</text></g>`;}
svg+=rect(11.8,2.8,14,4.4,'#c35c3b','rx="3"')+label(12.9,3.6,'合作社',9,'#fffaf0');
[[11.1,6.9],[13,5.9]].forEach(([x,z])=>svg+=circle(x,z,13,'#e7b56f','stroke="#fff" stroke-width="2"'));
// trees
[[-10.2,13.2],[-8.6,10.6],[-7.2,12.9],[-4.9,10.7],[-2.6,12.9],[-.3,10.7],[2,12.8],[-11.6,8.1],[1.8,8.1],[16.6,13.2],[15.3,13.3],[9.3,13.2],[-16.4,-13.8],[-16.3,-10.5],[-16.3,-7],[-16.4,-3.5],[-16.3,0],[-16.4,3.6],[-16.2,7.2],[16.9,-14.6],[16.9,-13.3],[9.3,-14.3],[-8.1,-14.6],[-9.9,3.9],[-9.3,-.6],[5.6,-8.4],[9.6,-.9]].forEach(([x,z],i)=>svg+=circle(x,z,i<9?17:13,'#86a666','stroke="#719357" stroke-width="2" opacity=".95"'));
for(let x=-14;x<=17;x+=4.4)svg+=circle(x,14.4,10,'#86a666','stroke="#719357" stroke-width="2"');
// students in 白衣黑裙 / 小藍褲 (dots)
[[-6.5,9.2],[-2,9.3],[1.5,9.2],[-15.3,3],[10.3,3.5],[-1.3,-.1],[3.5,-7.8],[-6.4,-7.6],[-5.2,-.2],[4.6,-3],[-13.6,-6.2],[7.8,-6.9],[7.8,-4.7],[-7.6,11.3],[-6.8,11.8]].forEach(([x,z],i)=>{svg+=circle(x,z,5.5,i>7&&i<13?'#2d4ea0':'#24262b')+circle(x,z-.12,3.6,'#f7f6f1');});
// residents: click to chat (names come from residents.js)
const people=(window.IslandResidents&&window.IslandResidents.residents)||[];
people.forEach(r=>{const a=S(r.pos[0],r.pos[1]);svg+=`<g class="map-resident" data-resident="${r.id}" tabindex="0" role="button" aria-label="和${r.name}聊天" transform="translate(${a[0]} ${a[1]})" style="cursor:pointer"><circle r="11" fill="${r.color}" stroke="#fff" stroke-width="2.5"/><text y="4" text-anchor="middle" font-size="11">${r.emoji}</text><rect x="-${r.name.length*6+8}" y="13" width="${r.name.length*12+16}" height="18" rx="9" fill="#214c40" opacity=".9"/><text y="25.5" text-anchor="middle" font-size="11" fill="#fffdf6" font-weight="700">${r.name}</text></g>`;});
// landmark pins
const zones=[{id:'lunch',n:'01',title:'午餐小屋',p:[12.6,4.6],w:132,sub:'自強樓合作社・預約午餐'},{id:'planning',n:'02',title:'未來羅盤',p:[-5.6,-1.4],w:132,sub:'操場・填寫升學規劃'},{id:'routes',n:'03',title:'科系航線',p:[14.8,7.6],w:132,sub:'科學館・探索科系'},{id:'workshop',n:'04',title:'學習工坊',p:[-3.6,-13],w:132,sub:'莊敬大樓圖書館・整理經驗'},{id:'resources',n:'05',title:'資源燈塔',p:[-8.2,5.4],w:132,sub:'逸仙樓教務處・官方資訊'}];
zones.forEach(o=>{const [x,y]=S(...o.p);o.x=x;o.y=y-40;});
zones.forEach(o=>{svg+=`<g class="map-hotspot" data-zone="${o.id}" tabindex="0" role="button" aria-label="${o.title}：${o.sub}" transform="translate(${o.x},${o.y})"><path d="M0 20v18" stroke="#7d947a" stroke-width="1" stroke-dasharray="2 3"/><circle cy="40" r="3" fill="#c1784c"/><rect class="pin-hit" x="-105" y="-45" width="210" height="96" fill="transparent"/><g class="pin-card" filter="url(#pinShadow)"><rect class="pin-bg" x="-${o.w/2}" y="-17" width="${o.w}" height="36" rx="18" fill="#fcf9ee" stroke="#fff" stroke-width="1"/><circle cx="-${o.w/2-19}" cy="1" r="11" fill="${o.id==='lunch'?'#bc6946':'#7b9066'}"/><text x="-${o.w/2-19}" y="4.5" text-anchor="middle" class="pin-num">${o.n}</text><text x="13" y="5" text-anchor="middle" class="pin-title">${o.title}</text></g></g>`;});
svg+=`<g transform="translate(1100 70)" opacity=".7"><path d="M0-17L5 6 0 1-5 6Z" fill="#607d6c"/><text x="0" y="-25" text-anchor="middle" fill="#607d6c" font-size="11" font-family="serif">N</text></g></g>`;
canvas.innerHTML=svg;
const world=document.getElementById('mapWorld');let zoom=1,tx=0,ty=0;const pointers=new Map();let startDrag=null,lastDistance=0,moved=false;
function apply(){world.setAttribute('transform',`translate(${tx} ${ty}) translate(680 335) scale(${zoom}) translate(-680 -335)`);document.getElementById('zoomReadout').textContent=Math.round(zoom*100)+'%';}
function changeZoom(mult){zoom=Math.max(.8,Math.min(2.3,zoom*mult));apply();}
function reset(){zoom=1;tx=0;ty=0;apply();}
document.getElementById('zoomIn').onclick=()=>changeZoom(1.15);document.getElementById('zoomOut').onclick=()=>changeZoom(1/1.15);document.getElementById('resetView').onclick=reset;window.IslandMap={reset,zoom:changeZoom};
viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();changeZoom(e.deltaY<0?1.07:1/1.07);},{passive:false});
function svgPoint(e){const pt=canvas.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform(canvas.getScreenCTM().inverse());}
viewport.addEventListener('pointerdown',e=>{if(e.button&&e.button!==0)return;const pos=svgPoint(e);pointers.set(e.pointerId,pos);moved=false;startDrag={x:pos.x,y:pos.y,tx,ty};if(!e.target.closest('.map-hotspot,.map-resident'))viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');});
viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const pos=svgPoint(e);pointers.set(e.pointerId,pos);if(pointers.size===2){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(lastDistance)changeZoom(d/lastDistance);lastDistance=d;moved=true;return;}if(startDrag){const dx=pos.x-startDrag.x,dy=pos.y-startDrag.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;tx=Math.max(-410,Math.min(410,startDrag.tx+dx));ty=Math.max(-230,Math.min(230,startDrag.ty+dy));apply();}});
function end(e){pointers.delete(e.pointerId);lastDistance=0;if(!pointers.size){viewport.classList.remove('dragging');startDrag=null;}else{const a=[...pointers.values()][0];startDrag={x:a.x,y:a.y,tx,ty};}}
window.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
canvas.addEventListener('click',e=>{const r=e.target.closest('[data-resident]');if(r&&!moved&&window.IslandResidents){window.IslandResidents.talkTo(r.dataset.resident);return;}const g=e.target.closest('[data-zone]');if(g&&!moved)window.openIslandZone(g.dataset.zone);});
canvas.addEventListener('keydown',e=>{const r=e.target.closest('[data-resident]');if(r&&(e.key==='Enter'||e.key===' ')&&window.IslandResidents){e.preventDefault();window.IslandResidents.talkTo(r.dataset.resident);return;}const g=e.target.closest('[data-zone]');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();window.openIslandZone(g.dataset.zone);}});
const media=matchMedia('(max-width:720px)');function frame(){canvas.setAttribute('viewBox',media.matches?'330 0 800 660':'0 0 1280 720');}media.addEventListener('change',frame);frame();apply();
})();
