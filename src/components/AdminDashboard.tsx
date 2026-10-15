import React, { useState, useEffect, lazy, Suspense } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { 
  HouseLandEvent, 
  Lead, 
  Ticket, 
  Companion,
  TicketMode, 
  EventStatus, 
  SiteSettings, 
  AdminUser, 
  AdminRole, 
  ReservationFlowSettings,
  CheckInResult 
} from '../types';
import {
  getEvents,
  getTickets,
  getLeads,
  getSiteSettings,
  saveSiteSettings,
  DEFAULT_RESERVATION_FLOW_SETTINGS,
  updateEventTicketMode,
  updateEventStatus,
  toggleEventVisibility,
  deleteEvent,
  approveLeadAndIssueTicket,
  generateComplimentaryTicket,
  resetDemoDatabase,
  subscribeToEventStore
} from '../services/eventService';
import {
  getAdminUsers,
  createAdminUser,
  toggleAdminUserStatus,
  deleteAdminUser,
  subscribeToAdminUsers
} from '../services/adminUserService';
import { playClickBeep, playSuccessBeep } from '../utils/audioFeedback';
import { CreateEventModal } from './CreateEventModal';
import { MenuManagementTab } from './MenuManagementTab';
import { EventDetailDrawer } from './EventDetailDrawer';
import { formatWhatsAppUrl } from '../utils/whatsappHelper';
import { exportParticipantsToCSV } from '../utils/exportUtils';
import { downloadTicketImage } from '../utils/ticketCardGenerator';

const SiteEditor = lazy(() => import('./SiteEditor').then(m => ({ default: m.SiteEditor })));

interface AdminDashboardProps {
  onExitToPortal: () => void;
  onPreviewEvent: (event: HouseLandEvent) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onExitToPortal,
  onPreviewEvent,
  onLogout
}) => {
  // Navigation tabs in the Admin Sidebar
  const [adminTab, setAdminTab] = useState<'events_list' | 'participants' | 'menu_management' | 'portaria_scanner' | 'reservation_texts' | 'site_editor' | 'team_access'>('events_list');
  const [selectedEventForDrawer, setSelectedEventForDrawer] = useState<HouseLandEvent | null>(null);

  // Multi-event database
  const [events, setEvents] = useState<HouseLandEvent[]>(getEvents());
  const [tickets, setTickets] = useState<Ticket[]>(getTickets());
  const [leads, setLeads] = useState<Lead[]>(getLeads());
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(getAdminUsers());

  // CMS Settings
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(getSiteSettings());

  // Reservation Flow Texts Form State
  const [reservationTexts, setReservationTexts] = useState<ReservationFlowSettings>(
    siteSettings.reservationFlowSettings || DEFAULT_RESERVATION_FLOW_SETTINGS
  );
  const [reservationSavedToast, setReservationSavedToast] = useState(false);

  // Filter for participants table
  const [participantFilter, setParticipantFilter] = useState<'all' | 'valid' | 'used' | 'pending'>('all');
  const [selectedParticipantEventFilter, setSelectedParticipantEventFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCompanionIds, setExpandedCompanionIds] = useState<Record<string, boolean>>({});

  const toggleCompanionAccordion = (id: string) => {
    playClickBeep();
    setExpandedCompanionIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Portaria & Scanner QR Code State
  const [selectedScannerEventId, setSelectedScannerEventId] = useState<string>('all');
  const [scannerInputCode, setScannerInputCode] = useState<string>('');
  const [lastCheckInResult, setLastCheckInResult] = useState<CheckInResult | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<Array<{ ticket: Ticket; time: string }>>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManualVipModalOpen, setIsManualVipModalOpen] = useState(false);
  const [vipFormData, setVipFormData] = useState({ name: '', whatsapp: '', cpf: '', eventId: '' });

  // Equipe e Acessos
  const [isNewAdminModalOpen, setIsNewAdminModalOpen] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    name: '',
    email: '',
    role: 'admin' as AdminRole
  });

  useEffect(() => {
    return subscribeToEventStore(() => {
      const freshEvents = getEvents();
      setEvents(freshEvents);
      setTickets(getTickets());
      setLeads(getLeads());
      const freshSettings = getSiteSettings();
      setSiteSettings(freshSettings);
      if (freshSettings.reservationFlowSettings) {
        setReservationTexts(freshSettings.reservationFlowSettings);
      }
    });
  }, []);

  useEffect(() => {
    return subscribeToAdminUsers(() => {
      setAdminUsers(getAdminUsers());
    });
  }, []);

  const handlePerformLogout = async () => {
    playClickBeep();
    try {
      await signOut(auth);
    } catch {}
    if (onLogout) onLogout();
    else onExitToPortal();
  };

  // Salvar textos da reserva VIP
  const handleSaveReservationTexts = () => {
    playClickBeep();
    saveSiteSettings({
      reservationFlowSettings: reservationTexts
    });
    playSuccessBeep();
    setReservationSavedToast(true);
    setTimeout(() => setReservationSavedToast(false), 3500);
  };

  // Restaurar textos padrões
  const handleResetReservationTexts = () => {
    playClickBeep();
    setReservationTexts(DEFAULT_RESERVATION_FLOW_SETTINGS);
    saveSiteSettings({
      reservationFlowSettings: DEFAULT_RESERVATION_FLOW_SETTINGS
    });
    playSuccessBeep();
    setReservationSavedToast(true);
    setTimeout(() => setReservationSavedToast(false), 3500);
  };

  // Validador de Portaria / Scanner QR Code
  const handleValidateTicket = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    playClickBeep();

    // Procura por ID do ticket, payload do QR Code, CPF do titular ou de acompanhantes
    const allCurrentTickets = getTickets();
    const cleanCpf = code.replace(/\D/g, '');

    const foundTicket = allCurrentTickets.find(t => {
      if (selectedScannerEventId !== 'all' && t.eventId !== selectedScannerEventId) {
        return false;
      }

      // 1. Verificação de Titular
      if (
        t.id.toLowerCase() === code.toLowerCase() ||
        t.qrCodeData === code ||
        (code.includes(t.id) && !code.includes(`${t.id}-C`)) ||
        (cleanCpf.length === 11 && t.cpf.replace(/\D/g, '') === cleanCpf)
      ) {
        return true;
      }

      // 2. Verificação de Acompanhantes
      if (t.companions && t.companions.length > 0) {
        const comp = t.companions.find(c =>
          (c.ticketId && (c.ticketId.toLowerCase() === code.toLowerCase() || code.includes(c.ticketId))) ||
          (c.qrCodeData && c.qrCodeData === code) ||
          (cleanCpf.length === 11 && (c.cpf || '').replace(/\D/g, '') === cleanCpf)
        );
        if (comp) {
          return true;
        }
      }

      return false;
    });

    const nowIso = new Date().toISOString();

    if (!foundTicket) {
      setLastCheckInResult({
        status: 'invalid',
        message: 'INGRESSO NÃO LOCALIZADO NO SISTEMA! Verifique o código ou lote.',
        timestamp: nowIso
      });
      return;
    }

    // Identifica se a busca específica foi por um acompanhante deste ingresso
    const targetCompanion = foundTicket.companions?.find(c =>
      (c.ticketId && (c.ticketId.toLowerCase() === code.toLowerCase() || code.includes(c.ticketId))) ||
      (c.qrCodeData && c.qrCodeData === code) ||
      (cleanCpf.length === 11 && (c.cpf || '').replace(/\D/g, '') === cleanCpf)
    );

    // Se o check-in for de um acompanhante específico
    if (targetCompanion) {
      if (targetCompanion.status === 'used') {
        setLastCheckInResult({
          status: 'already_used',
          ticket: foundTicket,
          message: `ATENÇÃO: INGRESSO DE ACOMPANHANTE (${targetCompanion.name}) JÁ UTILIZADO em ${new Date(targetCompanion.usedAt || '').toLocaleTimeString('pt-BR')}!`,
          timestamp: nowIso
        });
        return;
      }

      // Registra Check-In do Acompanhante
      targetCompanion.status = 'used';
      targetCompanion.usedAt = nowIso;

      // Salva a alteração
      const updatedTickets = allCurrentTickets.map(t => t.id === foundTicket.id ? foundTicket : t);
      localStorage.setItem('hl360_tickets_v2', JSON.stringify(updatedTickets));
      setTickets(updatedTickets);

      playSuccessBeep();
      setLastCheckInResult({
        status: 'success',
        ticket: foundTicket,
        message: `CHECK-IN DE ACOMPANHANTE CONFIRMADO! Entrada liberada para: ${targetCompanion.name} (Titular: ${foundTicket.name}).`,
        timestamp: nowIso
      });

      setRecentCheckIns(prev => [{ ticket: foundTicket, time: new Date().toLocaleTimeString('pt-BR') }, ...prev.slice(0, 7)]);
      setScannerInputCode('');
      return;
    }

    // Se for o titular
    if (foundTicket.status === 'used') {
      setLastCheckInResult({
        status: 'already_used',
        ticket: foundTicket,
        message: `ATENÇÃO: INGRESSO JÁ UTILIZADO em ${new Date(foundTicket.usedAt || '').toLocaleTimeString('pt-BR')} por ${foundTicket.checkedInBy || 'Portaria'}`,
        timestamp: nowIso
      });
      return;
    }

    // Ingresso Válido do Titular: Registra o Check-In
    foundTicket.status = 'used';
    foundTicket.usedAt = nowIso;
    foundTicket.checkedInBy = 'Portaria Principal - Scanner Rock Chopp';

    // Salva a alteração
    const updatedTickets = allCurrentTickets.map(t => t.id === foundTicket.id ? foundTicket : t);
    localStorage.setItem('hl360_tickets_v2', JSON.stringify(updatedTickets));
    setTickets(updatedTickets);

    playSuccessBeep();
    setLastCheckInResult({
      status: 'success',
      ticket: foundTicket,
      message: 'CHECK-IN CONFIRMADO COM SUCESSO! ENTRADA LIBERADA.',
      timestamp: nowIso
    });

    setRecentCheckIns(prev => [{ ticket: foundTicket, time: new Date().toLocaleTimeString('pt-BR') }, ...prev.slice(0, 7)]);
    setScannerInputCode('');
  };

  const handleDownloadAdminVoucher = async (t: Ticket, comp?: Companion, compIdx?: number) => {
    try {
      const currentEvent = events.find(e => e.id === t.eventId);
      const eventTitle = currentEvent?.title || t.eventName || 'House Land Evento';
      const eventDate = currentEvent?.date || 'Data a confirmar';
      const eventDoors = currentEvent?.doorsOpen;

      if (comp) {
        await downloadTicketImage({
          eventTitle,
          eventDate,
          eventDoors,
          sector: t.type,
          locator: comp.ticketId || `${t.id}-C${(compIdx ?? 0) + 1}`,
          participantName: comp.name || `Acompanhante ${(compIdx ?? 0) + 1}`,
          participantType: `Acompanhante ${(compIdx ?? 0) + 1}`,
          participantCpf: comp.cpf,
          qrCodeDataUrl: comp.qrCodeImage || t.qrCodeImage
        });
      } else {
        await downloadTicketImage({
          eventTitle,
          eventDate,
          eventDoors,
          sector: t.type,
          locator: t.id,
          participantName: t.name,
          participantType: 'Titular',
          participantCpf: t.cpf,
          qrCodeDataUrl: t.qrCodeImage
        });
      }
    } catch (err) {
      console.error('Erro ao gerar voucher:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0d] text-stone-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="h-16 bg-[#0f1016] border-b border-amber-500/20 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚡</span>
          <div>
            <h1 className="text-sm sm:text-base font-display font-bold uppercase tracking-wider text-amber-500">
              HOUSE LAND ROCK CHOPP • PAINEL ADMINISTRATIVO
            </h1>
            <p className="text-[10px] text-stone-400 font-mono">
              Gestão Multieventos, Bilheteria & CMS Visual
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#portaria"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            title="Abrir tela de scanner da portaria com câmera em nova aba"
          >
            <span>📱</span>
            <span className="hidden sm:inline">Abrir Scanner da Portaria</span>
            <span className="sm:hidden">Portaria</span>
          </a>

          <button
            type="button"
            onClick={onExitToPortal}
            className="px-3.5 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 text-xs font-semibold transition-colors"
          >
            ← Ver Portal Público
          </button>
          <button
            type="button"
            onClick={handlePerformLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/80 text-xs font-semibold transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-[#0c0d12] border-r border-stone-800/80 p-4 space-y-2">
          {[
            { id: 'events_list', label: 'Edições & Eventos', icon: '🎸', badge: events.length },
            { id: 'participants', label: 'Participantes & Ingressos', icon: '🎟️', badge: tickets.length + leads.length },
            { id: 'menu_management', label: 'Torneiras & Gastronomia', icon: '🍻' },
            { id: 'portaria_scanner', label: 'Portaria & Scanner QR', icon: '📱' },
            { id: 'reservation_texts', label: 'Textos da Reserva VIP', icon: '📝' },
            { id: 'site_editor', label: 'Editor do Site (CMS)', icon: '🌐' },
            { id: 'team_access', label: 'Equipe & Acessos', icon: '👥', badge: adminUsers.length }
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                playClickBeep();
                setAdminTab(item.id as any);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                adminTab === item.id
                  ? 'bg-amber-500/15 border border-amber-500/50 text-amber-400 shadow-lg'
                  : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-[10px] font-mono text-stone-300">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-6xl">
          
          {/* ======================================================== */}
          {/* 1. ABA DE EDIÇÕES & EVENTOS                              */}
          {/* ======================================================== */}
          {adminTab === 'events_list' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold uppercase text-stone-100">
                    Gerenciador de Edições
                  </h2>
                  <p className="text-xs text-stone-400">
                    Cadastre festivais, edições sazonais e altere os modos de conversão de ingressos. Clique em qualquer card para ver métricas e inscritos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-malt px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg glow-amber cursor-pointer"
                >
                  + Nova Edição
                </button>
              </div>

              <div className="space-y-4">
                {events.map(evt => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      playClickBeep();
                      setSelectedEventForDrawer(evt);
                    }}
                    className="glass-panel p-5 rounded-2xl border border-stone-800 hover:border-amber-500/60 bg-[#0f1015] hover:bg-[#13141b] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group shadow-md"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-amber-400 group-hover:border-amber-500/40">
                          {evt.editionBadge}
                        </span>
                        <h3 className="text-base font-display font-bold uppercase text-stone-100 group-hover:text-amber-400 transition-colors">
                          {evt.title}
                        </h3>
                      </div>
                      <p className="text-xs text-stone-400">
                        📅 {evt.date} • 📍 {evt.location} • 👥 Cap: {evt.capacity}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-stone-500">
                        <span>Pista: R$ {evt.ticketPrices?.pista ?? 50}</span>
                        <span>•</span>
                        <span>Camarote: {evt.hasCamarote !== false && (evt.ticketPrices?.camarote ?? 0) > 0 ? `R$ ${evt.ticketPrices?.camarote}` : 'Desativado'}</span>
                        <span>•</span>
                        <span className="text-amber-400/90 font-bold group-hover:underline">📊 Clique para abrir métricas e participantes</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          playClickBeep();
                          setSelectedEventForDrawer(evt);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-400 font-bold hover:bg-amber-500/25 transition-all flex items-center gap-1 cursor-pointer"
                        title="Ver painel analítico da edição"
                      >
                        <span>📊</span>
                        <span>Painel & Métricas</span>
                      </button>

                      <select
                        value={evt.activeTicketMode}
                        onChange={e => updateEventTicketMode(evt.id, e.target.value as TicketMode)}
                        className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-amber-400 font-semibold outline-none"
                      >
                        <option value="pre_registration">Fila de Reserva VIP (Pré-cadastro)</option>
                        <option value="complimentary">Cortesia VIP Liberada (Grátis)</option>
                        <option value="direct_sale">Venda Direta (PIX / Cartão)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => onPreviewEvent(evt)}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300 hover:text-white font-semibold cursor-pointer"
                        title="Ver página pública"
                      >
                        Ver no Portal
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Deseja excluir permanentemente a edição "${evt.title}"?`)) {
                            deleteEvent(evt.id);
                            setEvents(getEvents());
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 hover:bg-rose-900 font-semibold cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA: GESTÃO DE TORNEIRAS & CARDÁPIO BBQ                  */}
          {/* ======================================================== */}
          {adminTab === 'menu_management' && (
            <MenuManagementTab
              events={events}
              onEventUpdated={() => setEvents(getEvents())}
            />
          )}

          {/* ======================================================== */}
          {/* 2. ABA: PORTARIA & SCANNER QR CODE                       */}
          {/* ======================================================== */}
          {adminTab === 'portaria_scanner' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono uppercase tracking-widest font-bold mb-1.5">
                    PORTARIA • HOUSE LAND ROCK CHOPP
                  </div>
                  <h2 className="text-2xl font-display font-bold uppercase text-stone-100">
                    Validador de Ingressos & Portaria
                  </h2>
                  <p className="text-xs text-stone-400">
                    Escaneie ou digite o localizador de ingresso / CPF para validação imediata de entrada
                  </p>
                </div>

                <div>
                  <select
                    value={selectedScannerEventId}
                    onChange={e => setSelectedScannerEventId(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-200 outline-none"
                  >
                    <option value="all">Todas as Edições Ativas</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
              </div>

              {/* Banner de Acesso ao Scanner de Câmera da Portaria */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📷</span>
                    <span className="font-bold text-sm text-stone-100 uppercase tracking-wide">
                      Leitor de Câmera em Tempo Real (Portaria Mobile)
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 max-w-xl leading-relaxed">
                    Aplicativo dedicado e otimizado para celulares da equipe de portaria. Suporta leitura contínua por câmera traseira/frontal com aviso sonoro instantâneo e validação de acompanhantes.
                  </p>
                </div>
                <a
                  href="#portaria"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-malt px-5 py-3 rounded-2xl text-xs uppercase font-bold tracking-wider shadow-lg flex items-center gap-2 cursor-pointer shrink-0 glow-amber"
                >
                  <span>📱</span>
                  <span>Abrir Scanner da Câmera</span>
                </a>
              </div>

              {/* Caixa de Entrada e Scanner */}
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-800/80 space-y-6">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-2">
                    Código do Ingresso, Localizador ou CPF
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleValidateTicket(scannerInputCode);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder="Ex: HLRC-R-1092 ou 234.567.890-11"
                      value={scannerInputCode}
                      onChange={e => setScannerInputCode(e.target.value)}
                      className="flex-1 px-5 py-3.5 rounded-2xl bg-stone-950 border border-stone-800 text-sm font-mono text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                    />
                    <button
                      type="submit"
                      className="btn-malt px-8 py-3.5 rounded-2xl text-xs uppercase font-bold tracking-wider shadow-lg glow-amber cursor-pointer"
                    >
                      Validar Entrada
                    </button>
                  </form>
                </div>

                {/* Atalhos Rápidos para Testar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono text-stone-500">Testar Ingressos do Banco:</span>
                  {tickets.slice(0, 3).map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleValidateTicket(t.id)}
                      className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-[11px] font-mono text-amber-400 hover:border-amber-500/40"
                    >
                      {t.id} ({t.status === 'valid' ? 'Válido' : 'Usado'})
                    </button>
                  ))}
                </div>

                {/* Card de Resultado da Validação */}
                {lastCheckInResult && (
                  <div className={`p-6 rounded-2xl border text-center space-y-3 animate-in zoom-in-95 duration-200 ${
                    lastCheckInResult.status === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200 glow-green'
                      : lastCheckInResult.status === 'already_used'
                      ? 'bg-amber-950/80 border-amber-500/60 text-amber-200 glow-amber'
                      : 'bg-rose-950/80 border-rose-500/60 text-rose-200 glow-red'
                  }`}>
                    <div className="text-4xl">
                      {lastCheckInResult.status === 'success' && '✅'}
                      {lastCheckInResult.status === 'already_used' && '⚠️'}
                      {lastCheckInResult.status === 'invalid' && '❌'}
                    </div>

                    <h3 className="text-xl font-display font-bold uppercase tracking-wider">
                      {lastCheckInResult.message}
                    </h3>

                    {lastCheckInResult.ticket && (
                      <div className="max-w-md mx-auto p-4 rounded-xl bg-black/50 text-left text-xs space-y-1 font-mono">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Titular:</span>
                          <span className="font-bold text-stone-100">{lastCheckInResult.ticket.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Localizador:</span>
                          <span className="text-amber-400">{lastCheckInResult.ticket.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Setor / Tipo:</span>
                          <span className="text-stone-200">{lastCheckInResult.ticket.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">CPF:</span>
                          <span className="text-stone-300">{lastCheckInResult.ticket.cpf}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Evento:</span>
                          <span className="text-stone-300 truncate">{lastCheckInResult.ticket.eventName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Histórico Recente de Validações */}
              {recentCheckIns.length > 0 && (
                <div className="glass-panel p-5 rounded-2xl border border-stone-800 space-y-3">
                  <h4 className="text-xs font-mono uppercase text-stone-400 font-bold">
                    Últimas Entradas Registradas nesta Sessão:
                  </h4>
                  <div className="space-y-2">
                    {recentCheckIns.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span className="font-bold text-stone-200">{item.ticket.name}</span>
                          <span className="text-stone-400 font-mono text-[11px]">({item.ticket.id})</span>
                        </div>
                        <span className="text-[11px] font-mono text-stone-400">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. ABA: PARTICIPANTES & INGRESSOS                         */}
          {/* ======================================================== */}
          {adminTab === 'participants' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold uppercase text-stone-100">
                    Participantes & Ingressos
                  </h2>
                  <p className="text-xs text-stone-400">
                    Controle de listas VIP, ingressos emitidos e leads da Fila de Reserva
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      playClickBeep();
                      const currentEvent = selectedParticipantEventFilter !== 'all' ? events.find(e => e.id === selectedParticipantEventFilter) : null;
                      const currentTickets = tickets.filter(t => selectedParticipantEventFilter === 'all' || t.eventId === selectedParticipantEventFilter);
                      const currentLeads = leads.filter(l => selectedParticipantEventFilter === 'all' || l.eventId === selectedParticipantEventFilter);
                      const exportList = participantFilter === 'pending'
                        ? currentLeads
                        : participantFilter === 'all'
                        ? [...currentTickets, ...currentLeads]
                        : currentTickets;
                      exportParticipantsToCSV(currentEvent, exportList);
                      playSuccessBeep();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-500/40 hover:border-amber-500 text-amber-400 text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-md"
                    title="Exportar dados oficiais para planilha CSV / Excel"
                  >
                    <span>📊</span>
                    <span>Exportar Lista (CSV/Excel)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsManualVipModalOpen(true)}
                    className="btn-malt px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg cursor-pointer"
                  >
                    + Emitir Cortesia Manual
                  </button>
                </div>
              </div>

              {/* Filtro e Busca */}
              <div className="flex flex-col md:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF ou localizador..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full md:flex-1 px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 outline-none focus:border-amber-500"
                />

                <select
                  value={selectedParticipantEventFilter}
                  onChange={e => setSelectedParticipantEventFilter(e.target.value)}
                  className="w-full md:w-auto px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-amber-400 font-bold outline-none"
                >
                  <option value="all">Todas as Edições</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title} ({ev.editionBadge})</option>
                  ))}
                </select>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                  {(['all', 'valid', 'used', 'pending'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setParticipantFilter(f)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                        participantFilter === f
                          ? 'bg-amber-500/20 border border-amber-500 text-amber-400'
                          : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      {f === 'all' && 'Todos'}
                      {f === 'valid' && 'Válidos'}
                      {f === 'used' && 'Utilizados'}
                      {f === 'pending' && 'Fila VIP (Leads)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Leads */}
              {(participantFilter === 'all' || participantFilter === 'pending') && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase text-amber-500 font-bold">
                    Fila de Reserva VIP (Leads Pré-cadastro)
                  </h3>
                  {leads
                    .filter(l => selectedParticipantEventFilter === 'all' || l.eventId === selectedParticipantEventFilter)
                    .filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.cpf.includes(searchTerm) || l.id.includes(searchTerm))
                    .map(lead => {
                      const totalQty = lead.ticketQuantity || (lead.companions && lead.companions.length > 0 ? lead.companions.length + 1 : 1);
                      const hasCompanions = totalQty > 1 || (lead.companions && lead.companions.length > 0);
                      const isExpanded = !!expandedCompanionIds[lead.id];

                      return (
                        <div key={lead.id} className="glass-panel p-4 rounded-2xl border border-stone-800 flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-amber-400">{lead.id}</span>
                                <span className="text-sm font-bold text-stone-200">{lead.name}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-stone-400">
                                  {lead.eventName || 'Edição House Land'}
                                </span>
                              </div>
                              <p className="text-xs text-stone-400">
                                WhatsApp: {lead.whatsapp} • CPF: {lead.cpf} • Qtd: {totalQty} ingresso(s)
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {hasCompanions && (
                                <button
                                  type="button"
                                  onClick={() => toggleCompanionAccordion(lead.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <span>{isExpanded ? '▲' : '▼'}</span>
                                  <span>{isExpanded ? 'Ocultar' : 'Ver'} Acompanhantes ({lead.companions?.length || (totalQty - 1)})</span>
                                </button>
                              )}

                              {lead.status === 'pending' ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    playClickBeep();
                                    await approveLeadAndIssueTicket(lead.id);
                                    playSuccessBeep();
                                  }}
                                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase transition-colors cursor-pointer"
                                >
                                  Aprovar VIP & Emitir Ingresso
                                </button>
                              ) : (
                                <span className="text-xs font-mono font-bold text-emerald-400">✓ APROVADO</span>
                              )}
                            </div>
                          </div>

                          {/* Accordion de Acompanhantes do Lead */}
                          {isExpanded && (
                            <div className="pt-3 border-t border-stone-800/80 space-y-2 animate-in fade-in">
                              <span className="text-[10px] font-mono uppercase text-amber-500 font-bold tracking-wider block">
                                👥 Acompanhantes Vinculados ao Titular ({lead.name}):
                              </span>
                              {lead.companions && lead.companions.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {lead.companions.map((comp, idx) => (
                                    <div key={idx} className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 flex items-center justify-between text-xs">
                                      <div className="space-y-0.5">
                                        <span className="font-bold text-stone-200 block">{comp.name || `Acompanhante ${idx + 1}`}</span>
                                        <span className="text-[11px] font-mono text-stone-400">CPF: {comp.cpf || 'Não informado'}</span>
                                      </div>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-950 border border-stone-800 text-amber-400 font-semibold">
                                        {lead.unitPrice && lead.unitPrice > 100 ? 'Camarote' : 'Pista / Fila VIP'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-400">
                                  Titular com reserva de {totalQty} ingressos (1 titular + {totalQty - 1} acompanhante(s)). Dados nominais individuais não cadastrados antecipadamente.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Lista de Ingressos */}
              {participantFilter !== 'pending' && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-xs font-mono uppercase text-stone-400 font-bold">
                    Ingressos Emitidos ({tickets.filter(t => selectedParticipantEventFilter === 'all' || t.eventId === selectedParticipantEventFilter).length})
                  </h3>
                  {tickets
                    .filter(t => selectedParticipantEventFilter === 'all' || t.eventId === selectedParticipantEventFilter)
                    .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.cpf.includes(searchTerm) || t.id.includes(searchTerm))
                    .map(t => {
                      const totalQty = t.ticketQuantity || (t.companions && t.companions.length > 0 ? t.companions.length + 1 : 1);
                      const hasCompanions = totalQty > 1 || (t.companions && t.companions.length > 0);
                      const isExpanded = !!expandedCompanionIds[t.id];

                      return (
                        <div key={t.id} className="glass-panel p-4 rounded-2xl border border-stone-800 flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-stone-200">{t.id}</span>
                                <span className="text-xs font-semibold text-stone-300">{t.name}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-amber-400">
                                  {t.type}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-stone-400">
                                  {t.eventName || 'Edição House Land'}
                                </span>
                              </div>
                              <p className="text-xs text-stone-400">
                                CPF: {t.cpf} • Qtd: {totalQty} ingresso(s) • Emitido em: {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                                {t.usedAt && ` • Utilizado em: ${new Date(t.usedAt).toLocaleDateString('pt-BR')}`}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleDownloadAdminVoucher(t)}
                                title="Baixar Voucher PNG"
                                className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-400 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <span>📥</span>
                                <span>Voucher</span>
                              </button>

                              {hasCompanions && (
                                <button
                                  type="button"
                                  onClick={() => toggleCompanionAccordion(t.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <span>{isExpanded ? '▲' : '▼'}</span>
                                  <span>{isExpanded ? 'Ocultar' : 'Ver'} Acompanhantes ({t.companions?.length || (totalQty - 1)})</span>
                                </button>
                              )}

                              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                                t.status === 'valid'
                                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                  : 'bg-stone-900 border-stone-700 text-stone-400'
                              }`}>
                                {t.status === 'valid' ? 'VÁLIDO' : 'UTILIZADO'}
                              </span>
                            </div>
                          </div>

                          {/* Accordion de Acompanhantes do Ticket */}
                          {isExpanded && (
                            <div className="pt-3 border-t border-stone-800/80 space-y-2 animate-in fade-in">
                              <span className="text-[10px] font-mono uppercase text-amber-500 font-bold tracking-wider block">
                                👥 Acompanhantes Vinculados ao Ingresso ({t.name}):
                              </span>
                              {t.companions && t.companions.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {t.companions.map((comp, idx) => (
                                    <div key={idx} className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 flex items-center justify-between text-xs">
                                      <div className="space-y-0.5">
                                        <span className="font-bold text-stone-200 block">{comp.name || `Acompanhante ${idx + 1}`}</span>
                                        <span className="text-[11px] font-mono text-stone-400">
                                          CPF: {comp.cpf || 'Não informado'} • {comp.ticketId || `C${idx + 1}`}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-950 border border-stone-800 text-amber-400 font-semibold">
                                          {t.type}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadAdminVoucher(t, comp, idx)}
                                          title="Baixar Voucher do Acompanhante"
                                          className="p-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-400 text-xs transition-colors cursor-pointer"
                                        >
                                          📥
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-400">
                                  Ingresso emitido para {totalQty} pessoas (1 titular + {totalQty - 1} acompanhante(s)). Dados nominais individuais não preenchidos antecipadamente.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* 4. ABA: TEXTOS DA JORNADA DE RESERVA (MODAL VIP)          */}
          {/* ======================================================== */}
          {adminTab === 'reservation_texts' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono uppercase tracking-widest font-bold mb-2">
                    Personalização do Checkout & WhatsApp
                  </div>
                  <h2 className="text-2xl font-display font-bold uppercase text-stone-100">
                    Textos da Jornada de Reserva (Modal VIP)
                  </h2>
                  <p className="text-xs text-stone-400 mt-1">
                    Configure as mensagens das etapas de reserva, aviso de pagamento e o link automático de atendimento do WhatsApp
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleResetReservationTexts}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-stone-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    ↺ Restaurar Textos Padrões
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveReservationTexts}
                    className="btn-malt px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg glow-amber flex items-center gap-2 cursor-pointer"
                  >
                    <span>💾</span>
                    <span>Salvar Textos da Reserva</span>
                  </button>
                </div>
              </div>

              {/* Toast Feedback Visual */}
              {reservationSavedToast && (
                <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold shadow-xl flex items-center gap-2">
                  <span className="text-base text-emerald-400">✓</span>
                  <span>Textos e configurações da Jornada de Reserva VIP salvos com sucesso no Firestore!</span>
                </div>
              )}

              {/* Bloco 1: Etapa 1 e Etapa 2 */}
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-800/80 space-y-6">
                <h3 className="text-sm font-display font-bold uppercase text-amber-400 tracking-wider flex items-center gap-2">
                  <span>1.</span>
                  <span>Etapa de Seleção & Aviso de Pagamento</span>
                </h3>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                    Texto Instrutivo da Seleção de Bilhetes (Etapa 1)
                  </label>
                  <textarea
                    rows={3}
                    value={reservationTexts.step1Description}
                    onChange={e => setReservationTexts({ ...reservationTexts, step1Description: e.target.value })}
                    placeholder="Ex: Escolha a quantidade de ingressos para entrar na Fila de Reserva VIP..."
                    className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none leading-relaxed"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Exibido no topo do modal quando o convidado escolhe a quantidade de ingressos.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                    Texto do Aviso de Pagamento (Etapa 2)
                  </label>
                  <textarea
                    rows={2}
                    value={reservationTexts.step2PaymentNotice}
                    onChange={e => setReservationTexts({ ...reservationTexts, step2PaymentNotice: e.target.value })}
                    placeholder="Ex: Aviso de Pagamento: O pagamento será solicitado via WhatsApp..."
                    className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none leading-relaxed"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Exibido logo acima do formulário de dados do titular para orientar sobre a cobrança.
                  </p>
                </div>
              </div>

              {/* Bloco 2: Confirmação & Sucesso */}
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-800/80 space-y-6">
                <h3 className="text-sm font-display font-bold uppercase text-amber-400 tracking-wider flex items-center gap-2">
                  <span>2.</span>
                  <span>Tela de Confirmação & Conclusão</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                      Título da Confirmação
                    </label>
                    <input
                      type="text"
                      value={reservationTexts.successTitle}
                      onChange={e => setReservationTexts({ ...reservationTexts, successTitle: e.target.value })}
                      placeholder="RESERVA REGISTRADA COM SUCESSO!"
                      className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                      Subtítulo (Suporta tag &#123;evento&#125;)
                    </label>
                    <input
                      type="text"
                      value={reservationTexts.successSubtitle}
                      onChange={e => setReservationTexts({ ...reservationTexts, successSubtitle: e.target.value })}
                      placeholder="Sua reserva para {evento} foi cadastrada..."
                      className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 3: Integração e Disparo para o WhatsApp */}
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-800/80 space-y-6">
                <h3 className="text-sm font-display font-bold uppercase text-amber-400 tracking-wider flex items-center gap-2">
                  <span>3.</span>
                  <span>Disparo Direto para o WhatsApp da Produção</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                      Etiqueta do Botão Final
                    </label>
                    <input
                      type="text"
                      value={reservationTexts.whatsappButtonLabel}
                      onChange={e => setReservationTexts({ ...reservationTexts, whatsappButtonLabel: e.target.value })}
                      placeholder="CONFIRMAR RESERVA NO WHATSAPP"
                      className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                      Número ou Link Direto do WhatsApp
                    </label>
                    <input
                      type="text"
                      value={reservationTexts.whatsappContactNumber}
                      onChange={e => setReservationTexts({ ...reservationTexts, whatsappContactNumber: e.target.value })}
                      placeholder="Ex: (21) 99731-3305 ou https://wa.me/5521997313305"
                      className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                    />
                    <span className="text-[11px] text-stone-500 mt-1 block">
                      Aceita tanto o número com DDD quanto uma URL direta customizada (https://wa.me/... ou https://api.whatsapp.com/...)
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-stone-300">
                      Mensagem Pré-Preenchida do WhatsApp
                    </label>
                    <span className="text-[11px] font-mono text-amber-400">
                      Tags disponíveis: &#123;nome&#125;, &#123;localizador&#125;, &#123;evento&#125;, &#123;quantidade&#125;
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={reservationTexts.whatsappCustomMessage}
                    onChange={e => setReservationTexts({ ...reservationTexts, whatsappCustomMessage: e.target.value })}
                    placeholder="Olá, equipe House Land! Acabei de registrar minha reserva para {evento}..."
                    className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono leading-relaxed"
                  />
                </div>

                {/* Pré-visualização da Mensagem e do Link */}
                <div className="p-4 rounded-2xl bg-stone-950/80 border border-amber-500/20 space-y-3">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-stone-400 font-bold block mb-1">
                      💬 Mensagem formatada que o Cliente enviará:
                    </span>
                    <p className="text-xs text-stone-300 italic bg-[#0b0c10] p-3 rounded-xl border border-stone-800 font-mono">
                      {reservationTexts.whatsappCustomMessage
                        .replace(/{nome}/g, 'Carlos Eduardo')
                        .replace(/{localizador}/g, 'LEAD-8421')
                        .replace(/{evento}/g, events[0]?.title || 'House Land Rock Chopp Festival')
                        .replace(/{quantidade}/g, '2')}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-mono uppercase text-amber-500 font-bold block mb-1">
                      🔗 Link de Redirecionamento Gerado:
                    </span>
                    <p className="text-[11px] text-amber-400/90 font-mono break-all bg-[#0b0c10] p-3 rounded-xl border border-stone-800">
                      {formatWhatsAppUrl(
                        reservationTexts.whatsappContactNumber,
                        reservationTexts.whatsappCustomMessage
                          .replace(/{nome}/g, 'Carlos Eduardo')
                          .replace(/{localizador}/g, 'LEAD-8421')
                          .replace(/{evento}/g, events[0]?.title || 'House Land Rock Chopp')
                          .replace(/{quantidade}/g, '2')
                      )}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveReservationTexts}
                    className="btn-malt px-8 py-3.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-xl glow-amber flex items-center gap-2 cursor-pointer"
                  >
                    <span>💾</span>
                    <span>Salvar Textos da Reserva</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* 5. ABA: EDITOR VISUAL COMPLETO DO SITE (CMS)              */}
          {/* ======================================================== */}
          {adminTab === 'site_editor' && (
            <div className="space-y-6">
              <Suspense fallback={
                <div className="p-12 text-center text-xs text-amber-500 font-mono">
                  Carregando Editor Visual Completo...
                </div>
              }>
                <SiteEditor
                  initialSettings={siteSettings}
                  onSave={(updated) => setSiteSettings(updated)}
                />
              </Suspense>
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. ABA: EQUIPE & ACESSOS                                 */}
          {/* ======================================================== */}
          {adminTab === 'team_access' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold uppercase text-stone-100">
                    Equipe & Acessos
                  </h2>
                  <p className="text-xs text-stone-400">
                    Controle de administradores, operadores de portaria/scanner e caixa
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewAdminModalOpen(true)}
                  className="btn-malt px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg cursor-pointer"
                >
                  + Novo Administrador
                </button>
              </div>

              <div className="space-y-3">
                {adminUsers.map(u => (
                  <div key={u.uid} className="glass-panel p-4 rounded-2xl border border-stone-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-stone-200">{u.name}</h4>
                      <p className="text-xs text-stone-400">{u.email} • Papel: {u.role}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAdminUserStatus(u.uid)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          u.active
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                        }`}
                      >
                        {u.active ? 'Ativo' : 'Inativo'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteAdminUser(u.uid)}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-400 hover:text-white cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Modal Criar Evento */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => setEvents(getEvents())}
      />

      {/* Modal Cortesia Manual */}
      {isManualVipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121318] border border-amber-500/30 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-display font-bold uppercase text-amber-500">
              Emitir Cortesia VIP Manual
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-300 block mb-1">Evento</label>
                <select
                  value={vipFormData.eventId || events[0]?.id}
                  onChange={e => setVipFormData({ ...vipFormData, eventId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100"
                >
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Nome do Convidado VIP</label>
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={vipFormData.name}
                  onChange={e => setVipFormData({ ...vipFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">WhatsApp</label>
                <input
                  type="text"
                  placeholder="(21) 99731-3305"
                  value={vipFormData.whatsapp}
                  onChange={e => setVipFormData({ ...vipFormData, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">CPF</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={vipFormData.cpf}
                  onChange={e => setVipFormData({ ...vipFormData, cpf: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualVipModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-stone-400 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (vipFormData.name && vipFormData.cpf) {
                    await generateComplimentaryTicket({
                      eventId: vipFormData.eventId || events[0]?.id,
                      name: vipFormData.name,
                      whatsapp: vipFormData.whatsapp,
                      cpf: vipFormData.cpf,
                      type: 'Cortesia VIP Manual',
                      batch: 'Cortesia Produção'
                    });
                    setIsManualVipModalOpen(false);
                    playSuccessBeep();
                  }
                }}
                className="btn-malt px-5 py-2 rounded-xl text-xs uppercase font-bold cursor-pointer"
              >
                Emitir Ingresso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Admin */}
      {isNewAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121318] border border-amber-500/30 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-display font-bold uppercase text-amber-500">
              Novo Usuário Administrativo
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-300 block mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={adminFormData.name}
                  onChange={e => setAdminFormData({ ...adminFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100"
                />
              </div>
              <div>
                <label className="text-stone-300 block mb-1">E-mail</label>
                <input
                  type="email"
                  value={adminFormData.email}
                  onChange={e => setAdminFormData({ ...adminFormData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100"
                />
              </div>
              <div>
                <label className="text-stone-300 block mb-1">Papel / Função</label>
                <select
                  value={adminFormData.role}
                  onChange={e => setAdminFormData({ ...adminFormData, role: e.target.value as AdminRole })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100"
                >
                  <option value="admin">Administrador Geral</option>
                  <option value="scanner">Portaria / Scanner QR</option>
                  <option value="financeiro">Financeiro / Bilheteria</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewAdminModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-stone-400 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (adminFormData.name && adminFormData.email) {
                    await createAdminUser(adminFormData);
                    setIsNewAdminModalOpen(false);
                    playSuccessBeep();
                  }
                }}
                className="btn-malt px-5 py-2 rounded-xl text-xs uppercase font-bold cursor-pointer"
              >
                Criar Acesso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Drawer Analítico Detalhado da Edição */}
      {selectedEventForDrawer && (
        <EventDetailDrawer
          event={selectedEventForDrawer}
          onClose={() => setSelectedEventForDrawer(null)}
          onUpdateEvent={(updated) => {
            setSelectedEventForDrawer(updated);
            setEvents(getEvents());
          }}
          onOpenPublicPreview={(evt) => {
            setSelectedEventForDrawer(null);
            onPreviewEvent(evt);
          }}
        />
      )}

    </div>
  );
};
