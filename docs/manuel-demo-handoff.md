# Manuel · Nebula Demo: desarrollo y mantenimiento

Actualización: 10 de noviembre de 2026. Repositorio **independiente**: `gtramz/nebula-demo`.

La base procede de `gtramz/nebula_v1`, revisión `e6a131d0ee40fdd956433a581c01e0187b702d23`, más los cambios locales de la presentación. La ampliación Artist descrita aquí se trabaja exclusivamente en `nebula-demo`. No se modifica el repositorio anterior ni se copia su historial Git. Los handoffs y reportes anteriores conservados en `docs/` son antecedentes, no evidencia de esta iteración ni una lista vigente de tareas pendientes.

**Estado de esta entrega:** implementación, fixture portátil, verificaciones y activación en `localhost:4186` completados. Chrome quedó abierto en CHILZ. Se conservaron los datos del ensayo mediante actualización aditiva y respaldo. El [reporte de verificación](artist-demo-verification.md) registra resultados y límites de esta iteración; el resumen de publicación enlazado abajo reúne los cambios que se entregan a GitHub.

**Entrada vigente de la publicación:** [cambios acumulados, instalación y límites](manuel-update-2026-11-10.md). Las primeras secciones conservan contexto histórico: el recorrido actual de audio es Forge, el catálogo no muestra etiquetas de demo y el detalle usa Music / Versions, como describen las secciones finales.

## 1. Qué recibes

- Código React + TypeScript + Tailwind, contratos compartidos y servidor local Node/SQLite.
- Escenario portátil que conserva la escena anterior de Sol y sus personajes Artist/Investor, propuestas, mensajes, avisos, seguimientos y archivos. Los importadores añaden registros; no reemplazan la escena anterior.
- **CHILZ es el principal del nuevo fixture.** Su cuenta de presentación es independiente y usa la identidad pública del perfil indicado para la referencia visual. Sol sigue disponible con su identidad, géneros, preferencias, proyecto propio, propuesta privada y solicitudes recibidas.
- **Catálogo CHILZ:** 10 lanzamientos y 14 canciones de referencia, obtenidos del perfil público indicado; foto, portadas, títulos, colaboradores y duraciones verificables. No incluye las grabaciones de Spotify.
- **LUNA:** dos grabaciones terminadas aportadas para la presentación —original de gramz & SANNFERNNA y remix de CHILZ—, con sus propios personajes y referencias. No representan acceso a las cuentas reales de esos artistas.
- Medios locales y pruebas reproducibles. No necesitas claves ni contratar generación de medios para presentar. La base real del usuario, sus sesiones y sus credenciales **no forman parte de este repo**; los archivos musicales aportados específicamente para la demo están identificados por separado.

## 2. Arranque y edición

Requisitos y comandos completos en [README](../README.md). Resumen:

```sh
pnpm install --frozen-lockfile
pnpm demo:prepare  # tipos + build UI/servidor + instalación del fixture
PORT=4186 pnpm start # http://127.0.0.1:4186
```

Node 24.17+ y pnpm 11.21.0. Instala FFmpeg/FFprobe en PATH; también puedes definir `NEBULA_FFMPEG_PATH` y `NEBULA_FFPROBE_PATH` como rutas absolutas. `corepack prepare pnpm@11.21.0 --activate` fija el gestor. Si Corepack no está instalado, instala pnpm 11.21.0 directamente.

Para cambiar la UI, editar el componente, ejecutar `pnpm build` y recargar. Para cambios del servidor, volver a compilar y reiniciar `pnpm start`. `pnpm dev` en 5173 y `pnpm preview` en 4173 conservan un prototipo aislado de navegador; no prueban el backend de la presentación. No cambiar silenciosamente de transporte para ocultar errores de API.

El puerto predeterminado sin `PORT` es 4174; el objetivo de presentación de esta entrega es **4186**. Para restaurar en ese puerto, `PORT=4186 pnpm demo:reset`. El servidor de presentación solo escucha en loopback. El Dockerfile heredado corresponde al servidor estándar vacío; no es el comando para ejecutar esta demo.

## 3. Diferencias de la presentación respecto al repo anterior

La base ya tenía cuentas, perfil profesional, preferencias, Following, búsqueda contextual, canciones, mensajería y Remix privado. La primera demo incorporó:

- **Capa de presentación:** personas ficticias, sesión inicial, modo Guided/Autonomous, eventos persistentes que se ejecutan una vez y restauración explícita.
- **Home musical:** cabecera compacta, portada pequeña, título, guardar, preview con waveform real, hasta dos oportunidades y acceso al proyecto. Los controles no disparan navegación por accidente.
- **Reproducción compartida:** un único medio audible; pausar al cambiar de contexto. Comparación de versiones conservando la posición equivalente.
- **Discovery:** composiciones proporcionadas para audio/video, comentarios contextuales, enlaces al original/proyecto y comparación de colaboraciones públicas preparadas.
- **Preparación de propuestas:** referencia de la canción, aportación audio/video, niveles, render real, cancelación, borrador persistente y envío privado. Mix/Master aceptan trabajo completo sin obligar a un overdub.
- **Dos conjuntos audiovisuales nuevos:** voz sobre Marea y percusión sobre Afterglow, con sus propias pistas y mezclas; disponibles como comparación pública y como toma preparada para un render nuevo.
- **Revisión del destinatario:** original y resultado en el mismo hilo; aceptar abre conversación sin crear otro chat, rechazar conserva respuesta/historial.
- **Remix:** tomas preparadas de video, invalidación y cancelación correctas; inicio simultáneo para desplazamiento cero, evitando esperar al siguiente fotograma.
- **Acceso y continuidad:** Create, Saved, edición de perfil, retornos y navegación conectados al estado compartido.
- **Para este repo:** fixture portátil revisado e instalación con checksums, sin importar bases activas ni sobrescribir ediciones al reiniciar.

No se introducen pagos reales, un servicio central de identidad, mensajería externa o publicación pública de remixes nuevos.

### Ampliación Artist de esta iteración

- **Composición vertical:** resultado 720 × 1280. Si ambos archivos son video, original arriba y aportación abajo, cada región de 720 × 640. Si el original es audio, el video propio ocupa 720 × 1280. Se rellena con recorte proporcional, sin estirar. Arrastre, flechas del teclado y Reset framing ajustan el encuadre; preview y exportación usan la misma función geométrica. El reproductor del resultado muestra el archivo completo y los créditos quedan fuera de los rostros/instrumentos.
- **Preparación en tres etapas:** Reference → Your contribution → Review & send. Download reference descarga el archivo real disponible mediante la ruta autorizada; no promete stems. Record audio / Record video ofrecen preview, detener, descartar, repetir y usar la captura. Upload file sigue disponible si se deniega el permiso. Use prepared take conserva los ejemplos compatibles.
- **Referencia y aportación:** una referencia de más de 60 s permite elegir el fragmento para la mezcla audiovisual mediante el selector existente. Mix/Master siguen aceptando entregas completas. Un archivo terminado también puede adjuntarse sin forzarlo a una mezcla encima del original. Comparar original y propuesta usa el fragmento seleccionado.
- **Borradores y seguridad de edición:** cambiar fragmento o encuadre invalida la mezcla anterior sin borrar la aportación, textos, volúmenes ni adjuntos adicionales. Se corrigió la eliminación repetida del primer adjunto extra al cambiar la preparación. Cancelar o navegar libera dispositivos, reproducción y bloqueo de captura; una respuesta tardía de permisos cancelados no detiene una captura nueva.
- **Cancelación y reintento de Remix:** prepared take y su lectura comparten una operación cancelable. La finalización, progreso, errores y referencias de archivos se aplican únicamente a la operación vigente; una respuesta anterior no desbloquea ni sobrescribe el trabajo nuevo.
- **CHILZ dentro de Nebula:** discografía visual, detalles de lanzamiento y tracklist vinculados a proyectos y obras existentes. Es una capa de presentación separada de los archivos multimedia, sin inventar financiación, reparto de regalías ni estadísticas. Los cambios válidos de título/portada en el modelo siguen reflejándose; la referencia no es una segunda copia editable del proyecto.
- **Blobs compartidos:** caras estáticas, entrada animada, error, guiño y badge de onboarding. La transición feliz ocurre después de guardar realmente; un fallo conserva el mensaje y los campos. Se mantiene el avance único, los pasos opcionales, el foco, los anuncios y el movimiento reducido. No se usa una animación como sustituto del progreso real de captura/render.

No se añadieron dependencias, servicios de Spotify, endpoints ni tablas para estos ajustes. El entorno Investor y las rutas principales permanecen en su arquitectura existente.

## 4. Mapa del código

| Área | Archivos / carpetas |
| --- | --- |
| Rutas y entrada UI | `artifacts/nebula/src/App.tsx`, `pages/` |
| Shell, navegación, retornos y guardas | `components/shell/` |
| Home, búsqueda, filtros y ordenación | `features/opportunities/`; contratos/lógica en `lib/local/src/opportunities.ts`, `opportunity-search.ts`; API en `server/app.ts`, `server/project-browser.ts` |
| Discovery, medios y acciones | `features/discovery/`, `pages/discovery.tsx`; rutas de publicaciones en `server/app.ts` |
| Un único medio activo / previews | `components/playback-coordinator.tsx`, `components/audio-preview.tsx` |
| Identidad, onboarding y preferencias | `features/artist-identity/`, `context/AuthContext.tsx`; `lib/local/src/store.ts` |
| Remix y motores | `features/remix/studio.tsx`, `audio.ts`, `video.ts`, `video-framing.tsx`, `video-geometry.ts`, `fragment-selector.tsx`, `audio-comparison.tsx` |
| Propuestas, términos y revisión | `features/collaborations/index.tsx`, `opportunity-fields.tsx`, `proposal-preparation.tsx`, `contribution-recorder.tsx`; `server/collaborations.ts` |
| Encuadre y preparación compartidos | `lib/local/src/video-composition.ts`, `publications.ts`, `collaborations.ts`; validación en `server/remix-drafts.ts` y `server/collaborations.ts` |
| Blobs y fallback de avatar | `components/blob-face.tsx`; geometría y parámetros compartidos en `lib/avatar.ts` de la UI |
| Mensajería y notificaciones | `features/messages/`, `features/notifications/`; módulos correspondientes de `server/` |
| Canciones y proyectos | `features/songs/`, `pages/project.tsx`, `pages/profile.tsx`; `server/works.ts` |
| Contratos y estado de dominio | `lib/local/src/` |
| API, autorización, medios y persistencia | `server/app.ts` y módulos de `server/` |
| Orquestación de la presentación | `server/presentation.ts`, `features/presentation/`, `scripts/presentation.mjs` |
| Catálogo CHILZ y preview silencioso | `features/presentation/catalog.tsx`, `lib/local/src/presentation-catalog.ts`, `presentation/chilz-catalog.json`, `scripts/presentation-catalog.mjs` |
| Preparación de referencias visuales | `scripts/import-chilz-reference.py`, `artifacts/nebula/public/presentation/chilz/` |
| Ejemplo LUNA | `scripts/presentation-luna.mjs`, `presentation/assets/audio/luna-*.m4a`, `presentation/assets/covers/luna-*.png` |
| Fixture compartido | `presentation/seed/manifest.json`, `scene.sqlite`, `blobs/` y `presentation/assets/` |
| Preparación portátil | `scripts/presentation-seed.mjs`, `presentation-seed.test.mjs` |

Las rutas de esa tabla se refieren a `artifacts/nebula/src` cuando no aparece un prefijo de servidor o biblioteca. Antes de tocar un contrato, buscar sus consumidores UI/servidor/tests: no crear una segunda fuente de datos por pantalla.

## 5. Rutas y recorridos

| Entrada | Comportamiento actual |
| --- | --- |
| `/explore` | Home de Artist/visitante: búsqueda de oportunidades, filtros, For You, Recently created y Following. Investor conserva su catálogo. |
| `/search` | Search global, separado del contexto de Home. |
| `/discovery` | Audio/video, interacciones y proyectos vinculados. |
| `/profile`, `/profile?edit=1` | Perfil privado y editor; proyectos, publicaciones, guardados e historial. |
| `/artist/:id` | Identidad pública y grafo social; CHILZ incorpora discografía y el ejemplo de grabación destacado cuando está instalado. |
| `/project/:id?song=:workId` | Proyecto y canción concreta; ofertas, referencia y contexto. Los lanzamientos de catálogo muestran tracklist/preview visual; LUNA usa medios reales. |
| `/messages`, `/messages/offer/:id` | Inbox/Requests y preparación de propuesta. |
| `/messages/collaboration/:id` | Hilo de propuesta y trabajo; `/collaborations/:id` sigue siendo un alias válido. |
| `/remix/:id`, `/studio/remix` | Preparación desde un original y recuperación del trabajo privado. |
| `/notifications`, `/saved` | Avisos y colección privada. |
| `/pledges`, `/received` | Historial privado de aportaciones simuladas en USD. |
| `/presentation` | Personas y eventos internos; Cmd/Ctrl + Shift + P. |

La navegación de escritorio y móvil difiere en disposición, no en permisos. En móvil Received, More y Logout se recuperan desde Profile. Evitar duplicar accesos o reiniciar formularios al cambiar el ancho.

## 6. Datos: qué es canónico y cómo conservarlo

La demo activa vive en `.data/presentation/nebula.sqlite`, con `media/` y `prepared/`. SQLite contiene tanto el estado de cuentas/proyectos como las tablas de publicaciones, relaciones, propuestas, mensajes y notificaciones. Los archivos se sirven por rutas autorizadas; una URL de medio no sustituye una comprobación de permisos.

El fixture `presentation/seed/scene.sqlite` es una instantánea **de presentación saneada**, no una base de cuentas reales. No contiene sesiones ni hashes/salts de contraseñas. Su manifiesto relaciona cada medio y toma con un archivo local y SHA-256; evita duplicar los mismos archivos en el repo. En la preparación se verifican las referencias, se generan hashes locales PBKDF2 y se crea `.data/presentation` de forma atómica.

- Preparar de nuevo o reiniciar conserva la base activa. Un directorio incompleto produce error, no se sobreescribe.
- `pnpm demo:reset`, con servidor activo, recupera `initial.sqlite`; es una acción explícita que descarta las ediciones del ensayo.
- Para cambiar deliberadamente el punto de restauración **local**, respaldar primero y ejecutar `node scripts/presentation.mjs checkpoint`. Esto no publica esos cambios en Git.
- Para modificar el catálogo compartido del repo, revisar una nueva instantánea ficticia y actualizar conjuntamente `scene.sqlite`, referencias/checksums del manifiesto y los archivos. No copiar una base de trabajo completa. Los IDs de `presentation/closing-scene.json` y los tests deben seguir correspondiendo al nuevo escenario.
- Los importadores `scripts/presentation-catalog.mjs` y `scripts/presentation-luna.mjs` reciben una ruta de SQLite explícita. Detener su servidor y respaldar base/archivos antes de usarlos. No descubren ni actualizan automáticamente la carpeta de trabajo real. La importación se identifica mediante `artist-catalog` / `luna-example` en `presentation_settings`; repetirla no duplica los mismos proyectos/canciones. Una cuenta con email coincidente pero sin el mapa esperado produce error, no se sobrescribe.
- `presentation/chilz-catalog.json` guarda la procedencia de la referencia visual; `PresentationCatalog` enlaza sus IDs con proyectos y obras. El proyecto y la obra siguen siendo canónicos para sus datos editables. Los lanzamientos no son ofertas activas por el mero hecho de existir en la discografía.
- Los proyectos de catálogo con objetivo cero conservan ese valor al editar título/portada y al archivarse. El marcador de presentación no se acepta de entradas arbitrarias del cliente; el catálogo no habilita inversión ni controles de financiación. Los proyectos normales conservan su validación financiera.
- `scripts/import-chilz-reference.py` se ejecuta solo al preparar/revisar el catálogo. Lee los datos públicos del embed de Spotify y guarda imágenes localmente; no descarga música ni necesita ejecutarse durante la presentación. Si faltan metadatos, falla en lugar de inventarlos.
- No añadir `.data`, bases activas, `.env`, sesiones ni archivos personales a Git. El único SQLite versionado permitido por `.gitignore` es el fixture revisado.

Las credenciales documentadas son de personajes públicos de prueba: `Nebula2026!`. En modo presentación también se puede cambiar de persona desde backstage. Esto es intencional para una demo local; no es autorización adecuada para alojar ese modo públicamente.

### Metadatos nuevos sin migración de tablas

`VideoComposition` es opcional y versionado:

```ts
{
  version: 1,
  layout: 'vertical-split' | 'vertical-single',
  source: { x: number, y: number },       // posición normalizada 0..1
  contribution: { x: number, y: number }  // posición normalizada 0..1
}
```

Los ajustes JSON existentes de Remix y preparación guardan `composition`. `parseVideoComposition` valida forma y rangos; el servidor comprueba que el layout corresponda al formato de referencia. Las configuraciones antiguas sin esta propiedad permanecen válidas, con su geometría anterior hasta que el usuario elija actualizar el encuadre. Un resultado ya renderizado no se cambia ni reclasifica.

Las propuestas incorporan `ProposalPreparationMetadata`: `{ version: 1, referenceId, fragment?: { startSeconds, endSeconds }, composition? }`. Se guarda en el JSON existente de términos como `proposalPreparation` y se expone como `submission.preparation`. Se valida referencia vigente, límites temporales y composición; no incluye el archivo bruto de la aportación ni convierte el metadato en una comprobación audiovisual del contenido. El borrador mantiene la configuración de trabajo y el resultado final; el envío comparte el resultado/adjuntos con sus participantes, sin dar acceso público a la toma privada.

## 7. Ejemplos musicales y reglas a preservar

| Caso | Contexto | Publicaciones | Oferta abierta |
| --- | --- | --- | --- |
| Voz de Dante + Club Marea, 7.8 s | Proyecto 12, canción 4 · Marea Alta | Original 13 → resultado 14 | 13 · Verse · 15% regalías |
| Percusión de Inés + Lía, 10 s | Proyecto 9, canción 1 · Afterglow | Original 15 → resultado 16 | 15 · Production · USD 300 |

Sol puede preparar nuevas propuestas sobre esas ofertas. También recibe la solicitud 10, sobre su proyecto 20/canción 10, oferta 16. Los antecedentes aprobados de los ejemplos son los hilos 8 y 9.

Las tomas y resultados están en `presentation/assets/video/`; el original audio de Afterglow, en `presentation/assets/audio/`. No se renombró un mismo archivo para fingir dos aportaciones. Los videos generados se incluyen localmente y el render interactivo mezcla las entradas seleccionadas, no devuelve un resultado fijo.

El vocal original generado tenía un defecto visual al final; la versión integrada utiliza sus 7.8 s limpios. El video histórico del post 11 conserva un montaje anterior y no es la evidencia de sincronía de los nuevos conjuntos. Los detalles y créditos están en el manifiesto y [reporte de cierre](demo-close.md).

Reglas de Remix: original audio admite audio o video; original video exige video. Original y aportación conservan su atribución/permiso. Los borradores nuevos son privados; enviar una propuesta comparte el resultado con los participantes, **no lo publica en Discovery**. Los remixes públicos precargados son fixtures de colaboraciones ya autorizadas.

Conservar los límites actuales de duración/tamaño, cancelación, liberación de micrófono/cámara y detección de permisos vigentes. El render de video ocurre en tiempo real mediante el navegador; no es un editor con garantía de precisión de estudio.

### Catálogo visual de CHILZ

Fuente indicada: [CHILZ en Spotify](https://open.spotify.com/artist/1I6NepqGwgAF7Peq8F7clq), con registro de verificación del 9 de noviembre de 2026. Los **10 lanzamientos / 14 canciones** se describen en `presentation/chilz-catalog.json`; ese número corresponde a la selección de referencia importada, no afirma cubrir cualquier catálogo futuro de Spotify. Se preservan títulos, colaboradores, duración, tipo/año y fuentes de imágenes.

`SilentDemoPlayer` solo mueve el transporte visual. No contiene URL multimedia ni archivo de silencio, no genera waveform ficticio, y muestra **Silent demo preview / No audio included**. No se ofrecen descargas, mezclas ni acuerdos sobre un archivo inexistente. Para demostrar grabación, mezcla y propuesta se utilizan Marea/Afterglow o archivos reales cargados por el presentador.

### LUNA: ejemplo principal de remix

- Original **luna · gramz & SANNFERNNA** y **luna - chilz remix**: dos archivos M4A completos aportados por el usuario, de **175.287438 s** (aprox. 2:55.287). Los PNG propios acompañan sus portadas.
- `PresentationRemixExample` mantiene los IDs de publicaciones, proyectos, obras, medios y artistas. No se fijan aquí IDs de instalación ni se utilizan los de una cuenta real. Los dos personajes de presentación del original se añaden explícitamente; la grabación original no se duplica por aparecer dos artistas.
- El remix precargado registra atribución completa al original, del segundo 0 al 175.287438, como **grabación terminada suministrada**, no como exportación realizada por Remix Studio. No se aumentó ni eludió el límite de 60 s para crear una mezcla nueva en la interfaz.
- Los enlaces permiten escuchar/comparar las versiones, ir al original y abrir la publicación en Discovery. La consulta normal de publicaciones proporciona los medios autorizados; la metadata de presentación no sustituye sus permisos.
- El original tiene un solo registro, propiedad del personaje gramz. La capa de presentación lo muestra también en Music de SANNFERNNA y acredita a ambos; no implementa copropiedad, un contrato ni un split económico.
- Esta es la **única música audible del catálogo de presentación de CHILZ** en esta entrega. Los diez lanzamientos importados de Spotify continúan usando preview silencioso; los ejemplos audiovisuales ajenos a ese catálogo conservan sus audios reales.

La instalación aditiva pasó sus cuatro pruebas de importación, repetición y rollback. Los archivos coinciden byte por byte con los aportados; FFprobe identifica AAC estéreo a 44.1 kHz y 175.287438 s. Catálogo, reproducción, seek, comparación exclusiva, enlaces, retorno y aislamiento de Sol pasaron en escritorio/móvil y anchos 390, 768, 1024 y 1440. La activación conservó las cuentas, proyectos y filas históricas previas de 28 tablas, además de los 61 archivos anteriores del ensayo. El respaldo quedó bajo `.data/backups/`; los detalles están en el reporte de verificación.

## 8. Checks y evidencia de esta iteración

```sh
pnpm test:seed
pnpm test
pnpm test:server
pnpm build
pnpm demo:check
pnpm test:presentation
# Según el área tocada, ejecutar también las suites correspondientes:
pnpm test:shared
pnpm test:collaborations
pnpm test:remix
```

Las suites de navegador requieren Google Chrome; Playwright descarga sus herramientas con `pnpm exec playwright install chromium`. Los scripts prueban datos desechables, no la escena que está abierta para presentar. Ejecutar suites integradas secuencialmente para no compartir puertos ni el límite de registro.

Verificación focalizada completada durante la ampliación Artist, con copias temporales:

| Área | Resultado observado | Cobertura |
| --- | --- | --- |
| Unitarias / API / fixture | 81/81, 88/88 y 6/6 | Estado, contratos, autorización, historial, importación y preservación. |
| Escenario integral | 14/14 | Dos lados de colaboración, mensajes, archivos privados, sesión/reinicio y aportaciones Investor. |
| Presentación final | 44/44 casos únicos verificados con reejecuciones finales | Catálogo CHILZ/LUNA, onboarding, navegación, cámara, propuesta, reproducción, offline y ambos personajes. |
| Compartidas | 40/40 | Sesión, identidad/perfil, Home Search, For You y navegación, Artist/Investor. |
| Geometría de video | 6 pruebas unitarias aprobadas | Regiones iguales, recorte proporcional y coordenadas compartidas. |
| API de encuadre | 1 prueba aprobada en `server/video-framing.test.mjs` | Validación, persistencia y compatibilidad de ajustes. |
| Remix integrado | 34/34 aprobadas: 14 Remix, 6 unificación, 6 waveform, 8 workspace | Escritorio/móvil, formatos, 720 × 1280, bandas de prueba en preview/exportación, drag táctil, teclado/reset, persistencia, invalidación, legacy, privacidad y liberación de dispositivos. |
| API de preparación | 2/2 aprobadas en `server/proposal-preparation.test.mjs` | Referencia/descarga, borradores/decisiones, metadatos válidos e inválidos, reinicio, privacidad del archivo bruto después de enviar el resultado. |
| Preparación en navegador | 10/10 aprobadas en `tests-presentation/collaboration-preparation.spec.ts` | Cinco casos en escritorio y móvil: grabación audio/video, descarga, descarte, borrador/recarga, permiso denegado, conservación de textos/PDF al invalidar, selección 65–80 s en referencia de 80 s, cancelación tardía y salida sin dispositivos activos. |
| Cierre de los ejemplos existentes | 6/6 aprobadas en `tests-presentation/closing.spec.ts` durante la ejecución combinada anterior | Ambos ejemplos musicales, mezcla real del navegador, propuesta privada y aceptación en el mismo chat; prepared take de Remix, borrador/recarga y propuesta. |
| Blobs / onboarding | 3 unitarias + 6 recorridos escritorio/móvil aprobados | Validación nativa, guardado diferido real, fallo 409 que conserva texto, pasos opcionales, movimiento reducido, doble envío, desmontaje y guiño único de Home. |
| Estado de catálogo | 17/17 pruebas del store aprobadas | Edición, archivo y recarga de proyectos de catálogo con objetivo cero; validación de financiación normal. |
| Importación LUNA | 4/4 aprobadas en `scripts/presentation-luna.test.mjs` | Importación aditiva, repetición, conservación de datos/personajes/CHILZ principal y rollback de base, secuencias y archivos ante fallo. |
| TypeScript y compilación | `pnpm typecheck`, `pnpm build:server` y build de UI aprobados | Permanecen los avisos conocidos de sourcemap/tamaño de bundle. |

Estas filas no se suman para producir un total de pruebas únicas: algunas suites se repitieron y el cierre combinado antecede a la última corrección focalizada de permisos. Cámara/micrófono se probaron con dispositivos simulados de Chromium; esto no sustituye una comprobación del hardware de presentación. Catálogo/LUNA y activación final están comprobados en el reporte de esta entrega. Después de las guardas finales se repitieron además 14/14 de Remix core y 2/2 de prepared take, con cancelación/reintento y guardado.

La verificación de la primera publicación (71 unitarias, 86 de servidor, 38 regresiones focalizadas, 22 recorridos de presentación y 8 recorridos de video) es **histórica**. [Verificación de publicación](repo-verification.md) y [cierre anterior](demo-close.md) describen aquella revisión, no esta ampliación. No usar sus cifras como si fueran una ejecución nueva.

Mantener regresiones de sesión/logout y edición concurrente de perfil; búsqueda y filtros al cambiar cuenta; privacidad de borradores, mensajes y archivos; misma identidad de hilo al aceptar/rechazar; reproducción exclusiva; retorno a proyecto/publicación; conservación de datos tras recarga.

## 9. Límites y decisiones pendientes

- Pagos, regalías, acuerdos y eventos de los personajes son simulados. No hay movimiento de dinero ni contratos legales.
- Las cuentas y archivos se administran localmente; Antiq Central no está conectado en esta demo. No presentar este backend como su implementación definitiva.
- Las cuentas de presentación con nombres reales no son conexiones verificadas con Spotify ni sesiones reales de esos artistas. El selector de personajes es una herramienta de ensayo. Cambiar de personaje no autoriza a publicar ese modo como un sistema multiusuario seguro.
- La discografía importada es una referencia visual. LUNA se recibió como grabación terminada; sus metadatos de atribución no son una prueba de autoría o un análisis de stems. No se inventan financiación, splits ni contratos para estas obras.
- El orden de Home/Discovery utiliza reglas y preferencias locales, no un modelo de recomendación entrenado.
- FFmpeg/FFprobe deben estar instalados. Sin ellos puede fallar el análisis de waveforms; no inventar barras para ocultarlo.
- Los tests móviles usan Chrome emulado, no validación en un teléfono físico. Grabación con dispositivos requiere revisión en el dispositivo objetivo.
- Se verificaron señales, movimiento, mezcla y sincronización técnica. La afinación, fraseo y coherencia artística requieren escucha humana.
- El build conserva avisos de tamaño de bundle/sourcemaps. No bloquean los recorridos comprobados.
- La licencia MIT corresponde al código; no amplía los derechos de portadas, fotos ni grabaciones suministradas. Mantener su procedencia y condiciones originales.
- No hay despliegue web público asociado al repositorio. Revisar arquitectura/autorización antes de transformar esta demo local en un servicio compartido.

Para cambios incrementales: modificar el componente o contrato existente, probar con copias temporales, actualizar este handoff si cambian reglas/rutas y conservar el escenario de presentación. No recuperar auditorías antiguas como evidencia del estado actual.

## 10. Perfiles y proyectos compartidos — 9 de noviembre de 2026

El perfil público (`/artist/:id`) ahora abre **Overview**, seguido de Music, Discovery Posts, Projects, Collaborations y About. Overview reutiliza música real, catálogo verificado y oportunidades elegibles; los accesos abren las pestañas completas. La pestaña y la selección de audio se conservan en el contexto de navegación de cada cuenta. CHILZ conserva LUNA como destacado, pero su catálogo ya no sustituye ni oculta las publicaciones musicales nuevas. Los demás artistas usan el mismo diseño de portadas, con estados y financiación reales. El panel privado `/profile`, Home y las tarjetas de Investor conservan su presentación.

`/project/:id` utiliza una estructura común para portada, artista, descripción, música, canciones, ofertas, comunidad y financiación. `CatalogSongs` y `RecordingDetails` son módulos de esa estructura, no páginas alternativas. El catálogo conserva previews silenciosos; las grabaciones reales se reproducen desde sus publicaciones autorizadas. Las ofertas por canción se muestran al seleccionar la canción; las ofertas del proyecto permanecen disponibles. LUNA conserva sus créditos de presentación y comparación A/B. No se añadieron contratos, APIs, tablas ni campos de autoría.

La recuperación de posición incluye ahora el scroll de `body`, además de ventana y contenedores internos. La limpieza de medios al arrancar en modo presentación protege también los archivos registrados en `initial.sqlite`: un escenario inicial y un ensayo activo pueden tener identificadores distintos. Esta protección no hace públicos los archivos: el acceso sigue dependiendo del registro y permisos del escenario activo.

Evidencia, límites y verificaciones de esta entrega: [Perfiles y proyectos compartidos](shared-artist-verification.md). Las cifras de verificaciones anteriores siguen siendo históricas.

## 11. Remix adaptable y controles de Discovery — 9 de noviembre de 2026

Los resultados identificados con `VideoComposition.version=1` y `layout=vertical-split` usan `features/remix/adaptive-video.tsx`: una única fuente de video/audio, apilada en móvil y reorganizada con canvas en escritorio. Las dos regiones exportadas son 720 × 640; la descarga sigue siendo un archivo de 720 × 1280. No se infiere una composición a partir de dimensiones. Si canvas falla, se presenta el archivo vertical intacto y un reintento. El encuadre usa la misma geometría en preview/exportación. Los borradores antiguos requieren **Update framing** y reconstrucción explícita; no se convierten automáticamente.

La composición se propaga al estudio, comparación, Discovery, comunidad del proyecto y revisión privada. Los snapshots de propuestas incorporan opcionalmente la composición validada; no hay rutas ni tablas nuevas. El ejemplo Marea usa ahora `presentation/assets/video/marea-vocal-split-v1.mp4`, manteniendo el audio anterior sin cambios. El resultado y las fuentes anteriores permanecen disponibles. `scripts/presentation-split-remix.py` actualiza exclusivamente ese ejemplo de forma idempotente: sin argumentos actualiza el fixture portátil; `--data-dir .data/presentation` actualiza el ensayo instalado y su escena inicial. Respaldar antes de ejecutarlo y detener el servidor durante la actualización. `--render` permite reconstruir el nuevo archivo con FFmpeg a partir de las fuentes existentes; no usar el antiguo generador 25/75 para este resultado corregido.

En Discovery los videos se pausan/reanudan tocando la imagen. La barra visual mide 2 px y su indicador 4 px, conservando un área táctil de 44 px y teclado. Se elimina la fila permanente de tiempo, pausa y volumen del video; queda un control discreto de mute/unmute para respetar las restricciones de autoplay del navegador. El volumen se controla desde el dispositivo. Los audios mantienen sus controles, pero en móvil el bloque inferior queda junto a la navegación y la portada aprovecha el espacio disponible.

Verificación y capturas: [Remix adaptable y Discovery](adaptive-remix-verification.md). Ningún cambio de esta entrega elimina Create, Messages, perfiles o navegación.

## 12. Discovery: reproducción exclusiva con sonido — 9 de noviembre de 2026

Esta actualización sustituye el comportamiento de audio manual y video silenciado descrito anteriormente. Audio y video intentan reproducirse con sonido al convertirse en la publicación activa. El elemento anterior se pausa al hacer scroll; un `play` tardío de una publicación inactiva no puede interrumpir al elemento visible. Comentarios, otros paneles, notificaciones, documento oculto y salida del feed detienen la reproducción. Cerrar el panel o volver a la pestaña no reinicia automáticamente una pausa; avanzar a otra publicación sí intenta su reproducción. Se respeta la preferencia existente de movimiento reducido para el autoplay de video.

Por decisión del usuario, la portada de audio ahora pausa/reanuda; **View project → Open full project** conserva el acceso al proyecto/canción. Se mantiene el waveform y se retira la fila de play/tiempo/volumen. En móvil no hay controles de volumen/mute del feed: la fuente usa volumen 1 y el volumen físico lo controla el dispositivo. Entrar en móvil no conserva un mute aplicado desde escritorio. El control compacto de mute de video sigue disponible en escritorio; el estado inicial es sonido activado.

El navegador puede denegar autoplay audible. Se maneja `play()` rechazado mostrando **Tap to play with sound**, sin recurrir silenciosamente a video muted ni prometer saltarse esa restricción. La aprobación puede depender del navegador y del elemento. Se probó el fallback en el navegador integrado y en Chrome emulado; no se cambian permisos del navegador. No se modificaron datos, APIs, archivos multimedia, navegación ni estilos de portadas/composición. Únicamente se ajustaron controles solicitados y la capa táctil del reintento.

Verificación final focalizada: 14/14 casos de `tests-presentation/discovery-playback.spec.ts` (escritorio/móvil: scroll con teclado, rueda y touch; ambos formatos; pausas; fallos y respuestas tardías; mute de escritorio a móvil; visibilidad). Además, 6/6 regresiones de waveform, error/reintento, navegación a proyecto/retorno y privacidad en `tests-discovery`; 81/81 unitarias; TypeScript y producción aprobados. La ronda previa de reproductor adaptable, video y reproducción dio 22/22; se solapa con la focalizada, no sumar como casos únicos. Persisten los avisos de tamaño de bundle/sourcemaps y el límite de móvil emulado. Se actualizaron expectativas obsoletas de autoplay y de portadas; la escucha pública de waveform ya estaba soportada por `?listen=1`, no se amplió autorización en esta entrega.

Código: `features/discovery/media-player.tsx`, `discovery.css`, `pages/discovery.tsx`, guardas de `components/playback-coordinator.tsx` y `features/remix/adaptive-video.tsx`, dentro de `artifacts/nebula/src`. Respaldo de estado y hashes al cierre: `.data/backups/discovery-playback-20261109`; no fue necesario ejecutar migraciones ni reiniciar el servidor para activar el bundle en 4186. Captura: `docs/images/discovery-audio-tap.png`.


## 13. Discovery móvil: remix inmersivo y ficha del original

Solo en Discovery, por debajo de 768 px, los resultados compatibles de dos videos ocupan toda la superficie sobre la navegación. El archivo vertical se centra y recorta proporcionalmente, con la división a media altura; no se regeneran medios. Esta excepción sustituye la presentación móvil contenida anterior únicamente en el feed. Tablet/escritorio, estudio, exportación y reproductores externos a Discovery conservan su comportamiento. Información, acciones y progreso se superponen; las filas de atribución, comparación y remix deshabilitado pasan a la ficha.

La miniatura de 48 × 48 abre **Original sound**, aunque el resultado no tenga proyecto. Reutiliza `usePublication` y su caché por identidad para el original activo o próximo. La imagen procede del original, después de su proyecto, o de un marcador neutro. La ficha refresca resultado y original: solo habilita navegación y comparación para registros publicados y accesibles; ante revocación conserva el crédito histórico sin enlaces ni medios. Los fallos recuperables permiten reintentar. **Compare versions** monta los reproductores existentes únicamente al solicitarlo, sin autoplay. Abrir pausa el feed; cerrar devuelve foco y conserva posición y pausa. No se crean endpoints, tablas, dependencias ni permisos nuevos.

Archivos principales dentro de `artifacts/nebula/src`: `features/discovery/original-sound.tsx` (nuevo), `features/discovery/version-comparison.tsx`, `features/discovery/discovery.css` y `pages/discovery.tsx`. Regresiones en `tests-presentation/immersive-remix.spec.ts` y actualización de la expectativa móvil de `tests-presentation/adaptive-remix.spec.ts`.

Verificación: 32/32 casos conjuntos de reproductor adaptable, reproducción y remix inmersivo; ronda final ampliada de remix inmersivo 10/10 (se solapa con la anterior); retorno 10/10; unitarias 81/81; TypeScript y build de producción aprobados. Incluye 390, 636, 767, 768 y 1440 px, horizontal 667 × 375, comparación con reproducción exclusiva, Escape/foco, navegación/retorno, originales sin proyecto, portadas fallidas y originales revocados. La revisión móvil usa Chrome emulado, no un dispositivo físico. Persisten los avisos existentes de bundle/sourcemaps.

Respaldo: `.data/backups/immersive-remix-20261109`. Comparación de SQLite y SHA256: cuentas, proyectos, publicaciones y demás registros de producto intactos; 58 archivos existentes idénticos. Solo variaron `feed_snapshots` y `rate_limits`, registros temporales de consultas. Activación del frontend en localhost:4186 sin reiniciar el backend ni ejecutar migraciones. Capturas: [Discovery móvil](images/discovery-remix-immersive.png) y [Original sound](images/discovery-original-sheet.png).


## 14. Discovery: preparación del siguiente contenido y tarjetas acotadas — 10 de noviembre de 2026

Discovery conserva el scroll nativo y sus dimensiones. Solo monta las tarjetas completas de la publicación activa y hasta dos vecinas por lado (máximo cinco); las demás son espacios vacíos de altura idéntica con snap, sin imágenes, acciones ni reproductores. Estos espacios permiten saltos largos sin cambiar offsets ni interceptar gestos. Los registros del feed y las interacciones permanecen en sus fuentes actuales; la memoria de avance, duración y mute vive fuera de las tarjetas, separada por identidad y archivo, durante la estancia en Discovery. No se guardan medios ni estado nuevo en localStorage. La publicación activa y el retorno siguen usando el contexto de navegación existente.

Hay como máximo tres elementos multimedia: anterior, actual y siguiente. La activa recibe prioridad de carga. Cuando está lista, después de 250 ms se solicita `preload=auto` solo para la siguiente, reutilizando el elemento que se convertirá en activo. No se reproduce para precargar, no se descargan blobs adicionales y no se usa otro reloj de audio. El resto conserva `metadata`; al alejarse se pausa y se libera su fuente. Se desactiva la preparación anticipada ante ahorro de datos, conexión 2G/slow-2G, documento oculto, panel abierto o notificaciones. `preload` es una indicación al navegador, no una garantía de bytes ni una cancelación de descargas ya iniciadas. La paginación anticipada existente también funciona en escritorio, con la misma protección contra solicitudes duplicadas y reintento explícito.

Las portadas conservan sus funciones: audio grande = Play/Pause; miniatura de video vinculado = proyecto/canción; miniatura de remix compatible en móvil = Original sound. La preparación de imagen usa el componente existente y su fallback publicación → proyecto → marcador neutro; no convierte portadas en publicaciones, no crea un carrusel de álbumes y no reutiliza arte de otro artista. La consulta de la portada del original sigue limitada a publicaciones activas/próximas y conserva permisos. El reproductor compartido fuera de Discovery mantiene su política de carga anterior.

Archivos: `pages/discovery.tsx`, `features/discovery/media-player.tsx`, `cover-artwork.tsx`, `discovery.css` y nuevo `feed-preparation.ts`, dentro de `artifacts/nebula/src`. Nuevo `tests-presentation/discovery-window.spec.ts`. Código React propio; no se copió código de Douyin ni se añadieron dependencias. Se corrigió además un exceso de 2 px del área táctil del seek móvil y se devuelve el foco al feed si el control que abrió comentarios fue desmontado.

La revisión de encuadre encontró una discrepancia anterior: `discovery-layout.spec.ts` exige `object-fit:cover` en video móvil normal, pero una regla móvil existente en `discovery.css` establece `contain`. Se conserva esa presentación por el alcance solicitado (sin rediseño), y no se debilita la prueba. El remix compatible conserva su recorte inmersivo. Los dos casos de esa expectativa (desktop/mobile) siguen fallando; el resto de la suite de layout/portadas pasa (10/12). Esto no afecta las verificaciones específicas de preparación, exclusividad, remixes, miniaturas y retorno.

Respaldo de SQLite y manifiesto SHA256: `.data/backups/discovery-window-20261110`. Comparación: escena inicial idéntica; cuentas, proyectos, publicaciones y registros de producto conservados. En la base activa solo cambiaron sesiones de navegador, snapshots del feed y límites de solicitudes. Los 58 medios/archivos preparados son idénticos. Pruebas con copias temporales, sin usar la cuenta del usuario como fixture. No hay cambios de API, tablas, migraciones, exportación ni navegación.

Resultados finales: 44/44 pruebas de presentación (preparación, ventanas de tarjetas, reproducción, portadas del original y remix adaptable); 10/10 de retorno; 81/81 unitarias; TypeScript y build aprobados. Suite adicional de layout/portadas: 10/12, con las dos discrepancias de encuadre descritas arriba. Las pruebas comprueban un catálogo de 60 publicaciones, límites de cinco tarjetas/tres reproductores, conservación de avance y acciones, mismo elemento al activar la siguiente publicación, ahorro de datos, visibilidad, paneles, permisos, navegación y retorno. No se midió todavía una reducción de latencia o memoria en teléfonos físicos; se verificó la reducción de componentes y Chrome móvil emulado. Persisten los avisos existentes de bundle/sourcemaps. Frontend activado en localhost:4186; backend sin migraciones ni reinicio.
## 15. Visor móvil y encuadre aprobado — 10 de noviembre de 2026

Disponible en `http://127.0.0.1:4186/presentation/mobile` y desde **More → Mobile preview**, en una pestaña independiente. Usa la aplicación existente dentro de un iframe del mismo origen con viewport real de 375 × 667, 390 × 844 o 430 × 932 CSS px. Rotate intercambia dimensiones; el marco se escala visualmente para caber sin alterar los breakpoints. No remonta el iframe al cambiar tamaño, conservando navegación y reproducción. Open desktop abre su ruta actual y pausa sus medios. Comparte cuenta y datos con el ensayo; no es otra base de datos ni un emulador de hardware, Safari, gestos o safe-area físicos. Solo está disponible en modo presentación; no se permite anidarlo.

Para permitir el visor, únicamente el HTML de presentación admite framing del mismo origen (`SAMEORIGIN`); solo la ruta del visor permite `frame-src 'self'`. El modo normal, API y medios conservan `DENY`. Se rechazan destinos externos, API, medios y rutas recursivas como fuente del iframe. No hay dependencias ni cambios de almacenamiento.

Tras la aprobación del recorte, se acotó la regla `contain` al video con comentarios abiertos. El video móvil normal vuelve a llenar su superficie con `cover`, sin deformación. Portadas, composición de remixes y escritorio conservan su comportamiento. Quedan resueltas las dos discrepancias de pruebas documentadas en la sección 14.

Archivos: nuevos `features/presentation/mobile-preview.tsx` y `mobile-preview.css`; integración en `App.tsx`, `components/shell/more-menu.tsx`, `features/discovery/discovery.css` (todos dentro de `artifacts/nebula/src`) y `server/app.ts`. Pruebas nuevas: `tests-presentation/mobile-preview.spec.ts` y `server/mobile-preview.test.mjs`.

Verificación: 4/4 pruebas del visor (tamaños, rotación, mismo iframe y avance, remix, ficha original, navegación y regreso a la misma publicación, destinos inválidos); 2/2 pruebas de cabeceras de seguridad; 12/12 regresiones de Discovery/layout/portadas. TypeScript y build de producción aprobados; persisten avisos existentes de bundle/sourcemaps. Chrome abierto y revisado visualmente. Captura: [visor móvil](images/mobile-preview.png).

Activado frontend y servidor en localhost:4186 sin preparar ni resetear la escena. Respaldo `.data/backups/mobile-preview-20261110`: comparación de 31 tablas en cada base, escena inicial idéntica, registros de producto intactos; solo cambian snapshots de feed y límites de consultas en la base activa. Los 58 archivos conservan su SHA256. Detalle en `verification.json` del respaldo.


## 16. Discovery, navegación y Saved simplificados — 10 de noviembre de 2026

Se retiran de Discovery la fila de formato/contador de cada publicación, el acceso duplicado `publish +` y el pie permanente de refresh. El botón **Create (+)** conserva publicación, proyectos, Remix studio y borradores. Los ejemplos offline mantienen una identificación discreta Demo. Las portadas, acciones, composición de remixes y reproducción no cambian.

Para cuentas autenticadas, **Profile** queda al pie de la sidebar, debajo de notificaciones, con la foto real de la sesión y fallback de avatar cuando falta o falla. Sigue dentro del único landmark principal y mantiene su lugar en la barra móvil. **More** está en Profile en todos los tamaños, conservando sus acciones, Mobile preview y Logout; el Logout de escritorio continúa disponible. Los visitantes conservan sus accesos existentes.

Volver a pulsar Discovery mientras ya se está en esa pantalla solicita un feed nuevo sin recargar el documento. En móvil también se admite arrastrar hacia abajo desde el inicio: umbral de 80 px, cancelación y exclusión de controles interactivos, paneles abiertos y notificaciones. El gesto no intercepta el scroll entre publicaciones ni se habilita en escritorio. Se muestra progreso únicamente durante el gesto/petición. El refresh cancela consultas previas, solicita un snapshot nuevo mediante el endpoint existente y sustituye la primera página solo al completar la petición; rechaza reentradas y aborta al desmontar/cambiar identidad. Un fallo conserva el feed y ofrece reintento. La navegación de regreso conserva la publicación; solo el refresh explícito vuelve al inicio. Carga de páginas y errores usan el overlay existente, también en escritorio, sin un pie permanente ni avisos duplicados.

Saved elimina la descripción introductoria y sustituye el botón largo por un marcador activo con nombre accesible `Unsave [title]`, `aria-pressed` y área de 44 px. Conserva la mutación existente, bloqueo durante la solicitud y refresco tras confirmación. Un fallo mantiene la publicación guardada. La regresión detectó y corrigió además la devolución de foco de comentarios móviles: ahora espera a que la barra de acciones vuelva a ser visible.

Archivos de producto: `components/shell/navigation.tsx`, `navigation.css`, `pages/profile.tsx`, `pages/discovery.tsx`, `features/discovery/discovery.css`, `publication-api.ts`, `live-discovery.tsx`, `social.tsx` y nuevo `refresh-event.ts`, dentro de `artifacts/nebula/src`. Sin endpoints, dependencias, tablas ni migraciones nuevas.

Verificación final: 68 casos únicos aprobados entre presentación/visor/preparación/remixes (32), Discovery/layout/paginación (12), navegación (8) y retorno/social/privacidad/financiación (16). Las ejecuciones iniciales motivaron ajustar fixtures vacíos y esperas de refresh en las pruebas nuevas; actualizar expectativas antiguas de autoplay, pausa al abrir comentarios y nombre de Unsave; corregir el aviso duplicado y el foco móvil. No se relajaron comprobaciones de permisos, datos o reproducción exclusiva. TypeScript y build aprobados; persisten los avisos anteriores de bundle y sourcemaps. Revisión visual en localhost y capturas de Chrome; no sustituye pruebas en teléfono físico.

Respaldo: `.data/backups/discovery-cleanup-20261110`. Comparación de las 31 tablas de ambas bases: escena inicial idéntica; en la activa solo variaron `feed_snapshots` y `rate_limits`. Cuentas, proyectos, publicaciones, mensajes y guardados existentes intactos. Los 58 medios/archivos preparados conservan su SHA256. Frontend activado en localhost:4186 sin reiniciar ni resetear el ensayo. Pruebas con bases temporales.

Capturas: [Discovery escritorio](images/discovery-cleanup-desktop.png), [Discovery móvil](images/discovery-cleanup-mobile.png), [Saved](images/saved-bookmark.png).

## 17. Reproducción durante comentarios — 10 de noviembre de 2026

Por petición del usuario, abrir comentarios en Discovery deja de bloquear el reproductor activo: audio, video y remix de dos videos siguen reproduciéndose al leer, escribir y enviar comentarios. El mismo elemento multimedia permanece montado; una pausa manual continúa siendo respetada al abrir o cerrar comentarios. El scroll sigue pausando la publicación anterior y solo permite reproducir la activa. Otros paneles (proyecto, compartir, comparación, notificaciones) conservan sus reglas de pausa. No cambia el layout ni se fuerza un nuevo autoplay al abrir comentarios.

Cambio de producto limitado a la condición `blocked` en `artifacts/nebula/src/pages/discovery.tsx`. Pruebas actualizadas al comportamiento solicitado en `tests-presentation/discovery-playback.spec.ts`, `tests-discovery/discovery-layout.spec.ts` y `tests-shared/social.spec.ts`. Se añaden seis casos específicos (audio, video y remix × escritorio/móvil) que comprueban continuidad del reloj, mismo elemento multimedia, escritura/envío, pausa manual, cierre, cambio de publicación y exclusividad.

Respaldo `.data/backups/comments-playback-20261110`. Comparación: las 31 tablas de la escena inicial intactas; en la base activa solo varió `rate_limits`. Los 58 medios mantienen su SHA256 y no se modificaron cuentas, contenido ni guardados. Frontend compilado y servido en localhost:4186 sin reiniciar ni resetear datos. Se emplearon bases temporales para enviar comentarios de prueba.

Resultados: 20/20 casos de reproducción y comentarios, 12/12 de layout/Discovery y 2/2 de interacciones/privacidad entre cuentas; TypeScript y build aprobados. Sin fallos pendientes en estas suites. Persisten únicamente los avisos anteriores de bundle/sourcemaps.

## 18. Discovery de escritorio: medio protagonista y conversación lateral — 10 de noviembre de 2026

El layout desde 768 px ocupa toda la altura disponible junto a la sidebar. El título Discovery permanece accesible, sin encabezado visual. Video normal usa `contain`; audio conserva portada cuadrada y waveform real; los remixes compatibles mantienen dos mitades horizontales desde un único archivo/reloj. La información se superpone con degradado en video normal y queda fuera de las imágenes en remix. Proyecto, ofertas, atribución, comparación, Hear the collaboration y todas las acciones existentes continúan disponibles. Flechas anterior/siguiente permanecen visibles con comentarios abiertos. No se añade auto-scroll.

Comentarios abre una columna de 320 px, o 360 px desde 1280 px, con lista independiente y formulario inferior. No remonta ni bloquea el reproductor. En escritorio acompaña a la publicación activa; los borradores no enviados viven en un Map temporal por publicación y por identidad, se eliminan tras envío confirmado y no se persisten en navegador ni servidor. Un cambio de cuenta descarta ese Map. Escape devuelve el foco al control correspondiente de la publicación actual, incluso si el anterior fue desmontado por la ventana de tarjetas. El contador usa el resumen social real.

Follow/Following reutiliza `/api/artists/:id/social`, la mutación Follow existente, sus permisos, errores y BroadcastChannel. Consultas limitadas a publicaciones activas/próximas y separadas por identidad. Se omite en contenido propio e Investor; visitantes acceden a login. No se inventan relaciones ni funciones de comentarios como respuestas, likes o menciones.

El transporte compacto de escritorio incluye pausa, tiempo, sonido y pantalla completa. Aparece con hover/foco y comparte el elemento multimedia existente. En remixes reemplaza visualmente el acceso de fullscreen interno para evitar controles duplicados. La memoria temporal del reproductor conserva también volumen al salir de la ventana de tarjetas. Móvil mantiene sonido del dispositivo y su presentación previa. Los controles siguen teniendo áreas de 44 px. Las restricciones de autoplay audible del navegador continúan requiriendo un toque si Chrome lo bloquea.

Archivos de producto: `artifacts/nebula/src/pages/discovery.tsx`, `features/discovery/desktop.css` (nuevo, reglas desde 768 px y acotadas a Discovery), `media-player.tsx`, `feed-preparation.ts`, `social.tsx` y `features/following/index.tsx`. Se reutilizan servicios y reproductores; no hay endpoints, dependencias, tablas, migraciones ni modificaciones de medios. No se cambia Home, perfiles, navegación ni Remix Studio.

La preparación del sucesor y la paginación siguen activas durante los comentarios de escritorio, respetando ahorro de datos, conexión lenta y máximo de cinco tarjetas completas/tres elementos multimedia. Los demás paneles conservan el bloqueo previo. El scroll de comentarios es independiente del feed; no se envía texto automáticamente al cambiar de publicación.

Capturas: [Video sin comentarios](images/discovery-desktop-stage.png), [Video con comentarios](images/discovery-desktop-comments.png), [Remix con comentarios](images/discovery-desktop-remix-comments.png), [Audio con comentarios](images/discovery-desktop-audio-comments.png).

La verificación detectó un salto de scroll al cerrar/reabrir comentarios después de avanzar de publicación. Se desactiva el anclaje nativo en el feed de escritorio y se conserva el índice durante el reflujo de la columna, antes de procesar nuevos eventos de scroll. La regresión de audio/video/remix cubre reapertura, flecha anterior, borrador por publicación y devolución del foco.

Verificación final: **105 casos únicos de navegador aprobados** (63 de presentación/Discovery/reproducción/remix/refresh/guardados; 30 de navegación/retorno/social/Following; 12 de layout/portadas/paginación), más **81 unitarios**, TypeScript y build. Los cinco casos específicos de escritorio se omiten intencionadamente en el proyecto móvil, cuya presentación se verifica en las suites existentes. La repetición posterior a la corrección del reflujo aprobó los cinco casos nuevos de escritorio y los 15 de reproducción/ventana de tarjetas. Se revisaron capturas a 768, 932, 1024, 1280 y 1440 px y altura de 600 px; regresiones móviles incluyen 390 y 767 px, orientación horizontal y portadas/video vertical/cuadrado/horizontal. Fullscreen, volumen, mismo elemento multimedia, comentarios enviados, borradores, roles, errores y Follow entre pestañas comprobados en Chrome. No sustituye validación en dispositivos físicos.

Las tandas iniciales encontraron expectativas antiguas de volumen/fullscreen, actualizadas al transporte aprobado, y el salto de reflujo corregido arriba. La tanda combinada de cuentas alcanzó el límite de registros del servidor de pruebas; la suite móvil se repitió con otra base temporal y pasó 15/15 sin cambiar límites ni permisos de producto. No quedan fallos funcionales pendientes en las suites ejecutadas. Permanecen los avisos anteriores de bundle grande y sourcemaps de componentes UI.

Respaldo completo: `.data/backups/desktop-discovery-20261110` (ambas SQLite, medios/preparados y SHA256). Comparación final: **31 tablas idénticas en cada base y 58 archivos idénticos**. Cuenta, proyectos, publicaciones, relaciones, historial, mensajes y medios del ensayo intactos. Pruebas de escritura limitadas a copias temporales. Frontend servido en `http://127.0.0.1:4186/discovery` con la compilación final, sin resetear ni reiniciar el ensayo. Logs: `.data/desktop-discovery-build.log`, `desktop-discovery-unit.log`, `desktop-discovery-reflow.log`, `desktop-discovery-stabilization.log`, y las tandas de regresión/layout/shared de igual prefijo. Las capturas enlazadas corresponden a la compilación corregida.

## 19. Comentarios de escritorio: referencia visual, likes y respuestas — 10 de noviembre de 2026

Esta entrega sustituye la lista con separadores y el formulario grande por una conversación continua: fondo gris oscuro uniforme, avatar público del autor, nombre, texto, fecha real, Reply y corazón con contador. El compositor fijo incluye el avatar de la sesión, campo redondeado que crece al escribir y envío circular; Enter envía, Shift+Enter permite otra línea y la composición de texto no envía prematuramente. El encabezado muestra Comments y el contador real; el contexto de la publicación permanece accesible sin ocupar una segunda fila visual. Las flechas se ubican sobre la columna de acciones y ya no muestran el índice/total. Se conserva el anuncio de posición para lectores de pantalla.

Los likes y las respuestas son funcionales y persistentes, solicitados explícitamente después del alcance de la sección 18. No hay contadores inventados. Los avatares proceden de las cuentas/perfiles existentes, con fallback local si faltan o fallan. Se reutiliza el color de acento de Nebula. Móvil conserva su presentación anterior; su listado compatible sigue mostrando todos los comentarios, incluidas las respuestas, sin introducir la interfaz nueva de escritorio.

Contrato local aditivo:
- `GET /api/publications/:id/comments` conserva listado plano y cursor; añade `picture`, `likes`, `liked` y `replyCount`, sin exponer emails ni IDs de cuentas. `?threaded=1` lista raíces; `?parent=:commentId` lista respuestas; ambos conservan paginación de 30 y verifican acceso a la publicación.
- `PUT /api/publications/:id/comments/:commentId/like` recibe `{enabled:boolean}`. La sesión determina al actor; la clave `(comment, account)` evita duplicados y no permite manipular la reacción ajena. Conserva CSRF, publicación visible/publicada y limitación de frecuencia.
- `POST` de comentarios admite `parentId` opcional, validado contra la misma publicación. Las respuestas se agrupan bajo la raíz, con un nivel visual. Se insertan comentario y relación dentro de una transacción. Los contadores incluyen respuestas reales.
- Dos tablas auxiliares creadas idempotentemente: `comment_likes` y `comment_replies`. No se reescriben comentarios ni tablas anteriores. La eliminación conserva los permisos del autor/propietario; si se borra una raíz, sus respuestas pasan a comentarios independientes, conservando el texto de otros usuarios. Se limpian las relaciones y likes del comentario eliminado.
- Reset de presentación compatible con snapshots anteriores sin estas tablas: limpia ambas tablas auxiliares para impedir que queden reacciones asociadas a IDs reutilizados. No se ejecuta reset en el ensayo del usuario.

El borrador y el destinatario de respuesta viven en memoria por publicación e identidad. Cambiar de publicación o cerrar la columna no los envía ni los pierde; cambiar de cuenta los descarta. Errores conservan el texto y muestran reintento mediante la acción correspondiente. Likes, lectura y envío mantienen el mismo elemento audiovisual y su reproducción. Polling de comentarios sigue en 15 segundos; no se añaden notificaciones, menciones ni respuestas multinivel.

Archivos de esta entrega: `artifacts/nebula/src/features/discovery/desktop-comments.tsx` (nuevo), `desktop.css`, `social.tsx`, `artifacts/nebula/src/pages/discovery.tsx`, `server/app.ts`, `server/presentation.ts`, `server/comment-threads.test.mjs` (nuevo) y `tests-presentation/comment-reference.spec.ts` (nuevo). El resto de cambios de la rama corresponde a entregas anteriores y se conserva.

Verificación: **65 pruebas de navegador aprobadas**, con 7 casos exclusivos de escritorio omitidos en la ejecución móvil; **33 API** (incluidos concurrencia/idempotencia, permisos, paginación, reinicio, borrado de raíz y reset desde snapshot antiguo); **81 unitarias**, TypeScript y build aprobados. La repetición final de los dos casos nuevos aprobó likes/respuestas persistentes, reproducción continua, recuperación de borradores, aislamiento de identidad, errores y reducción del compositor al vaciarlo. Capturas verificadas en 983 y 1440 px; la regresión de escritorio cubre 768/932/1024/1280/1440 y altura de 600 px. Móvil conserva su layout y las regresiones de reproducción/remix/refresh/guardados pasan. No quedan fallos en las suites ejecutadas; permanecen los avisos de build anteriores sobre bundle y sourcemaps. Chrome emulado no sustituye una comprobación en teléfono físico.

Activación: frontend y servidor actualizados en `http://127.0.0.1:4186/discovery`; HTTP 200 y contrato enriquecido de comentarios comprobados con lecturas. Respaldo `.data/backups/comments-reference-20261110`. Comparación tras reinicio: **31 tablas anteriores idénticas**, ambas tablas nuevas vacías; **31 tablas idénticas en initial.sqlite** y **58 archivos con SHA256 idéntico**. No se modificó ninguna cuenta, proyecto, publicación, comentario o medio del ensayo. Logs `.data/comments-reference-{api,browser,unit,types,build,final}.log`; detalle de conservación en `verification.json` del respaldo.

Capturas de la copia temporal de prueba: [Comentarios a 1440 px](images/discovery-comments-reference-1440.png), [Comentarios a 983 px](images/discovery-comments-reference-983.png), [Sin comentarios](images/discovery-comments-reference-closed.png). Los comentarios de prueba que aparecen en ellas no se insertaron en el ensayo del usuario.

## 20. Corazón para likes de Discovery — 10 de noviembre de 2026

La acción de estrella se presenta ahora como corazón en escritorio y móvil, con nombre accesible **Like**, estado marcado/relleno y anuncio **Like updated**. Conserva contadores, permisos, endpoint `star` y datos `starred` existentes; no convierte ni elimina reacciones anteriores. Se actualizan los selectores de pruebas al nuevo nombre accesible.

## 21. Discovery Share: chats, Following y enlaces externos — 10 de noviembre de 2026

Send pasa a **Share**. El diálogo usa la referencia de Instagram: modal centrado de escritorio, hoja inferior móvil con safe-area, título centrado, cierre, búsqueda, cuadrícula de avatares y fila inferior de opciones externas. Conserva el estilo de Nebula. All, Chats y Following filtran destinatarios reales; cada persona aparece una vez y, si tiene varios hilos aceptados, se utiliza el más recientemente activo, identificado por su contexto. No se inventan contactos: CHILZ tiene ahora el contacto aceptado y seguimiento mutuo con gramz, añadidos por la ampliación documentada abajo. Los estados vacíos siguen disponibles para personajes sin relaciones. Los otros personajes conservan sus relaciones existentes.

Se pueden seleccionar hasta diez personas y añadir un mensaje. Un chat aceptado recibe un mensaje privado; una persona seguida sin hilo recibe una solicitud general pendiente. Una solicitud pendiente o rechazada no permite nuevos mensajes ni se acepta automáticamente por seguir a alguien. Los errores se muestran por destinatario; un reintento omite los envíos confirmados y reutiliza la identidad de operación del mensaje fallido. Los envíos y notificaciones usan la transacción e idempotencia actuales. El cierre se bloquea durante el envío; cada operación tiene un límite de espera de 30 segundos y puede reintentarse sin duplicación. El cambio de cuenta elimina selección/texto y cancela el resto del lote. No se cambian propuestas, acuerdos, archivos privados ni admisión de colaboraciones.

Contrato: `GET /api/messages/share-targets?source=all|chats|following&q=...&offset=0` devuelve grupos de 24 personas, `nextCursor`, identidad pública, destino tipado, contexto y disponibilidad. Busca en todos los destinatarios elegibles antes de paginar, con normalización de acentos. Solo artistas autenticados; remitente derivado de la sesión. `POST /api/messages/share` recibe `publicationId`, `recipientId`, `destination` opcional `{kind,id}`, `note` y `operationId`. Valida publicación publicada, identidad Artist, pertenencia al hilo, contraparte, admisión o relación Follow; genera el enlace desde el ID validado en el servidor, sin aceptar URLs del cliente. La respuesta identifica el hilo y si quedó accepted o pending. No hay tablas ni migraciones nuevas.

El contenido compartido se guarda en el texto del mensaje con título y ruta interna canónica. Los transcripts de mensajes y colaboraciones convierten únicamente rutas completas `/discovery?post=post-ID` en **Open shared publication**; no interpretan HTML ni URLs arbitrarias. El destinatario abre la publicación mediante su control de acceso vigente. Retirar una publicación no otorga acceso desde su mensaje histórico.

Copy link, WhatsApp, Telegram, Email y X abren sus mecanismos de enlace/composición; More usa la hoja nativa solo cuando el navegador la soporta. No se afirma entrega externa. Fuentes de formatos: [WhatsApp](https://faq.whatsapp.com/5913398998672934), [Telegram](https://core.telegram.org/widgets/share), [X](https://publish.x.com/). No se configura una integración de Messenger ni se añaden controles ficticios. Los enlaces de localhost solo funcionan en la computadora del ensayo; necesitarán una URL alojada para destinatarios externos. Visitantes e Investor pueden compartir enlaces externos, conservando la restricción actual de mensajería interna a Artist.

Los destinatarios se refrescan por foco, polling de 10 segundos y cambios de Follow entre pestañas; las consultas están separadas por identidad y cancelan búsquedas anteriores. Abrir Share pausa el medio y conserva publicación, posición y foco de regreso. El formulario y las opciones externas son accesibles por teclado, con controles táctiles de al menos 44 px. No se modifican navegación, portadas, composición de remixes ni el layout del feed.

Archivos principales de esta entrega: `features/discovery/share-panel.tsx` y `.css`, `pages/discovery.tsx`, `features/messages/shared.tsx`, `features/following/index.tsx`, `server/publication-sharing.ts`, `server/messages.ts` y la conexión en `server/app.ts`. Nuevas pruebas: `server/publication-sharing.test.mjs` y `tests-presentation/discovery-share.spec.ts`; las pruebas anteriores de Discovery actualizan su selector de Send a Share. No se reemplazan los componentes de mensajes ni se modifican acuerdos o archivos compartidos.

Verificación final: **50 casos de navegador aprobados** (44 de Discovery/Share/reproducción/ventana/guardados/comentarios y 6 de mensajería), 2 casos de comentarios exclusivos de escritorio omitidos en móvil; **40 API**, **81 unitarias**, TypeScript y build aprobados. La tanda inicial detectó el nombre accesible duplicado del icono X, corregido ocultando el icono decorativo al lector de pantalla; se corrigió también la espera de metadatos del video en la prueba. La repetición final de Share pasó 4/4, sin debilitar la comprobación de elemento, pausa o posición. Se verificaron avatares reales, búsqueda, fallback del portapapeles, destinos externos, Escape/foco, cambio de identidad, selección múltiple, respuesta perdida después del commit y reintento sin mensajes/notificaciones duplicados. La API cubre autorización y rollback completo si falla la notificación.

Revisión visual en 320, 390, 767, 983 y 1440 px, más horizontal de 767 × 390. Capturas de datos temporales: [Share escritorio](images/discovery-share-desktop.png) y [Share móvil](images/discovery-share-mobile.png). Chrome emulado no sustituye un dispositivo físico. Los enlaces externos se verificaron por su destino y codificación; no se enviaron mensajes ni se publicaron contenidos en servicios externos. Persisten los avisos conocidos de bundle y sourcemaps del build.

Activación: servidor y frontend actualizados en `http://127.0.0.1:4186/discovery`, HTTP 200; acceso anónimo a destinatarios devuelve 401. Respaldo completo `.data/backups/share-20261110`. Comparación tras reinicio: 33 tablas del ensayo, idénticas excepto las tablas operativas `feed_snapshots` y `rate_limits`; las 31 tablas del snapshot inicial permanecen idénticas. **58 archivos con SHA256 idéntico**. Sin cambios en cuentas, proyectos, publicaciones, relaciones, mensajes, historial o medios; sin tablas nuevas en esta entrega. Resultado detallado en `verification.json` del respaldo. Logs `.data/share-{api,unit,messaging,regressions,final,build}.log`. No se ejecutó reset ni preparación de escenario sobre el ensayo.


## 22. gramz: catálogo, clips y contacto con CHILZ

Se amplía **el gramz existente (Artist 32)**, sin crear otra cuenta. CHILZ (21) sigue como personaje principal. La foto procede del perfil de Spotify y la biografía evita estadísticas, trayectoria o géneros no verificados. Los enlaces públicos incluyen Spotify, YouTube, TikTok y SyncUp Team. Se conservan nombre de usuario, credenciales y preferencias privadas.

El escenario incorpora **11 proyectos de catálogo / 11 canciones y 8 clips reproducibles**. No Pop y No Regrets proceden de Spotify; nueve referencias adicionales son audio oficial de SyncUp Team con participación explícita de Gramz. Se muestran con el diseño compartido de CHILZ y preview silencioso; la fecha de YouTube se identifica como subida. Los ocho videos mantienen su audio original. Slow Rockstar usa un único proyecto para sus Shorts. Hypnotized y Náufrago quedan como publicaciones independientes. No Pop no se duplica por aparecer también en YouTube. **LUNA se excluye de la importación y permanece intacta.**

Home presenta las dos ofertas aprobadas: No Pop / Feature / 10% de regalías y No Regrets / Mix / USD 150. Son **Demo opportunity**, sin vencimiento, vinculadas a sus canciones y con términos explícitos de simulación. No hay financiación inventada ni descarga de audio de catálogo. Para ensayar una propuesta se puede adjuntar una aportación de prueba; no se promete una referencia musical ausente.

gramz ↔ CHILZ tienen seguimiento mutuo y una conversación general aceptada inicialmente vacía. Aparecen como contactos en Messages y Share. No se inventaron mensajes previos. La repetición de la preparación no duplica contenido, relaciones, avisos ni chats.

Contrato compatible: `/api/presentation` conserva `catalog` de CHILZ y añade `catalogs`; las consultas seleccionan por artista o proyecto. La procedencia admite Spotify y YouTube mediante `sourcePlatform` y `sourceId`, sin fabricar IDs de Spotify. No se añadieron endpoints, tablas, dependencias de aplicación ni integración permanente externa. Los datos de proyectos, canciones, ofertas y publicaciones siguen siendo los registros normales. `presentation/gramz-catalog.json` conserva las fuentes, fechas, archivos y hashes; `scripts/presentation-gramz.mjs` realiza la importación aditiva y transaccional con recibo `gramz-import`.

Inventario, exclusiones, contratos y procedimiento: [gramz — informe de importación](gramz-import-verification.md). Los archivos audiovisuales están en `presentation/assets/gramz`, y la fotografía/portadas en `artifacts/nebula/public/presentation/gramz`. El escenario portátil se actualiza por separado, manteniendo sus cuentas ficticias y sin incluir sesiones o credenciales reales.


Verificación cerrada: **52 casos distintos de navegador aprobados** al completar la repetición final (la tanda amplia aprobó 49/52; dos expectativas antiguas de Play se actualizaron para admitir el estado Pause de la reproducción automática, y una navegación móvil interrumpida por `ERR_NETWORK_IO_SUSPENDED` se repitió sin error). La repetición final aprobó 6/6. Se mantuvieron las comprobaciones de audio exclusivo, publicación nueva visible y borradores privados ocultos. Además: **32 API, 81 unitarias, 8 de importación/fixture y 14 recorridos de aceptación integral** aprobados. TypeScript, build de producción y compilación final del servidor aprobados; persisten los avisos conocidos de tamaño de bundle/sourcemaps.

Se verificaron perfil y retorno en 390, 768, 1024 y 1440 px mediante las regresiones compartidas; catálogo, búsqueda y filtros, Following, Share privado y clips en escritorio/móvil. Los ocho clips reprodujeron imagen y sonido, con reproducción exclusiva y comentarios sin interrumpir el audio. FFmpeg/FFprobe confirmó pistas de audio no silenciosas, proporción conservada y diferencia de duración de 0.0 s respecto de cada original. Se verificaron los 28 hashes de imágenes y recursos nuevos.

Durante el chequeo del servidor activo se añadió soporte estático `image/jpeg` para `.jpg`/`.jpeg` en `server/app.ts`. Las portadas canónicas embebidas ya se mostraban, pero sus rutas locales de referencia devolvían 404; se comprobó HTTP 200 para la fotografía y las 21 portadas de ambos catálogos después de la corrección. No es un endpoint nuevo ni afecta permisos de `/media`.

Activación completada en **http://127.0.0.1:4186/artist/32**, con CHILZ aún como principal. Respaldo inicial `.data/backups/gramz-20261110`; respaldo inmediato de activación en su subdirectorio `activation`. Se actualizó el ensayo actual y el snapshot inicial de forma separada, sin reset. La comparación posterior al reinicio confirma **12 cuentas idénticas, 21 proyectos previos idénticos, todos los registros históricos conservados y 58 archivos anteriores con SHA256 idéntico**. Solo cambian los campos públicos autorizados de gramz y su foto en el selector, además de las adiciones previstas: 11 proyectos/obras, 8 publicaciones, 16 medios, 2 ofertas, 2 relaciones, 2 avisos Follow y 1 conversación vacía. LUNA, su remix y el catálogo original de CHILZ son idénticos al respaldo. Una segunda importación devuelve `changed: false` en ambas bases. Informe mecánico: `.data/backups/gramz-20261110/activation/verification.json`.

Capturas: [perfil escritorio](images/gramz-profile-desktop.png), [perfil móvil](images/gramz-profile-mobile.png), [discografía escritorio](images/gramz-discography-desktop.png), [discografía móvil](images/gramz-discography-mobile.png), [Home con búsqueda y Following](images/gramz-home-desktop.png), [Discovery móvil](images/gramz-discovery-mobile.png) e [inventario visual de clips](images/gramz-clips-inventory.jpg). No quedan archivos pendientes para los ocho clips acordados. Permanecen los límites de referencia documentados: catálogo silencioso, fechas de subida de YouTube y dos clips independientes sin asociación de lanzamiento verificada.

## 23. Colaboración y Remix guiados; Forge como recorrido de demo — 10 de noviembre de 2026

La preparación de nuevas propuestas y Remix usan un espacio compartido inspirado en onboarding: contexto con portada/artista/canción, progreso de cuatro etapas, Back, Continue y Save & exit. Se muestra una etapa cada vez. En escritorio amplio, el contexto queda al lado; en móvil, arriba, con las acciones fijas sobre la navegación y el safe-area. La revisión final permite desplegar términos y adjuntos. La bandeja y la revisión del propietario conservan su diseño y servicios.

**Colaboración:** The opportunity → Your contribution → Preview your work → Review & send. La referencia se reproduce y descarga solo cuando existe; se conservan grabación de audio/video, carga, tomas preparadas compatibles, fragmento, encuadre, niveles, comparación y archivos adicionales. Mix/Master y oportunidades sin referencia admiten una entrega terminada. El envío real abre el hilo tras confirmación; guardar solo conserva un borrador privado. Para recuperarlo se vuelve a la misma oportunidad.

**Remix:** un nuevo original de audio destaca Remix with Forge, conservando Use Nebula editor y Create a video remix. Los originales de video siguen requiriendo video. Los borradores anteriores mantienen sus archivos y recorrido compatible. El editor local organiza fragmento, aportación, mezcla/encuadre y revisión; mantiene las tres combinaciones permitidas y el resultado privado.

**Forge workflow · Demo** representa el contexto que acompañaría al artista: original, fragmento y crédito. La transferencia y el regreso son simulados, con texto explícito. Visit Forge abre únicamente la URL facilitada. Ningún archivo ni credencial se transfiere a Forge o Antiq Central. La aportación de la revisión se graba/carga y se mezcla realmente mediante el motor local de Nebula; no se atribuye su creación a Forge. Los ejemplos preparados actuales son de video, por lo que no se reutilizan como una supuesta salida de audio de Forge. No se añaden presets ni capacidades externas no verificadas.

Estado de interfaz: paso y método en `sessionStorage`, clave versionada y separada por artista y borrador/oportunidad; fallback en memoria. Con almacenamiento bloqueado, una recarga pierde el paso visual, pero los borradores reales siguen disponibles. El editor conserva textos/tomas al cambiar de etapa, pausa la reproducción, bloquea cambios durante operaciones y libera dispositivos al salir. Se reutiliza un solo controlador de grabación en ambos recorridos. Conflictos de revisión de Remix conservan los cambios locales y permiten reabrir la versión guardada.

Adaptaciones de persistencia, **sin tablas, migraciones ni endpoints nuevos**: el JSON existente de borrador de propuesta admite `preparation.resultId` opcional, validado como archivo audiovisual adjunto. `null` indica mezcla invalidada, para no confundir un adjunto extra con el resultado al reabrir. Los borradores antiguos sin este campo conservan compatibilidad. También conserva `remixDraftId` / `publicationId` opcionales: guardar una propuesta basada en Remix reutiliza las comprobaciones de envío, permite solo el resultado final verificado y mantiene las pistas privadas inaccesibles al destinatario hasta el envío. No crea conversación ni notificación al guardar. La atribución se vuelve a validar al enviar.

La conexión real futura necesita contrato de autorización, permisos de archivos, apertura/retorno de Forge y reglas de revisión/atribución acordadas con Antiq Central. No se implementa en esta entrega. Detalle de archivos y contratos: [notas de implementación](guided-workspaces-verification.md).

Verificación: **28 casos distintos de navegador aprobados** en las suites seleccionadas: 6 de cierre audiovisual, 10 de preparación de colaboración y 12 del recorrido guiado. La repetición final incluye grabación con dispositivos simulados, permisos denegados/tardíos, cancelación y liberación de tracks; video original rechazando audio; las tres combinaciones de Remix; referencia larga; Mix sin referencia; mezcla invalidada con adjuntos preservados; guardado/recarga/envío y recepción privada; errores de red; revisión concurrente en dos pestañas; almacenamiento de sesión bloqueado, teclado y movimiento reducido. **39 pruebas API**, **81 unitarias**, TypeScript y compilación de producción aprobados. Son las suites pertinentes, no una nueva auditoría exhaustiva de toda la aplicación.

Los chequeos de privacidad confirman que guardar la propuesta del remix no da acceso al destinatario, y que enviarla comparte el resultado final y los adjuntos autorizados, manteniendo inaccesible la toma privada. Las comprobaciones de borradores antiguos, permisos revocados, conflictos y formatos permanecen en las regresiones API. Las pruebas usaron copias temporales, sin resetear el ensayo.

Límites: Forge sigue siendo una simulación de transferencia; no hay integración real con Antiq Central. Cámara/micrófono se comprobaron mediante dispositivos simulados de Chromium y fallos de permiso; falta validación física en iOS/Android. No se verificó con un lector de pantalla real; se comprobaron nombres, foco y teclado. Sigue el aviso previo de bundle de producción mayor de 500 kB. No se añadieron dependencias.

Logs de esta entrega: `.data/guided-regression-final.log` (24 casos iniciales), `.data/guided-refinement.log` (ajustes y prueba de almacenamiento), `.data/guided-final-browser.log` (12 casos finales), `.data/guided-visual-final.log` (repetición visual final), `.data/guided-api-final.log`, `.data/guided-unit.log`, `.data/guided-types.log` y `.data/guided-build.log`. La prueba con almacenamiento bloqueado se corrigió para recuperar el borrador mediante Resume draft tras recargar; no se exige que una preferencia de sesión sobreviva al bloqueo del almacenamiento.

Activación completada en **http://127.0.0.1:4186** con servidor y frontend nuevos, sin ejecutar reset ni preparación de escenario. HTTP 200 y bundle activo verificados. Respaldo completo `.data/backups/guided-20261110-173544/` y respaldo inmediato en `activation/`. Tras reiniciar: **32 tablas del ensayo idénticas**, con variación únicamente de `feed_snapshots` por su caducidad operativa; **31 tablas del snapshot inicial idénticas**; **74 archivos de medios/preparados con SHA256 idéntico**. Cuentas, preferencias, proyectos, publicaciones, relaciones, conversaciones, propuestas e historial existentes permanecen intactos. Comparación completa en `activation/verification.json` y `.data/guided-preservation.json`.

Revisión visual de 390, 768, 1024 y 1440 px, más altura reducida de 600 px. La repetición visual final aprobó 4/4: acciones visibles y avance de etapa situado por encima de la barra fija, guardado y envío funcionales. Capturas: [Colaboración escritorio](images/guided-collaboration-desktop.png), [Colaboración móvil](images/guided-collaboration-mobile.png), [Revisión escritorio](images/guided-review-desktop.png), [Revisión móvil](images/guided-review-mobile.png), [Forge escritorio](images/guided-forge-desktop.png), [Forge móvil](images/guided-forge-mobile.png). Son capturas del escenario temporal de prueba.


## Regreso contextual — 10 noviembre 2026

Los controles de regreso usan ahora la entrada anterior real de Nebula, con sus parámetros, en lugar de crear una navegación nueva hacia una sección fija. La implementación compartida está en `components/antiq/workspace.tsx` y `components/shell/return-history.ts`, integrada con `return-context.tsx` y `navigation-guard.ts`.

- `ReturnLink` es contextual por defecto. Sin origen conocido muestra **Go to…** hacia su sección de respaldo. Los enlaces explícitos **All messages**, **Your messages** y **Open original** declaran `contextual={false}` y no alteran el contexto como si fueran un regreso.
- El origen vive en `history.state.__nebulaOrigin`, versionado y separado por identidad y sesión de navegación. `sessionStorage` conserva únicamente una clave de ámbito (`nebula-return-scope-v1`); no guarda formularios, credenciales ni medios. Si se bloquea, se usa memoria y al recargar puede mostrarse el acceso de respaldo.
- Los reemplazos de URL y las rutas antiguas de Remix conservan el origen sin insertar la redirección como una página intermedia. Los cambios de cuenta y logout invalidan el ámbito anterior. Se conservan como máximo 100 entradas de origen.
- Atrás/Adelante del navegador siguen funcionando. La confirmación por cambios sin guardar se comparte con los enlaces y no se duplica al usar Back. Los pasos de onboarding, registro, colaboración y Remix mantienen su navegación interna.
- La búsqueda, filtros, pestañas, scroll y publicación activa siguen usando los mecanismos existentes de memoria de vista. La conservación del origen tras recarga no promete persistir archivos o formularios no guardados.

Sin endpoints, tablas, migraciones ni cambios de cuentas o contenido. Las pruebas usan servidores desechables en 4175 y 4177; nunca resetean el ensayo de 4186.

Verificación completada: **48 casos distintos de navegador aprobados** entre `return-context` (16), `navigation` (8), `return-navigation` (6), `guided-workspaces` (12) y `blobs` (6), en Chromium escritorio y móvil. La última tanda sobre el build final aprobó **14/14**. Una ejecución previa de la regresión audio→video tuvo `ECONNRESET` al cambiar de personaje en el servidor temporal; la repetición completa del caso pasó en ambos tamaños, sin debilitar sus expectativas. TypeScript (proyectos y UI), build de producción y `git diff --check` correctos. Continúan los avisos previos de sourcemaps en dos componentes UI y bundle mayor de 500 kB.

Activo en **localhost:4186**, bundle `index-D9VrTBnv.js`. Respaldo SQLite en línea y copias de medios: `.data/backups/return-navigation-20261110-190719/`. Comparación en `verification.json`: **62 tablas y 88 archivos no SQLite revisados, sin cambios**. No se ejecutó reset del ensayo ni se modificaron cuentas, proyectos, publicaciones, conversaciones o medios existentes. Las pruebas móviles son de Chromium emulado; no implican validación física en iOS/Android.

## Forge: audio final y creación de video — 10 noviembre 2026

Esta entrega reemplaza el recorrido anterior que mezclaba audio dentro de Nebula. Para originales de audio aparecen **Remix with Forge** y **Create a video remix**. Forge tiene cuatro pasos: Original → Open Forge → Review your version → Save your version. Se escucha el original completo y se compara con el resultado completo; no hay trimmer, grabación de audio, carga de aportación, niveles ni segundo render. Los originales de video siguen requiriendo video en Nebula, con fragmento de hasta 60 segundos, cámara/carga, encuadre, niveles y exportación adaptable existentes.

### Qué funciona y qué representa

- **Real:** lectura del original, copia verificada de un resultado registrado a un archivo privado propiedad del nuevo borrador, reproducción y comparación exclusivas, título/descripción, guardado con revisión, reapertura y propuesta por los servicios actuales. El vínculo de propuesta aparece cuando hay ofertas disponibles compatibles con el proyecto/canción y el artista no es el propietario.
- **Representación de presentación:** Open Forge abre dentro de Nebula el recorrido **Nebula → Forge → DAW → Nebula**. No ejecuta Forge, agentes ni DAW; no transfiere credenciales o archivos a servicios externos. Review your version recibe un archivo previamente preparado y verificado; no lo genera en ese momento. La interfaz evita etiquetas Demo repetidas y no declara conexiones, porcentajes ni transferencias reales.
- **Pendiente de integración:** contrato autenticado con Antiq Central; autorización explícita para entregar el original; resolución local de Forge/DAW; identidad del trabajo y callbacks firmados, revisión/atribución del resultado, políticas de retención y manejo de desconexiones. Nada de esto se simula como una operación confirmada de producción.

### Contrato y privacidad

`RemixDraft` incorpora la variante discriminada `workflow: 'finished-audio'`. `finalAudio` es null hasta recibir, y después `{version: 1, duration, receiptRevision}`. `contribution` es siempre null; `render` referencia el archivo final privado. Los campos históricos de settings se mantienen por compatibilidad de fuente/revisión, pero no recortan ni procesan este audio. No se guarda composición de video en esta variante. Los nuevos borradores de video se identifican como `workflow: 'video'`. Los JSON anteriores sin discriminador siguen siendo válidos.

Se reutilizan POST/PATCH `/api/remix-drafts` y POST `/api/presentation/contribution`, este último con `{purpose:'finished-audio', sourceId, draftId, revision}`. El servidor toma la identidad de sesión y solo resuelve registros del manifiesto `forge-results-v1` en `presentation_settings`. No admite rutas/URLs/archivos elegidos por el cliente para esta recepción. PATCH de audio final admite título y descripción; rechaza renderizado o sustitución de pistas por el cliente. Las subidas genéricas no pueden vincularse a un borrador de audio final.

Cada resultado comprueba relación con el original, disponibilidad de ambas publicaciones, permiso y revisión del original, SHA-256, contenedor y pista de audio mediante FFprobe; máximo **600 segundos / 100 MB**. La copia genera un ID nuevo y se vincula a `remix_private_media`; la fuente y la publicación de otro artista permanecen intactas. Inserción de metadatos, vinculación y revisión del borrador son transaccionales; un fallo elimina la copia y revierte los cambios. Se revalida sesión/revisión después de las operaciones asíncronas. Reintentos concurrentes o tras respuesta perdida reutilizan el mismo resultado; un guardado posterior provoca conflicto frente a una revisión antigua. Solo el archivo final puede compartirse con los participantes autorizados mediante propuesta.

Los borradores de audio del editor anterior se abren para escuchar y descargar sus archivos, sin conversión automática. **Remix with Forge** crea otra versión independiente. Los borradores de video conservan su editor y los datos previos.

### Resultados preparados

| Original | Resultado registrado | Tratamiento |
|---|---|---|
| luna (publicación 17) | luna - chilz remix (18) | Audio completo, ~175.29 s; copia sin recorte ni mezcla |
| Marea Alta (4) | Marea Alta — Inés Prado version (7) | Archivo final existente |
| Afterglow (1) | Afterglow — Inés Prado version (8) | Archivo final existente |
| Afterglow · rhythm sketch (15) | Resultado audiovisual de Inés (16) | Audio extraído previamente del MP4, sin remezclar |

Un original sin resultado registrado muestra **No version available yet**. Nunca se usa una canción ajena como sustituto.

`scripts/presentation-forge.py` instala de forma aditiva el manifiesto y los cuatro archivos preparados, tanto en el ensayo local y su baseline como en `presentation/seed/scene.sqlite`. Es idempotente, resuelve IDs multimedia por cada base, actualiza los hashes del fixture y no modifica cuentas, obras, proyectos, posts ni fuentes. Requiere FFmpeg/FFprobe y un respaldo previo. La extracción de Afterglow se realiza aquí, antes de la presentación, no al pulsar Open Forge. Las instalaciones nuevas continúan usando `scripts/presentation-seed.mjs` y el manifiesto portátil existente.

### Evidencia de esta entrega

68 pruebas principales aprobadas (34 de servidor/fixture y 34 de navegador), TypeScript y build correctos. Ver [reporte de verificación y capturas](forge-finished-verification.md) para resultados, preservación de datos, archivos modificados y límites. La versión se activó en 4186 sin resetear el escenario.

## Creación guiada de proyectos y publicaciones — 10 noviembre 2026

La creación conserva rutas y servicios. `/profile?create=project` organiza el formulario en Identity, Songs & story, Opportunities y Review; `/publish` y `/publish/:id` usan Media, Details, Project y Review. Las pestañas completadas permiten volver sin desmontar campos, referencias ni archivos. Las acciones permanecen visibles sobre la navegación móvil; la cabecera se reduce durante la creación del proyecto.

`CreationFrame` reutiliza Journey con estilos aislados; `useCreationSteps` mantiene únicamente la etapa en memoria, valida campos y devuelve el foco al dato pendiente, y pausa el medio al cambiar de etapa. Los datos no se persisten automáticamente por avanzar. Save & exit usa el guardado real existente: proyecto/publicación nuevos como borrador; una publicación ya pública conserva su estado al editarla. Review mantiene canciones, alcance de ofertas, compensación, visibilidad, financiación USD, vínculo a proyecto/canción y permiso de Remix. No se añaden tablas, endpoints o dependencias.

Las pruebas de `guided-creation.spec.ts` cubren audio/video, validación por etapas, conservación de campos, guardado/reapertura, error de servidor/reintento, publicación, proyecto con oportunidad por canción y borrador privado. La navegación contextual y el recorrido Remix mantienen sus pruebas existentes. Los tests usan bases temporales; no se resetea el ensayo activo ni se modifican sus cuentas, proyectos o medios.

Verificación final: 20 pruebas distintas aprobadas (8 de creación, 8 de navegación/retorno y 4 de publicación/privacidad), más repetición de las 4 de creación móvil tras compactar la cabecera. TypeScript y build correctos; siguen los avisos de bundle grande y sourcemaps de componentes existentes. Comparación SQLite activa/baseline sin cambios de datos; 78 archivos de medios/preparación con hashes idénticos. Respaldo local: `.data/backups/guided-creation-20261110-195929`.

## Product copy cleanup — 10 November 2026

The public interface now removes repeated demo labels and implementation instructions. Catalog controls retain their visual-only playback; this change does not add recordings. Actual media, Forge receipt/save operations, permissions and contracts are unchanged. Forge/DAW transfer remains simulated. Presentation controls remain at `/presentation` (also Cmd/Ctrl+Shift+P); More exposes the neutral **Mobile view** entry.

Imported catalog prose is cleaned only for exact known strings in the frontend presentation layer. Existing records, edited content, contractual requirements and submitted financial terms are preserved. YouTube years remain source-qualified, not represented as verified release dates. See [product-copy-verification.md](product-copy-verification.md) for the surface inventory, exceptions, backups and verification.

### New project format selection — 10 November 2026

New Project now offers **Album, EP, Tour and Music video**. Single is no longer offered for new projects. Existing Single records remain readable and editable without conversion or deletion. Music video retains the internal `Video` category so existing filtering, services and records remain compatible.

Only Album and EP expose the new-project tracklist and song-specific opportunity choices. Tour and Music video use the **Story** step instead of **Songs & story**. Changing away from a tracklist format clears a selected song scope and its reference; in-progress song fields are retained in memory if the artist switches back, but are never submitted with a non-tracklist format. Existing projects and publication uploads are not migrated or reset.

Implementation is scoped to `artifacts/nebula/src/pages/profile.tsx`. Regression coverage is in `tests-presentation/guided-creation.spec.ts`, including format switching, private save, scoped opportunities, existing Single compatibility and audio/video publication flows.

Verification: all 12 distinct guided-creation desktop/mobile cases passed after correcting a test locator and waiting for scheduled validation focus in the test. TypeScript and production build passed; only the existing bundle-size/sourcemap warnings remain. The updated frontend (`index-tF1ylJhm.js`) is served at localhost:4186. Backup: `.data/backups/project-formats-20261110-204021`; active/initial/portable data tables compare unchanged (excluding runtime session/rate-limit/feed-snapshot tables), as do all 186 media/prepared/presentation asset files in this snapshot.

### Project → linked publication verification — 10 November 2026

Focused audit of the current built frontend, with no production code changes. Added `tests-presentation/project-publication-link.spec.ts`: **10 cases passed**, Desktop Chrome and Chromium mobile emulation, in 2.9 minutes. Each Album, EP, Music video (`Video`) and Tour journey creates a new project through Create, then uploads and publishes both audio and video through the guided interface. Verified immediate project availability without refreshing, song selection/reset for Album/EP, back/continue preservation, private draft/save/reopen, one saved publication per submission, actual media playback, publication project/song IDs, Discovery → project/song → return, public access after publishing and no horizontal overflow.

A separate case on each viewport checks that a private project blocks public publication, the failed attempt preserves the form, the linked private draft and its media remain inaccessible to a visitor, and publishing the project permits publishing the same draft with the same media and song IDs. No failed assertions or browser errors remained.

All writes occurred in the temporary copied scenario on port 4177, which was removed when the test server stopped. The live app on 4186 was not modified. Active/initial/portable content tables compared unchanged before/after (runtime sessions, rate limits and feed snapshots excluded), and all 186 media/prepared/presentation asset hashes matched with no added files. Only the regression spec and this audit note were added; no new build or deployment was necessary. Screenshots are in `test-results-project-link/`.

## Financiación opcional y aportaciones de CHILZ — 10 de noviembre de 2026

Los proyectos nuevos comienzan con **Enable funding** desactivado. Al guardar se utiliza el contrato existente `goalAmount: 0`, `currency: "USD"`, `useOfFunds: []`; no se añaden tablas ni migraciones. Sin meta no aparecen la tarjeta financiera del proyecto ni importes/progreso vacíos en sus tarjetas. Para abrir la financiación se activa el control, se define una meta positiva, se distribuye el destino de fondos (conceptos y porcentajes que suman 100%) y se selecciona **Funding (Active)**. Draft permite preparar la financiación antes de publicarla.

Las metas, estados y repartos de proyectos anteriores se conservan. El editor carga sus valores existentes; las partidas se pueden añadir/quitar y editar. La API impide Funding/Funded con meta cero. Una vez recibidas aportaciones no se permite poner la meta a cero: se puede cerrar el proyecto conservando su historial. Las validaciones de USD, visibilidad pública y permisos Artist/Investor continúan vigentes. Para compatibilidad con clientes y registros anteriores, la API sigue aceptando metas positivas sin reparto; el nuevo formulario exige reparto completo cuando se activa financiación.

**Escenario aditivo:** `scripts/presentation-funding.mjs` incorpora un proyecto independiente **CHILZ · Next chapter** (EP), meta USD 5,000 y destino Production 60%, Mix & master 25%, Visuals 15%. Añade USD 750 de Elena Costa y USD 1,250 de Noah Bennett, ambos inversionistas existentes. El total recibido es USD 2,000 (40%, dos aportantes). Sus nombres e importes son públicos en este ejemplo y los movimientos aparecen en el historial privado correspondiente. No se alteran el catálogo CHILZ, LUNA, las cuentas, publicaciones ni aportaciones anteriores.

La instalación usa una transacción y una constancia `chilz-funding-v1` en `presentation_settings`; repetirla no duplica proyectos ni movimientos. El escenario portátil y el punto de reinicio incluyen el ejemplo. No ejecutar un reset para instalarlo en un ensayo existente: detener el servidor, respaldar e instalar de forma aditiva sobre las bases explícitas.

**Alcance real:** las aportaciones son registros persistidos de presentación, con estado interno `preview`. No hay cobro, liquidación bancaria ni acuerdo financiero real; la interfaz utiliza el historial normal sin etiquetas de simulación. Estas limitaciones se documentan aquí, no mediante explicaciones repetidas en el producto.

Verificación de esta entrega: 82 pruebas unitarias; 26 pruebas API (incluyendo cuentas, historial, privacidad, Home y publicación); 9 pruebas del escenario portátil; 12 casos de creación guiada y 10 de proyecto → audio/video vinculado en escritorio/móvil; 6 casos específicos de financiación opcional, historial CHILZ y edición compatible con proyectos anteriores. TypeScript y build de producción aprobados. Las primeras ejecuciones detectaron configuración faltante de FFmpeg y errores en dos helpers de prueba (rol y ruta de presentación); se corrigieron y repitieron las suites afectadas sin relajar las validaciones. Vite conserva avisos no bloqueantes de sourcemaps de Radix y tamaño del bundle.

Activación: `localhost:4186`. Comparación antes/después: los 32 proyectos y dos aportaciones anteriores permanecen idénticos; cuentas, perfiles, publicaciones, colaboraciones, mensajes, relaciones y las demás tablas no fueron modificados por el instalador. Se conservaron los hashes de los 70 archivos en el directorio activo de medios. Solo se añadieron un proyecto, dos aportaciones, sus preferencias de visibilidad y la constancia de instalación, también al escenario inicial y portátil. Respaldo local en `.data/backups/optional-funding-2026-11-11T03-08-17-736Z/`. Capturas de referencia en `docs/images/optional-funding/`.

### Música dentro de los proyectos de financiación

`CHILZ · Next chapter` incorpora las obras existentes **luna - chilz remix**, **Brain** y **Transition**. LUNA reproduce el archivo real completo y conserva créditos, comparación y acceso al original. Brain y Transition reutilizan los transportes visuales y duraciones del catálogo; no se les atribuye audio que no existe.

Se añade **LUNA · Next phase** de gramz, con la obra original de gramz & SANNFERNNA y su audio ya registrado. Es un proyecto nuevo de presentación alrededor de LUNA, con meta USD 3,000 y reparto Production 60% / Visuals 40%; el proyecto original de LUNA y el remix original de CHILZ siguen intactos. No se añadieron nuevas publicaciones a Discovery ni se copiaron archivos de audio.

El instalador aditivo `scripts/presentation-funding-music.mjs` vincula las obras existentes mediante `project_works`, sin editar las obras ni publicaciones originales. Tiene comprobación de propietario, transacción y recibo idempotente `funding-music-v1`. El detalle común reconoce LUNA por la obra vinculada y utiliza sus consultas de publicación autorizadas; las demás pistas reconocidas del catálogo usan el reproductor visual existente. Los proyectos genéricos mantienen su recorrido anterior. Sin endpoints, tablas, dependencias ni migraciones nuevos.

Verificado: 8 pruebas de navegador aprobadas en escritorio/móvil (reproducción real, exclusividad al usar un transporte visual, catálogo, propuestas, retorno y perfiles), 10 pruebas del escenario portátil, TypeScript y build. Activado en 4186. El instalador conserva las filas originales de obras, publicaciones, medios, aportaciones, cuentas y relaciones; añade cuatro vínculos de canciones y un proyecto. Respaldo: `.data/backups/funding-music-2026-11-11T03-25-06-122Z/`.

### Contributions received — project cards

Artist `/received` now uses cover-led cards, a compact totals strip and collapsible filters. Each card retains the private transaction list and project navigation, and shows the current project funding goal/progress when available. Filtered received totals are labeled separately from the lifetime funding progress. Artwork/status enrichment uses the existing identity-scoped project query; missing or removed projects retain their historical ledger without an operational project link. Investor `/pledges`, visibility controls and financial records are unchanged. No API, schema or seed changes.

Verification: production build and TypeScript; unit suite; isolated desktop/mobile Contributions layout and optional funding/privacy regressions. Live accounts/media are not test fixtures.

### Home recording fallbacks

Home preserves its existing server-provided previews and adds presentation-only fallbacks for catalog tracks and linked LUNA works. Funding projects resolve recordings through their existing work IDs and artist association, then obtain authorized media through the publication query. No publication is duplicated or reassigned. No Pop / No Regrets use the existing silent transport in a compact waveform-style presentation: its bars are visual placeholders, not measured audio data. LUNA and the CHILZ remix use real files and decoded waveforms. This adds no storage, endpoint or record changes.

### Home → project playback verification (2026-11-10)

Focused verification of the current built frontend: `tests-presentation/home-playback.spec.ts`, 4/4 cases passed in Desktop Chrome and Chromium mobile emulation. Verified real audio → real audio (including rapid switches), real audio ↔ silent catalog transport, catalog → catalog, Home → project and contextual Back. Tests retain references to detached media elements and confirm they are paused; entering a project does not autoplay a duplicate, starting its player leaves exactly one active media element, and returning to Home leaves both old players paused. Catalog transport also resets on return. Existing playback coordination and unmount cleanup already satisfy these flows; no runtime code or design change was required. All tests used an isolated temporary scene; no live account, publication, project or media mutation. Physical iOS/Android device testing was not performed.

### Project Music / Versions (2026-11-10)

The common project page now starts in **Music**, with compact song rows and one open detail at a time. `?song=` opens the named work; subsequent return navigation restores the selected tab/song and scroll through the existing per-account in-memory return context. An explicit new song link takes precedence over the saved view. The initial selection is the first song with an available opportunity, otherwise the first song. Refetching/closing an offer does not move the selection.

The new `features/project/music.tsx` reuses songs, offers, publication and community queries. Music resolves media by work ID and project owner, preferring an original audio recording over video for the same work, then an accessible opportunity reference, then a matching presentation catalog track. Catalog transports remain visual/silent; no media, duration or credit is invented for a normal user song. A remix that is itself a project's canonical work (LUNA – CHILZ remix) remains playable as that work, with immutable attribution. Other public remixes appear in **Versions**, with cover, artist and original credit. Their player mounts only when expanded; A/B comparison is a separate, on-demand disclosure. Video composition still uses AdaptiveVideo. Unassigned original posts remain in Music's Recordings list. If an exact reference media ID already has a song player, its publication row preserves the Discovery link without duplicating that player.

Project-specific compact offers show need, compensation and deliverable; full terms are disclosed. The repeated “COLLABORATIONS / Make it together.” copy is absent here. General opportunities appear in one separate block. Owners retain Add, Edit, Close and Review proposals; applicant routes are unchanged. Close is disabled while an editor is open so it cannot race an in-flight edit using an old revision. Empty non-owner opportunity sections are omitted. Financial modules, account roles and visibility rules are unchanged.

Queries include viewer identity. AudioPreview can receive an authorized waveform loader for the exact offer reference; this reuses the existing reference decoder and adds no endpoint. Switching songs/tabs pauses real players and visual catalog transports. No API, table, dependency, migration, seed change or persistent-content update was introduced. State restoration is within the current session, not cross-device synchronization.

See [verification and screenshots](project-music-versions-verification.md). The active 4186 frontend is served from the production build; tests run against disposable databases, never the active presentation account.

Validation completed: 30 distinct desktop/mobile browser cases across the relevant suites, 33 API cases, 82 unit cases, TypeScript and production build. Snapshots compare 32 tables/78 media files; only operational rate-limit records changed. No unresolved failure in the final targeted checks.
