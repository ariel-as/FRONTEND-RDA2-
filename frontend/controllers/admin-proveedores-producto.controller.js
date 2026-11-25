import './admin.controller.js';
import { inventarioModel, lista as extraer } from '../models/fase2.model.js';
import { adminModel } from '../models/admin.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt } from '../views/lista-api.view.js';
import { crearLista, formulario, enlazarBoton } from './lista-api.controller.js';
import { cargarProductosInventario } from './admin-inventario.controller.js';

// Proveedores de cada producto: GET y PUT /admin/productos/:id/proveedores (lista de códigos de proveedor).
const select = document.querySelector('#proveedores-producto');
let actuales = [];
const tabla = crearLista({
  raiz: '#pantalla-proveedores', caption: 'Proveedores del producto', paginar: false,
  cargar: () => (select?.value ? inventarioModel.proveedores(select.value) : Promise.resolve([])),
  alCargar: (_, filas) => { actuales = filas; },
  columnas: [['Código', (p) => txt(p.proveedorId ?? p.id)], ['Proveedor', (p) => txt(p.proveedor?.nombre || p.nombre || p.razonSocial)], ['Teléfono', (p) => txt(p.proveedor?.telefono || p.telefono)]]
});
select?.addEventListener('change', () => tabla?.recargar());
enlazarBoton('[data-editar-proveedores]', 'inventario:gestionar', async () => {
  if (!select.value) { select.focus(); return 'Elige primero un producto.'; }
  let opciones = [];
  try { opciones = extraer(await adminModel.tablaOpciones('proveedor')); } catch { opciones = []; }
  const marcados = new Set(actuales.map((p) => String(p.proveedorId ?? p.id)));
  const m = await formulario({
    titulo: 'Asignar proveedores', mensaje: 'Marca los proveedores que venden este producto.',
    contenido: `<fieldset><legend class="fs-6">Proveedores</legend>${opciones.map((o, i) => { const v = String(o.valor ?? o.id); return `<div class="form-check"><input class="form-check-input" type="checkbox" id="prov-${i}" value="${escapar(v)}" ${marcados.has(v) ? 'checked' : ''}><label class="form-check-label" for="prov-${i}">${escapar(o.texto ?? o.descripcion ?? v)}</label></div>`; }).join('') || '<p>No hay proveedores registrados.</p>'}</fieldset>`,
    alConfirmar: (_, f) => inventarioModel.guardarProveedores(select.value, [...f.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value)),
    exito: 'Proveedores actualizados.'
  });
  if (m) tabla?.recargar();
  return m;
});
cargarProductosInventario();
