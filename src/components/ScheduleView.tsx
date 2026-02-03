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
  ChevronUp,
  Download,
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

// Priority colors
const priorityColors: Record<OrganizedTask['priority'], string> = {
  high: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  medium: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  low: 'text-green-500 bg-green-50 dark:bg-green-900/20',
};

// Task Card Component
function TaskCard({
  task,
  onToggle,
}: {
  task: OrganizedTask;
  onToggle: (id: string) => void;
}) {
  const priorityClass = priorityColors[task.priority];

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        task.completed
          ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 opacity-60'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id)}
          className="mt-1 flex-shrink-0"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-zinc-300 hover:text-blue-500 transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`p-1 rounded ${priorityClass}`}>
              {categoryIcons[task.category]}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {task.timeSlot}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              ({task.duration} min)
            </span>
          </div>

          <h4
            className={`font-medium ${
              task.completed
                ? 'line-through text-zinc-400 dark:text-zinc-500'
                : 'text-zinc-900 dark:text-white'
            }`}
          >
            {task.title}
          </h4>

          {task.description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {task.relatedEvent && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              {task.relatedEvent.subject || task.relatedEvent.title}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Day Section Component
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

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 rounded-xl mb-3 hover:from-zinc-200 hover:to-zinc-100 dark:hover:from-zinc-700 dark:hover:to-zinc-800 transition-all"
      >
        <div className="flex items-center gap-3">
          <Calendar className={`w-5 h-5 ${isToday ? 'text-blue-500' : 'text-zinc-400'}`} />
          <div className="text-left">
            <h3 className={`font-semibold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-white'}`}>
              {format(dayDate, 'EEEE', { locale: it })}
              {isToday && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Oggi</span>}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {format(dayDate, 'd MMMM yyyy', { locale: it })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {completedCount}/{day.tasks.length} completate
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-3 pl-2">
          {day.tasks.length === 0 ? (
            <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
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

// Main Schedule View Component
export function ScheduleView() {
  const { organizedSchedule, setOrganizedSchedule } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);

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

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `piano-studio-${organizedSchedule.days[0]?.date || 'week'}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalTasks = organizedSchedule.days.reduce((sum, day) => sum + day.tasks.length, 0);
  const completedTasks = organizedSchedule.days.reduce(
    (sum, day) => sum + day.tasks.filter((t) => t.completed).length,
    0
  );
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6" />
          <h2 className="text-xl font-bold">Il Tuo Piano di Studio</h2>
        </div>
        
        <p className="text-blue-100 mb-4">{organizedSchedule.overview}</p>

        {/* Progress */}
        <div className="bg-white/20 rounded-full h-3 mb-2">
          <div
            className="bg-white rounded-full h-3 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-blue-100">
          {completedTasks} di {totalTasks} attività completate ({progressPercent}%)
        </p>
      </div>

      {/* Tips */}
      {organizedSchedule.tips.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Consigli per questa settimana
          </h3>
          <ul className="space-y-1">
            {organizedSchedule.tips.map((tip, index) => (
              <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleExportICal}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Esporta iCal
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
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-sm font-medium"
        >
          <Share2 className="w-4 h-4" />
          Condividi
        </button>
      </div>

      {/* Days */}
      <div>
        {organizedSchedule.days.map((day) => (
          <DaySection key={day.date} day={day} onToggleTask={handleToggleTask} />
        ))}
      </div>
    </div>
  );
}
