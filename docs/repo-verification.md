# Verificación del repositorio independiente

Fecha: 9 de noviembre de 2026. Esta comprobación se hizo en una carpeta nueva, sin copiar `.git`, `node_modules`, builds ni `.data` de la instalación de trabajo.

## Preparación comprobada

- Instalación con `pnpm install --frozen-lockfile`: correcta; lockfile conservado.
- `pnpm demo:prepare`: TypeScript, build UI/servidor e instalación del escenario correctos.
- Fixture portátil: 9 cuentas ficticias, 16 publicaciones, 43 registros de medios y 4 tomas preparadas. Archivos verificados por SHA-256 antes de instalarlos.
- Test del instalador: correcto. Comprueba cuentas ficticias sin credenciales/sesiones en el fixture, creación local de credenciales, conservación de proyectos/perfiles, copia de medios, snapshot inicial, segunda preparación sin sobrescribir cambios y rechazo de directorios incompletos.
- Unitarias: **71/71**.
- Servidor: **86/86**, con datos temporales.
- Escenario/API: **14 comprobaciones** aprobadas, incluida restauración repetida, reinicio, privacidad, propuestas, mensajes e Investor.
- Navegador del clon: **8/8** recorridos aprobados en escritorio/móvil: voz, percusión, comparación, render, borrador, propuesta, recepción, aceptación en el mismo hilo y recorrido con tráfico externo bloqueado.
- Arranque real por CLI en un puerto temporal, identidad inicial Sol, login con la contraseña de demostración y ruta Discovery: correctos.

Las pruebas del clon se ejecutaron con Node 24.22.1, pnpm 11.21.0, Google Chrome y FFmpeg/FFprobe locales. Las rutas de esos binarios no son dependencias versionadas; en otro equipo se instalan y se encuentran en PATH o mediante las variables documentadas. No se modificó la instalación original que sigue en localhost:4174.

## Contenido publicado

El historial Git comienza en este repositorio; no se importó el historial anterior. `.data`, bases activas, sesiones, credenciales privadas, dependencias instaladas, builds y resultados temporales están excluidos. El único SQLite versionado es `presentation/seed/scene.sqlite`, saneado y compactado, con salts/hashes eliminados y tablas de sesión vacías. Las credenciales de demostración documentadas se generan al preparar.

Se revisó la lista de archivos y patrones de claves privadas/tokens; no se encontraron coincidencias. Las respuestas transitorias del generador no se publican; se conservan procedencia, créditos y assets locales. Ningún archivo supera el límite de 100 MB de GitHub; los medios explican la mayor parte del tamaño del repo.

Las evidencias funcionales anteriores de la propia demo están en [el reporte de cierre](demo-close.md). No se presentan como una nueva ejecución de todas las suites en este clon. El Dockerfile estándar no se probó como presentación; no se añadió despliegue público.

## Límites

Persisten los avisos de bundle grande/sourcemaps del build. La escucha artística humana y la prueba en un teléfono físico no se sustituyen por las mediciones y Chrome emulado. Publicar el repo no convierte sus personas ficticias ni sus controles de presentación en autenticación de producción.
