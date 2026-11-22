// Único lugar donde se escribe la URL de la API.
// En el equipo de desarrollo (localhost o 127.0.0.1) se usa el backend local; en cualquier otro sitio, Render.
export const API_URL_PRODUCCION = 'https://planeta-fitness-api.onrender.com/api/v1';
export const API_URL_LOCAL = 'http://localhost:5050/api/v1';
const host = globalThis.location?.hostname || '';
export const ES_LOCAL = host === 'localhost' || host === '127.0.0.1';
export const API_BASE_URL = ES_LOCAL ? API_URL_LOCAL : API_URL_PRODUCCION;
export const API_TIMEOUT_MS = 10000;
// Render duerme el servicio gratuito: la primera petición de la sesión puede tardar cerca de un minuto.
export const API_TIMEOUT_DESPERTAR_MS = 60000;
// Tiempo de espera antes de anunciar que el servidor se está despertando.
export const API_AVISO_DESPERTAR_MS = 2500;
