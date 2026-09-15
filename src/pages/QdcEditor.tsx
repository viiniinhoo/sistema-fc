import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Reorder, useDragControls } from 'framer-motion';
import type { QdcCircuit, QdcPanelData } from '../types';
import { generateQdcPDF } from '../utils/qdcPdfGenerator';
import { saveQdcPanel, getQdcPanelById } from '../services/qdcService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Building2,
  Save,
  GripVertical,
  Zap,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  UserPlus
} from 'lucide-react';

const CABLE_PRESETS = [
  '1,50mm²',
  '2,50mm²',
  '4,00mm²',
  '6,00mm²',
  '10,00mm²',
  '16,00mm²',
  '25,00mm²',
  '35,00mm²'
];

const BREAKER_PRESETS = [
  '10A - unipolar',
  '16A - unipolar',
  '20A - unipolar',
  '25A - unipolar',
  '25A - bipolar',
  '32A - bipolar',
  '40A - bipolar',
  '50A - bipolar',
  '63A - bipolar',
  '70A - tripolar',
  '100A - tripolar'
];

interface QdcCircuitItemProps {
  circuit: QdcCircuit;
  idx: number;
  totalCircuits: number;
  moveCircuit: (index: number, direction: 'up' | 'down') => void;
  removeCircuit: (circuitId: string) => void;
  updateCircuit: (circuitId: string, field: keyof QdcCircuit, value: string | number) => void;
}

function QdcCircuitItem({
  circuit,
  idx,
  totalCircuits,
  moveCircuit,
  removeCircuit,
  updateCircuit
}: QdcCircuitItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={circuit.id}
      value={circuit}
      dragControls={dragControls}
      dragListener={false}
      className="bg-white/90 dark:bg-[#1a2b4b]/90 backdrop-blur-md rounded-2xl p-3 border border-slate-900/10 dark:border-white/5 shadow-md transition-all select-none"
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-900/5 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="p-1.5 rounded-lg hover:bg-slate-900/10 dark:hover:bg-white/10 text-amber-500 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center bg-amber-500/10 border border-amber-500/20 active:scale-95 transition-transform"
            title="Segure e arraste pelos 6 pontinhos"
          >
            <GripVertical size={18} />
          </div>
          <span className="text-xs font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
            Nº {circuit.identification || idx + 1}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Posição {idx + 1}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => moveCircuit(idx, 'up')}
            disabled={idx === 0}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Mover para cima"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={() => moveCircuit(idx, 'down')}
            disabled={idx === totalCircuits - 1}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Mover para baixo"
          >
            <ArrowDown size={14} />
          </button>
          <button
            onClick={() => removeCircuit(circuit.id)}
            className="p-1.5 ml-1 text-red-400 hover:text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
            title="Excluir circuito"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Circuit details form inputs */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-3 sm:col-span-2">
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
              Ident.
            </label>
            <input
              type="text"
              value={circuit.identification}
              onChange={e => updateCircuit(circuit.id, 'identification', e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-black text-center text-slate-900 dark:text-white outline-none focus:border-[#009ee3]"
              placeholder="01"
            />
          </div>

          <div className="col-span-9 sm:col-span-10">
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
              Descrição / Local Atendido
            </label>
            <input
              type="text"
              value={circuit.description}
              onChange={e => updateCircuit(circuit.id, 'description', e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#009ee3]"
              placeholder="Ex: Chuveiro Banheiro Suíte, Tomadas Cozinha..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
              Bitola do Cabo (Seção)
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={circuit.cableSize}
                onChange={e => updateCircuit(circuit.id, 'cableSize', e.target.value)}
                className="flex-1 bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#009ee3]"
                placeholder="Ex: 2,50mm²"
              />
              <select
                onChange={e => e.target.value && updateCircuit(circuit.id, 'cableSize', e.target.value)}
                value=""
                className="bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-700 dark:text-slate-300"
              >
                <option value="">Padrões</option>
                {CABLE_PRESETS.map(preset => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
              Disjuntor / Amperagem (A)
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={circuit.breakerRating}
                onChange={e => updateCircuit(circuit.id, 'breakerRating', e.target.value)}
                className="flex-1 bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#009ee3]"
                placeholder="Ex: 25A - unipolar"
              />
              <select
                onChange={e => e.target.value && updateCircuit(circuit.id, 'breakerRating', e.target.value)}
                value=""
                className="bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-700 dark:text-slate-300"
              >
                <option value="">Padrões</option>
                {BREAKER_PRESETS.map(preset => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}

export default function QdcEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [panel, setPanel] = useState<QdcPanelData>({
    name: 'Quadro Principal de Distribuição (QDC)',
    clientId: '',
    clientName: '',
    workAddress: '',
    observations: '',
    circuits: [
      {
        id: uuidv4(),
        identification: '01',
        cableSize: '10,00mm²',
        description: 'Chuveiro Elétrico Principal',
        breakerRating: '50A - bipolar',
        positionOrder: 1
      },
      {
        id: uuidv4(),
        identification: '02',
        cableSize: '4,00mm²',
        description: 'Torneira Elétrica / Cozinha',
        breakerRating: '32A - bipolar',
        positionOrder: 2
      },
      {
        id: uuidv4(),
        identification: '03',
        cableSize: '2,50mm²',
        description: 'Ar Condicionado Quarto',
        breakerRating: '25A - bipolar',
        positionOrder: 3
      },
      {
        id: uuidv4(),
        identification: '04',
        cableSize: '2,50mm²',
        description: 'Tomadas 110V Banheiro / Quarto',
        breakerRating: '25A - unipolar',
        positionOrder: 4
      },
      {
        id: uuidv4(),
        identification: '05',
        cableSize: '1,50mm²',
        description: 'Iluminação Geral / Fotocélula',
        breakerRating: '16A - unipolar',
        positionOrder: 5
      }
    ]
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    fetchClients();
    if (id) {
      loadPanel(id);
    }
  }, [id]);

  const fetchClients = async () => {
    try {
      const { data: d } = await supabase.from('clients').select('id, name, address').order('name');
      if (d) setClients(d);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPanel = async (panelId: string) => {
    setIsLoading(true);
    try {
      const loaded = await getQdcPanelById(panelId);
      if (loaded) {
        setPanel(loaded);
      }
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
      setPanel(prev => ({
        ...prev,
        clientId: savedClient.id,
        clientName: savedClient.name,
        workAddress: savedClient.address || prev.workAddress
      }));
      setIsAddingClient(false);
      setNewClient({ name: '', phone: '', address: '' });
      alert('✅ Cliente cadastrado e vinculado!');
    } catch (err) {
      console.error(err);
      alert('❌ Erro ao cadastrar cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = (newCircuits: QdcCircuit[]) => {
    setPanel(prev => ({
      ...prev,
      circuits: newCircuits.map((c, idx) => ({
        ...c,
        positionOrder: idx + 1
      }))
    }));
  };

  const autoRenumber = () => {
    setPanel(prev => ({
      ...prev,
      circuits: prev.circuits.map((c, idx) => ({
        ...c,
        identification: (idx + 1).toString().padStart(2, '0')
      }))
    }));
  };

  const addCircuit = () => {
    const nextNum = (panel.circuits.length + 1).toString().padStart(2, '0');
    const newCircuit: QdcCircuit = {
      id: uuidv4(),
      identification: nextNum,
      cableSize: '2,50mm²',
      description: '',
      breakerRating: '20A - unipolar',
      positionOrder: panel.circuits.length + 1
    };
    setPanel(prev => ({ ...prev, circuits: [...prev.circuits, newCircuit] }));
  };

  const removeCircuit = (circuitId: string) => {
    setPanel(prev => ({
      ...prev,
      circuits: prev.circuits.filter(c => c.id !== circuitId)
    }));
  };

  const updateCircuit = (circuitId: string, field: keyof QdcCircuit, value: string | number) => {
    setPanel(prev => ({
      ...prev,
      circuits: prev.circuits.map(c => {
        if (c.id === circuitId) {
          return { ...c, [field]: value };
        }
        return c;
      })
    }));
  };

  const moveCircuit = (index: number, direction: 'up' | 'down') => {
    const newCircuits = [...panel.circuits];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCircuits.length) return;

    const temp = newCircuits[index];
    newCircuits[index] = newCircuits[targetIndex];
    newCircuits[targetIndex] = temp;

    handleReorder(newCircuits);
  };

  const handleSave = async () => {
    if (!panel.name.trim()) return alert('Informe o nome do quadro de luz.');
    setIsLoading(true);
    try {
      const saved = await saveQdcPanel(panel, user?.id, user?.user_metadata?.name);
      setPanel(saved);
      alert('✅ Quadro de Luz (QDC) salvo com sucesso!');
      if (!id) navigate('/qdc');
    } catch (err: any) {
      console.error(err);
      alert('❌ Erro ao salvar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (panel.circuits.length === 0) return alert('Adicione circuitos ao quadro antes de gerar o PDF.');
    setIsGenerating(true);
    try {
      await generateQdcPDF(panel);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar PDF do Quadro de Luz.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-800 dark:text-slate-100 pb-28 touch-pan-y antialiased font-sans">
      <div className="max-w-4xl mx-auto px-3 py-4 space-y-4">
        {/* Back Link */}
        <button
          onClick={() => navigate('/qdc')}
          className="text-[#009ee3] hover:underline font-bold uppercase text-xs flex items-center gap-1 mb-1 transition-all"
        >
          <ArrowLeft size={16} /> Voltar para Meus Quadros
        </button>

        {/* Panel Header Settings */}
        <section className="bg-white/80 dark:bg-[#1a2b4b]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-900/10 dark:border-white/5 shadow-md border-l-4 border-l-[#009ee3]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-[#009ee3] uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} className="text-amber-500 fill-amber-500/20" /> Dados do Quadro de Luz (QDC)
            </h2>
            <button
              onClick={() => setIsAddingClient(!isAddingClient)}
              className="text-[10px] font-extrabold text-amber-500 uppercase flex items-center gap-1 hover:opacity-80 transition-opacity bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
            >
              {isAddingClient ? 'Cancelar' : <><UserPlus size={12} /> Cadastrar Cliente</>}
            </button>
          </div>

          {isAddingClient ? (
            <div className="space-y-3 bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/20 mb-3 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase">Nome do Cliente</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  placeholder="Nome Completo"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={newClient.phone}
                    onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase">Endereço da Obra</label>
                  <input
                    type="text"
                    value={newClient.address}
                    onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    placeholder="Rua, Nº, Bairro"
                  />
                </div>
              </div>
              <button
                onClick={handleQuickAddClient}
                disabled={isLoading}
                className="w-full py-2 bg-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl hover:bg-amber-400 transition-colors shadow-md"
              >
                Salvar e Vincular Cliente
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                  Identificação do Quadro
                </label>
                <input
                  type="text"
                  placeholder="Ex: Quadro Principal de Luz (Residência)"
                  value={panel.name}
                  onChange={e => setPanel({ ...panel, name: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#009ee3]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    Vincular Cliente (Opcional)
                  </label>
                  <select
                    value={panel.clientId || ''}
                    onChange={e => {
                      const sel = clients.find(c => c.id === e.target.value);
                      setPanel({
                        ...panel,
                        clientId: e.target.value,
                        clientName: sel ? sel.name : '',
                        workAddress: sel?.address || panel.workAddress
                      });
                    }}
                    className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#009ee3]"
                  >
                    <option value="">-- Cliente Avulso / Não Vinculado --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    Endereço da Obra
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rua A, 123 - Centro"
                    value={panel.workAddress || ''}
                    onChange={e => setPanel({ ...panel, workAddress: e.target.value })}
                    className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#009ee3]"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Circuit List with Drag & Drop */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <Building2 size={14} /> Disjuntores & Circuitos
              </h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {panel.circuits.length} CIRCUITO(S)
              </span>
            </div>

            <button
              onClick={autoRenumber}
              title="Renumerar circuitos automaticamente (01, 02, 03...)"
              className="text-[10px] font-extrabold text-[#009ee3] bg-[#009ee3]/10 border border-[#009ee3]/20 px-2.5 py-1 rounded-xl flex items-center gap-1 hover:bg-[#009ee3]/20 transition-all"
            >
              <ListOrdered size={12} /> Renumerar Sequência
            </button>
          </div>

          <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-2">
            <GripVertical size={16} className="shrink-0" />
            <span>
              💡 <strong>Arraste o ícone de aderência</strong> para reordenar os disjuntores no quadro!
            </span>
          </div>

          {/* Framer Motion Reorder Group */}
          <Reorder.Group
            axis="y"
            values={panel.circuits}
            onReorder={handleReorder}
            className="space-y-2.5"
          >
            {panel.circuits.map((circuit, idx) => (
              <QdcCircuitItem
                key={circuit.id}
                circuit={circuit}
                idx={idx}
                totalCircuits={panel.circuits.length}
                moveCircuit={moveCircuit}
                removeCircuit={removeCircuit}
                updateCircuit={updateCircuit}
              />
            ))}
          </Reorder.Group>

          {/* Add Circuit Button */}
          <button
            onClick={addCircuit}
            className="w-full py-3.5 border-2 border-dashed border-[#009ee3]/40 rounded-2xl flex items-center justify-center gap-2 text-[#009ee3] font-black text-xs uppercase hover:bg-[#009ee3]/10 active:scale-[0.99] transition-all shadow-sm"
          >
            <Plus size={16} strokeWidth={3} /> Adicionar Novo Circuito / Disjuntor
          </button>
        </section>

        {/* Floating Action Toolbar */}
        <div className="fixed bottom-16 left-0 right-0 max-w-4xl mx-auto px-3 z-40">
          <div className="p-2 bg-white/95 dark:bg-[#1a2b4b]/95 backdrop-blur-2xl border border-slate-900/15 dark:border-white/10 rounded-2xl shadow-2xl flex gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {panel.id ? 'Atualizar Quadro' : 'Salvar Quadro (QDC)'}
            </button>

            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="px-5 h-12 bg-[#009ee3] hover:bg-blue-400 text-white rounded-xl flex items-center justify-center font-black text-xs uppercase tracking-wider gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
              <span>Gerar PDF QDC</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
