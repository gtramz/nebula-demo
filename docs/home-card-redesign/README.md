# Artist Home cards

Rediseño del componente compartido de Home. Conserva títulos, portadas, grabaciones principales y datos reales; el catálogo de inversores mantiene su componente y estilos.

## Implementación

- Tarjetas de 24 px, portada estática inclinada y fondo derivado de la imagen cargada. Reutiliza extracción pequeña y caché de 64 entradas; portada ausente/fallida muestra placeholder y fondo oscuro.
- Dos columnas cuando el contenido disponible alcanza 760 px; una por debajo. Las tarjetas se igualan por fila y crecen con su contenido.
- Categoría, título, subtítulo real, artista/avatar y géneros. Reproductor existente, botón de 60 px (52 px en contenido de hasta 400 px), waveform y tiempos.
- Hasta dos oportunidades, compensaciones y canciones asociadas; contador de adicionales. Financiación y progreso solo cuando corresponden. Guardado, artista y View project conservan destinos/acciones independientes.
- Skeletons adaptados. Se conserva el contenido al actualizar y la preparación previa de recursos.
- Sin cambios de API, base de datos, filtros, ranking, paginación ni selección de grabaciones. Sin nuevos elementos de audio. Los ejemplos silenciosos del catálogo siguen siendo simulaciones.
- El único cambio compartido con Discovery amplía el tipo de las propiedades de AmbientArtwork; su ejecución no cambia. Los estilos nuevos están limitados a `.opportunity-home`.

## Validación

Las pruebas utilizan el servidor de presentación en 4177, que copia los datos a un directorio temporal. Los localhost de ensayo 4187 y 4188 no se reinician ni restablecen.

| Caso | Comprobación |
|---|---|
| Responsive | 375, 390, 430, 1280 y 1440 px; columnas según ancho real, alturas por fila y ausencia de desbordamiento |
| Contenido | Financiación, oportunidades, ambos o ninguno; más de dos necesidades; títulos largos |
| Fallbacks | Portada ausente/fallida, principal no disponible y error de waveform con seek funcional |
| Interacciones | Play/Pause, teclado, seek, hover, guardado sin desmontar el audio, artista, proyecto y regreso |
| Medios | Audio real, catálogo silencioso, video nativo y exclusividad de reproducción |
| Conservación | Catálogo inversor, Discovery y archivos/asociaciones protegidos |

Compilación y tipos: `pnpm build` aprobado (cliente y servidor). Permanecen los avisos de sourcemaps de Avatar/DropdownMenu y de tamaño del bundle, sin errores de compilación. Registro: [build.txt](build.txt).

Home: 16 casos aprobados y uno omitido por no aplicar a móvil en la corrida completa. El caso restante, hover, encontró un selector de prueba cubierto por el enlace extendido del proyecto; se corrigió para mover el cursor sobre la tarjeta y se comprobó de nuevo por separado. El registro de la corrida conserva ese fallo: [home-tests.txt](home-tests.txt).

Capturas de los datos de ensayo actuales, tomadas sin modificarlos: [375](captures/home-375.png), [390](captures/home-390.png), [430](captures/home-430.png), [1280](captures/home-1280.png), [1440](captures/home-1440.png). Los fixtures desechables de las pruebas pueden tener grabaciones principales distintas; el rediseño conserva la elección de cada conjunto de datos.

Protección: 15 hashes idénticos antes/después; filas completas de Luna y CHILZ Remix intactas; 27 publicaciones. Las tablas de canciones, asociaciones y selección principal coinciden con la copia inicial. Evidencia: [protection.json](protection.json), [antes](before-hashes.json), [después](after-hashes.json).

Ambos orígenes responden 200 y sirven `index-ArzMVlfl.css` e `index-DctTWOWr.js`: escritorio `http://127.0.0.1:4187/explore` y móvil `http://localhost:4188/explore`. La copia de seguridad local permanece en `.data/home-redesign/before.sqlite`. Base del trabajo: `01619c4a7353ca7901efc02f9cc3df38ede65003`.

## Resultado final por caso

**28 casos aprobados y 2 no aplicables a móvil**, combinando la corrida de Home y la reejecución específica. La última corrida: **12 aprobados, 2 omitidos**, sin fallos; incluye el hover corregido y las regresiones de Discovery. Registro: [regressions.txt](regressions.txt). Esto no equivale a ejecutar la suite completa del repositorio.

Discovery: vinilo ligado al estado real, play/pause, seek, buffering, pestaña oculta, cambio de pieza, likes en audio/video, comentarios, pausa manual al cerrar la vista rápida, foco y navegación por scroll, incluidas alturas fraccionarias e inercia de trackpad.

Comandos reproducibles:

```sh
pnpm build
pnpm exec playwright test --config playwright.presentation.config.ts home-playback home-recordings home-card-design --reporter=line
pnpm exec playwright test --config playwright.presentation.config.ts home-card-design discovery-audio-record discovery-scroll-regression discovery-project-preview discovery-like --grep 'desktop hover|record follows|fractional viewport|decaying|Escape and overlay|like morph on publication' --reporter=line
```

## Incidencias durante la comprobación

La primera pasada detectó colisiones con estilos antiguos, corregidas mediante selectores limitados a Home. Las pruebas móviles anteriores intentaban localizar controles accesibles de tarjetas todavía fuera del área de carga; ahora desplazan primero el contenedor, como hace el usuario. Las pruebas nuevas se ajustaron para esperar la preparación real del audio, proporcionar una meta válida al fixture de financiación y guardar mediante teclado sin activar accidentalmente el hover. Esas pasadas iniciales no se consideran aprobadas.

Permanece fuera de este cambio el fallo previo documentado de desplazamiento del control de volumen en videos de Discovery a 768 × 930 con comentarios abiertos. No se ejecutó toda la suite del repositorio ni una validación en dispositivos físicos.
