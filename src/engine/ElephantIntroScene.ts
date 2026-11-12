import * as THREE from 'three';

/**
 * A self-contained, stylised 3D prologue. The painted 2172×724 panoramas are
 * never converted into geometry or downsampled: this is a separate scene.
 * Coordinates are artistic, NOT a navigable/real-world waterway model.
 */
export type IntroBeat = 'orbit' | 'cave' | 'dock' | 'poem';
export const INTRO_SECONDS = 15.2;

type Callbacks = {
  onBeat: (beat: IntroBeat) => void;
  onComplete: () => void;
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
    color: '#a8b29e', roughness: 1, flatShading: true, side: THREE.DoubleSide,
  });
  const bodyGeometry = new THREE.ExtrudeGeometry(rockOutline(), {
    depth: 4.4, bevelEnabled: true, bevelThickness: 0.2,
    bevelSize: 0.17, bevelSegments: 2, curveSegments: 48, steps: 1,
  });
  const body = addMesh(mountain, bodyGeometry, stone, 0, 0, -2.2);
  body.receiveShadow = false;

  const random = randomSequence(190);
  const tonalStones = [
    new THREE.MeshStandardMaterial({ color: '#879687', roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: '#c1bda4', roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: '#788d83', roughness: 1, flatShading: true }),
  ];
  // Sparse exposed limestone shards. Do not block the water-moon aperture.
  for (let i = 0; i < 34; i++) {
    const x = -6.25 + random() * 12.1;
    const y = 0.55 + random() * 5.6;
    const nearHole = ((x + 3.42) / 2.15) ** 2 + ((y - 1.62) / 2.45) ** 2 < 1;
    if (nearHole || (x < -5.8 && y > 3.5) || (x > 4.5 && y > 4.4)) continue;
    const wedge = addMesh(
      mountain, new THREE.IcosahedronGeometry(0.28 + random() * 0.45, 0),
      tonalStones[i % tonalStones.length], x, y, 2.05 + random() * 0.14,
    );
    wedge.scale.set(0.65 + random(), 0.3 + random() * 0.9, 0.12);
    wedge.rotation.z = (random() - 0.5) * 0.7;
  }

  // Restrained green crown; instance reuse keeps mobile draw calls low.
  const leavesGeometry = new THREE.IcosahedronGeometry(1, 1);
  const shades = ['#506e55', '#67835e', '#78966e'];
  const caps = [5.9, 6.9, 7.75, 8.25, 8.45, 8.1, 8.35, 7.5, 6.7];
  for (let shade = 0; shade < shades.length; shade++) {
    const foliage = new THREE.InstancedMesh(
      leavesGeometry,
      new THREE.MeshStandardMaterial({ color: shades[shade], flatShading: true, roughness: 1 }),
      30,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 30; i++) {
      const x = -5.6 + random() * 11.0;
      const part = Math.min(7, Math.floor(((x + 5.6) / 11) * 8));
      const fraction = ((x + 5.6) / 11) * 8 - part;
      const summit = lerp(caps[part], caps[part + 1], fraction);
      dummy.position.set(x, summit - 0.22 + random() * 0.75, -2.15 + random() * 4.45);
      const radius = 0.37 + random() * 0.63;
      dummy.scale.set(radius * 1.15, radius * (0.75 + random() * 0.4), radius);
      dummy.rotation.set(0, random() * 6, 0);
      dummy.updateMatrix();
      foliage.setMatrixAt(i, dummy.matrix);
    }
    foliage.instanceMatrix.needsUpdate = true;
    mountain.add(foliage);
  }

  // Thin eye-rock trace (symbolic), kept distinct from Shuiyue Cave.
  const eyeStone = addMesh(
    mountain, new THREE.TorusGeometry(0.47, 0.08, 6, 18),
    tonalStones[0], 0.85, 5.35, 2.18,
  );
  eyeStone.scale.y = 0.45;
  eyeStone.rotation.z = -0.2;
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

function addRiver(scene: THREE.Scene) {
  const surface = new THREE.PlaneGeometry(180, 180, 1, 1);
  surface.rotateX(-Math.PI / 2);
  const water = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: String.raw`
      varying vec3 vPoint;
      void main() {
        vPoint = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: String.raw`
      uniform float uTime;
      varying vec3 vPoint;
      void main() {
        float ripple = sin(vPoint.x * 1.2 + vPoint.z * 0.45 + uTime * 0.8)
                     * sin(vPoint.z * 1.35 - uTime * 0.55);
        float fine = sin(vPoint.z * 7.0 + vPoint.x * 2.6 + uTime * 1.9);
        float light = smoothstep(0.64, 1.0, ripple * 0.25 + fine * 0.15 + 0.70);
        vec3 darkWater = vec3(0.34, 0.52, 0.47);
        vec3 brightWater = vec3(0.63, 0.74, 0.65);
        vec3 color = mix(darkWater, brightWater, light * 0.65);
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
  addMesh(dock, new THREE.BoxGeometry(5.4, 0.7, 4.2), stone, 8.6, 0.52, 10.3);
  const railing = new THREE.MeshStandardMaterial({ color: '#6e5d43', roughness: 1 });
  for (let i = 0; i < 6; i++) {
    addMesh(dock, new THREE.CylinderGeometry(0.065, 0.08, 1.2, 6),
      railing, 6.45 + i * 0.82, 1.36, 8.4);
  }
  addMesh(dock, new THREE.BoxGeometry(4.3, 0.08, 0.08), railing, 8.5, 1.75, 8.4);

  const rock = new THREE.MeshStandardMaterial({ color: '#9b9b85', roughness: 1, flatShading: true });
  const random = randomSequence(77);
  for (let i = 0; i < 17; i++) {
    const x = 5.8 + random() * 9.6;
    const z = 7.8 + random() * 8.5;
    const fragment = addMesh(dock, new THREE.IcosahedronGeometry(0.35 + random() * 0.42, 0),
      rock, x, -0.05, z);
    fragment.scale.y = 0.48;
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

export class ElephantIntroScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly boat: THREE.Group;
  private readonly figure: THREE.Group;
  private readonly water: THREE.ShaderMaterial;
  private readonly route: THREE.CatmullRomCurve3;
  private readonly callbacks: Callbacks;
  private readonly container: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly start = performance.now();
  private frame = 0;
  private lastBeat: IntroBeat | null = null;
  private disposed = false;
  private finished = false;

  constructor(container: HTMLElement, artRoot: string, callbacks: Callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    const small = window.innerWidth < 720;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !small, alpha: false, powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.35 : 1.8));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.className = 'elephant-canvas';
    container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color('#dfdec9');
    this.scene.fog = new THREE.Fog('#c6d1c6', 25, 78);
    this.scene.add(new THREE.HemisphereLight('#fff8e4', '#738d82', 2.0));
    const light = new THREE.DirectionalLight('#fff0cb', 2.4);
    light.position.set(-12, 18, 16);
    this.scene.add(light);
    addDistance(this.scene);
    addMountain(this.scene);
    this.water = addRiver(this.scene);
    addDock(this.scene);
    this.boat = addBoat(this.scene);
    this.figure = addFigure(this.scene, artRoot);
    this.route = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.4, 0.17, -10),
      new THREE.Vector3(-3.4, 0.17, -5),
      new THREE.Vector3(-3.4, 0.17, 0),
      new THREE.Vector3(-3.35, 0.17, 3.5),
      new THREE.Vector3(-2.4, 0.17, 6.6),
      new THREE.Vector3(0.0, 0.17, 9.1),
      new THREE.Vector3(3.1, 0.17, 10.0),
    ], false, 'centripetal');
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.frame = requestAnimationFrame(this.animate);
  }

  private resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    // Wider framing on narrow devices, rather than cropping away the cave.
    this.camera.fov = width < height ? 58 : 42;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private animate = (now: number) => {
    if (this.disposed) return;
    const p = clamp01((now - this.start) / (INTRO_SECONDS * 1000));
    const beat: IntroBeat = p < 0.27 ? 'orbit' : p < 0.58 ? 'cave' : p < 0.85 ? 'dock' : 'poem';
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      this.callbacks.onBeat(beat);
    }

    // 1. Establish the silhouette with an intentional, wide clockwise orbit.
    const orbit = smooth(p / 0.3);
    const theta = lerp(-1.55, 0.17, orbit);
    const orbitEye = new THREE.Vector3(
      Math.sin(theta) * 21, lerp(7.8, 5.45, orbit), Math.cos(theta) * 21,
    );
    const caveEye = new THREE.Vector3(3.3, 5.3, 19);
    const dockEye = new THREE.Vector3(10.8, 5.2, 17.2);
    const caveToDock = smooth((p - 0.57) / 0.27);
    const fromOrbit = smooth((p - 0.25) / 0.12);
    this.camera.position.copy(orbitEye).lerp(caveEye, fromOrbit).lerp(dockEye, caveToDock);

    const look = new THREE.Vector3(-0.8, 2.8, 0);
    look.lerp(new THREE.Vector3(-2.5, 2.1, 0.5), fromOrbit);
    look.lerp(new THREE.Vector3(2.5, 1.45, 6.7), caveToDock);
    if (p > 0.84) {
      const settle = smooth((p - 0.84) / 0.13);
      this.camera.position.lerp(new THREE.Vector3(8.5, 4.45, 14), settle);
      look.lerp(new THREE.Vector3(3.4, 1.45, 9), settle);
    }
    this.camera.lookAt(look);

    // 2. The boat is visible behind the arch, crosses its real opening,
    // and follows an easing curve to the pier.
    const travel = smooth((p - 0.24) / 0.55);
    const pos = this.route.getPoint(Math.max(0.001, Math.min(0.999, travel)));
    const tangent = this.route.getTangent(Math.max(0.001, Math.min(0.999, travel)));
    this.boat.position.copy(pos);
    this.boat.position.y += Math.sin(now * 0.0027) * 0.035;
    this.boat.rotation.set(
      Math.sin(now * 0.0021) * 0.018,
      Math.atan2(tangent.x, tangent.z),
      Math.sin(now * 0.0025) * 0.028,
    );

    // 3. A traveler steps from the boat onto the waterside stairs.
    const disembark = smooth((p - 0.79) / 0.12);
    const aboard = new THREE.Vector3(pos.x, pos.y + 0.34, pos.z - 0.35);
    const ashore = new THREE.Vector3(5.55, 0.70, 10.35);
    this.figure.position.copy(aboard).lerp(ashore, disembark);
    this.figure.position.y += Math.sin(now * 0.004) * 0.025 * (1 - disembark);
    this.figure.visible = p > 0.34;
    const portrait = this.figure.children.find((child): child is THREE.Sprite => child instanceof THREE.Sprite);
    if (portrait) portrait.material.opacity = Math.min(1, (p - 0.34) * 14);
    this.water.uniforms.uTime.value = now / 1000;
    this.renderer.render(this.scene, this.camera);

    if (p >= 1) {
      if (!this.finished) {
        this.finished = true;
        this.callbacks.onComplete();
      }
      return;
    }
    this.frame = requestAnimationFrame(this.animate);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
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
