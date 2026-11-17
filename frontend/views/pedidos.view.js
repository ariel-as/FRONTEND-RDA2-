import { escapar, rutaArchivo } from './componentes.view.js';
import { formatearPrecio } from '../models/carrito.model.js';

const ESTADOS_PEDIDO = { P:'Pendiente de pago', R:'Pago reportado', G:'Pagado', E:'Retirado', X:'Cancelado' };

export function tarjetaPedido(pedido, onCancelar) {
  const estadoTexto = pedido.estadoNombre || ESTADOS_PEDIDO[pedido.estado] || pedido.estado || '';
  const puedeCancelar = pedido.estado === 'P';
  const lineas = (pedido.detalles || []).map(d=>`<li class="flex justify-between text-sm"><span>${escapar(d.nombre || d.productoId)} x ${d.cantidad}</span><span>${formatearPrecio(d.subtotal ?? 0)}</span></li>`).join('');
  return `
  <article class="pf-tarjeta p-5">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div><h3 class="m-0 text-lg font-bold text-white">Pedido #${escapar(pedido.id)}</h3><p class="m-0 text-sm text-neutral-400">${new Date(pedido.createdAt || pedido.fecha || Date.now()).toLocaleString('es-EC')}</p></div>
      <span class="pf-etiqueta">${escapar(estadoTexto)}</span>
    </div>
    <p class="mt-2 text-sm text-neutral-300">Pago: ${escapar(pedido.metodoPago || '')} ${pedido.refTransferencia ? `(ref. ${escapar(pedido.refTransferencia)})` : ''}</p>
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
