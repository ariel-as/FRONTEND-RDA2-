import { haySesion } from '../models/sesion.model.js';
import { misPedidos, misInscripciones, cancelarPedido } from '../models/pedido.model.js';
import { tarjetaPedido, tarjetaInscripcion, paginacion } from '../views/pedidos.view.js';
import { raizSitio } from '../models/storage.model.js';
import { mostrarAviso } from '../views/componentes.view.js';
import { confirmarAccion } from './dialogo.controller.js';

function mostrarErrorCarga(contenedor, mensaje) {
  const aviso = document.createElement('p');
  aviso.className = 'pf-mensaje';
  aviso.textContent = mensaje;
  contenedor.replaceChildren(aviso);
}

const select = s => document.querySelector(s);
let paginaActual = 1;

export async function iniciarMisPedidos(){
  if (!haySesion()){ window.location.href = new URL('cliente/login.html?origen=mis-pedidos', raizSitio()).href; return; }
  await cargar();
  document.addEventListener('click', async (e)=>{
    const btnPage = e.target.closest('[data-page]'); if (btnPage && !btnPage.disabled){ paginaActual = Number(btnPage.dataset.page)||1; await cargarPedidos(); }
    const btnCancel = e.target.closest('[data-cancelar-pedido]');
    if (btnCancel){
      const id = btnCancel.dataset.cancelarPedido;
      if (!await confirmarAccion({ titulo: 'Cancelar pedido', mensaje: `¿Cancelar el pedido #${id}? Esta acción no se puede deshacer.`, textoConfirmar: 'Cancelar pedido' })) return;
      try { await cancelarPedido(id); mostrarAviso('Pedido cancelado.', 'exito'); await cargarPedidos(); }
      catch(err){ mostrarAviso(err.mensaje || 'No se pudo cancelar el pedido.', 'error'); }
    }
  });
}

async function cargar(){ await Promise.all([cargarPedidos(), cargarInscripciones()]); }

async function cargarPedidos(){
  const cont = select('[data-mis-pedidos]'); const pag = select('[data-paginacion-pedidos]'); if(!cont) return;
  try {
    const res = await misPedidos(paginaActual, 10);
    const lista = res?.data || res?.pedidos || res || [];
    const pagination = res?.pagination || { page: paginaActual, totalPages: 1 };
    cont.innerHTML = lista.length ? lista.map(p=>tarjetaPedido(p)).join('') : '<p class="pf-mensaje">No tienes pedidos todavía.</p>';
    if (pag) pag.innerHTML = paginacion(pagination);
  } catch (e){ if(e.status===401){ window.location.href=new URL('cliente/login.html?origen=mis-pedidos', raizSitio()).href; return; } mostrarErrorCarga(cont, e.mensaje || 'No se pudieron cargar los pedidos.'); }
}

async function cargarInscripciones(){
  const cont = select('[data-mis-planes]'); if(!cont) return;
  try {
    const res = await misInscripciones();
    const lista = Array.isArray(res) ? res : (res?.data || res?.inscripciones || []);
    cont.innerHTML = lista.length ? lista.map(tarjetaInscripcion).join('') : '<p class="pf-mensaje">No tienes planes registrados.</p>';
  } catch (e){ mostrarErrorCarga(cont, e.mensaje || 'No se pudieron cargar los planes.'); }
}
