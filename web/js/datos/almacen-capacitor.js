/* ============================================================================
 * Almacén en un fichero privado de la app (plugin @capacitor/filesystem, Directory.Data).
 *
 * El fichero sobrevive a cerrar la app y a actualizarla; solo se borra al desinstalar o
 * al "borrar datos". Como seguro extra se mantiene una copia en localStorage: si el fichero
 * falta o está corrupto (p. ej. la app murió en mitad de una escritura) se recupera de ella.
 * ========================================================================== */
class AlmacenDocumentoCapacitor extends AlmacenDocumento {
  /** @param {string} nombreFichero p. ej. "juegos.json" */
  constructor(nombreFichero) {
    super();
    this._fichero = nombreFichero || "juegos.json";
    this._copia = new AlmacenDocumentoLocalStorage("mesa_copia_" + this._fichero);
  }

  /** @returns {boolean} true si estamos dentro de la app y el plugin está disponible */
  static disponible() {
    const c = window.Capacitor;
    return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform() && c.Plugins && c.Plugins.Filesystem);
  }

  _fs() { return window.Capacitor.Plugins.Filesystem; }

  async leer() {
    let texto = null;
    try {
      const r = await this._fs().readFile({ path: this._fichero, directory: "DATA", encoding: "utf8" });
      texto = typeof r.data === "string" ? r.data : null;
    } catch (e) { texto = null; }   // no existe todavía (primer arranque) o no se pudo leer
    if (texto) { try { JSON.parse(texto); return texto; } catch (e) { /* corrupto: usar la copia */ } }
    return this._copia.leer();
  }

  async escribir(texto) {
    await this._fs().writeFile({ path: this._fichero, directory: "DATA", encoding: "utf8", data: texto, recursive: true });
    try { await this._copia.escribir(texto); } catch (e) { /* la copia es solo un seguro */ }
  }
}
