/* Semillero — bocetos a mano sobre la hoja. Botón ✎, Apple Pencil o agitar el teléfono. */
'use strict';

const INK = { on: false, hoja: null, owner: null, tool: 'pen', color: 'ink', width: 4, path: null, pts: null, sc: 1, grow: 0, lift: null, erasing: false };
const INK_COLORS = ['ink', '#5A5F66', '#FFFFFF', '#D9443A', '#EE8A3A', '#F2C230', '#7BAF3A', '#2E6B47', '#2A9D8F', '#3FA3B5', '#4F7BD6', '#1F4E9C', '#7A5BC7', '#B03A6F', '#E58FB0', '#8B5A2B'];
const INK_NAMES = ['Tinta', 'Gris', 'Blanco', 'Rojo', 'Naranja', 'Amarillo', 'Verde hoja', 'Verde bosque', 'Verde azulado', 'Turquesa', 'Azul', 'Azul marino', 'Morado', 'Ciruela', 'Rosa', 'Café'];
const INK_WIDTHS = [{ w: 2, label: 'Fino' }, { w: 4, label: 'Medio' }, { w: 9, label: 'Grueso' }];
const INK_TOOLS = [{ t: 'pen', ic: 'pen', label: 'Pluma' }, { t: 'marker', ic: 'marker', label: 'Marcador' }, { t: 'eraser', ic: 'eraser', label: 'Borrador' }, { t: 'move', ic: 'hand', label: 'Mover trazos' }];
const SVGNS = 'http://www.w3.org/2000/svg';
const LIFT_MS = 450;

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
  return (s.c === 'ink' ? 'class="k-ink"' : 'style="stroke:' + esc(s.c) + '"') + ' stroke-width="' + s.w + '"' + (s.o ? ' stroke-opacity="' + s.o + '"' : '');
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
  if (owner === 'cap') { if (typeof saveDraft === 'function') saveDraft(); return; }
  if (!owner) return;
  const i = owner.indexOf('|');
  const obj = byId(owner.slice(0, i), owner.slice(i + 1));
  if (obj) persist(owner.slice(0, i), obj);
}

/* Dónde termina el texto de la hoja (sin contar el espacio extra para dibujar). */
function contentBottom(hoja) {
  let b = 0;
  Array.from(hoja.children).forEach((el) => { if (!el.classList.contains('ink-layer') && el.offsetHeight) b = Math.max(b, el.offsetTop + el.offsetHeight); });
  return b;
}

/* Ajusta la altura de la capa y de la hoja: al dibujar siempre queda espacio libre debajo del texto, y crece si te acercas al borde. */
function fitInk(hoja) {
  hoja = hoja || $('.hoja');
  if (!hoja) return;
  const svg = $('.ink-layer', hoja); const obj = inkObj(hoja.dataset.owner);
  if (!svg || !obj) return;
  const ink = obj.ink;
  const cw = hoja.clientWidth || 1;
  if (!INK.on && (!ink || !ink.strokes.length)) { svg.style.height = '0px'; hoja.style.minHeight = ''; return; }
  const sc = ink.w / cw;
  let vbH = ink.h;
  if (INK.on) {
    vbH = Math.max(ink.h + 300 * sc, (contentBottom(hoja) + window.innerHeight * 0.62) * sc, INK.grow || 0);
    INK.grow = vbH;
  }
  svg.setAttribute('viewBox', '0 0 ' + ink.w + ' ' + Math.max(1, vbH));
  svg.style.height = Math.round(vbH / sc) + 'px';
  hoja.style.minHeight = Math.round(vbH / sc) + 'px';
}
window.addEventListener('resize', () => fitInk());

function inkBarHtml() {
  const custom = (S.settings && S.settings.inkCustom) || '#C06C84';
  return '<div class="ink-bar" id="ink-bar" role="toolbar" aria-label="Dibujo">' +
    '<div class="ink-row">' + INK_TOOLS.map((x) => '<button type="button" class="ink-tool' + (INK.tool === x.t ? ' on' : '') + '" data-act="inkTool" data-t="' + x.t + '" aria-pressed="' + (INK.tool === x.t) + '" aria-label="' + x.label + '">' + icon(x.ic, 21) + '</button>').join('') +
    '<button type="button" class="ink-tool" data-act="inkUndo" aria-label="Deshacer">' + icon('undo', 21) + '</button>' +
    '<button type="button" class="ink-tool" data-act="inkClear" aria-label="Borrar todo el dibujo">' + icon('trash', 20) + '</button>' +
    '<button type="button" class="ink-done" data-act="inkToggle">Listo</button></div>' +
    '<div class="ink-row ink-colors">' + INK_COLORS.map((c, i) => '<button type="button" class="ink-dot' + (INK.color === c ? ' on' : '') + '" data-act="inkColor" data-c="' + c + '" aria-label="' + INK_NAMES[i] + '" style="' + (c === 'ink' ? '' : '--c:' + c) + '"></button>').join('') +
    '<label class="ink-dot custom' + (INK.color === custom && !INK_COLORS.includes(custom) ? ' on' : '') + '" aria-label="Otro color"><input type="color" value="' + custom + '" data-change="inkCustom"></label></div>' +
    '<div class="ink-row ink-widths"><span class="small muted">Grosor</span>' + INK_WIDTHS.map((x) => '<button type="button" class="ink-w' + (INK.width === x.w ? ' on' : '') + '" data-act="inkWidth" data-w="' + x.w + '" aria-label="' + x.label + '"><span style="width:' + (x.w + 4) + 'px;height:' + (x.w + 4) + 'px"></span></button>').join('') +
    '<span class="small muted ink-tip">Mantén un trazo y sacúdelo para moverlo</span></div></div>';
}
function refreshInkBar() { const b = $('#ink-bar'); if (b) b.outerHTML = inkBarHtml(); }

function inkStart() {
  const hoja = $('.hoja');
  if (!hoja || INK.on) return;
  const obj = inkObj(hoja.dataset.owner);
  if (!obj) return;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (!obj.ink || !obj.ink.w) obj.ink = { w: Math.round(hoja.clientWidth), h: 0, strokes: [] };
  INK.on = true; INK.hoja = hoja; INK.owner = hoja.dataset.owner; INK.grow = 0;
  hoja.classList.add('inking');
  document.body.classList.add('inking');
  document.body.insertAdjacentHTML('beforeend', inkBarHtml());
  fitInk(hoja);
  const fab = $('#ink-fab'); if (fab) fab.setAttribute('aria-pressed', 'true');
  /* Lleva la vista al espacio libre debajo del texto. */
  const r = hoja.getBoundingClientRect(); const target = window.scrollY + r.top + contentBottom(hoja) - window.innerHeight * 0.3;
  if (target > window.scrollY + 20) window.scrollTo({ top: target, behavior: 'smooth' });
}

function inkStop() {
  if (!INK.on) return;
  dropLift(true);
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

/* ---------- Geometría de trazos ---------- */
function strokeBox(s) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < s.p.length; i += 2) { x0 = Math.min(x0, s.p[i]); x1 = Math.max(x1, s.p[i]); y0 = Math.min(y0, s.p[i + 1]); y1 = Math.max(y1, s.p[i + 1]); }
  return { x0, y0, x1, y1 };
}
function distToStroke(s, x, y) {
  let best = Infinity; const p = s.p;
  for (let i = 0; i < p.length - 2; i += 2) {
    const ax = p[i], ay = p[i + 1], bx = p[i + 2], by = p[i + 3];
    const dx = bx - ax, dy = by - ay; const L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}
function strokeAt(ink, x, y, tol) {
  for (let i = ink.strokes.length - 1; i >= 0; i--) if (distToStroke(ink.strokes[i], x, y) <= tol + ink.strokes[i].w / 2) return i;
  return -1;
}
/* El trazo tocado y sus vecinos (los que se tocan o casi): el dibujo completo, no solo una raya. */
function strokeGroup(ink, idx) {
  const boxes = ink.strokes.map(strokeBox); const pad = 10;
  const near = (a, b) => !(a.x1 + pad < b.x0 || b.x1 + pad < a.x0 || a.y1 + pad < b.y0 || b.y1 + pad < a.y0);
  const seen = new Set([idx]); const queue = [idx];
  while (queue.length) {
    const i = queue.shift();
    boxes.forEach((b, j) => { if (!seen.has(j) && near(boxes[i], b)) { seen.add(j); queue.push(j); } });
  }
  return Array.from(seen);
}
function groupPaths(idxs) { const svg = $('.ink-layer', INK.hoja); return idxs.map((i) => svg.children[i]).filter(Boolean); }

/* ---------- Despegar y mover ---------- */
function beginLift(idxs, e, detached) {
  redrawInk();
  INK.lift = { idxs, sx: e.clientX, sy: e.clientY, lx: e.clientX, dirX: 0, flips: 0, travel: 0, state: detached ? 'moving' : 'lifted', dx: 0, dy: 0 };
  groupPaths(idxs).forEach((p) => p.classList.add(detached ? 'ink-moving' : 'ink-lifted'));
  if (navigator.vibrate) navigator.vibrate(detached ? [8, 30, 8] : 10);
  if (!detached) toast('Sacúdelo un poco para despegarlo');
}
function liftMove(e) {
  const L = INK.lift; const dxScr = e.clientX - L.lx;
  if (L.state === 'lifted') {
    if (Math.abs(dxScr) > 4) {
      const dir = Math.sign(dxScr);
      if (L.dirX && dir !== L.dirX) L.flips++;
      L.dirX = dir; L.travel += Math.abs(dxScr); L.lx = e.clientX;
    }
    if (L.flips >= 2 || Math.hypot(e.clientX - L.sx, e.clientY - L.sy) > 70) {
      L.state = 'moving'; L.sx = e.clientX; L.sy = e.clientY;
      groupPaths(L.idxs).forEach((p) => { p.classList.remove('ink-lifted'); p.classList.add('ink-moving'); });
      if (navigator.vibrate) navigator.vibrate([8, 30, 8]);
    }
    return;
  }
  L.dx = (e.clientX - L.sx) * INK.sc; L.dy = (e.clientY - L.sy) * INK.sc;
  groupPaths(L.idxs).forEach((p) => p.setAttribute('transform', 'translate(' + L.dx.toFixed(1) + ' ' + L.dy.toFixed(1) + ')'));
}
function dropLift(cancel) {
  const L = INK.lift; if (!L) return;
  INK.lift = null;
  const obj = inkObj(INK.owner);
  if (!cancel && L.state === 'moving' && (L.dx || L.dy) && obj) {
    L.idxs.forEach((i) => { const s = obj.ink.strokes[i]; s.p = s.p.map((v, k) => Math.round((v + (k % 2 ? L.dy : L.dx)) * 10) / 10); });
    obj.ink.strokes.forEach((s) => { for (let k = 0; k < s.p.length; k += 2) s.p[k] = Math.max(0, Math.min(obj.ink.w, s.p[k])); for (let k = 1; k < s.p.length; k += 2) s.p[k] = Math.max(0, s.p[k]); });
    recalcInkH(obj.ink); inkSave(INK.owner);
  }
  redrawInk();
}

function eraseAt(e) {
  const obj = inkObj(INK.owner); if (!obj || !obj.ink) return;
  const [x, y] = inkPoint(e);
  const i = strokeAt(obj.ink, x, y, 10 * INK.sc);
  if (i >= 0) { obj.ink.strokes.splice(i, 1); recalcInkH(obj.ink); inkSave(INK.owner); redrawInk(); }
}

/* ---------- Trazos ---------- */
function strokeBegin(e) {
  const obj = inkObj(INK.owner); const svg = $('.ink-layer', INK.hoja);
  if (!obj || !svg) return;
  INK.sc = obj.ink.w / (INK.hoja.clientWidth || 1);
  const [x, y] = inkPoint(e);
  if (INK.tool === 'eraser') { INK.erasing = true; eraseAt(e); return; }
  if (INK.tool === 'move') { const i = strokeAt(obj.ink, x, y, 14 * INK.sc); if (i >= 0) beginLift(strokeGroup(obj.ink, i), e, true); return; }
  INK.pts = [x, y]; INK.down = { x: e.clientX, y: e.clientY, t: Date.now() };
  INK.path = document.createElementNS(SVGNS, 'path');
  if (INK.color === 'ink') INK.path.setAttribute('class', 'k-ink'); else INK.path.style.stroke = INK.color;
  const marker = INK.tool === 'marker';
  INK.path.setAttribute('stroke-width', marker ? INK.width * 3 : INK.width);
  if (marker) INK.path.setAttribute('stroke-opacity', '0.38');
  svg.appendChild(INK.path);
  /* Mantener presionado sobre un trazo: se levanta para despegarlo. */
  clearTimeout(INK.pressTimer);
  const hit = strokeAt(obj.ink, x, y, 12 * INK.sc);
  if (hit >= 0) INK.pressTimer = setTimeout(() => {
    if (!INK.path || !INK.down || INK.pts.length > 12) return;
    INK.path.remove(); INK.path = null; INK.pts = null;
    beginLift(strokeGroup(obj.ink, hit), { clientX: INK.down.x, clientY: INK.down.y }, false);
  }, LIFT_MS);
  try { INK.hoja.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
}
function strokeMove(e) {
  if (INK.lift) { liftMove(e); return; }
  if (INK.erasing) { eraseAt(e); return; }
  if (!INK.path) return;
  if (INK.down && Math.hypot(e.clientX - INK.down.x, e.clientY - INK.down.y) > 8) clearTimeout(INK.pressTimer);
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  (evs.length ? evs : [e]).forEach((ev) => { const p = inkPoint(ev); INK.pts.push(p[0], p[1]); });
  INK.path.setAttribute('d', ptsToD(INK.pts.length === 2 ? INK.pts.concat([INK.pts[0] + 0.5, INK.pts[1] + 0.5]) : INK.pts));
}
function strokeEnd() {
  clearTimeout(INK.pressTimer); INK.down = null;
  if (INK.lift) { dropLift(false); return; }
  if (INK.erasing) { INK.erasing = false; fitInk(INK.hoja); return; }
  if (!INK.path) return;
  const obj = inkObj(INK.owner);
  let p = INK.pts;
  if (p.length === 2) p = p.concat([p[0] + 0.5, p[1] + 0.5]);
  const marker = INK.tool === 'marker';
  const st = { c: INK.color, w: marker ? INK.width * 3 : INK.width, p };
  if (marker) st.o = 0.38;
  obj.ink.strokes.push(st);
  for (let i = 1; i < p.length; i += 2) obj.ink.h = Math.max(obj.ink.h, Math.ceil(p[i] + st.w + 8));
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
document.addEventListener('pointermove', (e) => { if (INK.on && (INK.path || INK.lift || INK.erasing)) { e.preventDefault(); strokeMove(e); } }, { passive: false });
document.addEventListener('pointerup', () => { if (INK.on) strokeEnd(); });
document.addEventListener('pointercancel', () => { if (INK.on) { clearTimeout(INK.pressTimer); if (INK.lift) dropLift(true); else strokeEnd(); } });
document.addEventListener('touchmove', (e) => { if (INK.on && e.target.closest && e.target.closest('.hoja')) e.preventDefault(); }, { passive: false });

function redrawInk() {
  const hoja = INK.hoja || $('.hoja'); if (!hoja) return;
  const svg = $('.ink-layer', hoja); const obj = inkObj(hoja.dataset.owner);
  if (svg && obj) svg.innerHTML = strokesHtml(obj.ink);
  fitInk(hoja);
}

Object.assign(ACTIONS, {
  inkToggle() { ensureMotion(); if (INK.on) inkStop(); else inkStart(); },
  inkTool(el) { INK.tool = el.dataset.t; if (INK.tool === 'eraser' || INK.tool === 'move') { /* nada */ } refreshInkBar(); },
  inkColor(el) { INK.color = el.dataset.c; if (INK.tool !== 'marker') INK.tool = 'pen'; refreshInkBar(); },
  inkWidth(el) { INK.width = Number(el.dataset.w); if (INK.tool === 'eraser' || INK.tool === 'move') INK.tool = 'pen'; refreshInkBar(); },
  inkUndo() { const obj = inkObj(INK.owner); if (obj && obj.ink && obj.ink.strokes.length) { obj.ink.strokes.pop(); recalcInkH(obj.ink); inkSave(INK.owner); redrawInk(); } },
  inkClear() { const obj = inkObj(INK.owner); if (!obj || !obj.ink || !obj.ink.strokes.length) return; if (!confirm('¿Borrar todo el dibujo de esta hoja?')) return; obj.ink.strokes = []; obj.ink.h = 0; inkSave(INK.owner); redrawInk(); }
});
Object.assign(CHANGES, {
  inkCustom(el) { INK.color = el.value; if (INK.tool !== 'marker') INK.tool = 'pen'; if (S.settings) { S.settings.inkCustom = el.value; saveSettings(); } refreshInkBar(); }
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
    g.globalAlpha = st.o || 1;
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
