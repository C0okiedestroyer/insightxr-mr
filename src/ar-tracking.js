import * as THREE from "three";
import { MarkerPoseFilter } from "./marker-pose-filter.js";

const CAMERA_PARAMETERS =
  "data:application/octet-stream;base64,AAACgAAAAeBAgwrsW6bUSwAAAAAAAAAAQHQ3KqAAAAAAAAAAAAAAAAAAAAAAAAAAQIL0K3dHyf9AbbNowAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/wAAAAAAAAAAAAAAAAAAA/uWNa4AAAAL+3lTLAAAAAv17YFWAAAAA/VYLXIAAAAECCe0YgAAAAQIJlMOAAAABAdDcqoAAAAEBts2jAAAAAP+8OmzqkDy4=";

const HIRO_PATTERN = `${import.meta.env.BASE_URL}tracking/patt.hiro`;

export class ARTrackingController {
  constructor({ renderer, scene, camera, stage, onStatus, onEnd }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.markerCamera = new THREE.Camera();
    this.stage = stage;
    this.onStatus = onStatus;
    this.onEnd = onEnd;
    this.mode = null;
    this.session = null;
    this.hitTestSource = null;
    this.lastHitResult = null;
    this.anchor = null;
    this.anchorSpace = null;
    this.controller = null;
    this.source = null;
    this.context = null;
    this.markerRoot = null;
    this.stableMarkerRoot = null;
    this.markerVisible = false;
    this.placed = false;
    this.surfaceModelScale = 0.14;
    this.markerModelScale = 0.22;
    this.objectScale = 1;
    this.objectYaw = 0;
    this.objectOffset = new THREE.Vector3();
    this.surfaceAnchorRoot = new THREE.Group();
    this.surfaceAnchorRoot.name = "WebXR world anchor";
    this.markerStartedAt = 0;
    this.markerFrames = 0;
    this.markerFoundFrames = 0;
    this.markerMissedFrames = 0;
    this.markerLockFrames = 4;
    this.markerLossToleranceFrames = 18;
    this.rawMarkerPosition = new THREE.Vector3();
    this.rawMarkerQuaternion = new THREE.Quaternion();
    this.rawMarkerScale = new THREE.Vector3();
    this.markerPoseFilter = new MarkerPoseFilter();
    this.defaultPixelRatio = Math.min(window.devicePixelRatio, 2);
    this.resizeHandler = () => this.resizeMarkerView();

    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.095, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x62eee5,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.reticle.renderOrder = 10;
    this.scene.add(this.reticle);
  }

  async surfaceSupported() {
    if (!navigator.xr?.isSessionSupported || !window.isSecureContext) return false;
    try {
      return await navigator.xr.isSessionSupported("immersive-ar");
    } catch {
      return false;
    }
  }

  async startSurface() {
    if (!(await this.surfaceSupported())) {
      throw new Error("Markerless WebXR is not available on this device or browser.");
    }

    this.mode = "surface";
    this.placed = false;
    this.resetObjectTransform();
    this.scene.add(this.surfaceAnchorRoot);
    this.surfaceAnchorRoot.add(this.stage);
    this.surfaceAnchorRoot.position.set(0, 0, 0);
    this.surfaceAnchorRoot.quaternion.identity();
    this.surfaceAnchorRoot.scale.set(1, 1, 1);
    this.stage.visible = false;
    this.reticle.visible = false;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType("local");
    this.renderer.xr.setFramebufferScaleFactor(
      Math.min(window.devicePixelRatio || 1, 1.5),
    );

    const overlay = document.querySelector("#tracked-ar-overlay");
    this.session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test", "dom-overlay"],
      optionalFeatures: ["anchors", "light-estimation"],
      domOverlay: { root: overlay },
    });

    this.session.addEventListener("end", () => {
      this.finishSession();
      this.onEnd?.("surface");
    }, { once: true });

    await this.renderer.xr.setSession(this.session);
    const viewerSpace = await this.session.requestReferenceSpace("viewer");
    this.hitTestSource = await this.session.requestHitTestSource({ space: viewerSpace });

    this.controller = this.renderer.xr.getController(0);
    this.controller.addEventListener("select", () => this.placeAtReticle());
    this.scene.add(this.controller);
    this.onStatus?.("scanning", "Move your phone slowly to find a horizontal surface.");
  }

  async startMarker() {
    this.mode = "marker";
    this.placed = true;
    this.reticle.visible = false;
    this.renderer.xr.enabled = false;
    this.markerCamera.position.set(0, 0, 0);
    this.markerCamera.quaternion.identity();
    this.markerCamera.scale.set(1, 1, 1);
    this.markerCamera.updateMatrix();
    this.markerCamera.updateMatrixWorld(true);

    const {
      ArToolkitSource,
      ArToolkitContext,
      ArMarkerControls,
    } = await import("@ar-js-org/ar.js/three.js/build/ar-threex.mjs");
    this.onStatus?.("marker-engine", "Tracking engine loaded. Starting the rear camera…");

    this.markerRoot = new THREE.Group();
    this.markerRoot.name = "Raw Hiro marker pose";
    this.markerRoot.visible = false;
    this.scene.add(this.markerRoot);

    this.stableMarkerRoot = new THREE.Group();
    this.stableMarkerRoot.name = "Stabilized Hiro marker anchor";
    this.stableMarkerRoot.visible = false;
    this.scene.add(this.stableMarkerRoot);
    this.stableMarkerRoot.add(this.stage);
    this.resetObjectTransform();
    this.stage.visible = true;
    this.markerPoseFilter.reset();
    this.markerFoundFrames = 0;
    this.markerMissedFrames = 0;

    const markerTestImage = new URLSearchParams(window.location.search).get("markerTest");
    this.source = new ArToolkitSource({
      sourceType: markerTestImage ? "image" : "webcam",
      sourceUrl: markerTestImage || null,
      sourceWidth: 1280,
      sourceHeight: 960,
      displayWidth: window.innerWidth,
      displayHeight: window.innerHeight,
    });

    await new Promise((resolve, reject) => {
      this.source.init(resolve, reject);
    });
    await this.waitForMarkerSource();
    this.onStatus?.("marker-camera", "Camera running. Initializing marker recognition…");

    this.context = new ArToolkitContext({
      cameraParametersUrl: CAMERA_PARAMETERS,
      detectionMode: "mono",
      patternRatio: 0.5,
      canvasWidth: 640,
      canvasHeight: 480,
      maxDetectionRate: 60,
      imageSmoothingEnabled: false,
    });

    await new Promise((resolve) => {
      this.context.init(() => {
        this.markerCamera.projectionMatrix.copy(this.context.getProjectionMatrix());
        this.markerCamera.projectionMatrixInverse.copy(this.markerCamera.projectionMatrix).invert();
        this.markerCamera.updateMatrixWorld(true);
        resolve();
      });
    });

    this.markerControls = new ArMarkerControls(this.context, this.markerRoot, {
      type: "pattern",
      patternUrl: HIRO_PATTERN,
      size: 0.16,
      changeMatrixMode: "modelViewMatrix",
      minConfidence: 0.75,
      smooth: false,
    });

    this.markerStartedAt = performance.now();
    this.markerFrames = 0;
    this.resizeMarkerView();
    window.addEventListener("resize", this.resizeHandler);
    this.onStatus?.("marker-search", "Point the camera at the full Hiro marker.");
  }

  update(frame) {
    if (this.mode === "surface" && frame) this.updateSurface(frame);
    if (this.mode === "marker") this.updateMarker();
  }

  getRenderCamera() {
    return this.mode === "marker" ? this.markerCamera : this.camera;
  }

  getProjectionCamera() {
    if (this.mode === "marker") return this.markerCamera;
    if (this.mode === "surface" && this.renderer.xr.isPresenting) {
      const xrCamera = this.renderer.xr.getCamera(this.camera);
      return xrCamera.cameras?.[0] ?? xrCamera;
    }
    return this.camera;
  }

  updateSurface(frame) {
    const referenceSpace = this.renderer.xr.getReferenceSpace();
    if (!referenceSpace) return;

    if (this.anchorSpace) {
      const anchorPose = frame.getPose(this.anchorSpace, referenceSpace);
      if (anchorPose) this.applyPoseToAnchor(anchorPose.transform.matrix);
    }

    if (!this.hitTestSource || this.placed) {
      this.reticle.visible = false;
      return;
    }

    const results = frame.getHitTestResults(this.hitTestSource);
    if (!results.length) {
      this.reticle.visible = false;
      this.lastHitResult = null;
      this.onStatus?.("scanning", "Move your phone slowly to find a horizontal surface.");
      return;
    }

    const pose = results[0].getPose(referenceSpace);
    if (!pose) return;
    this.lastHitResult = results[0];
    this.reticle.visible = true;
    this.reticle.matrix.fromArray(pose.transform.matrix);
    this.onStatus?.("surface-found", "Surface found — tap once to place the model.");
  }

  updateMarker() {
    if (!this.source?.ready || !this.context) return;
    this.context.update(this.source.domElement);
    this.markerFrames += 1;
    const rawVisible = Boolean(this.markerRoot?.visible);

    if (rawVisible) {
      this.markerFoundFrames += 1;
      this.markerMissedFrames = 0;
      this.markerRoot.matrix.decompose(
        this.rawMarkerPosition,
        this.rawMarkerQuaternion,
        this.rawMarkerScale,
      );

      const result = this.markerPoseFilter.update(
        this.rawMarkerPosition,
        this.rawMarkerQuaternion,
        performance.now(),
      );

      if (result.accepted && this.markerFoundFrames >= this.markerLockFrames) {
        this.stableMarkerRoot.position.copy(this.markerPoseFilter.position);
        this.stableMarkerRoot.quaternion.copy(this.markerPoseFilter.quaternion);
        this.stableMarkerRoot.scale.set(1, 1, 1);
        this.stableMarkerRoot.visible = true;

        if (!this.markerVisible) {
          this.markerVisible = true;
          this.onStatus?.(
            "marker-found",
            "Marker visible — this preview follows the marker and does not map the room.",
          );
        }
      }
      return;
    }

    this.markerFoundFrames = 0;
    this.markerMissedFrames += 1;

    if (this.markerVisible && this.markerMissedFrames <= this.markerLossToleranceFrames) {
      return;
    }

    if (this.markerVisible) {
      this.markerVisible = false;
      this.stableMarkerRoot.visible = false;
      this.markerPoseFilter.reset();
      this.onStatus?.(
        "marker-search",
        "Marker lost — hold the full square steady to reacquire it.",
      );
      return;
    }

    if (this.markerFrames === 180) {
      this.onStatus?.(
        "marker-timeout",
        "Tracker is running, but no marker was found. Show the entire square with a white margin.",
      );
    }
  }

  async placeAtReticle() {
    if (this.mode !== "surface" || !this.reticle.visible) return;
    this.applyPoseToAnchor(this.reticle.matrix.elements);
    this.stage.visible = true;
    this.placed = true;
    this.reticle.visible = false;
    this.onStatus?.(
      "anchored",
      "World anchor locked — walk around it and keep this AR session open.",
    );

    if (this.lastHitResult?.createAnchor) {
      try {
        this.anchor = await this.lastHitResult.createAnchor();
        this.anchorSpace = this.anchor.anchorSpace;
      } catch {
        // The local XR reference space still keeps the placement world-relative.
      }
    }
  }

  applyPoseToAnchor(matrix) {
    const poseMatrix = new THREE.Matrix4().fromArray(matrix);
    poseMatrix.decompose(
      this.surfaceAnchorRoot.position,
      this.surfaceAnchorRoot.quaternion,
      this.surfaceAnchorRoot.scale,
    );
  }

  applyObjectTransform() {
    const baseScale = this.mode === "marker"
      ? this.markerModelScale
      : this.surfaceModelScale;
    this.stage.position.copy(this.objectOffset);
    this.stage.rotation.set(0, this.objectYaw, 0);
    this.stage.scale.setScalar(baseScale * this.objectScale);
  }

  rotateObject(deltaRadians) {
    if (!this.mode) return;
    this.objectYaw += deltaRadians;
    this.applyObjectTransform();
  }

  setObjectScale(scale) {
    if (!this.mode) return;
    this.objectScale = THREE.MathUtils.clamp(scale, 0.55, 2);
    this.applyObjectTransform();
  }

  setModelScales(surfaceScale, markerScale) {
    this.surfaceModelScale = surfaceScale;
    this.markerModelScale = markerScale;
    if (this.mode) this.applyObjectTransform();
  }

  moveObject(x, y, z) {
    if (this.mode !== "surface" || !this.placed) return false;
    this.objectOffset.x = THREE.MathUtils.clamp(this.objectOffset.x + x, -0.75, 0.75);
    this.objectOffset.y = THREE.MathUtils.clamp(this.objectOffset.y + y, -0.25, 0.75);
    this.objectOffset.z = THREE.MathUtils.clamp(this.objectOffset.z + z, -0.75, 0.75);
    this.applyObjectTransform();
    return true;
  }

  resetObjectTransform() {
    this.objectScale = 1;
    this.objectYaw = 0;
    this.objectOffset.set(0, 0, 0);
    this.applyObjectTransform();
  }

  replace() {
    if (this.mode === "surface") {
      this.anchor?.delete?.();
      this.anchor = null;
      this.anchorSpace = null;
      this.placed = false;
      this.stage.visible = false;
      this.objectOffset.set(0, 0, 0);
      this.applyObjectTransform();
      this.onStatus?.("scanning", "Move your phone slowly, then tap a surface.");
    } else if (this.mode === "marker") {
      this.onStatus?.("marker-search", "Move the printed marker to a new location.");
    }
  }

  resizeMarkerView() {
    if (!this.source?.ready) return;
    const video = this.source.domElement;
    this.source.onResizeElement();
    const displayWidth = Math.max(1, parseFloat(video.style.width) || window.innerWidth);
    const displayHeight = Math.max(1, parseFloat(video.style.height) || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(displayWidth, displayHeight, false);
    this.source.copyElementSizeTo(this.renderer.domElement);
    if (this.context?.arController) {
      this.source.copyElementSizeTo(this.context.arController.canvas);
    }
  }

  async waitForMarkerSource() {
    const sourceElement = this.source?.domElement;
    if (!sourceElement || sourceElement.nodeName !== "VIDEO") return;

    const track = sourceElement.srcObject?.getVideoTracks?.()[0];
    if (track?.applyConstraints) {
      try {
        await track.applyConstraints({
          width: { ideal: 1280 },
          height: { ideal: 960 },
          aspectRatio: { ideal: 4 / 3 },
          frameRate: { ideal: 30, max: 60 },
        });
      } catch {
        // Continue with the closest camera mode supplied by the browser.
      }
    }

    if (sourceElement.readyState >= 2 && sourceElement.videoWidth > 0) return;
    await new Promise((resolve) => {
      const finish = () => {
        sourceElement.removeEventListener("loadedmetadata", finish);
        sourceElement.removeEventListener("canplay", finish);
        resolve();
      };
      sourceElement.addEventListener("loadedmetadata", finish, { once: true });
      sourceElement.addEventListener("canplay", finish, { once: true });
      window.setTimeout(finish, 2500);
    });
  }

  async stop() {
    if (this.mode === "surface") {
      if (this.session) {
        await this.session.end();
      } else {
        this.finishSession();
        this.onEnd?.("surface");
      }
      return;
    }
    if (this.mode === "marker") {
      this.stopMarker();
      this.onEnd?.("marker");
    }
  }

  stopMarker() {
    window.removeEventListener("resize", this.resizeHandler);
    const video = this.source?.domElement;
    video?.srcObject?.getTracks?.().forEach((track) => track.stop());
    video?.remove?.();

    if (this.stableMarkerRoot) {
      this.scene.add(this.stage);
      this.scene.remove(this.stableMarkerRoot);
    }
    if (this.markerRoot) {
      this.scene.remove(this.markerRoot);
    }

    this.source = null;
    this.context = null;
    this.markerControls = null;
    this.markerRoot = null;
    this.stableMarkerRoot = null;
    this.markerVisible = false;
    this.markerFrames = 0;
    this.markerFoundFrames = 0;
    this.markerMissedFrames = 0;
    this.markerStartedAt = 0;
    this.markerPoseFilter.reset();
    this.renderer.setPixelRatio(this.defaultPixelRatio);
    this.finishSession();
  }

  finishSession() {
    this.hitTestSource?.cancel?.();
    this.hitTestSource = null;
    this.anchor?.delete?.();
    this.anchor = null;
    this.anchorSpace = null;
    if (this.stage.parent === this.surfaceAnchorRoot) {
      this.scene.add(this.stage);
    }
    this.scene.remove(this.surfaceAnchorRoot);
    if (this.controller) this.scene.remove(this.controller);
    this.controller = null;
    this.session = null;
    this.reticle.visible = false;
    this.mode = null;
    this.placed = false;
    this.renderer.xr.enabled = false;
  }
}
