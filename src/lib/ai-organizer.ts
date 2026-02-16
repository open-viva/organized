import type { ClasseVivaEvent, WeekSchedule, DaySchedule, OrganizedTask } from '@/types';
import { format, parseISO, eachDayOfInterval, addMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import OpenAI from 'openai';

// Lazy initialization of OpenAI client
function getOpenAIClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: key });
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
  
  // Sort events by date to plan ahead
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  
  // Track which events we've scheduled
  const scheduledEventIds = new Set<string>();
  
  for (const day of allDays) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const tasks: OrganizedTask[] = [];
    let startHour = isWeekend ? 10 : 15; // Weekend starts at 10 AM, weekdays at 3 PM
    
    // Find events happening on this exact day
    const todayEvents = sortedEvents.filter(e => {
      const eventDate = format(parseISO(e.startDate), 'yyyy-MM-dd');
      return eventDate === dateStr;
    });
    
    // Find events happening in the next 2-4 days that need preparation
    const upcomingEvents = sortedEvents.filter(e => {
      if (scheduledEventIds.has(e.id)) return false;
      const eventDate = parseISO(e.startDate);
      const currentDate = day;
      const daysDiff = Math.ceil((eventDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Prepare tests 2-3 days ahead, homework 1-2 days ahead
      if (e.type === 'test') {
        return daysDiff >= 1 && daysDiff <= 3;
      } else if (e.type === 'homework') {
        return daysDiff >= 1 && daysDiff <= 2;
      }
      return false;
    });
    
    // Schedule upcoming events first (smart planning)
    for (const event of upcomingEvents) {
      const eventDate = format(parseISO(event.startDate), 'EEEE d MMMM', { locale: it });
      const priority = event.type === 'test' ? 'high' : 'medium';
      const category = event.type === 'test' ? 'test_prep' : 'homework';
      const duration = event.type === 'test' ? 60 : 45;
      
      const prepTitle = event.type === 'test' 
        ? `Preparazione verifica: ${event.title}`
        : `Compito per ${eventDate}: ${event.title}`;
      
      tasks.push({
        id: generateId(),
        title: prepTitle,
        description: event.description || `Prepara in anticipo per ${eventDate}. ${event.subject ? `Materia: ${event.subject}` : ''}`,
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
      
      // Add a short break after intensive sessions
      if (duration >= 60) {
        startHour += 0.25; // 15 min break
      }
    }
    
    // Schedule today's events (if any remain)
    for (const event of todayEvents) {
      if (scheduledEventIds.has(event.id)) continue;
      
      const category = event.type === 'test' ? 'test_prep' : event.type === 'homework' ? 'homework' : 'study';
      const duration = 30; // Last-minute review
      
      tasks.push({
        id: generateId(),
        title: `Ripasso finale: ${event.title}`,
        description: event.description || `Ripasso dell'ultima ora per: ${event.title}`,
        date: dateStr,
        timeSlot: format(addMinutes(day, startHour * 60), 'HH:mm'),
        duration,
        priority: 'high',
        category,
        relatedEvent: event,
        completed: false,
      });
      
      scheduledEventIds.add(event.id);
      startHour += 0.5;
    }
    
    // Add study session if day is light
    if (tasks.length === 0) {
      tasks.push({
        id: generateId(),
        title: 'Studio libero o ripasso',
        description: 'Tempo dedicato al ripasso generale o per anticipare compiti futuri',
        date: dateStr,
        timeSlot: isWeekend ? '10:00' : '15:00',
        duration: 60,
        priority: 'low',
        category: 'review',
        completed: false,
      });
    } else if (tasks.length < 2 && !isWeekend) {
      // Add a break/review task
      tasks.push({
        id: generateId(),
        title: 'Pausa e organizzazione',
        description: 'Pausa strategica e pianificazione dei prossimi giorni',
        date: dateStr,
        timeSlot: format(addMinutes(day, startHour * 60), 'HH:mm'),
        duration: 30,
        priority: 'low',
        category: 'break',
        completed: false,
      });
    }
    
    const dayName = format(day, 'EEEE', { locale: it });
    const summary = tasks.length > 0 
      ? `${tasks.length} attività pianificate per ${dayName} - carico ${tasks.length >= 3 ? 'intenso' : tasks.length === 2 ? 'moderato' : 'leggero'}`
      : `${dayName} - giorno libero`;
    
    days.push({
      date: dateStr,
      tasks,
      summary,
    });
  }
  
  const totalTasks = days.reduce((sum, day) => sum + day.tasks.length, 0);
  const hasTests = events.some(e => e.type === 'test');
  
  return {
    days,
    overview: `Settimana organizzata con ${events.length} eventi da ClasseViva, distribuiti su ${totalTasks} sessioni di studio`,
    tips: [
      'I compiti sono stati pianificati in anticipo - non aspettare l\'ultimo giorno!',
      hasTests ? 'Le verifiche sono preparate su più giorni per un apprendimento efficace' : 'Distribuisci lo studio in modo equilibrato',
      'Fai pause di 10-15 minuti ogni ora di studio intensivo',
      'Prepara il materiale la sera prima per essere pronto',
      'Rivedi gli appunti subito dopo le lezioni per consolidare',
    ],
  };
}

// Generate organized schedule using AI
export async function generateOrganizedSchedule(
  events: ClasseVivaEvent[],
  startDate: string,
  endDate: string,
  apiKey?: string
): Promise<WeekSchedule> {
  // Format events for the prompt
  const eventsDescription = events.map(e => {
    const eventDate = format(parseISO(e.startDate), 'EEEE d MMMM', { locale: it });
    return `- [${e.type.toUpperCase()}] ${e.title} (${eventDate}): ${e.description || 'Nessuna descrizione'}${e.subject ? ` - Materia: ${e.subject}` : ''}`;
  }).join('\n');
  
  const prompt = `Sei un esperto organizzatore scolastico. Analizza gli eventi della settimana e crea un piano di studio ottimizzato e INTELLIGENTE.

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
    "tips": ["Consiglio 1", "Consiglio 2", "Consiglio 3"]
  }
}

REGOLE INTELLIGENTI DI ORGANIZZAZIONE:
1. **Anticipa i compiti**: Se un compito è per giovedì, pianificalo per lunedì o martedì, NON per mercoledì sera
2. **Prepara le verifiche in anticipo**: Le verifiche richiedono preparazione distribuita su 2-3 giorni PRIMA della data
3. **Distribuisci il carico**: Non concentrare tutto il giorno prima, ma spalma lo studio su più giorni
4. **Approccio strategico**: 
   - Compiti per giovedì → inizia lunedì/martedì
   - Verifica per venerdì → inizia mercoledì con teoria, giovedì con esercizi, venerdì ripasso finale
   - Compiti per lunedì → fai sabato/domenica
5. **Visione d'insieme**: Considera tutti gli eventi della settimana per bilanciare il carico giornaliero
6. **Tempo efficace**: 
   - Giorni feriali: preferisci 15:00-19:00
   - Weekend: 10:00-12:00 e 15:00-18:00
7. **Sessioni ottimali**: 30-60 minuti con pause di 10 minuti
8. **Priorità intelligente**:
   - HIGH: Verifiche imminenti (entro 2 giorni) e compiti urgenti
   - MEDIUM: Preparazione verifiche (3+ giorni) e compiti normali
   - LOW: Ripasso generale e studio preventivo
9. **Aggiungi pause strategiche**: Includi pause tra sessioni intensive
10. **Sfrutta i giorni liberi**: Se un giorno ha pochi eventi, usalo per anticipare compiti futuri

ESEMPIO DI PIANIFICAZIONE INTELLIGENTE:
Se ho una verifica di matematica venerdì e un compito di italiano per giovedì:
- Lunedì: 1h compito italiano (60min), 30min teoria matematica
- Martedì: 45min esercizi matematica, 30min ripasso italiano
- Mercoledì: pausa o studio leggero
- Giovedì: 45min esercizi matematica intensivi
- Venerdì: 30min ripasso finale matematica (mattina prima della verifica)

Rispondi SOLO con il JSON valido. Sii MOLTO intelligente nella distribuzione temporale degli studi.`;

  try {
    const openai = getOpenAIClient(apiKey);
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
