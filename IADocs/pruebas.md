# Pruebas

No hay framework: se usa Playwright con Chromium (`/opt/pw-browsers/chromium`, no ejecutar `playwright install`) sirviendo la carpeta por http (cualquier servidor estático: `serverTest/iniciar.bat`, `npx http-server`…; los textos son JSON y `file://` no vale en Chrome).

## Antes de entregar
1. `node --check` de cada `.js` (incl. `js/datos/*`).
2. Abrir `index.html`, `asistente.html`, `crear.html` a 1280 y 390 px: sin errores de consola y `scrollWidth <= innerWidth`.
3. Casos: web vacía muestra el aviso de colección vacía; importar `data/mis-juegos.json` (49 juegos); catálogo con filtros; asistente recorre las 9 preguntas y da resultado; historial persiste tras recargar.
4. Idiomas: con `localStorage.mesa_idioma = "en"` (o el selector 🌐) ninguna pantalla muestra claves sin traducir (`filtros.xxx`) ni textos en castellano de la interfaz; `node` parsea `i18n/*.json` y todas las claves usadas (`tr("…")`, `data-i18n`) existen en `es.json`.
5. Crear juego (+1) → exportar y comprobar que el JSON tiene +1 → eliminar (49).
