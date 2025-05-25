# PhysicsEngine Class

## Overview
The `PhysicsEngine` class provides a general-purpose physics simulation system for the flight simulator. While aircraft have their own specialized flight dynamics, this engine handles physics for other entities like projectiles, debris, and future additions like ground vehicles or ships.

## Architecture

The PhysicsEngine implements:
- **Fixed Timestep Simulation**: Consistent 60Hz physics updates
- **Force-based Dynamics**: Acceleration from forces and torques
- **Collision Detection**: Simple sphere-based collision system
- **Impulse System**: For explosions and impacts

## Core Concepts

### PhysicsBody Interface
```typescript
interface PhysicsBody {
  id: string;                    // Unique identifier
  position: THREE.Vector3;       // World position
  rotation: THREE.Quaternion;    // Orientation
  velocity: THREE.Vector3;       // Linear velocity
  angularVelocity: THREE.Vector3; // Angular velocity
  mass: number;                  // Mass in kg
  forces: THREE.Vector3;         // Accumulated forces
  torques: THREE.Vector3;        // Accumulated torques
  isDynamic: boolean;            // Static vs dynamic
}
```

### Fixed Timestep Integration
The engine uses a fixed timestep with accumulator pattern:
```
while (accumulator >= fixedTimeStep) {
  fixedUpdate(fixedTimeStep)
  accumulator -= fixedTimeStep
}
```
This ensures deterministic physics regardless of frame rate.

## Key Methods

### Body Management

#### `addBody(body: PhysicsBody): void`
Registers a physics body for simulation.

#### `removeBody(id: string): void`
Removes a body from simulation.

#### `getBody(id: string): PhysicsBody | undefined`
Retrieves a body by ID.

### Simulation

#### `update(deltaTime: number): void`
Main update method that:
1. Accumulates time
2. Performs fixed timestep updates
3. Limits substeps to prevent spiral of death
4. (Future) Interpolates for smooth rendering

#### `fixedUpdate(dt: number): void`
Physics integration step:
1. Apply forces (F = ma)
2. Integrate velocity (v += a·dt)
3. Integrate position (p += v·dt)
4. Apply torques for rotation
5. Apply damping
6. Reset forces for next frame

### Collision Detection

#### `raycast(...): RaycastResult | null`
Performs ray-sphere intersection tests:
```typescript
raycast(
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
  excludeIds: string[]
): { body: PhysicsBody; point: Vector3; distance: number } | null
```

Currently uses simple sphere colliders (5m radius for aircraft).

#### `checkGroundCollision(bodyId: string): boolean`
Quick check if body is below ground level (y = 0).

### Dynamics

#### `applyImpulse(bodyId: string, impulse: Vector3, point?: Vector3): void`
Applies instantaneous velocity change:
- Linear impulse: Δv = impulse / mass
- Angular impulse: Δω = (r × impulse) / I

Used for explosions, collisions, and weapon impacts.

## Physics Calculations

### Force Integration
```typescript
acceleration = forces / mass
velocity += acceleration * dt
position += velocity * dt
```

### Angular Dynamics
Simplified rotational inertia (I = 0.1 * mass):
```typescript
angularAcceleration = torques / (mass * 0.1)
angularVelocity += angularAcceleration * dt
rotation = quaternionFromEuler(angularVelocity * dt) * rotation
```

### Damping
- Linear damping: 0.999 per frame
- Angular damping: 0.98 per frame

Prevents numerical instability and simulates air resistance.

## Special Handling

### Aircraft Exclusion
Aircraft bodies handle their own lift/weight forces through FlightDynamics, so the engine skips gravity for bodies with 'aircraft' in their ID.

### Ground Plane
Simple infinite ground at y = 0 (sea level).

## Performance Optimization

### Fixed Timestep Benefits
- Deterministic simulation
- Stable integration
- Consistent behavior across frame rates

### Substep Limiting
Maximum 3 substeps per frame prevents "spiral of death" where physics can't catch up.

### Simple Colliders
Sphere-based collision is fast but approximate. Suitable for:
- Projectile impacts
- Explosion ranges
- Basic proximity detection

## Usage Example

```typescript
const physics = new PhysicsEngine();

// Create a projectile
const bullet: PhysicsBody = {
  id: 'bullet_001',
  position: new Vector3(0, 100, 0),
  rotation: new Quaternion(),
  velocity: new Vector3(0, 0, 500), // 500 m/s forward
  angularVelocity: new Vector3(),
  mass: 0.05, // 50g bullet
  forces: new Vector3(),
  torques: new Vector3(),
  isDynamic: true
};

physics.addBody(bullet);

// Apply explosion force
physics.applyImpulse('target_001', 
  new Vector3(100, 50, 0), // Force direction
  new Vector3(0, 0, 5)     // Impact point
);

// Check for hits
const hit = physics.raycast(
  gunPosition,
  gunDirection,
  1000, // Max range
  ['player_aircraft']
);
```

## Integration with Game Systems

### Current Integration
- Not yet used for aircraft (they use FlightDynamics)
- Prepared for projectiles and effects
- Ground collision detection available

### Future Integration Points
- Weapon projectiles (bullets, missiles)
- Explosion physics
- Debris and particles
- Ground vehicles
- Ship dynamics
- Destructible objects

## Limitations

### Current Limitations
1. **No Mesh Colliders**: Only sphere collision
2. **No Constraints**: No joints or hinges
3. **No Continuous Collision**: Tunneling possible at high speeds
4. **Simplified Inertia**: Treats all objects as uniform spheres
5. **No Interpolation**: May show stepping at low framerates

### Design Decisions
The engine is intentionally simple because:
- Aircraft use specialized flight physics
- Game focuses on air combat
- Performance is prioritized
- Arcade-style gameplay doesn't need complex physics

## Debug Statistics

The `getStats()` method provides:
- Total body count
- Average velocity of dynamic bodies

Useful for performance monitoring and debugging.

## Future Enhancements

### Collision System
- Mesh-based colliders
- Broad phase optimization (spatial hashing)
- Continuous collision detection
- Collision layers and masks

### Dynamics
- Proper inertia tensors
- Constraint solver (joints, motors)
- Friction and restitution
- Buoyancy for water interaction

### Performance
- Multithreading via workers
- GPU physics acceleration
- Interpolation for smooth rendering
- Level-of-detail physics

### Features
- Soft body dynamics (flags, cloth)
- Particle systems
- Destruction physics
- Fluid simulation (simplified)