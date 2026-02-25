import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme';

interface Props {
  jwt: string;
  apiBase?: string;
  activityId?: string;
}

interface SessionClassification {
  activityId: string;
  activityName: string;
  sessionType: string;
  confidence: number;
  features: {
    IF: number;
    VI: number;
    timeInZ5: number;
    timeInZ4: number;
    timeInZ3: number;
    avgPower: number;
    normPower: number;
  };
  interpretation: string;
  trainingBenefit: string;
  recommendations: string[];
}

interface TrainingDistribution {
  sweetSpot: number;
  VO2max: number;
  easy: number;
  anaerobic: number;
  endurance: number;
  other: number;
  polarization: {
    isPolarized: boolean;
    intensity: string;
    assessment: string;
  };
}

export default function SessionClassifierScreen({
  jwt,
  apiBase = 'http://localhost:3001',
  activityId,
}: Props) {
  const [activeTab, setActiveTab] = useState<'classification' | 'distribution'>('classification');
  const [loading, setLoading] = useState(true);
  const [classification, setClassification] = useState<SessionClassification | null>(null);
  const [distribution, setDistribution] = useState<TrainingDistribution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState(activityId);

  useEffect(() => {
    if (activityId) {
      fetchClassification(activityId);
      fetchDistribution();
    } else {
      fetchActivities();
      fetchDistribution();
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
          fetchClassification(data.activities[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const fetchClassification = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${apiBase}/advanced/activity/${id}/classify`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (res.ok) {
        setClassification(await res.json());
      }
    } catch (err: any) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistribution = async () => {
    try {
      const res = await fetch(
        `${apiBase}/advanced/training-distribution`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (res.ok) {
        setDistribution(await res.json());
      }
    } catch (err) {
      console.error('Error fetching distribution:', err);
    }
  };

  const handleActivitySelect = (id: string) => {
    setSelectedActivity(id);
    fetchClassification(id);
  };

  const getSessionEmoji = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('sweet spot')) return '💪';
    if (t.includes('vo2')) return '⚡';
    if (t.includes('easy')) return '🚴';
    if (t.includes('anaerobic')) return '🔥';
    if (t.includes('endurance')) return '📈';
    if (t.includes('interval')) return '🎯';
    return '•';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#2ecc71';
    if (confidence >= 0.8) return '#3498db';
    if (confidence >= 0.7) return '#f39c12';
    return '#e74c3c';
  };

  const getTypeColor = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('sweet spot')) return '#8B4513';
    if (t.includes('vo2')) return '#FF6B6B';
    if (t.includes('easy')) return '#51CF66';
    if (t.includes('anaerobic')) return '#FF1744';
    if (t.includes('endurance')) return '#00BCD4';
    if (t.includes('interval')) return '#9C27B0';
    return colors.primary;
  };

  if (loading && !classification && activeTab === 'classification') {
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
        <Text style={styles.title}>🎯 Session Classifier</Text>
        <Text style={styles.subtitle}>AI-Powered Training Type Detection</Text>
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
          style={[styles.tab, activeTab === 'classification' && styles.activeTab]}
          onPress={() => setActiveTab('classification')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'classification' && styles.activeTabText,
            ]}
          >
            Classification
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'distribution' && styles.activeTab]}
          onPress={() => setActiveTab('distribution')}
        >
          <Text
            style={[styles.tabText, activeTab === 'distribution' && styles.activeTabText]}
          >
            Distribution
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

        {activeTab === 'classification' && classification && (
          <View>
            <View style={styles.card}>
              <View
                style={[
                  styles.cardHeader,
                  {
                    backgroundColor: getTypeColor(classification.sessionType),
                  },
                ]}
              >
                <View>
                  <Text style={styles.headerEmoji}>
                    {getSessionEmoji(classification.sessionType)}
                  </Text>
                  <Text style={styles.sessionType}>{classification.sessionType}</Text>
                </View>
                <View style={styles.confidenceBox}>
                  <Text
                    style={[
                      styles.confidenceValue,
                      { color: getConfidenceColor(classification.confidence) },
                    ]}
                  >
                    {(classification.confidence * 100).toFixed(0)}%
                  </Text>
                  <Text style={styles.confidenceLabel}>Confidence</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.featuresList}>
                  <Text style={styles.featuresTitle}>Session Features:</Text>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Intensity Factor (IF)</Text>
                    <Text style={styles.featureValue}>
                      {classification.features.IF.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Variability Index (VI)</Text>
                    <Text style={styles.featureValue}>
                      {classification.features.VI.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Time in Z5 (Anaerobic)</Text>
                    <Text style={styles.featureValue}>
                      {Math.round(classification.features.timeInZ5)}min
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Time in Z4 (VO2max)</Text>
                    <Text style={styles.featureValue}>
                      {Math.round(classification.features.timeInZ4)}min
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Time in Z3 (Threshold)</Text>
                    <Text style={styles.featureValue}>
                      {Math.round(classification.features.timeInZ3)}min
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Average Power</Text>
                    <Text style={styles.featureValue}>
                      {classification.features.avgPower.toFixed(0)}W
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Text style={styles.featureLabel}>Normalized Power</Text>
                    <Text style={styles.featureValue}>
                      {classification.features.normPower.toFixed(0)}W
                    </Text>
                  </View>
                </View>

                <View style={styles.interpretationBox}>
                  <Text style={styles.interpretationTitle}>What This Means:</Text>
                  <Text style={styles.interpretationText}>
                    {classification.interpretation}
                  </Text>
                </View>

                <View style={styles.benefitBox}>
                  <Text style={styles.benefitTitle}>🏆 Training Benefit:</Text>
                  <Text style={styles.benefitText}>{classification.trainingBenefit}</Text>
                </View>

                {classification.recommendations.length > 0 && (
                  <View style={styles.recommendationsBox}>
                    <Text style={styles.recommendationsTitle}>💡 Recommendations:</Text>
                    {classification.recommendations.map((rec, idx) => (
                      <Text key={idx} style={styles.recommendationItem}>
                        • {rec}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'distribution' && distribution && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 Training Type Distribution</Text>
              <View style={styles.cardContent}>
                <View style={styles.distributionChart}>
                  {[
                    { name: 'Sweet Spot', value: distribution.sweetSpot, color: '#8B4513' },
                    { name: 'VO2max', value: distribution.VO2max, color: '#FF6B6B' },
                    { name: 'Easy', value: distribution.easy, color: '#51CF66' },
                    { name: 'Anaerobic', value: distribution.anaerobic, color: '#FF1744' },
                    { name: 'Endurance', value: distribution.endurance, color: '#00BCD4' },
                    { name: 'Other', value: distribution.other, color: colors.border },
                  ].map((type) => {
                    if (type.value === 0) return null;
                    return (
                      <View key={type.name} style={styles.distributionItem}>
                        <View style={styles.distributionItemLeft}>
                          <View
                            style={[
                              styles.distributionDot,
                              { backgroundColor: type.color },
                            ]}
                          />
                          <Text style={styles.distributionLabel}>{type.name}</Text>
                        </View>
                        <Text style={styles.distributionValue}>{type.value.toFixed(1)}%</Text>
                      </View>
                    );
                  })}
                </View>

                {distribution.polarization && (
                  <View style={styles.polarizationBox}>
                    <Text style={styles.polarizationTitle}>⚖️ Polarization Analysis</Text>
                    <Text
                      style={[
                        styles.polarizationStatus,
                        {
                          color: distribution.polarization.isPolarized
                            ? '#2ecc71'
                            : '#f39c12',
                        },
                      ]}
                    >
                      {distribution.polarization.intensity}
                    </Text>
                    <Text style={styles.polarizationAssessment}>
                      {distribution.polarization.assessment}
                    </Text>

                    <View style={styles.polarizationInfo}>
                      <Text style={styles.polarizationInfoTitle}>What is Polarization?</Text>
                      <Text style={styles.polarizationInfoText}>
                        Elite cyclists train following the 80/20 rule:{'\n'}
                        80% at or below Zone 2 (easy){'\n'}
                        20% at or above Zone 4 (hard)
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.sessionTypeExplainer}>
                  <Text style={styles.explainerTitle}>📚 Session Types Explained:</Text>

                  <View style={styles.explainerItem}>
                    <Text style={[styles.explainerEmoji, { color: '#51CF66' }]}>🚴</Text>
                    <View style={styles.explainerContent}>
                      <Text style={styles.explainerName}>Easy Rides</Text>
                      <Text style={styles.explainerDesc}>
                        Zone 1-2: Base building, recovery, low stress
                      </Text>
                    </View>
                  </View>

                  <View style={styles.explainerItem}>
                    <Text style={[styles.explainerEmoji, { color: '#00BCD4' }]}>📈</Text>
                    <View style={styles.explainerContent}>
                      <Text style={styles.explainerName}>Endurance</Text>
                      <Text style={styles.explainerDesc}>
                        Zone 2-3: Long duration, fat adaptation
                      </Text>
                    </View>
                  </View>

                  <View style={styles.explainerItem}>
                    <Text style={[styles.explainerEmoji, { color: '#8B4513' }]}>💪</Text>
                    <View style={styles.explainerContent}>
                      <Text style={styles.explainerName}>Sweet Spot</Text>
                      <Text style={styles.explainerDesc}>
                        Zone 3-4: Sustained high power, builds fitness
                      </Text>
                    </View>
                  </View>

                  <View style={styles.explainerItem}>
                    <Text style={[styles.explainerEmoji, { color: '#FF6B6B' }]}>⚡</Text>
                    <View style={styles.explainerContent}>
                      <Text style={styles.explainerName}>VO2max</Text>
                      <Text style={styles.explainerDesc}>
                        Zone 4-5a: High intensity intervals, aerobic power
                      </Text>
                    </View>
                  </View>

                  <View style={styles.explainerItem}>
                    <Text style={[styles.explainerEmoji, { color: '#FF1744' }]}>🔥</Text>
                    <View style={styles.explainerContent}>
                      <Text style={styles.explainerName}>Anaerobic</Text>
                      <Text style={styles.explainerDesc}>
                        Zone 5b-6: 1-10min maximal efforts, sprint events
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  confidenceBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  confidenceLabel: {
    fontSize: 10,
    color: '#fff',
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
  featuresList: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureLabel: {
    fontSize: 12,
    color: colors.text,
  },
  featureValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  interpretationBox: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  interpretationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  interpretationText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  benefitBox: {
    backgroundColor: colors.background,
    borderLeftWidth: 3,
    borderLeftColor: '#2ecc71',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  recommendationsBox: {
    backgroundColor: colors.background,
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f39c12',
    marginBottom: 6,
  },
  recommendationItem: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 14,
    marginBottom: 4,
  },
  distributionChart: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  distributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  distributionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distributionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  distributionLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  distributionValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  polarizationBox: {
    backgroundColor: colors.background,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  polarizationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 6,
  },
  polarizationStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  polarizationAssessment: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
    marginBottom: 8,
  },
  polarizationInfo: {
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  polarizationInfoTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  polarizationInfoText: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 13,
  },
  sessionTypeExplainer: {
    marginTop: 12,
  },
  explainerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  explainerItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  explainerEmoji: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 2,
  },
  explainerContent: {
    flex: 1,
  },
  explainerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  explainerDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
  },
});
