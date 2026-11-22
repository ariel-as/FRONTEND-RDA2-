import { carrito, CANTIDAD_MAXIMA } from '../models/carrito.model.js';
import { iniciarSesion, haySesion, guardarPendencia } from '../models/sesion.model.js';
import { construirValidador, mostrarMensaje } from './validacion.controller.js';
import { mostrarAviso } from '../views/componentes.view.js';
import { inyectarEstructuraPanel, pintarPanelCarrito } from '../views/carrito.view.js';
import { raizSitio } from '../models/storage.model.js';

let focoAnteriorPanel = null;
let focoAnteriorModal = null;

function alternarCapa(nodo, visible){ if(!nodo) return; nodo.dataset.visible=String(visible); nodo.setAttribute('aria-hidden', String(!visible)); nodo.inert = !visible; }
function estaAbierto(nodo){ return nodo?.dataset.visible === 'true'; }
function enfocarEnDialogo(elemento, intentos=40){ if(!elemento) return; let restantes=intentos; const intentar=()=>{ elemento.focus(); if(document.activeElement===elemento||restantes<=1) return; restantes-=1; requestAnimationFrame(intentar); }; requestAnimationFrame(intentar); }

function abrirPanel(){ const panel=document.querySelector('[data-panel-carrito]'); if(!panel) return; focoAnteriorPanel=document.activeElement; pintarPanelCarrito(); alternarCapa(panel,true); alternarCapa(document.querySelector('[data-capa-carrito]'),true); document.body.classList.add('pf-bloquea-scroll'); document.querySelectorAll('[data-abrir-carrito]').forEach(b=>b.setAttribute('aria-expanded','true')); enfocarEnDialogo(panel.querySelector('[data-cerrar-carrito]')); }
function cerrarPanel({devolverFoco=true}={}){ const panel=document.querySelector('[data-panel-carrito]'); if(!panel||!estaAbierto(panel)) return; alternarCapa(panel,false); alternarCapa(document.querySelector('[data-capa-carrito]'),false); document.body.classList.remove('pf-bloquea-scroll'); document.querySelectorAll('[data-abrir-carrito]').forEach(b=>b.setAttribute('aria-expanded','false')); if(devolverFoco && focoAnteriorPanel instanceof HTMLElement) focoAnteriorPanel.focus(); }
function abrirModalAcceso(){ const modal=document.querySelector('[data-modal-acceso]'); if(!modal) return; if(!estaAbierto(modal)) focoAnteriorModal=document.activeElement; alternarCapa(modal,true); alternarCapa(document.querySelector('[data-capa-acceso]'),true); document.body.classList.add('pf-bloquea-scroll'); enfocarEnDialogo(modal.querySelector('#acceso-correo')); }
function cerrarModalAcceso({devolverFoco=true}={}){ const modal=document.querySelector('[data-modal-acceso]'); if(!modal||!estaAbierto(modal)) return; alternarCapa(modal,false); alternarCapa(document.querySelector('[data-capa-acceso]'),false); const panelAbierto=estaAbierto(document.querySelector('[data-panel-carrito]')); if(!panelAbierto) document.body.classList.remove('pf-bloquea-scroll'); if(devolverFoco && focoAnteriorModal instanceof HTMLElement) focoAnteriorModal.focus(); }

function finalizarCompra(){
  if (carrito.contar() === 0) { mostrarAviso('Agrega productos al carrito antes de finalizar la compra.', 'error'); return; }
  if (haySesion()) { window.location.href = new URL('cliente/checkout.html', raizSitio()).href; return; }
  guardarPendencia('checkout', {});
  abrirModalAcceso();
}

export function iniciarPanelCarrito(){
  inyectarEstructuraPanel(); pintarPanelCarrito();
  document.querySelectorAll('[data-abrir-carrito]').forEach((b)=>b.addEventListener('click', abrirPanel));
  document.querySelector('[data-cerrar-carrito]')?.addEventListener('click', ()=>cerrarPanel());
  document.querySelector('[data-capa-carrito]')?.addEventListener('click', ()=>cerrarPanel());
  document.querySelector('[data-cerrar-acceso]')?.addEventListener('click', ()=>cerrarModalAcceso());
  document.querySelector('[data-capa-acceso]')?.addEventListener('click', ()=>cerrarModalAcceso());
  document.querySelector('[data-panel-lineas]')?.addEventListener('click', (evento)=>{
    const sumar = evento.target.closest('[data-sumar]'); const restar = evento.target.closest('[data-restar]'); const quitar = evento.target.closest('[data-quitar]');
    if (sumar){ const id=sumar.dataset.sumar; const item=carrito.obtener().find(l=>String(l.id)===id); if(item && item.cantidad >= (item.stock ?? CANTIDAD_MAXIMA)) { mostrarAviso('No hay más unidades disponibles.', 'info'); return; } carrito.cambiar(id, (item?.cantidad||0)+1); return; }
    if (restar){ const id=restar.dataset.restar; const item=carrito.obtener().find(l=>String(l.id)===id); if(!item) return; if(item.cantidad<=1){ carrito.eliminar(id); } else { carrito.cambiar(id, item.cantidad-1); } return; }
    if (quitar){ carrito.eliminar(quitar.dataset.quitar); }
  });
  document.querySelector('[data-panel-vaciar]')?.addEventListener('click', ()=>{ if(carrito.contar()===0){ mostrarAviso('El carrito ya está vacío.', 'info'); return;} carrito.vaciar(); });
  document.querySelector('[data-panel-continuar]')?.addEventListener('click', ()=>cerrarPanel());
  document.querySelector('[data-panel-finalizar]')?.addEventListener('click', finalizarCompra);
  const formulario = document.querySelector('[data-formulario-acceso]');
  if (formulario){
    const region = formulario.querySelector('[data-mensaje-acceso]');
    construirValidador(formulario, { alEnviar: async ()=>{
      try {
        const correo = formulario.querySelector('#acceso-correo').value;
        const contrasena = formulario.querySelector('#acceso-contrasena').value;
        const resultado = await iniciarSesion(correo, contrasena, 'cliente');
        if (!resultado.ok){ mostrarMensaje(region, resultado.mensaje || 'No se pudo iniciar sesión.', 'error'); return false; }
        mostrarMensaje(region, 'Sesión iniciada. Abriendo el checkout...', 'exito');
        window.location.href = new URL('cliente/checkout.html', raizSitio()).href;
      } catch (e){ mostrarMensaje(region, e?.mensaje || 'No se pudo conectar con el servidor.', 'error'); return false; }
    }});
  }
  document.addEventListener('keydown', (evento)=>{
    if (evento.key === 'Escape'){ if(estaAbierto(document.querySelector('[data-modal-acceso]'))){ evento.preventDefault(); cerrarModalAcceso(); } else if(estaAbierto(document.querySelector('[data-panel-carrito]'))){ evento.preventDefault(); cerrarPanel(); } }
  });
  window.addEventListener('carrito:actualizado', pintarPanelCarrito);
}

export const panelCarrito = { abrir: abrirPanel, cerrar: cerrarPanel, pintar: pintarPanelCarrito, abrirAcceso: abrirModalAcceso };
