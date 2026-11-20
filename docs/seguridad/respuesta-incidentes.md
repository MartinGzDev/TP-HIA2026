# Procedimiento de respuesta a incidentes

## Objetivo y alcance

Guía operativa para incidentes que afecten la aplicación Angular/Node.js, PostgreSQL/Patroni/ETCD, Docker, CI/CD, integraciones externas o datos del Grupo 14. Debe ejecutarse por personas autorizadas. Preservar evidencia y continuidad; no improvisar acciones que destruyan datos.

## Roles mínimos

| Rol | Responsabilidad |
|---|---|
| Coordinador del incidente | Declara severidad, asigna tareas, mantiene cronología y decide escalamiento.
| Responsable técnico | Inspecciona aplicación, infraestructura, identidades y evidencia; propone contención.
| Responsable de datos | Evalúa impacto en PostgreSQL/backups y valida recuperación.
| Responsable de comunicación | Informa a equipo/docencia/usuarios según el plan y las obligaciones aplicables.

En un equipo pequeño una persona puede cubrir varios roles, pero registrar cada decisión y hora.

## Flujo operativo

### 1. Detección y registro inicial

1. Recibir alerta, reporte o hallazgo; anotar hora local y UTC, fuente, servicio, síntoma y persona que reporta.
2. Abrir un registro con identificador, severidad provisional y responsable. No copiar claves, tokens ni datos personales a chats/tickets abiertos.
3. Conservar salidas de logs y métricas en ubicación restringida, con hashes y marcas de tiempo cuando sea posible. Evitar capturar valores de entorno.
4. Consultar métricas/alertas, estado de contenedores y logs de forma de solo lectura. No ejecutar `down`, reinicios, borrados ni cambios de infraestructura sin la aprobación operativa correspondiente.

### 2. Clasificación

| Severidad | Criterio y ejemplo | Objetivo inicial |
|---|---|---|
| P1 Crítica | Escalada a admin, ransomware/cifrado, exfiltración confirmada, DB comprometida o servicio esencial caído con impacto amplio. | Avisar de inmediato al coordinador y equipo; limitar acceso con el cambio mínimo autorizado; preservar evidencia.
| P2 Alta | Acceso no autorizado acotado, credencial posiblemente expuesta, abuso de API con impacto o fallo importante de seguridad sin evidencia de explotación amplia. | Escalar en el mismo período de trabajo; decidir contención y revisar alcance.
| P3 Media | Hallazgo sin explotación aparente, anomalía limitada, dependencia vulnerable mitigable sin incidente activo. | Registrar, asignar responsable/plazo y monitorear.
| P4 Baja | Falso positivo o debilidad menor sin impacto inmediato. | Documentar y revisar en mantenimiento.

La severidad se revisa a medida que aparece evidencia. Si involucra datos personales, pagos, claves o un proveedor, tratar como mínimo P2 mientras se determina el alcance.

### 3. Contención

1. Elegir medida reversible y de menor alcance: bloquear cuenta/token comprometido, limitar endpoint, aislar un servicio/red o deshabilitar integración afectada, según autorización.
2. Si se sospecha exposición de secretos, rotarlos desde el administrador autorizado y revocar sesiones/tokens relacionados. No escribirlos en comandos, commits o informes.
3. Si se sospecha intrusión de host o ransomware, preservar disco/volúmenes y evidencia; no borrar contenedores ni volúmenes ni reconstruir sobre la única copia.
4. Registrar cada cambio, actor, motivo, hora, estado previo y procedimiento de reversión. Nunca publicar bases, backups o dumps.

### 4. Erradicación

1. Determinar vector y alcance: identidad, endpoint, versión, imagen, workflow, host, base, proveedor y período afectado.
2. Corregir código/configuración en rama revisada; parchear o reemplazar artefactos comprometidos; cerrar credenciales y permisos sobrantes.
3. Verificar cambios mediante análisis de código, dependencias y pruebas controladas antes del despliegue.
4. Rotar secretos que pudieron estar accesibles y revisar accesos, jobs, artefactos y logs asociados.

### 5. Recuperación

1. Recuperar desde una copia conocida, íntegra y previa al incidente; preferir entorno aislado para validar primero.
2. Confirmar consistencia de PostgreSQL/Patroni, integridad de registros, dependencias, roles, servicios y controles de red.
3. Desplegar desde artefactos revisados y lockfiles conocidos; no reutilizar imagen sospechosa.
4. Reabrir tráfico gradualmente y observar métricas, logs y alertas. Definir RPO/RTO con el responsable del servicio.

### 6. Validación y cierre técnico

- Confirmar que la causa raíz está corregida y que la vulnerabilidad no se reproduce en laboratorio.
- Revisar que cuentas, permisos, claves, backups y monitorización vuelven al estado aprobado.
- Vigilar indicadores relacionados durante un período acordado por el coordinador.
- Si la recuperación falla, volver al estado contenido y escalar; no sacrificar evidencia para acelerar la reapertura.

### 7. Comunicación

El responsable de comunicación prepara mensajes breves con hechos confirmados, alcance conocido/desconocido, acciones tomadas y próximo aviso. Coordina con dirección/docencia y, si corresponde, con responsables de privacidad, proveedores o autoridades según las obligaciones aplicables. No compartir hipótesis como hechos ni divulgar credenciales, datos personales, logs crudos o indicadores que faciliten nuevos ataques.

### 8. Registro y revisión posterior

Conservar cronología, severidad, decisiones, evidencia y hashes, sistemas/usuarios afectados, datos posiblemente expuestos, causa raíz, cambios y verificaciones. Al cierre, registrar lecciones aprendidas, acciones con responsable/fecha y actualizar matriz y plan. Mantener registros con acceso mínimo y retención acordada.

## Plantilla de registro

```text
ID / fecha-hora:
Reportante / coordinador:
Severidad inicial y actual:
Sistema y datos potencialmente afectados:
Síntomas y evidencia (ubicación restringida, sin secretos):
Cronología de decisiones/cambios:
Contención y resultado:
Vector / causa raíz (confirmada o hipótesis):
Recuperación y validación:
Comunicaciones realizadas:
Pendientes, responsable y vencimiento:
Criterio y fecha de cierre:
```

## Pendiente organizativo

El repositorio no identifica guardias, contactos, tiempos de respuesta, canal fuera de banda, obligaciones de notificación, objetivos RPO/RTO ni ubicación segura de evidencias. El equipo debe completar estos datos antes de considerar operativo el procedimiento.
