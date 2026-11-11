/**
 * validation.js - Validaciones de los formularios del proyecto.
 *
 * Estrategia en dos capas (sección 23 y 24 de la especificación):
 *   1. Validación nativa de HTML5 (required, type, minlength, pattern, checkValidity).
 *   2. Reglas de negocio que HTML5 no resuelve, escritas con Expresiones
 *      Regulares y aplicadas con setCustomValidity().
 *
 * Cada mensaje de error:
 *   - explica qué está mal y cómo corregirlo,
 *   - se vincula al campo con aria-describedby,
 *   - marca el campo con aria-invalid="true",
 *   - no depende únicamente del color (usa el símbolo de advertencia).
 */

import { CLAVES, escribirSesion, leerSesion, borrarSesion } from './storage.js';

/** Expresiones regulares usadas en el proyecto. */
export const REGEX = {
  cedula: /^\d{10}$/,
  telefono: /^09\d{8}$/,
  nombre: /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s'-]{2,60}$/,
  contrasena: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%*_.-]{8,32}$/,
  codigoPlan: /^PF-\d{4}$/
};

/* =========================================================
   Borradores de formulario (sessionStorage)
   ========================================================= */

/** Controles que no se guardan: contraseñas y campos sin datos de la persona. */
const TIPOS_SIN_BORRADOR = new Set([
  'password',
  'file',
  'submit',
  'button',
  'reset',
  'image'
]);

/**
 * Clave propia de cada formulario, para no mezclar borradores entre páginas.
 * Los formularios dinámicos (clases y entrenadores) no tienen id, así que se
 * usa su identificador de dato o su posición estable dentro del documento.
 */
function claveBorrador(formulario) {
  const propio =
    formulario.id ||
    formulario.getAttribute('name') ||
    Object.entries(formulario.dataset).find(([clave]) => /Id$/.test(clave))?.[1] ||
    `form${[...(globalThis.document?.forms || [])].indexOf(formulario)}`;

  return `${CLAVES.borradorFormulario}:${location.pathname}:${propio}`;
}

/** Campos cuyo valor conviene recordar mientras se escribe. */
function camposConBorrador(formulario) {
  return [...formulario.querySelectorAll('input, select, textarea')].filter(
    (campo) => campo.name && !campo.disabled && !TIPOS_SIN_BORRADOR.has(campo.type)
  );
}

/**
 * Guarda en sessionStorage lo escrito para recuperarlo si la página se recarga.
 * Las contraseñas nunca se guardan.
 */
export function guardarBorrador(formulario) {
  const datos = {};

  camposConBorrador(formulario).forEach((campo) => {
    if (campo.type === 'checkbox') {
      if (campo.checked) datos[campo.name] = true;
      return;
    }
    if (campo.type === 'radio') {
      if (campo.checked) datos[campo.name] = campo.value;
      return;
    }
    if (campo.value !== '') datos[campo.name] = campo.value;
  });

  if (Object.keys(datos).length === 0) borrarSesion(claveBorrador(formulario));
  else escribirSesion(claveBorrador(formulario), datos);
}

/** Devuelve a los campos lo que se había escrito antes de recargar la página. */
export function restaurarBorrador(formulario) {
  const datos = leerSesion(claveBorrador(formulario), null);
  if (!datos || typeof datos !== 'object') return;

  camposConBorrador(formulario).forEach((campo) => {
    if (!(campo.name in datos)) return;

    if (campo.type === 'checkbox') campo.checked = Boolean(datos[campo.name]);
    else if (campo.type === 'radio') campo.checked = campo.value === String(datos[campo.name]);
    else campo.value = datos[campo.name];
  });
}

/** Olvida el borrador; se usa después de un envío correcto o de un reset. */
export function borrarBorrador(formulario) {
  borrarSesion(claveBorrador(formulario));
}

/**
 * Restaura el borrador y guarda lo que se escriba. Se ofrece por separado para
 * los formularios que no usan `construirValidador` (los dinámicos del panel).
 */
export function activarBorrador(formulario) {
  if (!formulario || formulario.dataset.borradorActivo === 'true') return;

  formulario.dataset.borradorActivo = 'true';
  restaurarBorrador(formulario);

  formulario.addEventListener('input', () => guardarBorrador(formulario));
  formulario.addEventListener('change', () => guardarBorrador(formulario));

  // Un reset (envío correcto o "Nuevo producto") descarta el borrador.
  formulario.addEventListener('reset', () => {
    window.setTimeout(() => borrarBorrador(formulario), 0);
  });
}

/* =========================================================
   Mensajes y estado visual de los campos
   ========================================================= */

/** Devuelve (o crea) el elemento que muestra el error de un campo. */
function elementoError(campo) {
  const id = `err-${campo.id}`;
  let elemento = document.getElementById(id);

  if (!elemento) {
    elemento = document.createElement('p');
    elemento.id = id;
    elemento.className = 'pf-error';
    elemento.setAttribute('role', 'alert');
    // Se inserta justo después del campo para que quede cerca visualmente.
    campo.insertAdjacentElement('afterend', elemento);
  }

  return elemento;
}

/** Añade el mensaje de error a `aria-describedby` sin perder los ayuda-ficheros
 *  que el campo ya tenía (WCAG 2.2, 1.3.1 y 3.3.1). */
function describirConError(campo, idError) {
  const descritos = (campo.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);

  if (!descritos.includes(idError)) descritos.push(idError);
  campo.setAttribute('aria-describedby', descritos.join(' '));
}

/** Quita el mensaje de error de `aria-describedby`, pero conserva el resto. */
function describirSinError(campo, idError) {
  const descritos = (campo.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter((id) => id && id !== idError);

  if (descritos.length > 0) campo.setAttribute('aria-describedby', descritos.join(' '));
  else campo.removeAttribute('aria-describedby');
}

/** Marca el campo como inválido y muestra un mensaje explicativo. */
export function mostrarError(campo, mensaje) {
  const error = elementoError(campo);
  error.textContent = mensaje;
  error.hidden = false;
  campo.setAttribute('aria-invalid', 'true');
  campo.setCustomValidity(mensaje);
  describirConError(campo, error.id);
}

/** Limpia el estado de error del campo. */
export function limpiarError(campo) {
  const error = elementoError(campo);

  if (error) {
    error.textContent = '';
    error.hidden = true;
    describirSinError(campo, error.id);
  }

  campo.removeAttribute('aria-invalid');
  campo.setCustomValidity('');
}

/** Mensaje genérico de un campo según el estado de validación nativa. */
function mensajeNativo(campo) {
  const valor = campo.value.trim();

  if (campo.validity.valueMissing) return 'Este campo es obligatorio.';
  if (campo.validity.typeMismatch && campo.type === 'email')
    return 'Escribe un correo válido, por ejemplo: nombre@correo.com';
  if (campo.validity.tooShort)
    return `Escribe al menos ${campo.minLength} caracteres para continuar.`;
  if (campo.validity.patternMismatch)
    return campo.dataset.mensajePatron || 'El valor no tiene el formato esperado.';

  if (campo.type === 'email' && valor && !campo.validity.valid) {
    return 'Revisa el correo: le falta el @ o el dominio.';
  }

  return 'Revisa este campo antes de continuar.';
}

/* =========================================================
   Reglas de negocio con Expresiones Regulares
   ========================================================= */

/** Valida la cédula ecuatoriana: 10 dígitos numéricos. */
export function validarCedula(campo) {
  if (campo.value.trim() === '') return true;
  if (!REGEX.cedula.test(campo.value.trim())) {
    mostrarError(campo, 'La cédula debe tener 10 dígitos, sin letras ni guiones. Ejemplo: 1712345678.');
    return false;
  }
  limpiarError(campo);
  return true;
}

/** Valida el celular ecuatoriano: 09 seguido de 8 dígitos. */
export function validarTelefono(campo) {
  if (campo.value.trim() === '') return true;
  if (!REGEX.telefono.test(campo.value.trim())) {
    mostrarError(campo, 'El teléfono debe tener 10 dígitos y empezar por 09. Ejemplo: 0991234567.');
    return false;
  }
  limpiarError(campo);
  return true;
}

/** Valida el nombre completo. */
export function validarNombre(campo) {
  if (campo.value.trim() === '') return true;
  if (!REGEX.nombre.test(campo.value.trim())) {
    mostrarError(campo, 'Escribe un nombre de entre 2 y 60 letras. No uses números ni símbolos.');
    return false;
  }
  limpiarError(campo);
  return true;
}

/** Valida la contraseña: mínimo 8 caracteres, con letras y números. */
export function validarContrasena(campo) {
  if (campo.value === '') return true;
  if (!REGEX.contrasena.test(campo.value)) {
    mostrarError(
      campo,
      'La contraseña necesita al menos 8 caracteres, con letras y números.'
    );
    return false;
  }
  limpiarError(campo);
  return true;
}

/**
 * Compara dos campos (por ejemplo contraseña y su confirmación).
 * Es una regla de negocio que HTML5 no puede resolver por sí sola.
 */
export function validarCoincidencia(campo, campoOriginal, etiqueta = 'Las contraseñas') {
  if (campo.value === '') return true;
  if (campo.value !== campoOriginal.value) {
    mostrarError(campo, `${etiqueta} no coinciden. Vuelve a escribirlas igual.`);
    return false;
  }
  limpiarError(campo);
  return true;
}

/** Regla de negocio: no se pueden agendar citas en fechas pasadas. */
export function validarFechaFutura(campo) {
  if (campo.value === '') return true;
  const elegida = new Date(`${campo.value}T00:00:00`);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (elegida < hoy) {
    mostrarError(campo, 'Elige una fecha de hoy o posterior. No se aceptan fechas pasadas.');
    return false;
  }
  limpiarError(campo);
  return true;
}

/* =========================================================
   Formulario completo
   ========================================================= */

/**
 * Registra la validación de un formulario completo.
 *
 * @param {HTMLFormElement} formulario
 * @param {object} opciones - { reglas: {idCampo: función}, alEnviar: función async }
 * @returns {object} API con { validar, invalidarTodo }
 */
export function construirValidador(formulario, opciones = {}) {
  const reglas = opciones.reglas || {};

  // Marca el formulario como protegido por este validador: la red de
  // seguridad de más abajo deja de interceptarlo.
  formulario.dataset.validador = 'activo';

  // Lo escrito antes de recargar la página vuelve a los campos, y cada cambio
  // se guarda. Las contraseñas quedan fuera del borrador por seguridad.
  activarBorrador(formulario);

  /** Aplica la validación nativa y las reglas de un campo suelto. */
  function validarCampo(campo) {
    if (!campo.willValidate && campo.type !== 'submit') return true;

    // El error del intento anterior se descarta antes de volver a comprobar:
    // checkValidity() también tiene en cuenta setCustomValidity(), así que sin
    // este paso un campo marcado nunca podría recuperarse.
    campo.setCustomValidity('');

    if (!campo.checkValidity()) {
      mostrarError(campo, mensajeNativo(campo));
      return false;
    }

    const regla = reglas[campo.id];
    if (regla && !regla(campo)) return false;

    limpiarError(campo);
    return true;
  }

  /** Valida todos los campos del formulario. */
  function validarTodo() {
    const campos = [...formulario.querySelectorAll('input, select, textarea')];
    const resultados = campos.map(validarCampo);
    return resultados.every(Boolean);
  }

  const esCampo = (nodo) => Boolean(nodo?.matches?.('input, select, textarea'));

  // Se recuerdan los campos que la persona ya visitó: el primer aviso aparece
  // al salir del campo y, desde ahí, se actualiza en cada cambio.
  const tocados = new WeakSet();

  // Marca el re-enfoque que provoca el bloqueo secuencial (más abajo): el
  // campo que se intentaba visitar no debe contarse como visitado.
  let bloqueando = false;

  const validarSiCorresponde = (campo) => {
    if (!esCampo(campo)) return;
    if (tocados.has(campo) || campo.getAttribute('aria-invalid') === 'true') validarCampo(campo);
  };

  formulario.addEventListener(
    'blur',
    (evento) => {
      if (!esCampo(evento.target) || bloqueando) return;
      tocados.add(evento.target);
      validarCampo(evento.target);
    },
    true
  );

  // El borrador ya se guarda con `activarBorrador`: aquí solo se valida lo
  // escrito mientras se corrige.
  formulario.addEventListener('input', (evento) => {
    validarSiCorresponde(evento.target);
  });

  formulario.addEventListener('change', (evento) => {
    validarSiCorresponde(evento.target);
  });

  /* Bloqueo secuencial: un campo obligatorio o con formato mal escrito no
     deja avanzar. Al entrar en un campo posterior se comprueban los
     anteriores del mismo formulario: si alguno falla, el foco vuelve al
     primero que está mal, con su mensaje visible. Un campo que todavía no se
     ha tocado no bloquea (al enviarlo ya se avisa de lo pendiente).
     Botones, enlaces y diálogos (como el modal de acceso del carrito)
     quedan fuera del bloqueo, así que la persona puede salir del formulario
     o enviarlo cuando quiera y recibir ahí el resumen de errores. */
  formulario.addEventListener('focusin', (evento) => {
    const destino = evento.target;
    if (bloqueando || !esCampo(destino)) return;
    if (destino.closest('[role="dialog"], dialog, [data-modal-acceso]')) return;

    const campos = [...formulario.querySelectorAll('input, select, textarea')];
    const indice = campos.indexOf(destino);
    if (indice < 1) return;

    const bloqueador = campos.slice(0, indice).find((campo) => {
      if (!campo.willValidate || campo.disabled || campo.getClientRects().length === 0) return false;
      // Vacío y sin visitar: aún no está "mal llenado", no bloquea el avance.
      if (campo.value.trim() === '' && !tocados.has(campo)) return false;
      return !validarCampo(campo);
    });

    if (bloqueador) {
      bloqueando = true;
      bloqueador.focus();
      bloqueando = false;
    }
  });

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    // A partir del envío todos los campos se consideran visitados, así que
    // cualquier error queda visible y el formulario no avanza.
    [...formulario.querySelectorAll('input, select, textarea')].forEach((campo) =>
      tocados.add(campo)
    );

    if (!validarTodo()) {
      const primero = formulario.querySelector('[aria-invalid="true"]');
      if (primero) primero.focus();

      const region = formulario.querySelector('.pf-mensaje[aria-live]');
      mostrarMensaje(region, 'Revisa los campos marcados antes de continuar.', 'error');
      return;
    }

    if (typeof opciones.alEnviar === 'function') {
      const resultado = await opciones.alEnviar(formulario);
      // Un `false` significa que el intento falló (por ejemplo, credenciales
      // incorrectas): el borrador se conserva para corregir y reintentar.
      if (resultado !== false) borrarBorrador(formulario);
    }
  });

  return { validarCampo, validarTodo };
}

/* =========================================================
   Mensajes dinámicos accesibles
   ========================================================= */

/**
 * Escribe un mensaje en una región aria-live.
 * @param {HTMLElement|null} region
 * @param {string} mensaje
 * @param {'info'|'exito'|'error'} tipo
 */
export function mostrarMensaje(region, mensaje, tipo = 'info') {
  if (!region) return;

  region.textContent = mensaje;
  region.dataset.tipo = tipo;
  region.hidden = false;
  region.classList.add('pf-aparece');

  window.clearTimeout(region.dataset.timer);
  region.dataset.timer = window.setTimeout(() => {
    region.classList.remove('pf-aparece');
  }, 600);
}

/* =========================================================
   Red de seguridad del envío
   ========================================================= */

/**
 * Ningún formulario con `novalidate` puede recargar la página mientras su
 * validador todavía no esté conectado (por ejemplo, si el catálogo tarda en
 * cargar). Así nunca se "avanza" con campos incompletos ni se pierde lo
 * escrito. En Node no existe `document`, por eso se consulta con `globalThis`.
 */
globalThis.document?.addEventListener?.(
  'submit',
  (evento) => {
    const formulario = evento.target;
    if (
      formulario instanceof HTMLFormElement &&
      formulario.hasAttribute('novalidate') &&
      formulario.dataset.validador !== 'activo'
    ) {
      evento.preventDefault();
    }
  },
  true
);