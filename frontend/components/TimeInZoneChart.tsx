import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';

type Props = {
  activities: any[];
  powerMap: Record<string, number>;
  profile?: any;
};

// FTP-based zones (standard cycling zones)
// Z1: <55% FTP (Recovery)
// Z2: 55-75% FTP (Endurance)
// Z3: 75-90% FTP (Tempo)
// Z4: 90-105% FTP (Threshold)
// Z5: >105% FTP (VO2max)
const zoneLabels = ['Z1','Z2','Z3','Z4','Z5'];

function getZoneIndex(avgWatts: number, ftp: number | null): number {
  if (!ftp || ftp <= 0) {
    // Fallback to arbitrary zones if no FTP
    const zones = [0, 100, 150, 200, 250, 9999];
    return zones.findIndex((z, i) => avgWatts >= z && avgWatts < zones[i + 1]) || 0;
  }
  const pct = avgWatts / ftp;
  if (pct < 0.55) return 0; // Z1
  if (pct < 0.75) return 1; // Z2
  if (pct < 0.90) return 2; // Z3
  if (pct < 1.05) return 3; // Z4
  return 4; // Z5
}

function secondsToHours(s:number){ return s/3600; }

export default function TimeInZoneChart({ activities = [], powerMap, profile }: Props){
  const [period, setPeriod] = useState<'1m'|'3m'|'all'>('1m');

  const ftp = profile && profile.ftp ? profile.ftp : null;

  const cutoffDate = useMemo(()=>{
    const now = new Date();
    if (period === '1m') return new Date(now.getTime() - 30*24*3600*1000);
    if (period === '3m') return new Date(now.getTime() - 90*24*3600*1000);
    return new Date(0);
  }, [period]);

  const zoneSums = useMemo(()=>{
    const sums = zoneLabels.map(_=>0);
    const filtered = activities.filter(a => a.start_date && new Date(a.start_date) >= cutoffDate);
    filtered.forEach(a => {
      const avg = a.average_watts || 0;
      const t = a.moving_time || 0;
      const idx = getZoneIndex(avg, ftp);
      sums[idx] += t;
    });
    return sums.map(s=>secondsToHours(s));
  }, [activities, cutoffDate, ftp]);

  const total = zoneSums.reduce((a,b)=>a+b,0) || 1;

  return (
    <View style={{backgroundColor:'#fff', padding:10, borderRadius:8}}>
      {!ftp && (
        <View style={{backgroundColor:'#fff3cd', padding:8, borderRadius:6, marginBottom:8, borderWidth:1, borderColor:'#ffc107'}}>
          <Text style={{color:'#856404', fontSize:12}}>⚠️ Configura tu FTP en el Perfil para ver zonas precisas</Text>
        </View>
      )}
      <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:8}}>
        <View style={{flexDirection:'row'}}>
          <TouchableOpacity onPress={()=>setPeriod('1m')} style={[styles.tab, period==='1m' && styles.tabActive]}><Text>Último mes</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>setPeriod('3m')} style={[styles.tab, period==='3m' && styles.tabActive]}><Text>3 meses</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>setPeriod('all')} style={[styles.tab, period==='all' && styles.tabActive]}><Text>Todo</Text></TouchableOpacity>
        </View>
      </View>

      <Svg width="100%" height={160} viewBox={`0 0 300 160`} preserveAspectRatio="xMidYMid meet">
        <G>
          {zoneSums.map((h, i)=>{
            const w = Math.max(10, (h/total) * 260);
            const x = 20 + i * 0;
            const y = 20 + i * 0;
            const barY = 30 + i * 24;
            return (
              <G key={i}>
                <Rect x={20} y={barY} width={Math.max(2, (h/total) * 260)} height={18} fill={['#cfeff0','#9fe0df','#6bd6a9','#4fbfb1','#2b9aa3'][i]} rx={6} />
                <SvgText x={292} y={barY+13} fontSize={11} fill="#053339" textAnchor="end">{h.toFixed(1)} h</SvgText>
                <SvgText x={12} y={barY+13} fontSize={11} fill="#053339" textAnchor="start">{zoneLabels[i]}</SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { paddingHorizontal:8, paddingVertical:4, backgroundColor:'#f3f8f7', borderRadius:6, marginRight:6 },
  tabActive: { backgroundColor:'#d9f0ef' }
});
