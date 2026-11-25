import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
let correctas = 0;
const apiOverrides = new Map();

function comprobar(condicion, mensaje) {
  assert.ok(condicion, mensaje);
  correctas += 1;
  console.log(`OK ${mensaje}`);
}

function datosApi(url, cuerpo) {
  const ruta = new URL(url).pathname;
  if (ruta.endsWith('/productos')) return { data: Array.from({ length: 4 }, (_, i) => ({ id: `PF000${i + 1}`, nombre: `Producto ${i + 1}`, descripcion: 'Producto de prueba', categoriaId: 'SUP', categoria: 'Suplementos', precio: 10 + i, precioConIva: 11.5 + i, stock: 20, estado: 'A', disponible: true })) };
  if (ruta.endsWith('/membresias')) return { data: ['MI1', 'MI2', 'MI3'].map((id, i) => ({ id, nombre: `Plan ${i + 1}`, descripcion: 'Plan mensual', precio: 35 + i, precioConIva: 40.25 + i, personas: 1, beneficios: ['Pesas', 'Cardio'] })) };
  if (ruta.endsWith('/clases')) return { data: [{ id: '1', nombre: 'Boxeo', lugar: 'Sala principal', horarios: [{ dia: 'Lunes', horaInicio: '07:00', horaFin: '09:00' }] }] };
  if (ruta.endsWith('/entrenadores')) return { data: [{ id: '1700000019', nombre: 'Entrenador Uno', especialidad: 'Boxeo' }] };
  if (ruta.endsWith('/gimnasio')) return { servicios: [{ id: 'PES', nombre: 'Pesas', descripcion: 'Zona de pesas' }], horarios: [] };
  if (ruta.endsWith('/niveles')) return cuerpo?.niveles || [{ id: 'PRI', descripcion: 'Principiante' }, { id: 'INT', descripcion: 'Intermedio' }];
  if (ruta.endsWith('/pedidos/mis-pedidos')) return cuerpo?.errorPedidos || { data: [], pagination: { page: 1, totalPages: 1 } };
  if (ruta.endsWith('/inscripciones/mis-inscripciones')) return { data: [] };
  return { data: [] };
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const archivoRelativo = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const archivo = path.resolve(raiz, `.${archivoRelativo}`);
  if (!archivo.startsWith(raiz) || !existsSync(archivo)) {
    res.writeHead(404); res.end('No encontrado'); return;
  }
  try {
    const contenido = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': mime[path.extname(archivo).toLowerCase()] || 'application/octet-stream' });
    res.end(contenido);
  } catch {
    res.writeHead(500); res.end('Error local');
  }
});

await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${servidor.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const contexto = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce' });
  const page = await contexto.newPage();
  const erroresPagina = [];
  page.on('pageerror', (error) => erroresPagina.push(error.message));
  await page.route('http://localhost:5050/**', async (route) => {
    const ruta = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const override = apiOverrides.get(ruta);
    const status = override?.status || 200;
    const body = override?.body ?? datosApi(route.request().url());
    await route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(body) });
  });

  await page.goto(`${base}/index.html#tienda`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.documentElement.classList.contains('pf-posicion-pendiente'));
  await page.waitForSelector('[data-catalogo] .pf-tarjeta');
  const alineacionCarga = await page.evaluate(() => {
    const destino = document.querySelector('#tienda');
    const encabezado = document.querySelector('.pf-encabezado');
    return { top: destino.getBoundingClientRect().top, alto: encabezado.getBoundingClientRect().height, scrollY: scrollY };
  });
  comprobar(Math.abs(alineacionCarga.top - alineacionCarga.alto) <= 2, 'R1: la carga con hash termina bajo el encabezado');
  comprobar(alineacionCarga.scrollY > 0, 'R1: la posición se restaura después de pintar datos dinámicos');
  comprobar(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto'), 'Movimiento reducido desactiva el desplazamiento suave');

  const destinos = ['inicio', 'planes', 'tienda', 'clases', 'rutinas', 'nutricion', 'contacto'];
  for (const origen of destinos) {
    for (const destino of destinos) {
      await page.evaluate((id) => window.scrollTo(0, document.getElementById(id).offsetTop), origen);
      await page.locator(`#menu-principal a[href="#${destino}"]`).click();
      await page.waitForFunction((id) => {
        const destinoEl = document.getElementById(id);
        const encabezado = document.querySelector('.pf-encabezado');
        return Math.abs(destinoEl.getBoundingClientRect().top - encabezado.getBoundingClientRect().height) <= 2;
      }, destino, { timeout: 4000 });
    }
  }
  comprobar(true, 'R2: los 49 saltos entre secciones llegan al destino bajo el encabezado');
  comprobar(await page.locator('#menu-principal a[aria-current="location"]').count() === 1, 'H03: solo una sección del menú queda marcada como actual');

  for (const ancho of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    comprobar(!desborde, `Diseño adaptable sin desbordamiento horizontal a ${ancho}px`);
  }
  await page.evaluate(() => { document.body.style.zoom = '200%'; });
  const desbordeZoom = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  comprobar(!desbordeZoom, 'Diseño adaptable sin desbordamiento horizontal al 200%');
  await page.evaluate(() => { document.body.style.zoom = ''; });

  const contrasteClaro = await page.evaluate(() => {
    const elemento = document.querySelector('[data-catalogo] .text-2xl');
    const rgb = getComputedStyle(elemento).color.match(/\d+/g).map(Number);
    const fondo = getComputedStyle(elemento.closest('.pf-tarjeta')).backgroundColor.match(/\d+/g).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const a = lum(rgb), b = lum(fondo); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  comprobar(contrasteClaro >= 4.5, `R4: precio visible en tema claro (${contrasteClaro.toFixed(2)}:1)`);
  await page.locator('[data-boton-tema]').first().click();
  await page.waitForFunction(() => document.documentElement.dataset.tema === 'oscuro');
  await page.waitForTimeout(250);
  const contrasteOscuro = await page.evaluate(() => {
    const elemento = document.querySelector('[data-catalogo] .text-2xl');
    const rgb = getComputedStyle(elemento).color.match(/\d+/g).map(Number);
    const fondo = getComputedStyle(elemento.closest('.pf-tarjeta')).backgroundColor.match(/\d+/g).map(Number);
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const a = lum(rgb), b = lum(fondo); const reglas=[]; for (const hoja of document.styleSheets) { try { for (const regla of hoja.cssRules) if (regla.selectorText?.includes('.pf-precio') || regla.selectorText?.includes('.text-pf-amarillo')) reglas.push(`${regla.selectorText}=${regla.style.color}`); } catch {} } return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), color: getComputedStyle(elemento).color, fondo: getComputedStyle(elemento.closest('.pf-tarjeta')).backgroundColor, inline: elemento.style.color, tema: document.documentElement.dataset.tema, bootstrap: document.documentElement.dataset.bsTheme, variable: getComputedStyle(document.documentElement).getPropertyValue('--pf-amarillo-texto'), localVariable:getComputedStyle(elemento).getPropertyValue('--pf-amarillo-texto'), bodyVariable:getComputedStyle(document.body).getPropertyValue('--pf-amarillo-texto'), className: elemento.className, reglas };
  });
  comprobar(contrasteOscuro.ratio >= 4.5, `R4: precio visible en tema oscuro (${contrasteOscuro.ratio.toFixed(2)}:1, ${contrasteOscuro.color} sobre ${contrasteOscuro.fondo}, inline ${contrasteOscuro.inline}, ${contrasteOscuro.tema}/${contrasteOscuro.bootstrap}, vars ${contrasteOscuro.variable}/${contrasteOscuro.localVariable}/${contrasteOscuro.bodyVariable}, ${contrasteOscuro.className}, ${contrasteOscuro.reglas.join(' | ')})`);

  const paginasCliente = ['login.html', 'checkout.html', 'nutricion.html', 'mis-pedidos.html'];
  for (const nombre of paginasCliente) {
    const html = readFileSync(path.join(raiz, 'cliente', nombre), 'utf8');
    comprobar(html.includes('href="../admin/login.html"') && html.includes('Acceso administrativo'), `${nombre}: tiene enlace administrativo en su pie`);
    comprobar(html.includes('id="panel-carrito"') && html.includes('aria-labelledby="titulo-panel-carrito"'), `${nombre}: panel de carrito presente en el HTML inicial`);
  }
  comprobar(readFileSync(path.join(raiz, 'index.html'), 'utf8').includes('id="panel-carrito"'), 'Inicio: panel de carrito presente en el HTML inicial');

  await page.goto(`${base}/cliente/login.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#nivel option[value="PRI"]'));
  comprobar(await page.locator('a[href="../admin/login.html"]').count() >= 1, 'R6: el login de cliente conserva el enlace al panel');
  await page.locator('footer a[href="../index.html#tienda"]').click();
  await page.waitForFunction(() => location.hash === '#tienda' && Math.abs(document.querySelector('#tienda').getBoundingClientRect().top - document.querySelector('.pf-encabezado').getBoundingClientRect().height) <= 2, null, { timeout: 6000 });
  comprobar(true, 'R3: Inscripción → Tienda se alinea tras cargar los datos');
  await page.goto(`${base}/cliente/login.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#nivel option[value="PRI"]'));
  await page.locator('[data-abrir-carrito]').click();
  await page.locator('[data-panel-finalizar]').click();
  comprobar(await page.locator('[data-modal-acceso] a[href*="admin/login.html"]').count() === 1, 'R6: el modal de acceso ofrece enlace administrativo');

  apiOverrides.set('/niveles', { status: 200, body: [{ id: 'x" onfocus="window.pwned=true', descripcion: '<img id="xss-nivel" src=x onerror=window.pwned=true>' }] });
  await page.goto(`${base}/cliente/login.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#nivel option:not([value=""])'));
  comprobar(await page.locator('#nivel img#xss-nivel').count() === 0, 'H02: datos de nivel maliciosos no crean nodos HTML');
  comprobar((await page.locator('#nivel option').last().getAttribute('value')).includes('onfocus'), 'H02: el valor malicioso se conserva como texto escapado');

  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const token = `e30.${payload}.sig`;
  await page.addInitScript(({ tokenGuardado }) => {
    sessionStorage.setItem('pf_token', JSON.stringify(tokenGuardado));
    sessionStorage.setItem('usuario', JSON.stringify({ rol: 'user', roles: ['CLI'], nombre: 'Cliente de prueba' }));
  }, { tokenGuardado: token });
  apiOverrides.set('/pedidos/mis-pedidos', { status: 400, body: { mensaje: '<img id="xss-pedido" src=x onerror=window.pwned=true>' } });
  await page.goto(`${base}/cliente/mis-pedidos.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('[data-mis-pedidos]')?.textContent.includes('<img id="xss-pedido"'));
  comprobar(await page.locator('#xss-pedido').count() === 0, 'H01: el mensaje hostil de pedidos se muestra como texto, sin ejecutar HTML');
  apiOverrides.delete('/pedidos/mis-pedidos');

  const paginasAdmin = ['login.html', 'index.html', 'productos.html', 'pedidos.html', 'clientes.html', 'membresias.html', 'inscripciones.html', 'clases.html', 'personal.html', 'usuarios.html', 'tablas.html'];
  for (const nombre of paginasAdmin) {
    const html = readFileSync(path.join(raiz, 'admin', nombre), 'utf8');
    comprobar(html.includes('data-aviso-cookies') && html.includes('data-aviso'), `admin/${nombre}: avisos presentes sin depender de JavaScript`);
    comprobar(html.includes('logo-planeta.png'), `admin/${nombre}: usa el logo oficial`);
  }
  comprobar(!readFileSync(path.join(raiz, 'views/tema.view.js'), 'utf8').includes('storage.model'), 'H11: la vista de tema no accede al almacenamiento');
  comprobar(erroresPagina.length === 0, `Consola: no hubo errores de ejecución (${erroresPagina.join('; ') || 'ninguno'})`);
  await contexto.close();

  comprobar(readFileSync(path.join(raiz, 'assets/js/identidad.js'), 'utf8').includes('window.tailwind = window.tailwind || {};'), 'H04: Tailwind tiene un respaldo si el CDN no carga');
  console.log(`\nPrueba de auditoría 3: ${correctas} comprobaciones pasaron.`);
} finally {
  await browser.close();
  await new Promise((resolve) => servidor.close(resolve));
}
