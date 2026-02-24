import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

type ViewType = 'daily' | 'weekly' | 'monthly';

interface PMCData {
  date: string;
  tss: number;
  atl: number;
  ctl: number;
  tsb: number;
}

interface Summary {
  current_atl: number;
  current_ctl: number;
  current_tsb: number;
  status: {
    fatigue_level: string;
    form_level: string;
    freshness_level: string;
    recommendation: string;
  };
}

interface Props {
  jwt: string | null;
  profile: any;
  onLoadActivities: () => void;
  apiBase?: string;
}

const HomeScreen: React.FC<Props> = ({ jwt, profile, onLoadActivities, apiBase = 'http://localhost:3001' }) => {
  const [view, setView] = useState<ViewType>('weekly');
  const [loading, setLoading] = useState(false);
  const [pmcData, setPmcData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[HomeScreen] useEffect triggered - jwt:', jwt ? 'present' : 'missing', 'profile:', profile ? 'present' : 'missing', 'ftp:', profile?.ftp || 'missing');
    if (jwt && profile?.ftp) {
      console.log('[HomeScreen] Conditions met, calling loadPMCData');
      loadPMCData();
    } else {
      console.log('[HomeScreen] Conditions not met - jwt:', !!jwt, 'profile:', !!profile, 'ftp:', !!profile?.ftp);
    }
  }, [jwt, profile]);

  const loadPMCData = async () => {
    if (!jwt) {
      console.log('[loadPMCData] No JWT available');
      return;
    }
    
    console.log('[loadPMCData] Starting request to', `${apiBase}/strava/pmc?view=all&days=90`);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/strava/pmc?view=all&days=90`, {
        headers: { Authorization: `Bearer ${jwt}` }
      });

      console.log('[loadPMCData] Response status:', response.status);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Server error: ${response.status}`;
        
        if (contentType?.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Could not parse JSON error
          }
        }
        
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Server returned invalid content type: ' + (contentType || 'unknown'));
      }

      const data = await response.json();
      console.log('[loadPMCData] Success! Got data with daily entries:', data.daily?.length || 0);
      setPmcData(data);
    } catch (err: any) {
      console.error('[loadPMCData]error:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const renderMetricCard = (label: string, value: string | number, color: string, subtitle?: string) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const formatStatusLabel = (level: string): string => {
    return level.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  /**
   * Genera gráfica SVG simple de líneas
   */
  const generateChart = () => {
    if (!pmcData) return null;

    let data: any[] = [];
    
    if (view === 'daily') {
      data = (pmcData.daily || []).slice(-14);
    } else if (view === 'weekly') {
      data = (pmcData.weekly || []).slice(-8);
    } else {
      data = (pmcData.monthly || []).slice(-12);
    }

    if (data.length === 0) {
      return <Text style={styles.noData}>No hay datos para mostrar</Text>;
    }

    const chartWidth = Math.max(screenWidth - 40, data.length * 40);
    const chartHeight = 250;
    const padding = 40;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;

    // Encontrar máximos y mínimos
    const allValues = data.flatMap(d => [d.atl || d.atl_end || 0, d.ctl || d.ctl_end || 0]);
    const maxValue = Math.max(...allValues, 1);
    const minValue = Math.min(...allValues, 0);
    const range = maxValue - minValue || 1;

    // Escalar valores
    const scale = (val: number) => {
      const normalized = (val - minValue) / range;
      return padding + graphHeight - (normalized * graphHeight);
    };

    // Generar puntos para ATL
    const atlPoints = data
      .map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * graphWidth;
        const y = scale(d.atl || d.atl_end || 0);
        return `${x},${y}`;
      })
      .join(' ');

    // Generar puntos para CTL
    const ctlPoints = data
      .map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * graphWidth;
        const y = scale(d.ctl || d.ctl_end || 0);
        return `${x},${y}`;
      })
      .join(' ');

    // Generar puntos para TSB
    const tsbPoints = data
      .map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * graphWidth;
        const y = scale(d.tsb || d.tsb_end || 0);
        return `${x},${y}`;
      })
      .join(' ');

    // Crear SVG
    const svg = `<svg width="${chartWidth}" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${chartWidth}" height="${chartHeight}" fill="#ffffff"/>
      
      <!-- Grid lines -->
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${chartHeight - padding}" stroke="#e5e7eb" stroke-width="1"/>
      <line x1="${padding}" y1="${chartHeight - padding}" x2="${chartWidth - padding}" y2="${chartHeight - padding}" stroke="#e5e7eb" stroke-width="1"/>
      
      <!-- Horizontal grid lines -->
      <line x1="${padding}" y1="${padding + graphHeight * 0.25}" x2="${chartWidth - padding}" y2="${padding + graphHeight * 0.25}" stroke="#f3f4f6" stroke-width="1"/>
      <line x1="${padding}" y1="${padding + graphHeight * 0.5}" x2="${chartWidth - padding}" y2="${padding + graphHeight * 0.5}" stroke="#f3f4f6" stroke-width="1"/>
      <line x1="${padding}" y1="${padding + graphHeight * 0.75}" x2="${chartWidth - padding}" y2="${padding + graphHeight * 0.75}" stroke="#f3f4f6" stroke-width="1"/>
      
      <!-- CTL Line (Blue) -->
      <polyline points="${ctlPoints}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- ATL Line (Red) -->
      <polyline points="${atlPoints}" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- TSB Line (Green) -->
      <polyline points="${tsbPoints}" fill="none" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5,5"/>
      
      <!-- Data points for CTL -->
      ${data.map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * graphWidth;
        const y = scale(d.ctl || d.ctl_end || 0);
        return `<circle cx="${x}" cy="${y}" r="3" fill="#3b82f6"/>`;
      }).join('')}
      
      <!-- Data points for ATL -->
      ${data.map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * graphWidth;
        const y = scale(d.atl || d.atl_end || 0);
        return `<circle cx="${x}" cy="${y}" r="3" fill="#ef4444"/>`;
      }).join('')}
    </svg>`;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartContainer}>
        <SvgXml xml={svg} width={chartWidth} height={chartHeight} />
      </ScrollView>
    );
  };

  // Determinar el resumen según la vista seleccionada
  const getSummary = () => {
    if (!pmcData) return null;
    if (view === 'daily' || view === 'weekly') {
      return pmcData.summary_week;
    }
    return pmcData.summary_month;
  };

  const summary = getSummary();

  if (!profile?.ftp) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚙️ Configuración requerida</Text>
          <Text style={styles.cardText}>
            Para ver tu análisis de forma, fatiga y frescura, necesitas configurar tu FTP en el perfil.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onLoadActivities}>
            <Text style={styles.buttonText}>Configurar Perfil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Análisis de Rendimiento</Text>
        <Text style={styles.subtitle}>Forma · Fatiga · Frescura</Text>
      </View>

      {/* View Selector */}
      <View style={styles.viewSelector}>
        <TouchableOpacity 
          style={[styles.viewButton, view === 'daily' && styles.viewButtonActive]}
          onPress={() => setView('daily')}
        >
          <Text style={[styles.viewButtonText, view === 'daily' && styles.viewButtonTextActive]}>
            Diario
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewButton, view === 'weekly' && styles.viewButtonActive]}
          onPress={() => setView('weekly')}
        >
          <Text style={[styles.viewButtonText, view === 'weekly' && styles.viewButtonTextActive]}>
            Semanal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewButton, view === 'monthly' && styles.viewButtonActive]}
          onPress={() => setView('monthly')}
        >
          <Text style={[styles.viewButtonText, view === 'monthly' && styles.viewButtonTextActive]}>
            Mensual
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Analizando rendimiento...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPMCData}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && pmcData && summary && (
        <>
          {/* Métricas Principales */}
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              '💪 Forma (CTL)',
              summary.current_ctl,
              '#3b82f6',
              formatStatusLabel(summary.status.form_level)
            )}
            {renderMetricCard(
              '😓 Fatiga (ATL)',
              summary.current_atl,
              '#ef4444',
              formatStatusLabel(summary.status.fatigue_level)
            )}
            {renderMetricCard(
              '🌟 Frescura (TSB)',
              summary.current_tsb > 0 ? `+${summary.current_tsb}` : summary.current_tsb,
              summary.current_tsb > 0 ? '#10b981' : '#f59e0b',
              formatStatusLabel(summary.status.freshness_level)
            )}
          </View>

          {/* Recomendación */}
          {summary.status.recommendation && (
            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationIcon}>💡</Text>
              <Text style={styles.recommendationText}>{summary.status.recommendation}</Text>
            </View>
          )}

          {/* Gráfica */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Evolución de Forma</Text>
            {generateChart()}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.legendText}>Forma (CTL)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Fatiga (ATL)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Frescura (TSB)</Text>
              </View>
            </View>
          </View>

          {/* Estadísticas del período */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>
              {view === 'monthly' ? '📅 Último mes' : '📅 Última semana'}
            </Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>TSS total:</Text>
              <Text style={styles.statsValue}>
                {view === 'monthly' ? summary.monthly_tss : summary.weekly_tss}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>TSS promedio/día:</Text>
              <Text style={styles.statsValue}>{summary.avg_tss_per_day}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Días entrenados:</Text>
              <Text style={styles.statsValue}>{summary.workout_days}</Text>
            </View>
          </View>

          {/* Botón actualizar */}
          <TouchableOpacity style={styles.refreshButton} onPress={loadPMCData}>
            <Text style={styles.refreshButtonText}>🔄 Actualizar datos</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  viewSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
  },
  viewButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  viewButtonActive: {
    backgroundColor: '#3b82f6',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  viewButtonTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    padding: 16,
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  recommendationIcon: {
    fontSize: 24,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statsLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  refreshButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  noData: {
    textAlign: 'center',
    padding: 40,
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 80,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default HomeScreen;
