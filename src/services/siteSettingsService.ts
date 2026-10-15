import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { SiteSettings } from '../types';
import { 
  DEFAULT_SITE_SETTINGS, 
  initialSiteSettings, 
  DEFAULT_RESERVATION_FLOW_SETTINGS, 
  getSiteSettings, 
  saveSiteSettings, 
  updateSiteSettings,
  normalizeImageUrl 
} from './eventService';

/**
 * Busca as configurações do site diretamente do documento 'settings' da coleção 'site_settings' do Firestore.
 */
export async function fetchSiteSettingsFromFirestore(): Promise<SiteSettings> {
  try {
    const settingsDocRef = doc(db, 'site_settings', 'settings');
    const snap = await getDoc(settingsDocRef);
    if (snap.exists()) {
      const data = snap.data() as SiteSettings;
      const merged: SiteSettings = {
        ...DEFAULT_SITE_SETTINGS,
        ...data,
        reservationFlowSettings: {
          ...DEFAULT_RESERVATION_FLOW_SETTINGS,
          ...(data.reservationFlowSettings || {})
        }
      };
      localStorage.setItem('hl360_site_settings_v1', JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Erro ao carregar site_settings do Firestore:', err);
  }
  return getSiteSettings();
}

/**
 * Inscreve um callback para ser notificado em tempo real quando o documento 'settings' de 'site_settings' mudar.
 */
export function subscribeToSiteSettings(callback: (settings: SiteSettings) => void): () => void {
  const settingsDocRef = doc(db, 'site_settings', 'settings');
  return onSnapshot(settingsDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as SiteSettings;
      const merged: SiteSettings = {
        ...DEFAULT_SITE_SETTINGS,
        ...data,
        reservationFlowSettings: {
          ...DEFAULT_RESERVATION_FLOW_SETTINGS,
          ...(data.reservationFlowSettings || {})
        }
      };
      localStorage.setItem('hl360_site_settings_v1', JSON.stringify(merged));
      callback(merged);
    }
  }, (err) => {
    console.warn('Erro no listener de site_settings:', err);
  });
}

export {
  DEFAULT_SITE_SETTINGS,
  initialSiteSettings,
  DEFAULT_RESERVATION_FLOW_SETTINGS,
  getSiteSettings,
  saveSiteSettings,
  updateSiteSettings,
  normalizeImageUrl
};
