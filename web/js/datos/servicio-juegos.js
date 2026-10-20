/* ============================================================================
 * SERVICIO DE JUEGOS (lógica de aplicación)
 *
 * Es lo que usan las páginas. Contiene las reglas (validación, normalización,
 * generación de ids, sugerencias) y delega el almacenamiento en un
 * RepositorioJuegos que recibe en el constructor (inyección de dependencias).
 * No sabe nada de HTML ni de dónde se guardan los datos.
 * ========================================================================== */
/* Identifica los archivos de copia de seguridad exportados por la app */
const FORMATO_COPIA = "mesa-juegos";

class ServicioJuegos {
  /** @param {RepositorioJuegos} repositorio */
  constructor(repositorio) {
    if (!repositorio) throw new Error("ServicioJuegos necesita un repositorio");
    this.repositorio = repositorio;
  }

  /* ---------- Consultas ---------- */
  listar() { return this.repositorio.obtenerTodos(); }
  obtener(id) { return this.repositorio.obtenerPorId(id); }
  capacidades() { return this.repositorio.capacidades(); }

  /** Valores ya usados en la colección, ordenados por frecuencia: para autocompletar. */
  async sugerencias() {
    const juegos = await this.listar();
    const contar = (extraer) => {
      const m = new Map();
      juegos.forEach((j) => [].concat(extraer(j) || []).forEach((v) => { if (v) m.set(v, (m.get(v) || 0) + 1); }));
      return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || I18n.comparar(a[0], b[0])).map((p) => p[0]);
    };
    return {
      modo: contar((j) => j.modo),
      ambientacion: contar((j) => j.ambientacion),
      experiencia: contar((j) => j.experiencia),
      mecanicas: contar((j) => j.mecanicas),
      categorias: contar((j) => j.categorias),
      disenadores: contar((j) => j.disenadores),
      editoriales: contar((j) => j.editorial)
    };
  }

  /* ---------- Órdenes ---------- */
  /** Crea un juego nuevo a partir de datos del formulario. @returns {{ok, errores?, juego?}} */
  async crear(datos) {
    const juego = this.normalizar(datos, null);
    const errores = this.validar(juego);
    if (errores.length) return { ok: false, errores: errores };
    const existentes = (await this.listar()).map((j) => j.id);
    juego.id = this.generarId(juego.nombre, existentes);
    return { ok: true, juego: await this.repositorio.guardar(juego) };
  }

  /** Actualiza un juego existente. Los campos que el formulario no gestiona se conservan. */
  async actualizar(id, datos) {
    const actual = await this.obtener(id);
    if (!actual) return { ok: false, errores: [{ campo: "nombre", mensaje: tr("val.noExiste") }] };
    const juego = this.normalizar(datos, actual);
    juego.id = id;   // el id nunca cambia: el historial de partidas se guarda por id
    const errores = this.validar(juego);
    if (errores.length) return { ok: false, errores: errores };
    return { ok: true, juego: await this.repositorio.guardar(juego) };
  }

  eliminar(id) { return this.repositorio.eliminar(id); }

  /* ---------- Copia de seguridad: exportar / importar un JSON ---------- */
  /** @returns {Promise<{nombreArchivo: string, contenido: string, total: number}>} */
  async exportarCopia() {
    const juegos = await this.listar();
    const ahora = new Date();
    const datos = { formato: FORMATO_COPIA, version: 1, exportado: ahora.toISOString(), juegos: juegos };
    return { nombreArchivo: "juegos-mesa-" + ahora.toISOString().slice(0, 10) + ".json", contenido: JSON.stringify(datos, null, 2), total: juegos.length };
  }

  /**
   * Importa una copia: los juegos del archivo se añaden y, si ya existe uno con el mismo id, se sustituye.
   * Los demás no se tocan. Si el archivo no es válido no se cambia nada.
   * @returns {Promise<{ok: boolean, errores?: string[], anadidos?: number, actualizados?: number}>}
   */
  async importarCopia(texto) {
    let datos;
    try { datos = JSON.parse(texto); } catch (e) { return { ok: false, errores: [tr("copia.jsonInvalido")] }; }
    const lista = Array.isArray(datos) ? datos : (datos && Array.isArray(datos.juegos) ? datos.juegos : null);
    if (!lista) return { ok: false, errores: [tr("copia.sinLista")] };
    if (!lista.length) return { ok: false, errores: [tr("copia.vacio")] };
    const errores = this.validarCopia(lista);
    if (errores.length) return { ok: false, errores: errores };
    const ids = new Set((await this.listar()).map((j) => j.id));
    const actualizados = lista.filter((j) => ids.has(j.id)).length;
    await this.repositorio.guardarVarios(lista);
    return { ok: true, anadidos: lista.length - actualizados, actualizados: actualizados };
  }

  /** Comprueba la estructura mínima que necesita la app para pintar un juego. @returns {string[]} problemas (máx. 5) */
  validarCopia(lista) {
    const problemas = [];
    const vistos = new Set();
    const obj = (x) => x && typeof x === "object" && !Array.isArray(x);
    const CAMPOS_LISTA = ["modo", "ambientacion", "experiencia", "categorias", "mecanicas", "disenadores"];
    lista.forEach((j, i) => {
      const donde = tr("copia.juegoN", { n: i + 1 }) + (obj(j) && j.nombre ? " («" + j.nombre + "»)" : "");
      if (!obj(j)) { problemas.push(donde + tr("copia.noEsJuego")); return; }
      if (typeof j.id !== "string" || !j.id.trim()) problemas.push(donde + tr("copia.faltaId"));
      else if (vistos.has(j.id)) problemas.push(donde + tr("copia.idRepetido", { id: j.id }));
      else vistos.add(j.id);
      if (typeof j.nombre !== "string" || !j.nombre.trim()) problemas.push(donde + tr("copia.faltaNombre"));
      if (!obj(j.jugadores) || !obj(j.duracion) || !obj(j.preparacion)) problemas.push(donde + tr("copia.faltanDatos"));
      else if (CAMPOS_LISTA.some((c) => !Array.isArray(j[c])) || !Array.isArray(j.jugadores.mejorCon) || !Array.isArray(j.jugadores.recomendado)) {
        problemas.push(donde + tr("copia.faltanListas"));
      }
    });
    return problemas.slice(0, 5);
  }

  /* ---------- Reglas ---------- */
  generarId(nombre, existentes) {
    const base = String(nombre || "juego").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "juego";
    let id = base, n = 2;
    while (existentes.indexOf(id) !== -1) id = base + "-" + n++;
    return id;
  }

  /** Convierte los datos crudos del formulario (textos, números, listas) en un juego con el esquema completo. */
  normalizar(d, base) {
    const texto = (v) => (v == null ? "" : String(v).trim());
    const entero = (v) => { const n = parseInt(v, 10); return isNaN(n) ? null : n; };
    const decimal = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isNaN(n) ? null : n; };
    const lista = (v) => (Array.isArray(v) ? v : String(v == null ? "" : v).split(","))
      .map((x) => String(x).trim()).filter(Boolean)
      .filter((x, i, a) => a.indexOf(x) === i);
    const numeros = (v) => lista(v).map((x) => parseInt(x, 10)).filter((n) => !isNaN(n));

    const j = base ? JSON.parse(JSON.stringify(base)) : {};
    const pendiente = !!d.pendiente;
    Object.assign(j, {
      bggId: entero(d.bggId),
      nombre: texto(d.nombre),
      nombreOriginal: texto(d.nombreOriginal),
      anio: entero(d.anio),
      jugadores: { min: entero(d.jugadoresMin), max: entero(d.jugadoresMax), mejorCon: numeros(d.mejorCon), recomendado: numeros(d.recomendado) },
      duracion: { min: entero(d.duracionMin), max: entero(d.duracionMax), estimada: !!(base && base.duracion && base.duracion.estimada) },   // el formulario no gestiona las marcas de estimación: se conservan las existentes
      preparacion: { min: entero(d.preparacionMin), estimada: !!(base && base.preparacion && base.preparacion.estimada) },
      edadMinima: entero(d.edadMinima),
      peso: decimal(d.peso),
      valoracionBGG: decimal(d.valoracionBGG),
      rankingBGG: entero(d.rankingBGG),
      party: !!d.party,
      modo: lista(d.modo),
      ambientacion: lista(d.ambientacion),
      experiencia: lista(d.experiencia),
      categorias: lista(d.categorias),
      mecanicas: lista(d.mecanicas),
      disenadores: lista(d.disenadores),
      editorial: texto(d.editorial),
      descripcion: texto(d.descripcion),
      imagen: texto(d.imagen),
      bggUrl: texto(d.enlace),
      notas: texto(d.notas)
    });
    if (!j.notas) delete j.notas;
    if (!j.bggId) j.bggId = null;
    if (decimal(d.peso) == null) delete j.pesoEstimado;   // si hay base, conserva su marca pesoEstimado
    if (pendiente) j.pendiente = true; else delete j.pendiente;
    if (!pendiente) delete j.sinVerificar;
    return j;
  }

  /** @returns {{campo: string, mensaje: string}[]} lista vacía si todo es correcto */
  validar(j) {
    const e = [];
    const err = (campo, mensaje) => e.push({ campo: campo, mensaje: mensaje });
    const esUrl = (u) => /^(https?:\/\/|data:image\/)/i.test(u);
    if (!j.nombre) err("nombre", tr("val.nombre"));
    if (j.imagen && !esUrl(j.imagen)) err("imagen", tr("val.imagen"));
    if (j.bggUrl && !esUrl(j.bggUrl)) err("enlace", tr("val.enlace"));
    if (j.anio != null && (j.anio < 1800 || j.anio > 2100)) err("anio", tr("val.anio"));
    if (j.pendiente) return e;   // un juego pendiente solo necesita nombre

    const J = j.jugadores, D = j.duracion;
    if (J.min == null || J.min < 1) err("jugadoresMin", tr("val.jugMin"));
    if (J.max == null || J.max < 1) err("jugadoresMax", tr("val.jugMax"));
    if (J.min != null && J.max != null && J.min > J.max) err("jugadoresMax", tr("val.jugMaxMenor"));
    if (D.min == null || D.min < 1) err("duracionMin", tr("val.durMin"));
    if (D.max == null || D.max < 1) err("duracionMax", tr("val.durMax"));
    if (D.min != null && D.max != null && D.min > D.max) err("duracionMax", tr("val.durMaxMenor"));
    if (j.preparacion.min == null || j.preparacion.min < 0) err("preparacionMin", tr("val.prep"));
    if (j.peso == null || j.peso < 1 || j.peso > 5) err("peso", tr("val.peso"));
    if (j.valoracionBGG != null && (j.valoracionBGG < 0 || j.valoracionBGG > 10)) err("valoracionBGG", tr("val.valoracion"));
    if (!j.modo.length) err("modo", tr("val.modo"));
    return e;
  }
}
