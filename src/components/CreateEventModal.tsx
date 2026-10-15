import React, { useState } from 'react';
import { HouseLandEvent, TicketMode } from '../types';
import { createEvent } from '../services/eventService';
import { playClickBeep, playSuccessBeep } from '../utils/audioFeedback';
import { ImageUploader } from './ImageUploader';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (event: HouseLandEvent) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [formData, setFormData] = useState({
    title: '',
    editionBadge: 'Edição 2027',
    date: '',
    doorsOpen: '16:00',
    location: 'Hangar Rock Chopp Complex',
    address: 'Av. das Cervejarias, 1980',
    capacity: 1000,
    activeTicketMode: 'pre_registration' as TicketMode,
    shortDescription: '',
    fullDescription: '',
    hasCamarote: false,
    pistaPrice: 60,
    camarotePrice: 140,
    bannerImage: '/assets/images/hero_rock_chopp_event_1790270216046.jpg'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date.trim()) return;

    playClickBeep();
    const created = createEvent({
      title: formData.title,
      editionBadge: formData.editionBadge,
      date: formData.date,
      doorsOpen: formData.doorsOpen,
      location: formData.location,
      address: formData.address,
      capacity: Number(formData.capacity),
      activeTicketMode: formData.activeTicketMode,
      shortDescription: formData.shortDescription,
      fullDescription: formData.fullDescription,
      bannerImage: formData.bannerImage,
      hasCamarote: formData.hasCamarote,
      ticketPrices: {
        pista: Number(formData.pistaPrice),
        camarote: formData.hasCamarote ? Number(formData.camarotePrice) : 0
      }
    });

    playSuccessBeep();
    onCreated(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
        
        {/* Cabeçalho Fixo (Sticky Header) */}
        <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-display font-bold uppercase text-amber-500">
              Criar Nova Edição
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Cadastre um novo festival ou rock session na plataforma
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-stone-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            title="Fechar formulário"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Corpo com Rolagem Independente (Scrollable Content) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">Título do Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: House Land: Summer Rock"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">Badge de Edição</label>
                <input
                  type="text"
                  value={formData.editionBadge}
                  onChange={e => setFormData({ ...formData, editionBadge: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">Data do Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sábado, 15 de Maio de 2027"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">Horário de Abertura</label>
                <input
                  type="text"
                  value={formData.doorsOpen}
                  onChange={e => setFormData({ ...formData, doorsOpen: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">Local</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">Endereço</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">Capacidade Máxima</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">Preço Pista (R$)</label>
                <input
                  type="number"
                  value={formData.pistaPrice}
                  onChange={e => setFormData({ ...formData, pistaPrice: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:border-amber-500 outline-none font-mono"
                />
              </div>
            </div>

            {/* Switch e Preço do Setor Camarote */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-200 block">
                    Habilitar Setor Camarote nesta Edição
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Permite venda/resgate de ingressos com acesso VIP exclusivo
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, hasCamarote: !prev.hasCamarote }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    formData.hasCamarote ? 'bg-amber-500' : 'bg-stone-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-stone-950 transition-transform ${
                      formData.hasCamarote ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {formData.hasCamarote && (
                <div className="pt-2 border-t border-stone-900 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                    Preço Camarote VIP (R$)
                  </label>
                  <input
                    type="number"
                    value={formData.camarotePrice}
                    onChange={e => setFormData({ ...formData, camarotePrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111218] border border-stone-800 text-xs text-stone-100 focus:border-amber-500 outline-none font-mono"
                    placeholder="Ex: 140"
                  />
                </div>
              )}
            </div>

            {/* Descrição Resumida e Completa */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-stone-300">
                    Descrição Resumida (Card da Agenda)
                  </label>
                  <span className="text-[10px] font-mono text-stone-500">
                    {formData.shortDescription.length}/160 caracteres sugeridos
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={formData.shortDescription}
                  onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="Ex: O maior encontro de bandas de puro Rock n’ Roll e 12 torneiras de chopp artesanal e BBQ defumado."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                  Descrição Completa da Edição (Página do Evento)
                </label>
                <textarea
                  rows={4}
                  value={formData.fullDescription}
                  onChange={e => setFormData({ ...formData, fullDescription: e.target.value })}
                  placeholder="Ex: Uma experiência imersiva e lendária com 8 horas de shows ininterruptos, paredões valvulados, gastronomia com defumação lenta em lenha nobre de macieira..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 outline-none leading-relaxed"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">Modo de Ingressos Ativo</label>
              <select
                value={formData.activeTicketMode}
                onChange={e => setFormData({ ...formData, activeTicketMode: e.target.value as TicketMode })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 focus:border-amber-500 outline-none"
              >
                <option value="pre_registration">Fila de Reserva VIP (Pré-cadastro)</option>
                <option value="complimentary">Cortesia VIP Liberada (Resgate Grátis com QR)</option>
                <option value="direct_sale">Venda Direta de Ingressos (PIX / Cartão)</option>
              </select>
            </div>

            <div>
              <ImageUploader
                label="Banner / Flyer Oficial da Edição"
                value={formData.bannerImage}
                onChange={val => setFormData({ ...formData, bannerImage: val })}
                placeholder="/assets/images/hero_rock_chopp_event_1790270216046.jpg"
                recommendedSize="1200x800px JPG / WEBP"
                previewHeight="h-28"
                storageFolder="events/banners"
              />
            </div>
          </div>

          {/* Rodapé Fixo com Botões (Sticky Footer) */}
          <div className="sticky bottom-0 z-10 bg-zinc-900/95 backdrop-blur-md px-5 py-3 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-malt px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider shadow-lg glow-amber cursor-pointer"
            >
              Salvar Edição
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
