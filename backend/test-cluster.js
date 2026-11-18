
require('dotenv').config();

const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

async function testCluster() {
    try {
        console.log('\n=== PRUEBA DE CLUSTER POSTGRESQL ===\n');

        // Consulta de lectura: Sequelize debe utilizar el pool read.
        const readResult = await sequelize.query(
            `SELECT
                inet_server_addr() AS node_ip,
                inet_server_port() AS node_port,
                pg_is_in_recovery() AS is_replica,
                current_database() AS database`,
            {
                type: QueryTypes.SELECT
            }
        );

        console.log('LECTURA:');
        console.table(readResult);

        // Consulta de escritura: utiliza el pool write.
        const writeResult = await sequelize.query(
            `SELECT
                inet_server_addr() AS node_ip,
                inet_server_port() AS node_port,
                pg_is_in_recovery() AS is_replica,
                current_database() AS database`,
            {
                type: QueryTypes.SELECT,
                useMaster: true
            }
        );

        console.log('CONEXIÓN PRINCIPAL:');
        console.table(writeResult);

    } catch (error) {
        console.error('Error durante la prueba:', error);
    } finally {
        await sequelize.close();
    }
}

testCluster();
