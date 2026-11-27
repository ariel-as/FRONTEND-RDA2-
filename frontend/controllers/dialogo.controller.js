import { crearDialogoHtml } from '../views/dialogo.view.js';
import { construirValidador, mostrarMensaje, mostrarError, enfocarCampo, pintarResumenErrores } from './validacion.controller.js';

/*
 * Diálogo accesible propio para confirmar acciones y pedir datos.
 * - Usa <dialog> con showModal(): el foco queda dentro mientras está abierto.
 * - Escape o "Cancelar" lo cierran y el foco vuelve al botón que lo abrió.
 * - Si se pasa `alConfirmar`, la acción corre con el diálogo abierto y los
 *   errores del servidor (por ejemplo los 409) se muestran tal cual dentro de él.
 *
 * - Los errores (de validarExtra o de un 400 con detalles[].campo) se marcan en su campo:
 *   foco en el primero, mensaje debajo y un resumen corto con enlaces arriba.
 *   validarExtra puede devolver un texto, { campo, mensaje } o una lista de ellos.
 *   ubicarCampo(ruta, form) traduce rutas del servidor a un campo del formulario.
 *
 * - soloCerrar: true para diálogos que solo muestran información (un único botón «Cerrar»).
 *
 * Devuelve una promesa: null si se canceló, o { valores, resultado } si se confirmó.
 */
export function abrirDialogo(opciones = {}) {
  const origen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialogo = crearDialogoHtml(opciones);
  document.body.appendChild(dialogo);
  const form = dialogo.querySelector('[data-dialogo-form]');
  const botonConfirmar = dialogo.querySelector('[data-dialogo-confirmar]');
  const error = dialogo.querySelector('[data-dialogo-error]');
  let ocupado = false;

  return new Promise((resolver) => {
    let resultadoFinal = null;
    const cerrar = (valor) => {
      resultadoFinal = valor;
      if (dialogo.open) dialogo.close(); else terminar();
    };
    const terminar = () => {
      dialogo.remove();
      if (origen?.isConnected) origen.focus();
      resolver(resultadoFinal);
    };
    dialogo.addEventListener('close', terminar, { once: true });
    dialogo.addEventListener('cancel', (evento) => { if (ocupado) evento.preventDefault(); });
    dialogo.querySelector('[data-dialogo-cancelar]').addEventListener('click', () => { if (!ocupado) cerrar(null); });

    if (typeof opciones.alPreparar === 'function') opciones.alPreparar(form, dialogo);

    const ubicar = (ref) => {
      if (ref instanceof HTMLElement) return ref;
      if (!ref) return null;
      const nombre = String(ref);
      const propio = typeof opciones.ubicarCampo === 'function' ? opciones.ubicarCampo(nombre, form) : null;
      return propio || form.querySelector(`[name="${CSS.escape(nombre)}"]`) || form.querySelector(`#${CSS.escape(nombre)}`) || form.querySelector(`[name="${CSS.escape(nombre.split('.').pop())}"]`);
    };
    const contenidoPrimero = () => form.querySelector('[data-dialogo-contenido] input:not([type="hidden"]):not([disabled]), [data-dialogo-contenido] select, [data-dialogo-contenido] textarea');
    const marcar = (lista) => {
      const campos = [];
      lista.forEach(({ campo, mensaje }) => {
        const control = ubicar(campo);
        if (!control || campos.includes(control)) return;
        mostrarError(control, mensaje);
        campos.push(control);
      });
      if (!campos.length) return false;
      pintarResumenErrores(form, campos);
      enfocarCampo(campos[0]);
      return true;
    };
    const mostrarGeneral = (texto) => {
      error.textContent = texto;
      error.hidden = false;
      error.tabIndex = -1;
      error.focus();
    };

    construirValidador(form, {
      borrador: false,
      resumen: true,
      reglas: opciones.reglas || {},
      alEnviar: async () => {
        error.hidden = true;
        error.textContent = '';
        const valores = Object.fromEntries(new FormData(form).entries());
        const extra = typeof opciones.validarExtra === 'function' ? opciones.validarExtra(form, valores) : null;
        const errores = !extra ? [] : Array.isArray(extra) ? extra : typeof extra === 'object' ? [extra] : [{ campo: null, mensaje: String(extra) }];
        if (errores.length) {
          if (!marcar(errores.map((e) => (e.campo ? e : { ...e, campo: contenidoPrimero() })))) mostrarGeneral(errores[0].mensaje);
          return false;
        }
        pintarResumenErrores(form, []);
        if (typeof opciones.alConfirmar !== 'function') { cerrar({ valores, resultado: null }); return true; }
        ocupado = true;
        if (botonConfirmar) botonConfirmar.disabled = true;
        form.setAttribute('aria-busy', 'true');
        mostrarMensaje(dialogo.querySelector('[data-dialogo-region]'), 'Procesando…', 'info');
        try {
          const resultado = await opciones.alConfirmar(valores, form);
          ocupado = false;
          cerrar({ valores, resultado });
          return true;
        } catch (fallo) {
          ocupado = false;
          dialogo.querySelector('[data-dialogo-region]').hidden = true;
          const detalles = Array.isArray(fallo?.detalles) ? fallo.detalles : [];
          const conCampo = detalles.map((d) => ({ campo: d?.campo || d?.field || d?.path || d?.nombre, mensaje: d?.mensaje || d?.message || String(d) }));
          if (!marcar(conCampo)) mostrarGeneral(fallo?.mensaje || 'No se pudo completar la acción.');
          if (typeof opciones.alFallar === 'function') opciones.alFallar(fallo, form, error);
          return false;
        } finally {
          if (botonConfirmar) botonConfirmar.disabled = false;
          form.removeAttribute('aria-busy');
        }
      }
    });

    dialogo.showModal?.();
    if (!dialogo.open) dialogo.setAttribute('open', '');
    const primero = form.querySelector('.pf-dialogo-control:not([readonly])') || form.querySelector('[data-dialogo-contenido] input, [data-dialogo-contenido] select');
    (primero || dialogo.querySelector('[data-dialogo-cancelar]')).focus();
  });
}

// Confirmación simple para acciones irreversibles. Devuelve true o false.
export async function confirmarAccion({ titulo, mensaje, textoConfirmar = 'Confirmar', tono = 'peligro', alConfirmar } = {}) {
  const respuesta = await abrirDialogo({ titulo, mensaje, textoConfirmar, tono, alConfirmar });
  return Boolean(respuesta);
}
