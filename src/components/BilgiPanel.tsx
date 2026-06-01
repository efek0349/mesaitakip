import React, { useMemo } from 'react';
import { RefreshCw, AlertCircle, BookOpen, Clock } from 'lucide-react';
import { useBilgi } from '../hooks/useBilgi';

// Basit markdown → JSX dönüştürücü (harici kütüphane gerektirmez)
const renderMarkdown = (md: string): React.ReactNode[] => {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Boş satır
    if (line.trim() === '') {
      i++;
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      nodes.push(
        <h1 key={i} className="text-lg font-black text-gray-800 dark:text-white mt-4 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
          {line.slice(2)}
        </h1>
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={i} className="text-sm font-black text-blue-600 dark:text-blue-400 mt-4 mb-1.5 uppercase tracking-wide">
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={i} className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-3 mb-1">
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Yatay çizgi
    if (line.trim() === '---' || line.trim() === '***') {
      nodes.push(<hr key={i} className="border-gray-200 dark:border-gray-700 my-3" />);
      i++;
      continue;
    }

    // Liste
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="space-y-1 mb-2 ml-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Blockquote (> ile başlayan — vurgu kutusu)
    if (line.startsWith('> ')) {
      nodes.push(
        <div key={i} className="my-2 pl-3 border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-r-xl py-2 pr-2">
          <p className="text-xs text-orange-800 dark:text-orange-300 font-medium">{line.slice(2)}</p>
        </div>
      );
      i++;
      continue;
    }

    // Normal paragraf
    nodes.push(
      <p key={i} className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-1.5">
        {inlineFormat(line)}
      </p>
    );
    i++;
  }

  return nodes;
};

// **kalın** ve `kod` formatı
const inlineFormat = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-gray-800 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono text-blue-600 dark:text-blue-400">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

export const BilgiPanel: React.FC = () => {
  const { content, loading, error, refresh, lastUpdated } = useBilgi();

  const rendered = useMemo(() => {
    if (!content) return null;
    return renderMarkdown(content);
  }, [content]);

  const timeAgo = lastUpdated
    ? (() => {
        const diff = Date.now() - lastUpdated.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        if (mins < 1) return 'Az önce';
        if (mins < 60) return `${mins} dk önce`;
        return `${hours} saat önce`;
      })()
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-sm">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">Bilgi & Duyurular</h2>
            {timeAgo && (
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-2.5 h-2.5 text-gray-400" />
                <span className="text-[9px] text-gray-400">{timeAgo}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-90 transition-all disabled:opacity-50"
          title="Yenile"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
        {loading && !content && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            <p className="text-xs text-gray-400">Yükleniyor...</p>
          </div>
        )}

        {error && !content && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{error}</p>
            <button
              onClick={refresh}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg active:scale-95 transition-all"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {rendered && (
          <div className="space-y-0.5">
            {rendered}
          </div>
        )}
      </div>
    </div>
  );
};
