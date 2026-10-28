/* ============================================================
   GUÍA DE USO — navegación (volver, migas, recientes), buscador,
   «Mis pendientes», fases del evento, ayuda y recorrido guiado.
   ============================================================ */
Object.assign(ICON, {
  inicio: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  ayuda: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  firma: '<path d="M3 21c3-1 5-4 7-4s1 3 3 3 3-3 5-3M14.5 4.5l5 5L9 20H4v-5z"/>',
  volver: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  flecha: '<path d="M5 12h14M13 5l7 7-7 7"/>'
});

/* ---------- textos de la navegación ---------- */
var NAV = {
  origen: "eventos",
  etiqueta: function (v) {
    var r = L.rol();
    return { inicio: "Inicio", tablero: "Tablero", alertas: "Alertas y plazos", eventos: r === "REPORTANTE" ? "Mis reportes" : r === "JEFE" ? "Eventos de mi área" : "Eventos",
      investigaciones: "Investigaciones", reportar: "Reportar evento", descansos: "Descansos médicos", acciones: "Plan de acción", indicadores: "Indicadores",
      auditoria: "Trazabilidad", usuarios: "Usuarios y accesos", cuenta: "Mi cuenta" }[v] || "Inicio";
  },
  TABS: { resumen: "Resumen", respuesta: "Respuesta inicial", evidencias: "Evidencias y declaraciones", scat: "Análisis SCAT", acciones: "Plan de acción",
    descansos: "Descansos médicos", formatos: "Formatos y firmas", informe: "Informe y difusión", historial: "Historial" },
  /* Migas de pan + botón «Volver» con el destino escrito: así siempre se sabe a dónde regresa. */
  barra: function (p) {
    var v = p[0] || "inicio", c = ['<a href="#/inicio">Inicio</a>'], back = null;
    if (v === "evento") {
      if (NAV.origen !== "inicio") c.push('<a href="#/' + NAV.origen + '">' + esc(NAV.etiqueta(NAV.origen)) + '</a>');
      c.push('<a href="#/evento/' + esc(p[1]) + '">' + esc(p[1]) + '</a>');
      if (p[2] && p[2] !== "resumen") c.push('<span>' + esc(NAV.TABS[p[2]] || p[2]) + '</span>');
      back = NAV.origen;
    } else if (v !== "inicio") { c.push('<span>' + esc(NAV.etiqueta(v)) + '</span>'); back = "inicio"; }
    $("#pgCrumbs").innerHTML = v === "inicio" ? "" : c.join('<i>›</i>');
    $("#pgBack").hidden = !back;
    if (back) { $("#pgBack").dataset.h = "#/" + back; $("#pgBackT").textContent = NAV.etiqueta(back); $("#pgBack").title = "Volver a " + NAV.etiqueta(back); }
    document.documentElement.style.setProperty("--tbh", ($(".topbar").offsetHeight || 70) + "px");
    $$(".bbar a").forEach(function (a) { a.classList.toggle("on", a.dataset.v === v || (a.dataset.v === "inicio" && !p[0])); });
  },
  volver: function () { location.hash = $("#pgBack").dataset.h || "#/inicio"; },
  /* «Retoma donde te quedaste»: últimos reportes y pantallas abiertos por este usuario en este equipo. */
  // En el navegador solo se guarda el código y la pestaña (nunca nombres): el texto se arma con los datos que el usuario puede ver.
  _k: function () { return "scat_vistos_" + (S.user ? FIRMA.huella(S.user.dni) : ""); },
  _crudo: function () { try { var l = JSON.parse(localStorage.getItem(NAV._k()) || "[]"); return Array.isArray(l) ? l : []; } catch (e) { return []; } },
  vistos: function () {
    return NAV._crudo().map(function (x) {
      if (!x || typeof x !== "object") return null;
      if (x.v === "evento") {
        var ev = L.evento(x.id); if (!ev) return null; var tab = NAV.TABS[x.tab] ? x.tab : "resumen";
        return { k: "ev:" + ev.id, h: "#/evento/" + encodeURIComponent(ev.id) + "/" + tab, t: ev.id + " · " + CAT.tipoTxt(ev.tipo), s: NAV.TABS[tab] + (ev.trabajador ? " · " + ev.trabajador : ""), e: 1, ts: +x.ts || 0 };
      }
      return Views[x.v] && x.v !== "inicio" ? { k: x.v, h: "#/" + x.v, t: NAV.etiqueta(x.v), s: "", ts: +x.ts || 0 } : null;
    }).filter(Boolean);
  },
  recordar: function (p) {
    var v = p[0] || "inicio", it;
    if (["inicio","eventos","investigaciones","alertas","acciones","descansos","tablero"].indexOf(v) >= 0) NAV.origen = v;
    if (["inicio","reportar","cuenta"].indexOf(v) >= 0) return;
    if (v === "evento") { if (!L.evento(p[1])) return; it = { k: "ev:" + p[1], v: "evento", id: p[1], tab: NAV.TABS[p[2]] ? p[2] : "resumen" }; }
    else it = { k: v, v: v };
    it.ts = Date.now();
    var l = NAV._crudo().filter(function (x) { return x && x.k !== it.k; }); l.unshift(it);
    try { localStorage.setItem(NAV._k(), JSON.stringify(l.slice(0, 8))); } catch (e) {}
  }
};
function haceCuanto(ts) {
  var m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "recién"; if (m < 60) return "hace " + m + " min"; var h = Math.round(m / 60); if (h < 24) return "hace " + h + " h";
  var d = Math.round(h / 24); return d === 1 ? "ayer" : "hace " + d + " días";
}

/* ---------- fases del evento (agrupan los 17 pasos del procedimiento) ---------- */
var FASES = [
  { n: 1, t: "Reporte", k: ["reporte","inmediatas","mtpe"] },
  { n: 2, t: "Investigación", k: ["equipo","evidencias","declaraciones","dm"] },
  { n: 3, t: "Análisis SCAT", k: ["scat1","scat2","scat3","scat4","scat5"] },
  { n: 4, t: "Plan de acción", k: ["acciones"] },
  { n: 5, t: "Firmas y aprobación", k: ["firmas","revision"] },
  { n: 6, t: "Cierre", k: ["difusion","cierre"] }
];
var GUIA = {
  /* Firmas que faltan en los formatos disponibles; marca las que le tocan al usuario actual. */
  faltan: function (ev) {
    var fr = S.firmasResumen[ev.id] || [], out = [], yo = S.user, area = L.enMiArea(ev);
    var hayJefe = S.equipo.some(function (u) { return u.rol === "JEFE" && String(u.area || "").split(/\s*;\s*/).some(function (a) { return a === "*" || a === ev.area || a === CAT.areaDe(ev.area); }); });
    DOCS.lista(ev).forEach(function (d) {
      if (!d.disponible) return;
      d.slots.forEach(function (s) {
        if (s.requiere || fr.some(function (f) { return f.doc === d.key && f.slot === s.k; })) return;
        var mia = false;
        if (s.dni && s.dni === yo.dni) mia = true;
        else if (s.yo && s.solo_roles && s.solo_roles.indexOf(yo.rol) >= 0) {
          if (s.k === "jefe") mia = (yo.rol === "JEFE" && area) || (!hayJefe && L.es("ADMIN","SST"));
          else if (s.k === "entrevistador") mia = L.es("ADMIN","SST") || (yo.rol === "JEFE" && area);
          else if (s.k === "comite") mia = yo.rol === "COMITE";
          else mia = true;
        }
        if (!s.req && !mia) return;
        if (!s.req && !(s.dni && s.dni === yo.dni)) return;          // las firmas opcionales solo se piden a la persona nombrada
        out.push({ doc: d.key, corto: d.corto, slot: s.k, quien: s.nombre || s.rol, rol: s.rol, mia: mia });
      });
    });
    return out;
  },
  /* Estado de las 6 fases y «lo que sigue» con responsable. */
  fases: function (ev) {
    var pg = L.pasos(ev), m = {}; pg.pasos.forEach(function (p) { m[p.k] = p; });
    var fs = FASES.map(function (f) {
      var ps = f.k.map(function (k) { return m[k]; }).filter(function (p) { return p && !p.na; });
      return { n: f.n, t: f.t, ok: ps.every(function (p) { return p.ok; }), hechos: ps.filter(function (p) { return p.ok; }).length, total: ps.length, tab: (ps.filter(function (p) { return !p.ok; })[0] || ps[0] || {}).tab || "resumen" };
    });
    var cur = fs.filter(function (f) { return !f.ok; })[0] || null;
    return { fases: fs, cur: cur, pct: pg.pct, sig: GUIA.siguiente(ev, pg) };
  },
  siguiente: function (ev, pg) {
    var p = pg.siguiente; if (!p || ev.estado === "Anulado" || ev.estado === "Cerrado") return null;
    var fal = GUIA.faltan(ev), mias = fal.filter(function (x) { return x.mia; }), ed = EV.puede(ev), r = L.rol();
    var o = { t: p.t, tab: p.tab, puede: ed, quien: "Equipo investigador", nota: "" };
    if (p.k === "firmas" && !fal.length && ["Aprobado","Cerrado"].indexOf(ev.estado) < 0) p = { k: "revision", t: "Investigación revisada y aprobada", tab: "resumen" };
    switch (p.k) {
      case "reporte": o.quien = "Quien reportó o SSOMA"; break;
      case "inmediatas": case "mtpe": o.quien = "SSOMA (Supervisor SST)"; break;
      case "equipo": o.quien = "SSOMA o jefe del área"; o.nota = "Elige a los integrantes: cada uno firmará el análisis y el registro."; break;
      case "dm": o.quien = "Médico ocupacional"; o.puede = L.es("ADMIN","SST","MEDICO"); o.nota = "Registra el descanso y adjunta el certificado."; break;
      case "firmas":
        var nom = fal.map(function (x) { return x.quien + " (" + x.corto + ")"; }), u = {}; nom = nom.filter(function (x) { return u[x] ? false : (u[x] = 1); });
        o.t = mias.length ? "Te toca firmar: " + mias.map(function (x) { return x.corto; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(", ") : "Faltan " + fal.length + " firma(s)";
        o.quien = nom.slice(0, 3).join(" · ") + (nom.length > 3 ? " y " + (nom.length - 3) + " más" : "");
        o.puede = mias.length > 0; o.tab = "formatos"; o.cta = "Firmar ahora"; break;
      case "revision":
        o.tab = "resumen";
        if (ev.estado === "En revisión") { o.t = "Revisar y aprobar la investigación"; o.quien = "SSOMA (Supervisor SST o administrador)"; o.puede = L.es("ADMIN","SST"); o.cta = "Revisar"; }
        else { o.t = "Enviar la investigación a revisión"; o.quien = "Equipo investigador (SSOMA o jefe del área)"; o.puede = L.es("ADMIN","SST","JEFE") && (L.enMiArea(ev) || L.es("ADMIN","SST")); o.cta = "Enviar a revisión"; o.accion = "EV.pedirTransicion('En revisión',false)"; }
        break;
      case "difusion": o.quien = "SSOMA"; o.puede = L.es("ADMIN","SST"); break;
      case "cierre": o.quien = "Responsables de las acciones · SSOMA verifica la eficacia"; o.puede = L.es("ADMIN","SST") || L.accionesDe(ev.id).some(function (a) { return a.responsable_dni === S.user.dni && a.estado !== "Cerrada"; }); break;
    }
    if (r === "COMITE" && p.k !== "revision") o.puede = false;
    return o;
  },
  html: function (ev) {
    if (ev.estado === "Anulado") return "";
    var g = GUIA.fases(ev), s = g.sig, cur = ev.estado === "Cerrado" ? null : g.cur;
    var h = '<div class="guia"><div class="gu-top"><div><div class="gu-k">' + (ev.estado === "Cerrado" ? "Cerrado" : cur ? "Paso " + cur.n + " de 6" : "Proceso completo") + '</div><div class="gu-t">' + (ev.estado === "Cerrado" ? "Expediente archivado" : cur ? esc(cur.t) : "Expediente terminado") + '</div></div>' +
      '<div class="gu-pct"><b>' + g.pct + '%</b><span>avance del procedimiento</span></div></div>' +
      '<div class="fases">' + g.fases.map(function (f) {
        var st = f.ok ? "ok" : cur && f.n === cur.n ? "cur" : "";
        return '<a class="fase ' + st + '" href="#/evento/' + esc(ev.id) + '/' + f.tab + '" title="' + esc(f.t) + ': ' + f.hechos + ' de ' + f.total + ' tareas"><i></i><span class="fs-n">' + (f.ok ? svg("check") : f.n) + '</span><span class="fs-t">' + esc(f.t) + '</span></a>';
      }).join("") + '</div>';
    if (s) {
      var href = "#/evento/" + ev.id + "/" + s.tab;
      h += '<div class="sigue ' + (s.puede ? "yo" : "") + '"><div class="sg-ic">' + svg(s.puede ? "flecha" : "reloj") + '</div><div class="sg-tx"><div class="sg-k">' + (s.puede ? "Lo que sigue · te toca a ti" : "Lo que sigue · en manos de otra persona") + '</div>' +
        '<b>' + esc(s.t) + '</b><span>Responsable: ' + esc(s.quien) + (s.nota ? " · " + esc(s.nota) : "") + '</span></div>' +
        (s.puede ? (s.accion ? '<button class="btn primary lg" onclick="' + s.accion + '">' + esc(s.cta) + ' →</button>' : '<a class="btn primary lg" href="' + esc(href) + '" data-t="' + esc(s.tab) + '" onclick="if(location.hash===this.getAttribute(\'href\')){event.preventDefault();EV.ir(this.dataset.t)}">' + esc(s.cta || "Hacerlo ahora") + ' →</a>')
          : '<a class="btn" href="' + esc(href) + '">Ver detalle</a>') + '</div>';
    } else h += '<div class="sigue fin"><div class="sg-ic">' + svg("check") + '</div><div class="sg-tx"><b>' + (ev.estado === "Cerrado" ? "Expediente cerrado" : "Todas las tareas del procedimiento están completas") + '</b><span>Queda disponible para consulta y auditoría' + (ev.estado === "Cerrado" && g.pct < 100 ? " · avance registrado: " + g.pct + "%" : "") + '.</span></div></div>';
    return h + '</div>';
  },
  /* Para marcar las pestañas: hecha (✓) o donde está el siguiente paso (punto naranja). */
  tabsEstado: function (ev) {
    var pg = L.pasos(ev), st = {};
    pg.pasos.forEach(function (p) { if (p.na) return; var t = st[p.tab] || (st[p.tab] = { ok: true }); if (!p.ok) t.ok = false; });
    var s = GUIA.siguiente(ev, pg); if (s) (st[s.tab] = st[s.tab] || {}).next = true;
    return st;
  }
};

/* ---------- MIS PENDIENTES ---------- */
var PEND = {
  lista: function () {
    var out = [], r = L.rol(), yo = S.user;
    S.eventos.forEach(function (ev) {
      if (ev.estado === "Anulado" || ev.estado === "Cerrado") return;          // los cerrados son archivo: no generan tareas
      var nm = (ev.trabajador ? ev.trabajador + " · " : "") + CAT.tipoTxt(ev.tipo), venc = L.plazos(ev).filter(function (p) { return p.st === "vencido"; })[0], pronto = L.plazos(ev).filter(function (p) { return p.st === "pronto"; })[0];
      var fal = GUIA.faltan(ev).filter(function (x) { return x.mia; });
      if (fal.length) {
        var docs = fal.map(function (x) { return x.corto; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
        out.push({ sev: 2, ic: "firma", c: "on", t: docs.length === 1 ? "Firmar: " + docs[0] : "Firmar " + docs.length + " formatos", d: ev.id + " · " + nm, cta: "Firmar", h: "#/evento/" + ev.id + "/formatos" });
      }
      var gestiona = L.es("ADMIN","SST") || (r === "JEFE" && L.enMiArea(ev));
      if (gestiona && ["Reportado","En investigación","Observado"].indexOf(ev.estado) >= 0) {
        var s = GUIA.siguiente(ev, L.pasos(ev));
        if (s && !(s.tab === "formatos" && fal.length)) {
          var t = ev.estado === "Observado" ? "Corregir la investigación observada" : ev.estado === "Reportado" ? "Iniciar la investigación" : "Continuar la investigación";
          out.push({ sev: ev.estado === "Observado" || venc ? 3 : 2, ic: "investigaciones", c: "info", t: t, d: ev.id + " · sigue: " + s.t, due: venc ? venc.t + " vencido" : pronto ? pronto.t + " por vencer" : "", dueC: venc ? "bad" : "warn", cta: s.puede ? (s.cta || "Continuar") : "Ver", h: "#/evento/" + ev.id + "/" + s.tab });
        }
      }
      if (ev.estado === "En revisión" && L.es("ADMIN","SST")) out.push({ sev: 2, ic: "investigaciones", c: "purple", t: "Revisar y aprobar la investigación", d: ev.id + " · " + nm, cta: "Revisar", h: "#/evento/" + ev.id });
      if (ev.estado === "En revisión" && r === "COMITE") out.push({ sev: 1, ic: "investigaciones", c: "purple", t: "Revisar la investigación (Comité SST)", d: ev.id + " · " + nm, cta: "Revisar", h: "#/evento/" + ev.id });
      if (ev.estado === "Aprobado" && L.es("ADMIN","SST")) { var s2 = GUIA.siguiente(ev, L.pasos(ev)); if (s2 && s2.tab !== "formatos") out.push({ sev: 1, ic: "check", c: "ok", t: "Completar el expediente para cerrarlo", d: ev.id + " · falta: " + s2.t, cta: "Continuar", h: "#/evento/" + ev.id + "/" + s2.tab }); }
    });
    S.acciones.forEach(function (a) {
      if (a.responsable_dni !== yo.dni || a.estado === "Cerrada") return;
      var d = diasHasta(a.fecha_compromiso);
      out.push({ sev: d != null && d < 0 ? 3 : d != null && d <= 5 ? 2 : 1, ic: "acciones", c: "ok", t: "Ejecutar la acción " + a.id, d: recorta(a.descripcion, 90) + " · " + a.evento_id,
        due: d == null ? "" : d < 0 ? "Vencida hace " + (-d) + " d" : d === 0 ? "Vence hoy" : "Vence en " + d + " d", dueC: d != null && d < 0 ? "bad" : d != null && d <= 5 ? "warn" : "", cta: "Actualizar", h: "#/acciones/" + a.id });
    });
    if (L.es("ADMIN","SST")) {
      var ef = S.acciones.filter(function (a) { return a.estado === "Cerrada" && a.eficacia !== "Sí"; });
      if (ef.length) out.push({ sev: 1, ic: "acciones", c: "ok", t: "Verificar la eficacia de " + ef.length + " acción(es) cerrada(s)", d: ef.slice(0, 3).map(function (a) { return a.id; }).join(", ") + (ef.length > 3 ? "…" : ""), cta: "Verificar", h: "#/acciones" });
    }
    if (L.es("ADMIN","SST","MEDICO")) S.descansos.forEach(function (d) {
      if (d.estado === "Pendiente") out.push({ sev: 2, ic: "descansos", c: "warn", t: "Validar el descanso médico " + d.id, d: d.trabajador + " · " + d.dias + " días · " + fFecha(d.inicio) + " – " + fFecha(d.fin), cta: "Validar", h: "#/descansos/" + d.id });
      if (d.estado !== "Observado" && !(d.adjuntos || []).length) out.push({ sev: 2, ic: "descansos", c: "bad", t: "Adjuntar el certificado del descanso " + d.id, d: d.trabajador + " · falta el sustento médico", cta: "Adjuntar", h: "#/descansos/" + d.id });
    });
    return out.sort(function (a, b) { return b.sev - a.sev; });
  },
  /* Accesos rápidos según el rol, para que el inicio nunca quede vacío. */
  accesos: function () {
    var r = L.rol(), q = [];
    if (r !== "COMITE") q.push(["reportar", "Reportar evento", "Registra un accidente o incidente", "o"]);
    q.push(["eventos", NAV.etiqueta("eventos"), "Consulta los expedientes"]);
    if (r !== "REPORTANTE") q.push(["investigaciones", "Investigaciones", "Casos abiertos y su avance"]);
    if (L.es("ADMIN","SST","MEDICO","JEFE")) q.push(["descansos", "Descansos médicos", "Certificados y días perdidos"]);
    q.push(["acciones", r === "JEFE" || r === "REPORTANTE" ? "Mis acciones" : "Plan de acción", "Medidas y sus plazos"]);
    if (r !== "REPORTANTE") q.push(["tablero", "Tablero gerencial", "Indicadores del año"]);
    return '<div class="sub-h mt">Accesos rápidos</div><div class="qa">' + q.map(function (x) { return '<a href="#/' + x[0] + '" class="' + (x[3] || "") + '"><i>' + svg(x[0]) + '</i><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></a>'; }).join("") +
      '<button type="button" onclick="BUSCAR.abrir()"><i>' + svg("buscar") + '</i><b>Buscar un caso</b><span>Por código, apellido o DNI</span></button></div>';
  },
  fila: function (x) {
    return '<a class="tarea s' + x.sev + '" href="' + esc(x.h) + '"><span class="ta-ic ' + x.c + '">' + svg(x.ic) + '</span><span class="ta-tx"><b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span></span>' +
      (x.due ? '<span class="pill ' + (x.dueC || "") + ' ta-due">' + esc(x.due) + '</span>' : "") + '<span class="btn sm ' + (x.sev >= 2 ? "primary" : "") + ' ta-cta">' + esc(x.cta) + '</span></a>';
  }
};

Views.inicio = function () {
  var r = L.rol(), hoy = new Date(), hr = hoy.getHours(), nombre = String(S.user.nombre || "").replace(/\(.*\)/, "").trim().split(/\s+/);
  var pila = nombre.length > 2 ? nombre[2] : nombre[0]; pila = pila ? pila.charAt(0) + pila.slice(1).toLowerCase() : "";
  var saludo = (hr < 12 ? "Buenos días" : hr < 19 ? "Buenas tardes" : "Buenas noches") + (pila ? ", " + pila : "");
  var pend = PEND.lista(), urg = pend.filter(function (x) { return x.sev >= 3; }).length;
  App.titulo("Inicio", "Lo que te toca hacer hoy");
  var fecha = hoy.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" }); fecha = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  var h = '<section class="ini-head"><div><div class="ih-k">' + esc(fecha) + ' · ' + esc((CAT.roles[r] || {}).t || r) + '</div><h2>' + esc(saludo) + '</h2>' +
    '<p>' + (pend.length ? 'Tienes <b>' + pend.length + '</b> ' + (pend.length === 1 ? "tarea pendiente" : "tareas pendientes") + (urg ? ', <b class="t-bad">' + urg + ' urgente' + (urg > 1 ? "s" : "") + '</b>' : "") + '.' : "Estás al día: no tienes tareas pendientes.") + '</p></div>' +
    '<div class="ih-act">' + (r !== "COMITE" ? '<a class="btn on-btn lg" href="#/reportar">' + svg("reportar") + 'Reportar evento</a>' : "") +
    '<button class="btn lg ih-bus" onclick="BUSCAR.abrir()">' + svg("buscar") + 'Buscar un caso<kbd>Ctrl K</kbd></button></div></section>';

  var grupos = [[3, "Urgente", "bad"], [2, "Por hacer", "warn"], [1, "Para revisar cuando puedas", ""]];
  var tareas = pend.length ? grupos.map(function (g) {
    var l = pend.filter(function (x) { return x.sev === g[0]; }); if (!l.length) return "";
    return '<div class="tg"><div class="tg-h"><span class="dotc ' + g[2] + '"></span>' + g[1] + '<small>' + l.length + '</small></div>' + l.slice(0, 12).map(PEND.fila).join("") + (l.length > 12 ? '<div class="small muted" style="padding:6px 4px">… y ' + (l.length - 12) + ' más</div>' : "") + '</div>';
  }).join("") : '<div class="al-dia sm"><div class="ad-ic">' + svg("check") + '</div><b>Todo al día</b><span>Cuando te asignen una firma, una acción o una investigación, aparecerá aquí con un botón para hacerla.</span></div>' + PEND.accesos();

  var vis = NAV.vistos().slice(0, 6);
  var retoma = '<div class="card"><h3>Retoma donde te quedaste</h3>' + (vis.length ? vis.map(function (x) {
    return '<a class="vis" href="' + esc(x.h) + '"><span class="vis-ic">' + svg(x.e ? "eventos" : (ICON[x.k] ? x.k : "tablero")) + '</span><span class="vis-tx"><b>' + esc(x.t) + '</b><span>' + esc(x.s ? x.s + " · " : "") + haceCuanto(x.ts) + '</span></span><span class="go">›</span></a>';
  }).join("") : '<div class="muted small">Aquí aparecerán los últimos reportes que abras, para volver a ellos con un clic.</div>') + '</div>';

  var lado = retoma;
  if (r === "REPORTANTE") {
    var mios = S.eventos.filter(function (e) { return e.reportado_por === S.user.dni; });
    lado = '<div class="card"><h3>Mis reportes <small>' + mios.length + '</small></h3>' + (mios.length ? mios.slice(0, 8).map(function (e) {
      var g = GUIA.fases(e);
      return '<a class="vis" href="#/evento/' + esc(e.id) + '"><span class="vis-ic">' + svg("eventos") + '</span><span class="vis-tx"><b>' + esc(e.id) + ' · ' + esc(CAT.tipoTxt(e.tipo)) + '</b><span>' + esc(e.estado) + (g.cur ? " · paso " + g.cur.n + " de 6: " + g.cur.t : "") + '</span></span><span class="go">›</span></a>';
    }).join("") : '<div class="muted small">Aún no registras eventos. Usa «Reportar evento» cuando ocurra un accidente o incidente.</div>') + '</div>' + retoma;
  } else {
    var anio = S.anio, base = S.eventos.filter(function (e) { return e.estado !== "Anulado"; });
    var incap = base.filter(function (e) { var t = CAT.get("tipoEvento", e.tipo); return t && t.cuentaIF; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; })[0];
    var abiertas = base.filter(function (e) { return ["Reportado","En investigación","Observado","En revisión"].indexOf(e.estado) >= 0; }).length;
    var venc = S.acciones.filter(L.accVencida).length, evA = base.filter(function (e) { return String(e.fecha).slice(0, 4) == anio; }).length;
    lado += '<div class="card"><h3>Resumen ' + anio + '</h3><div class="mini">' +
      '<a href="#/tablero"><b class="tnum">' + (incap ? -diasHasta(incap.fecha) : "—") + '</b><span>días sin accidentes incapacitantes</span></a>' +
      '<a href="#/eventos"><b class="tnum">' + evA + '</b><span>eventos registrados</span></a>' +
      '<a href="#/investigaciones"><b class="tnum">' + abiertas + '</b><span>investigaciones abiertas</span></a>' +
      '<a href="#/acciones" class="' + (venc ? "bad" : "") + '"><b class="tnum">' + venc + '</b><span>acciones vencidas</span></a></div>' +
      '<a class="btn block mt" href="#/tablero">' + svg("tablero") + 'Abrir el tablero completo</a></div>';
  }
  $("#view").innerHTML = h + '<div class="ini"><div class="ini-main"><div class="card"><h3>Tus pendientes <small>' + pend.length + '</small></h3>' + tareas + '</div></div><div class="ini-side">' + lado + '</div></div>';
};

/* ---------- BUSCADOR GLOBAL (Ctrl + K) ---------- */
function normal(s) { return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
var BUSCAR = {
  abrir: function () {
    if ($(".cmdk-bg")) return;
    var bg = document.createElement("div"); bg.className = "cmdk-bg";
    bg.innerHTML = '<div class="cmdk" role="dialog" aria-modal="true" aria-label="Buscar"><div class="cmdk-in">' + svg("buscar") + '<input id="cmdkQ" placeholder="Código (EV-2026-001), nombre, DNI, lugar o pantalla…" autocomplete="off"><kbd>Esc</kbd></div><div class="cmdk-r" id="cmdkR"></div>' +
      '<div class="cmdk-f"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span></div></div>';
    document.body.appendChild(bg); document.body.classList.add("noscroll");
    var q = $("#cmdkQ"), sel = 0, res = [];
    function cerrar() { bg.remove(); if (!$(".modal-bg")) document.body.classList.remove("noscroll"); }
    function ir(i) { var x = res[i]; if (!x) return; cerrar(); location.hash = x.h; }
    function pintar() {
      res = BUSCAR.buscar(q.value); sel = Math.min(sel, Math.max(res.length - 1, 0));
      var g = null;
      $("#cmdkR").innerHTML = res.length ? res.map(function (x, i) {
        var hd = x.g !== g ? '<div class="cmdk-g">' + esc(x.g) + '</div>' : ""; g = x.g;
        return hd + '<button class="cmdk-i ' + (i === sel ? "on" : "") + '" data-i="' + i + '"><span class="ci-ic">' + svg(x.ic) + '</span><span class="ci-tx"><b>' + esc(x.t) + '</b>' + (x.s ? '<span>' + esc(x.s) + '</span>' : "") + '</span>' + (x.p ? x.p : "") + '</button>';
      }).join("") : '<div class="cmdk-e">No se encontró «' + esc(q.value) + '». Prueba con el código del evento, el apellido o el DNI.</div>';
      var on = $(".cmdk-i.on", bg); if (on) on.scrollIntoView({ block: "nearest" });
    }
    q.addEventListener("input", function () { sel = 0; pintar(); });
    q.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { sel = Math.min(sel + 1, res.length - 1); pintar(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); pintar(); e.preventDefault(); }
      else if (e.key === "Enter") { ir(sel); e.preventDefault(); }
      else if (e.key === "Escape") cerrar();
    });
    $("#cmdkR").addEventListener("click", function (e) { var b = e.target.closest(".cmdk-i"); if (b) ir(+b.dataset.i); });
    bg.addEventListener("mousedown", function (e) { if (e.target === bg) cerrar(); });
    pintar(); setTimeout(function () { q.focus(); }, 20);
  },
  paginas: function () {
    var r = L.rol(), p = [["inicio","Inicio · Mis pendientes"],["reportar","Reportar un evento nuevo"],["eventos",NAV.etiqueta("eventos")],["investigaciones","Investigaciones en curso"],["descansos","Descansos médicos"],
      ["acciones","Plan de acción"],["tablero","Tablero de gestión"],["indicadores","Indicadores IF · IS · IA"],["alertas","Alertas y plazos"],["auditoria","Trazabilidad"],["usuarios","Usuarios y accesos"],["cuenta","Mi cuenta"]];
    var ocultas = { REPORTANTE: ["investigaciones","descansos","indicadores","tablero","auditoria","usuarios"], COMITE: ["reportar","auditoria","usuarios"], MEDICO: ["auditoria","usuarios"], JEFE: ["auditoria","usuarios"], SST: ["usuarios"] }[r] || [];
    return p.filter(function (x) { return ocultas.indexOf(x[0]) < 0; });
  },
  buscar: function (txt) {
    var q = normal(txt).trim(), out = [], ws = q.split(/\s+/).filter(String);
    var hit = function (campos) { var s = normal(campos.join(" ")); return ws.every(function (w) { return s.indexOf(w) >= 0; }); };
    if (!q) {
      NAV.vistos().slice(0, 5).forEach(function (x) { out.push({ g: "Vistos recientemente", ic: x.e ? "eventos" : "tablero", t: x.t, s: x.s, h: x.h }); });
      BUSCAR.paginas().slice(0, 6).forEach(function (x) { out.push({ g: "Ir a", ic: ICON[x[0]] ? x[0] : "tablero", t: x[1], h: "#/" + x[0] }); });
      return out;
    }
    S.eventos.filter(function (e) { return hit([e.id, e.trabajador, e.dni_trab, e.lugar, e.descripcion, e.area, CAT.tipoTxt(e.tipo), e.estado, e.reportado_nombre]); }).slice(0, 8).forEach(function (e) {
      out.push({ g: "Eventos", ic: "eventos", t: e.id + " · " + CAT.tipoTxt(e.tipo) + (e.trabajador ? " · " + e.trabajador : ""), s: fFecha(e.fecha) + " · " + CAT.divDe(e.area) + " · " + recorta(e.descripcion, 70), h: "#/evento/" + e.id, p: L.estadoPill(e.estado) });
    });
    S.descansos.filter(function (d) { return hit([d.id, d.trabajador, d.dni_trab, d.evento_id]); }).slice(0, 5).forEach(function (d) {
      out.push({ g: "Descansos médicos", ic: "descansos", t: d.id + " · " + d.trabajador, s: fFecha(d.inicio) + " – " + fFecha(d.fin) + " · " + d.dias + " días", h: "#/descansos/" + d.id });
    });
    S.acciones.filter(function (a) { return hit([a.id, a.descripcion, a.responsable, a.evento_id]); }).slice(0, 5).forEach(function (a) {
      out.push({ g: "Acciones", ic: "acciones", t: a.id + " · " + recorta(a.descripcion, 70), s: (a.responsable || "") + " · " + a.evento_id + " · " + fFecha(a.fecha_compromiso), h: "#/acciones/" + a.id, p: L.accPill(a) });
    });
    BUSCAR.paginas().filter(function (x) { return hit([x[1]]); }).forEach(function (x) { out.push({ g: "Pantallas", ic: ICON[x[0]] ? x[0] : "tablero", t: x[1], h: "#/" + x[0] }); });
    return out;
  }
};
document.addEventListener("keydown", function (e) {
  if (!S.user || $("#app").hidden) return;
  var esc_ = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName) || (e.target || {}).isContentEditable;
  if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); BUSCAR.abrir(); }
  else if (e.key === "/" && !esc_ && !$(".modal-bg")) { e.preventDefault(); BUSCAR.abrir(); }
});

/* ---------- AYUDA POR PANTALLA Y RECORRIDO GUIADO ---------- */
var AYUDA = {
  textos: {
    inicio: ["Aquí ves solo lo que te toca hacer: firmas, investigaciones, acciones y descansos médicos.", "Cada tarea tiene su botón: tócalo y llegas directo al lugar exacto.", "«Retoma donde te quedaste» guarda los últimos reportes que abriste."],
    tablero: ["Resumen del año para la gerencia: días sin accidentes, índices IF · IS · IA y causas más frecuentes.", "Filtra por área ▸ división y por año con los selectores de arriba.", "Toca cualquier indicador para ver el detalle."],
    eventos: ["Todos los eventos a los que tienes acceso. Usa el buscador o los filtros.", "Toca una tarjeta para abrir el expediente.", "Para registrar uno nuevo, usa «Reportar evento»."],
    investigaciones: ["Investigaciones abiertas y su avance.", "Abre una para ver en qué paso va y qué falta."],
    reportar: ["Registra el evento apenas ocurra: qué pasó, dónde, a quién y las fotos del lugar.", "Los campos con * son obligatorios. Después SSOMA inicia la investigación."],
    descansos: ["Certificados de incapacidad de los trabajadores con su sustento.", "Toca una fila para validar o adjuntar el certificado.", "El diagnóstico solo lo ven el área médica y SSOMA (Ley 29733)."],
    acciones: ["Medidas del plan de acción con su responsable y plazo.", "Toca una acción para actualizar su avance o cerrarla con evidencia."],
    indicadores: ["Índices de frecuencia, severidad y accidentabilidad por mes.", "Registra las horas-hombre trabajadas (HHT) para que se calculen."],
    alertas: ["Plazos legales y del procedimiento que están por vencer o ya vencieron.", "Toca una alerta para ir al lugar donde se resuelve."],
    auditoria: ["Bitácora de todo lo que se hizo en el sistema: quién, qué y cuándo."],
    usuarios: ["Quién puede ingresar con su DNI / CE, con qué rol y a qué áreas."],
    cuenta: ["Tus datos y tu actividad en el sistema."],
    evento: ["La barra de 6 pasos muestra en qué va el caso. Toca un paso para ir a él.", "El recuadro «Lo que sigue» dice qué falta, quién lo hace y tiene el botón para hacerlo.", "Las pestañas con ✓ ya están completas; el punto naranja marca dónde está lo pendiente.", "Usa «Volver» (arriba) para regresar a la lista."]
  },
  abrir: function () {
    var v = (location.hash.replace(/^#\//, "").split("/")[0]) || "inicio", t = AYUDA.textos[v] || AYUDA.textos.inicio;
    modal({ title: "¿Cómo se usa esta pantalla?", cancel: "Entendido", body: '<ul class="ayuda-l">' + t.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul>' +
      '<div class="ayuda-tips"><span><kbd>Ctrl K</kbd> buscar</span><span><b>← Volver</b> regresar a la lista</span></div>',
      footer: '<button class="btn" onclick="this.closest(\'.modal-bg\').remove();document.body.classList.remove(\'noscroll\');TOUR.abrir()">Ver el recorrido guiado</button>' });
  }
};
var TOUR = {
  pasos: [
    ["inicio", "Tu inicio: Mis pendientes", "Al entrar ves solo lo que te toca hacer, ordenado por urgencia. Cada tarea tiene un botón que te lleva al lugar exacto."],
    ["buscar", "Encuentra cualquier caso", "Escribe el código (EV-2026-001), el apellido o el DNI en «Buscar». También con el atajo Ctrl + K."],
    ["volver", "Siempre sabes dónde estás", "Arriba ves la ruta (Inicio › Eventos › EV-2026-001) y el botón «Volver» te regresa a la lista de donde vienes."],
    ["investigaciones", "Cada evento te guía", "Una barra de 6 pasos muestra en qué va el caso y el recuadro «Lo que sigue» te dice qué falta, quién lo hace y el botón para hacerlo."]
  ],
  _k: function () { return "scat_tour_" + (S.user ? FIRMA.huella(S.user.dni) : ""); },
  pendiente: function () { try { return !localStorage.getItem(TOUR._k()); } catch (e) { return false; } },
  abrir: function () {
    var i = 0, m = modal({ title: "Bienvenida al sistema SCAT", body: '<div id="tourB"></div>', footer: '<button class="btn" id="tourAnt">Anterior</button>', cancel: "Saltar", ok: "Siguiente", sticky: true,
      onOk: function () { if (i < TOUR.pasos.length - 1) { i++; pintar(); return false; } try { localStorage.setItem(TOUR._k(), "1"); } catch (e) {} } });
    $$("[data-x]", m.el).forEach(function (b) { b.addEventListener("click", function () { try { localStorage.setItem(TOUR._k(), "1"); } catch (e) {} }); });
    function pintar() {
      var p = TOUR.pasos[i];
      $("#tourB", m.el).innerHTML = '<div class="tour"><div class="tour-ic">' + svg(p[0]) + '</div><div class="tour-n">Paso ' + (i + 1) + ' de ' + TOUR.pasos.length + '</div><h4>' + esc(p[1]) + '</h4><p>' + esc(p[2]) + '</p>' +
        '<div class="tour-d">' + TOUR.pasos.map(function (x, j) { return '<i class="' + (j === i ? "on" : "") + '"></i>'; }).join("") + '</div></div>';
      $("[data-ok]", m.el).textContent = i < TOUR.pasos.length - 1 ? "Siguiente" : "Empezar"; $("#tourAnt", m.el).hidden = i === 0;
    }
    $("#tourAnt", m.el).onclick = function () { if (i > 0) { i--; pintar(); } };
    pintar();
  }
};

/* ---------- CARÁTULAS DEL LOGIN (rotan cada 5,5 s; pausa al pasar el mouse) ---------- */
var CARATULAS = {
  i: 0, t: null,
  iniciar: function () {
    var box = $("#lgShow"); if (!box || CARATULAS.listo) return; CARATULAS.listo = true;
    $$("#lgDots button").forEach(function (b, j) { b.onclick = function () { CARATULAS.ir(j); }; });
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;   // sin movimiento automático
    $$("#lgDots button i").forEach(function (i) { i.addEventListener("animationend", function () { CARATULAS.ir(CARATULAS.i + 1); }); });
  },
  ir: function (j) {
    var sl = $$(".lg-slide"), ds = $$("#lgDots button"), n = sl.length; if (!n) return;
    j = (j + n) % n; if (j === CARATULAS.i && sl[j].classList.contains("on")) return;
    sl.forEach(function (s, k) { s.classList.toggle("out", k === CARATULAS.i && k !== j); s.classList.toggle("on", k === j); });
    ds.forEach(function (d, k) { d.classList.remove("on"); d.classList.toggle("done", k < j); void d.offsetWidth; if (k === j) d.classList.add("on"); });
    CARATULAS.i = j;
  }
};
