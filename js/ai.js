/* Semillero — asistente con la API de Claude, llamada directa desde el dispositivo con la clave del usuario. */
'use strict';

const AI = (() => {
  const ENDPOINT = 'https://api.anthropic.com/v1/messages';

  const MODELS = [
    { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 — el más económico y rápido' },
    { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 — equilibrio (recomendado)' },
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 — el más capaz y el más caro' }
  ];

  const BASE = [
    'Eres el asistente de Semillero, una app personal donde el autor madura sus ideas hasta convertirlas en proyectos.',
    'Responde siempre en español, de forma concreta y breve; usa listas cortas cuando ayuden.',
    'Respeta la voz y la intención del autor. No inventes datos, cifras, citas ni referencias: si no estás seguro de algo, dilo y sugiere cómo verificarlo (qué buscar, dónde y con qué palabras clave).',
    'Cuando propongas algo que el autor no escribió, márcalo como sugerencia.'
  ].join(' ');

  const IDEA_MODES = {
    investigador: {
      label: 'Investigador',
      desc: 'Ubica la idea frente a lo que ya existe: campos, enfoques y qué buscar para verificarlo.',
      starter: '¿Qué existe ya parecido a esta idea y qué debería investigar?',
      system: 'Modo investigador: identifica campos, enfoques, tipos de proyectos o trabajos relacionados y términos de búsqueda útiles (incluye términos en inglés). No tienes acceso a internet: no inventes títulos de papers, autores ni enlaces; en su lugar indica qué buscar y en qué fuentes (Google Scholar, PubMed, arXiv, patentes, festivales, catálogos, etc.).'
    },
    diablo: {
      label: 'Abogado del diablo',
      desc: 'Cuestiona supuestos y riesgos antes de que inviertas tiempo.',
      starter: '¿Qué supuestos debería poner a prueba primero?',
      system: 'Modo abogado del diablo: señala los supuestos más débiles, riesgos y objeciones fuertes, con honestidad y sin ser destructivo. Termina proponiendo la prueba más barata para validar el supuesto más riesgoso.'
    },
    planificador: {
      label: 'Planificador',
      desc: 'Convierte la idea en hitos, tareas y sesiones de trabajo.',
      starter: 'Divide esta idea en pasos concretos para las próximas 4 semanas.',
      system: 'Modo planificador: convierte la idea en un plan por etapas (Semilla → Exploración → Plan → Proyecto). Da tareas pequeñas y concretas, con una estimación de tiempo, y sugiere qué hacer en la próxima sesión de trabajo de 1 hora.'
    },
    conector: {
      label: 'Conector',
      desc: 'Busca cruces con tus otras ideas y propone combinaciones.',
      starter: '¿Con cuáles de mis otras ideas se conecta esta y cómo podría combinarlas?',
      system: 'Modo conector: compara la idea con la lista de otras ideas del autor que se incluye en el contexto. Señala conexiones reales (tecnología, tema, público, método) y propone 1 a 3 combinaciones concretas. Si no hay conexiones sólidas, dilo.'
    }
  };

  const FORMATS = {
    corto: { label: 'Cortometraje', screen: true, guide: 'guion de cortometraje (5 a 15 páginas) en formato Fountain' },
    largo: { label: 'Guion de largometraje', screen: true, guide: 'guion de largometraje en formato Fountain' },
    serie: { label: 'Episodio de serie', screen: true, guide: 'guion de episodio de serie en formato Fountain, con teaser y actos' },
    novela: { label: 'Novela', screen: false, guide: 'capítulo de novela en prosa narrativa' },
    cuento: { label: 'Cuento', screen: false, guide: 'cuento en prosa narrativa' },
    teatro: { label: 'Obra de teatro', screen: false, guide: 'texto dramático teatral con acotaciones entre paréntesis y nombres de personajes en mayúsculas' },
    comic: { label: 'Cómic / novela gráfica', screen: false, guide: 'guion de cómic por páginas y viñetas (PÁGINA 1, VIÑETA 1: descripción; PERSONAJE: diálogo)' },
    radio: { label: 'Radio / podcast de ficción', screen: false, guide: 'guion de ficción sonora con indicaciones de SONIDO, MÚSICA y VOCES' }
  };

  const FOUNTAIN_RULES = 'Reglas Fountain: encabezados de escena en mayúsculas empezando con INT. o EXT. (por ejemplo "INT. COCINA - NOCHE"); nombre del personaje en MAYÚSCULAS en su propia línea, seguido del diálogo; acotaciones entre paréntesis en su propia línea; acción en párrafos normales; transiciones en mayúsculas terminadas en "A:" (por ejemplo "CORTE A:"); deja una línea en blanco entre elementos. No uses markdown.';

  const CINE_ACTIONS = {
    aEscena: {
      label: 'Convertir en escena de guion',
      system: 'Eres guionista profesional. Convierte el material del autor en una escena de guion cinematográfico. ' + FOUNTAIN_RULES + ' Devuelve solo la escena.'
    },
    aProsa: {
      label: 'Escribir como prosa de novela',
      system: 'Eres novelista y editor literario. Reescribe el material como prosa narrativa literaria, conservando la acción, los personajes y los diálogos esenciales del autor. Devuelve solo el texto.'
    },
    dialogo: {
      label: 'Doctor de diálogo',
      system: 'Eres script doctor especializado en diálogo. Evalúa: subtexto, voz propia de cada personaje, exposición innecesaria, ritmo. Da 3 a 5 observaciones concretas y luego reescribe los intercambios más débiles. Marca claramente qué es observación y qué es propuesta.'
    },
    variaciones: {
      label: '3 variaciones de la escena',
      system: 'Eres guionista. Escribe tres variaciones breves y distintas del material (por ejemplo: cambiando el punto de vista, el tono o el lugar). Titula cada una con lo que cambia. ' + FOUNTAIN_RULES
    },
    borrador: {
      label: 'Borrador desde los fragmentos',
      system: 'Eres guionista y escritor. Con los fragmentos, la premisa y el borrador actual de la obra, escribe un borrador del formato pedido. Ordena el material, conecta los fragmentos y marca con [SUGERENCIA: ...] lo que agregues que no esté en el material del autor.'
    },
    continuar: {
      label: 'Continuar el texto',
      system: 'Continúa el borrador desde donde termina, con el mismo estilo y formato, aproximadamente una página. Devuelve solo la continuación.'
    },
    escaleta: {
      label: 'Escaleta / estructura',
      system: 'Eres analista de guion. Propón una estructura (escaleta) para el formato pedido: beats numerados, puntos de giro, longitud estimada por parte y qué fragmentos del autor encajan en cada beat. Señala qué falta por escribir.'
    },
    formato: {
      label: 'Revisar formato y ritmo',
      system: 'Revisa el borrador como editor: errores de formato del género, escenas que sobran, ritmo, claridad de la acción. Da observaciones numeradas y breves; no reescribas todo.'
    }
  };

  async function ask({ apiKey, model, system, messages, maxTokens }) {
    if (!apiKey) throw new Error('Falta tu clave de API. Agrégala en Ajustes.');
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model, max_tokens: maxTokens || 2000, system, messages })
      });
    } catch (e) {
      throw new Error('No hay conexión con la API. Revisa tu internet.');
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* respuesta vacía */ }
    if (!res.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : 'Error ' + res.status;
      if (res.status === 401) throw new Error('La clave de API no es válida (' + msg + ').');
      if (res.status === 429) throw new Error('Límite de uso alcanzado; intenta en un momento.');
      throw new Error(msg);
    }
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return { text, usage: data.usage || null };
  }

  return { ask, BASE, MODELS, IDEA_MODES, CINE_ACTIONS, FORMATS, FOUNTAIN_RULES };
})();
