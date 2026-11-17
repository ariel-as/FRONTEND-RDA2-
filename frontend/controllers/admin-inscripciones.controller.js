import './admin.controller.js';
import { adminModel } from '../models/admin.model.js';
import { iniciarPantalla } from './admin-generico.controller.js';
import { escapar } from '../views/componentes.view.js';

let planes = new Map();
let clientes = new Map();

async function cargarCatalogos() {
  const [respuestaPlanes, respuestaClientes] = await Promise.all([
    adminModel.tablaOpciones('membresia').catch(() => []),
    adminModel.tablaOpciones('cliente').catch(() => [])
  ]);
  planes = new Map((respuestaPlanes || []).map((o) => [String(o.valor ?? o.id), o.texto ?? o.descripcion]));
  clientes = new Map((respuestaClientes || []).map((o) => [String(o.valor ?? o.id), o.texto ?? o.descripcion]));
}

cargarCatalogos();

iniciarPantalla({
  raiz: '#pantalla-inscripciones',
  tabla: 'inscripcion',
  titulo: 'Inscripciones',
  soloLectura: true,
  columnas: ['id', 'membresiaId', 'titular', 'fechaInicio', 'fechaFin', 'valor', 'porcentajeIva', 'canal', 'estado'],
  etiquetas: { id: 'Número', membresiaId: 'Plan', porcentajeIva: 'IVA %', titular: 'Titular' },
  accionesFila: (fila, clave) => `<button type="button" class="btn btn-sm btn-outline-primary" data-ver="${escapar(clave)}" aria-label="Ver detalle de la inscripción ${escapar(fila.id)}">Ver detalle</button>`,
  formatoCelda: {
    membresiaId: (valor, fila) => escapar(fila.__plan || planes.get(String(valor)) || valor || ''),
    titular: (valor, fila) => escapar(fila.__titular || 'Sin integrantes'),
    canal: (valor) => escapar(valor === 'W' ? 'Web' : valor === 'L' ? 'Local' : valor || ''),
    estado: (valor, fila) => {
      if (fila.canal === 'W' && valor === 'P') return '<span class="text-warning-emphasis fw-semibold">Pendiente de pago (web, cobrar en recepción)</span>';
      return escapar({ P: 'Pendiente de pago', A: 'Activa', V: 'Vencida o tarjeta agotada', S: 'Suspendida', X: 'Anulada' }[valor] || valor || 'vacío');
    }
  },
  completarFilas: async (filas) => {
    await Promise.all(filas.map(async (fila) => {
      fila.__plan = planes.get(String(fila.membresiaId));
      try {
        const respuesta = await adminModel.tablaFilas('inscripcion_cliente', { inscripcionId: fila.id, limit: 100 });
        const integrantes = respuesta?.data || respuesta || [];
        const titular = integrantes.find((i) => i.esTitular === 'S') || integrantes[0];
        fila.__titular = titular ? (clientes.get(String(titular.clienteId)) || titular.clienteId) : '';
      } catch { fila.__titular = ''; }
    }));
  },
  detalle: async (fila) => {
    try {
      const respuesta = await adminModel.tablaFilas('inscripcion_cliente', { inscripcionId: fila.id, limit: 100 });
      const integrantes = respuesta?.data || respuesta || [];
      const filas = integrantes.length ? integrantes.map((i) => `<tr><th scope="row">${escapar(clientes.get(String(i.clienteId)) || i.clienteId)}</th><td>${escapar(i.esTitular === 'S' ? 'Titular' : 'Beneficiario')}</td></tr>`).join('') : '<tr><td colspan="2" class="text-body-secondary">Sin integrantes registrados.</td></tr>';
      return `<h3 class="h6 mt-4">Integrantes</h3><div class="table-responsive"><table class="table table-sm"><caption class="visually-hidden">Integrantes de la inscripción</caption><thead><tr><th scope="col">Cliente</th><th scope="col">Rol</th></tr></thead><tbody>${filas}</tbody></table></div>`;
    } catch {
      return '<p class="small text-body-secondary mt-3">No se pudieron cargar los integrantes.</p>';
    }
  }
});
