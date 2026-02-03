import type { ClasseVivaEvent, WeekSchedule, DaySchedule, OrganizedTask } from '@/types';
import { format, parseISO, eachDayOfInterval, addMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import OpenAI from 'openai';

// Lazy initialization of OpenAI client
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

interface AIResponse {
  schedule: WeekSchedule;
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Parse AI response and create schedule
function parseAIResponse(
  responseText: string,
  events: ClasseVivaEvent[],
  startDate: string,
  endDate: string
): WeekSchedule {
  try {
    // Try to parse JSON from the response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
    const parsed = JSON.parse(jsonStr) as AIResponse;
    
    if (parsed.schedule) {
      return parsed.schedule;
    }
  } catch {
    // Fallback: Create a basic schedule from events
    console.log('AI response parsing failed, creating fallback schedule');
  }
  
  // Fallback schedule
  return createFallbackSchedule(events, startDate, endDate);
}

// Create a fallback schedule when AI parsing fails
function createFallbackSchedule(
  events: ClasseVivaEvent[],
  startDate: string,
  endDate: string
): WeekSchedule {
  const days: DaySchedule[] = [];
  const interval = { start: parseISO(startDate), end: parseISO(endDate) };
  const allDays = eachDayOfInterval(interval);
  
  for (const day of allDays) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayEvents = events.filter(e => {
      const eventDate = format(parseISO(e.startDate), 'yyyy-MM-dd');
      return eventDate === dateStr;
    });
    
    const tasks: OrganizedTask[] = [];
    let startHour = 15; // Start at 3 PM
    
    for (const event of dayEvents) {
      const priority = event.type === 'test' ? 'high' : event.type === 'homework' ? 'medium' : 'low';
      const category = event.type === 'test' ? 'test_prep' : event.type === 'homework' ? 'homework' : 'study';
      const duration = event.type === 'test' ? 60 : 45;
      
      tasks.push({
        id: generateId(),
        title: event.title,
        description: event.description || `Preparazione per: ${event.title}`,
        date: dateStr,
        timeSlot: format(addMinutes(day, startHour * 60), 'HH:mm'),
        duration,
        priority,
        category,
        relatedEvent: event,
        completed: false,
      });
      
      startHour += Math.ceil(duration / 60);
    }
    
    // Add a study session if no tasks
    if (tasks.length === 0) {
      tasks.push({
        id: generateId(),
        title: 'Studio libero o ripasso',
        description: 'Tempo dedicato al ripasso generale o attività personali',
        date: dateStr,
        timeSlot: '15:00',
        duration: 60,
        priority: 'low',
        category: 'review',
        completed: false,
      });
    }
    
    days.push({
      date: dateStr,
      tasks,
      summary: `${tasks.length} attività pianificate per ${format(day, 'EEEE', { locale: it })}`,
    });
  }
  
  return {
    days,
    overview: `Settimana organizzata con ${events.length} eventi da ClasseViva`,
    tips: [
      'Inizia sempre dai compiti più urgenti',
      'Fai pause di 5-10 minuti ogni ora',
      'Prepara il materiale la sera prima',
    ],
  };
}

// Generate organized schedule using AI
export async function generateOrganizedSchedule(
  events: ClasseVivaEvent[],
  startDate: string,
  endDate: string
): Promise<WeekSchedule> {
  // Format events for the prompt
  const eventsDescription = events.map(e => {
    const eventDate = format(parseISO(e.startDate), 'EEEE d MMMM', { locale: it });
    return `- [${e.type.toUpperCase()}] ${e.title} (${eventDate}): ${e.description || 'Nessuna descrizione'}${e.subject ? ` - Materia: ${e.subject}` : ''}`;
  }).join('\n');
  
  const prompt = `Sei un esperto organizzatore scolastico. Analizza gli eventi della settimana e crea un piano di studio ottimizzato.

EVENTI DELLA SETTIMANA (${startDate} - ${endDate}):
${eventsDescription || 'Nessun evento registrato questa settimana.'}

Crea un piano settimanale in formato JSON con questa struttura:
{
  "schedule": {
    "days": [
      {
        "date": "YYYY-MM-DD",
        "tasks": [
          {
            "id": "unique_id",
            "title": "Titolo task",
            "description": "Descrizione dettagliata",
            "date": "YYYY-MM-DD",
            "timeSlot": "HH:MM",
            "duration": 45,
            "priority": "high|medium|low",
            "category": "study|homework|test_prep|review|break|other",
            "completed": false
          }
        ],
        "summary": "Riassunto giornata"
      }
    ],
    "overview": "Panoramica settimanale",
    "tips": ["Consiglio 1", "Consiglio 2"]
  }
}

REGOLE:
1. Distribuisci lo studio in modo equilibrato
2. Le verifiche richiedono preparazione nei giorni precedenti
3. I compiti vanno completati prima della scadenza
4. Includi pause strategiche
5. Considera il carico di lavoro giornaliero
6. Orari studio: 15:00-19:00 nei giorni feriali, 10:00-12:00 e 15:00-18:00 nel weekend
7. Durata sessioni: 30-60 minuti con pause

Rispondi SOLO con il JSON valido.`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sei un assistente che organizza piani di studio. Rispondi sempre in formato JSON valido.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    return parseAIResponse(responseText, events, startDate, endDate);
  } catch (error) {
    console.error('AI generation error:', error);
    // Return fallback schedule if AI fails
    return createFallbackSchedule(events, startDate, endDate);
  }
}

// Simulated schedule for demo/testing (when no API key)
export function generateDemoSchedule(
  events: ClasseVivaEvent[],
  startDate: string,
  endDate: string
): WeekSchedule {
  return createFallbackSchedule(events, startDate, endDate);
}
