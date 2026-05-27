import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ImageBackground, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const WOOD_BG = require('@/assets/images/wood-bg.jpg');

export default function WelcomeScreen() {
  const colors = useColors();
  const router = useRouter();

  const handleGetStarted = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Bypass role selection, go straight to setup with 'organizer' role
    router.push({ pathname: '/onboarding/setup', params: { role: 'organizer' } } as never);
  };

  const handleJoinFamily = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/onboarding/join' as never);
  };

  return (
    <ImageBackground source={WOOD_BG} style={styles.backgroundImage} resizeMode="cover">
      <View style={[styles.overlay, { backgroundColor: 'rgba(30, 22, 17, 0.75)' }]} />
      <View style={styles.container}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.appName, { color: '#f4ebd8' }]}>LegacyBox</Text>
          <Text style={[styles.tagline, { color: '#fdf6e3' }]}>
            Preserve the stories behind the photos.
          </Text>
          <Text style={[styles.subtitle, { color: '#d4ba94' }]}>
            A family memory vault for recording the wisdom, recipes, and life stories of those you love — before they are lost to time.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleGetStarted}
          >
            <Text style={[styles.primaryButtonText, { color: '#fdf6e3' }]}>
              Start a Family Vault
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.primary, backgroundColor: 'rgba(139, 90, 43, 0.2)' },
              pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleJoinFamily}
          >
            <Text style={[styles.secondaryButtonText, { color: '#fdf6e3' }]}>
              Join a Family Vault
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.footer, { color: '#a89f91' }]}>
          Stories stay private. Only your family can see them.
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  appName: {
    fontFamily: 'GreatVibes_400Regular',
    fontSize: 68,
    letterSpacing: 1,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  actions: {
    gap: 16,
    marginBottom: 20,
  },
  primaryButton: {
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  primaryButtonText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
  },
  secondaryButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
  },
  footer: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
