/* Semillero — lector sencillo de Fountain (formato abierto de guion) para la vista previa. */
'use strict';

const Fountain = (() => {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SCENE = /^(INT|EXT|EST|INT\.?\/EXT|I\/E|EXT\.?\/INT)[.\s]/i;
  const TRANSITION = /^[A-ZÁÉÍÓÚÑÜ\s]+(A|TO):$/;

  function inline(s) {
    return esc(s)
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<u>$1</u>');
  }

  function isCharacter(t) {
    if (t.startsWith('@')) return true;
    const name = t.replace(/\(.*?\)/g, '').replace(/\^$/, '').trim();
    if (!name || name.length > 38) return false;
    if (!/[A-ZÁÉÍÓÚÑÜ]/.test(name)) return false;
    if (name !== name.toUpperCase()) return false;
    if (/[.!?,:;]$/.test(name)) return false;
    return true;
  }

  function parse(text) {
    const src = String(text || '').replace(/\r/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\[\[[\s\S]*?\]\]/g, '');
    const lines = src.split('\n');
    const out = [];
    let prevBlank = true;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) { prevBlank = true; continue; }
      const next = (lines[i + 1] || '').trim();
      if (t.startsWith('#')) { out.push({ type: 'section', text: t.replace(/^#+\s*/, '') }); prevBlank = false; continue; }
      if (t.startsWith('=') && !t.startsWith('===')) { out.push({ type: 'synopsis', text: t.slice(1).trim() }); prevBlank = false; continue; }
      if (t === '===') { out.push({ type: 'pagebreak' }); prevBlank = true; continue; }
      if (prevBlank && (SCENE.test(t) || /^\.[^.]/.test(t))) {
        out.push({ type: 'scene', text: t.replace(/^\./, '').toUpperCase() });
        prevBlank = false; continue;
      }
      if (/^>.*<$/.test(t)) { out.push({ type: 'centered', text: t.slice(1, -1).trim() }); prevBlank = false; continue; }
      if (prevBlank && (t.startsWith('>') || TRANSITION.test(t)) && !next) {
        out.push({ type: 'transition', text: t.replace(/^>\s*/, '').toUpperCase() });
        prevBlank = false; continue;
      }
      if (prevBlank && next && !t.startsWith('!') && isCharacter(t)) {
        out.push({ type: 'character', text: t.replace(/^@/, '') });
        i++;
        while (i < lines.length && lines[i].trim()) {
          const d = lines[i].trim();
          if (/^\(.*\)$/.test(d)) out.push({ type: 'parenthetical', text: d });
          else out.push({ type: 'dialogue', text: d });
          i++;
        }
        prevBlank = true; continue;
      }
      out.push({ type: 'action', text: t.replace(/^!/, '') });
      prevBlank = false;
    }
    return out;
  }

  function toHTML(text) {
    const tokens = parse(text);
    if (!tokens.length) return '<p class="fx-empty">Escribe para ver tu guion formateado.</p>';
    return tokens.map((tk) => {
      switch (tk.type) {
        case 'scene': return '<h4 class="fx-scene">' + inline(tk.text) + '</h4>';
        case 'character': return '<p class="fx-character">' + inline(tk.text) + '</p>';
        case 'parenthetical': return '<p class="fx-paren">' + inline(tk.text) + '</p>';
        case 'dialogue': return '<p class="fx-dialogue">' + inline(tk.text) + '</p>';
        case 'transition': return '<p class="fx-transition">' + inline(tk.text) + '</p>';
        case 'centered': return '<p class="fx-centered">' + inline(tk.text) + '</p>';
        case 'section': return '<p class="fx-section">' + inline(tk.text) + '</p>';
        case 'synopsis': return '<p class="fx-synopsis">' + inline(tk.text) + '</p>';
        case 'pagebreak': return '<hr class="fx-break">';
        default: return '<p class="fx-action">' + inline(tk.text) + '</p>';
      }
    }).join('');
  }

  /* Estimación aproximada: ~55 líneas por página y 1 página ≈ 1 minuto en pantalla. */
  function stats(text) {
    const tokens = parse(text);
    let lines = 0;
    let scenes = 0;
    tokens.forEach((tk) => {
      const len = tk.text ? tk.text.length : 0;
      if (tk.type === 'scene') { scenes++; lines += 2; }
      else if (tk.type === 'dialogue') lines += Math.ceil(len / 35);
      else if (tk.type === 'character' || tk.type === 'parenthetical' || tk.type === 'transition') lines += 1;
      else lines += Math.ceil(len / 60) + 1;
    });
    const pages = lines / 55;
    return { scenes, pages: Math.max(pages, tokens.length ? 0.1 : 0), minutes: Math.round(pages) };
  }

  return { parse, toHTML, stats };
})();
