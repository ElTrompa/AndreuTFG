import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import HexPowerChart, { durationsOrder } from './HexPowerChart';
import TimeInZoneChart from './TimeInZoneChart';

type Props = {
  powerMap: Record<string, number>;
  images?: string[]; // optional file URIs or asset requires
  weightKg?: number | null;
  activities?: any[];
  profile?: any;
};

// Umbrales de potencia reales por duración y nivel
const powerThresholds: Record<string, number[]> = {
  '5s': [500, 650, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200],
  '15s': [350, 450, 550, 700, 850, 1000, 1150, 1300, 1450, 1600],
  '30s': [280, 350, 420, 520, 620, 720, 820, 920, 1000, 1100],
  '1m': [220, 280, 340, 420, 480, 560, 630, 700, 760, 820],
  '2m': [190, 240, 300, 360, 430, 500, 560, 620, 680, 730],
  '3m': [170, 220, 270, 330, 400, 460, 520, 580, 630, 680],
  '5m': [150, 200, 250, 300, 360, 420, 480, 530, 580, 630],
  '10m': [130, 180, 220, 270, 320, 380, 430, 480, 520, 580],
  '15m': [120, 165, 205, 250, 300, 355, 405, 450, 490, 550],
  '20m': [110, 155, 195, 240, 285, 340, 390, 430, 470, 530],
  '30m': [100, 145, 180, 225, 270, 320, 370, 410, 450, 500],
  '45m': [90, 135, 170, 215, 255, 300, 350, 390, 430, 470],
  '1h': [85, 130, 160, 205, 245, 290, 340, 375, 410, 450]
};

const levels = [
  { level:1, name:'Principiante', desc:'Recién empiezas' },
  { level:2, name:'Recreativo Bajo', desc:'Sales 1-2 veces/semana' },
  { level:3, name:'Recreativo Medio', desc:'Entrenas 2-3 veces/semana' },
  { level:4, name:'Recreativo Alto', desc:'Entrenamiento estructurado' },
  { level:5, name:'Amateur Competitivo', desc:'Marchas locales' },
  { level:6, name:'Amateur Avanzado', desc:'Competiciones regionales' },
  { level:7, name:'Elite Regional', desc:'Top regional' },
  { level:8, name:'Elite Nacional', desc:'Podios nacionales' },
  { level:9, name:'Profesional Continental', desc:'Nivel profesional' },
  { level:10, name:'Profesional World Tour', desc:'Élite mundial' }
];

// Calcular nivel basado en umbrales absolutos
function getLevelForDuration(duration: string, watts: number): { level: number; name: string; desc: string; missingW: number; nextThreshold: number } {
  const thresholds = powerThresholds[duration] || [];
  if (thresholds.length === 0 || watts < thresholds[0]) {
    return { level: 0, name: 'Sin categoría', desc: 'Empieza a entrenar', missingW: thresholds[0] ? Math.round(thresholds[0] - watts) : 0, nextThreshold: thresholds[0] || 0 };
  }
  
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (watts >= thresholds[i]) {
      const nextThreshold = i < thresholds.length - 1 ? thresholds[i + 1] : thresholds[i];
      const missingW = i < thresholds.length - 1 ? Math.round(nextThreshold - watts) : 0;
      return { 
        level: i + 1, 
        name: levels[i].name, 
        desc: levels[i].desc,
        missingW,
        nextThreshold
      };
    }
  }
  
  return { level: 0, name: 'Sin categoría', desc: 'Empieza a entrenar', missingW: thresholds[0] - watts, nextThreshold: thresholds[0] };
}

// Analizar perfil del ciclista (escalador, sprinter, rodador)
function analyzeCyclistProfile(powerMap: Record<string, number>): { type: string; emoji: string; description: string; strengths: string[]; improvements: string[] } {
  const sprint5s = powerMap['5s'] || 0;
  const sprint15s = powerMap['15s'] || 0;
  const tempo5m = powerMap['5m'] || 0;
  const tempo10m = powerMap['10m'] || 0;
  const endurance30m = powerMap['30m'] || 0;
  const endurance1h = powerMap['1h'] || 0;
  
  // Normalizar potencias por umbrales de nivel 5 (amateur competitivo)
  const sprintScore = ((sprint5s / 1200) + (sprint15s / 850)) / 2;
  const tempoScore = ((tempo5m / 360) + (tempo10m / 320)) / 2;
  const enduranceScore = ((endurance30m / 270) + (endurance1h / 245)) / 2;
  
  // Determinar perfil dominante
  if (sprintScore > tempoScore && sprintScore > enduranceScore) {
    return {
      type: '⚡ SPRINTER',
      emoji: '🚀',
      description: 'Tienes una explosividad destacada en esfuerzos cortos. Perfecto para llegadas masivas y ataques puntuales.',
      strengths: [
        'Potencia máxima explosiva',
        'Aceleraciones rápidas',
        'Sprints finales'
      ],
      improvements: [
        'Mejorar resistencia aeróbica',
        'Trabajar esfuerzos de 20-60 minutos',
        'Aumentar FTP para mantener grupo'
      ]
    };
  } else if (enduranceScore > sprintScore && enduranceScore > tempoScore) {
    return {
      type: '🏔️ ESCALADOR',
      emoji: '⛰️',
      description: 'Destacas en esfuerzos prolongados. Ideal para puertos largos donde la relación W/kg es clave.',
      strengths: [
        'Resistencia aeróbica superior',
        'Capacidad en esfuerzos > 20min',
        'Recuperación eficiente'
      ],
      improvements: [
        'Trabajar potencia explosiva (< 1min)',
        'Series de sprint',
        'Mejorar aceleraciones en rampa'
      ]
    };
  } else {
    return {
      type: '🚴 RODADOR',
      emoji: '💨',
      description: 'Perfil equilibrado con buen umbral. Perfecto para contrarrelojes y tirar del grupo en llano.',
      strengths: [
        'Umbral de lactato alto',
        'Mantener ritmo constante',
        'Versatilidad táctica'
      ],
      improvements: [
        'Especializar según objetivos',
        'Trabajar tanto sprint como subida',
        'Optimizar aerodinámica'
      ]
    };
  }
}

export default function PotenciaScreen({ powerMap, images, weightKg, activities = [], profile }: Props){
  // Análisis de perfil del ciclista
  const cyclistProfile = analyzeCyclistProfile(powerMap);
  
  // build detailed list per duration con niveles reales
  const rows = durationsOrder.map(d => {
    const v = powerMap[d] || 0;
    const levelData = getLevelForDuration(d, v);
    const wkg = weightKg ? Number((v / weightKg).toFixed(2)) : undefined;
    const missingWkg = weightKg && levelData.missingW ? Number((levelData.missingW / weightKg).toFixed(2)) : undefined;
    const currentThreshold = levelData.level > 0 ? powerThresholds[d][levelData.level - 1] : 0;
    const progress = levelData.level > 0 && levelData.nextThreshold > currentThreshold 
      ? (v - currentThreshold) / (levelData.nextThreshold - currentThreshold)
      : 0;
    return { 
      d, 
      v, 
      wkg, 
      level: levelData.level, 
      name: levelData.name,
      desc: levelData.desc,
      missingW: levelData.missingW, 
      missingWkg, 
      progress: Math.max(0, Math.min(1, progress))
    };
  });
  // categories and grouping
  const sprint = ['5s','15s','30s','1m'];
  const ataque = ['2m','3m','5m','10m'];
  const ascenso = ['15m','20m','30m','45m','1h'];
  const [openCat, setOpenCat] = useState<'Sprint'|'Ataque'|'Ascenso'|null>('Sprint');

  useEffect(()=>{
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  },[]);

  const renderCategory = (name:string, list:string[])=> (
    <View style={styles.category} key={name}>
      <TouchableOpacity style={styles.catHeader} onPress={()=>{ LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpenCat(openCat===name? null : (name as any)); }}>
        <Text style={styles.catTitle}>{name}</Text>
        <Text style={styles.catToggle}>{openCat===name ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {openCat===name && (
        <View style={styles.catBody}>
          {list.map(d=>{
            const r = rows.find(rr=>rr.d===d)!;
            return (
              <View key={d} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.duration}>{r.d}</Text>
                  <Text style={styles.wval}>{Math.round(r.v)} W{r.wkg !== undefined ? ` · ${r.wkg} W/kg` : ''}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.levelText}>Nivel {r.level} — {r.name}</Text>
                  {r.missingW > 0 ? (
                    <Text style={styles.missing}>Faltan {r.missingW} W{r.missingWkg ? ` (${r.missingWkg} W/kg)` : ''} para subir</Text>
                  ) : (
                    <Text style={[styles.missing, {color: '#2ecc71', fontWeight: '600'}]}>¡Nivel máximo! 🏆</Text>
                  )}
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: Math.max(6, Math.round(r.progress * 100)) + '%' }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Potencia</Text>

      {/* Análisis de perfil del ciclista */}
      <View style={styles.profileCard}>
        <Text style={styles.profileType}>{cyclistProfile.type}</Text>
        <Text style={styles.profileEmoji}>{cyclistProfile.emoji}</Text>
        <Text style={styles.profileDesc}>{cyclistProfile.description}</Text>
        
        <View style={{marginTop: 12}}>
          <Text style={styles.profileSubtitle}>💪 Fortalezas:</Text>
          {cyclistProfile.strengths.map((s, i) => (
            <Text key={i} style={styles.profileListItem}>• {s}</Text>
          ))}
        </View>
        
        <View style={{marginTop: 8}}>
          <Text style={styles.profileSubtitle}>🎯 A mejorar:</Text>
          {cyclistProfile.improvements.map((s, i) => (
            <Text key={i} style={styles.profileListItem}>• {s}</Text>
          ))}
        </View>
      </View>

      <View style={styles.chartWrap}>
        <HexPowerChart values={powerMap} size={360} weightKg={weightKg} />
      </View>

      <View style={styles.detailList}>
        <Text style={styles.sectionTitle}>Detalles por categoría</Text>
        {renderCategory('Sprint', sprint)}
        {renderCategory('Ataque', ataque)}
        {renderCategory('Ascenso', ascenso)}
      </View>

      <View style={{marginTop:12}}>
        <Text style={styles.sectionTitle}>Tiempo en zonas (basado en FTP)</Text>
        <TimeInZoneChart activities={activities} powerMap={powerMap} profile={profile} />
      </View>

      <View style={styles.samples}>
        <Text style={styles.sectionTitle}>Ejemplos / Inspiración</Text>
        {images && images.length > 0 ? images.map((src, i) => (
          <Image key={i} source={{ uri: src }} style={styles.sampleImg} resizeMode="cover" />
        )) : (
          <Text style={styles.hint}>Coloca las imágenes en /frontend/assets/imagenesMuestra o pasa las rutas al componente.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, backgroundColor: '#f6fbfc' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  profileCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: '#2b9aa3' },
  profileType: { fontSize: 20, fontWeight: '700', color: '#0b4860', marginBottom: 4 },
  profileEmoji: { fontSize: 32, marginBottom: 8 },
  profileDesc: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 8 },
  profileSubtitle: { fontSize: 14, fontWeight: '700', color: '#0b4860', marginBottom: 4 },
  profileListItem: { fontSize: 13, color: '#555', marginLeft: 8, marginBottom: 2 },
  chartWrap: { alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  detailList: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 12 },
  category: { marginBottom: 8 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  catTitle: { fontWeight: '700' },
  catToggle: { color: '#666' },
  catBody: { paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: '#f0f6f7', borderBottomWidth: 1 },
  rowLeft: { flexDirection: 'column' },
  rowRight: { alignItems: 'flex-end', width: 200 },
  duration: { fontWeight: '700' },
  wval: { color: '#0b4860' },
  levelText: { fontWeight: '700' },
  missing: { color: '#666', fontSize: 12 },
  progressBar: { width: 120, height: 8, backgroundColor: '#e9f6f6', borderRadius: 6, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2b9aa3' },
  samples: { marginTop: 8 },
  sampleImg: { width: '100%', height: 180, borderRadius: 8, marginBottom: 10 },
  hint: { color: '#666' }
});
