/**
 * Comprobaciones de seguridad del frontend (complementan CodeQL y Gitleaks).
 *
 * - Sin eval, new Function, document.write ni temporizadores con texto.
 * - Sin scripts en línea (el sitio puede usar una CSP estricta).
 * - La API se consume por HTTPS y solo se declara en models/config.js.
 * - El token de sesión se guarda en sessionStorage, nunca en localStorage ni en cookies.
 * - Sin secretos en el código (claves de nube, tokens de GitHub, llaves privadas, JWT reales).
 * - Enlaces target="_blank" con rel="noopener".
 *
 * Ejecutar con: node pruebas/verificar-seguridad.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizRepo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const raiz = join(raizRepo, 'frontend');
let fallos = 0;
function comprobar(descripcion, condicion, extra = '') {
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${descripcion}${extra ? ' -> ' + extra : ''}`);
  if (!condicion) fallos += 1;
}
function archivos(carpeta, ext) {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(carpeta, e.name);
    if (e.isDirectory()) return e.name === 'vendor' ? [] : archivos(ruta, ext);
    return ext.some((x) => e.name.endsWith(x)) ? [ruta] : [];
  });
}
const rel = (r) => relative(raiz, r).replace(/\\/g, '/');
const js = archivos(raiz, ['.js']).map((r) => [rel(r), readFileSync(r, 'utf8')]);
const html = archivos(raiz, ['.html']).map((r) => [rel(r), readFileSync(r, 'utf8')]);
const todo = [...js, ...html, ...archivos(raiz, ['.css', '.json']).map((r) => [rel(r), readFileSync(r, 'utf8')])];

const buscar = (lista, regex) => lista.filter(([, c]) => regex.test(c)).map(([r]) => r);

comprobar('Sin eval()', buscar(js, /\beval\s*\(/).length === 0, buscar(js, /\beval\s*\(/).join(', '));
comprobar('Sin new Function()', buscar(js, /new\s+Function\s*\(/).length === 0, buscar(js, /new\s+Function\s*\(/).join(', '));
comprobar('Sin document.write()', buscar([...js, ...html], /document\.write(ln)?\s*\(/).length === 0);
comprobar('Sin setTimeout/setInterval con texto', buscar(js, /set(?:Timeout|Interval)\s*\(\s*['"`]/).length === 0);

const enLinea = html.filter(([, c]) => [...c.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].some(([, attrs, cuerpo]) => !/\bsrc\s*=/.test(attrs) && cuerpo.trim()));
comprobar('Sin scripts en línea en el HTML', enLinea.length === 0, enLinea.map(([r]) => r).join(', '));

const config = js.find(([r]) => r === 'models/config.js')?.[1] || '';
const url = (/API_BASE_URL\s*=\s*'([^']+)'/.exec(config) || [])[1] || '';
comprobar('La API de producción usa HTTPS', url.startsWith('https://'), url);
const urlsApi = buscar(js.filter(([r]) => r !== 'models/config.js'), /onrender\.com|localhost:\d+/);
comprobar('La URL de la API solo aparece en models/config.js', urlsApi.length === 0, urlsApi.join(', '));

const storage = js.find(([r]) => r === 'models/storage.model.js')?.[1] || '';
comprobar('El token se guarda en sessionStorage', /sesionToken/.test(storage) && /sessionStorage/.test(storage));
comprobar('El token nunca va a localStorage ni a cookies', !/localStorage\.setItem\([^)]*token/i.test(storage) && !buscar(js, /document\.cookie[^;\n]*token/i).length);

const PATRONES_SECRETO = [
  ['clave de AWS', /AKIA[0-9A-Z]{16}/],
  ['token de GitHub', /gh[pousr]_[A-Za-z0-9]{36,}/],
  ['llave privada', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['clave de Google', /AIza[0-9A-Za-z_-]{35}/],
  ['JWT real', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  // Valores con dígitos o símbolos: descarta mapas de nombres de campo como contrasena: 'contrasena'.
  ['contraseña escrita en el código', /(?:password|contrasena|secret)\s*[:=]\s*['"](?=[^'"]*[\d!@#$%^&*])[^'"\s]{6,}['"]/i]
];
for (const [nombre, regex] of PATRONES_SECRETO) {
  const encontrados = buscar(todo, regex);
  comprobar(`Sin ${nombre}`, encontrados.length === 0, encontrados.join(', '));
}

const blank = html.flatMap(([r, c]) => [...c.matchAll(/<a\b[^>]*target\s*=\s*"_blank"[^>]*>/gi)].filter(([e]) => !/rel\s*=\s*"[^"]*noopener/i.test(e)).map(() => r));
comprobar('Enlaces target="_blank" con rel="noopener"', blank.length === 0, blank.join(', '));

const formularios = html.flatMap(([r, c]) => [...c.matchAll(/<form\b[^>]*action\s*=\s*"http:[^"]*"/gi)].map(() => r));
comprobar('Ningún formulario envía datos por HTTP sin cifrar', formularios.length === 0, formularios.join(', '));

console.log(`\n${fallos === 0 ? 'OK' : 'FALLA'} Seguridad: ${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
