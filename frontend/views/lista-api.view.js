import { escapar } from './componentes.view.js';
import { formatearPrecio } from '../models/carrito.model.js';

// Formatos comunes para las pantallas de la fase 2 (texto siempre visible, nunca solo color).
export const vacioTxt = '<span class="text-body-secondary">vacío</span>';
export const txt = (v) => (v === null || v === undefined || v === '' ? vacioTxt : escapar(v));
export const dinero = (v) => (v === null || v === undefined || v === '' ? vacioTxt : formatearPrecio(v));
export function fecha(v, conHora = false) {
  if (!v) return vacioTxt;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return escapar(v);
  return escapar(conHora ? d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : d.toLocaleDateString('es-EC', { timeZone: 'UTC' }));
}
export const estado = (mapa, v) => `<span class="pf-estado" data-estado="${escapar(v ?? '')}">${escapar(mapa[v] || v || 'vacío')}</span>`;
export const nombrePersona = (p) => (p ? [p.nombre, p.apellido].filter(Boolean).join(' ') || p.id || '' : '');

export function tablaHtml({ caption, columnas, filas, acciones }) {
  const head = `<tr>${columnas.map(([t]) => `<th scope="col">${escapar(t)}</th>`).join('')}${acciones ? '<th scope="col">Acciones</th>' : ''}</tr>`;
  const cuerpo = filas.length ? filas.map((f, i) => `<tr>${columnas.map(([, fn], j) => (j === 0 ? `<th scope="row">${fn(f)}</th>` : `<td>${fn(f)}</td>`)).join('')}${acciones ? `<td class="text-nowrap">${acciones(f, i) || '<span class="text-body-secondary">Sin acciones</span>'}</td>` : ''}</tr>`).join('')
    : `<tr><td colspan="${columnas.length + (acciones ? 1 : 0)}" class="text-center text-body-secondary">No hay registros.</td></tr>`;
  return `<div class="table-responsive"><table class="table table-hover align-middle"><caption class="visually-hidden">${escapar(caption)}</caption><thead class="table-light">${head}</thead><tbody>${cuerpo}</tbody></table></div>`;
}

const ETIQUETA = (k) => String(k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/Id$/, '').replace(/^./, (c) => c.toUpperCase());
const esFecha = (k, v) => typeof v === 'string' && /^(fecha|hora|created|updated)/i.test(k) && !Number.isNaN(Date.parse(v));
const valor = (k, v) => (v === null || v === undefined || v === '' ? vacioTxt : esFecha(k, v) ? fecha(v, /T\d\d:\d\d/.test(v) && !/T00:00:00/.test(v)) : escapar(typeof v === 'boolean' ? (v ? 'Sí' : 'No') : v));

// Vista genérica de un detalle: datos simples en una lista y listas de objetos en tablas.
export function detalleHtml(obj, nivel = 3) {
  if (!obj || typeof obj !== 'object') return `<p>${txt(obj)}</p>`;
  const simples = Object.entries(obj).filter(([, v]) => v === null || typeof v !== 'object');
  const compuestos = Object.entries(obj).filter(([, v]) => v !== null && typeof v === 'object');
  let html = simples.length ? `<dl class="row mb-2 small">${simples.map(([k, v]) => `<dt class="col-5">${escapar(ETIQUETA(k))}</dt><dd class="col-7 mb-1">${valor(k, v)}</dd>`).join('')}</dl>` : '';
  for (const [k, v] of compuestos) {
    const h = `h${Math.min(nivel, 6)}`;
    if (Array.isArray(v)) {
      const objetos = v.filter((x) => x && typeof x === 'object');
      if (!objetos.length) { html += `<${h} class="h6 mt-3">${escapar(ETIQUETA(k))}</${h}><p class="small">${v.length ? escapar(v.join(', ')) : 'Sin registros.'}</p>`; continue; }
      const claves = [...new Set(objetos.flatMap((o) => Object.keys(o).filter((c) => o[c] === null || typeof o[c] !== 'object')))].slice(0, 8);
      html += `<${h} class="h6 mt-3">${escapar(ETIQUETA(k))}</${h}>${tablaHtml({ caption: ETIQUETA(k), columnas: claves.map((c) => [ETIQUETA(c), (o) => valor(c, o[c])]), filas: objetos })}`;
    } else {
      html += `<${h} class="h6 mt-3">${escapar(ETIQUETA(k))}</${h}>${detalleHtml(v, nivel + 1)}`;
    }
  }
  return html || '<p>Sin datos.</p>';
}
