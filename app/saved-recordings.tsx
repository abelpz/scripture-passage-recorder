import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import { useSetupContext } from '../components/AppContext';

type FilterType = 'language' | 'book' | 'chapter';

const FilterModal = ({ visible, onClose, options, onSelect, title }: {
  visible: boolean;
  onClose: () => void;
  options: string[];
  onSelect: (option: string) => void;
  title: string;
}) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity activeOpacity={1}>
          <View className="bg-white rounded-t-3xl p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="py-3 border-b border-gray-200"
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text className="text-lg">{item}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
            />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

export default function SavedRecordings() {
  const {state} = useSetupContext();
  const { selectedLanguage: contextLanguage } = state;
  const [recordings, setRecordings] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
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
  const playbackUpdateInterval = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadRecordings();
  }, [selectedLanguage, selectedBook, selectedChapter]);

  const loadRecordings = async () => {
    const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
    const allRecordings = await listRecursive(recordingsDir);
    
    // Filter recordings based on selected options
    const filteredRecordings = allRecordings.filter(recording => {
      const [lang, book, chapter] = recording.split('/').slice(-4, -1);
      return (
        (!selectedLanguage || lang === selectedLanguage) &&
        (!selectedBook || book === selectedBook) &&
        (!selectedChapter || chapter === selectedChapter)
      );
    });

    setRecordings(filteredRecordings);

    // Update available options
    const uniqueLanguages = [...new Set(allRecordings.map(r => r.split('/').slice(-4, -3)[0]))];
    setLanguages(uniqueLanguages);

    if (selectedLanguage) {
      const uniqueBooks = [...new Set(allRecordings
        .filter(r => r.includes(`/${selectedLanguage}/`))
        .map(r => r.split('/').slice(-3, -2)[0])
      )];
      setBooks(uniqueBooks);
    }

    if (selectedBook) {
      const uniqueChapters = [...new Set(allRecordings
        .filter(r => r.includes(`/${selectedLanguage}/${selectedBook}/`))
        .map(r => r.split('/').slice(-2, -1)[0])
      )];
      setChapters(uniqueChapters);
    }
  };

  const listRecursive = async (dir: string): Promise<string[]> => {
    try {
      const dirExists = await FileSystem.getInfoAsync(dir);
      if (!dirExists.exists || !dirExists.isDirectory) {
        console.warn(`Directory does not exist: ${dir}`);
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(dir);
      let recordings: string[] = [];
      for (const file of files) {
        const filePath = `${dir}${file}`;
        const info = await FileSystem.getInfoAsync(filePath);
        if (info.exists) {
          if (info.isDirectory) {
            recordings = [...recordings, ...(await listRecursive(`${filePath}/`))];
          } else if (file.endsWith('.m4a')) {
            recordings.push(filePath);
          }
        } else {
          console.warn(`File or directory does not exist: ${filePath}`);
        }
      }
      return recordings;
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  };

  const downloadRecording = async (filePath: string) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error(`Source file does not exist: ${filePath}`);
      }

      const fileName = filePath.split('/').pop();
      const destinationUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: filePath,
        to: destinationUri
      });

      Alert.alert('Success', `Recording saved to ${destinationUri}`);
    } catch (error) {
      console.error('Error downloading recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to save the recording: ${errorMessage}`);
    }
  };

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
      await sound.unloadAsync();
    }
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

  const pauseRecording = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
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

  const renderItem = ({ item }: { item: string }) => {
    const fileName = item.split('/').pop();
    const isCurrentlyPlaying = playingFile === item;

    return (
      <View className="bg-white rounded-lg p-4 mb-2">
        <Text className="text-base mb-2">{fileName}</Text>
        <View className="flex-row justify-between items-center">
          {isCurrentlyPlaying && isPlaying ? (
            <>
              <TouchableOpacity onPress={pauseRecording} className="mr-4">
                <Ionicons name="pause" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={stopRecording} className="mr-4">
                <Ionicons name="stop" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => playRecording(item)} className="mr-4">
              <Ionicons name="play" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => shareRecording(item)}>
            <Ionicons name="share-outline" size={24} color="#4CD964" />
          </TouchableOpacity>
        </View>
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
        setSelectedBook('');
        setSelectedChapter('');
        break;
      case 'book':
        setSelectedBook(option);
        setSelectedChapter('');
        break;
      case 'chapter':
        setSelectedChapter(option);
        break;
    }
  };

  const renderFilterButton = (icon: string, filterType: FilterType, selectedItem: string) => (
    <TouchableOpacity
      className={`flex-row items-center bg-gray-200 rounded-full p-2 mr-2 ${selectedItem ? 'bg-blue-100' : ''}`}
      onPress={() => openFilterModal(filterType)}
    >
      <Ionicons name={icon as any} size={24} color={selectedItem ? "#007AFF" : "#000"} />
      {selectedItem ? <Text className="ml-2 text-sm text-blue-500">{selectedItem}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 p-8 py-14 bg-white">
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: '#187dd9' },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
          headerRight: () => <Pressable onPress={() => router.push('/setup')}>
            <Ionicons name="settings-outline" size={24} color="white" />
          </Pressable>
        }}
      />

      <View className="flex-row mb-4">
        {renderFilterButton("language", "language", selectedLanguage)}
        {selectedLanguage && renderFilterButton("book", "book", selectedBook)}
        {selectedBook && renderFilterButton("bookmark", "chapter", selectedChapter)}
      </View>

      {recordings.length === 0 ? (
        <Text className="text-center text-base text-gray-500">No recordings found</Text>
      ) : (
        <FlatList
          data={recordings}
          renderItem={renderItem}
          keyExtractor={(item) => item}
          className="flex-1"
        />
      )}

      <FilterModal
        visible={modalVisible}
        onClose={closeFilterModal}
        options={currentFilter === 'language' ? languages : currentFilter === 'book' ? books : chapters}
        onSelect={selectFilterOption}
        title={`Select ${currentFilter}`}
      />
    </View>
  );
}