import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

const UPDATE_INTERVAL = 50; // Update every 50ms for smoother animation
const SILENCE_HEIGHT = 0;

export interface LevelData {
  level: number;
  time: number;
}

export const useRecordingLevels = (
  isRecording: boolean,
  recording: Audio.Recording | null,
  dramaticFactor: number = 2
) => {
  const [levels, setLevels] = useState<LevelData[]>([]);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTime = useRef(0);
  const recordingStartTime = useRef(0);
  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    if (isRecording) {
      recordingStartTime.current = Date.now();
      animateRecordingBars();
    } else {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isRecording]);

  const animateRecordingBars = async () => {
    if (!isRecordingRef.current || !recording) {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      return;
    }

    const currentTime = Date.now();
    if (currentTime - lastUpdateTime.current >= UPDATE_INTERVAL) {
      try {
        const status = await recording.getStatusAsync();
        if (status.canRecord) {
          const metering = (status as any).metering ?? -160;
          const normalizedMetering = Math.max(SILENCE_HEIGHT, Math.min(1, (metering + 160) / 160));
          
          const dramaticMetering = Math.pow(normalizedMetering, dramaticFactor);
          const timeInMillis = currentTime - recordingStartTime.current;

          setLevels(prevLevels => [...prevLevels, { level: dramaticMetering, time: timeInMillis }]);

          lastUpdateTime.current = currentTime;
        }
      } catch (error) {
        console.warn('Error getting recording status:', error);
        // If there's an error, we'll stop trying to animate
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
        return;
      }
    }

    animationRef.current = setTimeout(animateRecordingBars, 16);
  };

  const resetLevels = useCallback(() => {
    setLevels([]);
  }, []);

  return { levels, resetLevels };
};