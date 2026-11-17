const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define('Usuario', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('username', value.trim().toLowerCase());
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    set(value) {
      this.setDataValue('email', value.trim().toLowerCase());
    },
    validate: {
      isEmail: {
        msg: 'El email no tiene un formato válido.'
      }
    }
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: {
        args: /^\+?[1-9]\d{1,14}$/,
        msg: 'El teléfono debe tener un formato E.164 válido.'
      }
    }
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  rolId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('nombre', value.trim());
    }
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      this.setDataValue('apellido', value.trim());
    }
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  clienteId: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: true
  },
  repartidorId: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: true
  }
}, {
  tableName: 'usuarios',
  timestamps: true,
  hooks: {
    beforeValidate(usuario) {
      if (!usuario.googleId && !usuario.password) {
        throw new Error('La contraseña es obligatoria para usuarios que no utilizan Google.');
      }
    }
  }
});

Usuario.prototype.compararPassword = async function(passwordIngresada) {
  return bcrypt.compare(passwordIngresada, this.password);
};

module.exports = Usuario;
