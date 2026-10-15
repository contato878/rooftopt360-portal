import React, { useState, useEffect } from 'react';
import { getSiteSettings, subscribeToEventStore } from '../services/eventService';
import { playClickBeep } from '../utils/audioFeedback';
import { SiteSettings } from '../types';

interface FooterProps {
  currentView: 'portal' | 'event' | 'admin';
  onNavigate: (view: 'portal' | 'admin') => void;
  settings?: SiteSettings;
}

export const Footer: React.FC<FooterProps> = ({ currentView, onNavigate, settings: propSettings }) => {
  const [settings, setSettings] = useState<SiteSettings>(propSettings || getSiteSettings());

  useEffect(() => {
    if (propSettings) {
      setSettings(propSettings);
    }
  }, [propSettings]);

  useEffect(() => {
    return subscribeToEventStore(() => {
      setSettings(getSiteSettings());
    });
  }, []);

  const formatSocialUrl = (url?: string, platform: 'instagram' | 'spotify' | 'youtube' = 'instagram') => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('@')) {
      if (platform === 'instagram') return `https://instagram.com/${trimmed.slice(1)}`;
    }
    return `https://${trimmed}`;
  };

  const hasSocials = Boolean(
    (settings.instagramUrl && settings.instagramUrl.trim()) ||
    (settings.spotifyUrl && settings.spotifyUrl.trim()) ||
    (settings.youtubeUrl && settings.youtubeUrl.trim())
  );

  return (
    <footer className="w-full bg-[#0a0a0d] border-t border-amber-500/15 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-6">
        
        {/* Brand */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-wider text-amber-500">
            {settings.footerBrandTitle || 'HOUSE LAND ROCK CHOPP'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 max-w-lg whitespace-pre-line leading-relaxed">
            {settings.footerBrandDescription || "Produtora e Portal oficial de eventos autorais de Rock n' Roll, Chopp Artesanal e Gastronomia Defumada."}
          </p>
        </div>

        {/* Redes Sociais Oficiais */}
        {hasSocials && (
          <div className="flex items-center justify-center gap-3 pt-1 pb-1">
            {settings.instagramUrl && settings.instagramUrl.trim() && (
              <a
                href={formatSocialUrl(settings.instagramUrl, 'instagram')}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Oficial House Land"
                title="Instagram Oficial"
                className="w-10 h-10 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-pink-500/60 hover:bg-stone-800 text-stone-400 hover:text-pink-400 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg group cursor-pointer"
              >
                <svg className="w-5 h-5 fill-currentColor transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            )}

            {settings.spotifyUrl && settings.spotifyUrl.trim() && (
              <a
                href={formatSocialUrl(settings.spotifyUrl, 'spotify')}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Spotify / Playlist Oficial House Land"
                title="Playlist Oficial no Spotify"
                className="w-10 h-10 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-800 text-stone-400 hover:text-amber-400 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg group cursor-pointer"
              >
                <svg className="w-5 h-5 fill-currentColor transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.495 17.303c-.215.353-.674.465-1.027.25-2.814-1.72-6.357-2.109-10.53-1.155-.403.092-.803-.158-.895-.561-.092-.403.159-.803.562-.896 4.571-1.045 8.492-.598 11.64 1.334.353.215.465.674.25 1.028zm1.465-3.256c-.27.44-.849.578-1.287.308-3.22-1.979-8.129-2.551-11.938-1.393-.494.15-1.022-.132-1.172-.627-.15-.494.133-1.022.627-1.172 4.356-1.325 9.771-.685 13.462 1.597.439.27.577.848.308 1.287zm.125-3.391C15.228 8.358 8.877 8.147 5.17 9.273c-.59.18-1.218-.157-1.398-.747-.18-.59.157-1.218.747-1.398 4.26-1.293 11.272-1.044 15.602 1.528.53.314.704 1.002.39 1.532-.314.53-1.002.704-1.532.39z"/>
                </svg>
              </a>
            )}

            {settings.youtubeUrl && settings.youtubeUrl.trim() && (
              <a
                href={formatSocialUrl(settings.youtubeUrl, 'youtube')}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube / Canal Oficial House Land"
                title="Canal Oficial no YouTube"
                className="w-10 h-10 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-800 text-stone-400 hover:text-amber-400 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg group cursor-pointer"
              >
                <svg className="w-5 h-5 fill-currentColor transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-stone-500 max-w-md">
          {settings.footerDisclaimer || 'Eventos destinados a maiores de 18 anos. Beba com moderação. Se beber, não dirija.'}
        </p>

        {/* CNPJ (Opcional: Exibido apenas se showCnpj for true E houver CNPJ configurado) */}
        {settings.showCnpj && settings.footerCnpj && settings.footerCnpj.trim() !== '' && (
          <p className="text-[11px] font-mono text-stone-600">
            CNPJ: {settings.footerCnpj.trim()}
          </p>
        )}

        {/* Acesso Administrativo Discreto no Rodapé */}
        <div className="pt-3 border-t border-stone-900/60 w-full flex items-center justify-center">
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              playClickBeep();
              onNavigate('admin');
            }}
            className="text-[11px] font-mono text-stone-600 hover:text-stone-300 transition-colors inline-flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-stone-900/50"
            title="Acesso exclusivo para equipe e produtores"
          >
            <span>🔒</span>
            <span>Acesso Restrito • Produção</span>
          </a>
        </div>

        <div className="text-[10px] text-stone-600">
          © {new Date().getFullYear()} House Land Rock Chopp Produções Artísticas LTDA. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};
