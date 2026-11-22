// The living room around the board, built in code: a coffee table, rug, sofa,
// window, lamp, shelves. One unit is one board square (about 5.5 cm).
//
// The board's base sits at y = TABLE_TOP; everything else hangs off that.

import * as THREE from '../vendor/three.js';
import { RoundedBoxGeometry, mergeGeometries } from '../vendor/three.js';

export const TABLE_TOP = -0.345;
const TABLE_HEIGHT = 8.4;
export const FLOOR = TABLE_TOP - TABLE_HEIGHT;
export const ROOM = { left: -64, right: 64, back: -46, front: 78, height: 54 };

// ---------- small helpers ----------

// Set by buildRoom: phones and tablets get smaller textures.
let lite = false;

// Draws a texture. `draw` always works in w x h units; `scale` shrinks the
// real canvas, which makes it quicker to draw and lighter to hold.
function canvasTexture(w, h, draw, { repeat, srgb = true, scale = lite ? Math.min(1, 768 / Math.max(w, h)) : 1 } = {}) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.anisotropy = 8;
  return t;
}

// Deterministic random numbers, so the room looks the same on every visit.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Plain coloured materials are shared: asking for the same colour and finish
// twice returns the same material, which lets the meshes using it be merged.
const materials = new Map();
function mat(color, roughness = 0.8, extra = {}) {
  const key = `${new THREE.Color(color).getHexString()}|${roughness}|${JSON.stringify(extra)}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, ...extra }));
  return materials.get(key);
}

// Everything in the room stands still, so meshes that share a material are
// fused into one. Several hundred separate objects become a few dozen.
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const merged = [];
  root.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || Array.isArray(m) || !m.isMeshStandardMaterial || m.transparent || m.vertexColors) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.normal || !g.attributes.uv) return;
    g.applyMatrix4(o.matrixWorld);
    const key = `${m.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { material: m, cast: o.castShadow, receive: o.receiveShadow, parts: [] });
    buckets.get(key).parts.push(g);
    merged.push(o);
  });
  for (const o of merged) o.removeFromParent();
  for (const { material, cast, receive, parts } of buckets.values()) {
    const mesh = new THREE.Mesh(parts.length > 1 ? mergeGeometries(parts) : parts[0], material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    root.add(mesh);
  }
}

function box(w, h, d, material, x, y, z, { round = 0, cast = false } = {}) {
  const g = round ? new RoundedBoxGeometry(w, h, d, 4, round) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

// A soft dark blob that fakes the shadow under furniture.
let blobTexture;
function blob(w, d, x, z, opacity = 0.55) {
  blobTexture ||= canvasTexture(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, opacity, depthWrite: false }),
  );
  m.position.set(x, FLOOR + 0.11, z);
  m.renderOrder = 1;
  return m;
}

// ---------- textures ----------

function woodTexture({ base, dark, light, planks, seed }) {
  return canvasTexture(1024, 1024, (g, w, h) => {
    const rand = rng(seed);
    const pw = w / planks;
    for (let i = 0; i < planks; i++) {
      const tone = rand();
      g.fillStyle = tone < 0.33 ? dark : tone < 0.66 ? base : light;
      g.fillRect(i * pw, 0, pw, h);
      // grain
      for (let k = 0; k < 46; k++) {
        const x = i * pw + rand() * pw;
        g.strokeStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,235,200'},${0.03 + rand() * 0.06})`;
        g.lineWidth = 0.6 + rand() * 1.6;
        g.beginPath();
        g.moveTo(x, 0);
        g.bezierCurveTo(x + (rand() - 0.5) * 14, h * 0.33, x + (rand() - 0.5) * 14, h * 0.66, x + (rand() - 0.5) * 8, h);
        g.stroke();
      }
      // staggered plank ends
      const offset = rand() * h;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(i * pw, offset, pw, 2);
      g.fillRect(i * pw, 0, 1.5, h);
    }
  });
}

function rugTexture() {
  return canvasTexture(1024, 720, (g, w, h) => {
    g.fillStyle = '#123a5c';
    g.fillRect(0, 0, w, h);
    const rand = rng(7);
    // woven speckle
    for (let i = 0; i < (lite ? 2500 : 6000); i++) {
      g.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${rand() * 0.05})`;
      g.fillRect(rand() * w, rand() * h, 2, 2);
    }
    g.strokeStyle = '#d7b23a';
    g.lineWidth = 7;
    g.strokeRect(34, 34, w - 68, h - 68);
    g.lineWidth = 2;
    g.strokeRect(52, 52, w - 104, h - 104);
    // a band of diamonds inside the border
    g.fillStyle = '#2774ae';
    for (let x = 96; x < w - 80; x += 44) {
      for (const y of [86, h - 86]) {
        g.beginPath();
        g.moveTo(x, y - 12); g.lineTo(x + 12, y); g.lineTo(x, y + 12); g.lineTo(x - 12, y);
        g.fill();
      }
    }
  });
}

// Dusk over Los Angeles: gradient sky, a line of palms.
function windowTexture() {
  return canvasTexture(768, 540, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#061633');
    sky.addColorStop(0.5, '#15396e');
    sky.addColorStop(0.78, '#6c5a86');
    sky.addColorStop(0.9, '#e39a62');
    sky.addColorStop(1, '#f1b25c');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    const rand = rng(21);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.6})`;
      g.fillRect(rand() * w, rand() * h * 0.4, 1.6, 1.6);
    }
    // the moon, for the summer spent on a lunar laser link
    const glow = g.createRadialGradient(560, 120, 10, 560, 120, 90);
    glow.addColorStop(0, 'rgba(255,255,240,0.5)');
    glow.addColorStop(1, 'rgba(255,255,240,0)');
    g.fillStyle = glow;
    g.fillRect(440, 0, 240, 240);
    g.fillStyle = '#fbf6e2';
    g.beginPath(); g.arc(560, 120, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(190,185,165,0.55)';
    for (const [mx, my, mr] of [[550, 110, 7], [572, 128, 5], [556, 134, 4], [570, 106, 3]]) { g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#071521';
    // far hills and rooftops
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 24) g.lineTo(x, h - 46 - Math.sin(x * 0.011) * 16 - rand() * 10);
    g.lineTo(w, h);
    g.fill();
    // palms
    g.strokeStyle = '#071521';
    for (const [px, ph] of [[110, 250], [190, 190], [520, 280], [610, 215], [690, 170]]) {
      const top = h - 40 - ph;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(px, h - 40);
      g.quadraticCurveTo(px + 10, h - 40 - ph / 2, px + 4, top);
      g.stroke();
      g.lineWidth = 3.2;
      for (let k = 0; k < 9; k++) {
        const a = Math.PI + (k / 8) * Math.PI;
        const len = 36 + rand() * 16;
        g.beginPath();
        g.moveTo(px + 4, top);
        g.quadraticCurveTo(px + 4 + Math.cos(a) * len * 0.6, top + Math.sin(a) * len * 0.6 - 14, px + 4 + Math.cos(a) * len, top + Math.sin(a) * len * 0.35 + 12);
        g.stroke();
      }
    }
  });
}

function artTexture(variant) {
  return canvasTexture(400, 500, (g, w, h) => {
    g.fillStyle = '#efe7d6';
    g.fillRect(0, 0, w, h);
    if (variant === 0) {
      g.fillStyle = '#2774ae';
      g.beginPath(); g.arc(w * 0.42, h * 0.4, 120, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffd100';
      g.fillRect(w * 0.5, h * 0.52, 150, 170);
      g.fillStyle = '#0b2b47';
      g.fillRect(60, h * 0.78, w - 120, 14);
    } else {
      g.fillStyle = '#0b2b47';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 === 0) g.fillRect(70 + c * 65, 120 + r * 65, 65, 65);
      g.fillStyle = '#ffd100';
      g.beginPath(); g.arc(w * 0.7, h * 0.26, 34, 0, Math.PI * 2); g.fill();
    }
  });
}

function curtainTexture() {
  return canvasTexture(256, 64, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const v = 0.62 + 0.38 * Math.sin((x / w) * Math.PI * 14);
      const c = Math.round(150 + 70 * v);
      g.fillStyle = `rgb(${c},${Math.round(c * 0.95)},${Math.round(c * 0.86)})`;
      g.fillRect(x, 0, 1, h);
    }
  });
}

// ---------- furniture ----------

function coffeeTable() {
  const g = new THREE.Group();
  const wood = new THREE.MeshPhysicalMaterial({
    map: woodTexture({ base: '#6b4226', dark: '#5a361f', light: '#7a4e2f', planks: 5, seed: 3 }),
    roughness: 0.42, clearcoat: lite ? 0 : 0.35, clearcoatRoughness: 0.35,
  });
  const top = box(31, 0.9, 20, wood, 0, TABLE_TOP - 0.45, 0, { round: 0.22, cast: true });
  g.add(top);
  const legMat = mat(0x24170e, 0.5);
  for (const x of [-13.6, 13.6]) for (const z of [-8.2, 8.2]) g.add(box(1.1, TABLE_HEIGHT - 0.9, 1.1, legMat, x, FLOOR + (TABLE_HEIGHT - 0.9) / 2, z, { cast: true }));
  g.add(box(27.5, 0.5, 16.5, legMat, 0, FLOOR + 2.6, 0, { cast: true })); // lower shelf
  return g;
}

function mesh(geometry, material, x, y, z, cast = true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function mugOfCoffee() {
  const ceramic = mat(0xf1ece0, 0.35);
  const mug = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.55, 1.35, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xf1ece0, roughness: 0.35, side: THREE.DoubleSide }));
  body.position.y = 0.68;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 28), ceramic);
  base.position.y = 0.04;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.58, 28).rotateX(-Math.PI / 2), mat(0x2a1708, 0.25));
  coffee.position.y = 1.14;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.09, 10, 20, Math.PI), ceramic);
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.6, 0.7, 0);
  mug.add(body, base, coffee, handle);
  mug.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return mug;
}

function chessClock() {
  const clock = new THREE.Group();
  clock.add(box(4.6, 2.3, 1.7, mat(0x2a1a10, 0.45), 0, 1.15, 0, { round: 0.15, cast: true }));
  for (const x of [-1.12, 1.12]) {
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.06, 32).rotateX(Math.PI / 2), mat(0x9a9488, 0.55));
    face.position.set(x, 1.2, 0.87);
    const hand = box(0.06, 0.62, 0.03, mat(0x111111, 0.5), x + 0.12, 1.42, 0.91);
    hand.rotation.z = -0.5;
    const hand2 = box(0.06, 0.42, 0.03, mat(0x111111, 0.5), x - 0.12, 1.3, 0.91);
    hand2.rotation.z = 0.9;
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, x < 0 ? 0.5 : 0.24, 16), mat(0xc9a227, 0.35, { metalness: 0.7 }));
    button.position.set(x, 2.3 + (x < 0 ? 0.25 : 0.12), 0);
    clock.add(face, hand, hand2, button);
  }
  return clock;
}

// Eggs Benedict: two muffin halves, ham, poached eggs, hollandaise, chives.
function eggsBenedict() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(2.5, 1.9, 0.16, 40), mat(0xf4f1ea, 0.3), 0, 0.08, 0));
  const rim = mesh(new THREE.TorusGeometry(2.42, 0.07, 8, 48).rotateX(Math.PI / 2), mat(0xf4f1ea, 0.3), 0, 0.17, 0, false);
  g.add(rim);
  const rand = rng(31);
  for (const [x, z] of [[-0.85, 0.15], [0.9, -0.25]]) {
    g.add(mesh(new THREE.CylinderGeometry(0.82, 0.86, 0.34, 24), mat(0xc79a5b, 0.9), x, 0.33, z));
    g.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 24), mat(0xd9848a, 0.7), x, 0.54, z));
    const egg = mesh(new THREE.SphereGeometry(0.74, 24, 16), mat(0xfbf8f0, 0.35), x, 0.78, z);
    egg.scale.y = 0.56;
    g.add(egg);
    const sauce = mesh(new THREE.SphereGeometry(0.6, 24, 16), mat(0xf2c12e, 0.3), x + 0.04, 0.98, z);
    sauce.scale.set(1, 0.38, 0.92);
    g.add(sauce);
    const drip = mesh(new THREE.SphereGeometry(0.3, 14, 10), mat(0xf2c12e, 0.3), x + 0.5, 0.74, z + 0.36);
    drip.scale.set(0.8, 1.1, 0.7);
    g.add(drip);
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 0.42;
      const chive = mesh(new THREE.BoxGeometry(0.13, 0.03, 0.05), mat(0x3f8a3c, 0.8), x + 0.04 + Math.cos(a) * r, 0.985 + 0.228 * Math.sqrt(1 - (r / 0.6) ** 2), z + Math.sin(a) * r * 0.92, false);
      chive.rotation.y = rand() * 3;
      g.add(chive);
    }
  }
  // fork
  const steel = mat(0xcfd3d6, 0.25, { metalness: 0.9 });
  const fork = new THREE.Group();
  fork.add(mesh(new THREE.BoxGeometry(0.16, 0.05, 2.4), steel, 0, 0.03, 0.6));
  fork.add(mesh(new THREE.BoxGeometry(0.46, 0.05, 0.5), steel, 0, 0.03, -0.8));
  for (const tx of [-0.18, -0.06, 0.06, 0.18]) fork.add(mesh(new THREE.BoxGeometry(0.06, 0.05, 0.9), steel, tx, 0.03, -1.45));
  fork.position.set(3.1, 0, 0.3);
  fork.rotation.y = 0.2;
  g.add(fork);
  return g;
}

function cardTexture(rank) {
  return canvasTexture(160, 230, (g, w, h) => {
    g.fillStyle = '#fbf9f2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#10151c';
    g.font = '700 54px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(rank, 30, 54);
    g.font = '40px Georgia, serif';
    g.fillText('♠', 30, 92);
    g.font = '110px Georgia, serif';
    g.fillText('♠', w / 2, h / 2 + 40);
  });
}

// Poker: a stack of chips, a couple loose, and ace-king of spades.
function pokerHand() {
  const g = new THREE.Group();
  const chip = new THREE.CylinderGeometry(0.56, 0.56, 0.1, 28);
  const colors = [0x2774ae, 0xf4f1ea, 0xd7a91a, 0x10151c, 0x2774ae, 0xd7a91a, 0xf4f1ea, 0x2774ae, 0x10151c];
  const stack = (list, x, z) => list.forEach((c, i) => g.add(mesh(chip, mat(c, 0.5), x + 0.015 * Math.sin(i * 2.1), 0.05 + i * 0.1, z + 0.015 * Math.cos(i * 1.7))));
  stack(colors, 0, 0);
  stack([0xd7a91a, 0x10151c, 0xd7a91a, 0xf4f1ea], -0.25, 1.45);
  // loose chips lying flat, each clear of the stacks and of each other
  g.add(mesh(chip, mat(0xd7a91a, 0.5), 1.5, 0.05, 0.5));
  g.add(mesh(chip, mat(0x2774ae, 0.5), 0.95, 0.05, -1.15));
  const back = mat(0xfbf9f2, 0.6);
  ['A', 'K'].forEach((rank, i) => {
    const card = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.02, 2.45), [back, back, new THREE.MeshStandardMaterial({ map: cardTexture(rank), roughness: 0.6 }), back, back, back]);
    card.position.set(-3.5 + i * 1.45, 0.012 + i * 0.022, 0.5 - i * 0.25);
    card.rotation.y = 0.32 - i * 0.3;
    card.receiveShadow = true;
    g.add(card);
  });
  return g;
}

function shuttlecock() {
  const body = new THREE.Group();
  const cork = mesh(new THREE.SphereGeometry(0.26, 16, 12), mat(0xf4f1ea, 0.5), 0, 0, 0);
  const band = mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.07, 16), mat(0x2774ae, 0.5), 0, 0.14, 0, false);
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.24, 0.95, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xfbfaf5, roughness: 0.7, side: THREE.DoubleSide }),
  );
  skirt.position.y = 0.62;
  skirt.castShadow = true;
  body.add(cork, band, skirt);
  // Lying down, the cork (radius 0.26) and the skirt's rim (radius 0.72, 1.095
  // along the axis) both touch the table when the axis points 0.381 rad above flat.
  body.rotation.z = -(Math.PI / 2 - 0.381);
  body.position.y = 0.26;
  const g = new THREE.Group();
  g.add(body);
  return g;
}

// A small open-wheel racing car, the kind you keep on a shelf.
function raceCar() {
  const g = new THREE.Group();
  const red = mat(0xc8201f, 0.35, { metalness: 0.2 });
  const black = mat(0x111214, 0.6);
  g.add(mesh(new THREE.BoxGeometry(0.8, 0.34, 2.4), red, 0, 0.36, 0.1));
  const nose = mesh(new THREE.CylinderGeometry(0.08, 0.36, 1.6, 4).rotateX(-Math.PI / 2).rotateZ(Math.PI / 4), red, 0, 0.32, -1.85);
  nose.scale.y = 0.6;
  g.add(nose);
  g.add(mesh(new THREE.BoxGeometry(0.46, 0.3, 0.7), black, 0, 0.62, 0.15));
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), red, 0, 0.72, 0.85));
  g.add(mesh(new THREE.BoxGeometry(2.0, 0.06, 0.42), black, 0, 0.2, -2.5));
  g.add(mesh(new THREE.BoxGeometry(1.7, 0.07, 0.5), black, 0, 0.92, 1.45));
  for (const sx of [-0.78, 0.78]) g.add(mesh(new THREE.BoxGeometry(0.06, 0.5, 0.5), black, sx, 0.72, 1.45));
  const wheel = new THREE.CylinderGeometry(0.34, 0.34, 0.34, 20).rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.8, -1.5], [0.8, -1.5], [-0.84, 1.05], [0.84, 1.05]]) g.add(mesh(wheel, black, x, 0.34, z));
  return g;
}

function golfBalls() {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x24170e, roughness: 0.5, side: THREE.DoubleSide }),
  );
  bowl.scale.y = 0.62;
  bowl.position.y = 0.94;
  bowl.castShadow = true;
  g.add(bowl);
  const ball = new THREE.SphereGeometry(0.4, 16, 12);
  const white = mat(0xf7f6f1, 0.45);
  for (const [x, y, z] of [[-0.41, 0.5, -0.41], [0.41, 0.5, -0.41], [-0.41, 0.5, 0.41], [0.41, 0.5, 0.41], [0, 1.075, 0]]) g.add(mesh(ball, white, x, y, z));
  g.add(mesh(ball, white, -2.0, 0.4, 1.2));
  return g;
}

// A closed book lying flat: two covers, a spine along one long edge, pages inside.
function book(w, h, d, color) {
  const g = new THREE.Group();
  const cover = mat(color, 0.6);
  g.add(box(w, 0.07, d, cover, 0, 0.035, 0, { cast: true }));
  g.add(box(w, 0.07, d, cover, 0, h - 0.035, 0, { cast: true }));
  g.add(box(0.07, h, d, cover, -w / 2 + 0.035, h / 2, 0));
  g.add(box(w - 0.2, h - 0.14, d - 0.24, mat(0xe9e2d0, 0.9), 0.03, h / 2, 0, { cast: true }));
  return g;
}

function tableThings() {
  const g = new THREE.Group();
  const y = TABLE_TOP;
  const put = (thing, x, z, ry = 0) => {
    thing.position.set(x, y, z);
    thing.rotation.y = ry;
    g.add(thing);
    return thing;
  };

  // left of the board: breakfast, coffee, books with a model car on top
  put(eggsBenedict(), -9.8, 4.4, 0.3);
  put(mugOfCoffee(), -13.1, 0.3, 2.6);
  const books = new THREE.Group();
  books.add(book(5.2, 0.7, 3.7, 0x0b2b47));
  const topBook = book(4.4, 0.56, 3.2, 0xd7a91a);
  topBook.position.set(-0.15, 0.7, -0.05);
  topBook.rotation.y = -0.25;
  books.add(topBook);
  const car = raceCar();
  car.scale.setScalar(0.92);
  car.position.set(-0.15, 0.7 + 0.56, -0.05);
  car.rotation.y = Math.PI / 2 - 0.25;
  books.add(car);
  put(books, -10.6, -4.8, 0.18);

  // right of the board: the clock, a poker hand, a shuttlecock, golf balls
  put(chessClock(), 11.6, -7.0, -0.55);
  put(pokerHand(), 10.6, 4.6, -0.2);
  put(shuttlecock(), 5.6, 8.3, 0.7);
  put(golfBalls(), 12.6, 0.2, 0.6);

  return g;
}

// ---------- things on the walls and around the room ----------

const BANNER_DIM = 0.5; // how bright the banner sits in the dark room
const VARSITY = "'Graduate', Georgia, 'Times New Roman', serif";

// One sewn-on letter (or word): a dark shadow, a cream felt layer, a gold face.
function appliqué(c, text, size) {
  c.lineJoin = 'round';
  c.fillStyle = 'rgba(8, 36, 60, 0.55)';
  c.fillText(text, size * 0.03, size * 0.04);
  c.strokeStyle = '#f3ead2';
  c.lineWidth = size * 0.085;
  c.strokeText(text, 0, 0);
  const face = c.createLinearGradient(0, -size * 0.72, 0, 0);
  face.addColorStop(0, '#ffe25c');
  face.addColorStop(0.5, '#ffd100');
  face.addColorStop(1, '#e2a100');
  c.fillStyle = face;
  c.fillText(text, 0, 0);
}

// Letters set along a shallow arch. Returns the lowest point any letter
// reaches, so whatever goes underneath can be placed clear of it.
function archedText(c, text, cx, baseY, radius, size) {
  c.font = `${size}px ${VARSITY}`;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  const gap = size * 0.09;
  const widths = [...text].map((ch) => c.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
  const centreY = baseY + radius; // centre of the circle the baseline follows
  let along = -total / 2;
  let lowest = baseY;
  [...text].forEach((ch, i) => {
    const angle = (along + widths[i] / 2) / radius;
    along += widths[i] + gap;
    const x = cx + Math.sin(angle) * radius;
    const y = centreY - Math.cos(angle) * radius;
    lowest = Math.max(lowest, y + (Math.abs(Math.sin(angle)) * widths[i]) / 2);
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    appliqué(c, ch, size);
    c.restore();
  });
  return lowest + size * 0.08; // allow for the outline and shadow
}

function bannerTexture() {
  // 1400 x 990 matches the cloth's proportions (10.4 wide, 7.35 long), so nothing is stretched.
  // The top third lies on top of the cushion; the lettering sits on the part that hangs.
  const draw = (c, w, h) => {
    const base = c.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#2b7bb8');
    base.addColorStop(1, '#22659b');
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    const rand = rng(41);
    for (let i = 0; i < (lite ? 5000 : 14000); i++) { // felt nap
      c.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,20,40'},${rand() * 0.06})`;
      c.fillRect(rand() * w, rand() * h, 2, 2);
    }
    // a sewn gold band near the edge, and a fine line inside it
    c.strokeStyle = '#f5c400';
    c.lineWidth = 13;
    c.strokeRect(34, 34, w - 68, h - 68);
    c.strokeStyle = '#f3ead2';
    c.lineWidth = 3;
    c.strokeRect(58, 58, w - 116, h - 116);

    const feet = archedText(c, 'UCLA', w / 2, 700, 1700, 280);

    // LOS ANGELES underneath, spaced out, well clear of the arch's feet
    const size = 56;
    const text = 'LOS ANGELES';
    const spacing = 15;
    c.font = `${size}px ${VARSITY}`;
    c.textAlign = 'left';
    const widths = [...text].map((ch) => c.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
    const baseline = Math.min(h - 104, feet + 46 + size * 0.72);
    let x = w / 2 - total / 2;
    c.fillStyle = '#f3ead2';
    [...text].forEach((ch, i) => {
      c.fillText(ch, x, baseline);
      x += widths[i] + spacing;
    });
    // a short gold rule either side of it, level with the middle of the letters
    const mid = baseline - size * 0.36;
    c.fillStyle = '#f5c400';
    c.fillRect(w / 2 - total / 2 - 150, mid - 3, 110, 6);
    c.fillRect(w / 2 + total / 2 + 40, mid - 3, 110, 6);
  };
  const texture = canvasTexture(1400, 990, draw);
  // The page does not wait for the lettering's font. If it was not ready, the
  // banner is drawn again when it arrives.
  const font = '100px "Graduate"';
  if (document.fonts && !document.fonts.check(font)) {
    document.fonts.load(font).then(() => {
      const c = texture.image.getContext('2d');
      const scale = texture.image.width / 1400;
      c.setTransform(scale, 0, 0, scale, 0, 0);
      draw(c, 1400, 990);
      texture.needsUpdate = true;
    }).catch(() => {});
  }
  return texture;
}

// A felt banner thrown over the back of the sofa. It is a real cloth surface:
// it lies on top of the back cushion, rounds the cushion's front edge, then
// hangs down the front in folds that deepen towards an uneven hem.
// Plain varsity lettering, not the university's logo.
// Origin: on the seat, at the foot of the back cushion, facing +z.
function banner() {
  const W = 10.4;
  const LEAN = 0.16; // how far the sofa's back cushions lean
  const sinL = Math.sin(LEAN);
  const cosL = Math.cos(LEAN);
  // Work in a frame that leans with the cushion: `a` points out of its front
  // face, `b` up along it. O is the middle of that face.
  const O = { y: 3.207, z: -0.617 };
  const TOP = 3.4; // cushion's top edge, in b
  const CORNER = 0.9; // radius of the cushion's rounded edge
  const GAP = 0.06; // cloth sits this far off the cushion
  const BACK = 1.3; // length lying on top of the cushion
  const DROP = 4.75; // length hanging down the front
  const turn = CORNER + GAP;
  const arcLen = (Math.PI / 2) * turn;
  const total = BACK + arcLen + DROP;

  // Point on the cloth's centre line, s along it from the back edge, with its outward normal.
  const profile = (s) => {
    if (s < BACK) return [-CORNER - (BACK - s), TOP + GAP, 0, 1];
    if (s < BACK + arcLen) {
      const t = (s - BACK) / turn;
      return [-CORNER + Math.sin(t) * turn, TOP - CORNER + Math.cos(t) * turn, Math.sin(t), Math.cos(t)];
    }
    return [GAP, TOP - CORNER - (s - BACK - arcLen), 1, 0];
  };

  const NU = 84;
  const NV = 60;
  const pos = [];
  const uv = [];
  const index = [];
  const printFrom = 0.2; // the print runs almost the whole length of the cloth
  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      const u = i / NU;
      const m = (j / NV) * total; // position along the cloth itself
      // thrown on, not hung: it sits slightly askew, so one side hangs lower
      const s = m + 0.5 * (u - 0.5) + 0.07 * Math.sin(u * 8.8 + 1);
      let [a, b, na, nb] = profile(s);
      // folds: none on top of the cushion, deepening down the hanging part
      const hang = Math.min(1, Math.max(0, (s - BACK - arcLen * 0.5) / DROP));
      const depth = 0.012 + 0.36 * Math.pow(hang, 1.1);
      // a few broad folds, some finer ones, and a slight diagonal pull from being thrown on
      const wave = 0.55 * Math.sin(u * 16.3 + 0.6) + 0.3 * Math.sin(u * 33.3 + 2.8) + 0.25 * Math.sin(u * 6.9 + 5) + 0.22 * Math.sin((u + 0.55 * hang) * 22 + 1.3);
      const out = depth * (1.15 + wave);
      a += na * out;
      b += nb * out;
      // the folds take up a little width, more so lower down
      const x = (u - 0.5) * W * (1 - 0.06 * hang);
      pos.push(x, O.y + a * sinL + b * cosL, O.z + a * cosL - b * sinL);
      uv.push(u, Math.min(1, 1 - (m - printFrom) / (total - printFrom)));
    }
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const p = j * (NU + 1) + i;
      index.push(p, p + NU + 1, p + 1, p + 1, p + NU + 1, p + NU + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();

  // The folds are shaded once, here, as if lit softly from the front left,
  // and stored in the cloth itself. A real lamp aimed at the banner would
  // have to be worked out for every surface in the room on every frame.
  const normal = geometry.getAttribute('normal');
  const light = new THREE.Vector3(-0.8, 0.42, 0.55).normalize();
  const shade = [];
  for (let k = 0; k < normal.count; k++) {
    const facing = Math.max(0, normal.getX(k) * light.x + normal.getY(k) * light.y + normal.getZ(k) * light.z);
    const v = BANNER_DIM * Math.max(0.24, 0.3 + 1.4 * (facing - 0.35));
    shade.push(v, v, v);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
  const cloth = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: bannerTexture(), vertexColors: true, side: THREE.DoubleSide }));

  // Its shadow on the cushion behind: a soft dark patch a little larger than the cloth.
  const shadowMap = canvasTexture(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.filter = 'blur(14px)';
    c.fillStyle = '#000';
    c.fillRect(34, 20, w - 68, h - 54);
  });
  const shadowH = DROP + 0.9;
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 1.5, shadowH),
    new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, opacity: 0.6, depthWrite: false }),
  );
  const sb = TOP - CORNER - shadowH / 2 + 0.25; // centre of the patch, in the cushion's frame
  const sa = 0.025;
  shadow.position.set(0.2, O.y + sa * sinL + sb * cosL, O.z + sa * cosL - sb * sinL);
  shadow.rotation.x = -LEAN;

  const g = new THREE.Group();
  g.add(shadow, cloth);
  return g;
}

function dartboard() {
  const tex = canvasTexture(512, 512, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#0e0f11';
    g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
    const ring = (r0, r1, colors) => {
      for (let i = 0; i < 20; i++) {
        const a0 = ((i - 0.5) / 20) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 0.5) / 20) * Math.PI * 2 - Math.PI / 2;
        g.beginPath();
        g.arc(c, c, r1, a0, a1);
        g.arc(c, c, r0, a1, a0, true);
        g.closePath();
        g.fillStyle = colors[i % 2];
        g.fill();
      }
    };
    ring(16, 206, ['#15171a', '#e9dfc4']);
    ring(196, 206, ['#b3261e', '#1f7a3f']);
    ring(118, 128, ['#b3261e', '#1f7a3f']);
    g.fillStyle = '#1f7a3f'; g.beginPath(); g.arc(c, c, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b3261e'; g.beginPath(); g.arc(c, c, 7, 0, Math.PI * 2); g.fill();
  });
  const g = new THREE.Group();
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const side = mat(0x0e0f11, 0.8);
  const board = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.7, 48).rotateX(Math.PI / 2), [side, face, side]);
  g.add(board);
  // three darts, one in the bullseye
  for (const [x, y, c] of [[0.05, 0.1, 0xd7a91a], [1.5, 2.9, 0x2774ae], [-2.2, 0.9, 0x2774ae]]) {
    const dart = new THREE.Group();
    dart.add(mesh(new THREE.CylinderGeometry(0.07, 0.03, 1.5, 8).rotateX(Math.PI / 2), mat(0x9aa0a6, 0.3, { metalness: 0.8 }), 0, 0, 0.9, false));
    dart.add(mesh(new THREE.BoxGeometry(0.02, 0.7, 0.6), mat(c, 0.7), 0, 0, 1.75, false));
    dart.add(mesh(new THREE.BoxGeometry(0.7, 0.02, 0.6), mat(c, 0.7), 0, 0, 1.75, false));
    dart.position.set(x, y, 0.2);
    dart.rotation.set(-0.12, 0.1 * x, 0);
    g.add(dart);
  }
  return g;
}

// Skis and poles propped in the corner.
function skis() {
  const g = new THREE.Group();
  const base = mat(0x0b2b47, 0.4);
  const top = mat(0xd7a91a, 0.4);
  for (const dx of [0, 1.6]) {
    const ski = new THREE.Group();
    ski.add(box(1.3, 30, 0.22, base, 0, 15, 0));
    ski.add(box(1.3, 12, 0.24, top, 0, 21, 0.01));
    const tip = box(1.3, 2.2, 0.22, base, 0, 30.8, 0.35);
    tip.rotation.x = 0.5;
    ski.add(tip);
    ski.position.x = dx;
    ski.rotation.z = dx ? -0.03 : 0.02;
    g.add(ski);
  }
  const pole = mat(0x9aa0a6, 0.3, { metalness: 0.8 });
  for (const dx of [3.6, 4.3]) {
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 22, 8), pole, dx, 11, 0.4, false));
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.6, 8), mat(0x111214, 0.8), dx, 21.2, 0.4, false));
    g.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 16), mat(0x111214, 0.8), dx, 1.4, 0.4, false));
  }
  g.rotation.x = -0.13;
  return g;
}

// Lying flat with the handle towards +z; y = 0 is the surface it rests on.
function badmintonRacket() {
  const flat = new THREE.Group();
  const frame = mat(0x10151c, 0.4);
  const head = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.09, 8, 40), frame);
  head.scale.set(0.82, 1.1, 1);
  head.position.y = 9.0;
  const strings = new THREE.Mesh(
    new THREE.CircleGeometry(2.0, 32),
    new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.9, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  strings.scale.set(0.82, 1.1, 1);
  strings.position.y = 9.0;
  flat.add(head, strings);
  flat.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.6, 8), frame, 0, 4.6, 0, false));
  flat.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.6, 10), mat(0x2774ae, 0.8), 0, 1.3, 0, false));
  flat.rotation.x = -Math.PI / 2; // built upright, then laid down
  flat.position.y = 0.17; // the grip is the thickest part, so it is what touches
  const g = new THREE.Group();
  g.add(flat);
  return g;
}

function sofa({ width, color, seats }) {
  const g = new THREE.Group();
  const fabric = mat(color, 0.95);
  const depth = 15;
  const f = FLOOR;
  g.add(box(width, 4.6, depth, fabric, 0, f + 3.7, 0, { round: 0.7 }));
  g.add(box(width, 10.5, 3.6, fabric, 0, f + 8.6, -depth / 2 + 1.8, { round: 0.9 }));
  for (const sx of [-1, 1]) g.add(box(3.6, 9.4, depth, fabric, sx * (width / 2 - 1.8), f + 6.1, 0, { round: 0.9 }));
  const inner = width - 7.4;
  const cw = inner / seats;
  const cushion = mat(new THREE.Color(color).multiplyScalar(1.08), 0.95);
  for (let i = 0; i < seats; i++) {
    const x = -inner / 2 + cw * (i + 0.5);
    g.add(box(cw - 0.25, 2.4, depth - 4.4, cushion, x, f + 7.0, 1.7, { round: 0.8 }));
    const back = box(cw - 0.4, 6.8, 2.6, cushion, x, f + 11.2, -depth / 2 + 4.6, { round: 0.9 });
    back.rotation.x = -0.16;
    g.add(back);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.9, 1.5, 0.9, mat(0x1c120b, 0.5), sx * (width / 2 - 1.6), f + 0.75, sz * (depth / 2 - 1.6)));
  return g;
}

// A square cushion standing on the seat (seatY) and leaning back against the sofa.
function pillow(color, x, seatY, z, ry) {
  const lean = 0.35;
  const p = box(5.2, 5.2, 1.7, mat(color, 0.9), 0, 0, 0, { round: 0.8 });
  p.rotation.x = -lean;
  p.position.y = 2.6 * Math.cos(lean) + 0.85 * Math.sin(lean) - 0.2; // bottom edge pressed slightly into the seat
  const g = new THREE.Group();
  g.add(p);
  g.position.set(x, seatY, z);
  g.rotation.y = ry;
  return g;
}

function floorLamp(x, z) {
  const g = new THREE.Group();
  const metal = mat(0x1a1a1a, 0.4, { metalness: 0.6 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.5, 32), metal);
  base.position.y = FLOOR + 0.25;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 27, 12), metal);
  pole.position.y = FLOOR + 13.5;
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 4.4, 5.6, 36, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffa24a, emissiveIntensity: 0.75, roughness: 0.9, side: THREE.DoubleSide }),
  );
  shade.position.y = FLOOR + 28.5;
  g.add(base, pole, shade);
  g.position.set(x, 0, z);
  const light = new THREE.PointLight(0xffa552, 330, 110, 1.8);
  light.position.set(x, FLOOR + 27, z);
  g.userData.light = light;
  return g;
}

function plant(x, z) {
  const g = new THREE.Group();
  const standH = 5.5;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.9, standH, 24), mat(0x24170e, 0.6));
  stand.position.y = FLOOR + standH / 2;
  const potTop = FLOOR + standH + 4.6;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 2.3, 4.6, 28), mat(0xd9d2c3, 0.7));
  pot.position.y = FLOOR + standH + 2.3;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(2.85, 28).rotateX(-Math.PI / 2), mat(0x20150c, 1));
  soil.position.y = potTop - 0.12;
  g.add(stand, pot, soil);
  const rand = rng(11);
  const leafMat = mat(0x2f6b45, 0.7);
  const leafMat2 = mat(0x3d8055, 0.7);
  const leaf = new THREE.SphereGeometry(1, 14, 10);
  const count = 13;
  for (let i = 0; i < count; i++) {
    // Stems lean towards (-cos a, sin a): keep a within the half-turn facing the room.
    const a = 0.1 + (i / (count - 1)) * (Math.PI - 0.2) + (rand() - 0.5) * 0.2;
    const tilt = 0.2 + rand() * 0.6;
    const len = 6 + rand() * 6;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, len, 6), leafMat);
    const pivot = new THREE.Group();
    pivot.position.y = potTop - 0.2;
    pivot.rotation.y = a;
    const arm = new THREE.Group();
    arm.rotation.z = tilt;
    stem.position.y = len / 2;
    const blade = new THREE.Mesh(leaf, rand() < 0.5 ? leafMat : leafMat2);
    blade.scale.set(1.3 + rand() * 0.6, 0.1, 2.4 + rand() * 0.9);
    blade.position.y = len + 0.2;
    blade.rotation.set(0, Math.PI / 2, 0.45 + rand() * 0.3); // long axis out along the stem, drooping a little
    arm.add(stem, blade);
    pivot.add(arm);
    g.add(pivot);
  }
  g.position.set(x, 0, z);
  return g;
}

function bookshelf(x, z, length) {
  const g = new THREE.Group();
  const wood = mat(0x3a2415, 0.6);
  const height = 34;
  const depth = 5.4;
  const shelves = 5;
  g.add(box(depth, height, 0.7, wood, 0, FLOOR + height / 2, -length / 2));
  g.add(box(depth, height, 0.7, wood, 0, FLOOR + height / 2, length / 2));
  g.add(box(0.4, height, length, mat(0x2a1a0f, 0.7), depth / 2 - 0.2, FLOOR + height / 2, 0));
  const rand = rng(5);
  const colors = [0x0b2b47, 0x2774ae, 0xd7a91a, 0x8bb8e8, 0xe9e2d0, 0x7a2f2f, 0x2f5d50, 0x403a36, 0xc97b3c];
  const gap = height / shelves;
  for (let s = 0; s <= shelves; s++) {
    const y = FLOOR + s * gap + 0.35;
    g.add(box(depth, 0.7, length, wood, 0, Math.min(y, FLOOR + height - 0.35), 0));
    if (s === shelves) break;
    let zc = -length / 2 + 1;
    while (zc < length / 2 - 2) {
      if (rand() < 0.12) { zc += 2 + rand() * 3; continue; }
      const t = 0.5 + rand() * 0.8;
      const h = gap * (0.55 + rand() * 0.3);
      const d = 3.2 + rand() * 1.2;
      const b = box(d, h, t, mat(colors[Math.floor(rand() * colors.length)], 0.75), -0.4, y + 0.35 + h / 2, zc + t / 2);
      g.add(b);
      zc += t + 0.06;
    }
  }
  g.position.set(x, 0, z);
  return g;
}

function framedArt(variant, w, h) {
  const g = new THREE.Group();
  g.add(box(w + 1.2, h + 1.2, 0.5, mat(0x15100c, 0.5), 0, 0, 0));
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: artTexture(variant), roughness: 0.9 }));
  art.position.z = 0.27;
  g.add(art);
  return g;
}

// ---------- the room ----------

export function buildRoom({ lite: isLite = false } = {}) {
  lite = isLite;
  const room = new THREE.Group();
  const { left, right, back, front, height } = ROOM;
  const width = right - left;
  const length = front - back;
  const cx = (left + right) / 2;
  const cz = (back + front) / 2;

  // floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: woodTexture({ base: '#a67a4f', dark: '#96693f', light: '#b48a5d', planks: 9, seed: 9 }), roughness: 0.55 }),
  );
  floor.material.map.wrapS = floor.material.map.wrapT = THREE.RepeatWrapping;
  floor.material.map.repeat.set(3.2, 2.2);
  floor.position.set(cx, FLOOR, cz);
  floor.receiveShadow = true;
  room.add(floor);

  // rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(58, 41).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }));
  rug.position.set(0, FLOOR + 0.06, -3);
  rug.receiveShadow = true;
  room.add(rug);

  // walls and baseboards
  const wall = mat(0x143246, 0.95);
  const trim = mat(0xe6dfd0, 0.7);
  const walls = [
    [width, cx, back, 0],
    [width, cx, front, Math.PI],
    [length, left, cz, Math.PI / 2],
    [length, right, cz, -Math.PI / 2],
  ];
  for (const [w, x, z, ry] of walls) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, height), wall);
    m.position.set(x, FLOOR + height / 2, z);
    m.rotation.y = ry;
    room.add(m);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, 0.4), trim);
    b.position.set(x, FLOOR + 0.8, z);
    b.rotation.y = ry;
    b.translateZ(0.2);
    room.add(b);
  }

  // window on the back wall, behind the sofa
  const winW = 40;
  const winH = 25;
  const winY = FLOOR + 18 + winH / 2;
  const view = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshBasicMaterial({ map: windowTexture(), color: 0x8a8a8a, toneMapped: false }));
  view.position.set(0, winY, back + 0.1);
  room.add(view);
  const frame = mat(0xefe9dc, 0.6);
  room.add(box(winW + 2, 1, 1, frame, 0, winY + winH / 2 + 0.5, back + 0.5));
  room.add(box(winW + 1.6, 1.2, 2.2, frame, 0, winY - winH / 2 - 0.6, back + 1.1));
  for (const x of [-winW / 2 - 0.5, winW / 2 + 0.5, 0]) room.add(box(x === 0 ? 0.5 : 1, winH, 0.8, frame, x, winY, back + 0.4));
  room.add(box(winW, 0.5, 0.8, frame, 0, winY + 2, back + 0.4));
  const cloth = new THREE.MeshStandardMaterial({ map: curtainTexture(), roughness: 1 });
  for (const sx of [-1, 1]) room.add(box(9, 44, 1.2, cloth, sx * (winW / 2 + 5.5), FLOOR + 22.5, back + 1.4));
  room.add(box(winW + 24, 0.6, 0.6, mat(0x1a1a1a, 0.4, { metalness: 0.6 }), 0, FLOOR + 45, back + 1.4));

  // sofa with pillows, facing the table
  const couch = sofa({ width: 44, color: 0x56616c, seats: 3 });
  couch.position.set(0, 0, -25);
  room.add(couch);
  const SEAT = FLOOR + 8.2; // top of the sofa's seat cushions
  room.add(pillow(0xd7a91a, -15.2, SEAT, -24.9, 0.22));
  room.add(pillow(0x2774ae, 15.4, SEAT, -24.9, -0.2));
  room.add(blob(54, 24, 0, -25));

  // armchair to the right of the sofa, turned towards the table
  const chair = sofa({ width: 19, color: 0x234e6e, seats: 1 });
  chair.position.set(37, 0, -15);
  chair.rotation.y = -0.95;
  room.add(chair);
  room.add(blob(28, 26, 37, -15));

  // lamp, plant
  const lamp = floorLamp(-30, -33);
  room.add(lamp, lamp.userData.light);
  room.add(blob(9, 9, -30, -33, 0.5));
  room.add(plant(31, -40));
  room.add(blob(11, 11, 31, -40, 0.5));

  // shelves on the right wall, art on the left and back walls
  room.add(bookshelf(right - 2.9, -10, 44));
  const a1 = framedArt(0, 13, 16);
  a1.position.set(left + 0.4, FLOOR + 27, -18);
  a1.rotation.y = Math.PI / 2;
  const a2 = framedArt(1, 13, 16);
  a2.position.set(left + 0.4, FLOOR + 27, 2);
  a2.rotation.y = Math.PI / 2;
  room.add(a1, a2);

  // easter eggs around the room
  const darts = dartboard();
  darts.position.set(-45, FLOOR + 31, back + 0.4);
  room.add(darts);
  const flag = banner();
  flag.position.set(7.2, SEAT, -26.0);
  room.add(flag);
  const skiSet = skis();
  skiSet.position.set(left + 6, FLOOR, back + 5.2);
  room.add(skiSet);
  const racket = badmintonRacket();
  racket.position.set(-0.9, SEAT, -20.9);
  racket.rotation.y = 1.36; // lengthways along the seat, well clear of the back cushions
  room.add(racket);

  // the table the board stands on
  room.add(coffeeTable(), tableThings());

  mergeStatic(room);
  return room;
}
