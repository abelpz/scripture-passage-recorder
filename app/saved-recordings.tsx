import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Alert, Modal, SectionList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import { useSetupContext } from '../contexts/AppContext';
import { styled } from 'nativewind';
import { useRecordings, Recording } from '../contexts/RecordingsContext';

const StyledIonicons = styled(Ionicons)

type FilterType = 'language' | 'book' | 'chapter';

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
  const { sections, languages, books, chapters, loadRecordings } = useRecordings();
  const { state } = useSetupContext();
  const { selectedLanguage: contextLanguage } = state;
  const [selectedLanguage, setSelectedLanguage] = useState<string>(contextLanguage?.lc || "");
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterType | null>(null);
  const router = useRouter();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playingFile, setPlayingFile] = useState<string | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);

  useEffect(() => {
    loadRecordings(selectedLanguage, selectedBook, selectedChapter);
  }, [selectedLanguage, selectedBook, selectedChapter]);

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

  const playRecording = async (filePath: string) => {
    if (sound) {
      const soundStatus = await sound.getStatusAsync();
      if (soundStatus.isLoaded) {
        if (filePath === playingFile) {
          // Toggle play/pause for the current sound
          if (soundStatus.isPlaying) {
            await sound.pauseAsync();
          } else {
            await sound.playAsync();
          }
          return;
        } else {
          // Unload the current sound before creating a new one
          await sound.unloadAsync();
        }
      }
    }

    // Create and play the new sound
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: filePath },
      { progressUpdateIntervalMillis: 100 },
      onPlaybackStatusUpdate
    );
    setSound(newSound);
    setPlayingFile(filePath);
    const status = await newSound.getStatusAsync();
    if (status.isLoaded) {
      setDuration(status.durationMillis ?? 0);
    }
    await newSound.playAsync();
    setIsPlaying(true);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        stopRecording();
      }
    }
  };

  const stopRecording = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.setPositionAsync(0);
      setIsPlaying(false);
      setPlaybackPosition(0);
      setPlayingFile(null);
    }
  };

  const seekRecording = async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value);
      setPlaybackPosition(value);
    }
  };

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const formatDate = (date: Date, format: string): string => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    return format.replace(/dd|MM|yyyy/g, (match) => {
      switch (match) {
        case 'dd': return pad(date.getDate());
        case 'MM': return pad(date.getMonth() + 1);
        case 'yyyy': return date.getFullYear().toString();
        default: return match;
      }
    });
  };

  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderItem = ({ item }: { item: Recording }) => {
    const isCurrentlyPlaying = playingFile === item.filePath;

    return (
      <View className="bg-white rounded-lg p-4 mb-2 ">
        <View className="flex-row items-center">
          <Pressable onPress={() => playRecording(item.filePath)} className="mr-4">
            <Ionicons name={isCurrentlyPlaying && isPlaying ? "pause" : "play"} size={24} color="#007AFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-base font-semibold">{item.fileName}</Text>
            <Text className="text-sm text-gray-500">
              {formatDate(item.date, 'dd/MM/yyyy')} • {formatDuration(item.duration)}
            </Text>
          </View>
          <Pressable onPress={() => shareRecording(item.filePath)} className="ml-2">
            <Ionicons name="share-outline" size={24} color="gray" />
          </Pressable>
        </View>
        <View className="w-full">
          {isCurrentlyPlaying && (
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={duration}
              value={playbackPosition}
              onSlidingComplete={seekRecording}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#000000"
            />
          )}
        </View>
      </View>
      
    );
  };

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

      {sections.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-center text-base text-gray-500">No recordings found</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
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
