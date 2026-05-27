/**
 * Background Music Service
 * Provides ambient music tracks for memory playback.
 * This is a stub that can be extended with actual audio playback.
 */

export type MusicTrack = 'piano' | 'nature' | 'jazz' | 'classical' | 'ambient' | 'none';

export interface MusicTrackInfo {
  id: MusicTrack;
  name: string;
  description: string;
  emoji: string;
  audioUrl?: string; // URL to the audio file (stub)
}

export const AVAILABLE_MUSIC_TRACKS: Record<MusicTrack, MusicTrackInfo> = {
  piano: {
    id: 'piano',
    name: 'Gentle Piano',
    description: 'Soft, reflective piano melodies',
    emoji: '🎹',
    audioUrl: 'https://example.com/music/piano.mp3',
  },
  nature: {
    id: 'nature',
    name: 'Nature Sounds',
    description: 'Peaceful birds and flowing water',
    emoji: '🌿',
    audioUrl: 'https://example.com/music/nature.mp3',
  },
  jazz: {
    id: 'jazz',
    name: 'Warm Jazz',
    description: 'Smooth, nostalgic jazz vibes',
    emoji: '🎷',
    audioUrl: 'https://example.com/music/jazz.mp3',
  },
  classical: {
    id: 'classical',
    name: 'Classical',
    description: 'Timeless classical compositions',
    emoji: '🎻',
    audioUrl: 'https://example.com/music/classical.mp3',
  },
  ambient: {
    id: 'ambient',
    name: 'Ambient',
    description: 'Ethereal, atmospheric soundscapes',
    emoji: '🌌',
    audioUrl: 'https://example.com/music/ambient.mp3',
  },
  none: {
    id: 'none',
    name: 'No Music',
    description: 'Play without background music',
    emoji: '🔇',
  },
};

/**
 * Music preference storage key
 */
const MUSIC_PREFERENCE_KEY = '@legacybox_music_preference';

/**
 * Get the user's preferred background music track
 */
export async function getPreferredMusicTrack(): Promise<MusicTrack> {
  try {
    // In a real app, this would read from AsyncStorage
    // For now, return the default
    return 'piano';
  } catch (error) {
    console.error('Error getting music preference:', error);
    return 'none';
  }
}

/**
 * Set the user's preferred background music track
 */
export async function setPreferredMusicTrack(track: MusicTrack): Promise<void> {
  try {
    // In a real app, this would write to AsyncStorage
    console.log(`Music preference set to: ${track}`);
  } catch (error) {
    console.error('Error setting music preference:', error);
  }
}

/**
 * Check if a music track is available
 */
export function isMusicTrackAvailable(track: MusicTrack): boolean {
  return track in AVAILABLE_MUSIC_TRACKS;
}

/**
 * Get information about a music track
 */
export function getMusicTrackInfo(track: MusicTrack): MusicTrackInfo | null {
  return AVAILABLE_MUSIC_TRACKS[track] || null;
}

/**
 * Stub for playing background music during memory playback
 * In production, this would use expo-av or similar library
 */
export async function playBackgroundMusic(track: MusicTrack, volume: number = 0.3): Promise<void> {
  const trackInfo = getMusicTrackInfo(track);
  if (!trackInfo || track === 'none') {
    console.log('No background music playing');
    return;
  }

  console.log(`Playing background music: ${trackInfo.name} at volume ${volume}`);
  // In production: use expo-av to load and play the audio file
}

/**
 * Stop background music playback
 */
export async function stopBackgroundMusic(): Promise<void> {
  console.log('Background music stopped');
  // In production: use expo-av to stop the audio
}

/**
 * Adjust background music volume
 */
export async function setMusicVolume(volume: number): Promise<void> {
  const clampedVolume = Math.max(0, Math.min(1, volume));
  console.log(`Background music volume set to ${clampedVolume}`);
  // In production: use expo-av to adjust volume
}
