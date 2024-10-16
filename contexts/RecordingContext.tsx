import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReferenceContext } from './AppContext';
import { useRecordings } from './RecordingsContext';

export type RecordingStatus = 'idle' | 'recording' | 'playing' | 'paused' | 'stopped';

interface RecordingContextType {
  recording: Audio.Recording | null;
  sound: Audio.Sound | null;
  status: RecordingStatus;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  playRecording: () => Promise<void>;
  pausePlayback: () => Promise<void>;
  stopPlayback: () => Promise<void>;
  saveRecording: (onSave?: () => void) => Promise<void>;
  cancelRecording: (onCancel?: () => void) => Promise<void>;
  seek: (position: number) => Promise<void>;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export const RecordingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state: { selectedBook, selectedChapter, verseRange } } = useReferenceContext();
  const { addRecording } = useRecordings();

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [status, setStatus] = useState<RecordingStatus>('idle');

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Audio recording permission is required to use this feature.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setStatus('recording');
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const onPlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    if (playbackStatus.isLoaded) {
      if (playbackStatus.didJustFinish) {
        setStatus('stopped');
        setSound(null);
      }
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording...');
    if (!recording) {
      console.log('No active recording to stop');
      return;
    }
    try {
      await recording.stopAndUnloadAsync();
      setStatus('stopped');
      setSound(null);
      console.log('Recording stopped successfully');
    } catch (error) {
      console.error('Error stopping recording or creating sound object:', error);
      Alert.alert("Error", `Failed to process the recording: ${(error as Error).message}`);
    }
  };

  const playRecording = async () => {
    try {
      if (sound) {
        // If sound exists, resume playback
        console.log('Resuming playback...');
        const playbackStatus = await sound.playAsync();
        console.log('Playback resumed, status:', playbackStatus);
        setStatus('playing');
        return;
      }

      if (!recording) {
        console.log('No recording to play');
        return;
      }

      console.log('Attempting to play recording...');
      const { sound: newSound, status: soundStatus } = await recording.createNewLoadedSoundAsync(
        {
          progressUpdateIntervalMillis: 100,
          shouldPlay: true,
        },
        onPlaybackStatusUpdate
      );

      if (!soundStatus.isLoaded) { 
        console.log('Audio is not loaded properly');
        Alert.alert("Error", "Audio is not loaded properly");
        return;
      }

      const playbackStatus = await newSound.playAsync();
      console.log('Playback started, status:', playbackStatus);

      setSound(newSound);
      setStatus('playing');
      
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert("Error", "Failed to play the audio");
    }
  };

  const pausePlayback = async () => {
    if (!sound) {
      console.log('No sound object available');
      Alert.alert("Error", "No audio to pause");
      return;
    }
    try {
      await sound.pauseAsync();
      setStatus('paused');
    } catch (error) {
      console.error('Error pausing audio:', error);
      Alert.alert("Error", "Failed to pause the audio");
    }
  };

  const stopPlayback = async () => {
    if (!sound) {
      console.log('No sound object available');
      Alert.alert("Error", "No audio to stop");
      return;
    }
    try {
      const soundStatus = await sound.getStatusAsync();
      if (soundStatus.isLoaded) {
        await sound.stopAsync();
        setStatus('stopped');
        setSound(null);
      }
    } catch (error) {
      console.warn('Error stopping audio:', error);
      Alert.alert("Error", "Failed to stop the audio");
    }
  };

  const saveRecording = async (onSave?: () => void) => {
    if (!recording || !selectedChapter) {
      console.log('No recording or chapter selected');
      Alert.alert("Error", "No recording or chapter selected");
      return;
    }

    const languageJson = await AsyncStorage.getItem('selectedLanguage');
    if (!languageJson) {
      return;
    }
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
      
      // Reset the state after successful save
      setRecording(null);
      setSound(null);
      setStatus('idle');
      if (onSave) {
        onSave();
      }

      // After saving the file, add it to the RecordingsContext
      addRecording({
        filePath: `${folderPath}${uniqueFileName}`,
        fileName: uniqueFileName,
        date: new Date().toISOString(),
        duration: 0 // You might want to get the actual duration here
      });
    } catch (error) {
      console.error('Error saving recording:', error);
      Alert.alert('Error', 'Failed to save the recording');
    }
  };

  const cancelRecording = async (onCancel?: () => void) => {
    console.log('Cancelling recording...');
    try {
      if (recording) {
        console.log('Stopping and unloading recording...');
        const recordingStatus = await recording.getStatusAsync();
        if (recordingStatus.canRecord) {
          await recording.stopAndUnloadAsync();
        }
      }
      if (sound) {
        console.log('Unloading sound...');
        const soundStatus = await sound.getStatusAsync();
        if (soundStatus.isLoaded) {
          sound.setOnPlaybackStatusUpdate(null);
          await sound.unloadAsync();
        }
      }
    } catch (error) {
      console.error('Error in cancelRecording:', error);
    } finally {
      console.log('Resetting state...');
      setRecording(null);
      setSound(null);
      setStatus('idle');
      if (onCancel) {
        onCancel();
      }
    }
  };

  const seek = async (position: number) => {
    if (sound) {
      try {
        await sound.setPositionAsync(position);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  const value = {
    recording,
    sound,
    status,
    startRecording,
    stopRecording,
    playRecording,
    pausePlayback,
    stopPlayback,
    saveRecording,
    cancelRecording,
    seek,
  };

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>;
};

export const useRecording = () => {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
};
