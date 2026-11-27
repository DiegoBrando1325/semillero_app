# Semillero 0.5

Semillero es una app personal para madurar ideas hasta convertirlas en proyectos. Incluye un taller de cine para escenas, diálogos y tramas. Funciona en iPhone como app instalada (PWA), sin servidores y sin cuentas. Tus datos viven solo en tu dispositivo.

## Novedades de la 0.5

- **Inicio nuevo.** Arriba ves el árbol de este mes. Abajo están lo último que registraste (3 items), una tarjeta de cine con una dinámica de escritura, la agenda a la vista y el aviso de respaldo.
- **Crear.** El (+) solo pregunta qué es: **Idea, Pregunta, Actualización, Poema o Pensamiento**.
  - Pregunta y Actualización siempre se anclan a una idea que ya existe. La actualización se suma a su bitácora.
  - Los temas de terapia son un Pensamiento con la opción "Para terapia".
  - Eliges los tags (y el núcleo) antes de guardar.
- **Imágenes dentro del texto.** Cada imagen tiene su lugar entre los párrafos. La subes, la bajas o la quitas desde la misma hoja.
- **Boceto.** El área de dibujo se abre debajo del texto y crece mientras dibujas.
  - Tiene 16 colores más uno libre, 3 grosores, marcador, borrador y deshacer.
  - Para mover un dibujo, mantén presionado un trazo y sacúdelo: se despega junto con sus trazos vecinos y lo arrastras a otro lugar. También está la herramienta de mano.
- **Núcleos.** Pueden tener varios colores (o tomar los de sus tags). Los estados (Explorando, Activo, En pausa, Bloqueado, Terminado) se pueden renombrar y ampliar.
  - Al abrir un núcleo ves tarjetas con la vista previa de sus ideas.
  - Si entras a una idea desde ahí, "atrás" regresa al núcleo y unas flechas pasan a la siguiente idea del mismo núcleo.
- **Sistemas.** Un proyecto grande puede agrupar varios núcleos. En el mapa orbitan juntos.
- **Mapa.** Los tags caben en un solo botón que se despliega. Hay accesos rápidos para volar a cada sistema, núcleo, cine o a las ideas sueltas, más un minimapa.
  - Cada proyecto guarda distancia de los demás, y las ideas de cine sueltas tienen su propia región.
  - Rinde mejor: cada canica solo calcula contra sus vecinas, lo que está fuera de la pantalla no se redibuja, la física se calma o se duerme cuando todo está quieto, y en teléfonos lentos calcula a la mitad de cuadros.
- **Cine.** Escribes primero. Las preguntas ahora son "pistas, si te atoras": opcionales, tenues, y solo se abren si las tocas.
  - Hay una biblioteca de **dinámicas de escritura** basadas en técnicas conocidas (Goldberg, Cameron, Rodari, Rico, Ingermanson, Harmon y otras), con consignas que cambian cada vez y un botón "Sorpréndeme".
  - El taller muestra tus ideas de cine que aún no tienen obra.
- **Cuaderno.** Las pestañas son **Árbol · Calendario · Lista**.
  - La lista muestra todos tus pensamientos, por fecha o juntos, con buscador y filtro por emoción.
  - El bosque del año se abre desde el árbol y ahora es un paisaje: un árbol por mes, unidos por un sendero.
- **Emociones en vez de temperatura.** Hay 11 emociones con intensidad suave, media o intensa, y puedes elegir hasta dos por pensamiento; la hoja lleva los dos colores. Las temperaturas de la 0.4 se convierten solas: Helada → tristeza intensa, Fría → tristeza suave, Templada → calma, Cálida → alegría, Ardiente → ira intensa.
- **Datos:** la base de datos pasa a la versión 4 solo para agregar los sistemas; lo demás no se toca.

## Novedades de la 0.4

- **Núcleos (proyectos).** Un núcleo es un proyecto al que atas ideas distintas que sirven a lo mismo. Tiene objetivo, siguiente paso, estado (activo, en pausa, terminado) y sesiones en la agenda. Una idea puede estar en varios núcleos; uno es el principal (línea sólida en el mapa) y los demás se ven con línea punteada. Puedes convertir una idea en núcleo, y en el mapa basta con acercar una canica a un núcleo para atarla.
- **Preguntas como lunas.** Cada idea puede tener preguntas abiertas. En el mapa orbitan su canica como lunas; al responderlas se vuelven doradas. Si capturas algo que termina en "?", la app te ofrece guardarlo como luna de una idea.
- **Borrador automático.** Lo que escribes, dibujas o fotografías en la captura se guarda solo. Si cambias de pestaña o cierras la app, sigue ahí; el (+) muestra un punto mientras haya borrador.
- **Convertir después de crear.** Una idea puede pasar a poema, pensamiento o tema de terapia, y volver a ser idea con sus tags y lazos.
- **Fotos en el cuaderno.** Los poemas y pensamientos ya admiten fotos después de creados.
- **Temperatura emocional** en los pensamientos: Helada, Fría, Templada, Cálida o Ardiente, con una tira de tu semana.
- **El árbol del mes.** Cada pensamiento es una hoja del color de su temperatura (puedes arrastrarla a otro lugar), cada poema una liana con flor y cada tema de terapia una raíz. Los meses pasados forman tu **bosque**.
- **Calendario arreglado.** Muestra varios tipos por día, respeta el filtro y tiñe los días según la temperatura.
- **Tags.** 16 colores más distintos entre sí, y una pantalla para renombrar, cambiar el color, unir y borrar tags (Jardín → Editar tags, o Ajustes).
- **Datos:** la base de datos pasa a la versión 3 solo para agregar los núcleos; lo demás no se toca.

## Novedades de la 0.3

- **Botón central para crear.** La barra es **Inicio · Jardín · (+) · Mapa · Cuaderno**. El (+) abre la captura desde cualquier pantalla.
- **Canicas del color de sus tags.** Cada tag tiene su color y la canica mezcla los colores de todos sus tags; sin tags es gris cálido. Junto a "Tags" en la hoja ves cómo queda su canica.
- **Mapa en beige claro** (en modo oscuro, café oscuro), con una leyenda de colores. El mapa se centra en el espacio libre entre el encabezado y el texto de ayuda.
- **Cuaderno privado.** Poemas, pensamientos y temas para terapia:
  - "Para mi próxima sesión" junta los temas pendientes; eliges la fecha, marcas lo que hablaste y tocas "Ya fui a la sesión". Queda un historial de sesiones.
  - Cada tema puede marcarse como hablado y guardar "qué te llevaste".
  - Un calendario del mes muestra qué días escribiste.
  - No aparece en el mapa, no se conecta con ideas y nunca se envía a la IA. Sí entra en los respaldos cifrados y en la exportación a Markdown.
- Al capturar hay una tercera opción: **Cuaderno**.
- **Datos:** la base de datos pasa a la versión 2 solo para agregar el cuaderno; tus ideas, obras y ajustes de la 0.2 no se tocan.
- **Arreglos:** la fila de "Recientes" ya no ensancha la página (empujaba la barra fuera de la pantalla) y el lápiz flotante ya no tapa lo último de la página.

## Novedades de la 0.2

- **Hoja única.** El título y la nota van en la misma página, como en Notas de iOS. La primera oración se vuelve el título.
- **Dibujo directo.** Con el lápiz flotante, con el Apple Pencil o agitando el teléfono, rayas sobre la hoja.
- **Mapa de canicas.** Cada idea es una canica. Si acercas dos, se unen con un lazo, y se permiten relaciones de muchas a muchas. Si avientas una, queda sola y orbita la estructura más pesada. Para cortar un lazo, tócalo.
- **Links con vista previa.** Los links que escribes en la hoja aparecen en un marco flotante (usa microlink.io).
- **Navegación más simple:** Jardín · Inicio · Mapa. Al capturar solo eliges entre "Idea nueva" y "Anclar a una idea" (la eliges desde el mapa).
- La IA y las preguntas guía están apagadas por ahora.

## Lo que hace

- **Captura rápida.** Texto o dictado, fotos y links. Cada captura va a la bandeja, a una idea nueva, a una idea existente o al taller de cine. Mientras escribes te sugiere ideas parecidas que ya tienes.
- **Ideas con etapas.** Las etapas son Semilla → Exploración → Plan → Proyecto → Archivada. Cada idea puede pertenecer a varios sectores. Tiene preguntas guía (generales o creativas) que calculan un porcentaje de madurez, además de notas, links, fotos y conexiones con otras ideas.
- **Combinar ideas.** La app detecta ideas de sectores distintos que comparten temas, sin usar IA. Puedes conectarlas o crear una idea combinada.
- **Agenda.** Agendas sesiones de trabajo por idea u obra y las exportas al Calendario del iPhone en formato `.ics`, con aviso 10 minutos antes. También lleva las horas por sector del mes y una lista de "jardinería semanal".
- **Taller de cine:**
  - **Fragmentos.** Hay seis tipos: escena, diálogo, trama, personaje, imagen/atmósfera y mundo/lugar. Cada uno lleva encabezado de escena (INT./EXT., lugar, momento), personajes y conflicto.
  - **Obras.** Agrupan fragmentos en orden y tienen logline, género, tono y la idea de origen.
  - **Adaptaciones.** Una obra puede adaptarse a cortometraje, largometraje, episodio de serie, novela, cuento, teatro, cómic o ficción sonora. Cada adaptación tiene su borrador, estado y hasta 30 versiones guardadas.
  - **Escritura de guion.** Se escribe en **Fountain**, el formato abierto de guion. Una barra rápida inserta escena, personaje, acotación y transición, y hay una vista formateada que estima páginas y minutos. Se exporta como `.fountain`, que abren Highland, Fade In, Beat, etc.
- **Asistente con Claude (opcional).**
  - En las ideas hay cuatro modos: Investigador, Abogado del diablo, Planificador y Conector.
  - En el taller puede convertir un fragmento en escena de guion o en prosa, hacer de doctor de diálogo, proponer variaciones, armar un borrador desde los fragmentos, continuar el texto, proponer una escaleta y revisar formato.
  - Siempre puedes ver el texto exacto que se envía. Cada idea, fragmento y obra tiene un interruptor para que la IA no lo lea, y las fotos nunca se envían.
- **Respaldos cifrados.** Se cifran con AES-256 y una contraseña tuya. Los guardas en iCloud Drive o Google Drive desde el menú de compartir, y los restauras en cualquier dispositivo. También puedes exportar todo en Markdown legible.
- Tiene modo oscuro y funciona sin internet una vez instalada.

## Cuánto cuesta

- **La app es gratis.** El hosting en GitHub Pages es gratis y no hay servidor ni base de datos en la nube.
- **La IA es opcional y se paga por uso** a tu cuenta de Anthropic (console.anthropic.com), con tu propia clave. Puedes fijar un límite de gasto mensual en la consola. Si eliges Haiku en Ajustes, las consultas salen más baratas. Sin clave, todo lo demás funciona igual.

## Privacidad y seguridad

- Todo se guarda en IndexedDB, dentro de tu teléfono. No hay analíticas ni rastreo.
- La clave de API se guarda solo en tu dispositivo y no viaja en los respaldos.
- Las consultas a la IA van directo de tu teléfono a `api.anthropic.com`, sin intermediarios.
- La política de seguridad de contenido (CSP) solo permite conectarse a la propia app y a la API de Anthropic.
- El código en GitHub puede ser público: **tus ideas no están en el código**, están en tu teléfono.

## Publicarla gratis en GitHub Pages (una sola vez, ~10 minutos, mejor desde una computadora)

1. Crea una cuenta en github.com si no tienes.
2. Crea un repositorio **público** llamado `semillero`. GitHub Pages gratuito requiere repositorio público.
3. En el repositorio entra a **Add file → Upload files**. Arrastra **el contenido** de esta carpeta (`index.html`, `styles.css`, `sw.js`, `manifest.webmanifest`, `README.md` y las carpetas `js/` e `icons/`) y luego haz **Commit**.
4. Ve a **Settings → Pages**. En "Build and deployment" elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guarda.
5. En uno o dos minutos tu app estará en `https://TU-USUARIO.github.io/semillero/`.

## Instalarla en el iPhone

1. Abre esa dirección en **Safari**.
2. Toca **Compartir** → **Agregar a pantalla de inicio**.
3. Ábrela desde el ícono. Se ve y funciona como app, incluso sin internet.

Instalada en la pantalla de inicio, iOS protege mejor sus datos. Aun así, **haz un respaldo cifrado cada semana**: la app te lo recuerda.

## Conectar la IA

1. Entra a console.anthropic.com, crea una cuenta, agrega saldo y genera una clave de API.
2. En Semillero ve a **Ajustes → Inteligencia artificial**, pega la clave y toca **Probar conexión**.

## Actualizar la app

Sube los archivos nuevos al mismo repositorio. La app instalada toma la versión nueva la siguiente vez que la abras con internet. Tus datos no se tocan.

## Estructura del código

Es JavaScript sin dependencias ni paso de compilación:

| Archivo | Qué hace |
|---|---|
| `js/db.js` | Almacenamiento local (IndexedDB), exportar e importar |
| `js/vault.js` | Cifrado de respaldos (Web Crypto) |
| `js/ai.js` | Llamadas a la API de Claude y los prompts de cada modo |
| `js/fountain.js` | Lector de Fountain para la vista de guion |
| `js/core.js` | Estado, utilidades, navegación y componentes |
| `js/views-journal.js` | Cuaderno privado y calendario |
| `js/journal-tree.js` | Árbol del mes y bosque del año |
| `js/nuclei.js` | Núcleos, sistemas y preguntas |
| `js/tags.js` | Editor de tags |
| `js/map.js` | Mapa de canicas, núcleos, sistemas, región de cine y lunas |
| `js/blocks.js` | Texto con imágenes intercaladas |
| `js/dynamics.js` | Dinámicas de escritura creativa |
| `js/ink.js` | Boceto sobre la hoja: colores, borrador y trazos que se despegan |
| `js/links.js` | Vistas previas de links |
| `js/views-*.js` | Pantallas: ideas, agenda, taller de cine y ajustes |
| `js/app.js` | Eventos y arranque |
| `sw.js` | Uso sin internet |

## Ideas para siguientes versiones

- Candado para ideas, poemas o pensamientos elegidos.
- Resumen con IA de cada núcleo.
- Una forma de recuperar ideas cifradas si olvidas la contraseña.
- Notas de voz grabadas dentro de la app.
- Sincronización automática entre dispositivos usando tu propio Google Drive o iCloud.
- Bloqueo con Face ID o código, y cifrado de los datos dentro del teléfono.
- Búsqueda web en el modo Investigador.
