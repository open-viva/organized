'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import { BookOpen, Mail, Key, User, Loader2, AlertCircle, Server } from 'lucide-react';

export function LoginForm() {
  const [loginMethod, setLoginMethod] = useState<'email' | 'studentId'>('email');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, backendConfig, setBackendConfig, setGradesData } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const credentials = loginMethod === 'email'
        ? { email, password, loginType: 'email' as const }
        : { studentId, password, loginType: 'userid' as const };

      const response = await fetch('/api/classeviva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'login', 
          credentials,
          backendConfig,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(credentials, data.session, loginMethod);
      
      // Store grades if returned from backend
      if (data.grades) {
        setGradesData(data.grades);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-2 text-zinc-900 dark:text-white">
          Accedi a ClasseViva
        </h2>
        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-6">
          Inserisci le tue credenziali per continuare
        </p>

        {/* Backend Configuration */}
        <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Configurazione Backend (Obbligatoria)
            </span>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              URL Backend
            </label>
            <input
              type="text"
              value={backendConfig?.url || ''}
              onChange={(e) => setBackendConfig({ url: e.target.value, apiKey: backendConfig?.apiKey })}
              placeholder="http://localhost:5000"
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">
              Il backend deve essere in esecuzione localmente con le chiamate da IP residenziale
            </p>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              API Key (opzionale)
            </label>
            <input
              type="password"
              value={backendConfig?.apiKey || ''}
              onChange={(e) => setBackendConfig({ url: backendConfig?.url || 'http://localhost:5000', apiKey: e.target.value || undefined })}
              placeholder="Lascia vuoto se non configurata"
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400"
            />
          </div>
        </div>

        {/* Login Method Toggle */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => setLoginMethod('email')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              loginMethod === 'email'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('studentId')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              loginMethod === 'studentId'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Codice Studente
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loginMethod === 'email' ? (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Codice Studente
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="S1234567A"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Accesso in corso...
              </>
            ) : (
              'Accedi'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Le tue credenziali sono usate solo per accedere a ClasseViva e non vengono memorizzate sui nostri server.
        </p>
      </div>
    </div>
  );
}
