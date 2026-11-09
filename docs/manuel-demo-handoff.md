# Manuel · Nebula Demo: desarrollo y mantenimiento

Entrega: 9 de noviembre de 2026. Repositorio **nuevo e independiente**: `gtramz/nebula-demo`.

La base procede de `gtramz/nebula_v1`, revisión `e6a131d0ee40fdd956433a581c01e0187b702d23`, más los cambios locales de la presentación. No se modifica ese repositorio ni se copia su historial Git. Este documento describe la demo actual; los handoffs anteriores conservados en `docs/` son antecedentes, no una lista de tareas pendientes de esta entrega.

## 1. Qué recibes

- Código React + TypeScript + Tailwind, contratos compartidos y servidor local Node/SQLite.
- Escenario ficticio portátil: 9 cuentas (7 Artist y 2 Investor), 9 proyectos, 10 canciones y 16 publicaciones. Propuestas, mensajes, avisos, seguimientos y archivos asociados están preparados.
- Sol Rivera inicia conectado, con identidad, géneros, preferencias, proyecto propio, una propuesta privada preparada y solicitudes recibidas.
- Música, portadas y videos locales. No necesitas claves ni contratar generación de medios para presentar.
- Pruebas, capturas, grabaciones y manifiestos. La base real del usuario, sus sesiones, sus uploads y sus credenciales **no forman parte de este repo**.

## 2. Arranque y edición

Requisitos y comandos completos en [README](../README.md). Resumen:

```sh
pnpm install --frozen-lockfile
pnpm demo:prepare  # tipos + build UI/servidor + instalación del fixture
pnpm start        # http://127.0.0.1:4174
```

Node 24.17+ y pnpm 11.21.0. Instala FFmpeg/FFprobe en PATH; también puedes definir `NEBULA_FFMPEG_PATH` y `NEBULA_FFPROBE_PATH` como rutas absolutas. `corepack prepare pnpm@11.21.0 --activate` fija el gestor. Si Corepack no está instalado, instala pnpm 11.21.0 directamente.

Para cambiar la UI, editar el componente, ejecutar `pnpm build` y recargar. Para cambios del servidor, volver a compilar y reiniciar `pnpm start`. `pnpm dev` en 5173 y `pnpm preview` en 4173 conservan un prototipo aislado de navegador; no prueban el backend de la presentación. No cambiar silenciosamente de transporte para ocultar errores de API.

El puerto es configurable: `PORT=4186 pnpm start`; para restaurar en ese puerto, `PORT=4186 pnpm demo:reset`. El servidor de presentación solo escucha en loopback. El Dockerfile heredado corresponde al servidor estándar vacío; no es el comando para ejecutar esta demo.

## 3. Diferencias de la presentación respecto al repo anterior

La base ya tenía cuentas, perfil profesional, preferencias, Following, búsqueda contextual, canciones, mensajería y Remix privado. En esta copia se añadió o ajustó:

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

## 4. Mapa del código

| Área | Archivos / carpetas |
| --- | --- |
| Rutas y entrada UI | `artifacts/nebula/src/App.tsx`, `pages/` |
| Shell, navegación, retornos y guardas | `components/shell/` |
| Home, búsqueda, filtros y ordenación | `features/opportunities/`; contratos/lógica en `lib/local/src/opportunities.ts`, `opportunity-search.ts`; API en `server/app.ts`, `server/project-browser.ts` |
| Discovery, medios y acciones | `features/discovery/`, `pages/discovery.tsx`; rutas de publicaciones en `server/app.ts` |
| Un único medio activo / previews | `components/playback-coordinator.tsx`, `components/audio-preview.tsx` |
| Identidad, onboarding y preferencias | `features/artist-identity/`, `context/AuthContext.tsx`; `lib/local/src/store.ts` |
| Remix y motores | `features/remix/studio.tsx`, `audio.ts`, `video.ts`, `audio-comparison.tsx` |
| Propuestas, términos y revisión | `features/collaborations/index.tsx`, `opportunity-fields.tsx`, `proposal-preparation.tsx`; `server/collaborations.ts` |
| Mensajería y notificaciones | `features/messages/`, `features/notifications/`; módulos correspondientes de `server/` |
| Canciones y proyectos | `features/songs/`, `pages/project.tsx`, `pages/profile.tsx`; `server/works.ts` |
| Contratos y estado de dominio | `lib/local/src/` |
| API, autorización, medios y persistencia | `server/app.ts` y módulos de `server/` |
| Orquestación de la presentación | `server/presentation.ts`, `features/presentation/`, `scripts/presentation.mjs` |
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
| `/artist/:id` | Identidad pública y grafo social. |
| `/project/:id?song=:workId` | Proyecto y canción concreta; ofertas, referencia y contexto. |
| `/messages`, `/messages/offer/:id` | Inbox/Requests y preparación de propuesta. |
| `/messages/collaboration/:id` | Hilo de propuesta y trabajo; `/collaborations/:id` sigue siendo un alias válido. |
| `/remix/:id`, `/studio/remix` | Preparación desde un original y recuperación del trabajo privado. |
| `/notifications`, `/saved` | Avisos y colección privada. |
| `/pledges`, `/received` | Historial privado de aportaciones simuladas en USD. |
| `/presentation` | Personas y eventos internos; Cmd/Ctrl + Shift + P. |

La navegación de escritorio y móvil difiere en disposición, no en permisos. En móvil Received, More y Logout se recuperan desde Profile. Evitar duplicar accesos o reiniciar formularios al cambiar el ancho.

## 6. Datos: qué es canónico y cómo conservarlo

La demo activa vive en `.data/presentation/nebula.sqlite`, con `media/` y `prepared/`. SQLite contiene tanto el estado de cuentas/proyectos como las tablas de publicaciones, relaciones, propuestas, mensajes y notificaciones. Los archivos se sirven por rutas autorizadas; una URL de medio no sustituye una comprobación de permisos.

El fixture `presentation/seed/scene.sqlite` es una instantánea **ficticia y saneada**, no una base de usuarios. No contiene sesiones ni hashes/salts de contraseñas. Su manifiesto relaciona cada medio y toma con un archivo local y SHA-256; evita duplicar los mismos archivos en el repo. En la preparación se verifican las referencias, se generan hashes locales PBKDF2 y se crea `.data/presentation` de forma atómica.

- Preparar de nuevo o reiniciar conserva la base activa. Un directorio incompleto produce error, no se sobreescribe.
- `pnpm demo:reset`, con servidor activo, recupera `initial.sqlite`; es una acción explícita que descarta las ediciones del ensayo.
- Para cambiar deliberadamente el punto de restauración **local**, respaldar primero y ejecutar `node scripts/presentation.mjs checkpoint`. Esto no publica esos cambios en Git.
- Para modificar el catálogo compartido del repo, revisar una nueva instantánea ficticia y actualizar conjuntamente `scene.sqlite`, referencias/checksums del manifiesto y los archivos. No copiar una base de trabajo completa. Los IDs de `presentation/closing-scene.json` y los tests deben seguir correspondiendo al nuevo escenario.
- No añadir `.data`, bases activas, `.env`, sesiones ni archivos personales a Git. El único SQLite versionado permitido por `.gitignore` es el fixture revisado.

Las credenciales documentadas son de personajes públicos de prueba: `Nebula2026!`. En modo presentación también se puede cambiar de persona desde backstage. Esto es intencional para una demo local; no es autorización adecuada para alojar ese modo públicamente.

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

## 8. Checks para cambios

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

Verificación funcional previa: 71 unitarias, 86 de servidor, 38 regresiones focalizadas, 22 recorridos de presentación y 8 recorridos de video repetidos después del ajuste de sincronización. Las evidencias describen lo efectivamente medido, no una certificación auditiva humana. La comprobación específica del clon nuevo se registra en [verificación de publicación](repo-verification.md).

Mantener regresiones de sesión/logout y edición concurrente de perfil; búsqueda y filtros al cambiar cuenta; privacidad de borradores, mensajes y archivos; misma identidad de hilo al aceptar/rechazar; reproducción exclusiva; retorno a proyecto/publicación; conservación de datos tras recarga.

## 9. Límites y decisiones pendientes

- Pagos, regalías, acuerdos y eventos de los personajes son simulados. No hay movimiento de dinero ni contratos legales.
- Las cuentas y archivos se administran localmente; Antiq Central no está conectado en esta demo. No presentar este backend como su implementación definitiva.
- El orden de Home/Discovery utiliza reglas y preferencias locales, no un modelo de recomendación entrenado.
- FFmpeg/FFprobe deben estar instalados. Sin ellos puede fallar el análisis de waveforms; no inventar barras para ocultarlo.
- Los tests móviles usan Chrome emulado, no validación en un teléfono físico. Grabación con dispositivos requiere revisión en el dispositivo objetivo.
- Se verificaron señales, movimiento, mezcla y sincronización técnica. La afinación, fraseo y coherencia artística requieren escucha humana.
- El build conserva avisos de tamaño de bundle/sourcemaps. No bloquean los recorridos comprobados.
- No hay despliegue web público asociado al repositorio. Revisar arquitectura/autorización antes de transformar esta demo local en un servicio compartido.

Para cambios incrementales: modificar el componente o contrato existente, probar con copias temporales, actualizar este handoff si cambian reglas/rutas y conservar el escenario de presentación. No recuperar auditorías antiguas como evidencia del estado actual.
