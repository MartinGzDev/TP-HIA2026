
const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(
    config.DB_NAME,
    config.DB_USER,
    config.DB_PASSWORD,
    {
        dialect: 'postgres',

        replication: {
            write: {
                host: config.DB_HOST || 'localhost',
                port: 5435
            },
            read: [
                {
                    host: config.DB_HOST || 'localhost',
                    port: 5436
                }
            ]
        },

        pool: {
            max: 20,
            min: 2,
            acquire: 30000,
            idle: 10000
        },

        logging: config.NODE_ENV === 'development' ? console.log : false
    }
);

module.exports = sequelize;
