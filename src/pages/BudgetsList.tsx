import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, PlusCircle, ArrowRight } from 'lucide-react';
// We do not import React to avoid lint errors if we don't use it directly

export default function BudgetsList() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white tracking-tight">Orçamentos</h2>
        <button 
          onClick={() => navigate('/orcamento/novo')}
          className="bg-[#009ee3] hover:bg-[#007bbf] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform shadow-[0_0_15px_rgba(0,158,227,0.4)]"
        >
          <PlusCircle size={18} strokeWidth={2.5} />
          <span>Novo</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar orçamento..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-12 bg-[#1a2b4b]/80 border border-white/5 rounded-2xl pl-12 pr-4 text-[16px] text-white outline-none focus:border-[#009ee3] transition-colors"
        />
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500 font-bold animate-pulse uppercase text-xs">Carregando...</div>
        ) : filteredBudgets.length === 0 ? (
          <div className="text-center py-10 text-slate-500 border border-dashed border-white/10 rounded-2xl">
            Nenhum orçamento encontrado.
          </div>
        ) : (
          filteredBudgets.map((budget) => (
            <div 
              key={budget.id} 
              onClick={() => navigate(`/orcamento/${budget.id}`)}
              className="bg-[#1a2b4b]/80 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-white text-lg leading-tight mb-1">{budget.client_name || 'Sem Cliente'}</h3>
                <span className="text-[10px] text-slate-400 px-2 py-0.5 bg-white/5 rounded-full uppercase font-bold">
                  {budget.status || 'Pendente'}
                </span>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Valor Total</span>
                  <span className="text-lg font-black text-emerald-400">
                    {Number(budget.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400">
                    {new Date(budget.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#009ee3]">
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
