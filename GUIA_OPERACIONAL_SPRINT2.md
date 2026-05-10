# Guía operacional — Claude Code para FlowSense Sprint 2

Esta guía te dice exactamente qué hacer desde VS Code para commitear el contexto y luego desarrollar el Sprint 2 (pipeline Python + backend Spring Boot) con Claude Code según la carta Gantt.

## Fase 0 — Limpieza del repo (antes de cualquier otra cosa)

Tienes archivos legacy en la raíz que confunden a Claude Code. Esto se hace **primero** porque si Claude Code lee estos archivos pensando que son oficiales, se va a confundir.

### Archivos a mover o eliminar

Desde la raíz del repo (`F:\5.Flowsense\FLOWSENSE`):

```powershell
# Opción 1: borrarlos si ya no los necesitas (recomendado)
Remove-Item main.py, tracker.py, coco.txt, yolov8s.pt, video.zip
Remove-Item -Recurse __pycache__

# Opción 2: moverlos a una carpeta de scratch si quieres conservarlos
New-Item -ItemType Directory -Path .\_legacy_scratch -Force
Move-Item main.py, tracker.py, coco.txt, yolov8s.pt, video.zip .\_legacy_scratch\
Move-Item __pycache__ .\_legacy_scratch\
```

### Archivos a mover de raíz a su lugar correcto

Tienes `requirements.txt` en la raíz y otro en `/Producto/python/`. El de la raíz debería eliminarse o reemplazarse por uno que coordine el proyecto completo. Lo mismo con el `README.md` de la raíz, que debe ser la portada general.

### Actualizar .gitignore

Agregar a `.gitignore` en la raíz:

```
# Videos de prueba (grandes, no versionar)
video/*.mp4
video/*.avi
video/*.mov

# Modelos YOLO (se descargan automáticamente)
*.pt

# Python
__pycache__/
*.pyc
.venv/
venv/

# Archivos legacy
_legacy_scratch/

# Variables de entorno
.env
.env.local

# IDE
.idea/
.vscode/settings.json
```

## Fase 1 — Commitear el paquete de contexto

### Paso 1.1: Crear rama desde develop

Abre VS Code en la raíz del repo. Terminal integrado:

```powershell
git checkout develop
git pull origin develop
git checkout -b chore/claude-context-y-alcance
```

### Paso 1.2: Copiar los archivos del paquete

Extrae el ZIP que te entregué (`flowsense-claude-context-v2.zip`) y copia los archivos así:

| Archivo del ZIP | Destino en tu repo |
|---|---|
| `CLAUDE.md` | `F:\5.Flowsense\FLOWSENSE\CLAUDE.md` |
| `ALCANCE_COMPLETO.md` | `F:\5.Flowsense\FLOWSENSE\ALCANCE_COMPLETO.md` |
| `Producto/python/CLAUDE.md` | `F:\5.Flowsense\FLOWSENSE\Producto\python\CLAUDE.md` |
| `Producto/backend/CLAUDE.md` | `F:\5.Flowsense\FLOWSENSE\Producto\backend\CLAUDE.md` |
| `Producto/frontend/CLAUDE.md` | `F:\5.Flowsense\FLOWSENSE\Producto\frontend\CLAUDE.md` |
| `Producto/database/CLAUDE.md` | `F:\5.Flowsense\FLOWSENSE\Producto\database\CLAUDE.md` |

### Paso 1.3: Primer commit — limpieza

```powershell
git add .gitignore
git add -u  # para registrar archivos eliminados
git commit -m "limpia archivos legacy de la raiz y actualiza gitignore"
```

### Paso 1.4: Segundo commit — contexto

```powershell
git add CLAUDE.md ALCANCE_COMPLETO.md
git add Producto/python/CLAUDE.md Producto/backend/CLAUDE.md Producto/frontend/CLAUDE.md Producto/database/CLAUDE.md
git commit -m "agrega documentos de contexto para Claude Code y alcance completo del proyecto"
```

### Paso 1.5: Push y PR

```powershell
git push origin chore/claude-context-y-alcance
```

Abre GitHub, crea el PR a `develop`, revísalo con el equipo, mergea.

### Paso 1.6: Sincronizar ramas feature activas

Si tu equipo ya tiene ramas feature activas (ej. `feature/python-detector`), cada miembro debe rebasear:

```powershell
git checkout feature/python-detector
git fetch origin
git rebase origin/develop
# Si hay conflictos (poco probable porque los CLAUDE.md son nuevos), resolverlos
git push --force-with-lease
```

## Fase 2 — Instalar y configurar Claude Code en VS Code

### Paso 2.1: Instalar la extensión

1. Abre VS Code.
2. Ve a Extensions (`Ctrl+Shift+X`).
3. Busca "Claude Code" (de Anthropic).
4. Instala.
5. Reinicia VS Code.

### Paso 2.2: Autenticación

Al primer uso te pide login con tu cuenta Anthropic. Sigue las instrucciones del navegador.

### Paso 2.3: Abrir el proyecto

Abre la carpeta raíz del repo: `File > Open Folder > F:\5.Flowsense\FLOWSENSE`.

Claude Code detecta automáticamente los `CLAUDE.md` en la raíz y en subcarpetas. No necesitas configurar nada.

## Fase 3 — Trabajar el Sprint 2 con Claude Code

Aquí viene lo importante: **cómo le hablas a Claude Code para que trabaje por ti respetando la carta Gantt**.

### Principio 1: Una tarea, una rama, una conversación

No le pidas a Claude Code "construye todo el Sprint 2". Divide por feature branch y dale una tarea clara por conversación. Así:

| Tarea | Rama | Responsable |
|---|---|---|
| Esqueleto de detector.py | `feature/python-detector` | Fernando Tapia |
| Esquema SQL de auth | `feature/database-auth` | Octavio |
| Endpoints de auth | `feature/backend-auth` | Fernando Tapia |
| Endpoint de upload y orquestación | `feature/backend-upload-pipeline` | Fernando Tapia |
| Login frontend | `feature/frontend-login` | Fernando H. |

### Principio 2: El prompt inicial debe citar el contexto que Claude debe respetar

Claude Code lee los CLAUDE.md automáticamente, pero un prompt explícito refuerza lo importante para tu tarea específica.

### Principio 3: Trabaja iterativamente, no de una

Primero pide un esqueleto, valida que compile, después pide la implementación de cada parte. Evita generar 500 líneas en un solo shot — es más difícil de revisar y más propenso a errores.

---

## Prompts concretos para el Sprint 2

### Tarea A — `detector.py` (Python / YOLOv8)

**Rama**: `feature/python-detector`

**Setup en terminal**:
```powershell
git checkout develop
git pull
git checkout -b feature/python-detector
cd Producto/python
```

**Abrir Claude Code en esa carpeta** y pegar:

```
Estoy trabajando en la rama feature/python-detector del proyecto FlowSense.

Necesito implementar detector.py desde cero, siguiendo estrictamente las 
reglas de /Producto/python/CLAUDE.md que ya leíste:

- Contrato de invocación exacto con argumentos CLI (--video, --output, 
  --zonas, --fps, --conf, --iou, --imgsz)
- Formato del CSV de salida con las columnas especificadas
- Filtros obligatorios antes de escribir al CSV
- Resumen JSON por stdout al terminar
- Modelo cargado una sola vez fuera del bucle
- Respeto a todas las restricciones éticas (nunca guardar imágenes)

Estructura modular según lo definido en el CLAUDE.md:
- src/cli.py
- src/detector_core.py
- src/zonas.py
- src/filtros.py
- src/output.py
- detector.py (orquestador delgado)

Empieza por el esqueleto con firmas de funciones y docstrings. No implementes 
todavía la lógica YOLO real; usa un stub que devuelva detecciones dummy para 
que pueda probar el flujo end-to-end sin dependencias pesadas. Después del 
esqueleto te pido la implementación real.

También actualiza requirements.txt con las versiones exactas que pide el 
CLAUDE.md.
```

Cuando te entregue el esqueleto, valida que corre con un JSON dummy de zonas, y recién ahí le pides:

```
Perfecto, el esqueleto funciona. Ahora implementa la detección real en 
src/detector_core.py usando ultralytics YOLOv8n. Respeta los parámetros 
por defecto del CLAUDE.md y asegúrate de que el modelo se cargue una sola 
vez fuera del bucle de frames.
```

### Tarea B — Esquema SQL de autenticación

**Rama**: `feature/database-auth`

**Prompt**:

```
Estoy en la rama feature/database-auth del proyecto FlowSense.

Necesito crear los scripts SQL de migración para las tablas nuevas de 
autenticación, siguiendo exactamente el esquema de /Producto/database/CLAUDE.md:

- ORGANIZACIONES
- USUARIOS  
- TOKENS_AUTH
- Modificar RECINTOS para agregar id_organizacion (FK) y los otros campos 
  nuevos (tipo, direccion, fecha_creacion)

Formato: archivos Flyway en Producto/database/migrations/
- V1__tablas_base.sql (RECINTOS, ZONAS, VIDEOS, DETECCIONES, METRICAS 
  según el CLAUDE.md, con los campos actualizados)
- V2__auth_tables.sql (ORGANIZACIONES, USUARIOS, TOKENS_AUTH)
- V3__indices_rendimiento.sql (los índices que el CLAUDE.md marca como críticos)

Todas las tablas InnoDB con charset utf8mb4. Respeta los ON DELETE 
especificados en el CLAUDE.md.

Además, actualiza Producto/database/schema.sql (el archivo existente) para 
que refleje el estado final del esquema completo en un solo archivo de 
referencia, útil para que el equipo vea el MER sin leer migración por migración.
```

### Tarea C — Endpoints de autenticación (Spring Boot)

**Rama**: `feature/backend-auth`

**Prompt**:

```
Estoy en la rama feature/backend-auth del proyecto FlowSense.

Necesito implementar los endpoints de autenticación en Spring Boot según 
/Producto/backend/CLAUDE.md:

Endpoints del Sprint 2:
- POST /api/auth/registro
- POST /api/auth/login

Componentes a crear siguiendo la estructura del CLAUDE.md:
- auth/AuthController, AuthService, JwtService, JwtAuthFilter + DTOs
- usuarios/Usuario (entidad), UsuarioRepository + DTOs
- organizaciones/Organizacion (entidad), OrganizacionRepository
- config/SecurityConfig

Requisitos específicos:
- BCrypt strength 10
- JWT HS256, payload con id_usuario, email, id_organizacion, rol, exp
- Filtro JWT aplicado a /api/** EXCEPTO /api/auth/**
- CORS habilitado para VITE_FRONTEND_URL (variable de entorno)
- Validación con Bean Validation en DTOs
- JwtAuthFilter responde 401 con JSON estructurado si el token es inválido
- Al hacer registro, crear automáticamente una ORGANIZACION nueva y asociar 
  el usuario
- Agregar las dependencias JJWT (0.12.x), spring-security, spring-validation 
  al pom.xml

Agrega también un .env.example en la raíz del backend con las variables 
necesarias (JWT_SECRET, DB_*, etc.) usando valores dummy.

No implementes todavía recuperación de contraseña, invitaciones, ni email. 
Esos son Sprint 4.
```

### Tarea D — Endpoint de upload y orquestación del pipeline

**Rama**: `feature/backend-upload-pipeline`

**Prompt**:

```
Estoy en la rama feature/backend-upload-pipeline del proyecto FlowSense.

Necesito implementar el endpoint de upload de video y la orquestación 
completa del pipeline según /Producto/backend/CLAUDE.md:

Endpoints:
- POST /api/recintos/:id/videos (multipart/form-data)
- GET /api/videos/:id/estado
- GET /api/videos/:id/metricas
- GET /api/videos/:id/detecciones

Lógica de orquestación:
1. Upload guarda el MP4 en UPLOAD_DIR con UUID, crea fila en VIDEOS con 
   estado=PENDIENTE
2. Responde 201 con {video_id} inmediatamente (no bloquea el request)
3. Dispara procesamiento asíncrono con @Async:
   - Actualiza estado=PROCESANDO
   - Exporta las zonas del recinto a JSON en ZONES_DIR
   - Invoca Python vía ProcessBuilder con los argumentos correctos
   - Timeout 10 minutos; si no termina, mata proceso y marca ERROR
   - Captura stdout, parsea la última línea JSON con el resumen
   - Lee el CSV con BufferedReader, INSERT batch en DETECCIONES
   - Ejecuta el SQL de cálculo de agregados (el que está en el CLAUDE.md de 
     database) para poblar METRICAS
   - Actualiza estado=COMPLETADO con frames_procesados y duracion_proceso_seg
4. Manejo de errores: cualquier excepción marca el video como ERROR con 
   mensaje descriptivo

Todas las queries deben filtrar por id_organizacion del usuario logueado 
(multi-tenancy).

Además: un @Scheduled o un listener al startup que busca videos en estado 
PROCESANDO con más de 10 minutos de antigüedad y los marca ERROR (para 
limpiar procesos huérfanos tras reinicios del servidor).

Usa los paths de variable de entorno definidos en el CLAUDE.md del backend 
(PYTHON_BIN, PYTHON_SCRIPT, UPLOAD_DIR, RESULTS_DIR, ZONES_DIR).
```

### Tarea E — Login frontend

**Rama**: `feature/frontend-login`

**Prompt**:

```
Estoy en la rama feature/frontend-login del proyecto FlowSense.

Necesito implementar el flujo de autenticación en React según 
/Producto/frontend/CLAUDE.md:

Vistas a implementar (Sprint 2):
- /login
- /registro
- / (landing simple con CTA a login/registro)

Infraestructura de autenticación:
- src/auth/AuthContext.jsx con provider global
- src/auth/useAuth.js hook
- src/auth/ProtectedRoute.jsx componente
- src/api/client.js con axios + interceptor de token JWT + interceptor de 
  response que redirige a /login en 401
- src/api/auth.js con funciones login(), register()

Stack a agregar al package.json:
- react-router-dom@6.x
- axios
- react-hook-form + @hookform/resolvers + zod
- jwt-decode

La vista /login usa react-hook-form con zod para validar email (formato 
válido) y password (mínimo 8 caracteres). Al hacer submit, llama al endpoint 
/api/auth/login, guarda el token en localStorage con key flowsense_token, 
actualiza el AuthContext y redirige a /app.

La vista /registro pide email, password, nombre, apellido, nombre_organizacion 
(opcional). Validaciones con zod. Al enviarse exitosamente, guarda el token 
y redirige a /app.

No implementes todavía las rutas /app/* — solo prepara el ProtectedRoute y 
deja un placeholder en /app que diga "Dashboard (en construcción)" para 
verificar que la redirección funciona.

Respeta las convenciones de código del CLAUDE.md del frontend: textos en 
español, imports ordenados, sin inline styles, loading state en botones de 
submit.
```

## Buenas prácticas al conversar con Claude Code

### Al iniciar una sesión

Siempre dile a Claude Code en qué rama estás y qué archivos específicos leyó. Ejemplo:

> "Estoy en la rama feature/python-detector. Antes de empezar, confirma que leíste /CLAUDE.md, /ALCANCE_COMPLETO.md y /Producto/python/CLAUDE.md."

### Cuando algo no calza con tu contexto

Si Claude Code propone algo que contradice los CLAUDE.md, córrígelo explícitamente:

> "Eso contradice la sección X del CLAUDE.md de /Producto/backend. Revisa antes de continuar."

### Al terminar una tarea

Antes de commitear, pídele que:

> "Antes de commitear, ejecuta las validaciones: compilación, tests si hay, y lee los archivos que modificaste para verificar que respetan las convenciones del CLAUDE.md."

### Commit y PR

Los commits los puede hacer Claude Code automáticamente, pero **siempre revisa el diff antes de push**. Pídele:

> "Muéstrame el git diff antes de commitear y explícame cada cambio significativo."

## Orden recomendado de ejecución del Sprint 2

Dado que tienes dependencias entre las tareas, este es el orden que minimiza bloqueos:

1. **Fase 0 y 1**: limpieza y commit del contexto. Bloquea a todos hasta mergear.
2. **En paralelo**:
   - Tarea B (SQL auth) — Octavio
   - Tarea A (detector.py esqueleto) — Fernando Tapia
3. **Cuando B está mergeada a develop**:
   - Tarea C (backend auth) — Fernando Tapia
   - Tarea E (frontend login) — Fernando H. (puede trabajar con mocks mientras el backend no está listo)
4. **Cuando A y C están mergeadas**:
   - Tarea D (upload + orquestación) — Fernando Tapia
5. **Integración final del Sprint 2**:
   - Prueba end-to-end: registro → login → upload de uno de los videos de 15 min → polling → métricas en BD
   - Demo para el Sprint Review

Tiempo estimado con 9 horas/semana por integrante: 2 semanas (lo que marca la carta Gantt para Sprint 2).

## Qué NO hacer

- **No** ejecutar Claude Code en la rama `main` o `develop` directamente. Siempre en feature branches.
- **No** aceptar cambios de Claude Code sin leer el diff.
- **No** pedirle que modifique archivos en `/Documentacion` salvo que sea una tarea específica de docs (esos archivos los controla el equipo, no la IA).
- **No** darle acceso a hacer push directo a `develop` o `main`. Siempre PR.
- **No** pegarle partes de los PDFs del proyecto como contexto en cada sesión. Ya están en los CLAUDE.md; si falta algo, agrégalo a los CLAUDE.md, no al prompt puntual.
