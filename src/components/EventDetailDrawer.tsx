import React, { useState } from 'react';
import { HouseLandEvent, TicketMode, EventStatus, Ticket, Companion } from '../types';
import { 
  getTickets, 
  getLeads, 
  updateEvent, 
  approveLeadAndIssueTicket 
} from '../services/eventService';
import { playClickBeep, playSuccessBeep } from '../utils/audioFeedback';
import { exportParticipantsToCSV } from '../utils/exportUtils';
import { downloadTicketImage } from '../utils/ticketCardGenerator';

interface EventDetailDrawerProps {
  event: HouseLandEvent;
  onClose: () => void;
  onUpdateEvent: (updated: HouseLandEvent) => void;
  onOpenPublicPreview: (event: HouseLandEvent) => void;
}

export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({
  event,
  onClose,
  onUpdateEvent,
  onOpenPublicPreview
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'participants' | 'menu'>('metrics');
  const [searchTerm, setSearchTerm] = useState('');
  const [ticketPrices, setTicketPrices] = useState({
    pista: event.ticketPrices?.pista ?? 50,
    camarote: event.ticketPrices?.camarote ?? 120
  });
  const [hasCamarote, setHasCamarote] = useState<boolean>(
    event.hasCamarote ?? (event.ticketPrices?.camarote !== undefined && event.ticketPrices.camarote > 0)
  );
  const [shortDescription, setShortDescription] = useState<string>(event.shortDescription || '');
  const [fullDescription, setFullDescription] = useState<string>(event.fullDescription || '');
  const [capacity, setCapacity] = useState(event.capacity || 1000);
  const [status, setStatus] = useState<EventStatus>(event.status || 'active');
  const [ticketMode, setTicketMode] = useState<TicketMode>(event.activeTicketMode || 'pre_registration');
  const [savedToast, setSavedToast] = useState(false);
  const [expandedCompanionIds, setExpandedCompanionIds] = useState<Record<string, boolean>>({});

  const toggleCompanionAccordion = (id: string) => {
    playClickBeep();
    setExpandedCompanionIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Ingressos e Leads desta edição específica
  const allTickets = getTickets();
  const eventTickets = allTickets.filter(t => t.eventId === event.id);
  const usedTickets = eventTickets.filter(t => t.status === 'used');
  const validTickets = eventTickets.filter(t => t.status === 'valid');

  const allLeads = getLeads();
  const eventLeads = allLeads.filter(l => l.eventId === event.id);
  const pendingLeads = eventLeads.filter(l => l.status === 'pending');

  // Cálculos de métricas
  const totalOccupied = eventTickets.length;
  const occupancyPercent = Math.min(100, Math.round((totalOccupied / (capacity || 1)) * 100));
  const estimatedRevenue = eventTickets.reduce((acc, t) => {
    const isCamarote = t.type.toLowerCase().includes('camarote');
    const vipPrice = hasCamarote ? (ticketPrices.camarote ?? 0) : 0;
    return acc + (isCamarote ? vipPrice : (ticketPrices.pista ?? 0));
  }, 0);

  // Salvar ajustes rápidos
  const handleSaveQuickSettings = () => {
    playClickBeep();
    const updated = updateEvent(event.id, {
      capacity: Number(capacity),
      status,
      activeTicketMode: ticketMode,
      shortDescription,
      fullDescription,
      hasCamarote,
      ticketPrices: {
        pista: Number(ticketPrices.pista),
        camarote: hasCamarote ? Number(ticketPrices.camarote) : 0
      }
    });
    playSuccessBeep();
    if (updated) onUpdateEvent(updated);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleDownloadVoucher = async (t: Ticket, comp?: Companion, compIdx?: number) => {
    try {
      if (comp) {
        await downloadTicketImage({
          eventTitle: event.title,
          eventDate: event.date,
          eventDoors: event.doorsOpen,
          sector: t.type,
          locator: comp.ticketId || `${t.id}-C${(compIdx ?? 0) + 1}`,
          participantName: comp.name || `Acompanhante ${(compIdx ?? 0) + 1}`,
          participantType: `Acompanhante ${(compIdx ?? 0) + 1}`,
          participantCpf: comp.cpf,
          qrCodeDataUrl: comp.qrCodeImage || t.qrCodeImage
        });
      } else {
        await downloadTicketImage({
          eventTitle: event.title,
          eventDate: event.date,
          eventDoors: event.doorsOpen,
          sector: t.type,
          locator: t.id,
          participantName: t.name,
          participantType: 'Titular',
          participantCpf: t.cpf,
          qrCodeDataUrl: t.qrCodeImage
        });
      }
    } catch (err) {
      console.error('Erro ao baixar voucher:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Drawer Container */}
      <div className="w-full max-w-3xl h-full bg-[#0c0d12] border-l border-amber-500/30 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Top Header */}
        <div className="p-4 sm:p-6 bg-[#111218] border-b border-stone-800 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-amber-400 font-mono text-xs font-bold">
                {event.editionBadge}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                status === 'active' ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400' : 'bg-stone-900 text-stone-400'
              }`}>
                {status === 'active' ? '● Em Andamento / Ativo' : status}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-display font-bold uppercase text-stone-100">
              {event.title}
            </h2>

            <p className="text-xs text-stone-400">
              📅 {event.date} às {event.doorsOpen} • 📍 {event.location}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenPublicPreview(event)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Abrir página pública do evento"
            >
              <span>🌐</span>
              <span className="hidden sm:inline">Página Pública</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toast Feedback */}
        {savedToast && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
            <span>✓</span>
            <span>Alterações da edição salvas com sucesso!</span>
          </div>
        )}

        {/* Navegação Interna do Drawer */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 border-b border-stone-800/80 flex gap-2 overflow-x-auto shrink-0 overscroll-contain">
          {[
            { id: 'metrics', label: '📊 Métricas & Lotes', count: undefined },
            { id: 'participants', label: '🎟️ Participantes & Fila VIP', count: eventTickets.length + pendingLeads.length },
            { id: 'menu', label: '🍺 Torneiras & Gastronomia', count: (event.beerTaps?.length || 0) + (event.bbqMenu?.length || 0) }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                playClickBeep();
                setActiveTab(tab.id as any);
              }}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              {tab.label} {tab.count !== undefined && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 overscroll-contain">
          
          {/* ======================================================== */}
          {/* 1. ABA DE MÉTRICAS & LOTES                               */}
          {/* ======================================================== */}
          {activeTab === 'metrics' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-panel p-4 rounded-2xl border border-stone-800 text-center">
                  <span className="text-[10px] font-mono uppercase text-stone-400 block mb-1">Capacidade</span>
                  <span className="text-xl font-display font-black text-stone-100">{capacity}</span>
                  <span className="text-[10px] text-stone-500 block">pessoas</span>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-stone-800 text-center">
                  <span className="text-[10px] font-mono uppercase text-amber-400 block mb-1">Emitidos / Pagos</span>
                  <span className="text-xl font-display font-black text-amber-400">{eventTickets.length}</span>
                  <span className="text-[10px] text-stone-500 block">{validTickets.length} ativos</span>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-stone-800 text-center">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 block mb-1">Portaria / Check-in</span>
                  <span className="text-xl font-display font-black text-emerald-400">{usedTickets.length}</span>
                  <span className="text-[10px] text-stone-500 block">validados</span>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-stone-800 text-center">
                  <span className="text-[10px] font-mono uppercase text-stone-400 block mb-1">Fila VIP (Leads)</span>
                  <span className="text-xl font-display font-black text-amber-400">{pendingLeads.length}</span>
                  <span className="text-[10px] text-stone-500 block">aguardando</span>
                </div>
              </div>

              {/* Barra de Ocupação da Edição */}
              <div className="glass-panel p-5 rounded-2xl border border-stone-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-300">Taxa de Ocupação do Espaço</span>
                  <span className="font-mono font-bold text-amber-400">{occupancyPercent}% ({totalOccupied} / {capacity})</span>
                </div>
                <div className="w-full h-3 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      occupancyPercent > 90 ? 'bg-rose-500' : occupancyPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-stone-500 pt-1">
                  <span>Receita Estimada de Bilheteria: <strong className="text-emerald-400">R$ {estimatedRevenue.toLocaleString('pt-BR')}</strong></span>
                  <span>{capacity - totalOccupied} lugares restantes</span>
                </div>
              </div>

              {/* Edição Rápida de Lotes & Modo */}
              <div className="glass-panel p-6 rounded-2xl border border-stone-800 space-y-4">
                <h3 className="text-xs font-mono uppercase font-bold text-amber-500 tracking-wider">
                  Controle de Lotes, Preços & Modo Ativo
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1">
                      Preço Ingresso Pista (R$)
                    </label>
                    <input
                      type="number"
                      value={ticketPrices.pista}
                      onChange={e => setTicketPrices({ ...ticketPrices, pista: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1">
                      Capacidade Máxima do Espaço
                    </label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={e => setCapacity(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 font-mono"
                    />
                  </div>
                </div>

                {/* Switch e Preço do Setor Camarote */}
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-200 block">
                        Habilitar Setor Camarote nesta Edição
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Habilita a venda/resgate de camarote VIP para este evento
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasCamarote(!hasCamarote)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        hasCamarote ? 'bg-amber-500' : 'bg-stone-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-stone-950 transition-transform ${
                          hasCamarote ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {hasCamarote && (
                    <div className="pt-2 border-t border-stone-900 animate-in fade-in duration-200">
                      <label className="text-xs font-semibold text-stone-300 block mb-1">
                        Preço Ingresso Camarote VIP (R$)
                      </label>
                      <input
                        type="number"
                        value={ticketPrices.camarote}
                        onChange={e => setTicketPrices({ ...ticketPrices, camarote: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#111218] border border-stone-800 text-xs text-stone-100 font-mono focus:border-amber-500 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1">
                      Status da Edição
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as EventStatus)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-amber-400 font-bold outline-none"
                    >
                      <option value="active">Ativo (Confirmado)</option>
                      <option value="upcoming">Em Breve (Pré-Lançamento)</option>
                      <option value="concluded">Concluído (Histórico)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1">
                      Modo de Ingresso Ativo no Portal
                    </label>
                    <select
                      value={ticketMode}
                      onChange={e => setTicketMode(e.target.value as TicketMode)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-amber-400 font-bold outline-none"
                    >
                      <option value="pre_registration">Fila de Reserva VIP (Pré-cadastro)</option>
                      <option value="complimentary">Cortesia VIP Liberada (Resgate com QR Code)</option>
                      <option value="direct_sale">Venda Direta de Ingressos (PIX / Cartão)</option>
                    </select>
                  </div>
                </div>

                {/* Campos de Descrição da Edição */}
                <div className="space-y-4 pt-2 border-t border-stone-800/60">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-300">
                        Descrição Resumida (Card da Agenda)
                      </label>
                      <span className="text-[10px] font-mono text-stone-500">
                        {shortDescription.length}/160 caracteres sugeridos
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={shortDescription}
                      onChange={e => setShortDescription(e.target.value)}
                      placeholder="Resumo do evento exibido no card da agenda..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-300 block mb-1">
                      Descrição Completa da Edição (Página do Evento)
                    </label>
                    <textarea
                      rows={4}
                      value={fullDescription}
                      onChange={e => setFullDescription(e.target.value)}
                      placeholder="Texto institucional e programação detalhada exibida na página pública do evento..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 z-10 bg-[#0c0d12]/95 backdrop-blur-md -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 sm:p-6 border-t border-stone-800/80 flex justify-end shrink-0 mt-4">
                  <button
                    type="button"
                    onClick={handleSaveQuickSettings}
                    className="w-full sm:w-auto btn-malt px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg glow-amber cursor-pointer"
                  >
                    Salvar Alterações da Edição
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* 2. ABA DE PARTICIPANTES & FILA VIP                       */}
          {/* ======================================================== */}
          {activeTab === 'participants' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF ou localizador..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    playClickBeep();
                    exportParticipantsToCSV(event, [...eventTickets, ...pendingLeads]);
                    playSuccessBeep();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-500/40 hover:border-amber-500 text-amber-400 text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md whitespace-nowrap"
                  title="Exportar participantes desta edição para planilha CSV / Excel"
                >
                  <span>📊</span>
                  <span>Exportar Lista (CSV/Excel)</span>
                </button>
              </div>

              {/* Fila VIP Deste Evento */}
              {pendingLeads.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase text-amber-400 font-bold block">
                    Fila de Reserva VIP Aguardando Aprovação ({pendingLeads.length})
                  </span>
                  {pendingLeads
                    .filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.cpf.includes(searchTerm) || l.id.includes(searchTerm))
                    .map(lead => {
                      const totalQty = lead.ticketQuantity || (lead.companions && lead.companions.length > 0 ? lead.companions.length + 1 : 1);
                      const hasCompanions = totalQty > 1 || (lead.companions && lead.companions.length > 0);
                      const isExpanded = !!expandedCompanionIds[lead.id];

                      return (
                        <div key={lead.id} className="p-3.5 rounded-xl bg-[#14151c] border border-amber-500/30 flex flex-col gap-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-amber-400">{lead.id}</span>
                                <span className="text-xs font-bold text-stone-200">{lead.name}</span>
                              </div>
                              <p className="text-[11px] text-stone-400 mt-0.5">
                                WhatsApp: {lead.whatsapp} • CPF: {lead.cpf} • Qtd: {totalQty} ingresso(s)
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {hasCompanions && (
                                <button
                                  type="button"
                                  onClick={() => toggleCompanionAccordion(lead.id)}
                                  className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <span>{isExpanded ? '▲' : '▼'}</span>
                                  <span>{isExpanded ? 'Ocultar' : 'Ver'} Acompanhantes ({lead.companions?.length || (totalQty - 1)})</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  playClickBeep();
                                  await approveLeadAndIssueTicket(lead.id);
                                  playSuccessBeep();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase transition-colors cursor-pointer"
                              >
                                Aprovar VIP
                              </button>
                            </div>
                          </div>

                          {/* Accordion de Acompanhantes */}
                          {isExpanded && (
                            <div className="pt-2.5 border-t border-stone-800 space-y-1.5 animate-in fade-in">
                              <span className="text-[10px] font-mono uppercase text-amber-500 font-bold tracking-wider block">
                                👥 Acompanhantes Cadastrados:
                              </span>
                              {lead.companions && lead.companions.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {lead.companions.map((comp, idx) => (
                                    <div key={idx} className="p-2 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between text-xs">
                                      <div>
                                        <span className="font-semibold text-stone-200 block">{comp.name || `Acompanhante ${idx + 1}`}</span>
                                        <span className="text-[10px] font-mono text-stone-400">CPF: {comp.cpf || 'Não informado'}</span>
                                      </div>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-amber-400">
                                        Fila VIP
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-stone-400 italic">
                                  Reserva de {totalQty} ingressos. Acompanhantes sem documento informado antecipadamente.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Ingressos Emitidos Deste Evento */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono uppercase text-stone-400 font-bold block">
                  Ingressos Emitidos ({eventTickets.length})
                </span>

                {eventTickets.length === 0 ? (
                  <p className="text-xs text-stone-500 italic p-4 text-center">
                    Nenhum ingresso emitido para esta edição até o momento.
                  </p>
                ) : (
                  eventTickets
                    .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.cpf.includes(searchTerm) || t.id.includes(searchTerm))
                    .map(t => {
                      const totalQty = t.ticketQuantity || (t.companions && t.companions.length > 0 ? t.companions.length + 1 : 1);
                      const hasCompanions = totalQty > 1 || (t.companions && t.companions.length > 0);
                      const isExpanded = !!expandedCompanionIds[t.id];

                      return (
                        <div key={t.id} className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex flex-col gap-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-stone-200">{t.id}</span>
                                <span className="text-xs font-semibold text-stone-300">{t.name}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-amber-400">
                                  {t.type}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 mt-0.5">
                                CPF: {t.cpf} • Qtd: {totalQty} • Emitido em: {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                                {t.usedAt && ` • Check-in: ${new Date(t.usedAt).toLocaleTimeString('pt-BR')}`}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleDownloadVoucher(t)}
                                title="Baixar Voucher PNG"
                                className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-400 text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <span>📥</span>
                                <span>Voucher</span>
                              </button>

                              {hasCompanions && (
                                <button
                                  type="button"
                                  onClick={() => toggleCompanionAccordion(t.id)}
                                  className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <span>{isExpanded ? '▲' : '▼'}</span>
                                  <span>{isExpanded ? 'Ocultar' : 'Ver'} Acompanhantes ({t.companions?.length || (totalQty - 1)})</span>
                                </button>
                              )}

                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                t.status === 'valid'
                                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                  : 'bg-stone-900 border-stone-700 text-stone-400'
                              }`}>
                                {t.status === 'valid' ? 'VÁLIDO' : 'UTILIZADO'}
                              </span>
                            </div>
                          </div>

                          {/* Accordion de Acompanhantes */}
                          {isExpanded && (
                            <div className="pt-2.5 border-t border-stone-800/80 space-y-1.5 animate-in fade-in">
                              <span className="text-[10px] font-mono uppercase text-amber-500 font-bold tracking-wider block">
                                👥 Acompanhantes Vinculados ao Ingresso:
                              </span>
                              {t.companions && t.companions.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {t.companions.map((comp, idx) => (
                                    <div key={idx} className="p-2 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between text-xs">
                                      <div>
                                        <span className="font-semibold text-stone-200 block">{comp.name || `Acompanhante ${idx + 1}`}</span>
                                        <span className="text-[10px] font-mono text-stone-400">
                                          CPF: {comp.cpf || 'Não informado'} • {comp.ticketId || `C${idx + 1}`}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-amber-400">
                                          {t.type}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadVoucher(t, comp, idx)}
                                          title="Baixar Voucher do Acompanhante"
                                          className="p-1 rounded bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-400 text-xs transition-colors cursor-pointer"
                                        >
                                          📥
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-stone-400 italic">
                                  Ingresso para {totalQty} pessoas. Acompanhantes sem documento informado antecipadamente.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* 3. ABA DE TORNEIRAS & CARDÁPIO DESTA EDIÇÃO              */}
          {/* ======================================================== */}
          {activeTab === 'menu' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div>
                <h4 className="text-xs font-mono uppercase text-amber-500 font-bold mb-3">
                  Torneiras de Chopp Vinculadas ({event.beerTaps?.length || 0})
                </h4>
                <div className="space-y-2">
                  {(event.beerTaps || []).map((tap, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-stone-900 text-amber-400 text-[10px] font-mono flex items-center justify-center font-bold">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-stone-100">{tap.name}</span>
                          <span className="text-[10px] text-stone-400">({tap.style || 'Chopp'})</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">{tap.notes || tap.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-amber-400 font-bold">{tap.abv}</span>
                        <span className="text-stone-500">{tap.ibu}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase text-amber-500 font-bold mb-3">
                  Cardápio Gastronômico Vinculado ({event.bbqMenu?.length || 0})
                </h4>
                <div className="space-y-2">
                  {(event.bbqMenu || []).map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                      <div>
                        {item.cut && item.cut.trim() !== '' && (
                          <span className="text-[10px] font-mono text-amber-500 uppercase">{item.cut.trim()}</span>
                        )}
                        <h5 className="text-xs font-bold text-stone-100">{item.name}</h5>
                        {item.description && item.description.trim() !== '' && (
                          <p className="text-[11px] text-stone-400">{item.description.trim()}</p>
                        )}
                      </div>
                      {item.price && item.price.trim() !== '' && (
                        <span className="text-xs font-mono font-bold text-amber-400">{item.price.trim()}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
