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
  return Object.assign({ id: uid(), kind, title: '', text: '', forSession: kind === 'terapia', status: 'pendiente', talkedAt: null, takeaway: '' }, fields || {});
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

/* ================= LISTA ================= */
route(/^#\/cuaderno$/, viewJournal, 'cuaderno');

function viewJournal() {
  /* Limpia entradas que se abrieron y quedaron vacías. */
  S.journal.filter((e) => !(e.text || '').trim() && !(e.title || '').trim()).forEach((e) => removeItem('journal', e.id));

  const f = UI.journalFilter || 'todo';
  if (!UI.topicChecks) UI.topicChecks = new Set();
  const filters = [['todo', 'Todo']].concat(Object.keys(JOURNAL_KINDS).map((k) => [k, JOURNAL_KINDS[k].plural]));
  const list = S.journal.filter((e) => f === 'todo' || e.kind === f).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  let html = '<header class="topbar"><div class="topbar-title"><h1>Cuaderno</h1><p class="row gap-s">' + icon('lock', 13) + 'Privado · fuera del mapa y de la IA</p></div>' +
    '<div class="topbar-actions"><button class="btn dark small-btn" data-act="journalNew">' + icon('plus', 16) + 'Escribir</button></div></header>';

  html += '<div class="chips scroll-x" role="group" aria-label="Filtrar">' + filters.map(([id, label]) => chip(label, { on: f === id, data: { act: 'journalFilter', f: id } })).join('') + '</div>';

  if (f === 'todo' || f === 'terapia') html += sessionCard();
  html += monthCard();

  html += '<div class="stack">' + (list.length ? list.map(journalCard).join('')
    : emptyState(f === 'todo' ? 'Tu cuaderno está vacío' : 'Nada aquí todavía', 'Escribe un poema, un pensamiento suelto o algo que quieras llevar a tu próxima sesión.', '<button class="btn" data-act="journalNew">Escribir</button>')) + '</div>';
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

function monthCard() {
  const now = new Date();
  const y = now.getFullYear(); const m = now.getMonth();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const byDay = {};
  S.journal.forEach((e) => {
    const d = new Date(e.createdAt);
    if (d.getFullYear() === y && d.getMonth() === m) {
      const k = d.getDate();
      if (!byDay[k] || byDay[k].at < e.createdAt) byDay[k] = { kind: e.kind, at: e.createdAt };
    }
  });
  const written = Object.keys(byDay).length;
  const poems = S.journal.filter((e) => { const d = new Date(e.createdAt); return e.kind === 'poema' && d.getFullYear() === y && d.getMonth() === m; }).length;
  const month = fmtDate(now, { month: 'long' });
  let cells = '';
  for (let d = 1; d <= daysIn; d++) {
    const k = byDay[d] ? ' jk-' + byDay[d].kind : '';
    cells += '<span class="day' + k + (d === now.getDate() ? ' today' : '') + '" title="' + d + '"></span>';
  }
  return '<section class="card" aria-label="Días con escritura este mes">' +
    '<div class="row between"><h2 class="h2 m0 cap">' + esc(month) + ' · escribiste ' + written + (written === 1 ? ' día' : ' días') + '</h2>' +
    (poems ? '<span class="small muted">' + poems + (poems === 1 ? ' poema' : ' poemas') + '</span>' : '') + '</div>' +
    '<div class="month-grid" role="img" aria-label="Escribiste ' + written + ' días este mes">' + cells + '</div>' +
    '<div class="row gap small muted wrap">' + Object.keys(JOURNAL_KINDS).map((k) => '<span class="row gap-s"><span class="day jk-' + k + '"></span>' + JOURNAL_KINDS[k].label + '</span>').join('') + '</div></section>';
}

function journalCard(e) {
  const st = statusLabel(e);
  const body = e.kind === 'poema'
    ? (e.title.trim() ? '<p class="j-card-title">' + esc(e.title) + '</p>' : '') + '<p class="j-poem clamp6">' + esc(e.text) + '</p>'
    : '<p class="clamp4 pre">' + esc(e.text) + '</p>';
  return '<a class="card j-card" href="#/nota/' + e.id + '">' +
    '<div class="row between"><span class="j-kind jk-' + e.kind + '"><span class="day jk-' + e.kind + '"></span>' + esc(journalKind(e.kind).label) + '</span>' +
    '<span class="small muted">' + esc(journalWhen(e.createdAt)) + '</span></div>' + body +
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
  html += '<section class="section"><button class="btn danger-ghost small-btn" data-act="journalDelete" data-id="' + id + '">Eliminar entrada</button></section>';
  return html;
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

Object.assign(CHANGES, {
  topicCheck(el) { if (el.checked) UI.topicChecks.add(el.dataset.id); else UI.topicChecks.delete(el.dataset.id); }
});
