/* Semillero — almacenamiento local (IndexedDB). Nada sale del dispositivo. */
'use strict';

const DB = (() => {
  const NAME = 'semillero';
  const VERSION = 1;
  const STORES = ['ideas', 'inbox', 'sessions', 'works', 'fragments', 'adaptations', 'blobs', 'settings'];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach((s) => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  const wrap = (r) => new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

  const done = (t) => new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });

  async function all(store) {
    const db = await open();
    return wrap(db.transaction(store).objectStore(store).getAll());
  }

  async function get(store, id) {
    const db = await open();
    return wrap(db.transaction(store).objectStore(store).get(id));
  }

  async function put(store, obj) {
    const db = await open();
    const t = db.transaction(store, 'readwrite');
    t.objectStore(store).put(JSON.parse(JSON.stringify(obj)));
    await done(t);
    return obj;
  }

  async function del(store, id) {
    const db = await open();
    const t = db.transaction(store, 'readwrite');
    t.objectStore(store).delete(id);
    return done(t);
  }

  async function clear(store) {
    const db = await open();
    const t = db.transaction(store, 'readwrite');
    t.objectStore(store).clear();
    return done(t);
  }

  /* Exporta todo para respaldo. La clave de API nunca se incluye. */
  async function exportAll() {
    const out = { app: 'semillero', schema: 1, exportedAt: new Date().toISOString(), stores: {} };
    for (const s of STORES) {
      let rows = await all(s);
      if (s === 'settings') rows = rows.map((r) => Object.assign({}, r, { apiKey: '' }));
      out.stores[s] = rows;
    }
    return out;
  }

  /* Restaura un respaldo. mode = 'replace' borra lo actual; 'merge' conserva lo más reciente. */
  async function importAll(data, mode) {
    if (!data || data.app !== 'semillero' || !data.stores) throw new Error('El archivo no es un respaldo de Semillero.');
    const prev = await get('settings', 'main');
    const keepKey = prev && prev.apiKey ? prev.apiKey : '';
    for (const s of STORES) {
      const rows = data.stores[s] || [];
      if (mode === 'replace') await clear(s);
      for (const row of rows) {
        if (s === 'settings' && keepKey) row.apiKey = keepKey;
        if (mode === 'merge') {
          const existing = await get(s, row.id);
          if (existing && existing.updatedAt && row.updatedAt && existing.updatedAt > row.updatedAt) continue;
        }
        await put(s, row);
      }
    }
  }

  return { open, all, get, put, del, clear, exportAll, importAll, STORES };
})();
