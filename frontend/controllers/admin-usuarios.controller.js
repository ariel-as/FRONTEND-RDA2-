import './admin.controller.js';
import { adminModel } from '../models/admin.model.js';
import { usuariosModel } from '../models/fase2.model.js';
import { usuarioActual } from '../models/sesion.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, fecha } from '../views/lista-api.view.js';
import { construirValidador, mostrarMensaje, mostrarErroresServidor, validarContrasena, validarCoincidencia } from './validacion.controller.js';
import { confirmarAccion } from './dialogo.controller.js';
import { crearLista, formulario } from './lista-api.controller.js';

const ROLES = [['ADM', 'Administrador'], ['REC', 'Recepcionista'], ['ENT', 'Entrenador'], ['CON', 'Contadora']];
const NOMBRE_ROL = Object.fromEntries(ROLES);
// Qué acceso da cada rol (los permisos van por rol, según server/config/permisos.js).
const PERMITE = { ADM: 'Todo el panel, incluidas anulaciones, usuarios y configuración.', REC: 'Recepción: entradas, inscripciones, clientes, ventas, pedidos, caja y mensajes.', ENT: 'Rutinas de sus clientes, clases, aforo y su asistencia.', CON: 'Contabilidad: facturas y SRI, cuadres y cierres, reportes y lectura de otras tablas.' };
const mensaje = document.querySelector('#mensaje-pantalla');
const form = document.querySelector('#form-nuevo-usuario');
const yo = usuarioActual();

async function cargarEmpleados() {
  const select = document.querySelector('#empleadoId');
  if (!select) return;
  try {
    const r = await adminModel.tablaFilas('empleado', { limit: 100, estado: 'A' });
    const empleados = r?.data || r || [];
    select.innerHTML = '<option value="">Selecciona un empleado</option>' + empleados.map((e) => `<option value="${escapar(e.id)}">${escapar(`${e.nombre || ''} ${e.apellido || ''}`.trim() || e.id)}</option>`).join('');
  } catch { select.innerHTML = '<option value="">No se pudieron cargar los empleados</option>'; }
}
function pintarRolesNuevos() {
  const cont = document.querySelector('[data-roles-nuevos]');
  if (cont) cont.innerHTML = ROLES.map(([c, t]) => `<div class="form-check"><input class="form-check-input" type="checkbox" name="roles" value="${c}" id="rol-nuevo-${c}"><label class="form-check-label" for="rol-nuevo-${c}">${t}</label></div>`).join('');
}

const lista = crearLista({
  raiz: '#pantalla-usuarios',
  filtros: '#filtros-usuarios',
  caption: 'Cuentas del personal',
  cargar: (p) => usuariosModel.listar(p),
  columnas: [
    ['Correo', (u) => txt(u.login)],
    ['Empleado', (u) => txt(u.empleado?.nombre || u.cliente?.nombre)],
    ['Roles', (u) => ((u.roles || []).length ? txt(u.roles.map((r) => NOMBRE_ROL[r] || r).join(', ')) : '<span class="text-danger fw-semibold">Sin roles</span>')],
    ['Último acceso', (u) => fecha(u.ultimoAcceso, true)],
    ['Estado', (u) => txt(u.estado === 'A' ? 'Activa' : 'Inactiva')]
  ],
  acciones: (u) => [
    { texto: 'Editar correo', permiso: 'usuarios:gestionar', etiqueta: `Editar correo de ${u.login}`, ejecutar: () => formulario({
      titulo: `Editar correo de ${u.login}`, campos: [{ nombre: 'correo', etiqueta: 'Correo (login)', tipo: 'email', valor: u.login, requerido: true, maxlength: 120 }],
      alConfirmar: (v) => usuariosModel.editar(u.id, { correo: v.correo.trim() }), exito: 'Correo actualizado.' }) },
    { texto: 'Restablecer contraseña', permiso: 'usuarios:gestionar', etiqueta: `Restablecer contraseña de ${u.login}`, ejecutar: () => formulario({
      titulo: `Restablecer contraseña de ${u.login}`, mensaje: 'La persona deberá usar la nueva contraseña en su próximo ingreso.',
      campos: [{ nombre: 'contrasena', etiqueta: 'Nueva contraseña', tipo: 'password', requerido: true, maxlength: 72, autocompletar: 'new-password', ayuda: 'Entre 8 y 72 caracteres, con letras y números.' }],
      reglas: { contrasena: validarContrasena },
      alConfirmar: (v) => usuariosModel.editar(u.id, { contrasena: v.contrasena }), exito: 'Contraseña restablecida.' }) },
    // Antes era el diálogo "dialogo-roles" sobre usuario_rol; ahora usa PUT /admin/usuarios/:id/roles con casillas.
    { texto: 'Roles', permiso: 'usuarios:gestionar', etiqueta: `Roles de ${u.login}`, ejecutar: () => formulario({
      titulo: `Roles de ${u.login}`, mensaje: 'Marca los roles activos. Debe quedar al menos uno.',
      contenido: `<fieldset><legend class="fs-6">Roles activos</legend>${ROLES.map(([c, t]) => `<div class="form-check"><input class="form-check-input" type="checkbox" name="rol-${c}" id="rol-${u.id}-${c}" value="${c}" ${(u.roles || []).includes(c) ? 'checked' : ''} ${String(u.id) === String(yo?.id) && c === 'ADM' ? 'disabled' : ''}><label class="form-check-label" for="rol-${u.id}-${c}">${t}${String(u.id) === String(yo?.id) && c === 'ADM' ? ' (no puedes quitártelo)' : ''}</label><p class="small text-body-secondary mb-2">${PERMITE[c]}</p></div>`).join('')}</fieldset>`,
      validarExtra: (f) => (f.querySelectorAll('input[type="checkbox"]:checked').length ? null : { campo: f.querySelector('input[type="checkbox"]'), mensaje: 'Marca al menos un rol.' }),
      alConfirmar: (_, f) => usuariosModel.roles(u.id, [...f.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value)),
      exito: 'Roles actualizados.' }) },
    { texto: u.estado === 'A' ? 'Desactivar' : 'Activar', permiso: 'usuarios:gestionar', tono: u.estado === 'A' ? 'btn-outline-danger' : 'btn-outline-success', etiqueta: `${u.estado === 'A' ? 'Desactivar' : 'Activar'} ${u.login}`,
      ejecutar: async () => (await confirmarAccion({ titulo: u.estado === 'A' ? 'Desactivar cuenta' : 'Activar cuenta', mensaje: `¿${u.estado === 'A' ? 'Desactivar' : 'Activar'} la cuenta ${u.login}?`, textoConfirmar: u.estado === 'A' ? 'Desactivar' : 'Activar', tono: u.estado === 'A' ? 'peligro' : 'primario',
        alConfirmar: () => adminModel.estadoUsuario(u.id, { estado: u.estado === 'A' ? 'I' : 'A' }) }) ? 'Estado de la cuenta actualizado.' : null) }
  ]
});

if (form) {
  pintarRolesNuevos();
  cargarEmpleados();
  construirValidador(form, {
    reglas: { contrasena: validarContrasena, confirmacion: (c) => validarCoincidencia(c, form.querySelector('#contrasena')) },
    alEnviar: async () => {
      const roles = [...form.querySelectorAll('input[name="roles"]:checked')].map((i) => i.value);
      if (!roles.length) { mostrarMensaje(mensaje, 'Selecciona al menos un rol para la cuenta.', 'error'); form.querySelector('input[name="roles"]')?.focus(); return false; }
      try {
        await adminModel.crearUsuario({ login: form.login.value.trim(), contrasena: form.contrasena.value, empleadoId: form.empleadoId.value, roles });
        form.reset();
        mostrarMensaje(mensaje, 'Cuenta del personal creada.', 'exito');
        lista?.recargar();
        return true;
      } catch (error) {
        const primero = mostrarErroresServidor(form, error);
        mostrarMensaje(mensaje, error.mensaje || 'No se pudo crear la cuenta.', error.status === 400 && primero ? 'info' : 'error');
        return false;
      }
    }
  });
}
