/**
 * Pantalla de clasificador de sesiones: detecta automáticamente
 * el tipo de entrenamiento (Sweet Spot, VO2max, polarizado, etc.)
 * a partir de las métricas de potencia (IF, VI, tiempo en zonas).
 */
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
  // Tab activa: clasificación de la sesión o distribución del entrenamiento
  const [activeTab, setActiveTab] = useState<'classification' | 'distribution'>('classification');
  const [loading, setLoading] = useState(true);
  // Resultado del clasificador para la actividad seleccionada
  const [classification, setClassification] = useState<SessionClassification | null>(null);
  // Distribución global de tipos de entrenamiento (Sweet Spot, VO2max, etc.)
  const [distribution, setDistribution] = useState<TrainingDistribution | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Listado de actividades recientes para el selector
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

  // Cargar actividades recientes para el selector de sesión
  const fetchActivities = async () => {
    try {
      const res = await fetch(
        `${apiBase}/strava/activities?per_page=20`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const activitiesList = Array.isArray(data)
          ? data
          : Array.isArray(data?.activities)
            ? data.activities
            : [];
        setActivities(activitiesList);
        if (activitiesList[0]) {
          const firstId = String(activitiesList[0].id);
          setSelectedActivity(firstId);
          fetchClassification(firstId);
        }
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  // Clasificar la sesión de una actividad concreta
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

  // Calcular distribución global del tipo de entrenamientos
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
        <Text style={styles.title}>🎯 Clasificador de Sesiones</Text>
        <Text style={styles.subtitle}>Detección de Tipo de Entrenamiento</Text>
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
            Clasificación
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'distribution' && styles.activeTab]}
          onPress={() => setActiveTab('distribution')}
        >
          <Text
            style={[styles.tabText, activeTab === 'distribution' && styles.activeTabText]}
          >
            Distribución
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
                  <Text style={styles.confidenceLabel}>Confianza</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.featuresList}>
                  <Text style={styles.featuresTitle}>Métricas de la sesión:</Text>
                  <View style={styles.featureRow}>
                    <View style={styles.featureLabelCol}>
                      <Text style={styles.featureLabel}>IF (Factor Intensidad)</Text>
                      <Text style={styles.featureHint}>NP ÷ FTP — &lt;0.75 suave, &gt;1.0 muy duro</Text>
                    </View>
                    <Text style={styles.featureValue}>
                      {classification.features.IF.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <View style={styles.featureLabelCol}>
                      <Text style={styles.featureLabel}>VI (Índice Variabilidad)</Text>
                      <Text style={styles.featureHint}>NP ÷ Pot. Media — 1.0=constante, &gt;1.05=esfuerzos</Text>
                    </View>
                    <Text style={styles.featureValue}>
                      {classification.features.VI.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <View style={styles.featureLabelCol}>
                      <Text style={styles.featureLabel}>Z5 — Anaeróbico</Text>
                      <Text style={styles.featureHint}>120-150% FTP: esprints y ataques</Text>
                    </View>
                    <Text style={styles.featureValue}>
                      {Math.round(classification.features.timeInZ5)}min
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <View style={styles.featureLabelCol}>
                      <Text style={styles.featureLabel}>Z4 — VO2max</Text>
                      <Text style={styles.featureHint}>105-120% FTP: intervals cortos y duros</Text>
                    </View>
                    <Text style={styles.featureValue}>
                      {Math.round(classification.features.timeInZ4)}min
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <View style={styles.featureLabelCol}>
                      <Text style={styles.featureLabel}>Z3 — Umbral / Tempo</Text>
                      <Text style={styles.featureHint}>90-105% FTP: sweet spot y umbral</Text>
                    </View>
                    <Text style={styles.featureValue}>
                      {Math.round(classification.features.timeInZ3)}min
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <View style={styles.featureLabelCol}>
                      <Text style={styles.featureLabel}>Potencia Media</Text>
                      <Text style={styles.featureHint}>Vatios promedio durante la sesión</Text>
                    </View>
                    <Text style={styles.featureValue}>
                      {classification.features.avgPower.toFixed(0)}W
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <View style={styles.featureLabelCol}>
                      <Text style={styles.featureLabel}>Potencia Normalizada (NP)</Text>
                      <Text style={styles.featureHint}>Esfuerzo real equivalente a ritmo constante</Text>
                    </View>
                    <Text style={styles.featureValue}>
                      {classification.features.normPower.toFixed(0)}W
                    </Text>
                  </View>
                </View>

                <View style={styles.interpretationBox}>
                  <Text style={styles.interpretationTitle}>Qué significa esta sesión:</Text>
                  <Text style={styles.interpretationText}>
                    {classification.interpretation}
                  </Text>
                </View>

                <View style={styles.benefitBox}>
                  <Text style={styles.benefitTitle}>🏆 Beneficio del entrenamiento:</Text>
                  <Text style={styles.benefitText}>{classification.trainingBenefit}</Text>
                </View>

                {classification.recommendations.length > 0 && (
                  <View style={styles.recommendationsBox}>
                    <Text style={styles.recommendationsTitle}>💡 Recomendaciones:</Text>
                    {classification.recommendations.map((rec, idx) => (
                      <Text key={`rec-${idx}`} style={styles.recommendationItem}>
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
              <Text style={styles.cardTitle}>📊 Distribución del Entrenamiento</Text>
              <Text style={styles.cardSubtitle}>Global · últimas ~30 sesiones con datos de potencia</Text>
              <View style={styles.cardContent}>
                <View style={styles.distributionChart}>
                  {[
                    { name: 'Sweet Spot', value: distribution.sweetSpot, color: '#8B4513' },
                    { name: 'VO2max', value: distribution.VO2max, color: '#FF6B6B' },
                    { name: 'Fácil', value: distribution.easy, color: '#51CF66' },
                    { name: 'Anaeróbico', value: distribution.anaerobic, color: '#FF1744' },
                    { name: 'Resistencia', value: distribution.endurance, color: '#00BCD4' },
                    { name: 'Otros', value: distribution.other, color: colors.border },
                  ].map((type) => {
                    if (type.value === 0) return null;
                    return (
                      <View style={styles.distributionItem}>
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
                    <Text style={styles.polarizationTitle}>⚖️ Análisis de Polarización</Text>
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
                      <Text style={styles.polarizationInfoTitle}>¿Qué es la Polarización?</Text>
                      <Text style={styles.polarizationInfoText}>
                        Los ciclistas élite entrenan según la regla 80/20:{'\n'}
                        80% en Zona 2 o inferior (suave){'\n'}
                        20% en Zona 4 o superior (intenso)
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.sessionTypeExplainer}>
                  <Text style={styles.explainerTitle}>📚 Tipos de Sesión:</Text>

                  <View style={styles.explainerItem}>
                    <Text style={[styles.explainerEmoji, { color: '#51CF66' }]}>🚴</Text>
                    <View style={styles.explainerContent}>
                      <Text style={styles.explainerName}>Salidas Fáciles</Text>
                      <Text style={styles.explainerDesc}>
                        Zona 1-2: Base aeróbica, recuperación, bajo estrés
                      </Text>
                    </View>
                  </View>

                  <View style={styles.explainerItem}>
                    <Text style={[styles.explainerEmoji, { color: '#00BCD4' }]}>📈</Text>
                    <View style={styles.explainerContent}>
                      <Text style={styles.explainerName}>Resistencia</Text>
                      <Text style={styles.explainerDesc}>
                        Zona 2-3: Larga duración, adaptación a grasas
                      </Text>
                    </View>
                  </View>

                  <View style={styles.explainerItem}>
                    <Text style={[styles.explainerEmoji, { color: '#8B4513' }]}>💪</Text>
                    <View style={styles.explainerContent}>
                      <Text style={styles.explainerName}>Sweet Spot</Text>
                      <Text style={styles.explainerDesc}>
                        Zona 3-4: Potencia sostenida alta, mejora la forma física
                      </Text>
                    </View>
                  </View>

                  <View style={styles.explainerItem}>
                    <Text style={[styles.explainerEmoji, { color: '#FF6B6B' }]}>⚡</Text>
                    <View style={styles.explainerContent}>
                      <Text style={styles.explainerName}>VO2max</Text>
                      <Text style={styles.explainerDesc}>
                        Zona 4-5a: Intervalos de alta intensidad, potencia aeróbica
                      </Text>
                    </View>
                  </View>

                  <View style={styles.explainerItem}>
                    <Text style={[styles.explainerEmoji, { color: '#FF1744' }]}>🔥</Text>
                    <View style={styles.explainerContent}>
                      <Text style={styles.explainerName}>Anaeróbico</Text>
                      <Text style={styles.explainerDesc}>
                        Zona 5b-6: Esfuerzos máximos 1-10min, esprints
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
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureLabelCol: {
    flex: 1,
    paddingRight: 8,
  },
  featureLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  featureHint: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  featureValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingBottom: 6,
    fontStyle: 'italic',
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
