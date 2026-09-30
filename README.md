# Zone 210

**Play now: https://zone210.com**

A free, no-sign-up games and activities site for kids and adults. It is a plain static site (HTML, CSS and
ES modules; no build step) with a landing page and one folder per game. Everything runs in the browser and scores /
saved games stay on the player's own device.

| Game | For | Notes |
|---|---|---|
| **Ghana Ludo** | Everyone | three.js board, online rooms (peer-to-peer), computer players, Easy/Normal/Hard |
| **Chess** | Everyone | 3D board (2D option), full rules, computer at three levels, online play by room code, clocks, hints, undo, saved games |
| **Oware** | Everyone | Ghana's traditional mancala (Abapa rules), vs computer, 2 players, or online with a friend |
| **Quizzz Time** | Everyone | 900+ questions in 16 topics plus endless fresh maths (hand-written plus generated capitals, flags and maths); never repeats until you've seen them all; Kids / Family / Adults levels, timer optional |
| **Lab 210** | Everyone | Science lab: Chemistry (periodic table of 118 elements with Bohr models, element challenges, equation balancer), Physics (projectile Launch lab on four worlds, Pendulum lab, Circuit lab with series/parallel bulbs, Ohm's law challenge), Biology (cell explorer, DNA pairing, human body, Punnett-square genetics, food chains, animal groups), a Lab quiz at three levels and a Daily experiment with streaks. Element data from Periodic-Table-JSON (CC BY-SA 3.0) |
| **World Globe** | Everyone | 3D globe with all 195 countries (UN members plus two observer states); Explore mode with 3,400+ facts, Find it, Name it and 60-second Speed run at three levels, a Daily Challenge (same 10 countries for everyone each day, streaks, shareable result), a Passport that tracks the countries you have learned, region filters |
| **Connect Four** | Everyone | minimax computer with three levels, 2 players, or online with a friend |
| **Math Cross** | Everyone | crossword-style sums, four levels up to an 11x11 grid, hints, undo, keyboard entry, timer and best times |
| **24 Game** | Everyone | make 24 from four numbers, three levels (some need fractions), hints, answers, 90-second sprint, best times |
| **Tetris** | Everyone | 7-bag pieces, wall kicks, hold, ghost piece, lock delay, Marathon / 40 Lines / 2-Min Blitz, touch controls, best scores |
| **Snakes & Ladders** | Kids | classic 100-square board, 1-4 players, vs computer, or online with a friend, animated dice, optional bonus roll on a 6 |
| **Checkers** | Everyone | compulsory captures, multi-jumps, kings, three computer levels, hints and undo, or online with a friend |
| **Dame** | Everyone | Ghanaian draughts on a wooden board: men capture backwards, flying kings, optional captures (you may skip one), three computer levels, hints and undo, and online play by room code (peer to peer, same as Chess) |
| **Dots & Boxes** | Everyone | 3x3 to 5x5 boards, vs computer (three levels), a friend, or online with a friend, chain-aware computer |
| **Battleship** | Everyone | place your fleet by hand or randomly, three computer levels (smart targeting on Hard), or online with a friend |
| **Memory Match** | Kids | themes, three sizes, 1–2 players or online with a friend |
| **Doodle & Color** | Kids | rainbow brush, stamps, colouring pages with a paint bucket, save as PNG |
| **Spell Sprout** | Kids | 800 picture words, 12 themed packs and three levels, spoken aloud, hints, stars and a garden that grows (fully offline) |
| **Word Guess** | Adults | daily word + practice, stats, shareable result |
| **Sudoku** | Adults | generated puzzles with exactly one solution, notes, hints, auto-save |
| **Tile Merge** | Adults | 2048-style, swipe or arrow keys, undo |
| **Minesweeper** | Adults | three sizes, flags, chording, touch long-press, best times |

## Online play

Every two-player game has an Online mode (peer to peer via `assets/p2p.js`, no game server). `assets/online.js` is the shared room lobby: create a room and share the 5-letter code or invite link (`?room=CODE`), choose who goes first, rematch, and leave. Games with online play carry `online: true` in `assets/games.js`, which shows a "Play online" badge on their card.

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
    shell.css         shared design system: light + dark theme tokens, buttons, panels
    theme.js          light/dark switch (follows the device setting, remembers the choice)
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
   `../../` yourself. For the shared look and the light/dark switch, put `<script src="../../assets/theme.js"></script>`
   and `<link rel="stylesheet" href="../../assets/shell.css" />` in `<head>` and colour things with the CSS variables
   (`--surface`, `--ink`, `--muted`, `--line`, `--gold`...) instead of fixed colours so both themes work.
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
