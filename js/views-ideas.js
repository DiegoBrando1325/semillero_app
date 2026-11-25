/* Semillero — inicio, ideas, captura, bandeja y asistente de ideas. */
'use strict';

/* ================= INICIO ================= */
route(/^#?\/?$/, viewHome, 'home');

function viewHome() {
  const active = S.ideas.filter((i) => i.stage !== 'archivada');
  const name = S.settings.name ? ', ' + S.settings.name : '';
  const today = fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
  const next = upcomingSessions()[0];
  const counts = STAGES.slice(0, 4).map((s) => ({ s, n: active.filter((i) => i.stage === s.id).length }));
  const stale = active.filter((i) => daysSince(i.updatedAt) >= 30).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).slice(0, 3);
  const noNext = active.filter((i) => daysSince(i.updatedAt) < 30 && !(i.answers.siguiente || '').trim()).slice(0, 2);
  const pairs = combinationPairs(2);
  const backupAge = daysSince(S.settings.lastBackup);

  let html = '<header class="topbar"><div class="brand">' + logo() + '<span>Semillero</span></div><div class="topbar-actions">' +
    '<a class="icon-btn" href="#/ideas" aria-label="Buscar ideas"><svg aria-hidden="true" class="ic" width="20" height="20" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></a>' +
    '<a class="icon-btn" href="#/settings" aria-label="Ajustes">' + icon('gear') + '</a></div></header>';

  html += '<section class="hello"><p class="muted small cap">' + esc(today) + '</p><h1 class="display">Hola' + esc(name) + '</h1></section>';

  if (!S.ideas.length && !S.inbox.length) {
    html += '<section class="card hero"><h2>Tu semillero está vacío</h2><p>Captura cualquier idea: una escena, una pregunta filosófica, un invento. Después la maduras paso a paso.</p>' +
      '<div class="row gap"><a class="btn" href="#/capture">Capturar mi primera idea</a><a class="btn ghost" href="#/settings">Ajustes</a></div></section>';
  }

  if (next) {
    html += '<section class="card dark" aria-label="Próxima sesión">' +
      '<p class="small row gap-s">' + icon('clock', 14) + esc(sessionWhen(next)) + ' · ' + next.minutes + ' min</p>' +
      '<h2>' + esc(targetTitle(next.target)) + '</h2>' + (next.goal ? '<p class="soft">Objetivo: ' + esc(next.goal) + '</p>' : '') +
      '<div class="row gap"><a class="btn light" href="' + targetHref(next.target) + '">Abrir</a><a class="btn outline-light" href="#/agenda">Agenda</a></div></section>';
  } else if (active.length) {
    html += '<a class="card row between" href="#/agenda"><span><strong>Sin sesiones agendadas</strong><br><span class="small muted">Reserva tiempo para avanzar una idea</span></span>' + icon('chevron') + '</a>';
  }

  if (active.length) {
    html += '<section><div class="row between"><h2 class="h2">Tu jardín</h2><span class="small muted">' + active.length + ' ideas activas</span></div><div class="grid4">' +
      counts.map((c) => '<a class="stat stat-' + c.s.id + '" href="#/ideas?stage=' + c.s.id + '"><strong>' + c.n + '</strong><span>' + esc(c.s.label) + '</span></a>').join('') + '</div></section>';
  }

  const attention = [];
  if (S.inbox.length) attention.push('<a class="card row gap" href="#/inbox">' + icon('inbox') + '<span class="grow"><strong>' + S.inbox.length + ' en la bandeja</strong><br><span class="small muted">Clasifícalas en una idea o escena</span></span>' + icon('chevron') + '</a>');
  stale.forEach((i) => attention.push(attentionRow(i, 'Sin actividad ' + relDays(i.updatedAt))));
  noNext.forEach((i) => attention.push(attentionRow(i, 'Falta definir el siguiente paso')));
  if (backupAge >= 7 && S.ideas.length) attention.push('<a class="card row gap warn-card" href="#/settings">' + icon('lock') + '<span class="grow"><strong>Haz un respaldo</strong><br><span class="small">' + (S.settings.lastBackup ? 'Último respaldo ' + relDays(S.settings.lastBackup) : 'Aún no tienes respaldo fuera del teléfono') + '</span></span>' + icon('chevron') + '</a>');
  if (attention.length) html += '<section><h2 class="h2">Necesitan atención</h2><div class="stack">' + attention.join('') + '</div></section>';

  if (pairs.length) {
    html += '<section><h2 class="h2">Podrían combinarse</h2><div class="stack">' + pairs.map((p) =>
      '<div class="card soft-card"><p class="small row gap-s strong">' + icon('merge', 16) + 'Ideas de sectores distintos con temas en común</p>' +
      '<p><a href="#/idea/' + p.a.id + '">' + esc(ideaTitle(p.a)) + '</a> + <a href="#/idea/' + p.b.id + '">' + esc(ideaTitle(p.b)) + '</a></p>' +
      '<div class="row gap"><button class="btn small-btn" data-act="combine" data-a="' + p.a.id + '" data-b="' + p.b.id + '">Combinar</button>' +
      '<button class="btn ghost small-btn" data-act="relate" data-a="' + p.a.id + '" data-b="' + p.b.id + '">Solo conectar</button></div></div>').join('') + '</div></section>';
  }
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
    S.settings.sectors.map((s) => chip(s, { on: f.sector === s, color: sectorColor(s), data: { act: 'filterSector', sector: s } })).join('');
  onMount(() => { renderIdeaList(); });
  return topbar({ title: 'Ideas', actions: '<a class="btn small-btn" href="#/capture">' + icon('plus', 16) + 'Nueva</a>' }) +
    '<label class="search"><span class="sr">Buscar</span><input id="idea-search" type="search" placeholder="Buscar en títulos, notas y respuestas" value="' + esc(f.q) + '"></label>' +
    '<div class="chips scroll-x">' + stageChips + '</div><div class="chips scroll-x">' + sectorChips + '</div>' +
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

function viewIdea(id) {
  const idea = byId('ideas', id);
  if (!idea) return topbar({ title: 'Idea', back: '#/ideas' }) + emptyState('No encontré esta idea', 'Puede que se haya eliminado.', '<a class="btn" href="#/ideas">Ver ideas</a>');
  const fld = (path) => 'data-field="ideas|' + id + '|' + path + '"';
  const m = maturity(idea);
  const set = QUESTION_SETS[idea.qset] || QUESTION_SETS.general;
  const sessions = S.sessions.filter((s) => s.target === 'idea:' + id);
  const upcoming = sessions.filter((s) => !s.done && parseLocal(s.start) >= startOfToday()).sort((a, b) => a.start.localeCompare(b.start));
  const hours = sessions.filter((s) => s.done).reduce((a, s) => a + s.minutes, 0) / 60;
  const related = idea.related.map((r) => byId('ideas', r)).filter(Boolean);
  const sugg = similarIdeas([idea.title, idea.body].join(' '), id, 3).filter((x) => !idea.related.includes(x.idea.id));
  const others = S.ideas.filter((i) => i.id !== id && !idea.related.includes(i.id) && i.stage !== 'archivada');
  const works = S.works.filter((w) => w.ideaId === id);
  const creative = idea.sectors.some((s) => CREATIVE_SECTORS.includes(s)) || works.length;

  let html = topbar({ title: 'Idea', back: '#/ideas', actions: '<a class="btn dark small-btn" href="#/ai/' + id + '">' + icon('spark', 16) + 'Asistente</a>' });

  html += '<div class="tags">' + sectorTags(idea.sectors) + '</div>';
  html += '<label class="sr" for="idea-title">Título</label><textarea id="idea-title" class="title-input autosize" rows="1" placeholder="Título de la idea" ' + fld('title') + '>' + esc(idea.title) + '</textarea>';

  html += '<div class="seg" role="group" aria-label="Etapa">' + STAGES.slice(0, 4).map((s, i) => {
    const idx = STAGES.findIndex((x) => x.id === idea.stage);
    const state = s.id === idea.stage ? ' current' : (i < idx && idea.stage !== 'archivada' ? ' past' : '');
    return '<button type="button" class="seg-step' + state + '" data-act="ideaStage" data-id="' + id + '" data-stage="' + s.id + '" aria-pressed="' + (s.id === idea.stage) + '"><span class="bar"></span>' + esc(s.label) + '</button>';
  }).join('') + '</div>';
  if (idea.stage === 'archivada') html += '<p class="small warn">Esta idea está archivada. Elige una etapa para reactivarla.</p>';

  html += '<section class="section"><h2 class="h2">Sectores</h2><div class="chips">' +
    S.settings.sectors.map((s) => chip(s, { on: idea.sectors.includes(s), color: sectorColor(s), data: { act: 'ideaSector', id, sector: s } })).join('') +
    '<button type="button" class="chip ghost" data-act="addSector" data-id="' + id + '">+ Sector</button></div></section>';

  html += '<section class="section"><h2 class="h2">Notas</h2><textarea class="autosize body-input" rows="4" placeholder="Desarrolla la idea libremente. Puedes dictar con el micrófono del teclado." ' + fld('body') + '>' + esc(idea.body) + '</textarea></section>';

  html += '<section class="section card"><div class="row between"><h2 class="h2 m0">Madurez <span id="maturity-pct">' + m.pct + '%</span></h2>' +
    '<span class="small muted" id="maturity-count">' + m.done + ' de ' + m.total + '</span></div>' +
    '<span class="meter lg"><span id="maturity-bar" style="width:' + m.pct + '%"></span></span>' +
    '<div class="row gap-s small"><span class="muted">Preguntas:</span>' + Object.keys(QUESTION_SETS).map((k) => chip(QUESTION_SETS[k].label, { on: idea.qset === k, data: { act: 'ideaQset', id, qset: k } })).join('') + '</div>' +
    set.items.map((it) => '<label class="field q"><span class="field-label">' + esc(it.q) + '</span><textarea class="autosize" rows="1" ' + fld('answers.' + it.id) + ' placeholder="Escribe aquí…">' + esc(idea.answers[it.id] || '') + '</textarea></label>').join('') +
    '<a class="small strong" href="#/ai/' + id + '">¿Atorado? Pide ayuda al asistente →</a></section>';

  html += '<section class="section"><h2 class="h2">Links</h2><div class="stack-s">' + idea.links.map((l, i) =>
    '<div class="row gap list-row"><a class="grow ellipsis" href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener noreferrer">' + icon('link', 16) + ' ' + esc(l.label || l.url) + '</a>' +
    '<button class="icon-btn sm" data-act="ideaDelLink" data-id="' + id + '" data-i="' + i + '" aria-label="Quitar link">' + icon('trash', 16) + '</button></div>').join('') + '</div>' +
    '<div class="row gap"><label class="sr" for="link-url">Dirección del link</label><input id="link-url" type="url" inputmode="url" placeholder="https://…" class="grow">' +
    '<button class="btn ghost small-btn" data-act="ideaAddLink" data-id="' + id + '">Añadir</button></div></section>';

  html += '<section class="section"><h2 class="h2">Fotos y bocetos</h2><div class="thumbs">' + idea.photos.map((p) =>
    '<button class="thumb" data-act="viewPhoto" data-blob="' + p + '" data-owner="ideas|' + id + '" aria-label="Ver foto"><img alt="" data-blob="' + p + '"></button>').join('') +
    '<label class="thumb add">' + icon('camera') + '<span>Añadir</span><input type="file" accept="image/*" multiple hidden data-change="ideaPhotos" data-id="' + id + '"></label></div></section>';

  html += '<section class="section"><h2 class="h2">Conexiones</h2><div class="chips">' + (related.length ? related.map((r) =>
    '<span class="chip on-soft"><a href="#/idea/' + r.id + '">' + esc(ideaTitle(r)) + '</a><button class="x" data-act="unrelate" data-a="' + id + '" data-b="' + r.id + '" aria-label="Quitar conexión">×</button></span>').join('') : '<span class="small muted">Aún sin conexiones.</span>') + '</div>';
  if (sugg.length) html += '<p class="small muted">Parecidas (por palabras en común):</p><div class="stack-s">' + sugg.map((x) =>
    '<div class="row gap list-row"><a class="grow" href="#/idea/' + x.idea.id + '">' + esc(ideaTitle(x.idea)) + '</a><button class="btn ghost small-btn" data-act="relate" data-a="' + id + '" data-b="' + x.idea.id + '">Conectar</button></div>').join('') + '</div>';
  if (others.length) {
    const opts = '<option value="">Elegir idea…</option>' + others.map((o) => '<option value="' + o.id + '">' + esc(ideaTitle(o)) + '</option>').join('');
    html += '<div class="grid2">' + field('Conectar con', '<select data-change="relateSelect" data-id="' + id + '">' + opts + '</select>') +
      field('Combinar con', '<select data-change="combineSelect" data-id="' + id + '">' + opts + '</select>') + '</div>';
  }
  html += '</section>';

  html += '<section class="section"><div class="row between"><h2 class="h2 m0">Sesiones de trabajo</h2><span class="small muted">' + hours.toFixed(1) + ' h invertidas</span></div><div class="stack-s">' +
    (upcoming.length ? upcoming.map(sessionRow).join('') : '<p class="small muted">No hay sesiones próximas.</p>') + '</div>' +
    '<button class="btn ghost" data-act="newSession" data-target="idea:' + id + '">' + icon('plus', 16) + 'Agendar sesión</button></section>';

  if (creative) {
    html += '<section class="section card"><h2 class="h2">' + icon('film', 18) + ' Taller de cine</h2>' +
      (works.length ? '<div class="stack-s">' + works.map((w) => '<a class="row between list-row" href="#/obra/' + w.id + '"><span>' + esc(w.title || 'Obra sin título') + '</span>' + icon('chevron') + '</a>').join('') + '</div>' : '<p class="small muted">Convierte esta idea en una obra para trabajar escenas, diálogos y adaptaciones.</p>') +
      '<button class="btn ghost" data-act="workFromIdea" data-id="' + id + '">Crear obra desde esta idea</button></section>';
  }

  html += '<section class="section card"><h2 class="h2">' + icon('lock', 18) + ' Privacidad</h2>' +
    '<label class="switch"><input type="checkbox" ' + (idea.aiAllowed ? 'checked ' : '') + fld('aiAllowed') + '><span>Permitir que el asistente lea esta idea</span></label>' +
    '<p class="small muted">Si lo apagas, nada de esta idea se envía a la IA, ni siquiera en el modo Conector.</p></section>';

  html += '<section class="section row gap wrap">' +
    (idea.stage !== 'archivada' ? '<button class="btn ghost" data-act="ideaStage" data-id="' + id + '" data-stage="archivada">Archivar</button>' : '') +
    '<button class="btn danger-ghost" data-act="deleteIdea" data-id="' + id + '">Eliminar</button>' +
    '<span class="small muted grow right">Creada ' + relDays(idea.createdAt) + '</span></section>';
  return html;
}

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
    const name = (prompt('Nombre del nuevo sector') || '').trim();
    if (!name) return;
    if (!S.settings.sectors.includes(name)) { S.settings.sectors.push(name); await saveSettings(); }
    if (el.dataset.id) { const i = byId('ideas', el.dataset.id); if (i && !i.sectors.includes(name)) { i.sectors.push(name); await persist('ideas', i); } }
    if (UI.cap && !el.dataset.id) UI.cap.sectors.push(name);
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

/* ================= CAPTURA RÁPIDA ================= */
route(/^#\/capture$/, viewCapture, '');

function resetCapture() { UI.cap = { text: '', link: '', photos: [], dest: 'bandeja', ideaId: '', kind: 'escena', sectors: [] }; }

function viewCapture() {
  if (!UI.cap) resetCapture();
  const c = UI.cap;
  const ideas = S.ideas.filter((i) => i.stage !== 'archivada').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const dest = (val, label) => '<label class="radio"><input type="radio" name="dest" value="' + val + '" ' + (c.dest === val ? 'checked' : '') + ' data-change="capDest"><span>' + label + '</span></label>';
  onMount(() => { const t = $('#cap-text'); if (t && !c.text) t.focus(); updateCapSuggest(); });
  return topbar({ title: 'Nueva captura', back: '#/', actions: '<button class="btn small-btn" data-act="capSave">Guardar</button>' }) +
    field('Escribe o dicta tu idea', '<textarea id="cap-text" class="autosize big" rows="5" placeholder="Una escena, una pregunta, un invento… Usa el micrófono del teclado para dictar.">' + esc(c.text) + '</textarea>') +
    '<div class="row gap">' + '<label class="sr" for="cap-link">Link</label><input id="cap-link" class="grow" type="url" inputmode="url" placeholder="Pega un link (opcional)" value="' + esc(c.link) + '">' +
    '<label class="btn ghost small-btn">' + icon('camera', 16) + 'Foto<input type="file" accept="image/*" multiple hidden data-change="capPhotos"></label></div>' +
    '<div class="thumbs" id="cap-photos">' + c.photos.map((p) => '<span class="thumb"><img alt="" data-blob="' + p + '"></span>').join('') + '</div>' +
    '<div id="cap-sugg"></div>' +
    '<section class="section"><h2 class="h2">¿A dónde va?</h2><div class="stack-s">' +
    dest('bandeja', 'Bandeja (la clasifico después)') + dest('nueva', 'Idea nueva') +
    (ideas.length ? dest('existente', 'Añadir a una idea existente') : '') + dest('escena', 'Fragmento para el taller de cine') + '</div>' +
    (c.dest === 'nueva' ? '<div class="chips">' + S.settings.sectors.map((s) => chip(s, { on: c.sectors.includes(s), color: sectorColor(s), data: { act: 'capSector', sector: s } })).join('') + '<button type="button" class="chip ghost" data-act="addSector">+ Sector</button></div>' : '') +
    (c.dest === 'existente' ? field('Idea', '<select id="cap-idea">' + ideas.map((i) => '<option value="' + i.id + '" ' + (c.ideaId === i.id ? 'selected' : '') + '>' + esc(ideaTitle(i)) + '</option>').join('') + '</select>') : '') +
    (c.dest === 'escena' ? field('Tipo de fragmento', '<select id="cap-kind">' + FRAG_KINDS.map((k) => '<option value="' + k.id + '" ' + (c.kind === k.id ? 'selected' : '') + '>' + esc(k.label) + '</option>').join('') + '</select>') : '') +
    '</section><p class="small muted row gap-s">' + icon('lock', 14) + 'Se guarda solo en este dispositivo.</p>';
}

function syncCapFields() {
  const c = UI.cap; if (!c) return;
  const t = $('#cap-text'); if (t) c.text = t.value;
  const l = $('#cap-link'); if (l) c.link = l.value;
  const i = $('#cap-idea'); if (i) c.ideaId = i.value;
  const k = $('#cap-kind'); if (k) c.kind = k.value;
}

let capTimer;
function updateCapSuggest() {
  clearTimeout(capTimer);
  capTimer = setTimeout(() => {
    const box = $('#cap-sugg'); const t = $('#cap-text');
    if (!box || !t) return;
    const sims = t.value.trim().length > 12 ? similarIdeas(t.value, null, 2) : [];
    box.innerHTML = sims.length ? '<div class="card soft-card"><p class="small strong row gap-s">' + icon('spark', 14) + 'Se parece a ideas que ya tienes</p>' +
      sims.map((x) => '<div class="row gap list-row"><span class="grow">' + esc(ideaTitle(x.idea)) + ' · <span class="muted small">' + esc(stageLabel(x.idea.stage)) + '</span></span><button class="btn small-btn" data-act="capPickIdea" data-id="' + x.idea.id + '">Añadir ahí</button></div>').join('') + '</div>' : '';
  }, 350);
}

function splitTitle(text) {
  const t = text.trim();
  const first = t.split('\n')[0].trim();
  if (first.length <= 90) return { title: first, body: t.slice(first.length).trim() };
  return { title: first.slice(0, 70).replace(/\s+\S*$/, '') + '…', body: t };
}

async function appendCaptureToIdea(idea, cap) {
  const stamp = fmtDate(new Date(cap.createdAt || Date.now()), { day: 'numeric', month: 'short' });
  if (cap.text) idea.body = (idea.body ? idea.body + '\n\n' : '') + '— Captura ' + stamp + ':\n' + cap.text;
  if (cap.link) idea.links.push({ url: cap.link, label: '' });
  if (cap.photos && cap.photos.length) idea.photos = idea.photos.concat(cap.photos);
  await persist('ideas', idea);
}

Object.assign(ACTIONS, {
  capSector(el) { syncCapFields(); const s = el.dataset.sector; const c = UI.cap; c.sectors = c.sectors.includes(s) ? c.sectors.filter((x) => x !== s) : c.sectors.concat(s); rerender(); },
  capPickIdea(el) { syncCapFields(); UI.cap.dest = 'existente'; UI.cap.ideaId = el.dataset.id; rerender(); },
  async capSave() {
    syncCapFields();
    const c = UI.cap;
    if (!c.text.trim() && !c.link.trim() && !c.photos.length) { toast('Escribe algo o añade una foto'); return; }
    const cap = { id: uid(), text: c.text.trim(), link: c.link.trim(), photos: c.photos.slice(), createdAt: nowISO() };
    let target = '#/';
    if (c.dest === 'bandeja') {
      await addItem('inbox', cap); toast('Guardado en la bandeja');
    } else if (c.dest === 'nueva') {
      const st = splitTitle(cap.text || cap.link || 'Idea con foto');
      const idea = newIdea({ title: st.title, body: st.body, sectors: c.sectors.slice(), links: cap.link ? [{ url: cap.link, label: '' }] : [], photos: cap.photos });
      await addItem('ideas', idea); toast('Idea creada'); target = '#/idea/' + idea.id;
    } else if (c.dest === 'existente') {
      const idea = byId('ideas', c.ideaId) || S.ideas[0];
      await appendCaptureToIdea(idea, cap); toast('Añadido a la idea'); target = '#/idea/' + idea.id;
    } else {
      const st = splitTitle(cap.text || 'Fragmento');
      const fr = newFragment({ kind: c.kind, title: st.title, text: st.body || cap.text, photos: cap.photos });
      await addItem('fragments', fr); toast('Fragmento creado'); target = '#/frag/' + fr.id;
    }
    resetCapture();
    go(target);
  }
});

Object.assign(CHANGES, {
  capDest(el) { syncCapFields(); UI.cap.dest = el.value; rerender(); },
  async capPhotos(el) { syncCapFields(); toast('Guardando fotos…'); const ids = await storePhotos(el.files, 'inbox'); UI.cap.photos = UI.cap.photos.concat(ids); rerender(); }
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
