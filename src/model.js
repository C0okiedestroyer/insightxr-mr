import * as THREE from "three";
import { COMPONENTS, MODEL_LIBRARY } from "./data.js";

let componentById = new Map(COMPONENTS.map((component) => [component.id, component]));

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.52,
    metalness: options.metalness ?? 0.08,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
  });
}

function addEdges(mesh, color = 0x243b47, opacity = 0.18) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 18),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
  edges.userData.isEdge = true;
  mesh.add(edges);
}

function mesh(geometry, meshMaterial, { edges = false } = {}) {
  const result = new THREE.Mesh(geometry, meshMaterial);
  result.castShadow = true;
  result.receiveShadow = true;
  if (edges) addEdges(result);
  return result;
}

function createPart(id, explodeVector) {
  const group = new THREE.Group();
  const definition = componentById.get(id);
  group.name = id;
  group.userData = {
    partId: id,
    definition,
    basePosition: new THREE.Vector3(),
    baseQuaternion: new THREE.Quaternion(),
    explodeVector: new THREE.Vector3(...explodeVector),
    labelOffset: new THREE.Vector3(0, 0.2, 0),
  };
  return group;
}

function registerPart(group, parts) {
  group.traverse((child) => {
    if (!child.isMesh) return;
    child.userData.partId = group.userData.partId;
    child.material = child.material.clone();
    child.material.userData.baseOpacity = child.material.opacity;
    child.material.userData.baseTransparent = child.material.transparent;
  });
  group.userData.basePosition.copy(group.position);
  group.userData.baseQuaternion.copy(group.quaternion);
  parts.set(group.userData.partId, group);
  return group;
}

function createShell(id, side, color) {
  const group = createPart(id, [side * 3.2, 0.25, side * -0.35]);
  const shellMaterial = material(color, {
    roughness: 0.35,
    metalness: 0.05,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });
  const shell = mesh(
    new THREE.CylinderGeometry(1.34, 1.34, 3.18, 48, 1, true, side > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI),
    shellMaterial,
    { edges: true },
  );
  group.add(shell);

  const rimMaterial = material(color, { roughness: 0.3 });
  for (const y of [-1.5, 1.5]) {
    const rim = mesh(new THREE.TorusGeometry(1.34, 0.055, 8, 32, Math.PI), rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    rim.position.y = y;
    group.add(rim);
  }

  for (const y of [-1.05, -0.35, 0.35, 1.05]) {
    const rib = mesh(new THREE.BoxGeometry(0.055, 0.045, 2.35), rimMaterial);
    rib.position.set(side * 0.1, y, 0);
    rib.rotation.y = side * 0.05;
    group.add(rib);
  }

  group.userData.labelOffset.set(side * 0.5, 0.6, 0);
  return group;
}

function createTopGrille() {
  const group = createPart("top-grille", [-1.4, 1.75, -0.4]);
  const outer = mesh(
    new THREE.CylinderGeometry(1.36, 1.36, 0.22, 48),
    material("#9fb2bb", { roughness: 0.32, metalness: 0.14 }),
    { edges: true },
  );
  group.add(outer);

  const dark = material("#263945", { roughness: 0.5 });
  for (let radius = 0.24; radius < 1.15; radius += 0.22) {
    const ring = mesh(new THREE.TorusGeometry(radius, 0.035, 6, 40), dark);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.125;
    group.add(ring);
  }
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    const spoke = mesh(new THREE.BoxGeometry(0.045, 0.04, 1.05), dark);
    spoke.position.y = 0.13;
    spoke.rotation.y = angle;
    group.add(spoke);
  }
  group.position.y = 1.72;
  group.userData.labelOffset.set(0.2, 0.35, 0);
  return group;
}

function createPreFilter() {
  const group = createPart("pre-filter", [0, 0.1, 2.65]);
  const filterMaterial = material("#4bc5b2", {
    roughness: 0.76,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const body = mesh(new THREE.CylinderGeometry(1.08, 1.08, 1.95, 40, 1, true), filterMaterial, { edges: true });
  group.add(body);

  const wireMaterial = new THREE.LineBasicMaterial({ color: 0x9af4e1, transparent: true, opacity: 0.34 });
  for (let y = -0.9; y <= 0.9; y += 0.18) {
    const ring = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(1.09, 1.09, 0.01, 40)), wireMaterial);
    ring.position.y = y;
    group.add(ring);
  }
  group.position.y = -0.14;
  group.userData.labelOffset.set(0.35, 0.45, 0.2);
  return group;
}

function createHepaFilter() {
  const group = createPart("hepa-filter", [-0.15, 0, 2.05]);
  const paper = material("#ead180", { roughness: 0.9, side: THREE.DoubleSide });
  const core = mesh(new THREE.CylinderGeometry(0.86, 0.86, 1.78, 48, 1, true), paper);
  group.add(core);

  const foldMaterial = new THREE.LineBasicMaterial({ color: 0xb59a4d, transparent: true, opacity: 0.52 });
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 24) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(angle) * 0.865, -0.87, Math.sin(angle) * 0.865),
      new THREE.Vector3(Math.cos(angle) * 0.865, 0.87, Math.sin(angle) * 0.865),
    ]);
    group.add(new THREE.Line(geometry, foldMaterial));
  }

  const capMaterial = material("#3e525c", { roughness: 0.48 });
  for (const y of [-0.92, 0.92]) {
    const cap = mesh(new THREE.TorusGeometry(0.86, 0.08, 8, 40), capMaterial);
    cap.rotation.x = Math.PI / 2;
    cap.position.y = y;
    group.add(cap);
  }
  group.position.y = -0.18;
  group.userData.labelOffset.set(-0.3, 0.25, 0.15);
  return group;
}

function createFanRotor() {
  const group = createPart("fan-rotor", [0, 1.55, 1.35]);
  const fanMaterial = material("#43cbe2", { roughness: 0.28, metalness: 0.08 });
  const hub = mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.34, 28), fanMaterial, { edges: true });
  group.add(hub);

  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2;
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0.18, -0.08);
    bladeShape.quadraticCurveTo(0.65, -0.18, 0.92, 0.04);
    bladeShape.quadraticCurveTo(0.58, 0.22, 0.12, 0.12);
    bladeShape.closePath();
    const blade = mesh(
      new THREE.ExtrudeGeometry(bladeShape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 2 }),
      fanMaterial,
    );
    blade.rotation.x = Math.PI / 2;
    blade.rotation.z = angle;
    blade.position.y = 0.02;
    group.add(blade);
  }
  const ring = mesh(new THREE.TorusGeometry(1.02, 0.05, 8, 48), material("#2b8495", { metalness: 0.2 }));
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  group.position.y = 1.05;
  group.userData.labelOffset.set(0.3, 0.35, 0);
  return group;
}

function createMotor() {
  const group = createPart("motor", [0.5, 1.0, -2.15]);
  const casing = mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.68, 32),
    material("#db8950", { roughness: 0.25, metalness: 0.62 }),
    { edges: true },
  );
  group.add(casing);
  const shaft = mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.72, 18),
    material("#d8e1e5", { roughness: 0.18, metalness: 0.85 }),
  );
  shaft.position.y = 0.46;
  group.add(shaft);
  for (let i = 0; i < 8; i += 1) {
    const vent = mesh(new THREE.BoxGeometry(0.035, 0.26, 0.11), material("#5b3729"));
    const angle = (i / 8) * Math.PI * 2;
    vent.position.set(Math.cos(angle) * 0.39, 0, Math.sin(angle) * 0.39);
    vent.rotation.y = -angle;
    group.add(vent);
  }
  group.position.y = 0.62;
  group.userData.labelOffset.set(0.25, 0.4, 0);
  return group;
}

function createCircuitBoard(id, dimensions, color, explodeVector) {
  const group = createPart(id, explodeVector);
  const [width, height] = dimensions;
  const board = mesh(
    new THREE.BoxGeometry(width, height, 0.07),
    material(color, { roughness: 0.46 }),
    { edges: true },
  );
  group.add(board);

  const chipMaterial = material("#17252b", { roughness: 0.3, metalness: 0.18 });
  const chipPositions = [
    [-0.2, 0.16, 0.07, 0.28, 0.22],
    [0.22, -0.18, 0.07, 0.2, 0.16],
    [0.2, 0.22, 0.07, 0.12, 0.12],
  ];
  chipPositions.forEach(([x, y, z, w, h]) => {
    const chip = mesh(new THREE.BoxGeometry(w, h, 0.09), chipMaterial);
    chip.position.set(x * width, y * height, z);
    group.add(chip);
  });

  const contactMaterial = material("#e9bf52", { roughness: 0.2, metalness: 0.7 });
  for (let i = -2; i <= 2; i += 1) {
    const contact = mesh(new THREE.BoxGeometry(0.05, 0.11, 0.025), contactMaterial);
    contact.position.set((i * width) / 7, -height / 2 + 0.09, 0.055);
    group.add(contact);
  }
  return group;
}

function createSensorBoard() {
  const group = createCircuitBoard("sensor-board", [0.72, 0.95], "#725fd6", [2.45, 0.2, 0.8]);
  group.position.set(0.96, -0.1, 0.05);
  group.rotation.y = -Math.PI / 2;
  const aperture = mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.12, 24),
    material("#17202b", { roughness: 0.18, metalness: 0.2 }),
  );
  aperture.rotation.x = Math.PI / 2;
  aperture.position.set(0, 0.24, 0.11);
  group.add(aperture);
  group.userData.labelOffset.set(0.1, 0.55, 0);
  return group;
}

function createControllerBoard() {
  const group = createCircuitBoard("controller-board", [1.08, 0.78], "#3da866", [-2.45, -0.65, 0.8]);
  group.position.set(-0.88, -0.95, 0);
  group.rotation.y = Math.PI / 2;
  group.userData.labelOffset.set(-0.1, 0.5, 0);
  return group;
}

function createBatteryPack() {
  const group = createPart("battery-pack", [0.2, -1.65, -2.1]);
  const holder = mesh(
    new THREE.BoxGeometry(1.08, 0.72, 0.62),
    material("#283a43", { roughness: 0.42 }),
    { edges: true },
  );
  group.add(holder);

  const cellMaterial = material("#e76565", { roughness: 0.3, metalness: 0.16 });
  for (const x of [-0.27, 0.27]) {
    for (const y of [-0.17, 0.17]) {
      const cell = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 24), cellMaterial);
      cell.rotation.z = Math.PI / 2;
      cell.position.set(0, y, x);
      group.add(cell);
    }
  }
  group.position.set(0, -1.28, -0.15);
  group.userData.labelOffset.set(0.25, 0.45, 0);
  return group;
}

function createBase() {
  const group = new THREE.Group();
  const baseMaterial = material("#344a55", { roughness: 0.45, metalness: 0.1 });
  const base = mesh(new THREE.CylinderGeometry(1.38, 1.43, 0.34, 48), baseMaterial, { edges: true });
  group.add(base);
  const footMaterial = material("#14232a", { roughness: 0.8 });
  for (let i = 0; i < 4; i += 1) {
    const angle = Math.PI / 4 + (i * Math.PI) / 2;
    const foot = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 16), footMaterial);
    foot.position.set(Math.cos(angle) * 0.92, -0.2, Math.sin(angle) * 0.92);
    group.add(foot);
  }
  group.position.y = -1.78;
  return group;
}

export function createAeroCoreModel() {
  const assembly = new THREE.Group();
  assembly.name = "AeroCore S1";
  assembly.rotation.y = -0.28;
  const parts = new Map();

  const partGroups = [
    createTopGrille(),
    createShell("left-shell", -1, "#d9e3e6"),
    createShell("right-shell", 1, "#8fa6b0"),
    createPreFilter(),
    createHepaFilter(),
    createFanRotor(),
    createMotor(),
    createSensorBoard(),
    createControllerBoard(),
    createBatteryPack(),
  ];

  partGroups.forEach((part) => {
    registerPart(part, parts);
    assembly.add(part);
  });
  assembly.add(createBase());

  const airflow = new THREE.Group();
  airflow.name = "airflow-visualization";
  const curveMaterial = new THREE.LineBasicMaterial({ color: 0x68e6fa, transparent: true, opacity: 0.26 });
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * 0.75, -1.35, Math.sin(angle) * 0.75),
      new THREE.Vector3(Math.cos(angle + 0.2) * 0.65, -0.25, Math.sin(angle + 0.2) * 0.65),
      new THREE.Vector3(Math.cos(angle + 0.6) * 0.5, 0.9, Math.sin(angle + 0.6) * 0.5),
      new THREE.Vector3(Math.cos(angle + 1) * 0.45, 1.65, Math.sin(angle + 1) * 0.45),
    ]);
    airflow.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)), curveMaterial));
  }
  assembly.add(airflow);

  return {
    assembly,
    parts,
    effectGroup: airflow,
    update(delta) {
      airflow.rotation.y += delta * 0.18;
    },
  };
}

const DRONE_CORNERS = [
  [-1.42, 0, -1.18],
  [1.42, 0, -1.18],
  [-1.42, 0, 1.18],
  [1.42, 0, 1.18],
];

function createDroneCanopy() {
  const group = createPart("drone-canopy", [0, 2.4, 0.25]);
  const canopy = mesh(
    new THREE.SphereGeometry(0.82, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    material("#dce7eb", {
      roughness: 0.27,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
    { edges: true },
  );
  canopy.scale.set(1.25, 0.62, 1);
  canopy.position.y = 0.23;
  group.add(canopy);
  group.userData.labelOffset.set(0.2, 0.55, 0);
  return group;
}

function createDroneFrame() {
  const group = createPart("drone-frame", [0, -1.5, 0]);
  const carbon = material("#4c606a", { roughness: 0.34, metalness: 0.18 });
  const upper = mesh(new THREE.BoxGeometry(1.48, 0.18, 1.12), carbon, { edges: true });
  upper.position.y = 0.08;
  group.add(upper);
  const lower = mesh(new THREE.BoxGeometry(1.25, 0.14, 0.9), carbon, { edges: true });
  lower.position.y = -0.18;
  group.add(lower);
  for (const x of [-0.52, 0.52]) {
    for (const z of [-0.36, 0.36]) {
      const spacer = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 12), material("#9db0b8"));
      spacer.position.set(x, -0.03, z);
      group.add(spacer);
    }
  }
  group.userData.labelOffset.set(0, 0.42, 0);
  return group;
}

function createDroneArms() {
  const group = createPart("drone-arms", [0, 0.25, 2.7]);
  const armMaterial = material("#728994", { roughness: 0.4 });
  DRONE_CORNERS.forEach(([x, , z]) => {
    const length = Math.hypot(x, z) - 0.42;
    const arm = mesh(new THREE.BoxGeometry(0.2, 0.16, length), armMaterial, { edges: true });
    const angle = Math.atan2(x, z);
    arm.rotation.y = angle;
    arm.position.set(x * 0.48, 0.02, z * 0.48);
    group.add(arm);
    const hinge = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 20), material("#314751"));
    hinge.position.set(x * 0.32, 0.02, z * 0.32);
    group.add(hinge);
  });
  group.userData.labelOffset.set(0.45, 0.38, 0.5);
  return group;
}

function createDronePropellers() {
  const group = createPart("drone-propellers", [0, 2.65, 0]);
  const bladeMaterial = material("#55d7e4", {
    roughness: 0.25,
    transparent: true,
    opacity: 0.84,
    side: THREE.DoubleSide,
  });
  DRONE_CORNERS.forEach(([x, , z], index) => {
    const rotor = new THREE.Group();
    rotor.position.set(x, 0.5, z);
    rotor.userData.spinDirection = index % 2 === 0 ? 1 : -1;
    for (let bladeIndex = 0; bladeIndex < 2; bladeIndex += 1) {
      const blade = mesh(new THREE.BoxGeometry(1.28, 0.035, 0.14), bladeMaterial);
      blade.position.x = bladeIndex === 0 ? 0.38 : -0.38;
      blade.rotation.y = bladeIndex === 0 ? -0.08 : 0.08;
      rotor.add(blade);
    }
    const cap = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 20), material("#213740"));
    rotor.add(cap);
    group.add(rotor);
  });
  group.userData.labelOffset.set(0.3, 0.65, 0.3);
  return group;
}

function createDroneMotors() {
  const group = createPart("drone-motors", [0, 1.25, -2.4]);
  DRONE_CORNERS.forEach(([x, , z]) => {
    const motor = mesh(
      new THREE.CylinderGeometry(0.25, 0.28, 0.3, 24),
      material("#df8d50", { roughness: 0.25, metalness: 0.62 }),
      { edges: true },
    );
    motor.position.set(x, 0.28, z);
    group.add(motor);
    const shaft = mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.34, 12),
      material("#dce3e5", { metalness: 0.82 }),
    );
    shaft.position.set(x, 0.49, z);
    group.add(shaft);
  });
  group.userData.labelOffset.set(0.35, 0.55, -0.25);
  return group;
}

function createDroneController() {
  const group = createCircuitBoard("drone-controller", [0.88, 0.72], "#48aa68", [-1.9, 0.45, -1.6]);
  group.rotation.x = -Math.PI / 2;
  group.position.y = -0.02;
  group.userData.labelOffset.set(-0.2, 0.45, 0);
  return group;
}

function createDroneGps() {
  const group = createPart("drone-gps", [1.9, 1.65, 1.5]);
  const puck = mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.12, 28),
    material("#877ce5", { roughness: 0.32 }),
    { edges: true },
  );
  group.add(puck);
  const antenna = mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), material("#d8d2a2"));
  antenna.position.y = 0.08;
  group.add(antenna);
  group.position.set(0, 0.57, 0.06);
  group.userData.labelOffset.set(0.15, 0.34, 0);
  return group;
}

function createDroneCamera() {
  const group = createPart("drone-camera", [0.3, -2.2, 2.15]);
  const gimbal = mesh(
    new THREE.TorusGeometry(0.36, 0.055, 10, 36),
    material("#7b8790", { metalness: 0.35 }),
  );
  gimbal.rotation.y = Math.PI / 2;
  group.add(gimbal);
  const body = mesh(new THREE.BoxGeometry(0.52, 0.42, 0.4), material("#4e5263"), { edges: true });
  group.add(body);
  const lens = mesh(
    new THREE.CylinderGeometry(0.16, 0.2, 0.2, 28),
    material("#171d25", { roughness: 0.12, metalness: 0.42 }),
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.28;
  group.add(lens);
  group.position.set(0, -0.72, 0.42);
  group.userData.labelOffset.set(0.25, 0.35, 0.3);
  return group;
}

function createDroneBattery() {
  const group = createPart("drone-battery", [0, -1.45, -2.65]);
  const pack = mesh(new THREE.BoxGeometry(0.92, 0.42, 1.15), material("#dc6161"), { edges: true });
  group.add(pack);
  const latch = mesh(new THREE.BoxGeometry(0.42, 0.08, 0.16), material("#263942"));
  latch.position.set(0, 0.24, -0.34);
  group.add(latch);
  group.position.set(0, -0.35, -0.08);
  group.userData.labelOffset.set(0.25, 0.4, -0.2);
  return group;
}

function createDroneLandingGear() {
  const group = createPart("drone-gear", [2.25, -1.6, 0]);
  const gearMaterial = material("#899ea8", { roughness: 0.5 });
  for (const x of [-0.72, 0.72]) {
    for (const z of [-0.5, 0.5]) {
      const leg = mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.05, 12), gearMaterial);
      leg.position.set(x, -0.85, z);
      leg.rotation.z = x > 0 ? -0.18 : 0.18;
      group.add(leg);
    }
    const skid = mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.65, 12), gearMaterial);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(x * 1.08, -1.36, 0);
    group.add(skid);
  }
  group.userData.labelOffset.set(0.35, -0.65, 0.25);
  return group;
}

function createSkyScoutModel() {
  const assembly = new THREE.Group();
  assembly.name = "SkyScout Q4";
  const parts = new Map();
  const partGroups = [
    createDroneCanopy(),
    createDroneFrame(),
    createDroneArms(),
    createDronePropellers(),
    createDroneMotors(),
    createDroneController(),
    createDroneGps(),
    createDroneCamera(),
    createDroneBattery(),
    createDroneLandingGear(),
  ];
  partGroups.forEach((part) => {
    registerPart(part, parts);
    assembly.add(part);
  });
  const propellers = parts.get("drone-propellers");
  return {
    assembly,
    parts,
    effectGroup: null,
    update(delta) {
      propellers.children.forEach((child) => {
        if (child.userData.spinDirection) {
          child.rotation.y += delta * 2.3 * child.userData.spinDirection;
        }
      });
    },
  };
}

function axialCylinder(radius, length, color, options = {}) {
  const result = mesh(
    new THREE.CylinderGeometry(radius, radius, length, options.segments ?? 40, 1, options.openEnded ?? false),
    material(color, options.material),
    { edges: options.edges ?? true },
  );
  result.rotation.z = Math.PI / 2;
  return result;
}

function createDriveFrontCover() {
  const group = createPart("drive-front-cover", [2.55, 0.25, 0]);
  const cover = axialCylinder(1.16, 0.34, "#c7d5da", { material: { roughness: 0.3, metalness: 0.5 } });
  group.add(cover);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const bolt = axialCylinder(0.045, 0.4, "#50616a", { edges: false, segments: 12 });
    bolt.position.set(0.02, Math.cos(angle) * 0.91, Math.sin(angle) * 0.91);
    group.add(bolt);
  }
  group.position.x = 1.2;
  group.userData.labelOffset.set(0.35, 0.45, 0);
  return group;
}

function createDriveRearHousing() {
  const group = createPart("drive-rear-housing", [-2.6, 0.1, 0]);
  const housing = axialCylinder(1.2, 1.52, "#6f8590", {
    material: { roughness: 0.32, metalness: 0.45, transparent: true, opacity: 0.9 },
  });
  group.add(housing);
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    const fin = mesh(new THREE.BoxGeometry(1.1, 0.05, 0.28), material("#607681", { metalness: 0.35 }));
    fin.position.set(-0.1, Math.cos(angle) * 1.13, Math.sin(angle) * 1.13);
    fin.rotation.x = angle;
    group.add(fin);
  }
  group.position.x = -0.63;
  group.userData.labelOffset.set(-0.4, 0.55, 0);
  return group;
}

function createDriveOutput() {
  const group = createPart("drive-output", [3.1, 0, 0.2]);
  const flange = axialCylinder(0.72, 0.3, "#51c7d8", { material: { roughness: 0.25, metalness: 0.68 } });
  group.add(flange);
  const hub = axialCylinder(0.28, 0.62, "#dce4e6", { material: { metalness: 0.8 } });
  hub.position.x = 0.25;
  group.add(hub);
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const hole = axialCylinder(0.055, 0.34, "#21323a", { edges: false, segments: 12 });
    hole.position.set(0.02, Math.cos(angle) * 0.52, Math.sin(angle) * 0.52);
    group.add(hole);
  }
  group.position.x = 1.48;
  group.userData.labelOffset.set(0.45, 0.35, 0);
  return group;
}

function createDriveWaveGear() {
  const group = createPart("drive-wave-gear", [2.0, 1.65, 0]);
  const outer = mesh(
    new THREE.TorusGeometry(0.78, 0.13, 12, 52),
    material("#e4bc5f", { roughness: 0.28, metalness: 0.6 }),
    { edges: true },
  );
  outer.rotation.y = Math.PI / 2;
  group.add(outer);
  const wave = axialCylinder(0.52, 0.38, "#596b74", { material: { metalness: 0.55 } });
  wave.scale.y = 0.83;
  group.add(wave);
  group.position.x = 0.72;
  group.userData.labelOffset.set(0.2, 0.62, 0);
  return group;
}

function createDriveRotor() {
  const group = createPart("drive-rotor", [0.25, 1.9, -1.7]);
  const rotor = axialCylinder(0.58, 1.08, "#db7d4d", { material: { roughness: 0.24, metalness: 0.62 } });
  group.add(rotor);
  const shaft = axialCylinder(0.16, 1.85, "#d9e1e3", { material: { metalness: 0.86 } });
  group.add(shaft);
  group.position.x = -0.12;
  group.userData.labelOffset.set(0.05, 0.62, 0.1);
  return group;
}

function createDriveStator() {
  const group = createPart("drive-stator", [-0.25, -1.85, 1.75]);
  const ring = mesh(
    new THREE.TorusGeometry(0.77, 0.18, 14, 48),
    material("#c96557", { roughness: 0.34, metalness: 0.25 }),
    { edges: true },
  );
  ring.rotation.y = Math.PI / 2;
  group.add(ring);
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    const winding = mesh(new THREE.BoxGeometry(0.68, 0.11, 0.18), material("#e69b59", { metalness: 0.42 }));
    winding.rotation.x = angle;
    winding.position.set(0, Math.cos(angle) * 0.67, Math.sin(angle) * 0.67);
    group.add(winding);
  }
  group.position.x = -0.12;
  group.userData.labelOffset.set(-0.1, -0.55, 0.2);
  return group;
}

function createDriveEncoder() {
  const group = createPart("drive-encoder", [-1.65, 1.35, -1.55]);
  const board = axialCylinder(0.5, 0.1, "#7e73db", { material: { roughness: 0.42 } });
  group.add(board);
  const disc = axialCylinder(0.32, 0.04, "#d7d4b4", { material: { roughness: 0.18, metalness: 0.28 } });
  disc.position.x = 0.08;
  group.add(disc);
  group.position.x = -0.93;
  group.userData.labelOffset.set(-0.15, 0.55, 0);
  return group;
}

function createDriveController() {
  const group = createCircuitBoard("drive-controller", [0.92, 0.9], "#42aa61", [-2.2, -1.65, -0.9]);
  group.rotation.y = Math.PI / 2;
  group.position.set(-1.05, -0.02, 0);
  group.userData.labelOffset.set(-0.2, 0.55, 0);
  return group;
}

function createDriveBrake() {
  const group = createPart("drive-brake", [-1.8, 1.7, 1.25]);
  const brake = mesh(
    new THREE.TorusGeometry(0.64, 0.16, 12, 44),
    material("#e69a4d", { roughness: 0.38, metalness: 0.45 }),
    { edges: true },
  );
  brake.rotation.y = Math.PI / 2;
  group.add(brake);
  group.position.x = -0.78;
  group.userData.labelOffset.set(-0.1, 0.58, 0.2);
  return group;
}

function createDriveCableHub() {
  const group = createPart("drive-cable-hub", [-3.0, -0.5, 0]);
  const hub = axialCylinder(0.5, 0.42, "#8ea3ad", { material: { metalness: 0.4 } });
  group.add(hub);
  for (const z of [-0.22, 0.22]) {
    const connector = axialCylinder(0.12, 0.28, "#253942", { edges: false, segments: 16 });
    connector.position.set(-0.2, 0, z);
    group.add(connector);
  }
  group.position.x = -1.58;
  group.userData.labelOffset.set(-0.3, 0.42, 0);
  return group;
}

function createDriveStand() {
  const stand = new THREE.Group();
  const upright = mesh(new THREE.BoxGeometry(0.32, 1.18, 0.75), material("#344a54"), { edges: true });
  upright.position.set(-0.55, -1.35, 0);
  stand.add(upright);
  const foot = mesh(new THREE.BoxGeometry(2.5, 0.18, 1.25), material("#263941"), { edges: true });
  foot.position.set(0, -1.96, 0);
  stand.add(foot);
  return stand;
}

function createVectorDriveModel() {
  const assembly = new THREE.Group();
  assembly.name = "VectorDrive R3";
  const parts = new Map();
  const partGroups = [
    createDriveFrontCover(),
    createDriveRearHousing(),
    createDriveOutput(),
    createDriveWaveGear(),
    createDriveRotor(),
    createDriveStator(),
    createDriveEncoder(),
    createDriveController(),
    createDriveBrake(),
    createDriveCableHub(),
  ];
  partGroups.forEach((part) => {
    registerPart(part, parts);
    assembly.add(part);
  });
  assembly.add(createDriveStand());
  const rotor = parts.get("drive-rotor");
  return {
    assembly,
    parts,
    effectGroup: null,
    update(delta) {
      rotor.rotation.x += delta * 0.3;
    },
  };
}

export function createProductModel(modelId = "aerocore") {
  const definition = MODEL_LIBRARY[modelId] ?? MODEL_LIBRARY.aerocore;
  componentById = new Map(definition.components.map((component) => [component.id, component]));
  if (definition.id === "skyscout") return createSkyScoutModel();
  if (definition.id === "vectordrive") return createVectorDriveModel();
  return createAeroCoreModel();
}
