
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pedido = sequelize.define('Pedido', {
  clienteId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fechaPedido: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  estado: {
    type: DataTypes.ENUM(
      'pendiente',
      'confirmado',
      'en_preparacion',
      'en_envio',
      'entregado',
      'cancelado'
    ),
    defaultValue: 'pendiente',
    allowNull: false
  },
  direccionEntrega: {
    type: DataTypes.STRING,
    allowNull: false
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
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  descuentos: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  costoEnvio: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  detalleProductos: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  fechaEstimadaEntrega: {
    type: DataTypes.DATE,
    allowNull: true
  },
  repartidorId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pedidos',
  timestamps: true,
  hooks: {
    beforeValidate(pedido) {
      pedido.calcularTotal();
    }
  }
});

Pedido.prototype.calcularTotal = function() {
  let subtotalGeneral = 0;

  if (Array.isArray(this.detalleProductos)) {
    this.detalleProductos = this.detalleProductos.map(item => {
      const subtotal = Number(item.cantidad) * Number(item.precioUnitario);

      subtotalGeneral += subtotal;

      return {
        ...item,
        subtotal
      };
    });
  }

  this.subtotal = subtotalGeneral;

  this.total = Math.max(
    0,
    subtotalGeneral -
    Number(this.descuentos || 0) +
    Number(this.costoEnvio || 0)
  );

  return this.total;
};

module.exports = Pedido;
