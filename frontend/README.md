# Frontend – TP HIA 2026

Frontend del proyecto desarrollado con Angular 20 y TypeScript.

## 📋 Requisitos previos

- Node.js compatible con Angular 20.
- npm.
- Backend ejecutándose en `http://localhost:3000`.

No es necesario instalar Angular CLI globalmente. El proyecto incluye Angular CLI como dependencia local.

## 🚀 Instalación

### 1. Instalar dependencias

Desde la carpeta `frontend`:

```bash
npm install
```

### 2. Configuración del proxy

El proyecto incluye el archivo:

```text
proxy.conf.json
```

Su configuración permite redirigir las solicitudes de la API al backend:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Además, `angular.json` tiene configurado este proxy para el servidor de desarrollo.

No es necesario modificar la URL de la API para ejecutar el proyecto localmente.

## ▶️ Ejecutar el proyecto

Iniciar el servidor de desarrollo:

```bash
npm start
```

También se puede utilizar:

```bash
npx ng serve
```

Abrir el navegador en:

http://localhost:4200

La aplicación se recargará automáticamente al realizar cambios en el código.

**Importante:** el backend debe estar ejecutándose y MongoDB debe estar disponible para que funcionen las funcionalidades que consumen la API.

## 🏗️ Compilar para producción

Ejecutar:

```bash
npm run build
```

Los archivos compilados se generan dentro de la carpeta `dist/`.

## 🧪 Pruebas

Para ejecutar las pruebas unitarias:

```bash
npm test
```

También se puede ejecutar:

```bash
npx ng test
```

## 🧰 Comandos útiles

| Comando | Descripción |
|---|---|
| `npm install` | Instala dependencias |
| `npm start` | Inicia Angular |
| `npm run build` | Compila el proyecto |
| `npm test` | Ejecuta pruebas |
| `npx ng generate component nombre` | Genera un componente |

## 📁 Estructura

```text
frontend/
├── src/
│   └── app/
├── public/
├── proxy.conf.json
├── angular.json
├── package.json
└── README.md
```

## 🐛 Problemas frecuentes

**Error al conectar con la API**

Verificar que:

- El backend esté ejecutándose en el puerto 3000.
- El archivo `proxy.conf.json` exista.
- `angular.json` tenga configurado el proxy.

**Error al iniciar Angular**

Ejecutar:

```bash
npm install
npm start
```

**Puerto 4200 ocupado**

Se puede iniciar Angular en otro puerto:

```bash
npx ng serve --port 4201
```

## 📚 Recursos

- [Documentación oficial de Angular](https://angular.dev/)
- [Angular CLI](https://angular.dev/tools/cli)