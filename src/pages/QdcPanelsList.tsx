import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { QdcPanelData } from '../types';
import { listQdcPanels, deleteQdcPanel } from '../services/qdcService';
import { generateQdcPDF } from '../utils/qdcPdfGenerator';
import {
  Search,
  PlusCircle,
  ArrowRight,
  Zap,
  Trash2,
  Download,
  Building2,
  RefreshCw,
  UserCheck
} from 'lucide-react';

export default function QdcPanelsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [panels, setPanels] = useState<QdcPanelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPanels();
  }, []);

  const fetchPanels = async () => {
    setLoading(true);
    try {
      const data = await listQdcPanels();
      setPanels(data);
    } catch (err) {
      console.error('Erro ao buscar quadros de luz:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = panels.filter(
    p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.workAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Certeza que deseja excluir este Quadro de Luz (QDC)?')) return;

    setPanels(panels.filter(p => p.id !== id));
    try {
      await deleteQdcPanel(id);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir quadro.');
      fetchPanels();
    }
  };

  const handleDownloadPDF = async (e: React.MouseEvent, panel: QdcPanelData) => {
    e.stopPropagation();
    if (!panel.circuits || panel.circuits.length === 0) {
      return alert('Este quadro não possui circuitos para gerar PDF.');
    }
    setGeneratingId(panel.id || null);
    try {
      await generateQdcPDF(panel);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF do Quadro de Luz.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto flex flex-col h-full font-sans">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Zap className="text-amber-500 fill-amber-500/20" size={24} /> Quadros de Luz (QDC)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            Gerencie e ordene disjuntores por quadro de distribuição
          </p>
        </div>

        <button
          onClick={() => navigate('/qdc/novo')}
          className="bg-[#009ee3] hover:bg-blue-400 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 active:scale-95 transition-transform shadow-md shrink-0"
        >
          <PlusCircle size={18} strokeWidth={2.5} />
          <span>Novo Quadro</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        />
        <input
          type="text"
          placeholder="Buscar quadro, cliente ou endereço..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-12 bg-white/80 dark:bg-[#1a2b4b]/80 border border-slate-900/10 dark:border-white/5 rounded-2xl pl-12 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-[#009ee3] transition-colors shadow-sm"
        />
      </div>

      {/* Cards List */}
      <div className="space-y-3 flex-1 overflow-y-auto pb-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-bold animate-pulse uppercase text-xs">
            Carregando quadros de luz...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-900/15 dark:border-white/10 rounded-2xl p-6 bg-slate-900/5 dark:bg-white/5">
            <Zap size={44} className="mb-3 text-amber-500 opacity-60" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Nenhum Quadro de Luz (QDC) encontrado.
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Clique em &quot;Novo Quadro&quot; para criar e ordenar disjuntores.
            </p>
          </div>
        ) : (
          filtered.map(panel => (
            <div
              key={panel.id}
              onClick={() => navigate(`/qdc/${panel.id}`)}
              className="bg-white/80 dark:bg-[#1a2b4b]/80 border border-slate-900/10 dark:border-white/5 rounded-2xl p-4 active:scale-[0.99] hover:border-[#009ee3]/50 transition-all cursor-pointer shadow-sm relative group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug flex items-center gap-2">
                    <Building2 size={16} className="text-[#009ee3] shrink-0" />
                    <span>{panel.name || 'Quadro de Luz'}</span>
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {panel.clientName ? (
                      <span className="text-amber-500 font-extrabold flex items-center gap-1">
                        <UserCheck size={12} /> {panel.clientName}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold text-[11px]">Cliente Avulso</span>
                    )}

                    {panel.created_by && (
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        • {panel.created_by}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={e => handleDownloadPDF(e, panel)}
                    disabled={generatingId === panel.id}
                    className="p-2 text-slate-400 hover:text-[#009ee3] hover:bg-[#009ee3]/10 rounded-xl transition-all"
                    title="Baixar PDF de Identificação do QDC"
                  >
                    {generatingId === panel.id ? (
                      <RefreshCw size={16} className="animate-spin text-[#009ee3]" />
                    ) : (
                      <Download size={16} />
                    )}
                  </button>

                  <button
                    onClick={e => handleDelete(e, panel.id!)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Excluir Quadro"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {panel.workAddress && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mb-2">
                  📍 {panel.workAddress}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-900/5 dark:border-white/5">
                <span className="text-[11px] font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                  {panel.circuits?.length || 0} Circuito(s)
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">
                    {panel.created_at
                      ? new Date(panel.created_at).toLocaleDateString('pt-BR')
                      : 'Recente'}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-slate-900/5 dark:bg-white/5 flex items-center justify-center text-[#009ee3] group-hover:bg-[#009ee3] group-hover:text-white transition-all">
                    <ArrowRight size={14} />
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
