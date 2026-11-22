import { crearDialogoHtml } from '../views/dialogo.view.js';
import { construirValidador, mostrarMensaje, mostrarErroresServidor } from './validacion.controller.js';

/*
 * Diálogo accesible propio para confirmar acciones y pedir datos.
 * - Usa <dialog> con showModal(): el foco queda dentro mientras está abierto.
 * - Escape o "Cancelar" lo cierran y el foco vuelve al botón que lo abrió.
 * - Si se pasa `alConfirmar`, la acción corre con el diálogo abierto y los
 *   errores del servidor (por ejemplo los 409) se muestran tal cual dentro de él.
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

    construirValidador(form, {
      borrador: false,
      reglas: opciones.reglas || {},
      alEnviar: async () => {
        error.hidden = true;
        error.textContent = '';
        const valores = Object.fromEntries(new FormData(form).entries());
        const extra = typeof opciones.validarExtra === 'function' ? opciones.validarExtra(form, valores) : null;
        if (extra) {
          error.textContent = extra;
          error.hidden = false;
          return false;
        }
        if (typeof opciones.alConfirmar !== 'function') { cerrar({ valores, resultado: null }); return true; }
        ocupado = true;
        botonConfirmar.disabled = true;
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
          mostrarErroresServidor(form, fallo);
          error.textContent = fallo?.mensaje || 'No se pudo completar la acción.';
          error.hidden = false;
          if (typeof opciones.alFallar === 'function') opciones.alFallar(fallo, form, error);
          return false;
        } finally {
          botonConfirmar.disabled = false;
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
