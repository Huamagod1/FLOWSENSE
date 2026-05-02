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
