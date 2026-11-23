import './admin.controller.js';
import { inventarioModel } from '../models/fase2.model.js';
import { adminModel } from '../models/admin.model.js';
import { puede } from '../models/permisos.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, dinero, fecha, estado } from '../views/lista-api.view.js';
import { confirmarAccion } from './dialogo.controller.js';
import { crearLista, formulario, enlazarBoton } from './lista-api.controller.js';

// Costos solo para quien gestiona inventario o compras, o ve todos los reportes (recepción no los ve).
const VER_COSTOS = puede(['inventario:gestionar', 'compras', 'reportes:todos']);
const ESTADOS_LOTE = { D: 'Disponible', I: 'Bloqueado', C: 'Caducado o dado de baja' };
let productos = [];

export async function cargarProductosInventario() {
  try { const r = await adminModel.productos({ limit: 100 }); productos = r?.data || r || []; } catch { productos = []; }
  document.querySelectorAll('[data-productos]').forEach((s) => {
    const primera = s.querySelector('option')?.outerHTML || '';
    s.innerHTML = primera + productos.map((p) => `<option value="${escapar(p.id)}">${escapar(p.nombre)} (${escapar(p.id)})</option>`).join('');
  });
}
const opcionesProducto = () => [{ valor: '', texto: 'Selecciona un producto' }, ...productos.map((p) => ({ valor: p.id, texto: `${p.nombre} (${p.id})` }))];
const nombreProducto = (id) => productos.find((p) => String(p.id) === String(id))?.nombre || id;

const lotes = crearLista({
  raiz: '#pantalla-lotes', filtros: '#filtros-lotes', caption: 'Lotes de productos',
  cargar: (p) => inventarioModel.lotes(p),
  extraer: (r) => (Array.isArray(r) ? r : (r?.data || [])).sort((a, b) => String(a.producto?.nombre || nombreProducto(a.productoId)).localeCompare(String(b.producto?.nombre || nombreProducto(b.productoId)), 'es') || String(a.fechaCaducidad || '9999').localeCompare(String(b.fechaCaducidad || '9999'))),
  columnas: [['Lote', (l) => txt(l.id)], ['Producto', (l) => txt(l.producto?.nombre || l.producto || nombreProducto(l.productoId))], ['Ingreso', (l) => fecha(l.fechaIngreso)], ['Caducidad', (l) => (l.fechaCaducidad ? fecha(l.fechaCaducidad) : txt('No caduca'))],
    ['Disponible', (l) => txt(`${l.cantidadDisponible ?? ''} de ${l.cantidadInicial ?? ''}`)], ...(VER_COSTOS ? [['Costo unitario', (l) => dinero(l.costoUnit)]] : []), ['Estado', (l) => estado(ESTADOS_LOTE, l.estado)]],
  acciones: (l) => [
    l.estado !== 'C' && { texto: l.estado === 'I' ? 'Desbloquear' : 'Bloquear', permiso: 'inventario:gestionar', etiqueta: `${l.estado === 'I' ? 'Desbloquear' : 'Bloquear'} el lote ${l.id}`,
      ejecutar: async () => (await confirmarAccion({ titulo: `${l.estado === 'I' ? 'Desbloquear' : 'Bloquear'} lote ${l.id}`, mensaje: l.estado === 'I' ? 'El lote volverá a usarse en las ventas.' : 'El lote no se usará en las ventas mientras esté bloqueado.', textoConfirmar: l.estado === 'I' ? 'Desbloquear' : 'Bloquear', tono: 'primario',
        alConfirmar: () => inventarioModel.bloqueo(l.id, l.estado !== 'I') }) ? 'Estado del lote actualizado.' : null) },
    l.estado !== 'C' && { texto: 'Baja por caducidad', permiso: 'inventario:gestionar', tono: 'btn-outline-danger', etiqueta: `Dar de baja el lote ${l.id}`, ejecutar: () => formulario({
      titulo: `Dar de baja el lote ${l.id}`, mensaje: 'Se registra la salida en el kárdex. No se puede deshacer.', tono: 'peligro', textoConfirmar: 'Dar de baja',
      campos: [{ nombre: 'observacion', etiqueta: 'Observación', tipo: 'textarea', requerido: true, maxlength: 200 }],
      alConfirmar: (v) => inventarioModel.baja(l.id, v.observacion.trim()), exito: 'Lote dado de baja.' }) }
  ]
});

const selectKardex = document.querySelector('#kardex-producto');
const kardex = crearLista({
  raiz: '#pantalla-kardex', caption: 'Kárdex del producto',
  cargar: (p) => (selectKardex?.value ? inventarioModel.kardex(selectKardex.value, p) : Promise.resolve([])),
  columnas: [['Fecha', (k) => fecha(k.fecha, true)], ['Movimiento', (k) => txt(k.tipoMovimiento || k.tipoMovimientoId)], ['Lote', (k) => txt(k.loteProductoId)], ['Cantidad', (k) => txt(k.cantidad)], ...(VER_COSTOS ? [['Costo unitario', (k) => dinero(k.costoUnit)]] : []),
    ['Saldo cantidad', (k) => txt(k.saldoCantidad)], ...(VER_COSTOS ? [['Costo promedio', (k) => dinero(k.costoPromedio)], ['Saldo valor', (k) => dinero(k.saldoValor)]] : []), ['Observación', (k) => txt(k.observacion)]]
});
selectKardex?.addEventListener('change', () => kardex?.recargar());

const recargarTodo = () => { lotes?.recargar(); kardex?.recargar(); };
enlazarBoton('[data-recibir]', 'inventario:gestionar', async () => {
  const m = await formulario({
    titulo: 'Recibir mercadería sin orden', textoConfirmar: 'Registrar ingreso',
    campos: [{ nombre: 'productoId', etiqueta: 'Producto', tipo: 'select', requerido: true, opciones: opcionesProducto() }, { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'number', paso: '1', min: 1, requerido: true }, { nombre: 'costoUnit', etiqueta: 'Costo unitario', tipo: 'number', min: 0, requerido: true },
      { nombre: 'fechaCaducidad', etiqueta: 'Fecha de caducidad (si el producto la controla)', tipo: 'date' }, { nombre: 'numFabricante', etiqueta: 'Lote del fabricante', maxlength: 30 }, { nombre: 'observacion', etiqueta: 'Observación', tipo: 'textarea', maxlength: 200 }],
    alConfirmar: (v) => inventarioModel.recibir({ productoId: v.productoId, cantidad: Number(v.cantidad), costoUnit: Number(v.costoUnit), ...(v.fechaCaducidad ? { fechaCaducidad: v.fechaCaducidad } : {}), ...(v.numFabricante ? { numFabricante: v.numFabricante.trim() } : {}), ...(v.observacion ? { observacion: v.observacion.trim() } : {}) }),
    exito: 'Mercadería registrada.'
  });
  if (m) recargarTodo();
  return m;
});
enlazarBoton('[data-ajustar]', 'inventario:gestionar', async () => {
  const m = await formulario({
    titulo: 'Ajuste de inventario', textoConfirmar: 'Registrar ajuste', mensaje: 'Usa una cantidad positiva para sumar y negativa para restar.',
    campos: [{ nombre: 'productoId', etiqueta: 'Producto', tipo: 'select', requerido: true, opciones: opcionesProducto() }, { nombre: 'cantidad', etiqueta: 'Cantidad (+ o −)', tipo: 'number', paso: '1', requerido: true }, { nombre: 'observacion', etiqueta: 'Observación', tipo: 'textarea', requerido: true, maxlength: 200 }],
    validarExtra: (_, v) => (Number(v.cantidad) === 0 ? 'La cantidad no puede ser cero.' : null),
    alConfirmar: (v) => inventarioModel.ajustar({ productoId: v.productoId, cantidad: Number(v.cantidad), observacion: v.observacion.trim() }),
    exito: 'Ajuste registrado.'
  });
  if (m) recargarTodo();
  return m;
});

if (document.body.dataset.sinAcceso !== 'true') cargarProductosInventario();
