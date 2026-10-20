/* ============================================================================
 * PLATAFORMA: lo que depende del dispositivo (no es acceso a datos).
 *  - Dentro de la app: el archivo se escribe en la caché y se abre la hoja de compartir de
 *    Android (guardar en Drive/Descargas, enviar por WhatsApp o correo…). Un <a download> no
 *    funciona en el WebView.
 *  - En un navegador: descarga normal.
 * ========================================================================== */
const Plataforma = {
  _plugins() {
    const c = window.Capacitor;
    if (!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform() && c.Plugins)) return null;
    return c.Plugins.Filesystem && c.Plugins.Share ? c.Plugins : null;
  },

  /** @returns {Promise<boolean>} false si el usuario cerró la hoja de compartir sin elegir nada */
  async entregarArchivo(nombre, contenido, tipo) {
    const p = this._plugins();
    if (p) {
      const r = await p.Filesystem.writeFile({ path: nombre, directory: "CACHE", encoding: "utf8", data: contenido });
      try {
        await p.Share.share({ title: nombre, url: r.uri, dialogTitle: tr("copia.dialogoCompartir") });
        return true;
      } catch (e) {
        if (/cancel/i.test(String(e && e.message))) return false;
        throw e;
      }
    }
    const blob = new Blob([contenido], { type: (tipo || "application/json") + ";charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    return true;
  }
};
