import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

const BAR_COUNT = 60;
const UPDATE_INTERVAL = 50; // Update every 50ms for smoother animation
const SILENCE_HEIGHT = 0; // We'll use 0 here and handle the minimum height in the Waveform component

export const useAudioWaveform = (
  isRecording: boolean,
  recording: Audio.Recording | null,
  sound: Audio.Sound | null,
  isPlaying: boolean,
  dramaticFactor: number = 2
) => {
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(SILENCE_HEIGHT));
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTime = useRef(0);
  const playbackPositionRef = useRef(0);

  useEffect(() => {
    if (isRecording) {
      animateRecordingBars();
    } else if (isPlaying && sound) {
      animatePlaybackBars();
    } else {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      // Reset to silence bars when not recording or playing
      setLevels(Array(BAR_COUNT).fill(SILENCE_HEIGHT));
    }
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isRecording, isPlaying, sound]);

  const animateRecordingBars = async () => {
    if (!isRecording || !recording) return;

    const currentTime = Date.now();
    if (currentTime - lastUpdateTime.current >= UPDATE_INTERVAL) {
      try {
        const status = await recording.getStatusAsync();
        const metering = (status as any).metering ?? -160;
        const normalizedMetering = Math.max(SILENCE_HEIGHT, Math.min(1, (metering + 160) / 160));
        
        const dramaticMetering = Math.pow(normalizedMetering, dramaticFactor);

        setLevels(prevLevels => {
          const newLevels = [
            ...prevLevels.slice(1, BAR_COUNT / 2),
            dramaticMetering,
            ...prevLevels.slice(BAR_COUNT / 2, -1),
            SILENCE_HEIGHT // Add a silence bar at the end
          ];
          return newLevels;
        });

        lastUpdateTime.current = currentTime;
      } catch (error) {
        console.error('Error getting recording status:', error);
      }
    }

    animationRef.current = setTimeout(animateRecordingBars, 16);
  };

  const animatePlaybackBars = async () => {
    if (!isPlaying || !sound) return;

    const currentTime = Date.now();
    if (currentTime - lastUpdateTime.current >= UPDATE_INTERVAL) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          const { positionMillis, durationMillis } = status;
          const progress = positionMillis / durationMillis;
          playbackPositionRef.current = Math.floor(progress * BAR_COUNT);

          setLevels(prevLevels => {
            const newLevels = [...prevLevels];
            newLevels[playbackPositionRef.current] = Math.max(prevLevels[playbackPositionRef.current], 0.1); // Set the current position to a slightly higher level
            return newLevels;
          });

          lastUpdateTime.current = currentTime;
        }
      } catch (error) {
        console.error('Error getting sound status:', error);
      }
    }

    animationRef.current = setTimeout(animatePlaybackBars, 16);
  };

  return { levels, playbackPosition: playbackPositionRef.current };
};