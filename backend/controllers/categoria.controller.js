const { Op } = require('sequelize');
const Categoria = require('../models/categoria.model');
const Producto = require('../models/producto');

exports.crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, imagen, estado } = req.body;
    const categoria = await Categoria.create({ nombre, descripcion, imagen, estado: estado ?? true });
    return res.status(201).json({ mensaje: 'Categoría creada exitosamente.', categoria });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'Ya existe una categoría con este nombre.' });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación al crear la categoría.', detalle: error.errors.map(e => e.message) });
    console.error('Error al crear la categoría:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear la categoría.', error: error.message });
  }
};

exports.obtenerCategorias = async (req, res) => {
  try {
    const where = {};

    if (req.query.estado !== undefined) {
      where.estado = req.query.estado === 'true';
    }

    const categorias = await Categoria.findAll({
      where,
      order: [['nombre', 'ASC']]
    });

    const resultado = categorias.map(categoria => {
      const data = categoria.toJSON();

      return {
        ...data,
        _id: data.id
      };
    });

    return res.status(200).json(resultado);

  } catch (error) {
    console.error('Error al obtener categorías:', error);

    return res.status(500).json({
      mensaje: 'Error interno del servidor al obtener categorías.',
      error: error.message
    });
  }
};

exports.obtenerCategoriaPorId = async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ mensaje: 'Categoría no encontrada.' });
    return res.status(200).json(categoria);
  } catch (error) {
    if (error.name === 'SequelizeDatabaseError' || error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'ID de categoría inválido.' });
    console.error('Error al obtener categoría por ID:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener categoría.', error: error.message });
  }
};

exports.actualizarCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ mensaje: 'Categoría no encontrada para actualizar.' });
    await categoria.update(req.body, { validate: true });
    return res.status(200).json({ mensaje: 'Categoría actualizada exitosamente.', categoria });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'Ya existe otra categoría con el nombre proporcionado.' });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación al actualizar la categoría.', detalle: error.errors.map(e => e.message) });
    console.error('Error al actualizar la categoría:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar categoría.', error: error.message });
  }
};

exports.eliminarCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ mensaje: 'Categoría no encontrada para eliminar.' });
    const productosAsociados = await Producto.count({ where: { categoriaId: categoria.id } });
    if (productosAsociados > 0) return res.status(400).json({ mensaje: `No se puede eliminar. Hay ${productosAsociados} productos asociados.`, sugerencia: 'Reasigne los productos a otra categoría primero.' });
    if (categoria.estado) return res.status(400).json({ mensaje: 'No se puede eliminar una categoría activa.', sugerencia: 'Desactive la categoría primero, luego elimínela.' });
    await categoria.destroy();
    return res.status(200).json({ mensaje: 'Categoría eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar la categoría:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar categoría.', error: error.message });
  }
};

exports.obtenerProductosDeCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ mensaje: 'Categoría no encontrada.' });
    const productos = await Producto.findAll({ where: { categoriaId: categoria.id, disponible: true }, order: [['nombre', 'ASC']] });
    return res.status(200).json({ mensaje: `Productos de la categoría "${categoria.nombre}" (${productos.length} encontrados).`, productos });
  } catch (error) {
    console.error('Error al obtener productos de la categoría:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener productos de la categoría.', error: error.message });
  }
};

exports.activarCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ mensaje: 'Categoría no encontrada.' });
    await categoria.update({ estado: true });
    return res.status(200).json({ mensaje: 'Categoría activada exitosamente.', categoria });
  } catch (error) {
    console.error('Error al activar la categoría:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al activar la categoría.', error: error.message });
  }
};

exports.desactivarCategoria = async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ mensaje: 'Categoría no encontrada.' });
    const productosAsociados = await Producto.count({ where: { categoriaId: categoria.id } });
    if (productosAsociados > 0) return res.status(400).json({ mensaje: `No se puede desactivar. Hay ${productosAsociados} productos asociados.`, sugerencia: 'Reasigne los productos a otra categoría primero.' });
    await categoria.update({ estado: false });
    return res.status(200).json({ mensaje: 'Categoría desactivada exitosamente.', categoria });
  } catch (error) {
    console.error('Error al desactivar la categoría:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al desactivar la categoría.', error: error.message });
  }
};
