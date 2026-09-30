/* ============================================================
   EXPEDIENTE DEL EVENTO — investigación SCAT automatizada
   ============================================================ */
var EV = {
  id: null, tab: "resumen", draft: null,

  render: function (id, tab) {
    var ev = L.evento(id);
    if (!ev) { App.titulo("Evento no encontrado", ""); $("#view").innerHTML = '<div class="card empty">El evento ' + esc(id) + ' no existe o no tienes acceso.</div>'; return; }
    if (EV.id !== id) { EV.draft = null; DOCS.cargarFirmas(id); }
    EV.id = id; EV.tab = tab;
    var pg = L.pasos(ev), acc = L.accionesDe(id), dm = L.dmDe(id), s = ev.scat || {}, rg = CAT.riesgo(s.gravedad, s.probabilidad, s.exposicion), t = CAT.get("tipoEvento", ev.tipo) || {};
    App.titulo(ev.id + " · " + CAT.tipoTxt(ev.tipo), ev.area + " · " + fFecha(ev.fecha) + " " + (ev.hora || ""), '<a class="btn" href="#/eventos">← <span class="hide-sm">Registro</span></a><a class="btn primary" href="#/evento/' + id + '/formatos">🖊 <span class="hide-sm">Formatos PDF</span></a>');
    var flujo = ["Reportado","En investigación","En revisión","Aprobado","Cerrado"], iCur = flujo.indexOf(ev.estado === "Observado" ? "En investigación" : ev.estado);
    var h = '<div class="ev-hero" style="--c:' + (t.color || "#0284c7") + '"><div class="evh-main"><div class="evh-id">' + esc(ev.id) + ' · ' + areaChip(ev.area) + '</div><h2>' + esc(ev.descripcion) + '</h2>' +
      '<div class="meta">' + L.tipoPill(ev.tipo) + L.estadoPill(ev.estado) + (rg ? '<span class="pill ' + rg.color + '">Riesgo ' + rg.nivel + '</span>' : "") +
      '<span>👷 ' + esc(ev.trabajador || "sin trabajador") + '</span><span>📍 ' + esc(ev.lugar || ev.ambito || "—") + '</span><span>🩺 ' + L.diasPerdidos(id) + ' días perdidos</span></div>' +
      (ev.estado === "Anulado" ? "" : '<div class="flow">' + flujo.map(function (f, i) { return '<span class="' + (i < iCur ? "done" : i === iCur ? "cur" : "") + '">' + (i < iCur ? "✓ " : "") + f + '</span>'; }).join("") + '</div>') + '</div>' +
      '<div class="evh-side"><div class="ring" style="--p:' + pg.pct + '"><span>' + pg.pct + '%</span></div><div><div class="small muted">Avance del proceso</div>' +
      (pg.siguiente && ev.estado !== "Anulado" ? '<a class="next-step" href="#/evento/' + id + '/' + pg.siguiente.tab + '">Siguiente: <b>' + esc(pg.siguiente.t) + '</b> →</a>' : '<b class="ok-t">Proceso completo</b>') + '</div></div>' +
      '<div class="evh-actions">' + EV.botonesFlujo(ev) + '</div></div>';
    var nForm = DOCS.lista(ev).filter(function (d) { return d.disponible; }), nFirm = nForm.filter(function (d) { return (ev.adjuntos || []).some(function (a) { return a.doc === d.key; }); }).length;
    var tabs = [["resumen","Resumen"],["respuesta","Respuesta inicial"],["evidencias","Evidencias y declaraciones",(ev.adjuntos || []).filter(function (a) { return !a.doc; }).length + (ev.declaraciones || []).length],
      ["scat","Análisis SCAT", pg.pasos.filter(function (p) { return /^scat/.test(p.k) && p.ok; }).length + "/5"],["acciones","Plan de acción",acc.length],["descansos","Descansos médicos",dm.length],
      ["formatos","Formatos y firmas", nFirm + "/" + nForm.length],["informe","Informe y difusión"],["historial","Historial",(ev.comentarios || []).length || ""]];
    h += '<div class="tabs" role="tablist">' + tabs.map(function (x) { return '<button class="tab ' + (x[0] === tab ? "active" : "") + '" role="tab" onclick="location.hash=\'#/evento/' + id + '/' + x[0] + '\'">' + x[1] + (x[2] !== undefined && x[2] !== "" ? ' <span class="tb">' + x[2] + '</span>' : "") + '</button>'; }).join("") + '</div><div id="tabBody" class="fade"></div>';
    $("#view").innerHTML = h;
    if (tab === "formatos") return DOCS.tab(ev);
    (EV.tabs[tab] || EV.tabs.resumen)(ev);
    var at = $(".tab.active"); if (at && at.scrollIntoView) at.scrollIntoView({ block: "nearest", inline: "center" });
  },
  puede: function (ev) { return L.puedeEditarEv(ev); },
  guardarEv: function (ev, msg, tabDestino) {
    return App.guardar("eventos", ev).then(function (r) {
      if (!r) return null;
      toast(msg || "Cambios guardados", "ok");
      if (r.estado === "Reportado" && L.es("ADMIN","SST","JEFE") && EV.tieneInvestigacion(r)) return EV.transicion(r, "En investigación", "Inicio automático al registrar datos de la investigación", true);
      EV.ir(tabDestino || EV.tab); return r;
    });
  },
  ir: function (tab) { var h = "#/evento/" + EV.id + "/" + tab; if (location.hash !== h) location.hash = h; else EV.render(EV.id, tab); },
  tieneInvestigacion: function (ev) { var s = ev.scat || {}; return (ev.equipo || []).length || (ev.declaraciones || []).length || (s.contactos || []).length || s.gravedad; },
  botonesFlujo: function (ev) {
    var r = L.rol(), b = [], area = L.enMiArea(ev) || L.es("ADMIN","SST");
    function btn(a, t, cls, motivo) { b.push('<button class="btn ' + cls + '" onclick="EV.pedirTransicion(\'' + a + '\',' + (motivo ? "true" : "false") + ')">' + t + '</button>'); }
    if (ev.estado === "Reportado" && L.es("ADMIN","SST","JEFE") && area) btn("En investigación", "▶ Iniciar investigación", "primary");
    if ((ev.estado === "En investigación" || ev.estado === "Observado") && L.es("ADMIN","SST","JEFE") && area) btn("En revisión", "📤 Enviar a revisión", "primary");
    if (ev.estado === "Observado" && L.es("ADMIN","SST","JEFE") && area) btn("En investigación", "Retomar", "");
    if (ev.estado === "En revisión" && L.es("ADMIN","SST")) btn("Aprobado", "✔ Aprobar", "ok");
    if (ev.estado === "En revisión" && L.es("ADMIN","SST","COMITE")) btn("Observado", "↩ Observar", "warn", true);
    if (ev.estado === "Aprobado" && L.es("ADMIN","SST")) btn("Cerrado", "🔒 Cerrar", "ok");
    if ((ev.estado === "Aprobado" || ev.estado === "Cerrado") && r === "ADMIN") btn("En investigación", "Reabrir", "", true);
    if (ev.estado !== "Anulado" && r === "ADMIN") btn("Anulado", "Anular", "danger", true);
    return b.join("");
  },
  pedirTransicion: function (a, motivo) {
    var ev = L.evento(EV.id);
    if (a === "En revisión") {
      var p = L.pasos(ev).pasos.filter(function (x) { return ["mtpe","equipo","scat1","scat2","scat3","scat4","scat5","acciones"].indexOf(x.k) >= 0 && !x.ok && !x.na; });
      if (p.length) { modal({ title: "Aún falta completar", body: '<p>Para enviar a revisión completa:</p>' + p.map(function (x) { return '<div class="step"><span class="ic">!</span>' + esc(x.t) + '<a class="btn sm go" href="#/evento/' + ev.id + '/' + x.tab + '" onclick="this.closest(\'.modal-bg\').remove();document.body.classList.remove(\'noscroll\')">Ir</a></div>'; }).join(""), cancel: "Entendido" }); return; }
    }
    var txt = { "En investigación": "El evento pasará a investigación.", "En revisión": "La investigación se enviará a SSOMA y al Comité SST. Ya no podrá editarse salvo que la observen.",
      "Aprobado": "Se registrará tu aprobación con fecha, hora y nombre. Luego firma el registro de investigación en «Formatos y firmas».", "Observado": "La investigación vuelve al equipo investigador con tu observación.",
      "Cerrado": "Se cerrará el expediente.", "Anulado": "El evento quedará anulado (no cuenta en los indicadores). Queda registrado en la trazabilidad." }[a] || "";
    confirmar(a === "Anulado" ? "Anular evento" : "Cambiar estado a «" + a + "»", txt, "Confirmar", motivo ? "Motivo / comentario" : null).then(function (m) { EV.transicion(ev, a, typeof m === "string" ? m : ""); });
  },
  transicion: function (ev, a, com, silencioso) {
    loading(true, "Actualizando estado…");
    return API.call("transicion", { id: ev.id, a: a, comentario: com, version: ev.version }).then(function (r) {
      loading(false);
      if (!r.ok) { toast(r.msg || r.error, "bad"); if (r.error === "conflicto") App.recargar(); else EV.render(ev.id, EV.tab); return null; }
      App.reemplazar("eventos", r.registro); toast(silencioso ? "El evento pasó a «" + a + "» automáticamente" : "Estado: " + a, "ok");
      App.nav(); EV.ir(a === "Aprobado" ? "formatos" : EV.tab); return r.registro;
    });
  }
};
EV.tabs = {};

/* ---------- RESUMEN ---------- */
EV.tabs.resumen = function (ev) {
  var ed = EV.puede(ev), pg = L.pasos(ev), sug = L.tipoSugerido(ev), h = "";
  if (sug) h += '<div class="callout warn mb"><span>🤖</span><div><b>Sugerencia de clasificación: ' + esc(CAT.tipoTxt(sug.c)) + '</b>El evento ' + esc(sug.motivo) + '. ' + (ed ? '<button class="btn sm mt" onclick="EV.aplicarTipo(\'' + sug.c + '\')">Reclasificar</button>' : "") + '</div></div>';
  if (ev.estado === "Observado") { var ob = (ev.flujo || []).filter(function (f) { return f.a === "Observado"; }).pop(); if (ob) h += '<div class="callout bad mb"><span>↩</span><div><b>Observación de ' + esc(ob.por) + ' (' + fFechaHora(ob.ts) + ')</b>' + esc(ob.comentario) + '</div></div>'; }
  h += '<div class="row2 mb"><div class="card"><h3>Ruta del procedimiento <small>SST-PR-03</small></h3><div class="steps">' + pg.pasos.map(function (p) {
      var next = pg.siguiente && pg.siguiente.k === p.k;
      return '<div class="step ' + (p.na ? "na" : p.ok ? "done" : next ? "next" : "") + '"><span class="ic">' + (p.na ? "–" : p.ok ? "✓" : "") + '</span><span>' + esc(p.t) + (p.na ? ' <span class="small muted">(no aplica)</span>' : "") + '</span>' +
        (!p.ok && !p.na ? '<a class="btn sm go ' + (next ? "primary" : "") + '" href="#/evento/' + ev.id + '/' + p.tab + '">' + (next ? "Hacer ahora" : "Ir") + '</a>' : "") + '</div>';
    }).join("") + '</div></div><div><div class="card"><h3>Plazos</h3>' + L.plazos(ev).map(function (p) {
      var c = { ok: ["ok","Cumplido"], tarde: ["warn","Fuera de plazo"], vencido: ["bad","Vencido"], pronto: ["warn","Por vencer"], pendiente: ["info","En plazo"], na: ["","—"] }[p.st];
      return '<div class="plazo"><span>' + esc(p.t) + '<br><span class="small muted">Límite ' + fFechaHora(p.lim.toISOString()) + (p.hecho ? " · hecho " + fFechaHora(p.hecho.toISOString()) : "") + '</span></span><span class="pill ' + c[0] + '">' + c[1] + '</span></div>';
    }).join("") + '</div><div class="card"><h3>Registro</h3><div class="plazo"><span>Reportado por</span><b>' + esc(ev.reportado_nombre || "") + '</b></div><div class="plazo"><span>Fecha de registro</span><span>' + fFechaHora(ev.creado) + '</span></div>' +
    '<div class="plazo"><span>Última modificación</span><span>' + esc(ev.actualizado_por || "") + ' · ' + fFechaHora(ev.actualizado) + '</span></div>' + (ev.aprobado_por ? '<div class="plazo"><span>Aprobado por</span><b>' + esc(ev.aprobado_por) + '</b></div>' : "") + '</div></div></div>';
  h += '<div class="card" id="evDatos"><h3>Datos del evento ' + (ed ? "" : '<small>solo lectura</small>') + '</h3>' + formHTML(camposEvento(), ev, !ed) + '<hr class="sep"><div class="sub-h">Trabajador afectado</div>' + formHTML(CAMPOS_TRAB, ev, !ed, "g3") +
    '<hr class="sep"><div class="sub-h">Lesión y pérdidas</div>' + formHTML(CAMPOS_LESION, ev, !ed) + (ed ? '<div class="flex mt end"><button class="btn primary" onclick="EV.guardarDatos()">Guardar datos</button></div>' : "") + '</div>';
  $("#tabBody").innerHTML = h;
};
EV.guardarDatos = function () {
  var ev = clone(L.evento(EV.id)), el = $("#evDatos");
  if (!leerForm(el, camposEvento(), ev)) return; leerForm(el, CAMPOS_TRAB, ev); leerForm(el, CAMPOS_LESION, ev);
  var t = CAT.get("tipoEvento", ev.tipo); ev.tipo_txt = t.t; ev.mtpe24 = t.mtpe24; EV.guardarEv(ev);
};
EV.aplicarTipo = function (c) { var ev = clone(L.evento(EV.id)), t = CAT.get("tipoEvento", c); ev.tipo = c; ev.tipo_txt = t.t; ev.mtpe24 = t.mtpe24; EV.guardarEv(ev, "Evento reclasificado como " + t.t); };

/* ---------- RESPUESTA INICIAL ---------- */
var CAMPOS_MTPE = [{ k: "fecha", label: "Fecha de notificación", type: "date" }, { k: "hora", label: "Hora", type: "time" }, { k: "nro", label: "N.° de constancia" }, { k: "por", label: "Notificado por" }, { k: "notifica", label: "Quién notificó", type: "select", opts: ["Empleador","Centro médico"] }];
EV.tabs.respuesta = function (ev) {
  var ed = EV.puede(ev), t = CAT.get("tipoEvento", ev.tipo), m = ev.mtpe || {};
  var h = '<div class="card" id="inmBox"><h3>Acciones inmediatas <small>§6.2 — control de la situación</small></h3>' + formHTML(CAMPOS_INMEDIATAS, ev.inmediatas || {}, !ed, "g3") + '</div>';
  h += '<div class="card" id="mtpeBox"><h3>Notificación al MTPE <small>Ley 29783 art. 82 · Anexo 01</small></h3>' +
    (t && t.mtpe24 ? '<div class="callout ' + (m.fecha ? "ok" : "bad") + ' mb"><span>' + (m.fecha ? "✔" : "⚠️") + '</span><div><b>' + (m.fecha ? "Notificado" : "Obligatoria dentro de 24 horas") + '</b>' + esc(t.t) + ': el empleador notifica con el Formulario N.° 1 del portal del MTPE. ' + (/Contratista/.test(ev.regimen || "") ? "Aunque sea personal contratista, notifica Optical Networks (§6.7)." : "") + '</div></div>'
      : '<div class="callout info mb"><span>ℹ️</span><div>Para este tipo de evento el empleador no notifica en 24 h. En accidentes no mortales notifica el centro médico (Formulario N.° 2) hasta el último día hábil del mes siguiente.</div></div>') +
    formHTML(CAMPOS_MTPE, m, !ed, "g3") + '<div class="mt">' + adjuntosHTML("eventos", { id: ev.id, adjuntos: (ev.adjuntos || []).filter(function (a) { return a.categoria === "Constancia MTPE"; }) }, L.es("ADMIN","SST")) + '</div>' +
    (ed ? '<label class="drop mt">📎 Adjuntar constancia de notificación<input type="file" hidden accept="image/*,application/pdf" onchange="subirArchivos(\'eventos\',\'' + ev.id + '\',this.files,\'Constancia MTPE\').then(function(){EV.render(EV.id,EV.tab)})"></label>' : "") + '</div>';
  h += '<div class="card"><h3>Equipo investigador <small>§6.3.1 — cada integrante firmará el análisis SCAT y el registro de investigación</small></h3>' +
    ((ev.equipo || []).length ? '<div class="team">' + ev.equipo.map(function (x, i) { return '<div class="tm"><div class="av">' + iniciales(x.nombre) + '</div><div><b>' + esc(x.nombre) + '</b><span>' + esc(x.rol) + (x.dni ? " · " + esc(x.dni) : "") + '</span></div>' + (ed ? '<button class="btn sm ghost" title="Quitar" onclick="EV.quitarEquipo(' + i + ')">✕</button>' : "") + '</div>'; }).join("") + '</div>' : '<div class="muted small mb">Aún no se conforma el equipo.</div>') +
    (ed ? '<div class="grid g4 mt" id="eqBox"><div class="f span2"><label>Integrante (usuario del sistema)</label><select id="eqU"><option value="">— o registra un externo —</option>' + S.equipo.map(function (u) { return '<option value="' + u.dni + '">' + esc(u.nombre) + ' · ' + esc((CAT.roles[u.rol] || {}).t || u.rol) + '</option>'; }).join("") + '</select></div>' +
      '<div class="f"><label>…o persona externa</label><input id="eqExt" placeholder="Nombre"></div><div class="f"><label>DNI (externo)</label><input id="eqDni" inputmode="numeric"></div><div class="f span2"><label>Rol en la investigación</label><select id="eqRol">' + ["Líder de investigación","Representante del empleador","Representante del Comité SST","Supervisor SST","Jefe inmediato","Trabajador afectado","Testigo","Especialista / persona competente"].map(function (x) { return "<option>" + x + "</option>"; }).join("") + '</select></div>' +
      '<div class="f span2" style="align-self:end"><button class="btn block" onclick="EV.agregarEquipo()">＋ Agregar al equipo</button></div></div>' : "") + '</div>';
  if (ed) h += '<div class="sticky-actions"><button class="btn primary lg" onclick="EV.guardarRespuesta()">Guardar respuesta inicial</button></div>';
  $("#tabBody").innerHTML = h;
};
EV.leerRespuesta = function (ev) { ev.inmediatas = leerForm($("#inmBox"), CAMPOS_INMEDIATAS, ev.inmediatas || {}); ev.mtpe = leerForm($("#mtpeBox"), CAMPOS_MTPE, ev.mtpe || {}); return ev; };
EV.guardarRespuesta = function () { EV.guardarEv(EV.leerRespuesta(clone(L.evento(EV.id)))); };
EV.agregarEquipo = function () {
  var ev = EV.leerRespuesta(clone(L.evento(EV.id))), dni = $("#eqU").value, ext = $("#eqExt").value.trim(), rol = $("#eqRol").value, u = S.equipo.filter(function (x) { return x.dni === dni; })[0];
  if (!u && !ext) return toast("Elige un usuario o escribe un nombre", "bad");
  ev.equipo = ev.equipo || []; ev.equipo.push(u ? { dni: u.dni, nombre: u.nombre, rol: rol, cargo: u.cargo } : { dni: $("#eqDni").value.replace(/\D/g, ""), nombre: ext.toUpperCase(), rol: rol });
  EV.guardarEv(ev, "Integrante agregado");
};
EV.quitarEquipo = function (i) { var ev = clone(L.evento(EV.id)); ev.equipo.splice(i, 1); EV.guardarEv(ev, "Integrante retirado"); };

/* ---------- EVIDENCIAS Y DECLARACIONES ---------- */
EV.tabs.evidencias = function (ev) {
  var ed = EV.puede(ev) || (L.enMiArea(ev) && ["Cerrado","Anulado"].indexOf(ev.estado) < 0 && L.rol() !== "COMITE"), evd = ev.evidencias || {}, porCat = {};
  (ev.adjuntos || []).forEach(function (a) { if (!a.doc) (porCat[a.categoria] = porCat[a.categoria] || []).push(a); });
  var h = '<div class="card"><h3>Declaraciones <small>F-SST-PR-03-04 · el accidentado y los testigos firman con selfie en «Formatos y firmas»</small></h3>' +
    ((ev.declaraciones || []).length ? ev.declaraciones.map(function (d, i) {
      return '<div class="decl"><div class="flex between"><div><span class="pill info">' + esc(d.tipo) + '</span> <b>' + esc(d.nombre) + '</b> <span class="small muted">' + esc(d.cargo || "") + ' · ' + fFecha(d.fecha) + '</span></div>' +
        '<span class="flex">' + (ed ? '<button class="btn sm" onclick="EV.declaracion(' + i + ')">Editar</button>' : "") + '<a class="btn sm primary" href="#/evento/' + ev.id + '/formatos">🖊 Firmar</a></span></div><p>' + esc(d.relato) + '</p></div>';
    }).join("") : '<div class="callout warn">Registra primero la declaración del trabajador accidentado.</div>') + (ed ? '<button class="btn primary mt" onclick="EV.declaracion()">＋ Registrar declaración</button>' : "") + '</div>';
  h += '<div class="card"><h3>Lista de evidencias <small>Anexo 02 · las 4P</small></h3><div class="ev4">' + CAT.evidencias.map(function (g) {
    return '<div class="ev4-g"><div class="ev4-h">' + g.ic + ' ' + g.g + '</div>' + g.items.map(function (it) {
      var n = (porCat[it] || []).length, on = evd[it] || n;
      return '<div class="ev4-i ' + (on ? "on" : "") + '"><label><input type="checkbox" ' + (on ? "checked" : "") + (ed ? "" : " disabled") + ' onchange="EV.marcarEvid(\'' + esc(it) + '\',this.checked)"> ' + esc(it) + '</label>' +
        (n ? '<span class="pill ok xs">📎 ' + n + '</span>' : "") + (ed ? '<label class="btn sm ghost" title="Adjuntar">📎<input type="file" multiple hidden onchange="subirArchivos(\'eventos\',\'' + ev.id + '\',this.files,\'' + esc(it) + '\').then(function(){EV.render(EV.id,EV.tab)})"></label>' : "") + '</div>';
    }).join("") + '</div>';
  }).join("") + '</div></div>';
  h += '<div class="card"><h3>Adjuntos del expediente <small>' + (ev.adjuntos || []).length + '</small></h3>' + adjuntosHTML("eventos", ev, L.es("ADMIN","SST")) +
    (ed ? '<label class="drop mt">📎 Adjuntar otros documentos<input type="file" multiple hidden onchange="subirArchivos(\'eventos\',\'' + ev.id + '\',this.files,\'Otros\').then(function(){EV.render(EV.id,EV.tab)})"></label>' : "") + '</div>';
  $("#tabBody").innerHTML = h;
};
EV.marcarEvid = function (it, v) { var ev = clone(L.evento(EV.id)); ev.evidencias = ev.evidencias || {}; ev.evidencias[it] = v; App.guardar("eventos", ev).then(function (r) { if (r) EV.render(r.id, EV.tab); }); };
EV.declaracion = function (i) {
  var ev = L.evento(EV.id), d = i != null ? clone(ev.declaraciones[i]) : { fecha: hoyISO(), tipo: (ev.declaraciones || []).some(function (x) { return x.tipo === "Trabajador lesionado"; }) ? "Testigo" : "Trabajador lesionado" };
  if (i == null && d.tipo === "Trabajador lesionado") { d.nombre = ev.trabajador; d.dni = ev.dni_trab; d.cargo = ev.puesto; }
  var C = [{ k: "tipo", label: "Declarante", type: "select", req: true, opts: ["Trabajador lesionado","Testigo","Supervisor / jefe inmediato","Otro"] }, { k: "fecha", label: "Fecha de la entrevista", type: "date", req: true },
    { k: "nombre", label: "Nombre", req: true }, { k: "dni", label: "DNI", req: true }, { k: "cargo", label: "Cargo / empresa", col: "span2" },
    { k: "relato", label: "Relato de los hechos (en sus palabras)", type: "textarea", req: true, col: "span2" },
    { k: "preguntas", label: "Preguntas y respuestas de la entrevista", type: "textarea", col: "span2", ph: "¿Qué tarea realizabas? ¿Qué EPP usabas? ¿Tenías PETS/ATS? ¿Qué crees que lo causó?…" }];
  modal({ title: i != null ? "Editar declaración" : "Registrar declaración (F-SST-PR-03-04)", wide: true, body: '<div id="dcF">' + formHTML(C, d) + '</div><p class="small muted mt">Después de guardar, el declarante firma con selfie en «Formatos y firmas».</p>', ok: "Guardar y pasar a firma",
    onOk: function (m) {
      var o = leerForm($("#dcF", m), C, d); if (!o) return false; o.dni = String(o.dni).replace(/\D/g, "");
      var e2 = clone(L.evento(EV.id)); e2.declaraciones = e2.declaraciones || []; if (i != null) e2.declaraciones[i] = o; else e2.declaraciones.push(o);
      return EV.guardarEv(e2, "Declaración registrada", "formatos").then(function (r) { if (!r) return false; });
    } });
};

/* ---------- ANÁLISIS SCAT ---------- */
EV.sugerencias = function (s) {
  var u = function (a) { var m = {}; a.forEach(function (x) { m[x] = 1; }); return Object.keys(m); }, A = [], K = [], FP = [], FT = [], N = [];
  (s.contactos || []).forEach(function (c) { var x = CAT.get("contactos", c); if (x) { A = A.concat(x.a); K = K.concat(x.k); } });
  (s.actos || []).concat(s.condiciones || []).forEach(function (c) { var x = CAT.get("actos", c) || CAT.get("condiciones", c); if (x) { FP = FP.concat(x.fp); FT = FT.concat(x.ft); } });
  (s.fp || []).concat(s.ft || []).forEach(function (c) { var x = CAT.get("fPersonales", c) || CAT.get("fTrabajo", c); if (x) N = N.concat(x.nac); });
  return { actos: u(A), condiciones: u(K), fp: u(FP), ft: u(FT), nac: u(N) };
};
EV.pscSugerido = function (s, nac) {
  var bas = (s.fp || []).concat(s.ft || []).filter(function (c) { var x = CAT.get("fPersonales", c) || CAT.get("fTrabajo", c); return x && x.nac.indexOf(nac) >= 0; });
  if (bas.some(function (c) { return ["FT6","FT2","FT3","FT5"].indexOf(c) >= 0; })) return "S";
  if (bas.some(function (c) { return ["FP7","FT1","FT8"].indexOf(c) >= 0; })) return "C";
  return "P";
};
EV.cadenaHTML = function (s) {
  var col = function (t, items) { return '<div class="cc-col"><div class="cc-h">' + t + '</div>' + (items.length ? items.map(function (x) { return '<div class="cc-i" title="' + esc(x[1]) + '"><b>' + x[0] + '</b> ' + esc(recorta(x[1], 42)) + '</div>'; }).join("") : '<div class="cc-e">—</div>') + '</div>'; };
  var m = function (l, a) { return (a || []).map(function (c) { return [c, CAT.txt(l, c)]; }); };
  return '<div class="cc">' + col("Contacto", m("contactos", s.contactos)) + '<div class="cc-a">→</div>' + col("Causas inmediatas", m("actos", s.actos).concat(m("condiciones", s.condiciones))) + '<div class="cc-a">→</div>' +
    col("Causas básicas", m("fPersonales", s.fp).concat(m("fTrabajo", s.ft))) + '<div class="cc-a">→</div>' + col("Falta de control", (s.nac || []).map(function (n) { return [n.c + " " + n.psc, CAT.txt("nac", n.c)]; })) + '</div>';
};
EV.tabs.scat = function (ev) {
  if (!EV.draft) EV.draft = clone(ev.scat || {});
  var s = EV.draft, ed = EV.puede(ev); ["contactos","actos","condiciones","fp","ft","nac"].forEach(function (k) { s[k] = s[k] || []; });
  var sg = EV.sugerencias(s), rg = CAT.riesgo(s.gravedad, s.probabilidad, s.exposicion);
  function radios(lista, k) {
    return '<div class="radio-cards">' + CAT[lista].map(function (o) { return '<label class="rc ' + (s[k] === o.c ? "on" : "") + '"><input type="radio" name="r_' + k + '" ' + (s[k] === o.c ? "checked" : "") + (ed ? "" : " disabled") + ' onchange="EV.draft.' + k + '=\'' + o.c + '\';EV.re()"><b>' + esc(o.t) + '</b><span>' + esc(o.d || "") + '</span></label>'; }).join("") + '</div>';
  }
  function checks(lista, k, sugs) {
    var items = CAT[lista].slice().sort(function (a, b) { return (sugs.indexOf(b.c) >= 0) - (sugs.indexOf(a.c) >= 0); });
    return '<div class="opts">' + items.map(function (o) {
      var on = s[k].indexOf(o.c) >= 0, sug = sugs.indexOf(o.c) >= 0;
      return '<label class="chk ' + (on ? "on " : "") + (sug ? "sug" : "") + '"><input type="checkbox" ' + (on ? "checked" : "") + (ed ? "" : " disabled") + ' onchange="EV.toggle(\'' + k + '\',\'' + o.c + '\',this.checked)"><span><span class="code">' + o.c + '</span>' + esc(o.t) + (sug && !on ? '<span class="star">★ sugerido</span>' : "") + '</span></label>';
    }).join("") + '</div>';
  }
  function head(n, t, sub, extra, ok) { return '<header><span class="n ' + (ok ? "ok" : "") + '">' + (ok ? "✓" : n) + '</span><div><b>' + t + '</b><small>' + sub + '</small></div><span class="spacer"></span>' + (extra || "") + '</header>'; }
  function btnSug(k, arr, lbl) { var f = arr.filter(function (c) { return s[k].indexOf(c) < 0; }); return ed && f.length ? '<button class="btn sm" onclick="EV.aplicarSug(\'' + k + '\')">🤖 +' + f.length + ' ' + lbl + '</button>' : ""; }
  var h = '<div class="card mb"><h3>Cadena causal <small>se arma mientras marcas</small><span class="spacer"></span>' + (rg ? '<span class="pill ' + rg.color + '">Riesgo ' + rg.nivel + ' · plazo base ' + rg.plazo + ' días</span>' : "") + '</h3>' + EV.cadenaHTML(s) +
    (ed && s.contactos.length ? '<div class="flex mt"><button class="btn" onclick="EV.cadena()">⚡ Completar la cadena con sugerencias</button><span class="small muted">Genera un borrador que el equipo revisa y ajusta.</span></div>' : "") + '</div>';
  h += '<div class="scat-block">' + head(1, "Evaluación del potencial de pérdida", "Si no se controla: ¿qué tan grave pudo ser, qué tan probable es que se repita y cuánta gente se expone?", "", s.gravedad && s.probabilidad) +
    '<div class="body"><div class="sub-h">Gravedad potencial</div>' + radios("gravedad", "gravedad") + '<div class="sub-h mt">Probabilidad de ocurrencia</div>' + radios("probabilidad", "probabilidad") + '<div class="sub-h mt">Frecuencia de exposición</div>' + radios("exposicion", "exposicion") + '</div></div>';
  h += '<div class="scat-block">' + head(2, "Tipo de contacto", "Tipo de evento o energía con la que hubo contacto (puede ser más de uno)", "", s.contactos.length) + '<div class="body">' + checks("contactos", "contactos", []) + '</div></div>';
  h += '<div class="scat-block">' + head(3, "Causas inmediatas", "Actos y condiciones subestándar · ★ = relacionado con el contacto elegido", btnSug("actos", sg.actos, "actos") + btnSug("condiciones", sg.condiciones, "condiciones"), s.actos.length + s.condiciones.length) +
    '<div class="body"><div class="sub-h">Actos subestándar</div>' + checks("actos", "actos", sg.actos) + '<div class="sub-h mt">Condiciones subestándar</div>' + checks("condiciones", "condiciones", sg.condiciones) + '</div></div>';
  h += '<div class="scat-block">' + head(4, "Causas básicas", "Factores personales y del trabajo · ★ = explica las causas inmediatas marcadas", btnSug("fp", sg.fp, "personales") + btnSug("ft", sg.ft, "del trabajo"), s.fp.length + s.ft.length) +
    '<div class="body"><div class="sub-h">Factores personales</div>' + checks("fPersonales", "fp", sg.fp) + '<div class="sub-h mt">Factores del trabajo</div>' + checks("fTrabajo", "ft", sg.ft) + '</div></div>';
  var nacSel = s.nac.map(function (n) { return n.c; });
  h += '<div class="scat-block">' + head(5, "Falta de control · NAC", "Elemento del programa que falló: P programa inadecuado · S estándar inadecuado · C incumplimiento", ed && sg.nac.filter(function (c) { return nacSel.indexOf(c) < 0; }).length ? '<button class="btn sm" onclick="EV.aplicarSug(\'nac\')">🤖 Marcar sugeridos</button>' : "", s.nac.length) +
    '<div class="body"><div class="opts one">' + CAT.nac.slice().sort(function (a, b) { return (sg.nac.indexOf(b.c) >= 0) - (sg.nac.indexOf(a.c) >= 0); }).map(function (o) {
      var sel = s.nac.filter(function (n) { return n.c === o.c; })[0], sug = sg.nac.indexOf(o.c) >= 0;
      return '<div class="nac-row"><label class="chk ' + (sel ? "on " : "") + (sug ? "sug" : "") + '"><input type="checkbox" ' + (sel ? "checked" : "") + (ed ? "" : " disabled") + ' onchange="EV.toggleNac(\'' + o.c + '\',this.checked)"><span><span class="code">' + o.c + '</span>' + esc(o.t) + (sug && !sel ? '<span class="star">★ sugerido</span>' : "") + '</span></label>' +
        (sel ? '<div class="psc">' + CAT.psc.map(function (p) { return '<button class="' + (sel.psc === p.c ? "on" : "") + '" ' + (ed ? "" : "disabled") + ' title="' + esc(p.t + ": " + p.d) + '" onclick="EV.setPsc(\'' + o.c + '\',\'' + p.c + '\')">' + p.c + '</button>'; }).join("") + '</div>' : '<span></span>') + '</div>';
    }).join("") + '</div></div></div>';
  h += '<div class="card" id="crBox"><h3>Conclusión del análisis</h3><div class="f"><label>Causa raíz / síntesis</label><textarea id="scCR" ' + (ed ? "" : "disabled") + ' placeholder="Resumen de la cadena causal">' + esc(s.causa_raiz || "") + '</textarea></div>' +
    (ed ? '<div class="flex mt"><button class="btn sm" onclick="EV.redactarCR()">🤖 Redactar a partir del análisis</button></div>' : "") + '</div>';
  if (ed) h += '<div class="sticky-actions"><button class="btn lg" onclick="EV.draft=null;EV.render(EV.id,\'scat\')">Descartar</button><button class="btn primary lg" onclick="EV.guardarScat()">💾 Guardar análisis SCAT</button></div>';
  var y = window.scrollY; $("#tabBody").innerHTML = h; window.scrollTo(0, y);
};
EV.re = function () { if ($("#scCR")) EV.draft.causa_raiz = $("#scCR").value; EV.tabs.scat(L.evento(EV.id)); };
EV.toggle = function (k, c, on) { var a = EV.draft[k], i = a.indexOf(c); if (on && i < 0) a.push(c); if (!on && i >= 0) a.splice(i, 1); EV.re(); };
EV.toggleNac = function (c, on) { EV.draft.nac = EV.draft.nac.filter(function (n) { return n.c !== c; }); if (on) EV.draft.nac.push({ c: c, psc: EV.pscSugerido(EV.draft, c) }); EV.re(); };
EV.setPsc = function (c, p) { EV.draft.nac.forEach(function (n) { if (n.c === c) n.psc = p; }); EV.re(); };
EV.aplicarSug = function (k) {
  var sg = EV.sugerencias(EV.draft);
  if (k === "nac") sg.nac.forEach(function (c) { if (!EV.draft.nac.some(function (n) { return n.c === c; })) EV.draft.nac.push({ c: c, psc: EV.pscSugerido(EV.draft, c) }); });
  else sg[k].forEach(function (c) { if (EV.draft[k].indexOf(c) < 0) EV.draft[k].push(c); });
  EV.re();
};
EV.cadena = function () {
  var s = EV.draft;
  ["actos","condiciones"].forEach(function (k) { if (!s[k].length) s[k] = EV.sugerencias(s)[k].slice(0, 2); });
  ["fp","ft"].forEach(function (k) { if (!s[k].length) s[k] = EV.sugerencias(s)[k].slice(0, 2); });
  if (!s.nac.length) EV.sugerencias(s).nac.slice(0, 3).forEach(function (c) { s.nac.push({ c: c, psc: EV.pscSugerido(s, c) }); });
  if (!s.causa_raiz) s.causa_raiz = EV.textoCR(s);
  toast("Borrador generado: revisa y desmarca lo que no aplique", "ok"); EV.tabs.scat(L.evento(EV.id));
};
EV.textoCR = function (s) {
  var lc = function (t) { return t.charAt(0).toLowerCase() + t.slice(1); }, j = function (l, a) { return (a || []).map(function (c) { return lc(CAT.txt(l, c)); }).join("; "); };
  var ci = [j("actos", s.actos) ? "el acto: " + j("actos", s.actos) : "", j("condiciones", s.condiciones) ? "la condición: " + j("condiciones", s.condiciones) : ""].filter(String).join("; y ");
  var cb = [j("fPersonales", s.fp), j("fTrabajo", s.ft)].filter(String).join("; ");
  var nac = (s.nac || []).map(function (n) { return lc(CAT.txt("nac", n.c)) + " (" + ({ P: "programa inadecuado", S: "estándar inadecuado", C: "incumplimiento del estándar" }[n.psc] || "") + ")"; }).join("; ");
  return "El evento (" + j("contactos", s.contactos) + ") se produjo por " + (ci || "—") + ". Estas causas inmediatas se originaron en: " + (cb || "—") + ". Falta de control en: " + (nac || "—") + ".";
};
EV.redactarCR = function () { EV.draft.causa_raiz = EV.textoCR(EV.draft); EV.tabs.scat(L.evento(EV.id)); };
EV.guardarScat = function () {
  var ev = clone(L.evento(EV.id)); EV.draft.causa_raiz = $("#scCR").value; ev.scat = clone(EV.draft);
  var r = CAT.riesgo(ev.scat.gravedad, ev.scat.probabilidad, ev.scat.exposicion); ev.riesgo = r ? r.nivel : ""; EV.draft = null;
  var completo = ev.scat.gravedad && ev.scat.probabilidad && ev.scat.contactos.length && (ev.scat.actos.length + ev.scat.condiciones.length) && (ev.scat.fp.length + ev.scat.ft.length) && ev.scat.nac.length;
  var sinPlan = !L.accionesDe(ev.id).length;
  EV.guardarEv(ev, "Análisis SCAT guardado", completo && sinPlan ? "acciones" : null).then(function (x) {
    if (x && completo && sinPlan) setTimeout(function () { PLAN.abrir(); }, 350);          // automatización: propone el plan de inmediato
  });
};

/* ============================================================
   MOTOR DEL PLAN DE ACCIÓN — cada ítem marcado → una medida
   ============================================================ */
var PLAN = {
  ctx: function (ev) {
    return { tarea: ev.tarea ? "«" + ev.tarea + "»" : "la tarea involucrada", lugar: ev.lugar || ev.ambito || "el lugar del evento", division: CAT.divDe(ev.area) || "la división", area: CAT.areaDe(ev.area), id: ev.id };
  },
  llenar: function (t, c) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return c[k] || m; }); },
  usuarioPara: function (tag, ev) {
    var eq = S.equipo, en = function (u) { var s = String(u.area || "").split(";"); return s.indexOf("*") >= 0 || s.indexOf(ev.area) >= 0 || s.indexOf(CAT.areaDe(ev.area)) >= 0; };
    var porRol = function (r) { return eq.filter(function (u) { return u.rol === r && en(u); }).sort(function (a, b) { return (String(b.area).indexOf(ev.area) >= 0) - (String(a.area).indexOf(ev.area) >= 0); })[0] || eq.filter(function (u) { return u.rol === r; })[0]; };
    var lider = (ev.equipo || []).filter(function (q) { return /Líder|SST/.test(q.rol) && q.dni; })[0];
    var sst = (lider && eq.filter(function (u) { return u.dni === lider.dni; })[0]) || porRol("SST") || porRol("ADMIN");
    if (tag === "JEFE") return porRol("JEFE") || sst;
    if (tag === "MEDICO") return porRol("MEDICO") || sst;
    return sst;
  },
  generar: function (ev) {
    var s = ev.scat || {}, rg = CAT.riesgo(s.gravedad, s.probabilidad, s.exposicion) || { plazo: 30, n: 2, nivel: "Medio" }, c = PLAN.ctx(ev), out = [], vistos = {};
    var ya = {}; L.accionesDe(ev.id).forEach(function (a) { if (a.causa) ya[a.causa] = 1; });
    var plazo = { Inmediata: Math.min(7, Math.ceil(rg.plazo / 2)), Correctiva: Math.round(rg.plazo * 0.67), Preventiva: rg.plazo };
    function add(cod, lista, tipo, texto, resp, extraDias, prio) {
      if (ya[cod]) return; var d = PLAN.llenar(texto, c), k = d.toLowerCase(); if (vistos[k]) return; vistos[k] = 1;
      var u = PLAN.usuarioPara(resp, ev);
      out.push({ causa: cod, nivel: CAT.nivelDe(cod), tipo: tipo, descripcion: d, resp: resp, area_resp: CAT.respTag[resp] || "", responsable_dni: u ? u.dni : "", fecha: addDias(hoyISO(), plazo[tipo] + (extraDias || 0)), prio: rg.n * 10 + (prio || 0) });
    }
    (s.condiciones || []).forEach(function (k) { var x = CAT.get("condiciones", k); add(k, "condiciones", "Inmediata", x.acc, x.resp, 0, 9); });
    (s.contactos || []).forEach(function (k) { var x = CAT.get("contactos", k); add(k, "contactos", "Correctiva", x.acc, x.resp, 0, 8); });
    (s.actos || []).forEach(function (k) { var x = CAT.get("actos", k); add(k, "actos", "Correctiva", x.acc, x.resp, 0, 7); });
    (s.fp || []).forEach(function (k) { var x = CAT.get("fPersonales", k); add(k, "fPersonales", "Correctiva", x.acc, x.resp, 0, 6); });
    (s.ft || []).forEach(function (k) { var x = CAT.get("fTrabajo", k); add(k, "fTrabajo", "Preventiva", x.acc, x.resp, 0, 5); });
    (s.nac || []).forEach(function (n) { var x = CAT.get("nac", n.c); add(n.c, "nac", "Preventiva", x[n.psc || "C"], x.resp, n.psc === "P" ? 15 : 0, 4); });
    if (!ya.N05 && !(s.nac || []).some(function (n) { return n.c === "N05"; })) add("N05", "nac", "Preventiva", CAT.get("nac", "N05").C, "SST", -Math.round(rg.plazo / 2), 1);
    return { lista: out.sort(function (a, b) { return b.prio - a.prio; }), riesgo: rg };
  },
  abrir: function () {
    var ev = L.evento(EV.id), g = PLAN.generar(ev), P = g.lista;
    if (!P.length) return toast("Todas las causas ya tienen medidas en el plan", "ok");
    var opts = S.equipo.map(function (u) { return '<option value="' + u.dni + '">' + esc(u.nombre) + '</option>'; }).join("");
    var grupos = {}; P.forEach(function (p, i) { p.i = i; (grupos[p.nivel] = grupos[p.nivel] || []).push(p); });
    var orden = ["Condición subestándar","Tipo de contacto","Acto subestándar","Factor personal","Factor del trabajo","Falta de control (NAC)"];
    modal({ title: "Plan de acción propuesto · decisión final", wide: true,
      body: '<div class="plan-sum"><div><b>' + P.length + '</b><span>medidas</span></div><div><b>' + P.filter(function (p) { return p.tipo === "Inmediata"; }).length + '</b><span>inmediatas</span></div><div><b>' + P.filter(function (p) { return p.tipo === "Correctiva"; }).length + '</b><span>correctivas</span></div><div><b>' + P.filter(function (p) { return p.tipo === "Preventiva"; }).length + '</b><span>preventivas</span></div><div class="' + g.riesgo.color + '"><b>' + g.riesgo.nivel + '</b><span>riesgo · ' + g.riesgo.plazo + ' d</span></div></div>' +
        '<div class="callout info mb"><span>🤖</span><div>Una medida por cada ítem marcado en el SCAT, con el texto adaptado a la tarea, al lugar y a la división. Las condiciones son <b>inmediatas</b>; los actos y factores personales, <b>correctivas</b>; los factores del trabajo y los NAC (según P/S/C), <b>preventivas</b>. Ajusta lo necesario y aprueba.</div></div>' +
        orden.filter(function (n) { return grupos[n]; }).map(function (n) {
          return '<div class="sub-h mt">' + n + '</div>' + grupos[n].map(function (p) {
            return '<div class="prop" data-i="' + p.i + '"><label class="prop-h"><input type="checkbox" checked data-sel> <span class="pill xs ' + ({ Inmediata: "bad", Correctiva: "warn", Preventiva: "info" }[p.tipo]) + '">' + p.tipo + '</span> <b>' + p.causa + '</b> <span class="small muted">' + esc(recorta(CAT.txt(CAT.listaDe(p.causa), p.causa), 70)) + '</span></label>' +
              '<textarea data-d>' + esc(p.descripcion) + '</textarea><div class="grid g3"><div class="f"><label>Responsable <span class="small muted">(' + esc(p.area_resp) + ')</span></label><select data-r>' + opts + '</select></div>' +
              '<div class="f"><label>Tipo</label><select data-t>' + CAT.accTipo.map(function (t) { return '<option' + (t === p.tipo ? " selected" : "") + '>' + t + '</option>'; }).join("") + '</select></div><div class="f"><label>Fecha compromiso</label><input type="date" data-f value="' + p.fecha + '"></div></div></div>';
          }).join("");
        }).join(""),
      ok: "✔ Aprobar y crear plan",
      onOpen: function (m) { $$(".prop", m).forEach(function (c) { var p = P[+c.dataset.i]; $("[data-r]", c).value = p.responsable_dni; $("[data-sel]", c).addEventListener("change", function () { c.classList.toggle("off", !this.checked); }); }); },
      onOk: function (m) {
        var sel = $$(".prop", m).filter(function (c) { return $("[data-sel]", c).checked; });
        if (!sel.length) { toast("Selecciona al menos una medida", "bad"); return false; }
        loading(true, "Creando y asignando " + sel.length + " acciones…");
        return sel.reduce(function (pr, c) {
          return pr.then(function () {
            var p = P[+c.dataset.i], dni = $("[data-r]", c).value, u = S.equipo.filter(function (x) { return x.dni === dni; })[0];
            return API.call("guardar", { entidad: "acciones", registro: { evento_id: ev.id, descripcion: $("[data-d]", c).value, tipo: $("[data-t]", c).value, causa: p.causa, responsable_dni: dni, responsable: u ? u.nombre : "", area_resp: p.area_resp,
              fecha_compromiso: $("[data-f]", c).value, estado: "Pendiente", avance: 0, eficacia: "En verificación", origen: "SCAT", verificacion: "Evidencia adjunta y verificación en campo del Supervisor SST" } })
              .then(function (r) { if (r.ok) App.reemplazar("acciones", r.registro); else toast(r.msg || r.error, "bad"); });
          });
        }, Promise.resolve()).then(function () {
          loading(false); toast(sel.length + " acciones creadas y asignadas. Firma el plan en «Formatos y firmas».", "ok"); App.nav(); EV.ir("acciones");
        });
      } });
  }
};

/* ---------- PLAN DE ACCIÓN del evento ---------- */
EV.tabs.acciones = function (ev) {
  var acc = L.accionesDe(ev.id), r = L.rol(), puede = ev.estado !== "Anulado" && ev.estado !== "Cerrado" && r !== "COMITE" && r !== "REPORTANTE" && (L.es("ADMIN","SST") || L.enMiArea(ev));
  var s = ev.scat || {}, tieneScat = (s.nac || []).length || (s.condiciones || []).length || (s.actos || []).length;
  var cub = {}; acc.forEach(function (a) { if (a.causa) cub[a.causa] = 1; });
  var causas = (s.contactos || []).concat(s.actos || [], s.condiciones || [], s.fp || [], s.ft || [], (s.nac || []).map(function (n) { return n.c; }));
  var sin = causas.filter(function (c) { if (cub[c]) return false; var b = CAT.get("fPersonales", c) || CAT.get("fTrabajo", c); return !(b && b.nac.some(function (n) { return cub[n]; })); });
  var cerr = acc.filter(function (a) { return a.estado === "Cerrada"; }).length;
  var h = '<div class="kpis">' + kpi("Medidas", acc.length, cerr + " cerradas", "") + kpi("Vencidas", acc.filter(L.accVencida).length, "fuera de plazo", acc.some(L.accVencida) ? "bad" : "ok") +
    kpi("Cobertura causal", causas.length ? Math.round((causas.length - sin.length) / causas.length * 100) : 0, "% de causas con medida", sin.length ? "warn" : "ok") + kpi("Eficacia verificada", acc.filter(function (a) { return a.eficacia === "Sí"; }).length, "de " + acc.length, "ok") + '</div>';
  h += '<div class="flex mb">' + (puede ? (tieneScat ? '<button class="btn primary" onclick="PLAN.abrir()">🤖 ' + (acc.length ? "Completar plan desde el SCAT" : "Generar plan desde el SCAT") + '</button>' : '<span class="small muted">Completa el análisis SCAT para que el sistema proponga el plan.</span>') +
    '<button class="btn" onclick="ACC.editar(null,\'' + ev.id + '\')">＋ Medida manual</button>' : "") + (acc.length ? '<a class="btn" href="#/evento/' + ev.id + '/formatos">🖊 Firmar plan (PDF)</a>' : "") + '</div>';
  if (causas.length) h += '<div class="callout ' + (sin.length ? "warn" : "ok") + ' mb"><span>' + (sin.length ? "⚠️" : "✔") + '</span><div><b>' + (sin.length ? sin.length + " causa(s) aún sin medida vinculada" : "Todas las causas identificadas tienen medida") + '</b>' +
    (sin.length ? "§6.3.7: definir acciones para todas las causas inmediatas y básicas. Pendientes: " + sin.map(function (c) { return "<b>" + c + "</b> " + esc(recorta(CAT.txt(CAT.listaDe(c), c), 40)); }).join(" · ") : "") + '</div></div>';
  $("#tabBody").innerHTML = h + '<div id="acEv"></div>'; UI.contar($("#tabBody"));
  pintarAcc(acc, $("#acEv"));
};

/* ---------- DESCANSOS del evento ---------- */
EV.tabs.descansos = function (ev) {
  var dm = L.dmDe(ev.id), dp = L.diasPerdidos(ev.id), sug = L.tipoSugerido(ev), puede = L.es("ADMIN","SST","MEDICO","JEFE") && ev.estado !== "Anulado";
  var h = '<div class="kpis">' + kpi("Días perdidos", dp, "suma de descansos por accidente de trabajo", dp ? "warn" : "ok") + kpi("Certificados", dm.length, dm.filter(function (d) { return (d.adjuntos || []).length; }).length + " con sustento", "") +
    kpi("Validados", dm.filter(function (d) { return d.estado === "Validado"; }).length, dm.filter(function (d) { return d.estado === "Pendiente"; }).length + " por validar", "purple") + '</div>';
  if (sug) h += '<div class="callout warn mb"><span>🤖</span><div><b>Clasificación sugerida: ' + esc(CAT.tipoTxt(sug.c)) + '</b>El evento ' + esc(sug.motivo) + '. ' + (EV.puede(ev) ? '<button class="btn sm mt" onclick="EV.aplicarTipo(\'' + sug.c + '\')">Reclasificar</button>' : "") + '</div></div>';
  h += puede ? '<div class="flex mb"><button class="btn primary" onclick="DM.editar(null,\'' + ev.id + '\')">＋ Registrar descanso médico</button><span class="small muted">Los días se suman solos al índice de severidad del mes del evento.</span></div>' : "";
  $("#tabBody").innerHTML = h + '<div id="dmEv"></div>'; UI.contar($("#tabBody")); pintarDM(dm, $("#dmEv"));
};

/* ---------- INFORME Y DIFUSIÓN ---------- */
EV.tabs.informe = function (ev) {
  var ed = EV.puede(ev) || (L.es("ADMIN","SST","JEFE") && ev.estado === "Aprobado" && L.enMiArea(ev)), inv = ev.investigacion || {}, dif = ev.difusion || {};
  var C = [{ k: "consecuencias", label: "Consecuencias potenciales del evento", type: "textarea" }, { k: "impacto", label: "Impacto en las operaciones / pérdidas / reclamos", type: "textarea" },
    { k: "conclusiones", label: "Conclusiones", type: "textarea", col: "span2" }, { k: "recomendaciones", label: "Recomendaciones y sugerencias", type: "textarea", col: "span2" }];
  var CD = [{ k: "fecha", label: "Fecha de difusión", type: "date" }, { k: "medio", label: "Medio", type: "select", opts: ["Charla de 5 minutos","Correo electrónico","Periódico mural","Intranet","Reunión de Comité SST"] }, { k: "participantes", label: "N.° de participantes", type: "number", min: 0 }, { k: "detalle", label: "Detalle", col: "span3" }];
  $("#tabBody").innerHTML = '<div class="card" id="infBox"><h3>Redacción del informe <small>§6.3.8 · alimenta el F-SST-PR-03-01</small></h3>' + formHTML(C, inv, !ed) +
    (ed ? '<div class="flex mt"><button class="btn sm" onclick="EV.redactarInforme()">🤖 Redactar borrador desde el análisis</button><span class="spacer"></span><button class="btn primary" onclick="EV.guardarInforme()">Guardar</button></div>' : "") + '</div>' +
    '<div class="card" id="difBox"><h3>Difusión de lecciones aprendidas <small>§6.5</small></h3>' + formHTML(CD, dif, !ed, "g3") + '<div class="mt">' + adjuntosHTML("eventos", { id: ev.id, adjuntos: (ev.adjuntos || []).filter(function (a) { return a.categoria === "Registro de difusión"; }) }, L.es("ADMIN","SST")) + '</div>' +
    (ed ? '<div class="flex mt"><label class="btn">📎 Registro de difusión<input type="file" hidden multiple onchange="subirArchivos(\'eventos\',\'' + ev.id + '\',this.files,\'Registro de difusión\').then(function(){EV.render(EV.id,EV.tab)})"></label><span class="spacer"></span><button class="btn primary" onclick="EV.guardarDifusion()">Guardar difusión</button></div>' : "") + '</div>' +
    '<div class="callout info"><span>🖊</span><div><b>El registro de investigación en PDF se genera en «Formatos y firmas»</b>con los datos de esta pestaña, el análisis SCAT, el plan de acción y las firmas con selfie. <a href="#/evento/' + ev.id + '/formatos">Ir a formatos →</a></div></div>';
};
EV.redactarInforme = function () {
  var ev = L.evento(EV.id), s = ev.scat || {}, rg = CAT.riesgo(s.gravedad, s.probabilidad, s.exposicion), acc = L.accionesDe(ev.id), box = $("#infBox");
  var set = function (k, v) { var el = $('[data-k="' + k + '"]', box); if (el && !el.value) el.value = v; };
  set("consecuencias", "Gravedad potencial: " + CAT.txt("gravedad", s.gravedad) + "; probabilidad de repetición: " + CAT.txt("probabilidad", s.probabilidad) + (rg ? " (riesgo " + rg.nivel.toLowerCase() + ")" : "") + ". De no controlarse, el mismo tipo de contacto (" + (s.contactos || []).map(function (c) { return CAT.txt("contactos", c).toLowerCase(); }).join(", ") + ") podría causar lesiones de mayor severidad.");
  set("impacto", (L.diasPerdidos(ev.id) ? L.diasPerdidos(ev.id) + " día(s) perdido(s) por descanso médico. " : "") + (ev.danos_materiales ? "Daños materiales: " + ev.danos_materiales + ". " : "") + (ev.perdida_estimada ? "Pérdida estimada S/ " + ev.perdida_estimada + "." : ""));
  set("conclusiones", s.causa_raiz || EV.textoCR(s));
  set("recomendaciones", acc.length ? acc.map(function (a) { return "• " + a.descripcion + " (" + (a.responsable || "") + ", " + fFecha(a.fecha_compromiso) + ")"; }).join("\n") : "Generar el plan de acción desde el análisis SCAT.");
  toast("Borrador redactado: revísalo y guarda", "ok");
};
EV.guardarInforme = function () { var ev = clone(L.evento(EV.id)); ev.investigacion = leerForm($("#infBox"), [{ k: "consecuencias" }, { k: "impacto" }, { k: "conclusiones" }, { k: "recomendaciones" }], ev.investigacion || {}); EV.guardarEv(ev, "Informe guardado"); };
EV.guardarDifusion = function () { var ev = clone(L.evento(EV.id)); ev.difusion = leerForm($("#difBox"), [{ k: "fecha" }, { k: "medio" }, { k: "participantes", type: "number" }, { k: "detalle" }], ev.difusion || {}); EV.guardarEv(ev, "Difusión registrada"); };

/* ---------- HISTORIAL ---------- */
EV.tabs.historial = function (ev) {
  $("#tabBody").innerHTML = '<div class="row2"><div><div class="card"><h3>Flujo de la investigación</h3><div class="timeline">' + (ev.flujo || []).slice().reverse().map(function (f) {
    return '<div class="tl"><div class="w">' + fFechaHora(f.ts) + ' · ' + esc(f.por) + ' (' + esc(f.rol || "") + ')</div><div class="x">' + (f.de ? esc(f.de) + " → " : "") + '<b>' + esc(f.a) + '</b>' + (f.comentario ? '<div class="small muted">' + esc(f.comentario) + '</div>' : "") + '</div></div>';
  }).join("") + '</div></div><div class="card"><h3>Comentarios y observaciones <small>equipo, SSOMA y Comité SST</small></h3>' + ((ev.comentarios || []).length ? ev.comentarios.slice().reverse().map(function (c) {
    return '<div class="cmt"><div class="av sm">' + iniciales(c.por) + '</div><div><div class="small muted">' + fFechaHora(c.ts) + ' · <b>' + esc(c.por) + '</b> (' + esc(c.rol) + ')</div><div style="white-space:pre-wrap">' + esc(c.texto) + '</div></div></div>';
  }).join("") : '<div class="muted small">Sin comentarios.</div>') + '<div class="f mt"><textarea id="cmTxt" placeholder="Escribe un comentario u observación…"></textarea></div><div class="flex mt"><button class="btn primary" onclick="EV.comentar()">Comentar</button></div></div></div>' +
    '<div class="card"><h3>Trazabilidad del expediente <small>cada cambio con usuario, fecha y detalle</small></h3><div id="audEv"><div class="empty"><div class="spin" style="margin:auto"></div></div></div></div></div>';
  API.call("auditoria", { entidad_id: ev.id }).then(function (r) {
    var el = $("#audEv"); if (!el) return;
    if (!r.ok) { el.innerHTML = '<div class="muted small">' + esc(r.msg || r.error) + '</div>'; return; }
    el.innerHTML = r.filas.length ? '<div class="timeline">' + r.filas.map(function (f) {
      return '<div class="tl"><div class="w">' + fFechaHora(f.ts) + ' · ' + esc(f.nombre) + ' · <span class="pill info xs">' + esc(f.accion) + '</span> ' + esc(f.entidad_id) + '</div><div class="x small" style="word-break:break-word">' + esc(f.detalle) + '</div></div>';
    }).join("") + '</div>' : '<div class="muted small">Sin registros.</div>';
  });
};
EV.comentar = function () {
  var t = $("#cmTxt").value.trim(); if (!t) return;
  API.call("comentar", { id: EV.id, texto: t }).then(function (r) { if (!r.ok) return toast(r.msg || r.error, "bad"); App.reemplazar("eventos", r.registro); EV.render(EV.id, "historial"); });
};
