import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { QdcPanelData } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

const COLORS = {
  navy: [26, 43, 75] as [number, number, number],
  skyBlue: [0, 158, 227] as [number, number, number],
  gold: [234, 179, 8] as [number, number, number],
  amberHeader: [217, 119, 6] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  lightBg: [248, 250, 252] as [number, number, number],
  warningBoxBg: [254, 243, 199] as [number, number, number],
  warningBorder: [245, 158, 11] as [number, number, number]
};

const MARGINS = { left: 12, right: 198 };
const HEADER_H = 26;

const loadLogo = (): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = '/logo.png';
    img.onload = () => resolve(img);
    img.onerror = () => reject();
  });
};

const drawHeader = async (doc: jsPDF, panelName: string, clientName?: string) => {
  doc.setFillColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.rect(0, 0, 210, HEADER_H, 'F');
  doc.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.rect(0, HEADER_H, 210, 2.5, 'F');

  try {
    const logo = await loadLogo();
    const imgH = 16;
    const imgW = (logo.width / logo.height) * imgH;
    const logoY = (HEADER_H - imgH) / 2;
    doc.addImage(logo, 'PNG', MARGINS.left, logoY, imgW, imgH);

    const textStart = MARGINS.left + imgW + 4;
    const textYLine1 = logoY + 7;

    doc.setTextColor(COLORS.skyBlue[0], COLORS.skyBlue[1], COLORS.skyBlue[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('LVC ELÉTRICA', textStart, textYLine1);

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    const userName = user?.user_metadata?.name || 'Vinicius Cardoso';
    const userPhone = user?.user_metadata?.phone || '21986757505';

    const respText = userPhone ? `${userName} - ${userPhone}` : userName;

    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(respText, textStart, textYLine1 + 5);
  } catch {
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('LVC ELÉTRICA', MARGINS.left, 16);
  }

  // Right Title
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICAÇÃO DE QDC', MARGINS.right, 13, { align: 'right' });

  doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.setFontSize(8);
  if (clientName) {
    doc.text(`CLIENTE: ${clientName.toUpperCase()}`, MARGINS.right, 18, { align: 'right' });
  } else {
    doc.text(`QUADRO: ${panelName.toUpperCase()}`, MARGINS.right, 18, { align: 'right' });
  }

  const dateStr = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
  doc.text(`EMISSÃO: ${dateStr}`, MARGINS.right, 23, { align: 'right' });
};

const drawFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.rect(0, pageHeight - 8, 210, 8, 'F');
  doc.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.rect(0, pageHeight - 8, 210, 0.8, 'F');

  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'LVC ELÉTRICA — QUADRO DE DISTRIBUIÇÃO E CIRCUITOS — CONFORME NBR 5410/2004',
    105,
    pageHeight - 3,
    { align: 'center' }
  );
};

const handlePdfOutput = async (doc: jsPDF, filename: string) => {
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: 'Identificação de QDC enviada via sistema LVC Elétrica'
      });
      return;
    } catch (err) {
      console.log('Share error:', err);
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const generateQdcPDF = async (data: QdcPanelData) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  await drawHeader(doc, data.name, data.clientName);

  let currentY = 32;

  // Panel subhead bar
  doc.setFillColor(COLORS.lightBg[0], COLORS.lightBg[1], COLORS.lightBg[2]);
  doc.setDrawColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGINS.left, currentY, MARGINS.right - MARGINS.left, 10, 1.5, 1.5, 'FD');

  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`QUADRO: ${data.name.toUpperCase()}`, MARGINS.left + 4, currentY + 6.5);

  if (data.workAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text(`LOCAL: ${data.workAddress}`, MARGINS.right - 4, currentY + 6.5, { align: 'right' });
  }

  currentY += 13;

  // Table of Circuits
  const tableRows = data.circuits.map((c, idx) => [
    c.identification || (idx + 1).toString().padStart(2, '0'),
    c.cableSize || '-',
    c.description || 'Circuito de Proteção',
    c.breakerRating || '-'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['IDENTIFICAÇÃO', 'BITOLA CABO', 'DESCRIÇÃO DO CIRCUITO', 'DISJUNTOR (A)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.navy,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 34, halign: 'center' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 42, halign: 'center', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: COLORS.text,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249]
    },
    margin: { left: MARGINS.left, right: 12 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // Check page overflow for NBR warning box
  if (currentY + 60 > 270) {
    doc.addPage();
    currentY = 20;
  }

  // NBR 5410 Warning Banner
  const warningBoxW = MARGINS.right - MARGINS.left;

  doc.setFillColor(COLORS.amberHeader[0], COLORS.amberHeader[1], COLORS.amberHeader[2]);
  doc.rect(MARGINS.left, currentY, warningBoxW, 7, 'F');
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    'ADVERTÊNCIA - SER AFIXADA NA PORTA DO QUADRO (ITEM 6.5.4.10 DA NBR 5410/2004)',
    105,
    currentY + 4.8,
    { align: 'center' }
  );

  currentY += 7;

  // Warning details box content
  const warningText1 =
    '1. Quando um disjuntor ou fusível atua, desligando algum circuito ou a instalação inteira, a causa pode ser uma sobrecarga ou um curto-circuito. Desligamentos frequentes são sinal de sobrecarga. Por isso, NUNCA troque seus disjuntores por outros de maior amperagem simplesmente. A troca de um disjuntor por outro de maior corrente requer, antes, a substituição dos condutores (cabos) por outros de maior seção (bitola).';

  const warningText2 =
    '2. Da mesma forma, NUNCA desative ou remova o dispositivo de proteção contra choques elétricos (DR). Se os desligamentos persistirem após tentar religar a chave, isto significa anomalia grave na instalação. CHAME UM ELETRICISTA QUALIFICADO - RISCO DE VIDA.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const split1 = doc.splitTextToSize(warningText1, warningBoxW - 6);
  const split2 = doc.splitTextToSize(warningText2, warningBoxW - 6);

  const boxContentH = split1.length * 3.5 + split2.length * 3.5 + 8;

  doc.setFillColor(COLORS.warningBoxBg[0], COLORS.warningBoxBg[1], COLORS.warningBoxBg[2]);
  doc.setDrawColor(COLORS.warningBorder[0], COLORS.warningBorder[1], COLORS.warningBorder[2]);
  doc.setLineWidth(0.4);
  doc.rect(MARGINS.left, currentY, warningBoxW, boxContentH, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.text(split1, MARGINS.left + 3, currentY + 4.5);

  const y2 = currentY + 4.5 + split1.length * 3.5 + 2;
  doc.text(split2, MARGINS.left + 3, y2);

  currentY += boxContentH + 12;

  // Signature Block if space allows
  if (currentY + 25 <= 275) {
    const sigX = 105;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(sigX - 40, currentY + 12, sigX + 40, currentY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text('LVC ELÉTRICA — RESPONSÁVEL TÉCNICO', sigX, currentY + 16, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('INSTALAÇÕES E IDENTIFICAÇÃO DE QUADRO DE DISTRIBUIÇÃO', sigX, currentY + 20, {
      align: 'center'
    });
  }

  drawFooter(doc);

  const sanitizedTitle = data.name.replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fileName = `QDC_LVC_${sanitizedTitle}.pdf`;
  await handlePdfOutput(doc, fileName);
};
