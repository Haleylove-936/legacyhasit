import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Story Request Service
 * Allows family members to send specific prompts/requests to the Elder.
 */

export interface StoryRequest {
  id: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  prompt: string;
  description?: string;
  createdAt: string;
  respondedAt?: string;
  respondedWithMemoryId?: string;
  status: 'pending' | 'responded' | 'declined';
}

const STORY_REQUESTS_STORAGE_KEY = '@legacybox_story_requests';

/**
 * Get all story requests
 */
export async function getStoryRequests(): Promise<StoryRequest[]> {
  try {
    const stored = await AsyncStorage.getItem(STORY_REQUESTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting story requests:', error);
    return [];
  }
}

/**
 * Create a new story request
 */
export async function createStoryRequest(
  fromMemberId: string,
  fromMemberName: string,
  toMemberId: string,
  prompt: string,
  description?: string
): Promise<StoryRequest> {
  const newRequest: StoryRequest = {
    id: Date.now().toString(),
    fromMemberId,
    fromMemberName,
    toMemberId,
    prompt,
    description,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  const requests = await getStoryRequests();
  requests.push(newRequest);
  await AsyncStorage.setItem(STORY_REQUESTS_STORAGE_KEY, JSON.stringify(requests));

  return newRequest;
}

/**
 * Get pending requests for a member
 */
export async function getPendingRequests(memberId: string): Promise<StoryRequest[]> {
  const requests = await getStoryRequests();
  return requests.filter(r => r.toMemberId === memberId && r.status === 'pending');
}

/**
 * Get requests sent by a member
 */
export async function getRequestsSentByMember(memberId: string): Promise<StoryRequest[]> {
  const requests = await getStoryRequests();
  return requests.filter(r => r.fromMemberId === memberId);
}

/**
 * Mark request as responded
 */
export async function markRequestAsResponded(
  requestId: string,
  memoryId: string
): Promise<void> {
  const requests = await getStoryRequests();
  const updated = requests.map(r =>
    r.id === requestId
      ? {
          ...r,
          status: 'responded',
          respondedAt: new Date().toISOString(),
          respondedWithMemoryId: memoryId,
        }
      : r
  );
  await AsyncStorage.setItem(STORY_REQUESTS_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Mark request as declined
 */
export async function markRequestAsDeclined(requestId: string): Promise<void> {
  const requests = await getStoryRequests();
  const updated = requests.map(r =>
    r.id === requestId
      ? {
          ...r,
          status: 'declined',
          respondedAt: new Date().toISOString(),
        }
      : r
  );
  await AsyncStorage.setItem(STORY_REQUESTS_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Delete a story request
 */
export async function deleteStoryRequest(requestId: string): Promise<void> {
  const requests = await getStoryRequests();
  const filtered = requests.filter(r => r.id !== requestId);
  await AsyncStorage.setItem(STORY_REQUESTS_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get response rate for a member (how many requests they've responded to)
 */
export async function getResponseRate(memberId: string): Promise<{ responded: number; total: number; percentage: number }> {
  const requests = await getStoryRequests();
  const memberRequests = requests.filter(r => r.toMemberId === memberId);
  const responded = memberRequests.filter(r => r.status === 'responded').length;
  const total = memberRequests.length;
  const percentage = total > 0 ? Math.round((responded / total) * 100) : 0;

  return { responded, total, percentage };
}

/**
 * Get suggested prompts for story requests
 */
export function getSuggestedPrompts(): string[] {
  return [
    'Tell us about your childhood home',
    'What was your first job like?',
    'Share a memorable travel experience',
    'Tell us about your biggest life lesson',
    'What advice would you give your younger self?',
    'Describe your favorite family tradition',
    'Tell us about a person who changed your life',
    'What makes you most proud?',
    'Share a funny story from your life',
    'What does family mean to you?',
  ];
}

/**
 * Create a weekly digest of story requests
 */
export async function generateWeeklyDigest(memberId: string): Promise<{ pending: number; responded: number; total: number }> {
  const requests = await getStoryRequests();
  const memberRequests = requests.filter(r => r.toMemberId === memberId);

  // Filter for requests from the past week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weeklyRequests = memberRequests.filter(r => new Date(r.createdAt) > oneWeekAgo);

  return {
    pending: weeklyRequests.filter(r => r.status === 'pending').length,
    responded: weeklyRequests.filter(r => r.status === 'responded').length,
    total: weeklyRequests.length,
  };
}
