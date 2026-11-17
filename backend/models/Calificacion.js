
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Calificacion = sequelize.define('Calificacion', {
  pedidoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  clienteId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  puntuacionComida: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  puntuacionServicio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  puntuacionEntrega: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  comentario: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  fechaCalificacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  calificacionProductos: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  tableName: 'calificaciones',
  timestamps: true
});

Calificacion.prototype.calcularPuntuacionPromedio = function() {
  const puntuaciones = [
    this.puntuacionComida,
    this.puntuacionServicio,
    this.puntuacionEntrega,
    ...this.calificacionProductos.map(item => item.puntuacion)
  ];

  return puntuaciones.reduce((sum, valor) => sum + valor, 0) /
    puntuaciones.length;
};

module.exports = Calificacion;
