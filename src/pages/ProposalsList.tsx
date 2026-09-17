import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CommercialProposalData } from '../types';
import { listProposals, deleteProposal } from '../services/proposalService';
import { generateProposalPDF } from '../utils/proposalPdfGenerator';
import {
  Search,
  PlusCircle,
  ArrowRight,
  Briefcase,
  Trash2,
  Download,
  RefreshCw,
  UserCheck
} from 'lucide-react';

export default function ProposalsList() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<CommercialProposalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const data = await listProposals();
      setProposals(data);
    } catch (err) {
      console.error('Erro ao buscar propostas:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = proposals.filter(
    p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.workAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Deseja excluir esta Proposta Comercial?')) return;
    setProposals(proposals.filter(p => p.id !== id));
    try {
      await deleteProposal(id);
    } catch {
      alert('Erro ao excluir proposta.');
      fetchProposals();
    }
  };

  const handleDownloadPDF = async (e: React.MouseEvent, proposal: CommercialProposalData) => {
    e.stopPropagation();
    setGeneratingId(proposal.id || null);
    try {
      await generateProposalPDF(proposal);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF da Proposta Comercial.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto flex flex-col h-full font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Briefcase className="text-[#009ee3]" size={24} />
            Propostas Comerciais
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            Gerencie e envie propostas de serviços elétricos
          </p>
        </div>

        <button
          onClick={() => navigate('/proposta/nova')}
          className="bg-[#009ee3] hover:bg-blue-400 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 active:scale-95 transition-transform shadow-md shrink-0"
        >
          <PlusCircle size={18} strokeWidth={2.5} />
          <span>Nova Proposta</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        />
        <input
          type="text"
          placeholder="Buscar proposta, cliente ou endereço..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full h-12 bg-white/80 dark:bg-[#1a2b4b]/80 border border-slate-900/10 dark:border-white/5 rounded-2xl pl-12 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-[#009ee3] transition-colors shadow-sm"
        />
      </div>

      {/* Cards */}
      <div className="space-y-3 flex-1 overflow-y-auto pb-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-bold animate-pulse uppercase text-xs">
            Carregando propostas...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-900/15 dark:border-white/10 rounded-2xl p-6 bg-slate-900/5 dark:bg-white/5">
            <Briefcase size={44} className="mb-3 text-[#009ee3] opacity-60" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Nenhuma Proposta Comercial encontrada.
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Clique em &quot;Nova Proposta&quot; para criar.
            </p>
          </div>
        ) : (
          filtered.map(proposal => (
            <div
              key={proposal.id}
              onClick={() => navigate(`/proposta/${proposal.id}`)}
              className="bg-white/80 dark:bg-[#1a2b4b]/80 border border-slate-900/10 dark:border-white/5 rounded-2xl p-4 active:scale-[0.99] hover:border-[#009ee3]/50 transition-all cursor-pointer shadow-sm relative group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug flex items-center gap-2">
                    <Briefcase size={16} className="text-[#009ee3] shrink-0" />
                    <span className="truncate">{proposal.name || 'Proposta Comercial'}</span>
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {proposal.clientName ? (
                      <span className="text-amber-500 font-extrabold flex items-center gap-1">
                        <UserCheck size={12} /> {proposal.clientName}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold text-[11px]">Cliente Avulso</span>
                    )}
                    {proposal.created_by && (
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        • {proposal.created_by}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={e => handleDownloadPDF(e, proposal)}
                    disabled={generatingId === proposal.id}
                    className="p-2 text-slate-400 hover:text-[#009ee3] hover:bg-[#009ee3]/10 rounded-xl transition-all"
                    title="Baixar PDF da Proposta"
                  >
                    {generatingId === proposal.id ? (
                      <RefreshCw size={16} className="animate-spin text-[#009ee3]" />
                    ) : (
                      <Download size={16} />
                    )}
                  </button>

                  <button
                    onClick={e => handleDelete(e, proposal.id!)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Excluir Proposta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {proposal.workAddress && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mb-2">
                  📍 {proposal.workAddress}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-900/5 dark:border-white/5">
                <div className="flex items-center gap-2">
                  {proposal.validityDays && (
                    <span className="text-[11px] font-extrabold text-[#009ee3] bg-[#009ee3]/10 px-2.5 py-0.5 rounded-lg border border-[#009ee3]/20">
                      Validade: {proposal.validityDays} dias
                    </span>
                  )}
                  {proposal.executionDays && (
                    <span className="text-[11px] font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                      Prazo: {proposal.executionDays}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">
                    {proposal.created_at
                      ? new Date(proposal.created_at).toLocaleDateString('pt-BR')
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
