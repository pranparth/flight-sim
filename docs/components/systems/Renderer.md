# Renderer Class

## Overview
The `Renderer` class manages the WebGL rendering pipeline for the flight simulator. It handles 3D scene rendering, post-processing effects, and quality settings to deliver the cartoon-style visuals characteristic of the game.

## Architecture

The Renderer combines Three.js WebGLRenderer with a post-processing pipeline:
- **WebGLRenderer**: Core 3D rendering with shadow mapping
- **EffectComposer**: Post-processing effect chain
- **RenderPass**: Base scene rendering
- **FXAAPass**: Fast approximate anti-aliasing for smooth edges

## Key Features

### 1. Optimized Rendering Settings
- Power preference set to "high-performance"
- Pixel ratio capped at 2x to balance quality and performance
- PCF soft shadows for smooth shadow edges
- ACES Filmic tone mapping for better color grading
- sRGB color space for correct color display

### 2. Post-Processing Pipeline
```typescript
composer = new EffectComposer(renderer)
  → RenderPass (scene rendering)
  → FXAAPass (anti-aliasing)
  → Output
```

### 3. Dynamic Quality Settings
Four preset quality levels:
- **Low**: No shadows, 1x pixel ratio
- **Medium**: Basic shadows, 1.5x pixel ratio
- **High**: PCF shadows, 2x pixel ratio  
- **Ultra**: Soft shadows, native pixel ratio

## Methods

### Constructor
```typescript
constructor(container: HTMLElement)
```
Creates the renderer attached to a DOM container, initializes WebGL context, and sets up post-processing.

### Core Methods

#### `render(scene: THREE.Scene, camera: THREE.Camera): void`
Main render method that:
1. Updates render pass with current scene/camera
2. Executes post-processing pipeline
3. Outputs final frame

#### `resize(): void`
Handles window resize events:
- Updates renderer dimensions
- Resizes effect composer
- Recalculates FXAA resolution uniforms

#### `setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void`
Dynamically adjusts rendering quality:
- Modifies pixel ratio
- Toggles shadows on/off
- Changes shadow map type

### Utility Methods

#### `getCamera(): THREE.PerspectiveCamera`
Returns the internal camera reference (legacy, not typically used).

#### `getRenderer(): THREE.WebGLRenderer`
Provides direct access to the WebGL renderer for advanced usage.

## Rendering Configuration

### Shadow Settings
```typescript
shadowMap.enabled = true
shadowMap.type = THREE.PCFSoftShadowMap
```
- Enables realistic shadow casting
- PCF soft shadows reduce aliasing
- 2048x2048 shadow map resolution (set in SceneManager)

### Tone Mapping
```typescript
toneMapping = THREE.ACESFilmicToneMapping
toneMappingExposure = 1.0
```
- Film-style color grading
- Better highlight/shadow balance
- Prevents color clipping

### Anti-Aliasing Strategy
- Hardware AA via `antialias: true`
- Post-process FXAA for additional smoothing
- Resolution-aware FXAA uniforms

## Performance Optimization

### Pixel Ratio Management
```typescript
setPixelRatio(Math.min(window.devicePixelRatio, 2))
```
Prevents excessive rendering on high-DPI displays while maintaining visual quality.

### Stencil Buffer Disabled
```typescript
stencil: false
```
Saves GPU memory as stencil operations aren't needed.

### Dynamic Quality Scaling
Quality presets allow real-time performance adjustment without reloading.

## Usage Example

```typescript
const container = document.getElementById('game');
const renderer = new Renderer(container);

// Game loop
function animate() {
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Handle resize
window.addEventListener('resize', () => {
  renderer.resize();
});

// Adjust quality based on performance
if (fps < 30) {
  renderer.setQuality('low');
}
```

## Post-Processing Effects

### Current Effects
1. **FXAA (Fast Approximate Anti-Aliasing)**
   - Reduces jagged edges
   - Minimal performance impact
   - Resolution-aware implementation

### Future Effect Possibilities
- Outline pass for toon shading
- Bloom for explosions/sun
- Motion blur for speed sensation
- Depth of field for cinematic mode
- Color grading LUTs

## Cartoon Rendering Techniques

The renderer supports cartoon-style visuals through:
- Flat shading capability
- High contrast tone mapping
- Clean anti-aliased edges
- Simplified shadow rendering
- Bright, saturated colors (sRGB)

## Integration Points

- **Game Class**: Owns renderer instance
- **SceneManager**: Provides scene to render
- **CameraController**: Provides camera for rendering
- **MaterialFactory**: Creates toon-shaded materials

## Performance Metrics

Typical performance targets:
- 60 FPS at 1080p (High quality)
- 30 FPS minimum (Low quality)
- < 16ms frame time
- Minimal GC pressure

## Future Enhancements

- WebGPU renderer support
- Temporal anti-aliasing (TAA)
- Variable rate shading
- Instanced rendering for multiple aircraft
- Level-of-detail (LOD) system
- Deferred rendering pipeline
- Screen-space reflections
- Volumetric clouds/fog