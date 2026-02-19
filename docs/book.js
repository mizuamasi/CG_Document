function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function degToDir(deg) {
  const r = (deg * Math.PI) / 180;
  return { x: Math.cos(r), y: -Math.sin(r) };
}

function createDemoShell(host, title) {
  host.innerHTML = `
    <div class="demo-box">
      <div class="demo-head">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
        <span>${title}</span>
      </div>
      <canvas class="demo-canvas" width="920" height="520"></canvas>
      <div class="controls"></div>
    </div>
  `;

  return {
    canvas: host.querySelector("canvas"),
    controls: host.querySelector(".controls"),
  };
}

function drawViewportBase(ctx, w, h) {
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
    ctx.moveTo(x, h * 0.54);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i += 1) {
    const y = h * 0.54 + (h * 0.46 / 6) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawObjectShadow(ctx, cx, cy, rx, ry, blur, alpha) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.filter = `blur(${blur}px)`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLabel(ctx, text, x, y) {
  ctx.fillStyle = "rgba(17,22,30,0.58)";
  ctx.fillRect(x - 8, y - 19, text.length * 8.5 + 12, 24);
  ctx.fillStyle = "#e7edf8";
  ctx.font = "14px Segoe UI, sans-serif";
  ctx.fillText(text, x, y - 3);
}

function drawSmoothSphere(ctx, cx, cy, r, lightDir, roughness = 0.25, metallic = false) {
  const lx = lightDir.x;
  const ly = lightDir.y;
  const body = ctx.createRadialGradient(cx - lx * r * 0.45, cy - ly * r * 0.45, r * 0.25, cx, cy, r * 1.1);

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

function drawFacetedSphere(ctx, cx, cy, r, lightDir, autoSmoothDeg) {
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

function drawNormalDetails(ctx, cx, cy, r, lightDir, strength, tile) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.clip();

  const step = clamp((r * 1.7) / tile, 8, 28);
  for (let y = cy - r; y <= cy + r; y += step) {
    for (let x = cx - r; x <= cx + r; x += step) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r * r) continue;

      const nx = Math.sin((x * 0.065) + (y * 0.025)) * strength;
      const ny = Math.cos((y * 0.07) - (x * 0.02)) * strength;
      const lm = clamp((nx * lightDir.x + ny * lightDir.y) * 0.55, -1, 1);
      const alpha = Math.abs(lm) * 0.22;

      ctx.fillStyle = lm >= 0 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, step * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCube(ctx, cx, cy, s, tone) {
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
    const el = document.createElement("option");
    el.value = opt.value;
    el.textContent = opt.label;
    if (opt.value === value) el.selected = true;
    select.appendChild(el);
  });
  select.addEventListener("input", () => onInput(select.value));
  wrap.append(label, select);
  container.appendChild(wrap);
}

function initSmoothDemo(host) {
  const state = { smooth: true, autoSmooth: 45, light: 35 };
  const { canvas, controls } = createDemoShell(host, "Smooth Shade Playground");
  const ctx = canvas.getContext("2d");

  addCheckboxControl(controls, "Smooth Shade", state.smooth, (v) => { state.smooth = v; });
  addRangeControl(controls, "Auto Smooth Angle", 10, 80, 1, state.autoSmooth, (v) => `${v.toFixed(0)} deg`, (v) => { state.autoSmooth = v; });
  addRangeControl(controls, "Light Angle", -80, 80, 1, state.light, (v) => `${v.toFixed(0)} deg`, (v) => { state.light = v; });

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    drawViewportBase(ctx, w, h);
    const dir = degToDir(state.light);
    const cx = w * 0.53;
    const cy = h * 0.45;
    const r = 120;
    drawObjectShadow(ctx, cx + 16, h * 0.73, 130, 28, 12, 0.28);
    if (state.smooth) drawSmoothSphere(ctx, cx, cy, r, dir, 1 - state.autoSmooth / 90, false);
    else drawFacetedSphere(ctx, cx, cy, r, dir, state.autoSmooth);
    drawLabel(ctx, `Shading: ${state.smooth ? "Smooth" : "Flat"}`, 24, h - 18);
    requestAnimationFrame(draw);
  }
  draw();
}

function initNormalDemo(host) {
  const state = { enabled: true, strength: 1.0, tile: 6, light: 35 };
  const { canvas, controls } = createDemoShell(host, "Normal Map Playground");
  const ctx = canvas.getContext("2d");

  addCheckboxControl(controls, "Normal Map Enabled", state.enabled, (v) => { state.enabled = v; });
  addRangeControl(controls, "Normal Strength", 0, 2, 0.05, state.strength, (v) => v.toFixed(2), (v) => { state.strength = v; });
  addRangeControl(controls, "Detail Scale", 2, 12, 1, state.tile, (v) => v.toFixed(0), (v) => { state.tile = v; });
  addRangeControl(controls, "Light Angle", -80, 80, 1, state.light, (v) => `${v.toFixed(0)} deg`, (v) => { state.light = v; });

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    drawViewportBase(ctx, w, h);
    const dir = degToDir(state.light);
    const cx = w * 0.53;
    const cy = h * 0.45;
    const r = 120;
    drawObjectShadow(ctx, cx + 16, h * 0.73, 130, 28, 12, 0.3);
    drawSmoothSphere(ctx, cx, cy, r, dir, 0.3, false);
    if (state.enabled) drawNormalDetails(ctx, cx, cy, r, dir, state.strength, state.tile);
    drawLabel(ctx, `Normal Map: ${state.enabled ? "ON" : "OFF"} (silhouette is unchanged)`, 24, h - 18);
    requestAnimationFrame(draw);
  }
  draw();
}

function initRoughnessDemo(host) {
  const state = { roughness: 0.45, metallic: false, light: 30 };
  const { canvas, controls } = createDemoShell(host, "PBR Roughness Playground");
  const ctx = canvas.getContext("2d");

  addRangeControl(controls, "Roughness", 0, 1, 0.01, state.roughness, (v) => v.toFixed(2), (v) => { state.roughness = v; });
  addCheckboxControl(controls, "Metallic (0/1)", state.metallic, (v) => { state.metallic = v; });
  addRangeControl(controls, "Light Angle", -80, 80, 1, state.light, (v) => `${v.toFixed(0)} deg`, (v) => { state.light = v; });

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    drawViewportBase(ctx, w, h);
    const dir = degToDir(state.light);
    const cx = w * 0.53;
    const cy = h * 0.45;
    const r = 120;
    drawObjectShadow(ctx, cx + 16, h * 0.73, 130, 28, 12, 0.3);
    drawSmoothSphere(ctx, cx, cy, r, dir, state.roughness, state.metallic);
    drawLabel(ctx, `Roughness: ${state.roughness.toFixed(2)} / Metallic: ${state.metallic ? 1 : 0}`, 24, h - 18);
    requestAnimationFrame(draw);
  }
  draw();
}

function initLightDemo(host) {
  const state = { type: "point", angle: 45, size: 1.2 };
  const { canvas, controls } = createDemoShell(host, "Light Types Playground");
  const ctx = canvas.getContext("2d");

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
    (v) => { state.type = v; }
  );
  addRangeControl(controls, "Light Angle", -80, 80, 1, state.angle, (v) => `${v.toFixed(0)} deg`, (v) => { state.angle = v; });
  addRangeControl(controls, "Light Size", 0.4, 2.0, 0.05, state.size, (v) => v.toFixed(2), (v) => { state.size = v; });

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    drawViewportBase(ctx, w, h);

    const dir = degToDir(state.angle);
    const cx = w * 0.52;
    const cy = h * 0.45;

    let blur = 14;
    let alpha = 0.25;
    let rx = 165;
    if (state.type === "sun") { blur = 6; alpha = 0.32; }
    if (state.type === "area") { blur = 16 * state.size; alpha = 0.2; rx = 165 + state.size * 25; }
    if (state.type === "three") { blur = 12; alpha = 0.22; }

    drawObjectShadow(ctx, cx + dir.x * 24, h * 0.72 - dir.y * 10, rx, 27, blur, alpha);

    const bright = clamp(120 + dir.y * 60, 80, 210).toFixed(0);
    drawCube(ctx, cx, cy, 195, {
      front: `rgb(${bright - 25}, ${bright - 22}, ${bright - 20})`,
      top: `rgb(${Number(bright) + 12}, ${Number(bright) + 15}, ${Number(bright) + 18})`,
      side: `rgb(${bright - 45}, ${bright - 44}, ${bright - 40})`,
    });

    drawLabel(ctx, `Light: ${state.type.toUpperCase()} (watch shadow edge)`, 24, h - 18);
    requestAnimationFrame(draw);
  }
  draw();
}

document.querySelectorAll(".playground").forEach((host) => {
  const type = host.dataset.demo;
  if (type === "smooth") initSmoothDemo(host);
  if (type === "normal") initNormalDemo(host);
  if (type === "roughness") initRoughnessDemo(host);
  if (type === "light") initLightDemo(host);
});
