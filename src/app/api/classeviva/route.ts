import { NextResponse } from 'next/server';
import type { ClasseVivaCredentials, BackendConfig, ClasseVivaSession } from '@/types';
import {
  getWeekBoundaries,
  loginViaBackend,
  fetchGradesFromBackend,
  fetchAgendaFromBackend,
  refreshGradesFromBackend,
  logoutFromBackend,
} from '@/lib/classeviva';

// POST /api/classeviva - Login and fetch data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, credentials, backendConfig } = body as {
      action: 'login' | 'fetch' | 'refresh' | 'logout';
      credentials?: ClasseVivaCredentials;
      backendConfig?: BackendConfig;
      session?: ClasseVivaSession;
    };
    const session = (body as { session?: ClasseVivaSession }).session;

    // ==========================================================================
    // BACKEND MODE: Use open-viva/api backend for API calls (REQUIRED)
    // ==========================================================================
    // Backend is mandatory as direct API calls don't work reliably from hosting IPs
    if (!backendConfig) {
      return NextResponse.json({ 
        error: 'Backend configuration required. Configure a custom backend URL.' 
      }, { status: 400 });
    }

    if (action === 'login') {
      if (!credentials) {
        return NextResponse.json({ error: 'Credentials required' }, { status: 400 });
      }

      const userId = credentials.email || credentials.studentId || '';
      const password = credentials.password || '';
      const loginType = credentials.loginType || (credentials.email ? 'email' : 'userid');

      const result = await loginViaBackend(userId, password, loginType, backendConfig);
      
      if (result.success) {
        // After login, fetch grades (always fetched but not converted to events)
        const gradesResult = await fetchGradesFromBackend(backendConfig, result.session);
        
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
      // Fetch agenda events from backend
      const { start, end } = getWeekBoundaries();
      const agendaResult = await fetchAgendaFromBackend(start, end, backendConfig, session);
      
      // Check if error indicates no session
      if (!agendaResult.success && agendaResult.error?.toLowerCase().includes('no active session')) {
        return NextResponse.json({ 
          error: 'Session expired. Please log in again.' 
        }, { status: 401 });
      }
      
      if (!agendaResult.success) {
        return NextResponse.json({ error: agendaResult.error }, { status: 500 });
      }

      // Also fetch grades (stored but not converted to events)
      const gradesResult = await fetchGradesFromBackend(backendConfig, session);

      return NextResponse.json({
        success: true,
        events: agendaResult.events || [],
        grades: gradesResult.success ? gradesResult.grades : null,
        startDate: start,
        endDate: end,
      });
    }

    if (action === 'refresh') {
      // Refresh both agenda and grades
      const { start, end } = getWeekBoundaries();
      
      // Refresh grades first
      const refreshResult = await refreshGradesFromBackend(backendConfig, session);
      
      // Check if error indicates no session
      if (!refreshResult.success && refreshResult.error?.toLowerCase().includes('no active session')) {
        return NextResponse.json({ 
          error: 'Session expired. Please log in again.' 
        }, { status: 401 });
      }
      
      // Fetch fresh agenda data
      const agendaResult = await fetchAgendaFromBackend(start, end, backendConfig, session);
      
      if (!agendaResult.success) {
        return NextResponse.json({ error: agendaResult.error }, { status: 500 });
      }

      // Fetch updated grades
      const gradesResult = await fetchGradesFromBackend(backendConfig, session);

      return NextResponse.json({
        success: true,
        events: agendaResult.events || [],
        grades: gradesResult.success ? gradesResult.grades : null,
        startDate: start,
        endDate: end,
      });
    }

    if (action === 'logout') {
      await logoutFromBackend(backendConfig, session);
      return NextResponse.json({ success: true });
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
