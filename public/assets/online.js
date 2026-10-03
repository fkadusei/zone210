/**
 * Shared "play a friend online" lobby for Zone 210 two-player games (peer to peer via assets/p2p.js).
 *
 * Both browsers run the same game. The lobby only handles rooms: create or join with a 5-letter code (or an
 * invite link ?room=CODE), who plays first, rematches, and leaving. The game sends its own moves with net.send().
 *
 *   const net = createOnline({
 *     container,               // element the lobby panel is added to
 *     prefix: "zone210-c4-",   // namespaces room codes per game
 *     names: ["Red", "Yellow"],// side 0 moves first
 *     startInfo() {},          // optional, host only: extra settings (e.g. board size) sent to the guest with each start
 *     onStart({ role, seed, n, info }) {},  // a game begins (and again for each rematch). role = 0 or 1, seed is shared
 *     onData(msg) {},          // a move from the other player
 *     onLeft() {},             // the other player left or dropped
 *     privateState: true,      // optional: the position holds secrets (e.g. Battleship fleets), so it is only saved on this
 *                              // device and never sent; the game gets onReconnect() instead and must resend what was lost
 *     onReconnect() {},
 *     getState() {}, setState(s) {}, // optional: snapshot / restore the whole game position (plain JSON). With these,
 *                              // a page reload rejoins the same room and carries on (see "Rejoining" below)
 *   });
 *   net.open() / net.close()   // show the lobby (online mode on) or leave and hide it (online mode off)
 *   net.send(msg)              // tell the other player about your move
 *   net.setOver(true)          // game finished: enables the Rematch button
 *   net.rematch()              // ask for a rematch (same as the button)
 *   net.active                 // true while a game is under way with a connected friend
 *   net.role                   // 0 or 1
 *   net.roomParam()            // code from ?room=CODE in the address, or ""
 *   net.join(code)
 *
 * Rejoining: while a game is under way the lobby keeps {room, role, seed, position} in sessionStorage. After a reload it
 * reopens the room (host) or reconnects (guest) and the two sides swap "hi" messages; whoever has seen fewer moves adopts
 * the other's position. getState() must therefore include anything queued but not yet applied (e.g. an inbox of moves),
 * and setState() must clear timers/animations and redraw. A deliberate Leave (or the friend leaving) forgets the session.
 */
import * as p2p from "./p2p.js";

const CSS = `
.onl { display: grid; gap: 10px; margin-bottom: 12px; }
.onl[hidden] { display: none; }
.onl h2 { margin: 0; font-size: 1.05rem; }
.onl p { margin: 0; color: var(--muted); font-size: 0.92rem; line-height: 1.45; }
.onl .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.onl .code { font: 800 2.2rem/1 var(--font); letter-spacing: 0.22em; color: var(--gold); padding: 8px 0; }
.onl input { font: 800 1.1rem var(--font); letter-spacing: 0.2em; text-transform: uppercase; width: 8.5em; color: var(--ink); background: var(--surface-2); border: 1px solid var(--line-strong); border-radius: 12px; padding: 9px 12px; }
.onl input:focus { outline: 3px solid var(--focus); outline-offset: 1px; }
.onl .err { color: var(--red); font-weight: 700; min-height: 1.1em; }
.onl .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
.onl .pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-weight: 800; font-size: 0.85rem; background: color-mix(in srgb, var(--green) 18%, var(--surface)); color: var(--ink); border: 1px solid color-mix(in srgb, var(--green) 40%, var(--line)); }
.onl .pill.warn { background: color-mix(in srgb, var(--red) 16%, var(--surface)); border-color: color-mix(in srgb, var(--red) 40%, var(--line)); }
`;

let cssDone = false;
const rand32 = () => (Math.random() * 4294967296) >>> 0;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function createOnline(o) {
  if (!cssDone) {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    cssDone = true;
  }
  const names = o.names || ["Player 1", "Player 2"];
  const root = document.createElement("section");
  root.className = "g-panel onl";
  root.setAttribute("aria-label", "Online play");
  root.hidden = true;
  (o.before ? o.before.parentNode.insertBefore(root, o.before) : o.container.appendChild(root));

  const st = { view: "idle", link: null, isHost: false, guestConn: null, code: "", role: 0, n: 0, started: false, over: false, peerGone: false, meWants: false, theyWant: false, side: "random", busy: false, err: "", seed: 0, info: undefined, seq: 0, reconnecting: false, touched: false, gen: 0 };
  const canResume = !!(o.getState && o.setState);
  const KEY = "z210_online_" + (o.prefix || "");
  const mem = {
    read() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; } },
    write(v) { try { if (v) sessionStorage.setItem(KEY, JSON.stringify(v)); else sessionStorage.removeItem(KEY); } catch (e) { /* private mode */ } },
  };
  function persist() {
    if (!canResume || !st.started || !st.code) return;
    let state;
    try { state = o.getState(); } catch (e) { return; }
    mem.write({ path: location.pathname, code: st.code, host: st.isHost, role: st.role, seed: st.seed, n: st.n, info: st.info, over: st.over, side: st.side, seq: st.seq, state });
  }
  let persistTimer = 0;
  const persistSoon = () => { if (!canResume) return; clearTimeout(persistTimer); persistTimer = setTimeout(persist, 250); };
  if (canResume) {
    addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", () => { if (document.hidden) persist(); });
  }
  const saved0 = canResume ? mem.read() : null; // read now: the game may call close() while setting up, which forgets it
  const RECONNECT_MS = 120000;
  let giveUpTimer = 0;

  const raw = (msg) => {
    if (!st.link) return;
    if (st.isHost) st.link.broadcast(msg);
    else st.link.send(msg);
  };
  const inviteUrl = () => `${location.origin}${location.pathname}?room=${st.code}`;

  function render() {
    const err = `<p class="err" role="alert">${esc(st.err)}</p>`;
    if (st.view === "idle") {
      root.innerHTML = `<h2>🌐 Play a friend online</h2>
        <p>Create a room and send your friend the code or link, or join a room with a code you were given.</p>
        <div class="row"><span class="lbl">I play</span><div class="g-chips" id="onlSide">${[...names, "Random"].map((n, i) => `<button class="g-chip" data-side="${i === 2 ? "random" : i}" aria-pressed="${String(i === 2 ? "random" : i) === String(st.side)}">${i === 2 ? "🎲 Random" : esc(n) + (i === 0 ? " (first)" : " (second)")}</button>`).join("")}</div></div>
        <div class="row"><button class="g-btn" data-act="create" ${st.busy ? "disabled" : ""}>${st.busy ? "Please wait…" : "Create a room"}</button></div>
        <div class="row"><input id="onlCode" maxlength="5" placeholder="CODE" aria-label="Room code" autocomplete="off" autocapitalize="characters"><button class="g-btn ghost" data-act="join" ${st.busy ? "disabled" : ""}>Join</button></div>${err}`;
    } else if (st.view === "waiting") {
      root.innerHTML = `<h2>Room created</h2><div class="code" aria-label="Room code">${esc(st.code)}</div>
        <p>Waiting for your friend… They can open this game, choose Online, and enter the code, or just open your invite link.</p>
        <div class="row"><button class="g-btn" data-act="copy">Copy invite link</button><button class="g-btn ghost" data-act="leave">Cancel</button></div>${err}`;
    } else if (st.view === "joined") {
      root.innerHTML = `<h2>Connected</h2><p>Waiting for the host to start the game…</p><div class="row"><button class="g-btn ghost" data-act="leave">Leave</button></div>${err}`;
    } else {
      const who = names[st.role];
      const gone = st.peerGone;
      root.innerHTML = `<div class="bar"><span class="pill ${gone ? "warn" : ""}">${gone ? (st.reconnecting ? "⏳ Reconnecting…" : "⚠️ Your friend left") : `🌐 Online · Room ${esc(st.code)} · You are ${esc(who)}`}</span>
        <span class="row">${gone ? "" : `<button class="g-btn" data-act="rematch" ${st.over && !st.meWants ? "" : "disabled"}>${st.meWants ? "Waiting for friend…" : st.theyWant ? "Accept rematch" : "Rematch"}</button>`}<button class="g-btn ghost" data-act="leave">Leave</button></span></div>${st.theyWant && !st.meWants && !gone ? "<p>Your friend wants a rematch.</p>" : ""}`;
    }
  }

  function reset(view = "idle") {
    clearTimeout(giveUpTimer);
    st.gen += 1;
    mem.write(null);
    if (st.link) {
      try { raw({ z: "bye" }); } catch (e) { /* already closed */ }
      try { st.link.close(); } catch (e) { /* already closed */ }
    }
    Object.assign(st, { view, link: null, isHost: false, guestConn: null, code: "", started: false, over: false, peerGone: false, meWants: false, theyWant: false, busy: false, n: 0, seq: 0, reconnecting: false });
  }

  function giveUp() {
    clearTimeout(giveUpTimer);
    st.gen += 1;
    st.reconnecting = false;
    st.started = false;
    mem.write(null);
    render();
    o.onLeft && o.onLeft();
  }

  // The friend's connection dropped without saying goodbye (a reload, or a flaky network): wait for them to come back.
  function peerLeft(graceful) {
    if (!st.link || st.peerGone) return;
    st.peerGone = true;
    if (st.view === "waiting") { st.started = false; st.guestConn = null; render(); return; }
    if (canResume && st.started && !graceful) {
      st.reconnecting = true;
      st.guestConn = null;
      persist();
      render();
      clearTimeout(giveUpTimer);
      giveUpTimer = setTimeout(giveUp, RECONNECT_MS);
      if (!st.isHost) reconnectGuest();
      return;
    }
    st.started = false;
    mem.write(null);
    render();
    o.onLeft && o.onLeft();
  }

  function hello() {
    if (!st.started || o.privateState) return;
    let state;
    try { state = o.getState(); } catch (e) { return; }
    raw({ z: "hi", n: st.n, seq: st.seq, over: st.over, role: st.role, seed: st.seed, info: st.info, state });
  }

  // The friend is back: swap positions, and whoever has seen fewer moves takes the other's.
  function welcomeBack() {
    clearTimeout(giveUpTimer);
    st.peerGone = false; st.reconnecting = false;
    render();
    if (o.privateState) { if (o.onReconnect) o.onReconnect(); return; }
    try { o.setState(JSON.parse(JSON.stringify(o.getState()))); } catch (e) { /* redraw so the status shows the friend is back */ }
    hello();
  }

  function adopt(msg) {
    const fresh = !st.started || msg.n !== st.n;
    st.role = 1 - msg.role; st.n = msg.n; st.seed = msg.seed; st.info = msg.info; st.started = true; st.view = "playing";
    st.meWants = false; st.theyWant = false;
    if (fresh) o.onStart({ role: st.role, seed: msg.seed, n: msg.n, info: msg.info });
    o.setState(msg.state);
    st.seq = msg.seq; st.over = !!msg.over;
    render();
    persistSoon();
  }

  async function reconnectGuest() {
    const deadline = Date.now() + RECONNECT_MS;
    const gen = (st.gen += 1);
    while (Date.now() < deadline && st.gen === gen && st.reconnecting) {
      try {
        const link = await p2p.joinRoom(st.code, { onData: handle, onClose: () => peerLeft(false) }, { prefix: o.prefix });
        if (st.gen !== gen || !st.reconnecting) { link.close(); return; }
        if (st.link) { try { st.link.close(); } catch (e) { /* already closed */ } }
        st.link = link;
        welcomeBack();
        return;
      } catch (err) {
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
  }

  // Page was reloaded mid-game: put the board back and reconnect.
  async function resume(saved) {
    st.touched = true;
    Object.assign(st, { isHost: !!saved.host, code: saved.code, role: saved.role, seed: saved.seed, n: saved.n, info: saved.info, side: saved.side, seq: saved.seq, started: true, over: !!saved.over, view: "playing", peerGone: true, reconnecting: true });
    // the game remembers its mode on some pages and not on others: make sure it is in Online mode
    const chip = document.querySelector('.g-chip[data-value="online"]');
    if (chip && chip.getAttribute("aria-pressed") !== "true") chip.click();
    root.hidden = false;
    // some pages finish loading later (3D scenes): keep trying for a few seconds
    let restored = false;
    for (let i = 0; i < 40 && !restored; i += 1) {
      try { o.onStart({ role: saved.role, seed: saved.seed, n: saved.n, info: saved.info }); o.setState(saved.state); restored = true; } catch (e) { await new Promise((r) => setTimeout(r, 300)); }
    }
    if (!restored) { mem.write(null); st.started = false; st.reconnecting = false; st.peerGone = false; render(); return; }
    render();
    giveUpTimer = setTimeout(giveUp, RECONNECT_MS);
    if (!st.isHost) { st.link = { send() {}, close() {} }; reconnectGuest(); return; }
    try {
      st.link = await p2p.hostRoom(hostHandlers(), { prefix: o.prefix, code: saved.code });
    } catch (err) {
      giveUp();
    }
  }

  function startGame(first) {
    const hostRole = first ? (st.side === "random" ? Math.floor(Math.random() * 2) : Number(st.side)) : 1 - st.role;
    const seed = rand32();
    st.n += 1;
    st.seq = 0; st.seed = seed;
    st.role = hostRole;
    st.started = true; st.over = false; st.meWants = false; st.theyWant = false; st.peerGone = false; st.view = "playing";
    const info = o.startInfo ? o.startInfo() : undefined;
    st.info = info;
    st.link.broadcast({ z: "start", role: 1 - hostRole, seed, n: st.n, info });
    render();
    o.onStart({ role: hostRole, seed, n: st.n, info });
    persistSoon();
  }

  function handle(msg) {
    if (!msg || typeof msg !== "object") return;
    if (msg.z === "start") {
      st.role = msg.role; st.n = msg.n; st.seq = 0; st.seed = msg.seed; st.info = msg.info; st.started = true; st.over = false; st.meWants = false; st.theyWant = false; st.peerGone = false; st.view = "playing";
      render();
      o.onStart({ role: msg.role, seed: msg.seed, n: msg.n, info: msg.info });
      persistSoon();
    } else if (msg.z === "hi") {
      if (canResume && msg.state && (!st.started || msg.n > st.n || (msg.n === st.n && msg.seq > st.seq))) adopt(msg);
    } else if (msg.z === "g") {
      if (st.started) { st.seq += 1; o.onData(msg.d); persistSoon(); }
    } else if (msg.z === "rm") {
      st.theyWant = true;
      if (st.isHost && st.meWants) startGame(false); else render();
    } else if (msg.z === "bye") {
      peerLeft(true);
    }
  }

  function hostHandlers() {
    return {
      onConnect: (conn) => {
        if (st.started && canResume) {
          // the same friend coming back (a reload): swap positions instead of starting over
          if (st.guestConn && st.guestConn !== conn) { const old = st.guestConn; st.guestConn = null; try { old.close(); } catch (e) { /* ignore */ } }
          st.guestConn = conn;
          welcomeBack();
          return;
        }
        if (st.guestConn) { try { conn.close(); } catch (e) { /* ignore */ } return; }
        st.guestConn = conn;
        startGame(true);
      },
      onData: (conn, msg) => handle(msg),
      onClose: (conn) => { if (conn === st.guestConn) peerLeft(false); },
    };
  }

  async function create() {
    st.touched = true;
    st.busy = true; st.err = ""; render();
    try {
      const link = await p2p.hostRoom(hostHandlers(), { prefix: o.prefix });
      st.link = link; st.isHost = true; st.code = link.code; st.view = "waiting";
    } catch (err) {
      st.err = err.message || "Could not create a room.";
    }
    st.busy = false; render();
  }

  async function join(code) {
    const clean = p2p.normalizeCode(code);
    // a reload with the invite link still in the address: resume() puts the saved game back; a fresh join would restart it
    if (canResume && saved0 && saved0.code === clean && !saved0.host && !st.started && !st.touched) return;
    st.touched = true;
    if (clean.length < 5) { st.err = "Enter the 5-letter room code."; render(); return; }
    st.busy = true; st.err = ""; st.view = "idle"; render();
    try {
      st.link = await p2p.joinRoom(clean, { onData: handle, onClose: () => peerLeft(false) }, { prefix: o.prefix });
      st.isHost = false; st.code = clean; st.view = "joined";
    } catch (err) {
      st.err = err.message || "Could not join that room.";
    }
    st.busy = false; render();
  }

  function requestRematch() {
    if (!st.started || st.peerGone || !st.over || st.meWants) return;
    st.meWants = true; raw({ z: "rm" });
    if (st.isHost && st.theyWant) startGame(false); else render();
  }

  root.addEventListener("click", (e) => {
    const side = e.target.closest("[data-side]");
    if (side) { st.side = side.dataset.side; render(); return; }
    const act = e.target.closest("[data-act]");
    if (!act || act.disabled) return;
    const a = act.dataset.act;
    if (a === "create") create();
    else if (a === "join") join(root.querySelector("#onlCode").value);
    else if (a === "copy") {
      const url = inviteUrl();
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => { act.textContent = "Link copied ✓"; }, () => window.prompt("Copy this invite link:", url));
    } else if (a === "leave") { const wasPlaying = st.started || st.peerGone; reset("idle"); render(); if (wasPlaying && o.onLeave) o.onLeave(); }
    else if (a === "rematch") requestRematch();
  });
  root.addEventListener("input", (e) => { if (e.target.id === "onlCode") e.target.value = p2p.normalizeCode(e.target.value); });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "onlCode") join(e.target.value); });

  render();

  // After a reload: put the game back. Deferred so the game's own module has finished setting up.
  if (canResume) {
    setTimeout(() => {
      const saved = saved0;
      if (!saved || st.touched) return;
      const invited = p2p.normalizeCode(new URLSearchParams(location.search).get("room") || "");
      if (invited && invited !== saved.code) { mem.write(null); return; }
      resume(saved);
    }, 0);
  }

  return {
    get active() { return st.started && !st.peerGone; },
    get role() { return st.role; },
    get code() { return st.code; },
    open() { root.hidden = false; render(); },
    close() { reset("idle"); root.hidden = true; },
    send(msg) { if (st.link && st.started) { st.seq += 1; raw({ z: "g", d: msg }); persistSoon(); } },
    setOver(v) { if (st.over !== v) { st.over = v; persistSoon(); if (st.view === "playing") render(); } },
    roomParam() { return p2p.normalizeCode(new URLSearchParams(location.search).get("room") || ""); },
    rematch: requestRematch,
    join,
  };
}
