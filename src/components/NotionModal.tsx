'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import {
  Link2,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Database,
  ExternalLink,
  X,
} from 'lucide-react';

interface NotionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotionModal({ isOpen, onClose }: NotionModalProps) {
  const { notionIntegration, setNotionIntegration, organizedSchedule } = useAppStore();
  const [accessToken, setAccessToken] = useState(notionIntegration?.accessToken || '');
  const [pageId, setPageId] = useState(notionIntegration?.pageId || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [exportedUrl, setExportedUrl] = useState('');

  if (!isOpen) return null;

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyStatus('idle');
    setError('');

    try {
      const response = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', accessToken }),
      });

      const data = await response.json();

      if (data.success) {
        setVerifyStatus('success');
        setNotionIntegration({ accessToken, pageId: pageId || undefined });
      } else {
        setVerifyStatus('error');
        setError(data.error || 'Verifica fallita');
      }
    } catch (err) {
      setVerifyStatus('error');
      setError(err instanceof Error ? err.message : 'Errore di connessione');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExport = async () => {
    if (!accessToken || !pageId || !organizedSchedule) {
      setError('Inserisci token e ID pagina, e assicurati di avere un piano generato');
      return;
    }

    setIsExporting(true);
    setExportStatus('idle');
    setError('');

    try {
      const response = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createPage',
          integration: { accessToken, pageId },
          schedule: organizedSchedule,
          parentPageId: pageId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExportStatus('success');
        setExportedUrl(data.pageUrl || '');
        setNotionIntegration({ accessToken, pageId });
      } else {
        setExportStatus('error');
        setError(data.error || 'Esportazione fallita');
      }
    } catch (err) {
      setExportStatus('error');
      setError(err instanceof Error ? err.message : 'Errore durante l\'esportazione');
    } finally {
      setIsExporting(false);
    }
  };

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
              <div className="w-10 h-10 rounded-lg bg-[var(--af-text-primary)] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--af-bg-primary)]" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--af-text-primary)]">
                Integrazione Notion
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

          {/* Instructions */}
          <div className="
            p-4 rounded-lg mb-6
            bg-[var(--af-primary-light)]
            border border-[var(--af-primary)]/20
          ">
            <h3 className="font-medium text-[var(--af-text-primary)] mb-2">
              Come configurare
            </h3>
            <ol className="text-sm text-[var(--af-text-secondary)] space-y-1.5">
              <li className="flex gap-2">
                <span className="text-[var(--af-primary)]">1.</span>
                Vai su{' '}
                <a 
                  href="https://www.notion.so/my-integrations" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[var(--af-primary)] hover:underline inline-flex items-center gap-1"
                >
                  notion.so/my-integrations
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--af-primary)]">2.</span>
                Crea una nuova integrazione e copia il token
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--af-primary)]">3.</span>
                Condividi la pagina Notion con la tua integrazione
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--af-primary)]">4.</span>
                Copia l&apos;ID della pagina dall&apos;URL
              </li>
            </ol>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--af-text-secondary)] mb-1.5">
                Token di Integrazione
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--af-text-tertiary)]" />
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="secret_xxxxxxxxxxxxx"
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
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--af-text-secondary)] mb-1.5">
                ID Pagina Parent o URL Notion
              </label>
              <div className="relative">
                <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--af-text-tertiary)]" />
                <input
                  type="text"
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  placeholder="https://notion.so/username/Page-xxx..."
                  className="
                    w-full pl-10 pr-4 py-3 rounded-lg text-sm
                    bg-[var(--af-bg-secondary)]
                    border border-[var(--af-border)]
                    text-[var(--af-text-primary)]
                    placeholder:text-[var(--af-text-placeholder)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--af-primary)] focus:border-transparent
                    transition-all
                  "
                />
              </div>
              <p className="text-xs text-[var(--af-text-placeholder)] mt-1">
                Puoi incollare l&apos;URL completo della pagina Notion oppure solo l&apos;ID (UUID)
              </p>
            </div>

            {error && (
              <div className="
                flex items-center gap-2 p-3 rounded-lg text-sm
                bg-[var(--af-accent-red)]/10
                text-[var(--af-accent-red)]
              ">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {exportStatus === 'success' && exportedUrl && (
              <div className="
                flex items-center gap-2 p-3 rounded-lg text-sm
                bg-[var(--af-accent-green)]/10
                text-[var(--af-accent-green)]
              ">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Esportato con successo!</span>
                <a
                  href={exportedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 hover:underline"
                >
                  Apri <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleVerify}
              disabled={!accessToken || isVerifying}
              className="
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                bg-[var(--af-bg-hover)] text-[var(--af-text-primary)]
                font-medium
                hover:bg-[var(--af-border)]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : verifyStatus === 'success' ? (
                <Check className="w-4 h-4 text-[var(--af-accent-green)]" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Verifica
            </button>
            <button
              onClick={handleExport}
              disabled={!accessToken || !pageId || !organizedSchedule || isExporting}
              className="
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                bg-[var(--af-primary)] text-white
                font-medium
                hover:bg-[var(--af-primary-hover)]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all
              "
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Esporta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
