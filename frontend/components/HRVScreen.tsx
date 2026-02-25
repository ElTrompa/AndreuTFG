import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { colors } from '../theme';

interface Props {
  jwt: string;
  apiBase?: string;
}

interface HRVStatus {
  currentHRV: number;
  baseline: number;
  status: string;
  statusColor: string;
  change: number;
  interpretation: string;
}

interface TrainingReadiness {
  hrv: number;
  tsb: number;
  readinessScore: number;
  readinessLevel: string;
  advice: string;
  emoji: string;
}

interface HRVAnomaly {
  date: string;
  hrv: number;
  baseline: number;
  drop: number;
  significance: string;
}

export default function HRVScreen({
  jwt,
  apiBase = 'http://localhost:3001',
}: Props) {
  const [activeTab, setActiveTab] = useState<'status' | 'readiness' | 'anomalies'>('status');
  const [loading, setLoading] = useState(true);
  const [hrvStatus, setHrvStatus] = useState<HRVStatus | null>(null);
  const [readiness, setReadiness] = useState<TrainingReadiness | null>(null);
  const [anomalies, setAnomalies] = useState<HRVAnomaly[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualHrv, setManualHrv] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    fetchHRVData();
  }, []);

  const fetchHRVData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Default HRV for demo (normally from user input or device)
      const defaultHRV = 52;

      const [statusRes, readinessRes, anomaliesRes] = await Promise.all([
        fetch(`${apiBase}/specialized/hrv/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ hrv: defaultHRV }),
        }),
        fetch(`${apiBase}/specialized/hrv/readiness`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ hrv: defaultHRV }),
        }),
        fetch(`${apiBase}/specialized/hrv/anomalies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ hrv: defaultHRV }),
        }),
      ]);

      if (statusRes.ok) setHrvStatus(await statusRes.json());
      if (readinessRes.ok) setReadiness(await readinessRes.json());
      if (anomaliesRes.ok) {
        const data = await anomaliesRes.json();
        setAnomalies(data.anomalies || []);
      }

      if (!statusRes.ok) {
        setError('Error loading HRV data');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManualHRV = async () => {
    const hrv = parseFloat(manualHrv);
    if (isNaN(hrv) || hrv <= 0) {
      Alert.alert('Invalid HRV', 'Please enter a valid HRV value');
      return;
    }

    try {
      const [statusRes, readinessRes] = await Promise.all([
        fetch(`${apiBase}/specialized/hrv/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ hrv }),
        }),
        fetch(`${apiBase}/specialized/hrv/readiness`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ hrv }),
        }),
      ]);

      if (statusRes.ok) setHrvStatus(await statusRes.json());
      if (readinessRes.ok) setReadiness(await readinessRes.json());

      setManualHrv('');
      setShowInput(false);
      Alert.alert('Success', 'HRV data updated');
    } catch (err) {
      Alert.alert('Error', 'Failed to update HRV');
    }
  };

  if (loading) {
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
        <View style={styles.headerContent}>
          <Text style={styles.title}>❤️ HRV & Recovery</Text>
          <Text style={styles.subtitle}>Heart Rate Variability Analysis</Text>
        </View>
      </View>

      {/* Input Button */}
      <View style={styles.inputSection}>
        {!showInput ? (
          <TouchableOpacity
            style={styles.manualInputBtn}
            onPress={() => setShowInput(true)}
          >
            <Text style={styles.manualInputBtnText}>📱 Enter HRV Manually</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.manualInputForm}>
            <TextInput
              style={styles.manualInput}
              placeholder="Enter HRV value"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={manualHrv}
              onChangeText={setManualHrv}
            />
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitManualHRV}
            >
              <Text style={styles.submitBtnText}>✓ Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowInput(false);
                setManualHrv('');
              }}
            >
              <Text style={styles.cancelBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'status' && styles.activeTab]}
          onPress={() => setActiveTab('status')}
        >
          <Text
            style={[styles.tabText, activeTab === 'status' && styles.activeTabText]}
          >
            Status
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'readiness' && styles.activeTab]}
          onPress={() => setActiveTab('readiness')}
        >
          <Text
            style={[styles.tabText, activeTab === 'readiness' && styles.activeTabText]}
          >
            Readiness
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'anomalies' && styles.activeTab]}
          onPress={() => setActiveTab('anomalies')}
        >
          <Text
            style={[styles.tabText, activeTab === 'anomalies' && styles.activeTabText]}
          >
            Anomalies
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

        {activeTab === 'status' && hrvStatus && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 HRV Status</Text>
              <View style={styles.cardContent}>
                <View style={[styles.statusBox, { borderLeftColor: hrvStatus.statusColor }]}>
                  <View style={styles.statusMain}>
                    <Text style={styles.statusCurrentLabel}>Current HRV</Text>
                    <Text style={[styles.statusCurrentValue, { color: hrvStatus.statusColor }]}>
                      {hrvStatus.currentHRV.toFixed(0)} ms
                    </Text>
                    <Text style={[styles.statusBadge, { backgroundColor: hrvStatus.statusColor }]}>
                      {hrvStatus.status}
                    </Text>
                  </View>

                  <View style={styles.statusComparison}>
                    <View style={styles.statusMetric}>
                      <Text style={styles.statusMetricLabel}>Baseline</Text>
                      <Text style={styles.statusMetricValue}>
                        {hrvStatus.baseline.toFixed(0)} ms
                      </Text>
                    </View>
                    <View style={styles.statusMetric}>
                      <Text style={styles.statusMetricLabel}>Change</Text>
                      <Text
                        style={[
                          styles.statusMetricValue,
                          hrvStatus.change > 0
                            ? { color: '#2ecc71' }
                            : { color: '#e74c3c' },
                        ]}
                      >
                        {hrvStatus.change > 0 ? '+' : ''}{hrvStatus.change.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.interpretation}>
                  <Text style={styles.interpretationTitle}>Interpretation:</Text>
                  <Text style={styles.interpretationText}>{hrvStatus.interpretation}</Text>
                </View>

                <View style={styles.hrvExplanation}>
                  <Text style={styles.explanationTitle}>What is HRV?</Text>
                  <Text style={styles.explanationText}>
                    HRV is the variation in time between heartbeats. Higher HRV{'\n'}
                    generally indicates better recovery and lower stress.{'\n\n'}
                    Normal range: 40-100 ms{'\n'}
                    Athletes: 60-100+ ms
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'readiness' && readiness && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{readiness.emoji} Training Readiness</Text>
              <View style={styles.cardContent}>
                <View style={styles.readinessScore}>
                  <View style={styles.scoreCircle}>
                    <Text style={styles.scoreValue}>
                      {readiness.readinessScore.toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={[
                    styles.readinessLevel,
                    readiness.readinessLevel === 'Optimal' ? { color: '#2ecc71' } :
                    readiness.readinessLevel === 'Good' ? { color: '#3498db' } :
                    readiness.readinessLevel === 'Fair' ? { color: '#f39c12' } :
                    { color: '#e74c3c' }
                  ]}>
                    {readiness.readinessLevel}
                  </Text>
                </View>

                <View style={styles.readinessMetrics}>
                  <View style={styles.readinessMetric}>
                    <Text style={styles.readinessMetricLabel}>HRV Component</Text>
                    <View style={styles.metricBar}>
                      <View
                        style={[
                          styles.metricBarFill,
                          { width: `${Math.min(readiness.hrv * 2, 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.readinessMetricValue}>
                      {readiness.hrv.toFixed(1)}/50
                    </Text>
                  </View>

                  <View style={styles.readinessMetric}>
                    <Text style={styles.readinessMetricLabel}>TSB (Form)</Text>
                    <View style={styles.metricBar}>
                      <View
                        style={[
                          styles.metricBarFill,
                          {
                            width: `${Math.max(0, Math.min((readiness.tsb + 50) / 100 * 100, 100))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.readinessMetricValue}>
                      {readiness.tsb.toFixed(1)}/50
                    </Text>
                  </View>
                </View>

                <View style={styles.advice}>
                  <Text style={styles.adviceText}>💡 {readiness.advice}</Text>
                </View>

                <View style={styles.readinessScale}>
                  <Text style={styles.scaleTitle}>Readiness Scale:</Text>
                  <View style={styles.scaleItem}>
                    <View style={[styles.scaleDot, { backgroundColor: '#2ecc71' }]} />
                    <Text style={styles.scaleLabel}>Optimal (90-100%): Go hard!</Text>
                  </View>
                  <View style={styles.scaleItem}>
                    <View style={[styles.scaleDot, { backgroundColor: '#3498db' }]} />
                    <Text style={styles.scaleLabel}>Good (70-89%): Normal training</Text>
                  </View>
                  <View style={styles.scaleItem}>
                    <View style={[styles.scaleDot, { backgroundColor: '#f39c12' }]} />
                    <Text style={styles.scaleLabel}>Fair (50-69%): Easy pace</Text>
                  </View>
                  <View style={styles.scaleItem}>
                    <View style={[styles.scaleDot, { backgroundColor: '#e74c3c' }]} />
                    <Text style={styles.scaleLabel}>Low (&lt;50%): Rest/Recovery</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'anomalies' && (
          <View>
            {anomalies.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>⚠️ HRV Anomalies</Text>
                <View style={styles.cardContent}>
                  <Text style={styles.anomalyInfo}>
                    {anomalies.length} significant drop(s) detected in recent data
                  </Text>
                  {anomalies.map((anom, idx) => (
                    <View key={idx} style={styles.anomalyItem}>
                      <View style={styles.anomalyHeader}>
                        <Text style={styles.anomalyDate}>{anom.date}</Text>
                        <Text style={[
                          styles.anomalySeverity,
                          anom.significance === 'Critical' ? { color: '#e74c3c' } :
                          anom.significance === 'Major' ? { color: '#f39c12' } :
                          { color: '#3498db' }
                        ]}>
                          {anom.significance}
                        </Text>
                      </View>
                      <View style={styles.anomalyDetails}>
                        <View style={styles.anomalyDetail}>
                          <Text style={styles.anomalyDetailLabel}>Measured</Text>
                          <Text style={styles.anomalyDetailValue}>{anom.hrv} ms</Text>
                        </View>
                        <View style={styles.anomalyDetail}>
                          <Text style={styles.anomalyDetailLabel}>Baseline</Text>
                          <Text style={styles.anomalyDetailValue}>{anom.baseline} ms</Text>
                        </View>
                        <View style={styles.anomalyDetail}>
                          <Text style={styles.anomalyDetailLabel}>Drop</Text>
                          <Text style={[styles.anomalyDetailValue, { color: '#e74c3c' }]}>
                            -{anom.drop.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  <View style={styles.anomalyAdvice}>
                    <Text style={styles.anomalyAdviceTitle}>💡 Recommendations:</Text>
                    <Text style={styles.anomalyAdviceText}>
                      • Check for stress, illness, or poor sleep{'\n'}
                      • Consider reducing training intensity{'\n'}
                      • Allow extra recovery time{'\n'}
                      • Monitor HRV closely over next few days
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.cardContent}>
                  <Text style={styles.noAnomalyText}>
                    ✓ No significant anomalies detected!{'\n'}
                    Your HRV is stable and normal.
                  </Text>
                </View>
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
  headerContent: {
    display: 'flex',
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
  inputSection: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  manualInputBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualInputBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  manualInputForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitBtn: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cancelBtn: {
    backgroundColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 13,
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
  statusBox: {
    backgroundColor: colors.background,
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusMain: {
    alignItems: 'center',
    marginBottom: 12,
  },
  statusCurrentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusCurrentValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  statusComparison: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusMetric: {
    alignItems: 'center',
  },
  statusMetricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  interpretation: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  interpretationTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  interpretationText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  hrvExplanation: {
    backgroundColor: colors.background,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  readinessScore: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  readinessLevel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  readinessMetrics: {
    marginBottom: 12,
  },
  readinessMetric: {
    marginBottom: 12,
  },
  readinessMetricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  metricBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  metricBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  readinessMetricValue: {
    fontSize: 11,
    color: colors.textSecondary,
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
  adviceText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  readinessScale: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  scaleTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  scaleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  scaleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  scaleLabel: {
    fontSize: 11,
    color: colors.text,
  },
  anomalyInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  anomalyItem: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  anomalyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  anomalyDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  anomalySeverity: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  anomalyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  anomalyDetail: {
    alignItems: 'center',
  },
  anomalyDetailLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  anomalyDetailValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
  },
  anomalyAdvice: {
    backgroundColor: colors.background,
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  anomalyAdviceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f39c12',
    marginBottom: 4,
  },
  anomalyAdviceText: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 14,
  },
  noAnomalyText: {
    fontSize: 14,
    color: '#2ecc71',
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
