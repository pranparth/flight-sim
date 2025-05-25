# BarrageBalloon

## Overview

The `BarrageBalloon` class represents destructible barrage balloons used as defensive obstacles and target practice in the game. These balloons are strategically placed around key locations and provide players with stationary targets to engage.

## Features

- **Realistic Movement**: Gentle swaying motion to simulate tethered balloons in wind
- **Destructible**: Can be damaged and destroyed by weapon fire
- **Visual Effects**: Explosion particles and falling animation when destroyed
- **Strategic Placement**: Positioned to defend towns, industrial areas, and key points

## Class Structure

```typescript
export class BarrageBalloon implements Entity {
  private mesh: THREE.Mesh;
  private group: THREE.Group;
  private state: BarrageBalloonState;
  private explosionParticles?: THREE.Points;
  private destructionTime?: number;
}
```

## State Management

The balloon maintains its state including:
- Position (world coordinates)
- Health (50 HP default)
- Destruction status
- Altitude
- Sway phase for animation

## Behavior

### Swaying Motion
Balloons exhibit a gentle swaying motion using sine waves:
- Horizontal sway amplitude: 5 meters
- Slight rotation for added realism
- Maintains constant altitude when undamaged

### Damage System
- Takes damage from projectile hits
- Health: 50 HP (can withstand ~5 machine gun hits)
- No damage reduction/armor

### Destruction Sequence
1. Health reaches zero
2. Explosion particle effect spawns
3. Balloon deflates (scale reduction)
4. Falls while rotating chaotically
5. Removed from scene after 3 seconds

## Visual Design

- **Color**: Military gray (#888888)
- **Size**: Approximately 20-30 meters long
- **Shape**: Elongated sphere with tail fins
- **Style**: Toon-shaded to match game aesthetics

## Placement Strategy

Balloons are placed at various strategic locations:
- **Coastal Defense**: 400-500m altitude along coastlines
- **Town Protection**: 550-600m altitude over populated areas
- **Industrial Defense**: 400-500m protecting factories
- **Strategic Points**: 450-700m at key map positions

## Usage Example

```typescript
// Create a barrage balloon
const position = new THREE.Vector3(1000, 0, -2000);
const altitude = 500; // meters
const balloon = new BarrageBalloon(position, altitude);

// Add to scene
scene.add(balloon.getObject3D());

// Update in game loop
balloon.update(deltaTime);

// Apply damage when hit
balloon.takeDamage(10);

// Check if destroyed
if (balloon.isDestroyed()) {
  console.log('Balloon destroyed!');
}

// Remove when animation complete
if (balloon.shouldRemove()) {
  scene.remove(balloon.getObject3D());
  balloon.dispose();
}
```

## Integration

The barrage balloons are integrated with:
- **SceneManager**: Handles spawning and updating
- **WeaponSystem**: Detects hits and applies damage
- **Game**: Manages hit detection and destruction

## Performance Considerations

- Lightweight geometry (sphere + cones)
- Efficient particle system for explosions
- Automatic cleanup after destruction
- Pooling ready for future optimization

## Future Enhancements

- Cable/tether visualization
- Different balloon types (observation, defense)
- Dynamic spawning based on mission
- Collision damage to aircraft
- Strategic importance (affecting mission score)