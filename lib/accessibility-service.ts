import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Accessibility Service
 * Manages accessibility features like high-contrast mode and text scaling.
 */

export interface AccessibilitySettings {
  highContrastMode: boolean;
  textScaleFactor: number; // 1.0 = normal, 1.5 = 50% larger, etc.
  reduceMotion: boolean;
  largeButtons: boolean;
}

const ACCESSIBILITY_STORAGE_KEY = '@legacybox_accessibility';

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrastMode: false,
  textScaleFactor: 1.0,
  reduceMotion: false,
  largeButtons: false,
};

/**
 * Get current accessibility settings
 */
export async function getAccessibilitySettings(): Promise<AccessibilitySettings> {
  try {
    const stored = await AsyncStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting accessibility settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save accessibility settings
 */
export async function saveAccessibilitySettings(settings: Partial<AccessibilitySettings>): Promise<void> {
  try {
    const current = await getAccessibilitySettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving accessibility settings:', error);
  }
}

/**
 * Toggle high-contrast mode
 */
export async function toggleHighContrastMode(): Promise<boolean> {
  const settings = await getAccessibilitySettings();
  const newValue = !settings.highContrastMode;
  await saveAccessibilitySettings({ highContrastMode: newValue });
  return newValue;
}

/**
 * Set text scale factor
 */
export async function setTextScaleFactor(factor: number): Promise<void> {
  // Clamp between 0.8 and 2.0
  const clampedFactor = Math.max(0.8, Math.min(2.0, factor));
  await saveAccessibilitySettings({ textScaleFactor: clampedFactor });
}

/**
 * Increase text size
 */
export async function increaseTextSize(): Promise<number> {
  const settings = await getAccessibilitySettings();
  const newFactor = Math.min(2.0, settings.textScaleFactor + 0.1);
  await setTextScaleFactor(newFactor);
  return newFactor;
}

/**
 * Decrease text size
 */
export async function decreaseTextSize(): Promise<number> {
  const settings = await getAccessibilitySettings();
  const newFactor = Math.max(0.8, settings.textScaleFactor - 0.1);
  await setTextScaleFactor(newFactor);
  return newFactor;
}

/**
 * Reset text size to normal
 */
export async function resetTextSize(): Promise<void> {
  await setTextScaleFactor(1.0);
}

/**
 * Toggle reduce motion
 */
export async function toggleReduceMotion(): Promise<boolean> {
  const settings = await getAccessibilitySettings();
  const newValue = !settings.reduceMotion;
  await saveAccessibilitySettings({ reduceMotion: newValue });
  return newValue;
}

/**
 * Toggle large buttons
 */
export async function toggleLargeButtons(): Promise<boolean> {
  const settings = await getAccessibilitySettings();
  const newValue = !settings.largeButtons;
  await saveAccessibilitySettings({ largeButtons: newValue });
  return newValue;
}

/**
 * Get high-contrast color palette
 * Returns enhanced colors for better visibility
 */
export function getHighContrastColors(isDark: boolean): Record<string, string> {
  if (isDark) {
    return {
      primary: '#FFFF00', // Bright yellow
      background: '#000000', // Pure black
      surface: '#1A1A1A', // Very dark gray
      foreground: '#FFFFFF', // Pure white
      muted: '#CCCCCC', // Light gray
      border: '#FFFFFF', // White border
      success: '#00FF00', // Bright green
      warning: '#FFFF00', // Bright yellow
      error: '#FF0000', // Bright red
      accent: '#00FFFF', // Bright cyan
    };
  } else {
    return {
      primary: '#0000FF', // Bright blue
      background: '#FFFFFF', // Pure white
      surface: '#F0F0F0', // Very light gray
      foreground: '#000000', // Pure black
      muted: '#333333', // Dark gray
      border: '#000000', // Black border
      success: '#008000', // Dark green
      warning: '#FF8800', // Dark orange
      error: '#CC0000', // Dark red
      accent: '#0088CC', // Dark cyan
    };
  }
}

/**
 * Calculate scaled font size
 */
export function getScaledFontSize(baseSize: number, scaleFactor: number): number {
  return Math.round(baseSize * scaleFactor);
}

/**
 * Calculate scaled padding/margin
 */
export function getScaledSpacing(baseSpacing: number, scaleFactor: number): number {
  return Math.round(baseSpacing * scaleFactor);
}

/**
 * Get button size based on accessibility settings
 */
export function getButtonSize(largeButtons: boolean): { paddingVertical: number; paddingHorizontal: number; fontSize: number } {
  if (largeButtons) {
    return {
      paddingVertical: 20,
      paddingHorizontal: 24,
      fontSize: 20,
    };
  }
  return {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  };
}

/**
 * Check if animations should be reduced
 */
export async function shouldReduceMotion(): Promise<boolean> {
  const settings = await getAccessibilitySettings();
  return settings.reduceMotion;
}

/**
 * Get animation duration based on reduce motion setting
 */
export async function getAnimationDuration(baseDuration: number): Promise<number> {
  const shouldReduce = await shouldReduceMotion();
  return shouldReduce ? 0 : baseDuration;
}
