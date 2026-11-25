import { carrito } from '../models/carrito.model.js';
import { haySesion, refrescarPerfil, consumirPendencia } from '../models/sesion.model.js';
import { confirmarCompra, numeroPedidoCliente } from '../models/pedido.model.js';
import { pintarResumenCheckout, pintarClienteReadonly, pintarConfirmacion } from '../views/checkout.view.js';
import { construirValidador, mostrarMensaje } from './validacion.controller.js';
import { raizSitio } from '../models/storage.model.js';
import { CUENTA_TRANSFERENCIA } from '../models/config.js';
import { escapar } from '../views/componentes.view.js';

const select = s => document.querySelector(s);

export async function iniciarCheckout(){
  if (!haySesion()) {
    window.location.href = new URL('cliente/login.html?origen=checkout', raizSitio()).href; return;
  }
  const items = carrito.obtener();
  const vacio = select('[data-checkout-vacio]');
  const formWrap = select('[data-checkout-formulario]');
  const bloqueResumen = select('[data-checkout-bloque]');
  if (!items.length){ if(vacio) vacio.hidden=false; if(formWrap) formWrap.hidden=true; if(bloqueResumen) bloqueResumen.hidden=true; return; }
  pintarResumenCheckout(select('[data-checkout-resumen]'), items, carrito.total());
  try {
    const usuario = await refrescarPerfil();
    pintarClienteReadonly(select('[data-checkout-cliente]'), usuario);
  } catch (e){ if(e.status===401){ window.location.href = new URL('cliente/login.html?origen=checkout', raizSitio()).href; return; } }
  configurarPago();
  pintarAyudasPago(items);
  const form = select('#formulario-checkout'); if(!form) return;
  const region = select('#mensaje-checkout');
  construirValidador(form, { alEnviar: async ()=>{
    const boton = form.querySelector('button[type="submit"]');
    const metodoPago = form.querySelector('input[name="metodoPago"]:checked')?.value || 'EF';
    const ref = form.querySelector('#refTransferencia')?.value?.trim();
    if (metodoPago==='TR' && !/^[A-Za-z0-9-]{4,30}$/.test(ref || '')){ mostrarMensaje(region, 'Con transferencia, escribe el número de comprobante (4 a 30 letras, números o guion).', 'error'); form.querySelector('#refTransferencia')?.focus(); return false; }
    boton.disabled = true; form.setAttribute('aria-busy','true'); mostrarMensaje(region,'Registrando tu pedido...','info');
    try {
      const resultado = await confirmarCompra(items, { metodoPago, refTransferencia: ref });
      (resultado.confirmadas||[]).forEach(id => carrito.eliminar(id));
      pintarResumenCheckout(select('[data-checkout-resumen]'), carrito.obtener(), carrito.total());
      const conf = select('[data-checkout-confirmacion]');
      if (conf){
        let numeroPedido = null;
        if (resultado.pedido){ try { numeroPedido = await numeroPedidoCliente(resultado.pedido.id); } catch { numeroPedido = null; } }
        const tituloConfirmacion = conf.querySelector('h2');
        if (tituloConfirmacion && resultado.pedido) tituloConfirmacion.textContent = numeroPedido ? `Tu pedido N.º ${numeroPedido}` : 'Tu pedido registrado';
        pintarConfirmacion(select('[data-confirmacion-resumen]'), { ...resultado, numeroPedido });
        conf.hidden=false; tituloConfirmacion?.focus?.();
      }
      const constConflictos = Boolean(resultado.errores?.some((e) => e.ajustes?.length));
      if (resultado.errores?.length){
        const textos = resultado.errores.map((e) => {
          if (!e.ajustes?.length) return e.mensaje || 'No se pudo registrar parte del pedido.';
          return e.ajustes.map((a) => a.disponible > 0
            ? `Solo quedan ${a.disponible} unidades de ${a.nombre}; ajustamos tu carrito.`
            : `${a.nombre} ya no está disponible; lo quitamos del carrito.`).join(' ');
        });
        mostrarMensaje(region, textos.join(' '), 'error');
      }
      else { mostrarMensaje(region, 'Pedido registrado correctamente.', 'exito'); }
      if ((resultado.confirmadas || []).length && !constConflictos) {
        form.hidden = true;
        if (bloqueResumen) bloqueResumen.hidden = true;
        consumirPendencia('checkout');
      }
    } catch (e){
      if (e.status===401){ window.location.href = new URL('cliente/login.html?origen=checkout', raizSitio()).href; return false; }
      if (e.status===409){ mostrarMensaje(region, e.mensaje || 'Hay un conflicto con tu pedido. Revisa el carrito.', 'error'); }
      else mostrarMensaje(region, e.mensaje || 'No se pudo registrar el pedido.', 'error');
      return false;
    } finally { boton.disabled=false; form.removeAttribute('aria-busy'); }
  }});
}

// Datos de la cuenta para transferir (models/config.js) y textos distintos para planes y productos.
function pintarAyudasPago(items){
  const cuenta = select('[data-cuenta-transferencia]');
  if (cuenta) {
    const c = CUENTA_TRANSFERENCIA;
    cuenta.innerHTML = c.numero
      ? `<p class="m-0 font-semibold text-white">Transfiere a esta cuenta:</p><p class="m-0">${escapar(c.banco)} · ${escapar(c.tipo)} N.º ${escapar(c.numero)}</p><p class="m-0">Titular: ${escapar(c.titular)} · RUC ${escapar(c.ruc)}</p>`
      : '<p class="m-0">Pide en recepción o por el teléfono del gimnasio los datos de la cuenta para transferir.</p>';
  }
  const planes = items.filter((i) => i.tipo === 'plan');
  const productos = items.filter((i) => i.tipo !== 'plan');
  const aviso = select('[data-aviso-planes]');
  const pago = select('#formulario-checkout fieldset');
  if (aviso && planes.length) {
    aviso.hidden = false;
    aviso.textContent = productos.length
      ? 'Los planes se pagan en recepción (efectivo o transferencia en el gimnasio) y se activan cuando recepción cobra. La forma de pago de abajo es solo para los productos.'
      : 'Pagas en recepción, en efectivo o por transferencia en el gimnasio. Tu plan se activa cuando recepción registra el cobro.';
  }
  if (pago && planes.length && !productos.length) pago.hidden = true;
  const botonConfirmar = select('#formulario-checkout [type="submit"]');
  if (botonConfirmar && planes.length && !productos.length) botonConfirmar.textContent = 'Reservar plan y pagar en recepción';
}

function configurarPago(){
  const radios = document.querySelectorAll('input[name="metodoPago"]');
  const campoRef = document.querySelector('[data-campo-transferencia]');
  const entradaRef = document.querySelector('#refTransferencia');
  // Con transferencia el número de comprobante es obligatorio; con efectivo el campo no se valida.
  const actualizar = ()=>{ const esTR = document.querySelector('input[name="metodoPago"]:checked')?.value === 'TR'; if(campoRef) campoRef.hidden = !esTR; if(entradaRef){ entradaRef.required = esTR; entradaRef.disabled = !esTR; } };
  radios.forEach(r=>r.addEventListener('change', actualizar));
  actualizar();
}
