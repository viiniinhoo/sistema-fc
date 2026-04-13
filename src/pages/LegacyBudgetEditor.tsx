import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CurrencyInput from 'react-currency-input-field';
import { useParams } from 'react-router-dom';
import type { BudgetData, BudgetItem } from '../types';
import { generateCommercialPDF, generateMaterialListPDF, generateAllPDFs } from '../utils/pdfGenerator';
import { saveBudget, getBudgetById } from '../services/supabaseService';
import { executeOrQueue } from '../services/offlineSync';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Building2,
  Package,
  Save
} from 'lucide-react';

const CATEGORIES = ['Elétrica', 'Hidráulica', 'Infraestrutura', 'Acabamento', 'Geral'];
const UNITS = ['un', 'm', 'pç', 'cx', 'kit', 'm²'];

const INITIAL_DATA: BudgetData = {
  clientName: '',
  whatsapp: '',
  workAddress: '',
  validityDays: '5',
  paymentTerms: '',
  items: [],
  observations: ''
};

export default function LegacyBudgetEditor() {
  const [data, setData] = useState<BudgetData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState<'commercial' | 'materials' | 'all' | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '' });
  const { user } = useAuth();
  const { id } = useParams();

  const fetchClients = async () => {
    const { data: d } = await supabase.from('clients').select('id, name').order('name');
    if (d) setClients(d);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)} ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  useEffect(() => {
    if (id) {
       loadBudget(id);
    } else {
      const saved = localStorage.getItem('@LVCEletrica:current');
      if (saved) setData(JSON.parse(saved));
    }
  }, [id]);

  const loadBudget = async (budgetId: string) => {
    setIsLoading(true);
    try {
      const b = await getBudgetById(budgetId);
      setData(b as any);
      if ((b as any).client_id) setSelectedClientId((b as any).client_id);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar orçamento.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      localStorage.setItem('@LVCEletrica:current', JSON.stringify(data));
    }
  }, [data, id]);


  const handleSave = async () => {
    if (!data.clientName && !selectedClientId) return alert("Informe o nome ou selecione um cliente.");
    setIsLoading(true);
    try {
      const totalValue = data.items.reduce((acc, i) => acc + i.total, 0);
      
      // Real client determination
      const cId = selectedClientId;
      let finalClientName = data.clientName;
      if (cId) {
         const cli = clients.find(c => c.id === cId);
         if (cli) finalClientName = cli.name;
      }

      const budgetPayload = { ...data, clientName: finalClientName };
      
      if (navigator.onLine) {
        const saved = await saveBudget(budgetPayload, totalValue, user?.id, cId, user?.user_metadata?.name);
        setData({ ...budgetPayload, id: saved.id });
      } else {
         await executeOrQueue({
           id: crypto.randomUUID(),
           type: 'UPDATE_BUDGET',
           payload: {
              id: (data as any).id || crypto.randomUUID(),
              client_name: finalClientName,
              whatsapp: data.whatsapp,
              work_address: data.workAddress,
              validity_days: data.validityDays,
              observations: data.observations,
              total_value: totalValue,
              client_id: cId || null,
              user_id: user?.id,
              updated_at: new Date().toISOString()
           },
           created_at: Date.now()
         });
      }
      alert("✅ Orçamento salvo com sucesso!");
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAddClient = async () => {
    if (!newClient.name) return alert("Informe o nome do cliente.");
    setIsLoading(true);
    try {
      const { data: savedClient, error } = await supabase
        .from('clients')
        .insert({
          name: newClient.name,
          phone: newClient.phone,
          address: newClient.address,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchClients();
      setSelectedClientId(savedClient.id);
      setData({ ...data, clientName: savedClient.name, whatsapp: savedClient.phone, workAddress: savedClient.address });
      setIsAddingClient(false);
      setNewClient({ name: '', phone: '', address: '' });
      alert("✅ Cliente cadastrado e selecionado!");
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao cadastrar cliente.");
    } finally {
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-800 dark:text-slate-100 pb-10 touch-pan-y antialiased font-sans">
        <div className="max-w-6xl mx-auto px-3 py-4 space-y-4">
          {/* Editor View */}
          <section className="glass-panel p-4 rounded-xl border-l-2 border-l-blue-500">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                <Building2 size={12} /> Dados do Contrato
              </h2>
              <button 
                onClick={() => setIsAddingClient(!isAddingClient)}
                className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                {isAddingClient ? 'Cancelar' : <><Plus size={12} /> Novo Cliente</>}
              </button>
            </div>

            {isAddingClient ? (
              <div className="space-y-3 bg-amber-500/5 p-3 rounded-lg border border-amber-500/20 mb-3 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-600 uppercase">Nome Completo</label>
                  <input type="text" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className="w-full glass-input rounded-lg px-3 py-2 text-sm" placeholder="Nome do Cliente" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-600 uppercase">WhatsApp</label>
                    <input type="tel" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: formatWhatsApp(e.target.value) })} className="w-full glass-input rounded-lg px-3 py-2 text-sm" placeholder="21 90000-0000" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-600 uppercase">Endereço</label>
                    <input type="text" value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} className="w-full glass-input rounded-lg px-3 py-2 text-sm" placeholder="Opcional" />
                  </div>
                </div>
                <button 
                  onClick={handleQuickAddClient}
                  disabled={isLoading}
                  className="w-full py-2 bg-amber-500 text-black font-black text-[10px] uppercase rounded-lg hover:bg-amber-400 transition-colors"
                >
                  Confirmar Cadastro
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-600 uppercase">Cliente</label>
                  <select 
                    value={selectedClientId} 
                    onChange={e => {
                      setSelectedClientId(e.target.value);
                      const sel = clients.find(c => c.id === e.target.value);
                      if (sel) setData({ ...data, clientName: sel.name });
                    }} 
                    className="w-full glass-input rounded-lg px-3 py-2 text-sm mb-2"
                  >
                    <option value="">-- Selecione ou digite abaixo --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input type="text" placeholder="Ou digite o nome avulso" value={data.clientName} onChange={e => { setData({ ...data, clientName: e.target.value }); setSelectedClientId(''); }} className="w-full glass-input rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-600 uppercase">WhatsApp</label>
                    <input type="tel" value={data.whatsapp} onChange={e => setData({ ...data, whatsapp: formatWhatsApp(e.target.value) })} maxLength={13} className="w-full glass-input rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-600 uppercase">Validade (Dias)</label>
                    <input type="number" value={data.validityDays} onChange={e => setData({ ...data, validityDays: e.target.value })} className="w-full glass-input rounded-lg px-3 py-2 text-sm font-bold text-amber-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-600 uppercase">Endereço da Obra</label>
                  <input type="text" value={data.workAddress} onChange={e => setData({ ...data, workAddress: e.target.value })} className="w-full glass-input rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Package size={12} /> Materiais e Serviços
              </h2>
              <span className="text-[9px] text-slate-600 font-bold">{data.items.length} ITENS</span>
            </div>

            <div className="space-y-2">
              {data.items.map((item, idx) => (
                <div key={item.id} className="glass-panel p-3 rounded-xl border border-slate-900/10 dark:border-white/5 bg-slate-100 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-slate-600 uppercase">Item {idx + 1}</span>
                    <button onClick={() => removeItem(item.id)} className="text-red-500/30"><Trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <textarea value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className="col-span-2 bg-slate-200 dark:bg-black/40 rounded-lg p-2 text-sm h-12 resize-none" placeholder="Descrição..." />
                    <select value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)} className="bg-slate-200 dark:bg-black/40 rounded-lg p-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} className="bg-slate-200 dark:bg-black/40 rounded-lg p-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-14 bg-slate-900/5 dark:bg-white/5 rounded-lg p-1.5 text-xs text-center font-bold" />
                    <CurrencyInput
                      value={item.unitPrice || undefined}
                      onValueChange={(val) => updateItem(item.id, 'unitPrice', val || 0)}
                      placeholder="R$ 0,00"
                      onFocus={(e) => e.target.select()}
                      className="flex-1 bg-blue-500/5 rounded-lg p-1.5 text-xs text-right font-bold text-blue-400"
                    />
                    <div className="w-20 text-right text-xs font-black text-slate-900 dark:text-white">
                      {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addItem} className="w-full py-3 border border-dashed border-blue-500/20 rounded-xl flex items-center justify-center gap-2 text-blue-400 font-bold text-[10px] uppercase">
                <Plus size={14} /> Adicionar Material
              </button>
            </div>
          </section>

          <section className="glass-panel p-3 rounded-xl">
            <textarea value={data.observations} onChange={e => setData({ ...data, observations: e.target.value })} placeholder="Observações..." className="w-full bg-slate-100 dark:bg-black/20 rounded-lg p-2 text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 h-16 resize-none" />
          </section>

          {/* Footer Actions Moved Here */}
          <div className="p-1.5 bg-white/98 dark:bg-[#1a2b4b]/98 backdrop-blur-2xl border border-slate-900/15 dark:border-white/10 rounded-2xl shadow-2xl">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                  <span className="text-[6px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase leading-none">Total</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums leading-none">
                    {totalItemsValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="h-8 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-black text-[9px] uppercase rounded-md flex items-center gap-2 transition-all active:scale-95"
                >
                  {isLoading ? <RefreshCw className="animate-spin" size={12} /> : <Save size={12} />}
                  {data.id ? 'Atualizar' : 'Salvar'}
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => handleGenerate('commercial')}
                  className="flex-1 h-9 bg-white dark:bg-[#1a2b4b] hover:bg-[#243c66] text-slate-900 dark:text-white border border-slate-900/15 dark:border-white/10 rounded-md flex items-center justify-center gap-2 text-[8px] font-black uppercase transition-all active:scale-95"
                >
                  {isGenerating === 'commercial' ? <RefreshCw className="animate-spin" size={12} /> : <><Download size={12} /> GERAR PDF COMERCIAL</>}
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
