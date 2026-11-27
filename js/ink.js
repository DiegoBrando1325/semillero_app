/* Semillero — bocetos a mano sobre la hoja. Botón ✎, Apple Pencil o agitar el teléfono. */
'use strict';

const INK = { on: false, hoja: null, owner: null, color: 'ink', width: 3, path: null, pts: null, sc: 1 };
const INK_COLORS = [
  { c: 'ink', label: 'Tinta' }, { c: '#C2410C', label: 'Terracota' }, { c: '#2E8B57', label: 'Verde' },
  { c: '#3C6FD8', label: 'Azul' }, { c: '#D4A017', label: 'Ocre' }
];
const INK_WIDTHS = [{ w: 2, label: 'Fino' }, { w: 4, label: 'Medio' }, { w: 9, label: 'Grueso' }];
const SVGNS = 'http://www.w3.org/2000/svg';

function ptsToD(p) {
  if (p.length < 4) return '';
  if (p.length === 4) return 'M' + p[0] + ' ' + p[1] + 'L' + p[2] + ' ' + p[3];
  let d = 'M' + p[0] + ' ' + p[1];
  for (let i = 2; i < p.length - 2; i += 2) {
    const mx = ((p[i] + p[i + 2]) / 2).toFixed(1); const my = ((p[i + 1] + p[i + 3]) / 2).toFixed(1);
    d += 'Q' + p[i] + ' ' + p[i + 1] + ' ' + mx + ' ' + my;
  }
  return d + 'L' + p[p.length - 2] + ' ' + p[p.length - 1];
}
function strokeAttrs(s) {
  return (s.c === 'ink' ? 'class="k-ink"' : 'style="stroke:' + esc(s.c) + '"') + ' stroke-width="' + s.w + '"';
}
function strokesHtml(ink) { return ((ink && ink.strokes) || []).map((s) => '<path d="' + ptsToD(s.p) + '" ' + strokeAttrs(s) + '/>').join(''); }

/* Capa de dibujo a tamaño de la hoja. */
function inkLayer(ink) {
  const w = (ink && ink.w) || 360; const h = Math.max(1, (ink && ink.h) || 1);
  return '<svg class="ink-layer" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMinYMin meet" aria-hidden="true">' + strokesHtml(ink) + '</svg>';
}

/* Miniatura del boceto (para las canicas). */
function inkMini(ink) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  ink.strokes.forEach((s) => { for (let i = 0; i < s.p.length; i += 2) { x0 = Math.min(x0, s.p[i]); x1 = Math.max(x1, s.p[i]); y0 = Math.min(y0, s.p[i + 1]); y1 = Math.max(y1, s.p[i + 1]); } });
  const pad = 14; const w = Math.max(20, x1 - x0) + pad * 2; const h = Math.max(20, y1 - y0) + pad * 2;
  return '<svg class="ink-mini" viewBox="' + (x0 - pad) + ' ' + (y0 - pad) + ' ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + strokesHtml(ink).replace(/stroke-width="(\d+(\.\d+)?)"/g, (m, n) => 'stroke-width="' + Math.max(2, n * Math.max(w, h) / 160) + '"') + '</svg>';
}

function inkObj(owner) {
  if (owner === 'cap') return UI.cap;
  const i = owner.indexOf('|');
  return byId(owner.slice(0, i), owner.slice(i + 1));
}
function inkSave(owner) {
  if (!owner || owner === 'cap') return;
  const i = owner.indexOf('|');
  const obj = byId(owner.slice(0, i), owner.slice(i + 1));
  if (obj) persist(owner.slice(0, i), obj);
}

/* Ajusta la altura de la capa y de la hoja para que el dibujo quepa. */
function fitInk(hoja) {
  hoja = hoja || $('.hoja');
  if (!hoja) return;
  const svg = $('.ink-layer', hoja); const obj = inkObj(hoja.dataset.owner);
  if (!svg || !obj) return;
  const ink = obj.ink;
  const cw = hoja.clientWidth || 1;
  if (!ink || !ink.strokes.length) {
    svg.style.height = '0px';
    hoja.style.minHeight = INK.on ? Math.round(window.innerHeight * 0.72) + 'px' : '';
    return;
  }
  const sc = ink.w / cw;
  let vbH = ink.h;
  if (INK.on) vbH = Math.max(ink.h, Math.round(window.innerHeight * 0.72 * sc), hoja.scrollHeight * sc);
  svg.setAttribute('viewBox', '0 0 ' + ink.w + ' ' + Math.max(1, vbH));
  svg.style.height = Math.round(vbH / sc) + 'px';
  hoja.style.minHeight = Math.round(vbH / sc) + 'px';
}
window.addEventListener('resize', () => fitInk());

function inkBarHtml() {
  return '<div class="ink-bar" id="ink-bar" role="toolbar" aria-label="Dibujo">' +
    INK_COLORS.map((x) => '<button type="button" class="ink-dot' + (INK.color === x.c ? ' on' : '') + '" data-act="inkColor" data-c="' + x.c + '" aria-label="' + x.label + '" style="' + (x.c === 'ink' ? '' : '--c:' + x.c) + '"></button>').join('') +
    '<span class="ink-sep"></span>' +
    INK_WIDTHS.map((x) => '<button type="button" class="ink-w' + (INK.width === x.w ? ' on' : '') + '" data-act="inkWidth" data-w="' + x.w + '" aria-label="' + x.label + '"><span style="height:' + Math.min(10, x.w + 1) + 'px"></span></button>').join('') +
    '<span class="ink-sep"></span>' +
    '<button type="button" class="ink-tool" data-act="inkUndo" aria-label="Deshacer"><svg class="ic" width="20" height="20" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg></button>' +
    '<button type="button" class="ink-tool" data-act="inkClear" aria-label="Borrar dibujo">' + icon('trash', 20) + '</button>' +
    '<button type="button" class="ink-done" data-act="inkToggle">Listo</button></div>';
}

function inkStart() {
  const hoja = $('.hoja');
  if (!hoja || INK.on) return;
  const obj = inkObj(hoja.dataset.owner);
  if (!obj) return;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (!obj.ink || !obj.ink.w) obj.ink = { w: Math.round(hoja.clientWidth), h: 0, strokes: [] };
  INK.on = true; INK.hoja = hoja; INK.owner = hoja.dataset.owner;
  hoja.classList.add('inking');
  document.body.classList.add('inking');
  document.body.insertAdjacentHTML('beforeend', inkBarHtml());
  fitInk(hoja);
  const fab = $('#ink-fab'); if (fab) fab.setAttribute('aria-pressed', 'true');
}

function inkStop() {
  if (!INK.on) return;
  INK.on = false;
  const bar = $('#ink-bar'); if (bar) bar.remove();
  document.body.classList.remove('inking');
  if (INK.hoja) { INK.hoja.classList.remove('inking'); fitInk(INK.hoja); }
  const fab = $('#ink-fab'); if (fab) fab.setAttribute('aria-pressed', 'false');
  INK.hoja = null;
}

function inkPoint(e) {
  const r = INK.hoja.getBoundingClientRect();
  return [Math.round((e.clientX - r.left) * INK.sc * 10) / 10, Math.round((e.clientY - r.top) * INK.sc * 10) / 10];
}

function strokeBegin(e) {
  const obj = inkObj(INK.owner); const svg = $('.ink-layer', INK.hoja);
  if (!obj || !svg) return;
  INK.sc = obj.ink.w / (INK.hoja.clientWidth || 1);
  INK.pts = inkPoint(e);
  INK.path = document.createElementNS(SVGNS, 'path');
  if (INK.color === 'ink') INK.path.setAttribute('class', 'k-ink'); else INK.path.style.stroke = INK.color;
  INK.path.setAttribute('stroke-width', INK.width);
  svg.appendChild(INK.path);
  try { INK.hoja.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
}
function strokeMove(e) {
  if (!INK.path) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  (evs.length ? evs : [e]).forEach((ev) => { const p = inkPoint(ev); INK.pts.push(p[0], p[1]); });
  INK.path.setAttribute('d', ptsToD(INK.pts.length === 2 ? INK.pts.concat([INK.pts[0] + 0.5, INK.pts[1] + 0.5]) : INK.pts));
}
function strokeEnd() {
  if (!INK.path) return;
  const obj = inkObj(INK.owner);
  let p = INK.pts;
  if (p.length === 2) p = p.concat([p[0] + 0.5, p[1] + 0.5]);
  obj.ink.strokes.push({ c: INK.color, w: INK.width, p });
  for (let i = 1; i < p.length; i += 2) obj.ink.h = Math.max(obj.ink.h, Math.ceil(p[i] + INK.width + 8));
  INK.path.setAttribute('d', ptsToD(p));
  INK.path = null; INK.pts = null;
  inkSave(INK.owner);
  fitInk(INK.hoja);
}

document.addEventListener('pointerdown', (e) => {
  const hoja = e.target.closest && e.target.closest('.hoja');
  if (!hoja) return;
  if (!INK.on && e.pointerType === 'pen') inkStart(); /* Apple Pencil: dibuja directo */
  if (!INK.on) return;
  e.preventDefault();
  strokeBegin(e);
}, { passive: false });
document.addEventListener('pointermove', (e) => { if (INK.on && INK.path) { e.preventDefault(); strokeMove(e); } }, { passive: false });
document.addEventListener('pointerup', () => { if (INK.on) strokeEnd(); });
document.addEventListener('pointercancel', () => { if (INK.on) strokeEnd(); });
document.addEventListener('touchmove', (e) => { if (INK.on && e.target.closest && e.target.closest('.hoja')) e.preventDefault(); }, { passive: false });

function redrawInk() {
  const hoja = INK.hoja || $('.hoja'); if (!hoja) return;
  const svg = $('.ink-layer', hoja); const obj = inkObj(hoja.dataset.owner);
  if (svg && obj) svg.innerHTML = strokesHtml(obj.ink);
  fitInk(hoja);
}

Object.assign(ACTIONS, {
  inkToggle() { ensureMotion(); if (INK.on) inkStop(); else inkStart(); },
  inkColor(el) { INK.color = el.dataset.c; $$('.ink-dot').forEach((b) => b.classList.toggle('on', b === el)); },
  inkWidth(el) { INK.width = Number(el.dataset.w); $$('.ink-w').forEach((b) => b.classList.toggle('on', b === el)); },
  inkUndo() { const obj = inkObj(INK.owner); if (obj && obj.ink && obj.ink.strokes.length) { obj.ink.strokes.pop(); recalcInkH(obj.ink); inkSave(INK.owner); redrawInk(); } },
  inkClear() { const obj = inkObj(INK.owner); if (!obj || !obj.ink || !obj.ink.strokes.length) return; if (!confirm('¿Borrar todo el dibujo de esta hoja?')) return; obj.ink.strokes = []; obj.ink.h = 0; inkSave(INK.owner); redrawInk(); }
});

function recalcInkH(ink) {
  ink.h = 0;
  ink.strokes.forEach((s) => { for (let i = 1; i < s.p.length; i += 2) ink.h = Math.max(ink.h, Math.ceil(s.p[i] + s.w + 8)); });
}

/* Convierte el boceto en imagen (para anclarlo como foto a otra idea). */
function inkToPng(ink) {
  if (!ink || !ink.strokes.length) return null;
  const c = document.createElement('canvas');
  const s = 2;
  c.width = Math.round(ink.w * s); c.height = Math.round(Math.max(ink.h, 40) * s);
  const g = c.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height);
  g.lineCap = 'round'; g.lineJoin = 'round';
  ink.strokes.forEach((st) => {
    g.strokeStyle = st.c === 'ink' ? '#17191C' : st.c; g.lineWidth = st.w * s;
    g.stroke(new Path2D(ptsToD(st.p.map((v) => v * s))));
  });
  return c.toDataURL('image/png');
}

/* ---------- Agitar el teléfono para dibujar ---------- */
let motionOn = false; let lastShake = 0; let shakeHits = []; let lastAcc = null;
function onMotion(e) {
  const a = e.accelerationIncludingGravity || e.acceleration;
  if (!a || a.x == null) return;
  if (lastAcc) {
    const d = Math.abs(a.x - lastAcc.x) + Math.abs(a.y - lastAcc.y) + Math.abs(a.z - lastAcc.z);
    const now = Date.now();
    if (d > 28) { shakeHits = shakeHits.filter((t) => now - t < 700); shakeHits.push(now); }
    if (shakeHits.length >= 3 && now - lastShake > 1500) { lastShake = now; shakeHits = []; onShake(); }
  }
  lastAcc = { x: a.x, y: a.y, z: a.z };
}
function onShake() {
  if (S.settings && S.settings.shake === false) return;
  if (INK.on) { inkStop(); toast('Dibujo guardado'); return; }
  if ($('.hoja')) { inkStart(); toast('Modo dibujo: raya la hoja'); }
}
async function ensureMotion() {
  if (motionOn || typeof DeviceMotionEvent === 'undefined') return motionOn;
  try {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      const r = await DeviceMotionEvent.requestPermission();
      if (r !== 'granted') return false;
    }
    window.addEventListener('devicemotion', onMotion);
    motionOn = true;
    if (S.settings && !S.settings.shakeGranted) { S.settings.shakeGranted = true; saveSettings(); }
  } catch (e) { /* el navegador no lo permite fuera de un toque */ }
  return motionOn;
}
/* Si ya diste permiso antes, lo reactivamos con el primer toque de cada sesión. */
document.addEventListener('touchend', function once() {
  document.removeEventListener('touchend', once);
  if (S.settings && S.settings.shakeGranted && S.settings.shake !== false) ensureMotion();
});
if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission !== 'function') ensureMotion();
