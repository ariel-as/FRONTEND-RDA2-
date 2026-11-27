import './admin.controller.js';
import { ventasModel, facturasModel, clientesModel } from '../models/fase2.model.js';
import { ofrecerFactura, mostrarFactura, idsSinFactura } from './factura.controller.js';
import { adminModel } from '../models/admin.model.js';
import { puede } from '../models/permisos.model.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { escapar, imagenProductoHtml } from '../views/componentes.view.js';
import { imagenProducto, rutaImagen } from '../models/presentacion.model.js';
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
  try {
    const r = await adminModel.productos({ estado: 'A', limit: 100 });
    productos = r?.data || r || [];
  } catch (error) { productos = []; mostrarMensaje(region, error.mensaje || 'No se pudieron cargar los productos.', 'error'); }
  const form = document.querySelector('#form-linea');
  if (form && !productos.some((p) => String(p.id) === String(form.producto.value))) form.producto.value = '';
  if (comboAbierto()) pintarOpciones();
  actualizarStockFormulario();
}
// Precio con IVA de /admin/productos: es el que cobra el servidor.
const precio = (p) => Number(p?.precioConIva ?? 0);

// Los totales los calcula el servidor con POST /admin/ventas/cotizacion; el navegador no suma importes.
const clienteVenta = () => document.querySelector('#venta-cliente')?.value.trim() || '9999999999';
const itemsVenta = () => lineas.map((l) => ({ productoId: String(l.producto.id), cantidad: l.cantidad, ...(l.descuento ? { descuento: l.descuento } : {}) }));
let cotizacion = null;
let cotizando = false;
let errorCotizacion = '';
let erroresStock = {};
let turnoCotizacion = 0;
let esperaCotizacion = null;
const numero = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
function leerCotizacion(r) {
  const d = r?.data ?? r ?? {};
  const items = d.items || d.lineas || d.detalles || [];
  const subtotales = {};
  items.forEach((it, i) => {
    const id = String(it.productoId ?? it.producto?.id ?? lineas[i]?.producto.id ?? '');
    subtotales[id] = numero(it.totalConIva ?? it.total ?? it.subtotalConIva ?? it.subtotal);
  });
  return { total: numero(d.total) ?? 0, iva: numero(d.valorIva ?? d.iva ?? d.ivaIncluido ?? d.totalIva) ?? 0, subtotales };
}
function leerErroresStock(fallo) {
  const mapa = {};
  const lista = Array.isArray(fallo?.detalles) ? fallo.detalles : fallo?.detalles ? [fallo.detalles] : [];
  lista.forEach((d) => {
    const indice = /items\[(\d+)\]/.exec(String(d?.campo || d?.field || d?.path || ''))?.[1];
    const id = d?.productoId ?? d?.producto?.id ?? (indice !== undefined ? lineas[Number(indice)]?.producto.id : null);
    if (id !== null && id !== undefined) mapa[String(id)] = d?.mensaje || d?.message || fallo.mensaje;
  });
  if (!Object.keys(mapa).length) {
    const linea = lineas.find((l) => String(fallo?.mensaje || '').includes(l.producto.nombre) || String(fallo?.mensaje || '').includes(String(l.producto.id)));
    if (linea) mapa[String(linea.producto.id)] = fallo.mensaje;
  }
  return mapa;
}
async function cotizar() {
  const turno = ++turnoCotizacion;
  if (!lineas.length) { cotizando = false; cotizacion = null; errorCotizacion = ''; erroresStock = {}; pintarLineas(); return; }
  try {
    const r = await ventasModel.cotizar({ clienteId: clienteVenta(), items: itemsVenta() });
    if (turno !== turnoCotizacion) return;
    cotizacion = leerCotizacion(r); errorCotizacion = ''; erroresStock = {};
  } catch (fallo) {
    if (turno !== turnoCotizacion) return;
    cotizacion = null;
    erroresStock = fallo?.status === 409 ? leerErroresStock(fallo) : {};
    errorCotizacion = Object.keys(erroresStock).length ? 'Corrige las cantidades marcadas para ver el total.' : (fallo?.mensaje || 'No se pudo calcular el total.');
  }
  cotizando = false;
  pintarLineas();
}
// Cada cambio del carrito pinta la tabla y pide una cotización nueva tras ~300 ms.
function cambiarCarrito() {
  clearTimeout(esperaCotizacion);
  turnoCotizacion += 1;
  cotizando = lineas.length > 0;
  cotizacion = null; errorCotizacion = ''; erroresStock = {};
  pintarLineas();
  if (lineas.length) esperaCotizacion = setTimeout(cotizar, 300);
}

// Combobox accesible de productos: filtra por nombre al escribir y permite abrir la lista completa.
const comboInput = () => document.querySelector('#venta-producto');
const comboLista = () => document.querySelector('#venta-producto-lista');
const comboAbierto = () => comboInput()?.getAttribute('aria-expanded') === 'true';
let visibles = [];
let activo = -1;
function pintarOpciones() {
  const input = comboInput();
  const lista = comboLista();
  const q = input.value.trim().toLowerCase();
  const elegido = document.querySelector('#form-linea').producto.value;
  const nombreElegido = productos.find((p) => String(p.id) === elegido)?.nombre?.toLowerCase();
  visibles = q && q !== nombreElegido ? productos.filter((p) => String(p.nombre || '').toLowerCase().includes(q)) : productos.slice();
  if (activo >= visibles.length) activo = -1;
  lista.innerHTML = visibles.length ? visibles.map((p, i) => {
    const stock = stockDe(p);
    return `<li role="option" id="venta-op-${i}" data-indice="${i}" aria-selected="${i === activo}"${stock <= 0 ? ' aria-disabled="true"' : ''}><span class="d-flex align-items-center gap-2">${imagenProductoHtml({ nombre: p.nombre, imagenUrl: p.imagenUrl, respaldo: rutaImagen(imagenProducto(p.id)), clase: 'pf-img-combo', ancho: 32, alto: 32 })}<span>${escapar(p.nombre)}</span></span><span class="small text-nowrap">${formatearPrecio(precio(p))} · ${stock > 0 ? `Stock ${stock}` : 'Agotado'}</span></li>`;
  }).join('') : `<li class="pf-combobox-vacio small" role="presentation">${productos.length ? 'Sin coincidencias.' : 'No hay productos.'}</li>`;
  if (activo >= 0) { input.setAttribute('aria-activedescendant', `venta-op-${activo}`); lista.querySelector(`#venta-op-${activo}`)?.scrollIntoView({ block: 'nearest' }); }
  else input.removeAttribute('aria-activedescendant');
}
function abrirCombo() {
  comboInput().setAttribute('aria-expanded', 'true');
  comboLista().hidden = false;
  pintarOpciones();
}
function cerrarCombo() {
  const input = comboInput();
  if (!input) return;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  comboLista().hidden = true;
  activo = -1;
}
function moverActivo(paso) {
  if (!visibles.length) return;
  let i = activo;
  for (let n = 0; n < visibles.length; n += 1) {
    i = i < 0 ? (paso > 0 ? 0 : visibles.length - 1) : (i + paso + visibles.length) % visibles.length;
    if (stockDe(visibles[i]) > 0) { activo = i; break; }
  }
  pintarOpciones();
}
function elegirProducto(p) {
  if (!p || stockDe(p) <= 0) return;
  document.querySelector('#form-linea').producto.value = String(p.id);
  comboInput().value = p.nombre;
  cerrarCombo();
  actualizarStockFormulario();
}
function enlazarCombo() {
  const input = comboInput();
  const lista = comboLista();
  const boton = document.querySelector('[data-abrir-productos]');
  input.addEventListener('input', () => {
    document.querySelector('#form-linea').producto.value = '';
    activo = -1;
    abrirCombo();
    if (input.value.trim()) moverActivo(1);
    actualizarStockFormulario();
  });
  input.addEventListener('click', () => { if (!comboAbierto()) abrirCombo(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!comboAbierto()) abrirCombo(); moverActivo(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!comboAbierto()) abrirCombo(); moverActivo(-1); }
    else if (e.key === 'Enter' && comboAbierto()) { e.preventDefault(); if (activo >= 0) elegirProducto(visibles[activo]); }
    else if (e.key === 'Escape' && comboAbierto()) { e.preventDefault(); e.stopPropagation(); cerrarCombo(); }
  });
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) cerrarCombo(); }, 150));
  lista.addEventListener('mousedown', (e) => e.preventDefault());
  lista.addEventListener('click', (e) => {
    const op = e.target.closest('[role="option"]');
    if (op && op.getAttribute('aria-disabled') !== 'true') { elegirProducto(visibles[Number(op.dataset.indice)]); input.focus(); }
  });
  boton?.addEventListener('mousedown', (e) => e.preventDefault());
  boton?.addEventListener('click', () => { if (comboAbierto()) cerrarCombo(); else abrirCombo(); input.focus(); });
}

function pintarLineas() {
  const cont = document.querySelector('[data-lineas]');
  const enfocado = cont.contains(document.activeElement) ? document.activeElement.id : '';
  // La tabla y el resumen se ven desde el inicio, aunque no haya líneas.
  cont.innerHTML = tablaHtml({
    caption: 'Líneas de la venta',
    columnas: [['Producto', (l) => `${txt(l.producto.nombre)}<span class="small d-block">${stockDe(l.producto) > 0 ? `Quedan ${stockDe(l.producto)}` : 'Sin stock'}</span>${erroresStock[String(l.producto.id)] ? `<span class="small d-block text-danger fw-semibold" id="error-linea-${escapar(l.producto.id)}" data-error-linea role="alert">${escapar(erroresStock[String(l.producto.id)])}</span>` : ''}`], ['Precio con IVA', (l) => dinero(precio(l.producto))],
      ['Cantidad', (l) => `<label class="visually-hidden" for="cant-${escapar(l.producto.id)}">Cantidad de ${escapar(l.producto.nombre)}, máximo ${stockDe(l.producto)}</label><input class="form-control form-control-sm" style="max-width:6rem" type="number" min="1" step="1" max="${stockDe(l.producto)}" id="cant-${escapar(l.producto.id)}"${erroresStock[String(l.producto.id)] ? ` aria-invalid="true" aria-describedby="error-linea-${escapar(l.producto.id)}"` : ''} data-cantidad="${escapar(l.producto.id)}" value="${l.cantidad}">`],
      ['Descuento', (l) => dinero(l.descuento)], ['Subtotal', (l) => (cotizacion && cotizacion.subtotales[String(l.producto.id)] != null ? dinero(cotizacion.subtotales[String(l.producto.id)]) : '<span class="text-body-secondary">—</span>')]],
    filas: lineas,
    acciones: (l) => `<button type="button" class="btn btn-sm btn-outline-danger" data-quitar-linea="${escapar(l.producto.id)}" aria-label="Quitar ${escapar(l.producto.nombre)}">Quitar</button>`
  }) + `<div class="text-end" aria-live="polite" aria-busy="${cotizando}">${!lineas.length
    ? `<p class="fw-bold fs-5 mb-0" data-total-venta>Total: ${formatearPrecio(0)}</p>`
    : cotizando
      ? '<p class="fw-bold fs-5 mb-0" data-total-venta>Total: <span class="fw-normal" data-calculando>Calculando…</span></p>'
      : cotizacion
        ? `<p class="fw-bold fs-5 mb-0" data-total-venta>Total: ${formatearPrecio(cotizacion.total)}</p><p class="small text-body-secondary mb-0" data-iva-venta>Incluye IVA ${formatearPrecio(cotizacion.iva)}</p>`
        : `<p class="fw-bold fs-5 mb-0" data-total-venta>Total: —</p><p class="small text-danger mb-0" data-error-cotizacion>${escapar(errorCotizacion)}</p>`}</div>`;
  if (enfocado) document.getElementById(enfocado)?.focus();
  document.querySelector('[data-cobrar-venta]').disabled = !lineas.length || cotizando || !cotizacion;
  actualizarStockFormulario();
}

async function cobrar() {
  if (!cotizacion || cotizando) return;
  const cliente = clienteVenta();
  const total = cotizacion.total;
  let pagos = null;
  const venta = await formulario({
    titulo: 'Cobrar venta', textoConfirmar: 'Cobrar',
    mensaje: `Cliente: ${cliente}. ${lineas.length} línea(s). Total ${formatearPrecio(total)} (incluye IVA ${formatearPrecio(cotizacion.iva)}).`,
    contenido: '<div data-contenedor-pagos></div>',
    alPreparar: (f) => { pagos = crearPagos(f.querySelector('[data-contenedor-pagos]'), { total, id: 'pagos-venta' }); },
    validarExtra: () => (pagos.validar() ? null : 'Revisa la forma de pago: los montos deben sumar el total.'),
    alFallar: (fallo, _, nodo) => pagos?.ajustarDesdeError(fallo, nodo),
    alConfirmar: () => ventasModel.crear({ clienteId: cliente, items: itemsVenta(), pagos: pagos.obtener() }),
    exito: (r) => r?.data ?? r
  });
  if (!venta) return;
  lineas = [];
  cambiarCarrito();
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
  enlazarCombo();
  formLinea.cantidad.addEventListener('input', actualizarStockFormulario);
  // Nombre del cliente al escribir la cédula.
  const nombreCliente = document.querySelector('[data-nombre-cliente]');
  formLinea.cliente.addEventListener('change', async () => {
    const ced = formLinea.cliente.value.trim();
    if (lineas.length) cambiarCarrito();
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
    if (!producto) { mostrarMensaje(region, 'Elige un producto.', 'error'); comboInput().focus(); return; }
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
    cambiarCarrito();
    formLinea.cantidad.value = '1'; formLinea.descuento.value = '0'; comboInput().focus();
  });
  document.querySelector('[data-lineas]').addEventListener('change', (e) => {
    const l = lineas.find((x) => String(x.producto.id) === e.target.dataset.cantidad);
    if (l) {
      const stock = stockDe(l.producto);
      const solicitada = Math.max(1, Math.floor(Number(e.target.value) || 1));
      if (solicitada > stock) mostrarMensaje(region, `Solo quedan ${stock} unidades de ${l.producto.nombre}.`, 'error');
      l.cantidad = Math.min(stock, solicitada);
      e.target.value = String(l.cantidad);
      cambiarCarrito();
    }
  });
  document.querySelector('[data-lineas]').addEventListener('click', (e) => {
    const id = e.target.closest('[data-quitar-linea]')?.dataset.quitarLinea;
    if (id) { lineas = lineas.filter((l) => String(l.producto.id) !== id); cambiarCarrito(); comboInput().focus(); }
  });
  document.querySelector('[data-cobrar-venta]').addEventListener('click', () => cobrar().catch((err) => mostrarMensaje(region, err.mensaje || 'No se pudo cobrar.', 'error')));
}
