import { NextResponse } from 'next/server';
import type { WeekSchedule } from '@/types';
import { generateICalContent } from '@/lib/ical';

// In-memory storage (shared with parent route via module-level variable)
// Note: In production, this should be in a database or Redis
declare global {
  var icalFeedsStore: Map<string, { schedule: WeekSchedule; timestamp: number }> | undefined;
}

if (!global.icalFeedsStore) {
  global.icalFeedsStore = new Map();
}

// GET /api/ical/[feedId] - Serve iCal feed
export async function GET(
  request: Request,
  { params }: { params: Promise<{ feedId: string }> }
) {
  try {
    const { feedId } = await params;

    if (!feedId || !global.icalFeedsStore?.has(feedId)) {
      return new NextResponse('Feed not found or expired', { status: 404 });
    }

    const { schedule } = global.icalFeedsStore.get(feedId)!;
    const content = generateICalContent(schedule);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (error) {
    console.error('iCal feed error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
