import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config/api';

const SignUpScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { colors } = useTheme();

  const handleSignUp = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/signup`, {
        username: username.trim(),
        email: email.trim(),
        password
      });
      await signIn(response.data.token, response.data.user);
    } catch (error) {
      let message;
      if (error.response) {
        message = error.response.data?.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        message = `Cannot reach server at ${API_URL}. Check your internet connection.`;
      } else {
        message = error.message || 'Something went wrong';
      }
      Alert.alert('Sign Up Failed', message);
    }
    setLoading(false);
  };

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tankobon</Text>
      <Text style={styles.subtitle}>Create your account</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={colors.placeholder}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.placeholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 8 characters)"
        placeholderTextColor={colors.placeholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Already have an account? <Text style={styles.link}>Login</Text></Text>
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: colors.background },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: colors.primary, marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', color: colors.textSecondary, marginBottom: 32 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12,
    marginBottom: 16, fontSize: 16, backgroundColor: colors.inputBackground, color: colors.textPrimary
  },
  button: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkText: { textAlign: 'center', color: colors.textSecondary },
  link: { color: colors.primary, fontWeight: 'bold' },
});

export default SignUpScreen;
