import React, { useState, useMemo } from 'react';
import {
  Plus,
  Pin,
  Calendar,
  Tag,
  Image as ImageIcon,
  Search,
  FileDown,
  Clock,
  List,
  Maximize2,
  X,
  AlignLeft,
  CheckSquare,
  Square,
  Check,
  Loader2,
  PanelLeftClose,
} from 'lucide-react';
import { Note, Folder } from '../types';
import {
  evaluateNoteSearch,
  HighlightMatch,
  getSearchSnippet,
} from '../utils/searchHighlight';
import { exportSelectedNotesToPDF } from '../utils/pdfExport';

interface NoteListProps {
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  selectedTag: string | null;
  searchQuery: string;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onSearchChange: (query: string) => void;
  onExportFolderPDF?: (folder: Folder) => Promise<void>;
  onOpenFullTimeline?: () => void;
  onToggleCollapse?: () => void;
}

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  folders,
  selectedNoteId,
  selectedFolderId,
  selectedTag,
  searchQuery,
  onSelectNote,
  onCreateNote,
  onSearchChange,
  onExportFolderPDF,
  onOpenFullTimeline,
  onToggleCollapse,
}) => {
  const currentFolder = folders.find((f) => f.id === selectedFolderId);
  const [isExportingFolder, setIsExportingFolder] = useState(false);
  const [listMode, setListMode] = useState<'cards' | 'timeline'>('cards');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isExportingSelected, setIsExportingSelected] = useState(false);

  // Folder lookup map
  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  const toggleSelectNote = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedNoteIds.size === evaluatedNotes.length && evaluatedNotes.length > 0) {
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set(evaluatedNotes.map((item) => item.note.id)));
    }
  };

  const handleExportSelected = async () => {
    if (selectedNoteIds.size === 0) return;
    const selectedList = evaluatedNotes
      .map((item) => item.note)
      .filter((note) => selectedNoteIds.has(note.id));

    setIsExportingSelected(true);
    await exportSelectedNotesToPDF(
      selectedList,
      folderMap,
      currentFolder ? `Valgte notater (${currentFolder.name})` : 'Valgte notater'
    );
    setIsExportingSelected(false);
  };

  // Filter and evaluate notes with full-text search
  const evaluatedNotes = useMemo(() => {
    const hasSearch = searchQuery.trim().length > 0;

    const filtered = notes.filter((n) => {
      // Folder filter
      if (selectedFolderId && n.folderId !== selectedFolderId) return false;
      // Tag filter
      if (selectedTag && !n.tags.includes(selectedTag)) return false;
      return true;
    });

    if (!hasSearch) {
      // Regular view: sort by pinned, then newest updatedAt
      const sorted = [...filtered].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.updatedAt - a.updatedAt;
      });

      return sorted.map((note) => ({
        note,
        snippet: getSearchSnippet(note.content, '', 110).snippet,
        matchesContent: false,
        contentMatchesCount: 0,
        score: 0,
      }));
    }

    // Fulltext search mode: evaluate relevance, extract snippets & count hits
    const matched: Array<{
      note: Note;
      snippet: string;
      matchesContent: boolean;
      contentMatchesCount: number;
      score: number;
    }> = [];

    filtered.forEach((note) => {
      const folder = folderMap.get(note.folderId);
      const evalResult = evaluateNoteSearch(note, searchQuery, folder?.name || '');
      if (evalResult) {
        matched.push({
          note,
          snippet: evalResult.snippet,
          matchesContent: evalResult.matchesContent,
          contentMatchesCount: evalResult.contentMatchesCount,
          score: evalResult.totalScore,
        });
      }
    });

    // In search mode, sort primarily by search relevance score, then recency
    return matched.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.note.updatedAt - a.note.updatedAt;
    });
  }, [notes, selectedFolderId, selectedTag, searchQuery, folderMap]);

  // Group notes for timeline mode
  const timelineGroups = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

    const groups: {
      [label: string]: Array<{
        note: Note;
        snippet: string;
        matchesContent: boolean;
        contentMatchesCount: number;
      }>;
    } = {
      'I dag': [],
      'I går': [],
      'Siste 7 dager': [],
      'Tidligere': [],
    };

    evaluatedNotes.forEach((item) => {
      if (item.note.updatedAt >= startOfToday) {
        groups['I dag'].push(item);
      } else if (item.note.updatedAt >= startOfYesterday) {
        groups['I går'].push(item);
      } else if (item.note.updatedAt >= startOfWeek) {
        groups['Siste 7 dager'].push(item);
      } else {
        groups['Tidligere'].push(item);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [evaluatedNotes]);

  return (
    <div className="w-full sm:w-72 md:w-80 h-full border-r border-neutral-800 bg-neutral-900/60 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3.5 border-b border-neutral-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {currentFolder && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: currentFolder.color }}
              />
            )}
            <h2 className="text-sm font-semibold text-neutral-100 truncate">
              {currentFolder ? currentFolder.name : selectedTag ? `#${selectedTag}` : 'Alle notater'}
            </h2>
            <span className="text-xs text-neutral-500 font-mono">
              ({evaluatedNotes.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Multi-select toggle */}
            <button
              type="button"
              onClick={() => {
                setIsSelectMode((prev) => !prev);
                setSelectedNoteIds(new Set());
              }}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors border ${
                isSelectMode
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                  : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border-neutral-700/60'
              }`}
              title={isSelectMode ? 'Avslutt valgmodus' : 'Velg notater for PDF-eksport'}
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>

            {currentFolder && onExportFolderPDF && (
              <button
                type="button"
                disabled={isExportingFolder || evaluatedNotes.length === 0}
                onClick={async () => {
                  setIsExportingFolder(true);
                  await onExportFolderPDF(currentFolder);
                  setIsExportingFolder(false);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs transition-colors border border-neutral-700/60"
                title="Eksporter hele mappen som PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={onCreateNote}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
              title="Opprett nytt notat"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nytt</span>
            </button>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors border border-neutral-700/60"
                title="Lukk notatfane (Ctrl+\)"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search input and View Mode Switcher */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Fulltekstsøk i innhold & tittel..."
              className="w-full pl-8 pr-7 py-1.5 bg-neutral-950/80 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-2 p-0.5 text-neutral-500 hover:text-neutral-300 rounded"
                title="Tøm søk"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setListMode('cards')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  listMode === 'cards'
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Kortvisning"
              >
                <List className="w-3 h-3" />
                <span>Kort</span>
              </button>
              <button
                type="button"
                onClick={() => setListMode('timeline')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  listMode === 'timeline'
                    ? 'bg-neutral-800 text-indigo-300 font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Kompakt tidslinje sortert etter sist redigert"
              >
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>Tidslinje</span>
              </button>
            </div>

            {onOpenFullTimeline && (
              <button
                type="button"
                onClick={onOpenFullTimeline}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-neutral-400 hover:text-indigo-300 hover:bg-neutral-800/80 rounded transition-colors"
                title="Åpne stor tidslinje med full historikk"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Stor oversikt</span>
              </button>
            )}
          </div>

          {/* Selection Mode Action Banner */}
          {isSelectMode && (
            <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-1.5 text-neutral-200 hover:text-white font-medium text-[11px]"
                >
                  {selectedNoteIds.size === evaluatedNotes.length && evaluatedNotes.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4 text-neutral-500" />
                  )}
                  <span>
                    {selectedNoteIds.size === evaluatedNotes.length && evaluatedNotes.length > 0
                      ? 'Fjern alle'
                      : 'Velg alle'}
                  </span>
                </button>
                <span className="text-neutral-400 text-[11px] font-mono">
                  {selectedNoteIds.size}/{evaluatedNotes.length} valgt
                </span>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedNoteIds(new Set());
                  }}
                  className="px-2 py-1 rounded text-[11px] text-neutral-400 hover:text-white transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  disabled={selectedNoteIds.size === 0 || isExportingSelected}
                  onClick={handleExportSelected}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-medium text-[11px] shadow-sm transition-colors"
                  title="Eksporter valgte notater som et samlet PDF-dokument"
                >
                  {isExportingSelected ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isExportingSelected
                      ? 'Genererer...'
                      : `Eksporter (${selectedNoteIds.size}) PDF`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {searchQuery.trim() && (
            <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1 pt-0.5">
              <span>{evaluatedNotes.length} treff i innhold & tittel</span>
              <span className="text-neutral-500">Sortert etter relevans</span>
            </div>
          )}
        </div>
      </div>

      {/* Note cards or Timeline stream */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {evaluatedNotes.length === 0 ? (
          <div className="py-12 px-4 text-center text-neutral-500 text-xs space-y-2">
            <p>
              {searchQuery.trim()
                ? `Ingen treff for «${searchQuery}»`
                : 'Ingen notater funnet.'}
            </p>
            {searchQuery.trim() ? (
              <button
                onClick={() => onSearchChange('')}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Nullstill søket
              </button>
            ) : (
              <button
                onClick={onCreateNote}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                + Opprett det første notatet
              </button>
            )}
          </div>
        ) : listMode === 'timeline' ? (
          /* Compact Timeline View in Sidebar List */
          <div className="relative pl-5 py-2 space-y-5">
            {/* Timeline vertical rail */}
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-neutral-800" />

            {timelineGroups.map(([groupLabel, groupItems]) => (
              <div key={groupLabel} className="space-y-2 relative">
                {/* Group date badge */}
                <div className="flex items-center gap-1.5 -ml-5">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-semibold text-neutral-300 shadow-sm">
                    <Calendar className="w-2.5 h-2.5 text-indigo-400" />
                    <span>{groupLabel}</span>
                    <span className="text-[9px] text-neutral-500">({groupItems.length})</span>
                  </div>
                </div>

                {/* Notes along timeline */}
                <div className="space-y-1.5">
                  {groupItems.map(({ note, snippet, matchesContent, contentMatchesCount }) => {
                    const isSelected = note.id === selectedNoteId;
                    const isCheckedInSelect = selectedNoteIds.has(note.id);
                    const folder = folderMap.get(note.folderId);
                    const exactDate = new Date(note.updatedAt);
                    const timeStr = exactDate.toLocaleTimeString('no-NO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const handleCardClick = () => {
                      if (isSelectMode) {
                        toggleSelectNote(note.id);
                      } else {
                        onSelectNote(note.id);
                      }
                    };

                    return (
                      <div key={note.id} className="relative group">
                        {/* Dot node */}
                        <div
                          className={`absolute -left-5 top-3 w-2.5 h-2.5 rounded-full border border-neutral-900 transition-all ${
                            isSelected
                              ? 'bg-indigo-500 ring-2 ring-indigo-500/40 scale-110'
                              : 'bg-neutral-700 group-hover:bg-indigo-400'
                          }`}
                          style={{
                            backgroundColor: folder?.color,
                          }}
                        />

                        {/* Card */}
                        <div
                          onClick={handleCardClick}
                          className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                            isSelectMode && isCheckedInSelect
                              ? 'bg-indigo-950/35 border-indigo-500/60 ring-1 ring-indigo-500/30'
                              : isSelected
                              ? 'bg-neutral-800 border-neutral-700 shadow-sm'
                              : 'hover:bg-neutral-850 border-transparent bg-neutral-900/40 text-neutral-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5 mb-1">
                            {isSelectMode && (
                              <div className="shrink-0 mt-0.5">
                                {isCheckedInSelect ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-neutral-600" />
                                )}
                              </div>
                            )}
                            <h3 className="text-xs font-semibold text-neutral-100 truncate flex-1">
                              <HighlightMatch
                                text={note.title || 'Uten tittel'}
                                query={searchQuery}
                              />
                            </h3>
                            <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                              {timeStr}
                            </span>
                          </div>

                          {/* Highlighted context snippet */}
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mb-1.5 leading-relaxed">
                            <HighlightMatch
                              text={snippet || 'Ingen ekstra tekst...'}
                              query={searchQuery}
                            />
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-neutral-500">
                            <div className="flex items-center gap-1.5 truncate">
                              {folder && (
                                <span className="flex items-center gap-1 text-neutral-400">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: folder.color }}
                                  />
                                  <span className="truncate max-w-[70px]">{folder.name}</span>
                                </span>
                              )}

                              {searchQuery.trim() && matchesContent && (
                                <span className="px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-[9px] font-medium">
                                  {contentMatchesCount > 1
                                    ? `${contentMatchesCount} treff`
                                    : 'Treff i innhold'}
                                </span>
                              )}
                            </div>

                            {note.pinned && (
                              <Pin className="w-3 h-3 text-amber-400 fill-amber-400/20 shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Cards List */
          evaluatedNotes.map(({ note, snippet, matchesContent, contentMatchesCount }) => {
            const isSelected = note.id === selectedNoteId;
            const isCheckedInSelect = selectedNoteIds.has(note.id);
            const folder = folderMap.get(note.folderId);

            const handleCardClick = () => {
              if (isSelectMode) {
                toggleSelectNote(note.id);
              } else {
                onSelectNote(note.id);
              }
            };

            return (
              <div
                key={note.id}
                onClick={handleCardClick}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  isSelectMode && isCheckedInSelect
                    ? 'bg-indigo-950/35 border-indigo-500/60 ring-1 ring-indigo-500/30'
                    : isSelected
                    ? 'bg-neutral-800 border-neutral-700/80 shadow-sm'
                    : 'hover:bg-neutral-850 border-transparent text-neutral-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  {isSelectMode && (
                    <div className="shrink-0 mt-0.5">
                      {isCheckedInSelect ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-600" />
                      )}
                    </div>
                  )}
                  <h3 className="text-xs sm:text-sm font-semibold text-neutral-100 truncate flex-1">
                    <HighlightMatch
                      text={note.title || 'Uten tittel'}
                      query={searchQuery}
                    />
                  </h3>
                  {note.pinned && (
                    <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
                  )}
                </div>

                {/* Highlighted contextual snippet of fulltext content */}
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-2">
                  <HighlightMatch
                    text={snippet || 'Ingen ekstra tekst...'}
                    query={searchQuery}
                  />
                </p>

                {/* Metadata tags, folder and indicators */}
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <div className="flex items-center gap-1.5 truncate">
                    {folder && !selectedFolderId && (
                      <span className="flex items-center gap-1 text-neutral-400">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        />
                        <span className="truncate max-w-[80px]">{folder.name}</span>
                      </span>
                    )}

                    {searchQuery.trim() && matchesContent && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-[10px] font-medium shrink-0 flex items-center gap-1">
                        <AlignLeft className="w-2.5 h-2.5" />
                        <span>
                          {contentMatchesCount > 1
                            ? `${contentMatchesCount} treff`
                            : 'Treff i innhold'}
                        </span>
                      </span>
                    )}

                    {note.images && note.images.length > 0 && (
                      <span className="flex items-center gap-0.5 text-indigo-400" title={`${note.images.length} bilder`}>
                        <ImageIcon className="w-3 h-3" />
                        <span>{note.images.length}</span>
                      </span>
                    )}
                  </div>

                  <span className="shrink-0 text-[10px]">
                    {new Date(note.updatedAt).toLocaleDateString('no-NO', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
