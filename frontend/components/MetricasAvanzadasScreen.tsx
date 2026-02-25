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

interface AdvancedMetrics {
  activityId: string;
  activityName: string;
  variabilityIndex: {
    value: number;
    np: number;
    avgPower: number;
    rating: string;
  };
  pacingAnalysis: {
    strategy: string;
    firstThirdPower: number;
    lastThirdPower: number;
    improvement: number;
    advice: string;
  };
  peakPowerRecords: Array<{
    duration: string;
    power: number;
    isRecord: boolean;
  }>;
  efficiencyTrend: {
    efficiency: number;
    aerobicDecoupling: number;
    previousWeek: number;
    trend: string;
  };
}

interface EfficiencyTrends {
  weeklyData: Array<{
    week: number;
    avgEfficiency: number;
    avgDecoupling: number;
  }>;
  trend: string;
  summary: string;
}

export default function MetricasAvanzadasScreen({
  jwt,
  apiBase = 'http://localhost:3001',
  activityId,
}: Props) {
  const [activeTab, setActiveTab] = useState<'vi' | 'pacing' | 'peaks' | 'efficiency'>('vi');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
  const [trendData, setTrendData] = useState<EfficiencyTrends | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState(activityId);

  useEffect(() => {
    if (activityId) {
      fetchMetrics(activityId);
    } else {
      fetchActivities();
      fetchEfficiencyTrends();
    }
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
          fetchMetrics(data.activities[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const fetchMetrics = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${apiBase}/advanced/activity/${id}/advanced-metrics`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (res.ok) {
        setMetrics(await res.json());
      } else {
        setError('Could not load metrics for this activity');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEfficiencyTrends = async () => {
    try {
      const res = await fetch(
        `${apiBase}/advanced/efficiency-trends`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (res.ok) {
        setTrendData(await res.json());
      }
    } catch (err) {
      console.error('Error fetching trends:', err);
    }
  };

  const handleActivitySelect = (id: string) => {
    setSelectedActivity(id);
    fetchMetrics(id);
  };

  if (loading && !metrics) {
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
        <Text style={styles.title}>📊 Advanced Metrics</Text>
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
          style={[styles.tab, activeTab === 'vi' && styles.activeTab]}
          onPress={() => setActiveTab('vi')}
        >
          <Text style={[styles.tabText, activeTab === 'vi' && styles.activeTabText]}>VI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pacing' && styles.activeTab]}
          onPress={() => setActiveTab('pacing')}
        >
          <Text
            style={[styles.tabText, activeTab === 'pacing' && styles.activeTabText]}
          >
            Pacing
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'peaks' && styles.activeTab]}
          onPress={() => setActiveTab('peaks')}
        >
          <Text
            style={[styles.tabText, activeTab === 'peaks' && styles.activeTabText]}
          >
            Peaks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'efficiency' && styles.activeTab]}
          onPress={() => setActiveTab('efficiency')}
        >
          <Text
            style={[styles.tabText, activeTab === 'efficiency' && styles.activeTabText]}
          >
            EF Trend
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {metrics && (
          <>
            {activeTab === 'vi' && (
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>⚡ Variability Index (VI)</Text>
                  <View style={styles.cardContent}>
                    <View style={styles.viMainMetric}>
                      <Text style={styles.viValue}>{metrics.variabilityIndex.value.toFixed(2)}</Text>
                      <Text style={styles.viLabel}>VI</Text>
                    </View>
                    <Text style={[
                      styles.viRating,
                      metrics.variabilityIndex.rating === 'High' ? { color: '#e74c3c' } :
                      metrics.variabilityIndex.rating === 'Moderate' ? { color: '#f39c12' } :
                      { color: '#2ecc71' }
                    ]}>
                      {metrics.variabilityIndex.rating} Variability
                    </Text>

                    <View style={styles.viDetails}>
                      <View style={styles.viDetail}>
                        <Text style={styles.viDetailLabel}>Normalized Power</Text>
                        <Text style={styles.viDetailValue}>
                          {metrics.variabilityIndex.np.toFixed(0)}W
                        </Text>
                      </View>
                      <View style={styles.viDetail}>
                        <Text style={styles.viDetailLabel}>Average Power</Text>
                        <Text style={styles.viDetailValue}>
                          {metrics.variabilityIndex.avgPower.toFixed(0)}W
                        </Text>
                      </View>
                    </View>

                    <View style={styles.interpretation}>
                      <Text style={styles.interpretationText}>
                        VI = Normalized Power ÷ Average Power{'\n\n'}
                        • VI &lt; 1.05: Even pacing (🟢 Good){'\n'}
                        • VI 1.05 - 1.15: Normal variability{'\n'}
                        • VI &gt; 1.15: Irregular effort (🔴 Optimize)
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'pacing' && (
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>🏃 Pacing Strategy</Text>
                  <View style={styles.cardContent}>
                    <View style={styles.pacingHeader}>
                      <Text style={styles.pacingStrategy}>{metrics.pacingAnalysis.strategy}</Text>
                      <Text style={[
                        styles.pacingImprovement,
                        metrics.pacingAnalysis.improvement > 0
                          ? { color: '#2ecc71' }
                          : { color: '#e74c3c' }
                      ]}>
                        {metrics.pacingAnalysis.improvement > 0 ? '+' : ''}
                        {metrics.pacingAnalysis.improvement.toFixed(1)}%
                      </Text>
                    </View>

                    <View style={styles.pacingComparison}>
                      <View style={styles.pacingPart}>
                        <Text style={styles.pacingPartLabel}>First Third</Text>
                        <Text style={styles.pacingPartValue}>
                          {metrics.pacingAnalysis.firstThirdPower.toFixed(0)}W
                        </Text>
                      </View>
                      <View style={styles.pacingArrow}>
                        <Text style={styles.arrow}>→</Text>
                      </View>
                      <View style={styles.pacingPart}>
                        <Text style={styles.pacingPartLabel}>Last Third</Text>
                        <Text style={styles.pacingPartValue}>
                          {metrics.pacingAnalysis.lastThirdPower.toFixed(0)}W
                        </Text>
                      </View>
                    </View>

                    <View style={styles.advice}>
                      <Text style={styles.adviceText}>💡 {metrics.pacingAnalysis.advice}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'peaks' && (
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>🏆 Peak Power Records</Text>
                  <View style={styles.cardContent}>
                    {metrics.peakPowerRecords.slice(0, 13).map((record, idx) => (
                      <View key={idx} style={styles.peakRecord}>
                        <View style={styles.peakDuration}>
                          <Text style={styles.peakDurationText}>{record.duration}</Text>
                        </View>
                        <View style={styles.peakBar}>
                          <View
                            style={[
                              styles.peakBarFill,
                              { width: `${(record.power / 500) * 100}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.peakPower}>{record.power.toFixed(0)}W</Text>
                        {record.isRecord && <Text style={styles.recordBadge}>🏅 Record</Text>}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'efficiency' && (
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📈 Efficiency Trend</Text>
                  <View style={styles.cardContent}>
                    <View style={styles.efficiencyMetrics}>
                      <View style={styles.efficiencyMetric}>
                        <Text style={styles.efficiencyLabel}>Current EF</Text>
                        <Text style={styles.efficiencyValue}>
                          {metrics.efficiencyTrend.efficiency.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.efficiencyMetric}>
                        <Text style={styles.efficiencyLabel}>Aerobic Decoup.</Text>
                        <Text
                          style={[
                            styles.efficiencyValue,
                            metrics.efficiencyTrend.aerobicDecoupling > 7
                              ? { color: '#e74c3c' }
                              : { color: '#2ecc71' },
                          ]}
                        >
                          {metrics.efficiencyTrend.aerobicDecoupling.toFixed(1)}%
                        </Text>
                      </View>
                    </View>

                    {trendData && (
                      <View style={styles.trendHistory}>
                        <Text style={styles.trendTitle}>Weekly Average:</Text>
                        {trendData.weeklyData.slice(-4).map((week, idx) => (
                          <View key={idx} style={styles.trendRow}>
                            <Text style={styles.trendWeek}>Week {week.week}</Text>
                            <View style={styles.trendBars}>
                              <View style={styles.trendBar}>
                                <Text style={styles.trendValue}>
                                  {week.avgEfficiency.toFixed(2)} EF
                                </Text>
                              </View>
                              <View style={styles.trendBar}>
                                <Text style={styles.trendValue}>
                                  {week.avgDecoupling.toFixed(1)}% DC
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={[styles.advice, { marginTop: 12 }]}>
                      <Text style={styles.adviceText}>
                        📊 Trend: {metrics.efficiencyTrend.trend}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
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
    fontSize: 12,
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  viMainMetric: {
    alignItems: 'center',
    marginBottom: 12,
  },
  viValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  viLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  viRating: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  viDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  viDetail: {
    alignItems: 'center',
  },
  viDetailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  viDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  interpretation: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  interpretationText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  pacingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pacingStrategy: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  pacingImprovement: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pacingComparison: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  pacingPart: {
    alignItems: 'center',
  },
  pacingPartLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pacingPartValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  pacingArrow: {
    marginHorizontal: 12,
  },
  arrow: {
    fontSize: 20,
    color: colors.primary,
  },
  advice: {
    backgroundColor: colors.background,
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  adviceText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  peakRecord: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  peakDuration: {
    width: 50,
    marginRight: 8,
  },
  peakDurationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    minWidth: 50,
  },
  peakBar: {
    flex: 1,
    height: 20,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  peakBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  peakPower: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    minWidth: 50,
  },
  recordBadge: {
    fontSize: 12,
    marginLeft: 8,
  },
  efficiencyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  efficiencyMetric: {
    alignItems: 'center',
  },
  efficiencyLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  efficiencyValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  trendHistory: {
    marginTop: 12,
  },
  trendTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  trendRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trendWeek: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  trendBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendBar: {
    flex: 1,
    marginHorizontal: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  trendValue: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
});
