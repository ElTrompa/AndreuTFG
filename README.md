# 🚴‍♂️ TFGandreu — Aplicación de Análisis de Entrenamiento Ciclista

## 📌 Descripción del proyecto

RideMetrics es una aplicación móvil multiplataforma orientada al análisis y mejora del rendimiento ciclista, integrada con la API de Strava. Permite visualizar entrenamientos con estadísticas detalladas, analizar la carga de entrenamiento semanal y generar proyecciones de rendimiento futuro como el kilometraje anual estimado.

Este proyecto se desarrolla como parte del Proyecto Intermodular 2 del ciclo formativo de grado superior en Desarrollo de Aplicaciones Multiplataforma (DAM) en Florida Campus Alzira.

## 🎯 Objetivos

- Integrar datos reales de entrenamientos mediante Strava.
- Visualizar métricas deportivas de forma clara e intuitiva.
- Analizar forma física, fatiga y carga de entrenamiento.
- Generar proyecciones de rendimiento a medio y largo plazo.
- Aplicar arquitectura backend + frontend real.
- Trabajar bajo metodología SCRUM.
- Desplegar una aplicación completa en entorno cloud.
- Documentar el proyecto de forma profesional.

## 🧠 Motivación

Muchas plataformas actuales de análisis deportivo ofrecen métricas avanzadas solo bajo suscripción. Este proyecto busca ofrecer una alternativa:

- Gratuita
- Intuitiva
- Multiplataforma
- Orientada a la mejora continua del deportista

## 🏗 Alcance del proyecto (contexto académico)

Este proyecto cumple los requisitos técnicos del Proyecto Intermodular DAM:

### Backend

- API REST propia
- Autenticación y autorización
- Operaciones CRUD
- Persistencia en base de datos
- Configuración por archivo `.env`
- Despliegue en la nube

### Frontend

- Aplicación móvil desarrollada con React Native
- Interfaz adaptable a móvil y tablet
- Diseño previo con Figma

### Requisitos comunes

- Uso de GitHub
- Metodología SCRUM
- Gestión del proyecto con Trello
- Desarrollo en inglés (app)
- Entorno dockerizado

## 🛠 Tecnologías utilizadas

**Frontend**

- React Native
- TypeScript
- Expo / CLI

**Backend**

- Node.js
- Express.js
- API REST

**Base de datos**

- MySQL

**Infraestructura**

- Docker
- Docker Compose

**APIs externas**

- Strava API (OAuth 2.0)

**Herramientas**

- Git & GitHub
- Trello
- Figma

## 🧩 Arquitectura

```
[ App React Native ]
        |
[ Backend API REST ]
        |
[ Base de datos ] — [ Strava API ]
```

## 🚀 Funcionalidades

- 🔐 Autenticación OAuth con Strava
- 📊 Visualización de entrenamientos
- 📈 Gráficas de progreso semanal y mensual
- 🧮 Análisis de forma física y carga de entrenamiento
- 🔮 Proyección de rendimiento anual
- 📱 Interfaz optimizada para dispositivos móviles

Visualización de vatios por rangos (5s, 15s, 30s, 1min, 2min, 5min, 10min, 15min, 20min, 30min, 45min, 60min, 2h) en forma hexagonal.

## 📦 Instalación

### Requisitos previos

- Node.js ≥ 18
- Docker y Docker Compose
- Cuenta de desarrollador en Strava

### Instalación local

```bash
git clone https://github.com/usuario/TFGandreu.git
cd TFGandreu
```

Backend

```bash
cd backend
npm install
npm run dev
```

Frontend

```bash
cd frontend
npm install
npm start
```

### 🐳 Instalación con Docker

```bash
docker-compose up --build
```

## 🔑 Configuración

Crear un archivo `.env` en la carpeta `backend` con las siguientes variables (ejemplo):

```
STRAVA_CLIENT_ID=xxxx
STRAVA_CLIENT_SECRET=xxxx
STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback
JWT_SECRET=supersecret
DB_URL=database_url
```

## 📚 Uso

1. Iniciar la aplicación.
2. Iniciar sesión con Strava.
3. Autorizar el acceso a los entrenamientos.
4. Consultar estadísticas y proyecciones desde el panel principal.

## 📂 Estructura del proyecto

```
TFGandreu/
├── frontend/
├── backend/
├── docker-compose.yml
├── README.md
└── docs/
    └── documentación técnica
```

## 🧪 Testing

```bash
npm test
```

(Opcional: Jest / Detox)

## 🧭 Metodología

- Metodología SCRUM
- Gestión de tareas con Trello
- Control de versiones con GitHub
- Desarrollo iterativo por sprints

## 🎨 Paleta principal — RideMetrics / Cycling Performance

### 🔵 Color primario (acción / marca)

- Nombre: Electric Blue
- Hex: `#1E88E5`
- Uso: Botones principales, enlaces, acentos activos

### 🟢 Color secundario (rendimiento / salud)

- Nombre: Performance Green
- Hex: `#2ECC71`
- Uso: Métricas positivas, progreso, estados óptimos

### 🟠 Color de énfasis (esfuerzo / intensidad)

- Nombre: Power Orange
- Hex: `#F39C12`
- Uso: Zonas de esfuerzo, alertas suaves, picos de potencia

### 🖤 Neutrales (UI limpia tipo dashboard deportivo)

- Fondo claro: `#F6F8FA`
- Tarjetas: `#FFFFFF`
- Texto principal: `#1F2933`
- Texto secundario: `#6B7280`
- Bordes/divisores: `#E5E7EB`

### 🚦 Semánticos (estados)

- Éxito: `#2ECC71`
- Advertencia: `#F39C12`
- Error: `#E74C3C`
- Info: `#1E88E5`

### 🌙 Modo oscuro (opcional recomendado)

- Fondo principal: `#0F172A`
- Tarjetas: `#1E293B`
- Texto principal: `#F8FAFC`
- Texto secundario: `#94A3B8`
- Primario: `#38BDF8`
- Secundario: `#4ADE80`

## 📈 Roadmap

- Autenticación Strava
- Visualización de entrenamientos
- Análisis de carga semanal
- Proyecciones de rendimiento
- Mejora UX/UI
- Despliegue cloud
- Vídeo promocional
