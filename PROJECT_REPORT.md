# InsightXR: Mixed-Reality Exploded View Trainer

## Project concept

InsightXR reveals the internal structure of a complex product without requiring the learner to dismantle it first. The user can smoothly “disintegrate” a complete 3D assembly into a spatial exploded view, inspect every component, and understand how function, position, material, and safe service order relate.

The model can then be anchored to a real table, floor, or printed marker. Because its pose is tracked rather than attached to the screen, the learner can physically move around it and inspect the assembly from different viewpoints.

The demonstration product is the fictional **AeroCore S1**, with ten serviceable components across structure, airflow, electronics, and power systems.

## Problem

Repair manuals and textbook diagrams often:

1. Flatten a three-dimensional assembly into a static page.
2. Separate component descriptions from their physical location.
3. Show what to remove without clearly communicating spatial dependencies and safe order.

Learners must mentally reconstruct the product while remembering names, functions, and safety rules.

## Proposed solution

- **Continuous exploded view:** Move from fully assembled to fully separated.
- **Dependency-aware motion:** External and early-service parts separate before deep components.
- **Contextual inspection:** Each part includes function, material, metric, handling risk, and service information.
- **Guided learning:** Six stages explain access, filtration, airflow, sensing, power, and repairability.
- **System isolation:** Focus only on airflow, electronics, structure, or power.
- **X-ray view:** Reveal internals while retaining enclosure context.
- **Markerless tracking:** WebXR hit testing places the model on a detected horizontal surface.
- **Marker tracking:** AR.js attaches the model to a printed Hiro marker when WebXR is unavailable.
- **Active assessment:** A maintenance challenge tests the safe removal sequence.

## Distinctive contribution

InsightXR combines:

1. **Spatial understanding** — where each part is and how it connects.
2. **Semantic understanding** — what it does and why it matters.
3. **Procedural understanding** — how to reach it safely.
4. **Embodied understanding** — the learner can walk around a world-locked model.

This turns an exploded animation into an interactive repair-training system.

## User experience

1. Study and rotate the complete AeroCore in Studio mode.
2. Use the explosion slider or guided tour to reveal internal layers.
3. Inspect components and isolate systems.
4. Open Tracked AR.
5. Either scan a surface and tap to place, or point the camera at the printed marker.
6. Physically walk around the anchored model.
7. Explode or X-ray the assembly while it remains anchored.
8. Complete the service challenge in Studio mode.

## Technical implementation

- **3D engine:** Three.js
- **Build system:** Vite
- **Markerless tracking:** WebXR Device API and Hit Test Module
- **Marker tracking:** AR.js / ARToolKit
- **Camera access:** Browser media APIs
- **Model content:** Procedurally generated and license-free
- **Interaction:** Mouse, trackpad, touch, and XR select events
- **Security:** Camera modes require HTTPS; frames remain on-device
- **Testing:** Node unit tests, production build, and browser interaction checks

The markerless model pose is stored in the XR local reference space and uses a native XR anchor when the device supplies the optional anchor feature. Marker mode derives the model transform continuously from the detected marker pose.

## Platform strategy

WebXR surface placement is the higher-quality path on compatible Android devices. Web support is not uniform across phone platforms, so marker tracking provides a practical fallback. The interface detects markerless support and disables that option when it is unavailable.

## Evaluation plan

1. Give one group a static exploded diagram and another group InsightXR.
2. Ask both groups to identify component locations, explain functions, and perform the correct service order.
3. Measure completion time, sequence errors, spatial-identification errors, and quiz recall.
4. Compare a seated Studio condition with a tracked walk-around condition.
5. Collect usability and confidence ratings.

Expected result: tracked spatial inspection should improve understanding of component relationships and reduce maintenance-sequence errors.

## Demonstration script

1. Explain that a static diagram makes the learner reconstruct the object mentally.
2. Rotate the AeroCore in Studio mode.
3. Show the staged exploded view and component information.
4. Open Tracked AR.
5. Scan a table and tap to place the model, or use the printed marker fallback.
6. Walk to the side of the model to prove that it is fixed in real space.
7. Explode the model while it remains anchored.
8. Conclude: “InsightXR connects what a component is, where it is, how to reach it, and how it sits in the real world.”

## Completion status

This is a working application, not a non-interactive prototype. Studio inspection, tracked markerless placement, marker anchoring, exploded view, X-ray view, guided learning, filtering, and assessment paths are implemented and production-buildable.
