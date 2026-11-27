/* Semillero — Cuaderno: poemas, pensamientos y temas para terapia.
   Es privado: no aparece en el mapa, no se conecta con ideas y nunca se envía a la IA. */
'use strict';

const JOURNAL_KINDS = {
  poema: { label: 'Poema', plural: 'Poemas' },
  pensamiento: { label: 'Pensamiento', plural: 'Pensamientos' },
  terapia: { label: 'Para terapia', plural: 'Para terapia' }
};
const journalKind = (k) => JOURNAL_KINDS[k] || JOURNAL_KINDS.pensamiento;

function newJournal(fields) {
  const kind = (fields && fields.kind) || 'pensamiento';
  return Object.assign({ id: uid(), kind, title: '', text: '', photos: [], temp: null, leafPos: null, forSession: kind === 'terapia', status: 'pendiente', talkedAt: null, takeaway: '' }, fields || {});
}

function journalTitle(e) {
  if (e.kind === 'poema' && e.title.trim()) return e.title.trim();
  const first = (e.text || '').trim().split('\n')[0];
  return first.length > 80 ? first.slice(0, 77) + '…' : (first || 'Sin texto');
}

function pendingTopics() {
  return S.journal.filter((e) => e.kind === 'terapia' && e.forSession && e.status !== 'hablado' && (e.text || '').trim())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function therapyDateLabel(d) {
  return d ? fmtDate(parseLocal(d + 'T12:00'), { weekday: 'short', day: 'numeric', month: 'short' }) : '';
}

function journalWhen(iso) {
  const d = new Date(iso);
  const diff = Math.round((startOfToday() - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / DAY);
  const hour = fmtDate(d, { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return 'Hoy · ' + hour;
  if (diff === 1) return 'Ayer · ' + hour;
  if (diff < 7) return fmtDate(d, { weekday: 'long' }) + ' · ' + hour;
  return fmtDate(d, { day: 'numeric', month: 'short' });
}

function statusLabel(e) {
  if (e.kind !== 'terapia') return '';
  if (e.status === 'hablado') return 'Hablado' + (e.talkedAt ? ' el ' + fmtDate(parseLocal(e.talkedAt + 'T12:00'), { day: 'numeric', month: 'short' }) : '');
  return e.forSession ? 'Pendiente · próxima sesión' : 'Pendiente';
}

/* ================= EMOCIONES =================
   Inspiradas en las emociones de Intensamente, con intensidad suave, media o intensa. Un pensamiento puede llevar hasta dos. */
const EMOTIONS = [
  { id: 'alegria', label: 'Alegría', color: '#F2C230', desc: 'ligero, con ganas' },
  { id: 'calma', label: 'Calma', color: '#5DB896', desc: 'en paz, sin prisa' },
  { id: 'tristeza', label: 'Tristeza', color: '#4F7BD6', desc: 'pesado, bajito' },
  { id: 'nostalgia', label: 'Nostalgia', color: '#B48CC4', desc: 'extrañar algo' },
  { id: 'miedo', label: 'Miedo', color: '#7A5BC7', desc: 'alerta, inseguro' },
  { id: 'ansiedad', label: 'Ansiedad', color: '#EE8A3A', desc: 'adelantarse a todo' },
  { id: 'ira', label: 'Ira', color: '#D9443A', desc: 'algo no es justo' },
  { id: 'desagrado', label: 'Desagrado', color: '#7BAF3A', desc: 'esto no va conmigo' },
  { id: 'envidia', label: 'Envidia', color: '#2A9D8F', desc: 'quiero lo del otro' },
  { id: 'verguenza', label: 'Vergüenza', color: '#E58FB0', desc: 'quiero esconderme' },
  { id: 'aburrimiento', label: 'Aburrimiento', color: '#4A5794', desc: 'nada me mueve' }
];
const INTENSITY = ['suave', 'media', 'intensa'];
/* Temperaturas de la 0.4 → emoción + intensidad */
const TEMP_TO_EMO = { 1: { e: 'tristeza', i: 3 }, 2: { e: 'tristeza', i: 1 }, 3: { e: 'calma', i: 2 }, 4: { e: 'alegria', i: 2 }, 5: { e: 'ira', i: 3 } };
const emoDef = (id) => EMOTIONS.find((x) => x.id === id);
function shade(hex, i) {
  const c = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  const to = i === 1 ? 255 : i === 3 ? 0 : null; const t = i === 1 ? 0.45 : 0.22;
  return to == null ? hex : '#' + c.map((v) => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('');
}
/* Emociones de una entrada: [{ e, i, def, color }] (solo pensamientos). */
function emosOf(e) {
  if (!e || e.kind !== 'pensamiento') return [];
  let list = Array.isArray(e.emo) ? e.emo : (e.temp >= 1 && e.temp <= 5 ? [TEMP_TO_EMO[e.temp]] : []);
  return list.map((x) => { const def = emoDef(x.e); return def ? { e: x.e, i: x.i || 2, def, color: shade(def.color, x.i || 2) } : null; }).filter(Boolean);
}
const emoColor = (e) => { const l = emosOf(e); return l.length ? l[0].color : ''; };
const emoLabel = (x) => x.def.label + (x.i !== 2 ? ' ' + INTENSITY[x.i - 1] : '');
function emoChip(e) {
  const l = emosOf(e);
  return l.length ? '<span class="emo-chip">' + l.map((x) => '<span class="dot" style="background:' + x.color + '"></span>').join('') + esc(l.map(emoLabel).join(' + ')) + '</span>' : '';
}

/* ================= CUADERNO: ÁRBOL · CALENDARIO · BOSQUE ================= */
route(/^#\/cuaderno$/, viewJournal, 'cuaderno');

function journalMonth() {
  if (!UI.journalMonth) { const d = new Date(); UI.journalMonth = { y: d.getFullYear(), m: d.getMonth() }; }
  return UI.journalMonth;
}
const monthKey = (y, m) => y + '-' + pad(m + 1);
const inMonth = (e, y, m) => { const d = new Date(e.createdAt); return d.getFullYear() === y && d.getMonth() === m; };
const monthName = (y, m) => fmtDate(new Date(y, m, 1), { month: 'long', year: 'numeric' });

function viewJournal() {
  /* Limpia entradas que se abrieron y quedaron vacías. */
  S.journal.filter((e) => !(e.text || '').trim() && !(e.title || '').trim() && !(e.photos || []).length).forEach((e) => removeItem('journal', e.id));
  if (!UI.topicChecks) UI.topicChecks = new Set();
  const view = UI.journalView || 'arbol';
  let html = '<header class="topbar"><div class="topbar-title"><h1>Cuaderno</h1><p class="row gap-s">' + icon('lock', 13) + 'Privado · fuera del mapa y de la IA</p></div>' +
    '<div class="topbar-actions"><button class="btn dark small-btn" data-act="journalNew">' + icon('plus', 16) + 'Escribir</button></div></header>';
  html += '<div class="seg2" role="group" aria-label="Vista">' + [['arbol', 'Árbol'], ['calendario', 'Calendario'], ['lista', 'Lista']].map(([id, l]) =>
    '<button type="button" class="seg2-btn" aria-pressed="' + (view === id || (id === 'arbol' && view === 'bosque')) + '" data-act="journalView" data-v="' + id + '">' + l + '</button>').join('') + '</div>';
  if (view === 'arbol') html += treeView();
  else if (view === 'bosque') html += forestView();
  else if (view === 'lista') html += listView();
  else html += calendarView();
  return html;
}

function monthNav(label, sub) {
  const { y, m } = journalMonth(); const now = new Date();
  const isNow = y === now.getFullYear() && m === now.getMonth();
  return '<div class="month-nav"><button class="icon-btn sm" data-act="journalMonthStep" data-d="-1" aria-label="Mes anterior">' + icon('back', 16) + '</button>' +
    '<div class="center"><h2 class="h2 m0 cap center-h">' + label + '</h2><p class="small muted">' + sub + '</p></div>' +
    '<button class="icon-btn sm" data-act="journalMonthStep" data-d="1" aria-label="Mes siguiente"' + (isNow ? ' disabled' : '') + '>' + icon('chevron', 16) + '</button></div>';
}

/* ---------- Calendario ---------- */
function calendarView() {
  const f = UI.journalFilter || 'todo';
  const { y, m } = journalMonth();
  const keep = (e) => f === 'todo' || e.kind === f;
  const monthEntries = S.journal.filter((e) => inMonth(e, y, m) && keep(e));
  const byDay = {};
  monthEntries.forEach((e) => { const d = new Date(e.createdAt).getDate(); (byDay[d] = byDay[d] || []).push(e); });
  const days = Object.keys(byDay).length;
  const counts = {}; monthEntries.forEach((e) => { counts[e.kind] = (counts[e.kind] || 0) + 1; });
  const sub = days + (days === 1 ? ' día' : ' días') + (f === 'todo' ? Object.keys(JOURNAL_KINDS).map((k) => counts[k] ? ' · ' + counts[k] + ' ' + (counts[k] === 1 ? JOURNAL_KINDS[k].label : JOURNAL_KINDS[k].plural).toLowerCase() : '').join('') : '');
  const filters = [['todo', 'Todo']].concat(Object.keys(JOURNAL_KINDS).map((k) => [k, JOURNAL_KINDS[k].plural]));

  let html = '<div class="chips scroll-x" role="group" aria-label="Filtrar">' + filters.map(([id, label]) => chip(label, { on: f === id, data: { act: 'journalFilter', f: id } })).join('') + '</div>';
  if (f === 'todo' || f === 'terapia') html += sessionCard();

  const first = new Date(y, m, 1); const lead = (first.getDay() + 6) % 7; const daysIn = new Date(y, m + 1, 0).getDate();
  const today = new Date(); const sel = UI.journalDay && UI.journalDay.startsWith(monthKey(y, m)) ? Number(UI.journalDay.slice(8)) : 0;
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let d = 1; d <= daysIn; d++) {
    const es = byDay[d] || [];
    const emoCols = es.map(emoColor).filter(Boolean);
    const heat = emoCols.length ? emoCols[emoCols.length - 1] : '';
    const kinds = Object.keys(JOURNAL_KINDS).filter((k) => es.some((e) => e.kind === k));
    const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
    cells += '<button type="button" class="cal-day' + (es.length ? ' has' : '') + (isToday ? ' today' : '') + (d === sel ? ' sel' : '') + '"' +
      (heat ? ' style="--heat:' + heat + '"' : '') + ' data-act="journalDay" data-d="' + d + '" aria-pressed="' + (d === sel) + '" aria-label="' + d + ' · ' + es.length + (es.length === 1 ? ' entrada' : ' entradas') + '">' +
      '<span class="cal-n">' + d + '</span><span class="cal-dots">' + kinds.map((k) => '<span class="day jk-' + k + '"></span>').join('') + '</span></button>';
  }
  html += '<section class="card cal-card" aria-label="Calendario">' + monthNav(esc(monthName(y, m)), esc(sub)) +
    '<div class="cal-head" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>' +
    '<div class="cal-grid">' + cells + '</div>' +
    '<div class="row gap wrap small muted cal-legend">' + Object.keys(JOURNAL_KINDS).map((k) => '<span class="row gap-s"><span class="day jk-' + k + '"></span>' + JOURNAL_KINDS[k].label + '</span>').join('') +
    '<span class="row gap-s">Fondo = emoción del día<span class="emo-bar"></span></span></div></section>';

  const list = (sel ? (byDay[sel] || []) : monthEntries).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  html += '<div class="row between"><h2 class="h2 m0">' + (sel ? esc(fmtDate(new Date(y, m, sel), { weekday: 'long', day: 'numeric', month: 'long' })) : 'Todo el mes') + '</h2>' +
    (sel ? '<button class="link-btn small" data-act="journalDay" data-d="0">Ver todo el mes</button>' : '') + '</div>';
  html += '<div class="stack">' + (list.length ? list.map(journalCard).join('')
    : emptyState(sel ? 'Nada escrito este día' : 'Nada este mes', f === 'todo' ? 'Escribe un poema, un pensamiento o algo para tu próxima sesión.' : 'No hay entradas con este filtro.', '<button class="btn" data-act="journalNew">Escribir</button>')) + '</div>';
  return html;
}

function sessionCard() {
  const topics = pendingTopics();
  const date = S.settings.nextTherapy;
  const past = (S.settings.therapyLog || []).length;
  return '<section class="card session-card" aria-label="Para mi próxima sesión">' +
    '<div class="row between"><h2 class="h2 m0">Para mi próxima sesión</h2>' +
    '<button class="link-btn small" data-act="therapyDate">' + (date ? esc(therapyDateLabel(date)) : 'Elegir fecha') + '</button></div>' +
    (topics.length ? '<div class="stack-s">' + topics.map((e) =>
      '<label class="check-row"><input type="checkbox" data-change="topicCheck" data-id="' + e.id + '"' + (UI.topicChecks.has(e.id) ? ' checked' : '') + '><span>' + esc(journalTitle(e)) + '</span></label>').join('') + '</div>'
      : '<p class="small muted">Cuando escribas algo "Para terapia", aparecerá aquí para que no se te olvide.</p>') +
    '<div class="row between wrap gap">' +
    (topics.length ? '<button class="btn small-btn" data-act="sessionDone">Ya fui a la sesión</button>' : '<span></span>') +
    (past ? '<button class="link-btn small" data-act="sessionHistory">' + past + (past === 1 ? ' sesión anterior' : ' sesiones anteriores') + '</button>' : '') +
    '</div></section>';
}

function journalCard(e) {
  const st = statusLabel(e);
  const body = e.kind === 'poema'
    ? (e.title.trim() ? '<p class="j-card-title">' + esc(e.title) + '</p>' : '') + '<p class="j-poem clamp6">' + esc(e.text) + '</p>'
    : '<p class="clamp4 pre">' + esc(e.text) + '</p>';
  const ph = (e.photos || []).slice(0, 3);
  return '<a class="card j-card" href="#/nota/' + e.id + '">' +
    '<div class="row between"><span class="j-kind jk-' + e.kind + '"><span class="day jk-' + e.kind + '"></span>' + esc(journalKind(e.kind).label) + '</span>' +
    '<span class="row gap-s">' + emoChip(e) + '<span class="small muted">' + esc(journalWhen(e.createdAt)) + '</span></span></div>' + body +
    (ph.length ? '<span class="j-thumbs">' + ph.map((p) => '<img alt="" data-blob="' + p + '">').join('') + '</span>' : '') +
    (st ? '<span class="j-status' + (e.status === 'hablado' ? ' done' : '') + '">' + esc(st) + '</span>' : '') + '</a>';
}

/* ================= ENTRADA ================= */
route(/^#\/nota\/([^/?]+)$/, viewJournalEntry, 'cuaderno');

function viewJournalEntry(id) {
  const e = byId('journal', id);
  if (!e) return topbar({ title: 'Cuaderno', back: '#/cuaderno' }) + emptyState('No encontré esta entrada', 'Puede que se haya eliminado.', '<a class="btn" href="#/cuaderno">Volver al cuaderno</a>');
  const fld = (p) => 'data-field="journal|' + id + '|' + p + '"';
  onMount(() => { const t = $('#j-text'); if (t && !e.text) t.focus(); });

  let html = '<header class="topbar"><a class="icon-btn" href="#/cuaderno" aria-label="Volver al cuaderno">' + icon('back') + '</a>' +
    '<div class="topbar-title center"><p>' + esc(fmtDate(new Date(e.createdAt), { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</p></div>' +
    '<div class="topbar-actions"><a class="btn small-btn" href="#/cuaderno">Listo</a></div></header>';

  html += '<div class="chips" role="group" aria-label="Tipo de entrada">' + Object.keys(JOURNAL_KINDS).map((k) =>
    '<button type="button" class="chip j-chip jk-' + k + (e.kind === k ? ' on' : '') + '" aria-pressed="' + (e.kind === k) + '" data-act="journalKind" data-id="' + id + '" data-kind="' + k + '"><span class="day jk-' + k + '"></span>' + JOURNAL_KINDS[k].label + '</button>').join('') + '</div>';

  if (e.kind === 'poema') html += '<label class="sr" for="j-title">Título del poema</label><input id="j-title" class="j-title-input" type="text" placeholder="Título (opcional)" value="' + esc(e.title) + '" ' + fld('title') + '>';
  const ph = { poema: 'Escribe tu poema…', pensamiento: 'Lo que estás pensando…', terapia: '¿De qué quieres hablar en tu próxima sesión?' }[e.kind];
  html += '<label class="sr" for="j-text">Texto</label><textarea id="j-text" class="autosize ' + (e.kind === 'poema' ? 'j-poem-input' : 'j-text-input') + '" rows="6" placeholder="' + ph + '" ' + fld('text') + '>' + esc(e.text) + '</textarea>';

  html += '<div class="thumbs">' + (e.photos || []).map((p) =>
    '<button class="thumb" data-act="viewPhoto" data-blob="' + p + '" data-owner="journal|' + id + '" aria-label="Ver foto"><img alt="" data-blob="' + p + '"></button>').join('') +
    '<label class="thumb add">' + icon('camera') + '<span>Foto</span><input type="file" accept="image/*" multiple hidden data-change="journalPhotos" data-id="' + id + '"></label></div>';

  if (e.kind === 'pensamiento') html += emoPicker(e);

  if (e.kind === 'terapia') {
    const date = S.settings.nextTherapy;
    html += '<section class="card session-card" aria-label="Llevar a terapia">' +
      '<label class="switch"><input type="checkbox" ' + (e.forSession ? 'checked ' : '') + fld('forSession') + '><span>Añadir a mi próxima sesión' + (date ? ' · ' + esc(therapyDateLabel(date)) : '') + '</span></label>' +
      '<div class="seg2" role="group" aria-label="Estado">' +
      '<button type="button" class="seg2-btn" aria-pressed="' + (e.status !== 'hablado') + '" data-act="journalStatus" data-id="' + id + '" data-status="pendiente">Pendiente</button>' +
      '<button type="button" class="seg2-btn" aria-pressed="' + (e.status === 'hablado') + '" data-act="journalStatus" data-id="' + id + '" data-status="hablado">Ya lo hablé</button></div>' +
      (e.status === 'hablado' ? field('¿Qué te llevaste de la sesión?', '<textarea class="autosize" rows="3" placeholder="Una frase, una pregunta para seguir pensando…" ' + fld('takeaway') + '>' + esc(e.takeaway) + '</textarea>') : '') +
      '</section>';
  }

  html += '<p class="small muted row gap-s">' + icon('lock', 14) + 'Solo en este teléfono. No aparece en el mapa ni se envía a la IA.</p>';
  html += '<section class="section row gap wrap"><button class="btn ghost small-btn" data-act="journalToIdea" data-id="' + id + '">Convertir en idea</button>' +
    '<button class="btn danger-ghost small-btn" data-act="journalDelete" data-id="' + id + '">Eliminar entrada</button></section>';
  return html;
}

function emoPicker(e) {
  const cur = emosOf(e); const ids = cur.map((x) => x.e);
  const focus = UI.emoFocus && ids.includes(UI.emoFocus) ? UI.emoFocus : (ids[ids.length - 1] || null);
  const fx = cur.find((x) => x.e === focus);
  /* franja de la semana: la emoción principal de cada día */
  const days = [];
  for (let k = 6; k >= 0; k--) {
    const d = new Date(startOfToday().getTime() - k * DAY);
    const es = S.journal.filter((x) => emosOf(x).length && localDate(new Date(x.createdAt)) === localDate(d));
    days.push({ d, c: es.length ? emoColor(es[es.length - 1]) : '' });
  }
  const leafPrev = cur.length ? '<span class="emo-preview">' + leafSvgColors(cur.map((x) => x.color), 'pv-' + e.id) + '<span class="small"><strong>Así se verá tu hoja:</strong> ' + esc(cur.map(emoLabel).join(' con ').toLowerCase()) + '.</span></span>' : '';
  return '<section class="card emo-card" aria-label="Emociones">' +
    '<div class="emo-bar lg" aria-hidden="true"></div>' +
    '<div class="row between"><h2 class="h2 m0">¿Qué sientes?</h2><span class="small muted">hasta 2</span></div>' +
    '<div class="emo-grid" role="group" aria-label="Elige hasta dos emociones">' + EMOTIONS.map((x) => {
      const on = ids.includes(x.id);
      return '<button type="button" class="emo-opt' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="journalEmo" data-id="' + e.id + '" data-e="' + x.id + '" style="--ec:' + x.color + '">' +
        '<span class="emo-dot"></span><span class="emo-name">' + x.label + '</span><span class="emo-desc">' + x.desc + '</span></button>';
    }).join('') + '</div>' +
    (fx ? '<h3 class="h3">¿Qué tan fuerte? · ' + esc(fx.def.label) + '</h3><div class="emo-int" role="radiogroup" aria-label="Intensidad">' + [1, 2, 3].map((i) =>
      '<button type="button" role="radio" class="emo-i' + (fx.i === i ? ' on' : '') + '" aria-checked="' + (fx.i === i) + '" data-act="journalEmoInt" data-id="' + e.id + '" data-e="' + fx.e + '" data-i="' + i + '">' + leafSvgColors([shade(fx.def.color, i)], 'i' + i + e.id, 15) + '<span class="cap">' + INTENSITY[i - 1] + '</span></button>').join('') + '</div>' : '') +
    leafPrev + '</section>' +
    '<section class="card" aria-label="Tu semana"><h2 class="h2 m0">Tus pensamientos esta semana</h2>' +
    '<div class="week-strip">' + days.map((x) => '<span class="wk"><span class="wk-dot' + (x.c ? '' : ' empty') + '"' + (x.c ? ' style="background:' + x.c + '"' : '') + '></span>' +
      '<span class="small muted">' + esc(fmtDate(x.d, { weekday: 'narrow' })) + '</span></span>').join('') + '</div></section>';
}

/* Hoja de árbol con uno o dos colores (mitad y mitad). */
function leafSvgColors(cols, gid, w) {
  w = w || 22; const h = Math.round(w * 1.4);
  const fill = cols.length > 1 ? 'url(#lf-' + gid + ')' : (cols[0] || '#F4EEDC');
  return '<svg viewBox="-10 -14 20 28" width="' + w + '" height="' + h + '" aria-hidden="true">' +
    (cols.length > 1 ? '<defs><linearGradient id="lf-' + gid + '" x1="0" x2="1"><stop offset=".5" stop-color="' + cols[0] + '"/><stop offset=".5" stop-color="' + cols[1] + '"/></linearGradient></defs>' : '') +
    '<path d="M0 -13 C9 -7 9 7 0 13 C-9 7 -9 -7 0 -13Z" fill="' + fill + '" stroke="#2F2A20" stroke-width="1.3"/>' +
    '<path d="M0 -10 L0 11 M0 -2 L4 -6 M0 3 L-4 -1" stroke="#2F2A20" stroke-width=".8" opacity=".55" fill="none"/></svg>';
}

/* ---------- Lista: todos tus pensamientos, por fecha o juntos ---------- */
function listView() {
  const f = UI.journalFilter || 'pensamiento'; const mode = UI.journalListMode || 'fecha'; const emo = UI.journalEmo || '';
  const filters = [['todo', 'Todo']].concat(Object.keys(JOURNAL_KINDS).map((k) => [k, JOURNAL_KINDS[k].plural]));
  let html = '<div class="row gap"><label class="search-field grow">' + icon('search', 18) + '<span class="sr">Buscar en el cuaderno</span><input type="search" id="jl-q" placeholder="Buscar" value="' + esc(UI.journalQ || '') + '"></label>' +
    '<div class="seg-mini" role="group" aria-label="Orden"><button type="button" aria-pressed="' + (mode === 'fecha') + '" data-act="journalListMode" data-m="fecha">Por fecha</button><button type="button" aria-pressed="' + (mode === 'todo') + '" data-act="journalListMode" data-m="todo">Todo</button></div></div>';
  html += '<div class="chips scroll-x" role="group" aria-label="Filtrar">' + filters.map(([id, label]) => chip(label, { on: f === id, data: { act: 'journalFilter', f: id } })).join('') + '</div>';
  if (f === 'pensamiento' || f === 'todo') html += '<div class="emo-filter" role="group" aria-label="Filtrar por emoción"><span class="small muted">Emoción</span>' +
    EMOTIONS.map((x) => '<button type="button" class="emo-f' + (emo === x.id ? ' on' : '') + '" aria-pressed="' + (emo === x.id) + '" data-act="journalEmoFilter" data-e="' + x.id + '" style="background:' + x.color + '" aria-label="' + x.label + '"></button>').join('') + '</div>';
  html += '<div id="j-list">' + listItems() + '</div>';
  return html;
}
function listItems() {
  const f = UI.journalFilter || 'pensamiento'; const mode = UI.journalListMode || 'fecha'; const emo = UI.journalEmo || ''; const q = (UI.journalQ || '').trim().toLowerCase();
  const list = S.journal.filter((e) => (f === 'todo' || e.kind === f) && (!emo || emosOf(e).some((x) => x.e === emo)) &&
    (!q || ((e.title || '') + ' ' + (e.text || '')).toLowerCase().includes(q))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!list.length) return emptyState('Nada por aquí', q || emo ? 'Prueba con otra búsqueda o quita el filtro.' : 'Escribe un pensamiento desde el botón +.', '');
  const row = (e) => {
    const l = emosOf(e);
    return '<a class="j-row" href="#/nota/' + e.id + '">' + (e.kind === 'pensamiento' ? leafSvgColors(l.map((x) => x.color), 'jr-' + e.id, 20) : '<span class="day jk-' + e.kind + '"></span>') +
      '<span class="grow"><span class="j-row-text' + (mode === 'todo' ? ' clamp2' : '') + '">' + esc(e.kind === 'poema' && e.title ? e.title + ' — ' + e.text : e.text) + '</span>' +
      '<span class="small muted">' + (l.length ? '<strong class="j-row-emo">' + esc(l.map(emoLabel).join(' + ')) + '</strong> · ' : '') + esc(mode === 'todo' ? fmtDate(new Date(e.createdAt), { day: 'numeric', month: 'short', year: 'numeric' }) : fmtDate(new Date(e.createdAt), { hour: '2-digit', minute: '2-digit' })) + '</span></span>' +
      ((e.photos || [])[0] ? '<img class="j-row-img" alt="" data-blob="' + e.photos[0] + '">' : '') + '</a>';
  };
  if (mode === 'todo') return '<div class="stack-s">' + list.map(row).join('') + '</div>';
  const groups = [];
  list.forEach((e) => { const k = localDate(new Date(e.createdAt)); let g = groups[groups.length - 1]; if (!g || g.k !== k) groups.push(g = { k, items: [] }); g.items.push(e); });
  return groups.map((g) => '<h3 class="j-day cap">' + esc(journalWhen(g.items[0].createdAt).split(' · ')[0] === 'Hoy' ? 'Hoy' : fmtDate(parseLocal(g.k + 'T12:00'), { weekday: 'long', day: 'numeric', month: 'long' })) + '</h3><div class="stack-s">' + g.items.map(row).join('') + '</div>').join('');
}

/* ================= ACCIONES ================= */
Object.assign(ACTIONS, {
  journalFilter(el) { UI.journalFilter = el.dataset.f; rerender(); },
  async journalNew() {
    const f = UI.journalFilter;
    const e = newJournal({ kind: f && f !== 'todo' ? f : 'pensamiento' });
    await addItem('journal', e); go('#/nota/' + e.id);
  },
  async journalKind(el) {
    const e = byId('journal', el.dataset.id);
    const t = $('#j-text'); if (t) e.text = t.value;
    e.kind = el.dataset.kind;
    if (e.kind === 'terapia' && e.status !== 'hablado') e.forSession = true;
    await persist('journal', e); rerender();
  },
  async journalStatus(el) {
    const e = byId('journal', el.dataset.id);
    e.status = el.dataset.status;
    e.talkedAt = e.status === 'hablado' ? (e.talkedAt || localDate(new Date())) : null;
    await persist('journal', e); rerender();
  },
  async journalDelete(el) {
    if (!confirm('¿Eliminar esta entrada del cuaderno? No se puede deshacer.')) return;
    await removeItem('journal', el.dataset.id); go('#/cuaderno');
  },
  therapyDate() {
    openSheet('Próxima sesión', field('Fecha', '<input id="t-date" type="date" value="' + esc(S.settings.nextTherapy || localDate(new Date(Date.now() + 7 * DAY))) + '">') +
      '<button class="btn block" data-act="therapyDateSave">Guardar fecha</button>' +
      (S.settings.nextTherapy ? '<button class="btn ghost block" data-act="therapyDateClear">Quitar fecha</button>' : ''));
  },
  async therapyDateSave() { S.settings.nextTherapy = $('#t-date').value || ''; await saveSettings(); closeSheet(); rerender(); },
  async therapyDateClear() { S.settings.nextTherapy = ''; await saveSettings(); closeSheet(); rerender(); },
  async sessionDone() {
    const checked = pendingTopics().filter((e) => UI.topicChecks.has(e.id));
    if (!checked.length && !confirm('No marcaste ningún tema. ¿Registrar la sesión de todos modos? Los temas seguirán pendientes para la siguiente.')) return;
    const date = S.settings.nextTherapy && S.settings.nextTherapy <= localDate(new Date()) ? S.settings.nextTherapy : localDate(new Date());
    for (const e of checked) { e.status = 'hablado'; e.talkedAt = date; await persist('journal', e); }
    S.settings.therapyLog = (S.settings.therapyLog || []).concat([{ date, ids: checked.map((e) => e.id) }]);
    S.settings.nextTherapy = '';
    await saveSettings();
    UI.topicChecks = new Set();
    toast(checked.length ? 'Sesión registrada: ' + checked.length + (checked.length === 1 ? ' tema hablado' : ' temas hablados') : 'Sesión registrada');
    rerender();
    ACTIONS.therapyDate();
  },
  sessionHistory() {
    const log = (S.settings.therapyLog || []).slice().reverse();
    openSheet('Sesiones anteriores', '<div class="stack">' + log.map((s) => {
      const items = s.ids.map((id) => byId('journal', id)).filter(Boolean);
      return '<div class="card"><strong class="cap">' + esc(fmtDate(parseLocal(s.date + 'T12:00'), { weekday: 'long', day: 'numeric', month: 'long' })) + '</strong>' +
        (items.length ? items.map((e) => '<a class="list-row row gap" href="#/nota/' + e.id + '"><span class="grow">' + esc(journalTitle(e)) +
          (e.takeaway ? '<br><span class="small muted">Me llevé: ' + esc(e.takeaway) + '</span>' : '') + '</span>' + icon('chevron') + '</a>').join('')
          : '<p class="small muted">Sin temas marcados.</p>') + '</div>';
    }).join('') + '</div>');
  }
});

async function ideaToJournal(idea, kind) {
  const snap = JSON.parse(JSON.stringify(idea));
  const text = kind === 'poema' ? (plainText(idea.body) || idea.title) : [idea.title, plainText(idea.body)].filter((x) => x && x.trim()).join('\n');
  const photos = (idea.photos || []).slice();
  if (idea.ink && idea.ink.strokes && idea.ink.strokes.length && typeof inkToPng === 'function') {
    const id = uid(); await DB.put('blobs', { id, data: inkToPng(idea.ink), owner: 'journal|x', createdAt: nowISO(), updatedAt: nowISO() }); photos.push(id);
  }
  const e = newJournal({ kind, title: kind === 'poema' && plainText(idea.body) ? idea.title : '', text, photos, fromIdea: snap, createdAt: idea.createdAt });
  for (const r of (idea.related || []).slice()) await unrelateIdeas(idea.id, r);
  await addItem('journal', e);
  S.ideas = S.ideas.filter((x) => x.id !== idea.id); await DB.del('ideas', idea.id);
  return e;
}

async function journalToIdea(e) {
  const txt = e.kind === 'poema' && (e.title || '').trim() ? e.title.trim() + '\n' + e.text : e.text;
  const st = splitTitle(txt);
  const base = e.fromIdea ? e.fromIdea : newIdea({ createdAt: e.createdAt });
  const idea = Object.assign(base, { title: st.title, body: st.body, photos: (e.photos || []).slice() });
  if (!Array.isArray(idea.questions)) idea.questions = [];
  idea.nuclei = (idea.nuclei || []).filter((n) => byId('nuclei', n));
  const rel = (idea.related || []).slice(); idea.related = [];
  if (idea.stage === 'archivada') idea.stage = 'semilla';
  await addItem('ideas', idea);
  for (const r of rel) if (byId('ideas', r)) await relateIdeas(idea.id, r);
  await removeItem('journal', e.id);
  return idea;
}

Object.assign(ACTIONS, {
  journalView(el) { UI.journalView = el.dataset.v; if (el.dataset.y) { UI.forestYear = Number(el.dataset.y); UI.forestSel = null; } rerender(); if (el.dataset.v === 'bosque') window.scrollTo(0, 0); },
  journalMonthStep(el) {
    const { y, m } = journalMonth(); const d = new Date(y, m + Number(el.dataset.d), 1);
    UI.journalMonth = { y: d.getFullYear(), m: d.getMonth() }; UI.journalDay = null; UI.treeSel = null; rerender();
  },
  journalDay(el) {
    const d = Number(el.dataset.d); const { y, m } = journalMonth();
    UI.journalDay = d ? monthKey(y, m) + '-' + pad(d) : null; rerender();
  },
  async journalEmo(el) {
    const e = byId('journal', el.dataset.id); const id = el.dataset.e;
    let list = emosOf(e).map((x) => ({ e: x.e, i: x.i }));
    if (list.some((x) => x.e === id)) { list = list.filter((x) => x.e !== id); UI.emoFocus = null; }
    else { if (list.length >= 2) list.shift(); list.push({ e: id, i: 2 }); UI.emoFocus = id; }
    e.emo = list; delete e.temp; await persist('journal', e); rerender();
  },
  async journalEmoInt(el) {
    const e = byId('journal', el.dataset.id);
    e.emo = emosOf(e).map((x) => ({ e: x.e, i: x.e === el.dataset.e ? Number(el.dataset.i) : x.i })); delete e.temp; UI.emoFocus = el.dataset.e;
    await persist('journal', e); rerender();
  },
  journalListMode(el) { UI.journalListMode = el.dataset.m; rerender(); },
  journalEmoFilter(el) { UI.journalEmo = UI.journalEmo === el.dataset.e ? '' : el.dataset.e; rerender(); },
  journalToIdea(el) {
    openSheet('Convertir en idea', '<p class="small">El texto pasa a una hoja de idea (la primera oración será el título) y sus fotos la acompañan.</p>' +
      '<p class="small"><strong>Deja de ser privada:</strong> aparecerá como canica en el mapa y el asistente podrá leerla si la IA está activa.</p>' +
      '<button class="btn block" data-act="journalToIdeaGo" data-id="' + el.dataset.id + '">Convertir en idea</button>');
  },
  async journalToIdeaGo(el) {
    const idea = await journalToIdea(byId('journal', el.dataset.id));
    closeSheet(); toast('Ahora es una idea'); go('#/idea/' + idea.id);
  },
  ideaConvert(el) {
    const i = byId('ideas', el.dataset.id);
    openSheet('Convertir en…', '<p class="small">Pasará a tu <strong>Cuaderno</strong> privado: sale del mapa y la IA ya no podrá leerla. Se conservan el texto y las fotos (el dibujo se guarda como foto).' +
      ((i.related || []).length || (i.nuclei || []).length || (i.questions || []).length ? ' Sus lazos, núcleos y preguntas se guardan ocultos y vuelven si la conviertes otra vez en idea.' : '') + '</p>' +
      '<div class="stack-s">' + Object.keys(JOURNAL_KINDS).map((k) => '<button class="btn ghost block" data-act="ideaConvertGo" data-id="' + i.id + '" data-kind="' + k + '"><span class="day jk-' + k + '"></span>' + JOURNAL_KINDS[k].label + '</button>').join('') + '</div>');
  },
  async ideaConvertGo(el) {
    const e = await ideaToJournal(byId('ideas', el.dataset.id), el.dataset.kind);
    closeSheet(); toast('Ahora está en tu Cuaderno'); go('#/nota/' + e.id);
  }
});

Object.assign(CHANGES, {
  async journalPhotos(el) {
    const e = byId('journal', el.dataset.id); const t = $('#j-text'); if (t) e.text = t.value;
    toast('Guardando fotos…');
    const ids = await storePhotos(el.files, 'journal|' + e.id); e.photos = (e.photos || []).concat(ids); await persist('journal', e); rerender();
  },
  topicCheck(el) { if (el.checked) UI.topicChecks.add(el.dataset.id); else UI.topicChecks.delete(el.dataset.id); }
});
