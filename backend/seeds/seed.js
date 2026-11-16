const mongoose = require('mongoose');
const Rol = require('../models/rol');
const config = require('../config');

const roles = [
  'admin',
  'cliente',
  'supervisor_cocina',
  'supervisor_ventas',
  'repartidor'
];

async function seed() {
  try {
    await mongoose.connect(config.MONGODB_URI);

    console.log('Conectado a MongoDB');

    for (const nombre of roles) {
      await Rol.updateOne(
        { nombre },
        { $setOnInsert: { nombre, estado: true } },
        { upsert: true }
      );
    }

    console.log('Roles inicializados correctamente');
  } catch (error) {
    console.error('Error inicializando roles:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();