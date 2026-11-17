export const CLAVES = {
  carrito: 'carrito',
  preferencias: 'preferencias',
  cookieAviso: 'pf_aviso_cookies',
  ultimaActualizacion: 'ultimaActualizacion',
  sesionUsuario: 'usuario',
  sesionToken: 'pf_token',
  sesionPendiente: 'sesionPendiente',
  borradorFormulario: 'pf_borrador_formulario',
  tema: 'pf_tema'
};

export function raizSitio() {
  const url = new URL('.', document.baseURI);
  if (/(cliente|admin)\/$/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/(cliente|admin)\/$/, '');
  }
  return url.href;
}

export function leerLocal(clave, valorPorDefecto = null) {
  try {
    const crudo = localStorage.getItem(clave);
    if (crudo === null) return valorPorDefecto;
    return JSON.parse(crudo);
  } catch (error) {
    console.warn(`No se pudo leer "${clave}" de localStorage:`, error);
    return valorPorDefecto;
  }
}

export function escribirLocal(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    console.warn(`No se pudo escribir "${clave}" en localStorage:`, error);
    return false;
  }
}

export function leerSesion(clave, valorPorDefecto = null) {
  try {
    const crudo = sessionStorage.getItem(clave);
    if (crudo === null) return valorPorDefecto;
    return JSON.parse(crudo);
  } catch (error) {
    console.warn(`No se pudo leer "${clave}" de sessionStorage:`, error);
    return valorPorDefecto;
  }
}

export function escribirSesion(clave, valor) {
  try {
    sessionStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    console.warn(`No se pudo escribir "${clave}" en sessionStorage:`, error);
    return false;
  }
}

export function borrarSesionClave(clave) {
  try {
    sessionStorage.removeItem(clave);
  } catch (error) {
    console.warn(`No se pudo borrar "${clave}" de sessionStorage:`, error);
  }
}

function decodificarPayloadJwt(token) {
  try {
    const [, payload] = String(token || '').split('.');
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function guardarTokenYUsuario(token, usuario) {
  if (token) escribirSesion(CLAVES.sesionToken, token);
  if (usuario) escribirSesion(CLAVES.sesionUsuario, usuario);
}

export function leerToken() {
  const token = leerSesion(CLAVES.sesionToken, null);
  if (!token) return null;
  const payload = decodificarPayloadJwt(token);
  if (payload?.exp && Date.now() >= payload.exp * 1000) {
    borrarSesion();
    return null;
  }
  return token;
}

export function leerUsuarioGuardado() {
  return leerSesion(CLAVES.sesionUsuario, null);
}

export function borrarSesion() {
  borrarSesionClave(CLAVES.sesionToken);
  borrarSesionClave(CLAVES.sesionUsuario);
  borrarSesionClave(CLAVES.sesionPendiente);
}

export function escribirCookie(nombre, valor, dias = 30) {
  const fecha = new Date();
  fecha.setTime(fecha.getTime() + dias * 24 * 60 * 60 * 1000);
  const segura = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${nombre}=${encodeURIComponent(valor)};expires=${fecha.toUTCString()};path=/;SameSite=Lax${segura}`;
}

export function leerCookie(nombre) {
  const objetivo = `${nombre}=`;
  const partes = document.cookie.split(';');
  for (const parte of partes) {
    const limpia = parte.trim();
    if (limpia.startsWith(objetivo)) {
      return decodeURIComponent(limpia.slice(objetivo.length));
    }
  }
  return null;
}

export function registrarActualizacion() {
  const marca = new Date().toISOString();
  escribirCookie(CLAVES.ultimaActualizacion, marca, 7);
  return marca;
}

export function leerActualizacion() {
  return leerCookie(CLAVES.ultimaActualizacion);
}

export function formatearFecha(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 'sin registro';
  return fecha.toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}
