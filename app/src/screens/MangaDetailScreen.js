import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

const STATUS_OPTIONS = [
  { key: 'reading', label: 'Reading' },
  { key: 'completed', label: 'Completed' },
  { key: 'plan_to_read', label: 'Plan to Read' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'dropped', label: 'Dropped' },
];

const MangaDetailScreen = ({ route, navigation }) => {
  const { malId } = route.params;
  const { userToken } = useAuth();
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchMangaDetail();
  }, []);

  const fetchMangaDetail = async () => {
    try {
      const response = await axios.get(`${API_URL}/manga/${malId}`);
      setManga(response.data.manga);
    } catch (error) {
      Alert.alert('Error', 'Failed to load manga details');
      navigation.goBack();
    }
    setLoading(false);
  };

  const handleTrack = async (status) => {
    setActionLoading(true);
    try {
      await axios.post(
        `${API_URL}/manga/${malId}/track`,
        { status },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setTrackingStatus(status);
      Alert.alert('Success', `Added as "${status.replace('_', ' ')}"`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to track manga');
    }
    setActionLoading(false);
  };

  const handleRate = async (rating) => {
    if (!trackingStatus) {
      Alert.alert('Track First', 'You need to add this manga to your library before rating it.');
      return;
    }
    setActionLoading(true);
    try {
      await axios.put(
        `${API_URL}/manga/${malId}/rate`,
        { rating },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setUserRating(rating);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to rate manga');
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  if (!manga) return null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with cover image */}
      <View style={styles.headerSection}>
        <Image
          source={{ uri: manga.cover_image }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{manga.title}</Text>
          <Text style={styles.author}>by {manga.author}</Text>
          {manga.score && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>★ {manga.score} / 10</Text>
            </View>
          )}
          <Text style={styles.chapters}>
            {manga.chapters_count ? `${manga.chapters_count} chapters` : 'Ongoing'}
          </Text>
          <Text style={styles.status}>{manga.status}</Text>
        </View>
      </View>

      {/* Genres */}
      {manga.genres && manga.genres.length > 0 && (
        <View style={styles.section}>
          <View style={styles.genreRow}>
            {manga.genres.map((genre, index) => (
              <View key={index} style={styles.genreTag}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Synopsis</Text>
        <Text style={styles.description}>{manga.description || 'No description available.'}</Text>
      </View>

      {/* Track Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add to Library</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.statusButton,
                trackingStatus === opt.key && styles.statusButtonActive
              ]}
              onPress={() => handleTrack(opt.key)}
              disabled={actionLoading}
            >
              <Text style={[
                styles.statusButtonText,
                trackingStatus === opt.key && styles.statusButtonTextActive
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Rating Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Your Rating {userRating ? `(${userRating}/10)` : ''}
        </Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
            <TouchableOpacity
              key={num}
              style={[
                styles.ratingButton,
                userRating === num && styles.ratingButtonActive
              ]}
              onPress={() => handleRate(num)}
              disabled={actionLoading}
            >
              <Text style={[
                styles.ratingButtonText,
                userRating === num && styles.ratingButtonTextActive
              ]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Back to Search</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: {
    flexDirection: 'row', padding: 16, paddingTop: 50, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  coverImage: { width: 130, height: 190, borderRadius: 8 },
  headerInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  author: { fontSize: 14, color: '#666', marginBottom: 8 },
  scoreBadge: {
    backgroundColor: '#6C5CE7', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8
  },
  scoreText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  chapters: { fontSize: 13, color: '#666', marginBottom: 2 },
  status: { fontSize: 13, color: '#999' },
  section: { padding: 16, backgroundColor: '#fff', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  description: { fontSize: 14, color: '#555', lineHeight: 22 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap' },
  genreTag: {
    backgroundColor: '#f0edff', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, marginRight: 8, marginBottom: 8
  },
  genreText: { color: '#6C5CE7', fontSize: 13 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap' },
  statusButton: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8
  },
  statusButtonActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  statusButtonText: { color: '#666', fontSize: 13 },
  statusButtonTextActive: { color: '#fff', fontWeight: 'bold' },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  ratingButton: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8
  },
  ratingButtonActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  ratingButtonText: { color: '#666', fontSize: 14, fontWeight: 'bold' },
  ratingButtonTextActive: { color: '#fff' },
  backButton: {
    margin: 16, padding: 14, backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 1, borderColor: '#6C5CE7', alignItems: 'center'
  },
  backButtonText: { color: '#6C5CE7', fontWeight: 'bold', fontSize: 15 },
});

export default MangaDetailScreen;
