# Ventanas con el estilo de Share

Base: `ae5ce923e06044ff55c9ab2bbccaa5de1477c553`. Se introduce `ShareSurface` / `ShareOverlay`, sobre el diálogo accesible existente de Radix: centrado en escritorio, hoja inferior en móvil, fondo #212429, esquinas de 24 px, máximo 88dvh y ajuste al viewport visual cuando aparece el teclado. Cada flujo conserva sus consultas, acciones y permisos.

| Ventana | Cambio y conservación |
|---|---|
| Discovery: Detalles, original, comparación e inicio de sesión | Contenedor compartido; mismos textos, créditos, enlaces y reproductores |
| Comentarios | Modal que no redimensiona el feed. Hilos, respuestas, likes, borradores por publicación/cuenta, paginación, errores y eliminación conservados |
| Filtros de Home | Modal con encabezado y acciones separados del contenido; selección provisional, limpiar/aplicar y estado de búsqueda conservados |
| Seguidores / seguidos | Misma lista, paginación, follow y navegación dentro del contenedor común |
| Notificaciones | Modal en lugar de posición anclada a la campana; no leídas, historial, guardas de formularios y acciones de lectura conservadas |
| Julio | Modal común; sigue siendo la simulación acordada, sin iniciar llamadas ni chat |
| Ficha de artista | Se abre por clic o teclado, con nombre accesible y cierre explícito. El hover no dispara un modal. Perfil y seguimiento conservados |
| Aportación al proyecto | Misma simulación, campos y validaciones; cierre bloqueado durante el guardado, recuperación tras error y destino de recibo conservados |
| Share / vista rápida de proyecto | Conservan su presentación y contenido actuales, incluidos envío y View full project |

Los menús pequeños, selectores, navegación y disposición de Mensajes conservan su función. Las confirmaciones nativas de cambios sin guardar siguen activas; su migración se identificó como etapa aparte en la auditoría.

## Reproducción y scroll

Los comentarios mantienen la reproducción de escritorio y la pausa de móvil. Una pausa manual previa se conserva al cerrar. La publicación del modal queda fijada por ID, y el feed no navega detrás de la ventana. Para cambiar de pieza se cierra el modal; los borradores permanecen asociados a su publicación. No se añadió ningún reproductor.

Las otras ventanas de Discovery mantienen su pausa temporal y reanudación. Notificaciones y Julio mantienen las protecciones existentes para grabación/renderizado. Escape, overlay y X devuelven el foco, salvo las operaciones que bloquean el cierre mientras están pendientes.

## Protección y comprobaciones

Respaldo consistente de SQLite en `.data/share-dialogs/before.sqlite`. Las pruebas se ejecutan sobre copias desechables en 4177; no restablecen los localhost de ensayo 4187/4188. Se compara el inventario de hashes, todas las publicaciones y las asociaciones de grabaciones contra ese respaldo. La página contenedora de Discovery cambia intencionadamente para alojar los modales; los archivos de reproducción, likes, scroll, imágenes y tarjetas de Home se conservan.

La validación cubre Chrome de escritorio y emulación móvil; el teclado se comprueba con eventos del viewport visual, no con un dispositivo físico. Los resultados finales y las capturas se adjuntan junto a este informe. No se afirma que toda la suite del repositorio haya sido ejecutada.

## Ejecuciones

- `pnpm build`: tipos, UI y servidor correctos. Persisten los avisos previos de sourcemaps y tamaño del bundle. [Salida](build.txt).
- `pnpm exec playwright test --config playwright.presentation.config.ts share-surfaces comment-reference discovery-share --output .data/share-dialogs/results-final --reporter=line`: **21 aprobadas, 3 omitidas** por plataforma. Incluye paginación de comentarios, errores recuperables, guardas de aportación, foco, teclados y Share. [Salida](final-dialogs.txt).
- La [ejecución previa](dialog-tests.txt) de `discovery-project-preview` aprobó sus **8 casos** en escritorio y móvil, incluidos cierre, pausa manual, destino, permisos, oportunidades y portadas ausentes. No cambió código de producto después de esa ejecución.

Incidencias durante la validación: una prueba de borradores abría comentarios antes de que terminara el cambio de publicación; ahora espera la pieza correcta. Una prueba móvil de Share coincidió con la sustitución de `index.html` durante el build; se repitió contra la compilación estable. Ambas pasaron en la ejecución final. La prueba de congelación del vinilo capturaba el ángulo un frame antes de que CSS confirmara la pausa; se añadió espera al frame de renderizado manteniendo la comprobación exacta de que no gira. Son incidencias del procedimiento/pruebas, no se presentan como fallos anteriores del producto ni como cambios al reproductor.

## Capturas

[Comentarios en escritorio](captures/comments-1440.png) · [Comentarios en móvil](captures/comments-390.png) · [Filtros](captures/filters-desktop.png) · [Notificaciones](captures/notifications-mobile.png) · [Artista](captures/artist-390.png) · [Aportación con error recuperable](captures/funding-desktop.png).

La carpeta `captures` incluye 375, 390, 430, 1280 y 1440 px para comentarios, además de las demás familias de ventanas. Los datos mostrados son los del escenario desechable. La comprobación de [ambos localhost](localhost.json) confirma que sirven los mismos assets; no se reiniciaron sus datos.

Commit de implementación y pruebas: `6d54983` (`feat: unify platform windows with the Share dialog style`).

Regresiones seleccionadas: `home-playback`, `home-card-design`, `discovery-audio-record`, `discovery-like`, `discovery-scroll-regression`, `discovery-tap` y las dos pruebas de notificaciones de `handoff`. Primera ejecución: **25 aprobadas, 4 omitidas y 1 fallo** de sincronización del frame descrito arriba. [Salida completa](regressions.txt). Las omisiones corresponden a escenarios exclusivos de escritorio/móvil; no son errores ocultos. Se mantienen las aserciones de play/pause manual, seek, volumen, reproducción exclusiva, swipe, scroll fraccional, likes y persistencia de borradores.

La repetición aislada de `discovery-audio-record --project desktop --grep "record follows"` terminó con **1 aprobada**. [Salida final del vinilo](vinyl-final.txt). Con ello, los 26 casos aplicables del grupo de regresiones tienen resultado final aprobado; no se repitieron los 25 que ya habían pasado.
