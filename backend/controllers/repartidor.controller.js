const sequelize = require('../config/database');
const Repartidor = require('../models/Repartidor');
const Usuario = require('../models/usuario');
const Rol = require('../models/rol');
const Pedido = require('../models/pedido');

const usuarioInclude = { model: Usuario, as: 'usuario', attributes: ['id', 'username', 'email', 'nombre', 'apellido', 'telefono', 'rolId'], include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }] };
const actorId = req => req.usuario?.id ?? req.usuario?._id;
const propietario = (repartidor, req) => String(repartidor.usuarioId) === String(actorId(req));

exports.getRepartidores = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
    const where = {};
    if (req.query.usuarioId) where.usuarioId = req.query.usuarioId;
    const { count, rows } = await Repartidor.findAndCountAll({ where, include: [usuarioInclude], order: [['id', 'ASC']], limit, offset: (page - 1) * limit, distinct: true });
    const totalPaginas = Math.ceil(count / limit);
    return res.status(200).json({ repartidores: rows, paginacion: { total: count, pagina: page, limite: limit, totalPaginas, tieneSiguiente: page < totalPaginas, tieneAnterior: page > 1 } });
  } catch (error) { console.error('Error al obtener repartidores:', error); return res.status(500).json({ mensaje: 'Error interno del servidor al obtener repartidores.', error: error.message }); }
};

exports.createRepartidor = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { usuarioId, estado, vehiculo, numeroLicencia } = req.body;
    if (!usuarioId) { await transaction.rollback(); return res.status(400).json({ mensaje: 'El campo usuarioId es obligatorio para crear un perfil de repartidor.' }); }
    const usuario = await Usuario.findByPk(usuarioId, { include: [{ model: Rol, as: 'rol' }], transaction });
    if (!usuario) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Usuario no encontrado con el ID proporcionado.' }); }
    if (usuario.rol?.nombre !== 'repartidor') { await transaction.rollback(); return res.status(400).json({ mensaje: 'El usuario asociado debe tener el rol de "repartidor".' }); }
    const existente = await Repartidor.findOne({ where: { usuarioId }, transaction });
    if (existente) { await transaction.rollback(); return res.status(400).json({ mensaje: 'Ya existe un perfil de repartidor asociado a este usuario.' }); }
    const nuevo = await Repartidor.create({ usuarioId, estado: estado || 'disponible', vehiculo: vehiculo || '', numeroLicencia: numeroLicencia || '' }, { transaction });
    await transaction.commit();
    const resultado = await Repartidor.findByPk(nuevo.id, { include: [usuarioInclude] });
    return res.status(201).json({ mensaje: 'Perfil de repartidor creado exitosamente', repartidor: resultado });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error al crear perfil de repartidor:', error);
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación.', detalle: error.errors.map(e => e.message) });
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear el perfil de repartidor.', error: error.message });
  }
};

exports.getRepartidorById = async (req, res) => {
  try {
    const repartidor = await Repartidor.findByPk(req.params.id, { include: [usuarioInclude] });
    if (!repartidor) return res.status(404).json({ mensaje: 'Repartidor no encontrado.' });
    if (req.usuario?.rol === 'repartidor' && !propietario(repartidor, req)) return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para ver este perfil de repartidor.' });
    return res.status(200).json(repartidor);
  } catch (error) { console.error('Error al obtener repartidor por ID:', error); return res.status(400).json({ mensaje: 'ID de repartidor inválido.', error: error.message }); }
};

exports.updateRepartidor = async (req, res) => {
  try {
    const repartidor = await Repartidor.findByPk(req.params.id, { include: [usuarioInclude] });
    if (!repartidor) return res.status(404).json({ mensaje: 'Repartidor no encontrado.' });
    if (req.usuario?.rol === 'repartidor' && !propietario(repartidor, req)) return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para actualizar este perfil de repartidor.' });
    const updates = {};
    for (const key of ['estado', 'vehiculo', 'numeroLicencia']) if (req.body[key] !== undefined) updates[key] = req.body[key];
    if (req.body.ubicacionActual !== undefined) updates.ubicacionActual = { ...(repartidor.ubicacionActual || {}), ...req.body.ubicacionActual };
    await repartidor.update(updates, { validate: true });
    const resultado = await Repartidor.findByPk(repartidor.id, { include: [usuarioInclude] });
    return res.status(200).json({ mensaje: 'Repartidor actualizado exitosamente', repartidor: resultado });
  } catch (error) { console.error('Error al actualizar repartidor:', error); if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación.', detalle: error.errors.map(e => e.message) }); return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el repartidor.', error: error.message }); }
};

exports.updateRepartidorProfile = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const repartidor = await Repartidor.findByPk(req.params.id, { include: [{ model: Usuario, as: 'usuario' }], transaction });
    if (!repartidor) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Repartidor no encontrado.' }); }
    if (req.usuario?.rol === 'repartidor' && !propietario(repartidor, req)) { await transaction.rollback(); return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para actualizar este perfil.' }); }
    const userUpdates = {};
    for (const key of ['username', 'email', 'telefono', 'nombre', 'apellido']) if (req.body[key] !== undefined) userUpdates[key] = req.body[key];
    if (Object.keys(userUpdates).length) await repartidor.usuario.update(userUpdates, { transaction, validate: true });
    const updates = {};
    for (const key of ['vehiculo', 'numeroLicencia', 'estado']) if (req.body[key] !== undefined) updates[key] = req.body[key];
    if (Object.keys(updates).length) await repartidor.update(updates, { transaction, validate: true });
    await transaction.commit();
    const resultado = await Repartidor.findByPk(repartidor.id, { include: [usuarioInclude] });
    return res.status(200).json({ mensaje: 'Perfil actualizado exitosamente', repartidor: resultado });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error al actualizar perfil del repartidor:', error);
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'El username o email ya está en uso.' });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación.', detalle: error.errors.map(e => e.message) });
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el perfil.', error: error.message });
  }
};

exports.deleteRepartidor = async (req, res) => {
  try {
    const repartidor = await Repartidor.findByPk(req.params.id);
    if (!repartidor) return res.status(404).json({ mensaje: 'Repartidor no encontrado.' });
    const pedidosActivos = await Pedido.count({ where: { repartidorId: repartidor.id, estado: ['confirmado', 'en_preparacion', 'en_envio'] } });
    if (pedidosActivos) return res.status(409).json({ mensaje: 'No se puede eliminar un repartidor con pedidos activos.' });
    await repartidor.destroy();
    return res.status(200).json({ mensaje: 'Repartidor eliminado exitosamente' });
  } catch (error) { console.error('Error al eliminar repartidor:', error); return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el repartidor.', error: error.message }); }
};

exports.updateUbicacion = async (req, res) => {
  try {
    const { lat, lon } = req.body;
    if (lat === undefined || lon === undefined) return res.status(400).json({ mensaje: 'Latitud y longitud son obligatorias para actualizar la ubicación.' });
    const repartidor = await Repartidor.findByPk(req.params.id);
    if (!repartidor) return res.status(404).json({ mensaje: 'Repartidor no encontrado.' });
    if (req.usuario?.rol === 'repartidor' && !propietario(repartidor, req)) return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para actualizar la ubicación de otro repartidor.' });
    const ubicacion = { ...(repartidor.ubicacionActual || {}), lat: Number(lat), lon: Number(lon) };
    await repartidor.update({ ubicacionActual: ubicacion });
    return res.status(200).json({ mensaje: 'Ubicación actualizada exitosamente', ubicacion: repartidor.ubicacionActual });
  } catch (error) { console.error('Error al actualizar ubicación del repartidor:', error); return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar la ubicación.', error: error.message }); }
};

exports.cambiarEstadoRepartidor = async (req, res) => {
  try {
    const { estado } = req.body;
    const repartidor = await Repartidor.findByPk(req.params.id, { include: [usuarioInclude] });
    if (!repartidor) return res.status(404).json({ mensaje: 'Repartidor no encontrado.' });
    if (req.usuario?.rol === 'repartidor' && !propietario(repartidor, req)) return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para cambiar el estado de otro repartidor.' });
    const validos = ['disponible', 'en_entrega', 'fuera_de_servicio'];
    if (!validos.includes(estado)) return res.status(400).json({ mensaje: 'Estado de repartidor inválido.' });
    await repartidor.update({ estado, disponible: estado === 'disponible' });
    return res.status(200).json({ mensaje: 'Estado del repartidor actualizado exitosamente', repartidor });
  } catch (error) { console.error('Error al cambiar estado del repartidor:', error); return res.status(500).json({ mensaje: 'Error interno del servidor al cambiar el estado del repartidor.', error: error.message }); }
};

exports.registrarEntregaRepartidor = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { pedidoId, calificacionCliente, fechaEntrega } = req.body;
    const repartidor = await Repartidor.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!repartidor) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Repartidor no encontrado.' }); }
    const pedido = await Pedido.findByPk(pedidoId, { transaction });
    if (!pedido || Number(pedido.repartidorId) !== Number(repartidor.id)) { await transaction.rollback(); return res.status(404).json({ mensaje: 'El pedido no existe o no está asignado a este repartidor.' }); }
    if (pedido.estado !== 'entregado') { await transaction.rollback(); return res.status(400).json({ mensaje: 'Solo se pueden registrar entregas de pedidos entregados.' }); }
    const historial = Array.isArray(repartidor.historialEntregas) ? [...repartidor.historialEntregas] : [];
    if (historial.some(item => Number(item.pedidoId) === Number(pedidoId))) { await transaction.rollback(); return res.status(409).json({ mensaje: 'La entrega de este pedido ya fue registrada.' }); }
    if (calificacionCliente !== undefined && (Number(calificacionCliente) < 1 || Number(calificacionCliente) > 5)) { await transaction.rollback(); return res.status(400).json({ mensaje: 'La calificación debe estar entre 1 y 5.' }); }
    historial.push({ pedidoId: Number(pedidoId), fechaEntrega: fechaEntrega || new Date(), ...(calificacionCliente !== undefined ? { calificacionCliente: Number(calificacionCliente) } : {}) });
    const calificaciones = historial.filter(x => x.calificacionCliente !== undefined).map(x => Number(x.calificacionCliente));
    await repartidor.update({ historialEntregas: historial, ...(calificaciones.length ? { calificacionPromedio: calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length } : {}) }, { transaction });
    await transaction.commit();
    const resultado = await Repartidor.findByPk(repartidor.id, { include: [usuarioInclude] });
    return res.status(200).json({ mensaje: 'Entrega registrada exitosamente', repartidor: resultado });
  } catch (error) { if (!transaction.finished) await transaction.rollback(); console.error('Error al registrar entrega del repartidor:', error); return res.status(500).json({ mensaje: 'Error interno del servidor al registrar la entrega del repartidor.', error: error.message }); }
};

exports.getRepartidorByUsuarioId = async (req, res) => {
  try {
    const repartidor = await Repartidor.findOne({ where: { usuarioId: req.params.usuarioId }, include: [usuarioInclude] });
    if (!repartidor) return res.status(404).json({ mensaje: 'Perfil de repartidor no encontrado para el usuario dado.' });
    if (req.usuario?.rol === 'repartidor' && !propietario(repartidor, req)) return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para ver este perfil de repartidor.' });
    return res.status(200).json(repartidor);
  } catch (error) { console.error('Error al obtener repartidor por usuarioId:', error); return res.status(400).json({ mensaje: 'ID de usuario inválido.', error: error.message }); }
};
