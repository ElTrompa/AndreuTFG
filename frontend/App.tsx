/**
 * Main App Component
 * Loads responder fix first to suppress React Native web warnings
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
import { StyleSheet, Text, View, Button, Linking, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from './theme';

const API_BASE_URL = 'http://localhost:3001';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState<'Home'|'Potencia'|'Proyecciones'|'Settings'|'Profile'|'Activities'|'ActivityDetail'|'Palmares'>('Home');
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [athlete, setAthlete] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false);
  const [authState, setAuthState] = useState<string | null>(null);
  const pollRef = useRef<any>(null);
  const [powerData, setPowerData] = useState<Record<string, number> | null>(null);
  const [profile, setProfile] = useState<any>(null);
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
      // Open browser for user authorization
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);

      // Start polling for JWT
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const p = await fetch(`${API_BASE_URL}/auth/poll?state=${encodeURIComponent(state)}`);
          const pd = await p.json();
          if (p.ok && pd.ok && pd.jwt) {
            setJwt(pd.jwt);
            // fetch athlete
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

  // Handle deep links / app scheme callbacks to receive `jwt` or `access_token`
  useEffect(() => {
    const processUrl = async (url) => {
      if (!url) return;
      const parts = url.split('?');
      const query = parts[1] || '';
      const params = Object.fromEntries(new URLSearchParams(query));

      if (params.jwt) {
        setJwt(params.jwt);
        // fetch athlete profile
        try {
          const res = await fetch(`${API_BASE_URL}/strava/athlete`, { headers: { Authorization: `Bearer ${params.jwt}` } });
          if (res.ok) setAthlete(await res.json());
        } catch (e) { /* ignore */ }
      } else if (params.access_token) {
        // exchange single-user token for a JWT on the backend
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
    const listener = ({ url }) => processUrl(url);
    Linking.addEventListener('url', listener);
    return () => {
      Linking.removeEventListener('url', listener);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  // Fetch saved profile when jwt changes
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

      // refresh profile too
      try {
        const pr = await fetch(`${API_BASE_URL}/profile`, { headers: { Authorization: `Bearer ${jwt}` } });
        if (pr.ok) {
          const pd = await pr.json();
          if (pd && pd.ok) setProfile(pd.profile || null);
        }
      } catch (e) {}

      // fetch cached or computed power curve
      try {
        const pRes = await fetch(`${API_BASE_URL}/strava/power-curve?days=730&per_page=200&max_pages=30&batch_delay_ms=200`, { headers: { Authorization: `Bearer ${jwt}` } });
        const pJson = await pRes.json();
        if (pRes.ok && pJson.ok && pJson.data) setPowerData(pJson.data);
      } catch (e) {
        // ignore
      }
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setLoading(false);
    }
  };

  // Auto-load athlete + activities once after login (replaces old manual button)
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

  // Build a fallback power map for the chart from activities (approximation)
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SvgXml xml={logoXml} width={120} height={120} style={styles.logo} />
      <Text style={styles.title}>RideMetrics</Text>
      <Text style={styles.subtitle}>Entrenamiento ciclista — Frontend Expo (TypeScript)</Text>

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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
