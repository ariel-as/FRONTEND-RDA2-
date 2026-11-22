import { iniciarTema } from './comunes.controller.js';
import { usuarioActual, codigosRol, esAdministrador, iniciarSesion, cerrarSesion, refrescarPerfil } from '../models/sesion.model.js';
import { adminModel } from '../models/admin.model.js';
import { api } from '../models/api.model.js';
import { CLAVES, leerCookie, escribirCookie, leerSesion, escribirSesion } from '../models/storage.model.js';
import { esAdm, puede } from '../models/permisos.model.js';
import { INICIO_PANEL, entradaDePagina, menuVisible } from '../models/menu.model.js';
import { construirValidador, mostrarMensaje } from './validacion.controller.js';
import { escapar, mostrarAviso } from '../views/componentes.view.js';
import { pintarMenuAdmin, pintarSinAcceso } from '../views/menu.view.js';
import { accesosDirectosHtml, indicadorHtml } from '../views/dashboard.view.js';
import { iniciarCampana } from './campana.controller.js';
import { entradasModel, cajaModel, inscripcionesModel, facturasModel, rutinasModel, asistenciaModel } from '../models/fase2.model.js';
import { iniciarAvisoServidor } from '../views/servidor.view.js';
import { formatearPrecio } from '../models/carrito.model.js';

function select(s){ return document.querySelector(s); }
function selectAll(s){ return [...document.querySelectorAll(s)]; }

export function protegerAdmin() {
  const pagina = document.body.dataset.pagina;
  if (pagina === 'login-admin') return true;
  if (!esAdministrador()) { window.location.replace(new URL('login.html', document.baseURI).href); return false; }
  return true;
}

export function paginaActual() {
  const archivo = window.location.pathname.split('/').pop() || 'index.html';
  return { archivo, ancla: window.location.hash.replace(/^#/, '') };
}

// La página se puede usar si el usuario tiene el permiso de su entrada en el menú.
export function accesoPagina() {
  const entrada = entradaDePagina(paginaActual().archivo);
  return !entrada || puede(entrada.permiso);
}

export function pintarMenu() {
  pintarMenuAdmin(select('[data-menu-admin]'), { inicio: INICIO_PANEL, grupos: menuVisible((permiso) => puede(permiso)), actual: paginaActual() });
}

// Bloquea la pantalla sin llamar a la API. Devuelve true si el usuario puede seguir.
export function verificarAccesoPagina() {
  if (accesoPagina()) return true;
  api.bloquear();
  document.body.dataset.sinAcceso = 'true';
  pintarSinAcceso(select('main'));
  return false;
}

export function iniciarSesionAdminUI(){
  const u = usuarioActual();
  const codigos = codigosRol(u);
  const rolAdm = esAdm(u);
  const TIPOS = { ADM: 'Administrador general', REC: 'Recepcionista', ENT: 'Entrenador', CON: 'Contador' };
  const tipo = codigos.map((c)=>TIPOS[c]).find(Boolean) || (u?.rol === 'admin' ? 'Administrador general' : 'Administrador');
  selectAll('[data-admin-tipo]').forEach(n=> { n.textContent = tipo; });
  document.querySelector('.pf-admin-usuario')?.setAttribute('aria-label', `Opciones de ${tipo}`);
  selectAll('[data-solo-adm]').forEach(n=> { n.hidden = !rolAdm; });
  selectAll('[data-permiso]').forEach(n=> { n.hidden = !puede(n.dataset.permiso.split(',').map((p) => p.trim())); });
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

// Trae /auth/me para guardar los permisos con la sesión.
async function actualizarPermisos() {
  try { await refrescarPerfil(); } catch { /* sin permisos del servidor se mantiene el acceso solo para ADM */ }
  escribirSesion(CLAVES.perfilRevisado, true);
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
        await actualizarPermisos();
        mostrarMensaje(region, 'Sesión iniciada.', 'exito');
        window.setTimeout(()=> window.location.href = new URL('index.html', document.baseURI).href, 500);
        return true;
      } finally {
        if (boton) boton.disabled = false;
      }
    }
  });
}

// Indicadores por rol (sección 3). Los que todavía no tienen servicio en el servidor se muestran como "Disponible pronto".
const INDICADORES_ROL = {
  REC: [
    { titulo: 'Aforo actual', clave: 'aforo', permiso: 'aforo:ver', enlace: 'entradas.html' },
    { titulo: 'Caja', clave: 'caja', permiso: 'caja:operar', enlace: 'caja.html' },
    { titulo: 'Pedidos por verificar', clave: 'pedidosPorVerificar', permiso: 'pedidos:leer', enlace: 'pedidos.html' },
    { titulo: 'Inscripciones web pendientes', clave: 'webPendientes', permiso: 'inscripciones:leer', enlace: 'inscripciones.html' }
  ],
  CON: [
    { titulo: 'Cuadres sin cierre semanal', clave: 'cuadresSinCerrar', permiso: 'caja:cierre', enlace: 'caja.html#cierres' },
    { titulo: 'Facturas por registrar en el SRI', clave: 'facturasPendientes', permiso: 'facturas:leer', enlace: 'facturas.html' }
  ],
  ENT: [
    { titulo: 'Aforo actual', clave: 'aforo', permiso: 'aforo:ver', enlace: 'entradas.html' },
    { titulo: 'Rutinas registradas', clave: 'rutinas', permiso: 'rutinas:gestionar', enlace: 'rutinas.html' }
  ]
};

const totalDe = (r) => r?.pagination?.total ?? r?.total ?? (r?.data || r || []).length;
async function valorIndicador(clave) {
  if (clave === 'pedidosPorVerificar') return totalDe(await adminModel.pedidos({ estado: 'R', limit: 1 }));
  if (clave === 'aforo') { const a = await entradasModel.aforo().then((r) => r?.data ?? r); return `${a.personasAdentro} de ${a.aforoMax}`; }
  if (clave === 'caja') { try { const t = await cajaModel.actual().then((r) => r?.data ?? r); return `Abierta (${t.turno || t.turnoId})`; } catch (e) { if (e.status === 404) return 'Sin turno abierto'; throw e; } }
  if (clave === 'webPendientes') return totalDe(await inscripcionesModel.listar({ estado: 'P', canal: 'W', limit: 1 }));
  if (clave === 'facturasPendientes') return totalDe(await facturasModel.listar({ estado: 'P', limit: 1 }));
  if (clave === 'rutinas') return totalDe(await rutinasModel.listar({ limit: 1 }));
  if (clave === 'cuadresSinCerrar') { const r = await cajaModel.turnos({ limit: 100 }); return (r?.data || r || []).filter((c) => !c.cierreCajaId && c.efectivoContado !== null).length; }
  return null;
}

// Marcar entrada y salida del empleado conectado.
function enlazarAsistencia() {
  document.querySelectorAll('[data-asistencia]').forEach((b) => b.addEventListener('click', async () => {
    const region = select('#mensaje-asistencia');
    try {
      const r = await (b.dataset.asistencia === 'entrada' ? asistenciaModel.entrada() : asistenciaModel.salida()).then((x) => x?.data ?? x);
      const hora = String((b.dataset.asistencia === 'entrada' ? r?.horaEntrada : r?.horaSalida) || '').slice(0, 5);
      mostrarMensaje(region, `${b.dataset.asistencia === 'entrada' ? 'Entrada' : 'Salida'} registrada${hora ? ` a las ${hora}` : ''}.`, 'exito');
    } catch (e) { mostrarMensaje(region, e.mensaje || 'No se pudo registrar la asistencia.', 'error'); }
  }));
}

async function pintarIndicadoresRol() {
  const roles = codigosRol(usuarioActual()).filter((c) => INDICADORES_ROL[c]);
  const seccion = select('[data-dashboard-rol]');
  const cont = select('[data-indicadores-rol]');
  if (!roles.length || !seccion || !cont) return;
  seccion.hidden = false;
  cont.setAttribute('aria-busy', 'true');
  const definiciones = roles.flatMap((r) => INDICADORES_ROL[r]);
  const tarjetas = await Promise.all(definiciones.map(async (d) => {
    if (d.permiso && !puede(d.permiso)) return '';
    try { return indicadorHtml({ titulo: d.titulo, valor: await valorIndicador(d.clave), enlace: d.enlace }); }
    catch { return indicadorHtml({ titulo: d.titulo, valor: 'Sin datos' }); }
  }));
  cont.innerHTML = tarjetas.join('');
  cont.setAttribute('aria-busy', 'false');
}

export async function iniciarDashboard(){
  const accesos = select('[data-accesos-directos]');
  if (accesos) accesos.innerHTML = accesosDirectosHtml(menuVisible((permiso) => puede(permiso)));
  enlazarAsistencia();
  await pintarIndicadoresRol();
  if (!puede('resumen:ver')) {
    // Sin resumen:ver (por ejemplo, sesión sin permisos del servidor) no se consulta /admin/resumen.
    selectAll('[data-indicadores-adm]').forEach((n) => { n.hidden = true; });
    return;
  }
  const verPedidos = puede('pedidos:leer');
  if (!verPedidos) select('[data-tabla-pedidos-recientes]')?.closest('section')?.setAttribute('hidden', '');
  try {
    const [resumen, pedidos] = await Promise.all([adminModel.resumen(), verPedidos ? adminModel.pedidos({limit:5}) : Promise.resolve([])]);
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

let iniciado = false;
export async function mainAdmin(){
  if (iniciado) return;
  iniciado = true;
  iniciarTema();
  iniciarAvisoServidor();
  const pagina = document.body.dataset.pagina;
  if (pagina === 'login-admin'){ inyectarAvisosAdmin(); iniciarLoginAdmin(); return; }
  if (!protegerAdmin()) return;
  // Todo lo siguiente hasta el primer await es síncrono: así la pantalla queda
  // bloqueada antes de que su propio módulo intente consultar la API.
  pintarMenu();
  const permitido = verificarAccesoPagina();
  iniciarSesionAdminUI();
  inyectarAvisosAdmin();
  selectAll('[data-anio]').forEach((nodo) => { nodo.textContent = new Date().getFullYear(); });
  if (!permitido) return;
  iniciarCampana(select('[data-cabecera-acciones]'), { id: 'campana-admin', alInicio: true });
  if (!leerSesion(CLAVES.perfilRevisado, false)) {
    actualizarPermisos().then(() => {
      pintarMenu();
      selectAll('[data-permiso]').forEach(n=> { n.hidden = !puede(n.dataset.permiso.split(',').map((p) => p.trim())); });
    });
  }
  if (pagina === 'dashboard') await iniciarDashboard();
  // pantallas específicas se auto-inician por su propio módulo importado en HTML
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mainAdmin); else mainAdmin();
