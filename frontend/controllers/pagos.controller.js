import { pagosHtml, textoEstadoPagos } from '../views/pagos.view.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { mostrarError, limpiarError } from './validacion.controller.js';

const centavos = (valor) => Math.round(Number(valor || 0) * 100);

/*
 * Componente de pagos reutilizable (inscripciones, ventas y pedidos).
 * Uso: const pagos = crearPagos(contenedor, { total, id });
 *      if (!pagos.validar()) return;  body.pagos = pagos.obtener();
 * Forma enviada al servidor (sección 5): [{ metodoPago, monto, referencia? }].
 */
export function crearPagos(contenedor, { total = 0, id = 'pagos', permitirAmbos = true, metodos } = {}) {
  if (!contenedor) return null;
  contenedor.innerHTML = pagosHtml({ id, total, permitirAmbos, metodos });
  const raiz = contenedor.querySelector('[data-pagos]');
  const montoEf = raiz.querySelector(`#${id}-monto-ef`);
  const montoTr = raiz.querySelector(`#${id}-monto-tr`);
  const referencia = raiz.querySelector(`#${id}-referencia`);
  const estado = raiz.querySelector('[data-pagos-estado]');
  let totalActual = Number(total) || 0;

  const metodo = () => raiz.querySelector(`input[name="${id}-metodo"]:checked`)?.value || 'EF';

  function diferencia() {
    const m = metodo();
    const suma = (m !== 'TR' ? centavos(montoEf.value) : 0) + (m !== 'EF' ? centavos(montoTr.value) : 0);
    return centavos(totalActual) - suma;
  }

  function pintarEstado() {
    const { texto, tipo } = textoEstadoPagos(diferencia());
    estado.textContent = texto;
    estado.dataset.tipo = tipo;
  }

  function aplicarMetodo() {
    const m = metodo();
    raiz.querySelectorAll('[data-pagos-bloque="EF"]').forEach((n) => { n.hidden = m === 'TR'; });
    raiz.querySelectorAll('[data-pagos-bloque="TR"]').forEach((n) => { n.hidden = m === 'EF'; });
    montoEf.disabled = m === 'TR';
    montoTr.disabled = m === 'EF';
    referencia.disabled = m === 'EF';
    // Con un solo método el monto es el total; con ambos se reparte a mano.
    montoEf.readOnly = m === 'EF';
    montoTr.readOnly = m === 'TR';
    if (m === 'EF') montoEf.value = totalActual.toFixed(2);
    if (m === 'TR') montoTr.value = totalActual.toFixed(2);
    if (m === 'AM') { montoEf.value = ''; montoTr.value = ''; }
    [montoEf, montoTr, referencia].forEach((c) => { if (c.disabled) limpiarError(c); });
    pintarEstado();
  }

  raiz.addEventListener('change', (e) => { if (e.target.name === `${id}-metodo`) aplicarMetodo(); });
  raiz.addEventListener('input', pintarEstado);
  aplicarMetodo();

  return {
    raiz,
    actualizarTotal(nuevo) {
      totalActual = Number(nuevo) || 0;
      raiz.querySelector('[data-pagos-total]').textContent = formatearPrecio(totalActual);
      aplicarMetodo();
    },
    cuadra: () => diferencia() === 0,
    // Si el servidor responde «El pago debe ser exactamente el total: X», toma ese total y lo explica en el error del diálogo.
    ajustarDesdeError(fallo, nodoError) {
      // El mensaje termina en punto («total: 1.00. Recibido…»): se toma solo el número.
      const m = /total:\s*(\d+(?:\.\d+)?)/i.exec(fallo?.mensaje || '');
      if (!m) return false;
      this.actualizarTotal(Number(m[1]));
      if (nodoError) nodoError.textContent = `El servidor indica que el total es ${formatearPrecio(Number(m[1]))}. Se actualizó el cobro: revisa los montos y confirma de nuevo.`;
      return true;
    },
    // Valida los campos activos y que la suma sea exacta. Enfoca el primer error.
    validar() {
      const activos = [montoEf, montoTr, referencia].filter((c) => !c.disabled);
      let primero = null;
      activos.forEach((campo) => {
        campo.setCustomValidity('');
        if (!campo.checkValidity()) {
          mostrarError(campo, campo.validity.valueMissing ? 'Este campo es obligatorio.' : campo.dataset.mensajePatron || 'Revisa este valor.');
          primero ??= campo;
        } else limpiarError(campo);
      });
      if (!primero && diferencia() !== 0) {
        const campo = metodo() === 'TR' ? montoTr : montoEf;
        mostrarError(campo, textoEstadoPagos(diferencia()).texto);
        primero = campo;
      }
      pintarEstado();
      primero?.focus();
      return !primero;
    },
    obtener() {
      const m = metodo();
      const pagos = [];
      if (m !== 'TR') pagos.push({ metodoPago: 'EF', monto: centavos(montoEf.value) / 100 });
      if (m !== 'EF') pagos.push({ metodoPago: 'TR', monto: centavos(montoTr.value) / 100, referencia: referencia.value.trim() });
      return pagos;
    }
  };
}
