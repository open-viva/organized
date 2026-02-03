import { NextResponse } from 'next/server';
import type { ClasseVivaCredentials, ClasseVivaSession } from '@/types';
import {
  loginWithEmail,
  loginWithStudentId,
  fetchEventsWithEmail,
  fetchEventsWithStudentId,
  getWeekBoundaries,
  getCurrentSchoolYear,
} from '@/lib/classeviva';

// POST /api/classeviva - Login and fetch data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, credentials, session } = body as {
      action: 'login' | 'fetch';
      credentials?: ClasseVivaCredentials;
      session?: ClasseVivaSession & { token?: string; studentId?: string };
    };

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
