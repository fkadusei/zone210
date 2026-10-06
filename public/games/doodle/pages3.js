/**
 * People, candy and heart colouring pages. Same drawing helpers as pages2.js (outlines only, 800 x 600).
 * People are built from a few parts (head, hair, clothes, limbs) in local units with the feet at (0, 0),
 * then scaled and placed with `M(x, y, scale)`, so the same boy, girl, dad and mom can appear in several pages.
 */
export function makePeoplePages({ stroke, solid, circle, poly, ell, clipped }) {
  const PI = Math.PI;
  const M = (x, y, s) => ({ X: (v) => x + v * s, Y: (v) => y + v * s, S: (v) => v * s, P: (a, b) => [x + a * s, y + b * s] });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // a closed shape with rounded corners through the given points
  const smooth = (pts) => (c) => {
    const n = pts.length;
    c.moveTo(...mid(pts[n - 1], pts[0]));
    for (let i = 0; i < n; i += 1) c.quadraticCurveTo(pts[i][0], pts[i][1], ...mid(pts[i], pts[(i + 1) % n]));
    c.closePath();
  };
  // a rounded limb from point a to point b
  const limb = (a, b, r1, r2) => (c) => {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    c.arc(a[0], a[1], r1, ang + PI / 2, ang + PI * 1.5);
    c.arc(b[0], b[1], r2, ang - PI / 2, ang + PI / 2);
    c.closePath();
  };
  const L = (m, pts) => pts.map((p) => m.P(...p));
  const heart = (x, y, k) => (c) => {
    c.moveTo(x, y + 0.35 * k);
    c.bezierCurveTo(x, y - 0.25 * k, x - k, y - 0.25 * k, x - k, y + 0.3 * k);
    c.bezierCurveTo(x - k, y + 0.75 * k, x - 0.3 * k, y + 0.95 * k, x, y + 1.25 * k);
    c.bezierCurveTo(x + 0.3 * k, y + 0.95 * k, x + k, y + 0.75 * k, x + k, y + 0.3 * k);
    c.bezierCurveTo(x + k, y - 0.25 * k, x, y - 0.25 * k, x, y + 0.35 * k);
  };
  const sun = (x, y, r = 40) => { stroke(circle(x, y, r)); for (let i = 0; i < 8; i += 1) { const a = (i / 8) * PI * 2; stroke((c) => { c.moveTo(x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12)); c.lineTo(x + Math.cos(a) * (r + 30), y + Math.sin(a) * (r + 30)); }, 5); } };
  const cloud = (x, y, s = 1) => stroke((c) => {
    c.moveTo(x, y);
    c.bezierCurveTo(x - 35 * s, y, x - 35 * s, y - 42 * s, x + 5 * s, y - 44 * s);
    c.bezierCurveTo(x + 12 * s, y - 74 * s, x + 60 * s, y - 78 * s, x + 72 * s, y - 48 * s);
    c.bezierCurveTo(x + 96 * s, y - 66 * s, x + 138 * s, y - 50 * s, x + 124 * s, y - 20 * s);
    c.bezierCurveTo(x + 156 * s, y - 16 * s, x + 150 * s, y, x + 124 * s, y);
    c.closePath();
  }, 5);
  const grass = (x0, x1, y) => stroke((c) => { for (let x = x0; x < x1; x += 80) { c.moveTo(x, y); c.lineTo(x + 20, y - 34); c.lineTo(x + 40, y); c.lineTo(x + 60, y - 30); c.lineTo(x + 80, y); } }, 5);

  /* ---- shapes that follow a body: tapered tubes for limbs, an egg-shaped head, hands with a thumb ---- */
  // a tube along joints (e.g. shoulder, elbow, wrist) with a radius at each joint
  const tube = (m, joints, rs) => {
    const P = joints.map((j) => m.P(...j));
    const R = rs.map((r) => m.S(r * 1.2));
    const n = P.length;
    const left = [];
    const right = [];
    P.forEach((p, i) => {
      const a = P[Math.max(i - 1, 0)];
      const b = P[Math.min(i + 1, n - 1)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const tx = (b[0] - a[0]) / len;
      const ty = (b[1] - a[1]) / len;
      left.push([p[0] - ty * R[i], p[1] + tx * R[i]]);
      right.push([p[0] + ty * R[i], p[1] - tx * R[i]]);
    });
    const e = P[n - 1];
    const f = P[n - 2];
    const dl = Math.hypot(e[0] - f[0], e[1] - f[1]) || 1;
    const tip = [e[0] + ((e[0] - f[0]) / dl) * R[n - 1] * 1.1, e[1] + ((e[1] - f[1]) / dl) * R[n - 1] * 1.1];
    const s0 = P[0];
    const s1 = P[1];
    const d0 = Math.hypot(s0[0] - s1[0], s0[1] - s1[1]) || 1;
    const top = [s0[0] + ((s0[0] - s1[0]) / d0) * R[0] * 1.1, s0[1] + ((s0[1] - s1[1]) / d0) * R[0] * 1.1];
    return smooth([top, ...left, tip, ...right.reverse()]);
  };
  const wide = (m, k) => ({ ...m, X: (v) => m.X(v * k), P: (a, b) => m.P(a * k, b) });
  const egg = (m, cx, cy, rx, ry) => (c) => {
    c.moveTo(m.X(cx), m.Y(cy - ry));
    c.bezierCurveTo(m.X(cx + rx * 1.08), m.Y(cy - ry), m.X(cx + rx * 1.06), m.Y(cy + ry * 0.35), m.X(cx + rx * 0.5), m.Y(cy + ry * 0.86));
    c.quadraticCurveTo(m.X(cx + rx * 0.22), m.Y(cy + ry), m.X(cx), m.Y(cy + ry));
    c.quadraticCurveTo(m.X(cx - rx * 0.22), m.Y(cy + ry), m.X(cx - rx * 0.5), m.Y(cy + ry * 0.86));
    c.bezierCurveTo(m.X(cx - rx * 1.06), m.Y(cy + ry * 0.35), m.X(cx - rx * 1.08), m.Y(cy - ry), m.X(cx), m.Y(cy - ry));
    c.closePath();
  };
  // a hand at `at`, pointing the way `to` is from `at`, with the thumb on the `side` (+1 or -1) side
  function hand(m, at, to, k, side) {
    const [wx, wy] = m.P(...at);
    const [tx, ty] = m.P(...to);
    const th = Math.atan2(-(tx - wx), ty - wy);
    const cs = Math.cos(th);
    const sn = Math.sin(th);
    const T = (x, y) => [wx + m.S(k) * (x * cs - y * sn), wy + m.S(k) * (x * sn + y * cs)];
    const palm = [[-7, 0], [7, 0], [9, 14], [8, 30], [2, 38], [-4, 36], [-8, 26], [-9, 12]].map(([x, y]) => T(x, y));
    const thumb = [T(side * 6, 4), T(side * 15, 20), T(side * 17, 28)];
    stroke((c) => { c.moveTo(...thumb[0]); c.quadraticCurveTo(...thumb[1], ...thumb[2]); c.quadraticCurveTo(...T(side * 11, 26), ...T(side * 8, 18)); }, 5);
    solid(smooth(palm), 5);
    stroke((c) => { c.moveTo(...T(-2, 26)); c.lineTo(...T(-1.5, 36)); c.moveTo(...T(3, 27)); c.lineTo(...T(2.5, 37)); }, 3);
  }
  const arm = (m, d, sh, el, wr, rs, k) => {
    stroke(tube(m, [[d * sh[0], sh[1]], [d * el[0], el[1]], [d * wr[0], wr[1]]], rs), 6);
    hand(m, [d * wr[0], wr[1]], [d * (wr[0] + (wr[0] - el[0]) * 0.3), wr[1] + 30], k, -d);
  };
  const leg = (m, d, joints, rs) => stroke(tube(m, joints.map(([x, y]) => [d * x, y]), rs), 6);
  const sneaker = (m, d, x, y, w = 1) => solid(smooth(L(m, [[d * (x - 14 * w), y - 20], [d * (x + 16 * w), y - 18], [d * (x + 32 * w), y - 8], [d * (x + 32 * w), y + 4], [d * (x - 14 * w), y + 4]])), 6);
  const shoeLine = (m, d, x, y, w = 1) => stroke((c) => { c.moveTo(m.X(d * (x - 14 * w)), m.Y(y - 2)); c.lineTo(m.X(d * (x + 32 * w)), m.Y(y - 2)); }, 3);

  /* ---- face and hair ---- */
  function face(m, cx, cy, rx, ry, kind = "adult") {
    const e = rx * 0.4;
    const ey = cy - ry * 0.05;
    const ew = rx * 0.23;
    const eh = ry * (kind === "baby" ? 0.13 : 0.1);
    [-1, 1].forEach((d) => {
      const x = cx + d * e;
      stroke((c) => { c.moveTo(m.X(x - ew), m.Y(ey)); c.quadraticCurveTo(m.X(x), m.Y(ey - eh * 2.3), m.X(x + ew), m.Y(ey)); c.quadraticCurveTo(m.X(x), m.Y(ey + eh * 1.9), m.X(x - ew), m.Y(ey)); }, 4); // eye
      stroke(circle(m.X(x), m.Y(ey), m.S(eh * 0.7)), 3); // pupil
      stroke((c) => { c.moveTo(m.X(x - ew * 1.2), m.Y(ey - ry * 0.18)); c.quadraticCurveTo(m.X(x), m.Y(ey - ry * 0.28), m.X(x + ew * 1.2), m.Y(ey - ry * 0.17)); }, 5); // eyebrow
    });
    stroke((c) => { c.moveTo(m.X(cx - rx * 0.02), m.Y(cy + ry * 0.06)); c.quadraticCurveTo(m.X(cx - rx * 0.14), m.Y(cy + ry * 0.3), m.X(cx - rx * 0.16), m.Y(cy + ry * 0.38)); c.quadraticCurveTo(m.X(cx), m.Y(cy + ry * 0.46), m.X(cx + rx * 0.17), m.Y(cy + ry * 0.38)); }, 4); // nose
    const ly = cy + ry * 0.62;
    const depth = kind === "adult" ? 0.24 : 0.3;
    stroke((c) => { c.moveTo(m.X(cx - rx * 0.36), m.Y(ly - ry * 0.02)); c.quadraticCurveTo(m.X(cx), m.Y(ly + ry * depth), m.X(cx + rx * 0.36), m.Y(ly - ry * 0.02)); }, 5); // smile
  }
  const head = (m, cx, cy, rx, ry) => {
    [-1, 1].forEach((d) => stroke(ell(m.X(cx + d * rx * 1.02), m.Y(cy + ry * 0.08), m.S(rx * 0.17), m.S(ry * 0.25)), 5)); // ears
    solid(egg(m, cx, cy, rx, ry), 6);
  };
  const shortHair = (m, cx, cy, rx, ry) => solid(smooth(L(m, [[cx - rx * 1.02, cy - ry * 0.16], [cx - rx * 1.07, cy - ry * 0.6], [cx - rx * 0.62, cy - ry * 1.1], [cx, cy - ry * 1.2], [cx + rx * 0.62, cy - ry * 1.1], [cx + rx * 1.07, cy - ry * 0.6], [cx + rx * 1.02, cy - ry * 0.16], [cx + rx * 0.84, cy - ry * 0.36], [cx + rx * 0.46, cy - ry * 0.56], [cx, cy - ry * 0.6], [cx - rx * 0.46, cy - ry * 0.56], [cx - rx * 0.84, cy - ry * 0.36]])), 6);
  // natural hair: a big round shape with a scalloped edge, drawn behind the head
  function afro(m, cx, cy, R) {
    const N = 16;
    stroke((c) => {
      for (let i = 0; i <= N; i += 1) {
        const a0 = (i / N) * PI * 2;
        const a1 = ((i + 1) / N) * PI * 2;
        const am = (a0 + a1) / 2;
        const p0 = [m.X(cx + R * Math.cos(a0)), m.Y(cy + R * Math.sin(a0))];
        const p1 = [m.X(cx + R * Math.cos(a1)), m.Y(cy + R * Math.sin(a1))];
        if (i === 0) c.moveTo(...p0);
        c.quadraticCurveTo(m.X(cx + R * 1.16 * Math.cos(am)), m.Y(cy + R * 1.16 * Math.sin(am)), ...p1);
      }
      c.closePath();
    }, 6);
  }
  const tinyStar = (m, x, y, r) => stroke((c) => { for (let i = 0; i < 10; i += 1) { const rr = i % 2 ? r * 0.45 : r; const a = (PI / 5) * i - PI / 2; (i ? c.lineTo : c.moveTo).call(c, m.X(x + rr * Math.cos(a)), m.Y(y + rr * Math.sin(a))); } c.closePath(); }, 4);
  const line2 = (m, pts, w = 4) => stroke((c) => { c.moveTo(m.X(pts[0][0]), m.Y(pts[0][1])); pts.slice(1).forEach(([x, y]) => c.lineTo(m.X(x), m.Y(y))); }, w);
  const mirror = (pts) => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y])];

  /* ---- people: feet at (0, 0), standing, seen from the front ---- */
  function man(m0, sides = [-1, 1]) {
    const m = wide(m0, 1.14);
    // trousers
    [-1, 1].forEach((d) => sneaker(m, d, 24, 0, 1));
    solid(smooth(L(m, [[-50, -250], [50, -250], [56, -224], [53, -170], [43, -118], [37, -70], [34, -24], [11, -24], [13, -118], [5, -196], [0, -204], [-5, -196], [-13, -118], [-11, -24], [-34, -24], [-37, -70], [-43, -118], [-53, -170], [-56, -224]])), 6);
    [-1, 1].forEach((d) => { shoeLine(m, d, 24, 0, 1); });
    line2(m, [[0, -236], [0, -212]], 3); // fly
    // arms (behind the shirt sleeves)
    sides.forEach((d) => arm(m, d, [64, -368], [78, -290], [82, -214], [16, 13, 10], 1.15));
    stroke(tube(m, [[0, -410], [0, -384]], [15, 17]), 5); // neck
    solid(smooth(L(m, [[-17, -390], [-62, -380], [-90, -362], [-96, -314], [-66, -308], [-52, -336], [-46, -270], [-50, -246], [50, -246], [46, -270], [52, -336], [66, -308], [96, -314], [90, -362], [62, -380], [17, -390]])), 6); // shirt
    stroke(poly(L(m, [[-17, -390], [-36, -376], [-6, -358]])), 5); stroke(poly(L(m, [[17, -390], [36, -376], [6, -358]])), 5); // collar
    line2(m, [[0, -366], [0, -250]], 3);
    [-338, -306, -274].forEach((y) => stroke(circle(m.X(7), m.Y(y), m.S(3.5)), 3));
    stroke(poly(L(m, [[20, -340], [46, -340], [46, -312], [20, -312]])), 3); // pocket
    stroke(poly(L(m, [[-52, -250], [52, -250], [52, -238], [-52, -238]])), 5); // belt
    stroke(poly(L(m, [[-8, -250], [8, -250], [8, -238], [-8, -238]])), 4); // buckle
    head(m0, 0, -447, 35, 43);
    shortHair(m0, 0, -447, 35, 43);
    face(m0, 0, -447, 35, 43);
  }
  function woman(m0, sides = [-1, 1]) {
    const m = wide(m0, 1.14);
    afro(m0, 0, -436, 66); // natural hair behind the head
    [-1, 1].forEach((d) => leg(m, d, [[24, -110], [24, -66], [21, -24]], [12, 11, 8]));
    [-1, 1].forEach((d) => solid(smooth(L(m, [[d * -8, -22], [d * 22, -22], [d * 36, -8], [d * 36, 4], [d * -8, 4]])), 6));
    sides.forEach((d) => arm(m, d, [54, -346], [64, -270], [68, -198], [12, 10, 8], 1.05));
    stroke(tube(m, [[0, -382], [0, -358]], [13, 15]), 5);
    solid(smooth(L(m, [[-14, -362], [-48, -354], [-70, -338], [-72, -304], [-52, -298], [-44, -318], [-38, -290], [-30, -246], [-50, -208], [-92, -96], [0, -90], [92, -96], [50, -208], [30, -246], [38, -290], [44, -318], [52, -298], [72, -304], [70, -338], [48, -354], [14, -362]])), 6); // dress
    stroke((c) => { c.arc(m.X(0), m.Y(-362), m.S(22), 0.05, PI - 0.05); }, 5); // neckline
    stroke(poly(L(m, [[-31, -252], [31, -252], [32, -238], [-32, -238]])), 5); // sash
    [[-120, 70], [-108, 74]].forEach(([y, w]) => line2(m, [[-w, y], [w, y]], 4)); // bands near the hem
    stroke((c) => { for (let x = -60; x < 60; x += 20) { c.moveTo(m.X(x), m.Y(-120)); c.lineTo(m.X(x + 10), m.Y(-108)); c.lineTo(m.X(x + 20), m.Y(-120)); } }, 3);
    [[-18, -190], [20, -176], [-8, -150], [32, -140]].forEach(([x, y]) => stroke(circle(m.X(x), m.Y(y), m.S(6)), 3)); // dress pattern
    head(m0, 0, -418, 32, 40);
    [-1, 1].forEach((d) => { line2(m0, [[d * 33, -402], [d * 33, -392]], 3); stroke(circle(m0.X(d * 33), m0.Y(-387), m0.S(5)), 3); }); // earrings
    face(m0, 0, -418, 32, 40);
  }
  function boy(m0) {
    const m = wide(m0, 1.16);
    [-1, 1].forEach((d) => leg(m, d, [[22, -122], [23, -68], [20, -22]], [13, 11, 8]));
    [-1, 1].forEach((d) => line2(m, [[d * 22 - 11, -48], [d * 22 + 11, -48]], 3)); // socks
    [-1, 1].forEach((d) => sneaker(m, d, 18, 0, 0.9));
    [-1, 1].forEach((d) => stroke((c) => { c.moveTo(m.X(d * 12), m.Y(-14)); c.lineTo(m.X(d * 24), m.Y(-10)); c.moveTo(m.X(d * 12), m.Y(-8)); c.lineTo(m.X(d * 24), m.Y(-5)); }, 3)); // laces
    [-1, 1].forEach((d) => arm(m, d, [46, -298], [56, -232], [59, -172], [11, 10, 8], 0.85));
    solid(smooth(L(m, [[-38, -186], [38, -186], [42, -166], [44, -112], [8, -108], [2, -150], [0, -154], [-2, -150], [-8, -108], [-44, -112], [-42, -166]])), 6); // shorts
    stroke(tube(m, [[0, -330], [0, -310]], [12, 13]), 5);
    solid(smooth(L(m, [[-14, -312], [-42, -304], [-64, -290], [-66, -254], [-44, -250], [-38, -262], [-34, -196], [-38, -176], [38, -176], [34, -196], [38, -262], [44, -250], [66, -254], [64, -290], [42, -304], [14, -312]])), 6); // t-shirt
    stroke((c) => { c.arc(m.X(0), m.Y(-312), m.S(15), 0.05, PI - 0.05); c.moveTo(m.X(-14), m.Y(-318)); c.arc(m.X(0), m.Y(-318), m.S(14), PI, PI * 2, false); }, 4); // collar rib
    tinyStar(m, 0, -246, 14);
    head(m0, 0, -367, 38, 45);
    shortHair(m0, 0, -367, 38, 45);
    face(m0, 0, -367, 38, 45, "kid");
  }
  function girl(m0) {
    const m = wide(m0, 1.16);
    [-1, 1].forEach((d) => leg(m, d, [[18, -114], [19, -66], [16, -24]], [9.5, 8.5, 6.5]));
    [-1, 1].forEach((d) => line2(m, [[d * 18 - 8, -50], [d * 18 + 8, -50]], 3)); // socks
    [-1, 1].forEach((d) => { solid(smooth(L(m, [[d * -6, -22], [d * 16, -22], [d * 28, -10], [d * 28, 3], [d * -6, 3]])), 6); line2(m, [[d * 2, -14], [d * 24, -14]], 3); }); // shoes with a strap
    [-1, 1].forEach((d) => stroke(circle(m0.X(d * 52), m0.Y(-398), m0.S(30)), 6)); // hair puffs
    [-1, 1].forEach((d) => { stroke(poly(L(m0, [[d * 44, -384], [d * 66, -396], [d * 66, -372]])), 4); stroke(poly(L(m0, [[d * 44, -384], [d * 24, -396], [d * 24, -372]])), 4); }); // bows
    [-1, 1].forEach((d) => arm(m, d, [42, -298], [50, -236], [53, -178], [9.5, 8.5, 7], 0.78));
    stroke(tube(m, [[0, -330], [0, -310]], [11, 12]), 5);
    solid(smooth(L(m, [[-13, -312], [-38, -302], [-58, -292], [-58, -262], [-38, -258], [-33, -268], [-28, -232], [-44, -172], [-66, -112], [0, -106], [66, -112], [44, -172], [28, -232], [33, -268], [38, -258], [58, -262], [58, -292], [38, -302], [13, -312]])), 6); // dress
    stroke((c) => { c.arc(m.X(0), m.Y(-312), m.S(18), 0.05, PI - 0.05); }, 4);
    stroke(poly(L(m, [[-28, -234], [28, -234], [29, -224], [-29, -224]])), 4); // sash
    stroke(poly(L(m, [[0, -229], [-22, -246], [-22, -212]])), 4); stroke(poly(L(m, [[0, -229], [22, -246], [22, -212]])), 4); stroke(circle(m.X(0), m.Y(-229), m.S(5)), 3); // bow
    stroke((c) => { for (let x = -40; x < 40; x += 20) { c.moveTo(m.X(x), m.Y(-120)); c.lineTo(m.X(x + 10), m.Y(-130)); c.lineTo(m.X(x + 20), m.Y(-120)); } }, 3);
    head(m0, 0, -364, 36, 43);
    shortHair(m0, 0, -364, 36, 43);
    face(m0, 0, -364, 36, 43, "kid");
  }
  function baby(m) {
    [-1, 1].forEach((d) => leg(m, d, [[22, -34], [30, -10], [34, 4]], [17, 14, 11])); // chubby legs
    [-1, 1].forEach((d) => solid(ell(m.X(d * 36), m.Y(10), m.S(15), m.S(11)), 5)); // feet
    [-1, 1].forEach((d) => arm(m, d, [40, -96], [52, -66], [56, -40], [11, 10, 8], 0.55));
    solid(smooth(L(m, [[-22, -104], [0, -108], [22, -104], [44, -86], [48, -44], [30, -24], [-30, -24], [-48, -44], [-44, -86]])), 6); // onesie
    [-72, -60, -48].forEach((y) => stroke(circle(m.X(0), m.Y(y), m.S(3.5)), 3));
    stroke((c) => { c.arc(m.X(0), m.Y(-106), m.S(14), 0.05, PI - 0.05); }, 4);
    head(m, 0, -148, 40, 44);
    [[-8, -194], [6, -197], [-20, -188]].forEach(([x, y]) => stroke(circle(m.X(x), m.Y(y), m.S(6)), 3)); // little curls
    face(m, 0, -148, 40, 44, "baby");
  }

  return {
    boy: {
      label: "👦 Boy", cat: "people",
      draw() {
        boy(M(400, 566, 1.2));
        sun(100, 100, 42); cloud(590, 120, 1); grass(0, 800, 590);
      },
    },
    girl: {
      label: "👧 Girl", cat: "people",
      draw() {
        girl(M(400, 566, 1.12));
        sun(700, 100, 42); cloud(60, 130, 1); grass(0, 800, 590);
      },
    },
    family: {
      label: "👨👩👧👦 Family", cat: "people",
      draw() {
        girl(M(150, 566, 0.66));
        man(M(305, 566, 0.9));
        woman(M(515, 566, 0.9));
        boy(M(670, 566, 0.68));
        sun(90, 80, 34); cloud(560, 70, 0.8); grass(0, 800, 594);
        stroke(heart(400, 36, 22), 5);
      },
    },
    dadbaby: {
      label: "👨👶 Dad & baby", cat: "people",
      draw() {
        const dad = M(300, 568, 1);
        man(dad, [-1]);
        stroke(tube(wide(dad, 1.14), [[64, -368], [82, -290], [78, -212]], [14, 11, 10]), 6); // upper arm, behind the baby
        baby(M(352, 350, 0.82));
        const w = wide(dad, 1.14);
        stroke(tube(w, [[78, -212], [52, -206], [28, -206]], [10, 9, 8]), 6); // forearm under the baby
        hand(w, [28, -206], [8, -190], 1.1, -1);
        sun(700, 90, 40); cloud(560, 190, 0.8); grass(0, 800, 594);
        stroke(heart(640, 300, 26), 5);
      },
    },
    mombaby: {
      label: "👩👶 Mom & baby", cat: "people",
      draw() {
        const mom = M(300, 568, 0.98);
        woman(mom, [-1]);
        const w = wide(mom, 1.14);
        stroke(tube(w, [[54, -346], [80, -280], [76, -212]], [12, 11, 10]), 6);
        baby(M(352, 354, 0.82));
        stroke(tube(w, [[76, -212], [52, -206], [28, -205]], [10, 9, 8]), 6);
        hand(w, [28, -205], [8, -190], 1.05, -1);
        sun(100, 90, 40); cloud(560, 90, 0.9); grass(0, 800, 594);
        stroke(heart(650, 300, 26), 5);
      },
    },
    candy: {
      label: "🍬 Candy", cat: "things",
      draw() {
        // a wrapped sweet
        stroke(smooth([[238, 300], [150, 214], [92, 226], [122, 300], [92, 374], [150, 386]]), 6);
        stroke(smooth([[562, 300], [650, 214], [708, 226], [678, 300], [708, 374], [650, 386]]), 6);
        stroke((c) => { c.moveTo(210, 300); c.lineTo(130, 300); c.moveTo(590, 300); c.lineTo(670, 300); }, 4);
        solid(ell(400, 300, 175, 104), 6);
        clipped(ell(400, 300, 175, 104), () => {
          [-90, -30, 30, 90].forEach((d) => stroke((c) => { c.moveTo(400 + d - 60, 180); c.quadraticCurveTo(400 + d + 10, 300, 400 + d - 60, 420); }, 5));
        });
        clipped(ell(400, 300, 175, 104), () => stroke((c) => { c.moveTo(300, 262); c.quadraticCurveTo(318, 238, 352, 228); }, 5));
        // lollipop
        stroke(circle(620, 130, 70), 6);
        stroke((c) => { for (let t = 0; t <= 6 * PI; t += 0.12) { const r = 6 + (t / (6 * PI)) * 50; (t ? c.lineTo : c.moveTo).call(c, 620 + r * Math.cos(t), 130 + r * Math.sin(t)); } }, 5);
        stroke(poly([[612, 200], [628, 200], [628, 262], [612, 262]]), 5);
        // candy cane
        stroke((c) => { c.moveTo(108, 580); c.lineTo(108, 452); c.bezierCurveTo(108, 350, 230, 350, 230, 452); c.lineTo(206, 452); c.bezierCurveTo(206, 396, 132, 396, 132, 452); c.lineTo(132, 580); c.closePath(); }, 6);
        [490, 530, 568].forEach((y) => stroke((c) => { c.moveTo(108, y); c.lineTo(132, y - 20); }, 4));
        stroke((c) => { c.moveTo(150, 394); c.lineTo(170, 380); c.moveTo(196, 394); c.lineTo(214, 410); }, 4);
        // gumdrops
        [[470, 560, 46], [560, 570, 38], [650, 556, 50]].forEach(([x, y, r]) => {
          stroke((c) => { c.arc(x, y, r, PI, 0); c.lineTo(x + r, y + 20); c.lineTo(x - r, y + 20); c.closePath(); }, 6);
          [-0.5, 0, 0.5].forEach((k) => stroke(circle(x + k * r, y - r * 0.45 + Math.abs(k) * 8, 3), 3));
        });
        stroke(heart(330, 470, 22), 5); stroke(heart(730, 380, 20), 5);
      },
    },
    heart: {
      label: "❤️ Big heart", cat: "things",
      draw() {
        stroke(heart(400, 130, 250), 7);
        stroke(heart(400, 188, 188), 5);
        stroke(heart(400, 238, 126), 5);
        stroke(heart(400, 285, 66), 5);
        // sparkles and small hearts
        [[96, 100, 30], [706, 90, 26], [90, 420, 24], [716, 440, 30]].forEach(([x, y, k]) => stroke(heart(x, y, k), 5));
        [[150, 250], [660, 280], [400, 560]].forEach(([x, y]) => stroke((c) => { c.moveTo(x, y - 24); c.lineTo(x + 7, y - 7); c.lineTo(x + 24, y); c.lineTo(x + 7, y + 7); c.lineTo(x, y + 24); c.lineTo(x - 7, y + 7); c.lineTo(x - 24, y); c.lineTo(x - 7, y - 7); c.closePath(); }, 4));
      },
    },
  };
}
