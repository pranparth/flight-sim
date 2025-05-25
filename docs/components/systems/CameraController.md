# CameraController Class

## Overview
The `CameraController` class manages dynamic camera positioning and movement in the flight simulator. It provides multiple camera modes optimized for different gameplay situations, from tactical views to cinematic perspectives.

## Camera Modes

### 1. Third Person (Default)
Standard over-shoulder view for general gameplay.
- **Offset**: (0, 5, -15)
- **FOV**: 60°
- **Use Case**: General flying and combat

### 2. Cockpit View
First-person perspective from pilot's position.
- **Offset**: (0, 1.5, 2)
- **FOV**: 75°
- **Use Case**: Immersive flying, precision landing

### 3. Chase Camera
Dynamic following camera with smooth lag.
- **Offset**: (0, 8, -20)
- **FOV**: 65°
- **Use Case**: High-speed combat, dogfighting

### 4. Cinematic
Dramatic wide-angle view for spectacular moments.
- **Offset**: (10, 10, -25)
- **FOV**: 50°
- **Use Case**: Replays, screenshots

### 5. Free Camera
Detached camera for tactical overview.
- **Offset**: (0, 50, -100)
- **FOV**: 60°
- **Use Case**: Planning, spectating

## Architecture

### Mode Configuration System
```typescript
modeConfigs = {
  [CameraMode.THIRD_PERSON]: {
    offset: Vector3,        // Camera position relative to aircraft
    lookOffset: Vector3,    // Look-at point relative to aircraft
    fov: number,           // Field of view in degrees
    positionLerp: number,  // Position smoothing (0-1)
    rotationLerp: number   // Rotation smoothing (0-1)
  }
}
```

### Smoothing System
- **Position Lerp**: Smooth camera movement
- **Rotation Lerp**: Smooth look-at transitions
- **Mode-specific**: Each mode has tuned values

## Key Features

### 1. Smooth Following
The camera uses interpolation for fluid movement:
```typescript
currentOffset.lerp(desiredPosition, positionLerp)
currentLookAt.lerp(desiredLookAt, rotationLerp)
```

### 2. Ground Collision
Prevents camera from going below minimum height:
```typescript
position.y = Math.max(position.y, minHeight)
```

### 3. Camera Shake
Dynamic shake effect for impacts and explosions:
```typescript
shake(magnitude: number): void
```
- Adds random offset each frame
- Decays at 95% per frame
- Used for weapon fire, damage, etc.

### 4. Mode Switching
Number keys instantly switch camera modes:
- **1**: Third Person
- **2**: Cockpit
- **3**: Chase
- **4**: Cinematic
- **5**: Free

### 5. Zoom Control
Dynamic camera distance adjustment:
- **Mouse Wheel**: Scroll to zoom in/out
- **+/=**: Zoom in (camera moves closer)
- **-/_**: Zoom out (camera moves further)
- **Range**: 0.5x to 2x default distance
- **Persistence**: Zoom level maintained across mode switches

### 6. Camera Reset
Quick return to default view:
- **C**: Reset to chase mode behind aircraft
- **Zoom Reset**: Returns to 1.0x zoom level
- **Smooth Animation**: Eased transition

## Methods

### Core Methods

#### `constructor(camera: PerspectiveCamera, target: Aircraft)`
Initializes camera system with target aircraft.

#### `update(deltaTime: number): void`
Main update loop:
1. Calculate desired position based on mode
2. Apply smoothing interpolation
3. Add camera shake if active
4. Update camera transform
5. Special handling for cockpit mode

#### `setMode(mode: CameraMode): void`
Switches camera mode and applies configuration.

### Camera Positioning

#### `calculateDesiredPosition(targetPos: Vector3, targetRot: Euler): Vector3`
Computes camera position:
1. Transform offset by aircraft rotation
2. Add to aircraft position
3. Enforce minimum height
4. Special handling for free camera

#### `calculateDesiredLookAt(targetPos: Vector3, targetRot: Euler): Vector3`
Computes look-at target:
1. Transform look offset by rotation
2. Add to aircraft position
3. Free camera looks directly at aircraft

### Utility Methods

#### `shake(magnitude: number): void`
Triggers camera shake effect.

#### `handleResize(aspect: number): void`
Updates camera aspect ratio on window resize.

#### `getCamera(): PerspectiveCamera`
Returns the Three.js camera instance.

#### `getMode(): CameraMode`
Returns current camera mode.

#### `resetCamera(): void`
Resets camera to default chase position:
- Switches to CHASE mode
- Sets zoom to 1.0
- Starts smooth transition animation

#### `getZoomLevel(): number`
Returns current zoom level (0.5 to 2.0).

#### `setZoomLevel(level: number): void`
Sets target zoom level with clamping.

#### `zoomIn(): void`
Decreases zoom level (camera moves closer).

#### `zoomOut(): void`
Increases zoom level (camera moves further).

## Implementation Details

### Coordinate Transformation
Camera offsets are defined in aircraft-local space and transformed to world space:
```typescript
rotationMatrix = Matrix4.makeRotationFromEuler(targetRot)
scaledOffset = localOffset.multiplyScalar(zoomLevel)
worldOffset = scaledOffset.applyMatrix4(rotationMatrix)
```

### Zoom Implementation
Zoom modifies camera distance by scaling offset:
```typescript
// Smooth zoom transitions
zoomLevel = lerp(zoomLevel, targetZoomLevel, zoomLerp)
// Apply to camera offset
scaledOffset = offset.multiplyScalar(zoomLevel)
```

### Cockpit Mode Special Handling
Aligns camera rotation with aircraft more closely:
```typescript
camera.quaternion.slerp(aircraftQuaternion, 0.5)
```

### Shake Algorithm
```typescript
shakeOffset = Vector3(
  (random() - 0.5) * magnitude,
  (random() - 0.5) * magnitude,
  (random() - 0.5) * magnitude
)
magnitude *= 0.95 // Decay
```

## Usage Example

```typescript
const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);
const cameraController = new CameraController(camera, playerAircraft);

// Game loop
function animate(deltaTime: number) {
  cameraController.update(deltaTime);
  
  // Trigger shake on damage
  if (aircraft.tookDamage) {
    cameraController.shake(0.5);
  }
}

// Switch to cinematic for replay
cameraController.setMode(CameraMode.CINEMATIC);

// Zoom controls
window.addEventListener('wheel', (e) => {
  const delta = e.deltaY > 0 ? 0.1 : -0.1;
  cameraController.setZoomLevel(
    cameraController.getZoomLevel() + delta
  );
});

// Reset camera
if (needsReset) {
  cameraController.resetCamera();
}
```

## Camera Mode Properties

### Lerp Values Explained
- **1.0**: Instant following (no smoothing)
- **0.1**: Moderate smoothing
- **0.05**: Heavy smoothing (cinematic)

### FOV Guidelines
- **50°**: Telephoto effect (cinematic)
- **60°**: Standard view
- **75°**: Wide angle (cockpit)

## Performance Optimization

### Efficient Updates
- Single matrix multiplication per frame
- Cached rotation matrices
- No allocation in update loop

### Conditional Processing
- Free camera skips aircraft tracking
- Shake only processes when active
- Mode-specific optimizations

## Future Enhancements

### Advanced Features
- **Replay System**: Record camera paths
- **Orbit Mode**: Circle around aircraft
- **Target Lock**: Follow enemy aircraft
- **Smooth Transitions**: Animate between modes

### Cinematic Sequences
```typescript
startCinematicSequence(type: 'flyby' | 'orbit' | 'dramatic')
```
- Predefined camera movements
- Dramatic angles for key moments
- Smooth spline-based paths

### Dynamic Adjustments
- Speed-based FOV (motion blur feel)
- G-force camera effects
- Damage-induced distortion
- Weather-affected visibility

### VR Support
- Stereoscopic rendering
- Head tracking integration
- Cockpit-relative positioning
- Comfort mode options