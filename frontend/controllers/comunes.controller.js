import { aplicarTema } from '../views/tema.view.js';
import { iniciarAvisoServidor } from '../views/servidor.view.js';
import { iniciarCampana } from './campana.controller.js';
import { cabeceraSitioHtml } from '../views/cabecera.view.js';
import { actualizarContadorCarrito, actualizarEstadoSesion } from '../views/componentes.view.js';
import { carrito } from '../models/carrito.model.js';
import { usuarioActual, cerrarSesion, tienePendencia, esAdministrador } from '../models/sesion.model.js';
import { CLAVES, leerCookie, escribirCookie, raizSitio } from '../models/storage.model.js';

const select = (s) => document.querySelector(s);
const COOKIE_TEMA_DIAS = 365;

function temaPreferido() {
  const guardado = leerCookie(CLAVES.tema);
  if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
}

export function iniciarTema() {
  aplicarTema(temaPreferido());
  selectTodos('[data-boton-tema]').forEach((boton) => boton.addEventListener('click', () => {
    const actual = document.documentElement.classList.contains('pf-modo-claro') ? 'claro' : 'oscuro';
    const siguiente = actual === 'claro' ? 'oscuro' : 'claro';
    aplicarTema(siguiente);
    escribirCookie(CLAVES.tema, siguiente, COOKIE_TEMA_DIAS);
  }));
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const alCambiar = () => { if (!leerCookie(CLAVES.tema)) aplicarTema(temaPreferido()); };
  if (typeof media.addEventListener === 'function') media.addEventListener('change', alCambiar);
  else if (typeof media.addListener === 'function') media.addListener(alCambiar);
}


export function iniciarAvisoCookies() {
  const aviso = select('[data-aviso-cookies]');
  if (!aviso) return;
  if (leerCookie(CLAVES.cookieAviso) === '1') { aviso.hidden = true; return; }
  aviso.hidden = false;
  select('[data-aceptar-cookies]')?.addEventListener('click', () => {
    escribirCookie(CLAVES.cookieAviso, '1', 180);
    aviso.hidden = true;
  });
}

export function iniciarMenuMovil() {
  const boton = select('[data-menu-boton]');
  const menu = select('[data-menu]');
  if (!boton || !menu) return;
  const abrir = () => { boton.setAttribute('aria-expanded','true'); boton.setAttribute('aria-label','Cerrar menú de navegación'); menu.classList.add('pf-menu-abierto'); };
  const cerrar = ({devolverFoco=false}={}) => { boton.setAttribute('aria-expanded','false'); boton.setAttribute('aria-label','Abrir menú de navegación'); menu.classList.remove('pf-menu-abierto'); if(devolverFoco) boton.focus(); };
  const estaAbierto = () => boton.getAttribute('aria-expanded') === 'true';
  boton.addEventListener('click', () => (estaAbierto()?cerrar():abrir()));
  menu.addEventListener('click', (e)=>{ if (e.target.closest('a')) cerrar(); });
  document.addEventListener('click', (e)=>{ if(!estaAbierto()) return; if(e.target.closest('[data-menu]')||e.target.closest('[data-menu-boton]')) return; cerrar(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && estaAbierto()){ e.preventDefault(); cerrar({devolverFoco:true}); } });
  window.matchMedia('(min-width: 1024px)').addEventListener('change',(e)=>{ if(e.matches) cerrar(); });
}

export function iniciarEncabezadoFijo() {
  const encabezado = select('.pf-encabezado'); if(!encabezado) return;
  let programado=false; const actualizar=()=>{ programado=false; encabezado.dataset.fijo = String(window.scrollY>8); };
  window.addEventListener('scroll', ()=>{ if(programado) return; programado=true; requestAnimationFrame(actualizar); }, {passive:true});
  actualizar();
}

export function iniciarNavegacionSecciones() {
  const enlaces = [...document.querySelectorAll('#menu-principal a[href*="#"]')].filter((a) => a.pathname === location.pathname && a.hash);
  const secciones = [...new Set(enlaces.map((enlace) => document.getElementById(decodeURIComponent(enlace.hash.slice(1)))).filter(Boolean))];
  if (!enlaces.length || !secciones.length) return;
  const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const altoCabecera = () => select('.pf-encabezado')?.offsetHeight || 0;
  let fijado = null; // { id, y }: enlace pulsado; se respeta hasta que el usuario vuelva a desplazarse
  let programado = false;

  // Un solo enlace activo a la vez.
  const activar = (id) => enlaces.forEach((enlace) => {
    const activa = Boolean(id) && enlace.hash === `#${id}`;
    enlace.classList.toggle('pf-enlace-activo', activa);
    if (activa) enlace.setAttribute('aria-current', 'location');
    else enlace.removeAttribute('aria-current');
  });

  // La sección activa es la última cuyo inicio ya pasó la línea fija (cabecera + 30 % de la ventana); al final, la última.
  const calcular = () => {
    programado = false;
    if (fijado) {
      if (fijado.y === null || Math.abs(window.scrollY - fijado.y) < 24) return;
      fijado = null;
    }
    const linea = altoCabecera() + window.innerHeight * 0.3;
    const alFinal = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    let activa = alFinal ? secciones[secciones.length - 1] : null;
    if (!activa) secciones.forEach((seccion) => { if (seccion.getBoundingClientRect().top <= linea) activa = seccion; });
    activar(activa?.id || null);
  };
  window.addEventListener('scroll', () => { if (programado) return; programado = true; requestAnimationFrame(calcular); }, { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(calcular));

  // Saltos lejanos sin recorrer toda la página: directo si la distancia supera una pantalla y media o si se pide menos movimiento.
  const desplazar = (destino, actualizarHistorial) => {
    if (actualizarHistorial && location.hash !== `#${destino.id}`) history.pushState(null, '', `#${encodeURIComponent(destino.id)}`);
    const top = Math.max(window.scrollY + destino.getBoundingClientRect().top - altoCabecera(), 0);
    const lejos = Math.abs(top - window.scrollY) > window.innerHeight * 1.5;
    fijado = { id: destino.id, y: null };
    activar(destino.id);
    const terminar = () => { if (fijado?.id === destino.id) fijado.y = window.scrollY; };
    window.scrollTo({ top, left: 0, behavior: reducido() || lejos ? 'instant' : 'smooth' });
    if (reducido() || lejos) requestAnimationFrame(terminar);
    else { window.addEventListener('scrollend', terminar, { once: true }); window.setTimeout(terminar, 900); }
  };

  // Enlaces del menú y del pie que apuntan a una sección de esta misma página.
  document.addEventListener('click', (evento) => {
    const enlace = evento.target.closest('a[href*="#"]');
    if (!enlace || enlace.pathname !== location.pathname || !enlace.hash || evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    const destino = document.getElementById(decodeURIComponent(enlace.hash.slice(1)));
    if (!destino || !secciones.includes(destino)) return;
    evento.preventDefault();
    desplazar(destino, true);
  });
  window.addEventListener('popstate', () => {
    const destino = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (destino) desplazar(destino, false);
  });
  window.addEventListener('pf:posicion-lista', calcular);
  calcular();
}

// Cabecera única del sitio: se genera igual en index.html y en todas las páginas de cliente/.
export function iniciarCabecera() {
  const header = select('header.pf-encabezado');
  if (!header) return;
  const usuario = usuarioActual();
  header.innerHTML = cabeceraSitioHtml({ prefijo: location.pathname.includes('/cliente/') ? '../' : '', pagina: document.body.dataset.pagina || '', usuario, esPersonal: Boolean(usuario) && esAdministrador() });
  const boton = header.querySelector('[data-cuenta-boton]');
  const panel = header.querySelector('[data-cuenta-panel]');
  if (!boton || !panel) return;
  const abrir = (valor) => { boton.setAttribute('aria-expanded', String(valor)); panel.hidden = !valor; };
  boton.addEventListener('click', () => abrir(boton.getAttribute('aria-expanded') !== 'true'));
  header.querySelector('[data-cuenta]').addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { abrir(false); boton.focus(); } });
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-cuenta]')) abrir(false); });
}

export function iniciarSesionUI() {
  actualizarEstadoSesion(usuarioActual());
  selectTodos('[data-cerrar-sesion]').forEach((boton)=> boton.addEventListener('click', ()=>{
    cerrarSesion(); actualizarEstadoSesion(null);
    window.location.href = new URL('index.html', raizSitio()).href;
  }));
}

function selectTodos(s){ return [...document.querySelectorAll(s)]; }

export function iniciarComunes() {
  iniciarCabecera();
  iniciarTema();
  iniciarAvisoServidor();
  iniciarAvisoCookies();
  iniciarMenuMovil();
  iniciarEncabezadoFijo();
  iniciarNavegacionSecciones();
  iniciarSesionUI();
  if (usuarioActual()) iniciarCampana(select('[data-campana-sitio]'), { id: 'campana-cliente' });
  actualizarContadorCarrito(carrito.contar());
  const anio = select('[data-anio]'); if (anio) anio.textContent = new Date().getFullYear();
}
