# FlowSense — Alcance Completo del MVP

**Documento maestro de decisiones**. Fuente única de verdad para el alcance funcional. Todos los CLAUDE.md y documentación técnica deben ser consistentes con este archivo. Las funcionalidades fuera de este alcance están en `ROADMAP_POST_MVP.md`.

---

## 1. Identidad del producto

- **Nombre**: FlowSense
- **Tipo**: Plataforma web SaaS
- **Cliente**: Administradores de espacios comerciales (malls, galerías, ferias)
- **Propuesta de valor**: analizar valor comercial por zona mediante visión artificial respetando privacidad, sin hardware especializado, para apoyar decisiones de pricing de arriendo

## 2. Modelo de usuarios (MVP)

### Rol único: ADMINISTRADOR

Un solo rol funcional. Cada usuario tiene su propia organización implícita (sus recintos son privados).

### Autenticación incluida en MVP

- Registro público con email + contraseña
- Login con JWT (24h de duración)
- Logout (descartar token)
- Validación de password mínima

### Autenticación NO incluida en MVP (post-MVP)

- Recuperación de contraseña por email
- Cambio de contraseña desde perfil
- Edición de datos de perfil
- Invitación de otros admins
- Multi-organización
- Roles diferenciados

## 3. Vistas del MVP

### Vistas públicas (sin autenticación)

| Vista | Ruta | Estado |
|-------|------|--------|
| Landing | `/` | MVP |
| Login | `/login` | MVP |
| Registro | `/registro` | MVP |

### Vistas autenticadas

| Vista | Ruta | Estado |
|-------|------|--------|
| Dashboard principal | `/app` | MVP |
| Lista de recintos | `/app/recintos` | MVP |
| Crear/editar recinto | `/app/recintos/nuevo`, `/app/recintos/:id/editar` | MVP |
| Detalle de recinto | `/app/recintos/:id` | MVP |
| Subir video | `/app/recintos/:id/analizar` | MVP |
| Editor de zonas | `/app/videos/:id/zonas` | MVP |
| Resultado del análisis | `/app/analisis/:id` | MVP |
| Historial de análisis | `/app/recintos/:id/historial` | Post-MVP |
| Configuración | `/app/configuracion` | Post-MVP |
| Perfil | `/app/perfil` | Post-MVP |

### Vistas de error

- `/404` Not Found
- `/403` Forbidden
- `/500` Server Error

## 4. Historias de Usuario (HU) del MVP

### HU del flujo principal

| Código | Historia | Sprint | Prioridad |
|--------|----------|--------|-----------|
| HU-01 | Como admin quiero subir un video MP4 para analizar el flujo de mi recinto | 2 | Alta |
| HU-02 | Como admin quiero definir zonas dibujando rectángulos sobre un frame del video | 3 | Alta |
| HU-03 | Como admin quiero ver un mapa de calor del recinto sobre el frame | 4 | Alta |
| HU-04 | Como admin quiero ver métricas cuantitativas por zona en una tabla | 4 | Alta |
| HU-08 | Como admin quiero gestionar múltiples recintos | 2 | Media |

### HU de las métricas avanzadas

| Código | Historia | Sprint | Prioridad |
|--------|----------|--------|-----------|
| HU-21 | Como admin quiero ver la tasa de detención por zona para distinguir paso de interés | 4 | Alta |
| HU-22 | Como admin quiero ver el patrón temporal de cada zona en franjas horarias | 4 | Alta |
| HU-23 | Como admin quiero ver el Score de Valor Comercial de cada zona | 4 | Alta |
| HU-24 | Como admin quiero ingresar un precio base y ver precios sugeridos por zona | 4 | Alta |

### HU de autenticación básica

| Código | Historia | Sprint | Prioridad |
|--------|----------|--------|-----------|
| HU-11 | Como usuario quiero registrarme con email y contraseña | 2 | Alta |
| HU-12 | Como usuario quiero iniciar y cerrar sesión | 2 | Alta |
| HU-13 | Como usuario quiero que mi sesión persista mediante JWT | 2 | Alta |

### HU de cierre académico

| Código | Historia | Sprint | Prioridad |
|--------|----------|--------|-----------|
| HU-06 | Como admin quiero exportar un reporte PDF para negociación | 5 | Media |
| HU-25 | Como equipo queremos validar empíricamente las métricas con experimentos controlados | 5 | Alta |
| HU-10 | Como equipo queremos un repositorio bien documentado | Continuo | Alta |

## 5. Modelo Entidad-Relación

### Tablas del MVP

```
USUARIOS
  id (PK)
  email (UNIQUE)
  password_hash (BCrypt)
  nombre
  apellido
  fecha_registro
  ultimo_login
  activo

RECINTOS
  id (PK)
  id_usuario (FK)
  nombre
  tipo (MALL | GALERIA | FERIA | OTRO)
  direccion
  fecha_creacion

VIDEOS
  id (PK)
  id_recinto (FK)
  nombre_original
  ruta
  ruta_frame_preview
  estado (PENDIENTE | FRAME_LISTO | ESPERANDO_ZONAS | PROCESANDO | COMPLETADO | ERROR)
  mensaje_error
  conf_usado
  modelo_usado
  frames_procesados
  duracion_proceso_seg
  fecha_subida
  fecha_completado

ZONAS
  id (PK)
  id_video (FK)
  nombre
  color_hex
  x_norm (DECIMAL 6,4)
  y_norm (DECIMAL 6,4)
  ancho_norm (DECIMAL 6,4)
  alto_norm (DECIMAL 6,4)

DETECCIONES
  id (PK)
  id_video (FK)
  id_zona (FK)
  frame_numero (INT)
  x_centro_norm (DECIMAL 6,4)
  y_centro_norm (DECIMAL 6,4)
  confianza (DECIMAL 4,3)
  detenida (BOOLEAN)

METRICAS_ZONA
  id (PK)
  id_video (FK)
  id_zona (FK)
  total_detecciones (INT)
  porcentaje_del_total (DECIMAL 5,2)
  densidad_promedio (DECIMAL 6,3)
  pico_maximo (INT)
  frames_con_actividad (INT)
  confianza_promedio (DECIMAL 4,3)
  area_zona (DECIMAL 8,6)
  densidad_por_area (DECIMAL 8,3)
  tasa_detencion (DECIMAL 5,2)
  indice_trafico (DECIMAL 5,2)
  consistencia_temporal (DECIMAL 5,2)
  score_compuesto (DECIMAL 5,2)
  precio_sugerido (DECIMAL 12,2)

METRICAS_TEMPORALES
  id (PK)
  id_video (FK)
  id_zona (FK)
  franja_numero (INT)
  segundo_inicio (INT)
  segundo_fin (INT)
  total_detecciones (INT)
  densidad_relativa (DECIMAL 6,3)
```

### Relaciones

```
USUARIOS (1) ──< (N) RECINTOS
RECINTOS (1) ──< (N) VIDEOS
VIDEOS   (1) ──< (N) ZONAS
VIDEOS   (1) ──< (N) DETECCIONES
ZONAS    (1) ──< (N) DETECCIONES
VIDEOS   (1) ──< (N) METRICAS_ZONA
ZONAS    (1) ──< (N) METRICAS_ZONA
VIDEOS   (1) ──< (N) METRICAS_TEMPORALES
ZONAS    (1) ──< (N) METRICAS_TEMPORALES
```

### Cascadas de borrado

- USUARIO → cascada total de sus recintos
- RECINTO → cascada total de sus videos, zonas, métricas
- VIDEO → cascada total de sus detecciones, métricas

## 6. Contrato de API REST

### Base URL

`http://localhost:8080/api` en desarrollo.

### Endpoints públicos

| Método | Endpoint | Body / Params | Respuesta |
|--------|----------|---------------|-----------|
| POST | `/auth/registro` | email, password, nombre, apellido | token, usuario |
| POST | `/auth/login` | email, password | token, usuario |

### Endpoints autenticados

#### Recintos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/recintos` | Lista recintos del usuario |
| POST | `/recintos` | Crear recinto |
| GET | `/recintos/:id` | Detalle de recinto |
| PUT | `/recintos/:id` | Editar recinto |
| DELETE | `/recintos/:id` | Eliminar recinto |

#### Videos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/recintos/:id/videos` | Upload de video MP4 |
| GET | `/videos/:id/estado` | Polling de estado |
| GET | `/videos/:id/frame-preview` | URL del frame extraído |
| GET | `/recintos/:id/videos` | Historial del recinto |
| DELETE | `/videos/:id` | Eliminar análisis |

#### Zonas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/videos/:id/zonas` | Listar zonas del video |
| PUT | `/videos/:id/zonas` | Guardar/reemplazar zonas (batch) |
| POST | `/videos/:id/zonas/confirmar` | Confirmar zonas y lanzar análisis |

#### Métricas y resultados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/videos/:id/metricas` | Métricas calculadas por zona |
| GET | `/videos/:id/metricas-temporales` | Métricas por franja temporal |
| GET | `/videos/:id/detecciones` | Puntos para heatmap |
| POST | `/videos/:id/precio-sugerido` | Calcular precios con base ingresada |

## 7. Las 4 Métricas en detalle

### Métrica 1: Tráfico relativo (índice_trafico)

**Cálculo**: `total_detecciones_zona / (total_video / num_zonas)`

**Interpretación**: 1.0x = promedio del recinto. 2.5x = el doble y medio del promedio.

**Decisión**: ranking de zonas por tráfico bruto.

### Métrica 2: Tasa de detención

**Cálculo**: porcentaje de detecciones marcadas como "detenidas" sobre el total.

**Cómo se determina detenida**: comparar coordenadas en frames consecutivos. Si la distancia normalizada entre detecciones es menor a 0.05 (5% del frame), se considera la misma persona detenida.

**Interpretación**: 60% = de cada 10 detecciones, 6 corresponden a personas quietas.

**Decisión**: distinguir zonas de paso (baja detención) de zonas de interés (alta detención).

### Métrica 3: Patrón temporal

**Cálculo**: dividir los frames procesados en N franjas iguales (default 5). Por cada zona y franja, contar detecciones.

**Resultado**: matriz zona × franja con detecciones por celda.

**Interpretación**: identifica picos y valles de actividad durante el video.

**Decisión**: pricing diferenciado por horario, identificación de momentos críticos.

### Métrica 4: Score Compuesto

**Cálculo**:

```
score = (0.40 × indice_trafico_norm) + 
        (0.30 × tasa_detencion_norm) + 
        (0.20 × densidad_normalizada) + 
        (0.10 × consistencia_temporal)
```

Donde cada componente está normalizado al promedio del recinto.

**Interpretación**: número entre 0 y 5+, donde 1.0 = valor promedio, 2.0 = doble del promedio.

**Decisión**: precio sugerido = precio_base × score.

## 8. Stack tecnológico consolidado

### Backend Spring Boot 3 + Java 17

Dependencias clave:
- spring-boot-starter-web
- spring-boot-starter-security
- spring-boot-starter-data-jpa
- spring-boot-starter-validation
- mysql-connector-j
- io.jsonwebtoken: jjwt 0.12.x

### Frontend React 18 + Vite

Dependencias clave:
- react-router-dom 6.x
- axios o ky (cliente HTTP con interceptor JWT)
- react-hook-form + zod (validación)
- jwt-decode
- react-konva 18.x (editor de zonas)
- recharts 2.x (gráficos)
- heatmap.js 2.x (mapa de calor)
- Ant Design 5.x (componentes UI)
- jsPDF + html2canvas (exportación PDF)

### Python 3.12 + YOLOv8 + ByteTrack

Dependencias en requirements.txt:
- ultralytics==8.3.* (incluye ByteTrack via lapx)
- opencv-python-headless==4.10.*
- numpy==1.26.*
- imageio-ffmpeg (fallback codec para video overlay)

**Sample rate**: 10 fps (necesario para tracking estable con ByteTrack).
**Tracker**: ByteTrack via `model.track(persist=True)` — movido de post-MVP a MVP.

### MySQL 8 + Flyway

Migraciones versionadas en `Producto/database/migrations/`.

## 9. Validación empírica del MVP

Para defender el proyecto académicamente, se realiza un experimento controlado:

### Experimento 1: Video controlado

Video corto (1-3 minutos) con guión definido:
- Personas con comportamientos específicos predefinidos
- Ground truth conocido (paso vs detención por zona)
- Validar que el sistema responde correctamente

### Experimento 2: Video real

Video natural de un recinto real:
- Conteo manual de personas en frames muestreados
- Comparación con conteo del sistema
- Validar margen de error razonable (<25%)

### Documento de validación

Word de 5-7 páginas con metodología, resultados y conclusiones.

## 10. Restricciones éticas y legales

Aplican a todo el sistema:

- NUNCA almacenar imágenes de personas durante el procesamiento (todo en RAM)
- NUNCA reconocimiento facial, ni datos biométricos (edad, género, color de ropa)
- El tracking anónimo con ByteTrack está permitido: track_id es un entero efímero dentro de la sesión de procesamiento, sin vinculación a identidad real entre sesiones
- NUNCA guardar datos que permitan identificar individuos fuera de su sesión
- **Política de video original**: el MP4 se almacena temporalmente, accesible solo para el dueño. El admin puede eliminarlo manualmente. Las detecciones en BD son anónimas.
- Cumplimiento Ley 19.628 y Ley 21.719 de Chile
- Contraseñas siempre BCrypt strength 10, nunca texto plano
- Tokens en variables de entorno, nunca hardcoded
- HTTPS obligatorio en producción
