// Helpers every Draw & Animate test page script starts with (see tools/test-draw-animate.mjs).
// ok(name, condition, info) records a result; R holds them all; errs collects page errors.
const errs=[]; addEventListener('error',e=>errs.push(e.message)); addEventListener('unhandledrejection',e=>errs.push('rej '+(e.reason&&e.reason.message)));
window.confirm=()=>true;
const cv=document.getElementById('cv'); const q=(s)=>document.querySelector(s); const w=(ms)=>new Promise(r=>setTimeout(r,ms));
const ev=(type,x,y)=>{const r=cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:r.left+x*r.width/800,clientY:r.top+y*r.height/600}))};
const tap=async(x,y)=>{ev('pointerdown',x,y); ev('pointerup',x,y); await w(60);};
const drag=async(pts)=>{ev('pointerdown',pts[0][0],pts[0][1]); for(const p of pts.slice(1)) ev('pointermove',p[0],p[1]); ev('pointerup',pts[pts.length-1][0],pts[pts.length-1][1]); await w(60);};
const act=async(a)=>{const b=q('#mainRow [data-act="'+a+'"]'); if(!b) throw new Error('no button '+a+' (have: '+[...document.querySelectorAll('#mainRow [data-act]')].map(x=>x.dataset.act)+')'); b.click(); await w(120);};
const tool=async(t)=>{q('#tools [data-tool="'+t+'"]').click(); await w(60);};
const pic=async(set,fig)=>{await tool('stamp'); q('[data-set="'+set+'"]').click(); await w(60); q('[data-fig="'+fig+'"]').click(); await w(40);};
const D=async()=>{await w(520); return JSON.parse(localStorage.getItem('zone210_drawanim'));};
const things=async()=>(await D()).scene.things;
const note=()=>q('#note').textContent;
const R={}; const ok=(name,cond,info)=>{R[name]=cond?'ok':('FAIL '+(info===undefined?'':JSON.stringify(info)).slice(0,300));};
const pen=(x,y,n=6)=>Array.from({length:n},(_,i)=>[x+i*12,y+(i%2)*8]);
