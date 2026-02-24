import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

type Props = {
  activityId: number;
  jwt: string | null;
  profile: any;
  apiBase?: string;
  onBack: () => void;
};

function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    
    points.push([lat * 1e-5, lng * 1e-5]);
  }
  return points;
}

export default function ActivityDetailScreen({ activityId, jwt, profile, apiBase = 'http://localhost:3001', onBack }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jwt || !activityId) return;
    setLoading(true);
    setError(null);
    
    fetch(`${apiBase}/strava/activities/${activityId}?streams=true&stream_keys=time,watts,heartrate,cadence,temp,altitude,distance,latlng,velocity_smooth`, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Error al cargar actividad');
        setLoading(false);
      });
  }, [activityId, jwt]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando actividad...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <TouchableOpacity style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data || !data.activity) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Sin datos</Text>
        <TouchableOpacity style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { activity, streams, analytics } = data;
  const sport = activity.sport_type || activity.type || 'Ride';
  const isCycling = sport.toLowerCase().includes('ride') || sport.toLowerCase().includes('cycling') || sport.toLowerCase().includes('bike');

  // Extraer streams
  let latlngData: [number, number][] = [];
  let wattsData: number[] = [];
  let hrData: number[] = [];
  let cadenceData: number[] = [];
  let tempData: number[] = [];
  let altitudeData: number[] = [];
  let distanceData: number[] = [];
  let timeData: number[] = [];
  let velocityData: number[] = [];

  if (streams && Array.isArray(streams)) {
    const latlngStream = streams.find((s: any) => s.type === 'latlng');
    const wattsStream = streams.find((s: any) => s.type === 'watts');
    const hrStream = streams.find((s: any) => s.type === 'heartrate');
    const cadenceStream = streams.find((s: any) => s.type === 'cadence');
    const tempStream = streams.find((s: any) => s.type === 'temp');
    const altitudeStream = streams.find((s: any) => s.type === 'altitude');
    const distanceStream = streams.find((s: any) => s.type === 'distance');
    const timeStream = streams.find((s: any) => s.type === 'time');
    const velocityStream = streams.find((s: any) => s.type === 'velocity_smooth');

    if (latlngStream && Array.isArray(latlngStream.data)) latlngData = latlngStream.data;
    if (wattsStream && Array.isArray(wattsStream.data)) wattsData = wattsStream.data;
    if (hrStream && Array.isArray(hrStream.data)) hrData = hrStream.data;
    if (cadenceStream && Array.isArray(cadenceStream.data)) cadenceData = cadenceStream.data;
    if (tempStream && Array.isArray(tempStream.data)) tempData = tempStream.data;
    if (altitudeStream && Array.isArray(altitudeStream.data)) altitudeData = altitudeStream.data;
    if (distanceStream && Array.isArray(distanceStream.data)) distanceData = distanceStream.data;
    if (timeStream && Array.isArray(timeStream.data)) timeData = timeStream.data;
    if (velocityStream && Array.isArray(velocityStream.data)) velocityData = velocityStream.data.map((v: number) => v * 3.6);
  }

  // Calcular velocidad desde distancia y tiempo si no hay velocity stream
  if (velocityData.length === 0 && distanceData.length > 0 && timeData.length > 0) {
    for (let i = 1; i < distanceData.length; i++) {
      const distDiff = distanceData[i] - distanceData[i - 1];
      const timeDiff = timeData[i] - timeData[i - 1];
      if (timeDiff > 0) {
        velocityData.push((distDiff / timeDiff) * 3.6);
      } else {
        velocityData.push(0);
      }
    }
  }

  // Calcular velocidad máxima
  const maxSpeed = velocityData.length > 0 ? Math.max(...velocityData) : activity.max_speed ? activity.max_speed * 3.6 : 0;

  // Calcular nutrición y sustrato energético
  const calculateNutrition = () => {
    if (!profile) return null;

    const duration = activity.moving_time || activity.elapsed_time || 0;
    const durationHours = duration / 3600;
    const calories = activity.calories || 0;

    // Calcular intensidad promedio
    let intensity = 0;
    
    // Priorizar potencia normalizada si hay FTP
    if (analytics?.normalized_power && profile.ftp) {
      intensity = (analytics.normalized_power / profile.ftp) * 100;
    } 
    // Si no, usar FC promedio con FC max
    else if (activity.average_heartrate && profile.hr_max) {
      intensity = (activity.average_heartrate / profile.hr_max) * 100;
    }
    // Si no hay datos, usar potencia promedio
    else if (activity.average_watts && profile.ftp) {
      intensity = (activity.average_watts / profile.ftp) * 100;
    }

    // Si no hay suficientes datos, no mostrar
    if (intensity === 0 || calories === 0) return null;

    // Determinar % de sustrato según intensidad
    let carbsPercent = 50;
    if (intensity < 55) {
      carbsPercent = 40;
    } else if (intensity < 75) {
      carbsPercent = 60;
    } else if (intensity < 85) {
      carbsPercent = 75;
    } else if (intensity < 95) {
      carbsPercent = 85;
    } else {
      carbsPercent = 95;
    }

    const fatsPercent = 100 - carbsPercent;

    // Calcular calorías y gramos
    const carbsCalories = calories * (carbsPercent / 100);
    const fatsCalories = calories * (fatsPercent / 100);
    const carbsGrams = carbsCalories / 4; // 4 kcal por gramo de carbohidratos
    const fatsGrams = fatsCalories / 9; // 9 kcal por gramo de grasas

    // Recomendación de carbohidratos por hora basada en peso e intensidad
    let carbsRecommendation = '';
    let intensityLevel = '';
    
    if (!profile.weight_kg) {
      carbsRecommendation = 'Configura tu peso en el perfil para obtener recomendaciones personalizadas';
      intensityLevel = intensity < 55 ? 'Baja' : intensity < 75 ? 'Moderada' : intensity < 85 ? 'Alta' : 'Muy Alta';
    } else {
      // Determinar coeficientes según intensidad
      let minCoef = 0;
      let maxCoef = 0;
      
      if (intensity < 55) {
        intensityLevel = 'Baja';
        minCoef = 0.3;
        maxCoef = 0.5;
      } else if (intensity < 75) {
        intensityLevel = 'Moderada';
        minCoef = 0.5;
        maxCoef = 0.8;
      } else if (intensity < 85) {
        intensityLevel = 'Alta';
        minCoef = 0.8;
        maxCoef = 1.2;
      } else {
        intensityLevel = 'Muy Alta';
        minCoef = 1.0;
        maxCoef = 1.5;
      }

      // Ajuste adicional por duración
      if (durationHours < 1) {
        minCoef = 0;
        maxCoef = 0.5;
        carbsRecommendation = `${Math.round(minCoef * profile.weight_kg)}-${Math.round(maxCoef * profile.weight_kg)}g/h (no es crítico para <1h)`;
      } else if (durationHours > 2.5) {
        // Para duraciones largas, aumentar el límite superior
        maxCoef = Math.min(maxCoef + 0.3, 2.0);
        carbsRecommendation = `${Math.round(minCoef * profile.weight_kg)}-${Math.round(maxCoef * profile.weight_kg)}g/h`;
        if (maxCoef > 1.2) {
          carbsRecommendation += ' (requiere entrenamiento intestinal)';
        }
      } else {
        carbsRecommendation = `${Math.round(minCoef * profile.weight_kg)}-${Math.round(maxCoef * profile.weight_kg)}g/h`;
      }
      
      carbsRecommendation += ` para ${profile.weight_kg}kg a intensidad ${intensityLevel.toLowerCase()}`;
    }

    return {
      intensity: intensity.toFixed(1),
      intensityLevel,
      carbsPercent: carbsPercent.toFixed(0),
      fatsPercent: fatsPercent.toFixed(0),
      carbsGrams: carbsGrams.toFixed(0),
      fatsGrams: fatsGrams.toFixed(0),
      carbsRecommendation,
      durationHours: durationHours.toFixed(1)
    };
  };

  const nutrition = calculateNutrition();

  // Si no hay latlng stream pero hay polyline, decodificarlo
  if (latlngData.length === 0 && activity.map && activity.map.summary_polyline) {
    latlngData = decodePolyline(activity.map.summary_polyline);
  }

  const renderMap = () => {
    if (latlngData.length === 0) {
      return <Text style={styles.noData}>No hay datos de mapa disponibles</Text>;
    }

    // Calcular bounding box
    const lats = latlngData.map(p => p[0]);
    const lngs = latlngData.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;

    const svgWidth = screenWidth - 32;
    const svgHeight = 250;
    const padding = 20;

    // Proyectar lat/lng a SVG
    const project = (lat: number, lng: number): [number, number] => {
      const x = padding + ((lng - minLng) / lngRange) * (svgWidth - 2 * padding);
      const y = svgHeight - padding - ((lat - minLat) / latRange) * (svgHeight - 2 * padding);
      return [x, y];
    };

    const pathPoints = latlngData.map(p => project(p[0], p[1]));
    const pathD = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');

    const svg = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${svgWidth}" height="${svgHeight}" fill="#e5e7eb"/>
      <path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${pathPoints[0][0]}" cy="${pathPoints[0][1]}" r="5" fill="#10b981"/>
      <circle cx="${pathPoints[pathPoints.length - 1][0]}" cy="${pathPoints[pathPoints.length - 1][1]}" r="5" fill="#ef4444"/>
    </svg>`;

    return <SvgXml xml={svg} width={svgWidth} height={svgHeight} />;
  };

  const renderChart = (data: number[], label: string, color: string, unit: string) => {
    if (data.length === 0) return null;

    const chartWidth = screenWidth - 32;
    const chartHeight = 150;
    const padding = 30;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;

    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;

    const scale = (val: number) => {
      const normalized = (val - minVal) / range;
      return padding + graphHeight - (normalized * graphHeight);
    };

    const step = Math.max(1, Math.floor(data.length / (graphWidth / 2)));
    const points = data
      .filter((_, i) => i % step === 0)
      .map((d, i) => {
        const x = padding + (i / (data.length / step - 1 || 1)) * graphWidth;
        const y = scale(d);
        return `${x},${y}`;
      })
      .join(' ');

    const svg = `<svg width="${chartWidth}" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${chartWidth}" height="${chartHeight}" fill="#ffffff"/>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${chartHeight - padding}" stroke="#e5e7eb" stroke-width="1"/>
      <line x1="${padding}" y1="${chartHeight - padding}" x2="${chartWidth - padding}" y2="${chartHeight - padding}" stroke="#e5e7eb" stroke-width="1"/>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="${padding}" y="${padding - 5}" font-size="12" fill="#6b7280">${label} (${unit})</text>
      <text x="${chartWidth - padding}" y="${chartHeight - padding + 15}" font-size="10" fill="#9ca3af" text-anchor="end">Max: ${Math.round(maxVal)}</text>
    </svg>`;

    return (
      <View style={styles.chartCard}>
        <SvgXml xml={svg} width={chartWidth} height={chartHeight} />
      </View>
    );
  };

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{activity.name}</Text>
        <Text style={styles.subtitle}>{sport} · {new Date(activity.start_date).toLocaleDateString()}</Text>
      </View>

      {/* Resumen */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Distancia</Text>
            <Text style={styles.summaryValue}>{((activity.distance || 0) / 1000).toFixed(2)} km</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Duración</Text>
            <Text style={styles.summaryValue}>{Math.round((activity.moving_time || 0) / 60)} min</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Velocidad media</Text>
            <Text style={styles.summaryValue}>{((activity.average_speed || 0) * 3.6).toFixed(1)} km/h</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Velocidad máxima</Text>
            <Text style={styles.summaryValue}>{maxSpeed.toFixed(1)} km/h</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Desnivel</Text>
            <Text style={styles.summaryValue}>{Math.round(activity.total_elevation_gain || 0)} m</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Calorías</Text>
            <Text style={styles.summaryValue}>{Math.round(activity.calories || 0)}</Text>
          </View>
        </View>
        {isCycling && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Potencia media</Text>
              <Text style={styles.summaryValue}>{Math.round(activity.average_watts || 0)} W</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>FC media</Text>
              <Text style={styles.summaryValue}>{Math.round(activity.average_heartrate || 0)} bpm</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cadencia media</Text>
              <Text style={styles.summaryValue}>{Math.round(activity.average_cadence || 0)} rpm</Text>
            </View>
          </View>
        )}
      </View>

      {/* Mapa */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Recorrido</Text>
        {renderMap()}
      </View>

      {/* Gráficos */}
      {velocityData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚴 Velocidad</Text>
          {renderChart(velocityData, 'Velocidad', '#06b6d4', 'km/h')}
        </View>
      )}

      {isCycling && wattsData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ Potencia</Text>
          {renderChart(wattsData, 'Potencia', '#f59e0b', 'W')}
        </View>
      )}

      {hrData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>❤️ Frecuencia cardíaca</Text>
          {renderChart(hrData, 'FC', '#ef4444', 'bpm')}
        </View>
      )}

      {isCycling && cadenceData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔄 Cadencia</Text>
          {renderChart(cadenceData, 'Cadencia', '#3b82f6', 'rpm')}
        </View>
      )}

      {tempData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌡️ Temperatura</Text>
          {renderChart(tempData, 'Temperatura', '#10b981', '°C')}
        </View>
      )}

      {altitudeData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⛰️ Altitud</Text>
          {renderChart(altitudeData, 'Altitud', '#8b5cf6', 'm')}
        </View>
      )}

      {/* Analytics */}
      {analytics && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Análisis</Text>
          <View style={styles.analyticsRow}>
            <Text style={styles.analyticsLabel}>TSS:</Text>
            <Text style={styles.analyticsValue}>{Math.round(analytics.tss || 0)}</Text>
          </View>
          <View style={styles.analyticsRow}>
            <Text style={styles.analyticsLabel}>IF:</Text>
            <Text style={styles.analyticsValue}>{(analytics.intensity_factor || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.analyticsRow}>
            <Text style={styles.analyticsLabel}>NP:</Text>
            <Text style={styles.analyticsValue}>{Math.round(analytics.normalized_power || 0)} W</Text>
          </View>
        </View>
      )}

      {/* Nutrición y Sustrato Energético */}
      {nutrition && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🍎 Nutrición y Sustrato Energético</Text>
          
          <View style={styles.nutritionSection}>
            <Text style={styles.nutritionSubtitle}>Intensidad promedio: {nutrition.intensity}%</Text>
          </View>

          <View style={styles.nutritionSection}>
            <Text style={styles.nutritionLabel}>Sustrato energético utilizado:</Text>
            <View style={styles.substrateBar}>
              <View style={[styles.substrateCarbs, { flex: parseFloat(nutrition.carbsPercent) }]}>
                <Text style={styles.substrateText}>{nutrition.carbsPercent}% Carbohidratos</Text>
              </View>
              <View style={[styles.substrateFats, { flex: parseFloat(nutrition.fatsPercent) }]}>
                <Text style={styles.substrateText}>{nutrition.fatsPercent}% Grasas</Text>
              </View>
            </View>
          </View>

          <View style={styles.nutritionSection}>
            <Text style={styles.nutritionLabel}>Carbohidratos consumidos:</Text>
            <Text style={styles.nutritionValue}>{nutrition.carbsGrams}g ({Math.round(parseFloat(nutrition.carbsGrams) / parseFloat(nutrition.durationHours))}g/hora)</Text>
          </View>

          <View style={styles.nutritionSection}>
            <Text style={styles.nutritionLabel}>Grasas consumidas:</Text>
            <Text style={styles.nutritionValue}>{nutrition.fatsGrams}g</Text>
          </View>

          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>💡 Recomendación de Carbohidratos</Text>
            <Text style={styles.recommendationText}>
              Intensidad: <Text style={styles.boldText}>{nutrition.intensityLevel}</Text> ({nutrition.intensity}%)
            </Text>
            <Text style={styles.recommendationText}>
              Duración: <Text style={styles.boldText}>{nutrition.durationHours}h</Text>
            </Text>
            <Text style={styles.recommendationValue}>{nutrition.carbsRecommendation}</Text>
            {profile?.weight_kg && (
              <Text style={styles.recommendationHint}>
                Esta recomendación está ajustada según tu peso y la intensidad del ejercicio.
              </Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  noData: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  chartCard: {
    marginTop: 8,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  analyticsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  nutritionSection: {
    marginBottom: 16,
  },
  nutritionSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  nutritionLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  substrateBar: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  substrateCarbs: {
    backgroundColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  substrateFats: {
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  substrateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  recommendationBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    marginTop: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 6,
    lineHeight: 18,
  },
  recommendationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginTop: 4,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  recommendationHint: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
