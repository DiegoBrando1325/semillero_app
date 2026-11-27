/* Semillero — núcleos: proyectos que agrupan ideas aunque no se parezcan entre sí.
   Una idea puede estar en varios núcleos; el primero es su núcleo principal (donde orbita en el mapa). */
'use strict';

const NUC_STATUS = [{ id: 'activo', label: 'Activo' }, { id: 'pausa', label: 'En pausa' }, { id: 'terminado', label: 'Terminado' }];

function newNucleus(f) {
  return Object.assign({ id: uid(), title: '', goal: '', next: '', status: 'activo', mapPos: null }, f || {});
}
const nucleusTitle = (n) => (n && (n.title || '').trim()) || 'Núcleo sin nombre';
const nucleusIdeas = (nid) => S.ideas.filter((i) => (i.nuclei || []).includes(nid) && i.stage !== 'archivada');
const openQuestions = (idea) => (idea.questions || []).filter((q) => !q.done);

async function attachToNucleus(ideaId, nid) {
  const i = byId('ideas', ideaId);
  if (!i || !byId('nuclei', nid)) return;
  if (!i.nuclei.includes(nid)) { i.nuclei.push(nid); await persist('ideas', i); }
}
async function detachFromNucleus(ideaId, nid) {
  const i = byId('ideas', ideaId);
  if (!i) return;
  i.nuclei = i.nuclei.filter((x) => x !== nid); await persist('ideas', i);
}

function nucleusBadge(n) {
  const count = nucleusIdeas(n.id).length;
  return '<a class="nuc-card" href="#/nucleo/' + n.id + '"><span class="nuc-orb sm" aria-hidden="true"></span>' +
    '<span class="nuc-card-text"><strong>' + esc(nucleusTitle(n)) + '</strong><span>' + count + (count === 1 ? ' idea' : ' ideas') +
    (n.status !== 'activo' ? ' · ' + esc((NUC_STATUS.find((s) => s.id === n.status) || {}).label || '') : '') + '</span></span></a>';
}

/* ================= PANTALLA DE UN NÚCLEO ================= */
route(/^#\/nucleo\/([^/?]+)$/, viewNucleus, 'ideas');

function viewNucleus(id) {
  const n = byId('nuclei', id);
  if (!n) return topbar({ title: 'Núcleo', back: '#/ideas' }) + emptyState('No encontré este núcleo', 'Puede que se haya eliminado.', '<a class="btn" href="#/ideas">Volver al jardín</a>');
  const fld = (p) => 'data-field="nuclei|' + id + '|' + p + '"';
  const members = nucleusIdeas(id);
  const others = S.ideas.filter((i) => i.stage !== 'archivada' && !i.nuclei.includes(id));
  const questions = [];
  members.forEach((i) => openQuestions(i).forEach((q) => questions.push({ i, q })));
  const sessions = S.sessions.filter((s) => s.target === 'nucleo:' + id && !s.done && parseLocal(s.start) >= startOfToday()).sort((a, b) => a.start.localeCompare(b.start));

  let html = topbar({ title: '', back: '#/ideas', actions: '<a class="icon-btn" href="#/mapa" aria-label="Ver en el mapa"><svg class="ic" width="20" height="20" viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="18" cy="9" r="3"/><circle cx="11" cy="18" r="3"/><path d="M8.6 8.4 9.8 15.3M8.9 6.6l6.2 1.6M16.4 11.6l-3.6 4.2"/></svg></a>' });
  html += '<div class="row gap"><span class="nuc-orb" aria-hidden="true"></span><span class="small muted">Núcleo · proyecto</span></div>';
  html += '<label class="sr" for="nuc-title">Nombre del núcleo</label><textarea id="nuc-title" class="title-input autosize" rows="1" placeholder="Nombre del proyecto" ' + fld('title') + '>' + esc(n.title) + '</textarea>';
  html += field('Objetivo', '<textarea class="autosize" rows="2" placeholder="¿Qué quieres lograr con este proyecto?" ' + fld('goal') + '>' + esc(n.goal) + '</textarea>');
  html += field('Siguiente paso', '<input type="text" placeholder="Lo próximo concreto que harás" value="' + esc(n.next) + '" ' + fld('next') + '>');
  html += '<div class="chips" role="group" aria-label="Estado">' + NUC_STATUS.map((s) => chip(s.label, { on: n.status === s.id, data: { act: 'nucStatus', id, status: s.id } })).join('') + '</div>';

  html += '<section class="section"><div class="row between"><h2 class="h2 m0">Ideas del núcleo</h2><span class="small muted">' + members.length + '</span></div><div class="stack-s">' +
    (members.length ? members.map((i) => {
      const primary = i.nuclei[0] === id;
      return '<div class="card row gap nuc-member">' + orbHtml(i, 'xs') + '<a class="grow" href="#/idea/' + i.id + '"><strong>' + esc(ideaTitle(i)) + '</strong><span class="small muted">' + esc(stageLabel(i.stage)) +
        (openQuestions(i).length ? ' · ' + openQuestions(i).length + (openQuestions(i).length === 1 ? ' pregunta abierta' : ' preguntas abiertas') : '') + '</span></a>' +
        '<span class="pill' + (primary ? ' on' : '') + '">' + (primary ? 'principal' : 'también') + '</span>' +
        '<button class="icon-btn sm" data-act="nucDetach" data-idea="' + i.id + '" data-nuc="' + id + '" aria-label="Quitar del núcleo">' + icon('trash', 16) + '</button></div>';
    }).join('') : '<p class="small muted">Aún no hay ideas atadas. Añádelas aquí o, en el mapa, acerca una canica al núcleo.</p>') + '</div>' +
    (others.length ? field('Añadir una idea', '<select data-change="nucAddIdea" data-id="' + id + '"><option value="">Elegir idea…</option>' + others.map((i) => '<option value="' + i.id + '">' + esc(ideaTitle(i)) + '</option>').join('') + '</select>') : '') + '</section>';

  html += '<section class="section"><h2 class="h2">Preguntas abiertas</h2>' + (questions.length ? '<div class="stack-s">' + questions.map(({ i, q }) =>
    '<a class="card row gap" href="#/idea/' + i.id + '">' + moonIcon(false) + '<span class="grow">' + esc(q.q) + '<br><span class="small muted">' + esc(ideaTitle(i)) + '</span></span>' + icon('chevron') + '</a>').join('') + '</div>'
    : '<p class="small muted">Ninguna por ahora. Las preguntas de sus ideas aparecerán aquí.</p>') + '</section>';

  html += '<section class="section"><h2 class="h2">Sesiones</h2><div class="stack-s">' + (sessions.length ? sessions.map(sessionRow).join('') : '<p class="small muted">Sin sesiones próximas.</p>') + '</div>' +
    '<button class="btn ghost" data-act="newSession" data-target="nucleo:' + id + '">' + icon('clock', 16) + 'Agendar sesión</button></section>';

  html += '<section class="section"><button class="btn danger-ghost small-btn" data-act="nucDelete" data-id="' + id + '">Eliminar núcleo</button>' +
    '<p class="small muted">Eliminar el núcleo no borra sus ideas; solo las desata.</p></section>';
  return html;
}

function moonIcon(done) {
  return done
    ? '<svg class="moon" aria-hidden="true" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#F6E7B0" stroke="#B89A4E" stroke-width="1.5"/><circle cx="8" cy="9" r="1.6" fill="#E2CF92"/><circle cx="13.5" cy="13" r="1.2" fill="#E2CF92"/></svg>'
    : '<svg class="moon" aria-hidden="true" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#FBF8F1" stroke="#8C7A55" stroke-width="1.5"/><path d="M11 2a9 9 0 0 0 0 18a6.5 9 0 0 1 0-18z" fill="#D9CDB2"/></svg>';
}

Object.assign(ACTIONS, {
  async nucNew() {
    const nuc = newNucleus(); await addItem('nuclei', nuc); go('#/nucleo/' + nuc.id);
  },
  async nucStatus(el) { const n = byId('nuclei', el.dataset.id); n.status = el.dataset.status; await persist('nuclei', n); rerender(); },
  async nucDetach(el) {
    const i = byId('ideas', el.dataset.idea); const n = byId('nuclei', el.dataset.nuc);
    if (!confirm('¿Quitar "' + ideaTitle(i) + '" de "' + nucleusTitle(n) + '"?')) return;
    await detachFromNucleus(i.id, n.id); rerender();
  },
  async nucDelete(el) {
    const n = byId('nuclei', el.dataset.id); const count = nucleusIdeas(n.id).length;
    if (!confirm('¿Eliminar el núcleo "' + nucleusTitle(n) + '"?' + (count ? ' Sus ' + count + ' ideas se conservan, solo se desatan.' : ''))) return;
    for (const i of S.ideas.filter((x) => x.nuclei.includes(n.id))) await detachFromNucleus(i.id, n.id);
    for (const s of S.sessions.filter((x) => x.target === 'nucleo:' + n.id)) await removeItem('sessions', s.id);
    await removeItem('nuclei', n.id); toast('Núcleo eliminado'); go('#/ideas');
  },
  /* Desde una idea: la convierte en el centro de un núcleo nuevo, y puede llevarse sus lazos. */
  ideaToNucleus(el) {
    const i = byId('ideas', el.dataset.id);
    const rel = i.related.map((r) => byId('ideas', r)).filter(Boolean);
    openSheet('Crear un núcleo', '<p class="small">Se crea el núcleo <strong>' + esc(ideaTitle(i)) + '</strong> y esta idea queda atada a él. Las ideas que ya tenías unidas con lazos pueden unirse también.</p>' +
      (rel.length ? '<div class="stack-s">' + rel.map((r) => '<label class="check-row"><input type="checkbox" class="nuc-rel" value="' + r.id + '" checked><span>' + esc(ideaTitle(r)) + '</span></label>').join('') + '</div>' : '') +
      '<button class="btn block" data-act="ideaToNucleusGo" data-id="' + i.id + '">Crear núcleo</button>');
  },
  async ideaToNucleusGo(el) {
    const i = byId('ideas', el.dataset.id);
    const nuc = newNucleus({ title: ideaTitle(i), goal: (i.body || '').split('\n')[0].slice(0, 200) });
    await addItem('nuclei', nuc);
    await attachToNucleus(i.id, nuc.id);
    for (const cb of $$('.nuc-rel:checked')) await attachToNucleus(cb.value, nuc.id);
    closeSheet(); toast('Núcleo creado'); go('#/nucleo/' + nuc.id);
  },
  async ideaNucDetach(el) { await detachFromNucleus(el.dataset.idea, el.dataset.nuc); rerender(); },
  async ideaNucPrimary(el) {
    const i = byId('ideas', el.dataset.idea); const nid = el.dataset.nuc;
    i.nuclei = [nid].concat(i.nuclei.filter((x) => x !== nid)); await persist('ideas', i); toast('Ahora orbita en ' + nucleusTitle(byId('nuclei', nid))); rerender();
  }
});

Object.assign(CHANGES, {
  async nucAddIdea(el) { if (!el.value) return; await attachToNucleus(el.value, el.dataset.id); rerender(); },
  async ideaAddNuc(el) {
    if (!el.value) return;
    if (el.value === '__new') {
      const name = (prompt('Nombre del núcleo nuevo') || '').trim();
      if (!name) { el.value = ''; return; }
      const nuc = newNucleus({ title: name }); await addItem('nuclei', nuc); await attachToNucleus(el.dataset.id, nuc.id);
    } else await attachToNucleus(el.dataset.id, el.value);
    rerender();
  }
});
