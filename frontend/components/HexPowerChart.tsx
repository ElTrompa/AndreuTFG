import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polygon, Circle, Line, G, Text as SvgText, Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

type Props = {
  values: Record<string, number>;
  size?: number;
  weightKg?: number | null; // athlete weight in kg for W/kg calculation
};

export const durationsOrder = ['5s','15s','30s','1m','2m','3m','5m','10m','15m','20m','30m','45m','1h'];
const categoryMap: Record<string, 'Sprint'|'Ataque'|'Ascenso'> = {} as any;
['5s','15s','30s','1m'].forEach(d=>categoryMap[d]='Sprint');
['2m','3m','5m','10m'].forEach(d=>categoryMap[d]='Ataque');
['15m','20m','30m','45m','1h'].forEach(d=>categoryMap[d]='Ascenso');

const categoryColor = {
  Sprint: '#ff6b6b',
  Ataque: '#ffb86b',
  Ascenso: '#6bd6a9'
} as Record<string,string>;

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
  { level:1, name:'Principiante' },
  { level:2, name:'Recreativo Bajo' },
  { level:3, name:'Recreativo Medio' },
  { level:4, name:'Recreativo Alto' },
  { level:5, name:'Amateur Competitivo' },
  { level:6, name:'Amateur Avanzado' },
  { level:7, name:'Elite Regional' },
  { level:8, name:'Elite Nacional' },
  { level:9, name:'Prof. Continental' },
  { level:10, name:'Prof. World Tour' }
];

function getLevelForDuration(duration: string, watts: number, weightKg?: number | null): { level: number; name: string; missingW: number; wkg?: number; missingWkg?: number } {
  const thresholds = powerThresholds[duration] || [];
  const wkg = weightKg ? Number((watts / weightKg).toFixed(2)) : undefined;
  
  if (thresholds.length === 0 || watts < thresholds[0]) {
    const missingW = thresholds[0] ? Math.round(thresholds[0] - watts) : 0;
    const missingWkg = weightKg && missingW ? Number((missingW / weightKg).toFixed(2)) : undefined;
    return { level: 0, name: 'Sin categoría', missingW, wkg, missingWkg };
  }
  
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (watts >= thresholds[i]) {
      const nextThreshold = i < thresholds.length - 1 ? thresholds[i + 1] : thresholds[i];
      const missingW = i < thresholds.length - 1 ? Math.round(nextThreshold - watts) : 0;
      const missingWkg = weightKg && missingW ? Number((missingW / weightKg).toFixed(2)) : undefined;
      return { 
        level: i + 1, 
        name: levels[i].name,
        missingW,
        wkg,
        missingWkg
      };
    }
  }
  
  const missingW = thresholds[0] - watts;
  const missingWkg = weightKg && missingW ? Number((missingW / weightKg).toFixed(2)) : undefined;
  return { level: 0, name: 'Sin categoría', missingW, wkg, missingWkg };
}

function polarToCartesian(cx:number, cy:number, r:number, angleDeg:number){
  const a = (angleDeg-90) * Math.PI/180.0;
  return { x: cx + (r * Math.cos(a)), y: cy + (r * Math.sin(a)) };
}

export default function HexPowerChart({ values, size=320, weightKg }: Props){
  const [selected, setSelected] = useState<null | ({x:number,y:number,d:string,v:number,level?:number,name?:string,missingW?:number,missingWkg?:number,wkg?:number})>(null);
  const cx = size/2; const cy = size/2; const radius = size*0.38;
  
  // Usar el umbral máximo del último nivel (World Tour) para normalizar el gráfico
  const maxValForNormalization = Math.max(
    ...durationsOrder.map(d => {
      const thresholds = powerThresholds[d] || [];
      return thresholds[thresholds.length - 1] || 1;
    })
  );

  // place points evenly around circle
  const pointCount = durationsOrder.length;
  const points = durationsOrder.map((d,i)=>{
    const angle = 360 * i / pointCount;
    const v = values[d] || 0;
    // Normalizar cada punto según su propio umbral máximo
    const maxForThisDuration = powerThresholds[d] ? powerThresholds[d][powerThresholds[d].length - 1] : 1;
    const r = (v / maxForThisDuration) * radius;
    const p = polarToCartesian(cx, cy, r, angle);
    return { d, x: p.x, y: p.y, v, angle };
  });

  // grid: concentric polygons (rings)
  const rings = [0.25,0.5,0.75,1];

  // data polygon path
  const dataPath = points.map((p,i)=> `${i===0? 'M':'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // polygon points string for SVG polygon (for optional outline)
  const dataPointsStr = points.map(p=>`${p.x},${p.y}`).join(' ');

  return (
    <View style={{alignItems:'center', padding:12}}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#6bd6ff" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#6bd6a9" stopOpacity="0.15" />
          </LinearGradient>
        </Defs>

        <G>
          {/* circular radial lines */}
          {points.map((pt, i)=>{
            const p = polarToCartesian(cx, cy, radius, pt.angle);
            return <Line key={'rad'+i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e6eef2" strokeWidth={0.6} />;
          })}

          {/* concentric rings */}
          {rings.map((rFrac, ri)=>{
            const pts = Array.from({length:pointCount}).map((_,i)=>{
              const ang = 360 * i / pointCount;
              const p = polarToCartesian(cx, cy, radius * rFrac, ang);
              return `${p.x},${p.y}`;
            }).join(' ');
            return <Polygon key={'ring'+ri} points={pts} fill="none" stroke="#dbeef3" strokeWidth={0.8} strokeDasharray={[3,4]} />;
          })}

          {/* data fill + outline */}
          <Path d={dataPath} fill="url(#grad)" opacity={0.9} />
          <Polygon points={dataPointsStr} fill="none" stroke="#2b9aa3" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* points + labels */}
          {points.map((pt, idx)=> {
            const levelData = getLevelForDuration(pt.d, pt.v, weightKg);
            return (
            <G key={pt.d}>
              <Circle cx={pt.x} cy={pt.y} r={6} fill={categoryColor[categoryMap[pt.d]]} stroke="#fff" strokeWidth={1} onPress={()=>{
                setSelected({x:pt.x,y:pt.y,d:pt.d,v:pt.v, level: levelData.level, name: levelData.name, missingW: levelData.missingW, missingWkg: levelData.missingWkg, wkg: levelData.wkg});
              }} />
              {/* duration label slightly outside */}
              {(() => {
                const labelPos = polarToCartesian(cx, cy, radius + 14, pt.angle);
                return <SvgText x={labelPos.x} y={labelPos.y} fontSize="10" fill="#0b2733" textAnchor="middle" fontWeight="600">{pt.d}</SvgText>;
              })()}
              {/* numeric watts label under each point (W only) */}
              <SvgText x={pt.x} y={pt.y + 16} fontSize="10" fill="#08323a" textAnchor="middle">{Math.round(pt.v)} W</SvgText>
            </G>
          )})}

          {/* tooltip */}
          {selected && (
            <G>
              <Rect x={Math.max(8, selected.x - 70)} y={Math.max(8, selected.y - 78)} rx={8} ry={8} width={140} height={70} fill="#ffffff" opacity={0.98} stroke="#2b9aa3" strokeWidth={2} />
              <SvgText x={selected.x} y={selected.y - 64} fontSize="12" fontWeight="700" fill="#0b4860" textAnchor="middle">{selected.d}</SvgText>
              <SvgText x={selected.x} y={selected.y - 48} fontSize="13" fontWeight="700" fill="#0b4860" textAnchor="middle">{Math.round(selected.v)} W{selected.wkg ? ` · ${selected.wkg} W/kg` : ''}</SvgText>
              {selected.level !== undefined && <SvgText x={selected.x} y={selected.y - 32} fontSize="11" fill="#064b56" textAnchor="middle">Nivel {selected.level} — {selected.name}</SvgText>}
              {selected.missingW !== undefined && selected.missingW > 0 && (
                <SvgText x={selected.x} y={selected.y - 16} fontSize="10" fill="#e67e22" textAnchor="middle">Faltan {selected.missingW} W{selected.missingWkg ? ` (${selected.missingWkg} W/kg)` : ''}</SvgText>
              )}
              {selected.missingW === 0 && (
                <SvgText x={selected.x} y={selected.y - 16} fontSize="11" fontWeight="700" fill="#2ecc71" textAnchor="middle">¡Nivel máximo! 🏆</SvgText>
              )}
            </G>
          )}
        </G>
      </Svg>

      <View style={{flexDirection:'row', marginTop:8}}>
        <View style={{flexDirection:'row', alignItems:'center', marginRight:12}}>
          <View style={{width:14,height:14,backgroundColor:categoryColor.Sprint,marginRight:6,borderRadius:3}} />
          <Text>Sprint</Text>
        </View>
        <View style={{flexDirection:'row', alignItems:'center', marginRight:12}}>
          <View style={{width:14,height:14,backgroundColor:categoryColor.Ataque,marginRight:6,borderRadius:3}} />
          <Text>Ataque</Text>
        </View>
        <View style={{flexDirection:'row', alignItems:'center'}}>
          <View style={{width:14,height:14,backgroundColor:categoryColor.Ascenso,marginRight:6,borderRadius:3}} />
          <Text>Ascenso</Text>
        </View>
      </View>
    </View>
  );
}
