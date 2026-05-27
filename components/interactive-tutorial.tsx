import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, ScrollView } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { Fonts } from '@/lib/_core/theme';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tips: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to LegacyBox',
    description: 'Let\'s learn how to record and share your stories with your family.',
    emoji: '📖',
    tips: ['This app is designed to be easy to use', 'Large buttons and clear text make it simple', 'Your stories are precious — let\'s preserve them!'],
  },
  {
    id: 'recording',
    title: 'Recording Your Story',
    description: 'Tap the big "Record My Story" button on the home screen to start.',
    emoji: '🎙️',
    tips: ['Speak clearly and naturally', 'Take your time — there\'s no rush', 'You can re-record if you\'re not happy with it', 'Your story is saved automatically'],
  },
  {
    id: 'sharing',
    title: 'Sharing with Family',
    description: 'Your stories are automatically shared with your family vault.',
    emoji: '👨‍👩‍👧‍👦',
    tips: ['Family members can listen and react', 'They can leave comments and emojis', 'Everyone\'s stories are stored safely together'],
  },
];

interface InteractiveTutorialProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Interactive Tutorial Component
 * Provides a 3-step guide for first-time Elders to learn how to use LegacyBox.
 */
export function InteractiveTutorial({ visible, onComplete, onSkip }: InteractiveTutorialProps) {
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onSkip}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Close Button */}
          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
            onPress={onSkip}
          >
            <Text style={[styles.closeButtonText, { color: colors.muted }]}>✕</Text>
          </Pressable>

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            {TUTORIAL_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: index <= currentStep ? colors.primary : colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Emoji */}
            <Text style={styles.emoji}>{step.emoji}</Text>

            {/* Title */}
            <Text style={[styles.title, { color: colors.foreground }]}>{step.title}</Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.muted }]}>{step.description}</Text>

            {/* Tips */}
            <View style={styles.tipsContainer}>
              <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Tips:</Text>
              {step.tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Text style={[styles.tipBullet, { color: colors.primary }]}>•</Text>
                  <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handlePrevious}
              >
                <Text style={[styles.buttonText, { color: colors.foreground }]}>← Back</Text>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>
                {isLastStep ? 'Get Started' : 'Next →'}
              </Text>
            </Pressable>
          </View>

          {/* Skip Link */}
          <Pressable
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            onPress={onSkip}
          >
            <Text style={[styles.skipLink, { color: colors.muted }]}>Skip Tutorial</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 24,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 16,
  },
  closeButtonText: {
    fontSize: 28,
    fontWeight: '700',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  emoji: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts?.display,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  tipsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  tipBullet: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  skipLink: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 12,
    textDecorationLine: 'underline',
  },
});
