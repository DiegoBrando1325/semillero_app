/* Semillero — Taller de cine: fragmentos (escenas, diálogos, tramas…), obras y adaptaciones. */
'use strict';

function newFragment(f) {
  return Object.assign({
    id: uid(), workId: null, kind: 'escena', title: '',
    heading: { ie: 'INT.', place: '', time: 'DÍA' }, characters: '', goal: '', hints: {}, prompt: '', text: '', photos: [], aiAllowed: true
  }, f || {});
}
function newWork(f) {
  return Object.assign({ id: uid(), title: '', logline: '', genre: '', tone: '', ideaId: null, fragmentIds: [], aiAllowed: true }, f || {});
}
function newAdaptation(f) {
  return Object.assign({ id: uid(), workId: null, format: 'corto', status: 'Borrador', text: '', versions: [] }, f || {});
}

const SCREEN_KINDS = ['escena', 'dialogo'];
const fmtLabel = (id) => (AI.FORMATS[id] || AI.FORMATS.corto).label;
const isScreen = (id) => !!(AI.FORMATS[id] || {}).screen;

function workFragments(work) {
  const own = S.fragments.filter((f) => f.workId === work.id);
  const ordered = work.fragmentIds.map((id) => own.find((f) => f.id === id)).filter(Boolean);
  own.forEach((f) => { if (!ordered.includes(f)) ordered.push(f); });
  return ordered;
}

function headingLine(fr) {
  if (!SCREEN_KINDS.includes(fr.kind) || !fr.heading || !fr.heading.place.trim()) return '';
  return (fr.heading.ie + ' ' + fr.heading.place.trim() + ' - ' + fr.heading.time).toUpperCase();
}

function fragTitle(fr) { return (fr && fr.title.trim()) || fragKindLabel(fr.kind) + ' sin título'; }

function wordCount(t) { return (String(t || '').trim().match(/\S+/g) || []).length; }

function textStats(format, text) {
  if (isScreen(format)) {
    const st = Fountain.stats(text);
    return st.scenes + ' escenas · ~' + st.pages.toFixed(1) + ' págs · ~' + Math.max(st.minutes, text.trim() ? 1 : 0) + ' min en pantalla';
  }
  const w = wordCount(text);
  return w.toLocaleString('es-MX') + ' palabras · ~' + Math.max(1, Math.round(w / 250)) + ' págs';
}

/* ================= TALLER ================= */
route(/^#\/cine$/, viewCine, 'cine');

function viewCine() {
  const works = S.works.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const loose = S.fragments.filter((f) => !f.workId || !byId('works', f.workId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  let html = topbar({ title: 'Taller de cine', sub: 'De escena suelta a corto, guion o novela' });
  html += '<div class="row gap wrap"><button class="btn" data-act="newWork">' + icon('plus', 16) + 'Nueva obra</button><button class="btn ghost" data-act="newFrag">' + icon('plus', 16) + 'Fragmento</button>' +
    '<a class="btn ghost" href="#/dinamicas">' + icon('dice', 16) + 'Dinámicas</a></div>';
  html += dynamicCard('cine');
  const cineIdeas = S.ideas.filter((i) => i.stage !== 'archivada' && i.sectors.some((t) => CREATIVE_SECTORS.includes(t)) && !S.works.some((w) => w.ideaId === i.id));
  if (cineIdeas.length) html += '<section class="section"><div class="row between"><h2 class="h2 m0">Ideas de cine</h2><a class="small" href="#/mapa?focus=cine">En el mapa</a></div><div class="stack-s">' +
    cineIdeas.slice(0, 6).map((i) => '<div class="card row gap">' + orbHtml(i, 'xs') + '<a class="grow" href="#/idea/' + i.id + '"><strong>' + esc(ideaTitle(i)) + '</strong></a><button class="btn ghost small-btn" data-act="workFromIdea" data-id="' + i.id + '">Al taller</button></div>').join('') + '</div></section>';

  if (!works.length && !loose.length) {
    html += '<section class="card soft-card"><h2 class="h2">Cómo funciona</h2><ol class="steps">' +
      '<li><strong>Captura fragmentos</strong>: una escena, un diálogo, una trama, un personaje o una imagen que te llegó.</li>' +
      '<li><strong>Agrúpalos en una obra</strong> y ordénalos.</li>' +
      '<li><strong>Adáptala</strong> a uno o varios formatos: corto, largometraje, serie, novela, cuento, teatro, cómic o ficción sonora. Cada adaptación tiene su borrador y sus versiones.</li></ol>' +
      '<p class="small muted">Los guiones se escriben en Fountain, el formato abierto que abren Highland, Fade In, Beat y otros programas.</p></section>';
  }

  if (works.length) {
    html += '<section class="section"><h2 class="h2">Obras</h2><div class="stack">' + works.map((w) => {
      const frs = workFragments(w); const ads = S.adaptations.filter((a) => a.workId === w.id);
      return '<a class="card" href="#/obra/' + w.id + '"><strong>' + esc(w.title || 'Obra sin título') + '</strong>' +
        (w.logline ? '<p class="small muted clamp2">' + esc(w.logline) + '</p>' : '') +
        '<div class="tags">' + '<span class="tag">' + frs.length + ' fragmentos</span>' + ads.map((a) => '<span class="tag fmt">' + esc(fmtLabel(a.format)) + ' · ' + esc(a.status) + '</span>').join('') + '</div></a>';
    }).join('') + '</div></section>';
  }

  if (loose.length) {
    html += '<section class="section"><h2 class="h2">Fragmentos sueltos</h2><div class="stack-s">' + loose.map(fragRow).join('') + '</div></section>';
  }
  return html;
}

/* ---------- Pistas: preguntas opcionales que se abren solo si quieres ---------- */
function fragHints(f, screen) {
  const fh = (p) => 'data-field="fragments|' + f.id + '|' + p + '"';
  const H = f.hints || {};
  const out = [];
  if (screen) out.push({ id: 'donde', q: '¿Dónde y cuándo?', val: headingLine(f), editor: '<div class="heading-row">' +
      '<label><span class="sr">Interior o exterior</span><select ' + fh('heading.ie') + '>' + ['INT.', 'EXT.', 'INT./EXT.'].map((v) => '<option' + (f.heading.ie === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></label>' +
      '<label class="grow"><span class="sr">Lugar</span><input type="text" placeholder="LUGAR" value="' + esc(f.heading.place) + '" ' + fh('heading.place') + '></label>' +
      '<label><span class="sr">Momento</span><select ' + fh('heading.time') + '>' + ['DÍA', 'NOCHE', 'AMANECER', 'ATARDECER', 'CONTINUO', 'MÁS TARDE'].map((v) => '<option' + (f.heading.time === v ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></label></div>' });
  out.push({ id: 'quienes', q: f.kind === 'personaje' ? '¿Cómo es y qué esconde?' : '¿Quiénes están?', val: f.characters, editor: '<input type="text" placeholder="' + (f.kind === 'personaje' ? 'Nombre, edad, qué quiere, qué esconde' : 'MARTA, EL ARCHIVISTA…') + '" value="' + esc(f.characters) + '" ' + fh('characters') + '>' });
  out.push({ id: 'cambio', q: '¿Qué cambia entre el inicio y el final?', val: f.goal, editor: '<textarea class="autosize" rows="2" ' + fh('goal') + '>' + esc(f.goal) + '</textarea>' });
  out.push({ id: 'quiere', q: '¿Qué quiere cada quien?', val: H.quiere, editor: '<textarea class="autosize" rows="2" ' + fh('hints.quiere') + '>' + esc(H.quiere || '') + '</textarea>' });
  out.push({ id: 'subtexto', q: '¿Qué no se dice en voz alta?', val: H.subtexto, editor: '<textarea class="autosize" rows="2" ' + fh('hints.subtexto') + '>' + esc(H.subtexto || '') + '</textarea>' });
  out.push({ id: 'objeto', q: '¿Qué objeto carga la escena?', val: H.objeto, editor: '<input type="text" value="' + esc(H.objeto || '') + '" ' + fh('hints.objeto') + '>' });
  return out;
}
function workHints(w) {
  const fw = (p) => 'data-field="works|' + w.id + '|' + p + '"';
  return [
    { id: 'logline', q: 'La historia en una frase', val: w.logline, editor: '<textarea class="autosize" rows="2" placeholder="Quién quiere qué, qué se lo impide y qué está en juego." ' + fw('logline') + '>' + esc(w.logline) + '</textarea>' },
    { id: 'genero', q: '¿Qué género?', val: w.genre, editor: '<input type="text" placeholder="Drama, ciencia ficción…" value="' + esc(w.genre) + '" ' + fw('genre') + '>' },
    { id: 'tono', q: '¿Qué tono y referentes?', val: w.tone, editor: '<input type="text" placeholder="Melancólico, a lo Lucrecia Martel…" value="' + esc(w.tone) + '" ' + fw('tone') + '>' }
  ];
}
function hintsHtml(store, id, hints) {
  const openId = UI.hintOpen && UI.hintOpen.id === id ? UI.hintOpen.h : null;
  const filled = hints.filter((h) => (h.val || '').trim() && h.id !== openId);
  const empty = hints.filter((h) => !(h.val || '').trim() && h.id !== openId);
  const open = hints.find((h) => h.id === openId);
  return '<section class="pistas"><div class="row between"><h2 class="h3 m0">Pistas, si te atoras</h2><span class="small muted">opcionales</span></div>' +
    (filled.length ? '<div class="stack-s">' + filled.map((h) => '<button type="button" class="pista-done" data-act="hintOpen" data-id="' + id + '" data-h="' + h.id + '"><span class="small muted">' + esc(h.q) + '</span><span>' + esc(h.val) + '</span></button>').join('') + '</div>' : '') +
    (open ? '<div class="pista-open"><label class="small muted">' + esc(open.q) + '</label>' + open.editor + '<button class="link-btn small" data-act="hintClose">Listo</button></div>' : '') +
    (empty.length ? '<div class="chips scroll-x">' + empty.map((h) => '<button type="button" class="chip pista" data-act="hintOpen" data-id="' + id + '" data-h="' + h.id + '">' + esc(h.q) + '</button>').join('') + '</div>' : '') +
    '</section>';
}

function fragRow(f) {
  const h = headingLine(f);
  return '<a class="card frag-row" href="#/frag/' + f.id + '"><span class="kind kind-' + f.kind + '">' + esc(fragKindLabel(f.kind)) + '</span>' +
    '<span class="grow"><strong>' + esc(fragTitle(f)) + '</strong>' + (h ? '<br><span class="small mono muted">' + esc(h) + '</span>' : '') +
    (f.text ? '<br><span class="small muted clamp2">' + esc(f.text.slice(0, 160)) + '</span>' : '') + '</span></a>';
}

/* ================= OBRA ================= */
route(/^#\/obra\/([^/?]+)$/, viewWork, 'cine');

function viewWork(id) {
  const w = byId('works', id);
  if (!w) return topbar({ title: 'Obra', back: '#/cine' }) + emptyState('No encontré la obra', '', '<a class="btn" href="#/cine">Volver</a>');
  const fld = (p) => 'data-field="works|' + id + '|' + p + '"';
  const frs = workFragments(w);
  const ads = S.adaptations.filter((a) => a.workId === id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const loose = S.fragments.filter((f) => !f.workId || !byId('works', f.workId));
  const ideas = S.ideas.filter((i) => i.stage !== 'archivada' || i.id === w.ideaId);

  let html = topbar({ title: 'Obra', back: '#/cine' });
  html += '<label class="sr" for="w-title">Título</label><textarea id="w-title" class="title-input autosize" rows="1" placeholder="Título de la obra" ' + fld('title') + '>' + esc(w.title) + '</textarea>';
  html += field('Idea de origen', '<select ' + fld('ideaId') + ' data-type="null"><option value="">Ninguna</option>' + ideas.map((i) => '<option value="' + i.id + '"' + (i.id === w.ideaId ? ' selected' : '') + '>' + esc(ideaTitle(i)) + '</option>').join('') + '</select>');
  if (w.ideaId && byId('ideas', w.ideaId)) html += '<a class="small strong" href="#/idea/' + w.ideaId + '">Abrir la idea de origen →</a>';

  html += '<section class="section"><div class="row between"><h2 class="h2 m0">Fragmentos</h2><span class="small muted">' + frs.length + '</span></div><div class="stack-s">' +
    (frs.length ? frs.map((f, i) => '<div class="row gap-s">' + '<div class="col-btns"><button class="icon-btn sm" data-act="fragMove" data-work="' + id + '" data-id="' + f.id + '" data-dir="-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>' + icon('up', 16) + '</button>' +
      '<button class="icon-btn sm" data-act="fragMove" data-work="' + id + '" data-id="' + f.id + '" data-dir="1" aria-label="Bajar"' + (i === frs.length - 1 ? ' disabled' : '') + '>' + icon('down', 16) + '</button></div>' + fragRow(f) + '</div>').join('')
      : '<p class="small muted">Añade escenas, diálogos o tramas. El orden aquí es el que usará la IA para armar borradores.</p>') + '</div>' +
    '<div class="row gap wrap"><button class="btn ghost" data-act="newFrag" data-work="' + id + '">' + icon('plus', 16) + 'Nuevo fragmento</button></div>' +
    (loose.length ? field('Traer un fragmento suelto', '<select data-change="workAddLoose" data-id="' + id + '"><option value="">Elegir…</option>' + loose.map((f) => '<option value="' + f.id + '">' + esc(fragKindLabel(f.kind) + ' · ' + fragTitle(f)) + '</option>').join('') + '</select>') : '') + '</section>';

  html += '<section class="section"><div class="row between"><h2 class="h2 m0">Adaptaciones</h2><button class="btn small-btn" data-act="newAdapt" data-work="' + id + '">' + icon('plus', 16) + 'Adaptar</button></div><div class="stack-s">' +
    (ads.length ? ads.map((a) => '<a class="card" href="#/adapt/' + a.id + '"><div class="row between"><strong>' + esc(fmtLabel(a.format)) + '</strong><span class="tag fmt">' + esc(a.status) + '</span></div>' +
      '<p class="small muted">' + esc(textStats(a.format, a.text)) + ' · ' + esc(relDays(a.updatedAt)) + '</p></a>').join('')
      : '<p class="small muted">Una misma obra puede tener varias adaptaciones: por ejemplo un corto para festival y luego la novela.</p>') + '</div></section>';

  html += hintsHtml('works', id, workHints(w));
  html += '<section class="section row gap wrap"><button class="btn ghost" data-act="newSession" data-target="obra:' + id + '">' + icon('clock', 16) + 'Agendar sesión</button>' +
    '<button class="btn danger-ghost" data-act="deleteWork" data-id="' + id + '">Eliminar obra</button></section>';
  return html;
}

/* ================= FRAGMENTO ================= */
route(/^#\/frag\/([^/?]+)$/, viewFrag, 'cine');

function viewFrag(id) {
  const f = byId('fragments', id);
  if (!f) return topbar({ title: 'Fragmento', back: '#/cine' }) + emptyState('No encontré el fragmento', '', '<a class="btn" href="#/cine">Volver</a>');
  const fld = (p) => 'data-field="fragments|' + id + '|' + p + '"';
  const work = f.workId ? byId('works', f.workId) : null;
  const screen = SCREEN_KINDS.includes(f.kind);
  const tab = UI.fragTab;

  let html = topbar({ title: fragKindLabel(f.kind), sub: work ? work.title || 'Obra sin título' : 'Fragmento suelto', back: work ? '#/obra/' + work.id : '#/cine' });
  html += '<div class="chips">' + FRAG_KINDS.map((k) => chip(k.label, { on: f.kind === k.id, data: { act: 'fragKind', id, kind: k.id } })).join('') + '</div>';
  html += '<label class="sr" for="f-title">Título</label><textarea id="f-title" class="title-input autosize" rows="1" placeholder="Título del fragmento" ' + fld('title') + '>' + esc(f.title) + '</textarea>';

  if (f.prompt) html += '<div class="prompt-note">' + icon('dice', 18) + '<span class="grow">' + esc(f.prompt) + '</span><button class="icon-btn sm" data-act="fragPromptClear" data-id="' + id + '" aria-label="Quitar la consigna">' + icon('x', 16) + '</button></div>';
  html += '<div class="tabs" role="tablist"><button role="tab" aria-selected="' + (tab === 'editar') + '" class="tab' + (tab === 'editar' ? ' on' : '') + '" data-act="fragTab" data-tab="editar">Escribir</button>' +
    '<button role="tab" aria-selected="' + (tab === 'ver') + '" class="tab' + (tab === 'ver' ? ' on' : '') + '" data-act="fragTab" data-tab="ver">Vista de guion</button></div>';
  if (tab === 'ver') {
    html += '<div class="screenplay">' + Fountain.toHTML((headingLine(f) ? headingLine(f) + '\n\n' : '') + f.text) + '</div>';
  } else {
    if (screen) html += scriptToolbar('f-text');
    html += '<label class="sr" for="f-text">Texto</label><textarea id="f-text" class="autosize mono-input" rows="10" placeholder="' + (screen ? 'Escribe libre o en formato guion:\n\nMARTA\n(en voz baja)\nNo era aquí.' : 'Escribe el fragmento…') + '" ' + fld('text') + '>' + esc(f.text) + '</textarea>';
  }
  html += hintsHtml('fragments', id, fragHints(f, screen));
  html += dynamicCard('frag');

  html += '<div class="thumbs">' + f.photos.map((p) => '<button class="thumb" data-act="viewPhoto" data-blob="' + p + '" data-owner="fragments|' + id + '" aria-label="Ver imagen"><img alt="" data-blob="' + p + '"></button>').join('') +
    '<label class="thumb add">' + icon('camera') + '<span>Referencia</span><input type="file" accept="image/*" multiple hidden data-change="fragPhotos" data-id="' + id + '"></label></div>';

  html += field('Obra', '<select data-change="fragWork" data-id="' + id + '"><option value="">Fragmento suelto</option>' + S.works.map((w) => '<option value="' + w.id + '"' + (w.id === f.workId ? ' selected' : '') + '>' + esc(w.title || 'Obra sin título') + '</option>').join('') + '<option value="__new">+ Nueva obra con este fragmento</option></select>');

  html += aiTools('frag', id, ['aEscena', 'aProsa', 'dialogo', 'variaciones'], f.aiAllowed);
  if (AI_ON) html += '<label class="switch"><input type="checkbox" ' + (f.aiAllowed ? 'checked ' : '') + fld('aiAllowed') + '><span>Permitir que la IA lea este fragmento</span></label>';
  html += '<section class="section"><button class="btn danger-ghost" data-act="deleteFrag" data-id="' + id + '">Eliminar fragmento</button></section>';
  return html;
}

function scriptToolbar(targetId) {
  const b = (snip, label) => '<button type="button" class="chip" data-act="insertSnippet" data-target="' + targetId + '" data-snip="' + snip + '">' + label + '</button>';
  return '<div class="chips scroll-x toolbar" aria-label="Insertar elementos de guion">' + b('scene', 'Escena') + b('action', 'Acción') + b('char', 'Personaje') + b('paren', '(Acotación)') + b('trans', 'Transición') + '</div>';
}

function aiTools(scope, id, actions, allowed) {
  if (!AI_ON) return '';
  if (!S.settings.apiKey) return '<section class="section card soft-card"><p class="small">' + icon('spark', 14) + ' Conecta la API de Claude en <a href="#/settings">Ajustes</a> para adaptar, revisar diálogos y generar borradores.</p></section>';
  if (!allowed) return '<section class="section card soft-card"><p class="small">' + icon('lock', 14) + ' La IA está desactivada para este elemento.</p></section>';
  return '<section class="section card soft-card"><h2 class="h2">' + icon('spark', 16) + ' Asistente de escritura</h2><div class="chips">' +
    actions.map((a) => '<button type="button" class="chip" data-act="cineAI" data-scope="' + scope + '" data-id="' + id + '" data-action="' + a + '">' + esc(AI.CINE_ACTIONS[a].label) + '</button>').join('') +
    '</div><p class="small muted">Nada se cambia sin que tú lo apruebes. Las fotos nunca se envían.</p></section>';
}

/* ================= ADAPTACIÓN ================= */
route(/^#\/adapt\/([^/?]+)$/, viewAdapt, 'cine');

function viewAdapt(id) {
  const a = byId('adaptations', id);
  if (!a) return topbar({ title: 'Adaptación', back: '#/cine' }) + emptyState('No encontré la adaptación', '', '<a class="btn" href="#/cine">Volver</a>');
  const w = byId('works', a.workId);
  const fld = (p) => 'data-field="adaptations|' + id + '|' + p + '"';
  const screen = isScreen(a.format);
  const tab = UI.adaptTab;

  let html = topbar({ title: fmtLabel(a.format), sub: w ? (w.title || 'Obra sin título') : '', back: w ? '#/obra/' + w.id : '#/cine' });
  html += '<div class="grid2">' + field('Formato', '<select ' + fld('format') + '>' + Object.keys(AI.FORMATS).map((k) => '<option value="' + k + '"' + (k === a.format ? ' selected' : '') + '>' + esc(AI.FORMATS[k].label) + '</option>').join('') + '</select>') +
    field('Estado', '<select ' + fld('status') + '>' + ADAPT_STATUS.map((s) => '<option' + (s === a.status ? ' selected' : '') + '>' + s + '</option>').join('') + '</select>') + '</div>';
  html += '<p class="small muted" id="adapt-stats">' + esc(textStats(a.format, a.text)) + '</p>';

  html += '<div class="tabs" role="tablist"><button role="tab" aria-selected="' + (tab === 'editar') + '" class="tab' + (tab === 'editar' ? ' on' : '') + '" data-act="adaptTab" data-tab="editar">Escribir</button>' +
    '<button role="tab" aria-selected="' + (tab === 'ver') + '" class="tab' + (tab === 'ver' ? ' on' : '') + '" data-act="adaptTab" data-tab="ver">' + (screen ? 'Vista de guion' : 'Vista de lectura') + '</button></div>';
  if (tab === 'ver') {
    html += screen ? '<div class="screenplay">' + Fountain.toHTML(a.text) + '</div>'
      : '<div class="prose">' + (a.text.trim() ? a.text.split(/\n{2,}/).map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('') : '<p class="muted">Aún no hay texto.</p>') + '</div>';
  } else {
    if (screen) html += scriptToolbar('a-text');
    html += '<label class="sr" for="a-text">Borrador</label><textarea id="a-text" class="autosize ' + (screen ? 'mono-input' : 'prose-input') + '" rows="14" placeholder="' + (screen ? 'INT. CASA DE MARTA - NOCHE\n\nMarta revisa cajas viejas…' : 'Empieza a escribir…') + '" ' + fld('text') + '>' + esc(a.text) + '</textarea>';
  }

  html += '<div class="row gap wrap"><button class="btn ghost small-btn" data-act="adaptVersion" data-id="' + id + '">Guardar versión</button>' +
    '<button class="btn ghost small-btn" data-act="adaptExport" data-id="' + id + '">' + icon('share', 14) + 'Exportar ' + (screen ? '.fountain' : '.txt') + '</button>' +
    '<button class="btn ghost small-btn" data-act="adaptCopy" data-id="' + id + '">' + icon('copy', 14) + 'Copiar</button></div>';

  if (a.versions.length) {
    html += '<details class="card"><summary class="strong">Versiones guardadas (' + a.versions.length + ')</summary><div class="stack-s">' +
      a.versions.slice().reverse().map((v, ri) => {
        const i = a.versions.length - 1 - ri;
        return '<div class="row gap list-row"><span class="grow small">' + esc(v.label || 'Versión') + ' · ' + esc(fmtDate(new Date(v.at), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + ' · ' + wordCount(v.text) + ' palabras</span>' +
          '<button class="btn ghost small-btn" data-act="adaptRestore" data-id="' + id + '" data-i="' + i + '">Restaurar</button></div>';
      }).join('') + '</div></details>';
  }

  html += aiTools('adapt', id, ['borrador', 'continuar', 'dialogo', 'escaleta', 'formato'], !w || w.aiAllowed !== false);
  html += '<section class="section"><button class="btn danger-ghost" data-act="deleteAdapt" data-id="' + id + '">Eliminar adaptación</button></section>';
  return html;
}

HOOKS['adaptations.text'] = (a) => { const el = $('#adapt-stats'); if (el) el.textContent = textStats(a.format, a.text); };
HOOKS['adaptations.format'] = () => rerender();
HOOKS['fragments.heading'] = () => {};

function snapshot(a, label) {
  if (!a.text.trim()) return;
  const last = a.versions[a.versions.length - 1];
  if (last && last.text === a.text) return;
  a.versions.push({ at: nowISO(), text: a.text, label: label || 'Versión ' + (a.versions.length + 1) });
  if (a.versions.length > 30) a.versions = a.versions.slice(-30);
}

/* ================= IA de escritura ================= */
function fragmentBrief(fr) {
  return '[' + fragKindLabel(fr.kind) + '] ' + fragTitle(fr) + (headingLine(fr) ? '\nEncabezado: ' + headingLine(fr) : '') +
    (fr.characters ? '\nPersonajes: ' + fr.characters : '') + (fr.goal ? '\nObjetivo/conflicto: ' + fr.goal : '') + '\nTexto:\n' + (fr.text || '(vacío)');
}

function workBrief(w) {
  if (!w) return '';
  return 'Obra: ' + (w.title || 'sin título') + (w.logline ? '\nLogline: ' + w.logline : '') + (w.genre ? '\nGénero: ' + w.genre : '') + (w.tone ? '\nTono y referentes: ' + w.tone : '');
}

function cineRequest(scope, id, action) {
  const A = AI.CINE_ACTIONS[action];
  if (scope === 'frag') {
    const fr = byId('fragments', id); const w = fr.workId ? byId('works', fr.workId) : null;
    return {
      system: AI.BASE + '\n\n' + A.system,
      user: (w ? workBrief(w) + '\n\n' : '') + 'Material del autor:\n' + fragmentBrief(fr)
    };
  }
  const a = byId('adaptations', id); const w = byId('works', a.workId);
  const F = AI.FORMATS[a.format];
  const frs = w ? workFragments(w).filter((f) => f.aiAllowed) : [];
  const draft = a.text.length > 12000 ? '…' + a.text.slice(-12000) : a.text;
  return {
    system: AI.BASE + '\n\n' + A.system + '\n\nFormato de destino: ' + F.guide + '.' + (F.screen ? '\n' + AI.FOUNTAIN_RULES : ''),
    user: workBrief(w) + '\n\nFragmentos de la obra, en orden:\n\n' + (frs.length ? frs.map((f, i) => (i + 1) + '. ' + fragmentBrief(f)).join('\n\n') : '(sin fragmentos)') +
      '\n\nBorrador actual de la adaptación:\n' + (draft.trim() || '(vacío)')
  };
}

async function runCineAI(scope, id, action) {
  const A = AI.CINE_ACTIONS[action];
  const req = cineRequest(scope, id, action);
  openSheet(A.label, '<details class="privacy"><summary class="small">' + icon('lock', 14) + ' Ver exactamente qué se envía</summary><pre class="ctx">' + esc(req.user) + '</pre></details>' +
    '<div id="ai-out" class="ai-out thinking" role="status">Escribiendo…</div><div id="ai-out-actions" class="row gap wrap"></div>');
  try {
    const res = await AI.ask({ apiKey: S.settings.apiKey, model: S.settings.model, system: req.system, messages: [{ role: 'user', content: req.user }], maxTokens: action === 'borrador' ? 6000 : 3000 });
    UI.lastAI = { scope, id, action, text: res.text };
    const out = $('#ai-out'); if (!out) return;
    out.classList.remove('thinking'); out.classList.add('pre'); out.textContent = res.text;
    const editable = ['aEscena', 'aProsa', 'variaciones', 'borrador', 'continuar'].includes(action);
    $('#ai-out-actions').innerHTML = (editable ? '<button class="btn small-btn" data-act="aiApply" data-mode="append">Añadir al final</button>' +
      '<button class="btn ghost small-btn" data-act="aiApply" data-mode="replace">Reemplazar texto</button>' : '') +
      (scope === 'frag' && action === 'aEscena' ? '<button class="btn ghost small-btn" data-act="aiToAdapt">Usar en una adaptación</button>' : '') +
      '<button class="btn ghost small-btn" data-act="aiCopyLast">' + icon('copy', 14) + 'Copiar</button>';
  } catch (e) {
    const out = $('#ai-out'); if (out) { out.classList.remove('thinking'); out.textContent = e.message; out.classList.add('error'); }
  }
}

Object.assign(ACTIONS, {
  hintOpen(el) { UI.hintOpen = { id: el.dataset.id, h: el.dataset.h }; rerender(); setTimeout(() => { const x = $('.pista-open input, .pista-open textarea'); if (x) x.focus(); }, 30); },
  hintClose() { UI.hintOpen = null; rerender(); },
  async fragPromptClear(el) { const f = byId('fragments', el.dataset.id); f.prompt = ''; await persist('fragments', f); rerender(); },
  async newWork() { const w = newWork(); await addItem('works', w); go('#/obra/' + w.id); },
  async newFrag(el) {
    const fr = newFragment({ workId: el.dataset.work || null });
    await addItem('fragments', fr);
    if (el.dataset.work) { const w = byId('works', el.dataset.work); w.fragmentIds.push(fr.id); await persist('works', w); }
    UI.fragTab = 'editar'; go('#/frag/' + fr.id);
  },
  async workFromIdea(el) {
    const i = byId('ideas', el.dataset.id);
    const w = newWork({ title: i.title, logline: (i.answers.premisa || '').trim(), tone: (i.answers.tono || '').trim(), ideaId: i.id });
    await addItem('works', w);
    if (plainText(i.body)) {
      const fr = newFragment({ workId: w.id, kind: 'trama', title: 'Notas de la idea', text: plainText(i.body) });
      await addItem('fragments', fr); w.fragmentIds.push(fr.id); await persist('works', w);
    }
    if (!i.sectors.includes('Cine')) { i.sectors.push('Cine'); await persist('ideas', i); }
    go('#/obra/' + w.id);
  },
  async fragMove(el) {
    const w = byId('works', el.dataset.work);
    const ids = workFragments(w).map((f) => f.id);
    const i = ids.indexOf(el.dataset.id); const j = i + Number(el.dataset.dir);
    if (j < 0 || j >= ids.length) return;
    ids.splice(j, 0, ids.splice(i, 1)[0]);
    w.fragmentIds = ids; await persist('works', w); rerender();
  },
  async deleteWork(el) {
    const w = byId('works', el.dataset.id);
    if (!confirm('¿Eliminar la obra "' + (w.title || 'sin título') + '" y sus adaptaciones? Los fragmentos se conservan como sueltos.')) return;
    for (const f of S.fragments.filter((x) => x.workId === w.id)) { f.workId = null; await persist('fragments', f); }
    for (const a of S.adaptations.filter((x) => x.workId === w.id)) await removeItem('adaptations', a.id);
    for (const s of S.sessions.filter((x) => x.target === 'obra:' + w.id)) await removeItem('sessions', s.id);
    await removeItem('works', w.id); go('#/cine');
  },
  newAdapt(el) {
    openSheet('Nueva adaptación', '<p class="small muted">¿A qué formato quieres llevar esta obra?</p><div class="stack-s">' +
      Object.keys(AI.FORMATS).map((k) => '<button class="card fmt-pick" data-act="createAdapt" data-work="' + el.dataset.work + '" data-format="' + k + '"><strong>' + esc(AI.FORMATS[k].label) + '</strong><br><span class="small muted">' + esc(AI.FORMATS[k].guide) + '</span></button>').join('') + '</div>');
  },
  async createAdapt(el) {
    const a = newAdaptation({ workId: el.dataset.work, format: el.dataset.format });
    await addItem('adaptations', a); closeSheet(); UI.adaptTab = 'editar'; go('#/adapt/' + a.id);
  },
  async fragKind(el) { const f = byId('fragments', el.dataset.id); f.kind = el.dataset.kind; await persist('fragments', f); rerender(); },
  fragTab(el) { UI.fragTab = el.dataset.tab; rerender(); },
  adaptTab(el) { UI.adaptTab = el.dataset.tab; rerender(); },
  async deleteFrag(el) {
    const f = byId('fragments', el.dataset.id);
    if (!confirm('¿Eliminar este fragmento?')) return;
    for (const p of f.photos) await DB.del('blobs', p);
    const back = f.workId ? '#/obra/' + f.workId : '#/cine';
    if (f.workId) { const w = byId('works', f.workId); if (w) { w.fragmentIds = w.fragmentIds.filter((x) => x !== f.id); await persist('works', w); } }
    await removeItem('fragments', f.id); go(back);
  },
  insertSnippet(el) {
    const ta = $('#' + el.dataset.target); if (!ta) return;
    const SN = { scene: ['\n\nINT. LUGAR - DÍA\n\n', 'LUGAR'], action: ['\n\nDescribe la acción.\n', 'Describe la acción.'], char: ['\n\nPERSONAJE\n', 'PERSONAJE'], paren: ['\n(acotación)\n', 'acotación'], trans: ['\n\nCORTE A:\n\n', 'CORTE A:'] };
    const [snip, sel] = SN[el.dataset.snip];
    const start = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
    const before = ta.value.slice(0, start).replace(/\n+$/, '');
    const text = (before ? before : '') + (before ? snip : snip.replace(/^\n+/, '')) + ta.value.slice(ta.selectionEnd || start).replace(/^\n+/, '');
    ta.value = text;
    const pos = text.indexOf(sel, before.length);
    ta.focus();
    if (pos >= 0) ta.setSelectionRange(pos, pos + sel.length);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  },
  async adaptVersion(el) { const a = byId('adaptations', el.dataset.id); const n = a.versions.length; snapshot(a); if (a.versions.length > n) { await persist('adaptations', a); toast('Versión guardada'); rerender(); } else toast('No hay cambios desde la última versión'); },
  async adaptRestore(el) {
    const a = byId('adaptations', el.dataset.id); const v = a.versions[Number(el.dataset.i)];
    if (!confirm('¿Restaurar esta versión? El texto actual se guardará como versión antes.')) return;
    snapshot(a, 'Antes de restaurar'); a.text = v.text; await persist('adaptations', a); rerender();
  },
  adaptExport(el) {
    const a = byId('adaptations', el.dataset.id); const w = byId('works', a.workId);
    const title = (w && w.title) || 'Obra';
    const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'obra';
    if (isScreen(a.format)) shareOrDownload(slug + '.fountain', 'Title: ' + title + '\nCredit: Escrito por\nAuthor: ' + (S.settings.name || '') + '\nDraft date: ' + localDate(new Date()) + '\n\n' + a.text, 'text/plain');
    else shareOrDownload(slug + '.txt', title + '\n\n' + a.text, 'text/plain');
  },
  adaptCopy(el) { copyText(byId('adaptations', el.dataset.id).text); },
  async deleteAdapt(el) {
    const a = byId('adaptations', el.dataset.id);
    if (!confirm('¿Eliminar esta adaptación y sus versiones?')) return;
    await removeItem('adaptations', a.id); go(a.workId ? '#/obra/' + a.workId : '#/cine');
  },
  cineAI(el) { runCineAI(el.dataset.scope, el.dataset.id, el.dataset.action); },
  async aiApply(el) {
    const L = UI.lastAI; if (!L) return;
    const k = L.scope === 'frag' ? 'fragments' : 'adaptations';
    const obj = byId(k, L.id); if (!obj) return;
    if (k === 'adaptations') snapshot(obj, 'Antes de la IA');
    obj.text = el.dataset.mode === 'replace' ? L.text : (obj.text.trim() ? obj.text.replace(/\s+$/, '') + '\n\n' : '') + L.text;
    await persist(k, obj); closeSheet(); toast('Texto actualizado'); rerender();
  },
  aiCopyLast() { if (UI.lastAI) copyText(UI.lastAI.text); },
  aiToAdapt() {
    const L = UI.lastAI; const fr = byId('fragments', L.id);
    if (!fr.workId) { toast('Primero asigna el fragmento a una obra'); return; }
    const ads = S.adaptations.filter((a) => a.workId === fr.workId && isScreen(a.format));
    $('#ai-out-actions').innerHTML = '<div class="stack-s grow">' + ads.map((a) => '<button class="btn ghost small-btn" data-act="aiAppendTo" data-id="' + a.id + '">Añadir a ' + esc(fmtLabel(a.format)) + '</button>').join('') +
      '<button class="btn small-btn" data-act="aiNewAdaptFrom" data-work="' + fr.workId + '">Nueva adaptación: Cortometraje</button></div>';
  },
  async aiAppendTo(el) {
    const a = byId('adaptations', el.dataset.id); snapshot(a, 'Antes de añadir escena');
    a.text = (a.text.trim() ? a.text.replace(/\s+$/, '') + '\n\n' : '') + UI.lastAI.text;
    await persist('adaptations', a); closeSheet(); UI.adaptTab = 'editar'; go('#/adapt/' + a.id);
  },
  async aiNewAdaptFrom(el) {
    const a = newAdaptation({ workId: el.dataset.work, format: 'corto', text: UI.lastAI.text });
    await addItem('adaptations', a); closeSheet(); UI.adaptTab = 'editar'; go('#/adapt/' + a.id);
  }
});

Object.assign(CHANGES, {
  async workAddLoose(el) {
    if (!el.value) return;
    const w = byId('works', el.dataset.id); const f = byId('fragments', el.value);
    f.workId = w.id; w.fragmentIds.push(f.id); await persist('fragments', f); await persist('works', w); rerender();
  },
  async fragWork(el) {
    const f = byId('fragments', el.dataset.id);
    if (f.workId) { const old = byId('works', f.workId); if (old) { old.fragmentIds = old.fragmentIds.filter((x) => x !== f.id); await persist('works', old); } }
    if (el.value === '__new') {
      const w = newWork({ title: f.title, fragmentIds: [f.id] }); await addItem('works', w); f.workId = w.id;
    } else {
      f.workId = el.value || null;
      if (f.workId) { const w = byId('works', f.workId); w.fragmentIds.push(f.id); await persist('works', w); }
    }
    await persist('fragments', f); rerender();
  },
  async fragPhotos(el) {
    const f = byId('fragments', el.dataset.id); toast('Guardando imágenes…');
    const ids = await storePhotos(el.files, 'fragments|' + f.id); f.photos = f.photos.concat(ids); await persist('fragments', f); rerender();
  }
});
