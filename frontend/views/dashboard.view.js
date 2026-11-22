import { escapar } from './componentes.view.js';

// Accesos directos a las pantallas que el rol puede usar (salen del mismo menú).
export function accesosDirectosHtml(grupos) {
  if (!grupos.length) return '<p class="mb-0 text-body-secondary">Todavía no tienes pantallas asignadas.</p>';
  return grupos.map(({ grupo, entradas }) => `<div class="col-12 col-md-6 col-xl-4"><h3 class="h6">${escapar(grupo)}</h3><ul class="list-unstyled mb-0">${entradas.map((e) => `<li><a class="d-inline-block py-1" href="${escapar(e.pagina)}">${escapar(e.texto)}</a></li>`).join('')}</ul></div>`).join('');
}

// Tarjeta de indicador; "pronto" queda para indicadores sin servicio en el servidor.
export function indicadorHtml({ titulo, valor, pronto = false, enlace }) {
  const contenido = pronto
    ? '<p class="fw-semibold mb-0">Disponible pronto</p>'
    : `<p class="display-6 fw-bold mb-0">${escapar(valor ?? '—')}</p>`;
  const pie = enlace && !pronto ? `<a class="small" href="${escapar(enlace)}">Ver detalle<span class="visually-hidden">: ${escapar(titulo)}</span></a>` : '';
  return `<div class="col-6 col-lg-3"><div class="card h-100 shadow-sm"><div class="card-body"><p class="text-body-secondary small mb-1">${escapar(titulo)}</p>${contenido}${pie}</div></div></div>`;
}
