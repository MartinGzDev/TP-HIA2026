const Rol = require('../models/rol');
const Usuario = require('../models/usuario');

exports.getRoles = async (req, res) => {
  try {
    const roles = await Rol.findAll({ order: [['nombre', 'ASC']] });
    return res.status(200).json(roles);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener roles.', error: error.message });
  }
};

exports.createRol = async (req, res) => {
  try {
    const { nombre, estado } = req.body;
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) return res.status(400).json({ mensaje: 'El nombre del rol es obligatorio y debe ser una cadena de texto válida.' });
    const nombreNormalizado = nombre.trim().toLowerCase();
    const existente = await Rol.findOne({ where: { nombre: nombreNormalizado } });
    if (existente) return res.status(400).json({ mensaje: `El rol '${nombreNormalizado}' ya existe.` });
    const rol = await Rol.create({ nombre: nombreNormalizado, estado: estado ?? true });
    return res.status(201).json({ mensaje: 'Rol creado exitosamente', rol });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ mensaje: 'El nombre de rol ya existe.' });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación.', detalle: error.errors.map(e => e.message) });
    console.error('Error al crear rol:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear el rol.', error: error.message });
  }
};

exports.getRolById = async (req, res) => {
  try {
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return res.status(404).json({ mensaje: 'Rol no encontrado.' });
    return res.status(200).json(rol);
  } catch (error) {
    console.error('Error al obtener rol por ID:', error);
    return res.status(400).json({ mensaje: 'ID de rol inválido.' });
  }
};

exports.updateRol = async (req, res) => {
  try {
    const { nombre, estado } = req.body;
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return res.status(404).json({ mensaje: 'Rol no encontrado.' });
    if (nombre !== undefined) {
      const nombreNormalizado = String(nombre).trim().toLowerCase();
      const existente = await Rol.findOne({ where: { nombre: nombreNormalizado } });
      if (existente && existente.id !== rol.id) return res.status(400).json({ mensaje: `El nombre de rol '${nombreNormalizado}' ya está en uso por otro rol.` });
      rol.nombre = nombreNormalizado;
    }
    if (estado !== undefined) rol.estado = estado;
    await rol.save();
    return res.status(200).json({ mensaje: 'Rol actualizado exitosamente', rol });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ mensaje: 'El nombre de rol ya existe.' });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación.', detalle: error.errors.map(e => e.message) });
    console.error('Error al actualizar rol:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el rol.', error: error.message });
  }
};

exports.deleteRol = async (req, res) => {
  try {
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return res.status(404).json({ mensaje: 'Rol no encontrado.' });
    const usuariosAsociados = await Usuario.count({ where: { rolId: rol.id } });
    if (usuariosAsociados > 0) return res.status(409).json({ mensaje: `No se puede eliminar el rol: tiene ${usuariosAsociados} usuarios asociados.` });
    await rol.destroy();
    return res.status(200).json({ mensaje: 'Rol eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el rol.', error: error.message });
  }
};
