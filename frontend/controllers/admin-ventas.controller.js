import './admin.controller.js';
import { ventasModel, facturasModel } from '../models/fase2.model.js';
import { adminModel } from '../models/admin.model.js';
import { puede } from '../models/permisos.model.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, dinero, fecha, estado, tablaHtml } from '../views/lista-api.view.js';
import { mostrarMensaje } from './validacion.controller.js';
import { confirmarAccion } from './dialogo.controller.js';
import { crearPagos } from './pagos.controller.js';
import { crearLista, formulario, verDetalle } from './lista-api.controller.js';

const region = document.querySelector('[data-mensaje]');
const ESTADOS = { C: 'Completada', X: 'Anulada' };
const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
let productos = [];
let lineas = [];
const centavos = (v) => Math.round(Number(v || 0) * 100);

async function cargarProductos() {
  const select = document.querySelector('#venta-producto');
  try {
    const r = await adminModel.productos({ estado: 'A', limit: 100 });
    productos = (r?.data || r || []).filter((p) => Number(p.stock ?? 1) > 0);
    select.innerHTML = '<option value="">Selecciona un producto</option>' + productos.map((p) => `<option value="${escapar(p.id)}">${escapar(p.nombre)} · ${formatearPrecio(p.precioVenta ?? p.precio)} · stock ${escapar(p.stock ?? '')}</option>`).join('');
  } catch (error) { select.innerHTML = `<option value="">${escapar(error.mensaje || 'No se pudieron cargar los productos')}</option>`; }
}
const precio = (p) => Number(p?.precioVenta ?? p?.precio ?? 0);
const estimado = () => lineas.reduce((a, l) => a + centavos(precio(l.producto)) * l.cantidad - centavos(l.descuento), 0) / 100;

function pintarLineas() {
  const cont = document.querySelector('[data-lineas]');
  cont.innerHTML = lineas.length ? tablaHtml({
    caption: 'Líneas de la venta',
    columnas: [['Producto', (l) => txt(l.producto.nombre)], ['Precio', (l) => dinero(precio(l.producto))],
      ['Cantidad', (l) => `<label class="visually-hidden" for="cant-${escapar(l.producto.id)}">Cantidad de ${escapar(l.producto.nombre)}</label><input class="form-control form-control-sm" style="max-width:6rem" type="number" min="1" step="1" id="cant-${escapar(l.producto.id)}" data-cantidad="${escapar(l.producto.id)}" value="${l.cantidad}">`],
      ['Descuento', (l) => dinero(l.descuento)]],
    filas: lineas,
    acciones: (l) => `<button type="button" class="btn btn-sm btn-outline-danger" data-quitar-linea="${escapar(l.producto.id)}" aria-label="Quitar ${escapar(l.producto.nombre)}">Quitar</button>`
  }) + `<p class="fw-bold">Total estimado: ${formatearPrecio(estimado())} <span class="fw-normal small">(el servidor calcula el total definitivo con IVA)</span></p>` : '<p class="text-body-secondary mb-0">Agrega productos para empezar la venta.</p>';
  document.querySelector('[data-cobrar-venta]').disabled = !lineas.length;
}

async function cobrar() {
  const cliente = document.querySelector('#venta-cliente').value.trim() || '9999999999';
  let pagos = null;
  const venta = await formulario({
    titulo: 'Cobrar venta', textoConfirmar: 'Cobrar',
    mensaje: `Cliente: ${cliente}. ${lineas.length} línea(s). Si el total no coincide, el servidor indicará el valor exacto.`,
    contenido: '<div data-contenedor-pagos></div>',
    alPreparar: (f) => { pagos = crearPagos(f.querySelector('[data-contenedor-pagos]'), { total: estimado(), id: 'pagos-venta' }); },
    validarExtra: () => (pagos.validar() ? null : 'Revisa la forma de pago: los montos deben sumar el total.'),
    alConfirmar: () => ventasModel.crear({ clienteId: cliente, items: lineas.map((l) => ({ productoId: String(l.producto.id), cantidad: l.cantidad, ...(l.descuento ? { descuento: l.descuento } : {}) })), pagos: pagos.obtener() }),
    exito: (r) => r?.data ?? r
  });
  if (!venta) return;
  lineas = [];
  pintarLineas();
  mostrarMensaje(region, `Venta ${venta.id ?? ''} registrada por ${formatearPrecio(venta.total)}.`, 'exito');
  lista?.recargar();
  cargarProductos();
  if (puede('facturas:generar') && await confirmarAccion({ titulo: 'Generar factura', mensaje: '¿Generar la factura de esta venta?', textoConfirmar: 'Generar factura', tono: 'primario', alConfirmar: () => facturasModel.generar({ ventaId: venta.id }) })) {
    mostrarMensaje(region, 'Factura generada. Registra su número en Facturación.', 'exito');
  }
}

const desde = document.querySelector('#ventas-desde');
const hasta = document.querySelector('#ventas-hasta');
if (desde && hasta) { desde.value = hoy; hasta.value = hoy; }
const lista = crearLista({
  raiz: '#pantalla-ventas', filtros: '#filtros-ventas', caption: 'Ventas',
  cargar: (p) => ventasModel.listar(p),
  columnas: [['N.º', (v) => txt(v.id)], ['Fecha', (v) => fecha(v.fecha, true)], ['Cliente', (v) => txt(v.cliente?.nombre || v.cliente || v.clienteId)], ['Canal', (v) => txt(v.canal === 'W' ? 'Web' : 'Local')], ['Total', (v) => dinero(v.total)], ['Estado', (v) => estado(ESTADOS, v.estado)]],
  acciones: (v) => [
    { texto: 'Detalle', permiso: 'ventas:leer', etiqueta: `Detalle de la venta ${v.id}`, ejecutar: () => verDetalle(`Venta ${v.id}`, () => ventasModel.detalle(v.id)) },
    v.estado !== 'X' && { texto: 'Generar factura', permiso: 'facturas:generar', etiqueta: `Generar factura de la venta ${v.id}`, ejecutar: async () => (await confirmarAccion({ titulo: 'Generar factura', mensaje: `¿Generar la factura de la venta ${v.id}?`, textoConfirmar: 'Generar', tono: 'primario', alConfirmar: () => facturasModel.generar({ ventaId: v.id }) }) ? 'Factura generada.' : null) },
    v.estado !== 'X' && { texto: 'Anular venta', permiso: 'ventas:anular', tono: 'btn-outline-danger', etiqueta: `Anular la venta ${v.id}`, ejecutar: () => formulario({
      titulo: `Anular la venta ${v.id}`, mensaje: 'Se devuelve el stock, los pagos pasan a devolución y la factura queda por anular en el SRI. No se puede deshacer.', tono: 'peligro', textoConfirmar: 'Anular venta',
      campos: [{ nombre: 'motivo', etiqueta: 'Motivo', tipo: 'textarea', requerido: true, maxlength: 200 }],
      alConfirmar: (x) => ventasModel.anular(v.id, x.motivo.trim()), exito: 'Venta anulada.' }) }
  ]
});

const formLinea = document.querySelector('#form-linea');
if (formLinea && puede('ventas:crear') && document.body.dataset.sinAcceso !== 'true') {
  cargarProductos();
  pintarLineas();
  formLinea.addEventListener('submit', (e) => {
    e.preventDefault();
    const producto = productos.find((p) => String(p.id) === formLinea.producto.value);
    const cantidad = Math.max(1, Math.floor(Number(formLinea.cantidad.value) || 1));
    const descuento = Math.max(0, Number(formLinea.descuento.value) || 0);
    if (!producto) { mostrarMensaje(region, 'Elige un producto.', 'error'); formLinea.producto.focus(); return; }
    const existente = lineas.find((l) => l.producto.id === producto.id);
    if (existente) { existente.cantidad += cantidad; existente.descuento += descuento; } else lineas.push({ producto, cantidad, descuento });
    pintarLineas();
    formLinea.cantidad.value = '1'; formLinea.descuento.value = '0'; formLinea.producto.focus();
  });
  document.querySelector('[data-lineas]').addEventListener('change', (e) => {
    const l = lineas.find((x) => String(x.producto.id) === e.target.dataset.cantidad);
    if (l) { l.cantidad = Math.max(1, Math.floor(Number(e.target.value) || 1)); pintarLineas(); }
  });
  document.querySelector('[data-lineas]').addEventListener('click', (e) => {
    const id = e.target.closest('[data-quitar-linea]')?.dataset.quitarLinea;
    if (id) { lineas = lineas.filter((l) => String(l.producto.id) !== id); pintarLineas(); formLinea.producto.focus(); }
  });
  document.querySelector('[data-cobrar-venta]').addEventListener('click', () => cobrar().catch((err) => mostrarMensaje(region, err.mensaje || 'No se pudo cobrar.', 'error')));
}
