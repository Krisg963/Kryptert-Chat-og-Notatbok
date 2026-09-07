import React from 'react';
import {
  Folder as FolderIcon,
  FolderPlus,
  Hash,
  Search,
  MessageSquare,
  Shield,
  Wifi,
  WifiOff,
  User,
  Users,
  Settings,
  Sparkles,
  BookOpen,
  Clock,
  Trash2,
} from 'lucide-react';
import { Folder, Note, UserProfile } from '../types';

interface SidebarProps {
  folders: Folder[];
  notes: Note[];
  trashedCount?: number;
  selectedFolderId: string | null;
  selectedTag: string | null;
  currentUser: UserProfile;
  isOffline: boolean;
  isChatOpen: boolean;
  activeView?: 'notes' | 'timeline' | 'trash';
  onSelectFolder: (folderId: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onSelectView?: (view: 'notes' | 'timeline' | 'trash') => void;
  onOpenFolderManager: (folderId?: string) => void;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
  onToggleChat: () => void;
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  notes,
  trashedCount = 0,
  selectedFolderId,
  selectedTag,
  currentUser,
  isOffline,
  isChatOpen,
  activeView = 'notes',
  onSelectFolder,
  onSelectTag,
  onSelectView,
  onOpenFolderManager,
  onOpenProfile,
  onOpenSearch,
  onToggleChat,
  unreadCount = 0,
}) => {
  // Aggregate all unique tags from notes
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).filter(Boolean);

  const getFolderNoteCount = (folderId: string) =>
    notes.filter((n) => n.folderId === folderId).length;

  return (
    <aside className="w-64 shrink-0 h-full border-r border-neutral-800 bg-neutral-950 flex flex-col justify-between select-none">
      {/* Top Header & Branding */}
      <div>
        <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-neutral-100 tracking-tight">
                Notater & Samarbeid
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <Shield className="w-3 h-3" />
                <span>E2EE Kryptert</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search trigger button */}
        <div className="p-3">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-all text-xs group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-400 transition-colors" />
              <span>Søk i alt...</span>
            </div>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-500 border border-neutral-800">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="px-3 py-1 space-y-0.5">
          <button
            onClick={() => {
              onSelectFolder(null);
              onSelectTag(null);
              if (onSelectView) onSelectView('notes');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeView === 'notes' && selectedFolderId === null && selectedTag === null
                ? 'bg-neutral-800 text-neutral-100 font-semibold'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FolderIcon className="w-4 h-4 text-indigo-400" />
              <span>Alle notater</span>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">{notes.length}</span>
          </button>

          {/* Timeline navigation item */}
          <button
            onClick={() => {
              if (onSelectView) onSelectView('timeline');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeView === 'timeline'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700/60'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Tidslinje</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 font-medium">
              Historikk
            </span>
          </button>

          {/* Chat navigation item as requested */}
          <button
            onClick={onToggleChat}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              isChatOpen
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Samarbeidschat (E2EE)</span>
            </div>
            {unreadCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* Trash (Papirkurv) navigation item */}
          <button
            onClick={() => {
              if (onSelectView) onSelectView('trash');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeView === 'trash'
                ? 'bg-neutral-800 text-rose-300 font-semibold border border-rose-500/30'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
            }`}
            title="Papirkurv for slettede notater (lagres i 30 dager)"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Papirkurv</span>
            </div>
            {trashedCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-semibold border border-rose-500/25">
                {trashedCount}
              </span>
            ) : (
              <span className="text-[10px] text-neutral-600 font-mono">0</span>
            )}
          </button>
        </nav>

        {/* Folders Section */}
        <div className="px-3 pt-5">
          <div className="flex items-center justify-between px-2.5 pb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            <span>Mapper & Arbeidsområder</span>
            <button
              onClick={() => onOpenFolderManager()}
              className="p-1 rounded text-neutral-400 hover:text-indigo-300 hover:bg-neutral-800 transition-colors"
              title="Ny mappe / administrer rettigheter"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {folders.map((folder) => {
              const isSelected = selectedFolderId === folder.id;
              const count = getFolderNoteCount(folder.id);
              return (
                <div
                  key={folder.id}
                  className="group flex items-center justify-between rounded-lg transition-colors"
                >
                  <button
                    onClick={() => {
                      onSelectFolder(folder.id);
                      onSelectTag(null);
                    }}
                    className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-neutral-800 text-neutral-100 font-semibold'
                        : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: folder.color }}
                      />
                      <span className="truncate">{folder.name}</span>
                      {folder.isShared && (
                        <Users className="w-3 h-3 text-neutral-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-500 font-mono ml-1">{count}</span>
                  </button>

                  <button
                    onClick={() => onOpenFolderManager(folder.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-neutral-300 transition-opacity"
                    title="Mappeinnstillinger og rettigheter"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tags Section */}
        {allTags.length > 0 && (
          <div className="px-3 pt-5">
            <div className="px-2.5 pb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Tagger
            </div>
            <div className="flex flex-wrap gap-1 px-1 max-h-36 overflow-y-auto">
              {allTags.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      onSelectTag(isSelected ? null : tag);
                    }}
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-neutral-800'
                    }`}
                  >
                    <Hash className="w-2.5 h-2.5 opacity-60" />
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer: User identity & Connection status */}
      <div className="p-3 border-t border-neutral-800/80 bg-neutral-950 space-y-2">
        {/* Network Sync Status */}
        <div className="flex items-center justify-between px-2 text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 font-medium">Frakoblet (Offline)</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Tilkoblet & synkronisert</span>
              </>
            )}
          </div>
        </div>

        {/* Current user card (click to open profile or switch collaborator) */}
        <button
          onClick={onOpenProfile}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 transition-colors text-left group"
          title="Klikk for å endre profil eller bytte samarbeidspartner"
        >
          <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm select-none">
            {currentUser.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-neutral-200 group-hover:text-indigo-300 transition-colors truncate">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-neutral-500 truncate">{currentUser.email}</div>
          </div>
        </button>
      </div>
    </aside>
  );
};
