#  TFGandreu  Aplicación de Análisis de Entrenamiento Ciclista

##  Descripción

TFGandreu (RideMetrics) es una aplicación móvil multiplataforma para el análisis y la mejora del rendimiento ciclista, integrada con la API de Strava. Permite visualizar entrenamientos, analizar la carga semanal y generar proyecciones de rendimiento (por ejemplo, kilometraje anual estimado).

Proyecto desarrollado como parte del Proyecto Intermodular 2 del ciclo formativo de grado superior en Desarrollo de Aplicaciones Multiplataforma (DAM) en Florida Campus Alzira.

##  Objetivos

- Integrar datos reales de entrenamientos mediante Strava.
- Visualizar métricas deportivas de forma clara e intuitiva.
- Analizar forma física, fatiga y carga de entrenamiento.
- Generar proyecciones de rendimiento a medio y largo plazo.
- Aplicar una arquitectura backend + frontend real.
- Trabajar bajo metodología SCRUM y documentar el proyecto profesionalmente.

##  Motivación

Muchas plataformas avanzadas son de pago. Este proyecto busca ofrecer una alternativa gratuita, intuitiva, multiplataforma y orientada a la mejora continua del deportista.
#  TFGandreu  Aplicación de Análisis de Entrenamiento Ciclista

##  Descripción

TFGandreu (RideMetrics) es una aplicación móvil multiplataforma para el análisis y la mejora del rendimiento ciclista, integrada con la API de Strava. Permite visualizar entrenamientos, analizar la carga semanal y generar proyecciones de rendimiento (por ejemplo, kilometraje anual estimado).

Proyecto desarrollado como parte del Proyecto Intermodular 2 del ciclo formativo de grado superior en Desarrollo de Aplicaciones Multiplataforma (DAM) en Florida Campus Alzira.

##  Objetivos

- Integrar datos reales de entrenamientos mediante Strava.
- Visualizar métricas deportivas de forma clara e intuitiva.
- Analizar forma física, fatiga y carga de entrenamiento.
- Generar proyecciones de rendimiento a medio y largo plazo.
- Aplicar una arquitectura backend + frontend real.
- Trabajar bajo metodología SCRUM y documentar el proyecto profesionalmente.

##  Motivación

Muchas plataformas avanzadas son de pago. Este proyecto busca ofrecer una alternativa gratuita, intuitiva, multiplataforma y orientada a la mejora continua del deportista.

##  Alcance (contexto académico)

El proyecto cumple los requisitos técnicos del Proyecto Intermodular DAM:

- Backend: API REST, autenticación/autorización, CRUD, persistencia (MySQL), configuración via `.env`, despliegue en la nube.
- Frontend: App móvil con React Native + Expo (TypeScript), diseño adaptable móvil/tablet, prototipado en Figma.
- Requisitos comunes: GitHub, SCRUM, Trello, desarrollo en inglés (app), entorno dockerizado.

##  Tecnologías

- Frontend: React Native, TypeScript, Expo
- Backend: Node.js, Express.js, MySQL
- Infra: Docker, Docker Compose
- APIs externas: Strava API (OAuth 2.0)
- Herramientas: GitHub, Trello, Figma

##  Arquitectura

App React Native  Backend API REST  Base de datos (MySQL)  Strava API

##  Funcionalidades principales

- Autenticación OAuth con Strava (y opción manual de token para un único usuario)
- Visualización de entrenamientos y métricas
- Gráficas de progreso (semanal/mensual)
- Análisis de carga y forma física
- Proyección de rendimiento anual
- Visualización de potencias por duraciones (5s  2h) en formato hexagonal

##  Instalación

### Requisitos
- Node.js  18
- Docker & Docker Compose (opcional)
- Cuenta de desarrollador en Strava (para integración completa)

### Instalación local

```powershell
git clone https://github.com/usuario/TFGandreu.git
cd TFGandreu

# Backend
cd backend
npm install
npm run dev

# Frontend (en otra terminal)
cd ../frontend
npm install
npm run start
```

### Con Docker

```powershell
docker-compose up --build
```

##  Configuración

Crear un archivo `.env` en `backend/` con las siguientes variables (ejemplo):

```env
STRAVA_CLIENT_ID=xxxx
STRAVA_CLIENT_SECRET=xxxx
STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback
JWT_SECRET=supersecret
DB_URL=mysql://user:pass@host:3306/dbname
PORT=3000
```

##  Uso

1. Inicia el backend y frontend.
2. Inicia sesión con Strava (o usa el flujo manual de token para un único usuario).
3. Autoriza el acceso a los entrenamientos.
4. Consulta estadísticas y proyecciones desde el panel principal.

##  Estructura del proyecto

```
TFGandreu/
 frontend/
 backend/
 docker-compose.yml
 README.md
```

##  Testing

```powershell
npm test
```

(Opcional: Jest / Detox)

##  Metodología

- Metodología SCRUM
- Gestión con Trello
- Control de versiones con GitHub

##  Roadmap

- Autenticación Strava
- Visualización de entrenamientos
- Análisis de carga semanal
- Proyecciones de rendimiento
- Mejora UX/UI
- Despliegue en la nube
- Vídeo promocional

---

##  Paleta de colores (diseño)

###  Neutrales (UI limpia tipo dashboard deportivo)

Uso | Color
:---|:-----
Fondo claro | `#F6F8FA`
Tarjetas | `#FFFFFF`
Texto principal | `#1F2933`
Texto secundario | `#6B7280`
Bordes / divisores | `#E5E7EB`

###  Semánticos (estados)

Estado | Color
:---|:-----
Éxito | `#2ECC71`
Advertencia | `#F39C12`
Error | `#E74C3C`
Info | `#1E88E5`

###  Modo oscuro (opcional recomendado)

Uso | Color
:---|:-----
Fondo principal | `#0F172A`
Tarjetas | `#1E293B`
Texto principal | `#F8FAFC`
Texto secundario | `#94A3B8`
Primario | `#38BDF8`
Secundario | `#4ADE80`


Si quieres que adapte componentes o un tema global con estas variables (React Native / Expo Theme), dime y creo el archivo de tema y un ejemplo de uso en `frontend/`.

## UI — Logo and theme integration

- Se ha añadido un logo en `frontend/assets/logo.svg` y un archivo de tema `frontend/theme.ts` con la paleta de colores definida.
- `App.tsx` ya usa el logo y las variables de color para que la interfaz tenga coherencia visual con el diseño del proyecto.

Comandos para probar rápido (desde la carpeta `frontend`):

```powershell
npm install
npm run start
```

Si quieres que adapte más pantallas (lista de actividades, detalle con mapa y streams), dime qué vista hago primero.
