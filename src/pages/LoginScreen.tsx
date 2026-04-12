import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="LVC Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter text-[#1a2b4b]">
            LVC <span className="text-[#009ee3]">ELÉTRICA</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Controle de Serviços e Orçamentos</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700 ml-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-4 text-[16px] outline-none focus:border-[#009ee3] focus:ring-2 focus:ring-[#009ee3]/20 transition-all font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700 ml-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-4 text-[16px] outline-none focus:border-[#009ee3] focus:ring-2 focus:ring-[#009ee3]/20 transition-all font-medium"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-[#009ee3] hover:bg-[#007bbf] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4 active:scale-[0.98]"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Entrar no Sistema
                <LogIn className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
      
      <p className="mt-8 text-slate-400 text-sm font-medium">Acesso restrito a colaboradores</p>
    </div>
  );
}
