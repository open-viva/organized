import type { ClasseVivaEvent, ClasseVivaSession } from '@/types';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';

const BASE_URL = 'https://web.spaggiari.eu';
const USER_AGENT = 'CVVS/std/4.1.7 android/10';

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

// Fetch events using email-based endpoint (POST)
export async function fetchEventsWithEmail(
  session: ClasseVivaSession,
  startDate: string,
  endDate: string,
  schoolYear: string
): Promise<FetchEventsResponse> {
  try {
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

// Login with email and password
export async function loginWithEmail(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
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

// Login with student ID and password (REST API)
export async function loginWithStudentId(
  uid: string,
  pass: string
): Promise<{ success: boolean; token?: string; studentId?: string; error?: string }> {
  try {
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
