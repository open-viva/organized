'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar';
import { SettingsModal } from './SettingsModal';
import { ScheduleView } from './ScheduleView';
import { Save, X } from 'lucide-react';

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

  // If not logged in, show full dashboard (includes login)
  if (!auth.isLoggedIn) {
    return <Dashboard />;
  }

  // Main App Layout with Sidebar
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        onNavigate={setCurrentView}
        currentView={currentView}
        onSelectSchedule={handleSelectSchedule}
        selectedScheduleId={selectedScheduleId}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Save Button */}
        {organizedSchedule && weekData && !selectedScheduleId && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-700">
                Hai una pianificazione non salvata
              </p>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Salva Pianificazione
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {currentView === 'dashboard' && <Dashboard />}
          
          {currentView === 'schedule' && (
            <div className="h-full overflow-auto">
              {organizedSchedule ? (
                <ScheduleView />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">Nessuna pianificazione disponibile</p>
                    <p className="text-sm mt-2">Vai alla Dashboard per generare una nuova pianificazione</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === 'settings' && (
            <div className="h-full overflow-auto p-6">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Impostazioni</h2>
                <SettingsModal
                  isOpen={true}
                  onClose={() => setCurrentView('dashboard')}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Save Schedule Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Salva Pianificazione
              </h3>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setScheduleName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Pianificazione
                </label>
                <input
                  type="text"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="es. Settimana 10-16 Febbraio"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveSchedule();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setScheduleName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={!scheduleName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
