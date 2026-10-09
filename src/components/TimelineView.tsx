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
  Check,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from 'lucide-react';
import { Note, Folder } from '../types';
import {
  evaluateNoteSearch,
  HighlightMatch,
  getSearchSnippet,
} from '../utils/searchHighlight';

export type TimelineSortField = 'updatedAt' | 'createdAt' | 'title';
export type TimelineSortDirection = 'desc' | 'asc';
export type TimelineDatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'three_months'
  | 'this_year'
  | 'custom';

interface TimelineViewProps {
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onClose?: () => void;
  initialFolderId?: string;
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
  initialFolderId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>(initialFolderId || 'all');
  const [sortBy, setSortBy] = useState<TimelineSortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<TimelineSortDirection>('desc'); // desc = newest / Z-A, asc = oldest / A-Z
  const [datePreset, setDatePreset] = useState<TimelineDatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Folder lookup map
  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  // Current active folder object
  const activeFolder = useMemo(() => {
    if (selectedFolderFilter === 'all') return null;
    return folderMap.get(selectedFolderFilter) || null;
  }, [selectedFolderFilter, folderMap]);

  // Calculate active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedFolderFilter !== 'all') count++;
    if (datePreset !== 'all') count++;
    if (sortBy !== 'updatedAt' || sortDirection !== 'desc') count++;
    return count;
  }, [selectedFolderFilter, datePreset, sortBy, sortDirection]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedFolderFilter('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortBy('updatedAt');
    setSortDirection('desc');
    setSearchQuery('');
  };

  // Filter notes with folder, date, and fulltext search
  const filteredNotes = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const endOfYesterday = startOfToday - 1;
    const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfMonth = startOfToday - 29 * 24 * 60 * 60 * 1000;
    const startOfThreeMonths = startOfToday - 89 * 24 * 60 * 60 * 1000;
    const startOfThisYear = new Date(now.getFullYear(), 0, 1).getTime();

    let customStartMs: number | null = null;
    if (customStartDate) {
      customStartMs = new Date(customStartDate).setHours(0, 0, 0, 0);
    }
    let customEndMs: number | null = null;
    if (customEndDate) {
      customEndMs = new Date(customEndDate).setHours(23, 59, 59, 999);
    }

    return notes.filter((n) => {
      // 1. Folder filter
      if (selectedFolderFilter !== 'all' && n.folderId !== selectedFolderFilter) {
        return false;
      }

      // 2. Date filtering
      const targetTime = sortBy === 'createdAt' ? n.createdAt : n.updatedAt;

      if (datePreset === 'today') {
        if (targetTime < startOfToday || targetTime > endOfToday) return false;
      } else if (datePreset === 'yesterday') {
        if (targetTime < startOfYesterday || targetTime > endOfYesterday) return false;
      } else if (datePreset === 'week') {
        if (targetTime < startOfWeek) return false;
      } else if (datePreset === 'month') {
        if (targetTime < startOfMonth) return false;
      } else if (datePreset === 'three_months') {
        if (targetTime < startOfThreeMonths) return false;
      } else if (datePreset === 'this_year') {
        if (targetTime < startOfThisYear) return false;
      } else if (datePreset === 'custom') {
        if (customStartMs !== null && targetTime < customStartMs) return false;
        if (customEndMs !== null && targetTime > customEndMs) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const folder = folderMap.get(n.folderId);
        const evalResult = evaluateNoteSearch(n, searchQuery, folder?.name || '');
        if (!evalResult) return false;
      }

      return true;
    });
  }, [
    notes,
    selectedFolderFilter,
    datePreset,
    customStartDate,
    customEndDate,
    sortBy,
    searchQuery,
    folderMap,
  ]);

  // Sort notes
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (sortBy === 'title') {
        const titleA = a.title || 'Uten tittel';
        const titleB = b.title || 'Uten tittel';
        return sortDirection === 'desc'
          ? titleB.localeCompare(titleA, 'no')
          : titleA.localeCompare(titleB, 'no');
      }

      const timeA = sortBy === 'createdAt' ? a.createdAt : a.updatedAt;
      const timeB = sortBy === 'createdAt' ? b.createdAt : b.updatedAt;
      return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [filteredNotes, sortBy, sortDirection]);

  // Metrics summary calculated against the relevant note set
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfMonth = startOfToday - 29 * 24 * 60 * 60 * 1000;

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    // We calculate metrics for the current folder filter (or all notes)
    const baseSet = selectedFolderFilter === 'all'
      ? notes
      : notes.filter((n) => n.folderId === selectedFolderFilter);

    baseSet.forEach((n) => {
      const time = sortBy === 'createdAt' ? n.createdAt : n.updatedAt;
      if (time >= startOfToday) todayCount++;
      else if (time >= startOfWeek) weekCount++;
      else if (time >= startOfMonth) monthCount++;
    });

    return {
      today: todayCount,
      week: weekCount,
      month: monthCount,
      total: baseSet.length,
    };
  }, [notes, selectedFolderFilter, sortBy]);

  // Group notes into logical time or alphabetical categories
  const groupedNotes = useMemo(() => {
    if (sortBy === 'title') {
      const groups: { [key: string]: Note[] } = {};
      sortedNotes.forEach((n) => {
        const firstLetter = (n.title || 'Uten tittel')[0].toUpperCase();
        const key = /^[A-ZÆØÅ]$/i.test(firstLetter) ? firstLetter : '#';
        if (!groups[key]) groups[key] = [];
        groups[key].push(n);
      });
      return Object.keys(groups).map((key) => ({
        label: key,
        notes: groups[key],
      }));
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfThisWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfThisMonth = startOfToday - 29 * 24 * 60 * 60 * 1000;
    const startOfThisYear = new Date(now.getFullYear(), 0, 1).getTime();

    const isCreated = sortBy === 'createdAt';
    const prefix = isCreated ? 'Opprettet ' : '';

    const labelToday = isCreated ? 'Opprettet i dag' : 'I dag';
    const labelYesterday = isCreated ? 'Opprettet i går' : 'I går';
    const labelWeek = isCreated ? 'Opprettet denne uken' : 'Denne uken';
    const labelMonth = isCreated ? 'Opprettet denne måneden' : 'Denne måneden';
    const labelYear = isCreated ? 'Opprettet tidligere i år' : 'Tidligere i år';
    const labelOlder = isCreated ? 'Opprettet tidligere' : 'Eldre';

    const groups: { [key: string]: Note[] } = {
      [labelToday]: [],
      [labelYesterday]: [],
      [labelWeek]: [],
      [labelMonth]: [],
      [labelYear]: [],
      [labelOlder]: [],
    };

    sortedNotes.forEach((n) => {
      const time = isCreated ? n.createdAt : n.updatedAt;
      if (time >= startOfToday) {
        groups[labelToday].push(n);
      } else if (time >= startOfYesterday) {
        groups[labelYesterday].push(n);
      } else if (time >= startOfThisWeek) {
        groups[labelWeek].push(n);
      } else if (time >= startOfThisMonth) {
        groups[labelMonth].push(n);
      } else if (time >= startOfThisYear) {
        groups[labelYear].push(n);
      } else {
        groups[labelOlder].push(n);
      }
    });

    const result: TimelineGroup[] = [];
    const orderedLabels = sortDirection === 'asc'
      ? [labelOlder, labelYear, labelMonth, labelWeek, labelYesterday, labelToday]
      : [labelToday, labelYesterday, labelWeek, labelMonth, labelYear, labelOlder];

    orderedLabels.forEach((label) => {
      if (groups[label] && groups[label].length > 0) {
        result.push({ label, notes: groups[label] });
      }
    });

    return result;
  }, [sortedNotes, sortBy, sortDirection]);

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

  const getDatePresetLabel = (preset: TimelineDatePreset) => {
    switch (preset) {
      case 'today':
        return 'I dag';
      case 'yesterday':
        return 'I går';
      case 'week':
        return 'Siste 7 dager';
      case 'month':
        return 'Siste 30 dager';
      case 'three_months':
        return 'Siste 3 måneder';
      case 'this_year':
        return 'I år';
      case 'custom':
        return 'Egendefinert';
      default:
        return 'Alle datoer';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/70 backdrop-blur shrink-0 space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-neutral-100">
                  Tidslinje for notater
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium font-mono">
                  {sortedNotes.length} av {notes.length} notater
                </span>
                {activeFolder && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700/80 text-[11px] text-neutral-300 font-medium">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: activeFolder.color }}
                    />
                    <span>{activeFolder.name}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                Kronologisk historikk med filtrering etter datoer og mapper
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
                isFilterOpen || activeFiltersCount > 0
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-600/30'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
              }`}
              title="Åpne filter og sortering"
            >
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              {isFilterOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
              )}
            </button>

            {/* Sort order quick toggle */}
            <button
              onClick={() =>
                setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 border border-neutral-800 text-xs font-medium transition-colors"
              title={
                sortDirection === 'desc'
                  ? 'Snu rekkefølge (vis eldst først)'
                  : 'Snu rekkefølge (vis nyest først)'
              }
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">
                {sortBy === 'title'
                  ? sortDirection === 'desc'
                    ? 'Å til A'
                    : 'A til Å'
                  : sortDirection === 'desc'
                  ? 'Nyest først'
                  : 'Eldst først'}
              </span>
              <span className="sm:hidden">
                {sortDirection === 'desc' ? 'Nyest' : 'Eldst'}
              </span>
            </button>

            {/* Create note button */}
            <button
              onClick={onCreateNote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nytt notat</span>
            </button>

            {/* Close button if presented with close handler */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                title="Tilbake til notatvisning"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search & Quick Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søk i tidslinjen etter tittel, innhold eller #tag..."
              className="w-full pl-9 pr-8 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
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

          {/* Quick Folder select dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs w-full sm:w-auto">
              <FolderIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
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

            {/* Quick Sort By dropdown */}
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs w-full sm:w-auto">
              <span className="text-neutral-500 text-[11px] shrink-0 font-medium">Sorter:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as TimelineSortField)}
                className="bg-transparent text-neutral-200 font-medium focus:outline-none cursor-pointer text-xs w-full"
              >
                <option value="updatedAt" className="bg-neutral-900 text-neutral-200">
                  Sist endret
                </option>
                <option value="createdAt" className="bg-neutral-900 text-neutral-200">
                  Opprettet dato
                </option>
                <option value="title" className="bg-neutral-900 text-neutral-200">
                  Tittel
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Expandable Advanced Filter Panel */}
        {isFilterOpen && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-950/90 border border-neutral-800/90 space-y-3.5 text-xs animate-in fade-in slide-in-from-top-2 duration-150 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2 font-semibold text-neutral-200">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Filter- og sorteringsinnstillinger</span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Nullstill alle</span>
                </button>
              )}
            </div>

            {/* Row 1: Mappefilter Chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Filtrer etter spesifikk mappe:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedFolderFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                    selectedFolderFilter === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800'
                  }`}
                >
                  <span>Alle mapper</span>
                  <span className="text-[10px] opacity-75 font-mono">({notes.length})</span>
                </button>

                {folders.map((f) => {
                  const count = notes.filter((n) => n.folderId === f.id).length;
                  const isSelected = selectedFolderFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFolderFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-neutral-800 text-white border-indigo-500 ring-1 ring-indigo-500 shadow-sm'
                          : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: f.color }}
                      />
                      <span className="truncate max-w-[120px]">{f.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Datofilter Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Filtrer etter tidsperiode ({sortBy === 'createdAt' ? 'opprettet dato' : 'sist redigert'}):
                </label>
                {datePreset !== 'all' && (
                  <span className="text-[11px] text-indigo-400 font-medium">
                    Aktiv: {getDatePresetLabel(datePreset)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'Alle datoer' },
                  { id: 'today', label: 'I dag' },
                  { id: 'yesterday', label: 'I går' },
                  { id: 'week', label: 'Siste 7 dager' },
                  { id: 'month', label: 'Siste 30 dager' },
                  { id: 'three_months', label: 'Siste 3 mnd' },
                  { id: 'this_year', label: 'I år' },
                  { id: 'custom', label: 'Egendefinert datointervall' },
                ].map((preset) => {
                  const isSelected = datePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDatePreset(preset.id as TimelineDatePreset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Range Picker */}
              {datePreset === 'custom' && (
                <div className="pt-2 flex items-center gap-3 flex-wrap bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-xs">Fra dato:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2.5 py-1 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-xs">Til dato:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2.5 py-1 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="text-[11px] text-neutral-400 hover:text-white underline"
                    >
                      Tøm datoer
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Row 3: Sortering */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Sorter notat-historikken etter:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Sorteringsfelt */}
                <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setSortBy('updatedAt')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all text-center ${
                      sortBy === 'updatedAt'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Sist endret
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('createdAt')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all text-center ${
                      sortBy === 'createdAt'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Opprettet dato
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('title')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all text-center ${
                      sortBy === 'title'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Tittel
                  </button>
                </div>

                {/* Sorteringsretning */}
                <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setSortDirection('desc')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5 ${
                      sortDirection === 'desc'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>{sortBy === 'title' ? 'Å til A' : 'Nyest først (synkende)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortDirection('asc')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5 ${
                      sortDirection === 'asc'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>{sortBy === 'title' ? 'A til Å' : 'Eldst først (stigende)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips bar (when filters are applied) */}
        {(selectedFolderFilter !== 'all' ||
          datePreset !== 'all' ||
          sortBy !== 'updatedAt' ||
          sortDirection !== 'desc' ||
          searchQuery.trim()) && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-0.5">
            <span className="text-neutral-500 font-medium shrink-0">Aktive filtre:</span>

            {/* Folder chip */}
            {selectedFolderFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 shrink-0">
                <FolderIcon className="w-3 h-3" />
                <span>Mappe: {activeFolder?.name || selectedFolderFilter}</span>
                <button
                  type="button"
                  onClick={() => setSelectedFolderFilter('all')}
                  className="hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Date preset chip */}
            {datePreset !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 shrink-0">
                <Calendar className="w-3 h-3" />
                <span>
                  Periode: {getDatePresetLabel(datePreset)}
                  {datePreset === 'custom' && customStartDate && customEndDate
                    ? ` (${customStartDate} til ${customEndDate})`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDatePreset('all');
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                  className="hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Sort chip if custom */}
            {(sortBy !== 'updatedAt' || sortDirection !== 'desc') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-700 shrink-0">
                <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                <span>
                  Sortert:{' '}
                  {sortBy === 'updatedAt'
                    ? 'Sist endret'
                    : sortBy === 'createdAt'
                    ? 'Opprettet'
                    : 'Tittel'}{' '}
                  ({sortDirection === 'desc' ? 'synkende' : 'stigende'})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('updatedAt');
                    setSortDirection('desc');
                  }}
                  className="hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Search chip */}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-700 shrink-0">
                <Search className="w-3 h-3 text-indigo-400" />
                <span>Søk: «{searchQuery}»</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-neutral-400 hover:text-indigo-300 ml-1 underline shrink-0 font-medium"
            >
              Fjern alle
            </button>
          </div>
        )}

        {/* Quick time summary clickable badges */}
        <div className="flex items-center gap-2 overflow-x-auto pt-0.5 text-xs">
          <span className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider shrink-0">
            Hurtigfilter:
          </span>

          <button
            type="button"
            onClick={() => setDatePreset((prev) => (prev === 'today' ? 'all' : 'today'))}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              datePreset === 'today'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-neutral-300'
            }`}
            title="Klikk for å kun vise notater fra i dag"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              I dag: <strong className="text-neutral-100">{metrics.today}</strong>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDatePreset((prev) => (prev === 'week' ? 'all' : 'week'))}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              datePreset === 'week'
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600/60 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-neutral-300'
            }`}
            title="Klikk for å kun vise notater fra de siste 7 dagene"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>
              Siste 7 dager: <strong className="text-neutral-100">{metrics.week}</strong>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDatePreset((prev) => (prev === 'month' ? 'all' : 'month'))}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              datePreset === 'month'
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600/60 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-neutral-300'
            }`}
            title="Klikk for å kun vise notater fra de siste 30 dagene"
          >
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <span>
              Siste 30 dager: <strong className="text-neutral-100">{metrics.month}</strong>
            </span>
          </button>

          {datePreset !== 'all' && (
            <button
              type="button"
              onClick={() => setDatePreset('all')}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium shrink-0"
            >
              Vis alle datoer
            </button>
          )}
        </div>
      </div>

      {/* Main Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto relative">
          {sortedNotes.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3.5 text-neutral-500">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-neutral-300">
                {searchQuery || selectedFolderFilter !== 'all' || datePreset !== 'all'
                  ? 'Ingen notater matchet filtrene dine.'
                  : 'Ingen notater funnet i tidslinjen.'}
              </p>
              <div className="flex items-center gap-2 pt-1">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium border border-neutral-700 transition-colors"
                  >
                    Nullstill filtre
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCreateNote}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                >
                  Opprett nytt notat
                </button>
              </div>
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

                      // Primary date displayed based on active sorting
                      const primaryDateMs = sortBy === 'createdAt' ? note.createdAt : note.updatedAt;
                      const exactDate = new Date(primaryDateMs);
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
                              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 shrink-0">
                                <Clock className="w-3 h-3 text-neutral-500" />
                                <span className="text-neutral-300 font-medium">
                                  {sortBy === 'createdAt' ? 'Opprettet' : 'Endret'}: {fullDateString}, {timeString}
                                </span>
                                <span className="text-neutral-600 hidden sm:inline">•</span>
                                <span className="text-neutral-500 hidden sm:inline">
                                  {formatTimeAgo(primaryDateMs)}
                                </span>
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

                                {/* Secondary timestamp if sortBy is createdAt */}
                                {sortBy === 'createdAt' && (
                                  <span className="text-neutral-500 text-[10px]">
                                    Sist endret: {formatTimeAgo(note.updatedAt)}
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
