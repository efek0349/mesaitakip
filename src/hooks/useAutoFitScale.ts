import { useLayoutEffect, useState } from 'react';

interface UseAutoFitScaleOptions {
  /**
   * Takvim + Ay Özetleri'ni birlikte tutan ORTAK flex kapsayıcısının DOM
   * elementi (state olarak, callback ref ile verilir). Bu, "gerçekten
   * kullanılabilir alanın" ölçüldüğü yer — CSS `vh`/`%` değerlerine
   * güvenmek yerine (bunlar TitleBar/Header/TaskBar gibi kromu
   * saymayabiliyor ya da flex zincirinde "definite height" belirsizliği
   * yüzünden sessizce çözülmeyebiliyor), doğrudan bu elementin gerçek
   * piksel yüksekliğini JS ile ölçüyoruz.
   */
  bounds: HTMLElement | null;
  /**
   * `bounds` dikey (flex-col) düzendeyken, yüksekliğinin ne kadarı
   * takvime ayrılsın (0-1 arası, örn. 0.56 = %56). `bounds` yatay
   * (flex-row) düzendeyken bu değer YOK SAYILIR — o modda sütun zaten
   * `align-items: stretch` ile kapsayıcının TAM yüksekliğini alıyor.
   */
  heightRatio: number;
}

/**
 * useAutoFitScale — Takvimi, kapladığı GERÇEK alana göre otomatik olarak
 * KÜÇÜLTÜR (asla büyütmez) — içerik sığmazsa scrollbar açmak yerine
 * `transform: scale()` ile görsel olarak "ekrana sığdırılır".
 *
 * NOT: outerRef/innerRef burada normal `useRef` DEĞİL, callback-ref
 * (state setter) — bu sayede Win95 ⇄ normal görünüm gibi DOM'un
 * tamamen yeniden mount edildiği durumlarda da (ref.current sessizce
 * değişip effect'in fark etmemesi riski olmadan) doğru elemente
 * yeniden bağlanıp ölçüm yapabiliyor.
 *
 * KULLANIM:
 *   const [bounds, setBounds] = useState<HTMLDivElement | null>(null);
 *   const { outerRef, innerRef, scale, outerHeight } =
 *     useAutoFitScale({ bounds, heightRatio: 0.56 });
 *
 *   <div ref={setBounds} className="flex flex-col landscape:flex-row ...">
 *     <div ref={outerRef} style={{ height: outerHeight ?? undefined, overflow: 'hidden' }}>
 *       <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
 *         <Calendar ... />
 *       </div>
 *     </div>
 *     <MonthlyStats ... />
 *   </div>
 */
export function useAutoFitScale({ bounds, heightRatio }: UseAutoFitScaleOptions) {
  const [outer, setOuter] = useState<HTMLDivElement | null>(null);
  const [inner, setInner] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [outerHeight, setOuterHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!outer || !inner || !bounds) return;

    let raf = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const recalc = () => {
      cancelAnimationFrame(raf);
      // rAF: ResizeObserver callback'i içinde senkron ölçüm/yazım
      // döngüsüne ("ResizeObserver loop limit exceeded") girmemek için
      // bir sonraki frame'e erteliyoruz.
      raf = requestAnimationFrame(() => {
        const naturalH = inner.scrollHeight;
        const naturalW = inner.scrollWidth;
        if (!naturalH || !naturalW) return;

        const availW = outer.clientWidth || naturalW;

        // Kapsayıcı (bounds) şu an yatay mı (landscape: flex-row) dikey
        // mi (portrait: flex-col) — buna göre "kullanılabilir yükseklik"
        // farklı hesaplanıyor:
        const isRow = getComputedStyle(bounds).flexDirection.startsWith('row');
        const rawAvailH = isRow
          ? bounds.clientHeight // yatayda sütun zaten tam yüksekliği kaplıyor (stretch)
          : bounds.clientHeight * heightRatio; // dikeyde bounds'un bir payını ayır

        // GÜVENLİK PAYI: `transform: scale()` alt-piksel yuvarlama
        // hatalarına açık — hesaplanan ölçek sınıra TAM oturursa takvimin
        // en alt satırı (haftalar) 1-2px kırpılabiliyor. Bunu önlemek
        // için kullanılabilir yükseklikten küçük bir pay düşüyoruz.
        const SAFETY_MARGIN_PX = 10;
        const availH = Math.max(0, rawAvailH - SAFETY_MARGIN_PX);

        if (!availH) return;

        // ÖNEMLİ: TEK (uniform) ölçek kullanılıyor — X ve Y ayrı ayrı
        // ölçeklenirse (ör. sadece yükseklik kısıtlıyken genişlik
        // dokunulmadan bırakılırsa) takvim hücreleri ORANSIZ şekilde
        // yassılaşıyor; bu da hücre köşelerindeki rozetlerin (tatil
        // etiketi, mesai/izin etiketi, vardiya ikonu) birbirine
        // yaklaşıp ÇAKIŞMASINA sebep oluyor — özellikle resmi/dini
        // tatil günlerinde (daha çok rozet olduğu için) bu daha
        // belirgindi. Genişlik zaten responsive grid (`minmax(0,1fr)`)
        // sayesinde doğru sığdığından, uniform ölçek pratikte neredeyse
        // hiç yatay boşluk yaratmıyor.
        const nextScale = Math.min(1, availH / naturalH, availW / naturalW);
        const nextHeight = Math.min(naturalH, availH);

        setScale((prev) => (Math.abs(prev - nextScale) > 0.005 ? nextScale : prev));
        setOuterHeight((prev) => (prev !== null && Math.abs(prev - nextHeight) < 1 ? prev : nextHeight));
      });
    };

    recalc();

    const ro = new ResizeObserver(recalc);
    ro.observe(outer);
    ro.observe(inner);
    ro.observe(bounds);

    // Ek güvenlik: bazı durumlarda (ör. yazı tipi geç yüklenmesi,
    // Frame/react95'in kendi iç layout geçişleri) ResizeObserver hemen
    // tetiklenmeyebiliyor — pencere resize'ında da elle tetikliyoruz.
    // `orientationchange` özellikle Android WebView'de (Capacitor native
    // build) ekran döndürüldüğünde `resize` eventinin gecikmeli/eksik
    // tetiklendiği durumlar için ekstra güvenlik.
    const recalcDelayed = () => {
      recalc();
      // orientationchange anında bazı cihazlarda layout henüz oturmamış
      // olabiliyor — kısa bir gecikmeyle bir kez daha ölçüyoruz.
      timeouts.push(setTimeout(recalc, 150));
      timeouts.push(setTimeout(recalc, 400));
    };

    window.addEventListener('resize', recalc);
    window.addEventListener('orientationchange', recalcDelayed);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recalc);
      window.removeEventListener('orientationchange', recalcDelayed);
      cancelAnimationFrame(raf);
      timeouts.forEach(clearTimeout);
    };
  }, [outer, inner, bounds, heightRatio]);

  return { outerRef: setOuter, innerRef: setInner, scale, outerHeight };
}
