/* Semillero — mapa conceptual: cada idea es una canica que flota.
   Acércalas para unirlas con lazos; avienta una para soltarla y que orbite las estructuras más pesadas. */
'use strict';

const MAP = (() => {
  const POS = {};          /* posiciones en memoria entre pantallas */
  let st = null;
  const GAP = 150;         /* distancia mínima entre proyectos distintos */
  const CELL = 260;        /* cuadrícula de vecinos para la repulsión */

  const radius = (idea) => 38 + Math.min(16, (idea.related || []).length * 4) + ({ semilla: 0, exploracion: 3, plan: 6, proyecto: 10 }[idea.stage] || 0);
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const nucRadius = (nid) => 54 + Math.min(22, nucleusIdeas(nid).length * 4);
  const isCine = (idea) => (idea.sectors || []).includes('Cine');

  function moonsHtml(idea) {
    const qs = idea.questions || [];
    if (!qs.length) return '';
    return '<span class="lunas" aria-hidden="false">' + qs.map((q, k) =>
      '<button type="button" class="luna' + (q.done ? ' done' : '') + '" data-q="' + q.id + '" style="--a:' + Math.round((k * 360) / qs.length + (hash(q.id) % 40)) + 'deg" aria-label="Pregunta: ' + esc(q.q) + '"></button>').join('') + '</span>';
  }

  function bubbleHtml(idea, n) {
    return '<div class="canica" data-id="' + idea.id + '" style="width:' + n.r * 2 + 'px;height:' + n.r * 2 + 'px;--R:' + (n.r + 15) + 'px;--d:-' + (hash(idea.id) % 40) / 10 + 's">' +
      orbHtml(idea, 'map') + moonsHtml(idea) + '<span class="bubble-label">' + esc(ideaTitle(idea)) + '</span></div>';
  }

  function nucleusHtml(nuc, n) {
    const quiet = nuc.status === 'pausa' || nuc.status === 'terminado';
    return '<div class="nucleo' + (quiet ? ' quiet' : '') + '" data-nuc="' + nuc.id + '" style="width:' + n.r * 2 + 'px;height:' + n.r * 2 + 'px">' +
      nucOrb(nuc, 'map', '<span class="nuc-name">' + esc(nucleusTitle(nuc)) + '</span>') + '</div>';
  }

  function tethers() {
    const out = [];
    st.nodes.forEach((n) => {
      if (!n.idea) return;
      (n.idea.nuclei || []).forEach((nid, k) => {
        const nn = st.byId['n:' + nid];
        if (nn) out.push({ a: n, b: nn, primary: k === 0, key: n.id + '>' + nid });
      });
    });
    return out;
  }

  function edges() {
    const out = []; const seen = new Set();
    st.nodes.forEach((n) => n.idea && (n.idea.related || []).forEach((rid) => {
      if (!st.byId[rid]) return;
      const key = n.id < rid ? n.id + '|' + rid : rid + '|' + n.id;
      if (seen.has(key)) return; seen.add(key);
      out.push({ a: st.byId[n.id], b: st.byId[rid], key, ph: hash(key) % 628 / 100 });
    }));
    return out;
  }

  /* Núcleos del mismo sistema: resortes invisibles que los mantienen juntos. */
  function sysLinks() {
    const out = []; const bySys = {};
    st.nodes.forEach((n) => { if (n.nuc && n.nuc.systemId && byId('systems', n.nuc.systemId)) (bySys[n.nuc.systemId] = bySys[n.nuc.systemId] || []).push(n); });
    Object.keys(bySys).forEach((sid) => { const ns = bySys[sid]; for (let i = 1; i < ns.length; i++) out.push({ a: ns[i - 1], b: ns[i], sid }); });
    return out;
  }

  function components() {
    const comp = {}; let c = 0;
    st.nodes.forEach((n) => {
      if (comp[n.id] != null) return;
      const stack = [n.id]; comp[n.id] = c;
      while (stack.length) {
        const id = stack.pop();
        (st.adj[id] || []).forEach((r) => { if (st.byId[r] && comp[r] == null) { comp[r] = c; stack.push(r); } });
      }
      c++;
    });
    const sizes = new Array(c).fill(0);
    st.nodes.forEach((n) => { n.comp = comp[n.id]; sizes[n.comp]++; });
    /* Ideas de cine sueltas: su propia región, aparte del resto. */
    st.cineComp = -1;
    st.nodes.forEach((n) => {
      if (n.idea && sizes[n.comp] === 1 && isCine(n.idea)) {
        if (st.cineComp < 0) { st.cineComp = sizes.length; sizes.push(0); }
        sizes[n.comp]--; n.comp = st.cineComp; sizes[st.cineComp]++;
      }
    });
    st.compSizes = sizes;
    let heavy = -1; let best = 1;
    sizes.forEach((sz, i) => { if (sz > best && i !== st.cineComp) { best = sz; heavy = i; } });
    st.heavy = heavy;
    let k = 0;
    st.nodes.forEach((n) => { n.struct = sizes[n.comp] > 1 || !n.idea || n.comp === st.cineComp; if (!n.struct) n.ring = k++; });
    st.orbiters = k;
    /* Etiquetas de región: sistemas y cine. */
    st.regions = {};
    st.nodes.forEach((n) => {
      if (n.comp === st.cineComp) st.regions[n.comp] = { label: 'Cine', cls: 'cine', key: 'cine' };
      else if (n.nuc && n.nuc.systemId && byId('systems', n.nuc.systemId) && !st.regions[n.comp]) st.regions[n.comp] = { label: systemTitle(byId('systems', n.nuc.systemId)), cls: 'sys', key: 's:' + n.nuc.systemId };
    });
  }

  function topology() {
    st.edges = edges();
    st.tethers = tethers();
    st.sys = sysLinks();
    st.adj = {};
    const link = (a, b) => { (st.adj[a] = st.adj[a] || []).push(b); (st.adj[b] = st.adj[b] || []).push(a); };
    st.edges.forEach((e) => link(e.a.id, e.b.id));
    st.tethers.forEach((t) => link(t.a.id, t.b.id));
    st.sys.forEach((l) => link(l.a.id, l.b.id));
    components();
    st.nodes.forEach((n) => {
      const r = n.idea ? radius(n.idea) : nucRadius(n.nuc.id);
      if (r !== n.r) { n.r = r; n.el.style.width = n.el.style.height = r * 2 + 'px'; n.el.style.setProperty('--R', (r + 15) + 'px'); }
    });
    st.linkLayer.innerHTML =
      st.tethers.map((t) => '<g data-tether="' + t.key + '"><path class="lazo-hit" d=""/><path class="tether' + (t.primary ? '' : ' sec') + '" d=""/></g>').join('') +
      st.edges.map((e) => '<g data-key="' + e.key + '"><path class="lazo-hit" d=""/><path class="lazo-glow" d=""/><path class="lazo" d=""/></g>').join('') +
      '<path class="lazo-preview" d="" />';
    st.tethers.forEach((t) => { t.g = st.linkLayer.querySelector('g[data-tether="' + t.key + '"]'); t.paths = t.g.querySelectorAll('path'); });
    st.edges.forEach((e) => { e.g = st.linkLayer.querySelector('g[data-key="' + e.key + '"]'); e.paths = e.g.querySelectorAll('path'); });
    st.preview = st.linkLayer.querySelector('.lazo-preview');
    st.regionLayer.innerHTML = Object.keys(st.regions).map((c) => '<div class="map-region ' + st.regions[c].cls + '" data-comp="' + c + '"><span>' + esc(st.regions[c].label) + '</span></div>').join('');
    st.regionEls = {}; $$('.map-region', st.regionLayer).forEach((el) => { st.regionEls[el.dataset.comp] = el; });
    wake();
  }

  function mount(stage, opts) {
    stop();
    opts = Object.assign({ edit: true, onTap: (id) => go('#/idea/' + id), picked: null, focus: null }, opts || {});
    const ideas = S.ideas.filter((i) => i.stage !== 'archivada');
    stage.innerHTML = '<div class="map-world"><div class="map-regions"></div><svg class="map-links" width="1" height="1" overflow="visible"></svg><div class="map-bubbles"></div></div>';
    st = {
      stage, opts, world: stage.firstChild, regionLayer: stage.querySelector('.map-regions'), linkLayer: stage.querySelector('.map-links'), layer: stage.querySelector('.map-bubbles'),
      nodes: [], byId: {}, cam: { x: 0, y: 0, k: 1 }, fly: null, t: 0, ptrs: new Map(), drag: null, pan: null, raf: 0, near: null,
      calm: false, still: 0, sleeping: false, slow: 0, frameT: 0, camKey: ''
    };
    ideas.forEach((idea, i) => {
      const saved = POS[idea.id] || idea.mapPos;
      const a = (hash(idea.id) % 628) / 100; const d = 140 + (i % 5) * 50;
      const n = { id: idea.id, idea, x: saved ? saved.x : Math.cos(a) * d, y: saved ? saved.y : Math.sin(a) * d, vx: 0, vy: 0, r: radius(idea), fixed: false };
      if (!saved && isCine(idea)) { n.x += 520; n.y += 360; }
      st.nodes.push(n); st.byId[idea.id] = n;
    });
    S.nuclei.forEach((nuc, i) => {
      const saved = POS['n:' + nuc.id] || nuc.mapPos;
      const a = (hash(nuc.id) % 628) / 100; const d = 60 + (i % 3) * 160;
      const n = { id: 'n:' + nuc.id, nuc, x: saved ? saved.x : Math.cos(a) * d, y: saved ? saved.y : Math.sin(a) * d, vx: 0, vy: 0, r: nucRadius(nuc.id), fixed: false };
      st.nodes.push(n); st.byId[n.id] = n;
    });
    st.layer.innerHTML = st.nodes.map((n) => (n.idea ? bubbleHtml(n.idea, n) : nucleusHtml(n.nuc, n))).join('');
    st.nodes.forEach((n) => { n.el = n.idea ? st.layer.querySelector('.canica[data-id="' + n.id + '"]') : st.layer.querySelector('.nucleo[data-nuc="' + n.nuc.id + '"]'); n.px = NaN; n.py = NaN; n.vis = true; });
    fillPhotos(st.layer);
    topology();
    if (opts.picked && st.byId[opts.picked]) st.byId[opts.picked].el.classList.add('picked');
    fitCamera();
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    st.loop = (ts) => {
      if (!st) return;
      st.raf = 0;
      const dt = st.frameT ? ts - st.frameT : 16; st.frameT = ts;
      st.slow = st.slow * 0.95 + (dt > 24 ? 1 : 0) * 0.05; /* teléfono lento: física a la mitad de cuadros */
      const half = st.slow > 0.5 && !st.ptrs.size;
      const c0 = performance.now();
      if (!half || st.t % 2 === 0) step(); else st.t++;
      if ((st.t === 70 || st.t === 200) && !st.touched && !st.opts.focus) { if (st.t === 70) fitCamera(); else st.fly = { from: Object.assign({}, st.cam), to: viewFor(bounds(st.nodes)), t: 0 }; }
      if (st.t === 70 && st.opts.focus) { focus(st.opts.focus); st.opts.focus = null; }
      flyStep();
      draw();
      st.cost = (st.cost || 0) * 0.95 + (performance.now() - c0) * 0.05;
      if (st.sleeping) return;
      st.raf = requestAnimationFrame(st.loop);
    };
    st.raf = requestAnimationFrame(st.loop);
    return st.nodes.length;
  }

  /* Despierta la animación (al tocar, al cambiar algo); se duerme sola cuando todo queda quieto. */
  function wake() {
    if (!st) return;
    st.calm = false; st.still = 0;
    if (st.sleeping) { st.sleeping = false; st.frameT = 0; if (!st.raf) st.raf = requestAnimationFrame(st.loop); }
  }

  function bounds(nodes) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    nodes.forEach((n) => { x0 = Math.min(x0, n.x - n.r); x1 = Math.max(x1, n.x + n.r); y0 = Math.min(y0, n.y - n.r); y1 = Math.max(y1, n.y + n.r + 34); });
    return { x0, y0, x1, y1 };
  }
  function viewFor(b) {
    const w = st.stage.clientWidth || 360; const h = st.stage.clientHeight || 500;
    /* Centra en el espacio libre entre el encabezado y el texto de ayuda de abajo */
    let top = 0, bottom = 0;
    const scr = st.stage.closest('.map-screen');
    if (scr) {
      const sr = st.stage.getBoundingClientRect();
      const head = scr.querySelector('.map-jump') || scr.querySelector('.map-head');
      if (head) top = Math.max(0, head.getBoundingClientRect().bottom - sr.top + 10);
      const hint = scr.querySelector('.map-hint');
      if (hint) bottom = Math.max(0, sr.bottom - hint.getBoundingClientRect().top + 10);
    }
    const avail = Math.max(140, h - top - bottom);
    const k = Math.max(0.25, Math.min(1.15, Math.min(w / (b.x1 - b.x0 + 60), avail / (b.y1 - b.y0 + 20))));
    return { k, x: -(b.x0 + b.x1) / 2, y: -(b.y0 + b.y1) / 2 + (top - bottom) / (2 * k) };
  }
  function fitCamera() {
    if (!st.nodes.length) return;
    Object.assign(st.cam, viewFor(bounds(st.nodes)));
  }
  /* Vuela con suavidad a una zona: todo, un sistema, un núcleo, cine o las sueltas. */
  function focus(key) {
    if (!st || !st.nodes.length) return;
    let nodes = st.nodes;
    if (key === 'cine') nodes = st.nodes.filter((n) => n.comp === st.cineComp);
    else if (key === 'sueltas') nodes = st.nodes.filter((n) => !n.struct);
    else if (key && key.startsWith('s:')) { const n0 = st.nodes.find((n) => n.nuc && n.nuc.systemId === key.slice(2)); nodes = n0 ? st.nodes.filter((n) => n.comp === n0.comp) : []; }
    else if (key && key.startsWith('n:')) { const n0 = st.byId[key]; nodes = n0 ? st.nodes.filter((n) => n.comp === n0.comp) : []; }
    if (!nodes.length) return;
    st.fly = { from: Object.assign({}, st.cam), to: viewFor(bounds(nodes)), t: 0 };
    wake();
  }
  function flyStep() {
    const f = st.fly; if (!f) return;
    f.t = Math.min(1, f.t + 0.06); const e = 1 - Math.pow(1 - f.t, 3);
    st.cam.k = f.from.k + (f.to.k - f.from.k) * e; st.cam.x = f.from.x + (f.to.x - f.from.x) * e; st.cam.y = f.from.y + (f.to.y - f.from.y) * e;
    if (f.t >= 1) st.fly = null;
  }

  function step() {
    st.t++;
    const N = st.nodes; const sizes = st.compSizes;
    /* centros de cada estructura (una sola pasada) */
    const C = {};
    N.forEach((p) => { const c = C[p.comp] || (C[p.comp] = { x: 0, y: 0, n: 0, ext: 0, px: 0, py: 0 }); c.x += p.x; c.y += p.y; c.n++; });
    Object.keys(C).forEach((k) => { C[k].x /= C[k].n; C[k].y /= C[k].n; });
    N.forEach((p) => { const c = C[p.comp]; c.ext = Math.max(c.ext, Math.hypot(p.x - c.x, p.y - c.y) + p.r); });
    st.cents = C;
    const heavyC = st.heavy >= 0 ? C[st.heavy] : { x: 0, y: 0, ext: 0 };
    const frozen = (n) => n.fixed || (st.calm && n.struct);

    /* repulsión entre vecinos (cuadrícula): nadie se encima */
    const grid = new Map();
    N.forEach((n, i) => { const key = Math.floor(n.x / CELL) + ',' + Math.floor(n.y / CELL); (grid.get(key) || grid.set(key, []).get(key)).push(i); });
    N.forEach((a, i) => {
      const gx = Math.floor(a.x / CELL), gy = Math.floor(a.y / CELL);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const cell = grid.get((gx + ox) + ',' + (gy + oy)); if (!cell) continue;
        for (const j of cell) {
          if (j <= i) continue;
          const b = N[j];
          if (a.fixed || b.fixed) continue; /* la que arrastras no empuja: así puedes acercarla */
          const fa = frozen(a), fb = frozen(b); if (fa && fb) continue;
          let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01;
          const range = a.r + b.r + (a.comp === b.comp ? 50 : 90);
          if (d < range) {
            const f = (range - d) * 0.035; dx /= d; dy /= d;
            if (!fa) { a.vx -= dx * f; a.vy -= dy * f; }
            if (!fb) { b.vx += dx * f; b.vy += dy * f; }
          }
        }
      }
    });
    if (!st.calm) {
      /* proyectos distintos guardan distancia entre sí */
      const keys = Object.keys(C).filter((k) => sizes[k] > 1 || Number(k) === st.cineComp || N.some((n) => n.comp === Number(k) && n.nuc));
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
        const A = C[keys[i]], B = C[keys[j]];
        let dx = B.x - A.x, dy = B.y - A.y; const d = Math.hypot(dx, dy) || 0.01; const want = A.ext + B.ext + GAP;
        if (d < want) { const f = (want - d) * 0.004; dx /= d; dy /= d; A.px -= dx * f; A.py -= dy * f; B.px += dx * f; B.py += dy * f; }
      }
      /* lazos: resortes suaves */
      st.edges.forEach((e) => {
        const a = e.a, b = e.b; let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01;
        const f = (d - (a.r + b.r + 70)) * 0.01; dx /= d; dy /= d;
        if (!a.fixed) { a.vx += dx * f; a.vy += dy * f; }
        if (!b.fixed) { b.vx -= dx * f; b.vy -= dy * f; }
      });
      /* ataduras: la principal tira fuerte (ahí orbita), las demás suave */
      st.tethers.forEach((t) => {
        const a = t.a, b = t.b; let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01;
        const f = (d - (a.r + b.r + 60)) * (t.primary ? 0.014 : 0.003); dx /= d; dy /= d;
        if (!a.fixed) { a.vx += dx * f; a.vy += dy * f; }
        if (!b.fixed) { b.vx -= dx * f * 0.4; b.vy -= dy * f * 0.4; }
      });
      /* núcleos de un mismo sistema: cerca, pero sin encimarse */
      st.sys.forEach((l) => {
        const a = l.a, b = l.b; let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 0.01;
        const f = (d - (a.r + b.r + 260)) * 0.004; dx /= d; dy /= d;
        if (!a.fixed) { a.vx += dx * f; a.vy += dy * f; }
        if (!b.fixed) { b.vx -= dx * f; b.vy -= dy * f; }
      });
    }
    let maxSp = 0;
    N.forEach((n) => {
      if (frozen(n)) { n.vx = 0; n.vy = 0; return; }
      if (n.struct) {
        /* las estructuras caen despacio hacia su lugar; cine tiene su propia región, aparte */
        const c = C[n.comp];
        const ax = n.comp === st.cineComp ? heavyC.x + heavyC.ext + 240 : 0; const ay = n.comp === st.cineComp ? heavyC.y + heavyC.ext * 0.3 + 170 : 0;
        const g = n.comp === st.heavy ? 0.0016 : 0.0009;
        n.vx -= (n.x - ax) * g; n.vy -= (n.y - ay) * g;
        n.vx += (c.x - n.x) * 0.0012 + c.px; n.vy += (c.y - n.y) * 0.0012 + c.py;
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
      if (n.struct) maxSp = Math.max(maxSp, sp);
    });
    /* calma: si las estructuras ya no se mueven, se congelan (solo orbitan las sueltas) y, si no hay ninguna, se duerme */
    if (!st.ptrs.size && !st.drag && !st.fly) {
      st.still = maxSp < 0.3 ? st.still + 1 : 0;
      if (st.still > 90) { st.calm = true; if (!st.orbiters) st.sleeping = true; }
    }
  }

  function lazoD(a, b, wob) {
    const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const ux = dx / d, uy = dy / d;
    const x0 = a.x + ux * a.r, y0 = a.y + uy * a.r, x1 = b.x - ux * b.r, y1 = b.y - uy * b.r;
    const sag = 10 + wob;
    const mx = (x0 + x1) / 2 - uy * sag, my = (y0 + y1) / 2 + ux * sag;
    return 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
  }

  function draw() {
    const w = st.stage.clientWidth, h = st.stage.clientHeight; const k = st.cam.k;
    const camKey = st.cam.x.toFixed(1) + ',' + st.cam.y.toFixed(1) + ',' + k.toFixed(3) + ',' + w + ',' + h;
    const camMoved = camKey !== st.camKey;
    if (camMoved) {
      st.camKey = camKey;
      st.world.style.transform = 'translate(' + (w / 2 + st.cam.x * k) + 'px,' + (h / 2 + st.cam.y * k) + 'px) scale(' + k + ')';
      st.stage.classList.toggle('far', k < 0.5);
    }
    /* lo que queda fuera de la pantalla no se redibuja */
    const m = 160 / k;
    const vx0 = -w / 2 / k - st.cam.x - m, vx1 = w / 2 / k - st.cam.x + m, vy0 = -h / 2 / k - st.cam.y - m, vy1 = h / 2 / k - st.cam.y + m;
    st.nodes.forEach((n) => {
      const vis = n.x + n.r > vx0 && n.x - n.r < vx1 && n.y + n.r > vy0 && n.y - n.r < vy1;
      if (vis !== n.vis) { n.vis = vis; n.el.style.visibility = vis ? '' : 'hidden'; if (vis) n.px = NaN; }
      if (!vis) return;
      if (Math.abs(n.x - n.px) < 0.08 && Math.abs(n.y - n.py) < 0.08) return;
      n.px = n.x; n.py = n.y;
      n.el.style.transform = 'translate(' + (n.x - n.r).toFixed(1) + 'px,' + (n.y - n.r).toFixed(1) + 'px)';
    });
    const wobble = st.t % 4 === 0 && !st.calm;
    st.edges.forEach((e) => {
      const moved = e.a.px !== e.ax || e.a.py !== e.ay || e.b.px !== e.bx || e.b.py !== e.by;
      if (!moved && !wobble && e.drawn) return;
      if (!e.a.vis && !e.b.vis && e.drawn) return;
      e.ax = e.a.px; e.ay = e.a.py; e.bx = e.b.px; e.by = e.b.py; e.drawn = true;
      const d = lazoD(e.a, e.b, Math.sin(st.t / 70 + e.ph) * 6);
      e.paths.forEach((p) => p.setAttribute('d', d));
    });
    st.tethers.forEach((t) => {
      const a = t.a, b = t.b;
      if (t.drawn && a.px === t.ax && a.py === t.ay && b.px === t.bx && b.py === t.by) return;
      t.ax = a.px; t.ay = a.py; t.bx = b.px; t.by = b.py; t.drawn = true;
      const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const ux = dx / d, uy = dy / d;
      const p = 'M' + (a.x + ux * a.r).toFixed(1) + ' ' + (a.y + uy * a.r).toFixed(1) + 'L' + (b.x - ux * b.r).toFixed(1) + ' ' + (b.y - uy * b.r).toFixed(1);
      t.paths.forEach((x) => x.setAttribute('d', p));
    });
    if (st.drag && st.near) st.preview.setAttribute('d', lazoD(st.drag.node, st.near, 0));
    else if (st.previewOn !== false) st.preview.setAttribute('d', '');
    st.previewOn = !!(st.drag && st.near);
    /* regiones (sistemas y cine) y minimapa: cada pocos cuadros */
    if (st.cents && (st.t % 6 === 0 || !st.regionsDrawn)) {
      st.regionsDrawn = true;
      Object.keys(st.regionEls).forEach((c) => {
        const C = st.cents[c]; const el = st.regionEls[c]; if (!C) return;
        const R = C.ext + 34;
        el.style.transform = 'translate(' + (C.x - R).toFixed(0) + 'px,' + (C.y - R).toFixed(0) + 'px)';
        el.style.width = el.style.height = Math.round(R * 2) + 'px';
      });
    }
    if (camMoved || st.t % 20 === 0) drawMini(vx0 + m, vx1 - m, vy0 + m, vy1 - m);
  }

  function drawMini(x0, x1, y0, y1) {
    const box = $('#map-mini'); if (!box || !st.nodes.length) return;
    const allIn = st.nodes.every((n) => n.vis); box.hidden = allIn; if (allIn) return;
    const b = bounds(st.nodes); const W = 74, H = 92;
    const bx0 = Math.min(b.x0, x0), bx1 = Math.max(b.x1, x1), by0 = Math.min(b.y0, y0), by1 = Math.max(b.y1, y1);
    const s = Math.min(W / (bx1 - bx0), H / (by1 - by0));
    const ox = (W - (bx1 - bx0) * s) / 2 - bx0 * s, oy = (H - (by1 - by0) * s) / 2 - by0 * s;
    const C = st.cents || {};
    box.innerHTML = Object.keys(C).filter((c) => st.compSizes[c] > 1 || Number(c) === st.cineComp).map((c) => {
      const r = Math.max(3, C[c].ext * s);
      const col = Number(c) === st.cineComp ? 'rgba(176,58,111,.45)' : st.regions[c] ? 'rgba(46,107,71,.45)' : 'rgba(120,100,70,.35)';
      return '<span style="left:' + (ox + C[c].x * s - r).toFixed(0) + 'px;top:' + (oy + C[c].y * s - r).toFixed(0) + 'px;width:' + (2 * r).toFixed(0) + 'px;height:' + (2 * r).toFixed(0) + 'px;background:' + col + '"></span>';
    }).join('') + '<i style="left:' + (ox + x0 * s).toFixed(0) + 'px;top:' + (oy + y0 * s).toFixed(0) + 'px;width:' + ((x1 - x0) * s).toFixed(0) + 'px;height:' + ((y1 - y0) * s).toFixed(0) + 'px"></i>';
  }

  const toWorld = (cx, cy) => {
    const r = st.stage.getBoundingClientRect();
    return { x: (cx - r.left - r.width / 2) / st.cam.k - st.cam.x, y: (cy - r.top - r.height / 2) / st.cam.k - st.cam.y };
  };

  function onDown(e) {
    wake(); st.fly = null; st.touched = true;
    st.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { st.stage.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    if (st.ptrs.size === 2) { st.drag = null; st.pan = null; st.pinch = pinchState(); return; }
    const moon = e.target.closest('.luna');
    if (moon && st.opts.edit) {
      st.moonTap = { idea: moon.closest('.canica').dataset.id, q: moon.dataset.q, sx: e.clientX, sy: e.clientY };
      return;
    }
    const nb = e.target.closest('.nucleo');
    if (nb && st.byId['n:' + nb.dataset.nuc]) {
      const n = st.byId['n:' + nb.dataset.nuc]; const w = toWorld(e.clientX, e.clientY);
      st.drag = { node: n, ox: n.x - w.x, oy: n.y - w.y, sx: e.clientX, sy: e.clientY, moved: false, hist: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
      return;
    }
    const b = e.target.closest('.canica');
    if (b && st.byId[b.dataset.id]) {
      const n = st.byId[b.dataset.id]; const w = toWorld(e.clientX, e.clientY);
      st.drag = { node: n, ox: n.x - w.x, oy: n.y - w.y, sx: e.clientX, sy: e.clientY, moved: false, hist: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
      return;
    }
    const lazo = e.target.closest('g[data-key]');
    const teth = e.target.closest('g[data-tether]');
    st.pan = { sx: e.clientX, sy: e.clientY, cx: st.cam.x, cy: st.cam.y, moved: false, lazo: lazo ? lazo.dataset.key : null, tether: teth ? teth.dataset.tether : null };
  }

  function pinchState() {
    const p = Array.from(st.ptrs.values());
    return { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), k: st.cam.k };
  }

  function onMove(e) {
    if (!st.ptrs.has(e.pointerId)) return;
    st.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (st.moonTap && Math.hypot(e.clientX - st.moonTap.sx, e.clientY - st.moonTap.sy) > 8) st.moonTap = null;
    if (st.pinch && st.ptrs.size === 2) {
      const p = Array.from(st.ptrs.values()); const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      st.cam.k = Math.max(0.25, Math.min(2.2, st.pinch.k * d / (st.pinch.d || 1)));
      return;
    }
    const dr = st.drag;
    if (dr) {
      if (!dr.moved && Math.hypot(e.clientX - dr.sx, e.clientY - dr.sy) < 7) return;
      if (!st.opts.edit) { /* en modo elegir, arrastrar mueve el mapa */
        st.pan = { sx: dr.sx, sy: dr.sy, cx: st.cam.x, cy: st.cam.y, moved: true }; st.drag = null; return;
      }
      if (!dr.moved) st.calm = false;
      dr.moved = true; dr.node.fixed = true; dr.node.el.classList.add('grab');
      const w = toWorld(e.clientX, e.clientY);
      dr.node.x = w.x + dr.ox; dr.node.y = w.y + dr.oy; dr.node.vx = 0; dr.node.vy = 0;
      dr.hist.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (dr.hist.length > 6) dr.hist.shift();
      let best = null; let bd = Infinity;
      if (!dr.node.idea) return; /* un núcleo solo se mueve */
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
    if (st.moonTap) { const m = st.moonTap; st.moonTap = null; showMoon(m.idea, m.q); return; }
    const dr = st.drag; st.drag = null;
    if (dr) {
      const n = dr.node; n.fixed = false; n.el.classList.remove('grab');
      if (!n.idea) { if (!dr.moved) { if (st.opts.edit) go('#/nucleo/' + n.nuc.id); } else savePos(n); return; }
      if (!dr.moved) { st.opts.onTap(n.id, n); return; }
      const near = st.near; st.near = null; if (near) near.el.classList.remove('near');
      if (near && near.nuc) {
        if (!n.idea.nuclei.includes(near.nuc.id)) {
          await attachToNucleus(n.id, near.nuc.id);
          if (!st) return;
          topology();
          toast('Atada a ' + nucleusTitle(near.nuc).slice(0, 30));
        }
        if (st) savePos(n);
        return;
      }
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
        const prev = (n.idea.related || []).slice(); const prevN = (n.idea.nuclei || []).slice();
        if (prev.length || prevN.length) {
          await detach(n.id);
          n.idea.nuclei = []; await persist('ideas', n.idea);
          if (!st) return;
          topology();
          toast('Idea suelta: ahora orbita sola', { label: 'Deshacer', fn: async () => { for (const r of prev) await relateIdeas(n.id, r); n.idea.nuclei = prevN; await persist('ideas', n.idea); if (st) topology(); } });
        }
      }
      if (st) savePos(n);
      return;
    }
    const pan = st.pan; st.pan = null;
    if (pan && !pan.moved && pan.tether && st.opts.edit) {
      const [ia, nid] = pan.tether.split('>'); const A = byId('ideas', ia), B = byId('nuclei', nid);
      if (A && B && confirm('¿Desatar "' + ideaTitle(A) + '" del núcleo "' + nucleusTitle(B) + '"?')) { await detachFromNucleus(ia, nid); if (st) topology(); }
      return;
    }
    if (pan && !pan.moved && pan.lazo && st.opts.edit) {
      const [ia, ib] = pan.lazo.split('|'); const A = byId('ideas', ia), B = byId('ideas', ib);
      if (A && B && confirm('¿Cortar el lazo entre "' + ideaTitle(A) + '" y "' + ideaTitle(B) + '"?')) {
        await unrelateIdeas(ia, ib); if (st) topology();
      }
    }
  }

  function onWheel(e) {
    e.preventDefault(); wake(); st.touched = true;
    st.cam.k = Math.max(0.25, Math.min(2.2, st.cam.k * (e.deltaY > 0 ? 0.92 : 1.08)));
  }

  function savePos(n) { POS[n.id] = { x: Math.round(n.x), y: Math.round(n.y) }; }

  function stop() {
    if (!st) return;
    cancelAnimationFrame(st.raf);
    st.nodes.forEach((n) => {
      const p = { x: Math.round(n.x), y: Math.round(n.y) };
      POS[n.id] = p;
      const obj = n.idea || n.nuc; const old = obj.mapPos;
      if (!old || Math.abs(old.x - p.x) + Math.abs(old.y - p.y) > 40) { obj.mapPos = p; DB.put(n.idea ? 'ideas' : 'nuclei', obj); }
    });
    hideMoon();
    st = null;
  }

  function pick(id) {
    if (!st) return;
    st.nodes.forEach((n) => n.el.classList.toggle('picked', n.id === id));
  }

  window.addEventListener('resize', () => wake());

  return { mount, stop, pick, focus, fit: () => { if (st) { st.fly = { from: Object.assign({}, st.cam), to: viewFor(bounds(st.nodes)), t: 0 }; wake(); } }, info: () => st && { cost: Math.round(st.cost * 100) / 100, calm: st.calm, sleeping: st.sleeping, t: st.t, cine: st.cineComp, comps: st.compSizes.length } };
})();

/* Tarjeta de la luna tocada */
function showMoon(ideaId, qid) {
  const idea = byId('ideas', ideaId); const card = $('#moon-card');
  if (!idea || !card) return;
  const q = (idea.questions || []).find((x) => x.id === qid); if (!q) return;
  card.innerHTML = '<div class="row between"><span class="eyebrow-s">Luna de ' + esc(ideaTitle(idea)) + '</span><span class="small muted">' + (q.done ? 'Respondida' : 'Abierta') + '</span></div>' +
    '<p class="strong">' + esc(q.q) + '</p>' + (q.done && q.a ? '<p class="small muted">' + esc(q.a) + '</p>' : '') +
    '<div class="row gap"><a class="btn small-btn" href="#/idea/' + idea.id + '?q=' + q.id + '">' + (q.done ? 'Ver' : 'Responder') + '</a>' +
    '<a class="btn ghost small-btn" href="#/idea/' + idea.id + '">Abrir idea</a><button class="link-btn small" data-act="moonClose">Cerrar</button></div>';
  card.hidden = false;
}
function hideMoon() { const c = $('#moon-card'); if (c) c.hidden = true; }
ACTIONS.moonClose = hideMoon;

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

function viewMapa(qs) {
  const active = S.ideas.filter((i) => i.stage !== 'archivada');
  const n = active.length;
  const used = S.settings.sectors.filter((s) => active.some((i) => i.sectors.includes(s)));
  active.forEach((i) => i.sectors.forEach((s) => { if (!used.includes(s)) used.push(s); }));
  const openQ = active.reduce((a, i) => a + (i.questions || []).filter((q) => !q.done).length, 0);
  const sysUsed = S.systems.filter((x) => systemNuclei(x.id).length);
  const sub = n + ' ' + (n === 1 ? 'idea' : 'ideas') + (sysUsed.length ? ' · ' + sysUsed.length + (sysUsed.length === 1 ? ' sistema' : ' sistemas') : '') + (S.nuclei.length ? ' · ' + S.nuclei.length + (S.nuclei.length === 1 ? ' núcleo' : ' núcleos') : '') +
    (openQ ? ' · ' + openQ + (openQ === 1 ? ' pregunta' : ' preguntas') : '');
  const focusKey = (qs && qs.get('focus')) || null;
  onMount(() => { MAP.mount($('#map-stage'), { focus: focusKey }); });
  /* accesos rápidos: todo, sistemas, núcleos sueltos, cine y las ideas sueltas */
  const jumps = [{ k: '', label: 'Todo' }].concat(
    sysUsed.map((x) => ({ k: 's:' + x.id, label: systemTitle(x), dot: (nucColors(systemNuclei(x.id)[0])[0]) || '#5FA873' })),
    S.nuclei.filter((x) => !(x.systemId && byId('systems', x.systemId))).map((x) => ({ k: 'n:' + x.id, label: nucleusTitle(x), dot: nucColors(x)[0] || '#B9AE97' })),
    active.some((i) => i.sectors.includes('Cine') && !(i.nuclei || []).length && !(i.related || []).length) ? [{ k: 'cine', label: 'Cine', dot: sectorColor('Cine') }] : [],
    active.some((i) => !i.sectors.includes('Cine') && !(i.nuclei || []).length && !(i.related || []).length) ? [{ k: 'sueltas', label: 'Sueltas', dot: '#B7B5AC' }] : []);
  const dots = used.slice(0, 6).map((s) => '<span class="ldot" style="background:' + sectorColor(s) + '"></span>').join('');
  const open = !!UI.mapLegend;
  return '<section class="map-screen">' +
    '<header class="map-head"><div><h1>Mapa</h1><p>' + sub + '</p></div>' +
    '<div class="row gap-s">' + (used.length ? '<button class="map-btn legend-btn" data-act="mapLegend" aria-expanded="' + open + '"><span class="ldots">' + dots + '</span>' + used.length + ' tags' + icon(open ? 'up' : 'down', 16) + '</button>' : '') +
    '<button class="map-btn" data-act="mapFit" aria-label="Centrar mapa"><svg class="ic" width="20" height="20" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>' +
    '</div></header>' +
    (used.length ? '<div class="map-legend" id="map-legend" aria-label="Leyenda"' + (open ? '' : ' hidden') + '>' + used.map((s) => '<span><span class="dot" style="background:' + sectorColor(s) + '"></span>' + esc(s) + '</span>').join('') +
      (S.nuclei.length ? '<span><span class="nuc-orb xs"></span>núcleo</span>' : '') +
      (active.some((i) => (i.questions || []).length) ? '<span><span class="luna-ico"></span>pregunta</span><span><span class="luna-ico done"></span>respondida</span>' : '') + '</div>' : '') +
    (jumps.length > 2 ? '<div class="map-jump chips scroll-x" role="group" aria-label="Ir a">' + jumps.map((j) => '<button type="button" class="chip" data-act="mapJump" data-k="' + esc(j.k) + '">' + (j.dot ? '<span class="dot" style="background:' + j.dot + '"></span>' : '') + esc(j.label) + '</button>').join('') + '</div>' : '') +
    '<div id="moon-card" class="moon-card" role="dialog" aria-label="Pregunta" hidden></div>' +
    '<div id="map-stage" class="map-stage" aria-label="Mapa de ideas"></div>' +
    (n ? '<div id="map-mini" class="map-mini" aria-hidden="true"></div><p class="map-hint">Acerca una canica a otra o a un núcleo para unirlas · Avienta una para soltarla · Toca un lazo para cortarlo</p>'
      : '<div class="map-empty"><p>Aún no hay canicas.</p><a class="btn light" href="#/capture">Sembrar la primera idea</a></div>') +
    '</section>';
}

ACTIONS.mapFit = () => MAP.fit();
ACTIONS.mapJump = (el) => { $$('.map-jump .chip').forEach((c) => c.classList.toggle('on', c === el)); if (el.dataset.k) MAP.focus(el.dataset.k); else MAP.fit(); };
ACTIONS.mapLegend = (el) => {
  UI.mapLegend = !UI.mapLegend; const lg = $('#map-legend'); if (lg) lg.hidden = !UI.mapLegend;
  el.setAttribute('aria-expanded', UI.mapLegend); const ic = $('svg', el); if (ic) ic.outerHTML = icon(UI.mapLegend ? 'up' : 'down', 16);
};
