// The 3D board: scene, pieces, camera moves, picking, and the detection boxes
// drawn over the white pieces.

import * as THREE from '../vendor/three.js';
import { OrbitControls, RoomEnvironment } from '../vendor/three.js';
import { buildPiece } from './pieces.js';

const FILES = 'abcdefgh';
const squarePos = (s) => new THREE.Vector3(FILES.indexOf(s[0]) - 3.5, 0, 3.5 - (Number(s[1]) - 1));
const rad = THREE.MathUtils.degToRad;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const LIFT = 0.42;
const KNIGHT_TURN = Math.PI / 4;
const MOBILE = 1000; // below this width the panel is a bottom sheet

export function createBoard({ canvas, overlay, pieces, opening, reducedMotion, insets: firstInsets, anchor, onSelect, onHover, onFps }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;
  controls.minDistance = 4.5;
  controls.maxDistance = 60;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = 1.45;

  // ---- lights ----
  const key = new THREE.DirectionalLight(0xfff0d8, 2.3);
  key.position.set(-6, 11, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -8;
  key.shadow.camera.right = key.shadow.camera.top = 8;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0x8bb8e8, 0x021c2e, 0.55));
  const rim = new THREE.DirectionalLight(0x8bb8e8, 1.3);
  rim.position.set(5, 4, -8);
  scene.add(rim);

  // ---- board ----
  scene.add(buildBoard(renderer));

  // ---- pieces ----
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xebe3d0, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x0b2b47, roughness: 0.28, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const gold = new THREE.Color(0xffd100);

  const playIntro = !reducedMotion && Boolean(opening);
  const white = []; // { id, group, material, home, corners, el, tagConf, conf, tag }
  const byId = new Map();
  const pickable = [];

  for (const p of pieces) {
    const material = ivory.clone();
    material.emissive = gold.clone();
    material.emissiveIntensity = 0;
    const group = buildPiece(p.type, material);
    const box = new THREE.Box3().setFromObject(group);
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z).divideScalar(group.scale.x));
    const home = squarePos(p.square);
    const baseRot = p.type === 'knight' ? KNIGHT_TURN : 0;
    group.rotation.y = baseRot;
    group.position.copy(playIntro ? squarePos(p.from) : home);
    group.userData.id = p.id;
    scene.add(group);
    const entry = { id: p.id, group, material, home, baseRot, corners, height: box.max.y, tag: p.tag, conf: p.conf, glow: 0, glowTo: 0 };
    white.push(entry);
    byId.set(p.id, entry);
    pickable.push(group);
  }

  const black = new Map();
  const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let f = 0; f < 8; f++) {
    for (const [type, rank] of [[backRank[f], 8], ['pawn', 7]]) {
      const square = FILES[f] + rank;
      const group = buildPiece(type, navy);
      group.rotation.y = Math.PI + (type === 'knight' ? KNIGHT_TURN : 0);
      group.position.copy(squarePos(square));
      scene.add(group);
      black.set(square, group);
      pickable.push(group);
    }
  }
  if (!playIntro && opening) for (const m of opening) if (m.black) black.get(m.black).position.copy(squarePos(m.to));

  // ---- square markers ----
  const markerGeo = new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2);
  const makeMarker = () => {
    const m = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xffd100, transparent: true, opacity: 0, depthWrite: false }));
    m.position.y = 0.004;
    scene.add(m);
    return m;
  };
  const hoverMarker = makeMarker();
  const selectMarker = makeMarker();

  // ---- detection boxes ----
  for (const w of white) {
    const el = document.createElement('div');
    el.className = 'det';
    const tag = document.createElement('span');
    tag.className = 'det-tag';
    const name = document.createElement('b');
    name.textContent = w.tag;
    const conf = document.createElement('i');
    conf.textContent = w.conf.toFixed(2);
    tag.append(name, ' ', conf);
    el.append(tag);
    overlay.append(el);
    w.el = el;
    w.confEl = conf;
    w.rect = { x: 0, y: 0, w: 0, h: 0 };
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  const leaderSvg = document.createElementNS(svgNS, 'svg');
  leaderSvg.setAttribute('class', 'leader');
  const leader = document.createElementNS(svgNS, 'polyline');
  leaderSvg.append(leader);
  overlay.append(leaderSvg);

  // ---- tweens ----
  const tweens = new Set();
  function tween({ duration = 600, delay = 0, ease = easeInOut, update, done }) {
    if (reducedMotion) {
      update(1);
      if (done) done();
      return { cancel() {} };
    }
    const t = { start: performance.now() + delay, duration, ease, update, done };
    tweens.add(t);
    return { cancel: () => tweens.delete(t), finish: () => { if (tweens.delete(t)) { update(1); if (done) done(); } } };
  }
  function stepTweens(now) {
    for (const t of [...tweens]) {
      const k = (now - t.start) / t.duration;
      if (k < 0) continue;
      const c = Math.min(1, k);
      t.update(t.ease(c));
      if (c === 1) {
        tweens.delete(t);
        if (t.done) t.done();
      }
    }
  }

  // ---- layout and camera poses ----
  let width = 1;
  let height = 1;
  let selected = null;
  let hovered = null;
  let touched = false; // has the visitor moved the camera themselves?
  let drifting = false;
  let flying = null;
  const view = { x: 0, y: 0, toX: 0, toY: 0 };

  const isMobile = () => width < MOBILE;

  const insets = { left: 0, right: 0, top: 0, bottom: 0, ...firstInsets };
  const probe = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const fitPoints = [];
  for (const x of [-4.5, 4.5]) for (const z of [-4.5, 4.5]) fitPoints.push(new THREE.Vector3(x, -0.3, z));
  for (const x of [-3.5, 3.5]) fitPoints.push(new THREE.Vector3(x, 1.75, -3.5));

  // Back the camera off until the whole board fits the free part of the
  // screen, then shift the view so the board sits in the middle of it.
  function homePose() {
    const mobile = isMobile();
    const target = new THREE.Vector3(0, 0, 0.2);
    const phi = rad(mobile ? 40 : 54);
    const theta = rad(mobile ? -18 : -27);
    const pad = mobile ? { top: 12, side: 8, bottom: 52 } : { top: 64, side: 40, bottom: 60 };
    const x0 = insets.left + pad.side;
    const x1 = width - pad.side;
    const y0 = insets.top + pad.top;
    const y1 = height - insets.bottom - pad.bottom;
    probe.aspect = width / height;
    probe.updateProjectionMatrix();
    const v = new THREE.Vector3();
    let radius = 11;
    let shift = { x: 0, y: 0 };
    for (; radius < 80; radius += 0.5) {
      probe.position.setFromSphericalCoords(radius, phi, theta).add(target);
      probe.lookAt(target);
      probe.updateMatrixWorld();
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const p of fitPoints) {
        v.copy(p).project(probe);
        const x = (v.x * 0.5 + 0.5) * width;
        const y = (-v.y * 0.5 + 0.5) * height;
        bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x);
        by0 = Math.min(by0, y); by1 = Math.max(by1, y);
      }
      shift = { x: (bx0 + bx1) / 2 - (x0 + x1) / 2, y: (by0 + by1) / 2 - (y0 + y1) / 2 };
      if (bx1 - bx0 <= x1 - x0 && by1 - by0 <= y1 - y0) break;
    }
    const pos = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta).add(target);
    return { pos, target, shift };
  }

  function focusPose(w) {
    const target = w.home.clone();
    target.y = LIFT + w.height / 2;
    const offset = camera.position.clone().sub(controls.target);
    const current = new THREE.Spherical().setFromVector3(offset);
    const theta = THREE.MathUtils.clamp(current.theta, -0.75, 0.75);
    const pos = new THREE.Vector3().setFromSphericalCoords(isMobile() ? 9.5 : 7.6, rad(63), theta).add(target);
    // Centre the piece in whatever the panel and index leave free.
    const shift = { x: (insets.right - insets.left) / 2, y: (insets.bottom - insets.top) / 2 };
    return { pos, target, shift };
  }

  function flyTo(pose, duration = 950, ease = easeInOut) {
    if (flying) flying.cancel();
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();
    drifting = false;
    setShift(pose.shift);
    flying = tween({
      duration,
      ease,
      update: (k) => {
        camera.position.lerpVectors(fromPos, pose.pos, k);
        controls.target.lerpVectors(fromTarget, pose.target, k);
      },
      done: () => {
        flying = null;
        if (!selected && !touched && !reducedMotion) startDrift();
      },
    });
  }

  function setShift(shift, snap = false) {
    view.toX = shift.x;
    view.toY = shift.y;
    if (snap || reducedMotion) {
      view.x = shift.x;
      view.y = shift.y;
    }
  }

  let driftStart = 0;
  function startDrift() {
    drifting = true;
    driftStart = performance.now();
  }
  controls.addEventListener('start', () => {
    touched = true;
    drifting = false;
    controls.autoRotate = false;
  });

  function resize() {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (flying) return;
    const pose = selected ? focusPose(byId.get(selected)) : touched ? null : homePose();
    if (pose) {
      camera.position.copy(pose.pos);
      controls.target.copy(pose.target);
      setShift(pose.shift);
    }
  }

  // ---- selection ----
  function setGlow() {
    for (const w of white) w.glowTo = w.id === selected ? 0.16 : w.id === hovered ? 0.07 : 0;
  }

  function placeMarker(marker, w, opacity) {
    if (w) marker.position.set(w.home.x, 0.004, w.home.z);
    marker.userData.to = w ? opacity : 0;
  }

  function select(id) {
    if (id === selected) return;
    settle();
    const prev = byId.get(selected);
    if (prev) {
      const fromY = prev.group.position.y;
      const turn = Math.PI * 2;
      const fromR = (((prev.group.rotation.y - prev.baseRot) % turn) + turn) % turn + prev.baseRot;
      const toR = prev.baseRot + (fromR - prev.baseRot > Math.PI ? turn : 0);
      tween({
        duration: 500,
        update: (k) => {
          prev.group.position.y = fromY * (1 - k);
          prev.group.rotation.y = fromR + (toR - fromR) * k;
        },
        done: () => { prev.group.rotation.y = prev.baseRot; },
      });
    }
    selected = id && byId.has(id) ? id : null;
    const w = byId.get(selected);
    overlay.classList.toggle('has-selection', Boolean(w));
    for (const o of white) o.el.classList.toggle('is-selected', o === w);
    placeMarker(selectMarker, w, 0.5);
    setGlow();
    if (w) {
      const fromY = w.group.position.y;
      tween({ duration: 600, ease: easeOut, update: (k) => { w.group.position.y = fromY + (LIFT - fromY) * k; } });
      flyTo(focusPose(w));
    } else {
      touched = false;
      flyTo(homePose());
    }
  }

  function hover(id) {
    const next = id && byId.has(id) ? id : null;
    if (next === hovered) return;
    hovered = next;
    for (const o of white) o.el.classList.toggle('is-hot', o.id === hovered);
    placeMarker(hoverMarker, byId.get(hovered), hovered === selected ? 0 : 0.26);
    setGlow();
  }

  // Called when the panel opens, closes or the window changes: the free area
  // moved, so re-centre whatever the camera is looking at.
  function setInsets(next) {
    const before = JSON.stringify(insets);
    Object.assign(insets, { left: 0, right: 0, top: 0, bottom: 0 }, next);
    if (JSON.stringify(insets) === before) return;
    const w = byId.get(selected);
    if (w) setShift(focusPose(w).shift);
    else if (!touched && !flying) flyTo(homePose(), 500);
    else setShift(homePose().shift);
  }

  // ---- picking ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    const px = ev.clientX - r.left;
    const py = ev.clientY - r.top;
    ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickable, true)[0];
    if (hit) {
      let o = hit.object;
      while (o && !o.userData.id && o.parent) o = o.parent;
      if (o && o.userData.id) return o.userData.id;
    }
    // Missed the mesh: the detection boxes count as targets too.
    let best = null;
    let bestD = Infinity;
    for (const w of white) {
      const b = w.rect;
      if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) continue;
      const d = Math.hypot(px - (b.x + b.w / 2), py - (b.y + b.h / 2));
      if (d < bestD) {
        bestD = d;
        best = w.id;
      }
    }
    return hit ? null : best;
  }

  let down = null;
  canvas.addEventListener('pointerdown', (ev) => { down = { x: ev.clientX, y: ev.clientY }; });
  canvas.addEventListener('pointerup', (ev) => {
    if (!down) return;
    const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
    down = null;
    if (moved > 6) return;
    onSelect(pick(ev));
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse' || down) return;
    const id = pick(ev);
    canvas.classList.toggle('is-pointing', Boolean(id));
    if (id !== hovered) onHover(id);
  });
  canvas.addEventListener('pointerleave', () => {
    canvas.classList.remove('is-pointing');
    if (hovered) onHover(null);
  });

  // ---- the opening, then a detection sweep ----
  let intro = [];
  let scanTimers = [];

  function movePiece(group, to, { delay, hop }) {
    const from = group.position.clone();
    return tween({
      duration: hop ? 620 : 520,
      delay,
      update: (k) => {
        group.position.lerpVectors(from, to, k);
        group.position.y = Math.sin(Math.PI * k) * (hop ? 0.95 : 0.1);
      },
    });
  }

  function scan() {
    const order = [...white].sort((a, b) => a.rect.x - b.rect.x);
    order.forEach((w, i) => {
      scanTimers.push(setTimeout(() => w.el.classList.add('is-scan'), i * 80));
      scanTimers.push(setTimeout(() => w.el.classList.remove('is-scan'), i * 80 + 1300));
    });
  }

  // Jump to the end of the intro (used when the visitor acts before it finishes).
  function settle() {
    for (const t of intro) t.finish && t.finish();
    intro = [];
    for (const t of scanTimers) clearTimeout(t);
    scanTimers = [];
    for (const w of white) w.el.classList.remove('is-scan');
    overlay.classList.add('is-live');
  }

  function start() {
    resize();
    const home = homePose();
    setShift(home.shift, true);
    if (!playIntro) {
      camera.position.copy(home.pos);
      controls.target.copy(home.target);
      overlay.classList.add('is-live');
      return;
    }
    controls.target.copy(home.target);
    camera.position.setFromSphericalCoords(home.pos.distanceTo(home.target) * 1.45, rad(26), rad(-78)).add(home.target);
    flyTo(home, 3600, easeOut);
    let at = 650;
    for (const m of opening) {
      const group = m.id ? byId.get(m.id).group : black.get(m.black);
      intro.push(movePiece(group, squarePos(m.to), { delay: at, hop: m.hop }));
      at += 600;
    }
    intro.push(tween({ duration: 1, delay: at + 250, update() {}, done: () => { overlay.classList.add('is-live'); scan(); } }));
  }

  // ---- frame loop ----
  const corner = new THREE.Vector3();
  function updateBoxes() {
    const sel = byId.get(selected);
    for (const w of white) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const c of w.corners) {
        corner.copy(c).applyMatrix4(w.group.matrixWorld).project(camera);
        const x = (corner.x * 0.5 + 0.5) * width;
        const y = (-corner.y * 0.5 + 0.5) * height;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      const b = w.rect;
      b.x = x0 - 3; b.y = y0 - 3; b.w = x1 - x0 + 6; b.h = y1 - y0 + 6;
      w.el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0)`;
      w.el.style.width = `${b.w.toFixed(1)}px`;
      w.el.style.height = `${b.h.toFixed(1)}px`;
      w.el.classList.toggle('tag-below', b.y < 30);
    }
    const a = sel && anchor ? anchor() : null;
    if (a) {
      const b = sel.rect;
      const x = b.x + b.w;
      const y = b.y + Math.min(b.h / 2, 40);
      const midX = Math.min(a.x - 24, Math.max(x + 16, a.x - 70));
      leader.setAttribute('points', `${x},${y} ${midX},${a.y} ${a.x},${a.y}`);
      leaderSvg.style.opacity = a.x - x > 30 ? 1 : 0;
    } else {
      leaderSvg.style.opacity = 0;
    }
  }

  let lastConf = 0;
  function jitter(now) {
    if (now - lastConf < 450) return;
    lastConf = now;
    for (const w of white) {
      const c = w.el.classList;
      if (!(c.contains('is-hot') || c.contains('is-selected') || c.contains('is-scan'))) continue;
      const v = Math.min(0.99, Math.max(0.8, w.conf + (Math.random() - 0.5) * 0.03));
      w.confEl.textContent = v.toFixed(2);
    }
  }

  let active = true;
  let last = performance.now();
  let frames = 0;
  let fpsAt = last;
  function frame(now) {
    if (!active) return;
    requestAnimationFrame(frame);
    const elapsed = (now - last) / 1000;
    const dt = Math.min(0.05, elapsed);
    const smooth = (rate) => 1 - Math.exp(-rate * elapsed);
    last = now;
    stepTweens(now);

    if (flying) {
      camera.lookAt(controls.target);
    } else {
      controls.autoRotate = drifting;
      if (drifting) controls.autoRotateSpeed = 0.3 * Math.sin(((now - driftStart) / 1000) * ((Math.PI * 2) / 22));
      controls.update();
    }

    const sel = byId.get(selected);
    if (sel && !reducedMotion) sel.group.rotation.y += dt * 0.45;
    for (const w of white) {
      w.glow += (w.glowTo - w.glow) * smooth(8);
      w.material.emissiveIntensity = w.glow;
    }
    for (const m of [hoverMarker, selectMarker]) {
      const to = m.userData.to || 0;
      m.material.opacity += (to - m.material.opacity) * smooth(10);
    }

    view.x += (view.toX - view.x) * smooth(6);
    view.y += (view.toY - view.y) * smooth(6);
    camera.setViewOffset(width, height, view.x, view.y, width, height);

    renderer.render(scene, camera);
    updateBoxes();
    jitter(now);

    frames++;
    if (now - fpsAt >= 1000) {
      if (onFps) onFps(Math.round((frames * 1000) / (now - fpsAt)));
      frames = 0;
      fpsAt = now;
    }
  }

  window.addEventListener('resize', resize);
  start();
  requestAnimationFrame(frame);

  return {
    select,
    hover,
    setInsets,
    settle,
    setActive(on) {
      if (on === active) return;
      active = on;
      if (on) {
        last = performance.now();
        fpsAt = last;
        frames = 0;
        resize();
        requestAnimationFrame(frame);
      }
    },
  };
}

function buildBoard(renderer) {
  const group = new THREE.Group();

  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  const s = c.width / 8;
  for (let cy = 0; cy < 8; cy++) {
    for (let cx = 0; cx < 8; cx++) {
      const dark = (cx + (7 - cy)) % 2 === 0;
      const grad = g.createLinearGradient(cx * s, cy * s, (cx + 1) * s, (cy + 1) * s);
      if (dark) {
        grad.addColorStop(0, '#2b7bb8');
        grad.addColorStop(1, '#236aa0');
      } else {
        grad.addColorStop(0, '#b4d3f0');
        grad.addColorStop(1, '#9cc3e8');
      }
      g.fillStyle = grad;
      g.fillRect(cx * s, cy * s, s, s);
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ map, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
  );
  top.receiveShadow = true;
  group.add(top);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(8.9, 0.34, 8.9),
    new THREE.MeshPhysicalMaterial({ color: 0x06304d, roughness: 0.35, metalness: 0.25, clearcoat: 0.5 }),
  );
  frame.position.y = -0.172;
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  const inlay = new THREE.MeshStandardMaterial({ color: 0xffd100, emissive: 0xffd100, emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.3 });
  const half = 4.16;
  for (const [x, z, w, d] of [[0, -half, half * 2 + 0.04, 0.04], [0, half, half * 2 + 0.04, 0.04], [-half, 0, 0.04, half * 2], [half, 0, 0.04, half * 2]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d), inlay);
    bar.position.set(x, 0.001, z);
    group.add(bar);
  }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.3 }));
  floor.position.y = -0.345;
  floor.receiveShadow = true;
  group.add(floor);

  return group;
}
