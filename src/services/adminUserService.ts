import { AdminUser, AdminRole } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';

const ADMIN_STORAGE_KEY = 'hl360_admin_users_v2';

const SEED_ADMINS: AdminUser[] = [
  {
    uid: 'adm-001',
    name: 'Diretoria House Land',
    email: 'contato@houseland.online',
    role: 'admin',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    uid: 'adm-002',
    name: 'Bruno - Portaria Principal',
    email: 'portaria@houseland.online',
    role: 'scanner',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    uid: 'adm-003',
    name: 'Renata - Bilheteria & Caixa',
    email: 'financeiro@houseland.online',
    role: 'financeiro',
    active: true,
    createdAt: new Date().toISOString()
  }
];

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(cb => cb());
}

export function subscribeToAdminUsers(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getAdminUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_ADMINS;
  } catch {
    return SEED_ADMINS;
  }
}

export async function checkAdminUserActive(identifier: string): Promise<{ exists: boolean; active: boolean; user?: AdminUser }> {
  const users = getAdminUsers();
  const clean = identifier.toLowerCase().trim();
  const user = users.find(u => u.uid === clean || u.email.toLowerCase() === clean);
  if (!user) return { exists: false, active: true }; // Permite login default se não estiver explicitamente bloqueado
  return { exists: true, active: user.active, user };
}

export async function createAdminUser(data: { name: string; email: string; role: AdminRole; password?: string }): Promise<AdminUser> {
  const users = getAdminUsers();
  const newUser: AdminUser = {
    uid: `adm-${Date.now()}`,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
    active: true,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(users));
  notify();

  try {
    await setDoc(doc(db, 'admin_users', newUser.uid), newUser);
  } catch {}

  return newUser;
}

export async function toggleAdminUserStatus(uid: string): Promise<boolean> {
  const users = getAdminUsers();
  const idx = users.findIndex(u => u.uid === uid);
  if (idx === -1) return false;

  users[idx].active = !users[idx].active;
  users[idx].updatedAt = new Date().toISOString();
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(users));
  notify();

  try {
    await updateDoc(doc(db, 'admin_users', uid), { active: users[idx].active, updatedAt: users[idx].updatedAt });
  } catch {}

  return users[idx].active;
}

export async function deleteAdminUser(uid: string): Promise<boolean> {
  let users = getAdminUsers();
  users = users.filter(u => u.uid !== uid);
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(users));
  notify();

  try {
    await deleteDoc(doc(db, 'admin_users', uid));
  } catch {}

  return true;
}
