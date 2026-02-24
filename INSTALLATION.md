# 🚀 Instalación y Configuración - Sistema Completo

## ✅ Nuevas Características Implementadas

### Backend
1. ✅ **Analítica Avanzada** (`backend/src/services/analytics.js`)
   - TSS, TRIMP, sustrato energético, VO2, eficiencia
   
2. ✅ **Sistema PMC** (`backend/src/services/pmc.js`)
   - ATL, CTL, TSB con vistas diaria/semanal/mensual

3. ✅ **Endpoints Nuevos** (`backend/src/routes/stravaApi.js`)
   - `GET /strava/activities/:id?streams=true` - Actividad con analítica completa
   - `GET /strava/pmc` - Performance Management Chart
   - `GET /strava/athlete/zones` - Zonas del atleta
   - `GET /strava/athlete/stats` - Estadísticas

4. ✅ **Servicio Strava Ampliado** (`backend/src/services/strava.js`)
   - `getActivityById()`
   - `getAthleteZones()`
   - `getAthleteStats()`

### Frontend
1. ✅ **HomeScreen** (`frontend/components/HomeScreen.tsx`)
   - Dashboard con PMC completo
   - Gráficas interactivas (diaria/semanal/mensual)
   - Métricas de Forma, Fatiga y Frescura
   - Recomendaciones automáticas
   
2. ✅ **Integración en App.tsx**
   - Componente HomeScreen importado y usado
   
3. ✅ **Sistema de Niveles** (actualizado previamente)
   - 10 niveles con umbrales reales
   - Análisis de perfil ciclista
   - Gráficos mejorados

---

## 📦 Instalación

### 1. Backend (ya está listo)

El backend no necesita nuevas dependencias. Los archivos creados son:
- ✅ `backend/src/services/analytics.js`
- ✅ `backend/src/services/pmc.js`
- ✅ Rutas actualizadas en `stravaApi.js`

### 2. Frontend - Instalar dependencias

**Paso 1: Instalar react-native-chart-kit**

```bash
cd frontend
npm install react-native-chart-kit
```

**Paso 2: Verificar instalación**

```bash
npm list react-native-chart-kit
```

Debería mostrar:
```
react-native-chart-kit@6.12.0
```

**Paso 3: Reiniciar servidor de desarrollo**

```bash
# Si está corriendo, detener (Ctrl+C)
# Luego reiniciar:
npm start
```

---

## 🔧 Configuración Requerida

### Perfil del Usuario

Para que funcionen **todas** las métricas avanzadas, el usuario debe configurar su perfil:

**Obligatorios:**
- ✅ **FTP** (Watts) - Para TSS, IF, zonas, sustrato por potencia
- ✅ **Peso** (kg) - Para W/kg, VO2, glucógeno
- ✅ **FC máxima** (bpm) - Para TRIMP, intensidad HR
- ✅ **FC reposo** (bpm) - Para TRIMP, intensidad HR

**Opcionales (mejoran precisión):**
- ⚪ **VO2max** (ml/kg/min) - Para análisis FatMax
- ⚪ **Altura** (cm) - Para cálculos avanzados

**Cómo configurar:**
1. Ir a la sección "Profile" en la app
2. Completar todos los campos
3. Guardar

---

## 🎯 Cómo Usar

### 1. Pantalla de Inicio (HomeScreen)

**Acceso:** Al iniciar sesión, pantalla principal

**Requisito:** FTP configurado en perfil

**Características:**
- 📊 Gráfica con 3 líneas (CTL, ATL, TSB)
- 🔄 3 vistas: Diario, Semanal, Mensual
- 💪 Métricas destacadas: Forma, Fatiga, Frescura
- 💡 Recomendación automática según estado
- 📈 Estadísticas del período

**Interpretación:**
- **CTL (azul) ↑**: Mejorando forma
- **ATL (rojo) ↑**: Acumulando fatiga
- **TSB (verde)**: 
  - Positivo = Fresco (listo para entrenar duro)
  - Negativo = Fatigado (reducir carga)

### 2. Analítica de Actividad Individual

**Endpoint:** `GET /strava/activities/:id?streams=true`

**Respuesta incluye:**
```json
{
  "activity": {...},
  "profile": {...},
  "analytics": {
    "substrate": {
      "cho_grams": 678,  // Gramos de carbohidratos consumidos
      "fat_grams": 75    // Gramos de grasa oxidados
    },
    "load": {
      "tss": 95,         // Training Stress Score
      "trimp": 156       // TRIMP (carga fisiológica)
    },
    "efficiency": {
      "aerobic_decoupling": {
        "decoupling": -4.6  // % fatiga (-5% o más = fatiga significativa)
      }
    }
  }
}
```

### 3. Sistema PMC

**Endpoint:** `GET /strava/pmc?view=all&days=90`

**Parámetros:**
- `days`: Historial (default: 90)
- `view`: 'daily', 'weekly', 'monthly', 'all'

**Respuesta incluye:**
- Datos diarios con TSS, ATL, CTL, TSB
- Datos semanales agrupados
- Datos mensuales agrupados
- Resumen semanal y mensual
- Estado actual (fatiga, forma, frescura)
- Recomendación

---

## 📊 Guía Rápida de Métricas

### TSS (Training Stress Score)
- **< 30**: Recuperación
- **30-60**: Fácil
- **60-90**: Moderado
- **90-120**: Duro
- **> 120**: Muy duro

### CTL (Forma)
- **< 30**: Principiante
- **30-60**: En desarrollo
- **60-100**: Buena forma
- **100-150**: Muy buena (competitivo)
- **> 150**: Excelente (élite)

### ATL (Fatiga)
- **< 60**: Baja
- **60-100**: Moderada
- **100-150**: Alta
- **> 150**: Muy alta (riesgo)

### TSB (Frescura)
- **> +25**: Muy fresco (posible desentrenar)
- **+10 a +25**: Fresco (ideal competición)
- **-10 a +10**: Equilibrado (entrenar normal)
- **-10 a -30**: Fatigado (reducir)
- **< -30**: Muy fatigado (descanso obligatorio)

---

## 🧪 Testing

### 1. Verificar Backend

```bash
# Terminal 1: Iniciar backend
cd backend
npm start

# Terminal 2: Probar endpoints
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3001/strava/pmc?days=90
```

### 2. Verificar Frontend

```bash
cd frontend
npm start
```

Luego:
1. Iniciar sesión
2. Configurar perfil (especialmente FTP)
3. HomeScreen se cargará automáticamente
4. Debería mostrar gráfica PMC

---

## 🐛 Troubleshooting

### Error: "FTP required in profile"

**Solución:**
1. Ir a "Profile"
2. Configurar FTP (ej: 250W)
3. Guardar
4. Volver a Home

### Error: "Cannot find module 'react-native-chart-kit'"

**Solución:**
```bash
cd frontend
npm install react-native-chart-kit
npm start -- --reset-cache
```

### Error: "No activities found"

**Causas:**
- Usuario sin actividades recientes con potencia
- FTP no configurado
- Actividades muy antiguas (>90 días)

**Solución:**
- Configurar perfil completo
- Aumentar parámetro `days` en endpoint
- Verificar que actividades tengan potencia

### Gráfica no se muestra

**Solución:**
1. Verificar consola del navegador/app
2. Verificar que `react-native-chart-kit` esté instalado
3. Limpiar caché: `npm start -- --reset-cache`

---

## 📚 Documentación Completa

- **Analítica Avanzada**: [`ADVANCED_ANALYTICS.md`](backend/ADVANCED_ANALYTICS.md)
- **Sistema PMC**: [`PMC_SYSTEM.md`](backend/PMC_SYSTEM.md)
- **README General**: [`README.md`](README.md)

---

## 🎯 Próximos Pasos

### Para el Usuario
1. ✅ Instalar dependencias frontend
2. ✅ Configurar perfil completo
3. ✅ Explorar HomeScreen con gráficas PMC
4. ✅ Ver analítica detallada de actividades

### Para el Desarrollador
Posibles mejoras futuras:
- [ ] Caché de datos PMC en backend
- [ ] Notificaciones cuando TSB < -30 (sobreentrenamiento)
- [ ] Predicción de forma futura
- [ ] Comparación con períodos anteriores
- [ ] Exportar datos a CSV/PDF
- [ ] Sincronización automática diaria

---

## ✨ Resumen

**Backend:**
- ✅ Analítica avanzada (8 categorías de métricas)
- ✅ Sistema PMC completo (ATL, CTL, TSB)
- ✅ 4 nuevos endpoints
- ✅ Documentación exhaustiva

**Frontend:**
- ✅ HomeScreen con gráficas PMC3 vistas (diario/semanal/mensual)
- ✅ Métricas visuales (forma, fatiga, frescura)
- ✅ Recomendaciones automáticas
- ✅ Integración con perfil usuario

**Ventaja competitiva:**
- 🚀 Analítica nivel TrainingPeaks/INSCYD **gratis**
- 🚀 PMC completo (solo disponible en Strava Premium)
- 🚀 TSS calculado (Strava no lo proporciona)
- 🚀 Sustrato energético preciso (único en el mercado)

**¡Sistema completo operativo! 🎉**
