/* Semillero — núcleos: proyectos que agrupan ideas aunque no se parezcan entre sí.
   Una idea puede estar en varios núcleos; el primero es su núcleo principal (donde orbita en el mapa). */
'use strict';

const DEFAULT_NUC_STATES = [{ id: 'explorando', label: 'Explorando' }, { id: 'activo', label: 'Activo' }, { id: 'pausa', label: 'En pausa' }, { id: 'bloqueado', label: 'Bloqueado' }, { id: 'terminado', label: 'Terminado' }];
const nucStates = () => (S.settings.nucStates && S.settings.nucStates.length ? S.settings.nucStates : DEFAULT_NUC_STATES);
const nucStateLabel = (id) => (nucStates().find((s) => s.id === id) || { label: '' }).label;

function newNucleus(f) {
  return Object.assign({ id: uid(), title: '', goal: '', next: '', status: 'activo', colors: [], systemId: '', mapPos: null }, f || {});
}
function newSystem(f) { return Object.assign({ id: uid(), title: '', colors: [], mapPos: null }, f || {}); }
const nucleusTitle = (n) => (n && (n.title || '').trim()) || 'Núcleo sin nombre';
const systemTitle = (s) => (s && (s.title || '').trim()) || 'Sistema sin nombre';
const nucleusIdeas = (nid) => S.ideas.filter((i) => (i.nuclei || []).includes(nid) && i.stage !== 'archivada');
const systemNuclei = (sid) => S.nuclei.filter((n) => n.systemId === sid);
const openQuestions = (idea) => (idea.questions || []).filter((q) => !q.done);

/* Colores del núcleo: los que elegiste o, si no, los tags más comunes de sus ideas. */
function nucColors(n) {
  if (n.colors && n.colors.length) return n.colors;
  const count = {};
  nucleusIdeas(n.id).forEach((i) => i.sectors.forEach((t) => { const c = sectorColor(t); count[c] = (count[c] || 0) + 1; }));
  return Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 3);
}
function nucBg(cs) {
  if (!cs.length) return '';
  const base = cs.length === 1 ? 'radial-gradient(circle at 50% 55%, ' + cs[0] + ', ' + cs[0] + ')'
    : 'linear-gradient(160deg, ' + cs.map((c, i) => c + ' ' + Math.round(i * 100 / cs.length) + '% ' + Math.round((i + 1) * 100 / cs.length) + '%').join(', ') + ')';
  return 'radial-gradient(circle at 34% 26%, rgba(255,255,255,.7), rgba(255,255,255,.12) 26%, transparent 46%), radial-gradient(circle at 50% 120%, rgba(0,0,0,.26), transparent 60%), ' + base;
}
function nucOrb(n, size, inner) {
  const cs = n ? nucColors(n) : [];
  const style = cs.length ? ' style="--nuc-bg:' + nucBg(cs) + ';--nuc-ring:' + cs[cs.length > 1 ? 1 : 0] + '"' : '';
  return '<span class="nuc-orb' + (size ? ' ' + size : '') + (cs.length ? ' colored' : '') + '" aria-hidden="true"' + style + '>' + (inner || '') + '</span>';
}

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
  const sys = n.systemId && byId('systems', n.systemId);
  return '<a class="nuc-card" href="#/nucleo/' + n.id + '">' + nucOrb(n, 'sm') +
    '<span class="nuc-card-text"><strong>' + esc(nucleusTitle(n)) + '</strong><span>' + count + (count === 1 ? ' idea' : ' ideas') +
    ' · ' + esc(nucStateLabel(n.status)) + (sys ? ' · ' + esc(systemTitle(sys)) : '') + '</span></span></a>';
}

function systemBadge(sy) {
  const ns = systemNuclei(sy.id);
  const ideas = new Set(); ns.forEach((n) => nucleusIdeas(n.id).forEach((i) => ideas.add(i.id)));
  return '<a class="nuc-card sys-card" href="#/sistema/' + sy.id + '"><span class="sys-dots" aria-hidden="true">' + ns.slice(0, 3).map((n) => nucOrb(n, 'xs')).join('') + '</span>' +
    '<span class="nuc-card-text"><strong>' + esc(systemTitle(sy)) + '</strong><span>Sistema · ' + ns.length + (ns.length === 1 ? ' núcleo' : ' núcleos') + ' · ' + ideas.size + ' ideas</span></span></a>';
}

/* ================= SISTEMA: proyecto grande con varios núcleos ================= */
route(/^#\/sistema\/([^/?]+)$/, viewSystem, 'ideas');

function viewSystem(id) {
  const sy = byId('systems', id);
  if (!sy) return topbar({ title: 'Sistema', back: '#/ideas' }) + emptyState('No encontré este sistema', 'Puede que se haya eliminado.', '<a class="btn" href="#/ideas">Volver al jardín</a>');
  const ns = systemNuclei(id); const free = S.nuclei.filter((n) => n.systemId !== id);
  let html = topbar({ title: '', back: '#/ideas', actions: '<a class="icon-btn" href="#/mapa?focus=s:' + id + '" aria-label="Ver en el mapa">' + icon('target') + '</a>' });
  html += '<p class="small muted">Sistema · ' + ns.length + (ns.length === 1 ? ' núcleo' : ' núcleos') + '</p>';
  html += '<label class="sr" for="sys-title">Nombre del sistema</label><textarea id="sys-title" class="title-input autosize" rows="1" placeholder="Nombre del proyecto grande" data-field="systems|' + id + '|title">' + esc(sy.title) + '</textarea>';
  html += '<p class="small muted">En el mapa, sus núcleos orbitan juntos y guardan distancia de los demás proyectos.</p>';
  html += '<section class="section"><h2 class="h2">Núcleos</h2><div class="stack-s">' + (ns.length ? ns.map((n) => nucleusBadge(n)).join('') : '<p class="small muted">Aún no tiene núcleos.</p>') + '</div>' +
    (free.length ? field('Añadir un núcleo', '<select data-change="sysAddNuc" data-id="' + id + '"><option value="">Elegir núcleo…</option>' + free.map((n) => '<option value="' + n.id + '">' + esc(nucleusTitle(n)) + '</option>').join('') + '</select>') : '') + '</section>';
  html += '<section class="section"><button class="btn danger-ghost small-btn" data-act="sysDelete" data-id="' + id + '">Eliminar sistema</button><p class="small muted">Sus núcleos y sus ideas se conservan.</p></section>';
  return html;
}

function ideaPreviewCard(i, from) {
  const oq = openQuestions(i).length;
  const snippet = plainText(i.body).replace(/\s+/g, ' ').slice(0, 120);
  const thumb = i.photos && i.photos[0] ? '<span class="pv-thumb"><img alt="" data-blob="' + i.photos[0] + '"></span>'
    : (i.ink && i.ink.strokes && i.ink.strokes.length ? '<span class="pv-thumb ink">' + inkMini(i.ink) + '</span>' : '');
  return '<a class="pv-card" href="#/idea/' + i.id + (from ? '?from=' + from : '') + '">' + thumb +
    '<span class="row gap-s">' + orbHtml(i, 'xs') + '<strong>' + esc(ideaTitle(i)) + '</strong></span>' +
    (snippet ? '<span class="pv-snip">' + esc(snippet) + '</span>' : '') +
    '<span class="pv-meta"><span class="pill">' + esc(stageLabel(i.stage)) + '</span>' + (oq ? '<span class="row gap-s">' + moonIcon(false) + oq + (oq === 1 ? ' abierta' : ' abiertas') + '</span>' : '') + '</span></a>';
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

  let html = topbar({ title: '', back: n.systemId && byId('systems', n.systemId) ? '#/sistema/' + n.systemId : '#/ideas', actions: '<a class="icon-btn" href="#/mapa" aria-label="Ver en el mapa"><svg class="ic" width="20" height="20" viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="18" cy="9" r="3"/><circle cx="11" cy="18" r="3"/><path d="M8.6 8.4 9.8 15.3M8.9 6.6l6.2 1.6M16.4 11.6l-3.6 4.2"/></svg></a>' });
  const sys = n.systemId && byId('systems', n.systemId);
  html += '<div class="nuc-head">' + nucOrb(n, 'lg') + '<div class="grow"><p class="small muted">Núcleo · ' + members.length + (members.length === 1 ? ' idea' : ' ideas') + ' · ' + questions.length + (questions.length === 1 ? ' pregunta' : ' preguntas') + '</p>' +
    '<label class="sr" for="nuc-title">Nombre del núcleo</label><textarea id="nuc-title" class="title-input autosize" rows="1" placeholder="Nombre del proyecto" ' + fld('title') + '>' + esc(n.title) + '</textarea>' +
    '<button type="button" class="chip" data-act="nucColors" data-id="' + id + '"><span class="swatches">' + (nucColors(n).length ? nucColors(n).map((c) => '<span style="background:' + c + '"></span>').join('') : '<span></span>') + '</span>Colores</button></div></div>';
  html += '<section class="section"><div class="row between"><h2 class="h3 m0">Estado</h2><button class="link-btn small" data-act="nucStatesEdit">Editar estados</button></div><div class="chips scroll-x" role="group" aria-label="Estado">' +
    nucStates().map((st) => chip(st.label, { on: n.status === st.id, data: { act: 'nucStatus', id, status: st.id } })).join('') + '</div></section>';
  html += '<div class="card stack-s">' + field('Objetivo', '<textarea class="autosize" rows="2" placeholder="¿Qué quieres lograr con este proyecto?" ' + fld('goal') + '>' + esc(n.goal) + '</textarea>') +
    field('Siguiente paso', '<input type="text" placeholder="Lo próximo concreto que harás" value="' + esc(n.next) + '" ' + fld('next') + '>') + '</div>';

  html += '<section class="section"><div class="row between"><h2 class="h2 m0">Ideas del núcleo</h2><span class="small muted">' + (members.length > 1 ? 'desliza →' : members.length) + '</span></div>' +
    (members.length ? '<div class="pv-row">' + members.map((i) => ideaPreviewCard(i, 'n:' + id)).join('') + '</div>' +
      '<details class="small"><summary>Ordenar y quitar ideas</summary><div class="stack-s" style="margin-top:8px">' + members.map((i) => {
        const primary = i.nuclei[0] === id;
        return '<div class="card row gap nuc-member">' + orbHtml(i, 'xs') + '<a class="grow" href="#/idea/' + i.id + '?from=n:' + id + '"><strong>' + esc(ideaTitle(i)) + '</strong></a>' +
          '<span class="pill' + (primary ? ' on' : '') + '">' + (primary ? 'principal' : 'también') + '</span>' +
          '<button class="icon-btn sm" data-act="nucDetach" data-idea="' + i.id + '" data-nuc="' + id + '" aria-label="Quitar del núcleo">' + icon('trash', 16) + '</button></div>';
      }).join('') + '</div></details>'
      : '<p class="small muted">Aún no hay ideas atadas. Añádelas aquí o, en el mapa, acerca una canica al núcleo.</p>') +
    (others.length ? field('Añadir una idea', '<select data-change="nucAddIdea" data-id="' + id + '"><option value="">Elegir idea…</option>' + others.map((i) => '<option value="' + i.id + '">' + esc(ideaTitle(i)) + '</option>').join('') + '</select>') : '') + '</section>';

  html += '<section class="section"><h2 class="h3">Sistema</h2><p class="small muted">Un sistema es un proyecto grande que agrupa varios núcleos; en el mapa orbitan juntos.</p>' +
    '<label class="sr" for="nuc-sys">Sistema</label><select id="nuc-sys" data-change="nucSystem" data-id="' + id + '"><option value="">Sin sistema</option>' +
    S.systems.map((x) => '<option value="' + x.id + '"' + (x.id === n.systemId ? ' selected' : '') + '>' + esc(systemTitle(x)) + '</option>').join('') + '<option value="__new">+ Sistema nuevo…</option></select>' +
    (sys ? '<a class="small" href="#/sistema/' + sys.id + '">Ver el sistema ' + esc(systemTitle(sys)) + '</a>' : '') + '</section>';

  html += '<div class="future-card row gap">' + icon('layers', 20) + '<span class="small"><strong>Resumen del núcleo</strong> · llega en la siguiente versión: juntará lo que dicen sus ideas, qué se repite y qué falta.</span></div>';

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

const NUC_PICK = ['#5FA873', '#E06B5A', '#3FA3B5', '#8E6BD8', '#4F7BD6', '#D98A3D', '#D46A9A', '#C9A227', '#2F6B5E', '#B03A6F', '#7FB800', '#1F4E9C', '#A0522D', '#6C7A89', '#00A3C4', '#8D6E63'];

function nucColorsSheet(n) {
  const cur = nucColors(n); const chosen = n.colors || [];
  return '<p class="small muted">Elige hasta 4 colores. Sin elegir, el núcleo usa los colores de los tags de sus ideas.</p><div class="palette">' +
    NUC_PICK.map((c) => '<button type="button" class="palette-c' + (chosen.includes(c) ? ' on' : '') + '" style="background:' + c + '" data-act="nucColorToggle" data-id="' + n.id + '" data-c="' + c + '" aria-pressed="' + chosen.includes(c) + '" aria-label="Color ' + c + '"></button>').join('') + '</div>' +
    '<div class="row gap" style="margin-top:12px">' + nucOrb(n, 'lg') + '<span class="small grow">' + (chosen.length ? chosen.length + ' de 4' : 'Automático: ' + (cur.length ? 'según sus tags' : 'beige')) + '</span>' +
    (chosen.length ? '<button class="btn ghost small-btn" data-act="nucColorAuto" data-id="' + n.id + '">Automático</button>' : '') + '</div>';
}
function nucStatesSheet() {
  return '<p class="small muted">Renómbralos, agrega los tuyos o quita los que no uses.</p><div class="stack-s">' + nucStates().map((st, i) =>
    '<div class="row gap"><label class="sr" for="nst-' + i + '">Estado ' + (i + 1) + '</label><input id="nst-' + i + '" type="text" value="' + esc(st.label) + '" data-change="nucStateRename" data-i="' + i + '">' +
    '<button class="icon-btn sm" data-act="nucStateDel" data-i="' + i + '" aria-label="Quitar ' + esc(st.label) + '"' + (nucStates().length < 2 ? ' disabled' : '') + '>' + icon('trash', 16) + '</button></div>').join('') +
    '</div><button class="btn ghost block" data-act="nucStateAdd" style="margin-top:10px">' + icon('plus', 16) + 'Agregar estado</button>';
}

Object.assign(ACTIONS, {
  async sysDelete(el) {
    const sy = byId('systems', el.dataset.id);
    if (!confirm('¿Eliminar el sistema "' + systemTitle(sy) + '"? Sus núcleos se conservan.')) return;
    for (const n of systemNuclei(sy.id)) { n.systemId = ''; await persist('nuclei', n); }
    await removeItem('systems', sy.id); toast('Sistema eliminado'); go('#/ideas');
  },
  nucColors(el) { openSheet('Colores del núcleo', nucColorsSheet(byId('nuclei', el.dataset.id))); },
  async nucColorToggle(el) {
    const n = byId('nuclei', el.dataset.id); const c = el.dataset.c; n.colors = n.colors || [];
    if (n.colors.includes(c)) n.colors = n.colors.filter((x) => x !== c); else if (n.colors.length < 4) n.colors.push(c); else { toast('Máximo 4 colores'); return; }
    await persist('nuclei', n); $('#sheet-body').innerHTML = nucColorsSheet(n); rerender();
  },
  async nucColorAuto(el) { const n = byId('nuclei', el.dataset.id); n.colors = []; await persist('nuclei', n); $('#sheet-body').innerHTML = nucColorsSheet(n); rerender(); },
  nucStatesEdit() { openSheet('Estados de los núcleos', nucStatesSheet()); },
  async nucStateAdd() {
    S.settings.nucStates = nucStates().concat([{ id: 'st-' + uid().slice(0, 8), label: 'Nuevo estado' }]); await saveSettings();
    $('#sheet-body').innerHTML = nucStatesSheet(); rerender(); const ins = $$('#sheet-body input'); if (ins.length) ins[ins.length - 1].select();
  },
  async nucStateDel(el) {
    const list = nucStates().slice(); const st = list[Number(el.dataset.i)]; if (!st) return;
    const using = S.nuclei.filter((n) => n.status === st.id);
    if (!confirm('¿Quitar el estado "' + st.label + '"?' + (using.length ? ' ' + using.length + ' núcleo(s) pasarán a "' + (list.find((x) => x.id !== st.id) || {}).label + '".' : ''))) return;
    list.splice(Number(el.dataset.i), 1); S.settings.nucStates = list; await saveSettings();
    for (const n of using) { n.status = list[0].id; await persist('nuclei', n); }
    $('#sheet-body').innerHTML = nucStatesSheet(); rerender();
  },
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
    const nuc = newNucleus({ title: ideaTitle(i), goal: plainText(i.body).split('\n')[0].slice(0, 200) });
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
  async sysAddNuc(el) { if (!el.value) return; const n = byId('nuclei', el.value); n.systemId = el.dataset.id; await persist('nuclei', n); rerender(); },
  async nucStateRename(el) {
    const list = nucStates().map((x) => Object.assign({}, x)); const st = list[Number(el.dataset.i)]; const v = el.value.trim();
    if (!st || !v) return; st.label = v; S.settings.nucStates = list; await saveSettings(); rerender();
  },
  async nucSystem(el) {
    const n = byId('nuclei', el.dataset.id);
    if (el.value === '__new') {
      const name = (prompt('Nombre del sistema (el proyecto grande)') || '').trim();
      if (!name) { el.value = n.systemId || ''; return; }
      const sy = newSystem({ title: name }); await addItem('systems', sy); n.systemId = sy.id;
    } else n.systemId = el.value;
    await persist('nuclei', n); rerender();
  },
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
