import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useStore } from '@/lib/store';
import { Memory, MemoryTheme } from '@/shared/app-types';
import { THEME_META } from '@/constants/prompts';
import { Fonts } from '@/lib/_core/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, Pressable, Alert, Platform, Animated, TextInput, ScrollView,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { pickImage, takePhoto, pickVideo, recordVideo } from '@/lib/image-picker-service';
import { transcribeAudio } from '@/lib/transcription-service';
import { trpc } from '@/lib/trpc';

type RecordingMode = 'audio' | 'video' | 'photo';

function WaveformBar({ delay, isRecording }: { delay: number; isRecording: boolean }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 300 + delay * 50, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.2, duration: 300 + delay * 50, useNativeDriver: true }),
        ])
      );
      loopRef.current = loop;
      loop.start();
    } else {
      loopRef.current?.stop();
      Animated.timing(anim, { toValue: 0.3, duration: 200, useNativeDriver: true }).start();
    }
    return () => loopRef.current?.stop();
  }, [isRecording, delay, anim]);

  return (
    <Animated.View
      style={{
        width: 5,
        height: 40,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
        transform: [{ scaleY: anim }],
        opacity: anim,
      }}
    />
  );
}

const MODE_OPTIONS: { key: RecordingMode; emoji: string; label: string }[] = [
  { key: 'audio', emoji: '🎙️', label: 'Voice' },
  { key: 'video', emoji: '🎥', label: 'Video' },
  { key: 'photo', emoji: '📷', label: 'Photo' },
];

export default function RecordScreen() {
  const colors = useColors();
  const router = useRouter();
  const { addMemory, advancePrompt, updateMemory, state } = useStore();
  const transcriptionMutation = trpc.transcription.transcribe.useMutation();
  const uploadMutation = trpc.transcription.upload.useMutation();
  const trpcContext = {
    transcription: {
      upload: uploadMutation,
      transcribe: transcriptionMutation,
    }
  };
  const { promptId, promptText, theme, mode: initialMode } = useLocalSearchParams<{
    promptId?: string;
    promptText?: string;
    theme?: MemoryTheme;
    mode?: string;
  }>();

  const [mode, setMode] = useState<RecordingMode>('audio');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isRecording = recorderState.isRecording;
  const isElder = state.userRole === 'elder';

  const themeMeta = THEME_META[theme ?? 'childhood'];

  // For Elders, we default to audio and hide the selector, unless they chose upload
  useEffect(() => {
    if (initialMode === 'upload') {
      setMode('photo'); // Start with photo for upload
    } else if (isElder && mode !== 'audio') {
      setMode('audio');
    }
  }, [isElder, initialMode]);

  useEffect(() => {
    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      setHasPermission(granted);
      if (granted) {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      }
    })();
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleModeChange = (newMode: RecordingMode) => {
    if (isRecording) return; // don't switch mid-recording
    setMode(newMode);
    setRecordingUri(null);
    setPhotoUri(null);
    setElapsedSeconds(0);
  };

  // ── Audio ──────────────────────────────────────────────
  const handleStartRecording = async () => {
    if (!hasPermission) {
      Alert.alert('Microphone Access', 'Please allow microphone access to record your story.');
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setElapsedSeconds(0);
    setRecordingUri(null);
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const handleStopRecording = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await audioRecorder.stop();
    const uri = audioRecorder.uri;
    if (uri) setRecordingUri(uri);
  };

  // ── Video ──────────────────────────────────────────────
  const handlePickVideo = async () => {
    const uri = await pickVideo();
    if (uri) {
      setRecordingUri(uri);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRecordVideo = async () => {
    const uri = await recordVideo();
    if (uri) {
      setRecordingUri(uri);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // ── Photo ──────────────────────────────────────────────
  const handlePickPhoto = async () => {
    const uri = await pickImage();
    if (uri) {
      setPhotoUri(uri);
      setRecordingUri(uri); // photo IS the file for photo-mode memories
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) {
      setPhotoUri(uri);
      setRecordingUri(uri);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // ── Attach extra photo to audio/video memory ───────────
  const handleAddPhoto = async () => {
    const uri = await pickImage();
    if (uri) {
      setPhotoUri(uri);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // ── Save ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!recordingUri) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const memoryId = Date.now().toString();
    const finalTitle = title.trim() || (promptText
      ? (promptText.substring(0, 60) + (promptText.length > 60 ? '…' : ''))
      : `Story — ${new Date().toLocaleDateString()}`);
    const finalTheme = (theme as MemoryTheme) ?? 'childhood';

    const memory: Memory = {
      id: memoryId,
      promptId: promptId,
      promptText: promptText,
      theme: finalTheme,
      title: finalTitle,
      recordingType: mode,
      fileUri: recordingUri,
      photoUri: mode === 'photo' ? photoUri : (photoUri || null),
      notes: notes.trim() || undefined,
      recordedBy: 'Me',
      createdAt: new Date().toISOString(),
      durationSeconds: mode === 'audio' ? elapsedSeconds : undefined,
      transcript: null, // Start with null
    };

    await addMemory(memory, trpc);
    if (promptId) advancePrompt();

    // Trigger background transcription for audio
    if (mode === 'audio') {
      transcribeAudio(recordingUri, finalTitle, finalTheme, trpcContext).then(async (transcript) => {
        const currentMemory = state.memories.find(m => m.id === memoryId);
        if (currentMemory) {
          await updateMemory({ ...currentMemory, transcript }, trpc);
        }
      });
    }

    router.replace({ pathname: '/memory/[id]', params: { id: memory.id, justSaved: '1' } } as never);
  };

  const handleDiscard = () => {
    Alert.alert('Discard?', 'Your recording will be lost.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setRecordingUri(null);
          setPhotoUri(null);
          setElapsedSeconds(0);
          router.back();
        },
      },
    ]);
  };

  const hasCapture = !!recordingUri;

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: colors.surface }, pressed && { opacity: 0.6 }]}
            onPress={hasCapture ? handleDiscard : () => router.back()}
          >
            <Text style={[styles.closeBtnText, { color: colors.foreground }]}>✕</Text>
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.muted }]}>New Memory</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Prompt */}
        <View style={[styles.promptBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {promptText ? (
            <>
              <Text style={[styles.promptTheme, { color: colors.primary }]}>
                {themeMeta?.emoji} {themeMeta?.label}
              </Text>
              <Text style={[styles.promptText, { color: colors.foreground }]}>{promptText}</Text>
            </>
          ) : (
            <Text style={[styles.promptText, { color: colors.foreground }]}>
              Share any story or memory you'd like to preserve.
            </Text>
          )}
        </View>

        {/* Mode Selector - Hidden for Elders */}
        {!isElder && (
          <View style={[styles.modeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {MODE_OPTIONS.map(opt => (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [
                  styles.modeBtn,
                  mode === opt.key && { backgroundColor: colors.primary },
                  isRecording && { opacity: 0.5 },
                  pressed && !isRecording && { opacity: 0.75 },
                ]}
                onPress={() => handleModeChange(opt.key)}
                disabled={isRecording}
              >
                <Text style={styles.modeBtnEmoji}>{opt.emoji}</Text>
                <Text style={[
                  styles.modeBtnLabel,
                  { color: mode === opt.key ? '#FFFFFF' : colors.muted },
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── AUDIO MODE ── */}
        {mode === 'audio' && (
          <>
            <View style={[styles.visualizerArea, { backgroundColor: isRecording ? colors.primary : colors.surface, borderColor: colors.border }]}>
              {isRecording ? (
                <>
                  <View style={styles.waveform}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <WaveformBar key={i} delay={i} isRecording={isRecording} />
                    ))}
                  </View>
                  <Text style={styles.recordingLabel}>Recording…</Text>
                </>
              ) : hasCapture ? (
                <>
                  <Text style={styles.doneEmoji}>✅</Text>
                  <Text style={[styles.doneLabel, { color: colors.foreground }]}>Recording saved!</Text>
                  <Text style={[styles.doneTime, { color: colors.muted }]}>Duration: {formatTime(elapsedSeconds)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.micEmoji}>🎙️</Text>
                  <Text style={[styles.readyLabel, { color: colors.muted }]}>
                    {hasPermission === false ? 'Microphone access needed' : 'Ready to record'}
                  </Text>
                </>
              )}
            </View>

            {(isRecording || hasCapture) && (
              <Text style={[styles.timer, { color: isRecording ? colors.primary : colors.muted }]}>
                {formatTime(elapsedSeconds)}
              </Text>
            )}

            {!isRecording && !hasCapture && (
              <Pressable
                style={({ pressed }) => [styles.bigButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}
                onPress={handleStartRecording}
              >
                <Text style={styles.bigButtonEmoji}>🎙️</Text>
                <Text style={styles.bigButtonText}>Start Recording</Text>
              </Pressable>
            )}

            {isRecording && (
              <Pressable
                style={({ pressed }) => [styles.bigButton, { backgroundColor: colors.error }, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}
                onPress={handleStopRecording}
              >
                <View style={styles.stopIcon} />
                <Text style={styles.bigButtonText}>Stop Recording</Text>
              </Pressable>
            )}
          </>
        )}

        {/* ── VIDEO MODE ── */}
        {mode === 'video' && (
          <>
            <View style={[styles.visualizerArea, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {hasCapture ? (
                <>
                  <Text style={styles.doneEmoji}>🎥</Text>
                  <Text style={[styles.doneLabel, { color: colors.foreground }]}>Video attached!</Text>
                </>
              ) : (
                <>
                  <Text style={styles.micEmoji}>🎥</Text>
                  <Text style={[styles.readyLabel, { color: colors.muted }]}>Record or pick a video</Text>
                </>
              )}
            </View>

            {!hasCapture && (
              <View style={styles.twoButtonRow}>
                <Pressable
                  style={({ pressed }) => [styles.halfButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
                  onPress={handleRecordVideo}
                >
                  <Text style={styles.bigButtonEmoji}>📹</Text>
                  <Text style={styles.bigButtonText}>Record Video</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.halfButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 }, pressed && { opacity: 0.75 }]}
                  onPress={handlePickVideo}
                >
                  <Text style={styles.bigButtonEmoji}>🗂️</Text>
                  <Text style={[styles.bigButtonText, { color: colors.foreground }]}>Choose Video</Text>
                </Pressable>
              </View>
            )}

            {hasCapture && (
              <Pressable
                style={({ pressed }) => [styles.rerecordButton, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                onPress={() => setRecordingUri(null)}
              >
                <Text style={[styles.rerecordText, { color: colors.muted }]}>Choose Different Video</Text>
              </Pressable>
            )}
          </>
        )}

        {/* ── PHOTO MODE ── */}
        {mode === 'photo' && (
          <>
            <View style={[styles.visualizerArea, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {hasCapture ? (
                <>
                  <Text style={styles.doneEmoji}>📷</Text>
                  <Text style={[styles.doneLabel, { color: colors.foreground }]}>Photo attached!</Text>
                </>
              ) : (
                <>
                  <Text style={styles.micEmoji}>📷</Text>
                  <Text style={[styles.readyLabel, { color: colors.muted }]}>Take or pick a photo</Text>
                </>
              )}
            </View>

            {!hasCapture && (
              <View style={styles.twoButtonRow}>
                <Pressable
                  style={({ pressed }) => [styles.halfButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
                  onPress={handleTakePhoto}
                >
                  <Text style={styles.bigButtonEmoji}>📸</Text>
                  <Text style={styles.bigButtonText}>Take Photo</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.halfButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 }, pressed && { opacity: 0.75 }]}
                  onPress={handlePickPhoto}
                >
                  <Text style={styles.bigButtonEmoji}>🖼️</Text>
                  <Text style={[styles.bigButtonText, { color: colors.foreground }]}>Choose Photo</Text>
                </Pressable>
              </View>
            )}

            {hasCapture && (
              <Pressable
                style={({ pressed }) => [styles.rerecordButton, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                onPress={() => { setRecordingUri(null); setPhotoUri(null); }}
              >
                <Text style={[styles.rerecordText, { color: colors.muted }]}>Choose Different Photo</Text>
              </Pressable>
            )}
          </>
        )}

        {/* ── Review / Save (shown after any capture) ── */}
        {hasCapture && !isRecording && (
          <View style={styles.reviewSection}>
            {/* Elders don't need to type titles or notes */}
            {!isElder && (
              <>
                <TextInput
                  style={[styles.titleInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Give this memory a title (optional)"
                  placeholderTextColor={colors.muted}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Add notes or context (optional)"
                  placeholderTextColor={colors.muted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  maxLength={500}
                />
              </>
            )}

            {/* Attach photo to audio/video memories - Elders can do this if they want, but it's secondary */}
            {mode !== 'photo' && (
              <Pressable
                style={({ pressed }) => [
                  styles.attachPhotoBtn, 
                  { backgroundColor: colors.surface, borderColor: colors.border }, 
                  pressed && { opacity: 0.7 },
                  isElder && { paddingVertical: 20 } // Bigger tap target for Elders
                ]}
                onPress={handleAddPhoto}
              >
                <Text style={[
                  styles.attachPhotoBtnText, 
                  { color: colors.primary },
                  isElder && { fontSize: 18 }
                ]}>
                  {photoUri ? '✓ Photo Attached' : '📷 Add a Photo (Optional)'}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.saveButton, 
                { backgroundColor: colors.success }, 
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                isElder && { paddingVertical: 32 } // HUGE save button for Elders
              ]}
              onPress={handleSave}
            >
              <Text style={[
                styles.saveButtonText,
                isElder && { fontSize: 24 }
              ]}>
                {isElder ? 'Finish & Share ✨' : 'Save to Family Vault ✨'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  topTitle: {
    fontSize: 18,
    fontFamily: Fonts?.display,
  },
  promptBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  promptTheme: {
    fontSize: 13,
    fontWeight: '600',
  },
  promptText: {
    fontSize: 20,
    fontFamily: Fonts?.display,
    lineHeight: 30,
  },
  modeRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    gap: 6,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  modeBtnEmoji: {
    fontSize: 22,
  },
  modeBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  visualizerArea: {
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 160,
    paddingVertical: 32,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 60,
  },
  recordingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneEmoji: {
    fontSize: 52,
  },
  doneLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  doneTime: {
    fontSize: 15,
  },
  micEmoji: {
    fontSize: 52,
  },
  readyLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  timer: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  bigButton: {
    paddingVertical: 22,
    borderRadius: 18,
    alignItems: 'center',
    gap: 6,
  },
  bigButtonEmoji: {
    fontSize: 28,
  },
  bigButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  stopIcon: {
    width: 28,
    height: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  twoButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
    paddingVertical: 22,
    borderRadius: 18,
    alignItems: 'center',
    gap: 6,
  },
  rerecordButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  rerecordText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reviewSection: {
    gap: 12,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  notesInput: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  attachPhotoBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  attachPhotoBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 22,
    borderRadius: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
