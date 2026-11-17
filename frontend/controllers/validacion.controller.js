import { CLAVES, escribirSesion, leerSesion, borrarSesionClave } from '../models/storage.model.js';

export const REGEX = {
  cedula: /^\d{10}$/,
  telefono: /^09\d{8}$/,
  nombre: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]{2,60}$/,
  contrasena: /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/,
  codigoPlan: /^PF-\d{4}$/
};

const TIPOS_SIN_BORRADOR = new Set(['password','file','submit','button','reset','image']);
function claveBorrador(formulario) {
  const propio = formulario.id || formulario.getAttribute('name') || `form${[...(globalThis.document?.forms || [])].indexOf(formulario)}`;
  return `${CLAVES.borradorFormulario}:${location.pathname}:${propio}`;
}
function camposConBorrador(formulario) {
  return [...formulario.querySelectorAll('input, select, textarea')].filter(c => c.name && !c.disabled && !TIPOS_SIN_BORRADOR.has(c.type));
}
export function guardarBorrador(formulario) {
  const datos = {};
  camposConBorrador(formulario).forEach((campo) => {
    if (campo.type === 'checkbox') { if (campo.checked) datos[campo.name] = true; return; }
    if (campo.type === 'radio') { if (campo.checked) datos[campo.name] = campo.value; return; }
    if (campo.value !== '') datos[campo.name] = campo.value;
  });
  if (!Object.keys(datos).length) borrarSesionClave(claveBorrador(formulario)); else escribirSesion(claveBorrador(formulario), datos);
}
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
export function borrarBorrador(formulario) { borrarSesionClave(claveBorrador(formulario)); }
export function activarBorrador(formulario) {
  if (!formulario || formulario.dataset.borradorActivo === 'true') return;
  formulario.dataset.borradorActivo = 'true';
  restaurarBorrador(formulario);
  formulario.addEventListener('input', () => guardarBorrador(formulario));
  formulario.addEventListener('change', () => guardarBorrador(formulario));
  formulario.addEventListener('reset', () => { window.setTimeout(() => borrarBorrador(formulario), 0); });
}

function elementoError(campo) {
  const id = `err-${campo.id}`;
  let elemento = document.getElementById(id);
  if (!elemento) {
    elemento = document.createElement('p');
    elemento.id = id; elemento.className = 'pf-error'; elemento.setAttribute('role','alert');
    campo.insertAdjacentElement('afterend', elemento);
  }
  return elemento;
}
function describirConError(campo, idError) {
  const descritos = (campo.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!descritos.includes(idError)) descritos.push(idError);
  campo.setAttribute('aria-describedby', descritos.join(' '));
}
function describirSinError(campo, idError) {
  const descritos = (campo.getAttribute('aria-describedby') || '').split(/\s+/).filter((id)=>id && id!==idError);
  if (descritos.length) campo.setAttribute('aria-describedby', descritos.join(' ')); else campo.removeAttribute('aria-describedby');
}
export function mostrarError(campo, mensaje) {
  if (!campo) return;
  const error = elementoError(campo);
  error.textContent = mensaje; error.hidden = false;
  campo.setAttribute('aria-invalid', 'true'); campo.setCustomValidity(mensaje);
  describirConError(campo, error.id);
}
export function limpiarError(campo) {
  if (!campo) return;
  const error = elementoError(campo);
  if (error) { error.textContent=''; error.hidden=true; describirSinError(campo, error.id); }
  campo.removeAttribute('aria-invalid'); campo.setCustomValidity('');
}
function mensajeNativo(campo) {
  const valor = campo.value.trim();
  if (campo.validity.valueMissing) return 'Este campo es obligatorio.';
  if (campo.validity.typeMismatch && campo.type === 'email') return 'Escribe un correo válido, por ejemplo: nombre@correo.com';
  if (campo.validity.tooShort) return `Escribe al menos ${campo.minLength} caracteres para continuar.`;
  if (campo.validity.tooLong) return `Escribe como máximo ${campo.maxLength} caracteres.`;
  if (campo.validity.patternMismatch) return campo.dataset.mensajePatron || 'El valor no tiene el formato esperado.';
  if (campo.type === 'email' && valor && !campo.validity.valid) return 'Revisa el correo: le falta el @ o el dominio.';
  return 'Revisa este campo antes de continuar.';
}

export function validarCedula(campo) {
  const v = String(campo.value || '').trim();
  if (v === '') return true;
  if (!/^\d{10}$/.test(v)) { mostrarError(campo, 'La cédula debe tener 10 dígitos, sin letras ni guiones.'); return false; }
  const prov = Number(v.slice(0,2));
  if (!((prov >= 1 && prov <= 24) || prov === 30)) { mostrarError(campo, 'La cédula no es válida. Revisa los dos primeros dígitos.'); return false; }
  const tercer = Number(v[2]);
  if (tercer >= 6) { mostrarError(campo, 'La cédula no es válida.'); return false; }
  const coef = [2,1,2,1,2,1,2,1,2];
  let suma = 0;
  for (let i=0;i<9;i++){ let prod = Number(v[i]) * coef[i]; if (prod >= 10) prod -= 9; suma += prod; }
  const digito = (10 - (suma % 10)) % 10;
  if (digito !== Number(v[9])) { mostrarError(campo, 'La cédula no es válida. Revisa el dígito verificador.'); return false; }
  limpiarError(campo); return true;
}
export function validarTelefono(campo) {
  const v = campo.value.trim(); if (v==='') return true;
  if (!/^09\d{8}$/.test(v)) { mostrarError(campo, 'El teléfono debe tener 10 dígitos y empezar por 09. Ejemplo: 0991234567.'); return false; }
  limpiarError(campo); return true;
}
export function validarNombre(campo) {
  const v = campo.value.trim(); if (v==='') return true;
  if (!REGEX.nombre.test(v)) { mostrarError(campo, 'Escribe un nombre de entre 2 y 60 letras.'); return false; }
  limpiarError(campo); return true;
}
export function validarContrasena(campo) {
  const v = campo.value; if (v==='') return true;
  if (v.length < 8 || v.length > 72 || !/[A-Za-z]/.test(v) || !/\d/.test(v)) {
    mostrarError(campo, 'La contraseña necesita entre 8 y 72 caracteres, con letras y números.'); return false;
  }
  limpiarError(campo); return true;
}
export function validarCoincidencia(campo, campoOriginal, etiqueta='Las contraseñas') {
  if (campo.value==='') return true;
  if (campo.value !== campoOriginal.value) { mostrarError(campo, `${etiqueta} no coinciden. Vuelve a escribirlas igual.`); return false; }
  limpiarError(campo); return true;
}

export function mostrarErroresServidor(formulario, error, mapa = {}) {
  const detalles = error?.detalles || [];
  let primero = null;
  detalles.forEach((d) => {
    const nombre = d.campo || d.field || d.path || d.nombre;
    const mensaje = d.mensaje || d.message || String(d);
    const id = mapa[nombre] || nombre;
    const campo = formulario.querySelector(`[name="${id}"]`) || formulario.querySelector(`#${CSS.escape(id)}`);
    if (campo) { mostrarError(campo, mensaje); if (!primero) primero = campo; }
  });
  if (primero) primero.focus();
  return primero;
}

export function construirValidador(formulario, opciones = {}) {
  const reglas = opciones.reglas || {};
  formulario.dataset.validador = 'activo';
  if (opciones.borrador !== false) activarBorrador(formulario);
  function validarCampo(campo) {
    if (!campo.willValidate && campo.type !== 'submit') return true;
    campo.setCustomValidity('');
    if (!campo.checkValidity()) { mostrarError(campo, mensajeNativo(campo)); return false; }
    const regla = reglas[campo.id] || reglas[campo.name];
    if (regla && !regla(campo)) return false;
    limpiarError(campo); return true;
  }
  function validarTodo() {
    const campos = [...formulario.querySelectorAll('input, select, textarea')];
    return campos.map(validarCampo).every(Boolean);
  }
  const esCampo = (nodo) => Boolean(nodo?.matches?.('input, select, textarea'));
  const tocados = new WeakSet();
  let bloqueando = false;
  const validarSiCorresponde = (campo) => { if (!esCampo(campo)) return; if (tocados.has(campo) || campo.getAttribute('aria-invalid') === 'true') validarCampo(campo); };
  formulario.addEventListener('blur', (e)=>{ if(!esCampo(e.target)||bloqueando) return; tocados.add(e.target); validarCampo(e.target); }, true);
  formulario.addEventListener('input', (e)=>{ validarSiCorresponde(e.target); });
  formulario.addEventListener('change', (e)=>{ validarSiCorresponde(e.target); });
  formulario.addEventListener('focusin', (e)=>{
    const destino = e.target; if (bloqueando || !esCampo(destino)) return;
    const campos = [...formulario.querySelectorAll('input, select, textarea')];
    const indice = campos.indexOf(destino); if (indice < 1) return;
    const bloqueador = campos.slice(0, indice).find((campo)=>{
      if (!campo.willValidate || campo.disabled || campo.getClientRects().length===0) return false;
      if (campo.value.trim()==='' && !tocados.has(campo)) return false;
      return !validarCampo(campo);
    });
    if (bloqueador){ bloqueando=true; bloqueador.focus(); bloqueando=false; }
  });
  formulario.addEventListener('submit', async (evento)=>{
    evento.preventDefault();
    [...formulario.querySelectorAll('input, select, textarea')].forEach((c)=>tocados.add(c));
    if (!validarTodo()) {
      const primero = formulario.querySelector('[aria-invalid="true"]');
      if (primero) primero.focus();
      const region = formulario.querySelector('.pf-mensaje[aria-live]');
      mostrarMensaje(region, 'Revisa los campos marcados antes de continuar.', 'error');
      return;
    }
    if (typeof opciones.alEnviar === 'function') {
      const resultado = await opciones.alEnviar(formulario);
      if (resultado !== false && opciones.borrador !== false) borrarBorrador(formulario);
    }
  });
  return { validarCampo, validarTodo };
}

export function mostrarMensaje(region, mensaje, tipo = 'info') {
  if (!region) return;
  region.textContent = mensaje; region.dataset.tipo = tipo; region.hidden = false; region.classList.add('pf-aparece');
  window.clearTimeout(region.dataset.timer);
  region.dataset.timer = window.setTimeout(() => { region.classList.remove('pf-aparece'); }, 600);
}

globalThis.document?.addEventListener?.('submit', (evento) => {
  const formulario = evento.target;
  if (formulario instanceof HTMLFormElement && formulario.hasAttribute('novalidate') && formulario.dataset.validador !== 'activo') {
    evento.preventDefault();
  }
}, true);
