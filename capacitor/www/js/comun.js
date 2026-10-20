/* Utilidades compartidas por el catálogo y el asistente */
/* El acceso a los datos vive en js/datos/ (repositorio + servicio). Las páginas usan Servicios.juegos. */

function mostrarErrorCarga(contenedor, error) {
  contenedor.innerHTML =
    '<div class="aviso-error"><h2>' + esc(tr("error.carga")) + "</h2>" +
    '<p class="detalle">' + esc(String(error.message || error)) + "</p></div>";
}

/* ---------- Botón "atrás" de Android ----------
   Cada pantalla registra un manejador que devuelve true si ha gestionado el "atrás" (cerrar un panel,
   volver a la pregunta anterior…). Si ninguno lo gestiona, js/app-nativa.js decide (catálogo: salir; resto: ir al catálogo). */
const Atras = (function () {
  const manejadores = [];
  return {
    registrar: function (fn) { manejadores.push(fn); },
    /** @returns {boolean} true si algún manejador lo ha gestionado (se prueba del último al primero) */
    manejar: function () {
      for (let i = manejadores.length - 1; i >= 0; i--) { if (manejadores[i]() === true) return true; }
      return false;
    }
  };
})();

/* ---------- Formato ---------- */
function nivelDificultad(peso) {
  if (peso == null) return { clave: "sin", texto: "—" };
  if (peso < 2) return { clave: "facil", texto: tr("dificultad.facil") };
  if (peso < 2.8) return { clave: "media", texto: tr("dificultad.media") };
  if (peso < 3.5) return { clave: "dificil", texto: tr("dificultad.dificil") };
  return { clave: "experto", texto: tr("dificultad.experto") };
}

function textoJugadores(j) {
  if (j.jugadores.min == null) return "—";
  return j.jugadores.min === j.jugadores.max ? String(j.jugadores.min) : j.jugadores.min + "–" + j.jugadores.max;
}

function textoDuracion(j) {
  const d = j.duracion;
  if (d.min == null) return "—";
  const rango = (d.min === d.max ? d.min : d.min + "–" + d.max) + " " + tr("unidad.min");
  return (d.estimada ? "~" : "") + rango;
}

function textoPreparacion(j) {
  const p = j.preparacion;
  if (!p || p.min == null) return "—";
  return (p.estimada ? "~" : "") + p.min + " " + tr("unidad.min");
}

function esc(texto) {
  const d = document.createElement("div");
  d.textContent = texto == null ? "" : String(texto);
  return d.innerHTML;
}

function imagenReserva(nombre) {
  const letras = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join("").toUpperCase();
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
    '<rect width="300" height="300" fill="#2b2f3a"/>' +
    '<text x="150" y="175" font-family="Arial" font-size="90" fill="#8b93a7" text-anchor="middle">' + letras + "</text></svg>";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function htmlImagen(juego, clase) {
  const alternativas = [juego.imagenAlternativa].filter(Boolean).join("|");
  const src = juego.imagen || imagenReserva(juego.nombre);
  return '<img class="' + (clase || "") + '" src="' + esc(src) + '" alt="' + esc(tr("imagen.portada", { nombre: juego.nombre })) +
    '" loading="lazy" data-alt="' + esc(alternativas) + '" data-nombre="' + esc(juego.nombre) + '">';
}

function instalarFallbackImagenes(raiz) {
  (raiz || document).addEventListener("error", function (e) {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.nombre) return;
    const restantes = (img.dataset.alt || "").split("|").filter(Boolean);
    if (restantes.length) {
      img.dataset.alt = restantes.slice(1).join("|");
      img.src = restantes[0];
    } else {
      img.src = imagenReserva(img.dataset.nombre);
      img.dataset.nombre = "";
    }
  }, true);
}

function insigniaDificultad(juego) {
  const n = nivelDificultad(juego.peso);
  const est = juego.pesoEstimado ? " " + tr("dificultad.est") : "";
  return '<span class="insignia dif-' + n.clave + '">' + n.texto + est + "</span>";
}

/* ---------- Historial (partidas y nota) guardado en cookies ---------- */
const Historial = (function () {
  const CLAVE = "mesa_hist";
  const MAX_TROZOS = 20;
  const TAM_TROZO = 3000;
  let datos = null;

  function leerCookie(nombre) {
    const trozos = document.cookie ? document.cookie.split("; ") : [];
    for (let i = 0; i < trozos.length; i++) {
      const p = trozos[i].indexOf("=");
      if (trozos[i].slice(0, p) === nombre) return trozos[i].slice(p + 1);
    }
    return null;
  }

  function escribirCookie(nombre, valor) {
    const caduca = valor === null ? "max-age=0" : "max-age=315360000";
    document.cookie = nombre + "=" + (valor || "") + "; " + caduca + "; path=/; SameSite=Lax";
  }

  function cargarDeCookies() {
    let texto = "";
    for (let i = 0; i < MAX_TROZOS; i++) {
      const v = leerCookie(CLAVE + "_" + i);
      if (v == null) break;
      texto += v;
    }
    return texto ? decodeURIComponent(texto) : "";
  }

  function guardarEnCookies(json) {
    const codificado = encodeURIComponent(json);
    let n = 0;
    for (let pos = 0; pos < codificado.length && n < MAX_TROZOS; pos += TAM_TROZO, n++) {
      escribirCookie(CLAVE + "_" + n, codificado.slice(pos, pos + TAM_TROZO));
    }
    for (let i = n; i < MAX_TROZOS; i++) {
      if (leerCookie(CLAVE + "_" + i) != null) escribirCookie(CLAVE + "_" + i, null);
    }
  }

  function cargar() {
    if (datos) return datos;
    let texto = "";
    try { texto = cargarDeCookies(); } catch (e) { /* sin cookies */ }
    if (!texto) {
      /* Respaldo: con file:// Chrome no conserva cookies, pero sí localStorage */
      try { texto = localStorage.getItem(CLAVE) || ""; } catch (e) { /* sin almacenamiento */ }
    }
    try { datos = texto ? JSON.parse(texto) : {}; } catch (e) { datos = {}; }
    return datos;
  }

  function guardar() {
    const json = JSON.stringify(datos);
    try { guardarEnCookies(json); } catch (e) { /* sin cookies */ }
    try { localStorage.setItem(CLAVE, json); } catch (e) { /* sin almacenamiento */ }
    window.dispatchEvent(new CustomEvent("historial"));
  }

  function entrada(id) {
    const d = cargar();
    if (!d[id]) d[id] = { p: 0, n: 0, u: 0 };
    return d[id];
  }

  return {
    obtener: function (id) {
      const e = cargar()[id];
      return e ? { partidas: e.p || 0, nota: e.n || 0, ultima: e.u || 0 } : { partidas: 0, nota: 0, ultima: 0 };
    },
    registrarPartida: function (id) { const e = entrada(id); e.p = (e.p || 0) + 1; e.u = Date.now(); guardar(); },
    quitarPartida: function (id) { const e = entrada(id); e.p = Math.max(0, (e.p || 0) - 1); guardar(); },
    ponerNota: function (id, nota) { const e = entrada(id); e.n = e.n === nota ? 0 : nota; guardar(); },
    fechaUltima: function (id) {
      const u = this.obtener(id).ultima;
      return u ? I18n.fecha(u) : "";
    }
  };
})();

function estrellasHTML(id, nota, interactivas) {
  let h = '<span class="estrellas' + (interactivas ? " interactivas" : "") + '" data-id="' + esc(id) + '" aria-label="' + esc(tr("historial.notaAria", { nota: nota })) + '">';
  for (let i = 1; i <= 5; i++) {
    h += interactivas
      ? '<button type="button" class="estrella' + (i <= nota ? " on" : "") + '" data-nota="' + i + '" aria-label="' + esc(tr("historial.estrellasAria", { n: i })) + '">★</button>'
      : '<span class="estrella' + (i <= nota ? " on" : "") + '">★</span>';
  }
  return h + "</span>";
}

/* Panel de historial reutilizable (catálogo y asistente). Llama a alCambiar() tras cada cambio. */
function htmlPanelHistorial(id) {
  const h = Historial.obtener(id);
  return '<div class="panel-historial" data-id="' + esc(id) + '">' +
    '<div class="hist-fila"><span>' + tr("historial.vecesJugado", { n: h.partidas }) + "</span>" +
    '<span><button type="button" class="btn btn-mini" data-accion="menos" aria-label="' + esc(tr("historial.quitarAria")) + '">−</button> ' +
    '<button type="button" class="btn btn-mini btn-primario" data-accion="mas">' + esc(tr("historial.registrar")) + '</button></span></div>' +
    '<div class="hist-fila"><span>' + esc(tr("historial.miNota")) + " " + estrellasHTML(id, h.nota, true) + "</span>" +
    "<span class=\"suave\">" + esc(h.ultima ? tr("historial.ultima", { fecha: Historial.fechaUltima(id) }) : tr("historial.sinJugar")) + "</span></div></div>";
}

function enlazarPanelHistorial(contenedor, alCambiar) {
  contenedor.querySelectorAll(".panel-historial").forEach(function (panel) {
    const id = panel.dataset.id;
    panel.addEventListener("click", function (e) {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.accion === "mas") Historial.registrarPartida(id);
      else if (b.dataset.accion === "menos") Historial.quitarPartida(id);
      else if (b.dataset.nota) Historial.ponerNota(id, Number(b.dataset.nota));
      else return;
      panel.outerHTML = htmlPanelHistorial(id);
      enlazarPanelHistorial(contenedor, alCambiar);
      if (alCambiar) alCambiar(id);
    });
  });
}
