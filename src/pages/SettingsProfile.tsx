import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Save, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.user_metadata) {
      setName(user.user_metadata.name || '');
      setPhone(user.user_metadata.phone || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { name, phone }
    });
    setLoading(false);
    if (!error) {
      alert("✅ Perfil atualizado com sucesso!");
      navigate('/');
    } else {
      alert("❌ Erro ao atualizar perfil.");
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Seu Perfil</h2>
      </div>

      <div className="bg-white/80 dark:bg-[#1a2b4b]/80 border border-slate-900/10 dark:border-white/5 rounded-2xl p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-slate-900/5 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400 mb-2">
            <User size={40} />
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase">{user?.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Seu Nome (Para PDFs e Sistema)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-14 bg-white dark:bg-[#1a2b4b] border border-slate-900/10 dark:border-white/5 rounded-xl px-4 text-[16px] text-slate-900 dark:text-white outline-none focus:border-[#009ee3]/50"
              placeholder="Ex: João - Eletricista"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Seu Telefone / WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full h-14 bg-white dark:bg-[#1a2b4b] border border-slate-900/10 dark:border-white/5 rounded-xl px-4 text-[16px] text-slate-900 dark:text-white outline-none focus:border-[#009ee3]/50"
              placeholder="(00) 00000-0000"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1 ml-1">Este número e nome aparecerão no cabeçalho do PDF que você gerar.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 mt-4 bg-[#009ee3] hover:bg-blue-400 text-white font-black text-lg uppercase tracking-tight rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Save size={20} />
            {loading ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </form>
      </div>
    </div>
  );
}
