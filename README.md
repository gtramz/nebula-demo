# Antiq Nebula · Demo 2

Repositorio independiente de la demo. **No reemplaza ni actualiza `gtramz/nebula_v1`.** CHILZ es el personaje principal de la nueva presentación, con su catálogo visual dentro de Nebula. Sol Rivera, los personajes Artist/Investor y sus proyectos, canciones, conversaciones y ejemplos audiovisuales se conservan.

**Manuel: empieza por [la actualización acumulada de esta entrega](docs/manuel-update-2026-11-10.md) y [el handoff detallado](docs/manuel-demo-handoff.md).** Describe los contratos, los archivos que hay que editar, las funciones reales y las simulaciones. El [guion original de Sol](docs/presentation-runbook.md) y el [cierre audiovisual anterior](docs/demo-close.md) siguen sirviendo para esos ejemplos; no describen por sí solos la ampliación CHILZ.

## Qué incluye esta versión

- **Carga y preparación:** skeletons adaptados a páginas, listas, formularios y players. Las tarjetas de Home se revelan con su portada, identidad, tipografía y player preparados.
- **Discovery:** blob oficial animado durante un mínimo de cinco segundos mientras se prepara el primer contenido y el siguiente; autoplay exclusivo, controles de volumen y seek, sin botones visibles de play/pausa.
- **Oportunidades:** wizard de cinco pasos con validación, datos conservados al retroceder y transición del botón Continue a Blob Face antes de avanzar; el guardado usa los contratos existentes.
- **Navegación y demo:** menú lateral expandido por defecto, menús compactos de perfil y Create, indicadores de presión en Create/Julio y progreso de scroll en azul.
- **Proyectos Music / Versions:** canciones desplegables, ofertas compactas y remixes separados con comparación bajo demanda.
- **Forge:** recorrido de audio final preparado y guardado privado; apertura/retorno del DAW representados, sin conexión externa real. El video se crea en Nebula.
- **Discovery y creación:** experiencia móvil inmersiva y escritorio con comentarios laterales, Share interno/externo, reproducción exclusiva y creación guiada. Financiación opcional y tarjetas de Contributions.

- **Remix vertical 9:16:** 720 × 1280; dos videos en mitades iguales de 720 × 640, o el video propio a pantalla completa sobre un original de audio. Encuadre con arrastre, teclado y Reset framing; preview y exportación comparten geometría. Los resultados antiguos no se regeneran automáticamente.
- **Colaboración:** The opportunity → Your contribution → Preview your work → Review & send. Descarga autorizada de la referencia disponible, grabación real de audio/video, carga de archivos y tomas preparadas. Comparación, borrador y propuesta privados; Mix/Master permiten entregar el archivo completo.
- **CHILZ:** 10 lanzamientos y 14 canciones verificados en el perfil público indicado, con foto, portadas, duración y colaboradores. El catálogo de referencia usa un preview visual silencioso: transporte visual sin audio, descarga ni oportunidades económicas inventadas.
- **gramz:** el propietario existente de LUNA incorpora 11 proyectos de catálogo con previews silenciosos y 8 videos reales de YouTube/TikTok. No Pop y No Regrets tienen ofertas explícitas de demostración; gramz y CHILZ se siguen y comparten un chat aceptado inicialmente vacío. [Inventario y límites](docs/gramz-import-verification.md).
- **LUNA, ejemplo principal de remix:** original de gramz & SANNFERNNA y versión CHILZ con las grabaciones completas aportadas para esta demo (175.287438 s). Es un ejemplo de archivos terminados, no un render nuevo del estudio; el límite de 60 s del render interactivo se conserva. Es la excepción audible dentro del catálogo de presentación de CHILZ; los lanzamientos de referencia siguen siendo silenciosos.
- **Identidad visual:** blobs compartidos, avance de onboarding después del guardado real, estados de error, guiño en Home y avatar alternativo. Se respetan movimiento reducido, teclado y pasos opcionales.

## Arranque desde un clon nuevo

Requisitos: **Node 24.17+**, **pnpm 11.21.0**, **FFmpeg y FFprobe** disponibles en `PATH`.

```sh
git clone https://github.com/gtramz/nebula-demo.git
cd nebula-demo
corepack enable
corepack prepare pnpm@11.21.0 --activate
# Si tu instalación de Node no incluye Corepack: npm install --global pnpm@11.21.0
# Instala FFmpeg según tu sistema: macOS `brew install ffmpeg`; Debian/Ubuntu `sudo apt-get install ffmpeg`.
pnpm install --frozen-lockfile
pnpm demo:prepare
PORT=4186 pnpm start
```

Abrir **http://127.0.0.1:4186**. Un solo servidor local sirve UI, API y medios. El fixture nuevo tiene a **CHILZ** como personaje principal, sin repetir onboarding. Sol y los demás personajes están en `/presentation`. Las instalaciones ya preparadas solo necesitan el comando de arranque. Sin `PORT`, el puerto predeterminado sigue siendo 4174.

No hacen falta claves, servicios cloud ni generación de medios. La primera instalación descarga dependencias; después de compilar y preparar, la presentación funciona sin internet, manteniendo el servidor local activo.

## Desarrollo y conservación

- UI: `artifacts/nebula/src`; estado/contratos: `lib/local/src`; servidor: `server`.
- Editar código → `pnpm build`; recargar el navegador. Reiniciar `pnpm start` si cambió el servidor.
- `pnpm dev` y `pnpm preview` conservan el prototipo aislado de navegador: **no son el entorno conectado de esta demo**.
- Usar el mismo `PORT` en los comandos de arranque y restauración: por ejemplo, `PORT=4186 pnpm demo:reset`.
- Los cambios del usuario viven en `.data/presentation`, excluido de Git. Preparar o reiniciar **no los sobrescribe**.
- Restaurar deliberadamente: `pnpm demo:reset`, con el servidor activo. Descarta las ediciones del ensayo y recupera el escenario preparado.
- `presentation/seed` contiene el fixture de presentación revisado, no una copia de cuentas reales. No incluye sesiones ni hashes de contraseñas. Al preparar se crean credenciales locales para los personajes; su contraseña de demostración es `Nebula2026!`.
- Los importadores de CHILZ, LUNA y gramz son aditivos y explícitos; no ejecutarlos contra una base activa sin respaldo. Preparar o reiniciar no aplica silenciosamente un catálogo nuevo sobre un ensayo existente. Ver el [handoff](docs/manuel-demo-handoff.md#6-datos-qué-es-canónico-y-cómo-conservarlo).

## Ejemplos audiovisuales

| Ejemplo | Original | Resultado público preparado | Oportunidad |
| --- | --- | --- | --- |
| Marea Alta + voz de Dante | `/discovery?post=post-13` | `/discovery?post=post-14` | `/messages/offer/13` |
| Afterglow + percusión de Inés | `/discovery?post=post-15` | `/discovery?post=post-16` | `/messages/offer/15` |

`/presentation` o **Cmd/Ctrl + Shift + P** abre las personas y controles internos. Cambia a Sol para recorrer sus propuestas e historial preparados. Los resultados públicos precargados son ejemplos; los remixes nuevos siguen privados y enviar una propuesta no los publica. El enlace entre LUNA original y remix se obtiene de su mapa de presentación, sin depender de IDs de la cuenta real.

## Verificación

```sh
pnpm test:seed
pnpm test
pnpm test:server
pnpm build
pnpm demo:check
# Para las pruebas de navegador: instalar Google Chrome y el soporte de Playwright.
pnpm exec playwright install chromium
pnpm test:presentation
```

Las pruebas de presentación crean copias desechables y usan el puerto 4177. Las suites integradas adicionales usan 4175; ejecutarlas secuencialmente. El [handoff](docs/manuel-demo-handoff.md#8-checks-y-evidencia-de-esta-iteración) separa los resultados focalizados de esta iteración de las comprobaciones históricas y de la activación final.

## Límites

Esta es una simulación local: pagos, regalías y respuestas de otros personajes no representan dinero, contratos ni usuarios reales. Los controles de presentación permiten cambiar de persona sin contraseña y solo deben usarse en loopback. Publicar este código en GitHub no es desplegar la aplicación como servicio público. El `Dockerfile` histórico arranca el servidor estándar vacío, no esta presentación.

Los ejemplos Marea/Afterglow usan videos generados con audio propio y mezcla local. LUNA usa grabaciones aportadas por el usuario. La referencia visual de CHILZ se conserva en `presentation/chilz-catalog.json`, con fuentes y hashes de imágenes; `scripts/import-chilz-reference.py` es una herramienta de preparación, no una integración de Spotify en ejecución. No descarga música de Spotify. La valoración auditiva artística corresponde al presentador. Procedencia de los ejemplos originales: `presentation/assets/manifest.json` y `presentation/media-provenance.json`.

El código conserva la licencia MIT existente. Los medios mantienen sus condiciones de origen: la licencia del código no concede derechos sobre las imágenes del catálogo ni sobre las grabaciones aportadas. Los recursos CC0 conservan las atribuciones de su manifiesto. Este repo no contiene la cuenta real, sus sesiones ni bases activas de la instalación de trabajo; los archivos de presentación incluidos están identificados como tales.

Verificación de esta entrega: [Artist / CHILZ / LUNA](docs/artist-demo-verification.md).

## Última entrega

[Actualización del 11 de noviembre de 2026](docs/github-update-2026-11-11.md): handoff, proyectos y grabaciones, like animado, vinilo de Discovery, vista rápida, tarjetas de Home y ventanas al estilo Share. Los reportes enlazados incluyen capturas y resultados reales de validación.
