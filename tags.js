/* Semillero — editor de tags: renombrar, cambiar color, fusionar y borrar. */
'use strict';

route(/^#\/tags$/, viewTags, 'ideas');

function tagUse(name) { return S.ideas.filter((i) => (i.sectors || []).includes(name)).length; }

function viewTags() {
  ensureTagColors();
  const tags = S.settings.sectors.slice();
  return topbar({ title: 'Tags', sub: 'El color de cada tag tiñe las canicas', back: '#/ideas', actions: '<button class="btn small-btn" data-act="tagNew">' + icon('plus', 16) + 'Nuevo</button>' }) +
    '<div class="stack-s">' + (tags.length ? tags.map((t) => {
      const n = tagUse(t);
      return '<div class="card tag-row">' +
        '<button class="tag-swatch" style="background:' + sectorColor(t) + '" data-act="tagColor" data-tag="' + esc(t) + '" aria-label="Cambiar el color de ' + esc(t) + '"></button>' +
        '<span class="grow"><strong>' + esc(t) + '</strong><br><span class="small muted">' + n + (n === 1 ? ' idea' : ' ideas') + '</span></span>' +
        '<button class="btn ghost small-btn" data-act="tagMenu" data-tag="' + esc(t) + '">Editar</button></div>';
    }).join('') : emptyState('Sin tags', 'Crea tags para agrupar tus ideas por sector.', '')) + '</div>';
}

async function renameTag(oldName, newName) {
  newName = newName.trim();
  if (!newName || newName === oldName) return;
  const st = S.settings;
  if (st.sectors.includes(newName)) { await mergeTag(oldName, newName); return; }
  st.sectors = st.sectors.map((s) => (s === oldName ? newName : s));
  if (st.tagColors[oldName]) { st.tagColors[newName] = st.tagColors[oldName]; delete st.tagColors[oldName]; }
  for (const i of S.ideas) if (i.sectors.includes(oldName)) { i.sectors = i.sectors.map((s) => (s === oldName ? newName : s)); await persist('ideas', i); }
  await saveSettings();
}

async function mergeTag(from, into) {
  const st = S.settings;
  for (const i of S.ideas) {
    if (!i.sectors.includes(from)) continue;
    i.sectors = Array.from(new Set(i.sectors.map((s) => (s === from ? into : s))));
    await persist('ideas', i);
  }
  st.sectors = st.sectors.filter((s) => s !== from);
  delete st.tagColors[from];
  await saveSettings();
}

async function deleteTag(name) {
  for (const i of S.ideas) if (i.sectors.includes(name)) { i.sectors = i.sectors.filter((s) => s !== name); await persist('ideas', i); }
  S.settings.sectors = S.settings.sectors.filter((s) => s !== name);
  delete S.settings.tagColors[name];
  await saveSettings();
}

Object.assign(ACTIONS, {
  async tagNew() {
    const name = (prompt('Nombre del nuevo tag') || '').trim();
    if (!name) return;
    if (!S.settings.sectors.includes(name)) { S.settings.sectors.push(name); ensureTagColors(); await saveSettings(); }
    rerender();
  },
  tagMenu(el) {
    const t = el.dataset.tag; const n = tagUse(t);
    const others = S.settings.sectors.filter((s) => s !== t);
    openSheet(t, '<p class="small muted">' + n + (n === 1 ? ' idea usa' : ' ideas usan') + ' este tag.</p>' +
      field('Nombre', '<input id="tag-name" type="text" value="' + esc(t) + '">') +
      '<button class="btn block" data-act="tagRename" data-tag="' + esc(t) + '">Guardar nombre</button>' +
      '<button class="btn ghost block" data-act="tagColor" data-tag="' + esc(t) + '">Cambiar color</button>' +
      (others.length ? field('Fusionar con otro tag', '<select id="tag-merge"><option value="">Elegir…</option>' + others.map((o) => '<option>' + esc(o) + '</option>').join('') + '</select>',
        'Las ideas con "' + esc(t) + '" pasan al tag elegido y "' + esc(t) + '" desaparece.') +
        '<button class="btn ghost block" data-act="tagMerge" data-tag="' + esc(t) + '">Fusionar</button>' : '') +
      '<button class="btn danger-ghost block" data-act="tagDelete" data-tag="' + esc(t) + '">Borrar tag</button>');
  },
  async tagRename(el) {
    const t = el.dataset.tag; const v = $('#tag-name').value.trim();
    if (!v) { toast('Escribe un nombre'); return; }
    if (v !== t && S.settings.sectors.includes(v) && !confirm('Ya existe "' + v + '". ¿Fusionar "' + t + '" con él?')) return;
    await renameTag(t, v); closeSheet(); toast('Tag actualizado'); rerender();
  },
  async tagMerge(el) {
    const t = el.dataset.tag; const into = $('#tag-merge').value;
    if (!into) { toast('Elige con cuál fusionarlo'); return; }
    if (!confirm('¿Fusionar "' + t + '" con "' + into + '"?')) return;
    await mergeTag(t, into); closeSheet(); toast('Tags fusionados'); rerender();
  },
  async tagDelete(el) {
    const t = el.dataset.tag; const n = tagUse(t);
    if (!confirm('¿Borrar el tag "' + t + '"?' + (n ? ' Se quitará de ' + n + (n === 1 ? ' idea.' : ' ideas.') : ''))) return;
    await deleteTag(t); closeSheet(); toast('Tag borrado'); rerender();
  },
  tagColor(el) {
    const t = el.dataset.tag; const cur = sectorColor(t);
    const usedBy = {}; Object.keys(S.settings.tagColors || {}).forEach((k) => { usedBy[S.settings.tagColors[k]] = k; });
    openSheet('Color de ' + t, '<div class="palette">' + TAG_PALETTE.map((c) =>
      '<button class="palette-c' + (c === cur ? ' on' : '') + '" style="background:' + c + '" data-act="tagColorSet" data-tag="' + esc(t) + '" data-c="' + c + '" aria-label="Color ' + c + (usedBy[c] && usedBy[c] !== t ? ', ya lo usa ' + esc(usedBy[c]) : '') + '">' +
      (usedBy[c] && usedBy[c] !== t ? '<span class="palette-used">' + esc(usedBy[c].charAt(0)) + '</span>' : '') + '</button>').join('') + '</div>' +
      '<p class="small muted">Los colores con letra ya los usa otro tag; puedes repetirlo, pero las canicas se distinguirán menos.</p>');
  },
  async tagColorSet(el) {
    S.settings.tagColors[el.dataset.tag] = el.dataset.c; await saveSettings(); closeSheet(); rerender();
  }
});
