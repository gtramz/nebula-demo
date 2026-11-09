# Nebula — acabado y cuenta preparada

Entrega local, 9 de noviembre de 2026. Se conserva el catálogo y la actividad de Sol Rivera; no se publicó ni se envió esta copia a Manuel.

## Acceso y restauración

- `pnpm start` o `node scripts/presentation.mjs start`; abrir `http://127.0.0.1:4174`.
- Primera visita: Sol Rivera conectado, en Home. Perfil y preferencias editables, sin repetir onboarding.
- Sol: `sol.rivera@nebula.local` / `Nebula2026!`. Se conserva su identidad existente, biografía, roles, preferencias, proyecto Luz de regreso, conversaciones y borrador privado Afterglow. No se inventó una foto ni géneros donde sus datos estaban vacíos.
- `Cmd/Ctrl+Shift+P` abre backstage: personas, eventos, modo y **Restore prepared scene**. `pnpm demo:reset` restaura lo mismo desde terminal. Las sesiones abiertas vuelven a Sol al recargar después de una restauración explícita.
- Cerrar sesión permanece cerrado; navegar, cambiar persona o reiniciar el servidor no restaura datos. Investor conserva su identidad y recorrido.
- `node scripts/presentation.mjs checkpoint` reemplaza deliberadamente el punto de restauración con el estado actual. No es necesario para presentar; respaldar antes de utilizarlo.

## Recuperación acotada y accesos

| Capacidad | Resultado y acceso |
|---|---|
| Perfil editable | El editor existía, pero estaba enterrado en el dashboard. Ahora **Profile → Edit profile** es visible al entrar. Incluye imagen, nombre, bio, roles/géneros múltiples, disponibilidad, enlaces, información profesional y preferencias privadas. Guardar confirma el cambio efectivo; cancelar no guarda. |
| Proyectos propios | **Profile → My Projects**, edición visible permanentemente; no depende de hover. Oportunidades y canciones mantienen sus editores. |
| Publicaciones, proyectos y borradores | Shortcut **+** conservado: publicar audio/video, crear proyecto, continuar publicación, Remix y propuesta privados. No se introdujo un segundo editor. |
| Saved | Sidebar en escritorio, perfil/More en móvil. Tarjeta con portada compacta, waveform real, reproducción, acceso al original y eliminación independientes. |
| Seguimientos | Perfil público, seguidores/seguidos y Home → Following siguen conectados al estado común. No se muestra Follow hacia uno mismo. |
| Colaboraciones | Received, Messages, notificaciones y solicitudes conservados. Propuesta y términos se envían juntos; aceptación habilita chat en el mismo hilo; rechazo conserva respuesta y cierra el envío. |
| Remix y propuesta | Original, aporte y resultado mantienen comparación sincronizada, render real y borradores privados. Envío y permisos no se reemplazaron por éxitos visuales. |
| Onboarding | Registro y cuatro pasos originales conservados para otra cuenta. Se eliminó el retraso decorativo entre pasos del registro. Identidad y preferencias comparten el editor y almacenamiento del perfil. |

No se encontró una función eliminada que exigiera reconstruir el producto ni una dependencia externa que fuera necesaria para estos recorridos. Se corrigieron accesos, conexión de previews/personalización y restauración; no se redujo el inventario existente.

## Música y composición visual

- Home: una tarjeta por proyecto, portada pequeña, tipo/géneros, muestra identificada, waveform de audio decodificado, tiempo/seek, hasta dos ofertas con su propia compensación y enlace al resto. Financiación secundaria. Dos columnas con el ancho útil de portátil, una en móvil. Reproducir/guardar no navegan.
- Las referencias de oportunidades sólo se exponen en proyectos públicos. Si se usa una referencia en vez de una publicación, se identifica como **Reference**. Una muestra de otra canción conserva su título. No se crea un reproductor falso cuando no hay audio.
- Coordinador común: una sola reproducción, incluso si el otro video está silenciado. Salir o esconder el medio lo pausa.
- Discovery audio: portada controlada, composición musical propia, título y controles visibles, comentarios integrados. El video conserva proporción y sonido. Abrir comentarios mantiene posición/medio.
- Perfil: gestión clara y editor compacto; perfil público con portada pequeña, selección de pistas, waveform y controles; pestañas originales intactas.
- Proyecto: cabecera más baja, preview real y financiación sin solapamientos. Search reutiliza la reproducción con acciones separadas. Saved tiene jerarquía y separación de acciones consistentes. Se conservaron Messages y Remix y se redujeron contenedores redundantes en preparación de propuesta.
- Home prioriza oportunidades profesionales; Discovery ordena por preferencias de escucha y Following por relaciones. Editar preferencias invalida el feed sin sobrescribir filtros ni datos de otras cuentas.

## Video de Marea Alta

Generación autorizada de **53 créditos**, Yapper / MiniMax H3 Singularity. Clip de interpretación con dos músicos ficticios, manos/cuerpos/cámara en movimiento; no es una portada animada. Fuente generada 1088×1920; versión final vertical de 10 segundos, H.264 y AAC, con un fragmento de la pista Marea Alta integrado localmente.

- Discovery: post 11, **Marea Alta — rooftop session**, mismo propietario/proyecto, comentarios y likes conservados.
- Archivo: `presentation/assets/video/marea-session.mp4`; poster y waveform al lado.
- Procedencia: `presentation/marea-video-job.json` y manifiesto de assets.
- Ensamblado reproducible sin cobros: `python3 scripts/integrate-marea-video.py`.
- El finalizador anterior ya no reemplaza el clip por el visualizador de portada.

## Verificación

- Build de producción y TypeScript: correctos. Permanecen avisos no bloqueantes de sourcemaps y tamaño del bundle de Vite.
- **86 pruebas de servidor** correctas; después del ajuste de restauración se repitieron las **6** pruebas de presentación/pulido implicadas, correctas.
- **14 pruebas de presentación** correctas en escritorio/móvil: edición y cancelación, personalización, reproducción y seek independientes, guardados (incluida invalidación inmediata al quitar desde Saved, comprobada de nuevo en dos pruebas), historial, propuesta preparada, aceptación/chat, rechazo/respuesta, restauración repetida, Investor, video con sonido y recorrido Remix con tráfico externo bloqueado.
- **8 pruebas de identidad/onboarding/perfil** correctas después del cambio de registro y subida de imagen. Tras compactar el reproductor público se repitieron sus **6** pruebas de ciclo de perfil, correctas. Taxonomías: **4** pruebas correctas durante este acabado.
- **11 medios locales** verificados: decodificación, duración y waveforms; seis retratos, ocho portadas y dos conjuntos Remix disponibles.
- Ensayo visual real en 1366×768, 1440×900 y 390×844: Home, Discovery/audio/video/comentarios, perfil propio/editor/ajeno, proyecto, preparación de propuesta, Remix, Messages, Saved, Search y onboarding secundario. Capturas inspeccionadas en `verification/polish/`.
- QA con mutaciones en bases temporales; el mundo activo conserva la preparación de Sol. Backups antes de intervenir: `.data/polish-backups/20261109-110605/` y `.data/video-backups/20261109-112059/`.

## Capturas

- `verification/polish/home-before.png` y `home-1366.png`
- `verification/polish/discovery-before.png`, `discovery-1366.png`, `marea-video.png`, `discovery-mobile.png`, `comments-mobile.png`
- `verification/polish/profile-1366.png`, `editor-1366.png`, `artist-1440.png`, `artist-mobile.png`
- `verification/polish/project-1440.png`, `proposal-1440.png`, `remix-1440.png`, `messages-1440.png`, `saved-1440.png`, `search-1440.png`, `onboarding-1440.png`

## Límites de la simulación

Pagos y respuestas de otros artistas son locales y persistentes; no hay dinero, mensajes externos ni generación durante la presentación. No falta el video solicitado. La cuenta Sol tenía imagen y géneros sin configurar y se preservaron así; son editables. Las pruebas verifican señal y reproducción, no sustituyen una audición artística humana ni certifican sincronía exacta de dedos con notas en el video generado. Se comprobó móvil mediante viewport; no se ensayó un teclado físico de teléfono. Micrófono/cámara reales necesitan permiso del navegador. Las reglas de Remix privado y demás límites previos siguen descritos en `presentation-runbook.md`.
