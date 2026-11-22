/**
 * Contrato básico con la API publicada (solo peticiones GET de lectura).
 *
 * - Despierta Render con /salud (hasta 90 s, con reintentos).
 * - Las rutas públicas que usa el sitio responden 200 con la forma esperada.
 * - Las rutas protegidas responden 401 sin token (existen y piden sesión).
 * - Avisa si alguna ruta de la fase 2 no responde (no falla: Render puede estar despertando).
 *
 * Si el servidor no responde, avisa sin fallar: el frontend tiene respaldo
 * local del catálogo y no debe bloquear un despliegue por una caída externa.
 * Si responde con una forma distinta a la esperada, falla.
 *
 * Ejecutar con: node pruebas/verificar-api.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizRepo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = readFileSync(join(raizRepo, 'frontend/models/config.js'), 'utf8');
const BASE = (/API_BASE_URL\s*=\s*'([^']+)'/.exec(config) || [])[1];
const enActions = Boolean(process.env.GITHUB_ACTIONS);
let fallos = 0;
function comprobar(descripcion, condicion, extra = '') {
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${descripcion}${extra ? ' -> ' + extra : ''}`);
  if (!condicion) fallos += 1;
}
const aviso = (texto) => console.log(enActions ? `::warning::${texto}` : `AVISO ${texto}`);

async function obtener(ruta, espera = 30000) {
  const respuesta = await fetch(`${BASE}${ruta}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(espera) });
  let cuerpo = null;
  try { cuerpo = await respuesta.json(); } catch { cuerpo = null; }
  return { status: respuesta.status, cuerpo };
}

comprobar('API_BASE_URL definida en models/config.js', Boolean(BASE), BASE);
let despierto = false;
for (let intento = 1; intento <= 3 && !despierto; intento += 1) {
  try {
    const { status } = await obtener('/salud', 90000);
    despierto = status === 200;
    console.log(`INFO /salud intento ${intento}: ${status}`);
  } catch (error) {
    console.log(`INFO /salud intento ${intento}: ${error.message}`);
  }
}

if (!despierto) {
  aviso(`La API ${BASE} no respondió a /salud. Se omite la verificación del contrato; el sitio usa su respaldo local.`);
  process.exit(0);
}

const lista = (c) => (Array.isArray(c) ? c : c?.data);
const PUBLICAS = [
  ['/productos', (c) => Array.isArray(lista(c)) && lista(c).every((p) => p.id && p.nombre !== undefined)],
  ['/membresias', (c) => Array.isArray(lista(c)) && lista(c).every((m) => m.id && m.personas !== undefined)],
  ['/clases', (c) => Array.isArray(lista(c))],
  ['/categorias', (c) => Array.isArray(lista(c))]
];
for (const [ruta, forma] of PUBLICAS) {
  try {
    const { status, cuerpo } = await obtener(ruta);
    comprobar(`GET ${ruta} responde 200`, status === 200, String(status));
    comprobar(`GET ${ruta} tiene la forma que usa el frontend`, status === 200 && forma(cuerpo));
  } catch (error) { comprobar(`GET ${ruta} responde`, false, error.message); }
}

const PROTEGIDAS = ['/auth/me', '/pedidos', '/pedidos/mis-pedidos', '/inscripciones/mis-inscripciones', '/admin/resumen', '/admin/tablas'];
for (const ruta of PROTEGIDAS) {
  try {
    const { status, cuerpo } = await obtener(ruta);
    comprobar(`GET ${ruta} sin token responde 401`, status === 401, String(status));
    comprobar(`GET ${ruta} devuelve un mensaje de error`, typeof cuerpo?.mensaje === 'string');
  } catch (error) { comprobar(`GET ${ruta} responde`, false, error.message); }
}

const FASE2 = ['/admin/usuarios', '/admin/gimnasio', '/admin/caja/turnos/actual', '/admin/clientes', '/admin/inscripciones', '/admin/aforo', '/admin/entradas', '/admin/ventas', '/admin/facturas', '/admin/inventario/lotes', '/admin/compras', '/admin/rutinas', '/admin/mensajes', '/notificaciones', '/admin/reportes/ventas', '/admin/personal/asistencia', '/rutinas/mi-rutina'];
const publicadas = [];
for (const ruta of FASE2) {
  try { const { status } = await obtener(ruta); if (status !== 404) publicadas.push(ruta); } catch { /* sin respuesta: se considera no publicada */ }
}
console.log(`INFO Rutas de la fase 2 publicadas: ${publicadas.length} de ${FASE2.length}${publicadas.length ? ` (${publicadas.join(', ')})` : ''}`);
const faltan = FASE2.filter((r) => !publicadas.includes(r));
if (faltan.length) aviso(`Rutas de la fase 2 que el backend no responde (404): ${faltan.join(', ')}. Las pantallas que las usan mostrarán error.`);

console.log(`\n${fallos === 0 ? 'OK' : 'FALLA'} API: ${fallos} fallo(s).`);
process.exit(fallos ? 1 : 0);
