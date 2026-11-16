
const mongoose = require('mongoose');
const config = require('./config');

const URI = config.MONGODB_URI;

mongoose.connect(URI)
  .then(() => {
    console.log('Base de datos conectada');
    console.log('MongoDB URI:', URI.replace(/\/\/.*@/, '//***:***@'));
  })
  .catch(err => {
    console.error('Error al conectar a la base de datos:', err);
    process.exit(1);
  });

module.exports = mongoose;
