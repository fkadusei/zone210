/**
 * Procedural 3D chess pieces (no model files): turned bodies from lathe profiles plus small details,
 * and a sculpted knight. One square is 1 unit wide; a piece stands on y = 0.
 */
import * as THREE from "three";

const SEG = 56;

const lathe = (points) => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), SEG);

const geoCache = new Map();
function cached(key, build) {
  if (!geoCache.has(key)) geoCache.set(key, build());
  return geoCache.get(key);
}

function pawnParts() {
  return [
    { g: cached("pawn-body", () => lathe([[0, 0], [0.34, 0], [0.36, 0.04], [0.33, 0.1], [0.24, 0.16], [0.16, 0.3], [0.13, 0.4], [0.21, 0.44], [0.21, 0.48], [0.13, 0.52], [0, 0.52]])) },
    { g: cached("pawn-head", () => new THREE.SphereGeometry(0.19, 40, 28)), y: 0.68 },
  ];
}

function rookParts() {
  const parts = [
    { g: cached("rook-body", () => lathe([[0, 0], [0.4, 0], [0.42, 0.05], [0.37, 0.12], [0.28, 0.22], [0.25, 0.6], [0.31, 0.66], [0.35, 0.72], [0.35, 0.92], [0.3, 0.94], [0.3, 0.98], [0, 0.98]])) },
  ];
  const merlon = cached("rook-merlon", () => new THREE.BoxGeometry(0.12, 0.16, 0.13));
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2;
    parts.push({ g: merlon, x: Math.cos(a) * 0.29, y: 1.05, z: Math.sin(a) * 0.29, ry: -a });
  }
  return parts;
}

function bishopParts() {
  return [
    { g: cached("bishop-body", () => lathe([[0, 0], [0.38, 0], [0.4, 0.05], [0.35, 0.12], [0.24, 0.22], [0.16, 0.5], [0.22, 0.56], [0.24, 0.62], [0.16, 0.7], [0, 0.7]])) },
    { g: cached("bishop-head", () => new THREE.SphereGeometry(1, 40, 28)), y: 0.98, s: [0.2, 0.31, 0.2] },
    { g: cached("bishop-top", () => new THREE.SphereGeometry(0.065, 20, 16)), y: 1.34 },
    { g: cached("bishop-slit", () => new THREE.BoxGeometry(0.34, 0.035, 0.06)), y: 1.02, x: 0.07, rz: 0.75, groove: true },
  ];
}

function queenParts() {
  const parts = [
    { g: cached("queen-body", () => lathe([[0, 0], [0.42, 0], [0.44, 0.05], [0.38, 0.13], [0.27, 0.26], [0.19, 0.6], [0.26, 0.68], [0.29, 0.76], [0.22, 0.84], [0.26, 1.04], [0.34, 1.16], [0.3, 1.2], [0, 1.2]])) },
    { g: cached("queen-top", () => new THREE.SphereGeometry(0.1, 24, 18)), y: 1.34 },
  ];
  const pearl = cached("queen-pearl", () => new THREE.SphereGeometry(0.055, 16, 12));
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    parts.push({ g: pearl, x: Math.cos(a) * 0.3, y: 1.24, z: Math.sin(a) * 0.3 });
  }
  return parts;
}

function kingParts() {
  return [
    { g: cached("king-body", () => lathe([[0, 0], [0.42, 0], [0.44, 0.05], [0.38, 0.13], [0.27, 0.26], [0.19, 0.65], [0.26, 0.73], [0.29, 0.81], [0.22, 0.89], [0.27, 1.12], [0.33, 1.22], [0.28, 1.26], [0, 1.26]])) },
    { g: cached("king-cap", () => new THREE.SphereGeometry(0.1, 24, 18)), y: 1.3 },
    { g: cached("king-cross-v", () => new THREE.BoxGeometry(0.1, 0.36, 0.1)), y: 1.55 },
    { g: cached("king-cross-h", () => new THREE.BoxGeometry(0.3, 0.1, 0.1)), y: 1.58 },
  ];
}

/** Sculpted knight: a turned base plus an extruded horse-head silhouette (faces +x before rotation). */
function knightHead() {
  return cached("knight-head", () => {
    const s = new THREE.Shape();
    s.moveTo(-0.24, 0.38);
    s.bezierCurveTo(-0.36, 0.6, -0.3, 0.92, -0.14, 1.08); // back of the neck up to the crest
    s.bezierCurveTo(-0.12, 1.2, -0.06, 1.3, 0.02, 1.36); // ear
    s.bezierCurveTo(0.06, 1.3, 0.1, 1.22, 0.11, 1.15);
    s.bezierCurveTo(0.24, 1.13, 0.36, 1.0, 0.46, 0.84); // forehead down the face
    s.bezierCurveTo(0.54, 0.76, 0.52, 0.66, 0.44, 0.64); // nose and muzzle
    s.bezierCurveTo(0.34, 0.62, 0.26, 0.64, 0.17, 0.58); // jaw line
    s.bezierCurveTo(0.24, 0.5, 0.3, 0.44, 0.32, 0.38); // throat
    s.lineTo(-0.24, 0.38);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 4, curveSegments: 24 });
    g.translate(0, 0, -0.1);
    return g;
  });
}

function knightParts() {
  return [
    { g: cached("knight-body", () => lathe([[0, 0], [0.4, 0], [0.42, 0.05], [0.36, 0.12], [0.28, 0.22], [0.26, 0.38], [0, 0.4]])) },
    { g: knightHead(), rotateHead: true },
    { g: cached("knight-eye", () => new THREE.SphereGeometry(0.03, 12, 10)), x: 0.3, y: 0.92, z: 0.105, groove: true },
    { g: cached("knight-eye", () => new THREE.SphereGeometry(0.03, 12, 10)), x: 0.3, y: 0.92, z: -0.105, groove: true },
  ];
}

const BUILDERS = { P: pawnParts, R: rookParts, B: bishopParts, Q: queenParts, K: kingParts, N: knightParts };

/**
 * Builds a piece Group. `white` picks the material; `mats` = { white, black, groove } from the caller.
 * Knights face the opponent (White toward -z, Black toward +z).
 */
export function buildPiece(type, white, mats) {
  const group = new THREE.Group();
  const body = white ? mats.white : mats.black;
  for (const part of BUILDERS[type]()) {
    const mesh = new THREE.Mesh(part.g, part.groove ? mats.groove(white) : body);
    if (part.x !== undefined) mesh.position.x = part.x;
    if (part.y !== undefined) mesh.position.y = part.y;
    if (part.z !== undefined) mesh.position.z = part.z;
    if (part.s) mesh.scale.set(...part.s);
    if (part.ry) mesh.rotation.y = part.ry;
    if (part.rz) mesh.rotation.z = part.rz;
    mesh.castShadow = true;
    mesh.receiveShadow = !part.groove;
    group.add(mesh);
  }
  // knights look toward the opponent at 45 degrees, so the horse-head profile is clearly visible from either side
  if (type === "N") group.rotation.y = white ? Math.PI / 4 : (5 * Math.PI) / 4;
  group.userData.type = white ? type : type.toLowerCase();
  return group;
}

export const PIECE_HEIGHT = { P: 0.9, N: 1.4, B: 1.4, R: 1.15, Q: 1.45, K: 1.7 };
