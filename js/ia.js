/* ============================================================
   ASISTENTE IA LOCAL (beta) — Qwen3.5 en el navegador (WebGPU)
   El modelo corre en el equipo del usuario: los relatos y datos
   del accidente NO se envían a ningún servidor ni a la nube.
   Se descarga una sola vez desde Hugging Face y queda en caché.
   Todo lo que genera es un BORRADOR que la persona revisa.
   ============================================================ */
var IA = {
  LIB: "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js",   // versión fija, con onnxruntime incluido (sin dependencias sueltas)
  MODELOS: {
    "2b": { id: "onnx-community/Qwen3.5-2B-ONNX", t: "Qwen3.5-2B (recomendado)", peso: "1,4 GB" },
    "08b": { id: "onnx-community/Qwen3.5-0.8B-ONNX", t: "Qwen3.5-0.8B (liviano, para equipos modestos)", peso: "0,6 GB" }
  },
  K: "scat_ia", estado: "sin_revisar", pipe: null, T: null, cargando: null,

  /* ---------- preferencias y compatibilidad ---------- */
  conf: function () { try { var c = JSON.parse(localStorage.getItem(IA.K) || "{}") || {}; return { activo: c.activo !== false, modelo: IA.MODELOS[c.modelo] ? c.modelo : "2b", permitido: !!c.permitido }; } catch (e) { return { activo: true, modelo: "2b", permitido: false }; } },
  guardar: function (k, v) { var c = IA.conf(); c[k] = v; try { localStorage.setItem(IA.K, JSON.stringify(c)); } catch (e) {} },
  revisar: function () {                                              // ¿el equipo tiene WebGPU con números de media precisión?
    if (!navigator.gpu) { IA.estado = "incompatible"; return Promise.resolve(false); }
    return navigator.gpu.requestAdapter().then(function (a) {
      IA.estado = a && a.features.has("shader-f16") ? "compatible" : "incompatible"; IA.gpu = a && a.info ? (a.info.vendor + " " + (a.info.architecture || "")).trim() : "";
      return IA.estado === "compatible";
    }).catch(function () { IA.estado = "incompatible"; return false; });
  },
  visible: function () { return IA.estado === "compatible" && IA.conf().activo; },

  /* ---------- carga del modelo (una vez por sesión) ---------- */
  cargar: function (onProg) {
    if (IA.pipe) return Promise.resolve(IA.pipe);
    if (IA.cargando) return IA.cargando;
    var m = IA.MODELOS[IA.conf().modelo], archivos = {};
    // Durante la carga: reintenta las descargas que se cortan (wifi inestable) y recuerda qué archivo falló, para informarlo.
    var fetchOriginal = window.fetch, restaurar = function () { window.fetch = fetchOriginal; };
    var esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var fallo = function (url, e, n) {
      var corto = url.replace(/^https?:\/\//, "").split("?")[0].replace(/\/resolve\/main\//, "/…/").slice(0, 90);
      var err = new Error("No se pudo descargar «" + corto + "» tras " + n + " intentos (" + (e && e.message || e) + "). Revisa tu conexión o si un bloqueador o el filtro de la red bloquea huggingface.co / hf.co.");
      err.archivo = url; return err;
    };
    // Los archivos del modelo se bajan por partes de 16 MB: si la conexión se corta a mitad, solo se repite esa parte (hasta 6 veces).
    var PARTE = 16 * 1024 * 1024;
    var porPartes = function (url) {
      var total = 0;
      var trozo = function (desde, intento) {
        var hasta = total ? Math.min(desde + PARTE, total) - 1 : desde + PARTE - 1;
        return fetchOriginal(url, { headers: { Range: "bytes=" + desde + "-" + hasta } }).then(function (r) {
          if (desde === 0 && r.status === 416) return fetchOriginal(url).then(function (s) { return { completo: s }; });   // archivo vacío
          if (desde === 0 && r.status !== 206) return { completo: r };               // sin partes, o 404 de un archivo opcional: tal cual
          if (r.status !== 206) throw new Error("HTTP " + r.status);
          if (!total) total = +String(r.headers.get("content-range") || "").split("/")[1] || 0;
          return r.arrayBuffer().then(function (b) { return { datos: new Uint8Array(b), tipo: r.headers.get("content-type") }; });
        }).catch(function (e) {
          if (intento < 6) return esperar(1500 * intento).then(function () { return trozo(desde, intento + 1); });
          throw fallo(url, e, 6);
        });
      };
      return trozo(0, 1).then(function (p) {
        if (p.completo) return p.completo;
        if (!total) total = p.datos.length;
        var pos = 0, siguiente = p;
        var cuerpo = new ReadableStream({
          pull: function (c) {
            if (pos >= total) { c.close(); return; }
            var t = siguiente ? Promise.resolve(siguiente) : trozo(pos, 1); siguiente = null;
            return t.then(function (q) { if (!q.datos.length) throw fallo(url, "respuesta vacía", 6); pos += q.datos.length; c.enqueue(q.datos); if (pos >= total) c.close(); });
          }
        });
        return new Response(cuerpo, { status: 200, headers: { "content-length": String(total), "content-type": p.tipo || "application/octet-stream" } });
      });
    };
    window.fetch = function (u, o) {
      var url = String(u && u.url || u), metodo = String(o && o.method || u && u.method || "GET").toUpperCase();
      if (metodo === "GET" && /huggingface\.co|hf\.co/.test(url)) return porPartes(url);
      var intento = 0;
      return (function prueba() {
        return fetchOriginal(u, o).catch(function (e) {
          if (++intento < 4) return esperar(1500 * intento).then(prueba);
          throw fallo(url, e, 4);
        });
      })();
    };
    IA.cargando = import(IA.LIB).then(function (T) {
      IA.T = T; T.env.allowLocalModels = false;
      return T.pipeline("text-generation", m.id, { dtype: "q4f16", device: "webgpu",
        progress_callback: function (p) {
          if (p.status === "progress" && p.total) { archivos[p.file] = [p.loaded || 0, p.total]; var a = 0, b = 0; for (var f in archivos) { a += archivos[f][0]; b += archivos[f][1]; } onProg && onProg(Math.round(a / b * 100), b); }
          if (p.status === "ready") onProg && onProg(100, 0);
        } });
    }).then(function (pipe) { restaurar(); IA.pipe = pipe; IA.cargando = null; return pipe; })
      .catch(function (e) { restaurar(); IA.cargando = null; console.error("[IA] carga del modelo:", e); throw e; });
    return IA.cargando;
  },
  /* Genera con streaming; devuelve el texto final sin el bloque de «pensamiento». */
  generar: function (mensajes, o) {
    o = o || {};
    return IA.cargar(o.onProg).then(function (pipe) {
      var txt = "", t0 = performance.now(), n = 0;
      var streamer = new IA.T.TextStreamer(pipe.tokenizer, { skip_prompt: true, skip_special_tokens: true,
        callback_function: function (t) { txt += t; n++; o.onToken && o.onToken(IA.limpiar(txt)); } });
      return pipe(mensajes, { max_new_tokens: o.max || 320, do_sample: false, repetition_penalty: 1.05, streamer: streamer, tokenizer_encode_kwargs: { enable_thinking: false } })
        .then(function (out) {
          var g = out && out[0] && out[0].generated_text, fin = Array.isArray(g) ? (g[g.length - 1] || {}).content : g;
          var seg = (performance.now() - t0) / 1000;
          return { texto: IA.limpiar(fin || txt), tokens: n, segundos: seg, tps: n / Math.max(seg, 0.01) };
        });
    });
  },
  limpiar: function (s) { return String(s || "").replace(/<think>[\s\S]*?(<\/think>|$)/g, "").replace(/^\s+/, "").trim(); },

  /* Pide permiso antes de la primera descarga y muestra el avance. */
  preparar: function () {
    var c = IA.conf(), m = IA.MODELOS[c.modelo];
    if (IA.pipe || c.permitido) return Promise.resolve(true);
    return new Promise(function (res) {
      var listo = false, md = modal({ title: "Activar el asistente IA en este equipo", ok: "Descargar y activar", cancel: "Ahora no",
        body: '<div class="callout info mb"><span>🔒</span><div><b>Funciona dentro de tu computadora</b>Los relatos y datos del accidente no salen de este equipo: no se envían a ningún servidor ni a la nube.</div></div>' +
          '<p style="margin:0">Se descargará una sola vez el modelo <b>' + esc(m.t) + '</b> (' + m.peso + ') desde Hugging Face. Después queda guardado en el navegador.</p>' +
          '<p class="small muted mt">Lo que genera es un borrador: revísalo antes de usarlo. Puedes desactivarlo o cambiar de modelo en «Mi cuenta».</p>',
        onOk: function () { listo = true; IA.guardar("permitido", true); res(true); } });
      $$("[data-x]", md.el).forEach(function (x) { x.addEventListener("click", function () { if (!listo) res(false); }); });
    });
  },
  /* Ventana con avance de descarga, texto en vivo y botones para aplicar o descartar. */
  ventana: function (titulo, alAplicar) {
    var m = modal({ title: titulo, wide: true, cancel: "Descartar", ok: "Usar este borrador", sticky: true,
      body: '<div class="ia-est" id="iaEst"><span class="spin-b ia-spin"></span><span id="iaEstT">Preparando el asistente…</span></div><div class="bar mt" id="iaBarW" hidden><i id="iaBar" style="width:0"></i></div>' +
        '<div class="ia-out" id="iaOut" hidden></div><div class="ia-nota" id="iaNota" hidden>✨ Borrador generado por IA en este equipo · revísalo antes de guardar</div>',
      onOk: function () { return alAplicar ? alAplicar(m) : true; } });
    $("[data-ok]", m.el).disabled = true;
    return {
      m: m,
      prog: function (p, total) { var w = $("#iaBarW", m.el); if (!w) return; w.hidden = p >= 100; $("#iaBar", m.el).style.width = p + "%"; $("#iaEstT", m.el).textContent = p >= 100 ? "Pensando…" : "Descargando el modelo (solo la primera vez): " + p + "%" + (total ? " de " + fmt(total / 1e9, 1) + " GB" : ""); },
      texto: function (t) { var o = $("#iaOut", m.el); if (!o) return; o.hidden = false; o.textContent = t; $("#iaEstT", m.el).textContent = "Escribiendo…"; },
      fin: function (r) { var e = $("#iaEst", m.el); if (!e) return; e.innerHTML = "✓ Listo en " + fmt(r.segundos, 1) + " s · " + fmt(r.tps, 1) + " palabras/s aprox."; $("#iaNota", m.el).hidden = false; $("[data-ok]", m.el).disabled = false; },
      error: function (err) { var e = $("#iaEst", m.el); if (e) e.innerHTML = '<span class="t-bad">No se pudo usar el asistente en este equipo.</span> <span class="small muted">' + esc(String(err && err.message || err).slice(0, 420)) + '</span>'; }
    };
  },

  /* ---------- 1) Ordenar el relato del suceso ---------- */
  ordenar: function (btn) {
    var campo = btn.closest(".f").querySelector('[data-k="descripcion"]'), relato = campo.value.trim();
    if (relato.length < 15) return toast("Escribe primero qué pasó (aunque sea en pocas palabras) y luego ordénalo con IA.", "bad");
    var root = btn.closest("#view") || document, val = function (k) { var el = $('[data-k="' + k + '"]', root); return el && el.value ? (el.tagName === "SELECT" ? el.options[el.selectedIndex].text : el.value) : ""; };
    var datos = [["Fecha", val("fecha")], ["Hora", val("hora")], ["Lugar", val("lugar")], ["Ámbito", val("ambito")], ["Tarea", val("tarea")], ["Proceso", val("proceso")], ["Puesto del trabajador", val("puesto")]].filter(function (x) { return x[1] && !/Seleccionar/.test(x[1]); });
    IA.preparar().then(function (ok) {
      if (!ok) return;
      var v = IA.ventana("✨ Ordenar el relato del suceso", function () { campo.value = v.resultado; campo.dispatchEvent(new Event("input")); toast("Relato reemplazado: revísalo y guarda.", "ok"); return true; });
      IA.generar([
        { role: "system", content: "Eres un asistente de seguridad y salud en el trabajo de una empresa peruana de telecomunicaciones (fibra óptica). Reescribes relatos de accidentes e incidentes en español claro, neutral y profesional. Reglas: usa SOLO los hechos del relato y de los datos; no inventes nada; no culpes a nadie; no agregues causas, opiniones ni recomendaciones; no uses nombres de personas. Escribe en tercera persona y en pasado, en uno o dos párrafos breves, en este orden: qué tarea se realizaba, qué ocurrió y cómo, qué lesión o daño hubo y qué se hizo inmediatamente. Si un dato no aparece, simplemente omítelo." },
        { role: "user", content: (datos.length ? "Datos del evento:\n" + datos.map(function (x) { return "- " + x[0] + ": " + x[1]; }).join("\n") + "\n\n" : "") + "Relato original:\n\"\"\"\n" + relato.slice(0, 2500) + "\n\"\"\"\n\nDevuelve solo el relato reescrito, sin títulos ni comentarios." }
      ], { max: 360, onProg: v.prog, onToken: v.texto }).then(function (r) { v.resultado = r.texto; v.texto(r.texto); v.fin(r); }).catch(v.error);
    });
  },

  /* ---------- 2) Sugerir causas SCAT (solo códigos del catálogo) ---------- */
  sugerirScat: function () {
    var ev = L.evento(EV.id); if (!ev) return;
    var lista = function (l) { return CAT[l].map(function (o) { return o.c + " " + o.t; }).join("\n"); };
    IA.preparar().then(function (ok) {
      if (!ok) return;
      var v = IA.ventana("✨ Sugerir causas SCAT a partir del relato", function () {
        var s = EV.draft, n = 0; (v.sel || []).forEach(function (x) { if (s[x.k].indexOf(x.c) < 0) { s[x.k].push(x.c); n++; } });
        toast(n ? n + " causa(s) marcadas: revísalas en el análisis y guarda." : "No había causas nuevas para marcar.", "ok"); EV.re(); return true;
      });
      IA.generar([
        { role: "system", content: "Eres un analista de accidentes que aplica la técnica SCAT (Systematic Cause Analysis Technique). Lees el relato y eliges, de las listas dadas, los códigos que mejor lo explican. Solo puedes usar códigos que aparezcan en las listas. Si el relato no da información para una categoría, deja esa lista vacía. Responde únicamente con JSON válido." },
        { role: "user", content: "Relato del evento:\n\"\"\"\n" + String(ev.descripcion || "").slice(0, 1800) + (ev.tarea ? "\nTarea: " + ev.tarea : "") + (ev.parte_cuerpo ? "\nParte del cuerpo: " + ev.parte_cuerpo : "") + "\n\"\"\"\n\n" +
          "TIPOS DE CONTACTO:\n" + lista("contactos") + "\n\nACTOS SUBESTÁNDAR:\n" + lista("actos") + "\n\nCONDICIONES SUBESTÁNDAR:\n" + lista("condiciones") +
          "\n\nResponde solo con este JSON (máximo 2 contactos, 4 actos y 4 condiciones):\n{\"contactos\":[\"C00\"],\"actos\":[\"A00\"],\"condiciones\":[\"K00\"],\"explicacion\":\"una frase breve\"}" }
      ], { max: 180, onProg: v.prog, onToken: function () { $("#iaEstT", v.m.el) && ($("#iaEstT", v.m.el).textContent = "Analizando el relato…"); } }).then(function (r) {
        var j = {}; try { j = JSON.parse((r.texto.match(/\{[\s\S]*\}/) || ["{}"])[0]); } catch (e) {
          var cods = r.texto.match(/\b[CAK]\d{2}\b/g) || []; j = { contactos: cods.filter(function (c) { return c[0] === "C"; }), actos: cods.filter(function (c) { return c[0] === "A"; }), condiciones: cods.filter(function (c) { return c[0] === "K"; }) };
        }
        var vale = function (l, a) { return (Array.isArray(a) ? a : []).map(function (c) { return String(c).trim().toUpperCase().slice(0, 3); }).filter(function (c, i, arr) { return CAT.get(l, c) && arr.indexOf(c) === i; }); };
        var sel = [].concat(vale("contactos", j.contactos).slice(0, 2).map(function (c) { return { k: "contactos", l: "contactos", c: c }; }),
          vale("actos", j.actos).slice(0, 4).map(function (c) { return { k: "actos", l: "actos", c: c }; }),
          vale("condiciones", j.condiciones).slice(0, 4).map(function (c) { return { k: "condiciones", l: "condiciones", c: c }; }));
        v.sel = sel;
        var o = $("#iaOut", v.m.el); o.hidden = false;
        o.innerHTML = sel.length ? (j.explicacion ? '<p style="margin:0 0 10px"><b>Lectura del asistente:</b> ' + esc(String(j.explicacion).slice(0, 300)) + '</p>' : "") +
          '<div class="small muted mb">Desmarca lo que no corresponda. Lo marcado se agrega al análisis (no reemplaza lo que ya tienes).</div>' +
          sel.map(function (x, i) { return '<label class="chk on"><input type="checkbox" checked data-i="' + i + '"><span><span class="code">' + x.c + '</span>' + esc(CAT.txt(x.l, x.c)) + ' <span class="small muted">· ' + ({ contactos: "contacto", actos: "acto", condiciones: "condición" }[x.k]) + '</span></span></label>'; }).join("")
          : '<div class="callout warn"><span>!</span><div>El asistente no encontró causas claras en el relato. Completa la descripción del evento con más detalle y vuelve a intentarlo.</div></div>';
        $$("input[data-i]", o).forEach(function (cb) { cb.onchange = function () { cb.parentNode.classList.toggle("on", cb.checked); v.sel = sel.filter(function (x, i) { var c = $('input[data-i="' + i + '"]', o); return c && c.checked; }); }; });
        v.fin(r); if (!sel.length) $("[data-ok]", v.m.el).disabled = true;
      }).catch(v.error);
    });
  },

  /* ---------- 3) Prueba de velocidad (Mi cuenta) ---------- */
  probar: function () {
    IA.preparar().then(function (ok) {
      if (!ok) return;
      var t0 = performance.now(), v = IA.ventana("✨ Prueba del asistente en este equipo", function () { return true; });
      $("[data-ok]", v.m.el).textContent = "Cerrar";
      IA.generar([{ role: "system", content: "Reescribe relatos de accidentes en español claro, en tercera persona y en pasado, sin inventar datos." },
        { role: "user", content: "Relato: \"estaba subiendo la escalera para tender el cable de fibra y la escalera se resbalo porque el piso estaba mojado, me cai como un metro y me torci el tobillo, mi compañero me llevo a la clinica\". Devuelve solo el relato reescrito." }],
        { max: 160, onProg: v.prog, onToken: v.texto }).then(function (r) {
          var carga = (performance.now() - t0) / 1000 - r.segundos; v.texto(r.texto); v.fin(r);
          var e = $("#iaEst", v.m.el); if (e) e.innerHTML = "✓ Carga del modelo: <b>" + fmt(Math.max(carga, 0), 1) + " s</b> · Redacción: <b>" + fmt(r.segundos, 1) + " s</b> · Velocidad: <b>" + fmt(r.tps, 1) + " palabras/s</b> aprox." +
            (r.tps < 2 ? '<div class="small muted mt">Es lento en este equipo: prueba el modelo liviano (0.8B) en «Mi cuenta».</div>' : "");
        }).catch(v.error);
    });
  },

  /* Agrega el botón «Ordenar con IA» bajo los campos de relato editables. */
  adornar: function (root) {
    if (!IA.visible()) return;
    $$('textarea[data-k="descripcion"]:not([disabled])', root || document).forEach(function (t) {
      var f = t.closest(".f"); if (!f || $(".ia-btn", f)) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "btn sm ia-btn"; b.innerHTML = "✨ Ordenar el relato con IA";
      b.title = "Reescribe el relato de forma clara (qué, cómo, cuándo, dónde) sin inventar datos. Funciona en este equipo."; b.onclick = function () { IA.ordenar(b); };
      f.appendChild(b);
    });
  },
  /* Bloque de preferencias en «Mi cuenta». */
  panel: function () {
    var c = IA.conf(), est = IA.estado === "compatible" ? '<span class="pill ok">Compatible' + (IA.gpu ? " · " + esc(IA.gpu) : "") + '</span>' : IA.estado === "incompatible" ? '<span class="pill">No compatible (sin WebGPU)</span>' : '<span class="pill">Revisando…</span>';
    return '<div class="card" style="max-width:680px"><h3>✨ Asistente IA local <small>beta · Qwen3.5</small></h3>' +
      '<p class="small muted" style="margin-top:-6px">Ordena relatos y sugiere causas SCAT. Funciona dentro de esta computadora: los datos no salen del equipo.</p>' +
      '<div class="plazo"><span>Este equipo</span>' + est + '</div>' +
      (IA.estado === "compatible" ? '<label class="pref"><span><b>Usar el asistente en este equipo</b><small>Muestra los botones ✨ en el reporte y en el análisis SCAT.</small></span><input type="checkbox" class="sw" ' + (c.activo ? "checked" : "") + ' onchange="IA.guardar(\'activo\',this.checked);Views.cuenta()"></label>' +
        '<div class="pref"><span><b>Modelo</b><small>El 0.8B es más rápido en equipos modestos, pero redacta peor.</small></span><select onchange="IA.guardar(\'modelo\',this.value);IA.pipe=null;toast(\'Modelo cambiado\',\'ok\')">' +
        Object.keys(IA.MODELOS).map(function (k) { return '<option value="' + k + '"' + (c.modelo === k ? " selected" : "") + '>' + IA.MODELOS[k].t + ' · ' + IA.MODELOS[k].peso + '</option>'; }).join("") + '</select></div>' +
        '<div class="flex mt"><button class="btn primary" onclick="IA.probar()">✨ Probar velocidad en este equipo</button></div>' : "") + '</div>';
  }
};
