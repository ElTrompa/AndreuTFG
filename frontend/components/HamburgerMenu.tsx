import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme';

type Props = {
  open: boolean;
  onClose: () => void;
  navigate: (screen: string) => void;
};

export default function HamburgerMenu({ open, onClose, navigate }: Props){
  if (!open) return null;
  
  const handleNavigate = (screen: string) => {
    navigate(screen);
    onClose();
  };

  return (
    <View style={styles.backdrop}>
      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🚴 RideMetrics</Text>
        
        {/* Core Navigation */}
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

        {/* Traditional Analytics */}
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

        {/* Advanced Features */}
        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>🚀 ADVANCED (NEW!)</Text>
        
        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('AdvancedAnalytics')}
        >
          <Text style={styles.itemIcon}>🔮</Text>
          <View>
            <Text style={styles.itemText}>Advanced Analytics</Text>
            <Text style={styles.itemSubText}>FTP • CP • PMC Forecast • Coach</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('MetricasAvanzadas')}
        >
          <Text style={styles.itemIcon}>📊</Text>
          <View>
            <Text style={styles.itemText}>Métricas Avanzadas</Text>
            <Text style={styles.itemSubText}>VI • Pacing • Peaks • Efficiency</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('HRV')}
        >
          <Text style={styles.itemIcon}>❤️</Text>
          <View>
            <Text style={styles.itemText}>HRV & Recovery</Text>
            <Text style={styles.itemSubText}>Heart Rate Variability Analysis</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('Terrain')}
        >
          <Text style={styles.itemIcon}>⛰️</Text>
          <View>
            <Text style={styles.itemText}>Terrain Analysis</Text>
            <Text style={styles.itemSubText}>Climb Detection • Simulation</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, styles.premiumItem]} 
          onPress={() => handleNavigate('SessionClassifier')}
        >
          <Text style={styles.itemIcon}>🎯</Text>
          <View>
            <Text style={styles.itemText}>Clasificador de Sesiones</Text>
            <Text style={styles.itemSubText}>AI Training Type Detection</Text>
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

        <View style={{ height: 20 }} />
      </ScrollView>
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
    paddingTop: 16,
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
