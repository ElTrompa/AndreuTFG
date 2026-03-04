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

interface WorkoutZone {
  zone: string;
  color: string;
  ftp_range: string;
  description: string;
}

interface WorkoutRecommendation {
  status: string;
  emoji: string;
  message: string;
  workout: {
    type: string;
    duration: number;
    zones: string[];
    description: string;
    intensity: string;
  };
  reasoning: string;
}

export default function CoachingScreen({
  jwt,
  apiBase = 'http://localhost:3001',
}: Props) {
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<WorkoutRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const POWER_ZONES: WorkoutZone[] = [
    { zone: 'Z1', color: '#95a5a6', ftp_range: '< 55%', description: 'Recuperación / Rodaje suave' },
    { zone: 'Z2', color: '#3498db', ftp_range: '55-75%', description: 'Resistencia / Base aeróbica' },
    { zone: 'Z3', color: '#2ecc71', ftp_range: '75-90%', description: 'Tempo / Umbral bajo' },
    { zone: 'Z4', color: '#f39c12', ftp_range: '90-105%', description: 'Sweet Spot / Umbral' },
    { zone: 'Z5', color: '#e74c3c', ftp_range: '105-120%', description: 'VO2max' },
    { zone: 'Z6', color: '#c0392b', ftp_range: '120-150%', description: 'Anaeróbico' },
    { zone: 'Z7', color: '#8b0000', ftp_range: '> 150%', description: 'Potencia Neuromuscular' },
  ];

  useEffect(() => {
    fetchCoachingData();
  }, []);

  const fetchCoachingData = async () => {
    if (!jwt) {
      setError('Sin token de autenticación');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch profile (optional — coaching works without it)
      const profileRes = await fetch(`${apiBase}/profile`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
      }

      // Fetch coaching recommendation
      const coachRes = await fetch(`${apiBase}/specialized/coaching`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (coachRes.ok) {
        const coachData = await coachRes.json();
        setRecommendation(coachData.recommendation || null);
        // Update profile from coaching response if not already loaded
        if (!profile && coachData.profile?.ftp) {
          setProfile(coachData.profile);
        }
      } else {
        const errData = await coachRes.json().catch(() => ({}));
        setError(errData.error || 'Error al cargar la recomendación');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando recomendación de entrenamiento...</Text>
        </View>
      </View>
    );
  }

  const getZoneColor = (zone: string) => {
    return POWER_ZONES.find(z => z.zone === zone)?.color || '#95a5a6';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏋️ Entrenador</Text>
          <Text style={styles.subtitle}>Entrenamientos en Base de Zona de Potencia</Text>
        </View>

        {/* Today's Recommendation */}
        {recommendation ? (
          <View style={styles.card}>
            <View style={styles.recommendationHeader}>
              <Text style={styles.emoji}>{recommendation.emoji}</Text>
              <View style={styles.recommendationMeta}>
                <Text style={styles.status}>{recommendation.status.toUpperCase()}</Text>
                <Text style={styles.message}>{recommendation.message}</Text>
              </View>
            </View>

            {/* Workout Details */}
            <View style={styles.workoutCard}>
              <Text style={styles.workoutType}>
                {recommendation.workout.type.replace(/_/g, ' ').toUpperCase()}
              </Text>

              <View style={styles.workoutDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duración</Text>
                  <Text style={styles.detailValue}>{recommendation.workout.duration > 0 ? `${recommendation.workout.duration} min` : 'Descanso'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Intensidad</Text>
                  <Text style={styles.detailValue}>{recommendation.workout.intensity || '—'}</Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText}>
                  {recommendation.workout.description}
                </Text>
              </View>

              {/* Zones Used */}
              {recommendation.workout.zones.length > 0 && (
                <View style={styles.zonesSection}>
                  <Text style={styles.zonesSectionTitle}>Zonas a trabajar:</Text>
                  <View style={styles.zonesContainer}>
                    {recommendation.workout.zones.map((zone, idx) => {
                      const zoneProps: any = { key: `zone-${idx}` };
                      return (
                        <View
                          {...zoneProps}
                          style={[
                            styles.zoneBadge,
                            { backgroundColor: getZoneColor(zone) },
                          ]}
                        >
                          <Text style={styles.zoneBadgeText}>{zone}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Reasoning */}
              <View style={styles.reasoningBox}>
                <Text style={styles.reasoningLabel}>¿Por qué este entrenamiento?</Text>
                <Text style={styles.reasoningText}>{recommendation.reasoning}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.errorText}>No hay recomendación disponible</Text>
          </View>
        )}

        {/* Power Zones Reference */}
        <View style={styles.card}>
          <Text style={styles.zoneRefTitle}>🎯 Zonas de Potencia</Text>
          <Text style={styles.zoneRefSubtitle}>
            {profile?.ftp ? `Tu FTP: ${profile.ftp}W` : 'Configura tu FTP en Perfil para valores personalizados'}
          </Text>

          <View style={styles.zonesList}>
            {POWER_ZONES.map((zone, idx) => {
              const zoneProps: any = { key: `ref-zone-${idx}` };
              return (
                <View {...zoneProps} style={styles.zoneRefItem}>
                  <View
                    style={[
                      styles.zoneRefColor,
                      { backgroundColor: zone.color },
                    ]}
                  />
                  <View style={styles.zoneRefContent}>
                    <Text style={styles.zoneRefLabel}>{zone.zone}</Text>
                    <Text style={styles.zoneRefDesc}>{zone.description}</Text>
                  </View>
                  <Text style={styles.zoneRefRange}>{zone.ftp_range}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Consejos de entrenamiento */}
        <View style={styles.card}>
          <Text style={styles.tipsTitle}>💡 Consejos de Entrenamiento</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tip}>• Calienta siempre 10-15 min en Z1-Z2 antes de intensidad</Text>
            <Text style={styles.tip}>• Escucha a tu cuerpo: el dolor muscular leve es normal, el dolor agudo no</Text>
            <Text style={styles.tip}>• Enfría 5-10 min en Z1 al finalizar cada sesión</Text>
            <Text style={styles.tip}>• Combina potencia con percepción de esfuerzo y frecuencia cardíaca</Text>
            <Text style={styles.tip}>• Los días de recuperación son tan importantes como los días duros</Text>
            <Text style={styles.tip}>• Hidrátate bien: mínimo 500ml/h en rodajes de más de 60 min</Text>
          </View>
        </View>
      </ScrollView>

      {/* Refresh Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchCoachingData}
          disabled={loading}
        >
          <Text style={styles.refreshBtnText}>⟳ Actualizar Recomendación</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 40,
    marginRight: 12,
  },
  recommendationMeta: {
    flex: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  message: {
    fontSize: 14,
    color: colors.text,
    marginTop: 4,
    fontWeight: '500',
  },
  workoutCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 12,
  },
  workoutType: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  workoutDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  descriptionBox: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  zonesSection: {
    marginBottom: 12,
  },
  zonesSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  zonesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  zoneBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  zoneBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  reasoningBox: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 10,
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  reasoningText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 10,
  },
  zoneRefTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  zoneRefSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  zonesList: {
    gap: 8,
  },
  zoneRefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 10,
  },
  zoneRefColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  zoneRefContent: {
    flex: 1,
  },
  zoneRefLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  zoneRefDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  zoneRefRange: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tip: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  refreshBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
