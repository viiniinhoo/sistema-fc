import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Users, Package, PlusCircle, ArrowRight } from 'lucide-react';
import { syncOfflineData } from '../services/offlineSync';

export default function Dashboard() {
  const navigate = useNavigate();
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
        { data: recents }
      ] = await Promise.all([
        supabase.from('budgets').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('material_lists').select('*', { count: 'exact', head: true }),
        supabase.from('budgets').select('id, client_name, total_value, status, created_at').order('created_at', { ascending: false }).limit(3)
      ]);

      setStats({
        budgets: budgetsCount || 0,
        clients: clientsCount || 0,
        materials: materialsCount || 0
      });
      setRecentBudgets(recents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, count, icon: Icon, colorClass }: any) => (
    <div className="bg-[#1a2b4b]/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-28 shadow-lg">
      <div className="flex justify-between items-start">
        <span className="text-slate-400 font-bold text-xs uppercase">{title}</span>
        <div className={`p-2 rounded-full bg-white/5 ${colorClass}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
      <span className="text-3xl font-black text-white">{count}</span>
    </div>
  );

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      
      {/* Header Info */}
      <div className="pt-2">
        <h2 className="text-2xl font-black text-white tracking-tight">Fala, Mestre! 👋</h2>
        <p className="text-emerald-400 font-bold text-sm">Resumo da sua operação</p>
      </div>

      {/* Quick Actions (Large Touch Targets) */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => navigate('/orcamento/novo')}
          className="bg-[#009ee3] hover:bg-[#007bbf] text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 h-28 transition-all active:scale-95 shadow-[0_0_20px_rgba(0,158,227,0.3)]"
        >
          <PlusCircle size={28} strokeWidth={2.5} />
          <span className="font-black text-sm uppercase tracking-tight text-center">Novo<br/>Orçamento</span>
        </button>
        <button 
          onClick={() => navigate('/listas')}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 h-28 transition-all active:scale-95 shadow-[0_0_20px_rgba(5,150,105,0.3)]"
        >
          <Package size={28} strokeWidth={2.5} />
          <span className="font-black text-sm uppercase tracking-tight text-center">Nova Lista<br/>Materiais</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Orçados" count={stats.budgets} icon={FileText} colorClass="text-[#009ee3]" />
        <StatCard title="Clientes" count={stats.clients} icon={Users} colorClass="text-amber-400" />
        <StatCard title="Listas" count={stats.materials} icon={Package} colorClass="text-emerald-400" />
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
            <div className="text-center py-8 text-slate-500 text-sm font-medium border border-dashed border-white/10 rounded-2xl">
              Nenhum orçamento registrado ainda.
            </div>
          ) : (
            recentBudgets.map((budget) => (
              <div 
                key={budget.id} 
                onClick={() => navigate(`/orcamento/${budget.id}`)}
                className="bg-[#1a2b4b]/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between active:scale-95 transition-transform"
              >
                <div>
                  <h4 className="font-bold text-white text-base">{budget.client_name || 'Sem Cliente'}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-emerald-400">
                      {Number(budget.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <span className="text-[10px] text-slate-400 px-2 py-0.5 bg-white/5 rounded-full uppercase font-bold">
                      {budget.status || 'Pendente'}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#009ee3]">
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
