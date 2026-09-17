import jsPDF from 'jspdf';
import type { CommercialProposalData } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const COLORS = {
  navy: [26, 43, 75] as [number, number, number],
  skyBlue: [0, 158, 227] as [number, number, number],
  gold: [234, 179, 8] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [51, 65, 85] as [number, number, number],
  textDark: [30, 41, 59] as [number, number, number],
  border: [226, 232, 240] as [number, number, number]
};

const MARGINS = { left: 14, right: 196 };
const HEADER_H = 28;

const loadLogo = (): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = '/logo.png';
    img.onload = () => resolve(img);
    img.onerror = () => reject();
  });
};

const drawHeader = async (
  doc: jsPDF,
  title: string,
  proposalTitle?: string,
  clientName?: string
) => {
  // Navy Header Box
  doc.setFillColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.rect(0, 0, 210, HEADER_H, 'F');

  // Gold Stripe (Faixa Amarela Padrão LVC)
  doc.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.rect(0, HEADER_H, 210, 2, 'F');

  try {
    const logo = await loadLogo();
    const imgH = 18;
    const imgW = (logo.width / logo.height) * imgH;
    const logoY = (HEADER_H - imgH) / 2;
    doc.addImage(logo, 'PNG', MARGINS.left, logoY, imgW, imgH);

    const textStart = MARGINS.left + imgW + 5;
    const textYLine1 = logoY + 8;

    doc.setTextColor(COLORS.skyBlue[0], COLORS.skyBlue[1], COLORS.skyBlue[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('LVC ELÉTRICA', textStart, textYLine1);

    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(title.toUpperCase(), textStart, textYLine1 + 5);
    if (proposalTitle) {
      doc.setFont('helvetica', 'bold');
      doc.text(proposalTitle, textStart, textYLine1 + 9);
    }
  } catch {
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('LVC ELÉTRICA', MARGINS.left, 18);
  }

  // Right side: emission date, client, address
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  const dateStr = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
  doc.text(`EMISSÃO: ${dateStr}`, MARGINS.right, 12, { align: 'right' });

  if (clientName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
    doc.text(`CLIENTE: ${clientName.toUpperCase()}`, MARGINS.right, 18, { align: 'right' });
  }
};

const drawFooter = (doc: jsPDF, footerText?: string) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const certY = pageHeight - 20;

  doc.setDrawColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.setLineWidth(0.4);
  doc.line(MARGINS.left, certY, MARGINS.right, certY);

  if (footerText) {
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(footerText, 105, certY + 4, { align: 'center' });
  }

  // Faixa Amarela Inferior (Rodapé Padrão LVC)
  doc.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  doc.rect(0, pageHeight - 8, 210, 8, 'F');
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'LVC ELÉTRICA — SEGURANÇA E AUTORIDADE EM ENGENHARIA ELÉTRICA',
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
        text: 'Proposta Comercial enviada via sistema LVC Elétrica'
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

export async function generateProposalPDF(data: CommercialProposalData): Promise<void> {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageH = 297;
  const contentW = MARGINS.right - MARGINS.left;

  await drawHeader(doc, 'Proposta Comercial', data.name, data.clientName);

  let currentY = 38;

  const checkPageBreak = async (neededH = 20) => {
    if (currentY + neededH > pageH - 25) {
      drawFooter(doc);
      doc.addPage();
      await drawHeader(doc, 'Proposta Comercial', data.name, data.clientName);
      currentY = 38;
    }
  };


  // ── Prazo / Validade ──────────────────────────────────────────────────────
  if (data.executionDays || data.validityDays) {
    const halfW = (contentW - 4) / 2;
    const cardH = 14;
    const radius = 1.5;

    // Card 1: Prazo de Execução (Fundo azul com sobreposição interna suave)
    doc.setFillColor(COLORS.skyBlue[0], COLORS.skyBlue[1], COLORS.skyBlue[2]);
    doc.roundedRect(MARGINS.left, currentY, halfW, cardH, radius, radius, 'F');

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(MARGINS.left + 2.2, currentY, halfW - 2.2, cardH, radius, radius, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGINS.left, currentY, halfW, cardH, radius, radius, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('PRAZO DE EXECUÇÃO', MARGINS.left + 5.5, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text(data.executionDays || 'A definir', MARGINS.left + 5.5, currentY + 10.5);

    // Card 2: Validade da Proposta (Fundo azul com sobreposição interna suave)
    const col2x = MARGINS.left + halfW + 4;
    doc.setFillColor(COLORS.skyBlue[0], COLORS.skyBlue[1], COLORS.skyBlue[2]);
    doc.roundedRect(col2x, currentY, halfW, cardH, radius, radius, 'F');

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(col2x + 2.2, currentY, halfW - 2.2, cardH, radius, radius, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(col2x, currentY, halfW, cardH, radius, radius, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('VALIDADE DA PROPOSTA', col2x + 5.5, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text(data.validityDays ? `${data.validityDays} dias` : 'A definir', col2x + 5.5, currentY + 10.5);

    currentY += 19;
  }

  const addSectionTitle = (title: string, num: string) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGINS.left, currentY, MARGINS.right, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.skyBlue[0], COLORS.skyBlue[1], COLORS.skyBlue[2]);
    doc.text(`${num}. ${title}`, MARGINS.left, currentY);
    currentY += 6;
  };

  // ── 1. Resumo dos Serviços ───────────────────────────────────────────────
  if (data.services && data.services.length > 0) {
    await checkPageBreak(20);
    addSectionTitle('RESUMO DOS SERVIÇOS', '1');
    for (const service of data.services) {
      if (!service.description) continue;
      await checkPageBreak(14);
      doc.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
      doc.circle(MARGINS.left + 2, currentY - 1, 1.2, 'F');
      const lines = doc.splitTextToSize(service.description, contentW - 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      doc.text(lines, MARGINS.left + 6, currentY);
      currentY += lines.length * 5 + 2;
    }
    currentY += 4;
  }

  // ── 2. Resumo de Investimento (Estilo Suave & Elegante) ───────────────────
  if (data.investments && data.investments.length > 0) {
    await checkPageBreak(30);
    addSectionTitle('RESUMO DE INVESTIMENTO', '2');

    // Cabeçalho da Tabela Suave (Cinza Claro com Linha Divisória)
    const tableHeaderH = 7;
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGINS.left, currentY, contentW, tableHeaderH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(MARGINS.left, currentY + tableHeaderH, MARGINS.right, currentY + tableHeaderH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    doc.text('DESCRIÇÃO', MARGINS.left + 4, currentY + 4.8);
    doc.text('VALOR (R$)', MARGINS.right - 4, currentY + 4.8, { align: 'right' });

    currentY += tableHeaderH;

    let totalInvestment = 0;

    for (let idx = 0; idx < data.investments.length; idx++) {
      const inv = data.investments[idx];
      const amount = Number(inv.amount || 0);
      totalInvestment += amount;

      const catPrefix = inv.category ? `${inv.category}: ` : '';
      const fullText = `${catPrefix}${inv.description}`;
      const textW = contentW - 36;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const descLines = doc.splitTextToSize(fullText, textW);
      const rowH = Math.max((descLines.length - 1) * 3.6 + 6.5, 7);

      await checkPageBreak(rowH);

      // Fundo zebrado suave
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(MARGINS.left, currentY, contentW, rowH, 'F');
      }

      // Linha separadora inferior
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(MARGINS.left, currentY + rowH, MARGINS.right, currentY + rowH);

      // Imprimir texto da descrição
      let textY = currentY + 4.2;
      if (inv.category && descLines.length > 0) {
        const firstLine = descLines[0];
        const catStr = `${inv.category}: `;

        if (firstLine.startsWith(catStr)) {
          const restFirstLine = firstLine.slice(catStr.length);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
          doc.text(catStr, MARGINS.left + 4, textY);

          const catW = doc.getTextWidth(catStr);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
          doc.text(restFirstLine, MARGINS.left + 4 + catW, textY);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
          doc.text(firstLine, MARGINS.left + 4, textY);
        }

        if (descLines.length > 1) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
          doc.text(descLines.slice(1), MARGINS.left + 4, textY + 3.6, { align: 'justify', maxWidth: textW });
        }
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        doc.text(descLines, MARGINS.left + 4, textY, { align: 'justify', maxWidth: textW });
      }

      // Valor formatado à direita
      const amountStr = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
      doc.text(amountStr, MARGINS.right - 4, currentY + 5.0, { align: 'right' });

      currentY += rowH;
    }

    // Caixa de Valor Total do Projeto (Clean & Sofisticado)
    const totalBoxH = 10;
    await checkPageBreak(totalBoxH + 4);

    currentY += 2;
    doc.setFillColor(26, 43, 75);
    doc.roundedRect(MARGINS.left, currentY, contentW, totalBoxH, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text('VALOR TOTAL DO PROJETO', MARGINS.left + 5, currentY + 6.4);

    const formattedTotal = totalInvestment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(COLORS.skyBlue[0], COLORS.skyBlue[1], COLORS.skyBlue[2]);
    doc.text(formattedTotal, MARGINS.right - 5, currentY + 6.4, { align: 'right' });

    currentY += totalBoxH + 6;
  }

  // ── 3. Materiais ──────────────────────────────────────────────────────────
  await checkPageBreak(26);
  addSectionTitle('MATERIAIS', '3');

  const materialText =
    data.materialObservations ||
    'Os materiais necessários para a execução dos serviços serão definidos após a validação desta proposta e o início do levantamento técnico detalhado no local. Após essa etapa, será realizado o levantamento completo dos materiais, considerando as necessidades específicas da instalação, as condições encontradas e os requisitos técnicos identificados. A relação de materiais será apresentada posteriormente para análise e aprovação do cliente.';

  if (materialText) {
    const textW = contentW - 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    const matLines = doc.splitTextToSize(materialText, textW);
    const boxH = Math.max((matLines.length - 1) * 3.6 + 7.0, 12);
    await checkPageBreak(boxH);

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(MARGINS.left, currentY, contentW, boxH, 1.5, 1.5, 'F');
    doc.setDrawColor(187, 247, 208);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGINS.left, currentY, contentW, boxH, 1.5, 1.5, 'S');

    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text(matLines, MARGINS.left + 3, currentY + 4.2, { align: 'justify', maxWidth: textW });
    currentY += boxH + 6;
  }

  // ── 4. Condições de Pagamento ─────────────────────────────────────────────
  await checkPageBreak(24);
  addSectionTitle('CONDIÇÕES DE PAGAMENTO', '4');

  const ptText =
    data.paymentTerms ||
    'As condições de pagamento, parcelamento, prazos e forma de acerto financeiro serão acordados e formalizados diretamente entre as partes envolvidas (Contratante e Prestador de Serviço) conforme o alinhamento das etapas da execução dos serviços.';

  if (ptText) {
    const textW = contentW - 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const ptLines = doc.splitTextToSize(ptText, textW);
    const ptBoxH = Math.max((ptLines.length - 1) * 3.6 + 7.0, 10);
    await checkPageBreak(ptBoxH);

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(MARGINS.left, currentY, contentW, ptBoxH, 1.5, 1.5, 'F');
    doc.setDrawColor(191, 219, 254);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGINS.left, currentY, contentW, ptBoxH, 1.5, 1.5, 'S');

    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text(ptLines, MARGINS.left + 3, currentY + 4.2, { align: 'justify', maxWidth: textW });
    currentY += ptBoxH + 6;
  }

  // ── 5. Observações Gerais ─────────────────────────────────────────────────
  if (data.observations && data.observations.trim()) {
    await checkPageBreak(20);
    addSectionTitle('OBSERVAÇÕES', '5');
    const obsLines = doc.splitTextToSize(data.observations, contentW);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text(obsLines, MARGINS.left, currentY, { align: 'justify', maxWidth: contentW });
    currentY += obsLines.length * 5 + 6;
  }

  // ── Assinaturas ───────────────────────────────────────────────────────────
  await checkPageBreak(32);
  currentY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGINS.left, currentY, MARGINS.right, currentY);
  currentY += 12;

  const sigW = (contentW - 10) / 2;
  doc.setDrawColor(148, 163, 184);

  // Assinatura 1 - Contratante
  const sig1CenterX = MARGINS.left + sigW / 2;
  doc.line(MARGINS.left, currentY, MARGINS.left + sigW, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('CONTRATANTE / CLIENTE', sig1CenterX, currentY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text('CPF/CNPJ: _______________________', sig1CenterX, currentY + 9, { align: 'center' });

  // Assinatura 2 - Prestador
  const col2x = MARGINS.left + sigW + 10;
  const sig2CenterX = col2x + sigW / 2;
  doc.line(col2x, currentY, col2x + sigW, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
  doc.text('PRESTADOR DE SERVIÇO / RESP. TÉCNICO', sig2CenterX, currentY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text('CFT/CREA: _______________________', sig2CenterX, currentY + 9, { align: 'center' });

  // Rodapé padrão da última página
  drawFooter(doc, 'PROPOSTA COMERCIAL DE SERVIÇOS ELÉTRICOS — SUJEITA A ALTERAÇÕES SE HOUVER MUDANÇA NO ESCOPO.');

  const clientSlug = data.clientName
    ? `_${data.clientName.replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`
    : '';
  const fileName = `Proposta_Comercial${clientSlug}_LVC.pdf`;

  await handlePdfOutput(doc, fileName);
}
