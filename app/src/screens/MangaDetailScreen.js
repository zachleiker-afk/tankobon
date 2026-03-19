import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  const { colors } = useTheme();
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [chaptersRead, setChaptersRead] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchMangaDetail();
    if (userToken) fetchTrackingInfo();
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

  const fetchTrackingInfo = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/manga/${malId}/track`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      if (response.data) {
        if (response.data.status) setTrackingStatus(response.data.status);
        if (response.data.rating) setUserRating(response.data.rating);
        if (response.data.chapters_read != null) setChaptersRead(response.data.chapters_read);
      }
    } catch (error) {
      // Not tracked yet, ignore
    }
  };

  const handleProgressUpdate = async (newCount) => {
    if (newCount < 0) return;
    const totalChapters = manga?.chapters_count;
    if (totalChapters && newCount > totalChapters) return;
    setActionLoading(true);
    try {
      await axios.put(
        `${API_URL}/manga/${malId}/progress`,
        { chapters_read: newCount },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setChaptersRead(newCount);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update progress');
    }
    setActionLoading(false);
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

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
              <Text style={styles.scoreText}>{'\u2605'} {manga.score} / 10</Text>
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

      {/* Chapter Progress Section */}
      {trackingStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chapter Progress</Text>
          <Text style={styles.progressLabel}>
            Chapters: {chaptersRead} / {manga.chapters_count || '?'}
          </Text>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: manga.chapters_count
                    ? `${Math.min((chaptersRead / manga.chapters_count) * 100, 100)}%`
                    : chaptersRead > 0 ? '100%' : '0%',
                },
              ]}
            />
          </View>
          <View style={styles.progressButtons}>
            <TouchableOpacity
              style={[styles.progressButton, chaptersRead <= 0 && styles.progressButtonDisabled]}
              onPress={() => handleProgressUpdate(chaptersRead - 1)}
              disabled={actionLoading || chaptersRead <= 0}
            >
              <Text style={[styles.progressButtonText, chaptersRead <= 0 && styles.progressButtonTextDisabled]}>-</Text>
            </TouchableOpacity>
            <Text style={styles.progressCount}>{chaptersRead}</Text>
            <TouchableOpacity
              style={[
                styles.progressButton,
                manga.chapters_count && chaptersRead >= manga.chapters_count && styles.progressButtonDisabled,
              ]}
              onPress={() => handleProgressUpdate(chaptersRead + 1)}
              disabled={actionLoading || (manga.chapters_count && chaptersRead >= manga.chapters_count)}
            >
              <Text style={[
                styles.progressButtonText,
                manga.chapters_count && chaptersRead >= manga.chapters_count && styles.progressButtonTextDisabled,
              ]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Back to Search</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerSection: {
    flexDirection: 'row', padding: 16, paddingTop: 50, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight
  },
  coverImage: { width: 130, height: 190, borderRadius: 8 },
  headerInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  author: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  scoreBadge: {
    backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8
  },
  scoreText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  chapters: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  status: { fontSize: 13, color: colors.textTertiary },
  section: { padding: 16, backgroundColor: colors.surface, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  description: { fontSize: 14, color: colors.feedAction, lineHeight: 22 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap' },
  genreTag: {
    backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, marginRight: 8, marginBottom: 8
  },
  genreText: { color: colors.primary, fontSize: 13 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap' },
  statusButton: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8
  },
  statusButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusButtonText: { color: colors.textSecondary, fontSize: 13 },
  statusButtonTextActive: { color: '#fff', fontWeight: 'bold' },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  ratingButton: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8
  },
  ratingButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold' },
  ratingButtonTextActive: { color: '#fff' },
  progressLabel: { fontSize: 15, color: colors.textPrimary, marginBottom: 10 },
  progressBarBackground: {
    height: 10, backgroundColor: colors.borderLight, borderRadius: 5,
    overflow: 'hidden', marginBottom: 14
  },
  progressBarFill: {
    height: '100%', backgroundColor: colors.primary, borderRadius: 5
  },
  progressButtons: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
  },
  progressButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center'
  },
  progressButtonDisabled: { backgroundColor: colors.border },
  progressButtonText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  progressButtonTextDisabled: { color: colors.textTertiary },
  progressCount: {
    fontSize: 18, fontWeight: 'bold', color: colors.textPrimary,
    marginHorizontal: 24
  },
  backButton: {
    margin: 16, padding: 14, backgroundColor: colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: colors.primary, alignItems: 'center'
  },
  backButtonText: { color: colors.primary, fontWeight: 'bold', fontSize: 15 },
});

export default MangaDetailScreen;
