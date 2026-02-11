import type { ClasseVivaEvent, ClasseVivaSession, BackendConfig, GradesData } from '@/types';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';

// Default backend URL (can be overridden via environment or user settings)
const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * Helper function to check if an error is a network connection error
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('fetch failed') ||
    message.includes('econnrefused') ||
    message.includes('networkerror') ||
    message.includes('failed to fetch') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('network request failed');
}

/**
 * Get a user-friendly error message for backend connection errors
 */
function getBackendConnectionError(backendUrl: string): string {
  return `Impossibile connettersi al backend (${backendUrl}). Assicurati che il server chemediaho sia in esecuzione oppure disabilita l'opzione "Usa backend locale" nella configurazione.`;
}

export interface LoginResponse {
  success: boolean;
  session?: ClasseVivaSession;
  error?: string;
}

export interface FetchEventsResponse {
  success: boolean;
  events?: ClasseVivaEvent[];
  error?: string;
}

export interface FetchGradesResponse {
  success: boolean;
  grades?: GradesData;
  error?: string;
}

// Parse events from ClasseViva response
function parseEvents(rawEvents: unknown[]): ClasseVivaEvent[] {
  const events: ClasseVivaEvent[] = [];
  
  if (!Array.isArray(rawEvents)) {
    return events;
  }

  for (const event of rawEvents) {
    if (typeof event !== 'object' || event === null) continue;
    
    const e = event as Record<string, unknown>;
    
    // Determine event type based on available fields
    let eventType: ClasseVivaEvent['type'] = 'other';
    const title = String(e.title || e.titolo || e.nota || '');
    const desc = String(e.description || e.descrizione || e.nota || '');
    
    if (title.toLowerCase().includes('compito') || title.toLowerCase().includes('homework')) {
      eventType = 'homework';
    } else if (title.toLowerCase().includes('verifica') || title.toLowerCase().includes('test')) {
      eventType = 'test';
    } else if (e.evtCode === 'AGN' || e.tipo === 'annotazioni') {
      eventType = 'note';
    } else if (e.evtCode === 'EVT' || e.tipo === 'eventi') {
      eventType = 'event';
    }

    events.push({
      id: String(e.id || e.evtId || Math.random().toString(36).substring(2, 11)),
      title: title || 'Evento senza titolo',
      description: desc,
      startDate: String(e.start || e.data_inizio || e.evtDatetimeBegin || new Date().toISOString()),
      endDate: String(e.end || e.data_fine || e.evtDatetimeEnd || new Date().toISOString()),
      type: eventType,
      subject: String(e.subject || e.materia || e.author || ''),
      author: String(e.author || e.autore || e.docente || ''),
    });
  }

  return events;
}

// Get current school year
export function getCurrentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // School year starts in September
  if (month >= 9) {
    return `${year}`;
  }
  return `${year - 1}`;
}

// Get week boundaries
export function getWeekBoundaries(date: Date = new Date()): { start: string; end: string } {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
  
  return {
    start: format(weekStart, 'yyyy-MM-dd'),
    end: format(weekEnd, 'yyyy-MM-dd'),
  };
}

// Convert date to timestamp (milliseconds since epoch)
function dateToTimestamp(dateStr: string): number {
  return parseISO(dateStr).getTime();
}

// Build cookie string from session
export function buildCookieString(session: ClasseVivaSession): string {
  const cookies = [
    `PHPSESSID=${session.PHPSESSID}`,
    `WebRole=${session.WebRole}`,
    `WebIdentity=${session.WebIdentity}`,
  ];
  return cookies.join('; ');
}

// =============================================================================
// BACKEND API FUNCTIONS (chemediaho backend)
// =============================================================================
// These functions call the local chemediaho Flask backend which handles
// the actual communication with ClasseViva APIs from a residential IP.
// =============================================================================

/**
 * Login via the chemediaho backend
 * Supports both email and user ID login methods
 */
export async function loginViaBackend(
  userId: string,
  password: string,
  loginType: 'email' | 'userid' = 'userid',
  backendConfig?: BackendConfig
): Promise<LoginResponse> {
  try {
    const backendUrl = backendConfig?.url || DEFAULT_BACKEND_URL;
    const headers: HeadersInit = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    
    // Add API key if configured
    if (backendConfig?.apiKey) {
      headers['X-API-Key'] = backendConfig.apiKey;
    }

    const formData = new URLSearchParams({
      user_id: userId,
      user_pass: password,
      login_type: loginType,
    });

    const response = await fetch(`${backendUrl}/login`, {
      method: 'POST',
      headers,
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Login failed: ${response.status}`,
      };
    }

    // Capture session cookie from response headers for subsequent requests
    const setCookieHeader = response.headers.get('set-cookie');
    let backendSessionCookie: string | undefined;
    if (setCookieHeader) {
      // Parse set-cookie header to extract only the cookie name-value pairs
      // The header may contain multiple cookies separated by comma (for multiple Set-Cookie headers)
      // Each cookie has attributes like HttpOnly, Secure, Path, etc. that we need to strip
      const cookies = setCookieHeader.split(',').map(cookie => {
        // Get the first part before the semicolon (the actual cookie name=value)
        const nameValue = cookie.split(';')[0].trim();
        return nameValue;
      }).filter(Boolean);
      
      backendSessionCookie = cookies.join('; ');
    }

    return {
      success: true,
      session: {
        PHPSESSID: 'backend-managed', // Session is managed by backend via backendSessionCookie
        WebRole: 'gen',
        WebIdentity: userId,
        backendAuthenticated: true,
        backendSessionCookie,
      },
    };
  } catch (error) {
    const backendUrl = backendConfig?.url || DEFAULT_BACKEND_URL;
    
    if (isNetworkError(error)) {
      return {
        success: false,
        error: getBackendConnectionError(backendUrl),
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

/**
 * Check if session is active on the backend
 */
export async function checkBackendSession(
  backendConfig?: BackendConfig
): Promise<{ authenticated: boolean }> {
  try {
    const backendUrl = backendConfig?.url || DEFAULT_BACKEND_URL;
    const headers: HeadersInit = {};
    
    if (backendConfig?.apiKey) {
      headers['X-API-Key'] = backendConfig.apiKey;
    }

    const response = await fetch(`${backendUrl}/api/session`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    const data = await response.json();
    return { authenticated: data.authenticated === true };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Fetch grades from the backend
 */
export async function fetchGradesFromBackend(
  backendConfig?: BackendConfig,
  sessionCookie?: string
): Promise<FetchGradesResponse> {
  try {
    const backendUrl = backendConfig?.url || DEFAULT_BACKEND_URL;
    const headers: HeadersInit = {};
    
    if (backendConfig?.apiKey) {
      headers['X-API-Key'] = backendConfig.apiKey;
    }

    // Include session cookie if provided
    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    const response = await fetch(`${backendUrl}/grades`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        success: false,
        error: data.error || `Failed to fetch grades: ${response.status}`,
      };
    }

    const grades = await response.json() as GradesData;
    return {
      success: true,
      grades,
    };
  } catch (error) {
    const backendUrl = backendConfig?.url || DEFAULT_BACKEND_URL;
    
    if (isNetworkError(error)) {
      return {
        success: false,
        error: getBackendConnectionError(backendUrl),
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch grades',
    };
  }
}

/**
 * Refresh grades from the backend
 */
export async function refreshGradesFromBackend(
  backendConfig?: BackendConfig,
  sessionCookie?: string
): Promise<FetchGradesResponse> {
  try {
    const backendUrl = backendConfig?.url || DEFAULT_BACKEND_URL;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (backendConfig?.apiKey) {
      headers['X-API-Key'] = backendConfig.apiKey;
    }

    // Include session cookie if provided
    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    // First refresh the grades on the backend
    const refreshResponse = await fetch(`${backendUrl}/refresh_grades`, {
      method: 'POST',
      headers,
    });

    if (!refreshResponse.ok) {
      const data = await refreshResponse.json();
      return {
        success: false,
        error: data.error || `Failed to refresh grades: ${refreshResponse.status}`,
      };
    }

    // Then fetch the updated grades
    return fetchGradesFromBackend(backendConfig, sessionCookie);
  } catch (error) {
    const backendUrl = backendConfig?.url || DEFAULT_BACKEND_URL;
    
    if (isNetworkError(error)) {
      return {
        success: false,
        error: getBackendConnectionError(backendUrl),
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh grades',
    };
  }
}

/**
 * Logout from the backend
 */
export async function logoutFromBackend(
  backendConfig?: BackendConfig,
  sessionCookie?: string
): Promise<{ success: boolean }> {
  try {
    const backendUrl = backendConfig?.url || DEFAULT_BACKEND_URL;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (backendConfig?.apiKey) {
      headers['X-API-Key'] = backendConfig.apiKey;
    }

    // Include session cookie if provided
    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    await fetch(`${backendUrl}/logout`, {
      method: 'POST',
      headers,
    });

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Convert grades data to study events for the schedule organizer.
 * Analyzes subject averages and creates suggested study sessions
 * for subjects that need attention (average below 7).
 */
export function convertGradesToEvents(grades: GradesData): ClasseVivaEvent[] {
  const events: ClasseVivaEvent[] = [];
  const now = new Date();
  
  // Extract subjects from grades and create study events
  for (const period of Object.keys(grades)) {
    if (period === 'all_avr') continue;
    
    const periodData = grades[period];
    if (typeof periodData === 'number') continue;
    
    for (const subject of Object.keys(periodData)) {
      if (subject === 'period_avr') continue;
      
      const subjectData = periodData[subject];
      if (typeof subjectData === 'number') continue;
      
      // Get the subject's average to determine priority
      const avg = subjectData.avr;
      const priority = avg < 6 ? 'high' : avg < 7 ? 'medium' : 'low';
      
      // Create a study event for subjects that need attention
      if (avg < 7) {
        events.push({
          id: `study-${subject}-${period}`,
          title: `Studio ${subject}`,
          description: `Media attuale: ${avg.toFixed(2)} - Ripasso consigliato`,
          startDate: new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: priority === 'high' ? 'test' : 'homework',
          subject: subject,
        });
      }
    }
  }
  
  return events;
}

// =============================================================================
// DIRECT CLASSEVIVA API FUNCTIONS (legacy - may be blocked by Akamai WAF)
// =============================================================================
// These functions call ClasseViva APIs directly. They may not work when
// deployed to cloud services due to Akamai WAF blocking non-residential IPs.
// Use the backend functions above for production deployments.
// =============================================================================

// Fetch events using email-based endpoint (POST)
export async function fetchEventsWithEmail(
  session: ClasseVivaSession,
  startDate: string,
  endDate: string,
  schoolYear: string
): Promise<FetchEventsResponse> {
  try {
    const BASE_URL = 'https://web.spaggiari.eu';
    const USER_AGENT = 'CVVS/std/4.1.7 android/10';
    
    const startTimestamp = dateToTimestamp(startDate);
    const endTimestamp = dateToTimestamp(endDate);
    const month = format(parseISO(startDate), 'M');
    
    const formData = new URLSearchParams({
      anno_scolastico: schoolYear,
      mese: month,
      classe_id: session.classeId || '',
      gruppo_id: '',
      nascondi_av: '0',
      start: startTimestamp.toString(),
      end: endTimestamp.toString(),
    });

    const response = await fetch(
      `${BASE_URL}/fml/app/default/agenda_studenti.php?ope=get_events`,
      {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          'Origin': BASE_URL,
          'Referer': `${BASE_URL}/fml/app/default/agenda_studenti.php`,
          'Cookie': buildCookieString(session),
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
      };
    }

    const data = await response.json();
    const events = parseEvents(data.events || data.data || data || []);
    
    return {
      success: true,
      events,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Fetch events using student ID-based endpoint (GET)
export async function fetchEventsWithStudentId(
  token: string,
  studentId: string,
  startDate: string,
  endDate: string
): Promise<FetchEventsResponse> {
  try {
    const USER_AGENT = 'CVVS/std/4.1.7 android/10';
    
    // Using the official REST API endpoint
    const response = await fetch(
      `https://web.spaggiari.eu/rest/v1/students/${studentId}/agenda/all/${startDate}/${endDate}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Z-Dev-ApiKey': '+zorro+',
          'Z-Auth-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
      };
    }

    const data = await response.json();
    const events = parseEvents(data.agenda || data.events || data || []);
    
    return {
      success: true,
      events,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Login with email and password (direct - may be blocked)
export async function loginWithEmail(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const BASE_URL = 'https://web.spaggiari.eu';
    const USER_AGENT = 'CVVS/std/4.1.7 android/10';
    
    const formData = new URLSearchParams({
      login: email,
      password: password,
      tipo_login: 'email',
    });

    const response = await fetch(
      `${BASE_URL}/auth-p7/app/default/AuthApi4.php?a=aLoginPwd`,
      {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        redirect: 'manual',
      }
    );

    // Extract cookies from response
    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) {
      return {
        success: false,
        error: 'Login failed: No session cookies received',
      };
    }

    // Parse cookies
    const cookies = setCookieHeader.split(',').reduce((acc, cookie) => {
      const [keyValue] = cookie.split(';');
      const [key, value] = keyValue.trim().split('=');
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    if (!cookies.PHPSESSID) {
      return {
        success: false,
        error: 'Login failed: Invalid credentials or session',
      };
    }

    return {
      success: true,
      session: {
        PHPSESSID: cookies.PHPSESSID,
        WebRole: cookies.WebRole || 'gen',
        WebIdentity: cookies.WebIdentity || '',
        classeId: cookies.classeId,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

// Login with student ID and password (REST API - direct)
export async function loginWithStudentId(
  uid: string,
  pass: string
): Promise<{ success: boolean; token?: string; studentId?: string; error?: string }> {
  try {
    const USER_AGENT = 'CVVS/std/4.1.7 android/10';
    
    const response = await fetch(
      'https://web.spaggiari.eu/rest/v1/auth/login',
      {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Z-Dev-ApiKey': '+zorro+',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          pass,
        }),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Login failed: ${response.status}`,
      };
    }

    const data = await response.json();
    
    if (data.token && data.ident) {
      return {
        success: true,
        token: data.token,
        studentId: data.ident,
      };
    }

    return {
      success: false,
      error: 'Login failed: Invalid response',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}
