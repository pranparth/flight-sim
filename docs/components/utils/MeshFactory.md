# MeshFactory Module

## Overview
The `MeshFactory` module generates 3D aircraft models using procedural geometry. It creates simplified, cartoon-style meshes optimized for performance while maintaining visual distinctiveness between different aircraft types.

## Core Functions

### createAircraftMesh(type: string): THREE.Group

Main factory function that creates complete aircraft models.

#### Parameters:
- `type`: Aircraft identifier ('spitfire', 'bf109', 'p51mustang', 'zero')

#### Returns:
- THREE.Group containing all aircraft components
- Properly named for identification
- Shadow casting/receiving enabled

#### Process:
1. Determines faction from aircraft type
2. Gets faction-appropriate materials
3. Calls specific mesh creation function
4. Configures shadows for all meshes
5. Returns complete aircraft group

### createSmokeParticle(): THREE.Points

Creates particle system for smoke effects.

#### Implementation:
- 50 randomly distributed points
- Additive blending for smoke effect
- Semi-transparent gray particles
- 0.5 unit particle size

## Aircraft Construction

### Component Hierarchy
```
Aircraft (Group)
├── fuselage (Mesh)
├── wings (Mesh)
├── cockpit (Mesh)
├── tail (Group)
│   ├── vertical stabilizer
│   └── horizontal stabilizer
├── propeller (Group)
│   ├── blade1
│   └── blade2
└── engine cowling (Mesh)
```

### Naming Convention
- Root group: `aircraft_[type]`
- Components: descriptive names for animation
- Propeller: Named for rotation animation
- Control surfaces: Named for future animation

## Aircraft-Specific Designs

### Spitfire
Distinctive features:
- **Fuselage**: Elongated capsule (0.8r × 6h)
- **Wings**: Elliptical shape with taper algorithm
- **Cockpit**: Bubble canopy (hemisphere)
- **Tail**: Traditional British design
- **Propeller**: 4-blade representation

#### Wing Taper Algorithm:
```typescript
const taper = 1 - Math.abs(x) / 6 * 0.5;
positions.setZ(i, z * taper);
```
Creates the iconic elliptical wing shape.

### Bf 109
Angular German design:
- **Fuselage**: Hexagonal cylinder
- **Wings**: Straight with minimal taper
- **Cockpit**: Angular box canopy
- **Design**: Emphasizes angular features

### P-51 Mustang & Zero
Currently use generic fighter mesh with planned unique features:
- P-51: Bubble canopy, laminar flow wings
- Zero: Large canopy, rounded wings

### Generic Fighter
Fallback design for undefined types:
- Balanced proportions
- Simple geometry
- Clear component separation
- Suitable for placeholder use

## Geometry Creation Techniques

### Procedural Generation
All aircraft use Three.js primitive geometries:
- **CapsuleGeometry**: Smooth fuselages
- **BoxGeometry**: Wings and control surfaces
- **SphereGeometry**: Cockpit canopies
- **ConeGeometry**: Engine cowlings
- **CylinderGeometry**: Alternative fuselages

### Vertex Manipulation
Example: Wing taper modification
```typescript
const positions = wingGeometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
  // Modify vertices based on position
}
positions.needsUpdate = true;
```

### Shadow Configuration
```typescript
aircraft.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    child.castShadow = true;
    child.receiveShadow = true;
  }
});
```
Ensures all components participate in lighting.

## Material Application

### Faction Mapping
```typescript
const factionMap = {
  spitfire: 'allies',
  p51mustang: 'allies',
  bf109: 'axis',
  zero: 'axis'
};
```

### Material Assignment
Each component receives appropriate material:
- **Fuselage**: Primary faction color
- **Wings**: Secondary faction color
- **Cockpit**: Transparent glass material
- **Details**: Accent color for visibility

## Performance Optimization

### Geometry Efficiency
- Low polygon counts (6-16 segments)
- Shared geometries where possible
- No unnecessary subdivisions
- Simplified shapes for distant viewing

### Mesh Grouping
- Logical hierarchy for transform inheritance
- Separate moving parts (propeller)
- Combined static elements
- Minimal draw calls

### Future LOD Support
Structure supports level-of-detail:
- High: Current detailed meshes
- Medium: Reduced segment counts
- Low: Billboard sprites

## Animation Support

### Animated Components
Current naming enables:
- **propeller**: Rotation animation
- **elevator/rudder**: Control surface movement
- **aileronLeft/Right**: Roll control animation

### Transform Hierarchy
Parent-child relationships ensure:
- Propeller rotates independently
- Tail group moves as unit
- Control surfaces pivot correctly

## Usage Example

```typescript
// Create aircraft
const spitfire = createAircraftMesh('spitfire');
scene.add(spitfire);

// Access components
const propeller = spitfire.getObjectByName('propeller');
const cockpit = spitfire.getObjectByName('cockpit');

// Animate propeller
function animate() {
  if (propeller) {
    propeller.rotation.z += 0.5;
  }
}
```

## Visual Design Principles

### Simplification Strategy
- Recognizable silhouettes over detail
- Clear faction identification
- Cartoon-appropriate proportions
- Performance over realism

### Scale Consistency
All aircraft use similar scale:
- ~6 units fuselage length
- ~10-12 units wingspan
- Allows fair gameplay comparison

### Component Proportions
- Large cockpits for visibility
- Thick wings for cartoon style
- Oversized propellers for effect
- Clear separation between parts

## Future Enhancements

### Geometry Improvements
- Unique meshes for each aircraft type
- Damaged state geometry swapping
- Modular weapon attachments
- Landing gear animation support

### Visual Effects
- Propeller blur disc at high RPM
- Engine exhaust meshes
- Contrail emitters
- Damage decals system

### Optimization
- Instanced geometry for multiple aircraft
- Mesh pooling for performance
- Dynamic LOD switching
- Texture atlas support

### Procedural Variations
- Randomized paint schemes
- Squadron markings
- Battle damage
- Weathering effects