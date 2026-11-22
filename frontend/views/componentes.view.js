import { formatearPrecio, contarArticulos } from '../models/carrito.model.js';
import { raizSitio } from '../models/storage.model.js';

export function escapar(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function rutaArchivo(ruta) {
  if (!ruta) return '';
  if (/^(https?:|data:)/.test(ruta)) return ruta;
  return new URL(ruta, raizSitio()).href;
}

export function etiquetaIva(porcentaje) {
  return Number(porcentaje ?? 1) === 0 ? 'IVA 0%' : 'IVA incluido';
}


const IMAGENES_WEBP = new Set([
  'clases/bailoterapia.jpg',
  'entrenadores/entrenador-1.jpg',
  'entrenadores/entrenador-2.jpg',
  'entrenadores/entrenador-3.jpg',
  'gimnasio/cardio.jpg',
  'gimnasio/hero-gimnasio.jpg',
  'gimnasio/nutricion.jpg',
  'productos/buzo-compresion.jpg',
  'productos/straps.jpg'
]);

function rutaWebp(ruta) {
  const valor = String(ruta || '');
  const relativo = valor.split('/assets/img/').pop()?.replace(/^assets\/img\//, '');
  if (!IMAGENES_WEBP.has(relativo)) return '';
  return rutaArchivo(valor.replace(/\.jpe?g$/i, '.webp'));
}

function imagenConWebp(ruta, atributos) {
  const webp = rutaWebp(ruta);
  const fuente = webp ? `<source type="image/webp" srcset="${escapar(webp)}">` : '';
  return `<picture class="pf-imagen-picture">${fuente}<img ${atributos} src="${escapar(rutaArchivo(ruta))}"></picture>`;
}

export function tarjetaProducto(producto) {
  const disponible = producto.disponible !== false && Number(producto.stock ?? 0) > 0;
  const boton = disponible
    ? `<button type="button" class="pf-boton pf-boton-primario w-full" data-accion="agregar" data-id="${escapar(producto.id)}" aria-label="Agregar al carrito: ${escapar(producto.nombre)}, precio ${formatearPrecio(producto.precio)}">Agregar al carrito</button>`
    : `<button type="button" class="pf-boton pf-boton-primario w-full" disabled aria-disabled="true">Agotado</button>`;
  return `
    <article class="pf-tarjeta h-full flex flex-col overflow-hidden" data-producto="${escapar(producto.id)}">
      ${imagenConWebp(producto.imagen, `class="pf-imagen-tarjeta" alt="${escapar(producto.nombre)} de Planeta Fitness" loading="lazy" width="600" height="600"`)}
      <div class="flex flex-col gap-3 p-5 flex-1">
        <p class="pf-etiqueta">${escapar(producto.categoria || producto.categoriaId || '')}</p>
        <h4 class="text-lg font-bold text-white">${escapar(producto.nombre)}</h4>
        <p class="text-sm text-neutral-300 flex-1">${escapar(producto.descripcion || '')}</p>
        <div>
          <p class="text-2xl font-extrabold pf-precio">${formatearPrecio(producto.precio)}</p>
          <p class="text-xs text-neutral-400">${etiquetaIva(producto.porcentajeIva)}</p>
        </div>
        ${boton}
      </div>
    </article>`;
}

function generarSlug(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'categoria';
}

export function seccionCategoriaTienda({ categoria, productos }) {
  const slug = generarSlug(categoria);
  return `
    <section class="pf-tienda-categoria" aria-labelledby="categoria-${slug}">
      <h3 id="categoria-${slug}" class="pf-tienda-titulo">${escapar(categoria)}</h3>
      <div class="pf-tienda-grid">${productos.map(tarjetaProducto).join('')}</div>
    </section>`;
}

export function tarjetaPlan(plan) {
  const beneficios = (plan.beneficios || []).map((b) => `
        <li class="flex items-start gap-2 text-sm text-neutral-300"><span aria-hidden="true" class="font-bold text-pf-amarillo">✓</span><span>${escapar(b)}</span></li>`).join('');
  return `
    <article class="pf-tarjeta h-full flex flex-col overflow-hidden" data-plan="${escapar(plan.id)}">
      ${imagenConWebp(plan.imagen, `class="pf-imagen-tarjeta" alt="${escapar(plan.nombre)} de Planeta Fitness" loading="lazy" width="600" height="450"`)}
      <div class="flex flex-col gap-4 p-6 flex-1">
        <h3 class="text-xl font-bold text-white">${escapar(plan.nombre)}</h3>
        <p class="text-sm text-neutral-300">${escapar(plan.descripcion || '')}</p>
        <p class="text-3xl font-extrabold pf-precio">${formatearPrecio(plan.precio)} <span class="text-sm font-semibold text-neutral-300">/ mes</span></p>
        <p class="text-xs text-neutral-400">${etiquetaIva(plan.porcentajeIva)}</p>
        <h4 class="text-sm font-bold uppercase tracking-wide text-pf-amarillo">Incluye</h4>
        <ul class="space-y-1 flex-1">${beneficios}</ul>
        <button type="button" class="pf-boton pf-boton-primario w-full" data-accion="elegir-plan" data-plan-id="${escapar(plan.id)}" data-plan-nombre="${escapar(plan.nombre)}" data-plan-precio="${escapar(plan.precio)}" aria-label="Elegir plan: ${escapar(plan.nombre)}, ${formatearPrecio(plan.precio)} al mes">Elegir plan</button>
      </div>
    </article>`;
}

export function tarjetaServicio(servicio) {
  return `
    <article class="pf-tarjeta h-full flex flex-col overflow-hidden">
      ${imagenConWebp(servicio.imagen, `class="pf-imagen-tarjeta" alt="${escapar(servicio.nombre)} en Planeta Fitness" loading="lazy" width="600" height="450"`)}
      <div class="flex flex-col gap-2 p-5 flex-1">
        <h4 class="text-lg font-bold text-white">${escapar(servicio.nombre)}</h4>
        <p class="text-sm text-neutral-300">${escapar(servicio.descripcion || '')}</p>
      </div>
    </article>`;
}

export function tarjetaClase(clase, entrenador) {
  const horarios = (clase.horarios || []).map((h) => `
        <li class="pf-clase-horario"><span class="pf-clase-dia">${escapar(h.dia)}</span><span class="pf-clase-hora">${escapar(h.horaInicio)}${h.horaFin ? ` – ${escapar(h.horaFin)}` : ''}</span></li>`).join('');
  const nombreEntrenador = entrenador ? (entrenador.nombre || `${entrenador.nombres || ''} ${entrenador.apellidos || ''}`.trim()) : (clase.entrenador?.nombre || 'Por confirmar');
  return `
    <article class="pf-clase" data-clase="${escapar(clase.id)}">
      ${imagenConWebp(clase.imagen, `class="pf-clase-imagen" alt="Clase de ${escapar(clase.nombre)} en Planeta Fitness" loading="lazy" width="800" height="450"`)}
      <div class="pf-clase-cuerpo">
        <h3 class="pf-clase-nombre">${escapar(clase.nombre)}</h3>
        <p class="pf-clase-descripcion">${escapar(clase.descripcion || '')}</p>
        <ul class="pf-clase-horarios">${horarios}</ul>
        <dl class="pf-clase-meta">
          <div class="pf-clase-meta-fila"><dt>Lugar</dt><dd>${escapar(clase.lugar || 'Gimnasio')}</dd></div>
          <div class="pf-clase-meta-fila"><dt>Entrenador</dt><dd>${escapar(nombreEntrenador)}</dd></div>
        </dl>
      </div>
    </article>`;
}

export function tarjetaEntrenador(entrenador) {
  const nombre = entrenador.nombre || `${entrenador.nombres || ''} ${entrenador.apellidos || ''}`.trim();
  return `
    <article class="pf-tarjeta h-full flex flex-col overflow-hidden" data-entrenador="${escapar(entrenador.id)}">
      ${imagenConWebp(entrenador.imagen, `class="pf-imagen-tarjeta object-cover" alt="${escapar(nombre)} de Planeta Fitness" loading="lazy" width="560" height="747"`)}
      <div class="flex flex-col gap-2 p-5 flex-1">
        <h4 class="text-lg font-bold text-white">${escapar(nombre)}</h4>
        <p class="pf-etiqueta self-start">${escapar(entrenador.especialidad || 'Entrenador')}</p>
        <p class="text-sm text-neutral-300">${escapar(entrenador.descripcion || '')}</p>
      </div>
    </article>`;
}

export function renderizar(contenedor, tarjetas) { if (contenedor) contenedor.innerHTML = tarjetas.join(''); }
export function vacio(mensaje = 'No hay información disponible por ahora.') { return `<p class="pf-mensaje w-full">${escapar(mensaje)}</p>`; }

export function actualizarContadorCarrito(articulos = contarArticulos()) {
  document.querySelectorAll('[data-contador-carrito]').forEach((elemento) => {
    elemento.textContent = articulos;
    const contenedor = elemento.closest('a') || elemento.closest('button');
    if (contenedor) {
      contenedor.setAttribute('aria-label', articulos === 0 ? 'Carrito: 0 productos, vacío' : `Carrito: ${articulos} producto${articulos === 1 ? '' : 's'}`);
    }
  });
}

export function actualizarEstadoSesion(usuario) {
  document.querySelectorAll('[data-sesion]').forEach((bloque) => {
    const mostrar = bloque.dataset.sesion === (usuario ? 'activa' : 'inactiva');
    bloque.hidden = !mostrar;
  });
  document.querySelectorAll('[data-nombre-sesion]').forEach((elemento) => {
    elemento.textContent = usuario ? String(usuario.nombre || usuario.login || '').trim().split(/\s+/)[0] : '';
  });
}

export function mostrarAviso(mensaje, tipo = 'info') {
  const aviso = document.querySelector('[data-aviso]');
  if (!aviso) return;
  aviso.textContent = mensaje;
  aviso.dataset.tipo = tipo;
  aviso.hidden = false;
  aviso.classList.add('pf-aparece');
  window.clearTimeout(aviso.dataset.timer);
  aviso.dataset.timer = window.setTimeout(() => { aviso.hidden = true; aviso.classList.remove('pf-aparece'); }, 4000);
}
