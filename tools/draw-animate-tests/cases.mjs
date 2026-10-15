// Draw & Animate test cases, run by tools/test-draw-animate.mjs. Each case starts the page with a saved drawing
// (`save`), then runs `js` in the page after tools/draw-animate-tests/page-lib.js, recording results with ok().
// `w`/`h` set the window size (default 800 x 1000).

/** A drawing on the stage: a person, animal or thing by id, or (with null) a short red pen line. */
export const thing = (fig, x = 200, y = 300, move = "stay") => ({
  s: fig ? [{ fig, sk: 2, hc: -1, w: 110, p: [0, 0] }] : [{ c: "#e5484d", w: 10, e: 0, p: [-40, 0, 0, 20, 40, 0] }],
  x, y, move, act: "none", speed: 1, face: true, path: null,
});
export const scene = (things) => ({ mode: "scene", scene: { bg: "paper", things }, flip: { frames: [[]], fps: 6, onion: true } });
export const flipbook = (frames) => ({ mode: "flip", scene: { bg: "paper", things: [] }, flip: { frames, bgs: frames.map(() => "paper"), fps: 6, onion: true } });

// ---------- things a child does, with what should happen ----------
export const CASES = [
  { name: "limit30", save: scene([]), js: String.raw`
await act('new'); await pic('walkers','walk-camel');
for (let i=0;i<30;i++) await tap(60+(i%6)*130, 60+Math.floor(i/6)*110);
await act('done'); const t=await things(); ok('limit30', t.length===24 && t[23].s.length===7, {n:t.length, note:note()}); R.limit30_note=note()+' | things='+t.length;
` },
  { name: "limitDraw", save: scene(Array.from({ length: 24 }, (_, i) => thing(null, 30 * i + 20, 300))), js: String.raw`
await act('new'); ok('limitDraw', /most a scene can hold/.test(note()), note());
` },
  { name: "addToCancel", save: scene([thing(null, 300, 300)]), js: String.raw`
await tap(300,300); q('#addTo').click(); await w(150); await tool('pen'); await drag(pen(100,100)); await act('cancel');
const t=await things(); ok('addToCancel', t.length===1 && t[0].s.length===1, t.map(x=>x.s.length));
` },
  { name: "addToClear", save: scene([thing(null, 300, 300), thing(null, 500, 300)]), js: String.raw`
await tap(300,300); q('#addTo').click(); await w(150); q('#clear').click(); await w(60); await act('done');
const t=await things(); ok('addToClear', t.length===1 && /taken away/.test(note()), {n:t.length, note:note()});
` },
  { name: "addToSelectOther", save: scene([thing(null, 200, 300), thing("stand1", 550, 300)]), js: String.raw`
await tap(200,300); q('#addTo').click(); await w(150); await tool('pen'); await drag(pen(150,150)); await tool('move'); await drag([[550,300],[580,320],[600,340]]);
const t=await things(); ok('addToSelectOther', t.length===2 && t.some(x=>x.s.length===2) && t.some(x=>x.s[0].fig==='stand1' && Math.round(x.x)===600), t.map(x=>[x.s.length, Math.round(x.x), Math.round(x.y)]));
ok('addToSelectOther_state', !!q('#mainRow [data-act="play"]'), q('#mainRow').textContent);
` },
  { name: "undoMove", save: scene([]), js: String.raw`
await act('new'); await pic('drawn','stand1'); await tap(300,300); await tool('move'); await drag([[300,300],[350,330],[400,360]]);
q('#undo').click(); await w(60); await act('done'); const t=await things();
ok('undoMove', t.length===1 && Math.abs(t[0].x-300)<4 && Math.abs(t[0].y-300)<8, t.map(x=>[x.x,x.y]));
` },
  { name: "undoAll", save: scene([]), js: String.raw`
await act('new'); await pic('drawn','stand1'); await tap(300,300); await tap(500,300); q('#undo').click(); q('#undo').click(); q('#undo').click(); await w(60); await act('done');
const t=await things(); ok('undoAll', t.length===0, t.length);
` },
  { name: "sizeExtremes", save: scene([thing("stand1", 400, 300)]), js: String.raw`
await tap(400,300); for(let i=0;i<40;i++) q('#tSmaller').click(); await w(50); let t=await things(); const small=t[0].s[0].w;
for(let i=0;i<60;i++) q('#tBigger').click(); await w(50); t=await things(); const big=t[0].s[0].w;
ok('sizeExtremes', small>=10 && small<60 && big<=2000 && Number.isFinite(big), {small,big});
await act('play'); await w(400); await act('stop'); ok('sizeExtremes_err', !errs.length, errs);
` },
  { name: "turnAndMirror", save: scene([]), js: String.raw`
await act('new'); await pic('walkers','walk-horse'); q('#stickFlip').checked=true; q('#stickFlip').dispatchEvent(new Event('change')); await tap(400,300); await act('done');
await tap(400,300); for(let i=0;i<3;i++) q('#tRight').click(); await w(60);
const t=await things(); const s=t[0].s[0]; ok('turnAndMirror', s.m===1 && Math.abs((s.r||0))>0.5, {m:s.m, r:s.r});
q('#delThing').click(); await w(50); await tap(10,10); const t2=await things(); ok('turnAndMirror_del', t2.length===0, t2.length);
` },
  { name: "groupFlow", save: scene([thing(null, 200, 300, "side"), thing("stand1", 350, 300, "updown"), thing("walk-dog", 500, 300, "circle")]), js: String.raw`
await tap(200,300); q('#joinThing').click(); await w(60); await tap(350,300); await tap(500,300); q('#joinThing').click(); await w(60);
let t=await things(); const g=t[0].g; ok('group_join', t.every(x=>x.g===g && g), t.map(x=>x.g));
await tap(200,300); q('#together').checked=true; q('#together').dispatchEvent(new Event('change')); await w(60);
await act('play'); await w(900); await act('stop');
q('#copyThing').click(); await w(60); t=await things(); ok('group_copy', t.length===6, t.length);
q('#delThing').click(); await w(60); t=await things(); ok('group_delete', t.length===3 && t.every(x=>Number.isFinite(x.x)), t.length);
await tap(200,300); q('#splitThing').click(); await w(60); t=await things(); ok('group_split', t.every(x=>!x.g), t.map(x=>x.g));
ok('group_err', !errs.length, errs);
` },
  { name: "pathFlow", save: scene([thing("walk-dog", 200, 400)]), js: String.raw`
await tap(200,400); q('#moves [data-move="path"]').click(); await w(60); await drag([[200,400],[210,402]]); ok('path_short', /short/.test(note()), note());
await drag(Array.from({length:20},(_,i)=>[200+i*25, 400-Math.sin(i/3)*60])); let t=await things(); ok('path_set', t[0].move==='path' && t[0].path.length>=4, t[0].move);
const p0=t[0].path.slice(0,2); await drag([[200,400],[250,380],[300,350]]); t=await things(); ok('path_moves_with', Math.abs(t[0].path[0]-p0[0]-100)<2 && Math.abs(t[0].path[1]-p0[1]+50)<2, [p0, t[0].path.slice(0,2)]);
await act('play'); await w(800); await act('stop'); ok('path_err', !errs.length, errs);
` },
  { name: "modeSwitchFull", save: scene([thing("stand1", 300, 300, "side")]), js: String.raw`
await act('play'); await act('full'); q('#modes [data-mode="flip"]').click(); await w(150);
ok('modeSwitchFull', !q('#stage').classList.contains('full') && q('#fullBar').hidden && !document.body.classList.contains('fullview'), q('#stage').className);
q('#modes [data-mode="scene"]').click(); await w(100); await act('play'); await act('full'); document.dispatchEvent(new Event('visibilitychange')); await w(100);
for(let i=0;i<15;i++){ const p=q('#mainRow [data-act="play"]'); if(p) p.click(); else q('#mainRow [data-act="stop"]').click(); await w(30);} ok('rapidPlay_err', !errs.length, errs);
` },
  { name: "drawGuards", save: scene([thing("stand1", 300, 300)]), js: String.raw`
await act('new'); ok('noPlayWhileDrawing', !q('#mainRow [data-act="play"]'), q('#mainRow').textContent);
const sv=q('#saveVid'); if(!sv.hidden){ sv.click(); await w(100); ok('videoWhileDrawing', /Finish your drawing/.test(note()), note()); }
await tool('joint'); await pic('drawn','stand1'); await tap(500,300); await tool('joint'); await tap(500,300); await w(100);
const msg=note(); await act('done'); const t=await things(); ok('jointOnPicture', t.every(x=>x.s.every(s=>!s.j)), {msg, j:t.map(x=>x.s.map(s=>!!s.j))}); R.jointOnPicture_note=msg;
` },
  { name: "jointMixed", save: scene([]), js: String.raw`
await act('new'); await tool('pen'); await drag(pen(100,100,10)); await drag(pen(100,200,4)); await pic('drawn','stand1'); await tap(500,300);
await tool('joint'); await tap(500,300); await w(80); const msg=note(); await act('done'); const t=await things();
ok('jointMixed', t.every(x=>x.s.every(s=>!(s.fig && s.j))) && /pen drawings/.test(msg), {msg, j:t.map(x=>x.s.map(s=>(s.fig?'F':'L')+(s.j?'*':'')))});
` },
  { name: "textCases", save: scene([]), js: String.raw`
await act('new'); await tool('text'); q('#textIn').value=''; q('#textIn').dispatchEvent(new Event('input')); await tap(300,300);
q('#textIn').value='   '; q('#textIn').dispatchEvent(new Event('input')); await tap(300,400);
await act('done'); let t=await things(); ok('textEmpty', t.length===0, t.map(x=>x.s.map(s=>JSON.stringify(s.tx))));
await act('new'); await tool('text'); q('#textIn').value='Hello\nthere 🙂'; q('#textIn').dispatchEvent(new Event('input')); await tap(300,300); await act('done'); t=await things();
ok('textMade', t.length===1 && t[0].s[0].tx && t[0].s[0].tw>0, t.map(x=>x.s[0]));
await tap(300,300); ok('textSelect', !!q('#thingPanel') && !q('#thingPanel').hidden, null);
` },
  { name: "eraseFill", save: scene([]), js: String.raw`
await act('new'); await tool('fill'); await tap(400,300); const fillNote=note();
await pic('drawn','stand1'); await tap(400,300); await tool('erase'); await drag([[380,250],[400,300],[420,350]]); await act('done');
const t=await things(); ok('erasePicture', t.length===0, {n:t.length, note:note()}); R.fillEmpty_note=fillNote; ok('eraseFill_err', !errs.length, errs);
` },
  { name: "gaitRow", save: scene([thing(null, 300, 300), thing("walk-dog", 500, 300), thing("thing-car", 650, 300)]), js: String.raw`
await tap(300,300); const pen=q('#gaitRow').hidden; await tap(500,300); const dog=q('#gaitRow').hidden; await tap(650,300); const car=q('#gaitRow').hidden;
ok('gaitRow', pen && !dog && car, {pen,dog,car});
` },
  { name: "hugeThing", save: scene([{ ...thing(null, 400, 300, "side"), s: [{ c: "#000", w: 10, e: 0, p: [-500, 0, 500, 0] }] }, thing("stand1", 760, 560, "circle")]), js: String.raw`
await act('play'); await w(800); await act('stop'); ok('hugeThing_err', !errs.length, errs);
` },
  { name: "flipLimits", save: flipbook([[]]), js: String.raw`
for(let i=0;i<70;i++){ const b=q('#mainRow [data-act="addFrame"]'); if(!b||b.disabled) break; b.click(); await w(5);} let d=await D(); const n=d.flip.frames.length; R.flipMax_note=note();
ok('flipMax', n===60, n);
for(let i=0;i<70;i++){ const b=q('#mainRow [data-act="delFrame"]'); if(!b||b.disabled) break; b.click(); await w(5);} d=await D(); ok('flipMin', d.flip.frames.length===1 && d.flip.bgs.length===1, [d.flip.frames.length, d.flip.bgs.length]);
ok('flipLimits_err', !errs.length, errs);
` },
  { name: "flipTween", save: flipbook([[{ fig: "walk1", sk: 2, hc: -1, w: 120, p: [150, 350] }], [{ fig: "walk1", sk: 2, hc: -1, w: 120, p: [550, 350] }]]), js: String.raw`
const th=[...document.querySelectorAll('#strip [data-frame], #strip button')]; if(th[0]) th[0].click(); await w(100);
const tw=q('#tween'); tw.click(); await w(200); let d=await D(); ok('tween', d.flip.frames.length>2 && d.flip.frames.every(f=>f.length===1), d.flip.frames.map(f=>f.length));
const mids=d.flip.frames.map(f=>f[0].p[0]); ok('tween_order', mids.every((x,i)=>i===0||x>mids[i-1]), mids);
await act('play'); await w(700); await act('full'); await w(300); q('#fullStop').click(); await w(100); ok('flipTween_err', !errs.length && !q('#stage').classList.contains('full'), errs);
` },
  { name: "savePic", save: scene([thing("stand1", 300, 300, "side")]), js: String.raw`
q('#savePic').click(); await w(400); await act('play'); await w(300); q('#savePic').click(); await w(400); ok('savePic', !errs.length, {errs, note:note()});
` },
  // a second finger or a resting palm must not take over a line being drawn or a drawing being dragged
  { name: "twoFingers", save: scene([]), js: String.raw`
const evp=(type,x,y,id)=>{const r=cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',isPrimary:id===1,button:0,clientX:r.left+x*r.width/800,clientY:r.top+y*r.height/600}))};
await act('new'); await tool('pen');
evp('pointerdown',100,100,1); evp('pointermove',150,120,1); evp('pointerdown',600,400,2); evp('pointermove',200,140,1); evp('pointermove',620,420,2); evp('pointermove',250,160,1); evp('pointerup',620,420,2); evp('pointermove',300,180,1); evp('pointerup',300,180,1); await w(100);
await act('done'); let t=await things(); const xs=t.length===1 ? t[0].s[0].p.filter((_,i)=>i%2===0).map(v=>v+t[0].x) : [];
ok('twoFingers_draw', t.length===1 && t[0].s.length===1 && Math.max(...xs)<=310, t.map(x=>x.s.map(s=>s.p.length/2)));
const x0=t[0].x, y0=t[0].y; await tap(200,140);
evp('pointerdown',200,140,1); evp('pointerdown',700,500,2); evp('pointermove',260,200,1); evp('pointermove',710,520,2); evp('pointerup',710,520,2); evp('pointermove',300,240,1); evp('pointerup',300,240,1); await w(100);
t=await things(); ok('twoFingers_drag', Math.round(t[0].x-x0)===100 && Math.round(t[0].y-y0)===100, [t[0].x-x0, t[0].y-y0]);
await act('new'); await tool('pen'); evp('pointerdown',400,300,1); evp('pointermove',450,320,1); cv.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'touch'})); await w(50);
await drag(pen(100,400)); await act('done'); t=await things(); ok('twoFingers_afterCancel', t.length===2, t.length);
` },
];

// ---------- every main screen fits a phone: nothing runs off the side ----------
export const LAYOUT_WIDTHS = [320, 390, 768];
export const LAYOUT = { name: "layout", save: { ...scene([thing("walk-camel", 300, 300, "side")]), flip: { frames: [[], []], bgs: ["paper", "paper"], fps: 6, onion: true } }, js: String.raw`
const fits=(label)=>{ const W=document.documentElement.clientWidth; const over=[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect(); return r.width && r.right>W+1 && getComputedStyle(el).position!=='fixed' && !el.closest('.g-chips') && !el.closest('#stickSets');}).slice(0,4).map(el=>(el.id||el.className||el.tagName)+':'+Math.round(el.getBoundingClientRect().right)); ok('fits_'+label, document.documentElement.scrollWidth<=W && !over.length, over); };
fits('idle'); await tap(300,300); fits('chosen');
await act('new'); for (const t of ['pen','shape','fill','stamp','text','move','joint','erase']) { await tool(t); fits('tool_'+t); }
await act('cancel'); q('#modes [data-mode="flip"]').click(); await w(200); fits('flipbook'); await act('play'); fits('flipbook_playing'); await act('full'); fits('full_screen'); q('#fullExit').click(); await act('stop');
` };

// ---------- damaged or older saves: the page must still open, with its buttons ----------
const line = { c: "#000", w: 5, p: [0, 0, 10, 10] };
export const SAVES = {
  empty: {},
  sceneNull: { scene: null },
  flipNull: { flip: null },
  thingsNull: { scene: { bg: "paper", things: null } },
  thingNoLines: { scene: { bg: "paper", things: [{ x: 100, y: 100, move: "side" }] } },
  thingEmptyLines: { scene: { bg: "paper", things: [{ s: [], x: 100, y: 100 }] } },
  lineNoPoints: { scene: { bg: "paper", things: [{ s: [{ c: "#000", w: 5 }], x: 100, y: 100, move: "side" }] } },
  unknownBackgrounds: { scene: { bg: "nope", things: [] }, flip: { frames: [[], []], bgs: ["zzz", null], fps: 99 } },
  unknownFigure: { scene: { bg: "paper", things: [{ s: [{ fig: "no-such", w: 100, p: [0, 0] }], x: 300, y: 300, move: "side", gait: "swim" }] } },
  badPlace: { scene: { bg: "paper", things: [{ s: [line], x: null, y: "abc", move: "circle" }] } },
  pagesNotList: { mode: "flip", flip: { frames: "x", fps: 6 } },
  pageNull: { mode: "flip", flip: { frames: [null, [line]], fps: 6 } },
  tooManyThings: { scene: { bg: "paper", things: Array.from({ length: 40 }, (_, i) => ({ s: [line], x: 10 * i, y: 300, move: "side" })) } },
  notJSON: "RAW{{{",
  unknownMode: { mode: "video" },
};
export const SAVE_JS = String.raw`
try { const p=q('#mainRow [data-act="play"]'); if (p && !p.disabled) { p.click(); await w(500); const s=q('#mainRow [data-act="stop"]'); if (s) s.click(); }
  q('#modes [data-mode="flip"]').click(); await w(150); q('#modes [data-mode="scene"]').click(); await w(600); // switching saves, repaired
  const d=JSON.parse(localStorage.getItem('zone210_drawanim')||'{}'); ok('opens', !(window.__loadErr||[]).length && !!q('#mainRow [data-act]'), window.__loadErr);
  ok('limits', !d.scene || d.scene.things.length<=24, d.scene && d.scene.things.length); } catch (e) { ok('opens', false, e.message); }
`;
