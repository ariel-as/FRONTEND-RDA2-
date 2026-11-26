import './admin.controller.js';
import { iniciarPantalla } from './admin-generico.controller.js';
import { adminMembresiasModel } from '../models/fase2.model.js';
import { formatearPrecio } from '../models/carrito.model.js';

const SI_NO = { S: 'Sí', N: 'No' };
const ESTADO_PLAN = { A: 'Activo', I: 'Inactivo' };
const ESTADO_SERVICIO = { A: 'Activo', S: 'Suspendido' };

iniciarPantalla({
  raiz: '#pantalla-membresia',
  tabla: 'membresia',
  titulo: 'Planes',
  cargarFilas: () => adminMembresiasModel.listar(),
  columnas: ['id', 'nombre', 'tipo', 'duracion', 'numIngresos', 'numPersonas', 'precio', 'pagaIva', 'publicarWeb', 'estado'],
  etiquetas: { id: 'Código', numPersonas: 'Personas', numIngresos: 'Ingresos', publicarWeb: 'En la web' },
  ayudas: { precio: 'Escribe el precio sin IVA. La tabla muestra el precio con IVA calculado.' },
  formatoCelda: { numIngresos: (valor, fila) => (fila.tipo === 'T' ? 'No aplica' : (valor ?? 'No aplica')),
    precio: (valor, fila) => `${formatearPrecio(fila.precioConIva ?? valor)} (con IVA)` },
  defaults: { tipo: 'T', pagaIva: 'S', incluyeRutina: 'S', esEstudiantil: 'N', publicarWeb: 'S', estado: 'A', numPersonas: 1 },
  opcionesFijas: {
    tipo: { T: 'Por tiempo: diario, mensual, anual', I: 'Por ingresos: tarjeta de 30 ingresos' },
    unidadDuracion: { D: 'Días', M: 'Meses calendario' },
    pagaIva: SI_NO,
    incluyeRutina: SI_NO,
    esEstudiantil: SI_NO,
    publicarWeb: SI_NO,
    estado: ESTADO_PLAN
  },
  relaciones: [
    {
      tabla: 'membresia_servicio',
      titulo: 'Servicios incluidos (solo servicios internos)',
      idLocal: 'membresiaId',
      idRemoto: 'servicioId',
      opcionesTabla: 'servicio',
      filtrarOpciones: (opciones) => opciones.filter((o) => !o.tipo || o.tipo === 'I')
    },
    {
      tabla: 'membresia_promocion',
      titulo: 'Promociones que aplican al plan',
      idLocal: 'membresiaId',
      idRemoto: 'promocionId',
      opcionesTabla: 'promocion'
    }
  ],
  alPrepararFormulario: (formulario) => {
    const tipo = formulario.querySelector('[name="tipo"]');
    const duracion = formulario.querySelector('[data-campo="duracion"]');
    const unidad = formulario.querySelector('[data-campo="unidadDuracion"]');
    const ingresos = formulario.querySelector('[data-campo="numIngresos"]');
    const aplicar = () => {
      const porTiempo = tipo?.value !== 'I';
      if (duracion) duracion.hidden = !porTiempo;
      if (unidad) unidad.hidden = !porTiempo;
      if (ingresos) ingresos.hidden = porTiempo;
    };
    tipo?.addEventListener('change', aplicar);
    aplicar();
  },
  mensajeExito: 'Plan guardado.'
});

iniciarPantalla({
  raiz: '#pantalla-servicio',
  tabla: 'servicio',
  titulo: 'Servicios',
  columnas: ['id', 'nombre', 'descripcion', 'tipo', 'estado'],
  etiquetas: { id: 'Código' },
  defaults: { tipo: 'I', estado: 'A' },
  opcionesFijas: {
    tipo: { I: 'Interno del gimnasio', A: 'Ofrecido por un profesional aliado' },
    estado: ESTADO_SERVICIO
  },
  mensajeExito: 'Servicio guardado.'
});

iniciarPantalla({
  raiz: '#pantalla-promocion',
  tabla: 'promocion',
  titulo: 'Promociones',
  columnas: ['id', 'descripcion', 'fechaIni', 'fechaFin', 'porcentaje', 'requiereAutoriz'],
  etiquetas: { id: 'Número', fechaIni: 'Inicio', fechaFin: 'Fin', requiereAutoriz: 'Requiere autorización' },
  defaults: { requiereAutoriz: 'N' },
  opcionesFijas: { requiereAutoriz: SI_NO },
  relaciones: [
    {
      tabla: 'membresia_promocion',
      titulo: 'Planes a los que aplica',
      idLocal: 'promocionId',
      idRemoto: 'membresiaId',
      opcionesTabla: 'membresia'
    }
  ],
  mensajeExito: 'Promoción guardada.'
});
