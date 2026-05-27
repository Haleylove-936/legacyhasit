import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useStore } from '@/lib/store';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function JoinVaultScreen() {
  const colors = useColors();
  const router = useRouter();
  const { completeOnboarding } = useStore();
  const [isJoining, setIsJoining] = useState(false);
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const canJoin = name.trim().length > 0 && code.trim().length >= 4;

  const handleJoin = async () => {
    if (!canJoin || isJoining) return;
    setIsJoining(true);
    setError('');

    try {
      // 1. Fetch vault by invite code
      const vault = await utils.client.sync.getVault.query({ inviteCode: code.trim() });
      
      if (!vault) {
        setError('Invalid invite code. Please check with your family organizer.');
        setIsJoining(false);
        return;
      }

      // 2. Check if vault is full (limit check)
      if (vault.memberLimit && vault.memberUids.length >= vault.memberLimit) {
        setError('This family vault is full. Please contact the organizer to upgrade.');
        setIsJoining(false);
        return;
      }

      // 3. Complete onboarding with the found vault
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      completeOnboarding(
        'relative', 
        name.trim(), 
        vault.name, 
        null, 
        vault
      );
      
      router.replace('/(tabs)' as never);
    } catch (err) {
      console.error('Join failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>Join a Family Vault</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Ask the family organizer for the invite code, then enter it below.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Your Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g., Michael"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Invite Code</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  { backgroundColor: colors.surface, borderColor: error ? colors.error : colors.border, color: colors.foreground },
                ]}
                placeholder="e.g., ABC123"
                placeholderTextColor={colors.muted}
                value={code}
                onChangeText={t => { setCode(t.toUpperCase()); setError(''); }}
                returnKeyType="done"
                autoCapitalize="characters"
                maxLength={8}
                onSubmitEditing={handleJoin}
              />
              {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.joinButton,
              { backgroundColor: canJoin && !isJoining ? colors.primary : colors.border },
              pressed && canJoin && !isJoining && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleJoin}
            disabled={!canJoin || isJoining}
          >
            <Text style={[styles.joinText, { color: canJoin && !isJoining ? '#FFFFFF' : colors.muted }]}>
              {isJoining ? 'Joining...' : 'Join Family Vault'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 32,
  },
  header: { gap: 10 },
  backText: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '800' },
  subtitle: { fontSize: 17, lineHeight: 25 },
  form: { gap: 20 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 17, fontWeight: '600' },
  input: {
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  errorText: { fontSize: 14 },
  joinButton: {
    paddingVertical: 22,
    borderRadius: 16,
    alignItems: 'center',
  },
  joinText: { fontSize: 20, fontWeight: '700' },
});
