/* ============================================================================
 * BGG: consulta una ficha de BoardGameGeek y la convierte en datos para el formulario de crear.html.
 *  - Usa la API interna de api.geekdo.com (la oficial xmlapi2 exige token). No tiene CORS: en la app va por
 *    el plugin nativo CapacitorHttp; en la web, por el proxy de serverTest (localhost) o un proxy CORS externo
 *    (ver PROXY_WEB, único punto que hay que tocar para cambiarlo).
 *  - No inventa nada: lo que BGG no da (preparación, ambientación, experiencia, party) no se toca.
 * ========================================================================== */
const Bgg = {
  BASE: "https://api.geekdo.com/api/",

  MECANICAS: {
    "Cooperative Game": "Cooperativo", "Semi-Cooperative Game": "Semicooperativo", "Solo / Solitaire Game": "Modo solitario",
    "Team-Based Game": "Por equipos", "Hand Management": "Gestión de mano", "Variable Player Powers": "Poderes variables por jugador",
    "Dice Rolling": "Tirada de dados", "Variable Set-up": "Preparación variable", "Player Elimination": "Eliminación de jugadores",
    "Deck, Bag, and Pool Building": "Construcción de mazo / bolsa / reserva", "Deduction": "Deducción", "Modular Board": "Tablero modular",
    "Take That": "Fastidiar al rival", "Real-Time": "Tiempo real", "Simultaneous Action Selection": "Selección simultánea de acciones",
    "Action Points": "Puntos de acción", "Grid Movement": "Movimiento en cuadrícula", "Role Playing": "Rol", "Push Your Luck": "Tentar a la suerte",
    "Pattern Recognition": "Reconocimiento de patrones", "Memory": "Memoria", "Hexagon Grid": "Tablero hexagonal",
    "Scenario / Mission / Campaign Game": "Escenario / misión / campaña", "Set Collection": "Colección de sets", "Open Drafting": "Draft abierto",
    "Stacking and Balancing": "Apilar y equilibrar", "Events": "Eventos", "Action Queue": "Cola de acciones", "Action Retrieval": "Recuperación de acciones",
    "Campaign / Battle Card Driven": "Campaña dirigida por cartas", "Card Play Conflict Resolution": "Resolución de conflictos con cartas",
    "Race": "Carrera", "Traitor Game": "Traidor", "Trick-taking": "Bazas", "Storytelling": "Narración", "Hidden Roles": "Roles ocultos",
    "Area Majority / Influence": "Mayoría de área", "Pick-up and Deliver": "Recoger y entregar", "Acting": "Mímica / interpretación",
    "Score-and-Reset Game": "Puntuar y reiniciar", "Critical Hits and Failures": "Golpes críticos / pifias", "Legacy Game": "Juego legacy",
    "Line of Sight": "Línea de visión", "Movement Points": "Puntos de movimiento", "Catch the Leader": "Alcanzar al líder",
    "Programmed Movement": "Movimiento programado", "Simulation": "Simulación", "Market": "Mercado", "Income": "Generación de ingresos",
    "Tech Trees / Tech Tracks": "Árbol tecnológico", "Area Movement": "Movimiento por áreas", "Variable Turn Order": "Orden de turno variable",
    "Contracts": "Contratos", "Tile Placement": "Colocación de losetas", "Voting": "Votación", "Hot Potato": "Patata caliente",
    "Map Addition": "Ampliación del mapa", "Bingo": "Bingo", "Cut the Cake": "Yo corto, tú eliges", "Questions and Answers": "Preguntas y respuestas",
    "Pattern Building": "Construcción de patrones"
  },

  CATEGORIAS: {
    "Card Game": "Juego de cartas", "Fantasy": "Fantasía", "Party Game": "Juego de fiesta", "Adventure": "Aventura", "Fighting": "Combate",
    "Deduction": "Deducción", "Exploration": "Exploración", "Video Game Theme": "Temática de videojuego", "Science Fiction": "Ciencia ficción",
    "Action / Dexterity": "Acción / destreza", "Real-time": "Tiempo real", "Humor": "Humor", "Miniatures": "Miniaturas", "Mythology": "Mitología",
    "Puzzle": "Puzle", "Bluffing": "Faroleo", "Animals": "Animales", "Horror": "Terror", "Space Exploration": "Exploración espacial",
    "Mystery": "Misterio", "Novel-based": "Basado en novela", "Print & Play": "Print & Play", "Memory": "Memoria",
    "Abstract Strategy": "Estrategia abstracta", "Territory Building": "Construcción de territorio", "Wargame": "Wargame", "Racing": "Carreras",
    "Sports": "Deportes", "Collectible Components": "Componentes coleccionables", "Movies / TV / Radio theme": "Cine y TV", "Pirates": "Piratas",
    "Political": "Político", "Word Game": "Juego de palabras", "Numbers": "Números", "Comic Book / Strip": "Cómic", "Medieval": "Medieval",
    "Maze": "Laberinto", "Dice": "Dados", "Nautical": "Náutico", "Children's Game": "Juego infantil"
  },

  /** Modos de juego que se pueden deducir con seguridad de una mecánica de BGG. */
  MODOS: { "Cooperative Game": "Cooperativo", "Semi-Cooperative Game": "Semicooperativo", "Solo / Solitaire Game": "Solitario", "Team-Based Game": "Por equipos" },

  /* ---- Cómo se llega a BGG (api.geekdo.com no manda CORS). Se prueban en orden: ----
   *  1. App Android: plugin nativo CapacitorHttp (sin CORS).
   *  2. Web en localhost: proxy de serverTest (/api/bgg/…, mismo origen).
   *  3. Web publicada (GitHub Pages…): proxy CORS externo. PARA CAMBIAR A UN WORKER PROPIO basta con
   *     cambiar PROXY_WEB: recibe la URL final de BGG y devuelve la URL del proxy que la sirve con CORS. */
  // OJO (probado 2026-10-20): corsproxy.io ya responde 401 «A valid API key is required» desde cualquier origen.
  // Para que funcione en GitHub Pages hay que poner una clave suya o cambiar a un Worker propio.
  PROXY_WEB: function (urlBgg) { return "https://corsproxy.io/?url=" + encodeURIComponent(urlBgg); },
  // Ejemplo con Worker propio:  PROXY_WEB: function (urlBgg) { return "https://bgg.tuusuario.workers.dev/?url=" + encodeURIComponent(urlBgg); },

  _nativo() {
    const c = window.Capacitor;
    return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform() && c.Plugins && c.Plugins.CapacitorHttp);
  },

  _local() {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  },

  /** Siempre hay alguna vía (app, proxy local o proxy web). */
  disponible() { return true; },

  /** Cada transporte devuelve { status, data } (data ya parseado si es JSON). */
  async _viaNativo(url) {
    const r = await window.Capacitor.Plugins.CapacitorHttp.request({
      url: url, method: "GET", headers: { Accept: "application/json" }, connectTimeout: 15000, readTimeout: 15000
    });
    return { status: r.status, data: typeof r.data === "string" ? JSON.parse(r.data) : r.data };
  },

  async _viaFetch(url) {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    let data = null;
    try { data = await r.json(); } catch (e) { /* respuesta no JSON */ }
    return { status: r.status, data: data };
  },

  async _peticion(ruta, id) {
    const consulta = "?objectid=" + id + "&objecttype=thing";
    const urlBgg = this.BASE + ruta + consulta;
    if (this._nativo()) return this._viaNativo(urlBgg);
    if (this._local()) {
      try {
        const r = await this._viaFetch("/api/bgg/" + ruta + consulta);
        if (r.status !== 404) return r;
      } catch (e) { /* sin proxy local: se prueba el proxy web */ }
    }
    return this._viaFetch(this.PROXY_WEB(urlBgg));
  },

  /** Acepta un número («174430») o una URL de BGG («…/boardgame/174430/gloomhaven»). @returns {number|null} */
  extraerId(texto) {
    const t = String(texto == null ? "" : texto).trim();
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    const m = t.match(/boardgamegeek\.com\/(?:boardgame|boardgameexpansion|boardgameaccessory|thing)\/(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  },

  async _pedir(ruta, id) {
    let r;
    try { r = await this._peticion(ruta, id); } catch (e) { throw new Error(tr("bgg.sinConexion")); }
    if (r.status === 429) throw new Error(tr("bgg.espera"));
    if (r.status < 200 || r.status >= 300) throw new Error(tr("bgg.errorHttp", { estado: r.status }));
    const datos = r.data;
    if (!datos || !datos.item) throw new Error(tr("bgg.sinDatos"));
    return datos.item;
  },

  /**
   * Consulta BGG y devuelve los campos listos para el formulario.
   * @returns {Promise<{campos: object, avisos: string[]}>} `campos` usa los mismos nombres que `leer()` de crear.js
   */
  async obtener(entrada) {
    const id = this.extraerId(entrada);
    if (!id) throw new Error(tr("bgg.escribeId"));

    const r = await Promise.all([this._pedir("geekitems", id), this._pedir("dynamicinfo", id)]);
    return this._convertir(id, r[0], r[1]);
  },

  _convertir(id, ficha, dinamica) {
    const avisos = [];
    const nombres = (clave) => ((ficha.links && ficha.links[clave]) || []).map(function (l) { return l.name; });
    const num = (v) => { const n = parseFloat(v); return isNaN(n) || n <= 0 ? "" : n; };
    const stats = (dinamica && dinamica.stats) || {};
    const polls = (dinamica && dinamica.polls) || {};

    const mecanicasBgg = nombres("boardgamemechanic");
    const traducir = (lista, dic, etiqueta) => {
      const sin = [];
      const salida = lista.map(function (n) { if (dic[n]) return dic[n]; sin.push(n); return n; });
      if (sin.length) avisos.push(tr("bgg.sinTraducir", { n: sin.length, etiqueta: tr(etiqueta), lista: sin.join(", ") }));
      return salida;
    };

    const editoriales = (ficha.links && ficha.links.boardgamepublisher) || [];
    const principal = editoriales.filter(function (e) { return e.primarylink; })[0] || editoriales[0];

    const rangos = (lista) => {
      const s = [];
      (lista || []).forEach(function (r) { for (let n = r.min; n <= r.max; n++) if (s.indexOf(n) === -1) s.push(n); });
      return s.join(", ");
    };
    const jugadores = polls.userplayers || {};

    const rankGeneral = ((dinamica && dinamica.rankinfo) || []).filter(function (x) { return x.rankobjectid === 1; })[0];
    const ranking = rankGeneral && /^\d+$/.test(String(rankGeneral.rank)) ? parseInt(rankGeneral.rank, 10) : "";

    const peso = parseFloat(stats.avgweight);
    const votosPeso = parseInt(stats.numweights, 10) || 0;
    if (!(peso > 0) || votosPeso === 0) avisos.push(tr("bgg.sinPeso"));

    const media = parseFloat(stats.average);
    const campos = {
      bggId: id,
      enlace: ficha.canonical_link || ("https://boardgamegeek.com/boardgame/" + id),
      nombreOriginal: ficha.name || "",
      anio: num(ficha.yearpublished),
      editorial: principal ? principal.name : "",
      disenadores: nombres("boardgamedesigner"),
      jugadoresMin: num(ficha.minplayers), jugadoresMax: num(ficha.maxplayers),
      mejorCon: rangos(jugadores.best), recomendado: rangos(jugadores.recommended),
      duracionMin: num(ficha.minplaytime), duracionMax: num(ficha.maxplaytime),
      edadMinima: num(ficha.minage),
      valoracionBGG: media > 0 ? Math.round(media * 100) / 100 : "",
      rankingBGG: ranking,
      imagen: ficha.imageurl || "",
      descripcion: this._textoPlano(ficha.description),
      categorias: traducir(nombres("boardgamecategory"), this.CATEGORIAS, "bgg.categorias"),
      mecanicas: traducir(mecanicasBgg, this.MECANICAS, "bgg.mecanicas"),
      modo: mecanicasBgg.map((m) => this.MODOS[m]).filter(Boolean)
    };
    if (peso > 0 && votosPeso > 0) campos.peso = Math.round(peso * 100) / 100;
    if (!campos.mejorCon && !campos.recomendado) avisos.push(tr("bgg.sinVotos"));
    if (campos.descripcion) avisos.push(tr("bgg.descripcionIngles"));
    return { campos: campos, avisos: avisos };
  },

  _textoPlano(html) {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(String(html).replace(/<br\s*\/?>/gi, "\n"), "text/html");
    return (doc.body.textContent || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }
};
