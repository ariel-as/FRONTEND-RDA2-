/**
 * identidad.js - Configuración de color de Tailwind para el área cliente.
 *
 * Este archivo se carga justo después de https://cdn.tailwindcss.com y antes de
 * que se analyse el documento, de modo que las clases de marca (bg-pf-negro,
 * text-pf-amarillo, border-pf-rojo...) queden disponibles en todas las páginas
 * públicas junto con las clases estándar de Tailwind.
 *
 * Es un script clásico (no módulo) porque debe ejecutarse de forma síncrona.
 *
 * Los tonos de superficie apuntan a las variables CSS de styles.css, así que
 * giran con el tema: bg-pf-negro es la página, text-pf-blanco el texto...
 * Los colores de superficie y de texto amarillo son variables distintas para
 * conservar la marca y cumplir contraste en los dos temas.
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        pf: {
          negro: 'var(--pf-negro)',
          grafito: 'var(--pf-grafito)',
          carbon: 'var(--pf-carbon)',
          linea: 'var(--pf-linea)',
          amarillo: 'var(--pf-amarillo)',
          amarilloTexto: 'var(--pf-amarillo-texto)',
          rojo: '#E21B23',
          blanco: 'var(--pf-blanco)',
          gris: 'var(--pf-gris)'
        }
      }
    }
  }
};
