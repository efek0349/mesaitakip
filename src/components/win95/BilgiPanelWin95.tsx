import React, { useMemo, useState } from 'react';
import { Frame, Button, TitleBar } from '@react95/core';
import { useBilgi } from '../../hooks/useBilgi';

/**
 * renderMarkdownWin95 — BilgiPanel.tsx'teki renderMarkdown'ın Win95 karşılığı.
 * Aynı basit markdown altküme desteği (H1/H2/H3, liste, blockquote, ---,
 * **kalın**, `kod`), ama Tailwind class'ları yerine inline style ile
 * Win95'in düz metin estetiğine uyarlandı (renkli başlıklar yok, hepsi
 * siyah/kalın, blockquote sade bir Frame "in" paneli).
 */
const inlineFormatWin95 = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ fontFamily: 'monospace', fontSize: '0.625rem', backgroundColor: '#c3c7cb', padding: '0 2px' }}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const renderMarkdownWin95 = (md: string): React.ReactNode[] => {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    if (line.startsWith('# ')) {
      nodes.push(<h1 key={i} style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: 10, marginBottom: 4, borderBottom: '1px solid #868a8e', paddingBottom: 2 }}>{line.slice(2)}</h1>);
      i++; continue;
    }

    if (line.startsWith('## ')) {
      nodes.push(<h2 key={i} style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: 8, marginBottom: 3 }}>{line.slice(3)}</h2>);
      i++; continue;
    }

    if (line.startsWith('### ')) {
      nodes.push(<h3 key={i} style={{ fontSize: '0.6875rem', fontWeight: 700, marginTop: 6, marginBottom: 2 }}>{line.slice(4)}</h3>);
      i++; continue;
    }

    if (line.trim() === '---' || line.trim() === '***') {
      nodes.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #868a8e', margin: '6px 0' }} />);
      i++; continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ marginBottom: 6, marginLeft: 4, listStyle: 'none' }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ fontSize: '0.6875rem', display: 'flex', gap: 4 }}>
              <span>▪</span><span>{inlineFormatWin95(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.startsWith('> ')) {
      nodes.push(
        <Frame key={i} boxShadow="in" style={{ padding: 6, margin: '4px 0' }}>
          <p style={{ fontSize: '0.625rem' }}>{line.slice(2)}</p>
        </Frame>
      );
      i++; continue;
    }

    nodes.push(<p key={i} style={{ fontSize: '0.6875rem', lineHeight: 1.5, marginBottom: 4 }}>{inlineFormatWin95(line)}</p>);
    i++;
  }

  return nodes;
};

/**
 * BilgiPanelWin95 — useBilgi() hook'undan gelen markdown içeriğini Win95
 * görünümünde gösterir.
 *
 * Gizlilik/Kullanım Şartları: Tailwind versiyonuyla TUTARLI davranış —
 * iframe ile UYGULAMA İÇİNDE gömülü gösteriliyor, target="_blank" ile
 * YENİ SEKME AÇILMIYOR. Önceki halinde yanlışlıkla yeni sekme açılıyordu,
 * bu da kullanıcıyı Win95 temasından koparıp "URL'ye yönlendiriliyormuş"
 * hissi veriyordu.
 *
 * DÜZELTME: iframe'e önceden HİÇBİR
 * koyu/açık düzeltmesi uygulanmıyordu ("Win95 zaten sabit palet kullanıyor,
 * sayfa kendi orijinal beyaz zemininde gösterilsin" varsayımıyla). Ama
 * privacy.html/terms.html, uygulamanın <html> üzerindeki `dark` class'ına
 * (yani kaydedilmiş tema tercihine) göre KENDİ İÇİNDE koyu görünüyor —
 * bu class Win95 temasına geçilince SİLİNMİYOR (win95-mode ve dark/light
 * teması birbirinden bağımsız iki state). Sonuç: Tailwind temasında koyu
 * mod açıkken Win95'e geçilip Gizlilik/Kullanım Şartları açılınca sayfa
 * hâlâ koyu geliyordu. Çözüm: Tailwind'deki AYNI invert(0.9) hue-rotate(180deg)
 * telafi filtresini burada da uyguluyoruz.
 */
export const BilgiPanelWin95: React.FC = () => {
  const { content, loading, error, refresh, lastUpdated } = useBilgi();
  const [viewFile, setViewFile] = useState<{ url: string; title: string } | null>(null);

  const rendered = useMemo(() => {
    if (!content) return null;
    return renderMarkdownWin95(content);
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

  if (viewFile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TitleBar title={viewFile.title}>
          <TitleBar.Close onClick={() => setViewFile(null)} />
        </TitleBar>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <iframe
            src={viewFile.url}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: document.documentElement.classList.contains('dark') ? '#000000' : '#ffffff',
              filter: document.documentElement.classList.contains('dark') ? 'invert(0.9) hue-rotate(180deg)' : 'none',
            }}
            title={viewFile.title}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 6, borderBottom: '1px solid #868a8e' }}>
        <div>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700 }}>Bilgi &amp; Duyurular</span>
          {timeAgo && <div style={{ fontSize: '0.5625rem' }}>{timeAgo}</div>}
        </div>
        <Button onClick={refresh} disabled={loading} style={{ fontSize: '0.5625rem', padding: '3px 8px' }}>
          {loading ? '...' : 'Yenile'}
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        <Frame boxShadow="in" style={{ padding: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => setViewFile({ url: `${import.meta.env.BASE_URL}privacy.html`, title: 'Gizlilik Politikası' })}
            style={{ fontSize: '0.625rem', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: '#1a1a1a' }}
          >
            Gizlilik Politikası
          </button>
          <button
            onClick={() => setViewFile({ url: `${import.meta.env.BASE_URL}terms.html`, title: 'Kullanım Şartları' })}
            style={{ fontSize: '0.625rem', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: '#1a1a1a' }}
          >
            Kullanım Şartları
          </button>
        </Frame>

        {loading && !content && (
          <p style={{ fontSize: '0.6875rem', textAlign: 'center', padding: 24 }}>Yükleniyor...</p>
        )}

        {error && !content && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ fontSize: '0.6875rem', marginBottom: 8 }}>{error}</p>
            <Button onClick={refresh} style={{ fontSize: '0.625rem' }}>Tekrar Dene</Button>
          </div>
        )}

        {rendered}
      </div>
    </div>
  );
};
