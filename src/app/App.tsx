import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
const ElephantIntro = lazy(() => import('./ElephantIntro'));
import { NightMusic } from '../engine/NightMusic';
import ScrollStage from './ScrollStage';
import { encountersFor, findEncounter, type EncounterId, type DialogueChoice, type NightView } from '../content/encounters';
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
  const [introOpen, setIntroOpen] = useState(false);
  const [mode, setMode] = useState<VisitMode>('guided');
  const [time, setTime] = useState<TimeOfDay>('morning');
  const [activeEncounter, setActiveEncounter] = useState<EncounterId | null>(null);
  const [encounterReply, setEncounterReply] = useState('');
  const [nightView, setNightView] = useState<NightView>('shore');
  const [nightLights, setNightLights] = useState(false);
  const [nightRhythm, setNightRhythm] = useState(false);
  const [nightDrones, setNightDrones] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicError, setMusicError] = useState('');
  const [musicController, setMusicController] = useState<NightMusic | null>(null);
  const musicRef = useRef<NightMusic | null>(null);
  const [previewId, setPreviewId] = useState<EncounterId>('cormorant');
  const [previewNumber, setPreviewNumber] = useState(0);
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

  useEffect(() => () => {
    musicRef.current?.dispose();
    musicRef.current = null;
  }, []);

  const toggleNightMusic = async () => {
    let controller = musicRef.current;
    if (!controller) {
      controller = new NightMusic();
      musicRef.current = controller;
      setMusicController(controller);
    }
    try {
      const playing = await controller.toggle();
      setMusicPlaying(playing);
      setMusicError('');
      if (playing) {
        setNightLights(true);
        setNightRhythm(true);
      }
    } catch (error) {
      console.error('Original night music playback failed', error);
      controller.stop();
      setMusicPlaying(false);
      setMusicError('音乐播放失败，请检查浏览器是否允许音频播放，或稍后重试。');
    }
  };

  const leavePainting = () => {
    musicRef.current?.stop();
    setMusicPlaying(false);
    setMusicError('');
    setWalking(0);
    setActiveEncounter(null);
    setHelp(false);
    setEntered(false);
    setIntroOpen(false);
  };

  const selectTime = (next: TimeOfDay) => {
    if (next !== 'night') {
      musicRef.current?.stop();
      setMusicPlaying(false);
      setMusicError('');
    }
    setTime(next);
    closeEncounter();
  };

  const openEncounter = (id: EncounterId) => {
    const encounter = findEncounter(id);
    if (encounter.time !== time) return;
    if (activeEncounter === id) {
      closeEncounter();
      return;
    }
    setPlace(encounter.place);
    setActiveEncounter(id);
    setEncounterReply('');
  };

  const closeEncounter = () => {
    if (activeEncounter === 'night-stage' && musicRef.current?.playing) {
      musicRef.current.stop();
      setMusicPlaying(false);
    }
    setMusicError('');
    setActiveEncounter(null);
    setEncounterReply('');
  };

  const navigatePlace = (id: PlaceId) => {
    setPlace(id);
    closeEncounter();
  };

  const changeMode = (nextMode: VisitMode) => {
    setMode(nextMode);
    setWalking(0);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activeEncounter) closeEncounter();
        if (help) setHelp(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeEncounter, help]);

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden && musicRef.current?.playing) {
        musicRef.current.stop();
        setMusicPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => document.removeEventListener('visibilitychange', stopWhenHidden);
  }, []);

  const chooseDialogue = (choice: DialogueChoice) => {
    setEncounterReply(choice.answer);
    if (choice.navigateTo) setPlace(choice.navigateTo);
    if (choice.splash && activeEncounter) {
      setPreviewId(activeEncounter);
      setPreviewNumber((count) => count + 1);
    }
  };

  const selectMode = (newMode: VisitMode) => {
    setMode(newMode);
    setEntered(newMode === 'free');
    setIntroOpen(newMode === 'guided');
    setReady(false);
    setError('');
    setPlace('elephant');
    musicRef.current?.stop();
    setMusicPlaying(false);
    closeEncounter();
  };
  const completeIntro = () => {
    setIntroOpen(false);
    setEntered(true);
    setReady(false);
  };
  const replayIntro = () => {
    musicRef.current?.stop();
    setMusicPlaying(false);
    setWalking(0);
    setActiveEncounter(null);
    setIntroOpen(true);
    setEntered(false);
  };
  const trigger = (type: 'gaze' | 'song') => {
    setActionType(type);
    setActionNumber((n) => n + 1);
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

  if (introOpen) {
    return (
      <Suspense fallback={<main className="elephant-intro elephant-loading" role="status"><span>水月洞天，正徐徐展开…</span><button className="elephant-skip" onClick={completeIntro}>直接入画 ↗</button></main>}>
        <ElephantIntro time={time} onComplete={completeIntro} />
      </Suspense>
    );
  }

  if (!entered) {
    return (
      <main className="home">
        <div className="home-gallery" aria-label="漓江互动长卷首页原幅插画">
          <img className="home-gallery-image visible" src={art('home-background.webp')}
            alt="桂林漓江青绿山水长卷，群峰、双塔、古桥与江上游船" fetchPriority="high" />
        </div>
        <div className="home-wash" aria-hidden="true" />
        <header className="home-header">
          <div className="home-brand"><span className="seal">漓</span><span>桂林 · 漓江<br /><small>山水长卷 · 互动游历</small></span></div>
          <div className="home-header-tools">
            <span className="home-header-note">以山水为卷 · 以脚步为笔</span>
            <div className="home-time-wrap">
              <span className="home-time-label">一日四境</span>
              <TimeSwitcher time={time} onTime={selectTime} />
            </div>
          </div>
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
        <footer className="home-bottom">
          <div className="home-route" aria-label="游历路线">
            <span>象鼻山</span><i /><span>日月双塔</span><i /><span>阳桥</span><i /><span>玻璃桥</span>
          </div>
          <span className="home-copyright">原幅高清画卷 · 随时辰入画</span>
        </footer>
      </main>
    );
  }

  const current = getPlace(place);
  return (
    <main className="experience">
      <ScrollStage mode={mode} time={time} target={place} walking={walking}
        nightView={nightView} nightLights={nightLights} nightRhythm={nightRhythm} nightDrones={nightDrones}
        musicPlaying={musicPlaying} musicController={musicController}
        previewId={previewId} previewNumber={previewNumber}
        actionNumber={actionNumber} actionType={actionType}
        zoomNumber={zoomNumber} zoomFactor={zoomFactor}
        onReady={() => setReady(true)} onPlace={navigatePlace} onEncounter={openEncounter}
        onPosition={setProgress} onError={setError} />
      <div className="scene-frame" aria-hidden="true" />
      <header className="scene-header">
        <button className="back-button" onClick={leavePainting}>← 回到卷首</button>
        <div className="scene-brand"><span className="scene-seal">漓</span><span>漓江 <em>· 移笔游目</em></span></div>
        <div className="scene-header-actions">
          <button className="info-button scene-replay" onClick={replayIntro}>重看象山序章 ↻</button>
          <button className="info-button" onClick={() => setHelp(true)}>游目指南 <span>ⓘ</span></button>
        </div>
      </header>
      <div className="scene-time"><TimeSwitcher time={time} onTime={selectTime} compact /></div>
      <div className="scene-label">桂林山水 · 四景入卷</div>
      <aside className="encounter-rail" aria-label="画中可发现的故事">
        <span className="encounter-eyebrow">画中故事</span>
        {encountersFor(time).length ? encountersFor(time).map((encounter) => (
          <button key={encounter.id} type="button" className={activeEncounter === encounter.id ? 'active' : ''}
            onClick={() => openEncounter(encounter.id)} aria-expanded={activeEncounter === encounter.id}>
            <span className="encounter-dot" aria-hidden="true">◦</span>
            <span><strong>{encounter.title}</strong><small>{encounter.kicker}</small></span>
          </button>
        )) : <p className="encounter-rest">此刻宜静观山水</p>}
      </aside>
      {activeEncounter && findEncounter(activeEncounter).time === time && (
        <section className="encounter-sheet" role="region" aria-label={`${findEncounter(activeEncounter).title}互动`}>
          <button className="encounter-close" onClick={closeEncounter} aria-label="关闭互动">×</button>
          <span className="encounter-eyebrow">{findEncounter(activeEncounter).kicker} · 插画互动</span>
          <h3>{findEncounter(activeEncounter).title}</h3>
          <p>{findEncounter(activeEncounter).intro}</p>
          {activeEncounter === 'night-stage' ? (
            <div className="night-actions">
              <div className="night-view" role="group" aria-label="选择夜景视角">
                <button className={nightView === 'shore' ? 'active' : ''} aria-pressed={nightView === 'shore'}
                  onClick={() => setNightView('shore')}>岸边观看</button>
                <button className={nightView === 'boat' ? 'active' : ''} aria-pressed={nightView === 'boat'}
                  onClick={() => setNightView('boat')}>船上观看（游船插画）</button>
              </div>
              <button onClick={() => setNightLights((value) => !value)} aria-pressed={nightLights}>
                {nightLights ? '◉ 关闭灯光叠加' : '◎ 分段点亮江岸'}
              </button>
              <button onClick={() => {
                setNightRhythm((value) => !value);
                setNightLights(true);
              }} aria-pressed={nightRhythm}>
                {nightRhythm ? '◉ 关闭静音节奏预览' : '♫ 预览倒影节拍（静音）'}
              </button>
              <button onClick={toggleNightMusic} aria-pressed={musicPlaying} className="night-music-button">
                {musicPlaying ? 'Ⅱ 暂停原创器乐' : '♪ 播放原创器乐 · 音乐联动倒影'}
              </button>
              <button onClick={() => trigger('song')}>♫ 对山歌 · 人物姿态预览（无演唱）</button>
              <button onClick={() => setNightDrones((value) => !value)} aria-pressed={nightDrones}>
                {nightDrones ? '◉ 关闭无人机光点' : '✧ 查看无人机概念光点'}
              </button>
              <p className="night-note" role="status">当前：{nightView === 'shore' ? '岸边' : '游船'}视角 · {nightLights ? '灯光开启' : '灯光关闭'} · {nightDrones ? '无人机光点开启' : '无人机光点关闭'} · {musicPlaying ? '原创器乐播放中，倒影跟随实时频谱' : '未播放音乐'}。此器乐非传统山歌录音。</p>
              {musicError && <p className="music-error" role="alert">{musicError}</p>}
            </div>
          ) : (
            <div className="dialogue-options">
              {findEncounter(activeEncounter).choices.map((choice) => (
                <button key={choice.id} type="button" onClick={() => chooseDialogue(choice)}>{choice.label}</button>
              ))}
            </div>
          )}
          {encounterReply && <p className="encounter-reply" role="status">{encounterReply}</p>}
          <small className="encounter-disclaimer">{findEncounter(activeEncounter).detail}</small>
        </section>
      )}
      <section className="place-card" aria-live="polite">
        <div className="place-heading"><span>第{current.number}景</span><span>{current.eyebrow}</span></div>
        <h2>{current.name}</h2>
        <p>{current.description}</p>
        <div className="place-footer"><small>{current.hint}</small>
          <button onClick={() => trigger(place === 'glassbridge' && time === 'night' ? 'song' : 'gaze')}>
            {place === 'glassbridge' && time === 'night' ? '♪ 对山歌' : '◌ 驻足赏景'}
          </button>
        </div>
      </section>
      <div className="scene-guide">拖动画卷，听风看山 <span aria-hidden="true">↔</span></div>
      <nav className="scene-landmarks" aria-label="画卷景点导航">
        {PLACES.map((item, index) => (
          <button className={item.id === place ? 'selected' : ''} key={item.id}
            aria-current={item.id === place ? 'location' : undefined}
            onClick={() => navigatePlace(item.id)}>
            <small>{String(index + 1).padStart(2, '0')}</small><strong>{item.name}</strong>
          </button>
        ))}
      </nav>
      <footer className="scene-controls">
        <div className="scene-mode-switch" role="group" aria-label="选择游览方式">
          <button className={mode === 'free' ? 'active' : ''} aria-pressed={mode === 'free'}
            onClick={() => changeMode('free')}>漫游</button>
          <button className={mode === 'guided' ? 'active' : ''} aria-pressed={mode === 'guided'}
            onClick={() => changeMode('guided')}>导览</button>
        </div>
        <div className="control-walk" aria-label="人物行走">
          <button {...holdToWalk(-1)} title="按住向左行走" aria-label="按住向左走">←</button>
          <button {...holdToWalk(1)} title="按住向右行走" aria-label="按住向右走">→</button>
        </div>
        <div className="scroll-progress" aria-label={`画卷位置 ${Math.round(progress * 100)}%`}>
          <span>卷首</span><div className="progress-track"><i style={{ width: `${progress * 100}%` }} /></div><span>卷尾</span>
        </div>
        <div className="control-view" aria-label="画卷视图控制">
          <button onClick={() => magnify(1 / 1.16)} title="缩小" aria-label="缩小">−</button>
          <button onClick={() => magnify(1.16)} title="放大" aria-label="放大">＋</button>
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
          <p>切换「清晨」「正午」「夕照」「入夜」会选择对应高清原画，其中清晨和正午共用白昼原画。点击画中的人物与金色发现点，或使用左上方的「画中故事」入口打开互动；底部路线可切换景点，左下可随时切换漫游/导览。</p>
          <p className="help-note">当前版本使用原幅无损画卷、四张新绘制的透明交互插画，以及项目专门创作的器乐示范音轨。夜间「播放原创器乐」可用真实频谱驱动水面反射；静音节奏预览仍独立可用。渔人整理竹筏、鸬鹚潜水和对山歌人声尚无完整动画与正式演唱，无人机光点属于虚拟概念演示。</p>
        </section>
      </div>}
    </main>
  );
}
