
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fechaNacimiento: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  preferenciasAlimentarias: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: []
  },
  puntos: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'clientes',
  timestamps: true
});

Cliente.prototype.calcularDescuentoFidelidad = function() {
  if (this.puntos >= 1000) {
    const porcentajeDescuento = Math.floor(this.puntos / 1000) * 0.10;
    return Math.min(porcentajeDescuento, 0.50);
  }

  return 0;
};

module.exports = Cliente;
