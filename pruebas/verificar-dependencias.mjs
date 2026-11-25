/**
 * Librerías, framework y versiones del frontend.
 *
 * - Todo recurso externo (script o hoja de estilos) usa HTTPS, viene de un CDN
 *   permitido, fija una versión exacta (@x.y.z) y lleva integrity + crossorigin.
 * - Cada librería usa la misma versión en todas las páginas.
 * - Las copias locales de assets/vendor llevan la versión en el nombre y su licencia.
 * - Las dependencias de desarrollo de package.json están fijadas sin ^ ni ~.
 * - Con --red descarga cada recurso y comprueba que el hash coincide con su integrity.
 *
 * Ejecutar con: node pruebas/verificar-dependencias.mjs [--red]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizRepo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const raiz = join(raizRepo, 'frontend');
const conRed = process.argv.includes('--red');
const CDN_PERMITIDOS = new Set(['cdn.jsdelivr.net']);

let fallos = 0;
function comprobar(descripcion, condicion, extra = '') {
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${descripcion}${extra ? ' -> ' + extra : ''}`);
  if (!condicion) fallos += 1;
}

function html(carpeta) {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(carpeta, e.name);
    if (e.isDirectory()) return html(ruta);
    return e.name.endsWith('.html') ? [ruta] : [];
  });
}

const atributo = (etiqueta, nombre) => (new RegExp(`\\b${nombre}\\s*=\\s*"([^"]*)"`, 'i').exec(etiqueta) || [])[1] ?? null;

const recursos = [];
for (const ruta of html(raiz)) {
  const codigo = readFileSync(ruta, 'utf8');
  const pagina = relative(raiz, ruta).replace(/\\/g, '/');
  for (const [etiqueta] of codigo.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const esLink = /^<link/i.test(etiqueta);
    if (esLink && !/rel\s*=\s*"stylesheet"/i.test(etiqueta)) continue;
    const url = atributo(etiqueta, esLink ? 'href' : 'src');
    if (!url || !/^(https?:)?\/\//i.test(url)) continue;
    recursos.push({ pagina, url, integrity: atributo(etiqueta, 'integrity'), crossorigin: atributo(etiqueta, 'crossorigin') });
  }
}

comprobar('Se encontraron recursos externos', recursos.length > 0, `${recursos.length} referencias`);
const versiones = new Map();
for (const r of recursos) {
  const destino = `${r.pagina}: ${r.url}`;
  comprobar(`${destino} usa HTTPS`, r.url.startsWith('https://'));
  const host = (() => { try { return new URL(r.url).host; } catch { return ''; } })();
  comprobar(`${destino} viene de un CDN permitido`, CDN_PERMITIDOS.has(host), host);
  const version = /\/npm\/(@?[^@/]+)@(\d+\.\d+\.\d+)\//.exec(r.url);
  comprobar(`${destino} fija una versión exacta`, Boolean(version));
  comprobar(`${destino} lleva integrity sha384/sha512`, /^sha(384|512)-[A-Za-z0-9+/=]+$/.test(r.integrity || ''));
  comprobar(`${destino} lleva crossorigin="anonymous"`, r.crossorigin === 'anonymous');
  if (version) {
    const lista = versiones.get(version[1]) || new Set();
    lista.add(version[2]);
    versiones.set(version[1], lista);
  }
}
for (const [libreria, lista] of versiones) {
  comprobar(`${libreria} usa una sola versión en todo el sitio`, lista.size === 1, [...lista].join(', '));
  console.log(`INFO ${libreria} ${[...lista].join(', ')}`);
}

const vendor = join(raiz, 'assets/vendor');
if (existsSync(vendor)) {
  const archivos = readdirSync(vendor);
  for (const archivo of archivos.filter((a) => a.endsWith('.js') || a.endsWith('.css'))) {
    comprobar(`assets/vendor/${archivo} lleva la versión en el nombre`, /\d+\.\d+\.\d+/.test(archivo));
    const nombre = archivo.replace(/-play/, '').replace(/-\d.*$/, '');
    comprobar(`assets/vendor/${archivo} incluye su licencia`, archivos.some((a) => a.toLowerCase().startsWith('license') && a.toLowerCase().includes(nombre.toLowerCase())));
  }
}

const paquete = join(raizRepo, 'package.json');
if (existsSync(paquete)) {
  const pkg = JSON.parse(readFileSync(paquete, 'utf8'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const [nombre, version] of Object.entries(deps)) {
    comprobar(`package.json fija ${nombre} sin rangos`, /^\d+\.\d+\.\d+$/.test(version), version);
  }
  comprobar('package-lock.json existe para instalaciones reproducibles', existsSync(join(raizRepo, 'package-lock.json')));
}

if (conRed) {
  const unicos = [...new Map(recursos.map((r) => [r.url, r])).values()];
  for (const r of unicos) {
    try {
      const respuesta = await fetch(r.url, { signal: AbortSignal.timeout(30000) });
      comprobar(`${r.url} responde 200`, respuesta.ok, String(respuesta.status));
      const algoritmo = (r.integrity || 'sha384-').split('-')[0];
      const hash = `${algoritmo}-${createHash(algoritmo).update(Buffer.from(await respuesta.arrayBuffer())).digest('base64')}`;
      comprobar(`${r.url} coincide con su integrity (SRI)`, hash === r.integrity, hash);
      comprobar(`${r.url} permite CORS para SRI`, respuesta.headers.get('access-control-allow-origin') === '*');
    } catch (error) {
      comprobar(`${r.url} se pudo descargar`, false, error.message);
    }
  }
}

console.log(`\n${fallos === 0 ? 'OK' : 'FALLA'} Dependencias: ${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
