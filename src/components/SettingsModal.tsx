'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import {
  X,
  Key,
  Check,
  AlertCircle,
  Info,
  ExternalLink,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

export function SettingsModal({ isOpen, onClose, embedded = false }: SettingsModalProps) {
  const { openaiApiKey, setOpenAIApiKey } = useAppStore();
  const [apiKey, setApiKey] = useState(openaiApiKey || '');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setOpenAIApiKey(apiKey || null);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      if (!embedded) {
        onClose();
      }
    }, 1500);
  };

  const isValidKey = apiKey.startsWith('sk-') || apiKey === '';

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
              API Key OpenAI
            </h3>
            <p className="text-sm text-[var(--af-text-secondary)]">
              Per utilizzare l&apos;intelligenza artificiale nella pianificazione, inserisci la tua chiave API OpenAI. 
              Puoi ottenerla su{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--af-primary)] hover:underline inline-flex items-center gap-1"
              >
                platform.openai.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--af-text-secondary)] mb-2">
            OpenAI API Key (opzionale)
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--af-text-tertiary)]" />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="
                w-full pl-10 pr-4 py-3 rounded-lg
                bg-[var(--af-bg-secondary)]
                border border-[var(--af-border)]
                text-[var(--af-text-primary)]
                placeholder:text-[var(--af-text-placeholder)]
                focus:outline-none focus:ring-2 focus:ring-[var(--af-primary)] focus:border-transparent
                transition-all
              "
            />
          </div>
          {!isValidKey && apiKey && (
            <div className="flex items-center gap-2 mt-2 text-[var(--af-accent-red)] text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>La chiave API deve iniziare con &quot;sk-&quot;</span>
            </div>
          )}
          <p className="text-xs text-[var(--af-text-tertiary)] mt-2">
            La chiave viene salvata solo nel tuo browser. Se lasci vuoto, l&apos;app userà lo scheduling senza AI.
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
          disabled={!isValidKey}
          className={`
            ${embedded ? 'w-auto px-8' : 'flex-1'}
            flex items-center justify-center gap-2 px-4 py-3 rounded-lg
            bg-[var(--af-primary)]
            text-white font-medium
            hover:bg-[var(--af-primary-hover)]
            disabled:opacity-50 disabled:cursor-not-allowed
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
            <Key className="w-5 h-5 text-[var(--af-primary)]" />
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
                <Key className="w-5 h-5 text-[var(--af-primary)]" />
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
