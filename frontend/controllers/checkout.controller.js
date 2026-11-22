import { carrito } from '../models/carrito.model.js';
import { haySesion, refrescarPerfil, consumirPendencia } from '../models/sesion.model.js';
import { confirmarCompra } from '../models/pedido.model.js';
import { pintarResumenCheckout, pintarClienteReadonly, pintarConfirmacion } from '../views/checkout.view.js';
import { construirValidador, mostrarMensaje } from './validacion.controller.js';
import { raizSitio } from '../models/storage.model.js';

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
      if (conf){ pintarConfirmacion(select('[data-confirmacion-resumen]'), resultado); conf.hidden=false; conf.querySelector('h2')?.focus?.(); }
      if (resultado.errores?.length){ mostrarMensaje(region, resultado.errores.map(e=>e.mensaje).join(' '), 'error'); }
      else { mostrarMensaje(region, 'Pedido registrado correctamente.', 'exito'); }
      if ((resultado.confirmadas || []).length) {
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

function configurarPago(){
  const radios = document.querySelectorAll('input[name="metodoPago"]');
  const campoRef = document.querySelector('[data-campo-transferencia]');
  const entradaRef = document.querySelector('#refTransferencia');
  // Con transferencia el número de comprobante es obligatorio; con efectivo el campo no se valida.
  const actualizar = ()=>{ const esTR = document.querySelector('input[name="metodoPago"]:checked')?.value === 'TR'; if(campoRef) campoRef.hidden = !esTR; if(entradaRef){ entradaRef.required = esTR; entradaRef.disabled = !esTR; } };
  radios.forEach(r=>r.addEventListener('change', actualizar));
  actualizar();
}
