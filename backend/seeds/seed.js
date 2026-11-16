
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

const Rol = require('../models/rol');
const Usuario = require('../models/Usuario');
const Cliente = require('../models/cliente.model');
const Repartidor = require('../models/Repartidor');
const Categoria = require('../models/categoria.model');
const Producto = require('../models/Producto');
const Combo = require('../models/Combo');
const Oferta = require('../models/Oferta');
const Pedido = require('../models/pedido');
const Calificacion = require('../models/Calificacion');

const roles = [
    'admin',
    'cliente',
    'supervisor_cocina',
    'supervisor_ventas',
    'repartidor'
];

const integrantes = [
    { nombre: 'Cesar', apellido: 'Quiroga', username: 'cquiroga', email: 'cesar.quiroga@grupo14.com' },
    { nombre: 'Romina', apellido: 'Patagua', username: 'rpatagua', email: 'romina.patagua@grupo14.com' },
    { nombre: 'Martin', apellido: 'Gutierrez', username: 'mgutierrez', email: 'martin.gutierrez@grupo14.com' },
    { nombre: 'Gaston', apellido: 'Gregorio', username: 'ggregorio', email: 'gaston.gregorio@grupo14.com' }
];

async function obtenerRol(nombre) {
    return Rol.findOneAndUpdate(
        { nombre },
        { $setOnInsert: { nombre, estado: true } },
        { upsert: true, new: true }
    );
}

async function crearUsuario(datos, rolId, passwordHash) {
    let usuario = await Usuario.findOne({ username: datos.username });

    if (!usuario) {
        usuario = await Usuario.create({
            ...datos,
            password: passwordHash,
            rolId,
            estado: true
        });
    }

    return usuario;
}

async function seed() {
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log('Conectado a MongoDB');

        // 1. ROLES
        const rolesDB = {};

        for (const nombre of roles) {
            rolesDB[nombre] = await obtenerRol(nombre);
        }

        console.log('Roles inicializados');

        // 2. USUARIOS DEL GRUPO
        const passwordHash = await bcrypt.hash('hia2026', 10);

        for (const integrante of integrantes) {
            await crearUsuario(integrante, rolesDB.admin._id, passwordHash);
        }

        console.log('Usuarios del grupo inicializados');

        // 3. CATEGORÍAS CON IMÁGENES
        const categoriasData = [
            {
                nombre: 'Hamburguesas',
                descripcion: 'Hamburguesas artesanales y clásicas',
                imagen: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800'
            },
            {
                nombre: 'Pizzas',
                descripcion: 'Pizzas tradicionales y especiales',
                imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'
            },
            {
                nombre: 'Empanadas',
                descripcion: 'Empanadas con distintos rellenos',
                imagen: 'https://images.unsplash.com/photo-1604467715878-83e57e8bc129?w=800'
            },
            {
                nombre: 'Bebidas',
                descripcion: 'Bebidas frías',
                imagen: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800'
            },
            {
                nombre: 'Postres',
                descripcion: 'Postres y opciones dulces',
                imagen: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800'
            }
        ];

        const categoriasDB = {};

        for (const categoria of categoriasData) {
            categoriasDB[categoria.nombre] = await Categoria.findOneAndUpdate(
                { nombre: categoria.nombre },
                { $set: categoria },
                { upsert: true, new: true, runValidators: true }
            );
        }

        console.log('Categorías inicializadas');

        // 4. PRODUCTOS CON IMÁGENES
        const productosData = [
            {
                nombre: 'Hamburguesa Clásica',
                descripcion: 'Carne, lechuga, tomate y queso',
                precio: 6500,
                categoriaId: categoriasDB.Hamburguesas._id,
                stock: 30,
                imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800'
            },
            {
                nombre: 'Hamburguesa Doble',
                descripcion: 'Doble carne y doble queso',
                precio: 8500,
                categoriaId: categoriasDB.Hamburguesas._id,
                stock: 25,
                imagen: 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=800'
            },
            {
                nombre: 'Hamburguesa Completa',
                descripcion: 'Carne, jamón, queso, huevo y verduras',
                precio: 9000,
                categoriaId: categoriasDB.Hamburguesas._id,
                stock: 20,
                imagen: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800'
            },
            {
                nombre: 'Pizza Muzarella',
                descripcion: 'Salsa, mozzarella y aceitunas',
                precio: 10000,
                categoriaId: categoriasDB.Pizzas._id,
                stock: 20,
                imagen: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=800'
            },
            {
                nombre: 'Pizza Especial',
                descripcion: 'Mozzarella, jamón y morrones',
                precio: 12500,
                categoriaId: categoriasDB.Pizzas._id,
                stock: 15,
                imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'
            },
            {
                nombre: 'Pizza Napolitana',
                descripcion: 'Mozzarella, tomate y ajo',
                precio: 11500,
                categoriaId: categoriasDB.Pizzas._id,
                stock: 15,
                imagen: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800'
            },
            {
                nombre: 'Empanada de Carne',
                descripcion: 'Empanada de carne tradicional',
                precio: 1200,
                categoriaId: categoriasDB.Empanadas._id,
                stock: 100,
                imagen: 'https://images.unsplash.com/photo-1604467715878-83e57e8bc129?w=800'
            },
            {
                nombre: 'Empanada de Pollo',
                descripcion: 'Empanada de pollo',
                precio: 1200,
                categoriaId: categoriasDB.Empanadas._id,
                stock: 100,
                imagen: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800'
            },
            {
                nombre: 'Empanada de Jamón y Queso',
                descripcion: 'Empanada de jamón y queso',
                precio: 1300,
                categoriaId: categoriasDB.Empanadas._id,
                stock: 100,
                imagen: 'https://images.unsplash.com/photo-1604467715878-83e57e8bc129?w=800'
            },
            {
                nombre: 'Coca Cola 500ml',
                descripcion: 'Gaseosa Coca Cola',
                precio: 1800,
                categoriaId: categoriasDB.Bebidas._id,
                stock: 50,
                imagen: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800'
            },
            {
                nombre: 'Agua Mineral 500ml',
                descripcion: 'Agua mineral sin gas',
                precio: 1200,
                categoriaId: categoriasDB.Bebidas._id,
                stock: 50,
                imagen: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800'
            },
            {
                nombre: 'Sprite 500ml',
                descripcion: 'Gaseosa Sprite',
                precio: 1800,
                categoriaId: categoriasDB.Bebidas._id,
                stock: 50,
                imagen: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800'
            },
            {
                nombre: 'Flan Casero',
                descripcion: 'Flan con dulce de leche',
                precio: 2500,
                categoriaId: categoriasDB.Postres._id,
                stock: 15,
                imagen: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800'
            },
            {
                nombre: 'Brownie',
                descripcion: 'Brownie de chocolate',
                precio: 2800,
                categoriaId: categoriasDB.Postres._id,
                stock: 15,
                imagen: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800'
            }
        ];

        const productosDB = {};

        for (const producto of productosData) {
            productosDB[producto.nombre] = await Producto.findOneAndUpdate(
                { nombre: producto.nombre },
                { $set: producto },
                { upsert: true, new: true, runValidators: true }
            );
        }

        console.log('Productos inicializados');

        // 5. COMBOS
        const combosData = [
            {
                nombre: 'Combo Hamburguesa',
                descripcion: 'Hamburguesa clásica con bebida',
                productosIds: [
                    productosDB['Hamburguesa Clásica']._id,
                    productosDB['Coca Cola 500ml']._id
                ],
                precioCombo: 8000,
                descuento: 10,
                precioFinal: 7200
            },
            {
                nombre: 'Combo Familiar',
                descripcion: 'Pizza especial con dos bebidas',
                productosIds: [
                    productosDB['Pizza Especial']._id,
                    productosDB['Coca Cola 500ml']._id,
                    productosDB['Sprite 500ml']._id
                ],
                precioCombo: 15000,
                descuento: 10,
                precioFinal: 13500
            }
        ];

        for (const combo of combosData) {
            await Combo.findOneAndUpdate(
                { nombre: combo.nombre },
                { $set: combo },
                { upsert: true, new: true, runValidators: true }
            );
        }

        console.log('Combos inicializados');

        // 6. OFERTAS
        const fechaInicio = new Date();
        const fechaFin = new Date();
        fechaFin.setMonth(fechaFin.getMonth() + 1);

        const ofertasData = [
            {
                nombre: 'Descuento en Hamburguesas',
                descripcion: 'Descuento especial en hamburguesas',
                porcentajeDescuento: 15,
                fechaInicio,
                fechaFin,
                tipoOferta: 'categoria',
                categoriasAplicables: [categoriasDB.Hamburguesas._id],
                activa: true
            },
            {
                nombre: 'Oferta en Pizzas',
                descripcion: 'Descuento en pizzas seleccionadas',
                porcentajeDescuento: 10,
                fechaInicio,
                fechaFin,
                tipoOferta: 'categoria',
                categoriasAplicables: [categoriasDB.Pizzas._id],
                activa: true
            }
        ];

        for (const oferta of ofertasData) {
            await Oferta.findOneAndUpdate(
                { nombre: oferta.nombre },
                { $set: oferta },
                { upsert: true, new: true, runValidators: false }
            );
        }

        console.log('Ofertas inicializadas');

        // 7. CLIENTES DE PRUEBA
        const clienteData = [
            {
                username: 'cliente1',
                nombre: 'Juan',
                apellido: 'Perez',
                email: 'juan.perez@demo.com',
                direccion: 'Av. Belgrano 500, San Salvador de Jujuy'
            },
            {
                username: 'cliente2',
                nombre: 'Maria',
                apellido: 'Lopez',
                email: 'maria.lopez@demo.com',
                direccion: 'Calle Lavalle 250, San Salvador de Jujuy'
            }
        ];

        const clientesDB = [];

        for (const datos of clienteData) {
            let usuario = await Usuario.findOne({ username: datos.username });

            if (!usuario) {
                usuario = await Usuario.create({
                    username: datos.username,
                    nombre: datos.nombre,
                    apellido: datos.apellido,
                    email: datos.email,
                    password: passwordHash,
                    rolId: rolesDB.cliente._id
                });
            }

            let cliente = await Cliente.findOne({ usuarioId: usuario._id });

            if (!cliente) {
                cliente = await Cliente.create({
                    usuarioId: usuario._id,
                    direccion: datos.direccion,
                    puntos: 0
                });
            }

            if (!usuario.clienteId) {
                usuario.clienteId = cliente._id;
                await usuario.save();
            }

            clientesDB.push(cliente);
        }

        console.log('Clientes de prueba inicializados');

        // 8. REPARTIDOR DE PRUEBA
        let usuarioRepartidor = await Usuario.findOne({ username: 'repartidor1' });

        if (!usuarioRepartidor) {
            usuarioRepartidor = await Usuario.create({
                username: 'repartidor1',
                nombre: 'Carlos',
                apellido: 'Gomez',
                email: 'repartidor@demo.com',
                password: passwordHash,
                rolId: rolesDB.repartidor._id
            });
        }

        let repartidor = await Repartidor.findOne({
            usuarioId: usuarioRepartidor._id
        });

        if (!repartidor) {
            repartidor = await Repartidor.create({
                usuarioId: usuarioRepartidor._id,
                estado: 'disponible',
                vehiculo: 'Motocicleta',
                numeroLicencia: 'LIC-0001'
            });
        }

        if (!usuarioRepartidor.repartidorId) {
            usuarioRepartidor.repartidorId = repartidor._id;
            await usuarioRepartidor.save();
        }

        console.log('Repartidor inicializado');

        // 9. PEDIDO DE PRUEBA
        let pedido = await Pedido.findOne({
            observaciones: 'Pedido generado por seed'
        });

        if (!pedido) {
            pedido = await Pedido.create({
                clienteId: clientesDB[0]._id,
                estado: 'entregado',
                direccionEntrega: 'Av. Belgrano 500, San Salvador de Jujuy',
                metodoPago: 'Efectivo',
                detalleProductos: [
                    {
                        productoId: productosDB['Hamburguesa Clásica']._id,
                        nombreProducto: 'Hamburguesa Clásica',
                        cantidad: 2,
                        precioUnitario: productosDB['Hamburguesa Clásica'].precio,
                        subtotal: productosDB['Hamburguesa Clásica'].precio * 2
                    },
                    {
                        productoId: productosDB['Coca Cola 500ml']._id,
                        nombreProducto: 'Coca Cola 500ml',
                        cantidad: 1,
                        precioUnitario: productosDB['Coca Cola 500ml'].precio,
                        subtotal: productosDB['Coca Cola 500ml'].precio
                    }
                ],
                costoEnvio: 1000,
                descuentos: 0,
                repartidorId: repartidor._id,
                observaciones: 'Pedido generado por seed'
            });
        }

        console.log('Pedido de prueba inicializado');

        // 10. CALIFICACIÓN DE PRUEBA
        await Calificacion.updateOne(
            { pedidoId: pedido._id },
            {
                $setOnInsert: {
                    pedidoId: pedido._id,
                    clienteId: clientesDB[0]._id,
                    puntuacionComida: 5,
                    puntuacionServicio: 5,
                    puntuacionEntrega: 5,
                    comentario: 'Excelente servicio y comida',
                    calificacionProductos: [
                        {
                            productoId: productosDB['Hamburguesa Clásica']._id,
                            nombreProducto: 'Hamburguesa Clásica',
                            puntuacion: 5,
                            comentario: 'Muy rica'
                        }
                    ]
                }
            },
            { upsert: true }
        );

        console.log('Calificación inicializada');

        console.log('\nSeed ejecutado correctamente');
        console.log('Usuarios del grupo:');

        integrantes.forEach(u => {
            console.log(`- ${u.username} / hia2026`);
        });

    } catch (error) {
        console.error('Error ejecutando seed:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seed();
