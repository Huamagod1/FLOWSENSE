
Readme · MD
# FlowSense 🚶‍♂️📊
 
> Optimización de precios de arriendo en espacios comerciales mediante visión computacional.
 

 
FlowSense analiza videos de cámaras de espacios comerciales (malls, galerías, ferias) usando inteligencia artificial para medir el flujo peatonal por zona y entregar una **recomendación de precio de arriendo objetiva**, basada en datos reales de tráfico y permanencia en lugar de la intuición del administrador.
 
Proyecto académico — **DuocUC · TPY1101**.
 
## 🎯 El problema
 
Hoy, los administradores de centros comerciales fijan los precios de arriendo de sus locales **por percepción**: creen que un pasillo se ve más transitado y le asignan un precio mayor, pero no tienen datos objetivos que lo respalden.
 
**FlowSense** resuelve esto:
 
1. Detecta a las personas en un video grabado con **YOLOv8** y las sigue de forma anónima con **ByteTrack**.
2. Calcula métricas de tráfico, permanencia y comportamiento por zona.
3. Combina esas métricas en un **score de valor comercial** que multiplica el precio base para sugerir un precio diferenciado por zona.
---
 
## ✨ Características
 
- 🔐 **Autenticación segura** con JWT y aislamiento de datos por organización.
- 🏢 **Gestión de recintos** y definición interactiva de zonas sobre el video.
- 🎥 **Procesamiento offline** de videos: funciona con cámaras existentes, sin GPU.
- 👥 **Detección y tracking anónimo** de personas (YOLOv8 + ByteTrack).
- 📊 **Dashboard analítico** con 5 vistas: validación, resumen, recomendación de precio, análisis detallado (mapa de calor) y flujo de trayectorias.
- 💰 **Recomendación de precio** automática por zona basada en un score compuesto.
- 🔒 **Privacidad por diseño**: nunca se almacenan imágenes de personas, solo coordenadas numéricas.
---
 
## 🏗 Arquitectura
 
FlowSense está organizado en cuatro capas desacopladas:
 
| Capa | Tecnología | Responsabilidad |
|------|-----------|-----------------|
| **Frontend** | React + Vite | Interfaz del administrador: carga de videos, dibujo de zonas y visualización. |
| **Backend** | Spring Boot (Java) | Orquestación del pipeline, autenticación, cálculo de métricas y precios. |
| **Visión IA** | Python + YOLOv8 + ByteTrack | Detección de personas frame a frame y seguimiento de trayectorias. |
| **Persistencia** | MySQL + Flyway | Almacenamiento de usuarios, zonas, detecciones y métricas. |
 
**Flujo:** el administrador sube un video → el backend invoca el detector de Python como subproceso → Python genera un CSV con las detecciones → el backend calcula las métricas y las persiste → el frontend visualiza los resultados.
 
---
 
## 🛠 Stack tecnológico
 
### Visión IA
- **Python 3.12** · YOLOv8 (Ultralytics 8.3) · ByteTrack · OpenCV (headless) 4.10 · NumPy 1.26
### Backend
- **Java 21** · Spring Boot 3.5.13 · Spring Data JPA · Spring Security · JWT (jjwt 0.12.3) · Flyway
### Frontend
- **React 19** · Vite · Ant Design 6 · React Router 7 · Recharts · Konva / React-Konva · Axios · jsPDF
### Infraestructura
- **MySQL 8.0** · Docker & Docker Compose · Maven
---
 
## 📦 Requisitos previos
 
Solo necesitas tener instalado:
 
- [Docker](https://www.docker.com/) y Docker Compose
No es necesario instalar Java, Python, Node ni MySQL localmente: todo corre dentro de contenedores. Los modelos de YOLOv8 se descargan automáticamente la primera vez.
 
---
 
## 🚀 Instalación y ejecución
 
### 1. Clonar el repositorio
 
```bash
git clone https://github.com/Huamagod1/FLOWSENSE.git
cd FLOWSENSE
```
 
### 2. Configurar variables de entorno (opcional)
 
El proyecto arranca con valores por defecto de desarrollo, pero puedes personalizar las credenciales creando un archivo `.env` en la raíz a partir de la plantilla:
 
```bash
cp .env.example .env
```
 
Contenido de `.env`:
 
```env
DB_ROOT_PASSWORD=tu_password_root
DB_NAME=flowsense
DB_USER=flowsense
DB_PASSWORD=tu_password
JWT_SECRET=un_string_aleatorio_de_minimo_32_caracteres
```
 
> 💡 Genera un `JWT_SECRET` seguro con: `openssl rand -hex 32`
 
### 3. Levantar todo con Docker Compose
 
Desde la **raíz del repositorio** (donde está el `docker-compose.yml`):
 
```bash
docker compose up
```
 
Para reconstruir las imágenes o correr en segundo plano:
 
```bash
docker compose up --build      # fuerza reconstrucción
docker compose up -d           # segundo plano
```
 
### 4. Acceder a la aplicación
 
| Servicio | URL |
|----------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend (API)** | http://localhost:8080/api |
| **MySQL** | `localhost:3307` |
 
> ℹ️ La base de datos se crea sola y **Flyway** aplica todas las migraciones automáticamente al arrancar el backend. No hay pasos manuales.
 
Para detener:
 
```bash
docker compose down            # detiene los contenedores
docker compose down -v         # detiene y borra los volúmenes (resetea la BD)
```
 
---
 
## 📁 Estructura del proyecto
 
El código fuente vive bajo la carpeta `Producto/`. La raíz contiene la documentación y la configuración de Docker.
 
```
FLOWSENSE/
├── docker-compose.yml          # orquestación de los 3 servicios
├── .env.example                # plantilla de variables de entorno
│
└── Producto/
    ├── python/                 # 🧠 Visión IA
    │   ├── detector.py         # orquestador principal
    │   ├── src/                # cli, detector_core, tracker...
    │   ├── tests/              # pruebas unitarias (pytest)
    │   ├── requirements.txt
    │   └── Dockerfile
    │
    ├── backend/                # ⚙️ API REST
    │   ├── src/main/java/cl/duoc/flowsense/
    │   ├── src/main/resources/
    │   │   ├── application.yml
    │   │   └── db/migration/   # migraciones Flyway (V1 … V12)
    │   ├── pom.xml
    │   └── Dockerfile
    │
    ├── frontend/               # 🖥 Interfaz React
    │   ├── src/                # pages, components, api, context, hooks
    │   ├── package.json
    │   └── Dockerfile
    │
    └── database/
        └── schema.sql          # referencia del esquema / MER
```
 
---
 
## 🧪 Pruebas
 
### Pruebas de visión (Python)
 
La suite de pruebas unitarias del módulo de visión está en `Producto/python/tests/` y se ejecuta con **pytest**:
 
```bash
cd Producto/python
pip install pytest          # pytest no está en requirements.txt
pytest
```
 
Archivos de prueba y qué cubren:
 
| Archivo | Qué valida |
|---------|-----------|
| `test_zonas.py` | Asignación de detecciones a zonas |
| `test_carga_zonas.py` | Carga y parseo de la definición de zonas |
| `test_deteccion_movimiento.py` | Regla de detención (persona quieta vs. en movimiento) |
| `test_metricas_tracking.py` | Cálculo de métricas de seguimiento |
| `test_confiabilidad.py` | Indicador de confiabilidad del análisis |
| `test_eventos.py` | Detección de eventos (entradas/salidas de zona) |
 
### Pruebas del backend (Maven)
 
```bash
cd Producto/backend
./mvnw test                 # Linux/macOS
mvnw.cmd test               # Windows
```
 
---
 
## 🗄 Base de datos
 
- **Motor:** MySQL 8.0
- **Nombre:** `flowsense` (en entorno Docker)
- **Migraciones:** gestionadas con **Flyway**, en `Producto/backend/src/main/resources/db/migration/`. Se aplican automáticamente al arrancar el backend (versiones `V1` a `V12`).
El esquema es **código versionado**: cualquier entorno reconstruye la base de datos de forma idéntica al iniciar, sin intervención manual.
 
### Respaldo de datos
 
```bash
docker exec flowsense-db mysqldump -u root -p flowsense > respaldo.sql
```
 
---
 
## 🔒 Privacidad
 
FlowSense está diseñado conforme a la legislación chilena de protección de datos (**Ley 19.628** y **Ley 21.719**):
 
- **No usa reconocimiento facial.** El tracking con ByteTrack es completamente anónimo.
- **No almacena imágenes de personas.** Solo se guardan coordenadas numéricas normalizadas.
- **Procesamiento offline:** no requiere transmisión de video en vivo.
---
 
## 👥 Equipo
 
Proyecto desarrollado para **TPY1101 · DuocUC**.
 
| Integrante | Rol |
|-----------|-----|
| **Fernando Huamanchumo** | Integración y coordinación |
| **Fernando Tapia** | Backend / Python |
| **Octavio Ibáñez** | Base de datos / QA |
 
---
 
## 📄 Licencia
 
Proyecto académico desarrollado con fines educativos en DuocUC. Uso no comercial.
 
---
 
<p align="center">
  <strong>FlowSense</strong> · Convirtiendo el tráfico peatonal en decisiones de precio inteligentes.
</p>
