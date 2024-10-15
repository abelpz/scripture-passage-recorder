import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReferenceContext, useSetupContext } from '../contexts/AppContext';
import { Alert } from 'react-native';

export default function Navigation() {
  const {state: { selectedBook, selectedChapter, verseRange }, setSelectedBook, setSelectedChapter, setVerseRange} = useReferenceContext()
  const { state: { versificationSchema } } = useSetupContext()

  const [screen, setScreen] = useState<'book' | 'chapter' | 'verse'>('book');
  const [localBook, setLocalBook] = useState<string | null>(null);
  const [localChapter, setLocalChapter] = useState<number | null>(null);
  const [localVerseRange, setLocalVerseRange] = useState<[number, number] | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (selectedBook) {
      setLocalBook(selectedBook);
      setLocalChapter(selectedChapter);
      setLocalVerseRange(verseRange);
    }
    if (selectedBook && selectedChapter && verseRange) {
      setScreen('verse');
    }
  }, [selectedBook, selectedChapter, verseRange]);

  const isSelectionComplete = useCallback(() => {
    return !!(localBook && localChapter && localVerseRange);
  }, [localBook, localChapter, localVerseRange]);

  const getCurrentReference = useCallback(() => {
    if (screen === 'book') return '';
    
    const bookText = localBook || 'Select Book';
    if (screen === 'chapter') return bookText;
    
    if (screen === 'verse' && localChapter) {
      return `${bookText} ${localChapter}`;
    }
    
    return bookText;
  }, [screen, localBook, localChapter]);

  const getSelectedReference = useCallback(() => {
    if (isSelectionComplete()) {
      const [start, end] = localVerseRange!;
      return `${localBook} ${localChapter}:${start}${start !== end ? `-${end}` : ''}`;
    }
    return '';
  }, [isSelectionComplete, localBook, localChapter, localVerseRange]);

  const handleBookPress = useCallback((book: string) => {
    setLocalBook(book);
    setLocalChapter(null);
    setLocalVerseRange(null);
    setScreen('chapter');
  }, []);

  const handleChapterSelection = useCallback((chapter: number) => {
    setLocalChapter(chapter);
    setLocalVerseRange(null);
    setScreen('verse');
  }, []);

  const handleVerseSelection = useCallback((verse: number) => {
    setLocalVerseRange(prev => {
      if (!prev) return [verse, verse];
      const [start, end] = prev;
      if (verse >= start && verse <= end) {
        // Clicking inside the selected range resets it
        return null;
      }
      if (verse < start) return [verse, end];
      if (verse > end) return [start, verse];
      return [verse, verse];
    });
  }, []);

  const confirmSelection = useCallback(() => {
    if (!isSelectionComplete()) {
      Alert.alert('Incomplete Selection', 'Please select a book, chapter, and verse range before confirming.');
      return;
    }

    setSelectedBook(localBook);
    setSelectedChapter(localChapter);
    setVerseRange(localVerseRange);
    
    router.navigate('/recording');
  }, [isSelectionComplete, localBook, localChapter, localVerseRange, setSelectedBook, setSelectedChapter, setVerseRange, router]);

  const handleBackNavigation = useCallback(() => {
    if (screen === 'verse') {
      setScreen('chapter');
    } else if (screen === 'chapter') {
      setScreen('book');
    } else {
      // Already at 'book' screen, do nothing or handle as needed
    }
  }, [screen]);

  const renderBookList = () => (
    <FlatList
      data={versificationSchema ? Object.keys(versificationSchema.maxVerses) : []}
      keyExtractor={(item) => item}
      renderItem={({ item }) => {
        const isSelected = item === localBook;
        return (
          <TouchableOpacity
            className={`py-4 px-4 border-b border-gray-200 ${isSelected ? 'bg-blue-100' : ''}`}
            onPress={() => handleBookPress(item)}
          >
            <Text className={`text-lg ${isSelected ? 'font-bold text-blue-500' : ''}`}>{item}</Text>
          </TouchableOpacity>
        );
      }}
    />
  );

  const renderChapterGrid = () => {
    if (!localBook || !versificationSchema) return null;
    const chapters = versificationSchema.maxVerses[localBook];
    return (
      <ScrollView>
        <View className="flex-row flex-wrap justify-center p-2">
          {chapters.map((_, index) => {
            const chapterNumber = index + 1;
            const isSelected = localChapter === chapterNumber;
            return (
              <TouchableOpacity
                key={chapterNumber}
                className={`w-16 h-16 m-1 ${isSelected ? 'bg-blue-500' : 'bg-white'} rounded-lg justify-center items-center shadow`}
                onPress={() => handleChapterSelection(chapterNumber)}
              >
                <Text className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-black'}`}>{chapterNumber}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderVerseGrid = () => {
    if (!localBook || !localChapter || !versificationSchema) return null;
    const verses = versificationSchema.maxVerses[localBook][localChapter - 1];
    return (
      <ScrollView>
        <View className="flex-row flex-wrap justify-center p-2">
          {[...Array(verses)].map((_, index) => {
            const verseNumber = index + 1;
            const isSelected = localVerseRange && 
              verseNumber >= localVerseRange[0] && 
              verseNumber <= localVerseRange[1];
            return (
              <TouchableOpacity
                key={verseNumber}
                className={`w-16 h-16 m-1 ${isSelected ? 'bg-blue-500' : 'bg-gray-200'} rounded-lg justify-center items-center shadow`}
                onPress={() => handleVerseSelection(verseNumber)}
              >
                <Text className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-black'}`}>{verseNumber}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (screen) {
      case 'book':
        return renderBookList();
      case 'chapter':
        return renderChapterGrid();
      case 'verse':
        return renderVerseGrid();
      default:
        return null;
    }
  };

  if (!versificationSchema) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: getCurrentReference(),
          headerStyle: { backgroundColor: '#187dd9' },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },

          headerBackVisible: false,
          headerTitleAlign: 'center', 
          headerTitle: ({children}) => <Text className="text-xl font-bold text-white">{children}</Text>,
          headerLeft: () => screen !== 'book' ? (
            <Pressable onPress={handleBackNavigation}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
          ) : (
            <View />
          ),
          headerRight: () => <Pressable onPress={() => router.push('/setup')}>
            <Ionicons name="settings-outline" size={24} color="white" />
          </Pressable>
        }}
      />
      {renderContent()}
      {isSelectionComplete() && (
        <View className="p-4 bg-gray-100 flex-row items-center justify-end border-t border-gray-200 shadow-sm">
          <View className="p-4 self-center">
            <Text className="font-semibold text-xl">
              {getSelectedReference()}
            </Text>
          </View>
          <TouchableOpacity
            className="bg-blue-500 p-4 rounded-full self-center"
            onPress={confirmSelection}
          >
            <Ionicons name="arrow-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}