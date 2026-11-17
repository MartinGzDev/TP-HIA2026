
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Venta = sequelize.define('Venta', {
  pedidoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  clienteId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fechaVenta: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  montoTotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  metodoPago: {
    type: DataTypes.ENUM(
      'Tarjeta de Crédito',
      'Tarjeta de Débito',
      'Efectivo',
      'Transferencia',
      'Mercado Pago',
      'Otro'
    ),
    allowNull: false
  },
  estadoPago: {
    type: DataTypes.ENUM('pendiente', 'completado', 'fallido'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  numeroFactura: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'ventas',
  timestamps: true
});

Venta.prototype.generarNumeroFactura = async function() {
  if (!this.numeroFactura) {
    const prefix = 'INV';
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();

    this.numeroFactura = `${prefix}-${datePart}-${randomPart}`;
    await this.save();
  }

  return this.numeroFactura;
};

module.exports = Venta;
