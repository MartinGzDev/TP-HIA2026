
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Categoria = sequelize.define('Categoria', {
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: 'El nombre de la categoría es obligatorio.'
      },
      len: {
        args: [2, 50],
        msg: 'El nombre debe tener entre 2 y 50 caracteres.'
      }
    },
    set(value) {
      this.setDataValue('nombre', value.trim());
    }
  },
  descripcion: {
    type: DataTypes.STRING(200),
    allowNull: true,
    defaultValue: null
  },
  imagen: {
    type: DataTypes.STRING(2048),
    allowNull: true,
    defaultValue: null
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'categorias',
  timestamps: true
});

Categoria.prototype.activar = async function() {
  if (!this.estado) {
    this.estado = true;
    await this.save();
  }
  return this;
};

Categoria.prototype.desactivar = async function() {
  if (this.estado) {
    this.estado = false;
    await this.save();
  }
  return this;
};

module.exports = Categoria;
