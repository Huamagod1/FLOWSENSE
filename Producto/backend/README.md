# FlowSense Backend

API REST · Spring Boot 3 · Java 21 · MySQL 8

## Prerrequisitos

- Java 21 JDK
- Maven 3.9+
- MySQL 8 corriendo en `localhost:3306` con la base de datos `flowsense_db`

## Levantar localmente con Maven

```bash
# 1. Copia el archivo de variables de entorno y completa con tus valores
cp .env.example .env

# 2. Exporta las variables al entorno actual (bash/zsh)
set -a && source .env && set +a

# 3. Compila y levanta el servidor
./mvnw spring-boot:run
```

El servidor queda disponible en `http://localhost:8080`.

> **Nota:** Flyway buscará migraciones en `src/main/resources/db/migration/`.
> La base de datos debe existir antes de arrancar; Flyway crea las tablas automáticamente.

## Levantar con Docker Compose (stack completo)

Desde la raíz del repositorio:

```bash
docker compose up --build
```

Levanta MySQL 8 + backend juntos. El backend espera el healthcheck de MySQL antes de arrancar.

## Levantar solo el backend con Docker

```bash
# Construir la imagen
docker build -t flowsense-backend .

# Ejecutar pasando variables de entorno
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=3306 \
  -e DB_NAME=flowsense_db \
  -e DB_USER=flowsense \
  -e DB_PASSWORD=change_me \
  -e JWT_SECRET=CHANGE_ME_min_32_chars \
  -e MAIL_HOST=smtp.mailtrap.io \
  -e MAIL_PORT=587 \
  -e MAIL_USERNAME=user \
  -e MAIL_PASSWORD=pass \
  flowsense-backend
```

## Estructura del proyecto

```
src/main/java/cl/duoc/flowsense/
├── FlowsenseApplication.java     ← entrada principal (@SpringBootApplication)
├── config/                       ← SecurityConfig, JwtConfig, MailConfig
├── auth/                         ← /api/auth/** (login, registro, recuperación)
│   └── dto/
├── usuarios/                     ← gestión de usuarios administradores
│   └── dto/
├── organizaciones/               ← organizaciones e invitaciones entre admins
│   └── dto/
├── recintos/                     ← recintos comerciales y zonas
│   └── dto/
├── videos/                       ← upload, estados, detecciones, métricas
│   └── dto/
├── procesamiento/                ← orquestación Python (ProcessBuilder + @Async)
├── email/                        ← envío de emails transaccionales
├── tokens/                       ← tokens de invitación y recuperación
└── common/
    ├── exceptions/               ← excepciones y @ControllerAdvice global
    ├── security/                 ← utilidades (CurrentUser, etc.)
    └── validation/               ← validadores custom Bean Validation

src/main/resources/
├── application.yml               ← configuración con variables de entorno
└── db/migration/                 ← scripts Flyway (V1__*, V2__*, ...)
```

## Variables de entorno

Ver `.env.example` para la lista completa con descripción de cada variable.

---

## Migraciones Flyway

Las migraciones están en `src/main/resources/db/migration/` y se aplican automáticamente al arrancar.

| Versión | Archivo | Contenido |
|---------|---------|-----------|
| V1 | `V1__schema_auth.sql` | Tablas de autenticación (ORGANIZACIONES, USUARIOS) |
| V2 | `V2__schema_recintos_zonas.sql` | RECINTOS y ZONAS |
| V3 | `V3__schema_videos.sql` | VIDEOS con estados del pipeline |
| V4 | `V4__schema_detecciones_metricas.sql` | DETECCIONES y METRICAS_ZONA, METRICAS_TEMPORALES |
| V5 | `V5__add_detenida_detecciones.sql` | Columna `detenida` en DETECCIONES |
| V6 | `V6__add_conf_modelo_videos.sql` | Columnas `conf_usado` y `modelo_usado` en VIDEOS |
| V7 | `V7__schema_metricas_avanzadas.sql` | Columnas de score compuesto y métricas avanzadas |
| V8 | `V8__tracking_columns.sql` | Tablas TRACKS y FLUJO_ENTRE_ZONAS para ByteTrack |
| V9 | `V9__metricas_tracking.sql` | Tabla METRICAS_TRACKING con 8 métricas por zona |
| V10 | `V10__metricas_tracking_columns.sql` | Columnas adicionales de tracking en METRICAS_TRACKING |
| V11 | `V11__confiabilidad_video.sql` | Tabla CONFIABILIDAD_VIDEO (score ALTO/MEDIO/BAJO) |

---

## Endpoints nuevos (tracking y validación)

Ver `src/main/java/cl/duoc/flowsense/ENDPOINTS.md` para la referencia completa.

Resumen de endpoints agregados en Sprint 4:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/videos/{id}/tracks` | Tracks individuales de ByteTrack |
| GET | `/api/videos/{id}/flujo-zonas` | Flujo agregado entre zonas |
| GET | `/api/videos/{id}/metricas-tracking` | 8 métricas de tracking por zona |
| GET | `/api/videos/{id}/confiabilidad` | Score de confiabilidad del análisis |
| GET | `/api/videos/{id}/video-overlay` | Stream del MP4 overlay con trayectorias |
| GET | `/api/videos/{id}/eventos` | Eventos de entrada/salida paginados por frames |
| DELETE | `/api/videos/{id}/video-original` | Elimina el MP4 original del servidor |

---

## Última actualización

**2026-05-27** — Actualización para reflejar el estado actual del backend:
- Integración de ByteTrack: tracks, flujo entre zonas, métricas de tracking
- Score de confiabilidad del análisis (ALTO/MEDIO/BAJO)
- Endpoint de video overlay para validación visual
- Migraciones Flyway hasta V11
- Endpoints de eliminación granular (video-original vs análisis completo)
