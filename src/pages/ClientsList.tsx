import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserPlus, Phone, MapPin, ChevronRight, Search, Trash2 } from 'lucide-react';
import { executeOrQueue } from '../services/offlineSync';
import { useAuth } from '../contexts/AuthContext';

export default function ClientsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<any>({ name: '', phone: '', address: '', email: '' });
  const [clientHistory, setClientHistory] = useState({ budgets: 0, lists: 0 });

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

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)} ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleDeleteClient = async () => {
    if (!currentClient.id) return;
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${currentClient.name}"?\nIsso não removerá os orçamentos já criados.`)) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', currentClient.id);
      if (error) throw error;
      
      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao excluir cliente. Verifique se existem dependências.");
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient.name) return;

    const payload = {
      ...currentClient,
      user_id: user?.id
    };

    const isUpdate = !!currentClient.id;

    await executeOrQueue({
      id: crypto.randomUUID(),
      type: isUpdate ? 'UPDATE_CLIENT' : 'CREATE_CLIENT',
      payload,
      created_at: Date.now()
    });

    setIsModalOpen(false);
    setCurrentClient({ name: '', phone: '', address: '' });
    fetchClients();
  };

  const handleEditClient = async (client: any) => {
    setCurrentClient(client);
    setIsModalOpen(true);
    setClientHistory({ budgets: 0, lists: 0 });
    try {
      const [b, l] = await Promise.all([
        supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
        supabase.from('material_lists').select('id', { count: 'exact', head: true }).eq('client_id', client.id)
      ]);
      setClientHistory({
        budgets: b.count || 0,
        lists: l.count || 0
      });
    } catch {}
  };


  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col h-full">
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Clientes</h2>
        <button 
          onClick={() => {
            setCurrentClient({ name: '', phone: '', address: '', email: '' });
            setIsModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform"
        >
          <UserPlus size={18} strokeWidth={2.5} />
          <span>Novo</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-12 bg-white/80 dark:bg-[#1a2b4b]/80 border border-slate-900/10 dark:border-white/5 rounded-2xl pl-12 pr-4 text-[16px] text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 font-bold animate-pulse uppercase text-xs">Carregando...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 border border-dashed border-slate-900/15 dark:border-white/10 rounded-2xl">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filteredClients.map((client) => (
            <div 
              key={client.id} 
              onClick={() => handleEditClient(client)}
              className="bg-white/60 dark:bg-[#1a2b4b]/60 border border-slate-900/10 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{client.name}</h3>
                <div className="flex items-center gap-3 mt-1.5 opacity-80">
                  {client.phone && (
                    <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                      <Phone size={12} className="text-amber-500" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 truncate">
                      <MapPin size={12} className="text-amber-500" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 shrink-0 rounded-full bg-slate-900/5 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-400">
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
          <div className="relative bg-slate-50 dark:bg-[#030712] w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t border-slate-900/15 dark:border-white/10 p-6 space-y-6 slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95">
            
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-amber-500">
                {currentClient.id ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <div className="flex items-center gap-2">
                {currentClient.id && (
                  <button 
                    onClick={handleDeleteClient}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white font-bold">✕</button>
              </div>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={currentClient.name}
                  onChange={e => setCurrentClient({ ...currentClient, name: e.target.value })}
                  className="w-full h-14 bg-white dark:bg-[#1a2b4b] border border-slate-900/10 dark:border-white/5 rounded-xl px-4 text-[16px] text-slate-900 dark:text-white outline-none focus:border-amber-500/50"
                  placeholder="Nome do Cliente ou Empresa"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  value={currentClient.phone}
                  onChange={e => setCurrentClient({ ...currentClient, phone: formatWhatsApp(e.target.value) })}
                  maxLength={13}
                  className="w-full h-14 bg-white dark:bg-[#1a2b4b] border border-slate-900/10 dark:border-white/5 rounded-xl px-4 text-[16px] text-slate-900 dark:text-white outline-none focus:border-amber-500/50"
                  placeholder="21 90000-0000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Endereço (Obra / Sede)</label>
                <input
                  type="text"
                  value={currentClient.address}
                  onChange={e => setCurrentClient({ ...currentClient, address: e.target.value })}
                  className="w-full h-14 bg-white dark:bg-[#1a2b4b] border border-slate-900/10 dark:border-white/5 rounded-xl px-4 text-[16px] text-slate-900 dark:text-white outline-none focus:border-amber-500/50"
                  placeholder="Rua, Número, Bairro"
                />
              </div>

              {currentClient.id && (
                <div className="bg-slate-900/5 dark:bg-white/5 rounded-xl p-3 mt-2 flex items-center justify-around border border-slate-900/10 dark:border-white/5">
                  <div 
                    onClick={() => navigate(`/orcamentos?search=${encodeURIComponent(currentClient.name)}`)}
                    className="text-center cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                  >
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Orçamentos</p>
                    <p className="text-xl font-black text-[#009ee3]">{clientHistory.budgets}</p>
                  </div>
                  <div className="w-[1px] h-8 bg-slate-900/10 dark:bg-white/10" />
                  <div 
                    onClick={() => navigate(`/listas?search=${encodeURIComponent(currentClient.name)}`)}
                    className="text-center cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                  >
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Listas Limpas</p>
                    <p className="text-xl font-black text-emerald-500">{clientHistory.lists}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-14 mt-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg uppercase tracking-tight rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {currentClient.id ? 'Salvar Edição' : 'Salvar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
