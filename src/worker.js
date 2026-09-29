/**
 * Cloudflare Worker for Zone 210.
 *
 * Static files (public/) are served straight from Cloudflare's asset store. This Worker only runs for
 * /api/* (see run_worker_first in wrangler.jsonc). Today that's one endpoint:
 *
 *   GET /api/turn  mints short-lived TURN relay credentials from Cloudflare Realtime TURN, so the API token
 *                  never reaches the browser or the (public) repo. Ghana Ludo 3D fetches it when a room is
 *                  created or joined (see TURN_CREDENTIALS_URL in public/games/ludo/src/config.js).
 *
 * Secrets (Worker -> Settings -> Variables and Secrets; add BOTH as type "Secret" so a redeploy can never
 * overwrite them):
 *   TURN_KEY_ID          the TURN key's ID
 *   TURN_KEY_API_TOKEN   the TURN key's API token
 *
 * If either is missing, or Cloudflare errors, the endpoint returns an empty list and the game simply falls
 * back to direct peer-to-peer connections, so it can never break online play.
 */

const TTL_SECONDS = 4 * 60 * 60; // long enough for a game, short enough to limit abuse

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });

async function turnCredentials(request, env) {
  // Only the site itself should be asking. Browsers label cross-site fetches; refuse those.
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin" && site !== "none") return json([], 403);

  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) {
    return json([], 200, { "X-Relay": "not-configured" });
  }

  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: TTL_SECONDS }),
      }
    );
    if (!res.ok) return json([], 200, { "X-Relay": `upstream-${res.status}` });

    const data = await res.json();
    const servers = Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [];

    // Browsers (notably Firefox) block TURN on port 53, and it just slows ICE gathering down.
    const cleaned = servers
      .map((s) => ({ ...s, urls: [].concat(s.urls).filter((u) => !/:53(\?|$)/.test(u)) }))
      .filter((s) => s.urls.length > 0);

    return json(cleaned, 200, { "X-Relay": "ok" });
  } catch (err) {
    return json([], 200, { "X-Relay": "error" });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/turn" && request.method === "GET") return turnCredentials(request, env);
    if (url.pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(request); // safety net; static files normally never reach the Worker
  },
};
