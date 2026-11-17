const { Op } = require('sequelize');
const Producto = require('../models/producto');
const Categoria = require('../models/categoria.model');

const categoriaInclude = { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'descripcion'], required: false };

exports.getProducts = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
    const offset = (page - 1) * limit;
    const { count, rows } = await Producto.findAndCountAll({
      attributes: ['id', 'nombre', 'descripcion', 'precio', 'categoriaId', 'stock', 'disponible', 'popularidad', 'imagen'],
      include: [categoriaInclude],
      order: [['nombre', 'ASC']], limit, offset
    });
    const totalPaginas = Math.ceil(count / limit);
    return res.status(200).json({ productos: rows, paginacion: { total: count, pagina: page, limite: limit, totalPaginas, tieneSiguiente: page < totalPaginas, tieneAnterior: page > 1 } });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener productos.', error: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Producto.findByPk(req.params.id, { include: [categoriaInclude] });
    if (!product) return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    return res.status(200).json({ ...product.toJSON(), _id: product.id, imagen: product.imagen || null });
  } catch (error) {
    console.error('Error al obtener producto por ID:', error);
    return res.status(400).json({ mensaje: 'ID de producto inválido.' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoriaId, imagen, disponible, stock, popularidad } = req.body;
    if (!nombre || precio === undefined || !categoriaId || stock === undefined) return res.status(400).json({ mensaje: 'Nombre, precio, categoría y stock son campos requeridos.' });
    const categoria = await Categoria.findByPk(categoriaId);
    if (!categoria) return res.status(404).json({ mensaje: 'La categoría especificada no existe.' });
    const product = await Producto.create({ nombre, descripcion, precio, categoriaId: categoria.id, imagen, disponible: disponible ?? Number(stock) > 0, stock, popularidad: popularidad ?? 0 });
    const productWithCategory = await Producto.findByPk(product.id, { include: [categoriaInclude] });
    return res.status(201).json({ mensaje: 'Producto creado exitosamente.', product: productWithCategory });
  } catch (error) {
    console.error('Error al crear producto:', error);
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Errores de validación.', errores: error.errors.map(e => e.message) });
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'Ya existe un producto con ese nombre.' });
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear el producto.', error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Producto.findByPk(req.params.id);
    if (!product) return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    const { nombre, descripcion, precio, categoriaId, imagen, disponible, stock, popularidad } = req.body;
    const updates = {};
    for (const key of ['nombre', 'descripcion', 'precio', 'imagen', 'stock', 'popularidad', 'disponible']) if (req.body[key] !== undefined) updates[key] = req.body[key];
    if (categoriaId !== undefined) {
      const categoria = await Categoria.findByPk(categoriaId);
      if (!categoria) return res.status(404).json({ mensaje: 'La categoría especificada no existe.' });
      updates.categoriaId = categoria.id;
    }
    if (stock !== undefined && disponible === undefined) updates.disponible = Number(stock) > 0;
    await product.update(updates, { validate: true });
    const updatedProduct = await Producto.findByPk(product.id, { include: [categoriaInclude] });
    return res.status(200).json({ mensaje: 'Producto actualizado exitosamente.', product: updatedProduct });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Errores de validación.', errores: error.errors.map(e => e.message) });
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'Ya existe un producto con ese nombre.' });
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar el producto.', error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Producto.findByPk(req.params.id);
    if (!product) return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    await product.destroy();
    return res.status(200).json({ mensaje: 'Producto eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el producto.', error: error.message });
  }
};

exports.activarProducto = async (req, res) => {
  try {
    const product = await Producto.findByPk(req.params.id);
    if (!product) return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    await product.update({ disponible: true });
    return res.status(200).json({ mensaje: 'Producto activado correctamente.', producto: product });
  } catch (error) {
    console.error('Error al activar producto:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.', error: error.message });
  }
};

exports.desactivarProducto = async (req, res) => {
  try {
    const product = await Producto.findByPk(req.params.id);
    if (!product) return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    await product.update({ disponible: false });
    return res.status(200).json({ mensaje: 'Producto desactivado correctamente.', producto: product });
  } catch (error) {
    console.error('Error al desactivar producto:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.', error: error.message });
  }
};
