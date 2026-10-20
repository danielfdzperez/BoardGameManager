/* Integración con Android (solo dentro de la app; en un navegador no hace nada). */
(function () {
  const c = window.Capacitor;
  if (!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform() && c.Plugins && c.Plugins.App)) return;
  const App = c.Plugins.App;

  const enCatalogo = /(^|\/)(index\.html)?$/.test(location.pathname);

  /* Botón atrás: 1) lo que haya abierto en la pantalla (filtros, juego, pregunta anterior…);
     2) en el catálogo, cerrar la app; 3) en cualquier otra pantalla, volver al catálogo. */
  App.addListener("backButton", function () {
    if (Atras.manejar()) return;
    if (enCatalogo) App.exitApp();
    else location.replace("index.html");
  });
})();
