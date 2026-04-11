export interface BudgetItem {
  id: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BudgetData {
  id?: string;
  clientName: string;
  whatsapp: string;
  workAddress: string;
  validityDays: string;
  paymentTerms: string;
  items: BudgetItem[];
  observations: string;
}
