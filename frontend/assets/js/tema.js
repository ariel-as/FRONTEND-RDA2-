/**
 * tema.js (boot) - Fija el tema de color antes del primer pintado.
 *
 * Se carga en el <head> de las diez páginas, ANTES de la hoja de estilos
 * (y de Tailwind o Bootstrap), como script clásico síncrono: así el documento
 * ya llega con data-bs-theme y data-tema puestos y no hay destello de color
 * equivocado mientras carga el resto.
 *
 * La preferencia guardada vive en la cookie pf_tema ('claro' | 'oscuro').
 * Sin cookie, el sitio sigue el esquema del sistema (prefers-color-scheme)
 * y, a falta de señal, arranca en oscuro, que es el tema de la marca.
 *
 * Aquí no se puede usar el módulo js/tema.js (ni js/storage.js) porque los
 * módulos se ejecutan de forma diferida y la cookie se lee a mano.
 */
(function () {
  var elegido = null;
  var partes = document.cookie.split(';');
  for (var i = 0; i < partes.length; i++) {
    var limpia = partes[i].trim();
    if (limpia.indexOf('pf_tema=') === 0) {
      elegido = decodeURIComponent(limpia.slice('pf_tema='.length));
    }
  }

  var raiz = document.documentElement;
  if (elegido !== 'claro' && elegido !== 'oscuro') {
    elegido = null;
  }

  var tema = elegido;
  if (!tema) {
    var prefiereClaro = false;
    try {
      prefiereClaro = window.matchMedia('(prefers-color-scheme: light)').matches;
    } catch (error) {
      /* Sin soporte de media queries se queda en el oscuro de la marca. */
    }
    tema = prefiereClaro ? 'claro' : 'oscuro';
  }

  /* Bootstrap (área admin) repinta según data-bs-theme y espera sus valores
     en inglés ('light' | 'dark'); el área cliente solo lee data-tema cuando
     la persona eligió un tema a mano. */
  raiz.setAttribute('data-bs-theme', tema === 'claro' ? 'light' : 'dark');
  if (elegido) {
    raiz.setAttribute('data-tema', elegido);
  } else {
    raiz.removeAttribute('data-tema');
  }
})();
