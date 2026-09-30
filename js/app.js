/* ============================================================
   APP — núcleo, lógica derivada y vistas generales
   ============================================================ */
var S = { user: null, eventos: [], acciones: [], descansos: [], hht: [], equipo: [], firmasResumen: {}, anio: new Date().getFullYear(), filtros: {}, fArea: "" };
var charts = [];

/* ---------- utilidades ---------- */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function p2(n) { return ("0" + n).slice(-2); }
function hoyISO() { var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
function addDias(iso, n) { var d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
function fFecha(iso) { if (!iso) return "—"; var s = String(iso).slice(0, 10).split("-"); return s.length === 3 ? s[2] + "/" + s[1] + "/" + s[0] : iso; }
function fFechaHora(iso) { if (!iso) return "—"; var d = new Date(iso); if (isNaN(d)) return iso; return p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p2(d.getHours()) + ":" + p2(d.getMinutes()); }
function diasHasta(iso) { if (!iso) return null; return Math.round((new Date(String(iso).slice(0, 10) + "T00:00:00") - new Date(hoyISO() + "T00:00:00")) / 864e5); }
function fmt(n, d) { return Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
var MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function iniciales(n) { return String(n || "?").replace(/\(.*\)/, "").trim().split(/\s+/).slice(0, 2).map(function (x) { return x[0]; }).join("").toUpperCase(); }
function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 180); }; }

function toast(msg, tipo) {
  var t = document.createElement("div"); t.className = "toast " + (tipo || "");
  t.innerHTML = '<span>' + (tipo === "bad" ? "⚠" : tipo === "ok" ? "✓" : "•") + '</span><span>' + esc(msg) + '</span>';
  $("#toasts").appendChild(t); setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 250); }, tipo === "bad" ? 6000 : 3200);
}
function loading(on, txt) { $("#loading").hidden = !on; $("#loadTxt").textContent = txt || ""; }

function modal(o) {
  var bg = document.createElement("div"); bg.className = "modal-bg";
  bg.innerHTML = '<div class="modal ' + (o.wide ? "wide" : "") + '" role="dialog" aria-modal="true"><header><h3>' + esc(o.title) + '</h3><button class="btn ghost sm" data-x aria-label="Cerrar">✕</button></header><div class="mbody">' + o.body + '</div>' +
    (o.footer === false ? "" : '<footer>' + (o.footer || "") + '<button class="btn" data-x>' + (o.cancel || "Cancelar") + '</button>' + (o.ok ? '<button class="btn primary" data-ok>' + esc(o.ok) + '</button>' : "") + '</footer>') + '</div>';
  document.body.appendChild(bg); document.body.classList.add("noscroll");
  function close() { bg.remove(); if (!$(".modal-bg")) document.body.classList.remove("noscroll"); }
  $$("[data-x]", bg).forEach(function (b) { b.addEventListener("click", close); });
  bg.addEventListener("mousedown", function (e) { if (e.target === bg && !o.sticky) close(); });
  if (o.ok) $("[data-ok]", bg).onclick = function () {
    var r = o.onOk && o.onOk(bg);
    if (r && r.then) { $("[data-ok]", bg).disabled = true; r.then(function (v) { if (v !== false) close(); else $("[data-ok]", bg).disabled = false; }); }
    else if (r !== false) close();
  };
  if (o.onOpen) o.onOpen(bg);
  return { el: bg, close: close };
}
function confirmar(titulo, texto, okTxt, conMotivo) {
  return new Promise(function (res) {
    modal({ title: titulo, body: '<p style="margin:0 0 10px">' + texto + '</p>' + (conMotivo ? '<div class="f"><label>' + esc(conMotivo) + ' <span class="req">*</span></label><textarea id="cfMot"></textarea></div>' : ""),
      ok: okTxt || "Confirmar", onOk: function (m) { if (conMotivo) { var v = $("#cfMot", m).value.trim(); if (!v) { toast("Indica el motivo.", "bad"); return false; } res(v); } else res(true); } });
  });
}

/* ---------- formularios declarativos ---------- */
function campo(f, val, dis) {
  var id = "fx_" + f.k + "_" + Math.random().toString(36).slice(2, 6), v = val == null ? "" : val, d = (dis || f.dis) ? " disabled" : "", r = f.req ? ' <span class="req">*</span>' : "";
  if (f.type === "check") return '<label class="chk ' + (v ? "on " : "") + (f.col || "") + '"><input type="checkbox" data-k="' + f.k + '"' + (v ? " checked" : "") + d + ' onchange="this.parentNode.classList.toggle(\'on\',this.checked)"> <span>' + esc(f.label) + '</span></label>';
  var inp;
  if (f.type === "select") {
    var grupos = null;
    inp = '<select id="' + id + '" data-k="' + f.k + '"' + d + '><option value="">— Seleccionar —</option>' + (f.opts || []).map(function (o) {
      var ov = typeof o === "object" ? o.v : o, ot = typeof o === "object" ? o.t : o, g = typeof o === "object" ? o.g : null, pre = "";
      if (g && g !== grupos) { pre = (grupos ? "</optgroup>" : "") + '<optgroup label="' + esc(g) + '">'; grupos = g; }
      return pre + '<option value="' + esc(ov) + '"' + (String(ov) === String(v) ? " selected" : "") + '>' + esc(ot) + '</option>';
    }).join("") + (grupos ? "</optgroup>" : "") + '</select>';
  } else if (f.type === "textarea") inp = '<textarea id="' + id + '" data-k="' + f.k + '"' + d + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : "") + '>' + esc(v) + '</textarea>';
  else inp = '<input id="' + id + '" data-k="' + f.k + '" type="' + (f.type || "text") + '" value="' + esc(v) + '"' + d + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : "") + (f.max != null ? ' max="' + f.max + '"' : "") + (f.min != null ? ' min="' + f.min + '"' : "") + (f.type === "number" ? ' inputmode="decimal"' : "") + '>';
  return '<div class="f ' + (f.col || "") + '"><label for="' + id + '">' + esc(f.label) + r + '</label>' + inp + (f.hint ? '<div class="hint">' + f.hint + '</div>' : "") + '</div>';
}
function formHTML(campos, obj, dis, cols) { return '<div class="grid ' + (cols || "g2") + '">' + campos.map(function (f) { return campo(f, obj ? obj[f.k] : "", dis); }).join("") + '</div>'; }
function leerForm(root, campos, obj) {
  var o = obj || {}, falta = [];
  campos.forEach(function (f) {
    var el = $('[data-k="' + f.k + '"]', root); if (!el) return;
    var v = el.type === "checkbox" ? el.checked : el.value.trim();
    if (f.type === "number") v = v === "" ? "" : Number(v);
    if (f.req && (v === "" || v === false)) { falta.push(f.label); el.classList.add("err"); } else el.classList.remove("err");
    o[f.k] = v;
  });
  if (falta.length) { toast("Completa: " + falta.join(", "), "bad"); return null; }
  return o;
}
function optsDivisiones() { return CAT.divisiones.map(function (d) { return { v: d, t: CAT.divDe(d), g: CAT.areaDe(d) }; }); }
function areaChip(c) { return '<span class="achip"><b>' + esc(CAT.areaDe(c)) + '</b>' + (c.indexOf(CAT.SEP) > 0 ? ' ▸ ' + esc(CAT.divDe(c)) : "") + '</span>'; }

/* ---------- archivos ---------- */
function leerArchivo(file) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(file); }); }
function comprimirImagen(file) {
  if (!/^image\/(jpeg|png|webp)/.test(file.type) || file.size < 500000) return leerArchivo(file);
  return leerArchivo(file).then(function (url) {
    return new Promise(function (res) {
      var img = new Image(); img.onload = function () {
        var k = Math.min(1, 1800 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.82));
      }; img.src = url;
    });
  });
}
function subirArchivos(entidad, id, files, categoria) {
  var lista = Array.prototype.slice.call(files || []); if (!lista.length) return Promise.resolve(null);
  loading(true, "Subiendo archivos…"); var ultimo = null;
  return lista.reduce(function (p, f) {
    return p.then(function () {
      if (f.size > 10 * 1024 * 1024) { toast(f.name + ": supera 10 MB", "bad"); return; }
      return comprimirImagen(f).then(function (b64) {
        return API.call("subir", { entidad: entidad, id: id, nombre: f.name, mime: /^image/.test(f.type) ? "image/jpeg" : f.type, b64: b64, categoria: categoria || "General" });
      }).then(function (r) { if (!r) return; if (!r.ok) { toast(r.msg || r.error, "bad"); return; } ultimo = r.registro; App.reemplazar(entidad, r.registro); });
    });
  }, Promise.resolve()).then(function () { loading(false); if (ultimo) toast("Archivo(s) adjuntado(s)", "ok"); return ultimo; });
}
function verArchivo(entidad, id, adjId) {
  loading(true, "Abriendo archivo…");
  API.call("archivo", { entidad: entidad, id: id, adjunto: adjId }).then(function (r) {
    loading(false); if (!r.ok) return toast(r.msg || r.error, "bad");
    var bin = atob(String(r.b64).replace(/^data:[^,]+,/, "")), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    visor(new Blob([arr], { type: r.mime || "application/octet-stream" }), r.nombre);
  });
}
/* Visor integrado: PDF e imágenes se ven dentro de la app; el resto se descarga. */
function visor(blob, nombre) {
  var t = blob.type || "", seguro = ["application/pdf","image/jpeg","image/png","image/webp"].indexOf(t) >= 0;
  if (!seguro) blob = new Blob([blob], { type: "application/octet-stream" });   // nunca se interpreta: solo se descarga
  var url = URL.createObjectURL(blob);
  if (!seguro) { var a = document.createElement("a"); a.href = url; a.download = nombre; a.click(); return; }
  modal({ title: nombre, wide: true, cancel: "Cerrar",
    body: /pdf/.test(t) ? '<iframe class="visor" src="' + url + '" title="' + esc(nombre) + '"></iframe>' : '<img class="visor-img" src="' + url + '" alt="' + esc(nombre) + '">',
    footer: '<a class="btn" href="' + url + '" download="' + esc(nombre) + '">⬇ Descargar</a><a class="btn" href="' + url + '" target="_blank" rel="noopener">Abrir en pestaña nueva</a>' });
}
function adjuntosHTML(entidad, reg, puedeQuitar) {
  var a = reg.adjuntos || [];
  if (!a.length) return '<div class="muted small">Sin adjuntos.</div>';
  return a.map(function (x) {
    var ic = x.doc ? "🖊" : /(jpe?g|png|webp|image)/i.test(x.mime || x.nombre) ? "🖼" : /pdf/i.test(x.mime || x.nombre) ? "📕" : "📄";
    return '<div class="adj"><span class="adj-ic">' + ic + '</span><span class="nm" title="' + esc(x.nombre) + '">' + esc(x.nombre) + '<span class="muted small"> · ' + esc(x.categoria || "") + ' · ' + esc(x.por || "") + ' · ' + fFechaHora(x.ts) + '</span></span>' +
      (x.reservado ? '<span class="pill">🔒 reservado</span>' : '<button class="btn sm" onclick="verArchivo(\'' + entidad + '\',\'' + reg.id + '\',\'' + x.id + '\')">Ver</button>') +
      (puedeQuitar && !x.doc ? '<button class="btn sm danger" onclick="App.quitarAdjunto(\'' + entidad + '\',\'' + reg.id + '\',\'' + x.id + '\')">Retirar</button>' : "") + '</div>';
  }).join("");
}
function csv(nombre, filas) {
  var s = "﻿" + filas.map(function (r) { return r.map(function (c) { c = String(c == null ? "" : c); if (/^[=+\-@\t\r]/.test(c)) c = "'" + c; return /[",;\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(";"); }).join("\r\n");
  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([s], { type: "text/csv;charset=utf-8" })); a.download = nombre; a.click();
}

/* ============================================================
   LÓGICA DE NEGOCIO DERIVADA
   ============================================================ */
var L = {
  rol: function () { return S.user ? S.user.rol : ""; },
  es: function () { return Array.prototype.slice.call(arguments).indexOf(L.rol()) >= 0; },
  evento: function (id) { return S.eventos.filter(function (e) { return e.id === id; })[0]; },
  accionesDe: function (id) { return S.acciones.filter(function (a) { return a.evento_id === id; }); },
  dmDe: function (id) { return S.descansos.filter(function (d) { return d.evento_id === id; }); },
  diasPerdidos: function (id) { return L.dmDe(id).filter(function (d) { return d.origen === "Accidente de trabajo" && d.estado !== "Observado"; }).reduce(function (s, d) { return s + Number(d.dias || 0); }, 0); },
  scope: function () { return String(S.user.area || "").split(/\s*;\s*/).filter(String); },
  enMiArea: function (ev) { var s = L.scope(); return s.indexOf("*") >= 0 || s.indexOf(ev.area) >= 0 || s.indexOf(CAT.areaDe(ev.area)) >= 0 || ev.reportado_por === S.user.dni; },
  enFiltroArea: function (area) { return !S.fArea || area === S.fArea || CAT.areaDe(area) === S.fArea; },
  tipoSugerido: function (ev) {
    if (ev.tipo === "AM" || ev.tipo === "EO") return null;
    var dp = L.diasPerdidos(ev.id);
    if (dp > 1 && ev.tipo !== "AI") return { c: "AI", motivo: "tiene " + dp + " días de descanso médico (retorno posterior al día siguiente)" };
    if (dp <= 1 && ev.tipo === "AI" && L.dmDe(ev.id).length) return { c: "AL", motivo: "el descanso médico es de " + dp + " día(s)" };
    return null;
  },
  accVencida: function (a) { return a.estado !== "Cerrada" && a.fecha_compromiso && diasHasta(a.fecha_compromiso) < 0; },
  estadoPill: function (e) { var m = { "Reportado": "warn", "En investigación": "info", "Observado": "bad", "En revisión": "purple", "Aprobado": "ok", "Cerrado": "ok", "Anulado": "" }; return '<span class="pill ' + (m[e] || "") + '"><span class="dot"></span>' + esc(e) + '</span>'; },
  tipoPill: function (c) { var t = CAT.get("tipoEvento", c) || {}; return '<span class="pill tp" style="--c:' + (t.color || "#64748b") + '">' + esc(t.t || c) + '</span>'; },
  accPill: function (a) { if (L.accVencida(a)) return '<span class="pill bad">Vencida</span>'; return '<span class="pill ' + ({ "Pendiente": "warn", "En proceso": "info", "Cerrada": "ok" }[a.estado] || "") + '">' + esc(a.estado) + '</span>'; },
  plazos: function (ev) {
    var base = new Date(ev.fecha + "T" + (ev.hora || "00:00") + ":00"), fl = ev.flujo || [];
    var ts = function (a) { var x = fl.filter(function (f) { return f.a === a; })[0]; return x ? new Date(x.ts) : null; }, p = [], t = CAT.get("tipoEvento", ev.tipo);
    if (t && t.mtpe24) p.push({ k: "mtpe", t: "Notificación al MTPE (24 h)", lim: new Date(base.getTime() + CONFIG.PLAZO_MTPE_H * 36e5), hecho: ev.mtpe && ev.mtpe.fecha ? new Date(ev.mtpe.fecha + "T" + (ev.mtpe.hora || "00:00") + ":00") : null });
    p.push({ k: "inicio", t: "Inicio de la investigación (" + CONFIG.PLAZO_INICIO_INV_H + " h)", lim: new Date(base.getTime() + CONFIG.PLAZO_INICIO_INV_H * 36e5), hecho: ts("En investigación") });
    p.push({ k: "informe", t: "Informe de investigación (" + CONFIG.PLAZO_INFORME_DIAS + " días)", lim: new Date(base.getTime() + CONFIG.PLAZO_INFORME_DIAS * 864e5), hecho: ts("En revisión") });
    var ahora = new Date();
    p.forEach(function (x) {
      if (ev.estado === "Anulado") x.st = "na";
      else if (x.hecho) x.st = x.hecho <= x.lim ? "ok" : "tarde";
      else x.st = ahora > x.lim ? "vencido" : ((x.lim - ahora) < 12 * 36e5 ? "pronto" : "pendiente");
    });
    return p;
  },
  pasos: function (ev) {
    var s = ev.scat || {}, acc = L.accionesDe(ev.id), t = CAT.get("tipoEvento", ev.tipo), mt = t && t.mtpe24, inm = ev.inmediatas || {};
    var evid = Object.keys(ev.evidencias || {}).filter(function (k) { return ev.evidencias[k]; }).length + (ev.adjuntos || []).filter(function (a) { return !a.doc; }).length;
    var lesion = ["AL","AI","AM","EO"].indexOf(ev.tipo) >= 0 && ev.naturaleza !== "Sin lesión";
    var fr = S.firmasResumen[ev.id] || [], pdfs = (ev.adjuntos || []).filter(function (a) { return a.doc; }).map(function (a) { return a.doc; });
    var p = [
      { k: "reporte", t: "Reporte del evento", ok: !!(ev.fecha && ev.area && ev.descripcion && ev.tipo), tab: "resumen" },
      { k: "inmediatas", t: "Acciones inmediatas registradas", ok: !!(inm.area_asegurada || inm.primeros_auxilios || inm.evidencia_preservada), tab: "respuesta" },
      { k: "mtpe", t: "Notificación al MTPE (24 h)", ok: !!(ev.mtpe && ev.mtpe.fecha), na: !mt, tab: "respuesta" },
      { k: "equipo", t: "Equipo investigador conformado", ok: (ev.equipo || []).length > 0, tab: "respuesta" },
      { k: "evidencias", t: "Evidencias recopiladas (4P)", ok: evid >= 2, tab: "evidencias" },
      { k: "declaraciones", t: "Declaración del accidentado / testigos", ok: (ev.declaraciones || []).length > 0, tab: "evidencias" },
      { k: "dm", t: "Descanso médico con sustento", ok: L.dmDe(ev.id).some(function (d) { return (d.adjuntos || []).length; }), na: !lesion, tab: "descansos" },
      { k: "scat1", t: "SCAT 1 · Potencial de pérdida", ok: !!(s.gravedad && s.probabilidad), tab: "scat" },
      { k: "scat2", t: "SCAT 2 · Tipo de contacto", ok: (s.contactos || []).length > 0, tab: "scat" },
      { k: "scat3", t: "SCAT 3 · Causas inmediatas", ok: (s.actos || []).length + (s.condiciones || []).length > 0, tab: "scat" },
      { k: "scat4", t: "SCAT 4 · Causas básicas", ok: (s.fp || []).length + (s.ft || []).length > 0, tab: "scat" },
      { k: "scat5", t: "SCAT 5 · Falta de control (NAC)", ok: (s.nac || []).length > 0, tab: "scat" },
      { k: "acciones", t: "Plan de acción definido", ok: acc.length > 0, tab: "acciones" },
      { k: "firmas", t: "Formatos firmados (SCAT, registro, plan)", ok: ["SCAT","INV","PLAN"].every(function (d) { return pdfs.indexOf(d) >= 0; }), tab: "formatos" },
      { k: "revision", t: "Investigación revisada y aprobada", ok: ["Aprobado","Cerrado"].indexOf(ev.estado) >= 0, tab: "resumen" },
      { k: "difusion", t: "Difusión de lecciones aprendidas", ok: !!(ev.difusion && ev.difusion.fecha), tab: "informe" },
      { k: "cierre", t: "Acciones cerradas con eficacia verificada", ok: acc.length > 0 && acc.every(function (a) { return a.estado === "Cerrada" && a.eficacia === "Sí"; }), tab: "acciones" }
    ];
    var val = p.filter(function (x) { return !x.na; }), hechos = val.filter(function (x) { return x.ok; }).length;
    return { pasos: p, pct: Math.round(hechos / val.length * 100), siguiente: val.filter(function (x) { return !x.ok; })[0] };
  },
  puedeEditarEv: function (ev) {
    var r = L.rol();
    if (!ev || ["Cerrado","Anulado"].indexOf(ev.estado) >= 0 || r === "COMITE") return false;
    if (r === "ADMIN") return true;
    if (["Aprobado","En revisión"].indexOf(ev.estado) >= 0) return false;
    if (r === "SST") return true;
    if (r === "JEFE") return L.enMiArea(ev);
    if (r === "REPORTANTE") return ev.reportado_por === S.user.dni && ev.estado === "Reportado";
    return false;
  },
  alertas: function () {
    var out = [];
    S.eventos.forEach(function (ev) {
      if (["Anulado","Cerrado"].indexOf(ev.estado) >= 0) return;
      L.plazos(ev).forEach(function (p) {
        if (p.st === "vencido") out.push({ sev: p.k === "mtpe" ? 3 : 2, t: p.t + " vencido", d: ev.id + " · " + CAT.tipoTxt(ev.tipo) + " · " + CAT.divDe(ev.area), href: "#/evento/" + ev.id + "/" + (p.k === "mtpe" ? "respuesta" : "resumen") });
        else if (p.st === "pronto") out.push({ sev: 2, t: p.t + " por vencer", d: ev.id + " · vence " + fFechaHora(p.lim.toISOString()), href: "#/evento/" + ev.id });
      });
      if (ev.estado === "En revisión" && L.es("ADMIN","SST","COMITE")) out.push({ sev: 1, t: "Investigación esperando revisión", d: ev.id + " · " + CAT.divDe(ev.area), href: "#/evento/" + ev.id });
      if (ev.estado === "Observado") out.push({ sev: 2, t: "Investigación observada", d: ev.id + " · requiere corrección", href: "#/evento/" + ev.id + "/historial" });
      var sug = L.tipoSugerido(ev); if (sug) out.push({ sev: 1, t: "Revisar clasificación del evento", d: ev.id + " " + sug.motivo + ": ¿" + CAT.tipoTxt(sug.c) + "?", href: "#/evento/" + ev.id });
    });
    S.acciones.forEach(function (a) {
      if (a.estado === "Cerrada") { if (a.eficacia !== "Sí" && L.es("ADMIN","SST")) out.push({ sev: 1, t: "Verificar eficacia de acción cerrada", d: a.id + " · " + a.descripcion, href: "#/evento/" + a.evento_id + "/acciones" }); return; }
      var d = diasHasta(a.fecha_compromiso); if (d == null) return;
      if (d < 0) out.push({ sev: 3, t: "Acción vencida hace " + (-d) + " día(s)", d: a.id + " · " + a.descripcion + " · " + (a.responsable || ""), href: "#/evento/" + a.evento_id + "/acciones" });
      else if (d <= 5) out.push({ sev: 2, t: "Acción vence en " + d + " día(s)", d: a.id + " · " + a.descripcion + " · " + (a.responsable || ""), href: "#/evento/" + a.evento_id + "/acciones" });
    });
    S.descansos.forEach(function (d) {
      if (d.estado === "Pendiente" && L.es("ADMIN","SST","MEDICO")) out.push({ sev: 2, t: "Descanso médico por validar", d: d.id + " · " + d.trabajador + " · " + d.dias + " días", href: "#/descansos" });
      if (d.estado !== "Observado" && !(d.adjuntos || []).length) out.push({ sev: 2, t: "Descanso médico sin sustento adjunto", d: d.id + " · " + d.trabajador, href: "#/descansos" });
      var f = diasHasta(d.fin); if (f != null && f >= 0 && f <= 2 && d.estado !== "Observado") out.push({ sev: 1, t: "Retorno del trabajador en " + f + " día(s)", d: d.trabajador + " · coordinar alta y reincorporación", href: "#/descansos" });
    });
    return out.sort(function (a, b) { return b.sev - a.sev; });
  },
  indicadores: function (anio) {
    var filas = MESES.map(function (m, i) {
      var h = S.hht.filter(function (x) { return +x.anio === +anio && +x.mes === i + 1; })[0] || {};
      var evs = S.eventos.filter(function (e) { return e.estado !== "Anulado" && L.enFiltroArea(e.area) && String(e.fecha).slice(0, 4) == anio && +String(e.fecha).slice(5, 7) === i + 1; });
      var acc = evs.filter(function (e) { var t = CAT.get("tipoEvento", e.tipo); return t && t.cuentaIF; });
      var dp = evs.reduce(function (s, e) { return s + L.diasPerdidos(e.id); }, 0), hht = Number(h.hht || 0);
      var IF = hht ? acc.length * 1e6 / hht : 0, IS = hht ? dp * 1e6 / hht : 0;
      return { mes: m, n: i + 1, hht: hht, trab: h.trabajadores || "", eventos: evs.length, acc: acc.length, dp: dp, IF: IF, IS: IS, IA: IF * IS / 1000,
        leves: evs.filter(function (e) { return e.tipo === "AL"; }).length, inc: evs.filter(function (e) { return ["INC","IP","CA"].indexOf(e.tipo) >= 0; }).length };
    });
    var T = filas.reduce(function (t, f) { t.hht += f.hht; t.acc += f.acc; t.dp += f.dp; t.eventos += f.eventos; t.leves += f.leves; t.inc += f.inc; return t; }, { hht: 0, acc: 0, dp: 0, eventos: 0, leves: 0, inc: 0 });
    T.IF = T.hht ? T.acc * 1e6 / T.hht : 0; T.IS = T.hht ? T.dp * 1e6 / T.hht : 0; T.IA = T.IF * T.IS / 1000;
    return { filas: filas, total: T };
  }
};

/* ============================================================
   NAVEGACIÓN
   ============================================================ */
var ICON = {
  tablero: '<path d="M3 13h8V3H3zM13 21h8v-8h-8zM3 21h8v-6H3zM13 3v8h8V3z"/>',
  eventos: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  reportar: '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>',
  investigaciones: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  descansos: '<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM12 14v4M10 16h4"/>',
  acciones: '<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  indicadores: '<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
  alertas: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  auditoria: '<path d="M12 8v4l3 3M3.05 11a9 9 0 1 1 .5 4M3 4v7h7"/>',
  usuarios: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  cuenta: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
};
function svg(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>'; }

var App = {
  init: function () {
    $("#verBadge").innerHTML = "SCAT " + APP_VERSION + (CONFIG.ENDPOINT_URL ? "" : ' <span class="demo-badge">DEMO</span>');
    if (!CONFIG.ENDPOINT_URL) {
      $("#demoHint").hidden = false;
      $("#demoUsers").innerHTML = [["10000001","Administrador SSOMA"],["10000002","Supervisor SST"],["10000003","Médico ocupacional"],["10000004","Jefe de división (Planta Ext.)"],["10000005","Comité SST"],["10000006","Reportante"]]
        .map(function (u) { return '<button type="button" class="demo-u" onclick="document.getElementById(\'lgDni\').value=\'' + u[0] + '\';document.getElementById(\'lgClave\').value=\'demo1234\';App.login()"><b>' + u[0] + '</b><span>' + u[1] + '</span></button>'; }).join("") +
        '<button type="button" class="demo-reset" onclick="MOCK.reset();location.reload()">↺ Restablecer datos de ejemplo</button>';
    }
    $("#loginForm").onsubmit = function (e) { e.preventDefault(); App.login(); };
    window.addEventListener("hashchange", App.route);
    API.areasPanel().then(function (fuente) { S.fuenteAreas = fuente; });
    var t = null; try { t = sessionStorage.getItem("scat_tk"); } catch (e) {}
    if (t) { API.token = t; App.cargar().then(function (ok) { if (!ok) App.mostrarLogin(); }); } else App.mostrarLogin();
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});
  },
  mostrarLogin: function () { $("#login").hidden = false; $("#app").hidden = true; setTimeout(function () { $("#lgDni").focus(); }, 50); },
  login: function () {
    var dni = $("#lgDni").value.trim(), clave = $("#lgClave").value;
    $("#lgErr").textContent = ""; loading(true, "Verificando…");
    API.call("login", { dni: dni, clave: clave }).then(function (r) {
      loading(false);
      if (!r.ok) { $("#lgErr").textContent = r.msg || "No se pudo ingresar."; $(".login-card").classList.add("shake"); setTimeout(function () { $(".login-card").classList.remove("shake"); }, 400); return; }
      API.token = r.token; try { sessionStorage.setItem("scat_tk", r.token); } catch (e) {}
      $("#lgClave").value = "";
      App._dniLogin = String(dni).replace(/\D/g, "");
      if (r.debe_cambiar) { $("#login").hidden = false; App.cambiarClave(true, App.cargar); }      // primero la clave personal
      else App.cargar();
    });
  },
  logout: function () { API.call("logout"); API.token = null; try { sessionStorage.removeItem("scat_tk"); } catch (e) {} S.user = null; DOCS.cache = {}; location.hash = ""; App.mostrarLogin(); },
  cargar: function () {
    loading(true, "Cargando información…");
    return API.call("bootstrap").then(function (r) {
      loading(false);
      if (!r.ok) {
        if (r.error === "sesion_invalida") { try { sessionStorage.removeItem("scat_tk"); } catch (e) {} App.mostrarLogin(); }
        else if (r.error === "debe_cambiar") App.cambiarClave(true, App.cargar);
        else toast(r.msg || r.error, "bad");
        return false;
      }
      S.user = r.user; S.eventos = r.eventos; S.acciones = r.acciones; S.descansos = r.descansos; S.hht = r.hht; S.equipo = r.equipo; S.firmasResumen = r.firmasResumen || {};
      S.eventos.sort(function (a, b) { return (b.fecha + b.hora) < (a.fecha + a.hora) ? -1 : 1; });
      $("#login").hidden = true; $("#app").hidden = false;
      $("#uNom").textContent = S.user.nombre; $("#uRol").textContent = (CAT.roles[S.user.rol] || {}).t || S.user.rol; $("#uAv").textContent = iniciales(S.user.nombre);
      App.route(); return true;
    });
  },
  recargar: function () { DOCS.cache = {}; return App.cargar(); },
  reemplazar: function (ent, reg) { var arr = S[ent], i = arr.findIndex(function (x) { return x.id === reg.id; }); if (i >= 0) arr[i] = reg; else arr.unshift(reg); },
  guardar: function (ent, reg) {
    loading(true, "Guardando…");
    return API.call("guardar", { entidad: ent, registro: reg }).then(function (r) {
      loading(false);
      if (!r.ok) { toast(r.msg || r.error, "bad"); if (r.error === "conflicto") App.recargar(); if (r.error === "sesion_invalida") App.logout(); return null; }
      App.reemplazar(ent, r.registro); return r.registro;
    });
  },
  quitarAdjunto: function (ent, id, adj) {
    confirmar("Retirar adjunto", "El archivo dejará de mostrarse, pero se conserva en Drive y queda registrado en la trazabilidad.", "Retirar").then(function () {
      API.call("quitar_adjunto", { entidad: ent, id: id, adjunto: adj }).then(function (r) { if (!r.ok) return toast(r.msg || r.error, "bad"); App.reemplazar(ent, r.registro); App.route(); });
    });
  },
  nav: function () {
    var al = L.alertas(), r = L.rol();
    var abiertas = S.eventos.filter(function (e) { return ["Reportado","En investigación","Observado","En revisión"].indexOf(e.estado) >= 0; }).length;
    var mias = S.acciones.filter(function (a) { return a.responsable_dni === S.user.dni && a.estado !== "Cerrada"; }).length;
    var items = [
      { g: "General" }, { k: "tablero", t: "Tablero" }, { k: "alertas", t: "Alertas y plazos", c: al.filter(function (a) { return a.sev >= 2; }).length },
      { g: "Gestión de eventos" }, { k: "reportar", t: "Reportar evento", hide: r === "COMITE", hi: 1 }, { k: "eventos", t: "Registro de eventos" },
      { k: "investigaciones", t: "Investigaciones", c: abiertas, cb: 1 }, { k: "descansos", t: "Descansos médicos", hide: r === "REPORTANTE" },
      { k: "acciones", t: "Plan de acción", c: mias, cb: 1 }, { k: "indicadores", t: "Indicadores IF · IS · IA", hide: r === "REPORTANTE" },
      { g: "Control" }, { k: "auditoria", t: "Trazabilidad", hide: !L.es("ADMIN","SST") }, { k: "usuarios", t: "Usuarios y accesos", hide: r !== "ADMIN" }, { k: "cuenta", t: "Mi cuenta" }
    ];
    var cur = (location.hash.split("/")[1] || "tablero"); if (cur === "evento") cur = "eventos";
    $("#nav").innerHTML = items.filter(function (x) { return !x.hide; }).map(function (x) {
      if (x.g) return '<div class="nav-g">' + x.g + '</div>';
      return '<a class="nav-item ' + (cur === x.k ? "active " : "") + (x.hi ? "hi" : "") + '" href="#/' + x.k + '">' + svg(x.k) + '<span>' + x.t + '</span>' + (x.c ? '<span class="cnt ' + (x.cb ? "b" : "") + '">' + x.c + '</span>' : "") + '</a>';
    }).join("");
  },
  titulo: function (t, s, acciones) { $("#pgTitle").textContent = t; $("#pgSub").textContent = s || ""; $("#pgActions").innerHTML = acciones || ""; document.title = t + " · SCAT Optical Networks"; },
  route: function () {
    if (!S.user) return;
    charts.forEach(function (c) { c.destroy(); }); charts = [];
    $("#side").classList.remove("open"); $("#scrim").hidden = true;
    var p = location.hash.replace(/^#\//, "").split("/"), v = p[0] || "tablero";
    App.nav();
    var vw = $("#view"); vw.classList.remove("fade"); void vw.offsetWidth; vw.classList.add("fade");
    if (v === "evento") return EV.render(decodeURIComponent(p[1]), p[2] || "resumen");
    (Views[v] || Views.tablero)(p);
    window.scrollTo(0, 0);
  },
  cambiarClave: function (forzado, alTerminar) {
    var campos = [{ k: "actual", label: forzado ? "Contraseña actual (tu DNI / CE)" : "Contraseña actual", type: "password", req: true },
      { k: "nueva", label: "Nueva contraseña", type: "password", req: true, hint: "Mínimo 8 caracteres, con letras y números. No puede contener tu DNI / CE." },
      { k: "rep", label: "Repetir nueva contraseña", type: "password", req: true }];
    var m = modal({ title: forzado ? "Crea tu contraseña personal" : "Cambiar contraseña", sticky: forzado, cancel: forzado ? "Salir" : "Cancelar",
      body: (forzado ? '<div class="callout info mb"><span>🔐</span><div><b>Primer ingreso</b>Tu contraseña inicial es tu número de documento. Por seguridad, crea una contraseña personal para continuar.</div></div>' : "") + formHTML(campos, {}, false, "g1"),
      ok: "Guardar", onOk: function (bg) {
        var o = leerForm(bg, campos); if (!o) return false;
        if (o.nueva !== o.rep) { toast("Las contraseñas no coinciden", "bad"); return false; }
        if (S.user && o.nueva.indexOf(S.user.dni) >= 0 || (App._dniLogin && o.nueva.indexOf(App._dniLogin) >= 0)) { toast("La nueva contraseña no puede contener tu DNI / CE.", "bad"); return false; }
        return API.call("cambiar_clave", { actual: o.actual, nueva: o.nueva }).then(function (r) {
          if (!r.ok) { toast(r.msg || r.error, "bad"); return false; }
          toast("Contraseña actualizada", "ok"); if (alTerminar) setTimeout(alTerminar, 50);
        });
      } });
    if (forzado) $$("[data-x]", m.el).forEach(function (b) { b.addEventListener("click", function () { App.logout(); }); });
  }
};

/* ============================================================
   COMPONENTES VISUALES (SVG ligeros, sin librerías)
   ============================================================ */
var UI = {
  spark: function (arr, color) {
    var w = 120, h = 34, mx = Math.max.apply(null, arr.concat([1])), n = arr.length;
    var pts = arr.map(function (v, i) { return [i * (w / (n - 1 || 1)), h - 3 - (v / mx) * (h - 8)]; });
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var gid = "g" + Math.random().toString(36).slice(2, 7);
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".35"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + d + ' L' + w + ' ' + h + ' L0 ' + h + 'Z" fill="url(#' + gid + ')"/><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  },
  gauge: function (val, meta, label, dec) {
    var max = Math.max(meta * 2, val * 1.15, 1), pct = Math.min(val / max, 1), ang = Math.PI * (1 - pct);
    var x = 60 + 48 * Math.cos(ang), y = 60 - 48 * Math.sin(ang), ok = val <= meta;
    var mAng = Math.PI * (1 - meta / max), mx = 60 + 48 * Math.cos(mAng), my = 60 - 48 * Math.sin(mAng);
    return '<div class="gauge"><svg viewBox="0 0 120 70"><path d="M12 60 A48 48 0 0 1 108 60" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="10" stroke-linecap="round"/>' +
      '<path class="g-arc" d="M12 60 A48 48 0 0 1 ' + x.toFixed(1) + ' ' + y.toFixed(1) + '" fill="none" stroke="' + (ok ? "#34d399" : "#fb7185") + '" stroke-width="10" stroke-linecap="round"/>' +
      '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="3.2" fill="#fbbf24"/></svg><div class="g-v" data-count="' + val.toFixed(dec) + '" data-dec="' + dec + '">0</div><div class="g-l">' + label + '</div><div class="g-m">meta ≤ ' + fmt(meta, dec) + '</div></div>';
  },
  piramide: function (niveles) {
    var W = 360, H = 250, n = niveles.length, h = H / n, cols = ["#7f1d1d","#dc2626","#f59e0b","#7c3aed","#0ea5e9"];
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="pyr">';
    niveles.forEach(function (lv, i) {
      var t0 = (i / n), t1 = ((i + 1) / n), x0a = W / 2 - (W / 2) * t0 * 0.95 - 18 * (i ? 1 : 0.2), x0b = W / 2 + (W / 2) * t0 * 0.95 + 18 * (i ? 1 : 0.2);
      var x1a = W / 2 - (W / 2) * t1 * 0.95 - 18, x1b = W / 2 + (W / 2) * t1 * 0.95 + 18, y0 = i * h + 2, y1 = (i + 1) * h - 2;
      s += '<path d="M' + x0a + ' ' + y0 + ' L' + x0b + ' ' + y0 + ' L' + x1b + ' ' + y1 + ' L' + x1a + ' ' + y1 + ' Z" fill="' + cols[i] + '" opacity=".92"><title>' + esc(lv[0]) + ': ' + lv[1] + '</title></path>' +
        '<text x="' + W / 2 + '" y="' + (y0 + h / 2 + 1) + '" text-anchor="middle" class="pyr-n">' + lv[1] + '</text><text x="' + W / 2 + '" y="' + (y0 + h / 2 + 14) + '" text-anchor="middle" class="pyr-l">' + esc(lv[0]) + '</text>';
    });
    return s + '</svg>';
  },
  matriz: function (evs) {
    var G = ["MAY","SER","MEN"], P = ["RAR","MOD","ALT"], m = {};
    evs.forEach(function (e) { var s = e.scat || {}; if (s.gravedad && s.probabilidad) { var k = s.gravedad + s.probabilidad; (m[k] = m[k] || []).push(e.id); } });
    var col = function (g, p) { var r = CAT.riesgo(g, p, "MOD"); return r.n === 3 ? "#ef4444" : r.n === 2 ? "#f59e0b" : "#22c55e"; };
    var h = '<div class="mx"><div class="mx-y">Gravedad potencial</div><div class="mx-g">';
    G.forEach(function (g) {
      h += '<div class="mx-lab">' + CAT.txt("gravedad", g).split(" ")[0] + '</div>';
      P.forEach(function (p) { var l = m[g + p] || []; h += '<div class="mx-c" style="--c:' + col(g, p) + ';--o:' + (l.length ? Math.min(.35 + l.length * .22, 1) : .12) + '" title="' + esc(l.join(", ")) + '"><b>' + (l.length || "") + '</b></div>'; });
    });
    h += '<div></div>' + P.map(function (p) { return '<div class="mx-lab b">' + CAT.txt("probabilidad", p) + '</div>'; }).join("") + '</div><div class="mx-x">Probabilidad de ocurrencia</div></div>';
    return h;
  },
  heat: function (evs) {
    var dias = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"], bloques = ["00–06","06–09","09–12","12–15","15–18","18–24"], m = {}, mx = 0;
    evs.forEach(function (e) {
      var d = (new Date(e.fecha + "T12:00:00").getDay() + 6) % 7, h = +String(e.hora || "12").slice(0, 2);
      var b = h < 6 ? 0 : h < 9 ? 1 : h < 12 ? 2 : h < 15 ? 3 : h < 18 ? 4 : 5, k = d + "-" + b; m[k] = (m[k] || 0) + 1; mx = Math.max(mx, m[k]);
    });
    var h = '<div class="hm"><div></div>' + bloques.map(function (b) { return '<div class="hm-l">' + b + '</div>'; }).join("");
    dias.forEach(function (d, i) { h += '<div class="hm-l r">' + d + '</div>'; bloques.forEach(function (b, j) { var v = m[i + "-" + j] || 0; h += '<div class="hm-c" style="--o:' + (v ? .25 + .75 * v / mx : .06) + '" title="' + d + ' ' + b + ': ' + v + ' evento(s)">' + (v || "") + '</div>'; }); });
    return h + '</div>';
  },
  embudo: function (pasos) {
    var mx = Math.max.apply(null, pasos.map(function (p) { return p[1]; }).concat([1]));
    return '<div class="fun">' + pasos.map(function (p, i) { return '<div class="fun-r"><span class="fun-l">' + esc(p[0]) + '</span><div class="fun-b"><i style="width:' + Math.max(p[1] / mx * 100, p[1] ? 8 : 0) + '%;--c:' + p[2] + '"></i></div><b>' + p[1] + '</b></div>'; }).join("") + '</div>';
  },
  contar: function (root) {
    $$("[data-count]", root).forEach(function (el) {
      var fin = parseFloat(el.dataset.count) || 0, dec = +(el.dataset.dec || 0), t0 = performance.now(), dur = 900;
      (function tick(t) { var k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(fin * e, dec); if (k < 1) requestAnimationFrame(tick); })(t0);
    });
  }
};
function chart(id, cfg) {
  var el = document.getElementById(id); if (!el || !window.Chart) return;
  Chart.defaults.font.family = "Inter, system-ui, sans-serif"; Chart.defaults.color = "#64748b";
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: { duration: 700 }, plugins: {} }, cfg.options || {});
  cfg.options.plugins = Object.assign({ legend: { labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } } }, tooltip: { backgroundColor: "#0b2540", padding: 10, cornerRadius: 8 } }, cfg.options.plugins);
  charts.push(new Chart(el, cfg));
}
function kpi(l, v, s, c, href, spark, dec) {
  return '<div class="kpi ' + (c || "") + (href ? " link" : "") + '"' + (href ? ' onclick="location.hash=\'' + href + '\'"' : "") + '><div class="l">' + l + '</div><div class="v tnum" data-count="' + v + '" data-dec="' + (dec || 0) + '">0</div><div class="s">' + s + '</div>' + (spark || "") + '</div>';
}
function selectorAnio() { var a = S.anio; return '<select class="btn" onchange="S.anio=+this.value;App.route()">' + [a - 2, a - 1, a, a + 1].map(function (y) { return '<option ' + (y === a ? "selected" : "") + '>' + y + '</option>'; }).join("") + '</select>'; }
function selectorArea() {
  return '<select class="btn" onchange="S.fArea=this.value;App.route()"><option value="">Todas las áreas</option>' + CAT.areas().map(function (a) {
    return '<optgroup label="' + esc(a) + '"><option value="' + esc(a) + '"' + (S.fArea === a ? " selected" : "") + '>' + esc(a) + ' (toda el área)</option>' + CAT.divisiones.filter(function (d) { return CAT.areaDe(d) === a; }).map(function (d) { return '<option value="' + esc(d) + '"' + (S.fArea === d ? " selected" : "") + '>' + esc(CAT.divDe(d)) + '</option>'; }).join("") + '</optgroup>';
  }).join("") + '</select>';
}

/* ============================================================
   VISTAS
   ============================================================ */
var Views = {};

/* ---------- TABLERO EJECUTIVO ---------- */
Views.tablero = function () {
  var anio = S.anio, I = L.indicadores(anio), T = I.total;
  var base = S.eventos.filter(function (e) { return e.estado !== "Anulado" && L.enFiltroArea(e.area); });
  var evA = base.filter(function (e) { return String(e.fecha).slice(0, 4) == anio; });
  var abiertas = base.filter(function (e) { return ["Reportado","En investigación","Observado","En revisión"].indexOf(e.estado) >= 0; });
  var accs = S.acciones.filter(function (a) { var e = L.evento(a.evento_id); return e && L.enFiltroArea(e.area); });
  var accAb = accs.filter(function (a) { return a.estado !== "Cerrada"; }), venc = accs.filter(L.accVencida);
  var cerr = accs.filter(function (a) { return a.estado === "Cerrada"; }), aTiempo = cerr.filter(function (a) { return !a.fecha_cierre || a.fecha_cierre <= a.fecha_compromiso; }).length;
  var cumpl = accs.length ? Math.round((aTiempo + accAb.filter(function (a) { return !L.accVencida(a); }).length) / accs.length * 100) : 100;
  var hoy = hoyISO(), enDM = S.descansos.filter(function (d) { return d.inicio <= hoy && d.fin >= hoy && d.estado !== "Observado" && L.enFiltroArea(d.area); });
  var incap = base.filter(function (e) { var t = CAT.get("tipoEvento", e.tipo); return t && t.cuentaIF; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; })[0];
  var diasSin = incap ? -diasHasta(incap.fecha) : null;
  var al = L.alertas(), mias = S.acciones.filter(function (a) { return a.responsable_dni === S.user.dni && a.estado !== "Cerrada"; });
  var porMes = function (fn) { return MESES.map(function (m, i) { return evA.filter(function (e) { return +e.fecha.slice(5, 7) === i + 1 && fn(e); }).length; }); };

  App.titulo("Tablero de gestión SST", (S.fArea ? S.fArea + " · " : "") + "Año " + anio + " · " + CONFIG.EMPRESA,
    selectorArea() + selectorAnio() + (L.rol() !== "COMITE" ? '<a class="btn primary" href="#/reportar">' + svg("reportar") + '<span class="hide-sm">Reportar evento</span></a>' : ""));

  var h = '<section class="hero"><div class="hero-main"><div class="hero-k">Días sin accidentes incapacitantes</div><div class="hero-n" data-count="' + (diasSin == null ? 0 : diasSin) + '">0</div>' +
    '<div class="hero-s">' + (incap ? "Último: <b>" + esc(incap.id) + "</b> · " + fFecha(incap.fecha) + " · " + esc(CAT.divDe(incap.area)) : "Sin accidentes incapacitantes registrados") + '</div>' +
    '<div class="hero-chips"><span>' + evA.length + ' eventos ' + anio + '</span><span>' + abiertas.length + ' investigaciones abiertas</span><span>' + enDM.length + ' en descanso hoy</span></div></div>' +
    '<div class="hero-g">' + UI.gauge(T.IF, CONFIG.META_IF, "Índice de frecuencia", 2) + UI.gauge(T.IS, CONFIG.META_IS, "Índice de severidad", 2) + UI.gauge(T.IA, CONFIG.META_IF * CONFIG.META_IS / 1000, "Accidentabilidad", 2) + '</div></section>';

  h += '<div class="kpis">' +
    kpi("Eventos " + anio, evA.length, T.acc + " incapacitantes / mortales", "", "#/eventos", UI.spark(I.filas.map(function (f) { return f.eventos; }), "#0284c7")) +
    kpi("Días perdidos", T.dp, "descansos médicos por AT", T.dp ? "warn" : "ok", "#/descansos", UI.spark(I.filas.map(function (f) { return f.dp; }), "#f59e0b")) +
    kpi("Investigaciones abiertas", abiertas.length, abiertas.filter(function (e) { return e.estado === "En revisión"; }).length + " en revisión", abiertas.length ? "purple" : "ok", "#/investigaciones") +
    kpi("Acciones vencidas", venc.length, accAb.length + " abiertas de " + accs.length, venc.length ? "bad" : "ok", "#/acciones") +
    kpi("Cumplimiento del plan", cumpl, "% de acciones a tiempo", cumpl >= 90 ? "ok" : cumpl >= 70 ? "warn" : "bad", "#/acciones") +
    kpi("Alertas críticas", al.filter(function (a) { return a.sev >= 3; }).length, al.length + " alertas en total", al.some(function (a) { return a.sev >= 3; }) ? "bad" : "ok", "#/alertas") + '</div>';

  h += '<div class="grid-dash">' +
    '<div class="card c8"><h3>Eventos por mes <small>' + anio + ' · por tipo y acumulado</small></h3><div class="chart-box"><canvas id="chMes"></canvas></div></div>' +
    '<div class="card c4"><h3>Pirámide de eventos <small>Bird · ' + anio + '</small></h3>' + UI.piramide([["Mortales", porMes(function (e) { return e.tipo === "AM"; }).reduce(sum, 0)], ["Incapacitantes", porMes(function (e) { return e.tipo === "AI"; }).reduce(sum, 0)], ["Leves", porMes(function (e) { return e.tipo === "AL"; }).reduce(sum, 0)], ["Incid. peligrosos", porMes(function (e) { return e.tipo === "IP"; }).reduce(sum, 0)], ["Incidentes / cuasi", porMes(function (e) { return ["INC","CA"].indexOf(e.tipo) >= 0; }).reduce(sum, 0)]]) + '</div>' +
    '<div class="card c4"><h3>Matriz de riesgo potencial <small>SCAT bloque 1</small></h3>' + UI.matriz(evA) + '</div>' +
    '<div class="card c8"><h3>Pareto de causas básicas <small>el 20% de causas que explica el 80% de eventos</small></h3><div class="chart-box"><canvas id="chPareto"></canvas></div></div>' +
    '<div class="card c4"><h3>Flujo de investigaciones</h3>' + UI.embudo([["Reportado", base.filter(function (e) { return e.estado === "Reportado"; }).length, "#f59e0b"], ["En investigación", base.filter(function (e) { return e.estado === "En investigación" || e.estado === "Observado"; }).length, "#0284c7"], ["En revisión", base.filter(function (e) { return e.estado === "En revisión"; }).length, "#7c3aed"], ["Aprobado", base.filter(function (e) { return e.estado === "Aprobado"; }).length, "#16a34a"], ["Cerrado", base.filter(function (e) { return e.estado === "Cerrado"; }).length, "#0f766e"]]) + '</div>' +
    '<div class="card c4"><h3>¿Cuándo ocurren? <small>día × franja horaria</small></h3>' + UI.heat(evA) + '</div>' +
    '<div class="card c4"><h3>Falta de control (NAC)</h3><div class="chart-box sm"><canvas id="chNac"></canvas></div></div>' +
    '<div class="card c6"><h3>Eventos por área ▸ división</h3><div class="chart-box"><canvas id="chDiv"></canvas></div></div>' +
    '<div class="card c6"><h3>Tipo de contacto</h3><div class="chart-box"><canvas id="chCont"></canvas></div></div>' +
    '<div class="card c6"><h3>Lo que requiere tu atención <small>' + al.length + '</small></h3>' + alertasHTML(al.slice(0, 6)) + (al.length > 6 ? '<a href="#/alertas" class="small">Ver todas →</a>' : "") + '</div>' +
    '<div class="card c6"><h3>Mis acciones asignadas <small>' + mias.length + '</small></h3>' + (mias.length ? mias.slice(0, 6).map(function (a) {
      return '<div class="plazo"><span><a href="#/evento/' + a.evento_id + '/acciones">' + esc(a.id) + '</a> ' + esc(a.descripcion) + '</span><span class="flex nw">' + L.accPill(a) + '<span class="small muted">' + fFecha(a.fecha_compromiso) + '</span></span></div>';
    }).join("") : '<div class="empty sm">No tienes acciones pendientes 👍</div>') + '</div></div>';
  $("#view").innerHTML = h;
  UI.contar($("#view"));
  if (!window.Chart) return;

  var acum = 0, cum = I.filas.map(function (f) { acum += f.eventos; return acum; });
  chart("chMes", { type: "bar", data: { labels: MESES, datasets: CAT.tipoEvento.map(function (t) { return { label: t.t, backgroundColor: t.color, borderRadius: 4, data: porMes(function (e) { return e.tipo === t.c; }), stack: "s", order: 2 }; }).filter(function (d) { return d.data.some(Boolean); })
    .concat([{ type: "line", label: "Acumulado", data: cum, borderColor: "#F28C28", backgroundColor: "#F28C28", tension: .35, yAxisID: "y1", pointRadius: 3, order: 1 }]) },
    options: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { precision: 0 }, grid: { color: "#eef2f7" } }, y1: { position: "right", grid: { display: false }, ticks: { precision: 0 } } } } });
  var cb = {}; evA.forEach(function (e) { ((e.scat || {}).fp || []).concat((e.scat || {}).ft || []).forEach(function (c) { cb[c] = (cb[c] || 0) + 1; }); });
  var par = Object.keys(cb).map(function (k) { return [k, cb[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8), tot = par.reduce(function (s, p) { return s + p[1]; }, 0), ac2 = 0;
  if (par.length) chart("chPareto", { type: "bar", data: { labels: par.map(function (p) { return [p[0], recorta(CAT.txt(CAT.listaDe(p[0]), p[0]), 18)]; }),
    datasets: [{ label: "Frecuencia", data: par.map(function (p) { return p[1]; }), backgroundColor: "#0c4a6e", borderRadius: 6, order: 2 }, { type: "line", label: "% acumulado", data: par.map(function (p) { ac2 += p[1]; return Math.round(ac2 / tot * 100); }), borderColor: "#F28C28", backgroundColor: "#F28C28", yAxisID: "y1", tension: .3, order: 1 }] },
    options: { plugins: { tooltip: { callbacks: { title: function (it) { var c = par[it[0].dataIndex][0]; return c + " · " + CAT.txt(CAT.listaDe(c), c); } } } }, scales: { x: { ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: false }, grid: { display: false } }, y: { ticks: { precision: 0 } }, y1: { position: "right", min: 0, max: 100, grid: { display: false }, ticks: { callback: function (v) { return v + "%"; } } } } } });
  else vacio("chPareto");
  var nc = {}; evA.forEach(function (e) { ((e.scat || {}).nac || []).forEach(function (n) { nc[n.c] = (nc[n.c] || 0) + 1; }); });
  var nl = Object.keys(nc).sort(function (a, b) { return nc[b] - nc[a]; }).slice(0, 6);
  if (nl.length) chart("chNac", { type: "doughnut", data: { labels: nl.map(function (k) { return recorta(CAT.txt("nac", k), 28); }), datasets: [{ data: nl.map(function (k) { return nc[k]; }), backgroundColor: ["#0c4a6e","#0284c7","#38bdf8","#F28C28","#fbbf24","#7c3aed"], borderWidth: 2 }] }, options: { cutout: "62%", plugins: { legend: { position: "bottom", labels: { font: { size: 10 } } } } } });
  else vacio("chNac");
  var dv = {}; evA.forEach(function (e) { dv[e.area] = (dv[e.area] || 0) + 1; });
  var dl = Object.keys(dv).sort(function (a, b) { return dv[b] - dv[a]; });
  if (dl.length) chart("chDiv", { type: "bar", data: { labels: dl.map(function (d) { return [CAT.divDe(d), CAT.areaDe(d)]; }), datasets: [{ data: dl.map(function (d) { return dv[d]; }), backgroundColor: "#0284c7", borderRadius: 6 }] }, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } }, y: { grid: { display: false } } } } });
  else vacio("chDiv");
  var ct = {}; evA.forEach(function (e) { ((e.scat || {}).contactos || []).forEach(function (c) { ct[c] = (ct[c] || 0) + 1; }); });
  var cl = Object.keys(ct).sort(function (a, b) { return ct[b] - ct[a]; }).slice(0, 7);
  if (cl.length) chart("chCont", { type: "bar", data: { labels: cl.map(function (k) { return recorta(CAT.txt("contactos", k), 34); }), datasets: [{ data: cl.map(function (k) { return ct[k]; }), backgroundColor: "#F28C28", borderRadius: 6 }] }, options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } }, y: { grid: { display: false }, ticks: { font: { size: 10.5 } } } } } });
  else vacio("chCont");
};
function sum(a, b) { return a + b; }
function recorta(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function vacio(id) { var el = document.getElementById(id); if (el) el.parentNode.innerHTML = '<div class="empty sm">Sin datos aún</div>'; }
function alertasHTML(al) {
  if (!al.length) return '<div class="callout ok">✔ Todo al día: no hay plazos vencidos ni pendientes críticos.</div>';
  return al.map(function (a) {
    var c = a.sev >= 3 ? "bad" : a.sev === 2 ? "warn" : "info";
    return '<a class="alert-row" href="' + a.href + '"><span class="al-dot ' + c + '"></span><span class="al-t"><b>' + esc(a.t) + '</b><span>' + esc(a.d) + '</span></span><span class="al-go">›</span></a>';
  }).join("");
}

/* ---------- ALERTAS ---------- */
Views.alertas = function () {
  var al = L.alertas();
  App.titulo("Alertas y plazos", "Plazos legales (Ley 29783 art. 82), plazos internos SST-PR-03 y vencimientos del plan de acción");
  $("#view").innerHTML = '<div class="kpis">' + kpi("Críticas", al.filter(function (a) { return a.sev >= 3; }).length, "vencidas", "bad") + kpi("Atención", al.filter(function (a) { return a.sev === 2; }).length, "por vencer / pendientes", "warn") + kpi("Avisos", al.filter(function (a) { return a.sev === 1; }).length, "revisiones y sugerencias", "") + '</div>' +
    '<div class="card">' + alertasHTML(al) + '</div>' +
    '<div class="card"><h3>Plazos que controla el sistema</h3><div class="tbl-wrap"><table class="t"><tr><th>Evento</th><th>Obligación</th><th>Plazo</th><th>Base</th></tr>' +
    '<tr><td>Accidente mortal / incidente peligroso</td><td>Notificar al MTPE (Formulario N.° 1)</td><td>24 horas</td><td>Ley 29783 art. 82 · Anexo 01</td></tr>' +
    '<tr><td>Todo evento</td><td>Iniciar la investigación</td><td>' + CONFIG.PLAZO_INICIO_INV_H + ' horas</td><td>SST-PR-03 §6.3.1</td></tr>' +
    '<tr><td>Todo evento</td><td>Informe de investigación</td><td>' + CONFIG.PLAZO_INFORME_DIAS + ' días</td><td>§6.3.8 (plazo interno configurable)</td></tr>' +
    '<tr><td>Accidente no mortal</td><td>Centro médico notifica al MTPE (Formulario N.° 2)</td><td>Último día hábil del mes siguiente</td><td>Anexo 01</td></tr>' +
    '<tr><td>Plan de acción</td><td>Cumplimiento según potencial de pérdida</td><td>Alto 15 · Medio 30 · Bajo 45 días</td><td>Generado por el sistema; editable</td></tr></table></div>' +
    '<p class="small muted">Los plazos de notificación deben verificarse siempre contra la normativa vigente al momento del evento.</p></div>';
};

/* ---------- REGISTRO DE EVENTOS ---------- */
Views.eventos = function (p, soloInv) {
  var f = S.filtros.ev || (S.filtros.ev = { q: "", tipo: "", estado: "", anio: "" });
  App.titulo(soloInv ? "Investigaciones" : "Registro de eventos", soloInv ? "Bandeja de investigaciones en curso y su avance" : "Todos los accidentes, incidentes y enfermedades ocupacionales",
    selectorArea() + '<button class="btn" onclick="exportarEventos()">⬇ <span class="hide-sm">Exportar</span></button>' + (L.rol() !== "COMITE" ? '<a class="btn primary" href="#/reportar">' + svg("reportar") + '<span class="hide-sm">Reportar</span></a>' : ""));
  var anios = {}; S.eventos.forEach(function (e) { anios[String(e.fecha).slice(0, 4)] = 1; });
  function sel(k, l, o) { return '<select onchange="S.filtros.ev.' + k + '=this.value;pintarEventos(' + !!soloInv + ')"><option value="">' + l + ': todos</option>' + o.map(function (x) { var v = x.v || x, t = x.t || x; return '<option value="' + esc(v) + '"' + (f[k] == v ? " selected" : "") + '>' + esc(t) + '</option>'; }).join("") + '</select>'; }
  $("#view").innerHTML = '<div class="toolbar"><input type="search" placeholder="Buscar código, trabajador, lugar, descripción…" value="' + esc(f.q) + '" oninput="S.filtros.ev.q=this.value;pintarEventosD(' + !!soloInv + ')">' +
    sel("tipo", "Tipo", CAT.tipoEvento.map(function (t) { return { v: t.c, t: t.t }; })) + (soloInv ? "" : sel("estado", "Estado", CAT.estados)) + sel("anio", "Año", Object.keys(anios).sort().reverse()) + '</div><div id="evList"></div>';
  pintarEventos(soloInv);
};
Views.investigaciones = function (p) { Views.eventos(p, true); };
var pintarEventosD = debounce(function (s) { pintarEventos(s); }, 160);
function filtrarEventos(soloInv) {
  var f = S.filtros.ev || {}, q = (f.q || "").toLowerCase();
  return S.eventos.filter(function (e) {
    if (soloInv && ["Reportado","En investigación","Observado","En revisión","Aprobado"].indexOf(e.estado) < 0) return false;
    if (!L.enFiltroArea(e.area)) return false;
    if (f.tipo && e.tipo !== f.tipo) return false; if (f.estado && e.estado !== f.estado) return false;
    if (f.anio && String(e.fecha).slice(0, 4) !== f.anio) return false;
    if (q && [e.id, e.trabajador, e.descripcion, e.dni_trab, e.lugar, e.area].join(" ").toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}
function pintarEventos(soloInv) {
  var L2 = filtrarEventos(soloInv), el = $("#evList"); if (!el) return;
  if (!L2.length) { el.innerHTML = '<div class="card empty">No hay eventos con esos filtros.</div>'; return; }
  el.innerHTML = '<div class="ev-cards">' + L2.map(function (e) {
    var pg = L.pasos(e), pl = L.plazos(e), mal = pl.filter(function (x) { return x.st === "vencido"; }).length, pr = pl.filter(function (x) { return x.st === "pronto"; }).length, rg = CAT.riesgo((e.scat || {}).gravedad, (e.scat || {}).probabilidad, (e.scat || {}).exposicion);
    return '<a class="ev-card" href="#/evento/' + e.id + '" style="--c:' + ((CAT.get("tipoEvento", e.tipo) || {}).color || "#64748b") + '"><div class="evc-top"><b>' + esc(e.id) + '</b>' + L.tipoPill(e.tipo) + L.estadoPill(e.estado) + (rg ? '<span class="pill ' + rg.color + '">Riesgo ' + rg.nivel + '</span>' : "") + '<span class="spacer"></span>' +
      (e.estado === "Anulado" ? "" : mal ? '<span class="pill bad">⏰ ' + mal + ' plazo vencido</span>' : pr ? '<span class="pill warn">⏰ por vencer</span>' : '<span class="pill ok">al día</span>') + '</div>' +
      '<div class="evc-d">' + esc(e.descripcion) + '</div><div class="evc-m"><span>🗓 ' + fFecha(e.fecha) + ' ' + esc(e.hora || "") + '</span><span>👷 ' + esc(e.trabajador || "—") + '</span>' + areaChip(e.area) + '<span>🩺 ' + L.diasPerdidos(e.id) + ' d perdidos</span></div>' +
      '<div class="evc-p"><div class="bar ' + (pg.pct === 100 ? "ok" : "") + '"><i style="width:' + pg.pct + '%"></i></div><span>' + pg.pct + '%</span><span class="small muted">' + (pg.siguiente && e.estado !== "Anulado" ? "Siguiente: " + esc(pg.siguiente.t) : "Completo") + '</span></div></a>';
  }).join("") + '</div><p class="small muted">' + L2.length + ' evento(s)</p>';
}
function exportarEventos() {
  var rows = [["Código","Fecha","Hora","Tipo","Estado","Área","División","Ámbito","Lugar","Tarea","Trabajador","DNI","Puesto","Régimen","Empresa","Parte del cuerpo","Naturaleza","Días perdidos","Descripción","Gravedad","Probabilidad","Riesgo","Tipo de contacto","Actos","Condiciones","Factores personales","Factores del trabajo","NAC (P/S/C)","Causa raíz","MTPE","Reportado por","Aprobado por"]];
  filtrarEventos(false).forEach(function (e) {
    var s = e.scat || {}, j = function (l, a) { return (a || []).map(function (c) { return c + " " + CAT.txt(l, c); }).join(" / "); }, rg = CAT.riesgo(s.gravedad, s.probabilidad, s.exposicion);
    rows.push([e.id, e.fecha, e.hora, CAT.tipoTxt(e.tipo), e.estado, CAT.areaDe(e.area), CAT.divDe(e.area), e.ambito, e.lugar, e.tarea, e.trabajador, e.dni_trab, e.puesto, e.regimen, e.empresa, e.parte_cuerpo, e.naturaleza, L.diasPerdidos(e.id), e.descripcion,
      CAT.txt("gravedad", s.gravedad), CAT.txt("probabilidad", s.probabilidad), rg ? rg.nivel : "", j("contactos", s.contactos), j("actos", s.actos), j("condiciones", s.condiciones), j("fPersonales", s.fp), j("fTrabajo", s.ft),
      (s.nac || []).map(function (n) { return n.c + " " + CAT.txt("nac", n.c) + " (" + (n.psc || "-") + ")"; }).join(" / "), s.causa_raiz, e.mtpe && e.mtpe.fecha ? e.mtpe.fecha + " " + (e.mtpe.nro || "") : "", e.reportado_nombre, e.aprobado_por || ""]);
  });
  csv("Registro_eventos_SCAT_" + hoyISO() + ".csv", rows);
}

/* ---------- REPORTAR EVENTO ---------- */
var CAMPOS_EVENTO = [
  { k: "tipo", label: "Tipo de evento", type: "select", req: true, opts: CAT.tipoEvento.map(function (t) { return { v: t.c, t: t.t }; }), hint: "Si no estás seguro, elige el más cercano: el investigador lo confirma." },
  { k: "fecha", label: "Fecha del evento", type: "date", req: true }, { k: "hora", label: "Hora", type: "time", req: true },
  { k: "turno", label: "Turno", type: "select", opts: CAT.turno },
  { k: "area", label: "Área ▸ División (Panel SSOMA)", type: "select", req: true, opts: [] },
  { k: "ambito", label: "Ámbito del trabajo", type: "select", opts: CAT.ambito },
  { k: "lugar", label: "Lugar exacto / dirección", ph: "Ej.: Av. Universitaria cdra. 30, poste P-1234", col: "span2" },
  { k: "tarea", label: "Tarea que se realizaba", col: "span2", ph: "Ej.: tendido de cable aéreo de fibra óptica" },
  { k: "descripcion", label: "¿Qué pasó? (descripción del suceso)", type: "textarea", req: true, col: "span2", ph: "Qué, cómo, cuándo y dónde. Solo hechos." }
];
function camposEvento() { var c = clone(CAMPOS_EVENTO); c.filter(function (x) { return x.k === "area"; })[0].opts = optsDivisiones(); return c; }
var CAMPOS_TRAB = [
  { k: "trabajador", label: "Nombre del trabajador afectado", ph: "Nombres y apellidos", col: "span2" }, { k: "dni_trab", label: "DNI / CE" },
  { k: "edad", label: "Edad", type: "number", min: 14 }, { k: "puesto", label: "Puesto / cargo" }, { k: "regimen", label: "Régimen / vínculo", type: "select", opts: CAT.regimen },
  { k: "empresa", label: "Empresa (si es contratista)" }, { k: "antiguedad", label: "Antigüedad en la empresa", ph: "Ej.: 1 año 3 meses" }, { k: "experiencia", label: "Experiencia en la tarea", ph: "Ej.: 6 meses" },
  { k: "jefe_directo", label: "Jefe directo" }, { k: "testigos", label: "Testigos", ph: "Nombres, separados por coma", col: "span2" }
];
var CAMPOS_LESION = [
  { k: "parte_cuerpo", label: "Parte del cuerpo afectada", type: "select", opts: CAT.parteCuerpo }, { k: "naturaleza", label: "Naturaleza de la lesión", type: "select", opts: CAT.naturaleza },
  { k: "lesion_desc", label: "Descripción de la lesión", col: "span2" }, { k: "danos_materiales", label: "Daños materiales / a equipos", type: "textarea" },
  { k: "danos_ambientales", label: "Daños al ambiente / impacto en operaciones", type: "textarea" }, { k: "perdida_estimada", label: "Pérdida económica estimada (S/)", type: "number", min: 0 }
];
var CAMPOS_INMEDIATAS = [
  { k: "primeros_auxilios", label: "Se brindaron primeros auxilios", type: "check" }, { k: "traslado", label: "Se trasladó al trabajador a un centro médico", type: "check" },
  { k: "area_asegurada", label: "Se aseguró y controló el área", type: "check" }, { k: "evidencia_preservada", label: "Se preservó la evidencia", type: "check" },
  { k: "plan_emergencia", label: "Se activó el plan de emergencias", type: "check" }, { k: "trabajadora_social", label: "Se comunicó a la trabajadora social", type: "check" },
  { k: "centro_medico", label: "Centro médico de atención", col: "span2" }, { k: "detalle", label: "Otras acciones inmediatas", type: "textarea", col: "span3" }
];

Views.reportar = function () {
  if (L.rol() === "COMITE") { location.hash = "#/eventos"; return; }
  App.titulo("Reportar evento", "Reporte interno inmediato · SST-PR-03 §6.1.1");
  var sc = L.scope(), def = sc.length === 1 && sc[0].indexOf(CAT.SEP) > 0 ? sc[0] : "";
  var ev = { fecha: hoyISO(), hora: new Date().toTimeString().slice(0, 5), area: def };
  $("#view").innerHTML =
    '<div class="callout info mb"><span>⚡</span><div><b>Reporta de inmediato, aunque falten datos.</b>El sistema calcula los plazos legales, avisa por correo a SSOMA, abre el expediente de investigación y prepara los formatos para firma.</div></div><div id="mtpeWarn"></div>' +
    '<div class="card"><h3><span class="num">1</span> Datos del evento</h3>' + formHTML(camposEvento(), ev) + '</div>' +
    '<div class="card"><h3><span class="num">2</span> Trabajador afectado <small>si son varios, reporta un evento por cada uno (§6.3.8)</small></h3>' + formHTML(CAMPOS_TRAB, {}, false, "g3") + '</div>' +
    '<div class="card"><h3><span class="num">3</span> Lesión y pérdidas</h3>' + formHTML(CAMPOS_LESION, {}) + '</div>' +
    '<div class="card"><h3><span class="num">4</span> Acciones inmediatas <small>§6.2</small></h3><div id="inmBox">' + formHTML(CAMPOS_INMEDIATAS, {}, false, "g3") + '</div></div>' +
    '<div class="card"><h3><span class="num">5</span> Fotos y documentos iniciales <small>opcional</small></h3><label class="drop" for="repFiles">📎 Toca para adjuntar fotos del lugar, del equipo o documentos (máx. 10 MB c/u)<input type="file" id="repFiles" multiple accept="image/*,application/pdf" hidden onchange="document.getElementById(\'repFilesN\').textContent=this.files.length+\' archivo(s) seleccionado(s)\'"></label><div class="small muted mt" id="repFilesN"></div></div>' +
    '<div class="sticky-actions"><a class="btn" href="#/eventos">Cancelar</a><button class="btn primary lg" id="btnRep">Registrar evento</button></div>';
  var tipoSel = $('[data-k="tipo"]');
  tipoSel.onchange = function () {
    var t = CAT.get("tipoEvento", tipoSel.value);
    $("#mtpeWarn").innerHTML = t && t.mtpe24 ? '<div class="callout bad mb"><span>⚠️</span><div><b>' + esc(t.t) + ': notificación obligatoria al MTPE dentro de 24 horas.</b>Formulario N.° 1 del portal del MTPE.' + (t.c === "AM" ? " En caso de fallecimiento: comunicar a la Policía y no mover los restos (§6.4)." : "") + '</div></div>' : "";
  };
  $("#btnRep").onclick = function () {
    var v = $("#view"), o = leerForm(v, camposEvento(), {}); if (!o) return;
    leerForm(v, CAMPOS_TRAB, o); leerForm(v, CAMPOS_LESION, o); o.inmediatas = leerForm($("#inmBox"), CAMPOS_INMEDIATAS, {});
    var t = CAT.get("tipoEvento", o.tipo); o.tipo_txt = t.t; o.mtpe24 = t.mtpe24;
    o.scat = {}; o.equipo = []; o.declaraciones = []; o.evidencias = {}; o.mtpe = {};
    if (o.fecha > hoyISO()) return toast("La fecha no puede ser futura", "bad");
    var files = $("#repFiles").files;
    App.guardar("eventos", o).then(function (r) {
      if (!r) return; toast("Evento " + r.id + " registrado", "ok");
      subirArchivos("eventos", r.id, files, "Fotografías del lugar (4 ángulos)").then(function () { location.hash = "#/evento/" + r.id; });
    });
  };
};

/* ---------- DESCANSOS MÉDICOS ---------- */
Views.descansos = function () {
  var f = S.filtros.dm || (S.filtros.dm = { q: "", estado: "", origen: "" }), puedeReg = L.es("ADMIN","SST","MEDICO","JEFE"), hoy = hoyISO(), anio = S.anio;
  var base = S.descansos.filter(function (d) { return L.enFiltroArea(d.area); });
  var enDM = base.filter(function (d) { return d.inicio <= hoy && d.fin >= hoy && d.estado !== "Observado"; });
  var dpAT = base.filter(function (d) { return d.origen === "Accidente de trabajo" && d.estado !== "Observado" && String(d.inicio).slice(0, 4) == anio; }).reduce(function (s, d) { return s + d.dias; }, 0);
  App.titulo("Descansos médicos", "Certificados de incapacidad con su sustento · base de los días perdidos (IS)",
    selectorArea() + '<button class="btn" onclick="exportarDM()">⬇ <span class="hide-sm">Exportar</span></button>' + (puedeReg ? '<button class="btn primary" onclick="DM.editar()">＋ <span class="hide-sm">Registrar descanso</span></button>' : ""));
  $("#view").innerHTML = '<div class="kpis">' + kpi("En descanso hoy", enDM.length, enDM.map(function (d) { return d.trabajador.split(" ")[0]; }).join(", ") || "nadie", enDM.length ? "warn" : "ok") +
    kpi("Días perdidos AT " + anio, dpAT, "alimentan el índice de severidad", "") + kpi("Por validar", base.filter(function (d) { return d.estado === "Pendiente"; }).length, "revisión del área médica", "purple") +
    kpi("Sin sustento", base.filter(function (d) { return !(d.adjuntos || []).length && d.estado !== "Observado"; }).length, "falta adjuntar certificado", "bad") + '</div>' +
    (L.es("ADMIN","SST","MEDICO") ? "" : '<div class="callout info mb">🔒 El diagnóstico y el documento médico son datos sensibles (Ley 29733): solo los ven el área médica y SSOMA.</div>') +
    '<div class="toolbar"><input type="search" placeholder="Buscar trabajador, DNI, evento…" value="' + esc(f.q) + '" oninput="S.filtros.dm.q=this.value;pintarDMD()">' +
    '<select onchange="S.filtros.dm.estado=this.value;pintarDM()"><option value="">Estado: todos</option>' + CAT.dmEstado.map(function (x) { return '<option' + (f.estado === x ? " selected" : "") + '>' + x + '</option>'; }).join("") + '</select>' +
    '<select onchange="S.filtros.dm.origen=this.value;pintarDM()"><option value="">Origen: todos</option>' + CAT.dmOrigen.map(function (x) { return '<option' + (f.origen === x ? " selected" : "") + '>' + x + '</option>'; }).join("") + '</select></div><div id="dmList"></div>';
  pintarDM();
};
var pintarDMD = debounce(function () { pintarDM(); }, 160);
function filtrarDM() {
  var f = S.filtros.dm || {}, q = (f.q || "").toLowerCase();
  return S.descansos.filter(function (d) {
    if (!L.enFiltroArea(d.area)) return false; if (f.estado && d.estado !== f.estado) return false; if (f.origen && d.origen !== f.origen) return false;
    if (q && [d.id, d.trabajador, d.dni_trab, d.evento_id].join(" ").toLowerCase().indexOf(q) < 0) return false; return true;
  }).sort(function (a, b) { return a.inicio < b.inicio ? 1 : -1; });
}
function pintarDM(lista, destino) {
  var L2 = lista || filtrarDM(), hoy = hoyISO(), el = destino || $("#dmList"); if (!el) return;
  if (!L2.length) { el.innerHTML = '<div class="card empty">No hay descansos médicos registrados.</div>'; return; }
  el.innerHTML = '<div class="tbl-wrap"><table class="t"><thead><tr><th>Código</th><th>Trabajador</th><th>Periodo</th><th class="num">Días</th><th>Origen / evento</th><th>Documento</th><th>Diagnóstico</th><th>Sustento</th><th>Estado</th></tr></thead><tbody>' +
    L2.map(function (d) {
      var vig = d.inicio <= hoy && d.fin >= hoy;
      return '<tr class="click" onclick="DM.editar(\'' + d.id + '\')"><td><b>' + esc(d.id) + '</b>' + (d.prorroga_de ? '<div class="sub">prórroga de ' + esc(d.prorroga_de) + '</div>' : "") + '</td><td>' + esc(d.trabajador) + '<div class="sub">' + esc(d.dni_trab || "") + '</div></td>' +
        '<td class="tnum nw">' + fFecha(d.inicio) + ' – ' + fFecha(d.fin) + (vig ? '<div><span class="pill warn">vigente</span></div>' : "") + '</td><td class="num"><b>' + d.dias + '</b></td>' +
        '<td>' + esc(d.origen) + '<div class="sub">' + (d.evento_id ? '<a href="#/evento/' + d.evento_id + '/descansos" onclick="event.stopPropagation()">' + esc(d.evento_id) + '</a>' : "sin evento") + '</div></td>' +
        '<td>' + esc(d.documento || "") + '<div class="sub">' + esc(d.centro || "") + '</div></td><td>' + esc(d.diagnostico || "—") + (d.cie10 ? '<div class="sub">CIE-10 ' + esc(d.cie10) + '</div>' : "") + '</td>' +
        '<td>' + ((d.adjuntos || []).length ? '<span class="pill ok">✔ ' + d.adjuntos.length + '</span>' : '<span class="pill bad">Falta</span>') + '</td>' +
        '<td><span class="pill ' + ({ Validado: "ok", Pendiente: "warn", Observado: "bad" }[d.estado] || "") + '">' + esc(d.estado) + '</span></td></tr>';
    }).join("") + '</tbody></table></div>';
}
function exportarDM() {
  var r = [["Código","Trabajador","DNI","Área","División","Origen","Evento","Documento","Centro médico","Médico","CMP","Diagnóstico","CIE-10","Inicio","Fin","Días","Estado","Validado por","Sustentos"]];
  filtrarDM().forEach(function (d) { r.push([d.id, d.trabajador, d.dni_trab, CAT.areaDe(d.area), CAT.divDe(d.area), d.origen, d.evento_id, d.documento, d.centro, d.medico, d.cmp, d.diagnostico, d.cie10, d.inicio, d.fin, d.dias, d.estado, d.validado_por, (d.adjuntos || []).length]); });
  csv("Descansos_medicos_" + hoyISO() + ".csv", r);
}
var DM = {
  editar: function (id, eventoId) {
    var d = id ? clone(S.descansos.filter(function (x) { return x.id === id; })[0]) : { evento_id: eventoId || "", origen: eventoId ? "Accidente de trabajo" : "", estado: "Pendiente", inicio: hoyISO() };
    var ev = d.evento_id ? L.evento(d.evento_id) : null;
    if (!id && ev) { d.trabajador = ev.trabajador; d.dni_trab = ev.dni_trab; d.area = ev.area; }
    var med = L.es("ADMIN","SST","MEDICO"), puede = med || (L.es("JEFE") && d.estado !== "Validado");
    var evOpts = S.eventos.filter(function (e) { return e.estado !== "Anulado"; }).map(function (e) { return { v: e.id, t: e.id + " · " + (e.trabajador || "sin trabajador") + " · " + CAT.tipoTxt(e.tipo) }; });
    var dmOpts = S.descansos.filter(function (x) { return x.id !== d.id; }).map(function (x) { return { v: x.id, t: x.id + " · " + x.trabajador + " · hasta " + fFecha(x.fin) }; });
    var C1 = [{ k: "trabajador", label: "Trabajador", req: true, col: "span2" }, { k: "dni_trab", label: "DNI / CE", req: true },
      { k: "area", label: "Área ▸ División", type: "select", opts: optsDivisiones(), col: "span2" }, { k: "origen", label: "Origen", type: "select", req: true, opts: CAT.dmOrigen, hint: "Solo «Accidente de trabajo» suma días perdidos al IS." },
      { k: "evento_id", label: "Evento vinculado", type: "select", opts: evOpts, col: "span2" }, { k: "documento", label: "Tipo de documento", type: "select", req: true, opts: CAT.dmDocumento },
      { k: "inicio", label: "Inicio del descanso", type: "date", req: true }, { k: "fin", label: "Fin del descanso", type: "date", req: true }, { k: "prorroga_de", label: "Es prórroga de", type: "select", opts: dmOpts },
      { k: "centro", label: "Centro médico / establecimiento", col: "span3" }];
    var C2 = [{ k: "medico", label: "Médico tratante" }, { k: "cmp", label: "CMP" }, { k: "cie10", label: "CIE-10", ph: "Ej.: S82.6" }, { k: "diagnostico", label: "Diagnóstico", col: "span2" },
      { k: "estado", label: "Estado de validación", type: "select", opts: CAT.dmEstado }, { k: "observacion_medica", label: "Observación del área médica", type: "textarea", col: "span3" },
      { k: "retorno", label: "Fecha de reincorporación / alta", type: "date" }, { k: "restricciones", label: "Restricciones al retorno", ph: "Ej.: no trabajos en altura por 15 días", col: "span2" }];
    var body = '<div id="dmF">' + formHTML(C1, d, !puede, "g3") + '<div class="callout info mt" id="dmDias"></div><hr class="sep"><div class="sub-h">Datos médicos ' + (med ? "" : "🔒 (reservados al área médica)") + '</div>' + formHTML(C2, d, !med, "g3") + '</div>' +
      '<hr class="sep"><div class="sub-h">Sustento (certificado / CITT / informe) <span class="req">*</span></div>' + (id ? adjuntosHTML("descansos", d, L.es("ADMIN","SST")) : "") +
      (puede ? '<label class="drop mt" for="dmFile">📎 Adjuntar certificado (PDF o foto, máx. 10 MB)<input type="file" id="dmFile" multiple accept="image/*,application/pdf" hidden onchange="document.getElementById(\'dmFileN\').textContent=this.files.length+\' archivo(s) listo(s) para subir\'"></label><div class="small muted" id="dmFileN"></div>' : "") +
      (d.validado_por ? '<p class="small muted mt">Validado/observado por ' + esc(d.validado_por) + ' · ' + fFechaHora(d.validado_ts) + '</p>' : "");
    modal({ title: id ? "Descanso médico " + id : "Registrar descanso médico", wide: true, body: body, ok: puede ? "Guardar" : null, cancel: puede ? "Cancelar" : "Cerrar",
      onOpen: function (m) {
        function calc() {
          var a = $('[data-k="inicio"]', m).value, b = $('[data-k="fin"]', m).value, n = a && b ? Math.round((new Date(b) - new Date(a)) / 864e5) + 1 : 0;
          $("#dmDias", m).innerHTML = n > 0 ? "📅 <b>" + n + " día(s) de descanso</b>" + (n > 1 ? " — si es por accidente de trabajo, el evento califica como <b>incapacitante</b>." : " — retorno al día siguiente: califica como accidente <b>leve</b>.") : (a && b ? '<span style="color:#b91c1c">La fecha fin es anterior al inicio.</span>' : "Indica inicio y fin para calcular los días.");
        }
        $('[data-k="inicio"]', m).addEventListener("change", calc); $('[data-k="fin"]', m).addEventListener("change", calc); calc();
        var evSel = $('[data-k="evento_id"]', m);
        evSel.addEventListener("change", function () { var e = L.evento(evSel.value); if (e) { if (!$('[data-k="trabajador"]', m).value) $('[data-k="trabajador"]', m).value = e.trabajador || ""; if (!$('[data-k="dni_trab"]', m).value) $('[data-k="dni_trab"]', m).value = e.dni_trab || ""; $('[data-k="area"]', m).value = e.area; $('[data-k="origen"]', m).value = "Accidente de trabajo"; } });
      },
      onOk: function (m) {
        var o = leerForm($("#dmF", m), C1, d); if (!o) return false; if (med) leerForm($("#dmF", m), C2, o);
        if (o.fin < o.inicio) { toast("La fecha fin es anterior al inicio", "bad"); return false; }
        var files = $("#dmFile", m) ? $("#dmFile", m).files : [];
        if (!id && !files.length) { toast("Adjunta el sustento (certificado médico / CITT).", "bad"); return false; }
        return App.guardar("descansos", o).then(function (r) { if (!r) return false; return subirArchivos("descansos", r.id, files, "Sustento médico").then(function () { toast("Descanso " + r.id + " guardado", "ok"); App.route(); }); });
      } });
  }
};

/* ---------- PLAN DE ACCIÓN (global) ---------- */
Views.acciones = function () {
  var f = S.filtros.ac || (S.filtros.ac = { q: "", estado: "", mias: false });
  var base = S.acciones.filter(function (a) { var e = L.evento(a.evento_id); return !e || L.enFiltroArea(e.area); }), venc = base.filter(L.accVencida).length;
  App.titulo("Plan de acción", "Seguimiento de medidas correctivas y preventivas · §6.3.9", selectorArea() + '<button class="btn" onclick="exportarAcciones()">⬇ <span class="hide-sm">Exportar</span></button>');
  $("#view").innerHTML = '<div class="kpis">' + kpi("Total", base.length, "acciones registradas", "") + kpi("Abiertas", base.filter(function (a) { return a.estado !== "Cerrada"; }).length, "pendientes o en proceso", "warn") +
    kpi("Vencidas", venc, "fuera de plazo", venc ? "bad" : "ok") + kpi("Eficacia verificada", base.filter(function (a) { return a.eficacia === "Sí"; }).length, "cerradas y eficaces", "ok") + '</div>' +
    '<div class="toolbar"><input type="search" placeholder="Buscar acción, evento, responsable…" value="' + esc(f.q) + '" oninput="S.filtros.ac.q=this.value;pintarAccD()">' +
    '<select onchange="S.filtros.ac.estado=this.value;pintarAcc()"><option value="">Estado: todos</option>' + ["Pendiente","En proceso","Cerrada","Vencida"].map(function (x) { return '<option' + (f.estado === x ? " selected" : "") + '>' + x + '</option>'; }).join("") + '</select>' +
    '<label class="chk ' + (f.mias ? "on" : "") + '"><input type="checkbox" ' + (f.mias ? "checked" : "") + ' onchange="S.filtros.ac.mias=this.checked;this.parentNode.classList.toggle(\'on\',this.checked);pintarAcc()"> Solo mis acciones</label></div><div id="acList"></div>';
  pintarAcc();
};
var pintarAccD = debounce(function () { pintarAcc(); }, 160);
function filtrarAcc() {
  var f = S.filtros.ac || {}, q = (f.q || "").toLowerCase();
  return S.acciones.filter(function (a) {
    var e = L.evento(a.evento_id); if (e && !L.enFiltroArea(e.area)) return false;
    if (f.mias && a.responsable_dni !== S.user.dni) return false;
    if (f.estado === "Vencida" ? !L.accVencida(a) : (f.estado && a.estado !== f.estado)) return false;
    if (q && [a.id, a.evento_id, a.descripcion, a.responsable].join(" ").toLowerCase().indexOf(q) < 0) return false; return true;
  }).sort(function (a, b) { return (a.estado === "Cerrada") - (b.estado === "Cerrada") || (a.fecha_compromiso < b.fecha_compromiso ? -1 : 1); });
}
function pintarAcc(lista, destino) {
  var L2 = lista || filtrarAcc(), el = destino || $("#acList"); if (!el) return;
  if (!L2.length) { el.innerHTML = '<div class="card empty">No hay acciones con esos filtros.</div>'; return; }
  el.innerHTML = '<div class="tbl-wrap"><table class="t"><thead><tr><th>Código</th><th>Acción</th><th>Causa que ataca</th><th>Responsable</th><th>Compromiso</th><th>Avance</th><th>Estado</th><th>Eficacia</th></tr></thead><tbody>' +
    L2.map(function (a) {
      var d = diasHasta(a.fecha_compromiso);
      return '<tr class="click" onclick="ACC.editar(\'' + a.id + '\')"><td><b>' + esc(a.id) + '</b><div class="sub"><a href="#/evento/' + a.evento_id + '/acciones" onclick="event.stopPropagation()">' + esc(a.evento_id) + '</a></div></td>' +
        '<td style="min-width:260px">' + esc(a.descripcion) + '<div class="sub"><span class="pill xs ' + ({ Inmediata: "bad", Correctiva: "warn", Preventiva: "info" }[a.tipo] || "") + '">' + esc(a.tipo || "") + '</span>' + (a.origen === "SCAT" ? " · generada desde SCAT" : "") + '</div></td>' +
        '<td class="small" style="min-width:160px">' + (a.causa ? '<b>' + esc(a.causa) + '</b> ' + esc(recorta(CAT.txt(CAT.listaDe(a.causa), a.causa), 50)) : "—") + '</td><td>' + esc(a.responsable || "—") + (a.area_resp ? '<div class="sub">' + esc(a.area_resp) + '</div>' : "") + '</td>' +
        '<td class="tnum nw">' + fFecha(a.fecha_compromiso) + (a.estado !== "Cerrada" && d != null ? '<div class="sub">' + (d < 0 ? "hace " + (-d) + " d" : "en " + d + " d") + '</div>' : a.fecha_cierre ? '<div class="sub">cerró ' + fFecha(a.fecha_cierre) + '</div>' : "") + '</td>' +
        '<td><div class="bar ' + (a.avance >= 100 ? "ok" : "") + '"><i style="width:' + (a.avance || 0) + '%"></i></div><div class="sub">' + (a.avance || 0) + '%</div></td><td>' + L.accPill(a) + '</td>' +
        '<td><span class="pill ' + ({ "Sí": "ok", "No": "bad" }[a.eficacia] || "") + '">' + esc(a.eficacia || "—") + '</span></td></tr>';
    }).join("") + '</tbody></table></div>';
}
function exportarAcciones() {
  var r = [["Código","Evento","Acción","Tipo","Causa","Nivel SCAT","Responsable","Área responsable","Fecha compromiso","Fecha cierre","Estado","Vencida","Avance %","Eficacia","Observaciones"]];
  filtrarAcc().forEach(function (a) { r.push([a.id, a.evento_id, a.descripcion, a.tipo, a.causa ? a.causa + " " + CAT.txt(CAT.listaDe(a.causa), a.causa) : "", a.causa ? CAT.nivelDe(a.causa) : "", a.responsable, a.area_resp, a.fecha_compromiso, a.fecha_cierre, a.estado, L.accVencida(a) ? "Sí" : "No", a.avance, a.eficacia, a.observaciones]); });
  csv("Plan_de_accion_" + hoyISO() + ".csv", r);
}
var ACC = {
  campos: function (ev) {
    var s = (ev && ev.scat) || {}, causas = [];
    [["contactos", s.contactos], ["actos", s.actos], ["condiciones", s.condiciones], ["fPersonales", s.fp], ["fTrabajo", s.ft], ["nac", (s.nac || []).map(function (n) { return n.c; })]].forEach(function (p) {
      (p[1] || []).forEach(function (c) { causas.push({ v: c, t: c + " · " + recorta(CAT.txt(p[0], c), 60), g: CAT.nivelDe(c) }); });
    });
    return [{ k: "descripcion", label: "Acción correctiva / preventiva", type: "textarea", req: true, col: "span2" },
      { k: "tipo", label: "Tipo", type: "select", req: true, opts: CAT.accTipo }, { k: "causa", label: "Causa que ataca", type: "select", opts: causas },
      { k: "responsable_dni", label: "Responsable", type: "select", req: true, opts: S.equipo.map(function (u) { return { v: u.dni, t: u.nombre + " · " + ((CAT.roles[u.rol] || {}).t || u.rol) }; }) },
      { k: "fecha_compromiso", label: "Fecha compromiso", type: "date", req: true }, { k: "estado", label: "Estado", type: "select", req: true, opts: CAT.accEstado },
      { k: "avance", label: "% de avance", type: "number", min: 0, max: 100 }, { k: "verificacion", label: "Cómo se verificará", ph: "Ej.: registro de difusión firmado", col: "span2" },
      { k: "observaciones", label: "Observaciones / avance", type: "textarea", col: "span2" }];
  },
  editar: function (id, eventoId, preset) {
    var a = id ? clone(S.acciones.filter(function (x) { return x.id === id; })[0]) : Object.assign({ evento_id: eventoId, estado: "Pendiente", avance: 0, eficacia: "En verificación", tipo: "Correctiva", origen: "Manual" }, preset || {});
    var ev = L.evento(a.evento_id), r = L.rol(), esResp = a.responsable_dni === S.user.dni, sst = L.es("ADMIN","SST");
    var puede = ev && ev.estado !== "Anulado" && r !== "COMITE" && (sst || esResp || (r === "JEFE" && L.enMiArea(ev))) && !(a.estado === "Cerrada" && a.eficacia === "Sí" && !sst);
    var C = ACC.campos(ev), CE = [{ k: "eficacia", label: "Eficacia verificada (Supervisor SST)", type: "select", opts: CAT.eficacia }, { k: "verificacion_nota", label: "Sustento de la verificación", col: "span2" }];
    modal({ title: id ? "Acción " + id + " · " + a.evento_id : "Nueva acción · " + a.evento_id, wide: true,
      body: '<div id="acF">' + formHTML(C, a, !puede) + '<hr class="sep">' + formHTML(CE, a, !(puede && sst), "g3") + '</div><hr class="sep"><div class="sub-h">Evidencia de cumplimiento</div>' + (id ? adjuntosHTML("acciones", a, sst) : "") +
        (puede ? '<label class="drop mt" for="acFile">📎 Adjuntar evidencia (fotos, registros, actas)<input type="file" id="acFile" multiple hidden onchange="document.getElementById(\'acFileN\').textContent=this.files.length+\' archivo(s) listo(s)\'"></label><div class="small muted" id="acFileN"></div>' : "") +
        (a.actualizado ? '<p class="small muted mt">Última modificación: ' + esc(a.actualizado_por || "") + ' · ' + fFechaHora(a.actualizado) + '</p>' : ""),
      ok: puede ? "Guardar" : null, cancel: puede ? "Cancelar" : "Cerrar",
      onOpen: function (m) { var est = $('[data-k="estado"]', m), av = $('[data-k="avance"]', m); if (est) est.addEventListener("change", function () { if (est.value === "Cerrada") av.value = 100; }); },
      onOk: function (m) {
        var o = leerForm($("#acF", m), C, a); if (!o) return false; if (sst) leerForm($("#acF", m), CE, o);
        var u = S.equipo.filter(function (x) { return x.dni === o.responsable_dni; })[0]; o.responsable = u ? u.nombre : "";
        o.avance = Math.max(0, Math.min(100, Number(o.avance || 0)));
        var files = $("#acFile", m) ? $("#acFile", m).files : [];
        if (o.estado === "Cerrada" && !files.length && !(a.adjuntos || []).length) { toast("Para cerrar la acción adjunta la evidencia de cumplimiento.", "bad"); return false; }
        return App.guardar("acciones", o).then(function (r) { if (!r) return false; return subirArchivos("acciones", r.id, files, "Evidencia de cumplimiento").then(function () { toast("Acción " + r.id + " guardada", "ok"); App.recargar(); }); });
      } });
  }
};

/* ---------- INDICADORES ---------- */
Views.indicadores = function () {
  var anio = S.anio, I = L.indicadores(anio), T = I.total, ed = L.es("ADMIN","SST") && !S.fArea;
  App.titulo("Indicadores de seguridad", "F-SST-PR-03-03 · Datos estadísticos · Ley 29783 / R.M. 050-2013-TR", selectorArea() + selectorAnio() + '<button class="btn" onclick="exportarInd()">⬇ <span class="hide-sm">Exportar</span></button>');
  var inp = function (v, fn, w) { return '<input class="cell-in tnum" style="width:' + w + 'px" type="number" min="0" value="' + (v || "") + '" onchange="' + fn + '">'; };
  $("#view").innerHTML = (S.fArea ? '<div class="callout warn mb">Filtrado por ' + esc(S.fArea) + ': las HHT son de toda la empresa, por lo que los índices del filtro son referenciales.</div>' : "") +
    '<div class="kpis">' + kpi("HHT acumuladas", T.hht, "horas-hombre trabajadas", "") + kpi("Acc. incapacitantes + mortales", T.acc, "numerador del IF", T.acc ? "bad" : "ok") + kpi("Días perdidos", T.dp, "desde descansos médicos AT", T.dp ? "warn" : "ok") +
    kpi("IF anual", T.IF.toFixed(2), "meta ≤ " + CONFIG.META_IF, T.IF <= CONFIG.META_IF ? "ok" : "bad", null, null, 2) + kpi("IS anual", T.IS.toFixed(2), "meta ≤ " + CONFIG.META_IS, T.IS <= CONFIG.META_IS ? "ok" : "bad", null, null, 2) + kpi("IA anual", T.IA.toFixed(2), "IF × IS / 1000", "", null, null, 2) + '</div>' +
    '<div class="card mb"><h3>Índices mensuales ' + anio + (ed ? ' <small>— edita HHT y N.° de trabajadores; lo demás es automático</small>' : "") + '</h3><div class="tbl-wrap"><table class="t"><thead><tr><th>Mes</th><th class="num">N.° trab.</th><th class="num">HHT</th><th class="num">Eventos</th><th class="num">Acc. leves</th><th class="num">Incidentes</th><th class="num">Acc. incap./mort.</th><th class="num">Días perdidos</th><th class="num">IF</th><th class="num">IS</th><th class="num">IA</th></tr></thead><tbody>' +
    I.filas.map(function (f) {
      return '<tr><td><b>' + f.mes + '</b></td><td class="num">' + (ed ? inp(f.trab, "guardarHHT(" + f.n + ",null,this.value)", 70) : f.trab) + '</td><td class="num">' + (ed ? inp(f.hht, "guardarHHT(" + f.n + ",this.value,null)", 96) : fmt(f.hht)) + '</td>' +
        '<td class="num">' + f.eventos + '</td><td class="num">' + f.leves + '</td><td class="num">' + f.inc + '</td><td class="num">' + f.acc + '</td><td class="num">' + f.dp + '</td>' +
        '<td class="num ' + (f.IF > CONFIG.META_IF ? "t-bad" : "") + '">' + fmt(f.IF, 2) + '</td><td class="num ' + (f.IS > CONFIG.META_IS ? "t-bad" : "") + '">' + fmt(f.IS, 2) + '</td><td class="num">' + fmt(f.IA, 2) + '</td></tr>';
    }).join("") + '<tr class="tot"><td>TOTAL</td><td></td><td class="num">' + fmt(T.hht) + '</td><td class="num">' + T.eventos + '</td><td class="num">' + T.leves + '</td><td class="num">' + T.inc + '</td><td class="num">' + T.acc + '</td><td class="num">' + T.dp + '</td><td class="num">' + fmt(T.IF, 2) + '</td><td class="num">' + fmt(T.IS, 2) + '</td><td class="num">' + fmt(T.IA, 2) + '</td></tr></tbody></table></div>' +
    '<p class="small muted">IF = accidentes incapacitantes y mortales × 1 000 000 / HHT · IS = días perdidos × 1 000 000 / HHT · IA = IF × IS / 1000. Los días perdidos salen de los descansos médicos de origen «Accidente de trabajo» (no observados) y se asignan al mes del evento.</p></div>' +
    '<div class="row2"><div class="card"><h3>Tendencia IF · IS vs meta</h3><div class="chart-box"><canvas id="chIdx"></canvas></div></div><div class="card"><h3>Índice de accidentabilidad (IA)</h3><div class="chart-box"><canvas id="chIA"></canvas></div></div></div>';
  UI.contar($("#view"));
  chart("chIdx", { type: "line", data: { labels: MESES, datasets: [
    { label: "IF", data: I.filas.map(function (f) { return +f.IF.toFixed(2); }), borderColor: "#dc2626", backgroundColor: "rgba(220,38,38,.12)", fill: true, tension: .35 },
    { label: "Meta IF", data: MESES.map(function () { return CONFIG.META_IF; }), borderColor: "#dc2626", borderDash: [6, 5], pointRadius: 0, borderWidth: 1.5 },
    { label: "IS", data: I.filas.map(function (f) { return +f.IS.toFixed(2); }), borderColor: "#0284c7", backgroundColor: "rgba(2,132,199,.10)", fill: true, tension: .35, yAxisID: "y1" }] },
    options: { scales: { y: { title: { display: true, text: "IF" } }, y1: { position: "right", grid: { display: false }, title: { display: true, text: "IS" } } } } });
  chart("chIA", { type: "bar", data: { labels: MESES, datasets: [{ label: "IA", data: I.filas.map(function (f) { return +f.IA.toFixed(2); }), backgroundColor: "#7c3aed", borderRadius: 6 }] }, options: { plugins: { legend: { display: false } } } });
};
function guardarHHT(mes, hht, trab) {
  var h = clone(S.hht.filter(function (x) { return +x.anio === S.anio && +x.mes === mes; })[0] || { anio: S.anio, mes: mes, hht: 0, trabajadores: 0 });
  if (hht != null) h.hht = Number(hht || 0); if (trab != null) h.trabajadores = Number(trab || 0);
  App.guardar("hht", h).then(function (r) { if (r) { toast("HHT " + MESES[mes - 1] + " guardadas", "ok"); App.route(); } });
}
function exportarInd() {
  var I = L.indicadores(S.anio), r = [["Mes","N° trabajadores","HHT","Eventos","Acc. leves","Incidentes","Acc. incapacitantes+mortales","Días perdidos","IF","IS","IA"]];
  I.filas.forEach(function (f) { r.push([f.mes, f.trab, f.hht, f.eventos, f.leves, f.inc, f.acc, f.dp, f.IF.toFixed(2), f.IS.toFixed(2), f.IA.toFixed(2)]); });
  var T = I.total; r.push(["TOTAL", "", T.hht, T.eventos, T.leves, T.inc, T.acc, T.dp, T.IF.toFixed(2), T.IS.toFixed(2), T.IA.toFixed(2)]);
  csv("F-SST-PR-03-03_Estadisticas_" + S.anio + ".csv", r);
}

/* ---------- TRAZABILIDAD ---------- */
Views.auditoria = function () {
  if (!L.es("ADMIN","SST")) { location.hash = "#/tablero"; return; }
  App.titulo("Trazabilidad", "Bitácora inmutable: quién hizo qué, cuándo y qué cambió", '<button class="btn" onclick="exportarAud()">⬇ Exportar</button>');
  $("#view").innerHTML = '<div class="toolbar"><input type="search" id="audQ" placeholder="Buscar usuario, registro, detalle…" oninput="pintarAudD()"><select id="audA" onchange="pintarAud()"><option value="">Acción: todas</option></select><select id="audE" onchange="pintarAud()"><option value="">Entidad: todas</option></select></div><div id="audList"><div class="empty"><div class="spin" style="margin:auto"></div></div></div>';
  API.call("auditoria", {}).then(function (r) {
    if (!r.ok) return toast(r.msg || r.error, "bad");
    S.aud = r.filas; var ac = {}, en = {}; r.filas.forEach(function (f) { ac[f.accion] = 1; en[f.entidad] = 1; });
    $("#audA").innerHTML += Object.keys(ac).sort().map(function (x) { return '<option>' + esc(x) + '</option>'; }).join("");
    $("#audE").innerHTML += Object.keys(en).sort().map(function (x) { return '<option>' + esc(x) + '</option>'; }).join("");
    pintarAud();
  });
};
var pintarAudD = debounce(function () { pintarAud(); }, 160);
function filtrarAud() {
  var q = (($("#audQ") || {}).value || "").toLowerCase(), a = ($("#audA") || {}).value, e = ($("#audE") || {}).value;
  return (S.aud || []).filter(function (f) { return (!a || f.accion === a) && (!e || f.entidad === e) && (!q || [f.nombre, f.dni, f.entidad_id, f.detalle].join(" ").toLowerCase().indexOf(q) >= 0); });
}
function pintarAud() {
  var L2 = filtrarAud(), el = $("#audList"); if (!el) return;
  el.innerHTML = !L2.length ? '<div class="card empty">Sin registros.</div>' : '<div class="tbl-wrap"><table class="t"><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Registro</th><th>Detalle (antes → después)</th></tr></thead><tbody>' +
    L2.slice(0, 500).map(function (f) {
      return '<tr><td class="tnum nw">' + fFechaHora(f.ts) + '</td><td>' + esc(f.nombre) + '<div class="sub">' + esc(f.rol) + '</div></td><td><span class="pill info">' + esc(f.accion) + '</span></td>' +
        '<td>' + esc(f.entidad) + '<div class="sub">' + (f.entidad === "eventos" ? '<a href="#/evento/' + esc(f.entidad_id) + '">' + esc(f.entidad_id) + '</a>' : esc(f.entidad_id)) + '</div></td><td class="small" style="max-width:560px;word-break:break-word">' + esc(f.detalle) + '</td></tr>';
    }).join("") + '</tbody></table></div><p class="small muted">' + L2.length + ' registro(s)' + (L2.length > 500 ? " · se muestran 500; exporta para ver todos" : "") + '</p>';
}
function exportarAud() { var r = [["Fecha","DNI","Usuario","Rol","Acción","Entidad","Registro","Detalle"]]; filtrarAud().forEach(function (f) { r.push([f.ts, f.dni, f.nombre, f.rol, f.accion, f.entidad, f.entidad_id, f.detalle]); }); csv("Auditoria_SCAT_" + hoyISO() + ".csv", r); }

/* ---------- USUARIOS ---------- */
Views.usuarios = function () {
  if (L.rol() !== "ADMIN") { location.hash = "#/tablero"; return; }
  App.titulo("Usuarios y accesos", "Alta, roles, áreas ▸ divisiones y restablecimiento de contraseñas", '<button class="btn primary" onclick="USR.editar()">＋ Nuevo usuario</button>');
  $("#view").innerHTML = '<div class="card mb"><h3>Roles del sistema</h3><div class="grid g3">' + Object.keys(CAT.roles).map(function (k) { return '<div class="role-c"><span class="pill info">' + k + '</span> <b>' + CAT.roles[k].t + '</b><div class="small muted">' + CAT.roles[k].desc + '</div></div>'; }).join("") + '</div>' +
    '<p class="small muted mt">Áreas y divisiones sincronizadas con el Panel SSOMA (' + ({ panel: "en línea", cache: "copia local", respaldo: "respaldo interno" }[S.fuenteAreas] || "…") + ') · ' + CAT.divisiones.length + ' divisiones.</p></div><div id="usrList"><div class="empty"><div class="spin" style="margin:auto"></div></div></div>';
  API.call("usuarios").then(function (r) {
    if (!r.ok) return toast(r.msg || r.error, "bad");
    S.usuarios = r.usuarios;
    $("#usrList").innerHTML = '<div class="tbl-wrap"><table class="t"><thead><tr><th>DNI</th><th>Nombre</th><th>Rol</th><th>Alcance</th><th>Correo</th><th>Estado</th><th>Último acceso</th><th></th></tr></thead><tbody>' +
      r.usuarios.map(function (u) {
        return '<tr><td class="tnum">' + esc(u.dni) + '</td><td><b>' + esc(u.nombre) + '</b><div class="sub">' + esc(u.cargo || "") + '</div></td><td><span class="pill info">' + esc(u.rol) + '</span></td><td class="small">' + (u.area === "*" ? "Todas" : String(u.area).split(";").map(areaChip).join(" ")) + '</td><td class="small">' + esc(u.correo) + '</td>' +
          '<td>' + (u.activo ? '<span class="pill ok">Activo</span>' : '<span class="pill">Inactivo</span>') + (u.debe_cambiar ? '<div class="sub">clave temporal</div>' : "") + '</td><td class="small nw">' + fFechaHora(u.ultimo_acceso) + '</td>' +
          '<td class="nw"><button class="btn sm" onclick="USR.editar(\'' + u.dni + '\')">Editar</button> <button class="btn sm" onclick="USR.reset(\'' + u.dni + '\')">Clave</button></td></tr>';
      }).join("") + '</tbody></table></div>';
  });
};
var USR = {
  editar: function (dni) {
    var u = dni ? clone(S.usuarios.filter(function (x) { return x.dni === dni; })[0]) : { activo: true, rol: "JEFE" }, sel = String(u.area || "").split(/\s*;\s*/);
    var C = [{ k: "dni", label: "DNI / CE", req: true, dis: !!dni }, { k: "nombre", label: "Nombres y apellidos", req: true }, { k: "cargo", label: "Cargo (aparece en las firmas)" }, { k: "correo", label: "Correo (recibe alertas)", type: "email" },
      { k: "rol", label: "Rol", type: "select", req: true, opts: Object.keys(CAT.roles).map(function (k) { return { v: k, t: CAT.roles[k].t }; }) }, { k: "activo", label: "Usuario activo", type: "check" }];
    var ck = function (v, t, cls) { return '<label class="chk ' + (sel.indexOf(v) >= 0 ? "on " : "") + (cls || "") + '"><input type="checkbox" value="' + esc(v) + '" ' + (sel.indexOf(v) >= 0 ? "checked" : "") + ' onchange="this.parentNode.classList.toggle(\'on\',this.checked)"> ' + t + '</label>'; };
    modal({ title: dni ? "Editar usuario" : "Nuevo usuario", wide: true,
      body: '<div id="usF">' + formHTML(C, u) + '<div class="sub-h mt">Alcance (áreas ▸ divisiones del Panel SSOMA)</div>' + ck("*", "<b>Todas las áreas</b>") +
        CAT.areas().map(function (a) { return '<div class="area-g">' + ck(a, "<b>" + esc(a) + "</b> (toda el área)", "strong") + '<div class="opts">' + CAT.divisiones.filter(function (d) { return CAT.areaDe(d) === a; }).map(function (d) { return ck(d, esc(CAT.divDe(d))); }).join("") + '</div></div>'; }).join("") + '</div>',
      ok: "Guardar", onOk: function (m) {
        var o = leerForm($("#usF", m), C, u); if (!o) return false;
        var ar = $$("input[type=checkbox][value]", m).filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
        o.area = ar.indexOf("*") >= 0 ? "*" : ar.join(";"); if (!o.area) { toast("Asigna al menos un área o división", "bad"); return false; }
        return API.call("usuario_guardar", { usuario: o }).then(function (r) {
          if (!r.ok) { toast(r.msg || r.error, "bad"); return false; }
          if (r.temporal) modal({ title: "Usuario creado", body: '<p>Credenciales de primer ingreso (deberá cambiar la contraseña al entrar):</p><div class="callout info"><div>Usuario: <b>' + esc(o.dni) + '</b><br>Contraseña inicial: <b style="font-size:17px">su DNI / CE (' + esc(r.temporal) + ')</b></div></div>', cancel: "Listo" });
          App.cargar().then(function () { location.hash = "#/usuarios"; Views.usuarios(); });
        });
      } });
  },
  reset: function (dni) {
    confirmar("Restablecer contraseña", "La contraseña de " + dni + " volverá a ser su DNI / CE. Deberá cambiarla al ingresar.", "Restablecer").then(function () {
      API.call("usuario_reset", { dni: dni }).then(function (r) { if (!r.ok) return toast(r.msg || r.error, "bad"); modal({ title: "Contraseña restablecida", body: '<div class="callout info"><div>Usuario: <b>' + esc(dni) + '</b><br>Contraseña inicial: <b style="font-size:17px">su DNI / CE</b><br>Se le pedirá cambiarla al ingresar.</div></div>', cancel: "Listo" }); });
    });
  }
};

/* ---------- MI CUENTA ---------- */
Views.cuenta = function () {
  var u = S.user, r = CAT.roles[u.rol] || {};
  App.titulo("Mi cuenta", "");
  $("#view").innerHTML = '<div class="card" style="max-width:680px"><div class="flex mb"><div class="av lg">' + iniciales(u.nombre) + '</div><div><b style="font-size:17px">' + esc(u.nombre) + '</b><div class="muted">DNI ' + esc(u.dni) + ' · ' + esc(u.cargo || "") + ' · ' + esc(u.correo || "sin correo") + '</div></div></div>' +
    '<div class="plazo"><span>Rol</span><b>' + esc(r.t || u.rol) + '</b></div><div class="plazo"><span>Qué puedes hacer</span><span class="small">' + esc(r.desc || "") + '</span></div>' +
    '<div class="plazo"><span>Alcance</span><span>' + (u.area === "*" ? "Todas las áreas" : String(u.area).split(";").map(areaChip).join(" ")) + '</span></div>' +
    '<div class="flex mt"><button class="btn primary" onclick="App.cambiarClave()">Cambiar contraseña</button><button class="btn" onclick="App.logout()">Cerrar sesión</button></div></div>';
};
