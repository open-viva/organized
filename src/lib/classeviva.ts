import type { ClasseVivaEvent, ClasseVivaSession, BackendConfig, GradesData } from '@/types';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';

// Default backend URL (open-viva/api first, legacy fallback)
const DEFAULT_BACKEND_URL =
  process.env.NEXT_PUBLIC_OPENVIVA_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3000';

function normalizeBaseUrl(url: string): string {
  let value = url.trim();
  while (value.endsWith('/')) {
    value = value.slice(0, -1);
  }
  return value;
}

function resolveBackendBaseUrl(): string {
  // Security hardening: backend endpoint is deployer-controlled via env variable.
  return normalizeBaseUrl(DEFAULT_BACKEND_URL);
}

function buildBackendHeaders(backendConfig?: BackendConfig, sessionId?: string): HeadersInit {
  const headers: HeadersInit = {};
  if (backendConfig?.apiKey) {
    headers['X-API-Key'] = backendConfig.apiKey;
  }
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }
  return headers;
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

function extractEventDate(event: Record<string, unknown>): { start: string; end: string } {
  const start = String(event.evtDate || event.evtDatetimeBegin || event.begin || event.date || '');
  const end = String(event.evtDatetimeEnd || event.end || start);
  return { start, end };
}

// Parse events from backend API response (/api/agenda endpoint)
// Backend returns events with fields: evtDate, title, notes, evtCode, authorName, subjectDesc
export function parseEvents(rawEvents: unknown[]): ClasseVivaEvent[] {
  const events: ClasseVivaEvent[] = [];
  
  if (!Array.isArray(rawEvents)) {
    return events;
  }

  for (const event of rawEvents) {
    if (typeof event !== 'object' || event === null) continue;
    
    const e = event as Record<string, unknown>;
    
    // Extract fields from backend API response
    // Backend provides: evtDate, title, notes, evtCode, authorName, subjectDesc
    // Also support legacy REST API fields for backward compatibility
    const title = String(e.title || e.evtText || e.eventText || '').trim();
    const description = String(e.notes || e.note || '').trim();
    const subject = String(e.subjectDesc || e.subject || '').trim();
    const author = String(e.authorName || '').trim();
    
    // If title is empty, use subject or professor name as fallback
    const displayTitle = title || subject || author || 'Evento senza titolo';
    
    // Parse date from backend fields:
    // - open-viva/api: begin/end
    // - legacy chemediaho/web endpoints: evtDate / evtDatetimeBegin / evtDatetimeEnd
    const { start: eventDate, end: endDate } = extractEventDate(e);
    
    // Validate that we have a date, otherwise skip this event
    if (!eventDate) continue;
    
    // Determine event type based on evtCode or content
    // Event codes: AGNT = homework/assignment, AGSV = test/verification, AGN = note, EVT = event
    let eventType: ClasseVivaEvent['type'] = 'other';
    const evtCode = String(e.evtCode || '');
    
    if (evtCode === 'AGNT' || displayTitle.toLowerCase().includes('compito') || displayTitle.toLowerCase().includes('homework')) {
      eventType = 'homework';
    } else if (evtCode === 'AGSV' || displayTitle.toLowerCase().includes('verifica') || displayTitle.toLowerCase().includes('test')) {
      eventType = 'test';
    } else if (evtCode === 'AGN') {
      eventType = 'note';
    } else if (evtCode === 'EVT') {
      eventType = 'event';
    }

    // Only add events that have at least a title, subject, or author
    if (displayTitle !== 'Evento senza titolo' || description) {
      events.push({
        id: String(e.evtId || e.id || Math.random().toString(36).substring(2, 11)),
        title: displayTitle,
        description: description,
        startDate: eventDate,
        endDate: endDate,
        type: eventType,
        subject: subject,
        author: author,
      });
    }
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
 * Login via open-viva/api (preferred) with fallback to legacy chemediaho backend.
 */
export async function loginViaBackend(
  userId: string,
  password: string,
  loginType: 'email' | 'userid' = 'userid',
  backendConfig?: BackendConfig
): Promise<LoginResponse> {
  const backendUrl = resolveBackendBaseUrl();
  let openVivaLoginError = '';

  // 1) open-viva/api style: POST /api/login (json) -> x-session-id
  try {
    const response = await fetch(`${backendUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildBackendHeaders(backendConfig),
      },
      body: JSON.stringify(
        loginType === 'email'
          ? { username: userId, password }
          : { uid: userId, password }
      ),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        sessionId?: string;
        studentId?: string;
        profile?: { ident?: string };
      };
      const headerSessionId = response.headers.get('x-session-id') || undefined;
      const backendSessionId = data.sessionId || headerSessionId;

      if (!backendSessionId) {
        return { success: false, error: 'Login riuscito ma sessione non ricevuta dal backend' };
      }

      return {
        success: true,
        session: {
          PHPSESSID: 'backend-session',
          WebRole: 'gen',
          WebIdentity: userId,
          backendAuthenticated: true,
          backendSessionId,
          studentId: data.studentId || data.profile?.ident,
        },
      };
    }
    openVivaLoginError = `open-viva/api login failed: ${response.status} ${response.statusText}`;
  } catch (error) {
    openVivaLoginError = error instanceof Error ? error.message : 'Errore sconosciuto';
    console.warn('open-viva/api login failed, using legacy fallback:', error);
  }

  // 2) Legacy chemediaho fallback: POST /login (form-urlencoded + cookies)
  // Note: legacy chemediaho backend exposes login at root /login.
  try {
    const response = await fetch(`${backendUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...buildBackendHeaders(backendConfig),
      },
      body: new URLSearchParams({
        user_id: userId,
        user_pass: password,
        login_type: loginType,
      }).toString(),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Login failed: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText) as { error?: string };
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `Login failed: ${response.status} ${response.statusText}`;
      }
      return { success: false, error: errorMessage };
    }

    const data = (await response.json()) as { success?: boolean; error?: string };
    if (!data.success) {
      return { success: false, error: data.error || 'Login failed' };
    }

    return {
      success: true,
      session: {
        PHPSESSID: 'backend-session',
        WebRole: 'gen',
        WebIdentity: userId,
        backendAuthenticated: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: openVivaLoginError
        ? `Login failed (open-viva/api + fallback legacy): ${openVivaLoginError}`
        : (error instanceof Error ? error.message : 'Login failed'),
    };
  }
}

/**
 * Check if session is active on the backend
 */
export async function checkBackendSession(
  backendConfig?: BackendConfig
): Promise<{ authenticated: boolean }> {
  const backendUrl = resolveBackendBaseUrl();
  const headers = buildBackendHeaders(backendConfig);

  try {
    const response = await fetch(`${backendUrl}/api/session`, {
      method: 'GET',
      headers,
    });
    if (response.ok) {
      const data = (await response.json()) as { authenticated?: boolean };
      return { authenticated: data.authenticated === true };
    }
  } catch {
    // fallback below
  }

  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers,
    });
    return { authenticated: response.ok };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Fetch grades from the backend
 */
export async function fetchGradesFromBackend(
  backendConfig?: BackendConfig,
  session?: ClasseVivaSession
): Promise<FetchGradesResponse> {
  const backendUrl = resolveBackendBaseUrl();

  // 1) open-viva/api style: GET /api/grades + x-session-id
  try {
    const response = await fetch(`${backendUrl}/api/grades`, {
      method: 'GET',
      headers: buildBackendHeaders(backendConfig, session?.backendSessionId),
    });

    if (response.ok) {
      const grades = (await response.json()) as GradesData;
      return { success: true, grades };
    }
  } catch (error) {
    console.warn('open-viva/api grades fetch failed, using legacy fallback:', error);
  }

  // 2) Legacy chemediaho fallback: GET /grades + cookies
  try {
    const response = await fetch(`${backendUrl}/grades`, {
      method: 'GET',
      headers: buildBackendHeaders(backendConfig),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch grades: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText) as { error?: string };
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `Failed to fetch grades: ${response.status} ${response.statusText}`;
      }
      return { success: false, error: errorMessage };
    }
    const grades = await response.json() as GradesData;
    return { success: true, grades };
  } catch (error) {
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
  session?: ClasseVivaSession
): Promise<FetchGradesResponse> {
  const backendUrl = resolveBackendBaseUrl();

  // open-viva/api has no dedicated refresh endpoint: fetch is enough.
  if (session?.backendSessionId) {
    return fetchGradesFromBackend(backendConfig, session);
  }

  // Legacy fallback
  try {
    const refreshResponse = await fetch(`${backendUrl}/refresh_grades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildBackendHeaders(backendConfig),
      },
      credentials: 'include',
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      let errorMessage = `Failed to refresh grades: ${refreshResponse.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `Failed to refresh grades: ${refreshResponse.status} ${refreshResponse.statusText}`;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    return fetchGradesFromBackend(backendConfig, session);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh grades',
    };
  }
}

/**
 * Fetch agenda events from the backend for a specific time period
 */
export async function fetchAgendaFromBackend(
  startDate: string,
  endDate: string,
  backendConfig?: BackendConfig,
  session?: ClasseVivaSession
): Promise<FetchEventsResponse> {
  const backendUrl = resolveBackendBaseUrl();

  // 1) open-viva/api style: /api/agenda?begin=...&end=...
  try {
    const response = await fetch(`${backendUrl}/api/agenda?begin=${startDate}&end=${endDate}`, {
      method: 'GET',
      headers: buildBackendHeaders(backendConfig, session?.backendSessionId),
    });

    if (response.ok) {
      const data = (await response.json()) as { agenda?: unknown[] };
      const events = parseEvents(data.agenda || []);
      return { success: true, events };
    }
  } catch (error) {
    console.warn('open-viva/api agenda fetch failed, using legacy fallback:', error);
  }

  // 2) Legacy chemediaho fallback: /api/agenda?start=...&end=...
  try {
    const response = await fetch(`${backendUrl}/api/agenda?start=${startDate}&end=${endDate}`, {
      method: 'GET',
      headers: buildBackendHeaders(backendConfig),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch agenda: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText) as { error?: string };
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `Failed to fetch agenda: ${response.status} ${response.statusText}`;
      }
      return { success: false, error: errorMessage };
    }
    const data = await response.json();
    const events = parseEvents(data.events || data.agenda || []);
    return { success: true, events };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch agenda',
    };
  }
}

/**
 * Logout from the backend
 */
export async function logoutFromBackend(
  backendConfig?: BackendConfig,
  session?: ClasseVivaSession
): Promise<{ success: boolean }> {
  const backendUrl = resolveBackendBaseUrl();

  // open-viva/api has compatibility logout route
  try {
    await fetch(`${backendUrl}/api/chemediaho/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildBackendHeaders(backendConfig, session?.backendSessionId),
      },
    });
    return { success: true };
  } catch (error) {
    console.warn('open-viva/api logout failed, using legacy fallback:', error);
  }

  try {
    await fetch(`${backendUrl}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildBackendHeaders(backendConfig),
      },
      credentials: 'include',
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
