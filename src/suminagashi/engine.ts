import * as THREE from "three";

export type InkKey = "cycle" | "sumi" | "ai" | "shu" | "matsuba";

export type SuminagashiApi = {
  setInkMode: (mode: InkKey) => void;
  setAuto: (on: boolean) => void;
  wash: () => void;
  hideHint: () => void;
  setPaused: (paused: boolean) => void;
  captureFrame: () => HTMLCanvasElement | null;
  dispose: () => void;
};

const config = {
  SIM_RES: 256,
  DYE_RES: 1280,
  PRESSURE_ITER: 28,
  VEL_DISSIPATION: 0.16,
  DYE_DISSIPATION: 0.1, // fade a touch faster so it stays airy
  CURL: 14,
  SPLAT_RADIUS: 0.00135, // thinner strokes
  SPLAT_FORCE: 5200,
};

type DoubleFBO = {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;
  texel: THREE.Vector2;
  swap: () => void;
  resize: (nw: number, nh: number) => void;
};

/**
 * Port of the reference Suminagashi GPU fluid sim (Three.js Stable Fluids).
 */
export function createSuminagashi(
  container: HTMLElement,
  opts?: { onFirstInteract?: () => void },
): SuminagashiApi {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const INKS: Record<string, THREE.Color> = {
    sumi: new THREE.Color("#3a3a42"),
    ai: new THREE.Color("#2a5a8f"),
    shu: new THREE.Color("#d45a4e"),
    matsuba: new THREE.Color("#4a8568"),
  };
  const INK_KEYS = Object.keys(INKS);
  const PAPER = new THREE.Color("#f5f1e8");

  function inkAbsorption(c: THREE.Color, strength: number) {
    const e = 0.012;
    return new THREE.Vector3(
      -Math.log(Math.max(c.r, e)) * strength,
      -Math.log(Math.max(c.g, e)) * strength,
      -Math.log(Math.max(c.b, e)) * strength,
    );
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
  });
  renderer.setSize(container.clientWidth || innerWidth, container.clientHeight || innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.autoClear = false;
  container.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  scene.add(quad);

  function makeRT(w: number, h: number) {
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
    });
  }

  function makeDoubleFBO(w: number, h: number): DoubleFBO {
    return {
      read: makeRT(w, h),
      write: makeRT(w, h),
      texel: new THREE.Vector2(1 / w, 1 / h),
      swap() {
        const t = this.read;
        this.read = this.write;
        this.write = t;
      },
      resize(nw, nh) {
        this.read.setSize(nw, nh);
        this.write.setSize(nw, nh);
        this.texel.set(1 / nw, 1 / nh);
      },
    };
  }

  function simSizes() {
    const w = container.clientWidth || innerWidth;
    const h = container.clientHeight || innerHeight;
    const aspect = w / h;
    const sim = config.SIM_RES;
    const dye = Math.min(config.DYE_RES, Math.max(w, h));
    return aspect >= 1
      ? { sw: Math.round(sim * aspect), sh: sim, dw: dye, dh: Math.round(dye / aspect) }
      : { sw: sim, sh: Math.round(sim / aspect), dw: Math.round(dye * aspect), dh: dye };
  }

  let S = simSizes();
  const velocity = makeDoubleFBO(S.sw, S.sh);
  const dye = makeDoubleFBO(S.dw, S.dh);
  const pressure = makeDoubleFBO(S.sw, S.sh);
  const curlRT = makeRT(S.sw, S.sh);
  const divergeRT = makeRT(S.sw, S.sh);

  const VERT = /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `;

  function prog(frag: string, uniforms: Record<string, THREE.IUniform>) {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: frag,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
  }

  const advectMat = prog(
    /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVelocity, uSource;
    uniform vec2 uTexel;
    uniform float uDt, uDissipation;
    void main(){
      vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexel;
      vec4 result = texture2D(uSource, coord);
      gl_FragColor = result / (1.0 + uDissipation * uDt);
    }
  `,
    {
      uVelocity: { value: null },
      uSource: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uDt: { value: 0 },
      uDissipation: { value: 0 },
    },
  );

  const splatMat = prog(
    /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float uAspect, uRadius;
    uniform vec2 uPoint;
    uniform vec3 uColor;
    void main(){
      vec2 p = vUv - uPoint;
      p.x *= uAspect;
      vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
      gl_FragColor = vec4(texture2D(uTarget, vUv).rgb + splat, 1.0);
    }
  `,
    {
      uTarget: { value: null },
      uAspect: { value: 1 },
      uRadius: { value: 0.001 },
      uPoint: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Vector3() },
    },
  );

  const curlMat = prog(
    /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform vec2 uTexel;
    void main(){
      float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
      float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
      float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
      float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }
  `,
    { uVelocity: { value: null }, uTexel: { value: new THREE.Vector2() } },
  );

  const vorticityMat = prog(
    /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVelocity, uCurl;
    uniform vec2 uTexel;
    uniform float uCurlStrength, uDt;
    void main(){
      float L = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
      float R = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
      float B = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
      float T = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= uCurlStrength * C;
      force.y *= -1.0;
      vec2 vel = texture2D(uVelocity, vUv).xy + force * uDt;
      gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
    }
  `,
    {
      uVelocity: { value: null },
      uCurl: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uCurlStrength: { value: 0 },
      uDt: { value: 0 },
    },
  );

  const divergeMat = prog(
    /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform vec2 uTexel;
    void main(){
      float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
      float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
      float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
      float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vUv.x - uTexel.x < 0.0) L = -C.x;
      if (vUv.x + uTexel.x > 1.0) R = -C.x;
      if (vUv.y - uTexel.y < 0.0) B = -C.y;
      if (vUv.y + uTexel.y > 1.0) T = -C.y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }
  `,
    { uVelocity: { value: null }, uTexel: { value: new THREE.Vector2() } },
  );

  const pressureMat = prog(
    /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uPressure, uDivergence;
    uniform vec2 uTexel;
    void main(){
      float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
      float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
      float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
      float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
      float div = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
    }
  `,
    {
      uPressure: { value: null },
      uDivergence: { value: null },
      uTexel: { value: new THREE.Vector2() },
    },
  );

  const gradientMat = prog(
    /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uPressure, uVelocity;
    uniform vec2 uTexel;
    void main(){
      float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
      float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
      float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
      float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
      vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(vel, 0.0, 1.0);
    }
  `,
    {
      uPressure: { value: null },
      uVelocity: { value: null },
      uTexel: { value: new THREE.Vector2() },
    },
  );

  const clearMat = prog(
    /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uValue;
    void main(){ gl_FragColor = uValue * texture2D(uTexture, vUv); }
  `,
    { uTexture: { value: null }, uValue: { value: 0.8 } },
  );

  const displayMat = prog(
    /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uDye;
    uniform vec2 uTexel;
    uniform vec3 uPaper;
    uniform float uTime;

    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }

    void main(){
      float fiber = noise(vUv * 420.0) * 0.018
                  + noise(vUv * 180.0) * 0.014
                  + noise(vUv * 60.0)  * 0.01;
      // Soften absorption so ink stays translucent, not muddy
      vec3 A = texture2D(uDye, vUv).rgb * 0.62;
      vec3 col = uPaper * exp(-A) + fiber;
      vec2 uv2 = vUv * (1.0 - vUv.yx);
      float vign = pow(uv2.x * uv2.y * 15.0, 0.18);
      col *= 0.96 + 0.04 * vign;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
    {
      uDye: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uPaper: { value: new THREE.Vector3(PAPER.r, PAPER.g, PAPER.b) },
      uTime: { value: 0 },
    },
  );

  function blit(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
  }

  function aspect() {
    const w = container.clientWidth || innerWidth;
    const h = container.clientHeight || innerHeight;
    return w / h;
  }

  function splatVelocity(x: number, y: number, fx: number, fy: number, radiusMul?: number) {
    splatMat.uniforms.uTarget.value = velocity.read.texture;
    splatMat.uniforms.uAspect.value = aspect();
    splatMat.uniforms.uPoint.value.set(x, y);
    splatMat.uniforms.uRadius.value = config.SPLAT_RADIUS * (radiusMul || 1);
    splatMat.uniforms.uColor.value.set(fx, fy, 0);
    blit(splatMat, velocity.write);
    velocity.swap();
  }

  function splatDye(x: number, y: number, absorption: THREE.Vector3, radiusMul?: number) {
    splatMat.uniforms.uTarget.value = dye.read.texture;
    splatMat.uniforms.uAspect.value = aspect();
    splatMat.uniforms.uPoint.value.set(x, y);
    splatMat.uniforms.uRadius.value = config.SPLAT_RADIUS * (radiusMul || 1);
    splatMat.uniforms.uColor.value.copy(absorption);
    blit(splatMat, dye.write);
    dye.swap();
  }

  function dropInk(x: number, y: number, color: THREE.Color, strength: number) {
    const abs = inkAbsorption(color, strength * 0.12);
    splatDye(x, y, abs, 0.72);
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 80;
    splatVelocity(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 1.2);
  }

  let inkMode: InkKey = "cycle";
  let inkCycleIdx = 0;
  function currentInkColor(advance: boolean) {
    if (inkMode === "cycle") {
      const c = INKS[INK_KEYS[inkCycleIdx % INK_KEYS.length]];
      if (advance) inkCycleIdx++;
      return c;
    }
    return INKS[inkMode] || INKS.sumi;
  }

  const pointer = {
    down: false,
    moved: false,
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    color: INKS.sumi,
  };
  let lastInteraction = 0;

  function toUV(e: PointerEvent) {
    const r = renderer.domElement.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: 1 - (e.clientY - r.top) / r.height,
    };
  }

  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.cursor = "crosshair";
  canvas.style.touchAction = "none";

  const onPointerDown = (e: PointerEvent) => {
    const p = toUV(e);
    pointer.down = true;
    pointer.x = pointer.px = p.x;
    pointer.y = pointer.py = p.y;
    pointer.color = currentInkColor(true);
    dropInk(p.x, p.y, pointer.color, 0.6 + Math.random() * 0.3);
    lastInteraction = performance.now();
    opts?.onFirstInteract?.();
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = toUV(e);
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.moved = true;
    lastInteraction = performance.now();
  };
  const onPointerUp = () => {
    pointer.down = false;
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  addEventListener("pointerup", onPointerUp);
  addEventListener("pointercancel", onPointerUp);

  function applyPointer() {
    if (!pointer.moved) return;
    pointer.moved = false;
    const dx = pointer.x - pointer.px;
    const dy = pointer.y - pointer.py;
    if (Math.abs(dx) + Math.abs(dy) < 1e-6) return;
    const fx = dx * config.SPLAT_FORCE;
    const fy = dy * config.SPLAT_FORCE;
    splatVelocity(pointer.x, pointer.y, fx, fy, pointer.down ? 2.0 : 1.4);
    if (pointer.down) {
      const speed = Math.min(Math.hypot(dx, dy) * 30, 1);
      splatDye(
        pointer.x,
        pointer.y,
        inkAbsorption(pointer.color, 0.03 + speed * 0.06),
        0.55,
      );
    }
  }

  let autoFlow = true;
  let nextDrop = 1200;
  let nextStir = 2600;
  const pendingTimeouts: number[] = [];

  function autoUpdate(now: number, dt: number) {
    if (!autoFlow) return;
    const idle = now - lastInteraction > 3000;

    nextDrop -= dt * 1000;
    if (idle && nextDrop <= 0) {
      const x = 0.14 + Math.random() * 0.72;
      const y = 0.16 + Math.random() * 0.68;
      const c = INKS[INK_KEYS[Math.floor(Math.random() * INK_KEYS.length)]];
      dropInk(x, y, c, 0.8 + Math.random() * 0.7);

      if (Math.random() < 0.3) {
        const c2 = INKS[INK_KEYS[Math.floor(Math.random() * INK_KEYS.length)]];
        const x2 = Math.min(Math.max(x + (Math.random() - 0.5) * 0.16, 0.08), 0.92);
        const y2 = Math.min(Math.max(y + (Math.random() - 0.5) * 0.16, 0.08), 0.92);
        pendingTimeouts.push(
          window.setTimeout(
            () => dropInk(x2, y2, c2, 0.5 + Math.random() * 0.4),
            220 + Math.random() * 300,
          ),
        );
      }
      nextDrop = (reducedMotion ? 6500 : 2600) + Math.random() * 2600;
    }

    nextStir -= dt * 1000;
    if (!reducedMotion && nextStir <= 0) {
      const t = now * 0.00012;
      const cx = 0.5 + Math.sin(t * 1.7) * 0.3;
      const cy = 0.5 + Math.cos(t * 1.1) * 0.3;
      const a = t * 6.0 + Math.random() * 1.5;
      splatVelocity(cx, cy, Math.cos(a) * 130, Math.sin(a) * 130, 14);
      nextStir = 700 + Math.random() * 900;
    }
  }

  let washing = 0;
  function wash() {
    washing = 1.6;
  }

  function step(dt: number) {
    curlMat.uniforms.uVelocity.value = velocity.read.texture;
    curlMat.uniforms.uTexel.value.copy(velocity.texel);
    blit(curlMat, curlRT);

    vorticityMat.uniforms.uVelocity.value = velocity.read.texture;
    vorticityMat.uniforms.uCurl.value = curlRT.texture;
    vorticityMat.uniforms.uTexel.value.copy(velocity.texel);
    vorticityMat.uniforms.uCurlStrength.value = config.CURL;
    vorticityMat.uniforms.uDt.value = dt;
    blit(vorticityMat, velocity.write);
    velocity.swap();

    divergeMat.uniforms.uVelocity.value = velocity.read.texture;
    divergeMat.uniforms.uTexel.value.copy(velocity.texel);
    blit(divergeMat, divergeRT);

    clearMat.uniforms.uTexture.value = pressure.read.texture;
    clearMat.uniforms.uValue.value = 0.8;
    blit(clearMat, pressure.write);
    pressure.swap();

    pressureMat.uniforms.uDivergence.value = divergeRT.texture;
    pressureMat.uniforms.uTexel.value.copy(velocity.texel);
    for (let i = 0; i < config.PRESSURE_ITER; i++) {
      pressureMat.uniforms.uPressure.value = pressure.read.texture;
      blit(pressureMat, pressure.write);
      pressure.swap();
    }

    gradientMat.uniforms.uPressure.value = pressure.read.texture;
    gradientMat.uniforms.uVelocity.value = velocity.read.texture;
    gradientMat.uniforms.uTexel.value.copy(velocity.texel);
    blit(gradientMat, velocity.write);
    velocity.swap();

    advectMat.uniforms.uVelocity.value = velocity.read.texture;
    advectMat.uniforms.uSource.value = velocity.read.texture;
    advectMat.uniforms.uTexel.value.copy(velocity.texel);
    advectMat.uniforms.uDt.value = dt;
    advectMat.uniforms.uDissipation.value = config.VEL_DISSIPATION;
    blit(advectMat, velocity.write);
    velocity.swap();

    const dyeDis = config.DYE_DISSIPATION + (washing > 0 ? 2.4 : 0);
    advectMat.uniforms.uVelocity.value = velocity.read.texture;
    advectMat.uniforms.uSource.value = dye.read.texture;
    advectMat.uniforms.uTexel.value.copy(dye.texel);
    advectMat.uniforms.uDissipation.value = dyeDis;
    blit(advectMat, dye.write);
    dye.swap();

    if (washing > 0) washing -= dt;
  }

  let lastT = performance.now();
  let raf = 0;
  let running = true;
  let paused = false;

  function frame(now: number) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (paused) {
      // Keep showing last frame
      displayMat.uniforms.uDye.value = dye.read.texture;
      displayMat.uniforms.uTexel.value.copy(dye.texel);
      displayMat.uniforms.uTime.value = now * 0.001;
      blit(displayMat, null);
      return;
    }
    let dt = (now - lastT) / 1000;
    lastT = now;
    dt = Math.min(dt, 1 / 30);
    if (dt <= 0) return;

    applyPointer();
    autoUpdate(now, dt);
    step(dt);

    displayMat.uniforms.uDye.value = dye.read.texture;
    displayMat.uniforms.uTexel.value.copy(dye.texel);
    displayMat.uniforms.uTime.value = now * 0.001;
    blit(displayMat, null);
  }

  function seed() {
    dropInk(0.38, 0.58, INKS.sumi, 0.75);
    pendingTimeouts.push(window.setTimeout(() => dropInk(0.62, 0.42, INKS.ai, 0.6), 450));
    pendingTimeouts.push(window.setTimeout(() => dropInk(0.5, 0.62, INKS.shu, 0.5), 950));
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      dropInk(
        0.2 + Math.random() * 0.6,
        0.2 + Math.random() * 0.6,
        currentInkColor(true),
        0.8 + Math.random() * 0.6,
      );
      opts?.onFirstInteract?.();
    }
    if (e.key === "x" || e.key === "X") wash();
  };
  addEventListener("keydown", onKey);

  const onResize = () => {
    const w = container.clientWidth || innerWidth;
    const h = container.clientHeight || innerHeight;
    renderer.setSize(w, h);
    S = simSizes();
    velocity.resize(S.sw, S.sh);
    pressure.resize(S.sw, S.sh);
    curlRT.setSize(S.sw, S.sh);
    divergeRT.setSize(S.sw, S.sh);
    dye.resize(S.dw, S.dh);
  };
  addEventListener("resize", onResize);

  seed();
  raf = requestAnimationFrame(frame);

  return {
    setInkMode(mode) {
      inkMode = mode;
    },
    setAuto(on) {
      autoFlow = on;
    },
    wash,
    hideHint() {
      opts?.onFirstInteract?.();
    },
    setPaused(next) {
      paused = next;
      if (!next) lastT = performance.now();
      canvas.style.pointerEvents = next ? "none" : "auto";
    },
    captureFrame() {
      // Ensure latest display is on the canvas
      displayMat.uniforms.uDye.value = dye.read.texture;
      displayMat.uniforms.uTexel.value.copy(dye.texel);
      blit(displayMat, null);

      const src = renderer.domElement;
      const out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const ctx = out.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(src, 0, 0);
      return out;
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      pendingTimeouts.forEach((id) => clearTimeout(id));
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      removeEventListener("pointerup", onPointerUp);
      removeEventListener("pointercancel", onPointerUp);
      removeEventListener("keydown", onKey);
      removeEventListener("resize", onResize);
      velocity.read.dispose();
      velocity.write.dispose();
      dye.read.dispose();
      dye.write.dispose();
      pressure.read.dispose();
      pressure.write.dispose();
      curlRT.dispose();
      divergeRT.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) container.removeChild(canvas);
    },
  };
}
