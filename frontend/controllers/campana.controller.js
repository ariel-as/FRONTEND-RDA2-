import { notificacionesModel } from '../models/notificaciones.model.js';
import { funcionDisponible } from '../models/funciones.model.js';
import { campanaHtml, itemsCampanaHtml, textoNoLeidas } from '../views/campana.view.js';

/*
 * Campana de notificaciones para la cabecera del panel y de la web del cliente.
 * Solo se muestra cuando el backend publica GET /notificaciones
 * (FUNCIONES_SERVIDOR.notificaciones); mientras tanto no hace ninguna petición.
 */
export function iniciarCampana(contenedor, { id = 'campana', alInicio = false } = {}) {
  if (!contenedor || !funcionDisponible('notificaciones') || contenedor.querySelector('[data-campana]')) return null;
  contenedor.insertAdjacentHTML(alInicio ? 'afterbegin' : 'beforeend', campanaHtml(id));
  const raiz = contenedor.querySelector('[data-campana]');
  const boton = raiz.querySelector('[data-campana-boton]');
  const panel = raiz.querySelector('[data-campana-panel]');
  const lista = raiz.querySelector('[data-campana-lista]');
  const estado = raiz.querySelector('[data-campana-estado]');
  let datos = [];

  function pintarContador() {
    const n = datos.filter((d) => !d.leida).length;
    raiz.querySelector('[data-campana-texto]').textContent = textoNoLeidas(n);
    const contador = raiz.querySelector('[data-campana-contador]');
    contador.textContent = String(n);
    contador.hidden = n === 0;
  }

  async function cargar() {
    lista.setAttribute('aria-busy', 'true');
    try {
      datos = await notificacionesModel.listar({ limit: 20 });
      lista.innerHTML = itemsCampanaHtml(datos);
      estado.textContent = '';
    } catch (error) {
      estado.textContent = error.mensaje || 'No se pudieron cargar las notificaciones.';
    } finally {
      lista.setAttribute('aria-busy', 'false');
      pintarContador();
    }
  }

  const abrir = (valor) => {
    boton.setAttribute('aria-expanded', String(valor));
    panel.hidden = !valor;
  };
  boton.addEventListener('click', () => {
    const abierto = boton.getAttribute('aria-expanded') === 'true';
    abrir(!abierto);
    if (!abierto) cargar();
  });
  raiz.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { abrir(false); boton.focus(); }
  });
  document.addEventListener('click', (e) => { if (!raiz.contains(e.target)) abrir(false); });
  lista.addEventListener('click', async (e) => {
    const marcar = e.target.closest('[data-marcar-leida]');
    if (!marcar) return;
    marcar.disabled = true;
    try {
      await notificacionesModel.marcarLeida(marcar.dataset.marcarLeida);
      const item = datos.find((d) => String(d.id) === marcar.dataset.marcarLeida);
      if (item) item.leida = true;
      lista.innerHTML = itemsCampanaHtml(datos);
      estado.textContent = 'Notificación marcada como leída.';
      pintarContador();
      boton.focus();
    } catch (error) {
      marcar.disabled = false;
      estado.textContent = error.mensaje || 'No se pudo marcar la notificación.';
    }
  });

  cargar();
  return { recargar: cargar };
}
