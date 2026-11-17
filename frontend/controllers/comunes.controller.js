import { aplicarTema } from '../views/tema.view.js';
import { actualizarContadorCarrito, actualizarEstadoSesion } from '../views/componentes.view.js';
import { carrito } from '../models/carrito.model.js';
import { usuarioActual, cerrarSesion, tienePendencia } from '../models/sesion.model.js';
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
  const enlaces = [...document.querySelectorAll('#menu-principal a[href^="#"]')];
  const secciones = enlaces.map((enlace) => document.getElementById(decodeURIComponent(enlace.hash.slice(1)))).filter(Boolean);
  if (!enlaces.length || !secciones.length) return;

  const activar = (id) => enlaces.forEach((enlace) => {
    const activa = enlace.hash === `#${id}`;
    enlace.classList.toggle('pf-enlace-activo', activa);
    if (activa) enlace.setAttribute('aria-current', 'location');
    else enlace.removeAttribute('aria-current');
  });
  const desplazar = (destino, actualizarHistorial) => {
    if (actualizarHistorial && location.hash !== `#${destino.id}`) history.pushState(null, '', `#${encodeURIComponent(destino.id)}`);
    const encabezado = select('.pf-encabezado');
    const top = Math.max(window.scrollY + destino.getBoundingClientRect().top - (encabezado?.offsetHeight || 0), 0);
    window.scrollTo({ top, left: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    activar(destino.id);
  };

  document.addEventListener('click', (evento) => {
    const enlace = evento.target.closest('#menu-principal a[href^="#"]');
    if (!enlace || evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    const destino = document.getElementById(decodeURIComponent(enlace.hash.slice(1)));
    if (!destino) return;
    evento.preventDefault();
    desplazar(destino, true);
  });

  const observador = new IntersectionObserver((entradas) => {
    const visibles = entradas.filter((entrada) => entrada.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visibles[0]) activar(visibles[0].target.id);
  }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.1, 0.25, 0.5] });
  secciones.forEach((seccion) => observador.observe(seccion));
  window.addEventListener('popstate', () => {
    const destino = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (destino) desplazar(destino, false);
  });
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
  iniciarTema();
  iniciarAvisoCookies();
  iniciarMenuMovil();
  iniciarEncabezadoFijo();
  iniciarNavegacionSecciones();
  iniciarSesionUI();
  actualizarContadorCarrito(carrito.contar());
  const anio = select('[data-anio]'); if (anio) anio.textContent = new Date().getFullYear();
}
