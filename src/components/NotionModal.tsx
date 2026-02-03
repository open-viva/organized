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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-white dark:text-zinc-900" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Integrazione Notion
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Come configurare
            </h3>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
              <li>1. Vai su <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="underline">notion.so/my-integrations</a></li>
              <li>2. Crea una nuova integrazione e copia il token</li>
              <li>3. Condividi la pagina Notion con la tua integrazione</li>
              <li>4. Copia l&apos;ID della pagina dall&apos;URL</li>
            </ol>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Token di Integrazione
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="secret_xxxxxxxxxxxxx"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                ID Pagina Parent
              </label>
              <div className="relative">
                <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                L&apos;ID si trova nell&apos;URL: notion.so/La-Mia-Pagina-<strong>abc123...</strong>
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {exportStatus === 'success' && exportedUrl && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Esportato con successo!</span>
                <a
                  href={exportedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 underline"
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : verifyStatus === 'success' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Verifica
            </button>
            <button
              onClick={handleExport}
              disabled={!accessToken || !pageId || !organizedSchedule || isExporting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
