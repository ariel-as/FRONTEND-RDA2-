// Backend publicado en Render. Es el único lugar donde se escribe la URL de la API.
export const API_BASE_URL = 'https://planeta-fitness-api.onrender.com/api/v1';
export const API_TIMEOUT_MS = 10000;
// Render duerme el servicio gratuito: la primera petición de la sesión puede tardar cerca de un minuto.
export const API_TIMEOUT_DESPERTAR_MS = 60000;
// Tiempo de espera antes de anunciar que el servidor se está despertando.
export const API_AVISO_DESPERTAR_MS = 2500;
