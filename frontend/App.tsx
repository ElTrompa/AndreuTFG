/**
 * Componente principal de la aplicación RideMetrics
 * Carga el fix de responder para suprimir advertencias de React Native Web
 * Gestiona la autenticación con Strava y la navegación entre pantallas
 */
import './responderFix';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import HexPowerChart from './components/HexPowerChart';
import HamburgerMenu from './components/HamburgerMenu';
import PotenciaScreen from './components/PotenciaScreen';
import ProyeccionesScreen from './components/ProyeccionesScreen';
import ProfileScreen from './components/ProfileScreen';
import ActivitiesScreen from './components/ActivitiesScreen';
import ActivityDetailScreen from './components/ActivityDetailScreen';
import HomeScreen from './components/HomeScreen';
import PalmaresScreen from './components/PalmaresScreen';
import AdvancedAnalyticsScreen from './components/AdvancedAnalyticsScreen';
import MetricasAvanzadasScreen from './components/MetricasAvanzadasScreen';
import HRVScreen from './components/HRVScreen';
import TerrainScreen from './components/TerrainScreen';
import SessionClassifierScreen from './components/SessionClassifierScreen';
import RoutesSearchScreen from './components/RoutesSearchScreen';

import { StyleSheet, Text, View, Button, Linking, Alert, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from './theme';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const logoXml = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0366d6" />
    </linearGradient>
  </defs>
  <g transform="translate(100,100)">
    <circle r="70" fill="none" stroke="url(#g)" stroke-width="6" opacity="0.12" />
    <g fill="none" stroke="url(#g)" stroke-width="6">
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(0)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(30)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(60)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(90)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(120)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(150)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(180)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(210)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(240)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(270)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(300)" />
      <path d="M-78,0 L-90,6 L-90,-6 Z" transform="rotate(330)" />
    </g>
    <circle r="50" fill="#07131a" opacity="0.9" />
    <rect x="-20" y="6" width="10" height="28" rx="2" fill="url(#g)" />
    <rect x="-2" y="-6" width="10" height="40" rx="2" fill="#22c1c3" />
    <rect x="16" y="-18" width="10" height="56" rx="2" fill="#2ecc71" />
    <circle cx="-46" cy="-36" r="4" fill="#22c1c3" />
    <circle cx="46" cy="36" r="4" fill="#2ecc71" />
  </g>
</svg>`;

export default function App() {
  // Estado de navegación
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState<'Home'|'Potencia'|'Proyecciones'|'Settings'|'Profile'|'Activities'|'ActivityDetail'|'Palmares'|'AdvancedAnalytics'|'MetricasAvanzadas'|'HRV'|'Terrain'|'SessionClassifier'|'RoutesSearch'>('Home');
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);

  // Estado de autenticación y datos del atleta
  const [jwt, setJwt] = useState<string | null>(null);
  const [athlete, setAthlete] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false);
  const [authState, setAuthState] = useState<string | null>(null);
  const pollRef = useRef<any>(null); // referencia al intervalo de polling OAuth
  const [powerData, setPowerData] = useState<Record<string, number> | null>(null);
  const [profile, setProfile] = useState<any>(null);

  // Etiqueta del atleta: username o nombre completo
  const athleteLabel = useMemo(() => {
    if (!athlete) return '';
    if (athlete.username) return athlete.username;
    if (athlete.firstname) return `${athlete.firstname} ${athlete.lastname || ''}`.trim();
    return String(athlete.id || '');
  }, [athlete]);

  const handleStravaAuth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/start`);
      const data = await res.json();
      if (!res.ok) return Alert.alert('Error', JSON.stringify(data));
      const { url, state } = data;
      setAuthState(state);
      // Abrir navegador para que el usuario autorice la app en Strava
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);

      // Iniciar polling para esperar la respuesta OAuth con el JWT
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const p = await fetch(`${API_BASE_URL}/auth/poll?state=${encodeURIComponent(state)}`);
          const pd = await p.json();
          if (p.ok && pd.ok && pd.jwt) {
            setJwt(pd.jwt);
            // Cargar datos del atleta tras login exitoso
            try {
              const a = await fetch(`${API_BASE_URL}/strava/athlete`, { headers: { Authorization: `Bearer ${pd.jwt}` } });
              if (a.ok) setAthlete(await a.json());
            } catch (e) {}
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } catch (e) {
          // ignore
        }
      }, 2000);
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  // Gestionar deep links / esquema de la app para recibir `jwt` o `access_token`
  useEffect(() => {
    const processUrl = async (url: string | null) => {
      if (!url) return;
      const parts = url.split('?');
      const query = parts[1] || '';
      const params = Object.fromEntries(new URLSearchParams(query));

      if (params.jwt) {
        setJwt(params.jwt);
        // Obtener perfil del atleta con el nuevo JWT
        try {
          const res = await fetch(`${API_BASE_URL}/strava/athlete`, { headers: { Authorization: `Bearer ${params.jwt}` } });
          if (res.ok) setAthlete(await res.json());
        } catch (e) { /* ignorar */ }
      } else if (params.access_token) {
        // Intercambiar token de usuario único por JWT en el backend
        try {
          const res = await fetch(`${API_BASE_URL}/auth/token-login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: params.access_token })
          });
          const data = await res.json();
          if (res.ok) {
            setJwt(data.jwt || null);
            setAthlete(data.athlete || null);
          }
        } catch (e) { /* ignore */ }
      }
    };

    Linking.getInitialURL().then(processUrl).catch(() => {});
    const listener = ({ url }: { url: string }) => processUrl(url);
    const linkingSubscription = Linking.addEventListener('url', listener);
    return () => {
      linkingSubscription?.remove?.();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  // Cargar perfil guardado cada vez que cambia el JWT
  useEffect(() => {
    if (!jwt) { setProfile(null); return; }
    setAutoLoadAttempted(false);
    (async ()=>{
      try {
        const res = await fetch(`${API_BASE_URL}/profile`, { headers: { Authorization: `Bearer ${jwt}` } });
        const d = await res.json();
        if (res.ok && d && d.ok) setProfile(d.profile || null);
      } catch (e) {
        // ignore
      }
    })();
  }, [jwt]);



  const handleLoadActivities = async () => {
    if (!jwt) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const [athleteRes, activitiesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/strava/athlete`, {
          headers: { Authorization: `Bearer ${jwt}` }
        }),
        fetch(`${API_BASE_URL}/strava/activities`, {
          headers: { Authorization: `Bearer ${jwt}` }
        })
      ]);
      const athleteData = await athleteRes.json();
      const activitiesData = await activitiesRes.json();
      if (!athleteRes.ok) {
        setErrorMsg(JSON.stringify(athleteData));
        return;
      }
      if (!activitiesRes.ok) {
        setErrorMsg(JSON.stringify(activitiesData));
        return;
      }
      setAthlete(athleteData);
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      setStatsLoaded(true);

      // Refrescar perfil también al cargar actividades
      try {
        const pr = await fetch(`${API_BASE_URL}/profile`, { headers: { Authorization: `Bearer ${jwt}` } });
        if (pr.ok) {
          const pd = await pr.json();
          if (pd && pd.ok) setProfile(pd.profile || null);
        }
      } catch (e) {}

    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setLoading(false);
    }

    // Cargar curva de potencia en segundo plano SIN bloquear la UI
    // Primero intenta caché (instantáneo), si no hay lanza cómputo en segundo plano
    loadPowerCurveBackground(jwt);
  };

  const loadPowerCurveBackground = async (token: string) => {
    try {
      // 1. Intentar obtener datos cacheados (máx. 24h, rápido si hay caché)
      const cachedRes = await fetch(
        `${API_BASE_URL}/strava/power-curve?max_age_hours=24`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (cachedRes.ok) {
        const cJson = await cachedRes.json();
        if (cJson.ok && cJson.data) {
          setPowerData(cJson.data);
          if (cJson.cached) return; // Ya tenía caché, no recalcular
        }
      }

      // 2. Si no hay caché o caducó, lanzar cómputo en segundo plano (no bloquea la UI)
      // Solo 90 días de datos para que sea más rápido
      fetch(
        `${API_BASE_URL}/strava/power-curve?days=90&per_page=200&max_pages=5&background=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});

    } catch (e) {
      // La curva de potencia es opcional, no mostrar error al usuario
    }
  };

  // Auto-cargar atleta + actividades una vez tras el login
  useEffect(() => {
    if (!jwt) {
      setActivities([]);
      setAthlete(null);
      setStatsLoaded(false);
      setAutoLoadAttempted(false);
      return;
    }
    if (!statsLoaded && !loading && !autoLoadAttempted) {
      setAutoLoadAttempted(true);
      handleLoadActivities();
    }
  }, [jwt, statsLoaded, loading, autoLoadAttempted]);

  const stats = useMemo(() => {
    if (!activities.length) return null;
    const totalDistance = activities.reduce((acc, a) => acc + (a.distance || 0), 0);
    const totalMovingTime = activities.reduce((acc, a) => acc + (a.moving_time || 0), 0);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last7 = activities.filter(a => a.start_date && new Date(a.start_date) >= weekAgo);
    const last7Distance = last7.reduce((acc, a) => acc + (a.distance || 0), 0);
    const lastActivity = activities[0];

    return {
      totalDistanceKm: Math.round(totalDistance / 1000),
      totalHours: Math.round(totalMovingTime / 360) / 10,
      last7Count: last7.length,
      last7DistanceKm: Math.round(last7Distance / 1000),
      lastActivityName: lastActivity ? lastActivity.name : '—',
      lastActivityDate: lastActivity && lastActivity.start_date ? new Date(lastActivity.start_date).toLocaleDateString() : '—'
    };
  }, [activities]);

  // Construir mapa de potencia aproximado desde actividades (como fallback si no hay caché)
  const approxPowerMap = useMemo(() => {
    const map: Record<string, number> = {} as any;
    const durations = ['5s','15s','30s','1m','2m','3m','5m','10m','15m','20m','30m','45m','1h'];
    const maxAvg = activities && activities.length ? Math.max(...activities.map(a => a.average_watts || 0)) : 0;
    const base = maxAvg || 200;
    durations.forEach(d => {
      const mult = d.includes('s') ? 1.6 : d === '1m' ? 1.4 : d === '2m' || d === '3m' ? 1.2 : d.includes('m') && Number(d.replace('m','')) <= 10 ? 1.0 : 0.9;
      map[d] = Math.round(base * mult);
    });
    return map;
  }, [activities]);

  const powerMap = powerData || approxPowerMap;

  if (jwt && screen !== 'Home') {
    return (
      <SafeAreaView style={styles.fullScreenRoot}>
        <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} navigate={(s:string)=>{ setScreen(s as any); setMenuOpen(false); }} />

        <View style={styles.appHeader}>
          <TouchableOpacity style={styles.hamburgerBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
            <SvgXml xml={`<svg width="28" height="22" viewBox="0 0 28 22" xmlns="http://www.w3.org/2000/svg"><rect width="28" height="3" y="0" rx="1.5" fill="#0b4860"/><rect width="28" height="3" y="9" rx="1.5" fill="#0b4860"/><rect width="28" height="3" y="18" rx="1.5" fill="#0b4860"/></svg>`} width={28} height={22} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
        {screen === 'Potencia' && (
          <PotenciaScreen powerMap={powerMap} weightKg={profile && profile.weight_kg ? profile.weight_kg : (athlete && athlete.weight ? athlete.weight : null)} activities={activities} profile={profile} />
        )}
        {screen === 'Proyecciones' && (<ProyeccionesScreen activities={activities} />)}
        {screen === 'Profile' && (<ProfileScreen jwt={jwt} apiBase={API_BASE_URL} onSaved={(p:any)=>setProfile(p)} />)}
        {screen === 'Activities' && (
          <ActivitiesScreen jwt={jwt} apiBase={API_BASE_URL} profile={profile} onSelectActivity={(id) => {
            setSelectedActivityId(id);
            setScreen('ActivityDetail');
          }} />
        )}
        {screen === 'ActivityDetail' && selectedActivityId && (
          <ActivityDetailScreen activityId={selectedActivityId} jwt={jwt} profile={profile} apiBase={API_BASE_URL} onBack={() => setScreen('Activities')} />
        )}
        {screen === 'Palmares' && (<PalmaresScreen jwt={jwt} apiBase={API_BASE_URL} />)}
        {screen === 'AdvancedAnalytics' && (<AdvancedAnalyticsScreen jwt={jwt} apiBase={API_BASE_URL} />)}
        {screen === 'MetricasAvanzadas' && (<MetricasAvanzadasScreen jwt={jwt} apiBase={API_BASE_URL} />)}
        {screen === 'HRV' && (<HRVScreen jwt={jwt} apiBase={API_BASE_URL} />)}
        {screen === 'Terrain' && (<TerrainScreen jwt={jwt} apiBase={API_BASE_URL} />)}
        {screen === 'SessionClassifier' && (<SessionClassifierScreen jwt={jwt} apiBase={API_BASE_URL} />)}
        {screen === 'RoutesSearch' && (
          <RoutesSearchScreen
            jwt={jwt}
            athlete={athlete}
            apiBase={API_BASE_URL}
            onSelectActivity={(id) => {
              setSelectedActivityId(id);
              setScreen('ActivityDetail');
            }}
          />
        )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SvgXml xml={logoXml} width={120} height={120} style={styles.logo} />
      <Text style={styles.title}>RideMetrics</Text>

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      {!jwt && (
        <>
          <View style={styles.button}>
            <Button title="Iniciar sesión con Strava" onPress={handleStravaAuth} />
          </View>
        </>
      )}

      {jwt && screen === 'Home' && (
        <HomeScreen jwt={jwt} profile={profile} onLoadActivities={handleLoadActivities} apiBase={API_BASE_URL} />
      )}

      {/* Potencia screen */}
      {jwt && screen === 'Potencia' && (
        <PotenciaScreen powerMap={powerMap} weightKg={profile && profile.weight_kg ? profile.weight_kg : (athlete && athlete.weight ? athlete.weight : null)} activities={activities} profile={profile} />
      )}

      {/* Proyecciones screen */}
      {jwt && screen === 'Proyecciones' && (
        <ProyeccionesScreen activities={activities} />
      )}

      {/* Hamburger menu overlay */}
      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} navigate={(s:string)=>{ setScreen(s as any); setMenuOpen(false); }} />

      {/* Header with hamburger (visible when logged in) */}
      {jwt && (
        <TouchableOpacity style={{ position:'absolute', left: 18, top: 28 }} onPress={() => setMenuOpen(true)}>
          <SvgXml xml={`<svg width="28" height="22" viewBox="0 0 28 22" xmlns="http://www.w3.org/2000/svg"><rect width="28" height="3" y="0" rx="1.5" fill="#0b4860"/><rect width="28" height="3" y="9" rx="1.5" fill="#0b4860"/><rect width="28" height="3" y="18" rx="1.5" fill="#0b4860"/></svg>`} width={28} height={22} />
        </TouchableOpacity>
      )}

      {/* Profile screen */}
      {jwt && screen === 'Profile' && (
        <ProfileScreen jwt={jwt} apiBase={API_BASE_URL} onSaved={(p:any)=>setProfile(p)} />
      )}

      {/* Activities screen */}
      {jwt && screen === 'Activities' && (
        <ActivitiesScreen jwt={jwt} apiBase={API_BASE_URL} profile={profile} onSelectActivity={(id) => {
          setSelectedActivityId(id);
          setScreen('ActivityDetail');
        }} />
      )}

      {/* Activity Detail screen */}
      {jwt && screen === 'ActivityDetail' && selectedActivityId && (
        <ActivityDetailScreen activityId={selectedActivityId} jwt={jwt} profile={profile} apiBase={API_BASE_URL} onBack={() => setScreen('Activities')} />
      )}

      {/* Palmares screen */}
      {jwt && screen === 'Palmares' && (
        <PalmaresScreen jwt={jwt} apiBase={API_BASE_URL} />
      )}

      {/* Advanced Analytics screen */}
      {jwt && screen === 'AdvancedAnalytics' && (
        <AdvancedAnalyticsScreen jwt={jwt} apiBase={API_BASE_URL} />
      )}

      {/* Métricas Avanzadas screen */}
      {jwt && screen === 'MetricasAvanzadas' && (
        <MetricasAvanzadasScreen jwt={jwt} apiBase={API_BASE_URL} />
      )}

      {/* HRV & Recovery screen */}
      {jwt && screen === 'HRV' && (
        <HRVScreen jwt={jwt} apiBase={API_BASE_URL} />
      )}

      {/* Terrain Analysis screen */}
      {jwt && screen === 'Terrain' && (
        <TerrainScreen jwt={jwt} apiBase={API_BASE_URL} />
      )}

      {/* Session Classifier screen */}
      {jwt && screen === 'SessionClassifier' && (
        <SessionClassifierScreen jwt={jwt} apiBase={API_BASE_URL} />
      )}

      {/* Routes Search by Town */}
      {jwt && screen === 'RoutesSearch' && (
        <RoutesSearchScreen
          jwt={jwt}
          athlete={athlete}
          apiBase={API_BASE_URL}
          onSelectActivity={(id) => {
            setSelectedActivityId(id);
            setScreen('ActivityDetail');
          }}
        />
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fullScreenRoot: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  appHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hamburgerBtn: {
    padding: 14,
    borderRadius: 8,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center'
  },
  logo: {
    marginBottom: 12,
  },
  button: {
    width: '100%',
    marginVertical: 12,
  },
  error: {
    width: '100%',
    color: colors.error,
    backgroundColor: '#FDECEC',
    padding: 10,
    borderRadius: 6,
    borderColor: '#F5B7B1',
    borderWidth: 1,
    marginBottom: 10
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 16,
    borderColor: colors.border,
    borderWidth: 1
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: colors.textPrimary
  },
  cardText: {
    color: colors.textSecondary
  },
  list: {
    marginTop: 12
  },
  listItem: {
    paddingVertical: 8,
    borderTopColor: colors.border,
    borderTopWidth: 1
  },
  listTitle: {
    color: colors.textPrimary,
    fontWeight: '600'
  },
  listMeta: {
    color: colors.textSecondary
  },
  statsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    borderColor: colors.border,
    borderWidth: 1
  },
  statWide: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    borderColor: colors.border,
    borderWidth: 1
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },
  statSub: {
    color: colors.textSecondary,
    fontSize: 12
  }
});
