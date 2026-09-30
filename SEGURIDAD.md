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

## Riesgos aceptados y mitigación

1. **El web app tiene acceso "Cualquier usuario".** Es necesario para que la app de GitHub se conecte. La dirección responde a cualquiera, pero **no entrega datos sin iniciar sesión**; se probó que devuelve `sesion_invalida` y `credenciales`.
2. **Ingreso solo con DNI/CE** (decisión de SSOMA). Mitigación: bloqueos, freno global, auditoría y control de la lista de usuarios.
3. **La cuenta ssomaoni@gmail.com es la dueña de todos los datos.** Quien controle esa cuenta controla el sistema.
   *Recomendación:* activar la **verificación en 2 pasos** en esa cuenta.

## Qué NO se publica en GitHub

`apps-script/` (el código del backend con la lista de DNI del personal) queda excluido mediante `.gitignore` y **solo existe en Apps Script y en esta carpeta local**.
