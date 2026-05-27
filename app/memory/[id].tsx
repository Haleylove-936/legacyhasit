import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useStore } from '@/lib/store';
import { THEME_META } from '@/constants/prompts';
import { Fonts } from '@/lib/_core/theme';
import { Comment } from '@/shared/app-types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Alert, Share, Platform,
  TextInput, KeyboardAvoidingView, Image,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';

const EMOJI_REACTIONS = ['❤️', '😢', '😂', '👏', '🙏'];

export default function MemoryDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id, justSaved } = useLocalSearchParams<{ id: string; justSaved?: string }>();
  const { state, deleteMemory, addComment, toggleReaction } = useStore();
  const [commentText, setCommentText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const memory = state.memories.find(m => m.id === id);
  const themeMeta = memory ? THEME_META[memory.theme] : null;

  // current user is always the first member (the one who onboarded)
  const currentMember = state.members[0];

  const player = useAudioPlayer(memory?.fileUri && memory.recordingType === 'audio' ? { uri: memory.fileUri } : null);
  const status = useAudioPlayerStatus(player);

  const videoPlayer = useVideoPlayer(memory?.fileUri && memory.recordingType === 'video' ? memory.fileUri : null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
    return () => {
      player.release();
    };
  }, []);

  if (!memory) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 18 }}>Memory not found.</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontSize: 17 }}>← Go back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const isPlaying = status.playing;
  const duration = status.duration ?? 0;
  const currentTime = status.currentTime ?? 0;
  const progress = duration > 0 ? currentTime / duration : 0;
  const comments = memory.comments ?? [];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      player.pause();
    } else {
      if (currentTime >= duration && duration > 0) player.seekTo(0);
      player.play();
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `"${memory.title}"\n\n${memory.transcript ?? memory.promptText ?? ''}\n\n— Shared from LegacyBox`,
        title: memory.title,
      });
    } catch {}
  };

  const handleDelete = () => {
    Alert.alert('Delete Story?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => { deleteMemory(memory.id); router.back(); },
      },
    ]);
  };

  const handlePostComment = () => {
    const text = commentText.trim();
    if (!text || !currentMember) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const comment: Comment = {
      id: Date.now().toString(),
      memberId: currentMember.id,
      text,
      timestamp: new Date().toISOString(),
      reactions: {},
    };
    addComment(memory.id, comment);
    setCommentText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleReaction = (commentId: string, emoji: string) => {
    if (!currentMember) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleReaction(memory.id, commentId, emoji, currentMember.id);
  };

  const getMember = (memberId?: string) => {
    if (!memberId) return null;
    return state.members.find(m => m.id === memberId) || null;
  };

  const getMemberName = (memberId: string) => {
    return getMember(memberId)?.name ?? 'Family Member';
  };

  const date = new Date(memory.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
            </Pressable>
            <View style={styles.topActions}>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surface }, pressed && { opacity: 0.6 }]}
                onPress={handleShare}
              >
                <Text style={styles.iconBtnEmoji}>↗️</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surface }, pressed && { opacity: 0.6 }]}
                onPress={handleDelete}
              >
                <Text style={styles.iconBtnEmoji}>🗑️</Text>
              </Pressable>
            </View>
          </View>

          {/* Just Saved Banner */}
          {justSaved === '1' && (
            <View style={[styles.savedBanner, { backgroundColor: colors.success }]}>
              <Text style={styles.savedBannerText}>✨ Story saved to your family vault!</Text>
            </View>
          )}

          {/* Theme Badge + Date */}
          <View style={styles.metaRow}>
            <View style={[styles.themeBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.themeBadgeText, { color: colors.primary }]}>
                {themeMeta?.emoji} {themeMeta?.label}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: colors.muted }]}>{date}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>{memory.title}</Text>

          {/* Photo */}
          {memory.photoUri && (
            <View style={[styles.photoContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>📷</Text>
                <Text style={[styles.photoPlaceholderLabel, { color: colors.muted }]}>Photo attached</Text>
              </View>
            </View>
          )}

          {/* Original Prompt */}
          {memory.promptText && (
            <View style={[styles.promptBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.promptLabel, { color: colors.muted }]}>Original question</Text>
              <Text style={[styles.promptText, { color: colors.foreground }]}>{memory.promptText}</Text>
            </View>
          )}

          {/* Audio Player */}
          {memory.fileUri && memory.recordingType === 'audio' && (
            <View style={[styles.playerCard, { backgroundColor: colors.primary }]}>
              <View style={styles.playerTop}>
                <Text style={styles.playerTitle}>🎙️ Voice Recording</Text>
                <Text style={styles.playerDuration}>
                  {formatTime(currentTime)} / {formatTime(memory.durationSeconds ?? duration)}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Pressable
                style={({ pressed }) => [styles.playPauseButton, { backgroundColor: '#FFFFFF' }, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}
                onPress={handlePlayPause}
              >
                <Text style={[styles.playPauseText, { color: colors.primary }]}>
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Video Player */}
          {memory.fileUri && memory.recordingType === 'video' && (
            <View style={[styles.videoContainer, { backgroundColor: '#000', borderColor: colors.border }]}>
              <VideoView
                player={videoPlayer}
                style={styles.videoPlayer}
                allowsFullscreen
                allowsPictureInPicture
              />
            </View>
          )}

          {/* Transcript / Notes */}
          {(memory.transcript || memory.notes) && (
            <View style={[styles.transcriptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.transcriptLabel, { color: colors.muted }]}>
                {memory.transcript ? 'Transcript' : 'Notes'}
              </Text>
              <Text style={[styles.transcriptText, { color: colors.foreground }]}>
                {memory.transcript ?? memory.notes}
              </Text>
            </View>
          )}

          {/* Recorded By */}
          <View style={styles.recordedByContainer}>
            <View style={[styles.recordedByAvatar, { backgroundColor: colors.primary }, getMember(memory.recordedByMemberId)?.profilePictureUri && { backgroundColor: 'transparent' }]}>
              {getMember(memory.recordedByMemberId)?.profilePictureUri ? (
                <Image source={{ uri: getMember(memory.recordedByMemberId)!.profilePictureUri! }} style={styles.recordedByAvatarImage} />
              ) : (
                <Text style={styles.recordedByAvatarText}>{(getMember(memory.recordedByMemberId)?.name ?? memory.recordedBy)[0]?.toUpperCase()}</Text>
              )}
            </View>
            <Text style={[styles.recordedBy, { color: colors.muted }]}>
              Recorded by <Text style={{ fontWeight: '600', color: colors.foreground }}>{getMember(memory.recordedByMemberId)?.name ?? memory.recordedBy}</Text>
            </Text>
          </View>

          {/* ── Comments & Reactions ── */}
          <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.commentsSectionTitle, { color: colors.foreground }]}>
              💬 Family Reactions {comments.length > 0 ? `(${comments.length})` : ''}
            </Text>

            {comments.length === 0 && (
              <View style={[styles.emptyComments, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.emptyCommentsEmoji}>💭</Text>
                <Text style={[styles.emptyCommentsText, { color: colors.muted }]}>
                  Be the first to leave a reaction or comment
                </Text>
              </View>
            )}

            {comments.map(comment => {
              const member = state.members.find(m => m.id === comment.memberId);
              return (
                <CommentBubble
                  key={comment.id}
                  comment={comment}
                  memberName={getMemberName(comment.memberId)}
                  memberProfilePicture={member?.profilePictureUri}
                  currentMemberId={currentMember?.id ?? ''}
                  onReact={(emoji) => handleReaction(comment.id, emoji)}
                  colors={colors}
                />
              );
            })}

            {/* Comment Input */}
            <View style={[styles.commentInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.commentInput, { color: colors.foreground }]}
                placeholder="Add a comment…"
                placeholderTextColor={colors.muted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={300}
                returnKeyType="send"
                onSubmitEditing={handlePostComment}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: commentText.trim() ? colors.primary : colors.border },
                  pressed && { opacity: 0.75 },
                ]}
                onPress={handlePostComment}
                disabled={!commentText.trim()}
              >
                <Text style={styles.sendBtnText}>↑</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function CommentBubble({
  comment,
  memberName,
  memberProfilePicture,
  currentMemberId,
  onReact,
  colors,
}: {
  comment: Comment;
  memberName: string;
  memberProfilePicture?: string | null;
  currentMemberId: string;
  onReact: (emoji: string) => void;
  colors: ReturnType<typeof import('@/hooks/use-colors').useColors>;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const isOwn = comment.memberId === currentMemberId;

  const activeReactions = Object.entries(comment.reactions).filter(([, ids]) => ids.length > 0);

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <View style={[styles.commentBubble, { backgroundColor: isOwn ? colors.primary + '18' : colors.surface, borderColor: colors.border }]}>
      <View style={styles.commentHeader}>
        <View style={[styles.commentAvatar, { backgroundColor: colors.primary }, memberProfilePicture && { backgroundColor: 'transparent' }]}>
          {memberProfilePicture ? (
            <Image source={{ uri: memberProfilePicture }} style={styles.commentAvatarImage} />
          ) : (
            <Text style={styles.commentAvatarText}>{memberName[0]?.toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{memberName}</Text>
          <Text style={[styles.commentTime, { color: colors.muted }]}>{relativeTime(comment.timestamp)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.reactTrigger, pressed && { opacity: 0.6 }]}
          onPress={() => setShowPicker(v => !v)}
        >
          <Text style={styles.reactTriggerText}>😊</Text>
        </Pressable>
      </View>

      <Text style={[styles.commentText, { color: colors.foreground }]}>{comment.text}</Text>

      {/* Reaction Picker */}
      {showPicker && (
        <View style={[styles.reactionPicker, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {EMOJI_REACTIONS.map(emoji => (
            <Pressable
              key={emoji}
              style={({ pressed }) => [styles.reactionPickerBtn, pressed && { transform: [{ scale: 1.3 }] }]}
              onPress={() => { onReact(emoji); setShowPicker(false); }}
            >
              <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Active Reactions */}
      {activeReactions.length > 0 && (
        <View style={styles.activeReactions}>
          {activeReactions.map(([emoji, memberIds]) => (
            <Pressable
              key={emoji}
              style={[
                styles.reactionChip,
                {
                  backgroundColor: memberIds.includes(currentMemberId) ? colors.primary + '30' : colors.surface,
                  borderColor: memberIds.includes(currentMemberId) ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onReact(emoji)}
            >
              <Text style={styles.reactionChipEmoji}>{emoji}</Text>
              <Text style={[styles.reactionChipCount, { color: colors.foreground }]}>{memberIds.length}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    fontSize: 17,
    fontWeight: '600',
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnEmoji: {
    fontSize: 18,
  },
  savedBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  savedBannerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  themeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts?.display,
    lineHeight: 36,
  },
  photoContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: 300,
    backgroundColor: '#000',
  },
  detailPhotoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 48,
  },
  photoPlaceholderLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  videoContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: 300,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  promptBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  playerCard: {
    padding: 20,
    borderRadius: 18,
    gap: 14,
  },
  playerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  playerDuration: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  playPauseButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  playPauseText: {
    fontSize: 18,
    fontWeight: '700',
  },
  transcriptCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 17,
    lineHeight: 27,
  },
  recordedByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  recordedByAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordedByAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  recordedByAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  recordedBy: {
    fontSize: 14,
  },
  // ── Comments ──
  commentsSection: {
    gap: 14,
    borderTopWidth: 1,
    paddingTop: 20,
    marginTop: 4,
  },
  commentsSectionTitle: {
    fontSize: 20,
    fontFamily: Fonts?.display,
  },
  emptyComments: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyCommentsEmoji: {
    fontSize: 36,
  },
  emptyCommentsText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  commentBubble: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 12,
    marginTop: 1,
  },
  reactTrigger: {
    padding: 4,
  },
  reactTriggerText: {
    fontSize: 20,
  },
  commentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  reactionPicker: {
    flexDirection: 'row',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  reactionPickerBtn: {
    padding: 4,
  },
  reactionPickerEmoji: {
    fontSize: 24,
  },
  activeReactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  reactionChipEmoji: {
    fontSize: 16,
  },
  reactionChipCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
