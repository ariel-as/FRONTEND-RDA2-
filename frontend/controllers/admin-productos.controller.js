import { adminModel } from '../models/admin.model.js';
import { mostrarMensaje } from './validacion.controller.js';
import { confirmarAccion } from './dialogo.controller.js';
import { escapar } from '../views/componentes.view.js';
import { stockTexto, caducidadProductoHtml, esFefo } from '../views/lista-api.view.js';
import { paginacionAdmin } from '../views/admin.view.js';

const s = (x)=>document.querySelector(x);
const money = (n)=> `$${Number(n||0).toFixed(2)}`;
let pagina = 1;
let totalPages = 1;
let orden = 'caducidad';

export async function iniciarProductosAdmin(){
  if (document.body.dataset.pagina !== 'productos-admin') return;
  await Promise.all([cargarCategorias(), cargarUnidades()]);
  await listar();
  s('#formulario-producto')?.addEventListener('submit', onSubmit);
  s('[data-nuevo-producto]')?.addEventListener('click', ()=> resetForm());
  s('[data-tabla-productos]')?.addEventListener('click', onTablaClick);
  s('[data-paginacion-productos]')?.addEventListener('click', (e)=>{
    const boton = e.target.closest('[data-page]');
    if (!boton || boton.disabled) return;
    pagina = Number(boton.dataset.page) || 1;
    listar();
  });
  s('#filtro-estado')?.addEventListener('change', ()=>{ pagina = 1; listar(); });
  s('#filtro-orden')?.addEventListener('change', ()=>{ pagina = 1; orden = s('#filtro-orden')?.value || 'caducidad'; listar(); });
  s('#controlaCaducidad')?.addEventListener('change', actualizarCaducidad);
}

async function cargarCategorias(){
  try{ const cats = await adminModel.categorias(); const sel=s('#categoriaId'); if(sel) sel.innerHTML = `<option value="">Selecciona</option>` + (cats||[]).map(c=>`<option value="${escapar(c.id)}">${escapar(c.descripcion||c.nombre||c.id)}</option>`).join(''); }catch{}
}

async function cargarUnidades(){
  const sel = s('#unidadMedidaId');
  if (!sel) return;
  try {
    const ops = await adminModel.tablaOpciones('unidad_medida');
    const lista = Array.isArray(ops) ? ops : (ops?.data || []);
    if (!lista.length) return;
    sel.innerHTML = lista.map((o) => {
      const valor = o.valor ?? o.value ?? o.id ?? '';
      const texto = o.texto ?? o.label ?? o.descripcion ?? o.nombre ?? valor;
      return `<option value="${escapar(valor)}">${escapar(texto)}</option>`;
    }).join('');
    if (![...sel.options].some((o) => o.value === 'UND')) sel.insertAdjacentHTML('afterbegin', '<option value="UND">Unidad</option>');
  } catch { /* Se conserva la unidad por defecto. */ }
}

function actualizarCaducidad(){
  const activa = Boolean(s('#controlaCaducidad')?.checked);
  document.querySelectorAll('[data-campo-caducidad]').forEach((nodo) => { nodo.hidden = !activa; });
}

async function listar(){
  const tbody = s('[data-tabla-productos] tbody') || s('[data-tabla-productos]');
  const filtro = s('#filtro-estado')?.value;
  const region = s('#mensaje-productos');
  if(tbody) tbody.setAttribute('aria-busy','true');
  try{
    const params = { page: pagina, limit: 20, orden };
    if (filtro === 'porCaducar') params.porCaducar = 'S';
    else if (filtro) params.estado = filtro;
    const res = await adminModel.productos(params);
    let lista = res?.data || res || [];
    if (orden === 'caducidad') lista = [...lista].sort((a, b) => String(a.proximaCaducidad || '9999').slice(0, 10).localeCompare(String(b.proximaCaducidad || '9999').slice(0, 10)) || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
    const paginacion = res?.pagination || {};
    totalPages = paginacion.totalPages || 1;
    pagina = paginacion.page || pagina;
    if(tbody) tbody.innerHTML = lista.length ? lista.map(p=>{
      return `<tr><th scope="row">${escapar(p.nombre)}<div class="small text-body-secondary">${escapar(p.id)}</div></th><td>${escapar(p.categoria?.descripcion||p.categoria||p.categoriaId||'')}</td><td>${money(p.precio)}</td><td>${money(p.precioConIva ?? p.precio)}</td><td>${stockTexto(p)}</td><td>${caducidadProductoHtml(p)}</td><td>${esFefo(p) ? 'FEFO' : 'FIFO'}</td><td>${p.estado==='A'?'A la venta':p.estado==='P'?'Pendiente':'Inactivo'}</td><td>${p.publicarWeb==='S'||p.publicarWeb===true?'Sí':'No'}</td><td class="pf-celda-acciones"><button class="btn btn-outline-primary btn-sm" data-editar="${escapar(p.id)}" aria-label="Editar producto ${escapar(p.nombre)} (${escapar(p.id)})">Editar</button> <button class="btn btn-outline-danger btn-sm" data-desactivar="${escapar(p.id)}" aria-label="Desactivar producto ${escapar(p.nombre)} (${escapar(p.id)})" ${p.estado==='I'?'disabled':''}>Desactivar</button></td></tr>`;
    }).join('') : '<tr><td colspan="10" class="text-center text-body-secondary">No hay productos.</td></tr>';
    const cont = s('[data-paginacion-productos]');
    if (cont) cont.innerHTML = paginacionAdmin({ page: pagina, totalPages });
  }catch(e){ mostrarMensaje(region, e.mensaje||'No se pudieron cargar los productos.', 'error'); }
  finally{ if(tbody) tbody.setAttribute('aria-busy','false'); }
}

function resetForm(){
  const f=s('#formulario-producto'); if(!f) return;
  f.reset();
  delete f.dataset.idOriginal;
  delete f.dataset.stockOriginal;
  f.dataset.modo='crear';
  f.querySelector('#id').readOnly=false;
  const unidad = f.querySelector('#unidadMedidaId');
  if (unidad) unidad.value = 'UND';
  s('#titulo-form').textContent='Agregar producto';
  actualizarCaducidad();
}

async function onTablaClick(e){
  const btnE = e.target.closest('[data-editar]'); const btnD = e.target.closest('[data-desactivar]');
  if(btnE){
    const id = btnE.dataset.editar;
    try{
      const res = await adminModel.tablaFila('producto', id);
      const p = res?.data || res;
      const f=s('#formulario-producto'); f.dataset.modo='editar'; f.dataset.idOriginal=id; f.dataset.stockOriginal=String(p?.stock ?? '');
      for(const [k,v] of Object.entries(p||{})){ const el=f.querySelector(`[name="${k}"]`); if(!el) continue; if(el.type==='checkbox') el.checked = v==='S'||v===true; else el.value = v ?? ''; }
      f.querySelector('#id').readOnly=true; s('#titulo-form').textContent=`Editar ${p?.nombre||id}`;
      actualizarCaducidad();
      f.scrollIntoView({behavior:'smooth'});
    }catch(err){ mostrarMensaje(s('#mensaje-productos'), err.mensaje||'No se pudo cargar el producto.', 'error'); }
  }
  if(btnD){
    const id = btnD.dataset.desactivar; if(!await confirmarAccion({ titulo: 'Desactivar producto', mensaje: `¿Desactivar el producto ${id}? Dejará de mostrarse en la tienda.`, textoConfirmar: 'Desactivar' })) return;
    try{ await adminModel.desactivarProducto(id); mostrarMensaje(s('#mensaje-productos'),'Producto desactivado.','exito'); await listar(); }
    catch(err){ mostrarMensaje(s('#mensaje-productos'), err.mensaje||'No se pudo desactivar.', 'error'); }
  }
}

function val(f,name){ const el=f.querySelector(`[name="${name}"]`); if(!el) return undefined; if(el.type==='checkbox') return el.checked ? 'S':'N'; return el.value===''?undefined:el.value; }

async function onSubmit(e){
  e.preventDefault(); const f=e.currentTarget; const region=s('#mensaje-productos');
  const body = {
    id: val(f,'id'), nombre: val(f,'nombre'), categoriaId: val(f,'categoriaId'), unidadMedidaId: val(f,'unidadMedidaId')||'UND',
    contenido: val(f,'contenido'), talla: val(f,'talla'), precio: val(f,'precio')?Number(val(f,'precio')):undefined,
    pagaIva: val(f,'pagaIva'), stock: val(f,'stock')!==undefined?Number(val(f,'stock')):undefined,
    stockMin: val(f,'stockMin')!==undefined?Number(val(f,'stockMin')):undefined, costoUnit: val(f,'costoUnit')?Number(val(f,'costoUnit')):undefined,
    motivoAjuste: val(f,'motivoAjuste'), controlaCaducidad: val(f,'controlaCaducidad'), diasAlertaCad: val(f,'diasAlertaCad')?Number(val(f,'diasAlertaCad')):undefined,
    fechaCaducidad: val(f,'fechaCaducidad'), publicarWeb: val(f,'publicarWeb'), estado: val(f,'estado'), descripcion: val(f,'descripcion')
  };
  Object.keys(body).forEach(k=> body[k]===undefined && delete body[k]);
  const stockOriginal = f.dataset.stockOriginal;
  const stockAumenta = body.stock !== undefined && (stockOriginal === undefined || body.stock > Number(stockOriginal));
  if (body.controlaCaducidad === 'S' && stockAumenta && !body.fechaCaducidad) {
    mostrarMensaje(region, 'Escribe la fecha de caducidad del lote que entra.', 'error');
    return;
  }
  try{
    if (f.dataset.modo==='editar'){ await adminModel.editarProducto(f.dataset.idOriginal || body.id, body); mostrarMensaje(region,'Producto actualizado.','exito'); }
    else { await adminModel.crearProducto(body); mostrarMensaje(region,'Producto creado.','exito'); }
    resetForm(); await listar();
  }catch(err){ mostrarMensaje(region, err.mensaje||'No se pudo guardar el producto.', 'error'); }
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', iniciarProductosAdmin); else iniciarProductosAdmin();
