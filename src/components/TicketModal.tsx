import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { HouseLandEvent, Ticket, Companion, SiteSettings } from '../types';
import { 
  generateComplimentaryTicket, 
  registerPreCadastro, 
  getSiteSettings, 
  DEFAULT_RESERVATION_FLOW_SETTINGS,
  subscribeToEventStore 
} from '../services/eventService';
import { playClickBeep, playSuccessBeep } from '../utils/audioFeedback';
import { formatWhatsAppUrl } from '../utils/whatsappHelper';
import { downloadTicketImage } from '../utils/ticketCardGenerator';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: HouseLandEvent;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  event
}) => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(getSiteSettings());
  const reservationSettings = siteSettings.reservationFlowSettings || DEFAULT_RESERVATION_FLOW_SETTINGS;

  useEffect(() => {
    return subscribeToEventStore(() => {
      setSiteSettings(getSiteSettings());
    });
  }, []);

  const activeMode = event.activeTicketMode;
  const isCamaroteEnabled = event.hasCamarote === true && (event.ticketPrices?.camarote ?? 0) > 0;
  const unitPrice = event.ticketPrices?.pista ?? 50;

  // Etapa do Modal: 'selection' (Lotes e Quantidade), 'details' (Formulário/Cadastro) ou 'success'
  const [currentStep, setCurrentStep] = useState<'selection' | 'details' | 'success'>('selection');

  // Quantidade de Ingressos (1 a 4)
  const [ticketQuantity, setTicketQuantity] = useState<number>(1);
  const [selectedTicketType, setSelectedTicketType] = useState<'Pista Premium' | 'Camarote Chopp Open'>('Pista Premium');

  // Garante que se o camarote estiver desativado, o tipo permanece Pista Premium
  useEffect(() => {
    if (!isCamaroteEnabled && selectedTicketType !== 'Pista Premium') {
      setSelectedTicketType('Pista Premium');
    }
  }, [isCamaroteEnabled, selectedTicketType]);

  // Form State do Titular
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    cpf: '',
    email: ''
  });

  // Acompanhantes Dinâmicos
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States de Saída / Sucesso
  const [leadSuccessData, setLeadSuccessData] = useState<{
    leadId: string;
    totalValue: number;
    quantity: number;
  } | null>(null);

  const [issuedTicket, setIssuedTicket] = useState<Ticket | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadTitular = async () => {
    if (!issuedTicket) return;
    setDownloadingId('titular');
    try {
      await downloadTicketImage({
        eventTitle: event.title,
        eventDate: event.date,
        eventDoors: event.doorsOpen,
        sector: selectedTicketType || issuedTicket.type || 'Pista Premium',
        locator: issuedTicket.id,
        participantName: issuedTicket.name,
        participantType: 'Titular',
        participantCpf: issuedTicket.cpf,
        qrCodeDataUrl: issuedTicket.qrCodeImage
      });
    } catch (err) {
      console.error('Erro ao baixar voucher do titular:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCompanion = async (comp: Companion, idx: number) => {
    if (!issuedTicket) return;
    const compKey = `comp-${idx}`;
    setDownloadingId(compKey);
    try {
      const compLocator = comp.ticketId || `${issuedTicket.id}-C${idx + 1}`;
      const compQr = comp.qrCodeImage || issuedTicket.qrCodeImage;
      await downloadTicketImage({
        eventTitle: event.title,
        eventDate: event.date,
        eventDoors: event.doorsOpen,
        sector: selectedTicketType || issuedTicket.type || 'Pista Premium',
        locator: compLocator,
        participantName: comp.name || `Acompanhante ${idx + 1}`,
        participantType: `Acompanhante ${idx + 1}`,
        participantCpf: comp.cpf,
        qrCodeDataUrl: compQr
      });
    } catch (err) {
      console.error('Erro ao baixar voucher do acompanhante:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!issuedTicket) return;
    setDownloadingId('all');
    try {
      // 1. Download do Titular
      await downloadTicketImage({
        eventTitle: event.title,
        eventDate: event.date,
        eventDoors: event.doorsOpen,
        sector: selectedTicketType || issuedTicket.type || 'Pista Premium',
        locator: issuedTicket.id,
        participantName: issuedTicket.name,
        participantType: 'Titular',
        participantCpf: issuedTicket.cpf,
        qrCodeDataUrl: issuedTicket.qrCodeImage
      });

      // 2. Download dos Acompanhantes em sequência com pequeno delay
      if (issuedTicket.companions && issuedTicket.companions.length > 0) {
        for (let i = 0; i < issuedTicket.companions.length; i++) {
          await new Promise(r => setTimeout(r, 400));
          const comp = issuedTicket.companions[i];
          const compLocator = comp.ticketId || `${issuedTicket.id}-C${i + 1}`;
          const compQr = comp.qrCodeImage || issuedTicket.qrCodeImage;
          await downloadTicketImage({
            eventTitle: event.title,
            eventDate: event.date,
            eventDoors: event.doorsOpen,
            sector: selectedTicketType || issuedTicket.type || 'Pista Premium',
            locator: compLocator,
            participantName: comp.name || `Acompanhante ${i + 1}`,
            participantType: `Acompanhante ${i + 1}`,
            participantCpf: comp.cpf,
            qrCodeDataUrl: compQr
          });
        }
      }
    } catch (err) {
      console.error('Erro ao baixar todos os vouchers:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Validador de formato de e-mail
  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  // Sincroniza a lista de acompanhantes conforme a quantidade (Padrão 1, Máximo 4)
  useEffect(() => {
    const requiredCompanionsCount = Math.max(0, ticketQuantity - 1);
    setCompanions(prev => {
      if (ticketQuantity === 0) return [];
      if (prev.length === requiredCompanionsCount) return prev;
      if (prev.length < requiredCompanionsCount) {
        const added: Companion[] = Array.from({ length: requiredCompanionsCount - prev.length }).map(() => ({
          name: '',
          cpf: '',
          whatsapp: '',
          email: ''
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, requiredCompanionsCount);
    });
  }, [ticketQuantity]);

  if (!isOpen) return null;

  const currentUnitPrice = activeMode === 'direct_sale'
    ? (selectedTicketType === 'Pista Premium' || !isCamaroteEnabled
        ? (event.ticketPrices?.pista ?? 50)
        : (event.ticketPrices?.camarote ?? 120))
    : unitPrice;

  const totalExpectedValue = ticketQuantity * currentUnitPrice;

  const handleQuantityChange = (delta: number) => {
    playClickBeep();
    setTicketQuantity(prev => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > 4) return 4;
      return next;
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanTitularCpf = formData.cpf.replace(/\D/g, '');
    const cleanTitularPhone = formData.whatsapp.replace(/\D/g, '');

    // Validações do Titular
    if (!formData.name.trim()) {
      setErrorMsg('Por favor, informe o nome completo do titular.');
      return;
    }

    if (cleanTitularCpf.length !== 11) {
      setErrorMsg('Por favor, informe um CPF válido com 11 dígitos para o titular.');
      return;
    }

    if (cleanTitularPhone.length < 10 || cleanTitularPhone.length > 11) {
      setErrorMsg('Por favor, informe um WhatsApp válido com DDD para o titular.');
      return;
    }

    if (!formData.email.trim() || !isValidEmail(formData.email)) {
      setErrorMsg('Por favor, informe um e-mail válido para o titular (ex: seu.email@exemplo.com).');
      return;
    }

    // Validações dos Acompanhantes
    const usedPhones = new Set<string>([cleanTitularPhone]);
    const usedCpfs = new Set<string>([cleanTitularCpf]);

    for (let i = 0; i < companions.length; i++) {
      const comp = companions[i];
      const compNum = i + 1;
      const cleanCompCpf = (comp.cpf || '').replace(/\D/g, '');
      const cleanCompPhone = (comp.whatsapp || '').replace(/\D/g, '');

      if (!comp.name.trim()) {
        setErrorMsg(`Por favor, informe o nome completo do Acompanhante #${compNum}.`);
        return;
      }

      if (cleanCompCpf.length !== 11) {
        setErrorMsg(`Por favor, informe um CPF válido com 11 dígitos para o Acompanhante #${compNum}.`);
        return;
      }

      if (usedCpfs.has(cleanCompCpf)) {
        setErrorMsg(`O CPF do Acompanhante #${compNum} já foi informado nesta reserva. Cada participante deve ter seu próprio CPF.`);
        return;
      }
      usedCpfs.add(cleanCompCpf);

      if (cleanCompPhone.length < 10 || cleanCompPhone.length > 11) {
        setErrorMsg(`Por favor, informe um WhatsApp válido com DDD para o Acompanhante #${compNum}.`);
        return;
      }

      // Validação Anti-Duplicação de Contato
      if (cleanCompPhone === cleanTitularPhone) {
        setErrorMsg(`O WhatsApp do Acompanhante #${compNum} não pode ser igual ao do titular. Cada participante deve ter seu próprio WhatsApp informado.`);
        return;
      }

      if (usedPhones.has(cleanCompPhone)) {
        setErrorMsg('Cada participante deve ter seu próprio WhatsApp informado. Encontramos números de WhatsApp duplicados entre os acompanhantes.');
        return;
      }
      usedPhones.add(cleanCompPhone);

      // Validação de E-mail do acompanhante (se fornecido)
      if (comp.email && comp.email.trim() && !isValidEmail(comp.email)) {
        setErrorMsg(`O e-mail informado para o Acompanhante #${compNum} é inválido.`);
        return;
      }
    }

    setIsSubmitting(true);
    playClickBeep();

    try {
      if (activeMode === 'complimentary') {
        const ticket = await generateComplimentaryTicket({
          eventId: event.id,
          name: formData.name,
          whatsapp: formData.whatsapp,
          cpf: formData.cpf,
          email: formData.email,
          type: selectedTicketType || 'Cortesia VIP',
          batch: 'Cortesia Liberada',
          ticketQuantity,
          companions
        });
        setIssuedTicket(ticket);
        setCurrentStep('success');
        playSuccessBeep();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } else {
        const lead = registerPreCadastro({
          eventId: event.id,
          name: formData.name,
          whatsapp: formData.whatsapp,
          cpf: formData.cpf,
          email: formData.email,
          ticketQuantity,
          unitPrice: currentUnitPrice,
          totalExpectedValue,
          companions
        });
        setLeadSuccessData({
          leadId: lead.id,
          totalValue: totalExpectedValue,
          quantity: ticketQuantity
        });
        setCurrentStep('success');
        playSuccessBeep();
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    } catch {
      setErrorMsg('Ocorreu um erro ao processar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Montagem dinâmica da mensagem do WhatsApp usando helper inteligente
  const buildWhatsAppUrl = () => {
    const localizador = leadSuccessData?.leadId || issuedTicket?.id || 'HLRC-VIP';
    
    let text = reservationSettings.whatsappCustomMessage || 
      'Olá! Gostaria de confirmar a minha reserva da edição {evento} na House Land Rock Chopp. Localizador: {localizador}, Titular: {nome}, Quantidade: {quantidade} ingresso(s). Aguardo as instruções!';
    
    text = text
      .replace(/{nome}/g, formData.name || 'Convidado')
      .replace(/{localizador}/g, localizador)
      .replace(/{evento}/g, event.title)
      .replace(/{quantidade}/g, String(ticketQuantity));

    const targetPhone = reservationSettings.whatsappContactNumber || siteSettings.productionWhatsapp || siteSettings.contactWhatsapp || event.contactWhatsApp || '21997313305';
    return formatWhatsAppUrl(targetPhone, text);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-[92vh] sm:h-auto sm:max-h-[90vh] bg-[#121318] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
        
        {/* Header Fixo */}
        <div className="sticky top-0 z-10 bg-[#121318]/95 backdrop-blur-md px-5 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] font-mono text-amber-500 uppercase tracking-widest font-bold block mb-0.5">
              {activeMode === 'complimentary' ? '⚡ Resgate Gratuito' : '⚡ Fila de Reserva VIP'}
            </span>
            <h2 className="text-lg sm:text-2xl font-display font-bold uppercase text-stone-100">
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-900 border border-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Content Steps com Scroll Independente */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 overscroll-contain pb-8">
          {currentStep === 'selection' && (
            <div className="space-y-6">
              {/* Texto Instrutivo da Seleção (Configurável via CMS) */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                {reservationSettings.step1Description || 'Escolha a quantidade de ingressos para entrar na Fila de Reserva VIP e garantir acesso antecipado às melhores condições do festival.'}
              </div>

              {/* Setor Selection (apenas se camarote estiver habilitado para este evento) */}
              {isCamaroteEnabled && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Setor do Evento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        playClickBeep();
                        setSelectedTicketType('Pista Premium');
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        selectedTicketType === 'Pista Premium'
                          ? 'border-amber-500 bg-amber-500/15 text-stone-100'
                          : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">Pista Premium</span>
                      <span className="text-sm font-display font-bold text-amber-400 mt-1 block">
                        R$ {event.ticketPrices?.pista ?? 50},00
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playClickBeep();
                        setSelectedTicketType('Camarote Chopp Open');
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        selectedTicketType === 'Camarote Chopp Open'
                          ? 'border-amber-500 bg-amber-500/15 text-stone-100'
                          : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">Camarote Chopp Open</span>
                      <span className="text-sm font-display font-bold text-amber-400 mt-1 block">
                        R$ {event.ticketPrices?.camarote ?? 120},00
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="glass-panel p-5 rounded-2xl border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-200 block">Quantidade de Ingressos</span>
                  <span className="text-[11px] text-stone-400">Até 4 ingressos por CPF</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-700 text-amber-400 font-bold hover:bg-stone-800 flex items-center justify-center text-lg"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-lg font-display font-bold text-stone-100">
                    {ticketQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-700 text-amber-400 font-bold hover:bg-stone-800 flex items-center justify-center text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800/80 flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-stone-400">Valor Estimado</span>
                <span className="text-lg font-display font-bold text-amber-400">
                  {activeMode === 'complimentary' ? 'GRATUITO (CORTESIA)' : `R$ ${totalExpectedValue},00`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickBeep();
                  setCurrentStep('details');
                }}
                className="w-full btn-malt py-3.5 rounded-xl text-xs uppercase tracking-wider font-bold shadow-lg glow-amber cursor-pointer"
              >
                Continuar para Dados do Titular →
              </button>
            </div>
          )}

          {currentStep === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Aviso de Pagamento (Configurável via CMS) */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-amber-500/20 text-stone-300 text-xs leading-relaxed flex items-start gap-2.5">
                <span className="text-base text-amber-400">💡</span>
                <p className="whitespace-pre-line leading-relaxed">{reservationSettings.step2PaymentNotice || 'Aviso de Pagamento: O pagamento será solicitado via WhatsApp após a aprovação da reserva pela organização.'}</p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs">
                  ⚠️ {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                    Nome Completo do Titular *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Silveira"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                      WhatsApp com DDD *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="(11) 98765-4321"
                      value={formData.whatsapp}
                      onChange={e => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                      CPF do Titular *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={e => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                    E-mail do Titular *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ex: seu.email@exemplo.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Acompanhantes */}
                {companions.length > 0 && (
                  <div className="pt-2 space-y-4">
                    <div className="flex items-center justify-between pb-1 border-b border-stone-800">
                      <span className="text-xs font-mono uppercase text-amber-500 font-bold block">
                        Acompanhantes ({companions.length})
                      </span>
                      <span className="text-[11px] font-mono text-stone-500">
                        Identificação individual obrigatória
                      </span>
                    </div>

                    {companions.map((comp, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-amber-400 font-bold">
                            Acompanhante #{idx + 1}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-stone-400">
                            {selectedTicketType}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-stone-300 block mb-1">
                              Nome Completo *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Nome do Acompanhante"
                              value={comp.name}
                              onChange={e => {
                                const updated = [...companions];
                                updated[idx].name = e.target.value;
                                setCompanions(updated);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-[#121318] border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-stone-300 block mb-1">
                              CPF *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="000.000.000-00"
                              value={comp.cpf}
                              onChange={e => {
                                const updated = [...companions];
                                updated[idx].cpf = formatCpf(e.target.value);
                                setCompanions(updated);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-[#121318] border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-stone-300 block mb-1">
                              WhatsApp *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="(11) 98765-4321"
                              value={comp.whatsapp || ''}
                              onChange={e => {
                                const updated = [...companions];
                                updated[idx].whatsapp = formatPhone(e.target.value);
                                setCompanions(updated);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-[#121318] border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-stone-300 block mb-1">
                              E-mail
                            </label>
                            <input
                              type="email"
                              placeholder="ex: email@amigo.com"
                              value={comp.email || ''}
                              onChange={e => {
                                const updated = [...companions];
                                updated[idx].email = e.target.value;
                                setCompanions(updated);
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-[#121318] border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    playClickBeep();
                    setCurrentStep('selection');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200"
                >
                  ← Voltar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-malt flex-1 py-3.5 rounded-xl text-xs uppercase tracking-wider font-bold shadow-lg glow-amber cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Processando...' : (activeMode === 'complimentary' ? 'Emitir Cortesia VIP Grátis' : 'Confirmar Reserva na Fila VIP')}
                </button>
              </div>
            </form>
          )}

          {currentStep === 'success' && (
            <div className="text-center space-y-6 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto text-emerald-400">
                ✓
              </div>

              {/* Título de Confirmação (Configurável via CMS) */}
              <h3 className="text-2xl font-display font-bold uppercase text-emerald-400 tracking-wide">
                {reservationSettings.successTitle || 'RESERVA REGISTRADA COM SUCESSO!'}
              </h3>

              {/* Subtítulo Dinâmico (Configurável via CMS com tag {evento}) */}
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed whitespace-pre-line">
                {(reservationSettings.successSubtitle || 'Sua reserva para {evento} foi cadastrada na Fila VIP Oficial da produtora.')
                  .replace(/{evento}/g, event.title)}
              </p>

              {/* Detalhes do Registro / Ingressos Emitidos */}
              {issuedTicket ? (
                <div className="space-y-4 text-left">
                  {/* Botão Baixar Todos (se houver acompanhantes) */}
                  {issuedTicket.companions && issuedTicket.companions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={downloadingId !== null}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 text-xs uppercase tracking-wider font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>📥</span>
                      <span>
                        {downloadingId === 'all'
                          ? 'Gerando Vouchers...'
                          : `Baixar Todos os ${issuedTicket.companions.length + 1} Ingressos (PNG)`}
                      </span>
                    </button>
                  )}

                  {/* Card do Ingresso Titular */}
                  <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-[#0d0e12] space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-400">
                          Ingresso Titular
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-300">
                        {selectedTicketType || issuedTicket.type}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-1">
                      {issuedTicket.qrCodeImage && (
                        <div className="bg-white p-2 rounded-xl border border-stone-700 shrink-0 shadow-md">
                          <img
                            src={issuedTicket.qrCodeImage}
                            alt={`QR Code Titular - ${issuedTicket.name}`}
                            className="w-28 h-28 object-contain"
                          />
                        </div>
                      )}

                      <div className="flex-1 w-full text-center sm:text-left space-y-1.5 text-xs">
                        <div>
                          <span className="text-[10px] text-stone-400 block font-mono">PARTICIPANTE TITULAR</span>
                          <span className="font-bold text-stone-100 text-sm">{issuedTicket.name}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                          <div>
                            <span className="text-stone-500 block text-[10px]">LOCALIZADOR:</span>
                            <span className="font-bold text-amber-400">{issuedTicket.id}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">CPF:</span>
                            <span className="text-stone-300">{issuedTicket.cpf}</span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleDownloadTitular}
                            disabled={downloadingId !== null}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-500/40 text-amber-400 text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <span>📥</span>
                            <span>{downloadingId === 'titular' ? 'Gerando PNG...' : 'Baixar Ingresso (PNG)'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cards dos Ingressos dos Acompanhantes */}
                  {issuedTicket.companions && issuedTicket.companions.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-stone-400">
                          👥 Ingressos dos Acompanhantes ({issuedTicket.companions.length})
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">QR Codes Individuais</span>
                      </div>

                      {issuedTicket.companions.map((comp, idx) => {
                        const compLocator = comp.ticketId || `${issuedTicket.id}-C${idx + 1}`;
                        const isDownloadingCurrent = downloadingId === `comp-${idx}`;

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-stone-800/80 pb-2 text-xs">
                              <span className="font-mono text-amber-500 font-bold text-[11px]">
                                ACOMPANHANTE #{idx + 1}
                              </span>
                              <span className="font-mono text-stone-400 text-[11px]">
                                Localizador: <strong className="text-stone-200">{compLocator}</strong>
                              </span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                              {comp.qrCodeImage && (
                                <div className="bg-white p-2 rounded-xl border border-stone-700 shrink-0 shadow-md">
                                  <img
                                    src={comp.qrCodeImage}
                                    alt={`QR Code Acompanhante - ${comp.name}`}
                                    className="w-24 h-24 object-contain"
                                  />
                                </div>
                              )}

                              <div className="flex-1 w-full text-center sm:text-left space-y-1 text-xs">
                                <span className="font-bold text-stone-200 text-sm block">
                                  {comp.name || `Acompanhante ${idx + 1}`}
                                </span>
                                <p className="font-mono text-[11px] text-stone-400">
                                  CPF: {comp.cpf || 'Não informado'} • Tel: {comp.whatsapp || '-'}
                                </p>

                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadCompanion(comp, idx)}
                                    disabled={downloadingId !== null}
                                    className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    <span>📥</span>
                                    <span>{isDownloadingCurrent ? 'Gerando...' : 'Baixar Ingresso (PNG)'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Detalhes para Fila de Reserva (Lead) */
                <div className="glass-panel p-5 rounded-2xl border border-stone-800 text-left space-y-2 text-xs">
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Localizador Oficial:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {leadSuccessData?.leadId || 'HLRC-VIP'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Titular:</span>
                    <span className="font-bold text-stone-200">{formData.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Quantidade:</span>
                    <span className="font-bold text-stone-200">{ticketQuantity} ingresso(s)</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Setor Solicitado:</span>
                    <span className="font-bold text-stone-200">{selectedTicketType}</span>
                  </div>
                </div>
              )}

              {/* Botão Final Dinâmico com Redirecionamento para WhatsApp */}
              <div className="space-y-3 pt-2">
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full btn-malt py-4 rounded-xl text-xs uppercase tracking-wider font-bold shadow-xl glow-amber flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>💬</span>
                  <span>{reservationSettings.whatsappButtonLabel || 'CONFIRMAR RESERVA NO WHATSAPP'}</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200"
                >
                  Fechar Janela
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
