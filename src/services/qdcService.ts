import { supabase } from '../lib/supabase';
import type { QdcPanelData } from '../types';
import { get, set } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';

const LOCAL_STORAGE_KEY = 'lvc_qdc_panels_local';

const getLocalPanels = async (): Promise<QdcPanelData[]> => {
  try {
    const data = await get<QdcPanelData[]>(LOCAL_STORAGE_KEY);
    return data || [];
  } catch (err) {
    console.error('Erro ao ler quadros locais:', err);
    return [];
  }
};

const saveLocalPanel = async (panel: QdcPanelData): Promise<void> => {
  const current = await getLocalPanels();
  const existingIdx = current.findIndex(p => p.id === panel.id);
  let updated: QdcPanelData[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = panel;
  } else {
    updated = [panel, ...current];
  }
  await set(LOCAL_STORAGE_KEY, updated);
};

const removeLocalPanel = async (id: string): Promise<void> => {
  const current = await getLocalPanels();
  const updated = current.filter(p => p.id !== id);
  await set(LOCAL_STORAGE_KEY, updated);
};

export const saveQdcPanel = async (
  data: QdcPanelData,
  userId?: string,
  creatorName?: string
): Promise<QdcPanelData> => {
  const panelId = data.id || uuidv4();
  const now = new Date().toISOString();

  const formattedPanel: QdcPanelData = {
    ...data,
    id: panelId,
    created_at: data.created_at || now,
    created_by: creatorName || data.created_by
  };

  // Always back up locally first for bulletproof offline support
  await saveLocalPanel(formattedPanel);

  if (!navigator.onLine) {
    return formattedPanel;
  }

  try {
    // 1. Upsert qdc_panels table
    const { error: panelError } = await supabase
      .from('qdc_panels')
      .upsert({
        id: panelId,
        name: data.name,
        client_id: data.clientId || null,
        work_address: data.workAddress || null,
        observations: data.observations || null,
        user_id: userId || null,
        created_by: creatorName || null,
        updated_at: now
      })
      .select()
      .single();

    if (panelError) {
      console.warn('Erro ao salvar qdc_panels no Supabase (usando fallback local):', panelError.message);
      return formattedPanel;
    }

    // 2. Clear old circuits if updating
    if (data.id) {
      await supabase.from('qdc_circuits').delete().eq('panel_id', panelId);
    }

    // 3. Insert circuits
    if (data.circuits.length > 0) {
      const circuitsToInsert = data.circuits.map((c, idx) => ({
        id: c.id || uuidv4(),
        panel_id: panelId,
        identification: c.identification,
        cable_size: c.cableSize,
        description: c.description,
        breaker_rating: c.breakerRating,
        position_order: idx + 1
      }));

      const { error: circuitsError } = await supabase
        .from('qdc_circuits')
        .insert(circuitsToInsert);

      if (circuitsError) {
        console.warn('Erro ao salvar qdc_circuits no Supabase:', circuitsError.message);
      }
    }

    return formattedPanel;
  } catch (err) {
    console.warn('Fallback ativado para salvar QDC:', err);
    return formattedPanel;
  }
};

export const listQdcPanels = async (): Promise<QdcPanelData[]> => {
  const localPanels = await getLocalPanels();

  if (!navigator.onLine) {
    return localPanels;
  }

  try {
    const { data: remoteData, error } = await supabase
      .from('qdc_panels')
      .select(`
        *,
        clients ( name ),
        qdc_circuits ( * )
      `)
      .order('created_at', { ascending: false });

    if (error || !remoteData) {
      console.warn('Fallback para listagem de quadros:', error?.message);
      return localPanels;
    }

    // Format Supabase data to QdcPanelData
    const formattedRemote: QdcPanelData[] = remoteData.map((p: any) => ({
      id: p.id,
      name: p.name,
      clientId: p.client_id,
      clientName: p.clients?.name || '',
      workAddress: p.work_address || '',
      observations: p.observations || '',
      created_at: p.created_at,
      created_by: p.created_by,
      circuits: (p.qdc_circuits || [])
        .sort((a: any, b: any) => (a.position_order || 0) - (b.position_order || 0))
        .map((c: any) => ({
          id: c.id,
          identification: c.identification,
          cableSize: c.cable_size,
          description: c.description,
          breakerRating: c.breaker_rating,
          positionOrder: c.position_order
        }))
    }));

    // Combine local items not yet in remote
    const remoteIds = new Set(formattedRemote.map(p => p.id));
    const uniqueLocal = localPanels.filter(p => p.id && !remoteIds.has(p.id));

    return [...formattedRemote, ...uniqueLocal];
  } catch (err) {
    console.warn('Erro ao consultar Supabase para QDC:', err);
    return localPanels;
  }
};

export const getQdcPanelById = async (id: string): Promise<QdcPanelData | null> => {
  // Check local first
  const localPanels = await getLocalPanels();
  const foundLocal = localPanels.find(p => p.id === id);

  if (!navigator.onLine) {
    return foundLocal || null;
  }

  try {
    const { data: p, error } = await supabase
      .from('qdc_panels')
      .select(`
        *,
        clients ( name, address ),
        qdc_circuits ( * )
      `)
      .eq('id', id)
      .single();

    if (error || !p) {
      return foundLocal || null;
    }

    return {
      id: p.id,
      name: p.name,
      clientId: p.client_id,
      clientName: p.clients?.name || '',
      workAddress: p.work_address || p.clients?.address || '',
      observations: p.observations || '',
      created_at: p.created_at,
      created_by: p.created_by,
      circuits: (p.qdc_circuits || [])
        .sort((a: any, b: any) => (a.position_order || 0) - (b.position_order || 0))
        .map((c: any) => ({
          id: c.id,
          identification: c.identification,
          cableSize: c.cable_size,
          description: c.description,
          breakerRating: c.breaker_rating,
          positionOrder: c.position_order
        }))
    };
  } catch (err) {
    console.warn('Erro ao buscar QDC por ID:', err);
    return foundLocal || null;
  }
};

export const deleteQdcPanel = async (id: string): Promise<void> => {
  await removeLocalPanel(id);

  if (navigator.onLine) {
    try {
      await supabase.from('qdc_circuits').delete().eq('panel_id', id);
      await supabase.from('qdc_panels').delete().eq('id', id);
    } catch (err) {
      console.warn('Erro ao excluir QDC no Supabase:', err);
    }
  }
};
