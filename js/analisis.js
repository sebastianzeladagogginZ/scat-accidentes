/* =====================================================================
   Análisis integral SCAT: une cuatro señales para proponer las alternativas
   1) ✨ IA local que lee el relato            2) 🔎 palabras clave del relato (reglas de campo)
   3) 🔗 relaciones causales del catálogo SCAT  4) 📊 histórico de casos parecidos (predictivo)
   Solo se premarca lo que respaldan al menos dos señales: el equipo investigador decide.
   ===================================================================== */
var AN = {
  /* Reglas de campo (texto normalizado: MAYÚSCULAS y sin tildes) → códigos SCAT */
  CLAVES: [
    [/ESCALERA|ANDAMIO|TECHO|AZOTEA|DESDE .{0,25}METRO|CAYO DE (UNA|LA|EL) ALTURA|EN ALTURA|ARNES|LINEA DE VIDA|LO ALTO DEL POSTE|SUBI\w* (AL|EL|POR EL) POSTE/, ["C03"], "trabajo en altura"],
    [/(RESBAL\w*|TROPEZ\w*) (EN|CON|POR|SOBRE) |TROPEZ|PISO MOJADO|AL MISMO NIVEL|DESNIVEL|RESBAL\w* Y (SE )?(CAYO|TORCIO)|SE TORCIO EL TOBILLO/, ["C04"], "resbalón o tropiezo"],
    [/SE LE CAYO|LE CAYO (EL|LA|UN|UNA|ENCIMA|SOBRE)|CAYO (ENCIMA|SOBRE)|SE DESPREND|OBJETO QUE CAYO|ESQUIRLA|SALIO DISPARAD|ATROPELL/, ["C02"], "objeto que cae o sale disparado"],
    [/CORT(O|ARSE|E) (CON|EL|LA|EN)|SE CORTO|CUTER|CUCHILLA|NAVAJA|TIJERA/, ["C02"], "corte con herramienta"],
    [/CHOCO|GOLPE\w* (UN|UNA|CONTRA)|SE GOLPEO .{0,25}CONTRA|ROCE|ROZO (UN|UNA|EL|LA|CON)/, ["C01"], "golpe o choque contra algo"],
    [/ATRAP|APLAST|PRENS|PELLIZC/, ["C05"], "atrapamiento"],
    [/ELECTRIC|DESCARGA|ENERGIZAD|TENSION ELECTRICA|CORRIENTE|CABLE DE LUZ|RED DE BAJA|RED DE MEDIA/, ["C08"], "electricidad"],
    [/QUEMAD|CALIENTE|SOLDAD|HORNO DE FUSION|FUSIONADORA/, ["C09"], "calor"],
    [/LASER|(CONECTOR|PUERTO|FIBRA) (ACTIV|CON SENAL|ENCENDID)|SENAL ACTIVA|LUZ DE LA FIBRA|RADIACION|MIR\w* .{0,30}(FIBRA|CONECTOR|PUERTO)/, ["C10", "K10"], "láser de fibra óptica"],
    [/QUIMIC|ISOPROPIL|SOLVENTE|ACIDO|GEL DE RELLENO/, ["C11"], "sustancia química"],
    [/RUIDO/, ["C12"], "ruido"],
    [/LEVANT|CARGAR|BOBINA|ESPALDA|LUMBAR|SOBREESFUERZO|JALAR|JALANDO|EMPUJ|TIRAR DEL CABLE/, ["C13"], "esfuerzo o carga"],
    [/CAMARA SUBTERRANEA|BUZON|ESPACIO CONFINADO|GASES|ASFIXI/, ["C14", "K08"], "espacio confinado"],
    [/PERRO|MORDI|ABEJA|AVISPA|PICADURA|ATAQUE DE/, ["C15"], "animal"],
    [/SIN (CASCO|GUANTES|LENTES|ARNES|EPP|BARBIQUEJO|ZAPATOS)|NO (USABA|LLEVABA|TENIA PUESTO|SE PUSO)( EL| LOS| LAS| SU| SUS)? (CASCO|GUANTES|LENTES|ARNES|EPP|BARBIQUEJO)/, ["A08"], "no usaba el EPP"],
    [/(EPP|GUANTES|ARNES|CASCO|LENTES).{0,25}(MAL ESTADO|DANAD|ROT|VENCID|INADECUAD)/, ["K02"], "EPP en mal estado"],
    [/SIN ATS|NO (HIZO|REALIZO|LLENO|ELABORO)( EL)? ATS|SIN PETS|NO SIGUIO EL PROCEDIMIENTO|OMITI(O|ERON)/, ["A16"], "no siguió el procedimiento"],
    [/SIN SENALIZ|NO SENALIZ|SIN CONOS|SIN CINTA|NO (SE )?(HABIA )?DELIMIT/, ["A02", "K05"], "sin señalización"],
    [/SIN VIGIA|SIN GUIA|SIN NADIE QUE (LO|LE) GUI/, ["A02"], "sin vigía"],
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
    [/POSTURA|AGACHAD|FORZAD/, ["A12"], "postura forzada"],
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
    var t = HIST.n([ev.descripcion, ev.tarea].join(" ")), out = {};
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
    if (nS >= 3) Object.keys(h.frec).forEach(function (c) { var r = h.frec[c] / nS; if (r >= 0.4) add(AN.clave(c), c, nS >= 5 && r >= 0.6 ? 2 : 1, "📊 en " + h.frec[c] + " de " + nS + " casos parecidos"); });
    var elegir = function (k) {
      var arr = Object.keys(G[k] || {}).map(function (c) { return G[k][c]; }).filter(function (o) { return !ya(k, o.c); })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, AN.MAX[k]);
      var tiene = k === "nac" ? s.nac.length : (s[k] || []).length;
      arr.forEach(function (o, i) {
        if (k === "contactos") { o.on = i === 0 ? !tiene && o.s >= 2 : o.s >= 4 && o.s >= arr[0].s; return; }
        if (k === "fp" || k === "ft") { o.on = o.s >= 3 && o.m.some(function (m) { return m.indexOf("🔗") < 0; }); return; }   // básicas: solo con una señal además del catálogo
        o.on = o.s >= 3 || (i === 0 && !tiene && o.s >= 2) || (k === "nac" && i < 2 && !tiene && o.s >= 1 && bas.length);
      });
      return arr;
    };
    var marcados = function (k, arr) { return (k === "nac" ? s.nac.map(function (n) { return n.c; }) : (s[k] || []).slice()).concat(arr.filter(function (o) { return o.on; }).map(function (o) { return o.c; })); };
    var R = {}, bas = [], inm = [], inmOn = 0;
    // 1) contacto → 2) causas inmediatas típicas de ese contacto
    R.contactos = elegir("contactos");
    marcados("contactos", R.contactos).forEach(function (c) { var x = CAT.get("contactos", c); if (!x) return;
      x.a.forEach(function (a) { add("actos", a, 1, "🔗 típico de " + c); }); x.k.forEach(function (k) { add("condiciones", k, 1, "🔗 típico de " + c); }); });
    R.actos = elegir("actos"); R.condiciones = elegir("condiciones");
    // 3) causas básicas que explican las inmediatas marcadas
    inm = marcados("actos", R.actos).concat(marcados("condiciones", R.condiciones)); inmOn = inm.length; var link = { fp: {}, ft: {} };
    inm.forEach(function (c) { var x = CAT.get("actos", c) || CAT.get("condiciones", c); if (!x) return;
      x.fp.forEach(function (f) { (link.fp[f] = link.fp[f] || []).push(c); }); x.ft.forEach(function (f) { (link.ft[f] = link.ft[f] || []).push(c); }); });
    ["fp", "ft"].forEach(function (k) { Object.keys(link[k]).forEach(function (f) { add(k, f, Math.min(link[k][f].length, 2), "🔗 explica " + link[k][f].slice(0, 3).join(", ")); }); });
    // las causas inmediatas «a considerar» (sin marcar) también sugieren causas básicas, con menos peso
    R.actos.concat(R.condiciones).filter(function (o) { return !o.on; }).slice(0, 6).forEach(function (o) {
      var x = CAT.get("actos", o.c) || CAT.get("condiciones", o.c); if (!x) return;
      x.fp.slice(0, 2).forEach(function (f) { add("fp", f, 0.5, "🔗 podría explicar " + o.c); }); x.ft.slice(0, 2).forEach(function (f) { add("ft", f, 0.5, "🔗 podría explicar " + o.c); });
    });
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
    R._G = G; return R;
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
      AN.preguntarIA(ev, { onProg: v.prog }).then(function (r) {
        v.res = AN.calcular(ev, r.ia);
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
  /* La IA responde dos preguntas cortas (un modelo pequeño acierta mucho más eligiendo entre pocas opciones):
     1) el tipo de contacto, entre los 15 del catálogo;
     2) actos y condiciones, solo entre los candidatos que ya respaldan el catálogo, el relato o el histórico.
     Las causas básicas y la NAC salen de la lógica SCAT (relaciones del catálogo + histórico), no de la IA. */
  preguntarIA: function (ev, o) {
    o = o || {};
    var rel = "Relato del evento:\n\"\"\"\n" + String(ev.descripcion || "").slice(0, 1500) + (ev.tarea ? "\nTarea: " + ev.tarea : "") + (ev.ambito ? "\nLugar: " + ev.ambito : "") +
      (ev.parte_cuerpo && ev.parte_cuerpo !== "No aplica" ? "\nParte del cuerpo: " + ev.parte_cuerpo : "") + (ev.naturaleza ? "\nLesión: " + ev.naturaleza : "") + "\n\"\"\"\n\n";
    var sys = { role: "system", content: "Eres un analista de accidentes de trabajo que aplica la técnica SCAT en una empresa de fibra óptica. Respondes solo con JSON válido y usas únicamente códigos de las listas dadas." };
    var lin = function (l, cods) { return cods.map(function (c) { return c + " " + CAT.txt(l, c); }).join("\n"); };
    var ia = { contactos: [], actos: [], condiciones: [], fp: [], ft: [] }, s = EV.draft;
    return IA.generar([sys, { role: "user", content: rel + "¿Con qué tipo de contacto o energía ocurrió (o pudo ocurrir) la lesión? Elige 1 código; 2 solo si hubo dos contactos distintos.\n\n" +
      lin("contactos", CAT.contactos.map(function (x) { return x.c; })) + "\n\nResponde solo con: {\"contactos\":[\"código\"]}" }],
      { max: 30, onProg: o.onProg, fase: "Paso 1 de 2: identificando el tipo de contacto…" }).then(function (r1) {
      ia.contactos = AN.leerIA(r1.texto).contactos.slice(0, 2);
      var G = AN.calcular(ev, ia).R._G;
      var cand = function (k) { return Object.keys(G[k] || {}).map(function (c) { return G[k][c]; }).filter(function (x) { return (s[k] || []).indexOf(x.c) < 0; })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, 7).map(function (x) { return x.c; }); };
      var ca = cand("actos"), ck = cand("condiciones");
      if (!ca.length && !ck.length) return { ia: ia, segundos: r1.segundos, tps: r1.tps };
      return IA.generar([sys, { role: "user", content: rel + "Marca solo lo que el relato muestra o permite deducir con claridad.\n\nACTOS (lo que la persona hizo o dejó de hacer):\n" + (ca.length ? lin("actos", ca) : "(ninguno)") +
        "\n\nCONDICIONES (estado del lugar, del equipo, de la herramienta o del EPP):\n" + (ck.length ? lin("condiciones", ck) : "(ninguna)") +
        "\n\nElige como máximo 2 actos y 2 condiciones. Si ninguno aplica, deja la lista vacía.\nResponde solo con: {\"actos\":[],\"condiciones\":[]}" }],
        { max: 40, fase: "Paso 2 de 2: eligiendo actos y condiciones…" }).then(function (r2) {
        var j = AN.leerIA(r2.texto), seg = r1.segundos + r2.segundos;
        ia.actos = j.actos.filter(function (c) { return ca.indexOf(c) >= 0; }).slice(0, 2);
        ia.condiciones = j.condiciones.filter(function (c) { return ck.indexOf(c) >= 0; }).slice(0, 2);
        return { ia: ia, segundos: seg, tps: (r1.tokens + r2.tokens) / Math.max(seg, 0.01) };
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
      h += '<div class="an-g"><h4>' + AN.TITULO[k] + '</h4>' + (k === "fp" ? '<div class="small muted mb">Las causas básicas salen de la entrevista y la investigación: aquí van ordenadas por relación con lo marcado; elige las que se confirmaron.</div>' : "") + arr.map(function (o, i) {
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

/* =====================================================================
   🧪 Medición de precisión: compara lo que propone cada método con lo que se marcó de verdad.
   Usa los eventos reales cerrados de la base (sin contarse a sí mismos) y 16 casos de referencia típicos
   de fibra óptica (sin datos personales). SSOMA puede revisar y ajustar las causas esperadas.
   ===================================================================== */
AN.CASOS = [
  { d: "Al subir por la escalera telescópica para instalar la caja NAP en el poste, la escalera se deslizó porque no la amarró al poste. El técnico cayó desde unos 2 metros y se golpeó la cadera. No había llenado el ATS.", a: "Poste / red aérea", p: "Tronco / Espalda", n: "Contusión / Golpe", t: "AI", e: { contactos: ["C03"], inm: ["A03", "A16"], bas: ["FP7", "FT1"] } },
  { d: "Mientras pelaba el cable drop con el cúter en el domicilio del cliente, la cuchilla se resbaló y se cortó el dedo índice. No usaba los guantes anticorte porque le incomodaban.", a: "Domicilio del cliente (FTTH)", p: "Mano / Dedos", n: "Herida / Corte", e: { contactos: ["C02"], inm: ["A07", "A08"], bas: ["FP7", "FP5"] } },
  { d: "Para verificar el conector, el técnico miró directamente la punta de la fibra sin comprobar que estuviera apagada; el puerto tenía señal activa y sintió ardor en el ojo derecho.", a: "Nodo / data center", p: "Ojos", n: "Lesión ocular", e: { contactos: ["C10"], inm: ["A16", "A08"], bas: ["FP5"] } },
  { d: "Al levantar sola una bobina de fibra de unos 40 kg para subirla a la camioneta, sintió un tirón y dolor en la zona lumbar. No había carretilla disponible.", a: "Almacén", p: "Tronco / Espalda", n: "Lesión ergonómica", e: { contactos: ["C13"], inm: ["A11"], bas: ["FT5", "FP5"] } },
  { d: "Caminando por la vereda mojada por la lluvia hacia el poste, resbaló y se torció el tobillo izquierdo.", a: "Vehículo / vía pública", p: "Pie / Tobillo", n: "Esguince / Luxación", e: { contactos: ["C04"], inm: ["K07"], bas: [] } },
  { d: "Abrió la cámara subterránea e ingresó sin medir gases ni ventilar; a los pocos minutos se mareó y tuvo que salir con ayuda del compañero.", a: "Cámara / red subterránea", p: "Múltiple", n: "Intoxicación", e: { contactos: ["C14"], inm: ["A16", "K08", "K13"], bas: ["FP5", "FT6"] } },
  { d: "Tendiendo cable aéreo, el mensajero tocó una línea de media tensión energizada y el técnico recibió una descarga en la mano. No se respetó la distancia mínima de seguridad.", a: "Poste / red aérea", p: "Mano / Dedos", n: "Descarga eléctrica", t: "AI", e: { contactos: ["C08"], inm: ["A16"], bas: ["FT6", "FP5"] } },
  { d: "Al retroceder la camioneta en un pasaje estrecho sin vigía, el conductor golpeó un poste y dañó el parachoques.", a: "Vehículo / vía pública", p: "No aplica", n: "Sin lesión", t: "INC", e: { contactos: ["C01"], inm: ["A02", "K04"], bas: ["FT1", "FP7"] } },
  { d: "Al ingresar al patio del cliente para instalar el servicio, un perro suelto lo mordió en la pierna. El cliente no había amarrado al animal.", a: "Domicilio del cliente (FTTH)", p: "Miembro inferior", n: "Herida / Corte", e: { contactos: ["C15"], inm: [], bas: ["FT9"] } },
  { d: "Al retirar la fibra del horno de la empalmadora sin esperar a que enfríe, se quemó la yema de los dedos.", a: "Nodo / data center", p: "Mano / Dedos", n: "Quemadura", e: { contactos: ["C09"], inm: ["A07"], bas: ["FP7"] } },
  { d: "Taladrando la pared del cliente sin lentes de seguridad, se rompió la broca desgastada y una esquirla le cayó en el ojo.", a: "Domicilio del cliente (FTTH)", p: "Ojos", n: "Lesión ocular", e: { contactos: ["C02"], inm: ["A08", "A06", "K03"], bas: ["FT7"] } },
  { d: "En el nodo, con poca iluminación, se golpeó la cabeza contra una bandeja de cables instalada muy baja.", a: "Nodo / data center", p: "Cabeza", n: "Contusión / Golpe", e: { contactos: ["C01"], inm: ["K12", "K04"], bas: ["FT2"] } },
  { d: "Subiendo la escalera de fibra de vidrio, un peldaño que ya estaba rajado se rompió y el técnico cayó desde 1.5 metros. La escalera no pasó inspección preuso.", a: "Poste / red aérea", p: "Miembro inferior", n: "Contusión / Golpe", e: { contactos: ["C03"], inm: ["A06", "K14", "K03"], bas: ["FT4"] } },
  { d: "Desde lo alto del poste se le cayó el alicate y golpeó en el hombro al ayudante que estaba abajo sin casco; no se había delimitado la zona de trabajo.", a: "Poste / red aérea", p: "Miembro superior", n: "Contusión / Golpe", e: { contactos: ["C02"], inm: ["A02", "A08", "K05"], bas: ["FT1"] } },
  { d: "Después de una jornada de 14 horas, cansado, se tropezó con un rollo de cable dejado en el pasillo del almacén y cayó al piso.", a: "Almacén", p: "Miembro superior", n: "Contusión / Golpe", e: { contactos: ["C04"], inm: ["K07"], bas: ["FP3", "FT1"] } },
  { d: "Al cerrar la tapa metálica de la cámara, se atrapó los dedos entre la tapa y el marco porque la bajó con las manos en vez de usar la herramienta de izaje.", a: "Cámara / red subterránea", p: "Mano / Dedos", n: "Contusión / Golpe", e: { contactos: ["C05"], inm: ["A07"], bas: ["FP5"] } }
];
AN.casosPrueba = function () {
  var reales = S.eventos.filter(function (e) { var s = e.scat || {}; return !e.historico && e.estado !== "Anulado" && (s.contactos || []).length && ((s.actos || []).length + (s.condiciones || []).length) && String(e.descripcion || "").trim().length >= 25; })
    .map(function (e) { var s = e.scat; return { ev: e, fuente: "real", e: { contactos: s.contactos, inm: (s.actos || []).concat(s.condiciones || []), bas: (s.fp || []).concat(s.ft || []) } }; });
  var ref = AN.CASOS.map(function (c, i) { return { fuente: "referencia", e: c.e, ev: { id: "PRUEBA-" + (i + 1), descripcion: c.d, ambito: c.a, parte_cuerpo: c.p, naturaleza: c.n, tipo: c.t || "AL", fecha: "2000-01-01" } }; });
  return reales.concat(ref);
};
AN.vacio = function () { return { contactos: [], actos: [], condiciones: [], fp: [], ft: [], nac: [] }; };
/* El botón antiguo: con el contacto correcto ya elegido, toma las 2 primeras relaciones del catálogo en cada nivel. */
AN.antiguo = function (cs) {
  var s = { contactos: cs.e.contactos.slice(), actos: [], condiciones: [], fp: [], ft: [] }, sg = EV.sugerencias(s);
  s.actos = sg.actos.slice(0, 2); s.condiciones = sg.condiciones.slice(0, 2); sg = EV.sugerencias(s); s.fp = sg.fp.slice(0, 2); s.ft = sg.ft.slice(0, 2);
  return { contactos: s.contactos, inm: s.actos.concat(s.condiciones), bas: s.fp.concat(s.ft) };
};
AN.propuesta = function (res) {
  var on = function (k) { return res.R[k].filter(function (o) { return o.on; }).map(function (o) { return o.c; }); };
  var to = function (k) { return res.R[k].map(function (o) { return o.c; }); };
  return { contactos: on("contactos"), inm: on("actos").concat(on("condiciones")), bas: on("fp").concat(on("ft")),
    lista: { contactos: to("contactos"), inm: to("actos").concat(to("condiciones")), bas: to("fp").concat(to("ft")) } };
};
AN.puntuar = function (p, e, acum) {
  ["contactos", "inm", "bas"].forEach(function (k) {
    var a = acum[k] = acum[k] || { ok: 0, prop: 0, esp: 0, lis: 0 }, l = p.lista ? p.lista[k].concat(p[k]) : p[k];
    a.ok += p[k].filter(function (c) { return e[k].indexOf(c) >= 0; }).length; a.prop += p[k].length; a.esp += e[k].length;
    a.lis += e[k].filter(function (c) { return l.indexOf(c) >= 0; }).length;
  });
};
AN.tablaMedicion = function (filas) {
  var pc = function (a, b) { return b ? Math.round(a / b * 100) + "%" : "—"; };
  var celda = function (a) { return a ? '<td class="num"><b>' + pc(a.ok, a.prop) + '</b></td><td class="num">' + pc(a.ok, a.esp) + '</td><td class="num muted">' + pc(a.lis, a.esp) + '</td>' : '<td colspan="3" class="muted">—</td>'; };
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th rowspan="2">Método</th><th colspan="3">Contacto</th><th colspan="3">Causas inmediatas</th><th colspan="3">Causas básicas</th></tr>' +
    '<tr>' + [1, 2, 3].map(function () { return '<th>Precisión</th><th>Cobertura</th><th>En la lista</th>'; }).join("") + '</tr></thead><tbody>' +
    filas.map(function (f) { return '<tr><td>' + f[0] + '</td>' + (f[2] ? '<td colspan="3" class="small muted">lo eliges tú</td>' : celda(f[1].contactos)) + celda(f[1].inm) + celda(f[1].bas) + '</tr>'; }).join("") + '</tbody></table></div>' +
    '<p class="small muted mt"><b>Precisión</b>: de lo que premarca, cuánto era correcto (más alto = menos ruido). <b>Cobertura</b>: de las causas correctas, cuántas premarcó. <b>En la lista</b>: cuántas aparecen en la propuesta, aunque sea sin marcar (a un clic).</p>';
};
AN.medirBase = function (casos) {
  var A = {}, B = {}, D = {}, guardado = EV.draft;
  casos.forEach(function (cs) {
    EV.draft = AN.vacio(); AN.puntuar(AN.antiguo(cs), cs.e, A); AN.puntuar(AN.propuesta(AN.calcular(cs.ev, null)), cs.e, B);
    EV.draft = AN.vacio(); EV.draft.contactos = cs.e.contactos.slice(); var p = AN.propuesta(AN.calcular(cs.ev, null)); p.contactos = cs.e.contactos.slice(); AN.puntuar(p, cs.e, D);
  });
  EV.draft = guardado;
  return [["Botón antiguo (solo catálogo)", A, true], ["Análisis integral sin IA, con el contacto ya elegido", D, true], ["Análisis integral sin IA, desde cero", B]];
};
AN.medir = function () {
  var casos = AN.casosPrueba(), nReal = casos.filter(function (c) { return c.fuente === "real"; }).length, conIA = IA.visible();
  var m = modal({ title: "🧪 Precisión de las sugerencias SCAT", wide: true, cancel: "Cerrar",
    body: '<p style="margin-top:0">Compara lo que propone cada método con las causas marcadas de verdad en <b>' + casos.length + ' casos</b>: ' + nReal + ' eventos reales cerrados de la base (cada uno sin contarse a sí mismo) y ' + AN.CASOS.length + ' casos de referencia de fibra óptica.</p>' +
      '<div class="flex"><button class="btn primary" id="anM1">Medir sin IA (instantáneo)</button>' +
      (conIA ? '<button class="btn ia-btn" style="margin:0" id="anM2">✨ Medir también con IA (≈' + Math.ceil(casos.length * 0.5) + ' min)</button>' : "") + '</div><div id="anMR" class="mt"></div>' });
  $("#anM1", m.el).onclick = function () { $("#anMR", m.el).innerHTML = AN.tablaMedicion(AN.medirBase(casos)); };
  var b2 = $("#anM2", m.el);
  if (b2) b2.onclick = function () {
    var filas = AN.medirBase(casos), C = {}, i = 0, fallas = [], box = $("#anMR", m.el), guardado = EV.draft;
    b2.disabled = true; $("#anM1", m.el).disabled = true;
    (function sig() {
      if (!document.body.contains(box)) { EV.draft = guardado; return; }          // se cerró la ventana
      if (i >= casos.length) {
        EV.draft = guardado;
        box.innerHTML = AN.tablaMedicion(filas.concat([["✨ Análisis integral con IA (" + esc(IA.MODELOS[IA.conf().modelo].t) + ")", C]])) +
          (fallas.length ? '<details class="mt"><summary class="small">La IA eligió mal el contacto en ' + fallas.length + ' caso(s)</summary><ul class="small">' + fallas.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul></details>" : "");
        b2.disabled = false; $("#anM1", m.el).disabled = false; return;
      }
      var cs = casos[i];
      box.innerHTML = '<div class="ia-est"><span class="spin-b ia-spin"></span><span>Caso ' + (i + 1) + " de " + casos.length + " con IA…</span></div>";
      EV.draft = AN.vacio();
      AN.preguntarIA(cs.ev, {}).then(function (r) {
        EV.draft = AN.vacio(); AN.puntuar(AN.propuesta(AN.calcular(cs.ev, r.ia)), cs.e, C);
        if (r.ia.contactos.length && !r.ia.contactos.some(function (c) { return cs.e.contactos.indexOf(c) >= 0; }))
          fallas.push(String(cs.ev.descripcion).slice(0, 70) + "… → IA: " + r.ia.contactos.join(", ") + " · correcto: " + cs.e.contactos.join(", "));
      }).catch(function (e) { fallas.push("Error de la IA: " + (e && e.message || e)); }).then(function () { i++; sig(); });
    })();
  };
};
