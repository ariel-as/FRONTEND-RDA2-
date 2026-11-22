import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(raiz, 'frontend');
const leer = (relativo) => readFileSync(path.join(frontend, relativo), 'utf8');
const comprobar = (condicion, mensaje) => { assert.ok(condicion, mensaje); console.log(`OK ${mensaje}`); };

const paginasPrivadas = [
  ...readdirSync(path.join(frontend, 'admin')).filter((nombre) => nombre.endsWith('.html')).map((nombre) => `admin/${nombre}`),
  'cliente/checkout.html',
  'cliente/mis-pedidos.html'
];
for (const archivo of paginasPrivadas) {
  comprobar(leer(archivo).includes('<meta name="robots" content="noindex, nofollow">'), `${archivo}: noindex presente`);
}

for (const nombre of readdirSync(path.join(frontend, 'admin')).filter((nombre) => nombre.endsWith('.html'))) {
  const html = leer(`admin/${nombre}`);
  comprobar(html.includes('integrity="sha384-') && html.includes('crossorigin="anonymous"'), `admin/${nombre}: Bootstrap con SRI`);
}

function recolectarJs(carpeta, resultados = []) {
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) recolectarJs(ruta, resultados);
    else if (entrada.name.endsWith('.js')) resultados.push(ruta);
  }
  return resultados;
}

const tasaFija = /\b1\.15\b|\b0\.15\b|\b15\s*%|\*\s*15\b/;
for (const archivo of ['models', 'controllers', 'views'].flatMap((carpeta) => recolectarJs(path.join(frontend, carpeta)))) {
  const relativo = path.relative(frontend, archivo).replaceAll('\\', '/');
  comprobar(!tasaFija.test(readFileSync(archivo, 'utf8')), `${relativo}: sin tasa de IVA fija`);
}

const local = new Map();
globalThis.localStorage = { getItem: (clave) => local.get(clave) ?? null, setItem: (clave, valor) => local.set(clave, String(valor)), removeItem: (clave) => local.delete(clave) };
globalThis.CustomEvent = class { constructor(tipo, opciones) { this.type = tipo; this.detail = opciones?.detail; } };
globalThis.window = { location: { protocol: 'http:' }, dispatchEvent: () => {} };
globalThis.document = { baseURI: 'http://localhost/frontend/', querySelector: () => null };

const { carrito } = await import('../frontend/models/carrito.model.js');
const { tarjetaProducto } = await import('../frontend/views/componentes.view.js');
const { pintarResumenCheckout, pintarConfirmacion } = await import('../frontend/views/checkout.view.js');

carrito.vaciar();
carrito.agregar({ id: 'PF0', nombre: 'Producto sin IVA', precio: 10, porcentajeIva: 0, stock: 2 });
comprobar(carrito.total() === 10, 'IVA 0: el total usa el precio final que envía la API');
const tarjeta = tarjetaProducto({ id: 'PF0', nombre: 'Producto sin IVA', precio: 10, porcentajeIva: 0, stock: 2 });
comprobar(tarjeta.includes('IVA 0%') && tarjeta.includes('$10.00'), 'IVA 0: la tarjeta no dice "IVA incluido" cuando la tasa es 0');
const resumen = { innerHTML: '' };
pintarResumenCheckout(resumen, carrito.obtener(), carrito.total());
comprobar(resumen.innerHTML.includes('IVA 0%') && resumen.innerHTML.includes('$10.00'), 'IVA 0: el resumen de checkout conserva el precio de la API');
const confirmacion = { innerHTML: '' };
pintarConfirmacion(confirmacion, { pedido: null, inscripciones: [{ id: 'I1', membresiaId: 'MI1', valor: 35 }] });
comprobar(confirmacion.innerHTML.includes('Inscripción registrada por separado de los pedidos de productos'), 'planes: la confirmación distingue la inscripción del pedido de productos');

const estilos = leer('assets/css/styles.css');
comprobar(estilos.includes('a.underline') && /min-height:\s*24px/.test(estilos), 'objetivos táctiles: mínimo de 24 px en enlaces y campos');
comprobar(estilos.includes('[data-planes] > .pf-tarjeta[data-plan]') && estilos.includes('margin-top: auto'), 'planes: altura igual y botones alineados abajo');
comprobar(estilos.includes('transition: background-color var(--pf-transicion), color var(--pf-transicion)') && estilos.includes('@media (prefers-reduced-motion: reduce)'), 'tema: transición suave con respeto a movimiento reducido');

const indice = leer('index.html');
comprobar(['og:type', 'og:title', 'og:description', 'og:image', 'og:locale'].every((etiqueta) => indice.includes(`property="${etiqueta}"`)), 'Open Graph: etiquetas obligatorias presentes');
comprobar(indice.includes('logo-planeta-compact.webp') && indice.includes('hero-gimnasio.webp') && indice.includes('fetchpriority="high"'), 'imágenes: WebP, logo compacto y prioridad de carga del hero');

console.log('\nPruebas de Auditoría 5: comprobaciones estáticas superadas. axe-core no instalado: no se ejecutaron reglas de axe reales.');
