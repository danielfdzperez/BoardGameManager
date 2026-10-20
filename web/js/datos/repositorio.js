/* ============================================================================
 * CONTRATO DEL REPOSITORIO DE JUEGOS (capa de acceso a datos)
 *
 * Es la única puerta de entrada al almacén de juegos. La aplicación nunca debe
 * saber de dónde salen los datos. Todas las operaciones son asíncronas (Promesas)
 * para que una implementación futura (API REST, base de datos…) encaje sin
 * cambiar el resto del código.
 *
 * Para cambiar de almacén: crear otra clase que extienda RepositorioJuegos y
 * elegirla en js/datos/fabrica.js. Nada más.
 * ========================================================================== */
class RepositorioJuegos {
  /** @returns {Promise<Object[]>} todos los juegos (copias; modificarlas no altera el almacén) */
  async obtenerTodos() { throw new Error("RepositorioJuegos.obtenerTodos no implementado"); }

  /** @returns {Promise<Object|null>} el juego con ese id, o null si no existe */
  async obtenerPorId(id) { throw new Error("RepositorioJuegos.obtenerPorId no implementado"); }

  /** Crea el juego, o lo reemplaza si ya existe un juego con el mismo id. @returns {Promise<Object>} */
  async guardar(juego) { throw new Error("RepositorioJuegos.guardar no implementado"); }

  /** Guarda varios juegos de una vez (crea o reemplaza por id). Las implementaciones pueden hacerlo en una sola escritura. */
  async guardarVarios(juegos) { for (const j of juegos) await this.guardar(j); }

  /** Elimina el juego. @returns {Promise<boolean>} true si existía */
  async eliminar(id) { throw new Error("RepositorioJuegos.eliminar no implementado"); }

  /**
   * Capacidades opcionales de cada implementación. La interfaz solo ofrece lo que
   * el repositorio sabe hacer:
   *  - exportar: tiene exportarComoJs() -> { nombreArchivo, contenido }
   *  - descartarCambios: tiene descartarCambiosLocales() y contarCambiosLocales()
   */
  capacidades() { return { exportar: false, descartarCambios: false }; }
}
