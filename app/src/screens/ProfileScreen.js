import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  StyleSheet, Image, ActivityIndicator, Alert
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config/api';

const STATUS_LABELS = {
  reading: 'Reading',
  completed: 'Completed',
  plan_to_read: 'Plan to Read',
  on_hold: 'On Hold',
  dropped: 'Dropped',
};

const ProfileScreen = ({ navigation }) => {
  const { userToken, user, signOut } = useAuth();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.screenTitle}>Profile</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.user?.username?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.username}>{profile?.user?.username || 'User'}</Text>
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
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusBadgeText}>{STATUS_LABELS[item.status]}</Text>
                  </View>
                  {item.rating && (
                    <Text style={styles.ratingText}>★ {item.rating}/10</Text>
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

const getStatusColor = (status) => {
  const colors = {
    reading: '#27ae60',
    completed: '#6C5CE7',
    plan_to_read: '#3498db',
    on_hold: '#f39c12',
    dropped: '#e74c3c',
  };
  return colors[status] || '#999';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  logoutText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },
  profileInfo: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  username: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#999', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#6C5CE7' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  section: { padding: 16, backgroundColor: '#fff', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  filterRow: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 8 },
  filterChipActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  filterText: { color: '#666', fontSize: 13 },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  librarySection: { padding: 16 },
  libraryCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  libraryCover: { width: 80, height: 110 },
  libraryInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  libraryTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  libraryMeta: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 8 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  ratingText: { color: '#f39c12', fontSize: 13, fontWeight: 'bold' },
  chaptersText: { fontSize: 12, color: '#999', marginTop: 4 },
  emptyLibrary: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 15, textAlign: 'center' },
});

export default ProfileScreen;
