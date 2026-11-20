# TP Final – Herramientas Informáticas Avanzadas 2026
## Grupo 14

Aplicación web desarrollada con Angular, Node.js, Express, Sequelize y PostgreSQL. La infraestructura de base de datos utiliza PostgreSQL 16, Patroni, ETCD y HAProxy para proporcionar alta disponibilidad, replicación y distribución de conexiones de lectura y escritura.

---

# 1. Arquitectura del proyecto

La infraestructura está compuesta por los siguientes servicios:

| Componente | Función |
|---|---|
| Frontend Angular SSR | Interfaz web de la aplicación |
| Backend Node.js / Express | API REST |
| PostgreSQL 16 | Motor de base de datos |
| Patroni 1, 2 y 3 | Administración del clúster y failover |
| ETCD 1, 2 y 3 | Almacenamiento distribuido del estado del clúster |
| HAProxy | Balanceo de conexiones de lectura y escritura |
| pgAdmin | Administración de PostgreSQL |
| Prometheus | Recolección de métricas |
| Grafana | Visualización de métricas |
| Backup | Copias de seguridad de PostgreSQL |

Los tres nodos PostgreSQL comparten una red Docker y utilizan volúmenes persistentes.

## 2. Requisitos previos

Instalar las siguientes herramientas:

- Git.
- Docker Desktop.
- Docker Compose V2.
- Node.js 20 o superior y npm (necesarios para ejecutar frontend y backend fuera de Docker).

Verificar las instalaciones:

```bash
git --version
docker --version
docker compose version
```

Asegurarse de que Docker Desktop esté iniciado.

## 3. Clonar el repositorio

```bash
git clone https://github.com/MartinGzDev/TP-HIA2026.git
```

Ingresar al proyecto:

```bash
cd TP-HIA2026
```

La carpeta raíz debe contener el archivo `docker-compose.yml`.

## 4. Configurar las variables de entorno

Crear el archivo `.env` en la raíz del proyecto. Este archivo contiene las credenciales y configuraciones utilizadas por Docker Compose.

Ejemplo de estructura:

```dotenv
# PostgreSQL
POSTGRES_DB=hia_grupo14
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CAMBIAR_POR_UNA_CLAVE_SEGURA

# Replicación PostgreSQL
REPLICATION_USER=replicator
REPLICATION_PASSWORD=CAMBIAR_POR_UNA_CLAVE_SEGURA

# Monitoreo PostgreSQL
MONITOR_PASSWORD=CAMBIAR_POR_UNA_CLAVE_SEGURA

# HAProxy
HAPROXY_WRITE_PORT=5435
HAPROXY_READ_PORT=5436

# pgAdmin
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=CAMBIAR_POR_UNA_CLAVE_SEGURA
PGADMIN_PORT=5050

# Prometheus
PROMETHEUS_PORT=9090

# Grafana
GRAFANA_PORT=3001
GRAFANA_PASSWORD=CAMBIAR_POR_UNA_CLAVE_SEGURA

# Backend
GOOGLE_CLIENT_ID=
JWT_SECRET=GENERAR_UN_SECRETO_ALEATORIO
```

Los valores de puertos deben coincidir con la configuración de `docker-compose.yml`. Las variables adicionales que utilicen las integraciones externas de la aplicación deberán configurarse según corresponda.

**Importante:**
- Utilizar credenciales seguras en cada entorno.
- No subir `.env` al repositorio.
- No compartir contraseñas ni secretos.
- El archivo `.env` debe estar disponible antes de iniciar los servicios.

## 5. Validar la configuración de Docker Compose

Desde la raíz del proyecto:

```bash
docker compose config -q
```

Si no devuelve errores, la configuración es válida.

## 6. Construir y levantar la infraestructura

Ejecutar:

```bash
docker compose up -d --build
```

Este comando construye las imágenes que tienen configuración de build y levanta los servicios definidos en Docker Compose.

La infraestructura incluye:

- Tres nodos ETCD.
- Tres nodos PostgreSQL administrados por Patroni.
- HAProxy.
- pgAdmin.
- Prometheus.
- Grafana.
- Servicio de backups.
- Backend.
- Frontend.

Esperar a que los servicios terminen de inicializarse.

## 7. Verificar los contenedores

Consultar el estado general:

```bash
docker compose ps
```

Consultar específicamente los nodos PostgreSQL:

```bash
docker compose ps patroni1 patroni2 patroni3
```

Los servicios deben encontrarse en ejecución y los nodos deben completar sus comprobaciones de salud.

## 8. Verificar el clúster Patroni

Ejecutar:

```bash
docker exec -it tpfinalgrupo14-patroni1 patronictl -c /etc/patroni/patroni.yml.template list
```

El resultado debe mostrar:

- Un nodo con rol `Leader`.
- Dos nodos con rol `Replica`.
- Estado `running` para el líder.
- Estado `streaming` para las réplicas.
- Retraso de replicación (Lag) controlado.

El líder puede cambiar automáticamente ante una falla.

## 9. Inicializar los datos de prueba

La carga inicial de datos se ejecuta manualmente mediante el servicio `seed`.

```bash
docker compose --profile seed run --rm seed
```

El proceso inicializa:

- 5 roles.
- 4 usuarios integrantes.
- 5 categorías.
- 14 productos.
- 2 combos.
- 2 ofertas.
- 2 clientes de prueba.
- 1 repartidor de prueba.
- 1 pedido de prueba.
- 1 calificación de prueba.

Usuarios integrantes:

- `cquiroga`
- `rpatagua`
- `mgutierrez`
- `ggregorio`

Contraseña inicial de los usuarios creados por el seed: `hia2026`.

**Importante:** ejecutar el seed solamente cuando sea necesario inicializar los datos. No forma parte del arranque habitual de la aplicación y puede actualizar o reemplazar determinados registros de demostración.

## 10. Acceder a la aplicación

Una vez que los contenedores estén levantados:

| Servicio | Dirección |
|---|---|
| Frontend | http://localhost:4200 |
| API (a través del frontend) | http://localhost:4200/api |
| Health check | http://localhost:4200/api/health |
| Métricas del backend | http://localhost:4200/api/metrics |
| pgAdmin | http://localhost:5050 |
| HAProxy Stats | http://localhost:8404 |

Los puertos de pgAdmin y otros servicios pueden variar según las variables definidas en `.env` y `docker-compose.yml`.

### Conexión de pgAdmin con PostgreSQL

Para registrar un servidor en pgAdmin:

- **Host:** `haproxy`
- **Port:** `5435`
- **Maintenance database:** `hia_grupo14`
- **Username:** `postgres`
- **Password:** valor configurado en `POSTGRES_PASSWORD`.

La conexión se realiza desde la red Docker, utilizando el nombre del servicio HAProxy.

## 11. Verificar la comunicación entre frontend y backend

Ejecutar:

```bash
curl -i http://localhost:4200/api/health
```

La respuesta esperada es:

```json
{
  "status": "OK",
  "environment": "production"
}
```

El código HTTP esperado es `200 OK`.

Esta prueba verifica la comunicación entre el frontend, el proxy y el backend.

## 12. Consultar los datos de PostgreSQL en cada nodo

### Ver el estado de los tres nodos

```bash
docker exec -it tpfinalgrupo14-patroni1 patronictl -c /etc/patroni/patroni.yml.template list
```

### Consultar usuarios

Nodo 1:

```bash
docker exec -it tpfinalgrupo14-patroni1 psql -U postgres -d hia_grupo14 -c 'SELECT * FROM usuarios ORDER BY id;'
```

Nodo 2:

```bash
docker exec -it tpfinalgrupo14-patroni2 psql -U postgres -d hia_grupo14 -c 'SELECT * FROM usuarios ORDER BY id;'
```

Nodo 3:

```bash
docker exec -it tpfinalgrupo14-patroni3 psql -U postgres -d hia_grupo14 -c 'SELECT * FROM usuarios ORDER BY id;'
```

### Consultar productos

Nodo 1:

```bash
docker exec -it tpfinalgrupo14-patroni1 psql -U postgres -d hia_grupo14 -c 'SELECT * FROM productos ORDER BY id;'
```

Nodo 2:

```bash
docker exec -it tpfinalgrupo14-patroni2 psql -U postgres -d hia_grupo14 -c 'SELECT * FROM productos ORDER BY id;'
```

Nodo 3:

```bash
docker exec -it tpfinalgrupo14-patroni3 psql -U postgres -d hia_grupo14 -c 'SELECT * FROM productos ORDER BY id;'
```

Las consultas permiten verificar que los registros se encuentren replicados en los tres nodos.

## 13. Probar alta disponibilidad y failover

El clúster Patroni permite promover automáticamente una réplica cuando el líder deja de estar disponible.

### 13.1 Identificar el líder actual

```bash
docker exec -it tpfinalgrupo14-patroni1 patronictl -c /etc/patroni/patroni.yml.template list
```

Identificar qué nodo tiene el rol `Leader`.

### 13.2 Detener el nodo líder

Ejemplo, si el líder es `patroni3`:

```bash
docker stop tpfinalgrupo14-patroni3
```

### 13.3 Comprobar la elección de un nuevo líder

Esperar unos segundos y consultar:

```bash
docker exec -it tpfinalgrupo14-patroni1 patronictl -c /etc/patroni/patroni.yml.template list
```

Una de las réplicas disponibles deberá asumir el rol de `Leader`.

### 13.4 Verificar la aplicación

Comprobar que la API continúe respondiendo:

```bash
curl -i http://localhost:4200/api/health
```

También se pueden realizar operaciones desde la aplicación web para comprobar que las escrituras continúan funcionando.

### 13.5 Recuperar el nodo detenido

```bash
docker start tpfinalgrupo14-patroni3
```

Esperar a que Patroni lo incorpore nuevamente al clúster.

### 13.6 Verificar la recuperación y replicación

```bash
docker exec -it tpfinalgrupo14-patroni1 patronictl -c /etc/patroni/patroni.yml.template list
```

Consultar los registros creados durante el failover directamente en los tres nodos para comprobar que la información se haya replicado.

**Importante:** detener un contenedor con `docker stop` no elimina sus volúmenes ni sus datos.

## 14. Comandos habituales de administración

### Consultar todos los servicios

```bash
docker compose ps
```

### Consultar los logs del backend

```bash
docker logs tpfinalgrupo14-backend --tail 100
```

### Consultar los logs del frontend

```bash
docker logs tpfinalgrupo14-frontend --tail 100
```

### Consultar los logs de un nodo Patroni

```bash
docker logs tpfinalgrupo14-patroni1 --tail 100
```

### Reconstruir frontend y backend

```bash
docker compose build backend frontend
```

### Reiniciar frontend y backend

```bash
docker compose up -d --no-deps --force-recreate backend frontend
```

### Detener los servicios

```bash
docker compose down
```

Este comando detiene y elimina los contenedores y la red del proyecto, pero conserva los volúmenes persistentes.

**No utilizar `docker compose down -v`**, salvo que se desee eliminar explícitamente los volúmenes y todos los datos persistidos.

## 15. Ejecución local del backend (opcional)

Para ejecutar el backend fuera de Docker durante el desarrollo, ingresar a `backend`:

```bash
npm install
```

Configurar las variables locales necesarias para conectarse a PostgreSQL mediante HAProxy:

```dotenv
DB_HOST=localhost
DB_PORT=5435
DB_NAME=hia_grupo14
DB_USER=postgres
DB_PASSWORD=CLAVE_CONFIGURADA
PORT=3000
NODE_ENV=development
```

Iniciar en modo desarrollo:

```bash
npm run dev
```

La API queda disponible en:

http://localhost:3000

La conexión local requiere que el clúster PostgreSQL y HAProxy estén levantados.

## 16. Estructura del backend

```text
backend/
├── config/             # Conexión Sequelize
├── controllers/        # Controladores de la API
├── middleware/         # Autenticación y autorización
├── models/             # Modelos y asociaciones
├── routes/             # Rutas Express
├── seeds/              # Datos iniciales PostgreSQL
├── config.example.js   # Plantilla de configuración
├── database.js         # Exporta la instancia Sequelize
└── index.js            # Punto de entrada
```

Los archivos `.env`, `config.js` y las carpetas `node_modules` son locales y no deben subirse al repositorio.

---

## 17. Persistencia y consideraciones importantes

- PostgreSQL utiliza volúmenes Docker para conservar los datos.
- Patroni administra el estado del clúster y la promoción de réplicas.
- ETCD mantiene la información distribuida utilizada por Patroni.
- HAProxy distribuye las conexiones de lectura y escritura.
- Las imágenes de productos se almacenan en Cloudinary; PostgreSQL conserva sus URL.
- El seed es un procedimiento manual y separado del arranque habitual.
- No se deben eliminar los volúmenes durante una actualización normal.

## 18. Evidencias de funcionamiento

Para demostrar el funcionamiento de la infraestructura se pueden registrar las siguientes pruebas:

1. Contenedores levantados correctamente.
2. Clúster Patroni con un líder y dos réplicas.
3. Comunicación entre frontend y backend mediante `/api/health`.
4. Alta de registros desde la interfaz web.
5. Replicación de los registros en los tres nodos.
6. Caída controlada del líder.
7. Promoción automática de una réplica.
8. Escrituras exitosas durante el failover.
9. Recuperación del nodo detenido.
10. Verificación de los datos replicados después de la recuperación.

Estas pruebas permiten demostrar la comunicación entre los componentes, la persistencia de datos y la tolerancia a fallos de la infraestructura.


## 19. INSTALACION DE MANTISBT

1) Agregar al .env (ver .env.example): MANTIS_DB_ROOT_PASSWORD, MANTIS_DB_PASSWORD y MANTIS_ENABLE_ADMIN=1.
2) Crear las carpetas y levantar los servicios (desde la raíz del repositorio):

```bash
mkdir -p mantis/config mantis/custom
docker compose up -d mantis-db mantis-mail mantis
```
3) Abrir http://localhost:8989 y completar el instalador con los siguientes datos:
  Type of Database: MySQL / MariaDB
  Hostname: mantis-db
  Username (para conexión normal): mantisbt
  Password (para conexión normal): el valor que pusiste en MANTIS_DB_PASSWORD
  Database name: bugtracker
  Admin Username (para crear las tablas): root
  Admin Password: el valor que pusiste en MANTIS_DB_ROOT_PASSWORD
  Zona horaria: America/Argentina/Buenos_Aires
  URL: http://localhost:8989/
4) Iniciar sesión con administrator / root y cambiar la contraseña de inmediato.
5) Agregar al final de mantis/config/config_inc.php (generado por el instalador) las líneas de correo de mantis/config/config_inc.php.example.
6) Cerrar el instalador: poner MANTIS_ENABLE_ADMIN=0 en el .env y ejecutar docker compose up -d mantis.
