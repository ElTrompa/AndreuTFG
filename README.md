# 🚴‍♂️ RideMetrics — Aplicación de Análisis de Entrenamiento Ciclista

> Proyecto de Fin de Grado — DAM2 · Florida Campus Alzira · Andreu

## 📌 Descripción del proyecto

**RideMetrics** es una aplicación móvil multiplataforma integrada con la API de Strava que ofrece analítica de ciclismo de nivel profesional de forma gratuita: métricas que plataformas como TrainingPeaks o WKO5 ofrecen únicamente bajo suscripción.

El proyecto cubre un backend REST completo (Node.js/Express + MySQL) y una app móvil (React Native/Expo/TypeScript) con más de 15 pantallas, 6 rutas de API, 12 servicios backend y un sistema de búsqueda de rutas por municipios.

## 🎯 Objetivos

- Integrar datos reales de entrenamientos mediante Strava OAuth 2.0.
- Ofrecer analítica avanzada nivel TrainingPeaks/INSCYD de forma gratuita.
- Gestionar los límites de la API de Strava con un sistema de rate limiting robusto.
- Visualizar métricas deportivas con precisión científica.
- Analizar forma física, fatiga y carga de entrenamiento (PMC).
- Generar proyecciones de rendimiento a medio y largo plazo.
- Proporcionar recomendaciones de entrenamiento personalizadas.
- Aplicar arquitectura backend + frontend real con despliegue dockerizado.

## 🧠 Motivación

Muchas plataformas actuales de análisis deportivo ofrecen métricas avanzadas solo bajo suscripción:

| Plataforma | Coste |
|---|---|
| Strava Premium | ~€80/año |
| TrainingPeaks | ~€120/año |
| INSCYD | ~€500/año |

RideMetrics proporciona esas mismas métricas de forma **gratuita**, **open-source** y **multiplataforma**.

---

## 🚀 Características Implementadas

### 🔐 Autenticación OAuth 2.0

- Flujo OAuth 2.0 completo con Strava (polling de sesión desde la app móvil).
- Tokens almacenados en MySQL con renovación automática en background.
- JWT firmado devuelto al cliente para autenticar todas las llamadas.

---

### 📊 Performance Management Chart (PMC)

Sistema profesional de seguimiento de carga de entrenamiento:

| Métrica | Descripción | Constante de tiempo |
|---|---|---|
| **CTL** | Chronic Training Load (forma) | 42 días |
| **ATL** | Acute Training Load (fatiga) | 7 días |
| **TSB** | Training Stress Balance (frescura) | CTL − ATL |

- Vistas diaria, semanal y mensual.
- PMC Forecasting con 4 escenarios (descanso / mantenimiento / moderado / intenso).
- Recomendaciones automáticas según estado actual.

Documentación: [`backend/PMC_SYSTEM.md`](backend/PMC_SYSTEM.md)

---

### 🔥 Analítica Avanzada por Actividad

Para cada actividad se calculan automáticamente:

- **Gasto energético**: calorías metabólicas reales (kJ / eficiencia).
- **Sustrato energético**: % grasas vs carbohidratos, gramos exactos de CHO y grasa oxidados.
- **TSS** (Training Stress Score) y **TRIMP** (Banister).
- **VO2 estimado** durante la sesión y % VO2max.
- **Efficiency Factor (EF)** y **Aerobic Decoupling**.
- **FatMax**: análisis de tiempo en zona óptima de oxidación de grasa.
- **W/kg** promedio y normalizado.
- **Depleción de glucógeno**: gramos usados y % de reservas.

Documentación: [`backend/ADVANCED_ANALYTICS.md`](backend/ADVANCED_ANALYTICS.md)

---

### ⚡ Curva de Potencia y Sistema de Niveles

- **Curva de potencia** en **13 duraciones**: 5s, 15s, 30s, 1m, 2m, 3m, 5m, 10m, 15m, 20m, 30m, 45m, 1h.
- Visualización **hexagonal** (componente `HexPowerChart`).
- **10 niveles** con umbrales absolutos de potencia por duración:

| Nivel | Nombre | 5s | 1m | 1h |
|---|---|---|---|---|
| 1 | Principiante | 500 W | 220 W | 85 W |
| 5 | Amateur Competitivo | 1200 W | 480 W | 245 W |
| 10 | Profesional World Tour | 2200 W | 820 W | 450 W |

- Progreso preciso hasta el siguiente nivel (no relativo al máximo personal).

---

### 🏔️ Análisis de Perfil Ciclista

Clasificación automática basada en la distribución de potencias:

| Perfil | Duración clave |
|---|---|
| ⚡ Sprinter | 5 s – 15 s |
| 🏔️ Escalador | 30 min – 1 h |
| 🚴 Rodador | 5 min – 20 min |

Incluye descripción del perfil, fortalezas principales, áreas de mejora y emoji identificativo.

---

### 🔮 Predicciones y Modelos

- **Predicción automática de FTP** desde la curva de potencia (métodos 20 min / 60 min).
- **Critical Power Model** (CP + W') con cálculo de tiempo hasta agotamiento.
- Actualización automática del FTP estimado en el perfil del atleta.

---

### 🤖 Coach Inteligente

- **Recomendaciones diarias** basadas en TSB y actividad reciente.
- **Detección de sobreentrenamiento** (TSB, EF, decoupling, HRV).
- **Planes semanales personalizados** para 4 objetivos: FTP, VO2max, resistencia, sprint.

---

### 💓 HRV y Recuperación

- **HRV Tracking**: baseline rolling de 30 días.
- **Training Readiness Score** (0-100): combina HRV + TSB.
- **Anomaly Detection**: detección de caídas súbitas de HRV.

---

### ⛰️ Análisis de Terreno y Puertos

- **Detección automática de puertos**: identificación de ascensos con categorización (HC, Cat1-4).
- **W/kg en ascensos** y **VAM** (velocidad de ascensión vertical).
- **Comparación histórica** vs intentos previos.
- **Simulador de 8 puertos icónicos**: Alpe d'Huez, Angliru, Mortirolo, Ventoux, Tourmalet, Zoncolan, Stelvio, Peyresourde.
  - Proyecciones físicas basadas en FTP / peso.
  - Comparación con récords profesionales.

---

### 🤖 Clasificador de Sesiones

Clasifica automáticamente cada actividad en uno de **12 tipos**:

`Recovery` · `VO2max` · `Threshold` · `Sweet Spot` · `Endurance` · `Tempo` · `Climbing` · `Sprint` · `Easy` · `Race` · `Group Ride` · `Custom`

- Análisis multiparamétrico: IF, VI, duración, desnivel, patrones de potencia.
- Distribución de entrenamiento y análisis de polarización (regla 80/20).
- Score de confianza del modelo (0.75–0.95).

---

### 🏆 Sistema de Gamificación (32 Achievements)

Organizados en 6 categorías y 3 niveles (Bronze / Silver / Gold):

| Categoría | Ejemplos |
|---|---|
| **Power** | Club 250W/300W/350W · Escalador 4.0/4.5/5.0 W/kg |
| **Volume** | 1k/5k/10k km · Everest Virtual · 100k desnivel |
| **Consistency** | Rachas 7/30/100 días |
| **Fitness** | 500/750 TSS semanal · CTL 70/100 |
| **Special** | Century/Double Century · rides de 5h · sprints de 1000W |
| **Performance** | VI perfecto · negative splits · múltiples PRs |

---

### 📍 Búsqueda de Rutas por Municipios

- Extracción automática de municipios a partir del track GPS de cada actividad.
- Búsqueda de todas las actividades que pasan por un municipio concreto.
- Mapa interactivo de municipios visitados (`RoutesSearchScreen`).
- Persistencia en tablas `towns` y `activity_towns`.

Documentación: [`TOWNS_FEATURE.md`](TOWNS_FEATURE.md)

---

### 🚦 Rate Limiting Inteligente

Sistema robusto para respetar los límites de la API de Strava (600 req / 15 min):

- **Queue automático**: todas las solicitudes se encolan antes de ejecutarse.
- **Espaciado mínimo**: 150 ms entre peticiones.
- **Throttling automático**: ralentiza cuando el uso supera el 90%.
- **Backoff exponencial** en errores 429.
- **Endpoint de diagnóstico**: `GET /strava/rate-limit-status`.

Documentación: [`backend/RATE_LIMITING.md`](backend/RATE_LIMITING.md)

---

## 🛠 Stack Tecnológico

### Frontend

| Tecnología | Versión |
|---|---|
| React Native | 0.81.5 |
| React | 19.1.0 |
| Expo | 54 |
| TypeScript | 5.9 |
| react-native-svg | 15.12 |
| react-native-maps | 1.20 |
| AsyncStorage | 2.2 |

### Backend

| Tecnología | Versión |
|---|---|
| Node.js | ≥ 18 |
| Express | 4.18 |
| mysql2 | 3.3 |
| jsonwebtoken | 9.0 |
| axios | 1.13 |

### Infraestructura

| Herramienta | Uso |
|---|---|
| MySQL 8.0 | Base de datos principal |
| Docker + Compose | Entorno contenerizado |
| Adminer | Administrador web de BD |
| Strava API v3 | Fuente de datos de entrenamientos |

---

## 🏗 Arquitectura

```
┌─────────────────────────────────┐
│    App React Native / Expo      │
│  (TypeScript · 15+ pantallas)   │
└────────────┬────────────────────┘
             │ HTTP + JWT
┌────────────▼────────────────────┐
│   Backend API REST (Express)    │
│   /auth  /strava  /profile      │
│   /advanced  /specialized       │
│   /towns                        │
└──────┬───────────────┬──────────┘
       │               │
┌──────▼──────┐  ┌─────▼──────────┐
│  MySQL 8.0  │  │   Strava API   │
│  (Docker)   │  │   v3 (OAuth)   │
└─────────────┘  └────────────────┘
```

---

## 📂 Estructura del Proyecto

```
RideMetrics/
├── frontend/                        # App React Native / Expo
│   ├── components/
│   │   ├── HomeScreen.tsx           # Panel principal
│   │   ├── ActivitiesScreen.tsx     # Lista de actividades
│   │   ├── ActivityDetailScreen.tsx # Detalle de actividad
│   │   ├── AdvancedAnalyticsScreen.tsx
│   │   ├── CoachingScreen.tsx       # Coach inteligente
│   │   ├── HRVScreen.tsx            # Variabilidad FC
│   │   ├── MetricasAvanzadasScreen.tsx
│   │   ├── PalmaresScreen.tsx       # Achievements / KOMs
│   │   ├── PotenciaScreen.tsx       # Curva de potencia
│   │   ├── ProfileScreen.tsx        # Perfil del atleta
│   │   ├── ProyeccionesScreen.tsx   # PMC + proyecciones
│   │   ├── RoutesSearchScreen.tsx   # Búsqueda por municipios
│   │   ├── SessionClassifierScreen.tsx
│   │   ├── TerrainScreen.tsx        # Análisis de puertos
│   │   ├── HexPowerChart.tsx        # Gráfico hexagonal
│   │   ├── TimeInZoneChart.tsx      # Zonas de potencia
│   │   ├── HamburgerMenu.tsx
│   │   └── SafeView.tsx
│   ├── services/
│   │   └── cacheService.ts
│   ├── App.tsx
│   ├── theme.ts
│   └── package.json
│
├── backend/                         # API REST Node.js / Express
│   ├── src/
│   │   ├── index.js                 # Entry point + init BD
│   │   ├── db.js                    # Pool de conexiones MySQL
│   │   ├── routes/
│   │   │   ├── auth.js              # OAuth Strava
│   │   │   ├── stravaApi.js         # Actividades, sync, rate-limit
│   │   │   ├── profile.js           # Perfil del atleta
│   │   │   ├── advanced.js          # Predicciones, coaching, métricas
│   │   │   ├── specialized.js       # HRV, terreno, gamificación
│   │   │   └── towns.js             # Búsqueda por municipios
│   │   ├── services/
│   │   │   ├── strava.js            # Cliente Strava con rate limiter
│   │   │   ├── rateLimit.js         # ⭐ RateLimiter (queue + backoff)
│   │   │   ├── analytics.js         # TSS, TRIMP, sustrato, VO2…
│   │   │   ├── pmc.js               # CTL / ATL / TSB
│   │   │   ├── predictions.js       # FTP estimado, Critical Power
│   │   │   ├── coaching.js          # Recomendaciones diarias
│   │   │   ├── advancedMetrics.js   # VI, Pacing, EF trends
│   │   │   ├── classifier.js        # Clasificador de sesiones
│   │   │   ├── gamification.js      # 32 achievements
│   │   │   ├── hrv.js               # HRV tracking
│   │   │   ├── terrain.js           # Detección de puertos
│   │   │   ├── climbs.js            # Simulador de puertos famosos
│   │   │   └── towns.js             # Extracción de municipios GPS
│   │   └── models/
│   │       ├── tokens.js            # Gestión tokens OAuth
│   │       ├── profiles.js
│   │       ├── powerCurves.js
│   │       ├── loginSessions.js
│   │       └── towns.js
│   ├── db/
│   │   └── schema.sql               # 9 tablas (athletes, profiles, towns…)
│   ├── scripts/
│   │   ├── migrate.js
│   │   └── compute_power_for_all.js
│   └── package.json
│
├── docker-compose.yml               # MySQL 8 (3307) + Adminer (8085)
├── README.md
└── INSTALLATION.md
```

---

## 🗄 Base de Datos

| Tabla | Descripción |
|---|---|
| `athletes` | Tokens OAuth de cada atleta |
| `login_sessions` | Sesiones de login temporales (polling) |
| `profiles` | Peso, altura, FTP, VO2max, FC máx/rest |
| `power_curves` | Curva de potencia cacheada por atleta |
| `activities_cache` | Actividades con detalles cacheadas |
| `achievements_cache` | Logros calculados (KOMs, podios…) |
| `api_sync_log` | Control de última sincronización por endpoint |
| `towns` | Municipios únicos extraídos de tracks GPS |
| `activity_towns` | Relación N:M actividad ↔ municipio |

---

## 📡 API — Endpoints Principales

### `/auth`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/auth/strava` | Inicia el flujo OAuth |
| GET | `/auth/callback` | Callback OAuth de Strava |
| GET | `/auth/poll/:state` | Polling de sesión desde la app |

### `/strava`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/strava/activities` | Lista de actividades (con caché) |
| GET | `/strava/activity/:id` | Detalle + streams de actividad |
| GET | `/strava/rate-limit-status` | Estado del rate limiter |

### `/profile`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/profile` | Perfil del atleta |
| PUT | `/profile` | Actualizar perfil (FTP, peso…) |

### `/advanced`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/advanced/pmc` | CTL / ATL / TSB histórico |
| GET | `/advanced/power-curve` | Curva de potencia + niveles |
| GET | `/advanced/profile` | Perfil ciclista (Sprinter/Escalador/Rodador) |
| GET | `/advanced/analytics/:id` | Analítica avanzada de actividad |
| GET | `/advanced/predictions` | FTP estimado + Critical Power |
| GET | `/advanced/coaching` | Recomendaciones + plan semanal |
| GET | `/advanced/metrics/:id` | VI, Pacing Score, EF |
| GET | `/advanced/gamification` | Achievements del atleta |
| GET | `/advanced/forecast` | Proyecciones PMC a futuro |

### `/specialized`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/specialized/hrv` | HRV tracking + readiness |
| POST | `/specialized/hrv` | Registrar nueva medición HRV |
| GET | `/specialized/terrain/:id` | Análisis de terreno y puertos |
| GET | `/specialized/climbs` | Simulador de puertos famosos |
| GET | `/specialized/classifier/:id` | Clasificación de sesión |
| GET | `/specialized/palmares` | KOMs, top10, local legends |

### `/towns`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/towns/athlete` | Municipios visitados por el atleta |
| GET | `/towns/search` | Búsqueda de municipios por nombre |
| GET | `/towns/:town_id/activities` | Actividades en un municipio |
| POST | `/towns/extract/:id` | Extraer municipios de una actividad |

---

## 📦 Instalación

### Requisitos previos

- Node.js ≥ 18
- Docker y Docker Compose
- Cuenta de desarrollador en Strava (Client ID + Secret)

### Clonar el repositorio

```bash
git clone https://github.com/usuario/RideMetrics.git
cd RideMetrics
```

### 🐳 Con Docker (recomendado)

Levanta MySQL 8 y Adminer automáticamente:

```bash
docker-compose up -d
```

- MySQL disponible en `localhost:3307`
- Adminer disponible en `http://localhost:8085`

### Backend

```bash
cd backend
npm install
cp .env.example .env   # Editar con tus credenciales
npm run dev            # Nodemon con auto-reload
# o en producción:
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start              # Expo Dev Server
```

---

## 🔑 Configuración — `.env` (backend)

```env
# Strava OAuth
STRAVA_CLIENT_ID=tu_client_id
STRAVA_CLIENT_SECRET=tu_client_secret
STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback

# JWT
JWT_SECRET=cambia-esto-en-produccion

# Base de datos MySQL
DB_HOST=localhost
DB_PORT=3307
DB_USER=tfgandreu
DB_PASSWORD=tfgandreu_pass
DB_NAME=tfgandreu

# Entorno
NODE_ENV=development
PORT=3000
```

> Si usas Docker Compose, los valores de `DB_*` ya coinciden con los del `docker-compose.yml`.

---

## 🎨 Paleta de Colores — RideMetrics

| Rol | Nombre | Hex |
|---|---|---|
| Primario | Electric Blue | `#1E88E5` |
| Secundario | Performance Green | `#2ECC71` |
| Énfasis | Power Orange | `#F39C12` |
| Fondo claro | — | `#F6F8FA` |
| Texto principal | — | `#1F2933` |
| Fondo oscuro | — | `#0F172A` |
| Tarjeta oscura | — | `#1E293B` |

---

## 📚 Documentación Interna

| Archivo | Contenido |
|---|---|
| [`backend/PMC_SYSTEM.md`](backend/PMC_SYSTEM.md) | Performance Management Chart |
| [`backend/ADVANCED_ANALYTICS.md`](backend/ADVANCED_ANALYTICS.md) | Cálculos de analítica avanzada |
| [`backend/RATE_LIMITING.md`](backend/RATE_LIMITING.md) | Gestión de límites API Strava |
| [`backend/API_ADVANCED.md`](backend/API_ADVANCED.md) | Referencia completa de endpoints avanzados |
| [`TOWNS_FEATURE.md`](TOWNS_FEATURE.md) | Sistema de búsqueda por municipios |
| [`INSTALLATION.md`](INSTALLATION.md) | Guía detallada de instalación |

---

## 🧭 Metodología

- **SCRUM** con sprints iterativos.
- Control de versiones con **GitHub**.
- Gestión de tareas con **Trello**.
- Maquetas de UI con **Figma**.

---

## 🎓 Contexto Académico

Este proyecto cumple los requisitos del **Proyecto Intermodular 2** del ciclo formativo de grado superior en **Desarrollo de Aplicaciones Multiplataforma (DAM)** en Florida Campus Alzira.

| Área | Tecnologías aplicadas |
|---|---|
| Backend | Node.js, Express, REST API, OAuth 2.0, MySQL, JWT, Docker |
| Frontend | React Native, Expo, TypeScript, react-native-svg, react-native-maps |
| Metodología | SCRUM, GitHub, Trello, Figma |
