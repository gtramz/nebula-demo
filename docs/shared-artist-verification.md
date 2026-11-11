# Perfiles y proyectos Artist: diseño común

Entrega local — 9 de noviembre de 2026. Repositorio: `nebula-demo`.

## Resultado

- Overview como entrada del perfil público; mantiene Music, Discovery Posts, Projects, Collaborations y About.
- Resumen con música destacada, cuatro lanzamientos del catálogo cuando existen, proyectos musicales y oportunidades reales. Accesos al contenido completo con foco en la pestaña elegida.
- Portadas grandes compartidas entre artistas; categorías, estados, ofertas y financiación conservan sus datos. No se presenta un proyecto en desarrollo como un lanzamiento verificado.
- Music integra catálogo y publicaciones musicales. La publicación destacada de LUNA se excluye de la lista adicional para evitar dos reproductores de la misma publicación.
- Detalle común de proyecto: contexto, canciones, música, ofertas por canción y por proyecto, comunidad y financiación. Las ofertas del catálogo ya no quedan ocultas por una página especial.
- Selección de canción del catálogo, pista musical y pestaña del perfil conservadas al regresar. Restauración del scroll real de `body` además de los contenedores existentes.
- LUNA conserva grabaciones suministradas, atribución y comparación A/B. El catálogo Spotify sigue identificado como preview silencioso.

## Cambios de implementación

Rutas, APIs y esquema de almacenamiento sin cambios. No se añadieron dependencias.

- `artifacts/nebula/src/pages/artist.tsx`: composición común del perfil y Overview.
- `artifacts/nebula/src/features/artist-identity/project-grid.tsx`: tarjetas de portadas exclusivas del perfil público; Home y los componentes de Investor no se rediseñaron.
- `artifacts/nebula/src/features/artist-identity/public-profile.tsx` y `.css`: reproducción reutilizada, selección conservada, destacado y exclusión de la publicación ya destacada.
- `artifacts/nebula/src/features/presentation/catalog.tsx`: catálogo resumible; módulos `CatalogSongs` y `RecordingDetails` integrados en el detalle normal.
- `artifacts/nebula/src/pages/project.tsx`: estructura común, financiación solo con objetivo real; mantiene el retorno contextual y el fallback previo de proyectos normales.
- `artifacts/nebula/src/features/songs/index.tsx`: exportación del componente existente de publicaciones por canción para reutilizarlo en el catálogo.
- `artifacts/nebula/src/features/discovery/project-community.tsx`: exclusión opcional del reproductor ya destacado; no cambia Discovery ni sus interacciones.
- `artifacts/nebula/src/components/shell/return-context.tsx`: captura y restauración del scroll de `body`.
- `server/app.ts`: en modo presentación, la limpieza de archivos al arrancar protege las referencias del escenario inicial además de las activas.

Pruebas nuevas en `tests-presentation/shared-artist.spec.ts` y `server/presentation.test.mjs`. Se actualizaron las expectativas de Overview, los selectores de botones ya renombrados antes de esta entrega y el estado de búsqueda para distinguirlo de los avisos de guardado; se conservaron las comprobaciones funcionales y de privacidad.

## Protección de datos

Respaldo completo previo: `.data/backups/before-shared-artist-20261109-165126`.

Se compararon exactamente las filas de 27 tablas, excluyendo sesiones, límites de frecuencia, snapshots temporales de feed y la tabla interna de secuencias. También se compararon los hashes de los 53 archivos existentes de medios/preparación. Sin diferencias antes y después del reinicio. Cuentas, proyectos, publicaciones, ofertas, conversaciones y registros de medios permanecen intactos.

Se detectaron cuatro archivos del escenario inicial de LUNA que faltaban antes de esta entrega. El ensayo activo conservaba sus propias copias con otros IDs. Se recuperaron exclusivamente las copias faltantes desde los assets locales suministrados, verificando tamaño y hash, sin modificar ninguna base de datos. La protección de arranque evita que esas copias vuelvan a eliminarse por no figurar en la base activa. Prueba adicional: el archivo protegido no se sirve antes de restaurar su registro; los archivos huérfanos reales siguen limpiándose.

Evidencia local: `.data/shared-artist-preservation.json`.

## Límites conservados

- La discografía verificada procede del catálogo de presentación; no existe todavía un modelo general de lanzamientos verificados para todos los artistas.
- No hay un editor nuevo de destacados: se conserva LUNA en sus perfiles de ejemplo y el primer audio elegible del orden actual en el resto.
- Los créditos de LUNA pertenecen al ejemplo autorizado. No convierten colaboraciones privadas en créditos públicos ni crean acuerdos o regalías.
- Los previews del catálogo no contienen música de Spotify ni habilitan descargas o mezclas ficticias.
- La preferencia de pestaña y reproducción seleccionada es contexto local de navegación, no sincronización entre dispositivos.
- Los recorridos móviles se verifican con Chrome emulado, no en teléfonos físicos.
- La compilación conserva los avisos anteriores de sourcemaps y tamaño del bundle.

## Verificación final

| Grupo | Resultado final |
|---|---|
| Unitarias (`pnpm test`) | 81/81 |
| API/servidor (`node --test server/*.test.mjs`) | 89/89 |
| Catálogo y perfiles compartidos, escritorio/móvil | 12/12 |
| Regresiones compartidas, 16 archivos | 95/96 |
| Mensajería y propuestas desde ambos participantes | 6/6 |
| Remix: tres formatos, archivos exportados, encuadre, borrador y propuesta | 14/14 |
| TypeScript, frontend de producción y servidor (`pnpm build`) | Correctos |
| `git diff --check` | Correcto |

Total de casos distintos ejecutados: **298; 297 pasan y 1 conserva un hallazgo de foco de Discovery móvil**. Los resultados compartidos combinan la ejecución inicial con las últimas repeticiones de los archivos afectados; no cuentan las repeticiones como casos nuevos.

Las regresiones incluyen autenticación, onboarding, identidad Artist, cambios de cuenta y preferencias privadas, Following, Home/For You/búsqueda/filtros/géneros, navegación, publicaciones, canciones y propuestas, retorno contextual, Investor y privacidad del historial en USD. Se usaron bases temporales independientes del ensayo activo.

Los nuevos escenarios comparan CHILZ, Sol, gramz y SANNFERNNA en 390, 768, 1024 y 1440 px; la suite de perfiles cubre además artistas sin contenido. Verifican navegación por teclado, restauración de pestaña y scroll, exclusión de publicaciones privadas, nuevas publicaciones reales junto al catálogo, controles del propietario y oportunidades por canción en lanzamientos del catálogo. La financiación se probó con registros temporales, sin inventar ofertas para CHILZ en el ensayo.

Se actualizaron expectativas antiguas de las pruebas: nombres actuales de botones, oportunidades compactas de Home y comentarios integrados de la demo. Los comentarios integrados conservan la reproducción; el panel Send la pausa. Se conservan las comprobaciones de privacidad, contenido plano, guardados y aislamiento de cuentas.

### Hallazgo pendiente, fuera del diseño solicitado

`tests-shared/social.spec.ts`, caso móvil «persistent interactions…»: después de publicar un comentario y cerrar el panel con Escape, el panel se cierra, pero falla la comprobación de foco en el botón Comments. El caso equivalente de escritorio pasa. La implementación de Discovery guarda `document.activeElement` al abrir el panel (`artifacts/nebula/src/pages/discovery.tsx`, `opener`) y no se modificó en esta entrega. Debe revisarse específicamente el retorno de foco en el recorrido táctil/teclado; no se eliminó la expectativa ni se declara esta regresión aprobada.

La última ejecución conjunta de canciones/social pasó **9/10**; canciones y el historial financiero pasaron en ambos tamaños. El único fallo pendiente no afecta los nuevos módulos de perfil/proyecto, pero impide declarar toda la regresión sin incidencias.

### Evidencia y activación

- `.data/shared-artist-unit.log`, `.data/shared-artist-api.log`, `.data/shared-artist-build.log`.
- `.data/shared-artist-browser-final.log` y `.data/shared-artist-verified/`.
- `.data/shared-artist-regressions-final.log`: ejecución inicial.
- `.data/shared-artist-followup.log`: repeticiones y mensajería/Remix.
- `.data/shared-artist-final-two/`: última ejecución de canciones/social, con traza del hallazgo móvil.
- `.data/shared-artist-preservation.json`: comparación posterior al reinicio.

Versión compilada activa en `http://127.0.0.1:4186`. Perfil principal: `/artist/21`; Sol: `/artist/19`. Sin push ni cambios al repositorio anterior en esta entrega.
