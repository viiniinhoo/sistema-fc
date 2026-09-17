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

export interface QdcCircuit {
  id: string;
  identification: string;
  cableSize: string;
  description: string;
  breakerRating: string;
  positionOrder: number;
}

export interface QdcPanelData {
  id?: string;
  name: string;
  clientId?: string;
  clientName?: string;
  workAddress?: string;
  circuits: QdcCircuit[];
  observations?: string;
  created_at?: string;
  created_by?: string;
}


export interface ProposalService {
  id: string;
  description: string;
  positionOrder: number;
}

export interface InvestmentItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  positionOrder?: number;
}

export interface CommercialProposalData {
  id?: string;
  name: string;
  clientId?: string;
  clientName?: string;
  workAddress?: string;
  executionDays?: string;
  validityDays?: string;
  paymentTerms?: string;
  materialObservations?: string;
  observations?: string;
  services: ProposalService[];
  investments?: InvestmentItem[];
  created_at?: string;
  created_by?: string;
}
