import { createPipeline, estimateOutputSize } from './transform.js';

const state = {
  imageBitmap: null,
  filePath: null,
  isDirty: false,
  corners: null,
  rotation: 0,
  skewH: 0,
  skewV: 0,
  cropRect: null,         // null oppure {x, y, w, h} in coord normalizzate 0..1
  cropMode: false,
  cropBackup: null,       // snapshot di cropRect quando si entra in modalità (per Annulla)
  resizeActive: false,
  resizeW: 0,
  resizeH: 0,
  lockAspect: true,
  outputFormat: 'png',     // 'png' | 'jpeg' | 'webp'
  jpgQuality: 92,          // 1..100
  preBounds: null,         // bounding box dell'originale post-rot/skew
  tool: 'perspective',     // 'perspective' | 'level'
  linePoints: null,        // [[x1,y1], [x2,y2]] in coord originale
};

const els = {
  emptyState: document.getElementById('emptyState'),
  dualCanvas: document.getElementById('dualCanvas'),
  openBtn: document.getElementById('openBtn'),
  saveBtn: document.getElementById('saveBtn'),
  saveAsBtn: document.getElementById('saveAsBtn'),
  resetCornersBtn: document.getElementById('resetCornersBtn'),
  originalCanvas: document.getElementById('originalCanvas'),
  previewCanvas: document.getElementById('previewCanvas'),
  previewContainer: document.getElementById('previewContainer'),
  origContainer: document.getElementById('origContainer'),
  handlesOverlay: document.getElementById('handlesOverlay'),
  handles: Array.from(document.querySelectorAll('.handle')),
  handlePolygon: document.querySelector('#handleLines polygon'),
  canvasArea: document.getElementById('canvasArea'),
  fileInfo: document.getElementById('fileInfo'),
  rotationSlider: document.getElementById('rotationSlider'),
  rotationInput: document.getElementById('rotationInput'),
  rotationQuickBtns: Array.from(document.querySelectorAll('[data-rotation-quick]')),
  skewHSlider: document.getElementById('skewHSlider'),
  skewHInput: document.getElementById('skewHInput'),
  skewHQuickBtns: Array.from(document.querySelectorAll('[data-skew-h-quick]')),
  skewVSlider: document.getElementById('skewVSlider'),
  skewVInput: document.getElementById('skewVInput'),
  skewVQuickBtns: Array.from(document.querySelectorAll('[data-skew-v-quick]')),
  cropOverlay: document.getElementById('cropOverlay'),
  cropRectEl: document.getElementById('cropRect'),
  cropShadeTop: document.querySelector('.crop-shade-top'),
  cropShadeBottom: document.querySelector('.crop-shade-bottom'),
  cropShadeLeft: document.querySelector('.crop-shade-left'),
  cropShadeRight: document.querySelector('.crop-shade-right'),
  cropHandles: Array.from(document.querySelectorAll('.crop-handle')),
  cropEnterBtn: document.getElementById('cropEnterBtn'),
  cropConfirmBtn: document.getElementById('cropConfirmBtn'),
  cropCancelBtn: document.getElementById('cropCancelBtn'),
  cropRemoveBtn: document.getElementById('cropRemoveBtn'),
  cropIdleControls: document.getElementById('cropIdleControls'),
  cropActiveControls: document.getElementById('cropActiveControls'),
  resizeWInput: document.getElementById('resizeWInput'),
  resizeHInput: document.getElementById('resizeHInput'),
  resizePctInput: document.getElementById('resizePctInput'),
  lockAspectInput: document.getElementById('lockAspectInput'),
  resizeResetBtn: document.getElementById('resizeResetBtn'),
  resizeHint: document.getElementById('resizeHint'),
  formatSelect: document.getElementById('formatSelect'),
  qualityRow: document.getElementById('qualityRow'),
  qualitySlider: document.getElementById('qualitySlider'),
  qualityInput: document.getElementById('qualityInput'),
  topbarOpenBtn: document.getElementById('topbarOpenBtn'),
  topbarCloseBtn: document.getElementById('topbarCloseBtn'),
  topbarResetBtn: document.getElementById('topbarResetBtn'),
  toolButtons: Array.from(document.querySelectorAll('[data-tool]')),
  perspectivePanel: document.getElementById('perspectivePanel'),
  levelPanel: document.getElementById('levelPanel'),
  lineOverlay: document.getElementById('lineOverlay'),
  lineSvg: document.querySelector('#lineSvg line'),
  lineHandles: Array.from(document.querySelectorAll('.line-handle')),
  resetLineBtn: document.getElementById('resetLineBtn'),
  applyLineBtn: document.getElementById('applyLineBtn'),
  lineAngleDisplay: document.getElementById('lineAngleDisplay'),
  loupe: document.getElementById('loupe'),
};

const SUPPORTED_MIME = ['image/png', 'image/jpeg', 'image/webp'];

const stageA = document.createElement('canvas');
const stageB = document.createElement('canvas');
const stageC = document.createElement('canvas');
let pipeline = null;
let renderQueued = false;

function initialCorners(w, h) {
  return [[0, 0], [w, 0], [w, h], [0, h]];
}

function initialLine(w, h) {
  return [[w * 0.2, h / 2], [w * 0.8, h / 2]];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function fmtAngle(v) {
  return v.toFixed(1).replace(/\.0$/, '');
}

function mimeFromPath(p) {
  const ext = (p ?? '').toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
}

function formatFromPath(p) {
  const ext = (p ?? '').toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  if (ext === 'webp') return 'webp';
  return 'png';
}

function extForFormat(fmt) {
  return fmt === 'jpeg' ? 'jpg' : fmt;
}

function mimeForFormat(fmt) {
  if (fmt === 'jpeg') return 'image/jpeg';
  if (fmt === 'webp') return 'image/webp';
  return 'image/png';
}

async function openImageFromBytes(bytes, filePath) {
  const blob = new Blob([bytes]);
  const bitmap = await createImageBitmap(blob);
  state.imageBitmap = bitmap;
  state.filePath = filePath ?? null;
  state.corners = initialCorners(bitmap.width, bitmap.height);
  state.rotation = 0;
  state.skewH = 0;
  state.skewV = 0;
  state.cropRect = null;
  state.cropMode = false;
  state.cropBackup = null;
  state.resizeActive = false;
  state.resizeW = 0;
  state.resizeH = 0;
  state.lockAspect = true;
  state.outputFormat = filePath ? formatFromPath(filePath) : 'png';
  state.jpgQuality = 92;
  state.preBounds = null;
  state.tool = 'perspective';
  state.linePoints = initialLine(bitmap.width, bitmap.height);
  state.isDirty = false;

  ensurePipeline();
  pipeline.uploadImage(bitmap);
  syncRotationUI();
  syncSkewUI();
  syncFormatUI();
  scheduleRender();

  els.dualCanvas.hidden = false;
  els.emptyState.hidden = true;

  requestAnimationFrame(() => {
    updateHandlesPositions();
    updateCropOverlay();
  });
  updateUI();
}

async function openImageFromFile(file) {
  if (!SUPPORTED_MIME.includes(file.type)) {
    alert(`Unsupported format: ${file.type || 'unknown'}`);
    return;
  }
  const bytes = await file.arrayBuffer();
  await openImageFromBytes(bytes, file.path || null);
}

// Disegna l'originale + rotation + skew nel canvas sinistro.
// Aggiorna state.preBounds (offset/dimensioni del pre-stage) per le conversioni di coordinate.
function drawOriginal() {
  if (!state.imageBitmap) return;

  const rotRad = (state.rotation * Math.PI) / 180;
  const skewHRad = (state.skewH * Math.PI) / 180;
  const skewVRad = (state.skewV * Math.PI) / 180;

  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  const tanH = Math.tan(skewHRad);
  const tanV = Math.tan(skewVRad);

  const w = state.imageBitmap.width;
  const h = state.imageBitmap.height;
  const halfW = w / 2;
  const halfH = h / 2;

  const tf = (x, y) => {
    const sx = x + tanH * y;
    const sy = y + tanV * x;
    return [sx * cos - sy * sin, sx * sin + sy * cos];
  };
  const corners = [
    tf(-halfW, -halfH),
    tf(halfW, -halfH),
    tf(halfW, halfH),
    tf(-halfW, halfH),
  ];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of corners) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const outW = Math.max(1, Math.ceil(maxX - minX));
  const outH = Math.max(1, Math.ceil(maxY - minY));

  const c = els.originalCanvas;
  c.width = outW;
  c.height = outH;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, outW, outH);

  ctx.save();
  ctx.translate(-minX, -minY);
  ctx.rotate(rotRad);
  ctx.transform(1, tanV, tanH, 1, 0, 0);
  ctx.drawImage(state.imageBitmap, -halfW, -halfH);
  ctx.restore();

  state.preBounds = { minX, minY, outW, outH };
}

// Trasforma un punto in coord IMMAGINE ORIGINALE → coord pre-stage (originalCanvas).
function imageToPre(x, y) {
  const rotRad = (state.rotation * Math.PI) / 180;
  const tanH = Math.tan((state.skewH * Math.PI) / 180);
  const tanV = Math.tan((state.skewV * Math.PI) / 180);
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);

  const halfW = state.imageBitmap.width / 2;
  const halfH = state.imageBitmap.height / 2;
  const cx = x - halfW;
  const cy = y - halfH;

  const sx = cx + tanH * cy;
  const sy = cy + tanV * cx;
  const rx = sx * cos - sy * sin;
  const ry = sx * sin + sy * cos;

  return [rx - state.preBounds.minX, ry - state.preBounds.minY];
}

// Inverso: pre-stage coord → coord IMMAGINE ORIGINALE.
function preToImage(px, py) {
  const rotRad = (state.rotation * Math.PI) / 180;
  const tanH = Math.tan((state.skewH * Math.PI) / 180);
  const tanV = Math.tan((state.skewV * Math.PI) / 180);
  const cos = Math.cos(-rotRad);
  const sin = Math.sin(-rotRad);

  const cx = px + state.preBounds.minX;
  const cy = py + state.preBounds.minY;

  const rx = cx * cos - cy * sin;
  const ry = cx * sin + cy * cos;

  const det = 1 - tanH * tanV;
  const sx = (rx - tanH * ry) / det;
  const sy = (ry - tanV * rx) / det;

  return [sx + state.imageBitmap.width / 2, sy + state.imageBitmap.height / 2];
}

function ensurePipeline() {
  if (!pipeline) pipeline = createPipeline(stageA);
}

// === LOUPE (zoom durante drag) ===

const LOUPE_SIZE = 180;
const LOUPE_ZOOM = 3;

function showLoupe() {
  els.loupe.hidden = false;
}

function hideLoupe() {
  els.loupe.hidden = true;
}

function updateLoupe(clientX, clientY) {
  const cRect = els.originalCanvas.getBoundingClientRect();
  // Coord del puntatore in pixel canvas (post rot/skew)
  const sx = ((clientX - cRect.left) / cRect.width) * els.originalCanvas.width;
  const sy = ((clientY - cRect.top) / cRect.height) * els.originalCanvas.height;
  const sourceSize = LOUPE_SIZE / LOUPE_ZOOM;

  const ctx = els.loupe.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
  ctx.drawImage(
    els.originalCanvas,
    sx - sourceSize / 2, sy - sourceSize / 2,
    sourceSize, sourceSize,
    0, 0,
    LOUPE_SIZE, LOUPE_SIZE,
  );

  // Crosshair al centro: alone bianco esterno + croce rossa interna per leggibilità
  // su qualsiasi sfondo.
  const c = LOUPE_SIZE / 2;
  const arm = 16;
  const gap = 4;
  const drawCross = () => {
    ctx.beginPath();
    ctx.moveTo(c - arm, c); ctx.lineTo(c - gap, c);
    ctx.moveTo(c + gap, c); ctx.lineTo(c + arm, c);
    ctx.moveTo(c, c - arm); ctx.lineTo(c, c - gap);
    ctx.moveTo(c, c + gap); ctx.lineTo(c, c + arm);
    ctx.stroke();
  };
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 4;
  drawCross();
  ctx.strokeStyle = 'rgba(255, 50, 50, 1)';
  ctx.lineWidth = 2;
  drawCross();
  // Punto centrale
  ctx.fillStyle = 'rgba(255, 50, 50, 1)';
  ctx.beginPath();
  ctx.arc(c, c, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Posizione: offset di 30px dal pointer, flip se vicino ai bordi finestra
  const margin = 12;
  let lx = clientX + 30;
  let ly = clientY + 30;
  if (lx + LOUPE_SIZE + margin > window.innerWidth) lx = clientX - LOUPE_SIZE - 30;
  if (ly + LOUPE_SIZE + margin > window.innerHeight) ly = clientY - LOUPE_SIZE - 30;
  els.loupe.style.left = `${lx}px`;
  els.loupe.style.top = `${ly}px`;
}

// === END LOUPE ===

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    runPipeline();
    requestAnimationFrame(() => {
      updateHandlesPositions();
      updateLineOverlay();
      updateCropOverlay();
    });
  });
}

function runPipeline() {
  if (!state.imageBitmap) return;

  // Step 1: drawOriginal — disegna originalCanvas (display) con rotation+skew applicate.
  // Aggiorna anche state.preBounds per posizionare correttamente le 4 maniglie.
  drawOriginal();

  // Step 2: WebGL perspective unwarp dell'IMMAGINE RAW.
  // Se tool=level, ignoriamo i 4 corners e usiamo i corners naturali (= no perspective).
  const cornersForPerspective = state.tool === 'level'
    ? initialCorners(state.imageBitmap.width, state.imageBitmap.height)
    : state.corners;
  const { width: stageW, height: stageH } = estimateOutputSize(cornersForPerspective);
  pipeline.render(cornersForPerspective, stageW, stageH);

  // Step 3: applica rotation + skew di output → stageB
  applyRotateSkewToStageB(stageW, stageH);

  // Step 4: crop stageB → stageC
  applyCropToStageC();

  // Step 5: resize stageC → previewCanvas
  applyResizeToPreview();
}

function applyRotateSkewToStageB(stageW, stageH) {
  const rotRad = (state.rotation * Math.PI) / 180;
  const skewHRad = (state.skewH * Math.PI) / 180;
  const skewVRad = (state.skewV * Math.PI) / 180;

  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  const tanH = Math.tan(skewHRad);
  const tanV = Math.tan(skewVRad);

  const tf = (x, y) => {
    const sx = x + tanH * y;
    const sy = y + tanV * x;
    return [sx * cos - sy * sin, sx * sin + sy * cos];
  };

  const halfW = stageW / 2;
  const halfH = stageH / 2;
  const corners = [
    tf(-halfW, -halfH),
    tf(halfW, -halfH),
    tf(halfW, halfH),
    tf(-halfW, halfH),
  ];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of corners) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const outW = Math.max(1, Math.ceil(maxX - minX));
  const outH = Math.max(1, Math.ceil(maxY - minY));

  stageB.width = outW;
  stageB.height = outH;
  const ctx = stageB.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, outW, outH);

  ctx.save();
  ctx.translate(-minX, -minY);
  ctx.rotate(rotRad);
  ctx.transform(1, tanV, tanH, 1, 0, 0);
  ctx.drawImage(stageA, -halfW, -halfH);
  ctx.restore();
}

function applyCropToStageC() {
  const ctx = stageC.getContext('2d');

  // In modalità editing crop, stageC contiene il preview INTERO (senza crop)
  // così l'utente vede ciò che sta selezionando.
  if (!state.cropRect || state.cropMode) {
    stageC.width = stageB.width;
    stageC.height = stageB.height;
    ctx.clearRect(0, 0, stageC.width, stageC.height);
    ctx.drawImage(stageB, 0, 0);
    return;
  }

  const { x, y, w, h } = state.cropRect;
  const sx = Math.floor(x * stageB.width);
  const sy = Math.floor(y * stageB.height);
  const sw = Math.max(1, Math.floor(w * stageB.width));
  const sh = Math.max(1, Math.floor(h * stageB.height));

  stageC.width = sw;
  stageC.height = sh;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, sw, sh);
  ctx.drawImage(stageB, sx, sy, sw, sh, 0, 0, sw, sh);
}

function applyResizeToPreview() {
  const naturalW = stageC.width;
  const naturalH = stageC.height;

  if (!state.resizeActive) {
    state.resizeW = naturalW;
    state.resizeH = naturalH;
    syncResizeUI(naturalW, naturalH);
  }

  const targetW = Math.max(1, Math.floor(state.resizeActive ? state.resizeW : naturalW));
  const targetH = Math.max(1, Math.floor(state.resizeActive ? state.resizeH : naturalH));

  const dst = els.previewCanvas;
  dst.width = targetW;
  dst.height = targetH;
  const ctx = dst.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(stageC, 0, 0, targetW, targetH);

  els.resizeHint.textContent = `Output: ${targetW} × ${targetH} px`;
}

function updateHandlesPositions() {
  if (!state.imageBitmap || !state.preBounds) return;
  const canvas = els.originalCanvas;
  const overlay = els.handlesOverlay;
  const cRect = canvas.getBoundingClientRect();
  const oRect = overlay.getBoundingClientRect();

  const offX = cRect.left - oRect.left;
  const offY = cRect.top - oRect.top;
  // Scale: dimensioni display / dimensioni pre-stage
  const scaleX = cRect.width / canvas.width;
  const scaleY = cRect.height / canvas.height;

  const points = [];
  state.corners.forEach((c, i) => {
    const [preX, preY] = imageToPre(c[0], c[1]);
    const x = offX + preX * scaleX;
    const y = offY + preY * scaleY;
    els.handles[i].style.left = `${x}px`;
    els.handles[i].style.top = `${y}px`;
    points.push(`${x},${y}`);
  });

  els.handlePolygon.setAttribute('points', points.join(' '));
}

function setupHandleDrag(handle, idx) {
  let dragging = false;
  let scaleX = 1;
  let scaleY = 1;
  let pointerOffsetX = 0;
  let pointerOffsetY = 0;

  handle.addEventListener('pointerdown', (e) => {
    if (!state.imageBitmap || !state.preBounds) return;
    e.preventDefault();
    dragging = true;
    handle.classList.add('dragging');
    handle.setPointerCapture(e.pointerId);
    const cRect = els.originalCanvas.getBoundingClientRect();
    scaleX = els.originalCanvas.width / cRect.width;
    scaleY = els.originalCanvas.height / cRect.height;
    // Offset del pointer rispetto alla maniglia, in coord pre-stage
    const [preX, preY] = imageToPre(state.corners[idx][0], state.corners[idx][1]);
    pointerOffsetX = (e.clientX - cRect.left) * scaleX - preX;
    pointerOffsetY = (e.clientY - cRect.top) * scaleY - preY;
    showLoupe();
    updateLoupe(e.clientX, e.clientY);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const cRect = els.originalCanvas.getBoundingClientRect();
    const preX = (e.clientX - cRect.left) * scaleX - pointerOffsetX;
    const preY = (e.clientY - cRect.top) * scaleY - pointerOffsetY;
    const [imgX, imgY] = preToImage(preX, preY);
    const w = state.imageBitmap.width;
    const h = state.imageBitmap.height;
    state.corners[idx] = [
      Math.max(0, Math.min(w, imgX)),
      Math.max(0, Math.min(h, imgY)),
    ];
    state.isDirty = true;
    updateHandlesPositions();
    scheduleRender();
    updateLoupe(e.clientX, e.clientY);
    updateUI();
  });

  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
    hideLoupe();
  };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}

els.handles.forEach((h, i) => setupHandleDrag(h, i));

function resetCorners() {
  if (!state.imageBitmap) return;
  state.corners = initialCorners(state.imageBitmap.width, state.imageBitmap.height);
  state.isDirty = true;
  updateHandlesPositions();
  scheduleRender();
  updateUI();
}

function setRotation(value, opts = {}) {
  const v = clamp(value, -180, 180);
  state.rotation = v;
  if (!opts.fromSlider) els.rotationSlider.value = String(v);
  if (!opts.fromInput) els.rotationInput.value = fmtAngle(v);
  state.isDirty = true;
  scheduleRender();
  updateUI();
}

function setSkewH(value, opts = {}) {
  const v = clamp(value, -45, 45);
  state.skewH = v;
  if (!opts.fromSlider) els.skewHSlider.value = String(v);
  if (!opts.fromInput) els.skewHInput.value = fmtAngle(v);
  state.isDirty = true;
  scheduleRender();
  updateUI();
}

function setSkewV(value, opts = {}) {
  const v = clamp(value, -45, 45);
  state.skewV = v;
  if (!opts.fromSlider) els.skewVSlider.value = String(v);
  if (!opts.fromInput) els.skewVInput.value = fmtAngle(v);
  state.isDirty = true;
  scheduleRender();
  updateUI();
}

function syncRotationUI() {
  els.rotationSlider.value = String(state.rotation);
  els.rotationInput.value = fmtAngle(state.rotation);
}

function syncSkewUI() {
  els.skewHSlider.value = String(state.skewH);
  els.skewHInput.value = fmtAngle(state.skewH);
  els.skewVSlider.value = String(state.skewV);
  els.skewVInput.value = fmtAngle(state.skewV);
}

els.rotationSlider.addEventListener('input', (e) => setRotation(e.target.value, { fromSlider: true }));
els.rotationInput.addEventListener('input', (e) => setRotation(e.target.value, { fromInput: true }));
els.rotationQuickBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const delta = Number(btn.dataset.rotationQuick);
    // Pulsante "0" resetta a 0; gli altri sommano in modo incrementale.
    if (delta === 0) {
      setRotation(0);
      return;
    }
    let next = state.rotation + delta;
    while (next > 180) next -= 360;
    while (next <= -180) next += 360;
    setRotation(next);
  });
});

els.skewHSlider.addEventListener('input', (e) => setSkewH(e.target.value, { fromSlider: true }));
els.skewHInput.addEventListener('input', (e) => setSkewH(e.target.value, { fromInput: true }));
els.skewHQuickBtns.forEach((btn) => {
  btn.addEventListener('click', () => setSkewH(btn.dataset.skewHQuick));
});

els.skewVSlider.addEventListener('input', (e) => setSkewV(e.target.value, { fromSlider: true }));
els.skewVInput.addEventListener('input', (e) => setSkewV(e.target.value, { fromInput: true }));
els.skewVQuickBtns.forEach((btn) => {
  btn.addEventListener('click', () => setSkewV(btn.dataset.skewVQuick));
});

// === CROP ===

function getPreviewDisplayRect() {
  // Posizione del previewCanvas rispetto al cropOverlay
  const c = els.previewCanvas.getBoundingClientRect();
  const o = els.cropOverlay.getBoundingClientRect();
  return {
    left: c.left - o.left,
    top: c.top - o.top,
    width: c.width,
    height: c.height,
  };
}

function updateCropOverlay() {
  if (!state.cropMode || !state.cropRect) return;
  const r = getPreviewDisplayRect();
  const cx = r.left + state.cropRect.x * r.width;
  const cy = r.top + state.cropRect.y * r.height;
  const cw = state.cropRect.w * r.width;
  const ch = state.cropRect.h * r.height;

  els.cropRectEl.style.left = `${cx}px`;
  els.cropRectEl.style.top = `${cy}px`;
  els.cropRectEl.style.width = `${cw}px`;
  els.cropRectEl.style.height = `${ch}px`;

  // Shade circondano il rect, ma solo dentro l'area del previewCanvas (non oltre)
  els.cropShadeTop.style.left = `${r.left}px`;
  els.cropShadeTop.style.top = `${r.top}px`;
  els.cropShadeTop.style.width = `${r.width}px`;
  els.cropShadeTop.style.height = `${cy - r.top}px`;

  els.cropShadeBottom.style.left = `${r.left}px`;
  els.cropShadeBottom.style.top = `${cy + ch}px`;
  els.cropShadeBottom.style.width = `${r.width}px`;
  els.cropShadeBottom.style.height = `${(r.top + r.height) - (cy + ch)}px`;

  els.cropShadeLeft.style.left = `${r.left}px`;
  els.cropShadeLeft.style.top = `${cy}px`;
  els.cropShadeLeft.style.width = `${cx - r.left}px`;
  els.cropShadeLeft.style.height = `${ch}px`;

  els.cropShadeRight.style.left = `${cx + cw}px`;
  els.cropShadeRight.style.top = `${cy}px`;
  els.cropShadeRight.style.width = `${(r.left + r.width) - (cx + cw)}px`;
  els.cropShadeRight.style.height = `${ch}px`;
}

function enterCropMode() {
  if (!state.imageBitmap) return;
  state.cropBackup = state.cropRect ? { ...state.cropRect } : null;
  if (!state.cropRect) {
    // Default: centrato, 80% di lato
    state.cropRect = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
  }
  state.cropMode = true;
  els.cropOverlay.hidden = false;
  scheduleRender();
  updateUI();
  requestAnimationFrame(updateCropOverlay);
}

function confirmCrop() {
  state.cropMode = false;
  state.cropBackup = null;
  state.isDirty = true;
  els.cropOverlay.hidden = true;
  scheduleRender();
  updateUI();
}

function cancelCrop() {
  state.cropMode = false;
  state.cropRect = state.cropBackup;
  state.cropBackup = null;
  els.cropOverlay.hidden = true;
  scheduleRender();
  updateUI();
}

function removeCrop() {
  state.cropRect = null;
  state.cropMode = false;
  state.cropBackup = null;
  state.isDirty = true;
  els.cropOverlay.hidden = true;
  scheduleRender();
  updateUI();
}

function setupCropDrag(handle) {
  const role = handle.dataset.crop;  // 'nw','n','ne','e','se','s','sw','w'
  let dragging = false;
  let startX = 0, startY = 0;
  let startRect = null;
  let displayRect = null;

  handle.addEventListener('pointerdown', (e) => {
    if (!state.cropMode) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    startRect = { ...state.cropRect };
    displayRect = getPreviewDisplayRect();
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - startX) / displayRect.width;
    const dy = (e.clientY - startY) / displayRect.height;
    const r = resizeRect(startRect, role, dx, dy);
    state.cropRect = r;
    updateCropOverlay();
    state.isDirty = true;
    updateUI();
  });

  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}

function resizeRect(r, role, dx, dy) {
  let { x, y, w, h } = r;
  const minSize = 0.02;
  if (role.includes('n')) { y += dy; h -= dy; }
  if (role.includes('s')) { h += dy; }
  if (role.includes('w')) { x += dx; w -= dx; }
  if (role.includes('e')) { w += dx; }
  if (w < minSize) { x -= (minSize - w); w = minSize; }
  if (h < minSize) { y -= (minSize - h); h = minSize; }
  if (x < 0) { w += x; x = 0; }
  if (y < 0) { h += y; y = 0; }
  if (x + w > 1) { w = 1 - x; }
  if (y + h > 1) { h = 1 - y; }
  return { x, y, w, h };
}

els.cropHandles.forEach(setupCropDrag);

(function setupCropRectDrag() {
  let dragging = false;
  let startX = 0, startY = 0;
  let startRect = null;
  let displayRect = null;

  els.cropRectEl.addEventListener('pointerdown', (e) => {
    if (!state.cropMode) return;
    if (e.target !== els.cropRectEl) return;  // ignora se ho cliccato su una maniglia
    e.preventDefault();
    dragging = true;
    els.cropRectEl.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    startRect = { ...state.cropRect };
    displayRect = getPreviewDisplayRect();
  });

  els.cropRectEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - startX) / displayRect.width;
    const dy = (e.clientY - startY) / displayRect.height;
    let nx = startRect.x + dx;
    let ny = startRect.y + dy;
    nx = Math.max(0, Math.min(1 - startRect.w, nx));
    ny = Math.max(0, Math.min(1 - startRect.h, ny));
    state.cropRect = { x: nx, y: ny, w: startRect.w, h: startRect.h };
    updateCropOverlay();
    state.isDirty = true;
    updateUI();
  });

  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    try { els.cropRectEl.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  els.cropRectEl.addEventListener('pointerup', stop);
  els.cropRectEl.addEventListener('pointercancel', stop);
})();

els.cropEnterBtn.addEventListener('click', enterCropMode);
els.cropConfirmBtn.addEventListener('click', confirmCrop);
els.cropCancelBtn.addEventListener('click', cancelCrop);
els.cropRemoveBtn.addEventListener('click', removeCrop);

// === END CROP ===

// === LEVEL TOOL (linea) ===

function setTool(tool) {
  state.tool = tool;
  els.toolButtons.forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
  els.perspectivePanel.hidden = tool !== 'perspective';
  els.levelPanel.hidden = tool !== 'level';
  els.handlesOverlay.hidden = tool !== 'perspective';
  els.lineOverlay.hidden = tool !== 'level';
  if (tool === 'level') syncLineAngleDisplay();
  state.isDirty = true;
  scheduleRender();
  updateUI();
}

function updateLineOverlay() {
  if (state.tool !== 'level' || !state.imageBitmap || !state.preBounds || !state.linePoints) return;
  const canvas = els.originalCanvas;
  const overlay = els.lineOverlay;
  const cRect = canvas.getBoundingClientRect();
  const oRect = overlay.getBoundingClientRect();
  const offX = cRect.left - oRect.left;
  const offY = cRect.top - oRect.top;
  const scaleX = cRect.width / canvas.width;
  const scaleY = cRect.height / canvas.height;

  const positions = state.linePoints.map(([x, y]) => {
    const [preX, preY] = imageToPre(x, y);
    return [offX + preX * scaleX, offY + preY * scaleY];
  });

  els.lineSvg.setAttribute('x1', positions[0][0]);
  els.lineSvg.setAttribute('y1', positions[0][1]);
  els.lineSvg.setAttribute('x2', positions[1][0]);
  els.lineSvg.setAttribute('y2', positions[1][1]);

  els.lineHandles.forEach((h, i) => {
    h.style.left = `${positions[i][0]}px`;
    h.style.top = `${positions[i][1]}px`;
  });
}

// Calcola rotation, asse target e angolo della linea.
// Snap all'asse cardinale (orizzontale 0° o verticale ±90°) più vicino:
// se la linea è entro 45° dall'orizzontale, raddrizza all'orizzontale;
// altrimenti raddrizza al verticale.
function lineRotationInfo() {
  const [p1, p2] = state.linePoints;
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angleDeg > 90) angleDeg -= 180;
  if (angleDeg < -90) angleDeg += 180;

  const candidates = [
    { angle: 0, axis: 'horizontal' },
    { angle: 90, axis: 'vertical' },
    { angle: -90, axis: 'vertical' },
  ];
  let nearest = candidates[0];
  let minDiff = Infinity;
  for (const c of candidates) {
    const diff = Math.abs(angleDeg - c.angle);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = c;
    }
  }
  return {
    rotation: -(angleDeg - nearest.angle),
    axis: nearest.axis,
    lineAngle: angleDeg,
  };
}

function rotationFromLine() {
  return lineRotationInfo().rotation;
}

function setupLineHandleDrag(handle, idx) {
  let dragging = false;
  let scaleX = 1;
  let scaleY = 1;
  let pointerOffsetX = 0;
  let pointerOffsetY = 0;

  handle.addEventListener('pointerdown', (e) => {
    if (!state.imageBitmap || state.tool !== 'level') return;
    e.preventDefault();
    dragging = true;
    handle.classList.add('dragging');
    handle.setPointerCapture(e.pointerId);
    const cRect = els.originalCanvas.getBoundingClientRect();
    scaleX = els.originalCanvas.width / cRect.width;
    scaleY = els.originalCanvas.height / cRect.height;
    const [preX, preY] = imageToPre(state.linePoints[idx][0], state.linePoints[idx][1]);
    pointerOffsetX = (e.clientX - cRect.left) * scaleX - preX;
    pointerOffsetY = (e.clientY - cRect.top) * scaleY - preY;
    showLoupe();
    updateLoupe(e.clientX, e.clientY);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const cRect = els.originalCanvas.getBoundingClientRect();
    const preX = (e.clientX - cRect.left) * scaleX - pointerOffsetX;
    const preY = (e.clientY - cRect.top) * scaleY - pointerOffsetY;
    const [imgX, imgY] = preToImage(preX, preY);
    const w = state.imageBitmap.width;
    const h = state.imageBitmap.height;
    state.linePoints[idx] = [
      Math.max(0, Math.min(w, imgX)),
      Math.max(0, Math.min(h, imgY)),
    ];
    updateLineOverlay();
    syncLineAngleDisplay();
    updateLoupe(e.clientX, e.clientY);
  });

  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
    hideLoupe();
  };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}

els.lineHandles.forEach((h, i) => setupLineHandleDrag(h, i));

function syncLineAngleDisplay() {
  if (!state.linePoints) {
    els.lineAngleDisplay.textContent = '—';
    return;
  }
  const info = lineRotationInfo();
  const fmt = (v) => {
    const s = v.toFixed(2).replace(/\.?0+$/, '');
    return v > 0 ? `+${s}` : s;
  };
  els.lineAngleDisplay.textContent = `${fmt(info.lineAngle)}° → ${info.axis} axis (rot. ${fmt(info.rotation)}°)`;
}

function applyLine() {
  if (!state.imageBitmap || state.tool !== 'level') return;
  setRotation(rotationFromLine());
}

function resetLine() {
  if (!state.imageBitmap) return;
  state.linePoints = initialLine(state.imageBitmap.width, state.imageBitmap.height);
  syncLineAngleDisplay();
  updateLineOverlay();
  state.isDirty = true;
  updateUI();
}

els.toolButtons.forEach((btn) => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});
els.applyLineBtn.addEventListener('click', applyLine);
els.resetLineBtn.addEventListener('click', resetLine);

// === END LEVEL TOOL ===

// === RESIZE ===

function syncResizeUI(naturalW = stageC.width, naturalH = stageC.height) {
  els.resizeWInput.value = String(Math.round(state.resizeW || naturalW));
  els.resizeHInput.value = String(Math.round(state.resizeH || naturalH));
  const pct = naturalW > 0 ? ((state.resizeW || naturalW) / naturalW) * 100 : 100;
  els.resizePctInput.value = pct.toFixed(1).replace(/\.0$/, '');
  els.lockAspectInput.checked = state.lockAspect;
}

function naturalAspect() {
  return stageC.width > 0 && stageC.height > 0 ? stageC.width / stageC.height : 1;
}

function setResizeFromW(value) {
  const w = clamp(value, 1, 100000);
  state.resizeActive = true;
  state.resizeW = w;
  if (state.lockAspect) state.resizeH = Math.max(1, Math.round(w / naturalAspect()));
  state.isDirty = true;
  syncResizeUI();
  scheduleRender();
  updateUI();
}

function setResizeFromH(value) {
  const h = clamp(value, 1, 100000);
  state.resizeActive = true;
  state.resizeH = h;
  if (state.lockAspect) state.resizeW = Math.max(1, Math.round(h * naturalAspect()));
  state.isDirty = true;
  syncResizeUI();
  scheduleRender();
  updateUI();
}

function setResizeFromPct(value) {
  const pct = clamp(value, 0.1, 1000);
  state.resizeActive = true;
  state.resizeW = Math.max(1, Math.round((stageC.width * pct) / 100));
  state.resizeH = Math.max(1, Math.round((stageC.height * pct) / 100));
  state.isDirty = true;
  syncResizeUI();
  scheduleRender();
  updateUI();
}

function setLockAspect(checked) {
  state.lockAspect = !!checked;
  if (state.lockAspect && state.resizeActive) {
    state.resizeH = Math.max(1, Math.round(state.resizeW / naturalAspect()));
    syncResizeUI();
    scheduleRender();
  }
  updateUI();
}

function resetResize() {
  state.resizeActive = false;
  state.resizeW = stageC.width;
  state.resizeH = stageC.height;
  state.isDirty = true;
  scheduleRender();
  updateUI();
}

els.resizeWInput.addEventListener('input', (e) => setResizeFromW(e.target.value));
els.resizeHInput.addEventListener('input', (e) => setResizeFromH(e.target.value));
els.resizePctInput.addEventListener('input', (e) => setResizeFromPct(e.target.value));
els.lockAspectInput.addEventListener('change', (e) => setLockAspect(e.target.checked));
els.resizeResetBtn.addEventListener('click', resetResize);

// === END RESIZE ===

// === FORMAT / QUALITY ===

function syncFormatUI() {
  els.formatSelect.value = state.outputFormat;
  els.qualityRow.hidden = state.outputFormat === 'png';
  els.qualitySlider.value = String(state.jpgQuality);
  els.qualityInput.value = String(state.jpgQuality);
}

function setFormat(fmt) {
  state.outputFormat = fmt;
  syncFormatUI();
}

function setQuality(value, opts = {}) {
  const q = clamp(value, 1, 100);
  state.jpgQuality = q;
  if (!opts.fromSlider) els.qualitySlider.value = String(q);
  if (!opts.fromInput) els.qualityInput.value = String(q);
}

els.formatSelect.addEventListener('change', (e) => setFormat(e.target.value));
els.qualitySlider.addEventListener('input', (e) => setQuality(e.target.value, { fromSlider: true }));
els.qualityInput.addEventListener('input', (e) => setQuality(e.target.value, { fromInput: true }));

// === END FORMAT ===

// === RESET ALL ===

function resetAll() {
  if (!state.imageBitmap) return;
  state.corners = initialCorners(state.imageBitmap.width, state.imageBitmap.height);
  state.rotation = 0;
  state.skewH = 0;
  state.skewV = 0;
  state.cropRect = null;
  state.cropMode = false;
  state.cropBackup = null;
  state.resizeActive = false;
  state.isDirty = true;
  els.cropOverlay.hidden = true;
  syncRotationUI();
  syncSkewUI();
  scheduleRender();
  requestAnimationFrame(updateHandlesPositions);
  updateUI();
}

els.topbarResetBtn.addEventListener('click', resetAll);
window.api.onMenuResetAll(resetAll);

function closeImage() {
  state.imageBitmap = null;
  state.filePath = null;
  state.corners = null;
  state.cropMode = false;
  state.cropRect = null;
  state.cropBackup = null;
  state.resizeActive = false;
  state.preBounds = null;
  state.linePoints = null;
  state.tool = 'perspective';
  state.isDirty = false;
  els.dualCanvas.hidden = true;
  els.emptyState.hidden = false;
  els.cropOverlay.hidden = true;
  els.lineOverlay.hidden = true;
  els.handlesOverlay.hidden = false;
  els.toolButtons.forEach((b) => b.classList.toggle('active', b.dataset.tool === 'perspective'));
  els.perspectivePanel.hidden = false;
  els.levelPanel.hidden = true;
  updateUI();
}

els.topbarOpenBtn.addEventListener('click', pickAndOpen);
els.topbarCloseBtn.addEventListener('click', closeImage);

// === END RESET ALL ===

// === PASTE ===

window.addEventListener('paste', async (e) => {
  if (!e.clipboardData) return;
  for (const item of e.clipboardData.items) {
    if (item.type && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        await openImageFromFile(file);
        return;
      }
    }
  }
});

// === END PASTE ===

function updateUI() {
  const hasImage = !!state.imageBitmap;
  els.saveAsBtn.disabled = !hasImage;
  els.saveBtn.disabled = !hasImage || !state.filePath;
  els.resetCornersBtn.disabled = !hasImage;
  els.rotationSlider.disabled = !hasImage;
  els.rotationInput.disabled = !hasImage;
  els.rotationQuickBtns.forEach((b) => { b.disabled = !hasImage; });
  els.skewHSlider.disabled = !hasImage;
  els.skewHInput.disabled = !hasImage;
  els.skewHQuickBtns.forEach((b) => { b.disabled = !hasImage; });
  els.skewVSlider.disabled = !hasImage;
  els.skewVInput.disabled = !hasImage;
  els.skewVQuickBtns.forEach((b) => { b.disabled = !hasImage; });
  els.cropEnterBtn.disabled = !hasImage;
  els.cropEnterBtn.textContent = state.cropRect ? 'Edit crop…' : 'Crop…';
  els.cropRemoveBtn.hidden = !state.cropRect || state.cropMode;
  els.cropIdleControls.hidden = state.cropMode;
  els.cropActiveControls.hidden = !state.cropMode;
  els.resizeWInput.disabled = !hasImage;
  els.resizeHInput.disabled = !hasImage;
  els.resizePctInput.disabled = !hasImage;
  els.lockAspectInput.disabled = !hasImage;
  els.resizeResetBtn.disabled = !hasImage || !state.resizeActive;
  els.formatSelect.disabled = !hasImage;
  els.qualitySlider.disabled = !hasImage;
  els.qualityInput.disabled = !hasImage;
  els.topbarCloseBtn.disabled = !hasImage;
  els.topbarResetBtn.disabled = !hasImage;
  els.toolButtons.forEach((b) => { b.disabled = !hasImage; });
  els.resetLineBtn.disabled = !hasImage;
  els.applyLineBtn.disabled = !hasImage;
  els.fileInfo.classList.toggle('dirty', state.isDirty);

  if (!hasImage) {
    els.fileInfo.textContent = 'No file open';
    return;
  }
  const dims = `${state.imageBitmap.width}×${state.imageBitmap.height}`;
  const name = state.filePath ? state.filePath.split('/').pop() : '(from clipboard)';
  els.fileInfo.textContent = `${name} — ${dims}`;
}

function encodeCanvas(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))),
      mimeType,
      quality,
    );
  });
}

async function writeBlobTo(filePath, blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  await window.api.writeImage(filePath, buf);
}

function qualityForMime(mime) {
  if (mime === 'image/jpeg' || mime === 'image/webp') return state.jpgQuality / 100;
  return undefined;
}

async function saveCurrent() {
  if (!state.imageBitmap) return;
  if (!state.filePath) {
    await saveAs();
    return;
  }
  const mime = mimeFromPath(state.filePath);
  const blob = await encodeCanvas(els.previewCanvas, mime, qualityForMime(mime));
  await writeBlobTo(state.filePath, blob);
  state.isDirty = false;
  updateUI();
}

async function saveAs() {
  if (!state.imageBitmap) return;
  const ext = extForFormat(state.outputFormat);
  const suggested = state.filePath
    ? state.filePath.replace(/\.[^.]+$/, '') + '.' + ext
    : `untitled.${ext}`;
  const targetPath = await window.api.saveAsDialog(suggested);
  if (!targetPath) return;
  const mime = mimeFromPath(targetPath);
  const blob = await encodeCanvas(els.previewCanvas, mime, qualityForMime(mime));
  await writeBlobTo(targetPath, blob);
  state.filePath = targetPath;
  state.outputFormat = formatFromPath(targetPath);
  syncFormatUI();
  state.isDirty = false;
  updateUI();
}

async function pickAndOpen() {
  const result = await window.api.openImage();
  if (!result) return;
  await openImageFromBytes(result.bytes, result.filePath);
}

els.openBtn.addEventListener('click', pickAndOpen);
els.saveBtn.addEventListener('click', saveCurrent);
els.saveAsBtn.addEventListener('click', saveAs);
els.resetCornersBtn.addEventListener('click', resetCorners);

window.api.onMenuOpen(pickAndOpen);
window.api.onMenuSave(saveCurrent);
window.api.onMenuSaveAs(saveAs);

// "Open with Quadra" dal Finder, oppure drag su icona Dock.
window.api.onOSOpenFile(async (filePath) => {
  try {
    const result = await window.api.readImage(filePath);
    await openImageFromBytes(result.bytes, result.filePath);
  } catch (err) {
    alert(`Could not open file: ${err.message || err}`);
  }
});

els.canvasArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  els.canvasArea.classList.add('dragover');
});
els.canvasArea.addEventListener('dragleave', () => {
  els.canvasArea.classList.remove('dragover');
});
els.canvasArea.addEventListener('drop', async (e) => {
  e.preventDefault();
  els.canvasArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) await openImageFromFile(file);
});

window.addEventListener('resize', () => {
  if (state.imageBitmap) {
    requestAnimationFrame(() => {
      updateHandlesPositions();
      updateCropOverlay();
    });
  }
});

updateUI();
