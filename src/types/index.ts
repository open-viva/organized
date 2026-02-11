// ClasseViva API types
export interface ClasseVivaEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: 'homework' | 'test' | 'event' | 'note' | 'other';
  subject?: string;
  author?: string;
}

export interface ClasseVivaCredentials {
  email?: string;
  password?: string;
  studentId?: string;
  sessionCookie?: string;
  loginType?: 'email' | 'userid';
}

export interface ClasseVivaSession {
  PHPSESSID: string;
  WebRole: string;
  WebIdentity: string;
  classeId?: string;
  // Backend session token (for chemediaho backend)
  backendAuthenticated?: boolean;
}

// Backend configuration
export interface BackendConfig {
  url: string;
  apiKey?: string;
}

// Grades data from backend
export interface GradeInfo {
  decimalValue: number;
  displayValue: string;
  date: string;
  type: string;
  notes?: string;
  isBlue?: boolean;
}

export interface SubjectGrades {
  grades: GradeInfo[];
  avr: number;
}

export interface PeriodGrades {
  [subject: string]: SubjectGrades | number;
  period_avr: number;
}

export interface GradesData {
  [period: string]: PeriodGrades | number;
  all_avr: number;
}

export interface WeekData {
  events: ClasseVivaEvent[];
  startDate: string;
  endDate: string;
}

// AI Organized Schedule types
export interface OrganizedTask {
  id: string;
  title: string;
  description: string;
  date: string;
  timeSlot: string;
  duration: number; // in minutes
  priority: 'high' | 'medium' | 'low';
  category: 'study' | 'homework' | 'test_prep' | 'review' | 'break' | 'other';
  relatedEvent?: ClasseVivaEvent;
  completed: boolean;
}

export interface DaySchedule {
  date: string;
  tasks: OrganizedTask[];
  summary: string;
}

export interface WeekSchedule {
  days: DaySchedule[];
  overview: string;
  tips: string[];
}

// Notion Integration types
export interface NotionIntegration {
  accessToken: string;
  databaseId?: string;
  pageId?: string;
}

// iCal types
export interface ICalEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
}

// Auth State
export interface AuthState {
  isLoggedIn: boolean;
  loginMethod: 'email' | 'studentId' | null;
  credentials: ClasseVivaCredentials | null;
  session: ClasseVivaSession | null;
}

// App State
export interface AppState {
  auth: AuthState;
  weekData: WeekData | null;
  organizedSchedule: WeekSchedule | null;
  isLoading: boolean;
  error: string | null;
  notionIntegration: NotionIntegration | null;
  // Backend configuration
  backendConfig: BackendConfig | null;
  gradesData: GradesData | null;
}
