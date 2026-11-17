
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Producto = sequelize.define('Producto', {
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: 'El nombre del producto es obligatorio.'
      },
      len: {
        args: [3, 100],
        msg: 'El nombre debe tener entre 3 y 100 caracteres.'
      }
    },
    set(value) {
      this.setDataValue('nombre', value.trim());
    }
  },
  descripcion: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  categoriaId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  imagen: {
    type: DataTypes.STRING(2048),
    allowNull: true
  },
  disponible: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  popularidad: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'productos',
  timestamps: true,
  hooks: {
    beforeValidate(producto) {
      producto.disponible = producto.stock > 0;
    }
  }
});

Producto.prototype.verificarDisponibilidad = function() {
  return this.disponible && this.stock > 0;
};

Producto.prototype.actualizarStock = async function(cantidadCambio) {
  const nuevoStock = this.stock + cantidadCambio;

  if (nuevoStock < 0) {
    throw new Error('Operación inválida: stock insuficiente para completar la solicitud.');
  }

  this.stock = nuevoStock;
  this.disponible = nuevoStock > 0;

  await this.save();
  return this.stock;
};

module.exports = Producto;
