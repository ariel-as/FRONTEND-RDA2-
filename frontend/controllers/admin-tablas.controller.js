import './admin.controller.js';
import { adminModel } from '../models/admin.model.js';
import { iniciarPantalla } from './admin-generico.controller.js';
import { mostrarMensaje } from './validacion.controller.js';
import { escapar } from '../views/componentes.view.js';

const selector = document.querySelector('[data-selector-tabla]');
const raiz = document.querySelector('#pantalla-tabla');
const titulo = document.querySelector('#titulo-tabla');

function normalizar(entrada) {
  if (typeof entrada === 'string') return { tabla: entrada, grupo: 'Otros', lectura: false };
  return {
    tabla: entrada.tabla || entrada.nombre || entrada.id || '',
    grupo: entrada.grupo || entrada.modulo || entrada.moduloNombre || 'Otros',
    lectura: entrada.modo === 'lectura' || entrada.soloLectura === true || entrada.lectura === true || entrada.tipo === 'lectura'
  };
}

async function cargarSelector() {
  try {
    const respuesta = await adminModel.tablas();
    const lista = (Array.isArray(respuesta) ? respuesta : respuesta?.data || respuesta?.tablas || []).map(normalizar).filter((t) => t.tabla);
    if (!lista.length) throw new Error('La API no devolvió tablas.');
    const grupos = new Map();
    lista.forEach((tabla) => {
      if (!grupos.has(tabla.grupo)) grupos.set(tabla.grupo, []);
      grupos.get(tabla.grupo).push(tabla);
    });
    selector.innerHTML = '<option value="">Selecciona una tabla</option>' + [...grupos.entries()].map(([grupo, tablas]) => `<optgroup label="${escapar(grupo)}">${tablas.map((t) => `<option value="${escapar(t.tabla)}">${escapar(t.tabla)}${t.lectura ? ' (solo lectura)' : ''}</option>`).join('')}</optgroup>`).join('');
    return lista;
  } catch (error) {
    selector.innerHTML = '<option value="">No se pudieron cargar las tablas</option>';
    mostrarMensaje(raiz.querySelector('[data-mensaje]'), error.mensaje || 'No se pudieron cargar las tablas.', 'error');
    return [];
  }
}

async function iniciar() {
const lista = await cargarSelector();
const parametro = new URLSearchParams(window.location.search).get('tabla');
const elegida = lista.find((t) => t.tabla === parametro) || lista[0];

if (elegida) {
  selector.value = elegida.tabla;
  raiz.dataset.tabla = elegida.tabla;
  titulo.textContent = elegida.tabla + (elegida.lectura ? ' (solo lectura)' : '');
  iniciarPantalla({ raiz, tabla: elegida.tabla, titulo: elegida.tabla, soloLectura: elegida.lectura });
  document.querySelector('[data-recargar]')?.addEventListener('click', () => window.location.reload());
}

selector?.addEventListener('change', () => {
  const destino = new URL(window.location.href);
  if (selector.value) destino.searchParams.set('tabla', selector.value);
  else destino.searchParams.delete('tabla');
  window.location.href = destino.toString();
});
}

iniciar();
