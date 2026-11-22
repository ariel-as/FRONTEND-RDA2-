import './admin.controller.js';
import { adminModel } from '../models/admin.model.js';
import { escapar } from '../views/componentes.view.js';
import { fechaLocal } from '../views/admin.view.js';
import {
  construirValidador, mostrarMensaje, mostrarErroresServidor, validarContrasena, validarCoincidencia
} from './validacion.controller.js';
import { confirmarAccion } from './dialogo.controller.js';

const mensaje = document.querySelector('#mensaje-pantalla');
const tbody = document.querySelector('[data-usuarios-body]');
const formulario = document.querySelector('#form-nuevo-usuario');
const selectEmpleado = document.querySelector('#empleadoId');
const contRoles = document.querySelector('[data-roles-nuevos]');
const yo = (() => { try { return JSON.parse(sessionStorage.getItem('usuario') || 'null') || {}; } catch { return {}; } })();

let usuarios = [];
let roles = [];
let asignaciones = [];
let empleados = [];
let metaUsuarioRol = null;

const mapaRoles = () => new Map(roles.map((r) => [String(r.id), r.descripcion || r.id]));
const claveRol = (usuarioId, rolId) => {
  const campos = metaUsuarioRol?.idCampos?.length ? metaUsuarioRol.idCampos : ['usuarioId', 'rolId'];
  return campos.map((campo) => (campo === 'usuarioId' ? usuarioId : campo === 'rolId' ? rolId : '')).join('~');
};

async function cargarDatos() {
  const [respuestaUsuarios, respuestaRoles, respuestaAsignaciones, respuestaEmpleados] = await Promise.all([
    adminModel.tablaFilas('usuario', { limit: 100 }),
    adminModel.tablaFilas('rol', { limit: 100 }).catch(() => []),
    adminModel.tablaFilas('usuario_rol', { limit: 500 }).catch(() => []),
    adminModel.tablaFilas('empleado', { limit: 300 }).catch(() => [])
  ]);
  usuarios = respuestaUsuarios?.data || respuestaUsuarios || [];
  roles = respuestaRoles?.data || respuestaRoles || [];
  asignaciones = respuestaAsignaciones?.data || respuestaAsignaciones || [];
  empleados = respuestaEmpleados?.data || respuestaEmpleados || [];
  try { metaUsuarioRol = await adminModel.tablaMeta('usuario_rol'); } catch { metaUsuarioRol = null; }
}

function pintarUsuarios() {
  const descripciones = mapaRoles();
  if (!usuarios.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-body-secondary">No hay cuentas de personal registradas.</td></tr>';
    return;
  }
  tbody.innerHTML = usuarios.map((usuario) => {
    const susRoles = asignaciones.filter((a) => String(a.usuarioId) === String(usuario.id));
    const textoRoles = susRoles.length
      ? susRoles.map((a) => `${escapar(descripciones.get(String(a.rolId)) || a.rolId)}${a.estado === 'I' ? ' (inactivo)' : ''}`).join(', ')
      : '<span class="text-body-secondary">Sin roles</span>';
    const propio = String(usuario.id) === String(yo.id);
    return `<tr>
      <th scope="row">${escapar(usuario.id)}</th>
      <td>${escapar(usuario.login || '')}</td>
      <td>${textoRoles}</td>
      <td>${fechaLocal(usuario.fechaCreacion)}</td>
      <td>${fechaLocal(usuario.ultimoAcceso)}</td>
      <td>${escapar(usuario.estado === 'A' ? 'Activo' : usuario.estado === 'I' ? 'Inactivo' : usuario.estado || 'vacío')}</td>
      <td class="d-flex flex-wrap gap-1">
        <button type="button" class="btn btn-sm btn-outline-primary" data-ver-roles="${escapar(usuario.id)}" aria-label="Ver roles de ${escapar(usuario.login || usuario.id)}">Roles</button>
        ${propio ? '<span class="small text-body-secondary align-self-center">Tu cuenta</span>' : `<button type="button" class="btn btn-sm btn-outline-warning" data-toggle-usuario="${escapar(usuario.id)}" data-estado="${escapar(usuario.estado || '')}" aria-label="${usuario.estado === 'A' ? 'Desactivar' : 'Activar'} la cuenta ${escapar(usuario.login || usuario.id)}">${usuario.estado === 'A' ? 'Desactivar' : 'Activar'}</button>`}
      </td>
    </tr>`;
  }).join('');
}

function pintarEmpleados() {
  const libres = empleados.filter((e) => !e.usuarioId);
  if (!libres.length) {
    selectEmpleado.innerHTML = '<option value="">No hay empleados sin cuenta</option>';
    return;
  }
  selectEmpleado.innerHTML = '<option value="">Selecciona un empleado</option>' + libres.map((e) => `<option value="${escapar(e.id)}">${escapar(`${e.nombre || ''} ${e.apellido || ''}`.trim())} — ${escapar(e.id)}</option>`).join('');
}

function pintarRolesNuevos() {
  const administrativos = roles.filter((r) => r.tipo === 'A');
  const lista = administrativos.length ? administrativos : [
    { id: 'ADM', descripcion: 'Administrador' },
    { id: 'REC', descripcion: 'Recepción' },
    { id: 'ENT', descripcion: 'Entrenador' },
    { id: 'CON', descripcion: 'Contabilidad' }
  ];
  contRoles.innerHTML = lista.map((rol) => `<label class="form-check"><input class="form-check-input" type="checkbox" name="roles" value="${escapar(rol.id)}"> <span class="form-check-label">${escapar(rol.descripcion || rol.id)}</span></label>`).join('');
}

async function refrescar() {
  try {
    await cargarDatos();
    pintarUsuarios();
    pintarEmpleados();
    pintarRolesNuevos();
  } catch (error) {
    mostrarMensaje(mensaje, error.mensaje || 'No se pudieron cargar los usuarios.', 'error');
  }
}

function asegurarDialogoRoles() {
  let dialogo = document.querySelector('#dialogo-roles');
  if (dialogo) return dialogo;
  dialogo = document.createElement('dialog');
  dialogo.id = 'dialogo-roles';
  dialogo.className = 'border-0 rounded p-0 pf-admin-modal';
  dialogo.style.cssText = 'max-width:680px;width:100%';
  dialogo.setAttribute('aria-labelledby', 'titulo-dialogo-roles');
  dialogo.innerHTML = `<div class="p-4">
    <h2 id="titulo-dialogo-roles" class="h5" data-titulo-roles>Roles de la cuenta</h2>
    <p class="small text-body-secondary" data-login-roles></p>
    <div class="table-responsive"><table class="table table-sm align-middle"><caption class="visually-hidden">Roles asignados a la cuenta</caption><thead><tr><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead><tbody data-roles-asignados></tbody></table></div>
    <div class="border-top pt-3 mt-3"><label class="form-label" for="rol-nuevo">Asignar otro rol</label><div class="d-flex gap-2"><select id="rol-nuevo" class="form-select" data-rol-nuevo></select><button type="button" class="btn btn-primary" data-agregar-rol>Asignar</button></div></div>
    <div class="mt-3 d-flex justify-content-end"><button type="button" class="btn btn-outline-secondary" data-cerrar-roles>Cerrar</button></div>
  </div>`;
  document.body.appendChild(dialogo);
  dialogo.querySelector('[data-cerrar-roles]').addEventListener('click', () => dialogo.close());
  return dialogo;
}

async function abrirRoles(usuarioId, boton) {
  const dialogo = asegurarDialogoRoles();
  const usuario = usuarios.find((u) => String(u.id) === String(usuarioId)) || {};
  const descripciones = mapaRoles();
  const asignados = asignaciones.filter((a) => String(a.usuarioId) === String(usuarioId));
  dialogo.dataset.usuarioId = usuarioId;
  if (!dialogo.open) {
    dialogo.showModal?.();
    if (!dialogo.open) dialogo.setAttribute('open', '');
    dialogo.addEventListener('close', () => boton?.focus?.(), { once: true });
  }
  dialogo.querySelector('[data-titulo-roles]').textContent = `Roles de ${usuario.login || usuarioId}`;
  dialogo.querySelector('[data-login-roles]').textContent = `Código ${usuarioId}. Los cambios se guardan en la tabla usuario_rol.`;
  const cuerpo = dialogo.querySelector('[data-roles-asignados]');
  cuerpo.innerHTML = asignados.length ? asignados.map((a) => `<tr>
      <th scope="row">${escapar(descripciones.get(String(a.rolId)) || a.rolId)}</th>
      <td>${escapar(a.estado === 'A' ? 'Activo' : a.estado === 'I' ? 'Inactivo' : a.estado || 'vacío')}</td>
      <td><button type="button" class="btn btn-sm btn-outline-warning" data-toggle-rol="${escapar(a.rolId)}" data-estado="${escapar(a.estado || '')}">${a.estado === 'A' ? 'Suspender' : 'Activar'}</button></td>
    </tr>`).join('') : '<tr><td colspan="3" class="text-body-secondary">Esta cuenta no tiene roles asignados.</td></tr>';
  const usados = new Set(asignados.map((a) => String(a.rolId)));
  const disponibles = roles.filter((r) => !usados.has(String(r.id)));
  const selector = dialogo.querySelector('[data-rol-nuevo]');
  selector.innerHTML = disponibles.length ? disponibles.map((r) => `<option value="${escapar(r.id)}">${escapar(r.descripcion || r.id)}</option>`).join('') : '<option value="">No hay roles disponibles</option>';
  selector.disabled = !disponibles.length;
  dialogo.querySelector('[data-agregar-rol]').disabled = !disponibles.length;
}

tbody.addEventListener('click', async (evento) => {
  const ver = evento.target.closest('[data-ver-roles]');
  if (ver) { abrirRoles(ver.dataset.verRoles, ver); return; }
  const toggle = evento.target.closest('[data-toggle-usuario]');
  if (!toggle) return;
  const nuevo = toggle.dataset.estado === 'A' ? 'I' : 'A';
  if (!await confirmarAccion({ titulo: nuevo === 'A' ? 'Activar cuenta' : 'Desactivar cuenta', mensaje: `¿${nuevo === 'A' ? 'Activar' : 'Desactivar'} esta cuenta?`, textoConfirmar: nuevo === 'A' ? 'Activar' : 'Desactivar', tono: nuevo === 'A' ? 'primario' : 'peligro' })) return;
  try {
    await adminModel.estadoUsuario(toggle.dataset.toggleUsuario, { estado: nuevo });
    mostrarMensaje(mensaje, 'Estado de la cuenta actualizado.', 'exito');
    await refrescar();
  } catch (error) {
    mostrarMensaje(mensaje, error.mensaje || 'No se pudo actualizar el estado.', 'error');
  }
});

document.addEventListener('click', async (evento) => {
  const dialogo = documentoRoles();
  if (!dialogo) return;
  const agregar = evento.target.closest('[data-agregar-rol]');
  if (agregar) {
    const rolId = dialogo.querySelector('[data-rol-nuevo]')?.value;
    const usuarioId = dialogo.dataset.usuarioId;
    if (!rolId) return;
    try {
      await adminModel.tablaCrear('usuario_rol', { usuarioId, rolId, estado: 'A' });
      mostrarMensaje(mensaje, 'Rol asignado.', 'exito');
      await refrescar();
      abrirRoles(usuarioId, document.querySelector(`[data-ver-roles="${CSS.escape(String(usuarioId))}"]`));
    } catch (error) {
      mostrarMensaje(mensaje, error.mensaje || 'No se pudo asignar el rol.', 'error');
    }
    return;
  }
  const toggleRol = evento.target.closest('[data-toggle-rol]');
  if (!toggleRol) return;
  const usuarioId = dialogo.dataset.usuarioId;
  const rolId = toggleRol.dataset.toggleRol;
  const asignacion = asignaciones.find((a) => String(a.usuarioId) === String(usuarioId) && String(a.rolId) === String(rolId));
  if (!asignacion) return;
  const nuevo = toggleRol.dataset.estado === 'A' ? 'I' : 'A';
  try {
    await adminModel.tablaEditar('usuario_rol', claveRol(usuarioId, rolId), { ...asignacion, estado: nuevo });
    mostrarMensaje(mensaje, 'Estado del rol actualizado.', 'exito');
    await refrescar();
    abrirRoles(usuarioId, document.querySelector(`[data-ver-roles="${CSS.escape(String(usuarioId))}"]`));
  } catch (error) {
    mostrarMensaje(mensaje, error.mensaje || 'No se pudo cambiar el rol.', 'error');
  }
});

function documentoRoles() { return document.querySelector('#dialogo-roles'); }

construirValidador(formulario, {
  reglas: {
    contrasena: validarContrasena,
    confirmacion: (campo) => validarCoincidencia(campo, formulario.querySelector('#contrasena'))
  },
  alEnviar: async () => {
    const elegidos = [...formulario.querySelectorAll('input[name="roles"]:checked')].map((i) => i.value);
    if (!elegidos.length) {
      mostrarMensaje(mensaje, 'Selecciona al menos un rol para la cuenta.', 'error');
      formulario.querySelector('input[name="roles"]')?.focus();
      return false;
    }
    try {
      await adminModel.crearUsuario({
        login: formulario.login.value.trim(),
        contrasena: formulario.contrasena.value,
        empleadoId: formulario.empleadoId.value,
        roles: elegidos
      });
      formulario.reset();
      formulario.querySelectorAll('.pf-error').forEach((n) => n.remove());
      mostrarMensaje(mensaje, 'Cuenta del personal creada.', 'exito');
      await refrescar();
      return true;
    } catch (error) {
      const primero = mostrarErroresServidor(formulario, error, { contrasena: 'contrasena' });
      mostrarMensaje(mensaje, error.mensaje || 'No se pudo crear la cuenta.', error.status === 400 && primero ? 'info' : 'error');
      return false;
    }
  }
});

refrescar();
