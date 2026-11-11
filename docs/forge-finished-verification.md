# Forge y audio final — verificación del 10 de noviembre de 2026

Entrega activa en `http://127.0.0.1:4186`, bundle `index-DgYPVpUq.js`. Solo `nebula-demo`; no se hizo push ni se modificó el repositorio anterior.

## Resultado

- Audio: Original → Open Forge → Review your version → Save your version. Original y versión completos, una reproducción a la vez, sin creación/mezcla de audio dentro de Nebula.
- Video: fragmento, grabación/carga, encuadre, mezcla, render, borrador y propuesta permanecen funcionales.
- Forge/Antiq/DAW son una representación integrada de la futura transferencia. No se ejecutan aplicaciones externas. Los archivos preparados se copian realmente a un borrador privado.
- LUNA completa (~175.29 s), Marea Alta, Afterglow y Afterglow · rhythm sketch tienen resultados asociados. Sin resultado no se ofrece audio inventado.
- Borradores de audio anteriores: recuperación, reproducción y descarga; Forge inicia una versión separada.

## Pruebas

**34 pruebas API/servidor/fixture aprobadas:** `server/app.test.mjs`, `server/video-framing.test.mjs`, `server/proposal-preparation.test.mjs`, `server/presentation.test.mjs`, `server/finished-audio.test.mjs` y `scripts/presentation-seed.test.mjs`.

Cubren cuentas, permisos, historial, publicaciones, borradores y propuestas privadas, fuente/revisión, concurrencia y respuesta perdida, reinicio, permisos revocados, archivos ajenos, inversor/visitante, manipulación de origen, error de guardado con rollback y limpieza, instalación nueva e idempotencia. La prueba de fallo inyectado registra intencionalmente `test write failure`; verifica que no sobrevivan ni el archivo ni los metadatos.

**34 pruebas de navegador aprobadas, Chrome escritorio y móvil:** todas las de `forge-final.spec.ts`, `guided-workspaces.spec.ts` y `return-navigation.spec.ts`, más las tres regresiones pertinentes de `adaptive-remix.spec.ts` (mitades/transporte/redimensionado, fallback/revisión privada y pantalla completa/orientación).

Verifican LUNA completa, ausencia de creación de audio, comparación exclusiva, recepción fallida/reintento, versión no disponible, propuesta y recepción por el propietario, recuperación de archivos antiguos, permisos de cámara denegados con carga alternativa, grabación y liberación de dispositivos, audio+video, revisión entre pestañas, estado de sesión bloqueado, teclado, regreso, colaboración y archivo final privado. Se repitió el caso LUNA tras añadir la confirmación de cambios sin guardar al elegir un nuevo recorrido de video y terminar las capturas: aprobado en ambos dispositivos.

**TypeScript y build aprobados:** `tsc --build`, `tsc --noEmit -p artifacts/nebula/tsconfig.json`, `tsc -p server/tsconfig.json`, Vite build. Continúan los avisos previos de sourcemaps en Avatar/Dropdown y tamaño del bundle (>500 kB); no impiden la compilación.

Se revisaron 390, 768, 1024 y 1440 px, además de 650 px de altura; sin desbordamiento horizontal y con controles inferiores accesibles. Capturas en [images/forge-finished](images/forge-finished):

- [Original móvil](images/forge-finished/forge-original-390.png)
- [Forge móvil](images/forge-finished/forge-workspace-390.png)
- [Original escritorio](images/forge-finished/forge-original-1440.png)
- [Forge escritorio](images/forge-finished/forge-workspace-1440.png)
- [Guardado](images/forge-finished/forge-saved.png)
- [Video móvil](images/forge-finished/split-390.png)
- [Video escritorio](images/forge-finished/split-1440.png)

## Preservación y activación

Respaldo local: `.data/backups/forge-final-20261110-193205/`, con SQLite activo, baseline, fixture portátil, medios, archivos preparados y manifiesto SHA-256. Comparación final: `verification.json` en ese directorio.

- Se compararon 33 tablas activas y 31 en cada baseline/fixture.
- Cuentas, proyectos, canciones, posts, relaciones, mensajes, propuestas, borradores e historial anteriores permanecen iguales.
- Los archivos anteriores conservan sus hashes. No se alteraron LUNA ni sus créditos.
- Solo se añadió `forge-results-v1` a `presentation_settings` y cuatro archivos a `prepared`. `feed_snapshots` y `rate_limits` reflejan la actividad normal del servidor; no son contenido de cuentas.
- La preparación se ejecutó dos veces sin duplicar contenido. El fixture portátil instaló correctamente sus medios y conserva las credenciales fuera del archivo distribuido.
- Reiniciado únicamente el proceso de presentación en 4186. La verificación final del frontend fue de solo lectura.

## Archivos principales

- Contrato: `lib/local/src/remix-drafts.ts`.
- Servidor: `server/finished-audio.ts`, `server/remix-drafts.ts`, `server/presentation.ts`, `server/app.ts`.
- Interfaz: `features/remix/forge-studio.tsx`, `index.tsx`, `draft-api.ts`, `studio.tsx`; `features/presentation/index.tsx`; `components/guided/journey.tsx` y `journey.css`, bajo `artifacts/nebula/src`.
- Escenario: `scripts/presentation-forge.py`, `presentation/assets/audio/afterglow-percussion-final.m4a`, `presentation/seed/manifest.json`, `presentation/seed/scene.sqlite`.
- Pruebas: nuevo `server/finished-audio.test.mjs`, nuevo `tests-presentation/forge-final.spec.ts`; ajustes de expectativas de Forge en `guided-workspaces.spec.ts` y `return-navigation.spec.ts`.
- Guía: sección “Forge: audio final y creación de video” de `docs/manuel-demo-handoff.md`.

## Límites pendientes

No hay conexión operativa con Forge, Antiq Central ni un DAW. Solo se reciben resultados registrados en el escenario local. La integración real necesita autenticación y autorización entre productos, despacho al DAW, identidad/revisión de trabajos y retorno autenticado del resultado. No hay nuevos endpoints, tablas, dependencias ni migraciones.
