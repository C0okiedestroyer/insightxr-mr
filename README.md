# InsightXR — Exploded View Trainer

InsightXR is a browser-based mixed-reality learning application. It lets learners separate, inspect, and understand a serviceable product in Studio mode, then place the same model at a fixed location in real space and physically walk around it.

All included learning models are generated entirely in code, so there are no proprietary 3D assets:

- **AeroCore S1** — adaptive air-quality module
- **SkyScout Q4** — autonomous imaging quadcopter
- **VectorDrive R3** — precision robotic joint actuator

## Main features

- Continuous, dependency-aware exploded view
- Three switchable procedural product models
- Ten selectable components per model with function, material, safety, and service information
- Model-specific six-stage guided teardowns
- Airflow, electronics, structure, and power isolation
- X-ray enclosure view
- Markerless WebXR surface placement
- Limited printed-marker preview using AR.js
- In-space rotate, scale, nudge, re-place, component inspection, explode, and X-ray controls
- Switch models without discarding the current world anchor
- Isolate a selected component, restore all parts, step through assembly stages, and auto-spin
- Spatial component annotations with live leader lines, safety badges, key metrics, and service notes
- Validated Assembly Mode with ghost targets, snap animations, hints, timing, mistakes, and scoring
- Top-down height cross-sections that match the usual overhead inspection angle
- Environmental occlusion on phones that expose WebXR depth sensing
- Compact, collapsible phone controls and safe single-flight AR shutdown
- Safe-maintenance challenge

## Run on a computer

Requirements: Node.js 20+ and pnpm or npm.

```powershell
pnpm install
pnpm dev
```

If `pnpm` is not installed:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`.

## Run tracked AR on a phone

Camera and WebXR access require a secure context.

```powershell
pnpm dev:phone
```

The npm equivalent is `npm run dev:phone`.

1. Connect the computer and phone to the same network.
2. Find the computer’s local IPv4 address with `ipconfig`.
3. Open `https://YOUR_COMPUTER_IP:5173` on the phone.
4. Trust the local development certificate if the browser permits it.
5. For the most reliable demonstration, deploy the `dist` folder to a normal HTTPS host.
6. Press **Tracked AR** and choose **Place on a surface**.

### Surface placement

This is the preferred markerless mode.

1. Use an Android device/browser that supports WebXR immersive AR and hit testing.
2. Choose **Place on a surface**.
3. Move the phone slowly while pointing at a textured table or floor.
4. When the reticle appears, tap once.
5. The model is now world-relative for the current AR session: walk sideways, look away, or move around it.
6. Use the Transform, Position, component, Explode, and X-ray controls as needed.
7. Switch products from the Model inspector without replacing the world anchor.
8. Press **Re-place** to choose another surface position.

Keep the immersive AR session open. This browser implementation does not save an anchor across a page reload or a new AR session.

### Marker preview

Use this only as an image-tracking preview when markerless WebXR is unavailable.

1. In the AR selection dialog, open the printable Hiro marker.
2. Print it or display it on a second screen, ideally 12–20 cm wide.
3. Choose **Marker preview** and grant camera permission.
4. Keep the complete marker visible while moving around it.

The model pose is derived from the marker. Tracking stops when the marker leaves the camera view and reacquires from the marker when it returns. It does not remember the previous room-space pose.

Marker mode applies a stabilized pose layer: it waits for several consistent detections, smooths position and rotation, rejects isolated pose jumps, and tolerates brief missed frames before hiding the model.

Marker tracking is fixed relative to the marker, not to an independently mapped room. The marker itself must remain stationary and visible. Markerless WebXR surface mode is required if the marker should be removed after placement.

For marker recognition:

- Open `/hiro-marker.html` directly. Do not use a Google Images results page.
- If the second phone cannot reach the PC because the WLAN isolates clients, open the clean public image directly: `https://raw.githubusercontent.com/AR-js-org/AR.js/3.4.8/data/images/hiro.png`, or copy `public/tracking/hiro.png` to the phone.
- Only one copy of the Hiro pattern may be visible; duplicate thumbnails cause the tracker to jump between poses.
- Show the entire black square plus a clear white margin.
- Make the marker occupy roughly one-third to two-thirds of the camera image.
- Keep both phones parallel at first, about 25–50 cm apart.
- Use maximum display brightness and avoid screen glare.
- If screen moiré prevents detection, print the marker on matte paper.
- The AR overlay reports Camera, Tracker, and Marker status separately.

## AR controls

| Action | Control |
| --- | --- |
| Place markerless model | Tap when the surface reticle appears |
| Rotate model | Left/right rotate buttons |
| Resize model | **Size** slider |
| Fine-position model | Position arrow and height buttons |
| Move to a new surface | **Re-place** |
| Change product at the same anchor | Model selector |
| Inspect component | **Inspect component** selector |
| Show or hide part tags and the selected part's technical callout | **Tags on/off** |
| Display only one component | **Isolate** |
| Restore complete assembly | **Show all** |
| Advance assembly lesson | **Stage** buttons |
| Rotate continuously | **Auto spin** |
| Explode assembly | Bottom AR slider |
| See through enclosure | **X-ray** |
| Open detailed controls on a phone | **Controls** |
| Slice through the assembly | **Section**, then choose Side/Height/Depth and move the slider. Height reveals the model from top to bottom |
| Let real objects hide virtual parts | **Occlusion on/off** when WebXR depth is available |
| Rebuild the product | **Assembly** in Model inspector; tap parts in the validated order |
| Leave tracked mode | **Exit AR** |

## Studio controls

| Action | Control |
| --- | --- |
| Rotate | Drag |
| Zoom | Mouse wheel or trackpad |
| Inspect component | Click the 3D part or component list |
| Toggle spatial annotation | Notes tool or `N` |
| Explode assembly | Bottom slider |
| Guided teardown | Arrow buttons or Auto tour |
| X-ray enclosure | X-ray tool or `X` |
| Cross-section | Section tool or `C`; select an axis and move the cut plane |
| Assembly Mode | Assemble tool or `A`; tap components from the inside out |
| Reset | Reset tool or `R` |

## Assembly Mode

Assembly Mode turns the exploded model into a rebuild exercise:

1. Start **Assemble** in Studio or **Assembly** in the AR inspector.
2. The product separates and a cyan ghost shows the next installation target.
3. Tap a component in the 3D view, component explorer, or AR inspector.
4. Correct components snap into place. Incorrect order attempts reduce the score.
5. **Show hint** highlights the required separated component at a score cost.
6. Complete all components to receive a final time and score.

The installation sequence is generated from each model's service order, rebuilding internal modules before outer protection and access parts.

## Free Vercel hosting

The project includes `vercel.json` and can be deployed as a static Vite site. Vercel supplies the HTTPS connection required for camera access and WebXR.

1. Create or sign in to a free Vercel account.
2. Open PowerShell in this project folder.
3. Run:

```powershell
npx vercel
```

4. Follow the one-time login and project-link prompts.
5. For later production releases, run:

```powershell
npx vercel --prod
```

The resulting `https://...vercel.app` URL can be opened by other users without your PC running. Camera access still depends on the visitor granting permission, and world-anchor AR requires a compatible Android/WebXR browser.

## Build and test

```powershell
pnpm test
pnpm build
pnpm preview
```

## Project structure

- `src/model.js` — procedural AeroCore, SkyScout, and VectorDrive assemblies
- `src/main.js` — application, guide, challenge, and mode coordination
- `src/ar-tracking.js` — WebXR hit-test anchors and AR.js marker tracking
- `src/data.js` — model catalog, component, and lesson content
- `src/explosion.js` — staged explosion calculations
- `src/annotations.js` — annotation content, risk tone, and screen-placement calculations
- `src/cross-section.js` — cross-section axis, position, and display calculations
- `src/assembly.js` — validated installation sequence, progress, timing, and score calculations
- `src/style.css` — desktop, mobile, and AR overlay interface
- `tests/` — unit tests for core explosion behavior

## Browser notes

- Markerless mode depends on the browser exposing `immersive-ar`, WebXR hit testing, and DOM overlay.
- Environmental occlusion additionally depends on WebXR GPU depth sensing. The control displays **No depth** and remains disabled when the phone or browser does not provide it.
- Marker preview requires the marker to remain visible and does not provide spatial persistence.
- iPhone/iPad browser support for immersive WebXR is not assumed. Marker preview can still demonstrate the model, but equivalent world tracking would require a supported WebXR browser or a native ARKit build.
- No camera frames are uploaded by InsightXR.
