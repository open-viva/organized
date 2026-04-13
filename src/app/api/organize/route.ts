import { NextResponse } from 'next/server';
import type { ClasseVivaEvent, SavedSchedule } from '@/types';
import { generateOrganizedSchedule, generateDemoSchedule } from '@/lib/ai-organizer';

// POST /api/organize - Generate organized schedule
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { events, startDate, endDate, demo, includeSunday, historySchedules } = body as {
      events: ClasseVivaEvent[];
      startDate: string;
      endDate: string;
      demo?: boolean;
      includeSunday?: boolean;
      historySchedules?: SavedSchedule[];
    };

    if (!events || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Events, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Use demo mode if no Gemini key is configured
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const useDemo = demo || !geminiApiKey;

    let schedule;
    if (useDemo) {
      schedule = generateDemoSchedule(events, startDate, endDate, {
        includeSunday: Boolean(includeSunday),
        historySchedules: historySchedules || [],
      });
    } else {
      schedule = await generateOrganizedSchedule(events, startDate, endDate, {
        apiKey: geminiApiKey,
        includeSunday: Boolean(includeSunday),
        historySchedules: historySchedules || [],
      });
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
