import { adminModel } from '../models/admin.model.js';
import { puede } from '../models/permisos.model.js';
import { funcionDisponible } from '../models/funciones.model.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { mostrarMensaje } from './validacion.controller.js';
import { abrirDialogo, confirmarAccion } from './dialogo.controller.js';
import { crearPagos } from './pagos.controller.js';
import { escapar } from '../views/componentes.view.js';
import { paginacionAdmin } from '../views/admin.view.js';

const s = (x) => document.querySelector(x);
const PAGOS = { EF: 'Efectivo', TR: 'Transferencia' };
// Códigos del backend (BACKEND.md, tabla pedido): P, R, C, E, X.
export const ESTADOS_PEDIDO = { P: 'Pendiente de pago', R: 'Pago reportado, por verificar', C: 'Pagado', E: 'Entregado', X: 'Cancelado' };
const REF_PATRON = '(?:[A-Za-z0-9]|-){4,30}';
let pagina = 1;
let pedidos = new Map();

const region = () => s('#mensaje-pedidos');

export async function iniciarPedidosAdmin() {
  if (document.body.dataset.pagina !== 'pedidos-admin' || document.body.dataset.sinAcceso === 'true') return;
  s('#filtro-estado')?.addEventListener('change', () => { pagina = 1; sincronizarFiltroRapido(); listar(); });
  s('[data-filtro-por-verificar]')?.addEventListener('click', () => {
    const filtro = s('#filtro-estado');
    filtro.value = filtro.value === 'R' ? '' : 'R';
    pagina = 1;
    sincronizarFiltroRapido();
    listar();
  });
  s('[data-tabla-pedidos]')?.addEventListener('click', onClick);
  s('[data-paginacion-pedidos]')?.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-page]');
    if (!boton || boton.disabled) return;
    pagina = Number(boton.dataset.page) || 1;
    listar();
  });
  sincronizarFiltroRapido();
  await listar();
}

function sincronizarFiltroRapido() {
  const boton = s('[data-filtro-por-verificar]');
  if (boton) boton.setAttribute('aria-pressed', String(s('#filtro-estado')?.value === 'R'));
}

function acciones(p) {
  const id = escapar(p.id);
  const lista = [];
  const conversion = funcionDisponible('pedidosConversion');
  if (p.estado === 'P' && puede('pedidos:gestionar')) lista.push(`<button type="button" class="btn btn-sm btn-outline-primary" data-reportar="${id}" aria-label="Reportar pago del pedido número ${id}">Reportar pago</button>`);
  if (p.estado === 'P' && conversion && puede('pedidos:gestionar')) lista.push(`<button type="button" class="btn btn-sm btn-primary" data-convertir="${id}" aria-label="Cobrar en efectivo y convertir en venta el pedido número ${id}">Cobrar y convertir en venta</button>`);
  if (p.estado === 'R' && conversion && puede('pedidos:gestionar')) lista.push(`<button type="button" class="btn btn-sm btn-primary" data-convertir="${id}" aria-label="Ver comprobante, verificar y convertir en venta el pedido número ${id}">Verificar y convertir en venta</button>`);
  if (p.estado === 'C' && conversion && puede('pedidos:gestionar')) lista.push(`<button type="button" class="btn btn-sm btn-success" data-entregar="${id}" aria-label="Marcar entregado el pedido número ${id}">Marcar entregado</button>`);
  if ((p.estado === 'P' || p.estado === 'R') && puede('pedidos:gestionar')) lista.push(`<button type="button" class="btn btn-sm btn-outline-danger" data-cancelar="${id}" aria-label="Cancelar el pedido número ${id}">Cancelar</button>`);
  return lista.join(' ') || '<span class="text-body-secondary">Sin acciones</span>';
}

async function listar() {
  const tbody = s('[data-tabla-pedidos]');
  const estado = s('#filtro-estado')?.value;
  if (tbody) tbody.setAttribute('aria-busy', 'true');
  try {
    const res = await adminModel.pedidos({ page: pagina, limit: 20, ...(estado ? { estado } : {}) });
    const lista = res?.data || res || [];
    pedidos = new Map(lista.map((p) => [String(p.id), p]));
    const paginacion = res?.pagination || {};
    pagina = paginacion.page || pagina;
    if (tbody) tbody.innerHTML = lista.length ? lista.map((p) => {
      const id = escapar(p.id);
      const det = (p.detalles || []).map((d) => `${escapar(d.nombre || d.productoId)} x${escapar(d.cantidad)}`).join('<br>');
      const comprobante = p.refTransferencia ? `<div class="small">Comprobante: ${escapar(p.refTransferencia)}</div>` : '';
      const estadoTexto = ESTADOS_PEDIDO[p.estado] || p.estadoNombre || p.estado || 'vacío';
      return `<tr><th scope="row">${id}</th><td>${escapar(p.usuario?.login || p.userId || '')}</td><td>${escapar(new Date(p.createdAt || Date.now()).toLocaleString('es-EC'))}</td><td>${escapar(PAGOS[p.metodoPago] || p.metodoPago || 'vacío')}${comprobante}</td><td><details><summary>Ver productos</summary><div class="small mt-1">${det || 'vacío'}</div></details></td><td>${formatearPrecio(p.total)}</td><td><span class="pf-estado" data-estado="${escapar(p.estado)}">${escapar(estadoTexto)}</span></td><td class="text-nowrap">${acciones(p)}</td></tr>`;
    }).join('') : '<tr><td colspan="8" class="text-center text-body-secondary">No hay pedidos.</td></tr>';
    const cont = s('[data-paginacion-pedidos]');
    if (cont) cont.innerHTML = paginacionAdmin({ page: pagina, totalPages: paginacion.totalPages || 1 });
  } catch (e) {
    mostrarMensaje(region(), e.mensaje || 'No se pudieron cargar los pedidos.', 'error');
  } finally {
    if (tbody) tbody.setAttribute('aria-busy', 'false');
  }
}

async function terminar(texto) {
  mostrarMensaje(region(), texto, 'exito');
  await listar();
}

async function reportarPago(p) {
  const respuesta = await abrirDialogo({
    titulo: `Reportar pago del pedido ${p.id}`,
    mensaje: `Total del pedido: ${formatearPrecio(p.total)}. Escribe el número de comprobante si el cliente pagó por transferencia.`,
    campos: [{ nombre: 'refTransferencia', etiqueta: 'Número de comprobante', valor: p.refTransferencia || '', maxlength: 30, patron: REF_PATRON, mensajePatron: 'Usa de 4 a 30 letras, números o guion.', requerido: p.metodoPago === 'TR' && !p.refTransferencia, ayuda: 'De 4 a 30 letras, números o guion.' }],
    textoConfirmar: 'Reportar pago',
    alConfirmar: (valores) => {
      const ref = String(valores.refTransferencia || '').trim();
      return adminModel.cambiarEstadoPedido(p.id, { estado: 'R', ...(ref ? { refTransferencia: ref } : {}) });
    }
  });
  if (respuesta) await terminar(`Pago del pedido ${p.id} reportado.`);
}

async function convertir(p) {
  // En transferencia el servidor toma la referencia del pedido; en efectivo se usa el componente de pagos.
  const enEfectivo = p.estado === 'P';
  let pagos = null;
  const comprobante = p.refTransferencia ? `<p class="mb-2">Comprobante informado: <strong>${escapar(p.refTransferencia)}</strong></p>` : '<p class="mb-2">El pedido no tiene número de comprobante.</p>';
  const respuesta = await abrirDialogo({
    titulo: enEfectivo ? `Cobrar y convertir en venta el pedido ${p.id}` : `Verificar y convertir en venta el pedido ${p.id}`,
    mensaje: enEfectivo ? 'Registra el cobro en recepción. El pedido pasará a Pagado y se creará la venta.' : 'Comprueba el comprobante antes de confirmar. El pedido pasará a Pagado y se creará la venta.',
    contenido: enEfectivo ? '<div data-contenedor-pagos></div>' : `${comprobante}<p class="mb-0">Total del pedido: <strong>${formatearPrecio(p.total)}</strong></p>`,
    textoConfirmar: enEfectivo ? 'Cobrar y convertir' : 'Verificar y convertir',
    alPreparar: (form) => { if (enEfectivo) pagos = crearPagos(form.querySelector('[data-contenedor-pagos]'), { total: p.total, id: `pagos-pedido-${p.id}` }); },
    validarExtra: () => (pagos && !pagos.validar() ? 'Revisa la forma de pago: los montos deben sumar exactamente el total.' : null),
    alFallar: (fallo, _, nodo) => pagos?.ajustarDesdeError(fallo, nodo),
    alConfirmar: () => adminModel.cambiarEstadoPedido(p.id, { estado: 'C', ...(pagos ? { pagos: pagos.obtener() } : {}) })
  });
  if (respuesta) await terminar(`Pedido ${p.id} convertido en venta.`);
}

async function entregar(p) {
  const ok = await confirmarAccion({
    titulo: `Marcar entregado el pedido ${p.id}`,
    mensaje: 'Confirma que el cliente retiró sus productos. Después no se puede volver atrás.',
    textoConfirmar: 'Marcar entregado',
    tono: 'primario',
    alConfirmar: () => adminModel.cambiarEstadoPedido(p.id, { estado: 'E' })
  });
  if (ok) await terminar(`Pedido ${p.id} marcado como entregado.`);
}

async function cancelar(p) {
  const ok = await confirmarAccion({
    titulo: `Cancelar el pedido ${p.id}`,
    mensaje: '¿Cancelar este pedido? Esta acción no se puede deshacer.',
    textoConfirmar: 'Cancelar pedido',
    alConfirmar: () => adminModel.cambiarEstadoPedido(p.id, { estado: 'X' })
  });
  if (ok) await terminar(`Pedido ${p.id} cancelado.`);
}

async function onClick(e) {
  const boton = e.target.closest('[data-reportar],[data-convertir],[data-entregar],[data-cancelar]');
  if (!boton) return;
  const id = boton.dataset.reportar || boton.dataset.convertir || boton.dataset.entregar || boton.dataset.cancelar;
  const p = pedidos.get(String(id));
  if (!p) return;
  if (boton.dataset.reportar) await reportarPago(p);
  else if (boton.dataset.convertir) await convertir(p);
  else if (boton.dataset.entregar) await entregar(p);
  else await cancelar(p);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarPedidosAdmin); else iniciarPedidosAdmin();
