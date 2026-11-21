// The 3D scene: the board and its pieces, the camera, picking, the detection
// boxes drawn over the pieces that carry a section, and the idle behaviour
// (a slow drift, plus pop-ups that cycle through the sections).

import * as THREE from '../vendor/three.js';
import { OrbitControls, RoomEnvironment } from '../vendor/three.js';
import { buildPiece } from './pieces.js';
import { buildRoom, TABLE_TOP } from './room.js';
import { FILES, startPosition } from './chess.js';

const squarePos = (s) => new THREE.Vector3(FILES.indexOf(s[0]) - 3.5, 0, 3.5 - (Number(s[1]) - 1));
const rad = THREE.MathUtils.degToRad;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const LIFT = 0.42;
const KNIGHT_TURN = Math.PI / 4;
const MOBILE = 1000; // below this width the panel is a bottom sheet
const IDLE_RETURN = 7000; // ms without touching the camera before it goes home
const POPUP_EVERY = 2800; // ms between pop-ups while nobody is interacting

export function createBoard({ canvas, overlay, pieces, opening, reducedMotion, insets: firstInsets, anchor, onSelect, onHover, onFps }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03090f);
  scene.fog = new THREE.Fog(0x03090f, 45, 170);
  // Reflections for the pieces and board only; the room gets almost none of
  // this light, so it stays dark around the lit table.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const reflections = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = reflections;
  scene.environmentIntensity = 0.045;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.4, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;
  controls.minDistance = 4.5;
  controls.maxDistance = 46;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = 1.46;
  // Stay on White's side of the table; the sofa is on the other.
  controls.minAzimuthAngle = -1.75;
  controls.maxAzimuthAngle = 1.4;

  // ---- lights ----
  // One lamp over the table: a pool of light on the board that falls off
  // quickly, so the board is the brightest thing in the room.
  const key = new THREE.SpotLight(0xffe9c8, 3300, 80, 0.5, 0.85, 2);
  key.position.set(-6, 29, 8);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 6;
  key.shadow.camera.far = 60;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 5;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight(0x9fc4ea, 0x2a2018, 0.11));

  scene.add(buildRoom());
  scene.add(buildBoard(renderer, reflections));

  // ---- pieces: all 32, some of which carry a section ----
  const ivory = new THREE.MeshPhysicalMaterial({ color: 0xebe3d0, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.25, envMap: reflections, envMapIntensity: 0.3 });
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x123a60, roughness: 0.28, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.2, envMap: reflections, envMapIntensity: 0.55 });
  const gold = new THREE.Color(0xffd100);

  const playIntro = !reducedMotion && Boolean(opening);
  const sectionAt = new Map(pieces.map((p) => [p.from, p]));
  const men = new Map(); // start square -> man
  const tracked = []; // men that carry a section
  const byId = new Map();
  const pickable = [];

  for (const [start, { side, type }] of Object.entries(startPosition)) {
    const section = sectionAt.get(start);
    const base = side === 'white' ? ivory : navy;
    let material = base;
    if (section) {
      material = base.clone();
      material.emissive = gold.clone();
      material.emissiveIntensity = 0;
    }
    const group = buildPiece(type, material);
    const baseRot = (side === 'black' ? Math.PI : 0) + (type === 'knight' ? KNIGHT_TURN : 0);
    const man = { start, side, type, group, material, baseRot, home: squarePos(start) };
    if (section) {
      const local = new THREE.Box3().setFromObject(group);
      const s = group.scale.x;
      man.corners = [];
      for (const x of [local.min.x, local.max.x]) for (const y of [local.min.y, local.max.y]) for (const z of [local.min.z, local.max.z]) man.corners.push(new THREE.Vector3(x / s, y / s, z / s));
      Object.assign(man, { id: section.id, section, height: local.max.y, glow: 0, glowTo: 0, rect: { x: 0, y: 0, w: 0, h: 0 } });
      group.userData.id = section.id;
      tracked.push(man);
      byId.set(section.id, man);
    }
    group.rotation.y = baseRot;
    group.position.copy(man.home);
    scene.add(group);
    men.set(start, man);
    pickable.push(group);
  }
  // Where everything ends up once the opening has been played.
  for (const m of opening || []) men.get(m.from).home = squarePos(m.to);
  if (!playIntro) for (const man of men.values()) man.group.position.copy(man.home);

  // ---- square markers ----
  const markerGeo = new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2);
  const makeMarker = () => {
    const m = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xffd100, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.position.y = 0.006;
    scene.add(m);
    return m;
  };
  const hoverMarker = makeMarker();
  const selectMarker = makeMarker();

  // ---- detection boxes ----
  for (const man of tracked) {
    const p = man.section;
    const el = document.createElement('div');
    el.className = 'det';
    const label = document.createElement('span');
    label.className = 'det-label';
    const tag = document.createElement('span');
    tag.className = 'det-tag';
    const name = document.createElement('b');
    name.textContent = p.tag;
    const conf = document.createElement('i');
    conf.textContent = p.conf.toFixed(2);
    tag.append(name, ' ', conf);
    const more = document.createElement('span');
    more.className = 'det-more';
    more.textContent = p.teaser || p.meta || '';
    label.append(tag, more);
    el.append(label);
    overlay.append(el);
    man.el = el;
    man.labelEl = label;
    man.confEl = conf;
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
  let popup = null; // id of the piece the idle cycle is currently showing
  let nextPopup = Infinity;
  let touched = false; // has the visitor moved the camera themselves?
  let lastTouch = 0;
  let holding = false;
  let drifting = false;
  let flying = null;
  let live = false; // intro finished
  const view = { x: 0, y: 0, toX: 0, toY: 0 };

  const isMobile = () => width < MOBILE;

  const insets = { left: 0, right: 0, top: 0, bottom: 0, ...firstInsets };
  const probe = new THREE.PerspectiveCamera(camera.fov, 1, 0.1, 200);
  const fitPoints = [];
  for (const x of [-4.5, 4.5]) for (const z of [-4.5, 4.5]) fitPoints.push(new THREE.Vector3(x, -0.3, z));
  for (const x of [-3.5, 3.5]) fitPoints.push(new THREE.Vector3(x, 1.75, -3.5));

  // Back the camera off until the whole board fits the free part of the
  // screen, then shift the view so the board rests low in it, leaving the
  // room visible above.
  function homePose() {
    const mobile = isMobile();
    const target = new THREE.Vector3(0, 0, 0.2);
    const phi = rad(mobile ? 54 : 66);
    const theta = rad(mobile ? -16 : -24);
    const pad = mobile ? { top: 12, side: 8, bottom: 56 } : { top: height * 0.33, side: 60, bottom: 64 };
    const x0 = insets.left + pad.side;
    const x1 = width - pad.side;
    const y0 = insets.top + pad.top;
    const y1 = height - insets.bottom - pad.bottom;
    probe.aspect = width / height;
    probe.updateProjectionMatrix();
    const v = new THREE.Vector3();
    let radius = 12;
    let shift = { x: 0, y: 0 };
    for (; radius < controls.maxDistance - 1; radius += 0.5) {
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
      // centred sideways; on wide screens resting on the bottom of the free area
      shift = { x: (bx0 + bx1) / 2 - (x0 + x1) / 2, y: mobile ? (by0 + by1) / 2 - (y0 + y1) / 2 : by1 - y1 };
      if (bx1 - bx0 <= x1 - x0 && by1 - by0 <= y1 - y0) break;
    }
    const pos = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta).add(target);
    return { pos, target, shift };
  }

  function focusPose(man) {
    const target = man.home.clone();
    target.y = LIFT + man.height / 2;
    const offset = camera.position.clone().sub(controls.target);
    const current = new THREE.Spherical().setFromVector3(offset);
    const theta = THREE.MathUtils.clamp(current.theta, -0.75, 0.75);
    // Look a little more steeply at far pieces, so near ones don't block them.
    const far = THREE.MathUtils.clamp((2 - man.home.z) / 5.5, 0, 1);
    const pos = new THREE.Vector3().setFromSphericalCoords((isMobile() ? 9.5 : 7.8) + far * 0.8, rad(64 - far * 12), theta).add(target);
    // Centre the piece in whatever the panel and index leave free.
    const shift = { x: (insets.right - insets.left) / 2, y: (insets.bottom - insets.top) / 2 };
    return { pos, target, shift };
  }

  function setShift(shift, snap = false) {
    view.toX = shift.x;
    view.toY = shift.y;
    if (snap || reducedMotion) {
      view.x = shift.x;
      view.y = shift.y;
    }
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
    if (reducedMotion) flying = null;
  }

  let driftStart = 0;
  function startDrift() {
    drifting = true;
    driftStart = performance.now();
  }
  controls.addEventListener('start', () => {
    touched = true;
    holding = true;
    drifting = false;
    controls.autoRotate = false;
    lastTouch = performance.now();
  });
  controls.addEventListener('end', () => {
    holding = false;
    lastTouch = performance.now();
  });
  canvas.addEventListener('wheel', () => { lastTouch = performance.now(); }, { passive: true });

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

  // ---- selection, hover, pop-ups ----
  function refresh() {
    const hot = hovered || popup;
    for (const m of tracked) {
      const k = m.side === 'black' ? 0.55 : 1; // gold reads much stronger on the dark pieces
      m.glowTo = (m.id === selected ? 0.18 : m.id === hot ? 0.09 : 0) * k;
      m.el.classList.toggle('is-selected', m.id === selected);
      m.el.classList.toggle('is-hot', m.id === hovered);
      m.el.classList.toggle('is-popup', m.id === popup && !hovered);
    }
    const hotMan = byId.get(hot);
    if (hotMan) hoverMarker.position.set(hotMan.home.x, 0.006, hotMan.home.z);
    hoverMarker.userData.to = hotMan && hot !== selected ? 0.3 : 0;
    const sel = byId.get(selected);
    if (sel) selectMarker.position.set(sel.home.x, 0.006, sel.home.z);
    selectMarker.userData.to = sel ? 0.5 : 0;
    overlay.classList.toggle('has-selection', Boolean(sel));
  }

  function select(id) {
    if (id === selected) return;
    settle();
    const prev = byId.get(selected);
    if (prev) {
      const turn = Math.PI * 2;
      const fromY = prev.group.position.y;
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
    popup = null;
    nextPopup = performance.now() + POPUP_EVERY;
    const man = byId.get(selected);
    refresh();
    if (man) {
      const fromY = man.group.position.y;
      tween({ duration: 600, ease: easeOut, update: (k) => { man.group.position.y = fromY + (LIFT - fromY) * k; } });
      flyTo(focusPose(man));
    } else {
      touched = false;
      flyTo(homePose());
    }
  }

  function hover(id) {
    const next = id && byId.has(id) ? id : null;
    if (next === hovered) return;
    hovered = next;
    if (hovered) popup = null;
    nextPopup = performance.now() + POPUP_EVERY;
    refresh();
  }

  // While nobody is interacting, show one section's label at a time and give
  // its piece a small hop, so it is obvious the pieces can be opened.
  const whiteIds = tracked.filter((m) => m.side === 'white').map((m) => m.id);
  const blackIds = tracked.filter((m) => m.side === 'black').map((m) => m.id);
  const popupOrder = [];
  for (let i = 0; i < Math.max(whiteIds.length, blackIds.length); i++) {
    if (whiteIds[i]) popupOrder.push(whiteIds[i]);
    if (blackIds[i]) popupOrder.push(blackIds[i]);
  }
  let popupIndex = 0;
  function stepPopups(now) {
    if (!live || selected || hovered || holding || flying) {
      if (popup) { popup = null; refresh(); }
      if (nextPopup < now + 1200) nextPopup = now + 1200;
      return;
    }
    if (now < nextPopup) return;
    popup = popupOrder[popupIndex++ % popupOrder.length];
    nextPopup = now + POPUP_EVERY;
    refresh();
    const man = byId.get(popup);
    tween({ duration: 520, ease: (t) => t, update: (k) => { if (man.id !== selected) man.group.position.y = Math.sin(Math.PI * k) * 0.3; } });
  }

  // Called when the panel opens, closes or the window changes: the free area
  // moved, so re-centre whatever the camera is looking at.
  function setInsets(next) {
    const before = JSON.stringify(insets);
    Object.assign(insets, { left: 0, right: 0, top: 0, bottom: 0 }, next);
    if (JSON.stringify(insets) === before) return;
    const man = byId.get(selected);
    if (man) setShift(focusPose(man).shift);
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
    // Missed a section piece: the detection boxes count as targets too.
    let best = null;
    let bestD = Infinity;
    for (const m of tracked) {
      const b = m.rect;
      if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) continue;
      const d = Math.hypot(px - (b.x + b.w / 2), py - (b.y + b.h / 2));
      if (d < bestD) {
        bestD = d;
        best = m.id;
      }
    }
    return best;
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

  function movePiece(man, { delay, hop }) {
    const from = man.group.position.clone();
    return tween({
      duration: hop ? 620 : 520,
      delay,
      update: (k) => {
        man.group.position.lerpVectors(from, man.home, k);
        man.group.position.y = Math.sin(Math.PI * k) * (hop ? 0.95 : 0.1);
      },
    });
  }

  function goLive() {
    if (live) return;
    live = true;
    overlay.classList.add('is-live');
    nextPopup = performance.now() + 3000;
  }

  function scan() {
    const order = [...tracked].sort((a, b) => a.rect.x - b.rect.x);
    order.forEach((m, i) => {
      scanTimers.push(setTimeout(() => m.el.classList.add('is-scan'), i * 80));
      scanTimers.push(setTimeout(() => m.el.classList.remove('is-scan'), i * 80 + 1300));
    });
  }

  // Jump to the end of the intro (used when the visitor acts before it finishes).
  function settle() {
    for (const t of intro) t.finish && t.finish();
    intro = [];
    for (const t of scanTimers) clearTimeout(t);
    scanTimers = [];
    for (const m of tracked) m.el.classList.remove('is-scan');
    goLive();
  }

  function start() {
    resize();
    const home = homePose();
    setShift(home.shift, true);
    if (!playIntro) {
      camera.position.copy(home.pos);
      controls.target.copy(home.target);
      goLive();
      return;
    }
    // Establishing shot: low and wide across the room, then in to the board.
    controls.target.copy(home.target);
    camera.position.setFromSphericalCoords(Math.min(controls.maxDistance, home.pos.distanceTo(home.target) * 1.7), rad(80), rad(-62)).add(home.target);
    flyTo(home, 4200, easeInOut);
    let at = 1500;
    for (const m of opening) {
      intro.push(movePiece(men.get(m.from), { delay: at, hop: m.hop }));
      at += 600;
    }
    intro.push(tween({ duration: 1, delay: at + 250, update() {}, done: () => { goLive(); scan(); } }));
  }

  // ---- frame loop ----
  const corner = new THREE.Vector3();
  function updateBoxes() {
    for (const m of tracked) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const c of m.corners) {
        corner.copy(c).applyMatrix4(m.group.matrixWorld).project(camera);
        const x = (corner.x * 0.5 + 0.5) * width;
        const y = (-corner.y * 0.5 + 0.5) * height;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      const b = m.rect;
      b.x = x0 - 3; b.y = y0 - 3; b.w = x1 - x0 + 6; b.h = y1 - y0 + 6;
      m.el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0)`;
      m.el.style.width = `${b.w.toFixed(1)}px`;
      m.el.style.height = `${b.h.toFixed(1)}px`;
      m.el.classList.toggle('tag-below', b.y < 34);
      // Keep a visible label on screen: slide it sideways if it would run off an edge.
      const c = m.el.classList;
      if (c.contains('is-popup') || c.contains('is-hot') || c.contains('is-scan') || c.contains('is-selected')) {
        const lw = m.labelEl.offsetWidth;
        let dx = Math.min(0, width - 8 - (b.x - 2 + lw));
        dx = Math.max(dx, 8 - (b.x - 2));
        m.labelEl.style.transform = `translateX(${dx.toFixed(0)}px)`;
      }
    }
    const sel = byId.get(selected);
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
    for (const m of tracked) {
      const c = m.el.classList;
      if (!(c.contains('is-hot') || c.contains('is-selected') || c.contains('is-scan') || c.contains('is-popup'))) continue;
      const v = Math.min(0.99, Math.max(0.8, m.section.conf + (Math.random() - 0.5) * 0.03));
      m.confEl.textContent = v.toFixed(2);
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

    // Left alone for a while after being dragged: go back to the home view.
    if (touched && !selected && !holding && !flying && !reducedMotion && now - lastTouch > IDLE_RETURN) {
      touched = false;
      flyTo(homePose(), 1800);
    }

    if (flying) {
      camera.lookAt(controls.target);
    } else {
      controls.autoRotate = drifting;
      if (drifting) controls.autoRotateSpeed = 0.42 * Math.sin(((now - driftStart) / 1000) * ((Math.PI * 2) / 24));
      controls.update();
    }

    stepPopups(now);

    const sel = byId.get(selected);
    if (sel && !reducedMotion) sel.group.rotation.y += dt * 0.45;
    for (const m of tracked) {
      m.glow += (m.glowTo - m.glow) * smooth(8);
      m.material.emissiveIntensity = m.glow;
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
  // ?debug in the address exposes the camera, for positioning shots by hand.
  if (new URLSearchParams(location.search).has('debug')) window.__scene = { camera, controls, brighten: () => { scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.6)); scene.fog = null; }, hold: () => { touched = true; lastTouch = Infinity; drifting = false; } };
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

function buildBoard(renderer, reflections) {
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
    new THREE.BoxGeometry(8, 0.03, 8).translate(0, -0.015, 0),
    new THREE.MeshPhysicalMaterial({ map, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3, envMap: reflections, envMapIntensity: 0.25 }),
  );
  top.receiveShadow = true;
  group.add(top);

  const frameHeight = -TABLE_TOP - 0.03;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(8.9, frameHeight, 8.9),
    new THREE.MeshPhysicalMaterial({ color: 0x06304d, roughness: 0.35, metalness: 0.25, clearcoat: 0.5, envMap: reflections, envMapIntensity: 0.3 }),
  );
  frame.position.y = -0.03 - frameHeight / 2;
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  const inlay = new THREE.MeshStandardMaterial({ color: 0xffd100, emissive: 0xffd100, emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.3 });
  const half = 4.16;
  for (const [x, z, w, d] of [[0, -half, half * 2 + 0.04, 0.04], [0, half, half * 2 + 0.04, 0.04], [-half, 0, 0.04, half * 2], [half, 0, 0.04, half * 2]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), inlay);
    bar.position.set(x, -0.012, z);
    group.add(bar);
  }

  return group;
}
