# MaterialFactory Module

## Overview
The `MaterialFactory` module creates specialized materials for the cartoon-style rendering of the flight simulator. It provides toon shading, outline effects, and faction-based color schemes that give the game its distinctive visual style.

## Core Functions

### createToonMaterial(options: ToonMaterialOptions): MeshToonMaterial

Creates a toon-shaded material with stepped lighting for cartoon aesthetics.

#### Parameters:
```typescript
interface ToonMaterialOptions {
  color: number | string;      // Base color
  emissive?: number | string;  // Self-illumination color
  steps?: number;              // Number of shading steps (default: 4)
  specular?: number | string;  // Specular highlight color
  shininess?: number;          // Specular intensity
}
```

#### Implementation Details:
- Creates custom gradient ramp textures for stepped shading
- Caches ramp textures to avoid recreation
- Uses nearest-neighbor filtering for sharp transitions
- Emissive intensity fixed at 0.2 for subtle glow

### createOutlineMaterial(color?: number | string, thickness?: number): ShaderMaterial

Creates a shader material for rendering cartoon outlines using the inverted hull method.

#### Parameters:
- `color`: Outline color (default: black)
- `thickness`: Outline width (default: 0.03)

#### Shader Implementation:
```glsl
// Vertex shader: Expands vertices along normals
vec4 pos = modelViewMatrix * vec4(position, 1.0);
vec3 normal = normalize(normalMatrix * normal);
pos.xyz += normal * outlineThickness;

// Fragment shader: Solid color output
gl_FragColor = vec4(outlineColor, 1.0);
```

Renders with `THREE.BackSide` to create outline effect.

### createAircraftMaterials(faction: 'allies' | 'axis' | 'neutral')

Creates a complete material set for an aircraft based on faction.

#### Returns:
```typescript
{
  fuselage: THREE.Material;  // Main body material
  wing: THREE.Material;      // Wing surfaces
  cockpit: THREE.Material;   // Transparent canopy
  detail: THREE.Material;    // Accent pieces
}
```

#### Material Types:
- **Fuselage/Wing**: Toon materials with 4-step shading
- **Cockpit**: Phong material with transparency and high specularity
- **Detail**: 2-step toon for high contrast accents

## Gradient Ramp System

### How It Works
The toon shading effect uses gradient textures to control lighting:

1. **Ramp Creation**: Generates 256×1 pixel textures
2. **Step Quantization**: Divides gradient into discrete steps
3. **Caching**: Stores textures in Map for reuse
4. **Filtering**: Nearest-neighbor for sharp transitions

### Example Ramp (4 steps):
```
0%    25%   50%   75%   100%
[████][████][████][████]
 Dark              Light
```

## Faction Color Schemes

### Color Philosophy
Each faction has a distinct color palette reflecting their identity:

### Allied Forces
```typescript
{
  primary: 0x1a3d5c,    // Navy blue
  secondary: 0x4a7bb0,  // Sky blue
  accent: 0xffd700,     // Gold
  cockpit: 0x333333     // Dark gray
}
```
Cool colors suggesting freedom and sky dominance.

### Axis Powers
```typescript
{
  primary: 0x3d1a1a,    // Dark red
  secondary: 0x874a4a,  // Dusty red
  accent: 0xff0000,     // Bright red
  cockpit: 0x333333     // Dark gray
}
```
Aggressive reds conveying threat and power.

### Neutral
```typescript
{
  primary: 0x3d3d1a,    // Olive drab
  secondary: 0x87874a,  // Tan
  accent: 0x00ff00,     // Green
  cockpit: 0x333333     // Dark gray
}
```
Earth tones for non-aligned forces.

## Technical Implementation

### Texture Management
```typescript
const RAMP_TEXTURES: Map<number, THREE.DataTexture> = new Map();
```
- Global cache prevents texture recreation
- Textures persist for application lifetime
- Memory efficient for repeated use

### Data Texture Creation
```typescript
const data = new Uint8Array(width * height * 4); // RGBA
```
- Manual pixel data generation
- Grayscale values for shading levels
- Full alpha for opacity

### Material Configuration
- **Toon Materials**: Use gradientMap for stepped shading
- **Phong Materials**: For glossy/transparent surfaces
- **Shader Materials**: Custom vertex/fragment shaders

## Usage Examples

### Basic Toon Material
```typescript
const cartoonMetal = createToonMaterial({
  color: 0x888888,
  emissive: 0x222222,
  steps: 3
});
```

### Outlined Object
```typescript
// Main object
const mesh = new THREE.Mesh(geometry, material);

// Outline
const outlineMesh = new THREE.Mesh(
  geometry,
  createOutlineMaterial(0x000000, 0.05)
);
scene.add(mesh, outlineMesh);
```

### Faction Aircraft
```typescript
const spitfireMaterials = createAircraftMaterials('allies');
fuselage.material = spitfireMaterials.fuselage;
wings.material = spitfireMaterials.wing;
```

## Performance Considerations

### Optimization Strategies
- Texture caching reduces GPU memory allocation
- Shared materials between similar objects
- Simple shaders for mobile compatibility
- No real-time texture updates

### Rendering Cost
- Toon shading: Minimal overhead vs standard materials
- Outline rendering: Requires second draw pass
- Transparency: Additional sorting required

## Visual Style Guide

### Shading Steps
- **2 steps**: High contrast, comic book style
- **3-4 steps**: Balanced cartoon look
- **5+ steps**: Softer, more realistic

### Outline Usage
- Thin outlines (0.02-0.03) for detail
- Thick outlines (0.05-0.08) for emphasis
- Color outlines for special effects

### Material Combinations
- Toon + outline for characters
- Phong for glass/water
- Emissive for engines/lights

## Future Enhancements

### Advanced Shading
- Rim lighting for better silhouettes
- Hatching/crosshatch patterns
- Gradient-based cel shading
- Normal map support for toon shading

### Dynamic Effects
- Damage state materials
- Weather-affected surfaces
- Heat distortion shaders
- Procedural camouflage patterns

### Optimization
- Material atlasing
- Shader LOD system
- Instanced material properties
- WebGPU shader compilation