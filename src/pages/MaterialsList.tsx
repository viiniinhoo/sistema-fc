import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, PlusCircle, ArrowRight, Package } from 'lucide-react';

export default function MaterialsList() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    setLoading(true);
    try {
      // Assuming a join/view or we fetch names
      const { data, error } = await supabase
        .from('material_lists')
        .select(`
           *,
           clients ( name )
        `)
        .order('created_at', { ascending: false });
      
      if (!error && data) setLists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = lists.filter(b => 
    b.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white tracking-tight">Materiais</h2>
        <button 
          onClick={() => navigate('/orcamento/novo')} // For now, points to legacy which generates materials PDF too
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-transform"
        >
          <PlusCircle size={18} strokeWidth={2.5} />
          <span>Nova Lista</span>
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar lista..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-12 bg-[#1a2b4b]/80 border border-white/5 rounded-2xl pl-12 pr-4 text-[16px] text-white outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500 font-bold animate-pulse uppercase text-xs">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
            <Package size={42} className="mb-2 opacity-50" />
            <span>Nenhuma lista encontrada.</span>
          </div>
        ) : (
          filtered.map((list) => (
            <div 
              key={list.id} 
              className="bg-[#1a2b4b]/80 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                   <h3 className="font-bold text-white text-lg leading-tight mb-1">{list.name || 'Nova Lista'}</h3>
                   <span className="text-xs text-amber-500 font-bold">{list.clients?.name || 'Cliente Avulso'}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3">                
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400">
                    {new Date(list.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-emerald-500">
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
