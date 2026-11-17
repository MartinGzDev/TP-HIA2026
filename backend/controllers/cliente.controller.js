const { Op } = require('sequelize');
const Cliente = require('../models/cliente.model');
const Usuario = require('../models/usuario');
const Rol = require('../models/rol');
const bcrypt = require('bcryptjs');

const usuarioInclude = { model: Usuario, as: 'usuario', attributes: ['id', 'username', 'email', 'nombre', 'apellido', 'telefono', 'rolId'], include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }] };
const autenticadoId = req => req.usuario?.id ?? req.usuario?._id;
const esPropietario = (cliente, req) => String(cliente.usuarioId) === String(autenticadoId(req));

exports.getClientes = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
    const { count, rows } = await Cliente.findAndCountAll({ include: [usuarioInclude], order: [['id', 'ASC']], limit, offset: (page - 1) * limit });
    const totalPaginas = Math.ceil(count / limit);
    return res.status(200).json({ clientes: rows, paginacion: { total: count, pagina: page, limite: limit, totalPaginas, tieneSiguiente: page < totalPaginas, tieneAnterior: page > 1 } });
  } catch (error) {
    console.error('ClienteController.getClientes:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener clientes.', error: error.message });
  }
};

exports.createCliente = async (req, res) => {
  const transaction = await require('../config/database').transaction();
  try {
    const { usuarioId, direccion, fechaNacimiento, preferenciasAlimentarias, puntos } = req.body;
    if (!usuarioId || !direccion) { await transaction.rollback(); return res.status(400).json({ mensaje: 'El usuarioId y la dirección son obligatorios para crear un perfil de cliente.' }); }
    const usuario = await Usuario.findByPk(usuarioId, { include: [{ model: Rol, as: 'rol' }], transaction });
    if (!usuario) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Usuario no encontrado con el ID proporcionado.' }); }
    if (usuario.rol?.nombre !== 'cliente') { await transaction.rollback(); return res.status(400).json({ mensaje: 'El usuario asociado debe tener el rol de "cliente".' }); }
    const existente = await Cliente.findOne({ where: { usuarioId }, transaction });
    if (existente) { await transaction.rollback(); return res.status(400).json({ mensaje: 'Ya existe un perfil de cliente asociado a este usuario.' }); }
    const cliente = await Cliente.create({ usuarioId, direccion, fechaNacimiento: fechaNacimiento || null, preferenciasAlimentarias: preferenciasAlimentarias || [], puntos: puntos ?? 0 }, { transaction });
    await transaction.commit();
    const resultado = await Cliente.findByPk(cliente.id, { include: [usuarioInclude] });
    return res.status(201).json({ mensaje: 'Perfil de cliente creado exitosamente', cliente: resultado });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('ClienteController.createCliente:', error);
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación.', detalle: error.errors.map(e => e.message) });
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear el perfil de cliente.', error: error.message });
  }
};

exports.getClienteById = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id, { include: [usuarioInclude] });
    if (!cliente) return res.status(404).json({ mensaje: 'Perfil de cliente no encontrado.' });
    if (req.usuario?.rol === 'cliente' && !esPropietario(cliente, req)) return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para ver este perfil de cliente.' });
    return res.status(200).json(cliente);
  } catch (error) {
    console.error('ClienteController.getClienteById:', error);
    return res.status(400).json({ mensaje: 'ID de cliente inválido o error al obtener el perfil.', error: error.message });
  }
};

exports.updateCliente = async (req, res) => {
  const transaction = await require('../config/database').transaction();
  try {
    const { direccion, fechaNacimiento, preferenciasAlimentarias, puntos, username, email, telefono, nombre, apellido } = req.body;
    const cliente = await Cliente.findByPk(req.params.id, { include: [{ model: Usuario, as: 'usuario' }], transaction });
    if (!cliente) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Perfil de cliente no encontrado.' }); }
    if (req.usuario?.rol === 'cliente' && !esPropietario(cliente, req)) { await transaction.rollback(); return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para actualizar este perfil de cliente.' }); }
    const updates = {};
    for (const key of ['direccion', 'fechaNacimiento', 'preferenciasAlimentarias', 'puntos']) if (req.body[key] !== undefined) updates[key] = req.body[key];
    await cliente.update(updates, { transaction, validate: true });
    const userUpdates = {};
    for (const key of ['username', 'email', 'telefono', 'nombre', 'apellido']) if (req.body[key] !== undefined) userUpdates[key] = req.body[key];
    if (Object.keys(userUpdates).length) await cliente.usuario.update(userUpdates, { transaction, validate: true });
    await transaction.commit();
    const resultado = await Cliente.findByPk(cliente.id, { include: [usuarioInclude] });
    return res.status(200).json({ mensaje: 'Perfil de cliente actualizado exitosamente', cliente: resultado });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('ClienteController.updateCliente:', error);
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación.', detalle: error.errors.map(e => e.message) });
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'El nombre de usuario o email ya está en uso.' });
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el perfil de cliente.', error: error.message });
  }
};

exports.deleteCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ mensaje: 'Perfil de cliente no encontrado.' });
    await cliente.destroy();
    return res.status(200).json({ mensaje: 'Perfil de cliente eliminado exitosamente' });
  } catch (error) {
    console.error('ClienteController.deleteCliente:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el perfil de cliente.', error: error.message });
  }
};

exports.getClienteByUsuarioId = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({ where: { usuarioId: req.params.usuarioId }, include: [usuarioInclude] });
    if (!cliente) return res.status(404).json({ mensaje: 'Perfil de cliente no encontrado para este usuario.' });
    if (req.usuario?.rol === 'cliente' && !esPropietario(cliente, req)) return res.status(403).json({ mensaje: 'Acceso denegado. No tienes permiso para ver este perfil de cliente.' });
    return res.status(200).json(cliente);
  } catch (error) {
    console.error('ClienteController.getClienteByUsuarioId:', error);
    return res.status(400).json({ mensaje: 'ID de usuario inválido o error al obtener el perfil.', error: error.message });
  }
};

exports.cambiarPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!newPassword || !confirmPassword) return res.status(400).json({ mensaje: 'La nueva contraseña y la confirmación son obligatorias.' });
    if (newPassword !== confirmPassword) return res.status(400).json({ mensaje: 'La nueva contraseña y la confirmación no coinciden.' });
    if (newPassword.length < 6) return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    const cliente = await Cliente.findByPk(req.params.id, { include: [{ model: Usuario, as: 'usuario' }] });
    if (!cliente) return res.status(404).json({ mensaje: 'Perfil de cliente no encontrado.' });
    const usuario = cliente.usuario;
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario asociado no encontrado.' });
    if (req.usuario?.rol === 'cliente' && !esPropietario(cliente, req)) return res.status(403).json({ mensaje: 'Acceso denegado.' });
    if (usuario.googleId) return res.status(400).json({ mensaje: 'No puedes cambiar la contraseña de una cuenta de Google.' });
    if (req.usuario?.rol !== 'admin') {
      if (!currentPassword) return res.status(400).json({ mensaje: 'Debes ingresar la contraseña actual.' });
      if (!await bcrypt.compare(currentPassword, usuario.password || '')) return res.status(400).json({ mensaje: 'La contraseña actual es incorrecta.' });
    }
    await usuario.update({ password: await bcrypt.hash(newPassword, 10) });
    return res.json({ mensaje: 'Contraseña actualizada exitosamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(500).json({ mensaje: 'Error al cambiar la contraseña.', error: error.message });
  }
};
