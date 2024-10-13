import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useLiveWaveformLevels } from '../hooks/useLiveWaveformLevels';
import { LevelData } from '@/hooks/useRecordingLevels';

const { width: screenWidth } = Dimensions.get('window');
const BAR_COUNT = 60;
const BAR_WIDTH = 4;
const BAR_GAP = 2;
const SILENCE_HEIGHT_RATIO = 1;

interface LiveRecordingWaveformProps {
  recordingLevels: LevelData[];
  height?: number;
  barHeight?: number;
}

export const LiveRecordingWaveform: React.FC<LiveRecordingWaveformProps> = ({ 
  recordingLevels,
  height = 200,
  barHeight = 1,
}) => {
  const displayLevels = useLiveWaveformLevels(recordingLevels);
  const barHeightMultiplier = barHeight;
  const silenceHeight = BAR_WIDTH * SILENCE_HEIGHT_RATIO;

  return (
    <View className="flex-1 w-full px-4 py-2">
      <Svg width="100%" height={height} viewBox={`0 0 ${screenWidth} ${height}`}>
        {displayLevels.map((level, index) => {
          const x = index * (BAR_WIDTH + BAR_GAP);
          const barHeight = Math.max(level * (height * 0.9) * barHeightMultiplier, silenceHeight);
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
      </Svg>
    </View>
  );
};