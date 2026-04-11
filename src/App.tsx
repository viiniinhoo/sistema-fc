import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CurrencyInput from 'react-currency-input-field';
import type { BudgetData, BudgetItem } from './types';
import { generateCommercialPDF, generateMaterialListPDF, generateAllPDFs } from './utils/pdfGenerator';
import { saveBudget, listBudgets, getBudgetById, deleteBudget } from './services/supabaseService';
import { 
  Plus, 
  Trash2, 
  Download, 
  RefreshCw,
  Building2,
  Package,
  Save,
  Clock,
  ChevronLeft,
  Search
} from 'lucide-react';

const CATEGORIES = ['Elétrica', 'Hidráulica', 'Infraestrutura', 'Acabamento', 'Geral'];
const UNITS = ['un', 'm', 'pç', 'cx', 'kit', 'm²', 'm³'];

const INITIAL_DATA: BudgetData = {
  clientName: '',
  whatsapp: '',
  workAddress: '',
  validityDays: '5',
  paymentTerms: '',
  items: [],
  observations: ''
};

export default function App() {
  const [view, setView] = useState<'editor' | 'history'>('editor');
  const [data, setData] = useState<BudgetData>(INITIAL_DATA);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState<'commercial' | 'materials' | 'all' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)} ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  useEffect(() => {
    const saved = localStorage.getItem('@FCEletrica:current');
    if (saved) setData(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('@FCEletrica:current', JSON.stringify(data));
  }, [data]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const budgets = await listBudgets();
      setHistory(budgets);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data.clientName) return alert("Informe o nome do cliente.");
    setIsLoading(true);
    try {
      const totalValue = data.items.reduce((acc, i) => acc + i.total, 0);
      const saved = await saveBudget(data, totalValue);
      setData({ ...data, id: saved.id });
      alert("✅ Orçamento salvo com sucesso!");
      if (view === 'history') fetchHistory();
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao salvar. Verifique se o Supabase está configurado.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    setIsLoading(true);
    try {
      const budget = await getBudgetById(id);
      setData(budget);
      setView('editor');
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar orçamento.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este orçamento permanentemente?")) return;
    try {
      await deleteBudget(id);
      setHistory(history.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  };

  const handleClear = () => {
    if (confirm('Deseja iniciar um novo orçamento?')) {
      setData(INITIAL_DATA);
      localStorage.removeItem('@FCEletrica:current');
    }
  };

  const addItem = () => {
    const newItem: BudgetItem = {
      id: uuidv4(),
      description: '',
      category: 'Elétrica',
      unit: 'un',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setData({ ...data, items: [...data.items, newItem] });
  };

  const removeItem = (id: string) => {
    setData({ ...data, items: data.items.filter(item => item.id !== id) });
  };

  const updateItem = (id: string, field: keyof BudgetItem, value: string | number) => {
    setData({
      ...data, items: data.items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.total = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
          }
          return updated;
        }
        return item;
      })
    });
  };

  const handleGenerate = async (type: 'commercial' | 'materials' | 'all') => {
    if (!data.clientName) return alert("Informe o Nome do Cliente.");
    if (data.items.length === 0) return alert("Adicione itens primeiro.");

    setIsGenerating(type);
    try {
      if (type === 'commercial') await generateCommercialPDF(data);
      else if (type === 'materials') await generateMaterialListPDF(data);
      else await generateAllPDFs(data);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(null);
    }
  };

  const totalItemsValue = data.items.reduce((acc, curr) => acc + curr.total, 0);

  const filteredHistory = history.filter(b => 
    b.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 pb-40 touch-pan-y antialiased font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1a2b4b] border-b border-white/5 px-4 py-4 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src="/logo.png" alt="FC Logo" className="h-8 w-auto" />
             <h1 className="text-xl font-black italic tracking-tighter">
                <span className="text-white">FC</span> <span className="text-[#009ee3]">ELÉTRICA</span>
             </h1>
          </div>
          
          <div className="flex gap-2">
            {view === 'editor' ? (
              <>
                <button onClick={() => { setView('history'); fetchHistory(); }} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-400">
                  <Clock size={18} />
                </button>
                <button onClick={handleClear} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-400">
                  <RefreshCw size={18} />
                </button>
              </>
            ) : (
              <button onClick={() => setView('editor')} className="px-4 bg-white/5 rounded-full flex items-center gap-2 text-sm font-bold">
                 <ChevronLeft size={16}/> Voltar
              </button>
            )}
          </div>
        </div>
      </header>

      {view === 'editor' ? (
        <div className="max-w-6xl mx-auto px-3 py-4 space-y-4">
          {/* Editor View */}
          <section className="glass-panel p-4 rounded-xl border-l-2 border-l-blue-500">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Building2 size={12} /> Dados do Contrato
            </h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-slate-600 uppercase">Cliente</label>
                <input type="text" value={data.clientName} onChange={e => setData({...data, clientName: e.target.value})} className="w-full glass-input rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-600 uppercase">WhatsApp</label>
                  <input type="tel" value={data.whatsapp} onChange={e => setData({...data, whatsapp: formatWhatsApp(e.target.value)})} maxLength={13} className="w-full glass-input rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-600 uppercase">Validade (Dias)</label>
                  <input type="number" value={data.validityDays} onChange={e => setData({...data, validityDays: e.target.value})} className="w-full glass-input rounded-lg px-3 py-2 text-sm font-bold text-amber-500" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-slate-600 uppercase">Endereço da Obra</label>
                <input type="text" value={data.workAddress} onChange={e => setData({...data, workAddress: e.target.value})} className="w-full glass-input rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <section className="space-y-3">
             <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                   <Package size={12}/> Materiais e Serviços
                </h2>
                <span className="text-[9px] text-slate-600 font-bold">{data.items.length} ITENS</span>
             </div>
             
             <div className="space-y-2">
               {data.items.map((item, idx) => (
                 <div key={item.id} className="glass-panel p-3 rounded-xl border border-white/5 bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-black text-slate-600 uppercase">Item {idx + 1}</span>
                       <button onClick={() => removeItem(item.id)} className="text-red-500/30"><Trash2 size={14}/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                       <textarea value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className="col-span-2 bg-black/40 rounded-lg p-2 text-sm h-12 resize-none" placeholder="Descrição..."/>
                       <select value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)} className="bg-black/40 rounded-lg p-1.5 text-xs text-slate-300">
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                       <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} className="bg-black/40 rounded-lg p-1.5 text-xs text-slate-300">
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="number" value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-14 bg-white/5 rounded-lg p-1.5 text-xs text-center font-bold"/>
                       <CurrencyInput value={item.unitPrice} onValueChange={(val) => updateItem(item.id, 'unitPrice', val || 0)} className="flex-1 bg-blue-500/5 rounded-lg p-1.5 text-xs text-right font-bold text-blue-400"/>
                       <div className="w-20 text-right text-xs font-black text-white">
                          {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                       </div>
                    </div>
                 </div>
               ))}
               <button onClick={addItem} className="w-full py-3 border border-dashed border-blue-500/20 rounded-xl flex items-center justify-center gap-2 text-blue-400 font-bold text-[10px] uppercase">
                  <Plus size={14}/> Adicionar Material
               </button>
             </div>
          </section>

          <section className="glass-panel p-3 rounded-xl">
            <textarea value={data.observations} onChange={e => setData({...data, observations: e.target.value})} placeholder="Observações..." className="w-full bg-black/20 rounded-lg p-2 text-[10px] text-slate-400 h-16 resize-none" />
          </section>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          {/* History View */}
          <div className="relative">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
             <input 
                type="text" 
                placeholder="Buscar por cliente..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full glass-input rounded-2xl pl-12 pr-4 py-3 text-sm"
             />
          </div>

          <div className="space-y-3">
             {isLoading ? (
               <div className="text-center py-20 text-slate-500 uppercase text-xs font-black animate-pulse">Carregando Histórico...</div>
             ) : filteredHistory.length === 0 ? (
               <div className="text-center py-20 text-slate-600 uppercase text-xs font-bold">Nenhum orçamento encontrado</div>
             ) : (
               filteredHistory.map(budget => (
                 <div key={budget.id} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div onClick={() => handleEdit(budget.id)} className="flex-1 cursor-pointer">
                       <h3 className="font-black text-slate-100 uppercase tracking-tight">{budget.client_name}</h3>
                       <div className="flex gap-3 mt-1">
                          <span className="text-[9px] font-bold text-blue-500">{new Date(budget.created_at).toLocaleDateString('pt-BR')}</span>
                          <span className="text-[9px] font-bold text-emerald-500">{Number(budget.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                       </div>
                    </div>
                    <button onClick={() => handleDelete(budget.id)} className="p-2 text-red-500/40 hover:text-red-500 transition-colors">
                       <Trash2 size={18}/>
                    </button>
                 </div>
               ))
             )}
          </div>
        </div>
      )}

      {view === 'editor' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-[#030712]/90 backdrop-blur-2xl border-t border-white/5">
           <div className="max-w-6xl mx-auto flex flex-col gap-2">
              
              <div className="flex gap-2">
                 <div className="flex-1 bg-white/5 p-2 px-4 rounded-xl flex items-center justify-between border border-white/5 shadow-inner">
                    <span className="text-[8px] font-black text-slate-500 uppercase">Investimento</span>
                    <span className="text-lg font-black text-white">{totalItemsValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                 </div>
                 <button 
                    onClick={handleSave} 
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                 >
                    {isLoading ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} 
                    {data.id ? 'Atualizar' : 'Salvar'}
                 </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                 <button onClick={() => handleGenerate('commercial')} className="h-11 bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-[8px] font-black uppercase text-slate-300">
                    {isGenerating === 'commercial' ? <RefreshCw className="animate-spin" size={14}/> : 'Comercial'}
                 </button>
                 <button onClick={() => handleGenerate('materials')} className="h-11 bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-[8px] font-black uppercase text-slate-300">
                    {isGenerating === 'materials' ? <RefreshCw className="animate-spin" size={14}/> : 'Materiais'}
                 </button>
                 <button onClick={() => handleGenerate('all')} className="h-11 bg-amber-600 rounded-xl flex items-center justify-center gap-2 text-[8px] font-black uppercase text-white shadow-lg">
                    {isGenerating === 'all' ? <RefreshCw className="animate-spin" size={14}/> : <><Download size={14}/> Ambos</>}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
