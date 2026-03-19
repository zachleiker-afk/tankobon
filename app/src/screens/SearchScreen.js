import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, Alert
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config/api';

const SearchScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { userToken } = useAuth();
  const { colors } = useTheme();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await axios.get(`${API_URL}/manga/search`, {
        params: { q: query.trim() },
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setResults(response.data.manga);
    } catch (error) {
      Alert.alert('Error', 'Failed to search. Please try again.');
      console.error(error);
    }
    setLoading(false);
  };

  const styles = makeStyles(colors);

  const renderMangaCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('MangaDetail', { malId: item.mal_id, title: item.title })}
    >
      <Image
        source={{ uri: item.cover_image }}
        style={styles.coverImage}
        resizeMode="cover"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardAuthor}>{item.author}</Text>
        <View style={styles.cardMeta}>
          {item.score && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{'\u2605'} {item.score}</Text>
            </View>
          )}
          <Text style={styles.cardStatus}>{item.status || 'Unknown'}</Text>
        </View>
        <View style={styles.genreRow}>
          {item.genres?.slice(0, 3).map((genre, index) => (
            <View key={index} style={styles.genreTag}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Search Manga</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for manga..."
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderMangaCard}
          keyExtractor={(item) => item.mal_id.toString()}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      ) : hasSearched ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No manga found for "{query}"</Text>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Search for your favorite manga!</Text>
        </View>
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50 },
  header: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, paddingHorizontal: 16, marginBottom: 16 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: 12, fontSize: 16, backgroundColor: colors.inputBackground, marginRight: 8,
    color: colors.textPrimary
  },
  searchButton: {
    backgroundColor: colors.primary, paddingHorizontal: 20, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center'
  },
  searchButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: colors.textSecondary },
  emptyText: { color: colors.textTertiary, fontSize: 16 },
  resultsList: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12,
    marginBottom: 12, overflow: 'hidden', elevation: 2,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4
  },
  coverImage: { width: 100, height: 140 },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  cardAuthor: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  scoreBadge: {
    backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, marginRight: 8
  },
  scoreText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardStatus: { fontSize: 12, color: colors.textTertiary },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap' },
  genreTag: {
    backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, marginRight: 4, marginBottom: 2
  },
  genreText: { color: colors.primary, fontSize: 11 },
});

export default SearchScreen;
