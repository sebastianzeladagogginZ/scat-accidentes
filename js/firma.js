/* ============================================================
   FIRMA ELECTRÓNICA — selfie + firma manuscrita con el dedo
   (mismo patrón que el Hub de exámenes de inducción)
   ============================================================ */
var FIRMA = {
  /* Abre el asistente y resuelve con {nombre,dni,cargo,selfie,firma} o null si se cancela. */
  capturar: function (slot, titulo) {
    return new Promise(function (resolve) {
      var st = { selfie: null, firma: null, stream: null, has: false };
      var m = modal({
        title: "Firmar · " + titulo, wide: true, sticky: true,
        body:
          '<div class="sig-steps"><span class="on" id="fsS1">1 · Datos</span><span id="fsS2">2 · Selfie</span><span id="fsS3">3 · Firma</span></div>' +
          '<div class="callout info mb"><span>✍️</span><div><b>' + esc(slot.rol) + '</b>La firma queda registrada con foto, fecha, hora, usuario que la captura y una huella del contenido del documento.</div></div>' +
          '<div class="grid g3" id="fsDatos">' +
            campo({ k: "nombre", label: "Nombres y apellidos", req: true, col: "span2" }, slot.nombre || "", slot.fijo) +
            campo({ k: "dni", label: "DNI / CE", req: true }, slot.dni || "", slot.fijo && slot.dni) +
            campo({ k: "cargo", label: "Cargo", col: "span3" }, slot.cargo || "") +
          '</div>' +
          '<div class="row2 mt">' +
            '<div><div class="sub-h">Selfie <span class="req">*</span></div><div class="selfie-box" id="fsSelfie"><video id="fsVid" playsinline muted hidden></video><img id="fsImg" hidden alt="selfie"><div class="ph" id="fsPh">📷<br>Activa la cámara frontal</div></div>' +
              '<div class="flex mt"><button class="btn primary sm" id="fsCam">📷 Activar cámara</button><button class="btn sm" id="fsShot" hidden>● Tomar foto</button><label class="btn sm">🖼 Subir foto<input type="file" id="fsFile" accept="image/*" capture="user" hidden></label></div></div>' +
            '<div><div class="sub-h">Firma con el dedo o el mouse <span class="req">*</span></div><div class="sig-box"><canvas id="fsCv"></canvas><div class="sig-hint" id="fsHint">✍️ Firme aquí</div><div class="sig-line"></div></div>' +
              '<div class="flex mt"><button class="btn sm" id="fsClr">↺ Borrar firma</button><span class="small muted">Firme dentro del recuadro.</span></div></div>' +
          '</div>',
        ok: "Registrar firma",
        onOpen: function (bg) {
          var vid = $("#fsVid", bg), img = $("#fsImg", bg), ph = $("#fsPh", bg);
          function paso() {
            $("#fsS2", bg).classList.toggle("on", !!st.selfie);
            $("#fsS3", bg).classList.toggle("on", st.has);
          }
          function mostrarSelfie(url) { st.selfie = url; img.src = url; img.hidden = false; vid.hidden = true; ph.hidden = true; parar(); $("#fsShot", bg).hidden = true; $("#fsCam", bg).textContent = "↺ Repetir"; paso(); }
          function parar() { if (st.stream) { st.stream.getTracks().forEach(function (t) { t.stop(); }); st.stream = null; } }
          FIRMA._parar = parar;
          $("#fsCam", bg).onclick = function () {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $("#fsFile", bg).click(); return; }
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } }, audio: false }).then(function (s) {
              st.stream = s; vid.srcObject = s; vid.hidden = false; img.hidden = true; ph.hidden = true; vid.play(); $("#fsShot", bg).hidden = false;
            }).catch(function () { toast("No se pudo abrir la cámara: sube una foto.", "bad"); $("#fsFile", bg).click(); });
          };
          $("#fsShot", bg).onclick = function () { mostrarSelfie(FIRMA.recorte(vid, vid.videoWidth, vid.videoHeight)); };
          $("#fsFile", bg).onchange = function (e) {
            var f = e.target.files && e.target.files[0]; if (!f) return;
            var im = new Image(), u = URL.createObjectURL(f);
            im.onload = function () { mostrarSelfie(FIRMA.recorte(im, im.width, im.height)); URL.revokeObjectURL(u); }; im.src = u;
          };
          /* --- pad de firma --- */
          var cv = $("#fsCv", bg), ctx = cv.getContext("2d"), drawing = false, last = null;
          function fit() {
            var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
            cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0b2540";
          }
          setTimeout(fit, 30);
          function pos(e) { var r = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
          function start(e) { e.preventDefault(); drawing = true; last = pos(e); st.has = true; $("#fsHint", bg).style.display = "none"; paso(); }
          function move(e) {
            if (!drawing) return; e.preventDefault(); var p = pos(e);
            ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p;
          }
          function end() { drawing = false; }
          cv.addEventListener("pointerdown", function (e) { cv.setPointerCapture(e.pointerId); start(e); });
          cv.addEventListener("pointermove", move);
          cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
          cv.style.touchAction = "none";
          $("#fsClr", bg).onclick = function () { fit(); st.has = false; $("#fsHint", bg).style.display = ""; paso(); };
          st.cv = cv;
          $$("[data-x]", bg).forEach(function (b) { b.addEventListener("click", function () { parar(); resolve(null); }); });
        },
        onOk: function (bg) {
          var d = leerForm($("#fsDatos", bg), [{ k: "nombre", label: "Nombre", req: true }, { k: "dni", label: "DNI", req: true }, { k: "cargo" }], {});
          if (!d) return false;
          if (!/^\d{8,12}$/.test(String(d.dni).replace(/\D/g, ""))) { toast("DNI / CE inválido", "bad"); return false; }
          if (!st.selfie) { toast("Falta la selfie", "bad"); return false; }
          if (!st.has) { toast("Falta la firma", "bad"); return false; }
          d.selfie = st.selfie; d.firma = FIRMA.exportarFirma(st.cv);
          if (FIRMA._parar) FIRMA._parar();
          resolve(d);
        }
      });
    });
  },
  /* Recorte cuadrado centrado, comprimido (selfie ligera para el registro). */
  recorte: function (src, w, h) {
    var s = Math.min(w, h), px = CONFIG.SELFIE_PX, c = document.createElement("canvas"); c.width = px; c.height = px;
    var x = c.getContext("2d"); x.translate(px, 0); x.scale(-1, 1);          // espejo natural de selfie
    x.drawImage(src, (w - s) / 2, (h - s) / 2, s, s, 0, 0, px, px);
    var q = 0.72, out = c.toDataURL("image/jpeg", q);
    while (out.length > 45000 && q > 0.3) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
    return out;
  },
  /* Firma reescalada y recortada al trazo (PNG liviano). */
  exportarFirma: function (cv) {
    var W = cv.width, H = cv.height, ctx = cv.getContext("2d"), data = ctx.getImageData(0, 0, W, H).data;
    var x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (var y = 0; y < H; y += 2) for (var x = 0; x < W; x += 2) { if (data[(y * W + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 <= x0) { x0 = 0; y0 = 0; x1 = W; y1 = H; }
    var pad = 12; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
    var bw = x1 - x0, bh = y1 - y0, k = Math.min(CONFIG.FIRMA_W / bw, CONFIG.FIRMA_H / bh, 1);
    var o = document.createElement("canvas"); o.width = Math.max(1, Math.round(bw * k)); o.height = Math.max(1, Math.round(bh * k));
    o.getContext("2d").drawImage(cv, x0, y0, bw, bh, 0, 0, o.width, o.height);
    return o.toDataURL("image/png");
  },
  /* Bloque visual de firma (pantalla y PDF) — mismo diseño del formato ONI. */
  bloque: function (f, slot, opts) {
    opts = opts || {};
    if (!f) {
      return '<div class="fb pend"><div class="fb-ph">👤</div><div class="fb-d"><b>' + esc(slot.nombre || "Pendiente de firma") + '</b><span>' + esc(slot.rol) + '</span>' +
        (slot.req ? '<span class="req-t">Firma requerida</span>' : '<span class="muted">Firma opcional</span>') + '</div><div class="fb-s"><div class="fb-line"></div><small>Firma del responsable</small>' +
        (opts.boton ? '<button class="btn primary sm" style="margin-top:6px" onclick="' + opts.boton + '">✍️ Firmar</button>' : "") + '</div></div>';
    }
    var alterado = opts.hashActual && f.hash && f.hash !== opts.hashActual;
    var img = function (s) { return /^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/]+={0,2}$/.test(String(s || "")) ? s : ""; };   // solo imágenes válidas
    return '<div class="fb' + (alterado ? " alt" : "") + '"><img class="fb-ph" src="' + img(f.selfie) + '" alt="selfie"><div class="fb-d"><b>' + esc(f.nombre) + '</b><span>Cargo: ' + esc(f.cargo || slot.rol) + '</span><span>Documento: ' + esc(f.dni || "—") + '</span><span>Fecha y hora: ' + FIRMA.fechaHora(f.ts) + '</span>' +
      (opts.pdf ? "" : '<span class="small muted">' + esc(slot.rol) + (f.por_nombre && f.por_nombre !== f.nombre ? " · capturada por " + esc(f.por_nombre) : "") + '</span>') +
      (alterado ? '<span class="req-t">⚠ El documento cambió después de esta firma</span>' : "") + '</div>' +
      '<div class="fb-s"><img src="' + img(f.firma) + '" alt="firma"><small>Firma del responsable</small>' + (opts.pdf ? '<small style="font-size:7px;color:#94a3b8">Huella ' + esc(f.hash || "") + '</small>' : "") +
      (opts.boton ? '<button class="btn sm" style="margin-top:4px" onclick="' + opts.boton + '">↺ Volver a firmar</button>' : "") + '</div></div>';
  },
  fechaHora: function (iso) {
    var d = new Date(iso); if (isNaN(d)) return iso || "";
    var p = function (n) { return ("0" + n).slice(-2); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  },
  /* Huella del contenido (FNV-1a) para detectar cambios posteriores a la firma. */
  huella: function (obj) {
    var s = typeof obj === "string" ? obj : JSON.stringify(obj), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return ("0000000" + h.toString(16)).slice(-8).toUpperCase();
  }
};
