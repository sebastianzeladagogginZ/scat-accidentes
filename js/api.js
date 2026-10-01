/* ============================================================
   CONFIGURACIÓN + CAPA DE API
   ENDPOINT_URL vacío → MODO DEMO (todo en este navegador, localStorage)
   ENDPOINT_URL lleno → producción (Apps Script + Google Sheets + Drive)
   ============================================================ */
var CONFIG = {
  ENDPOINT_URL: "https://script.google.com/macros/s/AKfycbzmr1eNudPIf_2bkQm4kjw54Dnm1RgYvrr2jLyt9PWpAgX_SGwuX3O3cSNWGl4XRQbn/exec",
  // Panel SSOMA: de aquí se leen las áreas ▸ divisiones vigentes (?action=areas, lectura pública sin DNIs)
  PANEL_SSOMA_URL: "https://script.google.com/macros/s/AKfycbwcwca3e3ERoz5gfV0WovRSri0slBu9uimKykB4ThxIsja7_LEX-Q9dRP69OnWDDGHmZw/exec",
  EMPRESA: "Optical Networks S.A.C.",
  RUC: "",
  PLAZO_INICIO_INV_H: 24,    // SST-PR-03 §6.3.1
  PLAZO_INFORME_DIAS: 3,     // §6.3.8 (plazo interno, "en lo posible 24 h")
  PLAZO_MTPE_H: 24,          // Ley 29783 art. 82
  META_IF: 5, META_IS: 100,  // metas anuales para los medidores del tablero
  SELFIE_PX: 260, FIRMA_W: 420, FIRMA_H: 150
};
var APP_VERSION = "V2.6";

var API = {
  token: null,
  call: function (action, payload) {
    var body = Object.assign({ action: action, token: API.token }, payload || {});
    if (!CONFIG.ENDPOINT_URL) return new Promise(function (res) { setTimeout(function () { res(MOCK.handle(JSON.parse(JSON.stringify(body)))); }, 60); });
    return fetch(CONFIG.ENDPOINT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: "red", msg: "Sin conexión con el servidor. Revisa tu internet." }; });
  },
  /* Áreas ▸ divisiones desde el Panel SSOMA (con caché local y respaldo) */
  areasPanel: function () {
    var cache = null; try { cache = JSON.parse(localStorage.getItem("scat_areas") || "null"); } catch (e) {}
    if (cache && cache.lista) CAT.setDivisiones(cache.lista); else CAT.setDivisiones([]);
    if (!CONFIG.PANEL_SSOMA_URL) return Promise.resolve("respaldo");
    var ctrl = window.AbortController ? new AbortController() : null;
    if (ctrl) setTimeout(function () { ctrl.abort(); }, 8000);
    return fetch(CONFIG.PANEL_SSOMA_URL + "?action=areas", { signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !(d.areas || []).length) return cache ? "cache" : "respaldo";
        CAT.setDivisiones(d.areas);
        try { localStorage.setItem("scat_areas", JSON.stringify({ ts: Date.now(), lista: d.areas })); } catch (e) {}
        return "panel";
      })
      .catch(function () { return cache ? "cache" : "respaldo"; });
  }
};

/* ============================================================
   MOCK — réplica local del backend (mismas reglas que Codigo.gs)
   ============================================================ */
var MOCK = (function () {
  var KEY = "scat_demo_v2", db;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn("demo: almacenamiento lleno"); } }
  function load() { if (db) return; try { db = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { db = null; } if (!db || !db.usuarios) { db = seed(); save(); } db.dispositivos = db.dispositivos || []; }
  function revocar(dni, excepto) { db.dispositivos.forEach(function (d) { if (d.dni === dni && d.codigo !== excepto) d.activo = false; }); }
  function now() { return new Date().toISOString(); }
  function pad(n, l) { return ("0000" + n).slice(-l); }
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function audit(u, accion, ent, id, det) { db.auditoria.push({ ts: now(), dni: u.dni || "", nombre: u.nombre, rol: u.rol, accion: accion, entidad: ent, entidad_id: id || "", detalle: det || "" }); }
  function scope(u) { return String(u.area || "").split(/\s*;\s*/).filter(String); }
  function veTodo(u) { return ["ADMIN","SST","MEDICO","COMITE"].indexOf(u.rol) >= 0 || scope(u).indexOf("*") >= 0; }
  function cubre(u, div) { var s = scope(u); return s.indexOf("*") >= 0 || s.indexOf(div) >= 0 || s.indexOf(CAT.areaDe(div)) >= 0; }
  function alcance(u, div, rep) { if (veTodo(u)) return true; if (u.rol === "REPORTANTE") return rep === u.dni; return cubre(u, div) || rep === u.dni; }
  var MED = ["ADMIN","SST","MEDICO"], CAMPOS_MED = ["diagnostico","cie10","medico","cmp","observacion_medica"];
  function filtrarMed(u, d) {
    d = cp(d); if (MED.indexOf(u.rol) >= 0) return d;
    CAMPOS_MED.forEach(function (k) { if (d[k]) d[k] = "🔒 reservado"; });
    d.adjuntos = (d.adjuntos || []).map(function (a) { return { id: a.id, nombre: "Sustento médico (reservado)", categoria: a.categoria, ts: a.ts, por: a.por, reservado: true }; });
    return d;
  }
  function pub(x) { return { dni: x.dni, nombre: x.nombre, correo: x.correo, area: x.area, rol: x.rol, cargo: x.cargo || "" }; }
  function diff(a, b) {
    if (!a) return "Registro creado";
    var ks = {}, c = []; Object.keys(a).concat(Object.keys(b)).forEach(function (k) { ks[k] = 1; });
    Object.keys(ks).forEach(function (k) {
      if (["version","actualizado","actualizado_por"].indexOf(k) >= 0) return;
      var x = JSON.stringify(a[k] === undefined ? "" : a[k]), y = JSON.stringify(b[k] === undefined ? "" : b[k]);
      if (x !== y) c.push(k + ": " + (x.length > 120 ? x.slice(0, 117) + "…" : x) + " → " + (y.length > 120 ? y.slice(0, 117) + "…" : y));
    });
    return c.length ? c.join(" | ") : "Sin cambios";
  }
  function dias(a, b) { if (!a || !b) return 0; var d = Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5) + 1; return d > 0 ? d : 0; }
  function sesion(t) { var dni = db.sesiones[t]; if (!dni) return null; var x = db.usuarios.filter(function (u) { return u.dni === dni && u.activo; })[0]; return x ? pub(x) : null; }
  var PROT = { eventos: ["estado","flujo","adjuntos","comentarios","reportado_por","reportado_nombre","creado","id"], acciones: ["adjuntos","creado","creado_por","id"], descansos: ["adjuntos","creado","creado_por","id","validado_por","validado_ts"], hht: ["id"] };
  function byId(t, id) { return db[t].filter(function (x) { return x.id === id; })[0]; }

  function puede(u, ent, antes, nuevo) {
    var r = u.rol;
    if (r === "COMITE") return "El Comité SST tiene acceso de consulta, observaciones y firma.";
    if (ent === "hht") return (r === "ADMIN" || r === "SST") ? true : "Solo SSOMA registra horas-hombre.";
    if (ent === "eventos") {
      if (!antes) return true;
      if (["Cerrado","Anulado"].indexOf(antes.estado) >= 0) return "El evento está " + antes.estado.toLowerCase() + ".";
      if (r === "ADMIN") return true;
      if (["Aprobado","En revisión"].indexOf(antes.estado) >= 0) return "El evento está " + antes.estado.toLowerCase() + "; solo el administrador puede editarlo.";
      if (r === "SST") return true;
      if (r === "JEFE" && alcance(u, antes.area, antes.reportado_por)) return true;
      if (r === "REPORTANTE" && antes.reportado_por === u.dni && antes.estado === "Reportado") return true;
      return "No puedes editar eventos fuera de tu área.";
    }
    if (ent === "acciones") {
      var ev = byId("eventos", nuevo.evento_id || (antes && antes.evento_id));
      if (!ev) return "Evento no encontrado."; if (ev.estado === "Anulado") return "Evento anulado.";
      if (r === "ADMIN" || r === "SST") return true;
      if (antes && antes.eficacia === "Sí" && antes.estado === "Cerrada") return "Acción cerrada y verificada.";
      if (antes && antes.responsable_dni === u.dni) return nuevo.eficacia !== antes.eficacia ? "La eficacia la verifica el Supervisor SST." : true;
      if (r === "JEFE" && alcance(u, ev.area, ev.reportado_por)) return (antes && nuevo.eficacia !== antes.eficacia) ? "La eficacia la verifica el Supervisor SST." : true;
      return "Solo el responsable, el jefe de la división o SSOMA pueden modificar esta acción.";
    }
    if (ent === "descansos") {
      if (MED.indexOf(r) >= 0) return true;
      if (r === "JEFE") return (antes && antes.estado === "Validado") ? "Descanso ya validado por el área médica." : true;
      return "Sin permiso para registrar descansos médicos.";
    }
    return "Sin permiso.";
  }
  function autoCerrar(evId) {
    var ev = byId("eventos", evId); if (!ev || ev.estado !== "Aprobado") return;
    var acc = db.acciones.filter(function (a) { return a.evento_id === evId; });
    if (!acc.length || !acc.every(function (a) { return a.estado === "Cerrada" && a.eficacia === "Sí"; })) return;
    ev.flujo.push({ ts: now(), de: "Aprobado", a: "Cerrado", por: "Sistema (cierre automático)", rol: "SISTEMA", comentario: "Todas las acciones cerradas y con eficacia verificada." });
    ev.estado = "Cerrado"; ev.cerrado_ts = now(); ev.version++;
    audit({ nombre: "Sistema", rol: "SISTEMA" }, "cierre_automatico", "eventos", evId, "Aprobado → Cerrado");
  }
  function validarInv(d) {
    var s = d.scat || {}, f = [];
    if (!s.gravedad || !s.probabilidad) f.push("potencial de pérdida");
    if (!(s.contactos || []).length) f.push("tipo de contacto");
    if (!((s.actos || []).length + (s.condiciones || []).length)) f.push("causas inmediatas");
    if (!((s.fp || []).length + (s.ft || []).length)) f.push("causas básicas");
    if (!(s.nac || []).length) f.push("elementos NAC");
    if (!(d.equipo || []).length) f.push("equipo investigador");
    if (d.mtpe24 && !(d.mtpe || {}).fecha) f.push("notificación al MTPE");
    if (!db.acciones.some(function (a) { return a.evento_id === d.id; })) f.push("plan de acción");
    return f;
  }
  var TRANS = {
    "Reportado>En investigación": ["ADMIN","SST","JEFE"], "Observado>En investigación": ["ADMIN","SST","JEFE"],
    "En investigación>En revisión": ["ADMIN","SST","JEFE"], "Observado>En revisión": ["ADMIN","SST","JEFE"],
    "En revisión>Observado": ["ADMIN","SST","COMITE"], "En revisión>Aprobado": ["ADMIN","SST"],
    "Aprobado>Cerrado": ["ADMIN","SST"], "Aprobado>En investigación": ["ADMIN"], "Cerrado>En investigación": ["ADMIN"]
  };

  var H = {
    login: function (b) {
      var dni = String(b.dni || "").replace(/\D/g, ""), x = db.usuarios.filter(function (u) { return u.dni === dni; })[0];
      if (!x || !x.activo) return { ok: false, error: "credenciales", msg: "Ese documento no está registrado o está inactivo. Solicita tu acceso a SSOMA." };   // ingreso solo con DNI / CE
      var t = "demo-" + Math.random().toString(36).slice(2); db.sesiones[t] = dni; x.ultimo_acceso = now();
      audit(pub(x), "login", "sesion", dni, "Inicio de sesión");
      var eq = null;
      if (b.recordar) { eq = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); db.dispositivos.push({ dni: dni, codigo: eq, expira: Date.now() + 30 * 864e5, activo: true }); }
      save();
      return { ok: true, token: t, user: pub(x), debe_cambiar: !!x.debe_cambiar, equipo: eq, equipo_dias: 30 };
    },
    login_equipo: function (b) {
      var dni = String(b.dni || "").replace(/\D/g, ""), x = db.usuarios.filter(function (u) { return u.dni === dni && u.activo; })[0];
      var eq = db.dispositivos.filter(function (d) { return d.dni === dni && d.codigo === b.equipo && d.activo && d.expira > Date.now(); })[0];
      if (!x || !eq || x.debe_cambiar) return { ok: false, error: "equipo_invalido", msg: "Este equipo ya no está recordado. Ingresa con tu contraseña." };
      var t = "demo-" + Math.random().toString(36).slice(2); db.sesiones[t] = dni; x.ultimo_acceso = now();
      audit(pub(x), "login_equipo", "sesion", dni, "Ingreso con equipo recordado"); save();
      return { ok: true, token: t, user: pub(x), debe_cambiar: false };
    },
    olvidar_equipo: function (b) { db.dispositivos.forEach(function (d) { if (d.codigo === b.equipo) d.activo = false; }); save(); return { ok: true }; },
    equipos_revocar: function (b, u) { revocar(u.dni, ""); audit(u, "equipos_revocar", "usuario", u.dni, "Cerró sesión en todos sus equipos recordados"); save(); return { ok: true }; },
    logout: function (b) { delete db.sesiones[b.token]; save(); return { ok: true }; },
    cambiar_clave: function (b, u) {
      var x = db.usuarios.filter(function (v) { return v.dni === u.dni; })[0];
      if (x.clave !== b.actual) return { ok: false, msg: "La contraseña actual no es correcta." };
      if (String(b.nueva).length < 8 || !/[0-9]/.test(b.nueva) || !/[A-Za-z]/.test(b.nueva)) return { ok: false, msg: "Mínimo 8 caracteres con letras y números." };
      if (String(b.nueva).indexOf(u.dni) >= 0) return { ok: false, msg: "La nueva contraseña no puede contener tu DNI / CE." };
      x.clave = b.nueva; x.debe_cambiar = false; revocar(u.dni, b.equipo); audit(u, "cambiar_clave", "usuario", u.dni, "Cambió su contraseña (otros equipos recordados revocados)"); save(); return { ok: true };
    },
    bootstrap: function (b, u) {
      var ev = db.eventos.filter(function (e) { return alcance(u, e.area, e.reportado_por); }), ids = {};
      ev.forEach(function (e) { ids[e.id] = 1; });
      var ac = db.acciones.filter(function (a) { return ids[a.evento_id] || a.responsable_dni === u.dni; });
      var dm = u.rol === "REPORTANTE" ? [] : db.descansos.filter(function (d) { return veTodo(u) || ids[d.evento_id] || cubre(u, d.area); }).map(function (d) { return filtrarMed(u, d); });
      var fr = {}; db.firmas.forEach(function (f) { if (ids[f.evento_id]) (fr[f.evento_id] = fr[f.evento_id] || []).push({ id: f.id, doc: f.doc, slot: f.slot, nombre: f.nombre, ts: f.ts, hash: f.hash }); });
      return { ok: true, user: u, server_ts: now(), eventos: cp(ev), acciones: cp(ac), descansos: dm, hht: cp(db.hht), equipo: db.usuarios.filter(function (x) { return x.activo; }).map(pub), firmasResumen: fr };
    },
    guardar: function (b, u) {
      var ent = b.entidad; if (!PROT[ent]) return { ok: false, msg: "Entidad inválida" };
      var reg = b.registro, previo = ent === "hht" ? byId(ent, reg.anio + "-" + pad(reg.mes, 2)) : (reg.id ? byId(ent, reg.id) : null);
      if (previo && ent !== "hht" && previo.version !== reg.version) return { ok: false, error: "conflicto", msg: "Otro usuario modificó este registro. Se recargaron los datos." };
      var p = puede(u, ent, previo, reg); if (p !== true) return { ok: false, error: "sin_permiso", msg: p };
      var antes = previo ? cp(previo) : null, d = cp(reg); delete d.version; delete d.actualizado; delete d.actualizado_por;
      if (antes) {
        PROT[ent].forEach(function (k) { if (k in antes) d[k] = antes[k]; else delete d[k]; });
        if (ent === "descansos" && MED.indexOf(u.rol) < 0) { CAMPOS_MED.forEach(function (k) { d[k] = antes[k]; }); d.estado = antes.estado; }
      } else {
        d.creado = now(); d.creado_por = u.dni; d.adjuntos = [];
        if (ent === "eventos") {
          var pre = "EV-" + String(d.fecha).slice(0, 4) + "-", mx = 0;
          db.eventos.forEach(function (e) { if (e.id.indexOf(pre) === 0) mx = Math.max(mx, +e.id.slice(pre.length)); });
          d.id = pre + pad(mx + 1, 3); d.estado = "Reportado"; d.reportado_por = u.dni; d.reportado_nombre = u.nombre;
          d.flujo = [{ ts: now(), de: "", a: "Reportado", por: u.nombre, dni: u.dni, rol: u.rol, comentario: "Evento reportado" }]; d.comentarios = [];
        } else if (ent === "acciones" || ent === "descansos") {
          var pf = ent === "acciones" ? "AC-" : "DM-", m2 = 0;
          db[ent].forEach(function (e) { if (e.id.indexOf(pf) === 0) m2 = Math.max(m2, +e.id.slice(3)); });
          d.id = pf + pad(m2 + 1, 4);
          if (ent === "descansos" && MED.indexOf(u.rol) < 0) d.estado = "Pendiente";
        } else d.id = d.anio + "-" + pad(d.mes, 2);
      }
      if (ent === "descansos") { d.dias = dias(d.inicio, d.fin); if (antes && d.estado !== antes.estado && d.estado !== "Pendiente") { d.validado_por = u.nombre; d.validado_ts = now(); } }
      if (ent === "acciones" && d.estado === "Cerrada" && !d.fecha_cierre) d.fecha_cierre = new Date().toISOString().slice(0, 10);
      d.version = previo ? previo.version + 1 : 1; d.actualizado = now(); d.actualizado_por = u.nombre;
      if (previo) db[ent][db[ent].indexOf(previo)] = d; else db[ent].push(d);
      audit(u, previo ? "actualizar" : "crear", ent, d.id, diff(antes, d) + (d.evento_id ? " · evento " + d.evento_id : ""));
      if (ent === "acciones") autoCerrar(d.evento_id);
      save();
      return { ok: true, registro: ent === "descansos" ? filtrarMed(u, d) : cp(d) };
    },
    transicion: function (b, u) {
      var ev = byId("eventos", b.id); if (!ev) return { ok: false, msg: "No encontrado" };
      if (ev.version !== b.version) return { ok: false, error: "conflicto", msg: "El evento cambió. Se recargaron los datos." };
      var a = b.a, com = String(b.comentario || "").trim();
      var roles = TRANS[ev.estado + ">" + a] || (a === "Anulado" && ev.estado !== "Anulado" ? ["ADMIN"] : null);
      if (!roles) return { ok: false, msg: "No se puede pasar de " + ev.estado + " a " + a + "." };
      if (roles.indexOf(u.rol) < 0) return { ok: false, msg: "Tu rol no puede realizar este paso." };
      if (u.rol === "JEFE" && !alcance(u, ev.area, ev.reportado_por)) return { ok: false, msg: "Evento fuera de tu área." };
      if ((a === "Observado" || a === "Anulado") && !com) return { ok: false, msg: "Indica el motivo." };
      if (a === "En revisión") { var f = validarInv(ev); if (f.length) return { ok: false, error: "incompleto", msg: "Falta completar: " + f.join(", ") + "." }; }
      if (a === "Cerrado") { var ab = db.acciones.filter(function (x) { return x.evento_id === ev.id && x.estado !== "Cerrada"; }).length; if (ab) return { ok: false, msg: "Hay " + ab + " acción(es) sin cerrar." }; }
      ev.flujo.push({ ts: now(), de: ev.estado, a: a, por: u.nombre, dni: u.dni, rol: u.rol, comentario: com });
      audit(u, "transicion", "eventos", ev.id, ev.estado + " → " + a + (com ? " · " + com : ""));
      ev.estado = a; if (a === "Aprobado") { ev.aprobado_por = u.nombre; ev.aprobado_ts = now(); } if (a === "Cerrado") ev.cerrado_ts = now();
      ev.version++; ev.actualizado = now(); ev.actualizado_por = u.nombre; save();
      return { ok: true, registro: cp(ev) };
    },
    comentar: function (b, u) {
      var ev = byId("eventos", b.id); if (!ev || !alcance(u, ev.area, ev.reportado_por)) return { ok: false, msg: "Sin permiso" };
      ev.comentarios = ev.comentarios || []; ev.comentarios.push({ ts: now(), por: u.nombre, dni: u.dni, rol: u.rol, texto: String(b.texto).slice(0, 2000) });
      ev.version++; audit(u, "comentar", "eventos", ev.id, String(b.texto).slice(0, 300)); save();
      return { ok: true, registro: cp(ev) };
    },
    subir: function (b, u) {
      var d = byId(b.entidad, b.id); if (!d) return { ok: false, msg: "No encontrado" };
      if (u.rol === "COMITE" && b.categoria !== "PDF firmado") return { ok: false, msg: "Solo consulta." };
      if (b.entidad === "descansos" && ["ADMIN","SST","MEDICO","JEFE"].indexOf(u.rol) < 0) return { ok: false, msg: "Sin permiso." };
      var adj = { id: "F" + Math.random().toString(36).slice(2, 10), nombre: b.nombre, mime: b.mime, bytes: Math.round(String(b.b64).length * 0.75), categoria: b.categoria || "General", doc: b.doc || "", ts: now(), por: u.nombre };
      db.archivos[adj.id] = String(b.b64).length < 1400000 ? b.b64 : null;
      d.adjuntos = d.adjuntos || [];
      if (b.doc) d.adjuntos = d.adjuntos.filter(function (a) { if (a.doc === b.doc) { delete db.archivos[a.id]; return false; } return true; });   // PDF: reemplaza versión anterior
      d.adjuntos.push(adj);
      if (b.entidad === "eventos" && b.categoria && d.evidencias && !b.doc) d.evidencias[b.categoria] = true;
      d.version++; audit(u, "adjuntar", b.entidad, d.id, adj.nombre + " (" + Math.round(adj.bytes / 1024) + " KB) · " + adj.categoria); save();
      return { ok: true, registro: b.entidad === "descansos" ? filtrarMed(u, d) : cp(d), adjunto: adj };
    },
    archivo: function (b, u) {
      var d = byId(b.entidad, b.id); if (!d) return { ok: false, msg: "No encontrado" };
      if (b.entidad === "descansos" && MED.indexOf(u.rol) < 0) return { ok: false, msg: "Documento médico reservado." };
      var a = (d.adjuntos || []).filter(function (x) { return x.id === b.adjunto; })[0]; if (!a) return { ok: false, msg: "No encontrado" };
      audit(u, "descargar", b.entidad, d.id, a.nombre); save();
      if (!db.archivos[a.id]) return { ok: false, msg: "En modo demo solo se conservan archivos menores a 1 MB. En producción todo se guarda en Drive." };
      return { ok: true, nombre: a.nombre, mime: a.mime, b64: db.archivos[a.id] };
    },
    quitar_adjunto: function (b, u) {
      if (u.rol !== "ADMIN" && u.rol !== "SST") return { ok: false, msg: "Solo SSOMA retira adjuntos." };
      var d = byId(b.entidad, b.id), a = (d.adjuntos || []).filter(function (x) { return x.id === b.adjunto; })[0];
      d.adjuntos = d.adjuntos.filter(function (x) { return x.id !== b.adjunto; });
      d.version++; audit(u, "retirar_adjunto", b.entidad, d.id, a.nombre + " (el archivo se conserva)"); save();
      return { ok: true, registro: cp(d) };
    },
    /* ---- Firmas electrónicas (selfie + firma manuscrita) ---- */
    firmas: function (b, u) {
      var ev = byId("eventos", b.evento_id); if (!ev || !alcance(u, ev.area, ev.reportado_por)) return { ok: false, msg: "Sin permiso" };
      return { ok: true, firmas: cp(db.firmas.filter(function (f) { return f.evento_id === b.evento_id; })) };
    },
    firmar: function (b, u) {
      var ev = byId("eventos", b.evento_id); if (!ev) return { ok: false, msg: "Evento no encontrado" };
      if (!alcance(u, ev.area, ev.reportado_por)) return { ok: false, msg: "Fuera de tu área." };
      if (ev.estado === "Anulado") return { ok: false, msg: "Evento anulado." };
      var f = b.firma || {};
      var SR = { entrevistador: ["ADMIN","SST","JEFE"], aprobacion: ["ADMIN","SST"], ssoma: ["ADMIN","SST"], comite: ["COMITE","ADMIN"], "PLAN.jefe": ["JEFE","ADMIN","SST"] };
      var reglas = SR[f.doc + "." + f.slot] || SR[f.slot];
      if (reglas && reglas.indexOf(u.rol) < 0) return { ok: false, msg: "Esta firma corresponde a: " + reglas.join(", ") + "." };
      if (f.slot === "aprobacion" && ["Aprobado","Cerrado"].indexOf(ev.estado) < 0) return { ok: false, msg: "La aprobación se firma cuando la investigación está aprobada." };
      if (u.rol === "COMITE" && !reglas) return { ok: false, msg: "El Comité firma solo su conformidad." };
      if (reglas) { f.nombre = u.nombre; f.dni = u.dni; }
      if (!f.firma || !f.selfie) return { ok: false, msg: "Falta la selfie o la firma." };
      if (String(f.firma).length > 49000 || String(f.selfie).length > 49000) return { ok: false, msg: "Imagen demasiado grande." };
      db.firmas = db.firmas.filter(function (x) { return !(x.evento_id === ev.id && x.doc === f.doc && x.slot === f.slot); });
      var reg = { id: "FI-" + pad(db.firmas.length + 1 + Math.floor(Math.random() * 900), 5), ts: now(), evento_id: ev.id, doc: f.doc, slot: f.slot, rol: f.rol, nombre: String(f.nombre || "").toUpperCase(), dni: f.dni, cargo: f.cargo,
        hash: f.hash, por_dni: u.dni, por_nombre: u.nombre, firma: f.firma, selfie: f.selfie, ua: String(f.ua || "").slice(0, 120) };
      db.firmas.push(reg);
      audit(u, "firmar", "eventos", ev.id, f.doc_titulo + " · " + f.rol + ": " + reg.nombre + " (DNI " + (f.dni || "-") + ") · huella " + f.hash);
      save();
      return { ok: true, firma: cp(reg) };
    },
    auditoria: function (b, u) {
      var todo = u.rol === "ADMIN" || u.rol === "SST";
      if (!b.entidad_id && !todo) return { ok: false, msg: "Sin permiso" };
      var f = db.auditoria.filter(function (r) { return !b.entidad_id || r.entidad_id === b.entidad_id || String(r.detalle).indexOf(b.entidad_id) >= 0; });
      return { ok: true, filas: f.slice(-3000).reverse() };
    },
    usuarios: function (b, u) {
      if (u.rol !== "ADMIN") return { ok: false, msg: "Sin permiso" };
      return { ok: true, usuarios: db.usuarios.map(function (x) { return { dni: x.dni, nombre: x.nombre, correo: x.correo, cargo: x.cargo, area: x.area, rol: x.rol, activo: x.activo, debe_cambiar: x.debe_cambiar, ultimo_acceso: x.ultimo_acceso || "", creado: x.creado }; }) };
    },
    usuario_guardar: function (b, u) {
      if (u.rol !== "ADMIN") return { ok: false, msg: "Sin permiso" };
      var x = b.usuario, dni = String(x.dni || "").replace(/\D/g, "");
      if (!/^\d{8,12}$/.test(dni)) return { ok: false, msg: "DNI / CE inválido." };
      var e = db.usuarios.filter(function (v) { return v.dni === dni; })[0], tmp = null;
      if (e) {
        if (dni === u.dni && (x.rol !== "ADMIN" || !x.activo)) return { ok: false, msg: "No puedes quitarte tu propio rol de administrador." };
        var antes = { nombre: e.nombre, correo: e.correo, cargo: e.cargo, area: e.area, rol: e.rol, activo: e.activo };
        ["nombre","correo","cargo","area","rol"].forEach(function (k) { e[k] = x[k]; }); e.activo = !!x.activo;
        audit(u, "usuario_actualizar", "usuario", dni, diff(antes, { nombre: e.nombre, correo: e.correo, cargo: e.cargo, area: e.area, rol: e.rol, activo: e.activo }));
      } else {
        tmp = dni;
        db.usuarios.push({ dni: dni, nombre: String(x.nombre).toUpperCase(), correo: x.correo, cargo: x.cargo, area: x.area, rol: x.rol, activo: true, clave: tmp, debe_cambiar: true, creado: now() });
        audit(u, "usuario_crear", "usuario", dni, x.nombre + " · " + x.rol + " · " + x.area);
      }
      save(); return { ok: true, temporal: tmp };
    },
    usuario_reset: function (b, u) {
      if (u.rol !== "ADMIN") return { ok: false, msg: "Sin permiso" };
      var e = db.usuarios.filter(function (v) { return v.dni === b.dni; })[0]; if (!e) return { ok: false, msg: "No encontrado" };
      e.clave = e.dni; e.debe_cambiar = true; revocar(e.dni, "");
      audit(u, "usuario_reset", "usuario", b.dni, "Contraseña restablecida"); save(); return { ok: true, temporal: e.clave };
    }
  };

  function handle(b) {
    load();
    if (b.action === "login") return H.login(b);
    if (b.action === "login_equipo" || b.action === "olvidar_equipo") return H[b.action](b);
    var u = sesion(b.token); if (!u) return { ok: false, error: "sesion_invalida" };
    var h = H[b.action]; if (!h) return { ok: false, error: "accion_no_reconocida" };
    return h(b, u);
  }

  /* ---------- Datos de ejemplo (del Excel de gestión, con divisiones del Panel SSOMA) ---------- */
  function seed() {
    var PE = "PLANTA EXTERNA", MA = "MANTENIMIENTO", NW = "NETWORKING", S_ = CAT.SEP;
    var U = [
      { dni: "10000001", nombre: "SEBASTIÁN ZELADA (DEMO)", cargo: "Jefe SSOMA", area: "*", rol: "ADMIN" },
      { dni: "10000002", nombre: "HÉCTOR ZAPATA (DEMO)", cargo: "Prevencionista de Riesgos", area: "*", rol: "SST" },
      { dni: "10000003", nombre: "MÉDICO OCUPACIONAL (DEMO)", cargo: "Médico ocupacional", area: "*", rol: "MEDICO" },
      { dni: "10000004", nombre: "JEFE PLANTA EXTERNA (DEMO)", cargo: "Jefe de División", area: PE, rol: "JEFE" },
      { dni: "10000005", nombre: "COMITÉ SST (DEMO)", cargo: "Presidente del Comité SST", area: "*", rol: "COMITE" },
      { dni: "10000006", nombre: "TÉCNICO REPORTANTE (DEMO)", cargo: "Técnico instalador FO", area: NW + S_ + "Instalaciones - Corporativo", rol: "REPORTANTE" }
    ].map(function (x) { x.activo = true; x.clave = "demo1234"; x.debe_cambiar = false; x.correo = ""; x.creado = "2026-01-02T08:00:00Z"; return x; });
    var adm = U[0], sst = U[1];
    function ev(n, o) {
      var t = CAT.get("tipoEvento", o.tipo);
      var e = Object.assign({ id: "EV-2026-" + pad(n, 3), version: 3, tipo_txt: t.t, mtpe24: t.mtpe24, adjuntos: [], comentarios: [], evidencias: {}, declaraciones: [],
        equipo: [{ dni: sst.dni, nombre: sst.nombre, rol: "Líder de investigación", cargo: sst.cargo }, { dni: U[3].dni, nombre: U[3].nombre, rol: "Jefe inmediato", cargo: U[3].cargo }],
        inmediatas: { primeros_auxilios: true, area_asegurada: true, evidencia_preservada: true }, reportado_por: sst.dni, reportado_nombre: sst.nombre,
        creado: o.fecha + "T" + o.hora + ":00-05:00", actualizado: o.fecha + "T18:00:00-05:00", actualizado_por: sst.nombre, investigacion: {}, mtpe: {} }, o);
      var fl = [{ ts: e.creado, de: "", a: "Reportado", por: sst.nombre, rol: "SST", comentario: "Evento reportado" }];
      var seq = { "En investigación": ["En investigación"], "Aprobado": ["En investigación","En revisión","Aprobado"], "Cerrado": ["En investigación","En revisión","Aprobado","Cerrado"] }[e.estado] || [];
      var prev = "Reportado";
      seq.forEach(function (s, i) { fl.push({ ts: o.fecha + "T" + pad(10 + i, 2) + ":30:00-05:00", de: prev, a: s, por: s === "Aprobado" ? adm.nombre : sst.nombre, rol: s === "Aprobado" ? "ADMIN" : "SST", comentario: "" }); prev = s; });
      e.flujo = fl; if (e.estado === "Aprobado" || e.estado === "Cerrado") e.aprobado_por = adm.nombre;
      return e;
    }
    var E = [
      ev(1, { fecha: "2026-01-15", hora: "09:20", area: PE + S_ + "Planta Externa - Corporativo", ambito: "Poste / red aérea", lugar: "Av. Túpac Amaru 1450, Comas", tarea: "Instalación de acometida drop en poste", tipo: "AI", estado: "Cerrado",
        descripcion: "Caída a distinto nivel (≈3.5 m) instalando drop en poste, desde escalera tipo tijera apoyada en el poste.", trabajador: "Juan Pérez Ramos", dni_trab: "44112233", puesto: "Técnico instalador FO", regimen: "Recibo por honorarios", parte_cuerpo: "Pie / Tobillo", naturaleza: "Fractura",
        scat: { gravedad: "MAY", probabilidad: "MOD", exposicion: "EXT", contactos: ["C03"], actos: ["A08","A16"], condiciones: ["K02","K14"], fp: ["FP5"], ft: ["FT6","FT1"], nac: [{ c: "N04", psc: "S" }, { c: "N09", psc: "P" }, { c: "N06", psc: "C" }], causa_raiz: "Trabajo en altura sin PETS, sin EPP anticaídas y sin supervisión." } }),
      ev(2, { fecha: "2026-02-08", hora: "14:05", area: MA + S_ + "Mantenimiento - Corporativo", ambito: "Vehículo / vía pública", lugar: "Base Los Olivos", tarea: "Maniobra de retroceso de camioneta", tipo: "INC", estado: "Cerrado",
        descripcion: "Roce de camioneta en maniobra de retroceso.", trabajador: "Luis Gómez Díaz", dni_trab: "41556677", puesto: "Conductor", regimen: "Planilla", parte_cuerpo: "No aplica", naturaleza: "Sin lesión",
        scat: { gravedad: "MEN", probabilidad: "MOD", exposicion: "MOD", contactos: ["C01"], actos: ["A04"], condiciones: ["K04"], fp: ["FP7"], ft: ["FT1"], nac: [{ c: "N06", psc: "C" }], causa_raiz: "Maniobra sin guía en espacio reducido." } }),
      ev(3, { fecha: "2026-03-20", hora: "11:40", area: NW + S_ + "Instalaciones - Corporativo", ambito: "Domicilio del cliente (FTTH)", lugar: "Jr. Las Magnolias 220, SJL", tarea: "Pelado de cable drop", tipo: "AL", estado: "Cerrado",
        descripcion: "Corte en mano con cúter al pelar cable drop.", trabajador: "Marco Ruiz León", dni_trab: "43221100", puesto: "Técnico instalador FO", regimen: "Recibo por honorarios", parte_cuerpo: "Mano / Dedos", naturaleza: "Herida / Corte",
        scat: { gravedad: "MEN", probabilidad: "ALT", exposicion: "EXT", contactos: ["C02"], actos: ["A07"], condiciones: ["K03"], fp: ["FP6"], ft: ["FT5"], nac: [{ c: "N02", psc: "C" }], causa_raiz: "Uso incorrecto de cúter sin guante anticorte." } }),
      ev(4, { fecha: "2026-05-12", hora: "16:30", area: PE + S_ + "Normalización - Preventivo", ambito: "Cámara / red subterránea", lugar: "Cámara CR-118, Surco", tarea: "Descenso a cámara con escalera", tipo: "IP", estado: "Aprobado",
        descripcion: "Escalera se desliza durante el ascenso; el trabajador logra sujetarse y no cae.", trabajador: "Pedro Salas Vega", dni_trab: "42889900", puesto: "Técnico de planta externa", regimen: "Contratista", empresa: "Redes del Sur S.A.C.", parte_cuerpo: "No aplica", naturaleza: "Sin lesión",
        mtpe: { fecha: "2026-05-13", hora: "09:40", nro: "MTPE-IP-2026-0415", por: sst.nombre, notifica: "Empleador" },
        scat: { gravedad: "MAY", probabilidad: "MOD", exposicion: "EXT", contactos: ["C03"], actos: ["A03"], condiciones: ["K14"], fp: ["FP5"], ft: ["FT4"], nac: [{ c: "N03", psc: "P" }], causa_raiz: "Escalera sin punto de apoyo asegurado ni inspección preuso." } }),
      ev(5, { fecha: "2026-07-03", hora: "10:15", area: MA + S_ + "Mangas Críticas", ambito: "Almacén", lugar: "Almacén central Lurín", tarea: "Traslado manual de bobina de fibra", tipo: "AI", estado: "Cerrado",
        descripcion: "Sobreesfuerzo al levantar bobina de fibra (≈35 kg) sin ayuda mecánica.", trabajador: "Ana Torres Ríos", dni_trab: "40667788", puesto: "Almacenera", regimen: "Planilla", parte_cuerpo: "Tronco / Espalda", naturaleza: "Lesión ergonómica",
        scat: { gravedad: "SER", probabilidad: "MOD", exposicion: "MOD", contactos: ["C13"], actos: ["A11"], condiciones: ["K04"], fp: ["FP5"], ft: ["FT6"], nac: [{ c: "N02", psc: "P" }], causa_raiz: "Manejo manual de carga sin técnica ni ayuda mecánica." } }),
      ev(6, { fecha: "2026-09-18", hora: "08:50", area: PE + S_ + "ON Negocios", ambito: "Poste / red aérea", lugar: "Av. Universitaria cdra. 30, SMP", tarea: "Tendido de cable aéreo de fibra óptica", tipo: "IP", estado: "En investigación",
        descripcion: "Proximidad a línea energizada de media tensión evitada al tender cable aéreo.", trabajador: "José Vera Luna", dni_trab: "45778899", puesto: "Técnico de planta externa", regimen: "Recibo por honorarios", parte_cuerpo: "No aplica", naturaleza: "Sin lesión",
        scat: { gravedad: "MAY", probabilidad: "MOD", exposicion: "", contactos: ["C08"], actos: ["A02"], condiciones: ["K05"], fp: ["FP7"], ft: [], nac: [], causa_raiz: "" } })
    ];
    var A = [
      ["EV-2026-001", "Elaborar y difundir el PETS de trabajos en altura", "Correctiva", sst, "2026-01-31", "Cerrada", 100, "Sí", "2026-01-28", "N04"],
      ["EV-2026-001", "Dotar de arnés y línea de vida a todas las cuadrillas", "Correctiva", adm, "2026-02-15", "Cerrada", 100, "Sí", "2026-02-12", "K02"],
      ["EV-2026-002", "Designar vigía obligatorio para maniobras de retroceso", "Correctiva", sst, "2026-02-28", "Cerrada", 100, "Sí", "2026-02-20", "A04"],
      ["EV-2026-003", "Reemplazar cúter por pelacables y dotar guantes anticorte", "Correctiva", adm, "2026-04-10", "Cerrada", 100, "Sí", "2026-04-02", "K03"],
      ["EV-2026-004", "Checklist de inspección preuso de escaleras con amarre al poste", "Correctiva", U[3], "2026-06-01", "En proceso", 60, "En verificación", "", "N03"],
      ["EV-2026-004", "Capacitación en uso seguro de escaleras a contratistas", "Preventiva", sst, "2026-06-15", "Pendiente", 0, "En verificación", "", "FP5"],
      ["EV-2026-005", "Capacitación en manejo manual de cargas y carretilla para bobinas", "Preventiva", sst, "2026-07-31", "Cerrada", 100, "Sí", "2026-07-25", "N02"]
    ].map(function (a, i) {
      return { id: "AC-" + pad(i + 1, 4), version: 2, evento_id: a[0], descripcion: a[1], tipo: a[2], responsable_dni: a[3].dni, responsable: a[3].nombre, fecha_compromiso: a[4], estado: a[5], avance: a[6], eficacia: a[7], fecha_cierre: a[8], causa: a[9], origen: "Manual", adjuntos: [], creado: "2026-01-16T10:00:00Z", actualizado: "2026-02-01T10:00:00Z", actualizado_por: sst.nombre };
    });
    var D = [
      { id: "DM-0001", evento_id: "EV-2026-001", dni_trab: "44112233", trabajador: "Juan Pérez Ramos", area: E[0].area, origen: "Accidente de trabajo", documento: "Certificado de SCTR", inicio: "2026-01-16", fin: "2026-01-30", centro: "Clínica San Pablo", medico: "Dr. R. Salazar", cmp: "45123", diagnostico: "Fractura de maléolo lateral derecho", cie10: "S82.6", estado: "Validado" },
      { id: "DM-0002", evento_id: "EV-2026-001", dni_trab: "44112233", trabajador: "Juan Pérez Ramos", area: E[0].area, origen: "Accidente de trabajo", documento: "Certificado de SCTR", inicio: "2026-01-31", fin: "2026-02-14", centro: "Clínica San Pablo", medico: "Dr. R. Salazar", cmp: "45123", diagnostico: "Fractura de maléolo lateral derecho (prórroga)", cie10: "S82.6", estado: "Validado", prorroga_de: "DM-0001" },
      { id: "DM-0003", evento_id: "EV-2026-003", dni_trab: "43221100", trabajador: "Marco Ruiz León", area: E[2].area, origen: "Accidente de trabajo", documento: "Descanso médico de clínica / EPS", inicio: "2026-03-20", fin: "2026-03-20", centro: "Tópico Clínica Jesús del Norte", medico: "Dra. P. Ríos", cmp: "61877", diagnostico: "Herida cortante en 2.º dedo mano izquierda", cie10: "S61.0", estado: "Validado" },
      { id: "DM-0004", evento_id: "EV-2026-005", dni_trab: "40667788", trabajador: "Ana Torres Ríos", area: E[4].area, origen: "Accidente de trabajo", documento: "CITT EsSalud", inicio: "2026-07-04", fin: "2026-07-08", centro: "Hospital Rebagliati", medico: "Dr. J. Campos", cmp: "38221", diagnostico: "Lumbalgia aguda", cie10: "M54.5", estado: "Pendiente" }
    ].map(function (d) { d.version = 1; d.dias = dias(d.inicio, d.fin); d.adjuntos = []; d.creado = d.inicio + "T09:00:00Z"; d.actualizado = d.creado; d.actualizado_por = U[2].nombre; if (d.estado === "Validado") d.validado_por = U[2].nombre; return d; });
    var HH = [25000, 24000, 26000, 25500, 25000, 24500, 26000, 25500, 25000].map(function (h, i) { return { id: "2026-" + pad(i + 1, 2), version: 1, anio: 2026, mes: i + 1, hht: h, trabajadores: Math.round(h / 208) }; });
    var AU = [];
    E.forEach(function (e) { e.flujo.forEach(function (f) { AU.push({ ts: f.ts, dni: "", nombre: f.por, rol: f.rol, accion: f.de ? "transicion" : "crear", entidad: "eventos", entidad_id: e.id, detalle: f.de ? f.de + " → " + f.a : "Registro creado" }); }); });
    AU.sort(function (a, b) { return a.ts < b.ts ? -1 : 1; });
    return { usuarios: U, eventos: E, acciones: A, descansos: D, hht: HH, firmas: [], auditoria: AU, sesiones: {}, archivos: {} };
  }
  return { handle: handle, reset: function () { localStorage.removeItem(KEY); db = null; } };
})();
