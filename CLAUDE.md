# CLAUDE.md — reglas del proyecto

Web (HTML/CSS/JS puro, sin dependencias ni build; se publica en GitHub Pages) y app Android (Capacitor) para filtrar la colección de juegos de mesa del usuario y recomendar a qué jugar. **Interfaz multiidioma** (`i18n/*.json`, hoy es y en); datos, documentación y comentarios en castellano.

## Reglas
1. **Los juegos viven en el navegador (localStorage) o en el fichero de la app**, nunca en un fichero leído por la web. La web empieza vacía y se llena creando juegos o importando un `.json` (exportar/importar en `crear.html`). `data/juegos.js` (`window.DATOS_JUEGOS`) es la colección maestra y la semilla de la app Android; `data/mis-juegos.json` es la misma colección lista para importar. No existe `juegos.json` de datos; no recrearlo.
2. **Acceso a datos solo por la capa `js/datos/`**: las páginas usan únicamente `Servicios.juegos` (`ServicioJuegos`). Nunca leer `window.DATOS_JUEGOS` ni `localStorage` de juegos fuera de `js/datos/`.
3. **Cambiar de almacén = tocar solo `js/datos/fabrica.js`** (hoy `RepositorioJuegosLocal` sobre fichero del móvil si corre en la app, si no sobre localStorage) (y añadir una clase que extienda `RepositorioJuegos`). Todas las operaciones del repositorio son `async`.
4. **JS clásico con scripts globales, sin módulos ES.** Los textos se cargan con `fetch` de JSON, así que la web se sirve por http(s) (GitHub Pages, `serverTest/iniciar.bat`, app Capacitor); con `file://` Chrome muestra solo el texto español del HTML.
5. **Estructura fija**: `web/` (todo lo publicable: HTML, `css/`, `js/` con `js/datos/` = capa de datos, `i18n/` = textos), `data/`, `capacitor/` (app), `serverTest/` (servidor local). El `index.html` de la raíz solo redirige a `web/index.html` (GitHub Pages publica la raíz). `capacitor/www/` es una **copia generada** (`capacitor/sincronizar.ps1`): no editarla a mano. Interfaz responsive (probar a 1280 y 390 px sin scroll horizontal).
6. **Ids de juego estables** (`id`): el historial de partidas/notas se guarda por id. No renombrar ids.
7. **No inventar datos.** Lo estimado se marca (`estimada`, `pesoEstimado`, `~`), lo dudoso con `sinVerificar`, lo vacío con `pendiente`, y se explica en `notas`. Registrar el caso en `IADocs/estado-datos.md`.
8. **Verificar antes de entregar**: sintaxis JS y prueba en un navegador servido por http (ver `IADocs/pruebas.md`). Sin `alert/confirm`: usar doble pulsación.
9. **Entrega**: escribir en `/mnt/user-data/outputs/ElegirJuegoDeMesa/` y volcar a `D:\Proyectos\ElegirJuegoDeMesa` con `device_commit_files` (no hay shell en el equipo del usuario: no se pueden borrar archivos de su carpeta; pedirle que los borre).
10. **Textos de interfaz**: ningún texto visible en el JS ni en el HTML sin traducir. Usar `tr("clave")` / `data-i18n` y añadir la clave a `i18n/es.json` **y** `i18n/en.json` (ver `IADocs/i18n.md`). Los datos de los juegos no se traducen.
11. **Documentación**: aquí solo van reglas. Todo lo demás se documenta en un fichero propio dentro de `IADocs/` (un tema por fichero) y se enlaza en el índice de abajo. Al cambiar algo, actualizar su fichero de `IADocs/`.

## Índice de IADocs
- `IADocs/arquitectura.md` — capas, diagrama, dónde se guardan los juegos, cómo cambiar a una base de datos.
- `IADocs/i18n.md` — idiomas: ficheros JSON, cómo añadir uno, uso en HTML/JS.
- `IADocs/github-pages.md` — publicar en GitHub Pages.
- `IADocs/datos-juegos.md` — esquema de un juego, dificultad, formato de `juegos.js`, cómo editarlo por script.
- `IADocs/pagina-crear.md` — página `crear.html`: campos, validación, cambios locales y exportación.
- `IADocs/historial-y-asistente.md` — historial en cookies, reglas del asistente y filtros.
- `IADocs/obtencion-datos-bgg.md` — cómo sacar datos de BGG y límites (429).
- `IADocs/estado-datos.md` — qué hay, qué está estimado/pendiente/por confirmar.
- `IADocs/app-android-capacitor.md` — carpeta `capacitor/`: app Android, almacén persistente local, cómo compilar.
- `IADocs/pruebas.md` — cómo probar (Playwright) y casos cubiertos.
