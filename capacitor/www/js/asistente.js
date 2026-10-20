/* Asistente: va haciendo preguntas y recomienda un juego (teniendo en cuenta tu historial) */
(function () {
  const raiz = document.getElementById("asistente");
  let juegos = [];
  let paso = 0;
  let respuestas = {};
  let ranking = [];
  let posicion = 0;
  let relajado = [];
  let registrado = {};   // juegos para los que ya se ha pulsado "¡Jugamos a este!" en esta sesión

  function unicos(campo) {
    const mapa = new Map();
    juegos.filter(function (j) { return !j.pendiente; }).forEach(function (j) {
      j[campo].forEach(function (v) { mapa.set(v, (mapa.get(v) || 0) + 1); });
    });
    return Array.from(mapa.entries()).sort(function (a, b) { return b[1] - a[1] || I18n.comparar(a[0], b[0]); })
      .map(function (p) { return p[0]; });
  }

  /* Las preguntas de ambientación y experiencia se rellenan con los datos reales. */
  function preguntas() {
    const igual = { v: "cualquiera", t: tr("asist.igual") };
    return [
      {
        id: "jugadores", titulo: tr("asist.jugadores.titulo"), ayuda: tr("asist.jugadores.ayuda"),
        opciones: [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) {
          return { v: n, t: n === 8 ? tr("asist.jugadores.ochoOMas") : textoNJ(n), s: n === 1 ? tr("asist.jugadores.solitario") : "" };
        })
      },
      {
        id: "tiempo", titulo: tr("asist.tiempo.titulo"), ayuda: tr("asist.tiempo.ayuda"),
        opciones: [
          { v: 20, t: tr("asist.tiempo.o20"), s: tr("asist.tiempo.o20s") },
          { v: 45, t: tr("asist.tiempo.o45"), s: tr("asist.tiempo.o45s") },
          { v: 90, t: tr("asist.tiempo.o90"), s: tr("asist.tiempo.o90s") },
          { v: 999, t: tr("asist.tiempo.o999"), s: tr("asist.tiempo.o999s") }
        ]
      },
      {
        id: "preparacion", titulo: tr("asist.prep.titulo"), ayuda: tr("asist.prep.ayuda"),
        opciones: [
          { v: 999, t: tr("asist.prep.o999"), s: tr("asist.prep.o999s") },
          { v: 3, t: tr("asist.prep.o3"), s: tr("asist.prep.o3s") },
          { v: 10, t: tr("asist.prep.o10"), s: tr("asist.prep.o10s") }
        ]
      },
      {
        id: "dificultad", titulo: tr("asist.dificultad.titulo"), ayuda: tr("asist.dificultad.ayuda"),
        opciones: [
          igual,
          { v: "ligero", t: tr("asist.dificultad.ligero"), s: tr("asist.dificultad.ligeroS") },
          { v: "medio", t: tr("asist.dificultad.medio"), s: tr("asist.dificultad.medioS") },
          { v: "intenso", t: tr("asist.dificultad.intenso"), s: tr("asist.dificultad.intensoS") }
        ]
      },
      {
        id: "modo", titulo: tr("asist.modo.titulo"), ayuda: tr("asist.modo.ayuda"),
        opciones: [
          igual,
          { v: "Cooperativo", t: tr("asist.modo.coop"), s: tr("asist.modo.coopS") },
          { v: "Competitivo", t: tr("asist.modo.comp"), s: tr("asist.modo.compS") }
        ]
      },
      {
        id: "party", titulo: tr("asist.party.titulo"), ayuda: "",
        opciones: [
          igual,
          { v: "si", t: "🎉 " + tr("asist.party.si"), s: tr("asist.party.siS") },
          { v: "no", t: tr("asist.party.no"), s: tr("asist.party.noS") }
        ]
      },
      {
        id: "ambientacion", titulo: tr("asist.ambientacion.titulo"), ayuda: "",
        opciones: [igual].concat(unicos("ambientacion").map(function (a) { return { v: a, t: a }; }))
      },
      {
        id: "experiencia", titulo: tr("asist.experiencia.titulo"), ayuda: tr("asist.experiencia.ayuda"),
        opciones: [igual].concat(unicos("experiencia").map(function (a) { return { v: a, t: a }; }))
      },
      {
        id: "novedad", titulo: tr("asist.novedad.titulo"), ayuda: tr("asist.novedad.ayuda"),
        opciones: [
          igual,
          { v: "nuevo", t: tr("asist.novedad.nuevo"), s: tr("asist.novedad.nuevoS") },
          { v: "favorito", t: tr("asist.novedad.favorito"), s: tr("asist.novedad.favoritoS") }
        ]
      }
    ];
  }

  /* ---------- Puntuación ---------- */
  const NIVELES = ["facil", "media", "dificil", "experto"];
  const OBJETIVO = { ligero: [0], medio: [1], intenso: [2, 3] };
  const SEMANA = 7 * 24 * 3600 * 1000;

  function distanciaNivel(clave, objetivo) {
    const i = NIVELES.indexOf(clave);
    return Math.min.apply(null, OBJETIVO[objetivo].map(function (o) { return Math.abs(o - i); }));
  }

  function textoNJ(n) { return tr("jugadores", { n: n }); }

  function evaluar(j, r, ignorar) {
    ignorar = ignorar || {};
    if (j.pendiente) return null;
    const n = r.jugadores;
    const motivos = [];
    let puntos = 0, maximo = 0;

    /* Filtros duros */
    if (n < j.jugadores.min || (n < 8 && n > j.jugadores.max) || (n >= 8 && j.jugadores.max < 8)) return null;
    if (!ignorar.tiempo && r.tiempo < 999 && j.duracion.min > r.tiempo) return null;
    if (!ignorar.preparacion && r.preparacion < 999 && (j.preparacion.min == null || j.preparacion.min > r.preparacion)) return null;
    if (!ignorar.modo && n > 1 && (r.modo === "Cooperativo" || r.modo === "Competitivo") && j.modo.indexOf(r.modo) === -1) return null;
    if (!ignorar.party && r.party === "si" && !j.party) return null;
    if (!ignorar.party && r.party === "no" && j.party) return null;

    /* Jugadores */
    maximo += 20;
    if (j.jugadores.mejorCon.indexOf(n) !== -1) { puntos += 20; motivos.push(tr("asist.motivo.mejorCon", { jug: textoNJ(n) })); }
    else if (j.jugadores.recomendado.indexOf(n) !== -1) { puntos += 12; motivos.push(tr("asist.motivo.funcionaCon", { jug: textoNJ(n) })); }
    else if (!j.jugadores.mejorCon.length) { puntos += 10; motivos.push(tr("asist.motivo.admite", { jug: textoNJ(n) })); }
    else { puntos += 5; motivos.push(tr("asist.motivo.admiteNoIdeal", { jug: textoNJ(n) })); }

    /* Tiempo */
    if (r.tiempo < 999) {
      maximo += 15;
      if (j.duracion.max == null) { /* duración desconocida: sin puntos */ }
      else if (j.duracion.max <= r.tiempo) { puntos += 15; motivos.push(tr("asist.motivo.cabe", { dur: textoDuracion(j) })); }
      else if (j.duracion.min <= r.tiempo) { puntos += 8; motivos.push(tr("asist.motivo.cabeRapido", { dur: textoDuracion(j) })); }
    } else { maximo += 5; puntos += 5; }

    /* Preparación */
    if (r.preparacion < 999) {
      maximo += 10;
      if (j.preparacion.min != null && j.preparacion.min <= r.preparacion) { puntos += 10; motivos.push(tr("asist.motivo.prepRapida", { prep: textoPreparacion(j) })); }
    }

    /* Dificultad */
    if (r.dificultad !== "cualquiera") {
      maximo += 25;
      const d = distanciaNivel(nivelDificultad(j.peso).clave, r.dificultad);
      if (d === 0) { puntos += 25; motivos.push(tr("asist.motivo.dificultad", { nivel: nivelDificultad(j.peso).texto.toLowerCase() })); }
      else if (d === 1) { puntos += 10; }
    }

    /* Modo (solo si no es en solitario) */
    if (n > 1 && r.modo !== "cualquiera") {
      maximo += 15;
      if (j.modo.indexOf(r.modo) !== -1) { puntos += 15; motivos.push(tr(r.modo === "Cooperativo" ? "asist.motivo.coop" : "asist.motivo.comp")); }
    }

    /* Party */
    if (r.party === "si") { maximo += 10; puntos += 10; motivos.push(tr("asist.motivo.party")); }

    /* Ambientación */
    if (r.ambientacion !== "cualquiera") {
      maximo += 25;
      if (j.ambientacion.indexOf(r.ambientacion) !== -1) { puntos += 25; motivos.push(tr("asist.motivo.ambientacion", { valor: r.ambientacion.toLowerCase() })); }
    }

    /* Experiencia */
    if (r.experiencia !== "cualquiera") {
      maximo += 20;
      if (j.experiencia.indexOf(r.experiencia) !== -1) { puntos += 20; motivos.push(tr("asist.motivo.experiencia", { valor: r.experiencia.toLowerCase() })); }
    }

    /* Historial: lo que has jugado y cómo te ha gustado */
    const h = Historial.obtener(j.id);
    if (r.novedad === "nuevo") {
      maximo += 25;
      if (h.partidas === 0) { puntos += 25; motivos.push(tr("asist.motivo.sinJugar")); }
    } else if (r.novedad === "favorito") {
      maximo += 25;
      if (h.nota >= 4) { puntos += 25; motivos.push(tr("asist.motivo.favorito", { nota: h.nota })); }
    }

    const afinidad = Math.min(100, Math.round(puntos / maximo * 100));
    let ajuste = 0;
    if (h.nota === 5) ajuste += 12; else if (h.nota === 4) ajuste += 6; else if (h.nota === 2) ajuste -= 8; else if (h.nota === 1) ajuste -= 16;
    if (h.nota && r.novedad !== "favorito") {
      if (h.nota >= 4) motivos.push(tr("asist.motivo.gusto", { nota: h.nota }));
      else if (h.nota <= 2) motivos.push(tr("asist.motivo.notaBaja", { nota: h.nota }));
    }
    if (h.ultima && Date.now() - h.ultima < SEMANA) { ajuste -= 6; motivos.push(tr("asist.motivo.reciente")); }
    if (h.partidas === 0 && r.novedad !== "nuevo") ajuste += 3;
    if (h.partidas >= 5 && h.nota < 4) ajuste -= Math.min(8, h.partidas - 4);

    return { juego: j, afinidad: afinidad, clave: afinidad + ajuste, motivos: motivos, historial: h };
  }

  function calcular() {
    relajado = [];
    const pasos = [{}, { tiempo: true }, { tiempo: true, preparacion: true }, { tiempo: true, preparacion: true, modo: true },
      { tiempo: true, preparacion: true, modo: true, party: true }];
    const nombres = ["tiempo", "preparacion", "modo", "party"];
    let lista = [];
    for (let i = 0; i < pasos.length && !lista.length; i++) {
      lista = juegos.map(function (j) { return evaluar(j, respuestas, pasos[i]); }).filter(Boolean);
      if (lista.length && i > 0) relajado = nombres.slice(0, i);
    }
    lista.forEach(function (x) { x.azar = Math.random(); });
    lista.sort(function (a, b) { return b.clave - a.clave || b.azar - a.azar; });
    ranking = lista;
    posicion = 0;
    registrado = {};
  }

  /* ---------- Pintado ---------- */
  function pintarPregunta() {
    const lista = preguntas();
    const p = lista[paso];
    const total = lista.length;
    raiz.innerHTML =
      '<div class="progreso"><div style="width:' + (paso / total * 100) + '%"></div></div>' +
      '<div class="paso-texto">' + esc(tr("asist.pregunta", { n: paso + 1, total: total })) + "</div>" +
      '<section class="pregunta"><h1>' + esc(p.titulo) + "</h1>" +
      (p.ayuda ? '<p class="ayuda">' + esc(p.ayuda) + "</p>" : "") +
      '<div class="respuestas">' + p.opciones.map(function (o, i) {
        return '<button type="button" class="respuesta" data-i="' + i + '"><strong>' + esc(o.t) + "</strong>" +
          (o.s ? "<small>" + esc(o.s) + "</small>" : "") + "</button>";
      }).join("") + "</div></section>" +
      '<div class="navegacion">' +
      (paso > 0 ? '<button type="button" class="btn" id="atras">' + esc(tr("asist.atras")) + "</button>" : "<span></span>") +
      '<a class="btn btn-ghost" href="index.html">' + esc(tr("asist.verCatalogo")) + "</a></div>";

    raiz.querySelectorAll(".respuesta").forEach(function (b) {
      b.addEventListener("click", function () {
        respuestas[p.id] = p.opciones[Number(b.dataset.i)].v;
        paso++;
        if (paso >= total) { calcular(); pintarResultado(); } else { pintarPregunta(); }
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
    const atras = document.getElementById("atras");
    if (atras) atras.addEventListener("click", function () { paso--; pintarPregunta(); });
  }

  function aviso() {
    if (!relajado.length) return "";
    return '<div class="aviso-info">' + esc(tr("asist.relajado", {
      lista: relajado.map(function (k) { return tr("asist.relajar." + k); }).join(", ")
    })) + "</div>";
  }

  function pintarResultado() {
    if (!ranking.length) {
      raiz.innerHTML =
        '<div class="resultado"><h1>' + esc(tr("asist.nadaTitulo")) + " 😕</h1>" +
        "<p>" + esc(tr("asist.nadaTexto")) + "</p>" +
        '<div class="acciones"><button class="btn btn-primario" id="reiniciar" type="button">' + esc(tr("asist.reiniciar")) + "</button>" +
        '<a class="btn" href="index.html">' + esc(tr("asist.verCatalogo")) + "</a></div></div>";
      document.getElementById("reiniciar").addEventListener("click", reiniciar);
      return;
    }
    const r = ranking[posicion];
    const j = r.juego;
    const otros = ranking.filter(function (_, i) { return i !== posicion; }).slice(0, 3);
    const ya = registrado[j.id];
    raiz.innerHTML =
      '<div class="progreso"><div style="width:100%"></div></div>' +
      '<section class="resultado">' +
      '<div class="sello">' + esc(posicion === 0 ? tr("asist.mejorOpcion") : tr("asist.otraOpcion", { n: posicion + 1 })) + "</div>" +
      aviso() +
      '<div class="resultado-tarjeta">' + htmlImagen(j) +
      '<div class="info"><span class="afinidad">' + esc(tr("asist.afinidad", { n: r.afinidad })) + "</span>" +
      "<h1>" + esc(j.nombre) + "</h1>" +
      '<div class="datos"><span>👥 ' + textoJugadores(j) + "</span><span>⏱ " + textoDuracion(j) + "</span><span>🧰 " + textoPreparacion(j) + "</span>" + insigniaDificultad(j) + "</div>" +
      "<p>" + esc(j.descripcion) + "</p>" +
      '<ul class="motivos">' + r.motivos.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>" +
      htmlPanelHistorial(j.id) +
      (j.bggUrl ? '<p><a href="' + esc(j.bggUrl) + '" target="_blank" rel="noopener">' + esc(j.enlaceTexto || tr("comun.verBgg")) + ' ↗</a></p>' : "") +
      "</div></div>" +
      '<div class="acciones">' +
      (ya ? '<span class="confirmacion">✅ ' + esc(tr("asist.registrada")) + "</span>"
          : '<button class="btn btn-primario" id="jugar" type="button">✅ ' + esc(tr("asist.jugamos")) + "</button>") +
      (ranking.length > 1 ? '<button class="btn" id="otra" type="button">🎲 ' + esc(tr("asist.otra")) + "</button>" : "") +
      '<button class="btn" id="reiniciar" type="button">' + esc(tr("asist.reiniciar")) + "</button>" +
      '<button class="btn btn-ghost" id="atras" type="button">' + esc(tr("asist.cambiarUltima")) + "</button></div>" +
      (otros.length ? '<h2 style="margin-top:32px">' + esc(tr("asist.tambien")) + '</h2><div class="alternativas">' + otros.map(function (o) {
        const k = ranking.indexOf(o);
        return '<button type="button" class="tarjeta" data-pos="' + k + '"><div class="portada">' + htmlImagen(o.juego) + "</div>" +
          '<div class="cuerpo"><h3>' + esc(o.juego.nombre) + '</h3><div class="datos"><span>' + esc(tr("asist.afinidadCorta", { n: o.afinidad })) + "</span></div></div></button>";
      }).join("") + "</div>" : "") +
      "</section>";

    enlazarPanelHistorial(raiz);
    const jugar = document.getElementById("jugar");
    if (jugar) jugar.addEventListener("click", function () {
      Historial.registrarPartida(j.id);
      registrado[j.id] = true;
      pintarResultado();
    });
    const otra = document.getElementById("otra");
    if (otra) otra.addEventListener("click", function () { posicion = (posicion + 1) % ranking.length; pintarResultado(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    document.getElementById("reiniciar").addEventListener("click", reiniciar);
    document.getElementById("atras").addEventListener("click", function () { paso = preguntas().length - 1; pintarPregunta(); });
    raiz.querySelectorAll(".alternativas .tarjeta").forEach(function (b) {
      b.addEventListener("click", function () { posicion = Number(b.dataset.pos); pintarResultado(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    });
  }

  function reiniciar() { paso = 0; respuestas = {}; pintarPregunta(); }

  /* Botón atrás de Android: del resultado a la última pregunta, y de cada pregunta a la anterior.
     En la primera pregunta no lo gestiona: la app vuelve al catálogo. */
  Atras.registrar(function () {
    if (!juegos.length) return false;
    const total = preguntas().length;
    if (paso >= total) { paso = total - 1; pintarPregunta(); return true; }
    if (paso > 0) { paso--; pintarPregunta(); return true; }
    return false;
  });

  instalarFallbackImagenes();
  Promise.all([I18n.listo, Servicios.juegos.listar()]).then(function (r) {
    juegos = r[1];
    if (!juegos.length) {
      raiz.innerHTML = '<div class="resultado"><h1>' + esc(tr("asist.vacioTitulo")) + "</h1><p>" + tr("asist.vacioTexto") + "</p></div>";
      return;
    }
    pintarPregunta();
  }).catch(function (err) { mostrarErrorCarga(raiz, err); });
})();
