/* Semillero — inicio, ideas, captura, bandeja y asistente de ideas. */
'use strict';

/* ================= INICIO ================= */
route(/^#?\/?$/, viewHome, 'home');

function viewHome() {
  const active = S.ideas.filter((i) => i.stage !== 'archivada');
  const name = S.settings.name ? ', ' + S.settings.name : '';
  const today = fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
  const backupAge = daysSince(S.settings.lastBackup);
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();

  let html = '<header class="topbar"><div class="brand">' + logo() + '<span>Semillero</span></div><div class="topbar-actions">' +
    '<a class="icon-btn" href="#/settings" aria-label="Ajustes">' + icon('gear') + '</a></div></header>';
  html += '<section class="hello"><p class="muted small cap">' + esc(today) + '</p><h1 class="display">Hola' + esc(name) + '</h1></section>';

  /* El árbol de este mes */
  const T = buildTree(y, m); const c = T.counts;
  const month = S.journal.filter((e) => inMonth(e, y, m));
  const leafCols = month.filter((e) => e.kind === 'pensamiento').map(emoColor).filter(Boolean).slice(-5);
  const mood = monthMood(y, m);
  html += '<a class="home-tree" href="#/cuaderno" data-act="homeTree"><span class="home-tree-art">' + T.svg + '</span><span class="home-tree-fade"></span>' +
    '<span class="home-tree-text"><span class="eyebrow-g">Tu árbol de ' + esc(fmtDate(now, { month: 'long' })) + '</span>' +
    '<strong>' + (c.t + c.p + c.r ? 'Creció ' + c.t + (c.t === 1 ? ' hoja' : ' hojas') + ', ' + c.p + (c.p === 1 ? ' liana' : ' lianas') + ' y ' + c.r + (c.r === 1 ? ' raíz' : ' raíces') : 'Recién plantado: escribe tu primer pensamiento del mes') + '</strong>' +
    (leafCols.length ? '<span class="row gap-s home-leaves">' + leafCols.map((col, k) => leafSvgColors([col], 'hl' + k, 12)).join('') + (mood ? '<span class="small muted">sobre todo ' + esc(mood.label.toLowerCase()) + '</span>' : '') + '</span>' : '') +
    '</span></a>';

  html += '<a class="new-dark" href="#/capture"><span class="grow"><strong>Nueva idea</strong><span>Idea, pregunta, actualización, poema o pensamiento</span></span><span class="new-dark-plus">' + icon('plus', 22) + '</span></a>';
  if (hasDraft()) html += '<a class="card row gap draft-card" href="#/capture">' + icon('plus') + '<span class="grow"><strong>Tienes un borrador sin guardar</strong><br><span class="small muted">' + esc(draftPreview()) + '</span></span>' + icon('chevron') + '</a>';

  /* Lo último: ideas, preguntas y cuaderno */
  const items = [];
  active.forEach((i) => {
    items.push({ at: i.createdAt, html: orbHtml(i, 'sm'), t: ideaTitle(i), s: 'Idea' + (i.nuclei && i.nuclei[0] && byId('nuclei', i.nuclei[0]) ? ' · ' + nucleusTitle(byId('nuclei', i.nuclei[0])) : ''), href: '#/idea/' + i.id });
    (i.questions || []).forEach((q) => items.push({ at: q.at || i.updatedAt, html: '<span class="last-ico moon-ico">' + moonIcon(q.done) + '</span>', t: q.q, s: 'Pregunta · orbita ' + ideaTitle(i), href: '#/idea/' + i.id + '?q=' + q.id }));
  });
  S.journal.forEach((e) => items.push({ at: e.createdAt, html: '<span class="last-ico jk-bg-' + e.kind + '">' + icon(e.kind === 'poema' ? 'feather' : e.kind === 'terapia' ? 'book' : 'cloud', 18) + '</span>', t: journalTitle(e), s: journalKind(e.kind).label + ' · Cuaderno', href: '#/nota/' + e.id }));
  const last = items.filter((x) => x.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 3);
  if (last.length) html += '<section class="card last-card"><div class="row between"><h2 class="h3 m0">Lo último</h2><a class="small" href="#/ideas">Ver todo</a></div>' +
    last.map((x) => '<a class="last-row" href="' + x.href + '">' + x.html + '<span class="grow"><strong>' + esc(x.t) + '</strong><span class="small muted">' + esc(x.s) + '</span></span><span class="small muted">' + esc(relShort(x.at)) + '</span></a>').join('') + '</section>';

  /* Cine y agenda, lado a lado */
  const work = S.works.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
  const cineIdea = active.filter((i) => i.sectors.includes('Cine')).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
  if (!UI.dyn) UI.dyn = { scope: 'home', id: pickOne(DYNAMICS).id };
  const dyn = dynById(UI.dyn.id);
  const cineBody = work ? '<strong>' + esc(work.title || 'Obra sin título') + '</strong><span class="small">' + plural(workFragments(work).length, 'fragmento', 'fragmentos') + ' · ' + plural(S.adaptations.filter((a) => a.workId === work.id).length, 'adaptación', 'adaptaciones') + '</span>'
    : cineIdea ? '<strong>' + esc(ideaTitle(cineIdea)) + '</strong><span class="small">Idea de cine</span>' : '<strong>Tu taller de cine</strong><span class="small">Escenas, diálogos y tramas</span>';
  const up = S.sessions.filter((x) => !x.done && parseLocal(x.start) >= startOfToday()).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3);
  const agendaRows = up.map((x) => '<span class="ag-row"><span class="ag-bar"></span><span class="grow"><span class="small muted">' + esc(sessionWhen(x)) + '</span><span class="ag-t">' + esc(targetTitle(x.target)) + '</span></span></span>');
  if (S.settings.nextTherapy && agendaRows.length < 3) agendaRows.push('<span class="ag-row"><span class="ag-bar t"></span><span class="grow"><span class="small muted">' + esc(therapyDateLabel(S.settings.nextTherapy)) + '</span><span class="ag-t">Terapia · ' + pendingTopics().length + ' temas</span></span></span>');
  html += '<div class="home-grid"><a class="cine-card" href="#/cine"><span class="row gap-s cine-h">' + icon('film', 17) + 'Cine</span>' + cineBody +
    '<span class="cine-dyn">' + icon('dice', 14) + esc(dyn.name) + '</span></a>' +
    '<a class="agenda-card" href="#/agenda"><span class="row gap-s cine-h">' + icon('cal', 17) + 'Agenda</span>' + (agendaRows.length ? agendaRows.join('') : '<span class="small muted">Sin sesiones próximas. Agenda una para avanzar un proyecto.</span>') + '</a></div>';

  const extra = [];
  const topics = typeof pendingTopics === 'function' ? pendingTopics() : [];
  if (topics.length && !S.settings.nextTherapy) extra.push('<a class="card row gap" href="#/cuaderno">' + icon('book') + '<span class="grow"><strong>' + topics.length + (topics.length === 1 ? ' tema' : ' temas') + ' para tu próxima sesión</strong><br><span class="small muted">Cuaderno</span></span>' + icon('chevron') + '</a>');
  if (S.inbox.length) extra.push('<a class="card row gap" href="#/inbox">' + icon('inbox') + '<span class="grow"><strong>' + S.inbox.length + ' en la bandeja</strong><br><span class="small muted">Capturas de antes, sin clasificar</span></span>' + icon('chevron') + '</a>');
  if (backupAge >= 7 && (S.ideas.length || S.journal.length)) extra.push('<a class="backup-row" href="#/settings">' + icon('shield', 19) + '<span class="grow"><strong>Respaldo pendiente</strong> · ' + (S.settings.lastBackup ? 'el último fue ' + relDays(S.settings.lastBackup) : 'aún no tienes respaldo fuera del teléfono') + '</span>' + icon('chevron', 16) + '</a>');
  if (extra.length) html += '<section class="stack">' + extra.join('') + '</section>';
  return html;
}

function relShort(iso) {
  const d = daysSince(iso);
  if (d <= 0) { const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000); return h < 1 ? 'ahora' : 'hace ' + h + ' h'; }
  if (d === 1) return 'ayer';
  if (d < 7) return fmtDate(new Date(iso), { weekday: 'short' });
  return fmtDate(new Date(iso), { day: 'numeric', month: 'short' });
}

function logo() {
  return '<svg aria-hidden="true" class="ic accent" width="24" height="24" viewBox="0 0 24 24"><path d="M12 21v-9"/><path d="M12 12C12 7 8 4 3 4c0 5 4 8 9 8z"/><path d="M12 14c0-4 3-7 8-7 0 4-3 7-8 7z"/></svg>';
}

function attentionRow(i, note) {
  const color = i.sectors[0] ? sectorColor(i.sectors[0]) : '#9AA0A6';
  return '<a class="card row gap" href="#/idea/' + i.id + '"><span class="dot lg" style="background:' + color + '"></span><span class="grow"><strong>' + esc(ideaTitle(i)) + '</strong><br><span class="small warn">' + esc(note) + '</span></span>' + icon('chevron') + '</a>';
}

/* ================= LISTA DE IDEAS ================= */
route(/^#\/ideas$/, viewIdeas, 'ideas');

function viewIdeas(qs) {
  if (qs.get('stage')) UI.ideaFilter.stage = qs.get('stage');
  const f = UI.ideaFilter;
  const stageChips = [{ id: 'activas', label: 'Activas' }].concat(STAGES).map((s) => chip(s.label, { on: f.stage === s.id, data: { act: 'filterStage', stage: s.id } })).join('');
  const sectorChips = chip('Todos los sectores', { on: !f.sector, data: { act: 'filterSector', sector: '' } }) +
    S.settings.sectors.map((s) => chip(s, { on: f.sector === s, color: sectorColor(s), data: { act: 'filterSector', sector: s } })).join('') +
    '<a class="chip ghost" href="#/tags">Editar tags</a>';
  const nucs = S.nuclei.slice().sort((a, b) => (a.status === 'activo' ? 0 : 1) - (b.status === 'activo' ? 0 : 1) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const nucRow = '<section class="section"><div class="row between"><h2 class="h2 m0">Núcleos</h2><button class="link-btn small" data-act="nucNew">+ Núcleo</button></div>' +
    (nucs.length ? '<div class="nuc-row scroll-x">' + S.systems.map(systemBadge).join('') + nucs.map(nucleusBadge).join('') + '</div>' : '<p class="small muted">Un núcleo es un proyecto: ata a él ideas que no se parecen entre sí pero sirven a lo mismo.</p>') + '</section>';
  onMount(() => { renderIdeaList(); });
  return topbar({ title: 'Jardín', sub: 'Todas tus ideas', actions: '<a class="btn small-btn" href="#/capture">' + icon('plus', 16) + 'Nueva</a>' }) +
    '<label class="search"><span class="sr">Buscar</span><input id="idea-search" type="search" placeholder="Buscar en tus ideas" value="' + esc(f.q) + '"></label>' +
    nucRow + '<div class="chips scroll-x">' + stageChips + '</div><div class="chips scroll-x">' + sectorChips + '</div>' +
    '<div id="idea-list" class="stack"></div>';
}

function renderIdeaList() {
  const box = $('#idea-list');
  if (!box) return;
  const f = UI.ideaFilter;
  const q = tokens(f.q);
  let list = S.ideas.slice();
  if (f.stage === 'activas') list = list.filter((i) => i.stage !== 'archivada');
  else list = list.filter((i) => i.stage === f.stage);
  if (f.sector) list = list.filter((i) => i.sectors.includes(f.sector));
  if (f.q.trim()) {
    const raw = f.q.trim().toLowerCase();
    list = list.filter((i) => {
      const hay = [i.title, plainText(i.body), Object.values(i.answers).join(' ')].join(' ').toLowerCase();
      if (hay.includes(raw)) return true;
      const t = ideaTokens(i); let hit = false; q.forEach((w) => { if (t.has(w)) hit = true; }); return hit;
    });
  }
  list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  box.innerHTML = list.length ? list.map(ideaCard).join('') : emptyState('Nada por aquí', f.q ? 'No hay ideas que coincidan con la búsqueda.' : 'Aún no hay ideas con este filtro.', '<a class="btn" href="#/capture">Capturar idea</a>');
}

Object.assign(ACTIONS, {
  filterStage(el) { UI.ideaFilter.stage = el.dataset.stage; location.hash === '#/ideas' ? rerender() : go('#/ideas'); },
  filterSector(el) { UI.ideaFilter.sector = el.dataset.sector; rerender(); }
});

/* ================= DETALLE DE IDEA ================= */
route(/^#\/idea\/([^/?]+)$/, viewIdea, 'ideas');

function hojaHtml(owner, title, body, attrsTitle, attrsBody, ink, opts) {
  opts = opts || {};
  return '<div class="hoja" id="hoja" data-owner="' + owner + '">' + inkLayer(ink) +
    '<label class="sr" for="hoja-title">Título</label><textarea id="hoja-title" class="hoja-title autosize" rows="1" placeholder="' + esc(opts.titlePh || 'Título') + '" enterkeyhint="next" ' + attrsTitle + '>' + esc(title) + '</textarea>' +
    blocksHtml(owner, body, opts.photos || [], opts.bodyPh) +
    '</div>' +
    '<button type="button" id="ink-fab" class="ink-fab" data-act="inkToggle" aria-pressed="false" aria-label="Dibujar en la hoja"><svg class="ic" width="24" height="24" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>';
}

/* La primera oración (o línea) de la hoja es el título; el resto baja a la nota. */
function splitHojaTitle(el) {
  const body = $('#hoja-body');
  if (!body) return false;
  const v = el.value;
  let cut = -1; let skip = 0;
  const nl = v.indexOf('\n');
  const m = v.match(/^(.+?[.!?…])\s+(?=\S)/);
  if (m && (nl < 0 || m[1].length < nl)) { cut = m[1].length; skip = m[0].length - m[1].length; } else if (nl >= 0) { cut = nl; skip = 1; }
  if (cut < 0) return false;
  const rest = v.slice(cut + skip);
  el.value = v.slice(0, cut).trim();
  body.value = rest + (body.value ? (rest ? '\n' : '') + body.value : '');
  autosize(el); autosize(body);
  body.focus();
  body.setSelectionRange(rest.length, rest.length);
  body.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && t.id === 'hoja-body' && e.key === 'Backspace' && t.selectionStart === 0 && t.selectionEnd === 0) {
    const title = $('#hoja-title'); if (!title) return;
    e.preventDefault();
    const n = title.value.length;
    title.focus(); title.setSelectionRange(n, n);
  }
});

function viewIdea(id, qs) {
  const idea = byId('ideas', id);
  UI.focusQ = qs && qs.get('q');
  if (!idea) return topbar({ title: 'Idea', back: '#/ideas' }) + emptyState('No encontré esta idea', 'Puede que se haya eliminado.', '<a class="btn" href="#/ideas">Ver el jardín</a>');
  const fld = (path) => 'data-field="ideas|' + id + '|' + path + '"';
  const related = idea.related.map((r) => byId('ideas', r)).filter(Boolean);
  const works = S.works.filter((w) => w.ideaId === id);
  const creative = idea.sectors.some((s) => CREATIVE_SECTORS.includes(s)) || works.length;

  onMount(() => {
    fitInk(); loadPreviews(idea);
    if (UI.focusQ) { const q = $('#q-' + UI.focusQ); if (q) { q.scrollIntoView({ block: 'center' }); const t = $('textarea', q); if (t) t.focus(); } UI.focusQ = null; }
    else if (!idea.title && !idea.body) $('#hoja-title').focus();
  });

  /* Abierta desde un núcleo: atrás regresa al núcleo y las flechas recorren sus ideas. */
  const from = qs && qs.get('from');
  let nucCtx = null;
  if (from && from.startsWith('n:')) {
    const nid = from.slice(2); const n = byId('nuclei', nid);
    if (n && idea.nuclei.includes(nid)) { const list = nucleusIdeas(nid); nucCtx = { n, list, k: list.findIndex((x) => x.id === id) }; }
  }
  let html;
  if (nucCtx) {
    const { n, list, k } = nucCtx; const q = '?from=n:' + n.id;
    const prev = list[k - 1]; const next = list[k + 1];
    html = '<header class="topbar crumb-bar"><a class="crumb" href="#/nucleo/' + n.id + '" aria-label="Volver al núcleo ' + esc(nucleusTitle(n)) + '">' + icon('back') + nucOrb(n, 'xs') + '<span>' + esc(nucleusTitle(n)) + '</span></a>' +
      '<div class="pager">' + (prev ? '<a class="icon-btn sm" href="#/idea/' + prev.id + q + '" aria-label="Idea anterior del núcleo">' + icon('back', 18) + '</a>' : '<span class="icon-btn sm off" aria-hidden="true">' + icon('back', 18) + '</span>') +
      '<span class="small muted">' + (k + 1) + ' de ' + list.length + '</span>' +
      (next ? '<a class="icon-btn sm" href="#/idea/' + next.id + q + '" aria-label="Siguiente idea del núcleo">' + icon('chevron', 18) + '</a>' : '<span class="icon-btn sm off" aria-hidden="true">' + icon('chevron', 18) + '</span>') + '</div></header>';
  } else html = topbar({ title: '', back: '#/ideas', actions: '<a class="icon-btn" href="#/mapa" aria-label="Ver en el mapa"><svg class="ic" width="20" height="20" viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="18" cy="9" r="3"/><circle cx="11" cy="18" r="3"/><path d="M8.6 8.4 9.8 15.3M8.9 6.6l6.2 1.6M16.4 11.6l-3.6 4.2"/></svg></a>' });

  html += hojaHtml('ideas|' + id, idea.title, idea.body, fld('title'), '', idea.ink, { photos: idea.photos });
  html += '<div id="relics" class="relics" data-id="' + id + '">' + relicsHtml(idea) + '</div>';

  html += '<div class="cap-tools idea-tools" role="toolbar" aria-label="Agregar a la hoja"><label class="tool-btn">' + icon('image', 19) + '<span>Imagen en el texto</span><input type="file" accept="image/*" multiple hidden data-change="blkImages" data-key="ideas|' + id + '"></label></div>';

  html += '<section class="section"><h2 class="h2">Estado</h2><div class="chips">' + STAGES.slice(0, 4).map((s) =>
    chip(s.label, { on: idea.stage === s.id, data: { act: 'ideaStage', id, stage: s.id } })).join('') + '</div>' +
    (idea.stage === 'archivada' ? '<p class="small warn">Archivada. Elige un estado para reactivarla.</p>' : '') + '</section>';

  html += '<section class="section"><div class="row gap-s"><h2 class="h2 m0">Tags</h2>' + orbHtml(idea, 'xs') + '<span class="small muted grow">su canica mezcla sus colores</span><a class="small" href="#/tags">Editar</a></div><div class="chips">' +
    S.settings.sectors.map((s) => chip(s, { on: idea.sectors.includes(s), color: sectorColor(s), data: { act: 'ideaSector', id, sector: s } })).join('') +
    '<button type="button" class="chip ghost" data-act="addSector" data-id="' + id + '">+ Tag</button></div></section>';

  html += '<section class="section"><div class="row between"><h2 class="h2 m0">Lazos</h2><a class="small" href="#/mapa">Unir en el mapa</a></div><div class="chips">' + (related.length ? related.map((r) =>
    '<span class="chip on-soft"><a href="#/idea/' + r.id + '">' + esc(ideaTitle(r)) + '</a><button class="x" data-act="unrelate" data-a="' + id + '" data-b="' + r.id + '" aria-label="Cortar lazo">×</button></span>').join('')
    : '<span class="small muted">Idea solitaria por ahora: orbita en el mapa.</span>') + '</div></section>';

  html += questionsHtml(idea);

  const nucs = idea.nuclei.map((n) => byId('nuclei', n)).filter(Boolean);
  const freeNucs = S.nuclei.filter((n) => !idea.nuclei.includes(n.id));
  html += '<section class="section"><div class="row between"><h2 class="h2 m0">Núcleos</h2><button class="link-btn small" data-act="ideaToNucleus" data-id="' + id + '">Convertir en núcleo</button></div>' +
    (nucs.length ? '<div class="chips">' + nucs.map((n, k) => '<span class="chip on-soft nuc-chip">' + nucOrb(n, 'xs') + '<a href="#/nucleo/' + n.id + '">' + esc(nucleusTitle(n)) + '</a>' +
      (k === 0 ? '<span class="pill on">principal</span>' : '<button class="link-btn small" data-act="ideaNucPrimary" data-idea="' + id + '" data-nuc="' + n.id + '">hacer principal</button>') +
      '<button class="x" data-act="ideaNucDetach" data-idea="' + id + '" data-nuc="' + n.id + '" aria-label="Quitar de ' + esc(nucleusTitle(n)) + '">×</button></span>').join('') + '</div>'
      : '<p class="small muted">' + (idea.stage === 'proyecto' ? 'Esta idea ya es un proyecto: conviértela en núcleo para atarle otras ideas.' : 'Átala a un proyecto (puede estar en varios).') + '</p>') +
    '<label class="sr" for="idea-nuc">Atar a un núcleo</label><select id="idea-nuc" data-change="ideaAddNuc" data-id="' + id + '"><option value="">Atar a un núcleo…</option>' +
    freeNucs.map((n) => '<option value="' + n.id + '">' + esc(nucleusTitle(n)) + '</option>').join('') + '<option value="__new">+ Núcleo nuevo…</option></select></section>';

  html += '<section class="section row gap wrap">' +
    '<button class="btn ghost small-btn" data-act="ideaConvert" data-id="' + id + '">Convertir en…</button>' +
    (creative ? '<button class="btn ghost small-btn" data-act="workFromIdea" data-id="' + id + '">' + icon('film', 16) + 'Llevar al taller de cine</button>' : '') +
    (idea.stage !== 'archivada' ? '<button class="btn ghost small-btn" data-act="ideaStage" data-id="' + id + '" data-stage="archivada">Archivar</button>' : '') +
    '<button class="btn danger-ghost small-btn" data-act="deleteIdea" data-id="' + id + '">Eliminar</button>' +
    '<span class="small muted grow right">Creada ' + relDays(idea.createdAt) + '</span></section>';
  return html;
}

function questionsHtml(idea) {
  const qs = idea.questions || [];
  const open = qs.filter((q) => !q.done).length;
  return '<section class="section" id="preguntas"><div class="row between"><h2 class="h2 m0">Preguntas</h2>' +
    (qs.length ? '<span class="small muted">' + open + (open === 1 ? ' abierta' : ' abiertas') + ' · ' + (qs.length - open) + (qs.length - open === 1 ? ' respondida' : ' respondidas') + '</span>' : '') + '</div>' +
    '<div class="stack-s">' + qs.map((q, k) => '<div class="q-row' + (q.done ? ' done' : '') + '" id="q-' + q.id + '">' +
      '<button class="q-moon" data-act="ideaQToggle" data-id="' + idea.id + '" data-q="' + q.id + '" aria-pressed="' + !!q.done + '" aria-label="' + (q.done ? 'Marcar como abierta' : 'Marcar como respondida') + '">' + moonIcon(q.done) + '</button>' +
      '<div class="grow"><label class="sr" for="qt-' + q.id + '">Pregunta</label><textarea id="qt-' + q.id + '" class="autosize q-text" rows="1" data-field="ideas|' + idea.id + '|questions.' + k + '.q">' + esc(q.q) + '</textarea>' +
      (q.done ? '<label class="sr" for="qa-' + q.id + '">Respuesta</label><textarea id="qa-' + q.id + '" class="autosize q-answer" rows="1" placeholder="¿Qué respondiste?" data-field="ideas|' + idea.id + '|questions.' + k + '.a">' + esc(q.a || '') + '</textarea>'
        : '<span class="small q-hint">Abierta · toca la luna cuando la respondas</span>') +
      '</div><button class="icon-btn sm" data-act="ideaQDel" data-id="' + idea.id + '" data-q="' + q.id + '" aria-label="Borrar pregunta">' + icon('trash', 16) + '</button></div>').join('') + '</div>' +
    '<div class="row gap"><label class="sr" for="q-new">Nueva pregunta</label><input id="q-new" class="grow" type="text" placeholder="Escribe una pregunta…" enterkeyhint="done" data-idea="' + idea.id + '">' +
    '<button class="btn small-btn" data-act="ideaQAdd" data-id="' + idea.id + '">Añadir</button></div>' +
    '<p class="small muted">Cada pregunta es una luna que orbita esta idea en el mapa.</p></section>';
}

async function addQuestion(idea, text) {
  text = String(text || '').trim();
  if (!text) return null;
  if (!/[?¿]/.test(text)) text = text.replace(/[.\s]+$/, '') + '?';
  if (!text.startsWith('¿') && text.endsWith('?')) text = '¿' + text;
  const q = { id: uid(), q: text, a: '', done: false, at: nowISO() };
  idea.questions.push(q); await persist('ideas', idea); return q;
}

Object.assign(ACTIONS, {
  async ideaQAdd(el) {
    const inp = $('#q-new'); const i = byId('ideas', el.dataset.id);
    if (!inp.value.trim()) { inp.focus(); return; }
    await addQuestion(i, inp.value); rerender(); const n = $('#q-new'); if (n) n.focus();
  },
  async ideaQToggle(el) {
    const i = byId('ideas', el.dataset.id); const q = i.questions.find((x) => x.id === el.dataset.q);
    q.done = !q.done; if (q.done) q.doneAt = nowISO(); await persist('ideas', i); rerender();
    if (q.done) { const a = $('#qa-' + q.id); if (a) a.focus(); }
  },
  async ideaQDel(el) {
    const i = byId('ideas', el.dataset.id);
    if (!confirm('¿Borrar esta pregunta?')) return;
    i.questions = i.questions.filter((x) => x.id !== el.dataset.q); await persist('ideas', i); rerender();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target && e.target.id === 'q-new' && e.key === 'Enter') { e.preventDefault(); const b = $('[data-act="ideaQAdd"]'); if (b) b.click(); }
});

HOOKS['ideas.title'] = (idea) => scheduleRelics(idea);
HOOKS['ideas.body'] = (idea) => scheduleRelics(idea);

function safeUrl(u) {
  const s = String(u || '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(s)) return 'https://' + s;
  return '#';
}

HOOKS['ideas.answers'] = (idea) => {
  const m = maturity(idea);
  const pct = $('#maturity-pct'); if (pct) pct.textContent = m.pct + '%';
  const c = $('#maturity-count'); if (c) c.textContent = m.done + ' de ' + m.total;
  const b = $('#maturity-bar'); if (b) b.style.width = m.pct + '%';
};

async function relateIdeas(aId, bId) {
  const a = byId('ideas', aId); const b = byId('ideas', bId);
  if (!a || !b || aId === bId) return;
  if (!a.related.includes(bId)) a.related.push(bId);
  if (!b.related.includes(aId)) b.related.push(aId);
  await persist('ideas', a); await persist('ideas', b);
}

async function combineIdeas(aId, bId) {
  const a = byId('ideas', aId); const b = byId('ideas', bId);
  if (!a || !b) return;
  const idea = newIdea({
    title: ideaTitle(a) + ' + ' + ideaTitle(b),
    body: 'Combinación de dos ideas.\n\n— ' + ideaTitle(a) + ':\n' + plainText(a.body).slice(0, 800) + '\n\n— ' + ideaTitle(b) + ':\n' + plainText(b.body).slice(0, 800),
    sectors: Array.from(new Set(a.sectors.concat(b.sectors))),
    related: [aId, bId]
  });
  await addItem('ideas', idea);
  await relateIdeas(idea.id, aId); await relateIdeas(idea.id, bId);
  toast('Nueva idea combinada');
  go('#/idea/' + idea.id);
}

Object.assign(ACTIONS, {
  async ideaStage(el) { const i = byId('ideas', el.dataset.id); i.stage = el.dataset.stage; await persist('ideas', i); rerender(); },
  async ideaSector(el) {
    const i = byId('ideas', el.dataset.id); const s = el.dataset.sector;
    i.sectors = i.sectors.includes(s) ? i.sectors.filter((x) => x !== s) : i.sectors.concat(s);
    await persist('ideas', i); rerender();
  },
  async addSector(el) {
    if (location.hash.startsWith('#/capture')) syncCapFields();
    const name = (prompt('Nombre del nuevo tag') || '').trim();
    if (!name) return;
    if (!S.settings.sectors.includes(name)) { S.settings.sectors.push(name); ensureTagColors(); await saveSettings(); }
    if (el.dataset.id) { const i = byId('ideas', el.dataset.id); if (i && !i.sectors.includes(name)) { i.sectors.push(name); await persist('ideas', i); } }
    
    rerender();
  },
  async ideaQset(el) { const i = byId('ideas', el.dataset.id); i.qset = el.dataset.qset; await persist('ideas', i); rerender(); },
  async ideaAddLink(el) {
    const input = $('#link-url'); const url = input.value.trim();
    if (!url) { input.focus(); return; }
    const i = byId('ideas', el.dataset.id); i.links.push({ url, label: '' }); await persist('ideas', i); rerender();
  },
  async ideaDelLink(el) { const i = byId('ideas', el.dataset.id); i.links.splice(Number(el.dataset.i), 1); await persist('ideas', i); rerender(); },
  async relate(el) { await relateIdeas(el.dataset.a, el.dataset.b); toast('Ideas conectadas'); rerender(); },
  async unrelate(el) {
    const a = byId('ideas', el.dataset.a); const b = byId('ideas', el.dataset.b);
    a.related = a.related.filter((x) => x !== b.id); if (b) b.related = b.related.filter((x) => x !== a.id);
    await persist('ideas', a); if (b) await persist('ideas', b); rerender();
  },
  combine(el) { if (confirm('¿Crear una idea nueva que combine ambas? Las originales se conservan.')) combineIdeas(el.dataset.a, el.dataset.b); },
  async deleteIdea(el) {
    const i = byId('ideas', el.dataset.id);
    if (!confirm('¿Eliminar "' + ideaTitle(i) + '"? Esta acción no se puede deshacer.')) return;
    for (const p of i.photos) await DB.del('blobs', p);
    S.ideas.forEach((o) => { if (o.related.includes(i.id)) { o.related = o.related.filter((x) => x !== i.id); persist('ideas', o); } });
    for (const s of S.sessions.filter((x) => x.target === 'idea:' + i.id)) await removeItem('sessions', s.id);
    await removeItem('ideas', i.id);
    toast('Idea eliminada'); go('#/ideas');
  },
  async viewPhoto(el) {
    const b = await DB.get('blobs', el.dataset.blob);
    if (!b) return;
    openSheet('Foto', '<img class="full-photo" alt="Foto de la idea" src="' + b.data + '"><div class="row gap"><button class="btn danger-ghost" data-act="deletePhoto" data-blob="' + b.id + '" data-owner="' + esc(el.dataset.owner) + '">Eliminar foto</button></div>');
  },
  async deletePhoto(el) {
    const [k, id] = el.dataset.owner.split('|');
    const obj = k === 'cap' ? UI.cap : byId(k, id);
    if (obj) { obj.photos = obj.photos.filter((p) => p !== el.dataset.blob); if (k === 'cap') saveDraft(true); else await persist(k, obj); }
    await DB.del('blobs', el.dataset.blob);
    closeSheet(); rerender();
  }
});

Object.assign(CHANGES, {
  async ideaPhotos(el) {
    const i = byId('ideas', el.dataset.id);
    toast('Guardando fotos…');
    const ids = await storePhotos(el.files, 'ideas|' + i.id);
    i.photos = i.photos.concat(ids); await persist('ideas', i); rerender();
  },
  async relateSelect(el) { if (el.value) { await relateIdeas(el.dataset.id, el.value); toast('Ideas conectadas'); rerender(); } },
  combineSelect(el) { if (el.value && confirm('¿Crear una idea nueva que combine ambas?')) combineIdeas(el.dataset.id, el.value); else el.value = ''; }
});

/* ================= NUEVA IDEA ================= */
route(/^#\/capture$/, viewCapture, '');

const CAP_TYPES = [
  { id: 'idea', label: 'Idea', ic: 'seed', hint: 'Una semilla nueva para tu jardín.' },
  { id: 'pregunta', label: 'Pregunta', ic: 'moon', hint: 'Una luna que orbita una de tus ideas.' },
  { id: 'actualizacion', label: 'Actualización', ic: 'update', hint: 'Se suma a la bitácora de una idea que ya existe.' },
  { id: 'poema', label: 'Poema', ic: 'feather', hint: 'Va a tu Cuaderno privado: fuera del mapa y de la IA.' },
  { id: 'pensamiento', label: 'Pensamiento', ic: 'cloud', hint: 'Va a tu Cuaderno privado: fuera del mapa y de la IA.' }
];
const isAnchoredKind = (k) => k === 'pregunta' || k === 'actualizacion';

function resetCapture() {
  /* La hoja aún en pantalla ya no es un borrador: que el cambio de pestaña no la vuelva a guardar. */
  const h = $('#hoja'); if (h && h.dataset.owner === 'cap') h.dataset.owner = 'done';
  UI.cap = { kind: 'idea', therapy: false, title: '', text: '', photos: [], anchorId: '', ink: null, tags: [], nucleusId: '' };
  UI.blkCaret = null;
  DB.del('settings', 'draft'); updateDraftDot();
}
/* Borradores de la 0.4 (dest: nueva / anclar / cuaderno) pasan al modelo de tipos. */
function normalizeCap(c) {
  if (c.dest) { c.kind = c.dest === 'cuaderno' ? 'pensamiento' : c.dest === 'anclar' ? (c.asQuestion ? 'pregunta' : 'actualizacion') : 'idea'; delete c.dest; delete c.asQuestion; }
  if (!c.kind) c.kind = 'idea';
  if (!Array.isArray(c.tags)) c.tags = [];
  if (!Array.isArray(c.photos)) c.photos = [];
  if (c.nucleusId == null) c.nucleusId = '';
  return c;
}

/* ---------- Borrador automático de la captura ---------- */
function hasDraft() {
  const c = UI.cap;
  return !!(c && (((c.title || '').trim()) || plainText(c.text) || (c.photos || []).length || (c.ink && c.ink.strokes && c.ink.strokes.length)));
}
function draftPreview() {
  const c = UI.cap; const t = ((c.title || '') + ' ' + plainText(c.text)).trim();
  return t ? (t.length > 60 ? t.slice(0, 57) + '…' : t) : ((c.photos || []).length ? 'Con imágenes' : 'Con un dibujo');
}
let draftTimer;
function saveDraft(now) {
  clearTimeout(draftTimer);
  const run = () => { if (hasDraft()) DB.put('settings', { id: 'draft', cap: UI.cap, updatedAt: nowISO() }); else DB.del('settings', 'draft'); updateDraftDot(); };
  if (now) run(); else draftTimer = setTimeout(run, 350);
}
function updateDraftDot() { const t = $('.tab-new'); if (t) t.classList.toggle('has-draft', hasDraft() && !location.hash.startsWith('#/capture')); }

function recentIdeas(n) {
  return S.ideas.filter((i) => i.stage !== 'archivada').sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))).slice(0, n);
}

function anchorResults(q) {
  q = (q || '').trim().toLowerCase();
  if (!q) {
    const list = recentIdeas(12);
    return '<div class="orb-row scroll-x anchor-orbs">' + list.map((i) => '<button type="button" class="orb-item" data-act="capAnchor" data-id="' + i.id + '">' + orbHtml(i, 'md') + '<span>' + esc(ideaTitle(i)) + '</span></button>').join('') + '</div>';
  }
  const list = S.ideas.filter((i) => i.stage !== 'archivada' && (ideaTitle(i) + ' ' + plainText(i.body) + ' ' + i.sectors.join(' ')).toLowerCase().includes(q)).slice(0, 8);
  if (!list.length) return '<p class="small muted">No encontré ideas con eso.</p>';
  return '<div class="stack-s">' + list.map((i) => '<button type="button" class="anchor-row" data-act="capAnchor" data-id="' + i.id + '">' + orbHtml(i, 'xs') + '<span class="grow">' + esc(ideaTitle(i)) + '</span>' + icon('chevron', 16) + '</button>').join('') + '</div>';
}

function anchorPickerHtml(c) {
  const a = c.anchorId && byId('ideas', c.anchorId);
  return '<section class="card anchor-pick" id="anchor-pick"><div class="row between"><h2 class="h3 m0">' + (c.kind === 'pregunta' ? '¿Qué idea orbita?' : '¿A qué idea pertenece?') + '</h2>' +
    (a ? '' : '<span class="req">obligatorio</span>') + '</div>' +
    (a ? '<div class="row gap anchor-sel">' + orbHtml(a, 'sm') + '<strong class="grow">' + esc(ideaTitle(a)) + '</strong><button type="button" class="link-btn small" data-act="capAnchor" data-id="">Cambiar</button></div>'
      : '<label class="search-field">' + icon('search', 18) + '<span class="sr">Buscar idea</span><input type="search" id="anchor-q" placeholder="Buscar entre tus ideas" autocomplete="off" enterkeyhint="search"></label>' +
        '<div id="anchor-results">' + anchorResults('') + '</div>') +
    '</section>';
}

function capTagsHtml(c) {
  const all = S.settings.sectors;
  const sel = c.tags.filter((t) => all.includes(t));
  const rest = all.filter((t) => !sel.includes(t));
  const nucSel = S.nuclei.length ? '<label class="mini-select"><span class="sr">Núcleo</span><select data-change="capNuc"><option value="">Sin núcleo</option>' +
    S.nuclei.map((n) => '<option value="' + n.id + '"' + (c.nucleusId === n.id ? ' selected' : '') + '>' + esc(nucleusTitle(n)) + '</option>').join('') + '</select></label>' : '';
  return '<section class="section cap-tags"><div class="row between"><h2 class="h3 m0">Tags</h2>' + nucSel + '</div><div class="chips scroll-x">' +
    sel.map((t) => '<button type="button" class="chip tag-on" aria-pressed="true" data-act="capTag" data-tag="' + esc(t) + '" style="--tc:' + sectorColor(t) + '"><span class="dot" style="background:' + sectorColor(t) + '"></span>' + esc(t) + '<span class="x" aria-hidden="true">×</span></button>').join('') +
    rest.map((t) => '<button type="button" class="chip tag-off" aria-pressed="false" data-act="capTag" data-tag="' + esc(t) + '"><span class="dot" style="background:' + sectorColor(t) + '"></span>' + esc(t) + '</button>').join('') +
    '<button type="button" class="chip ghost" data-act="capNewTag">+ Nuevo</button></div></section>';
}

function viewCapture() {
  if (!UI.cap || UI.cap.title == null) resetCapture();
  const c = normalizeCap(UI.cap);
  const T = CAP_TYPES.find((t) => t.id === c.kind) || CAP_TYPES[0];
  const anchored = isAnchoredKind(c.kind);
  const journal = c.kind === 'poema' || c.kind === 'pensamiento';
  const hasIdeas = S.ideas.some((i) => i.stage !== 'archivada');
  onMount(() => {
    fitInk();
    const t = $('#hoja-title'); if (t && !c.title && !plainText(c.text) && !(anchored && !c.anchorId)) t.focus();
  });
  const endsQ = /\?\s*$/.test((c.title || '').trim());
  const titlePh = { idea: 'Título', pregunta: '¿Cuál es la pregunta?', actualizacion: 'Qué avanzó (opcional)', poema: 'Título del poema (opcional)', pensamiento: 'Lo que estás pensando' }[c.kind];
  const bodyPh = { idea: 'Escribe libremente. La primera oración se vuelve el título.', pregunta: 'Contexto, si hace falta', actualizacion: 'Lo nuevo de esta idea', poema: 'Versos…', pensamiento: 'Sigue escribiendo…' }[c.kind];

  let html = topbar({ title: '', back: '#/', actions: '<button class="btn small-btn" data-act="capSave">Guardar</button>' });
  if (hasDraft()) html += '<p class="draft-note small row gap-s">' + icon('check', 14) + '<span class="grow">Borrador guardado en el teléfono</span><button class="link-btn small" data-act="capDiscard">Descartar</button></p>';
  html += '<div class="cap-types" role="group" aria-label="¿Qué vas a guardar?">' + CAP_TYPES.map((t) =>
    '<button type="button" class="cap-type" aria-pressed="' + (t.id === c.kind) + '" data-act="capKind" data-kind="' + t.id + '"' + (isAnchoredKind(t.id) && !hasIdeas ? ' disabled' : '') + '>' + icon(t.ic, 20) + '<span>' + t.label + '</span></button>').join('') + '</div>';
  html += '<p class="small muted cap-hint row gap-s">' + (journal ? icon('lock', 13) : '') + '<span>' + T.hint + '</span></p>';
  if (anchored) html += anchorPickerHtml(c);
  if (c.kind === 'pensamiento') html += '<label class="switch"><input type="checkbox" data-change="capTherapy"' + (c.therapy ? ' checked' : '') + '><span>Para terapia: lo llevo a mi próxima sesión</span></label>';
  html += hojaHtml('cap', c.title, c.text, '', '', c.ink, { photos: c.photos, titlePh, bodyPh });
  if (c.kind === 'idea' && endsQ && hasIdeas) html += '<button class="card soft-card row gap q-suggest" data-act="capKind" data-kind="pregunta">' + moonIcon(false) + '<span class="grow small"><strong>¿Es una pregunta?</strong> Guárdala como luna de una idea.</span>' + icon('chevron') + '</button>';
  if (c.kind === 'idea') html += capTagsHtml(c);
  html += '<div class="cap-tools" role="toolbar" aria-label="Agregar a la hoja">' +
    '<label class="tool-btn">' + icon('image', 19) + '<span>Imagen</span><input type="file" accept="image/*" multiple hidden data-change="blkImages" data-key="cap"></label>' +
    '<button type="button" class="tool-btn" data-act="inkToggle">' + icon('pen', 19) + '<span>Boceto</span></button></div>';
  html += '<p class="small muted row gap-s">' + icon('lock', 14) + 'Se guarda solo en este dispositivo.</p>';
  return html;
}

function syncCapFields() {
  const c = UI.cap; if (!c) return;
  const t = $('#hoja-title'); if (t && isCaptureSheet()) c.title = t.value;
  const r = $('.blocks[data-key="cap"]'); if (r) { const b = readBlocks(r); c.text = joinBlocks(b.segs, b.ids); }
}

/* Divide un texto en título (primera oración o línea) y cuerpo. */
function splitTitle(text) {
  const t = String(text || '').trim();
  const nl = t.indexOf('\n');
  const m = t.match(/^(.+?[.!?…])(\s|$)/);
  let title;
  if (m && (nl < 0 || m[1].length < nl)) title = m[1]; else title = nl >= 0 ? t.slice(0, nl) : t;
  title = title.trim();
  if (title.length > 90) title = title.slice(0, 70).replace(/\s+\S*$/, '') + '…';
  const body = title.endsWith('…') ? t : t.slice(title.length).trim();
  return { title, body };
}

async function appendCaptureToIdea(idea, cap) {
  const stamp = fmtDate(new Date(cap.createdAt || Date.now()), { day: 'numeric', month: 'short' });
  const text = [cap.title, cap.text].filter((x) => x && x.trim()).join('\n');
  if (text) idea.body = (idea.body ? idea.body + '\n\n' : '') + '— ' + stamp + ':\n' + text;
  if (cap.link) idea.links.push({ url: cap.link, label: '' });
  if (cap.photos && cap.photos.length) idea.photos = idea.photos.concat(cap.photos.filter((p) => !idea.photos.includes(p)));
  await persist('ideas', idea);
}

async function inkBlob(ink, owner) {
  const id = uid();
  await DB.put('blobs', { id, data: inkToPng(ink), owner, createdAt: nowISO(), updatedAt: nowISO() });
  return id;
}

Object.assign(ACTIONS, {
  homeTree() { UI.journalView = 'arbol'; UI.journalMonth = null; go('#/cuaderno'); },
  capKind(el) {
    syncCapFields(); UI.cap.kind = el.dataset.kind;
    saveDraft(); rerender();
    if (isAnchoredKind(UI.cap.kind) && !UI.cap.anchorId) setTimeout(() => { const q = $('#anchor-q'); if (q) q.focus(); }, 60);
  },
  capAnchor(el) { syncCapFields(); UI.cap.anchorId = el.dataset.id || ''; saveDraft(); rerender(); },
  capTag(el) {
    syncCapFields(); const t = el.dataset.tag; const tags = UI.cap.tags;
    UI.cap.tags = tags.includes(t) ? tags.filter((x) => x !== t) : tags.concat([t]);
    saveDraft(); rerender();
  },
  async capNewTag() {
    syncCapFields();
    const name = (prompt('Nombre del nuevo tag') || '').trim(); if (!name) return;
    if (!S.settings.sectors.includes(name)) { S.settings.sectors.push(name); ensureTagColors(); await saveSettings(); }
    if (!UI.cap.tags.includes(name)) UI.cap.tags.push(name);
    saveDraft(); rerender();
  },
  async capDiscard() {
    if (!confirm('¿Descartar el borrador? Se borra lo que escribiste, dibujaste y las imágenes.')) return;
    for (const p of UI.cap.photos || []) await DB.del('blobs', p);
    resetCapture(); rerender();
  },
  async capSave() {
    syncCapFields();
    const c = normalizeCap(UI.cap);
    const hasInk = !!(c.ink && c.ink.strokes && c.ink.strokes.length);
    const plain = plainText(c.text); const title = c.title.trim();
    if (!title && !plain && !c.photos.length && !hasInk) { toast('Escribe, dibuja o añade una imagen'); return; }
    let target = '#/';
    if (c.kind === 'poema' || c.kind === 'pensamiento') {
      if (!title && !plain) { toast('El cuaderno guarda texto: escribe algo'); return; }
      const kind = c.kind === 'pensamiento' && c.therapy ? 'terapia' : c.kind;
      const e = newJournal({ kind, title: kind === 'poema' ? title : '', text: kind === 'poema' ? plain : [title, plain].filter(Boolean).join('\n'), photos: c.photos.slice() });
      if (hasInk) e.photos.push(await inkBlob(c.ink, 'journal|' + e.id));
      await addItem('journal', e);
      toast(kind === 'terapia' ? 'Guardado para tu próxima sesión' : 'Guardado en el cuaderno');
      resetCapture(); go('#/nota/' + e.id); return;
    }
    if (isAnchoredKind(c.kind)) {
      const idea = byId('ideas', c.anchorId);
      if (!idea) { toast(c.kind === 'pregunta' ? 'Elige la idea que orbita' : 'Elige la idea a la que pertenece'); const p = $('#anchor-pick'); if (p) p.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      const photos = c.photos.slice(); let text = c.text;
      if (hasInk) { const id = await inkBlob(c.ink, 'ideas|' + idea.id); photos.push(id); text = (text || '') + '\n[[img:' + id + ']]\n'; }
      if (c.kind === 'pregunta') {
        const q = [title, plain].filter(Boolean).join(' ');
        if (!q) { toast('Escribe la pregunta'); return; }
        const qq = await addQuestion(idea, q);
        if (photos.length) { idea.photos = idea.photos.concat(photos); await persist('ideas', idea); }
        toast('Nueva luna en ' + ideaTitle(idea)); target = '#/idea/' + idea.id + '?q=' + qq.id;
      } else {
        await appendCaptureToIdea(idea, { title, text, photos, createdAt: nowISO() });
        toast('Actualización en ' + ideaTitle(idea)); target = '#/idea/' + idea.id;
      }
    } else {
      let body = c.text; let t = title;
      if (!t) { const b = parseBlocks(c.text, c.photos); const st = splitTitle(b.segs[0]); t = st.title; b.segs[0] = st.body; body = joinBlocks(b.segs, b.ids); }
      const nuclei = c.nucleusId && byId('nuclei', c.nucleusId) ? [c.nucleusId] : [];
      const idea = newIdea({ title: t, body, photos: c.photos.slice(), ink: hasInk ? c.ink : null, sectors: c.tags.filter((x) => S.settings.sectors.includes(x)), nuclei });
      await addItem('ideas', idea); toast('Idea sembrada'); target = '#/idea/' + idea.id;
    }
    resetCapture();
    go(target);
  }
});

Object.assign(CHANGES, {
  capTherapy(el) { UI.cap.therapy = el.checked; saveDraft(); },
  capNuc(el) { UI.cap.nucleusId = el.value; saveDraft(); }
});

/* ================= BANDEJA ================= */
route(/^#\/inbox$/, viewInbox, 'home');

function viewInbox() {
  const items = S.inbox.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return topbar({ title: 'Bandeja', sub: 'Capturas sin clasificar', back: '#/' }) +
    (items.length ? '<div class="stack">' + items.map((c) =>
      '<article class="card"><p class="small muted">' + esc(relDays(c.createdAt)) + '</p>' + (c.text ? '<p class="pre">' + esc(c.text) + '</p>' : '') +
      (c.link ? '<p class="ellipsis"><a href="' + esc(safeUrl(c.link)) + '" target="_blank" rel="noopener noreferrer">' + esc(c.link) + '</a></p>' : '') +
      (c.photos.length ? '<div class="thumbs">' + c.photos.map((p) => '<span class="thumb"><img alt="" data-blob="' + p + '"></span>').join('') + '</div>' : '') +
      '<div class="row gap wrap"><button class="btn small-btn" data-act="inboxToIdea" data-id="' + c.id + '">Idea nueva</button>' +
      (S.ideas.length ? '<button class="btn ghost small-btn" data-act="inboxToExisting" data-id="' + c.id + '">Añadir a idea</button>' : '') +
      '<button class="btn ghost small-btn" data-act="inboxToFrag" data-id="' + c.id + '">Fragmento de cine</button>' +
      '<button class="icon-btn sm" data-act="inboxDelete" data-id="' + c.id + '" aria-label="Eliminar captura">' + icon('trash', 16) + '</button></div></article>').join('') + '</div>'
      : emptyState('Bandeja vacía', 'Todo está clasificado.', '<a class="btn" href="#/capture">Nueva captura</a>'));
}

Object.assign(ACTIONS, {
  async inboxToIdea(el) {
    const c = byId('inbox', el.dataset.id); const st = splitTitle(c.text || c.link || 'Idea');
    const idea = newIdea({ title: st.title, body: st.body, links: c.link ? [{ url: c.link, label: '' }] : [], photos: c.photos });
    await addItem('ideas', idea); await removeItem('inbox', c.id); go('#/idea/' + idea.id);
  },
  inboxToExisting(el) {
    const ideas = S.ideas.filter((i) => i.stage !== 'archivada');
    openSheet('Añadir a una idea', field('Idea', '<select id="sheet-idea">' + ideas.map((i) => '<option value="' + i.id + '">' + esc(ideaTitle(i)) + '</option>').join('') + '</select>') +
      '<button class="btn block" data-act="inboxConfirmExisting" data-id="' + el.dataset.id + '">Añadir</button>');
  },
  async inboxConfirmExisting(el) {
    const c = byId('inbox', el.dataset.id); const idea = byId('ideas', $('#sheet-idea').value);
    await appendCaptureToIdea(idea, c); await removeItem('inbox', c.id); closeSheet(); toast('Añadido'); rerender();
  },
  async inboxToFrag(el) {
    const c = byId('inbox', el.dataset.id); const st = splitTitle(c.text || 'Fragmento');
    const fr = newFragment({ title: st.title, text: st.body || c.text, photos: c.photos });
    await addItem('fragments', fr); await removeItem('inbox', c.id); go('#/frag/' + fr.id);
  },
  async inboxDelete(el) {
    if (!confirm('¿Eliminar esta captura?')) return;
    const c = byId('inbox', el.dataset.id); for (const p of c.photos) await DB.del('blobs', p);
    await removeItem('inbox', c.id); rerender();
  }
});

/* ================= ASISTENTE DE IDEAS ================= */
route(/^#\/ai\/([^/?]+)$/, viewAI, 'ideas');

function ideaContext(idea, mode) {
  const set = QUESTION_SETS[idea.qset] || QUESTION_SETS.general;
  let ctx = 'Título: ' + ideaTitle(idea) + '\nEtapa: ' + stageLabel(idea.stage) + '\nSectores: ' + (idea.sectors.join(', ') || 'sin sector') +
    '\n\nNotas del autor:\n' + ((plainText(idea.body) || '(sin notas)').slice(0, 6000)) + '\n\nPreguntas guía:\n' +
    set.items.map((it) => '- ' + it.q + ' ' + ((idea.answers[it.id] || '').trim() || '(sin responder)')).join('\n');
  if (idea.links.length) ctx += '\n\nLinks guardados: ' + idea.links.map((l) => l.url).join(', ');
  if (mode === 'conector') {
    const others = S.ideas.filter((i) => i.id !== idea.id && i.aiAllowed && i.stage !== 'archivada').slice(0, 40);
    ctx += '\n\nOtras ideas del autor (solo las que permiten IA):\n' + (others.length ? others.map((o) => '- ' + ideaTitle(o) + ' [' + o.sectors.join(', ') + ']: ' + plainText(o.body).replace(/\s+/g, ' ').slice(0, 220)).join('\n') : '(ninguna)');
  }
  return ctx;
}

function viewAI(id) {
  const idea = byId('ideas', id);
  if (!idea) return topbar({ title: 'Asistente', back: '#/ideas' }) + emptyState('No encontré la idea', '', '');
  const mode = AI.IDEA_MODES[UI.aiMode] ? UI.aiMode : 'diablo';
  const M = AI.IDEA_MODES[mode];
  let html = topbar({ title: 'Asistente', sub: ideaTitle(idea), back: '#/idea/' + id });
  html += '<div class="chips">' + Object.keys(AI.IDEA_MODES).map((k) => chip(AI.IDEA_MODES[k].label, { on: k === mode, data: { act: 'aiMode', mode: k } })).join('') + '</div>' +
    '<p class="small muted">' + esc(M.desc) + '</p>';

  if (!S.settings.apiKey) {
    return html + '<div class="card warn-card"><p><strong>Falta conectar la IA.</strong> Agrega tu clave de la API de Claude en Ajustes. Todo lo demás de la app funciona sin ella.</p><a class="btn" href="#/settings">Ir a Ajustes</a></div>';
  }
  if (!idea.aiAllowed) {
    return html + '<div class="card warn-card"><p><strong>Esta idea es privada.</strong> Desactivaste la IA para ella.</p><button class="btn" data-act="aiAllow" data-id="' + id + '">Permitir IA en esta idea</button></div>';
  }

  html += '<details class="card privacy"><summary class="row gap-s small">' + icon('lock', 14) + '<span>Se envía a Claude: título, notas, respuestas y links (sin fotos). Ver texto exacto</span></summary><pre class="ctx">' + esc(ideaContext(idea, mode)) + '</pre></details>';

  html += '<div class="chat" id="chat">' + (idea.chat.length ? idea.chat.map((msg, i) => msg.role === 'user'
    ? '<div class="bubble me">' + esc(msg.text) + '</div>'
    : '<article class="bubble ai"><span class="eyebrow">' + esc((AI.IDEA_MODES[msg.mode] || M).label) + '</span><div class="pre">' + esc(msg.text) + '</div>' +
      '<div class="row gap wrap"><button class="btn ghost small-btn" data-act="aiSaveNote" data-id="' + id + '" data-i="' + i + '">Guardar en notas</button><button class="btn ghost small-btn" data-act="aiCopy" data-id="' + id + '" data-i="' + i + '">' + icon('copy', 14) + 'Copiar</button></div></article>').join('')
    : '<button class="card starter" data-act="aiStarter" data-id="' + id + '"><span class="small muted">Sugerencia para empezar</span><br>' + esc(M.starter) + '</button>') +
    (UI.aiBusy ? '<div class="bubble ai thinking" role="status">Pensando…</div>' : '') + '</div>';

  if (idea.chat.length) html += '<button class="link-btn small" data-act="aiClear" data-id="' + id + '">Borrar conversación</button>';
  html += '<div class="composer"><label class="sr" for="ai-input">Pregunta</label><textarea id="ai-input" class="autosize" rows="1" placeholder="Pregunta sobre esta idea…"></textarea>' +
    '<button class="icon-btn accent-btn" data-act="aiSend" data-id="' + id + '" aria-label="Enviar"' + (UI.aiBusy ? ' disabled' : '') + '>' + icon('send') + '</button></div>';
  onMount(() => { const c = $('#chat'); if (c && idea.chat.length) c.lastElementChild.scrollIntoView({ block: 'end' }); });
  return html;
}

async function sendIdeaAI(idea, text) {
  const mode = UI.aiMode;
  idea.chat.push({ role: 'user', text, mode, at: nowISO() });
  UI.aiBusy = true; rerender();
  try {
    let msgs = idea.chat.slice(-12).map((m) => ({ role: m.role, content: m.text }));
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    const res = await AI.ask({
      apiKey: S.settings.apiKey, model: S.settings.model,
      system: AI.BASE + '\n\n' + AI.IDEA_MODES[mode].system + '\n\n=== Contexto de la idea ===\n' + ideaContext(idea, mode),
      messages: msgs, maxTokens: 2000
    });
    idea.chat.push({ role: 'assistant', text: res.text, mode, at: nowISO() });
    if (idea.chat.length > 60) idea.chat = idea.chat.slice(-60);
    await persist('ideas', idea);
  } catch (e) {
    idea.chat.pop();
    UI.aiDraft = text;
    toast(e.message);
  }
  UI.aiBusy = false; rerender();
  if (UI.aiDraft) { const inp = $('#ai-input'); if (inp) { inp.value = UI.aiDraft; autosize(inp); } UI.aiDraft = ''; }
}

Object.assign(ACTIONS, {
  aiMode(el) { UI.aiMode = el.dataset.mode; rerender(); },
  async aiAllow(el) { const i = byId('ideas', el.dataset.id); i.aiAllowed = true; await persist('ideas', i); rerender(); },
  aiStarter(el) { if (UI.aiBusy) return; sendIdeaAI(byId('ideas', el.dataset.id), AI.IDEA_MODES[UI.aiMode].starter); },
  aiSend(el) {
    if (UI.aiBusy) return;
    const inp = $('#ai-input'); const text = inp.value.trim();
    if (!text) { inp.focus(); return; }
    sendIdeaAI(byId('ideas', el.dataset.id), text);
  },
  async aiSaveNote(el) {
    const i = byId('ideas', el.dataset.id); const msg = i.chat[Number(el.dataset.i)];
    i.body = (i.body ? i.body + '\n\n' : '') + '— Asistente (' + (AI.IDEA_MODES[msg.mode] || {}).label + '):\n' + msg.text;
    await persist('ideas', i); toast('Guardado en las notas de la idea');
  },
  aiCopy(el) { const i = byId('ideas', el.dataset.id); copyText(i.chat[Number(el.dataset.i)].text); },
  async aiClear(el) { if (!confirm('¿Borrar la conversación de esta idea?')) return; const i = byId('ideas', el.dataset.id); i.chat = []; await persist('ideas', i); rerender(); }
});
