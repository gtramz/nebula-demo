# Antiq Nebula · Presentation Demo

Repositorio independiente de la demo. **No reemplaza ni actualiza `gtramz/nebula_v1`.** Contiene el código actual, medios locales y un escenario ficticio reproducible con Sol Rivera, Artist/Investor, proyectos, canciones, colaboraciones y ejemplos de voz y percusión.

**Manuel: empieza por [el handoff de desarrollo](docs/manuel-demo-handoff.md).** Para presentar: [cuentas, controles y guion](docs/presentation-runbook.md). Para evidencias: [cierre funcional y audiovisual](docs/demo-close.md).

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
pnpm start
```

Abrir **http://127.0.0.1:4174**. Un solo servidor local sirve UI, API y medios. La demo inicia con **Sol Rivera**, sin completar onboarding de nuevo. Las instalaciones ya preparadas solo necesitan `pnpm start`.

No hacen falta claves, servicios cloud ni generación de medios. La primera instalación descarga dependencias; después de compilar y preparar, la presentación funciona sin internet, manteniendo el servidor local activo.

## Desarrollo y conservación

- UI: `artifacts/nebula/src`; estado/contratos: `lib/local/src`; servidor: `server`.
- Editar código → `pnpm build`; recargar el navegador. Reiniciar `pnpm start` si cambió el servidor.
- `pnpm dev` y `pnpm preview` conservan el prototipo aislado de navegador: **no son el entorno conectado de esta demo**.
- Otro puerto: `PORT=4186 pnpm start`. Usar el mismo `PORT` en los comandos de restauración.
- Los cambios del usuario viven en `.data/presentation`, excluido de Git. Preparar o reiniciar **no los sobrescribe**.
- Restaurar deliberadamente: `pnpm demo:reset`, con el servidor activo. Descarta las ediciones del ensayo y recupera el escenario preparado.
- `presentation/seed` contiene exclusivamente el fixture ficticio revisado. No incluye sesiones ni hashes de contraseñas. Al preparar se crean credenciales locales para las cuentas ficticias; su contraseña de demostración es `Nebula2026!`.

## Ejemplos audiovisuales

| Ejemplo | Original | Resultado público preparado | Oportunidad |
| --- | --- | --- | --- |
| Marea Alta + voz de Dante | `/discovery?post=post-13` | `/discovery?post=post-14` | `/messages/offer/13` |
| Afterglow + percusión de Inés | `/discovery?post=post-15` | `/discovery?post=post-16` | `/messages/offer/15` |

`/presentation` o **Cmd/Ctrl + Shift + P** abre las personas y controles internos. Los resultados públicos son colaboraciones ficticias aprobadas; los remixes nuevos siguen privados y enviar una propuesta no los publica.

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

Las pruebas de presentación crean copias desechables y usan el puerto 4177. Las suites integradas adicionales usan 4175; ejecutarlas secuencialmente. Ver [handoff](docs/manuel-demo-handoff.md) para el alcance y resultados de esta publicación.

## Límites

Esta es una simulación local: pagos, regalías y respuestas de otros personajes no representan dinero, contratos ni usuarios reales. Los controles de presentación permiten cambiar de persona sin contraseña y solo deben usarse en loopback. Publicar este código en GitHub no es desplegar la aplicación como servicio público. El `Dockerfile` histórico arranca el servidor estándar vacío, no esta presentación.

Los videos son generados, conservan su audio nativo y se mezclan localmente. Se verificaron señal, movimiento y recorridos; la valoración auditiva artística corresponde al presentador. Procedencia de los medios: `presentation/assets/manifest.json` y `presentation/media-provenance.json`.

El código conserva la licencia MIT existente; los medios CC0 conservan las atribuciones de su manifiesto. Este repo no contiene la cuenta real, archivos privados ni bases activas de la instalación de trabajo.
