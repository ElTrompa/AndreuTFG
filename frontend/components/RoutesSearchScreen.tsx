/**
 * 🏘️ Búsqueda de rutas por pueblos
 * Pantalla para explorar todas las rutas que pasan por un pueblo específico
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Alert,
  Linking,
  Platform,
  StatusBar
} from 'react-native';

interface Town {
  id: number;
  name: string;
  province?: string;
  country?: string;
  activityCount: number;
  lat?: number;
  lng?: number;
}

interface Activity {
  id: number;
  name: string;
  date: string;
  distance: number;
  movingTime: number;
  type: string;
}

interface RoutesSearchScreenProps {
  jwt?: string | null;
  athlete?: any;
  apiBase?: string;
  onSelectActivity?: (activityId: number) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function RoutesSearchScreen({ jwt, athlete, apiBase = 'http://localhost:3001', onSelectActivity }: RoutesSearchScreenProps) {
  const [towns, setTowns] = useState<Town[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTown, setSelectedTown] = useState<Town | null>(null);
  const [townActivities, setTownActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Extract athlete_id from props or JWT
  const athleteId = athlete?.id ? String(athlete.id) : extractAthleteIdFromJWT(jwt);

  useEffect(() => {
    if (!athleteId) {
      setLoading(false);
      return;
    }
    loadTowns();
  }, [athleteId]);

  function extractAthleteIdFromJWT(jwtToken: string | null | undefined): string | null {
    if (!jwtToken) return null;
    try {
      const parts = jwtToken.split('.');
      if (parts.length !== 3) return null;
      const decoded = JSON.parse(atob(parts[1]));
      return decoded.athlete_id ? String(decoded.athlete_id) : null;
    } catch (err) {
      console.error('Error decoding JWT:', err);
      return null;
    }
  }

  const loadTowns = async () => {
    if (!athleteId) return;
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/towns/athlete?athlete_id=${athleteId}`, {
        headers: jwt ? { 'Authorization': `Bearer ${jwt}` } : {}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setTowns(data.towns || []);
    } catch (err) {
      console.error('Error loading towns:', err);
      Alert.alert('Error', 'No se pudieron cargar los pueblos. Asegúrate de procesar actividades primero.');
    } finally {
      setLoading(false);
    }
  };

  const searchTowns = async (query: string) => {
    if (!athleteId) return;
    if (!query.trim()) {
      loadTowns();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${apiBase}/towns/search?athlete_id=${athleteId}&q=${encodeURIComponent(query)}`,
        { headers: jwt ? { 'Authorization': `Bearer ${jwt}` } : {} }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setTowns(data.results || []);
    } catch (err) {
      console.error('Error searching towns:', err);
      Alert.alert('Error', 'Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const loadActivitiesForTown = async (town: Town) => {
    if (!athleteId) return;
    try {
      setLoadingActivities(true);
      setSelectedTown(town);
      
      const response = await fetch(
        `${apiBase}/towns/${town.id}/activities?athlete_id=${athleteId}`,
        { headers: jwt ? { 'Authorization': `Bearer ${jwt}` } : {} }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setTownActivities(data.activities || []);
    } catch (err) {
      console.error('Error loading activities:', err);
      Alert.alert('Error', 'No se pudieron cargar las actividades');
    } finally {
      setLoadingActivities(false);
    }
  };

  const processAllActivities = async () => {
    if (!athleteId) {
      Alert.alert('Error', 'No se pudo determinar tu ID de atleta');
      return;
    }

    const runBatchProcess = async (forceReprocess: boolean) => {
      try {
        setLoading(true);
        const response = await fetch(`${apiBase}/towns/batch-process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {})
          },
          body: JSON.stringify({
            athlete_id: athleteId,
            force_reprocess: forceReprocess
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.total === 0) {
          Alert.alert('Información', 'No se encontraron actividades para procesar.');
        } else if (!forceReprocess && result.newlyProcessed === 0) {
          Alert.alert(
            'Sin cambios',
            `No hay actividades nuevas por procesar.\nYa procesadas: ${result.alreadyProcessed || result.skipped}`
          );
        } else {
          const errorCount = Array.isArray(result.errors) ? result.errors.length : 0;
          Alert.alert(
            '✓ ¡Hecho!',
            `Nuevas procesadas: ${result.newlyProcessed ?? result.processed}\nYa existentes/omitidas: ${result.skipped}\nTotal revisadas: ${result.total}${errorCount > 0 ? `\nErrores Strava: ${errorCount}` : ''}`
          );
        }

        await loadTowns();
      } catch (err) {
        Alert.alert('Error', `Error al procesar: ${err instanceof Error ? err.message : String(err)}`);
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    Alert.alert(
      'Procesar actividades',
      'Se extraerán pueblos usando OpenStreetMap.\n\nElige una opción:',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Solo nuevas',
          onPress: async () => runBatchProcess(false)
        },
        {
          text: 'Reprocesar todas',
          onPress: async () => runBatchProcess(true)
        }
      ]
    );
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleDownloadGpx = async (activityId: number) => {
    if (!athleteId) {
      Alert.alert('Error', 'No se pudo determinar tu ID de atleta');
      return;
    }

    try {
      const url = `${apiBase}/towns/activity/${activityId}/gpx?athlete_id=${encodeURIComponent(athleteId)}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('No se puede abrir la descarga');
      }
      await Linking.openURL(url);
    } catch (err) {
      console.error('Error downloading GPX:', err);
      Alert.alert('Error', 'No se pudo descargar el archivo GPX');
    }
  };

  const handleOpenInStrava = async (activityId: number) => {
    try {
      const url = `https://www.strava.com/activities/${activityId}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('No se puede abrir Strava');
      }
      await Linking.openURL(url);
    } catch (err) {
      console.error('Error opening Strava activity:', err);
      Alert.alert('Error', 'No se pudo abrir la actividad en Strava');
    }
  };

  if (!athleteId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ Error: No se pudo determinar tu ID de atleta. Asegúrate de estar autenticado.</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Vista de pueblos
  if (!selectedTown) {
    return (
      <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>🏘️ Búsqueda por Pueblos</Text>
            <Text style={styles.subtitle}>Explora las rutas por pueblos</Text>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar pueblo..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchTowns(text);
              }}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          ) : towns.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyTitle}>No hay pueblos registrados</Text>
              <Text style={styles.emptyText}>
                Procesa tus actividades para extraer los pueblos por los que pasas
              </Text>
              <TouchableOpacity 
                style={styles.processButton}
                onPress={processAllActivities}
              >
                <Text style={styles.processButtonText}>Procesar Actividades</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={towns}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.townItem}
                  onPress={() => loadActivitiesForTown(item)}
                >
                  <View style={styles.townContent}>
                    <Text style={styles.townName}>{item.name}</Text>
                    {item.province && (
                      <Text style={styles.townProvince}>{item.province}</Text>
                    )}
                  </View>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.activityCount}</Text>
                  </View>
                </TouchableOpacity>
              )}
              scrollEnabled={true}
            />
          )}

          <TouchableOpacity 
            style={styles.fab}
            onPress={processAllActivities}
          >
            <Text style={styles.fabText}>⚙️</Text>
          </TouchableOpacity>
        </View>
    );
  }

  // Vista de actividades de un pueblo
  return (
    <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedTown(null)}>
            <Text style={styles.backButton}>← Atrás</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.townTitle}>{selectedTown.name}</Text>
            <Text style={styles.activityCountText}>
              {townActivities.length} actividades
            </Text>
          </View>
        </View>

        {loadingActivities ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : townActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>Sin actividades</Text>
            <Text style={styles.emptyText}>
              No hay actividades registradas para {selectedTown.name}
            </Text>
          </View>
        ) : (
          <FlatList
            data={townActivities}
            keyExtractor={(item, index) => `${selectedTown?.id}-${item.id}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.activityCard}
                activeOpacity={0.9}
                onPress={() => onSelectActivity?.(item.id)}
              >
                <View style={styles.activityHeader}>
                  <Text style={styles.activityName}>{item.name}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: getActivityColor(item.type) }]}>
                    <Text style={styles.typeText}>{item.type}</Text>
                  </View>
                </View>
                <Text style={styles.activityDate}>{formatDate(item.date)}</Text>
                <View style={styles.activityStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>📏 Distancia</Text>
                    <Text style={styles.statValue}>{formatDistance(item.distance)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>⏱️ Tiempo</Text>
                    <Text style={styles.statValue}>{formatTime(item.movingTime)}</Text>
                  </View>
                </View>
                <View style={styles.activityActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.detailButton]}
                    onPress={() => onSelectActivity?.(item.id)}
                  >
                    <Text style={styles.actionButtonText}>📊 Ver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.stravaButton]}
                    onPress={() => handleOpenInStrava(item.id)}
                  >
                    <Text style={styles.actionButtonText}>🔗 Strava</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.gpxButton]}
                    onPress={() => handleDownloadGpx(item.id)}
                  >
                    <Text style={styles.actionButtonText}>📥 GPX</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={true}
          />
        )}
      </View>
  );
}

function getActivityColor(type: string | undefined): string {
  const typeMap: { [key: string]: string } = {
    'Ride': '#FF6B6B',
    'Run': '#4ECDC4',
    'Walk': '#95E1D3',
    'Swim': '#6C5CE7',
    'Hike': '#A29BFE',
    'VirtualRide': '#FDCB6E'
  };
  return typeMap[type || ''] || '#828282';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  
  // Header
  header: {
    backgroundColor: '#0EA5E9',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    marginBottom: 16
  },
  townTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4
  },
  activityCountText: {
    fontSize: 14,
    color: '#E5F4FF'
  },
  backButton: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 10
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 4
  },
  
  // Search
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    fontWeight: '500'
  },
  
  // Town Item
  townItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  townContent: {
    flex: 1,
    marginRight: 12
  },
  townName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.3
  },
  townProvince: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500'
  },
  countBadge: {
    backgroundColor: '#0EA5E9',
    borderRadius: 99,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center'
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700'
  },
  
  // Activity Card
  activityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  activityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.2
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  typeText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  activityDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
    fontWeight: '500'
  },
  activityStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937'
  },
  
  // Action Buttons
  activityActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    fontWeight: '700'
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  gpxButton: {
    backgroundColor: '#10B981',
    borderColor: '#059669'
  },
  stravaButton: {
    backgroundColor: '#FF5200',
    borderColor: '#DC2626'
  },
  detailButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB'
  },
  
  // Process Button
  processButton: {
    marginTop: 20,
    marginHorizontal: 12,
    marginBottom: 20,
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4
  },
  processButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5
  },
  fabText: {
    fontSize: 28,
    fontWeight: '700'
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
    opacity: 0.5
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500'
  },
  
  // Loading
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  // Utility
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    fontWeight: '600'
  },
  button: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  }
});
