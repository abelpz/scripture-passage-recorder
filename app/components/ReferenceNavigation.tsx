import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReferenceContext, useSetupContext } from '../../contexts/AppContext';
import { Alert } from 'react-native';
import { styled } from 'nativewind';

const StyledIonicons = styled(Ionicons)

export default function ReferenceNavigation({onCancel}: {onCancel: () => void}) {
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
      initialScrollIndex={versificationSchema && localBook ? Object.keys(versificationSchema.maxVerses).indexOf(localBook) : 0}
      getItemLayout={(data, index) => ({
        length: 56, // Adjust this value based on your item height (py-4 = 32px + any additional padding/margin)
        offset: 56 * index,
        index,
      })}
    />
  );

  const renderChapterGrid = () => {
    if (!localBook || !versificationSchema) return null;
    const chapters = versificationSchema.maxVerses[localBook];
    return (
      <ScrollView
        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 8 }}
        ref={(scrollView) => {
          if (scrollView && localChapter) {
            scrollView.scrollTo({ y: Math.floor((localChapter - 1) / 4) * 72, animated: true });
          }
        }}
      >
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
      </ScrollView>
    );
  };

  const renderVerseGrid = () => {
    if (!localBook || !localChapter || !versificationSchema) return null;
    const verses = versificationSchema.maxVerses[localBook][localChapter - 1];
    return (
      <ScrollView
        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 8 }}
        ref={(scrollView) => {
          if (scrollView && localVerseRange) {
            scrollView.scrollTo({ y: Math.floor((localVerseRange[0] - 1) / 4) * 72, animated: false });
          }
        }}
      >
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
      <View className="flex-1">
        <View className="flex-1">
          <View className="border-r justify-end items-center">
          <View className="flex-row w-full justify-center items-center p-4 gap-1 border-b border-gray-300">
            <TouchableOpacity
              className={`bg-gray-100 px-4 py-2 rounded-xl mr-2 ${screen === 'book' ? 'bg-blue-200' : ''}`}
              onPress={() => setScreen('book')}
            >
              <Text className={`text-xl ${screen === 'book' ? 'text-blue-600' : 'text-blue-500'} font-semibold`}>
                {localBook || ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`bg-gray-100 px-4 py-2 rounded-xl ${screen === 'chapter' ? 'bg-blue-200' : ''}`}
              onPress={() => setScreen('chapter')}
            >
              <Text className={`text-xl ${screen === 'chapter' ? 'text-blue-600' : 'text-blue-500'} font-semibold`}>
                {localChapter || '  '}
              </Text>
            </TouchableOpacity>
            <Text className="text-xl text-gray-500 font-semibold">:</Text>  
            <TouchableOpacity
              className={`bg-gray-100 px-4 py-2 rounded-xl ${screen === 'verse' ? 'bg-blue-200' : ''}`}
              onPress={() => setScreen('verse')}
            >
              <Text className={`text-xl ${screen === 'verse' ? 'text-blue-600' : 'text-blue-500'} font-semibold`}>
                {localVerseRange ? (localVerseRange[0] === localVerseRange[1] ? localVerseRange[0] : `${localVerseRange[0]}-${localVerseRange[1]}`) : '  '}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-1">
          {renderContent()}
        </View>
        </View>
      </View>
      <View className="p-2 pb-6  px-8 bg-gray-100 flex-row items-center justify-between border-t border-gray-200 shadow-sm gap-4">
        <TouchableOpacity
          className="bg-gray-200 p-4 rounded-full self-center"
          onPress={() => {
            onCancel()
          }}
        >
          <StyledIonicons name="close" size={24} className="text-red-400" />
        </TouchableOpacity>
        <View className="p-4 self-center">
          <Text className="font-semibold text-xl">
            {isSelectionComplete() ? getSelectedReference() : ''}
          </Text>
        </View>
          <TouchableOpacity
            className={`bg-blue-500 p-4 rounded-full self-center ${isSelectionComplete() ? 'opacity-100' : 'opacity-50'}`}
            onPress={confirmSelection}
            disabled={!isSelectionComplete()}
          >
            <Ionicons name="arrow-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>
    </View>
  );
}
