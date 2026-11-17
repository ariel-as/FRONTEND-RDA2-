/** Servidor estático del frontend para pruebas manuales o automatizadas.
 * Uso: node pruebas/servidor.mjs [puerto]
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('../frontend/', import.meta.url)));
const puerto = Number(process.argv[2] || 5500);
const tipos = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg'
};

createServer(async (req, res) => {
  try {
    const ruta = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    const archivo = resolve(raiz, `.${ruta === '/' ? '/index.html' : ruta}`);
    if (!archivo.startsWith(raiz) || !existsSync(archivo)) {
      res.writeHead(404).end('No encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': tipos[extname(archivo).toLowerCase()] || 'application/octet-stream' });
    res.end(await readFile(archivo));
  } catch {
    res.writeHead(400).end('Solicitud no válida');
  }
}).listen(puerto, '127.0.0.1', () => {
  console.log(`Frontend disponible en http://127.0.0.1:${puerto}`);
});
