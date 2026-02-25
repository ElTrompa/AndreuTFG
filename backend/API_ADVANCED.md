# 🚀 RideMetrics Advanced API Documentation

Documentación completa de los endpoints avanzados implementados para análisis profesional de ciclismo.

## 📋 Tabla de Contenidos

1. [Predicciones y Modelos](#predicciones-y-modelos)
2. [Coaching Inteligente](#coaching-inteligente)
3. [Métricas Avanzadas](#métricas-avanzadas)
4. [Clasificador de Sesiones](#clasificador-de-sesiones)
5. [Sistema de Logros](#sistema-de-logros)
6. [HRV y Recuperación](#hrv-y-recuperación)
7. [Análisis de Terreno](#análisis-de-terreno)
8. [Simulador de Puertos](#simulador-de-puertos)

---

## 🔮 Predicciones y Modelos

### GET `/advanced/ftp-prediction`

Predice el FTP del atleta basado en la curva de potencia.

**Query Parameters:**
- `athlete_id` (string): ID del atleta

**Response:**
```json
{
  "currentFTP": 280,
  "prediction": {
    "ftpEstimated": 285,
    "method": "20min",
    "basePower": 300,
    "confidence": "high"
  },
  "trend": {
    "recentAvg": 282,
    "trend": "stable",
    "recommendation": "Tu FTP actual parece correcto"
  },
  "recommendation": "💡 Considera actualizar tu FTP con un test formal"
}
```

---

### GET `/advanced/critical-power`

Calcula el modelo de Critical Power (CP + W').

**Response:**
```json
{
  "CP": 265,
  "Wprime": 18500,
  "method": "2-parameter",
  "examples": [
    {
      "power": 300,
      "timeToExhaustion": 520,
      "timeLabel": "8min 40s"
    }
  ],
  "interpretation": {
    "CP": "265W es tu potencia sostenible teóricamente infinita",
    "Wprime": "19kJ es tu capacidad anaeróbica disponible"
  }
}
```

---

### POST `/advanced/pmc-forecast`

Proyecta el PMC (CTL/ATL/TSB) basado en carga planificada.

**Request Body:**
```json
{
  "plannedTSS": [100, 80, 120, 0, 90, 110, 150]
}
```

**Response:**
```json
{
  "current": {
    "CTL": 65,
    "ATL": 72,
    "TSB": -7
  },
  "forecast": [
    {
      "day": 1,
      "CTL": 66.2,
      "ATL": 77.1,
      "TSB": -10.9,
      "tss": 100
    }
  ]
}
```

---

### GET `/advanced/training-scenarios`

Genera 4 escenarios de entrenamiento predefinidos.

**Query Parameters:**
- `days` (number, default: 14): Días a proyectar

**Response:**
```json
{
  "current": { "CTL": 65, "ATL": 72, "TSB": -7 },
  "scenarios": {
    "rest": {
      "name": "Descanso / Recuperación",
      "forecast": [...]
    },
    "maintenance": {
      "name": "Mantenimiento",
      "forecast": [...]
    },
    "moderate": {
      "name": "Construcción Moderada",
      "forecast": [...]
    },
    "intense": {
      "name": "Construcción Intensiva",
      "forecast": [...]
    }
  }
}
```

---

## 🤖 Coaching Inteligente

### GET `/advanced/daily-recommendation`

Generación de recomendación diaria basada en TSB y actividad reciente.

**Response:**
```json
{
  "date": "2026-02-25",
  "pmc": { "CTL": 65, "ATL": 72, "TSB": -7 },
  "recommendation": {
    "state": "fatigued",
    "message": "Fatiga moderada - recuperación recomendada",
    "workout": {
      "type": "recovery",
      "duration": "60-90 min",
      "intensity": "Muy suave, Z1-Z2",
      "targetTSS": "30-40"
    },
    "warnings": ["No hagas intervalos hoy"],
    "reasoning": "TSB negativo indica fatiga acumulada"
  }
}
```

---

### GET `/advanced/overtraining-check`

Detección multiparamétrica de sobreentrenamiento.

**Query Parameters:**
- `hrv` (optional, number): HRV del día (RMSSD)

**Response:**
```json
{
  "pmc": { "CTL": 85, "ATL": 95, "TSB": -10 },
  "analysis": {
    "risk": "medium",
    "score": 62,
    "maxScore": 100,
    "factors": [
      {
        "name": "TSB muy negativo",
        "severity": "high",
        "score": 25,
        "details": "TSB = -10 (umbral: -20)"
      },
      {
        "name": "Efficiency Factor decreciente",
        "severity": "medium",
        "score": 15
      }
    ],
    "recommendation": "⚠️ Riesgo medio - reduce volumen esta semana"
  }
}
```

---

### GET `/advanced/weekly-plan`

Genera plan semanal estructurado por objetivo.

**Query Parameters:**
- `goal` (string): `ftp` | `vo2max` | `endurance` | `sprint`

**Response:**
```json
{
  "goal": "ftp",
  "profile": "allrounder",
  "currentPMC": { "CTL": 65, "ATL": 70, "TSB": -5 },
  "plan": {
    "weeklyTSS": 450,
    "days": [
      {
        "day": "Lunes",
        "type": "recovery",
        "description": "Recuperación activa",
        "duration": "60 min",
        "intensity": "Z1-Z2",
        "tss": 35
      },
      {
        "day": "Martes",
        "type": "threshold",
        "description": "Intervalos en umbral",
        "structure": "3x10min @ FTP con 5min recuperación",
        "duration": "90 min",
        "intensity": "Z4",
        "tss": 85
      }
    ]
  }
}
```

---

## 📊 Métricas Avanzadas

### GET `/advanced/activity/:id/advanced-metrics`

Análisis avanzado de una actividad específica.

**Response:**
```json
{
  "activity_id": "12345678",
  "activity_name": "Morning Ride",
  "metrics": {
    "variabilityIndex": {
      "value": 1.08,
      "interpretation": "Pacing moderadamente variable",
      "quality": "good"
    },
    "pacing": {
      "strategy": "negative_split",
      "score": 87,
      "firstHalfPower": 245,
      "secondHalfPower": 268
    },
    "records": [
      {
        "duration": 1200,
        "power": 295,
        "isNewRecord": true,
        "previousBest": 288
      }
    ]
  }
}
```

---

### GET `/advanced/efficiency-trends`

Análisis de tendencias de eficiencia a largo plazo.

**Query Parameters:**
- `days` (number, default: 90)

**Response:**
```json
{
  "period": "90 days",
  "efficiencyFactor": {
    "avgEF": 2.85,
    "trend": "improving",
    "slope": 0.015,
    "r2": 0.68,
    "message": "📈 Tu EF está mejorando - aeróbico en desarrollo"
  },
  "aerobicDecoupling": {
    "avgDecoupling": 3.2,
    "trend": "stable",
    "classification": "good",
    "message": "✅ Acoplamiento aeróbico bueno"
  }
}
```

---

## 🤖 Clasificador de Sesiones

### GET `/advanced/activity/:id/classify`

Clasifica automáticamente el tipo de sesión.

**Response:**
```json
{
  "activity_id": "12345678",
  "activity_name": "Interval Training",
  "classification": {
    "type": "vo2max",
    "subtype": "intervals",
    "confidence": 0.90,
    "description": "Intervalos de alta intensidad para mejorar VO2max",
    "tags": ["high_intensity", "intervals", "z5", "anaerobic"],
    "features": {
      "intensityFactor": 1.02,
      "variabilityIndex": 1.18,
      "durationMinutes": 75,
      "hasIntervals": true
    }
  }
}
```

---

### GET `/advanced/training-distribution`

Analiza la distribución de tipos de entrenamiento.

**Query Parameters:**
- `days` (number, default: 30)

**Response:**
```json
{
  "period": "30 days",
  "totalActivities": 18,
  "distribution": [
    {
      "type": "endurance",
      "count": 8,
      "timePercentage": "62.5",
      "tssPercentage": "48.2",
      "avgDuration": 135
    },
    {
      "type": "threshold",
      "count": 4,
      "timePercentage": "18.3",
      "tssPercentage": "28.7",
      "avgDuration": 90
    }
  ],
  "recommendation": {
    "highIntensity": "15.2%",
    "moderate": "22.5%",
    "easy": "62.3%",
    "message": "✅ Distribución equilibrada - sigue así"
  }
}
```

---

## 🏆 Sistema de Logros

### GET `/advanced/achievements`

Obtiene todos los logros desbloqueados y bloqueados.

**Response:**
```json
{
  "athlete_id": "123456",
  "achievements": {
    "unlocked": [
      {
        "id": "ftp_milestone_300",
        "name": "Club 300W",
        "description": "Alcanza 300W de FTP",
        "category": "power",
        "tier": "silver",
        "icon": "⚡⚡",
        "unlockedAt": "2026-01-15T10:30:00Z"
      }
    ],
    "locked": [...],
    "progress": [
      {
        "achievement": {
          "id": "ftp_milestone_350",
          "name": "Club 350W",
          "tier": "gold"
        },
        "current": 315,
        "required": 350,
        "percentage": 90
      }
    ],
    "stats": {
      "total": 32,
      "unlocked": 12,
      "completionRate": "37.5"
    }
  }
}
```

---

### GET `/advanced/achievements/progress`

Muestra solo el progreso hacia logros bloqueados.

**Response:**
```json
{
  "progress": [...],
  "nearCompletion": [
    {
      "achievement": { "name": "Club 350W" },
      "percentage": 90
    }
  ],
  "summary": {
    "totalLocked": 20,
    "inProgress": 12
  }
}
```

---

### GET `/advanced/achievements/leaderboard`

Listado de todos los logros por categoría.

**Query Parameters:**
- `category` (optional): `power` | `volume` | `consistency` | `fitness` | `special` | `performance`

**Response:**
```json
{
  "category": "power",
  "totalAchievements": 6,
  "byTier": {
    "gold": 2,
    "silver": 2,
    "bronze": 2
  },
  "achievements": [...]
}
```

---

## 💓 HRV y Recuperación

### POST `/specialized/hrv/status`

Analiza el estado del HRV respecto al baseline.

**Request Body:**
```json
{
  "todayRMSSD": 45,
  "historicalData": [
    { "date": "2026-02-24", "rmssd": 52 },
    { "date": "2026-02-23", "rmssd": 48 },
    { "date": "2026-02-22", "rmssd": 55 }
  ]
}
```

**Response:**
```json
{
  "today": 45,
  "average": {
    "average": 51,
    "days": 7,
    "trend": "declining",
    "trendValue": -2.3
  },
  "status": {
    "status": "low",
    "message": "🟡 HRV baja - recuperación incompleta",
    "recommendation": "Considera entrenar suave o descansar",
    "todayRMSSD": 45,
    "baseline": 51,
    "deviation": -12
  }
}
```

---

### POST `/specialized/hrv/readiness`

Combina HRV y TSB para un score de readiness.

**Request Body:**
```json
{
  "todayRMSSD": 52,
  "historicalData": [...]
}
```

**Response:**
```json
{
  "readiness": {
    "readiness": 78,
    "level": "high",
    "recommendation": "✅ Listo para entrenamientos intensos",
    "components": {
      "hrv": { "score": 80, "status": "good" },
      "tsb": { "score": 70, "value": 5 }
    }
  },
  "inputs": {
    "hrv": {...},
    "tsb": 5
  }
}
```

---

### POST `/specialized/hrv/anomalies`

Detecta caídas súbitas de HRV.

**Request Body:**
```json
{
  "historicalData": [...],
  "threshold": -15
}
```

**Response:**
```json
{
  "anomalies": [
    {
      "date": "2026-02-20",
      "rmssd": 38,
      "deviation": -22,
      "severity": "medium"
    }
  ],
  "count": 3,
  "severity": {
    "high": 1,
    "medium": 2,
    "low": 0
  }
}
```

---

## ⛰️ Análisis de Terreno

### GET `/specialized/terrain/:activityId`

Detecta y analiza puertos en una actividad.

**Response:**
```json
{
  "activity_id": "12345678",
  "analysis": {
    "climbs": [
      {
        "id": 1,
        "elevationGain": 650,
        "distance": 8200,
        "avgGradient": "7.9",
        "startElevation": 450,
        "endElevation": 1100,
        "power": {
          "avgPower": 285,
          "maxPower": 420,
          "wPerKg": "4.07",
          "duration": 1680,
          "durationLabel": "28m 0s",
          "vam": "1385",
          "category": "1"
        }
      }
    ],
    "summary": {
      "totalClimbs": 3,
      "totalElevationGain": 1450,
      "totalClimbingDistance": 18500,
      "avgGradient": 7.8,
      "categorization": {
        "HC": 0,
        "Cat1": 2,
        "Other": 1
      }
    }
  }
}
```

---

## 🏔️ Simulador de Puertos

### GET `/specialized/climbs/catalog`

Listado de todos los puertos disponibles.

**Response:**
```json
{
  "totalClimbs": 8,
  "climbs": [
    {
      "id": "alpe-dhuez",
      "name": "Alpe d'Huez",
      "country": "France",
      "distance": "13.8 km",
      "elevationGain": "1120 m",
      "avgGradient": "8.1%",
      "proRecord": {
        "rider": "Marco Pantani",
        "time": "37:35",
        "wPerKg": 6.7
      }
    }
  ]
}
```

---

### GET `/specialized/climbs/simulate/:climbId`

Simula el rendimiento en un puerto famoso.

**Query Parameters:**
- `power` (optional, number): Potencia sostenible (default: FTP del atleta)

**Example:** `/specialized/climbs/simulate/alpe-dhuez?power=280`

**Response:**
```json
{
  "athlete": {
    "ftp": 300,
    "weight": 70,
    "wkg": "4.29"
  },
  "simulation": {
    "climb": {
      "name": "Alpe d'Huez",
      "country": "France",
      "distance": 13800,
      "elevationGain": 1120,
      "avgGradient": 8.1
    },
    "simulation": {
      "time": 2850,
      "timeFormatted": "47:30",
      "speed": "17.5",
      "wPerKg": "4.00"
    },
    "proRecord": {
      "name": "Marco Pantani",
      "time": 2263,
      "timeFormatted": "37:35",
      "avgWatts": 371,
      "wPerKg": 6.7
    },
    "comparison": {
      "timeDifference": 587,
      "timeDifferenceFormatted": "9:47",
      "percentSlower": "25.9"
    }
  }
}
```

---

### GET `/specialized/climbs/recommendations`

Recomienda puertos apropiados para el perfil del atleta.

**Query Parameters:**
- `gradient` (optional, number): Gradiente preferido (%)

**Response:**
```json
{
  "athlete": {
    "ftp": 300,
    "weight": 70,
    "wkg": "4.29"
  },
  "recommendations": [
    {
      "id": "tourmalet",
      "name": "Col du Tourmalet",
      "country": "France",
      "estimatedTime": "52:15",
      "difficulty": "moderate",
      "competitive": true,
      "score": 95,
      "gradient": 7.4
    }
  ]
}
```

---

## 🔐 Autenticación

Todos los endpoints requieren autenticación mediante:

1. **JWT Token** en header: `Authorization: Bearer <token>`
2. **athlete_id** en query string: `?athlete_id=123456`
3. **X-Athlete-ID** header: `X-Athlete-ID: 123456`

---

## 📈 Categorías de Achievement

### Power
- Club 250W / 300W / 350W
- Escalador Amateur / Avanzado / Elite (4.0, 4.5, 5.0 W/kg)

### Volume
- Primer Milenio / Vuelta a Europa / Vuelta al Mundo (1k, 5k, 10k km)
- Everest Virtual / Cinco Everests / Señor de las Montañas (10k, 50k, 100k m)

### Consistency
- Semana Completa / Mes Ininterrumpido / Centurión (7, 30, 100 días)

### Fitness
- Carga Alta / Elite (500, 750 TSS semanal)
- Forma Sólida / Profesional (CTL 70, 100)

### Special
- Century / Double Century (100km, 200km)
- Resistencia Extrema (5h)
- Sprinter del Kilo (1000W)

### Performance
- Pacing Perfecto (VI < 1.03)
- Maestro del Negative Split
- Récords Múltiples (5 PRs en una salida)

---

## 🎯 Tipos de Sesión

El clasificador ML detecta automáticamente:

- **recovery**: Recuperación activa Z1-Z2
- **vo2max**: Intervalos alta intensidad Z5
- **threshold**: Trabajo en umbral (FTP) Z4
- **sweetspot**: Sweet spot 88-93% FTP
- **endurance**: Base aeróbica > 2h Z2
- **tempo**: Ritmo sostenido Z3
- **climbing**: Puertos y desnivel
- **sprint**: Intervalos de sprint
- **easy**: Salidas fáciles / commute
- **race**: Competición / all-out
- **group_ride**: Salida grupal variable

---

## 💡 Notas de Implementación

- Todos los cálculos se realizan server-side para garantizar precisión
- Los modelos predictivos usan fórmulas validadas científicamente
- El sistema de achievements es extensible para añadir nuevos logros
- HRV requiere entrada manual (Strava no proporciona estos datos)
- Las simulaciones de puertos usan física simplificada (no considera viento/drafting)

---

**Versión:** 1.0.0  
**Fecha:** Febrero 2026  
**Desarrollado por:** RideMetrics Team
