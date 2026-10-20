/* Página «Crear juego»: formulario para añadir o editar juegos. Solo habla con Servicios.juegos. */
(function () {
  const servicio = Servicios.juegos;
  const MODOS_BASE = ["Cooperativo", "Competitivo", "Solitario", "Semicooperativo", "Por equipos", "Con app", "Narrativo"];
  const form = document.getElementById("formulario");
  const mensajes = document.getElementById("mensajes");
  const selector = document.getElementById("selector-editar");
  const etiquetas = {};          // campo -> EntradaEtiquetas
  let editandoId = null;         // null = juego nuevo
  let confirmandoBorrado = null; // temporizador de la doble confirmación

  /* ---------- Componente: entrada de etiquetas con autocompletado ---------- */
  class EntradaEtiquetas {
    constructor(contenedor, sugerencias) {
      this.valores = [];
      this.contenedor = contenedor;
      const id = "sug-" + contenedor.dataset.campo;
      contenedor.innerHTML = '<div class="chips"></div>' +
        '<input type="text" list="' + id + '" autocomplete="off" placeholder="' + esc(contenedor.dataset.ayudaClave ? tr(contenedor.dataset.ayudaClave) : "") + '">' +
        '<datalist id="' + id + '">' + sugerencias.map(function (s) { return '<option value="' + esc(s) + '">'; }).join("") + "</datalist>";
      this.chips = contenedor.querySelector(".chips");
      this.input = contenedor.querySelector("input");
      this.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === ",") { e.preventDefault(); this.añadir(this.input.value); }
        else if (e.key === "Backspace" && !this.input.value && this.valores.length) { this.quitar(this.valores.length - 1); }
      });
      this.input.addEventListener("change", () => { if (this.input.value.trim()) this.añadir(this.input.value); });
      this.input.addEventListener("blur", () => { if (this.input.value.trim()) this.añadir(this.input.value); });
    }
    añadir(texto) {
      String(texto).split(",").map(function (t) { return t.trim(); }).filter(Boolean).forEach((t) => {
        if (this.valores.indexOf(t) === -1) this.valores.push(t);
      });
      this.input.value = "";
      this.pintar();
    }
    quitar(i) { this.valores.splice(i, 1); this.pintar(); }
    poner(lista) { this.valores = (lista || []).slice(); this.input.value = ""; this.pintar(); }
    pintar() {
      this.chips.innerHTML = this.valores.map(function (v, i) {
        return '<span class="chip">' + esc(v) + ' <button type="button" data-i="' + i + '" aria-label="' + esc(tr("crear.quitar", { valor: v })) + '">×</button></span>';
      }).join("");
      this.chips.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => this.quitar(Number(b.dataset.i))));
    }
  }

  /* ---------- Lectura y escritura del formulario ---------- */
  function valor(id) { return document.getElementById(id).value; }
  function marcado(id) { return document.getElementById(id).checked; }

  function leer() {
    return {
      nombre: valor("nombre"), nombreOriginal: valor("nombreOriginal"), anio: valor("anio"), editorial: valor("editorial"),
      disenadores: etiquetas.disenadores.valores, pendiente: marcado("pendiente"),
      jugadoresMin: valor("jugadoresMin"), jugadoresMax: valor("jugadoresMax"), mejorCon: valor("mejorCon"), recomendado: valor("recomendado"),
      duracionMin: valor("duracionMin"), duracionMax: valor("duracionMax"), preparacionMin: valor("preparacionMin"), edadMinima: valor("edadMinima"),
      peso: valor("peso"),
      modo: Array.from(document.querySelectorAll("#modos input:checked")).map(function (c) { return c.value; }),
      party: marcado("party"),
      ambientacion: etiquetas.ambientacion.valores, experiencia: etiquetas.experiencia.valores,
      mecanicas: etiquetas.mecanicas.valores, categorias: etiquetas.categorias.valores,
      imagen: valor("imagen"), descripcion: valor("descripcion"), notas: valor("notas"),
      enlace: valor("enlace"), bggId: valor("bggId"), valoracionBGG: valor("valoracionBGG"), rankingBGG: valor("rankingBGG")
    };
  }

  function poner(id, v) { document.getElementById(id).value = v == null ? "" : v; }

  function rellenar(j) {
    poner("nombre", j.nombre); poner("nombreOriginal", j.nombreOriginal); poner("anio", j.anio); poner("editorial", j.editorial);
    etiquetas.disenadores.poner(j.disenadores);
    document.getElementById("pendiente").checked = !!j.pendiente;
    poner("jugadoresMin", j.jugadores.min); poner("jugadoresMax", j.jugadores.max);
    poner("mejorCon", j.jugadores.mejorCon.join(", ")); poner("recomendado", j.jugadores.recomendado.join(", "));
    poner("duracionMin", j.duracion.min); poner("duracionMax", j.duracion.max);
    poner("preparacionMin", j.preparacion ? j.preparacion.min : "");
    poner("edadMinima", j.edadMinima);
    poner("peso", j.peso == null ? 2 : j.peso);
    document.querySelectorAll("#modos input").forEach(function (c) { c.checked = j.modo.indexOf(c.value) !== -1; });
    document.getElementById("party").checked = !!j.party;
    etiquetas.ambientacion.poner(j.ambientacion); etiquetas.experiencia.poner(j.experiencia);
    etiquetas.mecanicas.poner(j.mecanicas); etiquetas.categorias.poner(j.categorias);
    poner("imagen", j.imagen); poner("descripcion", j.descripcion); poner("notas", j.notas);
    poner("enlace", j.bggUrl); poner("bggId", j.bggId); poner("valoracionBGG", j.valoracionBGG); poner("rankingBGG", j.rankingBGG);
    actualizarPeso(j.peso == null);
    actualizarVistaImagen();
  }

  function vaciar() {
    form.reset();
    Object.keys(etiquetas).forEach(function (k) { etiquetas[k].poner([]); });
    document.getElementById("peso").value = 2;
    actualizarPeso(true);
    actualizarVistaImagen();
    limpiarErrores();
  }

  /* ---------- Interfaz ---------- */
  function actualizarPeso(sinValor) {
    const p = parseFloat(valor("peso"));
    const n = nivelDificultad(p);
    document.getElementById("salida-peso").textContent = sinValor ? tr("crear.sinIndicar") : I18n.numero(p, 2) + " · " + n.texto;
  }

  function actualizarVistaImagen() {
    const img = document.getElementById("vista-imagen");
    const estado = document.getElementById("vista-estado");
    const url = valor("imagen").trim();
    if (!url) { img.hidden = true; estado.textContent = tr("crear.sinImagen"); return; }
    estado.textContent = tr("comun.cargando");
    img.onload = function () { img.hidden = false; estado.textContent = ""; };
    img.onerror = function () { img.hidden = true; estado.textContent = tr("crear.imagenFalla"); };
    img.src = url;
  }

  function limpiarErrores() {
    mensajes.innerHTML = "";
    form.querySelectorAll(".con-error").forEach(function (c) { c.classList.remove("con-error"); });
  }

  function mostrarErrores(errores) {
    mensajes.innerHTML = '<div class="aviso-error"><strong>' + esc(tr("crear.revisa")) + "</strong><ul>" +
      errores.map(function (e) { return "<li>" + esc(e.mensaje) + "</li>"; }).join("") + "</ul></div>";
    errores.forEach(function (e) {
      const el = document.getElementById(e.campo) || document.querySelector('[data-campo="' + e.campo + '"]') || document.getElementById("modos");
      if (el) el.classList.add("con-error");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    const primero = form.querySelector(".con-error");
    if (primero && primero.focus) primero.focus();
  }

  function mostrarExito(texto, juego) {
    mensajes.innerHTML = '<div class="aviso-ok">' + esc(texto) +
      ' <a href="index.html">' + esc(tr("crear.verCatalogo")) + "</a>" + (juego ? ' · <a href="index.html?q=' + encodeURIComponent(juego.nombre) + '">' + esc(tr("crear.buscarlo")) + "</a>" : "") + "</div>";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function refrescarLista(seleccion) {
    const lista = (await servicio.listar()).sort(function (a, b) { return I18n.comparar(a.nombre, b.nombre); });
    selector.innerHTML = '<option value="">➕ ' + esc(tr("crear.juegoNuevo")) + "</option>" +
      lista.map(function (j) { return '<option value="' + esc(j.id) + '">✏️ ' + esc(tr("crear.editarN", { nombre: j.nombre })) + (j.pendiente ? " " + esc(tr("crear.pendienteP")) : "") + "</option>"; }).join("");
    selector.value = seleccion || "";
  }

  async function modoEdicion(id) {
    limpiarErrores();
    if (!id) {
      editandoId = null;
      vaciar();
      document.getElementById("titulo-form").textContent = tr("crear.tituloNuevo");
      document.getElementById("guardar").textContent = tr("crear.guardar");
      document.getElementById("eliminar").hidden = true;
      return;
    }
    const juego = await servicio.obtener(id);
    if (!juego) { mostrarErrores([{ campo: "nombre", mensaje: tr("crear.noEncontrado") }]); return; }
    editandoId = id;
    rellenar(juego);
    document.getElementById("titulo-form").textContent = tr("crear.editarN", { nombre: juego.nombre });
    document.getElementById("guardar").textContent = tr("crear.guardarCambios");
    document.getElementById("eliminar").hidden = false;
    window.scrollTo({ top: 0 });
  }

  /* ---------- Acciones ---------- */
  async function guardar(e) {
    e.preventDefault();
    limpiarErrores();
    try {
      const datos = leer();
      const r = editandoId ? await servicio.actualizar(editandoId, datos) : await servicio.crear(datos);
      if (!r.ok) { mostrarErrores(r.errores); return; }
      const eraNuevo = !editandoId;
      await refrescarLista(r.juego.id);
      editandoId = r.juego.id;
      document.getElementById("titulo-form").textContent = tr("crear.editarN", { nombre: r.juego.nombre });
      document.getElementById("guardar").textContent = tr("crear.guardarCambios");
      document.getElementById("eliminar").hidden = false;
      mostrarExito(eraNuevo ? tr("crear.creado") : tr("crear.guardado"), r.juego);
    } catch (err) {
      mostrarErrores([{ campo: "nombre", mensaje: err.message || String(err) }]);
    }
  }

  async function eliminar() {
    const boton = document.getElementById("eliminar");
    if (!confirmandoBorrado) {
      boton.textContent = tr("crear.eliminarSeguro");
      confirmandoBorrado = setTimeout(function () { confirmandoBorrado = null; boton.textContent = tr("crear.eliminar"); }, 4000);
      return;
    }
    clearTimeout(confirmandoBorrado); confirmandoBorrado = null; boton.textContent = tr("crear.eliminar");
    await servicio.eliminar(editandoId);
    await refrescarLista("");
    await modoEdicion("");
    mostrarExito(tr("crear.eliminado"), null);
  }

  /* ---------- Copia de seguridad (exportar / importar JSON) ---------- */
  function mensajeCopia(clase, html) {
    document.getElementById("mensaje-copia").innerHTML = '<div class="' + clase + '" style="margin-top:12px">' + html + "</div>";
  }

  async function exportarJson() {
    try {
      const f = await servicio.exportarCopia();
      const entregado = await Plataforma.entregarArchivo(f.nombreArchivo, f.contenido, "application/json");
      if (entregado) mensajeCopia("aviso-ok", tr("copia.lista", { n: f.total, archivo: "<code>" + esc(f.nombreArchivo) + "</code>" }));
    } catch (err) {
      mensajeCopia("aviso-error", esc(tr("copia.errorExportar", { error: err.message || String(err) })));
    }
  }

  async function importarJson(archivo) {
    if (!archivo) return;
    try {
      const r = await servicio.importarCopia(await archivo.text());
      if (!r.ok) {
        mensajeCopia("aviso-error", "<strong>" + esc(tr("copia.nadaImportado")) + "</strong><ul>" + r.errores.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>");
        return;
      }
      await refrescarLista("");
      mensajeCopia("aviso-ok", esc(tr("copia.importado", { nuevos: r.anadidos, actualizados: r.actualizados })) + ' <a href="index.html">' + esc(tr("crear.verCatalogo")) + "</a>");
    } catch (err) {
      mensajeCopia("aviso-error", esc(tr("copia.errorImportar", { error: err.message || String(err) })));
    }
  }
  /* ---------- Rellenar desde BoardGameGeek (solo en la app) ---------- */
  function mensajeBgg(clase, html) {
    document.getElementById("bgg-mensaje").innerHTML = '<div class="' + clase + '" style="margin-top:8px">' + html + "</div>";
  }

  async function rellenarDesdeBgg() {
    const boton = document.getElementById("bgg-rellenar");
    const entrada = document.getElementById("bgg-entrada");
    boton.disabled = true;
    mensajeBgg("aviso-ok", esc(tr("bgg.consultando")));
    try {
      const r = await Bgg.obtener(entrada.value || valor("bggId") || valor("enlace"));
      const c = r.campos;
      ["bggId", "enlace", "nombreOriginal", "anio", "editorial", "jugadoresMin", "jugadoresMax", "mejorCon", "recomendado",
        "duracionMin", "duracionMax", "edadMinima", "valoracionBGG", "rankingBGG", "imagen", "descripcion", "peso"]
        .forEach(function (k) { if (c[k] !== "" && c[k] != null) poner(k, c[k]); });
      if (!valor("nombre").trim()) poner("nombre", c.nombreOriginal);
      ["disenadores", "categorias", "mecanicas"].forEach(function (k) { if (c[k].length) etiquetas[k].poner(c[k]); });
      document.querySelectorAll("#modos input").forEach(function (m) { if (c.modo.indexOf(m.value) !== -1) m.checked = true; });
      if (c.peso != null) actualizarPeso(false);
      actualizarVistaImagen();
      mensajeBgg("aviso-ok", esc(tr("bgg.cargado", { nombre: c.nombreOriginal })) +
        (r.avisos.length ? "<ul>" + r.avisos.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>" : ""));
    } catch (err) {
      mensajeBgg("aviso-error", esc(err.message || String(err)));
    } finally {
      boton.disabled = false;
    }
  }

  /* ---------- Arranque ---------- */
  async function iniciar() {
    const sug = await servicio.sugerencias();
    document.getElementById("lista-editoriales").innerHTML = sug.editoriales.map(function (s) { return '<option value="' + esc(s) + '">'; }).join("");
    document.querySelectorAll(".etiquetas-input").forEach(function (c) {
      etiquetas[c.dataset.campo] = new EntradaEtiquetas(c, sug[c.dataset.sugerencias] || []);
    });
    const modos = MODOS_BASE.concat(sug.modo.filter(function (m) { return MODOS_BASE.indexOf(m) === -1; }));
    document.getElementById("modos").innerHTML = modos.map(function (m) {
      return '<label class="check"><input type="checkbox" value="' + esc(m) + '"> ' + esc(tv("modo", m)) + "</label>";
    }).join("");

    document.getElementById("peso").addEventListener("input", function () { actualizarPeso(false); });
    document.getElementById("imagen").addEventListener("change", actualizarVistaImagen);
    document.getElementById("imagen").addEventListener("blur", actualizarVistaImagen);
    form.addEventListener("submit", guardar);
    document.getElementById("limpiar-form").addEventListener("click", function () { selector.value = ""; modoEdicion(""); });
    document.getElementById("eliminar").addEventListener("click", eliminar);
    selector.addEventListener("change", function () { modoEdicion(selector.value); });
    const archivo = document.getElementById("archivo-json");
    document.getElementById("exportar-json").addEventListener("click", exportarJson);
    document.getElementById("importar-json").addEventListener("click", function () { archivo.value = ""; archivo.click(); });
    archivo.addEventListener("change", function () { importarJson(archivo.files[0]); });
    document.getElementById("bgg-rellenar").addEventListener("click", rellenarDesdeBgg);

    actualizarPeso(true);
    const idEditar = new URLSearchParams(location.search).get("editar");
    await refrescarLista(idEditar || "");
    if (idEditar) await modoEdicion(idEditar);
  }

  I18n.listo.then(iniciar).catch(function (err) { mostrarErrorCarga(mensajes, err); });
})();
