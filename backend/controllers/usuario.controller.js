const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('../models/usuario');
const Rol = require('../models/rol');
const Cliente = require('../models/cliente.model');
const Repartidor = require('../models/Repartidor');
const bcrypt = require('bcryptjs');

const profileIncludes = [
  { model: Rol, as: 'rol', attributes: ['id', 'nombre'] },
  { model: Cliente, as: 'clientePerfil', attributes: ['id', 'direccion', 'fechaNacimiento', 'preferenciasAlimentarias', 'puntos'], required: false },
  { model: Repartidor, as: 'repartidorPerfil', attributes: ['id', 'estado', 'vehiculo', 'numeroLicencia', 'ubicacionActual', 'calificacionPromedio', 'disponible'], required: false }
];
const actorId = req => req.usuario?.id ?? req.usuario?._id;
const actorPuedeAcceder = (req, usuario) => req.usuario?.rol === 'admin' || String(actorId(req)) === String(usuario.id);

exports.getUsuarios = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
    const where = {};
    if (req.query.rolId) where.rolId = req.query.rolId;
    const { count, rows } = await Usuario.findAndCountAll({ where, attributes: { exclude: ['password'] }, include: profileIncludes, order: [['id', 'ASC']], limit, offset: (page - 1) * limit, distinct: true });
    const totalPaginas = Math.ceil(count / limit);
    return res.status(200).json({ usuarios: rows, paginacion: { total: count, pagina: page, limite: limit, totalPaginas, tieneSiguiente: page < totalPaginas, tieneAnterior: page > 1 } });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener usuarios.', error: error.message });
  }
};

exports.getUsuarioById = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, { attributes: { exclude: ['password'] }, include: profileIncludes });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    if (req.usuario && !actorPuedeAcceder(req, usuario)) return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para ver este perfil de usuario.' });
    return res.status(200).json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    return res.status(400).json({ mensaje: 'ID de usuario inválido o error al consultar usuario.', error: error.message });
  }
};

exports.updateUsuario = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { username, email, nombre, apellido, telefono, estado, direccionCliente, fechaNacimientoCliente, preferenciasAlimentariasCliente, puntosCliente, vehiculoRepartidor, numeroLicenciaRepartidor } = req.body;
    const usuario = await Usuario.findByPk(req.params.id, { include: [{ model: Rol, as: 'rol' }], transaction, lock: transaction.LOCK.UPDATE });
    if (!usuario) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Usuario no encontrado.' }); }
    if (req.usuario && !actorPuedeAcceder(req, usuario)) { await transaction.rollback(); return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para actualizar este perfil de usuario.' }); }
    const updates = {};
    for (const key of ['username', 'email', 'nombre', 'apellido', 'telefono', 'estado']) if (req.body[key] !== undefined) updates[key] = req.body[key];
    if (Object.keys(updates).length) await usuario.update(updates, { transaction, validate: true });
    if (usuario.rol?.nombre === 'cliente') {
      const perfil = await Cliente.findOne({ where: { usuarioId: usuario.id }, transaction });
      if (perfil) {
        const data = {};
        for (const [source, target] of [['direccionCliente', 'direccion'], ['fechaNacimientoCliente', 'fechaNacimiento'], ['preferenciasAlimentariasCliente', 'preferenciasAlimentarias'], ['puntosCliente', 'puntos']]) if (req.body[source] !== undefined) data[target] = req.body[source];
        if (Object.keys(data).length) await perfil.update(data, { transaction, validate: true });
      }
    } else if (usuario.rol?.nombre === 'repartidor') {
      const perfil = await Repartidor.findOne({ where: { usuarioId: usuario.id }, transaction });
      if (perfil) {
        const data = {};
        if (vehiculoRepartidor !== undefined) data.vehiculo = vehiculoRepartidor;
        if (numeroLicenciaRepartidor !== undefined) data.numeroLicencia = numeroLicenciaRepartidor;
        if (Object.keys(data).length) await perfil.update(data, { transaction, validate: true });
      }
    }
    await transaction.commit();
    const actualizado = await Usuario.findByPk(usuario.id, { attributes: { exclude: ['password'] }, include: profileIncludes });
    return res.status(200).json({ mensaje: 'Usuario y perfil(es) actualizado(s) exitosamente', usuario: actualizado });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error al actualizar usuario:', error);
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'El username o email ya está en uso.' });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación: ' + error.errors.map(e => e.message).join(', ') });
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el usuario.', error: error.message });
  }
};

exports.deleteUsuario = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    if (req.usuario && req.usuario.rol !== 'admin') { await transaction.rollback(); return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para eliminar usuarios.' }); }
    const usuario = await Usuario.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!usuario) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Usuario no encontrado.' }); }
    await Cliente.destroy({ where: { usuarioId: usuario.id }, transaction });
    await Repartidor.destroy({ where: { usuarioId: usuario.id }, transaction });
    await usuario.destroy({ transaction });
    await transaction.commit();
    return res.status(200).json({ mensaje: 'Usuario y perfiles asociados eliminados exitosamente.' });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el usuario.', error: error.message });
  }
};
