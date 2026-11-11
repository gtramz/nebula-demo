# Manuel: actualización acumulada de Nebula Demo

Entrega: 10 de noviembre de 2026. Repositorio: https://github.com/gtramz/nebula-demo. Rama: `codex/presentation-demo`. Comparación de referencia: primera publicación `87a1ce4` → esta entrega. Este documento es la entrada vigente; los reportes anteriores registran cada etapa y sus resultados en ese momento.

## Qué cambió desde la última publicación

1. **Perfiles y proyectos compartidos.** CHILZ, gramz, Sol y los demás artistas usan una estructura común. Los perfiles públicos combinan Overview, Music, Discovery Posts, Projects, Collaborations y About, manteniendo seguimiento, mensajes, permisos y edición. El panel privado conserva sus accesos a creación y trabajo.
2. **Catálogo y ejemplos.** Se incorporaron el catálogo visual de CHILZ, el de gramz, clips locales verificables y LUNA original de gramz/SANNFERNNA con el remix de CHILZ. CHILZ sigue siendo el personaje principal; Sol y los ejemplos anteriores permanecen. gramz y CHILZ tienen seguimiento mutuo y conversación aceptada. Procedencia en los manifiestos; no hay descarga de música de Spotify durante el uso.
3. **Discovery.** Móvil inmersivo; escritorio con superficie multimedia y comentarios laterales. Preparación del siguiente contenido y ventana de hasta cinco tarjetas completas. Audio/video exclusivo, sonido sujeto a las políticas del navegador, controles discretos, reproducción durante comentarios y texto ampliado, retorno a la publicación, refresh contextual y ficha del original para remixes. Likes con corazón; comentarios con avatar, likes y respuestas. Share reúne chats/Following, envío interno y enlaces externos. No se añadieron controles ficticios para integraciones externas inexistentes.
4. **Remix de video.** Dos mitades iguales y encuadre independiente. Archivo exportado vertical 720×1280; reproducción adaptable arriba/abajo en móvil e izquierda/derecha en escritorio, con una sola fuente audiovisual. Audio original + video propio conserva su composición de un video. Preview y exportación comparten geometría.
5. **Audio con Forge.** Recorrido Original → Open Forge → Review your version → Save your version. Recibe un resultado final registrado, sin volver a mezclarlo ni ofrecer herramientas de creación de audio dentro de Nebula. El borrador privado, comparación, guardado y propuesta son reales; la apertura de Forge/DAW es una representación integrada. Más abajo se distinguen los límites.
6. **Colaboración guiada.** The opportunity → Your contribution → Preview your work → Review & send. Descarga autorizada, cámara/micrófono, carga o toma preparada, comparación, adjuntos y borrador privado. Mix/Master permiten entrega terminada sin imponer mezcla. La revisión del destinatario conserva términos, archivos y mensajes.
7. **Creación guiada y financiación.** Proyecto y publicación se crean por pasos. Album/EP permiten varias canciones; los demás tipos mantienen una sola. Se retiró Single de las nuevas opciones y Video se presenta como Music video, sin reclasificar registros históricos. La financiación es opcional; activarla permite meta USD y destino de fondos. CHILZ tiene un proyecto de financiación y dos contribuciones de presentación; gramz dispone de LUNA · Next phase. Received usa tarjetas por proyecto y conserva privacidad e historial.
8. **Navegación, onboarding y acabado.** En móvil Home queda a la izquierda, Create al centro y Discovery utiliza icono de video. Regreso contextual a la pantalla de origen, preferencias y formularios preservados. Blobs compartidos y estados accesibles. Se retiraron explicaciones técnicas y etiquetas repetidas de demo del producto; las limitaciones se documentan aquí.
9. **Último cambio: Music / Versions.** El proyecto abre Music con filas desplegables y una canción abierta. `?song=` selecciona una obra; retorno conserva pestaña/canción/posición por cuenta. Ofertas compactas y términos desplegables, sin repetir “Make it together”. Oportunidades generales en un bloque. Versions agrupa remixes públicos y monta reproductor/comparación bajo demanda; no incluye propuestas ni borradores privados. Financiación y permisos permanecen intactos.

## Arranque limpio y actualización de una instalación existente

Requisitos: Node 24.17+, pnpm 11.21.0, FFmpeg/FFprobe en PATH; Google Chrome para las pruebas configuradas. Si las herramientas multimedia no están en PATH, definir `NEBULA_FFMPEG_PATH` y `NEBULA_FFPROBE_PATH` con rutas de la propia computadora, nunca las rutas del autor.

```sh
git clone https://github.com/gtramz/nebula-demo.git
cd nebula-demo
pnpm install --frozen-lockfile
pnpm demo:prepare
PORT=4186 pnpm start
```

Abrir http://127.0.0.1:4186. `/presentation` permite cambiar de personaje; contraseña de los personajes locales: `Nebula2026!`. El modo presentación debe ejecutarse en loopback, no exponerse como servicio público con ese acceso.

Para actualizar un clon con trabajo local: detener su servidor, respaldar `.data/presentation` completo y conservar sus cambios de código; después integrar esta rama, instalar con lockfile, compilar y reiniciar con el mismo puerto. **`prepare` preserva una instalación existente y no instala retroactivamente el catálogo nuevo.** Para evaluar todo el fixture nuevo sin perder un ensayo anterior, utilizar otro clon/carpeta y otro puerto. `demo:reset` descarta cambios del ensayo y restaura su baseline local; no es un comando de actualización. Los importadores aditivos requieren respaldo y revisión explícita de sus argumentos.

El repo contiene el código, recursos y `presentation/seed/scene.sqlite` saneado. No contiene `.data`, sesiones, credenciales reales ni respaldos. El fixture reúne 12 personajes, 34 proyectos y 37 canciones; los manifiestos son la fuente de sus conteos y hashes. Al instalar se generan credenciales locales. No se necesita generar medios ni contratar servicios.

## Mapa de mantenimiento

| Área | Archivos principales |
|---|---|
| Music, Versions y ofertas | `artifacts/nebula/src/features/project/music.tsx`, `pages/project.tsx`, `features/collaborations/index.tsx` |
| Perfiles y catálogo | `features/artist-identity/`, `features/presentation/catalog.tsx`, `lib/local/src/presentation-catalog.ts` |
| Discovery, comentarios y Share | `pages/discovery.tsx`, `features/discovery/`; `server/publication-sharing.ts`, `server/app.ts` |
| Recorridos por pasos | `components/guided/`, `pages/profile.tsx`, `pages/publications.tsx`, `features/collaborations/proposal-preparation.tsx` |
| Forge / video | `features/remix/forge-studio.tsx`, `studio.tsx`, `video-geometry.ts`, `adaptive-video.tsx`; `server/finished-audio.ts`, `remix-drafts.ts` |
| Reproducción y navegación | `components/audio-preview.tsx`, `playback-coordinator.tsx`, `components/shell/` |
| Contratos / servidor | `lib/local/src/`, `server/` |
| Escenario reproducible | `presentation/seed/manifest.json`, `scene.sqlite`, `presentation/*-catalog.json`, `scripts/presentation-*.mjs` |

Las rutas UI abreviadas de la tabla se encuentran bajo `artifacts/nebula/src`. No reemplazar servicios existentes por datos por pantalla. Identidad, autorización, referencias y revisión de borradores deben seguir comprobándose en servidor. Las consultas privadas incluyen la identidad para evitar mezclar cuentas.

## Funciones reales, simulaciones y límites

- **Reales en el servidor local:** cuentas/sesión, registros persistentes, relaciones, mensajes/solicitudes, comentarios/likes, archivos privados, propuestas y revisión, grabación, renderizado de video, reproducción, búsqueda/filtros y guardado. No equivale a integración productiva con Antiq Central.
- **Forge:** Open Forge no inicia una aplicación externa ni transfiere archivos a agentes o DAW. Se copia un audio final registrado y verificado al borrador privado. `workflow: 'finished-audio'` no requiere aportación ni render adicional; hasta 600 s/100 MB. Los originales sin resultado muestran un estado vacío. La conexión real requiere autorización, protocolo de entrega/retorno, identidad de trabajos y validación de resultados.
- **Catálogo sin archivo:** transporte visual silencioso, incluyendo waveform de presentación. No hay audio descargado de Spotify ni un archivo inventado. LUNA y los videos autorizados sí usan archivos reales. Las canciones reales de usuarios sin grabación no reciben un sustituto inventado.
- **Finanzas:** USD, metas y ledger persistidos para presentación; no hay cobro, liquidación bancaria ni contrato de regalías ejecutado. La retirada de etiquetas visibles no convierte esos registros en acuerdos reales.
- **Red y móvil:** autoplay audible puede requerir interacción; los enlaces localhost no funcionan en otros dispositivos sin alojamiento/configuración. Las pruebas móviles son emulación Chromium, no certificación en iOS/Android físicos.
- **Compatibilidad:** los borradores anteriores permanecen sin conversión automática. Mantener originales, atribuciones, referencias por ID y privacidad; no emparejar canciones por título ni usar remixes como audio original sustituto.
- **Medios/licencias:** MIT cubre el código, no concede derechos sobre grabaciones o imágenes de terceros. Conservar procedencia y hashes; los medios incluidos fueron preparados para esta presentación.

## Verificación y evidencia

El cierre de Music/Versions aprobó 30 casos de navegador, 33 de API y 82 unitarios, TypeScript y build. Son pruebas focalizadas documentadas, no una afirmación de que cada suite histórica se haya repetido en este push. Capturas de 390/768/1024/1440 px en [reporte Music / Versions](project-music-versions-verification.md).

Los informes por área y contratos detallados están en [la guía de mantenimiento](manuel-demo-handoff.md); sus secciones históricas se interpretan en orden cronológico, prevaleciendo esta entrega y las secciones finales.

### Comprobaciones repetidas para esta publicación

- `pnpm build`: TypeScript, frontend y servidor aprobados; permanecen avisos no bloqueantes de sourcemaps y tamaño del bundle.
- `pnpm test`: 82/82.
- `pnpm test:seed`: 10/10, incluyendo instalación, hashes, ausencia de credenciales/sesiones e idempotencia de importadores.
- `node --test server/*.test.mjs`: 101/101 con FFmpeg/FFprobe configurados.
- `scripts/check-presentation.mjs`: 14 comprobaciones aprobadas sobre una instalación temporal del fixture versionado, incluyendo medios, privacidad, propuesta/aceptación, entrega/revisión, mensajes, finanzas, reinicio y restauración.
- Todos los archivos referenciados por el manifiesto están incluidos en Git. No hay archivos individuales mayores de 40 MiB ni bases activas/sesiones/secretos detectados en la selección de publicación. La única base versionada es el fixture saneado.

El ensayo activo en 4186 no se reinició ni se restauró para publicar; las verificaciones usaron directorios temporales.

Navegador sobre el fixture portátil: 7/8 casos pasaron en la tanda inicial; el de reproducción móvil se detuvo en el avance inicial. Se repitió **sin cambiar código ni expectativas**, dos veces, y pasó 2/2. Queda registrado como intermitencia de reproducción aún sin causa confirmada, no como una corrección nueva. Las ocho rutas probadas tienen ejecución aprobada; no se oculta el fallo inicial. Mantener esta prueba al modificar la carga de medios.
