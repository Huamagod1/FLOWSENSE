# MÓDULO 5 — Frontend React (Visualización)

> Estudio del módulo de interfaz de usuario de FlowSense.
> Archivos base: `Producto/frontend/src/`

---

## 1. Estructura y Arranque

### `main.jsx` — El punto de entrada del navegador

**Archivo:** `Producto/frontend/src/main.jsx`

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
```

Este archivo hace exactamente 4 cosas, en orden de afuera hacia adentro:

1. **`StrictMode`**: modo de desarrollo de React que detecta bugs comunes ejecutando ciclos de vida dos veces. No afecta producción.
2. **`BrowserRouter`**: activa el sistema de rutas. Sin esto, `useNavigate` y `<Link>` no funcionarían.
3. **`AuthProvider`**: envuelve toda la app con el contexto de autenticación. Desde cualquier componente hijo se puede acceder al usuario y token con `useAuth()`.
4. **`App`**: el componente raíz que define las rutas.

**Analogía:** `main.jsx` es como el conserje del edificio: abre la puerta, enciende la luz de autenticación y llama al directorio de pisos (App).

---

### `App.jsx` — El directorio de rutas

**Archivo:** `Producto/frontend/src/App.jsx`

```jsx
<Routes>
  <Route path="/" element={<Navigate to="/app" replace />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/registro" element={<RegistroPage />} />

  <Route element={<ProtectedRoute />}>         {/* ← guarda de acceso */}
    <Route element={<Layout />}>               {/* ← navbar + sidebar */}
      <Route path="/app" element={<DashboardPage />} />
      <Route path="/app/recintos" element={<RecintosPage />} />
      <Route path="/app/recintos/:id" element={<RecintoDetallePage />} />
      <Route path="/app/recintos/:id/analizar" element={<SubirVideoPage />} />
      <Route path="/app/videos/:id/zonas" element={<EditorZonasPage />} />
      <Route path="/app/analisis/:id" element={<ResultadosPage />} />
    </Route>
  </Route>

  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

**Cómo funciona el ruteo anidado:**

Las rutas en `react-router-dom 6` se anidan en el código igual que se anidan en la URL. El truco clave es `<Outlet />`: cada componente padre (como `ProtectedRoute` o `Layout`) renderiza `<Outlet />` en el lugar donde quiere que aparezca el hijo.

```
Usuario visita /app/recintos
         ↓
App evalúa rutas → encuentra <ProtectedRoute>
         ↓
ProtectedRoute: ¿isAuthenticated? Sí → renderiza <Outlet />
         ↓
<Outlet /> = <Layout />
         ↓
Layout renderiza navbar + sidebar + <Outlet /> (en main-content)
         ↓
<Outlet /> = <RecintosPage />
```

**Rutas públicas vs protegidas:**

| Tipo | Rutas | Control |
|------|-------|---------|
| Públicas | `/login`, `/registro` | Cualquiera puede acceder |
| Protegidas | Todas las `/app/*` | Requieren pasar por `ProtectedRoute` |
| Comodín | `*` | `NotFoundPage` (404) |

La raíz `/` redirige automáticamente a `/app`. Si no está autenticado, `ProtectedRoute` redirige a `/login`.

---

### Stack tecnológico

| Tecnología | Para qué se usa | Por qué se eligió |
|-----------|-----------------|-------------------|
| **React 18** | Componentes UI reactivos | Estándar de la industria, buen ecosistema |
| **Vite** | Bundler y servidor de desarrollo | Mucho más rápido que webpack/CRA, HMR instantáneo |
| **react-router-dom 6** | Navegación SPA sin recargar página | Standard para routing en React |
| **Ant Design 5** | Componentes UI listos (Modal, Table, Form) | Ahorra tiempo construyendo tablas y modales complejos |
| **recharts** | Gráficos de barras y líneas | Declarativo, fácil de integrar con datos de React |
| **react-konva** | Canvas HTML5 interactivo con React | Permite dibujar rectángulos con drag y resize sobre imágenes |
| **react-hook-form + zod** | Validación de formularios | Separación de lógica y UI, mensajes de error reactivos |
| **axios** | Cliente HTTP | Interceptores para JWT automático |
| **jwt-decode** | Leer payload del token sin verificar firma | Para saber cuándo expira el token localmente |

---

### `Layout.jsx` — El shell visual de la app

**Archivo:** `Producto/frontend/src/components/Layout.jsx`

Renderiza la navbar superior (nombre del usuario + botón "Cerrar sesión") y el sidebar con los dos enlaces de navegación (Dashboard, Recintos). El contenido de la página actual aparece en `<Outlet />` dentro de `<main className="main-content">`.

---

## 2. Autenticación en el Frontend

### `AuthContext.jsx` — El gestor de sesión

**Archivo:** `Producto/frontend/src/context/AuthContext.jsx`

El contexto es la "memoria compartida" de la app. Cualquier componente puede leer el usuario y el token sin necesidad de pasar props hacia abajo.

**Al montar (primer renderizado):**

```jsx
useEffect(() => {
  const storedToken = localStorage.getItem('flowsense_token')
  const storedUsuario = localStorage.getItem('flowsense_usuario')
  if (storedToken && storedUsuario) {
    const decoded = jwtDecode(storedToken)
    if (decoded.exp * 1000 < Date.now()) {
      _limpiar()          // token expirado → borrar y redirigir a /login
      navigate('/login', { replace: true })
    } else {
      setToken(storedToken)
      setUsuario(JSON.parse(storedUsuario))
    }
  }
}, [])  // [] = solo se ejecuta una vez al montar
```

`jwtDecode` no verifica la firma del token (eso lo hace el backend). Solo lee el payload para saber el campo `exp` (timestamp de expiración en segundos Unix). Si `exp * 1000 < Date.now()`, el token ya expiró y se limpia.

**`login(token, usuario)`:** guarda en `localStorage` Y en el estado de React. Los dos son necesarios: `localStorage` es persistente entre sesiones del navegador; el estado de React hace que los componentes se re-rendericen inmediatamente.

**`logout()`:** llama a `_limpiar()` (borra localStorage + estado) y navega a `/login`.

**Lo que expone el contexto:**

```jsx
<AuthContext.Provider value={{ usuario, token, isAuthenticated: !!token, login, logout }}>
```

- `usuario`: objeto con `nombre`, `apellido`, etc.
- `token`: el JWT string
- `isAuthenticated`: booleano (`!!token` convierte token a true/false)
- `login(token, usuario)`: función para iniciar sesión
- `logout()`: función para cerrar sesión

---

### `ProtectedRoute.jsx` — El guarda de la puerta

**Archivo:** `Producto/frontend/src/components/ProtectedRoute.jsx`

```jsx
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
```

Es un componente de 5 líneas que hace una sola cosa: si `isAuthenticated` es `true`, renderiza `<Outlet />` (el hijo protegido); si es `false`, redirige a `/login`. El parámetro `replace` reemplaza la entrada en el historial del navegador (así el usuario no puede hacer "atrás" para volver a la página protegida).

---

### `axiosConfig.js` — El mensajero automático con credenciales

**Archivo:** `Producto/frontend/src/api/axiosConfig.js`

```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
})
```

Crea una instancia de axios con la URL base del backend. `import.meta.env.VITE_API_URL` lee la variable de entorno definida en `.env`. Si no está definida (desarrollo local), usa `localhost:8080`.

**Interceptor de request (se ejecuta antes de cada petición):**

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flowsense_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

**Analogía:** Es como un sello automático que se estampa en todos los sobres antes de enviarlos. No hay que recordar agregar el token manualmente en cada llamada.

**Interceptor de response (se ejecuta cuando llega una respuesta):**

```js
api.interceptors.response.use(
  (response) => response,   // si salió bien, pasar tal cual
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('flowsense_token')
      localStorage.removeItem('flowsense_usuario')
      window.location.href = '/login'   // ← recarga completa de la página
    }
    return Promise.reject(error)
  }
)
```

Si el backend responde con 401 (token expirado o inválido), borra la sesión y redirige al login. El `window.location.href` (en lugar de `navigate()`) causa una recarga completa de la página, lo que limpia el estado de React en memoria.

---

## 3. Comunicación con el Backend

### Estructura general de las llamadas

Todas las llamadas usan la instancia `api` de `axiosConfig.js`. Ejemplo típico:

```js
// Dentro de un componente
const [recintos, setRecintos] = useState([])

useEffect(() => {
  api.get('/recintos')
    .then(res => setRecintos(res.data))
    .catch(() => setError('Error al cargar'))
    .finally(() => setCargando(false))
}, [])
```

La instancia `api` ya tiene:
- La `baseURL` configurada
- El token JWT en el header `Authorization`
- El manejo automático de 401

---

### Las imágenes necesitan tratamiento especial — fetch + blob

**Archivo:** `Producto/frontend/src/pages/EditorZonasPage.jsx` (líneas 106–117)

Las imágenes y videos del backend son endpoints privados que requieren el token JWT. Los `<img src="...">` normales del navegador no pueden enviar headers de autorización. Solución: descargar el binario con `axios` (que sí usa el interceptor) y crear una URL de objeto local.

```js
useEffect(() => {
  let objectUrl = null
  api.get(`/videos/${id}/frame-preview/imagen`, { responseType: 'blob' })
    .then(res => {
      objectUrl = URL.createObjectURL(res.data)  // crea URL local: blob://...
      const img = new window.Image()
      img.onload = () => setFrameImg(img)
      img.src = objectUrl
    })
  return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }  // limpieza
}, [id])
```

**Por qué `URL.revokeObjectURL` en el cleanup:** Las URLs blob consumen memoria. La función de cleanup del `useEffect` (el `return`) se ejecuta cuando el componente se desmonta, liberando esa memoria.

**Lo mismo aplica al video overlay** (`validacion.js → fetchOverlayBlobUrl`):

```js
export async function fetchOverlayBlobUrl(videoId) {
  const token = localStorage.getItem('flowsense_token')
  const res = await fetch(`${BASE_URL}/videos/${videoId}/video-overlay`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
```

Este usa `fetch` nativo (no axios) porque necesita leer la respuesta como stream para el `<video>` del navegador.

---

### Módulos de API organizados por dominio

```
api/
├── axiosConfig.js   ← instancia base + interceptores
├── tracking.js      ← getTracks, getFlujoZonas, getMetricasTracking
└── validacion.js    ← getConfiabilidad, getEventos, fetchOverlayBlobUrl,
                        eliminarVideoOriginal
```

Las llamadas CRUD de recintos, videos y zonas están inline en las páginas que las usan (no en archivos separados). Los módulos `tracking.js` y `validacion.js` existen porque se importan desde múltiples componentes.

---

## 4. Páginas Principales

### `LoginPage.jsx`

**Archivo:** `Producto/frontend/src/pages/LoginPage.jsx`

**Flujo:**
1. Formulario HTML con `react-hook-form` + `zod` para validación
2. `register('email')` conecta el campo al formulario
3. Al enviar: `handleSubmit(onSubmit)` solo llama a `onSubmit` si la validación pasa
4. `onSubmit` llama a `POST /api/auth/login`
5. Si el backend responde con token: `login(token, usuario)` + navega a `/app`
6. Si hay error: muestra mensaje del servidor o "Credenciales incorrectas"

```js
const schema = z.object({
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})
```

**`noValidate` en el `<form>`:** desactiva la validación HTML5 nativa del navegador para que solo se use zod (evita doble validación inconsistente).

**`isSubmitting`:** estado que `react-hook-form` expone automáticamente. Es `true` mientras `onSubmit` está ejecutando. Se usa para deshabilitar el botón y mostrar "Iniciando sesión...".

---

### `RegistroPage.jsx`

**Archivo:** `Producto/frontend/src/pages/RegistroPage.jsx`

Igual que Login pero con campos `nombre` y `apellido` adicionales. Llama a `POST /api/auth/registro` y si exitoso también llama a `login(token, usuario)` (el registro hace login automático, no requiere iniciar sesión después).

---

### `DashboardPage.jsx`

**Archivo:** `Producto/frontend/src/pages/DashboardPage.jsx`

Vista de bienvenida. Al montar hace `GET /api/recintos` y muestra:
- Saludo con nombre del usuario (desde `useAuth()`)
- KPI: total de recintos
- Lista de recintos recientes (máximo 5, con `slice(0, 5)`)
- Estado de carga con spinner
- Estado vacío si no hay recintos aún

Es la página más simple del sistema.

---

### `RecintosPage.jsx`

**Archivo:** `Producto/frontend/src/pages/RecintosPage.jsx`

CRUD completo de recintos con componentes de Ant Design:
- **`Table`** de Ant Design: columnas configuradas con `{ title, dataIndex, render }`. La columna "Nombre" enlaza a la página de detalle del recinto.
- **`Modal`** de Ant Design: se abre para crear o editar. El mismo modal sirve para ambos casos (se detecta si `editando` tiene valor).
- **`Form`** de Ant Design: `form.validateFields()` valida y devuelve los datos; `form.setFieldsValue()` pre-rellena para edición.
- **`Popconfirm`**: diálogo de confirmación antes de eliminar (evitar eliminación accidental).

**Patrón de doble función (crear/editar con el mismo modal):**
```js
function abrirEditar(recinto) {
  setEditando(recinto)       // guarda el objeto a editar
  form.setFieldsValue(recinto) // pre-rellena el formulario
  setModalAbierto(true)
}

async function guardar() {
  const valores = await form.validateFields()
  if (editando) {
    await api.put(`/recintos/${editando.id}`, valores)  // edita
  } else {
    await api.post('/recintos', valores)                  // crea
  }
  setModalAbierto(false)
  cargar()  // recarga la lista
}
```

---

### `SubirVideoPage.jsx`

**Archivo:** `Producto/frontend/src/pages/SubirVideoPage.jsx`

Esta página maneja dos fases bien diferenciadas:

**Fase 1: Selección y upload**
- `<input type="file" style={{ display: 'none' }}>` oculto; el click se dispara desde el área visible con `inputRef.current?.click()`
- `FormData` para enviar el binario del video
- `onUploadProgress` de axios para la barra de progreso en tiempo real
- Validación: solo acepta `video/mp4`

**Fase 2: Polling de estado (después del upload)**
```js
const pollingActivo = !!videoId && estadoVideo !== 'COMPLETADO' 
                   && estadoVideo !== 'ERROR' && estadoVideo !== 'FRAME_LISTO'

usePolling(consultarEstado, 3000, pollingActivo)
```

Cada 3 segundos consulta `GET /api/videos/:id/estado`. Cuando el estado es `FRAME_LISTO`, navega automáticamente al editor de zonas. El polling se detiene con `pollingActivo = false` cuando se alcanza un estado terminal.

Los estados y sus textos:
```js
const ESTADO_TEXTO = {
  PENDIENTE: 'En cola de procesamiento...',
  PROCESANDO: 'Analizando video...',
  FRAME_LISTO: 'Frame extraído. Redirigiendo...',
  COMPLETADO: 'Análisis completado.',
  ERROR: 'Ocurrió un error.',
}
```

---

## 5. El Editor de Zonas en Detalle — `EditorZonasPage.jsx`

**Archivo:** `Producto/frontend/src/pages/EditorZonasPage.jsx`

Esta es la vista más compleja del frontend.

### Cómo react-konva permite dibujar rectángulos

react-konva es una capa React sobre el canvas HTML5. En lugar de manipular el canvas directamente con JavaScript, se usan componentes JSX.

```jsx
<Stage ref={stageRef} width={800} height={450}
  onMouseDown={onMouseDown}
  onMouseMove={onMouseMove}
  onMouseUp={onMouseUp}
>
  <Layer>
    <KonvaImage image={frameImg} width={800} height={450} />  {/* fondo */}
    {zonas.map(z => <ZonaRect key={z.id} zona={z} ... />)}    {/* zonas guardadas */}
    {dibujando && nuevaZona && (
      <Rect x={nuevaZona.x} y={nuevaZona.y}
            width={nuevaZona.width} height={nuevaZona.height}
            fill="rgba(170,59,255,0.2)" stroke="#aa3bff"
            listening={false} />                              {/* zona en construcción */}
    )}
  </Layer>
</Stage>
```

**Lógica de dibujo libre:**

```js
// Al presionar botón del mouse
function onMouseDown(e) {
  if (e.target !== e.target.getStage() && e.target.className !== 'Image') return
  // solo dibuja si el click es en el fondo, no en una zona existente
  const pos = stageRef.current.getPointerPosition()
  setDibujando(true)
  setNuevaZona({ x: pos.x, y: pos.y, width: 0, height: 0 })
}

// Mientras mueve el mouse
function onMouseMove() {
  if (!dibujando || !nuevaZona) return
  const pos = getPos()
  setNuevaZona(z => ({ ...z, width: pos.x - z.x, height: pos.y - z.y }))
  // width y height pueden ser negativos si arrastra hacia arriba/izquierda
}

// Al soltar el botón
function onMouseUp() {
  if (!dibujando || !nuevaZona) return
  setDibujando(false)
  const w = Math.abs(nuevaZona.width)
  const h = Math.abs(nuevaZona.height)
  if (w > 10 && h > 10) {
    // zona válida (no un click accidental)
    const zona = {
      id: Date.now(),
      nombre: `Zona ${contadorRef.current++}`,
      color: COLORES_DEFAULT[zonas.length % COLORES_DEFAULT.length],
      x: nuevaZona.width < 0 ? nuevaZona.x + nuevaZona.width : nuevaZona.x,
      // normaliza la x si el usuario arrastró hacia la izquierda
      ...
    }
    setZonas(z => [...z, zona])
  }
  setNuevaZona(null)
}
```

**Drag y resize con `Transformer`:**

El componente `ZonaRect` usa `Transformer` de Konva para mostrar los handles de redimensionamiento cuando la zona está seleccionada. Al terminar el drag (`onDragEnd`) o el resize (`onTransformEnd`), llama a `onChange` para actualizar el estado:

```jsx
onTransformEnd={() => {
  const node = rectRef.current
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()
  node.scaleX(1); node.scaleY(1)  // reset del scale interno de Konva
  onChange({
    x: node.x(), y: node.y(),
    width: Math.max(20, node.width() * scaleX),   // aplica el scale al tamaño
    height: Math.max(20, node.height() * scaleY),
  })
}}
```

---

### Conversión de coordenadas: píxeles → normalizadas (CRÍTICO)

```js
// En guardarYConfirmar():
const CANVAS_W = 800
const CANVAS_H = 450

const payload = zonas.map(z => ({
  nombre: z.nombre,
  colorHex: z.color,
  xNorm: z.x / CANVAS_W,         // 240px / 800 = 0.3
  yNorm: z.y / CANVAS_H,         // 135px / 450 = 0.3
  anchoNorm: z.width / CANVAS_W, // 320px / 800 = 0.4
  altoNorm: z.height / CANVAS_H, // 180px / 450 = 0.4
}))
```

El canvas interno siempre es 800×450 píxeles (independiente del tamaño de la pantalla del usuario). Al dividir por esas dimensiones fijas se obtienen valores entre 0 y 1 que son independientes de la resolución.

**La dirección inversa** (cuando se cargan zonas existentes del backend):

```js
const anchoCv = 800
const altoCv = 450
setZonas(res.data.map((z, i) => ({
  x: z.xNorm * anchoCv,           // 0.3 × 800 = 240px
  y: z.yNorm * altoCv,            // 0.3 × 450 = 135px
  width: z.anchoNorm * anchoCv,   // 0.4 × 800 = 320px
  height: z.altoNorm * altoCv,    // 0.4 × 450 = 180px
  ...
})))
```

---

### Cómo se guardan las zonas en el backend

Dos operaciones distintas, con dos botones distintos:

**"Guardar zonas"** (solo guarda, no lanza análisis):
```js
await api.put(`/videos/${id}/zonas`, payload)
// Backend: guarda las zonas, estado permanece en ESPERANDO_ZONAS
```

**"Confirmar y analizar"** (guarda + lanza):
```js
await api.put(`/videos/${id}/zonas`, payload)          // 1. guarda zonas
await api.post(`/videos/${id}/zonas/confirmar`)        // 2. lanza análisis
navigate(`/app/analisis/${id}`, { replace: true })     // 3. navega a resultados
// Backend: cambia estado a PROCESANDO, invoca Python asíncronamente
```

---

## 6. El Dashboard de Resultados en Detalle — `ResultadosPage.jsx`

**Archivo:** `Producto/frontend/src/pages/ResultadosPage.jsx`

La página más compleja del sistema. Organiza 5 tabs de datos.

### Polling mientras el video se procesa

```js
const pollingActivo = estado !== 'COMPLETADO' && estado !== 'ERROR'

usePolling(consultarEstado, 3000, pollingActivo)
useEffect(() => { consultarEstado() }, [id])  // llamada inmediata al montar
```

Mientras `pollingActivo = true` (estado PROCESANDO), la página muestra un spinner. Cuando el estado cambia a COMPLETADO, `pollingActivo` se vuelve `false` (el hook limpia el `setInterval`), y el `useEffect` que depende de `estado` dispara todas las llamadas de datos:

```js
useEffect(() => {
  if (estado !== 'COMPLETADO') return
  api.get(`/videos/${id}/detecciones`).then(...)
  api.get(`/videos/${id}/metricas`).then(...)
  api.get(`/videos/${id}/metricas-temporales`).then(...)
  api.get(`/videos/${id}/zonas`).then(...)
  getTracks(id).then(...)
  getFlujoZonas(id).then(...)
  getMetricasTracking(id).then(...)
  getConfiabilidad(id).then(...)
}, [estado, id])  // se dispara cuando `estado` cambia a COMPLETADO
```

---

### Las 5 tabs y sus componentes

**Archivo:** `Producto/frontend/src/pages/ResultadosPage.jsx`

```
Tabs de ResultadosPage:
├── Tab 1: "Validación del análisis"
│   └── <VideoValidacion> — score ALTO/MEDIO/BAJO, video overlay
│
├── Tab 2: "Resumen"
│   └── <ResumenEjecutivo> — KPIs, gráficos de barras, insight automático
│
├── Tab 3: "Recomendación de precio"
│   └── <RecomendacionPrecio> — input precio base, cards por zona con score gauge
│
├── Tab 4: "Análisis detallado"
│   └── <AnalisisDetallado> — heatmap canvas, ranking, tasa detención, matriz temporal
│
└── Tab 5: "Flujo y trayectorias"
    ├── <TrayectoriasCanvas> — flechas de flujo sobre el frame
    ├── <FlujoSankeyChart> — diagrama Sankey de flujo entre zonas
    └── <MetricasTrackingPanel> — tabla de métricas ByteTrack
```

---

### Cómo se dibuja el mapa de calor con Canvas API

**Archivo:** `Producto/frontend/src/components/AnalisisDetallado.jsx`

No usa heatmap.js (librería externa). Está implementado directamente con el Canvas 2D API de HTML5.

```jsx
{/* Estructura HTML: imagen + canvas superpuesto */}
<div style={{ position: 'relative' }}>
  <img ref={imgRef} src={frameSrc} style={{ width: '100%', opacity: 0.55 }}
       onLoad={() => setImgLoaded(true)} />
  <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0,
                                    width: '100%', height: '100%' }} />
</div>
```

La imagen está al 55% de opacidad para que el calor sea visible. El canvas está encima con `position: absolute`.

**El algoritmo del gradiente radial:**

```js
useEffect(() => {
  if (!imgLoaded || !canvasRef.current) return
  // Ajusta el canvas al tamaño real de la imagen (en píxeles del DOM)
  canvas.width  = img.offsetWidth  || img.naturalWidth
  canvas.height = img.offsetHeight || img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Normaliza valores entre zonas (la más activa = 1.0, la menos activa = 0.0)
  const values = zones.map(z => metricaMap[z.id]?.personasUnicas ?? 0)
  const normalize = v => range === 0 ? 0.5 : (v - minVal) / range

  zones.forEach(z => {
    const cx = (z.xNorm + z.anchoNorm / 2) * canvas.width  // centro X en píxeles
    const cy = (z.yNorm + z.altoNorm  / 2) * canvas.height // centro Y en píxeles
    const n  = normalize(metricaMap[z.id]?.personasUnicas ?? 0)
    const { r, g, b, a } = getHeatColor(n)  // azul→cyan→amarillo→naranja→rojo
    // Radio proporcional al tamaño de la zona, más grande si más activa
    const radius = radioBase * (0.6 + n * 0.4)
    // Gradiente radial: color en el centro, transparente en el borde
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    gradient.addColorStop(0, `rgba(${r},${g},${b},${a})`)
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = gradient
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  })
}, [imgLoaded, metricas, zones])
```

La escala de colores implementada:

```js
function getHeatColor(normalized) {  // 0.0 a 1.0
  if (normalized <= 0.2) return { r: 59,  g: 130, b: 246, a: 0.3 }  // azul
  if (normalized <= 0.4) return { r: 6,   g: 182, b: 212, a: 0.5 }  // cyan
  if (normalized <= 0.6) return { r: 250, g: 204, b: 21,  a: 0.7 }  // amarillo
  if (normalized <= 0.8) return { r: 249, g: 115, b: 22,  a: 0.8 }  // naranja
  return                        { r: 220, g: 38,  b: 38,  a: 0.9 }  // rojo
}
```

---

### Cómo recharts genera los gráficos

**Archivos:** `ResumenEjecutivo.jsx`, `AnalisisDetallado.jsx`

Ejemplo del gráfico de barras horizontales por zona:

```jsx
<ResponsiveContainer width="100%" height={barHeight}>
  <BarChart layout="vertical" data={dataPersonas}
            margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis type="number" />
    <YAxis type="category" dataKey="nombre" width={84} />
    <Tooltip formatter={(v) => [v, 'Personas únicas']} />
    <Bar dataKey="personas" radius={[0, 4, 4, 0]}>
      {dataPersonas.map(d => <Cell key={d.nombre} fill={d.color} />)}
    </Bar>
  </BarChart>
</ResponsiveContainer>
```

`<Cell>` permite asignar el color propio de cada zona (en lugar de un color uniforme para toda la serie). `<ResponsiveContainer width="100%">` ajusta el ancho del gráfico al contenedor padre automáticamente.

`ReferenceLine` dibuja la línea del promedio:
```jsx
{avgDetecciones > 0 && (
  <ReferenceLine x={avgDetecciones} stroke="#9ca3af" strokeDasharray="4 4"
    label={{ value: 'Promedio', position: 'insideTopRight', fontSize: 11 }} />
)}
```

---

### Cómo se calcula y muestra el precio sugerido

**Archivo:** `Producto/frontend/src/components/RecomendacionPrecio.jsx`

```js
async function calcular() {
  const res = await api.post(`/videos/${videoId}/precio-sugerido`, {
    precioBase: Number(precioBase),
  })
  setPrecios(res.data || [])
}
```

El cálculo real ocurre en el **backend** (`AnalisisService.java`): `precioSugerido = precioBase × scoreCompuesto`. El frontend solo envía el precio base y recibe el array de precios sugeridos por zona.

**El Score Gauge** es un SVG circular dibujado a mano:
```jsx
function ScoreGauge({ score, color }) {
  const r = 28, circ = 2 * Math.PI * r           // circunferencia del círculo
  const pct = Math.min(Math.max(score, 0) / 2.5, 1)  // normaliza a [0,1] (máx esperado 2.5x)
  return (
    <svg width="70" height="70">
      <circle stroke="#f3f4f6" strokeWidth="7" />  {/* fondo gris */}
      <circle stroke={color} strokeWidth="7"
        strokeDasharray={`${pct * circ} ${circ}`}  {/* arco proporcional al score */}
        transform="rotate(-90 35 35)" />            {/* empieza desde arriba */}
      <text>{score.toFixed(2)}</text>
    </svg>
  )
}
```

La clasificación por tipo:
```js
function getTipoZona(score) {
  if (score >= 1.5) return { tipo: 'Premium',  color: '#16a34a' }
  if (score >= 1.0) return { tipo: 'Estándar', color: '#7C3AED' }
  if (score >= 0.8) return { tipo: 'Estándar', color: '#d97706' }
  return              { tipo: 'Bajo',      color: '#ea580c' }
}
```

---

### Matriz temporal (heatmap de cuadrícula)

**Archivo:** `Producto/frontend/src/components/AnalisisDetallado.jsx`

No usa canvas ni librería. Es un grid CSS con celdas coloreadas por código:

```js
function getCeldaColor(n) {
  if (!n || n === 0) return '#F3F4F6'   // gris — sin actividad
  if (n <= 2) return '#bbf7d0'          // verde claro
  if (n <= 5) return '#fef08a'          // amarillo
  return '#fca5a5'                       // rojo — alta actividad
}
```

La estructura es: filas = zonas, columnas = franjas temporales. Los datos vienen de `METRICAS_TEMPORALES` del backend (uno por zona por franja).

---

## 7. Hooks Personalizados

### `useAuth.js`

**Archivo:** `Producto/frontend/src/hooks/useAuth.js`

```js
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
```

Un hook que simplifica acceder al contexto de autenticación. En lugar de importar `AuthContext` y `useContext` en cada componente, se importa `useAuth` y punto. El error explícito sirve para detectar errores de uso (si alguien llama a `useAuth()` fuera del `AuthProvider`).

---

### `usePolling.js`

**Archivo:** `Producto/frontend/src/hooks/usePolling.js`

```js
export function usePolling(fn, intervalo, activo = true) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!activo) return
    const id = setInterval(() => fnRef.current(), intervalo)
    return () => clearInterval(id)  // cleanup al desmontar
  }, [intervalo, activo])
}
```

**Por qué `useRef` para la función:**

`setInterval` captura la función al momento de crearse. Si la función cambia (porque el componente se re-renderizó y el closure captura nuevos valores de estado), el interval seguiría usando la versión vieja. `fnRef.current = fn` actualiza la referencia en cada render sin recrear el interval. Así el interval llama siempre a la versión más fresca de la función.

**El cleanup (`return () => clearInterval(id)`):** React ejecuta esta función cuando el componente se desmonta o cuando cambian las dependencias `[intervalo, activo]`. Evita memory leaks (el interval siguiendo en ejecución aunque el componente ya no esté en pantalla).

**Cómo se usa:**

```js
// SubirVideoPage.jsx
const pollingActivo = !!videoId && estadoVideo !== 'FRAME_LISTO' && ...
usePolling(consultarEstado, 3000, pollingActivo)
// Consulta cada 3 segundos mientras pollingActivo sea true
// Cuando pollingActivo cambia a false, el useEffect se re-ejecuta y clearInterval
```

---

## 8. Conceptos Clave de React — Explicados con el Propio Proyecto

### `useState` — Memoria del componente

`useState` guarda un valor que persiste entre re-renders y, cuando cambia, dispara un re-render.

**Ejemplo de `RecintosPage.jsx`:**
```js
const [modalAbierto, setModalAbierto] = useState(false)
const [editando, setEditando] = useState(null)
```

**Por qué existe:** Sin `useState`, al hacer `let modalAbierto = false` y luego `modalAbierto = true`, React no sabría que el valor cambió y no re-renderizaría el componente. `useState` es el mecanismo que conecta los datos con la UI.

**Regla de oro:** No mutés el estado directamente (`estado.push(x)` está mal). Siempre reemplazá con una copia nueva (`setEstado([...estado, x])`).

---

### `useEffect` — Código que corre después de renderizar

`useEffect` ejecuta código "después de que React pintó la pantalla". Sirve para llamadas a APIs, suscripciones, temporizadores.

**Ejemplo de `ResultadosPage.jsx` (carga de datos al completar):**
```js
useEffect(() => {
  if (estado !== 'COMPLETADO') return
  api.get(`/videos/${id}/metricas`).then(r => setMetricas(r.data || []))
}, [estado, id])   // ← array de dependencias
```

El array de dependencias `[estado, id]` controla cuándo se re-ejecuta:
- `[]` (vacío): solo al montar el componente (equivalente a `componentDidMount`)
- `[estado, id]`: cada vez que `estado` o `id` cambian
- Sin array: cada render (peligroso, causa bucles infinitos)

**Ejemplo de `EditorZonasPage.jsx` (cleanup de URL blob):**
```js
useEffect(() => {
  let objectUrl = null
  api.get(...).then(res => { objectUrl = URL.createObjectURL(res.data) })
  return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }  // cleanup
}, [id])
```

La función `return () => ...` es el cleanup. Se ejecuta cuando el componente se desmonta o antes de re-ejecutar el efecto.

---

### `useRef` — Acceso directo sin re-render

`useRef` guarda un valor que persiste entre renders pero cuyo cambio NO dispara un re-render. También sirve para acceder directamente a elementos del DOM.

**Ejemplo 1 — referencia al DOM (SubirVideoPage.jsx):**
```js
const inputRef = useRef(null)
// ...
<input ref={inputRef} type="file" style={{ display: 'none' }} />
<div onClick={() => inputRef.current?.click()}>Haz clic aquí</div>
```
Permite hacer click programáticamente en el input oculto.

**Ejemplo 2 — referencia al Stage de Konva (EditorZonasPage.jsx):**
```js
const stageRef = useRef()
// ...
const pos = stageRef.current.getPointerPosition()
```
Accede a la posición del mouse sobre el canvas.

**Ejemplo 3 — valor mutable sin re-render (EditorZonasPage.jsx):**
```js
const contadorRef = useRef(1)
// ...
nombre: `Zona ${contadorRef.current++}`  // incrementa sin causar re-render
```

**Ejemplo 4 — función fresca en interval (usePolling.js):**
```js
const fnRef = useRef(fn)
fnRef.current = fn  // actualiza en cada render sin recrear el interval
```

---

### Resumen comparativo

| Hook | Qué hace | Cuándo usarlo |
|------|----------|---------------|
| `useState` | Dato que cuando cambia re-renderiza | Datos de UI: listas, errores, loading, flags |
| `useEffect` | Código que corre después del render | APIs, suscripciones, timers, limpieza |
| `useRef` | Valor persistente sin re-render / acceso DOM | DOM refs, intervalos, contadores, funciones |
| `useContext` | Lee un contexto proveído por un ancestro | Autenticación, temas globales |

---

## 9. Flujo End-to-End del Frontend (diagrama)

```
main.jsx
  └── BrowserRouter
        └── AuthProvider (carga token de localStorage si no expiró)
              └── App.jsx (define rutas)
                    ├── /login → LoginPage
                    │     └── POST /api/auth/login → login(token, usuario) → navega /app
                    │
                    └── ProtectedRoute (¿isAuthenticated? Si no → /login)
                          └── Layout (navbar + sidebar)
                                ├── /app → DashboardPage
                                │     └── GET /api/recintos → lista
                                │
                                ├── /app/recintos → RecintosPage (CRUD)
                                │
                                ├── /app/recintos/:id/analizar → SubirVideoPage
                                │     ├── POST /api/recintos/:id/videos (multipart)
                                │     └── polling GET /api/videos/:id/estado cada 3s
                                │           → FRAME_LISTO → navega editor zonas
                                │
                                ├── /app/videos/:id/zonas → EditorZonasPage
                                │     ├── GET frame (blob) → KonvaImage fondo
                                │     ├── drag-draw → zona en píxeles
                                │     ├── /CANVAS_W y /CANVAS_H → coordenadas norm.
                                │     ├── PUT /api/videos/:id/zonas (payload norm.)
                                │     └── POST /api/videos/:id/zonas/confirmar
                                │           → navega resultados
                                │
                                └── /app/analisis/:id → ResultadosPage
                                      ├── polling estado → COMPLETADO
                                      ├── GET metricas, detecciones, tracking, zonas
                                      ├── GET frame (blob) → heatmap canvas
                                      └── 5 tabs: validacion, resumen, precio,
                                                  detalle, flujo
```

---

## 10. Preguntas tipo examen

1. **En `EditorZonasPage.jsx`, el canvas siempre tiene 800×450 píxeles independientemente del tamaño de pantalla del usuario. ¿Por qué es esto importante para la consistencia de los datos que llegan al backend y eventualmente a Python?**

2. **`usePolling` usa `useRef` para guardar la función `fn` que recibe como argumento. ¿Qué problema concreto resuelve esto y qué pasaría si en cambio se pasara `fn` directamente en el array de dependencias de `useEffect`?**

3. **El interceptor de respuesta en `axiosConfig.js` hace `window.location.href = '/login'` en lugar de `navigate('/login')`. ¿Por qué esta diferencia es intencional y qué efecto adicional tiene el uso de `window.location.href`?**

4. **El frame del video (PNG) se descarga con `api.get(..., { responseType: 'blob' })` en lugar de usarlo directamente como `<img src="/api/videos/:id/frame-preview/imagen">`. ¿Por qué no funciona el `<img src>` directo en este caso?**

5. **En `AuthContext.jsx`, tanto `localStorage` como `setToken/setUsuario` (estado de React) se actualizan en `login()`. ¿Qué pasaría si se usara solo `localStorage` sin el estado, o solo el estado sin `localStorage`?**
