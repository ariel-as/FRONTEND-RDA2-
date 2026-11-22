/**
 * Prueba de humo en navegador (Chromium con Playwright).
 *
 * Sirve frontend/ en un puerto local, simula la API (sin tocar el backend real)
 * y abre cada página con sesiones de ADM, REC, CON y cliente. Falla si:
 * - hay errores de JavaScript o módulos que no cargan;
 * - una página no tiene exactamente un h1 visible;
 * - una pantalla sin permiso hace peticiones a la API;
 * - fallan los recorridos clave: menú por rol, diálogo propio con Escape y
 *   retorno de foco, validación del comprobante en pedidos y checkout.
 *
 * Ejecutar con: node pruebas/prueba-humo.mjs
 */
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const raizRepo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontend = join(raizRepo, 'frontend');
// El sitio de prueba corre en 127.0.0.1, así que el frontend usa la URL local de models/config.js.
const BASE_API = (/API_URL_LOCAL\s*=\s*'([^']+)'/.exec(readFileSync(join(frontend, 'models/config.js'), 'utf8')) || [])[1];
const PUERTO = 5600 + Math.floor(Math.random() * 300);
const SITIO = `http://127.0.0.1:${PUERTO}/`;

const USUARIOS = {
  ADM: { id: 1, login: 'adm@pf.ec', rol: 'admin', roles: ['ADM'] },
  REC: { id: 2, login: 'rec@pf.ec', rol: 'staff', roles: ['REC'], permisos: ['resumen:ver', 'gimnasio:leer', 'catalogos:leer', 'empleados:leer', 'asistencia:marcar', 'clientes:leer', 'clientes:editar', 'planes:leer', 'inscripciones:leer', 'inscripciones:gestionar', 'entradas:gestionar', 'aforo:ver', 'clases:leer', 'rutinas:leer', 'aliados:leer', 'aliados:cobrar', 'inventario:leer', 'pedidos:leer', 'pedidos:gestionar', 'ventas:leer', 'ventas:crear', 'facturas:leer', 'facturas:generar', 'caja:operar', 'caja:leer', 'mensajes:gestionar', 'reportes:clientes', 'reportes:entradas'] },
  REC_SIN_PERMISOS: { id: 3, login: 'rec2@pf.ec', rol: 'staff', roles: ['REC'] },
  CON: { id: 4, login: 'con@pf.ec', rol: 'staff', roles: ['CON'], permisos: ['resumen:ver', 'gimnasio:leer', 'catalogos:leer', 'empleados:leer', 'asistencia:reporte', 'clientes:leer', 'planes:leer', 'inscripciones:leer', 'aliados:leer', 'aliados:cobrar', 'inventario:leer', 'compras:leer', 'pedidos:leer', 'ventas:leer', 'facturas:leer', 'facturas:generar', 'facturas:sri', 'caja:leer', 'caja:cierre', 'reportes:clientes', 'reportes:entradas', 'reportes:todos', 'tablas:leer'] },
  CLI: { id: 9, login: 'cli@pf.ec', rol: 'user', roles: ['CLI'], nombre: 'Ana', cedula: '1710034065', correo: 'cli@pf.ec' }
};
const PEDIDOS = [
  { id: 11, estado: 'P', metodoPago: 'EF', total: 20, createdAt: '2026-11-20T10:00:00Z', usuario: { login: 'c@x' }, detalles: [] },
  { id: 12, estado: 'R', metodoPago: 'TR', refTransferencia: 'ABC123', total: 30, createdAt: '2026-11-20T10:00:00Z', usuario: { login: 'c@x' }, detalles: [] },
  { id: 13, estado: 'C', metodoPago: 'TR', total: 40, createdAt: '2026-11-20T10:00:00Z', usuario: { login: 'c@x' }, detalles: [] }
];

function respuestaSimulada(url, usuario) {
  const ruta = new URL(url).pathname.replace(/^.*\/api\/v1/, '');
  if (ruta === '/auth/me') return usuario;
  if (ruta === '/salud') return { status: 'ok' };
  if (ruta === '/admin/resumen') return { productosActivos: 3 };
  if (ruta === '/pedidos' || ruta === '/pedidos/mis-pedidos') return { data: PEDIDOS, pagination: { page: 1, totalPages: 1, total: 3 } };
  if (ruta === '/inscripciones/mis-inscripciones') return [{ id: 5, plan: 'Plan para 2 personas', fechaInicio: '2026-11-01', fechaFin: '2026-12-01', estado: 'A', valor: 60 }];
  if (ruta === '/membresias') return [{ id: 'MI2', nombre: 'Plan para 2 personas', personas: 2, precio: 60, precioConIva: 60, porcentajeIva: 0, beneficios: [] }];
  if (/\/meta$/.test(ruta)) return { columnas: [{ nombre: 'id', tipo: 'String', esId: true }, { nombre: 'nombre', tipo: 'String' }], idCampos: ['id'] };
  if (/\/opciones$/.test(ruta)) return [];
  if (ruta.startsWith('/admin/tablas')) return { data: [{ id: '1', nombre: 'Registro' }], pagination: { page: 1, totalPages: 1 } };
  return { data: [] };
}

const paginas = (carpeta) => readdirSync(join(frontend, carpeta)).filter((a) => a.endsWith('.html')).map((a) => `${carpeta}/${a}`);
const servidor = spawn(process.execPath, [join(raizRepo, 'pruebas/servidor.mjs'), String(PUERTO)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const navegador = await chromium.launch();
let fallos = 0;

async function visitar(rol, pagina, comprobacion) {
  const contexto = await navegador.newContext();
  const page = await contexto.newPage();
  const llamadas = [];
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errores.push(m.text()); });
  await contexto.route(`${BASE_API}/**`, async (route) => {
    const u = new URL(route.request().url());
    llamadas.push(`${route.request().method()} ${u.pathname.replace(/^.*\/api\/v1/, '')}${u.search}`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respuestaSimulada(u.href, USUARIOS[rol])) });
  });
  const usuario = USUARIOS[rol];
  await contexto.addInitScript((u) => {
    sessionStorage.setItem('pf_servidor_listo', 'true');
    if (u) { sessionStorage.setItem('usuario', JSON.stringify(u)); sessionStorage.setItem('pf_token', JSON.stringify('prueba.sin.firma')); }
  }, usuario || null);
  let detalle = '';
  try {
    await page.goto(SITIO + pagina, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const h1 = await page.evaluate(() => [...document.querySelectorAll('h1')].filter((h) => h.offsetParent !== null).length);
    if (h1 !== 1) detalle += ` h1 visibles: ${h1};`;
    if (comprobacion) {
      const r = await comprobacion(page, llamadas);
      if (r !== true) detalle += ` ${r}`;
    }
  } catch (error) {
    detalle += ` ${error.message.split('\n')[0]}`;
  }
  if (errores.length) detalle += ` errores JS: ${errores.join(' | ')}`;
  const ok = !detalle;
  if (!ok) fallos += 1;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${String(rol ?? 'sin sesión').padEnd(16)} ${pagina}${ok ? '' : ' ->' + detalle}`);
  await contexto.close();
}

// 1. Todas las páginas cargan sin errores con cada rol.
for (const pagina of paginas('admin').filter((p) => !p.endsWith('login.html'))) {
  for (const rol of ['ADM', 'REC', 'CON']) await visitar(rol, pagina);
}
await visitar(null, 'admin/login.html');
for (const pagina of [...paginas('cliente'), 'index.html']) await visitar('CLI', pagina);

// 2. Permisos: sin permiso no hay peticiones; el menú cambia por rol.
await visitar('REC', 'admin/usuarios.html', async (page, llamadas) => {
  const bloqueada = await page.locator('section[data-sin-acceso]').count();
  return (bloqueada === 1 && llamadas.length === 0) || `pantalla sin permiso: bloqueada=${bloqueada}, llamadas=${llamadas.join(',')}`;
});
await visitar('REC_SIN_PERMISOS', 'admin/pedidos.html', async (page, llamadas) => (llamadas.length === 0 && await page.locator('section[data-sin-acceso]').count() === 1) || `sin permisos del servidor: ${llamadas.join(',')}`);
await visitar('REC', 'admin/index.html', async (page) => {
  const enlaces = await page.locator('[data-menu-admin] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  return (!enlaces.includes('usuarios.html') && !enlaces.includes('tablas.html') && enlaces.includes('pedidos.html')) || `menú REC: ${enlaces.join(',')}`;
});
await visitar('ADM', 'admin/index.html', async (page) => (await page.locator('[data-menu-admin] .dropdown-toggle').count()) === 6 || 'ADM no ve los 6 grupos');

// 3. Pedidos: diálogo propio, validación del comprobante, Escape y foco de vuelta.
await visitar('ADM', 'admin/pedidos.html', async (page, llamadas) => {
  const boton = page.locator('[data-reportar="11"]');
  await boton.click();
  const dentro = await page.evaluate(() => { const d = document.querySelector('dialog.pf-dialogo'); return Boolean(d?.open && d.contains(document.activeElement)); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const foco = await page.evaluate(() => !document.querySelector('dialog.pf-dialogo') && document.activeElement?.dataset.reportar === '11');
  await boton.click();
  await page.fill('dialog input[name="refTransferencia"]', 'AB');
  await page.click('[data-dialogo-confirmar]');
  const invalido = await page.locator('dialog [aria-invalid="true"]').count();
  await page.fill('dialog input[name="refTransferencia"]', 'ABCD-12');
  await page.click('[data-dialogo-confirmar]');
  await page.waitForTimeout(300);
  return (dentro && foco && invalido === 1 && llamadas.includes('PATCH /pedidos/11/estado')) || `dentro=${dentro} foco=${foco} invalido=${invalido}`;
});

// 4. Checkout: con transferencia el comprobante es obligatorio.
await visitar('CLI', 'cliente/checkout.html', async (page) => {
  await page.evaluate(() => localStorage.setItem('carrito', JSON.stringify([{ id: 'PF0001', nombre: 'Producto', precio: 10, cantidad: 1, stock: 5, tipo: 'producto' }])));
  await page.reload();
  await page.waitForTimeout(500);
  if (!(await page.locator('#formulario-checkout').isVisible())) return true;
  await page.check('input[name="metodoPago"][value="TR"]');
  const requerido = await page.locator('#refTransferencia').evaluate((e) => e.required && !e.disabled);
  return requerido || 'el comprobante no es obligatorio con transferencia';
});

await navegador.close();
servidor.kill();
console.log(`\n${fallos === 0 ? 'OK' : 'FALLA'} Prueba de humo: ${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
