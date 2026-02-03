import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuthState,
  WeekData,
  WeekSchedule,
  NotionIntegration,
  ClasseVivaCredentials,
  ClasseVivaSession,
} from '@/types';

interface AppStore {
  // Auth State
  auth: AuthState;
  setAuth: (auth: Partial<AuthState>) => void;
  login: (credentials: ClasseVivaCredentials, session: ClasseVivaSession, method: 'email' | 'studentId') => void;
  logout: () => void;

  // Week Data
  weekData: WeekData | null;
  setWeekData: (data: WeekData | null) => void;

  // Organized Schedule
  organizedSchedule: WeekSchedule | null;
  setOrganizedSchedule: (schedule: WeekSchedule | null) => void;

  // Loading State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error State
  error: string | null;
  setError: (error: string | null) => void;

  // Notion Integration
  notionIntegration: NotionIntegration | null;
  setNotionIntegration: (integration: NotionIntegration | null) => void;

  // Reset
  reset: () => void;
}

const initialAuthState: AuthState = {
  isLoggedIn: false,
  loginMethod: null,
  credentials: null,
  session: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Auth
      auth: initialAuthState,
      setAuth: (auth) =>
        set((state) => ({
          auth: { ...state.auth, ...auth },
        })),
      login: (credentials, session, method) =>
        set({
          auth: {
            isLoggedIn: true,
            loginMethod: method,
            credentials,
            session,
          },
        }),
      logout: () =>
        set({
          auth: initialAuthState,
          weekData: null,
          organizedSchedule: null,
        }),

      // Week Data
      weekData: null,
      setWeekData: (data) => set({ weekData: data }),

      // Organized Schedule
      organizedSchedule: null,
      setOrganizedSchedule: (schedule) => set({ organizedSchedule: schedule }),

      // Loading
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),

      // Error
      error: null,
      setError: (error) => set({ error }),

      // Notion
      notionIntegration: null,
      setNotionIntegration: (integration) => set({ notionIntegration: integration }),

      // Reset
      reset: () =>
        set({
          auth: initialAuthState,
          weekData: null,
          organizedSchedule: null,
          isLoading: false,
          error: null,
          notionIntegration: null,
        }),
    }),
    {
      name: 'organized-storage',
      partialize: (state) => ({
        auth: state.auth,
        notionIntegration: state.notionIntegration,
      }),
    }
  )
);
