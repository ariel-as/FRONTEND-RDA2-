import './admin.controller.js';
import { gimnasioModel, lista } from '../models/fase2.model.js';
import { puede } from '../models/permisos.model.js';
import { escapar } from '../views/componentes.view.js';
import { construirValidador, mostrarMensaje, mostrarErroresServidor } from './validacion.controller.js';

const region = document.querySelector('[data-mensaje]');
const form = document.querySelector('#form-gimnasio');
const formHorario = document.querySelector('#form-horario');
const editable = puede('gimnasio:editar');
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const NUMERICOS = new Set(['aforoMax', 'porcentajeIva']);

async function cargarDatos() {
  try {
    const r = await gimnasioModel.leer();
    const g = r?.data ?? r ?? {};
    [...form.elements].forEach((c) => { if (c.name && g[c.name] !== undefined && g[c.name] !== null) c.value = g[c.name]; if (c.name) c.readOnly = !editable; });
  } catch (error) { mostrarMensaje(region, error.mensaje || 'No se pudieron cargar los datos del gimnasio.', 'error'); }
  finally { form.setAttribute('aria-busy', 'false'); }
}

async function cargarHorario() {
  const cont = formHorario.querySelector('[data-horario]');
  try {
    const dias = lista(await gimnasioModel.horario());
    const porDia = new Map(dias.map((d) => [String(d.dia).toLowerCase(), d]));
    const filas = DIAS.map((dia, i) => {
      const d = porDia.get(dia.toLowerCase()) || {};
      const dis = editable ? '' : 'disabled';
      return `<tr><th scope="row">${dia}<input type="hidden" name="dia-${i}" value="${dia}"></th>
        <td><input class="form-check-input" type="checkbox" id="abierto-${i}" name="abierto-${i}" ${d.abierto === 'N' ? '' : 'checked'} ${dis}><label class="visually-hidden" for="abierto-${i}">${dia} abierto</label></td>
        <td><label class="visually-hidden" for="apertura-${i}">Apertura del ${dia}</label><input class="form-control form-control-sm" type="time" id="apertura-${i}" name="apertura-${i}" value="${escapar(String(d.horaApertura || '').slice(0, 5))}" ${dis}></td>
        <td><label class="visually-hidden" for="cierre-${i}">Cierre del ${dia}</label><input class="form-control form-control-sm" type="time" id="cierre-${i}" name="cierre-${i}" value="${escapar(String(d.horaCierre || '').slice(0, 5))}" ${dis}></td></tr>`;
    }).join('');
    cont.innerHTML = `<div class="table-responsive"><table class="table table-sm align-middle"><caption class="visually-hidden">Horario de atención por día</caption><thead><tr><th scope="col">Día</th><th scope="col">Abierto</th><th scope="col">Apertura</th><th scope="col">Cierre</th></tr></thead><tbody>${filas}</tbody></table></div>`;
  } catch (error) { cont.innerHTML = `<p>${escapar(error.mensaje || 'No se pudo cargar el horario.')}</p>`; }
  finally { cont.setAttribute('aria-busy', 'false'); }
}

if (form && document.body.dataset.sinAcceso !== 'true') {
  construirValidador(form, {
    borrador: false,
    alEnviar: async () => {
      const body = {};
      [...form.elements].forEach((c) => { if (c.name && c.value !== '') body[c.name] = NUMERICOS.has(c.name) ? Number(c.value) : c.value.trim(); });
      try { await gimnasioModel.guardar(body); mostrarMensaje(region, 'Datos del gimnasio guardados.', 'exito'); return true; }
      catch (error) { mostrarErroresServidor(form, error); mostrarMensaje(region, error.mensaje || 'No se pudieron guardar los datos.', 'error'); return false; }
    }
  });
  formHorario.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = formHorario.elements;
    const dias = DIAS.map((dia, i) => {
      const abierto = f[`abierto-${i}`].checked;
      return { dia, abierto: abierto ? 'S' : 'N', horaApertura: abierto ? f[`apertura-${i}`].value || null : null, horaCierre: abierto ? f[`cierre-${i}`].value || null : null };
    });
    const incompleto = dias.findIndex((d) => d.abierto === 'S' && (!d.horaApertura || !d.horaCierre || d.horaApertura >= d.horaCierre));
    if (incompleto >= 0) { mostrarMensaje(region, `Revisa el horario del ${DIAS[incompleto]}: la apertura debe ser antes del cierre.`, 'error'); f[`apertura-${incompleto}`].focus(); return; }
    try { await gimnasioModel.guardarHorario(dias); mostrarMensaje(region, 'Horario de atención guardado.', 'exito'); }
    catch (error) { mostrarMensaje(region, error.mensaje || 'No se pudo guardar el horario.', 'error'); }
  });
  cargarDatos();
  cargarHorario();
}
