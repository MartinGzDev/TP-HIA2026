const { Op } = require('sequelize');
const { Calificacion, Pedido, Cliente, Producto, Repartidor } = require('../models');
const uid = req => req.usuario?.id ?? req.usuario?._id;
const clienteUsuario = usuarioId => Cliente.findOne({ where: { usuarioId } });
const includes = [{ model: Pedido, as: 'pedido', attributes: ['id', 'fechaPedido', 'estado', 'repartidorId'] }, { model: Cliente, as: 'cliente', include: [{ model: require('../models/usuario'), as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'email'] }] }];
const pageOptions = req => ({ page: Math.max(1, parseInt(req.query.page, 10) || 1), limit: Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50)) });
const paginated = (rows, count, page, limit) => ({ calificaciones: rows, paginacion: { total: count, pagina: page, limite: limit, totalPaginas: Math.ceil(count / limit), tieneSiguiente: page < Math.ceil(count / limit), tieneAnterior: page > 1 } });
const serverError = (res, message, error) => res.status(500).json({ mensaje: message, error: error.message });

exports.crearCalificacion = async (req, res) => {
  try {
    if (req.usuario.rol !== 'cliente') return res.status(403).json({ mensaje: 'Solo los clientes pueden crear calificaciones.' });
    const { pedidoId, puntuacionComida, puntuacionServicio, puntuacionEntrega, comentario, calificacionProductos = [] } = req.body;
    const cliente = await clienteUsuario(uid(req));
    if (!cliente) return res.status(404).json({ mensaje: 'Perfil de cliente no encontrado.' });
    const pedido = await Pedido.findByPk(pedidoId);
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado.' });
    if (pedido.estado !== 'entregado') return res.status(400).json({ mensaje: 'Solo se pueden calificar pedidos que ya han sido entregados.' });
    if (Number(pedido.clienteId) !== Number(cliente.id)) return res.status(403).json({ mensaje: 'No tiene permiso para calificar este pedido.' });
    if (await Calificacion.findOne({ where: { pedidoId } })) return res.status(409).json({ mensaje: 'Este pedido ya ha sido calificado.' });
    if (!Array.isArray(calificacionProductos)) return res.status(400).json({ mensaje: 'calificacionProductos debe ser un array.' });
    const productosPedido = pedido.detalleProductos || [];
    const detalleCalificado = [];
    for (const item of calificacionProductos) {
      const comprado = productosPedido.find(p => String(p.productoId) === String(item.productoId));
      if (!comprado) return res.status(400).json({ mensaje: `El producto con ID ${item.productoId} no es parte de este pedido.` });
      const producto = await Producto.findByPk(item.productoId);
      const puntuacion = Number(item.puntuacion);
      if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) return res.status(400).json({ mensaje: 'La puntuación de cada producto debe estar entre 1 y 5.' });
      detalleCalificado.push({ productoId: Number(item.productoId), nombreProducto: producto?.nombre || comprado.nombreProducto || 'Producto', puntuacion, comentario: item.comentario || '' });
    }
    const calificacion = await Calificacion.create({ pedidoId, clienteId: cliente.id, puntuacionComida, puntuacionServicio, puntuacionEntrega, comentario, calificacionProductos: detalleCalificado });
    if (pedido.repartidorId) {
      const repartidor = await Repartidor.findByPk(pedido.repartidorId);
      if (repartidor) {
        const historial = [...(repartidor.historialEntregas || [])];
        const index = historial.findIndex(x => String(x.pedidoId) === String(pedido.id));
        const entrega = { pedidoId: pedido.id, fechaEntrega: new Date(), calificacionCliente: Number(puntuacionEntrega) };
        if (index >= 0) historial[index] = { ...historial[index], ...entrega }; else historial.push(entrega);
        repartidor.historialEntregas = historial;
        const scores = historial.map(x => Number(x.calificacionCliente)).filter(x => Number.isFinite(x) && x >= 1 && x <= 5);
        repartidor.calificacionPromedio = scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : 0;
        await repartidor.save();
      }
    }
    return res.status(201).json({ mensaje: 'Calificación creada exitosamente', calificacion });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'Este pedido ya ha sido calificado.' });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Datos de calificación inválidos.', error: error.message });
    return serverError(res, 'Error interno del servidor al crear la calificación', error);
  }
};

exports.obtenerCalificaciones = async (req, res) => {
  try {
    let where = {};
    if (req.usuario.rol !== 'admin') {
      if (req.usuario.rol !== 'cliente') return res.status(403).json({ mensaje: 'No tiene permisos para consultar calificaciones.' });
      const cliente = await clienteUsuario(uid(req));
      if (!cliente) return res.status(404).json({ mensaje: 'Perfil de cliente no encontrado.' });
      where.clienteId = cliente.id;
    }
    const { page, limit } = pageOptions(req);
    const result = await Calificacion.findAndCountAll({ where, include: req.usuario.rol === 'admin' ? includes : [includes[0]], order: [['fechaCalificacion','DESC']], limit, offset: (page-1)*limit, distinct: true });
    return res.json({ ...paginated(result.rows, result.count, page, limit) });
  } catch (error) { return serverError(res, 'Error interno del servidor al obtener calificaciones', error); }
};

exports.obtenerCalificacionPorId = async (req, res) => {
  try {
    const calificacion = await Calificacion.findByPk(req.params.id, { include: includes });
    if (!calificacion) return res.status(404).json({ mensaje: 'Calificación no encontrada' });
    if (req.usuario.rol === 'cliente') { const cliente = await clienteUsuario(uid(req)); if (!cliente || Number(calificacion.clienteId) !== Number(cliente.id)) return res.status(403).json({ mensaje: 'No tienes permisos para ver esta calificación' }); }
    return res.json(calificacion);
  } catch (error) { return serverError(res, 'Error interno del servidor al obtener calificación', error); }
};

exports.eliminarCalificacion = async (req, res) => {
  try {
    const cliente = await clienteUsuario(uid(req));
    if (!cliente) return res.status(404).json({ mensaje: 'Perfil de cliente no encontrado.' });
    const calificacion = await Calificacion.findByPk(req.params.id);
    if (!calificacion) return res.status(404).json({ mensaje: 'Calificación no encontrada' });
    if (Number(calificacion.clienteId) !== Number(cliente.id) && req.usuario.rol !== 'admin') return res.status(403).json({ mensaje: 'No tienes permisos para eliminar esta calificación' });
    await calificacion.destroy();
    return res.json({ mensaje: 'Calificación eliminada exitosamente' });
  } catch (error) { return serverError(res, 'Error interno del servidor al eliminar la calificación', error); }
};

exports.getCalificacionesPorCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    if (req.usuario.rol === 'cliente') { const cliente = await clienteUsuario(uid(req)); if (!cliente || Number(cliente.id) !== Number(clienteId)) return res.status(403).json({ mensaje: 'No tienes permisos para ver las calificaciones de otro cliente' }); }
    else if (req.usuario.rol !== 'admin') return res.status(403).json({ mensaje: 'No tiene permisos para consultar calificaciones.' });
    const { page, limit } = pageOptions(req);
    const result = await Calificacion.findAndCountAll({ where: { clienteId }, include: [includes[0]], order: [['fechaCalificacion','DESC']], limit, offset: (page-1)*limit, distinct: true });
    return res.json(paginated(result.rows, result.count, page, limit));
  } catch (error) { return serverError(res, 'Error interno del servidor al obtener calificaciones por cliente', error); }
};

exports.getCalificacionesPorPedido = async (req, res) => {
  try {
    const calificacion = await Calificacion.findOne({ where: { pedidoId: req.params.pedidoId }, include: includes });
    if (!calificacion) return res.status(404).json({ mensaje: 'No se encontró calificación para este pedido.' });
    if (req.usuario.rol === 'cliente') { const cliente = await clienteUsuario(uid(req)); if (!cliente || Number(calificacion.clienteId) !== Number(cliente.id)) return res.status(403).json({ mensaje: 'No tienes permisos para ver esta calificación' }); }
    return res.json(calificacion);
  } catch (error) { return serverError(res, 'Error interno del servidor al obtener calificación por pedido', error); }
};

exports.getCalificacionesPorRepartidor = async (req, res) => {
  try {
    const repartidor = await Repartidor.findByPk(req.params.repartidorId);
    if (!repartidor) return res.status(404).json({ mensaje: 'Repartidor no encontrado.' });
    if (req.usuario.rol === 'repartidor' && Number(repartidor.usuarioId) !== Number(uid(req))) return res.status(403).json({ mensaje: 'No tienes permisos para ver las calificaciones de otro repartidor.' });
    if (!['admin','repartidor'].includes(req.usuario.rol)) return res.status(403).json({ mensaje: 'Acceso denegado.' });
    const pedidos = await Pedido.findAll({ where: { repartidorId: repartidor.id, estado: 'entregado' }, attributes: ['id'] });
    const { page, limit } = pageOptions(req);
    const result = await Calificacion.findAndCountAll({ where: { pedidoId: { [Op.in]: pedidos.map(p => p.id) } }, include: includes, order: [['fechaCalificacion','DESC']], limit, offset: (page-1)*limit, distinct: true });
    const rows = result.rows.map(c => ({ id: c.id, _id: c.id, pedidoId: c.pedido, clienteId: c.cliente, puntuacionEntrega: c.puntuacionEntrega, comentario: c.comentario, fechaCalificacion: c.fechaCalificacion }));
    return res.json({ repartidor: { id: repartidor.id, _id: repartidor.id, calificacionPromedio: repartidor.calificacionPromedio, totalEntregas: (repartidor.historialEntregas || []).length }, calificaciones: rows, totalCalificaciones: result.count, paginacion: { total: result.count, pagina: page, limite: limit, totalPaginas: Math.ceil(result.count/limit), tieneSiguiente: page < Math.ceil(result.count/limit), tieneAnterior: page > 1 } });
  } catch (error) { return serverError(res, 'Error interno del servidor al obtener calificaciones por repartidor', error); }
};

exports.getCalificacionesPromedioProducto = async (req, res) => {
  try {
    const registros = await Calificacion.findAll({ attributes: ['calificacionProductos'], raw: true });
    const scores = []; let nombreProducto = null;
    for (const row of registros) for (const item of (row.calificacionProductos || [])) if (String(item.productoId) === String(req.params.productoId)) { scores.push(Number(item.puntuacion)); nombreProducto = item.nombreProducto || nombreProducto; }
    if (!scores.length) return res.status(404).json({ mensaje: 'Producto no encontrado o sin calificaciones.' });
    return res.json({ _id: req.params.productoId, nombreProducto, puntuacionPromedio: scores.reduce((a,b)=>a+b,0)/scores.length, totalCalificaciones: scores.length });
  } catch (error) { return serverError(res, 'Error interno del servidor al obtener calificaciones promedio por producto', error); }
};
