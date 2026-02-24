import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';

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

  useEffect(() => {
    if (!jwt) return;
    
    setLoading(true);
    setError(null);
    
    fetch(`${apiBase}/strava/achievements`, {
      headers: { Authorization: `Bearer ${jwt}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar logros');
        return res.json();
      })
      .then(data => {
        setKoms(data.koms || []);
        setTop10(data.top10 || []);
        setPodios(data.podios || []);
        setLocalLegends(data.localLegends || []);
        setStats(data.stats || null);
      })
      .catch(err => {
        console.error('Error loading achievements:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [jwt, apiBase]);

  const renderAchievementCard = (achievement: Achievement, showRank: boolean = false, index: number = 0) => {
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
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
          {achievement.effort_count && achievement.effort_count > 0 && (
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
      case 'legends':
        data = localLegends;
        emptyMessage = 'No tienes segmentos frecuentes aún.';
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
        {data.map((achievement, index) => 
          renderAchievementCard(achievement, activeTab !== 'koms', index)
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Palmarés</Text>
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
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total_local_legends || 0}</Text>
              <Text style={styles.statBoxLabel}>Frecuentes</Text>
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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'legends' && styles.activeTab]}
          onPress={() => setActiveTab('legends')}
        >
          <Text style={[styles.tabText, activeTab === 'legends' && styles.activeTabText]}>
            ⭐ Frecuentes
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
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
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
