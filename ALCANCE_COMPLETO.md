# FlowSense — Alcance Completo del Software

**Documento maestro de decisiones.** Fuente única de verdad para el equipo. Todos los `CLAUDE.md` y documentación técnica deben ser consistentes con este archivo. Si hay que cambiar algo del alcance, se modifica primero aquí y luego se propaga.

---

## 1. Identidad del producto

- **Nombre**: FlowSense
- **Tipo**: Plataforma web SaaS
- **Cliente**: Administradores de espacios comerciales (malls, galerías, ferias)
- **Propuesta de valor**: analizar flujo peatonal por zona mediante visión artificial, sin hardware, para justificar objetivamente precios de arriendo

## 2. Modelo de usuarios

### Rol único: ADMINISTRADOR

Se define un solo rol funcional en el sistema. La decisión se justifica porque el modelo de negocio contempla únicamente al administrador del espacio comercial como cliente del producto. No hay empleados, no hay arrendatarios con acceso, no hay jerarquía de permisos interna.

### Dos vías de creación de cuenta

Para cumplir con el requisito EA2 de gestión de usuarios, se habilitan dos mecanismos:

1. **Registro público**: cualquier persona con un email válido puede crear su cuenta desde la pantalla de registro. Al registrarse queda como ADMINISTRADOR de su propia organización.
2. **Invitación por un administrador existente**: un ADMIN puede enviar invitaciones a otros emails para que se unan como ADMIN de la misma organización. Esto cubre el caso de un mall grande con varios administradores compartiendo recintos.

### Concepto de organización

Para soportar la invitación entre admins, cada usuario pertenece a una `ORGANIZACION`. Al registrarse públicamente, se crea automáticamente una organización con un nombre por defecto que el usuario puede editar. Cuando un admin invita a otro, el invitado se une a la organización del que lo invitó. Los recintos son propiedad de la organización, no del usuario individual, por lo que todos los admins de la organización los ven.

## 3. Vistas completas del sistema

### 3.1 Vistas públicas (sin autenticación)

| Vista | Ruta React | Descripción |
|---|---|---|
| Landing | `/` | Página de presentación del producto con CTA a registro |
| Login | `/login` | Ingreso con email + contraseña |
| Registro | `/registro` | Creación de cuenta nueva (crea organización) |
| Solicitar reset | `/recuperar` | Form para pedir email de recuperación |
| Reset con token | `/recuperar/:token` | Form para ingresar nueva contraseña |
| Aceptar invitación | `/invitacion/:token` | Landing para completar registro al ser invitado |

### 3.2 Vistas autenticadas (requieren ADMIN)

| Vista | Ruta React | Descripción |
|---|---|---|
| Dashboard principal | `/app` | Resumen de recintos, últimos análisis, accesos rápidos |
| Mi perfil | `/app/perfil` | Editar nombre, teléfono, empresa |
| Cambiar contraseña | `/app/perfil/password` | Cambio desde sesión activa |
| Organización | `/app/organizacion` | Ver/editar nombre de org, lista de admins, invitar nuevos |
| Lista de recintos | `/app/recintos` | Grid de recintos de la organización |
| Crear/editar recinto | `/app/recintos/nuevo`, `/app/recintos/:id/editar` | Form con nombre, tipo, dirección, plano base64 |
| Detalle de recinto | `/app/recintos/:id` | Info del recinto + lista de videos analizados |
| Subir video | `/app/recintos/:id/analizar` | Upload MP4 + barra de progreso + polling de estado |
| Editor de zonas | `/app/recintos/:id/zonas` | Canvas con react-konva para dibujar zonas sobre plano |
| Resultado análisis | `/app/analisis/:id` | Heatmap + dashboard comparativo + exportar PDF |
| Historial análisis | `/app/recintos/:id/historial` | Lista comparativa de análisis anteriores |
| Configuración | `/app/configuracion` | Umbral de confianza YOLO y otros ajustes |

### 3.3 Vistas de error

- `/404` — No encontrado
- `/403` — Sin permisos
- `/500` — Error del servidor

## 4. Historias de usuario completas (20 HU)

### HU originales del documento de registro (10)

| Código | Historia | Sprint | Prioridad |
|---|---|---|---|
| HU-01 | Subir video MP4 para procesamiento | Sprint 2 | Alta |
| HU-02 | Definir zonas sobre el plano | Sprint 3 | Alta |
| HU-03 | Ver mapa de calor del recinto | Sprint 3 | Alta |
| HU-04 | Ver métricas cuantitativas por zona | Sprint 3 | Alta |
| HU-05 | Consultar historial de análisis anteriores | Sprint 4 | Media |
| HU-06 | Exportar reporte PDF | Sprint 4 | Media |
| HU-07 | Alertas de zona fría | Sprint 4 | Media |
| HU-08 | Gestionar múltiples recintos | Sprint 4 | Media |
| HU-09 | Configurar umbral de confianza | Sprint 4 | Baja |
| HU-10 | Repositorio estructurado con README | Sprint 5 | Baja |

### HU nuevas de autenticación y usuarios (10)

| Código | Historia | Sprint | Prioridad |
|---|---|---|---|
| HU-11 | Como usuario, quiero registrarme con email y contraseña para acceder a la plataforma | Sprint 2 | Alta |
| HU-12 | Como usuario, quiero iniciar y cerrar sesión de forma segura | Sprint 2 | Alta |
| HU-13 | Como usuario, quiero que mi sesión se mantenga activa mediante JWT para no reingresar credenciales en cada request | Sprint 2 | Alta |
| HU-14 | Como usuario, quiero recuperar mi contraseña vía email si la olvido | Sprint 4 | Media |
| HU-15 | Como usuario, quiero cambiar mi contraseña desde mi perfil estando logueado | Sprint 4 | Media |
| HU-16 | Como usuario, quiero editar mis datos de perfil (nombre, teléfono, empresa) | Sprint 4 | Media |
| HU-17 | Como administrador, quiero invitar a otros usuarios a mi organización para compartir la gestión de recintos | Sprint 4 | Media |
| HU-18 | Como usuario invitado, quiero aceptar una invitación mediante un link con token para unirme a una organización | Sprint 4 | Media |
| HU-19 | Como usuario, quiero ver la lista de administradores de mi organización | Sprint 4 | Baja |
| HU-20 | Como administrador, quiero editar el nombre de mi organización | Sprint 4 | Baja |

### Criterios de aceptación clave por HU (Sprint 2)

**HU-11 Registro**: email único, contraseña mínimo 8 caracteres con letra y número, se crea automáticamente una organización, respuesta incluye JWT.

**HU-12 Login**: email + password → JWT en respuesta, JWT incluye id_usuario, id_organizacion, rol, exp. Logout es client-side (descartar token) + opcional blacklist server-side.

**HU-13 Sesión JWT**: token expira en 24h, interceptor React agrega `Authorization: Bearer <token>` en cada fetch, backend valida con filtro Spring Security.

## 5. Modelo Entidad-Relación actualizado

### Tablas existentes (5) — sin cambios funcionales, solo agregan FK

```
RECINTOS
  id (PK)
  id_organizacion (FK) ← NUEVO
  nombre
  tipo                   ← NUEVO (MALL | GALERIA | FERIA | OTRO)
  direccion              ← NUEVO
  imagen_plano_base64
  fecha_creacion         ← NUEVO
```

Las demás tablas (`ZONAS`, `VIDEOS`, `DETECCIONES`, `METRICAS`) permanecen tal como están en el MER original.

### Tablas nuevas (3)

```
ORGANIZACIONES
  id (PK)
  nombre                 (VARCHAR 100, único opcional)
  fecha_creacion         (DATETIME)
  activo                 (BOOLEAN default TRUE)
```

```
USUARIOS
  id (PK)
  id_organizacion (FK → ORGANIZACIONES)
  email                  (VARCHAR 150, UNIQUE)
  password_hash          (VARCHAR 255, BCrypt)
  nombre                 (VARCHAR 100)
  apellido               (VARCHAR 100)
  telefono               (VARCHAR 20, nullable)
  empresa                (VARCHAR 150, nullable)
  rol                    (ENUM 'ADMIN')
  activo                 (BOOLEAN default TRUE)
  fecha_registro         (DATETIME)
  ultimo_login           (DATETIME, nullable)
```

```
TOKENS_AUTH
  id (PK)
  id_usuario (FK → USUARIOS, nullable para invitaciones)
  email_destino          (VARCHAR 150, nullable)
  token                  (VARCHAR 255, UNIQUE)
  tipo                   (ENUM 'PASSWORD_RESET' | 'INVITACION_ORG')
  id_organizacion        (FK, solo para invitaciones, nullable)
  expira_en              (DATETIME)
  usado                  (BOOLEAN default FALSE)
  fecha_creacion         (DATETIME)
```

### Diagrama de relaciones

```
ORGANIZACIONES (1) ──< (N) USUARIOS
ORGANIZACIONES (1) ──< (N) RECINTOS
RECINTOS       (1) ──< (N) ZONAS
RECINTOS       (1) ──< (N) VIDEOS
VIDEOS         (1) ──< (N) DETECCIONES
VIDEOS         (1) ──< (N) METRICAS
ZONAS          (1) ──< (N) DETECCIONES
ZONAS          (1) ──< (N) METRICAS
USUARIOS       (1) ──< (N) TOKENS_AUTH
```

## 6. Contrato de API REST completo

### Base URL
`http://localhost:8080/api` (dev) · `https://<railway-url>/api` (prod)

### Autenticación (públicos)

| Método | Endpoint | Body / Params | Respuesta |
|---|---|---|---|
| POST | `/auth/registro` | `{email, password, nombre, apellido, nombre_organizacion?}` | `{token, usuario, organizacion}` |
| POST | `/auth/login` | `{email, password}` | `{token, usuario}` |
| POST | `/auth/recuperar` | `{email}` | `{mensaje}` (siempre 200 por seguridad) |
| POST | `/auth/recuperar/:token` | `{nueva_password}` | `{mensaje}` |
| POST | `/auth/invitacion/:token` | `{nombre, apellido, password}` | `{token, usuario}` |

### Usuarios y organización (autenticados)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/usuarios/me` | Perfil propio |
| PUT | `/usuarios/me` | Editar perfil propio |
| PUT | `/usuarios/me/password` | Cambiar contraseña logueado |
| GET | `/organizacion` | Datos de mi organización |
| PUT | `/organizacion` | Editar nombre de organización |
| GET | `/organizacion/miembros` | Lista de admins de la org |
| POST | `/organizacion/invitaciones` | Enviar invitación (`{email_destino}`) |

### Recintos (autenticados)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/recintos` | Lista recintos de mi org |
| POST | `/recintos` | Crear recinto |
| GET | `/recintos/:id` | Detalle de recinto |
| PUT | `/recintos/:id` | Editar recinto |
| DELETE | `/recintos/:id` | Eliminar recinto |
| GET | `/recintos/:id/zonas` | Zonas del recinto |
| PUT | `/recintos/:id/zonas` | Guardar/actualizar zonas (batch) |

### Videos y análisis (autenticados)

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/recintos/:id/videos` | Upload MP4 (multipart/form-data) |
| GET | `/videos/:id/estado` | Polling de estado del procesamiento |
| GET | `/videos/:id/metricas` | Métricas calculadas |
| GET | `/videos/:id/detecciones` | Puntos individuales para heatmap |
| GET | `/recintos/:id/videos` | Historial de análisis del recinto |
| DELETE | `/videos/:id` | Eliminar análisis |

### Códigos HTTP estándar

- `200 OK` — éxito con contenido
- `201 Created` — recurso creado
- `400 Bad Request` — datos inválidos
- `401 Unauthorized` — sin token o token inválido
- `403 Forbidden` — token válido pero sin permiso sobre el recurso
- `404 Not Found` — recurso no existe o no pertenece a la org
- `409 Conflict` — email duplicado en registro
- `500 Internal Server Error` — error no controlado

## 7. Stack técnico consolidado

### Backend (Spring Boot 3 + Java 17)

**Nuevas dependencias a agregar al `pom.xml`**:
- `spring-boot-starter-security`
- `spring-boot-starter-mail`
- `spring-boot-starter-validation`
- `io.jsonwebtoken:jjwt-api`, `jjwt-impl`, `jjwt-jackson` (v0.12.x)

**Configuración de seguridad**:
- JWT stateless, secret en variable de entorno `JWT_SECRET`
- BCrypt strength 10
- CORS habilitado para el origen del frontend
- Filtro JWT en todas las rutas `/api/**` excepto `/api/auth/**`

### Frontend (React 18)

**Nuevas dependencias**:
- `react-router-dom@6.x` (rutas protegidas)
- `axios` o `ky` (interceptor de token)
- `react-hook-form` + `zod` (validación de forms)
- `jwt-decode` (leer payload del token en cliente)

**Estructura de autenticación**:
- `AuthContext` provee `{user, login, logout, register}` a toda la app
- `ProtectedRoute` component que redirige a `/login` si no hay token
- Token guardado en `localStorage` con key `flowsense_token`

### Envío de email

- Servicio: Gmail SMTP con contraseña de aplicación (free tier) O Mailtrap en dev
- Variables: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`
- Templates HTML simples para reset password e invitación

## 8. Replanificación de sprints

### Sprint 2 (actual) — Pipeline core + Auth básica

- HU-01 Upload video + detección
- **HU-11 Registro** (nueva)
- **HU-12 Login** (nueva)
- **HU-13 JWT + rutas protegidas** (nueva)

### Sprint 3 — Frontend visual

- HU-02, HU-03, HU-04 (sin cambios)

### Sprint 4 — Admin features + Auth avanzada

- HU-05, HU-06, HU-07, HU-08, HU-09 (sin cambios)
- **HU-14, HU-15, HU-16, HU-17, HU-18, HU-19, HU-20** (nuevas)

### Sprint 5 — Cierre (sin cambios)

## 9. Restricciones éticas y legales (no negociables)

Estas restricciones aplican a todo el sistema y deben respetarse en toda implementación:

- **Nunca** almacenar imágenes de personas. Los frames se procesan en RAM y se descartan.
- **Nunca** implementar reconocimiento facial ni tracking individual entre frames.
- Contraseñas **siempre** con BCrypt, nunca texto plano, nunca MD5/SHA1.
- Tokens de reset/invitación expiran en máximo 24 horas.
- Cumplimiento Ley 19.628 y Ley 21.719 de Chile: sin biometría, sin datos personales identificables en métricas.
- JWT con secret robusto (mínimo 256 bits) en variable de entorno, nunca hardcoded.
- HTTPS obligatorio en producción (lo provee Railway/Vercel automáticamente).
