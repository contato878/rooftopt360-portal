export interface TicketVoucherData {
  eventTitle: string;
  eventDate: string;
  eventDoors?: string;
  sector: string;
  locator: string;
  participantName: string;
  participantType: 'Titular' | 'Acompanhante' | string;
  participantCpf?: string;
  qrCodeDataUrl: string;
}

/**
 * Desenha e dispara o download de um voucher gráfico elegante de ingresso (PNG)
 * utilizando a Canvas API nativa do navegador, sem dependências externas.
 */
export async function downloadTicketImage(data: TicketVoucherData): Promise<void> {
  const width = 600;
  const height = 920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 1. Fundo Escuro Premium
  ctx.fillStyle = '#0D0D11';
  ctx.fillRect(0, 0, width, height);

  // Gradiente sutil de iluminação
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, 'rgba(217, 119, 6, 0.08)');
  bgGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  bgGrad.addColorStop(1, 'rgba(217, 119, 6, 0.05)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Borda Dourada / Âmbar Estilizada
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Cantoneiras decorativas
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 6;
  const cornerSize = 24;
  // Superior Esquerdo
  ctx.beginPath();
  ctx.moveTo(16, 16 + cornerSize);
  ctx.lineTo(16, 16);
  ctx.lineTo(16 + cornerSize, 16);
  ctx.stroke();
  // Superior Direito
  ctx.beginPath();
  ctx.moveTo(width - 16 - cornerSize, 16);
  ctx.lineTo(width - 16, 16);
  ctx.lineTo(width - 16, 16 + cornerSize);
  ctx.stroke();
  // Inferior Esquerdo
  ctx.beginPath();
  ctx.moveTo(16, height - 16 - cornerSize);
  ctx.lineTo(16, height - 16);
  ctx.lineTo(16 + cornerSize, height - 16);
  ctx.stroke();
  // Inferior Direito
  ctx.beginPath();
  ctx.moveTo(width - 16 - cornerSize, height - 16);
  ctx.lineTo(width - 16, height - 16);
  ctx.lineTo(width - 16, height - 16 - cornerSize);
  ctx.stroke();

  // 3. Header Branding
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
  ctx.fillText('⚡ HOUSE LAND ROCK CHOPP ⚡', width / 2, 60);

  ctx.fillStyle = '#D97706';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('ROOFTOP • ROCK & CHOPP EXPERIENCE', width / 2, 82);

  // Linha divisória fina
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 100);
  ctx.lineTo(width - 40, 100);
  ctx.stroke();

  // 4. Informações do Evento
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px "Trebuchet MS", sans-serif';

  // Trunca título caso exceda largura
  let title = data.eventTitle.toUpperCase();
  if (ctx.measureText(title).width > 500) {
    while (ctx.measureText(title + '...').width > 500 && title.length > 0) {
      title = title.slice(0, -1);
    }
    title = title + '...';
  }
  ctx.fillText(title, width / 2, 135);

  ctx.fillStyle = '#A8A29E';
  ctx.font = '13px sans-serif';
  const eventDetails = data.eventDoors 
    ? `${data.eventDate} • Portas: ${data.eventDoors}`
    : data.eventDate;
  ctx.fillText(eventDetails, width / 2, 160);

  // 5. Badge de Setor
  const badgeWidth = 240;
  const badgeHeight = 32;
  const badgeX = (width - badgeWidth) / 2;
  const badgeY = 180;

  ctx.fillStyle = '#1C1917';
  ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`SETOR: ${data.sector.toUpperCase()}`, width / 2, badgeY + 21);

  // 6. Bloco Central do QR Code
  const qrBoxSize = 280;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = 240;

  // Caixa Branca para contraste perfeito de leitura
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
  ctx.lineWidth = 3;
  ctx.strokeRect(qrBoxX - 2, qrBoxY - 2, qrBoxSize + 4, qrBoxSize + 4);

  // Carrega e desenha a imagem do QR Code
  if (data.qrCodeDataUrl) {
    const qrImg = new Image();
    await new Promise<void>((resolve, reject) => {
      qrImg.onload = () => resolve();
      qrImg.onerror = () => reject(new Error('Erro ao carregar imagem do QR Code'));
      qrImg.src = data.qrCodeDataUrl;
    });

    const innerPadding = 16;
    ctx.drawImage(
      qrImg,
      qrBoxX + innerPadding,
      qrBoxY + innerPadding,
      qrBoxSize - (innerPadding * 2),
      qrBoxSize - (innerPadding * 2)
    );
  }

  // 7. Localizador Oficial
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(data.locator, width / 2, 570);

  ctx.fillStyle = '#78716C';
  ctx.font = '10px monospace';
  ctx.fillText('LOCALIZADOR OFICIAL DE ENTRADA', width / 2, 590);

  // Linha divisória
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 615);
  ctx.lineTo(width - 50, 615);
  ctx.stroke();

  // 8. Dados do Participante
  ctx.fillStyle = '#E7E5E4';
  ctx.font = 'bold 22px "Trebuchet MS", sans-serif';

  let pName = data.participantName;
  if (ctx.measureText(pName).width > 480) {
    while (ctx.measureText(pName + '...').width > 480 && pName.length > 0) {
      pName = pName.slice(0, -1);
    }
    pName = pName + '...';
  }
  ctx.fillText(pName, width / 2, 655);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`• ${data.participantType.toUpperCase()} •`, width / 2, 680);

  if (data.participantCpf) {
    ctx.fillStyle = '#A8A29E';
    ctx.font = '13px monospace';
    ctx.fillText(`DOCUMENTO CPF: ${data.participantCpf}`, width / 2, 705);
  }

  // 9. Instruções da Portaria
  ctx.fillStyle = '#1C1917';
  ctx.fillRect(40, 740, width - 80, 75);
  ctx.strokeStyle = '#44403C';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 740, width - 80, 75);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('VALIDAÇÃO DIGITAL OBRIGATÓRIA', width / 2, 765);

  ctx.fillStyle = '#A8A29E';
  ctx.font = '11px sans-serif';
  ctx.fillText('Apresente este voucher na portaria do evento para leitura do QR Code.', width / 2, 785);
  ctx.fillText('Permitida entrada única. Proibida reprodução ou repasse.', width / 2, 802);

  // 10. Rodapé de Segurança
  ctx.fillStyle = '#57534E';
  ctx.font = '10px monospace';
  ctx.fillText(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')} • HOUSE LAND ROCK CHOPP OFICIAL`, width / 2, 875);

  // 11. Disparo do Download
  const cleanName = data.participantName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const cleanLoc = data.locator
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');

  const filename = `ingresso_houseland_rock_chopp_${cleanLoc}_${cleanName}.png`;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve();
      }, 100);
    }, 'image/png');
  });
}
