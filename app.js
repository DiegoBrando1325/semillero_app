/* Semillero — arranque y manejo de eventos. */
'use strict';

ACTIONS.closeSheet = closeSheet;

const isCaptureSheet = () => { const h = $('#hoja'); return !!(h && h.dataset.owner === 'cap'); };
/* Si sales de la captura sin guardar, lo escrito se queda como borrador. */
function keepDraft() { if (isCaptureSheet() && UI.cap) { syncCapFields(); saveDraft(true); } }
window.addEventListener('pagehide', keepDraft);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') keepDraft(); });

function setPath(obj, path, val) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
  o[parts[parts.length - 1]] = val;
}

function onField(e) {
  const el = e.target;
  if (!el || !el.dataset) return;
  const isToggle = el.type === 'checkbox' || el.tagName === 'SELECT';
  if (e.type === 'input') {
    if (el.matches('textarea.autosize')) autosize(el);
    if (el.id === 'hoja-title') splitHojaTitle(el);
    if ((el.id === 'hoja-title' || el.id === 'hoja-body') && isCaptureSheet()) { syncCapFields(); saveDraft(); }
    if (el.id === 'idea-search') { UI.ideaFilter.q = el.value; renderIdeaList(); }
    if (isToggle) return;
  }
  const f = el.dataset.field;
  if (!f) return;
  const [k, id, path] = f.split('|');
  const obj = k === 'settings' ? S.settings : byId(k, id);
  if (!obj) return;
  let val = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.type === 'null' && !val) val = null;
  setPath(obj, path, val);
  if (k === 'settings') saveSettings(); else persist(k, obj, isToggle ? 0 : 450);
  const hook = HOOKS[k + '.' + path.split('.')[0]];
  if (hook) hook(obj, el);
}

document.addEventListener('input', onField);

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.change) {
    const fn = CHANGES[el.dataset.change];
    if (fn) Promise.resolve(fn(el, e)).catch((err) => { console.error(err); toast(err.message || 'Ocurrió un error'); });
    return;
  }
  if (el.type === 'checkbox' || el.tagName === 'SELECT') onField(e);
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  Promise.resolve(fn(el, e)).catch((err) => { console.error(err); toast(err.message || 'Ocurrió un error'); });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
});

(async function boot() {
  try {
    await loadState();
  } catch (e) {
    $('#view').innerHTML = emptyState('No se pudo abrir el almacenamiento', 'Si usas navegación privada, ábrela en una pestaña normal. Detalle: ' + (e.message || e), '');
    return;
  }
  ensureTagColors();
  window.addEventListener('hashchange', () => { keepDraft(); flushPending(); closeSheet(); render(); updateDraftDot(); });
  render();
  updateDraftDot();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (navigator.storage && navigator.storage.persisted) {
    navigator.storage.persisted().then((p) => { if (!p && navigator.storage.persist) navigator.storage.persist(); }).catch(() => {});
  }
})();
