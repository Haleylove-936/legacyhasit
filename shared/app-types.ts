// LegacyBox app-specific types

export type MemoryTheme =
  | 'childhood'
  | 'recipes'
  | 'love'
  | 'work'
  | 'advice'
  | 'faith';

export type RecordingType = 'audio' | 'video' | 'photo' | 'text';

export type UserRole = 'elder' | 'organizer' | 'relative';

export interface Prompt {
  id: string;
  theme: MemoryTheme;
  text: string;
  followUp?: string;
}

export interface Comment {
  id: string;
  memberId: string;
  text: string;
  timestamp: string;
  reactions: Record<string, string[]>; // emoji -> [memberIds]
}

export interface Memory {
  id: string;
  promptId?: string;
  promptText?: string;
  theme: MemoryTheme;
  title: string;
  recordingType: 'audio' | 'video' | 'photo';
  fileUri: string;
  photoUri?: string | null;
  transcript?: string | null;
  notes?: string | null;
  recordedBy: string;
  recordedByMemberId?: string; // link to FamilyMember
  createdAt: string;
  durationSeconds?: number;
  comments?: Comment[];
}

export interface FamilyVault {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  plan?: "monthly" | "annual";
  memberLimit?: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: UserRole;
  joinedAt: string;
  profilePictureUri?: string | null;
}

export interface AppState {
  hasOnboarded: boolean;
  userRole: UserRole | null;
  userName: string;
  familyVault: FamilyVault | null;
  members: FamilyMember[];
  memories: Memory[];
  currentPromptIndex: number;
  reminderTime?: string; // HH:MM format, e.g., "09:00"
  lastPromptDeliveredDate?: string; // ISO date string
}
