import { NextResponse } from 'next/server';
import type { WeekSchedule } from '@/types';

// In-memory storage for iCal feeds (shared globally)
// Note: In production, use a database or Redis
declare global {
  var icalFeedsStore: Map<string, { schedule: WeekSchedule; timestamp: number }> | undefined;
}

if (!global.icalFeedsStore) {
  global.icalFeedsStore = new Map();
}

// Cleanup old feeds (older than 7 days)
function cleanupOldFeeds() {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (!global.icalFeedsStore) return;
  
  for (const [key, value] of global.icalFeedsStore.entries()) {
    if (value.timestamp < sevenDaysAgo) {
      global.icalFeedsStore.delete(key);
    }
  }
}

// Generate a unique ID for the feed
function generateFeedId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// POST /api/ical - Create iCal feed URL
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schedule } = body as { schedule: WeekSchedule };

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule required' }, { status: 400 });
    }

    // Cleanup old feeds
    cleanupOldFeeds();

    // Generate unique feed ID
    const feedId = generateFeedId();
    
    // Store schedule with timestamp
    if (!global.icalFeedsStore) {
      global.icalFeedsStore = new Map();
    }
    global.icalFeedsStore.set(feedId, { schedule, timestamp: Date.now() });

    // Get base URL from request
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const feedUrl = `${baseUrl}/api/ical/${feedId}`;

    return NextResponse.json({
      success: true,
      feedUrl,
      message: 'Utilizza questo URL nelle impostazioni del calendario (Apple Calendar, Google Calendar, ecc.)',
    });
  } catch (error) {
    console.error('iCal API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
