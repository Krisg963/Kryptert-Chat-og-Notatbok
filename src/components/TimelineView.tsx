import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  Pin,
  Tag,
  Image as ImageIcon,
  Folder as FolderIcon,
  User,
  Plus,
  ArrowUpDown,
  FileText,
  X,
  Sparkles,
  AlignLeft,
} from 'lucide-react';
import { Note, Folder } from '../types';
import {
  evaluateNoteSearch,
  HighlightMatch,
  getSearchSnippet,
} from '../utils/searchHighlight';

interface TimelineViewProps {
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onClose?: () => void;
}

interface TimelineGroup {
  label: string;
  notes: Note[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  notes,
  folders,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [sortAscending, setSortAscending] = useState(false); // Default: newest first

  // Folder lookup map
  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  // Filter notes with fulltext search
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Folder filter
      if (selectedFolderFilter !== 'all' && n.folderId !== selectedFolderFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const folder = folderMap.get(n.folderId);
        const evalResult = evaluateNoteSearch(n, searchQuery, folder?.name || '');
        if (!evalResult) return false;
      }
      return true;
    });
  }, [notes, selectedFolderFilter, searchQuery, folderMap]);

  // Sort notes by updatedAt
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      return sortAscending ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
    });
  }, [filteredNotes, sortAscending]);

  // Metrics summary
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfMonth = startOfToday - 29 * 24 * 60 * 60 * 1000;

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    notes.forEach((n) => {
      if (n.updatedAt >= startOfToday) todayCount++;
      else if (n.updatedAt >= startOfWeek) weekCount++;
      else if (n.updatedAt >= startOfMonth) monthCount++;
    });

    return {
      today: todayCount,
      week: weekCount,
      month: monthCount,
      total: notes.length,
    };
  }, [notes]);

  // Group notes into time categories
  const groupedNotes = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfThisWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfThisMonth = startOfToday - 29 * 24 * 60 * 60 * 1000;
    const startOfThisYear = new Date(now.getFullYear(), 0, 1).getTime();

    const groups: { [key: string]: Note[] } = {
      'I dag': [],
      'I går': [],
      'Denne uken': [],
      'Denne måneden': [],
      'Tidligere i år': [],
      'Eldre': [],
    };

    sortedNotes.forEach((n) => {
      const time = n.updatedAt;
      if (time >= startOfToday) {
        groups['I dag'].push(n);
      } else if (time >= startOfYesterday) {
        groups['I går'].push(n);
      } else if (time >= startOfThisWeek) {
        groups['Denne uken'].push(n);
      } else if (time >= startOfThisMonth) {
        groups['Denne måneden'].push(n);
      } else if (time >= startOfThisYear) {
        groups['Tidligere i år'].push(n);
      } else {
        groups['Eldre'].push(n);
      }
    });

    const result: TimelineGroup[] = [];
    const orderedLabels = sortAscending
      ? ['Eldre', 'Tidligere i år', 'Denne måneden', 'Denne uken', 'I går', 'I dag']
      : ['I dag', 'I går', 'Denne uken', 'Denne måneden', 'Tidligere i år', 'Eldre'];

    orderedLabels.forEach((label) => {
      if (groups[label] && groups[label].length > 0) {
        result.push({ label, notes: groups[label] });
      }
    });

    return result;
  }, [sortedNotes, sortAscending]);

  // Format relative time helper
  const formatTimeAgo = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Akkurat nå';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `for ${diffMin} min siden`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `for ${diffHours} ${diffHours === 1 ? 'time' : 'timer'} siden`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `for ${diffDays} ${diffDays === 1 ? 'dag' : 'dager'} siden`;
    return new Date(timestamp).toLocaleDateString('no-NO', {
      day: 'numeric',
      month: 'short',
      year: new Date(timestamp).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur shrink-0 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-neutral-100">
                  Tidslinje for notater
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium font-mono">
                  {sortedNotes.length} notater
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Kronologisk oversikt over endringer og redigeringer sortert etter dato
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort order toggle */}
            <button
              onClick={() => setSortAscending((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 border border-neutral-800 text-xs font-medium transition-colors"
              title="Endre kronologisk rekkefølge"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>{sortAscending ? 'Eldst først' : 'Nyest først'}</span>
            </button>

            {/* Create note button */}
            <button
              onClick={onCreateNote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nytt notat</span>
            </button>

            {/* Close button if presented with close handler */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                title="Tilbake til redigering"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer tidslinjen på tittel, innhold eller #tag..."
              className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Folder filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs w-full sm:w-auto">
              <FolderIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select
                value={selectedFolderFilter}
                onChange={(e) => setSelectedFolderFilter(e.target.value)}
                className="bg-transparent text-neutral-200 font-medium focus:outline-none cursor-pointer text-xs w-full"
              >
                <option value="all" className="bg-neutral-900 text-neutral-200">
                  Alle mapper ({notes.length})
                </option>
                {folders.map((f) => {
                  const count = notes.filter((n) => n.folderId === f.id).length;
                  return (
                    <option key={f.id} value={f.id} className="bg-neutral-900 text-neutral-200">
                      {f.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Quick time summary badges */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 text-xs">
          <span className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider shrink-0">
            Aktivitet:
          </span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>I dag: <strong className="text-neutral-100">{metrics.today}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Siste 7 dager: <strong className="text-neutral-100">{metrics.week}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-neutral-500" />
            <span>Siste 30 dager: <strong className="text-neutral-100">{metrics.month}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto relative">
          {sortedNotes.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 text-neutral-500">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-neutral-300">
                {searchQuery || selectedFolderFilter !== 'all'
                  ? 'Ingen notater matchet filtrene dine.'
                  : 'Ingen notater funnet i tidslinjen.'}
              </p>
              <button
                onClick={onCreateNote}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              >
                Opprett nytt notat
              </button>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-10 space-y-8">
              {/* The continuous vertical timeline line */}
              <div className="absolute left-2.5 sm:left-4 top-3 bottom-3 w-0.5 bg-gradient-to-b from-indigo-500/50 via-neutral-800 to-neutral-900" />

              {groupedNotes.map((group) => (
                <div key={group.label} className="space-y-4 relative">
                  {/* Group Label / Sticky Header */}
                  <div className="flex items-center gap-2 -ml-6 sm:-ml-10">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700/80 text-xs font-semibold text-neutral-200 shadow-md backdrop-blur">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{group.label}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                        {group.notes.length}
                      </span>
                    </div>
                  </div>

                  {/* Notes in this group */}
                  <div className="space-y-3">
                    {group.notes.map((note) => {
                      const folder = folderMap.get(note.folderId);
                      const isSelected = note.id === selectedNoteId;
                      const { snippet: cleanExcerpt, hasMatch: contentHasMatch } = getSearchSnippet(
                        note.content,
                        searchQuery,
                        150
                      );
                      const wordCount = note.content.trim().split(/\s+/).filter(Boolean).length;
                      const exactDate = new Date(note.updatedAt);
                      const timeString = exactDate.toLocaleTimeString('no-NO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const fullDateString = exactDate.toLocaleDateString('no-NO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });

                      return (
                        <div key={note.id} className="relative group">
                          {/* Timeline node point */}
                          <div
                            className={`absolute -left-6 sm:-left-10 top-4 w-3.5 h-3.5 rounded-full border-2 transition-transform group-hover:scale-125 z-10 ${
                              isSelected
                                ? 'bg-indigo-500 border-white ring-4 ring-indigo-500/20'
                                : 'bg-neutral-900 border-neutral-700 group-hover:border-indigo-400'
                            }`}
                            style={{
                              backgroundColor: folder ? folder.color : undefined,
                            }}
                          />

                          {/* Note Card */}
                          <div
                            onClick={() => onSelectNote(note.id)}
                            className={`p-4 rounded-xl cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-neutral-900/90 border-indigo-500/60 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                                : 'bg-neutral-900/40 hover:bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className="text-sm sm:text-base font-semibold text-neutral-100 group-hover:text-indigo-300 transition-colors truncate">
                                  <HighlightMatch
                                    text={note.title || 'Uten tittel'}
                                    query={searchQuery}
                                  />
                                </h3>
                                {note.pinned && (
                                  <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
                                )}
                                {searchQuery.trim() && contentHasMatch && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-[10px] font-medium shrink-0">
                                    <AlignLeft className="w-2.5 h-2.5" />
                                    <span>Treff i innhold</span>
                                  </span>
                                )}
                              </div>

                              {/* Timestamp badge */}
                              <div className="flex items-center gap-1 text-[11px] text-neutral-400 shrink-0">
                                <Clock className="w-3 h-3 text-neutral-500" />
                                <span>{timeString}</span>
                                <span className="text-neutral-600">•</span>
                                <span className="text-neutral-500">{formatTimeAgo(note.updatedAt)}</span>
                              </div>
                            </div>

                            {/* Content preview snippet with search highlights */}
                            <p className="text-xs text-neutral-300/80 line-clamp-2 leading-relaxed mb-3">
                              <HighlightMatch
                                text={cleanExcerpt || 'Ingen ekstra tekst i notatet...'}
                                query={searchQuery}
                              />
                            </p>

                            {/* Card Footer Metadata */}
                            <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-neutral-400 pt-2 border-t border-neutral-800/60">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Folder pill */}
                                {folder && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-300 text-[11px]">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: folder.color }}
                                    />
                                    <span className="truncate max-w-[120px]">{folder.name}</span>
                                  </span>
                                )}

                                {/* Last edited by */}
                                {note.lastEditedBy && (
                                  <span className="inline-flex items-center gap-1 text-neutral-400">
                                    <User className="w-3 h-3 text-neutral-500" />
                                    <span>{note.lastEditedBy}</span>
                                  </span>
                                )}

                                {/* Tags */}
                                {note.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-400 text-[10px] border border-neutral-800/80"
                                  >
                                    #<HighlightMatch text={t} query={searchQuery} />
                                  </span>
                                ))}

                                {/* Image count */}
                                {note.images && note.images.length > 0 && (
                                  <span className="flex items-center gap-1 text-indigo-400">
                                    <ImageIcon className="w-3 h-3" />
                                    <span>{note.images.length}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-neutral-500 text-[10px]">
                                  {wordCount} ord ({note.content.length} tegn)
                                </span>
                                <span className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-0.5 transition-transform font-medium">
                                  <span>Åpne</span>
                                  <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
