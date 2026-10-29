/* =====================================================================
   Análisis integral SCAT: une cuatro señales para proponer las alternativas
   1) ✨ IA local que lee el relato            2) 🔎 palabras clave del relato (reglas de campo)
   3) 🔗 relaciones causales del catálogo SCAT  4) 📊 histórico de casos parecidos (predictivo)
   Solo se premarca lo que respaldan al menos dos señales: el equipo investigador decide.
   ===================================================================== */
var AN = {
  /* Reglas de campo (texto normalizado: MAYÚSCULAS y sin tildes) → códigos SCAT */
  CLAVES: [
    [/ESCALERA|ALTURA|POSTE|TECHO|ANDAMIO|DESDE .{0,20}METRO|ARNES|LINEA DE VIDA|CAYO DE(L| LA| UN)/, ["C03"], "trabajo en altura"],
    [/RESBAL|TROPEZ|PISO MOJADO|MISMO NIVEL|DESNIVEL|VEREDA|PISADA/, ["C04"], "resbalón o tropiezo"],
    [/LE CAYO|CAYO (ENCIMA|SOBRE)|SE DESPREND|OBJETO QUE CAYO|HERRAMIENTA CAYO/, ["C02"], "objeto que cae"],
    [/VEHICULO|MOTO|CAMIONETA|ATROPELL|TRANSITO|CHOQUE VEHICULAR/, ["C02"], "vehículo"],
    [/SE GOLPEO|GOLPEO CON|CHOCO CON|CONTRA (EL|LA|UN|UNA) /, ["C01"], "golpe contra algo"],
    [/ATRAP|APLAST|PRENS|PELLIZC/, ["C05"], "atrapamiento"],
    [/ELECTRIC|DESCARGA|ENERGIZAD|TENSION ELECTRICA|CORRIENTE|CABLE DE LUZ|RED DE BAJA|RED DE MEDIA/, ["C08"], "electricidad"],
    [/QUEMAD|CALIENTE|SOLDAD|HORNO DE FUSION|FUSIONADORA/, ["C09"], "calor"],
    [/LASER|CONECTOR ACTIVO|LUZ DE LA FIBRA|RADIACION|MIRO EL CONECTOR/, ["C10", "K10"], "láser de fibra óptica"],
    [/QUIMIC|ISOPROPIL|SOLVENTE|ACIDO|GEL DE RELLENO/, ["C11"], "sustancia química"],
    [/RUIDO/, ["C12"], "ruido"],
    [/LEVANT|CARGAR|BOBINA|ESPALDA|LUMBAR|SOBREESFUERZO|JALAR|JALANDO|EMPUJ|TIRAR DEL CABLE/, ["C13"], "esfuerzo o carga"],
    [/CAMARA SUBTERRANEA|BUZON|ESPACIO CONFINADO|GASES|ASFIXI/, ["C14", "K08"], "espacio confinado"],
    [/PERRO|MORDI|ABEJA|AVISPA|PICADURA|ATAQUE DE/, ["C15"], "animal"],
    [/SIN (CASCO|GUANTES|LENTES|ARNES|EPP|BARBIQUEJO|ZAPATOS)|NO (USABA|LLEVABA|TENIA PUESTO|SE PUSO)( EL| LOS| LAS| SU| SUS)? (CASCO|GUANTES|LENTES|ARNES|EPP|BARBIQUEJO)/, ["A08"], "no usaba el EPP"],
    [/(EPP|GUANTES|ARNES|CASCO|LENTES).{0,25}(MAL ESTADO|DANAD|ROT|VENCID|INADECUAD)/, ["K02"], "EPP en mal estado"],
    [/SIN ATS|NO (HIZO|REALIZO|LLENO|ELABORO)( EL)? ATS|SIN PETS|NO SIGUIO EL PROCEDIMIENTO|OMITI(O|ERON)/, ["A16"], "no siguió el procedimiento"],
    [/SIN SENALIZ|NO SENALIZ|SIN CONOS|SIN CINTA|NO DELIMIT/, ["A02", "K05"], "sin señalización"],
    [/APUR|PRISA|PARA TERMINAR RAPIDO|EXCESO DE CONFIANZA|SE CONFIO/, ["FP7"], "apuro o exceso de confianza"],
    [/CORRIENDO|MUY RAPIDO|VELOCIDAD/, ["A04"], "velocidad"],
    [/MAL USO|USO INCORRECTO|USO INADECUAD|IMPROVIS/, ["A07"], "uso incorrecto"],
    [/(HERRAMIENTA|EQUIPO|CUCHILLA|ALICATE|CORTADORA|MATERIAL).{0,25}(DEFECTUOS|MALOGRAD|ROT|DANAD|MAL ESTADO|DESGASTAD)/, ["K03", "A06"], "herramienta defectuosa"],
    [/(ESCALERA|POSTE|CAMARA|TAPA|ACCESO|PELDANO).{0,30}(MAL ESTADO|ROT|PODRID|INCLINAD|INESTABLE|SUELT|DANAD)|(MAL ESTADO|INESTABLE|PODRID).{0,20}(ESCALERA|POSTE)/, ["K14"], "acceso o estructura en mal estado"],
    [/MOJAD|ACEITE|DESORDEN|BASURA|RESBALOSO|CHARCO|BARRO/, ["K07"], "piso o área en mal estado"],
    [/OSCUR|DE NOCHE|POCA LUZ|SIN LUZ|ILUMINACION/, ["K12"], "poca iluminación"],
    [/ESPACIO REDUCIDO|ESTRECHO|CONGESTIONAD|REDUCIDO/, ["K04"], "espacio reducido"],
    [/SOL INTENSO|MUCHO CALOR|FRIO EXTREMO/, ["K11"], "temperatura extrema"],
    [/SOLO SIN AYUDA|SIN AYUDA|MAS DE 25 ?KG/, ["A11"], "cargó sin ayuda"],
    [/POSTURA|AGACHAD|FORZAD|INCOMOD/, ["A12"], "postura forzada"],
    [/SIN BLOQUE|LOTO|EQUIPO ENCENDIDO|EN FUNCIONAMIENTO/, ["A03"], "sin bloqueo de energía"],
    [/NO SABIA|NO CONOCIA|SIN CAPACITACION|NO (FUE|HABIA SIDO|ESTABA) CAPACITAD|DESCONOC/, ["FP5"], "falta de capacitación"],
    [/NUEVO EN|PRIMER DIA|SIN EXPERIENCIA|POCA EXPERIENCIA|RECIEN INGRES/, ["FP6"], "poca experiencia"],
    [/CANSAD|FATIGA|JORNADA LARGA|HORAS EXTRA|DOBLE TURNO|SUENO/, ["FP3"], "cansancio"],
    [/ESTRES|PRESION/, ["FP4"], "presión o estrés"],
    [/SIN SUPERVIS|SUPERVISOR (NO|AUSENTE)|TRABAJABA SOLO|ESTABA SOLO/, ["FT1"], "sin supervisión"],
    [/NO (HAY|HABIA|EXISTE|EXISTIA)( UN)? (PROCEDIMIENTO|PETS)|SIN PROCEDIMIENTO/, ["FT6"], "no había procedimiento"],
    [/CONTRATISTA|OTRA AREA|NO (SE )?(LE )?(AVISO|AVISARON|COMUNICO|COMUNICARON)/, ["FT9"], "comunicación"]
  ],
  LISTA: { contactos: "contactos", actos: "actos", condiciones: "condiciones", fp: "fPersonales", ft: "fTrabajo", nac: "nac" },
  TITULO: { contactos: "Tipo de contacto", actos: "Actos subestándar", condiciones: "Condiciones subestándar", fp: "Factores personales", ft: "Factores del trabajo", nac: "Falta de control (NAC)" },
  MAX: { contactos: 3, actos: 5, condiciones: 5, fp: 4, ft: 4, nac: 5 },

  clave: function (cod) { var l = CAT.listaDe(cod); return { fPersonales: "fp", fTrabajo: "ft" }[l] || l; },

  /* 🔎 Qué dice el relato (y los datos del evento) */
  claves: function (ev) {
    var t = HIST.n([ev.descripcion, ev.tarea, ev.lugar, ev.ambito, ev.naturaleza, ev.parte_cuerpo].join(" ")), out = {};
    AN.CLAVES.forEach(function (r) { if (r[0].test(t)) r[1].forEach(function (c) { if (!out[c]) out[c] = r[2]; }); });
    return out;
  },

  /* 📊 Casos parecidos en toda la base (incluido el histórico importado) */
  historia: function (ev, contactos) {
    var hoy = new Date(), lim = function (d) { return new Date(hoy.getTime() - d * 864e5).toISOString().slice(0, 10); }, l12 = lim(365), l24 = lim(730);
    var base = S.eventos.filter(function (e) { return e.id !== ev.id && e.estado !== "Anulado"; });
    var sim = base.filter(function (e) {
      var p = 0;
      if (ev.proceso && e.proceso === ev.proceso) p += 2;
      if (ev.parte_cuerpo && ev.parte_cuerpo !== "No aplica" && e.parte_cuerpo === ev.parte_cuerpo) p += 1;
      if (ev.naturaleza && !/Sin lesión|Otro/.test(ev.naturaleza) && e.naturaleza === ev.naturaleza) p += 1;
      if (ev.area && e.area === ev.area) p += 1;
      if (ev.ambito && e.ambito === ev.ambito) p += 1;
      if (e.scat && (e.scat.contactos || []).some(function (c) { return contactos.indexOf(c) >= 0; })) p += 3;   // misma energía: caso parecido
      return p >= 3;
    });
    var conScat = sim.filter(function (e) { return e.scat && (e.scat.contactos || []).length; }), frec = {};
    conScat.forEach(function (e) {
      var s = e.scat, cods = [].concat(s.contactos || [], s.actos || [], s.condiciones || [], s.fp || [], s.ft || [], (s.nac || []).map(function (n) { return n.c; }));
      cods.filter(function (c, i) { return cods.indexOf(c) === i; }).forEach(function (c) { frec[c] = (frec[c] || 0) + 1; });
    });
    var ids = {}; sim.forEach(function (e) { ids[e.id] = 1; });
    var acc = S.acciones.filter(function (a) { return ids[a.evento_id] && a.descripcion; });
    var personas = {}; base.filter(function (e) { return String(e.fecha) >= l24 && (ev.proceso ? e.proceso === ev.proceso : e.area === ev.area); })
      .forEach(function (e) { if (e.trabajador) personas[HIST.n(e.trabajador)] = 1; });
    return { sim: sim, conScat: conScat, frec: frec, acc: acc.length, admin: acc.filter(function (a) { return HIST.soloAdmin(a.descripcion); }).length,
      n12: sim.filter(function (e) { return String(e.fecha) >= l12; }).length, n24: sim.filter(function (e) { return String(e.fecha) >= l24; }).length,
      ultimo: sim.map(function (e) { return String(e.fecha); }).sort().pop() || "", personas: Object.keys(personas).length };
  },

  /* Une las señales y decide qué se premarca */
  combinar: function (ev, ia, cl, h) {
    var s = EV.draft, G = {};
    var ya = function (k, c) { return k === "nac" ? s.nac.some(function (n) { return n.c === c; }) : (s[k] || []).indexOf(c) >= 0; };
    var add = function (k, c, pts, m) {
      if (!k || !c || !CAT.get(AN.LISTA[k], c)) return;
      G[k] = G[k] || {}; var o = G[k][c] = G[k][c] || { c: c, s: 0, m: [] };
      o.s += pts; if (m && o.m.indexOf(m) < 0) o.m.push(m);
    };
    if (ia) ["contactos", "actos", "condiciones", "fp", "ft"].forEach(function (k) { (ia[k] || []).forEach(function (c) { add(k, c, 2, "✨ IA"); }); });
    Object.keys(cl).forEach(function (c) { add(AN.clave(c), c, 2, "🔎 relato: " + cl[c]); });
    var nS = h.conScat.length;
    if (nS) Object.keys(h.frec).forEach(function (c) { var r = h.frec[c] / nS; if (r >= 0.3) add(AN.clave(c), c, r >= 0.6 ? 2 : 1, (nS === 1 ? "📊 marcado en el caso parecido" : "📊 en " + h.frec[c] + " de " + nS + " casos parecidos")); });
    var elegir = function (k) {
      var arr = Object.keys(G[k] || {}).map(function (c) { return G[k][c]; }).filter(function (o) { return !ya(k, o.c); })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, AN.MAX[k]);
      var tiene = k === "nac" ? s.nac.length : (s[k] || []).length;
      arr.forEach(function (o, i) { o.on = o.s >= 3 || (i === 0 && !tiene && o.s >= 2) || (k === "nac" && i < 2 && !tiene && o.s >= 1 && bas.length); });
      return arr;
    };
    var marcados = function (k, arr) { return (k === "nac" ? s.nac.map(function (n) { return n.c; }) : (s[k] || []).slice()).concat(arr.filter(function (o) { return o.on; }).map(function (o) { return o.c; })); };
    var R = {}, bas = [];
    // 1) contacto → 2) causas inmediatas típicas de ese contacto
    R.contactos = elegir("contactos");
    marcados("contactos", R.contactos).forEach(function (c) { var x = CAT.get("contactos", c); if (!x) return;
      x.a.forEach(function (a) { add("actos", a, 1, "🔗 típico de " + c); }); x.k.forEach(function (k) { add("condiciones", k, 1, "🔗 típico de " + c); }); });
    R.actos = elegir("actos"); R.condiciones = elegir("condiciones");
    // 3) causas básicas que explican las inmediatas marcadas
    var inm = marcados("actos", R.actos).concat(marcados("condiciones", R.condiciones)), link = { fp: {}, ft: {} };
    inm.forEach(function (c) { var x = CAT.get("actos", c) || CAT.get("condiciones", c); if (!x) return;
      x.fp.forEach(function (f) { (link.fp[f] = link.fp[f] || []).push(c); }); x.ft.forEach(function (f) { (link.ft[f] = link.ft[f] || []).push(c); }); });
    ["fp", "ft"].forEach(function (k) { Object.keys(link[k]).forEach(function (f) { add(k, f, Math.min(link[k][f].length, 2), "🔗 explica " + link[k][f].slice(0, 3).join(", ")); }); });
    R.fp = elegir("fp"); R.ft = elegir("ft");
    // 4) faltas de control de esas causas básicas + lo que enseña el histórico
    bas = marcados("fp", R.fp).concat(marcados("ft", R.ft)); var ln = {};
    bas.forEach(function (c) { var x = CAT.get("fPersonales", c) || CAT.get("fTrabajo", c); if (x) x.nac.forEach(function (n) { (ln[n] = ln[n] || []).push(c); }); });
    Object.keys(ln).forEach(function (n) { add("nac", n, Math.min(ln[n].length, 3), "🔗 controla " + ln[n].slice(0, 3).join(", ")); });
    if (h.n24 >= 2) add("nac", "N05", 1, "📊 se repitió " + h.n24 + " veces en 24 meses pese a investigaciones previas");
    if (h.acc >= 2 && h.admin / h.acc >= 0.5) add("nac", "N11", 2, "📊 " + h.admin + " de " + h.acc + " medidas previas fueron solo charlas o capacitación");
    R.nac = elegir("nac");
    var recurrente = h.n24 >= 2;
    R.nac.forEach(function (o) {
      var tmp = { fp: bas.filter(function (c) { return c[1] === "P"; }), ft: bas.filter(function (c) { return c[1] === "T"; }) };
      o.psc = EV.pscSugerido(tmp, o.c);
      if (recurrente && o.psc === "C") { o.psc = "S"; o.m.push("📊 al repetirse, el estándar no está funcionando (S)"); }
    });
    return R;
  },

  /* Potencial de pérdida: gravedad por la energía involucrada, probabilidad y exposición por el histórico */
  potencial: function (ev, h, contactos) {
    var graves = contactos.filter(function (c) { return ["C03", "C06", "C07", "C08", "C14"].indexOf(c) >= 0; }), nat = HIST.n(ev.naturaleza), g, gp;
    if (ev.tipo === "AM" || ev.tipo === "IP" || graves.length) { g = "MAY"; gp = graves.length ? "«" + EV.min(CAT.txt("contactos", graves[0])) + "» puede causar lesiones permanentes o fatales" : "por el tipo de evento"; }
    else if (ev.tipo === "AI" || /FRACTURA|QUEMADURA|DESCARGA/.test(nat)) { g = "SER"; gp = "hubo o pudo haber una lesión incapacitante"; }
    else { g = "MEN"; gp = "la lesión que pudo ocurrir es leve"; }
    var p = h.n24 >= 3 ? "ALT" : h.n24 >= 1 ? "MOD" : "RAR";
    var pp = h.n24 ? (h.n24 === 1 ? "1 caso parecido" : h.n24 + " casos parecidos") + " en los últimos 24 meses" : "no hay casos parecidos en los últimos 24 meses";
    var e = h.personas >= 8 ? "EXT" : h.personas >= 3 ? "MOD" : "BAJ";
    var ep = h.personas ? (h.personas === 1 ? "1 trabajador tuvo" : h.personas + " trabajadores distintos tuvieron") + " eventos en " + (ev.proceso || "el área") + " en 24 meses" : "pocos registros del proceso: confirma la exposición real";
    return { gravedad: { c: g, por: gp }, probabilidad: { c: p, por: pp }, exposicion: { c: e, por: ep } };
  },

  lectura: function (ev, h) {
    if (!h.sim.length) return '<div class="callout info"><span>📊</span><div><b>Sin casos parecidos en la base</b>La propuesta se basa en el relato y en las relaciones del catálogo SCAT. Al importar el histórico de SSOMA, este análisis también considerará los casos anteriores.</div></div>';
    var t = '<strong>' + h.sim.length + (h.sim.length === 1 ? ' caso parecido' : ' casos parecidos') + '</strong> en la base (mismo proceso, zona del cuerpo o tipo de lesión)' + (h.n12 ? ', <strong>' + h.n12 + ' en los últimos 12 meses</strong>' : "") + (h.ultimo ? '; el último fue el ' + esc(fFecha(h.ultimo)) : "") + '.';
    if (h.acc >= 2 && h.admin / h.acc >= 0.5) t += ' En <strong>' + h.admin + ' de ' + h.acc + '</strong> de esos casos la medida fue solo administrativa (charla o capacitación) y el evento volvió a ocurrir: conviene un control de ingeniería o un estándar nuevo.';
    if (h.conScat.length) t += ' Se ponderaron las causas de ' + h.conScat.length + ' análisis SCAT anteriores.';
    return '<div class="callout ' + (h.n12 >= 2 ? "warn" : "info") + '"><span>📊</span><div><b>Lectura predictiva</b>' + t + '</div></div>';
  },

  /* ---------- flujo ---------- */
  abrir: function () {
    var ev = L.evento(EV.id); if (!ev || !EV.draft) return;
    var conIA = IA.visible() && String(ev.descripcion || "").trim().length > 20;
    if (!conIA) {
      var m = modal({ title: "📊 Análisis integral: reglas SCAT + histórico", wide: true, ok: "Marcar en el análisis", cancel: "Cancelar", sticky: true,
        body: '<div id="anOut"></div>', onOk: function () { return AN.aplicar(m.res); } });
      m.res = AN.calcular(ev, null); AN.pintar($("#anOut", m.el), m.res);
      return;
    }
    IA.preparar().then(function (ok) {
      if (!ok) return;
      var v = IA.ventana("✨ Análisis integral: IA + reglas SCAT + histórico", function () { return AN.aplicar(v.res); });
      var lista = function (l) { return CAT[l].map(function (o) { return o.c + " " + o.t; }).join("\n"); };
      IA.generar([
        { role: "system", content: "Eres un analista de accidentes que aplica la técnica SCAT. Lees el relato y eliges, de las listas dadas, los códigos que mejor lo explican. Solo usas códigos que aparecen en las listas. Si el relato no da información para una categoría, dejas esa lista vacía. Respondes únicamente con JSON válido." },
        { role: "user", content: "Relato del evento:\n\"\"\"\n" + String(ev.descripcion || "").slice(0, 1800) + (ev.tarea ? "\nTarea: " + ev.tarea : "") + (ev.ambito ? "\nLugar: " + ev.ambito : "") + (ev.parte_cuerpo ? "\nParte del cuerpo: " + ev.parte_cuerpo : "") + (ev.naturaleza ? "\nLesión: " + ev.naturaleza : "") + "\n\"\"\"\n\n" +
          "TIPOS DE CONTACTO:\n" + lista("contactos") + "\n\nACTOS SUBESTÁNDAR:\n" + lista("actos") + "\n\nCONDICIONES SUBESTÁNDAR:\n" + lista("condiciones") +
          "\n\nFACTORES PERSONALES:\n" + lista("fPersonales") + "\n\nFACTORES DEL TRABAJO:\n" + lista("fTrabajo") +
          "\n\nResponde solo con este JSON (máximo 2 contactos, 3 actos, 3 condiciones, 2 factores personales y 2 del trabajo):\n{\"contactos\":[\"C00\"],\"actos\":[\"A00\"],\"condiciones\":[\"K00\"],\"fp\":[\"FP0\"],\"ft\":[\"FT0\"],\"explicacion\":\"una frase breve\"}" }
      ], { max: 220, onProg: v.prog, onToken: function () { var e = $("#iaEstT", v.m.el); if (e) e.textContent = "Analizando el relato…"; } }).then(function (r) {
        v.res = AN.calcular(ev, AN.leerIA(r.texto));
        var o = $("#iaOut", v.m.el); o.hidden = false; AN.pintar(o, v.res);
        v.fin(r); $("[data-ok]", v.m.el).textContent = "Marcar en el análisis";
      }).catch(function (e) {
        // si la IA falla, igual se muestran las otras tres señales
        v.error(e); v.res = AN.calcular(ev, null);
        var o = $("#iaOut", v.m.el); o.hidden = false; AN.pintar(o, v.res);
        $("[data-ok]", v.m.el).disabled = false; $("[data-ok]", v.m.el).textContent = "Marcar en el análisis";
      });
    });
  },
  leerIA: function (txt) {
    var j = {};
    try { j = JSON.parse((String(txt).match(/\{[\s\S]*\}/) || ["{}"])[0]); }
    catch (e) { var c = String(txt).match(/\b(C\d{2}|A\d{2}|K\d{2}|FP\d|FT\d)\b/g) || []; ["contactos", "actos", "condiciones", "fp", "ft"].forEach(function (k) { j[k] = c.filter(function (x) { return AN.clave(x) === k; }); }); }
    var out = { explicacion: String(j.explicacion || "").slice(0, 300) };
    ["contactos", "actos", "condiciones", "fp", "ft"].forEach(function (k) {
      out[k] = (Array.isArray(j[k]) ? j[k] : []).map(function (c) { return String(c).trim().toUpperCase().replace(/[^A-Z0-9]/g, ""); })
        .filter(function (c, i, a) { return CAT.get(AN.LISTA[k], c) && a.indexOf(c) === i; });
    });
    return out;
  },
  calcular: function (ev, ia) {
    var s = EV.draft, cl = AN.claves(ev);
    var cont = (s.contactos || []).concat(ia ? ia.contactos : [], Object.keys(cl).filter(function (c) { return AN.clave(c) === "contactos"; }));
    var h = AN.historia(ev, cont), R = AN.combinar(ev, ia, cl, h);
    var contFin = (s.contactos || []).concat(R.contactos.filter(function (o) { return o.on; }).map(function (o) { return o.c; }));
    return { R: R, h: h, ia: ia, pot: AN.potencial(ev, h, contFin), potOn: !(s.gravedad && s.probabilidad), lectura: AN.lectura(ev, h) };
  },

  pintar: function (box, res) {
    var conf = function (s) { return s >= 4 ? '<span class="an-c alta">confianza alta</span>' : s >= 3 ? '<span class="an-c media">confianza media</span>' : '<span class="an-c">a considerar</span>'; };
    var nom = function (l, c) { return CAT.txt(l, c); };
    var h = res.lectura;
    if (res.ia && res.ia.explicacion) h += '<p class="mt" style="margin-bottom:0"><b>Lectura de la IA:</b> ' + esc(res.ia.explicacion) + '</p>';
    if (!res.ia) h += '<p class="small muted mt" style="margin-bottom:0">' + (IA.visible() ? "La IA no respondió: la propuesta usa las reglas del relato, las relaciones SCAT y el histórico." : "Sin IA en este equipo: la propuesta usa las reglas del relato, las relaciones SCAT y el histórico.") + '</p>';
    h += '<div class="small muted mt mb">Premarcado = lo respaldan al menos dos señales. Desmarca lo que no corresponda; lo que ya tenías marcado no se toca.</div>';
    h += '<div class="an-g"><h4>Potencial de pérdida</h4>' + (res.potOn ? '<label class="chk on"><input type="checkbox" checked data-pot><span>' +
      ["gravedad", "probabilidad", "exposicion"].map(function (k) { var p = res.pot[k]; return '<span class="an-pot"><b>' + { gravedad: "Gravedad", probabilidad: "Probabilidad", exposicion: "Exposición" }[k] + ':</b> ' + esc(nom(k, p.c)) + ' <span class="small muted">· ' + esc(p.por) + '</span></span>'; }).join("") +
      '</span></label>' : '<div class="small muted">Ya lo definiste en el análisis: no se cambia.</div>') + '</div>';
    var hay = 0;
    ["contactos", "actos", "condiciones", "fp", "ft", "nac"].forEach(function (k) {
      var arr = res.R[k]; if (!arr.length) return; hay += arr.length;
      h += '<div class="an-g"><h4>' + AN.TITULO[k] + '</h4>' + arr.map(function (o, i) {
        return '<label class="chk ' + (o.on ? "on" : "") + '"><input type="checkbox" ' + (o.on ? "checked" : "") + ' data-k="' + k + '" data-i="' + i + '"><span><span class="code">' + o.c + (o.psc ? " " + o.psc : "") + '</span>' + esc(CAT.txt(AN.LISTA[k], o.c)) + ' ' + conf(o.s) +
          '<span class="an-ms">' + o.m.map(function (m) { return '<span class="an-m">' + esc(m) + '</span>'; }).join("") + '</span></span></label>';
      }).join("") + '</div>';
    });
    if (!hay) h += '<div class="callout warn"><span>!</span><div>No hay alternativas nuevas que proponer. Completa el relato del evento con más detalle (qué tarea, qué pasó, con qué, por qué) y vuelve a intentarlo.</div></div>';
    box.innerHTML = h;
    $$("input[data-k]", box).forEach(function (cb) { cb.onchange = function () { res.R[cb.dataset.k][+cb.dataset.i].on = cb.checked; cb.closest(".chk").classList.toggle("on", cb.checked); }; });
    var pc = $("input[data-pot]", box); if (pc) pc.onchange = function () { res.potOn = pc.checked; pc.closest(".chk").classList.toggle("on", pc.checked); };
  },

  aplicar: function (res) {
    if (!res) return true;
    var s = EV.draft, n = 0;
    if (res.potOn) ["gravedad", "probabilidad", "exposicion"].forEach(function (k) { if (!s[k]) { s[k] = res.pot[k].c; n++; } });
    Object.keys(res.R).forEach(function (k) {
      res.R[k].forEach(function (o) {
        if (!o.on) return;
        if (k === "nac") { if (!s.nac.some(function (x) { return x.c === o.c; })) { s.nac.push({ c: o.c, psc: o.psc || "P" }); n++; } }
        else if (s[k].indexOf(o.c) < 0) { s[k].push(o.c); n++; }
      });
    });
    if (!s.causa_raiz && n) s.causa_raiz = EV.textoCR(s, L.evento(EV.id));
    toast(n ? n + " elemento(s) marcados: revisa el análisis y guarda." : "No se marcó nada nuevo.", "ok");
    EV.re(); return true;
  }
};
