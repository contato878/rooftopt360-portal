import { HouseLandEvent, Lead, Ticket } from '../types';

function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value).trim();
  return `"${str.replace(/"/g, '""')}"`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('pt-BR');
  } catch {
    return dateStr;
  }
}

function isTicket(item: Lead | Ticket): item is Ticket {
  return 'qrCodeData' in item || 'type' in item;
}

/**
 * Exporta participantes (Ingressos e Leads da Fila VIP) para arquivo CSV oficial
 * compatível com Microsoft Excel e Google Sheets com codificação UTF-8 BOM.
 */
export function exportParticipantsToCSV(
  event?: HouseLandEvent | null,
  participants: (Lead | Ticket)[] = []
): void {
  const headers = [
    'Tipo Registro',
    'Nome',
    'CPF / Documento',
    'WhatsApp / Contato',
    'Setor',
    'Qtd Total Ingressos',
    'Status',
    'Titular Responsável',
    'Data do Registro'
  ];

  const rows: string[][] = [];

  participants.forEach(item => {
    const isTkt = isTicket(item);
    const dateFormatted = formatDate(item.createdAt);

    if (isTkt) {
      const ticket = item as Ticket;
      const totalQuantity = ticket.ticketQuantity || (ticket.companions && ticket.companions.length > 0 ? ticket.companions.length + 1 : 1);
      const statusLabel = ticket.status === 'valid'
        ? (ticket.type?.includes('Cortesia') ? 'Cortesia (Válido)' : 'Pago (Válido)')
        : 'Utilizado / Check-in';
      const sector = ticket.type || 'Pista Premium';

      // Linha do Titular
      rows.push([
        'Titular',
        ticket.name,
        ticket.cpf,
        ticket.whatsapp,
        sector,
        String(totalQuantity),
        statusLabel,
        'Próprio',
        dateFormatted
      ]);

      // Linhas dos Acompanhantes
      if (ticket.companions && ticket.companions.length > 0) {
        ticket.companions.forEach((comp, idx) => {
          rows.push([
            'Acompanhante',
            comp.name || `Acompanhante ${idx + 1}`,
            comp.cpf || 'Não informado',
            ticket.whatsapp,
            sector,
            '-',
            statusLabel,
            ticket.name,
            dateFormatted
          ]);
        });
      } else if (totalQuantity > 1) {
        // Se a quantidade for maior que 1 mas sem cadastro nominal prévio
        for (let i = 1; i < totalQuantity; i++) {
          rows.push([
            'Acompanhante',
            `Acompanhante ${i} (Pendente Identificação)`,
            'Não informado',
            ticket.whatsapp,
            sector,
            '-',
            statusLabel,
            ticket.name,
            dateFormatted
          ]);
        }
      }
    } else {
      const lead = item as Lead;
      const totalQuantity = lead.ticketQuantity || (lead.companions && lead.companions.length > 0 ? lead.companions.length + 1 : 1);
      const statusLabel = lead.status === 'approved'
        ? 'Fila VIP (Aprovado)'
        : lead.status === 'rejected'
        ? 'Fila VIP (Recusado)'
        : 'Fila VIP (Pendente)';
      const sector = lead.unitPrice && lead.unitPrice > 100 ? 'Camarote' : 'Pista / Fila VIP';

      // Linha do Titular Lead
      rows.push([
        'Titular (Fila VIP)',
        lead.name,
        lead.cpf,
        lead.whatsapp,
        sector,
        String(totalQuantity),
        statusLabel,
        'Próprio',
        dateFormatted
      ]);

      // Linhas dos Acompanhantes Lead
      if (lead.companions && lead.companions.length > 0) {
        lead.companions.forEach((comp, idx) => {
          rows.push([
            'Acompanhante (Fila VIP)',
            comp.name || `Acompanhante ${idx + 1}`,
            comp.cpf || 'Não informado',
            lead.whatsapp,
            sector,
            '-',
            statusLabel,
            lead.name,
            dateFormatted
          ]);
        });
      } else if (totalQuantity > 1) {
        for (let i = 1; i < totalQuantity; i++) {
          rows.push([
            'Acompanhante (Fila VIP)',
            `Acompanhante ${i} (Pendente Identificação)`,
            'Não informado',
            lead.whatsapp,
            sector,
            '-',
            statusLabel,
            lead.name,
            dateFormatted
          ]);
        }
      }
    }
  });

  // Constrói CSV com delimitador ';' e BOM UTF-8
  const headerLine = headers.map(escapeCsvCell).join(';');
  const dataLines = rows.map(r => r.map(escapeCsvCell).join(';'));
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');

  // Nome do arquivo seguro
  const rawTitle = event?.title || 'todas_edicoes';
  const cleanTitle = rawTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const today = new Date().toISOString().slice(0, 10);
  const filename = `houseland_rock_chopp_participantes_${cleanTitle}_${today}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta relatório de fechamento de caixa e vendas da bilheteria de porta (PDV)
 * para formato CSV compatível com Excel e Google Sheets.
 */
export function exportDoorSalesToCSV(
  eventTitle: string,
  doorTickets: Ticket[]
): void {
  const headers = [
    'ID Ingresso',
    'Evento',
    'Data/Hora Venda',
    'Setor',
    'Qtd Ingressos',
    'Forma de Pagamento',
    'Valor Total (R$)',
    'Status Check-in',
    'Horario Entrada',
    'Operador/Portaria',
    'Nome Titular',
    'CPF Titular',
    'WhatsApp',
    'E-mail',
    'Acompanhantes'
  ];

  const paymentLabels: Record<string, string> = {
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    pix_pos: 'PIX Maquininha',
    cash: 'Dinheiro'
  };

  const rows: string[][] = doorTickets.map(t => {
    const companionsInfo = (t.companions || [])
      .map(c => `${c.name} (${c.cpf || 'sem CPF'}${c.whatsapp ? ` - Zap: ${c.whatsapp}` : ''})`)
      .join('; ');

    const paymentMethodLabel = t.paymentMethod ? (paymentLabels[t.paymentMethod] || t.paymentMethod) : 'Não informado';
    const totalAmount = t.paidAmount !== undefined 
      ? t.paidAmount.toFixed(2).replace('.', ',') 
      : ((t.price || 0) * (t.ticketQuantity || 1)).toFixed(2).replace('.', ',');

    const checkInStatus = t.status === 'used' ? 'Entrada Imediata / Utilizado' : 'Aguardando Entrada';

    return [
      t.id,
      t.eventName || eventTitle,
      formatDate(t.createdAt),
      t.type || 'Pista Premium',
      String(t.ticketQuantity || (t.companions ? t.companions.length + 1 : 1)),
      paymentMethodLabel,
      totalAmount,
      checkInStatus,
      t.usedAt ? formatDate(t.usedAt) : '-',
      t.checkedInBy || '-',
      t.name,
      t.cpf,
      t.whatsapp,
      t.email || '-',
      companionsInfo || 'Nenhum'
    ];
  });

  // Constrói CSV com delimitador ';' e BOM UTF-8
  const headerLine = headers.map(escapeCsvCell).join(';');
  const dataLines = rows.map(r => r.map(escapeCsvCell).join(';'));
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');

  const cleanTitle = (eventTitle || 'geral')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const today = new Date().toISOString().slice(0, 10);
  const filename = `houseland_rock_chopp_caixa_portaria_${cleanTitle}_${today}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
