import { haySesion } from '../models/sesion.model.js';
import { misPedidos, misInscripciones, cancelarPedido } from '../models/pedido.model.js';
import { tarjetaPedido, tarjetaInscripcion, paginacion } from '../views/pedidos.view.js';
import { raizSitio } from '../models/storage.model.js';
import { mostrarAviso } from '../views/componentes.view.js';
import { confirmarAccion } from './dialogo.controller.js';
import { rutinasModel } from '../models/fase2.model.js';
import { notificacionesModel } from '../models/notificaciones.model.js';
import { tarjetaRutina, tarjetasNotificaciones } from '../views/pedidos.view.js';

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

// Mi cuenta: inscripciones (fecha de fin y total de ingresos), rutina vigente y notificaciones.
export async function iniciarMiCuenta(){
  if (!haySesion()){ window.location.href = new URL('cliente/login.html?origen=mi-cuenta', raizSitio()).href; return; }
  await Promise.all([cargarInscripciones(), cargarRutina(), cargarNotificaciones()]);
}

async function cargarRutina(){
  const cont = select('[data-mi-rutina]'); if (!cont) return;
  try { const r = await rutinasModel.miRutina(); cont.innerHTML = tarjetaRutina(r?.data ?? r); }
  catch (e){ cont.innerHTML = tarjetaRutina(null, e.status === 404 ? '' : (e.mensaje || 'No se pudo cargar tu rutina.')); }
  finally { cont.setAttribute('aria-busy', 'false'); }
}

async function cargarNotificaciones(){
  const cont = select('[data-mis-notificaciones]'); if (!cont) return;
  const pintar = async () => {
    try {
      const lista = await notificacionesModel.listar({ limit: 20 });
      cont.innerHTML = tarjetasNotificaciones(lista);
      const n = select('[data-mis-no-leidas]'); if (n) n.textContent = lista.noLeidas ? `${lista.noLeidas} notificaci${lista.noLeidas === 1 ? 'ón' : 'ones'} sin leer` : 'No tienes notificaciones sin leer.';
    } catch (e){ mostrarErrorCarga(cont, e.mensaje || 'No se pudieron cargar las notificaciones.'); }
    finally { cont.setAttribute('aria-busy', 'false'); }
  };
  cont.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-leer-notificacion]'); if (!b) return;
    try { await notificacionesModel.marcarLeida(b.dataset.leerNotificacion); mostrarAviso('Notificación marcada como leída.', 'exito'); await pintar(); }
    catch (err){ mostrarAviso(err.mensaje || 'No se pudo marcar la notificación.', 'error'); }
  });
  await pintar();
}

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
