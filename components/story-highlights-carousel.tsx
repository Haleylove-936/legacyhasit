import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Image } from 'react-native';
import { Memory } from '@/shared/app-types';
import { THEME_META } from '@/constants/prompts';
import { useColors } from '@/hooks/use-colors';
import { Fonts } from '@/lib/_core/theme';

interface StoryHighlightsCarouselProps {
  memories: Memory[];
  onSelectMemory: (memory: Memory) => void;
}

/**
 * Story Highlights Carousel Component
 * Shows a rotating carousel of featured memories on the home screen.
 * Displays memories from a year ago or the most commented/reacted stories.
 */
export function StoryHighlightsCarousel({ memories, onSelectMemory }: StoryHighlightsCarouselProps) {
  const colors = useColors();

  // Get featured memories: prioritize memories from 1 year ago, then most-reacted
  const highlightedMemories = useMemo(() => {
    if (memories.length === 0) return [];

    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Find memories from around 1 year ago (within 30 days)
    const anniversaryMemories = memories.filter(m => {
      const memDate = new Date(m.createdAt);
      const daysDiff = Math.abs(memDate.getTime() - oneYearAgo.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    });

    if (anniversaryMemories.length > 0) {
      return anniversaryMemories.slice(0, 3);
    }

    // Fallback: show most-reacted or most-commented stories
    const sortedByEngagement = [...memories].sort((a, b) => {
      const aEngagement = (a.comments?.length ?? 0) + Object.values(a.comments?.[0]?.reactions ?? {}).flat().length;
      const bEngagement = (b.comments?.length ?? 0) + Object.values(b.comments?.[0]?.reactions ?? {}).flat().length;
      return bEngagement - aEngagement;
    });

    return sortedByEngagement.slice(0, 3);
  }, [memories]);

  if (highlightedMemories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>✨ Story Highlights</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        {highlightedMemories.map((memory, index) => (
          <HighlightCard
            key={memory.id}
            memory={memory}
            onPress={() => onSelectMemory(memory)}
            colors={colors}
            isFirst={index === 0}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface HighlightCardProps {
  memory: Memory;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  isFirst?: boolean;
}

function HighlightCard({ memory, onPress, colors, isFirst }: HighlightCardProps) {
  const themeMeta = THEME_META[memory.theme];
  const date = new Date(memory.createdAt);
  const isAnniversary = isAnniversaryMemory(date);

  // Determine if this is a memory from a year ago
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });

  const engagementCount = (memory.comments?.length ?? 0) + 
    Object.values(memory.comments?.[0]?.reactions ?? {}).flat().length;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isFirst && { marginLeft: 20 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
    >
      {/* Photo Background (if available) */}
      {memory.photoUri && (
        <Image
          source={{ uri: memory.photoUri }}
          style={styles.cardBackground}
        />
      )}

      {/* Overlay */}
      <View style={[styles.cardOverlay, { backgroundColor: memory.photoUri ? 'rgba(0,0,0,0.4)' : 'transparent' }]} />

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Anniversary Badge */}
        {isAnniversary && (
          <View style={[styles.anniversaryBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.anniversaryText}>🎂 1 Year Ago</Text>
          </View>
        )}

        {/* Theme Badge */}
        <View style={[styles.themeBadge, { backgroundColor: colors.primary + '90' }]}>
          <Text style={styles.themeBadgeText}>{themeMeta?.emoji} {themeMeta?.label}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.cardTitle, { color: '#FFFFFF' }]} numberOfLines={2}>
          {memory.title}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>{formattedDate}</Text>
          {engagementCount > 0 && (
            <View style={styles.engagementBadge}>
              <Text style={styles.engagementText}>💬 {engagementCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Check if a memory is from approximately 1 year ago
 */
function isAnniversaryMemory(date: Date): boolean {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const daysDiff = Math.abs(date.getTime() - oneYearAgo.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 30;
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts?.display,
    fontWeight: '700',
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingRight: 20,
  },
  card: {
    width: 280,
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  anniversaryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  anniversaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  themeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  themeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Fonts?.display,
    fontWeight: '700',
    lineHeight: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  engagementBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  engagementText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
