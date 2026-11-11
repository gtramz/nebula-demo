# Nebula Demo · Artist / CHILZ / LUNA

Verificación del 9 de noviembre de 2026. Alcance exclusivo: `nebula-demo`. El repositorio anterior y sus datos reales no se utilizaron como fixtures ni se modificaron.

## Resultado funcional

- CHILZ es el personaje principal. Conserva 10 lanzamientos / 14 canciones de referencia con portadas, créditos y duración, usando previews visuales silenciosos.
- `luna` aparece en Music de gramz y SANNFERNNA mediante un único original. `luna - chilz remix` aparece destacado en CHILZ, enlazado al original y con comparación A/B. Ambos M4A conservan exactamente los bytes aportados, AAC estéreo, 44.1 kHz, 175.287438 segundos.
- Remix nuevo exporta video 720×1280; dos videos ocupan mitades iguales con encuadre ajustable. La previsualización comparte la geometría de exportación. Los resultados anteriores no se transforman automáticamente.
- Las propuestas tienen referencia descargable autorizada, grabación audio/video, subida, tomas preparadas compatibles, fragmento, borrador y envío privado. Mix/Master admiten el resultado completo.
- Operaciones de Remix protegidas por identidad: una lectura, render o guardado anterior no libera el bloqueo ni escribe resultados/errores sobre la operación vigente tras cancelar y reintentar.
- Blobs compartidos en onboarding, feedback de errores y guardado, Home y fallback de avatar, respetando movimiento reducido y pasos opcionales.
- Corregido un fallo de catálogo detectado en la revisión: editar/archivar un proyecto sin financiación ya no invalida el estado. El marcador de catálogo no puede asignarse desde entradas de creación/edición y no habilita inversión.

## Verificación ejecutada

| Suite | Resultado |
| --- | --- |
| Unitarias `pnpm test` | 81/81 |
| API `node --test server/*.test.mjs` | 88/88 |
| Fixture e importaciones `pnpm test:seed` | 6/6 |
| Presentación completa, escritorio y móvil | 44/44 casos verificados tras las reejecuciones afectadas |
| Escenario integral en copia temporal `scripts/check-presentation.mjs` | 14/14 |
| Compartidas: sesión, identidad, onboarding/perfil, Home Search, For You, navegación | 40/40 |
| Remix: núcleo, formatos, waveform, workspace | 34/34; núcleo 14/14 repetido con las últimas guardas |
| Prepared take: cancelación, reintento, render, borrador y propuesta | 2/2 con la compilación final |
| TypeScript + build de producción | Aprobados; avisos existentes de sourcemaps/tamaño de bundle |

La corrida completa aprobó 38 casos. Tras corregir las pruebas y reforzar la vigencia de operaciones de Remix, los dos casos de prepared take y los diez recorridos de corrections/polish volvieron a pasar: los 44 casos únicos quedaron verificados. Las pruebas usan archivos y bases temporales. Se actualizaron selectores obsoletos de Upload y el listado esperado de navegación para incluir Saved, sin eliminar comprobaciones de comportamiento. Se restauró la expectativa correcta del ranking de Discovery tras elegir Jazz, y se sincronizó la retirada de una intercepción cancelada del test que provocaba una petición artificial adicional. No se eliminó ni relajó el bloqueo de uploads del servidor.

## Preservación y activación

Se detuvo/verificó la ausencia del servidor antes de actualizar las bases y se respaldó la carpeta completa en `.data/backups/presentation-before-chilz-luna-2026-11-09T21-00-29-055Z`.

Comparación aditiva de `nebula.sqlite` e `initial.sqlite`: los registros previos de cuentas, artistas y proyectos y las filas previas de 28 tablas quedaron idénticos. Ambas bases pasan de 9 a 12 cuentas y de 9 a 21 proyectos. Se preservaron los 61 archivos previos del ensayo. Se añadieron ocho copias de medios (cuatro por mapa de base activa/escena inicial); no se reemplazaron archivos anteriores. El fixture portátil contiene 12 cuentas, 21 proyectos, 26 obras, 18 publicaciones y 47 medios.

Activada en `http://127.0.0.1:4186`, con CHILZ seleccionado en Chrome y el perfil abierto. Se comprobó reproducción, pausa y navegación al original en la interfaz real. El cambio no restaura ni borra el ensayo.

Evidencia local detallada: `.data/catalog-upgrade/activation-report.json`, `luna-integrity.json` y logs de las suites. Los respaldos y logs activos quedan fuera de Git.

## Límites

- Los audios de LUNA son archivos terminados suministrados, no una mezcla de 175 segundos realizada por el Studio. La creación interactiva conserva su límite de 60 segundos.
- SANNFERNNA recibe crédito y la canción en su perfil de presentación. Esto no implementa copropiedad de la obra, splits ni acuerdos financieros.
- Los remixes/propuestas nuevos permanecen privados; los ejemplos públicos son fixtures preparados.
- Cámara/micrófono se prueban con dispositivos simulados de Chromium. Hardware de presentación y Safari/iOS físico requieren prueba específica; el video se renderiza en tiempo real.
- El catálogo de Spotify no incluye música descargada. Financiación, contratos y respuestas de personajes son simulaciones locales.

Guía de funcionamiento y mantenimiento: [handoff de Manuel](manuel-demo-handoff.md).
