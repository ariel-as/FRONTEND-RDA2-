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
  '1700000019': { imagen: 'entrenadores/entrenador-1.jpg', descripcion: 'Especialista en boxeo, enfocado en técnica y acondicionamiento físico.' },
  '1700000027': { imagen: 'entrenadores/entrenador-2.jpg', descripcion: 'Instructora de bailoterapia con rutinas dinámicas y de alta energía.' },
  '1700000035': { imagen: 'entrenadores/entrenador-3.jpg', descripcion: 'Entrenador de rutinas personalizadas según tu nivel y objetivos.' }
};

export function presentacionEntrenador(id) {
  return ENTRENADORES[String(id)] || { imagen: 'entrenadores/entrenador-1.jpg', descripcion: '' };
}

export function rutaImagen(relativa) {
  return `assets/img/${relativa}`;
}
