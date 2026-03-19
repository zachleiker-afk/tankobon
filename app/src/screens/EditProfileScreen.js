import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config/api';

const EditProfileScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const currentProfile = route.params?.profile || {};

  const [username, setUsername] = useState(currentProfile.username || '');
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const token = await AsyncStorage.getItem('@userToken');
      const body = {};
      if (username.trim()) body.username = username.trim();
      if (bio.trim()) body.bio = bio.trim();
      if (avatarUrl.trim()) body.avatar_url = avatarUrl.trim();

      await axios.put(`${API_URL}/user/profile`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => navigation.goBack(), 1200);
    } catch (error) {
      let errorMsg;
      if (error.response) {
        errorMsg = error.response.data?.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMsg = `Cannot reach server at ${API_URL}. Check your internet connection.`;
      } else {
        errorMsg = error.message || 'Something went wrong';
      }
      setMessage({ type: 'error', text: errorMsg });
    }
    setLoading(false);
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Edit Profile</Text>
      </View>

      {message && (
        <View style={[styles.messageBox, message.type === 'error' ? styles.errorBox : styles.successBox]}>
          <Text style={[styles.messageText, message.type === 'error' ? styles.errorText : styles.successText]}>
            {message.text}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={colors.placeholder}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        placeholder="Tell us about yourself..."
        placeholderTextColor={colors.placeholder}
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Avatar URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://example.com/avatar.png"
        placeholderTextColor={colors.placeholder}
        value={avatarUrl}
        onChangeText={setAvatarUrl}
        autoCapitalize="none"
        keyboardType="url"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={loading}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 50 },
  header: { marginBottom: 24 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12,
    marginBottom: 16, fontSize: 16, backgroundColor: colors.inputBackground, color: colors.textPrimary
  },
  bioInput: { height: 100 },
  saveButton: { backgroundColor: colors.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  messageBox: { padding: 12, borderRadius: 8, marginBottom: 16 },
  errorBox: { backgroundColor: colors.error + '20' },
  successBox: { backgroundColor: colors.primary + '20' },
  messageText: { fontSize: 14, textAlign: 'center' },
  errorText: { color: colors.error },
  successText: { color: colors.primary },
});

export default EditProfileScreen;
