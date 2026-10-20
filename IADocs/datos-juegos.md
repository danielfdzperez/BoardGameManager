# Datos de los juegos

## Ficheros
La web **no lee** `data/juegos.js`: sus juegos viven en el navegador (ver `arquitectura.md`) y se cargan importando un `.json` (`data/mis-juegos.json`, exportación de este mismo contenido). `data/juegos.js` queda como colección maestra editable por script y como **semilla de la app Android** (`capacitor/sincronizar.ps1` la copia a `capacitor/www/data/semilla.js`).

`data/juegos.js`:
```js
/* comentario */
window.DATOS_JUEGOS = { "version": 2, "actualizado": "AAAA-MM-DD", "fuente": "...", "juegos": [ {...}, ... ] };
```
Es JSON válido tras `window.DATOS_JUEGOS = ` (se puede manipular por script: quitar el prefijo y el `;` final, `json.loads`, modificar, volver a escribir con la misma cabecera). Hay una copia de respaldo del antiguo `juegos.json` solo en el sandbox, no en el proyecto.

## Esquema de un juego
| Campo | Notas |
|---|---|
| `id` | estable, slug sin acentos (`generarId`). El historial usa este id |
| `bggId`, `bggUrl` | `bggUrl` puede ser cualquier enlace (Kickstarter…); `enlaceTexto` cambia el texto del enlace («Ver en Kickstarter») |
| `nombre` (castellano), `nombreOriginal`, `anio` | |
| `jugadores {min,max,mejorCon[],recomendado[]}` | `max` 99 = sin límite práctico |
| `duracion {min,max,estimada}` | minutos |
| `preparacion {min,estimada}` | minutos; siempre estimada (BGG no lo da) |
| `edadMinima` | |
| `peso`, `pesoEstimado` | 1–5 (BGG «weight») → dificultad |
| `valoracionBGG`, `rankingBGG` | pueden ser `null` |
| `party` | bool |
| `modo[]` | Cooperativo, Competitivo, Solitario, Semicooperativo, Por equipos, Con app, Narrativo |
| `ambientacion[]`, `experiencia[]` | los usa el asistente (preguntas dinámicas) |
| `categorias[]`, `mecanicas[]` | traducidas al castellano |
| `disenadores[]`, `editorial`, `descripcion` | descripción redactada en castellano |
| `imagen`, `imagenAlternativa` | URL; si falla se prueba la alternativa y luego una portada con iniciales |
| `notas` | aviso visible en la ficha |
| `pendiente`, `sinVerificar` | flags (ver abajo) |

## Dificultad (derivada de `peso`)
< 2 Fácil · < 2,8 Media · < 3,5 Difícil · resto Experto. Sin peso: «—».

## Flags
- `pendiente: true` — sin datos suficientes. Sale marcado en el catálogo, solo si no hay filtros de datos activos, y el asistente no lo recomienda.
- `sinVerificar: true` — datos de memoria o de fuente dudosa; sale con cinta «Sin verificar».
- `estimada` / `pesoEstimado` — la cifra es una estimación; se muestra con `~` / «(est.)».

## Valores usados (para mantener coherencia)
- `experiencia`: Construcción de mazos, Combate y tácticas, Historia y campaña, Carreras y reflejos, Deducción y faroleo, Gestión de recursos, Rol y narrativa, Investigación y puzles, Comunicación limitada, Equilibrio y destreza, Risas y creatividad, Estrategia ligera.
- `ambientacion`: Fantasía, Terror, Ciencia ficción, Carreras, Misterio y deducción, Humor, Animales, Aventura, Intriga, Teatro, Arte, Sin ambientación.
Reutilizar estos valores antes de inventar otros (la página `crear.html` los sugiere).

## Traducción de mecánicas y categorías
Se tradujeron con un diccionario propio al importar de BGG. Revisar términos raros si se detectan.
