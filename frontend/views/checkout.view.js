import { formatearPrecio } from '../models/carrito.model.js';
import { escapar, rutaArchivo } from './componentes.view.js';

export function pintarResumenCheckout(contenedor, items, total) {
  if (!contenedor) return;
  contenedor.innerHTML = items.map((item)=>`
    <li class="flex items-center justify-between gap-3 border-b border-pf-linea py-3">
      <div class="flex items-center gap-3">
        ${item.imagen ? `<img src="${escapar(rutaArchivo(item.imagen))}" alt="" width="48" height="48" class="rounded">` : ''}
        <div><p class="m-0 font-semibold text-white">${escapar(item.nombre)} ${item.tipo==='plan'?'<span class="pf-etiqueta ml-2">Plan</span>':''}</p><p class="m-0 text-sm text-neutral-400">${item.cantidad} x ${formatearPrecio(item.precio)}</p></div>
      </div>
      <span class="font-bold pf-precio">${formatearPrecio(item.precio * item.cantidad)}</span>
    </li>`).join('');
  const totalNodo = document.querySelector('[data-checkout-total]');
  if (totalNodo) totalNodo.textContent = formatearPrecio(total);
}

export function pintarClienteReadonly(contenedor, usuario) {
  if (!contenedor) return;
  const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') || usuario?.login || '';
  contenedor.innerHTML = `<div class="rounded-lg border border-pf-linea p-4"><p class="m-0 text-sm text-neutral-400">Cliente</p><p class="m-0 font-bold text-white">${escapar(nombre)}</p><p class="m-0 text-sm text-neutral-300">${escapar(usuario?.correo || usuario?.login || '')}</p></div>`;
}

export function pintarConfirmacion(contenedor, { pedido, inscripciones }) {
  if (!contenedor) return;
  const partes = [];
  if (pedido) {
    const lineas = (pedido.detalles || pedido.items || []).map((d)=>`<li class="flex justify-between py-1"><span>${escapar(d.nombre || d.productoId)} x ${d.cantidad}</span><span>${formatearPrecio(d.subtotal ?? (d.cantidad * d.precioUnitario))}</span></li>`).join('');
    partes.push(`<div class="mb-4"><p class="font-bold text-white">Pedido #${escapar(pedido.id)}</p><p class="text-sm text-neutral-300">Estado: ${escapar(pedido.estadoNombre || pedido.estado || '')}</p><ul class="list-none p-0 mt-2">${lineas}</ul><p class="mt-2 font-bold pf-precio">Total: ${formatearPrecio(pedido.total)}</p></div>`);
  }
  (inscripciones || []).forEach((ins)=>{
    const plan = ins.plan || ins.membresia?.nombre || ins.membresiaId || 'Plan';
    const total = ins.totalCobrar ?? ins.valor ?? ins.precio ?? 0;
    partes.push(`<div class="mb-4 rounded border border-pf-linea p-3"><p class="font-bold text-white">${escapar(plan)}</p><p class="text-sm text-neutral-300">Pendiente de pago en recepción</p><p class="pf-precio font-semibold">Valor: ${formatearPrecio(total)}</p></div>`);
  });
  contenedor.innerHTML = partes.join('') || '<p>Pedido registrado.</p>';
}
