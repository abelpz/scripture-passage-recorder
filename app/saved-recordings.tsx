import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, Modal, SectionList, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import { useSetupContext } from '../contexts/AppContext';
import { styled } from 'nativewind';
import { useRecordings, Section, Recording } from '../contexts/RecordingsContext';
import RecordingItem from './components/RecordingItem';

const StyledIonicons = styled(Ionicons)

type FilterType = 'language' | 'book' | 'chapter';

type SortOrder = 'recent' | 'old';

const FilterModal = ({ visible, onClose, options, onSelect, onClear, title }: {
  visible: boolean;
  onClose: () => void;
  options: string[];
  onSelect: (option: string) => void;
  onClear: () => void;
  title: string;
}) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <Pressable
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
      onPress={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable>
          <View className="bg-white rounded-t-3xl p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">{title}</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color="black" />
              </Pressable>
            </View>
            <Pressable
              className="py-3 border-b border-gray-200"
              onPress={() => {
                onClear();
                onClose();
              }}
            >
              <Text className="text-lg text-red-500">Clear Selection</Text>
            </Pressable>
            <FlatList
              data={options}
              renderItem={({ item }) => (
                <Pressable
                  className="py-3 border-b border-gray-200"
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text className="text-lg">{item}</Text>
                </Pressable>
              )}
              keyExtractor={(item) => item}
            />
          </View>
        </Pressable>
      </View>
    </Pressable>
  </Modal>
);

export default function SavedRecordings() {
  const { sections, languages, books, chapters, loadRecordings, isLoading } = useRecordings();
  const { state } = useSetupContext();
  const { selectedLanguage: contextLanguage } = state;
  const [selectedLanguage, setSelectedLanguage] = useState<string>(contextLanguage?.lc || "");
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterType | null>(null);
  const router = useRouter();
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('old');

  useEffect(() => {
    loadRecordings(selectedLanguage, selectedBook, selectedChapter);
  }, [selectedLanguage, selectedBook, selectedChapter]);

  console.log("RENDERING SAVED RECORDINGS");

  const shareRecording = async (filePath: string) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(filePath);
    } catch (error) {
      console.error('Error sharing recording:', error);
      Alert.alert('Error', 'Failed to share the recording.');
    }
  };

  const renderItem = useCallback(({ item }: { item: Recording }) => (
    <RecordingItem
      recording={item}
      active={currentlyPlayingId === item.filePath}
      onPlay={() => setCurrentlyPlayingId(item.filePath)}
    />
  ), [currentlyPlayingId]);

  const openFilterModal = (filterType: FilterType) => {
    setCurrentFilter(filterType);
    setModalVisible(true);
  };

  const closeFilterModal = () => {
    setModalVisible(false);
    setCurrentFilter(null);
  };

  const selectFilterOption = (option: string) => {
    switch (currentFilter) {
      case 'language':
        setSelectedLanguage(option);
        break;
      case 'book':
        setSelectedBook(option);
        break;
      case 'chapter':
        setSelectedChapter(option);
        break;
    }
  };

  const clearFilter = (filterType: FilterType) => {
    switch (filterType) {
      case 'language':
        setSelectedLanguage('');
        setSelectedBook('');
        setSelectedChapter('');
        break;
      case 'book':
        setSelectedBook('');
        setSelectedChapter('');
        break;
      case 'chapter':
        setSelectedChapter('');
        break;
    }
  };

  const renderFilterButton = (icon: string, filterType: FilterType, selectedItem: string) => (
    <View className={`flex-row items-center bg-gray-200 rounded-full  ${selectedItem ? 'bg-blue-100' : ''} mr-1 mb-2`}>
      <Pressable
      className="flex-row items-center p-2"
        onPress={() => openFilterModal(filterType)}
      >
        <Ionicons name={icon as any} size={24} color={selectedItem ? "#007AFF" : "#000"} />
        {selectedItem ? <Text className="ml-2 text-blue-500">{selectedItem}</Text> : null}
      </Pressable>
      {selectedItem && (
        <Pressable
          className="ml-1 rounded-full p-2"
          onPress={() => clearFilter(filterType)}
        >
          <StyledIonicons name="close-circle" size={24} className='text-red-400' />
        </Pressable>
      )}
    </View>
  );

  const toggleSortByDate = useCallback(() => {
    setSortOrder(prevSort => {
      switch (prevSort) {
        case 'recent': return 'old';
        case 'old': return 'recent';
      }
    });
  }, []);

  const sortedSections = useCallback(() => {
    return [...sections].sort((a, b) => {
      const dateA = new Date(a.title);
      const dateB = new Date(b.title);

      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        // Both titles are valid dates, sort by date
        return sortOrder === 'recent' 
          ? dateB.getTime() - dateA.getTime()
          : dateA.getTime() - dateB.getTime();
      } else if (!isNaN(dateA.getTime())) {
        // Only a is a date, it should come first
        return sortOrder === 'recent' ? -1 : 1;
      } else if (!isNaN(dateB.getTime())) {
        // Only b is a date, it should come first
        return sortOrder === 'recent' ? 1 : -1;
      } else {
        // Neither is a date, sort alphabetically
        return sortOrder === 'recent'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
    });
  }, [sections, sortOrder]);

  return (
    <View className={`flex-1 p-4 bg-gray-100`}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: '#187dd9' },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
          headerRight: () => (
            <View className="flex-row items-center">
              <Pressable onPress={toggleSortByDate} className="mr-4">
                <Ionicons 
                  name={sortOrder === 'recent' ? "arrow-down" : "arrow-up"} 
                  size={24} 
                  color="white" 
                />
              </Pressable>
              <Pressable onPress={() => router.push('/setup')}>
                <Ionicons name="settings-outline" size={24} color="white" />
              </Pressable>
            </View>
          ),
        }}
      />
      

      <View className="flex-row mb-2 flex-wrap">
        {renderFilterButton("language", "language", selectedLanguage)}
        {selectedLanguage && renderFilterButton("book", "book", selectedBook)}
        {selectedBook && renderFilterButton("bookmark", "chapter", selectedChapter)}
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : sortedSections().length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Ionicons name="mic-off-outline" size={64} color="#A0AEC0" />
        </View>
      ) : (
        <SectionList
          sections={sortedSections()}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text className="p-2 rounded-t-lg mt-4">{title}</Text>
          )}
          keyExtractor={(item) => item.filePath}
          className="flex-1"
        />
      )}

      <FilterModal
        visible={modalVisible}
        onClose={closeFilterModal}
        options={currentFilter === 'language' ? languages : currentFilter === 'book' ? books : chapters}
        onSelect={selectFilterOption}
        onClear={() => currentFilter ? clearFilter(currentFilter) : null}
        title={`Select ${currentFilter}`}
      />
    </View>
  );
}
