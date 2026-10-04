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

  /* ---- face and hair ---- */
  const face = (m, cy, r, eye = 7) => {
    const e = r * 0.38;
    [-1, 1].forEach((d) => {
      stroke(ell(m.X(d * e), m.Y(cy - 6), m.S(eye), m.S(eye * 1.4)), 4);
      stroke((c) => { c.arc(m.X(d * e), m.Y(cy - 8 - r * 0.3), m.S(eye * 2.3), PI * 1.18, PI * 1.82); }, 4);
    });
    stroke((c) => { c.moveTo(m.X(-r * 0.06), m.Y(cy + r * 0.14)); c.quadraticCurveTo(m.X(0), m.Y(cy + r * 0.24), m.X(r * 0.08), m.Y(cy + r * 0.14)); }, 4);
    stroke((c) => { c.arc(m.X(0), m.Y(cy + r * 0.22), m.S(r * 0.42), PI * 0.18, PI * 0.82); }, 5);
  };
  const ears = (m, cy, r) => [-1, 1].forEach((d) => stroke(ell(m.X(d * r), m.Y(cy + 2), m.S(r * 0.18), m.S(r * 0.26)), 5));
  const head = (m, cy, r) => solid(circle(m.X(0), m.Y(cy), m.S(r)));
  const cap = (m, cy, r, lift = 1) => solid(smooth(L(m, [[-r, cy - 6], [-r * 0.92, cy - r * 0.95], [-r * 0.45, cy - r * 1.26 * lift], [r * 0.45, cy - r * 1.26 * lift], [r * 0.92, cy - r * 0.95], [r, cy - 6], [r * 0.7, cy - r * 0.55], [0, cy - r * 0.42], [-r * 0.7, cy - r * 0.55]])));

  /* ---- bodies: drawn back to front, and clothes use solid() so limbs never show through them ---- */
  const arms = (m, shoulderY, outX, handY, w = 13, hand = 15, sides = [-1, 1]) => sides.forEach((d) => {
    stroke(limb(m.P(d * (outX - 6), shoulderY), m.P(d * (outX + 8), handY), m.S(w), m.S(w * 0.85)), 6);
    solid(circle(m.X(d * (outX + 9)), m.Y(handY + 6), m.S(hand)));
  });
  const shoes = (m, gap, w) => [-1, 1].forEach((d) => solid(ell(m.X(d * (gap + 6)), m.Y(-11), m.S(w), m.S(12)), 6));
  const neck = (m, y1, y2, w) => stroke(limb(m.P(0, y1), m.P(0, y2), m.S(w), m.S(w)), 5);
  const collar = (m, y, r) => stroke((c) => { c.arc(m.X(0), m.Y(y), m.S(r), 0.05, PI - 0.05); }, 5);

  function boy(m) {
    const u = M(m.X(0), m.Y(-54), m.S(1)); // the upper body sits on long legs
    [-1, 1].forEach((d) => stroke(limb(m.P(d * 30, -134), m.P(d * 30, -26), m.S(19), m.S(16)), 6));
    shoes(m, 26, 34);
    arms(u, -190, 96, -100);
    solid(smooth(L(u, [[-62, -122], [0, -128], [62, -122], [66, -62], [8, -60], [0, -84], [-8, -60], [-66, -62]])), 6); // shorts
    neck(u, -252, -232, 17);
    solid(smooth(L(u, [[-22, -238], [-66, -224], [-104, -184], [-96, -146], [-62, -164], [-60, -112], [0, -106], [60, -112], [62, -164], [96, -146], [104, -184], [66, -224], [22, -238]])), 6); // t-shirt
    collar(u, -238, 22);
    stroke((c) => { c.moveTo(u.X(-24), u.Y(-186)); c.lineTo(u.X(-4), u.Y(-166)); c.moveTo(u.X(-4), u.Y(-186)); c.lineTo(u.X(-24), u.Y(-166)); }, 4);
    ears(u, -312, 72);
    head(u, -312, 72);
    cap(u, -312, 72);
    face(u, -312, 72);
  }
  function girl(m) {
    const u = M(m.X(0), m.Y(-44), m.S(1));
    [-1, 1].forEach((d) => stroke(limb(m.P(d * 28, -134), m.P(d * 28, -26), m.S(14), m.S(12)), 6));
    shoes(m, 22, 28);
    [-1, 1].forEach((d) => stroke((c) => { c.moveTo(m.X(d * 6), m.Y(-14)); c.lineTo(m.X(d * 42), m.Y(-14)); }, 4)); // shoe straps
    [-1, 1].forEach((d) => stroke(circle(u.X(d * 66), u.Y(-378), u.S(34)), 6)); // hair puffs
    [-1, 1].forEach((d) => { stroke(poly([u.P(d * 66, -342), u.P(d * 98, -358), u.P(d * 98, -326)]), 4); stroke(poly([u.P(d * 66, -342), u.P(d * 40, -358), u.P(d * 40, -326)]), 4); }); // bows
    arms(u, -206, 80, -118, 11, 13);
    neck(u, -252, -232, 16);
    solid(smooth(L(u, [[-22, -238], [-62, -226], [-70, -186], [-54, -152], [-82, -112], [-118, -72], [-60, -66], [0, -70], [60, -66], [118, -72], [82, -112], [54, -152], [70, -186], [62, -226], [22, -238]])), 6); // dress
    collar(u, -238, 22);
    stroke((c) => { c.moveTo(u.X(-54), u.Y(-152)); c.lineTo(u.X(54), u.Y(-152)); }, 5);
    stroke(poly([u.P(0, -152), u.P(-28, -172), u.P(-28, -132)]), 4); stroke(poly([u.P(0, -152), u.P(28, -172), u.P(28, -132)]), 4); stroke(circle(u.X(0), u.Y(-152), u.S(7)), 4);
    stroke((c) => { for (let x = -112; x < 112; x += 28) { c.moveTo(u.X(x), u.Y(-72)); c.lineTo(u.X(x + 14), u.Y(-92)); c.lineTo(u.X(x + 28), u.Y(-72)); } }, 4);
    ears(u, -312, 68);
    head(u, -312, 68);
    cap(u, -312, 68, 0.9);
    face(u, -312, 68);
  }
  function man(m, sides = [-1, 1]) {
    arms(m, -240, 112, -128, 16, 17, sides);
    solid(smooth(L(m, [[-64, -204], [0, -210], [64, -204], [60, -110], [58, -30], [8, -26], [0, -150], [-8, -26], [-58, -30], [-60, -110]])), 6); // trousers
    shoes(m, 32, 38);
    neck(m, -340, -310, 20);
    solid(smooth(L(m, [[-24, -306], [-80, -292], [-118, -246], [-108, -198], [-72, -218], [-70, -178], [0, -172], [70, -178], [72, -218], [108, -198], [118, -246], [80, -292], [24, -306]])), 6); // shirt
    stroke(poly([m.P(-24, -306), m.P(-38, -290), m.P(-6, -276)]), 5); stroke(poly([m.P(24, -306), m.P(38, -290), m.P(6, -276)]), 5); // collar
    stroke((c) => { c.moveTo(m.X(0), m.Y(-276)); c.lineTo(m.X(0), m.Y(-182)); }, 4);
    [-250, -222, -194].forEach((y) => stroke(circle(m.X(8), m.Y(y), m.S(4)), 3));
    stroke((c) => { c.moveTo(m.X(-70), m.Y(-186)); c.lineTo(m.X(70), m.Y(-186)); }, 7); // belt
    ears(m, -376, 60);
    head(m, -376, 60);
    cap(m, -376, 60, 0.85);
    face(m, -376, 60, 6);
  }
  function woman(m, sides = [-1, 1]) {
    stroke(circle(m.X(0), m.Y(-384), m.S(88)), 6); // round natural hair
    [-26, 26].forEach((x) => stroke(limb(m.P(x, -118), m.P(x, -26), m.S(14), m.S(12)), 6));
    shoes(m, 20, 30);
    arms(m, -246, 86, -140, 13, 15, sides);
    neck(m, -330, -296, 18);
    solid(smooth(L(m, [[-26, -300], [-70, -284], [-78, -236], [-60, -204], [-68, -180], [-128, -108], [-60, -98], [0, -102], [60, -98], [128, -108], [68, -180], [60, -204], [78, -236], [70, -284], [26, -300]])), 6); // dress
    collar(m, -300, 26);
    stroke((c) => { c.moveTo(m.X(-60), m.Y(-204)); c.lineTo(m.X(60), m.Y(-204)); }, 6); // belt
    stroke((c) => { for (let x = -120; x < 120; x += 30) { c.moveTo(m.X(x), m.Y(-102)); c.lineTo(m.X(x + 15), m.Y(-124)); c.lineTo(m.X(x + 30), m.Y(-102)); } }, 4); // zigzag trim
    [-1, 1].forEach((d) => stroke(circle(m.X(d * 40), m.Y(-160), m.S(11)), 4)); // dress pattern
    ears(m, -362, 56);
    head(m, -362, 56);
    [-1, 1].forEach((d) => stroke(circle(m.X(d * 58), m.Y(-336), m.S(8)), 4)); // earrings
    face(m, -362, 56, 6);
  }
  function baby(m) {
    [-1, 1].forEach((d) => solid(limb(m.P(d * 34, -34), m.P(d * 34, -4), m.S(19), m.S(17)), 6)); // legs
    [-1, 1].forEach((d) => solid(ell(m.X(d * 32), m.Y(4), m.S(26), m.S(17)), 6)); // feet
    [-1, 1].forEach((d) => solid(limb(m.P(d * 58, -98), m.P(d * 70, -50), m.S(13), m.S(12)), 5)); // arms
    [-1, 1].forEach((d) => solid(circle(m.X(d * 72), m.Y(-42), m.S(13)), 5)); // hands
    solid(smooth(L(m, [[-30, -120], [0, -126], [30, -120], [54, -86], [56, -34], [0, -24], [-56, -34], [-54, -86]])), 6); // onesie
    [-60, -48, -36].forEach((y) => stroke(circle(m.X(0), m.Y(y), m.S(4)), 3)); // snaps
    ears(m, -176, 58);
    head(m, -176, 58);
    stroke((c) => { c.arc(m.X(2), m.Y(-246), m.S(11), PI * 0.9, PI * 2.6); }, 5); // a little curl
    face(m, -176, 58, 6);
    [-1, 1].forEach((d) => stroke(circle(m.X(d * 38), m.Y(-152), m.S(9)), 3)); // cheeks
  }

  return {
    boy: {
      label: "👦🏿 Boy", cat: "people",
      draw() {
        boy(M(400, 566, 1.1));
        sun(100, 100, 42); cloud(590, 120, 1); grass(0, 800, 590);
      },
    },
    girl: {
      label: "👧🏿 Girl", cat: "people",
      draw() {
        girl(M(400, 566, 1.06));
        sun(700, 100, 42); cloud(60, 130, 1); grass(0, 800, 590);
      },
    },
    family: {
      label: "👨🏾👩🏾👧🏿👦🏿 Family", cat: "people",
      draw() {
        girl(M(150, 566, 0.64));
        man(M(310, 566, 0.86));
        woman(M(520, 566, 0.84));
        boy(M(676, 566, 0.64));
        sun(90, 80, 34); cloud(560, 70, 0.8); grass(0, 800, 594);
        stroke(heart(400, 36, 22), 5);
      },
    },
    dadbaby: {
      label: "👨🏾👶🏿 Dad & baby", cat: "people",
      draw() {
        const dad = M(300, 570, 1.12);
        man(dad, [-1]);
        // the baby sits in dad's arms
        const bb = M(390, 410, 0.78);
        stroke(limb(dad.P(112, -236), dad.P(128, -166), dad.S(16), dad.S(15)), 6); // upper arm, behind the baby
        baby(bb);
        // dad's arm holds the baby from underneath
        solid(limb(dad.P(128, -166), dad.P(58, -146), dad.S(15), dad.S(14)), 6);
        solid(circle(dad.X(44), dad.Y(-146), dad.S(16)), 6);
        sun(700, 90, 40); cloud(560, 190, 0.8); grass(0, 800, 594);
        stroke(heart(640, 300, 26), 5);
      },
    },
    mombaby: {
      label: "👩🏾👶🏿 Mom & baby", cat: "people",
      draw() {
        const mom = M(300, 570, 1.12);
        woman(mom, [-1]);
        const bb = M(392, 428, 0.78);
        stroke(limb(mom.P(104, -238), mom.P(124, -168), mom.S(14), mom.S(14)), 6); // upper arm, behind the baby
        baby(bb);
        solid(limb(mom.P(124, -168), mom.P(54, -150), mom.S(14), mom.S(13)), 6);
        solid(circle(mom.X(46), mom.Y(-150), mom.S(15)), 6);
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
