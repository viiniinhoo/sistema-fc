import { set, get, update } from 'idb-keyval';
import { supabase } from '../lib/supabase';



export type SyncAction = {
  id: string;
  type: 'CREATE_CLIENT' | 'CREATE_BUDGET' | 'CREATE_MATERIAL_LIST' | 'UPDATE_BUDGET' | 'DELETE_BUDGET';
  payload: any;
  created_at: number;
};

// Add action to the offline queue
export const addToSyncQueue = async (action: SyncAction) => {
  await update('syncQueue', (val) => {
    const queue = (val as SyncAction[]) || [];
    return [...queue, action];
  });
};

// Run the sync process when online
export const syncOfflineData = async () => {
  if (!navigator.onLine) return;

  const queue = await get<SyncAction[]>('syncQueue');
  if (!queue || queue.length === 0) return;

  const newQueue = [...queue];

  // Try to process each action
  for (let i = 0; i < queue.length; i++) {
    const action = queue[i];
    try {
      if (action.type === 'CREATE_CLIENT') {
        const { error } = await supabase.from('clients').insert(action.payload);
        if (error) throw error;
      }
      if (action.type === 'CREATE_BUDGET' || action.type === 'UPDATE_BUDGET') {
        // We handle budget saving logic
        const { error } = await supabase.from('budgets').upsert(action.payload);
        if (error) throw error;
      }
      // Remove from queue if successful
      newQueue.shift();
    } catch (err) {
      console.error('Falha ao sincronizar item:', action, err);
      // Stop syncing on first error to maintain sequence integrity
      break;
    }
  }

  await set('syncQueue', newQueue);
};

// Generic wrapper to execute immediate Supabase or fallback offline
export const executeOrQueue = async (action: SyncAction) => {
  if (navigator.onLine) {
    try {
      if (action.type === 'CREATE_CLIENT') {
        const { error } = await supabase.from('clients').insert(action.payload);
        if (error) throw error;
      }
      // Add more direct execution paths as needed
      return { success: true, offline: false };
    } catch (error) {
      console.warn("API Error, falling back to offline queue", error);
      await addToSyncQueue(action);
      return { success: true, offline: true };
    }
  } else {
    await addToSyncQueue(action);
    return { success: true, offline: true };
  }
};
