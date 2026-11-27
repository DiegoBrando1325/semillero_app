/* Semillero — agenda, sesiones de trabajo, revisión semanal y exportación a Calendario. */
'use strict';

route(/^#\/agenda$/, viewAgenda, 'agenda');

function upcomingSessions() {
  const t = startOfToday();
  return S.sessions.filter((s) => !s.done && parseLocal(s.start) >= t).sort((a, b) => a.start.localeCompare(b.start));
}

function targetObj(target) {
  const [k, id] = String(target).split(':');
  return k === 'idea' ? byId('ideas', id) : k === 'nucleo' ? byId('nuclei', id) : byId('works', id);
}
function targetTitle(target) {
  const o = targetObj(target);
  if (!o) return 'Elemento eliminado';
  if (target.startsWith('nucleo:')) return 'Núcleo: ' + nucleusTitle(o);
  return target.startsWith('idea:') ? ideaTitle(o) : 'Obra: ' + (o.title || 'sin título');
}
function targetHref(target) {
  const [k, id] = String(target).split(':');
  return k === 'idea' ? '#/idea/' + id : k === 'nucleo' ? '#/nucleo/' + id : '#/obra/' + id;
}
function targetSectors(target) {
  const o = targetObj(target);
  if (!o) return [];
  if (target.startsWith('nucleo:')) { const s = new Set(); nucleusIdeas(o.id).forEach((i) => i.sectors.forEach((x) => s.add(x))); return s.size ? Array.from(s) : ['Sin sector']; }
  return target.startsWith('idea:') ? (o.sectors.length ? o.sectors : ['Sin sector']) : ['Cine'];
}

function sessionWhen(s) {
  const d = parseLocal(s.start);
  const day0 = new Date(d); day0.setHours(0, 0, 0, 0);
  const diff = Math.round((day0 - startOfToday()) / DAY);
  const day = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : diff === -1 ? 'Ayer' : fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
  return day + ' · ' + fmtDate(d, { hour: '2-digit', minute: '2-digit' });
}

function sessionRow(s) {
  return '<div class="card session' + (s.done ? ' done' : '') + '">' +
    '<p class="small muted">' + esc(sessionWhen(s)) + ' · ' + s.minutes + ' min</p>' +
    '<a class="strong" href="' + targetHref(s.target) + '">' + esc(targetTitle(s.target)) + '</a>' +
    (s.goal ? '<p class="small">' + esc(s.goal) + '</p>' : '') +
    '<div class="row gap wrap"><button class="btn small-btn' + (s.done ? ' ghost' : '') + '" data-act="sessionDone" data-id="' + s.id + '">' + icon('check', 14) + (s.done ? 'Hecha' : 'Marcar hecha') + '</button>' +
    (s.done ? '' : '<button class="btn ghost small-btn" data-act="sessionIcs" data-id="' + s.id + '">Al calendario</button>') +
    '<button class="icon-btn sm" data-act="sessionDelete" data-id="' + s.id + '" aria-label="Eliminar sesión">' + icon('trash', 16) + '</button></div></div>';
}

function viewAgenda() {
  const up = upcomingSessions();
  const t = startOfToday();
  const pending = S.sessions.filter((s) => !s.done && parseLocal(s.start) < t && parseLocal(s.start) > new Date(t - 21 * DAY)).sort((a, b) => b.start.localeCompare(a.start));
  const monthStart = new Date(t.getFullYear(), t.getMonth(), 1);
  const doneMonth = S.sessions.filter((s) => s.done && parseLocal(s.start) >= monthStart);
  const bySector = {};
  doneMonth.forEach((s) => targetSectors(s.target).forEach((sec) => { bySector[sec] = (bySector[sec] || 0) + s.minutes; }));
  const sectorRows = Object.keys(bySector).sort((a, b) => bySector[b] - bySector[a]);
  const maxMin = Math.max.apply(null, sectorRows.map((k) => bySector[k]).concat([1]));

  const active = S.ideas.filter((i) => i.stage !== 'archivada');
  const stale = active.filter((i) => daysSince(i.updatedAt) >= 30).length;
  const noNext = active.filter((i) => !(i.answers.siguiente || '').trim()).length;

  let html = topbar({ title: 'Agenda', actions: '<button class="btn small-btn" data-act="newSession">' + icon('plus', 16) + 'Sesión</button>' });

  html += '<section class="section"><div class="row between"><h2 class="h2 m0">Próximas sesiones</h2>' +
    (up.length ? '<button class="link-btn small" data-act="icsAll">Todas al calendario</button>' : '') + '</div>' +
    (up.length ? '<div class="stack-s">' + up.map(sessionRow).join('') + '</div>' : '<p class="muted small">Nada agendado. Reservar aunque sea 30 minutos a la semana hace que las ideas avancen.</p>') + '</section>';

  if (pending.length) html += '<section class="section"><h2 class="h2">¿Las hiciste?</h2><div class="stack-s">' + pending.map(sessionRow).join('') + '</div></section>';

  html += '<section class="section card"><h2 class="h2">Horas este mes por sector</h2>' + (sectorRows.length ? sectorRows.map((k) =>
    '<div class="bar-row"><span class="bar-label">' + esc(k) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + Math.round((bySector[k] / maxMin) * 100) + '%;background:' + (k === 'Sin sector' ? '#8A8F96' : sectorColor(k)) + '"></span></span><span class="bar-val">' + (bySector[k] / 60).toFixed(1) + ' h</span></div>').join('')
    : '<p class="small muted">Marca sesiones como hechas para ver aquí en qué inviertes tu tiempo.</p>') + '</section>';

  html += '<section class="section card"><h2 class="h2">Jardinería semanal</h2><p class="small muted">Última revisión: ' + esc(relDays(S.settings.lastReview)) + '</p>' +
    '<ul class="checklist">' +
    '<li><a href="#/inbox">Clasificar la bandeja</a> <span class="badge">' + S.inbox.length + '</span></li>' +
    '<li><a href="#/ideas?stage=activas">Revisar ideas sin actividad en 30 días</a> <span class="badge">' + stale + '</span></li>' +
    '<li><a href="#/ideas?stage=activas">Definir siguiente paso donde falte</a> <span class="badge">' + noNext + '</span></li>' +
    '<li>Agendar al menos una sesión para la próxima semana</li>' +
    '<li><a href="#/settings">Hacer respaldo</a> <span class="small muted">(' + esc(relDays(S.settings.lastBackup)) + ')</span></li></ul>' +
    '<button class="btn" data-act="reviewDone">Marcar revisión hecha</button></section>';
  return html;
}

function sessionForm(preTarget) {
  const ideas = S.ideas.filter((i) => i.stage !== 'archivada');
  const works = S.works;
  if (!ideas.length && !works.length) return '<p>Primero crea una idea u obra para poder agendar tiempo en ella.</p><a class="btn" href="#/capture">Capturar idea</a>';
  const opt = (val, label) => '<option value="' + val + '"' + (val === preTarget ? ' selected' : '') + '>' + esc(label) + '</option>';
  const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
  const time = pad(d.getHours()) + ':00';
  return field('¿En qué vas a trabajar?', '<select id="s-target">' +
      (ideas.length ? '<optgroup label="Ideas">' + ideas.map((i) => opt('idea:' + i.id, ideaTitle(i))).join('') + '</optgroup>' : '') +
      (S.nuclei.length ? '<optgroup label="Núcleos">' + S.nuclei.map((n) => opt('nucleo:' + n.id, nucleusTitle(n))).join('') + '</optgroup>' : '') +
      (works.length ? '<optgroup label="Obras de cine">' + works.map((w) => opt('obra:' + w.id, w.title || 'Obra sin título')).join('') + '</optgroup>' : '') + '</select>') +
    '<div class="grid2">' + field('Día', '<input id="s-date" type="date" value="' + localDate(d) + '">') + field('Hora', '<input id="s-time" type="time" value="' + time + '">') + '</div>' +
    field('Duración', '<select id="s-min">' + [25, 30, 45, 60, 90, 120].map((m) => '<option value="' + m + '"' + (m === 60 ? ' selected' : '') + '>' + m + ' minutos</option>').join('') + '</select>') +
    field('Objetivo de la sesión', '<input id="s-goal" type="text" placeholder="Ej. escribir la escena del reencuentro">') +
    '<label class="switch"><input id="s-ics" type="checkbox" checked><span>Añadir también al calendario del iPhone</span></label>' +
    '<button class="btn block" data-act="sessionSave">Agendar</button>';
}

function icsFor(list) {
  const f = (d) => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  const e = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Semillero//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  list.forEach((s) => {
    const st = parseLocal(s.start); const en = new Date(st.getTime() + s.minutes * 60000);
    lines.push('BEGIN:VEVENT', 'UID:' + s.id + '@semillero', 'DTSTAMP:' + stamp, 'DTSTART:' + f(st), 'DTEND:' + f(en),
      'SUMMARY:' + e('Semillero · ' + targetTitle(s.target)), 'DESCRIPTION:' + e(s.goal || 'Sesión de trabajo'),
      'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:' + e('Sesión de Semillero'), 'END:VALARM', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

Object.assign(ACTIONS, {
  newSession(el) { openSheet('Agendar sesión', sessionForm(el.dataset.target || '')); },
  async sessionSave() {
    const target = $('#s-target').value; const date = $('#s-date').value; const time = $('#s-time').value || '09:00';
    if (!target || !date) { toast('Elige qué y cuándo'); return; }
    const s = { id: uid(), target, start: date + 'T' + time, minutes: Number($('#s-min').value), goal: $('#s-goal').value.trim(), done: false };
    /* El menú de compartir debe abrirse dentro del mismo toque, antes de esperar a la base de datos. */
    if ($('#s-ics').checked) shareOrDownload('sesion-semillero.ics', icsFor([s]), 'text/calendar');
    await addItem('sessions', s);
    closeSheet(); toast('Sesión agendada'); rerender();
  },
  async sessionDone(el) { const s = byId('sessions', el.dataset.id); s.done = !s.done; await persist('sessions', s); rerender(); },
  sessionIcs(el) { shareOrDownload('sesion-semillero.ics', icsFor([byId('sessions', el.dataset.id)]), 'text/calendar'); },
  icsAll() { shareOrDownload('sesiones-semillero.ics', icsFor(upcomingSessions()), 'text/calendar'); },
  async sessionDelete(el) { if (!confirm('¿Eliminar esta sesión?')) return; await removeItem('sessions', el.dataset.id); rerender(); },
  async reviewDone() { S.settings.lastReview = nowISO(); await saveSettings(); toast('Revisión registrada. ¡Buen trabajo!'); rerender(); }
});
