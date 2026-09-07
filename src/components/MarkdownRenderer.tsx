import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Maximize2, X } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onToggleTask?: (taskIndex: number) => void;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onToggleTask,
  className = '',
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleCopyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parseMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockContent: string[] = [];
    let codeBlockIdx = 0;
    let taskIdx = 0;
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = (key: string) => {
      if (tableRows.length === 0) return null;
      const headers = tableRows[0];
      const rows = tableRows.slice(1).filter((r) => !r.every((c) => c.match(/^[:\s-]+$/)));

      const tableElement = (
        <div key={key} className="my-4 overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/80 text-neutral-300 font-semibold border-b border-neutral-800">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-3.5 py-2.5">
                    {formatInline(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-950/40">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-neutral-900/40 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 text-neutral-300">
                      {formatInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
      return tableElement;
    };

    const formatInline = (text: string): React.ReactNode => {
      // Inline images
      const imgMatch = text.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        return (
          <div className="relative group my-3 inline-block max-w-full">
            <img
              src={imgMatch[2]}
              alt={imgMatch[1] || 'Bilde'}
              referrerPolicy="no-referrer"
              className="rounded-lg border border-neutral-800 max-h-96 object-contain bg-neutral-900 cursor-pointer shadow-md transition-transform group-hover:scale-[1.01]"
              onClick={() => setZoomedImage(imgMatch[2])}
            />
            <button
              onClick={() => setZoomedImage(imgMatch[2])}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-neutral-900/80 backdrop-blur border border-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-300 hover:text-white"
              title="Forstørr bilde"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        );
      }

      // Process tokens: links, bold, italic, inline code, strike
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let partKey = 0;

      while (remaining.length > 0) {
        // Link [text](url)
        const linkMatch = remaining.match(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/);
        // Inline code `code`
        const codeMatch = remaining.match(/`([^`]+)`/);
        // Bold **text**
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
        // Italic *text*
        const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
        // Strikethrough ~~text~~
        const strikeMatch = remaining.match(/~~([^~]+)~~/);

        // Find earliest match
        const matches = [
          linkMatch ? { type: 'link', match: linkMatch, index: linkMatch.index! } : null,
          codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
          boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
          italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
          strikeMatch ? { type: 'strike', match: strikeMatch, index: strikeMatch.index! } : null,
        ].filter(Boolean) as { type: string; match: RegExpMatchArray; index: number }[];

        if (matches.length === 0) {
          parts.push(remaining);
          break;
        }

        matches.sort((a, b) => a.index - b.index);
        const earliest = matches[0];

        if (earliest.index > 0) {
          parts.push(remaining.slice(0, earliest.index));
        }

        const m = earliest.match;
        if (earliest.type === 'link') {
          parts.push(
            <a
              key={partKey++}
              href={m[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1"
            >
              {m[1]}
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          );
        } else if (earliest.type === 'code') {
          parts.push(
            <code
              key={partKey++}
              className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-indigo-300 text-xs font-mono"
            >
              {m[1]}
            </code>
          );
        } else if (earliest.type === 'bold') {
          parts.push(
            <strong key={partKey++} className="font-semibold text-neutral-100">
              {m[1]}
            </strong>
          );
        } else if (earliest.type === 'italic') {
          parts.push(
            <em key={partKey++} className="italic text-neutral-300">
              {m[1]}
            </em>
          );
        } else if (earliest.type === 'strike') {
          parts.push(
            <del key={partKey++} className="line-through text-neutral-500">
              {m[1]}
            </del>
          );
        }

        remaining = remaining.slice(earliest.index + m[0].length);
      }

      return parts;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          const codeText = codeBlockContent.join('\n');
          const currentIdx = codeBlockIdx++;
          elements.push(
            <div
              key={`code-${currentIdx}`}
              className="my-3 rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden font-mono text-xs"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                <span>{codeBlockLang || 'kode'}</span>
                <button
                  onClick={() => handleCopyCode(codeText, currentIdx)}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  {copiedIndex === currentIdx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Kopier
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-neutral-200 overflow-x-auto leading-relaxed">
                <code>{codeText}</code>
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeBlockContent = [];
        } else {
          // Flush previous table if any
          if (inTable) {
            const tbl = flushTable(`table-${i}`);
            if (tbl) elements.push(tbl);
          }
          inCodeBlock = true;
          codeBlockLang = line.replace('```', '').trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Check for markdown table
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        const cells = line
          .trim()
          .slice(1, -1)
          .split('|');
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        const tbl = flushTable(`table-${i}`);
        if (tbl) elements.push(tbl);
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-bold tracking-tight text-neutral-100 mt-5 mb-2.5 pb-1 border-b border-neutral-800/80">
            {formatInline(line.slice(2))}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-xl font-semibold text-neutral-100 mt-4 mb-2">
            {formatInline(line.slice(3))}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-semibold text-neutral-200 mt-3 mb-1.5">
            {formatInline(line.slice(4))}
          </h3>
        );
        continue;
      }

      // Horizontal Rule
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(<hr key={`hr-${i}`} className="my-4 border-neutral-800" />);
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={`quote-${i}`}
            className="border-l-4 border-indigo-500/80 bg-indigo-500/5 px-4 py-2 my-2 rounded-r-md italic text-neutral-300 text-sm"
          >
            {formatInline(line.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Task list item
      const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        const isChecked = taskMatch[1].toLowerCase() === 'x';
        const taskText = taskMatch[2];
        const currentTaskIdx = taskIdx++;
        elements.push(
          <div key={`task-${i}`} className="flex items-start gap-2.5 my-1.5 text-sm">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleTask && onToggleTask(currentTaskIdx)}
              className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0 cursor-pointer accent-indigo-500"
            />
            <span className={isChecked ? 'line-through text-neutral-500' : 'text-neutral-200'}>
              {formatInline(taskText)}
            </span>
          </div>
        );
        continue;
      }

      // Bullet list item
      if (line.match(/^[-*]\s+/)) {
        elements.push(
          <div key={`li-${i}`} className="flex items-start gap-2 my-1 text-sm text-neutral-200 pl-2">
            <span className="text-indigo-400 mt-1 select-none">•</span>
            <span>{formatInline(line.replace(/^[-*]\s+/, ''))}</span>
          </div>
        );
        continue;
      }

      // Numbered list item
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2 my-1 text-sm text-neutral-200 pl-2">
            <span className="text-indigo-400 font-mono text-xs mt-0.5 select-none">{numMatch[1]}.</span>
            <span>{formatInline(numMatch[2])}</span>
          </div>
        );
        continue;
      }

      // Image line (![alt](url))
      const imgOnlyMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgOnlyMatch) {
        elements.push(
          <div key={`img-${i}`} className="my-3">
            {formatInline(line.trim())}
          </div>
        );
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        elements.push(<div key={`blank-${i}`} className="h-2" />);
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${i}`} className="text-sm leading-relaxed text-neutral-200 my-1">
          {formatInline(line)}
        </p>
      );
    }

    if (inTable) {
      const tbl = flushTable(`table-end`);
      if (tbl) elements.push(tbl);
    }

    return elements;
  };

  return (
    <div className={`prose-neutral max-w-none text-neutral-200 ${className}`}>
      {parseMarkdown(content)}

      {/* Zoom Modal for Images */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-neutral-900 p-2 rounded-xl border border-neutral-800">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 shadow"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage}
              alt="Forstørret bilde"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] w-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
