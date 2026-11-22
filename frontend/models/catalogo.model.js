import { api } from './api.model.js';
import { guardarCatalogo, leerCatalogo } from './indexeddb.model.js';
import { registrarActualizacion } from './storage.model.js';
import { imagenProducto, imagenPlan, imagenClase, imagenServicio, presentacionEntrenador, productoDestacado, rutaImagen } from './presentacion.model.js';

function es404(error) { return error?.status === 404; }
function debeUsarRespaldo(error) { return error?.status === 0 || error?.status >= 500; }

async function cargarColeccion(nombre, path, transformar) {
  try {
    const data = await api.get(path);
    const lista = Array.isArray(data) ? data : (data?.data || data?.items || []);
    const efectivos = lista.map(transformar);
    await guardarCatalogo(nombre, efectivos).catch(() => {});
    registrarActualizacion();
    return { datos: efectivos, origen: 'api', mensaje: `Datos de ${nombre} cargados desde la API.` };
  } catch (error) {
    if (debeUsarRespaldo(error)) {
      try {
        const guardados = await leerCatalogo(nombre);
        if (guardados.length) {
          return { datos: guardados, origen: 'indexeddb', mensaje: `Sin conexión: se muestra la copia guardada de ${nombre}.` };
        }
      } catch {}
    }
    return { datos: [], origen: 'error', mensaje: error.mensaje || `No se pudieron cargar ${nombre}.`, error };
  }
}

export function obtenerProductos() {
  return cargarColeccion('productos', '/productos?limit=100', (p) => ({
    ...p,
    id: String(p.id),
    precioSinIva: Number(p.precio),
    precio: Number(p.precioConIva ?? p.precio),
    porcentajeIva: Number(p.porcentajeIva ?? 0),
    imagen: rutaImagen(imagenProducto(p.id)),
    destacado: productoDestacado.has(String(p.id)),
    disponible: p.disponible !== false && Number(p.stock ?? 0) > 0,
    stock: Number(p.stock ?? 0)
  }));
}

export function obtenerPlanes() {
  return cargarColeccion('planes', '/membresias', (m) => ({
    ...m,
    id: String(m.id),
    membresiaId: String(m.id),
    precioSinIva: Number(m.precio),
    precio: Number(m.precioConIva ?? m.precio),
    porcentajeIva: Number(m.porcentajeIva ?? 0),
    personas: m.personas ?? m.numPersonas ?? 1,
    beneficios: m.beneficios || [],
    imagen: rutaImagen(imagenPlan(m.id)),
    tipo: 'plan'
  }));
}

export function obtenerClases() {
  return cargarColeccion('clases', '/clases', (c) => ({
    ...c,
    id: String(c.id),
    entrenadorId: c.entrenador?.id || c.empleadoId || c.entrenadorId || '',
    imagen: rutaImagen(imagenClase(c.id))
  }));
}

export function obtenerEntrenadores() {
  return cargarColeccion('entrenadores', '/entrenadores', (e) => {
    const pres = presentacionEntrenador(e.id);
    return {
      ...e,
      id: String(e.id),
      nombre: e.nombre || `${e.nombres || ''} ${e.apellidos || ''}`.trim(),
      imagen: rutaImagen(pres.imagen),
      descripcion: pres.descripcion || e.descripcion || '',
      claseIds: e.claseIds || []
    };
  });
}

export async function obtenerGimnasio() {
  try {
    const data = await api.get('/gimnasio');
    const servicios = (data?.servicios || []).map((s) => ({ ...s, imagen: rutaImagen(imagenServicio(s.id || s.codigo)) }));
    return { ...data, servicios };
  } catch (error) {
    return { error: true, mensaje: error.mensaje, servicios: [], horarios: [] };
  }
}

export async function obtenerNiveles() {
  try { return await api.get('/niveles'); } catch { return []; }
}
export async function obtenerAliados() {
  try { return await api.get('/aliados'); } catch { return []; }
}
export async function enviarContacto(payload) {
  return api.post('/contacto', payload);
}
