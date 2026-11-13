import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { ElephantIntroScene, IntroBeat, IntroSequence } from '../engine/ElephantIntroScene';
import { artworkForTime, type TimeOfDay } from '../content/places';

type Props = {
  time: TimeOfDay;
  variant?: IntroSequence;
  onComplete: () => void;
  onBack?: () => void;
};

const CHAPTERS: Record<IntroBeat, { number: string; title: string; subtitle: string }> = {
  orbit: { number: '序 · 壹', title: '象山回望', subtitle: '沿着山势，绕见水月洞天' },
  cave: { number: '序 · 贰', title: '舟出水月', subtitle: '一叶小舟，从月洞的光影间行来' },
  dock: { number: '序 · 叁', title: '临岸拾级', subtitle: '舟停江畔，画中行人拾级而上' },
  poem: { number: '序 · 终', title: '人已入画', subtitle: '山水待你，以步为笔' },
};

const STOPS = [
  { position: 0, name: '观山' },
  { position: 0.28, name: '穿洞' },
  { position: 0.61, name: '靠岸' },
  { position: 0.87, name: '入画' },
] as const;
const END_STOPS = [{ position: 0, name: '回望' }, { position: 0.58, name: '题诗' }] as const;
const clock = (seconds: number) => {
  const number = Math.floor(seconds);
  return String(Math.floor(number / 60)).padStart(2, '0') + ':' +
    String(number % 60).padStart(2, '0');
};

export default function ElephantIntro({ onComplete, time, variant = 'entrance', onBack }: Props) {
  const mount = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ElephantIntroScene | null>(null);
  const progressRef = useRef(0);
  const resumeAfterDrag = useRef(false);
  const backRef = useRef(onBack);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const duration = variant === 'finale' ? 9 : 15.2;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const completeRef = useRef(onComplete);
  const completed = useRef(false);
  const [beat, setBeat] = useState<IntroBeat>('orbit');
  const [error, setError] = useState('');

  completeRef.current = onComplete;
  backRef.current = onBack;
  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    completeRef.current();
  };

  useEffect(() => {
    let disposed = false;
    let instance: ElephantIntroScene | null = null;
    // Reduce-motion users should not be subjected to a forced camera tour.
    if (variant === 'entrance' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      completeRef.current();
      return;
    }

    // Kick off the panorama download during the 3D prologue, while never
    // changing its dimensions, encoding, or role as the Pixi world artwork.
    const prefetch = new Image();
    prefetch.src = import.meta.env.BASE_URL + 'art/scene-' + artworkForTime(time) + '.webp';

    void import('../engine/ElephantIntroScene').then(({ ElephantIntroScene }) => {
      if (disposed || !mount.current) return;
      try {
        instance = new ElephantIntroScene(
          mount.current, import.meta.env.BASE_URL + 'art/', time, variant,
          {
            onBeat: (next) => { if (!disposed) setBeat(next); },
            onProgress: (next) => {
              if (disposed) return;
              progressRef.current = next;
              setProgress(next);
              if (next >= 1) setPlaying(false);
            },
            onComplete: () => { if (!disposed) completeRef.current(); },
          },
        );
        engineRef.current = instance;
        setPlaying(instance.getPlaying());
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
        if (variant === 'finale' && backRef.current) backRef.current();
        else completeRef.current();
      }
    };
    const pauseWhenHidden = () => {
      if (document.hidden) {
        engineRef.current?.setPlaying(false);
        setPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      disposed = true;
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      engineRef.current = null;
      instance?.dispose();
    };
  }, [time, variant]);

  const seek = (value: number) => {
    const next = Math.max(0, Math.min(1, value));
    engineRef.current?.seek(next);
    progressRef.current = next;
    setProgress(next);
    if (next >= 1) setPlaying(false);
  };
  const jumpTo = (value: number) => {
    engineRef.current?.setPlaying(false);
    resumeAfterDrag.current = false;
    setPlaying(false);
    seek(value);
  };
  const startDragging = () => {
    resumeAfterDrag.current = engineRef.current?.getPlaying() ?? false;
    engineRef.current?.setPlaying(false);
    setPlaying(false);
  };
  const progressAtPointer = (event: ReactPointerEvent<HTMLInputElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return (event.clientX - bounds.left) / Math.max(1, bounds.width);
  };
  // Capturing the pointer on the entire track makes drag-to-seek work even
  // when the press begins away from the native slider thumb.
  const onScrubPointerDown = (event: ReactPointerEvent<HTMLInputElement>) => {
    startDragging();
    event.currentTarget.setPointerCapture(event.pointerId);
    seek(progressAtPointer(event));
  };
  const onScrubPointerMove = (event: ReactPointerEvent<HTMLInputElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      seek(progressAtPointer(event));
    }
  };
  const onScrubPointerUp = (event: ReactPointerEvent<HTMLInputElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      seek(progressAtPointer(event));
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endDragging();
  };
  const endDragging = () => {
    const resume = resumeAfterDrag.current && progressRef.current < 0.999;
    resumeAfterDrag.current = false;
    if (resume) {
      engineRef.current?.setPlaying(true);
      setPlaying(true);
    }
  };
  const togglePlayback = () => {
    const instance = engineRef.current;
    if (!instance) return;
    instance.setPlaying(!instance.getPlaying());
    setPlaying(instance.getPlaying());
    progressRef.current = instance.getProgress();
    setProgress(progressRef.current);
  };
  const stops = variant === 'finale' ? END_STOPS : STOPS;
  const atEnd = progress >= 0.995;

  const chapter = CHAPTERS[beat];
  return (
    <main className={'elephant-intro elephant-' + beat + ' elephant-time-' + time + ' elephant-variant-' + variant} aria-label={variant === 'finale' ? '象山水月卷尾题诗' : '象鼻山入画三维序章'}>
      <div className="elephant-render" ref={mount} aria-hidden="true" />
      <div className="elephant-papergrain" aria-hidden="true" />
      <header className="elephant-topline">
        <span className="elephant-wordmark"><b>漓</b> 漓江 · 移笔游目</span>
        <button type="button" className="elephant-skip" onClick={finish}>
          {variant === 'finale' ? '回到卷首' : '跳过序章'} <span aria-hidden="true">↗</span>
        </button>
      </header>
      <section className="elephant-caption" aria-live="polite">
        <span className="elephant-caption-index">{variant === 'finale' ? '终章 · XIANGSHAN SHUIYUE' : chapter.number + ' · ELEPHANT TRUNK HILL'}</span>
        <h1>{variant === 'finale' ? (beat === 'poem' ? '象山水月' : '回望象山') : chapter.title}</h1>
        <p>{variant === 'finale' ? '一卷行尽，青山仍在。' : chapter.subtitle}</p>
        {beat === 'poem' && (
          <blockquote className="elephant-poem">
            <span>水底有明月，水上明月浮。</span>
            <span>水流月不去，月去水还流。</span>
            <small>《水月洞》古诗 · 收录于象山相关文献</small>
          </blockquote>
        )}
      </section>
      <footer className="elephant-footer">
        {variant === 'entrance' && atEnd && <button className="elephant-enter-now" type="button" onClick={finish}>继续游历 · 进入长卷 ↗</button>}
        {variant === 'finale' && <div className="elephant-ending-actions">
          <button type="button" onClick={onBack}>返回画卷</button>
          <button type="button" onClick={finish}>完成游历 · 回到卷首</button>
        </div>}
        <div className="elephant-progress-label" role="group" aria-label="跳转序章章节">
          {stops.map((item, index) => (
            <button type="button" key={item.name} onClick={() => jumpTo(item.position)}
              aria-current={progress >= item.position && progress < (stops[index + 1]?.position ?? 1.01) ? 'step' : undefined}>
              {item.name}
            </button>
          ))}
        </div>
        <div className="elephant-scrubber">
          <button type="button" className="elephant-play" onClick={togglePlayback}
            disabled={Boolean(error) || reducedMotion}
            aria-label={playing ? '暂停三维镜头' : atEnd ? '重播三维镜头' : '播放三维镜头'}>
            {playing ? 'Ⅱ' : atEnd ? '↺' : '▶'}
          </button>
          <input type="range" min="0" max="1000" step="1"
            value={Math.round(progress * 1000)}
            aria-label={variant === 'finale' ? '拖动卷尾镜头进度' : '拖动象鼻山序章进度'}
            aria-valuetext={clock(progress * duration) + ' / ' + clock(duration)}
            onPointerDown={onScrubPointerDown}
            onPointerMove={onScrubPointerMove}
            onPointerUp={onScrubPointerUp}
            onPointerCancel={endDragging}
            onLostPointerCapture={endDragging}
            onChange={(event) => seek(Number(event.target.value) / 1000)}
            disabled={Boolean(error) || reducedMotion}
            style={{ '--intro-progress': String(progress * 100) + '%' } as CSSProperties} />
          <time className="elephant-timecode">{clock(progress * duration)} / {clock(duration)}</time>
        </div>
        <small>拖动时间轴可回看镜头 · 三维山水意象演绎，并非景区实际航线</small>
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
