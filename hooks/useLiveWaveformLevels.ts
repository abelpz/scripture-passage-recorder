import { useState, useEffect } from 'react';
import { LevelData } from './useRecordingLevels';

const BAR_COUNT = 60;

export const useLiveWaveformLevels = (
  recordingLevels: LevelData[],
  startFromCenter: boolean = false
): number[] => {
  const [displayLevels, setDisplayLevels] = useState<number[]>(
    Array(BAR_COUNT).fill(0)
  );

  useEffect(() => {
    if (recordingLevels.length > 0) {
      setDisplayLevels(prevLevels => {
        if (startFromCenter) {
          return [
            ...prevLevels.slice(1, BAR_COUNT / 2),
            recordingLevels[recordingLevels.length - 1].level,
            ...prevLevels.slice(BAR_COUNT / 2, -1),
            0 // Add a silence bar at the end
          ];
        } else {
          return [
            ...prevLevels.slice(1),
            recordingLevels[recordingLevels.length - 1].level,
          ];
        }
      });
    }
  }, [recordingLevels, startFromCenter]);

  return displayLevels;
};
