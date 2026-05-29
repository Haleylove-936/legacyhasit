import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useStore } from '@/lib/store';
import { Fonts } from '@/lib/_core/theme';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ScrollView, Alert, Platform, Image } from 'react-native';
import { useMemo } from 'react';
import * as Haptics from 'expo-haptics';

export default function AdminDashboard() {
  const colors = useColors();
  const router = useRouter();
  const { state, deleteMemory, dispatch } = useStore();
  const { familyVault, members, memories, userRole } = state;

  const isOrganizer = userRole === 'organizer';

  const stats = useMemo(() => {
    return {
      totalStories: memories.length,
      totalMembers: members.length,
      audioStories: memories.filter(m => m.recordingType === 'audio').length,
      videoStories: memories.filter(m => m.recordingType === 'video').length,
      photoStories: memories.filter(m => m.recordingType === 'photo').length,
    };
  }, [memories, members]);

  const handleInvite = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/invite' as never);
  };

  const handleDeleteMemory = (id: string, title: string) => {
    Alert.alert(
      'Delete Memory?',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            deleteMemory(id);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  if (!isOrganizer) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedEmoji}>🔒</Text>
          <Text style={[styles.unauthorizedTitle, { color: colors.foreground }]}>Organizer Only</Text>
          <Text style={[styles.unauthorizedText, { color: colors.muted }]}>
            Only family organizers can access the admin dashboard.
          </Text>
          <Pressable 
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView 
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>← Back</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Admin Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Manage your family vault</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalStories}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Stories</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalMembers}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Members</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Quick Actions</Text>
          <Pressable 
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleInvite}
          >
            <Text style={styles.actionButtonText}>Invite New Member</Text>
          </Pressable>
        </View>

        {/* Manage Memories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Manage Stories ({memories.length})</Text>
          {memories.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.muted }]}>No stories recorded yet.</Text>
          ) : (
            memories.map(memory => (
              <View 
                key={memory.id} 
                style={[styles.memoryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.memoryInfo}>
                  <Text style={[styles.memoryTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {memory.title}
                  </Text>
                  <Text style={[styles.memoryMeta, { color: colors.muted }]}>
                    By {memory.recordedBy} · {new Date(memory.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Pressable 
                  onPress={() => handleDeleteMemory(memory.id, memory.title)}
                  style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.deleteEmoji}>🗑️</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Manage Members */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Family Members ({members.length})</Text>
          {members.map(member => (
            <View 
              key={member.id} 
              style={[styles.memberRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.memberAvatar}>
                {member.profilePictureUri ? (
                  <Image source={{ uri: member.profilePictureUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{member.name[0]}</Text>
                )}
              </View>
              <View style={styles.memoryInfo}>
                <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}</Text>
                <Text style={[styles.memberRole, { color: colors.muted }]}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 24,
  },
  header: {
    gap: 4,
  },
  backLink: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts?.display,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  memoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  memoryInfo: {
    flex: 1,
    gap: 2,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  memoryMeta: {
    fontSize: 13,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteEmoji: {
    fontSize: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  unauthorized: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  unauthorizedEmoji: {
    fontSize: 64,
  },
  unauthorizedTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  unauthorizedText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
