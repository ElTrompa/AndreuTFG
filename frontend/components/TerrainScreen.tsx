import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../theme';

interface Props {
  jwt: string;
  apiBase?: string;
  activityId?: string;
}

interface Climb {
  id: string;
  name: string;
  distance: number;
  gain: number;
  avgGrade: number;
  maxGrade: number;
  category: string;
  powerAvg: number;
  weightedWkg: number;
  VAM: number;
  time: number;
  difficulty: string;
}

interface ClimbRecord {
  climbId: string;
  climbName: string;
  userTime: number;
  proTime: number;
  userSpeed: number;
  proSpeed: number;
  weightPerformance: string;
  recommendation: string;
}

interface FamousClimb {
  id: string;
  name: string;
  country: string;
  distance: number;
  gain: number;
  avgGrade: number;
  proRecord: string;
  projectedTime: string;
  difficulty: string;
  advice: string;
}

export default function TerrainScreen({
  jwt,
  apiBase = 'http://localhost:3001',
  activityId,
}: Props) {
  const [activeTab, setActiveTab] = useState<'activity' | 'famous' | 'simulate'>('activity');
  const [loading, setLoading] = useState(true);
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [famousClimbs, setFamousClimbs] = useState<FamousClimb[]>([]);
  const [selectedClimb, setSelectedClimb] = useState<FamousClimb | null>(null);
  const [projectedTime, setProjectedTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState(activityId);

  useEffect(() => {
    if (activityId) {
      fetchActivityTerreno(activityId);
    } else {
      fetchActivities();
    }
    fetchFamousClimbs();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await fetch(
        `${apiBase}/athlete?limit=20`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
        if (data.activities?.[0]) {
          setSelectedActivity(data.activities[0].id);
          fetchActivityTerreno(data.activities[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const fetchActivityTerreno = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${apiBase}/specialized/terrain/${id}`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setClimbs(data.climbs || []);
      } else {
        setError('No climbs detected in this activity');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamousClimbs = async () => {
    try {
      const res = await fetch(
        `${apiBase}/specialized/climbs/catalog`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setFamousClimbs(data.climbs || []);
      }
    } catch (err) {
      console.error('Error fetching famous climbs:', err);
    }
  };

  const handleActivitySelect = (id: string) => {
    setSelectedActivity(id);
    fetchActivityTerreno(id);
  };

  const handleSimulateClimb = async (climbId: string) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${apiBase}/specialized/climbs/simulate/${climbId}`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedClimb(data.climb);
        setProjectedTime(data.projectedTime);
      } else {
        Alert.alert('Error', 'Could not simulate climb');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load simulation');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'hc':
        return '#8B0000';
      case 'cat1':
        return '#FF6B00';
      case 'cat2':
        return '#FF8C00';
      case 'cat3':
        return '#FFB81C';
      case 'cat4':
        return '#FFD700';
      default:
        return colors.primary;
    }
  };

  const getDifficultyEmoji = (difficulty: string) => {
    const d = difficulty?.toLowerCase() || '';
    if (d.includes('very hard')) return '🔥🔥🔥';
    if (d.includes('hard')) return '🔥🔥';
    if (d.includes('moderate')) return '📈';
    if (d.includes('easy')) return '✓';
    return '•';
  };

  if (loading && activeTab === 'activity' && climbs.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>⛰️ Terrain Analysis</Text>
        <Text style={styles.subtitle}>Climb Detection & Simulation</Text>
      </View>

      {/* Activity Selector */}
      {!activityId && activities.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activitySelector}
        >
          {activities.slice(0, 5).map((act) => (
            <TouchableOpacity
              key={act.id}
              style={[
                styles.activityBtn,
                selectedActivity === act.id && styles.activityBtnActive,
              ]}
              onPress={() => handleActivitySelect(act.id)}
            >
              <Text
                style={[
                  styles.activityBtnText,
                  selectedActivity === act.id && styles.activityBtnTextActive,
                ]}
                numberOfLines={1}
              >
                {act.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
          onPress={() => setActiveTab('activity')}
        >
          <Text
            style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}
          >
            Activity
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'famous' && styles.activeTab]}
          onPress={() => setActiveTab('famous')}
        >
          <Text
            style={[styles.tabText, activeTab === 'famous' && styles.activeTabText]}
          >
            Famous
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {error && activeTab === 'activity' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {activeTab === 'activity' && (
          <View>
            {climbs.length > 0 ? (
              climbs.map((climb, idx) => (
                <View key={idx} style={styles.card}>
                  <View
                    style={[
                      styles.cardHeader,
                      { borderBottomColor: getCategoryColor(climb.category) },
                    ]}
                  >
                    <View style={styles.cardTitleSection}>
                      <Text style={styles.cardTitle}>{climb.name}</Text>
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: getCategoryColor(climb.category) },
                        ]}
                      >
                        <Text style={styles.categoryText}>{climb.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.difficultyEmoji}>
                      {getDifficultyEmoji(climb.difficulty)}
                    </Text>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.climbMetricsGrid}>
                      <View style={styles.gridItem}>
                        <Text style={styles.metricLabel}>Distance</Text>
                        <Text style={styles.metricValue}>
                          {climb.distance.toFixed(1)}km
                        </Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.metricLabel}>Ascent</Text>
                        <Text style={styles.metricValue}>{climb.gain.toFixed(0)}m</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.metricLabel}>Avg Grade</Text>
                        <Text style={styles.metricValue}>{climb.avgGrade.toFixed(1)}%</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.metricLabel}>Max Grade</Text>
                        <Text style={styles.metricValue}>{climb.maxGrade.toFixed(1)}%</Text>
                      </View>
                    </View>

                    <View style={styles.climbPerformance}>
                      <Text style={styles.performanceTitle}>Performance Metrics:</Text>
                      <View style={styles.performanceRow}>
                        <Text style={styles.performanceLabel}>Avg Power</Text>
                        <Text style={styles.performanceValue}>
                          {climb.powerAvg.toFixed(0)}W
                        </Text>
                      </View>
                      <View style={styles.performanceRow}>
                        <Text style={styles.performanceLabel}>W/kg</Text>
                        <Text style={styles.performanceValue}>
                          {climb.weightedWkg.toFixed(2)} W/kg
                        </Text>
                      </View>
                      <View style={styles.performanceRow}>
                        <Text style={styles.performanceLabel}>VAM</Text>
                        <Text style={styles.performanceValue}>
                          {climb.VAM.toFixed(0)} m/h
                        </Text>
                      </View>
                      <View style={styles.performanceRow}>
                        <Text style={styles.performanceLabel}>Time</Text>
                        <Text style={styles.performanceValue}>
                          {Math.floor(climb.time / 60)}:{(climb.time % 60).toString().padStart(2, '0')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.difficultyBox}>
                      <Text style={styles.difficultyTitle}>Difficulty: {climb.difficulty}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.noClimbsText}>
                    ℹ️ No climbs detected in this activity.{'\n'}
                    Try selecting an activity with elevation gain.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'famous' && (
          <View>
            {selectedClimb && projectedTime ? (
              <View>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleSection}>
                      <Text style={styles.cardTitle}>{selectedClimb.name}</Text>
                      <Text style={styles.locationText}>{selectedClimb.country}</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.climbMetricsGrid}>
                      <View style={styles.gridItem}>
                        <Text style={styles.metricLabel}>Distance</Text>
                        <Text style={styles.metricValue}>
                          {selectedClimb.distance.toFixed(1)}km
                        </Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.metricLabel}>Ascent</Text>
                        <Text style={styles.metricValue}>{selectedClimb.gain.toFixed(0)}m</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.metricLabel}>Avg Grade</Text>
                        <Text style={styles.metricValue}>
                          {selectedClimb.avgGrade.toFixed(1)}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.simulationBox}>
                      <Text style={styles.simulationTitle}>🚴 Simulation Results</Text>
                      <View style={styles.timeComparison}>
                        <View style={styles.timeBlock}>
                          <Text style={styles.timeLabel}>Your Time</Text>
                          <Text style={styles.timeValue}>{projectedTime}</Text>
                        </View>
                        <View style={styles.timeBlock}>
                          <Text style={styles.timeLabel}>Pro Record</Text>
                          <Text style={styles.timeValue}>{selectedClimb.proRecord}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.advice}>
                      <Text style={styles.adviceTitle}>💡 Recommendation:</Text>
                      <Text style={styles.adviceText}>{selectedClimb.advice}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={() => {
                        setSelectedClimb(null);
                        setProjectedTime(null);
                      }}
                    >
                      <Text style={styles.backBtnText}>← Back to Catalog</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>Famous Climbs Catalog</Text>
                {famousClimbs.map((climb) => (
                  <View key={climb.id} style={styles.climbItem}>
                    <View style={styles.climbItemContent}>
                      <Text style={styles.climbItemName}>{climb.name}</Text>
                      <Text style={styles.climbItemLocation}>{climb.country}</Text>
                      <View style={styles.climbItemMetrics}>
                        <Text style={styles.climbItemMetric}>
                          {climb.distance.toFixed(1)}km • {climb.gain.toFixed(0)}m • {climb.avgGrade.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.simulateBtn}
                      onPress={() => handleSimulateClimb(climb.id)}
                    >
                      <Text style={styles.simulateBtnText}>Simulate</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activitySelector: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 50,
  },
  activityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  activityBtnActive: {
    backgroundColor: colors.primary,
  },
  activityBtnText: {
    color: colors.text,
    fontSize: 12,
  },
  activityBtnTextActive: {
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorBox: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginVertical: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
  },
  cardTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  difficultyEmoji: {
    fontSize: 16,
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  climbMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  climbPerformance: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  performanceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  performanceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  performanceValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  difficultyBox: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  difficultyTitle: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  noClimbsText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
    lineHeight: 18,
  },
  climbItem: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  climbItemContent: {
    flex: 1,
  },
  climbItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  climbItemLocation: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  climbItemMetrics: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  climbItemMetric: {
    fontSize: 10,
    color: colors.text,
  },
  simulateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  simulateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  simulationBox: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2ecc71',
  },
  simulationTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 10,
  },
  timeComparison: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  advice: {
    backgroundColor: colors.background,
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  adviceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f39c12',
    marginBottom: 4,
  },
  adviceText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
