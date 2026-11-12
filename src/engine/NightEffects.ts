import { Graphics } from 'pixi.js';
import type { NightView } from '../content/encounters';

export type NightControls = {
  view: NightView;
  lights: boolean;
  rhythm: boolean;
  drones: boolean;
};

type Lamp = { x: number; y: number };
/**
 * Lightweight overlay PREVIEW. Does not recolor or alter the original painting.
 * Future audio graph may call setAudioEnergy(0..1) with FFT/beat envelope.
 */
export class NightEffects {
  readonly graphics = new Graphics();
  private lampProgress = 0;
  private externalEnergy = 0;
  private elapsed = 0;

  private readonly lamps: readonly Lamp[] = [
    { x: 740, y: 333 }, { x: 818, y: 358 }, { x: 910, y: 369 },
    { x: 1124, y: 367 }, { x: 1330, y: 380 }, { x: 1608, y: 398 },
    { x: 1772, y: 399 }, { x: 1951, y: 413 },
  ];

  setAudioEnergy(value: number): void {
    this.externalEnergy = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  }

  draw(deltaSeconds: number, night: boolean, controls: NightControls, reducedMotion: boolean): void {
    this.elapsed += deltaSeconds;
    this.graphics.clear();
    if (!night) {
      this.lampProgress = 0;
      return;
    }
    this.lampProgress = controls.lights
      ? Math.min(this.lamps.length, this.lampProgress + (reducedMotion ? 120 : 1.9) * deltaSeconds)
      : Math.max(0, this.lampProgress - 5 * deltaSeconds);

    const litCount = Math.floor(this.lampProgress);
    for (let i = 0; i < this.lamps.length; i += 1) {
      if (i >= litCount) continue;
      const lamp = this.lamps[i];
      // Small, restrained light accents: the actual painted lamps are already in scene-night.webp.
      this.graphics.circle(lamp.x, lamp.y, 15).fill({ color: 0xffd69b, alpha: 0.045 });
      this.graphics.circle(lamp.x, lamp.y, 4).fill({ color: 0xffefb8, alpha: 0.46 });
    }

    if (controls.lights && litCount > 0) {
      const previewBeat = controls.rhythm && !reducedMotion
        ? Math.pow(Math.max(0, Math.sin(this.elapsed * 3.1)), 4)
        : 0;
      const beatEnergy = Math.max(previewBeat, this.externalEnergy);
      for (let i = 0; i < litCount; i += 1) {
        const lamp = this.lamps[i];
        const reflectX = lamp.x + (i % 2 ? 8 : -10);
        const waterY = Math.max(476, lamp.y + 122);
        for (let n = 0; n < 3; n += 1) {
          const xDrift = reducedMotion ? 0 : Math.sin(this.elapsed * (1.1 + n * 0.4) + i) * 4;
          const spread = 9 + n * 9 + beatEnergy * (3 + n * 3);
          this.graphics.ellipse(reflectX + xDrift, waterY + n * 11, spread, 2.3)
            .fill({ color: 0xffdca1, alpha: 0.055 + beatEnergy * 0.085 });
        }
      }
    }

    if (controls.drones) {
      // Abstract mountain-shaped dots, conceptual sequence only; NOT a real drone-show record.
      const float = reducedMotion ? 0 : Math.sin(this.elapsed * 0.7) * 5;
      for (let i = 0; i < 59; i += 1) {
        const fraction = i / 58;
        const peak = Math.pow(Math.sin(Math.PI * fraction * 3), 2);
        const x = 1465 + fraction * 410;
        const y = 216 - peak * 92 + float;
        const gleam = reducedMotion ? 0.72 : 0.55 + 0.26 * Math.sin(this.elapsed * 1.5 + i * 0.28);
        this.graphics.circle(x, y, 1.9).fill({ color: i % 3 === 0 ? 0xbfe5e6 : 0xffeac1, alpha: gleam });
      }
    }
  }

  clear(): void {
    this.graphics.clear();
    this.lampProgress = 0;
    this.externalEnergy = 0;
  }
}
