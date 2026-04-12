import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Phone, MapPin, ChevronRight, Search } from 'lucide-react';
import { executeOrQueue } from '../services/offlineSync';
import { useAuth } from '../contexts/AuthContext';

export default function ClientsList() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '', email: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      if (!error && data) setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;

    const payload = {
      ...newClient,
      user_id: user?.id
    };

    await executeOrQueue({
      id: crypto.randomUUID(),
      type: 'CREATE_CLIENT',
      payload,
      created_at: Date.now()
    });

    setIsModalOpen(false);
    setNewClient({ name: '', phone: '', address: '', email: '' });
    // Optimistic UI update or refetch
    fetchClients();
  };

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col h-full">
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white tracking-tight">Clientes</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform"
        >
          <UserPlus size={18} strokeWidth={2.5} />
          <span>Novo</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-12 bg-[#1a2b4b]/80 border border-white/5 rounded-2xl pl-12 pr-4 text-[16px] text-white outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500 font-bold animate-pulse uppercase text-xs">Carregando...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-10 text-slate-500 border border-dashed border-white/10 rounded-2xl">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className="bg-[#1a2b4b]/60 border border-white/5 p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-transform">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-white text-base truncate">{client.name}</h3>
                <div className="flex items-center gap-3 mt-1.5 opacity-80">
                  {client.phone && (
                    <div className="flex items-center gap-1 text-xs text-slate-300">
                      <Phone size={12} className="text-amber-500" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-1 text-xs text-slate-300 truncate">
                      <MapPin size={12} className="text-amber-500" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                <ChevronRight size={20} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Novo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#030712] w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t border-white/10 p-6 space-y-6 slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95">
            
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-amber-500">Novo Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full h-14 bg-[#1a2b4b] border border-white/5 rounded-xl px-4 text-[16px] text-white outline-none focus:border-amber-500/50"
                  placeholder="Nome do Cliente ou Empresa"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full h-14 bg-[#1a2b4b] border border-white/5 rounded-xl px-4 text-[16px] text-white outline-none focus:border-amber-500/50"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Endereço (Obra / Sede)</label>
                <input
                  type="text"
                  value={newClient.address}
                  onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                  className="w-full h-14 bg-[#1a2b4b] border border-white/5 rounded-xl px-4 text-[16px] text-white outline-none focus:border-amber-500/50"
                  placeholder="Rua, Número, Bairro"
                />
              </div>

              <button
                type="submit"
                className="w-full h-14 mt-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-tight rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                Salvar Cliente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
