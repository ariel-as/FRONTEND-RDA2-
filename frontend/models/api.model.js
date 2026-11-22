import { API_BASE_URL, API_TIMEOUT_MS, API_TIMEOUT_DESPERTAR_MS, API_AVISO_DESPERTAR_MS } from './config.js';
import { leerToken, borrarSesion, leerSesion, escribirSesion, CLAVES } from './storage.model.js';

class ApiError extends Error {
  constructor({ status = 0, mensaje = 'Error de red', detalles = null, correlationId = null }) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.mensaje = mensaje;
    this.detalles = detalles;
    this.correlationId = correlationId;
  }
}

// Cuando una pantalla se bloquea por permisos no debe salir ninguna petición.
let bloqueada = false;

async function request(path, { method = 'GET', body, requiereSesion = false, headers = {} } = {}) {
  if (bloqueada) {
    throw new ApiError({ status: 403, mensaje: 'No tienes acceso a esta pantalla.' });
  }
  const token = leerToken();
  if (requiereSesion && !token) {
    throw new ApiError({ status: 401, mensaje: 'Debes iniciar sesión para continuar.' });
  }

  // La primera petición de la sesión espera hasta 60 s porque Render puede estar dormido.
  const despertando = !leerSesion(CLAVES.servidorListo, false);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), despertando ? API_TIMEOUT_DESPERTAR_MS : API_TIMEOUT_MS);
  const avisoId = despertando
    ? setTimeout(() => window.dispatchEvent(new CustomEvent('pf:servidor-despertando')), API_AVISO_DESPERTAR_MS)
    : null;
  const terminarDespertar = (listo) => {
    if (!despertando) return;
    clearTimeout(avisoId);
    if (listo) escribirSesion(CLAVES.servidorListo, true);
    window.dispatchEvent(new CustomEvent('pf:servidor-listo'));
  };
  const finalHeaders = { Accept: 'application/json', ...headers };

  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeoutId);
    terminarDespertar(false);
    if (error?.name === 'AbortError') {
      throw new ApiError({ status: 0, mensaje: 'El servidor tardó demasiado en responder. Inténtalo de nuevo.' });
    }
    throw new ApiError({ status: 0, mensaje: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' });
  }
  clearTimeout(timeoutId);
  terminarDespertar(true);

  if (response.status === 204) return null;

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { data = await response.json(); } catch { data = null; }
  } else {
    try { data = await response.text(); } catch { data = null; }
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      borrarSesion();
      window.dispatchEvent(new CustomEvent('pf:sesion-expirada'));
    }
    let mensaje = data?.mensaje || 'Ocurrió un error.';
    if (response.status >= 500) {
      mensaje = 'Ocurrió un error en el servidor. Inténtalo más tarde.';
    } else if (response.status === 401 && !data?.mensaje) {
      mensaje = 'Tu sesión no es válida o ha expirado.';
    } else if (response.status === 403 && !data?.mensaje) {
      mensaje = 'Tu cuenta no tiene permiso para realizar esta acción.';
    } else if (response.status === 404 && !data?.mensaje) {
      mensaje = 'No se encontró el recurso solicitado.';
    } else if (response.status === 429 && !data?.mensaje) {
      mensaje = 'Espera unos minutos y vuelve a probar.';
    }
    throw new ApiError({
      status: response.status,
      mensaje,
      detalles: data?.detalles || null,
      correlationId: data?.correlationId || null
    });
  }

  return data;
}

export const api = {
  get: (path, opciones) => request(path, { ...opciones, method: 'GET' }),
  post: (path, body, opciones) => request(path, { ...opciones, method: 'POST', body }),
  put: (path, body, opciones) => request(path, { ...opciones, method: 'PUT', body }),
  patch: (path, body, opciones) => request(path, { ...opciones, method: 'PATCH', body }),
  delete: (path, opciones) => request(path, { ...opciones, method: 'DELETE' }),
  bloquear: () => { bloqueada = true; },
  ApiError
};
