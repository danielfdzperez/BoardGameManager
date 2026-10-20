/* ============================================================================
 * REPOSITORIO LOCAL PERSISTENTE (web y app Android)
 *
 * Guarda TODA la colección en un AlmacenDocumento (localStorage en la web, fichero en el móvil):
 *  - Primer arranque: el almacén está vacío. Si hay colección empaquetada (la app: data/semilla.js,
 *    vía `semilla`) se siembra y se guarda; si no (la web) empieza vacía.
 *  - A partir de ahí el almacén es la única fuente: cada guardar/eliminar lo escribe al
 *    momento y es transparente para el usuario.
 * Formato del documento: { version, actualizado, fuente, juegos: [...] } (igual que juegos.js).
 * ========================================================================== */
class RepositorioJuegosLocal extends RepositorioJuegos {
  /**
   * @param {Object} o
   * @param {AlmacenDocumento} o.almacen dónde se guarda el documento
   * @param {Function} o.semilla devuelve { juegos: [...] } con la colección inicial (solo se usa si el almacén está vacío)
   */
  constructor(o) {
    super();
    if (!o || !o.almacen) throw new Error("RepositorioJuegosLocal necesita un almacén");
    this._almacen = o.almacen;
    this._semilla = o.semilla || function () { return null; };
    this._datos = null;      // documento en memoria (última versión guardada con éxito)
    this._cargando = null;
    this._cola = Promise.resolve();   // serializa las escrituras: dos guardar() seguidos no se pisan
  }

  /* ---------- Operaciones del contrato ---------- */
  async obtenerTodos() { return this._clonar((await this._cargar()).juegos); }

  async obtenerPorId(id) {
    const j = (await this._cargar()).juegos.find((x) => x.id === id);
    return j ? this._clonar(j) : null;
  }

  async guardar(juego) {
    if (!juego || !juego.id) throw new Error(tr("datos.sinId"));
    const copia = this._clonar(juego);
    await this._mutar((d) => {
      const i = d.juegos.findIndex((j) => j.id === copia.id);
      if (i >= 0) d.juegos[i] = copia; else d.juegos.push(copia);
    });
    return this._clonar(copia);
  }

  async guardarVarios(juegos) {
    const copias = juegos.map((j) => {
      if (!j || !j.id) throw new Error(tr("datos.sinId"));
      return this._clonar(j);
    });
    await this._mutar((d) => {   // una sola escritura para todos
      copias.forEach((c) => {
        const i = d.juegos.findIndex((j) => j.id === c.id);
        if (i >= 0) d.juegos[i] = c; else d.juegos.push(c);
      });
    });
  }

  async eliminar(id) {
    return this._mutar((d) => {
      const n = d.juegos.length;
      d.juegos = d.juegos.filter((j) => j.id !== id);
      return d.juegos.length !== n;
    });
  }

  /* ---------- Internos ---------- */
  _cargar() {
    if (this._datos) return Promise.resolve(this._datos);
    if (!this._cargando) {
      this._cargando = this._leerOSembrar()
        .then((d) => { this._datos = d; return d; })
        .finally(() => { this._cargando = null; });
    }
    return this._cargando;
  }

  async _leerOSembrar() {
    const texto = await this._almacen.leer();
    if (texto) {
      let d;
      try { d = JSON.parse(texto); } catch (e) { d = null; }
      // Nunca se sobrescribe un documento existente que no se entiende: se avisa y se conserva.
      if (!d || !Array.isArray(d.juegos)) throw new Error(tr("datos.danados"));
      // Juegos nuevos de la colección empaquetada (data/juegos.js de una versión más reciente de la app)
      const s = this._semilla();
      if (s && Array.isArray(s.juegos) && this._incorporarNuevos(d, s)) await this._almacen.escribir(JSON.stringify(d));
      return d;
    }
    const semilla = this._semilla();
    // Sin colección inicial (la web): empieza vacía; no se escribe nada hasta el primer guardado.
    if (!semilla || !Array.isArray(semilla.juegos)) return { version: 1, juegos: [] };
    const d = this._clonar(semilla);
    d.semillaIds = d.juegos.map((j) => j.id);
    await this._almacen.escribir(JSON.stringify(d));
    return d;
  }

  /**
   * Añade al documento los juegos de la semilla que la app aún no conocía. `semillaIds` guarda los ids
   * ya sembrados: así un juego que el usuario eliminó no vuelve, y los que edita no se pisan.
   * (Un documento anterior a esto no tiene semillaIds: se añaden los que falten, una sola vez.)
   * @returns {boolean} true si el documento cambió y hay que guardarlo
   */
  _incorporarNuevos(d, semilla) {
    const conocidos = new Set(d.semillaIds || []);
    const presentes = new Set(d.juegos.map((j) => j.id));
    let cambio = !d.semillaIds;
    semilla.juegos.forEach((j) => {
      if (conocidos.has(j.id)) return;
      conocidos.add(j.id);
      cambio = true;
      if (!presentes.has(j.id)) d.juegos.push(this._clonar(j));
    });
    d.semillaIds = Array.from(conocidos);
    return cambio;
  }

  /** Aplica `cambio` a una copia del documento, la guarda y solo entonces la da por buena. */
  _mutar(cambio) {
    const paso = this._cola.then(async () => {
      const copia = this._clonar(await this._cargar());
      const resultado = cambio(copia);
      copia.actualizado = new Date().toISOString().slice(0, 10);
      await this._almacen.escribir(JSON.stringify(copia));
      this._datos = copia;
      return resultado;
    });
    this._cola = paso.catch(function () { /* el error le llega al llamador; la cola sigue viva */ });
    return paso;
  }

  _clonar(x) { return JSON.parse(JSON.stringify(x)); }
}
