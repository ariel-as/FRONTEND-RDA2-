import { obtenerProductos, obtenerPlanes, obtenerClases, obtenerEntrenadores, obtenerGimnasio, enviarContacto } from '../models/catalogo.model.js';
import { carrito } from '../models/carrito.model.js';
import { escapar, mostrarAviso, renderizar, vacio, tarjetaProducto, tarjetaPlan, tarjetaClase, tarjetaEntrenador, tarjetaServicio, seccionCategoriaTienda } from '../views/componentes.view.js';
import { construirValidador, mostrarMensaje, mostrarErroresServidor } from './validacion.controller.js';

function select(s){ return document.querySelector(s); }
let productosActuales = [];
let planesActuales = [];
let eventosCatalogoIniciados = false;
let eventoReintentoIniciado = false;
let contactoIniciado = false;

function mostrarErrorCatalogo(contenedor, mensaje) {
  contenedor.innerHTML = `<div class="pf-mensaje" data-tipo="error" role="alert"><p>${escapar(mensaje || 'No se pudo cargar el catálogo.')}</p><button class="pf-boton pf-boton-secundario" type="button" data-reintentar-catalogo>Reintentar carga</button></div>`;
}

function iniciarEventosCatalogo() {
  if (eventosCatalogoIniciados) return;
  eventosCatalogoIniciados = true;
  const tienda = select('[data-catalogo]');
  tienda?.addEventListener('click', (e)=>{
    const boton = e.target.closest('[data-accion="agregar"]');
    if (!boton) return;
    const producto = productosActuales.find((p)=> String(p.id) === String(boton.dataset.id));
    if (!producto || producto.disponible === false || Number(producto.stock || 0) <= 0) { mostrarAviso('Este producto no está disponible.', 'error'); return; }
    carrito.agregar({ ...producto, tipo: 'producto' }, 1);
    mostrarAviso(`${producto.nombre} se agregó al carrito.`, 'exito');
  });
  const planes = select('[data-planes]');
  planes?.addEventListener('click', (e)=>{
    const boton = e.target.closest('[data-accion="elegir-plan"]');
    if (!boton) return;
    const plan = planesActuales.find((p)=> String(p.id) === String(boton.dataset.planId));
    if (!plan) return;
    carrito.agregar({ id: plan.id, nombre: plan.nombre, precio: plan.precio, imagen: plan.imagen, tipo: 'plan', membresiaId: plan.id }, 1);
    mostrarAviso(`${plan.nombre} se agregó al carrito.`, 'exito');
  });
}

function iniciarEventoReintento() {
  if (eventoReintentoIniciado) return;
  eventoReintentoIniciado = true;
  document.addEventListener('click', (evento)=>{
    if (!evento.target.closest('[data-reintentar-catalogo]')) return;
    select('[data-catalogo]')?.setAttribute('aria-busy', 'true');
    select('[data-planes]')?.setAttribute('aria-busy', 'true');
    iniciarInicio();
  });
}

function alinearConHash(){
  const id = window.location.hash.slice(1);
  const destino = id && document.getElementById(decodeURIComponent(id));
  if (!destino) return;
  const encabezado = select('.pf-encabezado');
  const top = Math.max(window.scrollY + destino.getBoundingClientRect().top - (encabezado?.offsetHeight || 0), 0);
  window.scrollTo({ top, left: 0, behavior: 'instant' });
}

export async function iniciarInicio(){
  iniciarEventosCatalogo();
  iniciarEventoReintento();
  try {
    const [productos, planes, clases, entrenadores, gimnasio] = await Promise.all([
      obtenerProductos(), obtenerPlanes(), obtenerClases(), obtenerEntrenadores(), obtenerGimnasio()
    ]);
    productosActuales = productos.datos || [];
    planesActuales = planes.datos || [];
    pintarProductos(productos);
    pintarPlanes(planes);
    pintarClases(clases, entrenadores.datos || []);
    pintarEntrenadores(entrenadores);
    pintarServicios(gimnasio);
    anunciarOrigenDatos([productos, planes, clases, entrenadores, gimnasio]);
    if (!contactoIniciado) { iniciarContacto(); contactoIniciado = true; }
  } catch (e) {
    console.error(e);
    [select('[data-catalogo]'), select('[data-planes]')].filter(Boolean).forEach((contenedor)=>mostrarErrorCatalogo(contenedor, 'Ocurrió un error al cargar el catálogo.'));
    mostrarAviso('Ocurrió un error al cargar la página.', 'error');
  } finally {
    select('[data-catalogo]')?.setAttribute('aria-busy', 'false');
    select('[data-planes]')?.setAttribute('aria-busy', 'false');
    if (location.hash) {
      requestAnimationFrame(() => {
        alinearConHash();
        document.documentElement.classList.remove('pf-posicion-pendiente');
      });
    }
  }
}

function anunciarOrigenDatos(resultados) {
  const avisos = resultados
    .filter((resultado) => resultado?.origen === 'error' || resultado?.origen === 'indexeddb' || resultado?.error)
    .map((resultado) => resultado.mensaje || 'No se pudieron cargar algunos datos.');
  if (avisos.length) mostrarAviso([...new Set(avisos)].join(' '), avisos.some((mensaje) => /no se pudieron|error/i.test(mensaje)) ? 'error' : 'info');
}

function pintarProductos(resultado){
  const cont = select('[data-catalogo]'); if(!cont) return;
  cont.setAttribute('aria-busy','false');
  if (resultado.origen === 'error') { mostrarErrorCatalogo(cont, resultado.mensaje); return; }
  const msg = select('#mensaje-catalogo');
  if (resultado.origen === 'indexeddb' && msg){ msg.textContent = resultado.mensaje; msg.hidden = false; }
  if (!resultado.datos.length){ cont.innerHTML = vacio('No hay productos disponibles por ahora.'); return; }
  const porCat = {};
  resultado.datos.forEach(p=>{ const c=p.categoria||p.categoriaId||'Productos'; (porCat[c]=porCat[c]||[]).push(p); });
  renderizar(cont, Object.entries(porCat).map(([categoria, productos])=> seccionCategoriaTienda({categoria, productos})));
}

function pintarPlanes(resultado){
  const cont = select('[data-planes]'); if(!cont) return;
  cont.setAttribute('aria-busy','false');
  if (resultado.origen === 'error') { mostrarErrorCatalogo(cont, resultado.mensaje); return; }
  if (!resultado.datos.length){ cont.innerHTML = vacio('No hay planes disponibles por ahora.'); return; }
  renderizar(cont, resultado.datos.map(tarjetaPlan));
}
function pintarClases(resultado, entrenadores){
  const cont = select('[data-clases]'); if(!cont) return;
  cont.setAttribute('aria-busy','false');
  if (!resultado.datos.length){ cont.innerHTML = vacio('No hay clases disponibles por ahora.'); return; }
  renderizar(cont, resultado.datos.map(c=>{
    const ent = entrenadores.find(e=> String(e.id)===String(c.entrenadorId)) || c.entrenador;
    return tarjetaClase(c, ent);
  }));
}
function pintarEntrenadores(resultado){
  const cont = select('[data-entrenadores]'); if(!cont) return;
  if (!resultado.datos.length){ cont.innerHTML = vacio('No hay entrenadores disponibles por ahora.'); return; }
  renderizar(cont, resultado.datos.map(tarjetaEntrenador));
}
function pintarServicios(gimnasio){
  const cont = select('[data-servicios]'); if(!cont || !gimnasio?.servicios?.length) return;
  renderizar(cont, gimnasio.servicios.map(tarjetaServicio));
}

function iniciarContacto(){
  const formulario = select('#formulario-contacto'); if(!formulario) return;
  const region = select('#mensaje-contacto');
  construirValidador(formulario, { alEnviar: async ()=>{
    try {
      const datos = Object.fromEntries(new FormData(formulario));
      await enviarContacto({ nombre: datos.nombre, correo: datos.correo, telefono: datos.telefono || undefined, mensaje: datos.mensaje });
      formulario.reset();
      mostrarMensaje(region, 'Mensaje enviado correctamente. Te responderemos pronto.', 'exito');
    } catch (error){
      if (error.status === 400){ mostrarErroresServidor(formulario, error); mostrarMensaje(region, error.mensaje || 'Revisa los campos marcados.', 'error'); return false; }
      mostrarMensaje(region, error.mensaje || 'No se pudo enviar el mensaje.', 'error'); return false;
    }
  }});
}
