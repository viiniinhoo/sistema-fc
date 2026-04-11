import { supabase } from '../lib/supabase';
import type { BudgetData, BudgetItem } from '../types';

export const saveBudget = async (data: BudgetData, totalValue: number) => {
  // 1. Inserir ou atualizar orçamento principal
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .upsert({
      id: (data as any).id, // Se tiver ID, atualiza, senão cria
      client_name: data.clientName,
      whatsapp: data.whatsapp,
      work_address: data.workAddress,
      validity_days: data.validityDays,
      observations: data.observations,
      total_value: totalValue,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (budgetError) throw budgetError;

  // 2. Limpar itens antigos se for atualização
  if ((data as any).id) {
    const { error: deleteError } = await supabase
      .from('budget_items')
      .delete()
      .eq('budget_id', budget.id);
    
    if (deleteError) throw deleteError;
  }

  // 3. Inserir novos itens
  const itemsToInsert = data.items.map(item => ({
    budget_id: budget.id,
    description: item.description,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total: item.total
  }));

  const { error: itemsError } = await supabase
    .from('budget_items')
    .insert(itemsToInsert);

  if (itemsError) throw itemsError;

  return budget;
};

export const listBudgets = async () => {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getBudgetById = async (id: string) => {
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', id)
    .single();

  if (budgetError) throw budgetError;

  const { data: items, error: itemsError } = await supabase
    .from('budget_items')
    .select('*')
    .eq('budget_id', id);

  if (itemsError) throw itemsError;

  // Converter para o formato BudgetData
  const formatted: BudgetData = {
    ...budget,
    clientName: budget.client_name,
    workAddress: budget.work_address,
    validityDays: budget.validity_days,
    paymentTerms: '', // Campo não usado conforme última solicitação
    items: items.map(item => ({
      id: item.id,
      description: item.description,
      category: item.category,
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      total: Number(item.total)
    }))
  };

  return formatted;
};

export const deleteBudget = async (id: string) => {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
