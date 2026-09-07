import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadSavedNotes,
  saveNotesToStorage,
  loadSavedFolders,
  saveFoldersToStorage,
  loadSavedTrash,
  saveTrashToStorage,
  loadCurrentUser,
  saveCurrentUser,
  loadCachedChat,
  saveCachedChat,
  getOfflineQueue,
  enqueueOfflineAction,
  clearOfflineQueue,
  REGISTERED_USERS,
} from './utils/storage';
import { Note, Folder, UserProfile, DecryptedChatMessage, EncryptedChatMessage } from './types';
import { encryptMessage, decryptMessage, getKeyFingerprint } from './utils/crypto';
import { exportFolderToPDF } from './utils/pdfExport';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { TimelineView } from './components/TimelineView';
import { TrashView } from './components/TrashView';
import { ChatPanel } from './components/ChatPanel';
import { FolderManagerModal } from './components/FolderManagerModal';
import { SearchModal } from './components/SearchModal';
import { UserProfileModal } from './components/UserProfileModal';
import {
  Menu,
  MessageSquare,
  Plus,
  Folders,
  BookOpen,
  ArrowLeft,
  X,
  Search,
  CheckCircle2,
  Trash2,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from 'lucide-react';

export default function App() {
  // Core Data State
  const [notes, setNotes] = useState<Note[]>(loadSavedNotes);
  const [trashedNotes, setTrashedNotes] = useState<Note[]>(loadSavedTrash);
  const [folders, setFolders] = useState<Folder[]>(loadSavedFolders);
  const [currentUser, setCurrentUser] = useState<UserProfile>(loadCurrentUser);

  // Navigation & Selection State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => {
    const saved = loadSavedNotes();
    return saved.length > 0 ? saved[0].id : null;
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [folderManagerFolderId, setFolderManagerFolderId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // View Mode: 'editor' | 'timeline' | 'trash'
  const [mainView, setMainView] = useState<'editor' | 'timeline' | 'trash'>('editor');

  // Mobile Navigation & View states
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileView, setMobileView] = useState<'list' | 'editor' | 'chat' | 'timeline' | 'trash'>('list');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => window.innerWidth >= 1200);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string>('general');
  const [chatMessages, setChatMessages] = useState<DecryptedChatMessage[]>(() =>
    loadCachedChat('general')
  );
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([
    { userId: currentUser.id, userName: currentUser.name, userAvatar: currentUser.avatar },
  ]);
  const [encryptionFingerprint, setEncryptionFingerprint] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [trashToast, setTrashToast] = useState<{ message: string; noteId: string } | null>(null);

  // Note List Tab / Collapsible Panel State
  const [isNoteListOpen, setIsNoteListOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('vault_notelist_open');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleNoteList = useCallback(() => {
    setIsNoteListOpen((prev) => {
      const next = !prev;
      localStorage.setItem('vault_notelist_open', String(next));
      return next;
    });
  }, []);

  // Keyboard shortcut (Ctrl+\ or Cmd+\) to toggle the notes tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleNoteList();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleNoteList]);

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);

  // Handle Window Resize for Mobile Layouts
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Online / Offline Events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setSyncToast('Nettverk tilkoblet. Synkroniserer endringer...');
      setTimeout(() => setSyncToast(null), 3500);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setSyncToast('Frakoblet: Notater og utkast lagres lokalt');
      setTimeout(() => setSyncToast(null), 3500);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcut for Cmd/Ctrl + K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute Fingerprint when active room changes
  useEffect(() => {
    const secret = `E2EE_SECURE_VAULT_2026_${activeChatRoomId}`;
    getKeyFingerprint(secret, activeChatRoomId).then(setEncryptionFingerprint);
  }, [activeChatRoomId]);

  // Load cached messages when room changes
  useEffect(() => {
    const cached = loadCachedChat(activeChatRoomId);
    setChatMessages(cached);

    // Notify server of room switch via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'room:join',
          roomId: activeChatRoomId,
        })
      );
    }
  }, [activeChatRoomId]);

  // Persist notes, trashed notes and folders locally on change
  useEffect(() => {
    saveNotesToStorage(notes);
  }, [notes]);

  useEffect(() => {
    saveTrashToStorage(trashedNotes);
  }, [trashedNotes]);

  useEffect(() => {
    saveFoldersToStorage(folders);
  }, [folders]);

  // Auto-dismiss trash toast after 6 seconds
  useEffect(() => {
    if (!trashToast) return;
    const timer = setTimeout(() => setTrashToast(null), 6000);
    return () => clearTimeout(timer);
  }, [trashToast]);

  // Setup WebSocket Client connection with Auto-Sync Queue Flush
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let socket: WebSocket;
    let reconnectTimeout: any;

    const connectWebSocket = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsOffline(false);
          // Identify user
          socket.send(
            JSON.stringify({
              type: 'user:identify',
              userId: currentUser.id,
              userName: currentUser.name,
              userAvatar: currentUser.avatar,
              userEmail: currentUser.email,
              roomId: activeChatRoomId,
            })
          );

          // Flush any offline queued changes made while disconnected
          const pending = getOfflineQueue();
          if (pending.length > 0) {
            pending.forEach((act) => {
              if (act.type === 'note:update') {
                socket.send(JSON.stringify({ type: 'note:sync', note: act.payload }));
              } else if (act.type === 'note:delete') {
                socket.send(JSON.stringify({ type: 'note:delete', noteId: act.payload.noteId }));
              } else if (act.type === 'folder:update') {
                socket.send(JSON.stringify({ type: 'folder:sync', folder: act.payload }));
              }
            });
            clearOfflineQueue();
            setSyncToast(`Synkroniserte ${pending.length} lokale endringer.`);
            setTimeout(() => setSyncToast(null), 3000);
          }
        };

        socket.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'sync:init' || data.type === 'presence:update') {
              if (data.onlineUsers) {
                setOnlineUsers(data.onlineUsers);
              }
            } else if (data.type === 'chat:message') {
              const encMsg: EncryptedChatMessage = data.message;
              const secret = `E2EE_SECURE_VAULT_2026_${encMsg.roomId}`;

              // Decrypt client-side using Web Crypto API
              const decryptedText = await decryptMessage(
                encMsg.ciphertext,
                encMsg.iv,
                secret,
                encMsg.roomId
              );

              const newDecryptedMsg: DecryptedChatMessage = {
                id: encMsg.id,
                roomId: encMsg.roomId,
                senderId: encMsg.senderId,
                senderName: encMsg.senderName,
                senderAvatar: encMsg.senderAvatar,
                text: decryptedText,
                ciphertextPreview: encMsg.ciphertext.slice(0, 32) + '...',
                iv: encMsg.iv,
                timestamp: encMsg.timestamp,
                isSelf: encMsg.senderId === currentUser.id,
              };

              setChatMessages((prev) => {
                if (prev.some((m) => m.id === newDecryptedMsg.id)) return prev;
                const updated = [...prev, newDecryptedMsg];
                saveCachedChat(encMsg.roomId, updated);
                return updated;
              });

              if (!isChatOpen && encMsg.senderId !== currentUser.id) {
                setUnreadChatCount((prev) => prev + 1);
              }
            } else if (data.type === 'chat:history') {
              const encMessages: EncryptedChatMessage[] = data.messages || [];
              const secret = `E2EE_SECURE_VAULT_2026_${data.roomId}`;

              const decryptedList: DecryptedChatMessage[] = await Promise.all(
                encMessages.map(async (m) => {
                  const plain = await decryptMessage(m.ciphertext, m.iv, secret, m.roomId);
                  return {
                    id: m.id,
                    roomId: m.roomId,
                    senderId: m.senderId,
                    senderName: m.senderName,
                    senderAvatar: m.senderAvatar,
                    text: plain,
                    ciphertextPreview: m.ciphertext.slice(0, 32) + '...',
                    iv: m.iv,
                    timestamp: m.timestamp,
                    isSelf: m.senderId === currentUser.id,
                  };
                })
              );

              setChatMessages(decryptedList);
              saveCachedChat(data.roomId, decryptedList);
            } else if (data.type === 'chat:cleared') {
              if (data.roomId === activeChatRoomId) {
                setChatMessages([]);
                saveCachedChat(data.roomId, []);
              }
            } else if (data.type === 'note:updated') {
              if (data.note) {
                setNotes((prev) => {
                  const exists = prev.some((n) => n.id === data.note.id);
                  if (exists) {
                    return prev.map((n) => (n.id === data.note.id ? data.note : n));
                  }
                  return [data.note, ...prev];
                });
              }
            } else if (data.type === 'note:deleted') {
              if (data.noteId) {
                setNotes((prev) => prev.filter((n) => n.id !== data.noteId));
              }
            }
          } catch (err) {
            console.error('Feil ved behandling av WebSocket melding:', err);
          }
        };

        socket.onclose = () => {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch (e) {
        console.warn('Kunne ikke koble til WebSocket, prøver på nytt...', e);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, [currentUser.id, currentUser.name, activeChatRoomId]);

  // Send Encrypted Chat Message
  const handleSendMessage = async (text: string, roomId: string) => {
    const secret = `E2EE_SECURE_VAULT_2026_${roomId}`;
    const { ciphertext, iv } = await encryptMessage(text, secret, roomId);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const encryptedPayload: EncryptedChatMessage = {
      id: messageId,
      roomId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      ciphertext,
      iv,
      timestamp: Date.now(),
    };

    // Optimistically add to local decrypted state immediately
    const decryptedMsg: DecryptedChatMessage = {
      id: messageId,
      roomId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text,
      ciphertextPreview: ciphertext.slice(0, 32) + '...',
      iv,
      timestamp: Date.now(),
      isSelf: true,
    };

    setChatMessages((prev) => {
      const updated = [...prev, decryptedMsg];
      saveCachedChat(roomId, updated);
      return updated;
    });

    // Send ciphertext through WebSocket server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:send',
          message: encryptedPayload,
        })
      );
    }
  };

  // Clear Chat
  const handleClearChat = (roomId: string) => {
    setChatMessages([]);
    saveCachedChat(roomId, []);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:clear',
          roomId,
        })
      );
    }
  };

  // Notes CRUD Handlers
  const handleCreateNote = () => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      title: 'Nytt notat',
      content: `# Nytt notat\n\nStart å skrive her...`,
      folderId: selectedFolderId || (folders.length > 0 ? folders[0].id : 'folder_general'),
      tags: selectedTag ? [selectedTag] : ['notat'],
      images: [],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastEditedBy: currentUser.name,
    };

    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    if (isMobile) {
      setMobileView('editor');
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'note:sync',
          note: newNote,
        })
      );
    } else {
      enqueueOfflineAction({ type: 'note:update', payload: newNote });
    }
  };

  const handleUpdateNote = (updated: Note) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'note:sync',
          note: updated,
        })
      );
    } else {
      enqueueOfflineAction({ type: 'note:update', payload: updated });
    }
  };

  const handleDeleteNote = (noteId: string) => {
    const noteToTrash = notes.find((n) => n.id === noteId);
    if (!noteToTrash) return;

    const trashedNote: Note = {
      ...noteToTrash,
      deletedAt: Date.now(),
    };

    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setTrashedNotes((prev) => [trashedNote, ...prev.filter((t) => t.id !== noteId)]);

    if (selectedNoteId === noteId) {
      const remaining = notes.filter((n) => n.id !== noteId);
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
      if (isMobile) {
        setMobileView('list');
      }
    }

    setTrashToast({
      message: `«${noteToTrash.title || 'Uten tittel'}» flyttet til papirkurven`,
      noteId: noteToTrash.id,
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'note:delete',
          noteId,
        })
      );
    } else {
      enqueueOfflineAction({ type: 'note:delete', payload: { noteId } });
    }
  };

  // Restore a note from trash back to active notes
  const handleRestoreNote = (noteId: string) => {
    const noteToRestore = trashedNotes.find((n) => n.id === noteId);
    if (!noteToRestore) return;

    // Verify folder still exists; if not, assign to first existing folder
    const folderExists = folders.some((f) => f.id === noteToRestore.folderId);
    const targetFolderId = folderExists ? noteToRestore.folderId : (folders[0]?.id || 'folder_general');

    const restoredNote: Note = {
      ...noteToRestore,
      folderId: targetFolderId,
      deletedAt: undefined,
      updatedAt: Date.now(),
    };

    setTrashedNotes((prev) => prev.filter((n) => n.id !== noteId));
    setNotes((prev) => [restoredNote, ...prev.filter((n) => n.id !== noteId)]);
    setSelectedNoteId(restoredNote.id);
    setMainView('editor');
    if (isMobile) setMobileView('editor');

    setSyncToast(`«${restoredNote.title || 'Notat'}» ble gjenopprettet.`);
    setTimeout(() => setSyncToast(null), 3500);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'note:sync',
          note: restoredNote,
        })
      );
    } else {
      enqueueOfflineAction({ type: 'note:update', payload: restoredNote });
    }
  };

  // Restore all notes from trash
  const handleRestoreAll = () => {
    if (trashedNotes.length === 0) return;
    const count = trashedNotes.length;

    const restoredList: Note[] = trashedNotes.map((n) => {
      const folderExists = folders.some((f) => f.id === n.folderId);
      return {
        ...n,
        folderId: folderExists ? n.folderId : (folders[0]?.id || 'folder_general'),
        deletedAt: undefined,
        updatedAt: Date.now(),
      };
    });

    setNotes((prev) => [...restoredList, ...prev]);
    setTrashedNotes([]);
    if (restoredList.length > 0) {
      setSelectedNoteId(restoredList[0].id);
    }
    setMainView('editor');
    if (isMobile) setMobileView('list');

    setSyncToast(`${count} notater ble gjenopprettet.`);
    setTimeout(() => setSyncToast(null), 3500);

    restoredList.forEach((rn) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'note:sync',
            note: rn,
          })
        );
      } else {
        enqueueOfflineAction({ type: 'note:update', payload: rn });
      }
    });
  };

  // Permanently delete a single note
  const handlePermanentlyDeleteNote = (noteId: string) => {
    setTrashedNotes((prev) => prev.filter((n) => n.id !== noteId));
    setSyncToast('Notat slettet permanent.');
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Empty entire trash permanently
  const handleEmptyTrash = () => {
    setTrashedNotes([]);
    setSyncToast('Papirkurven er tømt.');
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Folders Handlers
  const handleSaveFolder = (savedFolder: Folder) => {
    setFolders((prev) => {
      const exists = prev.some((f) => f.id === savedFolder.id);
      if (exists) {
        return prev.map((f) => (f.id === savedFolder.id ? savedFolder : f));
      }
      return [...prev, savedFolder];
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'folder:sync',
          folder: savedFolder,
        })
      );
    } else {
      enqueueOfflineAction({ type: 'folder:update', payload: savedFolder });
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
  };

  // Export Entire Folder to PDF
  const handleExportFolderPDF = async (folder: Folder) => {
    const folderNotes = notes.filter((n) => n.folderId === folder.id);
    await exportFolderToPDF(folder, folderNotes);
  };

  const activeNote = notes.find((n) => n.id === selectedNoteId) || null;
  const activeFolder = folders.find((f) => f.id === selectedFolderId) || null;

  const handleToggleChat = () => {
    if (isMobile) {
      setMobileView(mobileView === 'chat' ? 'editor' : 'chat');
    } else {
      setIsChatOpen((prev) => !prev);
    }
    setUnreadChatCount(0);
  };

  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden select-none font-sans relative">
      {/* Sync Status Toast Notification */}
      {syncToast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-700 text-neutral-200 text-xs shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Move-to-Trash Toast Notification with Undo ("Angre") */}
      {trashToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{trashToast.message}</span>
          </div>
          <div className="flex items-center gap-2 pl-2 border-l border-neutral-700">
            <button
              onClick={() => {
                handleRestoreNote(trashToast.noteId);
                setTrashToast(null);
              }}
              className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center gap-1 shadow-sm"
              title="Gjenopprett notatet umiddelbart"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Angre</span>
            </button>
            <button
              onClick={() => setTrashToast(null)}
              className="p-1 text-neutral-400 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {isMobile && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-40 transition-transform duration-200 ${
          isMobile
            ? isMobileSidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
            : 'translate-x-0'
        }`}
      >
        <Sidebar
          folders={folders}
          notes={notes}
          trashedCount={trashedNotes.length}
          selectedFolderId={selectedFolderId}
          selectedTag={selectedTag}
          currentUser={currentUser}
          isOffline={isOffline}
          isChatOpen={isChatOpen || (isMobile && mobileView === 'chat')}
          activeView={mainView}
          onSelectView={(view) => {
            setMainView(view);
            if (view === 'editor') {
              setIsNoteListOpen(true);
            }
            if (isMobile) {
              setMobileView(view === 'timeline' ? 'timeline' : view === 'trash' ? 'trash' : 'list');
              setIsMobileSidebarOpen(false);
            }
          }}
          onSelectFolder={(fId) => {
            setSelectedFolderId(fId);
            setMainView('editor');
            setIsNoteListOpen(true);
            if (isMobile) {
              setMobileView('list');
              setIsMobileSidebarOpen(false);
            }
          }}
          onSelectTag={(tag) => {
            setSelectedTag(tag);
            setMainView('editor');
            setIsNoteListOpen(true);
            if (isMobile) {
              setMobileView('list');
              setIsMobileSidebarOpen(false);
            }
          }}
          onOpenFolderManager={(fId) => {
            setFolderManagerFolderId(fId || null);
            setIsFolderManagerOpen(true);
            if (isMobile) setIsMobileSidebarOpen(false);
          }}
          onOpenProfile={() => {
            setIsProfileModalOpen(true);
            if (isMobile) setIsMobileSidebarOpen(false);
          }}
          onOpenSearch={() => {
            setIsSearchModalOpen(true);
            if (isMobile) setIsMobileSidebarOpen(false);
          }}
          onToggleChat={() => {
            handleToggleChat();
            if (isMobile) setIsMobileSidebarOpen(false);
          }}
          unreadCount={unreadChatCount}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile Header */}
        {isMobile && (
          <header className="flex items-center justify-between px-3 py-2.5 bg-neutral-900 border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-2">
              {mobileView !== 'list' ? (
                <button
                  onClick={() => {
                    setMobileView('list');
                    if (mainView === 'timeline' || mainView === 'trash') setMainView('editor');
                  }}
                  className="p-1.5 rounded-lg text-neutral-300 hover:text-white bg-neutral-800/80"
                  title="Tilbake til listen"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="p-1.5 rounded-lg text-neutral-300 hover:text-white bg-neutral-800/80"
                  title="Meny"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}

              <span className="text-sm font-semibold truncate max-w-[170px]">
                {mobileView === 'chat'
                  ? 'Samarbeidschat'
                  : mobileView === 'timeline'
                  ? 'Tidslinje for notater'
                  : mobileView === 'trash'
                  ? 'Papirkurv'
                  : mobileView === 'editor' && activeNote
                  ? activeNote.title
                  : selectedFolderId
                  ? folders.find((f) => f.id === selectedFolderId)?.name
                  : 'Mine notater'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200"
                title="Søk"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={handleToggleChat}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  mobileView === 'chat'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-neutral-800 text-neutral-300'
                }`}
                title="Chat"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadChatCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            </div>
          </header>
        )}

        {/* Content Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Note List Tab / Collapsible Panel (Hidden in full Trash or full Timeline mode) */}
          {mainView !== 'trash' && mainView !== 'timeline' && (
            <>
              {/* Desktop Collapsed Tab Trigger (Handle on left side to open "Alle notater") */}
              {!isMobile && !isNoteListOpen && (
                <aside
                  onClick={() => setIsNoteListOpen(true)}
                  className="w-10 h-full border-r border-neutral-800 bg-neutral-900/90 hover:bg-neutral-850 flex flex-col items-center justify-between py-4 cursor-pointer shrink-0 transition-colors group select-none z-10"
                  title="Åpne alle notater fanen (Ctrl+\)"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 group-hover:text-indigo-400 group-hover:bg-neutral-750 transition-colors">
                      <PanelLeftOpen className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-400 group-hover:text-neutral-100 [writing-mode:vertical-rl] rotate-180 tracking-wider">
                      Alle notater
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 group-hover:text-indigo-300">
                      {notes.length}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </aside>
              )}

              {/* Note List Panel (Shown when open on desktop or active view on mobile) */}
              {(!isMobile ? isNoteListOpen : mobileView === 'list') && (
                <div className={`${isMobile ? 'w-full h-full' : 'h-full flex shrink-0'} animate-in fade-in duration-150`}>
                  <NoteList
                    notes={notes}
                    folders={folders}
                    selectedNoteId={selectedNoteId}
                    selectedFolderId={selectedFolderId}
                    selectedTag={selectedTag}
                    searchQuery={searchQuery}
                    onSelectNote={(noteId) => {
                      setSelectedNoteId(noteId);
                      setMainView('editor');
                      if (isMobile) setMobileView('editor');
                    }}
                    onCreateNote={handleCreateNote}
                    onSearchChange={setSearchQuery}
                    onExportFolderPDF={handleExportFolderPDF}
                    onOpenFullTimeline={() => {
                      setMainView('timeline');
                      if (isMobile) setMobileView('timeline');
                    }}
                    onToggleCollapse={() => {
                      if (isMobile) {
                        setMobileView('editor');
                      } else {
                        setIsNoteListOpen(false);
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Trash View Mode */}
          {(mainView === 'trash' || (isMobile && mobileView === 'trash')) ? (
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              <TrashView
                trashedNotes={trashedNotes}
                folders={folders}
                onRestoreNote={handleRestoreNote}
                onRestoreAll={handleRestoreAll}
                onPermanentlyDeleteNote={handlePermanentlyDeleteNote}
                onEmptyTrash={handleEmptyTrash}
                onClose={() => {
                  setMainView('editor');
                  if (isMobile) setMobileView(selectedNoteId ? 'editor' : 'list');
                }}
              />
            </div>
          ) : (mainView === 'timeline' || (isMobile && mobileView === 'timeline')) ? (
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              <TimelineView
                notes={notes}
                folders={folders}
                selectedNoteId={selectedNoteId}
                onSelectNote={(noteId) => {
                  setSelectedNoteId(noteId);
                  setMainView('editor');
                  if (isMobile) setMobileView('editor');
                }}
                onCreateNote={handleCreateNote}
                onClose={() => {
                  setMainView('editor');
                  if (isMobile) setMobileView(selectedNoteId ? 'editor' : 'list');
                }}
              />
            </div>
          ) : (
            /* Note Editor Area */
            (!isMobile || mobileView === 'editor') && (
              <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {activeNote ? (
                  <NoteEditor
                    note={activeNote}
                    folders={folders}
                    currentUser={currentUser}
                    onUpdateNote={handleUpdateNote}
                    onDeleteNote={handleDeleteNote}
                    onOpenFolderManager={(fId) => {
                      setFolderManagerFolderId(fId);
                      setIsFolderManagerOpen(true);
                    }}
                    onOpenChat={handleToggleChat}
                    unreadChatCount={unreadChatCount}
                    isOffline={isOffline}
                    isNoteListOpen={isNoteListOpen}
                    onToggleNoteList={toggleNoteList}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500 space-y-3">
                    {!isNoteListOpen && !isMobile && (
                      <button
                        onClick={() => setIsNoteListOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs font-medium border border-neutral-700/80 transition-colors mb-2 shadow-sm"
                        title="Åpne alle notater fanen (Ctrl+\)"
                      >
                        <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
                        <span>Åpne alle notater (fane)</span>
                      </button>
                    )}
                    <BookOpen className="w-12 h-12 text-neutral-700" />
                    <p className="text-sm font-medium text-neutral-400">Ingen notat er valgt</p>
                    <button
                      onClick={handleCreateNote}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                    >
                      Opprett et nytt notat
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {/* Chat Panel */}
          {(isChatOpen || (isMobile && mobileView === 'chat')) && (
            <ChatPanel
              isMobile={isMobile}
              isOpen={isChatOpen || (isMobile && mobileView === 'chat')}
              onClose={() => {
                if (isMobile) {
                  setMobileView('editor');
                } else {
                  setIsChatOpen(false);
                }
              }}
              currentUser={currentUser}
              activeFolder={activeFolder}
              activeNote={activeNote}
              onlineUsers={onlineUsers}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onClearChat={handleClearChat}
              roomId={activeChatRoomId}
              onChangeRoom={setActiveChatRoomId}
              folders={folders}
            />
          )}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        {isMobile && (
          <nav className="flex items-center justify-around py-2 border-t border-neutral-800 bg-neutral-900 shrink-0 text-neutral-400">
            <button
              onClick={() => setMobileView('list')}
              className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
                mobileView === 'list' ? 'text-indigo-400' : 'hover:text-neutral-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Notater</span>
            </button>

            <button
              onClick={handleCreateNote}
              className="flex flex-col items-center gap-1 text-[10px] font-medium text-neutral-200 hover:text-white"
            >
              <div className="p-1.5 rounded-full bg-indigo-600 text-white -mt-4 shadow-lg border border-indigo-400/40">
                <Plus className="w-4 h-4" />
              </div>
              <span>Nytt</span>
            </button>

            <button
              onClick={() => {
                setMobileView('chat');
                setUnreadChatCount(0);
              }}
              className={`flex flex-col items-center gap-1 text-[10px] font-medium relative ${
                mobileView === 'chat' ? 'text-indigo-400' : 'hover:text-neutral-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex flex-col items-center gap-1 text-[10px] font-medium hover:text-neutral-200"
            >
              <Folders className="w-4 h-4" />
              <span>Mapper</span>
            </button>
          </nav>
        )}
      </div>

      {/* Modals */}
      <FolderManagerModal
        isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
        folders={folders}
        currentFolderId={folderManagerFolderId}
        currentUser={currentUser}
        onSaveFolder={handleSaveFolder}
        onDeleteFolder={handleDeleteFolder}
        onExportFolderPDF={handleExportFolderPDF}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        notes={notes}
        folders={folders}
        onSelectNote={(noteId) => {
          setSelectedNoteId(noteId);
          if (isMobile) setMobileView('editor');
        }}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        encryptionFingerprint={encryptionFingerprint}
      />
    </div>
  );
}
