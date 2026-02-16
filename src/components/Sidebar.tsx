'use client';

import { useState } from 'react';
import {
  Home,
  Calendar,
  FileText,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronDown,
  Trash2,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/store';

interface SidebarProps {
  onNavigate: (view: 'dashboard' | 'schedule' | 'settings') => void;
  currentView: string;
  onSelectSchedule: (scheduleId: string | null) => void;
  selectedScheduleId: string | null;
}

export function Sidebar({
  onNavigate,
  currentView,
  onSelectSchedule,
  selectedScheduleId,
}: SidebarProps) {
  const [schedulesExpanded, setSchedulesExpanded] = useState(true);
  const savedSchedules = useAppStore((state) => state.savedSchedules);
  const deleteSchedule = useAppStore((state) => state.deleteSavedSchedule);

  const handleDeleteSchedule = (scheduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Vuoi eliminare questa pianificazione salvata?')) {
      deleteSchedule(scheduleId);
      if (selectedScheduleId === scheduleId) {
        onSelectSchedule(null);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Organized
        </h1>
        <p className="text-xs text-gray-500 mt-1">Studio intelligente</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === 'dashboard'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Home className="w-4 h-4" />
          Dashboard
        </button>

        {/* Current Schedule */}
        <button
          onClick={() => {
            onNavigate('schedule');
            onSelectSchedule(null);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === 'schedule' && !selectedScheduleId
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pianificazione Corrente
        </button>

        {/* Saved Schedules */}
        <div className="pt-2">
          <button
            onClick={() => setSchedulesExpanded(!schedulesExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              Pianificazioni Salvate
            </div>
            {schedulesExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {schedulesExpanded && (
            <div className="mt-1 ml-4 space-y-1">
              {savedSchedules.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-500 italic">
                  Nessuna pianificazione salvata
                </p>
              ) : (
                savedSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      selectedScheduleId === schedule.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      onNavigate('schedule');
                      onSelectSchedule(schedule.id);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{schedule.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(schedule.weekData.startDate)} -{' '}
                        {formatDate(schedule.weekData.endDate)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                      title="Elimina"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === 'settings'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          Impostazioni
        </button>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong>{savedSchedules.length}</strong> pianificazioni salvate
          </p>
        </div>
      </div>
    </div>
  );
}
