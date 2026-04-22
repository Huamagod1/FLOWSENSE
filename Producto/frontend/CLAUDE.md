# CLAUDE.md — Capa Frontend / React

Este archivo da contexto específico del frontend React de FlowSense. Complementa el `CLAUDE.md` raíz. La lista completa de vistas y rutas está en `ALCANCE_COMPLETO.md`.

## Rol de este módulo

SPA (Single Page Application) en React 18 que consume la API REST de Spring Boot. Renderiza todas las vistas del administrador: autenticación, gestión de recintos, subida de videos, editor de zonas, mapa de calor, dashboard de métricas y exportación PDF.

## Stack del módulo

- React 18 + Vite como bundler
- react-router-dom 6 (rutas con loaders y guards)
- axios o ky como cliente HTTP con interceptor de token
- react-hook-form + zod para validación de formularios
- jwt-decode para leer el payload del token en el cliente
- heatmap.js 2.x para el mapa de calor
- react-konva 18.x para el canvas de zonas
- recharts 2.x para gráficos del dashboard
- jsPDF + html2canvas para exportar PDF
- Ant Design 5.x como librería de UI components
- react-toastify para alertas
- TanStack Table para tablas de métricas

## Estructura del módulo

```
Producto/frontend/
├── CLAUDE.md
├── README.md
├── package.json
├── vite.config.js
├── .env.example
├── src/
│   ├── main.jsx                   ← entry point
│   ├── App.jsx                    ← rutas principales
│   ├── api/
│   │   ├── client.js              ← instancia axios con interceptor
│   │   ├── auth.js                ← login, registro, recuperar
│   │   ├── usuarios.js
│   │   ├── organizaciones.js
│   │   ├── recintos.js
│   │   └── videos.js
│   ├── auth/
│   │   ├── AuthContext.jsx        ← provider global
│   │   ├── useAuth.js             ← hook de acceso
│   │   └── ProtectedRoute.jsx     ← wrapper de rutas privadas
│   ├── pages/
│   │   ├── public/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Registro.jsx
│   │   │   ├── RecuperarSolicitud.jsx
│   │   │   ├── RecuperarReset.jsx
│   │   │   └── AceptarInvitacion.jsx
│   │   ├── app/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Perfil.jsx
│   │   │   ├── CambiarPassword.jsx
│   │   │   ├── Organizacion.jsx
│   │   │   ├── RecintosLista.jsx
│   │   │   ├── RecintoDetalle.jsx
│   │   │   ├── RecintoForm.jsx
│   │   │   ├── SubirVideo.jsx
│   │   │   ├── EditorZonas.jsx
│   │   │   ├── AnalisisResultado.jsx
│   │   │   ├── HistorialAnalisis.jsx
│   │   │   └── Configuracion.jsx
│   │   └── errors/
│   │       ├── NotFound.jsx
│   │       ├── Forbidden.jsx
│   │       └── ServerError.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx      ← sidebar + header para vistas autenticadas
│   │   │   └── PublicLayout.jsx
│   │   ├── heatmap/
│   │   │   └── Heatmap.jsx        ← wrapper de heatmap.js
│   │   ├── zonas/
│   │   │   └── ZonaEditor.jsx     ← wrapper de react-konva
│   │   ├── metricas/
│   │   │   ├── TablaMetricas.jsx
│   │   │   ├── GraficoBarras.jsx
│   │   │   └── AlertaZonaFria.jsx
│   │   └── common/
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       ├── Spinner.jsx
│   │       └── ...
│   ├── hooks/
│   │   ├── useRecintos.js
│   │   ├── useVideoEstado.js      ← polling cada 3s
│   │   └── ...
│   ├── utils/
│   │   ├── validators.js          ← zod schemas
│   │   ├── formatters.js
│   │   └── pdf.js                 ← exportación a PDF
│   └── styles/
│       └── globals.css
└── public/
    └── logo.svg
```

## Autenticación en el cliente

### AuthContext

Provee estado global `{user, token, login, logout, register, loading}`. Al montar la app:
1. Lee token de `localStorage` con key `flowsense_token`.
2. Si existe y no expiró (verificar con `jwt-decode`), lo setea como autenticado.
3. Si expiró, lo borra y queda deslogueado.

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

Componente wrapper que:
- Si no hay usuario autenticado → redirect a `/login` con `state.from` para volver luego del login.
- Si hay usuario → renderiza `<Outlet />`.

## Estructura de rutas

Las rutas completas están en `ALCANCE_COMPLETO.md` sección 3. Resumen:

- Públicas: `/`, `/login`, `/registro`, `/recuperar`, `/recuperar/:token`, `/invitacion/:token`
- Privadas (bajo `/app`): dashboard, perfil, organización, recintos, videos, editor de zonas, análisis, configuración
- Errores: `/404`, `/403`, `/500`

Todas las privadas usan `<ProtectedRoute>` + `<AppLayout>` que provee sidebar y header con menú de usuario.

## Polling del estado de video

Para el flujo de upload + procesamiento, usar el hook `useVideoEstado(videoId)`:

- Hace `GET /api/videos/:id/estado` cada 3 segundos.
- Cuando recibe `COMPLETADO` → detiene polling, dispara callback para cargar métricas.
- Cuando recibe `ERROR` → detiene polling, muestra toast de error.
- Timeout de 15 minutos — si sigue en `PROCESANDO`, muestra mensaje de que puede tardar.
- Al desmontar el componente → detiene el polling.

## Validación de formularios

Todos los formularios usan `react-hook-form` + resolver de `zod`. Ejemplo:

```js
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres")
});
```

Esto mantiene validación coherente client/server y mensajes claros en español.

## Variables de entorno

```env
VITE_API_URL=http://localhost:8080/api
VITE_APP_NAME=FlowSense
```

En Vercel: `VITE_API_URL` apunta al Railway del backend.

## Convenciones de código

- **Componentes** en PascalCase, archivos con la misma convención.
- **Hooks custom** empiezan con `use`.
- **Imports** ordenados: React → libs externas → api → componentes → hooks → utils → styles.
- **CSS**: Ant Design primero, Tailwind o CSS modules solo para casos puntuales. Evitar inline styles excepto para valores dinámicos (posición de zonas).
- **Textos** de UI siempre en español (es-CL).
- **Console.log** solo en desarrollo. Usar un wrapper simple que respete `import.meta.env.DEV`.

## Accesibilidad y UX mínima

- Todos los forms deben tener labels asociados a inputs.
- Botones de submit deben mostrar loading state cuando la request está en curso.
- Errores de validación se muestran debajo del input, no en alertas modales.
- Errores de servidor (500, red caída) → toast rojo. Errores de validación (400) → inline.
- Navegación principal accesible por teclado.

## Performance

- **Code splitting** por ruta con `React.lazy()` + `Suspense`.
- **Heatmap y canvas** solo se montan en las vistas que los usan (no en el layout global).
- **Imágenes de planos** (base64 en BD) pueden ser grandes. Comprimir antes de subir si exceden 500KB.
- **TanStack Table** con virtualización si la tabla de historial de análisis pasa de 50 filas.

## Lo que Claude Code NO debe hacer en este módulo

- **No** usar `localStorage` para guardar datos sensibles más allá del token JWT.
- **No** hacer requests sin pasar por el `client.js` (perderíamos el interceptor).
- **No** mezclar lógica de UI con llamadas a API directamente en componentes; usar hooks o servicios en `/api`.
- **No** crear rutas privadas sin envolverlas en `<ProtectedRoute>`.
- **No** olvidar el spinner/loading state en operaciones asíncronas.
- **No** exportar PDFs que contengan el nombre de personas identificables (solo métricas agregadas).
- **No** renderizar el video MP4 subido en el frontend. El video nunca debe mostrarse; solo sus métricas derivadas.
