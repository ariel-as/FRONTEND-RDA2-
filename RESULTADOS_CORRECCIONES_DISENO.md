# Resultados de las correcciones de diseño, uso y errores

Rama `correcciones-diseno`, con un commit por sección subido a esa rama. No hay merge a `main`. Base: `FRONTEND_CORRECCIONES_DISENO.md`. Las comprobaciones se hicieron con Playwright (Chromium sin interfaz, desde `C:\herramientas-auditoria`) contra el backend local, servido en `http://127.0.0.1:5500`.

| Sección | Commit |
|---|---|
| 1. Errores en todo el sitio | `6f40414` |
| 2. Sitio público | `1edc70d` |
| 3. Panel: diseño general | `9c36ea0` |
| 4. Panel: pantalla por pantalla | `41c4e11` |
| 5. Seguridad de la información por rol | `bbebb21` |
| 6 y 7. Avisos al backend y decisiones | Sin código; van en este informe |
| 8 y 9. Comprobación e informe | Commit final de este archivo |

## 1. Estado de cada punto

| Punto | [E#] | Estado | Archivos |
|---|---|---|---|
| 1.1 Navegación por secciones | E1, E6 | Hecho. La sección activa se calcula con una línea fija (cabecera + 30 %) en `requestAnimationFrame` y al final de la página es Contacto. Al hacer clic, el enlace pulsado queda fijo; los saltos lejanos son directos (siempre directos si se pide menos movimiento). Los enlaces del pie también se manejan, se realinea al cargar con hash y Nutrición tiene `aria-current="page"` | `controllers/comunes.controller.js`, `controllers/inicio.controller.js`, `views/cabecera.view.js`, `pruebas/prueba-hash.mjs` |
| 1.2 Cabecera con sesión | E7, E11, E23 | Hecho. Una sola cabecera para `index.html` y todas las páginas de `cliente/`, con menú de cuenta (saludo, Mi cuenta, Mis pedidos, Cerrar sesión). El personal ve «Ir al panel administrativo». Sin desbordes a 1440, 1366, 1280, 1024 y 768 px. En Mis pedidos y Mi cuenta, las cuentas del personal ven el enlace al panel en lugar de los avisos 403 | `views/cabecera.view.js`, `controllers/comunes.controller.js`, `controllers/pedidos.controller.js`, `assets/css/styles.css` |
| 1.3 «Crear cuenta» en negro | E9 | Hecho. La página quedaba oculta por la clase de posición pendiente. Ahora `#registro` muestra el formulario con foco en el primer campo | `controllers/main.controller.js` |
| 1.4 «No se pudo preparar el formulario» | E16 | Hecho. Causa: el título del diálogo está fuera del `<form>` y se buscaba dentro. Con ADM cargan todos los formularios | `controllers/admin-generico.controller.js` |
| 1.5 Cancelar al primer clic | E14 | Hecho. Cancelar no valida (`formnovalidate`) y la validación al salir del campo ya no mueve el botón. El foco vuelve al botón que abrió el formulario | `controllers/validacion.controller.js`, `controllers/admin-generico.controller.js`, `views/dialogo.view.js` |
| 1.6 Grupo activo y migas | E12 | Hecho. Píldora amarilla en el grupo actual, página actual resaltada en el desplegable y migas «Dashboard / Recepción / Caja» | `assets/css/styles.css`, `views/menu.view.js`, `controllers/admin.controller.js` |
| 1.7 Cabecera según el rol y logo | E19 | Hecho. La cabecera muestra Administrador, Recepción, Entrenador o Contabilidad, y el menú de usuario muestra nombre y rol. El logo compacto va sin caja ni relleno | `controllers/admin.controller.js`, `assets/css/styles.css` |
| 2.1 Entrenadores | E2 | Hecho. Foto 4:5 con `object-fit: cover` y `object-position: top`, imagen acorde a la especialidad, iniciales si no hay foto, orden por nombre | `models/presentacion.model.js`, `models/catalogo.model.js`, `views/componentes.view.js`, `controllers/inicio.controller.js` |
| 2.2 Rutinas | E3 | Hecho. Niveles de `/niveles` con su descripción y los planes que incluyen rutina, con enlace a Planes | `controllers/inicio.controller.js` |
| 2.3 Servicios | E4 | Hecho. Se usa la descripción de la API o, si no viene, la de `presentacion.model.js` | `models/presentacion.model.js`, `controllers/inicio.controller.js` |
| 2.4 Contacto | E5 | Hecho. Horarios de `/gimnasio` («Cerrado» donde corresponde), teléfono del gimnasio y teléfono del formulario opcional | `index.html`, `controllers/inicio.controller.js` |
| 2.5 Nutrición | — | Hecho. El botón dice «Solicitar información» y se quitó la frase de agendar | `index.html` |
| 2.6 Pagar un plan | E10 | Hecho. Si solo hay planes: «Pagas en recepción…» sin formas de pago de productos. Si hay planes y productos, ambos textos por separado | `controllers/checkout.controller.js`, `cliente/checkout.html` |
| 2.7 Datos de la transferencia | — | Parcial. Se muestra el bloque de la cuenta, pero la API no tiene esos datos: van en `CUENTA_TRANSFERENCIA` de `models/config.js` (vacío) y, mientras tanto, el checkout pide consultarlos en recepción | `models/config.js`, `controllers/checkout.controller.js` |
| 2.8 Mis pedidos y Mi cuenta | E8 | Hecho. Sin paginación cuando hay una sola página. «Acércate a recepción para vincular tu cuenta» cuando falta la ficha de cliente. Formato «Pedido N.º 12 · Tu pedido 3 de 8 · fecha» | `views/pedidos.view.js`, `controllers/pedidos.controller.js` |
| 2.9 Portada en celular | — | Hecho. Se ajustaron la altura y el relleno de la portada a menos de 640 px | `assets/css/styles.css` |
| 3.1 Plantilla de página | E13, E17 | Parcial. Mismo ancho, tarjetas, relleno y migas sobre el título; casos concretos corregidos (Ventas alineado, Pedidos con descripción y filtros en tarjeta, «Nuevo registro» arriba en Otras tablas, Usuarios con «Más acciones»). No se movió a la derecha del título el botón principal de cada una de las 22 páginas | `assets/css/styles.css`, `admin/ventas.html`, `admin/pedidos.html`, `admin/tablas.html`, `views/menu.view.js` |
| 3.2 Tablas | E17 | Hecho. Un solo encabezado (las filas ya no repiten `thead`). Diccionario de etiquetas en español. Nombres en lugar de códigos en las claves foráneas. «—» con texto «Sin dato» para lectores. «Más acciones» cuando hay más de dos. Fechas y montos alineados y sin partirse (22/11/2026 12:50). Sin paginación con una página | `views/admin.view.js`, `controllers/admin-generico.controller.js`, `views/lista-api.view.js`, `controllers/lista-api.controller.js` |
| 3.3 Colores del panel | — | Hecho. Primario amarillo de marca con texto oscuro; secundario con contraste en los dos temas | `assets/css/styles.css` |
| 3.4 Celular y tableta | — | Hecho. El tema queda en la fila del botón de menú y las listas se ven como tarjetas apiladas a menos de 640 px | `assets/css/styles.css`, `views/lista-api.view.js` |
| 3.5 Formularios genéricos | — | Hecho. Mismo diccionario de etiquetas; las claves foráneas siguen como listas con nombres | `controllers/admin-generico.controller.js` |
| 4.1 Dashboard | E18, E20 | Hecho. Indicadores enlazados con el filtro aplicado (por ejemplo `pedidos.html?estado=R`) y accesos directos al final. Marcar asistencia queda solo en el dashboard; Personal muestra el reporte | `admin/index.html`, `controllers/admin.controller.js`, `admin/personal.html`, `controllers/lista-api.controller.js` |
| 4.2 Entradas y aforo | E21 | Hecho. «Cobrar pase diario» en un paso: alta rápida si la cédula no existe, inscripción con pagos y entrada. Enlace a las inscripciones web pendientes. Barra de aforo con borde y fondo | `controllers/admin-entradas.controller.js`, `assets/css/styles.css` |
| 4.3 Inscripciones | E14 | Hecho. Estado corto y acciones agrupadas. En la nueva inscripción: el total y los pagos aparecen con cliente y plan; nombre del titular; promociones vigentes del plan como lista; ADM que autoriza solo si la promoción lo pide; buscador de acompañantes con el límite del plan | `controllers/admin-inscripciones.controller.js` |
| 4.4 Clientes | — | Hecho. «No aplica» para CONSUMIDOR FINAL y «Sin nivel» en los demás casos | `controllers/admin-clientes.controller.js` |
| 4.5 Pedidos web | — | Hecho. «Reportar pago» solo en transferencia y «Cobrar» solo en efectivo; cantidad de productos visible | `controllers/admin-pedidos.controller.js`, `admin/pedidos.html` |
| 4.6 Ventas y facturación | E13, E22 | Hecho. Nombre del cliente al escribir la cédula, buscador de productos, líneas y total visibles desde el inicio y el total que corrige el servidor. Al cobrar una venta, inscripción o pedido se ofrece generar la factura (cliente o CONSUMIDOR FINAL) y se muestra con formato para imprimir. Las facturas se identifican por su número | `controllers/admin-ventas.controller.js`, `controllers/factura.controller.js`, `controllers/admin-facturas.controller.js`, `controllers/admin-inscripciones.controller.js`, `controllers/admin-pedidos.controller.js` |
| 4.7 Productos | — | Parcial. Por defecto se filtran los activos y el formulario solo aparece para quien gestiona inventario. No se cambió el ancho de las columnas | `admin/productos.html` |
| 4.8 Inventario | — | Hecho. «No caduca» y orden por producto y caducidad | `controllers/admin-inventario.controller.js` |
| 4.9 Compras y Aliados | E15 | Hecho. Pestaña de proveedores y de profesionales aliados con el panel genérico | `admin/compras.html`, `admin/aliados.html`, controladores respectivos |
| 4.10 Membresías, Clases y Personal | E16, E17 | Hecho. Formularios (1.4), un encabezado y etiquetas (3.2); «No aplica» en ingresos de los planes por tiempo | `controllers/admin-membresias.controller.js` |
| 4.11 Usuarios | — | Hecho. Acciones agrupadas, «Sin roles» en rojo con texto y una línea por rol con lo que permite | `controllers/admin-usuarios.controller.js` |
| 4.12 Datos del gimnasio | — | Hecho. Se editan las filas exactas del horario que vienen de la API y el RUC aparece de solo lectura | `controllers/admin-gimnasio.controller.js`, `admin/gimnasio.html` |
| 4.13 Otras tablas | — | Hecho. «Nuevo registro» en el encabezado y oculto en las tablas de solo lectura | `admin/tablas.html` |
| 4.14 Reportes | — | Hecho. Último mes por defecto, CSV activo solo con resultado, títulos en español y tablas con `caption` | `controllers/admin-reportes.controller.js`, `views/lista-api.view.js` |
| 4.15 Caja | — | Hecho. Solo se pide `/turnos/actual` si la lista del día tiene un turno abierto, así que ya no hay 404. Cuadres por defecto en la semana actual | `models/fase2.model.js`, `controllers/admin-caja.controller.js`, `controllers/admin.controller.js` |
| 5. Información por rol | E22 | Hecho. El entrenador no ve montos ni el contacto de los clientes; recepción no ve costos (lotes, kárdex ni formulario de productos); la contadora no tiene acciones de mostrador; los botones sin permiso no aparecen | `controllers/admin-inscripciones.controller.js`, `controllers/admin-clientes.controller.js`, `controllers/admin-inventario.controller.js`, `admin/productos.html` |

## 2. Pendiente y por qué

- **3.1:** el botón principal de cada pantalla no se movió a la derecha del título en todas las páginas (habría que reestructurar el HTML de las 22). Quedan unificados el ancho, las tarjetas, las migas y los casos concretos de la lista.
- **4.6 «en el mismo diálogo»:** la factura se ofrece en un diálogo que aparece justo después del cobro, no dentro del mismo.
- **4.7:** no se igualó el ancho de las columnas de Productos.
- **2.7:** faltan los datos bancarios reales (ver sección 3 de este informe).
- **Cobros de punta a punta (4.2 y 4.6):** no se pudieron repetir hoy en la base local, porque el cierre semanal de la prueba anterior bloquea abrir caja este día. Se comprobó la interfaz hasta el diálogo de cobro (pase diario con alta rápida y pagos) y la factura con formato e impresión.
- **Lighthouse:** no se corrió. En su lugar se usó axe-core (WCAG 2.1 A y AA) en inicio, dashboard, inscripciones y ventas: 0 violaciones.
- **Cabeceras estáticas:** el HTML estático de las páginas del cliente sigue siendo distinto, pero al cargar se reemplaza por la cabecera única. Quedan como respaldo sin JavaScript.

## 3. Avisos para el backend (sección 6) y decisiones (sección 7)

Avisos:

- Hay productos «Producto de integración PF17…» y la cuenta `staff-test@planetafitness.ec` creados por las pruebas en la base de Render.
- La razón social del gimnasio tiene el texto de ejemplo «REEMPLAZAR PROPIETARIA».
- El horario está guardado como «Lunes a viernes», «Sábado» y «Domingo»; el panel ahora edita esas mismas filas.
- Hay pedidos en efectivo en estado «Pago reportado».
- `GET /admin/caja/turnos/actual` podría responder 200 con `null` en lugar de 404. El frontend ya lo evita consultando primero la lista del día.
- La API no tiene los datos bancarios del gimnasio: completar `CUENTA_TRANSFERENCIA` en `models/config.js` o exponerlos en `/gimnasio`.
- En la base local, los tests del backend dejan usados todos los turnos del día y un cierre semanal que bloquea la caja.

Decisiones aplicadas (opción por defecto):

- **Número de pedido:** se mantiene el número único del sistema y se agrega un orden propio («Tu pedido 3 de 8») y la fecha.
- **La contadora y las facturas:** genera solo las que falten; la factura normal se ofrece al cobrar.
- **Permisos:** van por rol, no por persona. Usuarios muestra lo que permite cada rol.

## 4. CI y recorrido responsive

- **CI en cada sección:** sintaxis sin errores (90 archivos al final), `verificar-frontend.mjs` con 0 fallos, pruebas estáticas (HTML, accesibilidad, enlaces, selectores, arquitectura, lógica, repo, hash, correcciones5) en verde, `verificar-seguridad.mjs` con 0 fallos y HTMLHint sin errores.
- **Sección 1 (Playwright):** 62 comprobaciones, 0 fallos y 0 errores de consola. Cubre navegación, cabecera con cliente y ADM a cinco anchos en cuatro páginas, menú de cuenta, registro, formularios genéricos, Cancelar, grupo activo, migas y rol en la cabecera.
- **Sección 3 (Playwright):** 51 comprobaciones; la única marcada es la paginación de Usuarios, que es correcta porque hay 3 páginas. Las 22 pantallas a 375 y 768 px no tienen desborde horizontal.
- **Sección 8 (Playwright):** sitio público (inicio, las 5 páginas de cliente y el login del panel) a 375 y 768 px sin desbordes. Las 22 pantallas sin nombres internos, sin «vacío» y sin encabezados repetidos. axe sin violaciones en las cuatro páginas pedidas. Pase diario y factura imprimible comprobados.
- **Roles:** con REC, ENT y CON, las 22 páginas sin fallas, sin respuestas 4xx/5xx y sin errores de consola.

## 5. Tanda `1_FRONTEND_CORRECCIONES.md` (rama `correcciones-2`)

Base: `correcciones-diseno`. Se aplicaron las secciones 1 a 6 en orden, sin tocar el backend. Restricciones cumplidas: búsquedas en vez de lecturas completas, un solo archivo de estilos (`assets/css/styles.css`), foco visible, textos además de colores y contraste AA en los dos temas.

| Sección | Resultado | Puntos clave |
|---|---|---|
| 1. Errores | Hecho | El cliente ve «Tu pedido N.º 68» también en la confirmación del checkout y en Mis pedidos. |
| 2. Sitio público | Hecho | 6 servicios con descripción; entrenadores ordenados (Uno, Dos, Tres, Cuatro); portada legible a 1440 y 375 px sin desborde. |
| 3. Panel | Hecho | Rectángulo translúcido y texto blanco en el hero; enlaces subrayados en amarillo; tarjetas de entrenadores a la misma altura con foto 4:5. |
| 4. Facturación | Hecho | Vista con estado claro, `Factura N.º`, aviso de ambiente simulado, `Corregir datos del SRI`, y botón «Generar factura» desde ventas e inscripciones. |
| 5. Estados | Hecho | Ya no aparece «En proceso» ni el filtro «Sin número del SRI»; el indicador CON usa «Facturas emitidas». |
| 6. Aviso al backend | Anotado abajo | El backend todavía no devuelve número ni clave de comprobante. |

**Sección 7 (Playwright, Chromium sin interfaz, contra backend local):** 8 comprobaciones, 0 fallos y 0 errores de consola, sin capturas de fallo:

- `servicios_con_descripcion`: 6 servicios con descripción.
- `entrenadores_ordenados`: Entrenador Uno, Dos, Tres y Cuatro.
- `correo_legible_1440`: alfa `0.82`, texto blanco y sin desborde.
- `correo_legible_375`: visible y sin desborde a 375 px.
- `numero_pedido_cliente`: «Tu pedido N.º 69».
- `numero_pedido_mis_pedidos`: número visible.
- `factura_desde_venta`: factura 22 generada desde la venta pendiente, con aviso simulado.
- `facturas_listado_estado`: factura 22 en el listado y sin «En proceso».

**Aviso para el backend:** `POST /api/v1/admin/facturas` responde `numComprobante: null`, `claveAcceso: null` y `estado: "P"`. El frontend lo muestra como «Pendiente de número» y nunca como «En proceso»; para ver un número/clave simulados y el estado «Emitida» debe cambiar el backend. No se modificó el contrato ni el servidor.

**CI local final:** sintaxis correcta en 90 archivos con Node 24; `verificar-frontend`, HTMLHint, nueve pruebas estáticas, seguridad, dependencias (con red), contrato de API y prueba de humo con Playwright: 0 fallos. No se corrió CodeQL/Gitleaks en local; los ejecuta GitHub Actions.

## 6. Ajuste final de portada

Se retiró el panel oscuro con borde y esquinas redondeadas que tapaba la foto de `index.html`. La imagen vuelve a ocupar toda la portada con el título encima; solo la línea de dirección y correo lleva un fondo oscuro pequeño y sombra de texto. Verificado a 1440 y 375 px: foto visible, sin recuadro, sin desborde y correo legible. Playwright: 8 comprobaciones, 0 fallos.
