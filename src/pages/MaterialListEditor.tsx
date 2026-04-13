import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useParams } from 'react-router-dom';
import type { BudgetData, BudgetItem } from '../types';
import { generateMaterialListPDF } from '../utils/pdfGenerator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Building2,
  Package,
  Save,
  ArrowLeft
} from 'lucide-react';

const CATEGORIES = ['Elétrica', 'Hidráulica', 'Infraestrutura', 'Acabamento', 'Geral'];
const UNITS = ['un', 'm', 'pç', 'cx', 'kit', 'm²'];

export default function MaterialListEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [data, setData] = useState({
    id: '',
    name: '',
    client_id: '',
    clientName: '',
    items: [] as BudgetItem[]
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [clients, setClients] = useState<any[]>([]);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '' });

  const fetchClients = async () => {
    const { data: d } = await supabase.from('clients').select('id, name').order('name');
    if (d) setClients(d);
  };

  useEffect(() => {
    fetchClients();

    if (id) {
      loadList(id);
    }
  }, [id]);

  const loadList = async (listId: string) => {
    setIsLoading(true);
    try {
      const { data: list, error } = await supabase
        .from('material_lists')
        .select('*, clients(*), material_list_items(*)')
        .eq('id', listId)
        .single();
        
      if (!error && list) {
        setData({
          id: list.id,
          name: list.name,
          client_id: list.client_id || '',
          clientName: list.clients?.name || '',
          items: (list.material_list_items || []).map((item: any) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            unit: item.unit,
            category: 'Geral',
            unitPrice: 0,
            total: 0
          }))
        });
      }
    } catch (err) {
      console.error(err);
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
      setData({ ...data, client_id: savedClient.id, clientName: savedClient.name });
      setIsAddingClient(false);
      setNewClient({ name: '', phone: '', address: '' });
      alert("✅ Cliente cadastrado e vinculado!");
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao cadastrar cliente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data.name) return alert("Informe um Nome para a Lista.");
    setIsLoading(true);
    try {
      const listId = data.id || uuidv4();
      
      const listPayload = {
        id: listId,
        name: data.name,
        client_id: data.client_id || null,
        user_id: user?.id,
        created_by: user?.user_metadata?.name || null,
        updated_at: new Date().toISOString()
      };

      // 1. Upsert the list
      const { error: listError } = await supabase
        .from('material_lists')
        .upsert(listPayload);

      if (listError) throw listError;

      // 2. Delete old items if updating
      if (data.id) {
        await supabase.from('material_list_items').delete().eq('material_list_id', listId);
      }

      // 3. Insert new items
      if (data.items.length > 0) {
        const itemsPayload = data.items.map(msg => ({
          id: msg.id || uuidv4(),
          material_list_id: listId,
          description: msg.description,
          quantity: msg.quantity,
          unit: msg.unit
        }));
        const { error: itemsError } = await supabase.from('material_list_items').insert(itemsPayload);
        if (itemsError) throw itemsError;
      }
      
      setData({ ...data, id: listId });
      alert("✅ Lista de Materiais salva com sucesso!");
      if (!data.id) navigate('/listas');
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao salvar: " + (err as any).message);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = () => {
    const newItem: BudgetItem = {
      id: uuidv4(),
      description: '',
      category: 'Geral',
      unit: 'un',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setData({ ...data, items: [...data.items, newItem] });
  };

  const removeItem = (itemId: string) => {
    setData({ ...data, items: data.items.filter(item => item.id !== itemId) });
  };

  const updateItem = (itemId: string, field: keyof BudgetItem, value: string | number) => {
    setData({
      ...data, items: data.items.map(item => {
        if (item.id === itemId) return { ...item, [field]: value };
        return item;
      })
    });
  };

  const handleGenerate = async () => {
    if (data.items.length === 0) return alert("Adicione itens primeiro.");
    setIsGenerating(true);
    try {
      const pdfData: BudgetData = {
        clientName: data.name + (data.clientName ? ` - ${data.clientName}` : ''),
        whatsapp: '',
        workAddress: '',
        validityDays: '',
        paymentTerms: '',
        items: data.items,
        observations: ''
      };
      await generateMaterialListPDF(pdfData);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-800 dark:text-slate-100 pb-10 touch-pan-y antialiased font-sans">
      <div className="max-w-6xl mx-auto px-3 py-4 space-y-4">
        
        <button onClick={() => navigate('/listas')} className="text-emerald-500 font-bold uppercase text-xs flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Voltar para Listas
        </button>

        <section className="glass-panel p-4 rounded-xl border-l-2 border-l-emerald-500">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
              <Building2 size={12} /> Configuração da Lista
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
                <label className="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase">Nome Completo</label>
                <input type="text" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className="w-full glass-input rounded-lg px-3 py-2 text-sm" placeholder="Nome do Cliente" />
              </div>
              <button 
                onClick={handleQuickAddClient}
                disabled={isLoading}
                className="w-full py-2 bg-amber-500 text-black font-black text-[10px] uppercase rounded-lg hover:bg-amber-400 transition-colors"
              >
                Confirmar e Vincular
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                 <label className="text-[8px] font-bold text-slate-600 dark:text-slate-500 uppercase">Nome da Lista</label>
                 <input type="text" placeholder="Ex: Lista Área Externa" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} className="w-full glass-input rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-slate-600 dark:text-slate-500 uppercase">Vincular a Cliente (Opcional)</label>
                <select 
                  value={data.client_id} 
                  onChange={e => {
                    const sel = clients.find(c => c.id === e.target.value);
                    setData({ ...data, client_id: e.target.value, clientName: sel ? sel.name : '' });
                  }} 
                  className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">-- Sem cliente --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Package size={12} /> Materiais Necessários
            </h2>
            <span className="text-[9px] text-slate-600 font-bold">{data.items.length} ITENS</span>
          </div>

          <div className="space-y-2">
            {data.items.map((item, idx) => (
              <div key={item.id} className="glass-panel p-3 rounded-xl border border-slate-900/10 dark:border-white/5 bg-slate-100 dark:bg-slate-900/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-600 uppercase">Material {idx + 1}</span>
                  <button onClick={() => removeItem(item.id)} className="text-red-500/50 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className="w-full bg-slate-200 dark:bg-black/40 rounded-lg p-2 text-sm mb-2" placeholder="Descrição do Material..." />
                
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" placeholder="Qtd" value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="bg-slate-900/5 dark:bg-white/5 rounded-lg p-1.5 text-xs text-center font-bold" />
                  
                  <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} className="bg-slate-200 dark:bg-black/40 rounded-lg p-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>

                  <select value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)} className="bg-slate-200 dark:bg-black/40 rounded-lg p-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button onClick={addItem} className="w-full py-3 border border-dashed border-emerald-500/30 rounded-xl flex items-center justify-center gap-2 text-emerald-500 font-bold text-[10px] uppercase hover:bg-emerald-500/10 transition-colors">
              <Plus size={14} /> Adicionar Material
            </button>
          </div>
        </section>

        <div className="p-1.5 bg-white/98 dark:bg-[#1a2b4b]/98 backdrop-blur-2xl border border-slate-900/15 dark:border-white/10 rounded-2xl shadow-2xl">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-black text-[10px] uppercase rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={12} /> : <Save size={12} />}
              {data.id ? 'Atualizar Lista' : 'Salvar Lista'}
            </button>
            <button
              onClick={handleGenerate}
              className="w-14 h-10 bg-[#009ee3] hover:bg-blue-400 text-slate-900 dark:text-white rounded-xl flex items-center justify-center font-black uppercase transition-all active:scale-95"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
