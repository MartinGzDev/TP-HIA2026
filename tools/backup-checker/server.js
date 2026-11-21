const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const directory = '/backups/daily';

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'healthy' }));
  }

  if (req.url !== '/check') {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  try {
    const files = (await fs.readdir(directory))
      .filter(name => /^hia_grupo14-\d{8}\.sql\.gz$/.test(name))
      .sort()
      .reverse();

    if (!files.length) throw new Error('No se encontraron backups diarios');

    const filename = files[0];
    const filepath = path.join(directory, filename);
    const stat = await fs.stat(filepath);

    if (!stat.isFile() || stat.size === 0) {
      throw new Error('El backup no existe o está vacío');
    }

    await execFileAsync('gzip', ['-t', filepath]);

    res.writeHead(200);
    res.end(JSON.stringify({
      estado: 'correcto',
      archivo: filename,
      tamaño_bytes: stat.size,
      fecha_modificacion: stat.mtime.toISOString(),
      integridad_gzip: 'correcta',
      fecha_verificacion: new Date().toISOString()
    }));
  } catch (error) {
    res.writeHead(503);
    res.end(JSON.stringify({
      estado: 'error',
      mensaje: error.message,
      fecha_verificacion: new Date().toISOString()
    }));
  }
});

server.listen(8080, '0.0.0.0');
