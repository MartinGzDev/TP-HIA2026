# Proyecto Final HIA 2026 – Grupo 14

Aplicación web desarrollada como Trabajo Práctico Final de la materia Herramientas Informáticas Avanzadas.

El sistema cuenta con un frontend desarrollado en Angular 20 y un backend desarrollado con Node.js, Express y PostgreSQL, utilizando Sequelize como ORM.

## 👥 Integrantes

- QUIROGA, Cesar Silvio
- PATAGUA, Romina Mariel
- GUTIERREZ, Martin Manuel
- GREGORIO, Gaston Yamil

## 📦 Repositorio

[GitHub – TP-HIA2026](https://github.com/MartinGzDev/TP-HIA2026)

## 🛠️ Tecnologías

| Área | Tecnologías |
|---|---|
| Frontend | Angular 20, TypeScript, Angular Material |
| Backend | Node.js, Express |
| Base de datos | PostgreSQL 16 |
| ORM | Sequelize |
| Autenticación | JWT, bcryptjs |
| Contenedores | Docker, Docker Compose |
| Herramientas | Git, npm |

## 📁 Estructura del proyecto

```text
TP-HIA2026/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seeds/
│   ├── config.example.js
│   ├── database.js
│   ├── index.js
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── proxy.conf.json
│   ├── angular.json
│   ├── package.json
│   └── README.md
│
├── docker-compose.yml
└── README.md
```

## 🚀 Inicio rápido

### Requisitos

- Git.
- Node.js.
- npm.
- Docker Desktop.
- Docker Compose.

### 1. Clonar el repositorio

```bash
git clone https://github.com/MartinGzDev/TP-HIA2026.git

cd TP-HIA2026
```

### 2. Iniciar PostgreSQL con Docker

Desde la raíz del proyecto ejecutar:

```bash
docker compose up -d postgres
```

Esto inicia el contenedor de PostgreSQL 16 con persistencia de datos mediante un volumen Docker.

Configuración de la base de datos:

| Parámetro | Valor |
|---|---|
| Motor | PostgreSQL |
| Versión | 16 |
| Base de datos | hia_grupo14 |
| Usuario | postgres |
| Puerto | 5432 |
| Contenedor | tpfinalgrupo14-postgres |

### 3. Configurar y ejecutar el backend

Desde la raíz del proyecto:

```bash
cd backend
npm install
```

Crear el archivo de configuración local:

```bash
cp config.example.js config.js
```

En Windows también se puede utilizar:

```cmd
copy config.example.js config.js
```

Editar `config.js` con las credenciales locales de PostgreSQL, la clave JWT y la configuración de Google OAuth si corresponde.

Ejecutar la carga inicial de datos:

```bash
npm run seed
```

Iniciar el servidor:

```bash
npm run dev
```

Backend disponible en:

http://localhost:3000

Health check:

http://localhost:3000/api/health

### 4. Configurar y ejecutar el frontend

Abrir una segunda terminal desde la raíz del proyecto:

```bash
cd frontend
npm install
npm start
```

Frontend disponible en:

http://localhost:4200

El frontend utiliza `proxy.conf.json` para redirigir las solicitudes `/api` al backend local.

## 🗄️ Base de datos

La aplicación utiliza PostgreSQL como sistema de gestión de bases de datos relacional.

La conexión se realiza mediante Sequelize, encargado de gestionar los modelos, relaciones y operaciones sobre la base de datos.

Los datos se mantienen persistentes mediante un volumen Docker, por lo que no se pierden al detener o reiniciar el contenedor.

Para detener PostgreSQL:

```bash
docker compose stop postgres
```

Para volver a iniciarlo:

```bash
docker compose start postgres
```

## 📚 Documentación específica

Para obtener instrucciones detalladas de instalación y configuración:

- Documentación del Backend: `backend/README.md`
- Documentación del Frontend: `frontend/README.md`

## 🔌 Puertos utilizados

| Servicio | Puerto |
|---|---:|
| Frontend Angular | 4200 |
| Backend Express | 3000 |
| PostgreSQL | 5432 |

## 🔐 Seguridad

Los archivos de configuración personales no deben subirse al repositorio.

- `backend/config.js` está excluido mediante `.gitignore`.
- Cada integrante debe crear su propio archivo a partir de `config.example.js`.
- No compartir claves JWT, contraseñas ni credenciales privadas.
- PostgreSQL se ejecuta mediante Docker y no debe exponerse públicamente.

## 👨‍💻 Desarrollo

Para trabajar con el proyecto deben permanecer activos:

- El contenedor de PostgreSQL.
- El servidor backend.
- El servidor frontend.

Cada integrante puede configurar su entorno local sin modificar las credenciales ni configuraciones personales de los demás.

## 🌿 Ramas del proyecto

- `main`: versión actual con PostgreSQL y Sequelize.
- `mongo`: versión anterior que utiliza MongoDB y Mongoose.
