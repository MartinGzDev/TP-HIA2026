const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const Venta = require('../models/Venta');
const Cliente = require('../models/cliente.model');
const Pedido = require('../models/pedido');
const Usuario = require('../models/usuario');

const includePedido = { model: Pedido, as: 'pedido', required: false };
const includeCliente = { model: Cliente, as: 'cliente', required: false, include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'email', 'telefono'] }] };

exports.crearVenta = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { pedidoId, metodoPago } = req.body;
    const pedido = await Pedido.findByPk(pedidoId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!pedido) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Pedido no encontrado.' }); }
    const existente = await Venta.findOne({ where: { pedidoId: pedido.id }, transaction });
    if (existente) { await transaction.rollback(); return res.status(400).json({ mensaje: 'Este pedido ya ha sido asociado a una venta.' }); }
    const venta = await Venta.create({ pedidoId: pedido.id, clienteId: pedido.clienteId, montoTotal: pedido.total, metodoPago }, { transaction });
    await transaction.commit();
    return res.status(201).json({ mensaje: 'Venta creada exitosamente', venta });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error al crear venta:', error);
    return res.status(500).json({ mensaje: 'Error al crear la venta', error: error.message });
  }
};

exports.obtenerVentas = async (req, res) => {
  try {
    const ventas = await Venta.findAll({ include: [includePedido, includeCliente], order: [['fechaVenta', 'DESC']] });
    return res.status(200).json(ventas);
  } catch (error) { return res.status(500).json({ mensaje: 'Error al obtener ventas', error: error.message }); }
};

exports.obtenerVentaPorId = async (req, res) => {
  try {
    const venta = await Venta.findByPk(req.params.id, { include: [includePedido, includeCliente] });
    if (!venta) return res.status(404).json({ mensaje: 'Venta no encontrada' });
    return res.status(200).json(venta);
  } catch (error) { return res.status(400).json({ mensaje: 'ID de venta inválido o error al obtener venta', error: error.message }); }
};

exports.ventasPorCliente = async (req, res) => {
  try {
    const ventas = await Venta.findAll({ where: { clienteId: req.params.clienteId }, include: [includePedido], order: [['fechaVenta', 'DESC']] });
    return res.status(200).json(ventas);
  } catch (error) { return res.status(500).json({ mensaje: 'Error al obtener ventas por cliente', error: error.message }); }
};

exports.ventasPorFecha = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const fechaVenta = {};
    if (desde) fechaVenta[Op.gte] = new Date(desde);
    if (hasta) fechaVenta[Op.lte] = new Date(hasta);
    const where = Object.keys(fechaVenta).length ? { fechaVenta } : {};
    const ventas = await Venta.findAll({ where, include: [includeCliente], order: [['fechaVenta', 'ASC']] });
    return res.status(200).json(ventas);
  } catch (error) { return res.status(500).json({ mensaje: 'Error al obtener ventas por rango de fechas', error: error.message }); }
};

exports.totalVentas = async (req, res) => {
  try {
    const total = await Venta.sum('montoTotal');
    return res.status(200).json({ mensaje: 'Total de ventas calculado', totalGeneral: Number(total || 0) });
  } catch (error) { return res.status(500).json({ mensaje: 'Error al calcular el total de ventas', error: error.message }); }
};

exports.procesarPago = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const venta = await Venta.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!venta) { await transaction.rollback(); return res.status(404).json({ mensaje: 'Venta no encontrada.' }); }
    if (venta.estadoPago === 'completado') { await transaction.rollback(); return res.status(400).json({ mensaje: 'El pago de esta venta ya ha sido procesado.' }); }
    await venta.update({ estadoPago: 'completado' }, { transaction });
    const cliente = await Cliente.findByPk(venta.clienteId, { transaction, lock: transaction.LOCK.UPDATE });
    if (cliente) await cliente.increment('puntos', { by: Math.floor(Number(venta.montoTotal) / 10), transaction });
    await transaction.commit();
    return res.status(200).json({ mensaje: 'Pago procesado y venta confirmada.', venta });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    return res.status(500).json({ mensaje: 'Error al procesar el pago', error: error.message });
  }
};

exports.generarFactura = async (req, res) => {
  try {
    const venta = await Venta.findByPk(req.params.id);
    if (!venta) return res.status(404).json({ mensaje: 'Venta no encontrada.' });
    if (venta.estadoPago !== 'completado') return res.status(400).json({ mensaje: 'El pago debe estar completado para generar factura.' });
    if (!venta.numeroFactura) {
      const prefix = 'INV';
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      await venta.update({ numeroFactura: `${prefix}-${datePart}-${randomPart}` });
    }
    return res.status(200).json({ mensaje: 'Factura generada exitosamente.', numeroFactura: venta.numeroFactura, venta });
  } catch (error) { return res.status(500).json({ mensaje: 'Error al generar la factura', error: error.message }); }
};
