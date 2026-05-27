# FlowSense — Frontend React

SPA (Single Page Application) en React 18 que consume la API REST de Spring Boot. Proporciona el flujo completo desde la autenticación hasta el dashboard de resultados con 5 tabs.

---

## Stack

- **React 18** + Vite
- **react-router-dom 6** — rutas con guards
- **Ant Design 5** — componentes UI
- **axios** — cliente HTTP con interceptor JWT
- **react-konva** — editor visual de zonas sobre el frame
- **recharts** — gráficos de barras y ranking
- **react-hook-form + zod** — validación de formularios

---

## Levantar el frontend

```bash
# Desde la carpeta Producto/frontend/
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173`.

> La URL del backend se configura en `.env.local`:
> ```
> VITE_API_URL=http://localhost:8080/api
> ```

---

## Flujo de vistas

```
/ (landing)
├── /login
├── /registro
└── /app (ProtectedRoute)
    ├── /app/recintos          ← lista de recintos
    ├── /app/recintos/nuevo    ← crear recinto
    ├── /app/recintos/:id      ← detalle con historial de análisis
    ├── /app/videos/:id/zonas  ← editor de zonas (react-konva)
    └── /app/analisis/:id      ← dashboard de resultados (5 tabs)
```

---

## Dashboard de resultados — 5 tabs

El componente `ResultadosPage` organiza el análisis en 5 pestañas:

### 1. Validación del análisis
**Componente**: `VideoValidacion`

- Score de confiabilidad: ALTO / MEDIO / BAJO
- Detalles: confianza promedio, calidad de tracking, % frames OK
- Video overlay (`<video>`) con las trayectorias de tracking dibujadas (H.264)
- Tabla de eventos de entrada/salida por zona sincronizada con el tiempo del video

### 2. Resumen
**Componente**: `ResumenEjecutivo`

- Personas únicas por zona (sin doble conteo)
- Permanencia promedio en segundos
- Flujo entre zonas (quién va de dónde a dónde)
- Comparativa rápida entre zonas

### 3. Recomendación de precio
**Componente**: `RecomendacionPrecio`

- Input de precio base (CLP/mes)
- Precios sugeridos calculados en tiempo real según score compuesto
- Justificación textual por zona

### 4. Análisis detallado
**Componente**: `AnalisisDetallado`

- Heatmap espacial sobre el frame del video (canvas 2D, gradientes radiales proporcionales a la zona)
- Ranking de tráfico (barras horizontales con recharts)
- Tasa de detención por zona (paso vs interés comercial)
- Distribución temporal (matriz zona × franja horaria)
- Tabla resumen con las 4 métricas clásicas
- Conclusiones automáticas del análisis

### 5. Flujo y trayectorias
**Componente**: `TrayectoriasCanvas`

- Frame del video atenuado como fondo
- Rectángulos de zonas con colores configurados
- Burbujas de personas únicas en el centro de cada zona
- Flechas de flujo entre zonas (grosor proporcional al conteo)
- Arcos bezier multicolor por track individual (personas que cruzan zonas)
- Diagrama Sankey de flujo entre zonas (`FlujoSankeyChart`)
- Panel de métricas de tracking (`MetricasTrackingPanel`)

---

## Componentes principales

| Componente | Descripción |
|-----------|-------------|
| `VideoValidacion` | Tab validación: score, overlay de video, eventos |
| `ResumenEjecutivo` | Tab resumen: personas únicas, permanencia, flujo |
| `RecomendacionPrecio` | Tab precio: cálculo interactivo con precio base |
| `AnalisisDetallado` | Tab análisis: heatmap, ranking, distribución temporal |
| `TrayectoriasCanvas` | Tab flujo: canvas con trayectorias individuales y flechas |
| `FlujoSankeyChart` | Diagrama Sankey de flujo entre zonas |
| `MetricasTrackingPanel` | Panel de las 8 métricas de ByteTrack |

---

## Estructura de carpetas

```
src/
├── api/
│   ├── axiosConfig.js          ← axios + interceptor JWT
│   ├── auth.js
│   ├── tracking.js             ← getTracks, getFlujoZonas, getMetricasTracking
│   └── validacion.js           ← getConfiabilidad
├── auth/
│   ├── AuthContext.jsx
│   └── ProtectedRoute.jsx
├── components/
│   ├── AnalisisDetallado.jsx
│   ├── TrayectoriasCanvas.jsx
│   ├── VideoValidacion.jsx
│   ├── ResumenEjecutivo.jsx
│   ├── RecomendacionPrecio.jsx
│   ├── FlujoSankeyChart.jsx
│   └── MetricasTrackingPanel.jsx
├── hooks/
│   └── usePolling.js           ← polling de estado del video
└── pages/
    ├── ResultadosPage.jsx      ← orquesta las 5 tabs
    └── ...
```

---

## Última actualización

**2026-05-27** — Reescritura completa del README (era el template por defecto de Vite):
- Dashboard rediseñado con 5 tabs (antes estructura lineal)
- Componentes nuevos: VideoValidacion, ResumenEjecutivo, RecomendacionPrecio, MetricasTrackingPanel
- TrayectoriasCanvas ampliado con arcos de trayectorias individuales y flechas de flujo
- Heatmap con radio proporcional al tamaño de cada zona
- Banner de cabecera actualizado a métricas de tracking ByteTrack
