import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { ENCOUNTERS, type EncounterId } from '../content/encounters';
import { NightEffects, type NightControls } from './NightEffects';
import type { NightMusic } from './NightMusic';
import {
  PLACES, WORLD_HEIGHT, WORLD_WIDTH, artworkForTime,
  type ArtworkVariant, type PlaceId, type TimeOfDay, type VisitMode,
} from '../content/places';

type EngineCallbacks = {
  onReady: () => void;
  onPlace: (place: PlaceId) => void;
  onPosition: (progress: number) => void;
  onError: (message: string) => void;
  onEncounter: (id: EncounterId) => void;
};

type Pose = 'front' | 'side' | 'back' | 'walk' | 'song';

type Point = { x: number; y: number };

type Ripple = { x: number; y: number; age: number };

const art = (file: string) => `${import.meta.env.BASE_URL}art/${file}`;
const WALK_SPEED = 185; // world pixels per second at native artwork resolution
const MAX_FRAME_TIME = 0.05;

// Authoring guide: the visible shoreline/bridge deck changes height along the painting.
// These points are approximate stage positions, not collision or surveyed geometry.
const WALKWAY: readonly Point[] = [
  { x: 70, y: 460 }, { x: 265, y: 463 }, { x: 485, y: 465 },
  { x: 760, y: 466 }, { x: 1020, y: 464 }, { x: 1100, y: 456 },
  { x: 1222, y: 400 }, { x: 1360, y: 372 }, { x: 1510, y: 414 },
  { x: 1596, y: 458 }, { x: 1750, y: 460 }, { x: 1900, y: 459 },
  { x: 2104, y: 460 },
];

function walkwayY(x: number): number {
  const first = WALKWAY[0];
  if (x <= first.x) return first.y;
  for (let i = 1; i < WALKWAY.length; i += 1) {
    const a = WALKWAY[i - 1];
    const b = WALKWAY[i];
    if (x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      const eased = t * t * (3 - 2 * t);
      return a.y + (b.y - a.y) * eased;
    }
  }
  return WALKWAY[WALKWAY.length - 1].y;
}

export class ScrollEngine {
  private app = new Application();
  private world = new Container();
  private readonly host: HTMLDivElement;
  private readonly callbacks: EngineCallbacks;
  private readonly backgrounds = new Map<ArtworkVariant, Sprite>();
  private readonly actors = new Map<Pose, Texture>();
  private readonly markers = new Container();
  private readonly encounterMarkers = new Map<EncounterId, Container>();
  private readonly encounterSprites = new Map<EncounterId, Sprite>();
  private readonly encounterLayer = new Container();
  private readonly nightEffects = new NightEffects();
  private music: NightMusic | null = null;
  private readonly ripplesLayer = new Graphics();
  private readonly activePointers = new Map<number, Point>();
  private ripples: Ripple[] = [];
  private hero: Sprite | null = null;
  private ready = false;
  private disposed = false;
  private reducedMotion = false;
  private visible = true;
  private mode: VisitMode = 'guided';
  private time: TimeOfDay = 'morning';
  private nightControls: NightControls = { view: 'shore', lights: false, rhythm: false, music: false, drones: false };
  private heroX = 260;
  private facing = 1;
  private walkDirection = 0;
  private destination: number | null = null;
  private cameraLeft = 0;
  private cameraTarget: number | null = null;
  private zoom = 1;
  private zoomMinimum = 0.5;
  private zoomMaximum = 2;
  private pinchLength = 0;
  private dragged = false;
  private elapsed = 0;
  private pose: Pose = 'front';
  private action: 'gaze' | 'song' | null = null;
  private actionSeconds = 0;
  private lastProgress = -1;

  constructor(host: HTMLDivElement, callbacks: EngineCallbacks) {
    this.host = host;
    this.callbacks = callbacks;
  }

  async init(): Promise<void> {
    try {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      await this.app.init({
        background: '#dac69e',
        antialias: true,
        resolution: Math.min(2, window.devicePixelRatio || 1),
        autoDensity: true,
        resizeTo: this.host,
      });
      if (this.disposed) { this.app.destroy(true); return; }
      this.ready = true;
      this.app.canvas.className = 'scroll-canvas';
      this.app.canvas.setAttribute('role', 'img');
      this.app.canvas.setAttribute('aria-label', '漓江全景画卷，可拖动或缩放');
      this.host.appendChild(this.app.canvas);
      this.installEvents();

      // Keep the true 2172x724 panorama; no stretching, downsampling or color filters.
      const [day, dusk, night, front, side, back, walk, song] = await Promise.all([
        Assets.load<Texture>(art('scene-day.webp')),
        Assets.load<Texture>(art('scene-dusk.webp')),
        Assets.load<Texture>(art('scene-night.webp')),
        Assets.load<Texture>(art('hero-front.webp')),
        Assets.load<Texture>(art('hero-side.webp')),
        Assets.load<Texture>(art('hero-back.webp')),
        Assets.load<Texture>(art('hero-walk.webp')),
        Assets.load<Texture>(art('hero-song.webp')),
      ]);
      if (this.disposed) return;

      const backgrounds = { day, dusk, night } as const;
      (['day', 'dusk', 'night'] as const).forEach((id) => {
        const sprite = new Sprite(backgrounds[id]);
        sprite.width = WORLD_WIDTH;
        sprite.height = WORLD_HEIGHT;
        sprite.alpha = id === artworkForTime(this.time) ? 1 : 0;
        this.backgrounds.set(id, sprite);
        this.world.addChild(sprite);
      });
      this.actors.set('front', front);
      this.actors.set('side', side);
      this.actors.set('back', back);
      this.actors.set('walk', walk);
      this.actors.set('song', song);

      this.addMarkers();
      this.addEncounterMarkers();
      this.world.addChild(this.nightEffects.graphics);
      this.world.addChild(this.markers);
      this.world.addChild(this.encounterLayer);
      this.updateEncounterVisibility();

      this.hero = new Sprite(front);
      this.hero.anchor.set(0.5, 1);
      this.hero.height = 116;
      this.hero.width = 116 * (front.width / front.height);
      this.hero.position.set(this.heroX, walkwayY(this.heroX));
      this.world.addChild(this.hero);
      this.world.addChild(this.ripplesLayer);
      this.app.stage.addChild(this.world);
      this.fitToHeight();
      this.app.ticker.add(this.tick);
      this.callbacks.onReady();
      // High-resolution original panoramas are already visible. Compact new NPC
      // sprites now load progressively without delaying first paint.
      void this.loadEncounterSprites();
    } catch (error) {
      console.error('Unable to initialize showcase artwork', error);
      if (!this.disposed) this.callbacks.onError('画卷加载失败：请检查网络，或刷新页面重新加载。');
    }
  }

  private addMarkers(): void {
    for (const place of PLACES) {
      const node = new Container();
      const halo = new Graphics().circle(0, 0, 16)
        .stroke({ color: 0xf5e3b3, width: 1.5, alpha: 0.86 });
      const core = new Graphics().circle(0, 0, 6).fill({ color: 0xe6c58b, alpha: 0.97 })
        .circle(0, 0, 2.5).fill({ color: 0x654d39 });
      node.position.set(place.worldX, place.markerY);
      node.addChild(halo, core);
      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.hitArea = { contains: (x: number, y: number) => x * x + y * y <= 28 * 28 };
      node.on('pointertap', () => {
        this.callbacks.onPlace(place.id);
        this.focusPlace(place.id);
      });
      this.markers.addChild(node);
    }
  }


  /**
   * Decorative but genuinely clickable world hotspots. Can later be attached
   * to transparent NPC sprites without changing the dialogue layer.
   */
  private addEncounterMarkers(): void {
    this.encounterLayer.sortableChildren = true;
    for (const encounter of ENCOUNTERS) {
      const marker = new Container();
      const ring = new Graphics().circle(0, 0, 13)
        .stroke({ color: 0xf8e7c1, width: 1.7, alpha: 0.9 });
      const center = new Graphics().circle(0, 0, 5.5)
        .fill({ color: encounter.time === 'night' ? 0xf5b36b : 0x9b8a5c, alpha: 0.94 })
        .circle(0, 0, 2.2).fill({ color: 0xfff6df });
      marker.position.set(encounter.worldX, encounter.worldY);
      marker.zIndex = encounter.worldY;
      marker.addChild(ring, center);
      marker.eventMode = 'static';
      marker.cursor = 'pointer';
      marker.alpha = 0.94;
      marker.hitArea = { contains: (x: number, y: number) => x * x + y * y <= 30 * 30 };
      marker.on('pointerover', () => { marker.alpha = 1; marker.scale.set(1.035); });
      marker.on('pointerout', () => { marker.alpha = 0.94; marker.scale.set(1); });
      marker.on('pointertap', () => {
        if (encounter.time !== this.time) return;
        this.walkDirection = 0;
        this.destination = null;
        this.callbacks.onPlace(encounter.place);
        this.callbacks.onEncounter(encounter.id);
      });
      this.encounterMarkers.set(encounter.id, marker);
      this.encounterLayer.addChild(marker);
    }
  }

  private async loadEncounterSprites(): Promise<void> {
    // Individual failures leave the accessible marker and story controls in place.
    await Promise.all(ENCOUNTERS.map(async (encounter) => {
      try {
        const texture = await Assets.load<Texture>(art(encounter.spriteFile));
        if (this.disposed) return;
        const marker = this.encounterMarkers.get(encounter.id);
        if (!marker) return;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 1);
        sprite.width = encounter.spriteWidth;
        sprite.height = encounter.spriteWidth * texture.height / texture.width;
        sprite.eventMode = 'none';
        sprite.alpha = encounter.id === 'night-stage' ? 0.95 : 0.91;
        marker.addChildAt(sprite, 0);
        // Move the discovery pin above the small figure, not over its body.
        const pinY = -sprite.height - 9;
        marker.getChildAt(1).position.y = pinY;
        marker.getChildAt(2).position.y = pinY;
        // Keep a generous invisible touch target even after shrinking the art.
        const hitHalfWidth = Math.max(42, encounter.spriteWidth * 0.72);
        marker.hitArea = {
          contains: (x: number, y: number) =>
            Math.abs(x) < hitHalfWidth &&
            y > -sprite.height - 34 && y < 30,
        };
        this.encounterSprites.set(encounter.id, sprite);
      } catch (error) {
        console.warn(`Optional encounter art unavailable: ${encounter.spriteFile}`, error);
      }
    }));
  }

  private updateEncounterVisibility(): void {
    for (const encounter of ENCOUNTERS) {
      const marker = this.encounterMarkers.get(encounter.id);
      if (marker) marker.visible = encounter.time === this.time;
    }
  }

  previewEncounter(id: EncounterId): void {
    const encounter = ENCOUNTERS.find((item) => item.id === id);
    if (encounter && encounter.time === this.time) {
      this.ripples.push({ x: encounter.worldX, y: 516, age: 0 });
      this.ripples.push({ x: encounter.worldX + 16, y: 523, age: 0.18 });
    }
  }

  setNightControls(next: NightControls): void {
    const viewChanged = this.nightControls.view !== next.view;
    this.nightControls = next;
    if (this.time === 'night' && viewChanged) {
      // Reframe the painted river around the boat; the mode remains a viewing
      // composition, not a claim of a navigable first-person boat interior.
      const targetX = next.view === 'boat' ? 1798 : 1326;
      this.cameraTarget = targetX - this.host.clientWidth / (2 * this.zoom);
    }
    this.applyCamera();
  }

  /** Attach audio analysis without passing each-frame values through React. */
  setMusicController(controller: NightMusic | null): void {
    this.music = controller;
    if (!controller) this.nightEffects.setAudioEnergy(0);
  }

  setAudioEnergy(energy: number): void {
    this.nightEffects.setAudioEnergy(energy);
  }

  private installEvents(): void {
    const canvas = this.app.canvas;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.app.canvas.setPointerCapture(event.pointerId);
    this.dragged = false;
    this.cameraTarget = null;
    if (this.activePointers.size === 2) this.pinchLength = this.pointerDistance();
  };

  private pointerDistance(): number {
    const [a, b] = [...this.activePointers.values()];
    return a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
  }

  private onPointerMove = (event: PointerEvent): void => {
    const last = this.activePointers.get(event.pointerId);
    if (!last) return;
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.dragged = true;
    if (this.activePointers.size > 1) {
      const nextDistance = this.pointerDistance();
      if (this.pinchLength > 0 && nextDistance > 0) this.setZoom(this.zoom * nextDistance / this.pinchLength);
      this.pinchLength = nextDistance;
      return;
    }
    this.cameraLeft -= (event.clientX - last.x) / this.zoom;
    this.applyCamera();
  };

  private onPointerUp = (event: PointerEvent): void => {
    const hadPointer = this.activePointers.has(event.pointerId);
    this.activePointers.delete(event.pointerId);
    this.pinchLength = this.activePointers.size === 2 ? this.pointerDistance() : 0;
    if (!this.dragged && hadPointer) {
      const bounds = this.app.canvas.getBoundingClientRect();
      const x = this.cameraLeft + (event.clientX - bounds.left) / this.zoom;
      const y = (event.clientY - bounds.top - this.world.y) / this.zoom;
      if (y >= 483 && y < WORLD_HEIGHT && x >= 0 && x <= WORLD_WIDTH) {
        this.ripples.push({ x, y, age: 0 });
      }
    }
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.setZoom(this.zoom * Math.exp(-event.deltaY * 0.001));
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof HTMLElement &&
      (target.isContentEditable || ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      this.setWalkDirection(-1); event.preventDefault();
    } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      this.setWalkDirection(1); event.preventDefault();
    }
  };
  private onKeyUp = (event: KeyboardEvent): void => {
    if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) this.setWalkDirection(0);
  };
  private onResize = (): void => { this.fitToHeight(); };
  private onVisibilityChange = (): void => { this.visible = !document.hidden; };

  private fitToHeight(): void {
    const fit = Math.max(0.42, this.host.clientHeight / WORLD_HEIGHT);
    this.zoomMinimum = fit * 0.72;
    this.zoomMaximum = fit * 1.65;
    this.zoom = Math.min(this.zoomMaximum, Math.max(this.zoomMinimum, fit));
    this.cameraLeft = this.heroX - this.host.clientWidth / (this.zoom * 2);
    this.applyCamera();
  }

  private applyCamera(): void {
    if (!this.ready) return;
    const visibleWidth = this.host.clientWidth / this.zoom;
    const maxLeft = WORLD_WIDTH - visibleWidth;
    this.cameraLeft = maxLeft < 0 ? maxLeft / 2 : Math.min(maxLeft, Math.max(0, this.cameraLeft));
    this.world.scale.set(this.zoom);
    const boatPreview = this.time === 'night' && this.nightControls.view === 'boat';
    const drift = boatPreview && !this.reducedMotion ? Math.sin(this.elapsed * 1.25) * 2.1 : 0;
    this.world.position.set(-this.cameraLeft * this.zoom, (this.host.clientHeight - WORLD_HEIGHT * this.zoom) / 2 + (boatPreview ? 19 : 0) + drift);
    const fraction = Math.max(0, Math.min(1, (this.cameraLeft + visibleWidth / 2) / WORLD_WIDTH));
    if (Math.abs(fraction - this.lastProgress) > 0.003) {
      this.lastProgress = fraction;
      this.callbacks.onPosition(fraction);
    }
  }

  private setZoom(nextZoom: number): void {
    const center = this.cameraLeft + (this.host.clientWidth / this.zoom) / 2;
    this.zoom = Math.max(this.zoomMinimum, Math.min(this.zoomMaximum, nextZoom));
    this.cameraLeft = center - (this.host.clientWidth / this.zoom) / 2;
    this.applyCamera();
  }
  zoomBy(factor: number): void { this.setZoom(this.zoom * factor); }
  setWalkDirection(direction: number): void {
    this.walkDirection = Math.sign(direction);
    if (direction) { this.destination = null; this.action = null; }
  }
  setMode(mode: VisitMode): void { this.mode = mode; }
  setTimeOfDay(time: TimeOfDay): void {
    this.time = time;
    this.updateEncounterVisibility();
    this.applyCamera();
  }

  focusPlace(id: PlaceId, instant = false): void {
    const place = PLACES.find((p) => p.id === id) ?? PLACES[0];
    this.cameraTarget = place.worldX - this.host.clientWidth / (2 * this.zoom);
    if (instant) { this.cameraLeft = this.cameraTarget; this.cameraTarget = null; this.applyCamera(); }
    if (this.mode === 'guided' && !instant) {
      this.destination = Math.min(WORLD_WIDTH - 55, Math.max(55, place.worldX));
    }
    if (this.mode === 'free') {
      this.heroX = Math.min(WORLD_WIDTH - 55, Math.max(55, place.worldX));
      this.action = null;
    }
  }

  performAction(action: 'gaze' | 'song'): void {
    this.walkDirection = 0;
    this.destination = null;
    this.action = action;
    this.actionSeconds = action === 'song' ? 5.4 : 3.8;
  }

  private setHeroPose(next: Pose): void {
    if (!this.hero || this.pose === next) return;
    const texture = this.actors.get(next);
    if (!texture) return;
    this.hero.texture = texture;
    const h = next === 'song' ? 127 : 116;
    this.hero.height = h;
    this.hero.width = h * (texture.width / texture.height);
    this.hero.scale.x = Math.abs(this.hero.scale.x) * this.facing;
    this.pose = next;
  }

  private tick = (ticker: { deltaMS: number }): void => {
    if (!this.hero || !this.visible || this.disposed) return;
    const dt = Math.min(MAX_FRAME_TIME, ticker.deltaMS / 1000);
    this.elapsed += dt;
    this.nightEffects.setAudioEnergy(this.time === 'night' && this.music ? this.music.sampleEnergy() : 0);
    this.nightEffects.draw(dt, this.time === 'night', this.nightControls, this.reducedMotion);
    // Only the raft-on-water and lantern boat receive a subtle floating motion.
    for (const id of ['cormorant', 'night-stage'] as const) {
      const sprite = this.encounterSprites.get(id);
      if (sprite) sprite.y = this.reducedMotion ? 0 : Math.sin(this.elapsed * 1.65 + (id === 'night-stage' ? 1 : 0)) * 1.8;
    }
    if (this.time === 'night' && this.nightControls.view === 'boat') this.applyCamera();
    for (const [id, sprite] of this.backgrounds) {
      const desired = id === artworkForTime(this.time) ? 1 : 0;
      const blend = this.reducedMotion ? 1 : Math.min(1, dt * 3.2);
      sprite.alpha += (desired - sprite.alpha) * blend;
      if (Math.abs(desired - sprite.alpha) < 0.002) sprite.alpha = desired;
    }

    let direction = this.walkDirection;
    if (this.action) {
      this.actionSeconds -= dt;
      this.setHeroPose(this.action === 'song' ? 'song' : 'back');
      if (this.actionSeconds <= 0) this.action = null;
    } else {
      if (!direction && this.destination !== null) {
        const delta = this.destination - this.heroX;
        if (Math.abs(delta) < 2) this.destination = null;
        else direction = Math.sign(delta);
      }
      if (direction) {
        this.facing = direction;
        const step = Math.min(WALK_SPEED * dt, this.destination === null ? Infinity : Math.abs(this.destination - this.heroX));
        this.heroX = Math.max(55, Math.min(WORLD_WIDTH - 55, this.heroX + direction * step));
        this.setHeroPose('walk');
      } else this.setHeroPose('front');
    }
    if (this.hero) {
      const isWalking = !this.action && direction !== 0;
      const bob = this.reducedMotion || !isWalking ? 0 : Math.sin(this.elapsed * 11) * 1.6;
      this.hero.position.set(this.heroX, walkwayY(this.heroX) + bob);
      this.hero.scale.x = Math.abs(this.hero.scale.x) * this.facing;
    }

    if (this.cameraTarget !== null) {
      const speed = this.reducedMotion ? 1 : Math.min(1, dt * 4.8);
      this.cameraLeft += (this.cameraTarget - this.cameraLeft) * speed;
      if (Math.abs(this.cameraTarget - this.cameraLeft) < 0.5) this.cameraTarget = null;
      this.applyCamera();
    } else if (this.mode === 'guided' && direction !== 0) {
      const follow = this.heroX - this.host.clientWidth / (this.zoom * 2);
      this.cameraLeft += (follow - this.cameraLeft) * Math.min(1, dt * 2.6);
      this.applyCamera();
    }

    this.ripplesLayer.clear();
    this.ripples = this.ripples.filter((r) => r.age < 1.9);
    for (const ripple of this.ripples) {
      ripple.age += dt;
      for (let n = 0; n < 2; n += 1) {
        const radius = 6 + ripple.age * 48 + n * 16;
        this.ripplesLayer.ellipse(ripple.x, ripple.y, radius, radius * 0.24)
          .stroke({ color: 0xe9e8d4, width: 1.2, alpha: Math.max(0, 0.48 * (1 - ripple.age / 1.9)) });
      }
    }
  };

  destroy(): void {
    this.disposed = true;
    if (!this.ready) return;
    const canvas = this.app.canvas;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointercancel', this.onPointerUp);
    canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.app.ticker.remove(this.tick);
    this.nightEffects.clear();
    this.encounterSprites.clear();
    this.music = null;
    this.app.destroy(true, { children: true, texture: false, textureSource: false });
    this.ready = false;
  }
}
