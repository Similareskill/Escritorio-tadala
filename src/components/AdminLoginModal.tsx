import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  User,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface AdminLoginModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ADMIN_AUTH_KEY = 'greenvalley_admin_authenticated';

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Verify credentials: username 'admin' and password 'greenvalley2026' (or PIN '2026')
    const isValid =
      cleanUser === 'admin' &&
      (cleanPass === 'greenvalley2026' || cleanPass === '2026' || cleanPass === 'admin123');

    if (!isValid) {
      setErrorMessage('Credenciais inválidas. Verifique o usuário e a senha de administrador.');
      return;
    }

    setIsSubmitting(true);
    setIsSuccess(true);
    soundEngine.playProximityConnect();

    // Save persistent authentication state
    if (rememberMe) {
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    } else {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess();
    }, 600);
  };

  const handleFillDemoCredentials = () => {
    setUsername('admin');
    setPassword('greenvalley2026');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header decoration bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Cancelar e voltar ao mapa"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Top Brand & Icon */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-display">
                  Painel de Gestão Admin
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold uppercase">
                  Acesso Restrito
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Faça login para gerenciar membros, salas e o escritório.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Autenticação bem-sucedida! Carregando console...</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Usuário do Administrador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoFocus
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me checkbox */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/30"
                />
                <span>Manter autenticado neste navegador</span>
              </label>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Acessando...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Entrar no Painel de Gestão</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar e Voltar ao Mapa
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Credenciais de Demonstração</span>
                </div>
                <div>
                  Usuário: <code className="text-slate-200 font-mono bg-slate-800 px-1 py-0.5 rounded">admin</code> | Senha: <code className="text-slate-200 font-mono bg-slate-800 px-1 py-0.5 rounded">greenvalley2026</code>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFillDemoCredentials}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Preencher
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
