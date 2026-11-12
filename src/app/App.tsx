import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import ScrollStage from './ScrollStage';
import { PLACES, getPlace, type PlaceId, type TimeOfDay, type VisitMode } from '../content/places';

const source = `${import.meta.env.BASE_URL}art/lijiang-scene.webp`;

export default function App() {
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState<VisitMode>('guided');
  const [time, setTime] = useState<TimeOfDay>('day');
  const [place, setPlace] = useState<PlaceId>('elephant');
  const [walk, setWalk] = useState(0);
  const [progress, setProgress] = useState(0.08);
  const [paused, setPaused] = useState(false);
  const [singVersion, setSingVersion] = useState(0);
  const [zoomVersion, setZoomVersion] = useState(0);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const begin = (nextMode: VisitMode) => {
    setMode(nextMode);
    setError('');
    setPlace('elephant');
    setEntered(true);
  };

  const zoom = (factor: number) => {
    setZoomFactor(factor);
    setZoomVersion((n) => n + 1);
  };

  const go = (direction: number) => {
    const index = PLACES.findIndex((p) => p.id === place);
    setPlace(PLACES[Math.max(0, Math.min(PLACES.length - 1, index + direction))].id);
  };

  const pointerWalk = (direction: number) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setWalk(direction);
    },
    onPointerUp: () => setWalk(0),
    onPointerCancel: () => setWalk(0),
    onLostPointerCapture: () => setWalk(0),
  });

  if (!entered) {
    return (
      <main className="home" style={{ backgroundImage: `linear-gradient(180deg,rgba(197,151,68,.09),rgba(226,199,119,.1)),url("${source}")` }}>
        <div className="paper-grain" aria-hidden="true" />
        <div className="home-top">
          <div className="brand-mini"><span className="brand-chinese">漓江</span><span>移笔游目 · 壮乡入画</span></div>
          <div className="home-time" aria-label="时辰模式">晴光 · 山水 · 人间</div>
        </div>
        <section className="home-copy">
          <p className="eyebrow">青 绿 山 水 · 人 在 画 中 游</p>
          <h1>漓<span>江</span></h1>
          <p className="poem">移笔游目，步入烟水人间。</p>
          <p className="intro">以漓江为卷，以山水为路。看青峰隐隐，听江上山歌，在一幅可以慢慢展开的画里行走。</p>
          <div className="home-actions">
            <button className="primary-action" onClick={() => begin('guided')}>
              <span className="action-icon">◈</span><span><strong>入画启程</strong><small>随画中人 · 缓缓游历</small></span><span>↗</span>
            </button>
            <button className="light-action" onClick={() => begin('free')}>
              <span className="action-icon">⌁</span><span><strong>山水漫游</strong><small>自由观景 · 移步换景</small></span><span>↗</span>
            </button>
          </div>
        </section>
        <div className="home-bottom">
          <div>一卷山水 · 四处拾景</div>
          <div className="home-sites">{PLACES.map((p) => <span key={p.id}>{p.name}</span>)}</div>
          <div className="home-footnote">Interactive scroll · Demo 0.1</div>
        </div>
      </main>
    );
  }

  return (
    <main className="experience">
      <ScrollStage
        mode={mode} time={time} target={place} walk={walk}
        paused={paused} singVersion={singVersion} zoomVersion={zoomVersion} zoomFactor={zoomFactor}
        onPlace={setPlace} onPosition={setProgress} onError={setError}
      />
      <div className="scene-vignette" aria-hidden="true" />
      <header className="scene-topbar">
        <button className="top-link" onClick={() => { setWalk(0); setEntered(false); }}>← 返回长卷</button>
        <div className="scene-title">漓江 <span>· 移笔游目</span></div>
        <button className="top-link" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>玩法说明 ⓘ</button>
      </header>
      <div className="scene-meta">
        <span className="kicker">INTERACTIVE PAINTING</span>
        <div className="mode-toggle" aria-label="游览模式">
          <button className={mode === 'guided' ? 'active' : ''} onClick={() => setMode('guided')}>入画启程</button>
          <button className={mode === 'free' ? 'active' : ''} onClick={() => setMode('free')}>山水漫游</button>
        </div>
      </div>
      <div className="time-toggle" aria-label="画面时辰">
        {(['day', 'sunset', 'night'] as const).map((value, i) => (
          <button key={value} className={time === value ? 'active' : ''} onClick={() => setTime(value)}
            aria-pressed={time === value}>{['白昼', '暮色', '夜景'][i]}</button>
        ))}
      </div>
      <aside className="place-panel" aria-live="polite">
        <span className="place-prefix">{getPlace(place).label} / 四景游历</span>
        <h2>{getPlace(place).name}</h2>
        <p>{getPlace(place).description}</p>
        <small>{getPlace(place).action}</small>
        {place === 'glassbridge' && (
          <button className="sing-button" onClick={() => setSingVersion((n) => n + 1)}>♪ 对山歌 · 姿态演示</button>
        )}
      </aside>
      <nav className="place-nav" aria-label="景点导航">
        {PLACES.map((p) => (
          <button key={p.id} className={p.id === place ? 'selected' : ''} onClick={() => setPlace(p.id)}
            aria-current={p.id === place ? 'location' : undefined}>
            <span>{p.label}</span><strong>{p.name}</strong>
          </button>
        ))}
      </nav>
      <footer className="controlbar">
        <div className="walk-controls">
          <button {...pointerWalk(-1)} aria-label="向左行走" title="向左行走">←</button>
          <button {...pointerWalk(1)} aria-label="向右行走" title="向右行走">→</button>
        </div>
        <div className="scene-progress" aria-label="画卷浏览进度">
          <span>卷首</span>
          <div className="track"><div className="track-fill" style={{ width: `${progress * 100}%` }} /></div>
          <span>卷尾</span>
        </div>
        <div className="view-controls">
          <button onClick={() => zoom(1 / 1.15)} aria-label="缩小">−</button>
          <button onClick={() => zoom(1.15)} aria-label="放大">＋</button>
          <button onClick={() => setPaused((v) => !v)} aria-label={paused ? '继续' : '暂停'}>{paused ? '▶' : 'Ⅱ'}</button>
          <button onClick={() => go(-1)} aria-label="上一个景点">‹</button>
          <button onClick={() => go(1)} aria-label="下一个景点">›</button>
        </div>
      </footer>
      {error && <div className="error-panel" role="alert">{error} <button onClick={() => location.reload()}>重新加载</button></div>}
      {showHelp && (
        <div className="help-backdrop" onClick={() => setShowHelp(false)}>
          <section className="help-card" onClick={(e) => e.stopPropagation()} aria-label="操作说明">
            <button className="help-close" onClick={() => setShowHelp(false)} aria-label="关闭说明">×</button>
            <h2>游目指南</h2>
            <p>鼠标 / 单指拖动画卷；滚轮 / 双指缩放；方向键或 A / D 控制角色；点击景点导航；点击水面泛起涟漪。前往「玻璃桥」可触发对山歌演示。</p>
            <p>本版本为技术 Demo：单张人物关键姿态和未分层背景用于验证交互，不代表完整步态、真实地理或正式文化内容。</p>
          </section>
        </div>
      )}
    </main>
  );
}
