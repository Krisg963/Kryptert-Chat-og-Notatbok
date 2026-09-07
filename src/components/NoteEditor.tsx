import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileDown,
  Image as ImageIcon,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Table as TableIcon,
  Columns,
  Eye,
  Edit3,
  Pin,
  Trash2,
  Tag,
  Folder as FolderIcon,
  Share2,
  Check,
  AlertCircle,
  Clock,
  User,
  Mic,
  MicOff,
  Volume2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Note, Folder, UserProfile, EditorMode, PermissionLevel } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { exportNoteToPDF } from '../utils/pdfExport';

// Check for Web Speech API (standard and webkit prefix)
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

interface NoteEditorProps {
  note: Note;
  folders: Folder[];
  currentUser: UserProfile;
  onUpdateNote: (updated: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenFolderManager: (folderId: string) => void;
  onOpenChat: () => void;
  unreadChatCount?: number;
  isOffline?: boolean;
  isNoteListOpen?: boolean;
  onToggleNoteList?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  folders,
  currentUser,
  onUpdateNote,
  onDeleteNote,
  onOpenFolderManager,
  onOpenChat,
  unreadChatCount = 0,
  isOffline = false,
  isNoteListOpen = true,
  onToggleNoteList,
}) => {
  const [mode, setMode] = useState<EditorMode>('split');
  const [newTag, setNewTag] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Web Speech API States
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechLanguage, setSpeechLanguage] = useState<'nb-NO' | 'en-US'>('nb-NO');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const currentFolder = folders.find((f) => f.id === note.folderId) || folders[0];

  // Determine user permission in current folder
  const userPermission: PermissionLevel = (() => {
    if (!currentFolder) return 'edit';
    if (currentFolder.ownerId === currentUser.id) return 'owner';
    const collab = currentFolder.collaborators.find((c) => c.userId === currentUser.id);
    return collab ? collab.permission : 'edit';
  })();

  const canEdit = userPermission === 'owner' || userPermission === 'edit';

  const handleTitleChange = (title: string) => {
    if (!canEdit) return;
    onUpdateNote({
      ...note,
      title,
      updatedAt: Date.now(),
      lastEditedBy: currentUser.name,
    });
  };

  const handleContentChange = (content: string) => {
    if (!canEdit) return;
    onUpdateNote({
      ...note,
      content,
      updatedAt: Date.now(),
      lastEditedBy: currentUser.name,
    });
  };

  const handleTogglePin = () => {
    if (!canEdit) return;
    onUpdateNote({
      ...note,
      pinned: !note.pinned,
      updatedAt: Date.now(),
    });
  };

  const handleFolderChange = (folderId: string) => {
    if (!canEdit) return;
    onUpdateNote({
      ...note,
      folderId,
      updatedAt: Date.now(),
    });
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newTag.trim() || !canEdit) return;
    const clean = newTag.trim().replace(/^#/, '').toLowerCase();
    if (!note.tags.includes(clean)) {
      onUpdateNote({
        ...note,
        tags: [...note.tags, clean],
        updatedAt: Date.now(),
      });
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!canEdit) return;
    onUpdateNote({
      ...note,
      tags: note.tags.filter((t) => t !== tagToRemove),
      updatedAt: Date.now(),
    });
  };

  // Insert markdown snippet at cursor
  const insertMarkdown = (prefix: string, suffix: string = '', defaultText: string = '') => {
    if (!canEdit || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const updated = text.substring(0, start) + replacement + text.substring(end);
    handleContentChange(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 10);
  };

  // Image Upload Handling
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        // Append to note images array and insert markdown
        const imageName = file.name.replace(/\.[^/.]+$/, '');
        const imageMarkdown = `\n![${imageName}](${dataUrl})\n`;
        const updatedImages = [...note.images, dataUrl];

        const updatedContent = note.content + imageMarkdown;
        onUpdateNote({
          ...note,
          content: updatedContent,
          images: updatedImages,
          updatedAt: Date.now(),
          lastEditedBy: currentUser.name,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop images onto editor
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (!canEdit) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleImageUpload(file);
    }
  };

  // Paste image from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!canEdit) return;
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        handleImageUpload(file);
      }
    }
  };

  // Interactive Checklist toggle in preview
  const handleToggleTaskInPreview = (taskIndex: number) => {
    if (!canEdit) return;
    const lines = note.content.split('\n');
    let currentTask = 0;

    const updatedLines = lines.map((line) => {
      const taskMatch = line.match(/^([-*]\s+\[)([ xX])(\]\s+.*)$/);
      if (taskMatch) {
        if (currentTask === taskIndex) {
          const isCurrentlyChecked = taskMatch[2].toLowerCase() === 'x';
          currentTask++;
          return `${taskMatch[1]}${isCurrentlyChecked ? ' ' : 'x'}${taskMatch[3]}`;
        }
        currentTask++;
      }
      return line;
    });

    handleContentChange(updatedLines.join('\n'));
  };

  // Insert transcribed speech at cursor position or append to content
  const insertSpokenText = useCallback((spokenText: string) => {
    if (!spokenText.trim() || !canEdit) return;
    const textarea = textareaRef.current;
    if (!textarea) {
      const separator = note.content.length > 0 && !note.content.endsWith('\n') && !note.content.endsWith(' ') ? ' ' : '';
      handleContentChange(note.content + separator + spokenText);
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    const needsSpace = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
    const inserted = (needsSpace ? ' ' : '') + spokenText;
    const newContent = before + inserted + after;

    handleContentChange(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = start + inserted.length;
        textareaRef.current.selectionEnd = start + inserted.length;
        textareaRef.current.focus();
      }
    }, 10);
  }, [canEdit, note.content]);

  // Stop speech recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Start speech recognition using Web Speech API
  const startListening = useCallback(() => {
    if (!canEdit) return;
    setSpeechError(null);

    if (!SpeechRecognitionAPI) {
      setSpeechError(
        'Web Speech API støttes ikke av denne nettleseren. Vennligst bruk en nettleser med talegjenkjenning (f.eks. Google Chrome eller Microsoft Edge).'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript;
          } else {
            interimChunk += res[0].transcript;
          }
        }

        if (finalChunk.trim()) {
          insertSpokenText(finalChunk.trim());
        }
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (event: any) => {
        console.warn('Web Speech feil:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError(
            'Mikrofontilgang ble avvist. Sjekk tillatelser for mikrofon i nettleseren.'
          );
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Keep listening for speech
        } else if (event.error === 'audio-capture') {
          setSpeechError('Fant ingen tilkoblet mikrofon på enheten.');
          setIsListening(false);
        } else if (event.error === 'network') {
          setSpeechError('Nettverksfeil under talegjenkjenning.');
          setIsListening(false);
        } else {
          setSpeechError(`Dikteringsfeil: ${event.error}`);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Feil ved start av Web Speech:', err);
      setSpeechError('Kunne ikke aktivere mikrofon: ' + (err.message || 'Ukjent feil'));
      setIsListening(false);
    }
  }, [canEdit, speechLanguage, insertSpokenText]);

  // Clean up speech recognition on unmount or note change
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, [note.id]);

  // PDF Export
  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    setPdfSuccess(false);
    const ok = await exportNoteToPDF('printable-note-preview', note.title);
    setIsExportingPDF(false);
    if (ok) {
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
    >
      {/* Read-only notification if view-only permissions */}
      {!canEdit && (
        <div className="bg-amber-950/40 border-b border-amber-900/40 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Du har kun lesetilgang til denne mappen. Endringer kan ikke lagres.</span>
          </div>
          <span className="font-medium text-amber-400">Kun lesetilgang</span>
        </div>
      )}

      {/* Editor Top Navigation & Action Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Note List Tab Toggle Button */}
          {onToggleNoteList && (
            <button
              type="button"
              onClick={onToggleNoteList}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                isNoteListOpen
                  ? 'bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700/60'
                  : 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-500/40 shadow-sm'
              }`}
              title={isNoteListOpen ? 'Skjul notatfane (Ctrl+\\)' : 'Åpne notatfane (Ctrl+\\)'}
            >
              {isNoteListOpen ? (
                <PanelLeftClose className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftOpen className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isNoteListOpen ? 'Skjul fane' : 'Notatfane'}
              </span>
            </button>
          )}

          {/* Folder Selector */}
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: currentFolder?.color || '#6366f1' }}
            />
            <select
              value={note.folderId}
              onChange={(e) => handleFolderChange(e.target.value)}
              disabled={!canEdit}
              className="bg-transparent text-neutral-200 font-medium focus:outline-none cursor-pointer text-xs"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id} className="bg-neutral-900 text-neutral-200">
                  {f.name} {f.isShared ? '(Delt)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Folder Sharing info button */}
          <button
            onClick={() => onOpenFolderManager(currentFolder.id)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Administrer mapperettigheter og samarbeidspartnere"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">
              {currentFolder.collaborators.length > 1
                ? `${currentFolder.collaborators.length} deltakere`
                : 'Mappe-tilgang'}
            </span>
          </button>

          {/* Pin Toggle */}
          <button
            onClick={handleTogglePin}
            className={`p-1.5 rounded-lg border transition-colors ${
              note.pinned
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
            title={note.pinned ? 'Fjern feste' : 'Fest notat øverst'}
          >
            <Pin className="w-4 h-4" />
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setMode('edit')}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                mode === 'edit'
                  ? 'bg-neutral-800 text-neutral-100 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Kun redigering"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Rediger</span>
            </button>
            <button
              onClick={() => setMode('split')}
              className={`px-2 py-1 rounded-md transition-colors hidden sm:flex items-center gap-1 ${
                mode === 'split'
                  ? 'bg-neutral-800 text-neutral-100 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Delt visning (Editor & Live Preview)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Delt</span>
            </button>
            <button
              onClick={() => setMode('preview')}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                mode === 'preview'
                  ? 'bg-neutral-800 text-neutral-100 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Kun forhåndsvisning"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Vis</span>
            </button>
          </div>

          {/* Export to PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700/60 transition-colors text-xs font-medium"
            title="Eksporter notat til PDF med bilder og formatering"
          >
            {pdfSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Eksportert!</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isExportingPDF ? 'Genererer PDF...' : 'Eksporter PDF'}</span>
              </>
            )}
          </button>

          {/* Delete Button (Move to trash) */}
          {canEdit && (
            <button
              onClick={() => {
                if (
                  confirm(
                    `Vil du flytte «${note.title || 'Uten tittel'}» til papirkurven?\n\nNotatet oppbevares trygt i 30 dager og kan gjenopprettes når som helst.`
                  )
                ) {
                  onDeleteNote(note.id);
                }
              }}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
              title="Flytt til papirkurv (kan gjenopprettes innen 30 dager)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Markdown Toolbar (Only visible when editing is allowed and mode is edit or split) */}
      {canEdit && mode !== 'preview' && (
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-neutral-800/80 bg-neutral-900/40 overflow-x-auto shrink-0 text-neutral-400">
          <button
            onClick={() => insertMarkdown('**', '**', 'fet tekst')}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Fet skrift (**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertMarkdown('*', '*', 'kursiv')}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Kursiv (*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-neutral-800 mx-1" />
          <button
            onClick={() => insertMarkdown('# ', '', 'Overskrift 1')}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Overskrift 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertMarkdown('## ', '', 'Overskrift 2')}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Overskrift 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-neutral-800 mx-1" />
          <button
            onClick={() => insertMarkdown('- ', '', 'Punktliste')}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Punktliste (-)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertMarkdown('1. ', '', 'Nummerert punkt')}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Nummerert liste"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertMarkdown('- [ ] ', '', 'Oppgave')}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Sjekkliste / Oppgave"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-neutral-800 mx-1" />
          <button
            onClick={() => insertMarkdown('> ', '', 'Sitat')}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Sitatblokk (>)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertMarkdown('```ts\n', '\n```', '// skriv kode her')}
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Kodeblokk"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() =>
              insertMarkdown(
                '\n| Kolonne 1 | Kolonne 2 |\n| :--- | :--- |\n| Verdi 1 | Verdi 2 |\n'
              )
            }
            className="p-1.5 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Sett inn tabell"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-neutral-800 mx-1" />

          {/* Insert Image Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 transition-colors text-xs font-medium"
            title="Last opp og legg til bilde (eller dra-og-slipp)"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Legg til bilde</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleImageUpload(e.target.files[0]);
              }
            }}
          />

          <span className="w-px h-4 bg-neutral-800 mx-1" />

          {/* Web Speech API Voice Dictation */}
          <div className="flex items-center gap-1">
            {isListening ? (
              <button
                type="button"
                onClick={stopListening}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white transition-all text-xs font-medium animate-pulse shadow-sm shadow-rose-500/30"
                title="Lytter til tale... Klikk for å stoppe diktering"
              >
                <Mic className="w-3.5 h-3.5 text-white animate-bounce" />
                <span>Stopp diktering</span>
                <span className="flex items-center gap-0.5 ml-1">
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startListening}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-800/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 transition-colors text-xs font-medium group"
                title="Dikter notat med stemmen via Web Speech API"
              >
                <Mic className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition-transform group-hover:scale-110" />
                <span>Dikter</span>
              </button>
            )}

            {/* Language Selector / Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextLang = speechLanguage === 'nb-NO' ? 'en-US' : 'nb-NO';
                setSpeechLanguage(nextLang);
                if (isListening) {
                  stopListening();
                }
              }}
              className="px-2 py-1 rounded-md bg-neutral-900 hover:bg-neutral-800 text-[11px] text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors whitespace-nowrap"
              title={`Dikteringsspråk: ${speechLanguage === 'nb-NO' ? 'Norsk (Bokmål)' : 'English (US)'}. Klikk for å bytte.`}
            >
              {speechLanguage === 'nb-NO' ? '🇳🇴 NO' : '🇬🇧 EN'}
            </button>
          </div>
        </div>
      )}

      {/* Active Dictation Live Feedback Banner */}
      {isListening && (
        <div className="bg-emerald-950/40 border-b border-emerald-900/50 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-emerald-400 shrink-0">
                Dikterer ({speechLanguage === 'nb-NO' ? 'Norsk' : 'Engelsk'}):
              </span>
              <span className="italic truncate text-emerald-100/90 font-mono">
                {interimTranscript ? `«${interimTranscript}»` : 'Snakk nå, teksten settes inn automatisk...'}
              </span>
            </div>
          </div>
          <button
            onClick={stopListening}
            className="ml-3 px-2.5 py-0.5 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-medium shrink-0 transition-colors"
          >
            Ferdig
          </button>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="bg-rose-950/40 border-b border-rose-900/40 px-4 py-2 flex items-center justify-between text-xs text-rose-300 shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{speechError}</span>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="text-xs text-rose-400 hover:text-rose-200 ml-2 shrink-0 underline"
          >
            Lukk
          </button>
        </div>
      )}

      {/* Main Note Canvas / Work Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
        {/* Drag & drop overlay indicator */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-30 bg-indigo-950/80 border-2 border-dashed border-indigo-500 rounded-xl m-4 flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm">
            <ImageIcon className="w-12 h-12 text-indigo-400 animate-bounce mb-2" />
            <p className="text-sm font-semibold text-indigo-200">Slipp bildet her for å legge det til i notatet</p>
          </div>
        )}

        {/* Left / Top: Editor Form & Textarea */}
        {(mode === 'edit' || mode === 'split') && (
          <div
            className={`flex-1 flex flex-col min-h-0 border-r border-neutral-800/80 p-5 overflow-y-auto ${
              mode === 'split' ? 'w-full md:w-1/2' : 'w-full'
            }`}
          >
            {/* Title Input */}
            <input
              type="text"
              value={note.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              disabled={!canEdit}
              placeholder="Notattittel..."
              className="text-2xl sm:text-3xl font-bold text-neutral-100 bg-transparent placeholder-neutral-600 focus:outline-none mb-3"
            />

            {/* Tags area */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              <Tag className="w-3.5 h-3.5 text-neutral-500" />
              {note.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300"
                >
                  #{t}
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-400 ml-0.5 text-neutral-500"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}

              {canEdit && (
                <div className="inline-flex items-center">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="+ Legg til tag..."
                    className="text-xs bg-transparent border-b border-neutral-800 text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 px-1 py-0.5 w-24"
                  />
                </div>
              )}
            </div>

            {/* Markdown Textarea */}
            <textarea
              ref={textareaRef}
              value={note.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onPaste={handlePaste}
              disabled={!canEdit}
              placeholder="Skriv notat i Markdown... Du kan også lime inn eller dra-og-slippe bilder her direkte!"
              className="flex-1 w-full bg-transparent text-neutral-200 text-sm leading-relaxed placeholder-neutral-600 focus:outline-none resize-none font-mono selection:bg-indigo-500/30 min-h-[300px]"
            />
          </div>
        )}

        {/* Right / Bottom: Live Preview & Printable Container */}
        {(mode === 'preview' || mode === 'split') && (
          <div
            className={`flex-1 flex flex-col min-h-0 p-5 sm:p-7 overflow-y-auto bg-neutral-950/60 ${
              mode === 'split' ? 'w-full md:w-1/2' : 'w-full'
            }`}
          >
            {/* The element targeted for PDF generation */}
            <div id="printable-note-preview" className="p-4 rounded-xl bg-neutral-950">
              {/* Header preview in document */}
              <div className="mb-4 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium mb-1.5">
                  <FolderIcon className="w-3.5 h-3.5" />
                  <span>{currentFolder.name}</span>
                  {note.pinned && <span className="text-amber-400">• Festet</span>}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-100 mb-2">
                  {note.title || 'Uten tittel'}
                </h1>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Sist endret: {new Date(note.updatedAt).toLocaleString('no-NO')}
                  </span>
                  {note.lastEditedBy && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      av {note.lastEditedBy}
                    </span>
                  )}
                </div>

                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {note.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Formatted Markdown Body */}
              <MarkdownRenderer
                content={note.content}
                onToggleTask={handleToggleTaskInPreview}
              />
            </div>
          </div>
        )}
      </div>

      {/* Editor Status Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-800/80 bg-neutral-900/60 text-xs text-neutral-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isOffline ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span>{isOffline ? 'Offline - Lagret lokalt' : 'Synkronisert & Sikret'}</span>
          </span>
          <span className="hidden sm:inline text-neutral-600">|</span>
          <span className="hidden sm:inline">
            {note.content.split(/\s+/).filter(Boolean).length} ord
          </span>
          <span className="hidden sm:inline">
            {note.images.length} {note.images.length === 1 ? 'bilde' : 'bilder'}
          </span>
        </div>

        {/* Quick mobile chat toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors font-medium"
          >
            <span>Åpne chat</span>
            {unreadChatCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                {unreadChatCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
