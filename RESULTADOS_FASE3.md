# Resultados Fase 3 — Frontend

## Trabajo realizado

- **3.1 Inventario y alertas**
  - Vista de lotes con FEFO, tipo de inventario, días para caducar y situación de caducidad.
  - Columna de stock/situación en productos y filtros por lote, caducidad y alertas.
  - Tarjeta de alertas en el panel con enlaces a lotes por caducar, caducados con unidades y sin stock con mínimo.
  - Encabezado y migas de pan ajustados para no desplazar el contenido.
- **3.2 Stock en mostrador, tienda y carrito**
  - Ventas muestra el stock disponible y limita la cantidad por línea.
  - Tarjetas de producto y carrito muestran "Sin stock", "Quedan N" o "No disponible" y bloquean acciones cuando corresponde.
  - El modelo de carrito impide agregar productos sin stock y ajusta la cantidad al máximo disponible.
  - Checkout controla conflictos 409 y explica qué productos se ajustaron o eliminaron.
- **3.3 Facturación de pendientes**
  - `GET /admin/facturas/pendientes` alimenta la lista de operaciones sin factura.
  - El formulario de facturas permite generar la factura desde una venta o inscripción pendiente y recarga el estado.
- **3.4 Precios de planes con IVA**
  - Tarjetas, carrito, membresías,entradas y panel muestran `precioConIva` cuando la API lo entrega.
  - El precio sin IVA se conserva solo como origen y se aclara en las ayudas del panel.
- **3.5 Rutinas por día y mi semana**
  - Las rutinas se agrupan por día con encabezado "Mi semana".
  - Se aceptan días estructurados (`dias`, `rutinaDias`, `detallesPorDia`) y texto con líneas `Lunes: ...`.
  - "Mi cuenta" usa el nuevo encabezado y las ayudas explican el formato por día.
- **3.6 Accesibilidad y cierre**
  - Nombres accesibles de acciones, carrito y controles alineados con el texto visible.
  - Contraste AA corregido en pestañas y botones outline del panel.
  - Tabla desplazable de productos con región enfocable y nombre accesible.
  - Prueba de regresión corregida para esperar el DOM antes de medir el anclaje `#tienda`.

No se modificó el backend. Solo el cliente HTTP (`frontend/models/api.model.js`) realiza llamadas `fetch`.

## Pruebas

- `git diff --check` y `node --check` sobre los módulos modificados: **OK** (solo avisos LF/CRLF).
- `npm run verificar`: **OK**, 0 fallos.
- `npm run humo`: **OK**, 0 fallos.
- `node pruebas/prueba-accesibilidad.mjs`: **OK**, todas las comprobaciones pasaron.
- `node pruebas/prueba-correcciones4.mjs`: **OK**, 60 comprobaciones superadas.
- `node pruebas/prueba-responsive.mjs`: **OK**, 60 comprobaciones superadas.
- `node pruebas/prueba-navegador.mjs`: **OK**, 60 comprobaciones superadas.
- `node pruebas/prueba-correcciones5.mjs`: **OK**, comprobaciones estáticas superadas.
- axe-core + Playwright: **OK**, 48 combinaciones evaluadas (12 páginas × claro/oscuro × escritorio/móvil), 0 violaciones de `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`.
  - El informe temporal se generó fuera del repositorio en `%TEMP%/axe-fase3-report.json`.
  - No se encontraron violaciones de tamaño de objetivo, contraste, nombres accesibles ni regiones desplazables.
