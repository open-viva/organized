import { NextResponse } from 'next/server';
import type { ClasseVivaCredentials, ClasseVivaSession, BackendConfig } from '@/types';
import {
  loginWithEmail,
  loginWithStudentId,
  fetchEventsWithEmail,
  fetchEventsWithStudentId,
  getWeekBoundaries,
  getCurrentSchoolYear,
  loginViaBackend,
  fetchGradesFromBackend,
  convertGradesToEvents,
  refreshGradesFromBackend,
  logoutFromBackend,
} from '@/lib/classeviva';

// POST /api/classeviva - Login and fetch data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, credentials, session, backendConfig, useBackend } = body as {
      action: 'login' | 'fetch' | 'refresh' | 'logout';
      credentials?: ClasseVivaCredentials;
      session?: ClasseVivaSession & { token?: string; studentId?: string };
      backendConfig?: BackendConfig;
      useBackend?: boolean;
    };

    // ==========================================================================
    // BACKEND MODE: Use chemediaho backend for API calls
    // ==========================================================================
    if (useBackend && backendConfig) {
      if (action === 'login') {
        if (!credentials) {
          return NextResponse.json({ error: 'Credentials required' }, { status: 400 });
        }

        const userId = credentials.email || credentials.studentId || '';
        const password = credentials.password || '';
        const loginType = credentials.loginType || (credentials.email ? 'email' : 'userid');

        const result = await loginViaBackend(userId, password, loginType, backendConfig);
        
        if (result.success) {
          // After login, fetch grades using the session cookie from login
          const sessionCookie = result.session?.backendSessionCookie;
          const gradesResult = await fetchGradesFromBackend(backendConfig, sessionCookie);
          
          return NextResponse.json({
            success: true,
            session: result.session,
            method: loginType,
            grades: gradesResult.success ? gradesResult.grades : null,
          });
        }
        return NextResponse.json({ error: result.error }, { status: 401 });
      }

      if (action === 'fetch') {
        // Get session cookie from the stored session
        const sessionCookie = session?.backendSessionCookie;
        
        // Fetch grades from backend and convert to events
        const gradesResult = await fetchGradesFromBackend(backendConfig, sessionCookie);
        
        if (!gradesResult.success || !gradesResult.grades) {
          return NextResponse.json({ error: gradesResult.error }, { status: 500 });
        }

        // Convert grades to study events
        const events = convertGradesToEvents(gradesResult.grades);
        const { start, end } = getWeekBoundaries();

        return NextResponse.json({
          success: true,
          events,
          grades: gradesResult.grades,
          startDate: start,
          endDate: end,
        });
      }

      if (action === 'refresh') {
        // Get session cookie from the stored session
        const sessionCookie = session?.backendSessionCookie;
        
        const result = await refreshGradesFromBackend(backendConfig, sessionCookie);
        
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        const events = result.grades ? convertGradesToEvents(result.grades) : [];
        const { start, end } = getWeekBoundaries();

        return NextResponse.json({
          success: true,
          events,
          grades: result.grades,
          startDate: start,
          endDate: end,
        });
      }

      if (action === 'logout') {
        // Get session cookie from the stored session
        const sessionCookie = session?.backendSessionCookie;
        
        await logoutFromBackend(backendConfig, sessionCookie);
        return NextResponse.json({ success: true });
      }
    }

    // ==========================================================================
    // DIRECT MODE: Call ClasseViva APIs directly (may be blocked by WAF)
    // ==========================================================================
    if (action === 'login') {
      if (!credentials) {
        return NextResponse.json({ error: 'Credentials required' }, { status: 400 });
      }

      if (credentials.email && credentials.password) {
        // Email-based login
        const result = await loginWithEmail(credentials.email, credentials.password);
        if (result.success) {
          return NextResponse.json({
            success: true,
            session: result.session,
            method: 'email',
          });
        }
        return NextResponse.json({ error: result.error }, { status: 401 });
      }

      if (credentials.studentId && credentials.password) {
        // Student ID-based login
        const result = await loginWithStudentId(credentials.studentId, credentials.password);
        if (result.success) {
          return NextResponse.json({
            success: true,
            session: {
              token: result.token,
              studentId: result.studentId,
            },
            method: 'studentId',
          });
        }
        return NextResponse.json({ error: result.error }, { status: 401 });
      }

      return NextResponse.json({ error: 'Invalid credentials format' }, { status: 400 });
    }

    if (action === 'fetch') {
      if (!session) {
        return NextResponse.json({ error: 'Session required' }, { status: 400 });
      }

      const { start, end } = getWeekBoundaries();
      const schoolYear = getCurrentSchoolYear();

      // Determine which fetch method to use
      if (session.token && session.studentId) {
        // REST API fetch
        const result = await fetchEventsWithStudentId(
          session.token,
          session.studentId,
          start,
          end
        );
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            events: result.events,
            startDate: start,
            endDate: end,
          });
        }
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      if (session.PHPSESSID) {
        // Web endpoint fetch
        const result = await fetchEventsWithEmail(session, start, end, schoolYear);
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            events: result.events,
            startDate: start,
            endDate: end,
          });
        }
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ error: 'Invalid session format' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('ClasseViva API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
