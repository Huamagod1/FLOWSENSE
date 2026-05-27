# FlowSense

Plataforma web SaaS que analiza el flujo peatonal en espacios comerciales mediante visión artificial y tracking individual de personas. El administrador sube un video MP4, define zonas sobre un frame del video y obtiene métricas objetivas de valor comercial por zona para apoyar decisiones de pricing de arriendo.

**Modo de operación**: offline por diseño. Procesa MP4 pregrabados — no requiere hardware especial ni análisis en tiempo real.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Ant Design 5 + react-konva + recharts |
| Backend | Spring Boot 3 + Java 21 + Spring Security + JWT |
| Visión IA | Python 3.12 + YOLOv8 (ultralytics 8.3) + ByteTrack |
| Base de datos | MySQL 8 + Flyway (migraciones hasta V11) |
| Orquestación | Docker Compose |

---

## Requisitos

- Docker Desktop
- Git

---

## Levantar el proyecto

```bash
git clone https://github.com/Huamagod1/FLOWSENSE.git
cd FLOWSENSE
docker compose up --build
```

### Acceso

| Servicio | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| Base de datos | localhost:3306 |

---

## Flujo principal del sistema

```
1.  Admin sube MP4 desde React → Spring Boot
2.  Spring Boot guarda MP4, crea registro con estado=PENDIENTE
3.  Python extrae frame del segundo 5 → PNG
4.  Admin dibuja zonas sobre el frame con react-konva
5.  Admin lanza análisis
6.  Python procesa el video con YOLOv8 (10 fps) + ByteTrack
7.  Escribe CSV anónimo con detecciones y track_id efímero
8.  Spring Boot lee CSV, calcula 12 métricas por zona
9.  Genera video overlay con trayectorias (H.264)
10. Admin ve resultados en el dashboard de 5 tabs
```

---

## Dashboard de resultados — 5 tabs

| Tab | Contenido |
|-----|-----------|
| **Validación del análisis** | Score de confiabilidad (ALTO/MEDIO/BAJO), video overlay con trayectorias, eventos por zona |
| **Resumen** | Personas únicas, permanencia promedio, flujo entre zonas |
| **Recomendación de precio** | Precio sugerido por zona según score compuesto |
| **Análisis detallado** | Heatmap, ranking de tráfico, tasa de detención, distribución temporal |
| **Flujo y trayectorias** | Trayectorias individuales, flechas de flujo entre zonas, métricas de tracking |

---

## Métricas por zona

El sistema entrega 12 métricas por zona:

**Métricas clásicas (OTS)**
- Tráfico relativo (índice respecto al promedio)
- Tasa de detención (% detenidos vs en movimiento)
- Patrón temporal (distribución en franjas)
- Score compuesto (combinación ponderada)

**Métricas de tracking (ByteTrack)**
- Personas únicas (sin doble conteo)
- Permanencia promedio (segundos/persona)
- Entradas y salidas por zona
- OTS con tracking (persona-segundos sin repetición)
- Flujo entre zonas (origen → destino)
- Velocidad de flujo promedio
- Calidad de tracking

---

## Estructura del repositorio

```
FLOWSENSE/
├── CLAUDE.md                   ← contexto para Claude Code
├── ALCANCE_COMPLETO.md         ← alcance funcional del MVP
├── ROADMAP_POST_MVP.md         ← funcionalidades futuras
├── docker-compose.yml
├── Documentacion/              ← entregables académicos
├── Gestion/                    ← documentos del equipo
└── Producto/
    ├── python/                 ← detector YOLOv8 + ByteTrack
    ├── backend/                ← API Spring Boot
    ├── frontend/               ← SPA React
    └── database/               ← migraciones SQL (V1–V11)
```

---

## Equipo

| Integrante | Rol |
|-----------|-----|
| Fernando Huamanchumo | Frontend / React |
| Fernando Tapia | Backend + Visión IA (Python) |
| Octavio Ibañez | Base de datos / MySQL |

---

## Última actualización

**2026-05-27** — Actualización para reflejar el estado actual del sistema:
- Tracking individual con ByteTrack (personas únicas, permanencia, flujo)
- Sample rate actualizado a 10 fps para tracking estable
- Dashboard rediseñado con 5 tabs
- Endpoints de validación (confiabilidad, video-overlay, eventos)
- Migraciones Flyway hasta V11 (confiabilidad_video)
- Política de privacidad actualizada (video original temporal, eliminable por el admin)
