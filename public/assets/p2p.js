/**
 * Peer-to-peer rooms for two-player games (WebRTC via PeerJS). No game server: one browser hosts a room,
 * the other connects straight to it. PeerJS's free cloud broker only introduces the peers.
 *
 * Relay (TURN) credentials come from the same config as Ludo, so one setting covers both games.
 */
import { TURN_SERVERS, TURN_CREDENTIALS_URL } from "../games/ludo/src/config.js";

const PEERJS_URL = "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";
// No 0/O/1/I so codes are easy to read out loud.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

export const normalizeCode = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
const randomCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function peerConfig() {
  const iceServers = [...STUN_SERVERS, ...TURN_SERVERS];
  if (TURN_CREDENTIALS_URL) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(TURN_CREDENTIALS_URL, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const extra = await res.json();
        if (Array.isArray(extra)) iceServers.push(...extra);
      }
    } catch (err) {
      // no relay this time; direct connections still work on most networks
    }
  }
  return { config: { iceServers } };
}

let loading = null;
function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PEERJS_URL;
      s.onload = resolve;
      s.onerror = () => {
        loading = null;
        reject(new Error("Could not load the multiplayer library. Check your internet connection."));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

async function openPeer(id) {
  const cfg = await peerConfig();
  return new Promise((resolve, reject) => {
    const peer = id ? new window.Peer(id, cfg) : new window.Peer(cfg);
    const timer = setTimeout(() => {
      peer.destroy();
      reject(new Error("Could not reach the matchmaking service. Try again."));
    }, 12000);
    peer.on("open", () => {
      clearTimeout(timer);
      resolve(peer);
    });
    peer.on("error", (err) => {
      clearTimeout(timer);
      peer.destroy();
      reject(err);
    });
  });
}

/**
 * Host a room. `prefix` namespaces the codes per game. Pass `code` to re-open a specific room (for example
 * after a page reload); the broker can take a few seconds to free the old id, so this retries.
 * handlers: { onConnect(conn), onData(conn, msg), onClose(conn) }
 * Resolves to { code, broadcast(msg), sendTo(conn, msg), close() }.
 */
export async function hostRoom(handlers, { prefix = "zone210-", code: fixed = null } = {}) {
  await loadPeerJS();
  let peer = null;
  let code = fixed;
  for (let attempt = 0; attempt < (fixed ? 8 : 6) && !peer; attempt += 1) {
    if (!fixed) code = randomCode();
    try {
      peer = await openPeer(prefix + code);
    } catch (err) {
      if (err && err.type !== "unavailable-id") throw err;
      if (fixed) await sleep(1500);
    }
  }
  if (!peer) throw new Error(fixed ? "Could not re-open your room." : "Could not create a room. Try again.");

  const conns = new Set();
  peer.on("connection", (conn) => {
    conn.on("open", () => {
      conns.add(conn);
      handlers.onConnect(conn);
    });
    conn.on("data", (msg) => handlers.onData(conn, msg));
    const gone = () => {
      if (conns.delete(conn)) handlers.onClose(conn);
    };
    conn.on("close", gone);
    conn.on("error", gone);
  });

  return {
    code,
    broadcast(msg) {
      conns.forEach((c) => c.open && c.send(msg));
    },
    sendTo(conn, msg) {
      if (conn.open) conn.send(msg);
    },
    close() {
      peer.destroy();
    },
  };
}

/** Join a room. handlers: { onData(msg), onClose() }. Resolves to { send(msg), close() }. */
export async function joinRoom(code, handlers, { prefix = "zone210-" } = {}) {
  await loadPeerJS();
  const peer = await openPeer(null);
  const conn = peer.connect(prefix + normalizeCode(code), { reliable: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Could not connect. Check the room code, or your network may be blocking direct connections (try another network).")),
      15000
    );
    conn.on("open", () => {
      clearTimeout(timer);
      resolve();
    });
    peer.on("error", (err) => {
      clearTimeout(timer);
      reject(err && err.type === "peer-unavailable" ? new Error("Room not found. Check the code.") : err);
    });
  }).catch((err) => {
    peer.destroy();
    throw err;
  });

  conn.on("data", (msg) => handlers.onData(msg));
  let closed = false;
  const gone = () => {
    if (closed) return;
    closed = true;
    handlers.onClose();
  };
  conn.on("close", gone);
  conn.on("error", gone);

  return {
    send(msg) {
      if (conn.open) conn.send(msg);
    },
    close() {
      closed = true;
      peer.destroy();
    },
  };
}
