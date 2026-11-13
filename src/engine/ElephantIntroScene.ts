import * as THREE from 'three';
import type { TimeOfDay } from '../content/places';

/**
 * A self-contained, stylised 3D prologue. The painted 2172×724 panoramas are
 * never converted into geometry or downsampled: this is a separate scene.
 * Coordinates are artistic, NOT a navigable/real-world waterway model.
 */
export type IntroBeat = 'orbit' | 'cave' | 'dock' | 'poem';
export type IntroSequence = 'entrance' | 'finale';
export const INTRO_SECONDS = 15.2;

type Callbacks = {
  onBeat: (beat: IntroBeat) => void;
  onComplete: () => void;
  onProgress: (progress: number) => void;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const lerp = THREE.MathUtils.lerp;

function randomSequence(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number, y: number, z: number,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function rockOutline() {
  // Deliberately asymmetric elephant-head/trunk silhouette.
  const points = [
    [-6.8, -0.8], [-6.6, 1.2], [-6.35, 2.8], [-6.55, 4.1],
    [-5.95, 5.8], [-5.2, 6.6], [-4.2, 7.55], [-3.0, 8.15],
    [-1.55, 8.6], [-0.1, 8.35], [1.25, 8.65], [2.8, 7.85],
    [4.1, 7.1], [5.25, 5.5], [5.75, 3.7], [6.15, 2.6],
    [6.25, -0.8],
  ];
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();

  // Water Moon Cave: an actual opening through the extruded rock.
  // The lower portion is under the water plane, so the opening reads as an
  // open arch rising out of the Li River (rather than a black painted oval).
  const hole = new THREE.Path();
  hole.absellipse(-3.42, 1.62, 1.77, 2.11, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

function addMountain(scene: THREE.Scene) {
  const mountain = new THREE.Group();
  scene.add(mountain);
  const stone = new THREE.MeshStandardMaterial({
    color: '#859f96', roughness: 1, flatShading: true, side: THREE.DoubleSide,
  });
  const bodyGeometry = new THREE.ExtrudeGeometry(rockOutline(), {
    depth: 4.4, bevelEnabled: true, bevelThickness: 0.2,
    bevelSize: 0.17, bevelSegments: 2, curveSegments: 48, steps: 1,
  });
  const body = addMesh(mountain, bodyGeometry, stone, 0, 0, -2.2);
  body.receiveShadow = false;

  const random = randomSequence(190);
  const tonalStones = [
    new THREE.MeshStandardMaterial({ color: '#587e72', roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: '#d2c5a4', roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: '#608d85', roughness: 1, flatShading: true }),
  ];
  // Sparse exposed limestone shards. Do not block the water-moon aperture.
  for (let i = 0; i < 64; i++) {
    const x = -6.25 + random() * 12.1;
    const y = 0.55 + random() * 5.6;
    const nearHole = ((x + 3.42) / 2.15) ** 2 + ((y - 1.62) / 2.45) ** 2 < 1;
    if (nearHole || (x < -5.8 && y > 3.5) || (x > 4.5 && y > 4.4)) continue;
    const wedge = addMesh(
      mountain, new THREE.IcosahedronGeometry(0.32 + random() * 0.66, 0),
      tonalStones[i % tonalStones.length], x, y, 2.53 + random() * 0.14,
    );
    wedge.scale.set(0.46 + random() * 0.45, 0.85 + random() * 1.5, 0.16);
    wedge.rotation.z = (random() - 0.5) * 0.7;
  }

  // Restrained green crown; instance reuse keeps mobile draw calls low.
  const leavesGeometry = new THREE.IcosahedronGeometry(1, 1);
  const shades = ['#326956', '#527e61', '#7e9d72'];
  const caps = [5.9, 6.9, 7.75, 8.25, 8.45, 8.1, 8.35, 7.5, 6.7];
  for (let shade = 0; shade < shades.length; shade++) {
    const foliage = new THREE.InstancedMesh(
      leavesGeometry,
      new THREE.MeshStandardMaterial({ color: shades[shade], flatShading: true, roughness: 1 }),
      88,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 88; i++) {
      const x = -5.6 + random() * 11.0;
      const part = Math.min(7, Math.floor(((x + 5.6) / 11) * 8));
      const fraction = ((x + 5.6) / 11) * 8 - part;
      const summit = lerp(caps[part], caps[part + 1], fraction);
      dummy.position.set(x, summit - 0.9 + random() * 1.3, 2.05 + random() * 0.9);
      const radius = 0.19 + random() * 0.36;
      dummy.scale.set(radius * (1.1 + random() * 0.6), radius * (0.8 + random() * 0.7), radius * 0.9);
      dummy.rotation.set(0, random() * 6, 0);
      dummy.updateMatrix();
      foliage.setMatrixAt(i, dummy.matrix);
    }
    foliage.instanceMatrix.needsUpdate = true;
    mountain.add(foliage);
  }

  // Layered limestone bands: the earlier chips were z-fighting INSIDE the
  // front cap, leaving one giant blank slab. These front-facing tapered
  // strokes are embedded into the visible surface, but remain lightweight.
  const veinColors = ['#e6d8b6', '#d1d4b6', '#477f7f', '#699d8d'];
  const veins = veinColors.map((color) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.58, depthWrite: false,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1,
  }));
  for (let i = 0; i < 92; i++) {
    const x = -6.1 + random() * 12.1;
    const section = Math.min(7, Math.floor(((x + 5.6) / 11) * 8));
    const cap = lerp(caps[Math.max(0,section)], caps[Math.max(0,section) + 1], 0.5);
    const y = 0.65 + random() * 7.3;
    const insideHole = ((x + 3.42) / 2.05) ** 2 + ((y - 1.62) / 2.4) ** 2 < 1;
    if (insideHole || y > cap - 0.55) continue;
    const height = 0.65 + random() * 1.85;
    const width = 0.11 + random() * 0.26;
    const shape = new THREE.Shape();
    shape.moveTo(-width * 0.35, -height * 0.5);
    shape.lineTo(width * 0.32, -height * 0.44);
    shape.lineTo(width * 0.55, height * 0.15);
    shape.lineTo(-width * 0.15, height * 0.52);
    shape.closePath();
    const stripe = addMesh(mountain, new THREE.ShapeGeometry(shape),
      veins[i % veins.length], x, y, 2.50 + random() * 0.025);
    stripe.rotation.z = -0.22 + random() * 0.43;
  }
  // No painted-on circular 'eye': the old torus looked like a floating prop.
  return mountain;
}

function addDistance(scene: THREE.Scene) {
  const random = randomSequence(1212);
  const distantPalette = ['#b9cbc0', '#a9c2b8', '#b2c8bb', '#a3b9b2'];
  for (let i = 0; i < 11; i++) {
    const x = -34 + i * 6.7 + random() * 2;
    const tall = 5 + random() * 7;
    const shape = new THREE.Shape();
    shape.moveTo(-3.5, 0);
    shape.bezierCurveTo(-2.8, tall * 0.32, -1.45, tall * 0.96, 0, tall);
    shape.bezierCurveTo(1.3, tall * 0.98, 2.55, tall * 0.35, 3.5, 0);
    shape.closePath();
    addMesh(
      scene, new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false, curveSegments: 9 }),
      new THREE.MeshLambertMaterial({
        color: distantPalette[i % distantPalette.length],
        transparent: true, opacity: 0.46, depthWrite: false,
      }),
      x, -0.08, -26 - random() * 13,
    );
  }
}

function addRiver(scene: THREE.Scene, time: TimeOfDay) {
  const surface = new THREE.PlaneGeometry(240, 240, 1, 1);
  surface.rotateX(-Math.PI / 2);
  const water = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTone: { value: time === 'night' ? 2 : time === 'dusk' ? 1 : 0 },
      uFogColor: { value: new THREE.Color(time === 'night' ? '#263d50' : time === 'dusk' ? '#c5b5a5' : '#bfd7cc') },
    },
    vertexShader: String.raw`
      varying vec3 vPoint;
      varying vec3 vWorld;
      void main() {
        vPoint = position;
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: String.raw`
      uniform float uTime;
      uniform float uTone;
      uniform vec3 uFogColor;
      varying vec3 vPoint;
      varying vec3 vWorld;
      void main() {
        float ripple = sin(vPoint.x * 1.2 + vPoint.z * 0.45 + uTime * 0.8)
                     * sin(vPoint.z * 1.35 - uTime * 0.55);
        float fine = sin(vPoint.z * 2.8 + vPoint.x * 0.8 + uTime * 0.95);
        float light = smoothstep(0.64, 1.0, ripple * 0.25 + fine * 0.15 + 0.70);
        vec3 darkWater = vec3(0.14, 0.39, 0.39);
        vec3 brightWater = vec3(0.36, 0.64, 0.56);
        vec3 color = mix(darkWater, brightWater, light * 0.65);
        color = mix(color, vec3(0.58, 0.46, 0.34), step(0.5, uTone) * (1.0 - step(1.5, uTone)) * 0.27);
        color = mix(color, vec3(0.10, 0.22, 0.29) + light * 0.10, step(1.5, uTone) * 0.78);
        // Blend with distant atmospheric haze before the plane's edge is
        // visible: the old flat rectangular water horizon exposed the set.
        float distanceToEye = length(vWorld - cameraPosition);
        color = mix(color, uFogColor, smoothstep(44.0, 105.0, distanceToEye));
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  addMesh(scene, surface, water, 0, -0.09, 0);
  return water;
}

function addDock(scene: THREE.Scene) {
  const dock = new THREE.Group();
  scene.add(dock);
  const stone = new THREE.MeshStandardMaterial({ color: '#b9ad93', flatShading: true, roughness: 1 });
  const edge = new THREE.MeshStandardMaterial({ color: '#817969', flatShading: true, roughness: 1 });
  // Three gradual steps leading from the water to the bank.
  for (let i = 0; i < 3; i++) {
    const step = addMesh(dock, new THREE.BoxGeometry(1.8, 0.22 + i * 0.24, 2.45),
      stone, 4.6 + i * 0.75, 0.07 + i * 0.12, 10.3);
    step.rotation.y = -0.035;
    addMesh(dock, new THREE.BoxGeometry(1.8, 0.045, 0.16), edge,
      4.6 + i * 0.75, 0.2 + i * 0.24, 11.48);
  }
  const shore = new THREE.Shape();
  shore.moveTo(6.35, 7.9);
  shore.lineTo(8.2, 7.4);
  shore.lineTo(11.7, 7.1);
  shore.lineTo(14.1, 8.4);
  shore.lineTo(14.6, 10.9);
  shore.lineTo(13.2, 13.1);
  shore.lineTo(9.9, 13.7);
  shore.lineTo(6.55, 12.8);
  shore.lineTo(6.35, 7.9);
  const bank = addMesh(dock, new THREE.ExtrudeGeometry(shore, {
    depth: 0.74, steps: 1, bevelEnabled: true,
    bevelThickness: 0.12, bevelSize: 0.32, bevelSegments: 2,
  }), stone, 0, 0.78, 0);
  bank.rotation.x = Math.PI / 2;
  const railing = new THREE.MeshStandardMaterial({ color: '#6e5d43', roughness: 1 });
  for (let i = 0; i < 6; i++) {
    addMesh(dock, new THREE.CylinderGeometry(0.065, 0.08, 1.2, 6),
      railing, 6.45 + i * 0.82, 1.36, 8.4);
  }
  addMesh(dock, new THREE.BoxGeometry(4.3, 0.08, 0.08), railing, 8.5, 1.75, 8.4);

  const rock = new THREE.MeshStandardMaterial({ color: '#9b9b85', roughness: 1, flatShading: true });
  const random = randomSequence(77);
  for (let i = 0; i < 17; i++) {
    const x = 5.7 + random() * 9;
    const z = 7.4 + random() * 6.2;
    const fragment = addMesh(dock, new THREE.IcosahedronGeometry(0.35 + random() * 0.42, 0),
      rock, x, -0.05, z);
    fragment.scale.set(1 + random() * 0.6, 0.32, 0.7 + random() * 0.6);
  }
}

function addBoat(scene: THREE.Scene) {
  const vessel = new THREE.Group();
  scene.add(vessel);
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 2.0);
  hullShape.bezierCurveTo(0.48, 1.8, 0.83, 1.05, 0.78, 0.3);
  hullShape.lineTo(0.72, -1.1);
  hullShape.quadraticCurveTo(0, -2.0, -0.72, -1.1);
  hullShape.lineTo(-0.78, 0.3);
  hullShape.bezierCurveTo(-0.83, 1.05, -0.48, 1.8, 0, 2.0);
  hullShape.closePath();
  const timber = new THREE.MeshStandardMaterial({ color: '#634b38', flatShading: true, roughness: 1 });
  const hull = addMesh(vessel, new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.32, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08,
    bevelSegments: 1, curveSegments: 12,
  }), timber, 0, 0.22, 0);
  hull.rotation.x = Math.PI / 2;
  const plank = new THREE.MeshStandardMaterial({ color: '#b98d62', roughness: 1 });
  for (let i = 0; i < 5; i++) {
    addMesh(vessel, new THREE.BoxGeometry(1.36, 0.055, 0.18),
      plank, 0, 0.28, -1.05 + i * 0.52);
  }
  addMesh(vessel, new THREE.BoxGeometry(1.1, 0.13, 0.38), timber, 0, 0.41, -0.5);
  const mast = addMesh(vessel, new THREE.CylinderGeometry(0.035, 0.04, 2.25, 7),
    plank, -0.45, 1.45, -0.2);
  mast.rotation.z = -0.06;
  // Rolled tan travel awning, without pretending this is a realistic passenger ferry.
  addMesh(vessel, new THREE.CylinderGeometry(0.12, 0.12, 1.35, 8),
    new THREE.MeshStandardMaterial({ color: '#d4bd8d', roughness: 1 }),
    0, 1.14, -0.15).rotation.z = Math.PI / 2;
  return vessel;
}

function addFigure(scene: THREE.Scene, assetRoot: string) {
  const traveler = new THREE.Group();
  scene.add(traveler);
  const fallback = new THREE.Group();
  traveler.add(fallback);
  const clothes = new THREE.MeshStandardMaterial({ color: '#364b62', roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: '#bb8864', roughness: 1 });
  addMesh(fallback, new THREE.CylinderGeometry(0.2, 0.34, 1.25, 7), clothes, 0, 1.00, 0);
  addMesh(fallback, new THREE.SphereGeometry(0.2, 8, 6), skin, 0, 1.77, 0);
  const texture = new THREE.TextureLoader().load(
    assetRoot + 'hero-front.webp',
    () => { fallback.visible = false; },
    undefined,
    () => { fallback.visible = true; },
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  const portrait = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false, alphaTest: 0.04,
  }));
  portrait.center.set(0.5, 0);
  portrait.scale.set(1.18, 2.2, 1);
  traveler.add(portrait);
  return traveler;
}

/**
 * All poses are pure functions of a normalized timeline. This makes seeking
 * backwards just as safe as letting the sequence play forwards.
 */
type CameraStop = {
  progress: number;
  eye: [number, number, number];
  focus: [number, number, number];
  frameWidth: number;
};

const ENTRANCE_CAMERA: readonly CameraStop[] = [
  // Keep cameras on the river-facing side of the rock. A near 90-degree
  // side orbit exposed the 4.4-unit extrusion and the end of the set.
  { progress: 0, eye: [-8.6, 6.7, 25.4], focus: [-2.35, 3, 0], frameWidth: 17.5 },
  { progress: 0.25, eye: [3.6, 6.2, 26], focus: [-2.3, 2.7, 0.5], frameWidth: 17 },
  { progress: 0.49, eye: [4.2, 4.6, 23], focus: [-3.2, 1.6, 0.5], frameWidth: 10.5 },
  { progress: 0.66, eye: [7.8, 5.7, 26], focus: [-0.4, 2.5, 4.5], frameWidth: 17 },
  { progress: 0.87, eye: [9, 5.5, 27], focus: [1.6, 2.2, 5.4], frameWidth: 17 },
  { progress: 1, eye: [6.2, 5.8, 28], focus: [1.8, 2.25, 5.2], frameWidth: 17 },
];

const FINALE_CAMERA: readonly CameraStop[] = [
  { progress: 0, eye: [8.0, 6.3, 29], focus: [-1.6, 2.8, 0], frameWidth: 17.8 },
  { progress: 0.6, eye: [3.5, 5.9, 28], focus: [-2.1, 2.8, 0], frameWidth: 17.8 },
  { progress: 1, eye: [2.7, 5.9, 28], focus: [-2.0, 2.8, 0], frameWidth: 17.8 },
];

function interpolateCamera(stops: readonly CameraStop[], progress: number) {
  const index = Math.max(0, stops.findIndex((_, i) =>
    i < stops.length - 1 && progress <= stops[i + 1].progress));
  const start = stops[index];
  const end = stops[Math.min(stops.length - 1, index + 1)];
  const alpha = smooth((progress - start.progress) / Math.max(0.0001, end.progress - start.progress));
  return {
    eye: new THREE.Vector3(...start.eye).lerp(new THREE.Vector3(...end.eye), alpha),
    focus: new THREE.Vector3(...start.focus).lerp(new THREE.Vector3(...end.focus), alpha),
    frameWidth: lerp(start.frameWidth, end.frameWidth, alpha),
  };
}

export class ElephantIntroScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(33, 1, 0.45, 180);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly boat: THREE.Group;
  private readonly figure: THREE.Group;
  private readonly water: THREE.ShaderMaterial;
  private readonly route: THREE.CatmullRomCurve3;
  private readonly callbacks: Callbacks;
  private readonly sequence: IntroSequence;
  private readonly reducedMotion: boolean;
  private readonly container: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly durationMs: number;
  private frame = 0;
  private elapsedMs = 0;
  private lastNow: number | null = null;
  private lastReport = -1;
  private playing = true;
  private lastBeat: IntroBeat | null = null;
  private disposed = false;
  private finished = false;

  constructor(container: HTMLElement, artRoot: string, time: TimeOfDay, sequence: IntroSequence, callbacks: Callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.sequence = sequence;
    this.durationMs = (sequence === 'finale' ? 9 : INTRO_SECONDS) * 1000;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.innerWidth < 720;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !small, alpha: false, powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.35 : 1.8));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.className = 'elephant-canvas';
    container.appendChild(this.renderer.domElement);
    const night = time === 'night';
    const dusk = time === 'dusk';
    this.scene.background = new THREE.Color(night ? '#203746' : dusk ? '#dec5a8' : '#dae6da');
    this.scene.fog = new THREE.Fog(night ? '#263d50' : dusk ? '#c5b5a5' : '#bfd7cc', 35, 112);
    this.scene.add(new THREE.HemisphereLight(night ? '#8da6ca' : '#fff8e4', '#738d82', night ? 0.85 : 1.35));
    const light = new THREE.DirectionalLight(night ? '#b6c8e5' : dusk ? '#f8c88d' : '#fff0cb', night ? 0.75 : dusk ? 1.4 : 1.6);
    light.position.set(-12, 18, 16);
    this.scene.add(light);
    addDistance(this.scene);
    addMountain(this.scene);
    this.water = addRiver(this.scene, time);
    if (night) {
      addMesh(this.scene, new THREE.SphereGeometry(1.55, 20, 12),
        new THREE.MeshBasicMaterial({ color: '#f7e8bf', fog: false }), -18, 15, -42);
      const stars = new Float32Array(105 * 3);
      const rng = randomSequence(889);
      for (let i = 0; i < stars.length; i += 3) {
        stars[i] = (rng() - 0.5) * 115;
        stars[i + 1] = 10 + rng() * 29;
        stars[i + 2] = -35 - rng() * 35;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
      this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
        color: '#f8e4bc', size: 0.15, transparent: true, opacity: 0.7, depthWrite: false,
      })));
      const lantern = addMesh(this.scene, new THREE.SphereGeometry(0.18, 10, 8),
        new THREE.MeshBasicMaterial({ color: '#ffd18b' }), 5.5, 2.0, 9.15);
      lantern.add(new THREE.PointLight('#e9a45b', 3, 8, 2));
    }
    addDock(this.scene);
    this.boat = addBoat(this.scene);
    this.figure = addFigure(this.scene, artRoot);
    this.route = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.4, 0.17, -10),
      new THREE.Vector3(-3.4, 0.17, -5),
      new THREE.Vector3(-3.4, 0.17, 0),
      new THREE.Vector3(-3.35, 0.17, 3.5),
      new THREE.Vector3(-2.4, 0.17, 6.6),
      new THREE.Vector3(0, 0.17, 9.1),
      new THREE.Vector3(3.1, 0.17, 10),
    ], false, 'centripetal');

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    if (this.reducedMotion) {
      // A held title card, rather than a moving camera, for finale.
      this.elapsedMs = this.sequence === 'finale' ? this.durationMs : 0;
      this.playing = false;
    }
    this.renderAt(this.getProgress());
    this.frame = requestAnimationFrame(this.animate);
  }

  getProgress() {
    return clamp01(this.elapsedMs / this.durationMs);
  }

  getPlaying() {
    return this.playing;
  }

  setPlaying(value: boolean) {
    if (this.disposed || this.reducedMotion) return;
    if (value && this.elapsedMs >= this.durationMs) {
      this.elapsedMs = 0;
      this.finished = false;
    }
    this.playing = value;
    this.lastNow = null;
    this.renderAt(this.getProgress());
  }

  /** Called for pointer, touch and keyboard scrubbing; never advances a frame. */
  seek(progress: number) {
    if (this.disposed) return;
    this.elapsedMs = clamp01(Number.isFinite(progress) ? progress : 0) * this.durationMs;
    if (this.elapsedMs >= this.durationMs) this.playing = false;
    this.lastNow = null;
    this.renderAt(this.getProgress(), true);
  }

  private resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    // Fixed cinematic lens, even in portrait. Fit by moving the camera back,
    // never by widening to 58 degrees and revealing the stage edge.
    this.camera.fov = width < height ? 34 : 33;
    this.camera.updateProjectionMatrix();
    const narrow = width < 720;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.3 : 1.8));
    this.renderer.setSize(width, height, false);
    this.renderAt(this.getProgress(), true);
  }

  private frameCamera(progress: number) {
    const stops = this.sequence === 'finale' ? FINALE_CAMERA : ENTRANCE_CAMERA;
    const { eye, focus, frameWidth } = interpolateCamera(stops, progress);
    const angle = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
    const neededForWidth = (frameWidth * 1.05) / (2 * Math.tan(angle) * this.camera.aspect);
    const distance = Math.max(22, eye.distanceTo(focus), neededForWidth);
    this.camera.position.copy(focus).add(eye.sub(focus).normalize().multiplyScalar(distance));
    this.camera.lookAt(focus);
  }

  private renderAt(progress: number, forceReport = false) {
    if (this.disposed) return;
    const p = clamp01(progress);
    const beat: IntroBeat = this.sequence === 'finale'
      ? (p < 0.58 ? 'orbit' : 'poem')
      : p < 0.27 ? 'orbit' : p < 0.58 ? 'cave' : p < 0.85 ? 'dock' : 'poem';

    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      this.callbacks.onBeat(beat);
    }
    if (forceReport || Math.abs(p - this.lastReport) > 0.012 || p === 1) {
      this.lastReport = p;
      this.callbacks.onProgress(p);
    }
    this.frameCamera(p);

    const t = this.elapsedMs / 1000;
    const travel = smooth((p - 0.13) / 0.65);
    const along = Math.max(0.001, Math.min(0.999, travel));
    const pos = this.route.getPoint(along);
    const tangent = this.route.getTangent(along);
    this.boat.visible = p > 0.13;
    this.boat.position.copy(pos);
    this.boat.position.y += Math.sin(t * 2.7) * 0.022;
    this.boat.rotation.set(
      Math.sin(t * 2.1) * 0.014,
      Math.atan2(tangent.x, tangent.z),
      Math.sin(t * 2.5) * 0.015,
    );

    const stepOffBoat = smooth((p - 0.83) / 0.055);
    const stepUpOne = smooth((p - 0.885) / 0.052);
    const stepUpTwo = smooth((p - 0.937) / 0.055);
    const aboard = new THREE.Vector3(pos.x, pos.y + 0.28, pos.z - 0.35);
    this.figure.position.copy(aboard)
      .lerp(new THREE.Vector3(4.28, 0.22, 10.08), stepOffBoat)
      .lerp(new THREE.Vector3(5.31, 0.46, 10.23), stepUpOne)
      .lerp(new THREE.Vector3(6.17, 0.71, 10.35), stepUpTwo);
    this.figure.position.y += Math.sin(t * 4) * 0.012 * (1 - stepOffBoat);
    this.figure.visible = p > 0.28;
    const portrait = this.figure.children.find((child): child is THREE.Sprite => child instanceof THREE.Sprite);
    if (portrait) portrait.material.opacity = clamp01((p - 0.28) * 14);

    if (this.sequence === 'finale') {
      this.boat.visible = true;
      this.boat.position.set(3.1, 0.19, 10);
      this.boat.rotation.set(0, 0.68, 0);
      this.figure.position.set(6.17, 0.71, 10.35);
      this.figure.visible = true;
      if (portrait) portrait.material.opacity = 1;
    }

    this.water.uniforms.uTime.value = this.reducedMotion ? 0 : t;
    this.renderer.render(this.scene, this.camera);
  }

  private animate = (now: number) => {
    if (this.disposed) return;
    const delta = this.lastNow === null ? 0 : Math.max(0, Math.min(90, now - this.lastNow));
    this.lastNow = now;
    if (this.playing && !this.reducedMotion) {
      this.elapsedMs = Math.min(this.durationMs, this.elapsedMs + delta);
      this.renderAt(this.getProgress());
      if (this.elapsedMs >= this.durationMs) {
        this.playing = false;
        if (this.sequence === 'entrance' && !this.finished) {
          this.finished = true;
          this.callbacks.onComplete();
        }
      }
    }
    this.frame = requestAnimationFrame(this.animate);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Points) {
        object.geometry.dispose();
        object.material.dispose();
      } else if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
        object.geometry.dispose();
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        mats.forEach((material) => material.dispose());
      } else if (object instanceof THREE.Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
