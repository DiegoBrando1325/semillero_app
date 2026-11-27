/* Semillero — el árbol del mes y el bosque.
   Pensamientos = hojas de color (temperatura) · Poemas = lianas con una flor · Terapia = raíces.
   El dibujo es determinista: el mismo mes siempre tiene la misma forma; crece al escribir. */
'use strict';

const TREE_W = 354, TREE_H = 440, TREE_GROUND = 368;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function treeGeometry(y, m, nThoughts, nPoems) {
  const f = Math.min(1, (nThoughts + nPoems + 2) / 14);
  const ERX = 108 + 50 * f, ERY = 72 + 32 * f;
  const ECY = 150 + (1 - f) * 46;
  return { f, ECX: 177, ECY, ERX, ERY, rand: rng((y * 12 + m + 1) * 7919) };
}

/* Posición por defecto de la hoja i (orden de fecha): en arco de izquierda a derecha; si hay muchas, en espiral. */
function defaultLeafPos(i, n, g) {
  if (n <= 18) {
    const ring = i % 2 === 0 ? 0.78 : 0.48;
    const ang = (198 + (n > 1 ? i / (n - 1) : 0.5) * 144) * Math.PI / 180;
    return { x: g.ECX + Math.cos(ang) * g.ERX * ring, y: g.ECY + Math.sin(ang) * g.ERY * ring + (ring < 0.6 ? 18 : 0) };
  }
  const r = Math.sqrt((i + 0.5) / n) * 0.86; const a = i * 2.39996;
  return { x: g.ECX + Math.cos(a) * g.ERX * r, y: g.ECY + Math.sin(a) * g.ERY * r };
}

function clampToCanopy(p, g) {
  const dx = (p.x - g.ECX) / (g.ERX * 0.92), dy = (p.y - g.ECY) / (g.ERY * 0.92); const d = Math.hypot(dx, dy);
  if (d <= 1) return p;
  return { x: g.ECX + dx / d * g.ERX * 0.92, y: g.ECY + dy / d * g.ERY * 0.92 };
}

function buildTree(y, m) {
  const month = S.journal.filter((e) => inMonth(e, y, m)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const thoughts = month.filter((e) => e.kind === 'pensamiento');
  const poems = month.filter((e) => e.kind === 'poema');
  const roots = month.filter((e) => e.kind === 'terapia');
  const g = treeGeometry(y, m, thoughts.length, poems.length); const R = g.rand;
  const CX = g.ECX, GR = TREE_GROUND, OUT = '#3B5E2A';
  const s = [];
  s.push('<defs><linearGradient id="t-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F2E4"/><stop offset="1" stop-color="#E4EAD0"/></linearGradient>' +
    '<linearGradient id="t-bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7A5233"/><stop offset=".45" stop-color="#A9764A"/><stop offset="1" stop-color="#6B4529"/></linearGradient>' +
    '<linearGradient id="t-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8C3A0"/><stop offset="1" stop-color="#C8AF89"/></linearGradient></defs>');
  s.push('<rect width="' + TREE_W + '" height="' + TREE_H + '" fill="url(#t-sky)"/>');
  [[20, 210, 70], [330, 190, 80], [60, 120, 50], [300, 90, 46]].forEach(([x, yy, r]) => s.push('<circle cx="' + x + '" cy="' + yy + '" r="' + r + '" fill="#DCE4C6" opacity=".7"/>'));
  s.push('<rect x="0" y="' + (GR + 8) + '" width="' + TREE_W + '" height="' + (TREE_H - GR) + '" fill="url(#t-soil)"/>');
  const items = [];
  /* raíces: temas de terapia (sólida = hablado, punteada = pendiente) */
  roots.forEach((e, i) => {
    const side = i % 2 === 0 ? -1 : 1; const ex = CX + side * (46 + Math.min(i, 6) * 16); const ey = GR + 36 + (i % 4) * 7;
    const done = e.status === 'hablado';
    s.push('<path d="M' + (CX + side * 14) + ' ' + (GR + 6) + ' C' + (CX + side * 30) + ' ' + (GR + 20) + ' ' + (ex - side * 20) + ' ' + (ey - 14) + ' ' + ex + ' ' + ey + '" stroke="#7A5233" stroke-width="' + (done ? 4 : 2.5) + '" fill="none" stroke-linecap="round"' + (done ? '' : ' stroke-dasharray="4 5"') + '/>');
    s.push('<circle cx="' + ex + '" cy="' + ey + '" r="5" fill="' + (done ? '#7A5233' : '#F4EBDD') + '" stroke="#4A301C" stroke-width="1.6"/>');
    items.push({ e, kind: 'raiz', x: ex, y: ey });
  });
  /* pasto */
  s.push('<path d="M0 ' + (GR + 10) + ' Q' + TREE_W / 2 + ' ' + (GR - 6) + ' ' + TREE_W + ' ' + (GR + 10) + ' L' + TREE_W + ' ' + (GR + 16) + ' L0 ' + (GR + 16) + 'Z" fill="#9CB86A" stroke="' + OUT + '" stroke-width="1.2"/>');
  for (let x = 6; x < TREE_W; x += 11) { const h = 6 + R() * 7; s.push('<path d="M' + x + ' ' + (GR + 12) + ' q' + (R() * 6 - 3).toFixed(1) + ' ' + (-h / 2).toFixed(1) + ' ' + (R() * 6 - 2).toFixed(1) + ' ' + (-h).toFixed(1) + '" stroke="#7FA052" stroke-width="1.6" fill="none" stroke-linecap="round"/>'); }
  /* tronco y ramas */
  const top = g.ECY + g.ERY * 0.82; const tw = 10 + 8 * g.f;
  s.push('<path d="M' + (CX - tw - 18) + ' ' + (GR + 12) + ' C' + (CX - tw - 4) + ' ' + (GR - 30) + ' ' + (CX - tw) + ' ' + (top + 60) + ' ' + (CX - tw + 4) + ' ' + top + ' L' + (CX + tw - 4) + ' ' + top + ' C' + (CX + tw) + ' ' + (top + 60) + ' ' + (CX + tw + 4) + ' ' + (GR - 30) + ' ' + (CX + tw + 20) + ' ' + (GR + 12) + ' Z" fill="url(#t-bark)" stroke="#4A301C" stroke-width="2.5" stroke-linejoin="round"/>');
  [[GR - 40, -4], [GR - 70, 5], [GR - 95, -2]].forEach(([yy, dx]) => { if (yy > top + 8) s.push('<path d="M' + (CX + dx) + ' ' + yy + ' q-2 -9 1 -18" stroke="#5A3A22" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".7"/>'); });
  [[-0.62, 0.45], [-0.3, 0.1], [0.62, 0.42], [0.3, 0.05], [0.02, -0.2]].forEach(([fx, fy], k) => {
    const x1 = CX + fx * g.ERX, y1 = g.ECY + fy * g.ERY; const w = 10 - k;
    const d = 'M' + CX + ' ' + (top + 12) + ' Q' + ((CX + x1) / 2).toFixed(0) + ' ' + (Math.min(top, y1) + 18).toFixed(0) + ' ' + x1.toFixed(0) + ' ' + y1.toFixed(0);
    s.push('<path d="' + d + '" stroke="#4A301C" stroke-width="' + (w + 4) + '" fill="none" stroke-linecap="round"/><path d="' + d + '" stroke="#94643C" stroke-width="' + w + '" fill="none" stroke-linecap="round"/>');
  });
  /* copa: círculos con un solo contorno */
  const blobs = [];
  const nb = 30 + Math.round(18 * g.f);
  for (let k = 0; k < nb; k++) { const a = R() * Math.PI * 2; const rr = Math.sqrt(R()) * 0.82; blobs.push([g.ECX + Math.cos(a) * g.ERX * rr, g.ECY + Math.sin(a) * g.ERY * rr, 22 + R() * (14 + 6 * g.f)]); }
  s.push(blobs.map(([x, yy, r]) => '<circle cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="' + (r + 3).toFixed(1) + '" fill="' + OUT + '"/>').join(''));
  s.push('<ellipse cx="' + g.ECX + '" cy="' + (g.ECY + 6) + '" rx="' + (g.ERX * 0.86).toFixed(0) + '" ry="' + (g.ERY * 0.84).toFixed(0) + '" fill="#5E9B3F"/>');
  s.push(blobs.map(([x, yy, r]) => '<circle cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#5E9B3F"/>').join(''));
  s.push(blobs.filter((b) => b[1] < g.ECY + 30).map(([x, yy, r]) => '<circle cx="' + (x - r * 0.25).toFixed(1) + '" cy="' + (yy - r * 0.3).toFixed(1) + '" r="' + (r * 0.6).toFixed(1) + '" fill="#79B552" opacity=".85"/>').join(''));
  s.push(blobs.filter((b) => b[1] > g.ECY + 20).map(([x, yy, r]) => '<circle cx="' + x.toFixed(1) + '" cy="' + (yy + r * 0.35).toFixed(1) + '" r="' + (r * 0.55).toFixed(1) + '" fill="#4E8636" opacity=".8"/>').join(''));
  /* hojitas verdes repartidas por toda la copa (y algunas en el borde) */
  const small = [];
  for (let k = 0; k < 70 + Math.round(40 * g.f); k++) {
    const a = R() * Math.PI * 2; const rr = k % 3 === 0 ? 0.97 : Math.sqrt(R()) * 0.93;
    const x = g.ECX + Math.cos(a) * g.ERX * rr, yy = g.ECY + Math.sin(a) * g.ERY * rr; const rot = R() * 360; const sc = 0.7 + R() * 0.6;
    small.push('<path d="M0 -6 C4 -3 4 3 0 6 C-4 3 -4 -3 0 -6Z" fill="' + (R() < 0.5 ? '#6FAA48' : '#86BE57') + '" stroke="' + OUT + '" stroke-width=".7" transform="translate(' + x.toFixed(1) + ' ' + yy.toFixed(1) + ') rotate(' + rot.toFixed(0) + ') scale(' + sc.toFixed(2) + ')"/>');
  }
  s.push(small.join(''));
  /* lianas: cada poema cuelga entre dos puntos de la copa; el más reciente cuelga suelto */
  const bottom = (x) => g.ECY + g.ERY * Math.sqrt(Math.max(0, 1 - Math.pow((x - g.ECX) / g.ERX, 2))) * 0.9;
  const nP = poems.length;
  const anchors = [];
  for (let k = 0; k < Math.max(nP, 1) + 1; k++) anchors.push(g.ECX - g.ERX * 0.78 + (g.ERX * 1.56) * (k / Math.max(nP, 1)));
  poems.forEach((e, k) => {
    const last = k === nP - 1;
    const xa = last ? anchors[Math.min(k, anchors.length - 1)] : anchors[k]; const ya = bottom(xa);
    let path; let pt;
    if (last) {
      const sag = 70 + (k % 3) * 14;
      path = 'M' + xa.toFixed(1) + ' ' + ya.toFixed(1) + ' C' + (xa - 10).toFixed(1) + ' ' + (ya + sag * 0.35).toFixed(1) + ' ' + (xa + 10).toFixed(1) + ' ' + (ya + sag * 0.65).toFixed(1) + ' ' + xa.toFixed(1) + ' ' + (ya + sag).toFixed(1);
      pt = (t) => [xa + Math.sin(t * 6) * 5, ya + sag * t];
    } else {
      const xb = anchors[k + 1]; const yb = bottom(xb); const sag = 56 + ((k * 37) % 50);
      const p0 = [xa, ya], p1 = [xa + (xb - xa) * 0.15, ya + sag], p2 = [xb - (xb - xa) * 0.15, yb + sag], p3 = [xb, yb];
      path = 'M' + p0.map((v) => v.toFixed(1)).join(' ') + ' C' + p1.map((v) => v.toFixed(1)).join(' ') + ' ' + p2.map((v) => v.toFixed(1)).join(' ') + ' ' + p3.map((v) => v.toFixed(1)).join(' ');
      pt = (t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
    }
    s.push('<path d="' + path + '" stroke="#2F4A22" stroke-width="5" fill="none" stroke-linecap="round"/><path d="' + path + '" stroke="#7DB653" stroke-width="3" fill="none" stroke-linecap="round"/>');
    for (let j = 1; j < 12; j++) {
      const t = j / 12; const [x, yy] = pt(t); const [x2, y2] = pt(Math.min(1, t + 0.02)); const ang = Math.atan2(y2 - yy, x2 - x) * 180 / Math.PI; const side = j % 2 ? 1 : -1;
      s.push('<ellipse cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" rx="4.2" ry="2.2" fill="#8CC560" stroke="#2F4A22" stroke-width=".6" transform="rotate(' + (ang + side * 50).toFixed(0) + ' ' + x.toFixed(1) + ' ' + yy.toFixed(1) + ') translate(0 ' + side * 3 + ')"/>');
      if (j % 4 === 2) s.push('<path d="M' + x.toFixed(1) + ' ' + yy.toFixed(1) + ' q' + (-side * 6) + ' 4 ' + (-side * 3) + ' 9 q3 2 4 -1" stroke="#5E8F3A" stroke-width="1" fill="none"/>');
    }
    const [fx, fy] = pt(last ? 1 : 0.5);
    for (let p = 0; p < 5; p++) { const a = (p * 72 - 90) * Math.PI / 180; s.push('<circle cx="' + (fx + Math.cos(a) * 5).toFixed(1) + '" cy="' + (fy + Math.sin(a) * 5).toFixed(1) + '" r="4.2" fill="#F3C6D6" stroke="#8E3E5E" stroke-width=".9"/>'); }
    s.push('<circle cx="' + fx.toFixed(1) + '" cy="' + fy.toFixed(1) + '" r="3.2" fill="#E8B23A" stroke="#8E3E5E" stroke-width=".8"/>');
    items.push({ e, kind: 'poema', x: fx, y: fy });
  });
  /* hojas de pensamientos: posiciones por defecto o las que el autor eligió */
  thoughts.forEach((e, i) => {
    const p = e.leafPos ? clampToCanopy(e.leafPos, g) : defaultLeafPos(i, thoughts.length, g);
    const rot = Math.round(((Math.atan2(p.y - g.ECY, p.x - g.ECX) * 180 / Math.PI) + 90 + (R() * 40 - 20)));
    items.push({ e, kind: 'hoja', x: p.x, y: p.y, rot });
  });
  return { svg: '<svg class="tree-svg" viewBox="0 0 ' + TREE_W + ' ' + TREE_H + '" aria-hidden="true">' + s.join('') + '</svg>', items, g, counts: { t: thoughts.length, p: poems.length, r: roots.length } };
}

function leafSvg(e) { return leafSvgColors(emosOf(e).map((x) => x.color), 'tr-' + e.id); }

function treeView() {
  const { y, m } = journalMonth();
  const T = buildTree(y, m);
  UI.treeGeom = T.g;
  const pct = (v, tot) => (v / tot * 100).toFixed(2) + '%';
  const selId = UI.treeSel && T.items.some((it) => it.e.id === UI.treeSel) ? UI.treeSel : null;
  const hit = T.items.map((it) => {
    const label = it.kind === 'hoja' ? 'Pensamiento del ' + new Date(it.e.createdAt).getDate() + (emosOf(it.e).length ? ', ' + emosOf(it.e).map(emoLabel).join(' y ') : '') :
      it.kind === 'poema' ? 'Poema: ' + (it.e.title || journalTitle(it.e)) : 'Raíz: ' + journalTitle(it.e);
    return '<button type="button" class="tree-hit tk-' + it.kind + (it.e.id === selId ? ' sel' : '') + '" data-tree-id="' + it.e.id + '" data-kind="' + it.kind + '" style="left:' + pct(it.x, TREE_W) + ';top:' + pct(it.y, TREE_H) + (it.rot != null ? ';--rot:' + it.rot + 'deg' : '') + '" aria-label="' + esc(label) + '">' +
      (it.kind === 'hoja' ? leafSvg(it.e) : '') + '</button>';
  }).join('');
  const c = T.counts;
  const sub = c.t + (c.t === 1 ? ' hoja' : ' hojas') + ' · ' + c.p + (c.p === 1 ? ' liana' : ' lianas') + ' · ' + c.r + (c.r === 1 ? ' raíz' : ' raíces');
  const sel = selId ? byId('journal', selId) : null;
  const moved = S.journal.some((e) => inMonth(e, y, m) && e.leafPos);
  let html = monthNav('El árbol de ' + esc(fmtDate(new Date(y, m, 1), { month: 'long' })), sub);
  html += '<div class="tree-wrap" id="tree-wrap" role="group" aria-label="Árbol del mes: toca una hoja, una flor o una raíz; arrastra una hoja para moverla">' + T.svg + '<div class="tree-layer">' + hit + '</div></div>';
  if (!c.t && !c.p && !c.r) html += '<p class="small muted center">Un arbolito recién plantado. Cada pensamiento será una hoja; cada poema, una liana; cada tema de terapia, una raíz.</p>';
  html += sel ? '<a class="card j-sel" href="#/nota/' + sel.id + '"><div class="row between"><span class="j-kind jk-' + sel.kind + '"><span class="day jk-' + sel.kind + '"></span>' + esc(journalKind(sel.kind).label) + '</span>' +
    '<span class="row gap-s">' + emoChip(sel) + '<span class="small muted">' + esc(journalWhen(sel.createdAt)) + '</span></span></div>' +
    (sel.kind === 'poema' ? (sel.title ? '<p class="j-card-title">' + esc(sel.title) + '</p>' : '') + '<p class="j-poem clamp6">' + esc(sel.text) + '</p>' : '<p class="clamp4 pre">' + esc(sel.text) + '</p>') +
    (statusLabel(sel) ? '<span class="j-status' + (sel.status === 'hablado' ? ' done' : '') + '">' + esc(statusLabel(sel)) + '</span>' : '') + '</a>'
    : (c.t + c.p + c.r ? '<p class="small muted center">Toca una hoja, una flor o una raíz para leerla. Mantén y arrastra una hoja para cambiarla de lugar.</p>' : '');
  if (moved) html += '<button class="link-btn small" data-act="treeReset">Volver las hojas a su orden original</button>';
  html += '<button type="button" class="card forest-link" data-act="journalView" data-v="bosque" data-y="' + y + '"><span class="forest-link-art">' + forestThumb() + '</span>' +
    '<span class="grow"><strong>Ver el bosque de ' + y + '</strong><span class="small muted">Todos los árboles del año en un solo paisaje</span></span>' + icon('chevron') + '</button>';
  return html;
}

/* Arrastrar hojas para reacomodarlas; tocar para leer */
(function treeGestures() {
  let drag = null;
  document.addEventListener('pointerdown', (ev) => {
    const b = ev.target.closest('.tree-hit'); if (!b) return;
    drag = { b, id: b.dataset.treeId, kind: b.dataset.kind, sx: ev.clientX, sy: ev.clientY, moved: false };
    if (b.dataset.kind === 'hoja') { try { b.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ } }
  });
  document.addEventListener('pointermove', (ev) => {
    if (!drag || drag.kind !== 'hoja') return;
    if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) < 6) return;
    drag.moved = true; drag.b.classList.add('dragging');
    const wrap = $('#tree-wrap'); if (!wrap) return; const r = wrap.getBoundingClientRect();
    let p = { x: (ev.clientX - r.left) / r.width * TREE_W, y: (ev.clientY - r.top) / r.height * TREE_H };
    p = clampToCanopy(p, UI.treeGeom);
    drag.p = p;
    drag.b.style.left = (p.x / TREE_W * 100) + '%'; drag.b.style.top = (p.y / TREE_H * 100) + '%';
  });
  const end = async () => {
    if (!drag) return; const d = drag; drag = null;
    if (d.moved && d.p) {
      d.b.classList.remove('dragging');
      const e = byId('journal', d.id); e.leafPos = { x: Math.round(d.p.x), y: Math.round(d.p.y) }; await persist('journal', e);
      if (navigator.vibrate) navigator.vibrate(6);
      if (!$('[data-act="treeReset"]')) rerender();
      return;
    }
    UI.treeSel = d.id; rerender();
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', () => { if (drag) { drag.b.classList.remove('dragging'); drag = null; } });
})();

ACTIONS.treeReset = async () => {
  const { y, m } = journalMonth();
  if (!confirm('¿Regresar todas las hojas de este mes a su lugar original (por fecha)?')) return;
  for (const e of S.journal.filter((x) => inMonth(x, y, m) && x.leafPos)) { e.leafPos = null; await persist('journal', e); }
  rerender();
};

/* ---------- Bosque ---------- */
function miniTree(y, m) {
  const month = S.journal.filter((e) => inMonth(e, y, m));
  const th = month.filter((e) => e.kind === 'pensamiento'); const po = month.filter((e) => e.kind === 'poema').length; const ro = month.filter((e) => e.kind === 'terapia').length;
  const R = rng((y * 12 + m + 1) * 104729); const w = 150, h = 118, gr = h - 14, cx = w / 2; const s = [];
  const size = 0.55 + 0.45 * Math.min(th.length + po, 16) / 16;
  const ex = cx, ey = gr - 50 * size - 12, rx = 56 * size, ry = 32 * size;
  s.push('<rect width="' + w + '" height="' + h + '" fill="#F1F0E1"/><rect y="' + (gr + 3) + '" width="' + w + '" height="' + (h - gr) + '" fill="#D8C3A0"/>');
  for (let r = 0; r < ro; r++) { const sd = r % 2 ? 1 : -1; s.push('<path d="M' + (cx + sd * 4) + ' ' + (gr + 4) + ' q' + sd * 8 + ' 4 ' + sd * (14 + Math.min(r, 5) * 6) + ' ' + (9 + r % 4) + '" stroke="#7A5233" stroke-width="1.4" fill="none"/>'); }
  s.push('<path d="M0 ' + (gr + 4) + ' Q' + cx + ' ' + (gr - 2) + ' ' + w + ' ' + (gr + 4) + ' L' + w + ' ' + (gr + 7) + ' L0 ' + (gr + 7) + 'Z" fill="#9CB86A"/>');
  s.push('<path d="M' + (cx - 9 * size) + ' ' + (gr + 5) + ' C' + (cx - 5) + ' ' + (gr - 20) + ' ' + (cx - 5) + ' ' + (ey + 14) + ' ' + (cx - 4) + ' ' + (ey + 10) + ' L' + (cx + 4) + ' ' + (ey + 10) + ' C' + (cx + 5) + ' ' + (ey + 14) + ' ' + (cx + 5) + ' ' + (gr - 20) + ' ' + (cx + 10 * size) + ' ' + (gr + 5) + 'Z" fill="#94643C" stroke="#4A301C" stroke-width="1.2"/>');
  const bl = []; for (let k = 0; k < 16; k++) { const a = R() * 6.28, rr = Math.sqrt(R()) * 0.8; bl.push([ex + Math.cos(a) * rx * rr, ey + Math.sin(a) * ry * rr, (12 + R() * 5) * size]); }
  s.push(bl.map(([x, yy, r]) => '<circle cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="' + (r + 1.6).toFixed(1) + '" fill="#3B5E2A"/>').join(''));
  s.push('<ellipse cx="' + ex + '" cy="' + (ey + 3) + '" rx="' + (rx * 0.85).toFixed(1) + '" ry="' + (ry * 0.8).toFixed(1) + '" fill="#5E9B3F"/>');
  s.push(bl.map(([x, yy, r]) => '<circle cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#5E9B3F"/>').join(''));
  th.forEach((e, i) => {
    const a = (200 + 140 * (i / Math.max(th.length - 1, 1))) * Math.PI / 180; const rr = i % 2 ? 0.42 : 0.72;
    const x = ex + Math.cos(a) * rx * rr, yy = ey + Math.sin(a) * ry * rr + (rr < 0.6 ? 5 : 0); const t = emoColor(e);
    s.push('<ellipse cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" rx="3.2" ry="5" fill="' + (t || '#A9C98A') + '" stroke="#2F2A20" stroke-width=".7" transform="rotate(' + (a * 180 / Math.PI + 90).toFixed(0) + ' ' + x.toFixed(1) + ' ' + yy.toFixed(1) + ')"/>');
  });
  for (let p = 0; p < Math.min(po, 8); p++) {
    const xa = ex - rx * 0.8 + p * (rx * 1.6 / Math.max(Math.min(po, 8), 1)); const xb = xa + rx * 0.45; const ya = ey + ry * 0.75;
    s.push('<path d="M' + xa.toFixed(1) + ' ' + ya.toFixed(1) + ' C' + (xa + 3).toFixed(1) + ' ' + (ya + 14).toFixed(1) + ' ' + (xb - 3).toFixed(1) + ' ' + (ya + 14).toFixed(1) + ' ' + xb.toFixed(1) + ' ' + ya.toFixed(1) + '" stroke="#5E9B3F" stroke-width="1.5" fill="none"/>' +
      '<circle cx="' + ((xa + xb) / 2).toFixed(1) + '" cy="' + (ya + 10.5).toFixed(1) + '" r="2.4" fill="#F3C6D6" stroke="#8E3E5E" stroke-width=".7"/>');
  }
  return { svg: '<svg viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + s.join('') + '</svg>', th: th.length, po, ro };
}

/* ---------- Bosque del año: un paisaje con un árbol por mes ---------- */
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
function monthMood(y, m) {
  const count = {};
  S.journal.filter((e) => inMonth(e, y, m)).forEach((e) => { const l = emosOf(e); if (l.length) count[l[0].e] = (count[l[0].e] || 0) + 1; });
  const top = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
  return top ? emoDef(top) : null;
}

/* Árbol compacto para el paisaje: base en (x,y), escala s. */
function forestTree(x, y, s, leaves, lianas, seed, hi) {
  const R = rng(seed); const o = []; const f = (v) => v.toFixed(1);
  const tw = 5 * s, th = 26 * s, cy = y - th - 16 * s;
  if (hi) o.push('<ellipse cx="' + f(x) + '" cy="' + f(cy - 2 * s) + '" rx="' + f(36 * s) + '" ry="' + f(34 * s) + '" fill="#FFF6D6" opacity=".9"/>');
  o.push('<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(26 * s) + '" ry="' + f(5 * s) + '" fill="#3E6B2E" opacity=".28"/>');
  o.push('<path d="M' + f(x - tw) + ' ' + f(y) + ' C' + f(x - tw * 0.7) + ' ' + f(y - th * 0.5) + ' ' + f(x - tw * 0.4) + ' ' + f(y - th * 0.8) + ' ' + f(x - tw * 0.35) + ' ' + f(y - th) + ' L' + f(x + tw * 0.45) + ' ' + f(y - th) + ' C' + f(x + tw * 0.5) + ' ' + f(y - th * 0.8) + ' ' + f(x + tw * 0.8) + ' ' + f(y - th * 0.5) + ' ' + f(x + tw * 1.1) + ' ' + f(y) + 'Z" fill="#7A4E2D" stroke="#5A3A22" stroke-width="' + f(Math.max(0.8, 1.2 * s)) + '"/>');
  const blobs = [[0, -10, 20], [-15, -2, 15], [15, -2, 15], [-8, -20, 13], [9, -20, 13], [0, 2, 17]]; const greens = ['#4E9A4B', '#5FAE55', '#469044'];
  blobs.forEach(([dx, dy, r], k) => o.push('<circle cx="' + f(x + dx * s) + '" cy="' + f(cy + dy * s) + '" r="' + f(r * s) + '" fill="' + greens[k % 3] + '" stroke="#2F6B34" stroke-width="' + f(Math.max(0.7, 1.1 * s)) + '"/>'));
  blobs.slice(0, 4).forEach(([dx, dy, r]) => o.push('<circle cx="' + f(x + (dx - r * 0.3) * s) + '" cy="' + f(cy + (dy - r * 0.35) * s) + '" r="' + f(r * 0.45 * s) + '" fill="#7CC165" opacity=".55"/>'));
  for (let k = 0; k < Math.round(6 + 10 * s); k++) { const a = R() * 6.28, rr = 4 + R() * 18; const lx = x + Math.cos(a) * rr * s, ly = cy - 6 * s + Math.sin(a) * rr * 0.8 * s; o.push('<ellipse cx="' + f(lx) + '" cy="' + f(ly) + '" rx="' + f(1.4 * s) + '" ry="' + f(2.4 * s) + '" transform="rotate(' + Math.round(R() * 180) + ' ' + f(lx) + ' ' + f(ly) + ')" fill="#A6D67F"/>'); }
  for (let i = 0; i < Math.min(lianas, 5); i++) { const sx = x + (-16 + i * 8) * s; o.push('<path d="M' + f(sx) + ' ' + f(cy + 6 * s) + ' q' + f(3 * s) + ' ' + f(12 * s) + ' ' + f(-1 * s) + ' ' + f(20 * s) + '" stroke="#3F7D3A" stroke-width="' + f(Math.max(0.8, 1.3 * s)) + '" fill="none"/><circle cx="' + f(sx - s) + '" cy="' + f(cy + 26 * s) + '" r="' + f(2.6 * s) + '" fill="#F3A6C0" stroke="#B04A75" stroke-width=".5"/>'); }
  leaves.slice(0, 12).forEach((c) => { const a = R() * 6.28, rr = 3 + R() * 15; const lx = x + Math.cos(a) * rr * s, ly = cy - 6 * s + Math.sin(a) * rr * 0.75 * s; const h = 5.5 * s;
    o.push('<path d="M' + f(lx) + ' ' + f(ly - h) + ' C' + f(lx + h * 0.8) + ' ' + f(ly - h * 0.4) + ' ' + f(lx + h * 0.7) + ' ' + f(ly + h * 0.7) + ' ' + f(lx) + ' ' + f(ly + h) + ' C' + f(lx - h * 0.7) + ' ' + f(ly + h * 0.7) + ' ' + f(lx - h * 0.8) + ' ' + f(ly - h * 0.4) + ' ' + f(lx) + ' ' + f(ly - h) + 'Z" fill="' + c + '" stroke="#4A3A20" stroke-width="' + f(Math.max(0.5, 0.8 * s)) + '"/>'); });
  return o.join('');
}
function sprout(x, y, s) {
  return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + 12 * s + '" ry="' + 3.5 * s + '" fill="#8B6B45" opacity=".55"/><path d="M' + x + ' ' + y + ' v-' + 10 * s + ' M' + x + ' ' + (y - 6 * s) + ' q-' + 6 * s + ' -' + 2 * s + ' -' + 7 * s + ' -' + 7 * s + ' M' + x + ' ' + (y - 8 * s) + ' q' + 5 * s + ' -' + s + ' ' + 6 * s + ' -' + 6 * s + '" stroke="#4E9A4B" stroke-width="' + 1.6 * s + '" fill="none" stroke-linecap="round"/>';
}
function forestThumb() {
  return '<svg viewBox="0 0 74 40" width="74" height="40" aria-hidden="true"><rect width="74" height="40" fill="#EEF1E2"/><path d="M0 34 Q20 26 40 31 T74 30 V40 H0Z" fill="#B5D18D"/>' +
    forestTree(16, 32, 0.32, ['#5DB896'], 0, 2) + forestTree(36, 30, 0.42, ['#F2C230'], 0, 3) + forestTree(58, 33, 0.36, ['#4F7BD6'], 0, 4) + '</svg>';
}

const FOREST_W = 390, FOREST_H = 720;
/* Enero al fondo, diciembre al frente; un sendero los une en orden. */
const FOREST_SPOTS = [[196, 250], [286, 268], [102, 292], [228, 322], [330, 352], [70, 388], [200, 420], [318, 470], [92, 520], [238, 576], [136, 650], [300, 690]]
  .map(([x, y]) => [x, Math.round(214 + (y - 250) * 0.95)]);

function forestView() {
  const now = new Date();
  const years = new Set([now.getFullYear()]); S.journal.forEach((e) => years.add(new Date(e.createdAt).getFullYear()));
  const yList = Array.from(years).sort();
  const y = UI.forestYear && years.has(UI.forestYear) ? UI.forestYear : now.getFullYear();
  const lastM = y < now.getFullYear() ? 11 : now.getMonth();
  const sel = UI.forestSel != null ? UI.forestSel : lastM;
  const W = FOREST_W, H = FOREST_H; const sc = [];
  sc.push('<defs><linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EBD8"/><stop offset="1" stop-color="#E9F0DA"/></linearGradient></defs>');
  sc.push('<rect width="' + W + '" height="' + H + '" fill="url(#fsky)"/><circle cx="318" cy="120" r="24" fill="#F7DFA0" opacity=".8"/>');
  sc.push('<path d="M0 200 Q70 166 150 190 T300 178 T390 186 V' + H + ' H0Z" fill="#C9DDA8"/><path d="M0 270 Q90 234 200 260 T390 252 V' + H + ' H0Z" fill="#B5D18D"/>');
  sc.push('<path d="M0 380 Q110 342 220 370 T390 362 V' + H + ' H0Z" fill="#A3C97A"/><path d="M0 530 Q120 492 250 518 T390 510 V' + H + ' H0Z" fill="#94C06A"/>');
  /* sendero de diciembre (al frente) a enero (al fondo) */
  const pts = FOREST_SPOTS.slice(0, lastM + 2 > 12 ? 12 : lastM + 2).map(([x, yy]) => [x, yy + 8]).reverse();
  let d = 'M' + pts[0][0] + ' ' + (H - 20);
  for (let i = 0; i < pts.length; i++) d += ' S' + ((pts[i][0] + (pts[i - 1] || pts[i])[0]) / 2 + (i % 2 ? 18 : -18)).toFixed(0) + ' ' + ((pts[i][1] + (pts[i - 1] || [0, H])[1]) / 2).toFixed(0) + ' ' + (pts[i][0] + (i % 2 ? 24 : -24)) + ' ' + (pts[i][1] + 14);
  sc.push('<path d="' + d + '" stroke="#E7D3AE" stroke-width="10" fill="none" stroke-linecap="round" opacity=".9"/><path d="' + d + '" stroke="#D6BE91" stroke-width="1.2" fill="none" stroke-dasharray="2 7" stroke-linecap="round"/>');
  const R = rng(y * 7919);
  for (let k = 0; k < 14; k++) { const bx = R() * W, by = 230 + R() * 420; sc.push('<circle cx="' + bx.toFixed(0) + '" cy="' + by.toFixed(0) + '" r="' + ((5 + R() * 5) * (0.5 + (by - 230) / 500)).toFixed(1) + '" fill="#6FA552" opacity=".6"/>'); }
  const hits = []; const signs = [];
  for (let m = 0; m <= Math.min(11, lastM + 1); m++) {
    const [x, yy] = FOREST_SPOTS[m]; const s = 0.42 + m * 0.065;
    const month = S.journal.filter((e) => inMonth(e, y, m));
    const label = fmtDate(new Date(y, m, 1), { month: 'short' }).replace('.', '');
    if (m > lastM) { sc.push(sprout(x, yy, 1.4)); signs.push([x, yy + 24, label + ' · por crecer', false]); continue; }
    if (!month.length) { sc.push(sprout(x, yy, 0.9 + m * 0.04)); signs.push([x, yy + 14, label, false]); }
    else {
      const leaves = month.filter((e) => e.kind === 'pensamiento').map((e) => emoColor(e) || '#E8E2CC');
      const grow = Math.min(1, 0.6 + month.length / 25);
      sc.push(forestTree(x, yy, s * grow, leaves, month.filter((e) => e.kind === 'poema').length, (y * 12 + m + 1) * 131, m === sel));
      signs.push([x, yy + 10 + 6 * s, label, m === lastM && y === now.getFullYear()]);
    }
    hits.push('<button type="button" class="forest-hit' + (m === sel ? ' sel' : '') + '" data-act="forestPick" data-m="' + m + '" style="left:' + ((x - 32 * s) / W * 100).toFixed(2) + '%;top:' + ((yy - 74 * s) / H * 100).toFixed(2) + '%;width:' + (64 * s / W * 100).toFixed(2) + '%;height:' + (84 * s / H * 100).toFixed(2) + '%" aria-label="' + esc(fmtDate(new Date(y, m, 1), { month: 'long' })) + ': ' + month.length + (month.length === 1 ? ' entrada' : ' entradas') + '"></button>');
  }
  signs.forEach(([x, yy, t, strong]) => { const w = 10 + t.length * 6.2; sc.push('<path d="M' + x + ' ' + yy + ' v12" stroke="#6E4A2C" stroke-width="2"/><rect x="' + (x - w / 2).toFixed(1) + '" y="' + (yy - 12) + '" width="' + w.toFixed(1) + '" height="16" rx="4" fill="' + (strong ? '#17191C' : '#F6EBD3') + '" stroke="#8B6B45"/><text x="' + x + '" y="' + yy + '" text-anchor="middle" font-size="10.5" font-weight="700" font-family="system-ui, sans-serif" fill="' + (strong ? '#FFFFFF' : '#4A3A20') + '">' + esc(t) + '</text>'); });
  const R2 = rng(y * 31);
  for (let k = 0; k < 24; k++) { const fx = R2() * W, fy = 660 + R2() * 54; sc.push('<path d="M' + fx.toFixed(0) + ' ' + fy.toFixed(0) + ' l-2 -7 M' + fx.toFixed(0) + ' ' + fy.toFixed(0) + ' l2 -8 M' + fx.toFixed(0) + ' ' + fy.toFixed(0) + ' l5 -6" stroke="#5E9A45" stroke-width="1.3" stroke-linecap="round"/>'); }

  const yearEntries = S.journal.filter((e) => new Date(e.createdAt).getFullYear() === y);
  const trees = new Set(yearEntries.map((e) => new Date(e.createdAt).getMonth())).size;
  const sm = S.journal.filter((e) => inMonth(e, y, sel)); const mood = monthMood(y, sel);
  const yi = yList.indexOf(y);
  let html = '<div class="row between"><button class="link-btn small" data-act="journalView" data-v="arbol">' + icon('back', 14) + ' Árbol del mes</button>' +
    '<div class="year-pick" role="group" aria-label="Año"><button class="icon-btn sm" data-act="forestYear" data-y="' + (yList[yi - 1] || '') + '"' + (yi > 0 ? '' : ' disabled') + ' aria-label="Año anterior">' + icon('back', 16) + '</button><strong>' + y + '</strong>' +
    '<button class="icon-btn sm" data-act="forestYear" data-y="' + (yList[yi + 1] || '') + '"' + (yi < yList.length - 1 ? '' : ' disabled') + ' aria-label="Año siguiente">' + icon('chevron', 16) + '</button></div></div>';
  html += '<div><h2 class="h2 m0">Tu bosque de ' + y + '</h2><p class="small muted">' + trees + (trees === 1 ? ' árbol' : ' árboles') + ' · ' + plural(yearEntries.filter((e) => e.kind === 'pensamiento').length, 'hoja', 'hojas') + ' · ' + plural(yearEntries.filter((e) => e.kind === 'poema').length, 'liana', 'lianas') + ' · el sendero va de enero a hoy</p></div>';
  html += '<div class="card forest-sel row gap"><span class="forest-sel-ico">' + leafSvgColors([mood ? mood.color : '#A9C98A'], 'fs', 18) + '</span><span class="grow"><strong class="cap">' + esc(fmtDate(new Date(y, sel, 1), { month: 'long' })) + '</strong><span class="small muted">' +
    plural(sm.filter((e) => e.kind === 'pensamiento').length, 'hoja', 'hojas') + ' · ' + plural(sm.filter((e) => e.kind === 'poema').length, 'liana', 'lianas') + ' · ' + plural(sm.filter((e) => e.kind === 'terapia').length, 'raíz', 'raíces') + (mood ? ' · sobre todo ' + mood.label.toLowerCase() : '') + '</span></span>' +
    '<button class="btn small-btn dark" data-act="forestOpen" data-y="' + y + '" data-m="' + sel + '">Abrir</button></div>';
  html += '<div class="forest-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bosque de ' + y + ': un árbol por mes">' + sc.join('') + '</svg><div class="forest-layer">' + hits.join('') + '</div></div>';
  return html;
}

ACTIONS.forestPick = (el) => { UI.forestSel = Number(el.dataset.m); rerender(); };
ACTIONS.forestYear = (el) => { if (!el.dataset.y) return; UI.forestYear = Number(el.dataset.y); UI.forestSel = null; rerender(); };
ACTIONS.forestOpen = (el) => { UI.journalMonth = { y: Number(el.dataset.y), m: Number(el.dataset.m) }; UI.journalView = 'arbol'; UI.treeSel = null; UI.forestSel = null; rerender(); window.scrollTo(0, 0); };
