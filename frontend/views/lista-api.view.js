import { escapar } from './componentes.view.js';
import { formatearPrecio } from '../models/carrito.model.js';

// Formatos comunes para las pantallas de la fase 2 (texto siempre visible, nunca solo color).
export const vacioTxt = '<span class="text-body-secondary" aria-hidden="true">—</span><span class="visually-hidden">Sin dato</span>';
export const txt = (v) => (v === null || v === undefined || v === '' ? vacioTxt : escapar(v));
export const dinero = (v) => (v === null || v === undefined || v === '' ? vacioTxt : `<span class="pf-num">${formatearPrecio(v)}</span>`);
export function fecha(v, conHora = false) {
  if (!v) return vacioTxt;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return escapar(v);
  // Fechas cortas y sin partirse: 22/11/2026 12:50.
  const texto = conHora
    ? d.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    : d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  return `<span class="pf-num">${escapar(texto.replace(',', ''))}</span>`;
}
export const estado = (mapa, v) => `<span class="pf-estado" data-estado="${escapar(v ?? '')}">${escapar(mapa[v] || v || 'Sin estado')}</span>`;
export const nombrePersona = (p) => (p ? [p.nombre, p.apellido].filter(Boolean).join(' ') || p.id || '' : '');

export function esFefo(registro) {
  const controla = registro?.controlaCaducidad ?? registro?.producto?.controlaCaducidad;
  return controla === 'S' || controla === true || registro?.tipoInventario === 'FEFO' || Boolean(registro?.fechaCaducidad);
}

export function tipoInventarioTexto(registro) {
  return esFefo(registro)
    ? 'FEFO: sale primero lo que caduca antes'
    : 'FIFO: sale primero lo que entró antes';
}

export function diasParaCaducar(fechaCaducidad) {
  if (!fechaCaducidad) return null;
  const fin = new Date(`${String(fechaCaducidad).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(fin.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((fin - hoy) / 86400000);
}

export function situacionCaducidad(fechaCaducidad) {
  const dias = diasParaCaducar(fechaCaducidad);
  if (dias === null) return 'No caduca';
  if (dias < 0) return 'Caducado';
  if (dias === 0) return 'Caduca hoy';
  return dias === 1 ? 'Caduca en 1 día' : `Caduca en ${dias} días`;
}

export function caducidadHtml(fechaCaducidad) {
  if (!fechaCaducidad) return txt('No caduca');
  return `${fecha(fechaCaducidad)}<span class="small d-block">${escapar(situacionCaducidad(fechaCaducidad))}</span>`;
}

export function situacionConDias(fechaCaducidad, dias) {
  const n = Number(dias);
  if (!fechaCaducidad) return 'No caduca';
  if (Number.isFinite(n)) return n < 0 ? `Caducó hace ${Math.abs(n)} ${Math.abs(n) === 1 ? 'día' : 'días'}` : n === 0 ? 'Caduca hoy' : n === 1 ? 'Caduca en 1 día' : `Caduca en ${n} días`;
  return situacionCaducidad(fechaCaducidad);
}

export function caducidadProductoHtml(producto = {}) {
  const fechaCaducidad = producto.proximaCaducidad;
  if (!fechaCaducidad) return txt('No caduca');
  const dias = producto.diasParaCaducar ?? diasParaCaducar(fechaCaducidad);
  const n = Number(dias);
  const etiqueta = Number.isFinite(n) && n < 0 ? '<span class="badge text-bg-danger">Caducado</span>' : Number.isFinite(n) && n <= 30 ? '<span class="badge text-bg-warning">Por caducar</span>' : '';
  return `${fecha(fechaCaducidad)}<span class="small d-block">${escapar(situacionConDias(fechaCaducidad, dias))}</span>${etiqueta ? `<span class="d-block mt-1">${etiqueta}</span>` : ''}`;
}

export function proximaCaducidad(productoId, lotes = []) {
  const candidatos = lotes.filter((l) => String(l.productoId) === String(productoId) && l.fechaCaducidad && Number(l.cantidadDisponible ?? l.cantidad ?? 0) > 0)
    .sort((a, b) => String(a.fechaCaducidad).localeCompare(String(b.fechaCaducidad)));
  return candidatos[0]?.fechaCaducidad || null;
}

export function stockTexto(producto) {
  const stock = Number(producto?.stock ?? producto?.cantidadDisponible ?? 0);
  const minimo = Number(producto?.stockMin ?? producto?.stock_min ?? 0);
  if (stock <= 0) return '<span class="badge text-bg-secondary">Sin stock</span>';
  if (minimo > 0 && stock <= minimo) return `<span class="badge text-bg-warning">${stock} · Stock mínimo</span>`;
  return `<span class="pf-num">${stock}</span>`;
}

export function tablaHtml({ caption, columnas, filas, acciones, vacio = 'No hay registros.' }) {
  const head = `<tr>${columnas.map(([t]) => `<th scope="col">${escapar(t)}</th>`).join('')}${acciones ? '<th scope="col">Acciones</th>' : ''}</tr>`;
  const cuerpo = filas.length ? filas.map((f, i) => `<tr>${columnas.map(([t, fn], j) => (j === 0 ? `<th scope="row" data-label="${escapar(t)}">${fn(f)}</th>` : `<td data-label="${escapar(t)}">${fn(f)}</td>`)).join('')}${acciones ? `<td class="pf-celda-acciones" data-label="Acciones">${acciones(f, i) || '<span class="text-body-secondary">Sin acciones</span>'}</td>` : ''}</tr>`).join('')
    : `<tr><td colspan="${columnas.length + (acciones ? 1 : 0)}" class="text-center text-body-secondary">${escapar(vacio)}</td></tr>`;
  return `<div class="table-responsive"><table class="table table-hover align-middle pf-tabla-apilable"><caption class="visually-hidden">${escapar(caption)}</caption><thead class="table-light">${head}</thead><tbody>${cuerpo}</tbody></table></div>`;
}

// Títulos en español para las claves de los detalles y reportes.
const TITULOS = { dias: 'Días', dia: 'Día', hora: 'Hora', porVencer: 'Por vencer', vencidos: 'Vencidos', activos: 'Activos', total: 'Total', cantidad: 'Cantidad', monto: 'Monto', ingresos: 'Ingresos', egresos: 'Egresos', producto: 'Producto', productos: 'Productos', plan: 'Plan', planes: 'Planes', ganancia: 'Ganancia', costo: 'Costo', valor: 'Valor', bajoMinimo: 'Bajo mínimo', porCaducar: 'Por caducar', valorizado: 'Valorizado', cuadres: 'Cuadres', cierres: 'Cierres', comisiones: 'Comisiones', entradas: 'Entradas', aforo: 'Aforo', local: 'Local', web: 'Web' };
const ETIQUETA = (k) => TITULOS[k] || String(k).replace(/Id$/, '').replace(/([a-z])([A-Z])/g, (_, a, b) => `${a} ${b.toLowerCase()}`).replace(/^./, (c) => c.toUpperCase());
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
