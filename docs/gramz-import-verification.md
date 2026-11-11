# gramz — ampliación del escenario de presentación

Fecha: 10 de noviembre de 2026. Solo `nebula-demo`.

## Inventario verificado

11 proyectos de catálogo, una obra asociada por proyecto. LUNA ya existía y queda fuera de esta importación. No Pop se deduplica entre Spotify y SyncUp Team. El catálogo no incluye música descargada: muestra **Silent demo preview**. Los ocho clips sí incluyen su sonido original.

| Proyecto | Fuente | Fecha documentada | Duración | Créditos visibles |
|---|---|---|---|---|
| Slow Rockstar | [youtube](https://www.youtube.com/watch?v=SmPvAfl91DU) | 2024-12-29 (subida) | 3:09 | Gramz |
| WHY? | [youtube](https://www.youtube.com/watch?v=MyHE5p6v3-A) | 2024-12-16 (subida) | 3:14 | Gramz |
| Midnight Monday | [youtube](https://www.youtube.com/watch?v=-5BKb8X811s) | 2024-11-25 (subida) | 2:17 | Gramz |
| Brisa | [youtube](https://www.youtube.com/watch?v=JEYhBiUtKw4) | 2024-10-18 (subida) | 2:27 | Gramz, SANFERNNA |
| DVDs | [youtube](https://www.youtube.com/watch?v=nEdRR5pNzMc) | 2024-10-18 (subida) | 3:20 | Gramz, SANFERNNA |
| Falling | [youtube](https://www.youtube.com/watch?v=pBUF0vU9sb4) | 2024-10-18 (subida) | 2:40 | Gramz, SANFERNNA |
| No Pop | [spotify](https://open.spotify.com/album/1BsDW5tAIl6I31Q2LLj9PX) | 2024-07-04 (lanzamiento) | 2:51 | Gramz |
| No Regrets | [spotify](https://open.spotify.com/album/3Az0m351SgNnS59agFixWP) | 2024-04-19 (lanzamiento) | 2:52 | Gramz |
| Fantasmas | [youtube](https://www.youtube.com/watch?v=GyIZLWce-S0) | 2023-12-29 (subida) | 3:32 | Gramz, SANFERNNA |
| She a Model | [youtube](https://www.youtube.com/watch?v=aCUotIhtI04) | 2023-12-29 (subida) | 2:37 | Gramz, 808wrld, SANFERNNA |
| 7PM | [youtube](https://www.youtube.com/watch?v=dYcXQDQpV_E) | 2023-12-29 (subida) | 2:30 | paVlo, FD & Gramz |

Las nueve referencias de SyncUp Team son videos de audio oficial. Se usa el tipo existente **Video** y el rótulo **Official audio**; su año corresponde a la subida verificada, no a una fecha comercial inferida. No se fabrican IDs de Spotify, géneros, estadísticas ni créditos adicionales. En 7PM se conserva la participación de paVlo y FD junto a Gramz.

## Publicaciones de Discovery

| Clip | Fuente | Proyecto |
|---|---|---|
| Slow Rockstar · short 1 | [youtube](https://www.youtube.com/shorts/RMyx3zjScCU) | Slow Rockstar |
| Slow Rockstar · short 2 | [youtube](https://www.youtube.com/shorts/C1Gdn_BhPd8) | Slow Rockstar |
| Hypnotized | [tiktok](https://www.tiktok.com/@dongramzz/video/7475245924621487415) | Independiente |
| Náufrago | [tiktok](https://www.tiktok.com/@dongramzz/video/7470649012845088005) | Independiente |
| WHY? | [tiktok](https://www.tiktok.com/@dongramzz/video/7470346930036493574) | WHY? |
| Midnight Monday | [tiktok](https://www.tiktok.com/@dongramzz/video/7442005875776163127) | Midnight Monday |
| Falling | [tiktok](https://www.tiktok.com/@dongramzz/video/7429759582672588038) | Falling |
| DVDs | [tiktok](https://www.tiktok.com/@dongramzz/video/7428445230388776197) | DVDs |

Se seleccionaron dos de los cuatro Shorts disponibles de Slow Rockstar y seis TikToks distintos. Comparten el proyecto verificado cuando corresponde; no se crea un lanzamiento por clip. **Hypnotized** y **Náufrago** permanecen independientes porque no hay un lanzamiento de catálogo verificado al que asociarlos. El contenido restante, repetido, de otros artistas o de LUNA se excluye.

Los MP4 locales se normalizaron a H.264/AAC y ancho 720 con proporción preservada, sin superposiciones ni recorte editorial. Los ocho contienen imagen y audio no silencioso verificados con FFprobe/FFmpeg. El manifiesto conserva URL, ID de fuente, hash original, hash exportado, duración y poster. No se importan métricas de redes sociales. Los nuevos clips tienen remix desactivado; no se presume un permiso de derivación por haber importado una referencia.

## Home y contacto

- **No Pop:** Feature, aportación vocal, 10% de regalías.
- **No Regrets:** Mix, mezcla estéreo completa, USD 150.
- Ambas son **Demo opportunity**, abiertas, sin vencimiento, asociadas a su canción y con términos explícitos de simulación. No representan encargos ni acuerdos reales. No se inventa financiación.
- Siguen las consultas y reglas de elegibilidad de Home; búsqueda, filtros y Following usan las mismas ofertas.
- gramz y CHILZ se siguen mutuamente. Se genera únicamente el aviso correspondiente a cada inserción real.
- La conversación general se prepara aceptada y vacía, por instrucción del dueño de la demo; no se inventa conversación previa. Messages y Share reutilizan esa relación y conservan permisos de participantes.

## Contrato y operación

- `/api/presentation` mantiene `catalog` de CHILZ y añade `catalogs`, una colección opcional. Cada catálogo se resuelve por Artist ID y cada lanzamiento por Project ID.
- `PresentationRelease`/`PresentationTrack` aceptan `sourcePlatform`/`sourceId`; `spotifyId` se conserva para compatibilidad. `formatLabel` y `dateKind` diferencian audio oficial y fecha de subida.
- Datos normales siguen en state, works, project_works, posts, media y collaboration_offers. Los metadatos visuales se guardan en la tabla existente presentation_settings, clave `artist-catalog:32`; `gramz-import` registra la operación.
- `scripts/presentation-gramz.mjs DATABASE --media-directory DIRECTORY` es explícito, aditivo y transaccional. La segunda ejecución es un no-op. Ante fallo revierte filas y archivos nuevos. No reinicializa cuentas ni credenciales.
- Se reutilizan los servicios Follow y notificaciones dentro de la transacción. Un contacto previo no aceptado causa error para revisión en lugar de sobrescribirlo.
- El escenario portátil incluye los mismos recursos con hashes y sin credenciales reales ni sesiones. No se debe copiar el ensayo del presentador sobre el fixture.
- Nuevas instalaciones usan la preparación habitual. Ensayos existentes requieren respaldo, detener el servidor e importar sobre la base actual y su snapshot inicial; nunca ejecutar reset para actualizar.

## Preservación y límites

La importación actualiza únicamente foto, biografía factual y enlaces públicos del gramz existente. Conserva ID, nombre de usuario, credenciales, preferencias privadas y demás identidad. CHILZ continúa como personaje principal. LUNA y su remix mantienen proyectos, obras, publicaciones, medios y atribución sin modificaciones.

No hay integración permanente con Spotify, YouTube ni TikTok, ni dependencias nuevas de aplicación, tablas o endpoints. Los scripts de importación de fuentes son herramientas puntuales y no se ejecutan durante el uso de la demo. La foto y portadas tienen procedencia verificable local. No se verifica una fecha comercial para las referencias de YouTube ni se infiere su clasificación explícita.

La revisión usa Chrome de escritorio y emulación móvil; no equivale a una prueba física de iOS/Android. Los enlaces de localhost siguen siendo locales.

## Evidencia de verificación

52 casos de navegador, 32 API, 81 unitarias, 8 de importación/fixture y 14 recorridos de aceptación aprobados. TypeScript/build aprobados. Activado en localhost:4186. Comparación tras reinicio: 12 cuentas, 21 proyectos anteriores y 58 archivos previos intactos; LUNA y CHILZ sin cambios. El detalle, las repeticiones de pruebas y capturas están en la sección 22 de la guía de Manuel. Las pruebas escriben exclusivamente en copias temporales.


## Archivos principales

- Contrato: `lib/local/src/presentation-catalog.ts`, validación `lib/local/src/state.ts` y `server/presentation.ts`; soporte de imágenes JPEG estáticas en `server/app.ts`.
- Presentación: `artifacts/nebula/src/features/presentation/{index,catalog}.tsx` y resolución de catálogo por proyecto en `artifacts/nebula/src/pages/project.tsx`.
- Importación y procedencia: `scripts/import-gramz-reference.py`, `scripts/presentation-gramz.mjs`, `presentation/gramz-catalog.json`.
- Escenario portátil: `presentation/seed/scene.sqlite`, `presentation/seed/manifest.json`, `presentation/assets/gramz` y `artifacts/nebula/public/presentation/gramz`.
- Pruebas: `scripts/presentation-gramz.test.mjs`, `tests-presentation/gramz.spec.ts`; aceptación paginada en `scripts/check-presentation.mjs`, conteos del fixture en `scripts/presentation-seed.test.mjs` y expectativa de reproducción vigente en `tests-presentation/shared-artist.spec.ts`.
- Guía: `README.md`, `docs/manuel-demo-handoff.md` y este inventario. `pnpm test:seed` incluye ahora la importación de gramz.
