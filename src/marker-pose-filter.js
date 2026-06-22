import * as THREE from "three";

export class MarkerPoseFilter {
  constructor({
    positionResponse = 24,
    rotationResponse = 20,
    positionDeadZone = 0.0015,
    rotationDeadZone = THREE.MathUtils.degToRad(0.45),
    maxPositionJump = 0.22,
    maxRotationJump = THREE.MathUtils.degToRad(55),
    outlierFramesBeforeSnap = 3,
  } = {}) {
    this.positionResponse = positionResponse;
    this.rotationResponse = rotationResponse;
    this.positionDeadZone = positionDeadZone;
    this.rotationDeadZone = rotationDeadZone;
    this.maxPositionJump = maxPositionJump;
    this.maxRotationJump = maxRotationJump;
    this.outlierFramesBeforeSnap = outlierFramesBeforeSnap;
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.initialized = false;
    this.lastTime = 0;
    this.outlierFrames = 0;
  }

  reset() {
    this.position.set(0, 0, 0);
    this.quaternion.identity();
    this.initialized = false;
    this.lastTime = 0;
    this.outlierFrames = 0;
  }

  update(targetPosition, targetQuaternion, timeMs = performance.now()) {
    if (!isFiniteVector(targetPosition) || !isFiniteQuaternion(targetQuaternion)) {
      return { accepted: false, reason: "invalid" };
    }

    if (!this.initialized) {
      this.snap(targetPosition, targetQuaternion, timeMs);
      return { accepted: true, snapped: true };
    }

    const positionJump = this.position.distanceTo(targetPosition);
    const rotationJump = this.quaternion.angleTo(targetQuaternion);
    const isOutlier = positionJump > this.maxPositionJump || rotationJump > this.maxRotationJump;

    if (isOutlier) {
      this.outlierFrames += 1;
      if (this.outlierFrames < this.outlierFramesBeforeSnap) {
        return { accepted: false, reason: "outlier" };
      }
      this.snap(targetPosition, targetQuaternion, timeMs);
      return { accepted: true, snapped: true, reason: "reacquired" };
    }

    this.outlierFrames = 0;
    const deltaSeconds = THREE.MathUtils.clamp((timeMs - this.lastTime) / 1000, 1 / 120, 0.1);
    this.lastTime = timeMs;

    if (positionJump > this.positionDeadZone) {
      const alpha = 1 - Math.exp(-this.positionResponse * deltaSeconds);
      this.position.lerp(targetPosition, alpha);
    }

    if (rotationJump > this.rotationDeadZone) {
      const alpha = 1 - Math.exp(-this.rotationResponse * deltaSeconds);
      this.quaternion.slerp(targetQuaternion, alpha).normalize();
    }

    return { accepted: true, snapped: false };
  }

  snap(targetPosition, targetQuaternion, timeMs) {
    this.position.copy(targetPosition);
    this.quaternion.copy(targetQuaternion).normalize();
    this.initialized = true;
    this.lastTime = timeMs;
    this.outlierFrames = 0;
  }
}

function isFiniteVector(vector) {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function isFiniteQuaternion(quaternion) {
  return (
    Number.isFinite(quaternion.x)
    && Number.isFinite(quaternion.y)
    && Number.isFinite(quaternion.z)
    && Number.isFinite(quaternion.w)
  );
}
