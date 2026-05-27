import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useStore } from '@/lib/store';
import { getDailyPrompt, THEME_META } from '@/constants/prompts';
import { Fonts } from '@/lib/_core/theme';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ScrollView, FlatList, Image, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Memory } from '@/shared/app-types';
import { useMemo, useEffect, useState } from 'react';
import { hasPromptBeenDeliveredToday, markPromptAsDelivered } from '@/lib/prompt-scheduler';
import { StoryHighlightsCarousel } from '@/components/story-highlights-carousel';

function MemoryCard({ memory, onPress }: { memory: Memory; onPress: () => void }) {
  const colors = useColors();
  const meta = THEME_META[memory.theme];
  const date = new Date(memory.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.memoryCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
      onPress={onPress}
    >
      <Text style={styles.memoryEmoji}>{meta?.emoji ?? '📖'}</Text>
      <View style={styles.memoryInfo}>
        <Text style={[styles.memoryTitle, { color: colors.foreground }]} numberOfLines={1}>
          {memory.title}
        </Text>
        <Text style={[styles.memoryDate, { color: colors.muted }]}>{date}</Text>
      </View>
      <Text style={[styles.memoryType, { color: colors.muted }]}>
        {memory.recordingType === 'audio' ? '🎙️' : memory.recordingType === 'video' ? '🎥' : '📝'}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, markPromptDelivered } = useStore();
  const [showReminder, setShowReminder] = useState(false);

  const { userName, memories, currentPromptIndex, userRole, lastPromptDeliveredDate } = state;
  const isElder = userRole === 'elder';

  const todaysPrompt = useMemo(() => getDailyPrompt(currentPromptIndex), [currentPromptIndex]);
  const themeMeta = THEME_META[todaysPrompt.theme];
  const recentMemories = useMemo(() => memories.slice(0, 5), [memories]);

  // Check if we should show the daily reminder banner
  useEffect(() => {
    const alreadyDelivered = hasPromptBeenDeliveredToday(lastPromptDeliveredDate);
    setShowReminder(!alreadyDelivered);
  }, [lastPromptDeliveredDate]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleRecordAnswer = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/record', params: { promptId: todaysPrompt.id, promptText: todaysPrompt.text, theme: todaysPrompt.theme } } as never);
  };

  const handleViewMemory = (memory: Memory) => {
    router.push({ pathname: '/memory/[id]', params: { id: memory.id } } as never);
  };

  const handleDismissReminder = () => {
    markPromptDelivered(markPromptAsDelivered());
    setShowReminder(false);
  };

  // ELDER INTERFACE: Huge buttons, minimal clutter
  if (isElder) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={[styles.elderContainer, { backgroundColor: 'transparent' }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting */}
          <Text style={[styles.elderGreeting, { color: colors.foreground }]}>{greeting}, {userName}!</Text>

          {/* Today's Prompt */}
          <View style={[styles.elderPromptBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.elderPromptLabel, { color: colors.muted }]}>Today's Question</Text>
            <Text style={[styles.elderPromptText, { color: colors.foreground }]}>{todaysPrompt.text}</Text>
          </View>

          {/* HUGE Record Button */}
          <Pressable
            style={({ pressed }) => [
              styles.elderRecordButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleRecordAnswer}
          >
            <Text style={styles.elderRecordEmoji}>🎙️</Text>
            <Text style={styles.elderRecordText}>Answer Question</Text>
          </Pressable>

          {/* Upload Button for Elders */}
          <Pressable
            style={({ pressed }) => [
              styles.elderUploadButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.push({ pathname: '/record', params: { mode: 'upload' } } as never)}
          >
            <Text style={styles.elderUploadEmoji}>🖼️</Text>
            <Text style={[styles.elderUploadText, { color: colors.foreground }]}>Upload from My Phone</Text>
          </Pressable>

          {/* Recent Memories */}
          {recentMemories.length > 0 && (
            <View style={styles.elderRecentSection}>
              <Text style={[styles.elderRecentTitle, { color: colors.foreground }]}>Recent Stories</Text>
              <FlatList
                data={recentMemories}
                keyExtractor={m => m.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <MemoryCard memory={item} onPress={() => handleViewMemory(item)} />
                )}
              />
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ORGANIZER/RELATIVE INTERFACE: Standard layout
  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily Reminder Banner */}
        {showReminder && (
          <View style={[styles.reminderBanner, { backgroundColor: colors.accent || colors.primary }]}>
            <View style={styles.reminderContent}>
              <Text style={styles.reminderEmoji}>⏰</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderTitle}>Time to Record</Text>
                <Text style={styles.reminderText}>Share today's story</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.reminderClose, pressed && { opacity: 0.6 }]}
              onPress={handleDismissReminder}
            >
              <Text style={styles.reminderCloseText}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>{greeting},</Text>
            <Text style={[styles.name, { color: colors.foreground }]}>{userName || 'Friend'}</Text>
          </View>
          <View style={[styles.vaultBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.vaultText, { color: colors.primary }]}>📖 {state.familyVault?.name ?? 'Family Vault'}</Text>
          </View>
        </View>

        {/* Today's Prompt Card */}
        <View style={[styles.promptCard, { backgroundColor: colors.primary }]}>
          <View style={styles.promptBadge}>
            <Text style={styles.promptBadgeText}>{themeMeta?.emoji} {themeMeta?.label}</Text>
          </View>
          <Text style={styles.promptLabel}>Today's Question</Text>
          <Text style={styles.promptText}>{todaysPrompt.text}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.recordButton,
              { backgroundColor: '#FFFFFF' },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleRecordAnswer}
          >
            <Text style={[styles.recordButtonText, { color: colors.primary }]}>
              🎙️ Record My Answer
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.skipLink, pressed && { opacity: 0.6 }]}
            onPress={() => router.push('/record' as never)}
          >
            <Text style={styles.skipText}>or record a different story</Text>
          </Pressable>
        </View>

        {/* Story Highlights Carousel */}
        {recentMemories.length > 0 && (
          <StoryHighlightsCarousel
            memories={memories}
            onSelectMemory={handleViewMemory}
          />
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{memories.length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Stories</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {state.members.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Members</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {memories.reduce((s, m) => s + (m.durationSeconds ?? 0), 0) > 0
                ? `${Math.round(memories.reduce((s, m) => s + (m.durationSeconds ?? 0), 0) / 60)}m`
                : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Recorded</Text>
          </View>
        </View>

        {/* Recent Memories */}
        {recentMemories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Stories</Text>
              <Pressable onPress={() => router.push('/(tabs)/memories' as never)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </Pressable>
            </View>
            {recentMemories.map(memory => (
              <MemoryCard key={memory.id} memory={memory} onPress={() => handleViewMemory(memory)} />
            ))}
          </View>
        )}

        {/* Empty state */}
        {memories.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your vault is ready</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Record your first story by answering today's question above. Every story matters.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Fonts?.display,
  },
  name: {
    fontSize: 32,
    fontFamily: Fonts?.display,
  },
  vaultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 160,
  },
  vaultText: {
    fontSize: 13,
    fontWeight: '600',
  },
  promptCard: {
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  promptBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  promptBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  promptLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  promptText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: Fonts?.display,
    lineHeight: 30,
  },
  recordButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  recordButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Fonts?.display,
  },
  seeAll: {
    fontSize: 15,
    fontWeight: '600',
  },
  memoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  memoryEmoji: {
    fontSize: 28,
  },
  memoryInfo: {
    flex: 1,
    gap: 2,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  memoryDate: {
    fontSize: 13,
  },
  memoryType: {
    fontSize: 20,
  },
  emptyState: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: Fonts?.display,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  reminderEmoji: {
    fontSize: 24,
  },
  reminderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reminderText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  reminderClose: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
   reminderCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // Elder Interface Styles
  elderContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 60,
    gap: 32,
  },
  elderGreeting: {
    fontSize: 48,
    fontFamily: Fonts?.display,
    fontWeight: '700',
    textAlign: 'center',
  },
  elderPromptBox: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    gap: 12,
  },
  elderPromptLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  elderPromptText: {
    fontSize: 28,
    fontFamily: Fonts?.display,
    fontWeight: '700',
    lineHeight: 38,
  },
  elderRecordButton: {
    borderRadius: 20,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  elderRecordEmoji: {
    fontSize: 72,
  },
  elderRecordText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: Fonts?.display,
    fontWeight: '700',
  },
  elderUploadButton: {
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 16,
    borderWidth: 2,
  },
  elderUploadEmoji: {
    fontSize: 32,
  },
  elderUploadText: {
    fontSize: 20,
    fontWeight: '700',
  },
  elderRecentSection: {
    gap: 16,
  },
  elderRecentTitle: {
    fontSize: 24,
    fontFamily: Fonts?.display,
    fontWeight: '700',
  },
});
