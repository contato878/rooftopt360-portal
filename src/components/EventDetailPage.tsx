import React, { useState, useEffect } from 'react';
import { HouseLandEvent, SiteSettings } from '../types';
import { playClickBeep } from '../utils/audioFeedback';
import { formatWhatsAppUrl } from '../utils/whatsappHelper';
import { getSiteSettings, subscribeToEventStore } from '../services/eventService';

interface EventDetailPageProps {
  event: HouseLandEvent;
  onBackToPortal?: () => void;
  onBackToAgenda?: () => void;
  onOpenTicketModal: () => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  event,
  onBackToPortal,
  onBackToAgenda,
  onOpenTicketModal
}) => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => getSiteSettings());

  useEffect(() => {
    return subscribeToEventStore(() => {
      setSiteSettings(getSiteSettings());
    });
  }, []);

  const activeMode = event.activeTicketMode;
  const activeBeerTaps = event.beerTaps || [];
  const activeBbqMenu = event.bbqMenu || [];

  const productionPhone = siteSettings.productionWhatsapp || siteSettings.contactWhatsapp || event.contactWhatsApp;
  const whatsappMessage = `Olá! Gostaria de tirar dúvidas sobre a edição ${event.title} na House Land Rock Chopp.`;
  const whatsappUrl = formatWhatsAppUrl(productionPhone, whatsappMessage);

  const handleBack = () => {
    playClickBeep();
    if (onBackToAgenda) {
      onBackToAgenda();
    } else if (onBackToPortal) {
      onBackToPortal();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-stone-100 flex flex-col font-sans">
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 w-full bg-[#0a0a0d]/95 backdrop-blur-md border-b border-amber-500/20 px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-500 hover:text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 shadow-lg group cursor-pointer"
          >
            <span className="text-base group-hover:-translate-x-1 transition-transform">←</span>
            <span>Voltar para a Agenda</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-[11px] text-stone-400 font-mono bg-stone-900 px-3 py-1 rounded-full border border-stone-800">
              {event.editionBadge}
            </span>
            <button
              onClick={() => {
                playClickBeep();
                onOpenTicketModal();
              }}
              className="btn-malt px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold shadow-lg glow-amber cursor-pointer"
            >
              {activeMode === 'pre_registration' && 'Entrar na Lista VIP'}
              {activeMode === 'complimentary' && 'Resgatar Ingresso Grátis'}
              {activeMode === 'direct_sale' && 'Garantir Ingresso'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section of this Specific Edition */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 z-0">
          <img
            src={event.bannerImage}
            alt={event.title}
            className="w-full h-full object-cover object-center filter brightness-45 contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0d] via-[#0a0a0d]/70 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            {event.editionBadge}
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold uppercase tracking-tight text-stone-100 leading-tight mb-6 drop-shadow-2xl">
            {event.title}
          </h1>

          <div className="flex items-center justify-center flex-wrap gap-4 text-xs sm:text-sm font-semibold tracking-wider uppercase text-stone-300 mb-8">
            <span className="text-amber-400">📅 {event.date}</span>
            <span className="text-stone-600">·</span>
            <span>⏰ Abertura: {event.doorsOpen}</span>
            <span className="text-stone-600">·</span>
            <span>📍 {event.location}</span>
          </div>

          <div className="text-zinc-300 text-base md:text-lg leading-relaxed whitespace-pre-line space-y-4 font-normal tracking-wide max-w-3xl mx-auto mb-8">
            {(event.fullDescription || event.shortDescription || '')
              .split('\n\n')
              .filter((p: string) => p.trim() !== '')
              .map((paragraph: string, idx: number) => (
                <p key={idx} className="leading-relaxed whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
          </div>

          <button
            onClick={() => {
              playClickBeep();
              onOpenTicketModal();
            }}
            className="btn-malt px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider font-bold shadow-xl glow-amber cursor-pointer"
          >
            {activeMode === 'pre_registration' && 'Garantir Lugar na Fila de Reserva VIP'}
            {activeMode === 'complimentary' && 'Resgatar Cortesia VIP com QR Code'}
            {activeMode === 'direct_sale' && 'Comprar Ingressos da Edição'}
          </button>
        </div>
      </section>

      {/* Line-up de Bandas */}
      {event.bands && event.bands.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold block mb-1">
              Som Valvulado & Paredões
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold uppercase text-stone-100">
              Line-up Oficial de Bandas
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {event.bands.map(band => (
              <div key={band.id} className="glass-panel p-6 rounded-3xl border border-stone-800 flex gap-4 items-center">
                <img
                  src={band.image}
                  alt={band.name}
                  className="w-24 h-24 rounded-2xl object-cover border border-amber-500/20"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-display font-bold uppercase text-stone-100">
                      {band.name}
                    </h3>
                    <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                      {band.genre}
                    </span>
                  </div>
                  <p className="text-xs text-amber-500/80 font-mono">
                    {band.timeSlot}
                  </p>
                  <p className="text-xs text-stone-400 line-clamp-2 whitespace-pre-line">
                    {band.description}
                  </p>
                  {band.highlightSong && (
                    <p className="text-[11px] font-mono text-stone-300 font-bold pt-1">
                      ⚡ Destaque: {band.highlightSong}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Torneiras de Chopp Artesanal */}
      {activeBeerTaps.length > 0 && (
        <section className="bg-stone-950/70 border-y border-stone-800 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold block mb-1">
                Puro Malte & Lúpulo
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold uppercase text-stone-100">
                Torneiras Artesanais Selecionadas
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {activeBeerTaps.map((tap, idx) => {
                const isAvailable = tap.status !== 'sold_out';
                return (
                  <div
                    key={idx}
                    className={`glass-panel p-5 rounded-2xl border flex flex-col justify-between ${
                      isAvailable
                        ? 'border-stone-800/80 bg-[#0f1015]'
                        : 'border-rose-950/60 bg-rose-950/20 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-amber-500">{tap.abv}</span>
                        <span className="text-xs font-mono text-stone-500">{tap.ibu}</span>
                      </div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h3 className="text-base font-display font-bold uppercase text-stone-100">
                          {tap.name}
                        </h3>
                        {!isAvailable && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 font-bold whitespace-nowrap">
                            Esgotado
                          </span>
                        )}
                      </div>
                      {tap.brewery && (
                        <p className="text-[11px] text-amber-400/80 font-semibold mb-1">
                          {tap.brewery} {tap.style && `• ${tap.style}`}
                        </p>
                      )}
                      <p className="text-xs text-stone-400 whitespace-pre-line leading-relaxed">
                        {tap.notes || tap.description}
                      </p>
                    </div>
                    {tap.price && (
                      <div className="pt-3 mt-3 border-t border-stone-800/60 flex justify-between items-center text-xs font-mono">
                        <span className="text-stone-500">Dose / Chopp:</span>
                        <span className="text-amber-400 font-bold">{tap.price}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Gastronomia & Petiscos (Renderização Condicional Estrita) */}
      {activeBbqMenu.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold block mb-1">
              Gastronomia & Petiscos
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold uppercase text-stone-100">
              Cardápio Gastronômico da Edição
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-2 max-w-xl mx-auto">
              Pratos, burgers, porções e petiscos preparados para a edição.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeBbqMenu.map(item => {
              const isAvailable = item.status !== 'sold_out';
              const hasDescription = Boolean(item.description && item.description.trim() !== '');
              const hasServedWith = Boolean(item.servedWith && item.servedWith.trim() !== '');
              const hasImage = Boolean(item.image && item.image.trim() !== '');
              const hasCut = Boolean(item.cut && item.cut.trim() !== '');

              return (
                <div
                  key={item.id}
                  className={`glass-panel p-6 rounded-2xl border flex flex-col justify-between ${
                    isAvailable
                      ? 'border-stone-800 bg-[#0f1015]'
                      : 'border-rose-950/60 bg-rose-950/20 opacity-75'
                  }`}
                >
                  <div>
                    {hasImage && (
                      <div className="w-full h-40 rounded-xl overflow-hidden mb-3 border border-stone-800">
                        <img
                          src={item.image!.trim()}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      {hasCut ? (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold">
                          {item.cut.trim()}
                        </span>
                      ) : <span />}
                      {!isAvailable && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 font-bold">
                          Esgotado
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-display font-bold uppercase text-stone-100 mb-1">
                      {item.name}
                    </h3>

                    {hasDescription && (
                      <p className="text-xs text-stone-400 mb-2 leading-relaxed whitespace-pre-line">
                        {item.description.trim()}
                      </p>
                    )}

                    {hasServedWith && (
                      <p className="text-[11px] font-mono text-stone-300 pt-1">
                        🍽️ Acompanha: {item.servedWith!.trim()}
                      </p>
                    )}
                  </div>

                  {item.price && item.price.trim() !== '' && (
                    <div className="pt-3 mt-3 border-t border-stone-800/60 flex justify-between items-center text-xs font-mono">
                      <span className="text-stone-500">Valor:</span>
                      <span className="text-amber-400 font-bold">{item.price.trim()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Barra de Contato WhatsApp da Edição */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center p-8 rounded-3xl bg-stone-950/80 border border-stone-800 max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono uppercase text-amber-500 font-bold tracking-widest block">
            Atendimento Exclusivo da Produção
          </span>
          <p className="text-xs text-stone-400">
            Dúvidas sobre reservas de camarotes fechados, acessibilidade ou parcerias desta edição?
          </p>
          <div className="pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-malt inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg glow-amber cursor-pointer"
            >
              <span>💬</span>
              <span>Falar com a Produção no WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
