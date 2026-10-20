# Historial, asistente y filtros

## Historial (`js/comun.js`, objeto `Historial`)
- Por juego (clave = `id`): `{p: partidas, n: nota 1–5, u: fecha última}`.
- Cookies `mesa_hist_0..n` (JSON troceado en bloques de 3000 caracteres) + espejo en `localStorage`, porque Chrome no conserva cookies en `file://`. Cada origen (localhost, GitHub Pages, `file://`) es un almacén distinto. No va en la copia de seguridad de juegos.
- API: `obtener, registrarPartida, quitarPartida, ponerNota, fechaUltima`.

## Asistente (`js/asistente.js`, 9 preguntas)
jugadores, tiempo, preparación, dificultad, modo, party, ambientación, experiencia, novedad.
- Filtros duros: jugadores, tiempo, preparación, cooperativo/competitivo (salvo solitario), party.
- Si no hay resultados se relajan en orden: tiempo → preparación → modo → party.
- Puntuación (`evaluar`) + ajustes por historial (notas altas suben, muchas partidas bajan si piden novedad). `duracion.max` nulo está controlado.
- «¡Jugamos a este!» registra una partida.

## Catálogo (`js/catalogo.js`)
Filtros laterales: jugadores, tiempo de juego, preparación, party, dificultad, modo, ambientación, mecánicas, mi historial. Búsqueda con `?q=`. Modal con detalle y panel de historial.
Orden: selector de criterio + botón «↑ Asc. / ↓ Desc.» (`#orden-dir`). Cada criterio empieza en su sentido natural (nombre A–Z, menor duración/preparación/dificultad primero; valoración, máx. jugadores, veces jugado y nota de mayor a menor) y al cambiar de criterio se restablece. Los juegos sin dato en ese criterio van siempre al final, el empate se desempata por nombre A–Z y los pendientes siempre al final. Misma lógica en `web/` y en `capacitor/www/`. Para que el selector, el botón y «Filtros» quepan en una línea a 390 px: `.contenedor > main { min-width: 0 }` y botones `nowrap`.
Dificultad por peso BGG: <2 Fácil, <2,8 Media, <3,5 Difícil, resto Experto.
