import './admin.controller.js';
import { inventarioModel } from '../models/fase2.model.js';
import { adminModel } from '../models/admin.model.js';
import { puede, esAdm } from '../models/permisos.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, dinero, fecha, estado, tablaHtml, esFefo, tipoInventarioTexto, situacionCaducidad, caducidadHtml, caducidadProductoHtml, proximaCaducidad, stockTexto } from '../views/lista-api.view.js';
import { confirmarAccion } from './dialogo.controller.js';
import { crearLista, formulario, enlazarBoton } from './lista-api.controller.js';

const VER_COSTOS = puede(['inventario:gestionar', 'compras', 'reportes:todos']);
const ESTADOS_LOTE = { D: 'Disponible', A: 'Activo', C: 'Caducado o dado de baja', B: 'Bloqueado' };
const ESTADOS_PRODUCTO = { A: 'A la venta', P: 'Pendiente', I: 'Inactivo' };
const listaDe = (respuesta) => (Array.isArray(respuesta) ? respuesta : (respuesta?.data ?? []));
const s = (selector) => document.querySelector(selector);
let productos = [];
let categorias = [];
let lotesConStock = [];
let filasAlerta = [];

function mostrarPestana(selector) {
  const boton = s(selector);
  if (!boton) return;
  if (window.bootstrap?.Tab) window.bootstrap.Tab.getOrCreateInstance(boton).show();
  else boton.click();
}

function actualizarRangoCaducidad() {
  const tipo = s('#lotes-tipo')?.value;
  const contenedor = s('#rango-caducidad');
  if (contenedor) contenedor.hidden = tipo !== 'FEFO';
  const fieldset = contenedor?.querySelector('fieldset');
  if (fieldset) fieldset.disabled = tipo !== 'FEFO';
  if (tipo !== 'FEFO') {
    ['#lotes-desde', '#lotes-hasta'].forEach((selector) => {
      const control = s(selector);
      if (!control) return;
      control.value = '';
      control.removeAttribute('value');
    });
  }
}

function aplicarParametrosUrl() {
  const q = new URLSearchParams(location.search);
  const alias = { tipoInventario: 'metodoSalida', caducidadDesde: 'caducaDesde', caducidadHasta: 'caducaHasta' };
  ['metodoSalida', 'productoId', 'categoriaId', 'estado', 'caducaDesde', 'caducaHasta'].forEach((nombre) => {
    const control = s(`#filtros-lotes [name="${CSS.escape(nombre)}"]`);
    if (!control) return;
    const valor = q.get(nombre) ?? q.get(Object.keys(alias).find((k) => alias[k] === nombre) || '');
    if (valor !== null) control.value = valor;
  });
  ['porCaducar', 'conStock'].forEach((nombre) => {
    const control = s(`#filtros-lotes [name="${CSS.escape(nombre)}"]`);
    if (control && q.get(nombre) === 'S') control.checked = true;
  });
  if (q.has('pestana')) mostrarPestana(`#tab-${q.get('pestana')}`);
  actualizarRangoCaducidad();
}

function nombreProducto(id) {
  return productos.find((p) => String(p.id) === String(id))?.nombre || id;
}

function nombreCategoria(lote) {
  const id = lote?.categoriaId ?? lote?.producto?.categoriaId ?? lote?.producto?.categoria?.id;
  return categorias.find((c) => String(c.id) === String(id))?.descripcion || id || '';
}

function cargarLotes(params) {
  const permitidos = ['page', 'limit', 'metodoSalida', 'productoId', 'categoriaId', 'estado', 'caducaDesde', 'caducaHasta', 'porCaducar', 'conStock'];
  const limpios = {};
  permitidos.forEach((nombre) => { if (params[nombre] !== undefined && params[nombre] !== null && params[nombre] !== '') limpios[nombre] = params[nombre]; });
  limpios.limit = limpios.limit || 100;
  if (limpios.metodoSalida !== 'FEFO') {
    delete limpios.caducaDesde;
    delete limpios.caducaHasta;
  }
  return inventarioModel.lotes(limpios);
}

function extraerLotes(respuesta) {
  return listaDe(respuesta).sort((a, b) => String(a.fechaCaducidad || '9999').localeCompare(String(b.fechaCaducidad || '9999')) || String(a.producto?.nombre || nombreProducto(a.productoId)).localeCompare(String(b.producto?.nombre || nombreProducto(b.productoId)), 'es'));
}

async function verKardex(lote) {
  const productoId = String(lote?.productoId ?? '');
  const select = s('#kardex-producto');
  if (select && productoId) {
    if (![...select.options].some((o) => o.value === productoId)) select.insertAdjacentHTML('beforeend', `<option value="${escapar(productoId)}">${escapar(lote?.producto?.nombre || nombreProducto(productoId))}</option>`);
    select.value = productoId;
  }
  mostrarPestana('#tab-lotes');
  kardex?.recargar();
  return null;
}

function accionesLote(l) {
  return [
    { texto: 'Ver kárdex', etiqueta: `Ver kárdex del lote ${l.id}`, ejecutar: () => verKardex(l) },
    l.estado !== 'C' && { texto: l.estado === 'B' ? 'Desbloquear' : 'Bloquear', permiso: 'inventario:gestionar', etiqueta: `${l.estado === 'B' ? 'Desbloquear' : 'Bloquear'} el lote ${l.id}`,
      ejecutar: async () => (await confirmarAccion({ titulo: `${l.estado === 'B' ? 'Desbloquear' : 'Bloquear'} lote ${l.id}`, mensaje: l.estado === 'B' ? 'El lote volverá a usarse en las ventas.' : 'El lote no se usará en las ventas mientras esté bloqueado.', textoConfirmar: l.estado === 'B' ? 'Desbloquear' : 'Bloquear', tono: 'primario',
        alConfirmar: () => inventarioModel.bloqueo(l.id, l.estado !== 'B') }) ? 'Estado del lote actualizado.' : null) },
    l.estado !== 'C' && esAdm() && { texto: 'Dar de baja por caducidad', permiso: 'inventario:gestionar', tono: 'btn-outline-danger', etiqueta: `Dar de baja el lote ${l.id}`,
      ejecutar: () => formulario({ titulo: `Dar de baja el lote ${l.id}`, mensaje: 'Se registra la salida en el kárdex. No se puede deshacer.', tono: 'peligro', textoConfirmar: 'Dar de baja',
        campos: [{ nombre: 'observacion', etiqueta: 'Observación', tipo: 'textarea', requerido: true, maxlength: 200 }],
        alConfirmar: (v) => inventarioModel.baja(l.id, v.observacion.trim()), exito: 'Lote dado de baja por caducidad.' }) }
  ];
}

const lotes = crearLista({
  raiz: '#pantalla-lotes', filtros: '#filtros-lotes', caption: 'Lotes de productos',
  cargar: cargarLotes,
  extraer: extraerLotes,
  vacio: 'No hay lotes con estos filtros',
  columnas: [['Lote', (l) => txt(l.id)], ['Producto', (l) => txt(l.producto?.nombre || l.producto || nombreProducto(l.productoId))], ['Tipo', (l) => txt(tipoInventarioTexto(l))], ['Ingreso', (l) => fecha(l.fechaIngreso)], ['Caducidad', (l) => caducidadHtml(l.fechaCaducidad)],
    ['Situación', (l) => txt(l.fechaCaducidad ? situacionCaducidad(l.fechaCaducidad) : 'No caduca')], ['Disponible', (l) => txt(`${l.cantidadDisponible ?? ''} de ${l.cantidadInicial ?? ''}`)], ...(VER_COSTOS ? [['Costo unitario', (l) => dinero(l.costoUnit)]] : []), ['Estado', (l) => estado(ESTADOS_LOTE, l.estado)]],
  acciones: accionesLote
});

const productosInventario = crearLista({
  raiz: '#lista-productos-inventario', caption: 'Productos del inventario', paginar: false,
  cargar: async () => ({ data: productos.map((p) => ({ ...p, __caducidad: p.proximaCaducidad || proximaCaducidad(p.id, lotesConStock) })) }),
  extraer: listaDe,
  columnas: [['Producto', (p) => txt(p.nombre)], ['Tipo', (p) => txt(esFefo(p) ? 'FEFO' : 'FIFO')], ['Categoría', (p) => txt(p.categoria?.descripcion || p.categoria || p.categoriaId || '')], ['Stock', (p) => stockTexto(p)], ['Caducidad', (p) => caducidadProductoHtml({ ...p, proximaCaducidad: p.proximaCaducidad || p.__caducidad })], ['Estado', (p) => estado(ESTADOS_PRODUCTO, p.estado)]],
  alCargar: (_, filas) => filas.sort((a, b) => (s('#orden-productos-inventario')?.value || 'caducidad') === 'nombre' ? String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es') : String(a.proximaCaducidad || a.__caducidad || '9999').slice(0, 10).localeCompare(String(b.proximaCaducidad || b.__caducidad || '9999').slice(0, 10)) || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'))
});

const selectKardex = document.querySelector('#kardex-producto');
const kardex = crearLista({
  raiz: '#pantalla-kardex', caption: 'Kárdex del producto',
  cargar: (p) => (selectKardex?.value ? inventarioModel.kardex(selectKardex.value, p) : Promise.resolve([])),
  columnas: [['Fecha', (k) => fecha(k.fecha, true)], ['Movimiento', (k) => txt(k.tipoMovimiento || k.tipoMovimientoId)], ['Lote', (k) => txt(k.loteProductoId)], ['Cantidad', (k) => txt(k.cantidad)], ...(VER_COSTOS ? [['Costo unitario', (k) => dinero(k.costoUnit)]] : []),
    ['Saldo cantidad', (k) => txt(k.saldoCantidad)], ...(VER_COSTOS ? [['Costo promedio', (k) => dinero(k.costoPromedio)], ['Saldo valor', (k) => dinero(k.saldoValor)]] : []), ['Observación', (k) => txt(k.observacion)]]
});
selectKardex?.addEventListener('change', () => kardex?.recargar());
s('#lotes-tipo')?.addEventListener('change', actualizarRangoCaducidad);
s('#orden-productos-inventario')?.addEventListener('change', () => productosInventario?.recargar());
s('[data-limpiar-filtros]')?.addEventListener('click', () => {
  const form = s('#filtros-lotes');
  if (!form) return;
  form.reset();
  form.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.checked = false; });
  actualizarRangoCaducidad();
  lotes?.recargar();
});

function normalizarAlertas(respuesta) {
  const datos = respuesta?.data ?? respuesta ?? {};
  return {
    porCaducar: listaDe(datos.porCaducar),
    caducados: listaDe(datos.caducadosConUnidades),
    sinStock: listaDe(datos.sinStockYMinimo)
  };
}

function esLote(fila) {
  return Boolean(fila?.id && (fila.fechaCaducidad || fila.cantidadInicial !== undefined || fila.estado));
}

function accionesAlerta(fila) {
  if (!esLote(fila)) return '';
  const botones = [`<button type="button" class="btn btn-sm btn-outline-primary me-1 mb-1" data-accion-alerta="kardex" data-fila="${escapar(fila.id)}">Ver kárdex</button>`];
  if (puede('inventario:gestionar')) botones.push(`<button type="button" class="btn btn-sm btn-outline-secondary me-1 mb-1" data-accion-alerta="bloqueo" data-fila="${escapar(fila.id)}">Bloquear</button>`);
  if (esAdm()) botones.push(`<button type="button" class="btn btn-sm btn-outline-danger me-1 mb-1" data-accion-alerta="baja" data-fila="${escapar(fila.id)}">Dar de baja por caducidad</button>`);
  return botones.join('');
}

function columnasAlertas() {
  return [['Producto', (l) => txt(l.producto?.nombre || l.producto || nombreProducto(l.productoId))], ['Lote', (l) => txt(l.id || l.productoId)], ['Cantidad', (l) => txt(l.cantidadDisponible ?? l.stock ?? '')], ['Caducidad', (l) => caducidadHtml(l.fechaCaducidad)], ['Situación', (l) => txt(l.fechaCaducidad ? situacionCaducidad(l.fechaCaducidad) : (l.stock <= Number(l.stockMin ?? 0) ? 'Stock mínimo' : 'Sin stock'))]];
}

async function cargarAlertas() {
  const cont = s('#pantalla-alertas [data-alertas]');
  const mensaje = s('#mensaje-alertas');
  if (!cont) return;
  cont.setAttribute('aria-busy', 'true');
  try {
    const alertas = normalizarAlertas(await inventarioModel.alertas());
    filasAlerta = [...alertas.porCaducar, ...alertas.caducados, ...alertas.sinStock];
    const grupos = [['porCaducar', 'Lotes por caducar', alertas.porCaducar], ['caducados', 'Caducados con unidades', alertas.caducados], ['sinStock', 'Sin stock o en stock mínimo', alertas.sinStock]];
    cont.innerHTML = grupos.map(([clave, titulo, filas]) => `<section class="mb-4" data-grupo-alerta="${clave}" aria-labelledby="titulo-alerta-${clave}"><h3 id="titulo-alerta-${clave}" class="h6">${escapar(titulo)} <span class="badge text-bg-secondary">${filas.length}</span></h3>${tablaHtml({ caption: titulo, columnas: columnasAlertas(), filas, acciones: accionesAlerta })}</section>`).join('');
    if (mensaje) {
      const partes = [];
      if (alertas.porCaducar.length) partes.push(`${alertas.porCaducar.length} lotes por caducar`);
      if (alertas.caducados.length) partes.push(`${alertas.caducados.length} caducados con unidades`);
      if (alertas.sinStock.length) partes.push(`${alertas.sinStock.length} sin stock o en stock mínimo`);
      mensaje.textContent = partes.length ? `${partes.join(' · ')}.` : '';
      mensaje.hidden = !partes.length;
    }
  } catch (error) {
    if (mensaje) { mensaje.textContent = error.mensaje || 'No se pudieron cargar las alertas.'; mensaje.hidden = false; }
    cont.innerHTML = '<p class="text-body-secondary">No hay alertas disponibles.</p>';
  } finally {
    cont.setAttribute('aria-busy', 'false');
  }
}

s('#pantalla-alertas [data-alertas]')?.addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-accion-alerta]');
  if (!boton) return;
  const fila = filasAlerta.find((l) => String(l.id) === String(boton.dataset.fila));
  if (!fila) return;
  const accion = boton.dataset.accionAlerta;
  try {
    if (accion === 'kardex') await verKardex(fila);
    if (accion === 'bloqueo') {
      const confirmado = await confirmarAccion({ titulo: `Bloquear lote ${fila.id}`, mensaje: 'El lote dejará de usarse en las ventas hasta que se desbloquee.', textoConfirmar: 'Bloquear' });
      if (confirmado) { await inventarioModel.bloqueo(fila.id, true); await cargarAlertas(); }
    }
    if (accion === 'baja') {
      const mensaje = await formulario({ titulo: `Dar de baja el lote ${fila.id}`, mensaje: 'El lote sale del stock y se registra en el kárdex.', tono: 'peligro', textoConfirmar: 'Dar de baja',
        campos: [{ nombre: 'observacion', etiqueta: 'Observación', tipo: 'textarea', requerido: true, maxlength: 200 }],
        alConfirmar: (v) => inventarioModel.baja(fila.id, v.observacion.trim()), exito: 'Lote dado de baja por caducidad.' });
      if (mensaje) await cargarAlertas();
    }
  } catch (error) {
    const mensaje = s('#mensaje-alertas');
    if (mensaje) { mensaje.textContent = error.mensaje || 'No se pudo completar la acción.'; mensaje.hidden = false; }
  }
});

function recargarTodo() {
  lotes?.recargar();
  kardex?.recargar();
  productosInventario?.recargar();
  cargarAlertas();
}

enlazarBoton('[data-recibir]', 'inventario:gestionar', async () => {
  const m = await formulario({
    titulo: 'Recibir mercadería sin orden', textoConfirmar: 'Registrar ingreso',
    campos: [{ nombre: 'productoId', etiqueta: 'Producto', tipo: 'select', requerido: true, opciones: [{ valor: '', texto: 'Selecciona un producto' }, ...productos.map((p) => ({ valor: p.id, texto: `${p.nombre} (${p.id})` }))] }, { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'number', paso: '1', min: 1, requerido: true }, { nombre: 'costoUnit', etiqueta: 'Costo unitario', tipo: 'number', min: 0, requerido: true },
      { nombre: 'fechaCaducidad', etiqueta: 'Fecha de caducidad (si el producto la controla)', tipo: 'date' }, { nombre: 'numFabricante', etiqueta: 'Lote del fabricante', maxlength: 30 }, { nombre: 'observacion', etiqueta: 'Observación', tipo: 'textarea', maxlength: 200 }],
    alConfirmar: (v) => inventarioModel.recibir({ productoId: v.productoId, cantidad: Number(v.cantidad), costoUnit: Number(v.costoUnit), ...(v.fechaCaducidad ? { fechaCaducidad: v.fechaCaducidad } : {}), ...(v.numFabricante ? { numFabricante: v.numFabricante.trim() } : {}), ...(v.observacion ? { observacion: v.observacion.trim() } : {}) }),
    exito: 'Mercadería registrada.'
  });
  if (m) recargarTodo();
  return m;
});

enlazarBoton('[data-ajustar]', 'inventario:gestionar', async () => {
  const m = await formulario({
    titulo: 'Ajuste de inventario', textoConfirmar: 'Registrar ajuste', mensaje: 'Usa una cantidad positiva para sumar y negativa para restar.',
    campos: [{ nombre: 'productoId', etiqueta: 'Producto', tipo: 'select', requerido: true, opciones: [{ valor: '', texto: 'Selecciona un producto' }, ...productos.map((p) => ({ valor: p.id, texto: `${p.nombre} (${p.id})` }))] }, { nombre: 'cantidad', etiqueta: 'Cantidad (+ o −)', tipo: 'number', paso: '1', requerido: true }, { nombre: 'observacion', etiqueta: 'Observación', tipo: 'textarea', requerido: true, maxlength: 200 }],
    validarExtra: (_, v) => (Number(v.cantidad) === 0 ? 'La cantidad no puede ser cero.' : null),
    alConfirmar: (v) => inventarioModel.ajustar({ productoId: v.productoId, cantidad: Number(v.cantidad), observacion: v.observacion.trim() }),
    exito: 'Ajuste registrado.'
  });
  if (m) recargarTodo();
  return m;
});

export async function cargarProductosInventario() {
  try {
    const [r, c, l] = await Promise.all([adminModel.productos({ limit: 100, orden: 'caducidad' }), adminModel.categorias().catch(() => []), inventarioModel.lotes({ conStock: 'S', limit: 100 }).catch(() => [])]);
    productos = listaDe(r);
    categorias = listaDe(c);
    lotesConStock = listaDe(l);
  } catch { productos = []; categorias = []; lotesConStock = []; }
  document.querySelectorAll('[data-productos]').forEach((selector) => {
    const primera = selector.querySelector('option')?.outerHTML || '';
    selector.innerHTML = primera + productos.map((p) => `<option value="${escapar(p.id)}">${escapar(p.nombre)} (${escapar(p.id)})</option>`).join('');
  });
  const selectorCategoria = s('#lotes-categoria');
  if (selectorCategoria) {
    selectorCategoria.innerHTML = '<option value="">Todas</option>' + categorias.map((c) => `<option value="${escapar(c.id)}">${escapar(c.descripcion || c.nombre || c.id)}</option>`).join('');
  }
  lotes?.recargar();
  productosInventario?.recargar();
  cargarAlertas();
}

if (document.body.dataset.sinAcceso !== 'true') {
  aplicarParametrosUrl();
  cargarProductosInventario();
}
