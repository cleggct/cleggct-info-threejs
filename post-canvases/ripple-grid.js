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

export default function initRippleGrid({ canvas, mount }) {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x020617, 4, 14);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30);
  camera.position.set(0.5, 2.4, 5.4);
  camera.lookAt(0, 0, 0);

  const geometry = new THREE.PlaneGeometry(6, 6, 32, 32);
  const basePositions = geometry.attributes.position.array.slice();
  const material = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x102347,
    roughness: 0.35,
    metalness: 0.15,
    envMapIntensity: 0.6,
    wireframe: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);

  const hemi = new THREE.HemisphereLight(0x9ed0ff, 0x030817, 0.6);
  const dir = new THREE.DirectionalLight(0xbfe5ff, 1.3);
  dir.position.set(-2.5, 4, 2.5);
  scene.add(hemi, dir);

  bindResize(renderer, camera, mount);

  const positionAttr = geometry.attributes.position;
  function animate(time) {
    const t = time * 0.001;
    for (let i = 0; i < positionAttr.count; i++) {
      const idx = i * 3;
      const x = basePositions[idx];
      const y = basePositions[idx + 1];
      const wave =
        Math.sin(x * 1.4 + t * 1.6) * 0.25 +
        Math.cos(y * 1.7 - t * 1.3) * 0.22 +
        Math.sin((x + y) * 0.6 + t) * 0.08;
      positionAttr.array[idx + 2] = wave;
    }
    positionAttr.needsUpdate = true;
    geometry.computeVertexNormals();

    mesh.rotation.z = Math.sin(t * 0.15) * 0.12;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
