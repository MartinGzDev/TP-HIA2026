const { Op } = require('sequelize');
const Combo = require('../models/Combo');
const Producto = require('../models/producto');

async function validarProductos(ids) {
  const productos = await Producto.findAll({ where: { id: { [Op.in]: ids } } });
  if (productos.length !== ids.length) return { error: 'not_found' };
  const noDisponibles = productos.filter(p => !p.disponible || p.stock <= 0);
  if (noDisponibles.length) return { error: 'unavailable', productos: noDisponibles.map(p => ({ id: p.id, nombre: p.nombre })) };
  return { productos };
}

exports.crearCombo = async (req, res) => {
  try {
    const { nombre, descripcion, productosIds, descuento = 0, imagen, activo } = req.body;
    if (!Array.isArray(productosIds) || !productosIds.length) return res.status(400).json({ mensaje: 'El combo debe contener al menos un producto.' });
    const validacion = await validarProductos(productosIds);
    if (validacion.error === 'not_found') return res.status(404).json({ mensaje: 'Uno o más productos no fueron encontrados o no son válidos.' });
    if (validacion.error === 'unavailable') return res.status(400).json({ mensaje: 'Algunos productos en el combo no están disponibles o no tienen stock.', productosNoDisponibles: validacion.productos });
    const precioCombo = validacion.productos.reduce((sum, p) => sum + Number(p.precio), 0);
    const descuentoFinal = Math.min(100, Math.max(0, Number(descuento) || 0));
    const combo = await Combo.create({ nombre, descripcion, productosIds, precioCombo, descuento: descuentoFinal, precioFinal: precioCombo * (1 - descuentoFinal / 100), imagen, activo: activo ?? true });
    return res.status(201).json({ mensaje: 'Combo creado exitosamente.', combo });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'Ya existe un combo con este nombre.' });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación al crear el combo.', detalle: error.errors.map(e => e.message) });
    console.error('Error al crear el combo:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear el combo.', error: error.message });
  }
};

exports.listarCombos = async (req, res) => {
  try {
    const where = {};
    if (req.query.activo !== undefined) where.activo = req.query.activo === 'true';
    const combos = await Combo.findAll({ where, order: [['nombre', 'ASC']] });
    return res.status(200).json(combos);
  } catch (error) {
    console.error('Error al listar combos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al listar combos.', error: error.message });
  }
};

exports.obtenerComboByID = async (req, res) => {
  try {
    const combo = await Combo.findByPk(req.params.id);
    if (!combo) return res.status(404).json({ mensaje: 'Combo no encontrado.' });
    const productos = await Producto.findAll({ where: { id: { [Op.in]: combo.productosIds || [] } }, include: [{ association: 'categoria', required: false }] });
    return res.status(200).json({ combo, productos });
  } catch (error) {
    console.error('Error al obtener combo por ID:', error);
    return res.status(400).json({ mensaje: 'ID de combo inválido o error al obtener combo.', error: error.message });
  }
};

exports.actualizarCombo = async (req, res) => {
  try {
    const combo = await Combo.findByPk(req.params.id);
    if (!combo) return res.status(404).json({ mensaje: 'Combo no encontrado para actualizar.' });
    const updates = { ...req.body };
    if (updates.productosIds !== undefined) {
      if (!Array.isArray(updates.productosIds) || !updates.productosIds.length) return res.status(400).json({ mensaje: 'El combo debe contener al menos un producto.' });
      const validacion = await validarProductos(updates.productosIds);
      if (validacion.error === 'not_found') return res.status(404).json({ mensaje: 'Uno o más productos no fueron encontrados o no son válidos.' });
      if (validacion.error === 'unavailable') return res.status(400).json({ mensaje: 'Algunos productos en la actualización del combo no están disponibles o no tienen stock.', productosNoDisponibles: validacion.productos });
      updates.precioCombo = validacion.productos.reduce((sum, p) => sum + Number(p.precio), 0);
    }
    const precioBase = updates.precioCombo !== undefined ? Number(updates.precioCombo) : Number(combo.precioCombo);
    if (updates.descuento !== undefined || updates.productosIds !== undefined || updates.precioCombo !== undefined) {
      updates.descuento = Math.min(100, Math.max(0, Number(updates.descuento ?? combo.descuento) || 0));
      updates.precioFinal = precioBase * (1 - updates.descuento / 100);
    }
    await combo.update(updates, { validate: true });
    return res.status(200).json({ mensaje: 'Combo actualizado exitosamente.', combo });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'Ya existe otro combo con el nombre proporcionado.' });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación al actualizar el combo.', detalle: error.errors.map(e => e.message) });
    console.error('Error al actualizar el combo:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el combo.', error: error.message });
  }
};

exports.eliminarCombo = async (req, res) => {
  try {
    const combo = await Combo.findByPk(req.params.id);
    if (!combo) return res.status(404).json({ mensaje: 'Combo no encontrado para eliminar.' });
    await combo.destroy();
    return res.status(200).json({ mensaje: 'Combo eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar el combo:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el combo.', error: error.message });
  }
};

exports.activarCombo = async (req, res) => {
  try {
    const combo = await Combo.findByPk(req.params.id);
    if (!combo) return res.status(404).json({ mensaje: 'Combo no encontrado.' });
    if (!combo.activo) await combo.update({ activo: true });
    return res.status(200).json({ mensaje: combo.changed() ? 'Combo activado exitosamente.' : 'El combo ya está activo.', combo });
  } catch (error) {
    console.error('Error al activar combo:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al activar combo.', error: error.message });
  }
};

exports.desactivarCombo = async (req, res) => {
  try {
    const combo = await Combo.findByPk(req.params.id);
    if (!combo) return res.status(404).json({ mensaje: 'Combo no encontrado.' });
    if (combo.activo) await combo.update({ activo: false });
    return res.status(200).json({ mensaje: 'Combo desactivado exitosamente.', combo });
  } catch (error) {
    console.error('Error al desactivar combo:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al desactivar combo.', error: error.message });
  }
};
