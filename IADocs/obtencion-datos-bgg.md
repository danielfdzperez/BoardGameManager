# Obtención de datos de BoardGameGeek

- La web principal y `xmlapi2` están bloqueadas desde el sandbox. Funciona **WebFetch** sobre `https://api.geekdo.com/api/geekitems?objectid=ID&objecttype=thing` (ficha) y `https://api.geekdo.com/api/dynamicinfo?objectid=ID&objecttype=thing` (valoración, ranking, peso). `curl` da 403.
- El ID de BGG se encuentra con WebSearch («nombre boardgamegeek»).
- El proxy devuelve **429** con ráfagas: lotes de 4–8 peticiones con pausas de 45–90 s (`sleep`). Decir al usuario qué páginas fallaron y rellenar con otras fuentes (Kickstarter, Zacatrus, datos del usuario) marcando lo estimado.
- Dificultad = `weight` de BGG. Tiempos de preparación no existen en BGG: siempre estimados.
- Las imágenes no se pueden verificar desde el sandbox; el catálogo usa una imagen de reserva si falla la carga.
- Los scripts de parcheo deben leer/escribir `data/juegos.js` (quitar el prefijo `window.DATOS_JUEGOS = ` y el `;` final para parsear el JSON).
- Desde un equipo con `curl`: `xmlapi2` devuelve 401 (exige token de app registrada en boardgamegeek.com/applications) y `api.geekdo.com` responde 200, pero ninguna manda CORS: desde un navegador solo sirve con un proxy propio o el plugin nativo de la app (ver `app-android-capacitor.md`). El CSV `https://boardgamegeek.com/data_dumps/bg_ranks` da ranking y nota media sin token.
