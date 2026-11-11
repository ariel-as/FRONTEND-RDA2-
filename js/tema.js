/**
 * tema.js - Botón de alternancia entre modo claro y oscuro.
 *
 * El tema se resuelve antes del primer pintado en assets/js/tema.js, que
 * lee la cookie pf_tema y el esquema del sistema, y deja en <html>:
 *
 *   - data-bs-theme: el tema activo ('claro' | 'oscuro'). Lo usa Bootstrap
 *     en el panel de administración; en el área cliente es informativo.
 *   - data-tema: la elección manual, solo cuando existe la cookie. Es lo
 *     que leen los bloques de paleta clara de styles.css.
 *
 * Este módulo solo gestiona el botón del encabezado: lo pinta según el tema
 * activo, alterna entre modos al pulsarlo y guarda la elección en la cookie
 * (180 días). Sin cookie, el sitio sigue al sistema en vivo.
 */

import { CLAVES, escribirCookie, leerCookie } from './storage.js';

/** Días que dura la cookie del tema. */
const DIAS_TEMA = 180;

/** Tema del sistema operativo: 'claro' o 'oscuro'. */
function temaDelSistema() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro';
}

/** Elección manual guardada en la cookie ('claro' | 'oscuro') o null si sigue al sistema. */
function temaElegido() {
  const valor = leerCookie(CLAVES.tema);
  return valor === 'claro' || valor === 'oscuro' ? valor : null;
}

/**
 * Pinta un botón de tema para el modo activo: cuando el sitio está en
 * oscuro, el botón ofrece pasar a claro (sol) y al revés (luna).
 */
function pintarBoton(boton, tema) {
  const icono = boton.querySelector('[data-icono-tema]');
  const ofrece = tema === 'oscuro' ? 'claro' : 'oscuro';
  const etiqueta = `Cambiar al modo ${ofrece}`;

  if (icono) {
    icono.textContent = ofrece === 'claro' ? '\u2600' : '\u263E';
  }
  boton.setAttribute('aria-label', etiqueta);
  boton.setAttribute('title', etiqueta);
}

/** Aplica el tema activo al documento y repinta los botones. */
function aplicarTema(tema, botones) {
  const raiz = document.documentElement;
  /* Bootstrap espera 'light' | 'dark'; el área cliente usa data-tema con
     los mismos valores que la cookie ('claro' | 'oscuro'). */
  raiz.setAttribute('data-bs-theme', tema === 'claro' ? 'light' : 'dark');

  const elegido = temaElegido();
  if (elegido) {
    raiz.setAttribute('data-tema', elegido);
  } else {
    raiz.removeAttribute('data-tema');
  }

  botones.forEach((boton) => pintarBoton(boton, tema));
}

/** Conecta los botones de tema de la página (área cliente y panel admin). */
export function iniciarTema() {
  const botones = document.querySelectorAll('[data-boton-tema]');
  if (botones.length === 0) return;

  let temaActual = temaElegido() ?? temaDelSistema();

  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      const nuevo = temaActual === 'oscuro' ? 'claro' : 'oscuro';
      escribirCookie(CLAVES.tema, nuevo, DIAS_TEMA);
      temaActual = nuevo;
      aplicarTema(nuevo, botones);
    });
  });

  /* Sin elección manual, los cambios del sistema se aplican en vivo. */
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (!temaElegido()) {
      temaActual = temaDelSistema();
      aplicarTema(temaActual, botones);
    }
  });

  aplicarTema(temaActual, botones);
}
