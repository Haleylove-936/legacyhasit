import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useStore } from '@/lib/store';
import { Fonts } from '@/lib/_core/theme';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ScrollView, Alert, Platform, Image, TextInput, Modal } from 'react-native';
import { useState } from 'react';
import { pickProfilePictureFromLibrary, takeProfilePicture, getInitials, getAvatarColor } from '@/lib/profile-picture-service';
import * as Haptics from 'expo-haptics';
import { UserRole } from '@/shared/app-types';
import { getDailyPrompt } from '@/constants/prompts';
import { schedulePushNotification, formatReminderTime } from '@/lib/prompt-scheduler';
import DateTimePicker from '@react-native-community/datetimepicker';

const ROLE_LABELS: Record<UserRole, string> = {
  elder: '👴 Elder',
  organizer: '👨‍👩‍👧 Organizer',
  relative: '👶 Relative',
};

function SettingRow({
  emoji,
  label,
  value,
  onPress,
  destructive,
}: {
  emoji: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingRow,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && onPress && { opacity: 0.7 },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.settingEmoji}>{emoji}</Text>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: destructive ? colors.error : colors.foreground }]}>
          {label}
        </Text>
        {value && <Text style={[styles.settingValue, { color: colors.muted }]}>{value}</Text>}
      </View>
      {onPress && <Text style={[styles.settingChevron, { color: colors.muted }]}>›</Text>}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, updateMember, dispatch, setReminderTime } = useStore();
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editProfilePicture, setEditProfilePicture] = useState<string | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resetConfirmStep, setResetConfirmStep] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const { userName, userRole, familyVault, members, memories, reminderTime, currentPromptIndex } = state;
  const isOrganizer = userRole === 'organizer';
  const currentMember = members[0];

  // Initialize edit form when opening profile editor
  const handleOpenProfileEditor = () => {
    if (currentMember) {
      setEditName(currentMember.name);
      setEditProfilePicture(currentMember.profilePictureUri || null);
      setEditingProfile(true);
    }
  };

  const handleTakePhoto = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = await takeProfilePicture();
    if (uri) {
      setEditProfilePicture(uri);
      setShowPhotoOptions(false);
    }
  };

  const handlePickPhoto = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = await pickProfilePictureFromLibrary();
    if (uri) {
      setEditProfilePicture(uri);
      setShowPhotoOptions(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remove Photo?', 'Your profile picture will be removed.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setEditProfilePicture(null);
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
    ]);
  };

  const handleSaveProfile = () => {
    if (!currentMember || !editName.trim()) {
      Alert.alert('Error', 'Please enter a name.');
      return;
    }
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateMember({
      ...currentMember,
      name: editName.trim(),
      profilePictureUri: editProfilePicture,
    });
    setEditingProfile(false);
  };

  const handleInvite = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/invite' as never);
  };

  const handleAdvancedPress = () => {
    setShowAdvanced(!showAdvanced);
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const newTime = `${hours}:${minutes}`;
      setReminderTime(newTime);
      
      // Schedule the notification
      const prompt = getDailyPrompt(currentPromptIndex || 0);
      await schedulePushNotification(prompt.text, newTime);
      
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleResetStart = () => {
    Alert.alert(
      'Advanced Settings',
      'This action will delete all memories and reset the vault. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I understand the consequences',
          style: 'destructive',
          onPress: () => setResetConfirmStep(1),
        },
      ]
    );
  };

  const handleResetConfirm = () => {
    Alert.alert(
      'Final Confirmation Required',
      'This will permanently delete all memories. Type RESET to confirm.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'RESET',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'RESET' });
            setResetConfirmStep(0);
            setShowAdvanced(false);
            router.replace('/onboarding/welcome' as never);
          },
        },
      ]
    );
  };

  // ELDER/RELATIVE: Minimal settings view
  if (!isOrganizer) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>My Profile</Text>
          </View>

          {/* Profile Card */}
          <Pressable
            style={({ pressed }) => [
              styles.profileCard,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleOpenProfileEditor}
          >
            <View style={styles.profileAvatar}>
              {currentMember?.profilePictureUri ? (
                <Image source={{ uri: currentMember.profilePictureUri }} style={styles.profileAvatarImage} />
              ) : (
                <Text style={styles.profileAvatarText}>
                  {currentMember?.name ? currentMember.name[0].toUpperCase() : '?'}
                </Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{currentMember?.name || 'Unknown'}</Text>
              <Text style={styles.profileRole}>{userRole ? ROLE_LABELS[userRole] : ''}</Text>
            </View>
            <Text style={[styles.editHint, { color: 'rgba(255,255,255,0.7)' }]}>Edit</Text>
          </Pressable>

          {/* Vault Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>Family Vault</Text>
            <SettingRow
              emoji="📖"
              label={familyVault?.name ?? 'No vault'}
              value={`${memories.length} stories`}
            />
          </View>

          {/* Info Text */}
          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              You're part of {familyVault?.name || 'a family vault'}. You can record stories and view memories shared by family members.
            </Text>
          </View>
        </ScrollView>

        {/* Profile Editor Modal */}
        <Modal
          visible={editingProfile}
          animationType="slide"
          onRequestClose={() => setEditingProfile(false)}
        >
          <ScreenContainer containerClassName="bg-background">
            <ScrollView
              style={{ flex: 1, backgroundColor: 'transparent' }}
              contentContainerStyle={[styles.modalContainer, { backgroundColor: 'transparent' }]}
              keyboardShouldPersistTaps="handled"
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Pressable
                  onPress={() => setEditingProfile(false)}
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                >
                  <Text style={[styles.modalCloseText, { color: colors.primary }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>
                <Pressable
                  onPress={handleSaveProfile}
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                >
                  <Text style={[styles.modalSaveText, { color: colors.primary }]}>Save</Text>
                </Pressable>
              </View>

              {/* Profile Picture Editor */}
              <View style={styles.editProfileSection}>
                <Pressable
                  style={({ pressed }) => [
                    styles.editProfilePictureButton,
                    { backgroundColor: editProfilePicture ? colors.surface : getAvatarColor(currentMember?.id || 'new') },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setShowPhotoOptions(!showPhotoOptions)}
                >
                  {editProfilePicture ? (
                    <Image source={{ uri: editProfilePicture }} style={styles.editProfileImage} />
                  ) : (
                    <Text style={styles.editProfileInitials}>{getInitials(editName || 'You')}</Text>
                  )}
                </Pressable>
                <Text style={[styles.editProfileLabel, { color: colors.muted }]}>
                  {editProfilePicture ? 'Tap to change photo' : 'Tap to add a profile photo'}
                </Text>

                {/* Photo Options */}
                {showPhotoOptions && (
                  <View style={[styles.photoOptions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Pressable
                      style={({ pressed }) => [styles.photoOption, pressed && { opacity: 0.7 }]}
                      onPress={handleTakePhoto}
                    >
                      <Text style={styles.photoOptionEmoji}>📷</Text>
                      <Text style={[styles.photoOptionText, { color: colors.foreground }]}>Take Photo</Text>
                    </Pressable>
                    <View style={[styles.photoOptionDivider, { backgroundColor: colors.border }]} />
                    <Pressable
                      style={({ pressed }) => [styles.photoOption, pressed && { opacity: 0.7 }]}
                      onPress={handlePickPhoto}
                    >
                      <Text style={styles.photoOptionEmoji}>🖼️</Text>
                      <Text style={[styles.photoOptionText, { color: colors.foreground }]}>Choose from Library</Text>
                    </Pressable>
                    {editProfilePicture && (
                      <>
                        <View style={[styles.photoOptionDivider, { backgroundColor: colors.border }]} />
                        <Pressable
                          style={({ pressed }) => [styles.photoOption, pressed && { opacity: 0.7 }]}
                          onPress={handleRemovePhoto}
                        >
                          <Text style={styles.photoOptionEmoji}>🗑️</Text>
                          <Text style={[styles.photoOptionText, { color: colors.error }]}>Remove Photo</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </View>

              {/* Name Editor */}
              <View style={styles.editFormSection}>
                <Text style={[styles.editLabel, { color: colors.foreground }]}>Name</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.muted}
                  value={editName}
                  onChangeText={setEditName}
                  autoCapitalize="words"
                />
              </View>
            </ScrollView>
          </ScreenContainer>
        </Modal>
      </ScreenContainer>
    );
  }

  // ORGANIZER: Full admin settings
  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        </View>

        {/* Profile Card */}
        <Pressable
          style={({ pressed }) => [
            styles.profileCard,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleOpenProfileEditor}
        >
          <View style={styles.profileAvatar}>
            {currentMember?.profilePictureUri ? (
              <Image source={{ uri: currentMember.profilePictureUri }} style={styles.profileAvatarImage} />
            ) : (
              <Text style={styles.profileAvatarText}>
                {currentMember?.name ? currentMember.name[0].toUpperCase() : '?'}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentMember?.name || 'Unknown'}</Text>
            <Text style={styles.profileRole}>{userRole ? ROLE_LABELS[userRole] : ''}</Text>
          </View>
          <Text style={[styles.editHint, { color: 'rgba(255,255,255,0.7)' }]}>Edit</Text>
        </Pressable>

        {/* Vault Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Family Vault</Text>
          <SettingRow
            emoji="📖"
            label={familyVault?.name ?? 'No vault'}
            value={`${memories.length} stories · ${members.length} members`}
          />
          <SettingRow
            emoji="🛡️"
            label="Admin Dashboard"
            onPress={() => router.push('/admin/dashboard' as never)}
          />
          
          {/* Member Capacity UI */}
          <View style={[styles.capacityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.capacityHeader}>
              <Text style={[styles.capacityTitle, { color: colors.foreground }]}>Vault Capacity</Text>
              <Text style={[styles.capacityCount, { color: colors.primary }]}>
                {members.length} / {familyVault?.memberLimit || 10}
              </Text>
            </View>
            <View style={[styles.capacityTrack, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.capacityFill, 
                  { 
                    backgroundColor: (members.length / (familyVault?.memberLimit || 10)) > 0.8 ? colors.error : colors.primary,
                    width: `${Math.min(100, (members.length / (familyVault?.memberLimit || 10)) * 100)}%` 
                  }
                ]} 
              />
            </View>
            {(members.length / (familyVault?.memberLimit || 10)) > 0.8 && (
              <Pressable 
                style={({ pressed }) => [styles.upgradeButton, pressed && { opacity: 0.8 }]}
                onPress={() => Alert.alert('Upgrade Plan', 'Add 10 more members for $10/month?')}
              >
                <Text style={styles.upgradeButtonText}>Upgrade Vault ✨</Text>
              </Pressable>
            )}
          </View>

          <SettingRow
            emoji="🔑"
            label="Invite Code"
            value={familyVault?.inviteCode ?? '—'}
          />
          <SettingRow
            emoji="📬"
            label="Invite Family Members"
            onPress={handleInvite}
          />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Notifications</Text>
          <SettingRow
            emoji="⏰"
            label="Daily Story Prompt"
            value={reminderTime ? formatReminderTime(reminderTime) : 'Not set'}
            onPress={() => setShowTimePicker(true)}
          />
          {showTimePicker && (
            <DateTimePicker
              value={(() => {
                const d = new Date();
                if (reminderTime) {
                  const [h, m] = reminderTime.split(':').map(Number);
                  d.setHours(h, m, 0, 0);
                }
                return d;
              })()}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Members */}
        {members.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>Members</Text>
            {members.map(member => (
              <SettingRow
                key={member.id}
                emoji={member.role === 'elder' ? '👴' : member.role === 'organizer' ? '👨‍👩‍👧' : '👶'}
                label={member.name}
                value={ROLE_LABELS[member.role]}
              />
            ))}
          </View>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Vault Stats</Text>
          <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{memories.length}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Stories</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{members.length}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Members</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {memories.filter(m => m.recordingType === 'audio').length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Audio</Text>
            </View>
          </View>
        </View>

        {/* Advanced Settings */}
        <View style={styles.section}>
          <SettingRow
            emoji="⚙️"
            label="Advanced Settings"
            value={showAdvanced ? 'Hide' : 'Show'}
            onPress={handleAdvancedPress}
          />
          {showAdvanced && (
            <View style={[styles.advancedBox, { backgroundColor: colors.error, opacity: 0.1 }]}>
              <Text style={[styles.advancedTitle, { color: colors.error }]}>Danger Zone</Text>
              <Text style={[styles.advancedText, { color: colors.foreground }]}>
                These actions cannot be undone.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.advancedButton,
                  { backgroundColor: colors.error },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleResetStart}
              >
                <Text style={styles.advancedButtonText}>Reset Everything</Text>
              </Pressable>
              {resetConfirmStep === 1 && (
                <Pressable
                  style={({ pressed }) => [
                    styles.advancedButton,
                    { backgroundColor: colors.error, marginTop: 8 },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleResetConfirm}
                >
                  <Text style={styles.advancedButtonText}>Confirm Reset</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* App Info */}
        <Text style={[styles.appInfo, { color: colors.muted }]}>
          LegacyBox · Preserve the stories behind the photos.
        </Text>
      </ScrollView>

      {/* Profile Editor Modal */}
      <Modal
        visible={editingProfile}
        animationType="slide"
        onRequestClose={() => setEditingProfile(false)}
      >
        <ScreenContainer containerClassName="bg-background">
          <ScrollView
            style={{ flex: 1, backgroundColor: 'transparent' }}
            contentContainerStyle={[styles.modalContainer, { backgroundColor: 'transparent' }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setEditingProfile(false)}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={[styles.modalCloseText, { color: colors.primary }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>
              <Pressable
                onPress={handleSaveProfile}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={[styles.modalSaveText, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>

            {/* Profile Picture Editor */}
            <View style={styles.editProfileSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.editProfilePictureButton,
                  { backgroundColor: editProfilePicture ? colors.surface : getAvatarColor(currentMember?.id || 'new') },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setShowPhotoOptions(!showPhotoOptions)}
              >
                {editProfilePicture ? (
                  <Image source={{ uri: editProfilePicture }} style={styles.editProfileImage} />
                ) : (
                  <Text style={styles.editProfileInitials}>{getInitials(editName || 'You')}</Text>
                )}
              </Pressable>
              <Text style={[styles.editProfileLabel, { color: colors.muted }]}>
                {editProfilePicture ? 'Tap to change photo' : 'Tap to add a profile photo'}
              </Text>

              {/* Photo Options */}
              {showPhotoOptions && (
                <View style={[styles.photoOptions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Pressable
                    style={({ pressed }) => [styles.photoOption, pressed && { opacity: 0.7 }]}
                    onPress={handleTakePhoto}
                  >
                    <Text style={styles.photoOptionEmoji}>📷</Text>
                    <Text style={[styles.photoOptionText, { color: colors.foreground }]}>Take Photo</Text>
                  </Pressable>
                  <View style={[styles.photoOptionDivider, { backgroundColor: colors.border }]} />
                  <Pressable
                    style={({ pressed }) => [styles.photoOption, pressed && { opacity: 0.7 }]}
                    onPress={handlePickPhoto}
                  >
                    <Text style={styles.photoOptionEmoji}>🖼️</Text>
                    <Text style={[styles.photoOptionText, { color: colors.foreground }]}>Choose from Library</Text>
                  </Pressable>
                  {editProfilePicture && (
                    <>
                      <View style={[styles.photoOptionDivider, { backgroundColor: colors.border }]} />
                      <Pressable
                        style={({ pressed }) => [styles.photoOption, pressed && { opacity: 0.7 }]}
                        onPress={handleRemovePhoto}
                      >
                        <Text style={styles.photoOptionEmoji}>🗑️</Text>
                        <Text style={[styles.photoOptionText, { color: colors.error }]}>Remove Photo</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Name Editor */}
            <View style={styles.editFormSection}>
              <Text style={[styles.editLabel, { color: colors.foreground }]}>Name</Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Enter your name"
                placeholderTextColor={colors.muted}
                value={editName}
                onChangeText={setEditName}
                autoCapitalize="words"
              />
            </View>
          </ScrollView>
        </ScreenContainer>
      </Modal>
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
  header: {},
  title: {
    fontSize: 32,
    fontFamily: Fonts?.display,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 18,
    gap: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    gap: 4,
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontFamily: Fonts?.display,
    color: '#FFFFFF',
  },
  profileRole: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  editHint: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  settingEmoji: {
    fontSize: 22,
  },
  settingContent: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 14,
  },
  settingChevron: {
    fontSize: 20,
  },
  statsCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  appInfo: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  infoBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  capacityCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginVertical: 4,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  capacityCount: {
    fontSize: 15,
    fontWeight: '800',
  },
  capacityTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  upgradeButton: {
    backgroundColor: '#C8860A',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  advancedBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 12,
  },
  advancedTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  advancedText: {
    fontSize: 14,
    lineHeight: 20,
  },
  advancedButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  advancedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal styles
  modalContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts?.display,
    fontWeight: '700',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  editProfileSection: {
    alignItems: 'center',
    gap: 12,
  },
  editProfilePictureButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  editProfileImage: {
    width: '100%',
    height: '100%',
  },
  editProfileInitials: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editProfileLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  photoOptions: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  photoOptionEmoji: {
    fontSize: 24,
  },
  photoOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  photoOptionDivider: {
    height: 1,
  },
  editFormSection: {
    gap: 12,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  editInput: {
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
});
