/**
 * The Book of Games: the landing page's second view. Every game gets a spread (text on the left page, picture on the
 * right) in a real 3D book whose pages turn around the spine.
 *
 * How it works
 *  - spread s: 0 = the closed cover, 1 = welcome + contents, 2.. = one game each, last = "The End".
 *  - leaf k is a sheet with a front and a back. Leaf k is "flipped" (turned to the left) when k < s.
 *      wide screens:  leaf k = front page 2k (right), back page 2k+1 (left)      -> a spread shows back(s-1) + front(s)
 *      phones:        leaf k = one whole page per spread (front), blank back      -> a page flips away to the left
 *  - page contents are built lazily for the leaves near the reader, so 50+ games stay light.
 *  - sounds (cover creak, paper swish, landing flap) are synthesized with Web Audio, no files.
 *
 * createBook(host, { cats, isNew, onFav(id), onSurprise(), onGrid(), onNavigate(key) }) returns the controller.
 * Deep-link keys: "cover", "contents", "end" or a game id.
 */
const FLIP_MS = 900;
const AUD = { kids: "Kids", adults: "Adults", all: "Everyone" };
const STAR = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4L2.7 9.5l6.5-.7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ---------------------------------------------------------------- sound */
const sound = (() => {
  let on = true;
  try { on = localStorage.getItem("zone210_booksound") !== "off"; } catch (err) { /* storage unavailable */ }
  let buf = null;
  let lastFlip = 0;
  const audio = () => (window.z210Audio ? window.z210Audio.get() : null);
  const noise = (c) => {
    if (buf && buf.sampleRate === c.sampleRate) return buf;
    buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    let low = 0;
    for (let i = 0; i < d.length; i += 1) {
      const w = Math.random() * 2 - 1;
      low = (low + 0.06 * w) / 1.06;
      d[i] = w * 0.55 + low * 3.2; // white noise with a soft, papery body
    }
    return buf;
  };
  /** A shaped burst of filtered noise. */
  const burst = (c, t, { dur, vol, f0, f1, f2, q = 1, type = "bandpass" }) => {
    const src = c.createBufferSource();
    src.buffer = noise(c);
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.45);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(t, Math.random() * 1.2);
    src.stop(t + dur + 0.05);
  };
  const thump = (c, t, vol, f0, f1, dur) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  };
  const tick = (c, t, vol) => burst(c, t, { dur: 0.045, vol, f0: 3400, f1: 5200, q: 0.7 });
  /** The leather and glue of a cover creaking: a narrow, wandering band of noise. */
  const creak = (c, t, dur, vol) => {
    const src = c.createBufferSource();
    src.buffer = noise(c);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 11;
    const pts = new Float32Array(28);
    for (let i = 0; i < pts.length; i += 1) pts[i] = 260 + i * 9 + Math.random() * 90;
    f.frequency.setValueCurveAtTime(pts, t, dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  };
  const play = (fn) => {
    if (!on) return;
    try {
      const c = audio();
      if (c) fn(c, c.currentTime + 0.01);
    } catch (err) { /* audio unavailable */ }
  };
  return {
    get on() { return on; },
    set(v) {
      on = v;
      try { localStorage.setItem("zone210_booksound", v ? "on" : "off"); } catch (err) { /* private mode */ }
    },
    /** One page turned: swish, crisp paper edge, landing flap. */
    flip(vol = 1) {
      const now = Date.now();
      if (now - lastFlip < 40) return;
      lastFlip = now;
      play((c, t) => {
        const j = 0.85 + Math.random() * 0.3;
        burst(c, t, { dur: 0.34 * j, vol: 0.5 * vol, f0: 900 * j, f1: 2800 * j, f2: 1100, q: 0.8 });
        burst(c, t + 0.05, { dur: 0.22, vol: 0.16 * vol, f0: 3500, f1: 6000, q: 0.6 });
        const land = t + 0.3 * j;
        tick(c, land, 0.3 * vol);
        thump(c, land, 0.2 * vol, 180, 90, 0.09);
      });
    },
    open() {
      play((c, t) => {
        creak(c, t, 0.85, 0.5);
        creak(c, t + 0.05, 0.7, 0.2);
        burst(c, t + 0.2, { dur: 0.7, vol: 0.4, f0: 500, f1: 1800, f2: 700, q: 0.6 });
        thump(c, t + 0.78, 0.5, 130, 48, 0.22);
        tick(c, t + 0.78, 0.25);
      });
    },
    close() {
      play((c, t) => {
        burst(c, t, { dur: 0.45, vol: 0.45, f0: 700, f1: 1500, f2: 500, q: 0.6 });
        thump(c, t + 0.5, 0.65, 150, 42, 0.26);
        burst(c, t + 0.5, { dur: 0.12, vol: 0.3, f0: 900, f1: 400, q: 0.5 });
        creak(c, t + 0.4, 0.4, 0.18);
      });
    },
  };
})();

/* ---------------------------------------------------------------- the book */
export function createBook(host, api) {
  const mq = window.matchMedia("(max-width: 820px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const calm = () => reduced.matches || !!(window.z210Saver && window.z210Saver.on);

  let items = []; // [{ g, ch }] in book order
  let chapters = [];
  let favs = new Set();
  let info = "";
  let mode = mq.matches ? "single" : "spread";
  let cur = 0;
  let L = 0;
  let last = 0;
  let leaves = [];
  let timers = [];
  let built = false;
  let dirty = true;
  let shown = false;
  let startKey = null;
  let ui = {};
  let suppressUntil = 0;

  const n = () => items.length;

  /* ---- order, chapters, keys ---- */
  function layout(list) {
    chapters = [];
    items = [];
    const add = (key, label, gs) => {
      if (!gs.length) return;
      const ch = { key, label, start: items.length, games: gs };
      chapters.push(ch);
      gs.forEach((g) => items.push({ g, ch }));
    };
    add("fav", "⭐ Your favorites", list.filter((g) => favs.has(g.id)));
    const rest = list.filter((g) => !favs.has(g.id));
    Object.entries(api.cats).forEach(([key, label]) => add(key, label, rest.filter((g) => g.cat === key)));
    add("more", "✨ More to explore", rest.filter((g) => !api.cats[g.cat]));
  }
  const keyOf = (s) => (s <= 0 ? "cover" : s === 1 ? "contents" : s >= n() + 2 ? "end" : items[s - 2].g.id);
  const spreadOf = (key) => {
    if (key === "cover" || !key) return 0;
    if (key === "contents" || key === "welcome") return 1;
    if (key === "end") return n() + 2;
    const i = items.findIndex((x) => x.g.id === key);
    return i < 0 ? null : i + 2;
  };
  const pageNo = (s) => (mode === "single" ? s : 2 * s - 1);
  const labelOf = (s) => {
    if (s <= 0) return "The Book of Games";
    if (s === 1) return "Welcome & contents";
    if (s >= n() + 2) return "The End";
    const it = items[s - 2];
    return `${it.g.title} · ${it.ch.label.replace(/^\S+\s/, "")} · ${s - 1} of ${n()}`;
  };

  /* ---- page contents ---- */
  const starBtn = (g) => {
    const on = favs.has(g.id);
    return `<button type="button" class="bk-fav" data-act="fav" data-id="${g.id}" aria-pressed="${on}" aria-label="${on ? "Remove" : "Add"} ${esc(g.title)} ${on ? "from" : "to"} favorites" title="${on ? "Remove from favorites" : "Add to favorites"}">${STAR}</button>`;
  };
  const colors = (g) => `--a:${g.colors[0]};--b:${g.colors[1]}`;
  const foot = (p) => (p > 0 ? `<div class="pg-foot"><span>❦</span> ${p} <span>❦</span></div>` : "");
  const facts = (g) => `<dl class="facts">
      <div><dt>Players</dt><dd>${esc(g.players)}</dd></div>
      <div><dt>For</dt><dd>${AUD[g.audience]}</dd></div>
      <div><dt>Style</dt><dd>${g.tags.map(esc).join(" · ")}</dd></div>
      <div><dt>Play</dt><dd>${g.online ? "🌐 Online with friends" : "On this device"}</dd></div>
    </dl>`;
  const actions = (g) => `<div class="g-actions"><a class="bk-play" href="games/${g.id}/">Play now <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>${starBtn(g)}</div>`;
  const photo = (g, i) => `<a class="photo" href="games/${g.id}/" aria-label="Play ${esc(g.title)}">
      <span class="tape t1"></span><span class="tape t2"></span>
      <span class="shot"><span class="bk-emoji" aria-hidden="true">${g.emoji}</span><img src="assets/thumbs/${g.id}.jpg" alt="" decoding="async"></span>
      <span class="cap">Fig. ${i + 1} · ${esc(g.title)}</span>
    </a>`;
  const stickers = (g) => `${api.isNew(g) ? '<span class="sticker new">✨ New</span>' : ""}${g.online ? '<span class="sticker online">🌐 Play online</span>' : ""}`;

  const cover = () => `<div class="cover">
      <i class="c-corner tl"></i><i class="c-corner tr"></i><i class="c-corner bl"></i><i class="c-corner br"></i>
      <div class="c-frame">
        <p class="c-pre">✦ Zone 210 ✦</p>
        <h2 class="c-title"><span>The Book</span><em>of</em><span>Games</span></h2>
        <div class="c-orn" aria-hidden="true"><i></i>❦<i></i></div>
        <div class="c-icons" aria-hidden="true"><span>🎲</span><span>♟️</span><span>🧩</span><span>🔬</span><span>🎨</span></div>
        <p class="c-count">${n()} games &amp; adventures</p>
      </div>
      <button type="button" class="c-open" data-act="next">Open the book</button>
    </div>`;

  const tocList = () => `<ol class="toc">${chapters
    .map((ch) => `<li><button type="button" data-act="jump" data-to="${ch.start + 2}"><span class="ct">${esc(ch.label)}</span><span class="dots"></span><span class="pn">${pageNo(ch.start + 2)}</span></button><small>${ch.games.length} ${ch.games.length === 1 ? "game" : "games"}: ${ch.games.slice(0, 3).map((g) => esc(g.title)).join(", ")}${ch.games.length > 3 ? "…" : ""}</small></li>`)
    .join("")}</ol>`;
  const howto = `<ul class="howto">
      <li><b>👆</b> Tap the page edges, swipe, or use the ← → keys</li>
      <li><b>⭐</b> Star a game to keep it in your favorites chapter</li>
      <li><b>📑</b> Use the contents to jump to a chapter</li>
      <li><b>🌐</b> Games with this badge can be played online</li>
    </ul>`;
  const welcome = (p) => `<div class="pg pg-welcome">
      <p class="kicker">Welcome to</p>
      <h3 class="g-title">The Book of Games</h3>
      <div class="orn"><i></i>❦<i></i></div>
      <p class="g-tag">${n()} ${n() === 1 ? "game" : "games"}, puzzles and learning adventures, one page each. Read about a game, then press <b>Play now</b>.</p>
      ${howto}
      <p class="showing">${esc(info)}</p>
      ${foot(p)}
    </div>`;
  const contents = (p) => `<div class="pg pg-toc"><h3 class="g-title">Contents</h3><div class="orn"><i></i>❦<i></i></div>${tocList()}<button type="button" class="bk-link" data-act="surprise">🎁 Surprise me</button>${foot(p)}</div>`;
  const welcomeOne = () => `<div class="pg pg-one pg-front pg-welcome">
      <p class="kicker">Welcome to</p>
      <h3 class="g-title">The Book of Games</h3>
      <div class="orn"><i></i>❦<i></i></div>
      <p class="g-tag">${n()} ${n() === 1 ? "game" : "games"} and adventures, one page each. Swipe to turn the pages.</p>
      ${tocList()}
      <p class="showing">${esc(info)}</p>
    </div>`;
  const end = (p) => `<div class="pg pg-end">
      <p class="kicker">And that's</p>
      <h3 class="g-title">The End</h3>
      <div class="orn"><i></i>❦<i></i></div>
      <p class="g-tag">…of this book, for now. More games are always on the way.</p>
      <div class="end-actions">
        <button type="button" class="bk-play" data-act="first">↺ Back to the cover</button>
        <button type="button" class="bk-link" data-act="surprise">🎁 Surprise me</button>
        <button type="button" class="bk-link" data-act="grid">▦ See all games in a grid</button>
      </div>
      ${foot(p)}
    </div>`;
  const gameText = (i, p) => {
    const { g, ch } = items[i];
    return `<div class="pg pg-text" style="${colors(g)}">
      <div class="pg-top"><span class="chap">${esc(ch.label)}</span><span class="gnum">No. ${i + 1}</span></div>
      <h3 class="g-title">${esc(g.title)}</h3>
      <div class="orn"><i></i>❦<i></i></div>
      <p class="g-tag">${esc(g.tagline)}</p>
      ${facts(g)}
      ${actions(g)}
      ${foot(p)}
    </div>`;
  };
  const gameArt = (i, p) => {
    const { g, ch } = items[i];
    return `<div class="pg pg-art" style="${colors(g)}">
      <div class="wash"></div><span class="ghost" aria-hidden="true">${g.emoji}</span>
      <div class="art-box">${photo(g, i)}${stickers(g)}</div>
      <div class="stamps"><span class="stamp">${esc(ch.label)}</span>${g.tags.filter((t) => !ch.label.toLowerCase().includes(t.toLowerCase())).map((t) => `<span class="stamp">${esc(t)}</span>`).join("")}</div>
      ${foot(p)}
    </div>`;
  };
  const gameOne = (i) => {
    const { g, ch } = items[i];
    return `<div class="pg pg-one pg-front" style="${colors(g)}">
      <div class="wash"></div>
      <div class="pg-top"><span class="chap">${esc(ch.label)}</span><span class="gnum">${i + 1} of ${n()}</span></div>
      <div class="art-box">${photo(g, i)}${stickers(g)}</div>
      <h3 class="g-title">${esc(g.title)}</h3>
      <p class="g-tag">${esc(g.tagline)}</p>
      <div class="chips"><span>${esc(g.players)}</span><span>${AUD[g.audience]}</span>${g.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      ${actions(g)}
    </div>`;
  };
  const endOne = () => `<div class="pg pg-one pg-front pg-end">${end(0).replace(/^<div class="pg pg-end">/, "").replace(/<\/div>$/, "")}</div>`;

  function pageHTML(p) {
    if (p === 0) return cover();
    if (p === 1) return welcome(p);
    if (p === 2) return contents(p);
    const q = p - 3;
    if (q === 2 * n()) return end(p);
    const i = q >> 1;
    return q % 2 === 0 ? gameText(i, p) : gameArt(i, p);
  }
  function faceHTML(k, side) {
    if (mode === "single") {
      if (side === "back") return '<div class="pg pg-blank"></div>';
      if (k === 0) return cover();
      if (k === 1) return welcomeOne();
      if (k >= n() + 2) return endOne();
      return gameOne(k - 2);
    }
    return pageHTML(2 * k + (side === "back" ? 1 : 0));
  }
  function fill(k) {
    const lf = leaves[k];
    if (!lf || lf.filled) return;
    lf.filled = true;
    [["front", lf.front], ["back", lf.back]].forEach(([side, face]) => {
      face.firstElementChild.innerHTML = faceHTML(k, side);
      face.querySelectorAll("img").forEach((img) => img.addEventListener("error", () => img.remove(), { once: true }));
    });
  }
  const fillAround = (s) => { for (let k = s - 3; k <= s + 3; k += 1) fill(k); };

  /* ---- building ---- */
  function build() {
    mode = mq.matches ? "single" : "spread";
    L = mode === "single" ? n() + 3 : n() + 2;
    last = n() + 2;
    host.innerHTML = `<div class="bk" data-mode="${mode}">
      <div class="bk-stage">
        <div class="bk-book" data-s="0">
          <div class="bk-shadow"></div>
          <div class="bk-board bk-board-l"></div><div class="bk-board bk-board-r"></div>
          <div class="bk-endpaper"></div>
          <i class="bk-edge bk-edge-l"></i><i class="bk-edge bk-edge-r"></i>
          <div class="bk-leaves"></div>
          <div class="bk-hit bk-hit-l" data-act="prev" aria-hidden="true"></div><div class="bk-hit bk-hit-r" data-act="next" aria-hidden="true"></div>
          <i class="bk-ribbon" aria-hidden="true"></i>
        </div>
      </div>
      <div class="bk-bar">
        <button type="button" class="bk-btn" data-act="prev" aria-label="Previous page">◀</button>
        <input type="range" class="bk-range" min="0" max="${last}" value="0" aria-label="Page of the book">
        <button type="button" class="bk-btn" data-act="next" aria-label="Next page">▶</button>
      </div>
      <div class="bk-sub">
        <span class="bk-label"></span>
        <button type="button" class="bk-snd" data-act="sound" aria-pressed="${sound.on}" title="Page sounds"></button>
      </div>
      <p class="bk-live" aria-live="polite"></p>
    </div>`;
    const q = (s) => host.querySelector(s);
    ui = { root: q(".bk"), book: q(".bk-book"), leaves: q(".bk-leaves"), range: q(".bk-range"), label: q(".bk-label"), live: q(".bk-live"), snd: q(".bk-snd"), prev: [...host.querySelectorAll('.bk-btn[data-act="prev"]')], next: [...host.querySelectorAll('.bk-btn[data-act="next"]')] };
    leaves = [];
    for (let k = 0; k < L; k += 1) {
      const lf = document.createElement("div");
      lf.className = "bk-leaf";
      lf.innerHTML = '<div class="bk-face front"><div class="bk-page"></div><i class="bk-shade"></i></div><div class="bk-face back"><div class="bk-page"></div><i class="bk-shade"></i></div>';
      lf.front = lf.children[0];
      lf.back = lf.children[1];
      lf.filled = false;
      lf.style.zIndex = String(L - k);
      ui.leaves.appendChild(lf);
      leaves.push(lf);
    }
    paintSound();
    built = true;
    dirty = false;
  }

  /** Only the leaves near the reader stay in the page: 50+ full-size 3D layers are too heavy for phones. */
  function setWindow(center, extra = []) {
    const keep = new Set(extra);
    for (let k = center - 3; k <= center + 3; k += 1) keep.add(k);
    leaves.forEach((lf, k) => { lf.hidden = !keep.has(k); });
  }
  const zFinal = (k) => (leaves[k].classList.contains("flipped") ? k + 1 : L - k);

  function setLeaf(k, flipped, animate, rank = 0) {
    const lf = leaves[k];
    if (!lf) return;
    if (!animate) {
      lf.style.transition = "none";
      lf.classList.toggle("flipped", flipped);
      lf.style.zIndex = String(zFinal(k));
      return;
    }
    lf.style.zIndex = String(L + 10 + rank);
    lf.classList.add("turning");
    lf.classList.toggle("flipped", flipped);
    setTimeout(() => {
      lf.classList.remove("turning");
      lf.style.zIndex = String(zFinal(k));
    }, FLIP_MS + 40);
  }

  function refreshState() {
    const { book } = ui;
    book.dataset.s = String(cur);
    book.dataset.first = cur === 0 ? "1" : "0";
    const flippedN = cur;
    const rightN = L - cur;
    book.style.setProperty("--el", `${Math.min(14, flippedN * 0.4)}px`);
    book.style.setProperty("--er", `${Math.min(14, rightN * 0.4)}px`);
    leaves.forEach((lf, k) => {
      const frontOn = k === cur;
      const backOn = mode === "spread" && k === cur - 1;
      lf.front.inert = !frontOn;
      lf.back.inert = !backOn;
      lf.front.setAttribute("aria-hidden", String(!frontOn));
      lf.back.setAttribute("aria-hidden", String(!backOn));
    });
    ui.range.value = String(cur);
    ui.label.textContent = labelOf(cur);
    ui.live.textContent = labelOf(cur);
    ui.prev.forEach((b) => { b.disabled = cur <= 0; });
    ui.next.forEach((b) => { b.disabled = cur >= last; });
  }

  function goTo(target, opts = {}) {
    if (!built) return;
    const t = Math.max(0, Math.min(last, target));
    if (t === cur && !opts.force) return;
    const from = cur;
    cur = t;
    timers.forEach(clearTimeout);
    timers = [];
    fillAround(from);
    fillAround(t);
    const lo = Math.min(from, t);
    const hi = Math.max(from, t);
    const ks = [];
    for (let k = lo; k < hi; k += 1) ks.push(k);
    if (t < from) ks.reverse();
    const still = opts.instant || calm();
    const MAX_ANIMATED = 6;
    const instantN = still ? ks.length : Math.max(0, ks.length - MAX_ANIMATED);
    const stagger = 110;
    ks.forEach((k, idx) => {
      if (idx < instantN) setLeaf(k, k < t, false);
      else {
        const run = () => { leaves[k].style.transition = ""; setLeaf(k, k < t, true, idx); if (idx - instantN > 0) sound.flip(0.55); };
        const delay = (idx - instantN) * stagger;
        if (delay === 0) run(); else timers.push(setTimeout(run, delay));
      }
    });
    // let instant leaves settle without animating, then give transitions back
    if (instantN) {
      void ui.book.offsetWidth;
      for (let i = 0; i < instantN; i += 1) leaves[ks[i]].style.transition = "";
    }
    if (still && !opts.instant) {
      ui.root.querySelectorAll(".bk-face:not([inert]) .bk-page").forEach((p) => { p.classList.remove("fade"); void p.offsetWidth; p.classList.add("fade"); });
    }
    // sounds
    if (!opts.instant && !opts.quiet) {
      if (from === 0 && t > 0) sound.open();
      else if (t === 0) sound.close();
      else if (ks.length) sound.flip(1);
    }
    const near = [];
    for (let k = from - 3; k <= from + 3; k += 1) near.push(k);
    setWindow(t, ks.concat(near));
    timers.push(setTimeout(() => setWindow(cur), FLIP_MS + stagger * MAX_ANIMATED + 150));
    refreshState();
    if (shown && api.onNavigate && !opts.silent) api.onNavigate(keyOf(cur));
  }

  /* ---- dragging a page with the finger or mouse ---- */
  let drag = null;
  function onDown(e) {
    if (!built || e.button > 0 || calm()) return;
    if (e.target.closest("input")) return; // a swipe may start anywhere else, even on the picture or a button
    drag = { x0: e.clientX, y0: e.clientY, id: e.pointerId, on: false, dir: 0, leaf: null, k: -1 };
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    if (!drag.on) {
      if (Math.abs(dx) < 9 || Math.abs(dx) < Math.abs(dy)) return;
      const dir = dx < 0 ? 1 : -1;
      const k = dir === 1 ? cur : cur - 1;
      if ((dir === 1 && cur >= last) || (dir === -1 && cur <= 0) || !leaves[k]) { drag = null; return; }
      if (mode === "single" && dir === -1 && !leaves[k]) { drag = null; return; }
      timers.forEach(clearTimeout);
      timers = [];
      fillAround(cur);
      drag.on = true;
      drag.dir = dir;
      drag.k = k;
      drag.leaf = leaves[k];
      drag.w = (mode === "single" ? ui.book.offsetWidth : ui.book.offsetWidth / 2) * 0.9;
      drag.leaf.classList.add("dragging");
      drag.leaf.style.zIndex = String(L + 20);
      try { ui.book.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    }
    const p = Math.max(0, Math.min(1, Math.abs(dx) / drag.w));
    const frac = drag.dir === 1 ? p : 1 - p; // fraction turned to the left
    drag.frac = frac;
    drag.p = p;
    drag.leaf.style.transform = `rotateY(${(-180 * frac).toFixed(1)}deg)`;
    drag.leaf.style.setProperty("--p", frac.toFixed(3));
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.on) return;
    suppressUntil = Date.now() + 450; // the tap that ends a swipe must not press a link or button
    const { leaf, dir, k } = d;
    leaf.classList.remove("dragging");
    leaf.style.transform = "";
    leaf.style.removeProperty("--p");
    leaf.style.transition = "";
    if (d.p > 0.22) {
      goTo(cur + dir);
    } else {
      leaf.classList.add("turning");
      setTimeout(() => { leaf.classList.remove("turning"); leaf.style.zIndex = String(zFinal(k)); }, FLIP_MS + 40);
    }
  }

  /* ---- events ---- */
  function act(name, el) {
    if (name === "next") goTo(cur + 1);
    else if (name === "prev") goTo(cur - 1);
    else if (name === "first") goTo(0);
    else if (name === "jump") goTo(Number(el.dataset.to));
    else if (name === "fav") api.onFav(el.dataset.id);
    else if (name === "surprise") api.onSurprise();
    else if (name === "grid") api.onGrid();
    else if (name === "sound") {
      sound.set(!sound.on);
      paintSound();
      if (sound.on) sound.flip(0.8);
    }
  }
  const paintSound = () => {
    if (!ui.snd) return;
    ui.snd.setAttribute("aria-pressed", String(sound.on));
    ui.snd.textContent = sound.on ? "🔊 Sound on" : "🔇 Sound off";
    ui.snd.title = sound.on ? "Page sounds on (tap to mute)" : "Page sounds off (tap to turn on)";
  };
  host.addEventListener("dragstart", (e) => e.preventDefault()); // no native link/image dragging while turning pages
  host.addEventListener("click", (e) => {
    if (Date.now() < suppressUntil) { e.preventDefault(); e.stopPropagation(); return; }
    const t = e.target.closest("[data-act]");
    if (t && host.contains(t)) act(t.dataset.act, t);
  });
  host.addEventListener("input", (e) => {
    if (e.target.classList && e.target.classList.contains("bk-range")) goTo(Number(e.target.value));
  });
  host.addEventListener("pointerdown", (e) => { if (e.target.closest(".bk-book")) onDown(e); });
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);
  document.addEventListener("keydown", (e) => {
    if (!shown || !built || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest("input:not(.bk-range), textarea, select")) return;
    const k = e.key;
    if (k === "ArrowRight" || k === "PageDown") { goTo(cur + 1); e.preventDefault(); }
    else if (k === "ArrowLeft" || k === "PageUp") { goTo(cur - 1); e.preventDefault(); }
    else if (k === "Home") { goTo(0); e.preventDefault(); }
    else if (k === "End") { goTo(last); e.preventDefault(); }
  });
  const onMode = () => {
    const want = mq.matches ? "single" : "spread";
    if (built && want !== mode) { dirty = true; if (shown) rebuild(keyOf(cur)); }
  };
  if (mq.addEventListener) mq.addEventListener("change", onMode); else if (mq.addListener) mq.addListener(onMode);

  function rebuild(key) {
    cur = 0;
    build();
    let s = spreadOf(key || startKey);
    startKey = null;
    if (s === null) s = key ? 1 : 0; // a page that is no longer in the book: show the contents
    fillAround(s);
    cur = s;
    leaves.forEach((lf, k) => setLeaf(k, k < s, false));
    setWindow(s);
    void ui.book.offsetWidth;
    leaves.forEach((lf) => { lf.style.transition = ""; });
    refreshState();
    if (api.onNavigate && shown) api.onNavigate(keyOf(cur));
  }

  return {
    /** The games to show (already filtered). Rebuilds the book, keeping the reader on the same page when it still exists. */
    setGames(list, opts = {}) {
      const key = built ? keyOf(cur) : null;
      favs = opts.favs || favs;
      info = opts.summary || "";
      if (opts.startKey) startKey = opts.startKey;
      layout(list);
      dirty = true;
      if (shown) rebuild(startKey || key);
    },
    refreshFavs(f) {
      favs = f;
      host.querySelectorAll('.bk-fav[data-id]').forEach((b) => {
        const on = favs.has(b.dataset.id);
        const g = items.find((x) => x.g.id === b.dataset.id);
        b.setAttribute("aria-pressed", String(on));
        if (g) b.setAttribute("aria-label", `${on ? "Remove" : "Add"} ${g.g.title} ${on ? "from" : "to"} favorites`);
        b.title = on ? "Remove from favorites" : "Add to favorites";
      });
    },
    show() {
      shown = true;
      host.hidden = false;
      if (dirty || !built) rebuild(startKey || (built ? keyOf(cur) : null));
    },
    hide() { shown = false; host.hidden = true; },
    goToKey(key, opts) {
      const s = spreadOf(key);
      if (s !== null) goTo(s, { silent: true, ...opts });
    },
    surprise() {
      if (!n()) return;
      const s = 2 + Math.floor(Math.random() * n());
      goTo(s === cur ? (s >= n() + 1 ? 2 : s + 1) : s);
    },
    get key() { return built ? keyOf(cur) : "cover"; },
    get shown() { return shown; },
  };
}
