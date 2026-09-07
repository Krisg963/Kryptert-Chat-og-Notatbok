export type PermissionLevel = 'view' | 'edit' | 'owner';

export interface FolderCollaborator {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  permission: PermissionLevel;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  ownerId: string;
  isShared: boolean;
  collaborators: FolderCollaborator[];
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string; // Markdown formatted
  folderId: string;
  tags: string[];
  images: string[]; // Base64 or URL images attached
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
  lastEditedBy?: string;
  isOfflineDraft?: boolean;
  deletedAt?: number; // Timestamp when note was moved to trash
}

export interface EncryptedChatMessage {
  id: string;
  roomId: string; // Folder ID or 'global'
  senderId: string;
  senderName: string;
  senderAvatar: string;
  ciphertext: string; // Base64 encoded encrypted payload
  iv: string;         // Base64 encoded initialization vector
  timestamp: number;
}

export interface DecryptedChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  ciphertextPreview: string;
  iv: string;
  timestamp: number;
  isSelf: boolean;
  status?: 'sending' | 'sent' | 'cached';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  folderId?: string;
  isPrivate?: boolean;
  secretKeyPhrase: string; // Used for AES-GCM 256 derivation
}

export type ViewMode = 'notes' | 'chat';
export type EditorMode = 'split' | 'edit' | 'preview';
export type MainViewMode = 'editor' | 'timeline';
