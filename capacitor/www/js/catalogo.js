/* Catálogo con filtros laterales */
(function () {
  let juegos = [];
  const el = {
    rejilla: document.getElementById("rejilla"),
    contador: document.getElementById("contador"),
    texto: document.getElementById("f-texto"),
    jugadores: document.getElementById("f-jugadores"),
    tiempo: document.getElementById("f-tiempo"),
    vTiempo: document.getElementById("v-tiempo"),
    prep: document.getElementById("f-prep"),
    vPrep: document.getElementById("v-prep"),
    party: document.getElementById("f-party"),
    nParty: document.getElementById("n-party"),
    historial: document.getElementById("f-historial"),
    dificultad: document.getElementById("f-dificultad"),
    modo: document.getElementById("f-modo"),
    ambientacion: document.getElementById("f-ambientacion"),
    mecanicas: document.getElementById("f-mecanicas"),
    orden: document.getElementById("orden"),
    panel: document.getElementById("filtros"),
    modalFondo: document.getElementById("modal-fondo"),
    modal: document.getElementById("modal")
  };

  const DIFICULTADES = ["facil", "media", "dificil", "experto"];

  function contar(campo) {
    const mapa = new Map();
    juegos.forEach(function (j) {
      j[campo].forEach(function (v) { mapa.set(v, (mapa.get(v) || 0) + 1); });
    });
    return Array.from(mapa.entries()).sort(function (a, b) { return b[1] - a[1] || I18n.comparar(a[0], b[0]); });
  }

  function pintarChecks(contenedor, items, nombre) {
    contenedor.innerHTML = items.map(function (it) {
      return '<label><input type="checkbox" name="' + nombre + '" value="' + esc(it.valor) + '"> ' +
        esc(it.texto) + (it.n != null ? '<span class="contador-opcion">' + it.n + "</span>" : "") + "</label>";
    }).join("");
  }

  function marcados(contenedor) {
    return Array.from(contenedor.querySelectorAll("input:checked")).map(function (i) { return i.value; });
  }

  function construirFiltros() {
    pintarChecks(el.dificultad, DIFICULTADES.map(function (d) {
      return { valor: d, texto: tr("dificultad." + d), n: juegos.filter(function (j) { return nivelDificultad(j.peso).clave === d; }).length };
    }), "dificultad");
    pintarChecks(el.modo, contar("modo").map(function (p) { return { valor: p[0], texto: tv("modo", p[0]), n: p[1] }; }), "modo");
    pintarChecks(el.ambientacion, contar("ambientacion").map(function (p) { return { valor: p[0], texto: p[0], n: p[1] }; }), "ambientacion");
    pintarChecks(el.mecanicas, contar("mecanicas").map(function (p) { return { valor: p[0], texto: p[0], n: p[1] }; }), "mecanicas");
    el.nParty.textContent = juegos.filter(function (j) { return j.party; }).length;
  }

  function textoTiempo() {
    const t = Number(el.tiempo.value);
    if (t >= 240) return tr("filtros.sinLimite");
    return t >= 60 ? tr("unidad.horasN", { n: I18n.numero(t / 60) }) : tr("unidad.minN", { n: t });
  }

  function textoPrep() {
    const t = Number(el.prep.value);
    return t >= 30 ? tr("filtros.sinLimite") : tr("filtros.hasta", { valor: tr("unidad.minN", { n: t }) });
  }

  function hayFiltrosDeDatos() {
    return Boolean(el.jugadores.value || Number(el.tiempo.value) < 240 || Number(el.prep.value) < 30 ||
      el.historial.value || el.panel.querySelectorAll("input[type=checkbox]:checked").length);
  }

  function filtrar() {
    const q = el.texto.value.trim().toLowerCase();
    const n = el.jugadores.value ? Number(el.jugadores.value) : null;
    const t = Number(el.tiempo.value);
    const p = Number(el.prep.value);
    const difs = marcados(el.dificultad);
    const modos = marcados(el.modo);
    const ambs = marcados(el.ambientacion);
    const mecs = marcados(el.mecanicas);
    const hist = el.historial.value;
    const filtrando = hayFiltrosDeDatos();

    return juegos.filter(function (j) {
      if (q) {
        const pajar = [j.nombre, j.nombreOriginal, j.descripcion].concat(j.mecanicas, j.categorias, j.ambientacion).join(" ").toLowerCase();
        if (pajar.indexOf(q) === -1) return false;
      }
      if (j.pendiente) return !filtrando;   // sin datos: solo se ven si no hay filtros
      if (n != null) {
        const encaja = n >= 8 ? j.jugadores.max >= 8 : (n >= j.jugadores.min && n <= j.jugadores.max);
        if (!encaja) return false;
      }
      if (t < 240 && j.duracion.min > t) return false;
      if (p < 30 && (j.preparacion.min == null || j.preparacion.min > p)) return false;
      if (el.party.checked && !j.party) return false;
      if (difs.length && difs.indexOf(nivelDificultad(j.peso).clave) === -1) return false;
      if (modos.length && !modos.some(function (m) { return j.modo.indexOf(m) !== -1; })) return false;
      if (ambs.length && !ambs.some(function (a) { return j.ambientacion.indexOf(a) !== -1; })) return false;
      if (mecs.length && !mecs.every(function (m) { return j.mecanicas.indexOf(m) !== -1; })) return false;
      if (hist) {
        const h = Historial.obtener(j.id);
        if (hist === "nuevos" && h.partidas > 0) return false;
        if (hist === "jugados" && h.partidas === 0) return false;
        if (hist === "favoritos" && h.nota < 4) return false;
      }
      return true;
    });
  }

  /* Sentido del orden: cada criterio empieza en su sentido natural (nombre A-Z, menor tiempo/dificultad primero;
     valoración, jugadores, veces jugado y nota, de mayor a menor) y el botón lo invierte. */
  let ascendente = true;
  function ascendentePorDefecto(criterio) { return ["valoracion", "jugadores", "masjugados", "minota"].indexOf(criterio) === -1; }
  function pintarBotonOrden() {
    const b = document.getElementById("orden-dir");
    b.textContent = ascendente ? tr("orden.asc") : tr("orden.desc");
    b.setAttribute("aria-label", tr(ascendente ? "orden.ariaAsc" : "orden.ariaDesc"));
  }

  function ordenar(lista) {
    const criterio = el.orden.value;
    const clave = function (j) {
      switch (criterio) {
        case "duracion": return j.duracion.min;
        case "preparacion": return j.preparacion.min;
        case "dificultad": return j.peso;
        case "valoracion": return j.valoracionBGG;
        case "jugadores": return j.jugadores.max;
        case "masjugados": return Historial.obtener(j.id).partidas;
        case "minota": return Historial.obtener(j.id).nota;
        default: return j.nombre;
      }
    };
    const sentido = ascendente ? 1 : -1;
    const copia = lista.slice();
    copia.sort(function (a, b) {
      const x = clave(a), y = clave(b);
      if (x == null && y == null) return I18n.comparar(a.nombre, b.nombre);
      if (x == null) return 1;    // sin dato: siempre al final, en cualquier sentido
      if (y == null) return -1;
      const c = typeof x === "string" ? I18n.comparar(x, y) : x - y;
      return c * sentido || I18n.comparar(a.nombre, b.nombre);   // desempate: nombre A-Z
    });
    /* los pendientes siempre al final */
    return copia.sort(function (a, b) { return (a.pendiente ? 1 : 0) - (b.pendiente ? 1 : 0); });
  }

  function insigniasHistorial(j) {
    const h = Historial.obtener(j.id);
    let s = "";
    if (h.partidas) s += '<span class="chip-hist">▶ ' + h.partidas + "</span>";
    if (h.nota) s += '<span class="chip-hist nota">★ ' + h.nota + "</span>";
    return s ? '<div class="chips-hist">' + s + "</div>" : "";
  }

  function tarjeta(j) {
    const pendiente = j.pendiente ? '<span class="cinta">' + esc(tr("cinta.pendiente")) + "</span>" : j.sinVerificar ? '<span class="cinta aviso">' + esc(tr("cinta.sinVerificar")) + "</span>" : "";
    return '<button class="tarjeta' + (j.pendiente ? " pendiente" : "") + '" type="button" data-id="' + esc(j.id) + '">' +
      '<div class="portada">' + htmlImagen(j) + pendiente + (j.party ? '<span class="cinta party">🎉 ' + esc(tr("cinta.party")) + "</span>" : "") + insigniasHistorial(j) + "</div>" +
      '<div class="cuerpo"><h3>' + esc(j.nombre) + "</h3>" +
      '<div class="datos">' +
      "<span>👥 " + textoJugadores(j) + "</span>" +
      "<span>⏱ " + textoDuracion(j) + "</span>" +
      insigniaDificultad(j) +
      "</div></div></button>";
  }

  function pintar() {
    el.vTiempo.textContent = textoTiempo();
    el.vPrep.textContent = textoPrep();
    const lista = ordenar(filtrar());
    el.contador.textContent = lista.length;
    el.rejilla.innerHTML = lista.length
      ? lista.map(tarjeta).join("")
      : juegos.length
        ? '<div class="sin-resultados"><h2>' + esc(tr("catalogo.ningunoEncaja")) + "</h2><p>" + esc(tr("catalogo.quitaFiltros")) + "</p></div>"
        : '<div class="sin-resultados"><h2>' + esc(tr("catalogo.vacioTitulo")) + "</h2><p>" + tr("catalogo.vacioTexto") + "</p></div>";
  }

  function listaEtiquetas(items) {
    return '<div class="etiquetas">' + items.map(function (i) { return '<span class="etiqueta">' + esc(i) + "</span>"; }).join("") + "</div>";
  }

  function abrirModal(id) {
    const j = juegos.find(function (x) { return x.id === id; });
    if (!j) return;
    const mejor = j.jugadores.mejorCon.length ? j.jugadores.mejorCon.join(", ") : "—";
    const aviso = j.notas ? '<p class="notas">' + esc(j.notas) + "</p>" : "";
    const enlace = j.bggUrl ? '<p><a href="' + esc(j.bggUrl) + '" target="_blank" rel="noopener">' + esc(j.enlaceTexto || tr("comun.verBgg")) + ' ↗</a></p>' : "";
    const editar = '<p><a href="crear.html?editar=' + encodeURIComponent(j.id) + '">✏️ ' + esc(tr("catalogo.editar")) + "</a></p>";
    const comun =
      '<button class="modal-cerrar" type="button" id="modal-cerrar" aria-label="' + esc(tr("comun.cerrar")) + '">✕</button>' +
      "<div>" + htmlImagen(j, "portada-grande") + "</div>";

    if (j.pendiente) {
      el.modal.innerHTML = comun + "<div><h2>" + esc(j.nombre) + "</h2>" +
        '<p class="aviso-info">' + esc(tr("catalogo.pendienteAviso")) + "</p>" +
        aviso + enlace + editar + htmlPanelHistorial(j.id) + "</div>";
    } else {
      el.modal.innerHTML = comun +
        "<div><h2>" + esc(j.nombre) + "</h2>" +
        '<div class="notas">' + esc([j.nombreOriginal, j.anio].filter(Boolean).join(" · ")) + (j.party ? " · 🎉 " + esc(tr("cinta.party")) : "") + "</div>" +
        '<div class="ficha-datos">' +
        "<div><small>" + esc(tr("ficha.jugadores")) + "</small>" + textoJugadores(j) + "</div>" +
        "<div><small>" + esc(tr("ficha.mejorCon")) + "</small>" + esc(mejor) + "</div>" +
        "<div><small>" + esc(tr("ficha.duracion")) + "</small>" + textoDuracion(j) + "</div>" +
        "<div><small>" + esc(tr("ficha.preparacion")) + "</small>" + textoPreparacion(j) + "</div>" +
        "<div><small>" + esc(tr("ficha.dificultad")) + "</small>" + insigniaDificultad(j) + " " + (j.peso != null ? I18n.numero(j.peso, 1) + "/5" : "") + "</div>" +
        "<div><small>" + esc(tr("ficha.edad")) + "</small>" + (j.edadMinima != null ? j.edadMinima + "+" : "—") + "</div>" +
        "<div><small>" + esc(tr("ficha.valoracion")) + "</small>" + (j.valoracionBGG ? I18n.numero(j.valoracionBGG, 2) : "—") + "</div>" +
        "</div>" +
        htmlPanelHistorial(j.id) +
        "<p>" + esc(j.descripcion) + "</p>" +
        "<h4>" + esc(tr("ficha.modo")) + "</h4>" + listaEtiquetas(j.modo.map(function (m) { return tv("modo", m); })) +
        "<h4>" + esc(tr("ficha.mecanicas")) + "</h4>" + listaEtiquetas(j.mecanicas) +
        "<h4>" + esc(tr("ficha.categorias")) + "</h4>" + listaEtiquetas(j.categorias) +
        "<p><small>" + esc(tr("ficha.diseno", { valor: j.disenadores.join(", ") || "—" })) + " · " + esc(tr("ficha.editorial", { valor: j.editorial || "—" })) + "</small></p>" +
        aviso + enlace + editar + "</div>";
    }
    enlazarPanelHistorial(el.modal, pintar);
    el.modalFondo.classList.add("abierto");
    document.getElementById("modal-cerrar").addEventListener("click", cerrarModal);
  }

  function cerrarModal() { el.modalFondo.classList.remove("abierto"); }

  function limpiar() {
    el.texto.value = "";
    el.jugadores.value = "";
    el.tiempo.value = 240;
    el.prep.value = 30;
    el.historial.value = "";
    el.panel.querySelectorAll("input[type=checkbox]").forEach(function (c) { c.checked = false; });
    pintar();
  }

  function eventos() {
    el.panel.addEventListener("input", pintar);
    el.panel.addEventListener("change", pintar);
    el.orden.addEventListener("change", function () { ascendente = ascendentePorDefecto(el.orden.value); pintarBotonOrden(); pintar(); });
    document.getElementById("orden-dir").addEventListener("click", function () { ascendente = !ascendente; pintarBotonOrden(); pintar(); });
    pintarBotonOrden();
    document.getElementById("limpiar").addEventListener("click", limpiar);
    const fondoFiltros = document.getElementById("fondo-filtros");
    function panelFiltros(abrir) {
      el.panel.classList.toggle("abierto", abrir);
      fondoFiltros.classList.toggle("abierto", abrir);
      document.body.classList.toggle("filtros-abiertos", abrir);
    }
    document.getElementById("abrir-filtros").addEventListener("click", function () { panelFiltros(true); });
    document.getElementById("cerrar-filtros").addEventListener("click", function () { panelFiltros(false); });
    fondoFiltros.addEventListener("click", function () { panelFiltros(false); });
    el.rejilla.addEventListener("click", function (e) {
      const t = e.target.closest(".tarjeta");
      if (t) abrirModal(t.dataset.id);
    });
    el.modalFondo.addEventListener("click", function (e) { if (e.target === el.modalFondo) cerrarModal(); });
    /* Botón atrás de Android: primero cierra el juego abierto, después los filtros */
    Atras.registrar(function () {
      if (el.modalFondo.classList.contains("abierto")) { cerrarModal(); return true; }
      if (el.panel.classList.contains("abierto")) { panelFiltros(false); return true; }
      return false;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { cerrarModal(); panelFiltros(false); }
    });
  }

  instalarFallbackImagenes();
  Promise.all([I18n.listo, Servicios.juegos.listar()]).then(function (r) {
    juegos = r[1];
    construirFiltros();
    eventos();
    const q = new URLSearchParams(location.search).get("q");
    if (q) el.texto.value = q;
    pintar();
  }).catch(function (err) { mostrarErrorCarga(el.rejilla, err); });
})();
