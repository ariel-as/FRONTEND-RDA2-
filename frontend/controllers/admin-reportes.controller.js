import './admin.controller.js';
import { reportesModel } from '../models/fase2.model.js';
import { puede } from '../models/permisos.model.js';
import { escapar } from '../views/componentes.view.js';
import { detalleHtml } from '../views/lista-api.view.js';
import { mostrarMensaje } from './validacion.controller.js';

const REPORTES = [
  ['clientes', 'Clientes activos, por vencer y vencidos', ['reportes:clientes', 'reportes:todos']],
  ['entradas', 'Entradas por día y hora, y aforo', ['reportes:entradas', 'reportes:todos']],
  ['ventas', 'Ventas por día y producto (local y web)', 'reportes:todos'],
  ['ganancia', 'Ganancia por producto', 'reportes:todos'],
  ['inventario', 'Inventario valorizado, por caducar y bajo mínimo', 'reportes:todos'],
  ['inscripciones', 'Ingresos por plan', 'reportes:todos'],
  ['caja', 'Cuadres y cierres de caja', 'reportes:todos'],
  ['comisiones', 'Comisiones de aliados cobradas', 'reportes:todos']
].filter(([, , permiso]) => puede(permiso));
const region = document.querySelector('[data-mensaje]');
const form = document.querySelector('#form-reporte');
const resultado = document.querySelector('[data-resultado]');
const grafico = document.querySelector('[data-grafico]');

// Gráfico de barras con CSS para la primera lista que tenga una etiqueta y un número; la tabla debajo tiene los mismos datos.
function graficoHtml(datos, titulo) {
  const listas = Object.values(datos || {}).filter((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
  const filas = listas[0] || (Array.isArray(datos) ? datos : null);
  if (!filas?.length) return '';
  const claves = Object.keys(filas[0]);
  const etiqueta = claves.find((k) => typeof filas[0][k] === 'string' || /fecha|hora|dia/i.test(k));
  const valor = claves.find((k) => k !== etiqueta && typeof filas[0][k] === 'number');
  if (!etiqueta || !valor) return '';
  const max = Math.max(...filas.map((f) => Number(f[valor]) || 0), 1);
  return `<figure class="mb-3" aria-label="Gráfico: ${escapar(titulo)}"><figcaption class="small text-body-secondary mb-1">${escapar(valor)} por ${escapar(etiqueta)} (los datos están en la tabla)</figcaption>${filas.slice(0, 31).map((f) => `<div class="d-flex align-items-center gap-2 small" aria-hidden="true"><span style="min-width:7rem">${escapar(f[etiqueta])}</span><span class="bg-primary d-inline-block" style="height:.9rem;width:${Math.max(1, Math.round((Number(f[valor]) || 0) / max * 70))}%"></span><span>${escapar(f[valor])}</span></div>`).join('')}</figure>`;
}

const parametros = () => ({ ...(form.desde.value ? { desde: form.desde.value } : {}), ...(form.hasta.value ? { hasta: form.hasta.value } : {}) });

if (form && document.body.dataset.sinAcceso !== 'true') {
  form.tipo.innerHTML = REPORTES.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  const hoy = new Date();
  const haceUnMes = new Date(hoy); haceUnMes.setMonth(hoy.getMonth() - 1);
  if (!form.desde.value) form.desde.value = haceUnMes.toLocaleDateString('en-CA');
  if (!form.hasta.value) form.hasta.value = hoy.toLocaleDateString('en-CA');
  const botonCsv = document.querySelector('[data-csv]');
  botonCsv.disabled = true;
  form.tipo.addEventListener('change', () => { botonCsv.disabled = true; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.desde.value && form.hasta.value && form.desde.value > form.hasta.value) { mostrarMensaje(region, 'La fecha inicial debe ser anterior a la final.', 'error'); form.desde.focus(); return; }
    const titulo = REPORTES.find(([v]) => v === form.tipo.value)?.[1] || 'Reporte';
    document.querySelector('[data-titulo-reporte]').textContent = titulo;
    resultado.setAttribute('aria-busy', 'true');
    try {
      const r = await reportesModel.ver(form.tipo.value, parametros());
      const datos = r?.data ?? r;
      grafico.innerHTML = graficoHtml(datos, titulo);
      resultado.innerHTML = detalleHtml(datos);
      mostrarMensaje(region, `Reporte «${titulo}» cargado.`, 'exito');
      botonCsv.disabled = false;
    } catch (error) { grafico.innerHTML = ''; resultado.innerHTML = ''; mostrarMensaje(region, error.mensaje || 'No se pudo cargar el reporte.', 'error'); }
    finally { resultado.setAttribute('aria-busy', 'false'); }
  });
  document.querySelector('[data-csv]').addEventListener('click', async () => {
    try {
      const texto = await reportesModel.csv(form.tipo.value, parametros());
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(new Blob([typeof texto === 'string' ? texto : JSON.stringify(texto)], { type: 'text/csv;charset=utf-8' }));
      enlace.download = `reporte-${form.tipo.value}.csv`;
      document.body.appendChild(enlace); enlace.click(); enlace.remove();
      mostrarMensaje(region, 'CSV descargado.', 'exito');
    } catch (error) { mostrarMensaje(region, error.mensaje || 'Este reporte no se pudo descargar en CSV.', 'error'); }
  });
}
