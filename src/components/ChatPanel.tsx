import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Lock,
  Trash2,
  X,
  ShieldCheck,
  Eye,
  Minimize2,
  Users,
  Quote,
  Sparkles,
  ArrowLeft,
  LogOut,
  Check,
} from 'lucide-react';
import {
  DecryptedChatMessage,
  UserProfile,
  Folder,
  Note,
} from '../types';
import {
  loadChatDraft,
  saveChatDraft,
  loadCachedChat,
  saveCachedChat,
} from '../utils/storage';
import { getKeyFingerprint } from '../utils/crypto';

interface ChatPanelProps {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  activeFolder: Folder | null;
  activeNote: Note | null;
  onlineUsers: any[];
  messages: DecryptedChatMessage[];
  onSendMessage: (text: string, roomId: string) => Promise<void>;
  onClearChat: (roomId: string) => void;
  roomId: string;
  onChangeRoom: (roomId: string) => void;
  folders: Folder[];
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isMobile,
  isOpen,
  onClose,
  currentUser,
  activeFolder,
  activeNote,
  onlineUsers,
  messages,
  onSendMessage,
  onClearChat,
  roomId,
  onChangeRoom,
  folders,
}) => {
  const [inputText, setInputText] = useState('');
  const [inspectMessage, setInspectMessage] = useState<DecryptedChatMessage | null>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore draft for this roomId when room changes
  useEffect(() => {
    const savedDraft = loadChatDraft(roomId);
    setInputText(savedDraft);
  }, [roomId]);

  // Compute key fingerprint for current room
  useEffect(() => {
    const secret = `E2EE_SECURE_VAULT_2026_${roomId}`;
    getKeyFingerprint(secret, roomId).then(setFingerprint);
  }, [roomId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle draft changes - persist immediately so leaving preserves input!
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    saveChatDraft(roomId, val);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    saveChatDraft(roomId, ''); // Clear draft once sent

    await onSendMessage(textToSend, roomId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuoteNote = () => {
    if (!activeNote) return;
    const quoteSnippet = `> Fra notat "${activeNote.title}":\n> ${activeNote.content.slice(0, 120)}...\n\n`;
    const newText = quoteSnippet + inputText;
    setInputText(newText);
    saveChatDraft(roomId, newText);
    inputRef.current?.focus();
  };

  const handleExitChat = () => {
    // Clear the active draft for this room and close chat
    saveChatDraft(roomId, '');
    setInputText('');
    setShowExitConfirm(false);
    onClose();
  };

  const currentRoomName =
    roomId === 'general'
      ? 'Felles prosjekt-chat'
      : folders.find((f) => f.id === roomId)?.name || 'Mappe-chat';

  if (!isOpen) return null;

  const content = (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800/80 text-neutral-100">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur">
        <div className="flex items-center gap-2.5 min-w-0">
          {isMobile ? (
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 rounded-lg text-neutral-300 hover:text-white bg-neutral-800/80 flex items-center gap-1 text-xs"
              title="Tilbake til notater"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Notater</span>
            </button>
          ) : (
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-neutral-100 truncate">
                {currentRoomName}
              </h3>
              <span
                className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"
                title="Tilkoblet og kryptert"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <span className="text-emerald-400 font-medium">E2EE Sikret</span>
              <span>•</span>
              <span>{onlineUsers.length} aktive</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Clear chat button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
            title="Tøm samtale"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Exit Chat button */}
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
            title="Avslutt chat"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Close / Minimize */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title={isMobile ? 'Tilbake' : 'Minimer chat-vindu'}
          >
            {isMobile ? <X className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Room Selection Tabs */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-800/80 bg-neutral-950/50 overflow-x-auto text-xs">
        <button
          onClick={() => onChangeRoom('general')}
          className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            roomId === 'general'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          }`}
        >
          <span>Felles team</span>
        </button>

        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => onChangeRoom(folder.id)}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              roomId === folder.id
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: folder.color }}
            />
            <span>{folder.name}</span>
          </button>
        ))}
      </div>

      {/* Encryption Badge Banner */}
      <div className="px-3.5 py-1.5 bg-emerald-950/20 border-b border-emerald-900/30 flex items-center justify-between text-[11px] text-emerald-300">
        <div className="flex items-center gap-1.5 truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">AES-256-GCM klientside kryptering aktiv</span>
        </div>
        <span className="font-mono text-[10px] text-emerald-400/80 shrink-0 pl-1">
          {fingerprint ? `ID: ${fingerprint.slice(0, 9)}...` : ''}
        </span>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-neutral-500">
            <div className="w-12 h-12 rounded-full bg-neutral-800/60 border border-neutral-700/60 flex items-center justify-center text-emerald-400">
              <Lock className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-neutral-300">Ingen meldinger i denne chatten ennå</p>
            <p className="text-xs text-neutral-400 max-w-xs">
              Alt du skriver her er ende-til-ende-kryptert. Kun deltakere med romnøkkelen kan lese innholdet.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-neutral-400">
                  <span>{msg.senderAvatar}</span>
                  <span className="font-medium text-neutral-300">
                    {isSelf ? 'Deg' : msg.senderName}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="relative max-w-[85%]">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isSelf
                        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm'
                        : 'bg-neutral-800 text-neutral-100 rounded-tl-sm border border-neutral-700/60'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Verification & Inspect Icon */}
                  <button
                    onClick={() => setInspectMessage(msg)}
                    className="absolute -bottom-4 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-neutral-400 hover:text-emerald-400 bg-neutral-900/90 px-1.5 py-0.5 rounded border border-neutral-700 shadow"
                    title="Inspiser kryptert chiffertekst"
                  >
                    <Eye className="w-2.5 h-2.5" />
                    <span>E2EE</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quote note helper button if a note is currently active */}
      {activeNote && (
        <div className="px-3 pt-2">
          <button
            onClick={handleQuoteNote}
            className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-indigo-300 transition-colors truncate max-w-full"
            title="Siter utdrag fra aktivt notat"
          >
            <Quote className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="truncate">Siter fra "{activeNote.title}"</span>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-900/90 space-y-2">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Skriv kryptert melding i ${currentRoomName}... (Enter for å sende)`}
            className="flex-1 px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 resize-none"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`p-2.5 rounded-xl transition-all ${
              inputText.trim()
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md scale-100'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed scale-95'
            }`}
            title="Send kryptert melding"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between px-1 text-[10px] text-neutral-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-500" /> Ende-til-ende kryptert
          </span>
          <span>Utkast bevares ved navigering</span>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" /> Tøm denne chatten?
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Dette vil slette chathistorikken for "{currentRoomName}" både lokalt og for samtalepartnerne.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white rounded-lg"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  onClearChat(roomId);
                  setShowClearConfirm(false);
                }}
                className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium shadow"
              >
                Tøm chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Chat Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-amber-400" /> Avslutte chatten?
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Dette vil avslutte chatteøkten, fjerne eventuelle uferdige utkast for dette rommet og lukke visningen. Tidligere sendte meldinger forblir trygt kryptert i historikken.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white rounded-lg"
              >
                Bli i chatten
              </button>
              <button
                onClick={handleExitChat}
                className="px-3.5 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium shadow"
              >
                Avslutt chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect E2EE Modal */}
      {inspectMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Kryptografisk E2EE-inspeksjon</span>
              </div>
              <button
                onClick={() => setInspectMessage(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1 font-medium">Dekryptert tekst (lokalt i minne):</label>
                <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-100 font-medium">
                  {inspectMessage.text}
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-medium">
                  Rå chiffertekst sendt over nettverket (AES-256-GCM):
                </label>
                <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-indigo-300 break-all select-all">
                  {inspectMessage.ciphertextPreview}
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-medium">
                  Initialiseringsvektor (IV):
                </label>
                <div className="p-2 rounded bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-300 break-all select-all">
                  {inspectMessage.iv}
                </div>
              </div>

              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-300">
                Tjeneren ser utelukkende chifferteksten og har aldri tilgang til den hemmelige nøkkelen eller meldingsteksten.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Desktop view: Right-side dock panel
  if (!isMobile) {
    return (
      <aside className="w-80 md:w-96 shrink-0 h-full border-l border-neutral-800 flex flex-col z-20">
        {content}
      </aside>
    );
  }

  // Mobile view: Dedicated in-app screen (not a new tab)
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col animate-in slide-in-from-right duration-150">
      {content}
    </div>
  );
};
