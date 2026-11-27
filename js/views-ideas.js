/* Semillero — inicio, ideas, captura, bandeja y asistente de ideas. */
'use strict';

/* ================= INICIO ================= */
route(/^#?\/?$/, viewHome, 'home');

function viewHome() {
  const active = S.ideas.filter((i) => i.stage !== 'archivada');
  const name = S.settings.name ? ', ' + S.settings.name : '';
  const today = fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
  const recent = active.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);
  const backupAge = daysSince(S.settings.lastBackup);

  let html = '<header class="topbar"><div class="brand">' + logo() + '<span>Semillero</span></div><div class="topbar-actions">' +
    '<a class="icon-btn" href="#/settings" aria-label="Ajustes">' + icon('gear') + '</a></div></header>';
  html += '<section class="hello"><p class="muted small cap">' + esc(today) + '</p><h1 class="display">Hola' + esc(name) + '</h1></section>';

  html += '<a class="new-sheet" href="#/capture"><span class="new-sheet-lines" aria-hidden="true"></span>' +
    '<span class="new-sheet-text"><strong>Nueva idea</strong><span>Escribe, dibuja o pega un link</span></span>' +
    '<span class="new-sheet-plus" aria-hidden="true">' + icon('plus', 26) + '</span></a>';

  if (recent.length) {
    html += '<section><div class="row between"><h2 class="h2">Recientes</h2><a class="small" href="#/mapa">Ver mapa</a></div>' +
      '<div class="orb-row scroll-x">' + recent.map((i) => '<a class="orb-item" href="#/idea/' + i.id + '">' + orbHtml(i, 'md') + '<span>' + esc(ideaTitle(i)) + '</span></a>').join('') + '</div></section>';
  }

  const extra = [];
  if (hasDraft()) extra.push('<a class="card row gap draft-card" href="#/capture">' + icon('plus') + '<span class="grow"><strong>Tienes un borrador sin guardar</strong><br><span class="small muted">' + esc(draftPreview()) + '</span></span>' + icon('chevron') + '</a>');
  const topics = typeof pendingTopics === 'function' ? pendingTopics() : [];
  if (topics.length) extra.push('<a class="card row gap" href="#/cuaderno">' + icon('book') + '<span class="grow"><strong>' + topics.length + (topics.length === 1 ? ' tema' : ' temas') + ' para tu próxima sesión</strong><br><span class="small muted">Cuaderno' + (S.settings.nextTherapy ? ' · ' + esc(therapyDateLabel(S.settings.nextTherapy)) : '') + '</span></span>' + icon('chevron') + '</a>');
  if (S.inbox.length) extra.push('<a class="card row gap" href="#/inbox">' + icon('inbox') + '<span class="grow"><strong>' + S.inbox.length + ' en la bandeja</strong><br><span class="small muted">Capturas de antes, sin clasificar</span></span>' + icon('chevron') + '</a>');
  if (backupAge >= 7 && S.ideas.length) extra.push('<a class="card row gap warn-card" href="#/settings">' + icon('lock') + '<span class="grow"><strong>Haz un respaldo</strong><br><span class="small">' + (S.settings.lastBackup ? 'Último respaldo ' + relDays(S.settings.lastBackup) : 'Aún no tienes respaldo fuera del teléfono') + '</span></span>' + icon('chevron') + '</a>');
  if (extra.length) html += '<section class="stack">' + extra.join('') + '</section>';

  html += '<section class="quick-links"><a href="#/cine">' + icon('film', 18) + 'Taller de cine</a><a href="#/agenda">' + icon('clock', 18) + 'Agenda</a></section>';
  return html;
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
  const nucs = S.nuclei.slice().sort((a, b) => (a.status === 'activo' ? 0 : 1) - (b.status === 'activo' ? 0 : 1) || b.updatedAt.localeCompare(a.updatedAt));
  const nucRow = '<section class="section"><div class="row between"><h2 class="h2 m0">Núcleos</h2><button class="link-btn small" data-act="nucNew">+ Núcleo</button></div>' +
    (nucs.length ? '<div class="nuc-row scroll-x">' + nucs.map(nucleusBadge).join('') + '</div>' : '<p class="small muted">Un núcleo es un proyecto: ata a él ideas que no se parecen entre sí pero sirven a lo mismo.</p>') + '</section>';
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
      const hay = [i.title, i.body, Object.values(i.answers).join(' ')].join(' ').toLowerCase();
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

function hojaHtml(owner, title, body, attrsTitle, attrsBody, ink) {
  return '<div class="hoja" id="hoja" data-owner="' + owner + '">' + inkLayer(ink) +
    '<label class="sr" for="hoja-title">Título</label><textarea id="hoja-title" class="hoja-title autosize" rows="1" placeholder="Título" enterkeyhint="next" ' + attrsTitle + '>' + esc(title) + '</textarea>' +
    '<label class="sr" for="hoja-body">Nota</label><textarea id="hoja-body" class="hoja-body autosize" rows="3" placeholder="Escribe libremente. La primera oración se vuelve el título." ' + attrsBody + '>' + esc(body) + '</textarea>' +
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

  let html = topbar({ title: '', back: '#/ideas', actions: '<a class="icon-btn" href="#/mapa" aria-label="Ver en el mapa"><svg class="ic" width="20" height="20" viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="18" cy="9" r="3"/><circle cx="11" cy="18" r="3"/><path d="M8.6 8.4 9.8 15.3M8.9 6.6l6.2 1.6M16.4 11.6l-3.6 4.2"/></svg></a>' });

  html += hojaHtml('ideas|' + id, idea.title, idea.body, fld('title'), fld('body'), idea.ink);
  html += '<div id="relics" class="relics" data-id="' + id + '">' + relicsHtml(idea) + '</div>';

  html += '<div class="thumbs">' + idea.photos.map((p) =>
    '<button class="thumb" data-act="viewPhoto" data-blob="' + p + '" data-owner="ideas|' + id + '" aria-label="Ver foto"><img alt="" data-blob="' + p + '"></button>').join('') +
    '<label class="thumb add">' + icon('camera') + '<span>Foto</span><input type="file" accept="image/*" multiple hidden data-change="ideaPhotos" data-id="' + id + '"></label></div>';

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
    (nucs.length ? '<div class="chips">' + nucs.map((n, k) => '<span class="chip on-soft nuc-chip"><span class="nuc-orb xs" aria-hidden="true"></span><a href="#/nucleo/' + n.id + '">' + esc(nucleusTitle(n)) + '</a>' +
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
    body: 'Combinación de dos ideas.\n\n— ' + ideaTitle(a) + ':\n' + (a.body || '').slice(0, 800) + '\n\n— ' + ideaTitle(b) + ':\n' + (b.body || '').slice(0, 800),
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
    const obj = byId(k, id);
    if (obj) { obj.photos = obj.photos.filter((p) => p !== el.dataset.blob); await persist(k, obj); }
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

function resetCapture() {
  /* La hoja aún en pantalla ya no es un borrador: que el cambio de pestaña no la vuelva a guardar. */
  const h = $('#hoja'); if (h && h.dataset.owner === 'cap') h.dataset.owner = 'done';
  UI.cap = { title: '', text: '', photos: [], dest: 'nueva', anchorId: '', ink: null, asQuestion: false }; DB.del('settings', 'draft'); updateDraftDot(); }

/* ---------- Borrador automático de la captura ---------- */
function hasDraft() {
  const c = UI.cap;
  return !!(c && (((c.title || '').trim()) || ((c.text || '').trim()) || (c.photos || []).length || (c.ink && c.ink.strokes && c.ink.strokes.length)));
}
function draftPreview() {
  const c = UI.cap; const t = ((c.title || '') + ' ' + (c.text || '')).trim();
  return t ? (t.length > 60 ? t.slice(0, 57) + '…' : t) : ((c.photos || []).length ? 'Con fotos' : 'Con un dibujo');
}
let draftTimer;
function saveDraft(now) {
  clearTimeout(draftTimer);
  const run = () => { if (hasDraft()) DB.put('settings', { id: 'draft', cap: UI.cap, updatedAt: nowISO() }); else DB.del('settings', 'draft'); updateDraftDot(); };
  if (now) run(); else draftTimer = setTimeout(run, 350);
}
function updateDraftDot() { const t = $('.tab-new'); if (t) t.classList.toggle('has-draft', hasDraft() && !location.hash.startsWith('#/capture')); }

function viewCapture() {
  if (!UI.cap || UI.cap.dest === 'bandeja' || UI.cap.title == null) resetCapture();
  const c = UI.cap;
  const anchor = c.anchorId && byId('ideas', c.anchorId);
  const hasIdeas = S.ideas.some((i) => i.stage !== 'archivada');
  onMount(() => {
    fitInk();
    const t = $('#hoja-title'); if (t && !c.title && !c.text && c.dest === 'nueva') t.focus();
    if (c.dest === 'anclar') MAP.mount($('#anchor-map'), { edit: false, picked: c.anchorId, onTap: (id) => { syncCapFields(); c.anchorId = id; MAP.pick(id); updateAnchorLabel(); } });
  });
  const endsQ = /\?\s*$/.test((c.title || '').trim());
  return topbar({ title: '', back: '#/', actions: '<button class="btn small-btn" data-act="capSave">' + (c.dest === 'anclar' ? 'Anclar' : 'Guardar') + '</button>' }) +
    (hasDraft() ? '<p class="draft-note small row gap-s">' + icon('check', 14) + '<span class="grow">Borrador guardado en el teléfono</span><button class="link-btn small" data-act="capDiscard">Descartar</button></p>' : '') +
    (c.dest === 'cuaderno' ? hojaHtml('cap', c.title, c.text, '', '', c.ink).replace('class="ink-fab"', 'class="ink-fab" style="display:none"') : hojaHtml('cap', c.title, c.text, '', '', c.ink)) +
    '<div class="thumbs" id="cap-photos">' + c.photos.map((p) => '<span class="thumb"><img alt="" data-blob="' + p + '"></span>').join('') +
    '<label class="thumb add">' + icon('camera') + '<span>Foto</span><input type="file" accept="image/*" multiple hidden data-change="capPhotos"></label></div>' +
    '<section class="section"><h2 class="h2">¿A dónde va?</h2><div class="seg2" role="group">' +
    '<button type="button" class="seg2-btn" aria-pressed="' + (c.dest === 'nueva') + '" data-act="capDest" data-dest="nueva">Idea nueva</button>' +
    (hasIdeas ? '<button type="button" class="seg2-btn" aria-pressed="' + (c.dest === 'anclar') + '" data-act="capDest" data-dest="anclar">Anclar</button>' : '') +
    '<button type="button" class="seg2-btn" aria-pressed="' + (c.dest === 'cuaderno') + '" data-act="capDest" data-dest="cuaderno">Cuaderno</button></div>' +
    (c.dest === 'cuaderno' ? '<p class="small muted">Irá a tu <strong>Cuaderno</strong> privado: no aparece en el mapa ni se envía a la IA. Ahí eliges si es poema, pensamiento o algo para terapia.</p>' : '') +
    (c.dest === 'nueva' && endsQ && hasIdeas ? '<button class="card soft-card row gap q-suggest" data-act="capAsQuestion">' + moonIcon(false) + '<span class="grow small"><strong>¿Es una pregunta?</strong> Ánclala como luna de una idea.</span>' + icon('chevron') + '</button>' : '') +
    (c.dest === 'anclar' ? '<label class="switch"><input type="checkbox" id="cap-asq" data-change="capAsQ"' + (c.asQuestion ? ' checked' : '') + '><span>Guardarla como pregunta (una luna de esa idea)</span></label>' : '') +
    (c.dest === 'anclar' ? '<div id="anchor-map" class="map-stage anchor-map"></div><p class="small muted" id="anchor-label">' + (anchor ? 'Se anclará a <strong>' + esc(ideaTitle(anchor)) + '</strong>' : 'Toca la canica donde quieres anclarla.') + '</p>' : '') +
    '</section><p class="small muted row gap-s">' + icon('lock', 14) + 'Se guarda solo en este dispositivo.</p>';
}

function updateAnchorLabel() {
  const el = $('#anchor-label'); const a = byId('ideas', UI.cap.anchorId);
  if (el && a) el.innerHTML = 'Se anclará a <strong>' + esc(ideaTitle(a)) + '</strong>';
}

function syncCapFields() {
  const c = UI.cap; if (!c) return;
  const t = $('#hoja-title'); if (t) c.title = t.value;
  const b = $('#hoja-body'); if (b) c.text = b.value;
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
  if (cap.photos && cap.photos.length) idea.photos = idea.photos.concat(cap.photos);
  await persist('ideas', idea);
}

Object.assign(ACTIONS, {
  capDest(el) {
    syncCapFields(); const prev = UI.cap.dest; UI.cap.dest = el.dataset.dest;
    if (UI.cap.dest === 'anclar' && prev !== 'anclar') UI.cap.asQuestion = /\?\s*$/.test((UI.cap.title || '').trim());
    saveDraft(); rerender();
  },
  capAsQuestion() { syncCapFields(); UI.cap.dest = 'anclar'; UI.cap.asQuestion = true; saveDraft(); rerender(); },
  async capDiscard() {
    if (!confirm('¿Descartar el borrador? Se borra lo que escribiste, dibujaste y las fotos.')) return;
    for (const p of UI.cap.photos || []) await DB.del('blobs', p);
    resetCapture(); rerender();
  },
  async capSave() {
    syncCapFields();
    const c = UI.cap;
    const hasInk = c.ink && c.ink.strokes && c.ink.strokes.length;
    if (!c.title.trim() && !c.text.trim() && !c.photos.length && !hasInk) { toast('Escribe, dibuja o añade una foto'); return; }
    let target = '#/';
    if (c.dest === 'cuaderno') {
      if (!c.title.trim() && !c.text.trim()) { toast('El cuaderno guarda texto: escribe algo'); return; }
      const photos = c.photos.slice();
      const e = newJournal({ kind: 'pensamiento', text: [c.title.trim(), c.text.trim()].filter(Boolean).join('\n'), photos });
      if (hasInk) { const id = uid(); await DB.put('blobs', { id, data: inkToPng(c.ink), owner: 'journal|' + e.id, createdAt: nowISO(), updatedAt: nowISO() }); e.photos.push(id); }
      await addItem('journal', e);
      toast('Guardado en el cuaderno');
      resetCapture(); go('#/nota/' + e.id); return;
    }
    if (c.dest === 'anclar') {
      const idea = byId('ideas', c.anchorId);
      if (!idea) { toast('Toca la canica donde quieres anclarla'); return; }
      const cap = { title: c.title.trim(), text: c.text.trim(), photos: c.photos.slice(), createdAt: nowISO() };
      if (hasInk) {
        const id = uid();
        await DB.put('blobs', { id, data: inkToPng(c.ink), owner: 'ideas|' + idea.id, createdAt: nowISO(), updatedAt: nowISO() });
        cap.photos.push(id);
      }
      if (c.asQuestion && cap.title) {
        const q = await addQuestion(idea, [cap.title, cap.text].filter(Boolean).join(' '));
        if (cap.photos.length) { idea.photos = idea.photos.concat(cap.photos); await persist('ideas', idea); }
        toast('Nueva luna en ' + ideaTitle(idea)); target = '#/idea/' + idea.id + '?q=' + q.id;
      } else { await appendCaptureToIdea(idea, cap); toast('Anclada a ' + ideaTitle(idea)); target = '#/idea/' + idea.id; }
    } else {
      let title = c.title.trim(); let body = c.text.trim();
      if (!title && body) { const st = splitTitle(body); title = st.title; body = st.body; }
      const idea = newIdea({ title, body, photos: c.photos.slice(), ink: hasInk ? c.ink : null });
      await addItem('ideas', idea); toast('Idea sembrada'); target = '#/idea/' + idea.id;
    }
    resetCapture();
    go(target);
  }
});

Object.assign(CHANGES, {
  async capPhotos(el) { syncCapFields(); toast('Guardando fotos…'); const ids = await storePhotos(el.files, 'inbox'); UI.cap.photos = UI.cap.photos.concat(ids); saveDraft(true); rerender(); },
  capAsQ(el) { UI.cap.asQuestion = el.checked; saveDraft(); }
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
    '\n\nNotas del autor:\n' + ((idea.body || '(sin notas)').slice(0, 6000)) + '\n\nPreguntas guía:\n' +
    set.items.map((it) => '- ' + it.q + ' ' + ((idea.answers[it.id] || '').trim() || '(sin responder)')).join('\n');
  if (idea.links.length) ctx += '\n\nLinks guardados: ' + idea.links.map((l) => l.url).join(', ');
  if (mode === 'conector') {
    const others = S.ideas.filter((i) => i.id !== idea.id && i.aiAllowed && i.stage !== 'archivada').slice(0, 40);
    ctx += '\n\nOtras ideas del autor (solo las que permiten IA):\n' + (others.length ? others.map((o) => '- ' + ideaTitle(o) + ' [' + o.sectors.join(', ') + ']: ' + (o.body || '').replace(/\s+/g, ' ').slice(0, 220)).join('\n') : '(ninguna)');
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
