import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Calendar,
  Tag,
  ArrowRight,
  FileText,
  Pin,
  Sparkles,
  AlignLeft,
  Filter,
} from 'lucide-react';
import { Note, Folder as FolderType } from '../types';
import {
  evaluateNoteSearch,
  HighlightMatch,
  NoteSearchResult,
} from '../utils/searchHighlight';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: FolderType[];
  onSelectNote: (noteId: string) => void;
}

type SearchFilterScope = 'all' | 'content' | 'title' | 'tags';

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  onSelectNote,
}) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchFilterScope>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Folder map for quick lookup
  const folderMap = useMemo(() => {
    const map = new Map<string, FolderType>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setScope('all');
    }
  }, [isOpen]);

  // Perform full-text search and relevance evaluation on all notes
  const evaluatedResults = useMemo(() => {
    const results: NoteSearchResult[] = [];

    notes.forEach((note) => {
      const folder = folderMap.get(note.folderId);
      const evalResult = evaluateNoteSearch(note, query, folder?.name || '');
      if (evalResult) {
        results.push(evalResult);
      }
    });

    // Sort by relevance score descending
    return results.sort((a, b) => b.totalScore - a.totalScore);
  }, [notes, query, folderMap]);

  // Apply scope filtering (all, content only, title only, tags only)
  const filteredResults = useMemo(() => {
    if (scope === 'all') return evaluatedResults;
    if (scope === 'content') return evaluatedResults.filter((r) => r.matchesContent);
    if (scope === 'title') return evaluatedResults.filter((r) => r.matchesTitle);
    if (scope === 'tags') return evaluatedResults.filter((r) => r.matchesTags);
    return evaluatedResults;
  }, [evaluatedResults, scope]);

  // Count breakdowns for scope buttons
  const counts = useMemo(() => {
    let contentCount = 0;
    let titleCount = 0;
    let tagsCount = 0;

    evaluatedResults.forEach((r) => {
      if (r.matchesContent) contentCount++;
      if (r.matchesTitle) titleCount++;
      if (r.matchesTags) tagsCount++;
    });

    return {
      all: evaluatedResults.length,
      content: contentCount,
      title: titleCount,
      tags: tagsCount,
    };
  }, [evaluatedResults]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length, scope]);

  // Keyboard navigation (Arrow up/down, Enter to select, Escape to close)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        onSelectNote(filteredResults[selectedIndex].note.id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input header */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/90 space-y-3">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-indigo-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Fulltekstsøk i innhold, tittel, tagger eller mapper..."
              className="flex-1 bg-transparent text-sm sm:text-base text-neutral-100 placeholder-neutral-500 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                title="Tøm søk"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
              ESC
            </span>
          </div>

          {/* Filter Scope Pills (Visible when there is a search query) */}
          {query.trim() && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
              <button
                onClick={() => setScope('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  scope === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>Alle treff</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                  {counts.all}
                </span>
              </button>

              <button
                onClick={() => setScope('content')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  scope === 'content'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <AlignLeft className="w-3 h-3" />
                <span>I innholdet</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                  {counts.content}
                </span>
              </button>

              <button
                onClick={() => setScope('title')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  scope === 'title'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>I tittel</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                  {counts.title}
                </span>
              </button>

              <button
                onClick={() => setScope('tags')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  scope === 'tags'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Tag className="w-3 h-3" />
                <span>I tagger</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                  {counts.tags}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="overflow-y-auto divide-y divide-neutral-800/60 flex-1 p-2 space-y-1"
        >
          {filteredResults.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-neutral-800/80 border border-neutral-700/60 mx-auto flex items-center justify-center text-neutral-400">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-neutral-300">
                {query.trim()
                  ? `Ingen treff funnet for «${query}»`
                  : 'Skriv et søkeord for å søke gjennom alle notater'}
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Søket skanner hele innholdet i alle notater, titler, mapper og emneknagger.
              </p>
            </div>
          ) : (
            filteredResults.map((result, idx) => {
              const { note, snippet, matchesTitle, matchesContent, matchesTags, contentMatchesCount } =
                result;
              const folder = folderMap.get(note.folderId);
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 border ${
                    isSelected
                      ? 'bg-neutral-800/90 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-neutral-900/40 hover:bg-neutral-800/50 border-transparent text-neutral-300'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Header line: Title, Highlighted match, and badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-indigo-300 transition-colors truncate">
                        <HighlightMatch
                          text={note.title || 'Uten tittel'}
                          query={query}
                        />
                      </h3>

                      {note.pinned && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                          <Pin className="w-2.5 h-2.5 fill-amber-300/40" />
                          Festet
                        </span>
                      )}

                      {/* Match type indicators */}
                      {query.trim() && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {matchesContent && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
                              {contentMatchesCount > 1
                                ? `${contentMatchesCount} treff i innhold`
                                : 'Treff i innhold'}
                            </span>
                          )}
                          {matchesTitle && !matchesContent && (
                            <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                              Treff i tittel
                            </span>
                          )}
                          {matchesTags && (
                            <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                              Treff i tag
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Context Snippet with Highlighting */}
                    <div className="text-xs text-neutral-400/90 leading-relaxed font-sans line-clamp-2">
                      <HighlightMatch text={snippet} query={query} />
                    </div>

                    {/* Footer metadata: Folder, Date, Tags */}
                    <div className="flex items-center gap-3 text-[11px] text-neutral-500 pt-1 flex-wrap">
                      {folder && (
                        <span className="flex items-center gap-1.5 text-neutral-400">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: folder.color }}
                          />
                          <span>{folder.name}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-600" />
                        <span>{new Date(note.updatedAt).toLocaleDateString('no-NO')}</span>
                      </span>

                      {note.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Tag className="w-3 h-3 text-neutral-600" />
                          {note.tags.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.2 rounded bg-neutral-950 text-neutral-400 text-[10px] border border-neutral-800"
                            >
                              #<HighlightMatch text={t} query={query} />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pt-1 text-neutral-500">
                    <span className="text-[11px] font-medium hidden sm:inline text-neutral-400">
                      Åpne
                    </span>
                    <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-400">
              {filteredResults.length}{' '}
              {filteredResults.length === 1 ? 'notat funnet' : 'notater funnet'}
            </span>
            {query.trim() && (
              <span>
                • Fulltekstsøk aktivt
              </span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-neutral-500">
            <span>Bruk <kbd className="font-mono px-1 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">↑</kbd> <kbd className="font-mono px-1 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">↓</kbd> for å navigere</span>
            <span><kbd className="font-mono px-1 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">Enter</kbd> for å åpne</span>
          </div>
        </div>
      </div>
    </div>
  );
};
