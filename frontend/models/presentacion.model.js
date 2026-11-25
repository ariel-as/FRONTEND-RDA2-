export function imagenProducto(id) {
  const mapa = {
    PF0001: 'productos/whey-protein.jpg',
    PF0002: 'productos/whey-protein-2lb-chocolate.jpg',
    PF0003: 'productos/creatina.jpg',
    PF0004: 'productos/barra-proteica.jpg',
    PF0005: 'productos/short-deportivo.jpg',
    PF0006: 'productos/short-gymshark.jpg',
    PF0007: 'productos/buzo-compresion.jpg',
    PF0008: 'productos/straps.jpg',
    PF0009: 'productos/munequeras.jpg',
    PF0010: 'productos/cinturon-cuero.jpg'
  };
  return mapa[String(id)] || 'productos/generico.svg';
}
export const productoDestacado = new Set(['PF0001', 'PF0002', 'PF0003']);

export function imagenPlan(id) {
  const mapa = { MI1: 'gimnasio/pesas.jpg', MI2: 'gimnasio/cardio.jpg', MI3: 'gimnasio/hero-gimnasio.jpg' };
  return mapa[String(id)] || 'gimnasio/pesas.jpg';
}

export function imagenClase(id) {
  const mapa = { '1': 'clases/boxeo.jpg', '2': 'clases/bailoterapia.jpg', 1: 'clases/boxeo.jpg', 2: 'clases/bailoterapia.jpg' };
  return mapa[String(id)] || 'gimnasio/hero-gimnasio.jpg';
}

export function imagenServicio(id) {
  const mapa = {
    PES: 'gimnasio/pesas.jpg', CAR: 'gimnasio/cardio.jpg', BOX: 'clases/boxeo.jpg',
    BAI: 'clases/bailoterapia.jpg', RUT: 'gimnasio/hero-gimnasio.jpg', NUT: 'gimnasio/nutricion.jpg'
  };
  return mapa[String(id)] || 'gimnasio/hero-gimnasio.jpg';
}

const ENTRENADORES = {
  '1700000019': { imagen: 'clases/boxeo.jpg', descripcion: 'Especialista en boxeo, enfocado en técnica y acondicionamiento físico.' },
  '1700000027': { imagen: 'clases/bailoterapia.jpg', descripcion: 'Instructora de bailoterapia con rutinas dinámicas y de alta energía.' },
  '1700000035': { imagen: 'gimnasio/pesas.jpg', descripcion: 'Entrenador de rutinas personalizadas según tu nivel y objetivos.' }
};
// Imagen acorde a la especialidad mientras no haya fotos reales; sin coincidencia no se presta la foto de otro entrenador.
const POR_ESPECIALIDAD = [[/box/i, 'clases/boxeo.jpg'], [/bail|danza|baile/i, 'clases/bailoterapia.jpg'], [/rutin|pesa|fuerza|muscul/i, 'gimnasio/pesas.jpg'], [/cardio/i, 'gimnasio/cardio.jpg'], [/nutri/i, 'gimnasio/nutricion.jpg']];

export function presentacionEntrenador(id, especialidad = '') {
  const fijo = ENTRENADORES[String(id)];
  if (fijo) return fijo;
  const imagen = POR_ESPECIALIDAD.find(([r]) => r.test(String(especialidad)))?.[1] || null;
  return { imagen, descripcion: '' };
}

// Descripciones de respaldo cuando la API solo envía el nombre del servicio.
export const DESCRIPCION_SERVICIO = {
  PES: 'Zona de pesas con máquinas y área libre de entrenamiento.',
  CAR: 'Máquinas de cardio para trabajar resistencia.',
  BOX: 'Clase dirigida en el segundo piso del gimnasio.',
  BAI: 'Clase de baile que se realiza con entrenador.',
  RUT: 'Rutinas indicadas según nivel: principiante, intermedio o avanzado.',
  NUT: 'Evaluación, análisis personalizado y asesoría nutricional mediante cita.'
};

export function descripcionServicio(servicio = {}) {
  const descripcion = String(servicio.descripcion ?? '').trim();
  const nombre = String(servicio.nombre ?? '').trim();
  if (descripcion && descripcion.toLocaleLowerCase('es') !== nombre.toLocaleLowerCase('es')) return descripcion;
  return DESCRIPCION_SERVICIO[servicio.id ?? servicio.codigo] || '';
}

export function rutaImagen(relativa) {
  return `assets/img/${relativa}`;
}
