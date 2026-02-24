import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';

type Props = {
  jwt: string | null;
  apiBase?: string;
  profile?: any;
  onSelectActivity: (activityId: number) => void;
};

function secondsToHhMm(s:number){
  const h = Math.floor(s/3600); const m = Math.round((s%3600)/60);
  return `${h}h ${m}m`;
}

function estimateCaloriesBreakdown(avgWatts:number, avgHR:number|null, profile:any){
  // Use both power (FTP-based) and heart rate to estimate substrate utilization
  const ftp = profile && profile.ftp ? profile.ftp : null;
  const hrMax = profile && profile.hr_max ? profile.hr_max : null;
  const hrRest = profile && profile.hr_rest ? profile.hr_rest : null;
  
  let intensityPower = 0.5;
  let intensityHR = 0.5;
  
  // Calculate power-based intensity
  if (ftp && ftp > 0) {
    intensityPower = avgWatts / ftp;
  } else {
    intensityPower = avgWatts / 250; // fallback
  }
  
  // Calculate HR-based intensity (% of HR reserve)
  if (avgHR && hrMax && hrRest && hrMax > hrRest) {
    const hrReserve = hrMax - hrRest;
    intensityHR = (avgHR - hrRest) / hrReserve;
  }
  
  // Average both metrics if HR available, otherwise use power only
  const intensity = (avgHR && hrMax && hrRest) ? (intensityPower + intensityHR) / 2 : intensityPower;
  
  // Substrate utilization curves based on intensity
  let carbs = 0.5, fats = 0.5;
  if (intensity < 0.55) { carbs = 0.25; fats = 0.75; } // Z1: mainly fat
  else if (intensity < 0.75) { carbs = 0.40; fats = 0.60; } // Z2: fat-burning
  else if (intensity < 0.90) { carbs = 0.55; fats = 0.45; } // Z3: mixed
  else if (intensity < 1.05) { carbs = 0.75; fats = 0.25; } // Z4: mainly carbs
  else { carbs = 0.90; fats = 0.10; } // Z5: almost all carbs
  
  return { carbsPct: Math.round(carbs*100), fatsPct: Math.round(fats*100) };
}

// compute Normalized Power from power stream (array of watts) using 30s rolling avg
function computeNPFromStream(powerStream:number[], timeStepSec=1){
  if (!powerStream || powerStream.length===0) return null;
  const window = 30; // seconds
  const pow4: number[] = [];
  for (let i=0;i<powerStream.length;i++){
    const start = Math.max(0, i-window+1);
    const slice = powerStream.slice(start, i+1);
    const avg = slice.reduce((a,b)=>a+b,0)/slice.length;
    pow4.push(Math.pow(avg,4));
  }
  const mean4 = pow4.reduce((a,b)=>a+b,0)/pow4.length;
  return Math.pow(mean4, 1/4);
}

export default function ActivitiesScreen({ jwt, apiBase = 'http://localhost:3001', profile, onSelectActivity }: Props){
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [streamsCache, setStreamsCache] = useState<Record<number, any>>({});

  useEffect(()=>{
    // enable LayoutAnimation on Android
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    if (!jwt) return;
    setLoading(true);
    fetch(`${apiBase}/strava/activities`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r=>r.json())
      .then(d=>{ if (Array.isArray(d)) setActivities(d); else if (d && d.ok && Array.isArray(d.data)) setActivities(d.data); else if (d && Array.isArray(d)) setActivities(d); })
      .catch(e=>{})
      .finally(()=>setLoading(false));
  }, [jwt]);

  const loadStreams = async (id:number) => {
    if (!jwt) return;
    if (streamsCache[id]) return;
    try {
      const res = await fetch(`${apiBase}/strava/activities/${id}/streams?keys=time,watts,distance`, { headers: { Authorization: `Bearer ${jwt}` } });
      const data = await res.json();
      // Normalize if data is array of objects
      let wattsArray: number[] | null = null;
      if (data && Array.isArray(data)){
        const watts = data.find((s:any)=>s.type === 'watts' || s.type === 'power');
        if (watts && Array.isArray(watts.data)) wattsArray = watts.data;
      } else if (data && data.watts && Array.isArray(data.watts)){
        wattsArray = data.watts;
      }
      setStreamsCache(prev=>({ ...prev, [id]: { raw: data, watts: wattsArray } }));
    } catch (err) {
      setStreamsCache(prev=>({ ...prev, [id]: null }));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Actividades</Text>
      {loading && <ActivityIndicator />}
      {!loading && activities.map(act => {
        const id = act.id;
        const avg = act.average_watts || 0;
        const kj = act.kilojoules || null;
        const calories = act.calories || null;
        const npApprox = act.has_power ? null : avg; // will compute if stream available
        const duration = act.moving_time || act.elapsed_time || 0;
        const date = act.start_date ? new Date(act.start_date).toLocaleDateString() : '—';
        const streamData = streamsCache[id];
        let npComputed = null;
        if (streamData && Array.isArray(streamData.watts)){
          npComputed = computeNPFromStream(streamData.watts.map((p:any)=>p));
        }

        const avgHR = act.average_heartrate || null;
        const { carbsPct, fatsPct } = estimateCaloriesBreakdown(avg, avgHR, profile);

        return (
          <View key={id} style={styles.card}>
            <TouchableOpacity onPress={() => onSelectActivity(id)}>
              <View style={styles.rowTop}>
                <Text style={styles.name}>{act.name}</Text>
                <Text style={styles.meta}>{date} · {Math.round((act.distance||0)/1000)} km</Text>
              </View>
            </TouchableOpacity>

            {openId===id && (
              <View style={styles.expanded}>
                <Text>Duración: {secondsToHhMm(duration)}</Text>
                <Text>Avg power: {Math.round(avg)} W</Text>
                <Text>NP: {npComputed ? Math.round(npComputed) + ' W (calc)' : (avg ? Math.round(computeApproxNP(avg, duration)) + ' W (est)' : '—')}</Text>
                <Text>Energy: {kj ? `${kj} kJ` : (calories ? `${Math.round(calories)} kcal` : '—')}</Text>
                <Text>Calorias ≈ Carbs {carbsPct}% · Fats {fatsPct}%</Text>

                {/* Power vs time and histogram if streams available */}
                {streamData && Array.isArray(streamData.watts) && streamData.watts.length > 0 ? (
                  <View style={{marginTop:8}}>
                    <Text style={{fontWeight:'700'}}>Power vs time</Text>
                    <Svg width="100%" height={80} viewBox={`0 0 300 80`}>
                      <G>
                        {renderSparkline(streamData.watts, 260, 40, 20)}
                      </G>
                    </Svg>
                    <Text style={{fontWeight:'700', marginTop:6}}>Histogram</Text>
                    <Svg width="100%" height={120} viewBox={`0 0 300 120`}>
                      <G>
                        {renderHistogram(streamData.watts, 6, 260, 18, 20)}
                      </G>
                    </Svg>
                  </View>
                ) : (
                  <View style={{marginTop:8}}>
                    <Text style={{fontStyle:'italic'}}>Streams no disponibles — muestra aproximada</Text>
                  </View>
                )}

                <View style={{marginTop:8}}>
                  <TouchableOpacity onPress={()=>loadStreams(id)} style={styles.smallButton}><Text style={{color:'#fff'}}>Forzar carga de streams</Text></TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// Helpers for approximate NP when no streams
function computeApproxNP(avg:number, durationSec:number){
  // heuristic multipliers by duration
  const mins = durationSec / 60;
  let mult = 1.05;
  if (mins < 5) mult = 1.15;
  else if (mins < 20) mult = 1.10;
  else if (mins < 60) mult = 1.05;
  else mult = 1.03;
  return Math.round(avg * mult);
}

// Render sparkline as small vertical bars to avoid complex paths
function renderSparkline(values:number[], width:number, height:number, offsetX:number){
  const max = Math.max(...values, 1);
  const step = Math.max(1, Math.floor(values.length / width));
  const bars = [];
  for (let i=0;i<width;i++){
    const idx = Math.min(values.length-1, i*step);
    const v = values[idx] || 0;
    const h = Math.round((v/max) * height);
    const x = offsetX + i;
    const y = (height + 20) - h;
    bars.push(<Rect key={'b'+i} x={x} y={y} width={1} height={h} fill="#2b9aa3" />);
  }
  return bars;
}

// Render histogram with nBuckets
function renderHistogram(values:number[], buckets:number, width:number, barHeight:number, offsetY:number){
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min;
  const bucketWidth = width / buckets;
  const counts = new Array(buckets).fill(0);
  values.forEach(v => {
    const pct = (v - min) / (range || 1);
    const idx = Math.min(buckets-1, Math.floor(pct * buckets));
    counts[idx]++;
  });
  const maxCount = Math.max(...counts, 1);
  const bars = counts.map((c,i)=>{
    const h = Math.round((c/maxCount) * barHeight);
    const x = 20 + i * bucketWidth;
    const y = offsetY + (barHeight - h);
    return <Rect key={'h'+i} x={x} y={y} width={Math.max(6, Math.round(bucketWidth-4))} height={h} fill={'#6bd6a9'} rx={3} />;
  });
  return bars;
}

const styles = StyleSheet.create({
  container: { padding:14 },
  title: { fontSize:20, fontWeight:'700', marginBottom:12 },
  card: { backgroundColor:'#fff', padding:10, borderRadius:8, marginBottom:10 },
  rowTop: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  name: { fontWeight:'700' },
  meta: { color:'#666' },
  expanded: { marginTop:8 },
  smallButton: { backgroundColor:'#0b8f88', padding:8, borderRadius:6, alignSelf:'flex-start' }
});
