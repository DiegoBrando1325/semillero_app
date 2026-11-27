# Semillero 0.3

Semillero es una app personal para madurar ideas hasta convertirlas en proyectos. Incluye un taller de cine para escenas, diálogos y tramas. Funciona en iPhone como app instalada (PWA), sin servidores y sin cuentas. Tus datos viven solo en tu dispositivo.

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
| `js/views-journal.js` | Cuaderno privado |
| `js/views-*.js` | Pantallas: ideas, agenda, taller de cine y ajustes |
| `js/app.js` | Eventos y arranque |
| `sw.js` | Uso sin internet |

## Ideas para siguientes versiones

- Mapa visual (grafo) de conexiones entre ideas.
- Notas de voz grabadas dentro de la app.
- Sincronización automática entre dispositivos usando tu propio Google Drive o iCloud.
- Bloqueo con Face ID o código, y cifrado de los datos dentro del teléfono.
- Búsqueda web en el modo Investigador.
