import * as ImagePicker from 'expo-image-picker';

export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

export async function pickVideo(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: true,
    videoMaxDuration: 300,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

export async function recordVideo(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: 300,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

export function hasPhoto(photoUri: string | null | undefined): boolean {
  return !!photoUri && photoUri.trim().length > 0;
}

/**
 * Returns a thumbnail URI for a given image URI.
 * Currently returns the same URI — can be extended to generate actual thumbnails.
 */
export function getThumbnailUri(uri: string): string {
  return uri;
}
