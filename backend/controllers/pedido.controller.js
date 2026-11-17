const { Op } = require('sequelize');
const { Pedido, Cliente, Producto, Repartidor, Usuario } = require('../models');
const emailService = require('../services/emailService');

const idUsuario = (req) => req.usuario?.id ?? req.usuario?._id;
const rolUsuario = (req) => req.usuario?.rol;
const incluirCliente = { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'email', 'telefono'] }] };
const incluirRepartidor = { model: Repartidor, as: 'repartidor', include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'telefono'] }] };
const incluirPersonas = [incluirCliente, incluirRepartidor];
const error500 = (res, mensaje, error) => res.status(500).json({ mensaje, error: error.message });

async function clienteDelUsuario(usuarioId) {
  const usuario = await Usuario.findByPk(usuarioId, { attributes: ['id', 'clienteId'] });
  return usuario?.clienteId ?? null;
}
async function repartidorDelUsuario(usuarioId) {
  return Repartidor.findOne({ where: { usuarioId } });
}
function aplicarFiltrosFecha(where, desde, hasta) {
  if (desde || hasta) {
    where.fechaPedido = {};
    if (desde) where.fechaPedido[Op.gte] = new Date(desde);
    if (hasta) where.fechaPedido[Op.lte] = new Date(hasta);
  }
}

exports.crearPedido = async (req, res) => {
  if (rolUsuario(req) !== 'cliente') return res.status(403).json({ mensaje: 'Acceso denegado. Solo los clientes pueden crear pedidos.' });
  const transaction = await Pedido.sequelize.transaction();
  try {
    const { detalleProductos, direccionEntrega, metodoPago, descuentos = 0, costoEnvio = 0, observaciones } = req.body;
    if (!Array.isArray(detalleProductos) || !detalleProductos.length) {
      await transaction.rollback();
      return res.status(400).json({ mensaje: 'Debe agregar al menos un producto al pedido.' });
    }
    const clienteId = await clienteDelUsuario(idUsuario(req));
    if (!clienteId) { await transaction.rollback(); return res.status(403).json({ mensaje: 'No se pudo asociar un cliente válido para crear el pedido.' }); }
    const cliente = await Cliente.findByPk(clienteId, { transaction, include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }] });
    if (!cliente) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Cliente no encontrado.' }); }
    const detalle = [];
    for (const item of detalleProductos) {
      const cantidad = Number(item.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) throw Object.assign(new Error('La cantidad de cada producto debe ser un entero mayor a cero.'), { status: 400 });
      const producto = await Producto.findByPk(item.productoId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!producto) throw Object.assign(new Error(`Producto con ID ${item.productoId} no encontrado.`), { status: 404 });
      if (producto.stock < cantidad) throw Object.assign(new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, solicitado: ${cantidad}`), { status: 400 });
      detalle.push({ productoId: producto.id, nombreProducto: producto.nombre, cantidad, precioUnitario: Number(producto.precio) });
    }
    const pedido = await Pedido.create({ clienteId, detalleProductos: detalle, direccionEntrega, metodoPago, descuentos, costoEnvio, observaciones }, { transaction });
    for (const item of detalle) await Producto.decrement('stock', { by: item.cantidad, where: { id: item.productoId }, transaction });
    await transaction.commit();
    if (cliente.usuario?.email && emailService?.enviarEmail) {
      try {
        await emailService.enviarEmail(cliente.usuario.email, `Confirmación de tu pedido #${pedido.id} - SUBTE`, `Hola ${cliente.usuario.nombre},\n\nTu pedido fue recibido. Total: $${pedido.total}. Estado: ${pedido.estado}.`, `<p>Hola ${cliente.usuario.nombre},</p><p>Tu pedido <strong>#${pedido.id}</strong> fue recibido. Total: <strong>$${pedido.total}</strong>.</p>`);
      } catch (e) { console.warn('No se pudo enviar email de confirmación:', e.message); }
    }
    return res.status(201).json({ mensaje: 'Pedido creado exitosamente', pedido });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error al crear pedido:', error);
    return res.status(error.status || 500).json({ mensaje: error.status ? error.message : 'Error interno del servidor al crear el pedido', error: error.message });
  }
};

exports.listarPedidos = async (req, res) => {
  try {
    const rol = rolUsuario(req), usuarioId = idUsuario(req), where = {};
    if (rol === 'cliente') {
      const clienteId = await clienteDelUsuario(usuarioId);
      if (!clienteId) return res.status(403).json({ mensaje: 'No se pudo asociar un cliente válido para ver pedidos.' });
      where.clienteId = clienteId;
    } else if (rol === 'repartidor') {
      const repartidor = await repartidorDelUsuario(usuarioId);
      if (!repartidor) return res.status(403).json({ mensaje: 'No se pudo asociar un repartidor válido para ver pedidos.' });
      where[Op.or] = [{ repartidorId: repartidor.id }, { estado: { [Op.in]: ['confirmado', 'en_preparacion', 'en_envio'] }, repartidorId: null }];
    } else if (!['admin', 'supervisor_cocina', 'supervisor_ventas'].includes(rol)) return res.status(403).json({ mensaje: 'Acceso denegado. No tiene permisos para listar pedidos.' });
    if (req.query.repartidorId && rol !== 'repartidor') where.repartidorId = req.query.repartidorId;
    if (req.query.estados) {
      const estados = req.query.estados.split(',').filter(Boolean);
      if (where[Op.or]) where[Op.or] = where[Op.or].map(c => ({ ...c, estado: c.estado ? { [Op.in]: (c.estado[Op.in] || []).filter(e => estados.includes(e)) } : { [Op.in]: estados } })).filter(c => !c.estado[Op.in] || c.estado[Op.in].length);
      else where.estado = { [Op.in]: estados };
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 50), 200);
    const orderField = String(req.query.sortBy || '-fechaPedido').replace(/^[-+]/, '');
    const direction = String(req.query.sortBy || '-fechaPedido').startsWith('-') ? 'DESC' : 'ASC';
    const result = await Pedido.findAndCountAll({ where, include: incluirPersonas, distinct: true, order: [[orderField, direction]], limit, offset: (page - 1) * limit });
    return res.status(200).json({ pedidos: result.rows, paginacion: { total: result.count, pagina: page, limite: limit, totalPaginas: Math.ceil(result.count / limit), tieneSiguiente: page < Math.ceil(result.count / limit), tieneAnterior: page > 1 } });
  } catch (error) { console.error('Error al listar pedidos:', error); return error500(res, 'Error interno del servidor al listar pedidos', error); }
};

exports.obtenerPedidoPorId = async (req, res) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id, { include: incluirPersonas });
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    const rol = rolUsuario(req), uid = idUsuario(req);
    if (rol === 'cliente') {
      const clienteId = await clienteDelUsuario(uid);
      if (!clienteId || Number(pedido.clienteId) !== Number(clienteId)) return res.status(403).json({ mensaje: 'Acceso denegado. Solo puede ver sus propios pedidos.' });
    } else if (rol === 'repartidor') {
      const repartidor = await repartidorDelUsuario(uid);
      if (!repartidor || Number(pedido.repartidorId) !== Number(repartidor.id)) return res.status(403).json({ mensaje: 'Acceso denegado. Solo puede ver los pedidos asignados a usted.' });
    } else if (!['admin', 'supervisor_cocina', 'supervisor_ventas'].includes(rol)) return res.status(403).json({ mensaje: 'Acceso denegado. No tiene permisos para ver este pedido.' });
    return res.status(200).json(pedido);
  } catch (error) { return error500(res, 'Error interno del servidor al obtener pedido', error); }
};

exports.actualizarPedido = async (req, res) => {
  const rol = rolUsuario(req);
  if (!['admin', 'supervisor_ventas', 'repartidor'].includes(rol)) return res.status(403).json({ mensaje: 'Acceso denegado. Solo administradores, supervisores de ventas o repartidores pueden actualizar pedidos.' });
  try {
    const pedido = await Pedido.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado para actualizar' });
    const data = { ...req.body };
    if (rol === 'repartidor') {
      const repartidor = await repartidorDelUsuario(idUsuario(req));
      if (!repartidor) return res.status(403).json({ mensaje: 'No se pudo asociar un repartidor válido.' });
      const asignado = Number(pedido.repartidorId) === Number(repartidor.id);
      if (!asignado && !(pedido.repartidorId == null && pedido.estado === 'en_envio')) return res.status(403).json({ mensaje: 'Acceso denegado. No puede actualizar este pedido.' });
      if (!pedido.repartidorId && data.repartidorId) data.repartidorId = repartidor.id;
      const allowed = ['repartidorId', 'estado', 'observaciones'];
      for (const key of Object.keys(data)) if (!allowed.includes(key)) delete data[key];
    }
    await pedido.update(data);
    return res.status(200).json({ mensaje: 'Pedido actualizado exitosamente', pedido });
  } catch (error) { return error500(res, 'Error interno del servidor al actualizar el pedido', error); }
};

exports.eliminarPedido = async (req, res) => {
  if (rolUsuario(req) !== 'admin') return res.status(403).json({ mensaje: 'Acceso denegado. Solo administradores pueden eliminar pedidos.' });
  const transaction = await Pedido.sequelize.transaction();
  try {
    const pedido = await Pedido.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!pedido) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Pedido no encontrado para eliminar' }); }
    for (const item of pedido.detalleProductos || []) await Producto.increment('stock', { by: Number(item.cantidad), where: { id: item.productoId }, transaction });
    await pedido.destroy({ transaction });
    await transaction.commit();
    return res.status(200).json({ mensaje: 'Pedido eliminado exitosamente. Stock de productos restablecido.' });
  } catch (error) { if (!transaction.finished) await transaction.rollback(); return error500(res, 'Error interno del servidor al eliminar el pedido', error); }
};

exports.getPedidosEstado = async (req, res) => {
  try {
    const where = { estado: req.params.estado }, rol = rolUsuario(req);
    if (rol === 'cliente') { const cid = await clienteDelUsuario(idUsuario(req)); if (!cid) return res.status(403).json({ mensaje: 'No se pudo asociar un cliente válido.' }); where.clienteId = cid; }
    else if (rol === 'repartidor') { const r = await repartidorDelUsuario(idUsuario(req)); if (!r) return res.status(403).json({ mensaje: 'No se pudo asociar un repartidor válido.' }); where.repartidorId = r.id; }
    else if (!['admin', 'supervisor_cocina', 'supervisor_ventas'].includes(rol)) return res.status(403).json({ mensaje: 'Acceso denegado.' });
    return res.json(await Pedido.findAll({ where, include: incluirPersonas, order: [['fechaPedido', 'DESC']] }));
  } catch (error) { return error500(res, 'Error interno al obtener pedidos por estado', error); }
};

exports.getPedidosCliente = async (req, res) => {
  try {
    const { clienteId } = req.params, rol = rolUsuario(req);
    if (rol === 'cliente') { const cid = await clienteDelUsuario(idUsuario(req)); if (!cid || Number(cid) !== Number(clienteId)) return res.status(403).json({ mensaje: 'Acceso denegado. Solo puede ver sus propios pedidos.' }); }
    else if (!['admin', 'supervisor_ventas'].includes(rol)) return res.status(403).json({ mensaje: 'Acceso denegado. No tiene permisos para ver pedidos por cliente.' });
    return res.json(await Pedido.findAll({ where: { clienteId }, include: incluirPersonas, order: [['fechaPedido', 'DESC']] }));
  } catch (error) { return error500(res, 'Error interno al obtener pedidos por cliente', error); }
};

exports.getPedidosFiltrados = async (req, res) => {
  try {
    const { estado, fechaDesde, fechaHasta, clienteId } = req.query, rol = rolUsuario(req), where = {};
    if (rol === 'cliente') { const cid = await clienteDelUsuario(idUsuario(req)); if (!cid) return res.status(403).json({ mensaje: 'No se pudo asociar un cliente válido.' }); if (clienteId && Number(clienteId) !== Number(cid)) return res.status(403).json({ mensaje: 'Acceso denegado. No puede filtrar por otro cliente.' }); where.clienteId = cid; }
    else if (rol === 'repartidor') { const r = await repartidorDelUsuario(idUsuario(req)); if (!r) return res.status(403).json({ mensaje: 'No se pudo asociar un repartidor válido.' }); where.repartidorId = r.id; }
    else if (['admin', 'supervisor_cocina', 'supervisor_ventas'].includes(rol)) { if (clienteId) where.clienteId = clienteId; }
    else return res.status(403).json({ mensaje: 'Acceso denegado. No tiene permisos para filtrar pedidos.' });
    if (estado) where.estado = estado;
    aplicarFiltrosFecha(where, fechaDesde, fechaHasta);
    return res.json(await Pedido.findAll({ where, include: incluirPersonas, order: [['fechaPedido', 'DESC']] }));
  } catch (error) { return error500(res, 'Error interno al obtener pedidos filtrados', error); }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const pedido = await Pedido.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    const nuevoEstado = req.body.nuevoEstado || req.body.estado, rol = rolUsuario(req);
    const estados = Pedido.rawAttributes.estado.values;
    if (!estados.includes(nuevoEstado)) return res.status(400).json({ mensaje: `Estado '${nuevoEstado}' no válido. Estados permitidos: ${estados.join(', ')}` });
    let autorizado = false;
    if (rol === 'admin') autorizado = true;
    else if (rol === 'supervisor_cocina') autorizado = (['pendiente', 'confirmado', 'en_preparacion', 'en_envio'].includes(pedido.estado) && ['pendiente', 'confirmado', 'en_preparacion', 'en_envio'].includes(nuevoEstado)) || nuevoEstado === 'cancelado';
    else if (rol === 'repartidor') {
      const r = await repartidorDelUsuario(idUsuario(req));
      if (r) {
        const asignado = Number(pedido.repartidorId) === Number(r.id);
        autorizado = (asignado && ['en_envio', 'entregado'].includes(pedido.estado) && ['en_envio', 'entregado'].includes(nuevoEstado)) || (!pedido.repartidorId && pedido.estado === 'en_envio' && nuevoEstado === 'en_envio');
        if (autorizado && !pedido.repartidorId) pedido.repartidorId = r.id;
      }
    }
    if (!autorizado) return res.status(403).json({ mensaje: 'Acceso denegado. No tiene permisos para cambiar este estado.' });
    pedido.estado = nuevoEstado;
    await pedido.save();
    const cliente = await Cliente.findByPk(pedido.clienteId, { include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }] });
    if (cliente?.usuario?.email && emailService?.enviarEmail) {
      try { await emailService.enviarEmail(cliente.usuario.email, `Actualización de estado de tu pedido #${pedido.id} - SUBTE`, `Hola ${cliente.usuario.nombre}, el estado de tu pedido es ${nuevoEstado}.`, `<p>Hola ${cliente.usuario.nombre}, el estado de tu pedido <strong>#${pedido.id}</strong> es <strong>${nuevoEstado}</strong>.</p>`); }
      catch (e) { console.warn('Error enviando notificación:', e.message); }
    }
    return res.json({ mensaje: 'Estado del pedido actualizado exitosamente', pedido });
  } catch (error) { return error500(res, 'Error interno al cambiar el estado del pedido', error); }
};

exports.asignarRepartidor = async (req, res) => {
  if (!['admin', 'supervisor_ventas'].includes(rolUsuario(req))) return res.status(403).json({ mensaje: 'Acceso denegado. Solo administradores o supervisores de ventas pueden asignar repartidores.' });
  try {
    const { repartidorId, fechaEstimadaEntrega } = req.body;
    const pedido = await Pedido.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    const repartidor = await Repartidor.findByPk(repartidorId);
    if (!repartidor) return res.status(404).json({ mensaje: 'Repartidor no encontrado' });
    pedido.repartidorId = repartidor.id;
    pedido.fechaEstimadaEntrega = fechaEstimadaEntrega ? new Date(fechaEstimadaEntrega) : null;
    pedido.estado = 'en_envio';
    await pedido.save();
    return res.json({ mensaje: 'Repartidor asignado exitosamente', pedido });
  } catch (error) { return error500(res, 'Error interno al asignar repartidor', error); }
};

exports.aplicarDescuentos = async (req, res) => {
  if (!['admin', 'supervisor_ventas'].includes(rolUsuario(req))) return res.status(403).json({ mensaje: 'Acceso denegado. Solo administradores o supervisores de ventas pueden aplicar descuentos.' });
  try {
    const pedido = await Pedido.findByPk(req.params.id);
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    const monto = Number(req.body.montoDescuento);
    if (!Number.isFinite(monto) || monto < 0 || monto > Number(pedido.total)) return res.status(400).json({ mensaje: 'Monto de descuento inválido. No puede ser negativo o exceder el total del pedido.' });
    pedido.descuentos = monto;
    await pedido.save();
    return res.json({ mensaje: 'Descuentos aplicados exitosamente', pedido });
  } catch (error) { return error500(res, 'Error interno al aplicar descuentos', error); }
};
