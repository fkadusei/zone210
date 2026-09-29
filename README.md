# Zone 210

**Play now: https://zone210.com**

A free, no-sign-up games and activities site for kids and adults. It is a plain static site (HTML, CSS and
ES modules; no build step) with a landing page and one folder per game. Everything runs in the browser and scores /
saved games stay on the player's own device.

| Game | For | Notes |
|---|---|---|
| **Ghana Ludo 3D** | Everyone | three.js board, online rooms (peer-to-peer), computer players, Easy/Normal/Hard |
| **Oware** | Everyone | Ghana's traditional mancala (Abapa rules), vs computer or 2 players |
| **Ghana & Africa Quiz** | Everyone | 76 questions; Kids / Family / Adults levels, timer optional |
| **Connect Four** | Everyone | minimax computer with three levels, or 2 players |
| **Math Cross Puzzle** | Everyone | crossword-style sums (the static UI of the original Python app) |
| **Memory Match** | Kids | themes, three sizes, 1–2 players |
| **Doodle & Color** | Kids | rainbow brush, stamps, colouring pages with a paint bucket, save as PNG |
| **Spell Sprout** | Kids | spelling practice with spoken words |
| **Word Guess** | Adults | daily word + practice, stats, shareable result |
| **Sudoku** | Adults | generated puzzles with exactly one solution, notes, hints, auto-save |
| **Tile Merge** | Adults | 2048-style, swipe or arrow keys, undo |
| **Minesweeper** | Adults | three sizes, flags, chording, touch long-press, best times |

## Structure

```
wrangler.jsonc        Cloudflare config: static site in ./public + a tiny Worker for /api/*
src/worker.js         the Worker: GET /api/turn mints relay (TURN) credentials for Ludo's online rooms
public/               the website itself (everything below is served as static files)
  index.html          landing page (audience tabs, search, tag filters, "Surprise me")
  _headers            security headers
  assets/
    games.js          the catalog: one entry per game
    portal.js/.css    landing page
    shell.css         shared theme used by the simpler games
    back-link.js      injects the "← All games" pill into a game page
    thumbs/<id>.jpg   optional card screenshot (falls back to generated art)
  games/<id>/         one folder per game (index.html + its own files)
```

Games with real rules keep them in a pure `logic.js` (no DOM) so they can be tested in Node. The rules for Connect
Four, Oware, Tile Merge, Sudoku, Minesweeper and Word Guess were tested that way (uniqueness of Sudoku solutions,
Oware seed conservation over hundreds of random games, scoring checked against a reference implementation, and so on).

## Adding a game

1. Create `public/games/my-game/index.html` (any tech you like; use relative paths).
2. Add `<script src="../../assets/back-link.js"></script>` before `</body>` so players can get back, or link to
   `../../` yourself. For the shared look, also link `../../assets/shell.css`.
3. Add an entry to `public/assets/games.js` (`id` must match the folder name). Set `audience` to `kids`, `adults` or `all`.
4. Optional: drop a 16:10 screenshot at `public/assets/thumbs/my-game.jpg`.

## Run locally

Browsers block ES modules from `file://`, so serve the folder. The simplest way (no `/api/turn`, which is fine: Ludo just
skips the relay):

```bash
cd public && python3 -m http.server 8000     # then open http://localhost:8000
```

To run the site and the Worker together exactly as Cloudflare does: `npx wrangler dev`.

## Deploy to Cloudflare (Workers with static assets)

1. Push this repo to GitHub.
2. Cloudflare dashboard → *Workers & Pages* → *Create application* → import the GitHub repo. Use these settings:
   - **Project name:** `zone210` (must match `name` in `wrangler.jsonc`)
   - **Build command:** empty
   - **Deploy command:** `npx wrangler deploy` (the default)
   - **Path:** `/`
   Leave everything else as-is and click **Deploy**. The site appears at `https://zone210.<your-subdomain>.workers.dev`.
3. **Custom domain:** the Worker → *Settings* → *Domains & Routes* → *Add* → *Custom domain* → `zone210.com`, then again for
   `www.zone210.com`. If the domain's DNS is on Cloudflare the records and HTTPS certificate are created for you.
4. **Relay for Ludo online play (optional but recommended):** Cloudflare dashboard → *Realtime* → *TURN Server* → create a key.
   Then the Worker → *Settings* → *Variables and Secrets* → add **both** `TURN_KEY_ID` and `TURN_KEY_API_TOKEN` as type
   **Secret** (secrets survive redeploys; plain variables set in the dashboard can be overwritten by a deploy). Check
   `https://zone210.com/api/turn`: it should return JSON containing `turn:` URLs (response header `X-Relay: ok`). Without the
   secrets it returns `[]` and the game simply uses direct peer-to-peer connections.

Every push to `main` redeploys automatically. HTTPS is required for sound, copying invite links and WebRTC.

## Notes

- Ludo's online rooms are peer-to-peer over WebRTC via the free public PeerJS broker (loaded from the jsDelivr CDN,
  as is three.js). For full independence, self-host those two.
- `games/math-cross` is the original FastAPI app's static UI. The Python server only served these files, so it runs
  fine as plain static pages. Its MIT license is included.
- Question and word lists are hand-written; if you spot a mistake, fix it in `games/quiz/questions.js` or
  `games/word-guess/words.js`.
