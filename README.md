# 🚴‍♂️ RideMetrics — Aplicación de Análisis de Entrenamiento Ciclista

## 📌 Descripción del proyecto

**RideMetrics** es una aplicación móvil multiplataforma orientada al análisis y mejora del rendimiento ciclista, integrada con la API de Strava. Proporciona analítica avanzada de ciclismo profesional que va más allá de lo que ofrece Strava, incluyendo:

- 🔥 **Analítica Avanzada**: TSS, TRIMP, sustrato energético (grasas/carbohidratos), VO2, eficiencia aeróbica
- 📊 **Performance Management Chart (PMC)**: Seguimiento de forma (CTL), fatiga (ATL) y frescura (TSB)
- ⚡ **Sistema de Niveles**: 10 niveles realistas con umbrales de potencia absolutos por duración
- 🏔️ **Análisis de Perfil**: Clasificación automática en Sprinter, Escalador o Rodador
- 📈 **Curva de Potencia**: Visualización hexagonal con potencias máximas en 13 duraciones
- 🚦 **Rate Limiting Inteligente**: Sistema robusto para respetar límites de API de Strava con queue automático y backoff exponencial

Este proyecto se desarrolla como parte del Proyecto Intermodular 2 del ciclo formativo de grado superior en Desarrollo de Aplicaciones Multiplataforma (DAM) en Florida Campus Alzira. Este es un proyecto de fin de grado con el nombre **RideMetrics**, desarrollado por Andreu.

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

### � Características Avanzadas Profesionales

RideMetrics ahora incluye **18 sistemas avanzados** de nivel profesional que rivalizan con TrainingPeaks, INSCYD y WKO5:

#### 🔮 Predicción y Modelado
- **Predicción automática de FTP**: Estimación desde curva de potencia (métodos 20min/60min)
- **Critical Power Model**: Modelo 2-parámetros (CP + W') con cálculo de tiempo hasta agotamiento
- **PMC Forecasting**: Proyecciones de forma con 4 escenarios predefinidos (descanso/mantenimiento/moderado/intenso)

#### 🤖 Coach Inteligente
- **Recomendaciones diarias**: Sugerencias automáticas basadas en TSB y actividad reciente
- **Detección de sobreentrenamiento**: Sistema multiparamétrico (TSB, EF, decoupling, HRV)
- **Planes semanales personalizados**: Generación automática para 4 objetivos (FTP, VO2max, resistencia, sprint)

#### 📊 Métricas Avanzadas
- **Variability Index (VI)**: Análisis de pacing y regularidad
- **Pacing Score**: Detección de estrategia (negative split, positive split, even pacing)
- **Peak Power Records**: Tracking automático de récords en 13 duraciones
- **Efficiency Trends**: Regresión lineal de Factor de Eficiencia a 90 días
- **Aerobic Decoupling**: Análisis de acoplamiento aeróbico

#### 💓 HRV y Recuperación
- **HRV Tracking**: Sistema completo de seguimiento con baseline rolling 30 días
- **Training Readiness**: Score combinado HRV + TSB (0-100)
- **Anomaly Detection**: Detección de caídas súbitas de HRV

#### ⛰️ Análisis de Terreno
- **Detección automática de puertos**: Identificación de ascensos con categorización (HC, Cat1-4)
- **W/kg en ascensos**: Cálculo de potencia relativa por puerto
- **VAM (Vertical Ascent Meters)**: Velocidad de ascensión vertical
- **Comparación histórica**: Rendimiento vs intentos previos

#### 🏔️ Simulador de Puertos Famosos
- **8 puertos icónicos**: Alpe d'Huez, Angliru, Mortirolo, Ventoux, Tourmalet, Zoncolan, Stelvio, Peyresourde
- **Proyecciones realistas**: Simulación física basada en FTP/peso
- **Comparación con records pro**: Tiempo estimado vs récords profesionales
- **Recomendaciones inteligentes**: Puertos apropiados según perfil

#### 🤖 Clasificador ML de Sesiones
- **12 tipos de sesión**: Recovery, VO2max, Threshold, Sweet Spot, Endurance, Tempo, Climbing, Sprint, Easy, Race, Group Ride
- **Análisis multiparamétrico**: IF, VI, duración, desnivel, patrones de potencia
- **Distribución de entrenamiento**: Análisis de polarización (regla 80/20)
- **Confianza del modelo**: Score 0.75-0.95 según características

#### 🏆 Sistema de Gamificación
- **32 achievements** en 6 categorías:
  - **Power**: Club 250W/300W/350W, Escalador (4.0/4.5/5.0 W/kg)
  - **Volume**: 1k/5k/10k km, Everest Virtual, 100k desnivel
  - **Consistency**: Rachas de 7/30/100 días
  - **Fitness**: 500/750 TSS semanal, CTL 70/100
  - **Special**: Century/Double Century, 5h rides, 1000W sprints
  - **Performance**: VI perfecto, negative splits, múltiples PRs
- **Progreso en tiempo real**: Tracking hacia objetivos pendientes
- **3 tiers**: Bronze, Silver, Gold

**Documentación API:** [`backend/API_ADVANCED.md`](backend/API_ADVANCED.md)

**Endpoints disponibles:**
- `/advanced/*` - 9 endpoints de predicción, coaching y métricas
- `/specialized/*` - 8 endpoints de HRV, terreno y puertos

### �🚦 Rate Limiting (Gestión de límites API)

Sistema robusto para gestionar los límites de la API de Strava (600 solicitudes por 15 minutos):

- **Queue automático**: Todas las solicitudes se encolan automáticamente
- **Espaciado inteligente**: Mínimo 150ms entre solicitudes
- **Monitoreo en tiempo real**: Tracking de uso de cuota en cada respuesta
- **Throttling automático**: Ralentiza solicitudes cuando se acerca al límite (>90% uso)
- **Reintento con backoff exponencial**: Los errores 429 se reintatan automáticamente
- **Endpoint de diagnóstico**: `/api/strava/rate-limit-status` para monitorear el estado

Documentación completa: [`RATE_LIMITING.md`](backend/RATE_LIMITING.md)

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

## 🏗 Arquitectura e Implementación

### Componentes Clave

- **Rate Limiter** (`src/services/rateLimit.js`): Sistema centralizado de gestión de límites API
- **Strava Service** (`src/services/strava.js`): Integración completa con API de Strava a través del rate limiter
- **Analytics Service** (`src/services/analytics.js`): Motor de cálculos avanzados de rendimiento
- **PMC Service** (`src/services/pmc.js`): Sistema de seguimiento de carga y rendimiento
- **Rutas API**: Endpoints RESTful para acceso de aplicación cliente

## 🎓 Alcance del proyecto (contexto académico)

Este proyecto cumple los requisitos técnicos del Proyecto Intermodular DAM:

### Backend

- API REST propia con Express.js
- Autenticación OAuth 2.0 con Strava
- Operaciones CRUD de atletas y entrenamientos
- Persistencia en base de datos MySQL
- Gestión robusta de límites de API de terceros
- Configuración por archivo `.env`
- Despliegue en la nube (listo para Docker)

### Frontend

- Aplicación móvil desarrollada con React Native
- Interfaz adaptable a móvil y tablet
- TypeScript para type safety
- Diseño previo con Figma
- Integración completa con backend API

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

## 🚀 Funcionalidades Implementadas

**API Backend**
- 🔐 Autenticación OAuth 2.0 con Strava
- 📊 Endpoint de entrenamientos con sincronización
- 🧮 Cálculos de analítica avanzada (TSS, TRIMP, sustrato energético)
- 📈 Performance Management Chart (PMC) con CTL/ATL/TSB
- ⚡ Sistema de niveles con umbrales por duración
- 🏔️ Análisis automático de perfil ciclista
- 📐 Curva de potencia en 13 duraciones
- 🚦 Rate limiting robusto para API de Strava
- 📍 Endpoint de diagnóstico de rate limits

**Frontend (React Native)**
- 📱 Interfaz optimizada para móvil y tablet
- 🔐 Login con Strava
- 📊 Visualización de entrenamientos
- 📈 Gráficas de progreso (semanal, mensual)
- 🧮 Métricas de rendimiento detalladas
- 📐 Curva de potencia hexagonal
- 🎨 Diseño oscuro/claro

**Visualización de Datos**
- Hexágono de potencia por rangos (5s, 15s, 30s, 1m, 2m, 3m, 5m, 10m, 15m, 20m, 30m, 45m, 1h)
- Gráficos de desempeño semanal/mensual
- PMC con proyecciones de forma física
- Zonas de intensidad personalizadas por FTP

## 📦 Instalación

### Requisitos previos

- Node.js ≥ 18
- Docker y Docker Compose
- Cuenta de desarrollador en Strava
- MySQL ≥ 8.0 (o usar Docker)

### Instalación local

```bash
git clone https://github.com/usuario/RideMetrics.git
cd RideMetrics
```

**Backend**

```bash
cd backend
npm install
npm start          # Inicia en puerto 3000
# o para desarrollo con reinicio automático:
npm run dev
```

**Frontend**

```bash
cd frontend
npm install
npm start          # Expo server
```

### Verificar Rate Limiting

Una vez el backend está corriendo:

```bash
curl http://localhost:3000/api/strava/rate-limit-status
```

Deberías ver algo como:
```json
{
  "requestsUsed": 0,
  "requestsLimit": 600,
  "requestsRemaining": 600,
  "percentageUsed": 0,
  "queueLength": 0,
  "message": "OK: API usage is healthy"
}
```

### 🐳 Instalación con Docker

```bash
docker-compose up --build
```

## 🔑 Configuración

Crear un archivo `.env` en la carpeta `backend` con las siguientes variables (ejemplo):

```env
# Strava OAuth
STRAVA_CLIENT_ID=xxxx
STRAVA_CLIENT_SECRET=xxxx
STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback

# JWT para autenticación
JWT_SECRET=supersecret-cambiar-en-produccion

# Base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=ridemetrics

# Modo aplicación
NODE_ENV=development
PORT=3000
```

### Rate Limiting (sintonizable)

En `src/services/strava.js` puedes ajustar los parámetros del Rate Limiter:

```javascript
const rateLimiter = new RateLimiter({
  requestsPerWindow: 600,        // Límite de Strava
  windowMs: 15 * 60 * 1000,      // Ventana de 15 minutos
  minDelayMs: 150                 // Retraso mínimo entre solicitudes
});
```

## 📚 Uso

1. Iniciar la aplicación.
2. Iniciar sesión con Strava.
3. Autorizar el acceso a los entrenamientos.
4. Consultar estadísticas y proyecciones desde el panel principal.

## 📂 Estructura del proyecto

```
RideMetrics/
├── frontend/                    # App React Native/Expo
│   ├── components/
│   ├── assets/
│   ├── App.tsx
│   ├── package.json
│   └── tsconfig.json
├── backend/                     # API REST Node.js/Express
│   ├── src/
│   │   ├── models/             # Modelos de BD
│   │   ├── routes/             # Endpoints API
│   │   ├── services/           # Lógica de negocio
│   │   │   ├── strava.js       # Integración Strava
│   │   │   ├── rateLimit.js    # ⭐ Rate Limiter
│   │   │   ├── analytics.js    # Análisis avanzado
│   │   │   └── pmc.js          # Performance Management
│   │   ├── db.js
│   │   └── index.js
│   ├── db/
│   │   └── schema.sql
│   ├── RATE_LIMITING.md        # 📖 Documentación Rate Limiting
│   ├── ADVANCED_ANALYTICS.md
│   ├── PMC_SYSTEM.md
│   ├── package.json
│   └── .env
├── docker-compose.yml
├── README.md
├── INSTALLATION.md
└── .gitignore
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

## 📚 Documentación Principal

- **[RATE_LIMITING.md](backend/RATE_LIMITING.md)** — Gestión de límites API de Strava
- **[ADVANCED_ANALYTICS.md](backend/ADVANCED_ANALYTICS.md)** — Cálculos de analítica avanzada
- **[PMC_SYSTEM.md](backend/PMC_SYSTEM.md)** — Performance Management Chart
- **[INSTALLATION.md](INSTALLATION.md)** — Guía detallada de instalación

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
