import { escapar } from './componentes.view.js';

/*
 * Cabecera única del sitio público (index.html y cliente/*.html).
 * Secciones, tema, campana, menú de cuenta y carrito. La genera
 * comunes.controller.js en todas las páginas para que no se desalinee.
 */
const SECCIONES = [['inicio', 'Inicio'], ['planes', 'Planes'], ['tienda', 'Tienda'], ['clases', 'Clases'], ['rutinas', 'Rutinas'], ['nutricion', 'Nutrición'], ['contacto', 'Contacto']];

// prefijo: ruta a la raíz del sitio ('' en index.html, '../' en cliente/); pagina: data-pagina de la página actual.
export function cabeceraSitioHtml({ prefijo = '', pagina = '', usuario = null, esPersonal = false }) {
  const enInicio = pagina === 'inicio';
  const destino = (id) => {
    if (id === 'nutricion' && !enInicio) return `${prefijo}cliente/nutricion.html`;
    return enInicio ? `#${id}` : `${prefijo}index.html#${id}`;
  };
  const enlaces = SECCIONES.map(([id, texto]) => {
    const actual = id === 'nutricion' && pagina === 'nutricion';
    return `<li><a href="${destino(id)}" class="pf-enlace${actual ? ' pf-enlace-activo' : ''}"${actual ? ' aria-current="page"' : ''}>${texto}</a></li>`;
  }).join('');
  const nombre = String(usuario?.nombre || usuario?.login || '').trim().split(/\s+/)[0];
  const opcionesCuenta = esPersonal
    ? `<li><a class="pf-cuenta-opcion" href="${prefijo}admin/index.html">Ir al panel administrativo</a></li>`
    : `<li><a class="pf-cuenta-opcion" href="${prefijo}cliente/mi-cuenta.html"${pagina === 'mi-cuenta' ? ' aria-current="page"' : ''}>Mi cuenta</a></li><li><a class="pf-cuenta-opcion" href="${prefijo}cliente/mis-pedidos.html"${pagina === 'mis-pedidos' ? ' aria-current="page"' : ''}>Mis pedidos</a></li>`;
  const sesion = usuario
    ? `<span class="pf-campana-sitio" data-campana-sitio></span><div class="pf-cuenta" data-cuenta>
        <button type="button" class="pf-boton pf-boton-secundario pf-cuenta-boton" id="boton-cuenta" aria-expanded="false" aria-controls="menu-cuenta" aria-label="Menú de la cuenta de ${escapar(nombre || 'usuario')}" data-cuenta-boton>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0-2.2-2.7-4-6-4s-6 1.8-6 4v1h12v-1ZM3.1 12c.4-1.4 2.3-2.5 4.9-2.5s4.5 1.1 4.9 2.5H3.1Z"/></svg>
        </button>
        <div class="pf-cuenta-panel" id="menu-cuenta" data-cuenta-panel hidden>
          <p class="pf-cuenta-saludo">Hola, <span data-nombre-sesion>${escapar(nombre)}</span></p>
          <ul class="pf-cuenta-lista">${opcionesCuenta}<li><button type="button" class="pf-cuenta-opcion" data-cerrar-sesion>Cerrar sesión</button></li></ul>
        </div>
      </div>`
    : `<a href="${prefijo}cliente/login.html" class="pf-boton pf-boton-secundario"${pagina === 'login' ? ' aria-current="page"' : ''}>Inscríbete</a>`;
  return `<nav class="pf-nav mx-auto max-w-6xl px-4" aria-label="Navegación principal">
      <a href="${enInicio ? '#inicio' : `${prefijo}index.html`}" class="pf-logo" aria-label="Planeta Fitness, ir al inicio">
        <picture><source type="image/webp" srcset="${prefijo}assets/img/logo/logo-planeta-compact.webp"><img src="${prefijo}assets/img/logo/logo-planeta.png" alt="Planeta Fitness" width="112" height="101"></picture>
      </a>
      <div id="menu-principal" data-menu class="pf-menu">
        <ul class="pf-menu-lista">${enlaces}</ul>
        <div class="pf-menu-acciones" data-acciones-sitio>
          <button type="button" class="pf-boton pf-boton-secundario pf-boton-tema" data-boton-tema aria-label="Cambiar el modo de color"><span aria-hidden="true" data-icono-tema>&#9790;</span></button>
          ${sesion}
        </div>
      </div>
      <button type="button" class="pf-boton pf-boton-primario pf-carrito" data-abrir-carrito aria-label="Carrito de compras, vacío" aria-expanded="false" aria-controls="panel-carrito"><span aria-hidden="true">&#128722;</span><span class="pf-carrito-texto">Carrito</span><span class="pf-carrito-contador" data-contador-carrito>0</span></button>
      <button type="button" class="pf-boton pf-boton-secundario pf-menu-boton" data-menu-boton aria-label="Abrir menú de navegación" aria-expanded="false" aria-controls="menu-principal"><span aria-hidden="true">&#9776;</span> <span class="pf-menu-boton-texto">Menú</span></button>
    </nav>`;
}
