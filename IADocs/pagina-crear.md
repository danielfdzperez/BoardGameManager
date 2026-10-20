# Página `web/crear.html` (crear y editar juegos)

Script: `js/crear.js`. Usa solo `Servicios.juegos`.

## Qué hace
- Formulario en 6 bloques: básico, jugadores y tiempo, dificultad (peso), cómo se juega, imagen y descripción, enlace/BGG.
- Modo edición: selector «Editar un juego existente» o `crear.html?editar=ID` (enlace «✏️ Editar este juego» en el modal del catálogo).
- Campos de lista (diseñadores, ambientación, experiencia, mecánicas, categorías) con entrada de etiquetas y autocompletado (`ServicioJuegos.sugerencias()`).
- Casilla «pendiente»: solo el nombre es obligatorio y el asistente no lo recomienda.

## Validación (`ServicioJuegos.validar`)
Nombre obligatorio; URLs http(s); año 1800–2100; si no es pendiente: jugadores min/max, duración min/max, preparación ≥ 0, peso 1–5, valoración 0–10 y al menos un modo.

## Dónde se guarda
En el `localStorage` del navegador (web) o en un fichero del móvil (app): ver `arquitectura.md`. No hay cambios locales sobre un fichero ni servidor que escriba en disco. «Eliminar juego» requiere doble pulsación (sin `confirm`). Al editar, los campos que el formulario no gestiona se conservan; el `id` nunca cambia.

## Copia de seguridad (exportar / importar)
Sección al final de `crear.html`. «Exportar juegos» descarga `juegos-mesa-AAAA-MM-DD.json` (en la app abre la hoja de compartir, ver `Plataforma`). «Importar juegos» lee un `.json` (formato exportado o lista suelta de juegos), valida y combina por id (añade los nuevos, sustituye los que ya existían, no borra nada). Si falla la validación no se cambia nada y se muestran hasta 5 problemas. No incluye el historial de partidas. `data/mis-juegos.json` es una exportación de `data/juegos.js` lista para importar.

## Marcas de estimación
El formulario ya no tiene casillas de «es una estimación» (duración, preparación, dificultad). `ServicioJuegos.normalizar` no las toca: al **editar** conserva las marcas que ya tenía el juego (`duracion.estimada`, `preparacion.estimada`, `pesoEstimado`, que siguen mostrando `~` / «(est.)» en el catálogo) y un juego **nuevo** se guarda sin marcas. Si cambias el valor de un juego que tenía marca, la marca se mantiene aunque ahora el dato sea tuyo; se quita editando el juego en el JSON exportado y reimportándolo. Igual en `web/` y `capacitor/www/`.

## Rellenar desde BGG
Disponible en app y web (`js/bgg.js`). `api.geekdo.com` no manda CORS, así que `Bgg._peticion` elige la vía: app → plugin `CapacitorHttp`; web en localhost → proxy `/api/bgg/<geekitems|dynamicinfo>` de `serverTest/` (py y ps1); web publicada → `Bgg.PROXY_WEB` (único punto a cambiar para usar otro proxy o un Worker propio). **Estado**: `corsproxy.io` (valor actual) exige API key desde 2026, así que en GitHub Pages falla hasta poner clave o Worker. Ver «Rellenar desde BoardGameGeek» en `app-android-capacitor.md`.

**Pendiente**: montar un Cloudflare Worker propio (gratis, sin clave expuesta) que reenvíe solo a `api.geekdo.com/api/geekitems` y `dynamicinfo`, acepte solo el `Origin` de `*.github.io` y añada CORS; después apuntar `Bgg.PROXY_WEB` a su URL. Hasta entonces, BGG en GitHub Pages no funciona (la app y el servidor local sí).
