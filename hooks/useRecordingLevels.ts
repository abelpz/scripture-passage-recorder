import { useState, useEffect, useRef, useMemo } from 'react';
import { Audio } from 'expo-av';


export interface LevelData {
  level: number;
  time: number;
}

export const useRecordingLevels = (recording: Audio.Recording | null, updateInterval: number = 100) => {
  const [levels, setLevels] = useState<LevelData[]>([]);
  const recordingStartTime = useRef(0);
  const levelBuffer = useRef<LevelData[]>([]);
  const lastLevel = useRef(0);
  const intervalsRef = useRef<{ update: NodeJS.Timeout | null; flush: NodeJS.Timeout | null }>({ update: null, flush: null });

  useEffect(() => {
    if (!recording) {
      setLevels([]);
      levelBuffer.current = [];
      lastLevel.current = 0;
      return;
    }

    const SILENCE_HEIGHT = 0;
    const NOISE_GATE = -50;
    recordingStartTime.current = Date.now();

    const updateLevels = async () => {
      const status = await recording.getStatusAsync();
      if (status.isRecording) {
        const { metering = -160 } = status;


        let normalizedMetering = Math.max(SILENCE_HEIGHT, Math.min(1, (metering + 160) / 160));
        lastLevel.current = normalizedMetering;

        levelBuffer.current.push({ 
          level: normalizedMetering, 
          time: Date.now() - recordingStartTime.current 
        });
      } else {
        clearIntervals();
      }
    };

    const flushLevels = () => {
      if (levelBuffer.current.length > 0) {
        setLevels(prevLevels => [...prevLevels, ...levelBuffer.current]);
        levelBuffer.current = [];
      }
    };

    const clearIntervals = () => {
      if (intervalsRef.current.update) clearInterval(intervalsRef.current.update);
      if (intervalsRef.current.flush) clearInterval(intervalsRef.current.flush);
      intervalsRef.current = { update: null, flush: null };
    };

    intervalsRef.current.update = setInterval(updateLevels, 100); // Update more frequently
    intervalsRef.current.flush = setInterval(flushLevels, updateInterval); // Flush less frequently

    return clearIntervals;
  }, [recording, updateInterval]);

  const memoizedLevels = useMemo(() => levels, [levels]);

  return memoizedLevels;
};
