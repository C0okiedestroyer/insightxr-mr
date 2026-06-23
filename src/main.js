import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./style.css";
import { MODEL_LIBRARY, MODEL_IDS, CATEGORY_COLORS } from "./data.js";
import { componentExplosion, formatPercent } from "./explosion.js";
import { createProductModel } from "./model.js";
import { ARTrackingController } from "./ar-tracking.js";
import { annotationSummary, computeAnnotationLayout } from "./annotations.js";
import {
  SECTION_AXES,
  clampSectionProgress,
  sectionCoordinate,
  sectionDisplayPercent,
  sectionNormalSign,
} from "./cross-section.js";
import {
  assemblyProgress,
  assemblyScore,
  buildAssemblySequence,
  currentAssemblyPart,
  formatAssemblyTime,
} from "./assembly.js";

const currentPageUrl = new URL(window.location.href);
if (currentPageUrl.searchParams.has("arReturn")) {
  currentPageUrl.searchParams.delete("arReturn");
  window.history.replaceState(null, "", currentPageUrl);
}
const returnedModelId = window.sessionStorage.getItem("insightxr-return-model");
window.sessionStorage.removeItem("insightxr-return-model");
const initialModelId = MODEL_IDS.includes(returnedModelId) ? returnedModelId : "aerocore";

const dom = {
  viewport: document.querySelector("#viewport"),
  modelSelect: document.querySelector("#model-select"),
  modelCode: document.querySelector("#model-code"),
  modelName: document.querySelector("#model-name"),
  modelVariant: document.querySelector("#model-variant"),
  modelSubtitle: document.querySelector("#model-subtitle"),
  componentCount: document.querySelector("#component-count"),
  systemCount: document.querySelector("#system-count"),
  guideCount: document.querySelector("#guide-count"),
  studioMode: document.querySelector("#studio-mode"),
  cameraMode: document.querySelector("#camera-mode"),
  fullscreen: document.querySelector("#fullscreen-button"),
  slider: document.querySelector("#explosion-slider"),
  sliderOutput: document.querySelector("#explosion-output"),
  componentList: document.querySelector("#component-list"),
  partDetail: document.querySelector("#part-detail"),
  search: document.querySelector("#component-search"),
  categoryTabs: document.querySelector("#category-tabs"),
  visibleCount: document.querySelector("#visible-count"),
  labelLayer: document.querySelector("#label-layer"),
  inspectTool: document.querySelector("#inspect-tool"),
  placeTool: document.querySelector("#place-tool"),
  xrayTool: document.querySelector("#xray-tool"),
  sectionTool: document.querySelector("#section-tool"),
  sectionControl: document.querySelector("#section-control"),
  sectionAxisButtons: document.querySelector("#section-axis-buttons"),
  sectionSlider: document.querySelector("#section-slider"),
  sectionOutput: document.querySelector("#section-output"),
  sectionClose: document.querySelector("#section-close"),
  labelsTool: document.querySelector("#labels-tool"),
  annotationsTool: document.querySelector("#annotations-tool"),
  assemblyTool: document.querySelector("#assembly-tool"),
  resetTool: document.querySelector("#reset-tool"),
  previousStep: document.querySelector("#previous-step"),
  nextStep: document.querySelector("#next-step"),
  playGuide: document.querySelector("#play-guide"),
  playIcon: document.querySelector("#play-icon"),
  playLabel: document.querySelector("#play-label"),
  stepCount: document.querySelector("#step-count"),
  stepProgress: document.querySelector("#step-progress"),
  stepKicker: document.querySelector("#step-kicker"),
  stepTitle: document.querySelector("#step-title"),
  stepDescription: document.querySelector("#step-description"),
  hint: document.querySelector("#interaction-hint"),
  reticle: document.querySelector("#mr-reticle"),
  challengeButton: document.querySelector("#challenge-button"),
  challengeOverlay: document.querySelector("#challenge-overlay"),
  challengePrompt: document.querySelector("#challenge-prompt"),
  challengeProgress: document.querySelector("#challenge-progress"),
  exitChallenge: document.querySelector("#exit-challenge"),
  assemblyOverlay: document.querySelector("#assembly-overlay"),
  assemblyPrompt: document.querySelector("#assembly-prompt"),
  assemblyDetail: document.querySelector("#assembly-detail"),
  assemblyProgressBar: document.querySelector("#assembly-progress-bar"),
  assemblyStep: document.querySelector("#assembly-step"),
  assemblyTime: document.querySelector("#assembly-time"),
  assemblyScore: document.querySelector("#assembly-score"),
  assemblyHint: document.querySelector("#assembly-hint"),
  exitAssembly: document.querySelector("#exit-assembly"),
  toastRegion: document.querySelector("#toast-region"),
  arDialog: document.querySelector("#ar-mode-dialog"),
  closeArDialog: document.querySelector("#close-ar-dialog"),
  surfaceArButton: document.querySelector("#surface-ar-button"),
  markerArButton: document.querySelector("#marker-ar-button"),
  surfaceSupport: document.querySelector("#surface-support"),
  arOverlay: document.querySelector("#tracked-ar-overlay"),
  arTopControls: document.querySelector(".ar-top-controls"),
  arControlDock: document.querySelector(".ar-control-dock"),
  arControlsToggle: document.querySelector("#ar-controls-toggle"),
  arOcclusionButton: document.querySelector("#ar-occlusion-button"),
  arStatusTitle: document.querySelector("#ar-status-title"),
  arStatusDetail: document.querySelector("#ar-status-detail"),
  placementGuide: document.querySelector("#ar-placement-guide"),
  placementGuideTitle: document.querySelector("#placement-guide-title"),
  placementGuideDetail: document.querySelector("#placement-guide-detail"),
  markerDiagnostics: document.querySelector("#marker-diagnostics"),
  cameraCheck: document.querySelector("#camera-check"),
  trackerCheck: document.querySelector("#tracker-check"),
  markerCheck: document.querySelector("#marker-check"),
  exitArButton: document.querySelector("#exit-ar-button"),
  arSlider: document.querySelector("#ar-explosion-slider"),
  arSliderOutput: document.querySelector("#ar-explosion-output"),
  arXrayButton: document.querySelector("#ar-xray-button"),
  arSectionButton: document.querySelector("#ar-section-button"),
  arSectionPanel: document.querySelector("#ar-section-panel"),
  arSectionAxisButtons: document.querySelector("#ar-section-axis-buttons"),
  arSectionSlider: document.querySelector("#ar-section-slider"),
  arSectionOutput: document.querySelector("#ar-section-output"),
  replaceAnchorButton: document.querySelector("#replace-anchor-button"),
  replaceAnchorLabel: document.querySelector("#replace-anchor-label"),
  arRotateLeft: document.querySelector("#ar-rotate-left"),
  arRotateRight: document.querySelector("#ar-rotate-right"),
  arScaleSlider: document.querySelector("#ar-scale-slider"),
  arScaleOutput: document.querySelector("#ar-scale-output"),
  arResetTransform: document.querySelector("#ar-reset-transform"),
  arMoveLeft: document.querySelector("#ar-move-left"),
  arMoveRight: document.querySelector("#ar-move-right"),
  arMoveForward: document.querySelector("#ar-move-forward"),
  arMoveBack: document.querySelector("#ar-move-back"),
  arMoveUp: document.querySelector("#ar-move-up"),
  arMoveDown: document.querySelector("#ar-move-down"),
  arComponentSelect: document.querySelector("#ar-component-select"),
  arComponentInfo: document.querySelector("#ar-component-info"),
  arModelSelect: document.querySelector("#ar-model-select"),
  arIsolateButton: document.querySelector("#ar-isolate-button"),
  arShowAllButton: document.querySelector("#ar-show-all-button"),
  arGuidePrevious: document.querySelector("#ar-guide-previous"),
  arGuideNext: document.querySelector("#ar-guide-next"),
  arGuideInfo: document.querySelector("#ar-guide-info"),
  arSpinButton: document.querySelector("#ar-spin-button"),
  arAnnotationsButton: document.querySelector("#ar-annotations-button"),
  arAssemblyButton: document.querySelector("#ar-assembly-button"),
  arAssemblyPanel: document.querySelector("#ar-assembly-panel"),
  arAssemblyPrompt: document.querySelector("#ar-assembly-prompt"),
  arAssemblyDetail: document.querySelector("#ar-assembly-detail"),
  arAssemblyProgressBar: document.querySelector("#ar-assembly-progress-bar"),
  arAssemblyStep: document.querySelector("#ar-assembly-step"),
  arAssemblyTime: document.querySelector("#ar-assembly-time"),
  arAssemblyScore: document.querySelector("#ar-assembly-score"),
  arAssemblyHint: document.querySelector("#ar-assembly-hint"),
  arExitAssembly: document.querySelector("#ar-exit-assembly"),
  annotationLayer: document.querySelector("#spatial-annotation-layer"),
  annotationCard: document.querySelector("#spatial-annotation"),
  annotationLine: document.querySelector("#annotation-line"),
  annotationTarget: document.querySelector("#annotation-target"),
  annotationIndex: document.querySelector("#annotation-index"),
  annotationCategory: document.querySelector("#annotation-category"),
  annotationRisk: document.querySelector("#annotation-risk"),
  annotationTitle: document.querySelector("#annotation-title"),
  annotationRole: document.querySelector("#annotation-role"),
  annotationMetric: document.querySelector("#annotation-metric"),
  annotationService: document.querySelector("#annotation-service"),
};

const state = {
  explosion: 0,
  targetExplosion: 0,
  selectedPartId: null,
  category: "All",
  search: "",
  xray: false,
  labels: true,
  annotations: true,
  mode: "inspect",
  guideStep: 0,
  guidePlaying: false,
  guideTimer: null,
  arMode: null,
  arStarting: false,
  arEnding: false,
  arControlsExpanded: false,
  occlusionStatus: "unavailable",
  occlusionAvailable: false,
  occlusionEnabled: false,
  occlusionSource: null,
  challenge: null,
  removedParts: new Set(),
  modelId: initialModelId,
  isolateSelected: false,
  arSpin: false,
  sectionEnabled: false,
  sectionAxis: "x",
  sectionProgress: 0.5,
  assembly: null,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe6ecee);
scene.fog = new THREE.Fog(0xe6ecee, 11, 22);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(7.3, 4.8, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(dom.viewport.clientWidth, dom.viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.localClippingEnabled = true;
dom.viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 5.2;
controls.maxDistance = 15;
controls.target.set(0, 0, 0);
controls.autoRotate = false;
controls.autoRotateSpeed = 0.7;

scene.add(new THREE.HemisphereLight(0xf5fbff, 0x526069, 2.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
keyLight.position.set(4, 7, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 20;
keyLight.shadow.camera.left = -6;
keyLight.shadow.camera.right = 6;
keyLight.shadow.camera.top = 6;
keyLight.shadow.camera.bottom = -6;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x58d9ee, 2.2);
rimLight.position.set(-5, 2, -4);
scene.add(rimLight);

const groundMaterial = new THREE.ShadowMaterial({ color: 0x52666e, opacity: 0.13 });
const ground = new THREE.Mesh(new THREE.CircleGeometry(5.5, 64), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.03;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(11, 22, 0x82969e, 0xaab9be);
grid.position.y = -2.02;
grid.material.transparent = true;
grid.material.opacity = 0.12;
scene.add(grid);

const modelStage = new THREE.Group();
modelStage.name = "Tracked model stage";
scene.add(modelStage);

const modelInstances = new Map();
let activeDefinition = MODEL_LIBRARY[state.modelId];
let activeModel = createProductModel(state.modelId);
let { assembly, parts, effectGroup } = activeModel;
modelInstances.set(state.modelId, activeModel);
modelStage.add(assembly);

const arTracking = new ARTrackingController({
  renderer,
  scene,
  camera,
  stage: modelStage,
  onStatus: updateARStatus,
  onEnd: restoreStudioAfterAR,
  onOcclusion: updateOcclusionStatus,
  onSelect: handleARSelect,
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const labelBounds = new THREE.Box3();
const labelElements = new Map();
const labelWorldPosition = new THREE.Vector3();
const labelWorldOffset = new THREE.Vector3();
const labelWorldScale = new THREE.Vector3();
const labelWorldQuaternion = new THREE.Quaternion();
const labelCameraPosition = new THREE.Vector3();
const labelCameraDirection = new THREE.Vector3();
const labelToPart = new THREE.Vector3();
const annotationWorldPosition = new THREE.Vector3();
const sectionBounds = new THREE.Box3();
const sectionBoundsSize = new THREE.Vector3();
const sectionPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
const sectionLocalNormal = new THREE.Vector3();
const sectionWorldNormal = new THREE.Vector3();
const sectionLocalPoint = new THREE.Vector3();
const sectionWorldPoint = new THREE.Vector3();
const sectionAssemblyInverse = new THREE.Matrix4();
const sectionObjectMatrix = new THREE.Matrix4();
const sectionCorner = new THREE.Vector3();
const sectionHelper = new THREE.Group();
sectionHelper.name = "Cross-section plane";
sectionHelper.userData.isSectionHelper = true;
const sectionHelperSurface = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    color: 0x5de3e9,
    transparent: true,
    opacity: 0.11,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
  }),
);
const sectionHelperOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(sectionHelperSurface.geometry),
  new THREE.LineBasicMaterial({
    color: 0x31cdd7,
    transparent: true,
    opacity: 0.72,
    depthTest: false,
  }),
);
sectionHelperSurface.renderOrder = 30;
sectionHelperOutline.renderOrder = 31;
sectionHelper.add(sectionHelperSurface, sectionHelperOutline);
const labelLayerHome = dom.labelLayer.parentElement;
const annotationLayerHome = dom.annotationLayer.parentElement;
let assemblyGhost = null;
let lastAssemblyHudUpdate = 0;
let pointerDown = null;
let draggingPlacement = false;
let studioReloadRequested = false;

function activeComponents() {
  return activeDefinition.components;
}

function activeGuideSteps() {
  return activeDefinition.guideSteps;
}

function activeServiceSequence() {
  return activeDefinition.serviceSequence;
}

function objectHasFlag(object, flag) {
  let current = object;
  while (current && current !== assembly.parent) {
    if (current.userData?.[flag]) return true;
    current = current.parent;
  }
  return false;
}

function activeAssemblySequence() {
  return buildAssemblySequence(activeComponents());
}

function removeAssemblyGhost() {
  if (!assemblyGhost) return;
  assemblyGhost.removeFromParent();
  assemblyGhost.traverse((child) => {
    if (child.material) {
      materialList(child.material).forEach((material) => material.dispose());
    }
  });
  assemblyGhost = null;
}

function createAssemblyGhost(partId) {
  removeAssemblyGhost();
  const source = parts.get(partId);
  if (!source) return;
  assemblyGhost = source.clone(true);
  assemblyGhost.name = `Assembly target · ${partId}`;
  assemblyGhost.userData.isAssemblyGhost = true;
  assemblyGhost.position.copy(source.userData.basePosition);
  assemblyGhost.quaternion.copy(source.userData.baseQuaternion);
  assemblyGhost.scale.copy(source.scale);
  assemblyGhost.traverse((child) => {
    child.userData = {
      ...child.userData,
      partId: null,
      isAssemblyGhost: true,
    };
    child.castShadow = false;
    child.receiveShadow = false;
    if (child.isMesh) {
      child.material = new THREE.MeshBasicMaterial({
        color: 0x5de3e9,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    } else if (child.isLine || child.isLineSegments) {
      child.material = new THREE.LineBasicMaterial({
        color: 0x82f6ef,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      });
    }
  });
  assembly.add(assemblyGhost);
}

function assemblyElapsed(now = performance.now()) {
  if (!state.assembly) return 0;
  return (state.assembly.completedAt ?? now) - state.assembly.startedAt;
}

function syncAssemblyUI(now = performance.now()) {
  const session = state.assembly;
  const active = Boolean(session);
  document.body.classList.toggle("assembly-active", active);
  dom.assemblyOverlay.classList.toggle("visible", active && !state.arMode);
  dom.arAssemblyPanel.classList.toggle("visible", active && Boolean(state.arMode));
  dom.assemblyTool.classList.toggle("active", active);
  dom.arAssemblyButton.classList.toggle("active", active);
  dom.assemblyTool.setAttribute("aria-label", active ? "Exit assembly mode" : "Start assembly mode");
  dom.arAssemblyButton.textContent = active ? "Exit assembly" : "Assembly";
  dom.slider.disabled = active;
  dom.arSlider.disabled = active;
  if (!session) return;

  const total = session.sequence.length;
  const progress = assemblyProgress(session.index, total);
  const expectedId = currentAssemblyPart(session.sequence, session.index);
  const component = activeComponents().find((item) => item.id === expectedId);
  const complete = session.completed;
  const prompt = complete
    ? "Assembly complete"
    : `Install ${component?.name ?? "the next component"}`;
  const detail = complete
    ? `${total} components installed in the validated service order.`
    : "Tap the matching separated part to snap it into the cyan ghost position.";
  const elapsed = assemblyElapsed(now);
  const score = assemblyScore({
    total,
    mistakes: session.mistakes,
    hints: session.hints,
    elapsedMs: elapsed,
  });

  [dom.assemblyPrompt, dom.arAssemblyPrompt].forEach((element) => {
    element.textContent = prompt;
  });
  [dom.assemblyDetail, dom.arAssemblyDetail].forEach((element) => {
    element.textContent = detail;
  });
  [dom.assemblyProgressBar, dom.arAssemblyProgressBar].forEach((element) => {
    element.style.width = `${Math.round(progress * 100)}%`;
  });
  [dom.assemblyStep, dom.arAssemblyStep].forEach((element) => {
    element.textContent = `${session.index} / ${total}`;
  });
  [dom.assemblyTime, dom.arAssemblyTime].forEach((element) => {
    element.textContent = formatAssemblyTime(elapsed);
  });
  [dom.assemblyScore, dom.arAssemblyScore].forEach((element) => {
    element.textContent = String(score);
  });
  [dom.assemblyHint, dom.arAssemblyHint].forEach((button) => {
    button.disabled = complete;
    button.textContent = complete ? "Completed" : "Show hint";
  });
}

function refreshAssemblyTarget() {
  if (!state.assembly || state.assembly.completed) {
    removeAssemblyGhost();
    return;
  }
  createAssemblyGhost(currentAssemblyPart(state.assembly.sequence, state.assembly.index));
}

function startAssemblyMode({ announce = true } = {}) {
  if (state.assembly) return;
  setGuidePlaying(false);
  if (state.challenge) exitChallenge();
  state.removedParts.clear();
  state.isolateSelected = false;
  state.arSpin = false;
  state.xray = false;
  dom.xrayTool.classList.remove("active");
  dom.arXrayButton.classList.remove("active");
  if (state.sectionEnabled) setSectionEnabled(false);
  state.selectedPartId = null;
  state.assembly = {
    sequence: activeAssemblySequence(),
    index: 0,
    mistakes: 0,
    hints: 0,
    placed: new Set(),
    startedAt: performance.now(),
    completedAt: null,
    completed: false,
    snap: null,
  };
  setInteractionMode("inspect");
  setExplosionTarget(1, true);
  refreshAssemblyTarget();
  setMaterialState();
  syncAssemblyUI();
  if (announce) {
    showToast("Assembly mode started — rebuild from the inside out.", "success");
  }
}

function exitAssemblyMode({ restore = true, announce = false } = {}) {
  if (!state.assembly) return;
  removeAssemblyGhost();
  state.assembly = null;
  state.selectedPartId = null;
  if (restore) setExplosionTarget(0, true);
  setMaterialState();
  syncAssemblyUI();
  if (announce) showToast("Assembly mode closed.");
}

function handleAssemblySelection(partId) {
  const session = state.assembly;
  if (!session || session.completed || !partId) return;
  if (session.snap) {
    showToast("Let the current component finish snapping into place.");
    return;
  }
  const expectedId = currentAssemblyPart(session.sequence, session.index);
  if (partId !== expectedId) {
    session.mistakes += 1;
    const expected = activeComponents().find((item) => item.id === expectedId);
    showToast(`${expected?.name ?? "Another component"} must be installed first.`, "error");
    renderer.domElement.classList.remove("shake");
    requestAnimationFrame(() => renderer.domElement.classList.add("shake"));
    syncAssemblyUI();
    return;
  }

  const part = parts.get(partId);
  session.placed.add(partId);
  session.snap = {
    partId,
    startedAt: performance.now(),
    duration: 520,
    fromPosition: part.position.clone(),
    fromQuaternion: part.quaternion.clone(),
  };
  session.index += 1;
  state.selectedPartId = null;
  setMaterialState();

  if (session.index >= session.sequence.length) {
    session.completed = true;
    session.completedAt = performance.now();
    removeAssemblyGhost();
    showToast("Assembly complete — every component passed order validation.", "success");
  } else {
    refreshAssemblyTarget();
    showToast("Component snapped into place.", "success");
  }
  syncAssemblyUI();
}

function showAssemblyHint() {
  const session = state.assembly;
  if (!session || session.completed) return;
  const expectedId = currentAssemblyPart(session.sequence, session.index);
  session.hints += 1;
  state.selectedPartId = expectedId;
  setMaterialState();
  syncAssemblyUI();
  const expected = activeComponents().find((item) => item.id === expectedId);
  showToast(`Hint: look for ${expected?.name ?? "the highlighted component"}.`);
  window.setTimeout(() => {
    if (state.assembly === session && state.selectedPartId === expectedId) {
      state.selectedPartId = null;
      setMaterialState();
    }
  }, 1800);
}

function updateAssemblyAnimation(frameTime) {
  const session = state.assembly;
  if (!session) return;
  if (assemblyGhost) {
    const pulse = 1 + Math.sin(frameTime * 0.006) * 0.018;
    assemblyGhost.scale.setScalar(pulse);
  }
  if (session.snap) {
    const snap = session.snap;
    const part = parts.get(snap.partId);
    const progress = Math.min(1, (frameTime - snap.startedAt) / snap.duration);
    const eased = 1 - (1 - progress) ** 3;
    part.position.lerpVectors(snap.fromPosition, part.userData.basePosition, eased);
    part.quaternion.copy(snap.fromQuaternion).slerp(part.userData.baseQuaternion, eased);
    if (progress >= 1) {
      part.position.copy(part.userData.basePosition);
      part.quaternion.copy(part.userData.baseQuaternion);
      session.snap = null;
    }
  }
  if (frameTime - lastAssemblyHudUpdate > 250) {
    lastAssemblyHudUpdate = frameTime;
    syncAssemblyUI(frameTime);
  }
}

function materialList(material) {
  return Array.isArray(material) ? material : [material];
}

function computeSectionBounds() {
  assembly.updateWorldMatrix(true, true);
  sectionAssemblyInverse.copy(assembly.matrixWorld).invert();
  sectionBounds.makeEmpty();

  assembly.traverse((child) => {
    if (
      objectHasFlag(child, "isSectionHelper")
      || objectHasFlag(child, "isAssemblyGhost")
      || !child.geometry
    ) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    const box = child.geometry.boundingBox;
    if (!box || box.isEmpty()) return;
    sectionObjectMatrix.multiplyMatrices(sectionAssemblyInverse, child.matrixWorld);
    for (let x = 0; x <= 1; x += 1) {
      for (let y = 0; y <= 1; y += 1) {
        for (let z = 0; z <= 1; z += 1) {
          sectionCorner.set(
            x ? box.max.x : box.min.x,
            y ? box.max.y : box.min.y,
            z ? box.max.z : box.min.z,
          ).applyMatrix4(sectionObjectMatrix);
          sectionBounds.expandByPoint(sectionCorner);
        }
      }
    }
  });

  if (sectionBounds.isEmpty()) {
    sectionBounds.set(
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(1, 1, 1),
    );
  }
}

function applySectionMaterials() {
  assembly.traverse((child) => {
    if (
      objectHasFlag(child, "isSectionHelper")
      || objectHasFlag(child, "isAssemblyGhost")
      || !child.material
    ) return;
    materialList(child.material).forEach((material) => {
      material.clippingPlanes = state.sectionEnabled ? [sectionPlane] : null;
      material.clipShadows = state.sectionEnabled;
      material.needsUpdate = true;
    });
  });
}

function updateSectionHelper() {
  const coordinate = sectionCoordinate(
    sectionBounds,
    state.sectionAxis,
    state.sectionProgress,
  );
  sectionBounds.getSize(sectionBoundsSize);
  const span = Math.max(sectionBoundsSize.x, sectionBoundsSize.y, sectionBoundsSize.z, 1) * 1.35;
  sectionHelper.scale.set(span, span, 1);
  sectionHelper.position.set(0, 0, 0);
  sectionHelper.position[state.sectionAxis] = coordinate;
  if (state.sectionAxis === "x") sectionHelper.rotation.set(0, Math.PI / 2, 0);
  if (state.sectionAxis === "y") sectionHelper.rotation.set(-Math.PI / 2, 0, 0);
  if (state.sectionAxis === "z") sectionHelper.rotation.set(0, 0, 0);
}

function updateSectionPlane() {
  if (!state.sectionEnabled) return;
  updateSectionHelper();
  assembly.updateWorldMatrix(true, true);
  sectionLocalNormal.set(0, 0, 0);
  sectionLocalNormal[state.sectionAxis] = sectionNormalSign(state.sectionAxis);
  sectionWorldNormal.copy(sectionLocalNormal).transformDirection(assembly.matrixWorld);
  sectionLocalPoint.copy(sectionHelper.position);
  sectionWorldPoint.copy(sectionLocalPoint).applyMatrix4(assembly.matrixWorld);
  sectionPlane.setFromNormalAndCoplanarPoint(sectionWorldNormal, sectionWorldPoint);
}

function syncSectionUI() {
  const percent = Math.round(state.sectionProgress * 100);
  dom.sectionTool.classList.toggle("active", state.sectionEnabled);
  dom.sectionControl.classList.toggle("visible", state.sectionEnabled);
  dom.arSectionButton.classList.toggle("active", state.sectionEnabled);
  dom.arSectionPanel.classList.toggle("visible", state.sectionEnabled);
  dom.sectionSlider.value = String(percent);
  dom.arSectionSlider.value = String(percent);
  const display = sectionDisplayPercent(state.sectionProgress);
  dom.sectionOutput.value = display;
  dom.sectionOutput.textContent = display;
  dom.arSectionOutput.value = display;
  dom.arSectionOutput.textContent = display;
  [dom.sectionAxisButtons, dom.arSectionAxisButtons].forEach((container) => {
    container.querySelectorAll("[data-section-axis]").forEach((button) => {
      button.classList.toggle("active", button.dataset.sectionAxis === state.sectionAxis);
    });
  });
}

function setSectionEnabled(enabled) {
  if (enabled && state.assembly) {
    showToast("Finish or exit Assembly Mode before using cross-section.", "error");
    return;
  }
  state.sectionEnabled = Boolean(enabled);
  if (state.sectionEnabled) {
    if (sectionHelper.parent !== assembly) assembly.add(sectionHelper);
    computeSectionBounds();
  }
  sectionHelper.visible = state.sectionEnabled;
  applySectionMaterials();
  updateSectionPlane();
  syncSectionUI();
  if (!state.arMode) {
    showToast(
      state.sectionEnabled
        ? "Cross-section enabled. Move the plane to inspect internal layers."
        : "Cross-section disabled.",
    );
  }
}

function setSectionAxis(axis) {
  if (!SECTION_AXES[axis]) return;
  state.sectionAxis = axis;
  updateSectionPlane();
  syncSectionUI();
}

function setSectionProgress(progress) {
  state.sectionProgress = clampSectionProgress(progress);
  updateSectionPlane();
  syncSectionUI();
}

function createModelSelectors() {
  const options = MODEL_IDS.map((id) => {
    const model = MODEL_LIBRARY[id];
    return `<option value="${id}">${model.name} ${model.variant}</option>`;
  }).join("");
  dom.modelSelect.innerHTML = options;
  dom.arModelSelect.innerHTML = options;
  dom.modelSelect.value = state.modelId;
  dom.arModelSelect.value = state.modelId;
}

function updateModelIdentity() {
  dom.modelCode.textContent = activeDefinition.code;
  dom.modelName.textContent = activeDefinition.name;
  dom.modelVariant.textContent = activeDefinition.variant;
  dom.modelSubtitle.textContent = activeDefinition.subtitle;
  dom.componentCount.textContent = String(activeDefinition.components.length);
  dom.systemCount.textContent = String(new Set(activeDefinition.components.map((item) => item.category)).size);
  dom.guideCount.textContent = String(activeDefinition.guideSteps.length);
  dom.modelSelect.value = state.modelId;
  dom.arModelSelect.value = state.modelId;
}

function createCategoryTabs() {
  const categories = [...new Set(activeComponents().map((component) => component.category))];
  dom.categoryTabs.innerHTML = ["All", ...categories].map((category, index) => `
    <button
      class="${index === 0 ? "active" : ""}"
      type="button"
      data-category="${category}"
      role="tab"
      aria-selected="${index === 0 ? "true" : "false"}"
    >${category}</button>
  `).join("");
  state.category = "All";
}

function createComponentUI() {
  dom.componentList.innerHTML = "";
  dom.labelLayer.innerHTML = "";
  labelElements.clear();
  dom.arComponentSelect.innerHTML = '<option value="">Whole assembly</option>';
  activeComponents().forEach((component) => {
    const button = document.createElement("button");
    button.className = "component-item";
    button.type = "button";
    button.dataset.partId = component.id;
    button.dataset.category = component.category;
    button.innerHTML = `
      <span class="component-index">${component.index}</span>
      <span class="component-swatch" style="--swatch:${component.color}"></span>
      <span class="component-copy">
        <strong>${component.name}</strong>
        <small>${component.category}</small>
      </span>
      <span class="component-chevron">›</span>
    `;
    button.addEventListener("click", () => selectPart(component.id, true));
    dom.componentList.appendChild(button);

    const option = document.createElement("option");
    option.value = component.id;
    option.textContent = `${component.index} · ${component.name}`;
    dom.arComponentSelect.appendChild(option);

    const label = document.createElement("div");
    label.className = "part-label";
    label.dataset.partId = component.id;
    label.innerHTML = `<i style="--label-color:${component.color}"></i><span>${component.index}</span><b>${component.name}</b>`;
    dom.labelLayer.appendChild(label);
    labelElements.set(component.id, label);
  });
}

function createStepProgress() {
  dom.stepProgress.innerHTML = activeGuideSteps().map((_, index) => `<i data-step="${index}"></i>`).join("");
}

function componentMatchesFilters(component) {
  const matchesCategory = state.category === "All" || component.category === state.category;
  const searchable = `${component.name} ${component.category} ${component.role}`.toLowerCase();
  return matchesCategory && searchable.includes(state.search.toLowerCase());
}

function setMaterialState() {
  parts.forEach((part, id) => {
    const isSelected = id === state.selectedPartId;
    const definition = part.userData.definition;
    const isStructure = definition.category === "Structure";
    const isRemoved = state.removedParts.has(id);
    const isFilteredOut = !componentMatchesFilters(definition);
    const isIsolatedOut = state.isolateSelected && id !== state.selectedPartId;

    part.visible = !isRemoved && !isIsolatedOut;
    part.traverse((child) => {
      if (!child.isMesh) return;
      const baseOpacity = child.material.userData.baseOpacity ?? 1;
      const xrayGhost = state.xray && isStructure && !isSelected;
      const shouldGhost = xrayGhost || isFilteredOut;
      child.material.transparent = shouldGhost || child.material.userData.baseTransparent;
      child.material.opacity = isFilteredOut
        ? Math.min(0.07, baseOpacity)
        : xrayGhost
          ? Math.min(0.16, baseOpacity)
          : baseOpacity;
      child.material.depthWrite = !shouldGhost;
      child.material.emissive.set(isSelected ? part.userData.definition.color : 0x000000);
      child.material.emissiveIntensity = isSelected ? 0.22 : 0;
    });
  });
}

function updatePartDetail(partId) {
  const component = activeComponents().find((item) => item.id === partId);
  if (!component) {
    dom.partDetail.innerHTML = `
      <div class="detail-placeholder">
        <span>◎</span>
        <strong>Select a component</strong>
        <p>Its function, material, and service notes will appear here.</p>
      </div>
    `;
    return;
  }

  dom.partDetail.innerHTML = `
    <div class="detail-head">
      <span class="detail-number">${component.index}</span>
      <span class="detail-category" style="--category-color:${CATEGORY_COLORS[component.category] ?? component.color}">${component.category}</span>
      <button type="button" class="detail-close" aria-label="Close component detail">×</button>
    </div>
    <h3>${component.name}</h3>
    <p>${component.role}</p>
    <dl>
      <div><dt>Material</dt><dd>${component.material}</dd></div>
      <div><dt>Key metric</dt><dd>${component.metric}</dd></div>
      <div><dt>Handling</dt><dd>${component.risk}</dd></div>
    </dl>
    <div class="service-note">
      <span>TOOL-FREE SERVICE NOTE</span>
      <p>${component.service}</p>
    </div>
  `;
  dom.partDetail.querySelector(".detail-close").addEventListener("click", () => selectPart(null));
}

function updateAnnotationContent(partId) {
  const component = activeComponents().find((item) => item.id === partId);
  const annotation = annotationSummary(component);
  if (!annotation) {
    dom.annotationLayer.classList.remove("visible");
    return;
  }

  dom.annotationLayer.style.setProperty("--annotation-color", annotation.color);
  dom.annotationCard.dataset.tone = annotation.tone;
  dom.annotationIndex.textContent = annotation.index;
  dom.annotationCategory.textContent = annotation.category;
  dom.annotationRisk.textContent = annotation.risk;
  dom.annotationTitle.textContent = annotation.name;
  dom.annotationRole.textContent = annotation.role;
  dom.annotationMetric.textContent = annotation.metric;
  dom.annotationService.textContent = annotation.service;
}

function objectIsWorldVisible(object) {
  let current = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function updateSpatialAnnotation() {
  const part = state.selectedPartId ? parts.get(state.selectedPartId) : null;
  const surfaceReady = state.arMode !== "surface" || document.body.dataset.arStatus === "anchored";
  const markerReady = state.arMode !== "marker" || document.body.dataset.arStatus === "marker-found";
  if (
    !state.annotations
    || !part
    || !objectIsWorldVisible(part)
    || !surfaceReady
    || !markerReady
  ) {
    dom.annotationLayer.classList.remove("visible");
    return;
  }

  const projectionCamera = arTracking.getProjectionCamera();
  labelBounds.setFromObject(part).getCenter(annotationWorldPosition);
  annotationWorldPosition.project(projectionCamera);
  if (
    !Number.isFinite(annotationWorldPosition.x)
    || !Number.isFinite(annotationWorldPosition.y)
    || annotationWorldPosition.z < -1
    || annotationWorldPosition.z > 1
  ) {
    dom.annotationLayer.classList.remove("visible");
    return;
  }

  const canvasRect = renderer.domElement.getBoundingClientRect();
  const targetX = canvasRect.left + (annotationWorldPosition.x * 0.5 + 0.5) * canvasRect.width;
  const targetY = canvasRect.top + (-annotationWorldPosition.y * 0.5 + 0.5) * canvasRect.height;
  if (
    targetX < canvasRect.left
    || targetX > canvasRect.right
    || targetY < canvasRect.top
    || targetY > canvasRect.bottom
  ) {
    dom.annotationLayer.classList.remove("visible");
    return;
  }

  dom.annotationLayer.classList.add("visible");
  const cardWidth = dom.annotationCard.offsetWidth || 260;
  const cardHeight = dom.annotationCard.offsetHeight || 142;
  const dockTop = state.arMode
    ? dom.arControlDock.getBoundingClientRect().top
    : canvasRect.bottom - 104;
  const availableTop = state.arMode
    ? Math.max(70, canvasRect.top + 8)
    : canvasRect.top + 58;
  const availableBottom = Math.max(
    availableTop + cardHeight + 24,
    Math.min(canvasRect.bottom - 8, dockTop - 8),
  );
  const layout = computeAnnotationLayout({
    targetX,
    targetY,
    left: canvasRect.left,
    top: availableTop,
    right: canvasRect.right,
    bottom: availableBottom,
    cardWidth,
    cardHeight,
    gap: state.arMode ? 30 : 42,
  });

  dom.annotationCard.dataset.side = layout.side;
  dom.annotationCard.style.transform = `translate(${layout.cardX}px, ${layout.cardY}px)`;
  const elbowX = targetX + (layout.side === "right" ? 18 : -18);
  dom.annotationLine.setAttribute(
    "d",
    `M ${targetX.toFixed(1)} ${targetY.toFixed(1)} L ${elbowX.toFixed(1)} ${targetY.toFixed(1)} L ${layout.anchorX.toFixed(1)} ${layout.anchorY.toFixed(1)}`,
  );
  dom.annotationTarget.setAttribute("cx", targetX.toFixed(1));
  dom.annotationTarget.setAttribute("cy", targetY.toFixed(1));
}

function setAnnotationsEnabled(enabled) {
  state.annotations = enabled;
  dom.annotationsTool.classList.toggle("active", enabled);
  dom.arAnnotationsButton.classList.toggle("active", enabled);
  dom.arAnnotationsButton.textContent = enabled ? "Tags on" : "Tags off";
  if (!enabled) dom.annotationLayer.classList.remove("visible");
}

function setARTagsEnabled(enabled) {
  state.labels = enabled;
  dom.labelsTool.classList.toggle("active", enabled);
  setAnnotationsEnabled(enabled);
  if (!enabled) {
    labelElements.forEach((label) => label.classList.remove("visible"));
  }
}

function selectPart(partId, fromUI = false) {
  if (state.assembly && partId) {
    handleAssemblySelection(partId);
    return;
  }
  if (state.challenge && partId) {
    handleChallengeSelection(partId);
    return;
  }

  state.selectedPartId = partId;
  if (!partId) {
    state.isolateSelected = false;
    dom.arIsolateButton.textContent = "Isolate";
  }
  dom.arIsolateButton.classList.toggle("active", state.isolateSelected);
  setMaterialState();
  updatePartDetail(partId);
  updateAnnotationContent(partId);
  document.querySelectorAll(".component-item").forEach((item) => {
    item.classList.toggle("selected", item.dataset.partId === partId);
  });
  labelElements.forEach((label, id) => label.classList.toggle("selected", id === partId));
  dom.arComponentSelect.value = partId ?? "";
  const arComponent = activeComponents().find((item) => item.id === partId);
  dom.arComponentInfo.textContent = arComponent
    ? `${arComponent.name}: ${arComponent.role}`
    : "Select a part to highlight it and read its role.";

  if (fromUI && partId) {
    const part = parts.get(partId);
    if (part) {
      const target = new THREE.Vector3();
      part.getWorldPosition(target);
      controls.target.lerp(target, 0.45);
    }
  }
}

function updateFilter() {
  let visible = 0;
  document.querySelectorAll(".component-item").forEach((item) => {
    const component = activeComponents().find((entry) => entry.id === item.dataset.partId);
    const show = componentMatchesFilters(component);
    item.hidden = !show;
    if (show) visible += 1;
  });
  dom.visibleCount.textContent = `${visible} / ${activeComponents().length}`;
}

function applyExplosion(progress) {
  state.explosion = progress;
  assembly.scale.setScalar(state.assembly ? 1 : 1 - progress * 0.16);
  parts.forEach((part) => {
    const definition = part.userData.definition;
    const amount = state.assembly
      ? state.assembly.placed.has(definition.id)
        ? 0
        : componentExplosion(1, definition.order)
      : componentExplosion(progress, definition.order);
    const offset = part.userData.explodeVector.clone().multiplyScalar(amount);
    part.position.copy(part.userData.basePosition).add(offset);
    const tilt = amount * (definition.order % 2 === 0 ? 0.05 : -0.05);
    part.quaternion.copy(part.userData.baseQuaternion);
    part.rotateZ(tilt);
  });
  if (effectGroup) effectGroup.visible = progress < 0.48;
  dom.slider.value = Math.round(progress * 100);
  dom.sliderOutput.value = formatPercent(progress);
  dom.sliderOutput.textContent = formatPercent(progress);
  dom.arSlider.value = Math.round(progress * 100);
  dom.arSliderOutput.value = formatPercent(progress);
  dom.arSliderOutput.textContent = formatPercent(progress);
}

function setExplosionTarget(value, immediate = false) {
  state.targetExplosion = Math.min(1, Math.max(0, value));
  if (immediate) applyExplosion(state.targetExplosion);
}

function setGuideStep(index) {
  if (state.assembly) exitAssemblyMode({ restore: true });
  const guideSteps = activeGuideSteps();
  const bounded = (index + guideSteps.length) % guideSteps.length;
  state.guideStep = bounded;
  const step = guideSteps[bounded];
  dom.stepCount.textContent = `${String(bounded + 1).padStart(2, "0")} / ${String(guideSteps.length).padStart(2, "0")}`;
  dom.arGuideInfo.textContent = `Stage ${bounded + 1} of ${guideSteps.length} · ${step.kicker}`;
  dom.stepKicker.textContent = step.kicker;
  dom.stepTitle.textContent = step.title;
  dom.stepDescription.textContent = step.description;
  [...dom.stepProgress.children].forEach((node, nodeIndex) => {
    node.classList.toggle("complete", nodeIndex <= bounded);
    node.classList.toggle("active", nodeIndex === bounded);
  });
  setExplosionTarget(step.explosion);
  selectPart(step.partId);
}

function setGuidePlaying(playing) {
  state.guidePlaying = playing;
  clearInterval(state.guideTimer);
  state.guideTimer = null;
  dom.playGuide.classList.toggle("playing", playing);
  dom.playIcon.textContent = playing ? "Ⅱ" : "▶";
  dom.playLabel.textContent = playing ? "Pause tour" : "Auto tour";
  controls.autoRotate = playing;
  if (playing) {
    state.guideTimer = window.setInterval(() => {
      if (state.guideStep === activeGuideSteps().length - 1) {
        setGuidePlaying(false);
      } else {
        setGuideStep(state.guideStep + 1);
      }
    }, 5000);
  }
}

function showToast(message, kind = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${kind}`;
  toast.textContent = message;
  dom.toastRegion.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function resetAssemblyPose() {
  const [x, y, z] = activeDefinition.initialRotation;
  assembly.position.set(0, state.arMode ? activeDefinition.arYOffset : 0, 0);
  assembly.rotation.set(x, y, z);
}

function resetStudioCamera() {
  camera.position.set(...activeDefinition.studioCamera);
  controls.target.set(0, 0, 0);
  controls.update();
}

function switchModel(modelId, announce = true) {
  const nextDefinition = MODEL_LIBRARY[modelId];
  if (!nextDefinition) return;
  const restartAssembly = Boolean(state.assembly);
  if (restartAssembly) exitAssemblyMode({ restore: false });

  setGuidePlaying(false);
  state.challenge = null;
  state.removedParts.clear();
  state.isolateSelected = false;
  state.arSpin = false;
  dom.arIsolateButton.classList.remove("active");
  dom.arIsolateButton.textContent = "Isolate";
  dom.arSpinButton.classList.remove("active");
  dom.arSpinButton.textContent = "Auto spin";
  state.selectedPartId = null;
  state.search = "";
  state.category = "All";
  dom.search.value = "";
  document.body.classList.remove("challenge-active");
  dom.challengeOverlay.classList.remove("visible");

  modelStage.remove(assembly);
  activeDefinition = nextDefinition;
  state.modelId = modelId;
  if (!modelInstances.has(modelId)) {
    modelInstances.set(modelId, createProductModel(modelId));
  }
  activeModel = modelInstances.get(modelId);
  ({ assembly, parts, effectGroup } = activeModel);
  modelStage.add(assembly);
  if (state.sectionEnabled) {
    assembly.add(sectionHelper);
    computeSectionBounds();
    updateSectionPlane();
  }
  applySectionMaterials();
  arTracking.setModelScales(
    activeDefinition.arSurfaceScale,
    activeDefinition.arMarkerScale,
  );

  resetAssemblyPose();
  updateModelIdentity();
  createCategoryTabs();
  createComponentUI();
  createStepProgress();
  updateFilter();
  setExplosionTarget(0, true);
  setGuideStep(0);
  setMaterialState();
  if (restartAssembly) startAssemblyMode({ announce: false });
  if (!state.arMode) resetStudioCamera();

  if (announce) {
    showToast(`${activeDefinition.name} ${activeDefinition.variant} loaded.`, "success");
  }
}

async function openAROptions() {
  if (state.arMode) return;
  dom.arDialog.classList.add("visible");
  const supported = await arTracking.surfaceSupported();
  dom.surfaceArButton.disabled = !supported;
  dom.surfaceArButton.classList.toggle("unsupported", !supported);
  dom.surfaceSupport.textContent = supported
    ? "Supported on this device"
    : window.isSecureContext
      ? "Not supported here — marker preview only"
      : "HTTPS is required on a phone";
}

function closeAROptions() {
  if (state.arStarting) return;
  dom.arDialog.classList.remove("visible");
}

function setARControlsExpanded(expanded) {
  state.arControlsExpanded = Boolean(expanded);
  dom.arControlDock.classList.toggle("controls-expanded", state.arControlsExpanded);
  dom.arControlsToggle.classList.toggle("active", state.arControlsExpanded);
  dom.arControlsToggle.setAttribute("aria-expanded", String(state.arControlsExpanded));
  const label = dom.arControlsToggle.querySelector("b");
  if (label) label.textContent = state.arControlsExpanded ? "Hide" : "Controls";
}

function prepareTrackedAR(mode) {
  state.arMode = mode;
  state.arStarting = true;
  state.arEnding = false;
  dom.exitArButton.disabled = false;
  dom.exitArButton.textContent = "Exit AR";
  setARControlsExpanded(false);
  updateOcclusionStatus({
    available: false,
    enabled: false,
    status: mode === "surface" ? "checking" : "unavailable",
  });
  setGuidePlaying(false);
  exitChallenge();
  selectPart(null);
  controls.enabled = false;
  controls.autoRotate = false;
  setARTagsEnabled(true);
  modelStage.position.set(0, 0, 0);
  modelStage.quaternion.identity();
  modelStage.scale.setScalar(1);
  resetAssemblyPose();
  dom.arScaleSlider.value = "100";
  dom.arScaleOutput.value = "100%";
  dom.arScaleOutput.textContent = "100%";
  dom.replaceAnchorLabel.textContent = mode === "surface" ? "Re-place" : "Move marker";
  document.body.classList.add("tracked-ar-active");
  document.body.classList.toggle("marker-ar-active", mode === "marker");
  dom.arOverlay.append(dom.labelLayer, dom.annotationLayer);
  dom.arDialog.classList.remove("visible");
  dom.arOverlay.classList.add("visible");
  dom.cameraMode.classList.add("active");
  dom.cameraMode.setAttribute("aria-pressed", "true");
  dom.studioMode.classList.remove("active");
  dom.studioMode.setAttribute("aria-pressed", "false");
  scene.background = null;
  scene.fog = null;
  ground.visible = false;
  grid.visible = false;
  syncAssemblyUI();
}

async function startTrackedAR(mode) {
  if (state.arStarting || state.arMode) return;
  prepareTrackedAR(mode);
  try {
    if (mode === "surface") await arTracking.startSurface();
    else await arTracking.startMarker();
    state.arStarting = false;
  } catch (error) {
    state.arStarting = false;
    const permissionDenied = error?.name === "NotAllowedError";
    showToast(
      permissionDenied
        ? "Camera or AR permission was not granted."
        : error?.message || "Tracked AR could not be started.",
      "error",
    );
    await arTracking.stop();
    if (state.arMode) restoreStudioAfterAR(mode);
  }
}

function updateOcclusionStatus({
  available = false,
  enabled = false,
  status = "unavailable",
  source = null,
} = {}) {
  const previousStatus = state.occlusionStatus;
  state.occlusionAvailable = available;
  state.occlusionEnabled = enabled;
  state.occlusionStatus = status;
  state.occlusionSource = source;
  const labels = {
    checking: "Occlusion…",
    initializing: "Depth starting",
    active: "Occlusion on",
    paused: "Occlusion off",
    unavailable: "No depth",
  };
  dom.arOcclusionButton.textContent = labels[status] ?? "Occlusion";
  dom.arOcclusionButton.disabled = status === "checking"
    || status === "initializing";
  dom.arOcclusionButton.classList.toggle("active", available && enabled);
  dom.arOcclusionButton.title = available
    ? `Real objects hide virtual geometry using ${source === "cpu-optimized" ? "ARCore CPU depth" : "GPU depth"}.`
    : "WebXR depth was not exposed. On Chrome Android, update Chrome and Google Play Services for AR; experimental releases may also require chrome://flags/#webxr-incubations.";
  if (status === "active" && previousStatus !== "active") {
    showToast(
      `${source === "cpu-optimized" ? "ARCore CPU" : "GPU"} depth occlusion is active.`,
      "success",
    );
  }
}

function toggleOcclusion() {
  if (!arTracking.toggleOcclusion()) {
    showToast(
      "WebXR depth is unavailable. Update Chrome and Google Play Services for AR; if needed, enable chrome://flags/#webxr-incubations.",
      "error",
    );
  }
}

function updateARStatus(status, detail) {
  const statusTitles = {
    scanning: "Scanning the room…",
    "surface-found": "Surface detected",
    anchored: "World anchor locked",
    "marker-search": "Looking for the marker…",
    "marker-found": "Marker preview active",
    "marker-engine": "Loading marker tracker…",
    "marker-camera": "Camera ready",
    "marker-timeout": "Marker not recognized",
  };
  dom.arStatusTitle.textContent = statusTitles[status] ?? "Tracked AR";
  dom.arStatusDetail.textContent = detail;
  dom.placementGuide.classList.toggle("hidden", status === "anchored" || status === "marker-found");
  dom.placementGuideTitle.textContent = status === "surface-found"
    ? "Tap to place the model"
    : status.startsWith("marker")
      ? "Point at the Hiro marker"
      : "Find a horizontal surface";
  dom.placementGuideDetail.textContent = detail;
  const markerMode = state.arMode === "marker";
  dom.markerDiagnostics.classList.toggle("visible", markerMode);
  if (markerMode) {
    const cameraReady = !["marker-engine"].includes(status);
    const trackerReady = ["marker-search", "marker-found", "marker-timeout"].includes(status);
    const markerFound = status === "marker-found";
    dom.cameraCheck.textContent = `Camera · ${cameraReady ? "ready" : "starting"}`;
    dom.cameraCheck.classList.toggle("ready", cameraReady);
    dom.trackerCheck.textContent = `Tracker · ${trackerReady ? "ready" : "loading"}`;
    dom.trackerCheck.classList.toggle("ready", trackerReady);
    dom.markerCheck.textContent = `Marker · ${markerFound ? "found" : "not found"}`;
    dom.markerCheck.classList.toggle("ready", markerFound);
  }
  document.body.dataset.arStatus = status;
}

function restoreStudioAfterAR(mode) {
  if (mode === "surface") {
    reloadIntoStudio();
    return;
  }
  if (!state.arMode && !document.body.classList.contains("tracked-ar-active")) return;
  state.arMode = null;
  state.arStarting = false;
  state.arEnding = false;
  dom.exitArButton.disabled = false;
  dom.exitArButton.textContent = "Exit AR";
  setARControlsExpanded(false);
  updateOcclusionStatus();
  document.body.classList.remove("tracked-ar-active", "marker-ar-active");
  delete document.body.dataset.arStatus;
  labelLayerHome.appendChild(dom.labelLayer);
  annotationLayerHome.appendChild(dom.annotationLayer);
  dom.arOverlay.classList.remove("visible");
  dom.cameraMode.classList.remove("active");
  dom.cameraMode.setAttribute("aria-pressed", "false");
  dom.studioMode.classList.add("active");
  dom.studioMode.setAttribute("aria-pressed", "true");
  if (modelStage.parent !== scene) scene.add(modelStage);
  modelStage.position.set(0, 0, 0);
  modelStage.quaternion.identity();
  modelStage.scale.setScalar(1);
  modelStage.visible = true;
  resetAssemblyPose();
  resetStudioCamera();
  scene.background = new THREE.Color(0xe6ecee);
  scene.fog = new THREE.Fog(0xe6ecee, 11, 22);
  ground.visible = true;
  grid.visible = true;
  state.labels = true;
  setAnnotationsEnabled(true);
  controls.enabled = true;
  controls.target.set(0, 0, 0);
  controls.update();
  syncAssemblyUI();
  resize();
}

function reloadIntoStudio() {
  if (studioReloadRequested) return;
  studioReloadRequested = true;
  window.sessionStorage.setItem("insightxr-return-model", state.modelId);
  const returnUrl = new URL(window.location.href);
  returnUrl.searchParams.set("arReturn", Date.now().toString());
  window.location.replace(returnUrl);
}

async function exitTrackedAR() {
  if (!state.arMode || state.arEnding) return;
  state.arEnding = true;
  dom.exitArButton.disabled = true;
  if (state.arMode === "surface") {
    dom.exitArButton.textContent = "Returning…";
    reloadIntoStudio();
    return;
  }
  dom.exitArButton.textContent = "Ending…";
  try {
    await arTracking.stop();
  } catch (error) {
    state.arEnding = false;
    dom.exitArButton.disabled = false;
    dom.exitArButton.textContent = "Exit AR";
    showToast(error?.message || "AR could not be closed cleanly.", "error");
  }
}

async function enableStudioMode() {
  closeAROptions();
  if (state.arMode) await exitTrackedAR();
}

function setInteractionMode(mode) {
  state.mode = mode;
  const placing = mode === "place";
  controls.enabled = !placing;
  dom.inspectTool.classList.toggle("active", !placing);
  dom.placeTool.classList.toggle("active", placing);
  renderer.domElement.classList.toggle("placing", placing);
  dom.reticle.classList.toggle("placing", placing);
  dom.hint.querySelector("span:nth-child(2)").innerHTML = placing
    ? "<b>Drag</b> to position the model &nbsp;·&nbsp; switch to <b>Inspect</b> to rotate"
    : "<b>Drag</b> to rotate &nbsp;·&nbsp; <b>Scroll</b> to zoom &nbsp;·&nbsp; <b>Click</b> a part to inspect";
}

function toggleXray() {
  state.xray = !state.xray;
  dom.xrayTool.classList.toggle("active", state.xray);
  dom.arXrayButton.classList.toggle("active", state.xray);
  setMaterialState();
  if (!state.arMode) showToast(state.xray ? "X-ray enclosure enabled." : "X-ray enclosure disabled.");
}

function togglePartIsolation() {
  if (!state.selectedPartId) {
    showToast("Select a component before isolating it.", "error");
    return;
  }
  state.isolateSelected = !state.isolateSelected;
  dom.arIsolateButton.classList.toggle("active", state.isolateSelected);
  dom.arIsolateButton.textContent = state.isolateSelected ? "Isolated" : "Isolate";
  setMaterialState();
}

function showAllParts() {
  state.isolateSelected = false;
  state.removedParts.clear();
  dom.arIsolateButton.classList.remove("active");
  dom.arIsolateButton.textContent = "Isolate";
  setMaterialState();
}

function toggleARSpin() {
  state.arSpin = !state.arSpin;
  dom.arSpinButton.classList.toggle("active", state.arSpin);
  dom.arSpinButton.textContent = state.arSpin ? "Stop spin" : "Auto spin";
}

function resetExperience() {
  if (state.assembly) exitAssemblyMode({ restore: false });
  setGuidePlaying(false);
  state.removedParts.clear();
  state.challenge = null;
  state.isolateSelected = false;
  state.arSpin = false;
  dom.arIsolateButton.classList.remove("active");
  dom.arSpinButton.classList.remove("active");
  dom.challengeOverlay.classList.remove("visible");
  document.body.classList.remove("challenge-active");
  resetAssemblyPose();
  resetStudioCamera();
  setInteractionMode("inspect");
  state.xray = false;
  dom.xrayTool.classList.remove("active");
  state.sectionAxis = "x";
  state.sectionProgress = 0.5;
  setSectionEnabled(false);
  setGuideStep(0);
  setMaterialState();
  showToast("View reset.", "success");
}

function startChallenge() {
  if (state.assembly) exitAssemblyMode({ restore: true });
  setGuidePlaying(false);
  state.removedParts.clear();
  state.isolateSelected = false;
  dom.arIsolateButton.classList.remove("active");
  state.challenge = { index: 0, startedAt: performance.now() };
  document.body.classList.add("challenge-active");
  dom.challengeOverlay.classList.add("visible");
  setExplosionTarget(0.12);
  selectPart(null);
  updateChallengePrompt();
  setMaterialState();
}

function updateChallengePrompt() {
  if (!state.challenge) return;
  const sequence = activeServiceSequence();
  const id = sequence[state.challenge.index];
  const component = activeComponents().find((item) => item.id === id);
  dom.challengePrompt.textContent = `Remove: ${component.name}`;
  dom.challengeProgress.textContent = `Step ${state.challenge.index + 1} of ${sequence.length} · Select the correct component`;
}

function handleChallengeSelection(partId) {
  const sequence = activeServiceSequence();
  const expected = sequence[state.challenge.index];
  if (partId !== expected) {
    const expectedName = activeComponents().find((item) => item.id === expected).name;
    showToast(`Not yet — ${expectedName} blocks safe access.`, "error");
    renderer.domElement.classList.remove("shake");
    requestAnimationFrame(() => renderer.domElement.classList.add("shake"));
    return;
  }

  state.removedParts.add(partId);
  setMaterialState();
  state.challenge.index += 1;

  if (state.challenge.index >= sequence.length) {
    const seconds = ((performance.now() - state.challenge.startedAt) / 1000).toFixed(1);
    dom.challengePrompt.textContent = "Service path complete!";
    dom.challengeProgress.textContent = `${sequence.length}/${sequence.length} correct · ${seconds} seconds`;
    showToast("Excellent — the filter is safely accessible.", "success");
    return;
  }

  showToast("Correct component removed.", "success");
  updateChallengePrompt();
}

function exitChallenge() {
  state.challenge = null;
  state.removedParts.clear();
  document.body.classList.remove("challenge-active");
  dom.challengeOverlay.classList.remove("visible");
  setMaterialState();
  setGuideStep(0);
}

function updateLabels() {
  const canvasRect = renderer.domElement.getBoundingClientRect();
  const width = canvasRect.width;
  const height = canvasRect.height;
  const projectionCamera = arTracking.getProjectionCamera();
  projectionCamera.getWorldDirection(labelCameraDirection);
  projectionCamera.getWorldPosition(labelCameraPosition);
  const surfaceReady = state.arMode !== "surface" || document.body.dataset.arStatus === "anchored";
  const markerReady = state.arMode !== "marker" || document.body.dataset.arStatus === "marker-found";
  const topBoundary = state.arMode
    ? Math.max(canvasRect.top + 8, dom.arTopControls.getBoundingClientRect().bottom + 6)
    : canvasRect.top + 62;
  const bottomBoundary = state.arMode
    ? Math.min(canvasRect.bottom - 8, dom.arControlDock.getBoundingClientRect().top - 6)
    : canvasRect.bottom - 112;

  labelElements.forEach((element, id) => {
    const part = parts.get(id);
    const definition = part.userData.definition;
    const matchesCategory = state.category === "All" || definition.category === state.category;
    const matchesSearch = `${definition.name} ${definition.category}`.toLowerCase().includes(state.search.toLowerCase());
    const revealLabels = state.arMode ? surfaceReady && markerReady : state.explosion > 0.12;
    const visible = state.labels
      && revealLabels
      && matchesCategory
      && matchesSearch
      && !state.removedParts.has(id)
      && objectIsWorldVisible(part);
    if (!visible) {
      element.classList.remove("visible");
      return;
    }

    labelBounds.setFromObject(part).getCenter(labelWorldPosition);
    part.getWorldScale(labelWorldScale);
    part.getWorldQuaternion(labelWorldQuaternion);
    labelWorldOffset.copy(part.userData.labelOffset)
      .multiply(labelWorldScale)
      .applyQuaternion(labelWorldQuaternion);
    labelWorldPosition.add(labelWorldOffset);
    labelToPart.copy(labelWorldPosition).sub(labelCameraPosition).normalize();
    if (labelCameraDirection.dot(labelToPart) < 0) {
      element.classList.remove("visible");
      return;
    }
    labelWorldPosition.project(projectionCamera);
    const x = canvasRect.left + (labelWorldPosition.x * 0.5 + 0.5) * width;
    const y = canvasRect.top + (-labelWorldPosition.y * 0.5 + 0.5) * height;
    if (
      labelWorldPosition.z < -1
      || labelWorldPosition.z > 1
      || x < canvasRect.left + 8
      || x > canvasRect.right - 118
      || y < topBoundary
      || y > bottomBoundary
    ) {
      element.classList.remove("visible");
      return;
    }
    element.style.transform = `translate(${x}px, ${y}px)`;
    element.classList.add("visible");
  });
}

function resize() {
  if (state.arMode === "marker") {
    arTracking.resizeMarkerView();
    return;
  }
  if (state.arMode === "surface") return;
  const width = dom.viewport.clientWidth;
  const height = dom.viewport.clientHeight;
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function raycastPart(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects([...parts.values()], true);
  return intersections.find((hit) => hit.object.userData.partId)?.object.userData.partId ?? null;
}

function raycastXRPart(controller) {
  if (!controller) return null;
  controller.updateMatrixWorld(true);
  raycaster.setFromXRController(controller);
  const intersections = raycaster.intersectObjects([...parts.values()], true);
  return intersections.find((hit) => hit.object.userData.partId)?.object.userData.partId ?? null;
}

function handleARSelect(controller) {
  if (state.arMode !== "surface") return;
  const partId = raycastXRPart(controller);
  if (partId) {
    selectPart(partId);
    return;
  }
  if (state.assembly) {
    showToast("Aim at a separated component, then tap the screen.");
  }
}

renderer.domElement.addEventListener("pointerdown", (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
  if (state.mode === "place") {
    draggingPlacement = true;
    renderer.domElement.setPointerCapture(event.pointerId);
  }
});

renderer.domElement.addEventListener("pointermove", (event) => {
  if (!draggingPlacement || state.mode !== "place") return;
  const rect = renderer.domElement.getBoundingClientRect();
  assembly.position.x = ((event.clientX - rect.left) / rect.width - 0.5) * 5.5;
  assembly.position.y = -((event.clientY - rect.top) / rect.height - 0.52) * 3.3;
});

renderer.domElement.addEventListener("pointerup", (event) => {
  if (draggingPlacement) {
    draggingPlacement = false;
    renderer.domElement.releasePointerCapture(event.pointerId);
    return;
  }
  if (!pointerDown) return;
  const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  if (moved < 5) selectPart(raycastPart(event));
  pointerDown = null;
});

dom.slider.addEventListener("input", (event) => {
  setGuidePlaying(false);
  setExplosionTarget(Number(event.target.value) / 100, true);
});
dom.previousStep.addEventListener("click", () => setGuideStep(state.guideStep - 1));
dom.nextStep.addEventListener("click", () => setGuideStep(state.guideStep + 1));
dom.playGuide.addEventListener("click", () => setGuidePlaying(!state.guidePlaying));
dom.cameraMode.addEventListener("click", openAROptions);
dom.studioMode.addEventListener("click", enableStudioMode);
dom.closeArDialog.addEventListener("click", closeAROptions);
dom.arDialog.addEventListener("click", (event) => {
  if (event.target === dom.arDialog) closeAROptions();
});
dom.surfaceArButton.addEventListener("click", () => startTrackedAR("surface"));
dom.markerArButton.addEventListener("click", () => startTrackedAR("marker"));
dom.exitArButton.addEventListener("click", exitTrackedAR);
dom.replaceAnchorButton.addEventListener("click", () => arTracking.replace());
dom.arControlsToggle.addEventListener("click", () => {
  setARControlsExpanded(!state.arControlsExpanded);
});
dom.arOcclusionButton.addEventListener("click", toggleOcclusion);
dom.arRotateLeft.addEventListener("click", () => arTracking.rotateObject(-Math.PI / 12));
dom.arRotateRight.addEventListener("click", () => arTracking.rotateObject(Math.PI / 12));
dom.arScaleSlider.addEventListener("input", (event) => {
  const percent = Number(event.target.value);
  arTracking.setObjectScale(percent / 100);
  dom.arScaleOutput.value = `${percent}%`;
  dom.arScaleOutput.textContent = `${percent}%`;
});
dom.arResetTransform.addEventListener("click", () => {
  arTracking.resetObjectTransform();
  dom.arScaleSlider.value = "100";
  dom.arScaleOutput.value = "100%";
  dom.arScaleOutput.textContent = "100%";
});
dom.arMoveLeft.addEventListener("click", () => arTracking.moveObject(-0.06, 0, 0));
dom.arMoveRight.addEventListener("click", () => arTracking.moveObject(0.06, 0, 0));
dom.arMoveForward.addEventListener("click", () => arTracking.moveObject(0, 0, -0.06));
dom.arMoveBack.addEventListener("click", () => arTracking.moveObject(0, 0, 0.06));
dom.arMoveUp.addEventListener("click", () => arTracking.moveObject(0, 0.04, 0));
dom.arMoveDown.addEventListener("click", () => arTracking.moveObject(0, -0.04, 0));
dom.arComponentSelect.addEventListener("change", (event) => {
  selectPart(event.target.value || null);
});
dom.modelSelect.addEventListener("change", (event) => switchModel(event.target.value));
dom.arModelSelect.addEventListener("change", (event) => switchModel(event.target.value));
dom.arIsolateButton.addEventListener("click", togglePartIsolation);
dom.arShowAllButton.addEventListener("click", showAllParts);
dom.arGuidePrevious.addEventListener("click", () => setGuideStep(state.guideStep - 1));
dom.arGuideNext.addEventListener("click", () => setGuideStep(state.guideStep + 1));
dom.arSpinButton.addEventListener("click", toggleARSpin);
dom.arAnnotationsButton.addEventListener("click", () => setARTagsEnabled(!state.labels));
dom.arAssemblyButton.addEventListener("click", () => {
  if (state.assembly) exitAssemblyMode({ restore: true, announce: true });
  else startAssemblyMode();
});
dom.arAssemblyHint.addEventListener("click", showAssemblyHint);
dom.arExitAssembly.addEventListener("click", () => exitAssemblyMode({ restore: true, announce: true }));
dom.arOverlay.addEventListener("beforexrselect", (event) => {
  if (event.target.closest("button, input, select, label")) event.preventDefault();
});
dom.arSlider.addEventListener("input", (event) => {
  setGuidePlaying(false);
  setExplosionTarget(Number(event.target.value) / 100, true);
});
dom.arXrayButton.addEventListener("click", toggleXray);
dom.arSectionButton.addEventListener("click", () => setSectionEnabled(!state.sectionEnabled));
dom.inspectTool.addEventListener("click", () => setInteractionMode("inspect"));
dom.placeTool.addEventListener("click", () => setInteractionMode("place"));
dom.xrayTool.addEventListener("click", toggleXray);
dom.sectionTool.addEventListener("click", () => setSectionEnabled(!state.sectionEnabled));
dom.sectionClose.addEventListener("click", () => setSectionEnabled(false));
[dom.sectionSlider, dom.arSectionSlider].forEach((slider) => {
  slider.addEventListener("input", (event) => {
    setSectionProgress(Number(event.target.value) / 100);
  });
});
[dom.sectionAxisButtons, dom.arSectionAxisButtons].forEach((container) => {
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-section-axis]");
    if (button) setSectionAxis(button.dataset.sectionAxis);
  });
});
dom.labelsTool.addEventListener("click", () => {
  state.labels = !state.labels;
  dom.labelsTool.classList.toggle("active", state.labels);
});
dom.annotationsTool.addEventListener("click", () => setAnnotationsEnabled(!state.annotations));
dom.assemblyTool.addEventListener("click", () => {
  if (state.assembly) exitAssemblyMode({ restore: true, announce: true });
  else startAssemblyMode();
});
dom.assemblyHint.addEventListener("click", showAssemblyHint);
dom.exitAssembly.addEventListener("click", () => exitAssemblyMode({ restore: true, announce: true }));
dom.resetTool.addEventListener("click", resetExperience);
dom.challengeButton.addEventListener("click", startChallenge);
dom.exitChallenge.addEventListener("click", exitChallenge);
dom.hint.querySelector("button").addEventListener("click", () => dom.hint.classList.add("hidden"));
dom.search.addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  const selected = activeComponents().find((item) => item.id === state.selectedPartId);
  if (selected && !componentMatchesFilters(selected)) selectPart(null);
  updateFilter();
  setMaterialState();
});
dom.categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  [...dom.categoryTabs.children].forEach((tab) => {
    const active = tab === button;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  const selected = activeComponents().find((item) => item.id === state.selectedPartId);
  if (selected && !componentMatchesFilters(selected)) selectPart(null);
  updateFilter();
  setMaterialState();
});
dom.fullscreen.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showToast("Fullscreen is unavailable in this browser.", "error");
  }
});

window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, select")) return;
  if (event.key === "Escape" && dom.arDialog.classList.contains("visible")) {
    closeAROptions();
    return;
  }
  if (event.key === "ArrowRight" && !state.assembly) setGuideStep(state.guideStep + 1);
  if (event.key === "ArrowLeft" && !state.assembly) setGuideStep(state.guideStep - 1);
  if (event.key.toLowerCase() === "x") dom.xrayTool.click();
  if (event.key.toLowerCase() === "c") setSectionEnabled(!state.sectionEnabled);
  if (event.key.toLowerCase() === "n") setAnnotationsEnabled(!state.annotations);
  if (event.key.toLowerCase() === "a") {
    if (state.assembly) exitAssemblyMode({ restore: true, announce: true });
    else startAssemblyMode();
  }
  if (event.key.toLowerCase() === "r") resetExperience();
  if (event.key === " " && !state.assembly) {
    event.preventDefault();
    setGuidePlaying(!state.guidePlaying);
  }
  if (event.key === "Escape" && state.challenge) exitChallenge();
  if (event.key === "Escape" && state.assembly) exitAssemblyMode({ restore: true });
});

window.addEventListener("resize", resize);
window.addEventListener("beforeunload", () => {
  if (arTracking.mode === "marker") void arTracking.stop().catch(() => {});
});

createModelSelectors();
switchModel(state.modelId, false);
resize();

let previousFrameTime = performance.now();
function animate(frameTime = performance.now(), xrFrame = null) {
  const delta = Math.min(Math.max((frameTime - previousFrameTime) / 1000, 0), 0.05);
  previousFrameTime = frameTime;
  if (Math.abs(state.explosion - state.targetExplosion) > 0.001) {
    const next = THREE.MathUtils.damp(state.explosion, state.targetExplosion, 5.5, delta);
    applyExplosion(next);
  } else if (state.explosion !== state.targetExplosion) {
    applyExplosion(state.targetExplosion);
  }
  activeModel.update?.(delta);
  updateAssemblyAnimation(frameTime);
  if (state.arMode && state.arSpin) assembly.rotation.y += delta * 0.42;
  arTracking.update(xrFrame);
  updateSectionPlane();
  if (!state.arMode) controls.update();
  updateLabels();
  updateSpatialAnnotation();
  renderer.render(scene, arTracking.getRenderCamera());
}
renderer.setAnimationLoop(animate);
