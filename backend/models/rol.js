const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Rol = sequelize.define('Rol', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('nombre', value.trim().toLowerCase());
    },
    validate: {
      is: {
        args: /^[a-zA-Z_\s]*$/,
        msg: 'El nombre del rol solo puede contener letras y espacios.'
      }
    }
  },
  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'roles',
  timestamps: true
});

module.exports = Rol;
