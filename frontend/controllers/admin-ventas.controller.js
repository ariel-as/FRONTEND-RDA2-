import './admin.controller.js';
import { ventasModel, facturasModel, clientesModel } from '../models/fase2.model.js';
import { ofrecerFactura, mostrarFactura, idsSinFactura } from './factura.controller.js';
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
const stockDe = (producto) => (producto?.disponible === false ? 0 : Math.max(0, Number(producto?.stock ?? 0)));
const cantidadEnLineas = (id) => lineas.filter((l) => String(l.producto.id) === String(id)).reduce((total, l) => total + l.cantidad, 0);

function actualizarStockFormulario() {
  const form = document.querySelector('#form-linea');
  if (!form) return;
  const producto = productos.find((p) => String(p.id) === String(form.producto.value));
  const stock = stockDe(producto);
  const enLinea = producto ? cantidadEnLineas(producto.id) : 0;
  const cantidad = form.cantidad;
  cantidad.max = String(Math.max(1, stock));
  if (stock > 0 && Number(cantidad.value) > stock) cantidad.value = String(stock);
  const completo = Boolean(producto) && stock > 0 && enLinea >= stock;
  const texto = !producto
    ? 'Selecciona un producto para ver cuántas unidades quedan.'
    : stock <= 0
      ? `Sin stock de ${producto.nombre}. No puedes agregarlo.`
      : completo
        ? `Ya agregaste todas las unidades disponibles de ${producto.nombre} (Quedan ${stock}).`
        : `Quedan ${stock} unidades de ${producto.nombre}.`;
  const aviso = document.querySelector('#venta-stock');
  if (aviso) aviso.textContent = texto;
  form.querySelector('button[type="submit"]').disabled = !producto || stock <= 0 || completo;
}

async function cargarProductos() {
  const select = document.querySelector('#venta-producto');
  try {
    const r = await adminModel.productos({ estado: 'A', limit: 100 });
    productos = r?.data || r || [];
    select.innerHTML = '<option value="">Selecciona un producto</option>' + productos.map((p) => {
      const stock = stockDe(p);
      return `<option value="${escapar(p.id)}"${stock <= 0 ? ' disabled' : ''}>${escapar(p.nombre)} · ${formatearPrecio(p.precioVenta ?? p.precio)} · ${stock > 0 ? `Quedan ${stock}` : 'Sin stock'}</option>`;
    }).join('');
  } catch (error) { select.innerHTML = `<option value="">${escapar(error.mensaje || 'No se pudieron cargar los productos')}</option>`; }
  actualizarStockFormulario();
}
const precio = (p) => Number(p?.precioVenta ?? p?.precio ?? 0);
const estimado = () => lineas.reduce((a, l) => a + centavos(precio(l.producto)) * l.cantidad - centavos(l.descuento), 0) / 100;

function pintarLineas() {
  const cont = document.querySelector('[data-lineas]');
  // La tabla y el resumen se ven desde el inicio, aunque no haya líneas.
  cont.innerHTML = tablaHtml({
    caption: 'Líneas de la venta',
    columnas: [['Producto', (l) => `${txt(l.producto.nombre)}<span class="small d-block">${stockDe(l.producto) > 0 ? `Quedan ${stockDe(l.producto)}` : 'Sin stock'}</span>`], ['Precio', (l) => dinero(precio(l.producto))],
      ['Cantidad', (l) => `<label class="visually-hidden" for="cant-${escapar(l.producto.id)}">Cantidad de ${escapar(l.producto.nombre)}, máximo ${stockDe(l.producto)}</label><input class="form-control form-control-sm" style="max-width:6rem" type="number" min="1" step="1" max="${stockDe(l.producto)}" id="cant-${escapar(l.producto.id)}" data-cantidad="${escapar(l.producto.id)}" value="${l.cantidad}">`],
      ['Descuento', (l) => dinero(l.descuento)]],
    filas: lineas,
    acciones: (l) => `<button type="button" class="btn btn-sm btn-outline-danger" data-quitar-linea="${escapar(l.producto.id)}" aria-label="Quitar ${escapar(l.producto.nombre)}">Quitar</button>`
  }) + `<p class="fw-bold">Total estimado: ${formatearPrecio(estimado())} <span class="fw-normal small">(el servidor calcula el total definitivo con IVA y el cobro se ajusta si lo corrige)</span></p>`;
  document.querySelector('[data-cobrar-venta]').disabled = !lineas.length;
  actualizarStockFormulario();
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
    alFallar: (fallo, _, nodo) => pagos?.ajustarDesdeError(fallo, nodo),
    alConfirmar: () => ventasModel.crear({ clienteId: cliente, items: lineas.map((l) => ({ productoId: String(l.producto.id), cantidad: l.cantidad, ...(l.descuento ? { descuento: l.descuento } : {}) })), pagos: pagos.obtener() }),
    exito: (r) => r?.data ?? r
  });
  if (!venta) return;
  lineas = [];
  pintarLineas();
  mostrarMensaje(region, `Venta ${venta.id ?? ''} registrada por ${formatearPrecio(venta.total)}.`, 'exito');
  lista?.recargar();
  cargarProductos();
  const factura = await ofrecerFactura({ ventaId: venta.id });
  if (factura) { await actualizarSinFactura(); mostrarMensaje(region, factura, 'exito'); }
}

let sinFactura = new Set();
let lista = null;
const actualizarSinFactura = async () => {
  try { sinFactura = await idsSinFactura(); }
  catch { sinFactura = new Set(); }
  return sinFactura;
};
await actualizarSinFactura();

const desde = document.querySelector('#ventas-desde');
const hasta = document.querySelector('#ventas-hasta');
if (desde && hasta) { desde.value = hoy; hasta.value = hoy; }
lista = crearLista({
  raiz: '#pantalla-ventas', filtros: '#filtros-ventas', caption: 'Ventas',
  cargar: (p) => ventasModel.listar(p),
  columnas: [['N.º', (v) => txt(v.id)], ['Fecha', (v) => fecha(v.fecha, true)], ['Cliente', (v) => txt(v.cliente?.nombre || v.cliente || v.clienteId)], ['Canal', (v) => txt(v.canal === 'W' ? 'Web' : 'Local')], ['Total', (v) => dinero(v.total)], ['Estado', (v) => estado(ESTADOS, v.estado)]],
  acciones: (v) => [
    { texto: 'Detalle', permiso: 'ventas:leer', etiqueta: `Detalle de la venta ${v.id}`, ejecutar: () => verDetalle(`Venta ${v.id}`, () => ventasModel.detalle(v.id)) },
    v.estado !== 'X' && sinFactura?.has(`venta:${v.id}`) && { texto: 'Generar factura', permiso: 'facturas:generar', secundaria: true, etiqueta: `Generar factura de la venta ${v.id}`, ejecutar: async () => { const m = await ofrecerFactura({ ventaId: v.id }); if (m) { await actualizarSinFactura(); lista.recargar(); } return m; } },
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
  formLinea.producto.addEventListener('change', actualizarStockFormulario);
  formLinea.cantidad.addEventListener('input', actualizarStockFormulario);
  // Buscador: filtra la lista de productos por nombre o código y elige el primero que coincide.
  document.querySelector('#venta-buscar')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const select = formLinea.producto;
    [...select.options].forEach((o) => { if (o.value) o.hidden = Boolean(q) && !o.textContent.toLowerCase().includes(q) && !o.value.toLowerCase().includes(q); });
    const primero = [...select.options].find((o) => o.value && !o.hidden);
    if (q && primero) select.value = primero.value;
  });
  // Nombre del cliente al escribir la cédula.
  const nombreCliente = document.querySelector('[data-nombre-cliente]');
  formLinea.cliente.addEventListener('change', async () => {
    const ced = formLinea.cliente.value.trim();
    if (!ced || ced === '9999999999') { nombreCliente.textContent = 'CONSUMIDOR FINAL'; return; }
    try {
      const r = await clientesModel.listar({ buscar: ced, limit: 1 });
      const c = (r?.data || r || [])[0];
      nombreCliente.textContent = c ? `${c.nombre || ''} ${c.apellido || ''}`.trim() : 'Cliente no registrado: regístralo en Clientes o usa CONSUMIDOR FINAL.';
    } catch { nombreCliente.textContent = ''; }
  });
  formLinea.addEventListener('submit', (e) => {
    e.preventDefault();
    const producto = productos.find((p) => String(p.id) === formLinea.producto.value);
    const cantidad = Math.max(1, Math.floor(Number(formLinea.cantidad.value) || 1));
    const descuento = Math.max(0, Number(formLinea.descuento.value) || 0);
    if (!producto) { mostrarMensaje(region, 'Elige un producto.', 'error'); formLinea.producto.focus(); return; }
    const stock = stockDe(producto);
    if (stock <= 0) { mostrarMensaje(region, `Sin stock de ${producto.nombre}. No puedes agregarlo.`, 'error'); return; }
    const enLinea = cantidadEnLineas(producto.id);
    if (cantidad > stock - enLinea) {
      mostrarMensaje(region, `Solo quedan ${Math.max(0, stock - enLinea)} unidades disponibles de ${producto.nombre}.`, 'error');
      formLinea.cantidad.value = String(Math.max(1, stock - enLinea));
      actualizarStockFormulario();
      return;
    }
    const existente = lineas.find((l) => String(l.producto.id) === String(producto.id));
    if (existente) { existente.cantidad = enLinea + cantidad; existente.descuento += descuento; } else lineas.push({ producto, cantidad, descuento });
    pintarLineas();
    formLinea.cantidad.value = '1'; formLinea.descuento.value = '0'; formLinea.producto.focus();
  });
  document.querySelector('[data-lineas]').addEventListener('change', (e) => {
    const l = lineas.find((x) => String(x.producto.id) === e.target.dataset.cantidad);
    if (l) {
      const stock = stockDe(l.producto);
      const solicitada = Math.max(1, Math.floor(Number(e.target.value) || 1));
      if (solicitada > stock) mostrarMensaje(region, `Solo quedan ${stock} unidades de ${l.producto.nombre}.`, 'error');
      l.cantidad = Math.min(stock, solicitada);
      e.target.value = String(l.cantidad);
      pintarLineas();
    }
  });
  document.querySelector('[data-lineas]').addEventListener('click', (e) => {
    const id = e.target.closest('[data-quitar-linea]')?.dataset.quitarLinea;
    if (id) { lineas = lineas.filter((l) => String(l.producto.id) !== id); pintarLineas(); formLinea.producto.focus(); }
  });
  document.querySelector('[data-cobrar-venta]').addEventListener('click', () => cobrar().catch((err) => mostrarMensaje(region, err.mensaje || 'No se pudo cobrar.', 'error')));
}
