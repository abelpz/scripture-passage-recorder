import { useState, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';

export const useRecordingDuration = (recording: Audio.Recording | null, sound: Audio.Sound | null) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if(!sound && !recording) setDuration(0);

    const updateDuration = async () => {
      if (recording) {
        const status = await recording.getStatusAsync();
        if (status.isRecording) {
          setDuration(status.durationMillis || 0);
        }
      } else if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setDuration(status.positionMillis || 0);
        }
      }
    };

    intervalId = setInterval(updateDuration, 100);

    return () => clearInterval(intervalId);
  }, [recording, sound]);

  const getFormattedDuration = useCallback(() => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [duration]);

  return { duration, getFormattedDuration };
};
