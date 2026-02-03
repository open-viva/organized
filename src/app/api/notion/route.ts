import { NextResponse } from 'next/server';
import type { WeekSchedule, NotionIntegration } from '@/types';
import {
  createNotionPage,
  addToNotionDatabase,
  verifyNotionConnection,
  searchNotionPages,
} from '@/lib/notion';

// POST /api/notion - Notion integration actions
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, accessToken, integration, schedule, parentPageId, query } = body as {
      action: 'verify' | 'search' | 'createPage' | 'addToDatabase';
      accessToken?: string;
      integration?: NotionIntegration;
      schedule?: WeekSchedule;
      parentPageId?: string;
      query?: string;
    };

    switch (action) {
      case 'verify': {
        if (!accessToken) {
          return NextResponse.json({ error: 'Access token required' }, { status: 400 });
        }
        const result = await verifyNotionConnection(accessToken);
        return NextResponse.json(result);
      }

      case 'search': {
        if (!accessToken) {
          return NextResponse.json({ error: 'Access token required' }, { status: 400 });
        }
        const result = await searchNotionPages(accessToken, query || '');
        return NextResponse.json(result);
      }

      case 'createPage': {
        if (!integration || !schedule) {
          return NextResponse.json(
            { error: 'Integration and schedule required' },
            { status: 400 }
          );
        }
        const result = await createNotionPage(integration, schedule, parentPageId);
        return NextResponse.json(result);
      }

      case 'addToDatabase': {
        if (!integration || !schedule) {
          return NextResponse.json(
            { error: 'Integration and schedule required' },
            { status: 400 }
          );
        }
        const result = await addToNotionDatabase(integration, schedule);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Notion API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
