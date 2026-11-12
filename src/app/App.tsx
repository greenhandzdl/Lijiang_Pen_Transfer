import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import ScrollStage from './ScrollStage';
import {
  PLACES, TIMES, getPlace,
  type PlaceId, type TimeOfDay, type VisitMode,
} from '../content/places';

const art = (name: string) => `${import.meta.env.BASE_URL}art/${name}`;

function TimeSwitcher({ time, onTime, compact = false }: {
  time: TimeOfDay;
  onTime: (time: TimeOfDay) => void;
  compact?: boolean;
}) {
  return (
    <div className={`time-switcher ${compact ? 'time-compact' : ''}`} role="group" aria-label="选择画卷时辰">
      {TIMES.map((item) => (
        <button key={item.id} type="button" onClick={() => onTime(item.id)}
          className={time === item.id ? 'active' : ''} aria-pressed={time === item.id}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState<VisitMode>('guided');
  const [time, setTime] = useState<TimeOfDay>('day');
  const [place, setPlace] = useState<PlaceId>('elephant');
  const [walking, setWalking] = useState(0);
  const [progress, setProgress] = useState(0.08);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [help, setHelp] = useState(false);
  const [actionNumber, setActionNumber] = useState(0);
  const [actionType, setActionType] = useState<'gaze' | 'song'>('gaze');
  const [zoomNumber, setZoomNumber] = useState(0);
  const [zoomFactor, setZoomFactor] = useState(1);

  const selectMode = (newMode: VisitMode) => {
    setMode(newMode);
    setEntered(true);
    setReady(false);
    setError('');
    setPlace('elephant');
  };
  const trigger = (type: 'gaze' | 'song') => {
    setActionType(type);
    setActionNumber((n) => n + 1);
  };
  const moveOne = (offset: number) => {
    const index = PLACES.findIndex((p) => p.id === place);
    const next = PLACES[Math.max(0, Math.min(PLACES.length - 1, index + offset))];
    setPlace(next.id);
  };
  const magnify = (factor: number) => {
    setZoomFactor(factor);
    setZoomNumber((n) => n + 1);
  };
  const holdToWalk = (direction: number) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setWalking(direction);
    },
    onPointerUp: () => setWalking(0),
    onPointerCancel: () => setWalking(0),
    onLostPointerCapture: () => setWalking(0),
  });

  if (!entered) {
    return (
      <main className="home">
        <div className="home-gallery" aria-label="漓江三时辰全景画卷">
          {TIMES.map((item) => (
            <img key={item.id} className={`home-gallery-image ${time === item.id ? 'visible' : ''}`}
              src={art(item.image)} alt={`${item.label}的漓江青绿山水画卷`}
              fetchPriority={item.id === 'day' ? 'high' : 'auto'} />
          ))}
        </div>
        <div className="home-wash" aria-hidden="true" />
        <header className="home-header">
          <div className="home-brand"><span className="seal">漓</span><span>桂林 · 漓江<br /><small>山水长卷 · 互动游历</small></span></div>
          <span className="home-header-note">以山水为卷 · 以脚步为笔</span>
        </header>
        <section className="home-intro">
          <div className="accent-line" />
          <p className="home-eyebrow">LIJIANG · A LIVING LANDSCAPE</p>
          <h1>漓江<span>移笔游目</span></h1>
          <p className="home-verse">青山一卷开，人在画中游。</p>
          <p className="home-description">沿一江烟波，走过象鼻山、日月双塔、阳桥与玻璃桥。随晨昏入画，听远山回响。</p>
          <div className="home-actions">
            <button className="action-primary" type="button" onClick={() => selectMode('guided')}>
              <span>入画启程 <small>随画中人 · 沿岸游历</small></span><span aria-hidden="true">↗</span>
            </button>
            <button className="action-secondary" type="button" onClick={() => selectMode('free')}>
              <span>山水漫游 <small>自在移卷 · 观景听风</small></span><span aria-hidden="true">↗</span>
            </button>
          </div>
        </section>
        <div className="home-bottom">
          <div className="home-times">
            <span>一日三景</span>
            <TimeSwitcher time={time} onTime={setTime} />
            <small>{TIMES.find((item) => item.id === time)?.caption}</small>
          </div>
          <div className="home-route">象鼻山 <i /> 日月双塔 <i /> 阳桥 <i /> 玻璃桥</div>
          <span className="home-copyright">原幅高清画卷 · Demo 0.2</span>
        </div>
      </main>
    );
  }

  const current = getPlace(place);
  return (
    <main className="experience">
      <ScrollStage mode={mode} time={time} target={place} walking={walking}
        actionNumber={actionNumber} actionType={actionType}
        zoomNumber={zoomNumber} zoomFactor={zoomFactor}
        onReady={() => setReady(true)} onPlace={setPlace} onPosition={setProgress} onError={setError} />
      <div className="scene-frame" aria-hidden="true" />
      <header className="scene-header">
        <button className="back-button" onClick={() => { setWalking(0); setEntered(false); }}>← 回到卷首</button>
        <div className="scene-brand"><span className="scene-seal">漓</span><span>漓江 <em>· 移笔游目</em></span></div>
        <button className="info-button" onClick={() => setHelp(true)}>游目指南 <span>ⓘ</span></button>
      </header>
      <div className="scene-time"><TimeSwitcher time={time} onTime={setTime} compact /></div>
      <div className="scene-label">桂林山水 · 四景入卷</div>
      <section className="place-card" aria-live="polite">
        <div className="place-heading"><span>第{current.number}景</span><span>{current.eyebrow}</span></div>
        <h2>{current.name}</h2>
        <p>{current.description}</p>
        <div className="place-footer"><small>{current.hint}</small>
          <button onClick={() => trigger(place === 'glassbridge' ? 'song' : 'gaze')}>
            {place === 'glassbridge' ? '♪ 对山歌' : '◌ 驻足赏景'}
          </button>
        </div>
      </section>
      <div className="scene-guide">拖动画卷，听风看山 <span aria-hidden="true">↔</span></div>
      <nav className="scene-landmarks" aria-label="画卷景点导航">
        {PLACES.map((item, index) => (
          <button className={item.id === place ? 'selected' : ''} key={item.id}
            aria-current={item.id === place ? 'location' : undefined}
            onClick={() => setPlace(item.id)}>
            <small>{String(index + 1).padStart(2, '0')}</small><strong>{item.name}</strong>
          </button>
        ))}
      </nav>
      <footer className="scene-controls">
        <div className="control-walk" aria-label="人物行走">
          <button {...holdToWalk(-1)} title="左行（按住）" aria-label="按住向左走">←</button>
          <button {...holdToWalk(1)} title="右行（按住）" aria-label="按住向右走">→</button>
          <span>按住行走</span>
        </div>
        <div className="scroll-progress"><span>卷首</span><div className="progress-track"><i style={{ width: `${progress * 100}%` }} /></div><span>卷尾</span></div>
        <div className="control-view" aria-label="画卷视图控制">
          <button onClick={() => moveOne(-1)} title="上一景" aria-label="上一景">‹</button>
          <button onClick={() => magnify(1 / 1.16)} title="缩小" aria-label="缩小">−</button>
          <button onClick={() => magnify(1.16)} title="放大" aria-label="放大">＋</button>
          <button onClick={() => moveOne(1)} title="下一景" aria-label="下一景">›</button>
        </div>
      </footer>
      {!ready && !error && <div className="scene-loading" role="status"><div className="loading-ornament">◈</div>山水正在徐徐展开…<small>正在载入三时辰原幅无损画卷</small></div>}
      {error && <div className="scene-error" role="alert"><strong>画卷暂未展开</strong><p>{error}</p><button onClick={() => window.location.reload()}>重试载入</button></div>}
      {help && <div className="help-overlay" onClick={() => setHelp(false)}>
        <section className="help-paper" role="dialog" aria-modal="true" aria-label="游目指南" onClick={(e) => e.stopPropagation()}>
          <button className="help-close" onClick={() => setHelp(false)} aria-label="关闭指南">×</button>
          <span className="help-chapter">入画 · 三法</span>
          <h2>游目指南</h2>
          <p>用鼠标或手指左右拖动画卷；滚轮或双指可缩放。按住左右箭头，或使用键盘 ← → / A D，让画中人沿岸行走。</p>
          <p>切换「清昼」「夕照」「入夜」会直接替换对应的原幅背景，不是简单调色。点击四景导航，可快速找到图中的位置。</p>
          <p className="help-note">当前版本使用原幅无损图片。人物行走与对山歌仍为关键姿态演示，暂未提供完整逐帧动画和授权的民歌音频。</p>
        </section>
      </div>}
    </main>
  );
}
