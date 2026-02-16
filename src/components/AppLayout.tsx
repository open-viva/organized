'use client';

import { useState, useSyncExternalStore } from 'react';
import { useAppStore } from '@/store';
import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar';
import { SettingsModal } from './SettingsModal';
import { ScheduleView } from './ScheduleView';
import { Save, X, ChevronLeft, Menu } from 'lucide-react';

// Custom hook for hydration-safe mounting
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function AppLayout() {
  const {
    auth,
    weekData,
    organizedSchedule,
    saveSchedule,
    savedSchedules,
    setWeekData,
    setOrganizedSchedule,
  } = useAppStore();

  const [currentView, setCurrentView] = useState<'dashboard' | 'schedule' | 'settings'>('dashboard');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const mounted = useHydrated();

  // Handle save schedule
  const handleSaveSchedule = () => {
    if (!weekData || !organizedSchedule || !scheduleName.trim()) return;
    
    saveSchedule(scheduleName.trim(), weekData, organizedSchedule);
    setScheduleName('');
    setShowSaveDialog(false);
  };

  // Handle select schedule from sidebar
  const handleSelectSchedule = (scheduleId: string | null) => {
    setSelectedScheduleId(scheduleId);
    if (scheduleId) {
      const schedule = savedSchedules.find(s => s.id === scheduleId);
      if (schedule) {
        setWeekData(schedule.weekData);
        setOrganizedSchedule(schedule.schedule);
      }
    } else {
      // Reset to current/empty schedule
      setSelectedScheduleId(null);
    }
  };

  // Don't render until mounted (hydration)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--af-bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--af-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not logged in, show full dashboard (includes login)
  if (!auth.isLoggedIn) {
    return <Dashboard />;
  }

  // Main App Layout with Sidebar (AppFlowy style)
  return (
    <div className="flex h-screen bg-[var(--af-bg-primary)] overflow-hidden">
      {/* Sidebar */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-0 -ml-[var(--af-sidebar-width)]' : 'w-[var(--af-sidebar-width)]'}
        `}
      >
        <Sidebar
          onNavigate={setCurrentView}
          currentView={currentView}
          onSelectSchedule={handleSelectSchedule}
          selectedScheduleId={selectedScheduleId}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar (AppFlowy style) */}
        <header className="
          h-[var(--af-header-height)] min-h-[var(--af-header-height)]
          flex items-center px-4 gap-3
          bg-[var(--af-bg-surface)]
          border-b border-[var(--af-border-light)]
        ">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="
              p-2 rounded-md
              text-[var(--af-text-tertiary)]
              hover:bg-[var(--af-bg-hover)]
              hover:text-[var(--af-text-primary)]
              transition-colors
            "
            title={sidebarCollapsed ? 'Espandi sidebar' : 'Comprimi sidebar'}
          >
            {sidebarCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Breadcrumb / Title */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-[var(--af-text-primary)] truncate">
              {currentView === 'dashboard' && 'Dashboard'}
              {currentView === 'schedule' && (selectedScheduleId 
                ? savedSchedules.find(s => s.id === selectedScheduleId)?.name || 'Pianificazione'
                : 'Pianificazione Corrente'
              )}
              {currentView === 'settings' && 'Impostazioni'}
            </span>
          </div>

          {/* Save button for unsaved schedule */}
          {organizedSchedule && weekData && !selectedScheduleId && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="
                flex items-center gap-2 px-3 py-1.5
                text-sm font-medium
                bg-[var(--af-primary)] text-white
                hover:bg-[var(--af-primary-hover)]
                rounded-md transition-colors
              "
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Salva</span>
            </button>
          )}
        </header>

        {/* Unsaved Changes Banner */}
        {organizedSchedule && weekData && !selectedScheduleId && (
          <div className="
            flex items-center gap-3 px-4 py-2
            bg-[var(--af-primary-light)]
            border-b border-[var(--af-primary)]/20
            text-sm text-[var(--af-primary)]
          ">
            <span className="flex-1">Hai modifiche non salvate</span>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {currentView === 'dashboard' && <Dashboard inLayout />}
          
          {currentView === 'schedule' && (
            <div className="h-full">
              {organizedSchedule ? (
                <ScheduleView />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--af-bg-hover)] flex items-center justify-center">
                      <Save className="w-8 h-8 text-[var(--af-text-tertiary)]" />
                    </div>
                    <p className="text-lg font-medium text-[var(--af-text-primary)]">
                      Nessuna pianificazione disponibile
                    </p>
                    <p className="text-sm text-[var(--af-text-tertiary)] mt-2">
                      Vai alla Dashboard per generare una nuova pianificazione
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === 'settings' && (
            <div className="h-full overflow-auto p-6">
              <div className="max-w-2xl mx-auto">
                <SettingsModal
                  isOpen={true}
                  onClose={() => setCurrentView('dashboard')}
                  embedded
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Save Schedule Dialog (AppFlowy Modal style) */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="
            bg-[var(--af-bg-surface)]
            border border-[var(--af-border)]
            rounded-lg shadow-xl
            max-w-md w-full p-6
            animate-in fade-in zoom-in-95 duration-200
          ">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--af-text-primary)]">
                Salva Pianificazione
              </h3>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setScheduleName('');
                }}
                className="p-1.5 rounded-md text-[var(--af-text-tertiary)] hover:bg-[var(--af-bg-hover)] hover:text-[var(--af-text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--af-text-secondary)] mb-2">
                  Nome Pianificazione
                </label>
                <input
                  type="text"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="es. Settimana 10-16 Febbraio"
                  className="
                    w-full px-3 py-2.5
                    bg-[var(--af-bg-secondary)]
                    border border-[var(--af-border)]
                    rounded-md
                    text-[var(--af-text-primary)]
                    placeholder:text-[var(--af-text-placeholder)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--af-primary)] focus:border-transparent
                    transition-all
                  "
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveSchedule();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setScheduleName('');
                  }}
                  className="
                    px-4 py-2 text-sm font-medium
                    text-[var(--af-text-secondary)]
                    hover:bg-[var(--af-bg-hover)]
                    rounded-md transition-colors
                  "
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={!scheduleName.trim()}
                  className="
                    px-4 py-2 text-sm font-medium
                    bg-[var(--af-primary)] text-white
                    hover:bg-[var(--af-primary-hover)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    rounded-md transition-colors
                  "
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
