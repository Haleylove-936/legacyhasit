/**
 * Profile Picture Service
 *
 * Handles profile picture selection for family members.
 * Uses expo-image-picker for camera and library access.
 */

import * as ImagePicker from 'expo-image-picker';

/**
 * Launch image picker to select a profile picture from the library.
 * Returns the URI of the selected image or null if cancelled.
 */
export async function pickProfilePictureFromLibrary(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

/**
 * Launch camera to take a profile picture.
 * Returns the URI of the captured image or null if cancelled.
 */
export async function takeProfilePicture(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

/**
 * Convenience function that shows both camera and library options.
 * Returns the URI of the selected/captured image or null if cancelled.
 */
export async function pickProfilePicture(): Promise<string | null> {
  // For now, default to library picker
  // In a full implementation, you could show an action sheet with both options
  return pickProfilePictureFromLibrary();
}

/**
 * Generate avatar initials from a name.
 * Used as fallback when no profile picture is available.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}

/**
 * Generate a color based on a member ID or name for avatar background.
 * Ensures consistent colors for the same member.
 */
export function getAvatarColor(memberId: string): string {
  const colors = [
    '#8b5a2b', // walnut (primary)
    '#d4a373', // antique gold
    '#6b3e1b', // dark walnut
    '#a67c52', // warm tan
    '#d4ba94', // light parchment
    '#806e5d', // muted brown
    '#4a7c59', // success green
    '#b8860b', // warning gold
  ];

  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = memberId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Check if a profile picture URI is valid.
 */
export function hasProfilePicture(pictureUri: string | null | undefined): boolean {
  return !!pictureUri && pictureUri.trim().length > 0;
}
