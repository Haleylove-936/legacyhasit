import AsyncStorage from '@react-native-async-storage/async-storage';
import { Memory, FamilyMember } from '@/shared/app-types';

/**
 * Weekly Digest Service
 * Generates and manages weekly summaries of family memories and activities.
 */

export interface WeeklyDigest {
  id: string;
  generatedDate: string;
  weekStartDate: string;
  weekEndDate: string;
  newMemories: Memory[];
  newComments: number;
  newReactions: number;
  topMemory?: Memory;
  memberHighlights: Array<{
    memberId: string;
    memberName: string;
    storiesRecorded: number;
    engagementScore: number;
  }>;
  summary: string;
}

const DIGESTS_STORAGE_KEY = '@legacybox_weekly_digests';
const LAST_DIGEST_DATE_KEY = '@legacybox_last_digest_date';

/**
 * Generate a weekly digest
 */
export async function generateWeeklyDigest(
  memories: Memory[],
  members: FamilyMember[],
  vaultName: string
): Promise<WeeklyDigest> {
  const today = new Date();
  const weekStartDate = new Date(today);
  weekStartDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  weekStartDate.setHours(0, 0, 0, 0);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  // Filter memories from this week
  const newMemories = memories.filter(m => {
    const memDate = new Date(m.createdAt);
    return memDate >= weekStartDate && memDate <= weekEndDate;
  });

  // Count comments and reactions
  let newComments = 0;
  let newReactions = 0;
  newMemories.forEach(m => {
    newComments += m.comments?.length ?? 0;
    m.comments?.forEach(c => {
      newReactions += Object.values(c.reactions).flat().length;
    });
  });

  // Find top memory (most engaged)
  let topMemory: Memory | undefined;
  let maxEngagement = 0;
  newMemories.forEach(m => {
    const engagement = (m.comments?.length ?? 0) + 
      Object.values(m.comments?.[0]?.reactions ?? {}).flat().length;
    if (engagement > maxEngagement) {
      maxEngagement = engagement;
      topMemory = m;
    }
  });

  // Member highlights
  const memberHighlights = members.map(member => {
    const memberStories = newMemories.filter(m => m.recordedByMemberId === member.id);
    let engagementScore = 0;
    memberStories.forEach(m => {
      engagementScore += (m.comments?.length ?? 0) * 2;
      engagementScore += Object.values(m.comments?.[0]?.reactions ?? {}).flat().length;
    });

    return {
      memberId: member.id,
      memberName: member.name,
      storiesRecorded: memberStories.length,
      engagementScore,
    };
  }).filter(h => h.storiesRecorded > 0 || h.engagementScore > 0);

  // Generate summary
  const summary = generateDigestSummary(vaultName, newMemories.length, newComments, newReactions);

  const digest: WeeklyDigest = {
    id: Date.now().toString(),
    generatedDate: new Date().toISOString(),
    weekStartDate: weekStartDate.toISOString(),
    weekEndDate: weekEndDate.toISOString(),
    newMemories,
    newComments,
    newReactions,
    topMemory,
    memberHighlights,
    summary,
  };

  return digest;
}

/**
 * Save a weekly digest
 */
export async function saveWeeklyDigest(digest: WeeklyDigest): Promise<void> {
  try {
    const digests = await getWeeklyDigests();
    digests.push(digest);
    
    // Keep only last 12 weeks
    const trimmed = digests.slice(-12);
    await AsyncStorage.setItem(DIGESTS_STORAGE_KEY, JSON.stringify(trimmed));
    
    // Update last digest date
    await AsyncStorage.setItem(LAST_DIGEST_DATE_KEY, digest.generatedDate);
  } catch (error) {
    console.error('Error saving weekly digest:', error);
  }
}

/**
 * Get all weekly digests
 */
export async function getWeeklyDigests(): Promise<WeeklyDigest[]> {
  try {
    const stored = await AsyncStorage.getItem(DIGESTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting weekly digests:', error);
    return [];
  }
}

/**
 * Get the last generated digest
 */
export async function getLastDigest(): Promise<WeeklyDigest | null> {
  const digests = await getWeeklyDigests();
  return digests.length > 0 ? digests[digests.length - 1] : null;
}

/**
 * Check if digest should be generated today
 */
export async function shouldGenerateDigestToday(): Promise<boolean> {
  try {
    const lastDigestDateStr = await AsyncStorage.getItem(LAST_DIGEST_DATE_KEY);
    if (!lastDigestDateStr) return true;

    const lastDigestDate = new Date(lastDigestDateStr);
    const today = new Date();

    // Generate on Sundays (day 0)
    if (today.getDay() !== 0) return false;

    // Check if last digest was generated this week
    const daysSinceLastDigest = Math.floor((today.getTime() - lastDigestDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceLastDigest >= 7;
  } catch (error) {
    console.error('Error checking if digest should be generated:', error);
    return false;
  }
}

/**
 * Generate digest summary text
 */
function generateDigestSummary(vaultName: string, memoriesCount: number, commentsCount: number, reactionsCount: number): string {
  let summary = `📖 ${vaultName} Weekly Digest\n\n`;
  summary += `This week, your family vault grew with ${memoriesCount} new ${memoriesCount === 1 ? 'story' : 'stories'}.\n`;

  if (commentsCount > 0) {
    summary += `Family members left ${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'} `;
  }

  if (reactionsCount > 0) {
    summary += `and ${reactionsCount} ${reactionsCount === 1 ? 'reaction' : 'reactions'}. `;
  }

  summary += `\n\nKeep sharing your precious memories! 💕`;

  return summary;
}

/**
 * Format digest for email
 */
export function formatDigestForEmail(digest: WeeklyDigest): string {
  let html = `
    <html>
      <head>
        <style>
          body { font-family: Georgia, serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #C8860A; color: white; padding: 20px; border-radius: 8px; }
          .section { margin: 20px 0; padding: 15px; background: #f5f1e8; border-radius: 8px; }
          .stat { font-size: 24px; font-weight: bold; color: #C8860A; }
          .memory { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #C8860A; }
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📖 Weekly Digest</h1>
            <p>Your family's stories this week</p>
          </div>

          <div class="section">
            <h2>This Week's Highlights</h2>
            <p><span class="stat">${digest.newMemories.length}</span> new stories</p>
            <p><span class="stat">${digest.newComments}</span> comments</p>
            <p><span class="stat">${digest.newReactions}</span> reactions</p>
          </div>

          ${digest.topMemory ? `
            <div class="section">
              <h2>Most Loved Story</h2>
              <div class="memory">
                <strong>${digest.topMemory.title}</strong>
                <p>${digest.topMemory.transcript?.substring(0, 150) || 'No transcript available'}...</p>
              </div>
            </div>
          ` : ''}

          ${digest.memberHighlights.length > 0 ? `
            <div class="section">
              <h2>Family Highlights</h2>
              ${digest.memberHighlights.map(h => `
                <p><strong>${h.memberName}</strong> recorded ${h.storiesRecorded} ${h.storiesRecorded === 1 ? 'story' : 'stories'}</p>
              `).join('')}
            </div>
          ` : ''}

          <div class="footer">
            <p>LegacyBox — Preserve the stories behind the photos</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return html;
}
