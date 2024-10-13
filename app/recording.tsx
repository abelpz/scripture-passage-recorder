import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReferenceContext } from '../components/AppContext';
import { Foundation, Ionicons, Octicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { LiveRecordingWaveform } from '@/components/LiveRecordingWaveform';
import { PlaybackWaveform } from '@/components/PlaybackWaveform';
import { LevelData, useRecordingLevels } from '@/hooks/useRecordingLevels';
import { styled } from 'nativewind';

const StyledFoundation = styled(Foundation);
const StyledIonicons = styled(Ionicons);

export default function RecordingScreen() {
  const {state:{ selectedBook, selectedChapter, verseRange }} = useReferenceContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [processedSound, setProcessedSound] = useState<Audio.Sound | null>(null);
  const [isWaveformLoading, setIsWaveformLoading] = useState(false);
  const router = useRouter();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [recordedLevels, setRecordedLevels] = useState<LevelData[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  const { levels: recordingLevels, resetLevels } = useRecordingLevels(isRecording, recording, 3);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.getStatusAsync().then(status => {
          if (status.canRecord) {
            console.log('Stopping recording');
            recording.stopAndUnloadAsync();
          }
        }).catch(error => console.error('Error checking recording status:', error));
      }
      if (soundRef.current) {
        soundRef.current.getStatusAsync().then(status => {
          if (status.isLoaded) {
            console.log('Unloading sound');
            soundRef.current?.unloadAsync();
          }
        }).catch(error => console.error('Error checking sound status:', error));
      }
    };
  }, []);

  useEffect(() => {
    // Set up audio mode when component mounts
    const setupAudioMode = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('Audio mode set successfully');
      } catch (error) {
        console.error('Error setting audio mode:', error);
      }
    };

    setupAudioMode();
  }, []);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Audio recording permission is required to use this feature.');
        return;
      }

      console.log('Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    console.log('Stopping recording...');
    setIsRecording(false);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);

      setRecordedLevels(recordingLevels); // Save all recorded levels

      if (!uri) {
        throw new Error("No recording URI available");
      }

      console.log('Creating sound object from URI:', uri);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        (status) => console.log('Sound creation status:', status)
      );
      console.log('Sound object created:', newSound);
      soundRef.current = newSound;
      setSound(newSound);
      
      // Wait for the sound to be fully loaded
      await new Promise<void>((resolve, reject) => {
        const checkStatus = async () => {
          const status = await newSound.getStatusAsync();
          if (status.isLoaded) {
            resolve();
          } else if (status.error) {
            reject(new Error('Failed to load sound'));
          } else {
            setTimeout(checkStatus, 100);
          }
        };
        checkStatus();
      });

      setProcessedSound(newSound);
      console.log('Sound object set to state and ref');

    } catch (error) {
      console.error('Error stopping recording or creating sound object:', error);
      Alert.alert("Error", `Failed to process the recording: ${(error as Error).message}`);
    }
  };

  const playRecording = async () => {
    if (!soundRef.current) {
      console.log('No sound object available');
      Alert.alert("Error", "No audio to play");
      return;
    }
    try {
      console.log('Attempting to play recording...');
      const status = await soundRef.current.getStatusAsync();
      console.log('Current sound status before play:', status);
      
      if (status.isLoaded) {
        console.log('Sound is loaded, attempting to play...');

        console.log('Audio mode set for playback');

        soundRef.current.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            const { positionMillis, durationMillis } = status;
            if (durationMillis !== undefined) {
              const progress = positionMillis / durationMillis;
              // Update the playback position in the PlaybackWaveform component
              if (processedSound && processedSound.setPositionAsync) {
                processedSound.getStatusAsync().then(soundStatus => {
                  if (soundStatus.isLoaded) {
                    processedSound.setPositionAsync(positionMillis).catch(error => {
                      console.warn('Error setting position:', error);
                    });
                  }
                }).catch(error => {
                  console.warn('Error getting sound status:', error);
                });
              }
            }
          }
          if ('didJustFinish' in status && status.didJustFinish) {
            console.log('Playback finished');
            setIsPlaying(false);
          }
        });
        
        const playbackStatus = await soundRef.current.playAsync();
        console.log('Playback started, status:', playbackStatus);
        
        setIsPlaying(true);
        
        
      } else {
        console.log('Audio is not loaded properly');
        Alert.alert("Error", "Audio is not loaded properly");
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert("Error", "Failed to play the audio");
    }
  };

  const pausePlayback = async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } catch (error) {
      console.error('Error pausing audio:', error);
      Alert.alert("Error", "Failed to pause the audio");
    }
  };

  const stopPlayback = async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await soundRef.current.stopAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.warn('Error stopping audio:', error);
      Alert.alert("Error", "Failed to stop the audio");
    }
  };

  const saveRecording = async () => {
    if (!recording || !selectedChapter) return;

    const languageJson = await AsyncStorage.getItem('selectedLanguage');
    if (!languageJson) return;
    const language = JSON.parse(languageJson);
    const fileName = `${language.lc}_${selectedBook}_${selectedChapter}_${verseRange ? (verseRange[0] === verseRange[1] ? verseRange[0] : `${verseRange[0]}-${verseRange[1]}`) : ''}.m4a`;
    const folderPath = `${FileSystem.documentDirectory}recordings/${language.lc}/${selectedBook}/${selectedChapter}/`;

    console.log('Saving recording to:', `${folderPath}${fileName}`);

    try {
      await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });

      // Check if file already exists and generate a unique name if needed
      let uniqueFileName = fileName;
      let counter = 1;
      while (await FileSystem.getInfoAsync(`${folderPath}${uniqueFileName}`).then(result => result.exists)) {
        const fileNameParts = fileName.split('.');
        const extension = fileNameParts.pop();
        uniqueFileName = `${fileNameParts.join('.')}(${counter}).${extension}`;
        counter++;
      }

      await FileSystem.moveAsync({
        from: recording.getURI() || '',
        to: `${folderPath}${uniqueFileName}`,
      });
      console.log('Recording saved successfully as:', uniqueFileName);
      
    } catch (error) {
      console.error('Error saving recording:', error);
      Alert.alert('Error', 'Failed to save the recording');
    }

    setRecording(null);
    resetLevels(); // Reset levels after saving
    setRecordedLevels([]);
    router.push('/saved-recordings');
  };

  const cancelRecording = async () => {
    console.log('Cancelling recording...');
    try {
      setIsRecording(false);
      if (recording) {
        console.log('Stopping and unloading recording...');
        const status = await recording.getStatusAsync();
        if (status.canRecord) {
          await recording.stopAndUnloadAsync();
        }
      }
      if (soundRef.current) {
        console.log('Unloading sound...');
        const soundStatus = await soundRef.current.getStatusAsync();
        if (soundStatus.isLoaded) {
          // Remove the playback status update listener before unloading
          soundRef.current.setOnPlaybackStatusUpdate(null);
          await soundRef.current.unloadAsync();
        }
      }
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      setRecordingDuration(0);
    } catch (error) {
      console.error('Error in cancelRecording:', error);
    } finally {
      console.log('Resetting state...');
      setRecording(null);
      setSound(null);
      setProcessedSound(null);
      soundRef.current = null;
      setIsRecording(false);
      setIsPlaying(false);
      resetLevels();
      setRecordedLevels([]);
    }
  };

  const handleSeek = async (position: number) => {
    if (soundRef.current) {
      try {
        await soundRef.current.setPositionAsync(position);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  useEffect(() => {
    if (!isRecording) {
      setRecordedLevels(recordingLevels);
    }
  }, [isRecording, recordingLevels]);

  const getLiveRecordingDuration = useCallback(() => {
    const minutes = Math.floor(recordingDuration / 60);
    const seconds = recordingDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [recordingDuration]);

  return (
    <View className="flex-1 py-14 bg-white">
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: '#187dd9' },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold'
          },
          headerLeft: () => <Pressable onPress={() => router.push('/navigation')}>
            <Octicons name="apps" size={24} color="white" />
          </Pressable>,
          headerRight: () => <Pressable onPress={() => router.push('/setup')}>
            <Ionicons name="settings-outline" size={24} color="white" />
          </Pressable>
        }}
      />

      <View className="flex-1 justify-center items-center">
        <Pressable className="my-5" onPress={() => router.push('/navigation')}>
          <Text className="text-2xl font-bold">
            {selectedBook} {selectedChapter}:
            {verseRange ? (verseRange[0] === verseRange[1] ? verseRange[0] : `${verseRange[0]}-${verseRange[1]}`) : ''}
          </Text>
        </Pressable>
        <Text className="text-xl text-gray-600">
          {getLiveRecordingDuration()}
        </Text>
        <View className="w-full h-52">
          {isRecording ? (
            <LiveRecordingWaveform 
              recordingLevels={recordingLevels}
              height={200}
              barHeight={1.5}
            />
          ) : isWaveformLoading ? (
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#4A90E2" />
            </View>
          ) : processedSound && recordedLevels ? (
            <PlaybackWaveform 
              sound={processedSound}
              isPlaying={isPlaying}
              height={200}
              levels={recordedLevels}
              onSeek={handleSeek}
            />
          ) : (
            <View className="h-52" />
          )}
           
        </View>
        
      </View>

      <View className="flex-row items-center justify-around mb-4">
        {isRecording ? (
          <Pressable onPress={stopRecording}>
            <Ionicons name="stop" size={48} color="red" />
          </Pressable>
        ) : sound ? (
          <>
            {isPlaying ? (
              <>
              <Pressable onPress={stopPlayback}>
                <Ionicons name="stop" size={48} color="black" />
              </Pressable>
              <Pressable onPress={pausePlayback}>
                <Ionicons name="pause" size={48} color="black" />
              </Pressable>
              </>
            ) : (
              <>
              <Pressable onPress={cancelRecording}>
                <StyledIonicons name="close" size={48} className="text-red-500" />
              </Pressable>
              <Pressable className="bg-blue-500 p-4 rounded-full self-center" onPress={playRecording}>
                <StyledIonicons name="play" size={32} color="white" />
              </Pressable>
              <Pressable onPress={saveRecording}>
                <StyledIonicons name="checkmark-sharp" size={48} className="text-green-500" />
              </Pressable>
              </>
            )}
          </>
        ) : (
          <>
          <Pressable className="bg-red-500 p-4 rounded-full self-center" onPress={startRecording}>
            <StyledIonicons name="mic" size={32} color="white" />
          </Pressable>
          <Pressable className="bg-blue-500  p-4 rounded-full self-center" onPress={() => router.push('/saved-recordings')}>
            <StyledIonicons name="list" size={32} color="white" />
          </Pressable>
          </>
        )}
      </View>
    </View>
  );
}