import './admin.controller.js';
import { comprasModel, lista as extraer } from '../models/fase2.model.js';
import { adminModel } from '../models/admin.model.js';
import { txt, dinero, fecha, estado } from '../views/lista-api.view.js';
import { confirmarAccion } from './dialogo.controller.js';
import { iniciarPantalla } from './admin-generico.controller.js';
import { puede } from '../models/permisos.model.js';
import { crearLista, formulario, verDetalle, enlazarBoton } from './lista-api.controller.js';

const ESTADOS = { P: 'Pendiente', A: 'Autorizada', M: 'Recibida parcialmente', R: 'Recibida completa', X: 'Anulada' };
const AYUDA_LINEAS = 'Una línea por producto: código, cantidad, costo unitario. Ejemplo: PF0001, 10, 12.50';
const AYUDA_RECEPCION = 'Una línea por producto: código, cantidad, costo unitario, caducidad (AAAA-MM-DD, si aplica). Ejemplo: PF0001, 5, 12.50, 2027-06-30';

// Convierte las líneas escritas en el área de texto; devuelve un mensaje si alguna no es válida.
function leerLineas(texto, conCaducidad) {
  const items = [];
  for (const [n, linea] of String(texto).split('\n').map((l) => l.trim()).filter(Boolean).entries()) {
    const [productoId, cantidad, costoUnit, fechaCaducidad] = linea.split(',').map((x) => x.trim());
    if (!productoId || !(Number(cantidad) > 0) || !(Number(costoUnit) >= 0) || (fechaCaducidad && !/^\d{4}-\d{2}-\d{2}$/.test(fechaCaducidad))) return { error: `Revisa la línea ${n + 1}: ${linea}` };
    items.push({ productoId, cantidad: Number(cantidad), costoUnit: Number(costoUnit), ...(conCaducidad && fechaCaducidad ? { fechaCaducidad } : {}) });
  }
  return items.length ? { items } : { error: 'Escribe al menos una línea.' };
}

const tabla = crearLista({
  raiz: '#pantalla-compras', filtros: '#filtros-pantalla-compras', caption: 'Órdenes de compra',
  cargar: (p) => comprasModel.listar(p),
  columnas: [['N.º', (o) => txt(o.id)], ['Proveedor', (o) => txt(o.proveedor?.nombre || o.proveedor || o.proveedorId)], ['Fecha', (o) => fecha(o.fecha)], ['Entrega', (o) => fecha(o.fechaEntrega)], ['Líneas', (o) => txt(o.lineas)], ['Monto', (o) => dinero(o.monto)], ['Estado', (o) => estado(ESTADOS, o.estado)]],
  acciones: (o) => [
    { texto: 'Detalle', permiso: 'compras', etiqueta: `Detalle de la orden ${o.id}`, ejecutar: () => verDetalle(`Orden de compra ${o.id}`, () => comprasModel.detalle(o.id)) },
    o.estado === 'P' && { texto: 'Autorizar', permiso: 'compras:gestionar', tono: 'btn-primary', etiqueta: `Autorizar la orden ${o.id}`, ejecutar: async () => (await confirmarAccion({ titulo: `Autorizar la orden ${o.id}`, mensaje: 'Solo un ADM puede autorizar. Después se podrá recibir la mercadería.', textoConfirmar: 'Autorizar', tono: 'primario', alConfirmar: () => comprasModel.autorizar(o.id) }) ? 'Orden autorizada.' : null) },
    ['A', 'M'].includes(o.estado) && { texto: 'Recibir', permiso: 'compras:gestionar', etiqueta: `Recibir mercadería de la orden ${o.id}`, ejecutar: () => formulario({
      titulo: `Recibir mercadería de la orden ${o.id}`, textoConfirmar: 'Registrar recepción', mensaje: 'Puedes recibir todo o solo una parte.',
      campos: [{ nombre: 'lineas', etiqueta: 'Líneas recibidas', tipo: 'textarea', requerido: true, ayuda: AYUDA_RECEPCION }, { nombre: 'observacion', etiqueta: 'Observación', tipo: 'textarea', maxlength: 200 }],
      validarExtra: (_, v) => { const fallo = leerLineas(v.lineas, true).error; return fallo ? { campo: 'lineas', mensaje: fallo } : null; },
      alConfirmar: (v) => comprasModel.recibir(o.id, { items: leerLineas(v.lineas, true).items, ...(v.observacion ? { observacion: v.observacion.trim() } : {}) }), exito: 'Recepción registrada.' }) },
    ['P', 'A'].includes(o.estado) && { texto: 'Anular', permiso: 'compras:gestionar', tono: 'btn-outline-danger', etiqueta: `Anular la orden ${o.id}`, ejecutar: async () => (await confirmarAccion({ titulo: `Anular la orden ${o.id}`, mensaje: 'Esta acción no se puede deshacer.', textoConfirmar: 'Anular orden', alConfirmar: () => comprasModel.anular(o.id) }) ? 'Orden anulada.' : null) }
  ]
});

enlazarBoton('[data-nueva-compra]', 'compras:gestionar', async () => {
  let proveedores = [];
  try { proveedores = extraer(await adminModel.tablaOpciones('proveedor')); } catch { proveedores = []; }
  const m = await formulario({
    titulo: 'Nueva orden de compra', textoConfirmar: 'Crear orden',
    campos: [{ nombre: 'proveedorId', etiqueta: 'Proveedor', tipo: 'select', requerido: true, opciones: [{ valor: '', texto: 'Selecciona el proveedor' }, ...proveedores.map((x) => ({ valor: x.valor ?? x.id, texto: x.texto ?? x.descripcion ?? x.id }))] },
      { nombre: 'fechaEntrega', etiqueta: 'Fecha de entrega esperada', tipo: 'date' }, { nombre: 'lineas', etiqueta: 'Líneas', tipo: 'textarea', requerido: true, ayuda: AYUDA_LINEAS }],
    validarExtra: (_, v) => { const fallo = leerLineas(v.lineas, false).error; return fallo ? { campo: 'lineas', mensaje: fallo } : null; },
    alConfirmar: (v) => comprasModel.crear({ proveedorId: v.proveedorId, ...(v.fechaEntrega ? { fechaEntrega: v.fechaEntrega } : {}), items: leerLineas(v.lineas, false).items }),
    exito: 'Orden de compra creada. Un ADM debe autorizarla.'
  });
  if (m) tabla?.recargar();
  return m;
});

// Pestaña de proveedores con el panel genérico (tabla proveedor); se oculta si el rol no puede leerla.
if (puede(['compras:gestionar', 'tablas:leer', 'compras'])) iniciarPantalla({ raiz: '#pantalla-proveedor', tabla: 'proveedor', titulo: 'Proveedores', permisoEscritura: 'compras:gestionar', mensajeExito: 'Registro guardado.' });
else document.querySelector('#pantalla-proveedor')?.setAttribute('hidden', '');
