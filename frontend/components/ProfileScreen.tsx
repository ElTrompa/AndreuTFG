import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';

type Props = {
  jwt: string | null;
  apiBase?: string;
  onSaved?: (profile: any) => void;
};

export default function ProfileScreen({ jwt, apiBase = 'http://localhost:3001', onSaved }: Props){
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    if (!jwt) return;
    setLoading(true);
    fetch(`${apiBase}/profile`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r=>r.json())
      .then(d=>{ if (d.ok) setProfile(d.profile || {}); })
      .catch(e=>{})
      .finally(()=>setLoading(false));
  }, [jwt]);

  const save = async () => {
    if (!jwt) return Alert.alert('No autorizado');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/profile`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${jwt}` }, body: JSON.stringify(profile) });
      const data = await res.json();
      if (!res.ok) return Alert.alert('Error', JSON.stringify(data));
      setProfile(data.profile || {});
      if (typeof onSaved === 'function') onSaved(data.profile || {});
      Alert.alert('Guardado', 'Perfil actualizado');
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Altura (cm)</Text>
        <TextInput keyboardType="numeric" style={styles.input} value={profile.height_cm ? String(profile.height_cm) : ''} onChangeText={t=>setProfile({...profile, height_cm: t ? Number(t) : null})} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Peso (kg)</Text>
        <TextInput keyboardType="numeric" style={styles.input} value={profile.weight_kg ? String(profile.weight_kg) : ''} onChangeText={t=>setProfile({...profile, weight_kg: t ? Number(t) : null})} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>FTP</Text>
        <TextInput keyboardType="numeric" style={styles.input} value={profile.ftp ? String(profile.ftp) : ''} onChangeText={t=>setProfile({...profile, ftp: t ? Number(t) : null})} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>VO2max</Text>
        <TextInput keyboardType="numeric" style={styles.input} value={profile.vo2max ? String(profile.vo2max) : ''} onChangeText={t=>setProfile({...profile, vo2max: t ? Number(t) : null})} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>FC máxima</Text>
        <TextInput keyboardType="numeric" style={styles.input} value={profile.hr_max ? String(profile.hr_max) : ''} onChangeText={t=>setProfile({...profile, hr_max: t ? Number(t) : null})} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>FC reposo</Text>
        <TextInput keyboardType="numeric" style={styles.input} value={profile.hr_rest ? String(profile.hr_rest) : ''} onChangeText={t=>setProfile({...profile, hr_rest: t ? Number(t) : null})} />
      </View>

      <View style={{marginTop:12}}>
        <Button title={loading ? 'Guardando...' : 'Guardar perfil'} onPress={save} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  row: { marginBottom: 10 },
  label: { color: '#333', marginBottom: 6 },
  input: { borderWidth:1, borderColor:'#ddd', padding:8, borderRadius:6 }
});