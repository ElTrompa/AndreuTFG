import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  activities: any[];
};

function getWeekStart(d: Date){
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  copy.setDate(diff);
  copy.setHours(0,0,0,0);
  return copy;
}

export default function ProyeccionesScreen({ activities }: Props){
  const now = new Date();
  const year = now.getFullYear();

  const data = useMemo(()=>{
    // filter this year
    const thisYear = activities.filter(a => a.start_date && new Date(a.start_date).getFullYear() === year);
    const totalKm = thisYear.reduce((acc,a) => acc + ((a.distance||0)/1000), 0);

    // weeks passed in year
    const startOfYear = new Date(year,0,1);
    const weeksPassed = Math.max(1, Math.floor((now.getTime() - startOfYear.getTime()) / (7*24*3600*1000)) + 1);

    const baselineWeekly = totalKm / weeksPassed;

    // compute last 6 weeks weekly km
    const sixWeeksAgo = new Date(now.getTime() - 6 * 7 * 24 * 3600 * 1000);
    const recent = activities.filter(a => a.start_date && new Date(a.start_date) >= sixWeeksAgo);
    const recentKm = recent.reduce((acc,a) => acc + ((a.distance||0)/1000), 0);
    const avgLast6 = recentKm / 6;

    // trend factor
    const trendFactor = avgLast6 / Math.max(0.0001, baselineWeekly);

    const weeksRemaining = Math.max(0, 52 - weeksPassed);
    
    // Proyección: kilómetros actuales + tendencia de últimas 6 semanas aplicada al resto del año
    const projectedByTrend = totalKm + avgLast6 * weeksRemaining;

    return { totalKm, weeksPassed, baselineWeekly, avgLast6, trendFactor, projectedByTrend };
  }, [activities]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Proyecciones</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Km acumulados este año</Text>
        <Text style={styles.value}>{Math.round(data.totalKm)} km</Text>
        <Text style={styles.label}>Semanas transcurridas</Text>
        <Text style={styles.value}>{data.weeksPassed}</Text>
        <Text style={styles.label}>Media semanal (todo el año)</Text>
        <Text style={styles.value}>{Math.round(data.baselineWeekly)} km</Text>
        <Text style={styles.label}>Media últimas 6 semanas</Text>
        <Text style={styles.value}>{Math.round(data.avgLast6)} km</Text>
        <Text style={styles.label}>Factor de tendencia</Text>
        <Text style={styles.value}>{data.trendFactor.toFixed(2)}x</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>📊 Proyección al año</Text>
        
        <View style={styles.projectionItem}>
          <Text style={styles.projValue}>{Math.round(data.projectedByTrend)} km</Text>
          <Text style={styles.projHint}>
            Basado en últimas 6 semanas: {Math.round(data.avgLast6)} km/semana × {52 - data.weeksPassed} semanas restantes + {Math.round(data.totalKm)} km ya realizados
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>📌 Qué significa</Text>
        <Text style={styles.hint}>
          Esta proyección toma tu ritmo de las últimas 6 semanas y lo multiplica por las semanas que quedan hasta fin de año, sumándolo a tus kilómetros actuales.
        </Text>
        <Text style={styles.hint}>
          Es más realista que proyectar solo tu promedio anual, ya que refleja tu rendimiento reciente.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 },
  label: { color: '#666', fontSize: 12 },
  value: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  section: { fontWeight: '700', marginBottom: 12, fontSize: 16 },
  projectionItem: { marginBottom: 12 },
  projValue: { fontSize: 28, fontWeight: '800', color: '#0b4860', marginBottom: 8 },
  projHint: { color: '#999', fontSize: 12, lineHeight: 18 },
  hint: { color: '#666', fontSize: 12, marginTop: 6, lineHeight: 18 }
});
