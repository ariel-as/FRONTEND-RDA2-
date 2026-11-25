# Resultados de FRONTEND fase 2

## Actualización del 22/11/2026: conexión con el backend publicado

Base: `RESPUESTAS_BACKEND_PARA_FRONTEND.md` (backend `ariel-as/backend-de-prueba`, commit `e31524a`). Se trabajó en la rama `fase2`, con un commit por bloque, sin push a `main` y sin pruebas con datos reales ni en navegador (por instrucción). Las secciones 1 a 10 de más abajo describen la primera sesión y quedan como historia; esta sección manda donde haya diferencias.

### Bloques terminados

| Bloque | Commit | Qué quedó |
|---|---|---|
| A. Permisos reales | `0b135f5` | Permisos de `server/config/permisos.js` en menú, botones y dashboard; `rol: "staff"` se trata como personal del panel; convertir y entregar pedidos y notificaciones activados en `models/funciones.model.js` |
| Paso 3 | `43a143a` | Usuarios con `GET/PUT /admin/usuarios` (buscar, editar correo, restablecer contraseña, roles con casillas sin quitarse ADM a uno mismo, activar o desactivar) y datos del gimnasio con horario. Piezas comunes nuevas: `models/fase2.model.js`, `controllers/lista-api.controller.js`, `views/lista-api.view.js` |
| Paso 4 | `9384ebd` | Caja: abrir turno, totales en vivo, gastos y devoluciones, cierre con efectivo contado y diferencia en texto (faltante o sobrante), cuadres por rango y cierre semanal con resumen previo |
| Paso 5 | `76f4155` | Pedidos con convertir en venta y entregar (`pedidos:gestionar`); en transferencia se envía solo `{ estado: 'C' }` (el servidor toma la referencia). Mis pedidos ya no muestra «informar comprobante» |
| Paso 6 | `c5cf85d` | Clientes con `/admin/clientes` (búsqueda por cédula, nombre o apellido; alta con cédula validada; edición; activar o desactivar; historial). Inscripciones completas: nueva con pagos y acompañantes, cobrar, agregar o quitar acompañante, renovar, suspender, anular suspensión, anular y generar factura |
| Paso 7 | `b8cf8e4` | Entradas y aforo: aforo con barra y texto, cédula con foco y Enter, entrada al gimnasio o a una clase, rechazo con `role="alert"`, personas adentro con salida, refresco cada 60 s; si la cédula no existe ofrece registrar cliente o vender pase |
| Paso 8 | `86e01a1` | Ventas en mostrador (líneas editables, componente de pagos, factura al terminar, anulación con motivo solo ADM) y facturación (generar a cliente, consumidor final o tercero; datos del SRI con formato validado; por anular; impresión) |
| Paso 9 | `bd57e70` | Inventario: lotes con filtros, bloqueo y baja; kárdex; recibir mercadería; ajustes. Proveedores del producto en `productos.html` |
| Paso 10 | `2becbc1` | Notificaciones con `tipoNombre` como título y `noLeidas` del servidor (campana, pantalla y mi cuenta); dashboard con indicadores reales por rol y botones de marcar entrada o salida |
| Paso 11 | `ce27af4` | Reportes: los 8 de `/admin/reportes` según permiso, tabla accesible, gráfico simple con CSS y descarga CSV |
| Paso 12 | `31232d5` | Asistencia (marcar y reporte), compras (crear, autorizar, anular, recibir por partes), rutinas, aliados y comisiones, mensajes de contacto, mi cuenta con rutina vigente y notificaciones. Ya no queda ninguna pantalla «Disponible pronto» |

### Pantallas conectadas

Todas las del menú: entradas, inscripciones, clientes, pedidos, ventas, caja, productos, lotes y kárdex, compras, planes y promociones, clases, rutinas, personal, aliados, usuarios, datos del gimnasio, otras tablas, facturas, cierres de caja, reportes, mensajes y notificaciones. En la web del cliente: mis pedidos, checkout y mi cuenta (inscripciones con fecha de fin y total de ingresos, rutina y notificaciones).

### Pendientes

- Probar cada pantalla con las cuentas de cada rol contra Render (no se hizo por instrucción). Las cuentas REC, ENT y CON quizá haya que crearlas antes con la cuenta admin.
- Correr la prueba de humo en navegador (`npm run humo`) y Lighthouse; no se ejecutaron en esta sesión.
- Pasar `fase2` a `main` cuando se revise; el pipeline publicará en Pages.
- Indicador «clases de hoy» del entrenador: no hay ruta para «mis clases de hoy»; el dashboard de ENT muestra aforo y rutinas.

### Resultado del CI en cada bloque

En todos los bloques: sintaxis de JavaScript sin errores (de 71 archivos en el bloque A a 88 en el paso 12) y `verificar-frontend.mjs` con 0 fallos. HTMLHint sin errores y `verificar-seguridad.mjs` con 0 fallos al final.

### Dudas para el equipo

1. **Totales antes de cobrar:** el contrato no tiene una ruta para cotizar. En nueva inscripción, renovación y venta el componente de pagos usa un total estimado (precio del plan o de los productos); si no cuadra, el servidor responde 400 con el total correcto y el usuario corrige. ¿Agregarían una ruta de cotización?
2. **Formas inferidas del código del backend, sin probar con datos:** estados de lote (D, I, C), de factura (P, E, A), de mensaje (P, R) y de compra (P, A, M, R, X); líneas de venta `{ productoId, cantidad, descuento }` (¿el descuento es en dólares?); líneas de compra y recepción `{ productoId, cantidad, costoUnit, fechaCaducidad }`; proveedores del producto como lista de códigos.
3. Los reportes, el historial del cliente y los detalles se muestran con una vista genérica (tablas por sección), porque cada respuesta tiene su propia forma.
4. El gimnasio no tiene campo RUC en el backend; se usan nombre, propietaria (razón social), dirección, contacto, aforo, IVA, establecimiento y punto de emisión.
5. Compras y recepciones se escriben como líneas de texto («código, cantidad, costo, caducidad»), validadas en el navegador. Si prefieren filas con campos, se puede cambiar.


Rama: `fase2` (sin push ni merge a `main`). Un commit por paso de la sección 9, más un commit base inicial.
Backend revisado: `https://planeta-fitness-api.onrender.com/api/v1`, solo con peticiones GET sin token, el 2026-11-21 y otra vez el 2026-11-22.

## 1. Resumen

**Hallazgo principal:** el backend publicado en Render todavía no tiene la fase 2. Las 38 rutas GET nuevas de la sección 5 responden `404 La ruta solicitada no existe`. Una ruta que existe responde `401` sin token (por ejemplo `/admin/resumen`, `/pedidos`, `/admin/tablas`). Además, el código del backend (fase 1) muestra que `PATCH /pedidos/:id/estado` solo acepta P→R y P/R→X. Por eso, siguiendo la regla, todas las pantallas que dependen de servicios nuevos quedaron con «Disponible pronto» y no llaman a la API.

| Paso | Qué | Resultado |
|---|---|---|
| Base | Commit de las correcciones de auditoría 5 que estaban sin commit en el árbol de trabajo | Hecho (`161b431`), para no mezclarlas con la fase 2 |
| 1 | Menú desde un solo archivo, permisos de `/auth/me`, bloqueo de páginas, aviso de servidor despertando | **Completo**. Los permisos se usan en cuanto el servidor los envíe; hoy solo ADM entra a las pantallas |
| 2 | Componente de pagos y diálogo de confirmación | **Completo**. Ya no queda ningún `confirm()` ni `prompt()` en el sitio |
| 3 | Usuarios con roles y datos del gimnasio | **Parcial**. Usuarios mantiene lo que ya funcionaba y avisa lo que falta; datos del gimnasio queda «Disponible pronto». Faltan `GET /admin/usuarios`, `PUT /admin/usuarios/:id`, `PUT /admin/usuarios/:id/roles` y `/admin/gimnasio` |
| 4 | Caja | **Pendiente (Disponible pronto)**. Faltan las rutas `/admin/caja/*` |
| 5 | Pedidos web, mis pedidos y checkout | **Parcial**. Ya funcionan: diálogo propio en lugar de `prompt()`, filtro «Por verificar», códigos de estado corregidos, comprobante obligatorio con transferencia y estados claros en mis pedidos. «Convertir en venta» (con componente de pagos) y «Marcar entregado» están construidos pero apagados hasta que el backend acepte C y E. «Informar comprobante» del cliente no tiene ruta en el contrato |
| 6 | Clientes con búsqueda e historial; inscripciones completas | **Parcial**. Ya funcionan: búsqueda exacta por cédula (con el panel genérico), validación de cédula ecuatoriana y filtro «Web pendientes de cobro». Historial, búsqueda por nombre y acciones de inscripción quedan «Disponible pronto» |
| 7 | Entradas y aforo | **Pendiente (Disponible pronto)** |
| 8 | Ventas en mostrador y facturación | **Pendiente (Disponible pronto)** |
| 9 | Inventario | **Pendiente (Disponible pronto)**, con aviso de proveedores en productos |
| 10 | Campana de notificaciones y dashboard por rol | **Parcial**. El dashboard por rol funciona: accesos directos, indicadores por rol y «pedidos por verificar» con la API actual. La campana está construida y probada con datos simulados, pero apagada hasta que exista `GET /notificaciones` |
| 11 | Reportes de prioridad 2 | **Pendiente (Disponible pronto)** |
| 12 | Prioridad 3 | **Parcial**. Ya funcionan: mi cuenta del cliente con inscripciones y el aviso de plan grupal. Compras, rutinas, aliados, mensajes, asistencia, suspensiones y anulaciones quedan «Disponible pronto». Las promociones ya existían en `membresias.html` mediante el panel genérico |
| 13 | README | **Completo** |

## 2. Tabla por pantalla

| Pantalla | Archivo | Endpoints que usa hoy | Estado | Endpoint que falta en el backend |
|---|---|---|---|---|
| Dashboard | `admin/index.html` | `GET /admin/resumen` y `GET /pedidos` (solo ADM); `GET /pedidos?estado=R` (indicador de recepción) | Terminada (indicadores sin servicio marcados «Disponible pronto») | `/admin/aforo`, `/admin/caja/turnos/actual`, `/admin/inscripciones`, `/admin/caja/turnos`, `/admin/facturas`, `/admin/rutinas`, `/admin/personal/asistencia/*` |
| Entradas y aforo | `admin/entradas.html` | Ninguno | Disponible pronto | `GET /admin/aforo`, `GET /admin/entradas`, `POST /admin/entradas`, `PATCH /admin/entradas/:id/salida`, `GET /admin/clientes/:cedula/acceso` |
| Inscripciones | `admin/inscripciones.html` | `/admin/tablas/inscripcion`, `/admin/tablas/inscripcion_cliente`, opciones de `membresia` y `cliente` | Lista terminada; acciones nuevas «Disponible pronto» | `GET/POST /admin/inscripciones`, `GET /admin/inscripciones/:id`, `/cobrar`, `/integrantes`, `/renovar`, `/suspensiones`, `/anular`, `PATCH /admin/suspensiones/:id/anular` |
| Clientes | `admin/clientes.html` | `/admin/tablas/cliente` (lista, filtro `id` exacto, crear y editar) | Terminada en lo posible; historial y búsqueda por nombre «Disponible pronto» | `GET /admin/clientes?buscar`, `GET /admin/clientes/:cedula/historial`, `POST/PUT /admin/clientes` |
| Pedidos web | `admin/pedidos.html` | `GET /pedidos`, `PATCH /pedidos/:id/estado` (R y X) | Terminada; convertir y entregar tras interruptor | `PATCH /pedidos/:id/estado` con C (`pagos`) y E |
| Ventas en mostrador | `admin/ventas.html` | Ninguno | Disponible pronto | `POST/GET /admin/ventas`, `GET /admin/ventas/:id`, `PATCH /admin/ventas/:id/anular` |
| Caja (y cierres) | `admin/caja.html` | Ninguno | Disponible pronto | `/admin/caja/turnos`, `/turnos/actual`, `/movimientos`, `/turnos/:id/cuadre`, `/cierres` |
| Productos | `admin/productos.html` | Los mismos de antes (`/admin/productos`, `/productos`, `/categorias`) | Terminada; proveedores «Disponible pronto» | `GET/PUT /admin/productos/:id/proveedores` |
| Lotes y kárdex | `admin/inventario.html` | Ninguno | Disponible pronto | `/admin/inventario/lotes`, `/kardex/:productoId`, `/entradas`, `/ajustes`, `/lotes/:id/baja`, `/lotes/:id/bloqueo` |
| Compras | `admin/compras.html` | Ninguno | Disponible pronto | `/admin/compras` y sus acciones |
| Planes y promociones | `admin/membresias.html` | `/admin/tablas` (membresia, servicio, promocion) | Terminada (sin cambios funcionales) | — |
| Clases | `admin/clases.html` | `/admin/tablas` | Terminada (sin cambios funcionales) | — |
| Rutinas | `admin/rutinas.html` | Ninguno | Disponible pronto | `GET/POST/PUT /admin/rutinas` |
| Personal | `admin/personal.html` | `/admin/tablas` | Terminada; asistencia «Disponible pronto» | `/admin/personal/asistencia/entrada`, `/salida` y `GET /admin/personal/asistencia` |
| Aliados y comisiones | `admin/aliados.html` | Ninguno | Disponible pronto | `POST /admin/aliados/:cedula/comisiones`, `GET /admin/aliados/comisiones` |
| Usuarios | `admin/usuarios.html` | `/admin/tablas` (usuario, rol, usuario_rol, empleado), `POST /admin/usuarios`, `PATCH /admin/usuarios/:id/estado` | Terminada; editar correo, contraseña y casillas de roles «Disponible pronto» | `GET /admin/usuarios`, `PUT /admin/usuarios/:id`, `PUT /admin/usuarios/:id/roles` |
| Datos del gimnasio | `admin/gimnasio.html` | Ninguno | Disponible pronto | `GET/PUT /admin/gimnasio`, `GET/PUT /admin/gimnasio/horario` |
| Otras tablas | `admin/tablas.html` | `/admin/tablas` | Terminada (sin cambios funcionales) | — |
| Facturas | `admin/facturas.html` | Ninguno | Disponible pronto | `/admin/facturas` y sus acciones |
| Reportes | `admin/reportes.html` | Ninguno | Disponible pronto | `/admin/reportes/*` |
| Mensajes de contacto | `admin/mensajes.html` | Ninguno | Disponible pronto | `GET /admin/mensajes`, `PATCH /admin/mensajes/:id/respondido` |
| Notificaciones (página y campana) | `admin/notificaciones.html` y campana en las cabeceras | Ninguno (la campana está apagada) | Disponible pronto | `GET /notificaciones`, `PATCH /notificaciones/:id/leida` |
| Mis pedidos (cliente) | `cliente/mis-pedidos.html` | `GET /pedidos/mis-pedidos`, `GET /inscripciones/mis-inscripciones`, `PATCH /pedidos/:id/cancelar` | Terminada; «informar comprobante» «Disponible pronto» | No hay ruta en el contrato para que el cliente informe el comprobante después de comprar |
| Checkout | `cliente/checkout.html` | `GET /auth/me`, `POST /pedidos`, `POST /inscripciones` | Terminada | — |
| Mi cuenta (cliente) | `cliente/mi-cuenta.html` | `GET /inscripciones/mis-inscripciones` | Inscripciones terminadas; rutina y notificaciones «Disponible pronto» | `GET /rutinas/mi-rutina`, `GET /notificaciones`; «ingresos que quedan» no viene en la respuesta |
| Inicio: planes grupales | `index.html` | `GET /membresias` (campo `personas`) | Terminada | — |

## 3. Piezas compartidas creadas

| Pieza | Archivos | Dónde se usa |
|---|---|---|
| Menú del panel | `models/menu.model.js` (único lugar con texto, página, grupo y permiso) y `views/menu.view.js` (lo pinta como desplegables de Bootstrap por grupo). La cabecera de cada HTML de `admin/` solo trae `<ul data-menu-admin>` con un enlace al dashboard de respaldo | Todas las páginas de `admin/` salvo el login |
| Permisos | `models/permisos.model.js` (`puede`, `esAdm`, `permisosUsuario`). `sesion.model.js` guarda `permisos` de `/auth/me` con la sesión. `admin.controller.js` (`verificarAccesoPagina`) muestra «No tienes acceso a esta pantalla» y corta toda petición con `api.bloquear()`. Atributo `data-permiso` para ocultar botones o bloques | Todas las páginas de `admin/`; botones de pedidos; escritura de clientes (`permisoEscritura` en el panel genérico); dashboard |
| Diálogo de confirmación y datos | `views/dialogo.view.js` y `controllers/dialogo.controller.js` (`abrirDialogo`, `confirmarAccion`). Usa `<dialog>` con `showModal`, valida con `construirValidador` y muestra el error del servidor dentro del diálogo | Pedidos (reportar pago, convertir, entregar, cancelar), mis pedidos (cancelar), productos (desactivar), usuarios (activar o desactivar), panel genérico (desactivar o eliminar en clientes, clases, membresías, personal, tablas) |
| Componente de pagos | `views/pagos.view.js` y `controllers/pagos.controller.js` (`crearPagos`: `validar`, `obtener`, `cuadra`, `actualizarTotal`). Incluye la ranura `data-pagos-ranura-comprobante` para la imagen (sección 7) | Pedidos («Cobrar y convertir en venta», tras interruptor). Listo para inscripciones, ventas y caja |
| Aviso de servidor despertando | `models/config.js` (`API_TIMEOUT_DESPERTAR_MS = 60000`, `API_AVISO_DESPERTAR_MS = 2500`), `models/api.model.js` (60 s y eventos `pf:servidor-despertando` y `pf:servidor-listo` solo en la primera petición de la sesión) y `views/servidor.view.js` | Todo el sitio: panel (`admin.controller.js`) y web pública (`comunes.controller.js`) |
| Interruptores de servicios | `models/funciones.model.js` (`pedidosConversion`, `notificaciones`, ambos en `false`) | Pedidos y campana |
| Campana de notificaciones | `models/notificaciones.model.js`, `views/campana.view.js` y `controllers/campana.controller.js` | Cabecera del panel y bloque de sesión de la web del cliente (apagada) |
| Dashboard por rol | `views/dashboard.view.js` | `admin/index.html` |

## 4. Archivos nuevos y modificados

**Nuevos**

- `frontend/admin/`: `aliados.html`, `caja.html`, `compras.html`, `entradas.html`, `facturas.html`, `gimnasio.html`, `inventario.html`, `mensajes.html`, `notificaciones.html`, `reportes.html`, `rutinas.html`, `ventas.html`
- `frontend/cliente/`: `mi-cuenta.html`
- `frontend/controllers/`: `campana.controller.js`, `dialogo.controller.js`, `pagos.controller.js`
- `frontend/models/`: `funciones.model.js`, `menu.model.js`, `notificaciones.model.js`, `permisos.model.js`
- `frontend/views/`: `campana.view.js`, `dashboard.view.js`, `dialogo.view.js`, `menu.view.js`, `pagos.view.js`, `servidor.view.js`
- Raíz: `RESULTADOS_FRONTEND_FASE2.md`

**Modificados**

- `frontend/admin/`: `clases.html`, `clientes.html`, `index.html`, `inscripciones.html`, `membresias.html`, `pedidos.html`, `personal.html`, `productos.html`, `tablas.html`, `usuarios.html`
- `frontend/cliente/`: `checkout.html`, `login.html`, `mis-pedidos.html`, `nutricion.html`
- `frontend/`: `index.html`
- `frontend/assets/css/`: `styles.css`
- `frontend/controllers/`: `admin.controller.js`, `admin-clientes.controller.js`, `admin-generico.controller.js`, `admin-inscripciones.controller.js`, `admin-pedidos.controller.js`, `admin-productos.controller.js`, `admin-usuarios.controller.js`, `auth.controller.js`, `checkout.controller.js`, `comunes.controller.js`, `inicio.controller.js`, `main.controller.js`, `pedidos.controller.js`
- `frontend/models/`: `api.model.js`, `config.js`, `sesion.model.js`, `storage.model.js`
- `frontend/views/`: `admin.view.js` (se quitó `navAdmin`, que no se usaba), `componentes.view.js`, `pedidos.view.js`
- `pruebas/`: `verificar-frontend.mjs` (exige las 13 páginas nuevas)
- Raíz: `README.md`

## 5. Correcciones de la sección 1

| Problema | Cómo quedó | Dónde |
|---|---|---|
| 1. Recepción, entrenador y contadora veían todo el menú y cada pantalla fallaba | El menú se arma con `permisos` de `/auth/me`. Cada página revisa su permiso al cargar y, si falta, muestra «No tienes acceso a esta pantalla» con enlace al dashboard, sin ninguna petición. Mientras el servidor no envíe `permisos`, los roles no ADM solo ven el dashboard (sin llamar a `/admin/resumen`), en vez de pantallas que fallan | `models/permisos.model.js`, `models/menu.model.js`, `controllers/admin.controller.js`, `models/sesion.model.js`, `models/api.model.js` |
| 2. Pedidos: `prompt()` para el comprobante, sin «convertir en venta» ni «entregado» | Diálogo accesible propio para reportar pago (con validación del comprobante) y para cancelar. Se agregó el filtro «Por verificar». Se corrigieron los estados (P, R, C, E, X; antes se filtraba por un «G» que no existe). «Cobrar y convertir en venta» (con componente de pagos en efectivo), «Verificar y convertir» (transferencia) y «Marcar entregado» quedan listos y se encienden con `pedidosConversion` cuando el backend acepte C y E | `controllers/admin-pedidos.controller.js`, `admin/pedidos.html`, `models/funciones.model.js` |
| 3. Inscripciones solo lectura | Se agregó el filtro rápido «Web pendientes de cobro» y el aviso «Disponible pronto» para inscribir, cobrar, acompañantes, renovar, suspender y anular, porque `/admin/inscripciones` no existe en Render | `admin/inscripciones.html`, `controllers/admin-inscripciones.controller.js` |
| 4. No existían entradas, ventas, caja, facturación, inventario, compras, aliados, rutinas, mensajes, notificaciones, datos del gimnasio ni reportes | Existen las 12 pantallas, enlazadas en el menú por grupo y permiso, con «Disponible pronto» y la descripción de lo que harán. No hacen llamadas | `frontend/admin/*.html` nuevos, `models/menu.model.js` |
| 5. Menú copiado a mano en cada página | Se generó desde `models/menu.model.js` con `views/menu.view.js`. La cabecera de las páginas quedó igual en todas y sin la lista copiada | Todas las páginas de `admin/` |
| 6. En la web del cliente faltaban rutina, notificaciones y detalle de inscripciones | Nueva `cliente/mi-cuenta.html` con inscripciones (estado en texto, fechas en `es-EC` e ingresos del plan) y enlace «Mi cuenta» en el menú con sesión. Rutina y notificaciones quedan «Disponible pronto» | `cliente/mi-cuenta.html`, `controllers/pedidos.controller.js`, `views/pedidos.view.js`, cabeceras de `index.html` y `cliente/*.html` |

## 6. Accesibilidad (sección 6)

Lo aplicado en lo nuevo:

- Páginas nuevas con la misma plantilla: un `h1`, `main id="contenido"` único, enlace para saltar al contenido, `header` y `footer`. El CI lo verifica en todas.
- Menú: desplegables de Bootstrap con `button` y `aria-expanded`, `aria-current="page"` en la pantalla actual y texto oculto «(sección actual)» en su grupo. En pantallas pequeñas se ve dentro del botón de menú plegable.
- Página sin permiso: el contenido bloqueado se oculta y el foco va al título «No tienes acceso a esta pantalla» (`tabindex="-1"`), con un solo `h1` visible.
- Diálogo propio: `<dialog>` modal con `aria-labelledby` y `aria-describedby`. El foco va al primer campo (o a «Cancelar» si no hay campos) y no sale del diálogo mientras está abierto. Escape lo cierra y el foco vuelve al botón que lo abrió (probado de forma automática). Las etiquetas son visibles, los errores usan `aria-invalid` y `aria-describedby` (con `construirValidador`) y el rechazo del servidor aparece con `role="alert"`.
- Componente de pagos: `fieldset` y `legend`, etiquetas visibles y referencia obligatoria en transferencia. El estado «Falta $x / Sobran $x / Los montos cuadran» se anuncia en `aria-live` y lleva el prefijo «Atención:» o «Listo:», no solo color. No deja enviar si la suma no cuadra.
- Estados de pedido e inscripción siempre en texto. Filtros rápidos con `aria-pressed`.
- Tablas con `aria-busy` mientras cargan (pedidos e indicadores del dashboard).
- Campana: botón con texto accesible «3 notificaciones sin leer» (el número visible es `aria-hidden`), panel de divulgación con `aria-expanded` y `aria-controls`, Escape para cerrar y «Marcar leída» con anuncio en `role="status"`.
- Aviso de servidor despertando en una región `role="status"` creada vacía al cargar, para que se anuncie.
- Áreas de toque mínimas de 24 px en los elementos nuevos del menú y de la campana.

Falta revisar con NVDA y Lighthouse (no se pudo hacer en esta sesión):

- Recorrido con NVDA del menú desplegable por grupos (lectura de «sección actual») y de la página sin acceso.
- Diálogo de reportar pago y de convertir en venta con el componente de pagos: orden de lectura y anuncio del estado del cobro.
- Contraste AA del diálogo (`.pf-dialogo`) y de la campana en tema claro y oscuro, y de `.pf-aviso-servidor`.
- Lighthouse de accesibilidad en `admin/index.html`, `admin/pedidos.html`, una página «Disponible pronto» y `cliente/mi-cuenta.html`.
- Uso en tableta horizontal: cuando se construyan entradas, ventas y caja (hoy son avisos).

## 7. Resultado del CI en cada paso

Se corrieron localmente los dos pasos del workflow: «Sintaxis de JavaScript» (`node --check` en `frontend/` y `pruebas/`) y «HTML, accesibilidad, rutas y arquitectura» (`pruebas/verificar-frontend.mjs`, que incluye las comprobaciones de seguridad: sin `javascript:`, sin manejadores en línea, `noopener`, `fetch` solo en el cliente HTTP).

| Paso | Sintaxis | Verificación del frontend |
|---|---|---|
| Base | — | 0 fallos |
| 1 | 57 archivos, 0 errores | 0 fallos |
| 2 | 61 archivos, 0 errores | 0 fallos |
| 3 | 61 archivos, 0 errores | 0 fallos |
| 4 | 61 archivos, 0 errores | 0 fallos |
| 5 | 62 archivos, 0 errores | 0 fallos |
| 6 | 62 archivos, 0 errores | 0 fallos |
| 7 | 62 archivos, 0 errores | 0 fallos |
| 8 | 62 archivos, 0 errores | 0 fallos |
| 9 | 62 archivos, 0 errores | 0 fallos |
| 10 | 66 archivos, 0 errores | 0 fallos |
| 11 | 66 archivos, 0 errores | 0 fallos |
| 12 | 66 archivos, 0 errores | 0 fallos (ya exige las 13 páginas nuevas) |
| 13 | 66 archivos, 0 errores | 0 fallos |

Además, después de cada paso con código corrí una prueba de humo con Playwright (fuera del repositorio): cada página con sesiones simuladas de ADM, REC y cliente, sin errores de JavaScript, más pruebas de menú, bloqueo sin llamadas, diálogo, pagos y campana. Gracias a ella detecté un error mío: una línea de prueba (`XX`) quedó en `menu.model.js` en los pasos 7 y 8. Pasaba `node --check` pero fallaba al ejecutarse. Lo corregí dentro del historial local (fixup del paso 7) antes de seguir. Sugerencia: agregar al CI una carga real de las páginas, porque `node --check` no detecta ese tipo de error.

## 8. Diferencias con el contrato (sección 5)

1. Ninguna ruta nueva de la sección 5 existe en Render. Las 38 GET revisadas responden 404 (`GET /admin/usuarios`, `/admin/gimnasio`, `/admin/gimnasio/horario`, `/admin/personal/asistencia`, `/admin/clientes`, `/admin/clientes/:cedula/historial`, `/admin/clientes/:cedula/acceso`, `/admin/inscripciones`, `/admin/inscripciones/:id`, `/admin/entradas`, `/admin/aforo`, `/admin/rutinas`, `/admin/rutinas/:id`, `/rutinas/mi-rutina`, `/admin/caja/turnos/actual`, `/admin/caja/turnos`, `/admin/caja/cierres`, `/admin/ventas`, `/admin/ventas/:id`, `/admin/facturas`, `/admin/facturas/:id`, `/admin/facturas/por-anular`, `/admin/inventario/lotes`, `/admin/inventario/kardex/:id`, `/admin/productos/:id/proveedores`, `/admin/compras`, `/admin/compras/:id`, `/admin/aliados/comisiones`, `/admin/mensajes`, `/notificaciones` y los 8 `/admin/reportes/*`). Las rutas POST, PUT y PATCH nuevas no se probaron porque solo se permitían peticiones de lectura; se supone que tampoco existen.
2. `PATCH /pedidos/:id/estado`: el backend actual solo permite P→R y P/R→X, según su código y `BACKEND.md`. Faltan C (con `pagos`) y E.
3. Estados del pedido: el contrato nombra «Pagado (C)». El frontend anterior usaba «G» (Pagado) y «Retirado» (E), que no coinciden con el backend. Se tomó lo del backend (`BACKEND.md`, tabla `pedido`): P pendiente, R pago reportado, C pagado y convertido en venta, E entregado o retirado, X cancelado. El `estadoNombre` del backend dice «Retirado» para E; la interfaz muestra «Entregado».
4. `/auth/me` todavía no devuelve `permisos` (lo muestra el código del backend de fase 1; no se pudo comprobar con un token). El frontend acepta `permisos` en la raíz de la respuesta o dentro de `usuario`.
5. La sección 4.18 pide que el cliente informe el número de comprobante desde mis pedidos, pero el contrato no tiene esa ruta para clientes (`PATCH /pedidos/:id/estado` es del personal).
6. `/inscripciones/mis-inscripciones` devuelve `ingresosTotal`, pero no los ingresos que quedan. El frontend muestra «Ingresos que te quedan» solo si llega `ingresosRestantes` o `ingresosDisponibles`.
7. No existe `GET /admin/clientes?buscar`. La búsqueda por cédula usa el filtro exacto de `/admin/tablas/cliente?id=…`. Por nombre o apellido no se puede buscar todavía.
8. El listado de usuarios usa `/admin/tablas/usuario`, porque `GET /admin/usuarios` no existe.

## 9. Decisiones tomadas y dudas para el equipo

**Decisiones**

- Commit base con las correcciones de auditoría 5 que estaban sin commit al empezar, para que cada commit de paso tenga solo lo suyo.
- Se usó la misma autoría de los commits anteriores (Cesar Changoluisa) con `git -c`, sin cambiar la configuración de git de la máquina, porque no había identidad configurada.
- Interruptores centrales en `models/funciones.model.js` para lo que ya está construido y espera al backend (convertir y entregar pedidos, campana). Con `false` no hay botones ni peticiones.
- Sin `permisos` del servidor, solo ADM entra a las pantallas. Es lo más prudente, porque el backend actual rechaza a los demás roles.
- Formato de permisos: el menú pide solo el grupo (cualquier `grupo:accion` sirve). Los botones piden acciones concretas. Grupos usados: `entradas`, `inscripciones`, `clientes`, `pedidos`, `ventas`, `caja`, `inventario`, `compras`, `planes`, `clases`, `rutinas`, `empleados`, `asistencia`, `aliados`, `usuarios`, `gimnasio`, `tablas`, `facturacion`, `reportes`, `mensajes`. Acciones usadas: `pedidos:verificar`, `pedidos:convertir`, `pedidos:entregar`, `pedidos:cancelar`, `clientes:crear`, `clientes:editar`. También se aceptan `grupo:*` y `*`.
- Una pantalla sin permiso bloquea el cliente HTTP (`api.bloquear()`), así ningún módulo de la página puede hacer peticiones aunque se ejecute.
- «Verificar y convertir» (transferencia) envía solo `{ estado: 'C' }` y deja que el servidor tome la referencia del pedido. En efectivo envía `pagos` con el componente.
- «Reportar pago»: el comprobante es obligatorio solo si el pedido es por transferencia y no tiene referencia.
- El patrón `^[A-Za-z0-9-]{4,30}$` del checkout (que ya existía) es inválido en los navegadores actuales (modo `v` de `pattern`) y rompía la validación. Se cambió a `(?:[A-Za-z0-9]|-){4,30}` en el checkout, en pagos y en pedidos.
- Se reemplazaron también los `confirm()` que ya existían (panel genérico, productos, usuarios, mis pedidos), porque la sección 2 los prohíbe.
- «Cierres de caja» apunta a `caja.html#cierres`. «Notificaciones» es visible para todos los roles. Personal se abre con `empleados` o `asistencia` (para que ENT marque su asistencia).
- Se agregaron las 13 páginas nuevas a la lista de páginas esperadas de `pruebas/verificar-frontend.mjs`.

**Dudas**

1. **URL de la API:** `models/config.js` apunta a `http://localhost:5050/api/v1`, no a Render. No la cambié porque las pruebas existentes simulan `localhost:5050`, pero el sitio publicado en GitHub Pages no podrá hablar con Render así. ¿Se cambia a Render antes de pasar a `main`?
2. Textos exactos de `permisos` que enviará el backend. Hay que confirmar los grupos y las acciones de la lista anterior, o ajustar `models/menu.model.js` y los botones.
3. Clientes, inscripciones, personal, clases y membresías usan `/admin/tablas`, que según la matriz solo es para ADM y CON (lectura). Cuando REC y ENT tengan permisos, esas pantallas les darán 403 hasta que existan `/admin/clientes`, `/admin/inscripciones`, etc. ¿Se habilitará `/admin/tablas` para esas tablas o se esperan las rutas propias?
4. ¿La transición a C para un pedido por transferencia exige `pagos`, o el servidor toma la referencia del pedido?
5. Nombres de campos de `/notificaciones` (el frontend acepta `titulo`/`asunto`, `mensaje`/`descripcion`/`texto`, `leida` S/N o booleana, `fechaLectura`).
6. Ruta para que el cliente informe el comprobante después de comprar (no está en el contrato).
7. Decisión pendiente de la sección 7 (imagen del comprobante): el componente de pagos y el checkout tienen la ranura vacía `data-pagos-ranura-comprobante` y `data-ranura-comprobante`.
8. Cosas que ya existían y no toqué: `cliente/mis-pedidos.html` tiene el botón del carrito repetido y «Nutrici?n» con un carácter dañado en el pie.

## 10. Lista de pruebas antes de pasar a `main`

Preparación: servir `frontend/` (`node pruebas/servidor.mjs`), apuntar `API_BASE_URL` al backend que corresponda y usar las cuentas del seed (una por rol). Las pruebas marcadas con (F2) necesitan que el backend publique la fase 2 y que se encienda el interruptor en `models/funciones.model.js`.

**Comunes a todos los roles del panel**

- Primera carga del día: aparece «Conectando con el servidor, puede tardar un momento» y desaparece al responder.
- El menú muestra solo los grupos del rol. Abrir una página que no corresponde escribiendo su URL muestra «No tienes acceso a esta pantalla» y, en la pestaña Red, ninguna petición a la API.
- Teclado: Tab por el menú, Enter abre el grupo, flechas y Escape dentro del desplegable; el menú plegable funciona en el móvil.
- Tema claro y oscuro en una página nueva y en el diálogo.

**ADM**

- Ve los 6 grupos y todas las pantallas. Dashboard con indicadores y pedidos recientes.
- Pedidos: filtro «Por verificar» (`aria-pressed`). «Reportar pago» con comprobante inválido muestra el error en el campo y con uno válido pasa a «Pago reportado». «Cancelar» pide confirmación en el diálogo; Escape lo cierra y el foco vuelve al botón.
- (F2) «Cobrar y convertir en venta» en efectivo, en transferencia y con pago mixto: no deja enviar si falta o sobra dinero. «Verificar y convertir» y «Marcar entregado».
- Clientes: buscar por cédula de 10 dígitos con Enter. Crear un cliente con cédula inválida muestra el error de la regla ecuatoriana. «Desactivar» usa el diálogo.
- Usuarios: crear cuenta, activar o desactivar con el diálogo, roles con el botón «Roles».
- Productos: desactivar con el diálogo.

**REC** (con `permisos` del servidor)

- Ve Recepción (entradas, inscripciones, clientes, pedidos, ventas, caja). En el dashboard ve aforo, caja, pedidos por verificar e inscripciones web pendientes; los que no tienen servicio dicen «Disponible pronto».
- Pedidos: puede reportar pago y cancelar. Inscripciones: filtro «Web pendientes de cobro». Clientes: crear y editar.
- Usuarios, Otras tablas y Datos del gimnasio (si no tiene ese permiso) quedan bloqueados.

**ENT**

- Ve Gimnasio (clases, rutinas, personal). En el dashboard ve sus clases de hoy y sus clientes con rutina como «Disponible pronto». Pedidos, productos y caja quedan bloqueados.

**CON**

- Ve Contabilidad (facturas, cierres, reportes), inventario y compras en lectura, y Otras tablas en solo lectura. Pedidos sin botones de acción. Dashboard con cuadres sin cerrar y facturas por registrar.

**Sin `permisos` del servidor (estado actual de Render)**

- REC, ENT o CON entran solo al dashboard, con sus accesos directos y sin errores. ADM funciona como antes.

**Cliente web**

- Menú con sesión: «Mis pedidos» y «Mi cuenta».
- Checkout con transferencia: sin comprobante no deja confirmar y enfoca el campo; con «AB-12» sí. Con efectivo el campo no se valida.
- Mis pedidos: estados en texto («Pago reportado: estamos verificándolo», «Pagado: listo para retirar en el gimnasio», «Entregado»). Cancelar un pedido pendiente con el diálogo. Pedido pendiente por transferencia con el aviso «Disponible pronto» para informar el comprobante.
- Mi cuenta: inscripciones con estado, fechas de inicio y fin e ingresos. Rutina y notificaciones con «Disponible pronto».
- Inicio: los planes de 2 y 3 personas explican que los acompañantes se registran en recepción, también en el aviso al agregarlos al carrito.

**Recorridos de la sección 8 (todos necesitan la fase 2 del backend)**

1. Pedido web por transferencia hasta entregado: el cliente compra con comprobante (nace en R); REC filtra «Por verificar», verifica y convierte (C) y marca entregado (E); el cliente ve cada estado en mis pedidos. Hoy solo se puede probar hasta R y la cancelación.
2. Inscripción en el local con pago mixto y acompañante: pendiente de `/admin/inscripciones` (pantalla «Disponible pronto»).
3. Entrada rechazada por aforo y por plan vencido: pendiente de `/admin/entradas` y `/admin/aforo`.
4. Venta en mostrador con factura: pendiente de `/admin/ventas` y `/admin/facturas`.
5. Abrir caja, gasto, cuadre con diferencia y cierre semanal: pendiente de `/admin/caja/*`.
6. Revisión con teclado, NVDA y Lighthouse de cada pantalla nueva (ver la sección 6 de este informe).
