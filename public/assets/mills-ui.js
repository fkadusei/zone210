/** Board, game flow and online play shared by Nine Men's Morris and Morabaraba (engine: mills-engine.js). */
import { createOnline } from "./online.js";
import { rulesFor, VARIANTS, initial, actions, act, removable, removePiece, endTurn, outcome, chooseOption, isPlacing, canFly, countOn, other, turnOptions } from "./mills-engine.js";

export function startMills({ variant, storeKey, prefix, palette }) {
  const R = rulesFor(variant);
  const $ = (id) => document.getElementById(id);
  const store = {
    get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
  };
  const settings = { mode: "cpu", level: "normal", first: "me", muted: false, ...store.get(storeKey, {}) };
  if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
  if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";

  const SPEED = new URLSearchParams(location.search).has("fast") ? 20 : 1;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));
  let audio = null;
  function tone(freq, start, length, type = "sine", gain = 0.08) {
    if (settings.muted) return;
    try {
      audio = window.z210Audio ? window.z210Audio.get() : audio || new (window.AudioContext || window.webkitAudioContext)();
      if (!audio) return;
      const t = audio.currentTime + start;
      const osc = audio.createOscillator();
      const amp = audio.createGain();
      osc.type = type; osc.frequency.value = freq;
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
      osc.connect(amp).connect(audio.destination);
      osc.start(t); osc.stop(t + length + 0.02);
    } catch (err) { /* audio unavailable */ }
  }
  const sfx = {
    place: () => tone(300, 0, 0.07, "triangle", 0.1),
    mill: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.16, "triangle", 0.1)),
    take: () => { tone(200, 0, 0.12, "sawtooth", 0.07); tone(130, 0.06, 0.15, "sine", 0.09); },
    win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
    lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
  };

  const online = () => settings.mode === "online";
  const cpu = () => settings.mode === "cpu";
  let myP = 1;
  const inbox = [];
  const net = createOnline({
    container: document.querySelector(".g-page"),
    before: $("pbars"),
    prefix,
    names: ["First", "Second"],
    onStart: ({ role }) => { myP = role === 0 ? 1 : 2; inbox.length = 0; newGame(); },
    onData: (m) => { inbox.push(m); drain(); },
    onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
  });

  let s = initial(variant);
  let sel = null;
  let rmMode = false; // the player to move must remove a piece
  let over = false;
  let busy = false;
  let last = null; // { from, to, removed }
  let hist = [];
  let reps = new Map();
  let noCap = 0;
  let hintOpt = null;

  const humanP = () => (cpu() ? (settings.first === "me" ? 1 : 2) : null);
  const isCpuTurn = () => cpu() && s.turn !== humanP();
  const mine = () => (online() ? net.active && s.turn === myP : cpu() ? s.turn === humanP() : true);
  const flipNames = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : p === 1 ? "Player 1" : "Player 2");
  const statusEl = $("status");
  const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

  // ---------- drawing ----------
  const svg = $("mb");
  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
  const C = 170;
  const HALF = [150, 100, 50];
  const OFFS = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  const pos = (i) => { const r = Math.floor(i / 8); const k = i % 8; return { x: C + OFFS[k][0] * HALF[r], y: C + OFFS[k][1] * HALF[r] }; };

  function draw() {
    svg.innerHTML = "";
    const defs = el("defs");
    [1, 2].forEach((p) => { const g = el("radialGradient", { id: `pg${p}`, cx: "35%", cy: "30%", r: "75%" }, defs); el("stop", { offset: "0", "stop-color": palette[p][0] }, g); el("stop", { offset: "1", "stop-color": palette[p][1] }, g); });
    const bg = el("linearGradient", { id: "wood", x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
    el("stop", { offset: "0", "stop-color": "#e6c48d" }, bg); el("stop", { offset: "1", "stop-color": "#c99b5e" }, bg);
    el("rect", { x: 0, y: 0, width: 340, height: 340, rx: 18, fill: "url(#wood)" });
    el("rect", { x: 4, y: 4, width: 332, height: 332, rx: 15, fill: "none", stroke: "rgba(74,45,20,0.35)", "stroke-width": 2 });
    const line = (a, b) => { const p = pos(a), q = pos(b); el("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: "#4a2d14", "stroke-width": 3.5, "stroke-linecap": "round" }); };
    for (let r = 0; r < 3; r += 1) for (let k = 0; k < 8; k += 1) line(r * 8 + k, r * 8 + ((k + 1) % 8));
    for (let k = 0; k < 8; k += 1) if (k % 2 === 1 || VARIANTS[variant].diagonals) { line(k, 8 + k); line(8 + k, 16 + k); }
    const canAct = !over && !busy && mine() && !isCpuTurn();
    const removes = canAct && rmMode ? new Set(removable(R, s)) : new Set();
    const placing = canAct && !rmMode && isPlacing(s);
    const targets = new Set();
    if (canAct && !rmMode && !isPlacing(s) && sel !== null) actions(R, s).filter((a) => a.from === sel).forEach((a) => targets.add(a.to));
    const movable = new Set();
    if (canAct && !rmMode && !isPlacing(s)) actions(R, s).forEach((a) => movable.add(a.from));
    for (let i = 0; i < 24; i += 1) {
      const { x, y } = pos(i);
      el("circle", { cx: x, cy: y, r: 4.5, fill: "#4a2d14" });
      if (last && (last.to === i || last.from === i)) el("circle", { cx: x, cy: y, r: 19, fill: "none", stroke: "rgba(255,190,40,0.9)", "stroke-width": 3 });
      if (last && last.removed === i) el("circle", { cx: x, cy: y, r: 11, fill: "none", stroke: "rgba(150,30,30,0.7)", "stroke-width": 3, "stroke-dasharray": "4 4" });
      const v = s.b[i];
      if (v) {
        el("circle", { cx: x, cy: y + 2.5, r: 15, fill: "rgba(0,0,0,0.3)" });
        el("circle", { cx: x, cy: y, r: 15, fill: `url(#pg${v})`, stroke: palette[v][2], "stroke-width": 1.5 });
        el("circle", { cx: x, cy: y, r: 9, fill: "none", stroke: v === 1 ? "rgba(120,100,70,0.45)" : "rgba(255,255,255,0.18)", "stroke-width": 1.5 });
      }
      if (sel === i) el("circle", { cx: x, cy: y, r: 19, fill: "none", stroke: "#fff", "stroke-width": 3.5 });
      else if (movable.has(i) && sel === null) el("circle", { cx: x, cy: y, r: 19, fill: "none", stroke: "rgba(255,255,255,0.75)", "stroke-width": 2.5, class: "pulse" });
      if (targets.has(i)) el("circle", { cx: x, cy: y, r: 9, fill: "rgba(255,255,255,0.85)", stroke: "#b07a00", "stroke-width": 2.5, class: "pulse" });
      if (placing && !v) el("circle", { cx: x, cy: y, r: 8, fill: "rgba(255,255,255,0.45)", class: "pulse" });
      if (removes.has(i)) el("circle", { cx: x, cy: y, r: 20, fill: "rgba(220,50,50,0.25)", stroke: "#d43b3b", "stroke-width": 3, class: "pulse" });
      if (hintOpt && ((hintOpt.a.kind === "place" && hintOpt.a.to === i) || (hintOpt.a.kind === "move" && (hintOpt.a.from === i || hintOpt.a.to === i)))) el("circle", { cx: x, cy: y, r: 22, fill: "none", stroke: "#2fbf71", "stroke-width": 4, class: "pulse" });
      const live = (rmMode && removes.has(i)) || (placing && !v) || (!rmMode && !isPlacing(s) && (movable.has(i) || targets.has(i)));
      const hit = el("circle", { cx: x, cy: y, r: 24, class: "hit" });
      hit.style.cursor = live ? "pointer" : "default";
      hit.addEventListener("click", () => onPoint(i));
    }
    renderBars();
  }

  function renderBars() {
    const row = (p) => `<div class="pbar${!over && s.turn === p ? " turn" : ""}" style="--c1:${palette[p][0]};--c2:${palette[p][1]}"><span class="chip"></span><span class="nm">${flipNames(p)}<small>To place ${s.place[p]} · On board ${countOn(s.b, p)}${canFly(s, p) ? " · flying!" : ""}</small></span></div>`;
    $("pbars").innerHTML = row(1) + row(2);
  }

  // ---------- flow ----------
  function keyOf() { return s.b.join("") + s.turn + s.place[1] + s.place[2]; }
  function newGame() {
    s = initial(variant); sel = null; rmMode = false; over = false; busy = false; last = null; hist = []; reps = new Map(); noCap = 0; hintOpt = null;
    $("end").classList.remove("show");
    net.setOver(false);
    $("again").textContent = online() ? "Rematch" : "Play again";
    draw();
    announce();
    if (isCpuTurn()) cpuTurn();
  }
  function announce() {
    if (over) return;
    if (online() && !net.active) return setStatus("Create or join a room to start.");
    const p = s.turn;
    if (isCpuTurn()) return setStatus("The computer is thinking…");
    if (online() && p !== myP) return setStatus("Your friend's move…");
    const who = cpu() || online() ? "Your" : `${flipNames(p)}'s`;
    if (rmMode) return setStatus("Mill! Tap one of the opponent's pieces to remove it.", "good");
    if (isPlacing(s)) return setStatus(`${who} turn: place a piece (${s.place[p]} left to place).`);
    if (canFly(s, p)) return setStatus(`${who} turn: you're down to 3 pieces, so you can fly to any empty point.`);
    setStatus(`${who} turn: tap a piece, then an empty point next to it.`);
  }

  function snapshot() { hist.push({ s, last, noCap, reps: new Map(reps) }); }

  function onPoint(i) {
    if (over || busy || !mine() || isCpuTurn()) return;
    if (rmMode) {
      if (removable(R, s).includes(i)) doRemove(i, false);
      return;
    }
    if (isPlacing(s)) {
      if (!s.b[i]) doAction({ kind: "place", to: i }, false);
      return;
    }
    const acts = actions(R, s);
    if (sel !== null) {
      const a = acts.find((x) => x.from === sel && x.to === i);
      if (a) return doAction(a, false);
    }
    if (acts.some((x) => x.from === i)) { sel = sel === i ? null : i; hintOpt = null; tone(520, 0, 0.04, "triangle", 0.05); draw(); } else if (sel !== null) { sel = null; draw(); }
    return undefined;
  }

  async function doAction(a, remote) {
    if (!remote) { if (online()) net.send({ t: "a", a }); }
    snapshot();
    const p = s.turn;
    const r = act(R, s, a);
    s = r.s;
    last = { from: a.kind === "move" ? a.from : null, to: a.to, removed: null };
    sel = null; hintOpt = null;
    sfx.place();
    if (a.kind === "move") noCap += 1; else noCap = 0;
    if (r.formed && removable(R, s, p).length) {
      sfx.mill();
      rmMode = true;
      draw();
      announce();
      if (isCpuTurn() || (online() && !mine())) return;
      return;
    }
    rmMode = false;
    finishTurn();
  }

  function doRemove(i, remote) {
    if (!remote && online()) net.send({ t: "r", i });
    s = removePiece(s, i);
    last = { ...last, removed: i };
    sfx.take();
    rmMode = false;
    noCap = 0;
    finishTurn();
  }

  function finishTurn() {
    s = endTurn(s);
    const k = keyOf();
    reps.set(k, (reps.get(k) || 0) + 1);
    draw();
    const out = outcome(R, s);
    if (out) return finish(out);
    if (reps.get(k) >= 3) return finish({ winner: 0, why: "the same position came up three times" });
    if (noCap >= 50) return finish({ winner: 0, why: "no pieces were captured for 50 moves" });
    announce();
    if (isCpuTurn()) cpuTurn();
    drain();
    return undefined;
  }

  async function cpuTurn() {
    busy = true;
    draw();
    await sleep(600);
    const o = chooseOption(R, s, settings.level);
    busy = false;
    if (!o || over) return;
    await doAction(o.a, true);
    if (o.rm !== null && rmMode) {
      busy = true;
      await sleep(650);
      busy = false;
      doRemove(o.rm, true);
    }
  }

  function drain() {
    while (online() && net.active && inbox.length && !over && !busy) {
      const m = inbox[0];
      if (rmMode && s.turn !== myP) {
        if (m.t !== "r") { inbox.shift(); continue; }
        inbox.shift();
        if (removable(R, s).includes(m.i)) doRemove(m.i, true);
        continue;
      }
      if (s.turn === myP) break;
      inbox.shift();
      if (m.t === "a" && m.a) {
        const ok = actions(R, s).find((x) => x.kind === m.a.kind && x.to === m.a.to && (x.kind === "place" || x.from === m.a.from));
        if (ok) doAction(ok, true);
      }
    }
  }

  function finish(out) {
    over = true;
    busy = false;
    draw();
    const w = out.winner;
    let title, emoji = "🏆", you = null;
    if (w === 0) { title = "It's a draw!"; emoji = "🤝"; }
    else {
      you = cpu() ? w === humanP() : online() ? w === myP : true;
      title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `${flipNames(w)} wins!`;
      if (you === false) emoji = cpu() ? "🤖" : "🎲";
    }
    $("endEmoji").textContent = emoji;
    $("endTitle").textContent = title;
    $("endText").textContent = w === 0 ? `Drawn: ${out.why}.` : `${flipNames(other(w))} ${flipNames(other(w)) === "You" ? "were" : "was"} beaten: ${out.why}.`;
    setStatus(title, "good");
    you === false ? sfx.lose() : sfx.win();
    net.setOver(true);
    setTimeout(() => $("end").classList.add("show"), 700);
  }

  function undo() {
    if (busy || !hist.length || online()) return;
    let steps = 1;
    if (cpu()) { steps = 0; for (let k = hist.length - 1; k >= 0; k -= 1) { steps += 1; if (hist[k].s.turn === humanP()) break; } }
    let prev = null;
    for (let k = 0; k < steps && hist.length; k += 1) prev = hist.pop();
    if (!prev) return;
    s = prev.s; last = prev.last; noCap = prev.noCap; reps = prev.reps; over = false; rmMode = false; sel = null; hintOpt = null;
    $("end").classList.remove("show");
    draw(); announce();
  }

  function showHint() {
    if (over || busy || !mine() || online() || isCpuTurn()) return;
    if (rmMode) {
      const opts = turnOptions(R, s);
      void opts;
      return;
    }
    hintOpt = chooseOption(R, s, "normal");
    draw();
    setStatus("Hint: the green ring marks a good move.");
  }

  // ---------- controls ----------
  function syncChips() {
    ["mode", "level", "first"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings[k]))));
    $("levelRow").hidden = !cpu();
    $("firstRow").hidden = !cpu();
    $("undo").hidden = $("hint").hidden = $("newGame").hidden = online();
    if (online()) net.open(); else net.close();
  }
  ["mode", "level", "first"].forEach((id) =>
    $(id).addEventListener("click", (e) => {
      const chip = e.target.closest(".g-chip");
      if (!chip || settings[id] === chip.dataset.value) return;
      settings[id] = chip.dataset.value;
      store.set(storeKey, settings);
      syncChips();
      newGame();
    })
  );
  $("newGame").addEventListener("click", newGame);
  $("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
  $("endView").addEventListener("click", () => $("end").classList.remove("show"));
  $("undo").addEventListener("click", undo);
  $("hint").addEventListener("click", showHint);
  const mute = $("mute");
  const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
  mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(storeKey, settings); syncMute(); });

  syncChips();
  syncMute();
  newGame();
  const invited = net.roomParam();
  if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
  window.__mills = {
    R, onPoint, actions, removable, turnOptions, act,
    get s() { return s; }, get rmMode() { return rmMode; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; },
  };
}
