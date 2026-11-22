import { escapar } from './componentes.view.js';

function slug(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function esActual(entrada, actual) {
  const [archivo, ancla] = entrada.pagina.split('#');
  return archivo === actual.archivo && (ancla || '') === actual.ancla;
}

// Pinta el menú agrupado del panel. Cada grupo es un desplegable de Bootstrap.
export function pintarMenuAdmin(contenedor, { inicio, grupos, actual }) {
  if (!contenedor) return;
  const inicioActual = esActual(inicio, actual);
  const enlaceInicio = `<li class="nav-item"><a class="nav-link${inicioActual ? ' active' : ''}" href="${escapar(inicio.pagina)}"${inicioActual ? ' aria-current="page"' : ''}>${escapar(inicio.texto)}</a></li>`;
  const bloques = grupos.map(({ grupo, entradas }) => {
    const id = `menu-grupo-${slug(grupo)}`;
    const contieneActual = entradas.some((e) => esActual(e, actual));
    const items = entradas.map((e) => {
      const activo = esActual(e, actual);
      return `<li><a class="dropdown-item${activo ? ' active' : ''}" href="${escapar(e.pagina)}"${activo ? ' aria-current="page"' : ''}>${escapar(e.texto)}</a></li>`;
    }).join('');
    return `<li class="nav-item dropdown">
      <button type="button" class="nav-link dropdown-toggle${contieneActual ? ' active' : ''}" id="${id}" data-bs-toggle="dropdown" aria-expanded="false">${escapar(grupo)}${contieneActual ? '<span class="visually-hidden"> (sección actual)</span>' : ''}</button>
      <ul class="dropdown-menu" aria-labelledby="${id}">${items}</ul>
    </li>`;
  }).join('');
  contenedor.innerHTML = enlaceInicio + bloques;
}

// Reemplaza visualmente el contenido de la página cuando el usuario no tiene permiso.
export function pintarSinAcceso(main) {
  if (!main) return;
  [...main.children].forEach((hijo) => { hijo.hidden = true; });
  main.insertAdjacentHTML('afterbegin', `<section class="pf-sin-acceso card shadow-sm" aria-labelledby="titulo-sin-acceso" data-sin-acceso>
    <div class="card-body">
      <h1 id="titulo-sin-acceso" class="h3" tabindex="-1">No tienes acceso a esta pantalla</h1>
      <p class="mb-3">Tu rol no tiene permiso para usar esta sección del panel. Si crees que es un error, consulta con el administrador.</p>
      <a class="btn btn-primary" href="index.html">Volver al dashboard</a>
    </div>
  </section>`);
  // Un solo h1 visible: el de la pantalla bloqueada queda oculto junto con su contenido.
  main.querySelector('[data-sin-acceso] h1')?.focus?.();
}

// Aviso para pantallas cuyo servicio todavía no está publicado en el servidor.
export function avisoDisponiblePronto(descripcion = '') {
  return `<div class="alert alert-info pf-disponible-pronto" role="note">
    <p class="fw-bold mb-1">Disponible pronto</p>
    <p class="mb-0">${escapar(descripcion || 'Esta función se activará cuando el servidor publique el servicio correspondiente.')}</p>
  </div>`;
}
