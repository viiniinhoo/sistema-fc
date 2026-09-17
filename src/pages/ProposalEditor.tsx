import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { CommercialProposalData, ProposalService, InvestmentItem } from '../types';
import { saveProposal, getProposalById } from '../services/proposalService';
import { generateProposalPDF } from '../utils/proposalPdfGenerator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Save,
  Briefcase,
  CheckCircle2,
  UserPlus,
  ClipboardList,
  Package,
  CreditCard,
  FileText,
  Calculator
} from 'lucide-react';

const DEFAULT_MATERIAL_TEXT =
  'Os materiais necessários para a execução dos serviços serão definidos após a validação desta proposta e o início do levantamento técnico detalhado no local. Após essa etapa, será realizado o levantamento completo dos materiais, considerando as necessidades específicas da instalação, as condições encontradas e os requisitos técnicos identificados. A relação de materiais será apresentada posteriormente para análise e aprovação do cliente.';

const DEFAULT_PAYMENT_TERMS =
  'As condições de pagamento, parcelamento, prazos e forma de acerto financeiro serão acordados e formalizados diretamente entre as partes envolvidas (Contratante e Prestador de Serviço) conforme o alinhamento das etapas da execução dos serviços.';

const DEFAULT_INVESTMENTS: InvestmentItem[] = [
  {
    id: uuidv4(),
    category: 'Mão de Obra Especializada',
    description: 'Execução completa dos serviços elétricos, montagem, adequação técnica, parametrização e testes.',
    amount: 0
  }
];

export default function ProposalEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [proposal, setProposal] = useState<CommercialProposalData>({
    name: '',
    clientId: '',
    clientName: '',
    workAddress: '',
    executionDays: '',
    validityDays: '15',
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    materialObservations: DEFAULT_MATERIAL_TEXT,
    observations: '',
    services: [],
    investments: DEFAULT_INVESTMENTS
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    fetchClients();
    if (id) loadProposal(id);
  }, [id]);

  const fetchClients = async () => {
    try {
      const { data: d } = await supabase.from('clients').select('id, name, address').order('name');
      if (d) setClients(d);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProposal = async (proposalId: string) => {
    setIsLoading(true);
    try {
      const loaded = await getProposalById(proposalId);
      if (loaded) setProposal(loaded);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAddClient = async () => {
    if (!newClient.name) return alert('Informe o nome do cliente.');
    setIsLoading(true);
    try {
      const { data: saved, error } = await supabase
        .from('clients')
        .insert({ name: newClient.name, phone: newClient.phone, address: newClient.address, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      await fetchClients();
      setProposal(prev => ({
        ...prev,
        clientId: saved.id,
        clientName: saved.name,
        workAddress: saved.address || prev.workAddress
      }));
      setIsAddingClient(false);
      setNewClient({ name: '', phone: '', address: '' });
      alert('✅ Cliente cadastrado e vinculado!');
    } catch {
      alert('❌ Erro ao cadastrar cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  const addService = () => {
    const newService: ProposalService = {
      id: uuidv4(),
      description: '',
      positionOrder: proposal.services.length + 1
    };
    setProposal(prev => ({ ...prev, services: [...prev.services, newService] }));
  };

  const removeService = (sid: string) => {
    setProposal(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== sid)
    }));
  };

  const updateService = (sid: string, value: string) => {
    setProposal(prev => ({
      ...prev,
      services: prev.services.map(s => (s.id === sid ? { ...s, description: value } : s))
    }));
  };

  const addInvestment = () => {
    const newItem: InvestmentItem = {
      id: uuidv4(),
      category: '',
      description: '',
      amount: 0,
      positionOrder: (proposal.investments?.length || 0) + 1
    };
    setProposal(prev => ({
      ...prev,
      investments: [...(prev.investments || []), newItem]
    }));
  };

  const removeInvestment = (invId: string) => {
    setProposal(prev => ({
      ...prev,
      investments: (prev.investments || []).filter(i => i.id !== invId)
    }));
  };

  const updateInvestment = (invId: string, field: keyof InvestmentItem, value: any) => {
    setProposal(prev => ({
      ...prev,
      investments: (prev.investments || []).map(i =>
        i.id === invId ? { ...i, [field]: value } : i
      )
    }));
  };

  const totalInvestment = (proposal.investments || []).reduce(
    (acc, item) => acc + (Number(item.amount) || 0),
    0
  );

  const handleSave = async () => {
    if (!proposal.name.trim()) return alert('Informe um nome/título para a proposta.');
    setIsLoading(true);
    try {
      const saved = await saveProposal(proposal, user?.id, user?.user_metadata?.name);
      setProposal(saved);
      alert('✅ Proposta Comercial salva com sucesso!');
      if (!id) navigate('/propostas');
    } catch (err: any) {
      alert('❌ Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      await generateProposalPDF(proposal);
    } catch {
      alert('Erro ao gerar PDF da Proposta Comercial.');
    } finally {
      setIsGenerating(false);
    }
  };

  const inputClass =
    'w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#009ee3]';
  const labelClass = 'text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-800 dark:text-slate-100 pb-28 touch-pan-y antialiased font-sans">
      <div className="max-w-4xl mx-auto px-3 py-4 space-y-4">

        <button
          onClick={() => navigate('/propostas')}
          className="text-[#009ee3] hover:underline font-bold uppercase text-xs flex items-center gap-1 mb-1 transition-all"
        >
          <ArrowLeft size={16} /> Voltar para Propostas
        </button>

        {/* ── 1. Dados da Proposta ── */}
        <section className="bg-white/80 dark:bg-[#1a2b4b]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-900/10 dark:border-white/5 shadow-md border-l-4 border-l-[#009ee3]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-[#009ee3] uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={14} /> Dados da Proposta
            </h2>
            <button
              onClick={() => setIsAddingClient(!isAddingClient)}
              className="text-[10px] font-extrabold text-amber-500 uppercase flex items-center gap-1 hover:opacity-80 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
            >
              {isAddingClient ? 'Cancelar' : <><UserPlus size={12} /> Cadastrar Cliente</>}
            </button>
          </div>

          {isAddingClient ? (
            <div className="space-y-3 bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/20 mb-3 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className={labelClass}>Nome do Cliente</label>
                <input type="text" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className={inputClass} placeholder="Nome Completo" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Telefone / WhatsApp</label>
                  <input type="text" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} className={inputClass} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className={labelClass}>Endereço da Obra</label>
                  <input type="text" value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} className={inputClass} placeholder="Rua, Nº, Bairro" />
                </div>
              </div>
              <button onClick={handleQuickAddClient} disabled={isLoading} className="w-full py-2 bg-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl hover:bg-amber-400 transition-colors shadow-md">
                Salvar e Vincular Cliente
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Título / Objeto da Proposta</label>
                <input type="text" placeholder="Ex: Adequação Elétrica Residencial" value={proposal.name} onChange={e => setProposal({ ...proposal, name: e.target.value })} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Vincular Cliente (Opcional)</label>
                  <select
                    value={proposal.clientId || ''}
                    onChange={e => {
                      const sel = clients.find(c => c.id === e.target.value);
                      setProposal({ ...proposal, clientId: e.target.value, clientName: sel?.name || '', workAddress: sel?.address || proposal.workAddress });
                    }}
                    className={inputClass}
                  >
                    <option value="">-- Cliente Avulso / Não Vinculado --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Endereço da Obra</label>
                  <input type="text" placeholder="Ex: Rua A, 123 - Centro" value={proposal.workAddress || ''} onChange={e => setProposal({ ...proposal, workAddress: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Prazo de Execução</label>
                  <input type="text" placeholder="Ex: 03 dias úteis" value={proposal.executionDays || ''} onChange={e => setProposal({ ...proposal, executionDays: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Validade da Proposta (dias)</label>
                  <input type="text" placeholder="Ex: 15" value={proposal.validityDays || ''} onChange={e => setProposal({ ...proposal, validityDays: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 2. Resumo dos Serviços ── */}
        <section className="bg-white/80 dark:bg-[#1a2b4b]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-900/10 dark:border-white/5 shadow-md border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <ClipboardList size={14} /> Resumo dos Serviços
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                {proposal.services.length}
              </span>
            </h2>
          </div>

          <div className="space-y-2">
            {proposal.services.length === 0 ? (
              <div className="text-center py-5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 text-xs font-semibold">
                Nenhum serviço adicionado. Clique no botão abaixo para adicionar.
              </div>
            ) : (
              proposal.services.map((service, idx) => (
                <div key={service.id} className="flex items-start gap-2 bg-slate-100/80 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 size={16} className="text-amber-500 shrink-0 mt-1.5" />
                  <textarea
                    value={service.description}
                    onChange={e => updateService(service.id, e.target.value)}
                    rows={2}
                    placeholder={`Descrição do Serviço ${idx + 1}...`}
                    className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white outline-none resize-none placeholder:text-slate-400"
                  />
                  <button onClick={() => removeService(service.id)} className="p-1 text-red-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}

            <button
              onClick={addService}
              className="w-full py-3 border-2 border-dashed border-amber-500/40 rounded-2xl flex items-center justify-center gap-2 text-amber-500 font-black text-xs uppercase hover:bg-amber-500/10 active:scale-[0.99] transition-all"
            >
              <Plus size={15} strokeWidth={3} /> Adicionar Serviço
            </button>
          </div>
        </section>

        {/* ── 3. Resumo de Investimento ── */}
        <section className="bg-white/80 dark:bg-[#1a2b4b]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-900/10 dark:border-white/5 shadow-md border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
              <Calculator size={14} /> Resumo de Investimento
            </h2>
            <span className="text-xs font-black text-[#009ee3] bg-[#009ee3]/10 px-3 py-1 rounded-full border border-[#009ee3]/20">
              Total: {totalInvestment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="space-y-3">
            {(!proposal.investments || proposal.investments.length === 0) ? (
              <div className="text-center py-5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 text-xs font-semibold">
                Nenhum item de investimento adicionado.
              </div>
            ) : (
              proposal.investments.map((item) => (
                <div key={item.id} className="bg-slate-100/80 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={item.category}
                      onChange={e => updateInvestment(item.id, 'category', e.target.value)}
                      placeholder="Categoria (ex: Materiais, Mão de Obra)"
                      className="flex-1 bg-white dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 outline-none focus:border-[#009ee3]"
                    />
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 w-36">
                      <span className="text-xs font-bold text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount || ''}
                        onChange={e => updateInvestment(item.id, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="w-full bg-transparent font-bold text-xs text-slate-900 dark:text-white outline-none text-right"
                      />
                    </div>
                    <button onClick={() => removeInvestment(item.id)} className="p-1 text-red-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea
                    value={item.description}
                    onChange={e => updateInvestment(item.id, 'description', e.target.value)}
                    rows={4}
                    placeholder="Descrição detalhada do investimento..."
                    className="w-full bg-white/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 min-h-[85px] leading-relaxed"
                  />
                </div>
              ))
            )}

            <button
              onClick={addInvestment}
              className="w-full py-2.5 border-2 border-dashed border-blue-500/40 rounded-xl flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase hover:bg-blue-500/10 active:scale-[0.99] transition-all"
            >
              <Plus size={14} strokeWidth={3} /> Adicionar Item de Investimento
            </button>

            {/* Total Highlight Bar */}
            <div className="bg-[#1a2b4b] text-white p-3.5 rounded-xl flex items-center justify-between shadow-md border-b-2 border-b-[#eab308]">
              <span className="text-xs font-black uppercase tracking-wider">Valor Total do Projeto</span>
              <span className="text-sm font-black text-[#009ee3] tracking-wide">
                {totalInvestment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </section>

        {/* ── 4. Materiais ── */}
        <section className="bg-white/80 dark:bg-[#1a2b4b]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-900/10 dark:border-white/5 shadow-md border-l-4 border-l-emerald-500">
          <h2 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-3">
            <Package size={14} /> Materiais
          </h2>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Levantamento de Materiais</p>
          <textarea
            value={proposal.materialObservations || ''}
            onChange={e => setProposal({ ...proposal, materialObservations: e.target.value })}
            rows={5}
            className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 resize-none leading-relaxed"
          />
        </section>

        {/* ── 5. Condições de Pagamento ── */}
        <section className="bg-white/80 dark:bg-[#1a2b4b]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-900/10 dark:border-white/5 shadow-md border-l-4 border-l-[#009ee3]">
          <h2 className="text-xs font-black text-[#009ee3] uppercase tracking-widest flex items-center gap-2 mb-3">
            <CreditCard size={14} /> Condições de Pagamento
          </h2>
          <textarea
            value={proposal.paymentTerms || ''}
            onChange={e => setProposal({ ...proposal, paymentTerms: e.target.value })}
            rows={3}
            placeholder="A definir"
            className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#009ee3] resize-none"
          />
        </section>

        {/* ── 6. Observações Gerais ── */}
        <section className="bg-white/80 dark:bg-[#1a2b4b]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-900/10 dark:border-white/5 shadow-md">
          <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
            <FileText size={14} /> Observações Gerais
          </h2>
          <textarea
            value={proposal.observations || ''}
            onChange={e => setProposal({ ...proposal, observations: e.target.value })}
            rows={3}
            placeholder="Observações adicionais (opcional)..."
            className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#009ee3] resize-none"
          />
        </section>

        {/* ── Toolbar ── */}
        <div className="p-1.5 bg-white/98 dark:bg-[#1a2b4b]/98 backdrop-blur-2xl border border-slate-900/15 dark:border-white/10 rounded-2xl shadow-2xl">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-black text-[10px] uppercase rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={12} /> : <Save size={12} />}
              {proposal.id ? 'Atualizar Proposta' : 'Salvar Proposta'}
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="w-14 h-10 bg-[#009ee3] hover:bg-blue-400 text-slate-900 dark:text-white rounded-xl flex items-center justify-center font-black uppercase transition-all active:scale-95"
              title="Gerar PDF da Proposta"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
