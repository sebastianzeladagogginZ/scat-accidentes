/* ============================================================
   TABLERO GERENCIAL — rankings legibles, una sola escala por
   gráfico, «Lectura del año» y presentación en diapositivas.
   ============================================================ */
var TAB = {
  /* Familias de evento para el gráfico mensual: 4 colores validados (claro y oscuro, daltonismo incluido).
     El orden de apilado es parte de la validación: rojo y amarillo nunca quedan juntos. */
  FAM: [
    { k: "baja", t: "Con días perdidos", tipos: ["AM","AI"], c: ["#e34948", "#e66767"] },
    { k: "inc", t: "Incidentes y cuasi accidentes", tipos: ["IP","INC","CA"], c: ["#2a78d6", "#3987e5"] },
    { k: "leve", t: "Accidentes leves", tipos: ["AL"], c: ["#eda100", "#c98500"] },
    { k: "eo", t: "Enfermedad ocupacional", tipos: ["EO"], c: ["#1baf7a", "#199e70"] }
  ],
  osc: function () { return document.documentElement.getAttribute("data-theme") === "dark"; },

  /* Ranking horizontal: texto completo, barra y valor visibles (sin leyendas que descifrar). */
  rank: function (items, o) {
    o = o || {};
    if (!items.length) return '<div class="vacio-sm"><span>' + svg("indicadores") + '</span>' + esc(o.vacio || "Sin datos aún") + '</div>';
    var tot = items.reduce(function (s, x) { return s + x.n; }, 0), mx = Math.max.apply(null, items.map(function (x) { return x.n; })), ac = 0, lim = o.max || 6;
    var h = items.slice(0, lim).map(function (x) {
      ac += x.n; var dim = o.pareto && (ac - x.n) / tot >= 0.8, pct = Math.round(x.n / tot * 100);
      return '<div class="rk-r ' + (dim ? "dim" : "") + '" title="' + esc((x.code ? x.code + " · " : "") + x.t + ": " + x.n + " (" + pct + "%)") + '">' +
        '<div class="rk-l">' + (x.code ? '<span class="code">' + esc(x.code) + '</span>' : "") + '<span class="rk-t">' + esc(x.t) + '</span>' + (x.sub ? '<small>' + x.sub + '</small>' : "") + '</div>' +
        '<div class="rk-b"><i style="width:' + Math.max(x.n / mx * 100, 4) + '%"></i></div><div class="rk-v"><b class="tnum">' + x.n + '</b><span class="tnum">' + pct + '%</span></div></div>';
    }).join("");
    if (items.length > lim) h += '<div class="rk-mas">y ' + (items.length - lim) + ' más</div>';
    return '<div class="rk ' + (o.cls || "") + '">' + h + '</div>';
  },

  datos: function () {
    var anio = S.anio, I = L.indicadores(anio), T = I.total;
    var base = S.eventos.filter(function (e) { return e.estado !== "Anulado" && L.enFiltroArea(e.area); });
    var evA = base.filter(function (e) { return String(e.fecha).slice(0, 4) == anio; });
    var evPrev = base.filter(function (e) { return String(e.fecha).slice(0, 4) == anio - 1; });
    var abiertas = base.filter(function (e) { return ["Reportado","En investigación","Observado","En revisión"].indexOf(e.estado) >= 0; });
    var accs = S.acciones.filter(function (a) { var e = L.evento(a.evento_id); return e && L.enFiltroArea(e.area); });
    var accAb = accs.filter(function (a) { return a.estado !== "Cerrada"; }), venc = accs.filter(L.accVencida);
    var cerr = accs.filter(function (a) { return a.estado === "Cerrada"; }), aTiempo = cerr.filter(function (a) { return !a.fecha_cierre || a.fecha_cierre <= a.fecha_compromiso; }).length;
    var cumpl = accs.length ? Math.round((aTiempo + accAb.filter(function (a) { return !L.accVencida(a); }).length) / accs.length * 100) : 100;
    var hoy = hoyISO(), enDM = S.descansos.filter(function (d) { return d.inicio <= hoy && d.fin >= hoy && d.estado !== "Observado" && L.enFiltroArea(d.area); });
    var incap = base.filter(function (e) { var t = CAT.get("tipoEvento", e.tipo); return t && t.cuentaIF; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; })[0];
    var mes = MESES.map(function (m, i) { return evA.filter(function (e) { return +String(e.fecha).slice(5, 7) === i + 1; }); });
    var cuenta = function (fn) { var m = {}; evA.forEach(function (e) { fn(e).forEach(function (c) { m[c] = (m[c] || 0) + 1; }); }); return Object.keys(m).map(function (k) { return { c: k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; }); };
    var cb = cuenta(function (e) { var s = e.scat || {}; return (s.fp || []).concat(s.ft || []); });
    var nacPsc = {}; evA.forEach(function (e) { ((e.scat || {}).nac || []).forEach(function (n) { var x = nacPsc[n.c] || (nacPsc[n.c] = { P: 0, S: 0, C: 0 }); if (x[n.psc] != null) x[n.psc]++; }); });
    var nac = cuenta(function (e) { return ((e.scat || {}).nac || []).map(function (n) { return n.c; }); });
    var div = cuenta(function (e) { return [e.area]; }), cont = cuenta(function (e) { return (e.scat || {}).contactos || []; });
    var conScat = evA.filter(function (e) { var s = e.scat || {}; return (s.fp || []).length + (s.ft || []).length > 0; }).length;
    var hhtMeses = I.filas.filter(function (f) { return f.hht > 0; }).length;
    return { anio: anio, I: I, T: T, base: base, evA: evA, evPrev: evPrev, abiertas: abiertas, accs: accs, accAb: accAb, venc: venc, cumpl: cumpl, enDM: enDM, incap: incap,
      diasSin: incap ? -diasHasta(incap.fecha) : null, mes: mes, cb: cb, nac: nac, nacPsc: nacPsc, div: div, cont: cont, conScat: conScat, hhtMeses: hhtMeses, al: L.alertas(),
      mias: S.acciones.filter(function (a) { return a.responsable_dni === S.user.dni && a.estado !== "Cerrada"; }) };
  },

  /* ---------- bloques ---------- */
  hero: function (D) {
    var g;
    if (!D.hhtMeses) g = '<div class="hero-hht"><div class="hh-ic">' + svg("reloj") + '</div><div><b>Índices IF · IS · IA pendientes</b><span>Se calculan con las horas-hombre trabajadas (HHT) y aún no hay HHT registradas para ' + D.anio + '. Sin ellas, un índice en cero no significa que se cumple la meta.</span>' +
      (L.es("ADMIN","SST") && !PRES.activo ? '<a class="btn on-btn mt" href="#/indicadores">' + svg("indicadores") + 'Registrar HHT</a>' : "") + '</div></div>';
    else g = UI.gauge(D.T.IF, CONFIG.META_IF, "Índice de frecuencia", 2) + UI.gauge(D.T.IS, CONFIG.META_IS, "Índice de severidad", 2) + UI.gauge(D.T.IA, CONFIG.META_IF * CONFIG.META_IS / 1000, "Accidentabilidad", 2) +
      (D.hhtMeses < 12 ? '<div class="hero-nota">Calculado con HHT de ' + D.hhtMeses + ' de 12 meses</div>' : "");
    return '<section class="hero"><div class="hero-main"><div class="hero-k">Días sin accidentes incapacitantes</div><div class="hero-n" data-count="' + (D.diasSin == null ? 0 : D.diasSin) + '">0</div>' +
      '<div class="hero-s">' + (D.incap ? "Último: <b>" + esc(D.incap.id) + "</b> · " + fFecha(D.incap.fecha) + " · " + esc(CAT.divDe(D.incap.area)) : "Sin accidentes incapacitantes registrados") + '</div>' +
      '<div class="hero-chips"><span>' + D.evA.length + ' eventos ' + D.anio + '</span><span>' + D.abiertas.length + ' investigaciones abiertas</span><span>' + D.enDM.length + ' en descanso hoy</span></div></div>' +
      '<div class="hero-g' + (D.hhtMeses ? "" : " sin") + '">' + g + '</div></section>';
  },
  kpis: function (D) {
    var dp = D.evA.reduce(function (s, e) { return s + L.diasPerdidos(e.id); }, 0), acc = D.evA.filter(function (e) { var t = CAT.get("tipoEvento", e.tipo); return t && t.cuentaIF; }).length;
    return '<div class="kpis">' +
      kpi("Eventos " + D.anio, D.evA.length, acc + " con días perdidos" + (D.evPrev.length ? " · " + D.evPrev.length + " en " + (D.anio - 1) : ""), "", "#/eventos", UI.spark(D.mes.map(function (m) { return m.length; }), "#2a78d6")) +
      kpi("Días perdidos", dp, "descansos médicos por accidente", dp ? "warn" : "ok", "#/descansos") +
      kpi("Investigaciones abiertas", D.abiertas.length, D.abiertas.filter(function (e) { return e.estado === "En revisión"; }).length + " en revisión", D.abiertas.length ? "purple" : "ok", "#/investigaciones") +
      kpi("Acciones vencidas", D.venc.length, D.accAb.length + " abiertas de " + D.accs.length, D.venc.length ? "bad" : "ok", "#/acciones") +
      kpi("Cumplimiento del plan", D.cumpl, "% de acciones a tiempo", D.cumpl >= 90 ? "ok" : D.cumpl >= 70 ? "warn" : "bad", "#/acciones") +
      kpi("Alertas críticas", D.al.filter(function (a) { return a.sev >= 3; }).length, D.al.length + " alertas en total", D.al.some(function (a) { return a.sev >= 3; }) ? "bad" : "ok", "#/alertas") + '</div>';
  },
  /* Frases que explican lo que dicen los datos (para gerencia). */
  /* Mes con más eventos, solo si destaca (si varios empatan no se nombra ninguno). */
  pico: function (D) {
    var c = D.mes.map(function (m) { return m.length; }), mx = Math.max.apply(null, c);
    return mx > 0 && c.filter(function (x) { return x === mx; }).length === 1 ? { i: c.indexOf(mx), n: mx } : null;
  },
  lectura: function (D) {
    var L2 = [], n = D.evA.length, pico = TAB.pico(D), meses = D.mes.filter(function (m) { return m.length; }).length;
    if (n) L2.push(["eventos", "Tendencia", "En " + D.anio + " van <b>" + n + " evento" + (n > 1 ? "s" : "") + "</b>" + (pico ? "; el mes con más fue <b>" + MESES[pico.i] + "</b> (" + pico.n + ")" : n > 1 ? ", repartidos en " + meses + " meses sin un pico marcado" : "") + "." + (D.evPrev.length ? " En " + (D.anio - 1) + " hubo " + D.evPrev.length + "." : "")]);
    else L2.push(["check", "Tendencia", "No hay eventos registrados en " + D.anio + "."]);
    if (D.cb.length) L2.push(["investigaciones", "Causa básica más repetida", "<b>" + esc(D.cb[0].c) + " · " + esc(CAT.txt(CAT.listaDe(D.cb[0].c), D.cb[0].c)) + "</b>, presente en " + D.cb[0].n + " de " + D.conScat + " evento(s) analizados."]);
    else L2.push(["investigaciones", "Causas básicas", "Aún no hay análisis SCAT completos este año."]);
    if (D.nac.length) { var p = D.nacPsc[D.nac[0].c] || {}, m = ["P","S","C"].sort(function (a, b) { return (p[b] || 0) - (p[a] || 0); })[0];
      L2.push(["alertas", "Control que más falla", "<b>" + esc(CAT.txt("nac", D.nac[0].c)) + "</b>, sobre todo por " + ({ P: "programa inadecuado", S: "estándar inadecuado", C: "incumplimiento del estándar" }[m]) + "."]); }
    L2.push(["acciones", "Plan de acción", D.accs.length ? "<b>" + D.cumpl + "% a tiempo</b> · " + D.accAb.length + " abiertas" + (D.venc.length ? ", <b class=\"t-bad\">" + D.venc.length + " vencida" + (D.venc.length > 1 ? "s" : "") + "</b>" : ", ninguna vencida") + "." : "Todavía no hay acciones registradas."]);
    if (!D.hhtMeses) L2.push(["reloj", "Dato pendiente", "Faltan las <b>HHT</b> para calcular los índices de frecuencia y severidad."]);
    return '<div class="lect">' + L2.slice(0, 4).map(function (x) { return '<div class="lc"><span class="lc-ic">' + svg(x[0]) + '</span><div><small>' + esc(x[1]) + '</small><p>' + x[2] + '</p></div></div>'; }).join("") + '</div>';
  },
  mesCard: function (D) {
    var n = D.evA.length, pico = TAB.pico(D);
    return '<div class="card"><h3>Eventos por mes <small>' + D.anio + ' · por tipo</small><span class="spacer"></span><span class="h-dato">' + n + ' en el año' + (pico ? ' · pico en ' + MESES[pico.i] : "") + '</span></h3>' +
      '<div class="chart-box' + (PRES.activo ? " xl" : "") + '"><canvas id="chMes" role="img" aria-label="Eventos por mes y tipo"></canvas></div></div>';
  },
  piramide: function (D) {
    var c = function (f) { return D.evA.filter(f).length; };
    return '<div class="card"><h3>Pirámide de eventos <small>Bird · ' + D.anio + '</small></h3>' + UI.piramide([["Mortales", c(function (e) { return e.tipo === "AM"; })], ["Incapacitantes", c(function (e) { return e.tipo === "AI"; })], ["Leves", c(function (e) { return e.tipo === "AL"; })], ["Incid. peligrosos", c(function (e) { return e.tipo === "IP"; })], ["Incidentes / cuasi", c(function (e) { return ["INC","CA"].indexOf(e.tipo) >= 0; })]]) +
      '<p class="small muted mt" style="text-align:center">Por cada accidente grave suele haber muchos incidentes previos: reportarlos es prevenir.</p></div>';
  },
  pareto: function (D) {
    var it = D.cb.map(function (x) { return { code: x.c, t: CAT.txt(CAT.listaDe(x.c), x.c), n: x.n }; });
    var k80 = 0, ac = 0, tot = it.reduce(function (s, x) { return s + x.n; }, 0); it.forEach(function (x) { if (ac / tot < 0.8) k80++; ac += x.n; });
    return '<div class="card"><h3>Causas básicas más frecuentes <small>Pareto · ' + D.anio + '</small></h3>' +
      (it.length ? '<p class="h-nota"><i class="sw-a"></i>' + k80 + ' causa' + (k80 > 1 ? "s explican" : " explica") + ' el 80% de los eventos analizados<i class="sw-b"></i>resto</p>' : "") +
      TAB.rank(it, { pareto: true, vacio: "Aún no hay causas básicas analizadas este año" }) + '</div>';
  },
  nacCard: function (D) {
    var it = D.nac.map(function (x) { var p = D.nacPsc[x.c] || {}; return { code: x.c, t: CAT.txt("nac", x.c), n: x.n, sub: ["P","S","C"].filter(function (k) { return p[k]; }).map(function (k) { return '<span class="psc-c">' + k + ' ' + p[k] + '</span>'; }).join("") }; });
    return '<div class="card"><h3>Falta de control (NAC) <small>P programa · S estándar · C cumplimiento</small></h3>' + TAB.rank(it, { cls: "b2", vacio: "Aún no hay faltas de control registradas" }) + '</div>';
  },
  areaCard: function (D) {
    return '<div class="card"><h3>Eventos por área ▸ división</h3>' + TAB.rank(D.div.map(function (x) { return { t: CAT.divDe(x.c), n: x.n, sub: esc(CAT.areaDe(x.c)) }; }), { cls: "b3" }) + '</div>';
  },
  contCard: function (D) {
    return '<div class="card"><h3>Tipo de contacto <small>energía o evento que causó el daño</small></h3>' + TAB.rank(D.cont.map(function (x) { return { code: x.c, t: CAT.txt("contactos", x.c), n: x.n }; }), { cls: "b4", vacio: "Aún no hay tipos de contacto registrados" }) + '</div>';
  },
  matriz: function (D) { return '<div class="card"><h3>Matriz de riesgo potencial <small>SCAT bloque 1</small></h3>' + UI.matriz(D.evA) + '</div>'; },
  heat: function (D) { return '<div class="card"><h3>¿Cuándo ocurren? <small>día × franja horaria</small></h3>' + UI.heat(D.evA) + '</div>'; },
  flujo: function (D) {
    var b = D.base, c = function (f) { return b.filter(f).length; };
    return '<div class="card"><h3>Flujo de investigaciones</h3>' + UI.embudo([["Reportado", c(function (e) { return e.estado === "Reportado"; }), "#2a78d6"], ["En investigación", c(function (e) { return e.estado === "En investigación" || e.estado === "Observado"; }), "#2a78d6"], ["En revisión", c(function (e) { return e.estado === "En revisión"; }), "#2a78d6"], ["Aprobado", c(function (e) { return e.estado === "Aprobado"; }), "#2a78d6"], ["Cerrado", c(function (e) { return e.estado === "Cerrado"; }), "#2a78d6"]]) + '</div>';
  },
  atencion: function (D) { return '<div class="card"><h3>Lo que requiere atención <small>' + D.al.length + '</small></h3>' + alertasHTML(D.al.slice(0, 6)) + (D.al.length > 6 && !PRES.activo ? '<a href="#/alertas" class="small">Ver todas →</a>' : "") + '</div>'; },
  misAcc: function (D) {
    return '<div class="card"><h3>Mis acciones asignadas <small>' + D.mias.length + '</small></h3>' + (D.mias.length ? D.mias.slice(0, 6).map(function (a) {
      return '<div class="plazo"><span><a href="#/evento/' + esc(a.evento_id) + '/acciones">' + esc(a.id) + '</a> ' + esc(a.descripcion) + '</span><span class="flex nw">' + L.accPill(a) + '<span class="small muted">' + fFecha(a.fecha_compromiso) + '</span></span></div>';
    }).join("") : '<div class="vacio-sm"><span>' + svg("check") + '</span>No tienes acciones pendientes</div>') + '</div>';
  },

  /* Gráfico mensual: barras apiladas en UNA sola escala (sin segundo eje). */
  graficos: function (D) {
    if (!window.Chart || !document.getElementById("chMes")) return;
    var osc = TAB.osc(), sup = osc ? "#111b2a" : "#ffffff";
    var ds = TAB.FAM.map(function (f) {
      return { label: f.t, data: D.mes.map(function (m) { return m.filter(function (e) { return f.tipos.indexOf(e.tipo) >= 0; }).length; }), backgroundColor: f.c[osc ? 1 : 0],
        borderColor: sup, borderWidth: { top: 2 }, borderRadius: 4, borderSkipped: "bottom", stack: "s", maxBarThickness: 34 };
    }).filter(function (d) { return d.data.some(Boolean); });
    chart("chMes", { type: "bar", data: { labels: MESES, datasets: ds },
      options: { interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "top", align: "start" }, tooltip: { filter: function (i) { return i.raw > 0; }, callbacks: { footer: function (it) { var t = it.reduce(function (s, x) { return s + x.raw; }, 0); return "Total: " + t + " evento(s)"; } } } },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, suggestedMax: Math.max.apply(null, D.mes.map(function (m) { return m.length; })) + 1, ticks: { precision: 0 }, grid: { color: osc ? "rgba(148,163,184,.12)" : "#eef2f7" }, border: { display: false } } } } });
  },

  /* ---------- presentación en diapositivas ---------- */
  diapos: [
    { t: "Resumen del año", b: function (D) { return TAB.hero(D) + TAB.kpis(D) + TAB.lectura(D); } },
    { t: "Tendencia", b: function (D) { return '<div class="grid-dash"><div class="c8">' + TAB.mesCard(D) + '</div><div class="c4">' + TAB.piramide(D) + '</div></div>'; } },
    { t: "Causas", b: function (D) { return '<div class="grid-dash"><div class="c6">' + TAB.pareto(D) + '</div><div class="c6">' + TAB.nacCard(D) + '</div></div>'; } },
    { t: "Dónde y cuándo", b: function (D) { return '<div class="grid-dash"><div class="c4">' + TAB.areaCard(D) + '</div><div class="c4">' + TAB.heat(D) + '</div><div class="c4">' + TAB.matriz(D) + '</div></div>'; } },
    { t: "Seguimiento", b: function (D) { return '<div class="grid-dash"><div class="c4">' + TAB.flujo(D) + '</div><div class="c4">' + TAB.atencion(D) + '</div><div class="c4">' + TAB.contCard(D) + '</div></div>'; } }
  ],
  pres: { i: 0, play: true, t: null, SEG: 14 },
  irDiapo: function (i) { var n = TAB.diapos.length; TAB.pres.i = (i + n) % n; if (PRES.activo && /tablero/.test(location.hash)) App.route(); },
  pintarDiapo: function (D) {
    var P = TAB.pres, d = TAB.diapos[P.i];
    clearTimeout(P.t);
    $("#view").innerHTML = '<div class="diapo"><div class="dp-h"><span class="dp-n">' + (P.i + 1) + ' / ' + TAB.diapos.length + '</span><h2>' + esc(d.t) + '</h2><span class="spacer"></span>' +
      '<div class="dp-c"><button onclick="TAB.irDiapo(TAB.pres.i-1)" aria-label="Anterior">‹</button><button onclick="TAB.pres.play=!TAB.pres.play;TAB.irDiapo(TAB.pres.i)" aria-label="Pausa">' + (P.play ? "❚❚" : "▶") + '</button><button onclick="TAB.irDiapo(TAB.pres.i+1)" aria-label="Siguiente">›</button></div></div>' +
      '<div class="dp-b">' + d.b(D) + '</div><div class="dp-dots">' + TAB.diapos.map(function (x, j) { return '<button class="' + (j === P.i ? "on" : "") + '" onclick="TAB.irDiapo(' + j + ')" title="' + esc(x.t) + '"><i style="' + (j === P.i && P.play ? "animation-duration:" + P.SEG + "s" : "") + '"></i></button>'; }).join("") + '</div></div>';
    if (P.play) P.t = setTimeout(function () { if (PRES.activo && /tablero/.test(location.hash) && !$(".modal-bg")) TAB.irDiapo(P.i + 1); }, P.SEG * 1000);
  }
};
document.addEventListener("keydown", function (e) {
  if (!PRES.activo || !/tablero/.test(location.hash) || $(".modal-bg")) return;
  if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); TAB.irDiapo(TAB.pres.i + 1); }
  if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); TAB.irDiapo(TAB.pres.i - 1); }
  if (e.key === " ") { e.preventDefault(); TAB.pres.play = !TAB.pres.play; TAB.irDiapo(TAB.pres.i); }
});

Views.tablero = function () {
  var D = TAB.datos();
  App.titulo("Tablero de gestión SST", (S.fArea ? S.fArea + " · " : "") + "Año " + D.anio + " · " + CONFIG.EMPRESA,
    selectorArea() + selectorAnio() + (PRES.activo ? "" : '<button class="btn" onclick="TAB.pres.i=0;TAB.pres.play=true;PRES.iniciar()" title="Diapositivas a pantalla completa para el comité o un proyector">' + svg("presentar") + '<span class="hide-sm">Presentar</span></button>') +
    (L.rol() !== "COMITE" && !PRES.activo ? '<a class="btn primary" href="#/reportar">' + svg("reportar") + '<span class="hide-sm">Reportar evento</span></a>' : ""));
  if (PRES.activo) { TAB.pintarDiapo(D); UI.contar($("#view")); TAB.graficos(D); return; }
  clearTimeout(TAB.pres.t);
  $("#view").innerHTML = TAB.hero(D) +
    '<div class="sec-t"><span>Lectura del año</span><small>lo que dicen los datos, en una frase</small></div>' + TAB.lectura(D) + TAB.kpis(D) +
    '<div class="grid-dash">' +
      '<div class="c8">' + TAB.mesCard(D) + '</div><div class="c4">' + TAB.piramide(D) + '</div>' +
      '<div class="c6">' + TAB.pareto(D) + '</div><div class="c6">' + TAB.nacCard(D) + '</div>' +
      '<div class="c4">' + TAB.matriz(D) + '</div><div class="c4">' + TAB.heat(D) + '</div><div class="c4">' + TAB.flujo(D) + '</div>' +
      '<div class="c6">' + TAB.areaCard(D) + '</div><div class="c6">' + TAB.contCard(D) + '</div>' +
      '<div class="c6">' + TAB.atencion(D) + '</div><div class="c6">' + TAB.misAcc(D) + '</div>' +
    '</div>';
  UI.contar($("#view"));
  TAB.graficos(D);
};
