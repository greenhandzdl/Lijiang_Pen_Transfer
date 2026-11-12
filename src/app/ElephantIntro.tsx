import { useEffect, useRef, useState } from 'react';
import type { IntroBeat } from '../engine/ElephantIntroScene';

type Props = {
  onComplete: () => void;
};

const CHAPTERS: Record<IntroBeat, { number: string; title: string; subtitle: string }> = {
  orbit: { number: '序 · 壹', title: '象山回望', subtitle: '沿着山势，绕见水月洞天' },
  cave: { number: '序 · 贰', title: '舟出水月', subtitle: '一叶小舟，从月洞的光影间行来' },
  dock: { number: '序 · 叁', title: '临岸拾级', subtitle: '舟停江畔，画中行人拾级而上' },
  poem: { number: '序 · 终', title: '人已入画', subtitle: '山水待你，以步为笔' },
};

export default function ElephantIntro({ onComplete }: Props) {
  const mount = useRef<HTMLDivElement | null>(null);
  const completeRef = useRef(onComplete);
  const completed = useRef(false);
  const [beat, setBeat] = useState<IntroBeat>('orbit');
  const [error, setError] = useState('');

  completeRef.current = onComplete;
  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    completeRef.current();
  };

  useEffect(() => {
    let disposed = false;
    let instance: { dispose: () => void } | null = null;
    // Reduce-motion users should not be subjected to a forced camera tour.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      completeRef.current();
      return;
    }

    // Kick off the panorama download during the 3D prologue, while never
    // changing its dimensions, encoding, or role as the Pixi world artwork.
    const prefetch = new Image();
    prefetch.src = import.meta.env.BASE_URL + 'art/scene-day.webp';

    void import('../engine/ElephantIntroScene').then(({ ElephantIntroScene }) => {
      if (disposed || !mount.current) return;
      try {
        instance = new ElephantIntroScene(
          mount.current, import.meta.env.BASE_URL + 'art/',
          { onBeat: (next) => { if (!disposed) setBeat(next); },
            onComplete: () => { if (!disposed) completeRef.current(); } },
        );
      } catch (cause) {
        console.warn('Three.js intro could not initialise', cause);
        if (!disposed) setError('当前设备暂时不能运行立体序章，可直接进入高清画卷。');
      }
    }).catch((cause: unknown) => {
      console.warn('Three.js intro could not load', cause);
      if (!disposed) setError('立体场景加载失败，高清长卷仍可直接游览。');
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        completeRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      disposed = true;
      window.removeEventListener('keydown', onKeyDown);
      instance?.dispose();
    };
  }, []);

  const chapter = CHAPTERS[beat];
  return (
    <main className={'elephant-intro elephant-' + beat} aria-label="象鼻山入画三维序章">
      <div className="elephant-render" ref={mount} aria-hidden="true" />
      <div className="elephant-papergrain" aria-hidden="true" />
      <header className="elephant-topline">
        <span className="elephant-wordmark"><b>漓</b> 漓江 · 移笔游目</span>
        <button type="button" className="elephant-skip" onClick={finish}>
          跳过序章 <span aria-hidden="true">↗</span>
        </button>
      </header>
      <section className="elephant-caption" aria-live="polite">
        <span className="elephant-caption-index">{chapter.number} · ELEPHANT TRUNK HILL</span>
        <h1>{chapter.title}</h1>
        <p>{chapter.subtitle}</p>
        {beat === 'poem' && (
          <blockquote className="elephant-poem">
            <span>水底有明月，水上明月浮。</span>
            <span>水流月不去，月去水还流。</span>
            <small>《水月洞》古诗 · 收录于象山相关文献</small>
          </blockquote>
        )}
      </section>
      <footer className="elephant-footer">
        <div className="elephant-progress-label">
          <span>观山</span><span>穿洞</span><span>靠岸</span><span>入画</span>
        </div>
        <div className="elephant-progress" aria-label="序章播放进度">
          <i />
        </div>
        <small>三维山水意象演绎 · 不代表景区实际游船航线</small>
      </footer>
      {error && (
        <div className="elephant-fallback" role="alert">
          <strong>山色未能立体展开</strong>
          <p>{error}</p>
          <button type="button" onClick={finish}>直接进入画卷</button>
        </div>
      )}
    </main>
  );
}
