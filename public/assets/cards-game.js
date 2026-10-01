/**
 * Game flow shared by Whot and Crazy Eights: modes (computer, pass and play, online for two), rounds and a match to
 * a target score, the computer's turns, online play with reload-rejoin, and the end-of-round screen.
 * The rules live in each game's logic.js (see the `rules` argument) and the card faces in its game.js.
 */
import { createOnline } from "./online.js";
import { createTable } from "./cards-kit.js";

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * cfg: {
 *   key, prefix,                       settings key in localStorage, online room prefix
 *   rules: { deal, legalPlays, canDrawNow, play, draw, choose, result, needsChoice, choices },
 *   face(id) -> { cls, html, label },  sortKey(id) -> number,
 *   badges(s) -> [{text, cls}],        drawLabel(s) -> string,   callWord: "suit" | "shape"
 * }
 */
export function startCardGame(cfg) {
  const { rules } = cfg;
  const $ = (id) => document.getElementById(id);
  const store = {
    get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
  };
  const settings = { mode: "cpu", level: "normal", opps: "1", target: "100", muted: false, ...store.get(cfg.key, {}) };
  if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
  if (!["1", "2", "3"].includes(String(settings.opps))) settings.opps = "1";
  if (!["0", "100"].includes(String(settings.target))) settings.target = "100";
  settings.opps = String(settings.opps);
  settings.target = String(settings.target);

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
      osc.type = type;
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + 0.006);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
      osc.connect(amp).connect(audio.destination);
      osc.start(t);
      osc.stop(t + length + 0.02);
    } catch (err) { /* audio unavailable */ }
  }
  const sfx = {
    card: () => { tone(260, 0, 0.05, "square", 0.05); tone(190, 0.02, 0.07, "triangle", 0.08); },
    draw: () => tone(340, 0, 0.08, "triangle", 0.07),
    win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
    lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
  };

  const online = () => settings.mode === "online";
  const cpu = () => settings.mode === "cpu";
  const two = () => settings.mode === "two";
  const count = () => (online() ? 2 : Number(settings.opps) + 1);

  let myP = 0; // online: role 0 plays first in round one
  let roomSeed = 0;
  let roundNo = 0;
  let nextMe = false;
  let nextThem = false;
  const inbox = [];
  let S = null;
  let scores = [];
  let roundStart = [];
  let busy = false;
  let covered = false;
  let lastMover = null;
  let pendingChoice = null;
  let lastNote = "";
  let epoch = 0; // bumps whenever the position is replaced, so a late timer can never touch the new one

  const statusEl = $("status");
  const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };
  const viewP = () => (online() ? myP : cpu() ? 0 : S ? S.turn : 0);
  const humanTurn = () => !!S && !S.over && !busy && !covered && (online() ? net.active && S.turn === myP : cpu() ? S.turn === 0 : true);
  const nameOf = (p) => (cpu() ? (p === 0 ? "You" : count() > 2 ? `Computer ${p}` : "Computer") : online() ? (p === myP ? "You" : "Friend") : `Player ${p + 1}`);
  const verb = (p, you, other) => (nameOf(p) === "You" ? you : other);

  // ---------- online ----------
  const net = createOnline({
    container: document.querySelector(".g-page"),
    before: $("scores"),
    prefix: cfg.prefix,
    names: ["Player 1", "Player 2"],
    startInfo: () => ({ target: settings.target }),
    onStart: ({ role, seed, info }) => {
      myP = role;
      roomSeed = seed;
      if (info && ["0", "100"].includes(String(info.target))) settings.target = String(info.target);
      syncChips();
      scores = [0, 0];
      roundNo = 0;
      lastMover = null;
      inbox.length = 0;
      nextMe = nextThem = false;
      newRound();
    },
    onData: (m) => { inbox.push(m); drain(); },
    onLeft: () => { inbox.length = 0; setStatus("Your friend left the game."); render(); },
    getState: () => ({ S, scores, roundNo, roomSeed, nextMe, nextThem, roundStart, lastMover, inbox: [...inbox] }),
    setState: (g) => {
      epoch += 1;
      S = g.S; scores = g.scores; roundNo = g.roundNo; roomSeed = g.roomSeed; nextMe = g.nextMe; nextThem = g.nextThem;
      roundStart = g.roundStart; lastMover = g.lastMover;
      busy = false; covered = false; pendingChoice = null;
      $("end").classList.remove("show");
      inbox.length = 0; inbox.push(...g.inbox);
      if (!S) { render(); return; }
      if (S.over) { scores = [...roundStart]; render(); endRound(); drain(); return; }
      afterMove();
    },
  });
  function drain() {
    while (online() && net.active && inbox.length) {
      const m = inbox[0];
      if (m.t === "next") { inbox.shift(); nextThem = true; maybeNext(); continue; }
      if (!S || S.over) { inbox.shift(); continue; }
      // a move can arrive while this side is still finishing the last one: keep it until it really is their turn
      if (busy || S.turn === myP) break;
      inbox.shift();
      if (m.t === "play" && rules.legalPlays(S).includes(m.id)) doPlay(m.id, m.c);
      else if (m.t === "draw" && rules.canDrawNow(S)) doDraw();
    }
  }

  // ---------- view ----------
  const table = createTable($("table"), { onCard: (id) => onCard(id), onDraw: () => onDraw() });
  function render() {
    renderScores();
    if (!S) {
      table.render({ opps: [], draw: { count: 0, enabled: false, label: cfg.drawLabel({}) }, top: null, hand: [], handActive: false });
      return;
    }
    const me = viewP();
    const active = humanTurn();
    const ok = new Set(active ? rules.legalPlays(S, me) : []);
    const top = S.disc[S.disc.length - 1];
    const hand = [...S.hands[me]].sort((a, b) => cfg.sortKey(a) - cfg.sortKey(b));
    table.render({
      opps: S.hands.map((h, p) => ({ p, name: nameOf(p), count: h.length, active: S.turn === p && !S.over, tag: h.length === 1 ? "Last card!" : "" })).filter((o) => o.p !== me),
      draw: { count: S.draw.length, enabled: active && rules.canDrawNow(S), label: cfg.drawLabel(S) },
      top: { id: top, ...cfg.face(top) },
      under: S.disc.slice(-3, -1).reverse().map((id) => cfg.face(id)),
      badges: cfg.badges(S),
      hand: hand.map((id) => ({ id, ...cfg.face(id), ok: ok.has(id) })),
      handActive: active,
    });
    const choiceEl = $("choice");
    if (pendingChoice !== null && active) {
      choiceEl.hidden = false;
      choiceEl.innerHTML = `<span class="say">Call a ${cfg.callWord}:</span>${rules.choices().map((c) => `<button type="button" class="g-btn ${c.cls || ""}" data-c="${c.value}">${esc(c.label)}</button>`).join("")}<button type="button" class="g-btn ghost" data-c="cancel">Cancel</button>`;
    } else { choiceEl.hidden = true; choiceEl.innerHTML = ""; }
  }
  function renderScores() {
    const box = $("scores");
    if (!S || Number(settings.target) === 0) { box.innerHTML = ""; return; }
    box.innerHTML = scores.map((v, p) => `<div class="score${S.turn === p && !S.over ? " turn" : ""}"><span class="nm">${esc(nameOf(p))}</span><b>${v}</b></div>`).join("");
  }
  function announce() {
    if (!S || S.over) return;
    if (online() && !net.active) return setStatus("Create or join a room to start.");
    const prefix = lastNote ? `${lastNote} ` : "";
    if (!humanTurn()) return setStatus(`${prefix}${cpu() || online() ? (S.turn === viewP() ? "Your turn…" : `${nameOf(S.turn)}${cpu() ? " is thinking" : "'s turn"}…`) : `${nameOf(S.turn)}'s turn…`}`);
    const me = viewP();
    const who = two() ? `${nameOf(me)}: ` : "";
    if (S.pend > 0) return setStatus(`${prefix}${who}Pick ${S.pend} cards, or answer with another pick card.`, "bad");
    if (rules.canDrawNow(S)) return setStatus(`${prefix}${who}Nothing to play. ${cfg.drawLabel(S)}.`, "bad");
    return setStatus(`${prefix}${who}Your turn. Play a card that matches.`);
  }

  // ---------- flow ----------
  function newRound() {
    epoch += 1;
    roundNo += 1;
    roundStart = [...scores];
    const seed = online() ? (roomSeed + roundNo * 7919) >>> 0 : (Math.random() * 4294967296) >>> 0;
    S = rules.deal(seed, count(), (roundNo - 1) % count());
    pendingChoice = null;
    busy = false;
    covered = false;
    lastNote = "";
    lastMover = two() ? -1 : null; // hot seat: the first player gets the "pass the device" screen
    nextMe = false;
    $("end").classList.remove("show");
    net.setOver(false);
    sfx.card();
    afterMove();
  }
  function afterMove() {
    if (!S) return;
    if (S.over) { render(); endRound(); return; }
    if (two() && lastMover !== null && lastMover !== S.turn && !covered) {
      covered = true;
      $("coverTitle").textContent = `Pass to ${nameOf(S.turn)}`;
      $("cover").classList.add("show");
    }
    render();
    if (cpu() && S.turn !== 0) { cpuTurn(); return; }
    announce();
    drain();
  }
  async function step() {
    const e = epoch;
    busy = true;
    render();
    await sleep(420);
    if (e !== epoch) return;
    busy = false;
    afterMove();
  }
  async function cpuTurn() {
    const e = epoch;
    busy = true;
    render();
    setStatus(`${lastNote ? `${lastNote} ` : ""}${nameOf(S.turn)} is thinking…`);
    await sleep(750 + Math.random() * 450);
    if (e !== epoch || !S || S.over) return;
    busy = false;
    const m = rules.choose(S, settings.level);
    if (m) doPlay(m.id, m.choice); else doDraw();
  }
  function skippedNote() {
    return S.skipped && S.skipped.length ? ` ${S.skipped.map((p) => nameOf(p)).join(" and ")} had nothing to play and passed.` : "";
  }
  function doPlay(id, choice) {
    const seat = S.turn;
    const notes = rules.play(S, id, choice);
    if (!notes) return false;
    sfx.card();
    lastMover = seat;
    lastNote = `${nameOf(seat)} played the ${cfg.face(id).label}${notes.length ? `. ${notes.join(". ")}` : ""}.${S ? skippedNote() : ""}`;
    pendingChoice = null;
    if (S.over) { render(); endRound(); return true; }
    step();
    return true;
  }
  function doDraw() {
    const seat = S.turn;
    const got = rules.draw(S);
    const ids = Array.isArray(got) ? got : got === null || got === undefined ? [] : [got];
    sfx.draw();
    lastMover = seat;
    const what = ids.length === 1 && seat === viewP() && !two() ? `the ${cfg.face(ids[0]).label}` : `${ids.length} card${ids.length === 1 ? "" : "s"}`;
    lastNote = `${nameOf(seat)} ${verb(seat, "picked up", "picked up")} ${what}.${skippedNote()}`;
    pendingChoice = null;
    if (S.over) { render(); endRound(); return; }
    step();
  }
  function onCard(id) {
    if (!humanTurn() || !rules.legalPlays(S, viewP()).includes(id)) return;
    if (rules.needsChoice(id)) { pendingChoice = id; render(); setStatus(`Which ${cfg.callWord} do you call?`); return; }
    submit(id, undefined);
  }
  function submit(id, choice) {
    if (online()) net.send({ t: "play", id, c: choice });
    doPlay(id, choice);
  }
  function onDraw() {
    if (!humanTurn() || !rules.canDrawNow(S)) return;
    if (online()) net.send({ t: "draw" });
    doDraw();
  }
  $("choice").addEventListener("click", (e) => {
    const b = e.target.closest("[data-c]");
    if (!b || pendingChoice === null) return;
    if (b.dataset.c === "cancel") { pendingChoice = null; render(); announce(); return; }
    const id = pendingChoice;
    pendingChoice = null;
    submit(id, Number(b.dataset.c));
  });

  function endRound() {
    busy = false;
    covered = false;
    $("cover").classList.remove("show");
    const r = rules.result(S);
    if (r.winner >= 0) scores[r.winner] += r.gain;
    render();
    const target = Number(settings.target);
    const matchWinner = target ? scores.findIndex((v) => v >= target) : -1;
    const done = !target || matchWinner >= 0;
    const me = viewP();
    const w = done && target ? scores.indexOf(Math.max(...scores)) : r.winner;
    const you = (p) => (cpu() || online() ? p === me : null);
    let title;
    if (done) title = cpu() || online() ? (you(w) ? "You win!" : online() ? "Your friend wins." : `${nameOf(w)} wins`) : `${nameOf(w)} wins${target ? " the match" : ""}!`;
    else title = cpu() || online() ? (you(r.winner) ? "You win the round!" : `${online() ? "Your friend" : nameOf(r.winner)} wins the round`) : `${nameOf(r.winner)} wins the round`;
    const lost = (cpu() || online()) && !you(done ? w : r.winner);
    lost ? sfx.lose() : sfx.win();
    $("endEmoji").textContent = lost ? (cpu() ? "🤖" : "🎲") : done ? "🏆" : "🎉";
    $("endTitle").textContent = title;
    const totals = target ? ` Totals: ${scores.map((v, p) => `${nameOf(p)} ${v}`).join(" · ")}.` : "";
    $("endText").textContent = `${r.text} ${nameOf(r.winner)} ${verb(r.winner, "score", "scores")} ${r.gain}.${totals}`;
    $("again").dataset.done = done ? "1" : "";
    $("again").textContent = online() ? (done ? "Rematch" : nextMe ? "Waiting for friend…" : "Next round") : done ? "Play again" : "Next round";
    setStatus(title, "good");
    if (done) net.setOver(true);
    setTimeout(() => $("end").classList.add("show"), 700 / SPEED);
  }
  function maybeNext() {
    if (nextMe && nextThem && online()) { nextMe = nextThem = false; newRound(); }
  }

  // ---------- controls ----------
  function syncChips() {
    ["mode", "level", "opps", "target"].forEach((k) => document.querySelectorAll(`#${k === "opps" ? "count" : k} .g-chip`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === String(settings[k])))));
    $("levelRow").hidden = !cpu();
    $("countRow").hidden = online();
    $("countLabel").textContent = cpu() ? "Opponents" : "Players";
    document.querySelectorAll("#count .g-chip").forEach((b) => { const v = Number(b.dataset.value); b.textContent = cpu() ? `${v} opponent${v === 1 ? "" : "s"}` : `${v + 1} players`; });
    $("newGame").hidden = online();
    if (online()) net.open(); else net.close();
  }
  [["mode", "mode"], ["level", "level"], ["count", "opps"], ["target", "target"]].forEach(([id, key]) =>
    $(id).addEventListener("click", (e) => {
      const chip = e.target.closest(".g-chip");
      if (!chip || String(settings[key]) === chip.dataset.value) return;
      if (online() && net.active && key === "target") return; // the host's match length applies once a game is under way
      settings[key] = chip.dataset.value;
      store.set(cfg.key, settings);
      syncChips();
      if (key === "target" && online()) return;
      startMatch();
    })
  );
  function startMatch() {
    scores = Array(count()).fill(0);
    roundNo = 0;
    lastMover = null;
    epoch += 1;
    $("cover").classList.remove("show");
    $("end").classList.remove("show");
    if (online() && !net.active) { S = null; busy = false; render(); setStatus("Create or join a room to start."); return; }
    newRound();
  }
  $("newGame").addEventListener("click", startMatch);
  $("coverGo").addEventListener("click", () => { covered = false; $("cover").classList.remove("show"); render(); announce(); });
  $("again").addEventListener("click", () => {
    $("end").classList.remove("show");
    const done = $("again").dataset.done === "1";
    if (online()) {
      if (done) net.rematch();
      else { nextMe = true; net.send({ t: "next" }); maybeNext(); if (!nextThem) setStatus("Waiting for your friend to start the next round…"); }
    } else if (done) startMatch();
    else newRound();
  });
  $("endView").addEventListener("click", () => $("end").classList.remove("show"));
  const mute = $("mute");
  const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
  mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(cfg.key, settings); syncMute(); });

  syncChips();
  syncMute();
  startMatch();
  const invited = net.roomParam();
  if (invited) { settings.mode = "online"; syncChips(); startMatch(); net.join(invited); }

  window.__cg = {
    get S() { return S; }, get scores() { return scores; }, get myP() { return myP; }, get busy() { return busy; }, get covered() { return covered; }, get over() { return !!S && S.over; },
    onCard, onDraw, submit, humanTurn, rules, face: cfg.face,
    choose: () => rules.choose(S, "normal"),
  };
}
