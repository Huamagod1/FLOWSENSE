# CLAUDE.md — Capa Frontend / React

Este archivo da contexto específico del frontend React. Complementa el `CLAUDE.md` raíz.

## Rol del módulo

SPA (Single Page Application) en React 18 que consume la API REST de Spring Boot. Renderiza autenticación, gestión de recintos, subida de videos, editor visual de zonas, dashboard de resultados con las 4 métricas y precios sugeridos.

## Stack del módulo

- React 18 + Vite
- react-router-dom 6.x (rutas con guards)
- axios (cliente HTTP con interceptor JWT)
- react-hook-form + zod (validación)
- jwt-decode (leer payload del token)
- react-konva 18.x (editor de zonas)
- recharts 2.x (gráficos)
- heatmap.js 2.x (mapa de calor)
- Ant Design 5.x (componentes UI)
- jsPDF + html2canvas (exportación PDF, post-MVP)

## Estructura del módulo

```
src/
├── main.jsx                       ← entrypoint, monta App
├── App.jsx                        ← define rutas (react-router-dom)
├── App.css
├── index.css
├── api/
│   ├── axiosConfig.js            ← axios + interceptor JWT (cliente base)
│   ├── tracking.js              ← tracks, trayectorias, flujo y métricas de tracking
│   └── validacion.js            ← confiabilidad / validación del análisis
├── context/
│   └── AuthContext.jsx          ← provider de autenticación (token + user)
├── hooks/
│   ├── useAuth.js               ← consume AuthContext
│   └── usePolling.js            ← polling de estado del video
├── pages/
│   ├── LoginPage.jsx
│   ├── RegistroPage.jsx
│   ├── DashboardPage.jsx
│   ├── RecintosPage.jsx
│   ├── RecintoDetallePage.jsx
│   ├── SubirVideoPage.jsx
│   ├── EditorZonasPage.jsx      ← vista clave: dibuja zonas (react-konva)
│   ├── ResultadosPage.jsx       ← vista clave: dashboard de 5 tabs
│   └── NotFoundPage.jsx
├── components/
│   ├── Layout.jsx               ← layout de la app
│   ├── ProtectedRoute.jsx       ← guard de rutas privadas
│   ├── VideoValidacion.jsx      ← tab "Validación" (video overlay + confiabilidad)
│   ├── ResumenEjecutivo.jsx     ← tab "Resumen"
│   ├── RecomendacionPrecio.jsx  ← tab "Recomendación de precio"
│   ├── AnalisisDetallado.jsx    ← tab "Análisis detallado" (heatmap, ranking, tabla)
│   ├── TrayectoriasCanvas.jsx   ← tab "Flujo": canvas de trayectorias reales
│   ├── FlujoSankeyChart.jsx     ← tab "Flujo": diagrama de flujo entre zonas
│   └── MetricasTrackingPanel.jsx← tab "Flujo": tabla de métricas de tracking
└── assets/                        ← imágenes estáticas (hero.png, logos)
```

> Nota: este árbol refleja la estructura plana real actual (sin subcarpetas
> `public/`, `app/`, `zonas/`, `dashboard/`, `common/`, `utils/`, `styles/`).
> El dashboard de resultados vive en `pages/ResultadosPage.jsx` y reparte sus
> 5 tabs entre los componentes de `components/`.

## Vista crítica 1: Editor de Zonas

Ruta: `/app/videos/:id/zonas`

Esta es la vista más compleja del frontend. Permite al admin dibujar rectángulos sobre el frame del video.

### Flujo de la vista

1. Llega al editor con video en estado FRAME_LISTO
2. Hace `GET /api/videos/:id/frame-preview` para obtener URL del PNG y dimensiones
3. Renderiza el frame como fondo del canvas
4. Admin dibuja rectángulos arrastrando el mouse
5. Al soltar, abre modal para nombrar la zona y elegir color
6. Puede mover, redimensionar, eliminar zonas
7. Botón "Lanzar análisis" deshabilitado hasta tener al menos 1 zona
8. Al confirmar: PUT zonas + POST confirmar → video pasa a PROCESANDO

### Conversión de coordenadas (CRÍTICO)

Konva devuelve coordenadas en píxeles del canvas. SIEMPRE convertir a normalizadas:

```js
// utils/coordenadas.js
export function pxANormalizadas(rect, canvasAncho, canvasAlto) {
  return {
    x: rect.x / canvasAncho,
    y: rect.y / canvasAlto,
    ancho: rect.ancho / canvasAncho,
    alto: rect.alto / canvasAlto
  };
}

export function normalizadasAPx(zona, canvasAncho, canvasAlto) {
  return {
    x: zona.x * canvasAncho,
    y: zona.y * canvasAlto,
    ancho: zona.ancho * canvasAncho,
    alto: zona.alto * canvasAlto
  };
}
```

El backend recibe siempre normalizadas. El canvas trabaja siempre en píxeles. Mantener la conversión aislada en utils evita errores.

### UX obligatoria del editor

- Zonas con transparencia (opacity 0.3) para ver superposiciones
- Cada zona con color distinto (campo color_hex)
- Límite máximo: 10 zonas por video (evitar sobrecomplicar)
- Validación: mínimo 1 zona antes de permitir confirmar
- Mostrar coordenadas normalizadas en tiempo real (debug útil)
- Tooltip con nombre de zona al hover
- Sidebar con lista de zonas + botón eliminar individual

## Vista crítica 2: Dashboard de Resultados

Ruta: `/app/analisis/:id`

Muestra todas las métricas del análisis completado.

### Secciones del dashboard

#### Sección A: Resumen ejecutivo

Tarjeta superior con:
- Nombre del recinto
- Fecha del video
- Duración procesada
- Persona-segundos totales
- Zona más valiosa (con score)
- Zona menos valiosa (con score)

#### Sección B: Heatmap espacial

Componente `HeatmapEspacial` usando heatmap.js:
- Renderiza el frame como fondo
- Superpone gradiente de calor según coordenadas de detecciones
- Dibuja contornos de las zonas en colores definidos
- Toggle: heatmap puro / con zonas / con detecciones individuales

#### Sección C: Tabla de zonas con score

Tabla principal con columnas:
- Nombre zona
- Tráfico (% del total)
- Tasa de detención (%)
- Densidad promedio
- Score compuesto
- Precio sugerido

Ordenable por cualquier columna. Filtrable. Acción "Ver detalle" por zona.

#### Sección D: Input de precio base

Campo donde el admin ingresa el "precio base del recinto" (CLP/mes). Todos los precios sugeridos de la tabla se recalculan en tiempo real al cambiar este valor.

#### Sección E: Matriz Zona × Franja Temporal

Componente `MatrizZonaTemporal`:
- Filas: zonas
- Columnas: franjas temporales del video (ej: 0-3min, 3-6min, etc.)
- Celdas coloreadas por intensidad (heatmap secundario)
- Útil para identificar momentos de mayor actividad

#### Sección F: Detalle de zona individual

Al hacer clic en una zona en la tabla, se expande/abre modal con:
- Métricas detalladas
- Interpretación textual generada
- Mini gráfico temporal de la zona
- Recomendación: "Esta zona tiene ... ideal para ..."

## Autenticación en cliente

### AuthContext

Provee `{user, token, login, logout, register, loading}`. Al montar:
1. Lee token de `localStorage` (key `flowsense_token`)
2. Si existe y no expiró, autenticado
3. Si expiró, lo borra

### Interceptor de axios

```js
// api/client.js
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('flowsense_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('flowsense_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

### ProtectedRoute

Wrapper que redirige a `/login` si no hay usuario autenticado.

## Polling de estado del video

Hook `useVideoEstado(videoId)`:
- `GET /api/videos/:id/estado` cada 3 segundos
- Estados manejados:
  - PENDIENTE → spinner "Subiendo..."
  - FRAME_LISTO → redirige a editor de zonas
  - ESPERANDO_ZONAS → admin trabaja en editor
  - PROCESANDO → barra de progreso "Analizando..."
  - COMPLETADO → redirige al dashboard
  - ERROR → toast con mensaje
- Timeout 30 minutos para PROCESANDO
- Detener al desmontar componente

## Estructura de rutas

### Públicas
- `/` - Landing
- `/login` - Login
- `/registro` - Registro

### Privadas (con ProtectedRoute + AppLayout)
- `/app` - Dashboard principal
- `/app/recintos` - Lista recintos
- `/app/recintos/nuevo` - Crear
- `/app/recintos/:id` - Detalle
- `/app/recintos/:id/editar` - Editar
- `/app/recintos/:id/analizar` - Subir video
- `/app/videos/:id/zonas` - Editor de zonas (vista crítica)
- `/app/analisis/:id` - Dashboard resultados (vista crítica)

### Errores
- `/404`, `/403`, `/500`

## Validación de formularios

react-hook-form + zod:

```js
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres")
});

const registroSchema = loginSchema.extend({
  nombre: z.string().min(2),
  apellido: z.string().min(2),
  passwordConfirm: z.string()
}).refine(data => data.password === data.passwordConfirm, {
  message: "Las contraseñas no coinciden",
  path: ["passwordConfirm"]
});
```

## Variables de entorno

```env
VITE_API_URL=http://localhost:8080/api
VITE_APP_NAME=FlowSense
```

## Convenciones de código

- Componentes en PascalCase
- Hooks custom empiezan con `use`
- Imports ordenados: React → libs → api → componentes → hooks → utils → styles
- Textos UI siempre en español
- Sin inline styles excepto valores dinámicos (posición de zonas en canvas)
- Loading states en botones de submit

## Lo que Claude Code NO debe hacer

- No usar localStorage para datos sensibles más allá del token
- No hacer requests sin pasar por client.js
- No mezclar lógica de UI con llamadas a API directamente
- No crear rutas privadas sin ProtectedRoute
- No olvidar loading states
- No renderizar el video MP4 subido en el frontend (solo el frame extraído está permitido)
- No exportar PDFs con datos identificables (solo métricas agregadas)
