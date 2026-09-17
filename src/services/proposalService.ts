import { supabase } from '../lib/supabase';
import type { CommercialProposalData, ProposalService, InvestmentItem } from '../types';
import { get, set } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';

const LOCAL_KEY = 'lvc_commercial_proposals_local';

const getLocalProposals = async (): Promise<CommercialProposalData[]> => {
  try {
    const data = await get<CommercialProposalData[]>(LOCAL_KEY);
    return data || [];
  } catch {
    return [];
  }
};

const saveLocalProposal = async (proposal: CommercialProposalData): Promise<void> => {
  const current = await getLocalProposals();
  const idx = current.findIndex(p => p.id === proposal.id);
  const updated = idx >= 0
    ? current.map((p, i) => (i === idx ? proposal : p))
    : [proposal, ...current];
  await set(LOCAL_KEY, updated);
};

const removeLocalProposal = async (id: string): Promise<void> => {
  const current = await getLocalProposals();
  await set(LOCAL_KEY, current.filter(p => p.id !== id));
};

export const saveProposal = async (
  data: CommercialProposalData,
  userId?: string,
  creatorName?: string
): Promise<CommercialProposalData> => {
  const proposalId = data.id || uuidv4();
  const now = new Date().toISOString();

  const formatted: CommercialProposalData = {
    ...data,
    id: proposalId,
    created_at: data.created_at || now,
    created_by: creatorName || data.created_by
  };

  await saveLocalProposal(formatted);

  if (!navigator.onLine) return formatted;

  try {
    const { error: propError } = await supabase.from('commercial_proposals').upsert({
      id: proposalId,
      name: data.name,
      client_id: data.clientId || null,
      work_address: data.workAddress || null,
      execution_days: data.executionDays || null,
      validity_days: data.validityDays || null,
      payment_terms: data.paymentTerms || null,
      material_observations: data.materialObservations || null,
      observations: data.observations || null,
      user_id: userId || null,
      created_by: creatorName || null,
      updated_at: now
    });

    if (propError) {
      console.warn('Erro ao salvar proposta no Supabase (fallback local):', propError.message);
      return formatted;
    }

    // Clear old services & investments and re-insert
    if (data.id) {
      await supabase.from('proposal_services').delete().eq('proposal_id', proposalId);
      await supabase.from('proposal_investments').delete().eq('proposal_id', proposalId);
    }

    if (data.services && data.services.length > 0) {
      const services = data.services.map((s, idx) => ({
        id: s.id || uuidv4(),
        proposal_id: proposalId,
        description: s.description,
        position_order: idx + 1
      }));
      await supabase.from('proposal_services').insert(services);
    }

    if (data.investments && data.investments.length > 0) {
      const investments = data.investments.map((inv, idx) => ({
        id: inv.id || uuidv4(),
        proposal_id: proposalId,
        category: inv.category,
        description: inv.description,
        amount: inv.amount,
        position_order: idx + 1
      }));
      await supabase.from('proposal_investments').insert(investments);
    }

    return formatted;
  } catch (err) {
    console.warn('Fallback ativado para salvar proposta:', err);
    return formatted;
  }
};

export const listProposals = async (): Promise<CommercialProposalData[]> => {
  const local = await getLocalProposals();

  if (!navigator.onLine) return local;

  try {
    const { data: remote, error } = await supabase
      .from('commercial_proposals')
      .select('*, clients(name)')
      .order('created_at', { ascending: false });

    if (error || !remote) return local;

    const formatted: CommercialProposalData[] = remote.map((p: any) => ({
      id: p.id,
      name: p.name,
      clientId: p.client_id,
      clientName: p.clients?.name || '',
      workAddress: p.work_address || '',
      executionDays: p.execution_days || '',
      validityDays: p.validity_days || '',
      paymentTerms: p.payment_terms || '',
      materialObservations: p.material_observations || '',
      observations: p.observations || '',
      created_at: p.created_at,
      created_by: p.created_by,
      services: [],
      investments: []
    }));

    const remoteIds = new Set(formatted.map(p => p.id));
    const uniqueLocal = local.filter(p => p.id && !remoteIds.has(p.id));
    return [...formatted, ...uniqueLocal];
  } catch {
    return local;
  }
};

export const getProposalById = async (id: string): Promise<CommercialProposalData | null> => {
  const local = await getLocalProposals();
  const foundLocal = local.find(p => p.id === id) || null;

  if (!navigator.onLine) return foundLocal;

  try {
    const { data: p, error } = await supabase
      .from('commercial_proposals')
      .select('*, clients(name, address), proposal_services(*), proposal_investments(*)')
      .eq('id', id)
      .single();

    if (error || !p) return foundLocal;

    return {
      id: p.id,
      name: p.name,
      clientId: p.client_id,
      clientName: p.clients?.name || '',
      workAddress: p.work_address || p.clients?.address || '',
      executionDays: p.execution_days || '',
      validityDays: p.validity_days || '',
      paymentTerms: p.payment_terms || '',
      materialObservations: p.material_observations || '',
      observations: p.observations || '',
      created_at: p.created_at,
      created_by: p.created_by,
      services: (p.proposal_services || [])
        .sort((a: any, b: any) => (a.position_order || 0) - (b.position_order || 0))
        .map((s: any): ProposalService => ({
          id: s.id,
          description: s.description,
          positionOrder: s.position_order
        })),
      investments: (p.proposal_investments || [])
        .sort((a: any, b: any) => (a.position_order || 0) - (b.position_order || 0))
        .map((inv: any): InvestmentItem => ({
          id: inv.id,
          category: inv.category,
          description: inv.description,
          amount: Number(inv.amount || 0),
          positionOrder: inv.position_order
        }))
    };
  } catch {
    return foundLocal;
  }
};

export const deleteProposal = async (id: string): Promise<void> => {
  await removeLocalProposal(id);

  if (navigator.onLine) {
    try {
      await supabase.from('proposal_services').delete().eq('proposal_id', id);
      await supabase.from('proposal_investments').delete().eq('proposal_id', id);
      await supabase.from('commercial_proposals').delete().eq('id', id);
    } catch (err) {
      console.warn('Erro ao excluir proposta no Supabase:', err);
    }
  }
};
