// Page logic: the index, the side panel, the plain page and the address-bar
// routing. The 3D board is loaded separately so the page still works without it.

import { person, groups, pieces, opening } from './content.js';
import { startPosition } from './chess.js';

const $ = (sel, root = document) => root.querySelector(sel);

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c);
  return node;
}

// Chess symbols for the index; the trailing selector keeps them as text, not emoji.
const GLYPH = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};
const pieceOf = (p) => startPosition[p.from];
const glyph = (p) => `${GLYPH[pieceOf(p).side][pieceOf(p).type]}\uFE0E`;
const byId = new Map(pieces.map((p) => [p.id, p]));
const ordered = groups.flatMap((g) => pieces.filter((p) => p.group === g));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth < 1000;

const indexNav = $('#index');
const panel = $('#panel');
const plain = $('#plain');
const hint = $('#hint');
const demo = $('#demo');
const zoom = $('#zoom');

let board = null;
let selected = null;
let anchorAt = null;
let anchorUntil = 0;
const remeasure = () => { anchorAt = null; anchorUntil = performance.now() + 800; };

// ---------- shared content blocks ----------

const external = (href) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {});

function whenWhere(p) {
  const bits = [p.when, p.where].filter(Boolean).join(', ');
  return bits ? el('p', { class: 'when', text: bits }) : null;
}

function photoBlock(p) {
  if (!p.photo) return null;
  return el('figure', { class: 'photo' },
    el('img', { src: p.photo.src, alt: p.photo.alt, width: 900, height: 720 }),
    el('span', { class: 'facebox', 'aria-hidden': 'true' },
      el('span', { class: 'det-tag' }, el('b', { text: p.photo.tag }), ' ', el('i', { text: p.photo.conf.toFixed(2) }))));
}

// Screenshots and clips. Images open larger when clicked.
function mediaBlock(p) {
  if (!p.media) return null;
  const images = p.media.filter((m) => m.type !== 'video');
  return el('div', { class: 'media' }, p.media.map((m) => {
    if (m.type === 'video') {
      const video = el('video', {
        src: m.src, poster: m.poster, width: m.w, height: m.h, 'aria-label': m.alt,
        loop: true, playsinline: true, preload: 'metadata', controls: reducedMotion,
      });
      video.muted = true;
      if (!reducedMotion) video.autoplay = true;
      return el('figure', { class: 'shot shot-wide' }, video, el('figcaption', { text: m.caption }));
    }
    return el('figure', { class: m.wide ? 'shot shot-wide' : 'shot' },
      el('button', { type: 'button', class: 'shot-open', 'aria-label': `Enlarge: ${m.caption}`, onclick: () => openZoom(images, images.indexOf(m)) },
        el('img', { src: m.src, alt: m.alt, width: m.w, height: m.h, loading: 'lazy', decoding: 'async' })),
      el('figcaption', { text: m.caption }));
  }));
}

function contentBlocks(p) {
  const out = [];
  if (p.meta) out.push(el('p', { class: 'meta', text: p.meta }));
  const line = whenWhere(p);
  if (line) out.push(line);
  if (p.note) out.push(el('p', { class: 'note', text: p.note }));
  for (const text of p.body || []) out.push(el('p', { text }));
  const media = mediaBlock(p);
  if (media) out.push(media);
  for (const s of p.sections || []) {
    out.push(el('section', { class: 'sub' },
      el('h3', { text: s.title }),
      s.meta && el('p', { class: 'meta', text: s.meta }),
      s.when && el('p', { class: 'when', text: s.when }),
      s.bullets && el('ul', {}, s.bullets.map((b) => el('li', { text: b })))));
  }
  if (p.bullets) out.push(el('ul', {}, p.bullets.map((b) => el('li', { text: b }))));
  if (p.stack) out.push(el('p', { class: 'stack', text: `Built with ${p.stack}` }));
  if (p.demo && !isMobile()) out.push(el('p', {}, el('button', { class: 'button', type: 'button', text: p.demo.label, onclick: () => openDemo(p) })));
  if (p.links) out.push(el('ul', { class: 'linklist' }, p.links.map((l) => el('li', {}, el('a', { href: l.href, text: l.label, ...external(l.href) })))));
  return out;
}

// ---------- index ----------

function buildIndex() {
  for (const g of groups) {
    indexNav.append(
      el('div', { class: 'group' },
        el('h2', { text: g }),
        el('ul', {}, pieces.filter((p) => p.group === g).map((p) =>
          el('li', {},
            el('a', {
              href: `#${p.id}`,
              'data-id': p.id,
              onmouseenter: () => setHover(p.id),
              onmouseleave: () => setHover(null),
              onfocus: () => setHover(p.id),
              onblur: () => setHover(null),
            }, el('span', { class: 'glyph', 'aria-hidden': 'true', text: glyph(p) }), p.tag))))),
    );
  }
}

function setHover(id) {
  for (const a of indexNav.querySelectorAll('a')) a.classList.toggle('is-hot', a.dataset.id === id);
  if (board) board.hover(id);
}

// ---------- panel ----------

function renderPanel(p) {
  const i = ordered.indexOf(p);
  const prev = ordered[(i - 1 + ordered.length) % ordered.length];
  const next = ordered[(i + 1) % ordered.length];
  panel.replaceChildren(
    el('header', { class: 'panel-head' },
      el('h2', { id: 'panel-title', text: p.title }),
      el('span', { class: 'conf', 'aria-hidden': 'true', text: p.conf.toFixed(2) }),
      el('a', { class: 'close', href: '#', 'aria-label': 'Close', text: '×', onclick: (e) => { e.preventDefault(); go(null); } })),
    el('div', { class: 'panel-body' },
      photoBlock(p),
      el('p', { class: 'kind', text: `${p.group}, on the ${pieceOf(p).side} ${pieceOf(p).type}` }),
      contentBlocks(p)),
    el('footer', { class: 'panel-foot' },
      el('a', { href: `#${prev.id}`, class: 'step' }, el('small', { text: 'Previous' }), prev.tag),
      el('a', { href: `#${next.id}`, class: 'step step-next' }, el('small', { text: 'Next' }), next.tag)),
  );
  panel.scrollTop = 0;
}

function openDemo(p) {
  $('#demo-title').textContent = p.title;
  $('#demo-frame').src = p.demo.src;
  $('#demo-tab').href = p.demo.src;
  demo.showModal();
  syncActive();
}
demo.addEventListener('close', () => { $('#demo-frame').src = 'about:blank'; });
$('#demo-close').addEventListener('click', () => demo.close());

let zoomSet = [];
let zoomAt = 0;
function showZoom(i) {
  zoomAt = (i + zoomSet.length) % zoomSet.length;
  const m = zoomSet[zoomAt];
  const img = $('#zoom-img');
  img.src = m.src;
  img.alt = m.alt;
  $('#zoom-caption').textContent = m.caption;
  $('#zoom-count').textContent = zoomSet.length > 1 ? `${zoomAt + 1} of ${zoomSet.length}` : '';
  $('#zoom-prev').hidden = $('#zoom-next').hidden = zoomSet.length < 2;
}
function openZoom(images, i) {
  zoomSet = images;
  showZoom(i);
  zoom.showModal();
  syncActive();
}
$('#zoom-prev').addEventListener('click', () => showZoom(zoomAt - 1));
$('#zoom-next').addEventListener('click', () => showZoom(zoomAt + 1));
$('#zoom-close').addEventListener('click', () => zoom.close());
zoom.addEventListener('click', (e) => { if (e.target === zoom) zoom.close(); });
zoom.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') showZoom(zoomAt - 1);
  if (e.key === 'ArrowRight') showZoom(zoomAt + 1);
});

// The 3D scene stops drawing while a dialog covers it.
const dialogOpen = () => demo.open || zoom.open;
const syncActive = () => { if (board) board.setActive(document.body.dataset.mode === 'board' && !dialogOpen()); };
for (const d of [demo, zoom]) d.addEventListener('close', syncActive);

// ---------- plain page ----------

let plainBuilt = false;
function buildPlain() {
  if (plainBuilt) return;
  plainBuilt = true;
  const body = $('#plain-body');
  for (const g of groups) {
    body.append(
      el('section', { class: 'plain-group' },
        el('h2', { text: g }),
        pieces.filter((p) => p.group === g).map((p) =>
          el('article', { id: `plain-${p.id}` }, el('h3', { text: p.title }), contentBlocks(p)))),
    );
  }
}

// ---------- state ----------

function currentInsets() {
  const open = Boolean(selected);
  if (isMobile()) {
    const top = $('.links').getBoundingClientRect().bottom;
    return { top, bottom: open ? panel.offsetHeight + 8 : indexNav.offsetHeight };
  }
  return { left: indexNav.offsetLeft + indexNav.offsetWidth, right: open ? panel.offsetWidth + 24 : 0 };
}

function updateInsets() {
  if (board) board.setInsets(currentInsets());
}

function show(id, { focus = false } = {}) {
  const p = byId.get(id) || null;
  const was = selected;
  selected = p ? p.id : null;
  for (const a of indexNav.querySelectorAll('a')) {
    if (a.dataset.id === selected) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  }
  if (p) {
    renderPanel(p);
    hint.classList.add('is-done');
  }
  remeasure();
  panel.classList.toggle('is-open', Boolean(p));
  panel.inert = !p;
  document.body.classList.toggle('has-panel', Boolean(p));
  if (board) board.select(selected);
  requestAnimationFrame(updateInsets);
  if (p && focus) panel.focus({ preventScroll: true });
  if (!p && was && panel.contains(document.activeElement)) {
    const back = indexNav.querySelector(`a[data-id="${was}"]`);
    if (back) back.focus({ preventScroll: true });
  }
}

function setMode(mode) {
  document.body.dataset.mode = mode;
  if (mode === 'plain') buildPlain();
  plain.hidden = mode !== 'plain';
  syncActive();
  if (mode === 'plain') show(null);
}

// The address bar drives everything: #plain, #<piece id>, or nothing.
function route({ focus = false } = {}) {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (!board || hash === 'plain' || hash.startsWith('plain-')) {
    setMode('plain');
    const target = hash.startsWith('plain-') ? document.getElementById(hash) : byId.has(hash) ? document.getElementById(`plain-${hash}`) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
    return;
  }
  setMode('board');
  window.scrollTo(0, 0);
  show(byId.has(hash) ? hash : null, { focus });
}

function go(id) {
  const url = id ? `#${id}` : location.pathname + location.search;
  if ((location.hash.slice(1) || null) === id) return;
  history.pushState(null, '', url);
  route();
}

window.addEventListener('hashchange', () => route({ focus: true }));
window.addEventListener('popstate', () => route());
window.addEventListener('resize', () => { remeasure(); requestAnimationFrame(updateInsets); });
window.addEventListener('keydown', (e) => {
  if (dialogOpen() || !selected || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') go(null);
  const i = ordered.indexOf(byId.get(selected));
  if (e.key === 'ArrowRight') go(ordered[(i + 1) % ordered.length].id);
  if (e.key === 'ArrowLeft') go(ordered[(i - 1 + ordered.length) % ordered.length].id);
});

// ---------- start ----------

buildIndex();
$('#name').textContent = person.name;
$('#year').textContent = new Date().getFullYear();
$('#tracked').textContent = `${pieces.length} pieces tracked`;

try {
  const { createBoard } = await import('./board.js');
  board = createBoard({
    canvas: $('#scene'),
    overlay: $('#overlay'),
    pieces,
    opening,
    reducedMotion,
    insets: currentInsets(),
    anchor: () => {
      if (!selected || isMobile()) return null;
      // Measured only while the panel is sliding in; after that it does not move.
      if (!anchorAt || performance.now() < anchorUntil) {
        const r = panel.getBoundingClientRect();
        anchorAt = { x: r.left, y: r.top + 24 };
      }
      return anchorAt;
    },
    onSelect: (id) => go(id),
    onHover: (id) => setHover(id),
    onFps: (fps) => { $('#fps').textContent = `${fps} fps`; },
  });
  document.body.classList.add('has-board');
} catch (err) {
  // No WebGL (or the 3D code failed to load): the plain page has everything.
  console.warn('3D board unavailable, showing the plain page.', err);
  document.body.classList.add('no-board');
}

route();
