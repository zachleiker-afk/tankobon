import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Image, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config/api';

const HomeScreen = ({ navigation }) => {
  const { userToken, user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
      fetchTrending();
    }, [])
  );

  const fetchFeed = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/feed`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setFeed(response.data.feed);
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    }
    setLoading(false);
  };

  const fetchTrending = async () => {
    try {
      const response = await axios.get(`${API_URL}/manga/trending?limit=10`);
      setTrending(response.data.manga);
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    }
    setTrendingLoading(false);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await axios.get(`${API_URL}/user/search?q=${searchQuery.trim()}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setSearchResults(response.data.users);
    } catch (error) {
      Alert.alert('Error', 'Failed to search users');
    }
    setSearching(false);
  };

  const followUser = async (userId, username) => {
    try {
      await axios.post(`${API_URL}/user/${userId}/follow`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert('Success', `Now following ${username}!`);
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      // Refresh feed
      fetchFeed();
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to follow user';
      Alert.alert('Error', msg);
    }
  };

  const getActionText = (item) => {
    switch (item.action_type) {
      case 'track': {
        const status = item.details?.status?.replace('_', ' ') || 'tracking';
        return `started ${status}`;
      }
      case 'rate': {
        return `rated ${item.details?.rating}/10`;
      }
      case 'follow': {
        return `followed ${item.details?.followed_username || 'a user'}`;
      }
      default:
        return item.action_type;
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderTrending = () => {
    if (trending.length === 0) return null;
    return (
      <View style={styles.trendingSection}>
        <Text style={styles.trendingSectionTitle}>Trending Manga</Text>
        <FlatList
          horizontal
          data={trending}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.trendingList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.trendingCard}
              onPress={() => navigation.navigate('MangaDetail', { malId: item.external_id })}
            >
              <Image
                source={{ uri: item.cover_image }}
                style={styles.trendingCover}
                resizeMode="cover"
              />
              <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
              {item.score > 0 && (
                <Text style={styles.trendingScore}>★ {item.score}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderFeedItem = ({ item }) => (
    <View style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <View style={styles.feedAvatar}>
          <Text style={styles.feedAvatarText}>
            {item.username?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.feedHeaderText}>
          <Text style={styles.feedUsername}>{item.username}</Text>
          <Text style={styles.feedTime}>{getTimeAgo(item.created_at)}</Text>
        </View>
      </View>
      <View style={styles.feedBody}>
        <Text style={styles.feedAction}>
          {getActionText(item)}
          {item.manga_title ? ` "${item.manga_title}"` : ''}
        </Text>
        {item.manga_cover && (
          <TouchableOpacity
            onPress={() => navigation.navigate('MangaDetail', { malId: item.manga_external_id })}
          >
            <Image source={{ uri: item.manga_cover }} style={styles.feedMangaCover} resizeMode="cover" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderUserResult = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {item.username?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userUsername}>{item.username}</Text>
        {item.bio && <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>}
      </View>
      <TouchableOpacity
        style={styles.followButton}
        onPress={() => followUser(item.id, item.username)}
      >
        <Text style={styles.followButtonText}>Follow</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tankobon</Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
          <Text style={styles.findUsersText}>{showSearch ? 'Feed' : 'Find Users'}</Text>
        </TouchableOpacity>
      </View>

      {showSearch ? (
        /* User Search Mode */
        <View style={styles.content}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchUsers}
              returnKeyType="search"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.searchButton} onPress={searchUsers}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          {searching ? (
            <ActivityIndicator size="large" color="#6C5CE7" style={{ marginTop: 40 }} />
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderUserResult}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listPadding}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Search for users to follow</Text>
            </View>
          )}
        </View>
      ) : (
        /* Feed Mode */
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color="#6C5CE7" style={{ marginTop: 40 }} />
          ) : feed.length > 0 ? (
            <FlatList
              data={feed}
              renderItem={renderFeedItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listPadding}
              onRefresh={() => { setLoading(true); fetchFeed(); }}
              refreshing={loading}
              ListHeaderComponent={renderTrending}
            />
          ) : (
            <ScrollView>
              {renderTrending()}
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Welcome, {user?.username}!</Text>
                <Text style={styles.emptyText}>
                  Your feed is empty. Tap "Find Users" to follow people and see their manga activity here!
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#6C5CE7' },
  findUsersText: { color: '#6C5CE7', fontSize: 15, fontWeight: '600' },
  content: { flex: 1 },
  searchRow: { flexDirection: 'row', padding: 16 },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 16, backgroundColor: '#fff', marginRight: 8
  },
  searchButton: {
    backgroundColor: '#6C5CE7', paddingHorizontal: 20, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center'
  },
  searchButtonText: { color: '#fff', fontWeight: 'bold' },
  listPadding: { padding: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#999', textAlign: 'center', lineHeight: 22 },
  // Feed cards
  feedCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4
  },
  feedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  feedAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#6C5CE7',
    justifyContent: 'center', alignItems: 'center', marginRight: 10
  },
  feedAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  feedHeaderText: { flex: 1 },
  feedUsername: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  feedTime: { fontSize: 12, color: '#999' },
  feedBody: {},
  feedAction: { fontSize: 15, color: '#555', lineHeight: 22, marginBottom: 8 },
  feedMangaCover: { width: 80, height: 110, borderRadius: 6, marginTop: 4 },
  // User search results
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 14, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#6C5CE7',
    justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  userAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userUsername: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  userBio: { fontSize: 13, color: '#999', marginTop: 2 },
  followButton: {
    backgroundColor: '#6C5CE7', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 6
  },
  followButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  // Trending section
  trendingSection: { backgroundColor: '#fff', paddingVertical: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  trendingSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', paddingHorizontal: 16, marginBottom: 12 },
  trendingList: { paddingHorizontal: 12 },
  trendingCard: { width: 120, marginHorizontal: 4 },
  trendingCover: { width: 120, height: 170, borderRadius: 8, marginBottom: 6 },
  trendingTitle: { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 2 },
  trendingScore: { fontSize: 11, color: '#6C5CE7', fontWeight: 'bold' },
});

export default HomeScreen;
