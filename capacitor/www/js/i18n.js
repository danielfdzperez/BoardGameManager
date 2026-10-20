/* ============================================================================
 * INTERNACIONALIZACIÓN (i18n)
 *
 * Los textos de la interfaz viven en i18n/<código>.json (uno por idioma) y la lista de idiomas
 * disponibles en i18n/idiomas.json. Ver IADocs/i18n.md.
 *
 *  - Idioma: el elegido por la persona (selector de la cabecera, se recuerda en localStorage) o, si no
 *    ha elegido, el del dispositivo (navigator.languages). Sin coincidencia: inglés (o español).
 *  - Cualquier clave que falte en un idioma se toma del español, así que una traducción puede ser parcial.
 *  - En el HTML: data-i18n="clave" (texto), data-i18n-html="clave" (texto con etiquetas),
 *    data-i18n-attr="placeholder:clave;aria-label:clave" (atributos).
 *  - En el JS: tr("clave", { n: 3 }). Con `n` numérico se usa la forma plural clave.one / clave.other…
 *  - Los datos de los juegos (nombres, descripciones, mecánicas…) NO se traducen; solo valores conocidos
 *    (modos de juego) vía tv("modo", valor).
 *  - Cambiar de idioma recarga la página. Las páginas esperan a `I18n.listo` antes de pintar.
 * ========================================================================== */
const I18n = (function () {
  const CLAVE = "mesa_idioma";
  const BASE = (function () {
    const s = document.currentScript;
    return s && s.src ? s.src.replace(/js\/i18n\.js(\?.*)?$/, "i18n/") : "i18n/";
  })();

  let idioma = "es";
  let disponibles = [{ codigo: "es", nombre: "Español" }];
  let diccionario = {};
  let reglas = null;

  function esApp() {
    const c = window.Capacitor;
    return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform());
  }

  function cargarJson(url) {
    return fetch(url, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () {   // respaldo para navegadores que dejan leer file:// con XMLHttpRequest
        return new Promise(function (ok, ko) {
          const x = new XMLHttpRequest();
          x.onload = function () { try { ok(JSON.parse(x.responseText)); } catch (e) { ko(e); } };
          x.onerror = function () { ko(new Error("No se pudo leer " + url)); };
          x.open("GET", url);
          x.send();
        });
      });
  }

  function aplanar(obj, prefijo, salida) {
    Object.keys(obj).forEach(function (k) {
      if (k.charAt(0) === "_") return;   // metadatos (_nombre)
      const clave = prefijo ? prefijo + "." + k : k;
      if (obj[k] && typeof obj[k] === "object") aplanar(obj[k], clave, salida);
      else salida[clave] = String(obj[k]);
    });
    return salida;
  }

  function elegir() {
    const codigos = disponibles.map(function (d) { return d.codigo; });
    let guardado = null;
    try { guardado = localStorage.getItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
    if (guardado && codigos.indexOf(guardado) !== -1) return guardado;
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (let i = 0; i < prefs.length; i++) {
      const p = String(prefs[i]).toLowerCase();
      const base = p.split("-")[0];
      const hit = codigos.filter(function (c) { return c.toLowerCase() === p; })[0] ||
        codigos.filter(function (c) { return c.toLowerCase().split("-")[0] === base; })[0];
      if (hit) return hit;
    }
    return codigos.indexOf("en") !== -1 ? "en" : "es";
  }

  /** Traduce una clave. Si no existe devuelve la propia clave (se nota en pantalla). */
  function t(clave, params) {
    let v;
    if (params && typeof params.n === "number" && reglas) {
      v = diccionario[clave + "." + reglas.select(params.n)];
      if (v === undefined) v = diccionario[clave + ".other"];
    }
    if (v === undefined) v = diccionario[clave];
    if (v === undefined) return clave;
    return params ? v.replace(/\{(\w+)\}/g, function (m, k) { return k in params ? params[k] : m; }) : v;
  }

  /** Traduce un valor de los datos si hay traducción conocida (valores.<grupo>.<valor>); si no, lo deja igual. */
  function tv(grupo, valor) {
    const v = diccionario["valores." + grupo + "." + valor];
    return v === undefined ? valor : v;
  }

  function aplicar(raiz) {
    raiz = raiz || document;
    raiz.querySelectorAll("[data-i18n]").forEach(function (e) { e.textContent = t(e.dataset.i18n); });
    raiz.querySelectorAll("[data-i18n-html]").forEach(function (e) { e.innerHTML = t(e.dataset.i18nHtml); });
    raiz.querySelectorAll("[data-i18n-attr]").forEach(function (e) {
      e.dataset.i18nAttr.split(";").forEach(function (par) {
        const i = par.indexOf(":");
        if (i > 0) e.setAttribute(par.slice(0, i).trim(), t(par.slice(i + 1).trim()));
      });
    });
  }

  function montarSelector() {
    const cab = document.querySelector(".cabecera");
    if (!cab || esApp() || disponibles.length < 2 || cab.querySelector(".selector-idioma")) return;
    const sel = document.createElement("select");
    sel.className = "selector-idioma";
    sel.setAttribute("aria-label", t("idioma.etiqueta"));
    sel.title = t("idioma.etiqueta");
    sel.innerHTML = disponibles.map(function (d) {
      return '<option value="' + d.codigo + '"' + (d.codigo === idioma ? " selected" : "") + ">🌐 " + d.nombre + "</option>";
    }).join("");
    sel.addEventListener("change", function () {
      try { localStorage.setItem(CLAVE, sel.value); } catch (e) { /* sin almacenamiento */ }
      location.reload();
    });
    cab.appendChild(sel);
  }

  const listo = (async function () {
    try {
      try { disponibles = await cargarJson(BASE + "idiomas.json"); } catch (e) { /* solo español */ }
      idioma = elegir();
      const base = aplanar(await cargarJson(BASE + "es.json"), "", {});
      diccionario = base;
      if (idioma !== "es") {
        try { diccionario = Object.assign({}, base, aplanar(await cargarJson(BASE + idioma + ".json"), "", {})); }
        catch (e) { idioma = "es"; }
      }
      try { reglas = new Intl.PluralRules(idioma); } catch (e) { reglas = null; }
      document.documentElement.lang = idioma;
      aplicar(document);
      montarSelector();
    } catch (e) {
      console.warn("i18n: no se pudieron cargar los textos; se usa el texto del HTML.", e);
    }
    document.documentElement.classList.add("i18n-listo");
  })();

  return {
    listo: listo,
    t: t,
    tv: tv,
    aplicar: aplicar,
    /** Código del idioma activo (es, en…) */
    get idioma() { return idioma; },
    /** Formatea un número con los separadores del idioma. */
    numero: function (n, decimales) {
      return Number(n).toLocaleString(idioma, decimales == null ? {} : { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    },
    /** Compara textos según el idioma (para ordenar). */
    comparar: function (a, b) { return String(a).localeCompare(String(b), idioma); },
    fecha: function (ms) { return new Date(ms).toLocaleDateString(idioma); }
  };
})();
const tr = I18n.t;
const tv = I18n.tv;
