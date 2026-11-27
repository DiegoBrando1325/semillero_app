/* Semillero — detecta links en la hoja y muestra su vista previa ("reliquias"). */
'use strict';

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'()]+/gi;

function extractUrls(text) {
  const out = [];
  (String(text || '').match(URL_RE) || []).forEach((u) => {
    u = u.replace(/[.,;:!?…»”]+$/, '');
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    if (!out.includes(u)) out.push(u);
  });
  return out;
}

function ideaUrls(idea) {
  const urls = extractUrls((idea.title || '') + '\n' + (idea.body || ''));
  (idea.links || []).forEach((l) => { const u = safeUrl(l.url); if (u !== '#' && !urls.includes(u)) urls.push(u); });
  return urls;
}

function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }

function youtubeId(u) {
  const m = String(u).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : null;
}

function firstPreviewImage(idea) {
  const urls = ideaUrls(idea);
  for (const u of urls) {
    const yt = youtubeId(u);
    if (yt) return 'https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg';
    const p = idea.previews && idea.previews[u];
    if (p && p.image) return p.image;
  }
  return '';
}

function relicHtml(url, p) {
  p = p || {};
  const yt = youtubeId(url);
  const img = p.image || (yt ? 'https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg' : '');
  const host = hostOf(url);
  return '<a class="relic" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
    (img ? '<span class="relic-frame"><img class="ext-img" alt="" loading="lazy" referrerpolicy="no-referrer" src="' + esc(img) + '"></span>' : '<span class="relic-glyph" aria-hidden="true">' + esc(host.slice(0, 1).toUpperCase()) + '</span>') +
    '<span class="relic-text"><span class="relic-title">' + esc(p.title || (yt ? 'Video de YouTube' : host)) + '</span>' +
    (p.desc ? '<span class="relic-desc">' + esc(p.desc) + '</span>' : '') +
    '<span class="relic-host">' + esc(host) + '</span></span></a>';
}

function relicsHtml(idea) {
  const urls = ideaUrls(idea);
  if (!urls.length) return '';
  return urls.map((u) => relicHtml(u, idea.previews && idea.previews[u])).join('');
}

const previewInFlight = {};
async function fetchPreview(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(url), { signal: ctrl.signal });
    const j = await res.json();
    if (j.status !== 'success' || !j.data) return { at: nowISO() };
    const d = j.data;
    return {
      title: (d.title || '').slice(0, 140), desc: (d.description || '').slice(0, 180),
      image: (d.image && d.image.url) || (d.logo && d.logo.url) || '', at: nowISO()
    };
  } catch (e) {
    return null; /* sin internet: lo intentamos otro día */
  } finally { clearTimeout(t); }
}

/* Pide las vistas previas que falten y repinta el contenedor sin tocar lo que escribes. */
async function loadPreviews(idea, box) {
  if (!navigator.onLine) return;
  idea.previews = idea.previews || {};
  const missing = ideaUrls(idea).filter((u) => !idea.previews[u] && !youtubeId(u) && !previewInFlight[u]).slice(0, 4);
  if (!missing.length) return;
  for (const u of missing) {
    previewInFlight[u] = true;
    const p = await fetchPreview(u);
    delete previewInFlight[u];
    if (p) idea.previews[u] = p;
  }
  DB.put('ideas', idea);
  const el = box || $('#relics');
  if (el && el.dataset.id === idea.id) el.innerHTML = relicsHtml(idea);
}

let relicTimer;
function scheduleRelics(idea) {
  clearTimeout(relicTimer);
  relicTimer = setTimeout(() => {
    const box = $('#relics');
    if (!box || box.dataset.id !== idea.id) return;
    box.innerHTML = relicsHtml(idea);
    loadPreviews(idea, box);
  }, 900);
}

/* Imágenes externas que no cargan: se ocultan sin romper el diseño. */
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img && img.classList && img.classList.contains('ext-img')) {
    const frame = img.closest('.relic-frame');
    if (frame) frame.remove(); else img.remove();
  }
}, true);
