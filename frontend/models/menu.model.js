/*
 * Único lugar donde se define el menú del panel administrativo.
 * Cada entrada: texto visible, página dentro de admin/, grupo del menú y
 * permiso necesario (grupo de la matriz de permisos; ver permisos.model.js).
 * La vista menu.view.js lo pinta en todas las páginas de admin/ y cada página
 * revisa aquí su permiso al cargar.
 */

export const GRUPOS_MENU = ['Recepción', 'Inventario', 'Gimnasio', 'Administración', 'Contabilidad', 'Comunicación'];

export const INICIO_PANEL = { texto: 'Dashboard', pagina: 'index.html', permiso: null };

export const MENU_ADMIN = [
  { texto: 'Entradas y aforo', pagina: 'entradas.html', grupo: 'Recepción', permiso: 'entradas' },
  { texto: 'Inscripciones', pagina: 'inscripciones.html', grupo: 'Recepción', permiso: 'inscripciones' },
  { texto: 'Clientes', pagina: 'clientes.html', grupo: 'Recepción', permiso: 'clientes' },
  { texto: 'Pedidos web', pagina: 'pedidos.html', grupo: 'Recepción', permiso: 'pedidos' },
  { texto: 'Ventas en mostrador', pagina: 'ventas.html', grupo: 'Recepción', permiso: 'ventas' },
  { texto: 'Caja', pagina: 'caja.html', grupo: 'Recepción', permiso: 'caja' },
  { texto: 'Productos', pagina: 'productos.html', grupo: 'Inventario', permiso: 'inventario' },
  { texto: 'Lotes y kárdex', pagina: 'inventario.html', grupo: 'Inventario', permiso: 'inventario' },
  { texto: 'Compras', pagina: 'compras.html', grupo: 'Inventario', permiso: 'compras' },
  { texto: 'Planes y promociones', pagina: 'membresias.html', grupo: 'Gimnasio', permiso: 'planes' },
  { texto: 'Clases', pagina: 'clases.html', grupo: 'Gimnasio', permiso: 'clases' },
  { texto: 'Rutinas', pagina: 'rutinas.html', grupo: 'Gimnasio', permiso: 'rutinas' },
  { texto: 'Personal', pagina: 'personal.html', grupo: 'Gimnasio', permiso: ['empleados', 'asistencia'] },
  { texto: 'Aliados y comisiones', pagina: 'aliados.html', grupo: 'Gimnasio', permiso: 'aliados' },
  { texto: 'Usuarios', pagina: 'usuarios.html', grupo: 'Administración', permiso: 'usuarios' },
  { texto: 'Datos del gimnasio', pagina: 'gimnasio.html', grupo: 'Administración', permiso: 'gimnasio' },
  { texto: 'Otras tablas', pagina: 'tablas.html', grupo: 'Administración', permiso: 'tablas' },
  { texto: 'Cierres de caja', pagina: 'caja.html#cierres', grupo: 'Contabilidad', permiso: 'caja' },
  { texto: 'Facturas', pagina: 'facturas.html', grupo: 'Contabilidad', permiso: 'facturacion' },
  { texto: 'Reportes', pagina: 'reportes.html', grupo: 'Contabilidad', permiso: 'reportes' },
  { texto: 'Mensajes de contacto', pagina: 'mensajes.html', grupo: 'Comunicación', permiso: 'mensajes' },
  { texto: 'Notificaciones', pagina: 'notificaciones.html', grupo: 'Comunicación', permiso: null }
];

// Entrada que controla el acceso a una página (la primera que la nombra sin ancla).
export function entradaDePagina(pagina) {
  const archivo = String(pagina || '').split(/[?#]/)[0] || 'index.html';
  if (archivo === INICIO_PANEL.pagina) return INICIO_PANEL;
  return MENU_ADMIN.find((e) => e.pagina.split('#')[0] === archivo) || null;
}

// Menú agrupado y filtrado con la función de permisos que se le pase.
export function menuVisible(puede) {
  return GRUPOS_MENU
    .map((grupo) => ({ grupo, entradas: MENU_ADMIN.filter((e) => e.grupo === grupo && puede(e.permiso)) }))
    .filter((g) => g.entradas.length);
}
