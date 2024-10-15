import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReferenceContext } from '../contexts/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { LiveRecordingWaveform } from '@/components/LiveRecordingWaveform';
import { PlaybackWaveform } from '@/components/PlaybackWaveform';
import { styled } from 'nativewind';
import { RecordingProvider, RecordingStatus, useRecording } from '@/contexts/RecordingContext';
import { useRecordingDuration } from '@/hooks/useRecordingDuration';
import { useRecordingLevels } from '@/hooks/useRecordingLevels';

const StyledIonicons = styled(Ionicons);
  
  // Main control component
const RecordingControlPanel = () => {
  const router = useRouter();
  const { 
    status, 
    stopRecording, 
    stopPlayback, 
    pausePlayback, 
    cancelRecording, 
    playRecording, 
    saveRecording, 
    startRecording 
  } = useRecording();

  switch (status) {
    case 'recording':
      return (
        <Pressable onPress={stopRecording} className="p-4 rounded-full self-center bg-gray-100">
          <StyledIonicons name="stop" size={32} className="text-red-500" />
        </Pressable>
      );
    case 'playing':
      return (
        <>
          <Pressable onPress={stopPlayback} className="p-4 rounded-full self-center bg-gray-100">
            <StyledIonicons name="stop" size={32} className="text-red-500" />
          </Pressable>
          <Pressable onPress={pausePlayback} className="p-4 rounded-full self-center bg-gray-100">
            <StyledIonicons name="pause" size={32} className="text-gray-800" />
          </Pressable>
        </>
      );
    case 'paused':
    case 'stopped':
      return (
        <>
          <Pressable onPress={() => cancelRecording()}>
            <StyledIonicons name="close" size={48} className="text-red-500" />
          </Pressable>
          <Pressable onPress={playRecording} className="p-4 rounded-full self-center bg-blue-500">
            <StyledIonicons name="play" size={32} color="white" />
          </Pressable>
          <Pressable onPress={() => saveRecording(() => router.push("./navigation"))}>
            <StyledIonicons name="checkmark-sharp" size={48} className="text-green-500" />
          </Pressable>
        </>
      );
    case 'idle':
    default:
      return (
        <>
          <Pressable onPress={() => router.push('/navigation')} className="bg-gray-100 p-4 rounded-full self-center">
            <StyledIonicons name="apps" size={32} className="text-gray-800" />
          </Pressable>
          <Pressable onPress={startRecording} className="p-4 rounded-full self-center bg-red-500">
            <StyledIonicons name="mic" size={32} color="white" />
          </Pressable>
          <Pressable onPress={() => router.push('/saved-recordings')} className="bg-gray-100 p-4 rounded-full self-center">
            <StyledIonicons name="list" size={32} className="text-gray-800" />
          </Pressable>
        </>
      );
  }
};

const formatVerseReference = (selectedBook: string | null, selectedChapter: number | null, verseRange: [number, number] | null) => {
  if(!selectedBook || !selectedChapter || !verseRange) return '';
  const chapterVerse = `${selectedBook} ${selectedChapter}`;
  if (!verseRange) return chapterVerse;
  const [start, end] = verseRange;
  if (start === end) return `${chapterVerse}:${start}`;
  return `${chapterVerse}:${start}-${end}`;
};

export default function RecordingScreen() {
  const { state: { selectedBook, selectedChapter, verseRange } } = useReferenceContext();
  const router = useRouter();
  return (
    <View className="flex-1 py-14 bg-white">
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: '#187dd9' },
          headerTintColor: '#fff',
          headerBackVisible: false,
          headerTitleStyle: {
            fontWeight: 'bold'
          },
          headerRight: () => <Pressable onPress={() => router.push('/setup')}>
            <Ionicons name="settings-outline" size={24} color="white" />
          </Pressable>
        }}
      />

      <RecordingProvider>
        <View className="flex-1 justify-center items-center">
          <Pressable className="my-5" onPress={() => router.push('/navigation')}>
            <Text className="text-2xl font-bold">
              {formatVerseReference(selectedBook, selectedChapter, verseRange)}
            </Text>
          </Pressable>
          <SoundDisplay/>
        </View>

        <View className="flex-row items-center justify-around mb-4">
          <RecordingControlPanel />
        </View>
      </RecordingProvider>
    </View>
  );
}

const TimeCounter = memo(function TimeCounter() {
  const { recording, sound } = useRecording();
  const { getFormattedDuration } = useRecordingDuration(recording, sound);
  return <Text className="text-xl text-gray-600">{getFormattedDuration()}</Text>;
});

function SoundDisplay() {
  const {recording, status} = useRecording();
  const levels = useRecordingLevels(recording, 100);

  const memoizedPlaybackWaveform = useMemo(() => {
    if (status === 'stopped' || status === 'paused' || status === 'playing') {
      return <PlaybackWaveform levels={levels} height={200} />;
    }
    return null;
  }, [status, levels]);

  return (
    <>
      <Text className="text-xl text-gray-600">
        <TimeCounter/>
      </Text>
      <View className="w-full h-52">
        {status === 'recording' && (
          <LiveRecordingWaveform
            recordingLevels={levels}
            height={200}
            barHeight={1}
          />
        )}
        {levels && memoizedPlaybackWaveform}
      </View>
    </>
  );
}
