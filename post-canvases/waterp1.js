import * as THREE from "three";

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x020617, 1);
  return renderer;
}

function bindResize(renderer, camera, mount) {
  const resize = () => {
    const width = Math.max(mount.clientWidth || 0, 320);
    const height = Math.max(mount.clientHeight || 0, 280);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  resize();
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
  }
  window.addEventListener("resize", resize);
}

function loadTilingNormal(loader, url) {
  const texture = loader.load(url);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createRippleStubTexture() {
  const data = new Uint8Array([128, 0, 0, 255]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createWaterMaterial({ normalMap1, normalMap2, rippleTexture }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uNormalMap1: { value: normalMap1 },
      uNormalMap2: { value: normalMap2 },
      uFlowDir1: { value: new THREE.Vector2(1.0, 0.25).normalize() },
      uFlowDir2: { value: new THREE.Vector2(-0.35, 1.0).normalize() },
      uFlowSpeed1: { value: 0.05 },
      uFlowSpeed2: { value: -0.035 },
      uScale1: { value: 4.0 },
      uScale2: { value: 8.0 },
      uTintDeep: { value: new THREE.Color(0x5f7dac) },
      uTintShallow: { value: new THREE.Color(0x9fd4ff) },
      uOpacity: { value: 0.9 },
      uLightDir: { value: new THREE.Vector3(0.3, 1.0, 0.2).normalize() },
      uWaveAmp: { value: 0.05 },
      uWaveFreq: { value: new THREE.Vector2(0.35, 0.2) },
      uWaveSpeed: { value: new THREE.Vector2(0.6, 0.45) },
      uCamPos: { value: new THREE.Vector3() },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vT;
      varying vec3 vB;
      varying vec3 vN;
      uniform float uTime;
      uniform float uWaveAmp;
      uniform vec2 uWaveFreq;
      uniform vec2 uWaveSpeed;
      void main(){
        vUv = uv;
        float localX = position.x;
        float localY = position.y;
        vec3 displaced = position;
        float waveA = sin(localX * uWaveFreq.x + uTime * uWaveSpeed.x);
        float waveB = cos(localY * uWaveFreq.y + uTime * uWaveSpeed.y);
        displaced.z += uWaveAmp * (waveA + waveB);
        vec4 worldPos = modelMatrix * vec4(displaced, 1.0);

        float dHdX = uWaveAmp * uWaveFreq.x * cos(localX * uWaveFreq.x + uTime * uWaveSpeed.x);
        float dHdY = -uWaveAmp * uWaveFreq.y * sin(localY * uWaveFreq.y + uTime * uWaveSpeed.y);
        vec3 normalLocal = normalize(vec3(-dHdX, -dHdY, 1.0));
        vT = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
        vB = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
        vN = normalize(normalMatrix * normalLocal);

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vT;
      varying vec3 vB;
      varying vec3 vN;

      uniform sampler2D uNormalMap1;
      uniform sampler2D uNormalMap2;
      uniform vec2 uFlowDir1;
      uniform vec2 uFlowDir2;
      uniform float uFlowSpeed1;
      uniform float uFlowSpeed2;
      uniform float uScale1;
      uniform float uScale2;
      uniform float uTime;
      uniform vec3 uTintDeep;
      uniform vec3 uTintShallow;
      uniform float uOpacity;
      uniform vec3 uLightDir;
      uniform vec3 uCamPos;

      vec3 unpackNormal(vec3 n){
        return normalize(n * 2.0 - 1.0);
      }

      void main(){
        vec2 uv1 = vUv * uScale1 + uFlowDir1 * (uFlowSpeed1 * uTime);
        vec2 uv2 = vUv * uScale2 + uFlowDir2 * (uFlowSpeed2 * uTime);
        vec3 n1 = unpackNormal(texture2D(uNormalMap1, uv1).xyz);
        vec3 n2 = unpackNormal(texture2D(uNormalMap2, uv2).xyz);
        vec3 nT = normalize(n1 + n2);

        mat3 TBN = mat3(normalize(vT), normalize(vB), normalize(vN));
        vec3 N = normalize(TBN * nT);

        float light = clamp(dot(N, normalize(uLightDir)), 0.0, 1.0);
        vec3 base = mix(uTintDeep, uTintShallow, pow(light, 1.5));

        vec3 V = normalize(uCamPos);
        float NoV = max(dot(N, V), 0.0);
        vec3 waterColor = mix(base, vec3(1.0), 0.3);

        gl_FragColor = vec4(waterColor, uOpacity);
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
  });
}

export default function initWaterGrid({ canvas, mount }) {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x020617, 4, 14);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30);
  camera.position.set(0.5, 2.4, 5.4);
  camera.lookAt(0, 0, 0);

  const loader = new THREE.TextureLoader();
  const normalMap1 = loadTilingNormal(loader, "/textures/waternormals1.jpg");
  const normalMap2 = loadTilingNormal(loader, "/textures/waternormals2.jpg");
  const rippleTexture = createRippleStubTexture();

  const waterMaterial = createWaterMaterial({
    normalMap1,
    normalMap2,
    rippleTexture,
  });

  const geometry = new THREE.PlaneGeometry(6, 6, 64, 64);
  const mesh = new THREE.Mesh(geometry, waterMaterial);
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);

  bindResize(renderer, camera, mount);

  function animate(time) {
    const t = time * 0.001;
    waterMaterial.uniforms.uTime.value = t;
    waterMaterial.uniforms.uCamPos.value.copy(camera.position);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
