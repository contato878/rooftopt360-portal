import React, { useState } from 'react';
import { HouseLandEvent, BeerTap, BbqItem } from '../types';
import { updateEvent, DEFAULT_BEER_TAPS, DEFAULT_BBQ_MENU } from '../services/eventService';
import { playClickBeep, playSuccessBeep } from '../utils/audioFeedback';

interface MenuManagementTabProps {
  events: HouseLandEvent[];
  onEventUpdated?: (updated: HouseLandEvent) => void;
}

export const MenuManagementTab: React.FC<MenuManagementTabProps> = ({
  events,
  onEventUpdated
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [activeSubTab, setActiveSubTab] = useState<'taps' | 'bbq'>('taps');
  const [toastMessage, setToastMessage] = useState('');

  // Evento em edição
  const currentEvent = events.find(e => e.id === selectedEventId) || events[0];

  // Estado local das torneiras e do bbq
  const [taps, setTaps] = useState<BeerTap[]>(
    currentEvent?.beerTaps && currentEvent.beerTaps.length > 0 ? currentEvent.beerTaps : DEFAULT_BEER_TAPS
  );
  const [bbqItems, setBbqItems] = useState<BbqItem[]>(
    currentEvent?.bbqMenu && currentEvent.bbqMenu.length > 0 ? currentEvent.bbqMenu : DEFAULT_BBQ_MENU
  );

  // Estados de formulário para nova torneira ou prato
  const [editingTap, setEditingTap] = useState<BeerTap | null>(null);
  const [isTapModalOpen, setIsTapModalOpen] = useState(false);

  const [editingBbq, setEditingBbq] = useState<BbqItem | null>(null);
  const [isBbqModalOpen, setIsBbqModalOpen] = useState(false);

  // Quando troca de evento
  const handleSelectEvent = (eventId: string) => {
    playClickBeep();
    setSelectedEventId(eventId);
    const target = events.find(e => e.id === eventId);
    if (target) {
      setTaps(target.beerTaps && target.beerTaps.length > 0 ? target.beerTaps : DEFAULT_BEER_TAPS);
      setBbqItems(target.bbqMenu && target.bbqMenu.length > 0 ? target.bbqMenu : DEFAULT_BBQ_MENU);
    }
  };

  // Salvar no Evento
  const handleSaveAll = () => {
    if (!currentEvent) return;
    playClickBeep();
    const updated = updateEvent(currentEvent.id, {
      beerTaps: taps,
      bbqMenu: bbqItems
    });
    playSuccessBeep();
    setToastMessage(`Torneiras e Cardápio da edição "${currentEvent.title}" salvos com sucesso!`);
    if (updated && onEventUpdated) onEventUpdated(updated);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Restaurar padrões
  const handleResetToDefaults = () => {
    if (confirm('Deseja restaurar as torneiras e cardápio desta edição para a curadoria padrão da House Land?')) {
      playClickBeep();
      setTaps([...DEFAULT_BEER_TAPS]);
      setBbqItems([...DEFAULT_BBQ_MENU]);
      if (currentEvent) {
        updateEvent(currentEvent.id, {
          beerTaps: DEFAULT_BEER_TAPS,
          bbqMenu: DEFAULT_BBQ_MENU
        });
      }
      playSuccessBeep();
      setToastMessage('Curadoria padrão restaurada!');
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  // ----------------------------------------------------
  // GESTÃO DE TORNEIRAS
  // ----------------------------------------------------
  const handleToggleTapStatus = (index: number) => {
    playClickBeep();
    const list = [...taps];
    const currentStatus = list[index].status || 'available';
    list[index] = {
      ...list[index],
      status: currentStatus === 'available' ? 'sold_out' : 'available'
    };
    setTaps(list);
  };

  const handleMoveTap = (index: number, direction: 'up' | 'down') => {
    playClickBeep();
    const list = [...taps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setTaps(list);
  };

  const handleDeleteTap = (index: number) => {
    if (confirm(`Excluir a torneira "${taps[index].name}"?`)) {
      playClickBeep();
      const list = [...taps];
      list.splice(index, 1);
      setTaps(list);
    }
  };

  const handleOpenAddTap = () => {
    playClickBeep();
    setEditingTap({
      id: `tap-${Date.now()}`,
      name: '',
      brewery: 'Cervejaria Artesanal Parceira',
      style: 'American IPA',
      abv: '6.0% ABV',
      ibu: '45 IBU',
      price: 'R$ 20 (400ml)',
      notes: '',
      description: '',
      status: 'available'
    });
    setIsTapModalOpen(true);
  };

  const handleSaveTapModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTap || !editingTap.name.trim()) return;
    playClickBeep();

    const list = [...taps];
    const existingIndex = list.findIndex(t => t.id === editingTap.id);
    if (existingIndex >= 0) {
      list[existingIndex] = editingTap;
    } else {
      list.push(editingTap);
    }
    setTaps(list);
    setIsTapModalOpen(false);
    setEditingTap(null);
    playSuccessBeep();
  };

  // ----------------------------------------------------
  // GESTÃO DE CARDÁPIO BBQ
  // ----------------------------------------------------
  const handleToggleBbqStatus = (index: number) => {
    playClickBeep();
    const list = [...bbqItems];
    const currentStatus = list[index].status || 'available';
    list[index] = {
      ...list[index],
      status: currentStatus === 'available' ? 'sold_out' : 'available'
    };
    setBbqItems(list);
  };

  const handleMoveBbq = (index: number, direction: 'up' | 'down') => {
    playClickBeep();
    const list = [...bbqItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setBbqItems(list);
  };

  const handleDeleteBbq = (index: number) => {
    if (confirm(`Excluir o prato "${bbqItems[index].name}"?`)) {
      playClickBeep();
      const list = [...bbqItems];
      list.splice(index, 1);
      setBbqItems(list);
    }
  };

  const handleOpenAddBbq = () => {
    playClickBeep();
    setEditingBbq({
      id: `bbq-${Date.now()}`,
      name: '',
      cut: 'Corte Nobre na Brasa',
      description: '',
      servedWith: 'Acompanhamento artesanal',
      price: 'R$ 45',
      status: 'available'
    });
    setIsBbqModalOpen(true);
  };

  const handleSaveBbqModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBbq || !editingBbq.name.trim()) return;
    playClickBeep();

    const list = [...bbqItems];
    const existingIndex = list.findIndex(b => b.id === editingBbq.id);
    if (existingIndex >= 0) {
      list[existingIndex] = editingBbq;
    } else {
      list.push(editingBbq);
    }
    setBbqItems(list);
    setIsBbqModalOpen(false);
    setEditingBbq(null);
    playSuccessBeep();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header com Seletor de Evento e Ações */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono uppercase tracking-widest font-bold mb-1.5">
            🍻 Curadoria Gastronômica & Chope Artesanal
          </div>
          <h2 className="text-2xl font-display font-bold uppercase text-stone-100">
            Gestão de Torneiras de Chopp & Cardápio Gastronômico
          </h2>
          <p className="text-xs text-stone-400">
            Configure as torneiras ativas, estilos, IBUs, cervejarias parceiras e a gastronomia da praça de alimentação
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Edição */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-semibold">Edição:</span>
            <select
              value={selectedEventId}
              onChange={e => handleSelectEvent(e.target.value)}
              className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-amber-400 font-bold outline-none focus:border-amber-500"
            >
              {events.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.editionBadge})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-stone-300 hover:text-white text-xs font-semibold transition-all"
            title="Restaurar lista padrão"
          >
            ↺ Padrão
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="btn-malt px-5 py-2 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg glow-amber flex items-center gap-2 cursor-pointer"
          >
            <span>💾</span>
            <span>Salvar Cardápios</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="text-base text-emerald-400">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sub-Abas Torneiras vs. BBQ */}
      <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              playClickBeep();
              setActiveSubTab('taps');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'taps'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-md'
                : 'text-stone-400 bg-stone-900/60 border border-stone-800 hover:text-stone-200'
            }`}
          >
            <span>🍺</span>
            <span>Torneiras de Chopp ({taps.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickBeep();
              setActiveSubTab('bbq');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'bbq'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-md'
                : 'text-stone-400 bg-stone-900/60 border border-stone-800 hover:text-stone-200'
            }`}
          >
            <span>🍽️</span>
            <span>Gastronomia & Petiscos ({bbqItems.length})</span>
          </button>
        </div>

        {activeSubTab === 'taps' ? (
          <button
            type="button"
            onClick={handleOpenAddTap}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span>
            <span>Adicionar Torneira</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenAddBbq}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span>
            <span>Adicionar Prato</span>
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. ABA DE TORNEIRAS DE CHOPP ARTESANAL                   */}
      {/* ======================================================== */}
      {activeSubTab === 'taps' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span>Ordem das torneiras na régua do evento:</span>
            <span>Edição: <strong className="text-stone-200">{currentEvent?.title}</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taps.map((tap, idx) => {
              const isAvailable = tap.status !== 'sold_out';
              return (
                <div
                  key={tap.id || idx}
                  className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isAvailable
                      ? 'border-stone-800 hover:border-amber-500/50 bg-[#0f1015]'
                      : 'border-rose-950/60 bg-rose-950/20 opacity-80'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-stone-900 border border-stone-800 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">
                          #{idx + 1}
                        </span>
                        <div>
                          <h3 className="text-base font-display font-bold uppercase text-stone-100 leading-tight">
                            {tap.name}
                          </h3>
                          <p className="text-[11px] text-amber-400/90 font-semibold">
                            {tap.brewery || 'Cervejaria Artesanal'} • {tap.style || 'Chopp Especial'}
                          </p>
                        </div>
                      </div>

                      {/* Botão de Toggle de Status (Disponível vs Esgotado) */}
                      <button
                        type="button"
                        onClick={() => handleToggleTapStatus(idx)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                          isAvailable
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900'
                            : 'bg-rose-950/80 border-rose-500/60 text-rose-300 hover:bg-rose-900'
                        }`}
                        title="Clique para alternar disponibilidade na torneira"
                      >
                        {isAvailable ? '🟢 Em Torneira' : '🔴 Esgotado'}
                      </button>
                    </div>

                    <p className="text-xs text-stone-400 leading-relaxed">
                      {tap.notes || tap.description || 'Puro malte com notas cítricas e lúpulos nobres.'}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-amber-400 font-bold">
                        {tap.abv}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-stone-400 font-bold">
                        {tap.ibu}
                      </span>
                      {tap.price && (
                        <span className="text-stone-300 font-bold">
                          💰 {tap.price}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações: Reordenar, Editar e Excluir */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-800/80">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveTap(idx, 'up')}
                        disabled={idx === 0}
                        className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-white disabled:opacity-30 flex items-center justify-center text-xs"
                        title="Subir ordem"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveTap(idx, 'down')}
                        disabled={idx === taps.length - 1}
                        className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-white disabled:opacity-30 flex items-center justify-center text-xs"
                        title="Descer ordem"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTap({ ...tap });
                          setIsTapModalOpen(true);
                          playClickBeep();
                        }}
                        className="px-3 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 text-xs font-semibold"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTap(idx)}
                        className="p-1 text-stone-500 hover:text-rose-400 text-xs"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ABA DE GASTRONOMIA & PETISCOS                         */}
      {/* ======================================================== */}
      {activeSubTab === 'bbq' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span>Pratos, burgers, porções e petiscos preparados para a edição:</span>
            <span>Edição: <strong className="text-stone-200">{currentEvent?.title}</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bbqItems.map((item, idx) => {
              const isAvailable = item.status !== 'sold_out';
              const hasDescription = Boolean(item.description && item.description.trim() !== '');
              const hasServedWith = Boolean(item.servedWith && item.servedWith.trim() !== '');
              const hasImage = Boolean(item.image && item.image.trim() !== '');
              const hasCut = Boolean(item.cut && item.cut.trim() !== '');

              return (
                <div
                  key={item.id || idx}
                  className={`glass-panel p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    isAvailable
                      ? 'border-stone-800 hover:border-amber-500/50 bg-[#0f1015]'
                      : 'border-rose-950/60 bg-rose-950/20 opacity-80'
                  }`}
                >
                  <div className="space-y-2">
                    {hasImage && (
                      <div className="w-full h-36 rounded-xl overflow-hidden mb-2 border border-stone-800">
                        <img
                          src={item.image!.trim()}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      {hasCut ? (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                          {item.cut.trim()}
                        </span>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={() => handleToggleBbqStatus(idx)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                          isAvailable
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900'
                            : 'bg-rose-950/80 border-rose-500/60 text-rose-300 hover:bg-rose-900'
                        }`}
                      >
                        {isAvailable ? '🟢 Ativo' : '🔴 Esgotado'}
                      </button>
                    </div>

                    <h3 className="text-base font-display font-bold uppercase text-stone-100">
                      {item.name}
                    </h3>

                    {hasDescription && (
                      <p className="text-xs text-stone-400 leading-relaxed">
                        {item.description.trim()}
                      </p>
                    )}

                    {hasServedWith && (
                      <p className="text-[11px] font-mono text-stone-300 pt-1">
                        🍽️ {item.servedWith!.trim()}
                      </p>
                    )}

                    {item.price && item.price.trim() !== '' && (
                      <p className="text-xs font-mono font-bold text-amber-400">
                        {item.price.trim()}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-between pt-3 border-t border-stone-800/80">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveBbq(idx, 'up')}
                        disabled={idx === 0}
                        className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-white disabled:opacity-30 flex items-center justify-center text-xs"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBbq(idx, 'down')}
                        disabled={idx === bbqItems.length - 1}
                        className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-white disabled:opacity-30 flex items-center justify-center text-xs"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBbq({ ...item });
                          setIsBbqModalOpen(true);
                          playClickBeep();
                        }}
                        className="px-3 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 text-xs font-semibold"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBbq(idx)}
                        className="p-1 text-stone-500 hover:text-rose-400 text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL EDITAR / ADICIONAR TORNEIRA                        */}
      {/* ======================================================== */}
      {isTapModalOpen && editingTap && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
            {/* Header Fixo */}
            <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-display font-bold uppercase text-amber-500">
                {taps.some(t => t.id === editingTap.id) ? 'Editar Torneira de Chopp' : 'Nova Torneira de Chopp'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTapModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTapModal} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 overscroll-contain pb-6">
              <div>
                <label className="text-stone-300 font-semibold block mb-1">Nome do Chope *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rocker West Coast IPA"
                  value={editingTap.name}
                  onChange={e => setEditingTap({ ...editingTap, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-semibold block mb-1">Cervejaria Parceira</label>
                  <input
                    type="text"
                    placeholder="Ex: Cervejaria House Land"
                    value={editingTap.brewery || ''}
                    onChange={e => setEditingTap({ ...editingTap, brewery: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-semibold block mb-1">Estilo</label>
                  <input
                    type="text"
                    placeholder="Ex: American IPA"
                    value={editingTap.style || ''}
                    onChange={e => setEditingTap({ ...editingTap, style: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-stone-300 font-semibold block mb-1">Teor (ABV)</label>
                  <input
                    type="text"
                    placeholder="6.6% ABV"
                    value={editingTap.abv}
                    onChange={e => setEditingTap({ ...editingTap, abv: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-semibold block mb-1">Amargor (IBU)</label>
                  <input
                    type="text"
                    placeholder="62 IBU"
                    value={editingTap.ibu}
                    onChange={e => setEditingTap({ ...editingTap, ibu: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-semibold block mb-1">Preço / Tamanho</label>
                  <input
                    type="text"
                    placeholder="R$ 22 (400ml)"
                    value={editingTap.price || ''}
                    onChange={e => setEditingTap({ ...editingTap, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-semibold block mb-1">Notas Sensoriais / Descrição</label>
                <textarea
                  rows={3}
                  placeholder="Explosão de lúpulos americanos, notas cítricas e amargor limpo e marcante."
                  value={editingTap.notes || editingTap.description || ''}
                  onChange={e => setEditingTap({ ...editingTap, notes: e.target.value, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="text-stone-300 font-semibold block mb-1">Status de Disponibilidade</label>
                <select
                  value={editingTap.status || 'available'}
                  onChange={e => setEditingTap({ ...editingTap, status: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500 font-bold"
                >
                  <option value="available">🟢 Em Torneira (Disponível)</option>
                  <option value="sold_out">🔴 Barril Esgotado / Troca</option>
                </select>
              </div>
            </div>

            {/* Rodapé Fixo */}
            <div className="sticky bottom-0 z-10 bg-zinc-900/95 backdrop-blur-md px-5 py-3 border-t border-zinc-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsTapModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-malt px-6 py-2.5 rounded-xl text-xs uppercase font-bold shadow-lg glow-amber cursor-pointer"
              >
                Confirmar Torneira
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

      {/* ======================================================== */}
      {/* MODAL EDITAR / ADICIONAR PRATO GASTRONÔMICO              */}
      {/* ======================================================== */}
      {isBbqModalOpen && editingBbq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
            {/* Header Fixo */}
            <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-display font-bold uppercase text-amber-500">
                  {bbqItems.some(b => b.id === editingBbq.id) ? 'Editar Prato' : 'Novo Prato Gastronômico'}
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Pratos, burgers, porções e petiscos preparados para a edição
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBbqModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBbqModal} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 overscroll-contain pb-6">
              <div>
                <label className="text-stone-300 font-semibold block mb-1">Nome do Prato / Porção *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Burger Artesanal Canastra, Brisket Defumado ou Fritas com Cheddar"
                  value={editingBbq.name}
                  onChange={e => setEditingBbq({ ...editingBbq, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-semibold block mb-1">Categoria / Tag</label>
                  <input
                    type="text"
                    placeholder="Ex: Petiscos, Hamburgueria, Porções, Sobremesa, Especial"
                    value={editingBbq.cut}
                    onChange={e => setEditingBbq({ ...editingBbq, cut: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-semibold block mb-1">Preço Sugerido</label>
                  <input
                    type="text"
                    placeholder="Ex: R$ 38 ou R$ 45"
                    value={editingBbq.price || ''}
                    onChange={e => setEditingBbq({ ...editingBbq, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-semibold block mb-1">Descrição do Prato (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Descreva os ingredientes principais ou modo de preparo (deixe em branco se preferir exibir apenas título e valor)."
                  value={editingBbq.description}
                  onChange={e => setEditingBbq({ ...editingBbq, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="text-stone-300 font-semibold block mb-1">Acompanhamentos / Ingredientes (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Acompanha batatas rústicas e molho da casa (deixe em branco se não houver)"
                  value={editingBbq.servedWith || ''}
                  onChange={e => setEditingBbq({ ...editingBbq, servedWith: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-semibold block mb-1">URL da Foto do Prato (Opcional)</label>
                <input
                  type="url"
                  placeholder="https://... (deixe em branco para layout tipográfico limpo)"
                  value={editingBbq.image || ''}
                  onChange={e => setEditingBbq({ ...editingBbq, image: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-stone-300 font-semibold block mb-1">Status de Disponibilidade</label>
                <select
                  value={editingBbq.status || 'available'}
                  onChange={e => setEditingBbq({ ...editingBbq, status: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 outline-none focus:border-amber-500 font-bold"
                >
                  <option value="available">🟢 Disponível no Cardápio</option>
                  <option value="sold_out">🔴 Esgotado / Indisponível</option>
                </select>
              </div>
            </div>

            {/* Rodapé Fixo */}
            <div className="sticky bottom-0 z-10 bg-zinc-900/95 backdrop-blur-md px-5 py-3 border-t border-zinc-800 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsBbqModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-malt px-6 py-2.5 rounded-xl text-xs uppercase font-bold shadow-lg glow-amber cursor-pointer"
              >
                Confirmar Prato
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    </div>
  );
};
