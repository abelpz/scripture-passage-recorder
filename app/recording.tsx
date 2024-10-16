import React, { useState, useRef, useMemo, useCallback, memo } from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import { useReferenceContext, useSetupContext } from '../contexts/AppContext';
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
          <Pressable onPress={() => saveRecording()}>
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

const VerseRangeControl = () => {
  const { state: { selectedBook, selectedChapter, verseRange }, setVerseRange } = useReferenceContext();
  const router = useRouter();
  const { state: { versificationSchema } } = useSetupContext();
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStartTimeRef = useRef(0);

  const maxVerse = versificationSchema?.maxVerses[selectedBook!]?.[selectedChapter! - 1] || 1;

  const canExpand = useMemo(() => verseRange && verseRange[1] < maxVerse, [verseRange, maxVerse]);
  const canShrink = useMemo(() => verseRange && verseRange[1] > verseRange[0], [verseRange]);
  const canMovePrev = useMemo(() => verseRange && verseRange[0] > 1, [verseRange]);
  const canMoveNext = useMemo(() => verseRange && verseRange[1] < maxVerse, [verseRange, maxVerse]);

  const updateRange = useCallback((increment: boolean, amount: number) => {
    if (verseRange) {
      const [start, end] = verseRange;
      const newEnd = increment
        ? Math.min(end + amount, maxVerse)
        : Math.max(end - amount, start);
      if (newEnd !== end) {
        setVerseRange([start, newEnd]);
      }
    }
  }, [verseRange, setVerseRange, maxVerse]);

  const handleLongPress = useCallback((increment: boolean) => {
    const elapsedTime = (Date.now() - longPressStartTimeRef.current) / 1000;
    const amount = Math.floor(Math.min(1 + elapsedTime * elapsedTime * 3, 200));
    updateRange(increment, amount);
  }, [updateRange]);

  const startLongPress = useCallback((increment: boolean) => {
    if ((increment && canExpand) || (!increment && canShrink)) {
      setIsLongPressing(true);
      longPressStartTimeRef.current = Date.now();
      longPressTimerRef.current = setInterval(() => handleLongPress(increment), 50);
    }
  }, [handleLongPress, canExpand, canShrink]);

  const endLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearInterval(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);


  const handlePress = useCallback((increment: boolean) => {
    if (!isLongPressing) {
      updateRange(increment, 1);
    }
  }, [isLongPressing, updateRange]);

  const moveToNextVerse = useCallback(() => {
    if (canMoveNext) {
      const [start, end] = verseRange!;
      const newStart = end + 1;
      setVerseRange([newStart, newStart]);
    }
  }, [verseRange, setVerseRange, maxVerse, canMoveNext]);

  const moveToPreviousVerse = useCallback(() => {
    if (canMovePrev) {
      const [start, end] = verseRange!;
      const newEnd = start - 1;
      setVerseRange([newEnd, newEnd]);
    }
  }, [verseRange, setVerseRange, canMovePrev]);

  return (
    <>
    <View className="flex-row items-center justify-center">
     <Pressable className="mx-2" onPress={() => router.push('/navigation')}>
        <Text className="text-2xl font-bold">
          {formatVerseReference(selectedBook, selectedChapter, verseRange)}
        </Text>
      </Pressable>
    </View>
    <View className="flex-row items-center justify-center p-8 gap-4">
      <TouchableOpacity 
        onPress={moveToPreviousVerse} 
        className="p-4 rounded-full self-center bg-gray-100"
        style={{ opacity: canMovePrev ? 1 : 0.5 }}
        disabled={!canMovePrev}
      >
        <StyledIonicons name="chevron-back" size={24} className="text-blue-500" />
      </TouchableOpacity>
      <TouchableOpacity 
        onLongPress={() => startLongPress(false)}
        onPressOut={endLongPress}
        onPress={() => handlePress(false)}
        className="p-4 rounded-full self-center bg-gray-100"
        style={{ opacity: canShrink ? 1 : 0.5 }}
        disabled={!canShrink}
      >
        <StyledIonicons name="remove" size={24} className="text-blue-500" />
      </TouchableOpacity>
     
      <TouchableOpacity 
        onLongPress={() => startLongPress(true)}
        onPressOut={endLongPress}
        onPress={() => handlePress(true)}
        className="p-4 rounded-full self-center bg-gray-100"
        style={{ opacity: canExpand ? 1 : 0.5 }}
        disabled={!canExpand}
      >
        <StyledIonicons name="add" size={24} className="text-blue-500" />
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={moveToNextVerse} 
        className="p-4 rounded-full self-center bg-gray-100"
        style={{ opacity: canMoveNext ? 1 : 0.5 }}
        disabled={!canMoveNext}
      >
        <StyledIonicons name="chevron-forward" size={24} className="text-blue-500" />
      </TouchableOpacity>
    </View>
    </>
  );
};

const useLongPress = (callback: () => void, ms = 100) => {
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current === null) {
      intervalRef.current = setInterval(callback, ms);
    }
  }, [callback, ms]);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    onPressIn: start,
    onPressOut: stop,
  };
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
          <VerseRangeControl />
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