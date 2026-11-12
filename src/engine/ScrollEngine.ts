import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
} from 'pixi.js';
import { PLACES, type PlaceId, type TimeOfDay, type VisitMode } from '../content/places';

const WORLD_W = 2500;
const WORLD_H = 1300;
const GROUND_Y = 1060;
const MIN_ZOOM = 0.42;
const MAX_ZOOM = 1.36;
const WALK_SPEED = 210;
const base = import.meta.env.BASE_URL;

type Callbacks = {
  onPlace: (id: PlaceId) => void;
  onPosition: (progress: number) => void;
  onError: (message: string) => void;
};

export class ScrollEngine {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly rippleLayer = new Graphics();
  private readonly tintLayer = new Graphics();
  private readonly marks = new Container();
  private readonly host: HTMLDivElement;
  private readonly callbacks: Callbacks;
  private hero: Sprite | undefined;
  private walkTexture: Texture | undefined;
  private songTexture: Texture | undefined;
  private ready = false;
  private disposed = false;
  private cameraX = 0;
  private zoom = 0.74;
  private heroX = 260;
  private walkDir = 0;
  private mode: VisitMode = 'guided';
  private time: TimeOfDay = 'day';
  private paused = false;
  private singing = false;
  private songLeft = 0;
  private elapsed = 0;
  private lastProgress = -1;
  private pointer = new Map<number, { x: number; y: number }>();
  private previousPinch = 0;
  private dragMoved = false;
  private autoDestination: number | null = null;
  private ripples: Array<{ x: number; y: number; age: number }> = [];

  constructor(host: HTMLDivElement, callbacks: Callbacks) {
    this.host = host;
    this.callbacks = callbacks;
  }

  async init(): Promise<void> {
    try {
      await this.app.init({
        background: '#c6ba8b',
        antialias: true,
        resizeTo: this.host,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (this.disposed) {
        this.app.destroy(true, { children: true });
        return;
      }
      this.ready = true;
      this.app.canvas.className = 'scroll-canvas';
      this.app.canvas.setAttribute('aria-label', '可拖动缩放的漓江画卷');
      this.app.canvas.setAttribute('role', 'img');
      this.host.appendChild(this.app.canvas);

      const [scene, walk, song] = await Promise.all([
        Assets.load<Texture>(`${base}art/lijiang-scene.webp`),
        Assets.load<Texture>(`${base}art/hero-walk.webp`),
        Assets.load<Texture>(`${base}art/hero-song.webp`),
      ]);
      if (this.disposed) return;

      const image = new Sprite(scene);
      image.width = WORLD_W;
      image.height = WORLD_H;
      this.world.addChild(image);

      this.tintLayer.rect(0, 0, WORLD_W, WORLD_H).fill({ color: 0x203949, alpha: 1 });
      this.tintLayer.alpha = 0;
      this.world.addChild(this.tintLayer);

      this.drawPlaces();
      this.world.addChild(this.marks);
      this.walkTexture = walk;
      this.songTexture = song;
      this.hero = new Sprite(walk);
      this.hero.anchor.set(0.5, 1);
      this.hero.width = 142;
      this.hero.height = 221;
      this.hero.position.set(this.heroX, GROUND_Y);
      this.world.addChild(this.hero);

      this.world.addChild(this.rippleLayer);
      this.app.stage.addChild(this.world);
      this.applyTime();
      this.resetCamera();
      this.installInput();
      this.app.ticker.add(this.tick);
      this.emitPosition();
    } catch (error) {
      if (!this.disposed) this.callbacks.onError(
        '画卷或人物素材加载失败。请检查网络连接，刷新后重试。'
      );
      console.error('ScrollEngine.init failed', error);
    }
  }

  private drawPlaces(): void {
    for (const place of PLACES) {
      const marker = new Container();
      const dot = new Graphics()
        .circle(0, 0, 16)
        .fill({ color: 0x634f35, alpha: 0.92 })
        .circle(0, 0, 8)
        .fill({ color: 0xf9dca2, alpha: 1 });
      const halo = new Graphics()
        .circle(0, 0, 29)
        .stroke({ color: 0xf5e5bf, width: 3, alpha: 0.9 });
      marker.addChild(halo, dot);
      marker.position.set(place.x, 885);
      marker.eventMode = 'static';
      marker.cursor = 'pointer';
      marker.hitArea = { contains: (x: number, y: number) => x * x + y * y < 46 * 46 };
      marker.on('pointertap', () => this.focusPlace(place.id));
      this.marks.addChild(marker);
    }
  }

  private installInput(): void {
    const canvas = this.app.canvas;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private onDown = (event: PointerEvent): void => {
    this.pointer.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.app.canvas.setPointerCapture(event.pointerId);
    this.dragMoved = false;
    if (this.pointer.size === 2) {
      const [a, b] = Array.from(this.pointer.values());
      this.previousPinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  private onMove = (event: PointerEvent): void => {
    const previous = this.pointer.get(event.pointerId);
    if (!previous) return;
    this.pointer.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointer.size === 2) {
      const [a, b] = Array.from(this.pointer.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.previousPinch > 0) this.setZoom(this.zoom * distance / this.previousPinch);
      this.previousPinch = distance;
      return;
    }
    const dx = event.clientX - previous.x;
    if (Math.abs(dx) > 0.8) this.dragMoved = true;
    this.autoDestination = null;
    this.cameraX -= dx / this.zoom;
    this.clampCamera();
    this.layout();
  };

  private onUp = (event: PointerEvent): void => {
    const previous = this.pointer.get(event.pointerId);
    this.pointer.delete(event.pointerId);
    this.previousPinch = 0;
    if (!this.dragMoved && previous) {
      const rect = this.app.canvas.getBoundingClientRect();
      const worldX = this.cameraX + (event.clientX - rect.left) / this.zoom;
      const worldY = (event.clientY - rect.top - this.world.y) / this.zoom;
      if (worldY > 705 && worldY < 1125) {
        this.ripples.push({ x: worldX, y: Math.max(900, worldY), age: 0 });
      }
    }
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.setZoom(this.zoom * (event.deltaY > 0 ? 0.92 : 1.08));
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return;
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      this.walkDir = -1; this.autoDestination = null; event.preventDefault();
    }
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      this.walkDir = 1; this.autoDestination = null; event.preventDefault();
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(event.key)) this.walkDir = 0;
  };

  private onResize = (): void => { this.clampCamera(); this.layout(); };
  private onVisibility = (): void => { this.paused = document.hidden; };

  private resetCamera(): void {
    const fit = Math.min(this.host.clientHeight / 860, this.host.clientWidth / 980);
    this.zoom = Math.max(MIN_ZOOM, Math.min(0.94, fit));
    this.cameraX = 0;
    this.layout();
  }

  private clampCamera(): void {
    const visibleW = this.host.clientWidth / this.zoom;
    this.cameraX = Math.max(0, Math.min(WORLD_W - visibleW, this.cameraX));
    if (visibleW >= WORLD_W) this.cameraX = -(visibleW - WORLD_W) / 2;
  }

  private layout(): void {
    this.clampCamera();
    this.world.scale.set(this.zoom);
    this.world.x = -this.cameraX * this.zoom;
    this.world.y = this.host.clientHeight * 0.78 - GROUND_Y * this.zoom;
    this.emitPosition();
  }

  private emitPosition(): void {
    const visibleW = this.host.clientWidth / this.zoom;
    const pct = Math.min(1, Math.max(0, (this.cameraX + visibleW / 2) / WORLD_W));
    if (Math.abs(pct - this.lastProgress) > 0.002) {
      this.lastProgress = pct;
      this.callbacks.onPosition(pct);
    }
  }

  private setZoom(next: number): void {
    const center = this.cameraX + (this.host.clientWidth / this.zoom) / 2;
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    this.cameraX = center - (this.host.clientWidth / this.zoom) / 2;
    this.layout();
  }

  zoomBy(factor: number): void { this.setZoom(this.zoom * factor); }

  setWalkDirection(direction: number): void {
    this.walkDir = Math.sign(direction);
    if (direction !== 0) this.autoDestination = null;
  }

  setMode(mode: VisitMode): void { this.mode = mode; }

  setTimeOfDay(time: TimeOfDay): void { this.time = time; this.applyTime(); }

  private applyTime(): void {
    if (this.time === 'day') {
      this.tintLayer.tint = 0xffffff;
      this.tintLayer.alpha = 0;
    } else if (this.time === 'sunset') {
      this.tintLayer.tint = 0xae6d42;
      this.tintLayer.alpha = 0.18;
    } else {
      this.tintLayer.tint = 0x1b395c;
      this.tintLayer.alpha = 0.42;
    }
  }

  focusPlace(placeId: PlaceId): void {
    const place = PLACES.find((p) => p.id === placeId) ?? PLACES[0];
    this.callbacks.onPlace(place.id);
    if (this.mode === 'guided') {
      this.autoDestination = place.x;
    } else {
      this.cameraX = place.x - this.host.clientWidth / (this.zoom * 2);
      this.layout();
    }
    if (place.id === 'glassbridge') this.ripples.push({ x: place.x, y: 950, age: 0 });
  }

  sing(): void {
    if (!this.hero || !this.songTexture) return;
    this.singing = !this.singing;
    this.songLeft = this.singing ? 4.5 : 0;
    this.autoDestination = null;
    this.walkDir = 0;
    this.hero.texture = this.singing ? this.songTexture : this.walkTexture!;
    this.hero.width = this.singing ? 155 : 142;
    this.hero.height = 221;
  }

  setPaused(paused: boolean): void { this.paused = paused; }

  private tick = (ticker: { deltaMS: number }): void => {
    if (this.paused || this.disposed || !this.hero) return;
    const dt = Math.min(50, ticker.deltaMS) / 1000;
    this.elapsed += dt;

    if (this.singing) {
      this.songLeft -= dt;
      if (this.songLeft <= 0) this.sing();
    } else {
      let direction = this.walkDir;
      if (direction === 0 && this.autoDestination !== null) {
        const delta = this.autoDestination - this.heroX;
        if (Math.abs(delta) < 5) this.autoDestination = null;
        else direction = Math.sign(delta);
      }
      if (direction !== 0 && this.mode === 'guided') {
        const destinationDistance = this.autoDestination === null ? Infinity : Math.abs(this.autoDestination - this.heroX);
        this.heroX = Math.min(WORLD_W - 90, Math.max(90,
          this.heroX + direction * Math.min(WALK_SPEED * dt, destinationDistance)));
        this.hero.scale.x = Math.abs(this.hero.scale.x) * direction;
        // Illustrative sprite motion only; one pose is not a full walk cycle.
        this.hero.y = GROUND_Y + Math.sin(this.elapsed * 12) * 3;
      } else {
        this.hero.y = GROUND_Y;
      }
      this.hero.x = this.heroX;
      if (this.mode === 'guided' && (direction !== 0 || this.autoDestination !== null)) {
        const targetX = this.heroX - this.host.clientWidth / (this.zoom * 0.44);
        this.cameraX += (targetX - this.cameraX) * Math.min(1, dt * 2.4);
        this.layout();
      }
    }
    this.rippleLayer.clear();
    this.ripples = this.ripples.filter((r) => r.age < 1.8);
    for (const r of this.ripples) {
      r.age += dt;
      for (let i = 0; i < 2; i++) {
        const radius = 8 + r.age * 80 + i * 15;
        this.rippleLayer.ellipse(r.x, r.y, radius, radius * 0.22)
          .stroke({ color: 0xe9e2b6, alpha: Math.max(0, 0.44 * (1 - r.age / 1.8)), width: 1.6 });
      }
    }
  };

  destroy(): void {
    this.disposed = true;
    if (!this.ready) return;
    const canvas = this.app.canvas;
    canvas.removeEventListener('pointerdown', this.onDown);
    canvas.removeEventListener('pointermove', this.onMove);
    canvas.removeEventListener('pointerup', this.onUp);
    canvas.removeEventListener('pointercancel', this.onUp);
    canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.app.ticker.remove(this.tick);
    this.app.destroy(true, { children: true, texture: false, textureSource: false });
    this.ready = false;
  }
}
