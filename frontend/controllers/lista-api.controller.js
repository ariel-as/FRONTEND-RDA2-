import { puede } from '../models/permisos.model.js';
import { lista as extraerLista } from '../models/fase2.model.js';
import { mostrarMensaje } from './validacion.controller.js';
import { abrirDialogo } from './dialogo.controller.js';
import { escapar } from '../views/componentes.view.js';
import { paginacionAdmin } from '../views/admin.view.js';
import { tablaHtml, detalleHtml } from '../views/lista-api.view.js';

/*
 * Lista reutilizable para las pantallas de la fase 2.
 * crearLista({ raiz, caption, cargar(params), columnas: [[titulo, fn]], acciones: (fila) => [{ texto, permiso, tono, etiqueta, ejecutar }],
 *              filtros: selector del formulario de filtros, paginar })
 * Los botones sin permiso no se muestran; el resultado de cada acción se anuncia en la región [data-mensaje].
 */
export function crearLista(opciones) {
  const raiz = typeof opciones.raiz === 'string' ? document.querySelector(opciones.raiz) : opciones.raiz;
  if (!raiz) return null;
  const cont = raiz.querySelector('[data-lista]') || raiz;
  const region = raiz.querySelector('[data-mensaje]') || document.querySelector('[data-mensaje]');
  const filtros = opciones.filtros ? document.querySelector(opciones.filtros) : null;
  // Los parámetros de la URL (?estado=R&canal=W) llenan los filtros con el mismo nombre.
  new URLSearchParams(location.search).forEach((valor, clave) => { const c = filtros?.querySelector(`[name="${CSS.escape(clave)}"]`); if (c && c.type !== 'checkbox') c.value = valor; });
  let pagina = 1;
  let filas = [];
  let accionesFila = [];

  const parametros = () => {
    const p = { ...(opciones.fijos || {}) };
    if (opciones.paginar !== false) Object.assign(p, { page: pagina, limit: opciones.limite || 20 });
    filtros?.querySelectorAll('[name]').forEach((c) => {
      if (c.type === 'checkbox') { if (c.checked) p[c.name] = c.value || 'S'; } else if (c.value) p[c.name] = c.value.trim();
    });
    return p;
  };

  async function recargar() {
    cont.setAttribute('aria-busy', 'true');
    try {
      const respuesta = await opciones.cargar(parametros());
      filas = (opciones.extraer || extraerLista)(respuesta);
      accionesFila = filas.map((f) => (opciones.acciones ? opciones.acciones(f).filter((a) => a && puede(a.permiso)) : []));
      const conAcciones = Boolean(opciones.acciones);
      cont.innerHTML = tablaHtml({
        caption: opciones.caption,
        columnas: opciones.columnas,
        filas,
        // Con más de dos acciones se muestra la primera y el resto queda en «Más acciones».
        acciones: conAcciones ? (f, i) => {
          const botones = accionesFila[i];
          const boton = (a, j) => `<button type="button" class="btn btn-sm ${a.tono || 'btn-outline-primary'} me-1 mb-1" data-fila="${i}" data-accion-lista="${j}"${a.etiqueta ? ` aria-label="${escapar(a.etiqueta)}"` : ''}>${escapar(a.texto)}</button>`;
          if (botones.length <= 2) return botones.map(boton).join('');
          return boton(botones[0], 0) + `<button type="button" class="btn btn-sm btn-outline-secondary mb-1" data-fila="${i}" data-mas-acciones aria-haspopup="dialog">Más acciones<span class="visually-hidden"> (${botones.length - 1})</span></button>`;
        } : null
      }) + (opciones.paginar === false ? '' : paginacionAdmin({ page: respuesta?.pagination?.page || pagina, totalPages: respuesta?.pagination?.totalPages || 1 }));
      opciones.alCargar?.(respuesta, filas);
    } catch (error) {
      cont.innerHTML = '';
      mostrarMensaje(region, error.mensaje || 'No se pudo cargar la lista.', 'error');
    } finally {
      cont.setAttribute('aria-busy', 'false');
    }
  }

  cont.addEventListener('click', async (evento) => {
    const pag = evento.target.closest('[data-page]');
    if (pag && !pag.disabled) { pagina = Number(pag.dataset.page) || 1; recargar(); return; }
    const mas = evento.target.closest('[data-mas-acciones]');
    if (mas) { elegirAccion(Number(mas.dataset.fila)); return; }
    const boton = evento.target.closest('[data-accion-lista]');
    if (!boton) return;
    const accion = accionesFila[Number(boton.dataset.fila)]?.[Number(boton.dataset.accionLista)];
    if (!accion) return;
    try {
      const mensaje = await accion.ejecutar(filas[Number(boton.dataset.fila)]);
      if (mensaje) { mostrarMensaje(region, mensaje, 'exito'); await recargar(); }
    } catch (error) {
      mostrarMensaje(region, error.mensaje || 'No se pudo completar la acción.', 'error');
    }
  });
  // Menú de acciones en un diálogo (no se recorta dentro de la tabla con desplazamiento).
  async function elegirAccion(i) {
    const botones = accionesFila[i] || [];
    let elegida = null;
    await abrirDialogo({
      titulo: 'Acciones', textoConfirmar: 'Cerrar', textoCancelar: 'Volver',
      contenido: `<div class="d-grid gap-2">${botones.map((a, j) => `<button type="button" class="btn ${a.tono || 'btn-outline-primary'}" data-elegir="${j}">${escapar(a.texto)}</button>`).join('')}</div>`,
      alPreparar: (form, dialogo) => form.querySelectorAll('[data-elegir]').forEach((b) => b.addEventListener('click', () => { elegida = botones[Number(b.dataset.elegir)]; dialogo.close(); }))
    });
    if (!elegida) return;
    try {
      const mensaje = await elegida.ejecutar(filas[i]);
      if (mensaje) { mostrarMensaje(region, mensaje, 'exito'); await recargar(); }
    } catch (error) { mostrarMensaje(region, error.mensaje || 'No se pudo completar la acción.', 'error'); }
  }
  filtros?.addEventListener('submit', (e) => { e.preventDefault(); pagina = 1; recargar(); });
  filtros?.addEventListener('change', (e) => { if (e.target.matches('select, input[type="checkbox"], input[type="date"]')) { pagina = 1; recargar(); } });
  recargar();
  return { recargar, region };
}

// Diálogo de formulario: abre, envía con alConfirmar y devuelve el mensaje de éxito (o null si se canceló).
export async function formulario({ titulo, mensaje, campos, contenido, textoConfirmar = 'Guardar', tono = 'primario', reglas, alPreparar, validarExtra, alConfirmar, alFallar, exito }) {
  const r = await abrirDialogo({ titulo, mensaje, campos, contenido, textoConfirmar, tono, reglas, alPreparar, validarExtra, alConfirmar, alFallar });
  return r ? (typeof exito === 'function' ? exito(r.resultado, r.valores) : exito) : null;
}

// Muestra el detalle completo que devuelve el servidor.
export async function verDetalle(titulo, cargar, extra = '') {
  const datos = await cargar();
  await abrirDialogo({ titulo, contenido: `${extra}<div class="pf-detalle">${detalleHtml(datos?.data ?? datos)}</div>`, textoConfirmar: 'Cerrar', textoCancelar: 'Volver' });
  return null;
}

export function enlazarBoton(selector, permiso, alClic, region) {
  document.querySelectorAll(selector).forEach((boton) => {
    boton.hidden = !puede(permiso);
    boton.addEventListener('click', async () => {
      try { const m = await alClic(); if (m) mostrarMensaje(region || document.querySelector('[data-mensaje]'), m, 'exito'); }
      catch (error) { mostrarMensaje(region || document.querySelector('[data-mensaje]'), error.mensaje || 'No se pudo completar la acción.', 'error'); }
    });
  });
}
