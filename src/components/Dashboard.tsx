'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { LoginForm } from './LoginForm';
import { ScheduleView } from './ScheduleView';
import { NotionModal } from './NotionModal';
import { SettingsModal } from './SettingsModal';
import {
  Sparkles,
  RefreshCw,
  Calendar,
  Wand2,
  Loader2,
  AlertCircle,
  FileText,
  ArrowRight,
  Zap,
} from 'lucide-react';
import type { ClasseVivaEvent } from '@/types';
import { addDays, format, parseISO } from 'date-fns';
import { getWeekBoundaries, fetchAgendaFromBackend, fetchGradesFromBackend } from '@/lib/classeviva';

// Demo events for testing without ClasseViva credentials
const DEMO_EVENTS: ClasseVivaEvent[] = [
  {
    id: '1',
    title: 'Verifica di Matematica',
    description: 'Capitolo 5: Funzioni ed equazioni di secondo grado',
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'test',
    subject: 'Matematica',
  },
  {
    id: '2',
    title: 'Compito di Italiano',
    description: 'Analisi del testo: I Promessi Sposi cap. 10-15',
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'homework',
    subject: 'Italiano',
  },
  {
    id: '3',
    title: 'Presentazione Storia',
    description: 'Preparare presentazione sulla Rivoluzione Industriale',
    startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'event',
    subject: 'Storia',
  },
  {
    id: '4',
    title: 'Compiti di Inglese',
    description: 'Esercizi di grammatica pag. 56-58',
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'homework',
    subject: 'Inglese',
  },
];

interface DashboardProps {
  inLayout?: boolean;
}

export function Dashboard({ inLayout = false }: DashboardProps) {
  const {
    auth,
    weekData,
    setWeekData,
    organizedSchedule,
    setOrganizedSchedule,
    isLoading,
    setIsLoading,
    error,
    setError,
    backendConfig,
    setGradesData,
    includeSunday,
    setIncludeSunday,
    savedSchedules,
  } = useAppStore();

  const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch data when logged in
  const fetchWeekData = async () => {
    if (!auth.session && !isDemoMode) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        // Use demo data
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        setWeekData({
          events: DEMO_EVENTS,
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: endOfWeek.toISOString().split('T')[0],
        });
      } else {
        const { start, end } = getWeekBoundaries();
        const extendedEnd = format(addDays(parseISO(end), 7), 'yyyy-MM-dd');

        const agendaResult = await fetchAgendaFromBackend(
          start,
          extendedEnd,
          backendConfig || undefined,
          auth.session || undefined
        );
        if (!agendaResult.success) {
          throw new Error(agendaResult.error || 'Failed to fetch agenda');
        }

        const gradesResult = await fetchGradesFromBackend(
          backendConfig || undefined,
          auth.session || undefined
        );
        if (gradesResult.success && gradesResult.grades) {
          setGradesData(gradesResult.grades);
        }

        setWeekData({
          events: agendaResult.events || [],
          startDate: start,
          endDate: end,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching data');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate organized schedule
  const generateSchedule = async () => {
    if (!weekData) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: weekData.events,
          startDate: weekData.startDate,
          endDate: weekData.endDate,
          demo: isDemoMode,
          includeSunday,
          historySchedules: savedSchedules,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate schedule');
      }

      setOrganizedSchedule(data.schedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating schedule');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle demo mode
  const handleDemoMode = () => {
    setIsDemoMode(true);
    // Set demo data immediately
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    setWeekData({
      events: DEMO_EVENTS,
      startDate: startOfWeek.toISOString().split('T')[0],
      endDate: endOfWeek.toISOString().split('T')[0],
    });
  };

  // Don't render until mounted (hydration)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--af-bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--af-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show login if not authenticated and not in demo mode
  if (!auth.isLoggedIn && !isDemoMode) {
    return (
      <div className="min-h-screen bg-[var(--af-bg-secondary)] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--af-primary)] to-[var(--af-accent-purple)] mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-[var(--af-text-primary)] mb-4">
              Organized
            </h1>
            <p className="text-lg text-[var(--af-text-secondary)] max-w-xl mx-auto">
              Organizza automaticamente la tua settimana scolastica con l&apos;aiuto dell&apos;intelligenza artificiale
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <div className="af-card p-6">
              <div className="w-10 h-10 rounded-lg bg-[var(--af-primary-light)] flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5 text-[var(--af-primary)]" />
              </div>
              <h3 className="font-semibold text-[var(--af-text-primary)] mb-2">
                Sincronizza ClasseViva
              </h3>
              <p className="text-sm text-[var(--af-text-secondary)]">
                Importa automaticamente compiti, verifiche ed eventi dalla tua agenda scolastica
              </p>
            </div>
            <div className="af-card p-6">
              <div className="w-10 h-10 rounded-lg bg-[rgba(147,39,255,0.1)] flex items-center justify-center mb-4">
                <Wand2 className="w-5 h-5 text-[var(--af-accent-purple)]" />
              </div>
              <h3 className="font-semibold text-[var(--af-text-primary)] mb-2">
                Piano AI Personalizzato
              </h3>
              <p className="text-sm text-[var(--af-text-secondary)]">
                L&apos;IA crea un piano di studio ottimizzato in base ai tuoi impegni
              </p>
            </div>
            <div className="af-card p-6">
              <div className="w-10 h-10 rounded-lg bg-[rgba(102,207,128,0.1)] flex items-center justify-center mb-4">
                <FileText className="w-5 h-5 text-[var(--af-accent-green)]" />
              </div>
              <h3 className="font-semibold text-[var(--af-text-primary)] mb-2">
                Esporta Ovunque
              </h3>
              <p className="text-sm text-[var(--af-text-secondary)]">
                Esporta su Notion, Google Calendar o qualsiasi app con iCal
              </p>
            </div>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Demo Mode Button */}
          <div className="text-center mt-8">
            <button
              onClick={handleDemoMode}
              className="text-sm text-[var(--af-text-tertiary)] hover:text-[var(--af-primary)] transition-colors"
            >
              Oppure <span className="underline">prova con dati demo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard Content (when in layout or standalone)
  const dashboardContent = (
    <div className={`${inLayout ? 'h-full overflow-auto' : 'min-h-screen'} bg-[var(--af-bg-secondary)]`}>
      <div className={`max-w-5xl mx-auto px-6 py-8`}>
        {/* Error Message */}
        {error && (
          <div className="
            mb-6 flex items-center gap-3 p-4
            bg-[var(--af-accent-red)]/10
            border border-[var(--af-accent-red)]/20
            text-[var(--af-accent-red)]
            rounded-lg
          ">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-[var(--af-accent-red)] hover:opacity-70"
            >
              ×
            </button>
          </div>
        )}

        {/* Welcome Card / Action Area */}
        {!organizedSchedule && (
          <div className="af-card p-8 mb-8">
            <div className="text-center max-w-lg mx-auto">
              {/* Icon */}
              <div className="
                w-16 h-16 mx-auto mb-6 rounded-2xl
                bg-gradient-to-br from-[var(--af-primary)] to-[var(--af-accent-purple)]
                flex items-center justify-center
              ">
                {weekData ? (
                  <Zap className="w-8 h-8 text-white" />
                ) : (
                  <Calendar className="w-8 h-8 text-white" />
                )}
              </div>

              <h2 className="text-2xl font-bold text-[var(--af-text-primary)] mb-2">
                {weekData ? 'Pronti a organizzare!' : 'Iniziamo'}
              </h2>
              <p className="text-[var(--af-text-secondary)] mb-8">
                {weekData
                  ? `${weekData.events.length} eventi trovati per questa settimana`
                  : 'Carica i dati della settimana da ClasseViva'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {!weekData ? (
                  <button
                    onClick={fetchWeekData}
                    disabled={isLoading}
                    className="
                      flex items-center justify-center gap-2 px-6 py-3
                      bg-[var(--af-primary)] text-white font-medium
                      rounded-lg hover:bg-[var(--af-primary-hover)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors
                    "
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5" />
                    )}
                    {isDemoMode ? 'Carica Demo' : 'Carica Settimana'}
                  </button>
                ) : (
                  <>
                    <label className="flex items-center justify-center gap-2 text-sm text-[var(--af-text-secondary)]">
                      <input
                        type="checkbox"
                        checked={includeSunday}
                        onChange={(e) => setIncludeSunday(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--af-border)] text-[var(--af-primary)] focus:ring-[var(--af-primary)]"
                      />
                      Includi domenica nel piano
                    </label>
                    <button
                      onClick={generateSchedule}
                      disabled={isLoading}
                      className="
                        flex items-center justify-center gap-2 px-6 py-3
                        bg-gradient-to-r from-[var(--af-accent-purple)] to-[var(--af-primary)]
                        text-white font-medium rounded-lg
                        hover:opacity-90
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all
                      "
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                      Organizza con AI
                    </button>
                    <button
                      onClick={fetchWeekData}
                      disabled={isLoading}
                      className="
                        flex items-center justify-center gap-2 px-6 py-3
                        bg-[var(--af-bg-hover)] text-[var(--af-text-primary)]
                        font-medium rounded-lg
                        hover:bg-[var(--af-border)]
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors
                      "
                    >
                      <RefreshCw className="w-5 h-5" />
                      Aggiorna
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Events Preview */}
        {weekData && weekData.events.length > 0 && !organizedSchedule && (
          <div className="af-card p-6">
            <h3 className="font-semibold text-[var(--af-text-primary)] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--af-primary)]" />
              Eventi della settimana
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {weekData.events.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="
                    p-4 rounded-lg
                    bg-[var(--af-bg-secondary)]
                    border border-[var(--af-border-light)]
                    hover:border-[var(--af-border)]
                    transition-colors
                  "
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`
                        text-xs font-medium px-2 py-0.5 rounded
                        ${event.type === 'test'
                          ? 'bg-[var(--af-accent-red)]/10 text-[var(--af-accent-red)]'
                          : event.type === 'homework'
                          ? 'bg-[var(--af-accent-orange)]/10 text-[var(--af-accent-orange)]'
                          : 'bg-[var(--af-primary-light)] text-[var(--af-primary)]'
                        }
                      `}
                    >
                      {event.type === 'test'
                        ? 'Verifica'
                        : event.type === 'homework'
                        ? 'Compito'
                        : 'Evento'}
                    </span>
                    {event.subject && (
                      <span className="text-xs text-[var(--af-text-tertiary)]">{event.subject}</span>
                    )}
                  </div>
                  <h4 className="font-medium text-[var(--af-text-primary)]">
                    {event.title}
                  </h4>
                  {event.description && (
                    <p className="text-sm text-[var(--af-text-secondary)] mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {weekData.events.length > 4 && (
              <p className="text-sm text-[var(--af-text-tertiary)] mt-4 text-center">
                +{weekData.events.length - 4} altri eventi
              </p>
            )}
          </div>
        )}

        {/* Schedule View */}
        {organizedSchedule && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setOrganizedSchedule(null);
                  setWeekData(null);
                }}
                className="
                  flex items-center gap-2 text-sm
                  text-[var(--af-text-tertiary)]
                  hover:text-[var(--af-text-primary)]
                  transition-colors
                "
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Torna indietro
              </button>
            </div>
            <ScheduleView />
          </>
        )}
      </div>
    </div>
  );

  // If in layout mode, return just the content
  if (inLayout) {
    return (
      <>
        {dashboardContent}
        <NotionModal
          isOpen={isNotionModalOpen}
          onClose={() => setIsNotionModalOpen(false)}
        />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      </>
    );
  }

  // Standalone mode (not in layout - should not happen after login)
  return dashboardContent;
}
