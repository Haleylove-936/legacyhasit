import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { AppState, Comment, FamilyMember, FamilyVault, Memory, UserRole } from '@/shared/app-types';

const STORAGE_KEY = '@manyversions_state';

const initialState: AppState = {
  hasOnboarded: false,
  userRole: null,
  userName: '',
  familyVault: null,
  members: [],
  memories: [],
  currentPromptIndex: 0,
};

type Action =
  | { type: 'COMPLETE_ONBOARDING'; payload: { role: UserRole; name: string; vault: FamilyVault; profilePictureUri?: string | null } }
  | { type: 'ADD_MEMORY'; payload: Memory }
  | { type: 'DELETE_MEMORY'; payload: { id: string } }
  | { type: 'UPDATE_MEMORY'; payload: Memory }
  | { type: 'ADD_MEMBER'; payload: FamilyMember }
  | { type: 'UPDATE_MEMBER'; payload: FamilyMember }
  | { type: 'ADVANCE_PROMPT' }
  | { type: 'SET_REMINDER_TIME'; payload: string }
  | { type: 'MARK_PROMPT_DELIVERED'; payload: string }
  | { type: 'ADD_COMMENT'; payload: { memoryId: string; comment: Comment } }
  | { type: 'TOGGLE_REACTION'; payload: { memoryId: string; commentId: string; emoji: string; memberId: string } }
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        hasOnboarded: true,
        userRole: action.payload.role,
        userName: action.payload.name,
        familyVault: action.payload.vault,
        members: [
          {
            id: '1',
            name: action.payload.name,
            role: action.payload.role,
            joinedAt: new Date().toISOString(),
            profilePictureUri: action.payload.profilePictureUri || null,
          },
        ],
      };
    case 'ADD_MEMORY':
      return { ...state, memories: [action.payload, ...state.memories] };
    case 'DELETE_MEMORY':
      return { ...state, memories: state.memories.filter(m => m.id !== action.payload.id) };
    case 'UPDATE_MEMORY':
      return {
        ...state,
        memories: state.memories.map(m => (m.id === action.payload.id ? action.payload : m)),
      };
    case 'ADD_COMMENT':
      return {
        ...state,
        memories: state.memories.map(m =>
          m.id === action.payload.memoryId
            ? { ...m, comments: [...(m.comments ?? []), action.payload.comment] }
            : m
        ),
      };
    case 'TOGGLE_REACTION': {
      const { memoryId, commentId, emoji, memberId } = action.payload;
      return {
        ...state,
        memories: state.memories.map(m => {
          if (m.id !== memoryId) return m;
          return {
            ...m,
            comments: (m.comments ?? []).map(c => {
              if (c.id !== commentId) return c;
              const current = c.reactions[emoji] ?? [];
              const updated = current.includes(memberId)
                ? current.filter(id => id !== memberId)
                : [...current, memberId];
              return { ...c, reactions: { ...c.reactions, [emoji]: updated } };
            }),
          };
        }),
      };
    }
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] };
    case 'UPDATE_MEMBER':
      return {
        ...state,
        members: state.members.map(m => (m.id === action.payload.id ? action.payload : m)),
      };
    case 'ADVANCE_PROMPT':
      return { ...state, currentPromptIndex: state.currentPromptIndex + 1 };
    case 'SET_REMINDER_TIME':
      return { ...state, reminderTime: action.payload };
    case 'MARK_PROMPT_DELIVERED':
      return { ...state, lastPromptDeliveredDate: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addMemory: (memory: Memory, trpc?: any) => Promise<void>;
  deleteMemory: (id: string, trpc?: any) => Promise<void>;
  updateMemory: (memory: Memory, trpc?: any) => Promise<void>;
  updateMember: (member: FamilyMember) => void;
  completeOnboarding: (role: UserRole, name: string, vaultName: string, profilePictureUri?: string | null, remoteVault?: FamilyVault) => void;
  advancePrompt: () => void;
  setReminderTime: (time: string) => void;
  markPromptDelivered: (date: string) => void;
  addComment: (memoryId: string, comment: Comment) => void;
  toggleReaction: (memoryId: string, commentId: string, emoji: string, memberId: string) => void;
  syncMemories: (trpc: any) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as AppState;
          dispatch({ type: 'HYDRATE', payload: saved });
        } catch {
          // ignore parse errors
        }
      }
    });
  }, []);

  // Persist on every state change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const syncMemories = useCallback(async (trpc: any) => {
    if (!state.familyVault?.id) return;
    try {
      const remoteMemories = await trpc.sync.getMemories.query({ vaultId: state.familyVault.id });
      // Merge logic: for now, remote wins
      dispatch({ type: 'HYDRATE', payload: { ...state, memories: remoteMemories } });
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }, [state.familyVault?.id, state]);

  const addMemory = useCallback(async (memory: Memory, trpc?: any) => {
    dispatch({ type: 'ADD_MEMORY', payload: memory });
    if (trpc && state.familyVault?.id) {
      try {
        await trpc.sync.saveMemory.mutate({
          ...memory,
          vaultId: state.familyVault.id,
        });
      } catch (e) {
        console.error('Remote save failed:', e);
      }
    }
  }, [state.familyVault?.id]);

  const deleteMemory = useCallback(async (id: string, trpc?: any) => {
    dispatch({ type: 'DELETE_MEMORY', payload: { id } });
    if (trpc) {
      try {
        await trpc.sync.deleteMemory.mutate({ id });
      } catch (e) {
        console.error('Remote delete failed:', e);
      }
    }
  }, []);

  const updateMemory = useCallback(async (memory: Memory, trpc?: any) => {
    dispatch({ type: 'UPDATE_MEMORY', payload: memory });
    if (trpc && state.familyVault?.id) {
      try {
        await trpc.sync.saveMemory.mutate({
          ...memory,
          vaultId: state.familyVault.id,
        });
      } catch (e) {
        console.error('Remote update failed:', e);
      }
    }
  }, [state.familyVault?.id]);

  const updateMember = useCallback((member: FamilyMember) => {
    dispatch({ type: 'UPDATE_MEMBER', payload: member });
  }, []);

  const completeOnboarding = useCallback((role: UserRole, name: string, vaultName: string, profilePictureUri?: string | null, remoteVault?: FamilyVault) => {
    const vault: FamilyVault = remoteVault || {
      id: Date.now().toString(),
      name: vaultName,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      plan: "monthly",
      memberLimit: 10,
    };
    dispatch({ type: 'COMPLETE_ONBOARDING', payload: { role, name, vault, profilePictureUri } });
  }, []);

  const advancePrompt = useCallback(() => {
    dispatch({ type: 'ADVANCE_PROMPT' });
  }, []);

  const setReminderTime = useCallback((time: string) => {
    dispatch({ type: 'SET_REMINDER_TIME', payload: time });
  }, []);

  const markPromptDelivered = useCallback((date: string) => {
    dispatch({ type: 'MARK_PROMPT_DELIVERED', payload: date });
  }, []);

  const addComment = useCallback((memoryId: string, comment: Comment) => {
    dispatch({ type: 'ADD_COMMENT', payload: { memoryId, comment } });
  }, []);

  const toggleReaction = useCallback((memoryId: string, commentId: string, emoji: string, memberId: string) => {
    dispatch({ type: 'TOGGLE_REACTION', payload: { memoryId, commentId, emoji, memberId } });
  }, []);

  return (
    <StoreContext.Provider
      value={{ state, dispatch, addMemory, deleteMemory, updateMemory, updateMember, completeOnboarding, advancePrompt, setReminderTime, markPromptDelivered, addComment, toggleReaction, syncMemories }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export type { StoreContextValue };
