import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, PlusCircle, ArrowRight, Trash2 } from 'lucide-react';
// We do not import React to avoid lint errors if we don't use it directly

export default function BudgetsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) setBudgets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBudgets = budgets.filter(b => 
    b.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Certeza que deseja excluir este orçamento?")) return;
    
    // Optimistic UI
    setBudgets(budgets.filter(b => b.id !== id));
    
    // DB
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) {
      alert("Erro ao excluir.");
      fetchBudgets();
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, id: string) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    
    setBudgets(budgets.map(b => b.id === id ? { ...b, status: newStatus } : b));
    
    const { error } = await supabase.from('budgets').update({ status: newStatus }).eq('id', id);
    if (error) alert("Erro ao atualizar status.");
  };

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Orçamentos</h2>
        <button 
          onClick={() => navigate('/orcamento/novo')}
          className="bg-[#009ee3] hover:bg-[#007bbf] text-slate-900 dark:text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform shadow-[0_0_15px_rgba(0,158,227,0.4)]"
        >
          <PlusCircle size={18} strokeWidth={2.5} />
          <span>Novo</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Buscar orçamento..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-12 bg-white/80 dark:bg-[#1a2b4b]/80 border border-slate-900/10 dark:border-white/5 rounded-2xl pl-12 pr-4 text-[16px] text-slate-900 dark:text-white outline-none focus:border-[#009ee3] transition-colors"
        />
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 font-bold animate-pulse uppercase text-xs">Carregando...</div>
        ) : filteredBudgets.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 border border-dashed border-slate-900/15 dark:border-white/10 rounded-2xl">
            Nenhum orçamento encontrado.
          </div>
        ) : (
          filteredBudgets.map((budget) => (
            <div 
              key={budget.id} 
              onClick={() => navigate(`/orcamento/${budget.id}`)}
              className="bg-white/80 dark:bg-[#1a2b4b]/80 border border-slate-900/10 dark:border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-1 truncate">{budget.client_name || 'Sem Cliente'}</h3>
                  {budget.created_by && (
                    <span className="text-[10px] text-slate-500 font-bold uppercase block -mt-1 mb-1 tracking-tight">Criado por: {budget.created_by}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <select 
                    value={budget.status || 'Pendente'}
                    onChange={(e) => handleStatusChange(e, budget.id)}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold outline-none cursor-pointer border-none appearance-none ${
                      budget.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' :
                      budget.status === 'Recusado' ? 'bg-red-500/10 text-red-500' :
                      'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Recusado">Recusado</option>
                  </select>
                  
                  <button 
                    onClick={(e) => handleDelete(e, budget.id)} 
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors bg-white/5 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Valor Total</span>
                  <span className="text-lg font-black text-emerald-400">
                    {Number(budget.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    {new Date(budget.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-900/5 dark:bg-white/5 flex items-center justify-center text-[#009ee3]">
                    <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
