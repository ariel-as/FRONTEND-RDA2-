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
  PES: 'Zona de pesas con máquinas y peso libre para trabajar fuerza en todos los niveles.',
  CAR: 'Equipos de cardio para mejorar tu resistencia y quemar calorías a tu ritmo.',
  BOX: 'Clases de boxeo para aprender técnica, ganar condición física y liberar estrés.',
  BAI: 'Bailoterapia con música y coreografías sencillas, ideal para moverte y divertirte.',
  RUT: 'Rutinas personalizadas según tu nivel y objetivos, ajustadas por nuestros entrenadores.',
  NUT: 'Asesoría nutricional con profesionales aliados para complementar tu entrenamiento.'
};

export function rutaImagen(relativa) {
  return `assets/img/${relativa}`;
}
