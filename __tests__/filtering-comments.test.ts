import { describe, it, expect } from 'vitest';
import type { Memory, Comment, FamilyMember } from '../shared/app-types';

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: '1',
    theme: 'childhood',
    title: 'Test Story',
    recordingType: 'audio',
    fileUri: 'file:///audio/test.m4a',
    recordedBy: 'Grandma',
    recordedByMemberId: 'm1',
    createdAt: new Date().toISOString(),
    comments: [],
    ...overrides,
  };
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c1',
    memberId: 'm2',
    text: 'Great story!',
    timestamp: new Date().toISOString(),
    reactions: {},
    ...overrides,
  };
}

describe('Member Filtering Logic', () => {
  const memories: Memory[] = [
    makeMemory({ id: '1', recordedBy: 'Grandma', recordedByMemberId: 'm1' }),
    makeMemory({ id: '2', recordedBy: 'Grandpa', recordedByMemberId: 'm2' }),
    makeMemory({ id: '3', recordedBy: 'Grandma', recordedByMemberId: 'm1' }),
  ];

  it('filters memories by member name', () => {
    const query = 'Grandma';
    const filtered = memories.filter(m => m.recordedBy === query);
    expect(filtered).toHaveLength(2);
    expect(filtered.every(m => m.recordedBy === 'Grandma')).toBe(true);
  });

  it('filters memories by member ID', () => {
    const memberId = 'm2';
    const filtered = memories.filter(m => m.recordedByMemberId === memberId);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('returns all memories when no filter is applied', () => {
    const filtered = memories;
    expect(filtered).toHaveLength(3);
  });
});

describe('Comments and Reactions Logic', () => {
  it('adds a comment to a memory', () => {
    const memory = makeMemory();
    const comment = makeComment();
    const updatedMemory = {
      ...memory,
      comments: [...(memory.comments ?? []), comment],
    };
    expect(updatedMemory.comments).toHaveLength(1);
    expect(updatedMemory.comments![0].text).toBe('Great story!');
  });

  it('toggles a reaction on a comment', () => {
    const comment = makeComment({
      reactions: { '❤️': ['m1'] }
    });
    
    const emoji = '❤️';
    const memberId = 'm1';
    
    // Toggle off
    const currentReactions = comment.reactions[emoji] ?? [];
    const updatedReactions = currentReactions.includes(memberId)
      ? currentReactions.filter(id => id !== memberId)
      : [...currentReactions, memberId];
    
    const updatedComment = {
      ...comment,
      reactions: { ...comment.reactions, [emoji]: updatedReactions }
    };
    
    expect(updatedComment.reactions[emoji]).toHaveLength(0);
    
    // Toggle back on
    const memberId2 = 'm2';
    const currentReactions2 = updatedComment.reactions[emoji] ?? [];
    const updatedReactions2 = currentReactions2.includes(memberId2)
      ? currentReactions2.filter(id => id !== memberId2)
      : [...currentReactions2, memberId2];
      
    const updatedComment2 = {
      ...updatedComment,
      reactions: { ...updatedComment.reactions, [emoji]: updatedReactions2 }
    };
    
    expect(updatedComment2.reactions[emoji]).toHaveLength(1);
    expect(updatedComment2.reactions[emoji]).toContain('m2');
  });
});
