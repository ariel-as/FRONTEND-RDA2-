import { escapar } from './componentes.view.js';

export function textoNoLeidas(n) {
  if (!n) return 'Notificaciones: ninguna sin leer';
  return `${n} notificaci${n === 1 ? 'ón' : 'ones'} sin leer`;
}

// Botón de campana con panel desplegable (patrón de divulgación, sin depender de Bootstrap).
export function campanaHtml(id = 'campana') {
  return `<div class="pf-campana" data-campana>
    <button type="button" class="pf-campana-boton" id="${id}-boton" aria-expanded="false" aria-controls="${id}-panel" data-campana-boton>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2Zm.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901Z"/></svg>
      <span class="visually-hidden sr-only" data-campana-texto>${textoNoLeidas(0)}</span>
      <span class="pf-campana-contador" data-campana-contador aria-hidden="true" hidden>0</span>
    </button>
    <div class="pf-campana-panel" id="${id}-panel" data-campana-panel hidden>
      <h2 class="pf-campana-titulo">Notificaciones</h2>
      <p class="pf-campana-estado" data-campana-estado role="status" aria-live="polite"></p>
      <ul class="pf-campana-lista" data-campana-lista aria-busy="false"></ul>
    </div>
  </div>`;
}

export function itemsCampanaHtml(lista) {
  if (!lista.length) return '<li class="pf-campana-vacio">No tienes notificaciones.</li>';
  return lista.map((n) => `<li class="pf-campana-item" data-leida="${n.leida ? 'S' : 'N'}">
    <p class="mb-1"><span class="pf-campana-marca">${n.leida ? 'Leída' : 'Nueva'}:</span> ${n.titulo ? `<strong>${escapar(n.titulo)}</strong> ` : ''}${escapar(n.mensaje)}</p>
    ${n.fecha ? `<p class="pf-campana-fecha mb-1">${escapar(new Date(n.fecha).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }))}</p>` : ''}
    ${n.leida ? '' : `<button type="button" class="pf-campana-leer" data-marcar-leida="${escapar(n.id)}">Marcar leída</button>`}
  </li>`).join('');
}
