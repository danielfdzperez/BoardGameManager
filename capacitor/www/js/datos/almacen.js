/* ============================================================================
 * CONTRATO DEL ALMACÉN DE DOCUMENTO (segunda abstracción, por debajo del repositorio)
 *
 * RepositorioJuegos decide QUÉ se guarda (juegos, ids, reglas de lectura/escritura);
 * el almacén decide DÓNDE se guarda el texto. Es un único documento de texto (JSON):
 * leerlo entero y escribirlo entero. Así, el repositorio local no sabe si debajo hay
 * un fichero del móvil, localStorage u otra cosa.
 *
 * Si mañana los juegos viven en un servidor, no hace falta un almacén: se crea otro
 * RepositorioJuegos (p. ej. RepositorioJuegosApi) y se elige en fabrica.js.
 * ========================================================================== */
class AlmacenDocumento {
  /** @returns {Promise<string|null>} el texto guardado, o null si todavía no existe */
  async leer() { throw new Error("AlmacenDocumento.leer no implementado"); }

  /** Sustituye el documento completo. Debe rechazar la promesa si no se pudo guardar. */
  async escribir(texto) { throw new Error("AlmacenDocumento.escribir no implementado"); }
}
