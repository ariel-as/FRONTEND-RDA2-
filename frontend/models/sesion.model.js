import { api } from './api.model.js';
import { guardarTokenYUsuario, leerUsuarioGuardado, leerToken, borrarSesion, leerSesion, escribirSesion, CLAVES } from './storage.model.js';

export const ROLES = { cliente: 'user', admin: 'admin' };

export function usuarioActual() {
  return leerUsuarioGuardado();
}
export function haySesion() {
  return Boolean(usuarioActual() && leerToken());
}
export function codigosRol(usuario) {
  if (!Array.isArray(usuario?.roles)) return [];
  return usuario.roles
    .map((rol) => (typeof rol === 'string' ? rol : rol?.codigo ?? rol?.id ?? rol?.nombre))
    .filter(Boolean)
    .map((codigo) => String(codigo).toUpperCase());
}

export function tieneRol(rol) {
  const u = usuarioActual();
  if (!u) return false;
  const codigos = codigosRol(u);
  if (rol === ROLES.cliente || rol === 'cliente') return u.rol === 'user' || codigos.includes('CLI');
  if (rol === ROLES.admin || rol === 'admin') {
    return u.rol === 'admin' || codigos.some((codigo) => ['ADM', 'REC', 'ENT', 'CON'].includes(codigo));
  }
  return u.rol === rol || codigos.includes(String(rol).toUpperCase());
}
export function esAdministrador() {
  return tieneRol(ROLES.admin);
}

export async function iniciarSesion(correo, contrasena, rolEsperado = ROLES.cliente) {
  try {
    const data = await api.post('/auth/login', { correo, contrasena });
    const usuario = data?.usuario || data;
    const token = data?.token;
    const esperado = rolEsperado === 'cliente' ? 'user' : rolEsperado;
    const codigos = codigosRol(usuario);
    const esTipoEsperado = esperado === 'admin'
      ? usuario?.rol === 'admin' || codigos.some((codigo) => ['ADM', 'REC', 'ENT', 'CON'].includes(codigo))
      : usuario?.rol === 'user' || codigos.includes('CLI');
    if (!esTipoEsperado) {
      const mensaje = esperado === 'admin'
        ? 'Esta cuenta es de cliente. Ingresa desde el inicio de sesión de clientes.'
        : 'Esta cuenta es de administrador. Ingresa desde el acceso administrativo.';
      return { ok: false, mensaje };
    }
    guardarTokenYUsuario(token, usuario);
    return { ok: true, usuario, mensaje: `Sesión iniciada. Bienvenido, ${usuario.nombre || usuario.login || ''}.` };
  } catch (error) {
    return { ok: false, mensaje: error.mensaje || 'No se pudo iniciar sesión.', error };
  }
}

export async function registrarCliente(datos) {
  try {
    const data = await api.post('/auth/register', {
      cedula: datos.cedula,
      nombre: datos.nombre,
      apellido: datos.apellido,
      correo: datos.correo,
      telefono: datos.telefono,
      nivelId: datos.nivelId || datos.nivel,
      contrasena: datos.contrasena
    });
    const usuario = data?.usuario || data;
    const token = data?.token;
    if (token) guardarTokenYUsuario(token, usuario);
    return { ok: true, usuario, mensaje: 'Cuenta creada correctamente.' };
  } catch (error) {
    return { ok: false, mensaje: error.mensaje || 'No se pudo crear la cuenta.', error };
  }
}

export async function refrescarPerfil() {
  const data = await api.get('/auth/me', { requiereSesion: true });
  const usuario = { ...(data?.usuario || data) };
  // La fase 2 agrega `permisos` (lista `grupo:accion`); se guarda junto con la sesión.
  const permisos = data?.permisos ?? usuario.permisos;
  if (Array.isArray(permisos)) usuario.permisos = permisos; else delete usuario.permisos;
  const token = leerToken();
  if (token) guardarTokenYUsuario(token, usuario);
  return usuario;
}

export function cerrarSesion() {
  borrarSesion();
  return true;
}

export function guardarPendencia(clave, datos) {
  escribirSesion(CLAVES.sesionPendiente, { clave, datos, momento: Date.now() });
}
export function tienePendencia(clave) {
  const pendiente = leerSesion(CLAVES.sesionPendiente, null);
  return Boolean(pendiente) && (!clave || pendiente.clave === clave);
}
export function consumirPendencia(clave) {
  const pendiente = leerSesion(CLAVES.sesionPendiente, null);
  if (!pendiente) return null;
  if (clave && pendiente.clave !== clave) return null;
  sessionStorage.removeItem(CLAVES.sesionPendiente);
  return pendiente;
}
