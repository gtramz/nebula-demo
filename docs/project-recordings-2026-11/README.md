# Publicaciones y grabaciones de proyectos

La demo permite crear Singles y proyectos Music video con una canción, añadir varias canciones a EP y Album, reutilizar posts propios o subir audio directamente, y elegir la grabación principal de Home. La edición conserva el asistente existente y guarda los cambios de canciones junto con el proyecto.

## Matriz de comportamiento

| Flujo | Comportamiento |
| --- | --- |
| Publish audio or video | Proyecto opcional, canción existente o nueva; Single y Music video preseleccionan su única canción. Review conserva ambos vínculos. |
| Single | Una canción y una grabación de audio; borrador sin grabaciones permitido. |
| EP y Album | Hasta 100 canciones, orden manual y principal independiente del orden. Al menos un audio para publicar. |
| Music video | Una canción; funding requiere audio o demo. El videoclip terminado es opcional y se enlaza posteriormente. Sin funding puede publicarse con video. |
| Posts existentes | Búsqueda antes de paginar; posts de otros proyectos deshabilitados. Asociar no duplica el post ni su archivo. |
| Grabaciones directas | No crean posts de Discovery. Son privadas con el proyecto borrador y accesibles al publicar el proyecto. |
| Principal no disponible | Home muestra el estado sin reproducción; no elige otra pista silenciosamente. |
| Edición y recuperación | Retroceso conserva valores, cancelación protegida, carga cancelable, revisiones y operaciones idempotentes. Reload saved songs pide confirmación antes de descartar cambios locales. |

Un post público puede asociarse a un proyecto borrador: el público ve el post, pero no recibe detalles privados del proyecto ni de la canción. Los posts borradores o retirados no se exponen por incluirlos en un proyecto público. Desvincular una grabación conserva el post, su archivo y sus comentarios.

Los posts adicionales de una misma canción no reemplazan automáticamente su grabación principal. Una canción puede conservar una grabación de audio y una de video; Single y Music video no admiten una segunda canción. Tour mantiene su flujo anterior.

## Contratos y almacenamiento

- `Tracklist` añade `primaryRecordingId` opcional y `songs[].recordings`. Cada grabación tiene ID estable, `mediaId`, `publicationId` nullable, revisión del post cuando corresponda, disponibilidad y medio autorizado.
- `createProject` acepta canciones, grabaciones, principal e `operationId`. `updateProject` puede guardar `tracklist` con su revisión dentro de la misma transacción que los detalles del proyecto.
- `PUT /api/projects/:id/songs` conserva el contrato de revisiones y operaciones; admite grabaciones y selección principal.
- `POST/PATCH /api/publications` admite `newSong` con título, descripción y `tracklistRevision`; crear la canción y guardar el post es una única operación reintentable.
- `GET /api/publications?mine=1&q=…` filtra títulos antes de paginar. La asociación canónica de un post sigue siendo un único `projectId` y su `workId` opcional.
- Home añade `previewSelection` para distinguir una elección explícita no disponible del comportamiento histórico. Waveform y reproducción utilizan el mismo medio seleccionado.
- Migración aditiva: `project_recordings` y `project_recording_settings`. No transforma registros históricos. Permisos de medios y detección de archivos utilizados incluyen las grabaciones directas.

Una modificación concurrente de un post asociado cambia la revisión de la lista. Los conflictos devuelven 409 y no sobrescriben el borrador local. Los controles de propiedad, Remix e historial de oportunidades permanecen vigentes.

## Preservación y respaldo

Referencia inicial: `454398a9f25bafe5f0b941a59767b7476bc099d4`, rama `codex/handoff-preserve-playback`.

Respaldo local previo: `.data/project-tracks-before-20261111/`, con copia consistente de SQLite mediante su API de backup, diff inicial, referencia Git, hashes y asociaciones de los posts 17 y 18. Los tests utilizan bases temporales; no se llama a reset o prepare sobre la demo de ensayo.

Los hashes de las dos portadas, el manifiesto, `feed-scroll.ts` y `media-player.tsx` permanecen iguales. También se comparan los datos completos y propietarios de los dos posts de Luna antes y después. Las pruebas originales de pausa y scroll no se modifican.

## Incidencias y límites

La primera pasada de servidor tuvo 34 fallos porque sus fixtures publicaban proyectos sin grabaciones o esperaban que un post público no pudiera enlazarse a un proyecto borrador. Se adaptaron esos fixtures con archivos reales usando las APIs normales; la validación nueva mantiene pruebas directas de rechazo. No se clasifican estos fallos como defectos preexistentes de la aplicación.

La prueba de Album detectó un defecto nuevo al reordenar pistas: los reproductores podían perder su estado de disponibilidad. Se corrigió con identidades estables y actualizaciones funcionales. También se corrigieron selectores de pruebas que buscaban controles ocultos o etiquetas de select en lugar del rol accesible.

El build mantiene la advertencia existente de bundle mayor a 500 kB. La validación móvil de esta entrega se limita a las regresiones de reproducción, comentarios, controles y scroll. Los tres fallos históricos de Discovery documentados en el [handoff anterior](../handoff-2026-11/validation.md) no forman parte de la suite de flujos de esta entrega y no se presentan como corregidos.

## Verificaciones de servidor y build

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Build y tipos | Correctos | [Build](evidence/build.txt) |
| Suite completa de servidor | 111 de 111 | [Servidor](evidence/server-all-final.txt) |
| Contratos de grabaciones ampliados | 7 de 7; incluidos video sin funding y rechazo de video sin audio para funding | [Contratos](evidence/recordings-contracts.txt) |
| Pruebas unitarias | 82 de 82 en 13 archivos | [Unitarias](evidence/unit.txt) |
| Datos Luna y seed | 5 de 5 | [Datos protegidos](evidence/protected-data.txt) |
| Archivos protegidos | 5 hashes iguales al estado inicial | [Hashes](evidence/protected-hashes.json) |

Comandos reproducibles: `pnpm build`, `pnpm test`, `node --test server/*.test.mjs`, `node --test scripts/presentation-luna.test.mjs scripts/presentation-seed.test.mjs`. Los servidores de prueba usan bases y archivos temporales.

## Validación de los flujos

| Flujo | Evidencia de verificación |
| --- | --- |
| Audio y video independientes y enlazados | Creación guiada, edición, borrador privado, publicación, Discovery y regreso desde proyecto. |
| Single | Un audio reproducible; segunda canción bloqueada; retroceso pausa el medio; respuesta perdida y doble clic no duplican el proyecto. |
| EP / Album | Varias canciones, orden y principal independientes; cambio guardado visible en la respuesta de Home y en su ficha. |
| Music video | Funding con demo de audio; video posterior enlazado a la misma canción. Servidor rechaza funding solo con video y acepta video sin funding. |
| Posts y cargas directas | Reutilización de IDs, búsquedas y 21 resultados paginados; asociación ajena deshabilitada; carga cancelada recuperable. Las cargas directas no crean publicaciones. |
| Privacidad y disponibilidad | Proyecto borrador oculto detrás de post público; post borrador o retirado privado; principal retirado no sustituido; archivo no disponible rechazado. |
| Edición y conflictos | Validación, retroceso, cancelación y reintento en navegador; revisiones concurrentes y rollback atómico en servidor. |
| Compatibilidad | Edición incidental de Single histórico, cambio de formato sin pérdida y Tour conservado. |

Capturas revisadas: [selección principal](screenshots/album-principal.png), [resultado en Home](screenshots/home-principal.png) y [post reutilizado](screenshots/post-picker.png).

Se verificaron **23 casos distintos de flujos en escritorio**, en estas ejecuciones:

- [Album y Music video, audio y video de extremo a extremo](evidence/link-smoke.txt): 2 aprobados.
- [Creación, edición, publicaciones y grabaciones](evidence/remaining-flows-final.txt): 20 aprobados y 1 fallo de sincronización del test de Tour. El test intentaba avanzar mientras todavía cargaba las canciones y comprobaba contenido Review oculto; se corrigió para esperar la carga y el encabezado visible.
- [Repetición de Tour](evidence/tour-recheck.txt): 1 aprobado, sin cambios adicionales en la aplicación.

Los archivos ejecutados fueron `project-recordings.spec.ts`, `project-publication-link.spec.ts`, `guided-creation.spec.ts` y `handoff-forms.spec.ts`, con `--config playwright.presentation.config.ts --project desktop --reporter=line`. La repetición puntual usó `--grep 'Tour:'`. Se conserva el log fallido original; estos resultados no representan la ejecución de toda la suite histórica de navegador.

Las pruebas originales de Discovery terminaron con **10 aprobadas y 2 omisiones intencionales**: swipe se ejecuta solo en móvil y trackpad solo en escritorio. Incluyen pausa manual, indicador, comentarios, seek, volumen, teclado, un único medio reproduciendo y navegación sin saltos ni retrocesos. [Log completo](evidence/playback-scroll-final.txt).

Comando: `pnpm exec playwright test --config playwright.presentation.config.ts tests-presentation/discovery-tap.spec.ts tests-presentation/discovery-scroll-regression.spec.ts --reporter=line`.

## Demo local actualizada

Se reinició únicamente el proceso del servidor con `PORT=4187 node scripts/presentation.mjs start`, usando la base existente. Antes se hizo otro backup consistente: `.data/project-tracks-before-20261111/before-runtime-update.sqlite`. No se ejecutaron `prepare`, `reset` ni migraciones de contenido histórico sobre la demo.

[Escritorio](http://127.0.0.1:4187/explore) y [móvil](http://localhost:4188/presentation/mobile) respondieron HTTP 200. La [verificación posterior](evidence/live-verification.json) comprueba el contrato nuevo, igualdad de datos completos de los posts 17/18 y hashes de las dos portadas descargadas del servidor. Se conservaron los puertos, el proxy móvil y las sesiones existentes.

## Commits

| Grupo | Commit |
| --- | --- |
| Contratos, almacenamiento, permisos y selección principal | `728e95f49bd5c3c461159cfdd3fafa1917542662` |
| Flujos, selección de posts y reproducción de proyectos | `5e9581463f1e76300877687e5893f3802eb48aa5` |
| Pruebas de contratos, privacidad, revisiones y flujos | `332374f2b9400ff125e2987716865c774da560f8` |
