# Backend – TP HIA 2026

Backend del proyecto desarrollado con Node.js, Express y MongoDB.

## 📋 Requisitos previos

- Node.js.
- npm.
- MongoDB instalado y ejecutándose localmente.

## 🚀 Instalación y configuración

### 1. Instalar dependencias

Desde la carpeta `backend`:

```bash
npm install
```

### 2. Crear el archivo de configuración

Copiar la plantilla:

```bash
cp config.example.js config.js
```

En Windows CMD:

```cmd
copy config.example.js config.js
```

Editar `config.js`:

```javascript
module.exports = {
  GOOGLE_CLIENT_ID: 'your-google-client-id-here',
  JWT_SECRET: 'coloca-una-clave-segura',
  MONGODB_URI: 'mongodb://localhost:27017/hia_grupo14',
  PORT: 3000,
  NODE_ENV: 'development'
};
```

### 3. Configuración de MongoDB

Verificar que MongoDB esté iniciado.

La configuración predeterminada utiliza:

```text
mongodb://localhost:27017/hia_grupo14
```

Si se utiliza otra instancia o una base de datos diferente, modificar `MONGODB_URI` en `config.js`.

### 4. Inicializar los roles

Antes de registrar usuarios, ejecutar el script de inicialización:

```bash
node seeds/seed.js
```

Este proceso carga los roles necesarios para el funcionamiento del sistema:

- admin
- cliente
- supervisor_cocina
- supervisor_ventas
- repartidor

### 5. Ejecutar el backend

Modo desarrollo:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

El servidor estará disponible en:

http://localhost:3000

## 📁 Estructura

```text
backend/
├── controllers/       # Controladores
├── middleware/        # Autenticación y autorización
├── models/            # Modelos de MongoDB
├── routes/             # Rutas de la API
├── seeds/              # Scripts de inicialización
├── config.example.js   # Plantilla de configuración
├── config.js           # Configuración local (no versionada)
├── database.js         # Conexión a MongoDB
├── index.js            # Punto de entrada
├── package.json
└── README.md
```

## 🔑 Configuración importante

| Parámetro | Descripción |
|---|---|
| GOOGLE_CLIENT_ID | Identificador de Google OAuth |
| JWT_SECRET | Clave para firmar y verificar tokens |
| MONGODB_URI | Dirección de conexión a MongoDB |
| PORT | Puerto del servidor |
| NODE_ENV | Entorno de ejecución |

El middleware de autenticación y el controlador de autenticación utilizan el mismo `JWT_SECRET`.

## 📝 Consideraciones

- `config.js` no se sube a Git.
- Cada integrante debe generar su propio archivo desde `config.example.js`.
- MongoDB debe estar activo antes de iniciar el backend.
- Los roles deben inicializarse antes de registrar usuarios.
- Para utilizar autenticación con Google se debe configurar un Client ID válido.

## 🐛 Problemas frecuentes

**Error de conexión con MongoDB**

Verificar que MongoDB esté iniciado y que `MONGODB_URI` sea correcta.

**Error de roles no encontrados**

Ejecutar nuevamente:

```bash
node seeds/seed.js
```

**Error de token inválido**

Verificar que el `JWT_SECRET` utilizado para generar y verificar el token sea el mismo.