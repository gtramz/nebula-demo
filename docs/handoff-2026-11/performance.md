# Rendimiento medido

Chrome `Chrome/157.0.8103.39`, viewport 1440×900, Node 24.17, localhost 127.0.0.1:4177. Misma máquina y snapshot de presentación. Un recorrido por condición; sin throttling. Frío significa caché HTTP del navegador borrada con CDP, no caché del sistema operativo vacía. Cada entrada espera un control/contenido útil específico de la ruta y luego observa 1500 ms.

La primera referencia se tomó antes de editar. Para mejorar el criterio de disponibilidad, se repitió sobre una reconstrucción aislada de `b9cbf60` + el diff local respaldado, equivalente al código de `70644c0`. El candidato corresponde al código de `2f5b782`. Ambos JSON incluyen versión de navegador, tiempos, consultas, commits de React, medios y navegación. Las capturas antes/después usan las mismas rutas.

## Tiempo hasta el contenido interactivo (ms)

| Ruta | Frío antes | Frío después | Caché antes | Caché después |
|---|---:|---:|---:|---:|
| `/explore` | 5478 | 6022 | 5488 | 5457 |
| `/artist/21` | 2400 | 2404 | 2424 | 2399 |
| `/search` | 92 | 100 | 104 | 105 |
| `/messages` | 250 | 367 | 249 | 371 |
| `/received` | 269 | 258 | 255 | 258 |
| `/saved` | 180 | 151 | 165 | 152 |
| `/publish` | 92 | 101 | 102 | 110 |
| `/profile?create=project` | 100 | 98 | 107 | 94 |
| `/discovery?post=post-11` | 6470 | 6396 | 6405 | 6420 |

Discovery conserva un mínimo intencional de 5000 ms dentro de esos tiempos. El resto observado es tiempo de pared: no debe interpretarse como CPU ni sumarse a la carga de recursos, que puede transcurrir durante la espera. El campo `elapsedMs` de los JSON añade los 1500 ms de observación; `interactiveMs` no los incluye.

## Trabajo observado durante cada entrada

| Ruta | Consultas API antes → después (frío / caché) | Commits React antes → después (frío / caché) |
|---|---|---|
| `/explore` | 19 → 15 / 19 → 15 | 41 → 43 / 42 → 42 |
| `/artist/21` | 9 → 9 / 9 → 8 | 15 → 18 / 16 → 17 |
| `/search` | 2 → 2 / 2 → 2 | 7 → 7 / 7 → 7 |
| `/messages` | 3 → 3 / 3 → 3 | 8 → 8 / 8 → 8 |
| `/received` | 4 → 4 / 4 → 4 | 9 → 9 / 9 → 9 |
| `/saved` | 3 → 3 / 3 → 3 | 8 → 9 / 8 → 9 |
| `/publish` | 3 → 3 / 3 → 3 | 9 → 9 / 7 → 9 |
| `/profile?create=project` | 4 → 4 / 4 → 4 | 8 → 10 / 8 → 8 |
| `/discovery?post=post-11` | 7 → 7 / 7 → 7 | 34 → 34 / 33 → 34 |

No se registraron tareas largas (>50 ms) ni errores de JavaScript en estas dos muestras. No es una certificación de todo el runtime ni una medición estadística de INP.

Saved fue 29 ms más rápido en frío y 13 ms con caché; Messages añadió aproximadamente 120 ms al incorporar el listado permanente y avatares. Home frío aumentó 544 ms, mientras su entrada con caché bajó 31 ms. Durante el intervalo observado, Home hizo 15 consultas frente a 19; las cuatro ausentes son consultas de waveform. No se atribuye una mejora global de velocidad a una sola muestra ni se afirma que esas consultas desaparezcan en toda la sesión.

Optimizaciones concretas aplicadas: actualización de Saved directamente en caché después de confirmar el PUT; invalidación limitada a Saved/publicación/Discovery/Home; imágenes y revelado inicial con cachés limitadas; contenido existente retenido durante recargas; cálculo de ambiente con muestras de 32×32 y gradientes estáticos; el anclaje de notificaciones no provoca un render si sus coordenadas no cambian. El composer y los borradores conservan su instancia durante polling.

La medición muestra continuidad de rendimiento, no una aceleración general demostrada. Los tres fallos históricos de Discovery se documentan en el README y no se excluyen de la comunicación de resultados.
