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
 *   });
 *   net.open() / net.close()   // show the lobby (online mode on) or leave and hide it (online mode off)
 *   net.send(msg)              // tell the other player about your move
 *   net.setOver(true)          // game finished: enables the Rematch button
 *   net.rematch()              // ask for a rematch (same as the button)
 *   net.active                 // true while a game is under way with a connected friend
 *   net.role                   // 0 or 1
 *   net.roomParam()            // code from ?room=CODE in the address, or ""
 *   net.join(code)
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

  const st = { view: "idle", link: null, isHost: false, guestConn: null, code: "", role: 0, n: 0, started: false, over: false, peerGone: false, meWants: false, theyWant: false, side: "random", busy: false, err: "" };

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
      root.innerHTML = `<div class="bar"><span class="pill ${gone ? "warn" : ""}">${gone ? "⚠️ Your friend left" : `🌐 Online · Room ${esc(st.code)} · You are ${esc(who)}`}</span>
        <span class="row">${gone ? "" : `<button class="g-btn" data-act="rematch" ${st.over && !st.meWants ? "" : "disabled"}>${st.meWants ? "Waiting for friend…" : st.theyWant ? "Accept rematch" : "Rematch"}</button>`}<button class="g-btn ghost" data-act="leave">Leave</button></span></div>${st.theyWant && !st.meWants && !gone ? "<p>Your friend wants a rematch.</p>" : ""}`;
    }
  }

  function reset(view = "idle") {
    if (st.link) {
      try { raw({ z: "bye" }); } catch (e) { /* already closed */ }
      try { st.link.close(); } catch (e) { /* already closed */ }
    }
    Object.assign(st, { view, link: null, isHost: false, guestConn: null, code: "", started: false, over: false, peerGone: false, meWants: false, theyWant: false, busy: false, n: 0 });
  }

  function peerLeft() {
    if (!st.link || st.peerGone) return;
    st.peerGone = true;
    st.started = false;
    if (st.view === "waiting") { st.guestConn = null; render(); return; }
    render();
    o.onLeft && o.onLeft();
  }

  function startGame(first) {
    const hostRole = first ? (st.side === "random" ? Math.floor(Math.random() * 2) : Number(st.side)) : 1 - st.role;
    const seed = rand32();
    st.n += 1;
    st.role = hostRole;
    st.started = true; st.over = false; st.meWants = false; st.theyWant = false; st.peerGone = false; st.view = "playing";
    const info = o.startInfo ? o.startInfo() : undefined;
    st.link.broadcast({ z: "start", role: 1 - hostRole, seed, n: st.n, info });
    render();
    o.onStart({ role: hostRole, seed, n: st.n, info });
  }

  function handle(msg) {
    if (!msg || typeof msg !== "object") return;
    if (msg.z === "start") {
      st.role = msg.role; st.n = msg.n; st.started = true; st.over = false; st.meWants = false; st.theyWant = false; st.peerGone = false; st.view = "playing";
      render();
      o.onStart({ role: msg.role, seed: msg.seed, n: msg.n, info: msg.info });
    } else if (msg.z === "g") {
      if (st.started) o.onData(msg.d);
    } else if (msg.z === "rm") {
      st.theyWant = true;
      if (st.isHost && st.meWants) startGame(false); else render();
    } else if (msg.z === "bye") {
      peerLeft();
    }
  }

  async function create() {
    st.busy = true; st.err = ""; render();
    try {
      const link = await p2p.hostRoom({
        onConnect: (conn) => {
          if (st.guestConn) { try { conn.close(); } catch (e) { /* ignore */ } return; }
          st.guestConn = conn;
          startGame(true);
        },
        onData: (conn, msg) => handle(msg),
        onClose: (conn) => { if (conn === st.guestConn) peerLeft(); },
      }, { prefix: o.prefix });
      st.link = link; st.isHost = true; st.code = link.code; st.view = "waiting";
    } catch (err) {
      st.err = err.message || "Could not create a room.";
    }
    st.busy = false; render();
  }

  async function join(code) {
    const clean = p2p.normalizeCode(code);
    if (clean.length < 5) { st.err = "Enter the 5-letter room code."; render(); return; }
    st.busy = true; st.err = ""; st.view = "idle"; render();
    try {
      st.link = await p2p.joinRoom(clean, { onData: handle, onClose: () => peerLeft() }, { prefix: o.prefix });
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

  return {
    get active() { return st.started && !st.peerGone; },
    get role() { return st.role; },
    get code() { return st.code; },
    open() { root.hidden = false; render(); },
    close() { reset("idle"); root.hidden = true; },
    send(msg) { if (st.link && st.started) raw({ z: "g", d: msg }); },
    setOver(v) { if (st.over !== v) { st.over = v; if (st.view === "playing") render(); } },
    roomParam() { return p2p.normalizeCode(new URLSearchParams(location.search).get("room") || ""); },
    rematch: requestRematch,
    join,
  };
}
