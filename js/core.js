/* Semillero — utilidades, estado y navegación. */
'use strict';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const nowISO = () => new Date().toISOString();
const DAY = 86400000;
const ACTIONS = {};   /* clic: data-act="nombre" */
const CHANGES = {};   /* cambio de select/archivo: data-change="nombre" */
const HOOKS = {};     /* después de editar un campo: "store.campo" */
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : Infinity);

const STAGES = [
  { id: 'semilla', label: 'Semilla' },
  { id: 'exploracion', label: 'Exploración' },
  { id: 'plan', label: 'Plan' },
  { id: 'proyecto', label: 'Proyecto' },
  { id: 'archivada', label: 'Archivada' }
];
const stageLabel = (id) => (STAGES.find((s) => s.id === id) || STAGES[0]).label;

const QUESTION_SETS = {
  general: {
    label: 'Generales',
    items: [
      { id: 'problema', q: '¿Qué problema resuelve o qué pregunta explora?' },
      { id: 'quien', q: '¿Para quién es?' },
      { id: 'existe', q: '¿Qué existe ya parecido?' },
      { id: 'siguiente', q: '¿Cuál es el siguiente paso mínimo?' },
      { id: 'riesgos', q: 'Riesgos y supuestos por validar' }
    ]
  },
  creativa: {
    label: 'Creativas',
    items: [
      { id: 'premisa', q: 'Premisa: ¿qué pasaría si…?' },
      { id: 'personaje', q: 'Personaje: ¿quién es y qué desea?' },
      { id: 'conflicto', q: '¿Qué se interpone? (conflicto)' },
      { id: 'tono', q: 'Tono y referentes' },
      { id: 'siguiente', q: '¿Cuál es el siguiente paso mínimo?' }
    ]
  }
};

const PALETTE = ['#7A4FB0', '#3C5FA8', '#C2410C', '#0F766E', '#4D7C0F', '#475569', '#BE185D', '#92400E', '#0369A1', '#A16207'];
const DEFAULT_SECTORS = ['Cine', 'Libros', 'Filosofía', 'Ing. biomédica', 'Matemáticas', 'Ciencias sociales', 'Tecnología', 'Agricultura'];
const CREATIVE_SECTORS = ['Cine', 'Libros'];

const FRAG_KINDS = [
  { id: 'escena', label: 'Escena' },
  { id: 'dialogo', label: 'Diálogo' },
  { id: 'trama', label: 'Trama' },
  { id: 'personaje', label: 'Personaje' },
  { id: 'imagen', label: 'Imagen / atmósfera' },
  { id: 'mundo', label: 'Mundo / lugar' }
];
const fragKindLabel = (id) => (FRAG_KINDS.find((k) => k.id === id) || FRAG_KINDS[0]).label;
const ADAPT_STATUS = ['Idea', 'Borrador', 'En revisión', 'Terminado'];

/* ---------- Estado en memoria, respaldado en IndexedDB ---------- */
const S = { ideas: [], inbox: [], sessions: [], works: [], fragments: [], adaptations: [], settings: null };
const UI = { ideaFilter: { q: '', stage: 'activas', sector: '' }, aiMode: 'diablo', adaptTab: 'editar', fragTab: 'editar' };

function defaultSettings() {
  return { id: 'main', name: '', apiKey: '', model: 'claude-sonnet-5-5', sectors: DEFAULT_SECTORS.slice(), lastBackup: null, lastReview: null, createdAt: nowISO() };
}

async function loadState() {
  for (const k of ['ideas', 'inbox', 'sessions', 'works', 'fragments', 'adaptations']) S[k] = await DB.all(k);
  S.settings = Object.assign(defaultSettings(), (await DB.get('settings', 'main')) || {});
}

const byId = (k, id) => S[k].find((x) => x.id === id);
const timers = {};

function persist(k, obj, delay) {
  obj.updatedAt = nowISO();
  const key = k + ':' + obj.id;
  clearTimeout(timers[key]);
  if (delay) {
    timers[key] = setTimeout(() => { delete timers[key]; DB.put(k, obj); }, delay);
    return Promise.resolve(obj);
  }
  return DB.put(k, obj);
}

async function addItem(k, obj) {
  obj.createdAt = obj.createdAt || nowISO();
  obj.updatedAt = nowISO();
  S[k].push(obj);
  await DB.put(k, obj);
  return obj;
}

async function removeItem(k, id) {
  S[k] = S[k].filter((x) => x.id !== id);
  await DB.del(k, id);
}

const saveSettings = () => DB.put('settings', S.settings);

function flushPending() {
  Object.keys(timers).forEach((key) => {
    clearTimeout(timers[key]);
    const i = key.indexOf(':');
    const k = key.slice(0, i);
    const obj = byId(k, key.slice(i + 1));
    if (obj) DB.put(k, obj);
    delete timers[key];
  });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPending(); });
window.addEventListener('pagehide', flushPending);

/* ---------- Modelo de ideas ---------- */
function newIdea(fields) {
  const sectors = (fields && fields.sectors) || [];
  return Object.assign({
    id: uid(), title: '', body: '', stage: 'semilla', sectors,
    qset: sectors.some((s) => CREATIVE_SECTORS.includes(s)) ? 'creativa' : 'general',
    answers: {}, links: [], photos: [], related: [], chat: [], aiAllowed: true
  }, fields || {});
}

function maturity(idea) {
  const set = QUESTION_SETS[idea.qset] || QUESTION_SETS.general;
  const done = set.items.filter((it) => (idea.answers[it.id] || '').trim()).length;
  return { done, total: set.items.length, pct: Math.round((done / set.items.length) * 100) };
}

function sectorColor(name) {
  const i = S.settings.sectors.indexOf(name);
  return PALETTE[(i < 0 ? name.length : i) % PALETTE.length];
}

function ideaTitle(idea) { return (idea && idea.title.trim()) || 'Idea sin título'; }

/* ---------- Similitud local (sin IA, sin red) ---------- */
const STOP = new Set('para como pero porque sobre entre desde hasta donde cuando todo toda todos todas este esta estos estas aquel aquella sería podría puede pueden tiene tienen hacer hace algo cada otro otra otros otras mismo misma solo sólo también tanto muy más menos sino aunque idea ideas tener quiero creo usar usando esto eso unos unas ellos ellas nuestro nuestra porque luego antes después entonces'.split(' '));

function tokens(text) {
  return new Set(String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9ñ]+/).filter((w) => w.length > 3 && !STOP.has(w)));
}

function ideaTokens(idea) {
  return tokens([idea.title, idea.title, idea.body, Object.values(idea.answers || {}).join(' '), (idea.sectors || []).join(' ')].join(' '));
}

function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  a.forEach((w) => { if (b.has(w)) n++; });
  return n / Math.sqrt(a.size * b.size);
}

function similarIdeas(text, excludeId, limit) {
  const t = tokens(text);
  return S.ideas.filter((i) => i.id !== excludeId && i.stage !== 'archivada')
    .map((i) => ({ idea: i, score: similarity(t, ideaTokens(i)) }))
    .filter((x) => x.score >= 0.12).sort((a, b) => b.score - a.score).slice(0, limit || 3);
}

function combinationPairs(limit) {
  const list = S.ideas.filter((i) => i.stage !== 'archivada');
  const toks = list.map(ideaTokens);
  const pairs = [];
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      if ((list[a].related || []).includes(list[b].id)) continue;
      const shareSector = list[a].sectors.some((s) => list[b].sectors.includes(s));
      const score = similarity(toks[a], toks[b]);
      if (score >= 0.15 && !shareSector) pairs.push({ a: list[a], b: list[b], score });
    }
  }
  return pairs.sort((x, y) => y.score - x.score).slice(0, limit || 2);
}

/* ---------- Fechas ---------- */
const fmtDate = (d, opts) => new Intl.DateTimeFormat('es-MX', opts).format(d);
const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parseLocal = (s) => { const [d, t] = s.split('T'); const [y, m, da] = d.split('-').map(Number); const [h, mi] = (t || '00:00').split(':').map(Number); return new Date(y, m - 1, da, h, mi); };

function relDays(iso) {
  const d = daysSince(iso);
  if (d === Infinity) return 'nunca';
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  return 'hace ' + d + ' días';
}

/* ---------- Íconos ---------- */
const ICONS = {
  back: '<path d="m15 18-6-6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  spark: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  camera: '<path d="M3 8a1 1 0 0 1 1-1h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="12" cy="13" r="4"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 14v6h14v-6"/>',
  film: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="m3 7 3-4h4l-3 4M10 7l3-4h4l-3 4M17 7l3-4"/>',
  merge: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="12" r="3"/><path d="M9 6h2a4 4 0 0 1 4 4v0M9 18h2a4 4 0 0 0 4-4v0"/>',
  send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'
};
const icon = (name, size) => '<svg aria-hidden="true" class="ic" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24">' + ICONS[name] + '</svg>';

/* ---------- Componentes de interfaz ---------- */
function topbar(opts) {
  const left = opts.back ? '<a class="icon-btn" href="' + esc(opts.back) + '" aria-label="Volver">' + icon('back') + '</a>' : '';
  return '<header class="topbar">' + left + '<div class="topbar-title"><h1>' + esc(opts.title) + '</h1>' +
    (opts.sub ? '<p>' + esc(opts.sub) + '</p>' : '') + '</div><div class="topbar-actions">' + (opts.actions || '') + '</div></header>';
}

function chip(label, opts) {
  opts = opts || {};
  const dot = opts.color ? '<span class="dot" style="background:' + opts.color + '"></span>' : '';
  const attrs = Object.keys(opts.data || {}).map((k) => ' data-' + k + '="' + esc(opts.data[k]) + '"').join('');
  return '<button type="button" class="chip' + (opts.on ? ' on' : '') + '" aria-pressed="' + (opts.on ? 'true' : 'false') + '"' + attrs + '>' + dot + esc(label) + '</button>';
}

function field(label, inputHtml, hint) {
  return '<label class="field"><span class="field-label">' + esc(label) + '</span>' + inputHtml + (hint ? '<span class="field-hint">' + hint + '</span>' : '') + '</label>';
}

function stagePill(stage) {
  return '<span class="stage stage-' + stage + '">' + esc(stageLabel(stage)) + '</span>';
}

function sectorTags(sectors) {
  return (sectors || []).map((s) => '<span class="tag"><span class="dot" style="background:' + sectorColor(s) + '"></span>' + esc(s) + '</span>').join('');
}

function ideaCard(idea) {
  const m = maturity(idea);
  return '<a class="card idea-card" href="#/idea/' + idea.id + '">' +
    '<div class="row between"><strong class="idea-card-title">' + esc(ideaTitle(idea)) + '</strong>' + stagePill(idea.stage) + '</div>' +
    '<div class="tags">' + sectorTags(idea.sectors) + '</div>' +
    '<div class="row between small muted"><span class="meter" aria-label="Madurez ' + m.pct + '%"><span style="width:' + m.pct + '%"></span></span><span>' + m.pct + '% · ' + relDays(idea.updatedAt) + '</span></div></a>';
}

function emptyState(title, text, action) {
  return '<div class="empty"><p class="empty-title">' + esc(title) + '</p><p>' + esc(text) + '</p>' + (action || '') + '</div>';
}

/* ---------- Hoja inferior, avisos y archivos ---------- */
function openSheet(title, html, onMount) {
  $('#sheet-title').textContent = title;
  $('#sheet-body').innerHTML = html;
  $('#sheet').hidden = false;
  document.body.classList.add('sheet-open');
  autosizeAll($('#sheet-body'));
  if (onMount) onMount($('#sheet-body'));
}
function closeSheet() {
  $('#sheet').hidden = true;
  $('#sheet-body').innerHTML = '';
  document.body.classList.remove('sheet-open');
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

function autosize(el) {
  el.style.height = 'auto';
  el.style.height = Math.max(el.scrollHeight + 2, 44) + 'px';
}
function autosizeAll(root) { $$('textarea.autosize', root).forEach(autosize); }

async function shareOrDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain' });
  try {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return true;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return false;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copiado'); } catch (e) { toast('No se pudo copiar'); }
}

/* Reduce fotos para que no llenen el teléfono (máx. 1600 px, JPEG). */
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function storePhotos(files, owner) {
  const ids = [];
  for (const f of Array.from(files || [])) {
    const data = await readPhoto(f);
    const id = uid();
    await DB.put('blobs', { id, data, owner, createdAt: nowISO(), updatedAt: nowISO() });
    ids.push(id);
  }
  return ids;
}

async function fillPhotos(root) {
  for (const img of $$('img[data-blob]', root)) {
    const b = await DB.get('blobs', img.dataset.blob);
    if (b) img.src = b.data;
  }
}

/* ---------- Navegación ---------- */
const ROUTES = [];
const route = (re, fn, tab) => ROUTES.push({ re, fn, tab });
let mounts = [];
const onMount = (fn) => mounts.push(fn);

function render(keepScroll) {
  const y = window.scrollY;
  const hash = location.hash || '#/';
  const [path, qs] = hash.split('?');
  const r = ROUTES.find((x) => x.re.test(path)) || ROUTES[0];
  const params = path.match(r.re).slice(1);
  mounts = [];
  let html;
  try { html = r.fn.apply(null, params.concat([new URLSearchParams(qs || '')])); } catch (e) { console.error(e); html = emptyState('Algo salió mal', e.message || String(e), '<a class="btn" href="#/">Volver al inicio</a>'); }
  $('#view').innerHTML = html;
  $$('.tabbar a[data-tab]').forEach((a) => {
    if (a.dataset.tab === r.tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  autosizeAll($('#view'));
  fillPhotos($('#view'));
  mounts.forEach((fn) => fn($('#view')));
  window.scrollTo(0, keepScroll ? y : 0);
}
const rerender = () => render(true);
const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };
