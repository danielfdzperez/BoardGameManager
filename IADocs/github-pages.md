# Publicar en GitHub Pages

La web es estática (HTML/CSS/JS + JSON de textos): Pages la sirve tal cual, sin build.

## Preparado en el proyecto
- `index.html` en la raíz redirige a `web/index.html` (la URL del repo abre el catálogo; Pages publica la raíz). Todo el código de la web vive en `web/` (HTML, `css/`, `js/`, `i18n/`).
- `.nojekyll` en la raíz: Pages no procesa el sitio con Jekyll.
- Todas las rutas son relativas (`css/…`, `i18n/…` dentro de `web/`), así que funciona bajo `https://USUARIO.github.io/REPO/`.
- La web no trae juegos: cada visitante empieza con la colección vacía en su navegador. Para cargar la tuya: `crear.html` → «Copia de seguridad» → «Importar juegos» con `data/mis-juegos.json` (49 juegos) o con una copia exportada.

## Pasos
1. Crear un repositorio en GitHub (público para Pages gratuito) sin README.
2. En la carpeta del proyecto: `git init`, `git add .`, `git commit -m "Primera versión"`, `git branch -M main`, `git remote add origin https://github.com/USUARIO/REPO.git`, `git push -u origin main`.
3. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch `main`, carpeta `/ (root)` → Save**.
4. Esperar 1–2 min (pestaña Actions) y abrir `https://USUARIO.github.io/REPO/`.
5. Actualizar: commit + `git push`; Pages se republica solo.

## Qué conviene no subir
`capacitor/node_modules` y `capacitor/android/build` ya están en `capacitor/.gitignore`. `capacitor/` en general no hace falta en Pages (se publica pero no se usa). `data/juegos.js` y `data/mis-juegos.json` son tu colección: en un repo público la verá cualquiera; si no quieres, añádelos a `.gitignore` (la web no los usa).

## Cosas a saber
- `localStorage` es por origen (`USUARIO.github.io`): los datos persisten en ese navegador/dispositivo, no se sincronizan entre dispositivos (usar exportar/importar). Si borras los datos del sitio se pierden.
- Con GitHub Pages cada proyecto del mismo usuario comparte origen: las claves del proyecto empiezan por `mesa_`.
- Un dominio propio o cambiar el nombre del repo no requiere tocar código.
