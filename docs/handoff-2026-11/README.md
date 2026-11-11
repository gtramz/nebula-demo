# Handoff de la demo local — 11 noviembre 2026

La implementación conserva el estado local de ensayo. La referencia es `b9cbf60ba111fc203d19793ac5bd70cdb4a0c0f0` más los cambios locales del usuario, registrados por separado en `70644c010d86f9c38b23c68204a8048d6f4d6761`. Rama: `codex/handoff-preserve-playback`.

## Protección y alcance

- Respaldo previo: `.data/handoff-before-20261111/`, 38 MB. Incluye diff binario, imágenes, manifiesto, pruebas locales y copias consistentes de SQLite (semilla, snapshot inicial y demo activa).
- Las dos portadas, el manifiesto, la semilla y `feed-scroll.ts` conservan sus SHA-256. Los archivos de imagen servidos por la demo activa coinciden con los PNG protegidos.
- Las publicaciones 17 (Luna) y 18 (Luna — CHILZ Remix) conservan dueño, proyecto, portada y atribución. Se compararon los registros de la demo activa con el respaldo.
- En el reproductor de Discovery solo se añadió decoración detrás del contenido. Se conservan la superficie de toque, el indicador Play, la pausa manual y los límites de comentarios/controles.
- Los servidores de pruebas copian el fixture a directorios temporales. Ninguna prueba reinicia la demo de ensayo. No hay despliegue ni push remoto.
- Alcance móvil: regresión de los gestos y reproducción existentes; no se certifica el resto de la experiencia móvil.

## Matriz de implementación

| Requisito | Resultado | Evidencia principal |
|---|---|---|
| P2-01 | Inventario de rutas; skeletons específicos de Received/Saved; revelado inicial de portadas/fuentes con límite de fallo; contenido retenido y reintento en recargas | `inventories.md`, benchmark y pruebas de recorridos |
| P2-02 | Lista y conversación simultáneas; solicitudes recibidas/enviadas/cerradas; avatar del interlocutor; borradores y componentes estables durante polling | Pruebas `messages`, `handoff messages`, contratos del servidor |
| P2-03 | Received compacto; historial, totales, filtros y registros archivados conservados | `contributions-layout` |
| P2-04 | Loader sin puntos, movimiento suave; mismos mínimos de 5 s y condiciones de disponibilidad | `handoff Discovery`, regresión de reproducción |
| P2-05 | Saved compacto; destinos independientes, fallback de imagen, pausa fuera de vista, paginación y actualización tras éxito | Caso Saved de `discovery-cleanup`; consultas y caché con identidad |
| P2-06 | Familias de formularios inventariadas y alineadas con MorphAdvanceButton; guardas, espera real, errores y recuperación | `guided-creation`, `handoff-forms`, `guided-workspaces`, `messages` |
| H2-01 | Portadas de discografía sin flecha superpuesta | `handoff profile cleanup` |
| H2-02 | Sin encabezado RELEASES / artista | Mismo caso y captura de perfil |
| H2-03 | Sin Open in Discovery en grabaciones destacadas; referencias y controles conservados | Mismo caso y captura de perfil |
| H2-04 | Búsqueda vacía/espacios sin texto auxiliar; resultados y mensajes útiles conservados | `handoff profile cleanup` |
| H2-05 | Botón Filters de solo icono, etiqueta accesible y estado expandido | `contributions-layout` |
| H2-06 | Comparación fría/con caché; cachés limitadas, invalidación dirigida y contenido estable durante recargas | `performance.md`; límites y defectos iniciales indicados abajo |
| H2-07 | Ventana anclada a la campana; consulta no leídas antes de paginar; lectura sin borrado, retorno de foco y guardas | Pruebas de notificaciones, servidor y navegación con formulario sucio |
| H2-08 | Gradientes estáticos derivados de muestra de 32×32; caché de 64 portadas; fondo oscuro de reserva; sin eventos ni cambios de tamaño | `ambient-artwork.tsx`, regresiones de pausa/scroll |
| H2-09 | Publicación/edición con un audio real y controles Antiq; disponibilidad por canplay/error, reiniciada al sustituir archivo | `guided-creation`, `handoff-forms` |
| H2-10 | Pasos y finales con feedback compartido, doble clic/Enter bloqueados, operaciones pendientes, retroceso y recuperación | Matriz de formularios en `inventories.md` y pruebas de recorridos |
| H2-11 | Creación desde menú y query intent; proyectos con/sin canciones y oportunidades opcionales | `guided-creation`, cancelación protegida y nuevo intent |

## Contratos

1. `ConversationCard.counterpartPicture: string | null`, resuelto desde el artista opuesto. No cambia admisión ni acceso a conversaciones.
2. `GET /api/notifications?unreadOnly=1`: el filtro precede a `LIMIT`/cursor. Omitirlo o usar `0` conserva el historial completo. Otros valores son inválidos. Leer no elimina registros.
3. `AntiqAudioPlayer.onPlayable(boolean)` y `onMediaError()`: cambiar fuente/loadstart invalida disponibilidad; loadedmetadata solo informa duración; canplay real la habilita.
4. Publicaciones aceptan un `operationId` opcional. La misma operación y payload repiten el resultado sin otra escritura; un payload distinto con el mismo identificador devuelve 409. El editor conserva la clave en un reintento tras respuesta perdida. Clientes anteriores mantienen su comportamiento y controles de revisión.

## Defectos iniciales separados

`discovery-cleanup.spec.ts` tiene tres fallos reproducidos tanto en la copia inicial como en el candidato:

- El caso de navegación busca un enlace de perfil con imagen, pero la interfaz inicial usa un botón.
- El caso de reintento mantiene “Refreshing…” más allá de su expectativa de cinco segundos.
- El caso de pull-to-refresh cuenta una segunda consulta al cambiar el viewport.

No se modificó el algoritmo de scroll para ocultar esos resultados. Las trazas iniciales se guardan en `.data/handoff-evidence/baseline-discovery-failures/`. Los errores transitorios de pruebas nuevas (selectores de audio nativo, etiquetas que incluían texto de ayuda y fixtures incompletos) se conservan en los primeros reportes locales; los resultados finales se indican en `validation.md`.

No se declara aprobada toda la suite histórica del repositorio. Los reportes enumeran los archivos/casos ejecutados, omisiones y fallos conocidos. El build mantiene el aviso anterior de un bundle mayor de 500 kB.

## Entrega

- [Inventarios de cargas y campos](inventories.md)
- [Validación ejecutada](validation.md)
- [Comparación de rendimiento](performance.md)
- Evidencia verificable: `evidence/` (capturas, reportes, hashes y asociaciones; sin bases de datos ni credenciales).
- Las copias de seguridad y trazas completas permanecen locales bajo `.data/`.

## Commits exactos

| Grupo | SHA |
|---|---|
| Portadas y reproducción locales anteriores al handoff | `70644c010d86f9c38b23c68204a8048d6f4d6761` |
| Cargas, mensajes, colecciones, perfil, Discovery y notificaciones | `00d2cff5a7a4ffbb720aed2ecec49b0749bf8267` |
| Formularios, audio y reintentos seguros | `2f5b782d7a48afa18e61f66b53f8eefa7dde2465` |
| Pruebas y benchmark reproducible | `68e4e98ff946548c248ceea419c646d798eb6f90` |

El commit de documentación contiene este informe y la evidencia; su SHA se entrega en la respuesta final. No se realizó push.
