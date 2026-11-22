import { escapar, rutaArchivo } from './componentes.view.js';
import { formatearPrecio } from '../models/carrito.model.js';

// Códigos del backend: P, R, C, E, X.
const ESTADOS_PEDIDO = { P:'Pendiente de pago', R:'Pago reportado: estamos verificándolo', C:'Pagado: listo para retirar en el gimnasio', E:'Entregado', X:'Cancelado' };
const METODOS = { EF: 'Efectivo al retirar', TR: 'Transferencia' };

export function tarjetaPedido(pedido, onCancelar) {
  const estadoTexto = ESTADOS_PEDIDO[pedido.estado] || pedido.estadoNombre || pedido.estado || '';
  // Informar el comprobante después de comprar no tiene ruta en el contrato de la fase 2.
  const informarComprobante = pedido.estado === 'P' && pedido.metodoPago === 'TR'
    ? '<p class="mt-2 text-sm text-neutral-300"><strong>Disponible pronto:</strong> informar aquí el número de comprobante de tu transferencia. Mientras tanto, preséntalo en recepción.</p>'
    : '';
  const puedeCancelar = pedido.estado === 'P';
  const lineas = (pedido.detalles || []).map(d=>`<li class="flex justify-between text-sm"><span>${escapar(d.nombre || d.productoId)} x ${d.cantidad}</span><span>${formatearPrecio(d.subtotal ?? 0)}</span></li>`).join('');
  return `
  <article class="pf-tarjeta p-5">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div><h3 class="m-0 text-lg font-bold text-white">Pedido #${escapar(pedido.id)}</h3><p class="m-0 text-sm text-neutral-400">${new Date(pedido.createdAt || pedido.fecha || Date.now()).toLocaleString('es-EC')}</p></div>
      <p class="m-0 text-sm"><span class="text-neutral-400">Estado:</span> <span class="pf-etiqueta">${escapar(estadoTexto)}</span></p>
    </div>
    <p class="mt-2 text-sm text-neutral-300">Pago: ${escapar(METODOS[pedido.metodoPago] || pedido.metodoPago || '')} ${pedido.refTransferencia ? `(comprobante ${escapar(pedido.refTransferencia)})` : ''}</p>
    ${informarComprobante}
    <ul class="mt-3 list-none p-0 space-y-1">${lineas}</ul>
    <p class="mt-3 font-bold pf-precio">Total: ${formatearPrecio(pedido.total)}</p>
    ${puedeCancelar ? `<button type="button" class="pf-boton pf-boton-secundario mt-2" data-cancelar-pedido="${escapar(pedido.id)}" aria-label="Cancelar pedido ${escapar(pedido.id)}">Cancelar pedido</button>` : ''}
  </article>`;
}

export function tarjetaInscripcion(ins) {
  const plan = ins.plan || ins.membresia?.nombre || ins.membresiaId || 'Plan';
  const estado = ins.estadoNombre || ins.estado || '';
  return `<article class="pf-tarjeta p-5"><h3 class="m-0 text-lg font-bold text-white">${escapar(plan)}</h3><p class="text-sm text-neutral-300">Inicio: ${escapar(ins.fechaInicio || '-')} · Fin: ${escapar(ins.fechaFin || '-')}</p><p class="text-sm">Estado: <span class="font-semibold">${escapar(estado)}</span></p><p class="font-bold pf-precio">Valor: ${formatearPrecio(ins.totalCobrar ?? ins.valor ?? 0)}</p></article>`;
}

export function paginacion({ page, totalPages }, baseAttr) {
  return `<nav aria-label="Paginación" class="mt-4 flex items-center justify-center gap-3" ${baseAttr||''}>
    <button type="button" class="pf-boton pf-boton-secundario" data-page="${page-1}" ${page<=1?'disabled':''}>Anterior</button>
    <span aria-live="polite">Página ${page} de ${totalPages || 1}</span>
    <button type="button" class="pf-boton pf-boton-secundario" data-page="${page+1}" ${page>=totalPages?'disabled':''}>Siguiente</button>
  </nav>`;
}
