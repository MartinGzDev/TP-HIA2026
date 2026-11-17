const { Op } = require('sequelize');
const { Oferta, Producto, Categoria } = require('../models');
const vigenteWhere = () => ({ activa: true, fechaInicio: { [Op.lte]: new Date() }, fechaFin: { [Op.gte]: new Date() } });
const validarIds = async (Model, ids) => Array.isArray(ids) && ids.length > 0 && (await Model.count({ where: { id: { [Op.in]: ids } } })) === new Set(ids.map(Number)).size;
const expandirOferta = async oferta => {
  const json = oferta.toJSON();
  json.productos = json.tipoOferta === 'producto' ? await Producto.findAll({ where: { id: { [Op.in]: json.productosAplicables || [] } }, attributes: ['id','nombre','precio','imagen'] }) : [];
  json.categorias = json.tipoOferta === 'categoria' ? await Categoria.findAll({ where: { id: { [Op.in]: json.categoriasAplicables || [] } }, attributes: ['id','nombre'] }) : [];
  return json;
};

exports.crearOferta = async (req, res) => {
  try {
    const data = req.body;
    if (!['producto','categoria'].includes(data.tipoOferta)) return res.status(400).json({ mensaje: 'El tipo de oferta debe ser "producto" o "categoria".' });
    if (data.tipoOferta === 'producto' && !await validarIds(Producto, data.productosAplicables)) return res.status(400).json({ mensaje: 'Uno o más IDs de productos aplicables no son válidos o no se especificaron.' });
    if (data.tipoOferta === 'categoria' && !await validarIds(Categoria, data.categoriasAplicables)) return res.status(400).json({ mensaje: 'Uno o más IDs de categorías aplicables no son válidos o no se especificaron.' });
    const oferta = await Oferta.create({ ...data, productosAplicables: data.tipoOferta === 'producto' ? data.productosAplicables.map(Number) : [], categoriasAplicables: data.tipoOferta === 'categoria' ? data.categoriasAplicables.map(Number) : [], activa: true });
    return res.status(201).json({ mensaje: 'Oferta creada exitosamente.', oferta });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'Ya existe una oferta con este nombre.', detalle: error.message });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación al crear la oferta.', detalle: error.message });
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear la oferta.', error: error.message });
  }
};

exports.obtenerOfertas = async (req, res) => {
  try {
    const where = {};
    if (req.query.activa !== undefined) where.activa = req.query.activa === 'true';
    if (req.query.vigente === 'true') Object.assign(where, vigenteWhere());
    const ofertas = await Oferta.findAll({ where, order: [['fechaInicio','DESC']] });
    const salida = [];
    for (const oferta of ofertas) salida.push(await expandirOferta(oferta));
    return res.json(salida);
  } catch (error) { return res.status(500).json({ mensaje: 'Error interno del servidor al obtener ofertas.', error: error.message }); }
};

exports.obtenerOfertaPorId = async (req, res) => {
  try {
    const oferta = await Oferta.findByPk(req.params.id);
    if (!oferta) return res.status(404).json({ mensaje: 'Oferta no encontrada' });
    const json = await expandirOferta(oferta);
    json.productos = (json.productos || []).map(p => ({ _id: p.id, nombre: p.nombre, precioOriginal: p.precio, precioFinal: +(Number(p.precio) * (1 - Number(oferta.porcentajeDescuento)/100)).toFixed(2) }));
    return res.json(json);
  } catch (error) { return res.status(500).json({ mensaje: 'Error al obtener la oferta', error: error.message }); }
};

exports.editarOferta = async (req, res) => {
  try {
    const oferta = await Oferta.findByPk(req.params.id);
    if (!oferta) return res.status(404).json({ mensaje: 'Oferta no encontrada para actualizar.' });
    const data = { ...req.body };
    const tipo = data.tipoOferta || oferta.tipoOferta;
    if (!['producto','categoria'].includes(tipo)) return res.status(400).json({ mensaje: 'El tipo de oferta debe ser "producto" o "categoria".' });
    if (tipo === 'producto') {
      const ids = data.productosAplicables ?? oferta.productosAplicables;
      if (!await validarIds(Producto, ids)) return res.status(400).json({ mensaje: 'Uno o más IDs de productos aplicables no son válidos.' });
      data.productosAplicables = ids.map(Number); data.categoriasAplicables = [];
    } else {
      const ids = data.categoriasAplicables ?? oferta.categoriasAplicables;
      if (!await validarIds(Categoria, ids)) return res.status(400).json({ mensaje: 'Uno o más IDs de categorías aplicables no son válidos.' });
      data.categoriasAplicables = ids.map(Number); data.productosAplicables = [];
    }
    await oferta.update(data);
    return res.json({ mensaje: 'Oferta actualizada exitosamente.', oferta });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ mensaje: 'Ya existe otra oferta con el nombre proporcionado.', detalle: error.message });
    if (error.name === 'SequelizeValidationError') return res.status(400).json({ mensaje: 'Error de validación al actualizar la oferta.', detalle: error.message });
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar la oferta.', error: error.message });
  }
};

exports.borrarOfertaPorId = async (req, res) => {
  try { const oferta = await Oferta.findByPk(req.params.id); if (!oferta) return res.status(404).json({ mensaje: 'Oferta no encontrada para eliminar.' }); await oferta.destroy(); return res.json({ mensaje: 'Oferta eliminada exitosamente.', oferta }); }
  catch (error) { return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar la oferta.', error: error.message }); }
};

async function cambiarActiva(req, res, activa) {
  try { const oferta = await Oferta.findByPk(req.params.id); if (!oferta) return res.status(404).json({ mensaje: 'Oferta no encontrada.' }); await oferta.update({ activa }); return res.json({ mensaje: activa ? 'Oferta activada exitosamente.' : 'Oferta desactivada exitosamente.', oferta }); }
  catch (error) { return res.status(500).json({ mensaje: 'Error al actualizar el estado de la oferta.', error: error.message }); }
}
exports.activarOferta = (req, res) => cambiarActiva(req, res, true);
exports.desactivarOferta = (req, res) => cambiarActiva(req, res, false);

exports.obtenerOfertasPorProducto = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.productId);
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    const ahora = new Date();
    const comunes = { activa: true, fechaInicio: { [Op.lte]: ahora }, fechaFin: { [Op.gte]: ahora } };
    const ofertas = await Oferta.findAll({ where: { ...comunes, [Op.or]: [ { tipoOferta: 'producto', productosAplicables: { [Op.contains]: [Number(producto.id)] } }, { tipoOferta: 'categoria', categoriasAplicables: { [Op.contains]: [Number(producto.categoriaId)] } } ] }, order: [['porcentajeDescuento','DESC']] });
    const salida = [];
    for (const oferta of ofertas) salida.push(await expandirOferta(oferta));
    return res.json(salida);
  } catch (error) { return res.status(500).json({ mensaje: 'Error interno del servidor al obtener ofertas por producto.', error: error.message }); }
};

exports.obtenerProductosEnOferta = async (req, res) => {
  try {
    const ofertas = await Oferta.findAll({ where: vigenteWhere(), order: [['porcentajeDescuento','DESC']] });
    const map = new Map();
    for (const oferta of ofertas) {
      let productos = [];
      if (oferta.tipoOferta === 'producto') productos = await Producto.findAll({ where: { id: { [Op.in]: oferta.productosAplicables || [] }, disponible: true }, include: [{ model: Categoria, as: 'categoria', attributes: ['id','nombre'] }] });
      else productos = await Producto.findAll({ where: { categoriaId: { [Op.in]: oferta.categoriasAplicables || [] }, disponible: true }, include: [{ model: Categoria, as: 'categoria', attributes: ['id','nombre'] }] });
      for (const p of productos) if (!map.has(p.id)) map.set(p.id, { producto: p, oferta });
    }
    const resultado = [...map.values()].map(({ producto: p, oferta }) => ({ _id: p.id, nombre: p.nombre, descripcion: p.descripcion, imagen: p.imagen, precioOriginal: p.precio, precioFinal: +(Number(p.precio) * (1 - Number(oferta.porcentajeDescuento)/100)).toFixed(2), disponible: p.disponible, stock: p.stock, categoria: p.categoria?.nombre || '', oferta: { _id: oferta.id, nombre: oferta.nombre, porcentajeDescuento: oferta.porcentajeDescuento } }));
    return res.json(resultado);
  } catch (error) { return res.status(500).json({ mensaje: 'Error interno del servidor al obtener productos en oferta.', error: error.message }); }
};
