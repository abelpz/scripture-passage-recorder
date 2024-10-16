import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Sharing from 'expo-sharing';
import { Recording } from '@/contexts/RecordingsContext';

interface RecordingItemProps {
  recording: Recording;
  active: boolean;
  onActiveStateChange: (isActive: boolean) => void;
}

const RecordingItem: React.FC<RecordingItemProps> = ({ 
  recording, 
  active,
  onActiveStateChange
}) => {
  const isControlled = active !== undefined;
  const [internalActive, setInternalActive] = useState(false);
  const isActive = isControlled ? active : internalActive;

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);

  const resetState = useCallback(() => {
    console.log("resetting state");
    setIsPlaying(false);
    setPlaybackPosition(0);
    if(sound) {
      sound.unloadAsync();
      setSound(null);
    }
  }, [sound]);

  useEffect(() => {
    return () => {
      if (sound) {
        console.log("unloading sound");
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const stopPlayback = useCallback(async () => {
    resetState();
  }, [resetState]);

  const pause = useCallback(async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  }, [sound]);


  const play = useCallback(async () => {
    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        setPlaybackPosition(status.positionMillis);
        setIsPlaying(status.isPlaying);
        if (status.didJustFinish) {
          console.log('playback finished');
          resetState();
        }
      }
    };
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        console.log('playing', recording.filePath);
        await sound.playAsync();
      } else {
        console.log('Sound not loaded, loading again');
        await sound.loadAsync({ uri: recording.filePath });
        await sound.playAsync();
      }
    } else {
      console.log('creating new sound', recording.filePath);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recording.filePath },
        { progressUpdateIntervalMillis: 100 },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      await newSound.playAsync();
    }
    setIsPlaying(true);
  }, [sound, recording.filePath, resetState]);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play, onActiveStateChange, isControlled]);

  const handleActivation = useCallback(() => {
    if (!isControlled) {
      setInternalActive(true);
    }
    onActiveStateChange(true);
  }, [isControlled, onActiveStateChange, play]);

  //if controlled by parent and active is true play the recording
  useEffect(() => {
    if (isControlled && active) {
      play();
    }
  }, [isControlled, active, play]);

  const seekRecording = useCallback(async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value);
      setPlaybackPosition(value);
    }
  }, [sound]);

  const shareRecording = useCallback(async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        alert('Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(recording.filePath);
    } catch (error) {
      console.error('Error sharing recording:', error);
      alert('Failed to share the recording.');
    }
  }, [recording.filePath]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatDuration = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View className="bg-white rounded-lg p-4 mb-2">
      <View className="flex-row items-center">
        <Pressable 
          onPress={!isActive ? handleActivation : togglePlayPause} 
          className="mr-4"
        >
          <Ionicons name={!isPlaying || !isActive ? "play" : "pause"} size={24} color="#007AFF" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-semibold">{recording.fileName}</Text>
          <Text className="text-sm text-gray-500">
            {formatDate(recording.date)} • {formatDuration(recording.duration)}
          </Text>
        </View>
        <Pressable onPress={shareRecording} className="ml-2">
          <Ionicons name="share-outline" size={24} color="gray" />
        </Pressable>
      </View>
      {isActive && <View className="w-full">
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={recording.duration}
          value={playbackPosition}
          onSlidingComplete={seekRecording}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#000000"
        />
      </View>}
    </View>
  );
};

export default React.memo(RecordingItem);
