import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useStore } from '@/lib/store';
import { THEME_META } from '@/constants/prompts';
import { Fonts } from '@/lib/_core/theme';
import { MemoryTheme } from '@/shared/app-types';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const THEMES: MemoryTheme[] = ['childhood', 'recipes', 'love', 'work', 'advice', 'faith'];

function ThemeCard({
  theme,
  count,
  onPress,
}: {
  theme: MemoryTheme;
  count: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const meta = THEME_META[theme];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.themeCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
    >
      <Text style={styles.themeEmoji}>{meta.emoji}</Text>
      <Text style={[styles.themeLabel, { color: colors.foreground }]}>{meta.label}</Text>
      <Text style={[styles.themeCount, { color: colors.muted }]}>
        {count} {count === 1 ? 'story' : 'stories'}
      </Text>
    </Pressable>
  );
}

export default function MemoriesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state } = useStore();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const recordingMembers = useMemo(() => {
    const members = new Map<string, string>();
    state.memories.forEach(m => {
      if (m.recordedBy && !members.has(m.recordedBy)) {
        members.set(m.recordedBy, m.recordedByMemberId || m.recordedBy);
      }
    });
    return Array.from(members.entries()).map(([name, id]) => ({ id, name }));
  }, [state.memories]);

  const filteredMemories = useMemo(() => {
    if (!selectedMemberId) return state.memories;
    return state.memories.filter(m => m.recordedBy === recordingMembers.find(rm => rm.id === selectedMemberId)?.name);
  }, [state.memories, selectedMemberId, recordingMembers]);

  const memoriesByTheme = useMemo(() => {
    const map: Record<MemoryTheme, number> = {
      childhood: 0, recipes: 0, love: 0, work: 0, advice: 0, faith: 0,
    };
    filteredMemories.forEach(m => { map[m.theme] = (map[m.theme] ?? 0) + 1; });
    return map;
  }, [filteredMemories]);

  const totalMemories = filteredMemories.length;

  const handleThemePress = (theme: MemoryTheme) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/thread/[theme]', params: { theme } } as never);
  };

  const handleAddMemory = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/record' as never);
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
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Memory Threads</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {totalMemories} {totalMemories === 1 ? 'story' : 'stories'} in the vault
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleAddMemory}
          >
            <Text style={styles.addButtonText}>+ Record</Text>
          </Pressable>
        </View>

        {/* Member Filter */}
        {recordingMembers.length > 1 && (
          <View style={styles.filterSection}>
            <Pressable
              style={({ pressed }) => [
                styles.filterChip,
                selectedMemberId === null && { backgroundColor: colors.primary },
                selectedMemberId !== null && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setSelectedMemberId(null)}
            >
              <Text style={[styles.filterChipText, selectedMemberId === null && { color: '#FFFFFF' }, selectedMemberId !== null && { color: colors.foreground }]}>
                All Members
              </Text>
            </Pressable>
            {recordingMembers.map(member => (
              <Pressable
                key={member.id}
                style={({ pressed }) => [
                  styles.filterChip,
                  selectedMemberId === member.id && { backgroundColor: colors.primary },
                  selectedMemberId !== member.id && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedMemberId(member.id)}
              >
                <Text style={[styles.filterChipText, selectedMemberId === member.id && { color: '#FFFFFF' }, selectedMemberId !== member.id && { color: colors.foreground }]}>
                  {member.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Theme Grid */}
        <View style={styles.grid}>
          {THEMES.map(theme => (
            <ThemeCard
              key={theme}
              theme={theme}
              count={memoriesByTheme[theme]}
              onPress={() => handleThemePress(theme)}
            />
          ))}
        </View>

        {/* All Memories Section */}
        {filteredMemories.length > 0 && (
          <View style={styles.allSection}>
            <Text style={[styles.allTitle, { color: colors.foreground }]}>All Stories</Text>
            {filteredMemories.map(memory => {
              const meta = THEME_META[memory.theme];
              const date = new Date(memory.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
              });
              return (
                <Pressable
                  key={memory.id}
                  style={({ pressed }) => [
                    styles.allItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => router.push({ pathname: '/memory/[id]', params: { id: memory.id } } as never)}
                >
                  <Text style={styles.allItemEmoji}>{meta?.emoji}</Text>
                  <View style={styles.allItemInfo}>
                    <Text style={[styles.allItemTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {memory.title}
                    </Text>
                    <Text style={[styles.allItemMeta, { color: colors.muted }]}>
                      {meta?.label} · {date}
                    </Text>
                  </View>
                  <Text style={[styles.allItemChevron, { color: colors.muted }]}>›</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {totalMemories === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>The vault is empty</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Start recording stories to fill these memory threads. Every story is a treasure.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.emptyButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleAddMemory}
            >
              <Text style={styles.emptyButtonText}>Record First Story</Text>
            </Pressable>
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
    paddingBottom: 48,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts?.display,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    width: '47%',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  themeEmoji: {
    fontSize: 36,
  },
  themeLabel: {
    fontSize: 16,
    fontFamily: Fonts?.display,
    textAlign: 'center',
  },
  themeCount: {
    fontSize: 13,
  },
  allSection: {
    gap: 12,
  },
  allTitle: {
    fontSize: 22,
    fontFamily: Fonts?.display,
  },
  allItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 0,
  },
  allItemEmoji: {
    fontSize: 24,
  },
  allItemInfo: {
    flex: 1,
    gap: 3,
  },
  allItemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  allItemMeta: {
    fontSize: 13,
  },
  allItemChevron: {
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
  emptyButton: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  filterSection: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
