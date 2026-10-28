# Auditoría de seguridad: SCAT v2.1

**Sistema:** gestión de accidentes SCAT de Optical Networks S.A.C.
**Fecha:** 30/09/2026
**Alcance:** frontend (GitHub Pages) y backend (Google Apps Script en ssomaoni@gmail.com, con Sheets y Drive).

## Resultado

La auditoría encontró **7 riesgos, todos corregidos** y verificados antes de publicar.
Quedan **3 riesgos aceptados**, cada uno con su mitigación (ver al final).

## Hallazgos corregidos

| # | Riesgo | Severidad | Corrección aplicada |
|---|---|---|---|
| 1 | **Barridos de números de documento** para encontrar DNI registrados. | Alta | Bloqueo por documento y freno global ante muchos intentos fallidos; todo queda en la auditoría (ver "Ingreso solo con DNI / CE"). |
| 2 | **Inyección de fórmulas en la hoja**: un texto como `=IMPORTXML(...)` en un campo se habría ejecutado en el Google Sheet y podría filtrar datos. | Alta | Todo texto que empiece con `= + - @` se guarda como texto literal en todas las escrituras a la hoja. |
| 3 | **Inyección de código por las imágenes de firma**: se aceptaba cualquier texto que empezara como imagen. | Alta | El servidor y la app validan la imagen de forma estricta (solo PNG/JPEG en base64 puro, con tamaño máximo). El documento y el firmante se validan contra una lista cerrada. |
| 4 | **Adjuntos peligrosos**: un archivo HTML o SVG subido como "evidencia" podía ejecutar código al abrirse. | Alta | Solo se aceptan PDF, JPG, PNG, WEBP, HEIC, Word, Excel y CSV, validados por tipo **y** por extensión. El visor solo muestra PDF e imágenes; todo lo demás se descarga sin interpretarse. |
| 5 | **Fugas de información técnica**: los errores internos se mostraban al usuario. | Media | El usuario ve un mensaje genérico; el detalle queda solo en los registros de Apps Script. |
| 6 | **Datos malformados o gigantes** (fechas inválidas, registros de más de 50 000 caracteres). | Media | El servidor valida fechas, horas, tipos de evento y tamaño máximo antes de guardar. |
| 7 | **Inyección de fórmulas en los CSV exportados** (Excel las ejecuta al abrir). | Baja | Las celdas que empiezan con `= + - @` se exportan como texto. |

## Controles que ya existían y se verificaron

- **Sesión:** token aleatorio de 44 caracteres, válido 6 h, que se invalida al cerrar sesión. El usuario y su rol se releen del servidor en cada petición.
- **Fuerza bruta:** bloqueo de 15 min tras 8 intentos fallidos, registrado en la auditoría.
- **Autorización en el servidor:** cada escritura revalida rol, área/división, estado del evento y versión, para evitar pisar cambios ajenos. Las firmas de rol (SSOMA, jefe, comité, entrevistador) solo las registra el rol autorizado, siempre a su propio nombre.
- **Datos médicos (Ley 29733):** el diagnóstico, el CIE-10, el médico y el certificado solo los reciben los roles ADMIN, SST y MÉDICO. El resto ve "🔒 reservado" y no puede descargar el sustento.
- **Drive:** los archivos son privados; no hay enlaces públicos. Solo se descargan a través del backend, que valida permisos y deja registro.
- **Trazabilidad:** todo cambio queda en `Auditoria` con usuario, fecha y "antes → después". Las hojas `Auditoria` y `Firmas` están protegidas contra edición manual.
- **Política de contenido (CSP) en la página:** solo ejecuta scripts propios y de cdnjs, y solo se conecta a Google Apps Script. Además, `no-referrer`.
- **Salida de datos a pantalla:** todo texto de usuario se escapa antes de mostrarse, para evitar inyección de código (XSS).

## Ingreso solo con DNI / CE (v2.3, decisión de SSOMA del 30/09/2026)

A pedido de SSOMA, el ingreso es **solo con el número de documento registrado** en la hoja `Usuarios`, sin contraseña. Se advirtió que cualquiera que conozca un DNI registrado entra con ese perfil (incluidos los perfiles que ven datos médicos). Las protecciones que se mantienen:

- **Solo entran documentos registrados y activos.** SSOMA controla la lista en "Usuarios y accesos" y puede desactivar a alguien al instante.
- **Bloqueo por documento:** 8 intentos fallidos bloquean ese DNI/CE durante 15 minutos.
- **Freno global contra barridos:** 40 documentos no registrados en 10 minutos pausan los ingresos nuevos 10 minutos y quedan en la auditoría (`login_freno_global`).
- **Trazabilidad:** cada ingreso queda registrado (`login`) con la persona y la hora. Cada acción posterior guarda quién la hizo.
- **Roles:** siguen aplicándose en el servidor (datos médicos solo para ADMIN, SST y MÉDICO; aprobaciones solo para SSOMA).
- **Este equipo:** solo guarda nombre y rol de los "accesos recientes", nunca claves. Se pueden olvidar desde la pantalla de ingreso o desde "Mi cuenta".

**Recomendación:** si en el futuro se requiere más protección para los perfiles con datos médicos, se puede volver a exigir una clave solo a ADMIN, SST y MÉDICO, sin cambiar el ingreso del resto.

## Revisión v3.0 (28/10/2026): navegación, buscador y pendientes

Se revisó el código nuevo de navegación (`js/guia.js`) con estas comprobaciones:

- **Enlaces manipulados:** se probaron direcciones con código HTML/JavaScript en el código del evento (`#/evento/<script>…`, `<img onerror>`, `<svg onload>`) y con caracteres inválidos. No se ejecutó nada: se muestran como texto y la app responde "Evento no encontrado".
- **Botones generados:** ningún dato del usuario se inserta dentro de código `onclick`; los botones usan atributos `data-` escapados.
- **"Retoma donde te quedaste" (Ley 29733):** en el navegador solo se guarda el código del evento y la pestaña, **nunca nombres de trabajadores**. El texto se arma con los datos que el usuario tiene permiso de ver; si pierde el acceso, el elemento desaparece. La clave de almacenamiento usa una huella del documento, no el DNI en claro, y se borran las claves de formato anterior.
- **Mis pendientes y buscador:** trabajan solo con los datos que el servidor ya entregó al usuario según su rol y área; no piden información adicional al backend.
- **Modo demostración local (`?demo`):** solo funciona en `localhost`; en la versión publicada no tiene efecto.
- **Sin dependencias nuevas:** no se agregaron librerías ni conexiones externas; la política de contenido (CSP) no cambia.
- **Avisos de tareas nuevas (v3.2):** la app vuelve a pedir sus propios datos al servidor cada 5 minutos, con la misma sesión y los mismos permisos; no pausa ni interrumpe pantallas de edición. El sonido se genera en el propio navegador (sin archivos externos) y la vibración solo funciona en celulares que la permiten. Se pueden apagar en «Mi cuenta».
- **Modo oscuro y presentación (v3.2):** solo cambian colores y tamaños en pantalla. Se comprobó que el PDF generado es idéntico píxel a píxel en modo claro y oscuro.

## Histórico de SSOMA y seguimiento médico (v3.4 · servidor 2.4)

- **Ningún dato del histórico está en el código público.** La importación lee el Excel en el navegador del administrador y lo envía directo a la base privada (Google Sheets). En GitHub solo hay categorías genéricas (procesos, diagnósticos frecuentes), sin datos de personas.
- **Solo el administrador importa**, y el servidor verifica el rol. Cada fila entra como expediente **cerrado**, sin generar tareas ni correos. Las filas repetidas se omiten mediante una huella de fecha y trabajador.
- **Datos clínicos reservados:** el diagnóstico, el órgano afectado, la gravedad clínica, la terapia física y el seguimiento solo los reciben ADMIN, SST y MÉDICO. El resto ve "🔒 reservado". La situación laboral, el seguro y la próxima evaluación sí son visibles, porque el jefe necesita conocer las restricciones del trabajador.
- **Salvaguardas mientras el servidor no esté en 2.4:** la app no muestra los campos clínicos nuevos y bloquea la importación. Así nunca quedan expuestos ni se importa sin protección.
- **Biblioteca nueva:** el lector de Excel (SheetJS 0.18.5) se carga desde cdnjs solo al importar, dentro de la política de contenido (CSP) existente.

## Roles y descansos médicos (v3.5 · servidor 2.5, 28/10/2026)

- **Área médica con uso exclusivo de los descansos médicos.** Solo la doctora y la enfermera ocupacional (rol MÉDICO) pueden registrar, editar y validar descansos, adjuntar sustentos o retirarlos. SSOMA los consulta en modo lectura. El servidor rechaza cualquier otro intento; la única excepción es la importación única del histórico por parte del administrador.
- **SSOMA con el mismo nivel:** los cuatro integrantes de SSOMA tienen rol Administrador. El cambio se aplica una sola vez en la hoja «Usuarios» y queda en la trazabilidad (`usuarios_sincronizar`).
- **Puesto real en las firmas:** el puesto de cada persona se guarda en «Usuarios» y aparece en los formatos firmados y bajo su nombre.
- **El ingreso ya no recuerda a nadie:** la pantalla de ingreso no muestra ingresos anteriores y se borra lo que estaba guardado en cada equipo. Solo se escribe el número de documento.

## Eliminación definitiva de registros (v3.6 · servidor 2.6)

- Solo **SSOMA (ADMIN)** puede eliminar un evento, y debe escribir el código del evento y el motivo. El servidor vuelve a validar las tres condiciones.
- Se borran el evento, sus acciones, sus descansos vinculados y sus firmas. Los archivos van a la **papelera de Drive**, donde se pueden recuperar durante 30 días.
- Queda constancia en la trazabilidad (`eliminar`) de quién eliminó, cuándo, por qué y cuántos registros se borraron. La bitácora no se borra.
- Es para registros de prueba o creados por error. Un evento real que no procede se **anula**: queda en el registro y no cuenta en los indicadores (la Ley 29783 exige conservar los registros).

## Riesgos aceptados y mitigación

1. **El web app tiene acceso "Cualquier usuario".** Es necesario para que la app de GitHub se conecte. La dirección responde a cualquiera, pero **no entrega datos sin iniciar sesión**; se probó que devuelve `sesion_invalida` y `credenciales`.
2. **Ingreso solo con DNI/CE** (decisión de SSOMA). Mitigación: bloqueos, freno global, auditoría y control de la lista de usuarios.
3. **La cuenta ssomaoni@gmail.com es la dueña de todos los datos.** Quien controle esa cuenta controla el sistema.
   *Recomendación:* activar la **verificación en 2 pasos** en esa cuenta.

## Qué NO se publica en GitHub

`apps-script/` (el código del backend con la lista de DNI del personal) queda excluido mediante `.gitignore` y **solo existe en Apps Script y en esta carpeta local**.
