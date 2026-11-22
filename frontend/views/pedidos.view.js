import { escapar, rutaArchivo } from './componentes.view.js';
import { formatearPrecio } from '../models/carrito.model.js';

// Códigos del backend: P, R, C, E, X.
const ESTADOS_PEDIDO = { P:'Pendiente de pago', R:'Pago reportado: estamos verificándolo', C:'Pagado: listo para retirar en el gimnasio', E:'Entregado', X:'Cancelado' };
const METODOS = { EF: 'Efectivo al retirar', TR: 'Transferencia' };

export function tarjetaPedido(pedido, onCancelar) {
  const estadoTexto = ESTADOS_PEDIDO[pedido.estado] || pedido.estadoNombre || pedido.estado || '';
  const puedeCancelar = pedido.estado === 'P';
  const lineas = (pedido.detalles || []).map(d=>`<li class="flex justify-between text-sm"><span>${escapar(d.nombre || d.productoId)} x ${d.cantidad}</span><span>${formatearPrecio(d.subtotal ?? 0)}</span></li>`).join('');
  return `
  <article class="pf-tarjeta p-5">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div><h3 class="m-0 text-lg font-bold text-white">Pedido #${escapar(pedido.id)}</h3><p class="m-0 text-sm text-neutral-400">${new Date(pedido.createdAt || pedido.fecha || Date.now()).toLocaleString('es-EC')}</p></div>
      <p class="m-0 text-sm"><span class="text-neutral-400">Estado:</span> <span class="pf-etiqueta">${escapar(estadoTexto)}</span></p>
    </div>
    <p class="mt-2 text-sm text-neutral-300">Pago: ${escapar(METODOS[pedido.metodoPago] || pedido.metodoPago || '')} ${pedido.refTransferencia ? `(comprobante ${escapar(pedido.refTransferencia)})` : ''}</p>
    <ul class="mt-3 list-none p-0 space-y-1">${lineas}</ul>
    <p class="mt-3 font-bold pf-precio">Total: ${formatearPrecio(pedido.total)}</p>
    ${puedeCancelar ? `<button type="button" class="pf-boton pf-boton-secundario mt-2" data-cancelar-pedido="${escapar(pedido.id)}" aria-label="Cancelar pedido ${escapar(pedido.id)}">Cancelar pedido</button>` : ''}
  </article>`;
}

const ESTADOS_INSCRIPCION = { P: 'Pendiente de pago (paga en recepción)', A: 'Activa', V: 'Vencida', S: 'Suspendida', X: 'Anulada' };
function fechaCorta(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? String(valor) : fecha.toLocaleDateString('es-EC', { timeZone: 'UTC' });
}

export function tarjetaInscripcion(ins) {
  const plan = ins.plan || ins.membresia?.nombre || ins.membresiaId || 'Plan';
  const estado = ESTADOS_INSCRIPCION[ins.estado] || ins.estadoNombre || ins.estado || '';
  // mis-inscripciones trae fecha de fin y total de ingresos; los restantes solo los ve el personal.
  const restantes = ins.ingresosRestantes ?? ins.ingresosDisponibles;
  const ingresos = restantes !== undefined && restantes !== null
    ? `<p class="text-sm text-neutral-300">Ingresos que te quedan: <strong>${escapar(restantes)}</strong></p>`
    : (ins.ingresosTotal ? `<p class="text-sm text-neutral-300">Total de ingresos del plan: ${escapar(ins.ingresosTotal)}</p>` : '');
  return `<article class="pf-tarjeta p-5"><h3 class="m-0 text-lg font-bold text-white">${escapar(plan)}</h3><p class="text-sm text-neutral-300">Inicio: ${escapar(fechaCorta(ins.fechaInicio))} · Fin: ${escapar(fechaCorta(ins.fechaFin))}</p>${ingresos}<p class="text-sm">Estado: <span class="font-semibold">${escapar(estado)}</span></p><p class="font-bold pf-precio">Valor: ${formatearPrecio(ins.totalCobrar ?? ins.valor ?? 0)}</p></article>`;
}

export function paginacion({ page, totalPages }, baseAttr) {
  return `<nav aria-label="Paginación" class="mt-4 flex items-center justify-center gap-3" ${baseAttr||''}>
    <button type="button" class="pf-boton pf-boton-secundario" data-page="${page-1}" ${page<=1?'disabled':''}>Anterior</button>
    <span aria-live="polite">Página ${page} de ${totalPages || 1}</span>
    <button type="button" class="pf-boton pf-boton-secundario" data-page="${page+1}" ${page>=totalPages?'disabled':''}>Siguiente</button>
  </nav>`;
}

export function tarjetaRutina(r, error = '') {
  if (!r) return `<p class="pf-mensaje">${escapar(error || 'Todavía no tienes una rutina vigente. Pídela a tu entrenador si tu plan la incluye.')}</p>`;
  return `<article class="pf-tarjeta p-5"><h3 class="m-0 text-lg font-bold text-white">${escapar(r.objetivo || 'Rutina')}</h3>
    <p class="text-sm text-neutral-300">Nivel: ${escapar(r.nivel || r.nivelId || '-')} · Del ${escapar(fechaCorta(r.fechaInicio))} al ${escapar(fechaCorta(r.fechaFin))}${r.entrenador || r.empleado ? ` · Entrenador: ${escapar(r.entrenador?.nombre || r.entrenador || r.empleado?.nombre || r.empleado)}` : ''}</p>
    <p class="mt-2 whitespace-pre-line text-sm">${escapar(r.detalle || '')}</p></article>`;
}

export function tarjetasNotificaciones(lista) {
  if (!lista.length) return '<p class="pf-mensaje">No tienes notificaciones.</p>';
  return lista.map((n) => `<article class="pf-tarjeta p-4"><p class="m-0 text-sm"><strong>${escapar(n.leida ? 'Leída' : 'Nueva')}: ${escapar(n.titulo)}</strong></p><p class="m-0 text-sm text-neutral-300">${escapar(n.mensaje)}</p>${n.fecha ? `<p class="m-0 text-xs text-neutral-400">${escapar(new Date(n.fecha).toLocaleString('es-EC'))}</p>` : ''}${n.leida ? '' : `<button type="button" class="pf-boton pf-boton-secundario mt-2" data-leer-notificacion="${escapar(n.id)}">Marcar leída</button>`}</article>`).join('');
}
