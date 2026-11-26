import { haySesion, esAdministrador } from '../models/sesion.model.js';
import { misPedidos, misInscripciones, cancelarPedido } from '../models/pedido.model.js';
import { tarjetaPedido, tarjetaInscripcion, paginacion } from '../views/pedidos.view.js';
import { raizSitio } from '../models/storage.model.js';
import { mostrarAviso } from '../views/componentes.view.js';
import { confirmarAccion } from './dialogo.controller.js';
import { rutinasModel } from '../models/fase2.model.js';
import { notificacionesModel } from '../models/notificaciones.model.js';
import { tarjetaRutina, tarjetasNotificaciones } from '../views/pedidos.view.js';

function mostrarErrorCarga(contenedor, mensaje, error) {
  const aviso = document.createElement('p');
  aviso.className = 'pf-mensaje';
  // Cuenta sin ficha de cliente: se explica qué hacer en lugar de mostrar el error del servidor.
  aviso.textContent = error?.status === 403 && /vinculada/i.test(error?.mensaje || '') ? 'Acércate a recepción para vincular tu cuenta con tu ficha de cliente.' : mensaje;
  if (aviso.textContent !== mensaje) aviso.dataset.tipo = 'info';
  contenedor.replaceChildren(aviso);
}

const select = s => document.querySelector(s);
let paginaActual = 1;

// Las cuentas del personal no tienen pedidos ni planes de cliente: se les ofrece ir al panel sin consultar la API.
function esCuentaDePersonal(){
  if (!esAdministrador()) return false;
  const main = document.querySelector('main');
  main?.querySelectorAll('section').forEach((s) => { s.hidden = true; });
  main?.insertAdjacentHTML('beforeend', `<div class="pf-tarjeta mt-6 p-6"><p class="m-0">Esta es el área de clientes. Tu cuenta es del personal del gimnasio.</p><a class="pf-boton pf-boton-primario mt-4 inline-block" href="${new URL('admin/index.html', raizSitio()).href}">Ir al panel administrativo</a></div>`);
  return true;
}

export async function iniciarMisPedidos(){
  if (!haySesion()){ window.location.href = new URL('cliente/login.html?origen=mis-pedidos', raizSitio()).href; return; }
  if (esCuentaDePersonal()) return;
  await cargar();
  document.addEventListener('click', async (e)=>{
    const btnPage = e.target.closest('[data-page]'); if (btnPage && !btnPage.disabled){ paginaActual = Number(btnPage.dataset.page)||1; await cargarPedidos(); }
    const btnCancel = e.target.closest('[data-cancelar-pedido]');
    if (btnCancel){
      const id = btnCancel.dataset.cancelarPedido;
      if (!await confirmarAccion({ titulo: 'Cancelar pedido', mensaje: `¿Cancelar tu pedido N.º ${btnCancel.dataset.ordenCliente || '—'}? Esta acción no se puede deshacer.`, textoConfirmar: 'Cancelar pedido' })) return;
      try { await cancelarPedido(id); mostrarAviso('Pedido cancelado.', 'exito'); await cargarPedidos(); }
      catch(err){ mostrarAviso(err.mensaje || 'No se pudo cancelar el pedido.', 'error'); }
    }
  });
}

async function cargar(){ await Promise.all([cargarPedidos(), cargarInscripciones()]); }

// Mi cuenta: inscripciones (fecha de fin y total de ingresos), rutina vigente y notificaciones.
export async function iniciarMiCuenta(){
  if (!haySesion()){ window.location.href = new URL('cliente/login.html?origen=mi-cuenta', raizSitio()).href; return; }
  if (esCuentaDePersonal()) return;
  await Promise.all([cargarInscripciones(), cargarRutina(), cargarNotificaciones()]);
}

async function cargarRutina(){
  const cont = select('[data-mi-rutina]'); if (!cont) return;
  try {
    const r = await rutinasModel.miRutina();
    cont.innerHTML = tarjetaRutina(r?.data ?? r);
    cont.querySelector('[data-imprimir-rutina]')?.addEventListener('click', () => {
      const nodo = select('#rutina-impresion'); if (!nodo) return;
      nodo.innerHTML = cont.querySelector('.pf-tarjeta')?.outerHTML || '';
      nodo.hidden = false;
      window.addEventListener('afterprint', () => { nodo.innerHTML = ''; nodo.hidden = true; }, { once: true });
      window.print();
    });
  }
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
    } catch (e){ mostrarErrorCarga(cont, e.mensaje || 'No se pudieron cargar las notificaciones.', e); }
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
    // Orden propio de la lista (el más reciente primero) además del número único del sistema.
    const total = Number(pagination.total) || lista.length;
    const desde = ((Number(pagination.page) || paginaActual) - 1) * 10;
    cont.innerHTML = lista.length ? lista.map((p, i) => tarjetaPedido(p, { orden: total - desde - i, total })).join('') : '<p class="pf-mensaje">No tienes pedidos todavía.</p>';
    if (pag) pag.innerHTML = paginacion(pagination);
  } catch (e){ if(e.status===401){ window.location.href=new URL('cliente/login.html?origen=mis-pedidos', raizSitio()).href; return; } mostrarErrorCarga(cont, e.mensaje || 'No se pudieron cargar los pedidos.'); }
}

async function cargarInscripciones(){
  const cont = select('[data-mis-planes]'); if(!cont) return;
  try {
    const res = await misInscripciones();
    const lista = Array.isArray(res) ? res : (res?.data || res?.inscripciones || []);
    cont.innerHTML = lista.length ? lista.map(tarjetaInscripcion).join('') : '<p class="pf-mensaje">No tienes planes registrados.</p>';
  } catch (e){ mostrarErrorCarga(cont, e.mensaje || 'No se pudieron cargar los planes.', e); }
}
