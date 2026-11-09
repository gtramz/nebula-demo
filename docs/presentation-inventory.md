> Historical inventory from before the audiovisual closure. For the current scenario, counts and developer instructions, use [Manuel’s demo handoff](manuel-demo-handoff.md) and [the current runbook](presentation-runbook.md).

# Inventario y aceptación de presentación

Inventario conservado del router y módulos existentes. La incorporación de presentación no elimina rutas; los alias antiguos siguen redirigiendo. Las pruebas verifican permisos y consecuencias, no sólo el guion.

| Área / rutas | Capacidades y controles conservados | Verificación automatizada |
| --- | --- | --- |
| `/`, `/register`, `/login`, `/onboarding` | Crear Artist/Investor, autenticación, cierre, recuperación de perfil local legado, pasos y reanudación de onboarding | artist-identity, artist-profile, session-profile-regressions; servidor sesión |
| `/profile`, `/artist/:id` | Editar nombre, foto, bio, ubicación, roles, géneros, links, disponibilidad, preferencias privadas; perfil público, seguidores, obras | artist-profile, artist-taxonomy, genre-search, following |
| `/explore` | For you, Following, nuevas oportunidades, búsqueda contextual, filtros combinados, recientes, compensación, géneros, categorías, retorno y paginación | home, home-for-you, home-search, following, project-browser |
| `/search` | Buscar artistas, proyectos; añadidos canciones y publicaciones; debounce, errores, vacíos y cancelación de resultados anteriores | search; demo:check |
| `/discovery`, `/saved` | Scroll, audio/video, seek, volumen, mute, waveforms reales, reproducción exclusiva, autor/proyecto, descripción, likes, comentarios, saves, enlaces, remix | social, publications, return-context; demo:check; revisión visual |
| `/studio`, `/publish`, `/publish/:id` | Subir audio/video y portada, vincular canción/proyecto, editar, borrador, publicar, retirar, permisos remix, archivos no usados | publications, project-songs; servidor uploads/publications |
| `+` permanente Artist | Abrir editores existentes, crear proyecto, publicar, continuar borradores, remix studio | revisión visual y navegación de rutas |
| `/project/:id` | Crear/editar/archivar, portada, historia, canciones, propuestas, oportunidades, condiciones, inversión, progreso; música y versiones vinculadas | project-browser, project-songs, collaborations; demo:check |
| `/studio/remix`, `/studio/remix/proposal` | Borradores privados, rango/zoom/waveforms, upload/mic/cámara, volúmenes, cancelación, render audio/video, guardar/reabrir, propuesta; tomas locales y comparación sincronizada añadidas | remix, waveform, workspace, unified; demo:check; revisión visual |
| `/remix/:id`, `/remix/:id/proposal` | Entradas antiguas y compatibilidad con remix histórico | remix, unified |
| `/messages`, `/messages/new/:id`, `/messages/general/:id` | Solicitudes generales, aceptar/rechazar, mensajes, adjuntos, filtros, lectura y privacidad | messages, unified, notifications |
| `/messages/offer/:id`, `/messages/collaboration/:id`, `/collaborations/:id` | Proponer, condiciones/versiones, aceptar/rechazar/retirar, solicitar revisión, reenvío, mensajes, adjuntos, entrega, cambios, finalización, lectura privada | workflow, interface, unified; demo:check |
| `/collaborations` | Alias a mensajes | navigation |
| `/notifications` y panel | Agrupación, unread/read, enlaces correctos, retorno, bloqueo durante grabación | notifications, notification-panel, follow-notifications |
| `/pledges`, `/received`, `/receipt/:id` | Investor, aporte, visibilidad pública, historial por identidad, recibos, total en artista receptor, proyectos archivados | pruebas servidor investment; demo:check |
| `/presentation` | Modo guiado/autónomo, personas, eventos persistentes idempotentes, restauración | presentation.test.mjs; demo:check |
| Shell transversal | Navegación desktop/mobile, retorno, estado de scroll, errores, cambios sin guardar, foco, diálogos, persistencia y aislamiento por cuenta | navigation, return-context, session-profile-regressions; suites móviles |

`demo:check` comprueba además los 12 medios y portadas locales, waveforms, nuevo usuario sin historia, privacidad de borradores, remix/propuesta/hilo, recepción, revisión y finalización, rechazo, publicación, Investor/receptor, persistencia al reiniciar y restauración repetida. Los artefactos de ejecución quedan en `.data/presentation-*.log` y `.data/presentation-acceptance.json`.

`test:presentation` bloquea todo tráfico externo en escritorio y móvil, abre el shortcut, usa el aporte preparado, renderiza, compara manteniendo posición y reproducción exclusiva, guarda y recarga el borrador.

Las restricciones por propiedad, rol, admisión de conversaciones y estado siguen vigentes: un control legítimamente no disponible por permisos no se habilita sólo por ser una demo. No se añadió ningún éxito ficticio que eluda una operación persistente.
