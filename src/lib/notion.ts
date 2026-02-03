import type { WeekSchedule, OrganizedTask, NotionIntegration } from '@/types';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

// Notion API base URL
const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

interface NotionBlock {
  object: 'block';
  type: string;
  [key: string]: unknown;
}

interface NotionPageProperties {
  [key: string]: unknown;
}

// Create headers for Notion API
function createHeaders(accessToken: string): HeadersInit {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

// Create a new Notion page with the schedule
export async function createNotionPage(
  integration: NotionIntegration,
  schedule: WeekSchedule,
  parentPageId?: string
): Promise<{ success: boolean; pageUrl?: string; error?: string }> {
  try {
    const blocks = buildNotionBlocks(schedule);
    const pageIdToUse = parentPageId || integration.pageId;
    
    if (!pageIdToUse) {
      return { success: false, error: 'No parent page ID provided' };
    }

    const startDate = schedule.days[0]?.date || 'week';
    const endDate = schedule.days[schedule.days.length - 1]?.date || 'week';

    const response = await fetch(`${NOTION_API_URL}/pages`, {
      method: 'POST',
      headers: createHeaders(integration.accessToken),
      body: JSON.stringify({
        parent: { page_id: pageIdToUse },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: `📅 Piano di Studio - ${format(parseISO(startDate), 'd MMMM', { locale: it })} - ${format(parseISO(endDate), 'd MMMM yyyy', { locale: it })}`,
                },
              },
            ],
          },
        },
        children: blocks,
        icon: { type: 'emoji', emoji: '📚' },
        cover: {
          type: 'external',
          external: { url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200' },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to create Notion page' };
    }

    const data = await response.json();
    return { success: true, pageUrl: data.url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Add tasks to an existing Notion database
export async function addToNotionDatabase(
  integration: NotionIntegration,
  schedule: WeekSchedule
): Promise<{ success: boolean; addedCount?: number; error?: string }> {
  try {
    if (!integration.databaseId) {
      return { success: false, error: 'No database ID provided' };
    }

    let addedCount = 0;
    
    for (const day of schedule.days) {
      for (const task of day.tasks) {
        const properties = buildDatabaseProperties(task);
        
        const response = await fetch(`${NOTION_API_URL}/pages`, {
          method: 'POST',
          headers: createHeaders(integration.accessToken),
          body: JSON.stringify({
            parent: { database_id: integration.databaseId },
            properties,
            icon: { type: 'emoji', emoji: getCategoryEmoji(task.category) },
          }),
        });

        if (response.ok) {
          addedCount++;
        }
      }
    }

    return { success: true, addedCount };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Build Notion blocks for the schedule
function buildNotionBlocks(schedule: WeekSchedule): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  
  // Overview heading
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{ type: 'text', text: { content: '📋 Panoramica Settimanale' } }],
    },
  });
  
  // Overview paragraph
  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: schedule.overview } }],
    },
  });
  
  // Tips callout
  if (schedule.tips.length > 0) {
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          {
            type: 'text',
            text: { content: '💡 Consigli:\n' + schedule.tips.map(t => `• ${t}`).join('\n') },
          },
        ],
        icon: { type: 'emoji', emoji: '💡' },
        color: 'yellow_background',
      },
    });
  }
  
  // Divider
  blocks.push({ object: 'block', type: 'divider', divider: {} });
  
  // Days
  for (const day of schedule.days) {
    const dayDate = parseISO(day.date);
    const dayName = format(dayDate, 'EEEE d MMMM', { locale: it });
    
    // Day heading
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: `📆 ${dayName}` } }],
      },
    });
    
    // Day summary
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: day.summary } }],
        color: 'gray',
      },
    });
    
    // Tasks as to-do items
    for (const task of day.tasks) {
      const emoji = getCategoryEmoji(task.category);
      const priorityLabel = getPriorityEmoji(task.priority);
      
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [
            {
              type: 'text',
              text: { content: `${emoji} ${task.timeSlot} - ${task.title} ` },
              annotations: { bold: task.priority === 'high' },
            },
            {
              type: 'text',
              text: { content: `${priorityLabel} (${task.duration}min)` },
              annotations: { color: 'gray' },
            },
          ],
          checked: task.completed,
          color: task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'default',
        },
      });
      
      // Task description as nested paragraph
      if (task.description) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: `   ↳ ${task.description}` } }],
            color: 'gray',
          },
        });
      }
    }
    
    // Spacing
    blocks.push({ object: 'block', type: 'divider', divider: {} });
  }
  
  return blocks;
}

// Build database properties for a task
function buildDatabaseProperties(task: OrganizedTask): NotionPageProperties {
  const [hours, minutes] = task.timeSlot.split(':').map(Number);
  const parsedDate = parseISO(task.date);
  const startDate = new Date(parsedDate);
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + task.duration);
  
  return {
    'Name': {
      title: [{ text: { content: task.title } }],
    },
    'Description': {
      rich_text: [{ text: { content: task.description } }],
    },
    'Date': {
      date: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    },
    'Priority': {
      select: {
        name: task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Media' : '🟢 Bassa',
      },
    },
    'Category': {
      select: { name: getCategoryLabel(task.category) },
    },
    'Status': {
      checkbox: task.completed,
    },
    'Duration': {
      number: task.duration,
    },
  };
}

// Helper functions
function getCategoryEmoji(category: OrganizedTask['category']): string {
  const emojis: Record<OrganizedTask['category'], string> = {
    study: '📚',
    homework: '✏️',
    test_prep: '📝',
    review: '🔄',
    break: '☕',
    other: '📌',
  };
  return emojis[category] || '📌';
}

function getCategoryLabel(category: OrganizedTask['category']): string {
  const labels: Record<OrganizedTask['category'], string> = {
    study: 'Studio',
    homework: 'Compiti',
    test_prep: 'Preparazione Verifica',
    review: 'Ripasso',
    break: 'Pausa',
    other: 'Altro',
  };
  return labels[category] || 'Altro';
}

function getPriorityEmoji(priority: OrganizedTask['priority']): string {
  switch (priority) {
    case 'high': return '🔴';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
}

// Verify Notion connection
export async function verifyNotionConnection(
  accessToken: string
): Promise<{ success: boolean; user?: string; error?: string }> {
  try {
    const response = await fetch(`${NOTION_API_URL}/users/me`, {
      method: 'GET',
      headers: createHeaders(accessToken),
    });

    if (!response.ok) {
      return { success: false, error: 'Invalid access token' };
    }

    const data = await response.json();
    return { success: true, user: data.name || data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

// Search for pages/databases
export async function searchNotionPages(
  accessToken: string,
  query: string = ''
): Promise<{ success: boolean; results?: Array<{ id: string; title: string; type: string }>; error?: string }> {
  try {
    const response = await fetch(`${NOTION_API_URL}/search`, {
      method: 'POST',
      headers: createHeaders(accessToken),
      body: JSON.stringify({
        query,
        filter: { property: 'object', value: 'page' },
        page_size: 20,
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'Search failed' };
    }

    const data = await response.json();
    const results = (data.results || []).map((item: { id: string; object: string; properties?: { title?: { title?: Array<{ plain_text?: string }> } } }) => ({
      id: item.id,
      title: item.properties?.title?.title?.[0]?.plain_text || 'Untitled',
      type: item.object,
    }));

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}
