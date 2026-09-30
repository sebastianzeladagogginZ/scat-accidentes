/* ============================================================
   CATÁLOGOS SCAT + MOTOR DE REGLAS
   Optical Networks S.A.C. · SST-PR-03 / Anexo 03
   ------------------------------------------------------------
   Cada ítem tiene un CÓDIGO ESTABLE (los eventos guardan el código).
   Referencias cruzadas del cuadro SCAT:
     Tipo de contacto → causas inmediatas  (a: actos, k: condiciones)
     Causa inmediata  → causas básicas     (fp / ft)
     Causa básica     → elementos NAC      (nac)
   Plan de acción: cada ítem trae su plantilla de acción ("acc"),
   el responsable sugerido ("resp") y el tipo de medida ("tipo").
   Marcadores: {tarea} {lugar} {division} {area} {id}
   Las sugerencias SOLO resaltan opciones: el equipo investigador decide.
   ============================================================ */
var CAT = {};

/* ---- Áreas y divisiones: se leen del Panel SSOMA (?action=areas). Esta copia
        es el respaldo si el panel no responde (distribución SEG-F-010). ---- */
CAT.SEP = " ▸ ";
CAT.AREAS_DIV_RESPALDO = {
  "INSPECCIÓN Y DISEÑO": ["Inspección y Diseño - Corporativo"],
  "MANTENIMIENTO": ["Mantenimiento - Corporativo","Mantenimiento - Ultra","Mangas Críticas","ON Negocios","Normalización de Red"],
  "NETWORKING": ["Instalaciones - Corporativo","ON-Site - Corporativo"],
  "PLANTA EXTERNA": ["Planta Externa - Corporativo","ON Negocios","Normalización - Preventivo"]
};
CAT.divisiones = [];           // ["PLANTA EXTERNA ▸ ON Negocios", ...]  (se llena en App.init)
CAT.areaDe = function (c) { c = String(c || ""); var i = c.indexOf(CAT.SEP); return i < 0 ? c : c.slice(0, i); };
CAT.divDe  = function (c) { c = String(c || ""); var i = c.indexOf(CAT.SEP); return i < 0 ? c : c.slice(i + CAT.SEP.length); };
CAT.areas  = function () { var m = {}; CAT.divisiones.forEach(function (d) { m[CAT.areaDe(d)] = 1; }); return Object.keys(m).sort(); };
CAT.setDivisiones = function (lista) {
  var m = {};
  (lista || []).forEach(function (x) { x = String(x || "").trim(); if (x && x !== "*" && x.indexOf(CAT.SEP) > 0) m[x] = 1; });
  if (!Object.keys(m).length) Object.keys(CAT.AREAS_DIV_RESPALDO).forEach(function (a) { CAT.AREAS_DIV_RESPALDO[a].forEach(function (d) { m[a + CAT.SEP + d] = 1; }); });
  CAT.divisiones = Object.keys(m).sort();
};

CAT.ambito = ["Poste / red aérea","Cámara / red subterránea","Domicilio del cliente (FTTH)","Nodo / data center","Almacén","Vehículo / vía pública","Oficina","Obra civil","Otro"];
CAT.regimen = ["Planilla","Recibo por honorarios","Contratista","Subcontratista"];
CAT.parteCuerpo = ["Cabeza","Ojos","Cara","Cuello","Tronco / Espalda","Miembro superior","Mano / Dedos","Miembro inferior","Pie / Tobillo","Múltiple","No aplica"];
CAT.naturaleza = ["Contusión / Golpe","Herida / Corte","Fractura","Esguince / Luxación","Quemadura","Lesión ergonómica","Descarga eléctrica","Intoxicación","Lesión ocular","Sin lesión","Otro"];
CAT.turno = ["Mañana","Tarde","Noche"];

CAT.tipoEvento = [
  {c:"AM",  t:"Accidente mortal",        cuentaIF:true,  mtpe24:true,  color:"#7f1d1d"},
  {c:"AI",  t:"Accidente incapacitante", cuentaIF:true,  mtpe24:false, color:"#dc2626"},
  {c:"AL",  t:"Accidente leve",          cuentaIF:false, mtpe24:false, color:"#f59e0b"},
  {c:"IP",  t:"Incidente peligroso",     cuentaIF:false, mtpe24:true,  color:"#7c3aed"},
  {c:"INC", t:"Incidente",               cuentaIF:false, mtpe24:false, color:"#0284c7"},
  {c:"CA",  t:"Cuasi accidente",         cuentaIF:false, mtpe24:false, color:"#64748b"},
  {c:"EO",  t:"Enfermedad ocupacional",  cuentaIF:false, mtpe24:false, color:"#16a34a"}
];

/* ---- Bloque 1 · Potencial de pérdida ---- */
CAT.gravedad     = [{c:"MAY",t:"Mayor / Grave",n:3,d:"Lesión incapacitante permanente, fatalidad o pérdida mayor"},{c:"SER",t:"Serio",n:2,d:"Lesión incapacitante temporal o daño importante"},{c:"MEN",t:"Menor",n:1,d:"Lesión leve o daño menor"}];
CAT.probabilidad = [{c:"ALT",t:"Alta",n:3,d:"Puede repetirse con frecuencia"},{c:"MOD",t:"Moderada",n:2,d:"Puede repetirse ocasionalmente"},{c:"RAR",t:"Rara",n:1,d:"Poco probable que se repita"}];
CAT.exposicion   = [{c:"EXT",t:"Extensiva",n:3,d:"Muchas personas o tareas expuestas"},{c:"MOD",t:"Moderada",n:2,d:"Algunas personas expuestas"},{c:"BAJ",t:"Baja",n:1,d:"Pocas personas expuestas"}];
CAT.riesgo = function (g, p, e) {
  var G = (CAT.get("gravedad", g) || {}).n || 0, P = (CAT.get("probabilidad", p) || {}).n || 0, E = (CAT.get("exposicion", e) || {}).n || 0;
  if (!G || !P) return null;
  var s = G * P + (E >= 3 ? 1 : 0);
  if (s >= 6) return { nivel: "Alto",  plazo: 15, color: "bad",  n: 3 };
  if (s >= 3) return { nivel: "Medio", plazo: 30, color: "warn", n: 2 };
  return            { nivel: "Bajo",  plazo: 45, color: "ok",   n: 1 };
};

/* ---- Bloque 2 · Tipo de contacto ---- */
CAT.contactos = [
  {c:"C01",t:"Golpeado contra un objeto (chocar contra algo)",        a:["A04","A07","A16"],             k:["K04","K07","K12","K14"], acc:"Delimitar y señalizar obstáculos y rutas de desplazamiento en {lugar} para eliminar puntos de choque.", resp:"JEFE"},
  {c:"C02",t:"Golpeado por un objeto en movimiento o que cae",        a:["A02","A03","A09","A10","A16"], k:["K01","K03","K04","K05"], acc:"Establecer zona de exclusión bajo el área de trabajo e izaje/amarre de herramientas y materiales en {tarea}.", resp:"JEFE"},
  {c:"C03",t:"Caída a distinto nivel (desde altura)",                 a:["A08","A12","A16","A07"],       k:["K02","K14","K05","K12"], acc:"Exigir sistema anticaídas (arnés, línea de vida, punto de anclaje certificado) y PETAR de altura antes de {tarea}.", resp:"SST"},
  {c:"C04",t:"Caída al mismo nivel (resbalón o tropiezo)",            a:["A12","A04","A16"],             k:["K07","K14","K12"],       acc:"Inspeccionar superficies de tránsito y mantener orden y limpieza en {lugar}; retirar o señalizar desniveles.", resp:"JEFE"},
  {c:"C05",t:"Atrapado en (puntos de pellizco o de mordida)",         a:["A03","A05","A13","A07"],       k:["K01","K03"],             acc:"Identificar y proteger los puntos de atrapamiento de los equipos usados en {tarea}.", resp:"JEFE"},
  {c:"C06",t:"Atrapado sobre o dentro de un equipo",                  a:["A03","A13","A01"],             k:["K01","K03"],             acc:"Implementar bloqueo y etiquetado (LOTO) antes de intervenir equipos en {tarea}.", resp:"SST"},
  {c:"C07",t:"Atrapado entre o debajo de objetos",                    a:["A09","A10","A03","A16"],       k:["K04","K01","K14"],       acc:"Asegurar la estabilidad de cargas, bobinas y materiales apilados en {lugar}.", resp:"JEFE"},
  {c:"C08",t:"Contacto con electricidad",                             a:["A03","A01","A05","A08","A16"], k:["K01","K02","K03","K05"], acc:"Verificar ausencia de tensión y respetar distancias mínimas de seguridad a redes energizadas antes de {tarea}.", resp:"SST"},
  {c:"C09",t:"Contacto con calor o frío",                             a:["A08","A16"],                   k:["K11","K02","K06"],       acc:"Controlar la exposición térmica (EPP térmico, pausas, hidratación) en {tarea}.", resp:"SST"},
  {c:"C10",t:"Contacto con radiación (incl. láser de fibra óptica)",  a:["A08","A16"],                   k:["K10","K02"],             acc:"Prohibir la observación directa de conectores activos y usar protección ocular para láser en {tarea}.", resp:"SST"},
  {c:"C11",t:"Contacto con sustancias químicas",                      a:["A08","A09","A10","A16"],       k:["K08","K13","K02"],       acc:"Disponer de hojas MSDS en campo y EPP químico para las sustancias usadas en {tarea}.", resp:"SST"},
  {c:"C12",t:"Exposición a ruido",                                    a:["A08"],                         k:["K09","K02"],             acc:"Medir el nivel de ruido en {lugar} y dotar protección auditiva según resultado.", resp:"SST"},
  {c:"C13",t:"Sobreesfuerzo, sobretensión o sobrecarga (ergonómico)", a:["A11","A12","A16"],             k:["K04","K03"],             acc:"Implementar ayudas mecánicas y límite de carga manual (25 kg) para {tarea}.", resp:"JEFE"},
  {c:"C14",t:"Exposición o inmersión (asfixia, espacio confinado)",   a:["A16","A01","A08"],             k:["K08","K13","K05"],       acc:"Aplicar protocolo de espacio confinado (medición de gases, ventilación, vigía) antes de ingresar a {lugar}.", resp:"SST"},
  {c:"C15",t:"Mordedura, picadura o ataque de animal",                a:["A08","A16"],                   k:["K02","K07"],             acc:"Inspeccionar el entorno antes de {tarea} y dotar repelente/EPP para exposición a animales.", resp:"JEFE"}
];

/* ---- Bloque 3 · Causas inmediatas ---- */
CAT.actos = [
  {c:"A01",t:"Operar equipos o vehículos sin autorización",               fp:["FP7","FP5"],       ft:["FT1","FT6"],       acc:"Restringir la operación de equipos/vehículos al personal autorizado y publicar la relación de autorizados de {division}.", resp:"JEFE"},
  {c:"A02",t:"No señalar ni advertir",                                    fp:["FP5","FP7"],       ft:["FT6","FT9","FT1"], acc:"Exigir señalización y advertencia del área de trabajo (conos, cintas, vigía) como condición de inicio de {tarea}.", resp:"JEFE"},
  {c:"A03",t:"No asegurar ni bloquear equipos o energías (falta de LOTO)",fp:["FP5","FP6","FP7"], ft:["FT6","FT1","FT5"], acc:"Entrenar en bloqueo de energías y verificar en campo el uso de candados y tarjetas en {tarea}.", resp:"SST"},
  {c:"A04",t:"Operar a velocidad inadecuada",                             fp:["FP7","FP3","FP4"], ft:["FT1","FT6"],       acc:"Controlar velocidades (GPS / observación) y retroalimentar al personal de {division}.", resp:"JEFE"},
  {c:"A05",t:"Anular o retirar dispositivos de seguridad",                fp:["FP7"],             ft:["FT2","FT1","FT8"], acc:"Reinstalar los dispositivos de seguridad retirados y aplicar el régimen de consecuencias del RISST.", resp:"JEFE"},
  {c:"A06",t:"Usar equipos o herramientas defectuosos",                   fp:["FP7","FP5"],       ft:["FT4","FT5","FT7","FT3"], acc:"Retirar de servicio y etiquetar las herramientas defectuosas; implementar el código de colores de inspección.", resp:"JEFE"},
  {c:"A07",t:"Usar equipos o herramientas de manera incorrecta",          fp:["FP5","FP6"],       ft:["FT5","FT6","FT1"], acc:"Instruir en el uso correcto de las herramientas empleadas en {tarea} con demostración práctica.", resp:"SST"},
  {c:"A08",t:"No usar el EPP requerido o usarlo mal",                     fp:["FP5","FP7"],       ft:["FT3","FT5","FT1","FT6"], acc:"Verificar el uso correcto del EPP antes de iniciar {tarea} (check de inicio de jornada firmado por el supervisor).", resp:"JEFE"},
  {c:"A09",t:"Cargar, ubicar o mezclar de manera incorrecta",             fp:["FP5","FP6"],       ft:["FT6","FT1"],       acc:"Definir la forma correcta de carga y ubicación de materiales para {tarea}.", resp:"JEFE"},
  {c:"A10",t:"Almacenar de manera incorrecta",                            fp:["FP5"],             ft:["FT6","FT2"],       acc:"Reordenar el almacenamiento según estándar (altura máxima, estabilidad, rotulado) en {lugar}.", resp:"JEFE"},
  {c:"A11",t:"Levantar o manipular cargas de forma incorrecta",           fp:["FP1","FP3","FP5"], ft:["FT2","FT5","FT6"], acc:"Capacitar en técnica de levantamiento seguro y trabajo en pareja para cargas mayores a 25 kg.", resp:"SST"},
  {c:"A12",t:"Adoptar una posición o postura inadecuada para la tarea",   fp:["FP1","FP3","FP5"], ft:["FT2","FT6"],       acc:"Evaluar ergonómicamente {tarea} y corregir posturas con pausas activas y ayudas.", resp:"MEDICO"},
  {c:"A13",t:"Dar mantenimiento a equipos en funcionamiento",             fp:["FP5","FP7"],       ft:["FT6","FT1","FT4"], acc:"Prohibir intervenciones con el equipo en marcha: detener, bloquear y verificar energía cero.", resp:"SST"},
  {c:"A14",t:"Bromas o juegos durante el trabajo",                        fp:["FP7"],             ft:["FT1","FT8"],       acc:"Aplicar medida disciplinaria según RISST y reforzar conducta segura en la cuadrilla.", resp:"RRHH"},
  {c:"A15",t:"Trabajar bajo influencia de alcohol u otras drogas",        fp:["FP2","FP4","FP7"], ft:["FT1","FT6"],       acc:"Aplicar el protocolo de alcohol y drogas (prueba aleatoria) y el régimen de consecuencias del RISST.", resp:"RRHH"},
  {c:"A16",t:"No respetar el procedimiento de trabajo (PETS / ATS)",      fp:["FP5","FP7","FP6"], ft:["FT1","FT6","FT9"], acc:"Reinstruir el PETS/ATS de {tarea} y verificar su cumplimiento con observación en campo.", resp:"JEFE"}
];
CAT.condiciones = [
  {c:"K01",t:"Guardas o protecciones inadecuadas",                                 fp:[],      ft:["FT2","FT4","FT3"],       acc:"Instalar o reparar las guardas y protecciones de los equipos en {lugar}.", resp:"JEFE"},
  {c:"K02",t:"EPP inadecuado, insuficiente o en mal estado",                       fp:[],      ft:["FT3","FT5","FT4","FT7"], acc:"Reponer de inmediato el EPP faltante o deteriorado del personal de {division}.", resp:"LOG"},
  {c:"K03",t:"Herramientas, equipos o materiales defectuosos",                     fp:[],      ft:["FT4","FT5","FT7","FT3","FT8"], acc:"Reemplazar las herramientas/equipos defectuosos involucrados y revisar los de las demás cuadrillas.", resp:"LOG"},
  {c:"K04",t:"Espacio de trabajo restringido o congestionado",                     fp:[],      ft:["FT2","FT1"],             acc:"Rediseñar la distribución del área o planificar la tarea para garantizar espacio seguro en {lugar}.", resp:"JEFE"},
  {c:"K05",t:"Señalización o sistemas de advertencia insuficientes",               fp:[],      ft:["FT2","FT6","FT9"],       acc:"Dotar kit de señalización completo (conos, cintas, letreros) a las cuadrillas de {division}.", resp:"LOG"},
  {c:"K06",t:"Riesgo de incendio o explosión",                                     fp:[],      ft:["FT2","FT4","FT6"],       acc:"Eliminar fuentes de ignición y verificar extintores operativos en {lugar}.", resp:"SST"},
  {c:"K07",t:"Orden y limpieza deficientes (housekeeping)",                        fp:[],      ft:["FT1","FT6"],             acc:"Ejecutar jornada de orden y limpieza (5S) en {lugar} e incluirla en la inspección semanal.", resp:"JEFE"},
  {c:"K08",t:"Condiciones ambientales peligrosas (gases, polvos, humos, vapores)", fp:[],      ft:["FT2","FT6"],             acc:"Monitorear la atmósfera de trabajo y dotar protección respiratoria adecuada en {lugar}.", resp:"SST"},
  {c:"K09",t:"Exposición a ruido",                                                 fp:[],      ft:["FT2","FT3"],             acc:"Aislar la fuente de ruido o rotar al personal expuesto en {lugar}.", resp:"SST"},
  {c:"K10",t:"Exposición a radiación",                                             fp:[],      ft:["FT2","FT6"],             acc:"Señalizar fuentes de radiación/láser y limitar la exposición en {lugar}.", resp:"SST"},
  {c:"K11",t:"Exposición a temperaturas extremas",                                 fp:[],      ft:["FT2","FT6"],             acc:"Programar la tarea en horarios de menor exposición térmica y asegurar hidratación.", resp:"JEFE"},
  {c:"K12",t:"Iluminación deficiente o excesiva",                                  fp:[],      ft:["FT2","FT4"],             acc:"Dotar iluminación portátil adecuada para {tarea}.", resp:"LOG"},
  {c:"K13",t:"Ventilación inadecuada",                                             fp:[],      ft:["FT2","FT4"],             acc:"Implementar ventilación forzada antes y durante el trabajo en {lugar}.", resp:"SST"},
  {c:"K14",t:"Superficies o accesos en mal estado (postes, escaleras, cámaras)",   fp:["FP6"], ft:["FT4","FT6","FT1"],       acc:"Reparar o reportar a la entidad titular el acceso/estructura en mal estado y prohibir su uso hasta su corrección.", resp:"JEFE"}
];

/* ---- Bloque 4 · Causas básicas ---- */
CAT.fPersonales = [
  {c:"FP1",t:"Capacidad física o fisiológica inadecuada",                  nac:["N13","N10"],       acc:"Evaluar la aptitud física del trabajador para {tarea} (examen médico ocupacional).", resp:"MEDICO"},
  {c:"FP2",t:"Capacidad mental o psicológica inadecuada",                  nac:["N13","N10"],       acc:"Derivar a evaluación psicológica/ocupacional y revisar la asignación a tareas críticas.", resp:"MEDICO"},
  {c:"FP3",t:"Tensión o fatiga física",                                    nac:["N11","N04","N01"], acc:"Revisar jornadas, horas extra y pausas del personal de {division}; limitar jornadas prolongadas.", resp:"RRHH"},
  {c:"FP4",t:"Tensión o estrés mental",                                    nac:["N10","N01","N12"], acc:"Evaluar factores de riesgo psicosocial (carga, metas, presión de tiempo) en {division}.", resp:"RRHH"},
  {c:"FP5",t:"Falta de conocimiento (capacitación insuficiente)",          nac:["N02","N04","N12"], acc:"Capacitar al personal involucrado en los peligros y controles de {tarea} con evaluación de eficacia.", resp:"SST"},
  {c:"FP6",t:"Falta de habilidad o experiencia",                           nac:["N02","N06","N13"], acc:"Implementar entrenamiento práctico supervisado (acompañamiento de un técnico senior) para {tarea}.", resp:"JEFE"},
  {c:"FP7",t:"Motivación inadecuada (apuro, atajos, exceso de confianza)", nac:["N01","N08","N06","N12"], acc:"Revisar la presión por productividad en {division} y reforzar liderazgo visible y reconocimiento de conductas seguras.", resp:"JEFE"}
];
CAT.fTrabajo = [
  {c:"FT1",t:"Liderazgo o supervisión inadecuados",                          nac:["N01","N06","N03"], acc:"Reforzar la supervisión de campo de {division}: visitas programadas y verificación de controles críticos.", resp:"JEFE"},
  {c:"FT2",t:"Ingeniería o diseño inadecuados",                              nac:["N11","N04"],       acc:"Revisar el diseño del método/equipo de {tarea} e incorporar controles de ingeniería.", resp:"JEFE"},
  {c:"FT3",t:"Adquisiciones o compras inadecuadas",                          nac:["N14","N09"],       acc:"Actualizar las especificaciones técnicas de compra de EPP y herramientas con validación de SSOMA.", resp:"LOG"},
  {c:"FT4",t:"Mantenimiento inadecuado",                                     nac:["N03","N11"],       acc:"Implementar programa de mantenimiento preventivo de los equipos usados en {tarea}.", resp:"LOG"},
  {c:"FT5",t:"Herramientas, equipos y materiales inadecuados",               nac:["N14","N03","N09"], acc:"Estandarizar las herramientas y equipos adecuados para {tarea} y dotarlos a todas las cuadrillas.", resp:"LOG"},
  {c:"FT6",t:"Estándares de trabajo inadecuados o inexistentes (PETS / ATS)",nac:["N04","N08","N02"], acc:"Elaborar o actualizar el PETS/ATS de {tarea} con participación de los trabajadores.", resp:"SST"},
  {c:"FT7",t:"Uso y desgaste normal no controlado",                          nac:["N03","N11"],       acc:"Definir la vida útil y criterios de reemplazo de equipos y EPP de {division}.", resp:"LOG"},
  {c:"FT8",t:"Abuso o mal uso de equipos tolerado",                          nac:["N03","N06","N08"], acc:"Establecer control del uso de equipos y consecuencias ante mal uso reiterado.", resp:"JEFE"},
  {c:"FT9",t:"Comunicación deficiente entre áreas o con contratistas",       nac:["N12","N14","N01"], acc:"Establecer canal de coordinación previa (charla / reunión de arranque) entre {division} y contratistas.", resp:"JEFE"}
];

/* ---- Bloque 5 · NAC — la acción cambia según P / S / C ---- */
CAT.nac = [
  {c:"N01",t:"Liderazgo y compromiso de la dirección",       resp:"JEFE",
    P:"Establecer un programa de liderazgo visible en SST para la línea de mando de {division} (visitas y metas de seguridad).",
    S:"Actualizar las responsabilidades en SST de jefes y supervisores de {division} y su evaluación de desempeño.",
    C:"Presentar el evento {id} al Comité SST y ejecutar visita de liderazgo de la gerencia con las cuadrillas de {division}."},
  {c:"N02",t:"Capacitación y entrenamiento",                 resp:"SST",
    P:"Incluir en el Programa Anual de Capacitación el curso específico de {tarea} con evaluación de eficacia.",
    S:"Actualizar el contenido y la duración de la capacitación de {tarea} (teoría + práctica + evaluación).",
    C:"Verificar que todo el personal de {division} tenga vigente la capacitación de {tarea}; reprogramar a quienes no."},
  {c:"N03",t:"Inspecciones planeadas",                       resp:"SST",
    P:"Crear el programa de inspecciones planeadas de herramientas, EPP y accesos para {division}.",
    S:"Actualizar el checklist de inspección preuso (escaleras, EPP, herramientas) con criterios de rechazo.",
    C:"Cumplir y auditar las inspecciones preuso diarias en {division}; registrar y hacer seguimiento semanal."},
  {c:"N04",t:"Procedimientos y análisis de tareas (PETS / ATS)", resp:"SST",
    P:"Identificar {tarea} como tarea crítica y elaborar su PETS con análisis de riesgos.",
    S:"Revisar y actualizar el PETS/ATS de {tarea} incorporando los controles identificados en {id}.",
    C:"Difundir el PETS de {tarea} y verificar su aplicación en campo mediante OPT."},
  {c:"N05",t:"Investigación de accidentes e incidentes",     resp:"SST",
    P:"Fortalecer el proceso de reporte e investigación de incidentes en {division}.",
    S:"Actualizar los criterios de investigación del SST-PR-03 con las lecciones del evento {id}.",
    C:"Difundir las lecciones aprendidas del evento {id} en charla de 5 minutos a todo el personal."},
  {c:"N06",t:"Observación planeada de tareas",               resp:"SST",
    P:"Implementar el programa de Observaciones Planeadas de Tarea (OPT) en {division}.",
    S:"Definir frecuencia mínima y formato de OPT para {tarea}.",
    C:"Ejecutar observaciones planeadas de {tarea} a las cuadrillas de {division} durante los próximos 3 meses."},
  {c:"N07",t:"Preparación y respuesta ante emergencias",     resp:"SST",
    P:"Elaborar el plan de respuesta ante emergencias específico para {tarea} (rescate / primeros auxilios).",
    S:"Actualizar el plan de emergencias y los recursos (botiquín, camilla, rescate) para {lugar}.",
    C:"Ejecutar un simulacro de emergencia de {tarea} con las cuadrillas de {division}."},
  {c:"N08",t:"Reglas y estándares internos (RISST)",         resp:"JEFE",
    P:"Incorporar en el RISST la regla de oro aplicable a {tarea}.",
    S:"Actualizar las reglas y permisos de trabajo (PETAR) aplicables a {tarea}.",
    C:"Aplicar el régimen de consecuencias del RISST y reforzar el cumplimiento de reglas en {division}."},
  {c:"N09",t:"Equipos de protección personal",               resp:"LOG",
    P:"Elaborar la matriz de EPP por puesto de {division}.",
    S:"Actualizar las especificaciones del EPP requerido para {tarea}.",
    C:"Verificar la entrega y el uso correcto del EPP en campo (inspección sorpresa en {division})."},
  {c:"N10",t:"Control de salud ocupacional e higiene",       resp:"MEDICO",
    P:"Incluir la evaluación médica específica para {tarea} en el programa de vigilancia médica.",
    S:"Actualizar el protocolo médico ocupacional del puesto afectado.",
    C:"Verificar que el personal de {division} tenga EMO vigente y aptitud para la tarea."},
  {c:"N11",t:"Controles de ingeniería",                      resp:"JEFE",
    P:"Evaluar e implementar controles de ingeniería para {tarea} (barreras, anclajes, ayudas mecánicas).",
    S:"Definir el estándar técnico de los controles de ingeniería para {lugar}.",
    C:"Verificar que los controles de ingeniería existentes estén operativos en {lugar}."},
  {c:"N12",t:"Comunicación y difusión",                      resp:"SST",
    P:"Establecer el procedimiento de comunicación de alertas de seguridad a todo el personal.",
    S:"Estandarizar el formato de alerta de seguridad y los canales de difusión.",
    C:"Comunicar el evento {id}, sus causas y controles a todo el personal (correo, mural, intranet)."},
  {c:"N13",t:"Selección y ubicación del personal",           resp:"RRHH",
    P:"Definir el perfil de puesto y los requisitos para tareas críticas como {tarea}.",
    S:"Actualizar los criterios de selección y asignación a {tarea}.",
    C:"Verificar que el personal asignado a {tarea} cumpla el perfil y la experiencia requeridos."},
  {c:"N14",t:"Control de adquisiciones y contratistas",      resp:"LOG",
    P:"Implementar el programa de homologación SST de proveedores y contratistas.",
    S:"Actualizar los requisitos SST de compra y de contratistas para {tarea}.",
    C:"Auditar el cumplimiento SST del contratista/proveedor involucrado."},
  {c:"N15",t:"Evaluación y auditoría del programa",          resp:"SST",
    P:"Incluir el elemento fallido en el programa de auditorías internas del SGSST.",
    S:"Actualizar los indicadores de seguimiento del elemento fallido.",
    C:"Verificar en la próxima auditoría interna la eficacia de las acciones del evento {id}."}
];
CAT.psc = [{c:"P",t:"P – Programa inadecuado",d:"No existe el programa o actividad"},{c:"S",t:"S – Estándares inadecuados",d:"Existe, pero el estándar es insuficiente"},{c:"C",t:"C – Cumplimiento inadecuado",d:"El estándar existe y no se cumplió"}];

/* ---- Responsables genéricos del plan (se asignan a usuarios reales si existen) ---- */
CAT.respTag = { JEFE:"Jefe de división", SST:"Supervisor SST", MEDICO:"Médico ocupacional", RRHH:"Recursos Humanos", LOG:"Logística" };

/* ---- Evidencias (Anexo 02 · 4P) ---- */
CAT.evidencias = [
  {g:"Personas", ic:"👥", items:["Declaración del trabajador lesionado","Declaración del supervisor","Declaración de los testigos"]},
  {g:"Posición", ic:"📐", items:["Fotografías del lugar (4 ángulos)","Croquis / plano del lugar","Posición de personas, equipos y materiales"]},
  {g:"Papel",    ic:"📄", items:["PETS / ATS de la tarea","PETAR / permiso de trabajo","Registro de capacitación","Inspección preuso de equipos / EPP","Registro de mantenimiento","Charla de 5 minutos del día"]},
  {g:"Partes",   ic:"🔧", items:["Equipos / herramientas involucrados","EPP utilizado","Otras evidencias físicas"]}
];

/* ---- Descansos médicos ---- */
CAT.dmOrigen = ["Accidente de trabajo","Enfermedad ocupacional","Enfermedad común","Accidente común","Maternidad / otro"];
CAT.dmDocumento = ["CITT EsSalud","Certificado médico particular","Descanso médico de clínica / EPS","Certificado de SCTR","Informe médico"];
CAT.dmEstado = ["Pendiente","Validado","Observado"];

/* ---- Acciones ---- */
CAT.accTipo = ["Inmediata","Correctiva","Preventiva"];
CAT.accEstado = ["Pendiente","En proceso","Cerrada"];
CAT.eficacia = ["En verificación","Sí","No"];
CAT.estados = ["Reportado","En investigación","Observado","En revisión","Aprobado","Cerrado","Anulado"];

/* ---- Roles ---- */
CAT.roles = {
  ADMIN:      {t:"Administrador SSOMA",           desc:"Todo: usuarios, auditoría, aprobar, cerrar y anular."},
  SST:        {t:"Supervisor SST / Investigador", desc:"Ve todas las áreas, investiga, aprueba y verifica eficacia."},
  MEDICO:     {t:"Médico ocupacional / Bienestar",desc:"Gestiona y valida descansos médicos (ve diagnósticos)."},
  JEFE:       {t:"Jefe de división",              desc:"Reporta e investiga en su área/división; ejecuta sus acciones."},
  COMITE:     {t:"Comité SST",                    desc:"Consulta, observa investigaciones y firma el plan de acción."},
  REPORTANTE: {t:"Reportante",                    desc:"Reporta eventos y ve sus propios reportes."}
};

/* ---- Índices ---- */
CAT._idx = {};
["contactos","actos","condiciones","fPersonales","fTrabajo","nac","tipoEvento","gravedad","probabilidad","exposicion","psc"].forEach(function (k) {
  CAT[k].forEach(function (x) { CAT._idx[x.c + "@" + k] = x; });
});
CAT.get = function (lista, cod) { return CAT._idx[cod + "@" + lista] || null; };
CAT.txt = function (lista, cod) { var x = CAT.get(lista, cod); return x ? x.t : (cod || ""); };
CAT.tipoTxt = function (cod) { return CAT.txt("tipoEvento", cod); };
CAT.listaDe = function (cod) {           // "A03" → "actos"
  var p = String(cod).replace(/\d+$/, "");
  return { C: "contactos", A: "actos", K: "condiciones", FP: "fPersonales", FT: "fTrabajo", N: "nac" }[p];
};
CAT.nivelDe = function (cod) {
  return { contactos: "Tipo de contacto", actos: "Acto subestándar", condiciones: "Condición subestándar", fPersonales: "Factor personal", fTrabajo: "Factor del trabajo", nac: "Falta de control (NAC)" }[CAT.listaDe(cod)] || "";
};
