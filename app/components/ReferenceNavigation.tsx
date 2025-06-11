import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReferenceContext, useSetupContext } from '../../contexts/AppContext';
import { Alert } from 'react-native';
import { styled } from 'nativewind';

const StyledIonicons = styled(Ionicons)

const VerseGrid = ({book, chapter, verseRange, versificationSchema, screen, ITEMS_PER_ROW, ITEM_WIDTH, ITEM_HEIGHT, MARGIN, onSelect}: {book: string | null, chapter: number | null, verseRange: [number, number] | null, versificationSchema: any, screen: 'book' | 'chapter' | 'verse', ITEMS_PER_ROW: number, ITEM_WIDTH: number, ITEM_HEIGHT: number, MARGIN: number, onSelect: (verse: number) => void}) => {
    if (!book || !chapter || !versificationSchema) return null;
    const verses = versificationSchema.maxVerses[book][chapter - 1];

    // Create a ref to store the ScrollView
    const scrollViewRef = useRef<ScrollView>(null);

    // Use useEffect to scroll when the screen changes to 'verse'
    useEffect(() => {
      if (screen === 'verse' && scrollViewRef.current && verseRange) {
        const rowIndex = Math.floor((verseRange[0] - 1) / ITEMS_PER_ROW);
        scrollViewRef.current.scrollTo({ y: rowIndex * (ITEM_HEIGHT + MARGIN), animated: false });
      }
    }, [screen]);

    return (
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          padding: MARGIN / 2,
          paddingBottom: 20
        }}
      >
        {[...Array(verses)].map((_, index) => {
          const verseNumber = index + 1;
          const isSelected = verseRange && 
            verseNumber >= verseRange[0] && 
            verseNumber <= verseRange[1];
          return (
            <TouchableOpacity
              key={verseNumber}
              style={{
                width: ITEM_WIDTH,
                height: ITEM_HEIGHT,
                margin: MARGIN / 2,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              className={`${isSelected ? 'bg-blue-500' : 'bg-gray-200'} rounded-lg shadow`}
              onPress={() => onSelect(verseNumber)}
            >
              <Text className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-black'}`}>{verseNumber}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };


export default function ReferenceNavigation({onCancel}: {onCancel: () => void}) {
  const {state: { selectedBook, selectedChapter, verseRange }, setSelectedBook, setSelectedChapter, setVerseRange} = useReferenceContext()
  const { state: { versificationSchema } } = useSetupContext()

  const [screen, setScreen] = useState<'book' | 'chapter' | 'verse'>('book');
  const [localBook, setLocalBook] = useState<string | null>(null);
  const [localChapter, setLocalChapter] = useState<number | null>(null);
  const [localVerseRange, setLocalVerseRange] = useState<[number, number] | null>(null);
  const router = useRouter();

  const screenWidth = Dimensions.get('window').width;
  const MARGIN = 8; // 4 points on each side
  const ITEMS_PER_ROW = Math.floor(screenWidth / 75); // Assuming we want each item to be about 75 points wide including margin
  const ITEM_WIDTH = (screenWidth - (ITEMS_PER_ROW + 1) * MARGIN) / ITEMS_PER_ROW;
  const ITEM_HEIGHT = ITEM_WIDTH; // Making the height equal to the width for square buttons

  const [slideAnim] = useState(new Animated.Value(0));

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
        contentContainerStyle={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          padding: MARGIN / 2,
          paddingBottom: 20
        }}
        ref={(scrollView) => {
          if (scrollView && localChapter) {
            const rowIndex = Math.floor((localChapter - 1) / ITEMS_PER_ROW);
            scrollView.scrollTo({ y: rowIndex * (ITEM_HEIGHT + MARGIN), animated: true });
          }
        }}
      >
        {chapters.map((_, index) => {
          const chapterNumber = index + 1;
          const isSelected = localChapter === chapterNumber;
          return (
            <TouchableOpacity
              key={chapterNumber}
              style={{
                width: ITEM_WIDTH,
                height: ITEM_HEIGHT,
                margin: MARGIN / 2,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              className={`${isSelected ? 'bg-blue-500' : 'bg-white'} rounded-lg shadow`}
              onPress={() => handleChapterSelection(chapterNumber)}
            >
              <Text className={`text-lg font-semibold ${isSelected ? 'text-white' : 'text-black'}`}>{chapterNumber}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  useEffect(() => {
    slideAnim.setValue(1);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [screen]);

  const renderContent = () => {
    const slideInterpolate = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, screenWidth], // Slide from screen width to 0
    });

    return (
      (() => {
          switch (screen) {
            case 'book':
              return renderBookList();
            case 'chapter':
              return renderChapterGrid();
            case 'verse':
              return <VerseGrid book={localBook} chapter={localChapter} verseRange={localVerseRange} versificationSchema={versificationSchema} screen={screen} ITEMS_PER_ROW={ITEMS_PER_ROW} ITEM_WIDTH={ITEM_WIDTH} ITEM_HEIGHT={ITEM_HEIGHT} MARGIN={MARGIN} onSelect={handleVerseSelection} />;
            default:
              return null;
          }
        })()
    );
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
