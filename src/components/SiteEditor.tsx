import React, { useState } from 'react';
import { SiteSettings, HouseLandEvent } from '../types';
import { saveSiteSettings, initialSiteSettings, DEFAULT_SITE_SETTINGS, normalizeImageUrl, getEvents } from '../services/eventService';
import { playClickBeep, playSuccessBeep } from '../utils/audioFeedback';
import { ImageUploader } from './ImageUploader';

interface SiteEditorProps {
  initialSettings: SiteSettings;
  onSave?: (updated: SiteSettings) => void;
}

// Imagens pré-carregadas da House Land para seleção rápida de banner
const PRESET_BANNERS = [
  {
    label: 'Hero Principal - Rock & Chopp',
    url: '/assets/images/hero_rock_chopp_event_1790270216046.jpg'
  },
  {
    label: 'Sunset Sessions - Acústico Vintage',
    url: '/assets/images/sunset_acoustic_rock_1790271896648.jpg'
  },
  {
    label: 'Craft Beer Experience - Torneiras & Malte',
    url: '/assets/images/craft_beer_experience_1790270255429.jpg'
  },
  {
    label: 'Edição Histórica - Multidão & Celebração',
    url: '/assets/images/past_festival_crowd_1790271883019.jpg'
  },
  {
    label: 'Vintage Overdrive - Palco Hard Rock',
    url: '/assets/images/band_vintage_overdrive_1790270229479.jpg'
  },
  {
    label: 'Malt & Blues Trio - Som Valvulado',
    url: '/assets/images/band_malt_blues_1790270239674.jpg'
  }
];

export const SiteEditor: React.FC<SiteEditorProps> = ({ initialSettings, onSave }) => {
  const [settings, setSettings] = useState<SiteSettings>({
    ...DEFAULT_SITE_SETTINGS,
    ...initialSettings
  });
  const [eventsList] = useState<HouseLandEvent[]>(getEvents());

  const [activeSubTab, setActiveSubTab] = useState<'hero' | 'agenda' | 'about' | 'partnerships' | 'footer' | 'preview'>('hero');
  const [toastMessage, setToastMessage] = useState('');
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetTargetField, setPresetTargetField] = useState<'heroBannerImage' | 'aboutLogoUrl' | 'logoImage'>('heroBannerImage');

  const handleFieldChange = (field: keyof SiteSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    playClickBeep();
    const updated = saveSiteSettings(settings);
    playSuccessBeep();
    setToastMessage('Configurações do site salvas com sucesso no banco de dados e Firestore!');
    if (onSave) onSave(updated);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleResetToDefaults = () => {
    if (confirm('Deseja restaurar todas as configurações visuais do site para o padrão oficial da House Land?')) {
      playClickBeep();
      setSettings({ ...initialSiteSettings });
      saveSiteSettings(initialSiteSettings);
      playSuccessBeep();
      setToastMessage('Configurações visuais restauradas para os padrões oficiais.');
      if (onSave) onSave(initialSiteSettings);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  // Funções para gerenciar o array de estatísticas da seção Sobre
  const handleStatChange = (index: number, key: 'label' | 'value', val: string) => {
    const list = [...(settings.stats || [])];
    if (list[index]) {
      list[index] = { ...list[index], [key]: val };
      handleFieldChange('stats', list);
    }
  };

  const handleAddStat = () => {
    playClickBeep();
    const list = [...(settings.stats || [])];
    list.push({ label: 'Nova Métrica', value: '100%' });
    handleFieldChange('stats', list);
  };

  const handleRemoveStat = (index: number) => {
    playClickBeep();
    const list = [...(settings.stats || [])];
    list.splice(index, 1);
    handleFieldChange('stats', list);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header com Ações Globais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono uppercase tracking-widest font-bold mb-1.5">
            CMS & Personalização Visual em Tempo Real
          </div>
          <h2 className="text-2xl font-display font-bold uppercase text-stone-100">
            Editor Visual Completo do Site
          </h2>
          <p className="text-xs text-stone-400">
            Altere a identidade da marca, banners, chamadas, manifesto e rodapé do portal público
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-stone-400 hover:text-white text-xs font-bold transition-all"
            title="Restaurar valores padrão"
          >
            ↺ Restaurar Padrões
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="btn-malt px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg glow-amber flex items-center gap-2 cursor-pointer"
          >
            <span>💾</span>
            <span>Salvar Configurações</span>
          </button>
        </div>
      </div>

      {/* Toast de Feedback */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="text-base text-emerald-400">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navegação por Sub-Abas do Editor */}
      <div className="flex flex-wrap gap-2 border-b border-stone-800/80 pb-3">
        {[
          { id: 'hero', label: 'Identidade & Hero Banner', icon: '🎨' },
          { id: 'agenda', label: 'Agenda & Programação', icon: '📅' },
          { id: 'about', label: 'Manifesto & Sobre', icon: '📜' },
          { id: 'partnerships', label: 'Contato & Parcerias', icon: '🤝' },
          { id: 'footer', label: 'Contatos & Rodapé', icon: '🏢' },
          { id: 'preview', label: 'Pré-visualização Rápida', icon: '👁️' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              playClickBeep();
              setActiveSubTab(tab.id as any);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === tab.id
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-md'
                : 'text-stone-400 bg-stone-900/60 border border-stone-800 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* 1. IDENTIDADE VISUAL & HERO BANNER                       */}
      {/* ======================================================== */}
      {activeSubTab === 'hero' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Bloco Logotipo & Marca */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-800/80 space-y-6">
            <h3 className="text-sm font-display font-bold uppercase text-amber-400 tracking-wider flex items-center gap-2">
              <span>Logotipo & Nome da Marca</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Nome da Marca no Cabeçalho
                </label>
                <input
                  type="text"
                  value={settings.brandName || ''}
                  onChange={e => handleFieldChange('brandName', e.target.value)}
                  placeholder="Ex: HOUSE LAND ROCK CHOPP"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Subtítulo da Marca (Slogan)
                </label>
                <input
                  type="text"
                  value={settings.brandSubtitle || ''}
                  onChange={e => handleFieldChange('brandSubtitle', e.target.value)}
                  placeholder="Ex: Rock & Craft Beer Experience"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
              <div className="sm:col-span-2">
                <ImageUploader
                  label="Logotipo da Marca"
                  value={settings.logoImage || ''}
                  onChange={val => handleFieldChange('logoImage', val)}
                  placeholder="https://exemplo.com/logo-houseland.png"
                  recommendedSize="250x80px PNG transparente"
                  previewHeight="h-24"
                  storageFolder="cms/logos"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Se deixado em branco, o portal utiliza o ícone elétrico oficial estilizado com tipografia Oswald.
                </span>
              </div>

              <div className="pt-1">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-stone-300">
                    Altura do Logo: {settings.logoHeight || 40}px
                  </label>
                </div>
                <input
                  type="range"
                  min="24"
                  max="80"
                  step="2"
                  value={settings.logoHeight || 40}
                  onChange={e => handleFieldChange('logoHeight', Number(e.target.value))}
                  className="w-full h-2 bg-stone-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Ajuste entre 24px e 80px para encaixe no topo
                </span>
              </div>
            </div>
          </div>

          {/* Bloco Hero Principal & Banner */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-800/80 space-y-6">
            <h3 className="text-sm font-display font-bold uppercase text-amber-400 tracking-wider flex items-center justify-between">
              <span>Hero Banner & Chamada de Impacto</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Badge de Destaque Superior
                </label>
                <input
                  type="text"
                  value={settings.heroBadgeText || ''}
                  onChange={e => handleFieldChange('heroBadgeText', e.target.value)}
                  placeholder="Ex: Edições Confirmadas 2026"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Texto do Botão de Chamada (CTA)
                </label>
                <input
                  type="text"
                  value={settings.ctaButtonText || ''}
                  onChange={e => handleFieldChange('ctaButtonText', e.target.value)}
                  placeholder="Ex: Ver Detalhes & Ingressos"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                Título Principal de Impacto (Hero)
              </label>
              <textarea
                rows={2}
                value={settings.heroTitle || ''}
                onChange={e => handleFieldChange('heroTitle', e.target.value)}
                placeholder="A MAIOR EXPERIÊNCIA DE ROCK N’ ROLL & CHOPP ARTESANAL"
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-display uppercase tracking-wide leading-snug"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                Subtítulo Explicativo do Hero
              </label>
              <textarea
                rows={3}
                value={settings.heroSubtitle || ''}
                onChange={e => handleFieldChange('heroSubtitle', e.target.value)}
                placeholder="A House Land é uma produtora independente dedicada a criar edições lendárias..."
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none leading-relaxed"
              />
            </div>

            {/* Imagem de Fundo com Upload e Galeria */}
            <div>
              <ImageUploader
                label="Banner de Fundo do Hero Principal"
                value={settings.heroBannerImage || ''}
                onChange={val => handleFieldChange('heroBannerImage', val)}
                onOpenGallery={() => {
                  setPresetTargetField('heroBannerImage');
                  setShowPresetModal(true);
                }}
                placeholder="/assets/images/hero_rock_chopp_event_1790270216046.jpg"
                recommendedSize="1920x1080px JPG / WEBP com tema escuro"
                previewHeight="h-44"
                storageFolder="cms/hero_banners"
              />
            </div>

            {/* Seletor do Evento em Destaque do Hero / Cronômetro */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-300 block mb-1">
                Evento em Destaque do Hero / Contagem Regressiva
              </label>
              <select
                value={settings.countdownEventId || ''}
                onChange={e => handleFieldChange('countdownEventId', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-amber-400 font-bold focus:border-amber-500 outline-none"
              >
                <option value="">Automático (Próxima data cronológica)</option>
                {eventsList.map(evt => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.editionBadge}) • {evt.date}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-stone-500 block">
                Define qual edição ocupa o botão de ação principal do Hero e a barra de contagem regressiva da Home.
              </span>
            </div>

            {/* Alternador do Cronômetro Regressivo */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-200 block">
                  Exibir Barra de Cronômetro Regressivo
                </span>
                <span className="text-[11px] text-stone-400">
                  Mostra a contagem regressiva para a próxima grande edição na página inicial
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleFieldChange('showCountdown', settings.showCountdown === false ? true : false)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  settings.showCountdown !== false ? 'bg-amber-500' : 'bg-stone-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-stone-950 transition-transform ${
                    settings.showCountdown !== false ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 2. AGENDA & PROGRAMAÇÃO                                  */}
      {/* ======================================================== */}
      {activeSubTab === 'agenda' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-800/80 space-y-6">
            <h3 className="text-sm font-display font-bold uppercase text-amber-400 tracking-wider">
              Configurações da Grade de Eventos
            </h3>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                Título Principal da Seção de Agenda
              </label>
              <input
                type="text"
                value={settings.agendaSectionTitle || ''}
                onChange={e => handleFieldChange('agendaSectionTitle', e.target.value)}
                placeholder="Ex: Agenda Oficial de Festivais & Rock Sessions"
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-200 block">
                  Exibir Galeria de Edições Históricas (Passadas)
                </span>
                <span className="text-[11px] text-stone-400">
                  Mostra festivais concluídos no portal como histórico de público e fotos
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleFieldChange('showPastEventsSection', !settings.showPastEventsSection)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  settings.showPastEventsSection ? 'bg-amber-500' : 'bg-stone-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-stone-950 transition-transform ${
                    settings.showPastEventsSection ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-200 block">
                  Exibir Cardápio Gastronômico na Página Inicial
                </span>
                <span className="text-[11px] text-stone-400">
                  Por padrão desativado. Quando desativado, o cardápio e petiscos são exibidos exclusivamente dentro dos detalhes de cada festival
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleFieldChange('showMenuSection', !settings.showMenuSection)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  settings.showMenuSection ? 'bg-amber-500' : 'bg-stone-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-stone-950 transition-transform ${
                    settings.showMenuSection ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MANIFESTO & SOBRE                                     */}
      {/* ======================================================== */}
      {activeSubTab === 'about' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-800/80 space-y-6">
            <h3 className="text-sm font-display font-bold uppercase text-amber-400 tracking-wider">
              Manifesto & Filosofia da House Land
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Badge Superior do Manifesto
                </label>
                <input
                  type="text"
                  value={settings.aboutBadge || ''}
                  onChange={e => handleFieldChange('aboutBadge', e.target.value)}
                  placeholder="Ex: A NOSSA FILOSOFIA • MANIFESTO"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Título da Seção Sobre
                </label>
                <input
                  type="text"
                  value={settings.aboutTitle || ''}
                  onChange={e => handleFieldChange('aboutTitle', e.target.value)}
                  placeholder="Ex: SOBRE A HOUSE LAND"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                Texto Completo do Manifesto
              </label>
              <textarea
                rows={5}
                value={settings.aboutText || ''}
                onChange={e => handleFieldChange('aboutText', e.target.value)}
                placeholder="A House Land nasceu com a missão de resgatar o espírito cru, enérgico e autêntico do Rock n’ Roll..."
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none leading-relaxed"
              />
            </div>

            {/* Imagem / Selo do Manifesto com Upload e Galeria */}
            <div>
              <ImageUploader
                label="Emblema / Foto Ilustrativa do Manifesto (Opcional)"
                value={settings.aboutLogoUrl || ''}
                onChange={val => handleFieldChange('aboutLogoUrl', val)}
                onOpenGallery={() => {
                  setPresetTargetField('aboutLogoUrl');
                  setShowPresetModal(true);
                }}
                placeholder="https://exemplo.com/emblema-ou-foto-manifesto.jpg"
                recommendedSize="800x600px ou formato quadrado"
                previewHeight="h-32"
                storageFolder="cms/about"
              />
            </div>

            {/* Alternador de Estatísticas */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-200 block">
                  Exibir Cards de Estatísticas de Impacto
                </span>
                <span className="text-[11px] text-stone-400">
                  Mostra métricas como % de Malte, Público Acumulado e Anos de Tradição
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleFieldChange('showAboutStats', !settings.showAboutStats)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  settings.showAboutStats ? 'bg-amber-500' : 'bg-stone-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-stone-950 transition-transform ${
                    settings.showAboutStats ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Editor de Métricas Dinâmicas */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-amber-400 font-bold">
                  Métricas de Impacto Configuradas ({settings.stats?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={handleAddStat}
                  className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 hover:bg-stone-800 text-xs font-bold"
                >
                  + Nova Métrica
                </button>
              </div>

              {(settings.stats || []).map((stat, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-center gap-3">
                  <div className="w-1/3">
                    <label className="text-[10px] font-mono text-stone-500 block mb-1">VALOR DE IMPACTO</label>
                    <input
                      type="text"
                      value={stat.value}
                      onChange={e => handleStatChange(idx, 'value', e.target.value)}
                      placeholder="100%"
                      className="w-full px-3 py-2 rounded-xl bg-[#121318] border border-stone-800 text-xs text-amber-400 font-bold outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-mono text-stone-500 block mb-1">RÓTULO DESCRITIVO</label>
                    <input
                      type="text"
                      value={stat.label}
                      onChange={e => handleStatChange(idx, 'label', e.target.value)}
                      placeholder="Puro Malte & Som Valvulado"
                      className="w-full px-3 py-2 rounded-xl bg-[#121318] border border-stone-800 text-xs text-stone-100 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStat(idx)}
                    className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/30 text-xs mt-3.5"
                    title="Excluir métrica"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. PARCERIAS & CERVEJARIAS                               */}
      {/* ======================================================== */}
      {activeSubTab === 'partnerships' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-800/80 space-y-6">
            <h3 className="text-sm font-display font-bold uppercase text-amber-400 tracking-wider">
              Chamada para Bandas, Cervejarias & Patrocinadores
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Badge Superior da Seção
                </label>
                <input
                  type="text"
                  value={settings.partnershipBadge || ''}
                  onChange={e => handleFieldChange('partnershipBadge', e.target.value)}
                  placeholder="Ex: PARCERIAS, BANDAS & CERVEJARIAS"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Título da Chamada de Parceria
                </label>
                <input
                  type="text"
                  value={settings.partnershipTitle || ''}
                  onChange={e => handleFieldChange('partnershipTitle', e.target.value)}
                  placeholder="Ex: QUER TOCAR OU SERVIR NO FESTIVAL?"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                Descrição da Proposta de Curadoria
              </label>
              <textarea
                rows={3}
                value={settings.partnershipDescription || ''}
                onChange={e => handleFieldChange('partnershipDescription', e.target.value)}
                placeholder="Se você tem uma banda autoral, tributo lendário ou representa uma cervejaria artesanal..."
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Rótulo do Botão de WhatsApp
                </label>
                <input
                  type="text"
                  value={settings.partnershipBtnText || ''}
                  onChange={e => handleFieldChange('partnershipBtnText', e.target.value)}
                  placeholder="FALAR COM A PRODUÇÃO NO WHATSAPP"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  WhatsApp Oficial para Parcerias
                </label>
                <input
                  type="text"
                  value={settings.ctaPartnershipWhatsapp || ''}
                  onChange={e => handleFieldChange('ctaPartnershipWhatsapp', e.target.value)}
                  placeholder="Ex: (21) 99731-3305 ou https://wa.me/5521997313305"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Aceita link completo (https://wa.me/... ou https://api.whatsapp.com/...) ou número com DDD.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-400 block mb-1.5 flex items-center gap-1.5">
                  <span>📱</span>
                  <span>WhatsApp da Produção & Atendimento (Página do Evento)</span>
                </label>
                <input
                  type="text"
                  value={settings.productionWhatsapp || ''}
                  onChange={e => handleFieldChange('productionWhatsapp', e.target.value)}
                  placeholder="(XX) XXXXX-XXXX"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-amber-500/40 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Dica: Formato recomendado (XX) XXXXX-XXXX. Este é o número oficial acionado no botão "FALAR COM A PRODUÇÃO NO WHATSAPP" na página de cada evento.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. CONTATOS & RODAPÉ INSTITUCIONAL                       */}
      {/* ======================================================== */}
      {activeSubTab === 'footer' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-800/80 space-y-6">
            <h3 className="text-sm font-display font-bold uppercase text-amber-400 tracking-wider">
              Contatos e Informações Corporativas
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  E-mail Oficial da Produtora
                </label>
                <input
                  type="email"
                  value={settings.contactEmail || ''}
                  onChange={e => handleFieldChange('contactEmail', e.target.value)}
                  placeholder="contato@houseland.online"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  WhatsApp Geral de Atendimento
                </label>
                <input
                  type="text"
                  value={settings.contactWhatsapp || ''}
                  onChange={e => handleFieldChange('contactWhatsapp', e.target.value)}
                  placeholder="Ex: (21) 99731-3305 ou https://wa.me/5521997313305"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Aceita link completo (https://wa.me/...) ou número com DDD.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-400 block mb-1.5 flex items-center gap-1.5">
                  <span>📱</span>
                  <span>WhatsApp da Produção & Atendimento (Página do Evento)</span>
                </label>
                <input
                  type="text"
                  value={settings.productionWhatsapp || ''}
                  onChange={e => handleFieldChange('productionWhatsapp', e.target.value)}
                  placeholder="(XX) XXXXX-XXXX"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-amber-500/40 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Número acionado no botão "FALAR COM A PRODUÇÃO NO WHATSAPP" na página de cada evento.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Título da Marca no Rodapé
                </label>
                <input
                  type="text"
                  value={settings.footerBrandTitle || ''}
                  onChange={e => handleFieldChange('footerBrandTitle', e.target.value)}
                  placeholder="HOUSE LAND ROCK CHOPP"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  CNPJ Oficial da Produtora
                </label>
                <input
                  type="text"
                  value={settings.footerCnpj || ''}
                  onChange={e => handleFieldChange('footerCnpj', e.target.value)}
                  placeholder="48.123.456/0001-78"
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-200 block">
                  Exibir CNPJ no Rodapé
                </span>
                <span className="text-[11px] text-stone-400">
                  Por padrão desativado (opcional). Quando ativado, o CNPJ configurado acima é exibido aos visitantes no rodapé
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleFieldChange('showCnpj', !settings.showCnpj)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  settings.showCnpj ? 'bg-amber-500' : 'bg-stone-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-stone-950 transition-transform ${
                    settings.showCnpj ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                Descrição Institucional no Rodapé
              </label>
              <textarea
                rows={2}
                value={settings.footerBrandDescription || ''}
                onChange={e => handleFieldChange('footerBrandDescription', e.target.value)}
                placeholder="Produtora e Portal oficial de eventos autorais de Rock n' Roll, Chopp Artesanal e Gastronomia Defumada."
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                Aviso Legal / Classificação Indicativa (18+)
              </label>
              <input
                type="text"
                value={settings.footerDisclaimer || ''}
                onChange={e => handleFieldChange('footerDisclaimer', e.target.value)}
                placeholder="Eventos destinados a maiores de 18 anos. Beba com moderação. Se beber, não dirija."
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none"
              />
            </div>

            {/* Seção: Canais & Redes Sociais da Marca */}
            <div className="pt-6 border-t border-stone-800/80 space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase text-amber-500 font-bold tracking-wider mb-1">
                  Canais & Redes Sociais da Marca
                </h4>
                <p className="text-[11px] text-stone-400">
                  Os links oficiais configurados serão exibidos com ícones interativos e atalhos diretos no rodapé da plataforma
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1.5 flex items-center gap-1.5">
                    <span>📸</span> Instagram Oficial
                  </label>
                  <input
                    type="url"
                    value={settings.instagramUrl || ''}
                    onChange={e => handleFieldChange('instagramUrl', e.target.value)}
                    placeholder="https://instagram.com/houselandrockchopp"
                    className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Link do perfil oficial do festival
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1.5 flex items-center gap-1.5">
                    <span>🎵</span> Spotify / Playlist Oficial
                  </label>
                  <input
                    type="url"
                    value={settings.spotifyUrl || ''}
                    onChange={e => handleFieldChange('spotifyUrl', e.target.value)}
                    placeholder="https://open.spotify.com/..."
                    className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Link da playlist oficial do evento
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1.5 flex items-center gap-1.5">
                    <span>▶️</span> YouTube / Canal de Vídeos
                  </label>
                  <input
                    type="url"
                    value={settings.youtubeUrl || ''}
                    onChange={e => handleFieldChange('youtubeUrl', e.target.value)}
                    placeholder="https://youtube.com/@..."
                    className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none font-mono"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Link do canal ou aftermovies oficiais
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. PRÉ-VISUALIZAÇÃO AO VIVO                              */}
      {/* ======================================================== */}
      {activeSubTab === 'preview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="glass-panel p-6 rounded-3xl border border-stone-800/80 space-y-4">
            <span className="text-xs font-mono uppercase text-amber-500 font-bold block">
              Pré-visualização do Hero Banner em Tempo Real
            </span>

            <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
              <img
                src={normalizeImageUrl(settings.heroBannerImage || '/assets/images/hero_rock_chopp_event_1790270216046.jpg')}
                alt="Preview Hero"
                className="absolute inset-0 w-full h-full object-cover brightness-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0d] via-transparent to-transparent"></div>

              <div className="relative z-10 space-y-3 max-w-xl mx-auto">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                  {settings.heroBadgeText || 'Edições Confirmadas'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-bold uppercase text-stone-100">
                  {settings.heroTitle || 'HOUSE LAND ROCK CHOPP'}
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {settings.heroSubtitle}
                </p>
                <div className="pt-2">
                  <span className="btn-malt inline-block px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg">
                    {settings.ctaButtonText || 'Ver Detalhes'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Imagens da Galeria Preset */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#121318] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-base font-display font-bold uppercase text-amber-400">
                Selecione uma Imagem da Produtora
              </h3>
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="w-8 h-8 rounded-full bg-stone-900 border border-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
              {PRESET_BANNERS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    handleFieldChange(presetTargetField, preset.url);
                    setShowPresetModal(false);
                    playClickBeep();
                  }}
                  className="glass-panel p-3 rounded-2xl border border-stone-800 hover:border-amber-500 transition-all cursor-pointer group space-y-2"
                >
                  <div className="h-32 rounded-xl overflow-hidden">
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="text-xs font-semibold text-stone-200 group-hover:text-amber-400 block truncate">
                    {preset.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-xs text-stone-300 hover:text-white font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Ações Inferior Fixa */}
      <div className="flex items-center justify-between pt-6 border-t border-stone-800/80">
        <span className="text-xs text-stone-500">
          As alterações salvas são sincronizadas em tempo real com o Firestore e refletem imediatamente no portal.
        </span>

        <button
          type="button"
          onClick={handleSave}
          className="btn-malt px-8 py-3.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-xl glow-amber flex items-center gap-2 cursor-pointer"
        >
          <span>💾</span>
          <span>Salvar Configurações do Site</span>
        </button>
      </div>

    </div>
  );
};
