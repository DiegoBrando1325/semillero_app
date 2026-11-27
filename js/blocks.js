/* Semillero — texto con imágenes intercaladas.
   El cuerpo guarda una marca [[img:ID]] donde va cada imagen; las fotos sin marca se muestran al final. */
'use strict';

const IMG_SPLIT = /\n?\[\[img:([\w-]+)\]\]\n?/;
const IMG_ALL = /\n?\[\[img:[\w-]+\]\]\n?/g;

/* Texto sin marcas de imagen (búsquedas, tarjetas, exportar, IA). */
function plainText(s) { return String(s || '').replace(IMG_ALL, '\n').replace(/\n{3,}/g, '\n\n').trim(); }

function parseBlocks(text, photos) {
  photos = photos || [];
  const parts = String(text || '').split(IMG_SPLIT);
  const segs = [parts[0]]; const ids = [];
  for (let i = 1; i < parts.length; i += 2) {
    const id = parts[i]; const next = parts[i + 1] || '';
    if (photos.includes(id) && !ids.includes(id)) { ids.push(id); segs.push(next); } else if (next) segs[segs.length - 1] += (segs[segs.length - 1] ? '\n' : '') + next;
  }
  photos.forEach((p) => { if (!ids.includes(p)) { ids.push(p); segs.push(''); } });
  return { segs, ids };
}

function joinBlocks(segs, ids) {
  let s = segs[0] || '';
  ids.forEach((id, i) => { s += '\n[[img:' + id + ']]\n' + (segs[i + 1] || ''); });
  return s;
}

function blocksHtml(key, text, photos, placeholder) {
  const { segs, ids } = parseBlocks(text, photos);
  let h = '<div class="blocks" data-key="' + esc(key) + '">';
  segs.forEach((s, i) => {
    h += '<textarea ' + (i === 0 ? 'id="hoja-body" ' : '') + 'class="hoja-body blk autosize" rows="' + (i === 0 ? 3 : 1) + '" data-seg="' + i + '"' +
      (i === 0 ? ' placeholder="' + esc(placeholder || 'Escribe libremente. La primera oración se vuelve el título.') + '"' : (i === segs.length - 1 ? ' placeholder="Sigue escribiendo…"' : '')) +
      ' aria-label="' + (i === 0 ? 'Nota' : 'Texto después de la imagen') + '">' + esc(s) + '</textarea>';
    if (i < ids.length) {
      const id = ids[i];
      h += '<figure class="blk-img" data-img="' + id + '"><button type="button" class="blk-open" data-act="viewPhoto" data-blob="' + id + '" data-owner="' + esc(key) + '" aria-label="Ver imagen"><img alt="" data-blob="' + id + '"></button>' +
        '<div class="blk-tools">' +
        '<button type="button" class="icon-btn sm" data-act="blkMove" data-key="' + esc(key) + '" data-img="' + id + '" data-dir="-1" aria-label="Subir imagen">' + icon('up', 16) + '</button>' +
        '<button type="button" class="icon-btn sm" data-act="blkMove" data-key="' + esc(key) + '" data-img="' + id + '" data-dir="1" aria-label="Bajar imagen">' + icon('down', 16) + '</button>' +
        '<button type="button" class="icon-btn sm" data-act="blkDel" data-key="' + esc(key) + '" data-img="' + id + '" aria-label="Quitar imagen">' + icon('trash', 16) + '</button></div></figure>';
    }
  });
  return h + '</div>';
}

function readBlocks(root) {
  const segs = []; const ids = [];
  Array.from(root.children).forEach((el) => { if (el.classList.contains('blk')) segs.push(el.value); else if (el.classList.contains('blk-img')) ids.push(el.dataset.img); });
  return { segs, ids };
}

function blocksOwner(key) {
  if (key === 'cap') return UI.cap;
  const i = key.indexOf('|'); return byId(key.slice(0, i), key.slice(i + 1));
}
function blocksStore(key, text, now) {
  if (key === 'cap') { UI.cap.text = text; saveDraft(now); return; }
  const i = key.indexOf('|'); const k = key.slice(0, i); const obj = byId(k, key.slice(i + 1));
  if (!obj) return;
  obj.body = text; persist(k, obj, now ? 0 : 450);
  const hook = HOOKS[k + '.body']; if (hook) hook(obj);
}
function onBlockInput(el) {
  const root = el.closest('.blocks'); if (!root) return;
  const { segs, ids } = readBlocks(root);
  blocksStore(root.dataset.key, joinBlocks(segs, ids));
}

/* Recuerda dónde estaba el cursor para insertar ahí la siguiente imagen. */
document.addEventListener('focusout', (e) => {
  const t = e.target;
  if (t && t.classList && t.classList.contains('blk')) UI.blkCaret = { key: t.closest('.blocks').dataset.key, seg: Number(t.dataset.seg), pos: t.selectionStart };
});

async function insertImages(key, files) {
  const owner = blocksOwner(key); if (!owner) return;
  const root = $('.blocks[data-key="' + key + '"]');
  const cur = root ? readBlocks(root) : parseBlocks(key === 'cap' ? owner.text : owner.body, owner.photos);
  toast('Guardando imagen…');
  const ids = await storePhotos(files, key === 'cap' ? 'inbox' : key);
  if (!ids.length) return;
  let seg = cur.segs.length - 1; let pos = cur.segs[seg].length;
  const c = UI.blkCaret;
  if (c && c.key === key && c.seg < cur.segs.length) { seg = c.seg; pos = Math.min(c.pos, cur.segs[seg].length); }
  const before = cur.segs[seg].slice(0, pos).replace(/\n$/, ''); const after = cur.segs[seg].slice(pos).replace(/^\n/, '');
  const segs = cur.segs.slice(0, seg).concat([before], ids.map((x, k) => (k === ids.length - 1 ? after : '')), cur.segs.slice(seg + 1));
  const allIds = cur.ids.slice(0, seg).concat(ids, cur.ids.slice(seg));
  owner.photos = (owner.photos || []).concat(ids);
  UI.blkCaret = null;
  blocksStore(key, joinBlocks(segs, allIds), true);
  if (key !== 'cap') { const i = key.indexOf('|'); await persist(key.slice(0, i), owner); }
  rerender();
}

Object.assign(ACTIONS, {
  blkMove(el) {
    const key = el.dataset.key; const root = $('.blocks[data-key="' + key + '"]'); if (!root) return;
    const { segs, ids } = readBlocks(root); const i = ids.indexOf(el.dataset.img); if (i < 0) return;
    if (Number(el.dataset.dir) < 0) {
      if (!segs[i].trim()) { if (i === 0) return; [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; } else {
        const lines = segs[i].split('\n'); const moved = [];
        while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
        moved.unshift(lines.pop());
        segs[i] = lines.join('\n'); segs[i + 1] = moved.join('\n') + (segs[i + 1] ? '\n' + segs[i + 1] : '');
      }
    } else {
      if (!segs[i + 1].trim()) { if (i === ids.length - 1) return; [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]]; } else {
        const lines = segs[i + 1].split('\n');
        while (lines.length && !lines[0].trim()) lines.shift();
        const first = lines.shift();
        segs[i + 1] = lines.join('\n'); segs[i] = (segs[i] ? segs[i] + '\n' : '') + first;
      }
    }
    blocksStore(key, joinBlocks(segs, ids), true); rerender();
  },
  async blkDel(el) {
    const key = el.dataset.key; const root = $('.blocks[data-key="' + key + '"]'); if (!root) return;
    if (!confirm('¿Quitar esta imagen?')) return;
    const { segs, ids } = readBlocks(root); const i = ids.indexOf(el.dataset.img); if (i < 0) return;
    const merged = segs[i] + (segs[i] && segs[i + 1] ? '\n' : '') + segs[i + 1];
    segs.splice(i, 2, merged); ids.splice(i, 1);
    const owner = blocksOwner(key);
    owner.photos = (owner.photos || []).filter((p) => p !== el.dataset.img);
    await DB.del('blobs', el.dataset.img);
    blocksStore(key, joinBlocks(segs, ids), true);
    if (key !== 'cap') { const k = key.slice(0, key.indexOf('|')); await persist(k, owner); }
    rerender();
  }
});

Object.assign(CHANGES, {
  async blkImages(el) { if (UI.cap && el.dataset.key === 'cap') syncCapFields(); await insertImages(el.dataset.key, el.files); el.value = ''; }
});
