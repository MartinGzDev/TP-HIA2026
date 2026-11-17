
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Repartidor = sequelize.define('Repartidor', {
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  estado: {
    type: DataTypes.ENUM(
      'disponible',
      'en_entrega',
      'fuera_de_servicio'
    ),
    allowNull: false,
    defaultValue: 'disponible'
  },
  vehiculo: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  numeroLicencia: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  ubicacionActual: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { lat: null, lon: null }
  },
  historialEntregas: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  calificacionPromedio: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  disponible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'repartidores',
  timestamps: true,
  hooks: {
    beforeValidate(repartidor) {
      repartidor.disponible = repartidor.estado === 'disponible';
    }
  }
});

Repartidor.prototype.cambiarEstado = async function(nuevoEstado) {
  const estadosValidos = [
    'disponible',
    'en_entrega',
    'fuera_de_servicio'
  ];

  if (!estadosValidos.includes(nuevoEstado)) {
    throw new Error(`Estado inválido: ${nuevoEstado}`);
  }

  this.estado = nuevoEstado;
  await this.save();
  return this;
};

Repartidor.prototype.registrarEntrega = async function(entrega) {
  if (!entrega || !entrega.pedidoId) {
    throw new Error('La entrega debe tener al menos un pedidoId.');
  }

  if (
    entrega.calificacionCliente !== undefined &&
    (entrega.calificacionCliente < 1 || entrega.calificacionCliente > 5)
  ) {
    throw new Error('La calificación debe estar entre 1 y 5.');
  }

  const historial = [...this.historialEntregas];

  historial.push({
    pedidoId: entrega.pedidoId,
    fechaEntrega: entrega.fechaEntrega || new Date(),
    calificacionCliente: entrega.calificacionCliente
  });

  this.historialEntregas = historial;

  const calificaciones = historial
    .filter(item => item.calificacionCliente !== undefined)
    .map(item => item.calificacionCliente);

  if (calificaciones.length > 0) {
    this.calificacionPromedio =
      calificaciones.reduce((sum, valor) => sum + valor, 0) /
      calificaciones.length;
  }

  await this.save();
  return this;
};

module.exports = Repartidor;
