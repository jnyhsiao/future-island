/* 中山女高校園 3D 場景（草稿）。Original low-poly geometry built in code with Three.js r149 (assets/three.min.js).
   Building footprints and positions follow OpenStreetMap (© OpenStreetMap contributors, ODbL); heights, colours and
   details are stylised, not a survey model. If WebGL is unavailable this file does nothing and scene.js draws the SVG map.
   Exposes window.Island3D so residents.js can place talking residents, speech bubbles and camera tours. */
(function(){
'use strict';
const viewport=document.getElementById('mapViewport'), home=document.getElementById('islandHome');
if(!viewport||!home||!window.THREE)return;
try{const c=document.createElement('canvas');if(!(c.getContext('webgl')||c.getContext('experimental-webgl')))return;}catch(e){return;}
window.__ISLAND_3D__=true;
home.classList.add('is-3d');
const T=THREE, G=.12, FH=.85; // G: campus ground height, FH: storey height
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
// OSM metres (east, south) around 25.0490N 121.5380E → scene units
const M=(x,z)=>[(x-5)/6,(z+17)/6];

// ---------- helpers ----------
let seed=7;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
const mats={};
function mat(hex,extra){const k=hex+(extra?JSON.stringify(extra):'');if(!mats[k])mats[k]=new T.MeshPhongMaterial(Object.assign({color:hex,flatShading:true,shininess:4,specular:0x0b0b0b},extra||{}));return mats[k];}
function mesh(geo,m,x=0,y=0,z=0,shadow=true){const o=new T.Mesh(geo,(typeof m==='string'||typeof m==='number')?mat(m):m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;return o;}
const boxG=(w,h,d)=>new T.BoxGeometry(w,h,d).translate(0,h/2,0);
const box=(w,h,d,c,x,y,z)=>mesh(boxG(w,h,d),c,x,y,z);
const cyl=(rt,rb,h,c,x,y,z,seg=8)=>mesh(new T.CylinderGeometry(rt,rb,h,seg).translate(0,h/2,0),c,x,y,z);
function group(x=0,y=0,z=0,ry=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;return g;}
function shapeOf(pts,scale=1,cx=0,cz=0){const s=new T.Shape();pts.forEach((p,i)=>{const x=cx+(p.x-cx)*scale,z=cz+(p.z-cz)*scale;i?s.lineTo(x,-z):s.moveTo(x,-z);});return s;}
function inPoly(x,z,pts){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
const P=list=>list.map(([x,z])=>({x,z}));
const PM=list=>list.map(([x,z])=>{const [a,b]=M(x,z);return{x:a,z:b};});
function flat(pts,c,y,extra){const o=new T.Mesh(new T.ShapeGeometry(shapeOf(pts)).rotateX(-Math.PI/2),mat(c,Object.assign({polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1},extra||{})));o.position.y=y;o.receiveShadow=true;return o;}
function rect(x0,z0,x1,z1){return P([[x0,z0],[x1,z0],[x1,z1],[x0,z1]]);}
function plaque(text,w,h,{bg='#f6f1e4',fg='#3b4a42',font='700',ds=false}={}){
 const cv=document.createElement('canvas'),H=96,W=Math.round(H*w/h);cv.width=W;cv.height=H;const c=cv.getContext('2d');
 c.fillStyle=bg;c.fillRect(0,0,W,H);c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';
 let fs=H*.56;c.font=`${font} ${fs}px "Noto Serif TC","Microsoft JhengHei","PingFang TC",serif`;while(c.measureText(text).width>W*.9&&fs>10){fs-=2;c.font=`${font} ${fs}px "Noto Serif TC","Microsoft JhengHei","PingFang TC",serif`;}
 c.fillText(text,W/2,H/2+2);const tx=new T.CanvasTexture(cv);tx.anisotropy=4;
 const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshLambertMaterial({map:tx,side:ds?T.DoubleSide:T.FrontSide}));return m;
}

// ---------- renderer, scene, camera ----------
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.domElement.className='island-canvas';renderer.domElement.setAttribute('aria-hidden','true');
viewport.appendChild(renderer.domElement);
const labelLayer=document.createElement('div');labelLayer.className='label-layer';viewport.appendChild(labelLayer);
const scene=new T.Scene();scene.background=new T.Color('#bcd8dc');scene.fog=new T.Fog('#bcd8dc',80,165);
const camera=new T.PerspectiveCamera(30,1,1,400);
const hemi=new T.HemisphereLight('#ffffff','#a8ad98',.5);scene.add(hemi);
const sun=new T.DirectionalLight('#fff4e0',.6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:1,far:140});sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;
scene.add(sun,sun.target);sun.target.position.set(0,0,0);

// ---------- city ground, roads, neighbourhood ----------
const groundMat=new T.MeshLambertMaterial({color:'#cfd1c6'});
const ground=new T.Mesh(new T.PlaneGeometry(340,340).rotateX(-Math.PI/2),groundMat);ground.receiveShadow=true;scene.add(ground);
const asphalt='#8b9096', walkway='#dcd7ca';
function road(x0,z0,x1,z1,dashAxis){scene.add(flat(rect(x0,z0,x1,z1),asphalt,.01));
 if(dashAxis==='x'){const zc=(z0+z1)/2;for(let x=x0;x<x1;x+=2.4)scene.add(flat(rect(x,zc-.05,x+1.2,zc+.05),'#f2efe4',.02));}
 if(dashAxis==='z'){const xc=(x0+x1)/2;for(let z=z0;z<z1;z+=2.4)scene.add(flat(rect(xc-.05,z,xc+.05,z+1.2),'#f2efe4',.02));}}
road(-170,14.8,170,18,'x');scene.add(flat(rect(-170,14,170,14.8),walkway,.015),flat(rect(-170,18,170,18.8),walkway,.015)); // 長安東路二段
road(-21.6,-170,-18,170,'z');scene.add(flat(rect(-18,-170,-17.3,14),walkway,.015),flat(rect(-22.3,-170,-21.6,170),walkway,.015)); // 建國北路
road(18.1,-170,19.2,14);// 長安東路二段 153 巷
// 建國高架 (elevated expressway)
(function(){const d=group(-19.8,0,0);d.add(box(2.7,.32,340,'#c9c7c0',0,3.3,0));[-1.3,1.3].forEach(x=>d.add(box(.12,.35,340,'#d8d6cf',x,3.62,0)));for(let z=-160;z<=160;z+=6.5)d.add(cyl(.32,.38,3.3,'#bdbbb3',0,0,z,8));d.traverse(o=>{o.castShadow=o.isMesh&&Math.abs(o.position.z)<40;});scene.add(d);})();
// neighbourhood blocks (kept plain so the campus reads first)
(function(){const pal=['#dcd8ce','#cfcbc1','#e4ded1','#c9cdca','#d8d0c3','#c2c7c7','#e0d6c8'];
 for(let gx=-66;gx<=66;gx+=7)for(let gz=-66;gz<=66;gz+=7){
  const x=gx+(rand()-.5)*1.4,z=gz+(rand()-.5)*1.4;
  if(x>-24.5&&x<21.8&&z>-19.5&&z<21.5)continue;
  if((z>12&&z<21)||(x>-24.5&&x<-15)||(x>16.5&&x<21.5&&z<16))continue;
  const w=3.4+rand()*2.2,dd=3.4+rand()*2.2,tall=rand()<.16,near=z>17||(x>19&&z>-24),h=near?.9+rand()*(z>34||x>34?2.6:1.1):tall?7+rand()*6:1.6+rand()*4.4,c=pal[Math.floor(rand()*pal.length)];
  const b=box(w,h,dd,c,x,0,z);b.castShadow=Math.abs(x)<34&&Math.abs(z)<34;scene.add(b);scene.add(box(w*.98,.08,dd*.98,'#b9b6ad',x,h,z));
  if(rand()<.4)scene.add(box(.9,.6,.9,'#a9aca9',x+(rand()-.5)*w*.5,h,z+(rand()-.5)*dd*.5));}
 // two named neighbours that frame the corner across the streets
 const lot=PM([[120.9,-54.6],[148.9,-54.4],[148.7,-39.2],[121.1,-39.5]]);const c=lot.reduce((a,p)=>[a[0]+p.x/4,a[1]+p.z/4],[0,0]);
 const t=box(4.6,8.5,2.6,'#d2cdc3',c[0]+.6,0,c[1]);t.castShadow=true;scene.add(t);
})();

// ---------- campus lot, fence, gate ----------
const LOT=P([[-17.2,-15.5],[17.6,-15.5],[17.6,14],[-13.6,14],[-17.2,10.4]]);
(function(){const s=new T.Mesh(new T.ExtrudeGeometry(shapeOf(LOT),{depth:G,bevelEnabled:false}).rotateX(-Math.PI/2),[mat('#e9e4d6'),mat('#cfc8b6')]);s.receiveShadow=true;scene.add(s);})();
const fenceM='#d9d0bf';
function fence(a,b){const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz),g=group((a[0]+b[0])/2,G,(a[1]+b[1])/2,Math.atan2(-dz,dx));g.add(box(L,.38,.22,fenceM,0,0,0));g.add(box(L,.06,.26,'#b9ae98',0,.38,0));for(let i=0;i<=Math.floor(L/1.6);i++)g.add(box(.05,.55,.05,'#6d7a70',-L/2+i*1.6,.38,0));g.add(box(L,.04,.04,'#6d7a70',0,.9,0));scene.add(g);}
[[[-17.2,-15.5],[17.6,-15.5]],[[17.6,-15.5],[17.6,14]],[[17.6,14],[-13.6,14]],[[-13.6,14],[-14.55,13.05]],[[-16.25,11.35],[-17.2,10.4]],[[-17.2,10.4],[-17.2,-15.5]]].forEach(([a,b])=>fence(a,b));
// main gate on the 建國北路 / 長安東路 corner
(function(){const g=group(-15.4,G,12.2,-Math.PI/4);
 [-1.35,1.35].forEach(x=>g.add(box(.45,2.3,.6,'#ece8de',x,0,0)));
 g.add(box(3.9,.16,1.3,'#d4cdbf',0,2.3,0));g.add(box(4.1,.1,1.4,'#b3a993',0,2.46,0));
 const wall=group(2.75,0,.2);wall.add(box(1.9,1,.35,'#cfc6b4',0,0,0));const p=plaque('臺北市立中山女子高級中學',1.8,.32,{bg:'#3f4d47',fg:'#f3eee0'});p.position.set(0,.62,.18);wall.add(p);g.add(wall);
 for(let i=0;i<6;i++)g.add(box(.04,.9,.04,'#7a857b',-1.05+i*.42,0,-.25));g.add(box(2.3,.05,.05,'#7a857b',0,.85,-.25));
 scene.add(g);})();

// ---------- paths ----------
const pathMat=new T.MeshLambertMaterial({color:'#f3ecda',polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const pathEdge=new T.MeshLambertMaterial({color:'#d8cfb8',polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
const pathCurves=[];
function ribbon(points,width,m,y){const pos=[],idx=[];points.forEach((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l*width/2,nz=dx/l*width/2;pos.push(p.x+nx,y,p.z+nz,p.x-nx,y,p.z-nz);if(i){const k=i*2;idx.push(k-2,k,k-1,k-1,k,k+1);}});const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const o=new T.Mesh(g,m);o.receiveShadow=true;scene.add(o);}
function path(coords,width=1,closed=false,draw=true){const c=new T.CatmullRomCurve3(coords.map(([x,z])=>new T.Vector3(x,G,z)),closed,'centripetal');pathCurves.push(c);if(draw){const p=c.getSpacedPoints(Math.ceil(c.getLength()*2.5));ribbon(p,width+.26,pathEdge,G+.012);ribbon(p,width,pathMat,G+.02);}return c;}
const gatePath=path([[-15.9,12.7],[-14.6,11.4],[-12.6,9.4],[-9.8,9.25],[-4.8,9.2],[0,9.2],[2.8,9.2],[4.05,8.3],[4.05,4.5],[4.05,1.1]],1.05);
const westPath=path([[-15.2,10.9],[-15.3,7],[-15.25,-1.2],[-13.6,-2.8],[-10.3,-2.75],[-8.9,-2.3]],.9);
const plazaPath=path([[5.8,.6],[8.4,1.5],[10.3,2.1],[10.3,4.6],[10.25,8.4],[10.2,11.4]],.9);
const loopPath=path([[-8.8,.95],[-1.2,1],[4.6,.9],[6.2,-.2],[6.25,-4],[6.1,-8],[4.6,-8.75],[-1.5,-8.8],[-7.6,-8.7],[-8.8,-7.5],[-8.85,-4],[-8.8,-.5]],.95,true);

// ---------- props ----------
const windowMats=[];
function winMat(){const m=new T.MeshPhongMaterial({color:'#b9d0d0',flatShading:true,shininess:60,specular:0x445555,emissive:'#ffcf7a',emissiveIntensity:0});windowMats.push(m);return m;}
const WIN=winMat();
function tree(x,z,s=1,kind=0){
 const g=group(x,G,z);
 g.add(cyl(.12*s,.18*s,1.2*s,'#8f7352',0,0,0,6));
 if(kind===1){[['#5f8458',1.1,1.5,.7],['#6c9160',.9,1.3,1.45],['#7e9f66',.64,1.05,2.15]].forEach(([c,r,h,y])=>g.add(mesh(new T.ConeGeometry(r*s,h*s,7).translate(0,h*s/2,0),c,0,y*s,0)));}
 else{const big=kind===2;const crown=mesh(new T.IcosahedronGeometry((big?1.35:.95)*s,0),['#7fa064','#8fac6b','#71935a','#9cb877'][Math.floor(rand()*4)],0,(big?1.9:1.55)*s,0);crown.rotation.set(rand()*3,rand()*3,0);crown.scale.y=big?.85:1.12;g.add(crown);if(rand()<.6)g.add(mesh(new T.IcosahedronGeometry(.6*s,0),'#86a666',.55*s,(big?1.6:1.1)*s,.35*s));}
 g.rotation.y=rand()*6.28;scene.add(g);return g;
}
function bush(x,z,s=1){const b=mesh(new T.IcosahedronGeometry(.42*s,0),'#7d9d60',x,G+.25*s,z);b.scale.y=.7;scene.add(b);if(rand()<.45){[0,1,2].forEach(k=>scene.add(mesh(new T.SphereGeometry(.07,5,4),['#f2c46a','#e98b78','#f6f0e2'][k],x+(rand()-.5)*.6*s,G+.42*s,z+(rand()-.5)*.6*s,false)));}}
const lamps=[];
function lamp(x,z,y=G,h=1.9){const g=group(x,y,z);g.add(cyl(.05,.07,h,'#55685e',0,0,0,6));const bulb=new T.Mesh(new T.SphereGeometry(.17,8,6),new T.MeshBasicMaterial({color:'#f4ecd6'}));bulb.position.y=h+.1;g.add(bulb);g.add(mesh(new T.ConeGeometry(.24,.18,6).translate(0,.09,0),'#55685e',0,h+.22,0));lamps.push(bulb);scene.add(g);}
function bench(x,z,ry=0,parent=scene){const g=group(x,parent===scene?G:0,z,ry);g.add(box(1.5,.1,.42,'#c39d6a',0,.42,0));g.add(box(1.5,.38,.08,'#b88f5d',0,.5,-.2));[-.6,.6].forEach(dx=>g.add(box(.08,.42,.36,'#6f6a5a',dx,0,0)));parent.add(g);return g;}

// 警衛室 just inside the gate
(function(){const g=group(-12.9,G,13.15);g.add(box(1.5,1.35,1.1,'#ece7da',0,0,0));g.add(box(1.7,.12,1.3,'#b56a50',0,1.35,0));
 g.add(mesh(new T.BoxGeometry(.9,.5,.04),WIN,-.1,.85,.56));g.add(mesh(new T.BoxGeometry(.04,.5,.6),WIN,-.76,.85,0));g.add(box(.5,.95,.05,'#7a6a58',.45,0,.56));
 const p=plaque('警衛室',.9,.24);p.position.set(0,1.6,.56);g.add(p);scene.add(g);})();

// ---------- buildings (OSM footprints) ----------
const winMatrices=[], dummy=new T.Object3D(), footprints=[];
function building(ptsM,{floors,wall,trim='#b4684f',roof='#cfcbc0',base='#a99a83',gap=.95,parent=scene,winRow=.52,noWin=false,tanks=1}){
 const pts=PM(ptsM),h=floors*FH;footprints.push(pts);
 let cx=0,cz=0;pts.forEach(p=>{cx+=p.x/pts.length;cz+=p.z/pts.length;});
 const g=new T.Group();parent.add(g);
 const ext=(sc,depth,y,c)=>{const o=new T.Mesh(new T.ExtrudeGeometry(shapeOf(pts,sc,cx,cz),{depth,bevelEnabled:false}).rotateX(-Math.PI/2).translate(0,y,0),mat(c));o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
 ext(1,h,G,wall);ext(1.012,.3,G,base);
 for(let f=1;f<floors;f++)ext(1.01,.08,G+f*FH-.06,trim);
 ext(1.022,.16,G+h,trim);ext(1,.04,G+h+.1,roof);
 for(let k=0;k<tanks;k++){const x=cx+(rand()-.5)*1.5,z=cz+(rand()-.5)*1.5;if(inPoly(x,z,pts))g.add(box(.9,.6,.9,'#dedad0',x,G+h+.1,z));}
 if(!noWin)for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz);if(L<.9)continue;
  let nx=dz/L,nz=-dx/L;if(inPoly((a.x+b.x)/2+nx*.1,(a.z+b.z)/2+nz*.1,pts)){nx=-nx;nz=-nz;}
  const n=Math.floor((L-.3)/gap);if(n<1)continue;
  for(let f=0;f<floors;f++)for(let k=0;k<n;k++){const u=(.15+(k+.5)*(L-.3)/n)/L;dummy.position.set(a.x+dx*u+nx*.02,G+f*FH+FH*winRow,a.z+dz*u+nz*.02);dummy.rotation.set(0,Math.atan2(nx,nz),0);dummy.updateMatrix();winMatrices.push(dummy.matrix.clone());}}
 return{g,pts,h,cx,cz};
}
function facePlaque(text,x,y,z,ry=0,w=1.5){const p=plaque(text,w,.34);p.position.set(x,y,z);p.rotation.y=ry;scene.add(p);return p;}

// ---------- landmarks ----------
const zoneGroups=[], spinners=[];
let blink=null, robotEye=null, flag=null;
function zoneGroup(zone,x=0,z=0,ry=0,y=0){const g=group(x,y,z,ry);g.userData.zone=zone;zoneGroups.push(g);scene.add(g);return g;}

// 05 資源燈塔 → 逸仙樓（1937，市定古蹟；L 型、米黃面磚、圓弧轉角）
(function(){
 const g=zoneGroup('resources');
 const b=building([[-72.4,-29.5],[-61,-29.3],[-60.8,14.8],[23.7,14.9],[23.8,26.5],[-72.6,26.1]],{floors:3,wall:'#d5bd8f',trim:'#b89a68',base:'#9c8460',roof:'#c9bfa9',parent:g,gap:.8,winRow:.5});
 [[-12.9,7.3],[3.1,7.3],[3.1,5.3],[-12.9,-2.1]].forEach(([x,z])=>g.add(cyl(.42,.42,3*FH+.22,'#d5bd8f',x,G,z,12)));
 const porch=group(-4.8,G,7.3);porch.add(box(2.3,2.05,.9,'#cfb487',0,0,.42));porch.add(box(1.1,1.35,.06,'#5d4b3a',0,0,.88));porch.add(box(2.5,.14,1.05,'#b89a68',0,2.05,.42));
 const p=plaque('逸仙樓',1.3,.32,{bg:'#efe4c8',fg:'#5a4632'});p.position.set(0,1.67,.89);porch.add(p);g.add(porch);
})();

// 中山樓、禮堂、莊敬大樓附屬樓、司令台（非互動）
const zs=building([[69.7,-58.6],[69.7,-2.5],[88.1,-1.8],[88.4,-58.6]],{floors:3,wall:'#ebe6db',trim:'#b56a50'});
facePlaque('中山樓',zs.cx,G+2.2,2.53,0,1.2);
const aud=building([[35,53.6],[62.6,54.1],[63.6,.5],[35.9,0]],{floors:3,wall:'#e6e1d6',trim:'#9d6b57',gap:1.6,winRow:.6,tanks:0});
(function(){const r=new T.Mesh(new T.CylinderGeometry(2.45,2.45,8.9,16,1,false,-Math.PI/2,Math.PI).rotateX(-Math.PI/2),mat('#b9bcb6'));r.scale.y=.42;r.position.set(aud.cx,G+3*FH+.16,aud.cz);r.castShadow=true;scene.add(r);})();
facePlaque('大禮堂',aud.cx,G+2.15,11.82,0,1.3);
building([[32,-77.7],[31.9,-71],[41,-70.8],[40.9,-64.9],[87.5,-63.7],[87.6,-76.9]],{floors:3,wall:'#e8e3d8',trim:'#a86450'});
building([[-35,-68.7],[-64.9,-69.3],[-64,-105.4],[-34.9,-104.9]],{floors:4,wall:'#e4dfd3',trim:'#a86450'});
(function(){const g=group(-1.15,G,3.15);g.add(box(2,.55,1.35,'#d8d1c1',0,0,0));[[-.9,-.55],[.9,-.55],[-.9,.55],[.9,.55]].forEach(([x,z])=>g.add(cyl(.05,.05,1.6,'#8b8f86',x,.55,z,5)));g.add(box(2.3,.1,1.6,'#b56a50',0,2.15,0));[0,1,2].forEach(i=>g.add(box(1.4,.12,.3,'#cfc7b5',0,i*.18,-.8-i*.25)));scene.add(g);
 const pole=group(-3.1,G,3.1);pole.add(cyl(.05,.06,4.6,'#cfd2cf',0,0,0,6));flag=group(0,4.5,0);const fl=mesh(new T.PlaneGeometry(1.2,.8).translate(.6,-.4,0),new T.MeshLambertMaterial({color:'#d63a35',side:T.DoubleSide}),0,0,0,false);flag.add(fl);const cn=mesh(new T.PlaneGeometry(.6,.4).translate(.3,-.2,.005),new T.MeshLambertMaterial({color:'#2c3f8f',side:T.DoubleSide}),0,0,0,false);flag.add(cn);const sunM=mesh(new T.CircleGeometry(.1,10).translate(.3,-.2,.01),new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide}),0,0,0,false);flag.add(sunM);pole.add(flag);scene.add(pole);})();

// 01 午餐小屋 → 自強樓（一樓合作社）＋ 廣場上的合作社小攤與餐桌
(function(){
 const g=zoneGroup('lunch');
 const zq=building([[94.5,-93.7],[92.7,-3.3],[105.6,-2.6],[105.8,-93.5]],{floors:4,wall:'#ebe5d8',trim:'#b56a50',parent:g});
 const s=plaque('自強樓',1.4,.36,{ds:true});s.position.set(zq.cx,G+4*FH+.62,1.8);g.add(s);g.add(box(.06,.45,.06,'#7a857b',zq.cx-.5,G+4*FH+.1,1.8),box(.06,.45,.06,'#7a857b',zq.cx+.5,G+4*FH+.1,1.8));
 g.add(flat(P([[9.95,2.75],[14.3,2.75],[14.3,6.4],[12.4,8.8],[9.95,8.8]]),'#efe2c4',G+.006));
 const k=group(12.9,G,3.6);k.add(box(2.2,1.45,1.3,'#f6ecd4',0,0,-.1));k.add(box(2.4,.12,1.5,'#a64f33',0,1.45,-.1));
 for(let i=0;i<6;i++){const st=mesh(new T.BoxGeometry(.4,.05,.75),i%2?'#f7eed3':'#dc8552',-1+i*.4,1.32,.75);st.rotation.x=.38;k.add(st);}
 k.add(box(1.7,.08,.35,'#c7a874',0,.78,.62));k.add(mesh(new T.BoxGeometry(1.5,.62,.05),WIN,0,.95,.56));
 const sign=plaque('合作社・午餐小屋',1.9,.34,{bg:'#c35c3b',fg:'#fffaf0'});sign.position.set(0,1.75,.62);k.add(sign);g.add(k);
 [[11.1,6.9],[13,5.9]].forEach(([x,z],i)=>{
  const t=group(x,G,z);t.add(cyl(.07,.1,.62,'#8c7350',0,0,0,6));t.add(cyl(.62,.62,.07,'#f2e5c2',0,.62,0,10));
  t.add(cyl(.035,.035,2.2,'#8c7350',0,.62,0,5));t.add(mesh(new T.ConeGeometry(1.2,.55,8).translate(0,.27,0),i?'#e7b56f':'#f4ecd2',0,2.55,0));
  [['#d2694a',-.2],['#5f8f7d',.22]].forEach(([c,dx])=>t.add(box(.28,.12,.2,c,dx,.69,.05)));
  [[0,.95],[0,-.95]].forEach(([dx,dz])=>t.add(box(.75,.36,.38,'#c7a874',dx,0,dz)));g.add(t);});
})();

// 02 未來羅盤 → 操場（跑道中央）
const TRACK={cx:-1.3,cz:-3.95,half:2.85,r:3.95,lane:1};
function stadium(r,n=20){const pts=[];for(let i=0;i<=n;i++){const a=-Math.PI/2+i*Math.PI/n;pts.push({x:TRACK.cx+TRACK.half+Math.cos(a)*r,z:TRACK.cz+Math.sin(a)*r});}for(let i=0;i<=n;i++){const a=Math.PI/2+i*Math.PI/n;pts.push({x:TRACK.cx-TRACK.half+Math.cos(a)*r,z:TRACK.cz+Math.sin(a)*r});}return pts;}
(function(){
 const ring=(r0,r1,c,y,off)=>{const s=shapeOf(stadium(r1));s.holes.push(new T.Path(stadium(r0).map(p=>new T.Vector2(p.x,-p.z))));const o=new T.Mesh(new T.ShapeGeometry(s).rotateX(-Math.PI/2),new T.MeshLambertMaterial({color:c,polygonOffset:true,polygonOffsetFactor:off,polygonOffsetUnits:off}));o.position.y=y;o.receiveShadow=true;scene.add(o);};
 ring(TRACK.r-TRACK.lane,TRACK.r,'#c4694c',G+.01,-2);
 scene.add(flat(stadium(TRACK.r-TRACK.lane),'#9dbd78',G+.012,{polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
 [TRACK.r-.67,TRACK.r-.34].forEach(r=>ring(r-.025,r+.025,'#f7f1e6',G+.016,-4));
 const g=zoneGroup('planning',TRACK.cx,TRACK.cz,0,G);
 g.add(cyl(2.3,2.35,.1,'#e3dab9',0,0,0,28));g.add(cyl(1.85,1.85,.13,'#f3ecd5',0,0,0,28));g.add(cyl(1.25,1.25,.15,'#d9d2b3',0,0,0,24));
 const star=new T.Shape();for(let i=0;i<8;i++){const r=i%2?.38:1.15,a=i*Math.PI/4;i?star.lineTo(Math.sin(a)*r,Math.cos(a)*r):star.moveTo(0,r);}
 g.add(mesh(new T.ShapeGeometry(star).rotateX(-Math.PI/2),'#7f9671',0,.16,0,false));
 g.add(cyl(.16,.22,1,'#cfae76',0,.12,0,8));
 const needle=group(0,1.22,0);needle.add(mesh(new T.ConeGeometry(.15,1.1,4).rotateX(Math.PI/2).translate(0,0,.55),'#c8613f'),mesh(new T.ConeGeometry(.15,1.1,4).rotateX(-Math.PI/2).translate(0,0,-.55),'#e9e3cf'));g.add(needle);spinners.push({o:needle,axis:'y',speed:.35,wobble:true});
})();
// courts: basketball (west) and volleyball (east of the track)
(function(){
 [[-15,-14.2,-12.5,-9.2],[-15,-8.7,-12.1,-3.3],[-12.1,-8.7,-9.3,-3.3]].forEach(([x0,z0,x1,z1])=>{scene.add(flat(rect(x0,z0,x1,z1),'#8fb0ab',G+.008));scene.add(flat(rect(x0+.15,(z0+z1)/2-.02,x1-.15,(z0+z1)/2+.02),'#f4f1e8',G+.012));
  [z0+.25,z1-.25].forEach((z,i)=>{const h=group((x0+x1)/2,G,z,i?Math.PI:0);h.add(cyl(.05,.05,2.1,'#6e7872',0,0,-.1,5));h.add(box(.75,.5,.05,'#f4f2ea',0,2,0));h.add(mesh(new T.TorusGeometry(.14,.02,4,10).rotateX(Math.PI/2),'#d0603c',0,2.05,.18,false));scene.add(h);});});
 [[-7.6,-4],[-4,-.3]].forEach(([z0,z1])=>{scene.add(flat(rect(6.9,z0,8.75,z1),'#c9a982',G+.008));const n=group(7.82,G,(z0+z1)/2);[-.95,.95].forEach(x=>n.add(cyl(.03,.03,1.25,'#6e7872',x,0,0,4)));n.add(box(1.9,.32,.02,'#f2f0e8',0,.9,0));scene.add(n);});
})();

// 03 科系航線 → 科學館（實驗室；前方有氣象觀測設備）
(function(){
 const g=zoneGroup('routes');
 const b=building([[91.5,-.7],[105.7,-.3],[104.7,56.7],[79.1,56.1],[79.1,33.9],[91.3,21.8]],{floors:5,wall:'#e7e5da',trim:'#6f8f99',roof:'#c5c9c2',parent:g});
 const p=plaque('科學館',1.3,.34);p.position.set(14.5,G+3.7,12.32);g.add(p);
 g.add(cyl(.04,.05,2.4,'#8c938a',15.6,G+5*FH+.1,4.6,5));
 blink=new T.Mesh(new T.SphereGeometry(.13,8,6),new T.MeshBasicMaterial({color:'#e3563a'}));blink.position.set(15.6,G+5*FH+2.6,4.6);g.add(blink);
 const shelter=group(11.6,G,12.7,.2);shelter.add(box(.12,.85,.12,'#f2f1ec',-.25,0,0),box(.12,.85,.12,'#f2f1ec',.25,0,0));shelter.add(box(.75,.55,.6,'#fbfaf5',0,.85,0));shelter.add(box(.85,.08,.7,'#e8e6de',0,1.4,0));g.add(shelter);
 const mast=group(12.05,G,11.4);mast.add(cyl(.03,.04,2.2,'#9aa29a',0,0,0,5));const cups=group(0,2.25,0);for(let i=0;i<3;i++){const arm=mesh(new T.BoxGeometry(.5,.02,.02).translate(.25,0,0),'#9aa29a');arm.rotation.y=i*Math.PI*2/3;cups.add(arm);const cup=mesh(new T.SphereGeometry(.07,6,4),'#f2f1ec',Math.cos(i*Math.PI*2/3)*.5,0,-Math.sin(i*Math.PI*2/3)*.5);cups.add(cup);}mast.add(cups);g.add(mast);spinners.push({o:cups,axis:'y',speed:2.2});
 const sign=group(10.6,G,13.1);sign.add(cyl(.07,.08,2.4,'#8d7553',0,0,0,6));
 [['#c8613f',2.05,.4],['#5f8f7d',1.65,-.6],['#e1b15c',1.25,1.4],['#7b8fba',.85,-1.9]].forEach(([c,y,r])=>{const b=group(0,y,0,r);b.add(box(1.15,.22,.07,c,.58,0,0));b.add(mesh(new T.ConeGeometry(.16,.24,3).rotateZ(-Math.PI/2),c,1.27,.11,0));sign.add(b);});
 g.add(sign);
})();

// 04 學習工坊 → 莊敬大樓（二樓圖書館）
(function(){
 const g=zoneGroup('workshop');
 const b=building([[-34.9,-104.9],[-35,-78.7],[-33.3,-78.6],[-12.5,-78.3],[13.5,-78],[32,-77.7],[87.6,-76.9],[87.7,-103.1]],{floors:7,wall:'#e9e4d8',trim:'#9b5f4c',parent:g,tanks:3});
 const p=plaque('莊敬大樓・圖書館',2.3,.36);p.position.set(-1.5,G+5.5,-9.99);g.add(p);
 g.add(box(2.2,.1,.9,'#c39d6a',-2.1,G+.75,-9.55));[-3,-1.2].forEach(dx=>g.add(box(.1,.75,.8,'#8b7556',dx,G,-9.55)));
 [-2.7,-2.4,-2.15].forEach((x,i)=>g.add(box(.18,.32,.24,['#c8613f','#5f8f7d','#e1b15c'][i],x,G+.85,-9.6)));
 const robot=group(-1.6,G+.85,-9.5,.3);robot.add(box(.42,.36,.34,'#d6dbd6',0,0,0));robot.add(box(.32,.26,.28,'#e7ebe6',0,.38,0));robot.add(cyl(.015,.015,.22,'#555',0,.64,0,4));
 robotEye=new T.Mesh(new T.BoxGeometry(.22,.06,.02),new T.MeshBasicMaterial({color:'#4ec0a6'}));robotEye.position.set(0,.52,.145);robot.add(robotEye);g.add(robot);
})();

const winMesh=new T.InstancedMesh(new T.BoxGeometry(.48,.42,.04),WIN,winMatrices.length);winMatrices.forEach((m,i)=>winMesh.setMatrixAt(i,m));winMesh.receiveShadow=true;scene.add(winMesh);

// ---------- greenery & lamps ----------
scene.add(flat(rect(-12.6,9.85,3,13.7),'#a9c286',G+.004));scene.add(flat(rect(-12.6,7.55,3,8.6),'#a9c286',G+.004));
scene.add(flat(rect(-16.9,-14.9,-15.6,9.6),'#a9c286',G+.004));
[[-10.2,13.2],[-8.6,10.6],[-7.2,12.9],[-4.9,10.7],[-2.6,12.9],[-.3,10.7],[2,12.8],[-11.6,8.1],[1.8,8.1]].forEach(([x,z],i)=>tree(x,z,1,i<7?2:0));
[[16.6,13.2],[15.3,13.3],[9.3,13.2],[-16.4,-13.8],[-16.3,-10.5],[-16.3,-7],[-16.4,-3.5],[-16.3,0],[-16.4,3.6],[-16.2,7.2],[16.9,-14.6],[16.9,-13.3],[9.3,-14.3],[-8.1,-14.6]].forEach(([x,z],i)=>tree(x,z,.9,i%4===3?1:0));
// street trees along 長安東路 and inside the courtyard behind 逸仙樓
for(let x=-14;x<=17;x+=4.4)tree(x,14.4,.8);
[[-9.9,3.9],[-9.3,-.6],[5.6,-8.4],[9.6,-.9]].forEach(([x,z])=>tree(x,z,.85));
[[-10.9,12.3],[-6.1,11.5],[-1.5,11.5],[.9,13.5],[-11,8.1],[-3,8.1],[13.9,13.2]].forEach(([x,z])=>bush(x,z,1+rand()*.4));
[[-10.8,8.6],[-6.3,8.6],[-1.8,8.6],[2.4,8.6],[-14.6,6],[-14.6,0],[9.8,9.9],[6.5,-6],[-7.8,1.6]].forEach(([x,z])=>lamp(x,z));
for(let x=-30;x<=30;x+=7.5)lamp(x,14.45,.015,2.3);
bench(-8.3,12.9,Math.PI);bench(-3.7,12.9,Math.PI);bench(.8,10.4,0);

// ---------- people ----------
const SKIN=['#f4d6ba','#ecc8a5','#f8dfc9'], HAIR=['#4a3426','#5b4030','#3a2c24','#2e2826','#1f1a17'];
const walkers=[], idlers=[];
function hat(head,kind,color){
 if(kind==='straw'){head.add(mesh(new T.CylinderGeometry(.55,.55,.04,14),color||'#e7cc84',0,.2,0));head.add(mesh(new T.CylinderGeometry(.24,.3,.22,12).translate(0,.11,0),color||'#e7cc84',0,.2,0));head.add(mesh(new T.CylinderGeometry(.305,.305,.06,12),'#c8613f',0,.24,0));}
 if(kind==='chef'){head.add(mesh(new T.CylinderGeometry(.26,.24,.3,12).translate(0,.15,0),'#fbf8f0',0,.2,-.02));head.add(mesh(new T.SphereGeometry(.3,12,8),'#fbf8f0',0,.55,-.02));}
 if(kind==='cap'){const c=mesh(new T.SphereGeometry(.34,12,8,0,Math.PI*2,0,Math.PI*.42),color||'#e9b949',0,.06,-.02);head.add(c);head.add(mesh(new T.BoxGeometry(.4,.03,.26),color||'#e9b949',0,.15,.3));}
 if(kind==='sailor'){head.add(mesh(new T.CylinderGeometry(.33,.3,.16,12).translate(0,.08,0),'#f4f2ea',0,.2,0));head.add(mesh(new T.CylinderGeometry(.36,.36,.03,12),'#2f4f6f',0,.22,0));}
 if(kind==='beret'){const b=mesh(new T.SphereGeometry(.3,12,6),color||'#7b5ea7',.06,.26,-.02);b.scale.y=.4;head.add(b);}
 if(kind==='headphones'){head.add(mesh(new T.TorusGeometry(.35,.035,6,16,Math.PI),color||'#2b2d33',0,.02,-.02));[-.35,.35].forEach(x=>head.add(mesh(new T.CylinderGeometry(.11,.11,.09,12).rotateZ(Math.PI/2),color||'#2b2d33',x,.0,-.02)));}
}
function makeCat(c){const cat=new T.Group();cat.add(box(.5,.24,.22,c,0,.14,0));cat.add(box(.22,.2,.2,c,.32,.3,0));[-.06,.06].forEach(z=>cat.add(mesh(new T.ConeGeometry(.05,.1,4).translate(0,.05,0),c,.36,.48,z)));const tail=mesh(new T.BoxGeometry(.06,.34,.06).translate(0,.17,0),c,-.25,.24,0);tail.rotation.z=.5;cat.add(tail);cat.userData.tail=tail;return cat;}
// uniform: 'school' = 白衣黑裙, 'pe' = 白 T 恤＋小藍褲
function person({shirt='#d98b5f',pants='#4b5a66',hair=0,hairColor='',style=0,glasses=false,skin=0,scale=1,hat:hatKind='',hatColor='',apron='',beard=false,hold='',uniform='',bag='',hood=false,blazer='',skirt=''}={}){
 const g=new T.Group(), body=new T.Group();g.add(body);g.scale.setScalar(scale);
 const sk=SKIN[skin];
 if(uniform)shirt=uniform==='pe'?'#fbfbf6':'#f7f6f1';
 const legs=[-.1,.1].map(dx=>{const leg=group(dx,.4,0);
  if(uniform||skirt){leg.add(mesh(new T.BoxGeometry(.12,.4,.13).translate(0,-.2,0),sk));if(uniform)leg.add(mesh(new T.BoxGeometry(.13,.12,.14).translate(0,-.33,0),'#f4f4f0'));leg.add(mesh(new T.BoxGeometry(.14,.07,.21).translate(0,-.365,.03),uniform==='pe'?'#e8e9ee':skirt?'#c9ae8c':'#1f1f22'));}
  else leg.add(mesh(new T.BoxGeometry(.13,.4,.15).translate(0,-.2,0),pants));
  body.add(leg);return leg;});
 body.add(cyl(.17,.24,.5,blazer||shirt,0,.36,0,8));
 if(blazer)body.add(box(.16,.42,.05,shirt,0,.42,.2));
 if(hood)body.add(mesh(new T.TorusGeometry(.17,.07,6,12).rotateX(Math.PI/2),shirt,0,.88,-.06));
 if(uniform==='school'||skirt)body.add(mesh(new T.CylinderGeometry(.18,.3,skirt?.32:.28,10).translate(0,skirt?.16:.14,0),skirt||'#24262b',0,skirt?.14:.2,0));
 if(uniform==='pe')body.add(mesh(new T.CylinderGeometry(.2,.235,.15,10).translate(0,.075,0),'#2d4ea0',0,.28,0));
 if(apron)body.add(mesh(new T.BoxGeometry(.3,.42,.04),apron,0,.55,.21));
 if(bag)body.add(box(.34,.4,.16,bag,0,.42,-.25));
 const arms=[-.25,.25].map(dx=>{const arm=group(dx,.8,0);arm.rotation.z=dx<0?-.18:.18;
  if(uniform){arm.add(mesh(new T.BoxGeometry(.09,.36,.1).translate(0,-.18,0),sk));arm.add(mesh(new T.BoxGeometry(.12,.14,.13).translate(0,-.06,0),shirt));}
  else arm.add(mesh(new T.BoxGeometry(.1,.36,.11).translate(0,-.18,0),blazer||shirt));
  body.add(arm);return arm;});
 if(hold==='laptop'){const l=group(0,.62,.3);l.add(box(.42,.03,.3,'#c9ccd0',0,0,0));const scr=box(.42,.28,.02,'#3e5566',0,0,-.14);scr.rotation.x=-.35;l.add(scr);body.add(l);arms.forEach(a=>a.rotation.x=-.9);}
 if(hold==='book')body.add(box(.3,.36,.06,'#c8613f',.18,.42,.24));
 if(hold==='map'){const m=mesh(new T.BoxGeometry(.46,.32,.02),'#f1e3b8',0,.75,.3);m.rotation.x=-.5;body.add(m);arms.forEach(a=>a.rotation.x=-1.1);}
 // held props sit in the left hand (arms[0]); the right arm stays free for waving
 const L=arms[0];
 if(hold==='mic'){L.rotation.x=-2.2;L.rotation.z=-.05;const m=group(0,-.36,0);m.add(cyl(.03,.035,.24,'#2b2d33',0,0,0,6));m.add(mesh(new T.SphereGeometry(.065,8,6),'#9aa0a6',0,.27,0));L.add(m);}
 if(hold==='clap'){L.rotation.x=-1.1;const c=group(0,-.4,.05);c.add(box(.38,.26,.03,'#26282c',0,0,0));c.add(box(.38,.07,.035,'#f4f2ea',0,.26,0));for(let i=0;i<4;i++)c.add(box(.05,.07,.04,'#26282c',-.14+i*.09,.26,0));L.add(c);}
 if(hold==='board'){const m=group(0,.72,.32);m.rotation.x=-.45;m.add(mesh(new T.BoxGeometry(.56,.4,.03),'#fbfaf5'));m.add(mesh(new T.TorusGeometry(.08,.012,4,14),'#3d5a80',-.12,.04,.02));m.add(mesh(new T.BoxGeometry(.2,.015,.01),'#c8613f',.12,.08,.02));m.add(mesh(new T.BoxGeometry(.16,.015,.01),'#3d5a80',.1,-.02,.02));m.add(mesh(new T.BoxGeometry(.24,.015,.01),'#3d5a80',.04,-.1,.02));body.add(m);arms.forEach(a=>a.rotation.x=-1.1);}
 if(hold==='folder'){L.rotation.x=-.6;const f=group(0,-.34,.08);f.add(box(.3,.38,.05,'#e9dfc7',0,-.19,0));f.add(box(.26,.3,.06,'#f8f6f0',.02,-.15,0));L.add(f);}
 const head=group(0,1.12,0);body.add(head);
 head.add(mesh(new T.SphereGeometry(.31,12,10),sk));
 const hc=hairColor||HAIR[hair];
 const cap=mesh(new T.SphereGeometry(.335,12,8,0,Math.PI*2,0,Math.PI*.42),hc,0,.03,-.07);cap.rotation.x=-.35;head.add(cap);
 const back=mesh(new T.SphereGeometry(.32,10,8,0,Math.PI*2,Math.PI*.35,Math.PI*.4),hc,0,-.04,-.06);back.scale.set(1.03,1.15,1);head.add(back);
 if(style===1)head.add(mesh(new T.SphereGeometry(.13,8,6),hc,0,.05,-.38));
 if(style===2)[-.25,.25].forEach(dx=>head.add(mesh(new T.SphereGeometry(.12,8,6),hc,dx,-.15,-.05)));
 if(style===3)head.add(mesh(new T.BoxGeometry(.52,.5,.14).translate(0,-.22,0),hc,0,0,-.22));
 if(style===4)[-.27,.27].forEach(dx=>head.add(mesh(new T.BoxGeometry(.1,.2,.34).translate(0,-.06,0),hc,dx,-.02,-.04)));
 if(style===5){head.add(mesh(new T.BoxGeometry(.54,.42,.14).translate(0,-.2,0),hc,0,-.02,-.22));[-.28,.28].forEach(dx=>head.add(mesh(new T.BoxGeometry(.1,.42,.3).translate(0,-.2,0),hc,dx,0,-.05)));}
 [-.11,.11].forEach(dx=>head.add(mesh(new T.SphereGeometry(.035,6,4),'#1d1d1d',dx,-.02,.29,false)));
 [-.17,.17].forEach(dx=>head.add(mesh(new T.SphereGeometry(.045,6,4),'#f1a99a',dx,-.1,.25,false)));
 if(glasses)[-.11,.11].forEach(dx=>head.add(mesh(new T.TorusGeometry(.075,.013,4,10),'#1f1f1f',dx,-.02,.31,false)));
 if(beard){const b=mesh(new T.SphereGeometry(.22,10,6,0,Math.PI*2,Math.PI*.5,Math.PI*.5),'#e9e6dc',0,-.1,.1);head.add(b);}
 if(hatKind)hat(head,hatKind,hatColor);
 g.userData={legs,arms,body,head};return g;
}
function walker(curve,opts,speed=.018,u=rand(),loop=false){const p=person(Object.assign({scale:1.1},opts));scene.add(p);const w={p,curve,u,dir:loop?1:(rand()<.5?1:-1),loop,speed:speed*(.8+rand()*.4)/curve.getLength()*12,phase:rand()*6,pause:0,run:opts.uniform==='pe'};walkers.push(w);return p;}
function seated(x,z,ry,opts){const p=person(Object.assign({scale:1.05},opts));p.position.set(x,G+.06,z);p.rotation.y=ry;const d=p.userData;d.legs.forEach(l=>l.rotation.x=-1.4);d.body.position.y=.03;scene.add(p);idlers.push({p,phase:rand()*6,kind:'talk'});return p;}
function standing(x,z,ry,opts,kind='idle'){const p=person(Object.assign({scale:1.1},opts));p.position.set(x,G,z);p.rotation.y=ry;scene.add(p);idlers.push({p,phase:rand()*6,kind});return p;}
const stu=i=>({uniform:'school',hair:4-(i%3===0?1:0),style:[3,1,2,0,3][i%5],skin:i%3,glasses:i%4===1,bag:i%3===0?['#3d5a80','#7a4f3a','#4f6b58'][i%3]:''});
const pe=i=>({uniform:'pe',hair:4,style:[1,1,2,0][i%4],skin:i%3});

seated(11.1,6.9+.95,Math.PI,stu(1));seated(11.1,6.9-.95,0,stu(2));seated(13,5.9-.95,0,stu(3));
standing(-7.6,11.3,1.9,stu(4),'talk');standing(-6.8,11.8,-2.4,stu(5),'talk');standing(.9,11.9,.4,stu(6),'look');
standing(-13.6,-6.2,.3,pe(1),'look');
// non-chat characters: they just say their lines in turn (on a timer, or when clicked)
const npcs=[];
function npc(id,name,icon,p,lines,every,first){p.userData.npc=id;const n={id,name,icon,p,lines,i:0,every,next:first};npcs.push(n);return n;}
function npcSay(n){bubble(n.p,n.lines[n.i%n.lines.length],4800);n.i++;n.next=t+n.every;}
const guard=standing(-13.4,12.15,.7,{shirt:'#2f3e5c',pants:'#2a2f3a',hair:0,hairColor:'#a39e97',hat:'cap',hatColor:'#2f3e5c',scale:1.22},'look');
npc('guard','警衛北北','🛵',guard,['我們現在有外送囉 🛵'],14,4);
// 水水校長 stands in front of the 司令台, facing the field side
const principal=standing(.95,1.75,.35,{shirt:'#f6efd4',skirt:'#1f2024',hair:3,hairColor:'#6a3b2f',style:5,scale:1.3},'talk');
npc('principal','水水校長','🎓',principal,['129年校慶在12月5日，等你來唷！','百三傳承．跨代共榮。','~流光歸岸~'],9,2);
const ballKids=[standing(7.82,-6.9,0,pe(2),'ball'),standing(7.82,-4.7,Math.PI,pe(3),'ball')];
const ball=mesh(new T.IcosahedronGeometry(.16,1),'#f6f2e6');scene.add(ball);

const trackLine=new T.CatmullRomCurve3(stadium(TRACK.r-.5,12).slice(0,-1).map(p=>new T.Vector3(p.x,G,p.z)),true,'centripetal');pathCurves.push(trackLine);
for(let i=0;i<5;i++)walker(trackLine,pe(i),.05,i/5+rand()*.05,true);
[gatePath,gatePath,gatePath,westPath,plazaPath,plazaPath].forEach((c,i)=>walker(c,Object.assign(stu(i+8),{hold:i===2?'book':''}),.02));
for(let i=0;i<4;i++)walker(loopPath,stu(i+14),.02,i/4,true);

// cat in the front garden
const cat=makeCat('#e39b52');cat.position.set(-8,G,11.2);scene.add(cat);const pets=[];

// ---------- traffic ----------
const cars=[];
function car(c,axis,lane,dir,y,speed,start){const g=new T.Group();g.add(box(1.5,.36,.68,c,0,.14,0));g.add(box(.82,.3,.6,'#e8ecef',-.05,.5,0));if(axis==='z')g.rotation.y=Math.PI/2;if(dir<0)g.rotation.y+=Math.PI;g.position.set(axis==='x'?start:lane,y,axis==='x'?lane:start);g.traverse(o=>{if(o.isMesh)o.castShadow=false;});scene.add(g);cars.push({g,axis,dir,speed});}
const carC=['#f2f0ea','#c94b3c','#3d5a80','#e1b15c','#5f8f7d','#8a8f96','#f6d35a'];
for(let i=0;i<7;i++)car(carC[i%carC.length],'x',i%2?15.6:17.2,i%2?-1:1,.015,3+rand()*1.5,-60+i*17);
for(let i=0;i<6;i++)car(carC[(i+3)%carC.length],'z',i%2?-20.4:-19.2,i%2?1:-1,3.62,4+rand()*2,-60+i*20);

// ---------- sky life ----------
const clouds=[],cloudMat=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false}); // clouds only cast soft shadows
for(let i=0;i<6;i++){const c=new T.Group();const n=3+Math.floor(rand()*3);for(let k=0;k<n;k++){const s=new T.Mesh(new T.IcosahedronGeometry(1+rand()*1.2,0),cloudMat);s.position.set(k*1.5-n*.7,rand()*.6,rand()*1.2);s.scale.y=.65;s.castShadow=true;c.add(s);}c.position.set(-60+i*22,22+rand()*4,-25+rand()*45);c.userData.speed=.6+rand()*.5;scene.add(c);clouds.push(c);}
const birds=[];
for(let i=0;i<5;i++){const g=new T.Group();const wm=new T.MeshBasicMaterial({color:'#f8f8f2',side:T.DoubleSide});const wings=[-1,1].map(s=>{const w=new T.Mesh(new T.PlaneGeometry(.7,.22).translate(s*.35,0,0),wm);g.add(w);return w;});g.userData={wings,r:12+i*3,a:i*1.3,h:11+i*.8,sp:.18+i*.03};scene.add(g);birds.push(g);}

// ---------- beacon (guidance ring) ----------
const beacon=new T.Group();beacon.visible=false;scene.add(beacon);
(function(){const ringM=new T.MeshBasicMaterial({color:'#f3b35f',transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide});for(let i=0;i<2;i++){const r=new T.Mesh(new T.RingGeometry(1.4,1.72,40).rotateX(-Math.PI/2),ringM.clone());r.position.y=G+.06;beacon.add(r);}
 const col=new T.Mesh(new T.CylinderGeometry(.8,1.4,9,20,1,true).translate(0,4.5,0),new T.MeshBasicMaterial({color:'#ffe2a6',transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));col.position.y=G;beacon.add(col);})();
let beaconUntil=0;

// ---------- time of day ----------
const TIMES={
 dawn:{bg:'#efd8c6',hemi:['#ffe6cc','#8f9a88',.48],sun:['#ffc7a0',.55,[-34,16,22]],ground:'#d6cdc0',win:.25,lamp:.4},
 day:{bg:'#bcd8dc',hemi:['#ffffff','#a8ad98',.5],sun:['#fff4e0',.6,[24,42,28]],ground:'#cfd1c6',win:0,lamp:0},
 dusk:{bg:'#e3b79c',hemi:['#ffcfaa','#7d8278',.42],sun:['#ff9e66',.6,[38,12,-12]],ground:'#c4b8ab',win:.65,lamp:.8},
 night:{bg:'#203548',hemi:['#7d94bb','#2f3a40',.44],sun:['#a3b8e0',.26,[-22,34,-12]],ground:'#55606a',win:.8,lamp:1}
};
const lampOff=new T.Color('#f4ecd6'),lampOn=new T.Color('#ffd27a');
let dirty=true;
function setTime(name){
 const t=TIMES[name]||TIMES.day;
 scene.background.set(t.bg);scene.fog.color.set(t.bg);
 hemi.color.set(t.hemi[0]);hemi.groundColor.set(t.hemi[1]);hemi.intensity=t.hemi[2];
 sun.color.set(t.sun[0]);sun.intensity=t.sun[1];sun.position.set(t.sun[2][0],t.sun[2][1],t.sun[2][2]);
 groundMat.color.set(t.ground);
 windowMats.forEach(m=>m.emissiveIntensity=t.win);
 lamps.forEach(l=>l.material.color.copy(lampOff).lerp(lampOn,t.lamp));
 home.dataset.time=name;home.style.setProperty('--scene-bg',t.bg);
 document.querySelectorAll('[data-time]').forEach(b=>{const on=b.dataset.time===name;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 dirty=true;
}

// ---------- labels & bubbles (HTML overlays) ----------
const ZONES=[
 {id:'lunch',n:'01',title:'午餐小屋',sub:'自強樓合作社・預約午餐',at:[12.1,2.9,3.4],ring:[9.4,-3.2],view:{theta:-.15,phi:.72}},
 {id:'planning',n:'02',title:'未來羅盤',sub:'操場・填寫升學規劃',at:[TRACK.cx,2.5,TRACK.cz],ring:[TRACK.cx,TRACK.cz]},
 {id:'routes',n:'03',title:'科系航線',sub:'科學館・探索科系',at:[15.3,G+5*FH+.9,10.6],ring:[10.4,11.2],view:{theta:-.3,phi:.8}},
 {id:'workshop',n:'04',title:'學習工坊',sub:'莊敬大樓圖書館・整理經驗',at:[2,G+7*FH+1.1,-12.4],ring:[-2.6,-9.2]},
 {id:'resources',n:'05',title:'資源燈塔',sub:'逸仙樓教務處・官方資訊',at:[-7.5,G+3*FH+1.1,6.3],ring:[-3.5,8.5]}
];
const overlays=[]; // {el, pos:()=>Vector3|null, z:number}
ZONES.forEach(z=>{
 const b=document.createElement('button');b.type='button';b.className='map-hotspot pin3d';b.dataset.zone=z.id;b.setAttribute('aria-label',z.title+'：'+z.sub);
 b.innerHTML=`<span class="pin-pill"><span class="pin-n">${z.n}</span><b>${z.title}</b><small>${z.sub}</small></span><i class="pin-stalk" aria-hidden="true"></i>`;
 b.addEventListener('click',e=>{e.stopPropagation();api.focusZone(z.id);window.openIslandZone(z.id);});
 labelLayer.appendChild(b);z.el=b;z.v=new T.Vector3(...z.at);overlays.push({el:b,pos:()=>z.v,base:1000});
});
const tmp=new T.Vector3(),tmp2=new T.Vector3();
function placeOverlays(){
 const w=viewport.clientWidth,h=viewport.clientHeight;
 overlays.forEach(o=>{const p=o.pos();if(!p||o.el.hidden){o.el.style.visibility='hidden';return;}tmp.copy(p).project(camera);const vis=tmp.z<1&&Math.abs(tmp.x)<1.1&&Math.abs(tmp.y)<1.1;o.el.style.visibility=vis?'':'hidden';if(!vis)return;
  const x=(tmp.x+1)/2*w,y=(1-tmp.y)/2*h;o.el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;o.el.style.zIndex=String(o.base-Math.round(tmp.z*900));});
}
function headPos(p,out){out.set(0,0,0);p.userData.head.getWorldPosition(out);out.y+=.75*p.scale.y;return out;}
function bubble(p,text,ms=4200){
 if(!p)return;
 if(p.userData.bubble){p.userData.bubble.remove();overlays.splice(overlays.findIndex(o=>o.el===p.userData.bubble),1);}
 const el=document.createElement('div');el.className='speech-bubble';el.textContent=text;el.setAttribute('aria-hidden','true');labelLayer.appendChild(el);
 const v=new T.Vector3();const o={el,pos:()=>{headPos(p,v);v.y+=.55*p.scale.y;return v;},base:3000};overlays.push(o);p.userData.bubble=el;
 requestAnimationFrame(()=>el.classList.add('show'));
 clearTimeout(p.userData.bubbleTimer);
 p.userData.bubbleTimer=setTimeout(()=>{el.classList.remove('show');setTimeout(()=>{el.remove();const i=overlays.indexOf(o);if(i>=0)overlays.splice(i,1);if(p.userData.bubble===el)p.userData.bubble=null;},300);},ms);
 dirty=true;
}

// ---------- residents (named characters, filled by residents.js) ----------
const residents={}, residentMeshes=[];
let onResidentClick=null;
function addResident(def){
 const p=person(Object.assign({scale:1.32},def.look||{}));
 p.position.set(def.pos[0],G,def.pos[1]);p.rotation.y=def.ry||0;p.userData.resident=def.id;p.userData.baseRy=def.ry||0;scene.add(p);
 p.traverse(o=>{if(o.isMesh)residentMeshes.push(o);});
 const tag=document.createElement('button');tag.type='button';tag.className='resident-tag';tag.dataset.resident=def.id;
 tag.setAttribute('aria-label','和'+def.name+'聊天（'+def.role+'）');
 tag.innerHTML=`<span class="rt-dot" aria-hidden="true">💬</span><b>${def.name}</b>`;
 tag.addEventListener('click',e=>{e.stopPropagation();onResidentClick&&onResidentClick(def.id);});
 labelLayer.appendChild(tag);const v=new T.Vector3();overlays.push({el:tag,pos:()=>headPos(p,v),base:2000});
 if(def.look&&def.look.pet==='cat'){const c=makeCat('#d8d2c6');c.position.set(def.pos[0]+.75,G,def.pos[1]+.35);c.rotation.y=-.6;c.scale.setScalar(1.25);scene.add(c);pets.push(c);}
 residents[def.id]={def,p,tag,wave:0,talking:false};
 idlers.push({p,phase:rand()*6,kind:def.idle||'idle',resident:residents[def.id]});
 return residents[def.id];
}

npcs.forEach(n=>{const tag=document.createElement('button');tag.type='button';tag.className='resident-tag npc-tag';tag.dataset.npc=n.id;tag.setAttribute('aria-label',n.name);tag.innerHTML=`<span class="rt-dot" aria-hidden="true">${n.icon}</span><b>${n.name}</b>`;
 tag.addEventListener('click',e=>{e.stopPropagation();npcSay(n);});labelLayer.appendChild(tag);const v=new T.Vector3();overlays.push({el:tag,pos:()=>headPos(n.p,v),base:2000});});

// ---------- camera control ----------
const DEF={tx:.6,tz:.4,theta:.45,phi:.93,zoom:1};
const cam=Object.assign({},DEF);let baseDist=70,tween=null;
function fit(){
 const w=viewport.clientWidth||1,h=viewport.clientHeight||1,aspect=w/h;
 renderer.setSize(w,h,false);camera.aspect=aspect;
 const phone=matchMedia('(max-width:720px)').matches,wide=w>1120&&!phone;
 baseDist=phone?Math.min(175,70/Math.max(aspect,.4)):aspect>=1.25?70:70*Math.min(1.6,1.3/aspect);
 const chat=home.classList.contains('chat-open');
 camera.setViewOffset(w,h,wide?(chat?Math.min(w*.06,120):-Math.min(w*.1,190)):0,phone?(chat?h*.16:-h*.06):wide?h*.01:0,w,h);
 camera.updateProjectionMatrix();dirty=true;
}
function applyCam(){
 const d=baseDist/cam.zoom;
 camera.position.set(cam.tx+d*Math.sin(cam.phi)*Math.sin(cam.theta),d*Math.cos(cam.phi),cam.tz+d*Math.sin(cam.phi)*Math.cos(cam.theta));
 camera.lookAt(cam.tx,0,cam.tz);
 const r=document.getElementById('zoomReadout');if(r)r.textContent=Math.round(cam.zoom*100)+'%';
 dirty=true;
}
const clampZoom=z=>Math.max(.8,Math.min(2.6,z));
function changeZoom(mult){tween=null;cam.zoom=clampZoom(cam.zoom*mult);applyCam();}
function animateTo(dest,ms=900){const from=Object.assign({},cam);let dTheta=(dest.theta??from.theta)-from.theta;dTheta=Math.atan2(Math.sin(dTheta),Math.cos(dTheta));if(reducedMotion)ms=1;tween={from,to:Object.assign({},from,dest,{theta:from.theta+dTheta}),t0:performance.now(),ms};}
// buildings can hide a spot, so some zones carry their own camera angle
function focusPoint(x,z,zoom=1.6,ms=1000,view){const th=view?view.theta:cam.theta;animateTo(Object.assign({tx:x-Math.sin(th)*2,tz:z-Math.cos(th)*2,zoom:Math.max(.8,zoom)},view||{}),ms);}
const api={
 reset(){animateTo(DEF);},
 zoom:changeZoom,
 setTime,
 focusZone(id,zoom){const z=ZONES.find(o=>o.id===id);if(z)focusPoint(z.at[0],z.at[2],zoom||Math.max(cam.zoom,1.5),1000,z.view);},
 focusResident(id,zoom=2.1){const r=residents[id];if(!r)return;const z=ZONES.find(o=>o.id===r.def.zone);focusPoint(r.p.position.x,r.p.position.z,zoom,1000,r.def.view||(z&&z.view));},
 beacon(id,ms=7000){const z=ZONES.find(o=>o.id===id);if(!z)return;beacon.position.set(z.ring[0],0,z.ring[1]);beacon.visible=true;beaconUntil=performance.now()+ms;dirty=true;},
 addResident,
 say(id,text,ms){const r=residents[id];if(r)bubble(r.p,text,ms);},
 ambient(text){const vis=walkers.filter(w=>{if(w.run)return false;headPos(w.p,tmp2).project(camera);return tmp2.z<1&&Math.abs(tmp2.x)<.8&&Math.abs(tmp2.y)<.8;});const w=vis[Math.floor(Math.random()*vis.length)];if(w){w.pause=4;bubble(w.p,text,3800);}},
 setTalking(id,on){Object.values(residents).forEach(r=>{r.talking=on&&r.def.id===id;r.tag.classList.toggle('talking',r.talking);});if(on&&residents[id])residents[id].wave=1.6;dirty=true;},
 wave(id){const r=residents[id];if(r)r.wave=1.6;},
 onResident(fn){onResidentClick=fn;},
 refit:fit,
 zones:ZONES.map(z=>z.id)
};
window.Island3D=api;window.IslandMap={reset:api.reset,zoom:changeZoom,focus:api.focusZone,setTime};
document.getElementById('zoomIn').onclick=()=>changeZoom(1.15);
document.getElementById('zoomOut').onclick=()=>changeZoom(1/1.15);
document.getElementById('resetView').onclick=api.reset;

const pointers=new Map();let drag=null,pinch=0,twist=0,moved=false;
const PAN={x0:-15.5,x1:16,z0:-14,z1:13.5}; // keep the view centre inside the campus
const canvas=renderer.domElement;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();changeZoom(e.deltaY<0?1.07:1/1.07);},{passive:false});
viewport.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});tween=null;moved=false;
 drag={x:e.clientX,y:e.clientY,pan:!(e.button===2||e.shiftKey),theta:cam.theta,phi:cam.phi,tx:cam.tx,tz:cam.tz};
 if(pointers.size===2){const a=[...pointers.values()];pinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);twist=Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);drag=Object.assign(drag,{pan:true,x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2});}
 viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');});
viewport.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId)){hover(e);return;}
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 let px=e.clientX,py=e.clientY;
 if(pointers.size===2){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),ang=Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);if(pinch)cam.zoom=clampZoom(cam.zoom*d/pinch);if(pinch){let da=ang-twist;da=Math.atan2(Math.sin(da),Math.cos(da));cam.theta-=da;drag.theta-=da;}pinch=d;twist=ang;px=(a[0].x+a[1].x)/2;py=(a[0].y+a[1].y)/2;}
 const dx=px-drag.x,dy=py-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;
 if(drag.pan){const k=baseDist/cam.zoom/viewport.clientHeight*.9,s=Math.sin(cam.theta),c=Math.cos(cam.theta);let tx=drag.tx-(dx*c*.48+dy*s/Math.cos(cam.phi)*.6)*k,tz=drag.tz-(-dx*s*.48+dy*c/Math.cos(cam.phi)*.6)*k;cam.tx=Math.max(PAN.x0,Math.min(PAN.x1,tx));cam.tz=Math.max(PAN.z0,Math.min(PAN.z1,tz));}
 else{cam.theta=drag.theta-dx*.006;cam.phi=Math.max(.6,Math.min(1.15,drag.phi-dy*.004));}
 applyCam();});
function endPointer(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);pinch=0;
 if(!pointers.size){viewport.classList.remove('dragging');if(!moved&&e.type==='pointerup')pick(e);drag=null;}
 else{const a=[...pointers.values()][0];drag={x:a.x,y:a.y,pan:false,theta:cam.theta,phi:cam.phi,tx:cam.tx,tz:cam.tz};}}
viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);

const ray=new T.Raycaster(),ndc=new T.Vector2();
function hitAt(e){
 const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
 const hit=ray.intersectObjects(residentMeshes.concat(zoneGroups,npcs.map(n=>n.p)),true)[0];let o=hit&&hit.object;
 while(o&&!o.userData.zone&&!o.userData.resident&&!o.userData.npc)o=o.parent;
 return o?{zone:o.userData.zone||'',resident:o.userData.resident||'',npc:o.userData.npc||''}:{zone:'',resident:'',npc:''};
}
function pick(e){const h=hitAt(e);if(h.npc){npcSay(npcs.find(n=>n.id===h.npc));return;}if(h.resident&&onResidentClick)onResidentClick(h.resident);else if(h.zone){api.focusZone(h.zone);window.openIslandZone(h.zone);}}
let hoverKey='';function hover(e){if(e.pointerType==='touch')return;const h=hitAt(e),k=h.resident||h.zone;if(k!==hoverKey){hoverKey=k;canvas.style.cursor=k?'pointer':'';ZONES.forEach(o=>o.el.classList.toggle('hover',o.id===h.zone));Object.values(residents).forEach(r=>r.tag.classList.toggle('hover',r.def.id===h.resident));if(h.resident)api.wave(h.resident);}}

// ---------- time & motion UI ----------
document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>setTime(b.dataset.time)));
const hr=new Date().getHours();setTime(hr>=19||hr<5?'night':hr<7?'dawn':hr>=17?'dusk':'day');
const legend=document.querySelector('.map-legend span');if(legend&&legend.firstChild)legend.firstChild.textContent='拖曳移動 · 右鍵或雙指旋轉 · 點人物聊天 · 校舍位置 © OpenStreetMap 貢獻者 · ';

// ---------- animation loop ----------
const clock=new T.Clock();let t=0;
const up=new T.Vector3(),fwd=new T.Vector3();
function faceCamera(p,k){const a=Math.atan2(camera.position.x-p.position.x,camera.position.z-p.position.z);let d=a-p.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));p.rotation.y+=d*k;}
function step(dt){
 t+=dt;
 walkers.forEach(w=>{
  const d=w.p.userData;
  if(w.pause>0){w.pause-=dt;faceCamera(w.p,.08);d.legs[0].rotation.x=d.legs[1].rotation.x=0;d.arms[1].rotation.x=-.4+Math.sin(t*6)*.5;d.arms[1].rotation.z=.6;return;}
  d.arms[1].rotation.z=.18;
  w.u+=w.speed*w.dir*dt;
  if(w.loop)w.u=(w.u%1+1)%1;else{if(w.u>1){w.u=1;w.dir=-1;}if(w.u<0){w.u=0;w.dir=1;}}
  w.curve.getPointAt(w.u,up);w.curve.getTangentAt(w.u,fwd);
  const side=w.loop?0:(w.phase>3?.3:-.3);w.p.position.set(up.x+fwd.z*side,G,up.z-fwd.x*side);w.p.rotation.y=Math.atan2(fwd.x*w.dir,fwd.z*w.dir);
  const f=w.run?11:7,a=w.run?.9:.55,s=Math.sin(t*f+w.phase);d.legs[0].rotation.x=s*a;d.legs[1].rotation.x=-s*a;d.arms[0].rotation.x=-s*a;d.arms[1].rotation.x=s*a;d.body.position.y=Math.abs(s)*(w.run?.1:.05);d.body.rotation.x=w.run?.15:0;});
 idlers.forEach(i=>{const d=i.p.userData,r=i.resident;
  if(r){
   if(r.talking||r.wave>0)faceCamera(i.p,.1);else{let dr=i.p.userData.baseRy-i.p.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));i.p.rotation.y+=dr*.03;}
   if(r.wave>0){r.wave-=dt;d.arms[1].rotation.z=2.6;d.arms[1].rotation.x=Math.sin(t*10)*.35;}
   else{d.arms[1].rotation.z=.18;d.arms[1].rotation.x=r.talking?-.3+Math.sin(t*3)*.3:0;}
   d.body.position.y=Math.abs(Math.sin(t*2+i.phase))*(r.talking?.05:.02);
   d.head.rotation.z=Math.sin(t*1.4+i.phase)*.06;
   return;
  }
  if(i.kind==='talk'){d.head.rotation.z=Math.sin(t*1.6+i.phase)*.08;d.arms[1].rotation.x=-.3+Math.sin(t*2.4+i.phase)*.35;}
  else if(i.kind==='look'){d.head.rotation.y=Math.sin(t*.7+i.phase)*.5;d.head.rotation.x=-.15;}
  else if(i.kind==='ball'){d.arms.forEach(a=>a.rotation.x=-2.4+Math.sin(t*2.2+i.phase)*.3);}
  else d.head.rotation.y=Math.sin(t*.5+i.phase)*.3;});
 // volleyball: the ball goes back and forth over the net
 const bt=(t*.55)%2,leg=bt<1?bt:2-bt,a=ballKids[0].position,b=ballKids[1].position;ball.position.set(a.x+(b.x-a.x)*leg,G+1.6+Math.sin(leg*Math.PI)*1.8,a.z+(b.z-a.z)*leg);ball.rotation.x+=dt*5;
 pets.forEach((c,i)=>{c.userData.tail.rotation.z=.5+Math.sin(t*3+i)*.35;});
 npcs.forEach(n=>{if(t>n.next)npcSay(n);});
 cat.position.set(-8+Math.cos(t*.25)*1.2,G,11.2+Math.sin(t*.25)*.6);cat.rotation.y=-t*.25+Math.PI/2;cat.userData.tail.rotation.z=.5+Math.sin(t*4)*.3;
 cars.forEach(c=>{const k=c.axis==='x'?'x':'z';c.g.position[k]+=c.dir*c.speed*dt;if(c.g.position[k]>70)c.g.position[k]=-70;if(c.g.position[k]<-70)c.g.position[k]=70;});
 spinners.forEach(s=>{s.o.rotation[s.axis]+=dt*s.speed*(s.wobble?(1+Math.sin(t*.8)*.8):1);});
 if(flag)flag.rotation.y=Math.sin(t*1.3)*.25;
 blink.visible=(t%1.6)<.8;
 robotEye.scale.x=(t%3.5)<.15?.2:1;
 clouds.forEach(c=>{c.position.x+=dt*c.userData.speed;if(c.position.x>70)c.position.x=-70;});
 birds.forEach(b=>{const u=b.userData;u.a+=dt*u.sp;b.position.set(Math.cos(u.a)*u.r,u.h+Math.sin(t+u.r)*.5,Math.sin(u.a)*u.r);b.rotation.y=-u.a;const f=Math.sin(t*9+u.r)*.6;u.wings[0].rotation.z=f;u.wings[1].rotation.z=-f;});
}
function frame(now){
 requestAnimationFrame(frame);
 const dt=Math.min(clock.getDelta(),.05);
 if(viewport.hidden||document.hidden)return;
 if(tween){const k=Math.min(1,(now-tween.t0)/tween.ms),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;for(const key of ['tx','tz','theta','phi','zoom'])cam[key]=tween.from[key]+(tween.to[key]-tween.from[key])*e;applyCam();if(k>=1)tween=null;}
 if(beacon.visible){const k=(now/1000)%1.4/1.4;beacon.children[0].scale.setScalar(.6+k*.9);beacon.children[0].material.opacity=.85*(1-k);const k2=((now/1000)+.7)%1.4/1.4;beacon.children[1].scale.setScalar(.6+k2*.9);beacon.children[1].material.opacity=.85*(1-k2);if(now>beaconUntil)beacon.visible=false;dirty=true;}
 const paused=home.classList.contains('no-motion')||home.classList.contains('reduce-pause');
 if(!paused){step(dt);dirty=true;}
 if(!dirty)return;
 renderer.render(scene,camera);placeOverlays();dirty=false;
}
new ResizeObserver(fit).observe(viewport);
fit();
// gentle fly-in on first load
if(!reducedMotion){Object.assign(cam,{theta:DEF.theta-.9,phi:.75,zoom:.7});applyCam();animateTo(DEF,2400);}else applyCam();
step(0);requestAnimationFrame(frame);
})();
