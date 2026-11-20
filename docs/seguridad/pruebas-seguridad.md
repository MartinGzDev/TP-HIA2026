# Registro de pruebas de seguridad

## Pruebas realizadas durante esta revisión

| Prueba | Comando/inspección reproducible | Resultado | Evidencia y alcance |
|---|---|---|---|
| Rama y estado inicial | `git status --short --branch` | Rama `feat/punto-14-seguridad`, sincronizada con `origin/feat/punto-14-seguridad`, sin cambios reportados al inicio. | Salida del comando en esta sesión; no se imprimió contenido sensible.
| Auditoría de producción backend | `cd backend && npm audit --omit=dev --json` | **0 hallazgos**; 141 paquetes de producción. | Consulta npm ejecutada con acceso de red aprobado el 20-11-2026. No cubre dependencias dev ni código propio.
| Auditoría de producción frontend | `cd frontend && npm audit --omit=dev --json` | **0 hallazgos**; 98 paquetes de producción. | Mismo alcance/fecha.
| Auditoría total de backend/frontend | `cd backend && npm audit --json`; `cd frontend && npm audit --json` | **No comprobada**; petición al registro falló con `ENOTFOUND registry.npmjs.org` desde el entorno aislado. | No inferir ausencia de vulnerabilidades de desarrollo.
| Revisión estática de autenticación/autorización | Lectura de `backend/index.js`, `middleware/auth.js`, rutas y controladores de auth, usuarios, ventas, pedidos y generación de imagen. | Hallazgos detallados en `informe-vulnerabilidades.md` y `matriz-amenazas.md`; no fue prueba de explotación. | No se enviaron solicitudes HTTP.
| Revisión de Compose/CI/Dockerfiles/monitorización | Lectura de `docker-compose.yml`, `Cluster-db/**`, `backend/Dockerfile`, `frontend/Dockerfile`, `.github/workflows/ci.yml`. | Configuración descrita en los informes; no se consultó daemon Docker ni servicios. | Revisión de archivos versionados.
| Búsqueda de integraciones y secretos versionados | `git ls-files` limitado a nombres de `.env`/llaves/respaldos; búsqueda textual excluyendo locks/dependencias. | No se inspeccionaron contenidos de `.env`; no se encontró servicio n8n ni configuración versionada de Cloudflare Tunnel. | Ausencia en repo no demuestra ausencia en entorno externo.

## Pruebas reproducibles pendientes

Ejecutar únicamente en una instancia aislada y autorizada; evitar datos reales y no usar el servicio publicado para pruebas agresivas.

| Prueba pendiente | Comandos/procedimiento sugerido | Criterio de aceptación | Intervención necesaria |
|---|---|---|---|
| Auditoría completa del árbol npm | `cd backend && npm audit`; repetir en `frontend/` en entorno con registro npm disponible. | Cero hallazgos o tickets con mitigación y responsables. | Red/registro disponible y revisión del equipo por posibles breaking fixes.
| Build y pruebas automatizadas | `cd backend && npm ci && node --check index.js`; `cd frontend && npm ci && npm run build -- --configuration production`; frontend `npm test -- --watch=false` según runner local. | Build reproducible; suite estable. No existe script `test` backend declarado. | Entorno Node/browser adecuado. No se ejecutaron en esta sesión.
| Escalada de rol por registro | En DB/stack de prueba, enviar solicitud a `/api/auth/register` con `rolName` privilegiado y credenciales ficticias; probar token en ruta admin. | Registro público rechaza roles privilegiados y el token no habilita operaciones de admin. | Requiere corrección de código y usuario/stack efímero.
| Autorización/IDOR en ventas, cliente, repartidor y pedido | Con dos usuarios de prueba de roles distintos, solicitar lectura/modificación/creación de objetos ajenos y funciones de pago. | 401/403, sin cambio de datos; solo rol y propietario legítimos acceden. | Casos de prueba acordados y datos sintéticos.
| SQL injection/validación | Probar cadenas de control y tipos/rangos extremos en filtros, `sortBy`, IDs, arrays y cuerpos JSON en entorno local aislado. | Rechazo controlado, sin error SQL ni cambio no autorizado. | Revisión manual de consultas y schemas.
| Rate limit/abuso IA | Simular concurrencia moderada y prompt excesivo contra stub/mock o entorno de prueba con cuota baja. | Respuestas limitadas; costo máximo y logs sin prompt/token sensible. | Acceso a configuración de proveedor/observabilidad.
| Docker hardening e imágenes | En host de prueba: `docker compose config` (sin imprimir valores), `docker inspect` limitado a opciones de seguridad y escáner de imágenes/SBOM. | Servicios no root donde aplique, sin capacidades/puertos innecesarios, imágenes sin CVE crítico pendiente. | Acceso al host Docker; revisión de salida por posibles variables sensibles.
| Backup/restauración | Seguir procedimiento documentado del equipo restaurando en base aislada y validar conteos/integridad. | Restauración exitosa con RPO/RTO registrados; copia fuera del host verificada. | Operador con acceso al backup y DB aislada. El antecedente de restauración fue informado, no reproducido aquí.
| Detección y alertas | Simular target down/uso de recursos en entorno de laboratorio; verificar recepción por el canal de alertas. | Alerta recibida, responsable y escalamiento documentados. | Acceso a Prometheus/Grafana/canal de notificación.
| TLS, WAF y exposición pública | Inspección de Cloudflare/origen y escaneo pasivo autorizado del dominio propio. | TLS válido extremo a extremo, reglas y puertos revisados, ningún panel administrativo accesible públicamente. | Administrador del dominio/Cloudflare y autorización expresa de escaneo.

No se afirma que ninguna prueba pendiente se haya ejecutado. La validación/restauración previa de backup, builds anteriores y funcionamiento de Prometheus/Grafana constan como antecedentes comunicados por el equipo, sin salida adjunta en el repositorio revisado.
