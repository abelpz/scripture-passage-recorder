import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, LayoutChangeEvent, Dimensions, TouchableWithoutFeedback } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { Audio, AVPlaybackStatus } from 'expo-av';

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const SILENCE_HEIGHT_RATIO = 0.1;
const UPDATE_INTERVAL = 50; // 50ms update interval

interface LevelData {
  level: number;
  time: number;
}

interface PlaybackWaveformProps {
  sound: Audio.Sound;
  isPlaying: boolean;
  height?: number;
  levels: LevelData[];
  onSeek?: (position: number) => void;
}

export const PlaybackWaveform: React.FC<PlaybackWaveformProps> = ({ 
  sound,
  isPlaying,
  height = 200,
  levels,
  onSeek
}) => {
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(error => {
          console.error('Error unloading sound in cleanup:', error);
        });
      }
    };
  }, [sound]);

  useEffect(() => {
    if (isPlaying && soundRef.current) {
      soundRef.current.playAsync().catch(error => {
        console.error('Error playing sound:', error);
      });
    } else if (soundRef.current) {
      soundRef.current.pauseAsync().catch(error => {
        console.error('Error pausing sound:', error);
      });
    }
  }, [isPlaying]);

  const loadSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.error('Error unloading previous sound:', error);
      }
    }

    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        console.error('Sound is not loaded');
        return;
      }

      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.durationMillis) {
      const { positionMillis, durationMillis } = status;
      const progress = positionMillis / durationMillis;
      setPlaybackPosition(progress);
    }
  };

  useEffect(() => {
    if (sound) {
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    }
    return () => {
      if (sound) {
        sound.setOnPlaybackStatusUpdate(null);
      }
    };
  }, [sound]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  }, []);

  const handlePress = (event: any) => {
    if (!levels?.length || !onSeek || !sound) return;

    const { locationX } = event.nativeEvent;
    const progress = locationX / containerWidth;
    const totalDuration = levels[levels.length - 1].time;
    const seekTime = progress * totalDuration;

    onSeek(seekTime);
  };

  const silenceHeight = BAR_WIDTH * SILENCE_HEIGHT_RATIO;

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View className="flex-1 w-full" onLayout={onLayout}>
        {containerWidth > 0 && (
          <Svg width={containerWidth} height={height} viewBox={`0 0 ${containerWidth} ${height}`}>
            {levels.map((levelData, index) => {
              const x = (index / levels.length) * containerWidth;
              const barHeight = Math.max(levelData.level * (height * 0.8), silenceHeight);
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
};