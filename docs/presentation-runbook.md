# Nebula · Guion de presentación

Demo local independiente. Código y escenario ficticio se distribuyen en `gtramz/nebula-demo`. [Instalación](../README.md) · [Handoff para Manuel](manuel-demo-handoff.md) · [Evidencias](demo-close.md).

## Preparación y arranque

En el primer clon: `pnpm install --frozen-lockfile`, `pnpm demo:prepare`, `pnpm start`. Instalar antes Node 24.17+, pnpm 11.21.0 y FFmpeg/FFprobe. Abrir http://127.0.0.1:4174. No hacen falta servicios ni claves externas.

Después basta `pnpm start`. Sol Rivera inicia conectado, con roles, géneros, preferencias, proyecto propio y trabajo preparado. Recargar o reiniciar conserva las ediciones. El registro/onboarding queda disponible como recorrido secundario.

Para otro puerto: `PORT=4186 pnpm start`. `pnpm demo:reset` (con el mismo PORT si se cambió) restaura explícitamente el escenario inicial y descarta las ediciones del ensayo; el servidor debe estar activo. No usar reset para recuperar una pantalla o arreglar una consulta.

## Controles internos

`/presentation`, Cmd+Shift+P en Mac o Ctrl+Shift+P:

- **Guided:** reacciones activadas manualmente, modo inicial.
- **Autonomous:** evalúa eventos elegibles cada cinco segundos, tras al menos diez segundos desde el cambio. No necesita otro navegador.
- **Switch persona:** cambia de cuenta y perspectiva sin borrar el mundo compartido.
- **Accept / Reject / Reply / Delivery:** actúan sobre solicitudes y colaboraciones elegibles con personajes del catálogo. Un reintento no duplica el evento.
- **Incoming:** prepara una solicitud sobre una oportunidad pública compatible de un Artist nuevo o Sol.
- **Musical collaborations:** accesos a los dos originales, sus resultados y ofertas.
- **Start a new artist:** registro y onboarding de otra cuenta.
- **Restore prepared scene:** confirmación explícita para restaurar Sol, su escena y borradores. Recargar las otras pestañas tras restaurar.

Cerrar sesión permanece cerrado; no es equivalente a restaurar. La contraseña compartida siguiente es solo para estas cuentas ficticias y conocidas.

## Cuentas

Contraseña compartida de las cuentas ficticias: `Nebula2026!`.

| Persona | Email | Enfoque |
| --- | --- | --- |
| **Sol Rivera (principal)** | **sol.rivera@nebula.local** | **Vocalista/productor, Luz de regreso, actividad y propuesta privada preparadas** |
| Lía Soren | lia@nebula.local | R&B, Afterglow, Blue Hour |
| Dante Vela | dante@nebula.local | Hip-hop, Concreto |
| Mara Voss | mara@nebula.local | Electrónica, Low Tide, Night Bloom |
| Club Marea | marea@nebula.local | Electrónica, Marea Alta |
| Inés Prado | ines@nebula.local | Indie y jazz, Glasshouse |
| Gael Ríos | gael@nebula.local | Producción y mezcla, Meridian |
| Elena Costa | elena@nebula.local | Investor |
| Noah Bennett | noah@nebula.local | Investor |


El fixture contiene 9 cuentas, 9 proyectos, 10 canciones y 16 publicaciones, con propuestas, mensajes, avisos, likes y relaciones preparadas.

## Guion principal, 8–12 minutos

1. Mostrar Sol y **Edit profile**; guardar un cambio y comprobarlo. Ir a Home, escuchar el preview de una tarjeta, combinar búsqueda y filtros.
2. Abrir **Marea Alta**, proyecto 12/canción 4. Original: `/discovery?post=post-13`; colaboración con voz: `/discovery?post=post-14`. Comparar Original / Your version en la misma posición; activar sonido cuando el video comienza silenciado.
3. Abrir la oportunidad de Verse `/messages/offer/13`. **Use prepared take → Render proposal**, escuchar, escribir introducción/propuesta y confirmar condiciones. Se puede guardar un borrador privado antes de enviar.
4. Enviar la solicitud. Cambiar a **Club Marea**, abrir la notificación, revisar original y propuesta, aceptar y conversar en ese mismo hilo. Para rechazo, usar otra solicitud y una respuesta opcional.
5. Mostrar el segundo conjunto: **Afterglow**, proyecto 9/canción 1. Original `/discovery?post=post-15`; resultado de percusión `/discovery?post=post-16`; oportunidad `/messages/offer/15` (USD 300). La aportación y la mezcla son distintas al caso vocal.
6. Volver a **Sol**: `/messages/collaboration/10` contiene una solicitud audiovisual recibida de Inés sobre su proyecto **Luz de regreso** (20/canción 10). Revisar y decidir desde ese lado.
7. Abrir un original → **Remix**, cargar la toma preparada, construir preview, comparar, guardar borrador y recuperar desde el estudio. El resultado nuevo sigue privado.
8. Mostrar comentarios contextuales, guardar/recuperar en Saved y Follow/Unfollow. **Create** permite crear proyecto/canción/oferta o publicación/borrador.
9. Recorrido secundario: Elena (Investor), aportación simulada, recibo e historial. Onboarding de otro Artist si se quiere mostrar el registro.

Los hilos 8 y 9 son antecedentes aprobados de los ejemplos públicos, no solicitudes nuevas. La propuesta privada anterior para la oferta 1 también se conserva. No asumir que todas las ofertas antiguas siguen abiertas.

## Medios

Los dos casos nuevos están descritos en `presentation/closing-scene.json` y `presentation/assets/audiovisual-sets.json`. La voz utiliza 7.8 segundos limpios del clip generado; percusión, 10 segundos. Ambos conservan audio nativo y se mezclan con la referencia correcta. El video histórico del post 11 es un montaje anterior, no la evidencia del caso nuevo.

El botón preparado carga archivos locales y el motor renderiza de verdad los ajustes; no cobra ni llama a servicios de IA. También se pueden subir archivos propios y usar cámara/micrófono con permisos. Comparar medios no significa aprobación de una colaboración ni asignación de regalías.

## Persistencia y restauración

Estado activo: `.data/presentation/nebula.sqlite`, `media/`, `prepared/`. Snapshot restaurable: `initial.sqlite`. Hacer respaldo consistente antes de cambiarlo. `node scripts/presentation.mjs checkpoint` convierte deliberadamente la escena local actual en el punto de restauración; no cambia el fixture público del repo. Los datos activos están excluidos de Git.

Para terminar un ensayo limpio, restaurar explícitamente y recargar. No se borra actividad simplemente al navegar o cambiar de persona.

## Límites

Cuentas, pagos, regalías y reacciones de otros personajes son ficticios. La entrega automática reutiliza su portafolio; no genera una nueva interpretación musical. Los remixes públicos precargados representan colaboraciones aprobadas; una propuesta nueva no se publica en Discovery.

La aplicación funciona localmente sin internet una vez preparada. No expone Antiq Central ni integra pagos o servicios externos. La revisión de señal/movimiento no equivale a escucha humana: probar los ejemplos con sonido antes de la presentación. Chrome móvil emulado no sustituye validar un dispositivo físico.
