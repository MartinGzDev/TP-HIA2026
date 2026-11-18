require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const {
  Rol,
  Usuario,
  Cliente,
  Repartidor,
  Categoria,
  Producto,
  Combo,
  Oferta,
  Pedido,
  Venta,
  Calificacion
} = require('../models');

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

const productosData = [
  {
    nombre: 'Hamburguesa Clásica',
    descripcion: 'Carne, lechuga, tomate y queso',
    precio: 6500,
    categoria: 'Hamburguesas',
    stock: 30,
    imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800'
  },
  {
    nombre: 'Hamburguesa Doble',
    descripcion: 'Doble carne y doble queso',
    precio: 8500,
    categoria: 'Hamburguesas',
    stock: 25,
    imagen: 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=800'
  },
  {
    nombre: 'Hamburguesa Completa',
    descripcion: 'Carne, jamón, queso, huevo y verduras',
    precio: 9000,
    categoria: 'Hamburguesas',
    stock: 20,
    imagen: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800'
  },
  {
    nombre: 'Pizza Muzarella',
    descripcion: 'Salsa, mozzarella y aceitunas',
    precio: 10000,
    categoria: 'Pizzas',
    stock: 20,
    imagen: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=800'
  },
  {
    nombre: 'Pizza Especial',
    descripcion: 'Mozzarella, jamón y morrones',
    precio: 12500,
    categoria: 'Pizzas',
    stock: 15,
    imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800'
  },
  {
    nombre: 'Pizza Napolitana',
    descripcion: 'Mozzarella, tomate y ajo',
    precio: 11500,
    categoria: 'Pizzas',
    stock: 15,
    imagen: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800'
  },
  {
    nombre: 'Empanada de Carne',
    descripcion: 'Empanada de carne tradicional',
    precio: 1200,
    categoria: 'Empanadas',
    stock: 100,
    imagen: 'https://images.unsplash.com/photo-1604467715878-83e57e8bc129?w=800'
  },
  {
    nombre: 'Empanada de Pollo',
    descripcion: 'Empanada de pollo',
    precio: 1200,
    categoria: 'Empanadas',
    stock: 100,
    imagen: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800'
  },
  {
    nombre: 'Empanada de Jamón y Queso',
    descripcion: 'Empanada de jamón y queso',
    precio: 1300,
    categoria: 'Empanadas',
    stock: 100,
    imagen: 'https://images.unsplash.com/photo-1604467715878-83e57e8bc129?w=800'
  },
  {
    nombre: 'Coca Cola 500ml',
    descripcion: 'Gaseosa Coca Cola',
    precio: 1800,
    categoria: 'Bebidas',
    stock: 50,
    imagen: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800'
  },
  {
    nombre: 'Agua Mineral 500ml',
    descripcion: 'Agua mineral sin gas',
    precio: 1200,
    categoria: 'Bebidas',
    stock: 50,
    imagen: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800'
  },
  {
    nombre: 'Sprite 500ml',
    descripcion: 'Gaseosa Sprite',
    precio: 1800,
    categoria: 'Bebidas',
    stock: 50,
    imagen: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800'
  },
  {
    nombre: 'Flan Casero',
    descripcion: 'Flan con dulce de leche',
    precio: 2500,
    categoria: 'Postres',
    stock: 15,
    imagen: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800'
  },
  {
    nombre: 'Brownie',
    descripcion: 'Brownie de chocolate',
    precio: 2800,
    categoria: 'Postres',
    stock: 15,
    imagen: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800'
  }
];

async function guardarPorCampo(Model, campo, valor, datos, transaction) {
  let registro = await Model.findOne({
    where: { [campo]: valor },
    transaction
  });

  if (registro) {
    await registro.update(datos, { transaction });
  } else {
    registro = await Model.create(datos, { transaction });
  }

  return registro;
}

async function seed() {
  let transaction;

  try {
    await sequelize.authenticate();
    await sequelize.sync();

    transaction = await sequelize.transaction();

    // Limpiar registros de demostración anteriores.
    const clienteDemoAnterior = await Usuario.findOne({
      where: { username: 'cliente.demo' },
      transaction
    });

    const repartidorDemoAnterior = await Usuario.findOne({
      where: { username: 'repartidor.demo' },
      transaction
    });

    const pedidoDemoAnterior = await Pedido.findOne({
      where: { observaciones: 'Pedido de demostración del seed' },
      transaction
    });

    if (pedidoDemoAnterior) {
      await Calificacion.destroy({
        where: { pedidoId: pedidoDemoAnterior.id },
        transaction
      });

      await Venta.destroy({
        where: { pedidoId: pedidoDemoAnterior.id },
        transaction
      });

      await pedidoDemoAnterior.destroy({ transaction });
    }

    if (clienteDemoAnterior) {
      await Cliente.destroy({
        where: { usuarioId: clienteDemoAnterior.id },
        transaction
      });

      await clienteDemoAnterior.destroy({ transaction });
    }

    if (repartidorDemoAnterior) {
      await Repartidor.destroy({
        where: { usuarioId: repartidorDemoAnterior.id },
        transaction
      });

      await repartidorDemoAnterior.destroy({ transaction });
    }

    await Combo.destroy({
      where: { nombre: 'Combo Clásico' },
      transaction
    });

    await Oferta.destroy({
      where: { nombre: 'Oferta de bienvenida' },
      transaction
    });

    await Producto.destroy({
      where: { nombre: ['Gaseosa', 'Helado'] },
      transaction
    });

    // 1. Roles
    const rolesDB = {};

    for (const nombre of roles) {
      rolesDB[nombre] = await guardarPorCampo(
        Rol,
        'nombre',
        nombre,
        { nombre, estado: true },
        transaction
      );
    }

    // 2. Usuarios integrantes
    const passwordHash = await bcrypt.hash('hia2026', 10);

    for (const integrante of integrantes) {
      await guardarPorCampo(
        Usuario,
        'username',
        integrante.username,
        {
          ...integrante,
          password: passwordHash,
          rolId: rolesDB.admin.id,
          estado: true
        },
        transaction
      );
    }

    // 3. Categorías
    const categoriasDB = {};

    for (const categoria of categoriasData) {
      categoriasDB[categoria.nombre] = await guardarPorCampo(
        Categoria,
        'nombre',
        categoria.nombre,
        { ...categoria, estado: true },
        transaction
      );
    }

    // 4. Productos
    const productosDB = {};

    for (const producto of productosData) {
      const datos = {
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: producto.precio,
        categoriaId: categoriasDB[producto.categoria].id,
        stock: producto.stock,
        disponible: producto.stock > 0,
        imagen: producto.imagen
      };

      productosDB[producto.nombre] = await guardarPorCampo(
        Producto,
        'nombre',
        producto.nombre,
        datos,
        transaction
      );
    }

    // 5. Combos
    const combosData = [
      {
        nombre: 'Combo Hamburguesa',
        descripcion: 'Hamburguesa clásica con bebida',
        productosIds: [
          productosDB['Hamburguesa Clásica'].id,
          productosDB['Coca Cola 500ml'].id
        ],
        precioCombo: 8000,
        descuento: 10,
        precioFinal: 7200,
        activo: true
      },
      {
        nombre: 'Combo Familiar',
        descripcion: 'Pizza especial con dos bebidas',
        productosIds: [
          productosDB['Pizza Especial'].id,
          productosDB['Coca Cola 500ml'].id,
          productosDB['Sprite 500ml'].id
        ],
        precioCombo: 15000,
        descuento: 10,
        precioFinal: 13500,
        activo: true
      }
    ];

    for (const combo of combosData) {
      await guardarPorCampo(
        Combo,
        'nombre',
        combo.nombre,
        combo,
        transaction
      );
    }

    // 6. Ofertas
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
        categoriasAplicables: [categoriasDB.Hamburguesas.id],
        productosAplicables: [],
        activa: true
      },
      {
        nombre: 'Oferta en Pizzas',
        descripcion: 'Descuento en pizzas seleccionadas',
        porcentajeDescuento: 10,
        fechaInicio,
        fechaFin,
        tipoOferta: 'categoria',
        categoriasAplicables: [categoriasDB.Pizzas.id],
        productosAplicables: [],
        activa: true
      }
    ];

    for (const oferta of ofertasData) {
      await guardarPorCampo(
        Oferta,
        'nombre',
        oferta.nombre,
        oferta,
        transaction
      );
    }

    // 7. Clientes
    const clientesData = [
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

    for (const datos of clientesData) {
      const usuario = await guardarPorCampo(
        Usuario,
        'username',
        datos.username,
        {
          username: datos.username,
          nombre: datos.nombre,
          apellido: datos.apellido,
          email: datos.email,
          password: passwordHash,
          rolId: rolesDB.cliente.id,
          estado: true
        },
        transaction
      );

      const cliente = await guardarPorCampo(
        Cliente,
        'usuarioId',
        usuario.id,
        {
          usuarioId: usuario.id,
          direccion: datos.direccion,
          puntos: 0,
          preferenciasAlimentarias: []
        },
        transaction
      );

      await usuario.update(
        { clienteId: cliente.id },
        { transaction }
      );

      clientesDB.push(cliente);
    }

    // 8. Repartidor
    const usuarioRepartidor = await guardarPorCampo(
      Usuario,
      'username',
      'repartidor1',
      {
        username: 'repartidor1',
        nombre: 'Carlos',
        apellido: 'Gomez',
        email: 'repartidor@demo.com',
        password: passwordHash,
        rolId: rolesDB.repartidor.id,
        estado: true
      },
      transaction
    );

    const repartidor = await guardarPorCampo(
      Repartidor,
      'usuarioId',
      usuarioRepartidor.id,
      {
        usuarioId: usuarioRepartidor.id,
        estado: 'disponible',
        vehiculo: 'Motocicleta',
        numeroLicencia: 'LIC-0001'
      },
      transaction
    );

    await usuarioRepartidor.update(
      { repartidorId: repartidor.id },
      { transaction }
    );

    // 9. Pedido
    const hamburguesa = productosDB['Hamburguesa Clásica'];
    const cocaCola = productosDB['Coca Cola 500ml'];

    const pedidoDatos = {
      clienteId: clientesDB[0].id,
      estado: 'entregado',
      direccionEntrega: 'Av. Belgrano 500, San Salvador de Jujuy',
      metodoPago: 'Efectivo',
      detalleProductos: [
        {
          productoId: hamburguesa.id,
          nombreProducto: 'Hamburguesa Clásica',
          cantidad: 2,
          precioUnitario: Number(hamburguesa.precio),
          subtotal: Number(hamburguesa.precio) * 2
        },
        {
          productoId: cocaCola.id,
          nombreProducto: 'Coca Cola 500ml',
          cantidad: 1,
          precioUnitario: Number(cocaCola.precio),
          subtotal: Number(cocaCola.precio)
        }
      ],
      costoEnvio: 1000,
      descuentos: 0,
      repartidorId: repartidor.id,
      observaciones: 'Pedido generado por seed'
    };

    const pedido = await guardarPorCampo(
      Pedido,
      'observaciones',
      pedidoDatos.observaciones,
      pedidoDatos,
      transaction
    );

    // 10. Calificación
    await guardarPorCampo(
      Calificacion,
      'pedidoId',
      pedido.id,
      {
        pedidoId: pedido.id,
        clienteId: clientesDB[0].id,
        puntuacionComida: 5,
        puntuacionServicio: 5,
        puntuacionEntrega: 5,
        comentario: 'Excelente servicio y comida',
        calificacionProductos: [
          {
            productoId: String(hamburguesa.id),
            nombreProducto: 'Hamburguesa Clásica',
            puntuacion: 5,
            comentario: 'Muy rica'
          }
        ]
      },
      transaction
    );

    await transaction.commit();

    console.log('\nSeed PostgreSQL ejecutado correctamente.');
    console.log('Registros inicializados:');
    console.log('- 5 roles');
    console.log('- 4 usuarios integrantes');
    console.log('- 5 categorías');
    console.log('- 14 productos');
    console.log('- 2 combos');
    console.log('- 2 ofertas');
    console.log('- 2 clientes de prueba');
    console.log('- 1 repartidor de prueba');
    console.log('- 1 pedido de prueba');
    console.log('- 1 calificación de prueba');
    console.log('\nContraseña de los usuarios creados: hia2026');

    console.log('\n========== USUARIOS DE ACCESO ==========');

    console.table([
      { username: 'cquiroga', password: 'hia2026', rol: 'admin' },
      { username: 'rpatagua', password: 'hia2026', rol: 'admin' },
      { username: 'mgutierrez', password: 'hia2026', rol: 'admin' },
      { username: 'ggregorio', password: 'hia2026', rol: 'admin' },
      { username: 'cliente1', password: 'hia2026', rol: 'cliente' },
      { username: 'cliente2', password: 'hia2026', rol: 'cliente' },
      { username: 'repartidor1', password: 'hia2026', rol: 'repartidor' }
    ]);

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error('Error ejecutando el seed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seed();