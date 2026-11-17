
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Oferta = sequelize.define('Oferta', {
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
  porcentajeDescuento: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 1,
      max: 99
    }
  },
  fechaInicio: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  fechaFin: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      esPosteriorAInicio(value) {
        if (this.fechaInicio && value < this.fechaInicio) {
          throw new Error(
            'La fecha de fin debe ser posterior o igual a la fecha de inicio.'
          );
        }
      }
    }
  },
  tipoOferta: {
    type: DataTypes.ENUM('producto', 'categoria'),
    allowNull: false
  },
  productosAplicables: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: []
  },
  categoriasAplicables: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: []
  },
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ofertas',
  timestamps: true
});

Oferta.prototype.estaVigente = function() {
  const ahora = new Date();

  return this.activa &&
    this.fechaInicio <= ahora &&
    this.fechaFin >= ahora;
};

Oferta.prototype.aplicarDescuento = function(precioOriginal) {
  if (precioOriginal < 0) {
    throw new Error('El precio original no puede ser negativo.');
  }

  return precioOriginal * (1 - this.porcentajeDescuento / 100);
};

Oferta.prototype.calcularDescuento = function(precioOriginal) {
  return precioOriginal * (this.porcentajeDescuento / 100);
};

module.exports = Oferta;
