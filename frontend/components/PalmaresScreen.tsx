/**
 * Pantalla de palmarés: muestra los logros del ciclista en Strava
 * (KOMs, Top-10, podios y leyendas locales), con caché de 24 horas.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Achievement = {
  segment_id: number;
  segment_name: string;
  activity_id: number;
  activity_name: string;
  activity_date: string;
  elapsed_time: number;
  distance: number;
  rank?: number;
  is_kom?: boolean;
  effort_count?: number;
  city?: string;
  country?: string;
};

type Props = {
  jwt: string | null;
  apiBase?: string;
};

// Configuración de caché local para el palmárés
const CACHE_KEY = 'ridemetrics_achievements_cache';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Formatea un tiempo en segundos a MM:SS o HH:MM:SS
 */
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number) {
  return (meters / 1000).toFixed(2) + ' km';
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PalmaresScreen({ jwt, apiBase = 'http://localhost:3001' }: Props) {
  const [loading, setLoading] = useState(false);
  const [koms, setKoms] = useState<Achievement[]>([]);
  const [top10, setTop10] = useState<Achievement[]>([]);
  const [podios, setPodios] = useState<Achievement[]>([]);
  const [localLegends, setLocalLegends] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'podios' | 'top10' | 'koms' | 'legends'>('podios');
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  // Cargar datos en caché (si no han expirado)
  const loadCachedAchievements = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - data.timestamp;
        
        if (cacheAge < CACHE_EXPIRY_MS) {
          // Usar datos en caché
          setKoms(data.koms || []);
          setTop10(data.top10 || []);
          setPodios(data.podios || []);
          setLocalLegends(data.localLegends || []);
          setStats(data.stats || null);
          setUsingCache(true);
          return true;
        }
      }
    } catch (err) {
      console.error('Error loading cache:', err);
    }
    return false;
  };

  // Guardar logros en caché con timestamp
  const cacheAchievements = async (data: any) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Error saving cache:', err);
    }
  };

  // Obtener logros del servidor (o usar caché si no se fuerza recarga)
  const fetchAchievements = async (forceRefresh = false) => {
    if (!jwt) return;

    // Si no se fuerza recarga, intentar caché primero
    if (!forceRefresh) {
      const hasCached = await loadCachedAchievements();
      if (hasCached) {
        setLoading(false);
        return;
      }
    }

    setError(null);
    setLoading(true);
    setUsingCache(false);

    try {
      const res = await fetch(`${apiBase}/strava/achievements`, {
        headers: { Authorization: `Bearer ${jwt}` }
      });

      if (!res.ok) {
        throw new Error('Error al cargar logros');
      }

      const data = await res.json();
      setKoms(data.koms || []);
      setTop10(data.top10 || []);
      setPodios(data.podios || []);
      setLocalLegends(data.localLegends || []);
      setStats(data.stats || null);

      // Guardar resultados en caché para futuras visitas
      await cacheAchievements(data);
    } catch (err: any) {
      console.error('Error fetching achievements:', err);
      
      // En caso de error, intentar usar caché como fallback
      const hasCached = await loadCachedAchievements();
      if (hasCached) {
        setUsingCache(true);
      } else {
        setError(err.message || 'No se pudieron cargar los logros');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, [jwt, apiBase]);

  const renderAchievementCard = (achievement: Achievement, showRank: boolean = false, index: number = 0) => {
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Oro, Plata, Bronce
    const rankColor = achievement.rank && achievement.rank <= 3 
      ? rankColors[achievement.rank - 1] 
      : '#4299e1';
    
    const uniqueKey = `${achievement.segment_id}-${achievement.activity_id}-${index}`;

    return (
      <View style={styles.card} nativeID={uniqueKey}>
        <View style={styles.cardHeader}>
          {showRank && achievement.rank && (
            <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
              <Text style={styles.rankText}>#{achievement.rank}</Text>
            </View>
          )}
          {achievement.is_kom && (
            <View style={[styles.rankBadge, { backgroundColor: '#FFD700' }]}>
              <Text style={styles.rankText}>👑 KOM</Text>
            </View>
          )}
          <Text style={styles.segmentName} numberOfLines={2}>
            {achievement.segment_name}
          </Text>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Tiempo:</Text>
            <Text style={styles.statValue}>{formatTime(achievement.elapsed_time)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Distancia:</Text>
            <Text style={styles.statValue}>{formatDistance(achievement.distance)}</Text>
          </View>
          {(achievement.effort_count ?? 0) > 0 && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Intentos:</Text>
              <Text style={styles.statValue}>{achievement.effort_count}</Text>
            </View>
          )}
          {achievement.city && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Ubicación:</Text>
              <Text style={styles.statValue}>
                {achievement.city}{achievement.country ? `, ${achievement.country}` : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.activityName} numberOfLines={1}>
            📍 {achievement.activity_name}
          </Text>
          <Text style={styles.activityDate}>{formatDate(achievement.activity_date)}</Text>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4299e1" />
          <Text style={styles.loadingText}>Cargando logros...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      );
    }

    let data: Achievement[] = [];
    let emptyMessage = '';

    switch (activeTab) {
      case 'podios':
        data = podios;
        emptyMessage = 'No tienes podios aún. ¡Sigue entrenando!';
        break;
      case 'top10':
        data = top10;
        emptyMessage = 'No tienes posiciones en el Top 10 aún.';
        break;
      case 'koms':
        data = koms;
        emptyMessage = 'No tienes KOMs aún. ¡Conquista ese segmento!';
        break;
    }

    if (data.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollContent}>
        {data.map((achievement, index) => (
          <View key={`achievement-${achievement.segment_id}-${index}`}>
            {renderAchievementCard(achievement, activeTab !== 'koms', index)}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>🏆 Palmarés</Text>
          <View style={styles.headerControls}>
            {usingCache && (
              <View style={styles.cacheBadge}>
                <Text style={styles.cacheBadgeText}>📦 Cache</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => fetchAchievements(true)}
              disabled={loading}
            >
              <Text style={styles.refreshBtnText}>⟳</Text>
            </TouchableOpacity>
          </View>
        </View>
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total_podios || 0}</Text>
              <Text style={styles.statBoxLabel}>Podios</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total_top10 || 0}</Text>
              <Text style={styles.statBoxLabel}>Top 10</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total_koms || 0}</Text>
              <Text style={styles.statBoxLabel}>KOMs</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'podios' && styles.activeTab]}
          onPress={() => setActiveTab('podios')}
        >
          <Text style={[styles.tabText, activeTab === 'podios' && styles.activeTabText]}>
            🥇 Podios
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'top10' && styles.activeTab]}
          onPress={() => setActiveTab('top10')}
        >
          <Text style={[styles.tabText, activeTab === 'top10' && styles.activeTabText]}>
            🔟 Top 10
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'koms' && styles.activeTab]}
          onPress={() => setActiveTab('koms')}
        >
          <Text style={[styles.tabText, activeTab === 'koms' && styles.activeTabText]}>
            👑 KOMs
          </Text>
        </TouchableOpacity>
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cacheBadge: {
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  cacheBadgeText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4299e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4299e1',
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4299e1',
  },
  tabText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4299e1',
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
    padding: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  segmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  cardBody: {
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 8,
  },
  activityName: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
});
