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
}

interface FTPData {
  currentFTP: number;
  prediction: {
    ftpEstimated: number;
    method: string;
    confidence: string;
  };
  trend: {
    recentAvg: number;
    trend: string;
    recommendation: string;
  };
}

interface CriticalPowerData {
  CP: number;
  Wprime: number;
  method: string;
}

interface PMCForecast {
  current: {
    CTL: number;
    ATL: number;
    TSB: number;
  };
  forecast: Array<{
    day: number;
    CTL: number;
    ATL: number;
    TSB: number;
    tss: number;
  }>;
}

interface DailyRec {
  recommendation: string;
  intensity: string;
  duration: string;
  reason: string;
}

export default function AdvancedAnalyticsScreen({
  jwt,
  apiBase = 'http://localhost:3001',
}: Props) {
  const [activeTab, setActiveTab] = useState<'ftp' | 'pmc'>('ftp');
  const [loading, setLoading] = useState(true);
  const [ftpData, setFtpData] = useState<FTPData | null>(null);
  const [cpData, setCpData] = useState<CriticalPowerData | null>(null);
  const [pmcData, setPmcData] = useState<PMCForecast | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all advanced analytics in parallel
      const [ftpRes, cpRes, pmcRes] = await Promise.all([
        fetch(`${apiBase}/advanced/ftp-prediction`, {
          headers: { Authorization: `Bearer ${jwt}` },
        }),
        fetch(`${apiBase}/advanced/critical-power`, {
          headers: { Authorization: `Bearer ${jwt}` },
        }),
        fetch(`${apiBase}/advanced/pmc-forecast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            plannedTSS: [100, 80, 120, 0, 90, 110, 150],
          }),
        }),
      ]);

      if (ftpRes.ok) setFtpData(await ftpRes.json());
      if (cpRes.ok) setCpData(await cpRes.json());
      if (pmcRes.ok) setPmcData(await pmcRes.json());

      if (!ftpRes.ok || !cpRes.ok) {
        setError('Error al cargar los datos de análisis');
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', 'No se pudieron cargar los datos de análisis');
    } finally {
      setLoading(false);
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
        <Text style={styles.title}>🚀 Advanced Analytics</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchAnalytics}
          disabled={loading}
        >
          <Text style={styles.refreshBtnText}>⟳</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ftp' && styles.activeTab]}
          onPress={() => setActiveTab('ftp')}
        >
          <Text style={[styles.tabText, activeTab === 'ftp' && styles.activeTabText]}>
            FTP / CP
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pmc' && styles.activeTab]}
          onPress={() => setActiveTab('pmc')}
        >
          <Text style={[styles.tabText, activeTab === 'pmc' && styles.activeTabText]}>
            Proyección PMC
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

        {activeTab === 'ftp' && (
          <View>
            {/* FTP Card */}
            {ftpData && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📊 FTP Analysis</Text>
                <View style={styles.cardContent}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Current FTP</Text>
                    <Text style={styles.metricValue}>{ftpData.currentFTP}W</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Estimated FTP</Text>
                    <Text style={styles.metricValue}>
                      {ftpData.prediction.ftpEstimated}W
                    </Text>
                    <Text style={styles.metricSubtext}>
                      Method: {ftpData.prediction.method}
                    </Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>90-Day Trend</Text>
                    <Text style={styles.metricValue}>{ftpData.trend.recentAvg}W</Text>
                    <Text style={styles.metricSubtext}>{ftpData.trend.trend}</Text>
                  </View>
                  <View style={styles.recommendation}>
                    <Text style={styles.recommendationText}>
                      💡 {ftpData.trend.recommendation}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Critical Power Card */}
            {cpData && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>⚡ Modelo de Potencia Crítica</Text>
                <Text style={styles.cardSubtitle}>
                  El modelo de potencia crítica te ayuda a entender tu capacidad aeróbica (CP) y anaeróbica (W'). 
                  CP es la potencia máxima que puedes mantener indefinidamente sin fatigarte, mientras que W' 
                  representa tu reserva de energía anaeróbica para esfuerzos intensos.
                </Text>
                <View style={styles.cardContent}>
                  <View style={[styles.metric, styles.metricDouble]}>
                    <View style={styles.metricHalf}>
                      <Text style={styles.metricLabel}>CP (Sostenible)</Text>
                      <Text style={styles.metricValue}>{cpData.CP}W</Text>
                      <Text style={styles.metricSubtext}>
                        Potencia que puedes mantener indefinidamente
                      </Text>
                    </View>
                    <View style={styles.metricHalf}>
                      <Text style={styles.metricLabel}>W' (Anaeróbico)</Text>
                      <Text style={styles.metricValue}>
                        {(cpData.Wprime / 1000).toFixed(1)}kJ
                      </Text>
                      <Text style={styles.metricSubtext}>
                        Capacidad anaeróbica disponible
                      </Text>
                    </View>
                  </View>
                  <View style={styles.interpretation}>
                    <Text style={styles.interpretationTitle}>Cómo funciona:</Text>
                    <Text style={styles.interpretationText}>
                      • CP es tu nivel teórico de potencia infinita{'\n'}
                      • W' es tu reserva anaeróbica{'\n'}
                      • Una vez que W' se agota, caes a CP
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'pmc' && (
          <View>
            {pmcData && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📈 Proyección PMC</Text>
                <Text style={styles.cardSubtitle}>
                  El modelo Performance Management Chart (PMC) te ayuda a gestionar tu forma física. 
                  CTL (Chronic Training Load) mide tu forma acumulada, ATL (Acute Training Load) mide tu fatiga reciente, 
                  y TSB (Training Stress Balance) indica tu estado de forma - positivo significa descansado, negativo significa fatigado.
                </Text>
                <View style={styles.cardContent}>
                  <View style={styles.currentStatus}>
                    <View style={styles.statusMetric}>
                      <Text style={styles.statusLabel}>CTL (Forma Física)</Text>
                      <Text style={styles.statusValue}>{pmcData.current.CTL.toFixed(1)}</Text>
                    </View>
                    <View style={styles.statusMetric}>
                      <Text style={styles.statusLabel}>ATL (Fatiga)</Text>
                      <Text style={styles.statusValue}>{pmcData.current.ATL.toFixed(1)}</Text>
                    </View>
                    <View style={styles.statusMetric}>
                      <Text style={styles.statusLabel}>TSB (Forma)</Text>
                      <Text
                        style={[
                          styles.statusValue,
                          pmcData.current.TSB > 0 ? { color: '#2ecc71' } : { color: '#e74c3c' },
                        ]}
                      >
                        {pmcData.current.TSB.toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.forecastTable}>
                    <Text style={styles.forecastTitle}>Proyección de 7 días:</Text>
                    {pmcData.forecast.slice(0, 7).map((day, idx) => (
                      <View style={styles.forecastRow} key={idx}>
                        <Text style={styles.forecastDay}>Día {day.day}</Text>
                        <Text style={styles.forecastValue}>
                          CTL: {day.CTL.toFixed(1)} | ATL: {day.ATL.toFixed(1)} | TSB:{' '}
                          {day.TSB.toFixed(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  refreshBtn: {
    padding: 8,
  },
  refreshBtnText: {
    fontSize: 18,
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
      cardSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        lineHeight: 18,
        backgroundColor: colors.surfaceLight,
      },
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
  metric: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricDouble: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricHalf: {
    flex: 1,
    marginRight: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  recommendation: {
    backgroundColor: colors.background,
    borderLeftWidth: 3,
    borderLeftColor: '#2ecc71',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  recommendationTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  interpretation: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  interpretationTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 6,
  },
  interpretationText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  currentStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusMetric: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  forecastTable: {
    marginTop: 12,
  },
  forecastTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  forecastDay: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  forecastValue: {
    fontSize: 11,
    color: colors.textSecondary},
  coachDetails: {
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  detailReasonBox: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  detailReason: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
    marginTop: 6,
  },
});
