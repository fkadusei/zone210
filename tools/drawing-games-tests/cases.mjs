// Tests for the drawing games other than Draw & Animate, run by tools/test-drawing-games.mjs. For each game: where it
// is, what it saves, the element you draw on (for the monkey), and cases: { name, js, w?, h?, storage? }. Each js runs in
// the page after tools/drawing-games-tests/page-lib.js and records results with ok().

export const GAMES = {
  // ---------- Doodle & Color ----------
  doodle: {
    page: "games/doodle/",
    surface: "#paint",
    cases: [
      { name: "everyPage", js: String.raw`
let n = 0;
for (const cat of qa('#cats [data-cat]').map(b => b.dataset.cat)) { q('#cats [data-cat="' + cat + '"]').click(); await w(30);
  for (const id of qa('#pages [data-page]').map(b => b.dataset.page)) { q('#pages [data-page="' + id + '"]').click(); n += 1; await w(10); } }
ok('everyPage', n > 20 && !errs.length, { n, errs });
` },
      { name: "toolsWork", js: String.raw`
const P = q('#paint'), d = window.__doodle;
await dragOn(P, [[100, 100], [200, 120], [300, 140]]); ok('brush', !blank(d.pctx, 200, 120));
await clickText('#tools button', 'Rainbow'); await dragOn(P, [[100, 300], [300, 300]]); ok('rainbow', !blank(d.pctx, 200, 300));
await clickText('#tools button', 'Eraser'); await dragOn(P, [[100, 300], [300, 300]]); ok('eraser', blank(d.pctx, 200, 300));
await clickText('#tools button', 'Stamps'); await tapOn(P, 600, 450); ok('stamp', !blank(d.pctx, 600, 450));
q('#pages [data-page="blank"]').click(); await w(50); await clickText('#tools button', 'Fill'); await tapOn(P, 400, 300); ok('fillBlank', !blank(d.pctx, 50, 550));
q('#undo').click(); await w(30); ok('undo', blank(d.pctx, 50, 550)); q('#redo').click(); await w(30); ok('redo', !blank(d.pctx, 50, 550));
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })); await w(30); ok('ctrlZ', blank(d.pctx, 50, 550));
for (let i = 0; i < 40; i++) q('#undo').click(); for (let i = 0; i < 40; i++) q('#redo').click(); ok('undoRedoMany', !errs.length, errs);
q('#clear').click(); await w(30); ok('clear', blank(d.pctx, 200, 120));
const c = q('#custom'); c.value = '#123456'; c.dispatchEvent(new Event('input')); await clickText('#tools button', 'Brush'); await dragOn(P, [[500, 100], [600, 100]]); const px = d.pctx.getImageData(550, 100, 1, 1).data; ok('customColour', px[0] === 0x12 && px[1] === 0x34 && px[2] === 0x56, [...px]);
q('#save').click(); await w(300); ok('save', !errs.length, errs);
` },
      { name: "fillStaysInside", js: String.raw`
const P = q('#paint'), d = window.__doodle;
q('#cats [data-cat="animals"]').click(); await w(30); q('#pages [data-page="fish"]').click(); await w(50);
await clickText('#tools button', 'Fill'); await tapOn(P, 390, 330);
ok('fillInside', !blank(d.pctx, 390, 330) && blank(d.pctx, 40, 300) && blank(d.pctx, 770, 560), null);
await tapOn(P, 720, 300); ok('fillOnOutlineIgnored', !errs.length, errs);
` },
      // switching page by accident can be undone: the colours AND the page's outlines come back
      { name: "undoPageSwitch", js: String.raw`
const P = q('#paint'), d = window.__doodle;
q('#cats [data-cat="animals"]').click(); await w(30); q('#pages [data-page="fish"]').click(); await w(50);
await clickText('#tools button', 'Fill'); await tapOn(P, 390, 330);
q('#cats [data-cat="scenes"]').click(); await w(30); q('#pages [data-page="house"]').click(); await w(50);
q('#undo').click(); await w(50);
ok('undoPageSwitch_colours', !blank(d.pctx, 390, 330));
ok('undoPageSwitch_outlines', inked(d.lctx, 720, 300) && !inked(d.lctx, 400, 470) && d.state.page === 'fish', { fishTail: inked(d.lctx, 720, 300), houseDoor: inked(d.lctx, 400, 470), page: d.state.page });
const fishPressed = q('#pages [data-page="fish"]'); ok('undoPageSwitch_button', !fishPressed || fishPressed.getAttribute('aria-pressed') === 'true' || !q('#pages [data-page="house"][aria-pressed="true"]'), null);
` },
      { name: "twoFingers", js: String.raw`
const P = q('#paint'), d = window.__doodle;
pe(P, 'pointerdown', 100, 100, 1); pe(P, 'pointermove', 150, 120, 1); pe(P, 'pointerdown', 600, 450, 2); pe(P, 'pointermove', 200, 140, 1); pe(P, 'pointermove', 620, 470, 2); pe(P, 'pointerup', 620, 470, 2); pe(P, 'pointermove', 300, 180, 1); pe(P, 'pointerup', 300, 180, 1); await w(50);
let stray = 0; for (let k = 1; k < 10; k++) { const x = 200 + (600 - 200) * k / 10, y = 140 + (450 - 140) * k / 10; if (!blank(d.pctx, x, y)) stray++; }
ok('twoFingers_noJoiningLine', stray === 0, { stray });
ok('twoFingers_firstLineWhole', !blank(d.pctx, 250, 160) && !blank(d.pctx, 300, 180), null);
` },
      { name: "photoPage", js: String.raw`
const c = document.createElement('canvas'); c.width = 300; c.height = 200; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 300, 200); g.fillStyle = '#c00'; g.beginPath(); g.arc(150, 100, 60, 0, 7); g.fill(); g.fillStyle = '#00c'; g.fillRect(20, 20, 60, 60);
const blob = await new Promise(r => c.toBlob(r, 'image/png'));
const put = async (file) => { const dt = new DataTransfer(); dt.items.add(file); const inp = q('#photo'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); await w(800); };
await put(new File([blob], 'pic.png', { type: 'image/png' })); const d = window.__doodle;
let ink = 0; const L = d.lctx.getImageData(0, 0, d.W, d.H).data; for (let i = 3; i < L.length; i += 4 * 97) if (L[i] > 60) ink++;
ok('photo_outlines', ink > 20 && d.state.page === 'photo' && d.state.tool === 'fill', { ink, page: d.state.page, tool: d.state.tool });
await put(new File(['not a picture'], 'notes.txt', { type: 'text/plain' })); ok('photo_badFile', window.__alerts.length === 1 && !errs.length, { alerts: window.__alerts, errs });
` },
    ],
  },

  // ---------- Draw & Guess (pass and play; online needs a second device) ----------
  "draw-guess": {
    page: "games/draw-guess/",
    surface: "#cv",
    pre: "window.__dt = 0; { const n = Date.now.bind(Date); Date.now = () => n() + window.__dt; }", // lets a test jump the clock
    cases: [
      { name: "wholeGame", js: String.raw`
q('#count [data-value="3"]').click(); q('#rounds [data-value="1"]').click(); q('#start').click(); await w(150);
const C = q('#cv');
for (let turn = 0; turn < 3; turn++) {
  ok('turn' + turn + '_handoff', shown(q('#veil')) && /Pass the device/.test(q('#veilText').textContent), q('#veilText').textContent);
  q('#veilBtn').click(); await w(60);
  qa('#veil .g-chips button')[0].click(); await w(60);
  ok('turn' + turn + '_drawing', !shown(q('#veil')) && shown(q('#tools')), null);
  await dragOn(C, [[200, 200], [300, 260], [400, 300]]);
  await clickText('#pickBtns button', 'Someone guessed it');
  qa('#pickBtns .g-chip').find(b => /Player/.test(b.textContent)).click(); await w(60);
  ok('turn' + turn + '_scored', /guessed it/.test(q('#status').textContent), q('#status').textContent);
  await clickText('#pickBtns button', turn < 2 ? 'Next turn' : 'See results');
}
await w(100); ok('ended', shown(q('#end')) && q('#endBody').children.length === 3, q('#end').hidden);
const total = qa('#endBody .row span:last-child').reduce((a, s) => a + Number(s.textContent), 0); ok('scoresAddUp', total > 0 && total % 2 === 0, total);
q('#endAgain').click(); await w(100); ok('playAgain', shown(q('#veil')) && !shown(q('#end')), null);
` },
      { name: "timeUpAndSkip", js: String.raw`
q('#start').click(); await w(100); q('#veilBtn').click(); await w(50);
const first = qa('#veil .g-chips button').map(b => b.textContent); qa('#veil .g-chips button')[0].click(); await w(50);
ok('skipShown', shown(q('#skip')), null); q('#skip').click(); await w(80);
ok('skipGivesNewWords', shown(q('#veil')), null); if (q('#veilBtn') && shown(q('#veilBtn'))) { q('#veilBtn').click(); await w(50); }
qa('#veil .g-chips button')[0].click(); await w(50); ok('skipOnlyOnce', !shown(q('#skip')), null);
window.__dt += 10 * 60 * 1000; await w(400);
ok('timeUp', /Time's up/.test(q('#pickText').textContent) && shown(q('#picker')), q('#pickText').textContent);
await clickText('#pickBtns button', 'Nobody'); ok('nobody', /Nobody got it/.test(q('#status').textContent), q('#status').textContent);
` },
      { name: "drawTools", js: String.raw`
q('#start').click(); await w(100); q('#veilBtn').click(); await w(50); qa('#veil .g-chips button')[0].click(); await w(50);
const C = q('#cv'), g = C.getContext('2d');
ok('noSkipAfterDrawing', true); await dragOn(C, [[100, 100], [300, 100]]); ok('skipHiddenAfterDrawing', !shown(q('#skip')), null);
q('#eraser').click(); await dragOn(C, [[150, 100], [250, 100]]); ok('eraser', blank(g, 200, 100) && !blank(g, 120, 100), null);
q('#undo').click(); await w(30); ok('undo', !blank(g, 200, 100), null);
q('#clear').click(); await w(30); ok('clear', blank(g, 120, 100), null);
` },
      { name: "twoFingers", js: String.raw`
q('#start').click(); await w(100); q('#veilBtn').click(); await w(50); qa('#veil .g-chips button')[0].click(); await w(50);
const C = q('#cv'), g = C.getContext('2d');
pe(C, 'pointerdown', 100, 100, 1); pe(C, 'pointermove', 150, 120, 1); pe(C, 'pointerdown', 600, 450, 2); pe(C, 'pointermove', 200, 140, 1); pe(C, 'pointermove', 620, 470, 2); pe(C, 'pointerup', 620, 470, 2); pe(C, 'pointermove', 300, 180, 1); pe(C, 'pointerup', 300, 180, 1); await w(50);
let stray = 0; for (let k = 1; k < 10; k++) { const x = 200 + 400 * k / 10, y = 140 + 310 * k / 10; if (!blank(g, x, y)) stray++; }
ok('twoFingers_noJoiningLine', stray === 0, { stray }); ok('twoFingers_firstLineWhole', !blank(g, 250, 160) && !blank(g, 300, 180), null);
` },
      { name: "newGameMidTurn", js: String.raw`
q('#start').click(); await w(100); q('#veilBtn').click(); await w(50); qa('#veil .g-chips button')[0].click(); await w(50);
q('#restart').click(); await w(80); window.__dt += 10 * 60 * 1000; await w(500);
ok('restartStopsTimer', shown(q('#setup')) && !shown(q('#picker')) && !shown(q('#play')), { setup: shown(q('#setup')), picker: shown(q('#picker')) });
q('#start').click(); await w(100); ok('freshGame', shown(q('#veil')) && qa('#scores .score b').every(b => b.textContent === '0'), null);
` },
      { name: "onlineChoice", js: String.raw`
q('#mode [data-value="online"]').click(); await w(400); q('#mode [data-value="two"]').click(); await w(200); ok('onlineToggle', !errs.length && shown(q('#start')), errs);
` },
    ],
  },

  // ---------- Sprouts ----------
  sprouts: {
    page: "games/sprouts/",
    surface: "#mb",
    storageKey: "zone210_sprouts_settings",
    cases: [3, 4, 5].map((n) => ({ name: `vsComputer${n}`, storage: { zone210_sprouts_settings: { mode: "cpu", level: "hard", first: "me", spots: String(n), muted: true } }, js: String.raw`
const sp = window.__sp, M = q('#mb'), CS = 540 / Math.round(Math.sqrt(sp.s.cell.length)), at = (cell) => { const G = Math.round(Math.sqrt(sp.s.cell.length)); return [(cell % G + 0.5) * CS, (Math.floor(cell / G) + 0.5) * CS]; };
let moves = 0, drawn = 0, undone = false, guard = 0;
while (!sp.over && guard++ < 80) {
  for (let k = 0; k < 60 && sp.busy; k++) await w(50);
  if (sp.over) break;
  const cs = sp.connections(sp.s, sp.regions(sp.s)); if (!cs.length) break;
  const c = cs[Math.floor(Math.random() * cs.length)];
  if (moves % 2) { await tapOn(M, ...at(sp.s.spots[c.a].cell)); await tapOn(M, ...at(sp.s.spots[c.b].cell)); }
  else { const path = sp.route(sp.s, c, Math.random); if (!path) continue; await dragOn(M, [at(sp.s.spots[c.a].cell), ...path.map(at), at(sp.s.spots[c.b].cell)]); drawn++; }
  moves++; await w(60);
  if (moves === 2 && !undone) { const before = sp.s.moves; for (let k = 0; k < 60 && sp.busy; k++) await w(50); q('#undo').click(); await w(100); undone = sp.s.moves < before || sp.s.moves === 0; }
}
for (let k = 0; k < 40 && !q('#end').classList.contains('show'); k++) await w(100);
ok('gameEnds', sp.over && q('#end').classList.contains('show'), { over: sp.over, moves: sp.s.moves, guard });
ok('undoWorks', undone, null); ok('drawnLinesWork', drawn > 0, drawn);
q('#again').click(); await w(200); ok('playAgain', !sp.over && sp.s.moves === 0, sp.s.moves);
` })).concat([{ name: "twoPlayers", storage: { zone210_sprouts_settings: { mode: "two", spots: "4", muted: true } }, js: String.raw`
const sp = window.__sp, M = q('#mb'); let guard = 0;
while (!sp.over && guard++ < 80) { const cs = sp.connections(sp.s, sp.regions(sp.s)); if (!cs.length) break; const c = cs[0]; sp.tap(c.a); sp.tap(c.b); await w(30); }
ok('twoPlayerEnds', sp.over, { moves: sp.s.moves });
` }]),
  },

  // ---------- ABC & 123: tracing ----------
  "abc-123": {
    page: "games/abc-123/",
    surface: "#ink",
    storageKey: "zone210_abc123",
    cases: [
      // trace "I", then go to another part of the game while it is still saying well done: it must stay there
      { name: "traceThenLeave", storage: { zone210_abc123: { tab: "trace", traceSet: "ABC", traceI: 8, muted: true } }, js: String.raw`
const I = q('#ink'), px = I.width; const pts = []; for (let k = 0; k <= 40; k++) pts.push([px / 2, px * (0.1 + 0.8 * k / 40)]);
await dragOn(I, pts); await w(100);
ok('traced', /Brilliant/.test(q('#tstatus').textContent), { status: q('#tstatus').textContent, score: I.dataset.score });
const other = qa('#tabs [data-tab]').find(b => b.dataset.tab === 'abc'); other.click(); await w(3500);
ok('staysWhereYouWent', !q('#twrap') && q('#tabs [data-tab="abc"]').getAttribute('aria-pressed') !== 'false', { stillTracing: !!q('#twrap'), status: q('#tstatus') && q('#tstatus').textContent });
` },
      { name: "traceThenNext", storage: { zone210_abc123: { tab: "trace", traceSet: "ABC", traceI: 8, muted: true } }, js: String.raw`
const I = q('#ink'), px = I.width; const pts = []; for (let k = 0; k <= 40; k++) pts.push([px / 2, px * (0.1 + 0.8 * k / 40)]);
await dragOn(I, pts); await w(100); q('#next').click(); await w(3500);
const d = JSON.parse(localStorage.getItem('zone210_abc123')); ok('noDoubleSkip', d.traceI === 9, d.traceI);
` },
      { name: "twoFingers", storage: { zone210_abc123: { tab: "trace", traceSet: "ABC", traceI: 8, muted: true } }, js: String.raw`
const I = q('#ink'), px = I.width;
pe(I, 'pointerdown', px / 2, px * 0.1, 1); for (let k = 1; k <= 20; k++) { pe(I, 'pointermove', px / 2, px * (0.1 + 0.8 * k / 40), 1); if (k === 5) pe(I, 'pointerdown', px * 0.9, px * 0.9, 2); if (k === 8) pe(I, 'pointerup', px * 0.9, px * 0.9, 2); }
for (let k = 21; k <= 40; k++) pe(I, 'pointermove', px / 2, px * (0.1 + 0.8 * k / 40), 1); pe(I, 'pointerup', px / 2, px * 0.9, 1); await w(100);
ok('twoFingers_stillCounts', /Brilliant/.test(q('#tstatus').textContent), { status: q('#tstatus').textContent, score: I.dataset.score });
` },
      { name: "everyTab", js: String.raw`
for (const b of qa('#tabs [data-tab]')) { b.click(); await w(250); } ok('everyTab', !errs.length, errs);
` },
    ],
  },
};

// damaged saved settings: each game must still open with buttons to press
export const BAD_SAVES = ["RAW{{{", "null", "[]", "42", JSON.stringify({ tab: "nope", traceSet: "zzz", traceI: 999, spots: "x", mode: "?", level: null, first: 7, max: -1, seenL: "x", muted: "yes" })];
