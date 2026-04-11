import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BudgetData, BudgetItem } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

const COLORS = {
  navy: [26, 43, 75] as [number, number, number],
  skyBlue: [59, 130, 246] as [number, number, number],
  gold: [234, 179, 8] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [51, 65, 85] as [number, number, number],
  border: [226, 232, 240] as [number, number, number]
};

const MARGINS = { left: 14, right: 196 };

const loadLogo = (): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = '/logo.png';
    img.onload = () => resolve(img);
    img.onerror = () => reject();
  });
};

// Altura reduzida do cabeçalho de 40 para 28
const HEADER_H = 28;

const drawHeader = async (doc: jsPDF, title: string, rightText: string) => {
  doc.setFillColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.rect(0, 0, 210, HEADER_H, 'F');
  doc.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.rect(0, HEADER_H, 210, 2, 'F'); // Linha gold mais fina

  try {
    const logo = await loadLogo();
    const imgH = 18; // Reduzido para caber na faixa menor
    const imgW = (logo.width / logo.height) * imgH;
    const logoY = (HEADER_H - imgH) / 2;
    doc.addImage(logo, 'PNG', MARGINS.left, logoY, imgW, imgH);
    
    const textStart = MARGINS.left + imgW + 5;
    const textYLine1 = logoY + 8;
    
    doc.setTextColor(COLORS.skyBlue[0], COLORS.skyBlue[1], COLORS.skyBlue[2]);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
    doc.text('FC ELÉTRICA', textStart, textYLine1);
    
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(title.toUpperCase(), textStart, textYLine1 + 5);
    doc.text('Instalações e Manutenções Elétricas', textStart, textYLine1 + 9);
  } catch {
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('FC ELÉTRICA', MARGINS.left, 18);
  }

  doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  const dateStr = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
  doc.text(`DATA: ${dateStr}`, MARGINS.right, 14, { align: 'right' });
  doc.text(rightText, MARGINS.right, 19, { align: 'right' });
};

const drawFooter = (doc: jsPDF, footerText: string) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const certY = pageHeight - 25;
  doc.setDrawColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.setLineWidth(0.4);
  doc.line(MARGINS.left, certY, MARGINS.right, certY);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text(footerText, 105, certY + 4, { align: 'center' });

  doc.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.rect(0, pageHeight - 8, 210, 8, 'F');
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('FC ELÉTRICA — SEGURANÇA E AUTORIDADE EM ENGENHARIA ELÉTRICA', 105, pageHeight - 3, { align: 'center' });
};

export const generateCommercialPDF = async (data: BudgetData) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  await drawHeader(doc, 'Orçamento Comercial', `VALIDADE: ${data.validityDays} DIAS`);

  let currentY = 45; // Começa mais cedo por causa do header menor
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(`CLIENTE: ${data.clientName}`, MARGINS.left, currentY);
  currentY += 5;
  doc.text(`ENDEREÇO: ${data.workAddress}`, MARGINS.left, currentY);
  currentY += 12;

  doc.setTextColor(COLORS.skyBlue[0], COLORS.skyBlue[1], COLORS.skyBlue[2]);
  doc.setFontSize(10);
  doc.text('DESCRIÇÃO DAS ATIVIDADES / SERVIÇOS', MARGINS.left, currentY);
  doc.line(MARGINS.left, currentY + 1.5, MARGINS.right, currentY + 1.5);
  currentY += 8;

  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  
  // Lista bullet compacta
  data.items.forEach(item => {
    const splitDesc = doc.splitTextToSize(`• ${item.description}`, MARGINS.right - MARGINS.left);
    doc.text(splitDesc, MARGINS.left, currentY);
    currentY += (splitDesc.length * 5) + 2;
    
    // Check para nova página se necessário
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
  });

  currentY += 10;
  // Bloco de Total Compacto e Elegante
  const totalBoxW = 80;
  const totalBoxH = 10;
  const totalBoxX = MARGINS.right - totalBoxW;
  
  doc.setFillColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.rect(totalBoxX, currentY, totalBoxW, totalBoxH, 'F');
  
  // Detalhe Gold lateral
  doc.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.rect(totalBoxX, currentY, 2, totalBoxH, 'F');

  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.text('TOTAL DO INVESTIMENTO:', totalBoxX + 6, currentY + 6.5);
  
  const total = data.items.reduce((acc, i) => acc + i.total, 0);
  doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), MARGINS.right - 4, currentY + 6.8, { align: 'right' });

  if (data.observations) {
    currentY += 20;
    doc.setTextColor(COLORS.skyBlue[0], COLORS.skyBlue[1], COLORS.skyBlue[2]);
    doc.setFontSize(9); doc.text('OBSERVAÇÕES ADICIONAIS', MARGINS.left, currentY);
    currentY += 5;
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFont('helvetica', 'normal');
    const splitObs = doc.splitTextToSize(data.observations, MARGINS.right - MARGINS.left);
    doc.text(splitObs, MARGINS.left, currentY);
  }

  const sigY = doc.internal.pageSize.getHeight() - 45;
  doc.setDrawColor(200, 200, 200);
  doc.line(65, sigY, 145, sigY);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('ACEITE DO CLIENTE', 105, sigY + 4, { align: 'center' });

  drawFooter(doc, 'ORÇAMENTO COMERCIAL SUJEITORA A ALTERAÇÕES CASO HAJA MUDANÇA NO ESCOPO.');
  doc.save(`Orcamento_${data.clientName.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyy')}.pdf`);
};

export const generateMaterialListPDF = async (data: BudgetData) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  await drawHeader(doc, 'Lista de Materiais', `PROJETO: ${data.clientName}`);

  const groups: { [key: string]: BudgetItem[] } = {};
  data.items.forEach(item => {
    const cat = item.category || 'Geral';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  let currentY = 40;
  Object.keys(groups).forEach(cat => {
    doc.setTextColor(COLORS.skyBlue[0], COLORS.skyBlue[1], COLORS.skyBlue[2]);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(cat.toUpperCase(), MARGINS.left, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Descrição do Material', 'Unid.', 'Qtd.']],
      body: groups[cat].map((item, idx) => [
        (idx + 1).toString().padStart(2, '0'),
        item.description,
        item.unit || 'un',
        item.quantity.toString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontSize: 8 },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 15 }, 3: { cellWidth: 15, halign: 'center' } },
      styles: { fontSize: 8, cellPadding: 1.5 },
      margin: { left: MARGINS.left, right: 14 }
    });
    currentY = doc.lastAutoTable.finalY + 8;
  });

  drawFooter(doc, 'AS ESPECIFICAÇÕES DEVEM SER SEGUIDAS PARA GARANTIR O PADRÃO DE QUALIDADE DO SERVIÇO.');
  doc.save(`Lista_Materiais_${data.clientName.replace(/\s+/g, '_')}_${format(new Date(), 'ddMMyy')}.pdf`);
};

export const generateAllPDFs = async (data: BudgetData) => {
  await generateCommercialPDF(data);
  await generateMaterialListPDF(data);
};
