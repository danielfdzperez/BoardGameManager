/* Almacén en localStorage: para probar la app en un navegador (sin Capacitor) y como último recurso. */
class AlmacenDocumentoLocalStorage extends AlmacenDocumento {
  constructor(clave) { super(); this._clave = clave || "mesa_juegos_documento"; }

  async leer() {
    try { return localStorage.getItem(this._clave); } catch (e) { return null; }
  }

  async escribir(texto) {
    try { localStorage.setItem(this._clave, texto); }
    catch (e) { throw new Error(tr("datos.noGuardado")); }
  }
}
