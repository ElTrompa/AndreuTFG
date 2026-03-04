/**
 * Menú lateral deslizante (hamburguesa) con enlace a todas las pantallas
 * de la aplicación: navegación principal (CORE), analítica básica (ANALYTICS)
 * y funciones avanzadas (ADVANCED).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme';

type Props = {
  open: boolean;
  onClose: () => void;
  navigate: (screen: string) => void;
};

export default function HamburgerMenu({ open, onClose, navigate }: Props){
  // No renderizar nada si el menú está cerrado
  if (!open) return null;
  
  // Navegar a pantalla y cerrar el menú automáticamente
  const handleNavigate = (screen: string) => {
    navigate(screen);
    onClose();
  };

  return (
    <View style={styles.backdrop}>
      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={styles.title}>🚴 RideMetrics</Text>
        
        {/* Navegación principal: Inicio, Actividades, Perfil */}
        <Text style={styles.sectionTitle}>CORE</Text>
        <TouchableOpacity style={styles.item} onPress={() => handleNavigate('Home')}>
          <Text style={styles.itemIcon}>🏠</Text>
          <Text style={styles.itemText}>Inicio</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.item} onPress={() => handleNavigate('Activities')}>
          <Text style={styles.itemIcon}>📋</Text>
          <Text style={styles.itemText}>Actividades</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => handleNavigate('Profile')}>
          <Text style={styles.itemIcon}>👤</Text>
          <Text style={styles.itemText}>Perfil</Text>
        </TouchableOpacity>

        {/* Análisis tradicionales de ciclismo */}
        <Text style={styles.sectionTitle}>ANALYTICS</Text>
        <TouchableOpacity style={styles.item} onPress={() => handleNavigate('Potencia')}>
          <Text style={styles.itemIcon}>⚡</Text>
          <Text style={styles.itemText}>Potencia (FTP)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => handleNavigate('Proyecciones')}>
          <Text style={styles.itemIcon}>📈</Text>
          <Text style={styles.itemText}>Proyecciones (PMC)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => handleNavigate('Palmares')}>
          <Text style={styles.itemIcon}>🏆</Text>
          <Text style={styles.itemText}>Palmarés (KOMs)</Text>
        </TouchableOpacity>

        {/* Funciones avanzadas de análisis de rendimiento */}
        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>🚀 ADVANCED (NEW!)</Text>
        
        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('AdvancedAnalytics')}
        >
          <Text style={styles.itemIcon}>🔮</Text>
          <View>
            <Text style={styles.itemText}>Analíticas Avanzadas</Text>
            <Text style={styles.itemSubText}>FTP • CP • Pronóstico PMC</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('RoutesSearch')}
        >
          <Text style={styles.itemIcon}>🏘️</Text>
          <View>
            <Text style={styles.itemText}>Búsqueda por Pueblos</Text>
            <Text style={styles.itemSubText}>Encuentra rutas por pueblo</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('MetricasAvanzadas')}
        >
          <Text style={styles.itemIcon}>📊</Text>
          <View>
            <Text style={styles.itemText}>Métricas Avanzadas</Text>
            <Text style={styles.itemSubText}>VI • Ritmo • Picos • Eficiencia</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('HRV')}
        >
          <Text style={styles.itemIcon}>❤️</Text>
          <View>
            <Text style={styles.itemText}>HRV y Recuperación</Text>
            <Text style={styles.itemSubText}>Análisis de Variabilidad Cardíaca</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('Terrain')}
        >
          <Text style={styles.itemIcon}>⛰️</Text>
          <View>
            <Text style={styles.itemText}>Análisis de Terreno</Text>
            <Text style={styles.itemSubText}>Detección de Puertos • Simulación</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('SessionClassifier')}
        >
          <Text style={styles.itemIcon}>🎯</Text>
          <View>
            <Text style={styles.itemText}>Clasificador de Sesiones</Text>
            <Text style={styles.itemSubText}>Detección IA de Tipo de Entrenamiento</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
      {/* Capa oscura transparente para cerrar al tocar fuera del menú */}
      <TouchableOpacity style={styles.overlay} onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { 
    position: 'absolute', 
    left: 0, 
    top: 0, 
    right: 0, 
    bottom: 0, 
    flexDirection: 'row',
    zIndex: 1000,
  },
  menu: { 
    width: 280, 
    backgroundColor: colors.surfaceLight,
    paddingTop: 60,
    elevation: 8,
  },
  title: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 16,
    paddingHorizontal: 16,
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
    letterSpacing: 1,
  },
  item: { 
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  premiumItem: {
    backgroundColor: colors.card,
    marginHorizontal: 8,
    borderRadius: 8,
    marginVertical: 4,
    paddingLeft: 12,
    borderLeftWidth: 0,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  itemText: { 
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  itemSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  disabledItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.5,
  },
  disabledText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  overlay: { 
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  }
});
