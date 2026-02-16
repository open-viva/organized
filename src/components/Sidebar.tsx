'use client';

import { useState } from 'react';
import {
  Home,
  Calendar,
  FileText,
  Settings,
  ChevronRight,
  ChevronDown,
  Trash2,
  Plus,
  Search,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store';

// NavItem component - defined outside to avoid recreation on each render
function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm
        transition-all duration-150 group
        ${active
          ? 'bg-[var(--af-bg-active)] text-[var(--af-primary)]'
          : 'text-[var(--af-text-secondary)] hover:bg-[var(--af-bg-hover)] hover:text-[var(--af-text-primary)]'
        }
      `}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[var(--af-primary)]' : ''}`} />
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--af-primary-light)] text-[var(--af-primary)]">
          {badge}
        </span>
      )}
    </button>
  );
}

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
  const logout = useAppStore((state) => state.logout);

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
    <aside
      className="
        h-full flex flex-col
        bg-[var(--af-bg-sidebar)]
        border-r border-[var(--af-border-light)]
        w-[var(--af-sidebar-width)]
        select-none
      "
    >
      {/* Logo & Workspace Header */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--af-primary)] to-[var(--af-accent-purple)] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-[var(--af-text-primary)] truncate">
              Organized
            </h1>
            <p className="text-xs text-[var(--af-text-tertiary)]">Studio intelligente</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <button className="
          w-full flex items-center gap-2 px-3 py-2
          text-sm text-[var(--af-text-tertiary)]
          bg-[var(--af-bg-hover)] rounded-md
          hover:bg-[var(--af-border)] transition-colors
        ">
          <Search className="w-4 h-4" />
          <span>Cerca...</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-[var(--af-bg-surface)] border border-[var(--af-border-light)]">
            ⌘K
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
        <NavItem
          icon={Home}
          label="Dashboard"
          active={currentView === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
        />
        
        <NavItem
          icon={Calendar}
          label="Pianificazione Corrente"
          active={currentView === 'schedule' && !selectedScheduleId}
          onClick={() => {
            onNavigate('schedule');
            onSelectSchedule(null);
          }}
        />

        {/* Saved Schedules Section */}
        <div className="pt-4">
          <button
            onClick={() => setSchedulesExpanded(!schedulesExpanded)}
            className="
              group w-full flex items-center gap-2 px-2 py-1.5
              text-xs font-medium text-[var(--af-text-tertiary)]
              hover:text-[var(--af-text-secondary)] transition-colors
              uppercase tracking-wider
            "
          >
            {schedulesExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Pianificazioni
            <span className="ml-auto flex items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--af-bg-hover)]">
                {savedSchedules.length}
              </span>
              <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </span>
          </button>

          {schedulesExpanded && (
            <div className="mt-1 space-y-0.5">
              {savedSchedules.length === 0 ? (
                <p className="px-3 py-3 text-xs text-[var(--af-text-tertiary)] text-center italic">
                  Nessuna pianificazione salvata
                </p>
              ) : (
                savedSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`
                      group flex items-center gap-2 px-3 py-2 rounded-md
                      text-sm cursor-pointer transition-all duration-150
                      ${selectedScheduleId === schedule.id
                        ? 'bg-[var(--af-bg-active)] text-[var(--af-primary)]'
                        : 'text-[var(--af-text-secondary)] hover:bg-[var(--af-bg-hover)]'
                      }
                    `}
                    onClick={() => {
                      onNavigate('schedule');
                      onSelectSchedule(schedule.id);
                    }}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0 opacity-60" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-[var(--af-text-primary)]">
                        {schedule.name}
                      </p>
                      <p className="text-xs text-[var(--af-text-tertiary)]">
                        {formatDate(schedule.weekData.startDate)} - {formatDate(schedule.weekData.endDate)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                      className="
                        p-1 rounded opacity-0 group-hover:opacity-100
                        hover:bg-[var(--af-accent-red)]/10
                        transition-all
                      "
                      title="Elimina"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[var(--af-accent-red)]" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="p-3 border-t border-[var(--af-border-light)] space-y-1">
        <NavItem
          icon={Settings}
          label="Impostazioni"
          active={currentView === 'settings'}
          onClick={() => onNavigate('settings')}
        />
        
        <button
          onClick={() => {
            logout();
          }}
          className="
            w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm
            text-[var(--af-text-secondary)] hover:bg-[var(--af-bg-hover)]
            hover:text-[var(--af-accent-red)] transition-all duration-150
          "
        >
          <LogOut className="w-4 h-4" />
          <span>Esci</span>
        </button>
      </div>
    </aside>
  );
}
