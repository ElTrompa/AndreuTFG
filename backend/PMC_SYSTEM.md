# 📊 Performance Management Chart (PMC)

Sistema de seguimiento de forma, fatiga y frescura basado en TSS (Training Stress Score).

## 🎯 Conceptos Clave

### 1. **ATL (Acute Training Load) - Fatiga** 🔴

- **Qué es**: Promedio exponencial de TSS de los últimos **7 días**
- **Qué mide**: Carga de entrenamiento a corto plazo (fatiga acumulada)
- **Interpretación**:
  - **< 60**: Fatiga baja
  - **60-100**: Fatiga moderada
  - **100-150**: Fatiga alta
  - **> 150**: Fatiga muy alta (riesgo sobreentrenamiento)

### 2. **CTL (Chronic Training Load) - Forma** 🔵

- **Qué es**: Promedio exponencial de TSS de los últimos **42 días**
- **Qué mide**: Fitness/forma física a largo plazo
- **Interpretación**:
  - **< 30**: Forma baja (principiante o desentrenado)
  - **30-60**: Forma en desarrollo
  - **60-100**: Buena forma
  - **100-150**: Muy buena forma (amateur competitivo)
  - **> 150**: Forma excelente (élite)

### 3. **TSB (Training Stress Balance) - Frescura** 🟢

- **Qué es**: CTL - ATL (del día anterior)
- **Qué mide**: Balance entre forma y fatiga (frescura)
- **Interpretación**:
  - **> +25**: Muy fresco (posible pérdida de forma)
  - **+10 a +25**: Fresco (ideal para competición/tests)
  - **-10 a +10**: Equilibrado (óptimo para entrenar)
  - **-10 a -30**: Fatigado (reducir carga)
  - **< -30**: Muy fatigado (descanso obligatorio)

---

## 📈 API Endpoint

### `GET /strava/pmc`

Calcula datos de Performance Management Chart (ATL, CTL, TSB).

**Headers:**
```
Authorization: Bearer {jwt}
```

**Query Parameters:**
- `days` (opcional, default: 90) - Días de historial
- `per_page` (opcional, default: 200) - Actividades por página
- `view` (opcional, default: 'all') - Vista: 'daily', 'weekly', 'monthly', 'all'

**Requisitos:**
- ✅ Usuario debe tener FTP configurado en perfil
- ✅ Actividades deben tener potencia

**Ejemplo:**
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:3001/strava/pmc?days=90&view=all"
```

---

## 📊 Respuesta

```json
{
  "daily": [
    {
      "date": "2026-02-17",
      "tss": 95,
      "atl": 75.3,
      "ctl": 85.2,
      "tsb": 8.9,
      "activities": [...]
    }
  ],
  "weekly": [
    {
      "week_start": "2026-02-16",
      "tss": 450,
      "atl": 75.3,
      "ctl": 85.2,
      "tsb": 8.9,
      "workout_days": 5,
      "avg_tss": 64
    }
  ],
  "monthly": [
    {
      "month": "2026-02",
      "tss": 1800,
      "atl_end": 75.3,
      "ctl_end": 85.2,
      "tsb_end": 8.9,
      "workout_days": 20,
      "avg_tss": 60
    }
  ],
  "summary_week": {
    "current_atl": 75.3,
    "current_ctl": 85.2,
    "current_tsb": 8.9,
    "weekly_tss": 450,
    "avg_tss_per_day": 64,
    "workout_days": 5,
    "status": {
      "fatigue_level": "moderada",
      "form_level": "buena",
      "freshness_level": "equilibrado",
      "recommendation": "Mantén el balance actual"
    }
  },
  "summary_month": {
    "current_atl": 75.3,
    "current_ctl": 85.2,
    "current_tsb": 8.9,
    "monthly_tss": 1800,
    "avg_tss_per_day": 60,
    "workout_days": 20,
    "ctl_change": 15.5,
    "status": {...}
  }
}
```

---

## 🔢 Cálculos

### TSS (Training Stress Score)

```
TSS = (segundos × NP × IF) / (FTP × 3600) × 100
```

Donde:
- **NP** = Normalized Power (weighted_average_watts)
- **IF** = Intensity Factor (NP / FTP)
- **FTP** = Functional Threshold Power

**Ejemplos de TSS típicos:**
- **< 30**: Recuperación
- **30-60**: Fácil
- **60-90**: Moderado
- **90-120**: Duro
- **> 120**: Muy duro

### ATL (Fatiga)

```
ATL_hoy = ATL_ayer + k × (TSS_hoy - ATL_ayer)
```

Donde:
- **k** = 2 / (7 + 1) = 0.25 (constante EMA para 7 días)

### CTL (Forma)

```
CTL_hoy = CTL_ayer + k × (TSS_hoy - CTL_ayer)
```

Donde:
- **k** = 2 / (42 + 1) ≈ 0.047 (constante EMA para 42 días)

### TSB (Frescura)

```
TSB_hoy = CTL_hoy - ATL_ayer
```

---

## 📱 Frontend - HomeScreen

### Características

✅ **3 vistas**: Diaria, Semanal, Mensual  
✅ **Gráfica interactiva**: LineChart con scroll horizontal  
✅ **Métricas destacadas**: ATL, CTL, TSB con colores  
✅ **Estado actual**: Nivel de fatiga, forma y frescura  
✅ **Recomendación**: Consejo basado en estado actual  
✅ **Estadísticas del período**: TSS total, promedio, días entrenados  

### Props

```typescript
interface Props {
  jwt: string | null;
  profile: any;
  onLoadActivities: () => void;
}
```

### Uso

```tsx
import HomeScreen from './components/HomeScreen';

<HomeScreen 
  jwt={jwt} 
  profile={profile} 
  onLoadActivities={handleLoadActivities} 
/>
```

---

## 🎨 Visualización

### Colores de Métricas

- **CTL (Forma)**: 🔵 Azul `#3b82f6`
- **ATL (Fatiga)**: 🔴 Rojo `#ef4444`
- **TSB (Frescura)**: 🟢 Verde `#10b981` (positivo) / 🟠 Naranja `#f59e0b` (negativo)

### Estados

#### Fatiga (ATL)
- **Muy alta**: 🔴 Rojo (> 150)
- **Alta**: 🟠 Naranja (100-150)
- **Moderada**: 🟡 Amarillo (60-100)
- **Baja**: 🟢 Verde (< 60)

#### Forma (CTL)
- **Excelente**: 🔵 Azul oscuro (> 150)
- **Muy buena**: 🔵 Azul (100-150)
- **Buena**: 🟢 Verde (60-100)
- **En desarrollo**: 🟡 Amarillo (30-60)
- **Baja**: ⚪ Gris (< 30)

#### Frescura (TSB)
- **Muy fresco**: 🟢 Verde brillante (> +25)
- **Fresco**: 🟢 Verde (> +10)
- **Equilibrado**: 🟡 Amarillo (-10 a +10)
- **Fatigado**: 🟠 Naranja (-10 a -30)
- **Muy fatigado**: 🔴 Rojo (< -30)

---

## 📊 Estrategias de Entrenamiento

### Para Mejorar Forma (CTL)

1. **Incremento progresivo**: +3-8 TSS/semana
2. **Bloques de carga**: 3 semanas carga + 1 recuperación
3. **TSS semanal objetivo**: 
   - Principiante: 200-300
   - Intermedio: 300-500
   - Avanzado: 500-700
   - Élite: > 700

### Para Evitar Sobreentrenamiento

1. **Monitorizar TSB**: No mantener < -30 por más de 1 semana
2. **Descanso activo**: TSS < 50 en día de recuperación
3. **Semana de descarga**: Reducir 40-50% cada 3-4 semanas

### Para Puesta a Punto (Taper)

1. **10-14 días antes**: Reducir TSS 20-30%
2. **7 días antes**: Reducir TSS 40-50%
3. **Último día**: Sin actividad o muy suave
4. **TSB objetivo competición**: +15 a +25

---

## 🔧 Instalación

### Backend

Ya implementado en:
- `backend/src/services/pmc.js`
- `backend/src/routes/stravaApi.js`

### Frontend

1. Instalar dependencias:
```bash
cd frontend
npm install react-native-chart-kit
```

2. Componente está en:
```
frontend/components/HomeScreen.tsx
```

3. Importar en App.tsx:
```tsx
import HomeScreen from './components/HomeScreen';
```

---

## 🧪 Testing

### Verificar cálculos

```bash
# 1. Obtener TSS de actividades individuales
curl -H "Authorization: Bearer JWT" \
  "http://localhost:3001/strava/activities/ACTIVITY_ID?streams=true"

# Ver: analytics.load.tss

# 2. Obtener PMC completo
curl -H "Authorization: Bearer JWT" \
  "http://localhost:3001/strava/pmc?days=90&view=all"

# 3. Solo vista semanal
curl -H "Authorization: Bearer JWT" \
  "http://localhost:3001/strava/pmc?view=weekly"
```

---

## 📚 Referencias

### Literatura Científica

- **TSS**: Coggan, A. (2003). "Training and Racing Using a Power Meter"
- **CTL/ATL**: Banister, E. (1991). "Modeling human performance in running"
- **PMC**: TrainingPeaks methodology

### Benchmarks Profesionales

| Nivel | CTL típico | TSS semanal |
|-------|-----------|-------------|
| Recreativo | 30-50 | 200-300 |
| Amateur competitivo | 60-90 | 400-600 |
| Elite regional | 90-120 | 600-800 |
| Pro continental | 120-150 | 800-1000 |
| World Tour | > 150 | > 1000 |

---

## ✨ Ventajas sobre Strava

| Característica | Strava | Tu App |
|----------------|--------|--------|
| TSS individual | ❌ | ✅ |
| ATL/CTL/TSB | ❌ | ✅ |
| PMC gráfico | ❌ Premium | ✅ Gratis |
| Vista diaria | ❌ | ✅ |
| Vista semanal | ❌ | ✅ |
| Vista mensual | ❌ | ✅ |
| Recomendaciones | ❌ | ✅ |
| Estado de forma | ❌ | ✅ |

**¡Ahora tienes control total sobre tu carga de entrenamiento! 🚀**
