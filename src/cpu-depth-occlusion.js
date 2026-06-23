import * as THREE from "three";

export function depthBufferValue(depthMeters, projectionMatrix) {
  if (!(depthMeters > 0)) return 1;
  const elements = projectionMatrix.elements ?? projectionMatrix;
  const ndcDepth = -elements[10] + elements[14] / depthMeters;
  return THREE.MathUtils.clamp(ndcDepth * 0.5 + 0.5, 0, 1);
}

export function copyDepthMeters(depthInformation, dataFormat, target) {
  const count = depthInformation.width * depthInformation.height;
  const output = target?.length === count ? target : new Float32Array(count);
  const raw = dataFormat === "float32"
    ? new Float32Array(depthInformation.data)
    : new Uint16Array(depthInformation.data);
  const scale = depthInformation.rawValueToMeters;
  for (let index = 0; index < count; index += 1) {
    output[index] = raw[index] * scale;
  }
  return output;
}

export class CPUDepthOcclusion {
  constructor(scene) {
    this.scene = scene;
    this.texture = null;
    this.depthMeters = null;
    this.width = 0;
    this.height = 0;
    this.uvTransform = new THREE.Matrix4();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        depthTexture: { value: null },
        uvTransform: { value: this.uvTransform },
        projectionM10: { value: -1 },
        projectionM14: { value: -0.2 },
        occlusionBias: { value: 0.012 },
      },
      vertexShader: `
        varying vec2 viewUv;
        void main() {
          viewUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform sampler2D depthTexture;
        uniform mat4 uvTransform;
        uniform float projectionM10;
        uniform float projectionM14;
        uniform float occlusionBias;
        varying vec2 viewUv;

        void main() {
          vec2 depthUv = (uvTransform * vec4(viewUv, 0.0, 1.0)).xy;
          if (
            depthUv.x < 0.0 || depthUv.x > 1.0
            || depthUv.y < 0.0 || depthUv.y > 1.0
          ) discard;

          float depthMeters = texture2D(depthTexture, depthUv).r;
          if (depthMeters <= 0.0) discard;
          depthMeters = max(0.001, depthMeters - occlusionBias);
          float ndcDepth = -projectionM10 + projectionM14 / depthMeters;
          gl_FragDepth = clamp(ndcDepth * 0.5 + 0.5, 0.0, 1.0);
        }
      `,
      depthTest: true,
      depthWrite: true,
      colorWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.name = "CPU depth occlusion prepass";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100000;
    this.mesh.visible = false;
    this.mesh.onBeforeRender = (_renderer, _scene, camera) => {
      const projection = camera.projectionMatrix.elements;
      this.material.uniforms.projectionM10.value = projection[10];
      this.material.uniforms.projectionM14.value = projection[14];
    };
    scene.add(this.mesh);
  }

  update(frame, referenceSpace, dataFormat) {
    if (!frame?.getViewerPose || !frame?.getDepthInformation || !referenceSpace) {
      this.mesh.visible = false;
      return false;
    }
    const pose = frame.getViewerPose(referenceSpace);
    const view = pose?.views?.[0];
    if (!view) {
      this.mesh.visible = false;
      return false;
    }

    let depthInformation;
    try {
      depthInformation = frame.getDepthInformation(view);
    } catch {
      this.mesh.visible = false;
      return false;
    }
    if (!depthInformation?.data) {
      this.mesh.visible = false;
      return false;
    }

    this.depthMeters = copyDepthMeters(
      depthInformation,
      dataFormat,
      this.depthMeters,
    );
    if (
      !this.texture
      || this.width !== depthInformation.width
      || this.height !== depthInformation.height
    ) {
      this.texture?.dispose();
      this.width = depthInformation.width;
      this.height = depthInformation.height;
      this.texture = new THREE.DataTexture(
        this.depthMeters,
        this.width,
        this.height,
        THREE.RedFormat,
        THREE.FloatType,
      );
      this.texture.minFilter = THREE.NearestFilter;
      this.texture.magFilter = THREE.NearestFilter;
      this.texture.generateMipmaps = false;
      this.texture.flipY = false;
      this.material.uniforms.depthTexture.value = this.texture;
    } else {
      this.texture.image.data = this.depthMeters;
    }
    this.texture.needsUpdate = true;
    this.uvTransform.fromArray(depthInformation.normDepthBufferFromNormView.matrix);
    this.mesh.visible = true;
    return true;
  }

  setEnabled(enabled) {
    this.mesh.visible = Boolean(enabled && this.texture);
  }

  reset() {
    this.mesh.visible = false;
    this.texture?.dispose();
    this.texture = null;
    this.depthMeters = null;
    this.width = 0;
    this.height = 0;
    this.material.uniforms.depthTexture.value = null;
  }
}
