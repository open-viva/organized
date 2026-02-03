import { NextResponse } from 'next/server';
import type { ClasseVivaEvent } from '@/types';
import { generateOrganizedSchedule, generateDemoSchedule } from '@/lib/ai-organizer';

// POST /api/organize - Generate organized schedule
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { events, startDate, endDate, demo } = body as {
      events: ClasseVivaEvent[];
      startDate: string;
      endDate: string;
      demo?: boolean;
    };

    if (!events || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Events, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Use demo mode if no OpenAI key or explicitly requested
    const useDemo = demo || !process.env.OPENAI_API_KEY;

    let schedule;
    if (useDemo) {
      schedule = generateDemoSchedule(events, startDate, endDate);
    } else {
      schedule = await generateOrganizedSchedule(events, startDate, endDate);
    }

    return NextResponse.json({
      success: true,
      schedule,
      isDemo: useDemo,
    });
  } catch (error) {
    console.error('Organize API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
