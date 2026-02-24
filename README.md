# 🚴‍♂️ TFGandreu — Aplicación de Análisis de Entrenamiento Ciclista

## 📌 Descripción del proyecto

RideMetrics es una aplicación móvil multiplataforma orientada al análisis y mejora del rendimiento ciclista, integrada con la API de Strava. Proporciona analítica avanzada de ciclismo profesional que va más allá de lo que ofrece Strava, incluyendo:

- 🔥 **Analítica Avanzada**: TSS, TRIMP, sustrato energético (grasas/carbohidratos), VO2, eficiencia aeróbica
- 📊 **Performance Management Chart (PMC)**: Seguimiento de forma (CTL), fatiga (ATL) y frescura (TSB)
- ⚡ **Sistema de Niveles**: 10 niveles realistas con umbrales de potencia absolutos por duración
- 🏔️ **Análisis de Perfil**: Clasificación automática en Sprinter, Escalador o Rodador
- 📈 **Curva de Potencia**: Visualización hexagonal con potencias máximas en 13 duraciones

Este proyecto se desarrolla como parte del Proyecto Intermodular 2 del ciclo formativo de grado superior en Desarrollo de Aplicaciones Multiplataforma (DAM) en Florida Campus Alzira.

## 🎯 Objetivos

- Integrar datos reales de entrenamientos mediante Strava.
- Ofrecer analítica avanzada nivel TrainingPeaks/INSCYD de forma gratuita.
- Visualizar métricas deportivas con precisión científica.
- Analizar forma física, fatiga y carga de entrenamiento (PMC).
- Generar proyecciones de rendimiento a medio y largo plazo.
- Proporcionar recomendaciones de entrenamiento personalizadas.
- Aplicar arquitectura backend + frontend real.
- Trabajar bajo metodología SCRUM.
- Desplegar una aplicación completa en entorno cloud.
- Documentar el proyecto de forma profesional.

## 🧠 Motivación

Muchas plataformas actuales de análisis deportivo ofrecen métricas avanzadas solo bajo suscripción:

- **Strava Premium**: €80/año
- **TrainingPeaks**: €120/año  
- **INSCYD**: €500/año

Este proyecto busca ofrecer una alternativa:

- ✅ **Gratuita**
- ✅ **Analítica profesional** (TSS, PMC, sustrato energético)
- ✅ **Intuitiva** y multiplataforma
- ✅ **Orientada a la mejora** continua del deportista
- ✅ **Basada en ciencia** (estudios de Coggan, Banister)

## 🚀 Características Principales

### 📊 Performance Management Chart (PMC)

Sistema profesional de seguimiento de rendimiento:

- **CTL (Chronic Training Load)**: Forma a largo plazo (42 días)
- **ATL (Acute Training Load)**: Fatiga a corto plazo (7 días)
- **TSB (Training Stress Balance)**: Frescura (CTL - ATL)
- **Vistas**: Diaria, Semanal, Mensual
- **Recomendaciones**: Automáticas basadas en estado actual

Documentación completa: [`PMC_SYSTEM.md`](backend/PMC_SYSTEM.md)

### 🔥 Analítica Avanzada

Para cada actividad se calcula:

#### 1. Gasto Energético
- Calorías metabólicas reales (kJ / eficiencia)
- Ajuste por eficiencia mecánica personalizada

#### 2. Sustrato Energético
- **% Grasas vs Carbohidratos** con precisión
- **Gramos exactos** de CHO y grasa oxidados
- Método por IF (Intensity Factor) o por %FC reserva
- Curvas de intensidad fisiológicas

#### 3. Carga Interna
- **TSS** (Training Stress Score): No disponible en Strava
- **TRIMP** (Bannister): Carga fisiológica real
- Personalizado con FC max/rest y FTP

#### 4. Consumo de Oxígeno
- **VO2 estimado** durante sesión (ml/kg/min)
- **% VO2max** usado
- Tiempo en zona aeróbica

#### 5. Eficiencia Aeróbica
- **EF** (Efficiency Factor): NP / FC media
- **Aerobic Decoupling**: Detección de fatiga (>5% = fatiga)
- Comparación primera vs segunda mitad

#### 6. FatMax
- Zona de máxima oxidación de grasa (60-65% VO2max)
- Análisis de tiempo en zona óptima

#### 7. Métricas Relativas
- **W/kg promedio y normalizado**
- Clave para rendimiento en subida

#### 8. Depleción de Glucógeno
- Gramos de glucógeno usados
- % de reservas musculares
- Estrategia de recuperación

Documentación completa: [`ADVANCED_ANALYTICS.md`](backend/ADVANCED_ANALYTICS.md)

### ⚡ Sistema de Niveles Realista

10 niveles con umbrales absolutos de potencia por duración:

| Nivel | Nombre | 5s | 1m | 1h |
|-------|--------|----|----|-----|
| 1 | Principiante | 500W | 220W | 85W |
| 5 | Amateur Competitivo | 1200W | 480W | 245W |
| 10 | Prof. World Tour | 2200W | 820W | 450W |

- **13 duraciones** (5s, 15s, 30s, 1m, 2m, 3m, 5m, 10m, 15m, 20m, 30m, 45m, 1h)
- **Progreso preciso** hasta siguiente nivel
- **No relativo** al máximo personal

### 🏔️ Análisis de Perfil Ciclista

Clasificación automática basada en distribución de potencias:

- **⚡ Sprinter**: Explosividad en corta duración (5s-15s)
- **🏔️ Escalador**: Resistencia en media-larga duración (30m-1h)
- **🚴 Rodador**: Equilibrio en todas las duraciones (5m-20m)

Incluye:
- Descripción del perfil
- Fortalezas principales
- Áreas de mejora
- Emoji identificativo

### 📈 Curva de Potencia

Visualización hexagonal de potencias máximas en 13 duraciones:

- Normalización independiente por duración
- Tooltip mejorado con nivel actual
- Contraste visual optimizado
- Indicador "¡Nivel máximo! 🏆"

### 🎯 Zonas de Potencia Personalizadas

Basadas en FTP del perfil:

- **Z1**: < 55% FTP (Recuperación)
- **Z2**: 55-75% FTP (Resistencia)
- **Z3**: 75-90% FTP (Tempo)
- **Z4**: 90-105% FTP (Umbral)
- **Z5**: > 105% FTP (VO2max)

Gráfico de tiempo en cada zona por actividad.

### 💾 Perfil Personalizado

Configuración completa del atleta:

- **FTP** (Watts)
- **Peso** (kg)
- **FC máxima** y **FC reposo** (bpm)
- **VO2max** (ml/kg/min)
- **Altura** (cm)

Todos los cálculos se personalizan automáticamente.

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
