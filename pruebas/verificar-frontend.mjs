/**
 * Verificación estática del frontend migrado a la API REST.
 *
 * Comprueba HTML semántico, accesibilidad básica, enlaces internos,
 * arquitectura MVC, contrato de las pantallas nuevas y ausencia de restos
 * del almacenamiento local anterior.
 *
 * Ejecutar con: node pruebas/verificar-frontend.mjs [carpeta]
 * Sin argumentos revisa `frontend/`. Con una carpeta revisa esa copia, por
 * ejemplo el sitio ya preparado para publicar.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizRepo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const raiz = resolve(process.argv[2] || join(raizRepo, 'frontend'));

let fallos = 0;
function comprobar(descripcion, condicion, extra = '') {
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${descripcion}${extra ? ' -> ' + extra : ''}`);
  if (!condicion) fallos += 1;
}

function archivos(carpeta, extensiones) {
  const encontrados = [];
  const recorrer = (actual) => {
    for (const entrada of readdirSync(actual, { withFileTypes: true })) {
      if (entrada.name.startsWith('.') || entrada.name === 'node_modules') continue;
      const ruta = join(actual, entrada.name);
      if (entrada.isDirectory()) recorrer(ruta);
      else if (extensiones.includes(extname(entrada.name))) encontrados.push(ruta);
    }
  };
  if (existsSync(carpeta)) recorrer(carpeta);
  return encontrados.sort();
}

function atributo(etiqueta, nombre) {
  const doble = new RegExp(`\\b${nombre}\\s*=\\s*"([^"]*)"`, 'i').exec(etiqueta);
  if (doble) return doble[1];
  const simple = new RegExp(`\\b${nombre}\\s*=\\s*'([^']*)'`, 'i').exec(etiqueta);
  return simple ? simple[1] : null;
}

const paginas = archivos(raiz, ['.html']);
comprobar('Se encontraron páginas HTML', paginas.length > 0, `${paginas.length} páginas`);

const PAGINAS_ESPERADAS = [
  'index.html',
  'cliente/login.html',
  'cliente/checkout.html',
  'cliente/nutricion.html',
  'cliente/mis-pedidos.html',
  'admin/login.html',
  'admin/index.html',
  'admin/productos.html',
  'admin/pedidos.html',
  'admin/clientes.html',
  'admin/membresias.html',
  'admin/inscripciones.html',
  'admin/clases.html',
  'admin/personal.html',
  'admin/usuarios.html',
  'admin/tablas.html'
];
const relativas = paginas.map((ruta) => relative(raiz, ruta).replace(/\\/g, '/'));
for (const pagina of PAGINAS_ESPERADAS) {
  comprobar(`Existe la página ${pagina}`, relativas.includes(pagina));
}
comprobar('No quedan las pantallas antiguas de planes y entrenadores',
  !relativas.includes('admin/planes.html') && !relativas.includes('admin/entrenadores.html'));

for (const ruta of paginas) {
  const codigo = readFileSync(ruta, 'utf8');
  const pagina = relative(raiz, ruta).replace(/\\/g, '/');
  const base = dirname(ruta);

  comprobar(`${pagina}: empieza con el doctype HTML5`, /^\s*<!DOCTYPE html>/i.test(codigo));
  comprobar(`${pagina}: declara lang="es"`, /<html[^>]*\slang\s*=\s*"es"/i.test(codigo));
  comprobar(`${pagina}: declara charset UTF-8`, /<meta[^>]*charset\s*=\s*["']?utf-8/i.test(codigo));
  comprobar(`${pagina}: no contiene caracteres de reemplazo`, !codigo.includes('\uFFFD'));

  const viewport = (codigo.match(/<meta\b[^>]*name\s*=\s*"viewport"[^>]*>/i) || [])[0] || '';
  comprobar(`${pagina}: declara viewport`, Boolean(viewport));
  comprobar(`${pagina}: el viewport no bloquea el zoom`,
    Boolean(viewport) && !/user-scalable\s*=\s*no/i.test(viewport) && !/maximum-scale\s*=\s*1(\.0)?\b/i.test(viewport));

  const titulo = /<title>([\s\S]*?)<\/title>/i.exec(codigo);
  comprobar(`${pagina}: tiene título`, Boolean(titulo && titulo[1].trim()));

  const h1 = (codigo.match(/<h1\b/gi) || []).length;
  comprobar(`${pagina}: tiene un solo h1`, h1 === 1, `encontrados: ${h1}`);

  comprobar(`${pagina}: incluye enlace para saltar al contenido`, /class\s*=\s*"[^"]*pf-saltar/i.test(codigo));
  comprobar(`${pagina}: incluye main con id contenido`, /<main\b[^>]*\bid\s*=\s*"contenido"/i.test(codigo));
  comprobar(`${pagina}: incluye encabezado`, /<header\b/i.test(codigo));
  comprobar(`${pagina}: incluye pie de página`, /<footer\b/i.test(codigo));
  comprobar(`${pagina}: no usa manejadores en línea`, !/\son(?:click|change|submit|input|load)\s*=\s*"/i.test(codigo));
  comprobar(`${pagina}: no usa enlaces javascript:`, !/href\s*=\s*"\s*javascript:/i.test(codigo));
  comprobar(`${pagina}: no abre ventanas sin noopener`,
    [...codigo.matchAll(/<a\b[^>]*target\s*=\s*"_blank"[^>]*>/gi)].every(([etiqueta]) => /rel\s*=\s*"[^"]*noopener/i.test(etiqueta)));

  const ids = [...codigo.matchAll(/\bid\s*=\s*"([^"]+)"/gi)].map((m) => m[1]);
  const repetidos = ids.filter((id, indice) => ids.indexOf(id) !== indice);
  comprobar(`${pagina}: identificadores únicos`, repetidos.length === 0, [...new Set(repetidos)].join(', '));

  const imagenes = [...codigo.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  comprobar(`${pagina}: todas las imágenes tienen alt`,
    imagenes.every((img) => /\balt\s*=\s*"/i.test(img)), imagenes.filter((img) => !/\balt\s*=\s*"/i.test(img)).join(' '));

  const tabindex = [...codigo.matchAll(/\btabindex\s*=\s*"([^"]+)"/gi)].map((m) => Number(m[1]));
  comprobar(`${pagina}: no usa tabindex positivos`, tabindex.every((valor) => valor <= 0), tabindex.filter((v) => v > 0).join(', '));

  const controles = [...codigo.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)].map((m) => m[0])
    .filter((etiqueta) => !/type\s*=\s*"(?:hidden|submit|button|reset)"/i.test(etiqueta));
  const bloquesLabel = [...codigo.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gi)].map((m) => m[0]);
  const sinEtiqueta = controles.filter((etiqueta) => {
    const id = atributo(etiqueta, 'id');
    const aria = atributo(etiqueta, 'aria-label') || atributo(etiqueta, 'aria-labelledby');
    const anidado = bloquesLabel.some((bloque) => bloque.includes(etiqueta));
    const forExplicito = id && new RegExp(`\\bfor\\s*=\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i').test(codigo);
    return !aria && !anidado && !forExplicito;
  });
  comprobar(`${pagina}: controles con etiqueta o nombre accesible`, sinEtiqueta.length === 0, sinEtiqueta.join(' '));

  const enlaces = [...codigo.matchAll(/<(?:a|link|script|img|source)\b[^>]*>/gi)].map((m) => m[0]);
  const rotos = [];
  for (const etiqueta of enlaces) {
    const destino = atributo(etiqueta, 'href') ?? atributo(etiqueta, 'src');
    if (!destino || destino.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(destino)) continue;
    const ruta = resolve(base, decodeURIComponent(destino.split(/[?#]/)[0]));
    if (!existsSync(ruta)) rotos.push(destino);
  }
  comprobar(`${pagina}: rutas internas existentes`, rotos.length === 0, rotos.join(', '));

  for (const etiqueta of codigo.matchAll(/<script\b([^>]*)>/gi)) {
    const src = atributo(`<script${etiqueta[1]}>`, 'src');
    if (!src || /^https?:/i.test(src)) continue;
    const propio = /controllers\//.test(src);
    if (propio) {
      comprobar(`${pagina}: ${src} se carga como módulo`, /type\s*=\s*"module"/i.test(etiqueta[1]));
    }
  }
}

const login = readFileSync(join(raiz, 'cliente/login.html'), 'utf8');
comprobar('login: campo Nombres con id nombre-registro', /id\s*=\s*"nombre-registro"[^>]*name\s*=\s*"nombre"/i.test(login));
comprobar('login: campo Apellidos con id apellido-registro', /id\s*=\s*"apellido-registro"[^>]*name\s*=\s*"apellido"/i.test(login));
comprobar('login: select de nivel con name nivelId', /name\s*=\s*"nivelId"/i.test(login) && /id\s*=\s*"nivel"/i.test(login));
comprobar('login: niveles PRI, INT y AVA', ['PRI', 'INT', 'AVA'].every((valor) => login.includes(`value="${valor}"`)));
comprobar('login: contraseñas con máximo 72', (login.match(/maxlength="72"/g) || []).length >= 2);
comprobar('login: texto de cuenta protegida en el servidor', login.includes('La contraseña se protege en el servidor'));
comprobar('login: meta description ya no dice "sin servidor"', !/meta[^>]*description[^>]*sin servidor/i.test(login));

const checkout = readFileSync(join(raiz, 'cliente/checkout.html'), 'utf8');
comprobar('checkout: bloque de cliente de solo lectura', /data-checkout-cliente/.test(checkout));
comprobar('checkout: radios de efectivo y transferencia', /value\s*=\s*"EF"/i.test(checkout) && /value\s*=\s*"TR"/i.test(checkout));
comprobar('checkout: campo de referencia de la transferencia', /Número de referencia de la transferencia/i.test(checkout) && /verificará el pago/i.test(checkout));
comprobar('checkout: enlace a Mis pedidos en la confirmación', /mis-pedidos\.html/.test(checkout));

const nutricion = readFileSync(join(raiz, 'cliente/nutricion.html'), 'utf8');
comprobar('nutrición: sección Nuestro nutricionista', /Nuestro nutricionista/i.test(nutricion));
comprobar('nutrición: formulario Solicitar información', /Solicitar información/i.test(nutricion));

const misPedidos = readFileSync(join(raiz, 'cliente/mis-pedidos.html'), 'utf8');
comprobar('mis-pedidos: data-pagina correcta', /data-pagina\s*=\s*"mis-pedidos"/i.test(misPedidos));
comprobar('mis-pedidos: sección Mis planes', /Mis planes/i.test(misPedidos));

const tablas = readFileSync(join(raiz, 'admin/tablas.html'), 'utf8');
comprobar('tablas: selector genérico sin listas fijas de tablas', /id\s*=\s*"selector-tabla"/i.test(tablas));
const usuarios = readFileSync(join(raiz, 'admin/usuarios.html'), 'utf8');
comprobar('usuarios: enlace marcado solo para ADM', /data-solo-adm/.test(usuarios));
comprobar('usuarios: diálogo de roles', /dialogo-roles/.test(readFileSync(join(raiz, 'controllers/admin-usuarios.controller.js'), 'utf8')));

const comunes = readFileSync(join(raiz, 'controllers/comunes.controller.js'), 'utf8');
const admin = readFileSync(join(raiz, 'controllers/admin.controller.js'), 'utf8');
comprobar('Cliente y panel comparten el valor de aceptación de cookies', /cookieAviso\) === '1'/.test(comunes) && /escribirCookie\(CLAVES\.cookieAviso, '1'/.test(comunes) && /cookieAviso, '1'/.test(admin));
const generico = readFileSync(join(raiz, 'controllers/admin-generico.controller.js'), 'utf8');
comprobar('CRUD genérico acepta opciones FK en arreglos directos y respuestas envueltas', /respuesta\?\.data\)\) return respuesta\.data/.test(generico) && /normalizarOpciones\(await adminModel\.tablaOpciones/.test(generico));
const inicio = readFileSync(join(raiz, 'controllers/inicio.controller.js'), 'utf8');
comprobar('Inicio anuncia el origen degradado o fallido del catálogo', /anunciarOrigenDatos\(\[productos, planes, clases, entrenadores, gimnasio\]\)/.test(inicio) && /resultado\?\.origen === 'error'/.test(inicio));

const js = archivos(raiz, ['.js']);
comprobar('Se encontraron módulos JavaScript', js.length > 0, `${js.length} archivos`);
const modulos = new Map(js.map((ruta) => [relative(raiz, ruta).replace(/\\/g, '/'), readFileSync(ruta, 'utf8')]));
const modulosEs = new Map([...modulos].filter(([ruta]) => !ruta.startsWith('assets/')));

comprobar('Solo el cliente HTTP usa fetch()', [...modulos.entries()]
  .filter(([ruta, codigo]) => ruta !== 'models/api.model.js' && /\bfetch\s*\(/.test(codigo))
  .length === 0);

const modelosConHtml = [...modulos.entries()].filter(([ruta, codigo]) =>
  ruta.startsWith('models/') && /innerHTML|insertAdjacentHTML|createElement/.test(codigo));
comprobar('Los modelos no generan HTML', modelosConHtml.length === 0, modelosConHtml.map(([r]) => r).join(', '));

const vistasConRed = [...modulos.entries()].filter(([ruta, codigo]) =>
  ruta.startsWith('views/') && /\bfetch\s*\(|localStorage|sessionStorage|indexedDB/.test(codigo));
comprobar('Las vistas no acceden a red ni almacenamiento', vistasConRed.length === 0, vistasConRed.map(([r]) => r).join(', '));

const modelosImportandoVistas = [...modulos.entries()].filter(([ruta, codigo]) =>
  ruta.startsWith('models/') && /from\s+['"][^'"]*(?:views|controllers)\//.test(codigo));
comprobar('Los modelos no importan vistas ni controladores', modelosImportandoVistas.length === 0, modelosImportandoVistas.map(([r]) => r).join(', '));

const restosViejos = [...modulosEs.entries()].filter(([, codigo]) =>
  /from\s+['"][^'"]*\/?data\/|data\/gimnasio\.json|from\s+['"](?:\.\.\/)*js\/(?:app|admin|repo|auth|cart|view|validation|storage|indexeddb)\.js/.test(codigo));
comprobar('No quedan imports al almacenamiento o scripts antiguos', restosViejos.length === 0, restosViejos.map(([r]) => r).join(', '));

const sinModulo = [...modulosEs.entries()].filter(([, codigo]) => !/^\s*(?:import|export)\b/m.test(codigo));
comprobar('Todos los módulos usan import/export', sinModulo.length === 0, sinModulo.map(([r]) => r).join(', '));

const sinRutaValida = [...modulos.keys()].filter((ruta) =>
  !/^(?:assets|controllers|models|views)\//.test(ruta));
comprobar('Los módulos están dentro de controllers, models, views o assets', sinRutaValida.length === 0, sinRutaValida.join(', '));

const importRoturas = [];
for (const [ruta, codigo] of modulos) {
  const base = dirname(join(raiz, ruta));
  for (const m of codigo.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const destino = m[1];
    if (!destino.startsWith('.')) continue;
    if (!existsSync(resolve(base, destino))) importRoturas.push(`${ruta} -> ${destino}`);
  }
}
comprobar('Todos los imports relativos resuelven a un archivo existente', importRoturas.length === 0, importRoturas.join(', '));

const api = modulos.get('models/api.model.js') || '';
const config = modulos.get('models/config.js') || '';
comprobar('El cliente HTTP centraliza la URL de la API',
  /API_BASE_URL/.test(api) && /API_BASE_URL/.test(config) && /\/api\/v1/.test(config));
comprobar('El cliente HTTP maneja 401 y sesión expirada', /401/.test(api) && /sesion-expirada/.test(api));

const archivosTexto = archivos(raiz, ['.html', '.js', '.css', '.json']);
const conReemplazo = archivosTexto.filter((ruta) => readFileSync(ruta, 'utf8').includes('\uFFFD'));
comprobar('Todos los archivos conservan UTF-8 sin caracteres de reemplazo', conReemplazo.length === 0,
  conReemplazo.map((ruta) => relative(raiz, ruta)).join(', '));

if (!existsSync(raiz) || !statSync(raiz).isDirectory()) {
  comprobar('La carpeta de frontend existe', false, raiz);
}

console.log(`\n${fallos === 0 ? 'OK' : 'FALLA'} Verificación del frontend: ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
