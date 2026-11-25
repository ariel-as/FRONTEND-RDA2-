export const NOMBRE_DB = 'PlanetaFitnessDB';
export const VERSION_DB = 3;

export const ALMACENES = {
  productos: 'productos',
  planes: 'planes',
  clases: 'clases',
  entrenadores: 'entrenadores'
};

const ALMACEN_POR_ARCHIVO = {
  productos: ALMACENES.productos,
  planes: ALMACENES.planes,
  clases: ALMACENES.clases,
  entrenadores: ALMACENES.entrenadores
};

let conexionPromise = null;

export function abrirBase() {
  if (conexionPromise) return conexionPromise;
  conexionPromise = new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_DB, VERSION_DB);
    solicitud.onupgradeneeded = (evento) => {
      const db = evento.target.result;
      for (const nombre of Object.values(ALMACENES)) {
        if (!db.objectStoreNames.contains(nombre)) db.createObjectStore(nombre, { keyPath: 'id' });
      }
      for (const viejo of ['pedidos', 'citas']) {
        if (db.objectStoreNames.contains(viejo)) db.deleteObjectStore(viejo);
      }
    };
    solicitud.onsuccess = () => {
      const db = solicitud.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    solicitud.onerror = () => reject(solicitud.error);
    solicitud.onblocked = () => reject(new Error('IndexedDB está bloqueada por otra pestaña.'));
  }).catch((error) => { conexionPromise = null; throw error; });
  return conexionPromise;
}

function valorDe(peticion) {
  return peticion && typeof peticion === 'object' && 'result' in peticion ? peticion.result : peticion;
}

async function ejecutar(almacen, modo, operacion) {
  const db = await abrirBase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(almacen, modo);
    const store = tx.objectStore(almacen);
    let resultado;
    try { resultado = operacion(store); } catch (error) { reject(error); return; }
    tx.oncomplete = () => resolve(valorDe(resultado));
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function limpiarAlmacen(almacen) {
  return ejecutar(almacen, 'readwrite', (store) => store.clear());
}
export async function guardarLote(almacen, registros) {
  await limpiarAlmacen(almacen);
  return ejecutar(almacen, 'readwrite', (store) => { registros.forEach((r) => store.put(r)); });
}
export function leerTodos(almacen) {
  return ejecutar(almacen, 'readonly', (store) => store.getAll());
}
export function guardarCatalogo(nombreArchivo, datos) {
  const almacen = ALMACEN_POR_ARCHIVO[nombreArchivo];
  if (!almacen) return Promise.reject(new Error(`No existe almacén para "${nombreArchivo}".`));
  return guardarLote(almacen, datos);
}
export function leerCatalogo(nombreArchivo) {
  const almacen = ALMACEN_POR_ARCHIVO[nombreArchivo];
  if (!almacen) return Promise.reject(new Error(`No existe almacén para "${nombreArchivo}".`));
  return leerTodos(almacen);
}
