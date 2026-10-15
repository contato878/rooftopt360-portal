import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { HouseLandEvent, Ticket, Companion, PaymentMethod } from '../types';
import { getEvents, getTickets, notifyListeners, registerDoorSale } from '../services/eventService';
import { playClickBeep, playSuccessBeep, playErrorBeep } from '../utils/audioFeedback';
import { db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { downloadTicketImage } from '../utils/ticketCardGenerator';
import { exportDoorSalesToCSV } from '../utils/exportUtils';

interface PortariaPageProps {
  onBackToPortal?: () => void;
  onBackToAdmin?: () => void;
}

interface ValidationModalData {
  type: 'success' | 'already_used' | 'invalid';
  title: string;
  message: string;
  ticket?: Ticket;
  companion?: Companion;
  timestamp: string;
  matchedCode: string;
}

export const PortariaPage: React.FC<PortariaPageProps> = ({
  onBackToPortal,
  onBackToAdmin
}) => {
  const [events, setEvents] = useState<HouseLandEvent[]>(getEvents());
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [tickets, setTickets] = useState<Ticket[]>(getTickets());

  // Navegação entre Modos da Portaria
  const [portariaMode, setPortariaMode] = useState<'scanner' | 'pos' | 'cashier'>('scanner');

  // Estado da Câmera
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const [hasTorchSupport, setHasTorchSupport] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Validação & Modais do Scanner
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);
  const [validationModal, setValidationModal] = useState<ValidationModalData | null>(null);
  const [autoDismissCountdown, setAutoDismissCountdown] = useState<number>(3);
  const [manualInput, setManualInput] = useState<string>('');
  const [recentScans, setRecentScans] = useState<Array<{
    name: string;
    type: string;
    time: string;
    status: 'success' | 'already_used' | 'invalid';
  }>>([]);

  // Estado do Módulo de Venda na Porta (PDV Balcão)
  const [posEventId, setPosEventId] = useState<string>('');
  const [posSector, setPosSector] = useState<'pista' | 'camarote'>('pista');
  const [posQuantity, setPosQuantity] = useState<number>(1);
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>('cash');
  const [posAutoCheckIn, setPosAutoCheckIn] = useState<boolean>(true);
  const [posCustomerName, setPosCustomerName] = useState<string>('');
  const [posCustomerCpf, setPosCustomerCpf] = useState<string>('');
  const [posCustomerWhatsapp, setPosCustomerWhatsapp] = useState<string>('');
  const [posCustomerEmail, setPosCustomerEmail] = useState<string>('');
  const [posCompanions, setPosCompanions] = useState<Array<{ name: string; cpf: string; whatsapp: string }>>([
    { name: '', cpf: '', whatsapp: '' },
    { name: '', cpf: '', whatsapp: '' },
    { name: '', cpf: '', whatsapp: '' }
  ]);
  const [posError, setPosError] = useState<string | null>(null);
  const [isSubmittingPos, setIsSubmittingPos] = useState<boolean>(false);
  const [completedSaleTicket, setCompletedSaleTicket] = useState<Ticket | null>(null);
  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number } | null>(null);

  // Recarrega eventos e ingressos
  const refreshData = useCallback(() => {
    setEvents(getEvents());
    setTickets(getTickets());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Estatísticas da edição selecionada
  const activeEventTickets = tickets.filter(t => 
    selectedEventId === 'all' ? true : t.eventId === selectedEventId
  );

  // Contabilização de todas as entradas possíveis (titulares + acompanhantes)
  let totalIssuedEntries = 0;
  let totalUsedEntries = 0;

  activeEventTickets.forEach(t => {
    // Titular
    totalIssuedEntries += 1;
    if (t.status === 'used') totalUsedEntries += 1;

    // Acompanhantes
    if (t.companions && t.companions.length > 0) {
      t.companions.forEach(c => {
        totalIssuedEntries += 1;
        if (c.status === 'used') totalUsedEntries += 1;
      });
    }
  });

  const percentOccupancy = totalIssuedEntries > 0 
    ? Math.round((totalUsedEntries / totalIssuedEntries) * 100) 
    : 0;

  // Função central de validação do código
  const validateCode = useCallback((rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const allCurrentTickets = getTickets();
    const cleanCpf = code.replace(/\D/g, '');
    const nowIso = new Date().toISOString();

    // Busca o ingresso no evento selecionado (ou em todos caso 'all')
    const foundTicket = allCurrentTickets.find(t => {
      if (selectedEventId !== 'all' && t.eventId !== selectedEventId) {
        return false;
      }

      // Titular
      if (
        t.id.toLowerCase() === code.toLowerCase() ||
        t.qrCodeData === code ||
        (code.includes(t.id) && !code.includes(`${t.id}-C`)) ||
        (cleanCpf.length === 11 && t.cpf.replace(/\D/g, '') === cleanCpf)
      ) {
        return true;
      }

      // Acompanhantes
      if (t.companions && t.companions.length > 0) {
        const comp = t.companions.find(c =>
          (c.ticketId && (c.ticketId.toLowerCase() === code.toLowerCase() || code.includes(c.ticketId))) ||
          (c.qrCodeData && c.qrCodeData === code) ||
          (cleanCpf.length === 11 && (c.cpf || '').replace(/\D/g, '') === cleanCpf)
        );
        if (comp) return true;
      }

      return false;
    });

    // 1. Ingresso não encontrado
    if (!foundTicket) {
      playErrorBeep();
      setValidationModal({
        type: 'invalid',
        title: 'INGRESSO NÃO ENCONTRADO',
        message: 'Código de QR Code ou CPF não localizado na lista de ingressos válidos desta edição.',
        timestamp: nowIso,
        matchedCode: code
      });
      setRecentScans(prev => [{
        name: `Código ${code.slice(0, 14)}...`,
        type: 'Inválido',
        time: new Date().toLocaleTimeString('pt-BR'),
        status: 'invalid'
      }, ...prev.slice(0, 9)]);
      return;
    }

    // 2. Verifica se o código bate com um Acompanhante específico
    const targetCompanion = foundTicket.companions?.find(c =>
      (c.ticketId && (c.ticketId.toLowerCase() === code.toLowerCase() || code.includes(c.ticketId))) ||
      (c.qrCodeData && c.qrCodeData === code) ||
      (cleanCpf.length === 11 && (c.cpf || '').replace(/\D/g, '') === cleanCpf)
    );

    if (targetCompanion) {
      if (targetCompanion.status === 'used') {
        playErrorBeep();
        const formattedTime = targetCompanion.usedAt 
          ? new Date(targetCompanion.usedAt).toLocaleTimeString('pt-BR') 
          : 'horário anterior';

        setValidationModal({
          type: 'already_used',
          title: 'ATENÇÃO: INGRESSO JÁ UTILIZADO',
          message: `Este ingresso de ACOMPANHANTE (${targetCompanion.name}) já realizou check-in às ${formattedTime}! Acesso duplicado negado.`,
          ticket: foundTicket,
          companion: targetCompanion,
          timestamp: nowIso,
          matchedCode: code
        });
        setRecentScans(prev => [{
          name: targetCompanion.name,
          type: `Acompanhante • ${foundTicket.type}`,
          time: new Date().toLocaleTimeString('pt-BR'),
          status: 'already_used'
        }, ...prev.slice(0, 9)]);
        return;
      }

      // Check-in de Acompanhante Válido!
      targetCompanion.status = 'used';
      targetCompanion.usedAt = nowIso;

      const updatedTickets = allCurrentTickets.map(t => t.id === foundTicket.id ? foundTicket : t);
      localStorage.setItem('hl360_tickets_v2', JSON.stringify(updatedTickets));
      setTickets(updatedTickets);
      notifyListeners();

      try {
        setDoc(doc(db, 'tickets', foundTicket.id), foundTicket, { merge: true }).catch(() => {});
      } catch {}

      playSuccessBeep();
      setValidationModal({
        type: 'success',
        title: 'ACESSO AUTORIZADO',
        message: 'Entrada individual de acompanhante validada com sucesso!',
        ticket: foundTicket,
        companion: targetCompanion,
        timestamp: nowIso,
        matchedCode: code
      });
      setRecentScans(prev => [{
        name: targetCompanion.name,
        type: `Acompanhante • ${foundTicket.type}`,
        time: new Date().toLocaleTimeString('pt-BR'),
        status: 'success'
      }, ...prev.slice(0, 9)]);
      return;
    }

    // 3. Se for o Titular
    if (foundTicket.status === 'used') {
      playErrorBeep();
      const formattedTime = foundTicket.usedAt 
        ? new Date(foundTicket.usedAt).toLocaleTimeString('pt-BR') 
        : 'horário anterior';

      setValidationModal({
        type: 'already_used',
        title: 'ATENÇÃO: INGRESSO JÁ UTILIZADO',
        message: `O ingresso do TITULAR (${foundTicket.name}) já deu entrada às ${formattedTime}! Por segurança, não é permitido reuso.`,
        ticket: foundTicket,
        timestamp: nowIso,
        matchedCode: code
      });
      setRecentScans(prev => [{
        name: foundTicket.name,
        type: `Titular • ${foundTicket.type}`,
        time: new Date().toLocaleTimeString('pt-BR'),
        status: 'already_used'
      }, ...prev.slice(0, 9)]);
      return;
    }

    // Check-in de Titular Válido!
    foundTicket.status = 'used';
    foundTicket.usedAt = nowIso;
    foundTicket.checkedInBy = 'Portaria • House Land Rock Chopp';

    const updatedTickets = allCurrentTickets.map(t => t.id === foundTicket.id ? foundTicket : t);
    localStorage.setItem('hl360_tickets_v2', JSON.stringify(updatedTickets));
    setTickets(updatedTickets);
    notifyListeners();

    try {
      setDoc(doc(db, 'tickets', foundTicket.id), foundTicket, { merge: true }).catch(() => {});
    } catch {}

    playSuccessBeep();
    setValidationModal({
      type: 'success',
      title: 'ACESSO AUTORIZADO',
      message: 'Ingresso de titular validado com sucesso! Seja bem-vindo ao House Land Rock Chopp.',
      ticket: foundTicket,
      timestamp: nowIso,
      matchedCode: code
    });
    setRecentScans(prev => [{
      name: foundTicket.name,
      type: `Titular • ${foundTicket.type}`,
      time: new Date().toLocaleTimeString('pt-BR'),
      status: 'success'
    }, ...prev.slice(0, 9)]);
  }, [selectedEventId]);

  // Temporizador de fechamento automático do modal de sucesso
  useEffect(() => {
    let timer: any;
    if (validationModal && validationModal.type === 'success') {
      setAutoDismissCountdown(3);
      timer = setInterval(() => {
        setAutoDismissCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setValidationModal(null);
            setIsProcessingScan(false);
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [validationModal]);

  const handleDismissModal = () => {
    playClickBeep();
    setValidationModal(null);
    setIsProcessingScan(false);
  };

  // Inicialização e controle do stream da Câmera
  const stopCameraStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setTorchActive(false);
    setHasTorchSupport(false);
  }, []);

  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Seu navegador não oferece suporte à captura de câmera WebRTC.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Verifica suporte à lanterna (torch)
      const track = stream.getVideoTracks()[0];
      if (track && (track.getCapabilities as any)) {
        const capabilities = (track.getCapabilities as any)();
        if (capabilities && capabilities.torch) {
          setHasTorchSupport(true);
        }
      }
    } catch (err: any) {
      console.warn('Erro ao acessar câmera:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.');
      } else {
        setCameraError('Não foi possível iniciar o leitor de vídeo. Verifique se outra aba está usando a câmera.');
      }
    }
  }, [facingMode, stopCameraStream]);

  // Alterna lanterna
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !torchActive;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchActive(nextState);
    } catch (err) {
      console.error('Falha ao alternar lanterna:', err);
    }
  };

  // Loop contínuo de decodificação QR Code via jsQR
  useEffect(() => {
    if (!isCameraActive || portariaMode !== 'scanner') {
      stopCameraStream();
      return;
    }

    startCameraStream();

    let isScanning = true;

    const scanFrame = () => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        video && 
        canvas && 
        video.readyState === video.HAVE_ENOUGH_DATA && 
        !isProcessingScan
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (qrCode && qrCode.data) {
            const scannedData = qrCode.data.trim();
            const now = Date.now();

            // Evita re-trigger instantâneo do mesmo QR dentro de 2.5s se já exibido
            const lastScan = lastScannedCodeRef.current;
            const isDuplicateRecent = lastScan && lastScan.code === scannedData && (now - lastScan.time < 2500);

            if (!isDuplicateRecent) {
              lastScannedCodeRef.current = { code: scannedData, time: now };
              setIsProcessingScan(true);
              validateCode(scannedData);
            }
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanning = false;
      stopCameraStream();
    };
  }, [isCameraActive, facingMode, isProcessingScan, startCameraStream, stopCameraStream, validateCode, portariaMode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    playClickBeep();
    setIsProcessingScan(true);
    validateCode(manualInput.trim());
    setManualInput('');
  };

  const maskCpf = (cpf?: string) => {
    if (!cpf) return '***.***.***-**';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
    }
    return cpf;
  };

  const formatCpf = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.slice(0, 11);
    return clean
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.slice(0, 11);
    if (clean.length <= 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return clean.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  // Evento selecionado para venda na porta (PDV)
  const targetEventId = posEventId || (selectedEventId !== 'all' ? selectedEventId : (events[0]?.id || ''));
  const activeEventForSale = events.find(e => e.id === targetEventId) || events[0];

  const pistaPrice = activeEventForSale?.ticketPrices?.pista ?? 50;
  const camarotePrice = activeEventForSale?.ticketPrices?.camarote ?? 120;
  const isCamaroteAvailable = activeEventForSale?.hasCamarote !== false;

  const currentUnitPrice = posSector === 'camarote' && isCamaroteAvailable ? camarotePrice : pistaPrice;
  const currentTotalAmount = posQuantity * currentUnitPrice;

  // Submissão da Venda na Porta (PDV)
  const handlePosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosError(null);

    if (!activeEventForSale) {
      setPosError('Nenhum evento selecionado para venda.');
      return;
    }

    if (!posCustomerName.trim()) {
      setPosError('Informe o nome completo do titular.');
      return;
    }

    const cleanCpf = posCustomerCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setPosError('CPF do titular inválido (necessário 11 dígitos).');
      return;
    }

    const cleanPhone = posCustomerWhatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setPosError('WhatsApp do titular inválido (com DDD).');
      return;
    }

    // Validação dos acompanhantes
    const companionList: Array<{ name: string; cpf: string; whatsapp: string }> = [];
    if (posQuantity > 1) {
      for (let i = 0; i < posQuantity - 1; i++) {
        const comp = posCompanions[i];
        if (!comp || !comp.name.trim()) {
          setPosError(`Informe o nome do Acompanhante ${i + 1}.`);
          return;
        }
        const compCleanCpf = (comp.cpf || '').replace(/\D/g, '');
        if (compCleanCpf.length !== 11) {
          setPosError(`CPF do Acompanhante ${i + 1} inválido (necessário 11 dígitos).`);
          return;
        }
        const compCleanPhone = (comp.whatsapp || '').replace(/\D/g, '');
        if (compCleanPhone.length < 10) {
          setPosError(`WhatsApp do Acompanhante ${i + 1} é obrigatório e inválido (informe com DDD, ex: (21) 99999-9999).`);
          return;
        }
        companionList.push({
          name: comp.name.trim(),
          cpf: comp.cpf.trim(),
          whatsapp: comp.whatsapp.trim()
        });
      }
    }

    setIsSubmittingPos(true);
    try {
      const newTicket = await registerDoorSale({
        eventId: activeEventForSale.id,
        sector: posSector === 'camarote' && isCamaroteAvailable ? 'Camarote Chopp Open' : 'Pista Premium',
        quantity: posQuantity,
        unitPrice: currentUnitPrice,
        totalAmount: currentTotalAmount,
        paymentMethod: posPaymentMethod,
        customerName: posCustomerName.trim(),
        customerCpf: posCustomerCpf.trim(),
        customerWhatsapp: posCustomerWhatsapp.trim(),
        customerEmail: posCustomerEmail.trim() || undefined,
        companions: companionList,
        autoCheckIn: posAutoCheckIn
      });

      playSuccessBeep();
      refreshData();
      setCompletedSaleTicket(newTicket);
    } catch (err: any) {
      console.error('Erro ao registrar venda na porta:', err);
      setPosError(err.message || 'Erro ao processar venda presencial.');
      playErrorBeep();
    } finally {
      setIsSubmittingPos(false);
    }
  };

  // Limpa formulário para uma nova venda
  const handleNewSale = () => {
    playClickBeep();
    setCompletedSaleTicket(null);
    setPosCustomerName('');
    setPosCustomerCpf('');
    setPosCustomerWhatsapp('');
    setPosCustomerEmail('');
    setPosQuantity(1);
    setPosCompanions([
      { name: '', cpf: '', whatsapp: '' },
      { name: '', cpf: '', whatsapp: '' },
      { name: '', cpf: '', whatsapp: '' }
    ]);
    setPosError(null);
  };

  // Download do ingresso da venda presencial
  const handleDownloadPosTicket = async () => {
    if (!completedSaleTicket || !activeEventForSale) return;
    setDownloadingTicketId('pos_all');
    try {
      // Baixar Titular
      await downloadTicketImage({
        eventTitle: activeEventForSale.title,
        eventDate: activeEventForSale.date,
        eventDoors: activeEventForSale.doorsOpen,
        sector: completedSaleTicket.type,
        locator: completedSaleTicket.id,
        participantName: completedSaleTicket.name,
        participantType: 'Titular',
        participantCpf: completedSaleTicket.cpf,
        qrCodeDataUrl: completedSaleTicket.qrCodeImage
      });

      // Baixar Acompanhantes se houver
      if (completedSaleTicket.companions && completedSaleTicket.companions.length > 0) {
        for (let i = 0; i < completedSaleTicket.companions.length; i++) {
          await new Promise(r => setTimeout(r, 400));
          const comp = completedSaleTicket.companions[i];
          await downloadTicketImage({
            eventTitle: activeEventForSale.title,
            eventDate: activeEventForSale.date,
            eventDoors: activeEventForSale.doorsOpen,
            sector: completedSaleTicket.type,
            locator: comp.ticketId || `${completedSaleTicket.id}-C${i + 1}`,
            participantName: comp.name || `Acompanhante ${i + 1}`,
            participantType: `Acompanhante ${i + 1}`,
            participantCpf: comp.cpf,
            qrCodeDataUrl: comp.qrCodeImage || completedSaleTicket.qrCodeImage
          });
        }
      }
    } catch (err) {
      console.error('Erro ao baixar ingressos da venda presencial:', err);
    } finally {
      setDownloadingTicketId(null);
    }
  };

  // Estatísticas do Caixa da Porta
  const doorSales = tickets.filter(t => 
    t.salesChannel === 'door_pos' && 
    (selectedEventId === 'all' ? true : t.eventId === selectedEventId)
  );

  const totalDoorRevenue = doorSales.reduce((acc, t) => 
    acc + (t.paidAmount !== undefined ? t.paidAmount : ((t.price || 0) * (t.ticketQuantity || 1))), 0
  );

  const totalDoorTicketsCount = doorSales.reduce((acc, t) => 
    acc + (t.ticketQuantity || (t.companions ? t.companions.length + 1 : 1)), 0
  );

  const totalDoorCheckins = doorSales.reduce((acc, t) => {
    let count = t.status === 'used' ? 1 : 0;
    if (t.companions) {
      count += t.companions.filter(c => c.status === 'used').length;
    }
    return acc + count;
  }, 0);

  const getRevenueByMethod = (method: PaymentMethod) => {
    const list = doorSales.filter(t => t.paymentMethod === method);
    const total = list.reduce((acc, t) => 
      acc + (t.paidAmount !== undefined ? t.paidAmount : ((t.price || 0) * (t.ticketQuantity || 1))), 0
    );
    const count = list.reduce((acc, t) => 
      acc + (t.ticketQuantity || (t.companions ? t.companions.length + 1 : 1)), 0
    );
    return { total, count, transactions: list.length };
  };

  const cashStats = getRevenueByMethod('cash');
  const debitStats = getRevenueByMethod('debit_card');
  const creditStats = getRevenueByMethod('credit_card');
  const pixStats = getRevenueByMethod('pix_pos');

  const handleExportDoorCashierCSV = () => {
    playClickBeep();
    const currentTitle = selectedEventId === 'all' 
      ? 'todas_edicoes' 
      : (events.find(e => e.id === selectedEventId)?.title || 'evento');
    exportDoorSalesToCSV(currentTitle, doorSales);
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-stone-100 flex flex-col font-sans select-none">
      
      {/* Canvas invisível para processamento da imagem */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Superior da Portaria */}
      <header className="bg-[#0f1016] border-b border-amber-500/20 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-amber-500 animate-pulse">⚡</span>
            <div>
              <h1 className="text-sm sm:text-base font-display font-bold uppercase tracking-wider text-amber-500">
                PORTARIA • HOUSE LAND ROCK CHOPP
              </h1>
              <p className="text-[10px] text-stone-400 font-mono">
                Validação Óptica de Ingressos & Acompanhantes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBackToAdmin && (
              <button
                type="button"
                onClick={onBackToAdmin}
                className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold transition-colors"
              >
                ← Painel
              </button>
            )}
            {onBackToPortal && (
              <button
                type="button"
                onClick={onBackToPortal}
                className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold transition-colors"
              >
                Portal
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barra de Seleção de Evento & Estatísticas em Tempo Real */}
      <div className="bg-[#0b0c10] border-b border-stone-800/80 px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-amber-500 font-bold">Edição:</span>
            <select
              value={selectedEventId}
              onChange={e => {
                setSelectedEventId(e.target.value);
                if (e.target.value !== 'all') {
                  setPosEventId(e.target.value);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-stone-950 border border-amber-500/30 text-xs text-stone-200 font-medium outline-none focus:border-amber-500 font-sans"
            >
              <option value="all">⚡ Todos os Eventos Cadastrados</option>
              {events.map(evt => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.date})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">Entradas:</span>
              <strong className="text-emerald-400 font-bold">{totalUsedEntries}</strong>
              <span className="text-stone-600">/</span>
              <span className="text-stone-300">{totalIssuedEntries}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">Presença:</span>
              <strong className="text-amber-400 font-bold">{percentOccupancy}%</strong>
            </div>
          </div>

        </div>
      </div>

      {/* Seletor de Modo da Portaria: Scanner vs Venda na Porta (PDV) vs Caixa */}
      <div className="bg-[#0e1017] border-b border-stone-800 px-4 py-2 sticky top-[57px] z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playClickBeep();
                setPortariaMode('scanner');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                portariaMode === 'scanner'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
              }`}
            >
              <span>📷</span> Scanner de Entrada
            </button>

            <button
              type="button"
              onClick={() => {
                playClickBeep();
                setPortariaMode('pos');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                portariaMode === 'pos'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
              }`}
            >
              <span>🎟️</span> Venda na Porta (PDV)
            </button>

            <button
              type="button"
              onClick={() => {
                playClickBeep();
                setPortariaMode('cashier');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                portariaMode === 'cashier'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
              }`}
            >
              <span>📊</span> Caixa da Porta ({doorSales.length})
            </button>
          </div>

          {portariaMode === 'pos' && (
            <span className="hidden sm:inline-block text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              ⚡ Emissão Expressa Balcão
            </span>
          )}
          {portariaMode === 'cashier' && (
            <span className="hidden sm:inline-block text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold">
              Total Porta: R$ {totalDoorRevenue.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo Principal Dinâmico por Modo */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col gap-4">
        
        {/* ======================================================== */}
        {/* MODO 1: SCANNER DE ENTRADA (CÂMERA & VALIDAÇÃO ÓPTICA)   */}
        {/* ======================================================== */}
        {portariaMode === 'scanner' && (
          <>
            {/* Container do Visor da Câmera */}
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-black border-2 border-amber-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center justify-center">
              
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-stone-500 p-6 text-center space-y-2">
                  <span className="text-4xl">📷</span>
                  <span className="text-xs font-mono">Câmera desativada pelo operador</span>
                </div>
              )}

              {/* Feedback de Erro da Câmera */}
              {cameraError && isCameraActive && (
                <div className="absolute inset-0 bg-stone-950/95 flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
                  <span className="text-4xl text-rose-500">⚠️</span>
                  <p className="text-xs text-rose-300 max-w-xs">{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCameraStream}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}

              {/* Mira Visual do Scanner com Cantoneiras Estilizadas */}
              {isCameraActive && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                  <div className="w-64 h-64 sm:w-72 sm:h-72 relative rounded-2xl border border-amber-500/30 shadow-[0_0_50px_rgba(217,119,6,0.15)] flex items-center justify-center">
                    
                    {/* Cantoneiras Âmbar de Alta Visibilidade */}
                    <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-xl"></span>
                    <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-xl"></span>
                    <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-xl"></span>
                    <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-xl"></span>

                    {/* Linha Laser Animada */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#F59E0B] animate-pulse"></div>

                    <div className="absolute bottom-2 text-[10px] font-mono tracking-widest uppercase text-amber-400/80 bg-black/60 px-2 py-0.5 rounded">
                      Aponte o QR Code aqui
                    </div>
                  </div>
                </div>
              )}

              {/* Barra Flutuante de Controle da Câmera (Sobre o visor) */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-auto">
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickBeep();
                      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-stone-700 text-stone-200 text-xs font-semibold hover:border-amber-500 flex items-center gap-1.5 shadow"
                    title="Alternar Câmera Traseira / Frontal"
                  >
                    <span>🔄</span>
                    <span className="text-[11px] font-mono">{facingMode === 'environment' ? 'Traseira' : 'Frontal'}</span>
                  </button>

                  {hasTorchSupport && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-semibold flex items-center gap-1.5 shadow ${
                        torchActive
                          ? 'bg-amber-500 text-black border-amber-400 font-bold'
                          : 'bg-black/75 text-stone-200 border-stone-700 hover:border-amber-500'
                      }`}
                      title="Lanterna / Flash"
                    >
                      <span>💡</span>
                      <span className="text-[11px] font-mono">{torchActive ? 'Ligada' : 'Flash'}</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playClickBeep();
                    setIsCameraActive(prev => !prev);
                  }}
                  className={`px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-semibold flex items-center gap-1.5 shadow ${
                    isCameraActive
                      ? 'bg-black/75 text-stone-300 border-stone-700 hover:text-white'
                      : 'bg-emerald-600 text-white border-emerald-500 font-bold'
                  }`}
                >
                  <span>{isCameraActive ? '⏹️ Pausar' : '▶️ Ativar Câmera'}</span>
                </button>
              </div>

            </div>

            {/* Formulário de Fallback Manual (Digitar CPF ou Código) */}
            <form onSubmit={handleManualSubmit} className="glass-panel p-3.5 rounded-2xl border border-stone-800 space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                Entrada Manual de Contingência:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite o CPF (000.000.000-00) ou Localizador..."
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Validar
                </button>
              </div>
            </form>

            {/* Histórico Recente de Entradas da Sessão */}
            <div className="glass-panel p-4 rounded-2xl border border-stone-800/80 space-y-2.5">
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-stone-400">
                  📋 Últimas Leituras da Sessão
                </span>
                <span className="text-[10px] text-stone-500 font-mono">Em tempo real</span>
              </div>

              {recentScans.length === 0 ? (
                <p className="text-xs text-stone-500 italic py-3 text-center">
                  Aguardando primeiras leituras do scanner...
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {recentScans.map((scan, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                        scan.status === 'success'
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                          : scan.status === 'already_used'
                          ? 'bg-rose-950/25 border-rose-500/30 text-rose-200'
                          : 'bg-stone-900 border-stone-800 text-stone-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {scan.status === 'success' ? '✓' : scan.status === 'already_used' ? '⚠️' : '✕'}
                        </span>
                        <div>
                          <span className="font-semibold block">{scan.name}</span>
                          <span className="text-[10px] text-stone-400 font-mono">{scan.type}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400">{scan.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* MODO 2: VENDA NA PORTA (PDV BALCÃO DE BILHETERIA)       */}
        {/* ======================================================== */}
        {portariaMode === 'pos' && (
          <div className="space-y-4">
            {completedSaleTicket ? (
              /* Comprovante & Conclusão de Venda */
              <div className="glass-panel p-6 rounded-3xl border-2 border-emerald-500/50 bg-[#0a140e] shadow-[0_10px_40px_rgba(16,185,129,0.15)] text-center space-y-5 animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center text-3xl mx-auto">
                  ✓
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    Venda Registrada com Sucesso
                  </span>
                  <h2 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-wider text-stone-100 mt-2">
                    Ingresso Emitido na Porta
                  </h2>
                  <p className="text-xs text-stone-400 mt-1">
                    Operação concluída pela Bilheteria de Balcão
                  </p>
                </div>

                {/* Resumo do Voucher Emitido */}
                <div className="p-4 rounded-2xl bg-black/60 border border-stone-800 text-left space-y-2 text-xs font-mono">
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Localizador:</span>
                    <strong className="text-amber-400 font-sans text-sm">{completedSaleTicket.id}</strong>
                  </div>
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Titular:</span>
                    <div className="text-right">
                      <strong className="text-stone-100 font-sans block">{completedSaleTicket.name}</strong>
                      {completedSaleTicket.whatsapp && (
                        <a
                          href={`https://wa.me/55${completedSaleTicket.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${completedSaleTicket.name}! Seu ingresso presencial para o ${activeEventForSale?.title || 'House Land Rock Chopp'} foi emitido com sucesso na portaria. Localizador: ${completedSaleTicket.id}. Bom festival!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono inline-flex items-center gap-1"
                          title="Enviar comprovante via WhatsApp"
                        >
                          📱 {completedSaleTicket.whatsapp} (💬 Enviar)
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Setor:</span>
                    <span className="text-emerald-400 font-bold">{completedSaleTicket.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Qtd Ingressos:</span>
                    <span className="text-stone-200">{completedSaleTicket.ticketQuantity || 1} ingresso(s)</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Total Cobrado:</span>
                    <strong className="text-emerald-400 font-sans text-sm">
                      R$ {(completedSaleTicket.paidAmount || 0).toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Forma de Pagto:</span>
                    <span className="text-stone-300">
                      {completedSaleTicket.paymentMethod === 'cash' && '💵 Dinheiro'}
                      {completedSaleTicket.paymentMethod === 'debit_card' && '💳 Cartão de Débito'}
                      {completedSaleTicket.paymentMethod === 'credit_card' && '💳 Cartão de Crédito'}
                      {completedSaleTicket.paymentMethod === 'pix_pos' && '📱 PIX Maquininha'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-stone-400">Status Check-in:</span>
                    <strong className={completedSaleTicket.status === 'used' ? 'text-emerald-400' : 'text-amber-400'}>
                      {completedSaleTicket.status === 'used' ? '⚡ Entrada Liberada (Catraca)' : '⏳ Aguardando Entrada'}
                    </strong>
                  </div>

                  {completedSaleTicket.companions && completedSaleTicket.companions.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-stone-800 space-y-1.5">
                      <span className="text-[11px] text-stone-400 block mb-1">Acompanhantes Vinculados & WhatsApp:</span>
                      {completedSaleTicket.companions.map((comp, i) => (
                        <div key={i} className="text-[11px] text-stone-300 flex flex-wrap items-center justify-between gap-1 py-1.5 px-2.5 rounded-xl bg-stone-900/80 border border-stone-800">
                          <div>
                            <strong className="text-stone-200 block sm:inline">{comp.name}</strong>
                            {comp.whatsapp && (
                              <span className="text-stone-400 text-[10px] font-mono sm:ml-2">📱 {comp.whatsapp}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-stone-500 font-mono text-[10px]">{comp.ticketId || `${completedSaleTicket.id}-C${i + 1}`}</span>
                            {comp.whatsapp && (
                              <a
                                href={`https://wa.me/55${comp.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${comp.name}! Seu ingresso de Acompanhante para o ${activeEventForSale?.title || 'House Land Rock Chopp'} foi emitido com sucesso na portaria. Localizador: ${comp.ticketId || completedSaleTicket.id}. Bom festival!`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-mono transition-colors"
                                title="Enviar comprovante via WhatsApp"
                              >
                                💬 Enviar
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ações da Venda Concluída */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadPosTicket}
                    disabled={downloadingTicketId !== null}
                    className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>{downloadingTicketId ? '⏳ Gerando Vouchers...' : '📥 Baixar Ingressos / Comprovante (PNG)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNewSale}
                    className="w-full py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    ➕ Realizar Nova Venda na Porta
                  </button>
                </div>
              </div>
            ) : (
              /* Formulário Rápido de Venda na Porta */
              <form onSubmit={handlePosSubmit} className="glass-panel p-5 sm:p-6 rounded-3xl border border-stone-800 space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                      <span>🎟️</span> Bilheteria de Balcão & Portaria
                    </h2>
                    <span className="text-[10px] font-mono text-stone-400 uppercase bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                      {activeEventForSale?.title}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    Emissão rápida de ingressos no balcão com total sincronizado em tempo real.
                  </p>
                </div>

                {/* 1. Seletor de Setor */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                    1. Setor do Ingresso:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playClickBeep();
                        setPosSector('pista');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        posSector === 'pista'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-xs font-bold font-sans">Pista Premium</span>
                      <span className="text-sm font-mono font-bold text-amber-400 mt-1">
                        R$ {pistaPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </button>

                    {isCamaroteAvailable && (
                      <button
                        type="button"
                        onClick={() => {
                          playClickBeep();
                          setPosSector('camarote');
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          posSector === 'camarote'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        <span className="text-xs font-bold font-sans">Camarote Chopp Open</span>
                        <span className="text-sm font-mono font-bold text-amber-400 mt-1">
                          R$ {camarotePrice.toFixed(2).replace('.', ',')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Quantidade de Ingressos (1 a 4) com Total em Tempo Real */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold">
                      2. Quantidade de Ingressos:
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Total: R$ {currentTotalAmount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          playClickBeep();
                          setPosQuantity(num);
                        }}
                        className={`py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                          posQuantity === num
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                            : 'bg-stone-950 hover:bg-stone-900 border border-stone-800 text-stone-300'
                        }`}
                      >
                        {num}x ({num === 1 ? 'Individual' : `${num} Ingressos`})
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Forma de Pagamento */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                    3. Forma de Pagamento Recebida:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'cash', label: 'Dinheiro', icon: '💵' },
                      { id: 'debit_card', label: 'Débito', icon: '💳' },
                      { id: 'credit_card', label: 'Crédito', icon: '💳' },
                      { id: 'pix_pos', label: 'PIX Maquininha', icon: '📱' }
                    ].map(pm => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => {
                          playClickBeep();
                          setPosPaymentMethod(pm.id as PaymentMethod);
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          posPaymentMethod === pm.id
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold shadow-sm'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        <span className="text-lg">{pm.icon}</span>
                        <span className="text-[11px]">{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Dados do Titular */}
                <div className="space-y-2.5 pt-2 border-t border-stone-800/80">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                    4. Dados do Titular Responsável:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-stone-400 font-mono block mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nome do cliente"
                        value={posCustomerName}
                        onChange={e => setPosCustomerName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-stone-400 font-mono block mb-1">CPF *</label>
                      <input
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        value={posCustomerCpf}
                        onChange={e => setPosCustomerCpf(formatCpf(e.target.value))}
                        className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-stone-400 font-mono block mb-1">WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        placeholder="(00) 00000-0000"
                        value={posCustomerWhatsapp}
                        onChange={e => setPosCustomerWhatsapp(formatPhone(e.target.value))}
                        className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-stone-400 font-mono block mb-1">
                        E-mail <span className="text-stone-500 font-sans">(opcional na porta para agilizar)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="cliente@email.com"
                        value={posCustomerEmail}
                        onChange={e => setPosCustomerEmail(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Acompanhantes (quando Qtd > 1) */}
                {posQuantity > 1 && (
                  <div className="space-y-2.5 pt-2 border-t border-stone-800/80">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                      5. Acompanhantes da Compra ({posQuantity - 1}):
                    </label>

                    {Array.from({ length: posQuantity - 1 }).map((_, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                        <span className="text-[10px] font-mono uppercase text-amber-500 font-bold block">
                          Acompanhante {idx + 1}:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            required
                            placeholder={`Nome Completo`}
                            value={posCompanions[idx]?.name || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setPosCompanions(prev => {
                                const copy = [...prev];
                                copy[idx] = { ...(copy[idx] || { name: '', cpf: '', whatsapp: '' }), name: val };
                                return copy;
                              });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                          />
                          <input
                            type="text"
                            required
                            placeholder="CPF (000.000.000-00)"
                            value={posCompanions[idx]?.cpf || ''}
                            onChange={e => {
                              const val = formatCpf(e.target.value);
                              setPosCompanions(prev => {
                                const copy = [...prev];
                                copy[idx] = { ...(copy[idx] || { name: '', cpf: '', whatsapp: '' }), cpf: val };
                                return copy;
                              });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                          />
                          <input
                            type="tel"
                            required
                            placeholder="WhatsApp ((21) 99999-9999)"
                            value={posCompanions[idx]?.whatsapp || ''}
                            onChange={e => {
                              const val = formatPhone(e.target.value);
                              setPosCompanions(prev => {
                                const copy = [...prev];
                                copy[idx] = { ...(copy[idx] || { name: '', cpf: '', whatsapp: '' }), whatsapp: val };
                                return copy;
                              });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 6. Check-in Automático (Entrada Imediata) */}
                <div className="pt-2 border-t border-stone-800/80">
                  <label className="flex items-start gap-3 p-3 rounded-2xl bg-stone-950/80 border border-stone-800 hover:border-amber-500/50 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={posAutoCheckIn}
                      onChange={e => setPosAutoCheckIn(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-stone-900 border-stone-700"
                    />
                    <div>
                      <strong className="text-xs text-stone-200 block font-sans">
                        ⚡ Entrada Imediata (Check-in automático)
                      </strong>
                      <span className="text-[11px] text-stone-400 block font-sans leading-tight mt-0.5">
                        Marca a entrada como utilizada no momento da emissão, liberando a catraca sem necessidade de re-escanear.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Alerta de Erro */}
                {posError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500 text-rose-300 text-xs flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{posError}</span>
                  </div>
                )}

                {/* Botão de Conclusão da Venda */}
                <button
                  type="submit"
                  disabled={isSubmittingPos}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {isSubmittingPos ? (
                    <span>Emitindo Venda...</span>
                  ) : (
                    <span>Concluir Venda & Emitir • R$ {currentTotalAmount.toFixed(2).replace('.', ',')}</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODO 3: RESUMO DO CAIXA DA PORTA (FECHAMENTO DE CAIXA)   */}
        {/* ======================================================== */}
        {portariaMode === 'cashier' && (
          <div className="space-y-4">
            
            {/* Header do Caixa & Botão de Exportação CSV */}
            <div className="glass-panel p-5 rounded-3xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                  <span>📊</span> Fechamento do Caixa da Porta
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Consolidado de arrecadação presencial em tempo real
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportDoorCashierCSV}
                disabled={doorSales.length === 0}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
              >
                <span>📥</span> Exportar Relatório do Caixa (CSV)
              </button>
            </div>

            {/* Painel de Métricas Gerais da Portaria */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="glass-panel p-3.5 rounded-2xl border border-stone-800">
                <span className="text-[10px] font-mono uppercase text-stone-400 block">Total Arrecadado</span>
                <strong className="text-base sm:text-lg font-mono font-bold text-emerald-400 block mt-1">
                  R$ {totalDoorRevenue.toFixed(2).replace('.', ',')}
                </strong>
                <span className="text-[10px] text-stone-500 font-mono">Bilheteria Porta</span>
              </div>

              <div className="glass-panel p-3.5 rounded-2xl border border-stone-800">
                <span className="text-[10px] font-mono uppercase text-stone-400 block">Ingressos Vendidos</span>
                <strong className="text-base sm:text-lg font-mono font-bold text-amber-400 block mt-1">
                  {totalDoorTicketsCount}
                </strong>
                <span className="text-[10px] text-stone-500 font-mono">unidades emitidas</span>
              </div>

              <div className="glass-panel p-3.5 rounded-2xl border border-stone-800">
                <span className="text-[10px] font-mono uppercase text-stone-400 block">Entradas Liberadas</span>
                <strong className="text-base sm:text-lg font-mono font-bold text-sky-400 block mt-1">
                  {totalDoorCheckins}
                </strong>
                <span className="text-[10px] text-stone-500 font-mono">check-ins na porta</span>
              </div>

              <div className="glass-panel p-3.5 rounded-2xl border border-stone-800">
                <span className="text-[10px] font-mono uppercase text-stone-400 block">Transações</span>
                <strong className="text-base sm:text-lg font-mono font-bold text-stone-200 block mt-1">
                  {doorSales.length}
                </strong>
                <span className="text-[10px] text-stone-500 font-mono">operações no caixa</span>
              </div>
            </div>

            {/* Quebra por Forma de Pagamento */}
            <div className="glass-panel p-4 rounded-2xl border border-stone-800 space-y-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
                💳 Detalhamento por Forma de Pagamento:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💵</span>
                    <div>
                      <strong className="text-xs text-stone-200 block">Dinheiro em Espécie</strong>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {cashStats.transactions} vendas ({cashStats.count} ingressos)
                      </span>
                    </div>
                  </div>
                  <strong className="text-xs font-mono font-bold text-emerald-400">
                    R$ {cashStats.total.toFixed(2).replace('.', ',')}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💳</span>
                    <div>
                      <strong className="text-xs text-stone-200 block">Cartão de Débito</strong>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {debitStats.transactions} vendas ({debitStats.count} ingressos)
                      </span>
                    </div>
                  </div>
                  <strong className="text-xs font-mono font-bold text-sky-400">
                    R$ {debitStats.total.toFixed(2).replace('.', ',')}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💳</span>
                    <div>
                      <strong className="text-xs text-stone-200 block">Cartão de Crédito</strong>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {creditStats.transactions} vendas ({creditStats.count} ingressos)
                      </span>
                    </div>
                  </div>
                  <strong className="text-xs font-mono font-bold text-amber-400">
                    R$ {creditStats.total.toFixed(2).replace('.', ',')}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📱</span>
                    <div>
                      <strong className="text-xs text-stone-200 block">PIX Maquininha</strong>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {pixStats.transactions} vendas ({pixStats.count} ingressos)
                      </span>
                    </div>
                  </div>
                  <strong className="text-xs font-mono font-bold text-teal-400">
                    R$ {pixStats.total.toFixed(2).replace('.', ',')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Listagem de Vendas Registradas */}
            <div className="glass-panel p-4 rounded-2xl border border-stone-800 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold">
                  📋 Histórico de Vendas da Porta
                </span>
                <span className="text-[10px] text-stone-500 font-mono">{doorSales.length} registro(s)</span>
              </div>

              {doorSales.length === 0 ? (
                <p className="text-xs text-stone-500 italic py-4 text-center">
                  Nenhuma venda presencial registrada até o momento nesta edição.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {doorSales.map(sale => (
                    <div
                      key={sale.id}
                      className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-stone-100 font-sans">{sale.name}</strong>
                          <span className="text-[10px] font-mono bg-stone-900 px-1.5 py-0.5 rounded text-amber-400">
                            {sale.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 flex items-center gap-2">
                          <span>{sale.type}</span>
                          <span>•</span>
                          <span>{sale.ticketQuantity || 1} ingresso(s)</span>
                          <span>•</span>
                          <span className="font-mono text-stone-500">
                            {new Date(sale.createdAt).toLocaleTimeString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-900">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          R$ {(sale.paidAmount || (sale.price || 0) * (sale.ticketQuantity || 1)).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] font-mono bg-stone-900 px-2 py-1 rounded text-stone-300">
                          {sale.paymentMethod === 'cash' && 'Dinheiro'}
                          {sale.paymentMethod === 'debit_card' && 'Débito'}
                          {sale.paymentMethod === 'credit_card' && 'Crédito'}
                          {sale.paymentMethod === 'pix_pos' && 'PIX'}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          sale.status === 'used' ? 'bg-emerald-950/60 text-emerald-400' : 'bg-stone-900 text-stone-400'
                        }`}>
                          {sale.status === 'used' ? '✓ Entrou' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL DE RESULTADO DA LEITURA (FEEDBACK INSTANTÂNEO)      */}
      {/* ======================================================== */}
      {validationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 text-center space-y-5 border shadow-2xl ${
            validationModal.type === 'success'
              ? 'bg-[#0a1811] border-emerald-500 shadow-emerald-500/20'
              : 'bg-[#180a0d] border-rose-500 shadow-rose-500/20'
          }`}>
            
            {/* Ícone Gigante */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto border ${
              validationModal.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 animate-bounce'
                : 'bg-rose-500/20 border-rose-400 text-rose-400'
            }`}>
              {validationModal.type === 'success' ? '✓' : '⚠️'}
            </div>

            {/* Título Principal */}
            <div>
              <h2 className={`text-2xl font-display font-bold uppercase tracking-wider ${
                validationModal.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {validationModal.title}
              </h2>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                {validationModal.message}
              </p>
            </div>

            {/* Detalhes do Ingresso (se encontrado) */}
            {validationModal.ticket && (
              <div className="p-4 rounded-2xl bg-black/60 border border-stone-800 text-left space-y-2 text-xs font-mono">
                
                <div className="flex justify-between border-b border-stone-800 pb-1.5">
                  <span className="text-stone-400">Participante:</span>
                  <strong className="text-stone-100 font-sans">
                    {validationModal.companion 
                      ? validationModal.companion.name 
                      : validationModal.ticket.name}
                  </strong>
                </div>

                <div className="flex justify-between border-b border-stone-800 pb-1.5">
                  <span className="text-stone-400">Tipo:</span>
                  <span className="text-amber-400 font-bold">
                    {validationModal.companion 
                      ? `Acompanhante (${validationModal.ticket.name})` 
                      : 'Titular do Ingresso'}
                  </span>
                </div>

                <div className="flex justify-between border-b border-stone-800 pb-1.5">
                  <span className="text-stone-400">Setor:</span>
                  <span className="text-stone-200">
                    {validationModal.ticket.type}
                  </span>
                </div>

                <div className="flex justify-between border-b border-stone-800 pb-1.5">
                  <span className="text-stone-400">CPF:</span>
                  <span className="text-stone-300">
                    {maskCpf(validationModal.companion ? validationModal.companion.cpf : validationModal.ticket.cpf)}
                  </span>
                </div>

                <div className="flex justify-between pt-0.5">
                  <span className="text-stone-400">Localizador:</span>
                  <strong className="text-amber-400">
                    {validationModal.companion?.ticketId || validationModal.ticket.id}
                  </strong>
                </div>

              </div>
            )}

            {/* Botão de Ação / Retorno */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDismissModal}
                className={`w-full py-4 rounded-2xl text-xs uppercase tracking-wider font-bold shadow-lg transition-all cursor-pointer ${
                  validationModal.type === 'success'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {validationModal.type === 'success'
                  ? `Próximo (Continuando em ${autoDismissCountdown}s...)`
                  : 'Voltar ao Scanner'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
