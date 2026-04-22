# CLAUDE.md — Capa Backend / Spring Boot

Este archivo da contexto específico de la API REST de FlowSense. Complementa el `CLAUDE.md` raíz. Lee ambos. La lista completa de endpoints está en `ALCANCE_COMPLETO.md`.

## Rol de este módulo

API REST en Spring Boot 3 con Java 17 que orquesta todo el sistema. Recibe requests del frontend React, gestiona autenticación con JWT, invoca el script Python para procesar videos, lee el CSV resultante, calcula métricas agregadas, y persiste todo en MySQL.

## Stack del módulo

- Spring Boot 3.2+ con Spring Web, Spring Data JPA, Spring Security, Spring Mail, Spring Validation
- Java 17 (LTS)
- MySQL Connector/J 8.x
- JJWT (io.jsonwebtoken) 0.12.x para firma y validación de JWT
- BCrypt (incluido en Spring Security)
- Maven como build tool

## Estructura del módulo

```
Producto/backend/
├── CLAUDE.md
├── README.md
├── pom.xml
├── Dockerfile
├── src/main/java/cl/duoc/flowsense/
│   ├── FlowsenseApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java          ← filtro JWT, CORS, cadena de seguridad
│   │   ├── JwtConfig.java
│   │   └── MailConfig.java
│   ├── auth/
│   │   ├── AuthController.java          ← /api/auth/**
│   │   ├── AuthService.java
│   │   ├── JwtService.java              ← generación y validación de tokens
│   │   ├── JwtAuthFilter.java           ← filtro de cada request
│   │   └── dto/                         ← LoginRequest, RegistroRequest, etc.
│   ├── usuarios/
│   │   ├── UsuarioController.java
│   │   ├── UsuarioService.java
│   │   ├── UsuarioRepository.java
│   │   ├── Usuario.java                 ← entidad JPA
│   │   └── dto/
│   ├── organizaciones/
│   │   ├── OrganizacionController.java
│   │   ├── OrganizacionService.java
│   │   ├── OrganizacionRepository.java
│   │   ├── Organizacion.java
│   │   ├── InvitacionService.java
│   │   └── dto/
│   ├── recintos/
│   │   ├── RecintoController.java
│   │   ├── RecintoService.java
│   │   ├── RecintoRepository.java
│   │   ├── Recinto.java
│   │   ├── ZonaController.java
│   │   ├── ZonaService.java
│   │   ├── Zona.java
│   │   └── dto/
│   ├── videos/
│   │   ├── VideoController.java
│   │   ├── VideoService.java
│   │   ├── VideoRepository.java
│   │   ├── Video.java
│   │   ├── DeteccionRepository.java
│   │   ├── Deteccion.java
│   │   ├── MetricaRepository.java
│   │   ├── Metrica.java
│   │   └── dto/
│   ├── procesamiento/
│   │   ├── PythonOrchestratorService.java   ← ProcessBuilder + async
│   │   ├── CsvParserService.java
│   │   └── MetricasCalculatorService.java
│   ├── email/
│   │   ├── EmailService.java
│   │   └── templates/                    ← HTMLs de reset e invitación
│   ├── common/
│   │   ├── exceptions/                   ← handlers globales
│   │   ├── security/                     ← utilidades (CurrentUser, etc.)
│   │   └── validation/
│   └── tokens/
│       ├── TokenAuth.java
│       ├── TokenAuthRepository.java
│       └── TokenAuthService.java
├── src/main/resources/
│   ├── application.yml
│   ├── application-dev.yml
│   ├── application-prod.yml
│   └── db/migration/                     ← Flyway SQL
└── src/test/java/...
```

## Contratos clave

### Contrato con Python (ProcessBuilder)

- **Invocación**: Spring ejecuta `python detector.py --video <path> --output <path> --zonas <path> --fps 1 --conf <umbral>`.
- **Asíncrono**: el endpoint de upload responde `201 Created` con `{video_id}` inmediatamente. El procesamiento se ejecuta en un `@Async` o `CompletableFuture.runAsync()`.
- **Estados del video** (en tabla `VIDEOS`): `PENDIENTE` → `PROCESANDO` → `COMPLETADO` | `ERROR`.
- **Captura de stdout**: Spring lee la última línea del stdout como JSON con `{frames_procesados, detecciones_totales, duracion_seg, status}`. Si `status="ERROR"` o exit code ≠ 0, se marca el video como `ERROR` con el mensaje guardado en un campo `mensaje_error`.
- **Timeout**: 10 minutos. Si Python no termina, matar proceso y marcar `ERROR`.

### Contrato con Frontend

- Todas las respuestas son JSON.
- Errores con estructura uniforme: `{"error": "codigo", "mensaje": "texto", "detalles": {...}}`.
- Todos los endpoints autenticados esperan `Authorization: Bearer <token>` en header.
- Todos los endpoints autenticados filtran automáticamente por `id_organizacion` del usuario logueado. Un usuario **nunca** ve recintos, videos ni datos de otra organización.

## JWT y autenticación

### Configuración

- **Algoritmo**: HS256.
- **Secret**: `JWT_SECRET` env var, mínimo 256 bits (32 caracteres).
- **Expiración**: 24 horas.
- **Payload**:
  ```json
  {
    "sub": "<id_usuario>",
    "email": "<email>",
    "org_id": "<id_organizacion>",
    "rol": "ADMIN",
    "iat": <timestamp>,
    "exp": <timestamp>
  }
  ```

### Filtro JWT

`JwtAuthFilter extends OncePerRequestFilter` aplicado a todas las rutas `/api/**` **excepto** `/api/auth/**`. El filtro:
1. Lee `Authorization` header.
2. Valida firma y expiración.
3. Carga el `Usuario` desde el claim `sub`.
4. Setea `SecurityContextHolder` con las authorities (`ROLE_ADMIN`).
5. Si el token es inválido → responde 401 con JSON de error (no redirect).

### Contraseñas

- BCrypt strength 10.
- Validación al registrar: mínimo 8 caracteres, al menos una letra y un número.
- Nunca retornar el `password_hash` en ningún DTO.

## Multi-tenancy por organización

**Regla crítica**: todo recurso (recinto, video, zona, detección, métrica) pertenece a una organización vía `RECINTOS.id_organizacion`. En cada query se filtra por la organización del usuario logueado.

Patrón recomendado: un `CurrentUser` injectable que expone `getIdOrganizacion()`, y en todos los repositorios métodos con `findByIdAndOrganizacionId(Long id, Long orgId)` en lugar de `findById(Long id)`.

Si un admin intenta acceder a un recurso de otra organización → `404 Not Found` (no `403`, para no filtrar la existencia).

## Invitaciones entre admins

Flujo completo:

1. Admin A logueado → `POST /api/organizacion/invitaciones` con `{email_destino}`.
2. Backend valida que el email no sea ya usuario de otra org (si lo es → 409).
3. Genera token random en `TOKENS_AUTH` con `tipo='INVITACION_ORG'`, `id_organizacion=A.id_organizacion`, `email_destino`, expira en 24h.
4. Envía email con link `https://<frontend>/invitacion/<token>`.
5. Usuario destino abre el link, completa `nombre, apellido, password` → `POST /api/auth/invitacion/:token`.
6. Backend valida token (existe, no usado, no expirado), crea `Usuario` con `id_organizacion` del token, marca token como `usado=true`, retorna JWT.

## Recuperación de contraseña (HU-14, Sprint 4)

Flujo similar:

1. `POST /api/auth/recuperar` con `{email}`.
2. **Siempre** responde 200 con mensaje genérico (por seguridad, no revelar si el email existe).
3. Si el email existe, genera token con `tipo='PASSWORD_RESET'`, expira en 24h, envía email.
4. Usuario abre link `https://<frontend>/recuperar/<token>` → `POST /api/auth/recuperar/:token` con `{nueva_password}`.
5. Backend valida token, actualiza `password_hash`, marca token como usado.

## Procesamiento asíncrono de videos

Opciones en orden de preferencia:

**Opción 1 — `@Async` con ThreadPoolTaskExecutor** (recomendada para MVP):
- Simple, sin infraestructura adicional.
- Limitar pool a 2-3 threads para no saturar CPU con múltiples YOLO.
- Riesgo: si Spring Boot se reinicia durante procesamiento, el video queda en `PROCESANDO` para siempre. Mitigación: al startup, buscar videos en `PROCESANDO` con `>10min` y marcar `ERROR`.

**Opción 2 — Cola en BD con worker** (sobreingeniería para este MVP, no implementar salvo que lo pida el docente).

## Variables de entorno

```env
# Base de datos
DB_HOST=mysql
DB_PORT=3306
DB_NAME=flowsense
DB_USER=flowsense
DB_PASSWORD=<secret>

# JWT
JWT_SECRET=<64-char-random>
JWT_EXPIRATION_HOURS=24

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<email>
MAIL_PASSWORD=<app-password>
MAIL_FROM=noreply@flowsense.cl

# Python
PYTHON_BIN=python3
PYTHON_SCRIPT=/app/python/detector.py
UPLOAD_DIR=/app/uploads
RESULTS_DIR=/app/results
ZONES_DIR=/app/zones

# App
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://<vercel-url>
```

**Nunca** commitear `.env` con valores reales. Usar `.env.example` con valores dummy.

## Convenciones de código

- **Paquetes** por feature (auth, usuarios, recintos, videos), no por capa técnica (controllers, services, entities).
- **DTOs obligatorios** en request y response de controllers. Nunca exponer entidades JPA directamente.
- **Validaciones** con Bean Validation (`@NotNull`, `@Email`, `@Size`).
- **Excepciones custom** (`RecursoNoEncontradoException`, `AccesoDenegadoException`, `ValidacionException`) manejadas por un `@ControllerAdvice` global.
- **Logs** con SLF4J. Nivel INFO para eventos de negocio, DEBUG para detalles técnicos, ERROR solo para fallos reales.
- **Tests** mínimos: unitarios de servicios críticos (auth, cálculo de métricas) con Mockito; integración del pipeline end-to-end opcional.

## Lo que Claude Code NO debe hacer en este módulo

- **No** exponer entidades JPA en endpoints (siempre DTOs).
- **No** hardcodear el secret JWT, credenciales de email, ni URLs de frontend.
- **No** olvidar filtrar por `id_organizacion` en queries que involucran recintos/videos/zonas.
- **No** retornar mensajes de error que revelen si un email está registrado o no (en endpoints de auth).
- **No** procesar video de forma sincrónica bloqueando el request HTTP.
- **No** implementar roles adicionales más allá de ADMIN sin actualizar primero `ALCANCE_COMPLETO.md`.
- **No** agregar campos a `DETECCIONES` o `METRICAS` que puedan permitir identificación individual de personas.
