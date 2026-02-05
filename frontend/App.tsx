import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, Linking, Alert, TextInput } from 'react-native';

export default function App() {
  const [tokenInput, setTokenInput] = useState('');
  const handleStravaAuth = async () => {
    const url = 'http://localhost:3000/auth/strava';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('No se puede abrir la URL', url);
      }
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const handleTokenLogin = async () => {
    if (!tokenInput) return Alert.alert('Token vacío', 'Pega aquí tu access token de Strava.');
    try {
      const res = await fetch('http://localhost:3000/auth/token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: tokenInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        return Alert.alert('Error', JSON.stringify(data));
      }
      Alert.alert('Login OK', `Athlete ${data.athlete && data.athlete.username ? data.athlete.username : data.athlete.id}`);
      // TODO: store JWT in secure storage and use for authenticated calls
    } catch (err) {
      Alert.alert('Network error', String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TFGandreu</Text>
      <Text style={styles.subtitle}>Entrenamiento ciclista — Frontend Expo (TypeScript)</Text>
      <View style={styles.button}>
        <Button title="Iniciar sesión con Strava" onPress={handleStravaAuth} />
      </View>
      <Text style={{ marginTop: 12 }}>O pega tu access token (single-user)</Text>
      <TextInput
        placeholder="Access token de Strava"
        value={tokenInput}
        onChangeText={setTokenInput}
        style={{ width: '100%', borderColor: '#ccc', borderWidth: 1, padding: 8, marginTop: 8, borderRadius: 6 }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.button}>
        <Button title="Usar token" onPress={handleTokenLogin} />
      </View>
      <Text style={styles.note}>Sigue el README en /frontend para instrucciones.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center'
  },
  button: {
    width: '100%',
    marginVertical: 12,
  },
  note: {
    marginTop: 24,
    color: '#999',
    fontSize: 12,
    textAlign: 'center'
  }
});
