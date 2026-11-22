import { escapar } from './componentes.view.js';
import { formatearPrecio } from '../models/carrito.model.js';

/*
 * Estructura del componente de pagos (efectivo, transferencia o ambos).
 * El total siempre viene del servidor; el componente solo comprueba que los
 * montos sumen ese total antes de enviar.
 */
export function pagosHtml({ id = 'pagos', total = 0, permitirAmbos = true, metodos = ['EF', 'TR'] } = {}) {
  const opciones = [
    metodos.includes('EF') ? ['EF', 'Efectivo'] : null,
    metodos.includes('TR') ? ['TR', 'Transferencia'] : null,
    permitirAmbos && metodos.length > 1 ? ['AM', 'Efectivo y transferencia'] : null
  ].filter(Boolean);
  return `<fieldset class="pf-pagos border rounded p-3 mb-3" data-pagos="${escapar(id)}">
    <legend class="float-none w-auto px-2 fs-6 fw-bold mb-0">Forma de pago</legend>
    <p class="mb-2">Total a cobrar (calculado por el servidor): <strong data-pagos-total>${formatearPrecio(total)}</strong></p>
    <div class="d-flex flex-wrap gap-3 mb-2">
      ${opciones.map(([valor, texto], i) => `<div class="form-check"><input class="form-check-input" type="radio" name="${escapar(id)}-metodo" id="${escapar(id)}-metodo-${valor}" value="${valor}" ${i === 0 ? 'checked' : ''}><label class="form-check-label" for="${escapar(id)}-metodo-${valor}">${escapar(texto)}</label></div>`).join('')}
    </div>
    <div class="row g-2">
      <div class="col-12 col-sm-6" data-pagos-bloque="EF">
        <label class="form-label" for="${escapar(id)}-monto-ef">Monto en efectivo *</label>
        <input class="form-control" type="number" step="0.01" min="0.01" inputmode="decimal" id="${escapar(id)}-monto-ef" name="${escapar(id)}-monto-ef" required>
      </div>
      <div class="col-12 col-sm-6" data-pagos-bloque="TR" hidden>
        <label class="form-label" for="${escapar(id)}-monto-tr">Monto por transferencia *</label>
        <input class="form-control" type="number" step="0.01" min="0.01" inputmode="decimal" id="${escapar(id)}-monto-tr" name="${escapar(id)}-monto-tr" required>
      </div>
      <div class="col-12" data-pagos-bloque="TR" hidden>
        <label class="form-label" for="${escapar(id)}-referencia">Referencia de la transferencia *</label>
        <input class="form-control" type="text" maxlength="30" pattern="(?:[A-Za-z0-9]|-){4,30}" data-mensaje-patron="La referencia debe tener 4 a 30 letras, números o guion." id="${escapar(id)}-referencia" name="${escapar(id)}-referencia" autocomplete="off" required>
        <!-- Ranura reservada para subir la imagen del comprobante cuando el equipo decida dónde guardarla (sección 7). -->
        <div data-pagos-ranura-comprobante></div>
      </div>
    </div>
    <p class="mt-2 mb-0 fw-semibold" data-pagos-estado aria-live="polite"></p>
  </fieldset>`;
}

// Texto del estado del cobro; nunca depende solo del color.
export function textoEstadoPagos(diferenciaCentavos) {
  if (diferenciaCentavos === 0) return { texto: 'Los montos cuadran con el total.', tipo: 'exito' };
  if (diferenciaCentavos > 0) return { texto: `Falta ${formatearPrecio(diferenciaCentavos / 100)} para llegar al total.`, tipo: 'error' };
  return { texto: `Sobran ${formatearPrecio(-diferenciaCentavos / 100)}: el pago debe ser exacto.`, tipo: 'error' };
}
