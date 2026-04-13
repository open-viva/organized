'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import {
  X,
  SlidersHorizontal,
  Check,
  Info,
  ExternalLink,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

export function SettingsModal({ isOpen, onClose, embedded = false }: SettingsModalProps) {
  const { includeSunday, setIncludeSunday } = useAppStore();
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      if (!embedded) {
        onClose();
      }
    }, 1500);
  };

  // Content to render (used both in modal and embedded modes)
  const content = (
    <>
      {/* Info Card */}
      <div className="
        p-4 rounded-lg mb-6
        bg-[var(--af-primary-light)]
        border border-[var(--af-primary)]/20
      ">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[var(--af-primary)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-[var(--af-text-primary)] mb-1">
              Modello AI (Gemini 2.5 Flash)
            </h3>
            <p className="text-sm text-[var(--af-text-secondary)]">
              Il planner usa <strong>gemini-2.5-flash</strong>. La chiave API va impostata dal proprietario dell&apos;istanza
              come variabile ambiente su Vercel (<code>GEMINI_API_KEY</code>).
              <a
                href="https://vercel.com/docs/environment-variables"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--af-primary)] hover:underline inline-flex items-center gap-1"
              >
                documentazione Vercel
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-3 text-sm font-medium text-[var(--af-text-secondary)]">
            <input
              type="checkbox"
              checked={includeSunday}
              onChange={(e) => setIncludeSunday(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--af-border)] text-[var(--af-primary)] focus:ring-[var(--af-primary)]"
            />
            Includi domenica nel piano settimanale
          </label>
          <p className="text-xs text-[var(--af-text-tertiary)] mt-2">
            Sabato è sempre disponibile per anticipare lo studio. La domenica è opzionale.
          </p>
        </div>

        {saved && (
          <div className="
            flex items-center gap-2 p-3 rounded-lg text-sm
            bg-[var(--af-accent-green)]/10
            text-[var(--af-accent-green)]
          ">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>Impostazioni salvate!</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        {!embedded && (
          <button
            onClick={onClose}
            className="
              flex-1 px-4 py-3 rounded-lg
              bg-[var(--af-bg-hover)]
              text-[var(--af-text-primary)]
              font-medium
              hover:bg-[var(--af-border)]
              transition-colors
            "
          >
            Annulla
          </button>
        )}
        <button
          onClick={handleSave}
          className={`
            ${embedded ? 'w-auto px-8' : 'flex-1'}
            flex items-center justify-center gap-2 px-4 py-3 rounded-lg
            bg-[var(--af-primary)]
            text-white font-medium
            hover:bg-[var(--af-primary-hover)]
            transition-all
          `}
        >
          <Check className="w-4 h-4" />
          Salva
        </button>
      </div>
    </>
  );

  // Embedded mode: render content directly
  if (embedded) {
    return (
      <div className="af-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--af-primary-light)] flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-[var(--af-primary)]" />
            </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--af-text-primary)]">
              Impostazioni
            </h2>
            <p className="text-sm text-[var(--af-text-tertiary)]">
              Configura le opzioni dell&apos;applicazione
            </p>
          </div>
        </div>
        {content}
      </div>
    );
  }

  // Modal mode
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="
        bg-[var(--af-bg-surface)]
        border border-[var(--af-border)]
        rounded-lg shadow-xl
        max-w-lg w-full max-h-[90vh] overflow-y-auto
        animate-in fade-in zoom-in-95 duration-200
      ">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--af-primary-light)] flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5 text-[var(--af-primary)]" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--af-text-primary)]">
                Impostazioni
              </h2>
            </div>
            <button
              onClick={onClose}
              className="
                p-2 rounded-md
                text-[var(--af-text-tertiary)]
                hover:bg-[var(--af-bg-hover)]
                hover:text-[var(--af-text-primary)]
                transition-colors
              "
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {content}
        </div>
      </div>
    </div>
  );
}
