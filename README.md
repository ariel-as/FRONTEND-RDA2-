# Planeta Fitness — frontend con API REST

Proyecto académico de **Desarrollo de Plataformas**. Es el frontend de un ecommerce y de la gestión administrativa de **Planeta Fitness** (Quito, Ecuador), organizado con el patrón **MVC** y conectado a una API REST.

## Alcance

- **Sitio público:** página única `frontend/index.html` con las secciones inicio, planes, tienda, clases, rutinas, nutrición y contacto.
- **Área del cliente:** registro e inicio de sesión, carrito lateral, checkout, mis pedidos y mi cuenta (inscripciones, rutina y notificaciones) en `frontend/cliente/`.
- **Panel administrativo:** más de veinte pantallas agrupadas por área (ver «Panel por roles»), con menú y permisos generados desde `frontend/models/menu.model.js`.
- La contraseña de las cuentas se gestiona en el servidor. El frontend solo conserva el token de sesión y los datos públicos del usuario.

La API se configura en `frontend/models/config.js` (`API_BASE_URL`, `API_TIMEOUT_MS` y `API_TIMEOUT_DESPERTAR_MS`). Por defecto apunta a `http://localhost:5050/api/v1`. La primera petición de la sesión espera hasta 60 segundos y muestra «Conectando con el servidor, puede tardar un momento» porque Render duerme el servicio gratuito.

## Estructura

```text
frontend/
├── index.html
├── assets/            # CSS, iconos, imágenes y scripts clásicos (tema e identidad)
├── cliente/           # login, checkout, nutrición, mis-pedidos y mi-cuenta
├── admin/             # pantallas del panel administrativo
├── models/            # acceso a la API, sesión, almacenamiento, catálogo, carrito, pedidos y admin
├── views/             # construcción de HTML y mensajes; no llaman a la API
└── controllers/       # eventos, validación y coordinación modelo/vista

pruebas/               # verificación estática del frontend
```

### Capas

| Capa | Ejemplos | Responsabilidad |
|---|---|---|
| Modelo | `models/api.model.js`, `models/sesion.model.js`, `models/catalogo.model.js`, `models/admin.model.js` | Cliente HTTP, token, respaldos locales y reglas de datos. |
| Vista | `views/componentes.view.js`, `views/carrito.view.js`, `views/admin.view.js` | Markup, tablas, formularios y mensajes accesibles. |
| Controlador | `controllers/main.controller.js`, `controllers/checkout.controller.js`, `controllers/admin-generico.controller.js` | Eventos, validación en dos capas, navegación y estados de carga. |

Reglas de arquitectura: `models/` no importa de `views/` ni de `controllers/`; `views/` no llama a la API; solo `models/api.model.js` usa `fetch`; no quedan importaciones a `data/`.

## Funcionamiento

### Cliente

- El catálogo se obtiene de `GET /productos` y se guarda como respaldo en IndexedDB para mostrar una copia si la API no responde.
- Los planes, las clases, los niveles y los aliados de nutrición vienen de la API.
- El carrito es un panel lateral presente en todas las páginas. Persiste en el navegador y respeta el stock disponible.
- Para finalizar la compra se exige sesión. El checkout muestra los datos de la cuenta en solo lectura, permite elegir efectivo o transferencia y registra el pedido con `POST /pedidos`.
- `cliente/mis-pedidos.html` consulta `GET /pedidos/mis-pedidos` y `GET /inscripciones/mis-inscripciones`. `cliente/mi-cuenta.html` muestra las inscripciones con fecha de fin o ingresos; la rutina y las notificaciones aparecen como «Disponible pronto».
- Con transferencia, el número de comprobante es obligatorio en el checkout.
- El formulario de nutrición envía un mensaje de contacto; las citas no se agendan desde el frontend.

### Administración

- El acceso está en `frontend/admin/login.html`. Si la sesión no tiene rol administrativo se redirige al login. El menú y los botones se arman con los permisos de `/auth/me` (ver «Panel por roles»).
- Las pantallas dedicadas usan los endpoints de productos, pedidos y usuarios. El resto se apoya en el motor genérico de `/admin/tablas` (`meta`, `opciones`, filas, crear, editar y eliminar).
- Las tablas de solo lectura y las relaciones muchos a muchos se presentan según la especificación: las relaciones se marcan desde la pantalla de una de las tablas.
- Los formularios usan `dialog`, validación nativa y mensajes del servidor por campo. Los errores 401, 403, 409, 429, 500 y 503 se muestran en la región `role="status"`.

## Panel por roles (fase 2)

El menú del panel se define una sola vez en `models/menu.model.js` (texto, página, grupo y permiso) y lo pinta `views/menu.view.js` en todas las páginas de `admin/`. Después del login se guarda la lista `permisos` de `GET /auth/me`; cada página revisa su permiso al cargar y, si falta, muestra «No tienes acceso a esta pantalla» sin llamar a la API. ADM puede todo. Mientras el servidor no envíe `permisos`, solo ADM entra a las pantallas. El backend es quien protege de verdad.

| Grupo del menú | Pantalla | Archivo | Roles (además de ADM) | Estado |
|---|---|---|---|---|
| Recepción | Entradas y aforo | `admin/entradas.html` | REC; ENT ve aforo | Disponible pronto |
| Recepción | Inscripciones | `admin/inscripciones.html` | REC; ENT y CON ven | Lista con filtros; acciones nuevas pronto |
| Recepción | Clientes | `admin/clientes.html` | REC; ENT y CON ven | Búsqueda por cédula; historial pronto |
| Recepción | Pedidos web | `admin/pedidos.html` | REC; CON lee | Operativa (convertir y entregar tras interruptor) |
| Recepción | Ventas en mostrador | `admin/ventas.html` | REC; CON lee | Disponible pronto |
| Recepción | Caja | `admin/caja.html` | REC y CON | Disponible pronto |
| Inventario | Productos | `admin/productos.html` | REC y CON leen | Operativa |
| Inventario | Lotes y kárdex | `admin/inventario.html` | REC y CON leen | Disponible pronto |
| Inventario | Compras | `admin/compras.html` | CON lee | Disponible pronto |
| Gimnasio | Planes y promociones | `admin/membresias.html` | REC, ENT y CON leen | Operativa |
| Gimnasio | Clases | `admin/clases.html` | REC y ENT leen | Operativa |
| Gimnasio | Rutinas | `admin/rutinas.html` | ENT; REC lee | Disponible pronto |
| Gimnasio | Personal | `admin/personal.html` | REC y CON leen; todos marcan asistencia | Operativa; asistencia pronto |
| Gimnasio | Aliados y comisiones | `admin/aliados.html` | CON; REC cobra | Disponible pronto |
| Administración | Usuarios | `admin/usuarios.html` | Solo ADM | Operativa; correo, contraseña y casillas de roles pronto |
| Administración | Datos del gimnasio | `admin/gimnasio.html` | REC, ENT y CON leen | Disponible pronto |
| Administración | Otras tablas | `admin/tablas.html` | CON solo lectura | Operativa |
| Contabilidad | Facturas | `admin/facturas.html` | REC genera; CON | Disponible pronto |
| Contabilidad | Cierres de caja | `admin/caja.html#cierres` | CON | Disponible pronto |
| Contabilidad | Reportes | `admin/reportes.html` | CON todos; REC clientes y entradas | Disponible pronto |
| Comunicación | Mensajes de contacto | `admin/mensajes.html` | REC | Disponible pronto |
| Comunicación | Notificaciones | `admin/notificaciones.html` | Todos | Disponible pronto |

«Disponible pronto» significa que el servicio todavía no está publicado en el backend de Render: la pantalla no hace ninguna llamada. Los servicios que el frontend ya sabe usar y esperan al backend se encienden en `models/funciones.model.js`.

Piezas compartidas: `controllers/dialogo.controller.js` (diálogo propio de confirmación y datos, reemplaza `confirm()` y `prompt()`), `controllers/pagos.controller.js` (efectivo, transferencia o ambos, con referencia obligatoria en transferencia y control de que la suma cuadre con el total del servidor), `controllers/campana.controller.js` (campana de notificaciones) y `views/servidor.view.js` (aviso de servidor despertando).

## Ejecución local

1. Iniciar la API en `http://localhost:5050` (el backend se entrega por separado).
2. Servir `frontend/` por HTTP, por ejemplo:
   ```bash
   npx serve frontend
   # o
   python -m http.server 5500 --directory frontend
   ```
3. Abrir la dirección indicada. Si se usa otro origen o puerto, debe estar permitido en el CORS del backend.

No abras los archivos con `file://`: los módulos ES y la API requieren HTTP.

## Accesibilidad y estilo

- HTML semántico, un solo `h1` por página, enlace de salto, aviso de cookies y región de mensajes.
- Tablas con `caption`, encabezados con `scope` y paginación con botones reales.
- Formularios con `label`, ayudas enlazadas con `aria-describedby`, errores con `role="alert"` y foco en el primer campo inválido.
- Bordes de foco visibles, modales con retorno de foco y cierre con Escape, y estados escritos en texto.
- Tema claro/oscuro con cookie `pf_tema`; el panel administrativo usa Bootstrap 5.3 y el sitio público Tailwind CSS por CDN.

## Pruebas

Desde la raíz del repositorio:

```bash
node pruebas/verificar-frontend.mjs
```

La prueba revisa HTML semántico, accesibilidad básica, rutas internas, arquitectura MVC, contrato de las pantallas nuevas y ausencia de restos del almacenamiento local anterior. También se puede ejecutar sobre una copia publicada: `node pruebas/verificar-frontend.mjs _sitio`.

El recorrido completo con navegador y backend requiere la API con el seed del anexo B y no forma parte del CI. La integración continua ejecuta `node --check` sobre todos los módulos y `verificar-frontend.mjs`; después publica únicamente el contenido de `frontend/` en GitHub Pages.

## Imágenes

Las fotografías del catálogo se guardan localmente en `frontend/assets/img/` y provienen de [Unsplash](https://unsplash.com/license). Los logotipos, el favicon y la imagen genérica de producto son recursos propios del proyecto.
