import React from 'react';
import { Note } from '../types';

/**
 * Escapes special regex characters in search strings
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits search query into unique normalized terms (minimum 1 character)
 */
export function tokenizeQuery(query: string): string[] {
  if (!query) return [];
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Strips markdown markup to provide clean human-readable plaintext
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  return markdown
    // Remove images: ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '$1')
    // Remove links: [text](url)
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove headers: # Header
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquotes: > quote
    .replace(/^>\s+/gm, '')
    // Remove bold and italics: **bold**, *italic*, __bold__, _italic_
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove strikethrough: ~~del~~
    .replace(/~~(.*?)~~/g, '$1')
    // Remove table borders & lines
    .replace(/\|/g, ' ')
    .replace(/-{3,}/g, ' ')
    // Collapse extra whitespace & newlines
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts a context snippet of text centered around where search query tokens appear
 */
export function getSearchSnippet(
  content: string,
  query: string,
  maxLength: number = 130
): { snippet: string; hasMatch: boolean } {
  const clean = stripMarkdown(content);
  if (!clean) return { snippet: '', hasMatch: false };

  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    if (clean.length <= maxLength) return { snippet: clean, hasMatch: false };
    const truncated = clean.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return {
      snippet: (lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated) + '...',
      hasMatch: false,
    };
  }

  // Find the earliest match of any query token in the clean text
  const cleanLower = clean.toLowerCase();
  let earliestIdx = -1;
  let matchedToken = '';

  for (const token of tokens) {
    const idx = cleanLower.indexOf(token);
    if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
      earliestIdx = idx;
      matchedToken = token;
    }
  }

  // If no match was found in the text, return start of text
  if (earliestIdx === -1) {
    if (clean.length <= maxLength) return { snippet: clean, hasMatch: false };
    const truncated = clean.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return {
      snippet: (lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) : truncated) + '...',
      hasMatch: false,
    };
  }

  // Calculate centered window around earliestIdx
  const halfWindow = Math.floor((maxLength - matchedToken.length) / 2);
  let start = Math.max(0, earliestIdx - halfWindow);
  let end = Math.min(clean.length, start + maxLength);

  // Adjust start to avoid cutting words in half
  if (start > 0) {
    const spaceBefore = clean.indexOf(' ', start);
    if (spaceBefore !== -1 && spaceBefore < earliestIdx) {
      start = spaceBefore + 1;
    }
  }

  // Adjust end to avoid cutting words in half
  if (end < clean.length) {
    const spaceAfter = clean.lastIndexOf(' ', end);
    if (spaceAfter > earliestIdx + matchedToken.length) {
      end = spaceAfter;
    }
  }

  let result = clean.substring(start, end);
  if (start > 0) result = '...' + result;
  if (end < clean.length) result = result + '...';

  return { snippet: result, hasMatch: true };
}

/**
 * Counts total occurrences of search query tokens in text
 */
export function countMatches(text: string, query: string): number {
  if (!text || !query) return 0;
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return 0;

  const lower = text.toLowerCase();
  let count = 0;
  for (const token of tokens) {
    let pos = 0;
    while ((pos = lower.indexOf(token, pos)) !== -1) {
      count++;
      pos += token.length;
    }
  }
  return count;
}

/**
 * Evaluates a note against a search query, providing detailed match metrics and relevance scoring
 */
export interface NoteSearchResult {
  note: Note;
  matchesTitle: boolean;
  matchesContent: boolean;
  matchesTags: boolean;
  matchesFolder: boolean;
  contentMatchesCount: number;
  totalScore: number;
  snippet: string;
}

export function evaluateNoteSearch(
  note: Note,
  query: string,
  folderName: string = ''
): NoteSearchResult | null {
  if (!query.trim()) {
    const { snippet } = getSearchSnippet(note.content, '', 110);
    return {
      note,
      matchesTitle: false,
      matchesContent: false,
      matchesTags: false,
      matchesFolder: false,
      contentMatchesCount: 0,
      totalScore: 0,
      snippet,
    };
  }

  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return null;

  const titleLower = note.title.toLowerCase();
  const cleanContent = stripMarkdown(note.content);
  const contentLower = cleanContent.toLowerCase();
  const tagsLower = note.tags.map((t) => t.toLowerCase());
  const folderLower = folderName.toLowerCase();
  const queryLower = query.trim().toLowerCase();

  // Check matching status for each token
  let titleMatchCount = 0;
  let contentMatchCount = 0;
  let tagMatchCount = 0;
  let folderMatchCount = 0;

  tokens.forEach((token) => {
    if (titleLower.includes(token)) titleMatchCount++;
    if (contentLower.includes(token)) contentMatchCount++;
    if (tagsLower.some((t) => t.includes(token))) tagMatchCount++;
    if (folderLower.includes(token)) folderMatchCount++;
  });

  const matchesAny =
    titleMatchCount > 0 ||
    contentMatchCount > 0 ||
    tagMatchCount > 0 ||
    folderMatchCount > 0;

  if (!matchesAny) return null;

  // Calculate occurrences in content
  const totalContentOccurrences = countMatches(cleanContent, query);

  // Calculate relevance score
  let score = 0;

  // Exact full query match bonuses
  if (titleLower === queryLower) score += 100;
  else if (titleLower.includes(queryLower)) score += 50;

  if (contentLower.includes(queryLower)) score += 30;

  // Token coverage
  score += titleMatchCount * 25;
  score += Math.min(totalContentOccurrences * 4, 40); // Cap content repetition
  score += tagMatchCount * 15;
  score += folderMatchCount * 10;

  // Pinned bonus
  if (note.pinned) score += 5;

  // Recency bonus (scaled)
  const daysOld = (Date.now() - note.updatedAt) / (1000 * 60 * 60 * 24);
  if (daysOld < 1) score += 6;
  else if (daysOld < 7) score += 3;

  const { snippet } = getSearchSnippet(note.content, query, 120);

  return {
    note,
    matchesTitle: titleMatchCount > 0,
    matchesContent: contentMatchCount > 0,
    matchesTags: tagMatchCount > 0,
    matchesFolder: folderMatchCount > 0,
    contentMatchesCount: totalContentOccurrences,
    totalScore: score,
    snippet,
  };
}

/**
 * Component that highlights matched tokens in a text string
 */
interface HighlightMatchProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

export const HighlightMatch: React.FC<HighlightMatchProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-amber-400/30 text-amber-100 font-semibold px-0.5 rounded underline decoration-amber-400/60 decoration-1',
}) => {
  if (!text) return null;
  const tokens = tokenizeQuery(query);

  if (tokens.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Create a regex with all tokens joined by |
  // Sort longest tokens first to avoid greedy collision
  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
  const regexPattern = `(${sortedTokens.map(escapeRegExp).join('|')})`;
  const regex = new RegExp(regexPattern, 'gi');

  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const isMatch = tokens.some((t) => t.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <mark key={i} className={highlightClassName}>
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};
