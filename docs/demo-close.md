# Cierre de la presentación · 9 de noviembre de 2026

Esta revisión corresponde a la copia local actual. La cuenta inicial es Sol Rivera. Conserva el catálogo previo; los ejemplos públicos nuevos representan colaboraciones ficticias aprobadas. No son publicaciones creadas automáticamente por el usuario al enviar una propuesta.

## Correcciones

- Inicio simultáneo de base y aportación cuando el desplazamiento es cero; se elimina la espera al siguiente fotograma del motor.
- Comparación de audio y video en Discovery, proyecto, Remix y revisión de propuestas, con un solo medio activo y cambio de versión en una posición equivalente.
- Referencias y aportaciones de video en oportunidades; preparación real de la mezcla, cancelación, invalidación al cambiar niveles, recuperación del borrador y revisión por el destinatario.
- Dos tomas diferentes con su audio nativo. El instrumental de video nuevo conserva su propio sonido; el antiguo clip de Marea con banda sonora sustituida permanece en el catálogo histórico y no es la evidencia del caso nuevo.
- El video del colaborador ocupa la parte principal de la composición. Portadas, controles, comentarios y navegación conservan la proporción y el contexto.
- Guardar queda en la cabecera compacta de las tarjetas de Home. Los previews y las oportunidades siguen siendo controles independientes.
- Escenario ampliado con una solicitud audiovisual entrante, un guardado y los géneros del Artist principal. Los datos originales de la otra instalación permanecen separados.

## Recorridos comprobados

| Función | Entrada / ejemplo | Resultado |
| --- | --- | --- |
| Perfil y preferencias | Profile → Edit profile | Guardar, cancelar, recargar; concurrencia y preferencias privadas. |
| For You | Home; cambiar preferencias profesionales | Priorización e identidad coherentes. |
| Búsqueda y filtros | Home → Search / Filters | Combinaciones, autocompletado, historial, errores y almacenamiento bloqueado. |
| Following | Perfil público → Follow / Unfollow | Listas, contadores, Home y cambio de cuenta. |
| Discovery audio/video | Publicación original de cada conjunto | Play, seek, volumen, reproducción exclusiva y retorno. |
| Comentarios | Acciones laterales de Discovery | Escribir en panel contextual; mantener publicación y tiempo. |
| Saved | Guardar → Profile / Saved | Recuperar y quitar, con persistencia e invalidación en Home. |
| Remix | Original → Remix → Use prepared take | Exportación de video real, comparación, guardado privado y reapertura. |
| Propuesta enviada | Oportunidad de la canción → Submit proposal | Referencia exacta, toma preparada, render, borrador y solicitud. |
| Propuesta recibida | Messages → Requests | Escuchar original/resultado, aceptar y conversar en el mismo ID de hilo. |
| Rechazo | Solicitud pendiente | Respuesta conservada; conversación cerrada. |
| Notificaciones | Campana / `/notifications` | Enlace al hilo correcto y lectura por destinatario. |
| Proyectos y canciones | Create → Project | Guardar con oportunidad vinculada a la canción elegida. |
| Publicaciones | Create → Publish audio or video | Borrador privado, publicación ordinaria y recuperación. |
| Search global | `/search` | Artistas, proyectos, canciones y publicaciones. |
| Investor | Persona Elena / Noah | Aportación simulada reflejada en Pledges y Received. |
| Onboarding | Nueva cuenta secundaria | Configuración y perfil público sin alterar al principal. |
| Persistencia | Recarga, reinicio y restauración explícita | Estado conservado; restauración repetible al escenario preparado. |

## Ejemplos audiovisuales

| Caso | Proyecto / canción | Original | Resultado público | Preparación de propuesta |
| --- | --- | --- | --- | --- |
| Voz: Dante sobre Club Marea · 7.8 s | `/project/12?song=4` · Marea Alta | `/discovery?post=post-13` | `/discovery?post=post-14` | `/messages/offer/13` · Verse · 15% regalías |
| Instrumento: Inés sobre Lía · 10 s | `/project/9?song=1` · Afterglow | `/discovery?post=post-15` | `/discovery?post=post-16` | `/messages/offer/15` · Production · USD 300 |

Las tomas están en `presentation/assets/video/marea-vocal-take.mp4` y `afterglow-percussion-take.mp4`; los resultados, en los correspondientes archivos `*-result.mp4`. El clip vocal generado termina con un defecto visual: se conserva un fragmento limpio de 7.8 segundos, con el mismo recorte en original, aportación, mezcla y atribución. El segundo conjunto utiliza una referencia de Afterglow desde 7.88 s y una toma de percusión distinta.

Sol recibe además la solicitud de Inés en `/messages/collaboration/10`, para la oportunidad 16 de su proyecto `/project/20?song=10`. Los antecedentes aprobados de los ejemplos son los hilos 8 y 9. Los remixes interactivos nuevos siguen privados.

El camino interactivo usa los motores existentes: los cambios de fragmento y volumen afectan al archivo exportado. Los resultados precargados son mezclas locales de sus dos entradas, no sustituciones de audio. Las propuestas nuevas permanecen fuera de Discovery y sus archivos solo son accesibles a los participantes autorizados.

## Verificación de esta entrega

- Unitarias: **71/71**; servidor/API: **86/86**.
- Escenario de presentación: **14 comprobaciones**, incluidos reinicio, privacidad, rechazo, Investor y restauración repetida.
- Regresiones focalizadas: **38/38** entre sesión/perfil concurrente (10), identidad (2), perfil/onboarding (6), búsqueda contextual (8), Following (6) y For You (6).
- Navegador: **22/22** flujos de presentación (11 por tamaño). **8/8** recorridos adicionales de video aprobados después del ajuste final de sincronización.
- TypeScript, frontend de producción y servidor compilados correctamente.
- Revisión visual con tráfico externo bloqueado: 44 capturas, anchos 390, 820, 1366 y 1440; además paisaje 667 × 375. Sin desbordamiento horizontal ni excepciones de página en ese recorrido.
- Exportaciones reales de navegador: los cuatro archivos contienen video VP8 de 720 × 1280 y audio; ambas entradas explican el 98.6–99.7% de la señal exportada. Desfase medido entre entradas de 0–5.25 ms tras la corrección (antes, aproximadamente 40 ms). Duraciones 7.8 s y 9.96 s; la composición funciona en tiempo real, no promete precisión de un editor de estudio.
- Mezclas locales: correlación de la aportación con la diferencia respecto a la base **0.9999** (voz) y **0.9964** (percusión); cero muestras saturadas. Movimiento en 31/31 y 40/40 fotogramas muestreados. Waveforms derivadas del sonido real.
- La prueba técnica antigua usa un mismo archivo de video para verificar transporte/cancelación; no se utiliza como evidencia de coherencia musical de los dos ejemplos nuevos.

Capturas de Home, filtros, audio, video, perfil/editor, comentarios, Saved, solicitudes, Inbox y notificaciones: `docs/verification/demo-close/`. Los videos de recorrido y capturas de comparación/propuestas están en `docs/verification/demo-close/flows/`. Ejemplo grabado: [voz en escritorio](verification/demo-close/flows/closing-complete-musical-example-marea-voice-desktop/video.webm). Evidencias: [pruebas generales](verification/demo-close/presentation-tests.txt), [video final](verification/demo-close/render-sync-tests.txt), [medición de exportaciones](verification/demo-close/browser-export-verification.json), [Home activo](verification/demo-close/active-home.png), [comparación móvil](verification/demo-close/marea-voice-comparison-390.png).

## Arranque y controles

Desde `nebula_v1`, con Node 24 y pnpm 11.21:

```sh
pnpm start
# Restaurar únicamente cuando quieras descartar los cambios del ensayo:
pnpm demo:reset
```

Abrir `http://127.0.0.1:4174`. `/presentation`, o Ctrl/Cmd + Shift + P, permite cambiar de perspectiva, abrir los ejemplos, activar eventos una vez y restaurar explícitamente. El modo inicial es Guided. Cambiar de cuenta conserva el mundo compartido. La cuenta principal vuelve a Sol al restaurar.

## Límites comprobables

Los dos clips nuevos se generaron con el lote autorizado de 185 créditos. La demo utiliza sus archivos locales; no requiere generación ni conexión a Yapper durante la presentación. Los intérpretes y colaboraciones son ficticios.

Se verificaron archivos, movimiento en fotogramas, señal, duración, mezcla de ambas entradas, waveforms, ausencia de saturación en los resultados y reproducción/seek en navegador. No se realizó escucha humana ni se certificó sincronía musical exacta de labios/dedos. La revisión auditiva artística sigue siendo humana. Las pruebas móviles usan Chrome con viewport/touch emulados, no un teléfono físico. Cámara y micrófono no son necesarios para estos recorridos preparados.

Los pagos, regalías y eventos de otros artistas siguen siendo simulados. Permanecen los avisos de build sobre tamaño del bundle y sourcemaps; no impiden compilar ni reproducir la demo.

## Archivos principales

UI: `features/remix/audio-comparison.tsx`, `studio.tsx`, `video.ts`; `features/collaborations/proposal-preparation.tsx`, `opportunity-fields.tsx`, `index.tsx`; `features/discovery/version-comparison.tsx`, `project-community.tsx`; `pages/discovery.tsx`; `features/opportunities/index.tsx`; `features/presentation/index.tsx`; `index.css` (dentro de `artifacts/nebula/src`).

Servidor: `server/presentation.ts`, `server/collaborations.ts`. Escenario: `scripts/close-demo-media.py`, `verify-close-media.py`, `close-demo-scene.mjs`, `activate-closed-demo.mjs`, `presentation/closing-scene.json` y manifiesto de assets. Verificación: `tests-presentation/`, selectores vigentes en regresiones de identidad/perfil/For You y soporte de fixture aislado en los scripts de prueba. Sin nuevas dependencias.

## Conservación

La preparación se hizo en una copia aislada. Se conservan los 9 usuarios, 9 proyectos, 10 canciones, 12 publicaciones previas, relaciones, propuestas y mensajes anteriores. Se añaden 4 publicaciones, 5 ofertas, 3 colaboraciones y sus archivos/avisos. En el estado anterior solo se completan los dos géneros del Artist ficticio Sol; no se sustituyen sus preferencias, bio ni contenido. Los archivos y SQLite de `.data/server` mantienen sus hashes originales. Antes de promover la copia se compararon las tablas y los medios con el estado inicial; la comprobación pasó. Se respaldaron SQLite, snapshot y medios en `.data/demo-close/activation-backup`. Activación completada el 9 de noviembre de 2026 a las 12:39 (Ciudad de México). Una comprobación posterior en el servidor real confirmó Sol, sus géneros, los cuatro medios públicos, la comparación reproducible, la solicitud pendiente 10 y Home, con tráfico externo bloqueado. No se ejecutaron mutaciones de QA sobre el escenario entregado.
