import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Image, Animated } from 'react-native';
import { Memory } from '@/shared/app-types';
import { useColors } from '@/hooks/use-colors';

interface PhotoSlideshowProps {
  memories: Memory[];
  autoPlay?: boolean;
  interval?: number;
  onMemorySelect?: (memory: Memory) => void;
}

/**
 * Photo Slideshow Component
 * Displays memories with photos as an automated slideshow.
 * Shows one photo at a time with smooth transitions.
 */
export function PhotoSlideshow({
  memories,
  autoPlay = true,
  interval = 3000,
  onMemorySelect,
}: PhotoSlideshowProps) {
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const fadeAnim = new Animated.Value(1);

  // Filter memories that have photos
  const memoriesWithPhotos = memories.filter(m => m.photoUri);

  useEffect(() => {
    if (!isPlaying || memoriesWithPhotos.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % memoriesWithPhotos.length);
      // Trigger fade animation
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.7, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, memoriesWithPhotos.length, interval]);

  if (memoriesWithPhotos.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.muted }]}>No photos to display</Text>
      </View>
    );
  }

  const currentMemory = memoriesWithPhotos[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev - 1 + memoriesWithPhotos.length) % memoriesWithPhotos.length);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % memoriesWithPhotos.length);
  };

  const handleTogglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Slideshow Display */}
      <Animated.View style={[styles.slideContainer, { opacity: fadeAnim }]}>
        <Image
          source={{ uri: currentMemory.photoUri }}
          style={styles.slideImage}
          resizeMode="cover"
        />

        {/* Memory Info Overlay */}
        <View style={[styles.infoOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Text style={styles.memoryTitle} numberOfLines={2}>
            {currentMemory.title}
          </Text>
          <Text style={styles.memoryDate}>
            {new Date(currentMemory.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
      </Animated.View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.6 }]}
          onPress={handlePrevious}
        >
          <Text style={styles.controlText}>⬅️</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.playButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleTogglePlayPause}
        >
          <Text style={styles.playButtonText}>{isPlaying ? '⏸️' : '▶️'}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.6 }]}
          onPress={handleNext}
        >
          <Text style={styles.controlText}>➡️</Text>
        </Pressable>
      </View>

      {/* Indicators */}
      <View style={styles.indicators}>
        {memoriesWithPhotos.map((_, index) => (
          <Pressable
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: index === currentIndex ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              setCurrentIndex(index);
              setIsPlaying(false);
            }}
          />
        ))}
      </View>

      {/* Counter */}
      <Text style={[styles.counter, { color: colors.muted }]}>
        {currentIndex + 1} / {memoriesWithPhotos.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 12,
    padding: 0,
  },
  slideContainer: {
    position: 'relative',
    height: 300,
    overflow: 'hidden',
    borderRadius: 16,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    gap: 4,
  },
  memoryTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  memoryDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  controlButton: {
    padding: 8,
    borderRadius: 8,
  },
  controlText: {
    fontSize: 24,
  },
  playButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  playButtonText: {
    fontSize: 20,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  counter: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: 40,
  },
});
