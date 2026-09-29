/**
 * Flat 2D chess view (fallback and alternative to the 3D board). Same interface as the 3D view:
 * update(viewState), animateMove(), setFlipped(), celebrate(), onSquare callback.
 */
const GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟︎" };
const NAME = { P: "pawn", N: "knight", B: "bishop", R: "rook", Q: "queen", K: "king" };
const isWhitePiece = (p) => p === p.toUpperCase();
const sqName = (i) => "abcdefgh"[i % 8] + (8 - Math.floor(i / 8));

export function createView2D(container, { onSquare }) {
  const el = document.createElement("div");
  el.className = "board2d";
  el.setAttribute("role", "grid");
  el.setAttribute("aria-label", "Chess board");
  container.appendChild(el);

  const cells = [];
  for (let v = 0; v < 64; v += 1) {
    const b = document.createElement("button");
    b.className = "sq2";
    b.dataset.v = v;
    b.setAttribute("role", "gridcell");
    b.addEventListener("click", () => onSquare(flipped ? 63 - v : v));
    el.appendChild(b);
    cells.push(b);
  }

  let flipped = false;
  let view = { board: [], selected: -1, targets: [], capTargets: [], last: null, checkSq: -1, hint: [], pickable: [] };

  function render() {
    const pick = new Set(view.pickable || []);
    for (let v = 0; v < 64; v += 1) {
      const i = flipped ? 63 - v : v;
      const cell = cells[v];
      const r = Math.floor(i / 8);
      const c = i % 8;
      const piece = view.board[i];
      let cls = "sq2" + ((r + c) % 2 === 1 ? " dark" : "");
      if (view.last && (i === view.last.from || i === view.last.to)) cls += " last";
      if (i === view.selected) cls += " sel";
      if ((view.hint || []).includes(i)) cls += " hint";
      if (i === view.checkSq) cls += " check";
      if ((view.targets || []).includes(i)) cls += piece || (view.capTargets || []).includes(i) ? " target cap" : " target";
      if (pick.has(i)) cls += " pick";
      cell.className = cls;
      cell.innerHTML = "";
      if (v % 8 === 0) cell.insertAdjacentHTML("beforeend", `<span class="coord rank">${8 - r}</span>`);
      if (v >= 56) cell.insertAdjacentHTML("beforeend", `<span class="coord file">${"abcdefgh"[c]}</span>`);
      if (piece) {
        const span = document.createElement("span");
        span.className = `pc ${isWhitePiece(piece) ? "w" : "b"}`;
        span.textContent = GLYPH[piece.toUpperCase()];
        cell.appendChild(span);
      }
      cell.setAttribute("aria-label", `${sqName(i)}${piece ? `, ${isWhitePiece(piece) ? "white" : "black"} ${NAME[piece.toUpperCase()]}` : ""}`);
    }
  }

  return {
    update(v) {
      view = { ...view, ...v };
      render();
    },
    async animateMove() {
      // the flat board just jumps; the controller calls update() with the new position right after
    },
    setFlipped(value) {
      flipped = value;
      render();
      return Promise.resolve();
    },
    intro: () => Promise.resolve(),
    celebrate() {},
    resetView: () => Promise.resolve(),
    dispose() {
      el.remove();
    },
    el,
  };
}
