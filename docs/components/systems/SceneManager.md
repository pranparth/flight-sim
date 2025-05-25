# SceneManager Class

## Overview
The `SceneManager` class handles all scene-related operations including environment setup, lighting configuration, terrain generation, and entity management. It creates and maintains the visual world where aircraft operate.

## Architecture

The SceneManager owns and manages:
- **Scene Graph**: Three.js scene hierarchy
- **Lighting System**: Key, fill, and rim lights
- **Environment**: Sky, ocean, and terrain
- **Entity Management**: Aircraft tracking and updates

## Key Features

### 1. Three-Point Lighting System
Professional cinematography-inspired lighting:
- **Key Light**: Main directional light with shadows
- **Fill Light**: Hemisphere light for ambient illumination
- **Rim Light**: Back light for silhouettes
- **Ambient Light**: Base illumination

### 2. Dynamic Environment
- Procedural sky with sun positioning
- Animated ocean with wave simulation
- Cartoon-style terrain islands
- Fog for depth perception

### 3. Time of Day System
Preset lighting conditions:
- Dawn
- Noon
- Dusk
- Night

## Components

### Lighting Configuration

#### Key Light (Sun)
```typescript
DirectionalLight(0xffffff, 1.2)
position: (50, 100, 50)
shadows: 2048x2048, PCF soft
```
Primary illumination source with realistic shadows.

#### Fill Light
```typescript
HemisphereLight(skyColor: 0x87ceeb, groundColor: 0x8b7355, 0.6)
```
Simulates sky/ground color bleeding.

#### Rim Light
```typescript
DirectionalLight(0xffffff, 0.4)
position: (-50, 50, -50)
```
Creates edge highlights for better depth perception.

### Environment Elements

#### Sky System
Uses Three.js Sky shader with configurable:
- Turbidity (haziness)
- Rayleigh scattering (blue sky)
- Mie scattering (sun glow)
- Sun position

#### Ocean
- 10km × 10km plane geometry
- Phong material with specular highlights
- Animated sine wave displacement
- Receives shadows from aircraft

#### Terrain
- Procedural cone-based islands
- Toon-shaded materials
- Multiple islands at different scales
- Mountain formations

## Methods

### Initialization

#### `async init(): Promise<void>`
Sets up the complete scene:
1. Configures lighting
2. Creates environment
3. Loads assets (future implementation)

### Scene Management

#### `addAircraft(aircraft: Aircraft): void`
Registers an aircraft in the scene:
- Adds to tracking array
- Adds mesh to scene graph

#### `removeAircraft(aircraft: Aircraft): void`
Removes an aircraft from the scene:
- Removes from tracking
- Removes mesh from scene

#### `getScene(): THREE.Scene`
Returns the Three.js scene for rendering.

### Dynamic Updates

#### `update(deltaTime: number, elapsedTime: number): void`
Per-frame updates:
1. Animates ocean waves
2. Updates all aircraft
3. Future: animated clouds, birds, etc.

#### `setTimeOfDay(preset: 'dawn' | 'noon' | 'dusk' | 'night'): void`
Changes lighting conditions:
- Updates light colors and intensities
- Adjusts fog color
- Repositions sun
- Modifies sky parameters

## Scene Composition

### Coordinate System
- Y-up (altitude)
- Sea level at Y=0
- 10km × 10km playable area

### Scene Hierarchy
```
Scene
├── Lights
│   ├── Key Light (Directional)
│   ├── Fill Light (Hemisphere)
│   ├── Rim Light (Directional)
│   └── Ambient Light
├── Environment
│   ├── Sky (Sky shader)
│   ├── Ocean (Animated plane)
│   └── Terrain
│       ├── Island 1
│       ├── Island 2
│       └── Mountain
└── Entities
    └── Aircraft[]
```

## Visual Features

### Ocean Animation
```typescript
waveHeight = sin(x * 0.01 + time) * cos(z * 0.01 + time * 0.8) * 2
```
Creates realistic wave motion using dual sine waves.

### Fog Settings
```typescript
fog = new Fog(color: 0x87ceeb, near: 500, far: 5000)
```
Provides depth cues and atmospheric perspective.

### Shadow Configuration
- Key light casts shadows
- 2048×2048 shadow map
- Soft PCF shadows
- 200×200 unit shadow frustum

## Performance Considerations

### Ocean Optimization
- Vertex animation computed on CPU
- Normal recalculation per frame
- Could be moved to vertex shader

### Terrain LOD
- Simple geometry for distant objects
- No LOD system currently
- Static terrain (no deformation)

### Entity Updates
- Linear time complexity O(n)
- Each aircraft updates independently
- No spatial partitioning yet

## Time of Day Presets

### Dawn
- Warm orange key light (0xffaa77)
- Low sun angle (10°)
- Orange fog
- Reduced intensity

### Noon
- White sunlight (0xffffff)
- High sun angle (60°)
- Blue sky fog
- Maximum intensity

### Dusk
- Deep orange light (0xff7744)
- Very low sun (5°)
- Orange-red fog
- Dimmed lighting

### Night
- Blue moonlight (0x4466aa)
- Below horizon (-10°)
- Dark blue fog
- Minimal lighting

## Usage Example

```typescript
const sceneManager = new SceneManager();
await sceneManager.init();

// Add player aircraft
const aircraft = new Aircraft({ type: 'spitfire' });
sceneManager.addAircraft(aircraft);

// Set time to dusk
sceneManager.setTimeOfDay('dusk');

// Update loop
function animate(deltaTime: number) {
  sceneManager.update(deltaTime, performance.now());
}
```

## Future Enhancements

### Environment
- Volumetric clouds
- Weather effects (rain, snow)
- Animated vegetation
- Cities and structures
- Particle effects (smoke, dust)

### Optimization
- Frustum culling
- Level-of-detail system
- Instanced rendering for trees
- Occlusion culling
- Spatial indexing

### Visual Effects
- Water reflections
- God rays
- Heat distortion
- Contrails
- Explosion effects

### Dynamic Features
- Destructible terrain
- Day/night cycle
- Seasonal changes
- Wildlife (birds)
- Naval units