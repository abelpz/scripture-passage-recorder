import React, { useCallback, useMemo, memo } from 'react';
import { View, LayoutChangeEvent, TouchableWithoutFeedback } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { useRecording } from '@/contexts/RecordingContext';

const BAR_WIDTH = 4;
const BAR_GAP = 2;
const SILENCE_HEIGHT_RATIO = 1;
const DISPLAY_BAR_COUNT = 60;

interface LevelData {
  level: number;
  time: number;
}

interface PlaybackWaveformProps {
  height?: number;
  levels: LevelData[];
}

const processLevels = (levels: LevelData[] | null, targetCount: number): LevelData[] => {
  if (!levels || levels.length === 0) return [];
  if (levels.length === targetCount) return levels;

  const result: LevelData[] = [];
  const step = (levels.length - 1) / (targetCount - 1);

  if (levels.length > targetCount) {
    for (let i = 0; i < targetCount; i++) {
      const startIndex = Math.floor(i * step);
      const endIndex = Math.floor((i + 1) * step);
      
      let sum = 0;
      let count = 0;
      let lastTime = 0;

      for (let j = startIndex; j < endIndex && j < levels.
      length; j++) {
        sum += levels[j].level;
        count++;
        lastTime = levels[j].time;
      }

      result.push({
        level: count > 0 ? sum / count : 0,
        time: lastTime
      });
    }

    return result;
  }

  // Interpolation for when levels.length < targetCount
  for (let i = 0; i < targetCount; i++) {
    const position = i * step;
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.min(Math.ceil(position), levels.length - 1);
    
    if (lowerIndex === upperIndex) {
      result.push(levels[lowerIndex]);
    } else {
      const fraction = position - lowerIndex;
      const lowerLevel = levels[lowerIndex]?.level ?? 0;
      const upperLevel = levels[upperIndex]?.level ?? 0;
      const interpolatedLevel = lowerLevel + (upperLevel - lowerLevel) * fraction;
      
      const lowerTime = levels[lowerIndex]?.time ?? 0;
      const upperTime = levels[upperIndex]?.time ?? 0;
      const interpolatedTime = lowerTime + (upperTime - lowerTime) * fraction;

      result.push({
        level: interpolatedLevel,
        time: interpolatedTime
      });
    }
  }

  return result;
};

const SILENCE_HEIGHT = BAR_WIDTH * SILENCE_HEIGHT_RATIO;

export const PlaybackWaveform: React.FC<PlaybackWaveformProps> = memo(({ 
  height = 200,
  levels,
}) => {
  const { sound, seek } = useRecording();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [playbackPosition, setPlaybackPosition] = React.useState(0);

  

  React.useEffect(() => {
    if (sound) {
      const updatePlaybackPosition = async () => {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setPlaybackPosition(status.positionMillis / status.durationMillis);
        }
      };

      const interval = setInterval(updatePlaybackPosition, 50);
      return () => clearInterval(interval);
    }
  }, [sound]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  }, []);

  const handlePress = (event: any) => {
    if (!levels?.length || !seek || !sound) return;

    const { locationX } = event.nativeEvent;
    const progress = locationX / containerWidth;
    const totalDuration = levels[levels.length - 1].time;
    const seekTime = progress * totalDuration;

    seek(seekTime);
  };

  const memoizedDisplayLevels = useMemo(() => processLevels(levels, DISPLAY_BAR_COUNT), [levels]);

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View className="flex-1 w-full" onLayout={onLayout}>
        {containerWidth > 0 && (
          <Svg width={containerWidth} height={height} viewBox={`0 0 ${containerWidth} ${height}`}>
            {memoizedDisplayLevels.map((levelData, index) => {
              const totalBarWidth = BAR_WIDTH + BAR_GAP;
              const availableWidth = containerWidth - BAR_GAP; // Subtract one gap to ensure last bar aligns with right edge
              const x = (index / (DISPLAY_BAR_COUNT - 1)) * (availableWidth - BAR_WIDTH);
              const barHeight = Math.max(levelData.level * (height * 0.8), SILENCE_HEIGHT);
              const y = height / 2 - barHeight / 2;
              
              return (
                <Rect
                  key={index}
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={barHeight}
                  fill="#4A90E2"
                  rx={BAR_WIDTH / 2}
                  ry={BAR_WIDTH / 2}
                />
              );
            })}
            <Line
              x1={playbackPosition * containerWidth}
              y1={0}
              x2={playbackPosition * containerWidth}
              y2={height}
              stroke="#FF4136"
              strokeWidth={2}
            />
          </Svg>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
});

// Add a display name for easier debugging
PlaybackWaveform.displayName = 'PlaybackWaveform';
