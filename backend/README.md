# Backend – TP HIA 2026

API del proyecto Grupo 14 desarrollada con Node.js, Express, Sequelize y PostgreSQL.

## Requisitos

- Node.js 20 o superior.
- npm.
- Docker y Docker Compose.

## Instalación

Desde la carpeta `backend`:

```bash
npm install
```

Crear la configuración local:

```bash
cp config.example.js config.js
```

En Windows CMD:

```cmd
copy config.example.js config.js
```

Completar `config.js` con los datos de PostgreSQL, Google OAuth y JWT. La configuración por defecto de Docker Compose del proyecto es:

```js
DB_HOST: 'localhost',
DB_PORT: 5432,
DB_NAME: 'hia_grupo14',
DB_USER: 'postgres',
DB_PASSWORD: 'hia2026'
```

## Iniciar PostgreSQL

Desde la raíz del repositorio (donde está `docker-compose.yml`):

```bash
docker compose up -d postgres
```

## Inicializar datos de prueba

Desde `backend`:

```bash
npm run seed
```

El seed crea los roles, usuarios del grupo, categorías, productos, un combo, una oferta y registros de demostración.

Usuarios del grupo: `cquiroga`, `rpatagua`, `mgutierrez`, `ggregorio`.

Contraseña inicial: `hia2026`.

## Ejecutar la API

Desarrollo:

```bash
npm run dev
```

Producción/local:

```bash
npm start
```

La API queda disponible en `http://localhost:3000`.

## Endpoints de diagnóstico

- `GET /api/health`
- `GET /api/metrics`

## Estructura

```text
backend/
├── config/             # Conexión Sequelize
├── controllers/        # Controladores de la API
├── middleware/         # Autenticación y autorización
├── models/             # Modelos, asociaciones y compatibilidad de consultas
├── routes/             # Rutas Express
├── seeds/              # Datos iniciales PostgreSQL
├── config.example.js   # Plantilla de configuración
├── database.js         # Exporta la instancia Sequelize
└── index.js            # Punto de entrada
```

`config.js`, `.env` y `node_modules` son locales y no deben subirse al repositorio.
