import { escapar } from './componentes.view.js';

let contador = 0;

// Clases de botón según el contexto: Bootstrap en el panel, estilos propios en la web del cliente.
function clasesBoton(tipo) {
  const panel = document.body.classList.contains('pf-admin');
  if (panel) return tipo === 'peligro' ? 'btn btn-danger' : tipo === 'primario' ? 'btn btn-primary' : 'btn btn-outline-secondary';
  return tipo === 'secundario' ? 'pf-boton pf-boton-secundario' : 'pf-boton pf-boton-primario';
}

function campoHtml(campo, id) {
  const nombre = escapar(campo.nombre);
  const idCampo = `${id}-${nombre}`;
  const requerido = campo.requerido ? 'required' : '';
  const max = campo.maxlength ? `maxlength="${Number(campo.maxlength)}"` : '';
  const patron = campo.patron ? `pattern="${escapar(campo.patron)}"` : '';
  const mensajePatron = campo.mensajePatron ? `data-mensaje-patron="${escapar(campo.mensajePatron)}"` : '';
  const valor = escapar(campo.valor ?? '');
  const ayudaId = campo.ayuda ? `${idCampo}-ayuda` : '';
  const describe = ayudaId ? `aria-describedby="${ayudaId}"` : '';
  let control;
  if (campo.tipo === 'textarea') {
    control = `<textarea class="form-control pf-dialogo-control" id="${idCampo}" name="${nombre}" rows="3" ${requerido} ${max} ${describe}>${valor}</textarea>`;
  } else if (campo.tipo === 'select') {
    const opciones = (campo.opciones || []).map((o) => `<option value="${escapar(o.valor)}"${String(o.valor) === String(campo.valor ?? '') ? ' selected' : ''}>${escapar(o.texto)}</option>`).join('');
    control = `<select class="form-select pf-dialogo-control" id="${idCampo}" name="${nombre}" ${requerido} ${describe}>${opciones}</select>`;
  } else {
    const tipo = ['number', 'date', 'email', 'password', 'datetime-local'].includes(campo.tipo) ? campo.tipo : 'text';
    const extra = tipo === 'number' ? `step="${escapar(campo.paso ?? '0.01')}"${campo.min !== undefined ? ` min="${escapar(campo.min)}"` : ''}` : '';
    control = `<input class="form-control pf-dialogo-control" type="${tipo}" id="${idCampo}" name="${nombre}" value="${valor}" ${requerido} ${max} ${patron} ${mensajePatron} ${extra} ${describe} ${campo.autocompletar ? `autocomplete="${escapar(campo.autocompletar)}"` : 'autocomplete="off"'}>`;
  }
  return `<div class="pf-dialogo-campo mb-3"><label class="form-label pf-dialogo-etiqueta" for="${idCampo}">${escapar(campo.etiqueta)}${campo.requerido ? ' *' : ''}</label>${control}${campo.ayuda ? `<p id="${ayudaId}" class="form-text pf-dialogo-ayuda mb-0">${escapar(campo.ayuda)}</p>` : ''}</div>`;
}

// Estructura del diálogo propio (reemplaza confirm() y prompt()).
export function crearDialogoHtml({ titulo, mensaje = '', campos = [], contenido = '', textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', tono = 'primario', soloCerrar = false }) {
  const id = `dialogo-pf-${++contador}`;
  const dialogo = document.createElement('dialog');
  dialogo.className = 'pf-dialogo border-0 rounded p-0';
  dialogo.id = id;
  dialogo.setAttribute('aria-labelledby', `${id}-titulo`);
  if (mensaje) dialogo.setAttribute('aria-describedby', `${id}-mensaje`);
  dialogo.innerHTML = `<form class="pf-dialogo-cuerpo p-4" novalidate data-dialogo-form>
    <h2 id="${id}-titulo" class="h5 pf-dialogo-titulo">${escapar(titulo)}</h2>
    ${mensaje ? `<p id="${id}-mensaje" class="pf-dialogo-mensaje">${escapar(mensaje)}</p>` : ''}
    ${campos.length ? '<p class="small pf-dialogo-ayuda mb-2">Los campos con * son obligatorios.</p>' : ''}
    ${campos.map((c) => campoHtml(c, id)).join('')}
    <div data-dialogo-contenido>${contenido}</div>
    <p class="pf-mensaje" data-dialogo-region role="status" aria-live="polite" hidden></p>
    <p class="pf-dialogo-error" data-dialogo-error role="alert" hidden></p>
    <div class="d-flex flex-wrap gap-2 justify-content-end mt-3 pf-dialogo-acciones">
      ${soloCerrar
        ? `<button type="button" class="${clasesBoton('primario')}" data-dialogo-cancelar formnovalidate>Cerrar</button>`
        : `<button type="button" class="${clasesBoton('secundario')}" data-dialogo-cancelar formnovalidate>${escapar(textoCancelar)}</button>
      <button type="submit" class="${clasesBoton(tono)}" data-dialogo-confirmar>${escapar(textoConfirmar)}</button>`}
    </div>
  </form>`;
  return dialogo;
}
