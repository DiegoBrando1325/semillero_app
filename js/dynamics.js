/* Semillero — dinámicas de escritura creativa, basadas en técnicas conocidas.
   Cada una trae un ejercicio corto; las que pueden, generan una consigna distinta cada vez. */
'use strict';

const DYN_WORDS = ['archivo', 'marea', 'llave', 'abuelo', 'eclipse', 'cuaderno', 'semilla', 'estación', 'espejo', 'naranja', 'radio', 'invierno', 'carta', 'puente',
  'fotografía', 'perro', 'tormenta', 'ascensor', 'piano', 'mapa', 'sal', 'jaula', 'vecina', 'tren', 'fiebre', 'balcón', 'reloj', 'mudanza', 'lámpara', 'río', 'sombrero', 'eco'];
const DYN_WHO = ['tu personaje', 'una niña de diez años', 'el archivista', 'una vecina que nadie conoce', 'un perro callejero', 'tu yo de hace cinco años', 'una maestra jubilada'];
const DYN_WHAT = ['olvidara una palabra cada día', 'solo pudiera hablar en preguntas', 'encontrara una carta escrita por sí mismo en el futuro', 'despertara en la casa equivocada',
  'tuviera que devolver todo lo que ha recibido', 'escuchara los pensamientos de los objetos', 'viviera el mismo martes una y otra vez', 'heredara un oficio que no entiende'];
const DYN_STARTERS = ['Lo que no le dije a…', 'La última vez que vi ese lugar…', 'Nadie sabe que…', 'Me acuerdo del olor de…', 'Si pudiera volver a ese día…', 'La casa tenía una regla:'];
const DYN_LATERAL = ['Quita lo más importante de la escena y mira qué queda.', 'Cuéntala desde un objeto que está en el cuarto.', 'Haz que el personaje quiera lo contrario de lo que pensabas.',
  'Escribe solo lo que se ve y se oye; nada de lo que se piensa.', 'Cambia la hora del día y deja que eso lo cambie todo.', 'Repite una frase tres veces; que signifique algo distinto cada vez.',
  'Corta la mitad de los diálogos.', 'Mete un silencio largo donde iba la frase clave.', 'Exagera un detalle pequeño hasta que sea el centro.', 'Escríbela al revés: del final al principio.'];
const DYN_PROUST = ['¿Cuál es tu idea de la felicidad perfecta?', '¿Cuál es tu mayor miedo?', '¿Qué defecto toleras menos en los demás?', '¿Dónde te gustaría vivir?', '¿Qué es lo que más valoras de tus amigos?', '¿Cuál es tu mayor arrepentimiento?', '¿Qué talento te gustaría tener?'];
const DYN_INCIDENT = ['pierde su trabajo', 'encuentra una caja sin etiqueta', 'recibe una herencia inesperada', 'regresa al pueblo después de veinte años', 'descubre un error en el archivo'];
const DYN_GOAL = ['recuperar lo que perdió', 'decir la verdad', 'salvar el huerto', 'encontrar a quien escribió la carta', 'terminar lo que su padre empezó'];
const DYN_RISK = ['se acabe el verano', 'todos lo olviden', 'llegue la inundación', 'vendan la casa', 'sea demasiado tarde para pedir perdón'];

const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const pickTwo = (a) => { const x = pickOne(a); let y = pickOne(a); while (y === x) y = pickOne(a); return [x, y]; };

const DYNAMICS = [
  { id: 'libre', group: 'Para arrancar', name: 'Escritura libre cronometrada', who: 'Natalie Goldberg', min: 10,
    how: 'Pon un cronómetro y no detengas la mano: nada de corregir, tachar ni releer. Si te atoras, repite la última palabra hasta que salga otra.',
    prompt: () => 'Empieza con: «' + pickOne(DYN_STARTERS) + '» y no pares en 10 minutos.' },
  { id: 'matutinas', group: 'Para arrancar', name: 'Páginas matutinas', who: 'Julia Cameron', min: 20,
    how: 'Al despertar, tres páginas a mano de lo que pase por tu cabeza. No son para releer ni para enseñar: son para vaciar el ruido.',
    prompt: () => 'Mañana al despertar: tres páginas, sin releerlas.' },
  { id: 'binomio', group: 'Para inventar', name: 'Binomio fantástico', who: 'Gianni Rodari', min: 5,
    how: 'Dos palabras que no tienen nada que ver obligan a la imaginación a construir un puente entre ellas.',
    prompt: () => { const [a, b] = pickTwo(DYN_WORDS); return '«' + a + '» + «' + b + '»: escribe una escena donde las dos sean importantes.'; } },
  { id: 'quepasaria', group: 'Para inventar', name: '¿Qué pasaría si…?', who: 'Gianni Rodari', min: 5,
    how: 'Una hipótesis absurda aplicada a algo cotidiano. Toma en serio la regla y sigue sus consecuencias.',
    prompt: () => '¿Qué pasaría si ' + pickOne(DYN_WHO) + ' ' + pickOne(DYN_WHAT) + '?' },
  { id: 'laterales', group: 'Para inventar', name: 'Cartas laterales', who: 'al estilo de las Estrategias oblicuas de Brian Eno y Peter Schmidt', min: 5,
    how: 'Cuando te atoras, una instrucción inesperada te obliga a mirar la escena desde otro lado.',
    prompt: () => pickOne(DYN_LATERAL) },
  { id: 'clustering', group: 'Para inventar', name: 'Clustering', who: 'Gabriele Rico', min: 8,
    how: 'Escribe una palabra en el centro y rodéala de asociaciones en burbujas, sin juzgar. Cuando algo «haga clic», escribe un párrafo a partir de ahí. Tu mapa de canicas sirve para esto.',
    prompt: () => 'Palabra al centro: «' + pickOne(DYN_WORDS) + '». Haz al menos diez burbujas antes de escribir.' },
  { id: 'logline', group: 'Para estructurar', name: 'Logline', who: 'tradición de guion', min: 5,
    how: 'Una sola frase con quién, qué quiere, qué se lo impide y qué está en juego. Si no cabe en una frase, la historia aún no está clara.',
    prompt: () => 'Completa: cuando ' + pickOne(DYN_INCIDENT) + ', [tu personaje] debe ' + pickOne(DYN_GOAL) + ' antes de que ' + pickOne(DYN_RISK) + '.' },
  { id: 'copo', group: 'Para estructurar', name: 'Método copo de nieve', who: 'Randy Ingermanson', min: 15,
    how: 'Crece la historia en capas: una frase, luego un párrafo de cinco frases (inicio, tres desastres, final), luego una página por personaje.',
    prompt: () => 'Paso de hoy: escribe la historia en una frase y luego estírala a cinco.' },
  { id: 'circulo', group: 'Para estructurar', name: 'Círculo de la historia', who: 'Dan Harmon', min: 10,
    how: 'Ocho pasos: el personaje en su zona cómoda, quiere algo, entra a lo desconocido, se adapta, lo consigue, paga un precio, regresa y ya no es el mismo.',
    prompt: () => 'Escribe una línea para cada uno de los ocho pasos de tu historia.' },
  { id: 'proust', group: 'Para personajes y escenas', name: 'Cuestionario de Proust', who: 'Marcel Proust', min: 10,
    how: 'Un cuestionario de salón que Proust respondió de joven. Contéstalo como tu personaje, no como tú.',
    prompt: () => 'Responde como tu personaje: ' + pickTwo(DYN_PROUST).join(' ') },
  { id: 'tarde', group: 'Para personajes y escenas', name: 'Entra tarde, sal temprano', who: 'regla clásica de guion', min: 10,
    how: 'Empieza la escena lo más tarde posible y córtala antes de que se resuelva. Lo que sobra al inicio y al final casi nunca hace falta.',
    prompt: () => 'Reescribe tu última escena quitando el primer y el último tercio.' },
  { id: 'sentidos', group: 'Para personajes y escenas', name: 'Los cinco sentidos', who: 'ejercicio de taller', min: 5,
    how: 'Describe un lugar solo con lo que se huele, se oye, se toca y se saborea; deja la vista para el final.',
    prompt: () => 'Lugar: un/una ' + pickOne(DYN_WORDS) + '. Un sentido por línea, la vista al último.' }
];
const dynById = (id) => DYNAMICS.find((d) => d.id === id) || DYNAMICS[0];

/* Tarjeta con una dinámica al azar (o la que toque) y su consigna. */
function dynamicCard(scope) {
  if (!UI.dyn || UI.dyn.scope !== scope) UI.dyn = { scope, id: pickOne(DYNAMICS).id };
  const d = dynById(UI.dyn.id);
  if (!UI.dyn.text) UI.dyn.text = d.prompt();
  return '<div class="dyn-card"><span class="dyn-ico">' + icon('dice', 22) + '</span><span class="grow"><span class="dyn-eyebrow">' + esc(d.name) + ' · ' + d.min + ' min</span>' +
    '<span class="dyn-prompt">' + esc(UI.dyn.text) + '</span></span>' +
    '<span class="dyn-actions"><button type="button" class="icon-btn sm" data-act="dynAnother" aria-label="Otra dinámica">' + icon('update', 18) + '</button>' +
    '<a class="icon-btn sm" href="#/dinamicas" aria-label="Ver todas las dinámicas">' + icon('list', 18) + '</a></span></div>';
}

route(/^#\/dinamicas$/, viewDynamics, 'cine');

function viewDynamics() {
  const groups = [];
  DYNAMICS.forEach((d) => { let g = groups.find((x) => x.name === d.group); if (!g) groups.push(g = { name: d.group, items: [] }); g.items.push(d); });
  let html = topbar({ title: 'Dinámicas de escritura', back: '#/cine', actions: '<button class="btn small-btn dark" data-act="dynSurprise">' + icon('dice', 16) + 'Sorpréndeme</button>' });
  html += '<p class="small muted">Técnicas conocidas, cada una con un ejercicio corto. Sirven para el taller, para una idea o para el cuaderno.</p>';
  html += groups.map((g) => '<section class="section"><h2 class="eyebrow-s">' + esc(g.name) + '</h2><div class="card dyn-list">' + g.items.map((d) => {
    const open = UI.dynOpen === d.id;
    return '<div class="dyn-item' + (open ? ' open' : '') + '" id="dyn-' + d.id + '"><button type="button" class="dyn-head" data-act="dynOpen" data-id="' + d.id + '" aria-expanded="' + open + '">' +
      '<span class="grow"><strong>' + esc(d.name) + '</strong> <span class="small muted">· ' + esc(d.who) + '</span></span><span class="small muted">' + d.min + ' min</span>' + icon(open ? 'up' : 'down', 16) + '</button>' +
      (open ? '<div class="dyn-body"><p class="small">' + esc(d.how) + '</p><p class="dyn-prompt">' + esc(UI.dynPrompt || d.prompt()) + '</p>' +
        '<div class="row gap wrap"><button class="btn small-btn" data-act="dynWrite" data-id="' + d.id + '">Escribir en un fragmento</button>' +
        '<button class="btn ghost small-btn" data-act="dynReroll" data-id="' + d.id + '">' + icon('update', 16) + 'Otra consigna</button></div></div>' : '') + '</div>';
  }).join('') + '</div></section>').join('');
  return html;
}

Object.assign(ACTIONS, {
  dynAnother() { const cur = UI.dyn ? UI.dyn.id : ''; let d = pickOne(DYNAMICS); while (d.id === cur) d = pickOne(DYNAMICS); UI.dyn = { scope: UI.dyn ? UI.dyn.scope : '', id: d.id, text: d.prompt() }; rerender(); },
  dynOpen(el) { UI.dynOpen = UI.dynOpen === el.dataset.id ? null : el.dataset.id; UI.dynPrompt = null; rerender(); },
  dynReroll(el) { UI.dynPrompt = dynById(el.dataset.id).prompt(); rerender(); },
  dynSurprise() { const d = pickOne(DYNAMICS); UI.dynOpen = d.id; UI.dynPrompt = d.prompt(); rerender(); setTimeout(() => { const x = $('#dyn-' + d.id); if (x) x.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 50); },
  async dynWrite(el) {
    const d = dynById(el.dataset.id); const p = (UI.dynPrompt || $('.dyn-item.open .dyn-prompt') && $('.dyn-item.open .dyn-prompt').textContent) || d.prompt();
    const fr = newFragment({ kind: 'trama', title: d.name, prompt: p });
    await addItem('fragments', fr); UI.fragTab = 'editar'; go('#/frag/' + fr.id);
  }
});
