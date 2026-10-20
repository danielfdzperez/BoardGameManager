# App Android (Capacitor)

Carpeta `capacitor/`: la web empaquetada como app Android con Capacitor. `capacitor/www/` es una **copia generada** de `web/`: no se edita a mano. Tras cambiar algo en `web/` (o en `data/juegos.js`, la colección inicial) ejecutar:
```
powershell -File capacitorsincronizar.ps1
cd capacitor && npx cap sync android
```
El script copia `web/` entera a `www/` (HTML en la raíz de `www/`) y convierte `data/juegos.js` en `www/data/semilla.js`. Web y app comparten **todo** el código (también `fabrica.js`): la fábrica usa el fichero del móvil si está en la app y `localStorage` si no. El idioma de la app es siempre el del teléfono (sin selector; ver `i18n.md`).

## Qué cambia respecto a la web
- **Dos abstracciones de datos**:
  - `RepositorioJuegos` (contrato, igual que en la web): QUÉ se guarda.
  - `AlmacenDocumento` (`js/datos/almacen.js`, `leer()` / `escribir(texto)`): DÓNDE se guarda el texto.
- `RepositorioJuegosLocal` (`repositorio-local.js`, también usado por la web) guarda **toda la colección** en un almacén. Primer arranque: siembra con `data/semilla.js` y escribe (si no hay semilla, empieza vacío). Después el almacén es la única fuente y cada guardar/eliminar se escribe al momento: sin exportar ni sustituir ficheros. Las escrituras van en cola y no se da por buena una hasta que se ha guardado. Si el documento guardado está dañado no se sobrescribe, se avisa.
- Almacenes: `AlmacenDocumentoCapacitor` (fichero `juegos.json` en `Directory.Data` con plugin `@capacitor/filesystem`, más copia en localStorage como respaldo) y `AlmacenDocumentoLocalStorage` (pruebas en navegador).
- `fabrica.js` (el mismo en web y app) elige el almacén: dentro de la app el fichero, en un navegador localStorage. La única diferencia de datos es la semilla: en la app `data/semilla.js` trae la colección; en la web vale `null`.
- Documento: `{ version, actualizado, fuente, juegos: [...] }`, mismo formato que `juegos.js`.

## Panel de filtros en móvil
En pantallas estrechas `.filtros` es un panel fijo con scroll propio. Requiere `align-self: stretch` y `height: 100%` (con el `align-self: start` de escritorio, el WebView moderno lo encoge al contenido y no hay scroll interno), `overscroll-behavior: contain`, un fondo oscuro real (`#fondo-filtros`, que captura los toques y cierra el panel) y `body.filtros-abiertos { overflow: hidden }` para que la lista de detrás no se mueva. Corregido igual en `web/` y en `capacitor/www/`.

## Zonas seguras (cámara, barra de estado y de navegación)
Con Android 15 (targetSdk 35) la app se dibuja de borde a borde y el contenido quedaba bajo la cámara. Se resuelve en nativo, sin tocar el CSS: `capacitor.config.json` → `android.adjustMarginsForEdgeToEdge: "force"` (Capacitor 7.1+) aplica al WebView márgenes de las barras del sistema y del recorte de pantalla (`systemBars | displayCutout`). En `android/app/src/main/res/values/styles.xml` (`AppTheme.NoActionBar`) el fondo de esas franjas es `@color/fondoApp` (`colors.xml`, mismo `#14161c` que `--fondo`) y los iconos de las barras son claros. Si cambias `--fondo`, cambia también `fondoApp`. Tras tocar `capacitor.config.json` hay que ejecutar `npx cap sync android`.

## Icono de la app
Un meeple naranja (`--acento`) sobre fondo `--fondo`. Lo genera `capacitor/generar-icono.ps1` (PowerShell + System.Drawing, sin dependencias) en `android/app/src/main/res/mipmap-*` (`ic_launcher.png`, `ic_launcher_round.png` y el primer plano adaptativo `ic_launcher_foreground.png`); el fondo adaptativo es `values/ic_launcher_background.xml`. Para cambiarlo: editar la silueta o los colores del script y ejecutarlo. No hace falta `cap sync`, solo recompilar (el launcher puede tardar en refrescar el icono; si no cambia, desinstala la app, ojo: eso borra los datos guardados).

## Botón atrás de Android
Plugin `@capacitor/app`. `js/app-nativa.js` (solo actúa dentro de la app) escucha `backButton`; con ese listener el WebView ya no navega por su historial. Orden: 1) `Atras.manejar()` (registro en `comun.js`: cada pantalla registra `Atras.registrar(fn)`, `fn` devuelve `true` si gestionó el atrás); 2) si nadie lo gestiona y estamos en el catálogo, `App.exitApp()`; 3) en otra pantalla, `location.replace("index.html")`.
- Catálogo (`catalogo.js`): cierra el juego abierto; si no, cierra los filtros; si no, sale de la app.
- Asistente (`asistente.js`): del resultado a la última pregunta; de cada pregunta a la anterior; en la primera pregunta vuelve al catálogo.
- Crear juego: vuelve al catálogo.
Para otra pantalla o panel nuevo basta con registrar su manejador. Tras añadir un plugin: `npm install` + `npx cap sync android`.

## Exportar / importar juegos (JSON)
Sección «Copia de seguridad» al final de `crear.html`.
- **Capa de datos**: `ServicioJuegos.exportarCopia()` genera `{ formato: "mesa-juegos", version: 1, exportado, juegos }` (archivo `juegos-mesa-AAAA-MM-DD.json`); `importarCopia(texto)` valida y llama a `repositorio.guardarVarios(juegos)` (método del contrato; por defecto bucle de `guardar`, `RepositorioJuegosLocal` lo hace en una sola escritura). Vale con cualquier repositorio.
- **Importar = combinar por id**: los del archivo se añaden y los que ya existían con ese id se sustituyen (se pisan ediciones locales de ese juego); los demás no se tocan, y nunca se borra nada. Acepta el formato exportado o una lista suelta de juegos. Si falla la validación (JSON roto, sin lista, id repetido/faltante, sin nombre, sin `jugadores`/`duracion`/`preparacion`/listas) no se cambia nada y se muestran hasta 5 problemas.
- **Entrega del archivo** (`js/plataforma.js`, `Plataforma.entregarArchivo`): en la app se escribe en la caché (`@capacitor/filesystem`) y se abre la hoja de compartir de Android (`@capacitor/share`: guardar en Drive/Descargas, enviar…); en un navegador, descarga normal. Importar usa un `<input type="file">`, que el WebView soporta.
- **No incluye** el historial de partidas ni las notas (`Historial`, cookies/localStorage): solo el catálogo.

## Rellenar desde BoardGameGeek
Bloque «Empezar desde BoardGameGeek» al principio de `crear.html` (solo en la app): se escribe el número de BGG o se pega la URL de la ficha y «⬇ Rellenar desde BGG» carga el formulario **sin guardar**.
- `js/bgg.js` (`Bgg`, en `web/` y por tanto en `capacitor/www/`) pide `api.geekdo.com/api/geekitems` y `dynamicinfo` (sin token) con el plugin nativo `CapacitorHttp` de `@capacitor/core` (no hay que instalar nada ni tocar la configuración): hace la petición fuera del WebView, así que no hay CORS. La API oficial `xmlapi2` exige token y se descartó. En el navegador se usa el proxy local de `serverTest/` o `Bgg.PROXY_WEB` (ver `pagina-crear.md`).
- Rellena (si BGG tiene el dato): bggId, enlace, nombre original (y nombre si está vacío), año, editorial principal, diseñadores, jugadores, mejor/recomendado con (de las votaciones), duración, edad, peso, valoración, ranking general, imagen, descripción, categorías, mecánicas y modos Cooperativo/Semicooperativo/Solitario/Por equipos (solo los deducibles de una mecánica).
- **No toca**: preparación (BGG no la da), ambientación, experiencia, party, notas.
- Categorías y mecánicas se traducen con diccionarios de `bgg.js` (`CATEGORIAS`, `MECANICAS`, con los términos ya usados en el catálogo); lo que no está se deja en inglés y se avisa. La descripción viene en inglés y se avisa de traducirla.
- Limitación: al editar un juego con `pesoEstimado`, esa marca se conserva aunque el peso ahora venga de BGG; hay que quitarla en `juegos.js`.
- API interna sin documentar: puede cambiar. Si se rompe, ajustar `_convertir` en `bgg.js`.

## Pasar a un servidor
Crear `RepositorioJuegosApi extends RepositorioJuegos` (métodos async) y devolverlo en `elegirRepositorio()` de `js/datos/fabrica.js`. No hay que tocar páginas ni servicio.

## Limitaciones conocidas
- El historial de partidas/notas (`Historial` en `comun.js`) sigue en cookies + localStorage del WebView: persiste, pero no está abstraído como los juegos.
- **Actualizar la colección desde el PC**: editar `data/juegos.js`, ejecutar `capacitorsincronizar.ps1`, `npx cap sync android` y volver a ejecutar la app. Al arrancar, `RepositorioJuegosLocal` añade los juegos cuyo id no conocía (`semillaIds` en el documento guardado). Solo se añaden **juegos nuevos**: no se pisan los ya existentes (ni las ediciones del usuario) y un juego eliminado en el móvil no vuelve. Correcciones a juegos que ya están en la app no se propagan. Un documento anterior a `semillaIds` recupera una sola vez los que falten.
- Copia de seguridad solo manual (exportar/importar JSON), sin sincronización entre móviles ni historial incluido. Los datos se pierden al desinstalar o borrar datos de la app.

## Compilar (requiere Node 20+, JDK 21 y Android Studio)
```
cd capacitor
npm install
npx cap add android      # solo la primera vez
npx cap sync android     # tras cada cambio en www/
npx cap open android     # compilar/ejecutar desde Android Studio
```
`npm run probar` sirve `www/` en `http://localhost:8090/index.html` para probar en el navegador (usa localStorage).

## Estado de verificación
Probado en Chromium (servidor estático, almacén localStorage): siembra de 48 juegos, crear con escrituras concurrentes (51), visible en otra página, eliminar (48), documento dañado no se sobrescribe. Relleno desde BGG probado en Chromium con un `CapacitorHttp` simulado que devuelve respuestas reales de Gloomhaven (campos, avisos, mensaje en navegador, 390 px sin scroll). **No probado** dentro de Android: en esta máquina no hay Node ni Android SDK, así que `AlmacenDocumentoCapacitor` y el plugin Filesystem están sin ejecutar.
