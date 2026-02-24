# 🔥 Analítica Avanzada - Documentación

## 📊 Endpoints disponibles

### 1. Obtener actividad individual con analítica completa

```http
GET /strava/activities/:id
```

**Query params opcionales:**
- `streams=true` - Incluir streams de la actividad (potencia, HR, cadencia, etc.)
- `stream_keys=watts,heartrate,cadence` - Especificar qué streams obtener

**Response:**
```json
{
  "activity": { 
    // Datos completos de Strava
    "id": 123456,
    "name": "Morning Ride",
    "moving_time": 3600,
    "average_watts": 200,
    "weighted_average_watts": 215,
    "kilojoules": 780,
    "calories": 780,
    "average_heartrate": 145,
    "max_heartrate": 182
  },
  "profile": {
    // Tu perfil personalizado
    "athlete_id": "xxx",
    "ftp": 250,
    "weight_kg": 70,
    "hr_max": 190,
    "hr_rest": 50,
    "vo2max": 55,
    "height_cm": 175
  },
  "athlete": { 
    // Datos del atleta de Strava
  },
  "zones": { 
    // Zonas configuradas en Strava
  },
  "stats": { 
    // Estadísticas del atleta
  },
  "streams": { 
    // Streams de la actividad (si streams=true)
  },
  "analytics": {
    // 🔥 AQUÍ ESTÁ LA MAGIA 🔥
  }
}
```

### 2. Endpoints adicionales

```http
GET /strava/athlete/zones    # Zonas del atleta
GET /strava/athlete/stats    # Estadísticas del atleta
GET /strava/activities/:id/streams  # Solo streams de actividad
```

---

## 🔥 Analítica Avanzada - Estructura

La propiedad `analytics` contiene **MUCHÍSIMA** información que Strava no proporciona:

### 1️⃣ Datos Básicos
```json
"basic": {
  "duration_minutes": 60,
  "avg_watts": 200,
  "normalized_power": 215,
  "kilojoules": 780,
  "strava_calories": 780,
  "avg_hr": 145,
  "max_hr": 182
}
```

### 2️⃣ Gasto Energético Avanzado
```json
"energy": {
  "metabolic_calories": 3391,  // Calorías metabólicas reales (kJ / eficiencia)
  "efficiency": 0.23           // Eficiencia mecánica
}
```

**Fórmula:**
- 1 kJ ≈ 1 kcal (si eficiencia ~24%)
- Calorías metabólicas = kJ / 0.23 (más preciso)

### 3️⃣ Sustrato Energético (🔥 CLAVE)
```json
"substrate": {
  "intensity_factor": 0.86,      // IF = NP / FTP
  "fat_percent": 20,             // % energía de grasas
  "cho_percent": 80,             // % energía de carbohidratos
  "fat_calories": 678,           // Calorías de grasa
  "cho_calories": 2713,          // Calorías de CHO
  "fat_grams": 75,               // Gramos de grasa oxidados
  "cho_grams": 678               // Gramos de CHO consumidos 🍞
}
```

**Métodos:**
1. **Basado en %FTP (más preciso para ciclismo):**
   - IF < 0.55 → 65% grasa
   - IF 0.65 → 50% grasa / 50% CHO
   - IF 0.75 → 35% grasa / 65% CHO
   - IF 0.85 → 20% grasa / 80% CHO
   - IF > 0.95 → 10% grasa / 90% CHO

2. **Basado en %FC reserva (si no hay potencia):**
   - Karvonen: (FC media - FC reposo) / (FC max - FC reposo)

**Conversión:**
- 1g grasa = 9 kcal
- 1g carbohidrato = 4 kcal

### 4️⃣ Carga Interna Real
```json
"load": {
  "trimp": 156,  // TRIMP (Bannister): carga fisiológica real
  "tss": 95      // TSS: Training Stress Score
}
```

**Fórmulas:**
- **TRIMP** = duración × ΔFC × 0.64 × e^(1.92×ΔFC)
  - ΔFC = (FC media - FC reposo) / (FC max - FC reposo)
  
- **TSS** = (segundos × NP × IF) / (FTP × 3600) × 100
  - Strava NO te lo da oficialmente 🚀

### 5️⃣ Consumo de Oxígeno
```json
"oxygen": {
  "estimated_vo2": 47.1,     // VO2 estimado en ml/kg/min
  "vo2max_percent": 86       // % de VO2max usado
}
```

**Fórmula:**
- VO2 (ml/kg/min) ≈ (10.8 × W / peso) + 7

**Aplicaciones:**
- Tiempo en zona aeróbica
- Tiempo > umbral ventilatorio
- Intensidad real del entrenamiento

### 6️⃣ Eficiencia Aeróbica
```json
"efficiency": {
  "efficiency_factor": 1.48,      // EF = NP / FC media
  "aerobic_decoupling": {
    "firstHalfEF": 1.52,
    "secondHalfEF": 1.45,
    "decoupling": -4.6           // % cambio (negativo = fatiga)
  }
}
```

**Interpretación:**
- **EF alto** = buena forma aeróbica
- **Decoupling > 5%** = fatiga aeróbica significativa
- **Decoupling < 5%** = sesión bien ejecutada

### 7️⃣ FatMax (Zona de Máxima Oxidación de Grasa)
```json
"fatMax": {
  "inFatMaxZone": true,      // ¿En zona FatMax? (60-65% VO2max)
  "fatMaxOptimal": 62.5      // Punto óptimo teórico
}
```

**Aplicación:**
- Optimizar entrenamiento de base
- Mejorar capacidad de oxidar grasa
- Preparación para larga distancia

### 8️⃣ Métricas Relativas al Peso
```json
"relative": {
  "avg_watts_per_kg": 2.86,    // W/kg promedio
  "np_watts_per_kg": 3.07      // W/kg normalizado
}
```

**Benchmarks:**
- **3.0 W/kg** → Ciclista recreativo
- **4.0 W/kg** → Amateur competitivo
- **5.0+ W/kg** → Elite/Pro

### 9️⃣ Depleción de Glucógeno
```json
"glycogen": {
  "depleted": 678,               // Gramos de glucógeno usados
  "muscleGlycogenPercent": 20    // % de reservas musculares
}
```

**Aplicación:**
- Estrategia de recuperación
- Planificación nutricional post-entreno
- Periodización de entrenamientos

---

## 📈 Dashboard que puedes construir

Con esta API puedes crear visualizaciones PRO:

### 🔥 Métricas Clave
- ✅ % grasa vs CHO en tiempo real
- ✅ TSS acumulado (mejor que Suffer Score)
- ✅ TRIMP para carga real
- ✅ Carga aeróbica vs anaeróbica
- ✅ IF (Intensity Factor)
- ✅ W/kg en subidas
- ✅ %VO2max usado
- ✅ Tiempo en FatMax
- ✅ Aerobic decoupling (fatiga)
- ✅ Depleción estimada de glucógeno

### 🧠 Análisis Avanzados
- **Eficiencia mecánica** personalizada
- **Capacidad de oxidar grasa** (g/h)
- **Balance energético** (grasas vs CHO)
- **Carga interna** vs externa
- **Predicción de recuperación** (TSS/TRIMP)

---

## 🚀 Ejemplo de Uso

```javascript
// Frontend - Obtener actividad con analítica
const response = await fetch(
  `/strava/activities/123456?streams=true`,
  {
    headers: {
      'Authorization': `Bearer ${jwt}`
    }
  }
);

const data = await response.json();

// Mostrar métricas avanzadas
console.log('TSS:', data.analytics.load.tss);
console.log('CHO consumidos:', data.analytics.substrate.cho_grams, 'g');
console.log('Grasa quemada:', data.analytics.substrate.fat_grams, 'g');
console.log('IF:', data.analytics.substrate.intensity_factor);
console.log('Fatiga aeróbica:', data.analytics.efficiency.aerobic_decoupling.decoupling, '%');
```

---

## ⚡ Ventajas sobre Strava

| Métrica | Strava | Tu App |
|---------|--------|--------|
| Calorías | Básicas | Metabólicas reales |
| Sustrato | ❌ | ✅ % Grasa/CHO + gramos |
| TSS | ❌ | ✅ Calculado |
| TRIMP | ❌ | ✅ Calculado |
| VO2 sesión | ❌ | ✅ Estimado |
| Eficiencia | ❌ | ✅ EF + Decoupling |
| FatMax | ❌ | ✅ Análisis completo |
| W/kg | Básico | ✅ NP y promedio |
| Glucógeno | ❌ | ✅ Depleción estimada |

---

## 🔧 Configuración Necesaria

Para obtener analítica completa, el usuario debe configurar su perfil:

```json
{
  "ftp": 250,         // Watts (obligatorio para IF, TSS, sustrato preciso)
  "weight_kg": 70,    // kg (obligatorio para W/kg, VO2)
  "hr_max": 190,      // bpm (obligatorio para TRIMP, %FC)
  "hr_rest": 50,      // bpm (obligatorio para TRIMP)
  "vo2max": 55,       // ml/kg/min (opcional, mejora análisis)
  "height_cm": 175    // cm (opcional)
}
```

**Endpoint para guardar perfil:**
```http
PUT /profile
```

---

## 📝 Notas Técnicas

### Precisión de cálculos:
- **TSS**: Preciso si NP (weighted_average_watts) está disponible
- **Sustrato (IF)**: Muy preciso para ciclismo con potenciómetro
- **Sustrato (HR)**: Razonable si no hay potencia
- **VO2**: Estimado (±10% típico)
- **Glucógeno**: Estimación basada en fisiología estándar

### Limitaciones:
- Requiere datos completos de perfil para máxima precisión
- Streams necesarios para aerobic decoupling
- Fórmulas basadas en literatura científica pero individuales pueden variar

---

## 🎯 Próximos Pasos

Puedes expandir con:
- **VLamax**: Capacidad glucolítica (requiere tests específicos)
- **FatMax real**: En lugar de estimado (requiere test laboratorio)
- **Predicción de rendimiento**: Modelos de fatiga
- **Periodización automática**: Sugerencias basadas en carga
- **Comparación histórica**: Evolución de métricas

---

**¡Ahora tienes analítica de nivel TrainingPeaks/INSCYD! 🚀**
