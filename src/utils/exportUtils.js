import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate, formatCPF, formatPhone } from './formatters';

/**
 * Export data array to an Excel (.xlsx) file
 * @param {Array<object>} data - JSON array of objects
 * @param {string} fileName - File name without extension
 * @param {string} sheetName - Sheet name
 */
export const exportToExcel = (data, fileName = 'relatorio', sheetName = 'Dados') => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Auto-fit column widths
    const maxCols = Object.keys(data[0] || {}).map(key => {
      const maxLength = Math.max(
        key.length,
        ...data.map(row => (row[key] !== null && row[key] !== undefined ? String(row[key]).length : 0))
      );
      return { wch: Math.min(Math.max(maxLength + 3, 10), 40) };
    });
    worksheet['!cols'] = maxCols;

    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao exportar para Excel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export Contracts to Excel
 */
export const exportContractsExcel = (contracts = []) => {
  const formattedData = contracts.map(c => ({
    'Protocolo': c.protocol_number || '-',
    'Cliente': c.client_name || '-',
    'CPF': formatCPF(c.client_cpf || ''),
    'Data do Empréstimo': formatDate(c.loan_date),
    'Data de Vencimento': formatDate(c.due_date),
    'Valor Principal (R$)': c.principal || 0,
    'Parcelas': c.installments_count || 1,
    'Valor da Parcela (R$)': c.monthly_installment || 0,
    'Total a Receber (R$)': c.total_amount || 0,
    'Taxa Anual (%)': c.interest_rate_year || 0,
    'Taxa Mensal (%)': c.interest_rate_month || 0,
    'Multa Atraso (%)': c.late_fee_percentage || 0,
    'Juros Diário (%)': c.daily_late_interest_percentage || 0,
    'Status': c.status === 'open' ? 'Em aberto' : c.status === 'paid' ? 'Pago' : c.status === 'overdue' ? 'Em atraso' : 'Cancelado'
  }));

  return exportToExcel(formattedData, 'Contratos_Ell_Patron', 'Contratos');
};

/**
 * Export Clients to Excel
 */
export const exportClientsExcel = (clients = []) => {
  const formattedData = clients.map(cl => ({
    'Nome': cl.name || '-',
    'CPF': formatCPF(cl.cpf || ''),
    'Telefone': formatPhone(cl.phone || ''),
    'Email': cl.email || '-',
    'Cidade': cl.city || '-',
    'UF': cl.state || '-',
    'Status': cl.status === 'active' ? 'Ativo' : cl.status === 'blacklisted' ? 'Lista Negra' : 'Inativo',
    'Data de Cadastro': formatDate(cl.registration_date || cl.created_at)
  }));

  return exportToExcel(formattedData, 'Clientes_Ell_Patron', 'Clientes');
};

/**
 * Export Financial History to Excel
 */
export const exportHistoricoExcel = (summary, data = [], period = 'mensal') => {
  const summarySheetData = [
    { 'Indicador': 'Receita Total', 'Valor': formatCurrency(summary.totalRevenue || 0) },
    { 'Indicador': 'Despesas / Capital Investido', 'Valor': formatCurrency(summary.totalExpenses || 0) },
    { 'Indicador': 'Lucro Líquido', 'Valor': formatCurrency(summary.totalProfit || 0) },
    { 'Indicador': 'Período', 'Valor': period }
  ];

  const breakdownData = data.map(item => ({
    'Período': item.label || item.month || item.week || item.day || '-',
    'Receita (R$)': item.receita || 0,
    'Despesas (R$)': item.despesa || 0,
    'Lucro (R$)': item.lucro || 0
  }));

  try {
    const workbook = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
    const wsDetails = XLSX.utils.json_to_sheet(breakdownData);

    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Resumo');
    XLSX.utils.book_append_sheet(workbook, wsDetails, 'Detalhamento');

    XLSX.writeFile(workbook, `Historico_Financeiro_Ell_Patron_${new Date().toISOString().split('T')[0]}.xlsx`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao exportar histórico Excel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Helper to add Luxury Gold Header to PDF
 */
const addPDFHeader = (doc, title, subtitle = '') => {
  // Dark Background bar
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 30, 'F');

  // Gold accent bar
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 30, 210, 2, 'F');

  // Title text
  doc.setTextColor(255, 215, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ELL PATRON - GESTÃO FINANCEIRA', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.text(title.toUpperCase(), 14, 23);

  if (subtitle) {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(subtitle, 150, 23);
  }
};

/**
 * Helper to add PDF Footer
 */
const addPDFFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Ell Patron Financial System • Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      14,
      290
    );
    doc.text(`Página ${i} de ${pageCount}`, 185, 290);
  }
};

/**
 * Export Financial History to PDF
 */
export const exportHistoricoPDF = (summary, data = [], period = 'Mensal') => {
  try {
    const doc = new jsPDF();
    addPDFHeader(doc, 'Relatório de Histórico Financeiro', `Período: ${period}`);

    // Summary Box
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Consolidado', 14, 42);

    const summaryRows = [
      ['Receita Total:', formatCurrency(summary.totalRevenue || 0)],
      ['Despesas / Capital Investido:', formatCurrency(summary.totalExpenses || 0)],
      ['Lucro Líquido:', formatCurrency(summary.totalProfit || 0)]
    ];

    autoTable(doc, {
      startY: 46,
      body: summaryRows,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [50, 50, 50], cellWidth: 70 },
        1: { fontStyle: 'bold', textColor: [184, 134, 11] }
      }
    });

    // Detailed Table
    const lastY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 70;
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento por Período', 14, lastY);

    const tableBody = data.map(item => [
      item.label || item.month || item.week || item.day || '-',
      formatCurrency(item.receita || 0),
      formatCurrency(item.despesa || 0),
      formatCurrency(item.lucro || 0)
    ]);

    autoTable(doc, {
      startY: lastY + 4,
      head: [['Período', 'Receita', 'Despesas / Investido', 'Lucro Líquido']],
      body: tableBody.length > 0 ? tableBody : [['Nenhum registro encontrado', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 215, 0], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 248, 248] }
    });

    addPDFFooter(doc);
    doc.save(`Historico_Financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao gerar PDF de histórico:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export Contracts Table to PDF
 */
export const exportContractsPDF = (contracts = []) => {
  try {
    const doc = new jsPDF('landscape');
    
    // Landscape header bar
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, 297, 26, 'F');
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 26, 297, 2, 'F');

    doc.setTextColor(255, 215, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('ELL PATRON - RELATÓRIO DE CONTRATOS', 14, 14);

    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de Contratos: ${contracts.length}`, 14, 21);

    const tableRows = contracts.map(c => [
      c.protocol_number || '-',
      c.client_name || '-',
      formatCPF(c.client_cpf || ''),
      formatDate(c.loan_date),
      formatDate(c.due_date),
      formatCurrency(c.principal || 0),
      `${c.installments_count || 1}x ${formatCurrency(c.monthly_installment || 0)}`,
      formatCurrency(c.total_amount || 0),
      c.status === 'open' ? 'Em aberto' : c.status === 'paid' ? 'Pago' : c.status === 'overdue' ? 'Em atraso' : 'Cancelado'
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['Protocolo', 'Cliente', 'CPF', 'Empréstimo', 'Vencimento', 'Principal', 'Parcelas', 'Total', 'Status']],
      body: tableRows.length > 0 ? tableRows : [['Nenhum contrato encontrado', '-', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 215, 0], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Ell Patron Financial System • Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 200);
      doc.text(`Página ${i} de ${pageCount}`, 265, 200);
    }

    doc.save(`Contratos_Ell_Patron_${new Date().toISOString().split('T')[0]}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao gerar PDF de contratos:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export Individual Contract (Formal Agreement Document) to PDF
 */
export const exportSingleContractPDF = (contract) => {
  try {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 28, 210, 2, 'F');

    doc.setTextColor(255, 215, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ELL PATRON - INSTRUMENTO PARTICULAR DE MÚTUO FINANCEIRO', 14, 13);
    
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(`PROTOCOLO: ${contract.protocol_number || 'PN-0000'}`, 14, 22);

    let y = 38;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('1. DADOS DAS PARTES', 14, y);
    
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`CREDOR: ELL PATRON GESTÃO FINANCEIRA`, 14, y);
    y += 5;
    doc.text(`DEVEDOR(A): ${contract.client_name || '-'}`, 14, y);
    y += 5;
    doc.text(`CPF: ${formatCPF(contract.client_cpf || '')}`, 14, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('2. CONDIÇÕES DO EMPRÉSTIMO', 14, y);

    const conditionsData = [
      ['Valor Principal Emprestado:', formatCurrency(contract.principal || 0)],
      ['Data de Emissão / Concessão:', formatDate(contract.loan_date)],
      ['Data de Vencimento:', formatDate(contract.due_date)],
      ['Número de Parcelas:', `${contract.installments_count || 1} parcela(s)`],
      ['Valor de Cada Parcela:', formatCurrency(contract.monthly_installment || 0)],
      ['Taxa de Juros Anual:', `${contract.interest_rate_year || 15}% a.a.`],
      ['Taxa de Juros Mensal:', `${contract.interest_rate_month || 1.25}% a.m.`],
      ['Multa por Atraso:', `${contract.late_fee_percentage || 10}% sobre o saldo devedor`],
      ['Juros de Mora Diários:', `${contract.daily_late_interest_percentage || 1}% ao dia`],
      ['VALOR TOTAL A PAGAR:', formatCurrency(contract.total_amount || 0)]
    ];

    autoTable(doc, {
      startY: y + 2,
      body: conditionsData,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90, fillColor: [245, 245, 245] },
        1: { fontStyle: 'bold', textColor: [20, 20, 20] }
      }
    });

    y = doc.lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('3. CLÁUSULAS CONTRATUAIS', 14, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const clauses = [
      'CLÁUSULA PRIMEIRA: Pelo presente instrumento, o CREDOR concede ao DEVEDOR o empréstimo acima discriminado.',
      'CLÁUSULA SEGUNDA: O DEVEDOR se compromete a adimplir as parcelas rigorosamente nas datas acordadas neste instrumento.',
      'CLÁUSULA TERCEIRA: O não pagamento na data de vencimento sujeitará o DEVEDOR à multa moratória e juros diários estipulados.',
      'CLÁUSULA QUARTA: O atraso superior a 60 (sessenta) dias ensejará a imediata inclusão nos cadastros de inadimplência e Lista Negra.',
      'CLÁUSULA QUINTA: As partes elegem o foro da Comarca do CREDOR para dirimir eventuais dúvidas oriundas deste contrato.'
    ];

    clauses.forEach(clause => {
      const splitText = doc.splitTextToSize(clause, 180);
      doc.text(splitText, 14, y);
      y += splitText.length * 3.5 + 1.5;
    });

    // Signature boxes
    y += 10;
    doc.setDrawColor(100, 100, 100);
    doc.line(20, y + 15, 90, y + 15);
    doc.line(120, y + 15, 190, y + 15);

    doc.setFontSize(8);
    doc.text('ELL PATRON GESTÃO', 35, y + 20);
    doc.text(contract.client_name || 'DEVEDOR(A)', 135, y + 20);

    addPDFFooter(doc);
    doc.save(`Contrato_${contract.protocol_number || 'Ell_Patron'}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao gerar PDF do contrato:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export Savings / Deposits Ledger to PDF (Standard A4 Portrait)
 */
export const exportSavingsLedgerPDF = (totals = {}, transactions = [], filterInfo = {}) => {
  try {
    const doc = new jsPDF('portrait'); // Standard A4 (210 x 297 mm)

    addPDFHeader(doc, 'Relatório Consolidado de Aportes & Carteira', filterInfo.periodLabel || 'Extrato Geral');

    // 1. Summary Box
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Financeiro da Carteira', 14, 38);

    const summaryData = [
      [
        { content: 'Saldo Global:\n' + formatCurrency(totals.currentBalance || 0), styles: { fontStyle: 'bold', textColor: [180, 130, 10], fillColor: [254, 252, 232] } },
        { content: 'Total Aportado:\n+' + formatCurrency(totals.deposits || 0), styles: { fontStyle: 'bold', textColor: [16, 185, 129], fillColor: [240, 253, 244] } },
        { content: 'Total Resgatado:\n-' + formatCurrency(totals.withdrawals || 0), styles: { fontStyle: 'bold', textColor: [239, 68, 68], fillColor: [254, 242, 242] } },
        { content: 'Rendimentos:\n+' + formatCurrency(totals.interest || 0), styles: { fontStyle: 'bold', textColor: [59, 130, 246], fillColor: [239, 246, 255] } }
      ]
    ];

    autoTable(doc, {
      startY: 42,
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 3, halign: 'center', valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 }
      }
    });

    // 2. Table of Transactions
    const startY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(`Detalhamento das Movimentações (${transactions.length} registros)`, 14, startY);

    const tableRows = transactions.map(t => {
      const isDep = t.type === 'deposit';
      const isWith = t.type === 'withdrawal';
      const isInt = t.type === 'interest';
      const typeLabel = isDep ? 'ENTRADA' : isWith ? 'SAÍDA' : isInt ? 'RENDIMENTO' : 'AJUSTE';
      const sinal = isDep ? '+' : isWith ? '-' : '+';
      const amtStr = `${sinal}${formatCurrency(t.amount)}`;

      return [
        `${t.client_name || '-'}\nCPF: ${formatCPF(t.client_cpf || '')}`,
        formatDate(t.transaction_date || t.created_at),
        typeLabel,
        (t.payment_method || 'PIX').toUpperCase(),
        t.notes || (Number(t.interest_rate_month) > 0 ? `Taxa: ${t.interest_rate_month}% a.m.` : '—'),
        amtStr
      ];
    });

    autoTable(doc, {
      startY: startY + 3,
      head: [['Cliente / CPF', 'Data', 'Tipo', 'Forma', 'Observações / Taxa', 'Valor']],
      body: tableRows.length > 0 ? tableRows : [['Nenhum registro encontrado', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 215, 0], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 46 },
        1: { cellWidth: 20 },
        2: { cellWidth: 24 },
        3: { cellWidth: 18 },
        4: { cellWidth: 44 },
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const raw = String(data.cell.raw || '');
          if (raw.startsWith('+')) {
            data.cell.styles.textColor = [16, 185, 129];
          } else if (raw.startsWith('-')) {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    addPDFFooter(doc);
    doc.save(`Extrato_Aportes_Ell_Patron_${new Date().toISOString().split('T')[0]}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao gerar PDF de aportes:', error);
    return { success: false, error: error.message };
  }
};

