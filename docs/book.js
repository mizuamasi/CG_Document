import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();

function createDemoShell(host, title) {
  host.innerHTML = `
    <div class="demo-box">
      <div class="demo-head">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
        <span>${title}</span>
      </div>
      <div class="demo-viewport"></div>
      <div class="controls"></div>
    </div>
  `;

  return {
    viewport: host.querySelector(".demo-viewport"),
    controls: host.querySelector(".controls"),
  };
}

function addRangeControl(container, labelText, min, max, step, value, format, onInput) {
  const wrap = document.createElement("div");
  wrap.className = "control";

  const label = document.createElement("label");
  label.textContent = labelText;

  const out = document.createElement("output");
  out.textContent = format(value);

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener("input", () => {
    const v = Number(input.value);
    out.textContent = format(v);
    onInput(v);
  });

  wrap.append(label, out, input);
  container.appendChild(wrap);
}

function addCheckboxControl(container, labelText, checked, onInput) {
  const wrap = document.createElement("div");
  wrap.className = "control";

  const label = document.createElement("label");
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("input", () => onInput(input.checked));

  wrap.append(label, input);
  container.appendChild(wrap);
}

function addSelectControl(container, labelText, options, value, onInput) {
  const wrap = document.createElement("div");
  wrap.className = "control";

  const label = document.createElement("label");
  label.textContent = labelText;

  const select = document.createElement("select");
  options.forEach((opt) => {
    const item = document.createElement("option");
    item.value = opt.value;
    item.textContent = opt.label;
    if (value === opt.value) item.selected = true;
    select.appendChild(item);
  });
  select.addEventListener("input", () => onInput(select.value));

  wrap.append(label, select);
  container.appendChild(wrap);
}

function setupStage(viewport, cameraPos = [2.8, 1.7, 2.8]) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3f4f66);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(cameraPos[0], cameraPos[1], cameraPos[2]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0.25, 0);
  controls.minDistance = 1.6;
  controls.maxDistance = 6;

  const hemi = new THREE.HemisphereLight(0xbfd7ff, 0x3a4350, 0.7);
  scene.add(hemi);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x2d3541, roughness: 0.85, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.0;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(20, 24, 0x62758f, 0x4f5f75);
  grid.position.y = -0.99;
  grid.material.opacity = 0.25;
  grid.material.transparent = true;
  scene.add(grid);

  const resize = () => {
    const w = Math.max(300, viewport.clientWidth);
    const h = Math.max(220, viewport.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const ro = new ResizeObserver(resize);
  ro.observe(viewport);
  resize();

  return { scene, camera, renderer, controls, dispose: () => ro.disconnect() };
}

function setKeyLightByAngle(light, angleDeg, radius = 3.2, height = 2.1) {
  const r = THREE.MathUtils.degToRad(angleDeg);
  light.position.set(Math.cos(r) * radius, height, Math.sin(r) * radius);
}

function createNormalTexture(size = 256, tile = 6) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(size, size);
  const data = image.data;

  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const w = Math.sin((u * tile + v * tile * 0.35) * Math.PI * 2) * 0.5;
      const p = Math.cos((u * tile * 0.45 - v * tile * 1.3) * Math.PI * 2) * 0.5;
      const n = Math.sin((u * tile * 2.1 + v * tile * 1.7) * Math.PI * 2) * 0.15;
      h[y * size + x] = w + p + n;
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;

      const hL = h[y * size + xL];
      const hR = h[y * size + xR];
      const hU = h[yU * size + x];
      const hD = h[yD * size + x];

      const nx = hL - hR;
      const ny = hU - hD;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;

      const r = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
      const g = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
      const b = Math.floor(((nz / len) * 0.5 + 0.5) * 255);

      const i = (y * size + x) * 4;
      data[i + 0] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function initSmoothDemo(host) {
  const state = {
    smooth: true,
    segments: 18,
    lightAngle: 35,
  };

  const { viewport, controls } = createDemoShell(host, "Smooth Shade (Real 3D)");
  const stage = setupStage(viewport);

  const light = new THREE.DirectionalLight(0xffffff, 1.35);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -4;
  light.shadow.camera.right = 4;
  light.shadow.camera.top = 4;
  light.shadow.camera.bottom = -4;
  stage.scene.add(light);

  const fill = new THREE.DirectionalLight(0x8cb8ff, 0.24);
  fill.position.set(-2.1, 1.2, -1.8);
  stage.scene.add(fill);

  let mesh;
  const rebuild = () => {
    if (mesh) {
      stage.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }

    const geometry = new THREE.SphereGeometry(1, state.segments, Math.max(8, Math.floor(state.segments * 0.7)));
    const material = new THREE.MeshStandardMaterial({
      color: 0xb9c4d6,
      roughness: 0.32,
      metalness: 0.04,
      flatShading: !state.smooth,
    });
    mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.y = 0.1;
    stage.scene.add(mesh);
  };

  rebuild();

  addCheckboxControl(controls, "Smooth Shading", state.smooth, (v) => {
    state.smooth = v;
    rebuild();
  });
  addRangeControl(controls, "Mesh Segments", 8, 48, 1, state.segments, (v) => `${v.toFixed(0)}`, (v) => {
    state.segments = v;
    rebuild();
  });
  addRangeControl(controls, "Light Angle", -170, 170, 1, state.lightAngle, (v) => `${v.toFixed(0)} deg`, (v) => {
    state.lightAngle = v;
  });

  const clock = new THREE.Clock();
  const render = () => {
    const t = clock.getElapsedTime();
    setKeyLightByAngle(light, state.lightAngle);
    if (mesh) {
      mesh.rotation.y = t * 0.35;
    }
    stage.controls.update();
    stage.renderer.render(stage.scene, stage.camera);
  };

  stage.renderer.setAnimationLoop(render);
}

function initNormalDemo(host) {
  const state = {
    enabled: true,
    strength: 1.0,
    detail: 6,
    lightAngle: 35,
  };

  const { viewport, controls } = createDemoShell(host, "Normal Map (Real 3D)");
  const stage = setupStage(viewport);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  stage.scene.add(key);

  const fill = new THREE.DirectionalLight(0x88aaff, 0.18);
  fill.position.set(-2.2, 1.4, -2);
  stage.scene.add(fill);

  const geometry = new THREE.SphereGeometry(1, 64, 48);
  const material = new THREE.MeshStandardMaterial({
    color: 0xb9c4d6,
    roughness: 0.45,
    metalness: 0.0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.position.y = 0.1;
  stage.scene.add(mesh);

  let normalTexture = createNormalTexture(256, state.detail);
  material.normalMap = normalTexture;
  material.normalScale.set(state.strength, state.strength);

  addCheckboxControl(controls, "Normal Map Enabled", state.enabled, (v) => {
    state.enabled = v;
    material.normalMap = state.enabled ? normalTexture : null;
    material.needsUpdate = true;
  });
  addRangeControl(controls, "Normal Strength", 0, 2, 0.01, state.strength, (v) => v.toFixed(2), (v) => {
    state.strength = v;
    material.normalScale.set(v, v);
  });
  addRangeControl(controls, "Detail Scale", 2, 14, 1, state.detail, (v) => `${v.toFixed(0)}`, (v) => {
    state.detail = v;
    const prev = normalTexture;
    normalTexture = createNormalTexture(256, state.detail);
    material.normalMap = state.enabled ? normalTexture : null;
    material.needsUpdate = true;
    prev.dispose();
  });
  addRangeControl(controls, "Light Angle", -170, 170, 1, state.lightAngle, (v) => `${v.toFixed(0)} deg`, (v) => {
    state.lightAngle = v;
  });

  const clock = new THREE.Clock();
  const render = () => {
    const t = clock.getElapsedTime();
    setKeyLightByAngle(key, state.lightAngle);
    mesh.rotation.y = t * 0.32;
    stage.controls.update();
    stage.renderer.render(stage.scene, stage.camera);
  };

  stage.renderer.setAnimationLoop(render);
}

function initRoughnessDemo(host) {
  const state = {
    roughness: 0.45,
    metallic: false,
    lightAngle: 28,
  };

  const { viewport, controls } = createDemoShell(host, "PBR Roughness / Metallic (Real 3D)");
  const stage = setupStage(viewport, [3.1, 1.8, 2.7]);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  stage.scene.add(key);

  const fill = new THREE.DirectionalLight(0xb8cfff, 0.34);
  fill.position.set(-2.6, 1.5, -1.8);
  stage.scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.55);
  rim.position.set(1.8, 1.8, -2.8);
  stage.scene.add(rim);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48),
    new THREE.MeshStandardMaterial({
      color: 0xb8c5d8,
      roughness: state.roughness,
      metalness: 0.0,
    })
  );
  mesh.castShadow = true;
  mesh.position.y = 0.1;
  stage.scene.add(mesh);

  const reflector = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 3.0),
    new THREE.MeshStandardMaterial({ color: 0xe7edf8, roughness: 0.15, metalness: 0.0 })
  );
  reflector.position.set(0, 0.45, -1.9);
  stage.scene.add(reflector);

  addRangeControl(controls, "Roughness", 0, 1, 0.01, state.roughness, (v) => v.toFixed(2), (v) => {
    state.roughness = v;
    mesh.material.roughness = v;
  });
  addCheckboxControl(controls, "Metallic (0 or 1)", state.metallic, (v) => {
    state.metallic = v;
    mesh.material.metalness = v ? 1 : 0;
    mesh.material.color.set(v ? 0xaab5c6 : 0xb8c5d8);
  });
  addRangeControl(controls, "Light Angle", -170, 170, 1, state.lightAngle, (v) => `${v.toFixed(0)} deg`, (v) => {
    state.lightAngle = v;
  });

  const clock = new THREE.Clock();
  const render = () => {
    const t = clock.getElapsedTime();
    setKeyLightByAngle(key, state.lightAngle, 3.5, 2.2);
    mesh.rotation.y = t * 0.28;
    stage.controls.update();
    stage.renderer.render(stage.scene, stage.camera);
  };

  stage.renderer.setAnimationLoop(render);
}

function initLightDemo(host) {
  const state = {
    type: "point",
    angle: 45,
    size: 1.2,
  };

  const { viewport, controls } = createDemoShell(host, "Light Types / 3-Point (Real 3D)");
  const stage = setupStage(viewport, [3.6, 2.1, 3.1]);

  const subject = new THREE.Group();
  stage.scene.add(subject);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xb8c4d8, roughness: 0.55, metalness: 0.0 })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  subject.add(body);

  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 32, 24),
    new THREE.MeshStandardMaterial({ color: 0xc7d0de, roughness: 0.28, metalness: 0.15 })
  );
  top.castShadow = true;
  top.position.set(0.34, 0.96, 0.18);
  subject.add(top);

  subject.position.y = -0.05;

  const rig = {
    point: new THREE.PointLight(0xffffff, 70, 20, 2),
    sun: new THREE.DirectionalLight(0xffffff, 1.45),
    area: new THREE.RectAreaLight(0xffffff, 12, 1.8, 1.2),
    key: new THREE.DirectionalLight(0xffffff, 1.2),
    fill: new THREE.DirectionalLight(0x9fb8ff, 0.45),
    rim: new THREE.DirectionalLight(0xffffff, 0.7),
  };

  rig.point.castShadow = true;
  rig.point.shadow.mapSize.set(1024, 1024);

  rig.sun.castShadow = true;
  rig.sun.shadow.mapSize.set(1024, 1024);

  rig.key.castShadow = true;
  rig.key.shadow.mapSize.set(1024, 1024);

  rig.fill.position.set(-2.2, 1.3, -1.8);
  rig.rim.position.set(2.0, 1.8, -2.6);

  Object.values(rig).forEach((l) => {
    if (l.target) l.target.position.set(0, 0.2, 0);
    stage.scene.add(l);
    if (l.target) stage.scene.add(l.target);
  });

  const setRig = () => {
    rig.point.visible = false;
    rig.sun.visible = false;
    rig.area.visible = false;
    rig.key.visible = false;
    rig.fill.visible = false;
    rig.rim.visible = false;

    if (state.type === "point") {
      rig.point.visible = true;
    } else if (state.type === "sun") {
      rig.sun.visible = true;
    } else if (state.type === "area") {
      rig.area.visible = true;
    } else {
      rig.key.visible = true;
      rig.fill.visible = true;
      rig.rim.visible = true;
    }
  };

  setRig();

  addSelectControl(
    controls,
    "Light Type",
    [
      { value: "point", label: "Point" },
      { value: "sun", label: "Sun" },
      { value: "area", label: "Area" },
      { value: "three", label: "3-Point" },
    ],
    state.type,
    (v) => {
      state.type = v;
      setRig();
    }
  );

  addRangeControl(controls, "Light Angle", -170, 170, 1, state.angle, (v) => `${v.toFixed(0)} deg`, (v) => {
    state.angle = v;
  });

  addRangeControl(controls, "Light Size", 0.4, 2.5, 0.05, state.size, (v) => v.toFixed(2), (v) => {
    state.size = v;
    rig.area.width = 1.8 * v;
    rig.area.height = 1.2 * v;
    rig.point.distance = 8 + v * 6;
  });

  const clock = new THREE.Clock();
  const render = () => {
    const t = clock.getElapsedTime();
    subject.rotation.y = t * 0.2;

    const rad = THREE.MathUtils.degToRad(state.angle);
    const px = Math.cos(rad) * 3.2;
    const pz = Math.sin(rad) * 3.2;

    rig.point.position.set(px, 2.0, pz);

    rig.sun.position.set(px, 3.3, pz);
    rig.sun.target.position.set(0, 0.2, 0);

    rig.area.position.set(px, 2.0, pz);
    rig.area.lookAt(0, 0.25, 0);
    rig.area.intensity = 9 * (state.size * 0.65 + 0.35);

    rig.key.position.set(px, 2.4, pz);
    rig.key.target.position.set(0, 0.2, 0);

    stage.controls.update();
    stage.renderer.render(stage.scene, stage.camera);
  };

  stage.renderer.setAnimationLoop(render);
}

if (!window.WebGLRenderingContext) {
  document.querySelectorAll(".playground").forEach((el) => {
    el.innerHTML = "<p>このブラウザはWebGLをサポートしていません。</p>";
  });
} else {
  document.querySelectorAll(".playground").forEach((host) => {
    const type = host.dataset.demo;
    if (type === "smooth") initSmoothDemo(host);
    if (type === "normal") initNormalDemo(host);
    if (type === "roughness") initRoughnessDemo(host);
    if (type === "light") initLightDemo(host);
  });
}
