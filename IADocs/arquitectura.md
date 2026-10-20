# Arquitectura

Capas (de fuera a dentro). Cada capa solo conoce a la de debajo. **Web y app Android comparten el mismo código**: `capacitor/www/` es una copia de `web/` (ver `app-android-capacitor.md`); lo único que cambia es la colección inicial.

> Las rutas `js/…`, `css/…` e `i18n/…` de esta documentación son relativas a `web/` (p. ej. `js/datos/fabrica.js` = `web/js/datos/fabrica.js`).

```
 Páginas (web/*.html) ── js/catalogo.js · js/asistente.js · js/crear.js     (interfaz)
      │  textos: js/i18n.js + i18n/*.json  (ver i18n.md)
      │  usan solo  Servicios.juegos
      ▼
 ServicioJuegos          js/datos/servicio-juegos.js    (reglas: validar, normalizar, ids, sugerencias, exportar/importar copia)
      │  recibe un RepositorioJuegos por constructor (inyección de dependencias)
      ▼
 RepositorioJuegos       js/datos/repositorio.js        (CONTRATO, clase abstracta, todo async)
      ▲  extiende
 RepositorioJuegosLocal  js/datos/repositorio-local.js  (toda la colección en un único documento JSON)
      │  lee/escribe el texto en un AlmacenDocumento  (js/datos/almacen.js)
      ▼
 AlmacenDocumentoLocalStorage (web)  ·  AlmacenDocumentoCapacitor (app: fichero juegos.json + copia en localStorage)

 js/datos/fabrica.js     raíz de composición: ÚNICO sitio que elige repositorio y almacén (`Servicios`)
 data/semilla.js         window.DATOS_JUEGOS: colección inicial. En la web vale `null` (empieza vacía)
```

## Contrato `RepositorioJuegos`
`obtenerTodos()`, `obtenerPorId(id)`, `guardar(juego)` (crea o reemplaza por id), `guardarVarios(juegos)`, `eliminar(id)`. Devuelven copias, nunca referencias internas.

## Dónde se guardan los juegos
- **Web / GitHub Pages**: solo en el `localStorage` del navegador (clave `mesa_juegos_documento`, un documento `{ version, actualizado, juegos: [...] }`). **No se lee ningún fichero de datos**: la web empieza vacía y se llena creando juegos o importando un `.json` (sección «Copia de seguridad» de `crear.html`). Se descartaron las cookies para los juegos: pesan 4 KB cada una, viajan en cada petición y un catálogo de decenas de juegos no cabe de forma fiable.
- **App Android**: fichero privado del móvil (`AlmacenDocumentoCapacitor`), sembrado la primera vez con `data/semilla.js`.
- Copia de seguridad: `ServicioJuegos.exportarCopia()` / `importarCopia(texto)` (formato `{ formato: "mesa-juegos", version: 1, exportado, juegos }`). Importar combina por id; si algo no valida no se cambia nada.
- Aviso GitHub Pages: `localStorage` es por **origen** (`usuario.github.io`), compartido por todos los proyectos del mismo usuario en Pages. Por eso las claves llevan prefijo `mesa_`.

## Cómo pasar a una base de datos
1. Crear `js/datos/repositorio-api.js` con `class RepositorioJuegosApi extends RepositorioJuegos` (métodos async) y cargarlo en las páginas antes de `fabrica.js`.
2. En `fabrica.js`: `new ServicioJuegos(new RepositorioJuegosApi("https://…"))`.
3. No cambia nada más. Si la base tiene otro formato, la traducción al esquema (ver `datos-juegos.md`) va dentro del repositorio.

## Qué NO está en la capa de datos
- El historial de partidas/notas (`Historial` en `js/comun.js`, cookies + localStorage): dato del usuario, no del catálogo. Ver `historial-y-asistente.md`. **No entra en la copia de seguridad.**
- Los textos de la interfaz (`i18n/`).

## Scripts y orden de carga (todas las páginas)
`js/i18n.js` → `data/semilla.js` → `js/datos/repositorio.js` → `almacen.js` → `almacen-localstorage.js` → `almacen-capacitor.js` → `repositorio-local.js` → `servicio-juegos.js` → `fabrica.js` → `js/comun.js` → `js/app-nativa.js` → script de la página (`crear.html` añade `plataforma.js` y `bgg.js`).

## Servidor local
`serverTest/iniciar.bat` / `servidor.py` / `servidor.ps1` (sirven la raíz del proyecto) siguen sirviendo la web en `http://localhost:8080/web/index.html` (hace falta http: los textos son JSON). Su API de guardado en `data/juegos.js` **ya no se usa**; sirven solo como servidor estático.
