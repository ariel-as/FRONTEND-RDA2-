# FRONTEND: instrucciones para el agente (Reto 2, Planeta Fitness)

Este documento le dice al agente qué modificar en el frontend actual de Planeta Fitness para que deje de leer archivos JSON y guardar todo en el navegador, y pase a trabajar con una API REST. El backend se construye por separado, en otro proyecto; este agente no lo tiene a la vista ni lo modifica. Todo lo que necesita saber de la API (rutas, campos, respuestas, errores y datos de prueba) está en los anexos A y B de este documento. También define el módulo de gestión (panel administrativo) a partir del modelo de base de datos del gimnasio. No trae código: trae qué cambiar, en qué archivos y cómo comprobar que quedó bien.

## 0. Cómo trabajar con este documento

- Leer todo antes de tocar archivos y seguir el orden de la sección 14. Cada paso tiene su comprobación.
- Lo que hoy funciona bien no se rehace: HTML semántico, estilos (`assets/css/styles.css` con Tailwind CDN en el sitio y Bootstrap 5.3 en el panel), tema claro y oscuro, panel lateral del carrito, modal de acceso, validación en dos capas, bloqueo secuencial de formularios y accesibilidad (el proyecto pasó dos auditorías WCAG 2.2 AA, ver `AUDITORIA.md` y `AUDITORIA2.md`). Los cambios deben conservar todo eso.
- Las páginas nuevas copian el encabezado, el pie, el enlace de salto, el aviso de cookies y la región `data-aviso` de una página existente del mismo tipo.
- Hacer el paso 1 de la sección 14 (mover archivos sin cambiar comportamiento) en un commit separado del resto.
- No guardar contraseñas en ningún almacenamiento del navegador.
- Textos de la interfaz y comentarios en español.

## 1. Contexto

### 1.1 Cómo está hoy el frontend

- Sitio de una página (`index.html` con secciones `#inicio`, `#planes`, `#tienda`, `#clases`, `#rutinas`, `#nutricion`, `#contacto`) y páginas en `cliente/` (login, checkout, nutrición).
- Panel en `admin/` (login, dashboard, productos, planes, clases, entrenadores) con Bootstrap.
- JavaScript con módulos ES en `js/`: `app.js` (controlador de las páginas del cliente, 1098 líneas), `admin.js` (panel), `repo.js` (lee `data/*.json` con fetch y aplica cambios del panel guardados en localStorage), `auth.js` (usuarios de prueba de `data/gimnasio.json` y registros locales), `cart.js`, `carrito-panel.js`, `view.js`, `validation.js`, `storage.js`, `indexeddb.js`, `tema.js`.
- El MVC está aplicado por responsabilidad dentro de esos archivos, pero no en carpetas.
- Persistencia: carrito, pedidos, citas, registros y cambios del panel en localStorage; sesión en sessionStorage; copia del catálogo y pedidos en IndexedDB; tema y aviso en cookies.
- Pruebas en `pruebas/` con Node y Playwright, y un workflow en `.github/workflows/`.

### 1.2 Hacia dónde va

- La API corre en `http://localhost:5050` con prefijo `/api/v1` (también responde en `/api`).
- Login con JWT. Roles: `user` (clientes) y `admin` (personal). Dentro de admin hay códigos: ADM administrador, REC recepcionista, ENT entrenador, CON contadora. Escribir en el panel genérico es solo para ADM.
- Los datos del catálogo, pedidos, clientes, planes, clases y personal viven en PostgreSQL.
- El carrito sigue en localStorage (el modelo de datos lo deja así a propósito). Lo que se guarda en la base es el pedido confirmado.

## 2. Decisiones ya tomadas

| Tema | Decisión |
|---|---|
| Estructura | `frontend/` con `models/`, `views/`, `controllers/`, `assets/` e `index.html`, como pide el reto |
| Llamadas a la API | Un único módulo hace todos los `fetch`. Ningún otro archivo llama a fetch |
| Token | En sessionStorage, igual que la sesión actual (se borra al cerrar la pestaña) |
| Precios | La API da el precio sin IVA, el porcentaje de IVA y el precio con IVA. La tienda y el carrito muestran el precio con IVA; el total real del pedido lo calcula el backend |
| Ids | Los productos ahora tienen código de texto (PF0001...), los planes también (MI1, MI2, MI3) y los entrenadores se identifican por cédula. Todas las comparaciones de ids se hacen como texto |
| Planes en el carrito | Se pueden seguir agregando al carrito, pero al confirmar van a otro endpoint: un plan es una inscripción, no un producto del pedido |
| Imágenes | No están en la base (el modelo las quitó a propósito). Se asocian por código en un módulo de presentación del frontend |
| Nutrición | La tabla de citas no existe en el modelo. La página muestra el contacto del nutricionista (profesional aliado) y el formulario se envía como mensaje de contacto |
| Panel de planes, clases y entrenadores | Se reemplazan por el módulo de gestión de la sección 8 |
| Persistencia offline | IndexedDB se queda solo como copia del catálogo para cuando la API no responde |

## 3. Estructura objetivo

```text
frontend/
├── index.html
├── cliente/      login.html, checkout.html, nutricion.html, mis-pedidos.html (nueva)
├── admin/        login.html, index.html, productos.html, pedidos.html (nueva), clientes.html (nueva),
│                 membresias.html (nueva), inscripciones.html (nueva), clases.html (rehecha),
│                 personal.html (nueva), usuarios.html (nueva), tablas.html (nueva)
├── assets/       sin cambios (css, img, icons, js/tema.js, js/identidad.js)
├── models/
├── views/
├── controllers/
└── pruebas/
```

Mapeo de archivos actuales:

| Archivo actual | Nuevo lugar | Cambio |
|---|---|---|
| js/storage.js | models/storage.model.js | Quitar `hashContrasena` y las claves de citas, catálogo local, registros y pedidos. Agregar las funciones del token (4.3) |
| js/indexeddb.js | models/indexeddb.model.js | Subir la versión de la base a 3 y eliminar los almacenes `pedidos` y `citas` en la actualización. Conservar los del catálogo |
| js/auth.js | models/sesion.model.js | Login, registro y perfil contra la API (4.4) |
| js/repo.js | models/catalogo.model.js | Datos desde la API con respaldo en IndexedDB (4.5). Se eliminan las funciones de cambios locales y de ids generados |
| js/cart.js | models/carrito.model.js | Ids como texto, código del plan, tope por stock (4.7) |
| (nuevo) | models/config.js | URL de la API y tiempo de espera |
| (nuevo) | models/api.model.js | Cliente HTTP único (4.2) |
| (nuevo) | models/presentacion.model.js | Imágenes y textos que no están en la base (4.6) |
| (nuevo) | models/pedido.model.js | Confirmar compra, mis pedidos, cancelar (4.8) |
| (nuevo) | models/admin.model.js | Operaciones del panel (4.9) |
| js/view.js | views/componentes.view.js | Tarjeta de producto con precio con IVA y estado agotado (5.1) |
| js/carrito-panel.js | views/carrito.view.js (lo que pinta) y controllers/carrito.controller.js (eventos, modal, login del modal) | Separar vista y controlador |
| js/tema.js | views/tema.view.js | Sin cambios |
| (nuevo) | views/checkout.view.js, views/pedidos.view.js, views/admin.view.js | Sección 5 |
| js/app.js | controllers/main.controller.js (enrutador por `data-pagina`), comunes.controller.js (menú, encabezado fijo, cookies, año, navegación activa), inicio.controller.js, auth.controller.js, checkout.controller.js, nutricion.controller.js | Dividir por página (sección 6) |
| js/validation.js | controllers/validacion.controller.js | Cédula con dígito verificador y errores del servidor (6.3) |
| js/admin.js | controllers/admin.controller.js (enrutador, protección, login, dashboard) y un controlador por pantalla de gestión | Sección 8 |

Se eliminan: la carpeta `data/` completa (el backend ya carga esos datos en la base; `data/gimnasio.json` además tenía contraseñas en texto plano), `admin/planes.html`, `admin/entrenadores.html`, la función `registrarSuscripcion`, el botón "Restablecer catálogo", la casilla "Destacado" del formulario de productos y todo el código que guardaba pedidos, citas o registros de clientes en el navegador.

## 4. Modelos

### 4.1 Configuración

Un archivo con la URL base de la API (`http://localhost:5050/api/v1`) y el tiempo máximo de espera (10 segundos). Es el único lugar donde aparece la dirección del servidor.

### 4.2 Cliente HTTP

Un módulo con funciones get, post, put, patch y eliminar. Requisitos:

- Agrega `Accept: application/json`, `Content-Type: application/json` cuando hay cuerpo y `Authorization: Bearer <token>` cuando hay token guardado.
- Permite marcar una llamada como "requiere sesión": si no hay token, falla con 401 sin llamar al servidor.
- Corta la espera a los 10 segundos.
- Una respuesta 204 devuelve vacío.
- Cualquier fallo se convierte en un error propio con `status` (0 si no hubo conexión o se agotó el tiempo), `mensaje`, `detalles` (la lista de campos con error que manda la API en los 400) y `correlationId`.
- Mensajes: en 4xx usa el `mensaje` que manda la API; en 5xx usa siempre un mensaje genérico ("Ocurrió un error en el servidor. Inténtalo más tarde"); sin conexión, "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo".
- Si el servidor responde 401 y había un token guardado, borra la sesión y emite un evento de ventana (`pf:sesion-expirada`) para que la página reaccione.

### 4.3 Token en storage

Funciones para guardar token y usuario, leer el token (si ya venció según su `exp`, lo borra y devuelve vacío), leer el usuario guardado y borrar la sesión. Leer el `exp` del token es solo para no mandar uno vencido; la seguridad la pone el backend.

### 4.4 Sesión

Reemplaza a `auth.js` y conserva los nombres de funciones que usa el resto del proyecto (`usuarioActual`, `haySesion`, `tieneRol`, `esAdministrador`, `iniciarSesion`, `registrarCliente`, `cerrarSesion`, `guardarPendencia`, `tienePendencia`). `ROLES.cliente` pasa a valer `user`.

- Iniciar sesión: POST `/auth/login` con correo y contraseña. Si la cuenta no es del tipo esperado (cliente en el login de clientes, admin en el del panel), no guarda el token y devuelve el mensaje que ya existe hoy para ese caso.
- Registrar: POST `/auth/register` con cédula, nombre, apellido, correo, teléfono, nivelId y contraseña. La API devuelve token, así que la persona queda con sesión.
- Refrescar perfil: GET `/auth/me`.
- Las comprobaciones de rol del frontend solo deciden qué se muestra.

### 4.5 Catálogo

Reemplaza a `repo.js` manteniendo la experiencia progresiva del proyecto: se pide a la API; si responde, se guarda una copia en IndexedDB y se muestra; si no hay conexión o el servidor falla (5xx), se muestra la copia guardada con un aviso en la región `aria-live`. Un 4xx no se tapa con la copia.

| Función | Endpoint | Adaptación para las vistas |
|---|---|---|
| obtenerProductos | GET /productos?limit=100 | `precio` pasa a ser el precio con IVA y se conserva `precioSinIva`; se agregan `imagen` y `destacado` desde presentación |
| obtenerPlanes | GET /membresias | `precio` con IVA, `personas`, `beneficios`, `imagen` desde presentación |
| obtenerClases | GET /clases | `entrenadorId` = cédula del entrenador, `imagen` desde presentación |
| obtenerEntrenadores | GET /entrenadores | `imagen` y `descripcion` desde presentación |
| obtenerGimnasio | GET /gimnasio | Imagen de cada servicio desde presentación |
| obtenerNiveles | GET /niveles | |
| obtenerAliados | GET /aliados | |
| enviarContacto | POST /contacto | nombre, correo, teléfono (opcional) y mensaje (10 a 400) |

Diferencias con los JSON que las vistas deben tener en cuenta: los niveles ahora son objetos con `id` y `descripcion` (no textos sueltos); los horarios de atención traen `abierto`; los productos traen `stock` y `disponible`.

### 4.6 Presentación

Módulo con datos de presentación que el modelo dejó fuera de la base:

| Código | Imagen |
|---|---|
| PF0001 | productos/whey-protein.jpg (destacado) |
| PF0002 | productos/whey-protein-2lb-chocolate.jpg (destacado) |
| PF0003 | productos/creatina.jpg (destacado) |
| PF0004 | productos/barra-proteica.jpg |
| PF0005 | productos/short-deportivo.jpg |
| PF0006 | productos/short-gymshark.jpg |
| PF0007 | productos/buzo-compresion.jpg |
| PF0008 | productos/straps.jpg |
| PF0009 | productos/munequeras.jpg |
| PF0010 | productos/cinturon-cuero.jpg |
| Cualquier otro producto | productos/generico.svg |
| Plan MI1, MI2, MI3 | gimnasio/pesas.jpg, gimnasio/cardio.jpg, gimnasio/hero-gimnasio.jpg |
| Clase 1 (Boxeo), 2 (Bailoterapia) | clases/boxeo.jpg, clases/bailoterapia.jpg |
| Servicios PES, CAR, BOX, BAI, RUT, NUT | pesas, cardio, boxeo, bailoterapia, hero-gimnasio, nutricion |
| Entrenadores por cédula: 1700000019 (Boxeo), 1700000027 (Bailoterapia), 1700000035 (Rutinas personalizadas) | entrenador-1, entrenador-2, entrenador-3, con las descripciones que hoy están en `data/entrenadores.json` |

Todas las rutas son relativas a `assets/img/`. Los códigos y cédulas son los que carga el backend (anexo B).

### 4.7 Carrito

`cart.js` pasa casi igual. Cambios:

- Todas las búsquedas por id comparan como texto.
- Cada línea guarda además `membresiaId` (solo en planes) y `stock` (en productos).
- La cantidad máxima de una línea es el menor entre el máximo actual y el stock disponible. El backend vuelve a comprobar el stock al confirmar.
- El precio guardado es el precio con IVA (es lo que se muestra). El total del carrito se presenta como "total estimado, IVA incluido".

### 4.8 Pedidos

- Confirmar compra: separa las líneas del carrito. Los productos van juntos en un POST `/pedidos` con metodoPago, refTransferencia (solo si es transferencia y se escribió) e items con productoId y cantidad. No se envían precios. Cada plan va en su propio POST `/inscripciones` con membresiaId. Devuelve el pedido creado, las inscripciones creadas, los errores de cada parte y la lista de líneas que la base confirmó. Un 401 corta todo el proceso.
- Mis pedidos: GET `/pedidos/mis-pedidos` paginado.
- Mis planes: GET `/inscripciones/mis-inscripciones`.
- Cancelar: PATCH `/pedidos/:id/cancelar`.

### 4.9 Panel

Funciones para todos los endpoints de administración del anexo A: resumen, productos (listar con inactivos, crear, editar, desactivar), categorías, pedidos (listar con filtro, cambiar estado), usuarios del personal (crear cuenta, activar o desactivar) y tablas genéricas (lista, meta, opciones, filas con filtros, una fila, crear, editar, eliminar). Los ids en la URL se codifican; las claves compuestas van unidas con `~`.

## 5. Vistas

### 5.1 Componentes

- Tarjeta de producto: el precio es el precio con IVA y debajo dice "IVA incluido". Si `disponible` es falso, el botón dice "Agotado", queda deshabilitado (`disabled` y `aria-disabled`) y no se puede agregar. El `data-id` del botón es el código del producto.
- Tarjeta de entrenador: usa la descripción e imagen de presentación.
- Los niveles se pintan con su `descripcion`.

### 5.2 Checkout

Funciones para pintar el resumen (líneas, etiqueta "Plan" en los planes, total estimado con IVA), los datos del cliente en solo lectura (nombre y correo de la sesión) y la confirmación con lo que devolvió la base: número de pedido, estado, líneas con su subtotal, total del pedido y, por cada plan, "Pendiente de pago en recepción" con su valor.

### 5.3 Mis pedidos

Tarjeta de pedido (número, fecha, forma de pago, estado escrito en texto, líneas, total y botón "Cancelar pedido" solo si está pendiente, con `aria-label` que incluye el número), tarjeta de plan (nombre, fechas, estado, valor) y una paginación reutilizable (`nav` con etiqueta, botones Anterior y Siguiente, texto "Página X de Y" en región viva).

### 5.4 Panel

Una vista genérica que, a partir de los metadatos de una tabla, pinta la tabla de datos y el formulario (sección 8.2). Las pantallas dedicadas la usan pasando qué columnas mostrar, en qué orden, con qué etiquetas y qué controles.

## 6. Controladores de las páginas del cliente

### 6.1 Enrutador

Lee `data-pagina` del body y arranca solo el controlador de esa página (inicio, login, checkout, nutricion, mis-pedidos), después de las funciones comunes. Escucha `pf:sesion-expirada`: muestra el aviso "Tu sesión terminó. Inicia sesión de nuevo; tu carrito se conserva" y, si está en checkout o mis pedidos, lleva al login con `?origen=` de esa página. Si algo falla al arrancar, muestra un aviso y deja el error en consola.

### 6.2 Inicio

- Agregar al carrito: el id se lee como texto (hoy se convierte a número y eso rompe con los códigos nuevos).
- Elegir plan: la línea del carrito lleva `membresiaId` con el código del plan.
- Formulario de contacto: envía a la API; si responde 400, marca los campos con error (6.3); si va bien, limpia y muestra el mensaje de éxito actual.
- Los mensajes de origen de datos se mantienen (`api`, `indexeddb` o `error`).

### 6.3 Validación

- `validarCedula` comprueba el dígito verificador ecuatoriano (provincia 01 a 24 o 30, tercer dígito menor que 6, módulo 10), igual que el backend.
- Función nueva para mostrar los errores de la API: recibe el formulario, el error y un mapa opcional de nombre de campo de la API a id del input; marca cada campo con su mensaje usando las funciones de error que ya existen y enfoca el primero.

### 6.4 Login y registro de clientes

- Login con la API dentro de manejo de errores (credenciales incorrectas, demasiados intentos, sin conexión). Después del login: si hay compra pendiente u origen checkout, va al checkout; si el origen es mis-pedidos, a esa página; si no, al inicio.
- Registro con la API. Se quita la comprobación de "registro local". Si la API responde 400, se marcan los campos con el mapa (cedula a cedula-registro, nombre a nombre-registro, apellido a apellido-registro, correo a correo-registro, telefono a telefono-registro, contrasena a contrasena-registro). Un 409 muestra el mensaje de la API (correo o cédula ya registrados). Si va bien, la persona queda con sesión y sigue el mismo destino que el login.
- El login del modal del carrito también va dentro de manejo de errores y muestra el mensaje en la región del modal.

### 6.5 Checkout

- Sin sesión: guarda la pendencia y va al login con `?origen=carrito` (como hoy). Carrito vacío: muestra el bloque vacío (como hoy).
- Pinta el resumen y los datos del cliente desde `/auth/me` (si falla con 401, va al login).
- El campo del comprobante aparece solo cuando se elige transferencia.
- Al confirmar: deshabilita el botón y marca `aria-busy`, anuncia "Registrando tu pedido...", llama a confirmar compra y quita del carrito solo las líneas que la base confirmó. Si hubo errores parciales (por ejemplo, el pedido entró pero el plan no porque ya hay una inscripción pendiente), lo explica. Un 409 de stock dice cuántas unidades quedan y pide ajustar la cantidad. Si al menos algo se confirmó, oculta el formulario, muestra la confirmación y lleva el foco a su título.
- El pedido ya no se guarda en localStorage ni en IndexedDB.

### 6.6 Mis pedidos

Página nueva. Sin sesión, va al login con `?origen=mis-pedidos`. Carga los pedidos con paginación y los planes. "Cancelar pedido" pide confirmación, llama a la API, avisa el resultado y recarga la lista.

### 6.7 Nutrición

Carga los aliados y muestra los de servicio Nutrición en tarjetas (nombre, consultorio, enlace para llamar y correo si existe). El formulario envía un mensaje de contacto con el texto "[Nutrición] Motivo: ... " más los comentarios (máximo 400 caracteres).

## 7. Cambios en el HTML del cliente

| Página | Cambio |
|---|---|
| Todas | El script de módulo apunta a `controllers/main.controller.js` (con `../` en `cliente/`). Los scripts clásicos del head (`assets/js/tema.js`, `identidad.js`) se quedan |
| Encabezado | Dentro del bloque de sesión activa, enlace "Mis pedidos" a `cliente/mis-pedidos.html` |
| cliente/login.html | "Nombre completo" se divide en "Nombres" (id nombre-registro, name nombre, autocomplete given-name) y "Apellidos" (id apellido-registro, name apellido, autocomplete family-name). El select de nivel cambia su name a `nivelId` y sus valores a PRI, INT, AVA. Contraseñas con máximo 72. Cambiar el texto "Tu registro queda guardado solo en este navegador..." por "Tu cuenta se guarda en el sistema del gimnasio. La contraseña se protege en el servidor". Botón "Crear cuenta". Actualizar la meta description, que dice "sin servidor" |
| cliente/checkout.html | Los tres inputs de datos del cliente se reemplazan por un bloque de solo lectura (`data-checkout-cliente`). Se agrega un fieldset "Forma de pago" con legend y dos radios (Efectivo al retirar = EF, marcado; Transferencia bancaria = TR) y un campo opcional "Número de comprobante" (4 a 30 letras, números o guion) oculto hasta elegir transferencia, con texto de ayuda enlazado. El botón dice "Confirmar pedido". La confirmación agrega un enlace "Ver mis pedidos" |
| cliente/nutricion.html | Se quitan cédula, fecha y hora. Se agrega una sección "Nuestro nutricionista" con un contenedor para las tarjetas de aliados (región viva). El formulario se llama "Solicitar información" y conserva nombre, correo, teléfono, motivo y comentarios |
| cliente/mis-pedidos.html (nueva) | `data-pagina="mis-pedidos"`, un h1 "Mis pedidos", región de mensajes, sección "Pedidos de la tienda" con su contenedor y su paginación, y sección "Mis planes" |

## 8. Módulo de gestión (panel administrativo)

El panel se rehace para administrar el modelo de base de datos del gimnasio. Las tablas, columnas y relaciones salen del modelo definitivo (las tablas de campos de cada pantalla de esta sección ya vienen del modelo; para el resto, la API entrega la estructura de cada tabla con el endpoint `meta` del anexo A). Las relaciones muchos a muchos del modelo ya están normalizadas con su tabla intermedia, y en el panel se manejan así: la intermedia se edita desde la pantalla de una de sus dos tablas (por ejemplo, los servicios incluidos en un plan se marcan desde la pantalla del plan), nunca como una relación directa.

### 8.1 Menú del panel

Barra superior con estos enlaces (con `aria-current="page"` en el actual):

Dashboard, Productos, Pedidos, Clientes, Membresías, Inscripciones, Clases, Personal, Usuarios, Otras tablas.

Pantallas que solo ve el rol ADM en el menú: Usuarios. Las demás las ve cualquier rol admin, pero los botones de crear, editar y eliminar en tablas genéricas solo aparecen para ADM (el backend responde 403 de todos modos).

### 8.2 Comportamiento común de todas las pantallas

- Protección: si la sesión no es admin, redirige a `admin/login.html`. Si llega `pf:sesion-expirada`, también.
- Tabla de datos con `caption`, encabezados `th scope="col"`, primera celda de cada fila como `th scope="row"`, paginación (la misma de 5.3) y filtros cuando la pantalla los indique.
- Columnas de fechas en formato local de Ecuador; valores vacíos escritos como "vacío" en texto atenuado; listas de estados mostradas con su significado (no la letra sola).
- Crear y editar en un `dialog` modal con título enlazado, foco en el primer campo editable, cierre con Escape o Cancelar y foco de vuelta al botón que lo abrió.
- Controles según el tipo de columna (las tablas de cada pantalla ya lo indican): texto con su longitud máxima, área de texto para textos de 200 o más, número entero, número con dos decimales, fecha, lista desplegable para las columnas de un carácter con valores fijos, y lista desplegable llenada con `/admin/tablas/<tabla>/opciones` para las claves foráneas.
- Campos obligatorios marcados con asterisco y la leyenda "Los campos con * son obligatorios".
- Al editar, la clave primaria queda en solo lectura. Los campos autoincrementales no se muestran al crear. Los campos que calcula el sistema se muestran en solo lectura.
- Si la API responde 400, cada campo muestra su mensaje (función de 6.3). Un 409 (por ejemplo, un código repetido o un registro con datos relacionados) se muestra en la región de mensajes.
- Eliminar pide confirmación nombrando el registro.
- Cada botón de fila tiene `aria-label` con el registro al que pertenece.
- Mensajes de carga, éxito y error en una región `role="status"` con `aria-live="polite"`, y `aria-busy` en la tabla mientras carga.

### 8.3 Dashboard (admin/index.html)

Tarjetas con los totales de `/admin/resumen`: productos a la venta, productos bajo stock mínimo, pedidos por atender, clientes activos, planes web por cobrar y mensajes sin responder. Debajo, los cinco pedidos más recientes (GET `/pedidos?limit=5`) con enlace a la pantalla de pedidos. Se elimina la tabla de citas.

### 8.4 Productos (admin/productos.html)

Usa los endpoints propios de productos, no el panel genérico.

Tabla: producto (nombre y código), categoría, precio sin IVA y con IVA, stock (con la marca "bajo mínimo" si stock ≤ stock mínimo), estado y si se publica en la web. Filtro por estado (A la venta, Pendiente, Inactivo). Acciones: Editar y Desactivar (antes "Eliminar"; el backend hace baja lógica).

Formulario:

| Campo de la API | Etiqueta | Control | Regla |
|---|---|---|---|
| id | Código | Texto, máximo 13 (letras, números, guion) | Opcional al crear (si se deja vacío lo genera el backend); solo lectura al editar |
| nombre | Nombre | Texto, máximo 100 | Obligatorio |
| categoriaId | Categoría | Lista desde GET /categorias | Obligatorio |
| unidadMedidaId | Unidad de medida | Lista desde opciones de unidad_medida | Por defecto unidad |
| contenido | Contenido | Número con decimales | Opcional |
| talla | Talla | Texto, máximo 4 | Opcional |
| precio | Precio sin IVA | Número con dos decimales, mayor que 0 | Obligatorio |
| pagaIva | Grava IVA | Casilla | Marcada por defecto |
| stock | Stock | Entero, 0 o más | Al cambiarlo se registra un ajuste en el kárdex |
| stockMin | Stock mínimo | Entero, 0 o más | |
| costoUnit | Costo unitario | Número con decimales | Se envía solo si cambia el stock |
| motivoAjuste | Motivo del ajuste | Texto, máximo 200 | Se envía solo si cambia el stock |
| controlaCaducidad | El producto caduca | Casilla | Suplementos, bebidas y snacks |
| diasAlertaCad | Días de alerta | Entero de 1 a 365 | Solo si caduca |
| fechaCaducidad | Caducidad del lote | Fecha | Obligatoria si el producto caduca y el stock aumenta |
| publicarWeb | Vender en la tienda web | Casilla | Marcada por defecto |
| estado | Estado | Lista: A la venta, Pendiente de autorización, Inactivo | |
| descripcion | Descripción | Área de texto, máximo 300 | Opcional |

Si el admin que está usando el panel no tiene un empleado vinculado y cambia el stock, el backend responde 403 (el kárdex necesita saber qué empleado hizo el ajuste). Hay que mostrar ese mensaje tal cual.

### 8.5 Pedidos (admin/pedidos.html)

Tabla: número, cliente (login), fecha, forma de pago (con el comprobante si hay), productos (resumen desplegable con `details`), total, estado. Filtro por estado. Acciones según el estado: "Pago reportado" (solo en P; pide el número de comprobante y permite dejarlo vacío si ya lo envió el cliente; si se cancela la ventana, no hace nada) y "Cancelar" (en P y R, con confirmación). Las transiciones a pagado y retirado no están disponibles todavía (dependen del proceso de venta que el backend dejó para después) y no se muestran.

### 8.6 Clientes (admin/clientes.html)

Tabla `cliente` por el panel genérico. Columnas de la lista: cédula, nombres, apellidos, teléfono, correo, nivel, estado. Filtro por estado. El registro CONSUMIDOR FINAL (9999999999) se muestra pero no se puede editar ni eliminar. Los clientes no se eliminan (el modelo dice que quedan como historial): en lugar de Eliminar, la acción es cambiar el estado a Inactivo.

Campos:

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Cédula de identidad del cliente | Texto (máx. 10) | Sí |
| `nivelId` | Código del nivel de entrenamiento del cliente | Lista desplegable con los registros de `nivel` | No |
| `usuarioId` | Cuenta web del cliente | Lista desplegable con los registros de `usuario` | No |
| `nombre` | Nombres del cliente | Texto (máx. 60) | Sí |
| `apellido` | Apellidos del cliente | Texto (máx. 60) | Sí |
| `ruc` | RUC del cliente si pide factura con RUC | Texto (máx. 13) | No |
| `direccion` | Dirección del cliente para la factura | Área de texto (máx. 200) | No |
| `telefono` | Celular del cliente | Texto (máx. 10) | No |
| `correo` | Correo electrónico del cliente | Texto (máx. 120) | No |
| `sector` | Sector o ubicación donde vive el cliente | Texto (máx. 100) | No |
| `fechaNacimiento` | Fecha de nacimiento del cliente | Fecha | No |
| `esEstudiante` | Indicador si accede a plan estudiantil | Lista desplegable: S=Sí, N=No | No |
| `fechaRegistro` | Fecha en que se registró el cliente | Solo lectura (fecha automática) | No |
| `estado` | Estado del cliente | Lista desplegable: A=Activo, I=Inactivo | Sí |

### 8.7 Membresías (admin/membresias.html)

Tres bloques en la misma página:

1. Planes (`membresia`). Lista: código, nombre, tipo, duración o ingresos, personas, precio, paga IVA, se publica en la web, estado. Al editar un plan, debajo del formulario aparece la lista de servicios con una casilla por servicio: marcar crea la fila en `membresia_servicio` y desmarcar la elimina. Solo se ofrecen servicios de tipo interno (I), como exige el modelo. Regla del formulario: si el tipo es T se piden duración y unidad y se oculta número de ingresos; si es I, al revés.

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Código de la membresía | Texto (máx. 4) | Sí |
| `nombre` | Nombre del plan | Texto (máx. 60) | Sí |
| `descripcion` | Descripción del plan | Área de texto (máx. 200) | No |
| `tipo` | Tipo de control | Lista desplegable: T=Por tiempo: diario, mensual, anual; I=Por ingresos: tarjeta de 30 ingresos | Sí |
| `duracion` | Cantidad de la duración | Número entero | No |
| `unidadDuracion` | Unidad de la duración | Lista desplegable: D=Días, M=Meses calendario | No |
| `numIngresos` | Número de ingresos que da la tarjeta | Número entero | No |
| `numPersonas` | Máximo de personas que cubre el plan | Número entero | No |
| `precio` | Precio vigente del plan sin IVA | Número con decimales | Sí |
| `pagaIva` | Indicador si la membresía grava IVA | Lista desplegable: S=Sí, N=No | Sí |
| `incluyeRutina` | Indicador si incluye rutina y guía | Lista desplegable: S=Sí, N=No | Sí |
| `esEstudiantil` | Indicador si es plan estudiantil | Lista desplegable: S=Sí, N=No | Sí |
| `publicarWeb` | Decisión de gestión: si el plan se puede contratar por la web | Lista desplegable: S=Sí, N=No | Sí |
| `estado` | Estado del plan | Lista desplegable: A=Activo, I=Inactivo | Sí |

2. Servicios (`servicio`): código, nombre, descripción, tipo (I interno, A aliado) y estado.

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Código del servicio | Texto (máx. 4) | Sí |
| `nombre` | Nombre del servicio | Texto (máx. 60) | Sí |
| `descripcion` | Descripción del servicio | Área de texto (máx. 200) | No |
| `tipo` | Tipo | Lista desplegable: I=Interno del gimnasio, A=Ofrecido por un profesional aliado; el gimnasio no gestiona sus citas | Sí |
| `estado` | Estado del servicio | Lista desplegable: A=Activo, S=Suspendido | Sí |

3. Promociones (`promocion` y su intermedia `membresia_promocion`). Lista de promociones con fechas y porcentaje. Al editar una promoción, casillas con los planes a los que aplica (crean o eliminan filas de `membresia_promocion`).

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Número de la promoción | No se muestra en el formulario (lo genera la base) | No |
| `descripcion` | Descripción de la promoción | Texto (máx. 150) | Sí |
| `fechaIni` | Fecha de inicio de la promoción | Fecha | Sí |
| `fechaFin` | Fecha de fin de la promoción | Fecha | Sí |
| `porcentaje` | Porcentaje de descuento | Número con decimales | Sí |
| `requiereAutoriz` | Indicador si requiere autorización del administrador | Lista desplegable: S=Sí, N=No | Sí |

Intermedias que se manejan con casillas, sin pantalla propia:

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `membresiaId` | Código de la membresía | Lista desplegable con los registros de `membresia` | Sí |
| `servicioId` | Código del servicio incluido | Lista desplegable con los registros de `servicio` | Sí |
| `observacion` | Observación sobre el beneficio | Texto (máx. 150) | No |

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `membresiaId` | Código de la membresía | Lista desplegable con los registros de `membresia` | Sí |
| `promocionId` | Número de la promoción | Lista desplegable con los registros de `promocion` | Sí |

### 8.8 Inscripciones (admin/inscripciones.html)

Solo lectura (las inscripciones cambian por procesos de cobro y anulación que vendrán después). Lista con filtros por estado y por canal: número, plan, titular, fecha de inicio, fecha de fin, valor, IVA, canal y estado. Al abrir una inscripción se muestran todas sus columnas y sus integrantes (`inscripcion_cliente`). Las inscripciones web pendientes de pago (canal W, estado P) se destacan con texto, para que recepción sepa a quién cobrar.

Columnas de `inscripcion`:

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Número de la inscripción | No se muestra en el formulario (lo genera la base) | No |
| `membresiaId` | Código de la membresía contratada | Lista desplegable con los registros de `membresia` | Sí |
| `promocionId` | Promoción aplicada | Lista desplegable con los registros de `promocion` | No |
| `empleadoId` | Empleado que registra la inscripción | Lista desplegable con los registros de `empleado` | No |
| `empAutorizaId` | Empleado | Lista desplegable con los registros de `empleado` | No |
| `fechaAutoriza` | Fecha en que se autorizó la promoción | Fecha y hora | No |
| `fechaRegistro` | Fecha en que se registra la inscripción | Solo lectura (fecha automática) | No |
| `fechaInicio` | Fecha de inicio de la membresía | Fecha | Sí |
| `fechaFin` | Fecha de fin en planes por tiempo | Solo lectura (lo calcula el sistema) | No |
| `ingresosTotal` | Ingresos comprados con la tarjeta | Solo lectura (lo calcula el sistema) | No |
| `precioBase` | Precio sin IVA copiado de MEM_Precio al contratar | Número con decimales | Sí |
| `descuento` | Valor descontado por la promoción | Número con decimales | No |
| `valor` | Valor final sin IVA | Número con decimales | Sí |
| `porcentajeIva` | Porcentaje de IVA al contratar | Número con decimales | Sí |
| `canal` | Canal por el que se contrató | Lista desplegable: W=Web, L=Local | Sí |
| `estado` | Estado | Lista desplegable: P=Pendiente de pago, A=Activa, V=Vencida o tarjeta agotada, S=Suspendida, X=Anulada | Sí |
| `empAnulaId` | Empleado que registró la anulación de la inscripción | Lista desplegable con los registros de `empleado` | No |
| `fechaAnula` | Fecha y hora de la anulación de la inscripción | Fecha y hora | No |
| `motivoAnula` | Motivo de la anulación de la inscripción | Área de texto (máx. 200) | No |

Integrantes (`inscripcion_cliente`):

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `inscripcionId` | Número de la inscripción | Lista desplegable con los registros de `inscripcion` | Sí |
| `clienteId` | Cédula del cliente beneficiario | Lista desplegable con los registros de `cliente` | Sí |
| `esTitular` | Indicador si es el titular | Lista desplegable: S=Sí, N=No | Sí |

### 8.9 Clases (admin/clases.html)

Reemplaza la página actual de clases y la de entrenadores.

1. Clases (`clase`): nombre, servicio, instructor, lugar, cupo y estado. El instructor se elige de la lista de empleados; el servicio, de los servicios internos.

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Código de la clase | No se muestra en el formulario (lo genera la base) | No |
| `servicioId` | Servicio al que pertenece la clase | Lista desplegable con los registros de `servicio` | Sí |
| `empleadoId` | Instructor de la clase | Lista desplegable con los registros de `empleado` | Sí |
| `nombre` | Nombre de la clase | Texto (máx. 60) | Sí |
| `descripcion` | Descripción de la clase | Área de texto (máx. 200) | No |
| `lugar` | Lugar donde se dicta | Texto (máx. 60) | No |
| `cupoMax` | Cupo máximo de personas por clase | Número entero | Sí |
| `estado` | Estado de la clase | Lista desplegable: A=Activa, S=Suspendida, ej. boxeo | Sí |

2. Horarios (`horario`): día, hora de inicio y hora de fin (formato HH:MM, fin mayor que inicio).

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Código del horario | No se muestra en el formulario (lo genera la base) | No |
| `dia` | Día de la semana | Texto (máx. 10) | Sí |
| `horaInicio` | Hora de inicio del bloque | Texto (máx. 5) | Sí |
| `horaFin` | Hora de fin del bloque | Texto (máx. 5) | Sí |

3. Horarios de cada clase (`clase_horario`): al editar una clase se ven sus horarios con su estado y se puede agregar un horario existente o cambiar su estado a suspendido.

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `claseId` | Código de la clase | Lista desplegable con los registros de `clase` | Sí |
| `horarioId` | Código del horario | Lista desplegable con los registros de `horario` | Sí |
| `estado` | Estado del horario de la clase | Lista desplegable: A=Activo, S=Suspendido | Sí |

### 8.10 Personal (admin/personal.html)

1. Empleados (`empleado`): cédula, nombres, apellidos, cargo, turno, especialidad, teléfono, correo, fecha de ingreso, sueldo y estado. La cuenta de usuario vinculada se muestra en solo lectura y se gestiona en Usuarios. Los empleados no se eliminan: se pasan a Inactivo.

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Cédula del empleado | Texto (máx. 10) | Sí |
| `cargoId` | Código del cargo del empleado | Lista desplegable con los registros de `cargo` | Sí |
| `turnoId` | Código del turno asignado | Lista desplegable con los registros de `turno` | No |
| `usuarioId` | Cuenta de usuario si tiene acceso al sistema | Lista desplegable con los registros de `usuario` | No |
| `nombre` | Nombres del empleado | Texto (máx. 60) | Sí |
| `apellido` | Apellidos del empleado | Texto (máx. 60) | Sí |
| `telefono` | Teléfono celular del empleado | Texto (máx. 10) | No |
| `correo` | Correo electrónico del empleado | Texto (máx. 120) | No |
| `especialidad` | Especialidad del entrenador | Texto (máx. 60) | No |
| `fechaIngreso` | Fecha de ingreso al gimnasio | Fecha | Sí |
| `sueldo` | Sueldo del empleado | Número con decimales | No |
| `estado` | Estado del empleado | Lista desplegable: A=Activo, I=Inactivo | Sí |

2. Cargos (`cargo`) y turnos (`turno`), en dos tablas pequeñas al final de la página.

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Código del cargo | Texto (máx. 3) | Sí |
| `descripcion` | Descripción del cargo | Texto (máx. 100) | Sí |
| `sueldoBase` | Sueldo base referencial del cargo | Número con decimales | No |

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Código del turno | Texto (máx. 3) | Sí |
| `descripcion` | Descripción del turno | Texto (máx. 50) | Sí |
| `horaInicio` | Hora de inicio del turno | Texto (máx. 5) | Sí |
| `horaFin` | Hora de fin del turno | Texto (máx. 5) | Sí |

### 8.11 Usuarios (admin/usuarios.html, solo ADM)

- Lista de `usuario` (solo lectura por el panel genérico): login, fecha de creación, último acceso, estado y roles.
- Botón "Nueva cuenta del personal": formulario con correo, contraseña (8 a 72, letras y números), confirmación, empleado a vincular (lista de empleados sin cuenta) y roles (casillas de los roles de tipo A). Usa POST `/admin/usuarios`.
- Acción Activar o Desactivar por fila (PATCH `/admin/usuarios/:id/estado`). No se ofrece en la propia cuenta.
- Roles de una cuenta (`usuario_rol`): al abrir una cuenta se ven sus roles con su estado; se puede asignar otro rol o cambiar el estado de una asignación. Las cuentas de clientes (rol CLI) se crean desde el registro de la web, no aquí.
- La contraseña nunca se muestra ni se edita desde esta pantalla.

Columnas de `usuario`:

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Código del usuario | No se muestra en el formulario (lo genera la base) | No |
| `login` | Correo o nombre de usuario con el que ingresa | Texto (máx. 120) | Sí |
| `claveHash` | Contraseña | Nunca se muestra; solo se escribe al crear la cuenta (campo `contrasena`) | Sí |
| `fechaCreacion` | Fecha de creación de la cuenta | Solo lectura (fecha automática) | No |
| `ultimoAcceso` | Fecha y hora del último ingreso | Solo lectura (lo registra el login) | No |
| `estado` | Estado del usuario | Lista desplegable: A=Activo, I=Inactivo | No |

Asignación de roles (`usuario_rol`):

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `usuarioId` | Código del usuario | Lista desplegable con los registros de `usuario` | Sí |
| `rolId` | Código del rol asignado | Lista desplegable con los registros de `rol` | Sí |
| `fechaAsigna` | Fecha en que se le asignó el rol | Solo lectura (fecha automática) | No |
| `estado` | Estado de la asignación | Lista desplegable: A=Activo, I=Inactivo | Sí |

Roles (`rol`, consulta):

| Campo en la API | Etiqueta | Control | Obligatorio |
|---|---|---|---|
| `id` | Código del rol | Texto (máx. 4) | Sí |
| `descripcion` | Descripción del rol | Texto (máx. 60) | Sí |
| `tipo` | Grupo del rol | Lista desplegable: A=Administrativo 'admin', U=Usuario normal 'user' | Sí |
| `permisos` | Detalle de los módulos a los que tiene acceso el rol | Área de texto (máx. 300) | No |

### 8.12 Otras tablas (admin/tablas.html)

Pantalla genérica para el resto del modelo. Un selector de tabla agrupado por módulo (con `optgroup`), donde las tablas de solo lectura dicen "(solo lectura)". Al elegir una tabla se carga su meta, se pinta la tabla con todas sus columnas y, si la tabla es crud y la sesión es ADM, se habilitan Nuevo, Editar y Eliminar con el formulario armado desde la meta. La tabla elegida queda en la URL (`?tabla=...`) para poder enlazarla.

Tablas que se gestionan aquí (crud): gimnasio, horario_atencion, asistencia_empleado, nivel, rutina, profesional_aliado, categoria, unidad_medida, proveedor, producto_proveedor, tipo_movimiento, metodo_pago y mensaje_contacto (para marcar mensajes como respondidos).

Tablas que se ven aquí en solo lectura: suspension, asistencia_cliente, comision_aliado, orden_compra, producto_ordencompra, lote_producto, kardex, pedido_detalle, venta, detalle_venta, factura, pago, cierre_caja, cuadre_turno, movimiento_caja y notificacion.

## 9. Manejo de errores y estados de carga

| Situación | Status | Qué hace el frontend |
|---|---|---|
| Sin conexión, servidor apagado o CORS bloqueado | 0 | Mensaje de conexión en la región viva. El catálogo muestra la copia de IndexedDB si existe |
| Tiempo agotado | 0 | "El servidor tardó demasiado en responder. Inténtalo de nuevo" |
| Datos inválidos | 400 | Marca cada campo con su mensaje y enfoca el primero |
| Sesión vencida o token inválido | 401 | Se borra la sesión; en checkout y mis pedidos se va al login con el carrito intacto; en el panel, al login del panel |
| Sin permiso | 403 | "Tu cuenta no tiene permiso para realizar esta acción" |
| No existe | 404 | Mensaje en la página |
| Conflicto | 409 | Mensaje del servidor (stock, duplicado, inscripción pendiente, datos relacionados) |
| Demasiados intentos | 429 | "Espera unos minutos y vuelve a probar" |
| Error del servidor | 500 / 503 | Mensaje genérico, sin detalles técnicos |

Mientras se espera: `aria-busy` en el contenedor que carga, botón de envío deshabilitado para no duplicar pedidos, y el carrito solo se vacía (total o parcialmente) cuando la base confirmó.

## 10. Accesibilidad de lo nuevo

- Un solo h1 por página y jerarquía de encabezados ordenada en las páginas nuevas.
- Tablas con caption y encabezados con scope.
- Estados escritos en texto, nunca solo con color.
- La forma de pago es un fieldset con legend; el comprobante tiene ayuda con `aria-describedby`.
- Formularios del panel en `dialog` modal con título enlazado y retorno del foco.
- Paginación como `nav` con etiqueta y botones reales.
- "Agotado" es un botón deshabilitado con texto.
- Revisar contraste de lo nuevo en modo claro y oscuro con la misma herramienta de las auditorías, y recorrer todo con teclado.

## 11. Correr frontend y backend juntos

1. Backend en `server/` con `npm run dev` (puerto 5050).
2. Frontend con Live Server desde `frontend/` (normalmente `http://127.0.0.1:5500`).
3. Esa dirección exacta debe estar permitida en el CORS del backend (por defecto acepta `http://localhost:5500` y `http://127.0.0.1:5500`; para CORS son orígenes distintos). Si se usa otro puerto, avisar a quien maneja el backend.
4. Si el backend activa HTTPS, cambiar la URL en `models/config.js`.

Neocities y GitHub Pages solo sirven archivos estáticos: el frontend publicado necesitaría el backend publicado con HTTPS. Para la entrega basta con correr ambos en local; dejarlo explicado en el README.

## 12. Pruebas

Actualizar las pruebas existentes:

| Archivo | Cambio |
|---|---|
| prueba-logica.mjs | Rutas nuevas; casos de cédula con dígito verificador, ids de texto en el carrito y tope por stock |
| prueba-repo.mjs | Reescribir para el modelo de catálogo simulando fetch: respuesta correcta de la API, error de red con respaldo en IndexedDB y 4xx sin respaldo |
| prueba-selectores, prueba-enlaces, prueba-html, prueba-accesibilidad, prueba-responsive | Rutas a `frontend/` y las páginas nuevas incluidas |
| prueba-arquitectura.mjs | Reglas: `models/` no importa de `views/` ni de `controllers/`; `views/` no llama a la API; solo el cliente HTTP usa fetch; no queda ningún import a `data/` |
| prueba-navegador.mjs | Requiere el backend con el seed. Flujo: login con la cuenta de cliente del anexo B, agregar al carrito, confirmar, ver el número de pedido, entrar al panel con la cuenta admin y ver ese pedido |
| .github/workflows | Rutas nuevas; las pruebas que necesitan backend se dejan fuera del CI o se levanta PostgreSQL en el workflow |

Evidencias del reto que dependen del frontend (capturas para el README):

| Prueba | Cómo mostrarla |
|---|---|
| Catálogo se ve en el frontend | Tienda con la pestaña Red mostrando GET /api/v1/productos con 200 |
| Carrito funciona y persiste | Agregar, cambiar cantidades, recargar y mostrar que sigue igual (clave `carrito` en Local Storage) |
| Login obligatorio para comprar | Finalizar compra sin sesión abre el modal y el carrito no se vacía |
| Confirmar pedido (user) y pedido en la base | Confirmación con número de pedido y la misma fila en Prisma Studio |
| Admin ve todos los pedidos | Pantalla de pedidos con pedidos de varios clientes |
| User no puede administrar | Abrir el panel con cuenta de cliente redirige al login |

## 13. README

Actualizar el README del proyecto:

- Ya no es "sin backend": explicar frontend + API + PostgreSQL.
- Arquitectura MVC del frontend (models, views, controllers) y del backend.
- Estructura de carpetas nueva.
- Persistencia: carrito en localStorage, sesión y token en sessionStorage, IndexedDB como copia del catálogo, todo lo demás en la base. Quitar las filas de pedidos, citas y registros locales.
- Cuentas de prueba (anexo B).
- Cómo ejecutar backend y frontend (sección 11).
- Seguridad OWASP y endpoints con roles: los escribe la parte del backend; aquí solo se enlazan o se integran.
- Capturas de la sección 12.
- Quitar las secciones de citas de nutrición, registro local y "login académico".

## 14. Orden de trabajo y comprobaciones

| Paso | Qué hacer | Cómo se comprueba |
|---|---|---|
| 1 | Crear `frontend/`, mover HTML, assets y cada archivo de `js/` a su carpeta según la tabla de la sección 3, corregir imports y `src` de scripts, sin cambiar comportamiento | El sitio funciona exactamente igual que antes con los JSON; sin errores en consola |
| 2 | Configuración, cliente HTTP y token en storage | Con el backend apagado, una llamada falla con status 0 y el mensaje de conexión |
| 3 | Sesión, login y registro (HTML de 7 incluido) | Login con las cuentas del anexo B, registro de una cuenta nueva, rechazo de una cédula inválida antes de enviar |
| 4 | Catálogo, presentación, tarjetas y carrito | Tienda, planes, clases y entrenadores vienen de la API con sus imágenes; con el backend apagado se ve la copia; un producto sin stock dice Agotado |
| 5 | Checkout y mis pedidos | Pedido confirmado con número de la base, carrito vacío después, pedido visible en mis pedidos; plan registrado como inscripción |
| 6 | Nutrición y contacto | Los mensajes aparecen en la tabla mensaje_contacto |
| 7 | Panel: protección, login, dashboard, productos y pedidos | Con cuenta de cliente no se entra; CRUD de productos; cambio de estado de pedidos |
| 8 | Panel: clientes, membresías, inscripciones, clases, personal, usuarios y otras tablas | Cada pantalla lista, filtra, crea y edita según la sección 8; las de solo lectura no muestran botones de escritura |
| 9 | Borrar `data/` y el código muerto de la sección 3 | No queda ningún import a `data/` ni referencias a citas o registros locales |
| 10 | Pruebas y README (secciones 12 y 13) | Pruebas pasando y capturas listas |

## 15. Lista final contra el reto

- [ ] `frontend/models`, `frontend/views`, `frontend/controllers`, `frontend/assets` e `index.html` semántico y accesible.
- [ ] Catálogo desde GET /api/productos con tarjetas reutilizables y botón "Agregar al carrito".
- [ ] Carrito: agregar, quitar, aumentar y disminuir, subtotal y total, persistencia en localStorage.
- [ ] Login obligatorio para confirmar, con mensaje accesible y redirección.
- [ ] Checkout que envía el carrito a POST /api/pedidos, vacía el carrito y muestra la confirmación.
- [ ] Panel de productos (listar, crear, editar, eliminar) consumiendo la API, visible solo para admin.
- [ ] Vista de administración para todas las tablas.
- [ ] Manejo de errores de red, 401, 403 y 500.
- [ ] Sin lógica de render duplicada; vista separada del controlador.
- [ ] HTML semántico, teclado, foco visible, labels, ARIA en mensajes, modales y alertas, contraste adecuado.

---

## Anexo A. Contrato de la API

Copia del contrato que implementa el backend. Si algo no coincide con lo que responde el servidor, avisar al equipo en vez de adaptar el frontend a ciegas.

Todas las rutas existen con prefijo `/api` y `/api/v1`. En la columna Acceso, "user" es el rol CLI y "admin" cualquier rol administrativo.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | /salud | Público | Comprueba API y base (503 si la base no responde) |
| POST | /auth/register | Público, límite de intentos | Registro de cliente (cédula, nombre, apellido, correo, teléfono, nivelId y contraseña). 201 con sesión |
| POST | /auth/login | Público, límite de intentos | 200 con sesión |
| GET | /auth/me | JWT | Datos de la sesión |
| GET | /productos | Público | Catálogo paginado. Solo estado A y publicar web S. Filtro opcional `categoria` |
| GET | /productos/:id | Público | Un producto publicado; 404 si no existe o no se publica |
| POST | /productos | JWT admin | Crea producto. Si trae stock, entra por kárdex como inventario inicial |
| PUT | /productos/:id | JWT admin | Reemplaza datos editables. Si cambia el stock, se registra un ajuste en el kárdex |
| DELETE | /productos/:id | JWT admin | Baja lógica (estado I, no se publica). 204 |
| POST | /pedidos | JWT user o admin | Registra el pedido con sus detalles a partir del carrito |
| GET | /pedidos/mis-pedidos | JWT | Pedidos del usuario, paginados |
| GET | /pedidos | JWT admin | Todos los pedidos, paginados, filtro opcional `estado` |
| GET | /pedidos/:id | JWT dueño o admin | Un pedido. A un cliente que pide uno ajeno se le responde 404 |
| PATCH | /pedidos/:id/estado | JWT admin | Solo P a R (pago reportado) y P o R a X (cancelado) |
| PATCH | /pedidos/:id/cancelar | JWT dueño | Cancela su pedido si sigue en P |
| GET | /membresias | Público | Planes activos que se publican en la web, con sus servicios |
| POST | /inscripciones | JWT user | Contrata un plan desde la web (inscripción pendiente de pago) |
| GET | /inscripciones/mis-inscripciones | JWT | Planes del cliente |
| GET | /clases | Público | Clases activas con instructor y horarios activos |
| GET | /entrenadores | Público | Empleados activos con cargo ENT y las clases que dictan |
| GET | /gimnasio | Público | Datos del gimnasio, horarios de atención, servicios activos y niveles |
| GET | /categorias, /metodos-pago, /niveles | Público | Catálogos para listas desplegables |
| GET | /aliados | Público | Profesionales aliados activos: solo nombre, teléfono, correo, consultorio y servicio (sin cédula ni comisión) |
| POST | /contacto | Público, 5 por hora | Guarda un mensaje de contacto en estado P |
| GET | /admin/resumen | JWT admin | Totales del dashboard |
| GET | /admin/productos | JWT admin | Productos incluidos inactivos, con datos internos (costo, stock mínimo, banderas) |
| POST | /admin/usuarios | JWT ADM | Crea una cuenta del personal: login, contraseña, roles y empleado a vincular |
| PATCH | /admin/usuarios/:id/estado | JWT ADM | Activa o desactiva una cuenta (no puede desactivarse a sí mismo) |
| GET | /admin/tablas | JWT admin | Lista de las 48 tablas con grupo y modo (crud o lectura) |
| GET | /admin/tablas/:tabla/meta | JWT admin | Columnas de la tabla (A.3) |
| GET | /admin/tablas/:tabla/opciones | JWT admin | Valores para listas desplegables de claves foráneas (A.3) |
| GET | /admin/tablas/:tabla | JWT admin | Filas paginadas, con filtros opcionales por igualdad |
| GET | /admin/tablas/:tabla/:id | JWT admin | Una fila. Clave compuesta separada con `~` (por ejemplo `usuario_rol/5~ADM`) |
| POST, PUT, DELETE | /admin/tablas/:tabla[/:id] | JWT ADM | Solo en tablas con modo crud |

### A.1 Formas de las respuestas principales

Producto (público): id, nombre, descripcion, categoriaId, categoria (descripción), unidadMedidaId, contenido, talla, precio (sin IVA), porcentajeIva (el del gimnasio si paga IVA, si no 0), precioConIva, stock, disponible (estado A y stock mayor que 0), createdAt. En `/admin/productos` se agregan stockMin, costoPromedio, pagaIva, esContable, controlaCaducidad, diasAlertaCad, publicarWeb y estado.

Cuerpo para crear o editar producto: nombre, categoriaId y precio obligatorios; opcionales id (solo al crear), descripcion, unidadMedidaId (por defecto UND), contenido, talla, stock, stockMin, costoUnit, pagaIva, esContable, controlaCaducidad, diasAlertaCad, publicarWeb, estado, fechaCaducidad (AAAA-MM-DD, para el lote que entra) y motivoAjuste.

Pedido: id, userId, metodoPago, total, estado, estadoNombre (Pendiente de pago, Pago reportado, Pagado, Retirado, Cancelado), refTransferencia, createdAt, fechaRetiro, usuario (id y login, solo para admin) y detalles con id, pedidoId, productoId, nombre, cantidad, precioUnitario, porcentajeIva y subtotal.

Cuerpo para crear pedido: metodoPago (EF o TR), refTransferencia opcional (4 a 30 letras, números o guion), items con 1 a 30 elementos de productoId y cantidad (1 a 20). Cualquier otro campo, como un precio enviado por el carrito, no se usa.

Membresía: id, nombre, descripcion, tipo, duracion, unidadDuracion, numIngresos, personas, precio, porcentajeIva, precioConIva, incluyeRutina y beneficios (nombres de servicios).

Inscripción: id, membresiaId, plan, fechaInicio, fechaFin, ingresosTotal, valor, porcentajeIva, totalCobrar, canal, estado, createdAt.

Clase: id, nombre, descripcion, lugar, cupoMax, entrenador (id, nombre, especialidad) y horarios (id, dia, horaInicio, horaFin).

Entrenador: id (cédula), nombre completo, especialidad, claseIds.

Sesión (login y registro): token, tipo Bearer, expiraEn y usuario con los datos de sesión (id, login, rol, roles, nombre, clienteId, empleadoId).

Resumen del admin: productosActivos, bajoStock (stock menor o igual al mínimo), pedidosPendientes (P y R), clientes activos, inscripcionesPendientes, mensajesPendientes.

### A.2 Listas paginadas

Siempre con `data` y `pagination` (page, limit, total, totalPages), como en la guía.

### A.3 Panel de tablas genérico

Sirve para que el frontend administre las tablas del modelo sin un endpoint por tabla.

- Cada tabla tiene grupo (Gimnasio, Seguridad, Personal, Clientes, Membresías, Clases, Aliados, Inventario, Ventas, Caja, Comunicación) y modo.
- Modo lectura (no se crean, editan ni borran desde el panel porque cambian con procesos o son sensibles): usuario (sin mostrar `claveHash`), inscripcion, inscripcion_cliente, suspension, asistencia_cliente, comision_aliado, producto (se administra con `/productos`), orden_compra, producto_ordencompra, lote_producto, kardex, pedido, pedido_detalle, venta, detalle_venta, factura, pago, cierre_caja, cuadre_turno, movimiento_caja y notificacion. Las demás son crud.
- `meta` devuelve: modelo, tabla, modo, idCampos y por cada columna nombre, tipo (String, Int, Decimal, DateTime), requerido, esId, autoincremental, longitud máxima y referencia (la tabla a la que apunta si es clave foránea).
- `opciones` devuelve una lista de valor y texto para llenar listas desplegables: valor es el id (o la clave compuesta con `~`) y texto es la primera columna descriptiva (nombre, descripción, login o apellido junto al nombre).
- Al crear o editar, el servidor solo acepta columnas reales de la tabla, ignora ids autoincrementales, convierte tipos y revisa longitudes y obligatorios. Los valores pueden enviarse como texto; las fechas en formato AAAA-MM-DD. Un campo opcional vacío se envía como null al editar.
- Filtros por igualdad en la lista (`?estado=P&canal=W`): solo sobre columnas que existan en la tabla; cualquier otro parámetro aparte de page y limit da 400.
- Un nombre de tabla que no está en la lista da 404 (incluidos `__proto__` y `constructor`).

### A.4 Errores y códigos HTTP

Todo error responde con: status ("error"), mensaje, correlationId y, cuando ayuda, detalles (en validación, una lista de campo y mensaje). El `correlationId` sirve para buscar el error en el log del servidor.

| Código | Cuándo |
|---|---|
| 200 | Consultas y actualizaciones |
| 201 | Creaciones (con cabecera Location en productos y pedidos) |
| 204 | DELETE sin cuerpo |
| 400 | Validación, JSON mal formado, campo no permitido, regla de negocio |
| 401 | Sin token, token vencido o inválido, credenciales incorrectas, cuenta inactiva |
| 403 | Rol sin permiso, tabla de solo lectura, admin sin empleado para el kárdex |
| 404 | Ruta o recurso inexistente, pedido ajeno |
| 409 | Duplicados, stock insuficiente, inscripción pendiente, relación que impide borrar |
| 413 | Cuerpo demasiado grande |
| 415 | Cuerpo que no es JSON |
| 429 | Límite de solicitudes |
| 500 | Error inesperado (mensaje genérico) |
| 503 | Base de datos no disponible |

### A.5 Sesión y roles

- El login devuelve un token JWT con vencimiento (2 horas por defecto). Se envía en `Authorization: Bearer <token>`.
- `usuario.rol` vale `admin` para el personal y `user` para clientes. `usuario.roles` trae los códigos: ADM administrador, REC recepcionista, ENT entrenador, CON contadora, CLI cliente.
- Escribir en las tablas genéricas y gestionar cuentas del personal es solo para ADM.
- El registro valida: cédula ecuatoriana con dígito verificador (no acepta 9999999999), nombres y apellidos de 2 a 60 letras, correo de hasta 120, celular de 10 dígitos que empiece en 09, contraseña de 8 a 72 con letras y números. Si la cédula ya está en el gimnasio con otro correo, responde 409 pidiendo acercarse a recepción.
- El login y el registro tienen límite de intentos (429). El formulario de contacto acepta 5 mensajes por hora.
- Si se envía un campo que el endpoint no conoce (por ejemplo un precio dentro del carrito o un rol en el registro), la respuesta es 400.

## Anexo B. Datos de prueba que carga el backend

| Dato | Valor |
|---|---|
| Cuenta administrador | admin@planetafitness.ec / Admin12345 (rol ADM). La contraseña puede cambiar si el backend la cambió en su `.env` |
| Cuenta cliente | cliente@planetafitness.ec / Cliente12345 (rol CLI), cliente Cliente Prueba, cédula 1712345675 |
| Productos | PF0001 Whey Protein, PF0002 Whey Protein 2LB Chocolate, PF0003 Creatina, PF0004 Barra Proteica (suplementos); PF0005 Short Deportivo, PF0006 Short Gymshark, PF0007 Buzo de Compresión (ropa); PF0008 Straps, PF0009 Muñequeras, PF0010 Cinturón de Cuero (accesorios). 20 unidades cada uno |
| Planes | MI1 Plan individual $35, MI2 Plan para 2 personas $60, MI3 Plan para 3 personas $85 |
| Clases | 1 Boxeo (lunes, jueves y viernes 07:00 a 09:00), 2 Bailoterapia (martes y jueves 18:30 a 20:30) |
| Entrenadores | 1700000019 Entrenador Uno (Boxeo), 1700000027 Entrenador Dos (Bailoterapia), 1700000035 Entrenador Tres (Rutinas personalizadas) |
| Categorías | SUP Suplementos, ROP Ropa, ACC Accesorios, BEB Bebidas, SNK Snacks, PRO Proteínas |
| Niveles | PRI Principiante, INT Intermedio, AVA Avanzado |
| Métodos de pago | EF Efectivo, TR Transferencia |
| Servicios | PES pesas, CAR cardio, BOX boxeo, BAI bailoterapia, RUT rutinas, NUT nutrición (aliado) |
| Roles | ADM, REC, ENT, CON (personal) y CLI (cliente web) |
| Consumidor final | Cliente con cédula 9999999999: aparece en la lista de clientes pero no se edita ni elimina |
