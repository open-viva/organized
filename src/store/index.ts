import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuthState,
  WeekData,
  WeekSchedule,
  NotionIntegration,
  ClasseVivaCredentials,
  ClasseVivaSession,
  BackendConfig,
  GradesData,
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

  // Backend Configuration
  backendConfig: BackendConfig | null;
  setBackendConfig: (config: BackendConfig | null) => void;

  // OpenAI Configuration
  openaiApiKey: string | null;
  setOpenAIApiKey: (apiKey: string | null) => void;

  // Grades Data (from backend)
  gradesData: GradesData | null;
  setGradesData: (data: GradesData | null) => void;

  // Reset
  reset: () => void;
}

const initialAuthState: AuthState = {
  isLoggedIn: false,
  loginMethod: null,
  credentials: null,
  session: null,
};

// Default backend URL from environment
const defaultBackendUrl = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000')
  : 'http://localhost:5000';

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
          gradesData: null,
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

      // Backend Configuration
      backendConfig: { url: defaultBackendUrl },
      setBackendConfig: (config) => set({ backendConfig: config }),

      // OpenAI Configuration
      openaiApiKey: null,
      setOpenAIApiKey: (apiKey) => set({ openaiApiKey: apiKey }),

      // Grades Data
      gradesData: null,
      setGradesData: (data) => set({ gradesData: data }),

      // Reset
      reset: () =>
        set({
          auth: initialAuthState,
          weekData: null,
          organizedSchedule: null,
          isLoading: false,
          error: null,
          notionIntegration: null,
          gradesData: null,
        }),
    }),
    {
      name: 'organized-storage',
      partialize: (state) => ({
        auth: state.auth,
        notionIntegration: state.notionIntegration,
        backendConfig: state.backendConfig,
        openaiApiKey: state.openaiApiKey,
      }),
    }
  )
);
