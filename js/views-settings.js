/* Semillero — ajustes, IA, respaldos cifrados y exportación. */
'use strict';

route(/^#\/settings$/, viewSettings, 'home');

function isStandalone() { return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; }

function viewSettings() {
  const st = S.settings;
  const fld = (p) => 'data-field="settings|main|' + p + '"';
  onMount(async () => {
    const box = $('#storage-info'); if (!box || !navigator.storage) return;
    try {
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      const est = navigator.storage.estimate ? await navigator.storage.estimate() : null;
      box.textContent = (persisted ? 'Almacenamiento permanente activado.' : 'Almacenamiento normal (instala la app en la pantalla de inicio para protegerlo).') +
        (est && est.usage != null ? ' Usas ' + (est.usage / 1048576).toFixed(1) + ' MB.' : '');
    } catch (e) { /* sin datos */ }
  });

  let html = topbar({ title: 'Ajustes', back: '#/' });

  if (!isStandalone()) {
    html += '<section class="card soft-card"><h2 class="h2">Instálala en tu iPhone</h2><ol class="steps small">' +
      '<li>Abre esta página en <strong>Safari</strong>.</li><li>Toca el botón <strong>Compartir</strong> (cuadro con flecha).</li>' +
      '<li>Elige <strong>Agregar a pantalla de inicio</strong>.</li></ol><p class="small muted">Así se abre como app, funciona sin internet y iOS protege mejor tus datos.</p></section>';
  }

  html += '<section class="section">' + field('Tu nombre', '<input type="text" autocomplete="given-name" value="' + esc(st.name) + '" ' + fld('name') + '>') + '</section>';

  html += '<section class="section card"><h2 class="h2">Dibujo</h2>' +
    '<label class="switch"><input type="checkbox" ' + (st.shake !== false ? 'checked ' : '') + fld('shake') + '><span>Agitar el teléfono para dibujar en la hoja</span></label>' +
    '<button class="btn ghost small-btn" data-act="enableMotion">Activar sensor de movimiento</button>' +
    '<p class="small muted">iPhone pide permiso una vez. También puedes tocar el lápiz o rayar directo con Apple Pencil.</p></section>';

  html += '<section class="section card"><h2 class="h2">Vistas previas de links</h2><p class="small">Cuando escribes un link en una hoja, Semillero le pide a microlink.io el título y la imagen de esa página. Solo se envía la dirección del link, nunca tu nota. Si no hay internet, el link se muestra sin imagen.</p></section>';

  if (AI_ON) {
  html += '<section class="section card"><h2 class="h2">' + icon('spark', 18) + ' Inteligencia artificial (opcional)</h2>' +
    '<p class="small">Semillero usa tu propia clave de la API de Claude. La clave se guarda solo en este dispositivo y las consultas van directo de tu teléfono a Anthropic, sin servidores intermedios.</p>' +
    field('Clave de API', '<div class="row gap"><input id="api-key" class="grow" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sk-ant-…" value="' + esc(st.apiKey) + '" ' + fld('apiKey') + '>' +
      '<button class="btn ghost small-btn" data-act="toggleKey">Ver</button></div>', 'Créala en <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>. La app es gratis; la API se cobra por uso a tu cuenta de Anthropic.') +
    field('Modelo', '<select ' + fld('model') + '>' + AI.MODELS.map((m) => '<option value="' + m.id + '"' + (m.id === st.model ? ' selected' : '') + '>' + esc(m.label) + '</option>').join('') +
      (AI.MODELS.some((m) => m.id === st.model) ? '' : '<option value="' + esc(st.model) + '" selected>' + esc(st.model) + '</option>') + '</select>') +
    '<div class="row gap wrap"><button class="btn ghost" data-act="testAI">Probar conexión</button><button class="btn ghost" data-act="customModel">Usar otro modelo</button></div>' +
    '<p class="small muted">Cada idea y fragmento tiene un interruptor para impedir que la IA lo lea. Las fotos nunca se envían. En la <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">consola de Anthropic</a> puedes fijar un límite de gasto mensual.</p></section>';

  }

  html += '<section class="section card"><h2 class="h2">' + icon('lock', 18) + ' Respaldos</h2>' +
    '<p class="small">Tus datos viven en este teléfono. Haz respaldos cifrados y guárdalos en iCloud Drive, Google Drive o tu computadora: si pierdes el teléfono, los restauras en otro dispositivo.</p>' +
    '<p class="small muted">Último respaldo: ' + esc(st.lastBackup ? fmtDate(new Date(st.lastBackup), { day: 'numeric', month: 'long', year: 'numeric' }) : 'nunca') + '</p>' +
    '<div class="stack-s"><button class="btn" data-act="backupStart">Crear respaldo cifrado</button>' +
    '<label class="btn ghost">Restaurar respaldo<input type="file" accept=".json,.semillero,application/json" hidden data-change="restorePick"></label>' +
    '<button class="btn ghost" data-act="exportMarkdown">Exportar todo como texto legible (Markdown)</button></div>' +
    '<p class="small muted">El respaldo usa AES-256. Sin tu contraseña nadie puede leerlo, ni tú: guárdala bien. La clave de API no se incluye.</p></section>';

  html += '<section class="section card"><div class="row between"><h2 class="h2 m0">Tags</h2><a class="btn ghost small-btn" href="#/tags">Editar tags</a></div><div class="chips">' +
    st.sectors.map((s) => '<span class="chip"><span class="dot" style="background:' + sectorColor(s) + '"></span>' + esc(s) + '</span>').join('') + '</div>' +
    '<p class="small muted">Renombra, cambia el color, fusiona o borra tags.</p></section>';

  html += '<section class="section card"><h2 class="h2">Almacenamiento</h2><p class="small" id="storage-info">Revisando…</p>' +
    '<button class="btn ghost small-btn" data-act="persistStorage">Pedir almacenamiento permanente</button></section>';

  html += '<section class="section card danger-card"><h2 class="h2">Zona de peligro</h2><p class="small">Borra todas las ideas, obras, fotos y ajustes de este dispositivo.</p><button class="btn danger-ghost" data-act="wipeAll">Borrar todo</button></section>';
  html += '<p class="small muted center">Semillero 0.2 · Sin servidores, sin cuentas, sin rastreo.</p>';
  return html;
}

async function exportMarkdown() {
  const lines = ['# Semillero — exportación', '', 'Fecha: ' + fmtDate(new Date(), { dateStyle: 'long' }), ''];
  lines.push('## Ideas', '');
  S.ideas.forEach((i) => {
    const set = QUESTION_SETS[i.qset] || QUESTION_SETS.general;
    lines.push('### ' + ideaTitle(i), '', '- Etapa: ' + stageLabel(i.stage), '- Sectores: ' + (i.sectors.join(', ') || '—'), '- Creada: ' + (i.createdAt ? localDate(new Date(i.createdAt)) : '—'), '');
    if (plainText(i.body)) lines.push(plainText(i.body), '');
    set.items.forEach((it) => { if ((i.answers[it.id] || '').trim()) lines.push('**' + it.q + '** ' + i.answers[it.id], ''); });
    if (i.links.length) lines.push('Links:', ...i.links.map((l) => '- ' + l.url), '');
    if ((i.questions || []).length) lines.push('Preguntas:', ...i.questions.map((q) => '- ' + (q.done ? '[respondida] ' : '[abierta] ') + q.q + (q.a ? ' → ' + q.a : '')), '');
    if ((i.nuclei || []).length) lines.push('Núcleos: ' + i.nuclei.map((n) => nucleusTitle(byId('nuclei', n))).join(', '), '');
  });
  if (S.nuclei.length) { lines.push('## Núcleos', ''); S.nuclei.forEach((n) => lines.push('### ' + nucleusTitle(n), '', 'Estado: ' + nucStateLabel(n.status) + (n.systemId && byId('systems', n.systemId) ? ' · Sistema: ' + systemTitle(byId('systems', n.systemId)) : ''), n.goal ? 'Objetivo: ' + n.goal : '', n.next ? 'Siguiente paso: ' + n.next : '', 'Ideas: ' + (nucleusIdeas(n.id).map(ideaTitle).join(', ') || '—'), '')); }
  lines.push('## Taller de cine', '');
  S.works.forEach((w) => {
    lines.push('### ' + (w.title || 'Obra sin título'), '');
    if (w.logline) lines.push('*' + w.logline + '*', '');
    workFragments(w).forEach((f) => lines.push('#### ' + fragKindLabel(f.kind) + ': ' + fragTitle(f), '', (headingLine(f) ? headingLine(f) + '\n\n' : '') + (f.text || ''), ''));
    S.adaptations.filter((a) => a.workId === w.id).forEach((a) => lines.push('#### Adaptación: ' + fmtLabel(a.format) + ' (' + a.status + ')', '', '```', a.text, '```', ''));
  });
  const loose = S.fragments.filter((f) => !f.workId);
  if (loose.length) { lines.push('### Fragmentos sueltos', ''); loose.forEach((f) => lines.push('#### ' + fragKindLabel(f.kind) + ': ' + fragTitle(f), '', f.text || '', '')); }
  if (S.journal && S.journal.length) {
    lines.push('## Cuaderno', '');
    S.journal.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((e) => {
      lines.push('### ' + journalKind(e.kind).label + ' · ' + localDate(new Date(e.createdAt)) + (e.title ? ': ' + e.title : ''), '', e.text || '', '');
      if (emosOf(e).length) lines.push('Emoción: ' + emosOf(e).map(emoLabel).join(' + '), '');
      if (e.kind === 'terapia') lines.push('Estado: ' + (e.status === 'hablado' ? 'hablado' + (e.talkedAt ? ' el ' + e.talkedAt : '') : 'pendiente'), '');
      if (e.takeaway) lines.push('Lo que me llevé: ' + e.takeaway, '');
    });
  }
  if (S.inbox.length) { lines.push('## Bandeja', ''); S.inbox.forEach((c) => lines.push('- ' + (c.text || c.link).replace(/\n/g, ' '))); }
  return lines.join('\n');
}

Object.assign(ACTIONS, {
  async enableMotion() { const ok = await ensureMotion(); toast(ok ? 'Listo: agita el teléfono en una hoja para dibujar' : 'El navegador no dio permiso al sensor'); },
  toggleKey(el) { const i = $('#api-key'); i.type = i.type === 'password' ? 'text' : 'password'; el.textContent = i.type === 'password' ? 'Ver' : 'Ocultar'; },
  async testAI(el) {
    el.disabled = true; el.textContent = 'Probando…';
    try {
      const r = await AI.ask({ apiKey: S.settings.apiKey, model: S.settings.model, system: 'Responde en una sola frase en español.', messages: [{ role: 'user', content: 'Di hola y confirma que la conexión funciona.' }], maxTokens: 60 });
      toast('Conexión correcta: ' + r.text.slice(0, 80));
    } catch (e) { toast(e.message); }
    el.disabled = false; el.textContent = 'Probar conexión';
  },
  async customModel() {
    const m = (prompt('Identificador del modelo (por ejemplo claude-haiku-5-5)', S.settings.model) || '').trim();
    if (m) { S.settings.model = m; await saveSettings(); rerender(); }
  },
  backupStart() {
    openSheet('Respaldo cifrado', field('Contraseña del respaldo', '<input id="bk-pass" type="password" autocomplete="new-password" minlength="8">', 'Mínimo 8 caracteres. Úsala también para restaurar.') +
      field('Repite la contraseña', '<input id="bk-pass2" type="password" autocomplete="new-password">') +
      '<button class="btn block" data-act="backupEncrypt">Cifrar mis datos</button><div id="bk-ready"></div>');
  },
  async backupEncrypt(el) {
    const p = $('#bk-pass').value; const p2 = $('#bk-pass2').value;
    if (p.length < 8) { toast('Usa al menos 8 caracteres'); return; }
    if (p !== p2) { toast('Las contraseñas no coinciden'); return; }
    el.disabled = true; el.textContent = 'Cifrando…';
    flushPending();
    try {
      const data = await DB.exportAll();
      UI.backupText = await Vault.encrypt(data, p);
      const mb = (UI.backupText.length / 1048576).toFixed(1);
      $('#bk-ready').innerHTML = '<p class="small">Listo (' + mb + ' MB). Ahora guárdalo: en el menú elige <strong>Guardar en Archivos</strong> → iCloud Drive o Google Drive.</p><button class="btn block" data-act="backupSave">Guardar archivo de respaldo</button>';
      el.hidden = true;
    } catch (e) { toast('No se pudo cifrar: ' + e.message); el.disabled = false; el.textContent = 'Cifrar mis datos'; }
  },
  async backupSave() {
    const ok = await shareOrDownload('semillero-respaldo-' + localDate(new Date()) + '.json', UI.backupText, 'application/json');
    if (ok) { S.settings.lastBackup = nowISO(); await saveSettings(); UI.backupText = null; closeSheet(); toast('Respaldo guardado'); rerender(); }
  },
  async restoreRun(el) {
    const pass = $('#rs-pass').value; const mode = $('input[name="rs-mode"]:checked').value;
    if (mode === 'replace' && !confirm('Se reemplazarán TODOS los datos actuales por los del respaldo. ¿Continuar?')) return;
    el.disabled = true; el.textContent = 'Restaurando…';
    try {
      const data = await Vault.decrypt(UI.restoreText, pass);
      await DB.importAll(data, mode);
      await loadState();
      UI.restoreText = null; closeSheet(); toast('Respaldo restaurado'); go('#/');
    } catch (e) { toast(e.message); el.disabled = false; el.textContent = 'Restaurar'; }
  },
  async exportMarkdown() { shareOrDownload('semillero-' + localDate(new Date()) + '.md', await exportMarkdown(), 'text/markdown'); },
  async removeSector(el) {
    const s = el.dataset.sector;
    const used = S.ideas.filter((i) => i.sectors.includes(s)).length;
    if (!confirm('¿Quitar el sector "' + s + '" de la lista?' + (used ? ' Las ' + used + ' ideas que lo usan lo conservarán.' : ''))) return;
    S.settings.sectors = S.settings.sectors.filter((x) => x !== s); await saveSettings(); rerender();
  },
  async persistStorage() {
    if (!navigator.storage || !navigator.storage.persist) { toast('Este navegador no lo permite'); return; }
    const ok = await navigator.storage.persist();
    toast(ok ? 'Almacenamiento permanente activado' : 'iOS decide esto solo; instalar la app en la pantalla de inicio ayuda'); rerender();
  },
  async wipeAll() {
    const word = prompt('Esto borra todo en este dispositivo. Escribe BORRAR para confirmar.');
    if (word !== 'BORRAR') return;
    for (const s of DB.STORES) await DB.clear(s);
    await loadState(); toast('Datos borrados'); go('#/');
  }
});

Object.assign(CHANGES, {
  async restorePick(el) {
    const file = el.files && el.files[0]; if (!file) return;
    UI.restoreText = await file.text();
    el.value = '';
    openSheet('Restaurar respaldo', '<p class="small">Archivo: <strong>' + esc(file.name) + '</strong></p>' +
      field('Contraseña del respaldo', '<input id="rs-pass" type="password" autocomplete="current-password">') +
      '<div class="stack-s"><label class="radio"><input type="radio" name="rs-mode" value="merge" checked><span>Combinar con lo que ya tengo (se queda la versión más reciente)</span></label>' +
      '<label class="radio"><input type="radio" name="rs-mode" value="replace"><span>Reemplazar todo por el respaldo</span></label></div>' +
      '<button class="btn block" data-act="restoreRun">Restaurar</button>');
  }
});
