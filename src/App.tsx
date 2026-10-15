import React, { useState, useEffect, lazy, Suspense } from 'react';
import { PortalHome } from './components/PortalHome';
import { EventDetailPage } from './components/EventDetailPage';
import { TicketModal } from './components/TicketModal';
import { Footer } from './components/Footer';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { getEvents, getNextActiveEvent, subscribeToEventStore } from './services/eventService';
import { HouseLandEvent } from './types';
import { playClickBeep } from './utils/audioFeedback';

// Versão oficial de release e sincronização de produção
export const BUILD_VERSION = 'v1.0.1-production-live';

// Code-Splitting dinâmico dos módulos pesados para otimização de performance
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PortariaPage = lazy(() => import('./components/PortariaPage').then(m => ({ default: m.PortariaPage })));

export default function App() {
  const [events, setEvents] = useState<HouseLandEvent[]>(getEvents());
  const [currentView, setCurrentView] = useState<'portal' | 'event' | 'admin' | 'portaria'>('portal');
  const [selectedEvent, setSelectedEvent] = useState<HouseLandEvent>(getNextActiveEvent());
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Sincronização reativa de alterações no banco de eventos
  useEffect(() => {
    return subscribeToEventStore(() => {
      const freshEvents = getEvents();
      setEvents(freshEvents);
      
      // Se o evento selecionado foi atualizado no admin (ex: mudou de ticket mode), reflete aqui
      setSelectedEvent(prev => {
        const found = freshEvents.find(e => e.id === prev.id);
        return found || prev;
      });
    });
  }, []);

  // Suporte a hash routing e query param no navegador (#portaria, ?page=portaria, #admin, #portal, etc.)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const isPortariaRequested = 
        hash === '#portaria' || 
        hash === '#/portaria' || 
        params.get('page') === 'portaria';

      if (isPortariaRequested) {
        setCurrentView('portaria');
      } else if (hash === '#admin') {
        setCurrentView('admin');
      } else if (hash.startsWith('#evento-')) {
        const eventId = hash.replace('#evento-', '');
        const target = events.find(e => e.id === eventId);
        if (target) {
          setSelectedEvent(target);
          setCurrentView('event');
        } else {
          setCurrentView('portal');
        }
      } else if (hash === '#portal' || hash === '' || hash === '#') {
        setCurrentView('portal');
      }
      // Âncoras internas de seção (#agenda, #sobre, #contato, #lineup, #chopp, #local, #inicio)
      // preservam a visualização atual para que a rolagem suave funcione normalmente.
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [events]);

  const handleSelectEvent = (event: HouseLandEvent) => {
    setSelectedEvent(event);
    setCurrentView('event');
    window.location.hash = `#evento-${event.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view: 'portal' | 'admin' | 'portaria') => {
    setCurrentView(view);
    if (view === 'admin') {
      window.location.hash = '#admin';
    } else if (view === 'portaria') {
      window.location.hash = '#portaria';
    } else {
      window.location.hash = '#portal';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      
      {/* ======================================================== */}
      {/* 1. MÓDULO ADMIN: DASHBOARD MULTI-EVENTOS                 */}
      {/* ======================================================== */}
      {currentView === 'admin' && (
        <div id="admin-view" className="flex-1 flex flex-col">
          <AdminProtectedRoute onExitToPortal={() => handleNavigate('portal')}>
            {({ onLogout }) => (
              <Suspense fallback={
                <div className="min-h-screen bg-[#0a0a0d] flex items-center justify-center p-6 text-stone-300">
                  <div className="flex flex-col items-center gap-3">
                    <span className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-xs uppercase font-mono tracking-widest text-amber-500 font-bold">
                      Carregando Painel Administrativo...
                    </span>
                  </div>
                </div>
              }>
                <AdminDashboard
                  onExitToPortal={() => handleNavigate('portal')}
                  onPreviewEvent={(evt) => handleSelectEvent(evt)}
                  onLogout={onLogout}
                />
              </Suspense>
            )}
          </AdminProtectedRoute>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MÓDULO PÚBLICO: HOME DO PORTAL MULTIEVENTOS           */}
      {/* ======================================================== */}
      {currentView === 'portal' && (
        <div id="portal-view" className="flex-1 flex flex-col pb-8 sm:pb-12">
          <PortalHome
            events={events}
            onSelectEvent={handleSelectEvent}
            onOpenAdmin={() => handleNavigate('admin')}
          />
          <Footer
            currentView={currentView}
            onNavigate={handleNavigate}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MÓDULO PÚBLICO: PÁGINA DO EVENTO ESPECÍFICO           */}
      {/* ======================================================== */}
      {currentView === 'event' && selectedEvent && (
        <div id="event-view" className="flex-1 flex flex-col pb-8 sm:pb-12">
          <EventDetailPage
            event={selectedEvent}
            onBackToPortal={() => handleNavigate('portal')}
            onBackToAgenda={() => handleNavigate('portal')}
            onOpenTicketModal={() => setIsTicketModalOpen(true)}
          />
          <Footer
            currentView={currentView}
            onNavigate={handleNavigate}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MÓDULO AUTÔNOMO: PORTARIA & SCANNER DE CÂMERA        */}
      {/* ======================================================== */}
      {currentView === 'portaria' && (
        <div id="portaria-view" className="flex-1 flex flex-col">
          <Suspense fallback={
            <div className="min-h-screen bg-[#07070a] flex items-center justify-center p-6 text-stone-300">
              <div className="flex flex-col items-center gap-3">
                <span className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-xs uppercase font-mono tracking-widest text-amber-500 font-bold">
                  Carregando Scanner da Portaria...
                </span>
              </div>
            </div>
          }>
            <PortariaPage
              onBackToPortal={() => handleNavigate('portal')}
              onBackToAdmin={() => handleNavigate('admin')}
            />
          </Suspense>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DINÂMICO DE INGRESSOS (MOTOR DE CONVERSÃO)         */}
      {/* ======================================================== */}
      {selectedEvent && (
        <TicketModal
          isOpen={isTicketModalOpen}
          onClose={() => setIsTicketModalOpen(false)}
          event={selectedEvent}
        />
      )}

    </div>
  );
}
