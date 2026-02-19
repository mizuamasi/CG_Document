const canvas = document.getElementById("viewport");
const ctx = canvas.getContext("2d");
const controlsHost = document.getElementById("controls");
const titleEl = document.getElementById("demo-title");
const guideEl = document.getElementById("demo-guide");
const demoButtons = Array.from(document.querySelectorAll(".demo-btn"));

const state = {
  active: "smooth",
  smooth: {
    smoothShade: true,
    autoSmooth: 45,
    lightAngle: 35,
  },
  normal: {
    enabled: true,
    strength: 1.0,
    tile: 6,
    lightAngle: 35,
  },
  roughness: {
    roughness: 0.45,
    metallic: false,
    lightAngle: 30,
  },
  light: {
    type: "point",
    angle: 45,
    areaSize: 1.2,
  },
};

const demos = {
  smooth: {
    title: "Smooth Shade",
    guide: "FlatとSmoothを切り替えて、同じ形なのに陰影がどう変わるか確認してください。",
    controls: [
      {
        type: "checkbox",
        key: "smoothShade",
        label: "Smooth Shade",
      },
      {
        type: "range",
        key: "autoSmooth",
        label: "Auto Smooth Angle",
        min: 10,
        max: 80,
        step: 1,
        format: (v) => `${v.toFixed(0)} deg`,
      },
      {
        type: "range",
        key: "lightAngle",
        label: "Light Angle",
        min: -80,
        max: 80,
        step: 1,
        format: (v) => `${v.toFixed(0)} deg`,
      },
    ],
    draw: drawSmoothDemo,
  },
  normal: {
    title: "Normal Map",
    guide: "Normal MapのON/OFFで、シルエットは同じまま陰影だけ変わることを見てください。",
    controls: [
      {
        type: "checkbox",
        key: "enabled",
        label: "Normal Map Enabled",
      },
      {
        type: "range",
        key: "strength",
        label: "Normal Strength",
        min: 0,
        max: 2,
        step: 0.05,
        format: (v) => v.toFixed(2),
      },
      {
        type: "range",
        key: "tile",
        label: "Detail Scale",
        min: 2,
        max: 12,
        step: 1,
        format: (v) => v.toFixed(0),
      },
      {
        type: "range",
        key: "lightAngle",
        label: "Light Angle",
        min: -80,
        max: 80,
        step: 1,
        format: (v) => `${v.toFixed(0)} deg`,
      },
    ],
    draw: drawNormalDemo,
  },
  roughness: {
    title: "PBR Roughness",
    guide: "Roughnessを動かし、ハイライトの鋭さがどう変わるか見てください。",
    controls: [
      {
        type: "range",
        key: "roughness",
        label: "Roughness",
        min: 0,
        max: 1,
        step: 0.01,
        format: (v) => v.toFixed(2),
      },
      {
        type: "checkbox",
        key: "metallic",
        label: "Metallic (0/1)",
      },
      {
        type: "range",
        key: "lightAngle",
        label: "Light Angle",
        min: -80,
        max: 80,
        step: 1,
        format: (v) => `${v.toFixed(0)} deg`,
      },
    ],
    draw: drawRoughnessDemo,
  },
  light: {
    title: "Light Types",
    guide: "Point / Sun / Areaを切り替え、影の硬さと方向の違いを確認してください。",
    controls: [
      {
        type: "select",
        key: "type",
        label: "Light Type",
        options: [
          { value: "point", label: "Point" },
          { value: "sun", label: "Sun" },
          { value: "area", label: "Area" },
          { value: "three", label: "3-Point" },
        ],
      },
      {
        type: "range",
        key: "angle",
        label: "Light Angle",
        min: -80,
        max: 80,
        step: 1,
        format: (v) => `${v.toFixed(0)} deg`,
      },
      {
        type: "range",
        key: "areaSize",
        label: "Light Size",
        min: 0.4,
        max: 2.0,
        step: 0.05,
        format: (v) => v.toFixed(2),
      },
    ],
    draw: drawLightDemo,
  },
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function degToDir(deg) {
  const r = (deg * Math.PI) / 180;
  return { x: Math.cos(r), y: -Math.sin(r) };
}

function clearViewport() {
  const w = canvas.width;
  const h = canvas.height;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#7b8fae");
  sky.addColorStop(0.45, "#5e6f88");
  sky.addColorStop(0.46, "#495566");
  sky.addColorStop(1, "#303845");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    const x = (w / 11) * i;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.52);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  for (let i = 0; i < 6; i += 1) {
    const y = h * 0.52 + (h * 0.48 / 6) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawObjectShadow(cx, cy, rx, ry, blur, alpha) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.filter = `blur(${blur}px)`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSmoothSphere(cx, cy, r, lightDir, roughness = 0.25, metallic = false) {
  const lx = lightDir.x;
  const ly = lightDir.y;

  const body = ctx.createRadialGradient(
    cx - lx * r * 0.45,
    cy - ly * r * 0.45,
    r * 0.25,
    cx,
    cy,
    r * 1.1
  );

  if (metallic) {
    body.addColorStop(0, "#f4f7fb");
    body.addColorStop(0.5, "#99a6b9");
    body.addColorStop(1, "#3f4653");
  } else {
    body.addColorStop(0, "#e0e6ef");
    body.addColorStop(0.5, "#8a95a6");
    body.addColorStop(1, "#454d5c");
  }

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const sharpness = clamp(1 - roughness, 0.03, 1);
  const hx = cx - lx * r * 0.35;
  const hy = cy - ly * r * 0.35;
  const hR = r * (0.08 + (1 - sharpness) * 0.35);

  const highlight = ctx.createRadialGradient(hx, hy, 0, hx, hy, hR);
  highlight.addColorStop(0, `rgba(255,255,255,${0.95 * sharpness + 0.15})`);
  highlight.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.arc(hx, hy, hR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFacetedSphere(cx, cy, r, lightDir, autoSmoothDeg) {
  const seg = 14;
  const ring = 8;
  for (let y = 0; y < ring; y += 1) {
    const ty0 = -1 + (2 * y) / ring;
    const ty1 = -1 + (2 * (y + 1)) / ring;
    const ry0 = Math.sqrt(Math.max(0, 1 - ty0 * ty0));
    const ry1 = Math.sqrt(Math.max(0, 1 - ty1 * ty1));

    for (let x = 0; x < seg; x += 1) {
      const a0 = (x / seg) * Math.PI * 2;
      const a1 = ((x + 1) / seg) * Math.PI * 2;

      const p0 = { x: cx + Math.cos(a0) * ry0 * r, y: cy + ty0 * r };
      const p1 = { x: cx + Math.cos(a1) * ry0 * r, y: cy + ty0 * r };
      const p2 = { x: cx + Math.cos(a1) * ry1 * r, y: cy + ty1 * r };
      const p3 = { x: cx + Math.cos(a0) * ry1 * r, y: cy + ty1 * r };

      const nx = Math.cos((a0 + a1) * 0.5) * ((ry0 + ry1) * 0.5);
      const ny = ((ty0 + ty1) * 0.5);
      const nz = Math.sin((a0 + a1) * 0.5) * ((ry0 + ry1) * 0.5);
      const nl = Math.hypot(nx, ny, nz) || 1;
      const n = { x: nx / nl, y: ny / nl };

      const lambert = clamp(n.x * lightDir.x + n.y * lightDir.y, 0, 1);
      const ao = clamp(0.2 + (1 - Math.abs(ny)) * 0.35, 0.2, 0.55);
      const edgeMix = clamp((autoSmoothDeg - 10) / 70, 0, 1);
      const v = 42 + lambert * (145 + edgeMix * 40) - ao * 20;
      const val = clamp(v, 0, 255).toFixed(0);

      ctx.fillStyle = `rgb(${val},${val},${(Number(val) + 8).toFixed(0)})`;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(30,38,48,0.35)";
      ctx.stroke();
    }
  }

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawNormalDetails(cx, cy, r, lightDir, strength, tile) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.clip();

  const step = clamp((r * 1.7) / tile, 8, 28);

  for (let y = cy - r; y <= cy + r; y += step) {
    for (let x = cx - r; x <= cx + r; x += step) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r * r) {
        continue;
      }

      const nx = Math.sin((x * 0.065) + (y * 0.025)) * strength;
      const ny = Math.cos((y * 0.07) - (x * 0.02)) * strength;
      const lm = clamp((nx * lightDir.x + ny * lightDir.y) * 0.55, -1, 1);
      const alpha = Math.abs(lm) * 0.22;

      ctx.fillStyle = lm >= 0
        ? `rgba(255,255,255,${alpha})`
        : `rgba(0,0,0,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, step * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawLightGizmo(lightDir, type, size) {
  const baseX = canvas.width * 0.13;
  const baseY = canvas.height * 0.2;
  const lx = baseX + lightDir.x * 85;
  const ly = baseY + lightDir.y * 85;

  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(lx, ly);
  ctx.stroke();

  if (type === "sun") {
    ctx.fillStyle = "#ffd466";
    ctx.beginPath();
    ctx.arc(lx, ly, 13, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "area") {
    ctx.fillStyle = "#ffd466";
    const w = 26 * size;
    const h = 16 * size;
    ctx.fillRect(lx - w / 2, ly - h / 2, w, h);
  } else if (type === "three") {
    ctx.fillStyle = "#ffd466";
    ctx.beginPath();
    ctx.arc(lx, ly, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffe699";
    ctx.beginPath();
    ctx.arc(baseX + 130, baseY + 55, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff4cc";
    ctx.beginPath();
    ctx.arc(baseX + 220, baseY - 10, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#ffd466";
    ctx.beginPath();
    ctx.arc(lx, ly, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSmoothDemo(opts) {
  clearViewport();
  const dir = degToDir(opts.lightAngle);
  const cx = canvas.width * 0.52;
  const cy = canvas.height * 0.45;
  const r = 132;

  drawObjectShadow(cx + 18, canvas.height * 0.73, 138, 30, 13, 0.28);
  if (opts.smoothShade) {
    drawSmoothSphere(cx, cy, r, dir, 1 - opts.autoSmooth / 90, false);
  } else {
    drawFacetedSphere(cx, cy, r, dir, opts.autoSmooth);
  }

  drawLightGizmo(dir, "point", 1);
  drawLabel(`Shading: ${opts.smoothShade ? "Smooth" : "Flat"}`, 26, 540);
}

function drawNormalDemo(opts) {
  clearViewport();
  const dir = degToDir(opts.lightAngle);
  const cx = canvas.width * 0.52;
  const cy = canvas.height * 0.45;
  const r = 132;

  drawObjectShadow(cx + 18, canvas.height * 0.73, 138, 30, 13, 0.3);
  drawSmoothSphere(cx, cy, r, dir, 0.3, false);

  if (opts.enabled) {
    drawNormalDetails(cx, cy, r, dir, opts.strength, opts.tile);
  }

  drawLightGizmo(dir, "point", 1);
  drawLabel(`Normal Map: ${opts.enabled ? "ON" : "OFF"}`, 26, 520);
  drawLabel("Note: silhouette is unchanged", 26, 548);
}

function drawRoughnessDemo(opts) {
  clearViewport();
  const dir = degToDir(opts.lightAngle);
  const cx = canvas.width * 0.52;
  const cy = canvas.height * 0.45;
  const r = 132;

  drawObjectShadow(cx + 18, canvas.height * 0.73, 138, 30, 13, 0.3);
  drawSmoothSphere(cx, cy, r, dir, opts.roughness, opts.metallic);

  drawLightGizmo(dir, "area", 1.1);
  drawLabel(`Roughness: ${opts.roughness.toFixed(2)}`, 26, 520);
  drawLabel(`Metallic: ${opts.metallic ? 1 : 0}`, 26, 548);
}

function drawCube(cx, cy, s, tone) {
  const h = s * 0.6;
  ctx.fillStyle = tone.front;
  ctx.fillRect(cx - s / 2, cy - h / 2, s, h);

  ctx.fillStyle = tone.top;
  ctx.beginPath();
  ctx.moveTo(cx - s / 2, cy - h / 2);
  ctx.lineTo(cx, cy - h / 2 - s * 0.25);
  ctx.lineTo(cx + s / 2, cy - h / 2);
  ctx.lineTo(cx, cy - h / 2 + s * 0.25);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = tone.side;
  ctx.beginPath();
  ctx.moveTo(cx + s / 2, cy - h / 2);
  ctx.lineTo(cx + s * 0.82, cy - h / 2 + s * 0.2);
  ctx.lineTo(cx + s * 0.82, cy + h / 2 + s * 0.2);
  ctx.lineTo(cx + s / 2, cy + h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.strokeRect(cx - s / 2, cy - h / 2, s, h);
}

function drawLightDemo(opts) {
  clearViewport();
  const dir = degToDir(opts.angle);
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.45;

  let blur = 14;
  let alpha = 0.25;
  let rx = 170;
  let ry = 28;

  if (opts.type === "sun") {
    blur = 6;
    alpha = 0.32;
  }
  if (opts.type === "area") {
    blur = 16 * opts.areaSize;
    alpha = 0.2;
    rx = 170 + opts.areaSize * 25;
  }
  if (opts.type === "three") {
    blur = 12;
    alpha = 0.22;
  }

  drawObjectShadow(cx + dir.x * 26, canvas.height * 0.72 - dir.y * 10, rx, ry, blur, alpha);

  const bright = clamp(120 + dir.y * 60, 80, 210).toFixed(0);
  drawCube(cx, cy, 210, {
    front: `rgb(${bright - 25}, ${bright - 22}, ${bright - 20})`,
    top: `rgb(${Number(bright) + 12}, ${Number(bright) + 15}, ${Number(bright) + 18})`,
    side: `rgb(${bright - 45}, ${bright - 44}, ${bright - 40})`,
  });

  drawLightGizmo(dir, opts.type, opts.areaSize);
  drawLabel(`Light: ${opts.type.toUpperCase()}`, 26, 520);
  drawLabel("Observe shadow edge softness", 26, 548);
}

function drawLabel(text, x, y) {
  ctx.fillStyle = "rgba(17,22,30,0.58)";
  ctx.fillRect(x - 10, y - 22, text.length * 8.6 + 14, 28);
  ctx.fillStyle = "#e7edf8";
  ctx.font = "15px Segoe UI, sans-serif";
  ctx.fillText(text, x, y - 4);
}

function buildControls() {
  const config = demos[state.active];
  const values = state[state.active];

  controlsHost.innerHTML = "";
  titleEl.textContent = config.title;
  guideEl.textContent = config.guide;

  config.controls.forEach((def) => {
    const wrap = document.createElement("div");
    wrap.className = "control";

    const label = document.createElement("label");
    label.textContent = def.label;
    wrap.appendChild(label);

    let input;
    let output;

    if (def.type === "checkbox") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(values[def.key]);
    } else if (def.type === "select") {
      input = document.createElement("select");
      def.options.forEach((opt) => {
        const el = document.createElement("option");
        el.value = opt.value;
        el.textContent = opt.label;
        if (values[def.key] === opt.value) {
          el.selected = true;
        }
        input.appendChild(el);
      });
    } else {
      input = document.createElement("input");
      input.type = "range";
      input.min = String(def.min);
      input.max = String(def.max);
      input.step = String(def.step);
      input.value = String(values[def.key]);
      output = document.createElement("output");
      output.textContent = def.format ? def.format(Number(values[def.key])) : String(values[def.key]);
      wrap.appendChild(output);
    }

    input.addEventListener("input", () => {
      let next;
      if (def.type === "checkbox") {
        next = input.checked;
      } else if (def.type === "select") {
        next = input.value;
      } else {
        next = Number(input.value);
      }
      values[def.key] = next;
      if (output) {
        output.textContent = def.format ? def.format(Number(next)) : String(next);
      }
    });

    wrap.appendChild(input);
    controlsHost.appendChild(wrap);
  });
}

function resizeCanvas() {
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  canvas.width = Math.max(1, Math.round(cssW));
  canvas.height = Math.max(1, Math.round(cssH));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function switchDemo(id) {
  state.active = id;
  window.location.hash = id;
  demoButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.demo === id));
  buildControls();
}

function render() {
  const active = demos[state.active];
  const opts = state[state.active];
  active.draw(opts);
  requestAnimationFrame(render);
}

demoButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchDemo(btn.dataset.demo));
});

window.addEventListener("resize", resizeCanvas);

const initial = window.location.hash.replace("#", "");
if (demos[initial]) {
  state.active = initial;
}

demoButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.demo === state.active));
buildControls();
resizeCanvas();
render();
