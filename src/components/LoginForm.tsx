'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import { Sparkles, Mail, Key, User, Loader2, AlertCircle, Server, ChevronDown, ChevronUp } from 'lucide-react';
import { loginViaBackend, fetchGradesFromBackend } from '@/lib/classeviva';

export function LoginForm() {
  const [loginMethod, setLoginMethod] = useState<'email' | 'studentId'>('email');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { login, backendConfig, setBackendConfig, setGradesData } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const credentials = loginMethod === 'email'
        ? { email, password, loginType: 'email' as const }
        : { studentId, password, loginType: 'userid' as const };

      const loginResult = await loginViaBackend(
        credentials.email || credentials.studentId || '',
        password,
        credentials.loginType,
        backendConfig || undefined
      );

      if (!loginResult.success || !loginResult.session) {
        throw new Error(loginResult.error || 'Login failed');
      }

      login(credentials, loginResult.session, loginMethod);
      
      // For email login, wait a moment for session to be fully initialized
      if (loginMethod === 'email') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Fetch grades after successful login
      try {
        const gradesResult = await fetchGradesFromBackend(
          backendConfig || undefined,
          loginResult.session
        );
        if (gradesResult.success && gradesResult.grades) {
          setGradesData(gradesResult.grades);
        }
      } catch {
        // Grades fetch is optional, don't fail login if it fails
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="af-card p-8">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--af-primary)] to-[var(--af-accent-purple)] flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-2 text-[var(--af-text-primary)]">
          Accedi a ClasseViva
        </h2>
        <p className="text-center text-[var(--af-text-secondary)] mb-6">
          Inserisci le tue credenziali per continuare
        </p>

        {/* Login Method Toggle (AppFlowy style) */}
        <div className="flex bg-[var(--af-bg-secondary)] rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => setLoginMethod('email')}
            className={`
              flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all
              ${loginMethod === 'email'
                ? 'bg-[var(--af-bg-surface)] text-[var(--af-text-primary)] shadow-sm'
                : 'text-[var(--af-text-tertiary)] hover:text-[var(--af-text-secondary)]'
              }
            `}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('studentId')}
            className={`
              flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all
              ${loginMethod === 'studentId'
                ? 'bg-[var(--af-bg-surface)] text-[var(--af-text-primary)] shadow-sm'
                : 'text-[var(--af-text-tertiary)] hover:text-[var(--af-text-secondary)]'
              }
            `}
          >
            Codice Studente
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loginMethod === 'email' ? (
            <div>
              <label className="block text-sm font-medium text-[var(--af-text-secondary)] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--af-text-tertiary)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@example.com"
                  className="
                    w-full pl-10 pr-4 py-3 rounded-lg
                    bg-[var(--af-bg-secondary)]
                    border border-[var(--af-border)]
                    text-[var(--af-text-primary)]
                    placeholder:text-[var(--af-text-placeholder)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--af-primary)] focus:border-transparent
                    transition-all
                  "
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--af-text-secondary)] mb-1.5">
                Codice Studente
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--af-text-tertiary)]" />
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="S1234567A"
                  className="
                    w-full pl-10 pr-4 py-3 rounded-lg
                    bg-[var(--af-bg-secondary)]
                    border border-[var(--af-border)]
                    text-[var(--af-text-primary)]
                    placeholder:text-[var(--af-text-placeholder)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--af-primary)] focus:border-transparent
                    transition-all
                  "
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--af-text-secondary)] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--af-text-tertiary)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="
                  w-full pl-10 pr-4 py-3 rounded-lg
                  bg-[var(--af-bg-secondary)]
                  border border-[var(--af-border)]
                  text-[var(--af-text-primary)]
                  placeholder:text-[var(--af-text-placeholder)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--af-primary)] focus:border-transparent
                  transition-all
                "
                required
              />
            </div>
          </div>

          {/* Advanced Settings (Collapsible) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="
                flex items-center gap-2 text-sm
                text-[var(--af-text-tertiary)]
                hover:text-[var(--af-text-secondary)]
                transition-colors
              "
            >
              <Server className="w-4 h-4" />
              <span>Configurazione Backend</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-[var(--af-bg-secondary)] rounded-lg space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--af-text-tertiary)] mb-1">
                    URL Backend
                  </label>
                  <div
                    className="
                      w-full px-3 py-2 text-sm rounded-md
                      bg-[var(--af-bg-surface)]
                      border border-[var(--af-border)]
                      text-[var(--af-text-primary)]
                    "
                  >
                    {backendConfig?.url || 'http://localhost:3000'}
                  </div>
                  <p className="text-xs text-[var(--af-text-placeholder)] mt-1">
                    URL dell&apos;istanza open-viva/api (configurabile anche via env su Vercel)
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--af-text-tertiary)] mb-1">
                    API Key (opzionale)
                  </label>
                  <input
                    type="password"
                    value={backendConfig?.apiKey || ''}
                    onChange={(e) => setBackendConfig({ url: backendConfig?.url || 'http://localhost:3000', apiKey: e.target.value || undefined })}
                    placeholder="Lascia vuoto se non configurata"
                    className="
                      w-full px-3 py-2 text-sm rounded-md
                      bg-[var(--af-bg-surface)]
                      border border-[var(--af-border)]
                      text-[var(--af-text-primary)]
                      placeholder:text-[var(--af-text-placeholder)]
                      focus:outline-none focus:ring-2 focus:ring-[var(--af-primary)] focus:border-transparent
                    "
                  />
                </div>
              </div>
            )}
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

          <button
            type="submit"
            disabled={isLoading}
            className="
              w-full py-3 px-4 rounded-lg
              bg-[var(--af-primary)] text-white font-medium
              hover:bg-[var(--af-primary-hover)]
              focus:outline-none focus:ring-2 focus:ring-[var(--af-primary)] focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
              flex items-center justify-center gap-2
            "
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

        <p className="mt-6 text-center text-xs text-[var(--af-text-placeholder)]">
          Le tue credenziali sono usate solo per accedere a ClasseViva e non vengono memorizzate sui nostri server.
        </p>
      </div>
    </div>
  );
}
