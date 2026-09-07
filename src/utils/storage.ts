import { Folder, Note, DecryptedChatMessage, UserProfile } from '../types';

const STORAGE_KEYS = {
  NOTES: 'notater_app_notes_v2',
  FOLDERS: 'notater_app_folders_v2',
  TRASH: 'notater_app_trash_v2',
  CHAT_CACHE: 'notater_app_chat_cache_v2',
  CHAT_DRAFT: 'notater_app_chat_draft_v2',
  USER_PROFILE: 'notater_app_current_user_v2',
  OFFLINE_QUEUE: 'notater_app_offline_queue_v2',
};

export const TRASH_RETENTION_DAYS = 30;
export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface OfflineAction {
  id: string;
  type: 'note:update' | 'note:delete' | 'folder:update' | 'chat:send';
  payload: any;
  timestamp: number;
}

export const REGISTERED_USERS: UserProfile[] = [
  {
    id: 'usr_me',
    name: 'Kari Nordmann',
    email: 'kgranum963@gmail.com',
    avatar: '👩‍💻',
    role: 'Hovedbruker & Prosjektleder',
  },
  {
    id: 'usr_ola',
    name: 'Ola Hansen',
    email: 'ola.hansen@arbeid.no',
    avatar: '👨‍🎨',
    role: 'Designer & Bidragsyter',
  },
  {
    id: 'usr_sofia',
    name: 'Sofia Berg',
    email: 'sofia.berg@arkitektur.no',
    avatar: '👩‍🔬',
    role: 'Utvikler & Tester',
  },
];

export const INITIAL_FOLDERS: Folder[] = [
  {
    id: 'folder_general',
    name: 'Felles prosjekt',
    color: '#6366f1',
    icon: 'folder-kanban',
    ownerId: 'usr_me',
    isShared: true,
    collaborators: [
      {
        userId: 'usr_me',
        userName: 'Kari Nordmann',
        userEmail: 'kgranum963@gmail.com',
        userAvatar: '👩‍💻',
        permission: 'owner',
      },
      {
        userId: 'usr_ola',
        userName: 'Ola Hansen',
        userEmail: 'ola.hansen@arbeid.no',
        userAvatar: '👨‍🎨',
        permission: 'edit',
      },
      {
        userId: 'usr_sofia',
        userName: 'Sofia Berg',
        userEmail: 'sofia.berg@arkitektur.no',
        userAvatar: '👩‍🔬',
        permission: 'edit',
      },
    ],
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'folder_personal',
    name: 'Personlige notater',
    color: '#10b981',
    icon: 'lock',
    ownerId: 'usr_me',
    isShared: false,
    collaborators: [
      {
        userId: 'usr_me',
        userName: 'Kari Nordmann',
        userEmail: 'kgranum963@gmail.com',
        userAvatar: '👩‍💻',
        permission: 'owner',
      },
    ],
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'folder_design',
    name: 'Design & Ressurser',
    color: '#ec4899',
    icon: 'palette',
    ownerId: 'usr_ola',
    isShared: true,
    collaborators: [
      {
        userId: 'usr_ola',
        userName: 'Ola Hansen',
        userEmail: 'ola.hansen@arbeid.no',
        userAvatar: '👨‍🎨',
        permission: 'owner',
      },
      {
        userId: 'usr_me',
        userName: 'Kari Nordmann',
        userEmail: 'kgranum963@gmail.com',
        userAvatar: '👩‍💻',
        permission: 'edit',
      },
    ],
    createdAt: Date.now() - 86400000 * 2,
  },
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note_project_kickoff',
    title: '🚀 Prosjektplan 2026: Sanntidssamarbeid & E2EE',
    content: `# Prosjektplan 2026: Notatsamarbeid i sanntid

Dette notatet oppsummerer arkitekturen for vår distribuerte notat- og samhandlingstjeneste.

## Viktige milepæler
- [x] Etablere **ende-til-ende-kryptering (E2EE)** med AES-256-GCM
- [x] Full lokal IndexedDB/localStorage offline-mellomlagring
- [x] Støtte for bildeopplasting og visning direkte i notater
- [ ] Implementere multi-bruker synkronisering på tvers av enheter
- [ ] Sikker mappe- og tilgangsstyring (Les vs. Rediger)

## Arkitekturoversikt
Samtalemeldinger krypteres på klientsiden med Web Crypto API før sending. Tjeneren ser kun vilkårlig chiffertekst (\`AES-GCM\`) og har aldri tilgang til råteksten.

| Komponent | Teknisk løsning | Formål |
| :--- | :--- | :--- |
| **Kryptering** | AES-256-GCM + PBKDF2 | Null-innsyn E2EE |
| **Sanntid** | WebSocket Server | Lynrask meldingsutveksling |
| **Persistens** | Lokal hurtigbuffer + Sky | Ytelse og offline-drift |
| **Eksport** | jsPDF + Canvas | Enkel PDF-generering |

> *"Sikkerhet og personvern skal aldri gå på bekostning av brukeropplevelse eller hastighet."*

---
*Opprettet for felles prosjektarbeid.*`,
    folderId: 'folder_general',
    tags: ['prosjekt', 'sikkerhet', 'e2ee', 'plan'],
    images: [
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    ],
    pinned: true,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000 * 4,
    lastEditedBy: 'Kari Nordmann',
  },
  {
    id: 'note_design_guidelines',
    title: '🎨 Visuell retning & Mørkt tema',
    content: `# Visuell retning for mørkt tema

Vårt mørke tema er skreddersydd for lange arbeidsøkter og optimal kontrast.

### Fargepalett
- **Bakgrunn:** Dyp obsidian nøytral (\`#09090b\`)
- **Flater / Kort:** Nøytral 900 (\`#18181b\`) med diskré kanter (\`#27272a\`)
- **Aksent:** Fiolett / Indigo (\`#6366f1\`) for fokus og handlinger
- **Tekst:** Nøytral 100 med WCAG AA kontrastgaranti

### Sjekkliste for bildeinnsetting
- [x] Støtte for dra-og-slipp av bildefiler
- [x] Automatisk konvertering til optimaliserte data-strenger
- [x] Gallerivisning og forhåndsvisning i Markdown

![Fjell og nordlys](https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80)`,
    folderId: 'folder_design',
    tags: ['design', 'ui', 'tema', 'bilder'],
    images: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    ],
    pinned: false,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 7200000,
    lastEditedBy: 'Ola Hansen',
  },
  {
    id: 'note_personal_ideas',
    title: '💡 Idéer og oppskrifter',
    content: `# Mine private idéer

Dette notatet ligger i min private mappe og er beskyttet mot uautorisert tilgang.

## Ting å huske
1. Kjøpe kaffe og notatblokk
2. Teste Markdown-tabeller med formler
3. Evaluere nye krypteringsnøkler for prosjektmapper`,
    folderId: 'folder_personal',
    tags: ['privat', 'ideer'],
    images: [],
    pinned: false,
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 2,
    lastEditedBy: 'Kari Nordmann',
  },
];

// Local persistence functions
export function loadSavedNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kunne ikke laste notater fra lokal lagring:', e);
  }
  return INITIAL_NOTES;
}

export function saveNotesToStorage(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  } catch (e) {
    console.error('Kunne ikke lagre notater til lokal lagring:', e);
  }
}

// Trash / Papirkurv persistence with 30-day auto purge
export function loadSavedTrash(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRASH);
    if (raw) {
      const parsed: Note[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        // Automatically prune notes that have been in the trash for longer than 30 days
        const valid = parsed.filter((note) => {
          if (!note.deletedAt) return false;
          return now - note.deletedAt <= TRASH_RETENTION_MS;
        });

        // If any expired notes were removed, persist the cleaned list
        if (valid.length !== parsed.length) {
          saveTrashToStorage(valid);
        }
        return valid;
      }
    }
  } catch (e) {
    console.error('Kunne ikke laste papirkurv fra lokal lagring:', e);
  }
  return [];
}

export function saveTrashToStorage(trash: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(trash));
  } catch (e) {
    console.error('Kunne ikke lagre papirkurv til lokal lagring:', e);
  }
}

export function calculateDaysRemaining(deletedAt?: number): number {
  if (!deletedAt) return TRASH_RETENTION_DAYS;
  const now = Date.now();
  const timeElapsed = now - deletedAt;
  const timeRemaining = TRASH_RETENTION_MS - timeElapsed;
  if (timeRemaining <= 0) return 0;
  return Math.max(1, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));
}

export function loadSavedFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Kunne ikke laste mapper:', e);
  }
  return INITIAL_FOLDERS;
}

export function saveFoldersToStorage(folders: Folder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  } catch (e) {
    console.error('Kunne ikke lagre mapper:', e);
  }
}

export function loadCurrentUser(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Kunne ikke laste brukerprofil:', e);
  }
  return REGISTERED_USERS[0];
}

export function saveCurrentUser(user: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
  } catch (e) {
    console.error('Kunne ikke lagre brukerprofil:', e);
  }
}

export function loadCachedChat(roomId: string): DecryptedChatMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.CHAT_CACHE}_${roomId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Kunne ikke hente chathistorikk for rom:', roomId, e);
  }
  return [];
}

export function saveCachedChat(roomId: string, messages: DecryptedChatMessage[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEYS.CHAT_CACHE}_${roomId}`, JSON.stringify(messages));
  } catch (e) {
    console.error('Kunne ikke mellomlagre chathistorikk:', e);
  }
}

export function loadChatDraft(roomId: string): string {
  try {
    return localStorage.getItem(`${STORAGE_KEYS.CHAT_DRAFT}_${roomId}`) || '';
  } catch {
    return '';
  }
}

export function saveChatDraft(roomId: string, draft: string): void {
  try {
    if (draft.trim()) {
      localStorage.setItem(`${STORAGE_KEYS.CHAT_DRAFT}_${roomId}`, draft);
    } else {
      localStorage.removeItem(`${STORAGE_KEYS.CHAT_DRAFT}_${roomId}`);
    }
  } catch (e) {
    console.error('Kunne ikke lagre chat-utkast:', e);
  }
}

// Robust Offline Action Queue for Auto-Sync
export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}

export function enqueueOfflineAction(action: {
  type: OfflineAction['type'];
  payload: any;
}): void {
  try {
    const queue = getOfflineQueue();
    const newAction: OfflineAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: action.type,
      payload: action.payload,
      timestamp: Date.now(),
    };
    queue.push(newAction);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error('Kunne ikke legge til handling i offline-kø:', e);
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
  } catch {
    // ignore
  }
}
