import QRCode from 'qrcode';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  HouseLandEvent, 
  Lead, 
  Ticket, 
  Companion,
  TicketStatus,
  TicketMode, 
  EventStatus, 
  SiteSettings, 
  BeerTap, 
  BbqItem, 
  ReservationFlowSettings,
  DoorSaleData 
} from '../types';

export const DEFAULT_RESERVATION_FLOW_SETTINGS: ReservationFlowSettings = {
  step1Description: 'Escolha a quantidade de ingressos para entrar na Fila de Reserva VIP e garantir acesso antecipado às melhores condições do festival.',
  step2PaymentNotice: 'Aviso de Pagamento: O pagamento será solicitado via WhatsApp após a aprovação da reserva pela organização.',
  successTitle: 'RESERVA REGISTRADA COM SUCESSO!',
  successSubtitle: 'Sua reserva para {evento} foi cadastrada na Fila VIP Oficial da produtora.',
  whatsappButtonLabel: 'CONFIRMAR RESERVA NO WHATSAPP',
  whatsappContactNumber: '21997313305',
  whatsappCustomMessage: 'Olá! Gostaria de confirmar a minha reserva da edição {evento} na House Land Rock Chopp. Localizador: {localizador}, Titular: {nome}, Quantidade: {quantidade} ingresso(s). Aguardo as instruções!'
};

export const DEFAULT_BEER_TAPS: BeerTap[] = [
  {
    id: 'tap-pilsen',
    name: 'Pilsen Puro Malte Cristal',
    brewery: 'Cervejaria House Land',
    style: 'German Pilsen',
    abv: '4.8% ABV',
    ibu: '18 IBU',
    price: 'R$ 16 (400ml)',
    notes: 'Refrescância extrema, malte pilsen nobre e final seco e crocante.',
    description: 'Refrescância extrema, malte pilsen nobre e final seco e crocante.',
    status: 'available'
  },
  {
    id: 'tap-ipa',
    name: 'Rocker West Coast IPA',
    brewery: 'Overdrive Craft Beer',
    style: 'American IPA',
    abv: '6.6% ABV',
    ibu: '62 IBU',
    price: 'R$ 22 (400ml)',
    notes: 'Explosão de lúpulos americanos, notas cítricas e amargor limpo.',
    description: 'Explosão de lúpulos americanos, notas cítricas e amargor limpo.',
    status: 'available'
  },
  {
    id: 'tap-redale',
    name: 'House Amber & Red Ale',
    brewery: 'Malt & Valley Brewery',
    style: 'Irish Red Ale',
    abv: '5.8% ABV',
    ibu: '38 IBU',
    price: 'R$ 20 (400ml)',
    notes: 'Caramelo tostado, malte encorpado e lúpulo herbal marcante.',
    description: 'Caramelo tostado, malte encorpado e lúpulo herbal marcante.',
    status: 'available'
  },
  {
    id: 'tap-stout',
    name: 'Black Velvet Stout',
    brewery: 'Cervejaria House Land',
    style: 'Dry Stout Artesanal',
    abv: '7.2% ABV',
    ibu: '45 IBU',
    price: 'R$ 24 (400ml)',
    notes: 'Cacau belga, café espresso tostado e textura aveludada.',
    description: 'Cacau belga, café espresso tostado e textura aveludada.',
    status: 'available'
  }
];

export const DEFAULT_BBQ_MENU: BbqItem[] = [
  {
    id: 'bbq-brisket',
    name: 'Brisket Angus Defumado 14h',
    cut: 'Cortes Nobres & Parrilla',
    description: 'Peito bovino Angus defumado lentamente por 14 horas em lenha de macieira com dry rub exclusivo da casa e bark caramelizado perfeito.',
    servedWith: 'Coleslaw artesanal crocante, picles de cebola roxa e pão rústico',
    price: 'R$ 58',
    status: 'available'
  },
  {
    id: 'bbq-pulled-pork',
    name: 'Pulled Pork Burger Artesanal',
    cut: 'Hamburgueria',
    description: 'Carne suína ultra macia desfiada no molho barbecue artesanal da casa com redução de chopp stout e queijo canastra tostado.',
    servedWith: 'Pão brioche tostado na manteiga e chips rústicos de batata',
    price: 'R$ 42',
    status: 'available'
  },
  {
    id: 'bbq-ribs',
    name: 'Costelinha Suína Glazeada ao Barbecue',
    cut: 'Petiscos & Porções',
    description: 'Costela carnuda macia soltando do osso, marinada por 24h e pincelada com glaze de melado de cana e bourbon.',
    servedWith: 'Milho doce na brasa e batatas rústicas com alecrim',
    price: 'R$ 54',
    status: 'available'
  },
  {
    id: 'bbq-fritas-costela',
    name: 'Fritas Rústicas com Costela & Cheddar',
    cut: 'Petiscos & Porções',
    description: 'Batatas rústicas douradas e crocantes cobertas com generosa porção de costela desfiada e molho cheddar cremoso.',
    servedWith: 'Cebolinha fresca e barbecue defumado artesanal',
    price: 'R$ 38',
    status: 'available'
  }
];

const STORAGE_KEYS = {
  EVENTS: 'hl360_events_v2',
  TICKETS: 'hl360_tickets_v2',
  LEADS: 'hl360_leads_v2',
  SITE_SETTINGS: 'hl360_site_settings_v1',
  INITIALIZED: 'hl360_events_initialized'
};

export function normalizeImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('/src/assets/')) {
    return url.replace('/src/assets/', '/assets/');
  }
  return url;
}

export const initialSiteSettings: SiteSettings = {
  logoImage: '',
  logoHeight: 40,
  brandName: 'House Land Rock Chopp',
  brandSubtitle: '',
  heroBadgeText: 'Edições Confirmadas 2026',
  heroTitle: 'A MAIOR EXPERIÊNCIA DE ROCK N’ ROLL & CHOPP ARTESANAL',
  heroSubtitle: 'A House Land é uma produtora independente dedicada a criar edições lendárias onde o som valvulado e o malte selecionado se encontram.',
  heroBannerImage: '/assets/images/hero_rock_chopp_event_1790270216046.jpg',
  agendaSectionTitle: 'Agenda Oficial de Festivais & Rock Sessions',
  ctaButtonText: 'Ver Detalhes & Ingressos',
  aboutBadge: 'A NOSSA FILOSOFIA • MANIFESTO',
  aboutTitle: 'SOBRE A HOUSE LAND',
  aboutText: 'A House Land nasceu com a missão de resgatar o espírito cru, enérgico e autêntico do Rock n’ Roll, unindo-o à revolução das microcervejarias artesanais brasileiras. Não criamos eventos padronizados: cada edição possui curadoria independente de artistas, torneiras exclusivas e espaços industriais com acústica tratada.',
  aboutLogoUrl: '',
  showAboutStats: false,
  contactEmail: 'contato@houseland.online',
  contactWhatsapp: '21997313305',
  productionWhatsapp: '21997313305',
  ctaPartnershipWhatsapp: '21997313305',
  partnershipBadge: 'CONTATO',
  partnershipTitle: 'Quer tirar uma dúvida?',
  partnershipDescription: 'Se você tem uma dúvida, entre em contato direto com a equipe da produtora.',
  partnershipBtnText: 'FALAR COM A PRODUÇÃO NO WHATSAPP',
  footerBrandTitle: 'HOUSE LAND ROCK CHOPP',
  footerBrandDescription: "Produtora e Portal oficial de eventos autorais de Rock n' Roll, Chopp Artesanal e Gastronomia Defumada.",
  footerDisclaimer: 'Eventos destinados a maiores de 18 anos. Beba com moderação. Se beber, não dirija.',
  stats: [
    { label: 'Puro Malte & Som Valvulado', value: '100%' },
    { label: 'Público Acumulado', value: '+15 Mil' },
    { label: 'De Tradição Independente', value: '8 Anos' }
  ],
  footerCnpj: '48.123.456/0001-78',
  showCnpj: false,
  instagramUrl: '',
  spotifyUrl: '',
  youtubeUrl: '',
  showPastEventsSection: false,
  showMenuSection: false,
  countdownEventId: '',
  showCountdown: false,
  reservationFlowSettings: DEFAULT_RESERVATION_FLOW_SETTINGS
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = initialSiteSettings;

export function getSiteSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SITE_SETTINGS);
    if (!raw) return DEFAULT_SITE_SETTINGS;
    const parsed = JSON.parse(raw);
    const settings: SiteSettings = { 
      ...DEFAULT_SITE_SETTINGS, 
      ...parsed,
      showMenuSection: parsed.showMenuSection !== undefined ? parsed.showMenuSection : false,
      showCnpj: parsed.showCnpj !== undefined ? parsed.showCnpj : false,
      reservationFlowSettings: {
        ...DEFAULT_RESERVATION_FLOW_SETTINGS,
        ...(parsed.reservationFlowSettings || {})
      }
    };
    if (settings.heroBannerImage) {
      settings.heroBannerImage = normalizeImageUrl(settings.heroBannerImage);
    }
    if (settings.logoImage) {
      settings.logoImage = normalizeImageUrl(settings.logoImage);
    }
    // Migração transparente de fallbacks de teste antigos
    if (!settings.productionWhatsapp || settings.productionWhatsapp.includes('99999-8888') || settings.productionWhatsapp.includes('999998888')) {
      settings.productionWhatsapp = DEFAULT_SITE_SETTINGS.productionWhatsapp;
    }
    if (!settings.contactWhatsapp || settings.contactWhatsapp.includes('99999-8888') || settings.contactWhatsapp === 'Quer tirar uma dúvida') {
      settings.contactWhatsapp = DEFAULT_SITE_SETTINGS.contactWhatsapp;
    }
    if (!settings.ctaPartnershipWhatsapp || settings.ctaPartnershipWhatsapp.includes('99999-8888') || settings.ctaPartnershipWhatsapp.includes('999998888')) {
      settings.ctaPartnershipWhatsapp = DEFAULT_SITE_SETTINGS.ctaPartnershipWhatsapp;
    }
    return settings;
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export function saveSiteSettings(settings: Partial<SiteSettings>): SiteSettings {
  const current = getSiteSettings();
  const updated: SiteSettings = {
    ...current,
    ...settings,
    reservationFlowSettings: {
      ...current.reservationFlowSettings,
      ...(settings.reservationFlowSettings || {})
    } as ReservationFlowSettings,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEYS.SITE_SETTINGS, JSON.stringify(updated));
  notifyListeners();

  // Firestore Async Sync
  try {
    const settingsDocRef = doc(db, 'site_settings', 'settings');
    setDoc(settingsDocRef, updated, { merge: true }).catch(err => {
      console.warn('Firestore: Falha ao sincronizar site_settings:', err);
    });
  } catch (err) {
    console.warn('Firestore site_settings error:', err);
  }

  return updated;
}

export const updateSiteSettings = saveSiteSettings;

const SEED_EVENTS: HouseLandEvent[] = [
  {
    id: 'hl-out-2026',
    title: 'House Land Rock Chopp Festival',
    editionBadge: 'Edição Outubro 2026 · Principal',
    slug: 'rock-chopp-festival-outubro',
    status: 'active',
    date: 'Sábado, 24 de Outubro de 2026',
    doorsOpen: '16:00',
    location: 'Hangar Rock Chopp Complex',
    address: 'Av. das Cervejarias, 1980 - Galpão Industrial',
    capacity: 1200,
    bannerImage: '/assets/images/hero_rock_chopp_event_1790270216046.jpg',
    shortDescription: 'O maior encontro de bandas de puro Rock n’ Roll e 12 torneiras de chopp artesanal e BBQ defumado.',
    fullDescription: 'Uma experiência imersiva e lendária com 8 horas de shows ininterruptos, paredões valvulados, gastronomia com defumação lenta em lenha nobre de macieira e cervejarias premiadas selecionadas a dedo.',
    activeTicketMode: 'complimentary',
    bands: [
      {
        id: 'b1',
        name: 'Vintage Overdrive',
        genre: 'Classic Hard Rock',
        timeSlot: '22:30 - Palco Principal',
        description: 'Riffs pesados anos 70/80 com solos viscerais de guitarra e vocal rasgado de alta voltagem.',
        image: '/assets/images/band_vintage_overdrive_1790270229479.jpg',
        highlightSong: 'Thunder Highway'
      },
      {
        id: 'b2',
        name: 'Malt & Blues Trio',
        genre: 'Southern Rock & Blues',
        timeSlot: '20:15 - Palco Principal',
        description: 'A alma do blues com guitarras slide marcantes e sabor autêntico de carvalho e malte.',
        image: '/assets/images/band_malt_blues_1790270239674.jpg',
        highlightSong: 'Whiskey Barrel Blues'
      },
      {
        id: 'b3',
        name: 'Heavy Hops Experience',
        genre: 'Stoner Rock & Grunge',
        timeSlot: '18:45 - Palco Garden',
        description: 'Bateria densa e amplificadores valvulados que fazem o concreto do hangar tremer.',
        image: '/assets/images/band_vintage_overdrive_1790270229479.jpg',
        highlightSong: 'Smoke & Amber'
      },
      {
        id: 'b4',
        name: 'Black Iron Zeppelin Tribute',
        genre: 'Legendary Rock Tribute',
        timeSlot: '00:00 - Headliner Encerramento',
        description: 'Dois blocos de celebração eletrizante dos maiores hinos da história do rock mundial.',
        image: '/assets/images/band_malt_blues_1790270239674.jpg',
        highlightSong: 'Whole Lotta Rock'
      }
    ],
    beerTaps: [
      { name: 'House Amber Ale', abv: '5.8% ABV', ibu: '38 IBU', notes: 'Caramelo tostado, malte encorpado e lúpulo herbal marcante.' },
      { name: 'Rocker West Coast IPA', abv: '6.6% ABV', ibu: '62 IBU', notes: 'Explosão de lúpulos americanos, notas cítricas e amargor limpo.' },
      { name: 'Black Velvet Stout', abv: '7.2% ABV', ibu: '45 IBU', notes: 'Cacau belga, café espresso tostado e textura aveludada.' },
      { name: 'Pilsen Puro Malte Cristal', abv: '4.8% ABV', ibu: '18 IBU', notes: 'Refrescância extrema, malte pilsen nobre e final seco e crocante.' }
    ],
    bbqMenu: DEFAULT_BBQ_MENU,
    hasCamarote: true,
    ticketPrices: {
      pista: 60,
      camarote: 140
    },
    contactWhatsApp: '21997313305',
    highlights: ['12 Torneiras Artesanais', 'Smoked Pitmaster BBQ', 'Estacionamento Seguro', 'Copo Eco Colecionável']
  },
  {
    id: 'hl-sunset-2026',
    title: 'House Land: Sunset Sessions & Acoustic Rock',
    editionBadge: 'Edição Novembro 2026',
    slug: 'sunset-sessions-acoustic-rock',
    status: 'active',
    date: 'Sábado, 21 de Novembro de 2026',
    doorsOpen: '15:00',
    location: 'Pátio Cervejeiro da Villa',
    address: 'Rua das Pérgolas, 450 - Jardim Industrial',
    capacity: 650,
    bannerImage: '/assets/images/sunset_acoustic_rock_1790271896648.jpg',
    shortDescription: 'Edição ao entardecer com versões acústicas exclusivas dos clássicos do rock, lâmpadas vintage e chopes sazonais.',
    fullDescription: 'Um clima descontraído ao ar livre com luzes douradas de filamento de carbono, bancos rústicos de madeira e acústica intimista para curtir com amigos acompanhado de chopes leves e burgers artesanais na brasa.',
    activeTicketMode: 'pre_registration',
    bands: [
      {
        id: 'b5',
        name: 'The Acoustic Overlords',
        genre: 'Acoustic Rock Unplugged',
        timeSlot: '17:30 - Sunset Stage',
        description: 'Violões de 12 cordas, harmônica e vocais marcantes revisitando Led Zeppelin, Pearl Jam e Pink Floyd.',
        image: '/assets/images/band_malt_blues_1790270239674.jpg',
        highlightSong: 'Going to California'
      },
      {
        id: 'b6',
        name: 'Dust & Strings Folk Trio',
        genre: 'Southern Folk Rock',
        timeSlot: '19:45 - Sunset Stage',
        description: 'Banjo, contrabaixo acústico e ritmo contagiante da tradição folk norte-americana.',
        image: '/assets/images/band_vintage_overdrive_1790270229479.jpg',
        highlightSong: 'Copperhead Road'
      }
    ],
    beerTaps: DEFAULT_BEER_TAPS,
    bbqMenu: DEFAULT_BBQ_MENU,
    hasCamarote: true,
    ticketPrices: {
      pista: 45,
      camarote: 110
    },
    contactWhatsApp: '21997313305',
    highlights: ['Sunset Session', 'Acústico Rústico', 'Chope Sazonal', 'Área Gramada']
  },
  {
    id: 'hl-roots-2025',
    title: 'House Land: Blues & Smoked BBQ Fest (Edição Histórica)',
    editionBadge: 'Edição Histórica · Passada',
    slug: 'blues-smoked-bbq-fest',
    status: 'past',
    date: 'Sábado, 15 de Outubro de 2025',
    doorsOpen: '14:00',
    location: 'Arena Central Old Town',
    address: 'Av. Ferroviária, 800',
    capacity: 1100,
    bannerImage: '/assets/images/past_festival_crowd_1790271883019.jpg',
    shortDescription: 'Festival gastronômico e musical com o melhor do blues raiz e 1 tonelada de costela defumada.',
    fullDescription: 'Celebração comemorativa de aniversário da produtora House Land reunindo público de todo o estado.',
    activeTicketMode: 'direct_sale',
    bands: [],
    beerTaps: [],
    hasCamarote: true,
    ticketPrices: { pista: 40, camarote: 100 },
    contactWhatsApp: '21997313305',
    attendeesCount: 1100,
    highlights: ['Lotação Esgotada', '1.100 Participantes', 'Defumação 12h']
  }
];

type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function notifyListeners() {
  listeners.forEach(cb => cb());
}

export function subscribeToEventStore(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export async function generateQrCodeBase64(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#121318',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
  } catch (err) {
    console.error('Falha ao gerar QR Code:', err);
    return '';
  }
}

function initStorage() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.SITE_SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SITE_SETTINGS, JSON.stringify(DEFAULT_SITE_SETTINGS));
  } else {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.SITE_SETTINGS) || '{}');
      if (!existing.productionWhatsapp || existing.productionWhatsapp.includes('99999-8888') || existing.contactWhatsapp === 'Quer tirar uma dúvida' || !existing.contactWhatsapp) {
        localStorage.setItem(STORAGE_KEYS.SITE_SETTINGS, JSON.stringify({
          ...DEFAULT_SITE_SETTINGS,
          ...existing,
          productionWhatsapp: '21997313305',
          contactWhatsapp: '21997313305',
          ctaPartnershipWhatsapp: '21997313305'
        }));
      }
    } catch {
      localStorage.setItem(STORAGE_KEYS.SITE_SETTINGS, JSON.stringify(DEFAULT_SITE_SETTINGS));
    }
  }

  if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(SEED_EVENTS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.LEADS)) {
    const seedLeads: Lead[] = [
      {
        id: 'LEAD-001',
        eventId: 'hl-sunset-2026',
        eventName: 'House Land: Sunset Sessions & Acoustic Rock',
        name: 'Rodrigo Medeiros',
        whatsapp: '(21) 98765-4321',
        cpf: '123.456.789-00',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        status: 'pending',
        ticketQuantity: 2,
        unitPrice: 45,
        totalExpectedValue: 90
      },
      {
        id: 'LEAD-002',
        eventId: 'hl-out-2026',
        eventName: 'House Land Rock Chopp Festival',
        name: 'Camila Albuquerque',
        whatsapp: '(21) 97654-3210',
        cpf: '234.567.890-11',
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        status: 'approved',
        ticketId: 'HLRC-R-1092',
        ticketQuantity: 1,
        unitPrice: 60,
        totalExpectedValue: 60
      },
      {
        id: 'LEAD-003',
        eventId: 'hl-out-2026',
        eventName: 'House Land Rock Chopp Festival',
        name: 'Lucas Barreto',
        whatsapp: '(21) 96543-2109',
        cpf: '345.678.901-22',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        status: 'pending',
        ticketQuantity: 1,
        unitPrice: 60,
        totalExpectedValue: 60
      }
    ];
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(seedLeads));
  }

  if (!localStorage.getItem(STORAGE_KEYS.TICKETS)) {
    const seedTickets: Ticket[] = [
      {
        id: 'HLRC-R-1092',
        eventId: 'hl-out-2026',
        eventName: 'House Land Rock Chopp Festival',
        name: 'Camila Albuquerque',
        whatsapp: '(21) 97654-3210',
        cpf: '234.567.890-11',
        type: 'Cortesia VIP',
        status: 'valid',
        qrCodeData: 'HLRC:TICKET:HLRC-R-1092:CPF:23456789011',
        qrCodeImage: '',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        batch: 'Lote Cortesia VIP'
      },
      {
        id: 'HLRC-R-3401',
        eventId: 'hl-out-2026',
        eventName: 'House Land Rock Chopp Festival',
        name: 'Gustavo Rocker',
        whatsapp: '(21) 95432-1098',
        cpf: '456.789.012-33',
        type: 'Pista Premium',
        status: 'used',
        qrCodeData: 'HLRC:TICKET:HLRC-R-3401:CPF:45678901233',
        qrCodeImage: '',
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        usedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        checkedInBy: 'Portaria 1 - Bruno',
        batch: 'Lote 1'
      }
    ];

    Promise.all(seedTickets.map(async t => {
      t.qrCodeImage = await generateQrCodeBase64(t.qrCodeData);
      return t;
    })).then(completed => {
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(completed));
      notifyListeners();
    });
  }
}

initStorage();

let isFirestoreInitialized = false;

export function initFirestoreSync() {
  if (isFirestoreInitialized || typeof window === 'undefined') return;
  isFirestoreInitialized = true;

  try {
    const eventsCol = collection(db, 'events');
    const metaDocRef = doc(db, 'site_settings', 'metadata');

    // 1. SINCRONIZAÇÃO EM TEMPO REAL DE EVENTOS (Celular <-> PC <-> Visitantes)
    onSnapshot(eventsCol, { includeMetadataChanges: false }, async (snapshot) => {
      if (!snapshot.empty) {
        const remoteEvents: HouseLandEvent[] = [];
        snapshot.forEach(docSnap => {
          remoteEvents.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(remoteEvents));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        notifyListeners();
      } else {
        // Se a coleção está vazia no Firestore, verificamos se o banco já foi inicializado
        try {
          const metaSnap = await getDoc(metaDocRef);
          if (metaSnap.exists() && metaSnap.data()?.eventsSeeded) {
            // O banco já foi inicializado e o usuário excluiu todos os eventos:
            // MANTÉM VAZIO. NUNCA ressuscita eventos excluídos.
            localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
            localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
            notifyListeners();
          } else {
            // Primeira inicialização em banco de dados Firestore 100% virgem:
            // Semeia os eventos oficiais iniciais no Firestore uma única vez
            console.log('Firestore: Inicializando coleção events pela primeira vez...');
            await setDoc(metaDocRef, { eventsSeeded: true, seededAt: new Date().toISOString() }, { merge: true });
            for (const seed of SEED_EVENTS) {
              await setDoc(doc(db, 'events', seed.id), seed);
            }
          }
        } catch (err) {
          console.warn('Erro ao verificar metadados Firestore:', err);
        }
      }
    }, (err) => {
      console.warn('Firestore events listener error:', err);
    });

    // 2. SINCRONIZAÇÃO EM TEMPO REAL DE INGRESSOS
    const ticketsCol = collection(db, 'tickets');
    onSnapshot(ticketsCol, { includeMetadataChanges: false }, (snapshot) => {
      if (!snapshot.empty) {
        const remoteTickets: Ticket[] = [];
        snapshot.forEach(docSnap => {
          remoteTickets.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(remoteTickets));
        notifyListeners();
      }
    }, () => {});

    // 3. SINCRONIZAÇÃO EM TEMPO REAL DE LEADS
    const leadsCol = collection(db, 'leads');
    onSnapshot(leadsCol, { includeMetadataChanges: false }, (snapshot) => {
      if (!snapshot.empty) {
        const remoteLeads: Lead[] = [];
        snapshot.forEach(docSnap => {
          remoteLeads.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(remoteLeads));
        notifyListeners();
      }
    }, () => {});

    // 4. SINCRONIZAÇÃO EM TEMPO REAL DAS CONFIGURAÇÕES DO SITE (documento 'settings' na coleção 'site_settings')
    const settingsDoc = doc(db, 'site_settings', 'settings');
    onSnapshot(settingsDoc, (snap) => {
      if (snap.exists()) {
        const remoteSettings = snap.data() as SiteSettings;
        const merged: SiteSettings = {
          ...DEFAULT_SITE_SETTINGS,
          ...remoteSettings,
          reservationFlowSettings: {
            ...DEFAULT_RESERVATION_FLOW_SETTINGS,
            ...(remoteSettings.reservationFlowSettings || {})
          }
        };
        localStorage.setItem(STORAGE_KEYS.SITE_SETTINGS, JSON.stringify(merged));
        notifyListeners();
      } else {
        // Se ainda não existir no Firestore, inicializa o documento 'settings'
        setDoc(settingsDoc, DEFAULT_SITE_SETTINGS, { merge: true }).catch(() => {});
      }
    }, (err) => {
      console.warn('Firestore site_settings listener error:', err);
    });
  } catch (err) {
    console.warn('Firestore fallback local:', err);
  }
}

initFirestoreSync();

export async function fetchEventsFromFirestore(): Promise<HouseLandEvent[]> {
  try {
    const eventsCol = collection(db, 'events');
    const snapshot = await getDocs(eventsCol);
    const remoteEvents: HouseLandEvent[] = [];
    snapshot.forEach(docSnap => {
      remoteEvents.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(remoteEvents));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    notifyListeners();
    return remoteEvents;
  } catch (err) {
    console.warn('Erro ao buscar eventos do Firestore:', err);
    return getEvents();
  }
}

export function getEvents(): HouseLandEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    
    let list: HouseLandEvent[];
    if (raw !== null) {
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = [];
    } else if (isInitialized) {
      list = [];
    } else {
      list = [...SEED_EVENTS];
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(list));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }

    return list.map(evt => ({
      ...evt,
      isPublished: evt.isPublished !== undefined ? evt.isPublished : true,
      hasCamarote: evt.hasCamarote ?? (evt.ticketPrices?.camarote !== undefined && evt.ticketPrices.camarote > 0),
      bannerImage: normalizeImageUrl(evt.bannerImage),
      contactWhatsApp: (!evt.contactWhatsApp || evt.contactWhatsApp.includes('999998888') || evt.contactWhatsApp.includes('99999-8888'))
        ? '21997313305'
        : evt.contactWhatsApp,
      beerTaps: (evt.beerTaps && evt.beerTaps.length > 0) ? evt.beerTaps : DEFAULT_BEER_TAPS,
      bbqMenu: (evt.bbqMenu && evt.bbqMenu.length > 0) ? evt.bbqMenu : DEFAULT_BBQ_MENU
    }));
  } catch {
    return [];
  }
}

export function getEventById(id: string): HouseLandEvent | undefined {
  return getEvents().find(e => e.id === id);
}

export function getNextActiveEvent(): HouseLandEvent {
  const events = getEvents();
  const active = events.filter(e => e.status === 'active');
  return active[0] || events[0] || SEED_EVENTS[0];
}

export function createEvent(eventData: Partial<HouseLandEvent>): HouseLandEvent {
  const events = getEvents();
  const newId = `hl-event-${Date.now()}`;
  const slug = (eventData.title || 'novo-evento').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  const hasCamarote = eventData.hasCamarote ?? (eventData.ticketPrices?.camarote !== undefined && eventData.ticketPrices.camarote > 0);

  const newEvent: HouseLandEvent = {
    id: newId,
    title: eventData.title?.trim() || 'Nova Edição House Land',
    editionBadge: eventData.editionBadge?.trim() || 'Edição Especial 2027',
    slug,
    status: eventData.status || 'active',
    date: eventData.date?.trim() || 'Data a Definir',
    doorsOpen: eventData.doorsOpen || '16:00',
    location: eventData.location?.trim() || 'Hangar Rock Chopp Complex',
    address: eventData.address?.trim() || 'Av. das Cervejarias, 1980',
    capacity: Number(eventData.capacity) || 1000,
    bannerImage: eventData.bannerImage !== undefined && eventData.bannerImage !== ''
      ? eventData.bannerImage 
      : '/assets/images/hero_rock_chopp_event_1790270216046.jpg',
    shortDescription: eventData.shortDescription !== undefined ? eventData.shortDescription : '',
    fullDescription: eventData.fullDescription !== undefined ? eventData.fullDescription : '',
    hasCamarote,
    activeTicketMode: eventData.activeTicketMode || 'pre_registration',
    isPublished: eventData.isPublished !== undefined ? eventData.isPublished : true,
    showCapacityPublicly: eventData.showCapacityPublicly === true,
    bands: eventData.bands || [],
    beerTaps: eventData.beerTaps !== undefined ? eventData.beerTaps : [],
    bbqMenu: eventData.bbqMenu !== undefined ? eventData.bbqMenu : [],
    ticketPrices: {
      pista: eventData.ticketPrices?.pista ?? 50,
      camarote: hasCamarote ? (eventData.ticketPrices?.camarote ?? 120) : (eventData.ticketPrices?.camarote ?? 0)
    },
    contactWhatsApp: eventData.contactWhatsApp || '21997313305',
    highlights: eventData.highlights || ['Torneiras Artesanais', 'Gastronomia na Brasa', 'Rock ao Vivo']
  };

  events.unshift(newEvent);
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  notifyListeners();

  try {
    setDoc(doc(db, 'events', newId), newEvent).catch(err => {
      console.error('Erro ao gravar evento no Firestore:', err);
    });
  } catch (err) {
    console.error('Erro ao conectar Firestore:', err);
  }

  return newEvent;
}

export function updateEvent(eventId: string, data: Partial<HouseLandEvent>): HouseLandEvent | null {
  const events = getEvents();
  const idx = events.findIndex(e => e.id === eventId);
  if (idx === -1) return null;

  events[idx] = { ...events[idx], ...data };
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  notifyListeners();

  try {
    setDoc(doc(db, 'events', eventId), events[idx], { merge: true }).catch(err => {
      console.error('Erro ao atualizar evento no Firestore:', err);
    });
  } catch (err) {
    console.error('Erro ao conectar Firestore:', err);
  }

  return events[idx];
}

export function updateEventTicketMode(eventId: string, newMode: TicketMode): HouseLandEvent | null {
  return updateEvent(eventId, { activeTicketMode: newMode });
}

export function updateEventStatus(eventId: string, newStatus: EventStatus): HouseLandEvent | null {
  return updateEvent(eventId, { status: newStatus });
}

export function toggleEventVisibility(eventId: string): HouseLandEvent | null {
  const events = getEvents();
  const evt = events.find(e => e.id === eventId);
  if (!evt) return null;
  const currentVisibility = evt.isPublished !== undefined ? evt.isPublished : true;
  return updateEvent(eventId, { isPublished: !currentVisibility });
}

export function deleteEvent(eventId: string): void {
  // 1. Remove imediatamente do cache local e localStorage
  let events = getEvents();
  events = events.filter(e => e.id !== eventId);
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  notifyListeners();

  // 2. Exclusão permanente e definitiva no Firestore
  try {
    const eventRef = doc(db, 'events', eventId);
    deleteDoc(eventRef).catch(err => {
      console.error(`Erro ao deletar evento ${eventId} no Firestore:`, err);
    });
  } catch (err) {
    console.error('Erro ao conectar Firestore para exclusão:', err);
  }
}

export function getLeads(eventId?: string): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEADS);
    const all: Lead[] = raw ? JSON.parse(raw) : [];
    if (eventId && eventId !== 'all') {
      return all.filter(l => l.eventId === eventId);
    }
    return all;
  } catch {
    return [];
  }
}

export function registerPreCadastro(data: {
  eventId: string;
  name: string;
  whatsapp: string;
  cpf: string;
  email?: string;
  ticketQuantity?: number;
  unitPrice?: number;
  totalExpectedValue?: number;
  companions?: Companion[];
}): Lead {
  const leads = getLeads();
  const event = getEventById(data.eventId);
  const eventName = event ? event.title : 'House Land Evento';
  const qty = data.ticketQuantity || 1;
  const unitPrice = data.unitPrice || event?.ticketPrices.pista || 50;
  const totalValue = data.totalExpectedValue || (qty * unitPrice);

  const newLead: Lead = {
    id: `LEAD-${Date.now().toString().slice(-4)}`,
    eventId: data.eventId,
    eventName,
    name: data.name.trim(),
    whatsapp: data.whatsapp.trim(),
    cpf: data.cpf.trim(),
    email: data.email?.trim() || '',
    createdAt: new Date().toISOString(),
    status: 'pending',
    ticketQuantity: qty,
    unitPrice: unitPrice,
    totalExpectedValue: totalValue,
    companions: data.companions || []
  };

  leads.unshift(newLead);
  localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
  notifyListeners();

  try {
    setDoc(doc(db, 'leads', newLead.id), newLead).catch(() => {});
  } catch {}

  return newLead;
}

export function getTickets(eventId?: string): Ticket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TICKETS);
    const all: Ticket[] = raw ? JSON.parse(raw) : [];
    if (eventId && eventId !== 'all') {
      return all.filter(t => t.eventId === eventId);
    }
    return all;
  } catch {
    return [];
  }
}

export async function generateComplimentaryTicket(data: {
  eventId: string;
  name: string;
  whatsapp: string;
  cpf: string;
  email?: string;
  type?: 'Cortesia VIP' | 'Pista Premium' | 'Camarote Chopp Open' | string;
  batch?: string;
  ticketQuantity?: number;
  companions?: Companion[];
}): Promise<Ticket> {
  const tickets = getTickets();
  const event = getEventById(data.eventId);
  const eventName = event ? event.title : 'House Land Evento';

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const ticketId = `HLRC-R-${randomSuffix}`;
  
  const cleanCpf = data.cpf.replace(/\D/g, '');
  const qrPayload = `HLRC:EVENT:${data.eventId}:TICKET:${ticketId}:CPF:${cleanCpf}`;
  const qrImage = await generateQrCodeBase64(qrPayload);

  // Geração individual de QR Codes e IDs para cada acompanhante informado
  const enrichedCompanions: Companion[] = await Promise.all(
    (data.companions || []).map(async (comp, idx) => {
      const compTicketId = `${ticketId}-C${idx + 1}`;
      const cleanCompCpf = (comp.cpf || '').replace(/\D/g, '');
      const compQrPayload = `HLRC:EVENT:${data.eventId}:TICKET:${compTicketId}:CPF:${cleanCompCpf}`;
      const compQrImage = await generateQrCodeBase64(compQrPayload);

      return {
        ...comp,
        ticketId: compTicketId,
        qrCodeData: compQrPayload,
        qrCodeImage: compQrImage,
        status: 'valid' as const
      };
    })
  );

  const newTicket: Ticket = {
    id: ticketId,
    eventId: data.eventId,
    eventName,
    name: data.name.trim(),
    whatsapp: data.whatsapp.trim(),
    cpf: data.cpf.trim(),
    email: data.email?.trim() || '',
    type: data.type || 'Cortesia VIP',
    status: 'valid',
    qrCodeData: qrPayload,
    qrCodeImage: qrImage,
    createdAt: new Date().toISOString(),
    batch: data.batch || 'Cortesia Liberada',
    ticketQuantity: data.ticketQuantity || (enrichedCompanions.length > 0 ? enrichedCompanions.length + 1 : 1),
    companions: enrichedCompanions
  };

  tickets.unshift(newTicket);
  localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  notifyListeners();

  try {
    setDoc(doc(db, 'tickets', newTicket.id), newTicket).catch(() => {});
  } catch {}

  return newTicket;
}

export async function approveLeadAndIssueTicket(leadId: string): Promise<Ticket | null> {
  const rawLeads = localStorage.getItem(STORAGE_KEYS.LEADS);
  const leads: Lead[] = rawLeads ? JSON.parse(rawLeads) : [];
  const leadIndex = leads.findIndex(l => l.id === leadId);
  if (leadIndex === -1) return null;

  const lead = leads[leadIndex];
  const ticket = await generateComplimentaryTicket({
    eventId: lead.eventId,
    name: lead.name,
    whatsapp: lead.whatsapp,
    cpf: lead.cpf,
    email: lead.email,
    type: 'Cortesia VIP',
    batch: 'Pré-cadastro Aprovado',
    ticketQuantity: lead.ticketQuantity || (lead.companions && lead.companions.length > 0 ? lead.companions.length + 1 : 1),
    companions: lead.companions || []
  });

  leads[leadIndex] = {
    ...lead,
    status: 'approved',
    ticketId: ticket.id
  };

  localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
  notifyListeners();

  try {
    setDoc(doc(db, 'leads', leadId), leads[leadIndex], { merge: true }).catch(() => {});
  } catch {}

  return ticket;
}

export async function registerDoorSale(data: DoorSaleData): Promise<Ticket> {
  const tickets = getTickets();
  const event = getEventById(data.eventId);
  const eventName = event ? event.title : 'House Land Evento';

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const ticketId = `HLRC-P-${randomSuffix}`;
  
  const cleanCpf = data.customerCpf.replace(/\D/g, '');
  const qrPayload = `HLRC:EVENT:${data.eventId}:TICKET:${ticketId}:CPF:${cleanCpf}`;
  const qrImage = await generateQrCodeBase64(qrPayload);

  const nowIso = new Date().toISOString();
  const isAutoCheckIn = data.autoCheckIn !== false;

  // Setor formatado
  let sectorLabel = 'Pista Premium';
  if (data.sector.toLowerCase().includes('camarote')) {
    sectorLabel = 'Camarote Chopp Open';
  } else if (data.sector) {
    sectorLabel = data.sector;
  }

  // Companions com IDs e QR codes individuais
  const enrichedCompanions: Companion[] = await Promise.all(
    (data.companions || []).map(async (comp, idx) => {
      const compTicketId = `${ticketId}-C${idx + 1}`;
      const cleanCompCpf = (comp.cpf || '').replace(/\D/g, '');
      const compQrPayload = `HLRC:EVENT:${data.eventId}:TICKET:${compTicketId}:CPF:${cleanCompCpf}`;
      const compQrImage = await generateQrCodeBase64(compQrPayload);

      return {
        ...comp,
        whatsapp: comp.whatsapp ? comp.whatsapp.trim() : undefined,
        ticketId: compTicketId,
        qrCodeData: compQrPayload,
        qrCodeImage: compQrImage,
        status: (isAutoCheckIn ? 'used' : 'valid') as TicketStatus,
        usedAt: isAutoCheckIn ? nowIso : undefined
      };
    })
  );

  const newTicket: Ticket = {
    id: ticketId,
    eventId: data.eventId,
    eventName,
    name: data.customerName.trim(),
    whatsapp: data.customerWhatsapp.trim(),
    cpf: data.customerCpf.trim(),
    email: data.customerEmail?.trim() || '',
    type: sectorLabel,
    status: isAutoCheckIn ? 'used' : 'valid',
    usedAt: isAutoCheckIn ? nowIso : undefined,
    checkedInBy: isAutoCheckIn ? 'Bilheteria da Porta' : undefined,
    qrCodeData: qrPayload,
    qrCodeImage: qrImage,
    createdAt: nowIso,
    batch: 'Portaria / Balcão',
    price: data.unitPrice,
    paidAmount: data.totalAmount,
    salesChannel: 'door_pos',
    paymentMethod: data.paymentMethod,
    ticketQuantity: data.quantity || (enrichedCompanions.length > 0 ? enrichedCompanions.length + 1 : 1),
    companions: enrichedCompanions
  };

  tickets.unshift(newTicket);
  localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  notifyListeners();

  try {
    setDoc(doc(db, 'tickets', newTicket.id), newTicket).catch(() => {});
  } catch {}

  // Salva no registro de leads para histórico unificado, CRM e envio de comprovantes
  try {
    const leads = getLeads();
    const newLead: Lead = {
      id: `LEAD-POS-${newTicket.id}`,
      eventId: data.eventId,
      eventName,
      name: data.customerName.trim(),
      whatsapp: data.customerWhatsapp.trim(),
      cpf: data.customerCpf.trim(),
      email: data.customerEmail?.trim() || '',
      createdAt: nowIso,
      status: 'approved',
      ticketId: newTicket.id,
      ticketQuantity: newTicket.ticketQuantity,
      unitPrice: data.unitPrice,
      totalExpectedValue: data.totalAmount,
      companions: enrichedCompanions
    };
    leads.unshift(newLead);
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
    setDoc(doc(db, 'leads', newLead.id), newLead).catch(() => {});
  } catch (err) {
    console.warn('Erro ao registrar lead de venda na porta:', err);
  }

  return newTicket;
}

export function resetDemoDatabase() {
  localStorage.removeItem(STORAGE_KEYS.EVENTS);
  localStorage.removeItem(STORAGE_KEYS.TICKETS);
  localStorage.removeItem(STORAGE_KEYS.LEADS);
  localStorage.removeItem(STORAGE_KEYS.SITE_SETTINGS);
  initStorage();
  notifyListeners();
}
