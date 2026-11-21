# Informe de vulnerabilidades y dependencias

## Alcance y método

Se inspeccionaron archivos versionados del backend Node/Express/Sequelize, frontend Angular, manifiestos Compose, Dockerfiles, configuración de monitoreo y GitHub Actions. No se accedió a archivos `.env`, a `config.js` local ni a credenciales. La revisión de código es estática: no equivale a pentest ni a análisis dinámico.

## Auditoría de dependencias

| Componente | Evidencia | Resultado reproducido | Interpretación |
|---|---|---|---|
| Backend, dependencias de producción | `backend/package-lock.json`; `npm audit --omit=dev --json` desde `backend/` | 0 info, 0 low, 0 moderate, 0 high, 0 critical; 141 dependencias `prod` | Sin avisos publicados por npm para el árbol de producción consultado el 20-11-2026. No acredita ausencia de fallas desconocidas ni de vulnerabilidades en código propio.
| Frontend, dependencias de producción | `frontend/package-lock.json`; `npm audit --omit=dev --json` desde `frontend/` | 0 en todas las severidades; 98 dependencias `prod` | Mismo alcance y limitación.
| Backend completo | `npm audit --json` | **No comprobado:** el registro npm no resolvió en el entorno (`getaddrinfo ENOTFOUND registry.npmjs.org`). | El resultado de producción no debe extrapolarse a dependencias de desarrollo.
| Frontend completo | `npm audit --json` | **No comprobado:** misma falla DNS. | Dev: 566; optional: 105, peer: 0 según el resultado de producción; el total mostrado por npm no es conteo de vulnerabilidades.

## Hallazgos de código

| Prioridad | Hallazgo y evidencia | Estado |
|---|---|---|
| Crítica | Registro público (`backend/routes/auth.routes.js`) acepta `rolName`; `backend/controllers/auth.controller.js` busca el rol indicado y emite JWT con ese rol. Puede permitir elevar privilegios al rol administrador si está presente. | **Verificado por inspección; explotabilidad en instancia desplegada no probada.** Corregir antes de tratar la app como segura.
| Alta | `backend/index.js` monta ventas con una lista general de roles; `backend/routes/venta.routes.js` tiene middlewares comentados; los controladores crean/listan/procesan pagos/facturas sin comprobar la propiedad del recurso. | **Verificado por inspección.** Riesgo de acceso y operación no autorizados.
| Alta | `backend/index.js` y `backend/controllers/auth.controller.js` incluyen fallback de secreto JWT débil/conocido; `backend/middleware/auth.js` requiere `config.js` directamente. | **Verificado en código.** No se comprobó si runtime contiene un `config.js` local o qué secreto se usa. No leer el valor efectivo en esta revisión.
| Alta | Endpoint de imagen `/api/generate-image` se monta sin `autenticar` en `backend/index.js`; `imageGeneration.controller.js` registra prompt recibido y longitud; no establece límite propio ni cuota. | **Verificado en código.** Servicio externo/costo no consultado.
| Alta | `cliente.routes.js` tiene handlers sin middleware propio, pero el montaje `/api/cliente` sí añade auth y roles; en cambio `repartidor.routes.js` depende del montaje global y sus controladores contemplan algunas comprobaciones opcionales. | **Parcialmente protegido; requiere matriz endpoint/propietario completa.**
| Media | `express.json()` sin límite explícito; no se encontró rate limiter; errores incluyen `error.message` en varias respuestas y detalles en logs. | **Verificado en los archivos examinados**, no es prueba de explotación.
| Media | `legacy-compat.js` usa `sequelize.literal` para expresión aritmética construida con `field`/`amount`; pedido usa `sortBy` como atributo de orden. | **Revisión estática;** no se confirmó acceso desde entrada externa al literal ni una inyección explotable. Aplicar allowlists y pruebas.
| Media | Construcción calcula total del pedido a partir de `detalleProductos` y `precioUnitario` del objeto recibido (modelo `pedido.js`). | **Verificado en modelo.** La ruta del controlador debe revisarse para confirmar autoridad del precio, descuento y stock; no se debe confiar en importes cliente.
| Media | La cadena CI no incluye paso explícito de auditoría; acciones externas fijadas a tags y no SHA; imágenes de aplicación usan `node:22-alpine` sin digest. | **Verificado en workflow/Dockerfiles.**
| Media | ETCD/Patroni/HAProxy stats expuestos en interfaces de red interna sin autenticación/TLS observable; Node Exporter monta raíz del host en solo lectura. | **Verificado en configuración.** La exposición real depende del host/red.

## Antecedentes y correcciones informadas

El equipo reporta previamente actualizaciones de dependencias, builds exitosos, Docker Socket Proxy con `CONTAINERS=1`/`POST=0`, Docker Exporter sin socket y como nonroot, tags fijados para algunos servicios, hardening del backup, validación/restauración de backup y monitoreo funcional. La configuración actual confirma algunos manifiestos (proxy, flags, tags y hardening); los resultados operativos (build, `nonroot`, restauración y servicios activos) **no tienen evidencia versionada o salida reproducible disponible en esta inspección**. Se conservan como «informado», no como prueba propia.

## Limitaciones

- `npm audit` consulta el registro remoto y refleja avisos conocidos publicados a la fecha; no analiza lógica ni imágenes. Solo pudo verificarse el árbol de producción.
- No se ejecutaron builds, pruebas unitarias, escáneres de contenedores, DAST, fuzzing, pruebas de carga ni llamadas a API.
- No se comprobó la configuración efectiva, el estado de los servicios, el dominio real, TLS, WAF, secretos ni servicios externos.
- La rama activa es `feat/punto-14-seguridad`; el workflow actual no la incluye en sus filtros declarados.
