const jwt = require('jsonwebtoken');
const config = require('../config.js');

const JWT_SECRET = config.JWT_SECRET;

exports.autenticar = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({
            mensaje: 'Acceso denegado. No se proporcionó token.'
        });
    }

    try {
        const tokenLimpio = token.replace('Bearer ', '');
        const verificado = jwt.verify(tokenLimpio, JWT_SECRET);

        req.usuario = verificado;

        console.log('MIDDLEWARE AUTENTICAR: Token válido. Rol:', req.usuario.rol);

        next();
    } catch (error) {
        console.error('MIDDLEWARE AUTENTICAR:', error.message);

        return res.status(401).json({
            mensaje: 'Token inválido o expirado.'
        });
    }
};

exports.autorizar = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario || !req.usuario.rol) {
            return res.status(403).json({
                mensaje: 'Acceso denegado. No hay información de rol.'
            });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                mensaje: 'Acceso denegado. No tiene los permisos necesarios.'
            });
        }

        next();
    };
};