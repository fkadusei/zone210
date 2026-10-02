/**
 * More colouring pages. Each page draws outlines (800 x 600) on the top layer.
 * `solid(shape)` first clears whatever lines are underneath the shape, then outlines it, so pieces can sit in front of each other.
 */
export function makePages({ stroke, solid, circle, poly, ell, clipped }) {
  const sun = (x = 90, y = 90, r = 44) => { stroke(circle(x, y, r)); };
  const cloud = (x, y, s = 1) => stroke((c) => {
    c.moveTo(x, y);
    c.bezierCurveTo(x - 35 * s, y, x - 35 * s, y - 42 * s, x + 5 * s, y - 44 * s);
    c.bezierCurveTo(x + 12 * s, y - 74 * s, x + 60 * s, y - 78 * s, x + 72 * s, y - 48 * s);
    c.bezierCurveTo(x + 96 * s, y - 66 * s, x + 138 * s, y - 50 * s, x + 124 * s, y - 20 * s);
    c.bezierCurveTo(x + 156 * s, y - 16 * s, x + 150 * s, y, x + 124 * s, y);
    c.closePath();
  }, 5);
  const grass = (x0, x1, y) => stroke((c) => { for (let x = x0; x < x1; x += 80) { c.moveTo(x, y); c.lineTo(x + 20, y - 38); c.lineTo(x + 40, y); c.lineTo(x + 60, y - 34); c.lineTo(x + 80, y); } }, 5);
  const heart = (x, y, k) => (c) => {
    c.moveTo(x, y + 0.35 * k);
    c.bezierCurveTo(x, y - 0.25 * k, x - k, y - 0.25 * k, x - k, y + 0.3 * k);
    c.bezierCurveTo(x - k, y + 0.75 * k, x - 0.3 * k, y + 0.95 * k, x, y + 1.25 * k);
    c.bezierCurveTo(x + 0.3 * k, y + 0.95 * k, x + k, y + 0.75 * k, x + k, y + 0.3 * k);
    c.bezierCurveTo(x + k, y - 0.25 * k, x, y - 0.25 * k, x, y + 0.35 * k);
  };
  const star = (x, y, r) => (c) => { for (let i = 0; i < 10; i += 1) { const rr = i % 2 ? r * 0.45 : r; const a = (Math.PI / 5) * i - Math.PI / 2; (i ? c.lineTo : c.moveTo).call(c, x + rr * Math.cos(a), y + rr * Math.sin(a)); } c.closePath(); };
  const wave = (x0, x1, y, amp = 14, step = 50) => (c) => { c.moveTo(x0, y); for (let x = x0; x < x1; x += step) { c.quadraticCurveTo(x + step / 4, y + amp, x + step / 2, y); c.quadraticCurveTo(x + (3 * step) / 4, y - amp, x + step, y); } };
  const line = (pts, w = 5) => stroke((c) => { c.moveTo(...pts[0]); pts.slice(1).forEach((p) => c.lineTo(...p)); }, w);

  return {
    butterfly: {
      label: "🦋 Butterfly", cat: "animals",
      draw() {
        const wing = (m) => {
          const X = (x) => (m ? 800 - x : x);
          stroke((c) => { c.moveTo(X(384), 250); c.bezierCurveTo(X(310), 70, X(120), 90, X(150), 230); c.bezierCurveTo(X(170), 300, X(300), 300, X(384), 290); c.closePath(); });
          stroke((c) => { c.moveTo(X(384), 296); c.bezierCurveTo(X(290), 300, X(160), 350, X(210), 460); c.bezierCurveTo(X(260), 530, X(360), 460, X(384), 350); c.closePath(); });
          stroke(circle(X(255), 190, 34), 5); stroke(circle(X(285), 410, 24), 5); stroke(circle(X(215), 262, 14), 4);
          stroke((c) => { c.moveTo(X(392), 160); c.bezierCurveTo(X(380), 112, X(352), 92, X(336), 82); }, 5); stroke(circle(X(332), 78, 9), 4);
        };
        wing(false); wing(true);
        solid(ell(400, 310, 19, 130)); solid(circle(400, 168, 27));
        sun(700, 90, 40); grass(0, 800, 590);
      },
    },
    cat: {
      label: "🐱 Cat", cat: "animals",
      draw() {
        stroke(poly([[235, 215], [235, 60], [370, 150]])); stroke(poly([[565, 215], [565, 60], [430, 150]]));
        solid(circle(400, 320, 185));
        stroke(poly([[268, 190], [268, 115], [335, 160]]), 4); stroke(poly([[532, 190], [532, 115], [465, 160]]), 4);
        stroke(ell(328, 290, 36, 44)); stroke(ell(472, 290, 36, 44));
        stroke(ell(328, 298, 12, 28), 4); stroke(ell(472, 298, 12, 28), 4);
        stroke(poly([[372, 352], [428, 352], [400, 386]]));
        stroke((c) => { c.moveTo(400, 386); c.lineTo(400, 410); c.moveTo(400, 410); c.bezierCurveTo(380, 438, 345, 430, 335, 408); c.moveTo(400, 410); c.bezierCurveTo(420, 438, 455, 430, 465, 408); }, 5);
        [[[262, 372], [90, 340]], [[262, 392], [90, 396]], [[262, 412], [100, 450]], [[538, 372], [710, 340]], [[538, 392], [710, 396]], [[538, 412], [700, 450]]].forEach((l) => line(l, 4));
        stroke(circle(690, 520, 58)); stroke((c) => { c.arc(690, 520, 36, 0.3, 2.6); }, 4); stroke((c) => { c.arc(690, 520, 18, 3.5, 6); }, 4);
        stroke((c) => { c.moveTo(640, 548); c.bezierCurveTo(560, 600, 520, 560, 470, 590); }, 5);
      },
    },
    dog: {
      label: "🐶 Dog", cat: "animals",
      draw() {
        stroke(ell(225, 320, 52, 128, 0.28)); stroke(ell(575, 320, 52, 128, -0.28));
        solid(circle(400, 300, 168));
        stroke(circle(335, 255, 26)); stroke(circle(465, 255, 26)); stroke(circle(341, 255, 11), 4); stroke(circle(459, 255, 11), 4);
        stroke((c) => c.ellipse(400, 360, 92, 66, 0, 0, Math.PI * 2));
        stroke(ell(400, 335, 38, 26));
        stroke((c) => { c.moveTo(400, 361); c.lineTo(400, 392); c.moveTo(400, 392); c.bezierCurveTo(375, 420, 340, 410, 330, 385); c.moveTo(400, 392); c.bezierCurveTo(425, 420, 460, 410, 470, 385); }, 5);
        stroke((c) => { c.moveTo(382, 400); c.lineTo(382, 452); c.bezierCurveTo(382, 476, 418, 476, 418, 452); c.lineTo(418, 400); c.closePath(); });
        stroke((c) => { c.moveTo(0, 510); c.lineTo(800, 510); }, 6);
        stroke(circle(660, 555, 34)); stroke((c) => { c.arc(660, 555, 34, 0.5, 2.4); }, 4);
        stroke(circle(130, 90, 44)); cloud(560, 130, 0.9);
      },
    },
    turtle: {
      label: "🐢 Turtle", cat: "animals",
      draw() {
        stroke(poly([[270, 385], [270, 470], [340, 470], [340, 385]])); stroke(poly([[470, 385], [470, 470], [540, 470], [540, 385]]));
        stroke(poly([[158, 360], [110, 395], [170, 400]]));
        stroke(circle(655, 335, 62));
        solid((c) => { c.ellipse(400, 390, 230, 170, 0, Math.PI, Math.PI * 2); c.closePath(); });
        stroke(circle(675, 318, 14)); stroke(circle(680, 318, 5), 3); stroke((c) => { c.arc(660, 350, 28, 0.2, 1.2); }, 4);
        stroke((c) => { c.moveTo(400, 220); c.lineTo(400, 390); c.moveTo(300, 250); c.lineTo(340, 390); c.moveTo(500, 250); c.lineTo(460, 390); c.moveTo(210, 330); c.bezierCurveTo(260, 320, 300, 320, 345, 295); c.moveTo(590, 330); c.bezierCurveTo(540, 320, 500, 320, 455, 295); }, 5);
        stroke((c) => { c.moveTo(0, 540); c.bezierCurveTo(60, 500, 100, 580, 160, 540); c.bezierCurveTo(220, 500, 260, 580, 320, 540); c.bezierCurveTo(380, 500, 420, 580, 480, 540); c.bezierCurveTo(540, 500, 580, 580, 640, 540); c.bezierCurveTo(700, 500, 740, 580, 800, 540); }, 5);
        sun(700, 90, 44);
      },
    },
    owl: {
      label: "🦉 Owl", cat: "animals",
      draw() {
        stroke(poly([[150, 520], [150, 560], [650, 560], [650, 520]]));
        stroke(poly([[290, 190], [290, 100], [355, 160]])); stroke(poly([[510, 190], [510, 100], [445, 160]]));
        stroke(ell(255, 380, 50, 125, 0.2)); stroke(ell(545, 380, 50, 125, -0.2));
        solid(ell(400, 350, 150, 195));
        stroke(ell(400, 405, 95, 125));
        stroke(circle(335, 250, 54)); stroke(circle(465, 250, 54)); stroke(circle(335, 250, 24), 4); stroke(circle(465, 250, 24), 4);
        stroke(poly([[382, 292], [418, 292], [400, 335]]));
        for (let r = 0; r < 4; r += 1) for (let k = 0; k < 3; k += 1) stroke((c) => { c.arc(358 + k * 42, 380 + r * 36, 20, 0.15 * Math.PI, 0.85 * Math.PI); }, 4);
        stroke(poly([[350, 520], [335, 545], [365, 545]]), 4); stroke(poly([[450, 520], [435, 545], [465, 545]]), 4);
        stroke((c) => { c.moveTo(650, 540); c.bezierCurveTo(690, 510, 740, 520, 760, 480); c.bezierCurveTo(710, 470, 670, 490, 650, 540); }, 5);
        stroke(circle(90, 90, 44));
      },
    },
    frog: {
      label: "🐸 Frog", cat: "animals",
      draw() {
        stroke(ell(400, 520, 330, 72)); stroke((c) => { c.moveTo(120, 520); c.lineTo(260, 520); c.moveTo(540, 520); c.lineTo(680, 520); }, 3);
        stroke(ell(250, 430, 70, 38, -0.4)); stroke(ell(550, 430, 70, 38, 0.4));
        solid(ell(400, 360, 200, 150));
        solid(circle(320, 195, 58)); solid(circle(480, 195, 58));
        stroke(circle(320, 195, 30), 4); stroke(circle(480, 195, 30), 4); stroke(circle(326, 195, 12), 3); stroke(circle(474, 195, 12), 3);
        stroke((c) => { c.moveTo(280, 330); c.bezierCurveTo(340, 410, 460, 410, 520, 330); }, 6);
        stroke(circle(375, 275, 8), 4); stroke(circle(425, 275, 8), 4);
        stroke(ell(300, 495, 34, 16)); stroke(ell(500, 495, 34, 16));
        stroke((c) => { c.moveTo(60, 150); c.quadraticCurveTo(100, 100, 140, 150); c.quadraticCurveTo(100, 200, 60, 150); }, 5);
        stroke(circle(690, 100, 44));
        stroke((c) => { c.moveTo(0, 590); c.bezierCurveTo(40, 560, 80, 620, 120, 590); }, 4);
      },
    },
    car: {
      label: "🚗 Car", cat: "vehicles",
      draw() {
        stroke(poly([[0, 495], [800, 495], [800, 600], [0, 600]]));
        stroke((c) => { c.moveTo(0, 548); c.lineTo(70, 548); c.moveTo(140, 548); c.lineTo(210, 548); c.moveTo(280, 548); c.lineTo(350, 548); c.moveTo(420, 548); c.lineTo(490, 548); c.moveTo(560, 548); c.lineTo(630, 548); c.moveTo(700, 548); c.lineTo(770, 548); }, 5);
        stroke(poly([[225, 345], [300, 230], [520, 230], [590, 345]]));
        stroke((c) => { c.moveTo(100, 440); c.lineTo(100, 360); c.quadraticCurveTo(100, 340, 120, 340); c.lineTo(700, 340); c.quadraticCurveTo(710, 340, 710, 360); c.lineTo(710, 440); c.closePath(); });
        stroke(poly([[255, 340], [310, 252], [393, 252], [393, 340]]), 4); stroke(poly([[415, 340], [415, 252], [498, 252], [558, 340]]), 4);
        stroke(poly([[680, 365], [706, 365], [706, 390], [680, 390]]), 4); stroke(poly([[104, 365], [130, 365], [130, 390], [104, 390]]), 4);
        solid(circle(220, 440, 60)); solid(circle(590, 440, 60)); stroke(circle(220, 440, 26), 4); stroke(circle(590, 440, 26), 4);
        stroke(circle(130, 90, 44)); cloud(500, 140, 1);
      },
    },
    airplane: {
      label: "✈️ Airplane", cat: "vehicles",
      draw() {
        stroke(poly([[360, 320], [250, 130], [320, 130], [470, 320]]));
        stroke(poly([[360, 330], [250, 490], [320, 490], [470, 330]]));
        stroke(poly([[140, 300], [100, 180], [150, 180], [235, 290]]));
        solid((c) => { c.moveTo(80, 320); c.bezierCurveTo(80, 270, 160, 262, 240, 262); c.lineTo(600, 262); c.bezierCurveTo(700, 262, 740, 300, 740, 325); c.bezierCurveTo(740, 350, 700, 380, 600, 380); c.lineTo(160, 380); c.bezierCurveTo(100, 380, 80, 350, 80, 320); });
        [260, 330, 400, 470].forEach((x) => stroke(circle(x, 318, 20), 4));
        stroke((c) => { c.moveTo(560, 270); c.bezierCurveTo(610, 270, 650, 285, 665, 318); c.lineTo(560, 318); c.closePath(); }, 4);
        stroke(circle(90, 100, 44)); cloud(560, 140, 1.1); cloud(120, 520, 0.9); cloud(560, 560, 0.8);
      },
    },
    sailboat: {
      label: "⛵ Sailboat", cat: "vehicles",
      draw() {
        stroke(poly([[400, 90], [400, 400]]));
        stroke(poly([[400, 100], [400, 380], [200, 380]]));
        stroke(poly([[420, 130], [420, 380], [560, 380]]));
        stroke(poly([[400, 90], [470, 105], [400, 120]]), 4);
        stroke((c) => { c.moveTo(150, 410); c.lineTo(650, 410); c.lineTo(580, 490); c.lineTo(220, 490); c.closePath(); });
        [260, 340, 420, 500].forEach((x) => stroke(circle(x, 448, 16), 4));
        [[0, 520], [270, 520], [540, 520]].forEach(([x, y]) => stroke((c) => { c.moveTo(x, y); c.bezierCurveTo(x + 45, y - 40, x + 90, y + 40, x + 135, y); c.bezierCurveTo(x + 180, y - 40, x + 225, y + 40, x + 270, y); }, 5));
        stroke((c) => { c.moveTo(0, 570); c.bezierCurveTo(60, 540, 100, 600, 160, 570); c.bezierCurveTo(220, 540, 260, 600, 320, 570); c.bezierCurveTo(380, 540, 420, 600, 480, 570); c.bezierCurveTo(540, 540, 580, 600, 640, 570); c.bezierCurveTo(700, 540, 740, 600, 800, 570); }, 5);
        sun(680, 100, 46);
        stroke((c) => { c.moveTo(110, 130); c.quadraticCurveTo(135, 105, 160, 130); c.quadraticCurveTo(185, 105, 210, 130); }, 4);
      },
    },
    castle: {
      label: "🏰 Castle", cat: "scenes",
      draw() {
        stroke(poly([[0, 500], [800, 500], [800, 600], [0, 600]]));
        stroke(poly([[250, 500], [250, 220], [285, 220], [285, 245], [320, 245], [320, 220], [355, 220], [355, 245], [390, 245], [390, 220], [425, 220], [425, 245], [460, 245], [460, 220], [495, 220], [495, 245], [530, 245], [530, 220], [550, 220], [550, 500]]));
        stroke(poly([[140, 500], [140, 250], [250, 250], [250, 500]])); stroke(poly([[130, 250], [195, 110], [260, 250]]));
        stroke(poly([[550, 500], [550, 250], [660, 250], [660, 500]])); stroke(poly([[540, 250], [605, 110], [670, 250]]));
        stroke(poly([[195, 110], [195, 60]]), 5); stroke(poly([[195, 60], [250, 75], [195, 90]]), 4);
        stroke(poly([[605, 110], [605, 60]]), 5); stroke(poly([[605, 60], [660, 75], [605, 90]]), 4);
        stroke((c) => { c.moveTo(355, 500); c.lineTo(355, 390); c.arc(400, 390, 45, Math.PI, 0); c.lineTo(445, 500); c.closePath(); });
        stroke((c) => { c.moveTo(400, 345); c.lineTo(400, 500); c.moveTo(355, 430); c.lineTo(445, 430); }, 3);
        [[195, 330], [605, 330], [195, 420], [605, 420]].forEach(([x, y]) => stroke((c) => { c.moveTo(x - 16, y + 30); c.lineTo(x - 16, y); c.arc(x, y, 16, Math.PI, 0); c.lineTo(x + 16, y + 30); c.closePath(); }, 4));
        [[320, 300], [480, 300]].forEach(([x, y]) => stroke((c) => { c.moveTo(x - 16, y + 36); c.lineTo(x - 16, y); c.arc(x, y, 16, Math.PI, 0); c.lineTo(x + 16, y + 36); c.closePath(); }, 4));
        sun(80, 90, 40); cloud(640, 150, 0.9); cloud(40, 250, 0.7);
      },
    },
    rainbow: {
      label: "🌈 Rainbow", cat: "scenes",
      draw() {
        stroke(poly([[0, 470], [800, 470], [800, 600], [0, 600]]));
        [300, 262, 224, 186, 148, 110].forEach((r) => stroke((c) => { c.arc(400, 470, r, Math.PI, 0); }, 5));
        stroke((c) => { c.moveTo(100, 470); c.lineTo(290, 470); c.moveTo(510, 470); c.lineTo(700, 470); }, 5);
        cloud(40, 480, 0.9); cloud(620, 480, 0.9);
        sun(700, 100, 44);
        [[100, 538], [260, 556], [520, 542], [680, 556]].forEach(([x, y]) => { stroke(circle(x, y, 14), 4); for (let i = 0; i < 5; i += 1) { const a = (i / 5) * Math.PI * 2; stroke(circle(x + Math.cos(a) * 24, y + Math.sin(a) * 24, 10), 3); } });
        stroke((c) => { c.moveTo(120, 130); c.quadraticCurveTo(145, 105, 170, 130); c.quadraticCurveTo(195, 105, 220, 130); }, 4);
      },
    },
    mandala: {
      label: "🔯 Mandala", cat: "patterns",
      draw() {
        const cx = 400, cy = 300;
        stroke(circle(cx, cy, 276), 4);
        for (let i = 0; i < 12; i += 1) { const a = (i / 12) * Math.PI * 2; stroke(ell(cx + Math.cos(a) * 205, cy + Math.sin(a) * 205, 60, 24, a), 4); }
        stroke(circle(cx, cy, 140), 4);
        for (let i = 0; i < 12; i += 1) { const a = (i / 12) * Math.PI * 2; stroke(circle(cx + Math.cos(a) * 105, cy + Math.sin(a) * 105, 22), 4); }
        stroke(circle(cx, cy, 70), 4);
        for (let i = 0; i < 8; i += 1) { const a = (i / 8) * Math.PI * 2; stroke(ell(cx + Math.cos(a) * 45, cy + Math.sin(a) * 45, 24, 10, a), 3); }
        stroke(circle(cx, cy, 16), 3);
      },
    },
    icecream: {
      label: "🍦 Ice cream", cat: "things",
      draw() {
        const cone = (c) => { c.moveTo(310, 330); c.lineTo(490, 330); c.lineTo(400, 590); c.closePath(); };
        stroke(cone);
        clipped(cone, () => stroke((c) => { for (let k = -300; k <= 300; k += 50) { c.moveTo(400 + k, 330); c.lineTo(400 + k + 180, 600); c.moveTo(400 + k, 330); c.lineTo(400 + k - 180, 600); } }, 3));
        stroke((c) => { c.moveTo(280, 330); c.bezierCurveTo(250, 380, 290, 400, 320, 360); c.bezierCurveTo(340, 400, 380, 400, 400, 370); c.bezierCurveTo(420, 405, 470, 400, 480, 360); c.bezierCurveTo(510, 400, 560, 380, 520, 330); c.closePath(); });
        solid(circle(400, 250, 100));
        solid(circle(305, 270, 70)); solid(circle(495, 270, 70));
        solid(circle(400, 170, 78));
        stroke(circle(400, 70, 24)); stroke((c) => { c.moveTo(405, 48); c.bezierCurveTo(420, 10, 470, 10, 480, 30); }, 5);
        [[360, 150], [440, 160], [400, 210], [310, 255], [490, 250]].forEach(([x, y]) => stroke(circle(x, y, 7), 3));
        stroke(circle(110, 110, 44)); stroke(circle(700, 130, 20)); stroke(circle(700, 130, 8), 3);
      },
    },
    robot: {
      label: "🤖 Robot", cat: "things",
      draw() {
        stroke(poly([[400, 70], [400, 120]]), 6); stroke(circle(400, 58, 16));
        stroke((c) => { c.moveTo(290, 135); c.lineTo(510, 135); c.lineTo(510, 285); c.lineTo(290, 285); c.closePath(); });
        stroke(circle(345, 195, 30)); stroke(circle(455, 195, 30)); stroke(circle(345, 195, 12), 4); stroke(circle(455, 195, 12), 4);
        stroke(poly([[340, 245], [460, 245], [460, 270], [340, 270]]), 4); stroke((c) => { c.moveTo(370, 245); c.lineTo(370, 270); c.moveTo(400, 245); c.lineTo(400, 270); c.moveTo(430, 245); c.lineTo(430, 270); }, 3);
        stroke(poly([[375, 285], [375, 310], [425, 310], [425, 285]]));
        stroke(poly([[260, 310], [540, 310], [540, 470], [260, 470]]));
        stroke(circle(330, 370, 24), 4); stroke(circle(400, 370, 24), 4); stroke(circle(470, 370, 24), 4); stroke(poly([[310, 420], [490, 420], [490, 450], [310, 450]]), 4);
        stroke(poly([[170, 320], [260, 320], [260, 360], [200, 360], [200, 440], [170, 440]])); stroke(poly([[630, 320], [540, 320], [540, 360], [600, 360], [600, 440], [630, 440]]));
        stroke(poly([[170, 440], [200, 440], [200, 475], [170, 475]]), 4);
        stroke(poly([[290, 470], [290, 560], [370, 560], [370, 470]])); stroke(poly([[430, 470], [430, 560], [510, 560], [510, 470]]));
        stroke(circle(90, 120, 40)); stroke(circle(90, 120, 16), 4); stroke(circle(710, 140, 30)); stroke(circle(710, 140, 12), 4);
      },
    },
    cake: {
      label: "🎂 Birthday cake", cat: "things",
      draw() {
        stroke(ell(400, 535, 340, 34));
        stroke(poly([[180, 440], [180, 530], [620, 530], [620, 440]]));
        stroke(poly([[240, 340], [240, 440], [560, 440], [560, 340]]));
        stroke(poly([[300, 245], [300, 340], [500, 340], [500, 245]]));
        stroke(wave(180, 630, 440, 14, 55), 5); stroke(wave(240, 600, 340, 12, 40), 5); stroke(wave(300, 520, 245, 10, 40), 5);
        [220, 300, 380, 460, 540, 600].forEach((x) => stroke(circle(x, 490, 14), 4));
        [300, 400, 500].forEach((x) => stroke(circle(x, 392, 11), 4));
        stroke(heart(400, 280, 22), 4);
        [[350, 245], [400, 245], [450, 245]].forEach(([x, y]) => { stroke(poly([[x - 8, y - 70], [x - 8, y], [x + 8, y], [x + 8, y - 70]]), 4); stroke((c) => { c.moveTo(x, y - 74); c.bezierCurveTo(x - 20, y - 100, x - 4, y - 118, x, y - 128); c.bezierCurveTo(x + 4, y - 118, x + 20, y - 100, x, y - 74); c.closePath(); }, 4); });
        stroke(circle(100, 100, 40)); stroke(star(700, 120, 42), 5); stroke(star(120, 330, 26), 4);
      },
    },
    balloon: {
      label: "🎈 Hot air balloon", cat: "vehicles",
      draw() {
        stroke(ell(400, 215, 175, 180));
        stroke(ell(400, 215, 100, 180), 4); stroke(ell(400, 215, 38, 180), 4);
        stroke(poly([[318, 372], [352, 470]]), 4); stroke(poly([[482, 372], [448, 470]]), 4); stroke(poly([[375, 394], [375, 470]]), 4); stroke(poly([[425, 394], [425, 470]]), 4);
        stroke(poly([[340, 470], [460, 470], [448, 548], [352, 548]]));
        stroke((c) => { c.moveTo(344, 505); c.lineTo(456, 505); c.moveTo(380, 470); c.lineTo(384, 548); c.moveTo(420, 470); c.lineTo(416, 548); }, 3);
        cloud(40, 180, 0.9); cloud(590, 140, 1); cloud(560, 480, 0.8); sun(110, 460, 38);
        stroke((c) => { c.moveTo(600, 330); c.quadraticCurveTo(625, 305, 650, 330); c.quadraticCurveTo(675, 305, 700, 330); }, 4);
      },
    },
    hearts: {
      label: "💖 Hearts & stars", cat: "patterns",
      draw() {
        for (let j = 0; j < 4; j += 1) for (let i = 0; i < 5; i += 1) {
          const x = 100 + i * 150, y = 55 + j * 140;
          if ((i + j) % 2) { stroke(star(x, y + 50, 55), 5); stroke(star(x, y + 50, 26), 4); }
          else { stroke(heart(x, y, 48), 5); stroke(heart(x, y + 18, 24), 4); }
        }
      },
    },
  };
}
