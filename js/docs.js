/* ============================================================
   FORMATOS DEL PROCEDIMIENTO → PDF con firmas (selfie + firma)
   Cada formato define: código, título, firmantes (slots),
   contenido (para la huella) y su HTML A4.
   Al completarse las firmas requeridas, el PDF se genera y se
   archiva AUTOMÁTICAMENTE en el expediente (Drive en producción).
   ============================================================ */
var DOCS = {
  cache: {},                                  // firmas por evento: { EV-...: [ ... ] }

  lista: function (ev) {
    var d = [], eq = ev.equipo || [], acc = L.accionesDe(ev.id), aprobado = ["Aprobado","Cerrado"].indexOf(ev.estado) >= 0;
    var slotEq = function (q, i) { return { k: "eq" + i + "_" + (q.dni || q.nombre), rol: q.rol || "Equipo investigador", nombre: q.nombre, dni: q.dni, cargo: q.cargo || q.rol, req: true, fijo: true }; };
    d.push({ key: "REP", codigo: "SST-PR-03 §6.1.1", titulo: "Reporte interno de accidente / incidente", corto: "Reporte inicial", ic: "📝",
      slots: [{ k: "reportante", rol: "Reportante", nombre: ev.reportado_nombre, dni: ev.reportado_por, cargo: (S.equipo.filter(function (u) { return u.dni === ev.reportado_por; })[0] || {}).cargo, req: true },
              { k: "jefe", rol: "Jefe inmediato", nombre: ev.jefe_directo || "", req: false }],
      contenido: function () { return [ev.tipo, ev.fecha, ev.hora, ev.area, ev.lugar, ev.tarea, ev.descripcion, ev.trabajador, ev.dni_trab, ev.parte_cuerpo, ev.naturaleza, ev.inmediatas]; },
      html: DOCS.htmlReporte });
    (ev.declaraciones || []).forEach(function (dc, i) {
      d.push({ key: "DEC" + i, codigo: "F-SST-PR-03-04", titulo: "Declaración de accidente de trabajo", corto: "Declaración · " + dc.nombre, ic: "🗣", sub: dc.tipo + " · " + dc.nombre, dec: dc,
        slots: [{ k: "declarante", rol: dc.tipo === "Trabajador lesionado" ? "Trabajador accidentado (declarante)" : dc.tipo + " (declarante)", nombre: dc.nombre, dni: dc.dni, cargo: dc.cargo, req: true, fijo: true },
                { k: "entrevistador", rol: "Entrevistador (equipo investigador)", nombre: "", req: true, solo_roles: ["ADMIN","SST","JEFE"], yo: true }],
        contenido: function () { return dc; }, html: DOCS.htmlDeclaracion });
    });
    d.push({ key: "SCAT", codigo: "SST-PR-03 · Anexo 03", titulo: "Análisis causal SCAT (triple nivel)", corto: "Análisis SCAT", ic: "🔎",
      disponible: L.pasos(ev).pasos.filter(function (p) { return /^scat/.test(p.k) && !p.ok; }).length === 0, motivo: "Completa los 5 bloques del análisis SCAT.",
      slots: eq.map(slotEq), contenido: function () { return ev.scat; }, html: DOCS.htmlScat });
    d.push({ key: "INV", codigo: "F-SST-PR-03-01", titulo: "Registro de investigación de accidentes e incidentes de trabajo", corto: "Registro de investigación", ic: "📋",
      disponible: acc.length > 0 && (ev.scat || {}).causa_raiz, motivo: "Requiere análisis SCAT con causa raíz y plan de acción.",
      slots: eq.map(slotEq).concat([
        { k: "trabajador", rol: "Trabajador afectado", nombre: ev.trabajador, dni: ev.dni_trab, cargo: ev.puesto, req: false, fijo: true },
        { k: "aprobacion", rol: "Aprobación SSOMA", nombre: ev.aprobado_por || "", req: true, solo_roles: ["ADMIN","SST"], yo: true, requiere: aprobado ? "" : "Disponible cuando la investigación esté aprobada." }]),
      contenido: function () { return [ev.scat, ev.investigacion, ev.descripcion, acc.map(function (a) { return [a.id, a.descripcion, a.responsable, a.fecha_compromiso]; })]; },
      html: DOCS.htmlInvestigacion });
    d.push({ key: "PLAN", codigo: "SST-PR-03 §6.3.7", titulo: "Plan de acción — decisión final sobre las medidas a tomar", corto: "Plan de acción", ic: "✅",
      disponible: acc.length > 0, motivo: "Genera o registra el plan de acción primero.",
      slots: [{ k: "jefe", rol: "Jefe de división", nombre: "", req: true, solo_roles: ["JEFE","ADMIN","SST"], yo: true },
              { k: "ssoma", rol: "Responsable SSOMA", nombre: "", req: true, solo_roles: ["ADMIN","SST"], yo: true },
              { k: "comite", rol: "Comité SST (conformidad)", nombre: "", req: false, solo_roles: ["COMITE","ADMIN"], yo: true }],
      contenido: function () { return acc.map(function (a) { return [a.id, a.descripcion, a.tipo, a.causa, a.responsable_dni, a.fecha_compromiso]; }); },
      html: DOCS.htmlPlan });
    d.forEach(function (x) { if (x.disponible === undefined) x.disponible = true; x.hash = FIRMA.huella(x.contenido()); });
    return d;
  },

  firmasDe: function (evId) { return DOCS.cache[evId] || []; },
  cargarFirmas: function (evId, forzar) {
    if (DOCS.cache[evId] && !forzar) return Promise.resolve(DOCS.cache[evId]);
    return API.call("firmas", { evento_id: evId }).then(function (r) { DOCS.cache[evId] = r.ok ? r.firmas : []; return DOCS.cache[evId]; });
  },
  firmaDe: function (evId, doc, slot) { return DOCS.firmasDe(evId).filter(function (f) { return f.doc === doc && f.slot === slot; })[0] || null; },
  estado: function (ev, d) {
    var req = d.slots.filter(function (s) { return s.req; }), ok = req.filter(function (s) { return DOCS.firmaDe(ev.id, d.key, s.k); }).length;
    var alt = d.slots.some(function (s) { var f = DOCS.firmaDe(ev.id, d.key, s.k); return f && f.hash !== d.hash; });
    return { req: req.length, ok: ok, completo: req.length > 0 && ok === req.length, alterado: alt, pdf: (ev.adjuntos || []).filter(function (a) { return a.doc === d.key; })[0] };
  },

  /* ---- Firmar un slot ---- */
  firmar: function (docKey, slotK) {
    var ev = L.evento(EV.id), d = DOCS.lista(ev).filter(function (x) { return x.key === docKey; })[0];
    var slot = d.slots.filter(function (s) { return s.k === slotK; })[0];
    if (slot.requiere) return toast(slot.requiere, "bad");
    if (slot.solo_roles && slot.solo_roles.indexOf(L.rol()) < 0) return toast("Esta firma corresponde a: " + slot.solo_roles.map(function (r) { return (CAT.roles[r] || {}).t || r; }).join(" / "), "bad");
    var pre = Object.assign({}, slot);
    if (slot.yo) { pre.nombre = S.user.nombre; pre.dni = S.user.dni; pre.cargo = S.user.cargo || (CAT.roles[S.user.rol] || {}).t; pre.fijo = true; }
    FIRMA.capturar(pre, d.titulo + (d.sub ? " · " + d.sub : "")).then(function (x) {
      if (!x) return;
      loading(true);
      API.call("firmar", { evento_id: ev.id, firma: { doc: d.key, doc_titulo: d.codigo + " " + d.corto, slot: slot.k, rol: slot.rol, nombre: x.nombre, dni: x.dni, cargo: x.cargo, hash: d.hash,
        firma: x.firma, selfie: x.selfie, solo_roles: slot.solo_roles, ua: navigator.userAgent } }).then(function (r) {
        loading(false);
        if (!r.ok) return toast(r.msg || r.error, "bad");
        DOCS.cache[ev.id] = DOCS.firmasDe(ev.id).filter(function (f) { return !(f.doc === d.key && f.slot === slot.k); }).concat([r.firma]);
        S.firmasResumen[ev.id] = DOCS.cache[ev.id];
        toast("Firma registrada: " + x.nombre, "ok");
        var st = DOCS.estado(ev, d);
        if (st.completo) { toast("Firmas completas: generando y archivando el PDF…"); DOCS.pdf(d.key, { archivar: true, descargar: false }); }
        else EV.render(ev.id, EV.tab);
      });
    });
  },

  /* ---- Generación de PDF (html2pdf, carga diferida) ---- */
  lib: function () {
    if (window.html2pdf) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      s.onload = res; s.onerror = function () { rej(new Error("No se pudo cargar el generador de PDF (revisa tu conexión).")); }; document.head.appendChild(s);
    });
  },
  pdf: function (docKey, o) {
    o = o || { descargar: true };
    var ev = L.evento(EV.id), d = DOCS.lista(ev).filter(function (x) { return x.key === docKey; })[0], st = DOCS.estado(ev, d);
    loading(true, "Generando PDF…");
    return Promise.all([DOCS.lib(), DOCS.cargarFirmas(ev.id), DOCS.logo()]).then(function () {
      var host = document.createElement("div"); host.className = "pdf-host";
      host.innerHTML = DOCS.pagina(ev, d, st);
      document.body.appendChild(host);
      var nombre = d.codigo.replace(/[^\w-]+/g, "_") + "_" + ev.id + "_" + d.corto.replace(/[^\wÁÉÍÓÚáéíóúñÑ-]+/g, "_") + (st.completo ? "" : "_BORRADOR") + ".pdf";
      var w = html2pdf().set({ margin: [8, 8, 12, 8], filename: nombre, image: { type: "jpeg", quality: 0.94 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: [".fb", "tr", ".avoid"] } }).from(host.firstChild).toPdf();
      return w.get("pdf").then(function (pdf) {
        var n = pdf.internal.getNumberOfPages();
        for (var i = 1; i <= n; i++) {
          pdf.setPage(i); pdf.setFontSize(7); pdf.setTextColor(120);
          pdf.text("Los documentos impresos no son controlados · " + ev.id + " · " + d.codigo + " · huella " + d.hash + " · Página " + i + " de " + n, 105, 291, { align: "center" });
        }
        var blob = pdf.output("blob"); host.remove();
        var tareas = [];
        if (o.descargar) visor(blob, nombre);
        if (o.archivar && st.completo) {
          tareas.push(new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(blob); }).then(function (b64) {
            return API.call("subir", { entidad: "eventos", id: ev.id, nombre: nombre, mime: "application/pdf", b64: b64, categoria: "PDF firmado", doc: d.key });
          }).then(function (r) { if (r.ok) { App.reemplazar("eventos", r.registro); toast("PDF firmado archivado en el expediente", "ok"); } else toast(r.msg || r.error, "bad"); }));
        }
        return Promise.all(tareas);
      });
    }).catch(function (e) { toast(e.message || String(e), "bad"); }).then(function () { loading(false); if (EV.id) EV.render(EV.id, EV.tab); });
  },
  logoURL: null,
  logo: function () {
    if (DOCS.logoURL) return Promise.resolve(DOCS.logoURL);
    return new Promise(function (res) {                       // logo vectorial → PNG a 4x para un PDF nítido
      var im = new Image(); im.onload = function () {
        var c = document.createElement("canvas"); c.width = 832; c.height = 512; c.getContext("2d").drawImage(im, 0, 0, 832, 512);
        DOCS.logoURL = c.toDataURL("image/png"); res(DOCS.logoURL);
      }; im.onerror = function () { res(""); }; im.src = "img/logo.svg";
    });
  },

  /* ---- Página A4 común ---- */
  pagina: function (ev, d, st) {
    var firmas = d.slots.map(function (s) { var f = DOCS.firmaDe(ev.id, d.key, s.k); return (f || s.req) ? FIRMA.bloque(f, s, { pdf: true }) : ""; }).join("");
    return '<div class="doc">' + (st.completo ? "" : '<div class="wm">BORRADOR · FIRMAS PENDIENTES</div>') +
      '<table class="dh"><tr><td class="dl" rowspan="3">' + (DOCS.logoURL ? '<img src="' + DOCS.logoURL + '">' : "<b>ON</b>") + '</td><td class="dt" rowspan="3"><div class="de">' + esc(CONFIG.EMPRESA) + '</div><div class="ds">SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO</div><div class="dn">' + esc(d.titulo.toUpperCase()) + '</div></td>' +
      '<td class="dm">Código: <b>' + esc(d.codigo) + '</b></td></tr><tr><td class="dm">Expediente: <b>' + esc(ev.id) + '</b></td></tr><tr><td class="dm">Emitido: <b>' + FIRMA.fechaHora(new Date().toISOString()) + '</b></td></tr></table>' +
      d.html(ev, d) +
      '<div class="dsec avoid">FIRMAS</div><div class="fbs">' + (firmas || '<p class="dp">Sin firmantes definidos.</p>') + '</div>' +
      '<p class="dfoot">Firma electrónica con registro fotográfico, fecha/hora y huella de contenido ' + esc(d.hash) + '. Generado por el Sistema SCAT · Estado del expediente: ' + esc(ev.estado) + '.</p></div>';
  },

  /* ---- Cuerpos de cada formato ---- */
  kv: function (pares, cols) {
    cols = cols || 2; var h = "<table class='dtb'>", fila = [];
    var celda = function (p, span) { return "<th>" + esc(p[0]) + "</th><td" + (span ? " colspan='" + span + "'" : "") + ">" + (p[1] === "" || p[1] == null ? "—" : p[1]) + "</td>"; };
    var cerrar = function () { if (!fila.length) return; var falta = cols - fila.length; h += "<tr>" + fila.map(function (p, i) { return celda(p, i === fila.length - 1 && falta ? 1 + falta * 2 : 0); }).join("") + "</tr>"; fila = []; };
    pares.forEach(function (p) {
      if (p[2]) { cerrar(); h += "<tr>" + celda(p, cols * 2 - 1) + "</tr>"; return; }      // fila completa
      fila.push(p); if (fila.length === cols) cerrar();
    });
    cerrar();
    return h + "</table>";
  },
  chk: function (b) { return b ? "☒" : "☐"; },
  htmlReporte: function (ev) {
    var i = ev.inmediatas || {}, K = DOCS.kv, e = esc;
    return '<div class="dsec">1. INFORMACIÓN GENERAL DEL EVENTO</div>' + K([["Tipo de evento", e(CAT.tipoTxt(ev.tipo))], ["Fecha y hora", fFecha(ev.fecha) + " " + e(ev.hora || "") + " · turno " + e(ev.turno || "—")], ["Área", e(CAT.areaDe(ev.area))], ["División", e(CAT.divDe(ev.area))], ["Ámbito", e(ev.ambito)], ["Lugar", e(ev.lugar)], ["Tarea", e(ev.tarea), 3]]) +
      '<div class="dsec">2. IDENTIFICACIÓN DEL ACCIDENTADO Y TESTIGOS</div>' + K([["Nombre", e(ev.trabajador)], ["DNI", e(ev.dni_trab)], ["Edad", e(ev.edad)], ["Puesto", e(ev.puesto)], ["Régimen", e(ev.regimen)], ["Empresa", e(ev.empresa || CONFIG.EMPRESA)], ["Antigüedad", e(ev.antiguedad)], ["Experiencia", e(ev.experiencia)], ["Jefe directo", e(ev.jefe_directo)], ["Testigos", e(ev.testigos)]]) +
      '<div class="dsec">3. DESCRIPCIÓN DEL SUCESO</div><p class="dp">' + e(ev.descripcion) + '</p>' +
      '<div class="dsec">4. DESCRIPCIÓN DE LA PÉRDIDA</div>' + K([["Parte del cuerpo", e(ev.parte_cuerpo)], ["Naturaleza de la lesión", e(ev.naturaleza)], ["Detalle de la lesión", e(ev.lesion_desc), 3], ["Daños materiales", e(ev.danos_materiales)], ["Ambiente / operaciones", e(ev.danos_ambientales)]]) +
      '<div class="dsec">5. ACCIONES INMEDIATAS (§6.2)</div><p class="dp">' + DOCS.chk(i.primeros_auxilios) + ' Primeros auxilios &nbsp; ' + DOCS.chk(i.traslado) + ' Traslado a centro médico (' + e(i.centro_medico || "—") + ') &nbsp; ' + DOCS.chk(i.area_asegurada) + ' Área asegurada &nbsp; ' + DOCS.chk(i.evidencia_preservada) + ' Evidencia preservada &nbsp; ' + DOCS.chk(i.plan_emergencia) + ' Plan de emergencia &nbsp; ' + DOCS.chk(i.trabajadora_social) + ' Trabajadora social</p>' + (i.detalle ? '<p class="dp">' + e(i.detalle) + '</p>' : "");
  },
  htmlDeclaracion: function (ev, d) {
    var dc = d.dec, e = esc;
    return DOCS.kv([["Expediente", e(ev.id)], ["Tipo de evento", e(CAT.tipoTxt(ev.tipo))], ["Fecha del evento", fFecha(ev.fecha) + " " + e(ev.hora || "")], ["Lugar", e(ev.lugar || ev.area)]]) +
      '<div class="dsec">DATOS DEL DECLARANTE</div>' + DOCS.kv([["Condición", e(dc.tipo)], ["Fecha de la entrevista", fFecha(dc.fecha)], ["Nombre", e(dc.nombre)], ["DNI", e(dc.dni)], ["Cargo / empresa", e(dc.cargo), 3]]) +
      '<div class="dsec">RELATO DE LOS HECHOS</div><p class="dp" style="min-height:120px">' + e(dc.relato) + '</p>' +
      (dc.preguntas ? '<div class="dsec">PREGUNTAS Y RESPUESTAS</div><p class="dp">' + e(dc.preguntas) + '</p>' : "") +
      '<p class="dp" style="font-size:9px">Declaro que lo manifestado es verdad y corresponde a lo que presencié o viví. Autorizo el uso de esta declaración para fines de la investigación del evento (SST-PR-03 §6.3.5).</p>';
  },
  htmlScat: function (ev) {
    var s = ev.scat || {}, rg = CAT.riesgo(s.gravedad, s.probabilidad, s.exposicion), e = esc;
    var col = function (l, arr) { return (arr || []).length ? arr.map(function (c) { return "<div class='sc-i'><b>" + c + "</b> " + e(CAT.txt(l, c)) + "</div>"; }).join("") : "—"; };
    return '<div class="dsec">1. EVALUACIÓN DEL POTENCIAL DE PÉRDIDA</div>' + DOCS.kv([["Gravedad", e(CAT.txt("gravedad", s.gravedad))], ["Probabilidad", e(CAT.txt("probabilidad", s.probabilidad))], ["Exposición", e(CAT.txt("exposicion", s.exposicion))], ["Nivel de riesgo", rg ? "<b>" + rg.nivel + "</b> · acciones en " + rg.plazo + " días" : "—"]]) +
      '<div class="dsec">ANÁLISIS CAUSAL DE TRIPLE NIVEL</div><table class="dtb sc"><tr><th>2. Tipo de contacto</th><th>3. Causas inmediatas</th><th>4. Causas básicas</th><th>5. Falta de control (NAC)</th></tr><tr>' +
      '<td>' + col("contactos", s.contactos) + '</td><td><i>Actos subestándar</i>' + col("actos", s.actos) + '<i>Condiciones subestándar</i>' + col("condiciones", s.condiciones) + '</td>' +
      '<td><i>Factores personales</i>' + col("fPersonales", s.fp) + '<i>Factores del trabajo</i>' + col("fTrabajo", s.ft) + '</td>' +
      '<td>' + ((s.nac || []).length ? s.nac.map(function (n) { return "<div class='sc-i'><b>" + n.c + "</b> " + e(CAT.txt("nac", n.c)) + " <span class='psc-t'>" + e(n.psc || "") + "</span></div>"; }).join("") : "—") + '</td></tr></table>' +
      '<div class="dsec">CAUSA RAÍZ</div><p class="dp">' + e(s.causa_raiz || "—") + '</p>' +
      '<p class="dp" style="font-size:9px">P: programa inadecuado · S: estándares inadecuados · C: cumplimiento inadecuado del estándar.</p>';
  },
  htmlInvestigacion: function (ev) {
    var inv = ev.investigacion || {}, acc = L.accionesDe(ev.id), dm = L.dmDe(ev.id), e = esc, s = ev.scat || {};
    var lst = function (l, a) { return (a || []).length ? a.map(function (c) { return c + " · " + e(CAT.txt(l, c)); }).join("<br>") : "—"; };
    return '<div class="dsec">1. DATOS DEL EVENTO</div>' + DOCS.kv([["Tipo", e(CAT.tipoTxt(ev.tipo))], ["Fecha / hora", fFecha(ev.fecha) + " " + e(ev.hora || "")], ["Área ▸ División", e(ev.area)], ["Lugar", e(ev.lugar)], ["Descripción", e(ev.descripcion), 3]]) +
      '<div class="dsec">2. LESIONADO Y DESCANSO MÉDICO</div>' + DOCS.kv([["Trabajador", e(ev.trabajador)], ["DNI", e(ev.dni_trab)], ["Puesto", e(ev.puesto)], ["Régimen", e(ev.regimen)], ["Lesión", e((ev.naturaleza || "") + " · " + (ev.parte_cuerpo || ""))], ["Días perdidos", "<b>" + L.diasPerdidos(ev.id) + "</b>"],
        ["Descansos", dm.length ? dm.map(function (d) { return e(d.id) + ": " + fFecha(d.inicio) + "–" + fFecha(d.fin) + " (" + d.dias + " d, " + e(d.documento || "") + ")"; }).join("<br>") : "—", 3]]) +
      '<div class="dsec">3. NOTIFICACIÓN Y METODOLOGÍA</div>' + DOCS.kv([["Notificación MTPE", ev.mtpe && ev.mtpe.fecha ? fFecha(ev.mtpe.fecha) + " " + e(ev.mtpe.hora || "") + " · N.° " + e(ev.mtpe.nro || "—") : (ev.mtpe24 ? "PENDIENTE (24 h)" : "No aplica al empleador")], ["Metodología", "SCAT – Técnica de Análisis Sistemático de Causas (Anexo 03)"]]) +
      '<div class="dsec">4. CAUSAS</div>' + DOCS.kv([["Tipo de contacto", lst("contactos", s.contactos), 3], ["Causas inmediatas", lst("actos", s.actos) + "<br>" + lst("condiciones", s.condiciones), 3], ["Causas básicas", lst("fPersonales", s.fp) + "<br>" + lst("fTrabajo", s.ft), 3], ["Falta de control", (s.nac || []).map(function (n) { return n.c + " · " + e(CAT.txt("nac", n.c)) + " (" + n.psc + ")"; }).join("<br>") || "—", 3], ["Causa raíz", e(s.causa_raiz), 3]]) +
      '<div class="dsec">5. CONCLUSIONES</div>' + DOCS.kv([["Consecuencias potenciales", e(inv.consecuencias), 3], ["Impacto / pérdidas", e(inv.impacto), 3], ["Conclusiones", e(inv.conclusiones), 3], ["Recomendaciones", e(inv.recomendaciones), 3]]) +
      '<div class="dsec">6. ACCIONES CORRECTIVAS Y PREVENTIVAS</div>' + DOCS.tablaAcciones(acc);
  },
  tablaAcciones: function (acc) {
    return '<table class="dtb"><tr><th>Código</th><th>Acción</th><th>Tipo</th><th>Causa</th><th>Responsable</th><th>Plazo</th><th>Estado</th></tr>' +
      (acc.length ? acc.map(function (a) { return "<tr><td>" + esc(a.id) + "</td><td>" + esc(a.descripcion) + "</td><td>" + esc(a.tipo) + "</td><td>" + esc(a.causa || "") + "</td><td>" + esc(a.responsable || "") + "</td><td>" + fFecha(a.fecha_compromiso) + "</td><td>" + esc(L.accVencida(a) ? "Vencida" : a.estado) + "</td></tr>"; }).join("") : "<tr><td colspan='7'>—</td></tr>") + "</table>";
  },
  htmlPlan: function (ev) {
    var acc = L.accionesDe(ev.id), s = ev.scat || {}, rg = CAT.riesgo(s.gravedad, s.probabilidad, s.exposicion), e = esc;
    var porTipo = {}; acc.forEach(function (a) { porTipo[a.tipo] = (porTipo[a.tipo] || 0) + 1; });
    return DOCS.kv([["Evento", e(ev.id) + " · " + e(CAT.tipoTxt(ev.tipo))], ["Área ▸ División", e(ev.area)], ["Nivel de riesgo", rg ? rg.nivel + " (plazo base " + rg.plazo + " días)" : "—"], ["Medidas", Object.keys(porTipo).map(function (k) { return porTipo[k] + " " + k.toLowerCase() + (porTipo[k] > 1 ? "s" : ""); }).join(" · ") || "—"], ["Causa raíz", e(s.causa_raiz), 3]]) +
      '<div class="dsec">DECISIÓN FINAL · MEDIDAS APROBADAS</div>' + DOCS.tablaAcciones(acc) +
      '<p class="dp" style="font-size:9px">Con su firma, los responsables aprueban las medidas, los responsables y los plazos. El Supervisor SST verifica el cumplimiento y la eficacia (§6.3.9).</p>';
  },

  /* ---- Pestaña "Formatos y firmas" del expediente ---- */
  tab: function (ev) {
    $("#tabBody").innerHTML = '<div class="empty"><div class="spin" style="margin:auto"></div></div>';
    DOCS.cargarFirmas(ev.id).then(function () {
      if (EV.tab !== "formatos" || EV.id !== ev.id) return;
      var ds = DOCS.lista(ev), puedeFirmar = ev.estado !== "Anulado";
      var h = '<div class="callout info mb"><span>🖊</span><div><b>Formatos del procedimiento con firma electrónica</b>Cada formato se llena solo con los datos del expediente. Los firmantes registran selfie y firma con el dedo. Al completar las firmas requeridas, el PDF se genera y se archiva automáticamente en el expediente.</div></div>';
      if (!(ev.declaraciones || []).length) h += '<div class="callout warn mb"><span>🗣</span><div><b>Falta la declaración del accidentado (F-SST-PR-03-04)</b>Regístrala en <a href="#/evento/' + ev.id + '/evidencias">Evidencias y declaraciones</a>; aparecerá aquí para que el trabajador la firme con selfie.</div></div>';
      h += '<div class="doc-grid">' + ds.map(function (d) {
        var st = DOCS.estado(ev, d);
        var badge = !d.disponible ? '<span class="pill">No disponible</span>' : st.completo ? (st.alterado ? '<span class="pill warn">Firmado · con cambios</span>' : '<span class="pill ok">✔ Firmado</span>') : '<span class="pill warn">' + st.ok + '/' + st.req + ' firmas</span>';
        return '<div class="doc-card' + (d.disponible ? "" : " off") + '"><div class="doc-top"><span class="doc-ic">' + d.ic + '</span><div><div class="small muted">' + esc(d.codigo) + '</div><b>' + esc(d.corto) + '</b>' + (d.sub ? '<div class="small muted">' + esc(d.sub) + '</div>' : "") + '</div><span class="spacer"></span>' + badge + '</div>' +
          (d.disponible ? '<div class="bar ' + (st.completo ? "ok" : "") + '" style="margin:10px 0"><i style="width:' + (st.req ? Math.round(st.ok / st.req * 100) : 0) + '%"></i></div>' +
            '<div class="fbs">' + d.slots.map(function (s) {
              var f = DOCS.firmaDe(ev.id, d.key, s.k);
              var puede = puedeFirmar && !s.requiere && (!s.solo_roles || s.solo_roles.indexOf(L.rol()) >= 0) && L.rol() !== "REPORTANTE" || (L.rol() === "REPORTANTE" && d.key === "REP" && s.k === "reportante");
              return FIRMA.bloque(f, s, { hashActual: d.hash, boton: puede ? "DOCS.firmar('" + d.key + "','" + s.k + "')" : "" }) + (s.requiere && !f ? '<div class="small muted" style="margin:-4px 0 8px">' + esc(s.requiere) + '</div>' : "");
            }).join("") + '</div>' +
            '<div class="flex mt"><button class="btn sm" onclick="DOCS.pdf(\'' + d.key + '\',{descargar:true})">⬇ ' + (st.completo ? "Descargar PDF" : "Descargar borrador") + '</button>' +
            (st.pdf ? '<button class="btn sm" onclick="verArchivo(\'eventos\',\'' + ev.id + '\',\'' + st.pdf.id + '\')">📄 PDF archivado</button><span class="small muted">' + fFechaHora(st.pdf.ts) + '</span>' : "") +
            (st.completo && (!st.pdf || st.alterado) ? '<button class="btn sm primary" onclick="DOCS.pdf(\'' + d.key + '\',{archivar:true})">Archivar versión firmada</button>' : "") + '</div>'
            : '<p class="small muted">' + esc(d.motivo) + '</p>') + '</div>';
      }).join("") + '</div>';
      $("#tabBody").innerHTML = h;
    });
  }
};
