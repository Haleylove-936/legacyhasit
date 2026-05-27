import { ScrollView, Text, View, Pressable, FlatList, TextInput, Platform, Image } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useStore } from '@/lib/store';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Fonts } from '@/lib/_core/theme';
import { Memory, Comment } from '@/shared/app-types';
import { THEME_META } from '@/constants/prompts';
import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';

const REACTIONS = ['❤️', '😂', '😢', '👏', '🙏'];

function TimelineCard({ memory, onPress }: { memory: Memory; onPress: () => void }) {
  const colors = useColors();
  const { state } = useStore();
  const meta = THEME_META[memory.theme];
  const recordedBy = state.members.find(m => m.id === memory.recordedBy);
  const date = new Date(memory.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Reactions are stored in comments, extract unique reactions
  const reactionCounts: Record<string, number> = {};
  memory.comments?.forEach(comment => {
    Object.entries(comment.reactions || {}).forEach(([emoji]) => {
      reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
    });
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.timelineCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardMeta}>
          <Text style={styles.cardEmoji}>{meta?.emoji ?? '📖'}</Text>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
              {memory.title || 'Untitled Memory'}
            </Text>
            <Text style={[styles.cardBy, { color: colors.muted }]}>
              {recordedBy?.name || 'Unknown'} • {date}
            </Text>
          </View>
        </View>
      </View>

      {/* Photo if attached */}
      {memory.photoUri && (
        <View style={styles.cardPhoto}>
          <Image source={{ uri: memory.photoUri }} style={styles.cardPhotoImage} resizeMode="cover" />
        </View>
      )}

      {/* Notes */}
      {memory.notes && (
        <Text style={[styles.cardNotes, { color: colors.foreground }]} numberOfLines={2}>
          {memory.notes}
        </Text>
      )}

      {/* Reactions */}
      {Object.keys(reactionCounts).length > 0 && (
        <View style={styles.reactionsRow}>
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <View key={emoji} style={[styles.reactionBadge, { backgroundColor: colors.primary, opacity: 0.2 }]}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text style={[styles.reactionCount, { color: colors.primary }]}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Comments preview */}
      {memory.comments && memory.comments.length > 0 && (
        <View style={styles.commentsPreview}>
          <Text style={[styles.commentsLabel, { color: colors.muted }]}>
            {memory.comments.length} comment{memory.comments.length !== 1 ? 's' : ''}
          </Text>
          <View style={[styles.commentBubble, { backgroundColor: colors.primary, opacity: 0.1 }]}>
            {memory.comments?.[0] && (
              <>
                <Text style={[styles.commentAuthor, { color: colors.primary }]}>
                  {state.members.find(m => m.id === memory.comments?.[0]?.memberId)?.name || 'Family Member'}
                </Text>
                <Text style={[styles.commentText, { color: colors.foreground }]} numberOfLines={1}>
                  {memory.comments[0].text}
                </Text>
              </>
            )}
          </View>
        </View>
      )}

      {/* CTA */}
      <Text style={[styles.cardCTA, { color: colors.primary }]}>View & Comment →</Text>
    </Pressable>
  );
}

export default function TimelineScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state } = useStore();
  const [sortBy, setSortBy] = useState<'recent' | 'oldest'>('recent');

  const sortedMemories = useMemo(() => {
    const sorted = [...state.memories].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'recent' ? dateB - dateA : dateA - dateB;
    });
    return sorted;
  }, [state.memories, sortBy]);

  const handleMemoryPress = (memory: Memory) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/memory/[id]', params: { id: memory.id } } as never);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Family Timeline</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Memories, moments & connections
          </Text>
        </View>

        {/* Sort Controls */}
        <View style={styles.sortRow}>
          <Pressable
            style={({ pressed }) => [
              styles.sortButton,
              sortBy === 'recent' && { backgroundColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setSortBy('recent')}
          >
            <Text style={[styles.sortText, { color: sortBy === 'recent' ? '#FFFFFF' : colors.foreground }]}>
              Recent
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sortButton,
              sortBy === 'oldest' && { backgroundColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setSortBy('oldest')}
          >
            <Text style={[styles.sortText, { color: sortBy === 'oldest' ? '#FFFFFF' : colors.foreground }]}>
              Oldest
            </Text>
          </Pressable>
        </View>

        {/* Timeline */}
        {sortedMemories.length > 0 ? (
          <View style={styles.timelineList}>
            {sortedMemories.map(memory => (
              <TimelineCard
                key={memory.id}
                memory={memory}
                onPress={() => handleMemoryPress(memory)}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No memories yet</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Start recording stories to build your family timeline
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts?.display,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sortText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timelineList: {
    gap: 12,
  },
  timelineCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardMeta: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardBy: {
    fontSize: 13,
  },
  cardPhoto: {
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  cardPhotoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    fontSize: 14,
  },
  cardNotes: {
    fontSize: 15,
    lineHeight: 22,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentsPreview: {
    gap: 8,
  },
  commentsLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentBubble: {
    padding: 10,
    borderRadius: 10,
    gap: 2,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentText: {
    fontSize: 13,
  },
  cardCTA: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyState: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: Fonts?.display,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
