
const Usuario = require('../models/usuario');
const Cliente = require('../models/cliente.model');
const Repartidor = require('../models/Repartidor');
const Rol = require('../models/rol');
const sequelize = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

let config;
try {
  config = require('../config.js');
} catch (error) {
  config = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    JWT_SECRET: process.env.JWT_SECRET || '1234567890'
  };
}

const JWT_SECRET = config.JWT_SECRET;
const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;

// REGISTRO
exports.registerUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      username, password, email, telefono, rolName, nombre, apellido,
      direccionCliente, fechaNacimientoCliente,
      preferenciasAlimentariasCliente, puntosCliente,
      vehiculoRepartidor, numeroLicenciaRepartidor
    } = req.body;

    if (!username || !password || !email || !rolName || !nombre || !apellido) {
      await transaction.rollback();
      return res.status(400).json({
        mensaje: 'Todos los campos obligatorios deben ser proporcionados.'
      });
    }

    if (rolName.toLowerCase() === 'cliente' && !direccionCliente) {
      await transaction.rollback();
      return res.status(400).json({
        mensaje: 'La dirección es obligatoria para el rol de cliente.'
      });
    }

    const userExists = await Usuario.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username },
          { email }
        ]
      },
      transaction
    });

    if (userExists) {
      await transaction.rollback();
      const field = userExists.username === username
        ? 'nombre de usuario'
        : 'email';

      return res.status(400).json({
        mensaje: `El ${field} ya está en uso.`
      });
    }

    const foundRol = await Rol.findOne({
      where: { nombre: rolName.toLowerCase() },
      transaction
    });

    if (!foundRol) {
      await transaction.rollback();
      return res.status(400).json({
        mensaje: `Rol no válido: '${rolName}'.`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUsuario = await Usuario.create({
      username,
      password: hashedPassword,
      email,
      telefono: telefono || null,
      rolId: foundRol.id,
      estado: true,
      nombre,
      apellido
    }, { transaction });

    if (foundRol.nombre === 'cliente') {
      const newCliente = await Cliente.create({
        usuarioId: newUsuario.id,
        direccion: direccionCliente,
        fechaNacimiento: fechaNacimientoCliente || null,
        preferenciasAlimentarias: preferenciasAlimentariasCliente || [],
        puntos: puntosCliente || 0
      }, { transaction });

      await newUsuario.update({
        clienteId: newCliente.id
      }, { transaction });

    } else if (foundRol.nombre === 'repartidor') {
      const newRepartidor = await Repartidor.create({
        usuarioId: newUsuario.id,
        estado: 'disponible',
        vehiculo: vehiculoRepartidor || '',
        numeroLicencia: numeroLicenciaRepartidor || ''
      }, { transaction });

      await newUsuario.update({
        repartidorId: newRepartidor.id
      }, { transaction });
    }

    await transaction.commit();

    const token = jwt.sign(
      { _id: newUsuario.id, rol: foundRol.nombre },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(201).json({
      mensaje: 'Usuario y perfil de rol creado exitosamente',
      token,
      usuario: {
        id: newUsuario.id,
        username: newUsuario.username,
        email: newUsuario.email,
        nombre: newUsuario.nombre,
        apellido: newUsuario.apellido,
        rol: foundRol.nombre
      }
    });

  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error('Error en el registro:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        mensaje: 'El nombre de usuario o email ya está registrado.'
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        mensaje: 'Error de validación: ' +
          error.errors.map(e => e.message).join(', ')
      });
    }

    return res.status(500).json({
      mensaje: 'Error al registrar el usuario y su perfil.',
      error: error.message
    });
  }
};

// LOGIN
exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        mensaje: 'Se requiere nombre de usuario y contraseña.'
      });
    }

    const user = await Usuario.findOne({
      where: { username }
    });

    if (!user) {
      return res.status(400).json({
        mensaje: 'Credenciales inválidas.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password || '');

    if (!isMatch) {
      return res.status(400).json({
        mensaje: 'Credenciales inválidas.'
      });
    }

    if (!user.estado) {
      return res.status(403).json({
        mensaje: 'La cuenta de usuario está inactiva.'
      });
    }

    const rol = await Rol.findByPk(user.rolId);

    if (!rol) {
      return res.status(500).json({
        mensaje: 'No se encontró el rol del usuario.'
      });
    }

    const token = jwt.sign(
      { _id: user.id, rol: rol.nombre },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: user.id,
        username: user.username,
        email: user.email,
        rol: rol.nombre,
        nombre: user.nombre,
        apellido: user.apellido
      }
    });

  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    return res.status(500).json({
      mensaje: 'Error en el servidor.',
      error: error.message
    });
  }
};

// LOGIN CON GOOGLE
exports.googleLogin = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { idToken } = req.body;

    if (!idToken) {
      await transaction.rollback();
      return res.status(400).json({
        mensaje: 'Token de Google requerido.'
      });
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const {
      email, name, given_name, family_name,
      picture, sub: googleId
    } = payload;

    let user = await Usuario.findOne({
      where: { email },
      transaction
    });

    let rol;

    if (!user) {
      const clienteRol = await Rol.findOne({
        where: { nombre: 'cliente' },
        transaction
      });

      if (!clienteRol) {
        await transaction.rollback();
        return res.status(500).json({
          mensaje: 'Rol de cliente no encontrado.'
        });
      }

      user = await Usuario.create({
        username: email,
        email,
        nombre: given_name || (name || '').split(' ')[0],
        apellido: family_name || (name || '').split(' ').slice(1).join(' '),
        rolId: clienteRol.id,
        estado: true,
        googleId
      }, { transaction });

      const newCliente = await Cliente.create({
        usuarioId: user.id,
        direccion: 'Dirección pendiente de configuración',
        preferenciasAlimentarias: [],
        puntos: 0
      }, { transaction });

      await user.update({
        clienteId: newCliente.id
      }, { transaction });

      rol = clienteRol;

    } else {
      if (!user.googleId) {
        await user.update({ googleId }, { transaction });
      }

      rol = await Rol.findByPk(user.rolId, { transaction });
    }

    await transaction.commit();

    const token = jwt.sign(
      { _id: user.id, rol: rol.nombre },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      mensaje: 'Inicio de sesión con Google exitoso',
      token,
      usuario: {
        id: user.id,
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: rol.nombre,
        picture
      }
    });

  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error('Error en Google OAuth:', error);

    if (error.message.includes('Token used too late')) {
      return res.status(400).json({
        mensaje: 'Token de Google expirado.'
      });
    }

    if (error.message.includes('Invalid token')) {
      return res.status(400).json({
        mensaje: 'Token de Google inválido.'
      });
    }

    return res.status(500).json({
      mensaje: 'Error al procesar el inicio de sesión con Google.',
      error: error.message
    });
  }
};

// URL DE AUTORIZACIÓN GOOGLE
exports.getGoogleAuthUrl = async (req, res) => {
  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent'
    });

    return res.json({ authUrl });

  } catch (error) {
    console.error('Error generando URL de Google OAuth:', error);

    return res.status(500).json({
      mensaje: 'Error al generar URL de autorización de Google.',
      error: error.message
    });
  }
};
