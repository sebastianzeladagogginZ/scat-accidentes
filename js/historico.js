/* ============================================================
   HISTÓRICO DE SSOMA — importación del resumen de accidentes
   (Excel) y patrones para el análisis predictivo.
   Los datos van directo del Excel del administrador a la base
   privada (Google Sheets); este archivo no contiene datos.
   ============================================================ */
var HIST = {
  /* ---------- utilidades ---------- */
  n: function (s) { return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim(); },
  mediana: function (a) { var b = a.slice().sort(function (x, y) { return x - y; }), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; },
  franja: function (h) { var x = parseInt(String(h || "").slice(0, 2), 10); if (isNaN(x)) return null; return x < 6 ? "00–06" : x < 9 ? "06–09" : x < 12 ? "09–12" : x < 15 ? "12–15" : x < 18 ? "15–18" : "18–24"; },
  /* Medida solo administrativa (capacitar, charlas, difundir) sin control de ingeniería, sustitución o EPP. */
  soloAdmin: function (txt) {
    var t = HIST.n(txt);
    return /CAPACIT|CHARLA|DIFUSI|DIFUND|SENSIBILIZ|CONCIENTIZ|INDUCCI|RETROALIMENT|REFORZ|RECORDAR|INSTRUIR|COMUNICAR/.test(t) &&
      !/INSTALA|DOTAR|ENTREG|REEMPLAZ|CAMBI|ADQUI|COMPRA|SENALIZ|PROTEC|GUARDA|BLOQUE|AISLA|MANTENIM|REPAR|ELIMIN|SUSTITU|REDISEN|IMPLEMENT|HERRAMIENTA NUEVA|EPP|ARNES|LINEA DE VIDA|ESCALERA NUEVA|INSPECCION/.test(t);
  },

  /* Días de descanso esperados según el histórico de la propia base (solo para el área médica). */
  refDias: function (organo, grav, excluir) {
    var o = HIST.n(organo).split(" ")[0], g = HIST.n(grav);
    if (!o && !g) return "";
    var base = S.descansos.filter(function (d) { return d.id !== excluir && d.origen === "Accidente de trabajo" && d.estado !== "Observado" && +d.dias >= 0; });
    var sel = base.filter(function (d) { return (!o || HIST.n(d.organo).indexOf(o) >= 0) && (!g || HIST.n(d.gravedad_clinica) === g); });
    if (sel.length < 3 && o && g) sel = base.filter(function (d) { return HIST.n(d.organo).indexOf(o) >= 0; });
    if (sel.length < 3) return "";
    var v = sel.map(function (d) { return +d.dias; }), md = HIST.mediana(v);
    return "📊 <b>Referencia histórica:</b> lesiones " + (o ? "de " + esc(String(organo).toLowerCase()) : "") + (g ? " " + esc(grav.toLowerCase()) + "s" : "") + " — mediana <b>" + fmt(md, md % 1 ? 1 : 0) + " días</b> (" + sel.length + " casos, de " + Math.min.apply(null, v) + " a " + Math.max.apply(null, v) + "). Úsalo para planificar el retorno.";
  },

  /* ---------- importación ---------- */
  lib: function () {
    if (window.XLSX) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res; s.onerror = function () { rej(new Error("No se pudo cargar el lector de Excel (revisa tu conexión).")); }; document.head.appendChild(s);
    });
  },
  abrir: function () {
    if (L.rol() !== "ADMIN") return toast("Solo el administrador importa el histórico.", "bad");
    modal({ title: "Importar histórico de accidentes", wide: true, cancel: "Cerrar",
      body: '<p style="margin-top:0">Sube el <b>resumen de accidentes e incidentes</b> de SSOMA (Excel con columnas como <i>Fecha, Hora, Apellidos y Nombres, Cargo, Área, Diagnóstico, Órgano afectado, Gravedad, SCTR, Días de descanso médico, Medida de control</i>).</p>' +
        '<div class="callout info mb"><span>🔒</span><div><b>Cómo se guarda</b>Cada fila entra como <b>expediente cerrado</b> (no genera tareas ni correos), con su descanso médico y la medida de control. El diagnóstico y los datos clínicos quedan reservados al área médica. Las filas que ya existen se omiten.</div></div>' +
        '<label class="drop" for="hiFile">📄 Elegir el Excel del resumen (.xlsx)<input type="file" id="hiFile" accept=".xlsx,.xls" hidden></label><div id="hiPrev" class="mt"></div>',
      onOpen: function (m) { $("#hiFile", m).onchange = function () { if (this.files[0]) HIST.leer(this.files[0], m); }; } });
  },
  leer: function (file, m) {
    var box = $("#hiPrev", m); box.innerHTML = '<div class="vacio-sm"><span>' + svg("reloj") + '</span>Leyendo el Excel…</div>';
    HIST.lib().then(function () { return file.arrayBuffer(); }).then(function (buf) {
      // Fechas y horas como número de Excel (sin zona horaria): evita el desfase de minutos de las horas convertidas a fecha.
      var wb = XLSX.read(buf, { type: "array", cellDates: false }), filas = [], hoja = "";
      var nombres = wb.SheetNames.slice().sort(function (a, b) { return (/ACCIDENT/i.test(b) ? 1 : 0) - (/ACCIDENT/i.test(a) ? 1 : 0); });
      for (var i = 0; i < nombres.length && !filas.length; i++) { filas = HIST.filasDe(wb.Sheets[nombres[i]]); if (filas.length) hoja = nombres[i]; }
      if (!filas.length) { box.innerHTML = vacioHTML("alertas", "No encontré la tabla del resumen", "El Excel debe tener una fila de encabezados con «Apellidos y Nombres del Trabajador», «Fecha» y «Días de descanso médico»."); return; }
      var lista = filas.map(function (f) { return HIST.mapear(f, file.name + " · " + hoja); }).filter(Boolean);
      var nuevas = lista.filter(function (x) { return !HIST.existe(x); });
      HIST._lista = nuevas;
      var c = function (fn) { return nuevas.filter(fn).length; };
      box.innerHTML = '<div class="plan-sum"><div><b>' + lista.length + '</b><span>filas válidas</span></div><div class="' + (lista.length - nuevas.length ? "warn" : "") + '"><b>' + (lista.length - nuevas.length) + '</b><span>ya existen (se omiten)</span></div>' +
        '<div class="ok"><b>' + nuevas.length + '</b><span>se importarán</span></div><div><b>' + c(function (x) { return x.dm; }) + '</b><span>con descanso médico</span></div><div><b>' + c(function (x) { return x.acc; }) + '</b><span>con medida de control</span></div></div>' +
        (nuevas.length ? '<div class="tbl-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Tipo</th><th>Área ▸ División</th><th>Proceso</th><th>Zona afectada</th><th class="num">Días</th></tr></thead><tbody>' +
          nuevas.slice(0, 8).map(function (x) { return '<tr><td class="nw">' + fFecha(x.ev.fecha) + ' ' + esc(x.ev.hora || "") + '</td><td>' + L.tipoPill(x.ev.tipo) + '</td><td>' + esc(x.ev.area) + '</td><td>' + esc(x.ev.proceso || "—") + '</td><td>' + esc(x.ev.parte_cuerpo || "—") + '</td><td class="num">' + (x.dm ? x.dm.dias : 0) + '</td></tr>'; }).join("") +
          '</tbody></table></div>' + (nuevas.length > 8 ? '<p class="small muted">… y ' + (nuevas.length - 8) + ' más.</p>' : "") +
          '<div class="flex mt end"><span class="small muted">Tarda unos segundos por fila. No cierres esta ventana.</span><button class="btn primary" id="hiGo">Importar ' + nuevas.length + ' evento(s)</button></div>' : '<div class="callout ok mt"><span>✓</span><div>Todo lo de este Excel ya está en el sistema.</div></div>');
      var go = $("#hiGo", m); if (go) go.onclick = function () {
        go.disabled = true;
        HIST.servidorListo().then(function (ok) { if (ok) HIST.importar(m); else { go.disabled = false; toast("Primero hay que actualizar el servidor (versión 2.4): sin eso el histórico entraría como casos abiertos y enviaría correos.", "bad"); } });
      };
    }).catch(function (e) { box.innerHTML = vacioHTML("alertas", "No se pudo leer el archivo", e.message || String(e)); });
  },
  /* Busca la fila de encabezados (la que tiene «Apellidos y Nombres») y devuelve objetos por columna. */
  filasDe: function (sh) {
    var m = XLSX.utils.sheet_to_json(sh, { header: 1, raw: true, defval: "" }), h = -1;
    for (var i = 0; i < Math.min(m.length, 30); i++) if (m[i].some(function (c) { return /APELLIDOS Y NOMBRES/.test(HIST.n(c)); })) { h = i; break; }
    if (h < 0) return [];
    var enc = m[h].map(function (c) { return HIST.n(c); });
    return m.slice(h + 1).map(function (r) { var o = {}; enc.forEach(function (k, j) { if (k) o[k] = r[j]; }); return o; })
      .filter(function (o) { return String(HIST.col(o, "APELLIDOS")).trim() && HIST.col(o, "FECHA"); });
  },
  col: function (o, pref) { for (var k in o) if (k.indexOf(pref) === 0) return o[k]; return ""; },
  fecha: function (v) {
    if (typeof v === "number" && v > 1) { var c = XLSX.SSF.parse_date_code(v); return c ? c.y + "-" + p2(c.m) + "-" + p2(c.d) : ""; }
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + "-" + p2(v.getMonth() + 1) + "-" + p2(v.getDate());
    var m = String(v).match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (!m) return "";
    var y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return y + "-" + p2(+m[2]) + "-" + p2(+m[1]);
  },
  hora: function (v) {
    if (v instanceof Date && !isNaN(v)) return p2(v.getHours()) + ":" + p2(v.getMinutes());
    if (typeof v === "number") { var t = Math.round((v % 1) * 1440) % 1440; return p2(Math.floor(t / 60)) + ":" + p2(t % 60); }
    var m = String(v).match(/(\d{1,2})[:.](\d{2})/); if (!m) return "";
    var hh = +m[1]; if (/P\.?\s*M/i.test(v) && hh < 12) hh += 12; if (/A\.?\s*M/i.test(v) && hh === 12) hh = 0; return p2(hh) + ":" + m[2];
  },
  /* Área ▸ división del Panel SSOMA más parecida al texto del Excel (si no hay coincidencia, se conserva el texto). */
  area: function (area, secc) {
    var fix = function (x) { return HIST.n(x).replace(/MANTENIMINETO|MANTENIMIENTIO/g, "MANTENIMIENTO").replace(/EXTRNA/g, "EXTERNA").replace(/NORMALIZACION/g, "NORMALIZACION"); };
    var a = fix(area), t = fix(area + " " + secc), cab = a.split(/\s*[-–]\s*/)[0].trim();
    // 1) el área del Panel SSOMA cuyo nombre aparece en el texto
    var areas = CAT.areas().filter(function (x) { var xn = HIST.n(x); return t.indexOf(xn) >= 0 || (cab && xn.indexOf(cab) >= 0); });
    var cands = CAT.divisiones.filter(function (d) { return !areas.length || areas.indexOf(CAT.areaDe(d)) >= 0; });
    // 2) la división se elige solo si su nombre propio aparece en el texto; si no, la «Corporativo» del área
    var pal = function (d) { var an = HIST.n(CAT.areaDe(d)); return HIST.n(CAT.divDe(d)).split(/[^A-Z]+/).filter(function (w) { return w.length > 3 && w !== "CORPORATIVO" && an.indexOf(w) < 0; }); };
    var mejor = null, pts = 0;
    cands.forEach(function (d) { var s2 = pal(d).filter(function (w) { return t.indexOf(w) >= 0; }).length + (/CORPORATIVO/.test(t) && /CORPORATIVO/.test(HIST.n(d)) ? 1 : 0); if (s2 > pts) { pts = s2; mejor = d; } });
    if (mejor) return mejor;
    if (areas.length) return cands.filter(function (d) { return /CORPORATIVO/.test(HIST.n(d)); })[0] || cands[0];
    return (HIST.n(area) || "SIN ÁREA") + " (histórico)";
  },
  proceso: function (txt) {
    var t = HIST.n(txt);
    return /INSTALA/.test(t) ? "Instalación FTTH / fibra óptica" : /NORMALIZ|ACTUALIZ/.test(t) ? "Normalización / actualización de red" : /MANTEN/.test(t) ? "Mantenimiento de red" :
      /EMPALM/.test(t) ? "Empalmes" : /CHOFER|CONDUC/.test(t) ? "Conducción de vehículo" : /INSPECC|DISENO/.test(t) ? "Inspección y diseño" : /PLANTA EXTERNA|PEXT/.test(t) ? "Planta externa (PEXT)" :
      /ALMAC/.test(t) ? "Almacén / logística" : /ADMINIS|OFICINA/.test(t) ? "Oficina / administrativo" : "";
  },
  parte: function (txt) {
    var t = HIST.n(txt);
    return /DEDO|MANO|PULGAR|MENIQUE/.test(t) ? "Mano / Dedos" : /MUNECA|CODO|HOMBRO|BRAZO|ANTEBRAZO/.test(t) ? "Miembro superior" : /COLUMNA|ESPALDA|LUMBAR|DORSAL/.test(t) ? "Tronco / Espalda" :
      /OJO/.test(t) ? "Ojos" : /CARA|ROSTRO/.test(t) ? "Cara" : /CABEZA|CRANEO/.test(t) ? "Cabeza" : /CUELLO/.test(t) ? "Cuello" : /TOBILLO|PIE/.test(t) ? "Pie / Tobillo" :
      /PIERNA|RODILLA|MUSLO|TIBIA/.test(t) ? "Miembro inferior" : t ? "Múltiple" : "";
  },
  naturaleza: function (txt) {
    var t = HIST.n(txt);
    return /FRACTUR/.test(t) ? "Fractura" : /ESGUIN|LUXA/.test(t) ? "Esguince / Luxación" : /HERIDA|CORTE|PUNCI|LACERA/.test(t) ? "Herida / Corte" : /QUEMAD/.test(t) ? "Quemadura" :
      /LUMB|TENDIN|TENOS|SINOV|DISCO|HERNIA|ERGON/.test(t) ? "Lesión ergonómica" : /CONTUS|TRAUMAT|GOLPE|APLAST/.test(t) ? "Contusión / Golpe" : t ? "Otro" : "";
  },
  laboral: function (txt) {
    var t = HIST.n(txt);
    return /ALTA/.test(t) ? "Alta médica" : /CON RESTRIC|OFICINA|PRECAUCI/.test(t) ? "Trabajo con restricciones" : /SIN RESTRIC/.test(t) ? "Trabajo sin restricciones" : /DESCANSO/.test(t) ? "Descanso médico" : "";
  },
  seguro: function (txt) { var t = HIST.n(txt); return /SCTR|^SI$/.test(t) ? "SCTR" : /EPS/.test(t) ? "EPS / ONI" : /SOAT/.test(t) ? "SOAT" : /PARTIC/.test(t) ? "Particular" : /^NO/.test(t) ? "No aplica" : ""; },
  clave: function (fecha, nombre) { return FIRMA.huella([fecha, HIST.n(nombre).split(" ").slice(0, 2).join(" ")]); },
  existe: function (x) { return S.eventos.some(function (e) { return e.import_key === x.ev.import_key || (e.fecha === x.ev.fecha && HIST.clave(e.fecha, e.trabajador) === x.ev.import_key); }); },

  /* Convierte una fila del resumen en evento + descanso médico + medida de control. */
  mapear: function (o, fuente) {
    var fecha = HIST.fecha(HIST.col(o, "FECHA")); if (!fecha) return null;
    var nombre = String(HIST.col(o, "APELLIDOS")).trim().toUpperCase(), dias = parseFloat(String(HIST.col(o, "DIAS DE DESCANSO")).replace(",", ".")) || 0;
    var motivo = HIST.n(HIST.col(o, "MOTIVO")), organo = String(HIST.col(o, "ORGANO") || "").trim(), diag = String(HIST.col(o, "DIAGNOSTICO") || "").trim();
    var areaTxt = String(HIST.col(o, "AREA") || ""), secc = String(HIST.col(o, "SECCION") || ""), cargo = String(HIST.col(o, "CARGO") || "").trim();
    var medida = String(HIST.col(o, "MEDIDA") || "").trim(), grav = HIST.n(HIST.col(o, "GRAVEDAD"));
    var tipo = dias > 1 ? "AI" : /INCIDENTE/.test(motivo) ? "INC" : "AL", t = CAT.get("tipoEvento", tipo);
    var ev = { historico: true, fuente: fuente, import_key: HIST.clave(fecha, nombre), tipo: tipo, tipo_txt: t.t, mtpe24: t.mtpe24, fecha: fecha, hora: HIST.hora(HIST.col(o, "HORA")),
      area: HIST.area(areaTxt, secc), proceso: HIST.proceso(areaTxt + " " + secc) || HIST.proceso(cargo), lugar: String(HIST.col(o, "DIRECCION") || "").trim(),
      trabajador: nombre, puesto: cargo, parte_cuerpo: HIST.parte(organo), naturaleza: HIST.naturaleza(diag),
      descripcion: (tipo === "INC" ? "Incidente" : "Accidente") + " registrado en el resumen histórico de SSOMA" + (organo ? ". Zona afectada: " + organo.toLowerCase() : "") + (cargo ? ". Puesto: " + cargo.toLowerCase() : "") + "." };
    var seg = HIST.seguro(HIST.col(o, "SCTR") || HIST.col(o, "SEGUR"));
    var dm = dias >= 1 ? { historico: true, trabajador: nombre, area: ev.area, origen: "Accidente de trabajo", inicio: fecha, fin: addDias(fecha, Math.round(dias) - 1), estado: "Validado",
      documento: seg === "SCTR" ? "Certificado de SCTR" : seg === "EPS / ONI" ? "Descanso médico de clínica / EPS" : "Certificado médico particular", seguro: seg, diagnostico: diag, organo: organo,
      gravedad_clinica: grav ? grav.charAt(0) + grav.slice(1).toLowerCase() : "", terapia: /^SI/.test(HIST.n(HIST.col(o, "TERAPIA"))) ? "Sí, concluida" : "No",
      estado_laboral: HIST.laboral(HIST.col(o, "ESTATUS")), observacion_medica: "Importado del histórico de SSOMA." } : null;
    var acc = medida ? { historico: true, descripcion: medida.slice(0, 900), tipo: "Correctiva", causa: "", responsable: "SSOMA", responsable_dni: "", fecha_compromiso: fecha, fecha_cierre: fecha, estado: "Cerrada", avance: 100 } : null;
    return { ev: ev, dm: dm, acc: acc };
  },
  /* El servidor debe ser 2.4 o superior (entiende «historico»: expediente cerrado y sin correos). */
  servidorListo: function () {
    if (!CONFIG.ENDPOINT_URL) return Promise.resolve(true);
    return fetch(CONFIG.ENDPOINT_URL).then(function (r) { return r.json(); }).then(function (j) { var v = String(j.version || "0").split(".").map(Number); return v[0] > 2 || (v[0] === 2 && v[1] >= 4); }).catch(function () { return false; });
  },
  importar: function (m) {
    var lista = HIST._lista || [], i = 0, ok = 0, err = [], box = $("#hiPrev", m);
    box.innerHTML = '<div class="hi-prog"><b id="hiN">0 de ' + lista.length + '</b><div class="bar"><i id="hiBar" style="width:0"></i></div><span class="small muted">Importando… no cierres esta ventana.</span></div>';
    function sig() {
      if (i >= lista.length) {
        box.innerHTML = '<div class="callout ' + (err.length ? "warn" : "ok") + '"><span>' + (err.length ? "!" : "✓") + '</span><div><b>' + ok + ' evento(s) importados</b>' + (err.length ? err.length + ' con error: ' + esc(err.slice(0, 3).join(" · ")) : "El tablero ya los considera en la tendencia, la comparación con el histórico y las referencias de días de descanso.") + '</div></div>';
        App.recargar(); return;
      }
      var x = lista[i++];
      API.call("guardar", { entidad: "eventos", registro: x.ev }).then(function (r) {
        if (!r.ok) { err.push(x.ev.fecha + ": " + (r.msg || r.error)); return; }
        ok++; var id = r.registro.id, t = [];
        if (x.dm) { x.dm.evento_id = id; t.push(API.call("guardar", { entidad: "descansos", registro: x.dm })); }
        if (x.acc) { x.acc.evento_id = id; t.push(API.call("guardar", { entidad: "acciones", registro: x.acc })); }
        return Promise.all(t);
      }).catch(function (e) { err.push(x.ev.fecha + ": " + (e.message || e)); }).then(function () {
        $("#hiN").textContent = i + " de " + lista.length; $("#hiBar").style.width = Math.round(i / lista.length * 100) + "%"; sig();
      });
    }
    sig();
  },

  /* ---------- patrones para el tablero (usan toda la base, incluido el histórico) ---------- */
  patrones: function (base, anio) {
    var prev = base.filter(function (e) { return +String(e.fecha).slice(0, 4) < anio; }), anios = {};
    prev.forEach(function (e) { anios[String(e.fecha).slice(0, 4)] = 1; });
    var nA = Object.keys(anios).length, prom = MESES.map(function (m, i) { return nA ? prev.filter(function (e) { return +String(e.fecha).slice(5, 7) === i + 1; }).length / nA : 0; });
    var act = MESES.map(function (m, i) { return base.filter(function (e) { return String(e.fecha).slice(0, 4) == anio && +String(e.fecha).slice(5, 7) === i + 1; }).length; });
    var anom = act.map(function (n, i) { return { i: i, n: n, p: prom[i] }; }).filter(function (x) { return nA && x.n >= 3 && x.n >= 2 * Math.max(x.p, 1); }).sort(function (a, b) { return b.n / Math.max(b.p, 1) - a.n / Math.max(a.p, 1); })[0] || null;
    var fr = {}, conH = base.filter(function (e) { return HIST.franja(e.hora); });
    conH.forEach(function (e) { var f = HIST.franja(e.hora); fr[f] = (fr[f] || 0) + 1; });
    var frTop = Object.keys(fr).sort(function (a, b) { return fr[b] - fr[a]; })[0];
    var pr = {}; base.forEach(function (e) { if (e.proceso) pr[e.proceso] = (pr[e.proceso] || 0) + 1; });
    var proc = Object.keys(pr).map(function (k) { return { c: k, n: pr[k] }; }).sort(function (a, b) { return b.n - a.n; });
    var ids = {}; base.forEach(function (e) { ids[e.id] = 1; });
    var acc = S.acciones.filter(function (a) { return ids[a.evento_id] && a.descripcion; }), adm = acc.filter(function (a) { return HIST.soloAdmin(a.descripcion); }).length;
    return { anios: Object.keys(anios).sort(), prom: prom, act: act, anom: anom, franja: frTop ? { f: frTop, n: fr[frTop], tot: conH.length } : null, proc: proc,
      acc: acc.length, adm: adm };
  }
};
