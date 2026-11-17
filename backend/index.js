require('dotenv').config();

let config;
try {
    config = require('./config.js');
    console.log('Configuración cargada exitosamente');
} catch (error) {
    console.warn('No se pudo cargar config.js, usando variables de entorno por defecto');
    config = {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
        JWT_SECRET: process.env.JWT_SECRET || '1234567890'
    };
}

const express = require('express');
const cors = require('cors');
const sequelize = require('./database');
require('./models'); // Registra las asociaciones de Sequelize

const { autenticar, autorizar } = require('./middleware/auth');

const authRoutes = require('./routes/auth.routes');
const rolRoutes = require('./routes/rol.route');
const usuarioRoutes = require('./routes/usuario.route');
const pedidoRoutes = require('./routes/pedido.route');
const ventaRoutes = require('./routes/venta.routes');
const calificacionRoutes = require('./routes/calificacion.routes');
const categoriaRoutes = require('./routes/categoria.routes');
const productoRoutes = require('./routes/producto.route');
const comboRoutes = require('./routes/combo.routes');
const ofertaRoutes = require('./routes/oferta.routes');
const repartidorRoutes = require('./routes/repartidor.routes');
const clienteRoutes = require('./routes/cliente.routes');
const imageGenerationRoutes = require('./routes/imageGeneration.routes');

const app = express();

// Middlewares globales
app.use(express.json());
app.use(cors({ origin: 'http://localhost:4200' }));

// Autenticación
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api/rol', autenticar, autorizar(['admin']), rolRoutes);
app.use('/api/usuario', autenticar, autorizar(['admin']), usuarioRoutes);
app.use('/api/pedido', autenticar, autorizar(['admin', 'cliente', 'repartidor', 'supervisor_cocina', 'supervisor_ventas']), pedidoRoutes);
app.use('/api/ventas', autenticar, autorizar(['admin', 'supervisor_ventas', 'supervisor_cocina']), ventaRoutes);
app.use('/api/calificaciones', autenticar, autorizar(['cliente']), calificacionRoutes);

app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/combos', comboRoutes);
app.use('/api/ofertas', ofertaRoutes);
app.use('/api/repartidores', autenticar, autorizar(['admin', 'repartidor', 'supervisor_ventas', 'supervisor_cocina']), repartidorRoutes);
app.use('/api/cliente', autenticar, autorizar(['admin', 'cliente']), clienteRoutes);
app.use('/api', imageGenerationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Métricas
app.get('/api/metrics', (req, res) => {
    const metrics = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        timestamp: new Date().toISOString()
    };

    res.set('Content-Type', 'text/plain');
    res.send(`# HELP nodejs_uptime_seconds Uptime of the process\n# TYPE nodejs_uptime_seconds gauge\nnodejs_uptime_seconds ${metrics.uptime}\n`);
});

// Arranque del servidor con PostgreSQL
app.set('port', process.env.PORT || config.PORT || 3000);

sequelize.authenticate()
    .then(() => sequelize.sync())
    .then(() => {
        console.log('PostgreSQL conectado y modelos sincronizados');

        app.listen(app.get('port'), () => {
            console.log(`Servidor corriendo en el puerto ${app.get('port')}`);
            console.log(`Entorno: ${process.env.NODE_ENV || config.NODE_ENV || 'development'}`);
        });
    })
    .catch(error => {
        console.error('Error al conectar con PostgreSQL:', error);
        process.exit(1);
    });
