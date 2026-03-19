import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  StyleSheet, Image, ActivityIndicator, Alert
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config/api';
import { getStatusColor } from '../theme/colors';

const STATUS_LABELS = {
  reading: 'Reading',
  completed: 'Completed',
  plan_to_read: 'Plan to Read',
  on_hold: 'On Hold',
  dropped: 'Dropped',
};

const ProfileScreen = ({ navigation }) => {
  const { userToken, user, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchLibrary();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
    setLoading(false);
  };

  const fetchLibrary = async (status = null) => {
    try {
      const params = status ? `?status=${status}` : '';
      const response = await axios.get(`${API_URL}/manga/library/me${params}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setLibrary(response.data.library);
    } catch (error) {
      console.error('Failed to fetch library:', error);
    }
  };

  const handleFilter = (status) => {
    if (activeFilter === status) {
      setActiveFilter(null);
      fetchLibrary();
    } else {
      setActiveFilter(status);
      fetchLibrary(status);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: signOut }
    ]);
  };

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.screenTitle}>Profile</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
              <Text style={styles.themeToggleText}>{isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.user?.username?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{profile?.user?.username || 'User'}</Text>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => navigation.navigate('EditProfile', { profile: profile?.user })}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.email}>{profile?.user?.email}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.stats?.total_manga || 0}</Text>
            <Text style={styles.statLabel}>Manga</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.stats?.followers || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.stats?.following || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {profile?.stats?.avg_rating ? `${profile.stats.avg_rating}` : '-'}
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Library</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, activeFilter === key && styles.filterChipActive]}
              onPress={() => handleFilter(key)}
            >
              <Text style={[styles.filterText, activeFilter === key && styles.filterTextActive]}>
                {label}
                {profile?.stats?.by_status?.[key] ? ` (${profile.stats.by_status[key]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Library List */}
      <View style={styles.librarySection}>
        {library.length > 0 ? (
          library.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.libraryCard}
              onPress={() => navigation.navigate('MangaDetail', { malId: item.external_id })}
            >
              <Image source={{ uri: item.cover_image }} style={styles.libraryCover} resizeMode="cover" />
              <View style={styles.libraryInfo}>
                <Text style={styles.libraryTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.libraryMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status, colors) }]}>
                    <Text style={styles.statusBadgeText}>{STATUS_LABELS[item.status]}</Text>
                  </View>
                  {item.rating && (
                    <Text style={styles.ratingText}>{'\u2605'} {item.rating}/10</Text>
                  )}
                </View>
                {item.chapters_read > 0 && (
                  <Text style={styles.chaptersText}>
                    Ch. {item.chapters_read}{item.chapters_count ? `/${item.chapters_count}` : ''}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyLibrary}>
            <Text style={styles.emptyText}>
              {activeFilter ? `No manga with status "${STATUS_LABELS[activeFilter]}"` : 'Your library is empty. Search for manga to get started!'}
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  themeToggle: { marginRight: 16, padding: 4 },
  themeToggleText: { fontSize: 22 },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '600' },
  profileInfo: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  usernameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  username: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary },
  editProfileButton: { marginLeft: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
  editProfileText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  email: { fontSize: 14, color: colors.textTertiary, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.borderLight },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  section: { padding: 16, backgroundColor: colors.surface, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  filterRow: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textSecondary, fontSize: 13 },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  librarySection: { padding: 16 },
  libraryCard: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, marginBottom: 12, overflow: 'hidden',
    elevation: 2, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  libraryCover: { width: 80, height: 110 },
  libraryInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  libraryTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  libraryMeta: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 8 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  ratingText: { color: colors.ratingStarColor, fontSize: 13, fontWeight: 'bold' },
  chaptersText: { fontSize: 12, color: colors.textTertiary, marginTop: 4 },
  emptyLibrary: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textTertiary, fontSize: 15, textAlign: 'center' },
});

export default ProfileScreen;
