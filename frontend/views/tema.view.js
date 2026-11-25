/**
 * view/tema.view.js - alterna entre modo oscuro y modo claro.
 */
// Esta vista solo modifica el DOM; persistencia y eventos pertenecen al controlador.

const CLASE_CLARO = 'pf-modo-claro';
export function pintarBotonesTema(tema) {
  const esClaro = tema === 'claro';
  document.querySelectorAll('[data-boton-tema]').forEach((boton) => {
    const icono = boton.querySelector('[data-icono-tema]');
    if (icono) icono.textContent = esClaro ? '☀' : '☾';
    boton.setAttribute('aria-label', esClaro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    boton.setAttribute('title', esClaro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  });
}

export function aplicarTema(tema) {
  const esClaro = tema === 'claro';
  document.documentElement.classList.toggle(CLASE_CLARO, esClaro);
  document.documentElement.setAttribute('data-tema', tema);
  document.documentElement.setAttribute('data-bs-theme', esClaro ? 'light' : 'dark');
  pintarBotonesTema(tema);
  return tema;
}

