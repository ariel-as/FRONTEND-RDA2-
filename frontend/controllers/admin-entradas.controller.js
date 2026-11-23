import './admin.controller.js';
import { entradasModel, clientesModel } from '../models/fase2.model.js';
import { puede } from '../models/permisos.model.js';
import { escapar } from '../views/componentes.view.js';
import { txt, fecha } from '../views/lista-api.view.js';
import { mostrarMensaje, validarCedula } from './validacion.controller.js';
import { crearLista } from './lista-api.controller.js';
import { inscripcionesModel } from '../models/fase2.model.js';
import { adminModel } from '../models/admin.model.js';
import { crearPagos } from './pagos.controller.js';
import { abrirDialogo } from './dialogo.controller.js';
import { formatearPrecio } from '../models/carrito.model.js';

// Plan diario: el plan activo de un solo día o un solo ingreso.
async function planDiario() {
  try {
    const r = await adminModel.tablaFilas('membresia', { estado: 'A', limit: 100 });
    const planes = r?.data || r || [];
    return planes.find((p) => /diari|d[ií]a/i.test(p.nombre || '')) || planes.find((p) => p.unidadDuracion === 'D' && Number(p.duracion) === 1) || planes.find((p) => p.tipo === 'I' && Number(p.numIngresos) === 1) || null;
  } catch { return null; }
}

// Cobrar pase diario en un solo paso: alta rápida si hace falta, inscripción con cobro y entrada.
async function cobrarPaseDiario(cedula, existe) {
  const plan = await planDiario();
  if (!plan) { mostrarRechazo('No hay un plan diario activo. Créalo en Planes y promociones.'); return; }
  let pagos = null;
  const r = await abrirDialogo({
    titulo: 'Cobrar pase diario', mensaje: `${plan.nombre}: total estimado ${formatearPrecio(plan.precio)} (el servidor confirma el total).`, textoConfirmar: 'Cobrar y registrar entrada',
    campos: existe ? [] : [{ nombre: 'nombre', etiqueta: 'Nombres', requerido: true, maxlength: 60 }, { nombre: 'apellido', etiqueta: 'Apellidos', requerido: true, maxlength: 60 }],
    contenido: '<div data-contenedor-pagos></div>',
    alPreparar: (f) => { pagos = crearPagos(f.querySelector('[data-contenedor-pagos]'), { total: Number(plan.precio) || 0, id: 'pagos-pase' }); },
    validarExtra: () => (pagos.validar() ? null : 'Revisa la forma de pago.'),
    alFallar: (fallo, _, nodo) => pagos?.ajustarDesdeError(fallo, nodo),
    alConfirmar: async (v) => {
      if (!existe) await clientesModel.crear({ cedula, nombre: v.nombre.trim(), apellido: v.apellido.trim() });
      const ins = await inscripcionesModel.crear({ clienteId: cedula, membresiaId: String(plan.id), pagos: pagos.obtener() }).then((x) => x?.data ?? x);
      return ins;
    }
  });
  if (r?.resultado?.id) await registrar({ clienteId: cedula, inscripcionId: r.resultado.id }, cedula);
}

const region = document.querySelector('[data-mensaje]');
const rechazo = document.querySelector('[data-rechazo]');
const acceso = document.querySelector('[data-acceso]');
const form = document.querySelector('#form-cedula');
const campo = document.querySelector('#cedula-entrada');
const gestiona = puede('entradas:gestionar');

async function pintarAforo() {
  try {
    const a = await entradasModel.aforo().then((r) => r?.data ?? r);
    const pct = a.aforoMax ? Math.min(100, Math.round((a.personasAdentro / a.aforoMax) * 100)) : 0;
    const texto = `${a.personasAdentro} de ${a.aforoMax} personas`;
    document.querySelector('[data-aforo-texto]').textContent = `${texto}${a.disponible === 0 ? ' (aforo completo)' : ''}`;
    const barra = document.querySelector('[data-aforo-barra]');
    barra.setAttribute('aria-valuenow', String(pct));
    barra.setAttribute('aria-valuetext', `${texto}, ${pct} %`);
    barra.firstElementChild.style.width = `${pct}%`;
    barra.firstElementChild.textContent = `${pct} %`;
    barra.firstElementChild.className = `progress-bar ${pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning text-dark' : 'bg-success'}`;
  } catch (error) { document.querySelector('[data-aforo-texto]').textContent = error.mensaje || 'No se pudo consultar el aforo.'; }
}

function mostrarRechazo(texto) {
  rechazo.textContent = texto;
  rechazo.hidden = !texto;
}

async function registrar(cuerpo, nombre) {
  mostrarRechazo('');
  try {
    const r = await entradasModel.registrar(cuerpo).then((x) => x?.data ?? x);
    const restantes = r?.ingresosRestantes !== null && r?.ingresosRestantes !== undefined ? ` Le quedan ${r.ingresosRestantes} ingresos.` : '';
    mostrarMensaje(region, `Entrada registrada: ${r?.cliente || nombre}${r?.clase ? ` a ${r.clase}` : ''}.${restantes}`, 'exito');
    acceso.innerHTML = '';
    campo.value = '';
    campo.focus();
    await Promise.all([pintarAforo(), adentro?.recargar()]);
  } catch (error) {
    mostrarRechazo(`Entrada rechazada: ${error.mensaje || 'no se pudo registrar.'}`);
  }
}

async function consultar() {
  mostrarRechazo('');
  const cedula = campo.value.trim();
  acceso.innerHTML = '<p>Consultando…</p>';
  try {
    const r = await clientesModel.acceso(cedula).then((x) => x?.data ?? x);
    const ins = r.inscripciones || [];
    const nombre = r.cliente?.nombre || cedula;
    if (!ins.length) {
      acceso.innerHTML = '';
      mostrarRechazo(`${nombre} no tiene inscripciones activas.`);
      acceso.innerHTML = `<div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-primary" data-pase-diario>Cobrar pase diario</button><a class="btn btn-outline-primary" href="inscripciones.html?cedula=${encodeURIComponent(cedula)}">Vender un plan</a><a class="btn btn-outline-secondary" href="inscripciones.html?estado=P&canal=W&clienteId=${encodeURIComponent(cedula)}">Ver inscripciones web pendientes</a></div>`;
      acceso.querySelector('[data-pase-diario]').addEventListener('click', () => cobrarPaseDiario(cedula, true));
      return;
    }
    acceso.innerHTML = `<h3 class="h6">${escapar(nombre)}${r.cliente?.estado === 'I' ? ' (cliente inactivo)' : ''}</h3>` + ins.map((i, n) => `
      <div class="border rounded p-2 mb-2">
        <p class="mb-1"><strong>${escapar(i.plan || i.membresiaId)}</strong> · Fin: ${fecha(i.fechaFin)} · ${i.ingresosTotal ? `Ingresos que quedan: ${escapar(i.ingresosRestantes)} de ${escapar(i.ingresosTotal)}` : 'Ingresos ilimitados'}${i.suspendida ? ' · <strong>Suspendida</strong>' : ''}</p>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-success" data-entrar="${n}">Registrar entrada al gimnasio</button>
          ${(i.clasesHoy || []).map((c, k) => `<button type="button" class="btn btn-outline-success" data-entrar="${n}" data-clase="${k}">Entrada a ${escapar(c.clase)} (${escapar(String(c.horaInicio || '').slice(0, 5))})</button>`).join('')}
        </div>
      </div>`).join('');
    acceso.querySelectorAll('[data-entrar]').forEach((b) => b.addEventListener('click', () => {
      const i = ins[Number(b.dataset.entrar)];
      const c = b.dataset.clase !== undefined ? i.clasesHoy[Number(b.dataset.clase)] : null;
      registrar({ clienteId: cedula, inscripcionId: i.inscripcionId, ...(c ? { claseId: c.claseId, horarioId: c.horarioId } : {}) }, nombre);
    }));
    acceso.querySelector('[data-entrar]')?.focus();
  } catch (error) {
    acceso.innerHTML = '';
    if (error.status === 404) {
      mostrarRechazo('La cédula no está registrada.');
      acceso.innerHTML = `<div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-primary" data-pase-diario>Cobrar pase diario</button><a class="btn btn-outline-primary" href="clientes.html?cedula=${encodeURIComponent(cedula)}">Registrar cliente</a></div>`;
      acceso.querySelector('[data-pase-diario]').addEventListener('click', () => cobrarPaseDiario(cedula, false));
    } else mostrarRechazo(error.mensaje || 'No se pudo consultar la cédula.');
  }
}

const adentro = gestiona ? crearLista({
  raiz: '#pantalla-adentro', caption: 'Personas adentro', fijos: { abiertas: 'S' }, limite: 100,
  cargar: (p) => entradasModel.listar(p),
  columnas: [['Cliente', (e) => txt(typeof e.cliente === 'string' ? e.cliente : (e.cliente?.nombre || e.clienteId))], ['Ingreso', (e) => txt(String(e.horaIngreso || '').slice(0, 5) || fecha(e.fecha))], ['Clase', (e) => txt(typeof e.clase === 'string' ? e.clase : (e.clase?.nombre || (e.claseId ? `Clase ${e.claseId}` : 'Gimnasio')))]],
  acciones: (e) => [{ texto: 'Registrar salida', permiso: 'entradas:gestionar', etiqueta: `Registrar salida de ${typeof e.cliente === 'string' ? e.cliente : e.clienteId}`, ejecutar: async () => { await entradasModel.salida(e.id); pintarAforo(); return 'Salida registrada.'; } }]
}) : null;

if (document.body.dataset.sinAcceso !== 'true') {
  pintarAforo();
  window.setInterval(() => { pintarAforo(); adentro?.recargar(); }, 60000);
  if (form && gestiona) {
    campo.focus();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!campo.value.trim() || !validarCedula(campo)) { campo.focus(); return; }
      consultar();
    });
  }
}
