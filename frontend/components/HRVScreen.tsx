/**
 * Pantalla de HRV (Variabilidad de la Frecuencia Cardíaca):
 * muestra el estado actual del HRV del atleta y su disposición
 * para el entrenamiento, con tabs de Estado y Disposición.
 */
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

export default function HRVScreen({
  jwt,
  apiBase = 'http://localhost:3001',
}: Props) {
  // Tab activa: 'status' (estado HRV) o 'readiness' (disposición al entrenamiento)
  const [activeTab, setActiveTab] = useState<'status' | 'readiness'>('status');
  const [loading, setLoading] = useState(true);
  // Estado del HRV (valor actual, línea base, tendencia)
  const [hrvStatus, setHrvStatus] = useState<HRVStatus | null>(null);
  // Disposición al entrenamiento (puntuación, nivel, consejo)
  const [readiness, setReadiness] = useState<TrainingReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Campo para introducir HRV manualmente
  const [manualHrv, setManualHrv] = useState('');
  const [showInput, setShowInput] = useState(false);

  // Devuelve número seguro (evita NaN/Infinity)
  const safeNumber = (value: any, fallback = 0) => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  // Color según estado del HRV (excellent, good, normal, low, very_low)
  const statusColorFor = (status: string) => {
    switch (status) {
      case 'excellent':
        return '#2ecc71';
      case 'good':
        return '#3498db';
      case 'normal':
        return '#95a5a6';
      case 'low':
        return '#f39c12';
      case 'very_low':
        return '#e74c3c';
      default:
        return '#9ca3af';
    }
  };

  /**
   * Normaliza la respuesta de la API de estado HRV a la interfaz HRVStatus.
   * Maneja las distintas formas en que el backend puede devolver los datos.
   */
  const normalizeStatus = (payload: any): HRVStatus => {
    const statusObj = payload?.status || {};
    const avgObj = payload?.average || {};
    const currentHRV = safeNumber(statusObj.todayRMSSD ?? payload?.today, 0);
    const baseline = safeNumber(statusObj.baseline ?? avgObj.average, 0);
    const change = Number.isFinite(statusObj.deviation)
      ? Number(statusObj.deviation)
      : baseline > 0
        ? ((currentHRV - baseline) / baseline) * 100
        : 0;
    const statusKey = statusObj.status || 'unknown';
    const statusLabel = String(statusKey).replace(/_/g, ' ');
    const interpretation = [statusObj.message, statusObj.recommendation]
      .filter(Boolean)
      .join(' ');

    return {
      currentHRV,
      baseline,
      status: statusLabel,
      statusColor: statusColorFor(statusKey),
      change,
      interpretation: interpretation || 'Sin datos suficientes para interpretar.',
    };
  };

  /**
   * Normaliza la respuesta de la API de disposición al entrenamiento
   * a la interfaz TrainingReadiness.
   */
  const normalizeReadiness = (payload: any): TrainingReadiness => {
    const readiness = payload?.readiness || {};
    const hrvScore = safeNumber(readiness?.components?.hrv?.score, 50);
    const tsbValue = safeNumber(readiness?.components?.tsb?.value, 0);
    const readinessScore = safeNumber(readiness.readiness, 50);
    const level = readiness.level || 'moderate';
    const levelLabel =
      level === 'high' ? 'Óptimo' :
      level === 'moderate' ? 'Bueno' :
      level === 'low' ? 'Regular' :
      'Bajo';
    const emoji =
      level === 'high' ? '🔥' :
      level === 'moderate' ? '💪' :
      level === 'low' ? '😌' :
      '🛌';

    return {
      hrv: hrvScore / 2,
      tsb: tsbValue,
      readinessScore,
      readinessLevel: levelLabel,
      advice: readiness.recommendation || 'Sin recomendacion disponible.',
      emoji,
    };
  };

  useEffect(() => {
    fetchHRVData();
  }, []);

  const fetchHRVData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Default HRV for demo (normally from user input or device)
      const defaultHRV = 52;

      const [statusRes, readinessRes] = await Promise.all([
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
      ]);

      const statusPayload = statusRes.ok ? await statusRes.json() : null;
      const readinessPayload = readinessRes.ok ? await readinessRes.json() : null;

      if (statusPayload) setHrvStatus(normalizeStatus(statusPayload));
      if (readinessPayload) setReadiness(normalizeReadiness(readinessPayload));

      if (!statusRes.ok) {
        setError('Error al cargar datos HRV');
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
      Alert.alert('HRV inválido', 'Por favor ingrese un valor de HRV válido');
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

      const statusPayload = statusRes.ok ? await statusRes.json() : null;
      const readinessPayload = readinessRes.ok ? await readinessRes.json() : null;
      if (statusPayload) setHrvStatus(normalizeStatus(statusPayload));
      if (readinessPayload) setReadiness(normalizeReadiness(readinessPayload));

      setManualHrv('');
      setShowInput(false);
      Alert.alert('Éxito', 'Datos HRV actualizados');
    } catch (err) {
      Alert.alert('Error', 'Fallo al actualizar HRV');
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
          <Text style={styles.subtitle}>Análisis de Variabilidad de Frecuencia Cardíaca</Text>
        </View>
      </View>

      {/* Input Button */}
      <View style={styles.inputSection}>
        {!showInput ? (
          <TouchableOpacity
            style={styles.manualInputBtn}
            onPress={() => setShowInput(true)}
          >
            <Text style={styles.manualInputBtnText}>📱 Ingresar HRV Manualmente</Text>
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
              <Text style={styles.submitBtnText}>✓ Enviar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowInput(false);
                setManualHrv('');
              }}
            >
              <Text style={styles.cancelBtnText}>✕ Cancelar</Text>
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
            Estado
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'readiness' && styles.activeTab]}
          onPress={() => setActiveTab('readiness')}
        >
          <Text
            style={[styles.tabText, activeTab === 'readiness' && styles.activeTabText]}
          >
            Disposición
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
              <Text style={styles.cardTitle}>📊 Estado HRV</Text>
              <View style={styles.cardContent}>
                <View style={[styles.statusBox, { borderLeftColor: hrvStatus.statusColor }]}>
                  <View style={styles.statusMain}>
                    <Text style={styles.statusCurrentLabel}>HRV Actual</Text>
                    <Text style={[styles.statusCurrentValue, { color: hrvStatus.statusColor }]}>
                      {hrvStatus.currentHRV.toFixed(0)} ms
                    </Text>
                    <Text style={[styles.statusBadge, { backgroundColor: hrvStatus.statusColor }]}>
                      {hrvStatus.status}
                    </Text>
                  </View>

                  <View style={styles.statusComparison}>
                    <View style={styles.statusMetric}>
                      <Text style={styles.statusMetricLabel}>Línea Base</Text>
                      <Text style={styles.statusMetricValue}>
                        {hrvStatus.baseline.toFixed(0)} ms
                      </Text>
                    </View>
                    <View style={styles.statusMetric}>
                      <Text style={styles.statusMetricLabel}>Cambio</Text>
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
                  <Text style={styles.interpretationTitle}>Interpretación:</Text>
                  <Text style={styles.interpretationText}>{hrvStatus.interpretation}</Text>
                </View>

                <View style={styles.hrvExplanation}>
                  <Text style={styles.explanationTitle}>¿Qué es HRV?</Text>
                  <Text style={styles.explanationText}>
                    HRV es la variación en el tiempo entre latidos. Un HRV más alto{'\n'}
                    generalmente indica mejor recuperación y menor estrés.{'\n\n'}
                    Rango normal: 40-100 ms{'\n'}
                    Atletas: 60-100+ ms
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'readiness' && readiness && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{readiness.emoji} Disposición de Entrenamiento</Text>
              <View style={styles.cardContent}>
                <View style={styles.readinessScore}>
                  <View style={styles.scoreCircle}>
                    <Text style={styles.scoreValue}>
                      {readiness.readinessScore.toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={[
                    styles.readinessLevel,
                    readiness.readinessLevel === 'Óptimo' ? { color: '#2ecc71' } :
                    readiness.readinessLevel === 'Bueno' ? { color: '#3498db' } :
                    readiness.readinessLevel === 'Regular' ? { color: '#f39c12' } :
                    { color: '#e74c3c' }
                  ]}>
                    {readiness.readinessLevel}
                  </Text>
                </View>

                <View style={styles.readinessMetrics}>
                  <View style={styles.readinessMetric}>
                    <Text style={styles.readinessMetricLabel}>Componente HRV</Text>
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
                    <Text style={styles.readinessMetricLabel}>TSB (Forma)</Text>
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
                  <Text style={styles.scaleTitle}>Escala de Disposición:</Text>
                  {[
                    { color: '#2ecc71', label: 'Óptimo (90-100%): ¡Entrena fuerte!' },
                    { color: '#3498db', label: 'Bueno (70-89%): Entrenamiento normal' },
                    { color: '#f39c12', label: 'Regular (50-69%): Ritmo fácil' },
                    { color: '#e74c3c', label: 'Bajo (<50%): Descanso/Recuperación' }
                  ].map((item, idx) => (
                    <View key={`scale-${idx}`} style={styles.scaleItem}>
                      <View style={[styles.scaleDot, { backgroundColor: item.color }]} />
                      <Text style={styles.scaleLabel}>{item.label}</Text>
                    </View>
                  ))}
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
