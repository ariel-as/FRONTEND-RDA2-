/**
 * Prueba de humo en navegador (Chromium con Playwright).
 *
 * Sirve frontend/ en un puerto local, simula la API (sin tocar el backend real)
 * y abre cada página con sesiones de ADM, REC, CON y cliente. Falla si:
 * - hay errores de JavaScript o módulos que no cargan;
 * - una página no tiene exactamente un h1 visible;
 * - una pantalla sin permiso hace peticiones a la API;
 * - fallan los recorridos clave: menú por rol, diálogo propio con Escape y
 *   retorno de foco, validación del comprobante en pedidos y checkout;
 * - fallan los recorridos de la fase 3, el diseño adaptable, los temas,
 *   las reglas de axe-core o las rutas sin parámetros inválidos.
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
const BASE_API = (/API_URL_LOCAL\s*=\s*'([^']+)'/.exec(readFileSync(join(frontend, 'models/config.js'), 'utf8')) || [])[1];
const axeSource = readFileSync(join(raizRepo, 'node_modules/axe-core/axe.min.js'), 'utf8');
const PUERTO = 5600 + Math.floor(Math.random() * 300);
const SITIO = `http://127.0.0.1:${PUERTO}/`;

const USUARIOS = {
  ADM: { id: 1, login: 'adm@pf.ec', rol: 'admin', roles: ['ADM'] },
  REC: { id: 2, login: 'rec@pf.ec', rol: 'staff', roles: ['REC'], permisos: ['resumen:ver', 'gimnasio:leer', 'catalogos:leer', 'empleados:leer', 'asistencia:marcar', 'clientes:leer', 'clientes:editar', 'planes:leer', 'inscripciones:leer', 'inscripciones:gestionar', 'entradas:gestionar', 'aforo:ver', 'clases:leer', 'rutinas:leer', 'aliados:leer', 'aliados:cobrar', 'inventario:leer', 'pedidos:leer', 'pedidos:gestionar', 'ventas:leer', 'ventas:crear', 'facturas:leer', 'facturas:generar', 'caja:operar', 'caja:leer', 'mensajes:gestionar', 'reportes:clientes', 'reportes:entradas'] },
  ENT: { id: 5, empleadoId: 5, login: 'ent@pf.ec', rol: 'staff', roles: ['ENT'], permisos: ['*'], nombre: 'Elena', cedula: '1712345676', correo: 'ent@pf.ec' },
  REC_SIN_PERMISOS: { id: 3, login: 'rec2@pf.ec', rol: 'staff', roles: ['REC'] },
  CON: { id: 4, login: 'con@pf.ec', rol: 'staff', roles: ['CON'], permisos: ['resumen:ver', 'gimnasio:leer', 'catalogos:leer', 'empleados:leer', 'asistencia:reporte', 'clientes:leer', 'planes:leer', 'inscripciones:leer', 'aliados:leer', 'aliados:cobrar', 'inventario:leer', 'compras:leer', 'pedidos:leer', 'ventas:leer', 'facturas:leer', 'facturas:generar', 'facturas:sri', 'caja:leer', 'caja:cierre', 'reportes:clientes', 'reportes:entradas', 'reportes:todos', 'tablas:leer'] },
  CLI: { id: 9, login: 'cli@pf.ec', rol: 'user', roles: ['CLI'], nombre: 'Ana', cedula: '1710034065', correo: 'cli@pf.ec' }
};
const PEDIDOS = [
  { id: 11, estado: 'P', metodoPago: 'EF', total: 20, createdAt: '2026-11-20T10:00:00Z', usuario: { login: 'c@x' }, detalles: [] },
  { id: 12, estado: 'R', metodoPago: 'TR', refTransferencia: 'ABC123', total: 30, createdAt: '2026-11-20T10:00:00Z', usuario: { login: 'c@x' }, detalles: [] },
  { id: 13, estado: 'C', metodoPago: 'TR', total: 40, createdAt: '2026-11-20T10:00:00Z', usuario: { login: 'c@x' }, detalles: [] },
  { id: 14, estado: 'P', metodoPago: 'TR', total: 25, createdAt: '2026-11-20T10:00:00Z', usuario: { login: 'c@x' }, detalles: [] }
];
const LOTES_FASE3 = [
  { id: 'L-001', productoId: 'PF0001', producto: { nombre: 'Barra Proteica' }, categoriaId: 'C1', cantidad: 18, cantidadDisponible: 18, fechaIngreso: '2026-11-01', fechaCaducidad: '2026-12-20', diasParaCaducar: 25, metodoSalida: 'FEFO', estado: 'D' },
  { id: 'L-002', productoId: 'PF0002', producto: { nombre: 'Aceite de coco' }, categoriaId: 'C2', cantidad: 4, cantidadDisponible: 4, fechaIngreso: '2026-09-01', fechaCaducidad: '2026-11-10', diasParaCaducar: -15, metodoSalida: 'FEFO', estado: 'B' },
  { id: 'L-003', productoId: 'PF0003', producto: { nombre: 'Camiseta PF' }, categoriaId: 'C3', cantidad: 30, cantidadDisponible: 30, fechaIngreso: '2026-10-01', fechaCaducidad: '', diasParaCaducar: null, metodoSalida: 'FIFO', estado: 'A' }
];
const PRODUCTOS_FASE3 = [
  { id: 'PF0001', codigo: 'PF0001', nombre: 'Barra Proteica', categoriaId: 'C1', tipoInventario: 'FEFO', proximaCaducidad: '2026-12-20', diasParaCaducar: 25, stock: 18, stockMin: 8, estado: 'A' },
  { id: 'PF0002', codigo: 'PF0002', nombre: 'Aceite de coco', categoriaId: 'C2', tipoInventario: 'FEFO', proximaCaducidad: '2026-11-10', diasParaCaducar: -15, stock: 4, stockMin: 6, estado: 'A' },
  { id: 'PF0003', codigo: 'PF0003', nombre: 'Camiseta PF', categoriaId: 'C3', tipoInventario: 'FIFO', proximaCaducidad: '', diasParaCaducar: null, stock: 2, stockMin: 5, estado: 'A' }
];
const RUTINA_FASE3 = {
  cedula: '1712345675', nombre: 'Ana Pérez', correo: 'ana@pf.ec', nivel: 'Intermedio', nivelId: 'INT',
  planActivo: { id: 'M1', nombre: 'Plan 4 sesiones', incluyeRutina: true, fechaFin: '2026-12-31' },
  rutinaVigente: { id: 9001, objetivo: 'Tonificar', nivel: 'Intermedio', nivelId: 'INT', fechaInicio: '2026-11-25', fechaFin: '2026-12-23', entrenador: 'Entrenador', empleadoId: 5, detalle: { dias: [{ dia: 'Lunes', filas: [{ ejercicio: 'Sentadilla', series: '3', repeticiones: '12', descanso: '60 s', nota: '' }] }, { dia: 'Miércoles', filas: [{ ejercicio: 'Zancadas', series: '3', repeticiones: '10', descanso: '60 s', nota: '' }] }] } }
};
const RUTINA_CLIENTE_FASE3 = {
  id: 9001, objetivo: 'Tonificar', nivel: 'INT', fechaInicio: '2026-11-25', fechaFin: '2026-12-23', entrenador: { nombre: 'Entrenador' },
  dias: [{ dia: 'Lunes', detalle: 'Sentadilla · 3 series · 12 repeticiones' }, { dia: 'Miércoles', detalle: 'Zancadas · 3 series · 10 repeticiones' }]
};

function respuestaSimulada(url, usuario, metodo = 'GET') {
  const ruta = new URL(url).pathname.replace(/^.*\/api\/v1/, '');
  if (ruta === '/auth/me') return usuario;
  if (ruta === '/salud') return { status: 'ok' };
  if (ruta === '/admin/resumen') return { productosActivos: 3, bajoStock: 2, porCaducar: 1, caducados: 1, rutinas: 1 };
  if (ruta === '/admin/aforo') return { personasAdentro: 12, aforoMax: 40 };
  if (ruta === '/pedidos' || ruta === '/pedidos/mis-pedidos') return { data: PEDIDOS, pagination: { page: 1, totalPages: 1, total: 3 } };
  if (ruta === '/inscripciones/mis-inscripciones') return [{ id: 5, plan: 'Plan para 2 personas', fechaInicio: '2026-11-01', fechaFin: '2026-12-01', estado: 'A', valor: 60 }];
  if (ruta === '/membresias') return [{ id: 'MI2', nombre: 'Plan para 2 personas', personas: 2, precio: 60, precioConIva: 60, porcentajeIva: 0, beneficios: [] }];
  if (ruta === '/admin/membresias') return { data: [{ id: 'MI2', nombre: 'Plan para 2 personas', personas: 2, precio: 60, precioConIva: 60, porcentajeIva: 0, beneficios: [], enLaWeb: 'Sí', estado: 'A' }, { id: 'PD', nombre: 'Pase diario', personas: 1, precio: 3, precioConIva: 3, porcentajeIva: 0, beneficios: ['Entrada diaria'], enLaWeb: 'No', estado: 'A' }], pagination: { page: 1, totalPages: 1, total: 2 } };
  if (ruta === '/admin/inventario/lotes') return { data: LOTES_FASE3, pagination: { page: 1, totalPages: 1, total: 3 } };
  if (ruta === '/admin/productos') return { data: PRODUCTOS_FASE3, pagination: { page: 1, totalPages: 1, total: 3 } };
  if (ruta === '/admin/inventario/alertas') return { porCaducar: [LOTES_FASE3[0]], caducadosConUnidades: [LOTES_FASE3[1]], sinStockYMinimo: [PRODUCTOS_FASE3[2]] };
  if (ruta === '/admin/entradas') return { data: [{ id: 40, cliente: 'Consumidor final', fecha: '2026-11-25T10:00:00Z', metodoPago: 'EF', total: 3 }], pagination: { page: 1, totalPages: 1, total: 1 } };
  if (metodo === 'POST' && ruta === '/admin/entradas/pase-diario') return { id: 41, fecha: '2026-11-25T10:05:00Z', metodoPago: 'EF', total: 3 };
  if (/^\/admin\/clientes\/\d+\/acceso$/.test(ruta)) return { nombre: 'Ana Pérez', cliente: { nombre: 'Ana Pérez' } };
  if (ruta === '/admin/rutinas') return { data: [{ id: 9001, cliente: 'Ana Pérez', nivel: 'INT', fechaInicio: '2026-11-25', fechaFin: '2026-12-23', estado: 'Vigente', empleadoId: 5, detalle: RUTINA_FASE3.rutinaVigente.detalle }], pagination: { page: 1, totalPages: 1, total: 1 } };
  if (ruta === '/admin/rutinas/cliente/1712345676') return { ...RUTINA_FASE3, rutinaVigente: null };
  if (ruta === '/admin/rutinas/9001') return RUTINA_FASE3.rutinaVigente;
  if (ruta.startsWith('/admin/rutinas/cliente/')) return RUTINA_FASE3;
  if (ruta === '/admin/rutinas/ejercicios') return { data: [{ id: 1, nombre: 'Sentadilla', grupoMuscular: 'Piernas' }, { id: 2, nombre: 'Press banca', grupoMuscular: 'Pecho' }], pagination: { page: 1, totalPages: 1, total: 2 } };
  if (ruta === '/admin/rutinas/plantillas') return { data: [{ id: 1, nivel: 'INT', objetivo: 'Tonificar', detalle: { dias: [{ dia: 'Lunes', filas: [{ ejercicio: 'Sentadilla', series: '3', repeticiones: '12', descanso: '60 s', nota: '' }] }] } }], pagination: { page: 1, totalPages: 1, total: 1 } };
  if (ruta === '/rutinas/mi-rutina') return RUTINA_CLIENTE_FASE3;
  if (/\/meta$/.test(ruta)) return { columnas: [{ nombre: 'id', tipo: 'String', esId: true }, { nombre: 'nombre', tipo: 'String' }], idCampos: ['id'] };
  if (/\/opciones$/.test(ruta)) return [];
  if (ruta.startsWith('/admin/tablas')) return { data: [{ id: '1', nombre: 'Registro' }], pagination: { page: 1, totalPages: 1 } };
  if (ruta.startsWith('/admin/facturas')) return { data: [{ id: 1, numero: '001-001-000000001', cliente: 'Ana Pérez', total: 12, estado: 'P' }], pagination: { page: 1, totalPages: 1, total: 1 } };
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
  const rutasMal = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errores.push(m.text()); });
  await contexto.route(`${BASE_API}/**`, async (route) => {
    const u = new URL(route.request().url());
    const ruta = u.pathname.replace(/^.*\/api\/v1/, '');
    const metodo = route.request().method();
    llamadas.push(`${metodo} ${ruta}${u.search}`);
    if (ruta === '/admin/productos' && (u.searchParams.has('porCaducar') || u.searchParams.get('orden') === 'nombre')) rutasMal.push(`${ruta}: parámetros no aceptados`);
    if (ruta === '/admin/inventario/lotes' && [...u.searchParams].some(([nombre, valor]) => ['tipoInventario', 'caducidadDesde', 'caducidadHasta'].includes(nombre) || valor === '')) rutasMal.push(`${ruta}: parámetros no aceptados`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respuestaSimulada(u.href, USUARIOS[rol], metodo)) });
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
  if (rutasMal.length) detalle += ` rutas: ${rutasMal.join(' | ')}`;
  if (errores.length) detalle += ` errores JS: ${errores.join(' | ')}`;
  const ok = !detalle;
  if (!ok) fallos += 1;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${String(rol ?? 'sin sesión').padEnd(16)} ${pagina}${ok ? '' : ' ->' + detalle}`);
  await contexto.close();
}

async function revisarFase3(page, llamadas, esperados = []) {
  const problemas = [];
  for (const ancho of [1440, 375]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    for (const tema of ['claro', 'oscuro']) {
      await page.evaluate((valor) => {
        document.documentElement.setAttribute('data-tema', valor);
        document.documentElement.setAttribute('data-bs-theme', valor === 'claro' ? 'light' : 'dark');
      }, tema);
      await page.waitForTimeout(60);
      const desborde = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
      if (desborde > 2) problemas.push(`desborde ${ancho}px/${tema}: ${desborde}px`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const tablasCortadas = await page.evaluate(() => [...document.querySelectorAll('table')].filter((t) => {
    const contenedor = t.parentElement || t;
    return t.scrollWidth > contenedor.clientWidth + 2 && getComputedStyle(contenedor).overflowX === 'visible';
  }).length);
  if (tablasCortadas) problemas.push(`tablas cortadas: ${tablasCortadas}`);
  const texto = await page.evaluate(() => document.body.innerText);
  const faltan = esperados.filter((fragmento) => !texto.includes(fragmento));
  if (faltan.length) problemas.push(`texto ausente: ${faltan.join(', ')}`);
  if (llamadas.some((llamada) => /\s[45]\d\d$|\s5\d\d$/.test(llamada))) problemas.push('respuestas 4xx/5xx');
  await page.addScriptTag({ content: axeSource });
  const violaciones = await page.evaluate(async () => {
    const resultado = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return resultado.violations.map((v) => `${v.id}:${v.nodes.length}`);
  });
  if (violaciones.length) problemas.push(`axe: ${violaciones.join(', ')}`);
  return problemas.length ? problemas.join('; ') : true;
}

for (const pagina of paginas('admin').filter((p) => !p.endsWith('login.html'))) {
  for (const rol of ['ADM', 'REC', 'CON']) await visitar(rol, pagina);
}
await visitar(null, 'admin/login.html');
for (const pagina of [...paginas('cliente'), 'index.html']) await visitar('CLI', pagina);

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

await visitar('ADM', 'admin/pedidos.html', async (page, llamadas) => {
  const boton = page.locator('[data-reportar="14"]');
  await boton.click();
  const dentro = await page.evaluate(() => { const d = document.querySelector('dialog.pf-dialogo'); return Boolean(d?.open && d.contains(document.activeElement)); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const foco = await page.evaluate(() => !document.querySelector('dialog.pf-dialogo') && document.activeElement?.dataset.reportar === '14');
  await boton.click();
  await page.fill('dialog input[name="refTransferencia"]', 'AB');
  await page.click('[data-dialogo-confirmar]');
  const invalido = await page.locator('dialog [aria-invalid="true"]').count();
  await page.fill('dialog input[name="refTransferencia"]', 'ABCD-12');
  await page.click('[data-dialogo-confirmar]');
  await page.waitForTimeout(300);
  return (dentro && foco && invalido === 1 && llamadas.includes('PATCH /pedidos/14/estado')) || `dentro=${dentro} foco=${foco} invalido=${invalido}`;
});

await visitar('CLI', 'cliente/checkout.html', async (page) => {
  await page.evaluate(() => localStorage.setItem('carrito', JSON.stringify([{ id: 'PF0001', nombre: 'Producto', precio: 10, cantidad: 1, stock: 5, tipo: 'producto' }])));
  await page.reload();
  await page.waitForTimeout(500);
  if (!(await page.locator('#formulario-checkout').isVisible())) return true;
  await page.check('input[name="metodoPago"][value="TR"]');
  const requerido = await page.locator('#refTransferencia').evaluate((e) => e.required && !e.disabled);
  return requerido || 'el comprobante no es obligatorio con transferencia';
});

const PANTALLAS_ADM_FASE3 = [
  ['admin/index.html', ['Productos a la venta']],
  ['admin/inventario.html', ['Barra Proteica']],
  ['admin/productos.html', ['Barra Proteica', 'Caducado']],
  ['admin/entradas.html', ['Cobrar pase diario']],
  ['admin/membresias.html', ['Pase diario']],
  ['admin/inscripciones.html', ['Inscripciones']],
  ['admin/facturas.html', ['Facturas']],
  ['admin/rutinas.html', ['Rutinas', 'Mis clientes con rutina']]
];
for (const [pagina, esperados] of PANTALLAS_ADM_FASE3) {
  await visitar('ADM', pagina, (page, llamadas) => revisarFase3(page, llamadas, esperados));
  await visitar('ENT', pagina, (page, llamadas) => revisarFase3(page, llamadas, esperados));
}
await visitar('CLI', 'cliente/mi-cuenta.html', (page, llamadas) => revisarFase3(page, llamadas, ['Tonificar', 'Sentadilla']));

await visitar('ADM', 'admin/productos.html', async (page, llamadas) => {
  await page.selectOption('#filtro-estado', 'porCaducar');
  await page.selectOption('#filtro-orden', 'caducidad');
  await page.waitForTimeout(300);
  const porCaducar = await page.locator('tbody[data-tabla-productos] tr').count();
  await page.selectOption('#filtro-estado', 'caducados');
  await page.waitForTimeout(300);
  const caducados = await page.locator('tbody[data-tabla-productos] tr').count();
  await page.selectOption('#filtro-estado', 'A');
  await page.selectOption('#filtro-orden', 'nombre');
  await page.waitForTimeout(300);
  return (porCaducar === 1 && caducados === 1 && llamadas.some((l) => l.includes('orden=caducidad'))) || `porCaducar=${porCaducar} caducados=${caducados}`;
});

await visitar('ADM', 'admin/entradas.html', async (page, llamadas) => {
  await page.click('[data-pase-diario]');
  await page.waitForSelector('dialog.pf-dialogo[open]');
  await page.fill('dialog input[name="clienteId"]', '');
  await page.click('[data-dialogo-confirmar]');
  await page.waitForTimeout(300);
  return (llamadas.includes('POST /admin/entradas/pase-diario') && await page.locator('dialog [data-imprimir-pase]').isVisible()) || 'pase diario sin cédula no registrado';
});

await visitar('ADM', 'admin/entradas.html', async (page, llamadas) => {
  await page.click('[data-pase-diario]');
  await page.waitForSelector('dialog.pf-dialogo[open]');
  await page.fill('dialog input[name="clienteId"]', '1712345675');
  await page.waitForTimeout(250);
  const cliente = await page.locator('[data-cliente-pase]').innerText();
  await page.selectOption('dialog select[name="metodoPago"]', 'TR');
  await page.fill('dialog input[name="referencia"]', 'AB');
  await page.click('[data-dialogo-confirmar]');
  const invalido = await page.locator('dialog [aria-invalid="true"]').count();
  await page.fill('dialog input[name="referencia"]', 'AB-1234');
  await page.click('[data-dialogo-confirmar]');
  await page.waitForTimeout(300);
  return (cliente.includes('Ana Pérez') && invalido === 1 && llamadas.includes('POST /admin/entradas/pase-diario')) || `cliente=${cliente} invalido=${invalido}`;
});

await visitar('ADM', 'admin/rutinas.html', async (page, llamadas) => {
  await page.fill('#rutina-cedula', '1712345675');
  await page.click('#form-rutina-cliente button[type="submit"]');
  await page.waitForSelector('#ficha-cliente:not([hidden])');
  await page.click('[data-editar-rutina]');
  await page.waitForSelector('dialog [data-editor-rutina]');
  const dias = await page.locator('dialog [data-dias-rutina] section').count();
  await page.click('dialog [data-accion="subir-dia"][data-dia="1"]');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.click('[data-ver-rutina]');
  await page.waitForSelector('dialog .pf-rutina-vista');
  const correo = await page.locator('dialog [data-enviar-rutina]').isEnabled();
  const imprimir = await page.locator('dialog [data-imprimir-rutina]').isVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.fill('#rutina-cedula', '1712345676');
  await page.click('#form-rutina-cliente button[type="submit"]');
  await page.waitForTimeout(250);
  const asignar = await page.locator('[data-asignar-rutina]').isVisible();
  await page.click('[data-asignar-rutina]');
  await page.waitForSelector('dialog [data-editor-rutina]');
  return (dias >= 2 && correo && imprimir && asignar && llamadas.includes('GET /admin/rutinas/cliente/1712345675')) || `dias=${dias} correo=${correo} imprimir=${imprimir} asignar=${asignar}`;
});

await visitar('ENT', 'admin/rutinas.html', async (page) => {
  await page.fill('#rutina-cedula', '1712345675');
  await page.click('#form-rutina-cliente button[type="submit"]');
  await page.waitForSelector('#ficha-cliente:not([hidden])');
  const editar = await page.locator('[data-editar-rutina]').isVisible();
  await page.click('[data-editar-rutina]');
  await page.waitForSelector('dialog [data-editor-rutina]');
  const plantillas = await page.locator('dialog select[name="nivelId"]').count();
  await page.keyboard.press('Escape');
  return (editar && plantillas === 1) || `editar=${editar} plantillas=${plantillas}`;
});

await navegador.close();
servidor.kill();
console.log(`\n${fallos === 0 ? 'OK' : 'FALLA'} Prueba de humo: ${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
