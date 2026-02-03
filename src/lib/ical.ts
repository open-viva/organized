import type { WeekSchedule, OrganizedTask } from '@/types';
import { parseISO, addMinutes } from 'date-fns';
import icalGenerator, { ICalEventStatus, ICalAlarmType } from 'ical-generator';

// Generate iCal string from schedule
export function generateICalString(schedule: WeekSchedule): string {
  const calendar = icalGenerator({
    name: 'Piano di Studio - Organized',
    timezone: 'Europe/Rome',
    prodId: {
      company: 'Organized',
      product: 'Study Planner',
    },
  });

  for (const day of schedule.days) {
    for (const task of day.tasks) {
      const [hours, minutes] = task.timeSlot.split(':').map(Number);
      const taskDate = parseISO(task.date);
      const startTime = new Date(taskDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = addMinutes(startTime, task.duration);

      calendar.createEvent({
        id: task.id,
        start: startTime,
        end: endTime,
        summary: `${getCategoryEmoji(task.category)} ${task.title}`,
        description: buildDescription(task),
        location: 'Studio',
        categories: [{ name: task.category }],
        status: task.completed ? ICalEventStatus.CONFIRMED : ICalEventStatus.TENTATIVE,
        priority: getPriorityNumber(task.priority),
        alarms: [
          {
            type: ICalAlarmType.display,
            trigger: 15 * 60, // 15 minutes before
          },
        ],
      });
    }
  }

  return calendar.toString();
}

// Generate downloadable iCal file content
export function generateICalDownload(schedule: WeekSchedule): { content: string; filename: string } {
  const icalContent = generateICalString(schedule);
  const startDate = schedule.days[0]?.date || 'week';
  const filename = `piano-studio-${startDate}.ics`;
  
  return {
    content: icalContent,
    filename,
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

function buildDescription(task: OrganizedTask): string {
  const lines = [
    task.description,
    '',
    `Priorità: ${getPriorityLabel(task.priority)}`,
    `Categoria: ${getCategoryLabel(task.category)}`,
    `Durata: ${task.duration} minuti`,
  ];
  
  if (task.relatedEvent) {
    lines.push('', `Evento correlato: ${task.relatedEvent.title}`);
    if (task.relatedEvent.subject) {
      lines.push(`Materia: ${task.relatedEvent.subject}`);
    }
  }
  
  return lines.join('\n');
}

function getPriorityNumber(priority: OrganizedTask['priority']): number {
  switch (priority) {
    case 'high': return 1;
    case 'medium': return 5;
    case 'low': return 9;
    default: return 5;
  }
}

function getPriorityLabel(priority: OrganizedTask['priority']): string {
  switch (priority) {
    case 'high': return '🔴 Alta';
    case 'medium': return '🟡 Media';
    case 'low': return '🟢 Bassa';
    default: return 'Media';
  }
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

// Generate iCal feed URL (for subscribing)
export function generateICalFeedUrl(scheduleId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/ical/${scheduleId}`;
  }
  return `/api/ical/${scheduleId}`;
}

// Parse date string for iCal
export function formatDateForICal(dateStr: string, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = parseISO(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
}
