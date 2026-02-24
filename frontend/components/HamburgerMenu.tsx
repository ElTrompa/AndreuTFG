import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  open: boolean;
  onClose: () => void;
  navigate: (screen: string) => void;
};

export default function HamburgerMenu({ open, onClose, navigate }: Props){
  if (!open) return null;
  return (
    <View style={styles.backdrop}>
      <View style={styles.menu}>
        <Text style={styles.title}>Menú</Text>
        <TouchableOpacity style={styles.item} onPress={() => { navigate('Home'); onClose(); }}>
          <Text style={styles.itemText}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { navigate('Potencia'); onClose(); }}>
          <Text style={styles.itemText}>Potencia</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { navigate('Activities'); onClose(); }}>
          <Text style={styles.itemText}>Actividades</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => { navigate('Proyecciones'); onClose(); }}>
          <Text style={styles.itemText}>Proyecciones</Text>
        </TouchableOpacity>
              <TouchableOpacity style={styles.item} onPress={() => { navigate('Profile'); onClose(); }}>
                <Text style={styles.itemText}>Perfil</Text>
              </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.overlay} onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, flexDirection: 'row' },
  menu: { width: 260, backgroundColor: '#fff', padding: 16, elevation: 6, boxShadow: 'rgba(0, 0, 0, 0.12) 0px 0px 12px' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  item: { paddingVertical: 10 },
  itemText: { fontSize: 16 },
  overlay: { flex: 1 }
});
