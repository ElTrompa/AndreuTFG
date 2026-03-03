# 🏘️ Configuración de la Función Búsqueda por Pueblos

## Problema Identificado

La función de búsqueda de pueblos estaba desactivada porque:

1. ❌ **GOOGLE_MAPS_API_KEY no configurada** - Sin esta clave, no se pueden extraer nombres de pueblos reales
2. ❌ **Athlete ID hardcodeado** - La app usaba '117638' en lugar del ID real del usuario autenticado
3. ❌ **Constraint UNIQUE incorrecto** - La tabla `towns` tenía `UNIQUE(name)` cuando debería ser `UNIQUE(name, province, country)`

## Soluciones Implementadas

### 1. ✅ Agregar GOOGLE_MAPS_API_KEY

El archivo `.env` ahora incluye:
```env
# 🗺️ Google Maps API Key for reverse geocoding (required for towns/pueblos feature)
# Get your key from: https://console.cloud.google.com/
GOOGLE_MAPS_API_KEY=
```

**¿Cómo obtener tu clave?**

1. Ve a https://console.cloud.google.com/
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs y Servicios** → **Biblioteca**
4. Busca y activa **Geocoding API**
5. Ve a **Credenciales** → **Crear Credenciales** → **Clave API**
6. Copia la clave y pégala en `backend/.env`:
   ```env
   GOOGLE_MAPS_API_KEY=AIzaSyD... (tu clave aquí)
   ```

### 2. ✅ Athlete ID Dinámico

Cambios en `RoutesSearchScreen.tsx`:
- ✅ Ahora acepta props: `jwt`, `athlete`, `apiBase`
- ✅ Extrae el athlete ID del JWT o del objeto `athlete` pasado por `App.tsx`
- ✅ Valida que exista un athlete ID antes de hacer requests

Cambios en `App.tsx`:
- ✅ Pasa los props correctos a `RoutesSearchScreen`

### 3. ✅ Mejora de Base de Datos

```sql
-- ANTES (incorrecto):
UNIQUE KEY unique_town (name)

-- AHORA (correcto):
UNIQUE KEY unique_town (name, province, country)
```

Esto permite tener pueblos con el mismo nombre en diferentes provincias/países.

### 4. ✅ Validaciones y Mensajes de Error Mejorados

**Frontend:**
- ✅ Mensaje claro si no se puede determinar el athlete ID
- ✅ Alerta que recuerda configurar GOOGLE_MAPS_API_KEY
- ✅ Información sobre el procesamiento (cuántos procesados vs omisos)

**Backend:**
- ✅ Logs detallados durante el procesamiento batch
- ✅ Información sobre qué pueblos se encontraron en cada actividad
- ✅ Razones claras por las que se omiten actividades

## 🎮 Flujo Completo de Uso

### Paso 1: Configurar Google Maps API
```bash
# Edita backend/.env
GOOGLE_MAPS_API_KEY=AIzaSyD... (tu clave)
```

### Paso 2: Reiniciar el Backend
```bash
cd backend
npm start
```

### Paso 3: En la App, Ir a "Búsqueda por Pueblos"
1. Haz tap en el menú de hamburguesa
2. Selecciona "Búsqueda por Pueblos"
3. Verás un botón "Procesar Actividades" si no hay pueblos aún

### Paso 4: Procesar Actividades
1. Haz tap en "Procesar Actividades"
2. Confirma en el diálogo
3. La app procesará todas tus actividades (puede tomar 1-2 minutos)
4. Extraerá todos los pueblos por los que pasaste

### Paso 5: Buscar y Explorar
- 🔍 Usa la barra de búsqueda para buscar pueblos
- 👆 Haz tap en un pueblo para ver todas las actividades allí
- 📊 Visualiza estadísticas por pueblo

## 📊 Ejemplo de Output

Cuando procesas actividades, verás algo como:
```
✓ ¡Hecho!
Se procesaron 5 actividades
Se omitieron: 2

Pueblos encontrados:
- Barcelona, Cataluña
- Lloret de Mar, Cataluña
- Blanes, Cataluña
- Mataró, Cataluña
- Caldas de Montbui, Cataluña
```

## ⚙️ Modo Fallback (sin API Key)

Si no configuras GOOGLE_MAPS_API_KEY, la app:
- ❌ No extraerá nombres reales de pueblos
- ⚠️ Creará pueblos ficticios basados en coordenadas
- ✅ Será completamente funcional

Esto es útil para testing, pero los pueblos no serán útiles.

## 🐛 Debugging

Si algo no funciona:

### 1. Verificar Backend
```bash
cd backend
npm start
```
Busca mensajes como:
```
[Towns] Starting batch processing for athlete 117638
[Towns] Found 15 activities to process
[Towns] Found 3 towns in activity 123456: Barcelona, Lloret de Mar, Blanes
```

### 2. Verificar Consola del Navegador
- Abre DevTools (F12)
- Verifica la sección "Network" para ver requests fallidos
- Busca "athlete_id" en la URL

### 3. Casos Comunes

**"No hay pueblos registrados"**
- ✅ Verifica que GOOGLE_MAPS_API_KEY está en backend/.env
- ✅ Reinicia el backend
- ✅ Asegúrate de que tienes actividades en Strava

**"No se pudieron cargar los pueblos"**
- ✅ Verifica que el backend está corriendo (puerto 3001)
- ✅ Verifica que estás autenticado (jwt debe existir)
- ✅ Revisa la consola backend para errores

**Procesamiento lento**
- ⏳ Es normal, cada actividad hace requests a Google Maps API
- ⏳ ~200ms por actividad
- ⏳ Máx 1-2 minutos para 100 actividades

## 📝 Archivos Modificados

- ✅ `backend/.env` - Agregada GOOGLE_MAPS_API_KEY
- ✅ `backend/db/schema.sql` - Corregido constraint UNIQUE
- ✅ `backend/src/services/towns.js` - Mejorado logging
- ✅ `backend/src/routes/towns.js` - Agregado logging detallado
- ✅ `frontend/components/RoutesSearchScreen.tsx` - Athlete ID dinámico + validaciones
- ✅ `frontend/App.tsx` - Props correctos para RoutesSearchScreen

## ❓ FAQ

**P: ¿Necesito recrear la base de datos?**
R: Sí, ejecuta el script: `npm run migrate` o reinicia el backend con `npm start`

**P: ¿Cuántos pueblos puedo extraer?**
R: Ilimitados. La Google Maps API tiene cuotas (depende de tu plan)

**P: ¿Pueden ser públicos mis pueblos?**
R: No, los pueblos se almacenan asociados a tu athlete_id, nadie más puede verlos

**P: ¿Puedo procesar solo algunas actividades?**
R: Actualmente se procesan todas. Puedes agregar un filtro en futuras versiones.

---

¡Tu función de búsqueda por pueblos está lista para usar! 🎉
