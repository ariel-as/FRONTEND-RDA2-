import { carrito, formatearPrecio, esPlan } from '../models/carrito.model.js';
import { raizSitio } from '../models/storage.model.js';
import { escapar, rutaArchivo, actualizarContadorCarrito, etiquetaIva } from './componentes.view.js';

export function inyectarEstructuraPanel() {
  if (document.querySelector('[data-modal-acceso]')) return;
  const tienda = new URL('index.html#tienda', raizSitio()).href;
  const registro = new URL('cliente/login.html#registro', raizSitio()).href;
  const accesoAdmin = new URL('admin/login.html', raizSitio()).href;
  const panel = document.querySelector('[data-panel-carrito]');
  const contenido = panel?.querySelector('[data-panel-contenido]');
  if (!panel || !contenido) return;
  contenido.innerHTML = `
    <div class="pf-panel-cuerpo"><div data-panel-vacio-state hidden><p class="m-0 font-bold text-white">Tu carrito está vacío</p><p class="mt-2 text-sm text-neutral-300">Agrega productos desde la tienda: puedes hacerlo sin iniciar sesión.</p><a href="${escapar(tienda)}" class="pf-boton pf-boton-primario mt-4 w-full" aria-label="Ver productos en la tienda">Ver productos</a></div><ul class="m-0 list-none p-0" data-panel-lineas></ul></div>
    <div class="pf-panel-pie"><dl class="m-0"><div class="pf-total-bloque"><dt>Subtotal</dt><dd data-panel-subtotal>$0.00</dd></div><div class="pf-total-bloque pf-total-final"><dt>Total estimado (IVA incluido)</dt><dd data-panel-total>$0.00</dd></div></dl><p class="mt-2 text-xs text-neutral-400">Retiro en el gimnasio. El pedido se confirma en el checkout.</p><button type="button" class="pf-boton pf-boton-secundario mt-4 w-full" data-panel-vaciar aria-label="Vaciar el carrito">Vaciar carrito</button><button type="button" class="pf-boton pf-boton-primario mt-3 w-full" data-panel-finalizar aria-label="Finalizar compra">Finalizar compra</button><button type="button" class="pf-boton pf-boton-enlace mt-2 w-full" data-panel-continuar aria-label="Continuar comprando">Continuar comprando</button></div>`;
  panel.hidden = false;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="pf-capa" data-capa-carrito data-visible="false"></div>
    <div class="pf-capa" data-capa-acceso data-visible="false"></div>
    <div class="pf-modal" id="modal-acceso" data-modal-acceso data-visible="false" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-acceso" inert>
      <div class="pf-modal-cabecera"><h2 id="titulo-modal-acceso">Inicia sesión</h2><button type="button" class="pf-panel-cerrar" data-cerrar-acceso aria-label="Cerrar el inicio de sesión"><span aria-hidden="true">&times;</span></button></div>
      <form class="space-y-4 p-5" data-formulario-acceso novalidate>
        <p class="m-0 text-sm text-neutral-300">Para finalizar tu compra necesitas iniciar sesión. Tu carrito se conserva mientras te autenticas.</p>
        <div><label class="block font-bold text-white" for="acceso-correo">Correo</label><input class="mt-1 w-full rounded-lg border border-pf-linea p-2" type="email" id="acceso-correo" name="correo" required autocomplete="email"></div>
        <div><label class="block font-bold text-white" for="acceso-contrasena">Contraseña</label><input class="mt-1 w-full rounded-lg border border-pf-linea p-2" type="password" id="acceso-contrasena" name="contrasena" required minlength="8" maxlength="72" autocomplete="current-password"></div>
        <p class="pf-mensaje m-0 text-sm" data-mensaje-acceso role="status" aria-live="polite" hidden></p>
        <button type="submit" class="pf-boton pf-boton-primario w-full" aria-label="Iniciar sesión para finalizar la compra">Iniciar sesión</button>
        <p class="m-0 text-sm text-neutral-300">¿No tienes cuenta? <a href="${escapar(registro)}" class="font-bold text-pf-amarillo underline" aria-label="Crear cuenta de cliente">Crear cuenta</a></p>
        <p class="m-0 text-sm text-neutral-300">¿Formas parte del equipo? <a href="${escapar(accesoAdmin)}" class="font-bold text-pf-amarillo underline" aria-label="Acceder al panel administrativo">Acceso administrativo</a></p>
      </form>
    </div>`);
}

function controlCantidad(item) {
  const nombre = escapar(item.nombre);
  if (esPlan(item)) return `<span class="pf-cantidad"><output aria-label="Cantidad de ${nombre}">${escapar(item.cantidad)}</output></span>`;
  return `<span class="pf-cantidad"><button type="button" data-restar="${escapar(item.id)}" aria-label="Disminuir la cantidad de ${nombre}"><span aria-hidden="true">&minus;</span></button><output aria-label="Cantidad de ${nombre}">${escapar(item.cantidad)}</output><button type="button" data-sumar="${escapar(item.id)}" aria-label="Aumentar la cantidad de ${nombre}"><span aria-hidden="true">+</span></button></span>`;
}

export function pintarPanelCarrito() {
  const lista = document.querySelector('[data-panel-lineas]'); if (!lista) return;
  const items = carrito.obtener();
  const articulos = carrito.contar();
  const vacio = document.querySelector('[data-panel-vacio-state]'); if (vacio) vacio.hidden = items.length > 0;
  lista.innerHTML = items.map((item)=>`
      <li class="pf-linea" data-linea-panel="${escapar(item.id)}">
        ${item.imagen ? `<img src="${escapar(rutaArchivo(item.imagen))}" alt="${escapar(item.nombre)}" width="64" height="64">` : `<span class="pf-linea-sin-imagen" aria-hidden="true">${escapar((item.nombre||'?').charAt(0).toUpperCase())}</span>`}
        <div class="pf-linea-detalle"><p class="m-0 font-bold text-white">${escapar(item.nombre)}</p><p class="m-0 text-sm text-neutral-400">${escapar(esPlan(item)?'Plan mensual':'Producto')} ${formatearPrecio(item.precio)} c/u · ${etiquetaIva(item.porcentajeIva)}</p><div class="pf-linea-precios">${controlCantidad(item)}<span class="pf-precio">${formatearPrecio(item.precio*item.cantidad)}</span></div><button type="button" class="pf-quitar" data-quitar="${escapar(item.id)}" aria-label="Eliminar ${nombre} del carrito">Eliminar del carrito</button></div>
      </li>`).join('');
  const etiqueta = document.querySelector('[data-panel-articulos]'); if (etiqueta) etiqueta.textContent = `(${articulos})`;
  const subtotal = carrito.subtotal();
  const nodoSubtotal = document.querySelector('[data-panel-subtotal]'); const nodoTotal = document.querySelector('[data-panel-total]');
  if (nodoSubtotal) nodoSubtotal.textContent = formatearPrecio(subtotal);
  if (nodoTotal) nodoTotal.textContent = formatearPrecio(carrito.total());
  actualizarContadorCarrito(articulos);
}
