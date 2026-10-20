# Elegir juego de mesa

Web para filtrar mi colección de juegos de mesa y recibir recomendaciones. Interfaz en varios idiomas (castellano e inglés), sin instalación: HTML/CSS/JS puro. Hay también una app Android (carpeta `capacitor/`).

## Cómo verla
- **En internet**: publicada en GitHub Pages (ver `IADocs/github-pages.md`).
- **En el PC**: `serverTest/iniciar.bat` abre un servidor local en `http://localhost:8080/web/index.html`. Hace falta servirla por http (no vale abrir el HTML con doble clic en Chrome: los textos son JSON).

## Páginas
- `web/index.html` — catálogo con filtros.
- `web/asistente.html` — «¿A qué jugamos?».
- `web/crear.html` — crear y editar juegos, y copia de seguridad (exportar/importar).

## Idioma
Usa el idioma del dispositivo; en la web se puede cambiar con el selector 🌐 de la esquina superior derecha. Para añadir un idioma: copiar `web/i18n/es.json`, traducirlo y añadirlo a `web/i18n/idiomas.json` (ver `IADocs/i18n.md`).

## Tus juegos
La web empieza **vacía** y guarda tu colección solo en el navegador (`localStorage`). Para cargarla:
- `crear.html` → **Copia de seguridad** → **Importar juegos** y elige `data/mis-juegos.json` (tus 49 juegos actuales) o cualquier copia exportada.
- **Exporta** una copia de vez en cuando: si borras los datos del sitio, se pierden.
El historial de partidas y notas va aparte (cookies/localStorage) y no entra en la copia.

## Estructura
- `web/css/estilos.css` estilos.
- `web/js/` páginas y utilidades; `web/js/datos/` capa de datos (repositorio, servicio, fábrica); `web/js/i18n.js` idiomas.
- `web/i18n/` textos de la interfaz por idioma (JSON).
- `data/juegos.js` colección maestra (la lee solo la app Android como colección inicial); `data/mis-juegos.json` la misma colección lista para importar.
- `capacitor/` app Android (`capacitor/sincronizar.ps1` copia `web/` a la app).
- `IADocs/` documentación técnica; `CLAUDE.md` reglas para la IA.

## Base de datos en el futuro
Solo hay que crear otro repositorio en `js/datos/` y cambiar una línea en `web/js/datos/fabrica.js` (ver `IADocs/arquitectura.md`).
