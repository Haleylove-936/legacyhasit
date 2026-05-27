import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyMember } from '@/shared/app-types';

/**
 * Family Milestones Service
 * Tracks important dates like birthdays and anniversaries.
 */

export interface FamilyMilestone {
  id: string;
  memberId: string;
  type: 'birthday' | 'anniversary' | 'custom';
  date: string; // ISO format: YYYY-MM-DD
  title: string;
  description?: string;
  emoji: string;
}

export interface UpcomingMilestone extends FamilyMilestone {
  daysUntil: number;
  isToday: boolean;
  isSoon: boolean; // within 7 days
}

const MILESTONES_STORAGE_KEY = '@legacybox_family_milestones';

/**
 * Get all family milestones
 */
export async function getFamilyMilestones(): Promise<FamilyMilestone[]> {
  try {
    const stored = await AsyncStorage.getItem(MILESTONES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting family milestones:', error);
    return [];
  }
}

/**
 * Add a new milestone
 */
export async function addMilestone(milestone: Omit<FamilyMilestone, 'id'>): Promise<FamilyMilestone> {
  const newMilestone: FamilyMilestone = {
    ...milestone,
    id: Date.now().toString(),
  };

  const milestones = await getFamilyMilestones();
  milestones.push(newMilestone);
  await AsyncStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(milestones));

  return newMilestone;
}

/**
 * Update a milestone
 */
export async function updateMilestone(id: string, updates: Partial<FamilyMilestone>): Promise<void> {
  const milestones = await getFamilyMilestones();
  const updated = milestones.map(m =>
    m.id === id ? { ...m, ...updates } : m
  );
  await AsyncStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(id: string): Promise<void> {
  const milestones = await getFamilyMilestones();
  const filtered = milestones.filter(m => m.id !== id);
  await AsyncStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get upcoming milestones (next 30 days)
 */
export async function getUpcomingMilestones(): Promise<UpcomingMilestone[]> {
  const milestones = await getFamilyMilestones();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming: UpcomingMilestone[] = milestones
    .map(m => {
      // Parse the date (YYYY-MM-DD format)
      const [year, month, day] = m.date.split('-').map(Number);
      
      // Create a date for this year
      let milestoneDate = new Date(today.getFullYear(), month - 1, day);
      
      // If the date has already passed this year, use next year
      if (milestoneDate < today) {
        milestoneDate = new Date(today.getFullYear() + 1, month - 1, day);
      }

      const timeDiff = milestoneDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      return {
        ...m,
        daysUntil,
        isToday: daysUntil === 0,
        isSoon: daysUntil > 0 && daysUntil <= 7,
      };
    })
    .filter(m => m.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return upcoming;
}

/**
 * Get today's milestones
 */
export async function getTodaysMilestones(): Promise<FamilyMilestone[]> {
  const upcoming = await getUpcomingMilestones();
  return upcoming.filter(m => m.isToday);
}

/**
 * Get milestones for a specific member
 */
export async function getMemberMilestones(memberId: string): Promise<FamilyMilestone[]> {
  const milestones = await getFamilyMilestones();
  return milestones.filter(m => m.memberId === memberId);
}

/**
 * Add birthday for a member
 */
export async function addBirthday(memberId: string, date: string, memberName: string): Promise<FamilyMilestone> {
  return addMilestone({
    memberId,
    type: 'birthday',
    date,
    title: `${memberName}'s Birthday`,
    emoji: '🎂',
  });
}

/**
 * Add anniversary for a member
 */
export async function addAnniversary(memberId: string, date: string, title: string): Promise<FamilyMilestone> {
  return addMilestone({
    memberId,
    type: 'anniversary',
    date,
    title,
    emoji: '💍',
  });
}

/**
 * Format milestone date for display
 */
export function formatMilestoneDate(date: string): string {
  const [year, month, day] = date.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/**
 * Get age from birth date
 */
export function calculateAge(birthDate: string): number {
  const [year] = birthDate.split('-').map(Number);
  return new Date().getFullYear() - year;
}

/**
 * Check if today is someone's birthday
 */
export async function isBirthdayToday(memberId: string): Promise<boolean> {
  const todayMilestones = await getTodaysMilestones();
  return todayMilestones.some(m => m.memberId === memberId && m.type === 'birthday');
}

/**
 * Get suggested prompts for a milestone
 */
export function getSuggestedPromptsForMilestone(milestone: FamilyMilestone): string[] {
  if (milestone.type === 'birthday') {
    return [
      'Tell us a favorite memory with this person',
      'What do you love most about them?',
      'Share a funny story from their life',
      'What advice would you give them?',
    ];
  } else if (milestone.type === 'anniversary') {
    return [
      'How did you meet?',
      'What was your first impression?',
      'Share your favorite moment together',
      'What has this relationship meant to you?',
    ];
  }
  return [];
}
