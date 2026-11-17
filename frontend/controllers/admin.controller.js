import { iniciarTema } from './comunes.controller.js';
import { usuarioActual, codigosRol, esAdministrador, iniciarSesion, cerrarSesion } from '../models/sesion.model.js';
import { adminModel } from '../models/admin.model.js';
import { CLAVES, leerCookie, escribirCookie } from '../models/storage.model.js';
import { construirValidador, mostrarMensaje } from './validacion.controller.js';
import { escapar, mostrarAviso } from '../views/componentes.view.js';
import { formatearPrecio } from '../models/carrito.model.js';

function select(s){ return document.querySelector(s); }
function selectAll(s){ return [...document.querySelectorAll(s)]; }

export function protegerAdmin() {
  const pagina = document.body.dataset.pagina;
  if (pagina === 'login-admin') return true;
  if (!esAdministrador()) { window.location.replace(new URL('login.html', document.baseURI).href); return false; }
  return true;
}

export function iniciarSesionAdminUI(){
  const u = usuarioActual();
  const codigos = codigosRol(u);
  const rolAdm = codigos.includes('ADM') || (!codigos.length && u?.rol === 'admin');
  selectAll('[data-admin-nombre]').forEach(n=> n.textContent = u?.nombre || u?.login || '');
  selectAll('[data-solo-adm]').forEach(n=> { n.hidden = !rolAdm; });
  if (!rolAdm && document.body.dataset.pagina === 'usuarios-admin') {
    window.location.replace(new URL('index.html', document.baseURI).href);
  }
  selectAll('[data-cerrar-sesion]').forEach(b=> b.addEventListener('click', ()=>{ cerrarSesion(); window.location.replace(new URL('login.html', document.baseURI).href); }));
}

function inyectarAvisosAdmin(){
  if (!document.querySelector('[data-aviso-cookies]')) {
    document.body.insertAdjacentHTML('beforeend', `<aside class="pf-aviso pf-foco-claro border border-pf-linea p-4 text-sm text-white" data-aviso-cookies aria-label="Aviso de cookies" hidden><p class="mb-2">Este sitio utiliza cookies para mejorar tu experiencia.</p><button type="button" class="btn btn-warning btn-sm" data-aceptar-cookies>Entendido</button></aside><div class="pf-aviso pf-mensaje" data-aviso role="status" aria-live="polite" hidden></div>`);
  }
  const aviso = document.querySelector('[data-aviso-cookies]');
  if (aviso && !leerCookie(CLAVES.cookieAviso)) aviso.hidden = false;
  document.querySelector('[data-aceptar-cookies]')?.addEventListener('click', () => {
    escribirCookie(CLAVES.cookieAviso, '1', 365);
    if (aviso) aviso.hidden = true;
    mostrarAviso('Preferencia guardada.', 'exito');
  });
}

export function iniciarLoginAdmin(){
  if (esAdministrador()) { window.location.replace(new URL('index.html', document.baseURI).href); return; }
  const form = select('#formulario-login-admin'); if(!form) return;
  const region = select('#mensaje-login-admin');
  const boton = form.querySelector('[type="submit"]');
  construirValidador(form, {
    alEnviar: async () => {
      if (boton) boton.disabled = true;
      try {
        const res = await iniciarSesion(form.querySelector('#correo').value.trim(), form.querySelector('#contrasena').value, 'admin');
        if (!res.ok) { mostrarMensaje(region, res.mensaje || 'No se pudo iniciar sesión.', 'error'); return false; }
        mostrarMensaje(region, 'Sesión iniciada.', 'exito');
        window.setTimeout(()=> window.location.href = new URL('index.html', document.baseURI).href, 500);
        return true;
      } finally {
        if (boton) boton.disabled = false;
      }
    }
  });
}

export async function iniciarDashboard(){
  try {
    const [resumen, pedidos] = await Promise.all([adminModel.resumen(), adminModel.pedidos({limit:5})]);
    const map = {
      '[data-total-productos]': resumen.productosActivos ?? resumen.productos ?? 0,
      '[data-total-bajo-stock]': resumen.bajoStock ?? 0,
      '[data-total-pedidos]': resumen.pedidosPendientes ?? resumen.pedidos ?? 0,
      '[data-total-clientes]': resumen.clientesActivos ?? resumen.clientes ?? 0,
      '[data-total-inscripciones]': resumen.inscripcionesPendientes ?? resumen.inscripciones ?? 0,
      '[data-total-mensajes]': resumen.mensajesPendientes ?? 0
    };
    Object.entries(map).forEach(([sel,val])=>{ const n=select(sel); if(n) n.textContent = val; });
    const tbody = select('[data-tabla-pedidos-recientes]');
    const lista = pedidos?.data || pedidos?.pedidos || pedidos || [];
    if (tbody) tbody.innerHTML = lista.length ? lista.map(p=>`<tr><th scope="row">${escapar(p.id)}</th><td>${escapar(p.usuario?.login||p.userId||'')}</td><td>${escapar(new Date(p.createdAt||Date.now()).toLocaleDateString('es-EC'))}</td><td>${escapar(p.estadoNombre||p.estado||'')}</td><td>${formatearPrecio(p.total)}</td><td><a class="btn btn-sm btn-outline-primary" href="pedidos.html">Ver</a></td></tr>`).join('') : '<tr><td colspan="6" class="text-center text-body-secondary">No hay pedidos recientes.</td></tr>';
  } catch(e){ mostrarMensaje(select('#mensaje-admin'), e.mensaje || 'No se pudo cargar el dashboard.', 'error'); }
}

export function estadoTexto(valor, mapa){
  return mapa?.[valor] || valor || 'vacío';
}

window.addEventListener('pf:sesion-expirada', ()=>{ window.location.href = new URL('login.html', document.baseURI).href; });

export async function mainAdmin(){
  iniciarTema();
  const pagina = document.body.dataset.pagina;
  if (pagina === 'login-admin'){ inyectarAvisosAdmin(); iniciarLoginAdmin(); return; }
  if (!protegerAdmin()) return;
  iniciarSesionAdminUI();
  inyectarAvisosAdmin();
  selectAll('[data-anio]').forEach((nodo) => { nodo.textContent = new Date().getFullYear(); });
  if (pagina === 'dashboard') await iniciarDashboard();
  // pantallas específicas se auto-inician por su propio módulo importado en HTML
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mainAdmin); else mainAdmin();
