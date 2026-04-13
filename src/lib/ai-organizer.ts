import type { ClasseVivaEvent, WeekSchedule, DaySchedule, OrganizedTask, SavedSchedule } from '@/types';
import { format, parseISO, eachDayOfInterval, addMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import OpenAI from 'openai';

export interface GenerateScheduleOptions {
  apiKey?: string;
  includeSunday?: boolean;
  historySchedules?: SavedSchedule[];
}

interface AIResponse {
  schedule: WeekSchedule;
}

interface HistoryContext {
  carryOverTasks: OrganizedTask[];
  insights: string[];
}

function getGeminiClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  return new OpenAI({
    apiKey: key,
    // Google exposes an OpenAI-compatible endpoint for Gemini models.
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function buildHistoryContext(
  historySchedules: SavedSchedule[] = [],
  currentStartDate: string
): HistoryContext {
  const carryOverTasks: OrganizedTask[] = [];
  const insights: string[] = [];

  if (historySchedules.length === 0) {
    return { carryOverTasks, insights };
  }

  const currentStart = parseISO(currentStartDate);
  const recent = [...historySchedules]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  let advancedWorkCount = 0;

  for (const schedule of recent) {
    const scheduleEnd = parseISO(schedule.weekData.endDate);

    for (const day of schedule.schedule.days) {
      for (const task of day.tasks) {
        const taskDate = parseISO(task.date);
        if (!task.completed && taskDate < currentStart) {
          carryOverTasks.push({
            ...task,
            id: generateId(),
            completed: false,
            description: `${task.description} (Ripresa da settimana precedente: ${schedule.name})`,
          });
        }

        if (task.completed && task.relatedEvent) {
          const relatedEventDate = parseISO(task.relatedEvent.startDate);
          if (relatedEventDate > scheduleEnd) {
            advancedWorkCount += 1;
          }
        }
      }
    }
  }

  if (carryOverTasks.length > 0) {
    insights.push(`Sono presenti ${carryOverTasks.length} attività non completate da recuperare dalle settimane precedenti.`);
  }
  if (advancedWorkCount > 0) {
    insights.push(`Nelle settimane precedenti sono stati anticipati ${advancedWorkCount} task su eventi futuri.`);
  }

  return { carryOverTasks: carryOverTasks.slice(0, 8), insights };
}

function parseAIResponse(
  responseText: string,
  events: ClasseVivaEvent[],
  startDate: string,
  endDate: string,
  options: GenerateScheduleOptions
): WeekSchedule {
  try {
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
    const parsed = JSON.parse(jsonStr) as AIResponse;

    if (parsed.schedule) {
      if (!options.includeSunday) {
        parsed.schedule.days = parsed.schedule.days.filter(
          (day) => parseISO(day.date).getDay() !== 0
        );
      }
      return parsed.schedule;
    }
  } catch (error) {
    console.warn('Gemini response parsing failed, fallback planner used:', error);
  }

  return createFallbackSchedule(events, startDate, endDate, options);
}

function createFallbackSchedule(
  events: ClasseVivaEvent[],
  startDate: string,
  endDate: string,
  options: GenerateScheduleOptions = {}
): WeekSchedule {
  const includeSunday = Boolean(options.includeSunday);
  const history = buildHistoryContext(options.historySchedules, startDate);
  const days: DaySchedule[] = [];

  const interval = { start: parseISO(startDate), end: parseISO(endDate) };
  const allDays = eachDayOfInterval(interval).filter((day) => includeSunday || day.getDay() !== 0);

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const scheduledEventIds = new Set<string>();
  const carryOverQueue = [...history.carryOverTasks];

  for (const day of allDays) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;
    const tasks: OrganizedTask[] = [];
    let startHour = isWeekend ? 10 : 15;

    // Recover one pending task from previous weeks at start of day (if any)
    if (carryOverQueue.length > 0) {
      const previousTask = carryOverQueue.shift() as OrganizedTask;
      tasks.push({
        ...previousTask,
        date: dateStr,
        timeSlot: format(addMinutes(day, startHour * 60), 'HH:mm'),
        id: generateId(),
        completed: false,
        priority: previousTask.priority === 'low' ? 'medium' : previousTask.priority,
      });
      startHour += 1;
    }

    // Events on this exact day
    const todayEvents = sortedEvents.filter((e) => {
      const eventDate = format(parseISO(e.startDate), 'yyyy-MM-dd');
      return eventDate === dateStr;
    });

    // Events in the next days (including next week) to anticipate work
    const upcomingEvents = sortedEvents.filter((e) => {
      if (scheduledEventIds.has(e.id)) return false;
      const eventDate = parseISO(e.startDate);
      const daysDiff = Math.ceil((eventDate.getTime() - day.getTime()) / (1000 * 60 * 60 * 24));

      if (e.type === 'test') return daysDiff >= 1 && daysDiff <= 5;
      if (e.type === 'homework') return daysDiff >= 1 && daysDiff <= 4;
      return daysDiff >= 1 && daysDiff <= 2;
    });

    for (const event of upcomingEvents) {
      const eventDate = format(parseISO(event.startDate), 'EEEE d MMMM', { locale: it });
      const priority = event.type === 'test' ? 'high' : 'medium';
      const category = event.type === 'test' ? 'test_prep' : 'homework';
      const duration = event.type === 'test' ? 60 : 45;

      tasks.push({
        id: generateId(),
        title:
          event.type === 'test'
            ? `Preparazione verifica: ${event.title}`
            : `Anticipo compito (${eventDate}): ${event.title}`,
        description:
          event.description ||
          `Studio anticipato per ${eventDate}. ${event.subject ? `Materia: ${event.subject}` : ''}`,
        date: dateStr,
        timeSlot: format(addMinutes(day, startHour * 60), 'HH:mm'),
        duration,
        priority,
        category,
        relatedEvent: event,
        completed: false,
      });

      scheduledEventIds.add(event.id);
      startHour += Math.ceil(duration / 60);
      if (duration >= 60) startHour += 0.25;
    }

    for (const event of todayEvents) {
      if (scheduledEventIds.has(event.id)) continue;
      const category =
        event.type === 'test' ? 'test_prep' : event.type === 'homework' ? 'homework' : 'study';

      tasks.push({
        id: generateId(),
        title: `Ripasso finale: ${event.title}`,
        description: event.description || `Ripasso finale per: ${event.title}`,
        date: dateStr,
        timeSlot: format(addMinutes(day, startHour * 60), 'HH:mm'),
        duration: 30,
        priority: 'high',
        category,
        relatedEvent: event,
        completed: false,
      });

      scheduledEventIds.add(event.id);
      startHour += 0.5;
    }

    if (tasks.length === 0) {
      tasks.push({
        id: generateId(),
        title: 'Studio libero / anticipazione',
        description: 'Spazio per ripasso generale o anticipo di attività future.',
        date: dateStr,
        timeSlot: isWeekend ? '10:00' : '15:00',
        duration: 60,
        priority: 'low',
        category: 'review',
        completed: false,
      });
    }

    const dayName = format(day, 'EEEE', { locale: it });
    days.push({
      date: dateStr,
      tasks,
      summary: `${tasks.length} attività pianificate per ${dayName}`,
    });
  }

  const totalTasks = days.reduce((sum, day) => sum + day.tasks.length, 0);

  return {
    days,
    overview: `Piano smart con ${events.length} eventi e ${totalTasks} task distribuiti tra settimana corrente e preparazione futura.`,
    tips: [
      'Anticipa i compiti: lavora in anticipo quando possibile, soprattutto tra giovedì e sabato.',
      includeSunday
        ? 'Domenica inclusa: usa sessioni leggere per prepararti al lunedì.'
        : 'Domenica esclusa: concentrati su venerdì/sabato per anticipare il lunedì.',
      history.insights[0] || 'Mantieni continuità: riprendi prima le attività lasciate in sospeso.',
      history.insights[1] || 'Quando hai margine, anticipa eventi dei giorni successivi.',
    ],
  };
}

export async function generateOrganizedSchedule(
  events: ClasseVivaEvent[],
  startDate: string,
  endDate: string,
  options: GenerateScheduleOptions = {}
): Promise<WeekSchedule> {
  const history = buildHistoryContext(options.historySchedules, startDate);

  const eventsDescription = events
    .map((e) => {
      const eventDate = format(parseISO(e.startDate), 'EEEE d MMMM', { locale: it });
      return `- [${e.type.toUpperCase()}] ${e.title} (${eventDate})${e.subject ? ` - ${e.subject}` : ''}${
        e.description ? `: ${e.description}` : ''
      }`;
    })
    .join('\n');

  const historyDescription =
    history.insights.length > 0
      ? history.insights.map((x) => `- ${x}`).join('\n')
      : '- Nessun dato storico disponibile';

  const carryOverDescription =
    history.carryOverTasks.length > 0
      ? history.carryOverTasks
          .map((t) => `- ${t.title} (${t.priority})`)
          .slice(0, 8)
          .join('\n')
      : '- Nessun task arretrato';

  const prompt = `Sei un planner scolastico molto pratico.
Crea un piano SMART dal ${startDate} al ${endDate}.

EVENTI DISPONIBILI (anche oltre la settimana corrente per anticipare):
${eventsDescription || '- Nessun evento'}

SCELTE UTENTE:
- includi domenica: ${options.includeSunday ? 'sì' : 'no'}
- sabato: sempre utilizzabile per anticipare

MEMORIA STORICA:
${historyDescription}

TASK ARRETRATI DA RECUPERARE:
${carryOverDescription}

OBIETTIVI:
1) Anticipa compiti/verifiche dei giorni successivi (anche settimana dopo, se utile).
2) Inserisci recupero task arretrati in modo sostenibile.
3) Bilancia carico (niente concentrazione tutto l'ultimo giorno).
4) Mantieni piano realistico: sessioni 30-60 min con pause.
5) Domenica solo se selezionata.

Rispondi SOLO con JSON valido:
{
  "schedule": {
    "days": [
      {
        "date": "YYYY-MM-DD",
        "tasks": [
          {
            "id": "unique_id",
            "title": "Titolo",
            "description": "Descrizione",
            "date": "YYYY-MM-DD",
            "timeSlot": "HH:MM",
            "duration": 45,
            "priority": "high|medium|low",
            "category": "study|homework|test_prep|review|break|other",
            "completed": false
          }
        ],
        "summary": "Riassunto"
      }
    ],
    "overview": "Panoramica",
    "tips": ["tip1", "tip2", "tip3"]
  }
}`;

  try {
    const client = getGeminiClient(options.apiKey);
    const completion = await client.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'Rispondi sempre in JSON valido senza markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    return parseAIResponse(responseText, events, startDate, endDate, options);
  } catch (error) {
    console.error('Gemini generation error:', error);
    return createFallbackSchedule(events, startDate, endDate, options);
  }
}

export function generateDemoSchedule(
  events: ClasseVivaEvent[],
  startDate: string,
  endDate: string,
  options: GenerateScheduleOptions = {}
): WeekSchedule {
  return createFallbackSchedule(events, startDate, endDate, options);
}
