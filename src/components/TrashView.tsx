import React, { useState, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  Search,
  Folder as FolderIcon,
  Eye,
  X,
  CheckCircle,
  Calendar,
  Image as ImageIcon,
  Tag,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { Note, Folder } from '../types';
import { calculateDaysRemaining, TRASH_RETENTION_DAYS } from '../utils/storage';
import { MarkdownRenderer } from './MarkdownRenderer';

interface TrashViewProps {
  trashedNotes: Note[];
  folders: Folder[];
  onRestoreNote: (noteId: string) => void;
  onRestoreAll: () => void;
  onPermanentlyDeleteNote: (noteId: string) => void;
  onEmptyTrash: () => void;
  onClose: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({
  trashedNotes,
  folders,
  onRestoreNote,
  onRestoreAll,
  onPermanentlyDeleteNote,
  onEmptyTrash,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Quick lookup for folders
  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  // Filtered and sorted trashed notes (most recently deleted first)
  const filteredTrash = useMemo(() => {
    let list = [...trashedNotes].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [trashedNotes, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 sm:px-6 py-4 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Lukk papirkurv og gå tilbake"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-neutral-100">
                  Papirkurv
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                  {trashedNotes.length} {trashedNotes.length === 1 ? 'notat' : 'notater'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Slettede notater oppbevares i opptil 30 dager før de fjernes permanent.
              </p>
            </div>
          </div>
        </div>

        {/* Global actions: Restore all & Empty trash */}
        {trashedNotes.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={onRestoreAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
              title="Gjenopprett alle slettede notater"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gjenopprett alle</span>
            </button>

            <button
              onClick={() => setConfirmEmptyOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-medium border border-rose-800/60 transition-colors"
              title="Slett alle notater i papirkurven permanent"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tøm papirkurv</span>
            </button>
          </div>
        )}
      </div>

      {/* 30-Day Policy Alert Banner */}
      <div className="px-4 sm:px-6 py-2.5 bg-neutral-900/40 border-b border-neutral-800/80 flex items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Notater slettes permanent automatisk etter <strong>30 dager</strong> i papirkurven. Du kan når som helst gjenopprette dem tilbake til mappen deres.
          </span>
        </div>
        <span className="text-[11px] font-mono text-neutral-500 shrink-0 hidden md:inline">
          Lagringsfrist: {TRASH_RETENTION_DAYS} dager
        </span>
      </div>

      {/* Sub-bar with search */}
      {trashedNotes.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b border-neutral-800/60 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søk i papirkurven..."
              className="w-full pl-9 pr-8 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs text-neutral-500 font-medium">
            Viser {filteredTrash.length} av {trashedNotes.length}
          </span>
        </div>
      )}

      {/* Main Trashed Notes Grid / List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {trashedNotes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 shadow-inner">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-semibold text-neutral-200">
                Papirkurven er tom
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Når du sletter notater, havner de her i 30 dager før de slettes permanent. Du kan gjenopprette dem når som helst ved behov.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
            >
              Gå tilbake til notater
            </button>
          </div>
        ) : filteredTrash.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm text-neutral-300 font-medium">
              Ingen notater i papirkurven matcher «{searchQuery}»
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Tøm søkefeltet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTrash.map((note) => {
              const folder = folderMap.get(note.folderId);
              const daysLeft = calculateDaysRemaining(note.deletedAt);
              const deletedDateStr = note.deletedAt
                ? new Date(note.deletedAt).toLocaleDateString('no-NO', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Nylig';

              const cleanSnippet = note.content
                .replace(/!\[.*?\]\(.*?\)/g, '')
                .replace(/[#*`_~[\]()-]/g, '')
                .trim();

              const isUrgent = daysLeft <= 5;

              return (
                <div
                  key={note.id}
                  className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all group relative"
                >
                  <div className="space-y-2 mb-3">
                    {/* Top row: Days remaining & Folder */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      {/* Days Remaining Pill */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isUrgent
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}
                        title={`Slettes permanent automatisk om ${daysLeft} dager`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>
                          {daysLeft === 1
                            ? '1 dag igjen'
                            : `${daysLeft} dager igjen`}
                        </span>
                      </span>

                      {/* Folder badge */}
                      {folder ? (
                        <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 truncate max-w-[120px]">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: folder.color }}
                          />
                          <span className="truncate">{folder.name}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-500">
                          (Tidligere mappe)
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-indigo-300 transition-colors truncate">
                      {note.title || 'Uten tittel'}
                    </h3>

                    {/* Content preview snippet */}
                    <p className="text-xs text-neutral-400/90 line-clamp-3 leading-relaxed">
                      {cleanSnippet || 'Ingen tekstinnhold i notatet...'}
                    </p>

                    {/* Tags and images indicators */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap text-[10px] text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-600" />
                        <span>Slettet: {deletedDateStr}</span>
                      </span>

                      {note.images && note.images.length > 0 && (
                        <span className="flex items-center gap-1 text-indigo-400">
                          <ImageIcon className="w-3 h-3" />
                          <span>{note.images.length} bilde{note.images.length > 1 ? 'r' : ''}</span>
                        </span>
                      )}

                      {note.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.2 rounded bg-neutral-950 text-neutral-400 border border-neutral-800"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2 mt-auto">
                    <button
                      onClick={() => setPreviewNote(note)}
                      className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors"
                      title="Forhåndsvis notatet før gjenoppretting"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Vis</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setConfirmDeleteId(note.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Slett permanent med en gang"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onRestoreNote(note.id)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                        title="Gjenopprett til dine aktive notater"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Gjenopprett</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Preview Trashed Note */}
      {previewNote && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewNote(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-xs font-medium border border-rose-500/30">
                  Papirkurv-forhåndsvisning
                </span>
                <span className="text-xs text-neutral-400">
                  {calculateDaysRemaining(previewNote.deletedAt)} dager igjen før sletting
                </span>
              </div>
              <button
                onClick={() => setPreviewNote(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Note Content Preview */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h2 className="text-xl font-bold text-neutral-100">
                {previewNote.title || 'Uten tittel'}
              </h2>

              <div className="text-neutral-200">
                <MarkdownRenderer content={previewNote.content} />
              </div>

              {previewNote.images && previewNote.images.length > 0 && (
                <div className="pt-4 border-t border-neutral-800">
                  <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    Vedlagte bilder ({previewNote.images.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {previewNote.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Vedlegg ${i + 1}`}
                        className="rounded-lg max-h-48 object-cover w-full border border-neutral-800"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer actions */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const id = previewNote.id;
                  setPreviewNote(null);
                  setConfirmDeleteId(id);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
              >
                Slett permanent
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewNote(null)}
                  className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800"
                >
                  Lukk
                </button>
                <button
                  onClick={() => {
                    onRestoreNote(previewNote.id);
                    setPreviewNote(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Gjenopprett notat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Empty Trash */}
      {confirmEmptyOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmEmptyOpen(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-neutral-100">
                Tømme papirkurven?
              </h3>
              <p className="text-xs text-neutral-400">
                Dette vil slette alle <strong>{trashedNotes.length}</strong> notater i papirkurven permanent. Denne handlingen kan ikke angres.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmEmptyOpen(false)}
                className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  onEmptyTrash();
                  setConfirmEmptyOpen(false);
                }}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors shadow"
              >
                Ja, tøm papirkurven
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Single Permanent Delete */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-neutral-100">
                Slette notatet permanent?
              </h3>
              <p className="text-xs text-neutral-400">
                Notatet vil bli slettet for alltid og kan ikke gjenopprettes.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  onPermanentlyDeleteNote(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors shadow"
              >
                Slett for alltid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
