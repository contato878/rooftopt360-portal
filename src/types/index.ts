export type TicketMode = 'pre_registration' | 'complimentary' | 'direct_sale';

export type TicketStatus = 'valid' | 'used' | 'cancelled';

export type EventStatus = 'active' | 'draft' | 'past';

export interface Band {
  id: string;
  name: string;
  genre: string;
  timeSlot: string;
  description: string;
  image: string;
  highlightSong: string;
}

export interface BeerTap {
  id?: string;
  name: string;
  brewery?: string;
  style?: string;
  abv: string;
  ibu: string;
  price?: string;
  notes?: string;
  description?: string;
  status?: 'available' | 'sold_out';
}

export interface BbqItem {
  id: string;
  name: string;
  cut: string;
  description: string;
  servedWith?: string;
  price?: string;
  status?: 'available' | 'sold_out';
  image?: string;
}

export interface HouseLandEvent {
  id: string;
  title: string;
  editionBadge: string;
  slug: string;
  status: EventStatus;
  date: string;
  doorsOpen: string;
  location: string;
  address: string;
  capacity: number;
  bannerImage: string;
  shortDescription?: string;
  fullDescription?: string;
  hasCamarote?: boolean;
  activeTicketMode: TicketMode;
  bands: Band[];
  beerTaps?: BeerTap[];
  bbqMenu?: BbqItem[];
  ticketPrices: {
    pista: number;
    camarote: number;
  };
  contactWhatsApp: string;
  isPublished?: boolean;
  showCapacityPublicly?: boolean;
  highlights?: string[];
  attendeesCount?: number;
}

export type SalesChannel = 'online' | 'door_pos';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix_pos' | 'cash';

export interface Ticket {
  id: string; // Ex: 'HLRC-R-8421'
  eventId: string;
  eventName: string;
  name: string;
  whatsapp: string;
  cpf: string;
  type: 'Cortesia VIP' | 'Pista Premium' | 'Camarote Chopp Open' | string;
  status: TicketStatus;
  qrCodeData: string;
  qrCodeImage: string; // Base64 data URL
  createdAt: string;
  usedAt?: string;
  checkedInBy?: string;
  batch?: string;
  price?: number;
  email?: string;
  ticketQuantity?: number;
  companions?: Companion[];
  salesChannel?: SalesChannel; // online ou bilheteria de porta
  paymentMethod?: PaymentMethod; // forma de cobrança presencial
  paidAmount?: number; // valor total cobrado
}

export interface DoorSaleData {
  eventId: string;
  sector: 'pista' | 'camarote' | string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerCpf: string;
  customerWhatsapp: string;
  customerEmail?: string;
  companions?: Array<{ name: string; cpf: string; whatsapp?: string }>;
  autoCheckIn?: boolean;
}

export interface Companion {
  name: string;
  cpf: string;
  whatsapp?: string;
  email?: string;
  ticketId?: string;
  qrCodeData?: string;
  qrCodeImage?: string;
  status?: TicketStatus;
  usedAt?: string;
}

export interface Lead {
  id: string;
  eventId: string;
  eventName: string;
  name: string;
  whatsapp: string;
  cpf: string;
  email?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  ticketId?: string;
  ticketQuantity?: number;
  unitPrice?: number;
  totalExpectedValue?: number;
  companions?: Companion[];
}

export interface CheckInResult {
  status: 'success' | 'already_used' | 'invalid';
  ticket?: Ticket;
  message: string;
  timestamp: string;
}

export interface ReservationFlowSettings {
  step1Description: string;
  step2PaymentNotice: string;
  successTitle: string;
  successSubtitle: string;
  whatsappButtonLabel: string;
  whatsappContactNumber: string;
  whatsappCustomMessage: string;
}

export interface SiteSettings {
  logoImage?: string;
  logoHeight?: number;
  brandName?: string;
  brandSubtitle?: string;
  heroBadgeText?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBannerImage: string;
  agendaSectionTitle: string;
  ctaButtonText: string;
  aboutBadge?: string;
  aboutTitle?: string;
  aboutText?: string;
  aboutLogoUrl?: string;
  showAboutStats?: boolean;
  contactEmail?: string;
  contactWhatsapp?: string;
  productionWhatsapp?: string;
  ctaPartnershipWhatsapp?: string;
  partnershipBadge?: string;
  partnershipTitle?: string;
  partnershipDescription?: string;
  partnershipBtnText?: string;
  footerBrandTitle?: string;
  footerBrandDescription?: string;
  footerDisclaimer?: string;
  stats?: { label: string; value: string }[];
  footerCnpj?: string;
  showCnpj?: boolean;
  instagramUrl?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  showPastEventsSection?: boolean;
  showMenuSection?: boolean;
  countdownEventId?: string;
  showCountdown?: boolean;
  updatedAt?: string;
  reservationFlowSettings?: ReservationFlowSettings;
  masterBeerTaps?: BeerTap[];
  masterBbqMenu?: BbqItem[];
}

export type AdminRole = 'admin' | 'scanner' | 'financeiro';

export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}
