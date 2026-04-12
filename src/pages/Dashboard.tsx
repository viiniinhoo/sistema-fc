import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Users, Package, PlusCircle, ArrowRight } from 'lucide-react';
import { syncOfflineData } from '../services/offlineSync';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.user_metadata?.name?.split(' ')[0] || 'Mestre';
  const [stats, setStats] = useState({ budgets: 0, clients: 0, materials: 0 });
  const [recentBudgets, setRecentBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to sync any pending data
    syncOfflineData().then(() => {
      fetchDashboardData();
    });
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Parallel fetches for speed
      const [
        { count: budgetsCount },
        { count: clientsCount },
        { count: materialsCount },
        { data: budgetRecents },
        { data: materialRecents }
      ] = await Promise.all([
        supabase.from('budgets').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('material_lists').select('*', { count: 'exact', head: true }),
        supabase.from('budgets').select('id, client_name, total_value, status, created_at, created_by').order('created_at', { ascending: false }).limit(5),
        supabase.from('material_lists').select('id, name, created_at, created_by').order('created_at', { ascending: false }).limit(5)
      ]);

      const combined = [
        ...(budgetRecents || []).map(b => ({ ...b, type: 'budget' })),
        ...(materialRecents || []).map(m => ({ ...m, type: 'material', client_name: m.name, total_value: 0 }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

      setStats({
        budgets: budgetsCount || 0,
        clients: clientsCount || 0,
        materials: materialsCount || 0
      });
      setRecentBudgets(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, count, icon: Icon, colorClass, onClick }: any) => (
    <div 
      onClick={onClick}
      className="bg-white/80 dark:bg-[#1a2b4b]/80 border border-slate-900/10 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between h-28 shadow-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a2b4b] active:scale-95 transition-all"
    >
      <div className="flex justify-between items-start">
        <span className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase">{title}</span>
        <div className={`p-2 rounded-full bg-slate-900/5 dark:bg-white/5 ${colorClass}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
      <span className="text-3xl font-black text-slate-900 dark:text-white">{count}</span>
    </div>
  );

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      
      {/* Header Info */}
      <div className="pt-2">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Fala, {userName}! 👋</h2>
        <p className="text-emerald-400 font-bold text-sm">Resumo da sua operação</p>
      </div>

      {/* Quick Actions (Large Touch Targets) */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => navigate('/orcamento/novo')}
          className="bg-[#1a2b4b] dark:bg-[#009ee3] hover:opacity-90 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 h-28 transition-all active:scale-95 shadow-lg"
        >
          <PlusCircle size={28} strokeWidth={2.5} />
          <span className="font-black text-sm uppercase tracking-tight text-center">Novo<br/>Orçamento</span>
        </button>
        <button 
          onClick={() => navigate('/lista/nova')}
          className="bg-[#009ee3] dark:bg-emerald-600 hover:opacity-90 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 h-28 transition-all active:scale-95 shadow-lg"
        >
          <Package size={28} strokeWidth={2.5} />
          <span className="font-black text-sm uppercase tracking-tight text-center">Nova Lista<br/>Materiais</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Orçados" count={stats.budgets} icon={FileText} colorClass="text-[#009ee3]" onClick={() => navigate('/orcamentos')} />
        <StatCard title="Clientes" count={stats.clients} icon={Users} colorClass="text-amber-400" onClick={() => navigate('/clientes')} />
        <StatCard title="Listas" count={stats.materials} icon={Package} colorClass="text-emerald-400" onClick={() => navigate('/listas')} />
      </div>

      {/* Recent Budgets */}
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <h3 className="text-lg font-black text-slate-200">Últimos Lançamentos</h3>
          <button onClick={() => navigate('/orcamentos')} className="text-[#009ee3] font-bold text-xs uppercase flex items-center gap-1">
            Ver Todos <ArrowRight size={14} />
          </button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="animate-pulse bg-[#1a2b4b]/50 h-20 rounded-2xl"></div>
          ) : recentBudgets.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm font-medium border border-dashed border-slate-900/15 dark:border-white/10 rounded-2xl">
              Nenhum orçamento registrado ainda.
            </div>
          ) : (
            recentBudgets.map((item) => (
              <div 
                key={item.id} 
                onClick={() => navigate(item.type === 'budget' ? `/orcamento/${item.id}` : `/lista/${item.id}`)}
                className="bg-white/80 dark:bg-[#1a2b4b]/80 border border-slate-900/10 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-transform"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base truncate">{item.client_name || 'Sem Nome'}</h4>
                    {item.created_by && (
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">({item.created_by})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {item.type === 'budget' ? (
                      <>
                        <span className="text-xs font-bold text-emerald-400">
                          {Number(item.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                          item.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' :
                          item.status === 'Recusado' ? 'bg-red-500/10 text-red-500' :
                          'bg-slate-900/5 dark:bg-white/5 text-slate-400 dark:text-slate-500'
                        }`}>
                          {item.status || 'Pendente'}
                        </span>
                        <span className="text-[8px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">ORÇAMENTO</span>
                      </>
                    ) : (
                      <span className="text-[8px] bg-[#009ee3]/10 text-[#009ee3] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">LISTA DE MATERIAIS</span>
                    )}
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-full bg-slate-900/5 dark:bg-white/5 flex items-center justify-center ${item.type === 'budget' ? 'text-[#009ee3]' : 'text-emerald-500'}`}>
                  <ArrowRight size={20} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
