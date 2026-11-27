/* Semillero — mapa conceptual: cada idea es una canica que flota.
   Acércalas para unirlas con lazos; avienta una para soltarla y que orbite las estructuras más pesadas. */
'use strict';

const MAP = (() => {
  const POS = {};          /* posiciones en memoria entre pantallas */
  let st = null;

  const radius = (idea) => 38 + Math.min(16, (idea.related || []).length * 4) + ({ semilla: 0, exploracion: 3, plan: 6, proyecto: 10 }[idea.stage] || 0);
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

  function bubbleHtml(idea, n) {
    return '<div class="canica" data-id="' + idea.id + '" style="width:' + n.r * 2 + 'px;height:' + n.r * 2 + 'px">' +
      orbHtml(idea, 'map') + '<span class="bubble-label">' + esc(ideaTitle(idea)) + '</span></div>';
  }

  function edges() {
    const out = []; const seen = new Set();
    st.nodes.forEach((n) => (n.idea.related || []).forEach((rid) => {
      if (!st.byId[rid]) return;
      const key = n.id < rid ? n.id + '|' + rid : rid + '|' + n.id;
      if (seen.has(key)) return; seen.add(key);
      out.push({ a: st.byId[n.id], b: st.byId[rid], key, ph: hash(key) % 628 / 100 });
    }));
    return out;
  }

  function components() {
    const comp = {}; let c = 0;
    st.nodes.forEach((n) => {
      if (comp[n.id] != null) return;
      const stack = [n.id]; comp[n.id] = c;
      while (stack.length) {
        const id = stack.pop();
        (st.byId[id].idea.related || []).forEach((r) => { if (st.byId[r] && comp[r] == null) { comp[r] = c; stack.push(r); } });
      }
      c++;
    });
    const sizes = new Array(c).fill(0);
    st.nodes.forEach((n) => { n.comp = comp[n.id]; sizes[n.comp]++; });
    st.compSizes = sizes;
    let heavy = -1; let best = 1;
    sizes.forEach((s, i) => { if (s > best) { best = s; heavy = i; } });
    st.heavy = heavy;
    let k = 0;
    st.nodes.filter((n) => sizes[n.comp] === 1).forEach((n) => { n.ring = k++; });
  }

  function topology() {
    st.edges = edges();
    components();
    st.nodes.forEach((n) => { const r = radius(n.idea); if (r !== n.r) { n.r = r; n.el.style.width = n.el.style.height = r * 2 + 'px'; } });
    st.linkLayer.innerHTML = st.edges.map((e) => '<g data-key="' + e.key + '"><path class="lazo-hit" d=""/><path class="lazo-glow" d=""/><path class="lazo" d=""/></g>').join('') +
      '<path class="lazo-preview" d="" />';
    st.edges.forEach((e) => { e.g = st.linkLayer.querySelector('g[data-key="' + e.key + '"]'); e.paths = e.g.querySelectorAll('path'); });
    st.preview = st.linkLayer.querySelector('.lazo-preview');
  }

  function mount(stage, opts) {
    stop();
    opts = Object.assign({ edit: true, onTap: (id) => go('#/idea/' + id), picked: null }, opts || {});
    const ideas = S.ideas.filter((i) => i.stage !== 'archivada');
    stage.innerHTML = '<div class="map-world"><svg class="map-links" width="1" height="1" overflow="visible"></svg><div class="map-bubbles"></div></div>';
    st = {
      stage, opts, world: stage.firstChild, linkLayer: stage.querySelector('.map-links'), layer: stage.querySelector('.map-bubbles'),
      nodes: [], byId: {}, cam: { x: 0, y: 0, k: 1 }, t: 0, ptrs: new Map(), drag: null, pan: null, raf: 0, near: null
    };
    ideas.forEach((idea, i) => {
      const saved = POS[idea.id] || idea.mapPos;
      const a = (hash(idea.id) % 628) / 100; const d = 140 + (i % 5) * 50;
      const n = { id: idea.id, idea, x: saved ? saved.x : Math.cos(a) * d, y: saved ? saved.y : Math.sin(a) * d, vx: 0, vy: 0, r: radius(idea), fixed: false };
      st.nodes.push(n); st.byId[idea.id] = n;
    });
    st.layer.innerHTML = st.nodes.map((n) => bubbleHtml(n.idea, n)).join('');
    st.nodes.forEach((n) => { n.el = st.layer.querySelector('.canica[data-id="' + n.id + '"]'); });
    fillPhotos(st.layer);
    topology();
    if (opts.picked && st.byId[opts.picked]) st.byId[opts.picked].el.classList.add('picked');
    fitCamera();
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    const loop = () => { if (!st) return; step(); if (st.t === 70 && !st.ptrs.size) fitCamera(); draw(); st.raf = requestAnimationFrame(loop); };
    st.raf = requestAnimationFrame(loop);
    return st.nodes.length;
  }

  function fitCamera() {
    if (!st.nodes.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    /* +34 abajo: deja lugar al nombre que va bajo cada canica */
    st.nodes.forEach((n) => { x0 = Math.min(x0, n.x - n.r); x1 = Math.max(x1, n.x + n.r); y0 = Math.min(y0, n.y - n.r); y1 = Math.max(y1, n.y + n.r + 34); });
    const w = st.stage.clientWidth || 360; const h = st.stage.clientHeight || 500;
    /* Centra en el espacio libre entre el encabezado (y la leyenda) y el texto de ayuda de abajo */
    let top = 0, bottom = 0;
    const scr = st.stage.closest('.map-screen');
    if (scr) {
      const sr = st.stage.getBoundingClientRect();
      const head = scr.querySelector('.map-legend') || scr.querySelector('.map-head');
      if (head) top = Math.max(0, head.getBoundingClientRect().bottom - sr.top + 10);
      const hint = scr.querySelector('.map-hint');
      if (hint) bottom = Math.max(0, sr.bottom - hint.getBoundingClientRect().top + 10);
    }
    const avail = Math.max(140, h - top - bottom);
    st.cam.k = Math.max(0.35, Math.min(1.15, Math.min(w / (x1 - x0 + 60), avail / (y1 - y0 + 20))));
    st.cam.x = -(x0 + x1) / 2; st.cam.y = -(y0 + y1) / 2 + (top - bottom) / (2 * st.cam.k);
  }

  function centroid(comp) {
    let x = 0, y = 0, n = 0, ext = 0;
    st.nodes.forEach((p) => { if (p.comp === comp) { x += p.x; y += p.y; n++; } });
    if (!n) return { x: 0, y: 0, ext: 0 };
    x /= n; y /= n;
    st.nodes.forEach((p) => { if (p.comp === comp) ext = Math.max(ext, Math.hypot(p.x - x, p.y - y) + p.r); });
    return { x, y, ext };
  }

  function step() {
    st.t++;
    const N = st.nodes; const sizes = st.compSizes;
    const heavyC = st.heavy >= 0 ? centroid(st.heavy) : { x: 0, y: 0, ext: 0 };
    const cents = {};
    /* repulsión: nadie se encima; estructuras distintas guardan más distancia */
    for (let i = 0; i < N.length; i++) {
      for (let j = i + 1; j < N.length; j++) {
        const a = N[i], b = N[j];
        if (a.fixed || b.fixed) continue; /* la que arrastras no empuja: así puedes acercarla */
        let dx = b.x - a.x, dy = b.y - a.y; let d = Math.hypot(dx, dy) || 0.01;
        const range = a.r + b.r + (a.comp === b.comp ? 50 : 90);
        if (d < range) {
          const f = (range - d) * 0.035; dx /= d; dy /= d;
          if (!a.fixed) { a.vx -= dx * f; a.vy -= dy * f; }
          if (!b.fixed) { b.vx += dx * f; b.vy += dy * f; }
        }
      }
    }
    /* lazos: resortes suaves */
    st.edges.forEach((e) => {
      const a = e.a, b = e.b; let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01;
      const f = (d - (a.r + b.r + 70)) * 0.01; dx /= d; dy /= d;
      if (!a.fixed) { a.vx += dx * f; a.vy += dy * f; }
      if (!b.fixed) { b.vx -= dx * f; b.vy -= dy * f; }
    });
    N.forEach((n) => {
      if (n.fixed) return;
      const size = sizes[n.comp];
      if (size > 1) {
        /* las estructuras caen despacio hacia el centro; las más pesadas, más */
        const g = n.comp === st.heavy ? 0.0016 : 0.0009;
        n.vx -= n.x * g; n.vy -= n.y * g;
        if (!cents[n.comp]) cents[n.comp] = centroid(n.comp);
        n.vx += (cents[n.comp].x - n.x) * 0.0012; n.vy += (cents[n.comp].y - n.y) * 0.0012;
      } else {
        /* idea solitaria: orbita lentamente la estructura más pesada */
        const cx = heavyC.x, cy = heavyC.y;
        const R = (st.heavy >= 0 ? heavyC.ext + 90 : 70) + (n.ring % 4) * 78 + n.r;
        let dx = n.x - cx, dy = n.y - cy; const d = Math.hypot(dx, dy) || 0.01; dx /= d; dy /= d;
        n.vx -= dx * (d - R) * 0.004; n.vy -= dy * (d - R) * 0.004;
        const dir = n.ring % 2 ? -1 : 1; const vt = 0.32 * dir;
        const cur = -n.vx * dy + n.vy * dx;
        n.vx += -dy * (vt - cur) * 0.03; n.vy += dx * (vt - cur) * 0.03;
      }
      n.vx *= 0.9; n.vy *= 0.9;
      const sp = Math.hypot(n.vx, n.vy); if (sp > 26) { n.vx *= 26 / sp; n.vy *= 26 / sp; }
      n.x += n.vx; n.y += n.vy;
    });
  }

  function lazoD(a, b, wob) {
    const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const ux = dx / d, uy = dy / d;
    const x0 = a.x + ux * a.r, y0 = a.y + uy * a.r, x1 = b.x - ux * b.r, y1 = b.y - uy * b.r;
    const sag = 10 + wob;
    const mx = (x0 + x1) / 2 - uy * sag, my = (y0 + y1) / 2 + ux * sag;
    return 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
  }

  function draw() {
    const w = st.stage.clientWidth, h = st.stage.clientHeight;
    st.world.style.transform = 'translate(' + (w / 2 + st.cam.x * st.cam.k) + 'px,' + (h / 2 + st.cam.y * st.cam.k) + 'px) scale(' + st.cam.k + ')';
    st.nodes.forEach((n) => {
      const bob = Math.sin(st.t / 60 + (hash(n.id) % 50)) * 1.5;
      n.el.style.transform = 'translate(' + (n.x - n.r).toFixed(1) + 'px,' + (n.y - n.r + bob).toFixed(1) + 'px)';
    });
    st.edges.forEach((e) => {
      const d = lazoD(e.a, e.b, Math.sin(st.t / 70 + e.ph) * 6);
      e.paths.forEach((p) => p.setAttribute('d', d));
    });
    if (st.drag && st.near) st.preview.setAttribute('d', lazoD(st.drag.node, st.near, 0));
    else st.preview.setAttribute('d', '');
  }

  const toWorld = (cx, cy) => {
    const r = st.stage.getBoundingClientRect();
    return { x: (cx - r.left - r.width / 2) / st.cam.k - st.cam.x, y: (cy - r.top - r.height / 2) / st.cam.k - st.cam.y };
  };

  function onDown(e) {
    st.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { st.stage.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    if (st.ptrs.size === 2) { st.drag = null; st.pan = null; st.pinch = pinchState(); return; }
    const b = e.target.closest('.canica');
    if (b && st.byId[b.dataset.id]) {
      const n = st.byId[b.dataset.id]; const w = toWorld(e.clientX, e.clientY);
      st.drag = { node: n, ox: n.x - w.x, oy: n.y - w.y, sx: e.clientX, sy: e.clientY, moved: false, hist: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
      return;
    }
    const lazo = e.target.closest('g[data-key]');
    st.pan = { sx: e.clientX, sy: e.clientY, cx: st.cam.x, cy: st.cam.y, moved: false, lazo: lazo ? lazo.dataset.key : null };
  }

  function pinchState() {
    const p = Array.from(st.ptrs.values());
    return { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), k: st.cam.k };
  }

  function onMove(e) {
    if (!st.ptrs.has(e.pointerId)) return;
    st.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (st.pinch && st.ptrs.size === 2) {
      const p = Array.from(st.ptrs.values()); const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      st.cam.k = Math.max(0.3, Math.min(2.2, st.pinch.k * d / (st.pinch.d || 1)));
      return;
    }
    const dr = st.drag;
    if (dr) {
      if (!dr.moved && Math.hypot(e.clientX - dr.sx, e.clientY - dr.sy) < 7) return;
      if (!st.opts.edit) { /* en modo elegir, arrastrar mueve el mapa */
        st.pan = { sx: dr.sx, sy: dr.sy, cx: st.cam.x, cy: st.cam.y, moved: true }; st.drag = null; return;
      }
      dr.moved = true; dr.node.fixed = true; dr.node.el.classList.add('grab');
      const w = toWorld(e.clientX, e.clientY);
      dr.node.x = w.x + dr.ox; dr.node.y = w.y + dr.oy; dr.node.vx = 0; dr.node.vy = 0;
      dr.hist.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (dr.hist.length > 6) dr.hist.shift();
      let best = null; let bd = Infinity;
      st.nodes.forEach((o) => {
        if (o === dr.node) return;
        const d = Math.hypot(o.x - dr.node.x, o.y - dr.node.y) - o.r - dr.node.r;
        if (d < 40 && d < bd) { bd = d; best = o; }
      });
      if (st.near !== best) {
        if (st.near) st.near.el.classList.remove('near');
        st.near = best;
        if (best) { best.el.classList.add('near'); if (navigator.vibrate) navigator.vibrate(8); }
      }
      return;
    }
    if (st.pan) {
      if (Math.hypot(e.clientX - st.pan.sx, e.clientY - st.pan.sy) > 6) st.pan.moved = true;
      st.cam.x = st.pan.cx + (e.clientX - st.pan.sx) / st.cam.k;
      st.cam.y = st.pan.cy + (e.clientY - st.pan.sy) / st.cam.k;
    }
  }

  async function onUp(e) {
    st.ptrs.delete(e.pointerId);
    if (st.ptrs.size < 2) st.pinch = null;
    const dr = st.drag; st.drag = null;
    if (dr) {
      const n = dr.node; n.fixed = false; n.el.classList.remove('grab');
      if (!dr.moved) { st.opts.onTap(n.id, n); return; }
      const near = st.near; st.near = null; if (near) near.el.classList.remove('near');
      if (near) {
        if (!(n.idea.related || []).includes(near.id)) {
          await relateIdeas(n.id, near.id);
          if (!st) return;
          topology();
          toast('Unidas: ' + ideaTitle(n.idea).slice(0, 24) + ' ✦ ' + ideaTitle(near.idea).slice(0, 24));
        }
        if (st) savePos(n);
        return;
      }
      /* velocidad al soltar: si la aventaste, queda sola y orbita */
      const h = dr.hist; const a = h[0], b = h[h.length - 1]; const dt = Math.max(1, b.t - a.t);
      const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt; const sp = Math.hypot(vx, vy);
      if (sp > 0.9 && performance.now() - b.t < 120) {
        n.vx = vx * 16 / st.cam.k; n.vy = vy * 16 / st.cam.k;
        const prev = (n.idea.related || []).slice();
        if (prev.length) {
          await detach(n.id);
          if (!st) return;
          topology();
          toast('Idea suelta: ahora orbita sola', { label: 'Deshacer', fn: async () => { for (const r of prev) await relateIdeas(n.id, r); if (st) topology(); } });
        }
      }
      if (st) savePos(n);
      return;
    }
    const pan = st.pan; st.pan = null;
    if (pan && !pan.moved && pan.lazo && st.opts.edit) {
      const [ia, ib] = pan.lazo.split('|'); const A = byId('ideas', ia), B = byId('ideas', ib);
      if (A && B && confirm('¿Cortar el lazo entre "' + ideaTitle(A) + '" y "' + ideaTitle(B) + '"?')) {
        await unrelateIdeas(ia, ib); if (st) topology();
      }
    }
  }

  function onWheel(e) {
    e.preventDefault();
    st.cam.k = Math.max(0.3, Math.min(2.2, st.cam.k * (e.deltaY > 0 ? 0.92 : 1.08)));
  }

  function savePos(n) { POS[n.id] = { x: Math.round(n.x), y: Math.round(n.y) }; }

  function stop() {
    if (!st) return;
    cancelAnimationFrame(st.raf);
    st.nodes.forEach((n) => {
      const p = { x: Math.round(n.x), y: Math.round(n.y) };
      POS[n.id] = p;
      const old = n.idea.mapPos;
      if (!old || Math.abs(old.x - p.x) + Math.abs(old.y - p.y) > 40) { n.idea.mapPos = p; DB.put('ideas', n.idea); }
    });
    st = null;
  }

  function pick(id) {
    if (!st) return;
    st.nodes.forEach((n) => n.el.classList.toggle('picked', n.id === id));
  }

  return { mount, stop, pick, fit: () => st && fitCamera() };
})();

async function detach(id) {
  const n = byId('ideas', id);
  if (!n) return;
  for (const r of (n.related || []).slice()) await unrelateIdeas(id, r);
}

async function unrelateIdeas(aId, bId) {
  const a = byId('ideas', aId); const b = byId('ideas', bId);
  if (a) { a.related = a.related.filter((x) => x !== bId); await persist('ideas', a); }
  if (b) { b.related = b.related.filter((x) => x !== aId); await persist('ideas', b); }
}

/* ================= PANTALLA DEL MAPA ================= */
route(/^#\/mapa$/, viewMapa, 'mapa', true);

function viewMapa() {
  const active = S.ideas.filter((i) => i.stage !== 'archivada');
  const n = active.length;
  const used = S.settings.sectors.filter((s) => active.some((i) => i.sectors.includes(s)));
  active.forEach((i) => i.sectors.forEach((s) => { if (!used.includes(s)) used.push(s); }));
  onMount(() => { MAP.mount($('#map-stage')); });
  return '<section class="map-screen">' +
    '<header class="map-head"><div><h1>Mapa</h1><p>' + n + ' ' + (n === 1 ? 'idea' : 'ideas') + ' flotando</p></div>' +
    '<div class="row gap-s"><button class="map-btn" data-act="mapFit" aria-label="Centrar mapa"><svg class="ic" width="20" height="20" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>' +
    '</div></header>' +
    (used.length ? '<div class="map-legend" aria-label="Colores de los tags">' + used.map((s) => '<span><span class="dot" style="background:' + sectorColor(s) + '"></span>' + esc(s) + '</span>').join('') + '</div>' : '') +
    '<div id="map-stage" class="map-stage" aria-label="Mapa de ideas"></div>' +
    (n ? '<p class="map-hint">Acerca una canica a otra para unirlas · Avienta una para soltarla · Toca un lazo para cortarlo</p>'
      : '<div class="map-empty"><p>Aún no hay canicas.</p><a class="btn light" href="#/capture">Sembrar la primera idea</a></div>') +
    '</section>';
}

ACTIONS.mapFit = () => MAP.fit();
