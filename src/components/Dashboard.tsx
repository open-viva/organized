'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { LoginForm } from './LoginForm';
import { ScheduleView } from './ScheduleView';
import { NotionModal } from './NotionModal';
import {
  Sparkles,
  LogOut,
  RefreshCw,
  Calendar,
  BookOpen,
  Loader2,
  AlertCircle,
  FileText,
  Wand2,
} from 'lucide-react';
import type { ClasseVivaEvent } from '@/types';

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

export function Dashboard() {
  const {
    auth,
    logout,
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
  } = useAppStore();

  const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);
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
        // Fetch from ClasseViva (via backend)
        const response = await fetch('/api/classeviva', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'fetch', 
            backendConfig,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to fetch data';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If response is not valid JSON or empty, use status text
            errorMessage = `Failed to fetch data: ${response.status} ${response.statusText}`;
          }
          
          // If it's a 401 (unauthorized/session expired), log the user out
          if (response.status === 401) {
            logout();
            setIsDemoMode(false);
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();

        // Store grades data if returned
        if (data.grades) {
          setGradesData(data.grades);
        }

        setWeekData({
          events: data.events || [],
          startDate: data.startDate,
          endDate: data.endDate,
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Show login if not authenticated and not in demo mode
  if (!auth.isLoggedIn && !isDemoMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              Organized
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
              Organizza automaticamente la tua settimana scolastica con l&apos;aiuto dell&apos;intelligenza artificiale
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
              <Calendar className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                Sincronizza ClasseViva
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Importa automaticamente compiti, verifiche ed eventi dalla tua agenda scolastica
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
              <Wand2 className="w-8 h-8 text-purple-500 mb-4" />
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                Piano AI Personalizzato
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                L&apos;IA crea un piano di studio ottimizzato in base ai tuoi impegni
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
              <FileText className="w-8 h-8 text-green-500 mb-4" />
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                Esporta Ovunque
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              Oppure <span className="underline">prova con dati demo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-zinc-900 dark:text-white">Organized</h1>
              {isDemoMode && (
                <span className="text-xs text-orange-500">Modalità Demo</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNotionModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Notion</span>
            </button>
            <button
              onClick={() => {
                logout();
                setIsDemoMode(false);
                setOrganizedSchedule(null);
                setWeekData(null);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Esci</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {!organizedSchedule && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
            <div className="text-center">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                {weekData ? 'Pronti a organizzare!' : 'Iniziamo'}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                {weekData
                  ? `${weekData.events.length} eventi trovati per questa settimana`
                  : 'Carica i dati della settimana da ClasseViva'}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!weekData ? (
                  <button
                    onClick={fetchWeekData}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                    <button
                      onClick={generateSchedule}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Aggiorna
                    </button>
                  </>
                )}
              </div>

              {/* Event Preview */}
              {weekData && weekData.events.length > 0 && (
                <div className="mt-8 text-left">
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                    Eventi della settimana:
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {weekData.events.slice(0, 4).map((event) => (
                      <div
                        key={event.id}
                        className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              event.type === 'test'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : event.type === 'homework'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                          >
                            {event.type === 'test'
                              ? 'Verifica'
                              : event.type === 'homework'
                              ? 'Compito'
                              : 'Evento'}
                          </span>
                          {event.subject && (
                            <span className="text-xs text-zinc-500">{event.subject}</span>
                          )}
                        </div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">
                          {event.title}
                        </h4>
                        {event.description && (
                          <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {weekData.events.length > 4 && (
                    <p className="text-sm text-zinc-500 mt-3 text-center">
                      +{weekData.events.length - 4} altri eventi
                    </p>
                  )}
                </div>
              )}
            </div>
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
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                ← Torna indietro
              </button>
            </div>
            <ScheduleView />
          </>
        )}
      </main>

      {/* Notion Modal */}
      <NotionModal
        isOpen={isNotionModalOpen}
        onClose={() => setIsNotionModalOpen(false)}
      />
    </div>
  );
}
