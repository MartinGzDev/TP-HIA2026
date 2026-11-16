# Proyecto Final HIA 2026 – Grupo 14

Aplicación web desarrollada como Trabajo Práctico Final de la materia Herramientas Informáticas Avanzadas.

El sistema cuenta con un frontend desarrollado en Angular 20 y un backend desarrollado con Node.js, Express y MongoDB.

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
| Base de datos | MongoDB, Mongoose |
| Autenticación | JWT, bcryptjs |
| Herramientas | Git, npm |

## 📁 Estructura del proyecto

```text
TP-HIA2026/
│
├── backend/
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
└── README.md
```

## 🚀 Inicio rápido

### Requisitos

- Git.
- Node.js.
- npm.
- MongoDB instalado y ejecutándose localmente.

### 1. Clonar el repositorio

```bash
git clone https://github.com/MartinGzDev/TP-HIA2026.git

cd TP-HIA2026
```

### 2. Configurar y ejecutar el backend

```bash
cd backend
npm install
```

Crear el archivo de configuración:

```bash
cp config.example.js config.js
```

En Windows también se puede utilizar:

```cmd
copy config.example.js config.js
```

Editar `config.js` con la configuración local de MongoDB y la clave JWT.

Inicializar los roles:

```bash
node seeds/seed.js
```

Iniciar el servidor:

```bash
npm run dev
```

Backend disponible en:

http://localhost:3000

### 3. Configurar y ejecutar el frontend

Abrir una segunda terminal desde la raíz del proyecto:

```bash
cd frontend
npm install
npm start
```

Frontend disponible en:

http://localhost:4200

El frontend utiliza `proxy.conf.json` para redirigir las solicitudes `/api` al backend local.

## 📚 Documentación específica

Para obtener instrucciones detalladas de instalación y configuración:

- [Documentación del Backend](backend/README.md)
- [Documentación del Frontend](frontend/README.md)

## 🔌 Puertos utilizados

| Servicio | Puerto |
|---|---:|
| Frontend Angular | 4200 |
| Backend Express | 3000 |
| MongoDB | 27017 |

## 🔐 Seguridad

Los archivos de configuración personales no deben subirse al repositorio.

- `backend/config.js` está excluido mediante `.gitignore`.
- Cada integrante debe crear su propio archivo a partir de `config.example.js`.
- No compartir claves JWT, contraseñas ni credenciales privadas.

## 👨‍💻 Desarrollo

Para trabajar con el proyecto deben permanecer activos:

- El servicio de MongoDB.
- El servidor backend.
- El servidor frontend.

Cada integrante puede configurar su entorno local sin modificar las credenciales ni configuraciones personales de los demás.