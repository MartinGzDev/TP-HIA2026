const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(
    config.DB_NAME,
    config.DB_USER,
    config.DB_PASSWORD,
    {
        host: config.DB_HOST || 'localhost',
        port: Number(config.DB_PORT || 5432),
        dialect: 'postgres',
        logging: config.NODE_ENV === 'development' ? console.log : false
    }
);

module.exports = sequelize;
