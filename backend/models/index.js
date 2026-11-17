const Rol = require('./rol');
const Usuario = require('./usuario');
const Cliente = require('./cliente.model');
const Repartidor = require('./Repartidor');
const Categoria = require('./categoria.model');
const Producto = require('./producto');
const Pedido = require('./pedido');
const Venta = require('./Venta');
const Calificacion = require('./Calificacion');
const Combo = require('./Combo');
const Oferta = require('./Oferta');

Rol.hasMany(Usuario, { foreignKey: 'rolId', as: 'usuarios' });
Usuario.belongsTo(Rol, { foreignKey: 'rolId', as: 'rol' });
Usuario.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'clientePerfil', constraints: false });
Usuario.belongsTo(Repartidor, { foreignKey: 'repartidorId', as: 'repartidorPerfil', constraints: false });
Cliente.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
Repartidor.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
Categoria.hasMany(Producto, { foreignKey: 'categoriaId', as: 'productos' });
Producto.belongsTo(Categoria, { foreignKey: 'categoriaId', as: 'categoria' });
Cliente.hasMany(Pedido, { foreignKey: 'clienteId', as: 'pedidos' });
Pedido.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });
Repartidor.hasMany(Pedido, { foreignKey: 'repartidorId', as: 'pedidos' });
Pedido.belongsTo(Repartidor, { foreignKey: 'repartidorId', as: 'repartidor' });
Pedido.hasOne(Venta, { foreignKey: 'pedidoId', as: 'venta' });
Venta.belongsTo(Pedido, { foreignKey: 'pedidoId', as: 'pedido' });
Cliente.hasMany(Venta, { foreignKey: 'clienteId', as: 'ventas' });
Venta.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });
Pedido.hasOne(Calificacion, { foreignKey: 'pedidoId', as: 'calificacion' });
Calificacion.belongsTo(Pedido, { foreignKey: 'pedidoId', as: 'pedido' });
Cliente.hasMany(Calificacion, { foreignKey: 'clienteId', as: 'calificaciones' });
Calificacion.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });


module.exports = { Rol, Usuario, Cliente, Repartidor, Categoria, Producto, Pedido, Venta, Calificacion, Combo, Oferta };
