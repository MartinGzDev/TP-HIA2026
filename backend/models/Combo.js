
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Combo = sequelize.define('Combo', {
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 100]
    }
  },
  descripcion: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  productosIds: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull: false,
    defaultValue: [],
    validate: {
      notEmpty: {
        msg: 'Cada combo debe contener al menos un producto.'
      }
    }
  },
  precioCombo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  descuento: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  precioFinal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  imagen: {
    type: DataTypes.STRING(2048),
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'combos',
  timestamps: true,
  hooks: {
    beforeValidate(combo) {
      if (combo.precioCombo != null && combo.descuento != null) {
        combo.precioFinal = Number(
          combo.precioCombo * (1 - combo.descuento / 100)
        ).toFixed(2);
      }
    }
  }
});

Combo.prototype.obtenerPrecioBaseProductos = async function() {
  const Producto = require('./producto');

  const productos = await Producto.findAll({
    where: {
      id: this.productosIds
    },
    attributes: ['precio']
  });

  return productos.reduce(
    (sum, producto) => sum + Number(producto.precio),
    0
  );
};

Combo.prototype.calcularDescuentoMonto = async function() {
  const precioBase = await this.obtenerPrecioBaseProductos();
  return Math.max(0, precioBase - Number(this.precioFinal));
};

Combo.prototype.obtenerDetallesProductos = async function() {
  const Producto = require('./producto');
  const Categoria = require('./categoria.model');

  return Producto.findAll({
    where: {
      id: this.productosIds
    },
    include: [{
      model: Categoria,
      as: 'categoria'
    }]
  });
};

module.exports = Combo;
