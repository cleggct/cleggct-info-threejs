import * as THREE from "three";

const PARTICLE_COUNT = 900;

function createAmigaTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  const rows = 8;
  const cols = 12;
  const red = "#e01017ff";
  const white = "#ffffff";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? red : white;
      const w = size / cols;
      const h = size / rows;
      ctx.fillRect(x * w, y * h, w + 1, h + 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x030712, 1);
  return renderer;
}

function bindResize(renderer, camera, mount) {
  const resize = () => {
    const width = Math.max(mount.clientWidth || 0, 320);
    const height = Math.max(mount.clientHeight || 0, 320);
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

function createOrbitData(count) {
  return Array.from({ length: count }, () => ({
    radius: 0.5 + Math.random() * 1.9,
    speed: 0.25 + Math.random() * 0.9,
    offset: Math.random() * Math.PI * 2,
    tilt: (Math.random() - 0.5) * 0.45,
  }));
}

export default function initOrbitalParticles({ canvas, mount }) {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030712, 0.08);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 50);
  camera.position.set(0, 1.1, 4.8);
  camera.lookAt(0, 0, 0);

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.04,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  const orbitData = createOrbitData(PARTICLE_COUNT);

  const nucleusTexture = createAmigaTexture();
  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 64, 64),
    new THREE.MeshStandardMaterial({
      map: nucleusTexture,
      metalness: 0.4,
      roughness: 0.2,
    })
  );
  scene.add(nucleus);

  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.PointLight(0xffffff, 1.3, 12);
  rim.position.set(-2, -1, -3);
  scene.add(rim);

  bindResize(renderer, camera, mount);

  function animate(time) {
    const t = time * 0.001;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const orbit = orbitData[i];
      const angle = orbit.offset + t * orbit.speed;
      const radius = orbit.radius + Math.sin(t * 0.5 + orbit.offset) * 0.08;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle * 0.6 + orbit.tilt) * 0.6;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    geometry.attributes.position.needsUpdate = true;

    nucleus.rotation.y = t * 0.4;
    camera.position.x = Math.sin(t * 0.1) * 0.4;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
