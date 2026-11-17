import { adminModel } from '../models/admin.model.js';
import { mostrarMensaje } from './validacion.controller.js';
import { escapar } from '../views/componentes.view.js';
import { paginacionAdmin } from '../views/admin.view.js';
import { formatearPrecio } from '../models/carrito.model.js';

const s=(x)=>document.querySelector(x);
const PAGOS = { EF: 'Efectivo', TR: 'Transferencia' };
let pagina=1;

export async function iniciarPedidosAdmin(){
  if(document.body.dataset.pagina!=='pedidos-admin') return;
  await listar();
  s('#filtro-estado')?.addEventListener('change', ()=>{pagina=1;listar();});
  s('[data-tabla-pedidos]')?.addEventListener('click', onClick);
  s('[data-paginacion-pedidos]')?.addEventListener('click', (e)=>{
    const boton = e.target.closest('[data-page]');
    if (!boton || boton.disabled) return;
    pagina = Number(boton.dataset.page) || 1;
    listar();
  });
}

async function listar(){
  const tbody=s('[data-tabla-pedidos] tbody')||s('[data-tabla-pedidos]'); const estado=s('#filtro-estado')?.value;
  if(tbody) tbody.setAttribute('aria-busy','true');
  try{
    const res = await adminModel.pedidos({ page: pagina, limit: 20, ...(estado?{estado}:{}) });
    const lista = res?.data || res || [];
    const paginacion = res?.pagination || {};
    pagina = paginacion.page || pagina;
    if(tbody) tbody.innerHTML = lista.length ? lista.map(p=>{
      const id = escapar(p.id);
      const det = (p.detalles||[]).map(d=>`${escapar(d.nombre||d.productoId)} x${escapar(d.cantidad)}`).join('<br>');
      const acciones = [];
      if(p.estado==='P') acciones.push(`<button class="btn btn-sm btn-outline-primary" data-pago="${id}" aria-label="Marcar pago reportado para el pedido número ${id}">Pago reportado</button>`);
      if(p.estado==='P'||p.estado==='R') acciones.push(`<button class="btn btn-sm btn-outline-danger" data-cancelar="${id}" aria-label="Cancelar pedido número ${id}">Cancelar</button>`);
      const comprobante = p.refTransferencia ? `<div class="small">Comprobante: ${escapar(p.refTransferencia)}</div>` : '';
      return `<tr><th scope="row">${id}</th><td>${escapar(p.usuario?.login||p.userId||'')}</td><td>${escapar(new Date(p.createdAt||Date.now()).toLocaleString('es-EC'))}</td><td>${escapar(PAGOS[p.metodoPago]||p.metodoPago||'vacío')}${comprobante}</td><td><details><summary>Ver productos</summary><div class="small mt-1">${det||'vacío'}</div></details></td><td>${formatearPrecio(p.total)}</td><td>${escapar(p.estadoNombre||p.estado||'')}</td><td class="text-nowrap">${acciones.join(' ')||'<span class="text-body-secondary">Sin acciones</span>'}</td></tr>`;
    }).join('') : '<tr><td colspan="8" class="text-center text-body-secondary">No hay pedidos.</td></tr>';
    const cont = s('[data-paginacion-pedidos]');
    if (cont) cont.innerHTML = paginacionAdmin({ page: pagina, totalPages: paginacion.totalPages || 1 });
  }catch(e){ mostrarMensaje(s('#mensaje-pedidos'), e.mensaje||'No se pudieron cargar los pedidos.','error'); }
  finally{ if(tbody) tbody.setAttribute('aria-busy','false'); }
}

async function onClick(e){
  const pago=e.target.closest('[data-pago]'); const canc=e.target.closest('[data-cancelar]'); const region=s('#mensaje-pedidos');
  if(pago){ const id=pago.dataset.pago; const ref=prompt('Número de comprobante (opcional):',''); if(ref===null) return; try{ await adminModel.cambiarEstadoPedido(id,{estado:'R', ...(ref?{refTransferencia:ref}:{})}); mostrarMensaje(region,'Pago reportado.','exito'); await listar(); }catch(err){ mostrarMensaje(region, err.mensaje||'No se pudo actualizar.','error'); } }
  if(canc){ const id=canc.dataset.cancelar; if(!confirm(`¿Cancelar el pedido ${id}?`)) return; try{ await adminModel.cambiarEstadoPedido(id,{estado:'X'}); mostrarMensaje(region,'Pedido cancelado.','exito'); await listar(); }catch(err){ mostrarMensaje(region, err.mensaje||'No se pudo cancelar.','error'); } }
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', iniciarPedidosAdmin); else iniciarPedidosAdmin();
