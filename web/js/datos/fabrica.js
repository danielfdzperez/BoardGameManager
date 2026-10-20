/* ============================================================================
 * FÁBRICA / RAÍZ DE COMPOSICIÓN
 *
 * ÚNICO sitio que decide dónde se leen y guardan los juegos. Las páginas solo usan
 * `Servicios.juegos`.
 *  - Dentro de la app Android: RepositorioJuegosLocal sobre un fichero privado del móvil.
 *  - En un navegador (web, GitHub Pages): el mismo repositorio sobre localStorage.
 * La web NO trae juegos: empieza vacía y se llena creándolos o importando un JSON.
 * Solo la app empaqueta una colección inicial (data/semilla.js, copia de data/juegos.js).
 * Para pasar a un servidor: crear una clase que extienda RepositorioJuegos (todo async) y
 * devolverla en elegirRepositorio(). Nada más cambia.
 * ========================================================================== */
function elegirRepositorio() {
  const almacen = AlmacenDocumentoCapacitor.disponible()
    ? new AlmacenDocumentoCapacitor("juegos.json")
    : new AlmacenDocumentoLocalStorage("mesa_juegos_documento");
  return new RepositorioJuegosLocal({ almacen: almacen, semilla: function () { return window.DATOS_JUEGOS || null; } });
}

const Servicios = {
  juegos: new ServicioJuegos(elegirRepositorio())
};
