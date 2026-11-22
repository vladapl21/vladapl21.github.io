// Chess piece geometry, built in code so the site ships no 3D model files.
// Most pieces are a profile spun around the vertical axis; the knight adds an
// extruded head, the rook its battlements, the king its cross.

import * as THREE from '../vendor/three.js';
import { mergeGeometries } from '../vendor/three.js';

const cache = new Map();
let SEGMENTS = 56;

// Fewer facets round each piece for slower devices. Call before building any piece.
export function setDetail(segments) {
  SEGMENTS = segments;
  cache.clear();
}

const lathe = (points) =>
  new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), SEGMENTS);

// Points along part of a circle or ellipse, for heads and domes.
function arc(cy, rx, ry, fromDeg, toDeg, steps = 10) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const a = THREE.MathUtils.degToRad(fromDeg + ((toDeg - fromDeg) * i) / steps);
    out.push([Math.max(0, rx * Math.cos(a)), cy + ry * Math.sin(a)]);
  }
  return out;
}

// Shared foot: a rounded plinth that narrows into the stem.
const foot = (R) => [
  [0, 0], [R - 0.02, 0], [R, 0.015], [R + 0.012, 0.04], [R + 0.012, 0.075],
  [R - 0.01, 0.1], [R - 0.06, 0.125], [R - 0.085, 0.16],
];

// A ring around the stem.
const collar = (y, inner, outer) => [
  [inner, y], [outer - 0.012, y + 0.018], [outer, y + 0.04], [outer - 0.012, y + 0.062], [inner + 0.008, y + 0.08],
];

const profiles = {
  pawn: () => [
    ...foot(0.29),
    [0.165, 0.2], [0.125, 0.32], [0.1, 0.45], [0.093, 0.5],
    ...collar(0.52, 0.093, 0.18),
    ...arc(0.76, 0.165, 0.165, -50, 90, 14),
  ],
  rook: () => [
    ...foot(0.31),
    [0.215, 0.2], [0.195, 0.4], [0.18, 0.7],
    ...collar(0.72, 0.18, 0.25),
    [0.2, 0.83], [0.25, 0.88], [0.262, 0.92], [0.262, 1.0], [0.19, 1.0], [0.19, 0.94], [0, 0.94],
  ],
  bishop: () => [
    ...foot(0.31),
    [0.18, 0.2], [0.125, 0.4], [0.097, 0.62], [0.09, 0.72],
    ...collar(0.74, 0.09, 0.185),
    ...arc(1.03, 0.155, 0.2, -55, 80, 14),
    ...arc(1.272, 0.05, 0.05, -50, 90, 8),
  ],
  queen: () => [
    ...foot(0.33),
    [0.2, 0.2], [0.135, 0.45], [0.103, 0.78], [0.096, 0.9],
    ...collar(0.92, 0.096, 0.195),
    [0.112, 1.03], [0.138, 1.13], [0.2, 1.27], [0.212, 1.3], [0.17, 1.3], [0.125, 1.275],
    ...arc(1.275, 0.125, 0.115, 0, 78, 8),
    ...arc(1.43, 0.052, 0.052, -55, 90, 8),
  ],
  king: () => [
    ...foot(0.35),
    [0.21, 0.2], [0.145, 0.5], [0.112, 0.88], [0.105, 1.0],
    ...collar(1.02, 0.105, 0.205),
    [0.122, 1.14], [0.15, 1.25], [0.215, 1.4], [0.227, 1.43], [0.19, 1.45],
    ...arc(1.45, 0.19, 0.065, 0, 90, 8),
  ],
  knight: () => [
    ...foot(0.31),
    [0.2, 0.2], [0.195, 0.25], [0.225, 0.28], [0.225, 0.32], [0.19, 0.335], [0, 0.335],
  ],
};

function knightHead() {
  const s = new THREE.Shape();
  const v = (x, y) => new THREE.Vector2(x, y);
  s.moveTo(-0.19, 0.3);
  s.splineThru([v(-0.245, 0.52), v(-0.22, 0.8), v(-0.13, 1.03), v(-0.07, 1.12)]); // mane
  s.lineTo(-0.035, 1.25); // ear
  s.lineTo(0.03, 1.1);
  s.splineThru([v(0.14, 1.02), v(0.27, 0.87), v(0.335, 0.75)]); // forehead to nose
  s.splineThru([v(0.33, 0.68), v(0.27, 0.635)]); // muzzle
  s.splineThru([v(0.17, 0.67), v(0.09, 0.64), v(0.07, 0.56)]); // jaw and throat
  s.splineThru([v(0.13, 0.46), v(0.2, 0.37), v(0.21, 0.3)]); // chest
  s.closePath();
  const depth = 0.17;
  const g = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 6, curveSegments: 18,
  });
  g.translate(-0.03, 0, -depth / 2);
  g.rotateY(Math.PI / 2); // nose points away from the player (towards -z)
  return g;
}

function rookBattlements() {
  const out = [];
  const count = 6;
  const span = ((Math.PI * 2) / count) * 0.62;
  for (let i = 0; i < count; i++) {
    const a0 = (i / count) * Math.PI * 2;
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.262, a0, a0 + span, false);
    s.absarc(0, 0, 0.19, a0 + span, a0, true);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 8 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, 1.0, 0);
    out.push(g);
  }
  return out;
}

function queenPearls() {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const g = new THREE.SphereGeometry(0.036, 14, 10);
    g.translate(Math.cos(a) * 0.196, 1.315, Math.sin(a) * 0.196);
    out.push(g);
  }
  return out;
}

function kingCross() {
  const up = new THREE.BoxGeometry(0.07, 0.27, 0.07);
  up.translate(0, 1.64, 0);
  const across = new THREE.BoxGeometry(0.21, 0.07, 0.07);
  across.translate(0, 1.665, 0);
  return [up, across];
}

const extras = { knight: () => [knightHead()], rook: rookBattlements, queen: queenPearls, king: kingCross };


// One geometry per piece type: the turned body and any extra parts fused
// together, so each piece on the board is a single object to draw.
function geometryFor(type) {
  if (!cache.has(type)) {
    const parts = [lathe(profiles[type]()), ...(extras[type] ? extras[type]() : [])].map((g) => {
      const flat = g.index ? g.toNonIndexed() : g;
      for (const name of Object.keys(flat.attributes)) if (!['position', 'normal', 'uv'].includes(name)) flat.deleteAttribute(name);
      return flat;
    });
    cache.set(type, parts.length > 1 ? mergeGeometries(parts) : parts[0]);
  }
  return cache.get(type);
}

// Returns a group standing on y = 0, centred on its square.
export function buildPiece(type, material) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometryFor(type), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  group.scale.setScalar(0.94);
  return group;
}
