# Validación ejecutada

## Resultado y límites

Build y comprobaciones de tipos correctos. **52 pruebas de servidor/datos aprobadas. 41 casos distintos de navegador aprobados tras las correcciones y repeticiones focalizadas**, además de los dos recorridos de rendimiento (referencia y candidato). Dos casos de gestos se omiten intencionalmente en el dispositivo al que no corresponden.

Esto no significa que toda la suite histórica esté aprobada. Los tres fallos de `discovery-cleanup` descritos en el README se reprodujeron en la referencia y en el candidato. El caso Saved de ese mismo archivo sí pasa. No se ejecutaron todas las combinaciones posibles de fallos por cada campo ni una campaña móvil completa.

## Servidor y tipos

`pnpm build` ejecuta TypeScript, build de Vite y compilación del servidor. Resultado: correcto; permanece el aviso de bundle mayor de 500 kB. Registro: [build.txt](evidence/build.txt).

```sh
node --test server/app.test.mjs server/messages.test.mjs server/notifications.test.mjs server/follow-notifications.test.mjs server/handoff-publications.test.mjs scripts/presentation-luna.test.mjs scripts/presentation-seed.test.mjs
```

Resultado: **52/52**, cero fallos. Incluye compatibilidad de publicaciones, revisión, acceso privado, persistencia, mensajes/admisión, migraciones de notificaciones, filtro de no leídas antes de paginar, asociaciones de Luna y reintentos idempotentes. Las excepciones de SQL inyectadas en pruebas de rollback son esperadas. Registro: [server-tests.txt](evidence/server-tests.txt).

## Navegador por familia

| Archivo o selección | Casos aprobados | Comprobaciones |
|---|---:|---|
| `guided-creation` desktop | 6 | Publicar/editar audio y video, validación, pausa al avanzar, valores al retroceder, proyecto privado, oportunidad con referencia, cambio de categoría y canciones existentes |
| `handoff-forms` desktop | 4 | Registro; canción; publicación con audio real y reemplazo fallido; proyecto. Validación, doble clic, retroceso, cancelación y errores recuperables; respuesta perdida sin duplicados en publicación/proyecto |
| `handoff.spec` desktop | 7 | Perfil/búsqueda; notificaciones/lectura/foco; mensajes con avatar, borrador y scroll conservados durante polling; intro/ambiente/pausa; identidad con fallo 503 y reintento; query intent y guardas de navegación |
| `contributions-layout` desktop | 1 | Totales reales, filtro por proyecto/fechas, fechas inválidas, historial expandido, proyecto archivado y destinos |
| `guided-workspaces` desktop | 6 | Propuesta de video, borrador, envío y acceso privado; Forge; mezcla sin referencia con fallo de guardado; grabación; video sobre audio; conflicto entre pestañas y recuperación |
| `tests-collaborations/messages` desktop | 3 | Solicitud → revisión → aceptación → chat → entrega → finalización; rechazo y cierre; reintentos, permisos y cambio de cuenta |
| `forge-player` desktop | 3 | Transporte, volumen, velocidad, medios reales, pausa por navegación/notificaciones, cambio de versión, error/reintento y movimiento reducido |
| `discovery-cleanup`, solo Saved, desktop | 1 | Guardado, error de eliminación que conserva la pieza, eliminación exitosa y sincronización al volver |
| `discovery-tap`, desktop y mobile | 7 | Toque pausa/reanuda, indicador Play, seek/mute independientes, comentarios y teclas de escritura, retorno de foco, un solo medio activo y swipe móvil |
| `discovery-scroll-regression`, desktop y mobile | 3 | Alturas fraccionales sin retroceso; cola de trackpad sin saltos ni avance duplicado |

Se usó Chrome con el fixture copiado a bases temporales. El proyecto `mobile` emula iPhone 13 en Chromium; no representa una prueba en dispositivo físico.

Los 41 casos se obtienen de varias ejecuciones, no de un único reporte verde. El recorrido principal terminó 22/23: el caso de mezcla buscaba el audio nativo en vez del reproductor Antiq. Se corrigió el selector y pasó en la repetición. Otra repetición tuvo un `ECONNRESET` en un GET de comprobación; se habilitó reintento solo para lecturas del helper y el caso volvió a pasar. Los mensajes también se reforzaron con 14 entradas anteriores y comprobación de scroll durante polling.

Registros reales:

- [Recorrido principal: 22 aprobadas y un selector corregido después](evidence/desktop-final.txt)
- [Repetición de mezcla y mensajes; incidencia de transporte en GET](evidence/final-focused.txt)
- [Cierre de Received, Saved, Forge, notificaciones y mensajes: 7/7](evidence/final-verification.txt)
- [Proyecto con respuesta perdida: 1/1](evidence/project-retry.txt)
- [Solicitudes y conversaciones entre cuentas: 3/3](evidence/messages-browser.txt)
- [Pausa/scroll protegidos: 10 aprobadas y 2 omisiones por dispositivo](evidence/protected-playback.txt)

Las cookies de sesiones desechables se redactaron en los reportes entregados. Las trazas completas y reportes intermedios quedan locales en `.data/handoff-evidence/`.

## Comandos reproducibles

```sh
pnpm exec playwright test --config playwright.presentation.config.ts handoff.spec handoff-forms guided-creation guided-workspaces contributions-layout --project=desktop
pnpm exec playwright test --config playwright.collaborations.config.ts messages --project=desktop
pnpm exec playwright test --config playwright.presentation.config.ts discovery-tap discovery-scroll-regression --project=desktop --project=mobile
pnpm exec playwright test --config playwright.presentation.config.ts forge-player discovery-cleanup handoff.spec contributions-layout --project=desktop --grep 'Forge|Saved uses|notifications anchor|messages keep|received project cards'
HANDOFF_PHASE=candidate pnpm exec playwright test --config playwright.presentation.config.ts handoff-runtime --project=desktop
```

Los servidores de prueba usan `.data/presentation/initial.sqlite` como fuente y trabajan en copias temporales. Los comandos se ejecutan secuencialmente cuando comparten el puerto 4177.

## Evidencia visual y conservación

Se revisaron capturas de perfil, mensajes, notificaciones, Received y publicación. Hay capturas comparables de nueve rutas antes/después y vistas de formularios, mezcla y filtros en `evidence/`.

- [Luna en perfil](evidence/artist-after.png), [Discovery](evidence/discovery-after.png), [mensajes](evidence/messages-after.png), [notificaciones](evidence/notifications-after.png)
- [Received expandido](evidence/received-after.png), [Received filtrado](evidence/received-filtered.png), [Saved](evidence/saved.png)
- [Audio en publicación](evidence/publish-audio.png), [revisión de publicación](evidence/publish-review.png), [proyecto](evidence/project-review.png), [propuesta](evidence/proposal-review.png), [Remix](evidence/remix-review.png)
- [Hashes antes/después](evidence/protected-hashes-after.json), [asociaciones de Luna](evidence/luna-associations.json)

Tras reiniciar únicamente el servidor en 4187, ambos localhost devolvieron HTTP 200. Los PNG servidos por HTTP coinciden con sus hashes protegidos; los nuevos contratos de no leídas y avatar están activos. El proxy móvil de 4188 se conservó. [Verificación de la demo activa](evidence/live-verification.json).
