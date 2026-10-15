import React, { useState, useEffect } from 'react';
import { HouseLandEvent, SiteSettings } from '../types';
import { getSiteSettings, subscribeToEventStore } from '../services/eventService';
import { playClickBeep } from '../utils/audioFeedback';
import { formatWhatsAppUrl } from '../utils/whatsappHelper';

function formatSocialUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('@')) return `https://instagram.com/${trimmed.slice(1)}`;
  return `https://${trimmed}`;
}

interface PortalHomeProps {
  events: HouseLandEvent[];
  onSelectEvent: (event: HouseLandEvent) => void;
  onOpenAdmin: () => void;
}

function parseEventTimestamp(dateStr?: string, timeStr?: string): number {
  if (!dateStr) return 0;
  
  const direct = Date.parse(dateStr);
  if (!isNaN(direct)) {
    return direct;
  }

  // Regex para "24 de Outubro de 2026" ou "Sábado, 24 de Outubro de 2026"
  const ptMatch = dateStr.match(/(\d{1,2})\s+de\s+([a-zA-ZçÇ]+)\s+de\s+(\d{4})/i);
  if (ptMatch) {
    const day = parseInt(ptMatch[1], 10);
    const monthName = ptMatch[2].toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const year = parseInt(ptMatch[3], 10);
    const months: Record<string, number> = {
      janeiro: 0, fevereiro: 1, marco: 2, marcoz: 2, abril: 3, maio: 4, junho: 5,
      julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
    };
    const month = months[monthName] ?? 0;
    
    let hours = 18;
    let minutes = 0;
    if (timeStr) {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
      }
    }
    return new Date(year, month, day, hours, minutes).getTime();
  }

  const brDateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brDateMatch) {
    const day = parseInt(brDateMatch[1], 10);
    const month = parseInt(brDateMatch[2], 10) - 1;
    const year = parseInt(brDateMatch[3], 10);
    return new Date(year, month, day, 18, 0).getTime();
  }

  return 0;
}

export const PortalHome: React.FC<PortalHomeProps> = ({
  events,
  onSelectEvent,
  onOpenAdmin
}) => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(getSiteSettings());

  const publishedEvents = events.filter(e => e.isPublished !== false);
  const activeEvents = publishedEvents.filter(e => e.status === 'active');
  const pastEvents = publishedEvents.filter(e => e.status === 'past');

  // Resolução de destaque com suporte a countdownEventId do CMS ou data cronológica mais próxima
  const featuredEvent = (() => {
    if (siteSettings.countdownEventId) {
      const explicit = publishedEvents.find(e => e.id === siteSettings.countdownEventId);
      if (explicit) return explicit;
    }

    const now = Date.now();
    const sortedActive = [...activeEvents].sort((a, b) => {
      const timeA = parseEventTimestamp(a.date, a.doorsOpen);
      const timeB = parseEventTimestamp(b.date, b.doorsOpen);
      const diffA = timeA >= now ? timeA - now : Infinity;
      const diffB = timeB >= now ? timeB - now : Infinity;
      if (diffA !== diffB) return diffA - diffB;
      return timeA - timeB;
    });

    return sortedActive[0] || activeEvents[0] || publishedEvents[0];
  })();

  useEffect(() => {
    return subscribeToEventStore(() => {
      setSiteSettings(getSiteSettings());
    });
  }, []);

  // Cálculo da contagem decrescente real baseada no timestamp do featuredEvent
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    if (!featuredEvent) return;

    const targetTime = parseEventTimestamp(featuredEvent.date, featuredEvent.doorsOpen);

    const updateCountdown = () => {
      const now = Date.now();
      const difference = targetTime - now;

      if (difference <= 0 || targetTime === 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: targetTime > 0 && difference <= 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [featuredEvent?.id, featuredEvent?.date, featuredEvent?.doorsOpen]);

  // Cardápio gastronômico com renderização condicional estrita (apenas pratos ativos e cadastrados)
  const activeGastronomy = (featuredEvent?.bbqMenu || []).filter(
    item => item.status !== 'sold_out' && item.name && item.name.trim() !== ''
  );

  return (
    <div className="w-full">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full bg-[#0a0a0d]/90 backdrop-blur-md border-b border-amber-500/20 px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {siteSettings.logoImage ? (
            <img
              src={siteSettings.logoImage}
              alt={siteSettings.brandName || "House Land"}
              style={{ height: `${siteSettings.logoHeight || 40}px` }}
              className="object-contain"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black">
              ⚡
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-display font-bold uppercase tracking-wider text-amber-500 leading-tight">
              {siteSettings.brandName || 'HOUSE LAND ROCK CHOPP'}
            </h1>
            <p className="text-[10px] text-stone-400 font-mono tracking-widest uppercase">
              {siteSettings.brandSubtitle || 'Rock & Craft Beer Experience'}
            </p>
          </div>
        </div>

        <nav className="hidden sm:flex items-center gap-6 text-xs font-mono tracking-wider">
          <a href="#agenda" className="text-stone-300 hover:text-amber-400 transition-colors">
            Festivais
          </a>
          {siteSettings.showMenuSection === true && featuredEvent && featuredEvent.bbqMenu && featuredEvent.bbqMenu.filter(item => item.status !== 'sold_out').length > 0 && (
            <a href="#gastronomia" className="text-stone-300 hover:text-amber-400 transition-colors">
              Gastronomia
            </a>
          )}
          <a href="#sobre" className="text-stone-300 hover:text-amber-400 transition-colors">
            Manifesto
          </a>
          <a 
            href="#contato" 
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('contato') || document.getElementById('parcerias');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
          >
            Contato
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[65vh] flex items-center justify-center overflow-hidden py-16 px-4">
        <div className="absolute inset-0 z-0">
          <img
            src={siteSettings.heroBannerImage || "/assets/images/hero_rock_chopp_event_1790270216046.jpg"}
            alt="House Land"
            className="w-full h-full object-cover brightness-40 contrast-125"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/assets/images/hero_rock_chopp_event_1790270216046.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0d] via-[#0a0a0d]/70 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            {siteSettings.heroBadgeText || 'Edições Confirmadas 2026'}
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold uppercase tracking-tight text-stone-100 leading-none drop-shadow-xl">
            {siteSettings.heroTitle || 'A MAIOR EXPERIÊNCIA DE ROCK N’ ROLL & CHOPP ARTESANAL'}
          </h2>

          <p className="text-sm sm:text-base text-stone-300 max-w-2xl mx-auto leading-relaxed">
            {siteSettings.heroSubtitle || 'A House Land é uma produtora independente dedicada a criar edições lendárias onde o som valvulado e o malte selecionado se encontram.'}
          </p>

          {featuredEvent && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  playClickBeep();
                  onSelectEvent(featuredEvent);
                }}
                className="btn-malt px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider font-bold shadow-xl glow-amber cursor-pointer"
              >
                {siteSettings.ctaButtonText || 'Ver Detalhes & Ingressos'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Countdown Timer */}
      {siteSettings.showCountdown !== false && (
        <section className="max-w-4xl mx-auto px-4 -mt-6 relative z-20">
          <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="text-center sm:text-left">
              <span className="text-[11px] font-mono uppercase text-amber-500 font-bold tracking-widest block mb-1">
                ⚡ Próxima Grande Edição
              </span>
              <h3 className="text-lg font-display font-bold uppercase text-stone-100">
                {featuredEvent?.title || 'House Land Rock Chopp Festival'}
              </h3>
            </div>

            {timeLeft.isPast ? (
              <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Edição em Andamento / Portas Abertas</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {[
                  { label: 'DIAS', val: timeLeft.days },
                  { label: 'HORAS', val: timeLeft.hours },
                  { label: 'MIN', val: timeLeft.minutes },
                  { label: 'SEG', val: timeLeft.seconds }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-stone-950 border border-stone-800">
                      <span className="text-xl font-display font-bold text-amber-400">
                        {String(item.val).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">
                        {item.label}
                      </span>
                    </div>
                    {idx < 3 && <span className="text-amber-500 font-bold text-lg">:</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Agenda Section */}
      <section id="agenda" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold block mb-2">
            Programação Oficial
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold uppercase tracking-wider text-stone-100">
            {siteSettings.agendaSectionTitle || 'Agenda Oficial de Festivais & Rock Sessions'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {publishedEvents.map(evt => (
            <div
              key={evt.id}
              onClick={() => {
                playClickBeep();
                onSelectEvent(evt);
              }}
              className="glass-panel rounded-3xl overflow-hidden border border-stone-800/80 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer group flex flex-col"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={evt.bannerImage}
                  alt={evt.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121318] via-transparent to-transparent"></div>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-black/70 border border-amber-500/40 text-amber-400 text-[11px] font-mono uppercase tracking-wider">
                    {evt.editionBadge}
                  </span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xl font-display font-bold uppercase text-stone-100 group-hover:text-amber-400 transition-colors">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-stone-400 mt-2 line-clamp-3 whitespace-pre-line leading-relaxed">
                    {evt.shortDescription || evt.fullDescription}
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-800 space-y-2 text-xs text-stone-400">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500">📅</span>
                    <span>{evt.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500">📍</span>
                    <span>{evt.location}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-amber-500">
                    {evt.activeTicketMode === 'complimentary' && 'Cortesia VIP Grátis'}
                    {evt.activeTicketMode === 'pre_registration' && 'Fila de Reserva VIP'}
                    {evt.activeTicketMode === 'direct_sale' && `A partir de R$ ${evt.ticketPrices.pista}`}
                  </span>
                  <span className="text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                    Ver Edição →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Seção de Gastronomia & Petiscos (Oculta por padrão na home; exibida apenas se showMenuSection for ativado no CMS E houver pratos ativos) */}
      {siteSettings.showMenuSection === true && activeGastronomy.length > 0 && (
        <section id="gastronomia" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-stone-800/80">
          <div className="text-center mb-12">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold block mb-2">
              Gastronomia & Petiscos
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold uppercase tracking-wider text-stone-100">
              Cardápio Gastronômico • {featuredEvent?.title}
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-2 max-w-xl mx-auto">
              Pratos, burgers, porções e petiscos preparados para a edição.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeGastronomy.map((item, idx) => (
              <div
                key={item.id || idx}
                className="glass-panel p-6 rounded-3xl border border-stone-800 bg-[#0f1015] flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300"
              >
                <div>
                  {item.image && item.image.trim() !== '' && (
                    <div className="w-full h-44 rounded-2xl overflow-hidden mb-4 border border-stone-800/80">
                      <img
                        src={item.image.trim()}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mb-2">
                    {item.cut && item.cut.trim() !== '' && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                        {item.cut.trim()}
                      </span>
                    )}
                    {item.price && item.price.trim() !== '' && (
                      <span className="text-xs font-mono font-bold text-amber-400 ml-auto">
                        {item.price.trim()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-display font-bold uppercase text-stone-100 mb-1">
                    {item.name}
                  </h3>

                  {item.description && item.description.trim() !== '' && (
                    <p className="text-xs text-stone-400 leading-relaxed mt-1 whitespace-pre-line">
                      {item.description.trim()}
                    </p>
                  )}

                  {item.servedWith && item.servedWith.trim() !== '' && (
                    <p className="text-[11px] font-mono text-stone-300 pt-2 mt-2 border-t border-stone-800/60">
                      🍽️ Acompanha: {item.servedWith.trim()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Manifesto / Sobre a House Land */}
      <section id="sobre" className="bg-stone-950/60 border-y border-stone-800 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold block">
            {siteSettings.aboutBadge || 'A NOSSA FILOSOFIA • MANIFESTO'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold uppercase tracking-wider text-stone-100">
            {siteSettings.aboutTitle || 'SOBRE A HOUSE LAND'}
          </h2>
          <p className="text-sm sm:text-base text-stone-300 leading-relaxed max-w-3xl mx-auto whitespace-pre-line">
            {siteSettings.aboutText || 'A House Land nasceu com a missão de resgatar o espírito cru, enérgico e autêntico do Rock n’ Roll, unindo-o à revolução das microcervejarias artesanais brasileiras.'}
          </p>

          {siteSettings.showAboutStats !== false && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
              {(siteSettings.stats || [
                { label: 'Puro Malte & Som Valvulado', value: '100%' },
                { label: 'Público Acumulado', value: '+15 Mil' },
                { label: 'De Tradição Independente', value: '8 Anos' }
              ]).map((stat, idx) => (
                <div key={idx} className="glass-panel p-6 rounded-2xl border border-stone-800 text-center">
                  <span className="text-2xl sm:text-3xl font-display font-black text-amber-500 block mb-1">
                    {stat.value}
                  </span>
                  <span className="text-xs font-mono text-stone-400 uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Galeria de Edições Históricas (Ativada pelo CMS) */}
      {siteSettings.showPastEventsSection && pastEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-stone-800/80">
          <div className="text-center mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold block mb-1">
              Histórico & Tradição
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold uppercase text-stone-100">
              Edições Anteriores da House Land
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map(evt => (
              <div
                key={evt.id}
                onClick={() => {
                  playClickBeep();
                  onSelectEvent(evt);
                }}
                className="glass-panel rounded-3xl overflow-hidden border border-stone-800 opacity-80 hover:opacity-100 transition-all cursor-pointer group flex flex-col"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={evt.bannerImage}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/80 border border-stone-700 text-stone-300 text-[10px] font-mono uppercase">
                      {evt.editionBadge}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="text-base font-display font-bold uppercase text-stone-200 group-hover:text-amber-400">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-stone-400 line-clamp-3 mt-1 whitespace-pre-line leading-relaxed">
                      {evt.shortDescription || evt.fullDescription}
                    </p>
                  </div>
                  <p className="text-[11px] font-mono text-amber-500 pt-2 border-t border-stone-800">
                    📅 {evt.date} • {evt.attendeesCount ? `+${evt.attendeesCount} participantes` : 'Concluído'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contato & Parcerias WhatsApp e Redes Sociais */}
      <div id="parcerias" className="relative -top-24 invisible"></div>
      <section id="contato" className="max-w-5xl mx-auto px-4 py-20 text-center space-y-6">
        <span className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold block">
          {siteSettings.partnershipBadge || 'CONTATO'}
        </span>
        <h2 className="text-2xl sm:text-3xl font-display font-bold uppercase text-stone-100">
          {siteSettings.partnershipTitle || 'Quer tirar uma dúvida?'}
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 max-w-xl mx-auto whitespace-pre-line leading-relaxed">
          {siteSettings.partnershipDescription || 'Se você tem uma dúvida, entre em contato direto com a equipe da produtora.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href={formatWhatsAppUrl(siteSettings.ctaPartnershipWhatsapp || siteSettings.productionWhatsapp || siteSettings.contactWhatsapp, 'Olá, equipe House Land! Gostaria de tirar dúvidas sobre os eventos da produtora.')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-malt inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg glow-amber"
          >
            <span>💬</span>
            <span>{siteSettings.partnershipBtnText || 'FALAR COM A PRODUÇÃO NO WHATSAPP'}</span>
          </a>

          {/* Instagram Oficial da Produtora */}
          {siteSettings.instagramUrl && siteSettings.instagramUrl.trim() !== '' && (
            <a
              href={formatSocialUrl(siteSettings.instagramUrl)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Oficial House Land"
              title="Acompanhe o Instagram Oficial da House Land"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-xs uppercase font-bold tracking-wider bg-stone-900/90 border border-stone-800 hover:border-pink-500/60 hover:bg-stone-800 text-stone-300 hover:text-pink-400 transition-all duration-200 shadow-lg hover:scale-105 group cursor-pointer"
            >
              <svg className="w-4 h-4 fill-currentColor text-pink-500 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Instagram Oficial</span>
            </a>
          )}
        </div>
      </section>
    </div>
  );
};
