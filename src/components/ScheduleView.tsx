'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  ChevronDown,
  Share2,
  Sparkles,
  BookOpen,
  FileEdit,
  ClipboardCheck,
  RefreshCw,
  Coffee,
  MoreHorizontal,
  Loader2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import type { OrganizedTask, DaySchedule, WeekSchedule } from '@/types';

// Category icons
const categoryIcons: Record<OrganizedTask['category'], React.ReactNode> = {
  study: <BookOpen className="w-4 h-4" />,
  homework: <FileEdit className="w-4 h-4" />,
  test_prep: <ClipboardCheck className="w-4 h-4" />,
  review: <RefreshCw className="w-4 h-4" />,
  break: <Coffee className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

// Category colors (AppFlowy style)
const categoryColors: Record<OrganizedTask['category'], string> = {
  study: 'bg-[var(--af-primary-light)] text-[var(--af-primary)]',
  homework: 'bg-[rgba(255,185,0,0.1)] text-[var(--af-accent-orange)]',
  test_prep: 'bg-[rgba(251,0,109,0.1)] text-[var(--af-accent-pink)]',
  review: 'bg-[rgba(147,39,255,0.1)] text-[var(--af-accent-purple)]',
  break: 'bg-[rgba(102,207,128,0.1)] text-[var(--af-accent-green)]',
  other: 'bg-[var(--af-bg-hover)] text-[var(--af-text-secondary)]',
};

// Priority indicators
const priorityStyles: Record<OrganizedTask['priority'], string> = {
  high: 'border-l-[var(--af-accent-red)]',
  medium: 'border-l-[var(--af-accent-orange)]',
  low: 'border-l-[var(--af-accent-green)]',
};

// Task Card Component
function TaskCard({
  task,
  onToggle,
}: {
  task: OrganizedTask;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className={`
        group p-4 rounded-lg border-l-4
        bg-[var(--af-bg-surface)]
        border border-[var(--af-border-light)]
        hover:border-[var(--af-border)]
        transition-all duration-150
        ${priorityStyles[task.priority]}
        ${task.completed ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id)}
          className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-[var(--af-accent-green)]" />
          ) : (
            <Circle className="w-5 h-5 text-[var(--af-text-tertiary)] group-hover:text-[var(--af-primary)] transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <span className={`p-1 rounded ${categoryColors[task.category]}`}>
              {categoryIcons[task.category]}
            </span>
            <span className="text-xs text-[var(--af-text-tertiary)] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.timeSlot}
            </span>
            <span className="text-xs text-[var(--af-text-placeholder)]">
              {task.duration} min
            </span>
          </div>

          <h4
            className={`
              font-medium text-[var(--af-text-primary)]
              ${task.completed ? 'line-through text-[var(--af-text-tertiary)]' : ''}
            `}
          >
            {task.title}
          </h4>

          {task.description && (
            <p className="text-sm text-[var(--af-text-secondary)] mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {task.relatedEvent && (
            <div className="mt-2 text-xs text-[var(--af-primary)] flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              {task.relatedEvent.subject || task.relatedEvent.title}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Day Section Component (AppFlowy table-like design)
function DaySection({
  day,
  onToggleTask,
}: {
  day: DaySchedule;
  onToggleTask: (taskId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const dayDate = parseISO(day.date);
  const isToday = format(new Date(), 'yyyy-MM-dd') === day.date;
  const completedCount = day.tasks.filter((t) => t.completed).length;
  const progress = day.tasks.length > 0 ? (completedCount / day.tasks.length) * 100 : 0;

  return (
    <div className="mb-4">
      {/* Day Header (AppFlowy style) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center gap-4 p-4 rounded-lg
          bg-[var(--af-bg-surface)]
          border border-[var(--af-border-light)]
          hover:border-[var(--af-border)]
          transition-all duration-150
          ${isToday ? 'border-[var(--af-primary)]/50' : ''}
        `}
      >
        {/* Expand/Collapse Icon */}
        <div className="text-[var(--af-text-tertiary)]">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        {/* Calendar Icon */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${isToday 
            ? 'bg-[var(--af-primary)] text-white' 
            : 'bg-[var(--af-bg-hover)] text-[var(--af-text-secondary)]'
          }
        `}>
          <Calendar className="w-5 h-5" />
        </div>

        {/* Day Info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className={`
              font-semibold capitalize
              ${isToday ? 'text-[var(--af-primary)]' : 'text-[var(--af-text-primary)]'}
            `}>
              {format(dayDate, 'EEEE', { locale: it })}
            </h3>
            {isToday && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--af-primary)] text-white">
                Oggi
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--af-text-tertiary)]">
            {format(dayDate, 'd MMMM yyyy', { locale: it })}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-[var(--af-bg-hover)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--af-accent-green)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-[var(--af-text-tertiary)] min-w-[60px] text-right">
            {completedCount}/{day.tasks.length}
          </span>
        </div>
      </button>

      {/* Tasks List */}
      {isExpanded && (
        <div className="mt-2 ml-6 space-y-2">
          {day.tasks.length === 0 ? (
            <p className="text-center text-[var(--af-text-tertiary)] py-6">
              Nessuna attività pianificata
            </p>
          ) : (
            day.tasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={onToggleTask} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Chevron Right icon component (for consistency)
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );
}

// Main Schedule View Component
export function ScheduleView() {
  const { organizedSchedule, setOrganizedSchedule } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  const [icalFeedUrl, setIcalFeedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!organizedSchedule) {
    return null;
  }

  const handleToggleTask = (taskId: string) => {
    const updatedSchedule: WeekSchedule = {
      ...organizedSchedule,
      days: organizedSchedule.days.map((day) => ({
        ...day,
        tasks: day.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        ),
      })),
    };
    setOrganizedSchedule(updatedSchedule);
  };

  const handleExportICal = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/ical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: organizedSchedule }),
      });

      if (!response.ok) throw new Error('Export failed');

      const data = await response.json();
      if (data.success && data.feedUrl) {
        setIcalFeedUrl(data.feedUrl);
        // Copy to clipboard
        await navigator.clipboard.writeText(data.feedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyUrl = async () => {
    if (icalFeedUrl) {
      await navigator.clipboard.writeText(icalFeedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalTasks = organizedSchedule.days.reduce((sum, day) => sum + day.tasks.length, 0);
  const completedTasks = organizedSchedule.days.reduce(
    (sum, day) => sum + day.tasks.filter((t) => t.completed).length,
    0
  );
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header Card (AppFlowy style) */}
      <div className="af-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="
            w-12 h-12 rounded-xl flex-shrink-0
            bg-gradient-to-br from-[var(--af-primary)] to-[var(--af-accent-purple)]
            flex items-center justify-center
          ">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--af-text-primary)] mb-1">
              Il Tuo Piano di Studio
            </h2>
            <p className="text-[var(--af-text-secondary)] text-sm">
              {organizedSchedule.overview}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--af-text-secondary)]">Progresso</span>
            <span className="text-sm font-medium text-[var(--af-text-primary)]">
              {completedTasks}/{totalTasks} completate ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 bg-[var(--af-bg-hover)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--af-primary)] to-[var(--af-accent-purple)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tips Section */}
      {organizedSchedule.tips.length > 0 && (
        <div className="
          af-card p-4 mb-6
          border-l-4 border-l-[var(--af-accent-orange)]
        ">
          <h3 className="font-semibold text-[var(--af-text-primary)] mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--af-accent-orange)]" />
            Consigli per questa settimana
          </h3>
          <ul className="space-y-1.5">
            {organizedSchedule.tips.map((tip, index) => (
              <li key={index} className="text-sm text-[var(--af-text-secondary)] flex items-start gap-2">
                <span className="text-[var(--af-accent-orange)] mt-1">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Export Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleExportICal}
          disabled={isExporting}
          className="
            flex items-center gap-2 px-4 py-2
            af-card hover:border-[var(--af-border)]
            text-sm font-medium text-[var(--af-text-primary)]
            disabled:opacity-50
            transition-colors
          "
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4 text-[var(--af-primary)]" />
          )}
          Crea Link Calendario
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Il mio piano di studio',
                text: organizedSchedule.overview,
              });
            }
          }}
          className="
            flex items-center gap-2 px-4 py-2
            af-card hover:border-[var(--af-border)]
            text-sm font-medium text-[var(--af-text-primary)]
            transition-colors
          "
        >
          <Share2 className="w-4 h-4 text-[var(--af-accent-purple)]" />
          Condividi
        </button>
      </div>

      {/* iCal Feed URL Display */}
      {icalFeedUrl && (
        <div className="
          af-card p-4 mb-6
          border-l-4 border-l-[var(--af-primary)]
        ">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-[var(--af-primary)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--af-text-primary)] mb-1">
                Link Calendario Creato! ✓
              </p>
              <p className="text-xs text-[var(--af-text-secondary)] mb-2">
                Usa questo URL in Apple Calendar, Google Calendar, o qualsiasi app calendario:
              </p>
              <div className="
                bg-[var(--af-bg-secondary)]
                border border-[var(--af-border)]
                rounded-md px-3 py-2 mb-2
              ">
                <code className="text-xs text-[var(--af-primary)] break-all">
                  {icalFeedUrl}
                </code>
              </div>
              <button
                onClick={handleCopyUrl}
                className="text-xs text-[var(--af-primary)] hover:underline font-medium flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copiato!' : 'Copia link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Days List */}
      <div className="space-y-2">
        {organizedSchedule.days.map((day) => (
          <DaySection key={day.date} day={day} onToggleTask={handleToggleTask} />
        ))}
      </div>
    </div>
  );
}
