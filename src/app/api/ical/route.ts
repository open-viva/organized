import { NextResponse } from 'next/server';
import type { WeekSchedule } from '@/types';
import { generateICalDownload } from '@/lib/ical';

// POST /api/ical - Generate iCal file
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schedule } = body as { schedule: WeekSchedule };

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule required' }, { status: 400 });
    }

    const { content, filename } = generateICalDownload(schedule);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('iCal API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
